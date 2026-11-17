// Ролик «весь сайт»: (необязательно) фишка кликами на первом экране, затем плавная прокрутка до самого низа.
// Остановки по пути (stops) — когда секция доходит до верха, прокрутка ждёт и выполняет действие.
// Запуск: node full.mjs id ...  → raw/<id>.webm + raw/<id>.json {start, end}
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nikita/Desktop/Фриланс/Свои проекты/CV/node_modules/playwright-core');
const OUT = path.resolve('raw');

const URLS = {
  dent32: 'http://127.0.0.1:4301/minsk/',
  zvezda: 'http://localhost:4302/',
  butsevichi: 'http://localhost:4303/svadby',
  dobrahata: 'http://localhost:4304/',
  doctorvet: 'http://localhost:4305/',
  vetsas: 'http://localhost:4306/',
  vetpulse: 'http://localhost:4307/',
  carsify: 'https://carsifyby.vercel.app/',
  carusbrest: 'https://carusbrest.vercel.app/',
  gonar: 'https://gonar-a-frame.vercel.app/',
  moydom: 'https://moydom-by-demo.vercel.app/',
  krasservis: 'https://krasservis-demo.vercel.app/',
  listvich: 'https://listvich-demo.vercel.app/',
  kavahome: 'https://kavahome.vercel.app/',
};
const SPEED = Number(process.env.SPEED || 560); // px/s

const wait = (p, ms) => p.waitForTimeout(ms);
const btn = (scope, name, n = 0) => scope.locator('button').filter({ hasText: new RegExp('^\\s*' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$') }).nth(n);
async function click(p, loc, pause = 1100) {
  loc = loc.first();
  try { await loc.click({ timeout: 2500 }); }
  catch { try { await loc.evaluate((el) => el.click(), null, { timeout: 1500 }); } catch { console.log('  нет клика'); } }
  await wait(p, pause);
}

const PRELUDE = {
  listvich: async (p) => {
    const c = p.locator('#cfg');
    await click(p, btn(c, '2,3 м'), 1200);
    await click(p, btn(c, '3 м', 1), 1300);
    await click(p, btn(c, 'Дачный домик утеплённый'), 1600);
  },
  dobrahata: async (p) => {
    await click(p, p.locator('button', { hasText: 'Несколько суток' }), 900);
    await click(p, p.locator('button[aria-label^="20 ноябр"]'), 700);
    await click(p, p.locator('button[aria-label^="22 ноябр"]'), 1300);
  },
};
const READY = {
  dobrahata: () => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.includes('Несколько суток')); return b && Object.keys(b).some((k) => k.startsWith('__reactProps')); },
};
const STOPS = {
  kavahome: [{ sel: '#kollekcii', run: async (p) => {
    const cards = p.locator('#kollekcii [class*="_card"]');
    for (const i of [1, 2, 3]) { try { await cards.nth(i).click({ timeout: 2500, force: true }); } catch {} await wait(p, 1500); }
  } }],
  dobrahata: [{ sel: 'input[aria-label="Количество гостей"]', off: 420, run: async (p) => {
    for (let i = 0; i < 5; i++) await click(p, p.locator('button[aria-label="Больше"], button:has-text("Больше")'), 280);
    await wait(p, 900);
  } }],
};

// GPU=1 — рендер через видеокарту (тяжёлые страницы с видео иначе дёргаются в записи); HEADED=1 — с окном
const GPU_ARGS = ['--use-angle=metal', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-zero-copy'];
const b = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADED, args: process.env.GPU ? GPU_ARGS : [] });
for (const id of process.argv.slice(2)) {
  const vdir = path.join(OUT, `f-${id}`);
  fs.rmSync(vdir, { recursive: true, force: true });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: vdir, size: { width: 1280, height: 800 } } });
  const t0 = Date.now();
  const p = await ctx.newPage();
  try {
    await p.goto(URLS[id], { waitUntil: 'load', timeout: 120000 });
    await wait(p, 2500);
    if (READY[id]) await p.waitForFunction(READY[id], null, { timeout: 60000, polling: 300 }).catch(() => console.log('  не дождался гидрации'));
    const start = (Date.now() - t0) / 1000;
    await p.mouse.move(640, 430);
    await wait(p, 1200);
    if (PRELUDE[id]) await PRELUDE[id](p);
    const stops = (STOPS[id] || []).map((s) => ({ ...s, done: false }));
    let last = -1, stallSince = Date.now(), prev = Date.now();
    const deadline = Date.now() + 240000;
    while (Date.now() < deadline) {
      const now = Date.now(); const dt = Math.min(120, now - prev); prev = now;
      await p.mouse.wheel(0, SPEED * dt / 1000); // шаг по реальному времени: скорость не зависит от тяжести страницы
      await wait(p, 16);
      const pending = stops.filter((x) => !x.done).map((x) => x.sel);
      const st = await p.evaluate((sels) => [scrollY, innerHeight, document.documentElement.scrollHeight,
        ...sels.map((sel) => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect().top : 1e9; })], pending);
      for (const [k, s] of stops.filter((x) => !x.done).entries()) {
        if (st[3 + k] < 120 + (s.off || 0)) { s.done = true; await wait(p, 500); await s.run(p); prev = Date.now(); }
      }
      if (st[0] + st[1] >= st[2] - 4) break;
      if (Math.abs(st[0] - last) > 0.5) { last = st[0]; stallSince = Date.now(); }
      else if (Date.now() - stallSince > 1500) { await p.keyboard.press('PageDown'); await p.evaluate(() => scrollBy(0, 200)); stallSince = Date.now(); }
    }
    await wait(p, 1600);
    const end = (Date.now() - t0) / 1000;
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    const v = p.video(); await ctx.close();
    fs.renameSync(await v.path(), `${OUT}/${id}.webm`);
    fs.writeFileSync(`${OUT}/${id}.json`, JSON.stringify({ start, end, H, full: true }));
    console.log(`ok ${id} H=${H} ${start.toFixed(1)}→${end.toFixed(1)}s`);
  } catch (e) { console.log(`FAIL ${id}: ${e.message.split('\n')[0]}`); await ctx.close(); }
  fs.rmSync(vdir, { recursive: true, force: true });
}
await b.close();
