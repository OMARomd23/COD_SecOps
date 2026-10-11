"""
CALL OF DUTY: SEC OPS — procedural score + sound design.

Everything here is synthesized from oscillators and noise (no samples), and
locked to the same cue sheet as film/js/scenes.js: 120 BPM, one bar per
character entrance, every cut and hit on the grid.

    python3 audio/score.py            → audio/score.wav + film/audio/score.mp3
"""
import os
import subprocess
import wave

import numpy as np

SR = 48000
DUR = 29.5
N = int(SR * DUR)
BEAT = 0.5
rng = np.random.default_rng(115)

L = np.zeros(N)
R = np.zeros(N)
REV = np.zeros(N)  # reverb send (mono)


# ── helpers ──────────────────────────────────────────────────────────────────
def tt(d):
    return np.arange(int(d * SR)) / SR


def env_exp(d, k):
    return np.exp(-tt(d) * k)


def lp(x, fc):
    """one-pole low-pass (fc may be an array)"""
    a = np.exp(-2 * np.pi * np.asarray(fc, dtype=float) / SR) * np.ones(len(x))
    y = np.empty_like(x)
    s = 0.0
    for i in range(len(x)):
        s = (1 - a[i]) * x[i] + a[i] * s
        y[i] = s
    return y


def lp_fast(x, fc):
    """FFT brick-ish low-pass for static cutoffs (fast)"""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / fc) ** 4)
    return np.fft.irfft(X, len(x))


def hp_fast(x, fc):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (fc / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X, len(x))


def bp_fast(x, lo, hi):
    return hp_fast(lp_fast(x, hi), lo)


def noise(d):
    return rng.standard_normal(int(d * SR))


def saw(f, d, phase=0.0):
    ph = np.cumsum(np.full(int(d * SR), f) if np.isscalar(f) else f) / SR + phase
    return 2 * (ph % 1) - 1


def sq(f, d):
    return np.sign(np.sin(2 * np.pi * np.cumsum(np.full(int(d * SR), f) if np.isscalar(f) else f) / SR))


def sine(f, d):
    return np.sin(2 * np.pi * np.cumsum(np.full(int(d * SR), f) if np.isscalar(f) else f) / SR)


def put(sig, t, gain=1.0, pan=0.0, rev=0.0):
    i = int(t * SR)
    if i >= N or i + len(sig) <= 0:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    sig = sig[: N - i] * gain
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(sig)] += sig * gl * 1.414
    R[i:i + len(sig)] += sig * gr * 1.414
    if rev:
        REV[i:i + len(sig)] += sig * rev


def note(n):  # midi → Hz
    return 440 * 2 ** ((n - 69) / 12)


# ── instruments ──────────────────────────────────────────────────────────────
def kick(d=0.45, f0=160, f1=42):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t * 28)
    s = sine(f, d) * np.exp(-t * 7.5)
    click = noise(0.006) * np.linspace(1, 0, int(0.006 * SR)) * 0.5
    s[: len(click)] += click
    return np.tanh(s * 1.6)


def snare(d=0.25):
    t = tt(d)
    body = sine(190 * (1 + 0.3 * np.exp(-t * 40)), d) * np.exp(-t * 22) * 0.6
    sn = bp_fast(noise(d), 1200, 9000) * np.exp(-t * 16)
    return body + sn * 0.9


def hat(d=0.05, k=90):
    return hp_fast(noise(d), 7000) * env_exp(d, k)


def tick(d=0.012):
    return hp_fast(noise(d), 3000) * env_exp(d, 400)


def boom(d=2.2, f=44):
    t = tt(d)
    s = sine(f * (1 + 0.6 * np.exp(-t * 6)), d) * np.exp(-t * 2.2)
    rum = lp_fast(noise(d), 160) * np.exp(-t * 3) * 1.4
    return np.tanh((s + rum) * 1.5)


def braam(d=2.0, root=33, bright=1.0):
    """detuned brass-ish saw stack, filter closing"""
    t = tt(d)
    s = np.zeros(len(t))
    for n_, det in [(root, -0.07), (root, 0.06), (root + 12, 0.11), (root + 12, -0.09), (root + 7, 0.0), (root + 19, 0.05)]:
        s += saw(note(n_ + det), d, rng.random())
    cutoff = 180 + 2600 * bright * np.exp(-t * 3.2)
    s = lp(s, cutoff)
    a = np.minimum(1, t / 0.015) * np.exp(-t * 1.4)
    return np.tanh(s * a * 0.6) * 1.2


def impact(big=1.0):
    d = 2.4
    s = np.zeros(int(d * SR))
    b = boom(d)
    s += b * 0.9
    k = kick(0.6, 220, 38)
    s[: len(k)] += k * 0.9
    crash = hp_fast(noise(d), 2500) * env_exp(d, 3.5) * 0.25
    s += crash
    return s * big


def zap(d=0.5, seed=0):
    r = np.random.default_rng(seed)
    t = tt(d)
    gate = (r.random(int(d * 600)) > 0.45).repeat(SR // 600 + 1)[: len(t)]
    buzz = sq(60 + 40 * r.random(), d) * 0.5 + saw(120 * (1 + 0.5 * np.sin(t * 80)), d) * 0.4
    crack = hp_fast(noise(d), 2000) * gate
    return (crack * 0.8 + buzz * gate * 0.5) * np.exp(-t * 5)


def gunshot(d=0.6):
    t = tt(d)
    crack = noise(d) * np.exp(-t * 60)
    body = lp_fast(noise(d), 900) * np.exp(-t * 14) * 1.6
    thump = sine(90 * (1 + np.exp(-t * 50)), d) * np.exp(-t * 16)
    return np.tanh((crack + body + thump) * 1.4)


def shing(d=1.4):
    t = tt(d)
    s = np.zeros(len(t))
    for f, k in [(2210, 2.0), (3470, 2.6), (5190, 3.0), (6830, 3.8), (8890, 4.4), (11100, 5.0)]:
        s += np.sin(2 * np.pi * f * t * (1 + 0.002 * np.sin(t * 30))) * np.exp(-t * k)
    swish = bp_fast(noise(0.25), 1500, 9000) * np.hanning(int(0.25 * SR))
    s[: len(swish)] += swish * 2
    return s * 0.25


def glitch(d=0.5, seed=0):
    r = np.random.default_rng(seed)
    out = np.zeros(int(d * SR))
    i = 0
    while i < len(out):
        seg = int(SR * (0.008 + r.random() * 0.05))
        kind = r.integers(4)
        tt_ = np.arange(seg) / SR
        if kind == 0:
            x = np.sign(np.sin(2 * np.pi * (200 + r.random() * 3000) * tt_))
        elif kind == 1:
            x = r.standard_normal(seg)
        elif kind == 2:
            x = np.round(np.sin(2 * np.pi * (80 + r.random() * 400) * tt_) * 3) / 3
        else:
            x = np.zeros(seg)
        out[i:i + seg] = x[: len(out) - i] * (0.3 + r.random() * 0.7)
        i += seg
    return out * 0.5


def ping(f=1760, d=0.6):
    t = tt(d)
    return (sine(f, d) + 0.3 * sine(f * 2.01, d)) * np.exp(-t * 9)


def blip(fs=(880, 1320, 1760)):
    out = np.zeros(int(0.32 * SR))
    for k, f in enumerate(fs):
        s = sq(f, 0.09) * env_exp(0.09, 30) * 0.35
        i = int(k * 0.07 * SR)
        out[i:i + len(s)] += s
    return out


def klaxon(d=1.0):
    t = tt(d)
    f = np.where((t * 4).astype(int) % 2 == 0, 640, 820)
    s = lp_fast(saw(f, d) + 0.5 * sq(f * 0.5, d), 2400)
    return s * 0.4


def growl(d=1.2, f=70, seed=0):
    r = np.random.default_rng(seed)
    t = tt(d)
    fm = f * (1 + 0.25 * np.sin(2 * np.pi * (5 + 3 * r.random()) * t) + 0.1 * r.standard_normal(len(t)).cumsum() / SR)
    src = saw(fm, d) * (0.6 + 0.4 * lp_fast(r.standard_normal(len(t)), 30) * 6)
    s = bp_fast(src + 0.3 * noise(d), 180, 1400)
    a = np.minimum(1, t / 0.15) * np.minimum(1, (d - t) / 0.3)
    return np.tanh(s * a * 2) * 0.5


def riser(d, f0=200, f1=4000):
    t = tt(d)
    k = t / d
    s = bp_fast(noise(d), 300, 9000) * (k ** 2)
    tone = saw(f0 * (f1 / f0) ** k, d) * (k ** 3) * 0.25
    return lp(s * 0.5 + tone, 400 + 9000 * k)


def music_box(n, d=1.2):
    f = note(n)
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 4.02 * t) * np.exp(-t * 12) + 0.15 * np.sin(2 * np.pi * f * 6.9 * t) * np.exp(-t * 20)
    return s * np.exp(-t * 3.2) * 0.25


def bass16(t0, t1, root=33, gain=0.5, pattern=(0, 0, 12, 0, 0, 12, 0, 15, 0, 0, 12, 0, 13, 0, 12, 10)):
    step = BEAT / 4
    k = 0
    t = t0
    while t < t1 - 1e-6:
        n_ = root + pattern[k % len(pattern)]
        d = step * 0.9
        s = saw(note(n_), d) + 0.6 * sq(note(n_ - 12), d)
        s = lp_fast(s, 700) * env_exp(d, 9)
        put(np.tanh(s * 1.5), t, gain, pan=0)
        k += 1
        t += step


# ── the score ────────────────────────────────────────────────────────────────
def pad(t0, d, notes, gain=0.12, cutoff=900):
    s = np.zeros(int(d * SR))
    for n_ in notes:
        for det in (-0.08, 0.08):
            s += saw(note(n_ + det), d, rng.random())
    t = tt(d)
    s = lp_fast(s, cutoff) * np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.4)
    put(s, t0, gain, pan=-0.3, rev=0.15)
    put(s, t0 + 0.011, gain, pan=0.3)


# 0.0 — CRT power-on
put(sine(np.linspace(9000, 15000, int(0.3 * SR)), 0.3) * env_exp(0.3, 8) * 0.08, 0.0)
put(kick(0.3, 120, 40) * 0.6, 0.0)
put(glitch(0.3, 1), 0.0, 0.5)

# drone under the cold open + door
pad(0.0, 4.6, [33, 40, 45], gain=0.10, cutoff=500)
# creepy music box (A minor with a raised-4th sting)
for i, (n_, tn) in enumerate([(81, 0.5), (84, 1.0), (88, 1.5), (87, 2.0), (93, 2.5), (92, 2.75)]):
    put(music_box(n_), tn + 0.02, 0.7, pan=0.4 * ((-1) ** i), rev=0.4)

# joke lines — one slam per beat with a typewriter burst
for i in range(5):
    tn = 0.5 + i * 0.5
    put(kick(0.4, 140, 45), tn, 0.8)
    put(hp_fast(noise(0.12), 1500) * env_exp(0.12, 30), tn, 0.4, rev=0.2)
    for k in range(7):
        put(tick(), tn + 0.02 + k * 0.025, 0.25, pan=0.2)
# punchline
put(impact(0.8), 3.0, 0.8, rev=0.3)
put(braam(1.2, 33, 0.6), 3.0, 0.4, rev=0.3)

# 3.5 — door: clanks, ratchet, hiss, boom
put(glitch(0.18, 2), 3.5, 0.6)
for i, tn in enumerate([3.55, 3.8, 4.05]):
    c = np.zeros(int(0.6 * SR))
    for f in (180, 433, 711, 1290):
        c += sine(f * (1 + 0.02 * i), 0.6) * env_exp(0.6, 9 + f / 300)
    put(c * 0.35, tn, 0.9, rev=0.35)
    put(kick(0.3, 100, 50) * 0.5, tn, 0.9)
for k in range(30):
    put(tick(0.01) * 0.6, 3.55 + k * 0.018, 0.4, pan=0.1)
put(hp_fast(noise(0.45), 2000) * np.linspace(0, 1, int(0.45 * SR)) ** 2, 4.05, 0.45, rev=0.2)
put(riser(0.9, 120, 2000), 3.6, 0.35)

# 4.5 → 14.5 — the entrances, a bar each, on a pounding beat
BAR0 = 4.5
for b in range(20):  # 20 beats
    tn = BAR0 + b * BEAT
    if 10.5 <= tn < 11.0:  # the slash gets a beat of silence
        continue
    put(kick(), tn, 0.95)
    if b % 2 == 1:
        put(snare(), tn, 0.5, rev=0.2)
    for h in range(2):
        put(hat(), tn + h * 0.25, 0.18 if h else 0.1, pan=0.35)
bass16(4.5, 10.5, root=33, gain=0.32)
bass16(11.0, 14.5, root=33, gain=0.32)
for tn in [4.5, 6.5, 8.5, 10.5, 12.5]:
    put(impact(0.75), tn, 0.7, rev=0.25)

# German — electric
put(zap(0.9, 3), 4.5, 0.9, pan=-0.2, rev=0.3)
for k in range(6):
    put(zap(0.15, 10 + k), 4.75 + k * 0.27, 0.35, pan=rng.uniform(-0.6, 0.6))
# Russian — drop and SLAM
put(riser(0.18, 2000, 200) * 0.5, 6.5, 0.6)
put(impact(1.3), 6.68, 1.0, rev=0.3)
put(braam(1.6, 28, 0.8), 6.68, 0.55, rev=0.3)
# American — three shots on 16ths, then a few more
for k, tn in enumerate([8.5, 8.625, 8.75, 9.25, 9.375, 10.0]):
    put(gunshot(), tn, 0.8 if k < 3 else 0.45, pan=rng.uniform(-0.5, 0.5), rev=0.3)
for k in range(8):  # brass casings
    put(sine(4200 + 300 * k, 0.15) * env_exp(0.15, 30) * 0.1, 8.6 + k * 0.09, 0.6, pan=0.6)
# Japanese — the cut
put(shing(1.6), 10.5, 1.0, pan=0.2, rev=0.5)
put(hp_fast(noise(0.08), 800) * env_exp(0.08, 40), 10.5, 0.8)
# Moroccan — glitch storm, modem chirps
put(glitch(0.6, 7), 12.5, 0.9)
for k in range(10):
    f = 1200 + 2400 * rng.random()
    put(sq(f, 0.04) * 0.25, 12.6 + k * 0.11, 0.4, pan=rng.uniform(-0.7, 0.7))
put(glitch(0.15, 8), 13.4, 0.6)
# rubber stamps
for i in range(5):
    tn = 4.5 + i * 2 + 0.86
    put(kick(0.2, 90, 50) * 0.9 + lp_fast(noise(0.2), 600) * env_exp(0.2, 30), tn, 0.7)

# 14.5 — the scan: beat drops away, clock ticks, pings
put(glitch(0.15, 9), 14.45, 0.7)
pad(14.5, 4.5, [33, 34, 45, 46], gain=0.09, cutoff=600)   # A/Bb dissonance
for k in range(int(2.5 / 0.125)):
    put(tick(0.008), 14.5 + k * 0.125, 0.35 if k % 4 == 0 else 0.18, pan=0.25)
for k in range(30):
    put(tick(0.006), 14.52 + k * 0.022, 0.12, pan=-0.3)  # typing
for i in range(7):
    put(ping(1760 if i % 2 else 1318), 15.5 + i * 0.22, 0.5, pan=-0.6 + i * 0.2, rev=0.4)
    put(sq(220, 0.05) * env_exp(0.05, 50), 15.5 + i * 0.22, 0.3)
put(riser(1.6, 80, 1800), 15.4, 0.35)
for k in range(24):  # counter roll accelerating
    put(tick(0.005), 15.6 + 1.4 * (k / 24) ** 0.6, 0.25, pan=0.6)

# 17.0 — EVERYTHING · IS · VULNERABLE.
for tn, root, g_ in [(17.0, 33, 0.7), (17.25, 33, 0.7), (17.5, 28, 1.0)]:
    put(impact(g_), tn, 0.9, rev=0.35)
    put(braam(1.5 if tn < 17.5 else 2.0, root, 1.0), tn, 0.6 * g_, rev=0.4)

# 18.0 — containment breach
put(klaxon(1.0), 18.0, 0.55, pan=-0.2, rev=0.3)
for b in range(2):
    put(kick(), 18.0 + b * BEAT, 0.9)
for k in range(6):
    put(growl(0.9, 60 + 15 * k, 20 + k), 18.3 + k * 0.08, 0.35, pan=-0.8 + 0.32 * k, rev=0.3)
put(glitch(0.25, 11), 18.75, 0.7)

# 19.0 → 24.45 — chaos
for b in range(int((24.5 - 19.0) / BEAT)):
    tn = 19.0 + b * BEAT
    put(kick(), tn, 1.0)
    if b % 2 == 1:
        put(snare(), tn, 0.6, rev=0.2)
    for h in range(4):
        put(hat(0.04, 120), tn + h * 0.125, 0.14, pan=0.4)
bass16(19.0, 23.0, root=33, gain=0.42)
bass16(23.0, 24.45, root=36, gain=0.45, pattern=(0, 12, 0, 12, 3, 15, 3, 15, 5, 17, 5, 17, 7, 19, 7, 19))
put(braam(1.6, 33, 1.0), 19.0, 0.6, rev=0.3)
put(impact(0.9), 19.0, 0.8)
# gunfire on 8ths (matches muzzleLight in scenes.js) during the horde + CCTV
for k in range(int(4.0 / 0.25)):
    tn = 19.0 + k * 0.25
    if 20.0 <= tn < 21.0:
        continue
    put(gunshot(0.35), tn, 0.28, pan=-0.5 if k % 2 else -0.2, rev=0.2)
for k in range(10):
    put(zap(0.25, 40 + k), 19.1 + k * 0.42, 0.35, pan=0.6, rev=0.2)
for k in range(9):
    put(growl(1.0, 55 + 10 * (k % 4), 60 + k), 19.0 + k * 0.6, 0.35, pan=rng.uniform(-0.8, 0.8), rev=0.35)
put(shing(1.0), 19.62, 0.6, pan=0.3, rev=0.4)
# the hack: typing + "pwned" blip
for k in range(40):
    put(tick(0.006), 20.0 + k * 0.012 + (k // 10) * 0.08, 0.2, pan=0.2)
put(blip((660, 990, 1320)), 20.5, 0.6, rev=0.3)
put(impact(0.8), 20.0, 0.6)
for tn in (19.95, 20.95, 22.0, 23.0):
    put(glitch(0.14, int(tn * 10)), tn, 0.6)
# CCTV: each feed falls with a rising blip
for i, tn in enumerate([21.25, 21.5, 21.75, 22.0, 22.25, 22.5]):
    put(blip((440 * 2 ** (i / 6), 660 * 2 ** (i / 6), 880 * 2 ** (i / 6))), tn, 0.45, pan=-0.6 + i * 0.24, rev=0.25)
    for k in range(8):
        put(tick(0.006), tn - 0.25 + k * 0.025, 0.15)
put(shing(0.6), 21.75, 0.35, pan=0.2)
# 23.0 — patch everything: snare roll + riser
put(impact(0.9), 23.0, 0.8, rev=0.3)
roll_t = 23.0
k = 0
while roll_t < 24.45:
    put(snare(0.12), roll_t, 0.25 + 0.4 * (roll_t - 23.0) / 1.45, rev=0.2)
    roll_t += max(0.03, 0.125 * (1 - (roll_t - 23.0) / 1.6))
    k += 1
put(riser(1.45, 150, 6000), 23.0, 0.55)
put(glitch(0.6, 77), 23.6, 0.3)

# 24.45 — white-out, then the CRT dies
put(impact(1.2), 24.45, 1.0, rev=0.15)
put(sine(np.geomspace(1200, 40, int(0.45 * SR)), 0.45) * env_exp(0.45, 4) * 0.35, 24.55)
put(hp_fast(noise(0.3), 4000) * env_exp(0.3, 10) * 0.2, 24.55)


# 25.6 — CALL OF DUTY: SEC OPS
put(impact(1.5), 25.6, 1.0, rev=0.6)
put(braam(3.4, 33, 1.0), 25.6, 0.75, rev=0.6)
put(boom(3.5, 38), 25.6, 0.6)
put(glitch(0.5, 99), 25.6, 0.5)
pad(25.7, 3.8, [45, 48, 52, 57], gain=0.09, cutoff=1200)
for k in range(6):
    put(zap(0.2, 120 + k), 25.85 + k * 0.22, 0.3, pan=rng.uniform(-0.6, 0.6), rev=0.3)
for i, (n_, tn) in enumerate([(81, 26.9), (84, 27.3), (88, 27.7), (87, 28.1)]):
    put(music_box(n_, 1.6), tn, 0.6, pan=0.3 * ((-1) ** i), rev=0.5)
for k in range(14):
    put(tick(0.006), 27.6 + k * 0.028, 0.18, pan=-0.4)
for k in range(16):
    put(tick(0.006), 28.2 + k * 0.025, 0.18, pan=-0.4)
put(growl(1.2, 52, 999), 28.55, 0.6, pan=0.6, rev=0.5)
put(glitch(0.4, 666), 29.1, 0.8)

# ── reverb + master ──────────────────────────────────────────────────────────
ir_t = tt(2.6)
ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 2.4)
ir = lp_fast(ir, 5000)
ir /= np.sqrt(np.sum(ir ** 2))
size = 1 << int(np.ceil(np.log2(N + len(ir))))
wet = np.fft.irfft(np.fft.rfft(REV, size) * np.fft.rfft(ir, size), size)[:N]
ir2 = np.roll(ir, 331)
wet2 = np.fft.irfft(np.fft.rfft(REV, size) * np.fft.rfft(ir2, size), size)[:N]
L += wet * 0.55
R += wet2 * 0.55

# the beat of silence before the title: duck everything, then let the keystrokes in
duck = np.ones(N)
a, b, c = int(24.75 * SR), int(24.95 * SR), int(25.55 * SR)
duck[a:b] = np.linspace(1, 0.04, b - a)
duck[b:c] = 0.04
L *= duck
R *= duck
for k in range(13):
    put(tick(0.008), 25.05 + k * 0.03, 0.22)
sw = hp_fast(noise(0.55), 800) * np.linspace(0, 1, int(0.55 * SR)) ** 3  # reverse swell into the title
put(sw, 25.05, 0.5)

mix = np.stack([L, R])
mix -= mix.mean(axis=1, keepdims=True)
mix = mix / np.max(np.abs(mix)) * 1.6
mix = np.tanh(mix) * 0.92                       # glue / soft clip
fade = np.ones(N)
fade[-int(0.12 * SR):] = np.linspace(1, 0, int(0.12 * SR))  # matches the final cut
mix *= fade
mix = mix / np.max(np.abs(mix)) * 0.97

here = os.path.dirname(os.path.abspath(__file__))
wav = os.path.join(here, 'score.wav')
with wave.open(wav, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
mp3 = os.path.join(here, '..', 'film', 'audio', 'score.mp3')
os.makedirs(os.path.dirname(mp3), exist_ok=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '256k', mp3], check=True)
print('wrote', wav, 'and', os.path.normpath(mp3))
