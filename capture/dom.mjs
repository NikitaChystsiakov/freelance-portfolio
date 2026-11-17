import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nikita/Desktop/Фриланс/Свои проекты/CV/node_modules/playwright-core');
const { SITES } = await import('./sites.mjs');
const b = await chromium.launch({ channel: 'chrome', headless: true });
for (const id of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto(SITES[id].url, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(2000);
  const r = await p.evaluate(() => ({
    H: document.documentElement.scrollHeight,
    heads: [...document.querySelectorAll('h2,h3,section[id]')].slice(0, 40).map(e => `${Math.round(e.getBoundingClientRect().top + scrollY)}:${e.tagName}${e.id ? '#' + e.id : ''}:${(e.innerText || '').slice(0, 40).replace(/\n/g, ' ')}`),
    ctrls: [...document.querySelectorAll('button,input,[role=radio],label')].filter(e => { const r = e.getBoundingClientRect(); return r.top + scrollY < 900 && r.width > 0; }).slice(0, 40).map(e => `${e.tagName}${e.type ? '[' + e.type + ']' : ''}:${(e.innerText || e.getAttribute('aria-label') || e.value || '').slice(0, 30).replace(/\n/g, ' ')}`),
  }));
  console.log('=====', id, 'H=', r.H); console.log(r.heads.join('\n')); console.log('-- ctrls:', r.ctrls.join(' | '));
  await p.close();
}
await b.close();
