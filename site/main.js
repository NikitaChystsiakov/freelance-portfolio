// Портфолио: перекраска шапки под главу, видео только в зоне видимости, фильтр по нише, превью в списке
(() => {
  const root = document.documentElement;
  const bar = document.getElementById('top-bar');
  const cases = [...document.querySelectorAll('.case')];
  const segs = [...document.querySelectorAll('.seg')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Шапка берёт цвета текущего проекта
  const setHeader = (el) => {
    if (!el) { ['--h-bg', '--h-fg', '--h-ac', '--h-on'].forEach((v) => bar.style.removeProperty(v)); segs.forEach((s) => s.classList.remove('is-on')); return; }
    const cs = getComputedStyle(el);
    bar.style.setProperty('--h-bg', cs.getPropertyValue('--bg'));
    bar.style.setProperty('--h-fg', cs.getPropertyValue('--fg'));
    bar.style.setProperty('--h-ac', cs.getPropertyValue('--ac'));
    bar.style.setProperty('--h-on', cs.getPropertyValue('--on'));
    const i = cases.indexOf(el);
    segs.forEach((s, j) => s.classList.toggle('is-on', j === i));
  };
  const onScroll = () => {
    const y = bar.offsetHeight + 40;
    const cur = cases.find((c) => !c.hidden && c.getBoundingClientRect().top <= y && c.getBoundingClientRect().bottom > y);
    setHeader(cur);
  };
  let ticking = false;
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); } }, { passive: true });
  onScroll();

  // 2. Появление блоков
  const revealIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.case, .how, .products').forEach((el) => revealIO.observe(el));

  // 3. Видео: грузим заранее, играем только когда видно
  const videos = [...document.querySelectorAll('video[data-src]')];
  const loadIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { const v = e.target; v.src = v.dataset.src; v.preload = 'auto'; loadIO.unobserve(v); }
  }), { rootMargin: '600px 0px' });
  const playIO = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting && !reduce) { v.play().catch(() => {}); } else { v.pause(); }
  }), { threshold: 0.35 });
  videos.forEach((v) => {
    loadIO.observe(v); playIO.observe(v);
    const prog = v.closest('.browser')?.querySelector('.browser__prog');
    if (prog) v.addEventListener('timeupdate', () => { if (v.duration) prog.style.setProperty('--p', (v.currentTime / v.duration).toFixed(3)); });
  });

  // 4. Фильтр по нише: прячет строки списка и главы
  const filters = [...document.querySelectorAll('.filter')];
  const rows = [...document.querySelectorAll('.list li')];
  filters.forEach((b) => b.addEventListener('click', () => {
    const f = b.dataset.f;
    filters.forEach((x) => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on); });
    rows.forEach((r) => { r.hidden = f !== 'all' && r.dataset.niche !== f; });
    cases.forEach((c, i) => { const off = f !== 'all' && c.dataset.niche !== f; c.hidden = off; segs[i]?.classList.toggle('is-off', off); });
    onScroll();
  }));

  // 5. Превью сайта рядом с курсором в списке
  const peek = document.querySelector('.peek');
  if (peek && matchMedia('(pointer: fine)').matches) {
    let x = 0, y = 0, px = 0, py = 0, raf = 0;
    const loop = () => { px += (x - px) * 0.2; py += (y - py) * 0.2; peek.style.left = px + 'px'; peek.style.top = py + 'px'; raf = requestAnimationFrame(loop); };
    document.querySelectorAll('.list a').forEach((a) => {
      a.addEventListener('mouseenter', (e) => {
        if (!a.dataset.peek) return;
        peek.src = a.dataset.peek; x = px = e.clientX + 190; y = py = e.clientY;
        peek.classList.add('is-on'); cancelAnimationFrame(raf); loop();
      });
      a.addEventListener('mousemove', (e) => { x = e.clientX + 190; y = e.clientY; });
      a.addEventListener('mouseleave', () => { peek.classList.remove('is-on'); cancelAnimationFrame(raf); });
    });
  }

  // 6. Кнопка Telegram внизу на телефоне: после первого экрана и не поверх контактов
  const fab = document.querySelector('.fab');
  const hero = document.querySelector('.hero');
  const contact = document.getElementById('contact');
  if (fab) {
    let heroOut = false, contactIn = false;
    const upd = () => fab.classList.toggle('is-on', heroOut && !contactIn);
    new IntersectionObserver(([e]) => { heroOut = !e.isIntersecting; upd(); }).observe(hero);
    new IntersectionObserver(([e]) => { contactIn = e.isIntersecting; upd(); }).observe(contact);
  }
})();
