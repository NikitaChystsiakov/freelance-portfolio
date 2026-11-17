import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nikita/Desktop/Фриланс/Свои проекты/CV/node_modules/playwright-core');
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const N = Number(process.env.N || 80);
for (let i = 0; i <= N; i++) {
  const v = (i / N).toFixed(4);
  await p.goto(`http://127.0.0.1:4310/?p=${v}`, { waitUntil: 'load' });
  await p.waitForTimeout(i === 0 ? 3000 : 900);
  await p.screenshot({ path: `raw/zv/f${String(i).padStart(3, '0')}.jpg`, type: 'jpeg', quality: 90 });
}
await b.close();
