// raw/ → site/media/: webp-скриншоты, mp4-ролики с постером. Запуск: node process.mjs [id ...]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const RAW = path.resolve('raw');
const OUT = path.resolve('../site/media');
fs.mkdirSync(OUT, { recursive: true });
const run = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args]);
const webp = (src, out, w, q) => execFileSync('cwebp', ['-quiet', '-q', String(q), '-resize', String(w), '0', '-m', '6', src, '-o', out]);
const TMP = path.resolve('raw/_tmp.png');
const MAXOUT = Number(process.env.MAXOUT || 30);

// skip — сколько секунд пропустить после загрузки, speed — ускорение, max — длина итогового ролика
const CLIP = {
  carusbrest: { skip: 0, speed: 1.5, max: 13 },
  dent32: { skip: 0, speed: 1.4, max: 12 },
  krasservis: { skip: 0, speed: 1.5, max: 13 },
  butsevichi: { at: 5.5, speed: 3.1, max: 14.5 },
  listvich: { skip: 0.3, speed: 1.15, max: 13 },
  gonar: { skip: 0, speed: 1.35, max: 14 },
  moydom: { skip: 0, speed: 1.5, max: 13 },
  carsify: { skip: 0, speed: 1.5, max: 13 },
  kavahome: { skip: 0.5, speed: 1.15, max: 13 },
  dobrahata: { at: 18, speed: 1.05, max: 12 },
  zvezda: { skip: 0.2, speed: 1.6, max: 15 },
  doctorvet: { skip: 0, speed: 1.5, max: 11 },
  vetsas: { skip: 0, speed: 1.5, max: 11 },
  vetpulse: { skip: 0, speed: 1.5, max: 11 },
};

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CLIP);
for (const id of ids) {
  const d = `${RAW}/${id}-d.jpg`, m = `${RAW}/${id}-m.jpg`, v = `${RAW}/${id}.webm`;
  if (fs.existsSync(d)) {
    webp(d, `${OUT}/${id}-d.webp`, 1280, 74);
    webp(d, `${OUT}/${id}-t.webp`, 640, 70);
  }
  if (fs.existsSync(m)) webp(m, `${OUT}/${id}-m.webp`, 520, 74);
  if (fs.existsSync(v) && CLIP[id]) {
    const meta = JSON.parse(fs.readFileSync(`${RAW}/${id}.json`, 'utf8'));
    let c = CLIP[id], start, src;
    if (meta.full) { // весь сайт: от первого экрана до подвала, не длиннее MAXOUT секунд
      start = Math.max(0, meta.start - 1.0);
      src = meta.end - start;
      c = { speed: Math.max(1.3, src / MAXOUT) };
    } else {
      start = c.at ?? Math.max(0, meta.loadMs / 1000 - 0.6 + c.skip);
      src = c.max * c.speed;
    }
    const tmp = `${OUT}/${id}.mp4`;
    run(['-ss', String(start), '-t', String(src), '-i', v,
      '-vf', `setpts=PTS/${c.speed},fps=25,scale=1120:700:flags=lanczos,format=yuv420p`,
      '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '31', '-profile:v', 'high', '-movflags', '+faststart', tmp]);
    run(['-i', tmp, '-frames:v', '1', TMP]);
    webp(TMP, `${OUT}/${id}-poster.webp`, 1280, 72);
    const kb = (fs.statSync(tmp).size / 1024) | 0;
    console.log(`${id}: ${kb} KB, x${c.speed.toFixed(2)}, ${(src / c.speed).toFixed(1)} с`);
  } else console.log(`${id}: только картинки`);
}

// свои продукты: готовые скриншоты из папок проектов
const PROD = {
  zaezd: '/Users/nikita/Desktop/Фриланс/Свои проекты/Заезд/docs/screenshots/guest-booking.png',
  olympus: '/Users/nikita/Desktop/Фриланс/Свои проекты/Платформа для проведения олимпиад/docs/screenshots/landing.png',
};
if (!process.argv.slice(2).length) for (const [k, f] of Object.entries(PROD)) {
  if (fs.existsSync(f)) webp(f, `${OUT}/${k}.webp`, 1280, 76);
}
