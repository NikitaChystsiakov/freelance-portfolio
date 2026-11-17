import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nikita/Desktop/Фриланс/Свои проекты/CV/node_modules/playwright-core');
const { SITES } = await import('./sites.mjs');
const b = await chromium.launch({ channel: 'chrome', headless: true });
const out = {};
for (const [id, s] of Object.entries(SITES)) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await p.goto(s.url, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(1500);
    out[id] = await p.evaluate(() => {
      const h = document.querySelector('h1') || document.querySelector('h2');
      const cs = h ? getComputedStyle(h) : null;
      const btn = [...document.querySelectorAll('a,button')].find(e => { const c = getComputedStyle(e).backgroundColor; return c !== 'rgba(0, 0, 0, 0)' && c !== 'rgb(255, 255, 255)' && e.offsetWidth > 60; });
      return { h1: h?.innerText.slice(0, 90), font: cs?.fontFamily.slice(0, 80), weight: cs?.fontWeight, h1color: cs?.color,
        body: getComputedStyle(document.body).fontFamily.slice(0, 60), bodyBg: getComputedStyle(document.body).backgroundColor,
        btn: btn ? getComputedStyle(btn).backgroundColor : null, title: document.title.slice(0, 90),
        fonts: [...new Set([...document.fonts].map(f => f.family.replace(/"/g, '')))].slice(0, 6) };
    });
  } catch (e) { out[id] = { err: e.message.split('\n')[0] }; }
  await p.close();
}
console.log(JSON.stringify(out, null, 1));
await b.close();
