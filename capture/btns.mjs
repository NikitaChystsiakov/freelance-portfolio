import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nikita/Desktop/Фриланс/Свои проекты/CV/node_modules/playwright-core');
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(2000);
console.log((await p.evaluate(() => [...document.querySelectorAll('button,[role=slider],input')].map(e => `${Math.round(e.getBoundingClientRect().top+scrollY)}|${e.tagName}|${(e.getAttribute('aria-label')||e.innerText||e.value||'').replace(/\n/g,' ').slice(0,40)}`))).join('\n'));
await b.close();
