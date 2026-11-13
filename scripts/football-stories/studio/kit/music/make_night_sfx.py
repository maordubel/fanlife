"""Soft cut sounds for the Good Night episodes (owner, 13.11.2026: "the transition sounds should be gentler, calmer,
sleepier"). Made here from sine partials and filtered noise, so no licence is involved.

python3 -m studio.kit.music.make_night_sfx [out_dir]
  night-chime.wav   two music-box notes (the lullaby's own comb) with a long, quiet tail — under a page or a slide
  night-breath.wav  a slow breath of air, rising and falling over 1.6 s, nothing sharp in it — under a zoom or an iris
  night-twinkle.wav three tiny bell notes falling away — when a card lands
"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100


def _comb(f: float, dur: float, amp: float, decay: float = 1.6) -> np.ndarray:
    t = np.arange(int(SR * dur)) / SR
    env = np.exp(-t / decay) * (1 - np.exp(-t / 0.004))
    w = np.sin(2 * np.pi * f * t) + 0.22 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / 0.5) \
        + 0.08 * np.sin(2 * np.pi * f * 3.98 * t) * np.exp(-t / 0.2)
    return amp * env * w


def _room(x: np.ndarray, wet: float = 0.35) -> np.ndarray:
    out = x.copy()
    for d, g in ((0.031, .5), (0.047, .42), (0.071, .33), (0.113, .25), (0.167, .17), (0.241, .1)):
        k = int(d * SR)
        out[k:] += wet * g * x[:-k]
    return out


def _lowpass(x: np.ndarray, hz: float) -> np.ndarray:
    a = np.exp(-2 * np.pi * hz / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def _write(path: Path, x: np.ndarray, peak: float) -> None:
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    fade = int(0.08 * SR)
    x[-fade:] *= np.linspace(1, 0, fade)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def chime() -> np.ndarray:
    x = np.zeros(int(SR * 3.0))
    for at, f, a in ((0.0, 1046.5, 1.0), (0.32, 783.99, 0.8)):          # C6 then G5 — falling, settling
        n = _comb(f, 2.6, a)
        k = int(at * SR)
        x[k:k + len(n)] += n[:len(x) - k]
    return _room(x, 0.45)


def breath() -> np.ndarray:
    rng = np.random.default_rng(7)
    n = int(SR * 1.8)
    t = np.arange(n) / SR
    x = _lowpass(_lowpass(rng.standard_normal(n), 700), 500)
    env = np.sin(np.pi * np.clip(t / 1.6, 0, 1)) ** 2
    return x * env


def twinkle() -> np.ndarray:
    x = np.zeros(int(SR * 2.2))
    for at, f in ((0.0, 2093.0), (0.11, 1760.0), (0.23, 1567.98)):
        n = _comb(f, 1.8, 0.6, decay=0.7)
        k = int(at * SR)
        x[k:k + len(n)] += n[:len(x) - k]
    return _room(x, 0.4)


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / 'fairytales/sfx'
    out.mkdir(parents=True, exist_ok=True)
    _write(out / 'night-chime.wav', chime(), 0.5)
    _write(out / 'night-breath.wav', breath(), 0.35)
    _write(out / 'night-twinkle.wav', twinkle(), 0.4)
    print(out)


if __name__ == '__main__':
    main()
