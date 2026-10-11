'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CALL OF DUTY: SEC OPS — core: constants, math, deterministic noise, text,
//  and the post-processing stack. Everything is a pure function of time `t`,
//  so any frame can be rendered in any order (real-time or offline).
// ─────────────────────────────────────────────────────────────────────────────

const W = 1920, H = 1080, FPS = 30, DURATION = 29.5;
const TAU = Math.PI * 2;

const C = {
  ink: '#060708', night: '#0a0c0e', bone: '#ece6d6', dim: '#8d8a80',
  red: '#ff2b1c', blood: '#a80f08', cyan: '#5fe6ff', amber: '#ffb21e',
  green: '#27ff8a', emerald: '#00a862', paper: '#ebe4d3', verm: '#e0321c',
  steel: '#7c858c', eye: '#ffb43a', amzBlue: '#1f8fff', amzYellow: '#ffd21f',
};

const FONT = {
  anton: '"Anton"', ops: '"Black Ops One"', elite: '"Special Elite"',
  vt: '"VT323"', mono: '"Share Tech Mono"', russo: '"Russo One"',
  kufi: '"Reem Kufi"', tif: '"Noto Sans Tifinagh"', amz: '"Noto Sans Tifinagh", "Reem Kufi", "Share Tech Mono"', brush: '"Yuji Boku"',
  mich: '"Michroma"', bebas: '"Bebas Neue"', oswald: '"Oswald"',
};

// Global clock for the frame being drawn (set by renderFrame).
let T = 0, FRAME = 0;
let BLOOM = 1; // scenes may lower this (bright paper backgrounds)

// ── math ─────────────────────────────────────────────────────────────────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (a, b, x) => clamp((x - a) / (b - a));
const E = {
  outExpo: x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: x => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inCubic: x => x * x * x,
  inOutCubic: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outBack: x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  outQuint: x => 1 - Math.pow(1 - x, 5),
};
// animate-in helper: eased progress of [start, start+dur]
const ap = (lt, start, dur = 0.25, fn = E.outExpo) => fn(prog(start, start + dur, lt));

function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }
function hash2(a, b) { return hash(a * 57.13 + b * 113.71); }
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u); }
function rng(seed) {
  let a = (Math.floor(seed * 9973) ^ 0x9e3779b9) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// ── text ─────────────────────────────────────────────────────────────────────
function setFont(c, size, font = FONT.anton, ls = 0, weight = '') {
  c.font = `${weight} ${size}px ${font}`;
  c.letterSpacing = ls + 'px';
}
function txt(c, s, x, y, o = {}) {
  c.save();
  setFont(c, o.size || 40, o.font || FONT.anton, o.ls || 0, o.weight || '');
  c.textAlign = o.align || 'left';
  c.textBaseline = o.base || 'alphabetic';
  if (o.alpha !== undefined) c.globalAlpha *= o.alpha;
  if (o.stroke) { c.strokeStyle = o.stroke; c.lineWidth = o.lw || 2; c.lineJoin = 'round'; c.strokeText(s, x, y); }
  if (o.color !== null) { c.fillStyle = o.color || C.bone; c.fillText(s, x, y); }
  c.restore();
}
function tw(c, s, size, font = FONT.anton, ls = 0) {
  c.save(); setFont(c, size, font, ls); const w = c.measureText(s).width; c.restore(); return w;
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@<>/\\|=+*?!';
// Decode effect: real characters lead, a band of `span` random glyphs trails.
function scramble(s, p, seed = 0, span = 5) {
  const n = s.length;
  const vis = Math.ceil(clamp(p) * (n + span));
  const real = vis - span;
  let out = '';
  for (let i = 0; i < Math.min(vis, n); i++) {
    const ch = s[i];
    if (i < real || ch === ' ') out += ch;
    else out += GLYPHS[Math.floor(hash(i * 7.1 + seed * 3.3 + Math.floor(FRAME / 2) * 1.37) * GLYPHS.length)];
  }
  return out;
}
const typed = (s, p) => s.slice(0, Math.floor(clamp(p) * s.length));
const cursor = (rate = 4) => (Math.floor(T * rate) % 2 === 0 ? '█' : ' ');

// Block-reveal: an accent bar sweeps in, then retracts to uncover the text.
function blockReveal(c, s, x, y, size, font, color, barColor, k, o = {}) {
  const w = tw(c, s, size, font, o.ls || 0) + 16;
  const top = y - size * (o.capH || 0.8), h = size * (o.barH || 0.92);
  if (k <= 0) return w;
  if (k >= 0.5) {
    c.save();
    c.beginPath(); c.rect(x - 4, top - 40, w + 8, h + 80); c.clip();
    txt(c, s, x, y, { size, font, color, ls: o.ls || 0, alpha: o.alpha });
    c.restore();
  }
  const a = k < 0.5 ? 0 : E.inOutCubic((k - 0.5) * 2);
  const b = k < 0.5 ? E.inOutCubic(k * 2) : 1;
  if (b - a > 0.001) { c.fillStyle = barColor; c.fillRect(x + a * w, top, (b - a) * w, h); }
  return w;
}

// ── cues (shared with the score — see audio/score.py) ───────────────────────
// [time, duration, amount]
const CUE = {
  glitch: [
    [0.0, 0.32, 0.7], [3.5, 0.18, 0.8], [6.45, 0.1, 0.6], [12.5, 0.45, 1.0], [13.4, 0.12, 0.5],
    [14.45, 0.15, 0.8], [17.0, 0.12, 0.5], [17.5, 0.2, 0.9], [18.0, 1.0, 0.28], [18.75, 0.25, 1],
    [19.95, 0.12, 0.9], [20.95, 0.12, 0.9], [22.0, 0.08, 0.6], [23.0, 0.15, 1], [23.6, 1.0, 0.6],
    [24.4, 0.15, 1], [25.6, 0.5, 1.0], [27.2, 0.08, 0.6], [29.1, 0.4, 1],
  ],
  shake: [
    [3.0, 0.3, 10], [4.5, 0.4, 16], [6.68, 0.45, 42], [7.4, 0.3, 14], [8.5, 0.5, 14], [10.5, 0.3, 10],
    [12.5, 0.3, 12], [17.0, 0.25, 18], [17.25, 0.25, 18], [17.5, 0.5, 30], [18.0, 1.0, 10],
    [19.0, 1.0, 14], [20.0, 0.3, 14], [21.0, 2.0, 7], [23.0, 1.5, 22], [24.4, 0.2, 40], [25.6, 0.7, 30],
  ],
  // [time, duration, strength, color]
  flash: [
    [4.45, 0.25, 1, '#e8fbff'], [4.5, 0.18, 0.7, C.cyan], [4.58, 0.08, 0.6, '#ffffff'], [6.68, 0.2, 0.55, C.red],
    [8.5, 0.06, 0.8, C.amber], [8.625, 0.06, 0.8, C.amber], [8.75, 0.06, 0.8, C.amber],
    [10.5, 0.14, 1, '#ffffff'], [12.5, 0.08, 0.6, C.green], [17.5, 0.12, 0.6, C.red],
    [24.45, 0.35, 1, '#ffffff'], [25.6, 0.3, 0.8, '#ffffff'],
  ],
  invert: [6.68, 10.5, 17.5, 20.0, 23.0, 25.6],
};
function env(list, t) {
  let v = 0;
  for (const [t0, d, a] of list) if (t >= t0 && t < t0 + d) v = Math.max(v, a * (1 - (t - t0) / d));
  return v;
}

// ── post-processing ──────────────────────────────────────────────────────────
const POST = {};
function initPost(outCanvas) {
  POST.o = outCanvas.getContext('2d');
  POST.tmp = mk(W, H); POST.tg = POST.tmp.getContext('2d');
  POST.chan = [0, 1, 2].map(() => { const c = mk(W, H); return { c, g: c.getContext('2d') }; });
  POST.bA = mk(W / 4, H / 4); POST.bAg = POST.bA.getContext('2d');
  POST.bB = mk(W / 16, H / 16); POST.bBg = POST.bB.getContext('2d');
  // grain tiles
  POST.grain = [];
  for (let k = 0; k < 6; k++) {
    const c = mk(256, 256), x = c.getContext('2d'), img = x.createImageData(256, 256), r = rng(k + 1);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(128 + (r() + r() + r() - 1.5) * 120);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0); POST.grain.push(c);
  }
  // scanlines
  const sl = mk(4, 4), sx = sl.getContext('2d');
  sx.fillStyle = '#fff'; sx.fillRect(0, 0, 4, 4); sx.fillStyle = '#6a6a6a'; sx.fillRect(0, 3, 4, 1);
  POST.scan = POST.o.createPattern(sl, 'repeat');
  // vignette
  POST.vig = mk(W, H);
  const vg = POST.vig.getContext('2d');
  const grd = vg.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.85)');
  vg.fillStyle = grd; vg.fillRect(0, 0, W, H);
}

function rgbSplit(src, dx, dy) {
  const o = POST.o, cols = ['#ff0000', '#00ff00', '#0000ff'], off = [[-dx, -dy], [0, 0], [dx, dy]];
  o.fillStyle = '#000'; o.fillRect(0, 0, W, H);
  for (let k = 0; k < 3; k++) {
    const { g } = POST.chan[k];
    g.globalCompositeOperation = 'source-over'; g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = cols[k]; g.fillRect(0, 0, W, H);
  }
  o.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) o.drawImage(POST.chan[k].c, off[k][0], off[k][1]);
  o.globalCompositeOperation = 'source-over';
}

function post(scene, t) {
  const o = POST.o;
  o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.globalCompositeOperation = 'source-over'; o.filter = 'none';

  // shake (applied as a camera move on the finished scene)
  const sh = env(CUE.shake, t);
  const sxv = (noise1(t * 37) - 0.5) * 2 * sh, syv = (noise1(t * 41 + 9) - 0.5) * 2 * sh;
  const zoom = 1 + sh * 0.0016;
  const gl = env(CUE.glitch, t);
  let src = scene;
  if (sh > 0.01) {
    POST.tg.setTransform(1, 0, 0, 1, 0, 0);
    POST.tg.fillStyle = '#000'; POST.tg.fillRect(0, 0, W, H);
    POST.tg.setTransform(zoom, 0, 0, zoom, W / 2 * (1 - zoom) + sxv, H / 2 * (1 - zoom) + syv);
    POST.tg.drawImage(scene, 0, 0);
    POST.tg.setTransform(1, 0, 0, 1, 0, 0);
    src = POST.tmp;
  }
  // chromatic split: always a hair, a lot when glitching
  const ca = 1.2 + gl * 26 * (0.4 + hash(FRAME * 3.1));
  rgbSplit(src, ca, gl > 0.3 ? (hash(FRAME) - 0.5) * gl * 10 : 0);

  // slice displacement
  if (gl > 0.05) {
    POST.tg.setTransform(1, 0, 0, 1, 0, 0); POST.tg.drawImage(POST.o.canvas, 0, 0);
    const n = Math.floor(4 + gl * 14), r = rng(FRAME * 13.7 + 1);
    for (let i = 0; i < n; i++) {
      const y = Math.floor(r() * H), h = Math.floor(4 + r() * r() * 160 * gl);
      const dx = (r() - 0.5) * 2 * gl * 220;
      o.drawImage(POST.tmp, 0, y, W, h, dx, y, W, h);
      if (r() < 0.25 * gl) { o.globalCompositeOperation = 'difference'; o.fillStyle = r() < 0.5 ? '#ff2b1c' : '#27ff8a'; o.globalAlpha = 0.5; o.fillRect(0, y, W, h * 0.4); o.globalAlpha = 1; o.globalCompositeOperation = 'source-over'; }
    }
    // blocky macro-glitch
    if (gl > 0.5) {
      for (let i = 0; i < 6; i++) {
        const bw = 60 + r() * 300, bh = 20 + r() * 90, bx = r() * W, by = r() * H;
        o.drawImage(POST.tmp, bx, by, bw, bh, bx + (r() - 0.5) * 140, by + (r() - 0.5) * 30, bw, bh);
      }
    }
  }

  // bloom — two radii, thresholded with contrast
  const bA = POST.bAg, bB = POST.bBg;
  bA.filter = 'brightness(0.85) contrast(2.6) blur(5px)';
  bA.clearRect(0, 0, W / 4, H / 4); bA.drawImage(o.canvas, 0, 0, W / 4, H / 4);
  bB.filter = 'blur(3px)';
  bB.clearRect(0, 0, W / 16, H / 16); bB.drawImage(POST.bA, 0, 0, W / 16, H / 16);
  o.globalCompositeOperation = 'screen';
  o.globalAlpha = 0.55 * BLOOM; o.drawImage(POST.bA, 0, 0, W, H);
  o.globalAlpha = 0.6 * BLOOM; o.drawImage(POST.bB, 0, 0, W, H);
  o.globalAlpha = 1;

  // grain
  o.globalCompositeOperation = 'overlay';
  o.globalAlpha = 0.14;
  const gt = POST.grain[FRAME % POST.grain.length], gx = Math.floor(hash(FRAME) * 256), gy = Math.floor(hash(FRAME + 7) * 256);
  for (let y = -gy; y < H; y += 512) for (let x = -gx; x < W; x += 512) o.drawImage(gt, x, y, 512, 512);
  o.globalAlpha = 1;

  // scanlines + vignette
  o.globalCompositeOperation = 'multiply';
  o.globalAlpha = 0.45; o.fillStyle = POST.scan; o.fillRect(0, 0, W, H);
  o.globalAlpha = 1; o.globalCompositeOperation = 'source-over';
  o.drawImage(POST.vig, 0, 0);

  // flashes
  for (const [t0, d, a, col] of CUE.flash) {
    if (t >= t0 && t < t0 + d) {
      o.globalCompositeOperation = 'screen'; o.globalAlpha = a * Math.pow(1 - (t - t0) / d, 1.5);
      o.fillStyle = col; o.fillRect(0, 0, W, H);
    }
  }
  o.globalAlpha = 1;
  // impact frame: one-frame invert
  for (const ti of CUE.invert) if (t >= ti && t < ti + 1 / FPS) {
    o.globalCompositeOperation = 'difference'; o.fillStyle = '#fff'; o.fillRect(0, 0, W, H);
  }
  o.globalCompositeOperation = 'source-over';

  crtMask(o, t);
}

// CRT power on (0s) / power off (24.5s) / final cut
function crtMask(o, t) {
  const box = (w, h, glow) => {
    o.fillStyle = '#000';
    o.fillRect(0, 0, W, (H - h) / 2); o.fillRect(0, (H + h) / 2, W, (H - h) / 2 + 1);
    o.fillRect(0, 0, (W - w) / 2, H); o.fillRect((W + w) / 2, 0, (W - w) / 2 + 1, H);
    if (glow > 0) {
      o.globalCompositeOperation = 'lighter';
      o.globalAlpha = glow; o.fillStyle = '#dff6ff';
      o.fillRect((W - w) / 2, (H - h) / 2, w, Math.max(h, 2));
      o.globalAlpha = 1; o.globalCompositeOperation = 'source-over';
    }
  };
  if (t < 0.32) {
    const a = E.outExpo(prog(0, 0.14, t)), b = E.outExpo(prog(0.12, 0.32, t));
    box(Math.max(4, a * W), Math.max(3, b * H), 1 - b);
  } else if (t >= 24.55 && t < 25.0) {
    const a = E.inExpo(prog(24.55, 24.72, t)), b = E.inExpo(prog(24.68, 24.85, t));
    const h = Math.max(3, (1 - a) * H), w = Math.max(6, (1 - b) * W);
    if (t > 24.88) { o.fillStyle = '#000'; o.fillRect(0, 0, W, H); const k = 1 - prog(24.88, 25.0, t); o.fillStyle = `rgba(220,245,255,${k})`; o.beginPath(); o.arc(W / 2, H / 2, 6 * k + 1, 0, TAU); o.fill(); }
    else box(w, h, a * 0.9);
  } else if (t >= DURATION - 0.12) {
    o.fillStyle = '#000'; o.fillRect(0, 0, W, H);
  }
}
