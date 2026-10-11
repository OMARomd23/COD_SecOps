// Offline renderer for the film.
//   node tools/render.mjs stills 0.6 5.3 …   → out/stills/t_XX.XX.jpg
//   node tools/render.mjs video [--from 0 --to 29.5]  → out/frames.mkv (no audio)
// Frames are deterministic functions of t, so this is exact at 30 fps
// regardless of how long each frame takes to draw.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILM = join(ROOT, 'film');
const OUT = join(ROOT, 'out');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg' };

const server = createServer(async (req, res) => {
  try {
    const p = join(FILM, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(FILM)) throw new Error('nope');
    const body = await readFile(p.endsWith('/') ? join(p, 'index.html') : p);
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html?render`;

const args = process.argv.slice(2);
const mode = args.shift() || 'stills';
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? parseFloat(args[i + 1]) : d; };

const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto(url);
await page.evaluate(() => window.FILM.ready);
const { FPS, DURATION } = await page.evaluate(() => ({ FPS: window.FILM.FPS, DURATION: window.FILM.DURATION }));

const grab = (t, q) => page.evaluate(([t, q]) => {
  window.FILM.renderFrame(t);
  return document.getElementById('out').toDataURL('image/jpeg', q);
}, [t, q]);

if (mode === 'stills') {
  await mkdir(join(OUT, 'stills'), { recursive: true });
  for (const a of args) {
    const t = parseFloat(a);
    const data = await grab(t, 0.9);
    const f = join(OUT, 'stills', `t_${t.toFixed(2)}.jpg`);
    await writeFile(f, Buffer.from(data.split(',')[1], 'base64'));
    console.log(f);
  }
} else {
  await mkdir(OUT, { recursive: true });
  const from = opt('--from', 0), to = opt('--to', DURATION);
  const n0 = Math.round(from * FPS), n1 = Math.round(to * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'mjpeg', '-q:v', '1', join(OUT, 'frames.mkv')], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let n = n0; n < n1; n++) {
    const data = await grab(n / FPS, 0.97);
    if (!ff.stdin.write(Buffer.from(data.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (n % 30 === 0) process.stdout.write(`\rframe ${n}/${n1}  ${((Date.now() - t0) / (n - n0 + 1)).toFixed(0)}ms/f   `);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log(`\nwrote ${join(OUT, 'frames.mkv')}`);
}
await browser.close();
server.close();
