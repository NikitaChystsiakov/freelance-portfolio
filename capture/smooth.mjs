// Покадровый ролик «весь сайт» для тяжёлых страниц (много видео, Lenis/GSAP), где запись в реальном времени дёргается.
// На каждом кадре страница прокручивается на одинаковый шаг и снимается скриншот → прокрутка идеально ровная.
// Анимации и видео самой страницы идут в реальном времени, поэтому в ролике они немного ускорены (как и раньше при x1.5).
// Запуск: GPU=1 node smooth.mjs carusbrest  → raw/seq-<id>/*.jpg → site/media/<id>.mp4 + <id>-poster.webp
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nikita/Desktop/Фриланс/Свои проекты/CV/node_modules/playwright-core');

const URLS = {
  carusbrest: 'https://carusbrest.vercel.app/',
};
const FPS = 30;
const MAX_STILL = 6; // сколько кадров подряд может стоять картинка внутри прокрутки
const SCROLL_SEC = Number(process.env.SCROLL_SEC || 25); // сколько секунд в ролике занимает прокрутка
const HOLD_START = 1.2, HOLD_END = 1.5;                  // секунды на первом экране и в подвале
const MIN_REAL_MS = 50;                                  // не быстрее этого в реальном времени на кадр
const OUT = path.resolve('../site/media');
const GPU_ARGS = ['--use-angle=metal', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-zero-copy'];

const b = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADED, args: process.env.GPU ? GPU_ARGS : [] });
for (const id of process.argv.slice(2)) {
  const dir = path.resolve('raw', `seq-${id}`);
  if (!process.env.ENCODE_ONLY) await shoot(id, dir);
  encode(id, dir);
}
await b.close();

async function shoot(id, dir) {
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await p.goto(URLS[id], { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(2500);
  await p.mouse.move(640, 430);
  const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const ys = [
    ...Array(Math.round(HOLD_START * FPS)).fill(0),
    ...Array.from({ length: Math.round(SCROLL_SEC * FPS) + 1 }, (_, i) => {
      const t = i / Math.round(SCROLL_SEC * FPS); const e = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t); // мягкий разгон и торможение
      return Math.round(0.15 * e * max + 0.85 * t * max);
    }),
    ...Array(Math.round(HOLD_END * FPS)).fill(max),
  ];
  let n = 0, prev = Date.now();
  for (const y of ys) {
    await p.evaluate((y) => new Promise((r) => { scrollTo(0, y); requestAnimationFrame(() => requestAnimationFrame(r)); }), y);
    const gap = MIN_REAL_MS - (Date.now() - prev); if (gap > 0) await p.waitForTimeout(gap);
    prev = Date.now();
    await p.screenshot({ path: path.join(dir, String(n++).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 88 });
  }
  await p.context().close();
}

// Закреплённые секции сайта (pin) дают куски, где страница прокручивается, а картинка стоит: в ролике это похоже на зависание.
// Такие куски сокращаем до MAX_STILL кадров. Первый экран и подвал не трогаем.
function encode(id, dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort();
  const scores = execFileSync('ffmpeg', ['-v', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg'),
    // попиксельная разница с предыдущим кадром (0–255); на тёмных участках scene-score врёт, поэтому tblend
    '-vf', 'scale=320:200,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-',
    '-an', '-f', 'null', '-'], { maxBuffer: 64 << 20 })
    .toString().split('\n').filter((l) => l.includes('YAVG')).map((l) => Number(l.split('=')[1]));
  scores.unshift(255); // у первого кадра нет предыдущего
  const head = Math.round(HOLD_START * FPS), tail = files.length - Math.round(HOLD_END * FPS);
  const keep = []; let still = 0;
  files.forEach((f, i) => {
    still = scores[i] < 0.3 ? still + 1 : 0;
    if (i < head || i >= tail || still <= MAX_STILL) keep.push(f);
  });
  const list = path.join(dir, 'keep.txt');
  fs.writeFileSync(list, keep.map((f) => `file '${path.join(dir, f)}'\nduration ${1 / FPS}`).join('\n') + '\n');
  const tmp = path.join(OUT, `${id}.tmp.mp4`);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list,
    '-vf', `fps=${FPS},scale=1120:700:flags=lanczos,format=yuv420p`, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '31',
    '-profile:v', 'high', '-movflags', '+faststart', tmp]);
  fs.renameSync(tmp, path.join(OUT, `${id}.mp4`));
  execFileSync('cwebp', ['-quiet', '-q', '72', '-resize', '1280', '0', '-m', '6', path.join(dir, '00000.jpg'), '-o', path.join(OUT, `${id}-poster.webp`)]);
  const kb = Math.round(fs.statSync(path.join(OUT, `${id}.mp4`)).size / 1024);
  console.log(`ok ${id}: ${files.length} кадров снято, ${keep.length} в ролике, ${(keep.length / FPS).toFixed(1)} с, ${kb} KB`);
}
