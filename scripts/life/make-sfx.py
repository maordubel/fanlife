#!/usr/bin/env python3
"""
הסאונד — a library of sound effects, synthesised offline, no recordings.

Every file under public/life/sfx is made here from noise, sines and envelopes. Nothing
is sampled from a real terrace, a real song or a real radio, which for a game about a
club whose songs are still sung is the honest position (no invented media, no licence
questions). What offline synthesis buys over the in-browser synth in `audio.ts` is
RICHNESS: forty layered voices for a crowd, a physically-modelled darbuka skin, a
buzzer with the right harmonics, a bus that idles like a bus. The browser still adds
jitter in pitch and gain so no two plays are the same.

Output: 22 050 Hz mono, `.ogg` (Vorbis q3) for everything, `.m4a` (AAC) for Safari.

    python3 scripts/life/make-sfx.py
"""
from __future__ import annotations

import json
import math
import os
import subprocess
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 22050
OUT = Path('public/life/sfx')
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(1926)


# ----------------------------------------------------------------------------- tools --

def t(seconds: float) -> np.ndarray:
    return np.arange(int(SR * seconds)) / SR


def env(n: int, a: float, d: float, s: float, r: float, hold: float = 0.0) -> np.ndarray:
    """ADSR in seconds over n samples; sustain level s."""
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    h_n = max(0, n - a_n - d_n - r_n)
    parts = [
        np.linspace(0, 1, max(1, a_n)),
        np.linspace(1, s, max(1, d_n)),
        np.full(h_n, s),
        np.linspace(s, 0, max(1, r_n)),
    ]
    e = np.concatenate(parts)[:n]
    if len(e) < n:
        e = np.pad(e, (0, n - len(e)))
    return e


def fit(e: np.ndarray, n: int) -> np.ndarray:
    return e[:n] if len(e) >= n else np.pad(e, (0, n - len(e)), mode='edge')


def noise(seconds: float, colour: str = 'white') -> np.ndarray:
    n = int(SR * seconds)
    w = rng.standard_normal(n)
    if colour == 'white':
        return w
    if colour == 'pink':
        b, a = signal.butter(1, 0.08)
        return signal.lfilter(b, a, w) * 3
    if colour == 'brown':
        x = np.cumsum(w)
        x -= np.linspace(x[0], x[-1], n)
        return x / (np.abs(x).max() + 1e-9)
    raise ValueError(colour)


def bp(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    b, a = signal.butter(order, [lo / (SR / 2), min(hi, SR / 2 - 1) / (SR / 2)], btype='band')
    return signal.lfilter(b, a, x)


def lp(x: np.ndarray, hz: float, order: int = 2) -> np.ndarray:
    b, a = signal.butter(order, min(hz, SR / 2 - 1) / (SR / 2))
    return signal.lfilter(b, a, x)


def hp(x: np.ndarray, hz: float, order: int = 2) -> np.ndarray:
    b, a = signal.butter(order, hz / (SR / 2), btype='high')
    return signal.lfilter(b, a, x)


def norm(x: np.ndarray, peak: float = 0.9) -> np.ndarray:
    m = np.abs(x).max() + 1e-9
    return x / m * peak


def fade(x: np.ndarray, ms_in: float = 5, ms_out: float = 30) -> np.ndarray:
    n_in, n_out = int(SR * ms_in / 1000), int(SR * ms_out / 1000)
    x = x.copy()
    if n_in:
        x[:n_in] *= np.linspace(0, 1, n_in)
    if n_out:
        x[-n_out:] *= np.linspace(1, 0, n_out)
    return x


def loopable(x: np.ndarray, ms: float = 400) -> np.ndarray:
    """crossfade the tail into the head so the file loops without a click"""
    n = int(SR * ms / 1000)
    head, tail = x[:n].copy(), x[-n:].copy()
    ramp = np.linspace(0, 1, n)
    out = x[:-n].copy()
    out[:n] = head * ramp + tail * (1 - ramp)
    return out


def sine(freq: float, seconds: float, phase: float = 0.0) -> np.ndarray:
    return np.sin(2 * math.pi * freq * t(seconds) + phase)


def glide(f0: float, f1: float, seconds: float, curve: float = 1.0) -> np.ndarray:
    tt = t(seconds)
    k = (tt / seconds) ** curve
    f = f0 * (f1 / f0) ** k
    phase = 2 * math.pi * np.cumsum(f) / SR
    return np.sin(phase)


def mix(*parts: tuple[np.ndarray, float]) -> np.ndarray:
    n = max(len(p) for p, _ in parts)
    out = np.zeros(n)
    for p, g in parts:
        out[: len(p)] += p * g
    return out


def place(base: np.ndarray, x: np.ndarray, at: float, g: float = 1.0) -> None:
    i = int(at * SR)
    j = min(len(base), i + len(x))
    if i < len(base):
        base[i:j] += x[: j - i] * g


LIB: dict[str, dict] = {}


def save(name: str, x: np.ndarray, loop: bool = False, tags: list[str] | None = None) -> None:
    x = np.clip(x, -1, 1)
    wav = OUT / f'{name}.wav'
    wavfile.write(wav, SR, (x * 32767).astype(np.int16))
    for ext, args in (('ogg', ['-c:a', 'libvorbis', '-q:a', '3']), ('m4a', ['-c:a', 'aac', '-b:a', '64k'])):
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), *args, str(OUT / f'{name}.{ext}')], check=True)
    wav.unlink()
    LIB[name] = {'seconds': round(len(x) / SR, 2), 'loop': loop, 'tags': tags or []}
    print(f'{name:22s} {len(x) / SR:5.2f}s')


# ----------------------------------------------------------------------------- crowd --

def crowd_bed(seconds: float, voices: int = 40, lo: float = 150, hi: float = 2500) -> np.ndarray:
    """many mouths: bandpassed noise per voice with its own slow amplitude wobble"""
    n = int(SR * seconds)
    out = np.zeros(n)
    for _ in range(voices):
        centre = float(rng.uniform(lo, hi))
        width = centre * float(rng.uniform(0.15, 0.5))
        v = bp(noise(seconds, 'white'), max(40, centre - width), centre + width, 2)
        wob = 0.6 + 0.4 * np.sin(2 * math.pi * float(rng.uniform(0.2, 1.8)) * t(seconds) + float(rng.uniform(0, 6.28)))
        out += v * wob / voices
    return out


def crowd() -> None:
    # a goal: up in a third of a second, eight seconds down, with a few voices that stay high
    x = crowd_bed(8, 48, 200, 3200)
    e = fit(np.concatenate([np.linspace(0, 1, int(0.35 * SR)), np.full(int(1.4 * SR), 1.0), np.geomspace(1, 0.02, int(6.25 * SR))]), len(x))
    high = bp(noise(8, 'white'), 1800, 4200, 2) * env(len(x), 0.2, 2.0, 0.15, 5.0)
    save('crowd-goal', fade(norm(mix((x * e, 1.0), (high, 0.25)), 0.95), 10, 800), tags=['terrace'])
    # a swell: the crowd rising before something
    x = crowd_bed(3.5, 32, 200, 2600) * env(int(3.5 * SR), 1.6, 0.6, 0.7, 1.2)
    save('crowd-swell', fade(norm(x, 0.8), 30, 400), tags=['terrace'])
    # a groan: down, disappointed
    x = crowd_bed(2.6, 36, 120, 900) * env(int(2.6 * SR), 0.15, 0.5, 0.5, 1.9)
    ooh = glide(260, 170, 2.6) * env(int(2.6 * SR), 0.1, 0.4, 0.4, 2.0) * 0.15
    save('crowd-groan', fade(norm(mix((x, 1.0), (ooh, 1.0)), 0.8), 20, 500), tags=['terrace'])
    # a hush: the moment everybody understands
    x = crowd_bed(3.0, 30, 150, 1400)
    e = fit(np.concatenate([np.full(int(0.4 * SR), 0.9), np.geomspace(0.9, 0.03, int(2.6 * SR))]), len(x))
    save('crowd-hush', fade(norm(x * e, 0.7), 20, 900), tags=['terrace'])
    # claps: a terrace clapping a 3-rest-2 pattern, forty pairs of hands not quite together
    seconds = 4.0
    x = np.zeros(int(SR * seconds))
    pattern = [0.0, 0.33, 0.66, 1.32, 1.65]  # three, a rest, two — at 90 bpm
    for bar in range(2):
        for beat in pattern:
            for _ in range(40):
                at = bar * 2.0 + beat + float(rng.normal(0, 0.018))
                clap = bp(noise(0.06, 'white'), 900, 4000, 2) * env(int(0.06 * SR), 0.002, 0.03, 0.2, 0.03)
                place(x, clap, max(0, at), 0.06)
    save('crowd-claps', fade(norm(x, 0.85), 5, 200), tags=['terrace', 'rhythm'])
    # the hall crowd loop and the stadium crowd loop — beds for ambience
    save('amb-stadium', loopable(norm(crowd_bed(9, 56, 120, 2400) + bp(noise(9, 'brown'), 40, 200) * 0.4, 0.6), 700), loop=True, tags=['amb'])
    hall = crowd_bed(9, 40, 250, 3000)
    # a hall rings: a short reverb-ish smear
    ir = np.exp(-np.linspace(0, 6, int(0.35 * SR))) * rng.standard_normal(int(0.35 * SR))
    hall = signal.fftconvolve(hall, ir / np.abs(ir).sum() * 3)[: len(hall)]
    save('amb-hall', loopable(norm(hall, 0.6), 700), loop=True, tags=['amb'])


# ------------------------------------------------------------------- referee & hall --

def whistle(blasts: int, name: str) -> None:
    seconds = 0.34 * blasts + 0.5
    x = np.zeros(int(SR * seconds))
    for i in range(blasts):
        last = i == blasts - 1
        dur = 0.55 if last else 0.22
        tt = t(dur)
        f = 2380 + 70 * np.sin(2 * math.pi * 29 * tt)
        tone = np.sin(2 * math.pi * np.cumsum(f) / SR)
        tone = mix((tone, 1.0), (np.sin(2 * math.pi * np.cumsum(f * 2) / SR), 0.25), (bp(noise(dur, 'white'), 2000, 3200), 0.35))
        e = env(len(tone), 0.012, 0.02, 0.9, 0.08 if not last else 0.14)
        place(x, tone * e, i * 0.34, 0.9)
    save(name, fade(norm(x, 0.85), 2, 120), tags=['pitch'])


def hall_sounds() -> None:
    whistle(1, 'whistle-1')
    whistle(2, 'whistle-2')
    whistle(3, 'whistle-3')
    # the buzzer: a hall's end-of-quarter horn, square-ish, with a slap of room
    seconds = 1.3
    tt = t(seconds)
    f = 440.0
    x = sum(np.sin(2 * math.pi * f * k * tt) / k for k in (1, 2, 3, 5, 7)) / 2.2
    x *= env(len(tt), 0.01, 0.05, 0.95, 0.25)
    ring = signal.fftconvolve(x, np.exp(-np.linspace(0, 5, int(0.5 * SR))) * rng.standard_normal(int(0.5 * SR)) * 0.02)[: len(x)]
    save('buzzer', fade(norm(mix((x, 1.0), (ring, 0.6)), 0.9), 2, 200), tags=['hall'])
    # a basketball: one bounce on parquet, and the net
    b = lp(noise(0.12, 'white'), 400) * env(int(0.12 * SR), 0.002, 0.04, 0.3, 0.07)
    thump = glide(180, 70, 0.12) * env(int(0.12 * SR), 0.002, 0.05, 0.2, 0.06)
    save('ball-bounce', fade(norm(mix((b, 0.6), (thump, 1.0)), 0.8), 1, 40), tags=['hall'])
    # a football kicked: a thud with a leather snap
    kick = mix((glide(160, 60, 0.18) * env(int(0.18 * SR), 0.002, 0.06, 0.2, 0.1), 1.0), (bp(noise(0.05, 'white'), 800, 3000) * env(int(0.05 * SR), 0.001, 0.02, 0.1, 0.03), 0.5))
    save('ball-kick', fade(norm(kick, 0.85), 1, 40), tags=['pitch'])


# ---------------------------------------------------------------------- darbuka ----

def darbuka_hit(kind: str) -> np.ndarray:
    """dum: the skin's low mode with a pitch drop; tek: the rim, bright; ka: a lighter tek"""
    if kind == 'dum':
        seconds = 0.42
        body = glide(190, 95, seconds, 0.6) * env(int(seconds * SR), 0.002, 0.12, 0.35, 0.28)
        skin = bp(noise(seconds, 'white'), 300, 1800) * env(int(seconds * SR), 0.001, 0.03, 0.05, 0.05)
        return mix((body, 1.0), (skin, 0.4))
    seconds = 0.2 if kind == 'tek' else 0.14
    tone = mix((sine(520 if kind == 'tek' else 640, seconds), 0.5), (sine(1230, seconds), 0.35), (sine(2100, seconds), 0.2))
    tone *= env(int(seconds * SR), 0.001, 0.05, 0.15, 0.12)
    rim = bp(noise(seconds, 'white'), 2000, 7000) * env(int(seconds * SR), 0.001, 0.02, 0.1, 0.05)
    return mix((tone, 1.0), (rim, 0.7 if kind == 'tek' else 0.5))


def darbuka() -> None:
    for kind in ('dum', 'tek', 'ka'):
        save(f'darbuka-{kind}', fade(norm(darbuka_hit(kind), 0.9), 1, 30), tags=['rhythm'])
    # Melamed's pattern: three, a rest, two — the rhythm the 1996 chapter teaches
    seconds = 3.2
    x = np.zeros(int(SR * seconds))
    bar = [(0.0, 'dum'), (0.3, 'tek'), (0.6, 'tek'), (1.2, 'dum'), (1.5, 'tek')]
    for rep in range(2):
        for at, kind in bar:
            place(x, darbuka_hit(kind), rep * 1.6 + at + float(rng.normal(0, 0.006)), 0.9)
    save('darbuka-three-two', fade(norm(x, 0.9), 1, 100), tags=['rhythm'])


# ------------------------------------------------------------------- street & home ---

def steps() -> None:
    for surface, (lo, hi, sec) in {'floor': (500, 1400, 0.07), 'street': (900, 2600, 0.08), 'terrace': (300, 900, 0.09), 'stairs': (400, 1200, 0.08)}.items():
        for i in range(3):
            x = bp(noise(sec, 'white'), lo * float(rng.uniform(0.85, 1.15)), hi * float(rng.uniform(0.85, 1.15))) * env(int(sec * SR), 0.002, 0.03, 0.15, 0.04)
            if surface == 'terrace':
                x = mix((x, 1.0), (glide(150, 70, sec) * env(int(sec * SR), 0.002, 0.04, 0.1, 0.04), 0.5))
            save(f'step-{surface}-{i + 1}', fade(norm(x, 0.7), 1, 20), tags=['step'])


def doors_and_things() -> None:
    # a door: handle, the swing (a breath of the next room), the latch
    seconds = 0.75
    x = np.zeros(int(SR * seconds))
    place(x, bp(noise(0.04, 'white'), 1500, 5000) * env(int(0.04 * SR), 0.001, 0.02, 0.2, 0.02), 0.0, 0.5)
    place(x, lp(noise(0.4, 'pink'), 700) * env(int(0.4 * SR), 0.05, 0.2, 0.4, 0.15), 0.06, 0.6)
    place(x, mix((bp(noise(0.05, 'white'), 2000, 6000), 0.6), (glide(900, 400, 0.05), 0.4)) * env(int(0.05 * SR), 0.001, 0.02, 0.2, 0.03), 0.52, 0.8)
    save('door', fade(norm(x, 0.8), 1, 60), tags=['room'])
    # a page turned
    x = hp(noise(0.14, 'white'), 1800) * env(int(0.14 * SR), 0.02, 0.06, 0.3, 0.06)
    sw = bp(noise(0.14, 'white'), 3000, 9000)
    sweep = sw * fit(np.concatenate([np.linspace(0, 1, int(0.07 * SR)), np.linspace(1, 0, int(0.07 * SR))]), len(sw))
    save('page', fade(norm(mix((x, 0.7), (sweep, 0.6)), 0.6), 2, 40), tags=['ui'])
    # a stamp landing (toasts)
    x = mix((glide(170, 55, 0.18) * env(int(0.18 * SR), 0.002, 0.08, 0.2, 0.08), 1.0), (lp(noise(0.06, 'white'), 900) * env(int(0.06 * SR), 0.001, 0.02, 0.1, 0.04), 0.5))
    save('stamp', fade(norm(x, 0.85), 1, 60), tags=['ui'])
    # the small tick of a prompt
    x = sine(3100, 0.03) * env(int(0.03 * SR), 0.001, 0.01, 0.2, 0.015)
    save('tick', fade(norm(x, 0.5), 1, 10), tags=['ui'])
    # coins on a counter (the kiosk)
    seconds = 0.5
    x = np.zeros(int(SR * seconds))
    for i in range(3):
        f = float(rng.uniform(2600, 4200))
        ring = mix((sine(f, 0.25), 1.0), (sine(f * 1.5, 0.25), 0.4)) * env(int(0.25 * SR), 0.001, 0.06, 0.15, 0.15)
        place(x, ring, i * 0.09, 0.6)
    save('coins', fade(norm(x, 0.7), 1, 60), tags=['kiosk'])
    # a shop bell over a door
    x = mix((sine(2093, 0.9), 1.0), (sine(2637, 0.9), 0.5), (sine(4186, 0.9), 0.25)) * env(int(0.9 * SR), 0.002, 0.2, 0.3, 0.6)
    save('bell-shop', fade(norm(x, 0.7), 1, 200), tags=['kiosk'])
    # the school bell: an electric ring, a second and a half
    seconds = 1.6
    tt = t(seconds)
    hammer = (np.sin(2 * math.pi * 24 * tt) > 0.6).astype(float)
    ring = mix((sine(1760, seconds), 1.0), (sine(2200, seconds), 0.6), (sine(3520, seconds), 0.3))
    x = signal.fftconvolve(hammer * 0.4, np.exp(-np.linspace(0, 40, int(0.06 * SR))))[: len(tt)] * ring
    save('bell-school', fade(norm(x * env(len(tt), 0.01, 0.1, 0.9, 0.3), 0.75), 2, 250), tags=['school'])
    # a transistor radio: static with a voice-shaped murmur — tuned in, then the bed
    seconds = 4.0
    static = bp(noise(seconds, 'white'), 1500, 5000) * 0.5
    murmur = bp(noise(seconds, 'pink'), 250, 1400)
    talk = np.abs(np.sin(2 * math.pi * 3.1 * t(seconds))) * (0.6 + 0.4 * np.sin(2 * math.pi * 0.37 * t(seconds)))
    save('amb-radio', loopable(norm(mix((static, 0.35), (murmur * talk, 1.0)), 0.5), 400), loop=True, tags=['amb', 'radio'])
    tune = bp(noise(1.2, 'white'), 800, 6000) * (0.4 + 0.6 * np.abs(np.sin(2 * math.pi * 7 * t(1.2))))
    het = glide(2400, 600, 1.2) * env(int(1.2 * SR), 0.05, 0.3, 0.4, 0.4) * 0.3
    save('radio-tune', fade(norm(mix((tune, 1.0), (het, 1.0)), 0.6), 5, 150), tags=['radio'])


def vehicles() -> None:
    # a bus idling: a low chug with a valve rattle
    seconds = 5.0
    tt = t(seconds)
    f = 27 + 1.5 * np.sin(2 * math.pi * 0.4 * tt)
    chug = np.sin(2 * math.pi * np.cumsum(f) / SR)
    chug = np.sign(chug) * np.abs(chug) ** 0.3
    rattle = bp(noise(seconds, 'white'), 1200, 3500) * (0.5 + 0.5 * np.sin(2 * math.pi * np.cumsum(f * 2) / SR)) * 0.15
    body = lp(noise(seconds, 'brown'), 120) * 0.6
    save('amb-bus', loopable(norm(mix((chug, 0.6), (rattle, 1.0), (body, 1.0)), 0.6), 500), loop=True, tags=['amb', 'bus'])
    # the bus door: a hiss and a clunk
    x = np.zeros(int(SR * 1.1))
    place(x, hp(noise(0.5, 'white'), 2500) * env(int(0.5 * SR), 0.02, 0.2, 0.3, 0.25), 0.0, 0.5)
    place(x, mix((glide(300, 90, 0.15), 1.0), (lp(noise(0.1, 'white'), 600), 0.5)) * env(int(0.15 * SR), 0.002, 0.06, 0.2, 0.08), 0.55, 0.9)
    save('bus-door', fade(norm(x, 0.8), 2, 100), tags=['bus'])
    # a car passing on the street: doppler-ish whoosh
    seconds = 2.4
    tt = t(seconds)
    swell = np.exp(-((tt - 1.1) ** 2) / 0.18)
    f = 90 * (1.15 - 0.3 * (tt / seconds))
    engine = np.sin(2 * math.pi * np.cumsum(f) / SR) * 0.4 + fit(lp(noise(seconds, 'white'), 900), len(tt)) * 0.6
    save('car-pass', fade(norm(engine * swell, 0.7), 20, 200), tags=['street'])
    # a car door
    x = mix((glide(220, 80, 0.14) * env(int(0.14 * SR), 0.002, 0.05, 0.2, 0.07), 1.0), (bp(noise(0.06, 'white'), 600, 2500) * env(int(0.06 * SR), 0.001, 0.02, 0.1, 0.03), 0.6))
    save('car-door', fade(norm(x, 0.8), 1, 40), tags=['street'])


def ambience() -> None:
    # a room in the afternoon: a low hush and the building
    save('amb-room', loopable(norm(lp(noise(8, 'brown'), 260) + lp(noise(8, 'pink'), 600) * 0.15, 0.35), 900), loop=True, tags=['amb'])
    # the kitchen: room + a fridge hum
    hum = mix((sine(50, 8), 1.0), (sine(100, 8), 0.4), (sine(150, 8), 0.15)) * 0.08
    save('amb-kitchen', loopable(norm(lp(noise(8, 'brown'), 300) * 0.5 + hum, 0.35), 900), loop=True, tags=['amb'])
    # the street by day: distant traffic, a bird now and then, the city's air
    seconds = 10.0
    bed = bp(noise(seconds, 'pink'), 200, 1800) * 0.4 + lp(noise(seconds, 'brown'), 150) * 0.5
    x = bed.copy()
    for _ in range(6):
        at = float(rng.uniform(0.3, seconds - 0.6))
        f0 = float(rng.uniform(2400, 3600))
        ch = np.concatenate([glide(f0, f0 * 1.25, 0.09), glide(f0 * 1.25, f0 * 0.9, 0.07)])
        chirp = ch * env(len(ch), 0.005, 0.05, 0.5, 0.08)
        place(x, chirp, at, 0.08)
    save('amb-street-day', loopable(norm(x, 0.45), 900), loop=True, tags=['amb'])
    # dusk: crickets and the same city, further away
    x = lp(noise(seconds, 'brown'), 120) * 0.5 + bp(noise(seconds, 'pink'), 200, 1200) * 0.2
    cricket = np.sin(2 * math.pi * 4200 * t(seconds)) * (np.sin(2 * math.pi * 31 * t(seconds)) > 0.2) * (0.5 + 0.5 * np.sin(2 * math.pi * 0.6 * t(seconds)))
    save('amb-street-dusk', loopable(norm(x + cricket * 0.05, 0.4), 900), loop=True, tags=['amb'])
    # the tunnel under a stand: concrete, a crowd through a wall, drips
    x = lp(noise(seconds, 'brown'), 110) * 0.8 + lp(crowd_bed(seconds, 20, 150, 800), 300) * 0.5
    for _ in range(4):
        drip = glide(2200, 1400, 0.08) * env(int(0.08 * SR), 0.001, 0.03, 0.1, 0.05)
        place(x, drip, float(rng.uniform(0.5, seconds - 0.5)), 0.04)
    save('amb-tunnel', loopable(norm(x, 0.45), 900), loop=True, tags=['amb'])
    # an army base at dawn: wind, a generator far off
    wind = bp(noise(seconds, 'pink'), 300, 1500) * (0.5 + 0.5 * np.sin(2 * math.pi * 0.11 * t(seconds)))
    gen = mix((sine(38, seconds), 1.0), (sine(76, seconds), 0.3)) * 0.05
    save('amb-base', loopable(norm(wind * 0.5 + gen, 0.4), 900), loop=True, tags=['amb'])
    # the bus station: buses, echo, people
    st = crowd_bed(seconds, 16, 200, 1600) * 0.5 + lp(noise(seconds, 'brown'), 100) * 0.7
    save('amb-station', loopable(norm(st, 0.45), 900), loop=True, tags=['amb'])
    # a classroom: chairs, a corridor, a fan
    cls = lp(noise(seconds, 'brown'), 200) * 0.5 + bp(crowd_bed(seconds, 10, 300, 2000), 300, 2000) * 0.15
    save('amb-classroom', loopable(norm(cls, 0.4), 900), loop=True, tags=['amb'])


# ------------------------------------------------------------- transitions & UI ------

def transitions() -> None:
    # the year turning: a riser of noise and a low sweep, cut off by a soft hit
    seconds = 2.2
    tt = t(seconds)
    riser = bp(noise(seconds, 'white'), 300, 6000) * (tt / seconds) ** 2.2
    sweep = glide(60, 420, 1.9) * env(int(1.9 * SR), 0.3, 0.5, 0.6, 0.4)
    x = np.zeros(int(SR * seconds))
    place(x, riser, 0, 0.6)
    place(x, sweep, 0, 0.35)
    hit = mix((glide(220, 50, 0.4) * env(int(0.4 * SR), 0.002, 0.15, 0.2, 0.2), 1.0), (lp(noise(0.3, 'white'), 700) * env(int(0.3 * SR), 0.001, 0.1, 0.1, 0.15), 0.4))
    place(x, hit, 1.85, 0.9)
    save('year-turn', fade(norm(x, 0.85), 10, 200), tags=['film'])
    # the finale: an impact and a long shimmer — the PlayStation cut to the credits
    seconds = 3.6
    x = np.zeros(int(SR * seconds))
    place(x, mix((glide(180, 40, 0.8) * env(int(0.8 * SR), 0.002, 0.3, 0.2, 0.5), 1.0), (lp(noise(0.5, 'white'), 500) * env(int(0.5 * SR), 0.001, 0.2, 0.1, 0.3), 0.5)), 0, 1.0)
    for i, f in enumerate((523.25, 659.25, 783.99, 1046.5)):
        tone = mix((sine(f, 3.2), 1.0), (sine(f * 2, 3.2), 0.2)) * env(int(3.2 * SR), 0.15, 0.6, 0.35, 2.0)
        place(x, tone, 0.08 + i * 0.07, 0.09)
    shimmer = bp(noise(3.0, 'white'), 4000, 9000) * env(int(3.0 * SR), 0.4, 1.0, 0.3, 1.5)
    place(x, shimmer, 0.3, 0.12)
    save('finale-hit', fade(norm(x, 0.9), 2, 400), tags=['film'])
    # the stage sting: four notes on a bell — the console's "chapter" chime
    seconds = 2.0
    x = np.zeros(int(SR * seconds))
    for i, f in enumerate((392.0, 523.25, 659.25, 783.99)):
        tone = mix((sine(f, 1.4), 1.0), (sine(f * 3, 1.4), 0.15), (sine(f * 4.2, 1.4), 0.08)) * env(int(1.4 * SR), 0.004, 0.3, 0.3, 0.9)
        place(x, tone, i * 0.16, 0.3)
    save('stage-sting', fade(norm(x, 0.8), 1, 300), tags=['film', 'ui'])
    # a map reveal: a soft two-note chime with air
    seconds = 2.4
    x = np.zeros(int(SR * seconds))
    for i, f in enumerate((659.25, 987.77)):
        tone = mix((sine(f, 1.8), 1.0), (sine(f * 2, 1.8), 0.2)) * env(int(1.8 * SR), 0.01, 0.4, 0.3, 1.2)
        place(x, tone, i * 0.22, 0.35)
    air = bp(noise(2.0, 'white'), 2500, 7000) * env(int(2.0 * SR), 0.3, 0.6, 0.3, 1.0)
    place(x, air, 0.1, 0.08)
    save('reveal', fade(norm(x, 0.75), 1, 300), tags=['film', 'ui'])
    # gauges: a blip up, a blip down
    up = glide(620, 980, 0.16) * env(int(0.16 * SR), 0.003, 0.05, 0.4, 0.09)
    down = glide(760, 420, 0.18) * env(int(0.18 * SR), 0.003, 0.06, 0.4, 0.1)
    save('gauge-up', fade(norm(up, 0.55), 1, 40), tags=['ui'])
    save('gauge-down', fade(norm(down, 0.55), 1, 40), tags=['ui'])
    # the love meter moving: a heartbeat, two thumps
    x = np.zeros(int(SR * 0.7))
    for at, g in ((0.0, 1.0), (0.22, 0.75)):
        thump = glide(120, 50, 0.22) * env(int(0.22 * SR), 0.003, 0.08, 0.25, 0.12)
        place(x, thump, at, g)
    save('heart', fade(norm(x, 0.8), 1, 80), tags=['ui'])
    # UI: a pop for a sheet opening, a click for a chip, a shut for closing
    pop = mix((glide(900, 1400, 0.07), 1.0), (bp(noise(0.05, 'white'), 1500, 5000), 0.3)) * env(int(0.07 * SR), 0.002, 0.03, 0.2, 0.03)
    save('ui-open', fade(norm(pop, 0.5), 1, 20), tags=['ui'])
    shut = mix((glide(1200, 700, 0.07), 1.0), (bp(noise(0.05, 'white'), 800, 3000), 0.3)) * env(int(0.07 * SR), 0.002, 0.03, 0.2, 0.03)
    save('ui-close', fade(norm(shut, 0.5), 1, 20), tags=['ui'])
    click = bp(noise(0.03, 'white'), 2000, 6000) * env(int(0.03 * SR), 0.001, 0.01, 0.2, 0.015)
    save('ui-click', fade(norm(click, 0.45), 1, 10), tags=['ui'])
    # a choice taken: a firm stamp with a small tone
    x = mix((glide(200, 70, 0.15) * env(int(0.15 * SR), 0.002, 0.06, 0.2, 0.07), 1.0), (sine(880, 0.12) * env(int(0.12 * SR), 0.002, 0.04, 0.2, 0.06), 0.25))
    save('choice', fade(norm(x, 0.7), 1, 40), tags=['ui'])
    # the ending card: a low, slow chord — the day closing
    seconds = 3.0
    x = np.zeros(int(SR * seconds))
    for f in (130.81, 196.0, 261.63):
        place(x, mix((sine(f, 2.8), 1.0), (sine(f * 2, 2.8), 0.3)) * env(int(2.8 * SR), 0.6, 0.8, 0.5, 1.2), 0, 0.2)
    save('ending', fade(norm(x, 0.7), 20, 400), tags=['film'])
    # an item into the red box: a small wooden knock and a click
    x = mix((glide(700, 320, 0.09) * env(int(0.09 * SR), 0.002, 0.03, 0.2, 0.05), 1.0), (bp(noise(0.04, 'white'), 2500, 7000) * env(int(0.04 * SR), 0.001, 0.015, 0.1, 0.02), 0.5))
    save('box-item', fade(norm(x, 0.6), 1, 30), tags=['ui'])


def main() -> None:
    crowd()
    hall_sounds()
    darbuka()
    steps()
    doors_and_things()
    vehicles()
    ambience()
    transitions()
    (OUT / 'manifest.json').write_text(json.dumps(LIB, ensure_ascii=False, indent=1), encoding='utf-8')
    total = sum(os.path.getsize(p) for p in OUT.iterdir())
    print(f'{len(LIB)} sounds, {total / 1024:.0f} KB')


if __name__ == '__main__':
    main()
