// Скриншоты портфолио для проверки: node review.mjs [d|m]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nikita/Desktop/Фриланс/Свои проекты/CV/node_modules/playwright-core');
const mode = process.argv[2] || 'd';
const dir = `review/${mode}`; fs.mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await b.newContext(mode === 'd' ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4210/', { waitUntil: 'load' }); await p.waitForTimeout(1500);
const targets = (process.argv[3] || '#top,#works,.case:nth-of-type(1),#p-carusbrest,#p-dent32,#p-krasservis,#p-vets,#how,.products,#contact').split(',');
let i = 0;
for (const t of targets) {
  await p.evaluate((s) => { const el = document.querySelector(s); el && el.scrollIntoView({ behavior: 'instant' }); }, t);
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `${dir}/${String(i++).padStart(2, '0')}-${t.replace(/[^a-z0-9]/gi, '')}.jpg`, type: 'jpeg', quality: 70 });
}
await b.close();
