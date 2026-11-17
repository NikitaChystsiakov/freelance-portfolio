import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nikita/Desktop/Фриланс/Свои проекты/CV/node_modules/playwright-core');
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto('https://kavahome.vercel.app/', { waitUntil: 'load' }); await p.waitForTimeout(2000);
console.log(await p.evaluate(() => { const s = document.querySelector('#kollekcii'); return { h: s.offsetHeight, kids: [...s.querySelectorAll('a,[role=button],[tabindex],button')].slice(0, 30).map(e => `${e.tagName}|${e.className.toString().slice(0,40)}|${(e.getAttribute('aria-label')||e.innerText||'').replace(/\n/g,' ').slice(0,40)}`), classes: s.innerHTML.match(/class="[^"]*(flip|card|post)[^"]*"/g)?.slice(0, 8) }; }));
await b.close();
