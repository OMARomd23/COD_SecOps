'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Art library: character busts, zombies, lightning, zellige, hardware.
//  Busts are authored in a local space: origin = bottom-centre, y up is
//  negative, ~800 units tall. They are rasterised to a mask each frame and
//  shaded as a black silhouette with halftone falloff and an accent rim light.
// ─────────────────────────────────────────────────────────────────────────────

const BW = 1000, BH = 1120, BOX = 500, BOY = 1100; // bust canvas + origin
const ART = {};
function initArt() {
  ART.mask = mk(BW, BH); ART.m = ART.mask.getContext('2d');
  ART.tint = mk(BW, BH); ART.tc = ART.tint.getContext('2d');
  ART.body = mk(BW, BH); ART.bc = ART.body.getContext('2d');
  ART.rim = mk(BW, BH); ART.rc = ART.rim.getContext('2d');
  ART.halftone = {};
}
// Precomputed halftone screen per accent colour: dots grow toward the key light.
function halftoneFor(color) {
  if (ART.halftone[color]) return ART.halftone[color];
  const c = mk(BW, BH), x = c.getContext('2d');
  x.fillStyle = color; x.beginPath();
  const S = 11;
  for (let j = 0; j < BH / S + 1; j++) for (let i = 0; i < BW / S + 1; i++) {
    const px = i * S + (j % 2) * S / 2, py = j * S;
    const d = Math.hypot(px - 80, py - 220) / 1050;
    const r = clamp(1 - d) ** 1.6 * S * 0.62;
    if (r > 0.4) { x.moveTo(px + r, py); x.arc(px, py, r, 0, TAU); }
  }
  x.fill();
  ART.halftone[color] = c;
  return c;
}

const ell = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fill(); };
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); }
function rrect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); }
// a thick tapered stick (handles, barrels, arms)
function stick(c, x1, y1, x2, y2, w1, w2 = w1) {
  const a = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
  poly(c, [x1 + ca * w1 / 2, y1 + sa * w1 / 2, x2 + ca * w2 / 2, y2 + sa * w2 / 2, x2 - ca * w2 / 2, y2 - sa * w2 / 2, x1 - ca * w1 / 2, y1 - sa * w1 / 2]);
}
function torso(c, sw, sy, nw, ny) {
  c.beginPath();
  c.moveTo(-sw - 50, 30);
  c.bezierCurveTo(-sw - 40, -sy * 0.45, -sw - 10, -sy * 0.85, -sw + 80, -sy);
  c.bezierCurveTo(-sw + 190, -sy - 45, -nw - 70, -sy - 30, -nw, -ny);
  c.lineTo(nw, -ny);
  c.bezierCurveTo(nw + 70, -sy - 30, sw - 190, -sy - 45, sw - 80, -sy);
  c.bezierCurveTo(sw + 10, -sy * 0.85, sw + 40, -sy * 0.45, sw + 50, 30);
  c.closePath(); c.fill();
}
function head(c, y, rx, ry) {
  // egg-shaped skull + jaw
  c.beginPath();
  c.moveTo(0, y - ry);
  c.bezierCurveTo(rx * 1.05, y - ry, rx * 1.08, y + ry * 0.15, rx * 0.72, y + ry * 0.7);
  c.quadraticCurveTo(rx * 0.35, y + ry * 1.02, 0, y + ry * 1.02);
  c.quadraticCurveTo(-rx * 0.35, y + ry * 1.02, -rx * 0.72, y + ry * 0.7);
  c.bezierCurveTo(-rx * 1.08, y + ry * 0.15, -rx * 1.05, y - ry, 0, y - ry);
  c.fill();
  ell(c, -rx * 0.98, y + 8, 20, 36); ell(c, rx * 0.98, y + 8, 20, 36); // ears
}
function star5(c, x, y, R, r = R * 0.42, rot = -Math.PI / 2) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? r : R, a = rot + i * Math.PI / 5; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath();
}
function star8(c, x, y, R, rot = 0) { // khatam — 8-point star (two squares)
  c.beginPath();
  const r = R * 0.76;
  for (let i = 0; i < 16; i++) { const rr = i % 2 ? r : R, a = rot + i * Math.PI / 8; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath();
}

// ── character shapes (mask) ──────────────────────────────────────────────────
const SHAPES = {
  german(c, lt) {
    torso(c, 420, 300, 62, 430);
    head(c, -575, 112, 142);
    // wild, electrified hair swept back
    c.beginPath();
    const N = 17, cx = 0, cy = -600;
    for (let i = 0; i <= N; i++) {
      const a = Math.PI * (0.98 + (i / N) * 1.04);
      const out = i % 2 === 0;
      const jit = noise1(lt * 6 + i * 3.1) * 18;
      const r = out ? 172 + 70 * hash(i * 3.17) + jit : 128;
      c.lineTo(cx + Math.cos(a) * r - (out ? 26 : 0), cy + Math.sin(a) * r * (out ? 0.95 : 0.9));
    }
    c.closePath(); c.fill();
    stick(c, 180, -230, 222, -315, 14, 12); stick(c, 205, -230, 250, -305, 12, 10); // pens in pocket
  },
  russian(c) {
    torso(c, 470, 310, 70, 430);
    poly(c, [-215, -300, -165, -480, -60, -430, -40, -300]); // raised greatcoat collar
    poly(c, [215, -300, 165, -480, 60, -430, 40, -300]);
    head(c, -555, 118, 140);
    c.beginPath(); c.moveTo(-162, -612); c.bezierCurveTo(-176, -780, 176, -780, 162, -612); c.closePath(); c.fill(); // ushanka crown
    rrect(c, -192, -672, 384, 92, 34);  // turned-up front flap
    rrect(c, -196, -640, 78, 210, 34);  // ear flaps
    rrect(c, 118, -640, 78, 210, 34);
    // trench shovel over the shoulder
    stick(c, 250, -250, 400, -830, 26, 22);
    c.save(); c.translate(418, -900); c.rotate(Math.atan2(-580, 150) + Math.PI / 2);
    c.beginPath(); c.moveTo(-58, 40); c.lineTo(-62, -40); c.quadraticCurveTo(0, -120, 62, -40); c.lineTo(58, 40); c.closePath(); c.fill();
    c.restore();
  },
  american(c) {
    torso(c, 440, 300, 68, 430);
    stick(c, -255, -250, -372, -935, 20, 15);  // rifle barrel behind shoulder
    rrect(c, -385, -950, 20, 36, 4);           // front sight
    head(c, -545, 116, 138);
    c.beginPath(); // M1 helmet: tall dome, sides stop above the ears, flared lip
    c.moveTo(-170, -600);
    c.bezierCurveTo(-172, -842, 172, -842, 170, -600);
    c.lineTo(-170, -600);
    c.fill();
    c.beginPath(); c.moveTo(-196, -584); c.quadraticCurveTo(-185, -606, -160, -612); c.lineTo(160, -612); c.quadraticCurveTo(185, -606, 196, -584); c.quadraticCurveTo(0, -604, -196, -584); c.fill();
    stick(c, 32, -472, 126, -490, 15, 13);    // cigar
  },
  japanese(c, lt) {
    poly(c, [-470, 30, -455, -190, -310, -300, -72, -425, 72, -425, 310, -300, 455, -190, 470, 30]); // haori
    stick(c, 195, -330, 345, -830, 34, 30);    // katana tsuka over shoulder
    c.save(); c.translate(212, -385); c.rotate(Math.atan2(-500, 150) + Math.PI / 2); ell(c, 0, 0, 62, 16); c.restore(); // tsuba
    head(c, -548, 112, 140);
    c.beginPath(); c.ellipse(0, -604, 120, 98, 0, Math.PI, TAU); c.fill(); // hair cap
    ell(c, 6, -700, 24, 40, 0.2);             // topknot
    // hachimaki ribbons flowing
    for (let k = 0; k < 2; k++) {
      c.beginPath();
      const y0 = -598 + k * 16, len = 260 + k * 40;
      c.moveTo(-108, y0 - 10);
      for (let i = 0; i <= 12; i++) {
        const u = i / 12, x = -108 - u * len, y = y0 + Math.sin(u * 5 - lt * 9 + k) * 22 * u + u * 40;
        c.lineTo(x, y - 9 * (1 - u * 0.7));
      }
      for (let i = 12; i >= 0; i--) {
        const u = i / 12, x = -108 - u * len, y = y0 + Math.sin(u * 5 - lt * 9 + k) * 22 * u + u * 40;
        c.lineTo(x, y + 9 * (1 - u * 0.7));
      }
      c.closePath(); c.fill();
    }
  },
  moroccan(c) {
    torso(c, 430, 285, 125, 420);
    c.beginPath(); // hood
    c.moveTo(-212, -320);
    c.bezierCurveTo(-272, -520, -212, -770, 0, -800);
    c.bezierCurveTo(212, -770, 272, -520, 212, -320);
    c.bezierCurveTo(120, -372, -120, -372, -212, -320);
    c.fill();
    ell(c, -150, -330, 38, 54, 0.3); ell(c, 150, -330, 38, 54, -0.3); // headphone cups
  },
};

// ── character detail overlays (drawn in bust space, on top) ──────────────────
const DETAILS = {
  german(c, lt, accent) {
    c.lineCap = 'round';
    c.strokeStyle = accent; c.globalAlpha = 0.55; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-95, -400); c.lineTo(0, -170); c.lineTo(95, -400); c.stroke(); // lapels
    c.beginPath(); c.moveTo(-160, -330); c.lineTo(-70, -40); c.moveTo(160, -330); c.lineTo(70, -40); c.stroke();
    c.globalAlpha = 1;
    // glasses — the signature glint
    const fl = 0.75 + 0.25 * noise1(lt * 20);
    for (const sx of [-50, 50]) {
      c.fillStyle = `rgba(95,230,255,${0.32 * fl})`; ell(c, sx, -585, 36, 34);
      c.strokeStyle = accent; c.lineWidth = 6; c.beginPath(); c.ellipse(sx, -585, 36, 34, 0, 0, TAU); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.arc(sx, -585, 24, -2.4, -1.5); c.stroke();
    }
    c.beginPath(); c.moveTo(-14, -588); c.quadraticCurveTo(0, -598, 14, -588); c.stroke();
    // pen tips
    c.fillStyle = accent; ell(c, 222, -318, 7, 7); ell(c, 250, -307, 6, 6);
  },
  russian(c, lt, accent) {
    const p = 0.85 + 0.15 * Math.sin(lt * 12);
    c.save(); c.globalCompositeOperation = 'lighter';
    c.fillStyle = `rgba(255,43,28,${0.35 * p})`; star5(c, 0, -626, 64); c.fill();
    c.restore();
    c.fillStyle = accent; star5(c, 0, -626, 36); c.fill();
    c.strokeStyle = accent; c.globalAlpha = 0.6; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-165, -480); c.lineTo(-60, -430); c.moveTo(165, -480); c.lineTo(60, -430); c.stroke();
    c.globalAlpha = 0.9; c.fillStyle = accent;
    for (const y of [-260, -170, -80]) { ell(c, -70, y, 8, 8); ell(c, 70, y, 8, 8); }
    c.globalAlpha = 1;
  },
  american(c, lt, accent) {
    c.strokeStyle = accent; c.lineWidth = 4; c.globalAlpha = 0.65; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-152, -600); c.quadraticCurveTo(-140, -470, -96, -456); c.stroke(); // loose chinstraps
    c.beginPath(); c.moveTo(152, -600); c.quadraticCurveTo(150, -500, 120, -446); c.stroke();
    c.globalAlpha = 0.5; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-180, -260); c.lineTo(-80, -250); c.lineTo(-90, -190); c.moveTo(180, -260); c.lineTo(80, -250); c.lineTo(90, -190); c.stroke();
    c.globalAlpha = 1;
    // cigar ember + smoke
    const fl = 0.6 + 0.4 * noise1(lt * 14);
    c.save(); c.globalCompositeOperation = 'lighter';
    const gr = c.createRadialGradient(128, -491, 0, 128, -491, 46);
    gr.addColorStop(0, `rgba(255,190,90,${fl})`); gr.addColorStop(0.3, `rgba(255,80,20,${0.6 * fl})`); gr.addColorStop(1, 'rgba(255,40,0,0)');
    c.fillStyle = gr; ell(c, 128, -491, 46, 46);
    c.restore();
    c.strokeStyle = 'rgba(236,230,214,0.18)'; c.lineWidth = 5;
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      for (let i = 0; i < 30; i++) {
        const u = i / 29, y = -500 - u * 330, x = 132 + Math.sin(u * 6 + lt * 3 + k * 2) * 26 * u + u * 50 + k * 8;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    }
  },
  japanese(c, lt, accent) {
    c.fillStyle = accent; c.fillRect(-118, -612, 236, 22); // hachimaki band
    c.strokeStyle = 'rgba(235,228,211,0.55)'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(-72, -425); c.lineTo(70, -110); c.moveTo(72, -425); c.lineTo(0, -270); c.stroke(); // crossed collars
    // tsuka wrap
    c.save(); c.translate(270, -580); c.rotate(Math.atan2(-500, 150) + Math.PI / 2);
    c.lineWidth = 3; c.strokeStyle = 'rgba(235,228,211,0.5)';
    for (let i = -200; i < 220; i += 34) { c.beginPath(); c.moveTo(-15, i); c.lineTo(15, i + 17); c.moveTo(15, i); c.lineTo(-15, i + 17); c.stroke(); }
    c.restore();
  },
  moroccan(c, lt, accent) {
    // face inside the hood, lit only by the laptop from below
    c.save();
    c.beginPath(); c.ellipse(0, -545, 108, 140, 0, 0, TAU); c.clip();
    c.fillStyle = '#020403'; c.fillRect(-120, -700, 240, 320);
    const gr = c.createLinearGradient(0, -405, 0, -640);
    gr.addColorStop(0, 'rgba(39,255,138,0.55)'); gr.addColorStop(0.5, 'rgba(39,255,138,0.12)'); gr.addColorStop(1, 'rgba(39,255,138,0)');
    c.fillStyle = gr; c.fillRect(-120, -700, 240, 320);
    c.restore();
    // glasses reflecting code
    for (const sx of [-48, 48]) {
      c.save();
      c.beginPath(); c.roundRect(sx - 36, -590, 72, 42, 8); c.clip();
      c.fillStyle = 'rgba(39,255,138,0.25)'; c.fillRect(sx - 36, -590, 72, 42);
      c.fillStyle = 'rgba(160,255,200,0.9)';
      for (let i = 0; i < 6; i++) {
        const y = -590 + ((i * 9 + lt * 60) % 54) - 4;
        c.fillRect(sx - 30, y, 14 + hash(i + Math.floor(lt * 8)) * 44, 3);
      }
      c.restore();
      c.strokeStyle = accent; c.lineWidth = 4; c.beginPath(); c.roundRect(sx - 36, -590, 72, 42, 8); c.stroke();
    }
    c.beginPath(); c.moveTo(-12, -572); c.lineTo(12, -572); c.stroke();
    // hood rim, strings, headphone band
    c.strokeStyle = accent; c.globalAlpha = 0.6; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-205, -330); c.bezierCurveTo(-255, -520, -200, -730, 0, -760); c.bezierCurveTo(200, -730, 255, -520, 205, -330); c.stroke();
    c.beginPath(); c.moveTo(-50, -350); c.lineTo(-42, -150); c.moveTo(50, -350); c.lineTo(46, -160); c.stroke();
    c.lineWidth = 10; c.globalAlpha = 0.8; c.beginPath(); c.arc(0, -330, 150, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke();
    c.globalAlpha = 1; c.fillStyle = accent; ell(c, -42, -148, 7, 7); ell(c, 46, -158, 7, 7);
    // glowing yaz (ⵣ) on the chest
    c.save(); c.globalCompositeOperation = 'lighter';
    const yg = c.createRadialGradient(-235, -190, 0, -235, -190, 90);
    yg.addColorStop(0, 'rgba(255,43,28,0.55)'); yg.addColorStop(1, 'rgba(255,43,28,0)');
    c.fillStyle = yg; ell(c, -235, -190, 90, 90);
    c.restore();
    txt(c, 'ⵣ', -235, -150, { size: 96, font: FONT.tif, color: C.red, align: 'center' });
    // Amazigh rug band across the hoodie: diamonds, chevrons, dots
    c.save(); c.globalAlpha = 0.85; c.strokeStyle = accent; c.fillStyle = accent; c.lineWidth = 3;
    const by = -70;
    c.beginPath(); c.moveTo(-420, by - 34); c.lineTo(420, by - 34); c.moveTo(-430, by + 34); c.lineTo(430, by + 34); c.stroke();
    for (let x = -400; x <= 400; x += 64) {
      c.beginPath(); c.moveTo(x, by - 24); c.lineTo(x + 24, by); c.lineTo(x, by + 24); c.lineTo(x - 24, by); c.closePath(); c.stroke();
      ell(c, x, by, 5, 5);
      c.beginPath(); c.moveTo(x + 32, by - 22); c.lineTo(x + 40, by - 12); c.lineTo(x + 32, by - 2); c.moveTo(x + 32, by + 2); c.lineTo(x + 40, by + 12); c.lineTo(x + 32, by + 22); c.stroke();
    }
    c.restore();
  },
};

// Render a bust at (x, y=bottom) with scale s.
function bust(c, key, x, y, s, lt, o) {
  const { m, tc, bc, rc } = ART;
  m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, BW, BH);
  m.setTransform(1, 0, 0, 1, BOX, BOY); m.fillStyle = '#fff';
  SHAPES[key](m, lt);
  m.setTransform(1, 0, 0, 1, 0, 0);

  tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, BW, BH); tc.drawImage(ART.mask, 0, 0);
  tc.globalCompositeOperation = 'source-in'; tc.fillStyle = o.accent; tc.fillRect(0, 0, BW, BH);

  bc.globalCompositeOperation = 'source-over'; bc.clearRect(0, 0, BW, BH); bc.drawImage(ART.mask, 0, 0);
  bc.globalCompositeOperation = 'source-in'; bc.fillStyle = o.base || '#07080a'; bc.fillRect(0, 0, BW, BH);
  bc.globalCompositeOperation = 'source-atop'; bc.globalAlpha = o.ht ?? 0.32; bc.drawImage(halftoneFor(o.accent), 0, 0); bc.globalAlpha = 1;

  rc.globalCompositeOperation = 'source-over'; rc.clearRect(0, 0, BW, BH); rc.drawImage(ART.tint, 0, 0);
  rc.globalCompositeOperation = 'destination-out'; rc.drawImage(ART.mask, o.rimX ?? 13, o.rimY ?? 10);

  c.save(); c.translate(x, y); c.scale(s, s);
  if (o.halo !== 0) {
    c.globalAlpha = o.halo ?? 0.55; c.filter = 'blur(28px)'; c.drawImage(ART.tint, -BOX, -BOY); c.filter = 'none'; c.globalAlpha = 1;
  }
  c.drawImage(ART.body, -BOX, -BOY);
  c.globalCompositeOperation = o.rimOp || 'lighter'; c.drawImage(ART.rim, -BOX, -BOY);
  c.globalCompositeOperation = 'source-over';
  DETAILS[key](c, lt, o.accent);
  c.restore();
}

// ── zombies ──────────────────────────────────────────────────────────────────
// Draws one shambler, bottom-centre at (x,y), scale s. light 0..1 = muzzle flash.
function zombie(c, x, y, s, seed, t, o = {}) {
  const r = rng(seed);
  const tilt = (r() - 0.5) * 0.7 + Math.sin(t * 2.3 + seed) * 0.12;
  const lean = (r() - 0.5) * 0.25 + Math.sin(t * 1.7 + seed * 2) * 0.05;
  const armL = [-(190 + r() * 80), -(300 + r() * 120)], armR = [190 + r() * 80, -(300 + r() * 120)];
  const sway = Math.sin(t * 3 + seed) * 18;
  const light = o.light || 0;
  const shade = o.color || `rgb(${10 + light * 70},${8 + light * 34},${8 + light * 20})`;
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(lean);
  c.fillStyle = shade;
  c.beginPath(); c.moveTo(-160, 60); c.bezierCurveTo(-170, -80, -150, -170, -70, -205); c.lineTo(65, -210); c.bezierCurveTo(150, -175, 170, -80, 160, 60); c.closePath(); c.fill();
  // ragged hem
  c.beginPath(); for (let i = 0; i <= 10; i++) c.lineTo(-160 + i * 32, 60 + (i % 2) * 22 + r() * 14); c.lineTo(160, 40); c.lineTo(-160, 40); c.fill();
  // reaching arms + claws
  for (const [ax, ay] of [armL, armR]) {
    const sx = Math.sign(ax) * 115, hx = ax + sway * Math.sign(ax), hy = ay - sway * 0.6;
    stick(c, sx, -165, hx, hy, 58, 30);
    c.strokeStyle = shade; c.lineWidth = 9; c.lineCap = 'round';
    for (let f = -2; f <= 2; f++) {
      const a = Math.atan2(hy + 165, hx - sx) + f * 0.32;
      c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + Math.cos(a) * 46, hy + Math.sin(a) * 46); c.stroke();
    }
  }
  c.save(); c.translate((r() - 0.5) * 20, -268); c.rotate(tilt);
  ell(c, 0, 0, 60, 72);
  c.beginPath(); c.moveTo(-40, 40); c.lineTo(-30, 82); c.lineTo(30, 82); c.lineTo(40, 40); c.fill(); // jaw
  if (light > 0.05) { // rim from the flash
    c.strokeStyle = `rgba(255,190,110,${light * 0.8})`; c.lineWidth = 6; c.beginPath(); c.ellipse(0, 0, 60, 72, 0, -2.6, -0.4); c.stroke();
  }
  const ea = o.eyes ?? 1;
  if (ea > 0) {
    c.globalCompositeOperation = 'lighter';
    for (const ex of [-23, 23]) {
      const gr = c.createRadialGradient(ex, -6, 0, ex, -6, 34);
      gr.addColorStop(0, `rgba(255,236,170,${ea})`); gr.addColorStop(0.25, `rgba(255,170,40,${0.9 * ea})`); gr.addColorStop(1, 'rgba(255,90,0,0)');
      c.fillStyle = gr; ell(c, ex, -6, 34, 34);
      c.fillStyle = `rgba(255,250,220,${ea})`; ell(c, ex, -6, 9, 6, ex > 0 ? -0.3 : 0.3);
    }
    c.globalCompositeOperation = 'source-over';
  }
  c.restore();
  c.restore();
}

// Glowing eyes only (for zombies deep in the dark)
function eyes(c, x, y, s, a) {
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const ex of [-23, 23]) {
    const px = x + ex * s, R = Math.max(5, 30 * s);
    const gr = c.createRadialGradient(px, y, 0, px, y, R);
    gr.addColorStop(0, `rgba(255,236,170,${a})`); gr.addColorStop(0.3, `rgba(255,160,30,${0.8 * a})`); gr.addColorStop(1, 'rgba(255,80,0,0)');
    c.fillStyle = gr; c.fillRect(px - R, y - R, R * 2, R * 2);
  }
  c.restore();
}

// ── lightning (midpoint displacement) ────────────────────────────────────────
function boltPts(x1, y1, x2, y2, seed, detail = 7, rough = 0.28) {
  const r = rng(seed);
  let pts = [[x1, y1], [x2, y2]];
  let disp = Math.hypot(x2 - x1, y2 - y1) * rough;
  for (let k = 0; k < detail; k++) {
    const n = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
      const off = (r() - 0.5) * disp;
      n.push([(ax + bx) / 2 - dy / L * off, (ay + by) / 2 + dx / L * off], pts[i + 1]);
    }
    pts = n; disp *= 0.55;
  }
  return pts;
}
function bolt(c, x1, y1, x2, y2, seed, o = {}) {
  const pts = boltPts(x1, y1, x2, y2, seed, o.detail || 7, o.rough || 0.28);
  const w = o.width || 3, col = o.color || C.cyan, a = o.alpha ?? 1;
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round'; c.lineCap = 'round';
  const path = () => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); };
  path(); c.strokeStyle = col; c.globalAlpha = 0.18 * a; c.lineWidth = w * 9; c.stroke();
  c.globalAlpha = 0.55 * a; c.lineWidth = w * 3; c.stroke();
  c.globalAlpha = a; c.strokeStyle = '#f4feff'; c.lineWidth = w; c.stroke();
  c.restore();
  if (o.branches) {
    const r = rng(seed + 99);
    for (let b = 0; b < o.branches; b++) {
      const i = Math.floor(r() * pts.length * 0.8);
      const [bx, by] = pts[i], L = Math.hypot(x2 - x1, y2 - y1) * (0.15 + r() * 0.25);
      const ang = Math.atan2(y2 - y1, x2 - x1) + (r() - 0.5) * 1.8;
      bolt(c, bx, by, bx + Math.cos(ang) * L, by + Math.sin(ang) * L, seed + b * 17, { width: w * 0.55, color: col, alpha: a * 0.8, detail: 5 });
    }
  }
}

// ── Moroccan zellige lattice ────────────────────────────────────────────────
function zellige(c, x0, y0, cols, rows, S, k, color, alpha = 1, lw = 2, seed = 0) {
  c.save(); c.strokeStyle = color; c.lineWidth = lw;
  const cx = x0 + cols * S / 2, cy = y0 + rows * S / 2, maxD = Math.hypot(cols * S, rows * S) / 2;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = x0 + i * S + S / 2, y = y0 + j * S + S / 2;
    const d = Math.hypot(x - cx, y - cy) / maxD;
    const p = clamp(k * 1.6 - d * 0.6 - hash2(i + seed, j) * 0.2);
    if (p <= 0) continue;
    c.globalAlpha = alpha * p;
    star8(c, x, y, S * 0.42 * (0.6 + 0.4 * p)); c.stroke();
    c.beginPath(); // inner rotated square
    for (let q = 0; q < 4; q++) { const a = Math.PI / 4 + q * Math.PI / 2; c.lineTo(x + Math.cos(a) * S * 0.2, y + Math.sin(a) * S * 0.2); }
    c.closePath(); c.stroke();
    if (p > 0.7) { // links to neighbours
      c.beginPath(); c.moveTo(x + S * 0.42, y); c.lineTo(x + S * 0.58, y); c.moveTo(x, y + S * 0.42); c.lineTo(x, y + S * 0.58); c.stroke();
    }
  }
  c.restore();
}

// ── hardware bits ────────────────────────────────────────────────────────────
function hazard(c, x, y, w, h, off = 0, a = '#f5c400', b = '#0b0b0b') {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = b; c.fillRect(x, y, w, h); c.fillStyle = a;
  const S = h * 1.2;
  for (let i = -2; i < w / S + 3; i++) {
    const px = x + i * S + (off % S);
    c.beginPath(); c.moveTo(px, y + h); c.lineTo(px + S / 2, y + h); c.lineTo(px + S / 2 + h, y); c.lineTo(px + h, y); c.fill();
  }
  c.restore();
}
function barcode(c, x, y, w, h, seed, color) {
  c.fillStyle = color; let px = x; const r = rng(seed);
  while (px < x + w) { const bw = 1 + Math.floor(r() * 4); if (r() > 0.4) c.fillRect(px, y, bw, h); px += bw + 1; }
}
function cropMarks(c, color, a = 0.5, m = 38, L = 30) {
  c.save(); c.strokeStyle = color; c.globalAlpha = a; c.lineWidth = 2; c.beginPath();
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    c.moveTo(x, y + sy * L); c.lineTo(x, y); c.lineTo(x + sx * L, y);
  }
  c.stroke(); c.restore();
}
// COD-style tally marks in blood
function tally(c, x, y, n, s = 1, col = C.red) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = col; c.lineCap = 'round'; c.lineWidth = 14;
  for (let i = 0; i < n; i++) {
    const grp = Math.floor(i / 5), k = i % 5, gx = grp * 150;
    c.beginPath();
    if (k < 4) { const lx = gx + k * 26 + hash(i) * 6; c.moveTo(lx, 0 + hash(i + 3) * 8); c.lineTo(lx + 6 + hash(i + 1) * 6, 110); }
    else { c.moveTo(gx - 16, 18); c.lineTo(gx + 104, 92); }
    c.stroke();
    c.fillStyle = col; c.fillRect(gx + k * 26 + 6, 110, 6, 14 + hash(i + 9) * 30); // drip
  }
  c.restore();
}
