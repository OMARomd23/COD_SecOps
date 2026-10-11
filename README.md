# CALL OF DUTY: SEC OPS — motion graphics film

A ~28.5-second, 1080p/30fps title-sequence film where **Call of Duty: Zombies**
collides with a **high-end cybersecurity title sequence**.

> *A German scientist, a Russian soldier, an American soldier, a Japanese
> warrior, and a Moroccan hacker walk into a secret underground bunker.
> The others fight the horror. **He hacks it.***

> ⚠️ **Non-commercial fan work.** "Call of Duty" is a trademark of its owners.
> This was made for personal fun and learning, uses **no** official assets,
> art, logos, or audio, and is not for commercial use.

## Watch

- `film/COD_SecOps.mp4` — the rendered film (H.264 + AAC stereo).
- `film/index.html` — the **live** version. Open in a browser; it autoplays
  and fits any window. Click to replay.

## The sequence

| t (s)      | Beat |
|------------|------|
| 0.0–3.3    | Cold open — SUBLEVEL 7 boot log, red alert, `// CLASSIFIED //` slam |
| 3.3–6.1    | **№001 · THE ARCHITECT** — Dr. Klaus Reinholt (schematic assembly, cyan) |
| 6.1–8.9    | **№002 · THE HAMMER** — Viktor Morozov (Cyrillic, hazard slabs, snow, red) |
| 8.9–11.7   | **№003 · THE STORM** — Sgt. Ray Callahan (searchlights, rotor strobe, amber) |
| 11.7–14.5  | **№004 · THE BLADE** — Kenji Takanashi (red sun, ink slash, kanji, crimson) |
| 14.5–17.5  | **№005 · THE GHOST** — Amine "Z3RO" El Fassi (Tifinagh/Arabic matrix rain, green) |
| 17.5–22.8  | **THE HACK** — live terminal, network diagram, 6 subsystems go `OWNED`, "ENTIRE FACILITY COMPROMISED" |
| 22.8–25.4  | **THEY FIGHT / HE HACKS** split screen → `ACCESS GRANTED` |
| 25.4–28.5  | Title card — **CALL OF DUTY / SEC OPS** |

Each character card carries its own language, typeface, color world, flag
stripes, dossier stat bars, classified stamp, and an iconic (original) SVG
silhouette.

## How it's built

Everything is a self-contained, deterministic web animation — a single master
`seek(t)` fully defines every frame, so the same engine drives **live playback
and frame-accurate offline rendering**.

- `film/index.html` — stage + viewport fit
- `film/film.js` — the whole timeline, canvas FX (CRT scanlines, grain,
  glitch slices, matrix rain, network graph, muzzle flashes, embers) and the
  DOM typography/cards
- `film/style.css` — layout & styling of the HUD, cards, terminal, title
- `film/fonts.css` — 11 open-source fonts embedded as base64 (fully offline)
- `film/render.mjs` — Playwright renderer: seeks `index.html` frame-by-frame
  at 1920×1080 and writes PNGs
- `film/build_audio.sh` — **procedural** cinematic sound design synthesized
  entirely with ffmpeg (drone, alarm, entrance impacts/whoosh, typing bed,
  beeps, riser, heartbeat, title chord) — no external samples

## Rebuild from scratch

```bash
cd film
node render.mjs                 # -> film/frames/*.png  (855 frames)
bash build_audio.sh             # -> /tmp/cod_audio/master.wav
ffmpeg -y -framerate 30 -i frames/%04d.png -i /tmp/cod_audio/master.wav \
  -vf format=yuv420p -c:v libx264 -preset slow -crf 17 \
  -c:a aac -b:a 192k -movflags +faststart -shortest COD_SecOps.mp4
```

### Fonts (all OFL / open source)
Black Ops One, Anton, JetBrains Mono, VT323, Russo One, Special Elite,
Dela Gothic One, Reem Kufi, Noto Sans Tifinagh.
