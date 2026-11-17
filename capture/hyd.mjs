import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nikita/Desktop/Фриланс/Свои проекты/CV/node_modules/playwright-core');
const b = await chromium.launch({ channel: 'chrome', headless: true });
for (const u of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200))); p.on('console', m => m.type() === 'error' && !m.text().includes('WebSocket') && errs.push(m.text().slice(0, 200)));
  await p.goto(u, { waitUntil: 'load' }); await p.waitForTimeout(4000);
  const h = await p.evaluate(() => { const el = document.querySelector('main') || document.body; return Object.keys(el).some(k => k.startsWith('__react')); });
  console.log(u, 'hydrated:', h, '\n ', errs.slice(0, 4).join('\n  '));
  await p.close();
}
await b.close();
