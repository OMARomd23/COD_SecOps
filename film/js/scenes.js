'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Scenes. Tempo is 120 BPM → one beat = 0.5s, one bar = 2s. Cuts land on it.
//
//   0.0  cold open — the joke, slammed line by line
//   3.5  blast door
//   4.5  five entrances, one bar each
//  14.5  the scan: the facility is wide open
//  17.0  EVERYTHING IS VULNERABLE → containment breach
//  19.0  they fight the horror / he hacks it
//  21.0  CCTV wall — every system flips to green
//  23.0  patch everything → CRT off
//  25.6  CALL OF DUTY: SEC OPS
// ─────────────────────────────────────────────────────────────────────────────

let g; // scene context (set by main)

function bg(col) { g.fillStyle = col; g.fillRect(0, 0, W, H); }

function hud(c, left, right, col = C.bone, a = 0.55) {
  txt(c, left, 70, 64, { size: 20, font: FONT.mono, color: col, ls: 4, alpha: a });
  txt(c, right, W - 70, 64, { size: 20, font: FONT.mono, color: col, ls: 4, alpha: a, align: 'right' });
}
function recDot(c, x, y, col = C.red) {
  if (Math.floor(T * 2) % 2 === 0) { c.fillStyle = col; c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill(); }
}
function timecode(t) {
  const f = Math.floor(t * 24) % 24, s = Math.floor(t) % 60;
  return `03:15:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// 1 · COLD OPEN (0 – 3.5)
// ═════════════════════════════════════════════════════════════════════════════
const JOKE = [
  ['A ', 'GERMAN', ' SCIENTIST,', C.cyan],
  ['A ', 'RUSSIAN', ' SOLDIER,', C.red],
  ['AN ', 'AMERICAN', ' SOLDIER,', C.amber],
  ['A ', 'JAPANESE', ' WARRIOR', C.verm],
  ['AND A ', 'MOROCCAN', ' HACKER', C.green],
];
function sceneOpen(t) {
  bg('#050607');
  const push = 1 + t * 0.012;
  g.save(); g.translate(W / 2, H / 2); g.scale(push, push); g.translate(-W / 2, -H / 2);

  // faint phosphor grid
  g.strokeStyle = 'rgba(120,255,190,0.05)'; g.lineWidth = 1; g.beginPath();
  for (let x = 0; x < W; x += 60) { g.moveTo(x, 0); g.lineTo(x, H); }
  for (let y = 0; y < H; y += 60) { g.moveTo(0, y); g.lineTo(W, y); }
  g.stroke();

  hud(g, 'ARCHIV 115 — STRENG GEHEIM — TELETYPE', '14·IX·1945  ' + timecode(t), C.bone, 0.6);
  recDot(g, W - 470, 57);

  // hex dump column (right)
  g.save(); g.beginPath(); g.rect(1440, 130, 420, 760); g.clip();
  const scroll = t * 260;
  for (let i = 0; i < 40; i++) {
    const y = 150 + i * 26 - (scroll % 26);
    const row = Math.floor(scroll / 26) + i;
    let s = (row * 16).toString(16).toUpperCase().padStart(6, '0') + '  ';
    for (let k = 0; k < 8; k++) s += Math.floor(hash(row * 9.1 + k) * 256).toString(16).toUpperCase().padStart(2, '0') + ' ';
    txt(g, s, 1450, y, { size: 19, font: FONT.mono, color: hash(row) > 0.93 ? C.red : '#5d8f74', alpha: 0.55 });
  }
  g.restore();
  txt(g, 'DECRYPTING… ' + Math.min(100, Math.floor(t / 3 * 100)) + '%', 1450, 920, { size: 22, font: FONT.mono, color: C.green, ls: 3 });

  // the joke — one line per beat
  const x0 = 150, y0 = 245, LH = 128, SZ = 116;
  JOKE.forEach(([a, word, b, col], i) => {
    const ti = 0.5 + i * 0.5;
    if (t < ti) return;
    const k = ap(t, ti, 0.2);
    const s = lerp(1.35, 1, k);
    const y = y0 + i * LH;
    const later = t > ti + 0.5;
    g.save(); g.translate(x0, y); g.scale(s, s); g.globalAlpha = k;
    txt(g, String(i + 1).padStart(2, '0'), -78, -60, { size: 22, font: FONT.mono, color: col, ls: 2 });
    const wa = tw(g, a, SZ), ww = tw(g, word, SZ);
    txt(g, a, 0, 0, { size: SZ, color: C.bone, alpha: later ? 0.45 : 1 });
    const wordS = scramble(word, prog(ti, ti + 0.22, t), i + 1, 3);
    if (!later) { g.fillStyle = col; g.fillRect(wa - 6, -SZ * 0.86, ww + 12, SZ * 0.95); }
    txt(g, wordS, wa, 0, { size: SZ, color: later ? col : '#060708' });
    txt(g, b, wa + ww, 0, { size: SZ, color: C.bone, alpha: later ? 0.45 : 1 });
    g.restore();
  });

  // punchline bar
  if (t >= 3.0) {
    const k = ap(t, 3.0, 0.16);
    g.fillStyle = C.red; g.fillRect(0, 880, W * k, 130);
    g.save(); g.beginPath(); g.rect(0, 880, W * k, 130); g.clip();
    txt(g, 'WALK INTO A SECRET UNDERGROUND BUNKER.', 150, 985, { size: 104, color: '#060708' });
    g.restore();
  }
  g.restore();
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · BLAST DOOR (3.5 – 4.5)
// ═════════════════════════════════════════════════════════════════════════════
function doorFace(c, R, wheelA, lt) {
  // body
  const gr = c.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.1, 0, 0, R);
  gr.addColorStop(0, '#3a3f43'); gr.addColorStop(0.6, '#1d2023'); gr.addColorStop(1, '#0d0f10');
  c.fillStyle = gr; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
  c.strokeStyle = '#4c5257'; c.lineWidth = 6;
  for (const k of [0.98, 0.8, 0.52, 0.3]) { c.beginPath(); c.arc(0, 0, R * k, 0, TAU); c.stroke(); }
  // bolts
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * TAU, x = Math.cos(a) * R * 0.89, y = Math.sin(a) * R * 0.89;
    c.fillStyle = '#5b6166'; c.beginPath(); c.arc(x, y, 13, 0, TAU); c.fill();
    c.fillStyle = '#16191b'; c.beginPath(); c.arc(x + 2, y + 2, 6, 0, TAU); c.fill();
  }
  // stencil ring text
  const s = ' BUNKER 115 • ZUTRITT VERBOTEN • KEEP OUT • ВХОД ВОСПРЕЩЁН • 立入禁止 •';
  c.save(); setFont(c, 34, FONT.ops); c.fillStyle = '#c9b88a'; c.textAlign = 'center';
  for (let i = 0; i < s.length; i++) {
    c.save(); c.rotate(-Math.PI / 2 + i / s.length * TAU + lt * 0.15); c.translate(0, -R * 0.66); c.fillText(s[i], 0, 12); c.restore();
  }
  c.restore();
  // hazard ring
  c.save(); c.beginPath(); c.arc(0, 0, R * 0.5, 0, TAU); c.arc(0, 0, R * 0.42, 0, TAU, true); c.clip();
  for (let i = 0; i < 24; i++) { c.fillStyle = i % 2 ? '#e3b800' : '#111'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R * 0.5, i / 24 * TAU, (i + 1) / 24 * TAU); c.fill(); }
  c.restore();
  // wheel
  c.save(); c.rotate(wheelA);
  c.strokeStyle = '#8b9196'; c.lineWidth = 26; c.lineCap = 'round';
  c.beginPath(); c.arc(0, 0, R * 0.34, 0, TAU); c.stroke();
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * R * 0.34, Math.sin(a) * R * 0.34); c.stroke(); }
  c.fillStyle = '#a9aeb2'; c.beginPath(); c.arc(0, 0, 44, 0, TAU); c.fill();
  c.fillStyle = C.red; star5(c, 0, 0, 26); c.fill();
  c.restore();
}
function sceneDoor(t) {
  const lt = t - 3.5;
  bg('#0b0c0d');
  // concrete wall texture: big soft blocks
  for (let i = 0; i < 12; i++) {
    g.fillStyle = `rgba(255,255,255,${0.012 + hash(i) * 0.02})`;
    g.fillRect(hash(i + 1) * W, hash(i + 2) * H, 300 + hash(i + 3) * 500, 2 + hash(i + 4) * 4);
  }
  const split = E.inCubic(prog(0.56, 1.0, lt));
  const zoom = lerp(1.18, 1, E.outExpo(prog(0, 0.35, lt))) * (1 + split * 0.5);
  const wheel = E.inOutCubic(prog(0.05, 0.55, lt)) * Math.PI * 1.6;
  const R = 440 * zoom;
  // light behind the gap
  if (split > 0) {
    const gap = split * 900;
    const lg = g.createLinearGradient(W / 2 - gap, 0, W / 2 + gap, 0);
    lg.addColorStop(0, 'rgba(160,240,255,0)'); lg.addColorStop(0.5, `rgba(225,250,255,${0.6 + split * 0.4})`); lg.addColorStop(1, 'rgba(160,240,255,0)');
    g.fillStyle = lg; g.fillRect(W / 2 - gap, 0, gap * 2, H);
  }
  for (const side of [-1, 1]) {
    g.save();
    g.translate(side * split * 1000, 0);
    g.beginPath(); side < 0 ? g.rect(0, 0, W / 2, H) : g.rect(W / 2, 0, W / 2, H); g.clip();
    g.translate(W / 2, H / 2);
    doorFace(g, R, wheel, lt);
    g.restore();
  }
  // dust streaming out of the crack
  if (split > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) {
      const r = rng(i + 5), sp = 200 + r() * 1400;
      const x = W / 2 + (r() - 0.5) * split * 600 + (r() - 0.5) * sp * split;
      const y = r() * H;
      g.fillStyle = `rgba(200,240,255,${0.5 * r()})`; g.fillRect(x, y, 2 + r() * 3, 2 + r() * 3);
    }
    g.restore();
  }
  // hazard bars + warning lamp
  hazard(g, 0, 0, W, 54, lt * 300); hazard(g, 0, H - 54, W, 54, -lt * 300);
  const beam = lt * 9;
  g.save(); g.globalCompositeOperation = 'lighter';
  const bx = W / 2, by = 54;
  const lgr = g.createRadialGradient(bx, by, 0, bx, by, 900);
  lgr.addColorStop(0, 'rgba(255,40,20,0.55)'); lgr.addColorStop(1, 'rgba(255,40,20,0)');
  g.fillStyle = lgr; g.beginPath(); g.moveTo(bx, by); g.arc(bx, by, 900, beam, beam + 0.5); g.fill();
  g.beginPath(); g.moveTo(bx, by); g.arc(bx, by, 900, beam + Math.PI, beam + Math.PI + 0.5); g.fill();
  g.restore();
  txt(g, 'ZUGANG GEWÄHRT', W / 2, H - 90, { size: 30, font: FONT.ops, color: C.bone, align: 'center', ls: 14, alpha: lt > 0.5 ? 1 : 0 });
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · THE ENTRANCES (4.5 – 14.5) — one bar each
// ═════════════════════════════════════════════════════════════════════════════
const CAST = [
  {
    key: 'german', accent: C.cyan, nat: 'DEUTSCHLAND', natFont: FONT.mono, code: 'CODENAME: TESLA',
    first: 'DR. KLAUS', last: 'VOLKMAR', role: 'ELEMENT 115 RESEARCH // TELEPORTATION',
    stats: [['INTELLECT', 0.99, '99'], ['SANITY', 0.04, '04'], ['ETHICS', -1, 'REDACTED']],
    quote: '»Es funktioniert… meistens.«', trans: '"IT WORKS… MOSTLY."', quoteFont: FONT.elite,
    bgWord: 'ELEMENT 115', bgFont: FONT.anton, stamp: 'GEHEIM',
  },
  {
    key: 'russian', accent: C.red, nat: 'СОВЕТСКИЙ СОЮЗ', natFont: FONT.russo, code: 'CODENAME: MEDVED',
    first: 'SGT. DMITRI', last: 'ORLOV', role: 'RED ARMY // 3RD SHOCK — DEMOLITIONS',
    stats: [['STRENGTH', 0.98, '98'], ['VODKA', 1, '100'], ['PATIENCE', 0.01, '01']],
    quote: '«Я разберусь лопатой.»', trans: '"I WILL HANDLE IT WITH A SHOVEL."', quoteFont: FONT.russo,
    bgWord: 'МЕДВЕДЬ', bgFont: FONT.russo, stamp: 'СЕКРЕТНО',
  },
  {
    key: 'american', accent: C.amber, nat: 'UNITED STATES ARMY', natFont: FONT.mono, code: 'CODENAME: TANK',
    first: 'CPL. JACK', last: 'MALONE', role: '1ST MARINE RAIDERS // POINT MAN',
    stats: [['AMMO', 1, '999'], ['FEAR', 0, '00'], ['PLANS', 0.02, '00']],
    quote: '"Shoot first. Shoot second. Keep shooting."', trans: '', quoteFont: FONT.elite,
    bgWord: 'GUNG HO', bgFont: FONT.ops, stamp: 'TOP SECRET',
  },
  {
    key: 'japanese', accent: C.verm, nat: '日本 · NIPPON', natFont: FONT.brush, code: 'CODENAME: KAGE',
    first: 'KENJI', last: 'HAYASHI', role: 'SWORDMASTER // LAST OF THE HAYASHI LINE',
    stats: [['HONOR', 1, '100'], ['BLADE', 1, '100'], ['MERCY', 0.12, '12']],
    quote: '「刃は語らない。」', trans: '"THE BLADE DOES NOT SPEAK."', quoteFont: FONT.brush,
    bgWord: '侍', bgFont: FONT.brush, stamp: '極秘', inverted: true,
  },
  {
    key: 'moroccan', accent: C.green, nat: 'ⴰⵎⴰⵣⵉⵖ · AMAZIGH · المغرب', natFont: FONT.amz, code: 'CODENAME: ZERO-DAY',
    first: 'LAARBI', last: '', script: 'ⵍⴰⵄⵔⴱⵉ', role: 'PENETRATION TESTER // ERA: ANOMALOUS',
    stats: [['ACCESS', 1.35, 'ROOT'], ['SLEEP', 0, '00'], ['CHILL', 1, '100']],
    quote: '«ⴰⵣⵓⵍ.»', trans: '"AZUL." — HELLO, IN TAMAZIGHT. HE SAYS IT TO EVERY SERVER HE OWNS.', quoteFont: FONT.tif,
    bgWord: 'ⵣ', bgFont: FONT.tif, stamp: 'ROOT',
  },
];

function cardBackground(ch, lt, ink, paper) {
  const inv = ch.inverted;
  bg(inv ? C.paper : '#08090b');
  if (inv) {
    // paper fibres
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(80,60,30,${0.03 + hash(i) * 0.04})`; g.fillRect(hash(i + 1) * W, hash(i + 2) * H, 2 + hash(i + 3) * 300, 1); }
  }
  // giant background word
  const big = ch.bgWord.length <= 2;
  g.save();
  const x = big ? 1180 - lt * 40 : W + 200 - lt * 260;
  txt(g, ch.bgWord, x, big ? 930 : 1010, {
    size: big ? 1100 : 420, font: ch.bgFont, align: big ? 'center' : 'right', color: null,
    stroke: inv ? 'rgba(20,16,12,0.13)' : ch.accent, lw: 3, alpha: inv ? 1 : 0.16,
  });
  g.restore();
}

function cardSlab(ch, lt) {
  const k = ap(lt, 0.02, 0.28);
  if (ch.inverted) {
    // hinomaru
    const R = 340 * E.outBack(prog(0.06, 0.4, lt));
    g.fillStyle = ch.accent; g.beginPath(); g.arc(1300, 470, Math.max(0, R), 0, TAU); g.fill();
    return;
  }
  const off = (1 - k) * -1200;
  g.save(); g.translate(0, off);
  g.fillStyle = ch.accent;
  g.beginPath(); g.moveTo(1030, 0); g.lineTo(1580, 0); g.lineTo(1380, H); g.lineTo(830, H); g.fill();
  if (ch.key === 'moroccan') {
    g.save(); g.beginPath(); g.moveTo(1030, 0); g.lineTo(1580, 0); g.lineTo(1380, H); g.lineTo(830, H); g.clip();
    zellige(g, 780, -20, 9, 12, 96, prog(0.1, 1.2, lt), '#003d22', 0.9, 4);
    g.restore();
  }
  // a second, thinner stripe
  g.fillStyle = C.bone; g.globalAlpha = 0.9;
  g.beginPath(); g.moveTo(1610, 0); g.lineTo(1640, 0); g.lineTo(1440, H); g.lineTo(1410, H); g.fill();
  g.restore();
  // halftone fade on the slab's left edge
  g.save(); g.fillStyle = '#08090b';
  for (let j = 0; j < 40; j++) for (let i = 0; i < 9; i++) {
    const y = j * 28, xe = lerp(1030, 830, y / H), r = (1 - i / 9) * 9;
    if (r > 0.5) { g.beginPath(); g.arc(xe + i * 22 + (j % 2) * 11, y + off, r, 0, TAU); g.fill(); }
  }
  g.restore();
}

function cardInfo(ch, lt, idx) {
  const inv = ch.inverted, ink = inv ? '#121010' : C.bone, acc = ch.accent;
  const X = 120;
  // index
  const k0 = ap(lt, 0.08, 0.3);
  g.save(); g.globalAlpha = k0; g.translate((1 - k0) * -60, 0);
  txt(g, '0' + (idx + 1), X, 175, { size: 96, color: acc });
  txt(g, '/05', X + 112, 175, { size: 30, font: FONT.mono, color: ink, alpha: 0.6 });
  g.fillStyle = ink; g.globalAlpha = 0.35 * k0; g.fillRect(X + 190, 165, 300 * k0, 2);
  g.restore();
  // nationality + codename
  txt(g, scramble(ch.nat, prog(0.1, 0.45, lt), idx), X, 232, { size: ch.natFont === FONT.mono ? 26 : 30, font: ch.natFont, color: acc, ls: ch.natFont === FONT.mono ? 6 : 2 });
  txt(g, typed(ch.code, prog(0.16, 0.45, lt)), X, 285, { size: 30, font: FONT.ops, color: ink, ls: 3, alpha: 0.85 });
  // name — block reveals
  const SZ = 150;
  if (!ch.last) { // a single name, set huge — with its Tifinagh spelling and the Amazigh colours
    blockReveal(g, ch.first, X, 560, 270, FONT.anton, acc, C.bone, prog(0.14, 0.55, lt));
    const fk = ap(lt, 0.4, 0.35);
    const fw = 560 * fk;
    [C.amzBlue, C.green, C.amzYellow].forEach((col, i) => { g.fillStyle = col; g.fillRect(X, 582 + i * 7, fw, 7); });
    if (fk > 0.3) {
      g.fillStyle = '#08090b'; g.beginPath(); g.arc(X + 280, 592, 26, 0, TAU); g.fill();
      txt(g, 'ⵣ', X + 280, 610, { size: 46, font: FONT.tif, color: C.red, align: 'center', alpha: fk });
    }
    txt(g, scramble(ch.script, prog(0.45, 0.8, lt), 9), X + 610, 612, { size: 74, font: FONT.tif, color: C.bone, alpha: 0.9 });
  } else {
  blockReveal(g, ch.first, X, 450, SZ, FONT.anton, ink, acc, prog(0.14, 0.5, lt));
  blockReveal(g, ch.last, X, 610, SZ, FONT.anton, ch.key === 'moroccan' ? acc : ink, inv ? '#121010' : C.bone, prog(0.22, 0.58, lt));
  }
  // role
  txt(g, typed(ch.role, prog(0.35, 0.7, lt)), X, ch.last ? 672 : 680, { size: 25, font: FONT.mono, color: ink, ls: 2, alpha: 0.85 });
  // stats
  ch.stats.forEach(([label, v, val], i) => {
    const y = 735 + i * 50, k = ap(lt, 0.45 + i * 0.09, 0.45);
    if (k <= 0) return;
    txt(g, label, X, y, { size: 22, font: FONT.mono, color: ink, ls: 3, alpha: 0.75 * k });
    const bx = X + 170, bw = 340;
    g.fillStyle = inv ? 'rgba(18,16,16,0.15)' : 'rgba(236,230,214,0.12)'; g.fillRect(bx, y - 16, bw, 14);
    if (v < 0) {
      g.fillStyle = ink; g.fillRect(bx, y - 22, bw * k, 26);
      txt(g, val, bx + 10, y - 2, { size: 18, font: FONT.mono, color: inv ? C.paper : '#08090b', ls: 6, alpha: k });
    } else {
      const fill = Math.min(v, 1) * k;
      g.fillStyle = acc; g.fillRect(bx, y - 16, bw * fill, 14);
      if (v > 1 && k > 0.6) { // overflow — the hacker breaks the scale
        const over = (v - 1) * bw * prog(0.6, 1, k);
        g.fillStyle = acc; g.fillRect(bx + bw, y - 16 + (hash(FRAME) - 0.5) * 6, over, 14);
        g.globalAlpha = 0.5; g.fillRect(bx + bw + over * 0.3, y - 26, over * 0.4, 4); g.globalAlpha = 1;
      }
      const num = /^\d+$/.test(val) ? String(Math.round(parseInt(val, 10) * k)).padStart(val.length, '0') : scramble(val, k, i);
      txt(g, num, bx + bw + (v > 1 ? 150 : 20), y, { size: 26, font: FONT.mono, color: v > 1 ? acc : ink, alpha: k });
    }
  });
  // quote
  const qk = prog(0.95, 1.4, lt);
  if (qk > 0) {
    txt(g, ch.quote, X, 945, { size: ch.quoteFont === FONT.tif ? 60 : 40, font: ch.quoteFont, color: ink, alpha: qk });
    if (ch.trans) txt(g, typed(ch.trans, prog(1.1, 1.5, lt)), X, 990, { size: ch.trans.length > 40 ? 18 : 21, font: FONT.mono, color: acc, ls: 3 });
  }
}

function cardStamp(ch, lt) {
  const k = prog(0.85, 0.97, lt);
  if (k <= 0) return;
  const s = lerp(2.6, 1, E.outCubic(k));
  g.save(); g.translate(ch.inverted ? 760 : 740, ch.inverted ? 230 : 196); g.rotate(-0.12); g.scale(s, s); g.globalAlpha = 0.9 * k;
  if (ch.inverted) {
    g.fillStyle = ch.accent; g.fillRect(-60, -110, 120, 220);
    txt(g, '極', 0, -18, { size: 92, font: FONT.brush, color: C.paper, align: 'center' });
    txt(g, '秘', 0, 86, { size: 92, font: FONT.brush, color: C.paper, align: 'center' });
  } else {
    const f = ch.key === 'russian' ? FONT.russo : FONT.ops;
    const w = tw(g, ch.stamp, 64, f, 6) + 50;
    g.strokeStyle = C.red; g.lineWidth = 7; g.strokeRect(-w / 2, -50, w, 96);
    g.lineWidth = 2; g.strokeRect(-w / 2 + 9, -41, w - 18, 78);
    txt(g, ch.stamp, 0, 23, { size: 64, font: f, color: C.red, align: 'center', ls: 6 });
  }
  g.restore();
}

function cardHud(ch, lt, idx) {
  const inv = ch.inverted, ink = inv ? '#121010' : C.bone;
  hud(g, `BUNKER 115 // ADMISSION LOG // SUBJECT 0${idx + 1}`, `IDENTITY ${lt > 0.7 ? 'VERIFIED' : 'SCANNING…'}`, ink, 0.6);
  barcode(g, W - 330, 82, 260, 22, idx + 3, ink);
  cropMarks(g, ink, 0.5);
  // bottom ticker
  const tick = '  ▌ DOSSIER ' + (ch.last || ch.first) + ' ▌ CLEARANCE: OMEGA ▌ STATUS: ' + (idx === 4 ? 'NOT IN ANY RECORD — ORIGIN UNKNOWN' : 'ACTIVE') + ' ▌ FILE 115-0' + (idx + 1) + ' ▌ DO NOT DUPLICATE ';
  txt(g, tick.repeat(3), 70 - (lt * 180) % 900, H - 52, { size: 18, font: FONT.mono, color: ink, ls: 3, alpha: 0.4 });
}

// per-character entrance effects
function fxGerman(lt) {
  // lightning strikes into the silhouette, then crawls on the name
  if (lt < 0.4) {
    const n = 3, a = 1 - prog(0.15, 0.4, lt);
    for (let i = 0; i < n; i++) bolt(g, 900 + i * 320 + hash(i) * 100, -20, 1260 + (i - 1) * 90, 420, FRAME * 3 + i, { width: 4, branches: 4, alpha: a });
  }
  if (lt > 0.12 && lt < 1.9 && Math.floor(lt * 15) % 3 !== 0) {
    const r = rng(Math.floor(lt * 15) + 31);
    for (let i = 0; i < 2; i++) {
      const x1 = 120 + r() * 640, y1 = 330 + r() * 280;
      bolt(g, x1, y1, x1 + (r() - 0.5) * 260, y1 + (r() - 0.5) * 140, FRAME + i * 7, { width: 1.6, detail: 5, alpha: 0.7 });
    }
    // arcs between hair tips
    bolt(g, 1130 + r() * 60, 200 + r() * 60, 1400 + r() * 60, 190 + r() * 60, FRAME * 5, { width: 1.4, detail: 6, alpha: 0.8 });
  }
}
function fxRussian(lt) {
  // impact cracks + dust after the slam
  const k = prog(0.18, 0.3, lt);
  if (k <= 0) return;
  g.save(); g.strokeStyle = '#000'; g.lineWidth = 4; g.globalAlpha = 0.7;
  const r = rng(17);
  for (let i = 0; i < 14; i++) {
    g.beginPath(); let x = 960 + (r() - 0.5) * 200, y = H; g.moveTo(x, y);
    const a = -Math.PI / 2 + (r() - 0.5) * 2.6;
    for (let s = 0; s < 6; s++) { x += Math.cos(a + (r() - 0.5)) * 70 * k; y += Math.sin(a + (r() - 0.5)) * 70 * k; g.lineTo(x, y); }
    g.stroke();
  }
  g.restore();
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) {
    const q = rng(i + 70), age = lt - 0.18, sp = 300 + q() * 900, ang = -Math.PI / 2 + (q() - 0.5) * 2.8;
    const x = 960 + Math.cos(ang) * sp * age, y = H + Math.sin(ang) * sp * age + 900 * age * age;
    g.fillStyle = `rgba(255,${120 + q() * 80},80,${clamp(1 - age * 1.2) * q()})`; g.fillRect(x, y, 3, 3);
  }
  g.restore();
}
function fxAmerican(lt) {
  // tracers and muzzle flares on 16ths
  for (let k = 0; k < 3; k++) {
    const tk = k * 0.125, a = 1 - prog(tk, tk + 0.07, lt);
    if (lt < tk || a <= 0) continue;
    const r = rng(k + 40), x = 300 + r() * 1300, y = 250 + r() * 500;
    g.save(); g.globalCompositeOperation = 'lighter'; g.translate(x, y); g.rotate(r() * TAU);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 260);
    gr.addColorStop(0, `rgba(255,250,220,${a})`); gr.addColorStop(0.2, `rgba(255,180,40,${0.8 * a})`); gr.addColorStop(1, 'rgba(255,90,0,0)');
    g.fillStyle = gr;
    g.beginPath(); for (let i = 0; i < 12; i++) { const rr = i % 2 ? 50 : 260 * (0.6 + r() * 0.4), aa = i / 12 * TAU; g.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } g.fill();
    g.restore();
  }
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const r = rng(i + 90), t0 = r() * 1.6, p = (lt - t0) / 0.18;
    if (p < 0 || p > 1) continue;
    const y = 120 + r() * 800, x = lerp(-300, W + 300, p);
    const lg = g.createLinearGradient(x - 420, y, x, y);
    lg.addColorStop(0, 'rgba(255,170,40,0)'); lg.addColorStop(1, 'rgba(255,230,160,0.95)');
    g.strokeStyle = lg; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 420, y + 20); g.lineTo(x, y); g.stroke();
  }
  // brass casings
  for (let i = 0; i < 16; i++) {
    const r = rng(i + 140), t0 = r() * 0.6, age = lt - t0;
    if (age < 0) continue;
    const x = 1500 + r() * 200 + age * (200 + r() * 300), y = 300 + r() * 100 - 500 * age + 1500 * age * age;
    if (y > H) continue;
    g.save(); g.translate(x, y); g.rotate(age * 20 + r() * 6); g.fillStyle = '#d7a640'; g.fillRect(-10, -4, 20, 8); g.restore();
  }
  g.restore();
}
function slashSplit(lt) {
  // the frame gets cut in two along the diagonal and slides apart, then heals
  const k = prog(0.06, 0.45, lt);
  if (k <= 0 || k >= 1) return;
  const off = Math.sin(k * Math.PI) * 70 * (1 - k * 0.5);
  const tmp = POST.tmp, tg = POST.tg;
  tg.setTransform(1, 0, 0, 1, 0, 0); tg.drawImage(g.canvas, 0, 0);
  const ax = -100, ay = H + 150, bx = W + 100, by = -150; // cut line
  const dx = (bx - ax), dy = (by - ay), L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  for (const side of [-1, 1]) {
    g.save(); g.beginPath();
    if (side < 0) { g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(-200, -200); } else { g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(W + 200, H + 200); }
    g.closePath(); g.clip();
    g.drawImage(tmp, ux * off * side, uy * off * side);
    g.restore();
  }
  g.strokeStyle = '#ffffff'; g.lineWidth = 6 * (1 - k); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
}
function fxJapanese(lt) {
  // the slash itself
  const k = prog(0, 0.07, lt);
  if (lt < 0.12) {
    g.save(); g.strokeStyle = '#fff'; g.lineWidth = 14; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-100, H + 150); g.lineTo(lerp(-100, W + 100, k), lerp(H + 150, -150, k)); g.stroke(); g.restore();
  }
  // ink splatter
  const r = rng(77);
  g.fillStyle = C.verm;
  for (let i = 0; i < 26; i++) {
    const t0 = 0.08 + r() * 0.1, age = lt - t0, along = r();
    if (age < 0) continue;
    const bx = lerp(-100, W + 100, along), by = lerp(H + 150, -150, along);
    const x = bx + (r() - 0.5) * 120 + age * 140, y = by + (r() - 0.5) * 120 + age * age * 300;
    const rr = 3 + r() * 12;
    g.globalAlpha = 0.85; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  // falling petals of paper ash
  for (let i = 0; i < 18; i++) {
    const q = rng(i + 300), x = q() * W + Math.sin(lt * 2 + i) * 40, y = (q() * H + lt * 160) % H;
    g.save(); g.translate(x, y); g.rotate(lt * 2 + i); g.fillStyle = 'rgba(224,50,28,0.55)'; g.fillRect(-6, -2, 12, 4); g.restore();
  }
}
function fxMoroccan(lt) {
  // data rain of Tifinagh / Arabic / hex down the right edge
  const chars = 'ⴰⴱⴳⴷⴹⴻⴼⴽⵀⵃⵄⵅⵇⵉⵊⵍⵎⵏⵓⵔⵕⵖⵙⵚⵛⵜⵟⵡⵢⵣⵥ0123456789ABCDEF';
  setFont(g, 22, FONT.tif); g.textAlign = 'center';
  for (let col = 0; col < 14; col++) {
    const x = 1660 + col * 18, speed = 300 + hash(col) * 500, len = 12;
    for (let i = 0; i < len; i++) {
      const y = ((lt * speed + hash(col + 3) * H) % (H + 300)) - i * 24;
      const ch = chars[Math.floor(hash(col * 31 + i + Math.floor(lt * 12)) * chars.length)];
      g.fillStyle = i === 0 ? '#d8ffe8' : `rgba(39,255,138,${0.7 * (1 - i / len)})`;
      g.fillText(ch, x, y);
    }
  }
  g.textAlign = 'left';
  // "ACCESS GRANTED" flash tags
  if (lt > 0.5 && lt < 1.9) {
    const r = rng(Math.floor(lt * 6) + 600);
    txt(g, '[+] ' + ['uid=0(root)', 'shell: /bin/sh', 'ssh: authenticated', 'priv: SYSTEM'][Math.floor(r() * 4)], 1420 + r() * 120, 140 + r() * 60, { size: 20, font: FONT.mono, color: C.green, ls: 2 });
  }
}
const FX = { german: fxGerman, russian: fxRussian, american: fxAmerican, japanese: fxJapanese, moroccan: fxMoroccan };

function sceneCard(t, idx) {
  const ch = CAST[idx], lt = t - (4.5 + idx * 2);
  // Russian: whole card drops in from above and lands at 0.18
  const drop = ch.key === 'russian' ? (1 - E.inCubic(prog(0, 0.18, lt))) * -H : 0;
  // American: card only visible in muzzle-flash strobes for the first 0.3s
  if (ch.key === 'american' && lt < 0.32) {
    const on = [0, 0.125, 0.25].some(tk => lt >= tk && lt < tk + 0.05);
    if (!on) { bg('#000'); fxAmerican(lt); return; }
  }
  if (ch.inverted) BLOOM = 0.12;
  if (drop < 0) bg(ch.accent); // the card falls onto red
  g.save(); g.translate(0, drop);
  cardBackground(ch, lt);
  cardSlab(ch, lt);
  // silhouette
  const sk = ap(lt, 0.04, 0.4);
  const s = lerp(1.1, 1, sk) * (1 + lt * 0.015);
  g.save(); g.globalAlpha = sk;
  bust(g, ch.key, 1290 + (1 - sk) * 80, H + 30, s, lt, ch.inverted
    ? { accent: ch.accent, base: '#0c0a09', ht: 0.18, halo: 0, rimOp: 'source-over', rimX: -10, rimY: 8 }
    : { accent: ch.accent, halo: ch.key === 'moroccan' ? 0.8 : 0.55 });
  g.restore();
  cardInfo(ch, lt, idx);
  cardStamp(ch, lt);
  cardHud(ch, lt, idx);
  FX[ch.key](lt);
  g.restore();
  if (ch.key === 'japanese') slashSplit(lt);
  // exit wipe in the next character's colour
  const nx = CAST[idx + 1];
  if (nx && lt > 1.88) {
    const k = E.inExpo(prog(1.88, 2.0, lt));
    g.fillStyle = nx.inverted ? C.paper : nx.accent;
    g.beginPath(); g.moveTo(W - k * (W + 400), 0); g.lineTo(W + 400, 0); g.lineTo(W, H); g.lineTo(W - k * (W + 400) - 400, H); g.fill();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · DISCOVERY (14.5 – 19.0)
// ═════════════════════════════════════════════════════════════════════════════
const NMAP = [
  'zero-day@bunker115:~$ nmap -sS -sV -p- 10.115.0.0/16',
  'Starting Nmap 7.95 ( https://nmap.org ) at 1945-09-14 03:15',
  'Nmap scan report for TELEPORTER-A (10.115.0.12)',
  'PORT      STATE  SERVICE    VERSION',
  '23/tcp    open   telnet     Tesla-Telnet 0.9b (NO AUTH)',
  '80/tcp    open   http       Kraftwerk httpd/1944',
  '115/tcp   open   teleport   TPX-1.1 (unsigned firmware)',
  '443/tcp   open   ssl        cert expired 1939-08-31',
  '935/tcp   open   wunder     WunderWaffe RemoteFire 2.0',
  '1945/udp  open   doors      DoorCtl (default creds)',
  '[!] CVE-1945-0115  teleporter auth bypass      CRIT 10.0',
  '[!] CVE-1944-0935  hard-coded password         CRIT  9.8',
  '[!] CVE-1943-0666  containment lock over telnet CRIT 10.0',
  '[!] CVE-1945-0004  mystery box rand() == 4     HIGH  8.1',
  '[!] CVE-1942-1337  perk machine SQL injection  HIGH  7.9',
  '[!] CVE-1945-2847  …',
];
function terminalFrame(c, x, y, w, h, title) {
  c.fillStyle = '#030805'; c.fillRect(x, y, w, h);
  c.strokeStyle = 'rgba(39,255,138,0.5)'; c.lineWidth = 2; c.strokeRect(x, y, w, h);
  c.fillStyle = 'rgba(39,255,138,0.12)'; c.fillRect(x, y, w, 40);
  txt(c, title, x + 18, y + 28, { size: 20, font: FONT.mono, color: C.green, ls: 3 });
}
function sceneScan(t) {
  const lt = t - 14.5;
  bg('#020403');
  // full-screen terminal, laptop glow
  const gr = g.createRadialGradient(W / 2, H * 1.2, 100, W / 2, H * 1.2, H * 1.3);
  gr.addColorStop(0, 'rgba(39,255,138,0.16)'); gr.addColorStop(1, 'rgba(39,255,138,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  terminalFrame(g, 120, 110, W - 240, H - 220, 'zero-day@bunker115 — ssh — 1945×1080');
  const lines = Math.floor(prog(0.12, 0.75, lt) * NMAP.length);
  const first = typed(NMAP[0], prog(0, 0.14, lt));
  txt(g, first + (lines === 0 ? cursor(8) : ''), 160, 205, { size: 36, font: FONT.vt, color: '#c8ffe0' });
  for (let i = 1; i <= lines; i++) {
    const s = NMAP[i]; if (!s) continue;
    const crit = s.startsWith('[!]');
    txt(g, s, 160, 205 + i * 46, { size: 36, font: FONT.vt, color: crit ? C.red : C.green, alpha: crit ? 1 : 0.85 });
  }
}

// facility blueprint
const ROOMS = [
  { id: 'SECURITY GRID', x: 860, y: 470, w: 200, h: 140, vuln: 'FIRMWARE 1943 — NEVER PATCHED' },
  { id: 'TELEPORTER A', x: 430, y: 200, w: 230, h: 170, vuln: 'AUTH: NONE', tele: true },
  { id: 'REACTOR 115', x: 840, y: 160, w: 240, h: 200, vuln: "PASSWORD: 'passwort'", core: true },
  { id: 'WUNDERWAFFE', x: 400, y: 520, w: 250, h: 160, vuln: 'REMOTE FIRE: ANYONE' },
  { id: 'MYSTERY BOX', x: 520, y: 780, w: 170, h: 120, vuln: 'rand() == 4 // FAIR DICE ROLL' },
  { id: 'CONTAINMENT', x: 1260, y: 480, w: 280, h: 230, vuln: 'CELL LOCKS: TELNET :23', cells: true },
  { id: 'TELEPORTER B', x: 1280, y: 190, w: 230, h: 170, vuln: 'TELEPORTS TO: ANYWHERE', tele: true },
];
const YOU = { x: 960, y: 900 };
function blueprint(c, t, k, hot) {
  // grid
  c.strokeStyle = 'rgba(95,230,255,0.07)'; c.lineWidth = 1; c.beginPath();
  for (let x = 0; x < W; x += 40) { c.moveTo(x, 0); c.lineTo(x, H); }
  for (let y = 0; y < H; y += 40) { c.moveTo(0, y); c.lineTo(W, y); }
  c.stroke();
  // corridors
  c.strokeStyle = 'rgba(95,230,255,0.35)'; c.lineWidth = 2; c.setLineDash([10, 8]); c.lineDashOffset = -t * 60;
  c.beginPath();
  const hub = ROOMS[0];
  for (const r of ROOMS.slice(1)) { c.moveTo(hub.x + hub.w / 2, hub.y + hub.h / 2); c.lineTo(r.x + r.w / 2, r.y + r.h / 2); }
  c.moveTo(YOU.x, YOU.y); c.lineTo(hub.x + hub.w / 2, hub.y + hub.h / 2);
  c.stroke(); c.setLineDash([]);
  // outer bunker wall
  c.strokeStyle = 'rgba(95,230,255,0.5)'; c.lineWidth = 3; c.strokeRect(340, 120, 1260, 840);
  // rooms
  ROOMS.forEach((r, i) => {
    const pop = hot[i];
    const col = pop > 0 ? C.red : C.cyan;
    c.fillStyle = pop > 0 ? `rgba(255,43,28,${0.1 + 0.12 * Math.sin(t * 20)})` : 'rgba(95,230,255,0.04)';
    c.fillRect(r.x, r.y, r.w, r.h);
    c.strokeStyle = col; c.lineWidth = 2; c.strokeRect(r.x, r.y, r.w, r.h);
    txt(c, r.id, r.x + 10, r.y + 26, { size: 18, font: FONT.mono, color: col, ls: 2 });
    if (r.tele) { c.strokeStyle = col; c.beginPath(); c.arc(r.x + r.w / 2, r.y + r.h / 2 + 15, 38 + Math.sin(t * 8) * 4, 0, TAU); c.stroke(); }
    if (r.core) { c.fillStyle = col; c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 12); c.beginPath(); c.arc(r.x + r.w / 2, r.y + r.h / 2 + 12, 34, 0, TAU); c.fill(); c.globalAlpha = 1; }
    if (r.cells) { for (let q = 0; q < 5; q++) { c.strokeStyle = col; c.strokeRect(r.x + 18 + q * 50, r.y + 70, 40, 130); for (let b = 1; b < 4; b++) { c.beginPath(); c.moveTo(r.x + 18 + q * 50 + b * 10, r.y + 70); c.lineTo(r.x + 18 + q * 50 + b * 10, r.y + 200); c.stroke(); } } }
  });
  // you are here
  c.fillStyle = C.green; c.beginPath(); c.arc(YOU.x, YOU.y, 12, 0, TAU); c.fill();
  c.strokeStyle = C.green; c.lineWidth = 2; c.beginPath(); c.arc(YOU.x, YOU.y, 22 + (t * 40) % 30, 0, TAU); c.stroke();
  txt(c, 'ZERO-DAY (YOU)', YOU.x + 30, YOU.y + 8, { size: 20, font: FONT.mono, color: C.green, ls: 2 });
}
function sceneMap(t) {
  const lt = t - 15.25;
  bg('#03070a');
  const hot = ROOMS.map((_, i) => prog(15.5 + i * 0.22, 15.6 + i * 0.22, t));
  g.save();
  const z = 1 + lt * 0.03; g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2 - 190, -H / 2);
  blueprint(g, t, 1, hot);
  // radar sweep from YOU
  const a = -Math.PI / 2 + lt * 5.2;
  g.save(); g.globalCompositeOperation = 'lighter';
  const sw = g.createRadialGradient(YOU.x, YOU.y, 0, YOU.x, YOU.y, 1100);
  sw.addColorStop(0, 'rgba(39,255,138,0.35)'); sw.addColorStop(1, 'rgba(39,255,138,0)');
  g.fillStyle = sw; g.beginPath(); g.moveTo(YOU.x, YOU.y); g.arc(YOU.x, YOU.y, 1100, a - 0.5, a); g.fill();
  g.restore();
  // vulnerability tags
  ROOMS.forEach((r, i) => {
    const k = hot[i]; if (k <= 0) return;
    const tx = r.x + r.w + 12, ty = r.y + 50 + (i % 2) * 40;
    const s = r.vuln, w = tw(g, s, 22, FONT.mono, 1) + 28;
    g.fillStyle = C.red; g.fillRect(tx, ty - 26, w * E.outExpo(k), 38);
    txt(g, scramble(s, k, i), tx + 12, ty, { size: 22, font: FONT.mono, color: '#090202', ls: 1 });
    txt(g, 'CRITICAL', tx, ty - 34, { size: 15, font: FONT.mono, color: C.red, ls: 4, alpha: k });
  });
  g.restore();
  // counter
  const n = Math.floor(2847 * E.inExpo(prog(15.4, 17.0, t)));
  txt(g, 'VULNERABILITIES', W - 80, 140, { size: 24, font: FONT.mono, color: C.red, align: 'right', ls: 6 });
  txt(g, String(n).padStart(4, '0'), W - 80, 290, { size: 150, color: C.red, align: 'right' });
  hud(g, 'BUNKER 115 // NETWORK MAP // 10.115.0.0/16', 'SCANNING ' + '▮'.repeat(Math.floor(lt * 8) % 12), C.cyan, 0.7);
}

const SYSTEMS = ['TELEPORTERS', 'WEAPONS', 'DOORS', 'POWER', 'CONTAINMENT', 'PERKS', 'RADIO', 'ELEVATORS', 'TURRETS'];
function sceneVuln(t) {
  const lt = t - 17.0;
  bg('#0a0101');
  // dim, red map behind
  g.save(); g.globalAlpha = 0.35;
  blueprint(g, t, 1, ROOMS.map(() => 1));
  g.restore();
  // marquee of systems
  for (let row = 0; row < 7; row++) {
    const dir = row % 2 ? 1 : -1, y = 120 + row * 150;
    let s = ''; for (let i = 0; i < 6; i++) s += SYSTEMS[(i + row * 2) % SYSTEMS.length] + ' ✕ ';
    txt(g, s, -300 + dir * lt * 900 + (row * 211) % 400, y, { size: 64, font: FONT.anton, color: C.red, alpha: 0.18, ls: 4 });
  }
  const words = [['EVERYTHING', 17.0, 300, 330], ['IS', 17.25, 220, 590], ['VULNERABLE.', 17.5, 300, 930]];
  for (const [w, ti, size, y] of words) {
    if (t < ti) continue;
    const k = ap(t, ti, 0.12), s = lerp(1.5, 1, k);
    g.save(); g.translate(W / 2, y); g.scale(s, s);
    if (w === 'VULNERABLE.') {
      const ww = tw(g, w, size) + 60;
      g.fillStyle = C.red; g.fillRect(-ww / 2, -size * 0.86, ww, size * 0.98);
      txt(g, w, 0, 0, { size, color: '#0a0101', align: 'center' });
    } else txt(g, w, 0, 0, { size, color: C.bone, align: 'center' });
    g.restore();
  }
}

function sceneAlarm(t) {
  const lt = t - 18.0;
  const strobe = Math.floor(lt * 8) % 2 === 0;
  bg(strobe ? '#2a0303' : '#0a0101');
  // rotating siren beams
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const [bx, ph] of [[300, 0], [W - 300, 1.4]]) {
    const a = lt * 9 + ph;
    const lgr = g.createRadialGradient(bx, 0, 0, bx, 0, 1400);
    lgr.addColorStop(0, 'rgba(255,40,20,0.6)'); lgr.addColorStop(1, 'rgba(255,40,20,0)');
    g.fillStyle = lgr; g.beginPath(); g.moveTo(bx, 0); g.arc(bx, 0, 1400, a, a + 0.35); g.fill();
    g.beginPath(); g.moveTo(bx, 0); g.arc(bx, 0, 1400, a + Math.PI, a + Math.PI + 0.35); g.fill();
  }
  g.restore();
  // containment cells — bars slide up, eyes wake
  const lift = E.inOutCubic(prog(0.35, 0.8, lt));
  for (let i = 0; i < 6; i++) {
    const x = 170 + i * 270, y = 330, w = 230, h = 470;
    g.fillStyle = '#050000'; g.fillRect(x, y, w, h);
    const ea = prog(0.3 + i * 0.05, 0.45 + i * 0.05, lt);
    zombie(g, x + w / 2, y + h + 40, 0.75, 500 + i, t, { eyes: ea, color: '#100605' });
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = '#5d6266';
    for (let b = 0; b < 7; b++) g.fillRect(x + 12 + b * 33, y - lift * h, 12, h);
    g.fillRect(x, y + h * 0.35 - lift * h, w, 14);
    g.restore();
    g.strokeStyle = '#2b2f32'; g.lineWidth = 10; g.strokeRect(x, y, w, h);
    txt(g, 'ZELLE ' + (i + 1), x + w / 2, y - 18, { size: 22, font: FONT.ops, color: C.bone, align: 'center', ls: 4, alpha: 0.7 });
  }
  hazard(g, 0, 150, W, 120, lt * 500, C.red, '#0a0101');
  g.fillStyle = '#0a0101'; g.fillRect(260, 165, W - 520, 90);
  txt(g, 'CONTAINMENT BREACH', W / 2, 240, { size: 84, color: C.red, align: 'center', ls: 10 });
  txt(g, 'ALARM — EINDÄMMUNG VERLOREN — ALLE SYSTEME KOMPROMITTIERT', W / 2, 900, { size: 30, font: FONT.ops, color: C.bone, align: 'center', ls: 6, alpha: strobe ? 1 : 0.5 });
  txt(g, 'root@containment:~# door --open ALL   # ← not us. someone else is in here.', W / 2, 960, { size: 24, font: FONT.mono, color: C.green, align: 'center', alpha: 0.85 });
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · CHAOS (19.0 – 24.9)
// ═════════════════════════════════════════════════════════════════════════════
function muzzleLight(t) {
  // gunfire on 8ths with a little swing
  const ph = (t * 4) % 1;
  return ph < 0.18 ? 1 - ph / 0.18 : 0;
}
function horde(c, t, area, intensity = 1, seedBase = 0) {
  const [ax, ay, aw, ah] = area;
  const light = muzzleLight(t) * intensity;
  c.save(); c.beginPath(); c.rect(ax, ay, aw, ah); c.clip();
  const sky = c.createLinearGradient(0, ay, 0, ay + ah);
  sky.addColorStop(0, `rgb(${6 + light * 30},${3 + light * 10},3)`);
  sky.addColorStop(0.5, `rgb(${70 + light * 90},${14 + light * 40},${10 + light * 10})`);
  sky.addColorStop(1, `rgb(${14 + light * 40},4,4)`);
  c.fillStyle = sky; c.fillRect(ax, ay, aw, ah);
  const N = 26;
  const list = [];
  for (let i = 0; i < N; i++) {
    const r = rng(i + seedBase + 1);
    const z0 = r(), speed = 0.18 + r() * 0.12;
    const z = ((z0 - t * speed) % 1 + 1) % 1;            // 1 far → 0 near
    list.push({ i, z, x: (r() - 0.5) * 2.4 });
  }
  list.sort((a, b) => b.z - a.z);
  for (const { i, z, x } of list) {
    const s = lerp(1.25, 0.12, Math.pow(z, 0.6)) * (ah / H);
    const px = ax + aw / 2 + x * aw * 0.45 * (1.2 - z * 0.6);
    const py = ay + ah * lerp(1.25, 0.62, z);
    const fogA = clamp(1 - z * 1.1);
    zombie(c, px, py, s, i + seedBase * 7 + 11, t, { light: light * fogA, eyes: clamp(0.4 + fogA) });
    // fog layer
    c.fillStyle = 'rgba(60,12,8,0.05)'; c.fillRect(ax, ay, aw, ah);
  }
  // ground fog
  const fg = c.createLinearGradient(0, ay + ah * 0.55, 0, ay + ah);
  fg.addColorStop(0, 'rgba(60,20,15,0)'); fg.addColorStop(1, 'rgba(60,20,15,0.35)');
  c.fillStyle = fg; c.fillRect(ax, ay, aw, ah);
  c.restore();
}
function sceneHorde(t) {
  const lt = t - 19.0;
  horde(g, t, [0, 0, W, H], 1);
  // muzzle flare from the bottom-left (the American), arcs from the right (the doctor)
  const L = muzzleLight(t);
  if (L > 0.3) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(120, H - 80, 0, 120, H - 80, 520);
    gr.addColorStop(0, `rgba(255,240,200,${L})`); gr.addColorStop(0.2, `rgba(255,170,40,${0.7 * L})`); gr.addColorStop(1, 'rgba(255,90,0,0)');
    g.fillStyle = gr; g.fillRect(0, H - 600, 640, 600);
    g.restore();
  }
  if (Math.floor(lt * 10) % 4 === 1) bolt(g, W - 60, H - 120, 1200 + hash(FRAME) * 300, 380 + hash(FRAME + 1) * 300, FRAME, { width: 3.5, branches: 5 });
  if (lt > 0.62 && lt < 0.78) { // katana flash
    const k = prog(0.62, 0.7, lt);
    g.save(); g.strokeStyle = '#fff'; g.lineWidth = 10 * (1 - prog(0.7, 0.78, lt)); g.beginPath(); g.moveTo(200, 200); g.lineTo(lerp(200, 1700, k), lerp(200, 900, k)); g.stroke(); g.restore();
  }
  // type
  const k1 = ap(lt, 0, 0.14), k2 = ap(lt, 0.5, 0.14);
  g.save(); g.translate(W / 2, 470); g.scale(lerp(1.4, 1, k1), lerp(1.4, 1, k1)); g.globalAlpha = k1;
  txt(g, 'THEY FIGHT', 0, 0, { size: 210, align: 'center', color: C.bone, ls: 4 });
  g.restore();
  if (lt >= 0.5) {
    g.save(); g.translate(W / 2, 700); g.scale(lerp(1.4, 1, k2), lerp(1.4, 1, k2));
    const w = tw(g, 'THE HORROR.', 210, FONT.anton, 4) + 60;
    g.fillStyle = C.red; g.fillRect(-w / 2, -186, w, 208);
    txt(g, 'THE HORROR.', 0, 0, { size: 210, align: 'center', color: '#0a0101', ls: 4 });
    g.restore();
  }
  // round counter
  roundCounter(t, 3);
}

function roundCounter(t, n, x = 90, y = 200, size = 170) {
  if (n <= 5) tally(g, x, y - 130 * size / 170, n, 0.9 * size / 170);
  else {
    txt(g, String(n), x, y, { size, font: FONT.ops, color: C.red });
    const r = rng(n), wd = tw(g, String(n), size, FONT.ops);
    for (let i = 0; i < 6; i++) { g.fillStyle = C.red; g.fillRect(x + 10 + r() * wd * 0.9, y - 10 * size / 170, 6, (10 + r() * 50 * (0.5 + 0.5 * Math.sin(t * 3 + i))) * size / 170); }
  }
}

const HACK = [
  ['$ ./exploit --target TELEPORTER_A --cve 1945-0115', 0.0],
  ['[*] bypassing auth…………………… done', 0.22],
  ['[*] rewriting destination → /dev/null', 0.36],
  ['[+] TELEPORTER_A: PWNED', 0.5],
];
function sceneHack(t) {
  const lt = t - 20.0;
  bg('#020403');
  // the hacker, extreme close — glasses full of code, left side
  g.save(); g.globalAlpha = 0.9;
  bust(g, 'moroccan', 330, H + 900, 2.4, lt, { accent: C.green, halo: 0.6 });
  g.restore();
  terminalFrame(g, 860, 120, 980, 540, 'zero-day@bunker115:~');
  HACK.forEach(([s, ti], i) => {
    if (lt < ti) return;
    const p = prog(ti, ti + 0.14, lt);
    const ok = s.startsWith('[+]');
    txt(g, typed(s, p) + (p < 1 ? cursor(10) : ''), 890, 210 + i * 70, { size: 34, font: FONT.vt, color: ok ? C.green : '#c8ffe0' });
  });
  // progress bar
  const pk = prog(0.2, 0.5, lt);
  g.strokeStyle = C.green; g.lineWidth = 2; g.strokeRect(890, 530, 920, 40);
  g.fillStyle = C.green; g.fillRect(894, 534, 912 * pk, 32);
  txt(g, Math.floor(pk * 100) + '%', 1820, 600, { size: 30, font: FONT.mono, color: C.green, align: 'right' });
  // type
  const k = ap(lt, 0.5, 0.14);
  if (lt >= 0.5) {
    g.save(); g.translate(1350, 900); g.scale(lerp(1.4, 1, k), lerp(1.4, 1, k));
    txt(g, 'HE HACKS IT.', 0, 0, { size: 230, align: 'center', color: C.green, ls: 4 });
    g.restore();
  } else {
    txt(g, 'HE', 1350, 900, { size: 230, align: 'center', color: C.bone, alpha: ap(lt, 0, 0.1), ls: 4 });
  }
  roundCounter(t, 4);
}

// CCTV wall — 3×2 feeds, each flips to green when owned
const FEEDS = [
  { cam: 'CAM 01 — TELEPORTER A', own: 21.25, cmd: 'teleporter.dest = "/dev/null"' },
  { cam: 'CAM 02 — CORRIDOR B', own: 21.5, cmd: 'turrets.retarget(UNDEAD)' },
  { cam: 'CAM 03 — ARMORY', own: 21.75, cmd: 'wunderwaffe.auth = ZERO_DAY' },
  { cam: 'CAM 04 — CONTAINMENT', own: 22.0, cmd: 'doors.lock(ALL, force=True)' },
  { cam: 'CAM 05 — REACTOR 115', own: 22.25, cmd: 'reactor.reroute("PERIMETER_GRID")' },
  { cam: 'CAM 06 — CORRIDOR D', own: 22.5, cmd: 'lights.strobe(UV) ; fans.reverse()' },
];
function feed(i, x, y, w, h, t) {
  const f = FEEDS[i], owned = t >= f.own, k = prog(f.own, f.own + 0.15, t);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = '#060404'; g.fillRect(x, y, w, h);
  const lt = t - 21;
  if (i === 0) { // teleporter: zombies sucked into a ring of light once owned
    g.strokeStyle = owned ? C.green : C.cyan; g.lineWidth = 6;
    const cx = x + w / 2, cy = y + h * 0.55;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let q = 0; q < 3; q++) { g.globalAlpha = 0.6; g.beginPath(); g.ellipse(cx, cy, 90 + q * 12 + Math.sin(t * 20 + q) * 6, 30 + q * 4, 0, 0, TAU); g.stroke(); }
    g.restore();
    for (let z = 0; z < 4; z++) {
      const pull = owned ? clamp((t - f.own) * 2 - z * 0.15) : 0;
      const zx = lerp(x + 60 + z * 110, cx, pull), zs = lerp(0.42, 0.02, pull);
      if (zs > 0.03) zombie(g, zx, y + h * 0.95, zs, 900 + z, t, { light: 0.2 });
    }
    if (owned) bolt(g, cx - 90, cy, cx + 90, cy, FRAME, { width: 2, color: C.green });
  } else if (i === 1) { // corridor: zombies, then turret tracers once owned
    horde(g, t + 3, [x, y, w, h], owned ? 0.3 : 1, 40);
    if (owned) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(39,255,138,0.9)'; g.lineWidth = 3;
      for (let q = 0; q < 5; q++) { const yy = y + 60 + hash(FRAME + q) * (h - 100); g.beginPath(); g.moveTo(x + w, y + 30); g.lineTo(x + hash(q + FRAME * 2) * w * 0.6, yy); g.stroke(); }
      g.restore();
    }
  } else if (i === 2) { // armory: katana + wunderwaffe arcs
    zombie(g, x + w * 0.62, y + h * 1.05, 0.55, 1200, t, { light: 0.4 });
    const ph = (lt * 3) % 1;
    if (ph < 0.25) { g.strokeStyle = '#fff'; g.lineWidth = 6 * (1 - ph * 4); g.beginPath(); g.moveTo(x + 20, y + 20 + ph * 200); g.lineTo(x + w - 20, y + h - 40 - ph * 100); g.stroke(); }
    bolt(g, x + 20, y + h * 0.4, x + w * 0.6, y + h * 0.45, FRAME * 2, { width: 2.5, color: owned ? C.green : C.cyan, branches: 2 });
  } else if (i === 3) { // containment: doors slam shut once owned
    for (let q = 0; q < 4; q++) {
      const cx = x + 20 + q * (w - 40) / 4, cw = (w - 40) / 4 - 14;
      zombie(g, cx + cw / 2, y + h * 0.98, 0.3, 1300 + q, t, { light: 0.2 });
      const close = owned ? E.outExpo(clamp((t - f.own) * 4 - q * 0.2)) : 0;
      g.fillStyle = '#4c5257';
      for (let b = 0; b < 5; b++) g.fillRect(cx + 4 + b * cw / 5, y + 40 + (1 - close) * -h, 6, h - 60);
    }
  } else if (i === 4) { // reactor
    const cx = x + w / 2, cy = y + h / 2;
    const col = owned ? C.green : C.cyan;
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 160);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.2, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.restore();
    for (let q = 0; q < 3; q++) bolt(g, cx, cy, cx + Math.cos(q * 2.1 + lt * 3) * 220, cy + Math.sin(q * 2.1 + lt * 3) * 120, FRAME + q * 9, { width: 2, color: col });
    txt(g, '115', cx, cy + 20, { size: 60, font: FONT.ops, color: '#000', align: 'center' });
  } else { // corridor D
    horde(g, t + 7, [x, y, w, h], owned ? 0 : 1, 80);
    if (owned) { g.fillStyle = `rgba(150,80,255,${0.25 + 0.2 * Math.sin(t * 40)})`; g.fillRect(x, y, w, h); }
  }
  // feed chrome
  g.fillStyle = 'rgba(255,255,255,0.05)';
  for (let yy = y + ((FRAME * 7) % 12); yy < y + h; yy += 12) g.fillRect(x, yy, w, 2);
  const roll = (t * 90 + i * 100) % (h + 80) - 40;
  g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x, y + roll, w, 30);
  g.restore();
  g.strokeStyle = owned ? C.green : 'rgba(236,230,214,0.35)'; g.lineWidth = owned ? 4 : 2; g.strokeRect(x, y, w, h);
  txt(g, f.cam, x + 14, y + 30, { size: 19, font: FONT.mono, color: owned ? C.green : C.bone, ls: 2 });
  if (!owned) { recDot(g, x + w - 26, y + 24); }
  txt(g, '14.IX.45 ' + timecode(t + i), x + w - 14, y + h - 14, { size: 17, font: FONT.mono, color: C.bone, align: 'right', alpha: 0.6 });
  if (owned) {
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(-0.12); const s = lerp(2, 1, E.outExpo(k)); g.scale(s, s);
    g.globalAlpha = 0.95 * k;
    g.strokeStyle = C.green; g.lineWidth = 5; g.strokeRect(-150, -42, 300, 84);
    txt(g, 'OWNED', 0, 24, { size: 66, font: FONT.ops, color: C.green, align: 'center', ls: 8 });
    g.restore();
  }
}
function sceneCCTV(t) {
  bg('#020202');
  const m = 24, top = 110, cw = (W - m * 4) / 3, chh = (H - top - 170 - m) / 2;
  for (let i = 0; i < 6; i++) feed(i, m + (i % 3) * (cw + m), top + Math.floor(i / 3) * (chh + m), cw, chh, t);
  // command bar
  g.fillStyle = '#020a05'; g.fillRect(0, H - 150, W, 150);
  g.fillStyle = C.green; g.fillRect(0, H - 150, W, 3);
  let cur = null;
  for (const f of FEEDS) if (t >= f.own - 0.25) cur = f;
  if (cur) {
    const p = prog(cur.own - 0.25, cur.own - 0.05, t);
    txt(g, 'zero-day@bunker115:~$ ' + typed(cur.cmd, p) + cursor(10), 60, H - 62, { size: 48, font: FONT.vt, color: C.green });
  }
  const owned = FEEDS.filter(f => t >= f.own).length;
  txt(g, `SYSTEMS OWNED ${owned}/6`, W - 60, H - 62, { size: 34, font: FONT.mono, color: C.green, align: 'right', ls: 4 });
  hud(g, 'BUNKER 115 // SECURITY CAMERAS // TAKEOVER IN PROGRESS', '', C.bone, 0.7);
  const rn = [5, 5, 8, 12, 20, 31, 47, 66, 89][Math.min(8, Math.floor((t - 21) * 4))];
  txt(g, 'ROUND', 1060, H - 62, { size: 26, font: FONT.mono, color: C.red, ls: 6 });
  roundCounter(t, rn, 1180, H - 40, 96);
}

function scenePatch(t) {
  const lt = t - 23.0;
  bg('#020403');
  // montage ghosts underneath
  g.save(); g.globalAlpha = 0.28;
  const ph = Math.floor(lt * 8) % 3;
  if (ph === 0) horde(g, t, [0, 0, W, H], 1, 3);
  else if (ph === 1) blueprint(g, t, 1, ROOMS.map((_, i) => (i + Math.floor(lt * 8)) % 2));
  else zellige(g, -40, -60, 22, 13, 92, 1, C.green, 0.7, 3);
  g.restore();
  g.fillStyle = 'rgba(2,4,3,0.55)'; g.fillRect(0, 0, W, H);
  const p = E.inOutCubic(prog(0.1, 1.25, lt));
  const n = Math.floor(2847 * p);
  txt(g, 'sudo patch --all --now', W / 2, 270, { size: 50, font: FONT.vt, color: '#c8ffe0', align: 'center' });
  txt(g, 'PATCHING', W / 2, 420, { size: 120, align: 'center', color: C.bone, ls: 20 });
  txt(g, `${String(n).padStart(4, '0')} / 2847 VULNERABILITIES`, W / 2, 490, { size: 34, font: FONT.mono, align: 'center', color: C.green, ls: 6 });
  // the bar
  const bx = 160, bw = W - 320, by = 560, bh = 110;
  g.strokeStyle = C.green; g.lineWidth = 4; g.strokeRect(bx, by, bw, bh);
  g.fillStyle = C.green; g.fillRect(bx + 10, by + 10, (bw - 20) * p, bh - 20);
  for (let i = 0; i < 40; i++) { g.fillStyle = '#020403'; g.fillRect(bx + 10 + i * (bw - 20) / 40, by + 10, 4, bh - 20); }
  const pct = Math.floor(p * 100);
  if (lt > 1.28) {
    const k = ap(lt, 1.28, 0.1);
    g.save(); g.translate(W / 2, 880); g.scale(lerp(1.6, 1, k), lerp(1.6, 1, k));
    txt(g, 'SYSTEM SECURED', 0, 0, { size: 170, align: 'center', color: C.green, ls: 8 });
    g.restore();
  } else txt(g, pct + '%', W / 2, 880, { size: 200, align: 'center', color: pct > 97 ? C.green : C.bone });
  // the horde pushes at the edges as the bar fills
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1, r = rng(i + 2000);
    const push = (1 - p) * 0.5 + 0.2 + Math.sin(t * 4 + i) * 0.03;
    zombie(g, W / 2 + side * (W / 2 + 120 - push * 300), H + 160 + r() * 80, 0.9 + r() * 0.4, 2000 + i, t, { eyes: 1 - p * 0.8 });
  }
  const rn = Math.min(115, Math.floor(lerp(89, 115, E.outExpo(prog(0, 1.2, lt)))));
  roundCounter(t, rn);
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 · TITLE (24.9 – 29.5)
// ═════════════════════════════════════════════════════════════════════════════
const TITLE_LAYER = mk(W, H);
function sceneTitle(t) {
  const lt = t - 25.6;
  bg('#030405');
  if (lt < 0) {
    // the beat of silence: a lone cursor
    const s = typed('> run sec_ops', prog(25.05, 25.45, t));
    txt(g, s + cursor(6), W / 2 - 170, H / 2 + 14, { size: 40, font: FONT.vt, color: C.green });
    return;
  }
  // backdrop: zellige lattice drawing itself + slow 115 glow
  g.save(); g.globalAlpha = 0.2;
  zellige(g, -60, -60, 22, 13, 92, prog(0, 2.4, lt), C.emerald, 0.6, 2, 5);
  g.restore();
  const gl = g.createRadialGradient(W / 2, 520, 50, W / 2, 520, 900);
  gl.addColorStop(0, 'rgba(95,230,255,0.10)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gl; g.fillRect(0, 0, W, H);

  // CALL OF DUTY — wide, steel
  const k1 = ap(lt, 0, 0.5, E.outQuint);
  const steel = g.createLinearGradient(0, 270, 0, 380);
  steel.addColorStop(0, '#ffffff'); steel.addColorStop(0.5, '#b9c1c7'); steel.addColorStop(0.52, '#6c757c'); steel.addColorStop(1, '#d9dee2');
  g.save(); g.globalAlpha = k1;
  txt(g, 'CALL OF DUTY', W / 2, 375, { size: 124, color: steel, align: 'center', ls: lerp(80, 34, k1) });
  g.restore();
  // rules with the tifinagh yaz and 115 between
  const rk = ap(lt, 0.15, 0.6);
  g.fillStyle = C.bone; g.globalAlpha = 0.8;
  g.fillRect(W / 2 - 60 - 520 * rk, 418, 520 * rk, 3); g.fillRect(W / 2 + 60, 418, 520 * rk, 3);
  g.globalAlpha = 1;
  txt(g, 'ⵣ', W / 2, 442, { size: 54, font: FONT.tif, color: C.red, align: 'center', alpha: rk });

  // SEC OPS — the hero
  const k2 = ap(lt, 0.0, 0.35);
  const s = lerp(1.25, 1, k2);
  g.save(); g.translate(W / 2, 760); g.scale(s, s);
  const hero = g.createLinearGradient(0, -300, 0, 0);
  hero.addColorStop(0, '#f6f2e6'); hero.addColorStop(0.55, '#d8d1bf'); hero.addColorStop(0.56, '#9c9483'); hero.addColorStop(1, '#e9e3d3');
  txt(g, 'SEC OPS', 10, 10, { size: 360, font: FONT.ops, color: 'rgba(0,0,0,0.6)', align: 'center', ls: 14 });
  g.restore();
  const L = TITLE_LAYER.getContext('2d');
  L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = 'source-over'; L.clearRect(0, 0, W, H);
  L.translate(W / 2, 760); L.scale(s, s);
  txt(L, 'SEC OPS', 0, 0, { size: 360, font: FONT.ops, color: hero, align: 'center', ls: 14 });
  L.globalCompositeOperation = 'source-atop';
  const sweep = ((lt * 0.55) % 1.6) * 2400 - 1400;
  const sg = L.createLinearGradient(sweep - 160, 0, sweep + 160, 0);
  sg.addColorStop(0, 'rgba(39,255,138,0)'); sg.addColorStop(0.5, 'rgba(39,255,138,0.85)'); sg.addColorStop(1, 'rgba(39,255,138,0)');
  L.fillStyle = sg; L.fillRect(-1000, -330, 2000, 360);
  g.drawImage(TITLE_LAYER, 0, 0);
  // electricity crawling across the letters
  if (lt > 0.25 && lt < 1.6 && Math.floor(lt * 15) % 2 === 0) {
    const r = rng(Math.floor(lt * 15) + 4000);
    bolt(g, 350 + r() * 300, 480 + r() * 260, 1300 + r() * 300, 480 + r() * 260, FRAME, { width: 2.4, branches: 3, alpha: 1 - prog(0.8, 1.6, lt) });
  }
  // tagline
  const tag = 'EVERY BUNKER HAS A BACKDOOR.';
  txt(g, typed(tag, prog(1.1, 1.8, lt)), W / 2, 880, { size: 40, font: FONT.mono, color: C.bone, align: 'center', ls: 14 });
  // bottom terminal stinger
  const st1 = '> 2847/2847 patched. session closed.';
  const st2 = '> warning: 1 process still running — ROUND 116';
  txt(g, typed(st1, prog(2.0, 2.4, lt)), 80, H - 90, { size: 34, font: FONT.vt, color: C.green, alpha: 0.9 });
  txt(g, typed(st2, prog(2.6, 3.0, lt)), 80, H - 52, { size: 34, font: FONT.vt, color: C.red });
  // …and something opens its eyes
  if (lt > 2.95) {
    const blink = Math.floor((lt - 2.95) * 30) === 4 ? 0.1 : 1;
    eyes(g, W - 260, H - 120, 1.1, ap(lt, 2.95, 0.3) * blink);
  }
  cropMarks(g, C.bone, 0.35);
  txt(g, 'A FAN FILM · NOT AFFILIATED WITH ACTIVISION', W - 80, H - 52, { size: 16, font: FONT.mono, color: C.bone, align: 'right', ls: 3, alpha: 0.35 * ap(lt, 1.6, 0.5) });
}

// ═════════════════════════════════════════════════════════════════════════════
const TIMELINE = [
  [0, 3.5, sceneOpen], [3.5, 4.5, sceneDoor],
  [4.5, 6.5, t => sceneCard(t, 0)], [6.5, 8.5, t => sceneCard(t, 1)], [8.5, 10.5, t => sceneCard(t, 2)],
  [10.5, 12.5, t => sceneCard(t, 3)], [12.5, 14.5, t => sceneCard(t, 4)],
  [14.5, 15.25, sceneScan], [15.25, 17.0, sceneMap], [17.0, 18.0, sceneVuln], [18.0, 19.0, sceneAlarm],
  [19.0, 20.0, sceneHorde], [20.0, 21.0, sceneHack], [21.0, 23.0, sceneCCTV], [23.0, 24.9, scenePatch],
  [24.9, DURATION + 1, sceneTitle],
];
function drawScene(t) {
  for (const [a, b, fn] of TIMELINE) if (t >= a && t < b) { fn(t); return; }
}
