'use strict';
// Boot: fonts → buffers → player. Exposes window.FILM for the offline renderer.

const out = document.getElementById('out');
out.width = W; out.height = H;
const sceneCanvas = mk(W, H);
g = sceneCanvas.getContext('2d');

function renderFrame(t) {
  T = t; FRAME = Math.floor(t * FPS + 1e-6); BLOOM = 1;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  drawScene(t);
  post(sceneCanvas, t);
}

const ready = (async () => {
  const faces = [
    ['Anton', 'Anton.ttf'], ['Black Ops One', 'BlackOpsOne.ttf'], ['Special Elite', 'SpecialElite.ttf'],
    ['VT323', 'VT323.ttf'], ['Share Tech Mono', 'ShareTechMono.ttf'], ['Russo One', 'RussoOne.ttf'],
    ['Reem Kufi', 'ReemKufi.ttf'], ['Noto Sans Tifinagh', 'Tifinagh.ttf'], ['Yuji Boku', 'YujiBoku.ttf'],
    ['Michroma', 'Michroma.ttf'], ['Bebas Neue', 'Bebas.ttf'], ['Oswald', 'Oswald.ttf'],
  ];
  await Promise.all(faces.map(async ([fam, file]) => {
    const f = new FontFace(fam, `url(fonts/${file})`);
    document.fonts.add(await f.load());
  }));
  initPost(out); initArt();
  for (const col of [C.cyan, C.red, C.amber, C.verm, C.green]) halftoneFor(col);
})();

window.FILM = { renderFrame, ready, W, H, FPS, DURATION };

// ── interactive player ───────────────────────────────────────────────────────
if (!new URLSearchParams(location.search).has('render')) {
  const audio = document.getElementById('score');
  const gate = document.getElementById('gate');
  const bar = document.getElementById('bar');
  const qs = new URLSearchParams(location.search);
  let playing = false, clock0 = 0, offset = parseFloat(qs.get('t') || '0'), useAudio = true;

  const now = () => (playing ? (useAudio && !audio.paused ? audio.currentTime : offset + (performance.now() - clock0) / 1000) : offset);

  async function play(from = offset) {
    offset = from; clock0 = performance.now(); playing = true; gate.classList.add('hide');
    try { audio.currentTime = from; await audio.play(); useAudio = true; } catch { useAudio = false; }
  }
  function pause() { offset = now(); playing = false; audio.pause(); }

  ready.then(() => {
    gate.querySelector('b').textContent = '▶  PLAY';
    renderFrame(offset);
    gate.addEventListener('click', () => play(offset >= DURATION ? 0 : offset));
    // Embedded in a larger page, shortcuts only apply while the stage has focus.
    const keyTarget = window.FILM_EMBED ? document.getElementById('stage') : window;
    keyTarget.addEventListener('keydown', e => {
      if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(now() >= DURATION ? 0 : now()); }
      if (e.key === 'r') play(0);
      if (e.key === 'f') (window.FILM_EMBED ? document.getElementById('stage') : document.documentElement).requestFullscreen?.();
      if (e.key === 'ArrowRight') { const t = Math.min(DURATION, now() + 1); playing ? play(t) : (offset = t, renderFrame(t)); }
      if (e.key === 'ArrowLeft') { const t = Math.max(0, now() - 1); playing ? play(t) : (offset = t, renderFrame(t)); }
    });
    Object.assign(window.FILM, { play, pause, isPlaying: () => playing });
    (function loop() {
      const t = now();
      if (playing) {
        if (t >= DURATION) { pause(); offset = DURATION; gate.classList.remove('hide'); gate.querySelector('b').textContent = '↻  AGAIN'; }
        else renderFrame(t);
      }
      bar.style.width = (Math.min(t, DURATION) / DURATION * 100) + '%';
      requestAnimationFrame(loop);
    })();
  });
}
