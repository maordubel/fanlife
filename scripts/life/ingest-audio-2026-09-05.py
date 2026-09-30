#!/usr/bin/env python3
"""
הקלטות — 5.9.2026: two recordings the owner supplied, cut into the library.

  content/audio/source/2026-09-05/urban-park-ambience.mp3   144.6 s, stereo 44.1k
  content/audio/source/2026-09-05/soccer-crowd.mp3           58.2 s, stereo 44.1k

Nothing here is synthesised: these are the first REAL sounds in the game. The script
measures both, cuts the regions the crowd state machine needs, normalises each cut to
the level of the sounds already in `public/life/sfx`, makes the loops seamless with an
equal-power seam, and writes Vorbis + AAC at 22050 mono like everything else. The
manifest gets `source: 'maor-2026-09-05'` on every cut so the library says where a
sound came from.

Regions (seconds in the source, from the per-second RMS printed by `--measure`):

  crowd  0.0– 9.0   a goal: a full-throated burst that takes nine seconds to come down
  crowd  9.0–34.0   the murmur between things — LOOP
  crowd 34.0–40.0   something is building: the noise rises without breaking
  crowd 40.0–46.5   a near miss: a peak, an "ohhh", a fall
  crowd 42.5–47.0   the settle after a chance
  crowd 47.0–58.2   the final whistle: a burst, then the ground empties to silence
  park   30– 70     a park by a street, steady — LOOP
  park   72– 86     a passing wave (the mechanical sweep in the recording) — one-shot

Run from the repo root:  python3 scripts/life/ingest-audio-2026-09-05.py [--measure]
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile

SR = 22050
SRC = Path('content/audio/source/2026-09-05')
OUT = Path('public/life/sfx')
SOURCE_TAG = 'maor-2026-09-05'


def load(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ['ffmpeg', '-loglevel', 'error', '-i', str(path), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def measure(x: np.ndarray, name: str) -> None:
    n = len(x) // SR
    rms = [float(np.sqrt(np.mean(x[i * SR:(i + 1) * SR] ** 2))) for i in range(n)]
    print(f'{name}: {len(x) / SR:.1f}s peak {np.abs(x).max():.3f} rms {np.sqrt(np.mean(x ** 2)):.3f}')
    print(' '.join(f'{i}:{r * 1000:.0f}' for i, r in enumerate(rms)))


def cut(x: np.ndarray, a: float, b: float) -> np.ndarray:
    return x[int(a * SR):int(b * SR)].copy()


def fade(x: np.ndarray, ms_in: float, ms_out: float) -> np.ndarray:
    x = x.copy()
    i = min(len(x), int(SR * ms_in / 1000))
    o = min(len(x), int(SR * ms_out / 1000))
    if i > 0:
        x[:i] *= np.linspace(0, 1, i)
    if o > 0:
        x[-o:] *= np.linspace(1, 0, o)
    return x


def seamless(x: np.ndarray, seconds: float = 1.5) -> np.ndarray:
    """equal-power crossfade of the tail into the head, so the loop point is not a click"""
    n = int(seconds * SR)
    head, tail, body = x[:n], x[-n:], x[n:-n]
    t = np.linspace(0, 1, n)
    seam = tail * np.cos(t * np.pi / 2) + head * np.sin(t * np.pi / 2)
    return np.concatenate([body, seam])


def level(x: np.ndarray, rms: float, peak: float = 0.95) -> np.ndarray:
    g = rms / max(1e-6, float(np.sqrt(np.mean(x ** 2))))
    y = x * g
    m = float(np.abs(y).max())
    if m > peak:
        y *= peak / m
    return y


def highpass(x: np.ndarray, hz: float) -> np.ndarray:
    """one-pole highpass: the recordings carry a rumble the small speakers cannot use"""
    rc = 1.0 / (2 * np.pi * hz)
    dt = 1.0 / SR
    a = rc / (rc + dt)
    y = np.zeros_like(x)
    prev_x = prev_y = 0.0
    for i in range(len(x)):
        y[i] = a * (prev_y + x[i] - prev_x)
        prev_x, prev_y = x[i], y[i]
    return y


LIB: dict[str, dict] = {}


def save(name: str, x: np.ndarray, loop: bool, tags: list[str], note: str) -> None:
    x = np.clip(x, -1, 1)
    wav = OUT / f'{name}.wav'
    wavfile.write(wav, SR, (x * 32767).astype(np.int16))
    for ext, args in (('ogg', ['-c:a', 'libvorbis', '-q:a', '3']), ('m4a', ['-c:a', 'aac', '-b:a', '64k'])):
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), *args, str(OUT / f'{name}.{ext}')], check=True)
    wav.unlink()
    LIB[name] = {'seconds': round(len(x) / SR, 2), 'loop': loop, 'tags': tags, 'source': SOURCE_TAG, 'note': note}
    size = (OUT / f'{name}.ogg').stat().st_size
    print(f'{name:20s} {len(x) / SR:5.1f}s  rms {np.sqrt(np.mean(x ** 2)):.3f}  peak {np.abs(x).max():.2f}  {size // 1024} KB')


def main() -> None:
    crowd = highpass(load(SRC / 'soccer-crowd.mp3'), 60)
    park = highpass(load(SRC / 'urban-park-ambience.mp3'), 80)
    if '--measure' in sys.argv:
        measure(crowd, 'crowd')
        measure(park, 'park')
        return
    OUT.mkdir(parents=True, exist_ok=True)
    # the crowd — six cuts, one loop
    save('crowd-real-goal', fade(level(cut(crowd, 0.0, 9.0), 0.16), 5, 1200), False, ['terrace', 'real'], 'a goal, nine seconds down')
    save('crowd-real-murmur', seamless(level(cut(crowd, 9.0, 34.0), 0.10)), True, ['terrace', 'real', 'amb'], 'the murmur between things')
    save('crowd-real-build', fade(level(cut(crowd, 34.0, 40.0), 0.13), 400, 300), False, ['terrace', 'real'], 'something is building')
    save('crowd-real-miss', fade(level(cut(crowd, 40.0, 46.5), 0.15), 10, 900), False, ['terrace', 'real'], 'a near miss: peak and fall')
    save('crowd-real-after', fade(level(cut(crowd, 42.5, 47.0), 0.11), 300, 700), False, ['terrace', 'real'], 'the settle after a chance')
    save('crowd-real-final', fade(level(cut(crowd, 47.0, 58.2), 0.14), 10, 1500), False, ['terrace', 'real'], 'the final whistle: burst, then the ground empties')
    # the park — a loop and one event
    save('amb-park', seamless(level(cut(park, 30.0, 70.0), 0.10), 2.5), True, ['amb', 'real'], 'a park by a street; the street outside the ground')
    save('park-wave', fade(level(cut(park, 72.0, 86.0), 0.12), 600, 1200), False, ['amb', 'real'], 'a passing wave in the park')
    manifest = OUT / 'manifest.json'
    lib = json.loads(manifest.read_text(encoding='utf-8')) if manifest.exists() else {}
    lib.update(LIB)
    manifest.write_text(json.dumps(lib, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'{len(LIB)} real sounds into the library ({len(lib)} total)')


if __name__ == '__main__':
    main()
