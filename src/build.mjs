// Собирает site/index.html из data.mjs. Запуск: node src/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { person, STATUS, NICHES, projects, products } from './data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(root, 'site');
const has = (f) => fs.existsSync(path.join(SITE, 'media', f));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');
const host = (u) => u.replace(/^https?:\/\//, '').replace(/\/$/, '');

// плоский список всех работ (ветклиники раскрываются в три строки)
const rows = [];
projects.forEach((p) => rows.push({ ...p, chapter: p.id }));
const total = rows.length;
const openable = rows.filter((r) => r.url).length;
const nicheCount = (id) => rows.filter((r) => r.niche === id).length;

// шрифты заголовков проектов: грузим только буквы названий
const titleFonts = new Map();
const addFont = (f, w, italic) => { const k = f; const v = titleFonts.get(k) || new Set(); v.add(`${italic ? 1 : 0},${w}`); titleFonts.set(k, v); };
projects.forEach((p) => addFont(p.theme.font, p.theme.weight, p.theme.italic));
const chars = [...new Set(projects.map((p) => p.name + p.name.toUpperCase()).join('').replace(/\s/g, ''))].join('') + ' ';
const famParam = [...titleFonts.entries()].map(([f, set]) => {
  const list = [...set].sort();
  const anyItalic = list.some((x) => x.startsWith('1'));
  const spec = anyItalic ? `ital,wght@${list.join(';')}` : `wght@${list.map((x) => x.split(',')[1]).join(';')}`;
  return `family=${f.replace(/ /g, '+')}:${spec}`;
}).join('&');
const titleFontsUrl = `https://fonts.googleapis.com/css2?${famParam}&text=${encodeURIComponent(chars)}&display=swap`;

const themeVars = (t) => `--bg:${t.bg};--fg:${t.fg};--ac:${t.accent};--on:${t.onAccent};--tf:'${t.font}';--tw:${t.weight};--ts:${t.italic ? 'italic' : 'normal'};--tt:${t.upper ? 'uppercase' : 'none'}`;

const statusChip = (s) => `<span class="chip chip--${s}">${STATUS[s]}</span>`;

const media = (id, url, opts = {}) => {
  const vid = has(`${id}.mp4`);
  const poster = has(`${id}-poster.webp`) ? `media/${id}-poster.webp` : `media/${id}-d.webp`;
  const bar = `<div class="browser__bar" aria-hidden="true"><i></i><i></i><i></i><span>${url ? host(url) : 'демо'}</span><b class="browser__prog"></b></div>`;
  const screen = vid
    ? `<video class="browser__screen" muted loop playsinline preload="none" poster="${poster}" data-src="media/${id}.mp4" aria-label="Запись прокрутки сайта"></video>`
    : `<img class="browser__screen" src="${poster}" alt="" loading="lazy" decoding="async">`;
  const phone = !opts.noPhone && has(`${id}-m.webp`)
    ? `<figure class="phone"><img src="media/${id}-m.webp" alt="Мобильная версия" loading="lazy" decoding="async" width="390" height="844"></figure>` : '';
  return `<figure class="browser">${bar}${screen}</figure>${phone}`;
};

const caseSection = (p, i) => {
  const num = pad(i + 1);
  const t = p.theme;
  const stats = p.stats ? `<dl class="stats">${p.stats.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl>` : '';
  const cta = p.url
    ? `<a class="btn btn--case" href="${p.url}" target="_blank" rel="noopener">${p.status === 'live' ? 'Открыть сайт' : 'Открыть демо'} <span aria-hidden="true">↗</span></a><span class="case__host">${host(p.url)}</span>`
    : `<a class="btn btn--ghost" href="${person.telegram}" target="_blank" rel="noopener">Попросить ссылку на демо</a>`;
  return `<section class="case ${i % 2 ? 'case--flip' : ''}" id="p-${p.id}" data-niche="${p.niche}" data-n="${num}" style="${themeVars(t)}">
    <div class="wrap case__grid">
      <div class="case__head">
        <div class="case__meta"><span class="case__num">${num}</span><span>${esc(p.place)}</span>${statusChip(p.status)}</div>
        <h2 class="case__title">${esc(p.name)}</h2>
        <p class="case__idea">${esc(p.idea)}</p>
      </div>
      <div class="case__media">${media(p.id, p.url)}</div>
      <div class="case__text">
        ${stats}
        <dl class="lines">
          <div><dt>Задача</dt><dd>${esc(p.task)}</dd></div>
          <div><dt>Фишка</dt><dd>${esc(p.hook)}</dd></div>
        </dl>
        <ul class="tags">${p.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <div class="case__cta">${cta}</div>
      </div>
    </div>
  </section>`;
};

// плёнка в первом экране
const reelIds = rows.filter((r) => has(`${r.id}-t.webp`));
const tile = (r) => `<a class="tile" href="#p-${r.chapter}" tabindex="-1"><img src="media/${r.id}-t.webp" alt="" width="480" height="300" decoding="async"><span>${esc(r.name)}</span></a>`;
const half = Math.ceil(reelIds.length / 2);
const reelRow = (list, dir) => `<div class="reel__row reel__row--${dir}"><div class="reel__track">${list.map(tile).join('')}${list.map(tile).join('')}</div></div>`;

const segs = projects.map((p) => `<a class="seg" href="#p-${p.id}" style="--c:${p.theme.accent}" aria-label="${esc(p.name)}"></a>`).join('');

const VER = Date.now().toString(36);
const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${person.name} — сайты, реклама и продвижение</title>
<meta name="description" content="${total} сайтов и демо для бизнесов Беларуси: стоматологии, ветклиники, усадьбы, стройка, пригон авто. У каждого своя идея.">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#19141F">
<meta property="og:title" content="${person.name} — сайты, у которых есть своя идея">
<meta property="og:description" content="${total} проектов для бизнесов Беларуси. Ни один не похож на другой.">
<meta property="og:image" content="media/og.jpg">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="${titleFontsUrl}">
<link rel="stylesheet" href="styles.css?v=${VER}">
<script>document.documentElement.classList.add('js')</script>
</head>
<body>
<a class="skip" href="#works">К работам</a>
<header class="top" id="top-bar">
  <div class="top__in">
    <a class="brand" href="#top"><span class="brand__name">${person.name}</span></a>
    <nav class="top__nav" aria-label="Разделы"><a href="#works">Работы</a><a href="#services">Услуги</a><a href="#how">Как работаю</a><a href="#contact">Контакты</a></nav>
    <a class="btn btn--accent btn--sm" href="${person.telegram}" target="_blank" rel="noopener"><span>Написать<span class="hide-s"> в Telegram</span></span></a>
  </div>
  <div class="segs" aria-hidden="true">${segs}</div>
</header>

<main>
<section class="hero" id="top">
  <div class="wrap hero__text">
    <p class="hero__who">${person.name}. Сайты, контекстная реклама и продвижение аккаунтов для бизнеса в Беларуси</p>
    <h1>Сайты, у&nbsp;которых есть <em>своя идея</em></h1>
    <div class="hero__row">
      <p class="hero__lead">Стоматологии, ветклиники, усадьбы, стройка, пригон авто. Каждый сайт собран на настоящих услугах, фото и ценах бизнеса, без заглушек.</p>
      <div class="hero__cta">
        <a class="btn btn--accent" href="${person.telegram}" target="_blank" rel="noopener">Написать в Telegram</a>
        <a class="btn btn--line" href="#works">Смотреть работы <span aria-hidden="true">↓</span></a>
      </div>
    </div>
    <p class="hero__facts"><b>${total}</b> проектов, ни один не повторяет другой <i aria-hidden="true">/</i> <b>${openable}</b> можно открыть прямо сейчас <i aria-hidden="true">/</i> <a href="https://32dent.by" target="_blank" rel="noopener"><b>32dent.by</b></a> работает у клиента</p>
  </div>
  <div class="reel" aria-hidden="true">${reelRow(reelIds.slice(0, half), 'l')}${reelRow(reelIds.slice(half), 'r')}</div>
</section>

<section class="index" id="works" aria-labelledby="works-h">
  <div class="wrap">
    <div class="index__head">
      <h2 id="works-h">Все работы</h2>
      <div class="filters" role="group" aria-label="Фильтр по нише">
        <button class="filter is-on" data-f="all" aria-pressed="true">Все <sup>${total}</sup></button>
        ${NICHES.map((n) => `<button class="filter" data-f="${n.id}" aria-pressed="false">${n.label} <sup>${nicheCount(n.id)}</sup></button>`).join('')}
      </div>
    </div>
    <ol class="list">
      ${rows.map((r, i) => `<li data-niche="${r.niche}"><a href="#p-${r.chapter}" data-peek="${has(`${r.id}-t.webp`) ? `media/${r.id}-t.webp` : ''}">
        <span class="list__n">${pad(i + 1)}</span>
        <span class="list__name">${esc(r.name)}<small>${esc(r.place)}</small></span>
        <span class="list__idea">${esc(r.idea)}</span>
        <span class="list__st list__st--${r.status}">${STATUS[r.status]}</span>
        <span class="list__go" aria-hidden="true">→</span>
      </a></li>`).join('')}
    </ol>
  </div>
  <img class="peek" alt="" aria-hidden="true">
</section>

${projects.map(caseSection).join('\n')}

<section class="services" id="services" aria-labelledby="services-h">
  <div class="wrap">
    <h2 id="services-h">Кроме сайтов</h2>
    <p class="services__lead">Сайт приносит заявки, когда на него приходят люди. Поэтому занимаюсь и тем, что их приводит.</p>
    <div class="services__grid">
      <article class="service">
        <h3>Контекстная реклама</h3>
        <p class="service__how">Ваше объявление показывается, когда человек ищет услугу в Яндексе или Google в своём городе. Платите за переходы на сайт, бюджет задаёте сами.</p>
        <p class="service__inc">Что входит</p>
        <ul class="service__list">
          <li>Разбор ниши и конкурентов, подбор запросов, по которым ищут клиенты</li>
          <li>Тексты объявлений и настройка кампаний в Яндекс Директ и Google Ads</li>
          <li>Аналитика: видно, сколько звонков и заявок пришло с рекламы</li>
          <li>Ведение: отключаю запросы, которые тратят деньги впустую, правлю ставки и объявления</li>
          <li>Понятный отчёт: сколько потрачено и сколько пришло заявок</li>
        </ul>
      </article>
      <article class="service">
        <h3>Продвижение аккаунта бизнеса</h3>
        <p class="service__how">Разбираюсь, кто ваши клиенты и что им важно увидеть, и выстраиваю аккаунт так, чтобы из профиля было понятно, почему вы и как к вам записаться.</p>
        <p class="service__inc">Что входит</p>
        <ul class="service__list">
          <li>Разбор аккаунта и конкурентов</li>
          <li>Оформление профиля: описание, актуальное, закреплённые посты</li>
          <li>Контент-план и идеи для постов, сторис и рилс, тексты к публикациям</li>
          <li>Кнопки и ссылки, чтобы из профиля было легко написать или записаться</li>
          <li>Реклама аккаунта на людей из вашего города</li>
        </ul>
      </article>
    </div>
  </div>
</section>

<section class="how" id="how" aria-labelledby="how-h">
  <div class="wrap">
    <h2 id="how-h">Как я работаю</h2>
    <ol class="steps">
      <li><span class="steps__n">1</span><h3>Изучаю ваш бизнес</h3><p>Отзывы, цены, вопросы клиентов, сайты конкурентов в городе и лучшие сайты ниши в Европе. Понимаю, что мешает людям обратиться.</p></li>
      <li><span class="steps__n">2</span><h3>Делаю демо на ваших данных</h3><p>Ваши услуги, фото, цены и телефоны, без заглушек. Смотрите с телефона и говорите, что поправить.</p></li>
      <li><span class="steps__n">3</span><h3>Доводим и запускаем</h3><p>Остальные страницы, заявки в Telegram или на почту, домен, правки. Пример запущенного сайта — 32dent.by.</p></li>
    </ol>
  </div>
</section>

<section class="products" aria-labelledby="prod-h">
  <div class="wrap">
    <h2 id="prod-h">Свои продукты</h2>
    <div class="products__grid">
      ${products.map((p) => `<article class="product">
        <figure class="browser browser--sm"><div class="browser__bar" aria-hidden="true"><i></i><i></i><i></i></div><img class="browser__screen" src="media/${p.img}.webp" alt="" loading="lazy" decoding="async"></figure>
        <p class="product__kind">${esc(p.kind)}</p>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.text)}</p>
        <ul class="tags">${p.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </article>`).join('')}
    </div>
  </div>
</section>

<section class="contact" id="contact" aria-labelledby="contact-h">
  <div class="wrap">
    <h2 id="contact-h">Сделаю демо для вашего бизнеса</h2>
    <p class="contact__lead">Пришлите название, сайт или Instagram. Посмотрю, что можно сделать лучше, и покажу это на демо.</p>
    <div class="contact__links">
      <a class="btn btn--accent btn--xl" href="${person.telegram}" target="_blank" rel="noopener">Telegram ${person.telegramLabel}</a>
      <a class="contact__alt" href="tel:${person.phone}">${person.phoneLabel}</a>
      <a class="contact__alt" href="mailto:${person.email}">${person.email}</a>
    </div>
  </div>
</section>
</main>

<footer class="foot"><div class="wrap"><span>© ${new Date().getFullYear()} ${person.name}</span><a href="${person.github}" target="_blank" rel="noopener">GitHub</a></div></footer>
<a class="fab" href="${person.telegram}" target="_blank" rel="noopener">Написать в Telegram</a>
<script src="main.js?v=${VER}" defer></script>
</body>
</html>
`;

fs.writeFileSync(path.join(SITE, 'index.html'), html);
console.log('index.html:', (html.length / 1024).toFixed(1), 'KB,', total, 'работ,', openable, 'со ссылкой');
