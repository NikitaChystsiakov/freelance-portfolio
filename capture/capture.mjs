// Снимает с каждого демо: первый экран desktop + mobile и видео-прокрутку.
// Запуск: node capture.mjs [id ...]   (без аргументов — все)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nikita/Desktop/Фриланс/Свои проекты/CV/node_modules/playwright-core');

const OUT = path.resolve('raw');
fs.mkdirSync(OUT, { recursive: true });

export const SITES = {
  dent32:     { url: 'http://127.0.0.1:4301/' },
  zvezda:     { url: 'http://127.0.0.1:4302/' },
  butsevichi: { url: 'http://localhost:4303/svadby' },
  dobrahata:  { url: 'http://localhost:4304/' },
  doctorvet:  { url: 'http://localhost:4305/' },
  vetsas:     { url: 'http://localhost:4306/' },
  vetpulse:   { url: 'http://localhost:4307/' },
  lithos:     { url: 'http://localhost:4308/' },
  carsify:    { url: 'https://carsifyby.vercel.app/' },
  carusbrest: { url: 'https://carusbrest.vercel.app/' },
  gonar:      { url: 'https://gonar-a-frame.vercel.app/' },
  moydom:     { url: 'https://moydom-by-demo.vercel.app/' },
  krasservis: { url: 'https://krasservis-demo.vercel.app/' },
  listvich:   { url: 'https://listvich-demo.vercel.app/' },
  kavahome:   { url: 'https://kavahome.vercel.app/' },
};

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SITES);
const VIDEO_SECONDS = Number(process.env.SECS || 22);
const SPEED = Number(process.env.SPEED || 420); // px/s

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

async function open(ctx, url) {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(3500);
  return page;
}

for (const id of ids) {
  const s = SITES[id];
  if (!s) { console.log('нет такого', id); continue; }
  const t0 = Date.now();
  try {
    // desktop
    let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    let page = await open(ctx, s.url);
    await page.screenshot({ path: `${OUT}/${id}-d.jpg`, type: 'jpeg', quality: 85 });
    await ctx.close();

    // mobile
    ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
    page = await open(ctx, s.url);
    await page.screenshot({ path: `${OUT}/${id}-m.jpg`, type: 'jpeg', quality: 80 });
    await ctx.close();

    // video: плавная прокрутка колесом
    const vdir = path.join(OUT, `v-${id}`);
    fs.rmSync(vdir, { recursive: true, force: true });
    ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: vdir, size: { width: 1280, height: 800 } } });
    const vstart = Date.now();
    page = await open(ctx, s.url);
    const loadMs = Date.now() - vstart;
    await page.mouse.move(640, 420);
    const step = SPEED / 60;
    const end = Date.now() + VIDEO_SECONDS * 1000;
    while (Date.now() < end) {
      await page.mouse.wheel(0, step);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(500);
    const video = page.video();
    await ctx.close();
    const vpath = await video.path();
    fs.renameSync(vpath, `${OUT}/${id}.webm`);
    fs.rmSync(vdir, { recursive: true, force: true });
    fs.writeFileSync(`${OUT}/${id}.json`, JSON.stringify({ loadMs }));
    console.log(`ok ${id} ${(Date.now() - t0) / 1000 | 0}s load=${loadMs}ms`);
  } catch (e) {
    console.log(`FAIL ${id}: ${e.message.split('\n')[0]}`);
  }
}
await browser.close();
