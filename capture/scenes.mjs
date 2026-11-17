// Сценарные ролики: фишка в действии (клики, нужный участок прокрутки).
// Запуск: node scenes.mjs [id ...]. Пишет raw/<id>.webm поверх общего ролика и raw/<id>.json с моментом старта.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nikita/Desktop/Фриланс/Свои проекты/CV/node_modules/playwright-core');
const { SITES } = await import('./sites.mjs');
const OUT = path.resolve('raw');

const wait = (p, ms) => p.waitForTimeout(ms);
async function wheel(p, px, speed = 500) { // плавно колесом
  const step = speed / 60; let done = 0;
  while (done < px) { await p.mouse.wheel(0, step); done += step; await wait(p, 16); }
}
async function smooth(p, to, speed = 600) { // программная прокрутка (для сайтов, где колесо перехвачено)
  let y = await p.evaluate(() => scrollY);
  const dir = Math.sign(to - y);
  while ((to - y) * dir > 0) { y += dir * speed / 60; await p.evaluate((v) => scrollTo(0, v), y); await wait(p, 16); }
}
const jump = (p, sel, off = 0) => p.evaluate(([s, o]) => { const el = document.querySelector(s); scrollTo(0, el.getBoundingClientRect().top + scrollY + o); }, [sel, off]);
async function click(p, loc, pause = 1100) {
  try { await loc.first().click({ timeout: 2500 }); }
  catch (e) { try { await loc.first().evaluate((el) => el.click(), null, { timeout: 2000 }); console.log('  клик через JS'); } catch (e2) { console.log('  нет клика:', e2.message.split('\n')[0].slice(0, 90)); } }
  await wait(p, pause);
}

const SCENES = {
  listvich: async (p) => {
    await wait(p, 1500);
    const cfg = p.locator('#cfg');
    const b = (name, n = 0) => cfg.locator('button').filter({ hasText: new RegExp('^\\s*' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$') }).nth(n);
    await click(p, b('2,3 м'), 1300);
    await click(p, b('3 м', 1), 1500);
    await click(p, b('Морёный дуб'), 1300);
    await click(p, b('Олива'), 1300);
    await click(p, b('Дачный домик утеплённый'), 1500);
    await click(p, b('Серый антрацит'), 1500);
  },
  dobrahata: async (p) => {
    await wait(p, 1200);
    await click(p, p.getByRole('button', { name: 'Несколько суток' }), 900);
    await click(p, p.getByRole('button', { name: /^20 ноябрь/ }), 700);
    await click(p, p.getByRole('button', { name: /^22 ноябрь/ }), 1200);
    await wheel(p, 520, 600);
    await click(p, p.getByRole('button', { name: /Территория с домом на сутки/ }), 1000);
    for (let i = 0; i < 6; i++) await click(p, p.getByRole('button', { name: 'Больше' }), 260);
    await wait(p, 1200);
  },
  gonar: async (p) => {
    await wait(p, 2200);
    await jump(p, '#calc', 60); await wait(p, 900);
    const calc = p.locator('#calc');
    await click(p, calc.getByText('6×8', { exact: false }), 1000);
    await click(p, calc.getByText(/Аттиков/), 1100);
    await click(p, calc.getByText(/Балкон/), 1300);
    await jump(p, '#build', 0); await wait(p, 600);
    await wheel(p, 2900, 520);
  },
  zvezda: async (p) => {
    await wait(p, 1800);
    await wheel(p, 6000, 640);
  },
  lithos: async (p) => {
    await wait(p, 1500);
    await wheel(p, 1180, 700); await wait(p, 600);
    await wheel(p, 3600, 420);
  },
  kavahome: async (p) => {
    await wait(p, 1800);
    await jump(p, '#kollekcii', -64); await wait(p, 1000);
    const cards = p.locator('#kollekcii [class*="_card"]');
    for (const i of [1, 2, 3, 4]) { try { await cards.nth(i).click({ timeout: 3000, force: true }); } catch {} await wait(p, 1700); }
    for (const c of ['графит', 'изумруд']) await click(p, p.locator('#kollekcii').getByRole('button', { name: c }), 1200);
  },
  dent32: async (p) => {
    await wait(p, 1500);
    await wheel(p, 3600, 650);
  },
  butsevichi: async (p) => {
    await wait(p, 2500);
    await wheel(p, 7000, 560);
  },
};

const URL_OVERRIDE = { dent32: 'http://127.0.0.1:4301/minsk/', zvezda: 'http://127.0.0.1:4310/' };

const b = await chromium.launch({ channel: 'chrome', headless: true });
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SCENES);
for (const id of ids) {
  const vdir = path.join(OUT, `s-${id}`);
  fs.rmSync(vdir, { recursive: true, force: true });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: vdir, size: { width: 1280, height: 800 } } });
  const t0 = Date.now();
  const p = await ctx.newPage();
  try {
    await p.goto(URL_OVERRIDE[id] || SITES[id].url, { waitUntil: 'load', timeout: 120000 });
    await wait(p, 1500);
    const loadMs = Date.now() - t0;
    await p.mouse.move(640, 420);
    await SCENES[id](p);
    const v = p.video(); await ctx.close();
    fs.renameSync(await v.path(), `${OUT}/${id}.webm`);
    fs.writeFileSync(`${OUT}/${id}.json`, JSON.stringify({ loadMs, scene: true }));
    console.log(`ok ${id} load=${loadMs} total=${Date.now() - t0}`);
  } catch (e) { console.log(`FAIL ${id}: ${e.message.split('\n')[0]}`); await ctx.close(); }
  fs.rmSync(vdir, { recursive: true, force: true });
}
await b.close();
