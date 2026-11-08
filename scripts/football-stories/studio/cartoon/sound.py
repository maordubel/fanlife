"""The Short's sound (owner, 8.11.2026: "not in sound"): a mix built like a scene, not a voice over a loop.

Four layers, all free and all already in the repo:
  * the VOICE — the narrator, the loudest thing, always;
  * the ROOM — under every shot, the owner's own recordings of the place the drawing shows (the terrace murmur, the
    street at dusk, the tunnel, the bus, the radio — public/life/sfx, recorded by him on 5.9.2026), cross-faded at
    every cut so the place changes when the picture does;
  * the HITS — every cut, figure, object and gag has its sound: the ball kicked, the whistle, the stamp, the coins, the
    crowd going up on a goal (the library's real recordings first, the studio's synthesised ones where none exists);
  * the MUSIC — one of the owner's tracks, ducked under every word and breathing up between lines and at the end.
Then a soft limiter, so a Short is loud on a phone and never clips.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

from ..common import ROOT

SFX = ROOT / 'public' / 'life' / 'sfx'
# how far under the narrator's speech each sound sits (dB)
UNDER = {'crowd-real-murmur': 19, 'amb-stadium': 19, 'amb-street-dusk': 21, 'amb-street-day': 21, 'amb-tunnel': 20, 'amb-bus': 21,
         'amb-station': 21, 'amb-radio': 22, 'amb-park': 22, 'amb-room': 24, 'amb-hall': 22}
HIT_UNDER = {'crowd-real-goal': 4, 'crowd-real-build': 10, 'crowd-swell': 7, 'crowd-groan': 9, 'crowd-real-final': 6,
             'whoosh': 11, 'drum': 6, 'pickup': 14, 'pop': 12, 'stamp': 5, 'ball-kick': 6, 'ball-bounce': 9, 'whistle-1': 7,
             'whistle-2': 7, 'coins': 9, 'page': 9, 'phone-text': 9, 'clock-tick': 10, 'clang': 6, 'reveal': 10, 'car-pass': 10,
             'bus-door': 10, 'radio-tune': 9, 'envelope-tear': 9, 'spray': 12, 'heart': 8, 'glass': 6, 'tick': 10}


def _read(path: Path, sr: int) -> np.ndarray:
    from ..audio import _read as rd
    return rd(path, sr)


def _rms_db(x: np.ndarray) -> float:
    return float(20 * np.log10(np.sqrt(np.mean(np.square(x, dtype='float64'))) + 1e-9))


def _body_db(a: np.ndarray, sr: int) -> float:
    w = max(1, int(0.12 * sr))
    if len(a) <= w:
        return _rms_db(a)
    best = max(range(0, len(a) - w + 1, max(1, w // 3)), key=lambda i: float(np.mean(a[i:i + w] ** 2)))
    return _rms_db(a[best:best + w])


def sample(kind: str, sr: int, rng) -> np.ndarray | None:
    """The library's recording of a sound, else the studio's synthesised one, else None."""
    from ..audio import CROWD, fx
    p = SFX / f'{kind}.ogg'
    if p.exists():
        return _read(p, sr)
    if kind in CROWD and CROWD[kind].exists():
        return _read(CROWD[kind], sr)
    try:
        return fx(kind, rng)
    except Exception:  # noqa: BLE001 — a sound the synthesiser lacks is left out, never a failed Short
        return None


def room_bed(shots: list[dict], n: int, sr: int, voice_db: float) -> np.ndarray:
    """Each shot's room, looped to fill it, 0.25 s cross-fades at the cuts."""
    bed = np.zeros(n, 'float32')
    cache: dict[str, np.ndarray] = {}
    xf = int(0.25 * sr)
    for s in shots:
        kind = s['amb']
        if kind not in cache:
            p = SFX / f'{kind}.ogg'
            cache[kind] = _read(p, sr) if p.exists() else np.zeros(1, 'float32')
        src = cache[kind]
        if len(src) < sr // 2:
            continue
        a, b = max(0, int(s['t0'] * sr) - xf // 2), min(n, int(s['t1'] * sr) + xf // 2)
        if b <= a:
            continue
        off = int((s['i'] * 3.7 % max(1.0, len(src) / sr - 1)) * sr)  # start each shot at a different moment of the room
        reps = np.tile(src, (b - a + off) // len(src) + 2)[off:off + b - a].copy()
        reps *= 10 ** ((voice_db - UNDER.get(kind, 22) - _rms_db(src)) / 20)
        ramp = np.ones(b - a, 'float32')
        k = min(xf, (b - a) // 2)
        if k:
            ramp[:k] = np.linspace(0, 1, k)
            ramp[-k:] = np.linspace(1, 0, k)
        bed[a:b] += reps * ramp
    return bed


def hits(cues: list[tuple[float, str]], n: int, sr: int, voice_db: float) -> np.ndarray:
    out = np.zeros(n, 'float32')
    rng = np.random.default_rng(11)
    last: dict[str, float] = {}
    for t, kind in sorted(cues):
        if t - last.get(kind, -9) < (0.25 if kind in ('whoosh', 'pickup', 'pop') else 0.6):
            continue
        last[kind] = t
        a = sample(kind, sr, rng)
        if a is None or not len(a):
            continue
        a = a * 10 ** ((voice_db - HIT_UNDER.get(kind, 9) + rng.uniform(-1.2, 1.2) - _body_db(a, sr)) / 20)
        j = int(max(0.0, t) * sr)
        if j < n:
            out[j:j + len(a)] += a[: n - j].astype('float32')
    return out


def duck_envelope(voice: np.ndarray, sr: int, depth_db: float = 7.0) -> np.ndarray:
    """1 where the narrator is silent, down `depth_db` while he talks; 30 ms attack, 420 ms release."""
    w = max(1, sr // 100)
    k = len(voice) // w
    if k < 2:
        return np.ones(len(voice), 'float32')
    rms = np.sqrt(np.mean(np.square(voice[: k * w].reshape(k, w)), axis=1))
    on = (rms > 10 ** (-42 / 20)).astype('float32')
    env = np.zeros(k, 'float32')
    a_up, a_dn = 1 - np.exp(-1 / 3), 1 - np.exp(-1 / 42)
    for i in range(k):
        env[i] = env[i - 1] + ((a_up if on[i] > env[i - 1] else a_dn) * (on[i] - env[i - 1])) if i else on[i]
    g = 10 ** (-depth_db * env / 20)
    return np.interp(np.arange(len(voice)), np.arange(k) * w + w / 2, g).astype('float32')


def limit(x: np.ndarray, ceiling: float = 0.93) -> np.ndarray:
    """A soft knee above 0.7 of full scale: loud on a phone, never clipped."""
    k = 0.7
    y = np.where(np.abs(x) <= k, x, np.sign(x) * (k + (ceiling - k) * np.tanh((np.abs(x) - k) / (ceiling - k))))
    return y.astype('float32')


def mix(voice_wav: Path, duration: float, shots: list[dict], cues: list[tuple[float, str]], out: Path, music_tags: list[str],
        seed: str, log) -> Path:
    from ..audio import SR, _write, level_music, owner_score, resolve_music, speech_db
    n = int(duration * SR)
    v = np.zeros(n, 'float32')
    a = _read(voice_wav, SR)
    i0 = int(0.1 * SR)
    v[i0:i0 + len(a)] += a[: max(0, n - i0)]
    vdb = speech_db(v)
    duck = duck_envelope(v, SR)
    room = room_bed(shots, n, SR, vdb) * (0.55 + 0.45 * duck)
    fx = hits(cues, n, SR, vdb)
    try:
        music, tid = owner_score([{'start': 0.0, 'end': duration, 'mood': 'drive'}], resolve_music(None, music_tags, seed), log)
        music = music[:n] if len(music) >= n else np.pad(music, (0, n - len(music)))
        music = level_music(music, vdb, under=14.0) * duck
        tail = int(min(1.4, duration / 4) * SR)
        music[-tail:] *= np.linspace(1, 1.6, tail).astype('float32')   # the music comes up as the Short lands
        log(f'Short sound: music {tid}, rooms {sorted({s["amb"] for s in shots})}, {len(cues)} hits')
    except Exception as e:  # noqa: BLE001
        log(f'Short sound: no owner track could be had ({e}); voice, rooms and hits only')
        music = np.zeros(n, 'float32')
    total = v + room + fx + music
    peak = float(np.max(np.abs(total)) or 1.0)
    total = limit(total * (0.98 / peak if peak > 1.2 else 1.0))
    _write(out, total, SR)
    return out
