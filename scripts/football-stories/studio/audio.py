"""Sound: the narration laid on its frames, an original score written by code, effects, and the final mix.

Everything here is free and owned: the score is synthesised (no samples), the paper, stamp and whoosh effects are
synthesised, and crowd sounds come only from the owner's own recordings in public/life/sfx (crowd-real-*), which are
listed in the asset ledger. Nothing pretends to be the sound of a real historical match: crowd beds are atmosphere.
The mix ducks the score under the voice and is normalised for YouTube (−14 LUFS integrated, −1.5 dBTP).
"""
from __future__ import annotations

import json
import math
import subprocess
import wave
from pathlib import Path

import numpy as np

from .common import ROOT, StageError

SR = 32000
CROWD = {
    'crowd-goal': ROOT / 'public/life/sfx/crowd-real-goal.ogg',
    'crowd-miss': ROOT / 'public/life/sfx/crowd-real-miss.ogg',
    'crowd-after': ROOT / 'public/life/sfx/crowd-real-after.ogg',
    'crowd-murmur': ROOT / 'public/life/sfx/crowd-real-murmur.ogg',
    'crowd-build': ROOT / 'public/life/sfx/crowd-real-build.ogg',
    'crowd-final': ROOT / 'public/life/sfx/crowd-real-final.ogg',
}


def _write(path: Path, a: np.ndarray, sr: int = SR) -> None:
    a = np.clip(a, -1, 1)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((a * 32767).astype('<i2').tobytes())


def _read(path: Path, sr: int = SR) -> np.ndarray:
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, '<i2').astype('float32') / 32768


def midi(n: float) -> float:
    return 440.0 * 2 ** ((n - 69) / 12)


# --------------------------------------------------------------------- the score

PROGRESSIONS = {
    'minor': [[50, 53, 57, 62], [46, 50, 53, 58], [53, 57, 60, 65], [48, 52, 55, 60]],      # Dm Bb F C
    'tense': [[50, 53, 57, 62], [49, 53, 56, 61], [46, 50, 53, 58], [45, 49, 52, 57]],      # Dm C#dim-ish Bb A
    'major': [[50, 54, 57, 62], [47, 50, 54, 59], [43, 47, 50, 55], [45, 49, 52, 57]],      # D Bm G A
}


def _pad(freqs, n, rng):
    t = np.arange(n) / SR
    out = np.zeros(n, 'float32')
    for f in freqs:
        for det in (-0.12, 0.0, 0.13):
            ff = f * 2 ** (det / 12)
            ph = rng.uniform(0, 2 * np.pi)
            out += (np.sin(2 * np.pi * ff * t + ph) + 0.28 * np.sin(4 * np.pi * ff * t + ph) + 0.1 * np.sin(6 * np.pi * ff * t)) .astype('float32')
    env = np.minimum(1, t / 1.2) * np.minimum(1, (t[::-1]) / 1.0)
    return out * env.astype('float32') / (len(freqs) * 3)


def _pluck(f, n, decay=2.4):
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(4 * np.pi * f * t) * np.exp(-t * 3) + 0.2 * np.sin(6 * np.pi * f * t) * np.exp(-t * 5)
    return (s * np.exp(-t * decay) * np.minimum(1, t / 0.004)).astype('float32')


def _kick(n):
    t = np.arange(n) / SR
    f = 52 + 70 * np.exp(-t * 30)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)).astype('float32')


def score(sections: list[dict], seed: int = 3) -> np.ndarray:
    """sections: [{start, end, mood: minor|tense|major, energy: 0..1}] in seconds."""
    rng = np.random.default_rng(seed)
    total = int(max(s['end'] for s in sections) * SR) + SR
    out = np.zeros(total, 'float32')
    bar = 60 / 76 * 4  # 76 bpm, four beats
    for sec in sections:
        prog = PROGRESSIONS.get(sec['mood'], PROGRESSIONS['minor'])
        t = sec['start']
        i = 0
        while t < sec['end'] - 0.5:
            chord = prog[i % len(prog)]
            n = int(min(bar * 2, sec['end'] - t) * SR)
            a = int(t * SR)
            seg = _pad([midi(c - 12) for c in chord[:3]] + [midi(chord[3])], n, rng) * 0.55
            # piano: an arpeggio, sparser at low energy
            notes = [chord[j % 4] + 12 * (j // 4) for j in (0, 2, 1, 3, 2, 4)]
            step = bar / (2 if sec['energy'] < 0.4 else 4)
            for j, nt in enumerate(notes[: int(bar * 2 / step)]):
                p0 = int(j * step * SR)
                if p0 >= n or rng.random() < 0.25 * (1 - sec['energy']):
                    continue
                pl = _pluck(midi(nt + 12), min(n - p0, int(3.5 * SR)))
                seg[p0:p0 + len(pl)] += pl * 0.16
            if sec['energy'] >= 0.55:
                k = _kick(int(0.5 * SR))
                for b in range(int(n / (bar / 4 * SR))):
                    p0 = int(b * bar / 4 * SR)
                    if p0 + len(k) < n and (b % 2 == 0 or sec['energy'] > 0.8):
                        seg[p0:p0 + len(k)] += k * 0.22 * sec['energy']
            out[a:a + n] += seg * (0.6 + 0.4 * sec['energy'])
            t += bar * 2
            i += 1
    # gentle low-pass / smoothing and fades at section joins
    k = np.ones(5, 'float32') / 5
    out = np.convolve(out, k, mode='same')
    peak = np.max(np.abs(out)) or 1
    return out / peak * 0.5


# --------------------------------------------------------------------- effects

def _noise(n, rng):
    return rng.normal(0, 1, n).astype('float32')


def fx(kind: str, rng) -> np.ndarray:
    if kind == 'paper':
        n = int(0.42 * SR)
        x = _noise(n, rng)
        x = x - np.convolve(x, np.ones(9) / 9, 'same')  # high-pass: crisp
        crack = (rng.random(n) < 0.012).astype('float32') * rng.uniform(0.5, 1, n)
        env = np.exp(-np.arange(n) / SR * 7)
        return ((x * 0.25 + crack) * env * 0.55).astype('float32')
    if kind == 'stamp':
        n = int(0.35 * SR)
        t = np.arange(n) / SR
        thump = np.sin(2 * np.pi * (60 + 90 * np.exp(-t * 40)) * t) * np.exp(-t * 18)
        click = _noise(n, rng) * np.exp(-t * 120) * 0.6
        return ((thump + click) * 0.8).astype('float32')
    if kind == 'whoosh':
        n = int(0.7 * SR)
        x = _noise(n, rng)
        out = np.zeros(n, 'float32')
        lp = 0.0
        for i in range(n):  # a sweeping one-pole filter
            a = 0.02 + 0.5 * (i / n)
            lp += a * (x[i] - lp)
            out[i] = lp
        env = np.sin(np.pi * np.arange(n) / n) ** 2
        return (out * env * 0.9).astype('float32')
    if kind == 'pop':
        n = int(0.12 * SR)
        t = np.arange(n) / SR
        return (np.sin(2 * np.pi * (520 + 300 * np.exp(-t * 60)) * t) * np.exp(-t * 40) * 0.35).astype('float32')
    if kind == 'end':
        return (_pluck(midi(74), int(3 * SR), 1.2) * 0.4 + _pluck(midi(78), int(3 * SR), 1.2) * 0.3 + _pluck(midi(81), int(3 * SR), 1.2) * 0.3).astype('float32')
    return np.zeros(1, 'float32')


def build_mix(job_dir: Path, plan: dict, log) -> Path:
    total = plan['duration']
    n = int(total * SR) + SR
    rng = np.random.default_rng(5)
    voice = np.zeros(n, 'float32')
    sfx = np.zeros(n, 'float32')
    for s in plan['shots']:
        if s['voice_file']:
            a = _read(job_dir / 'voice' / s['voice_file'])
            i = int(round(s['voice_at'] * SR))
            voice[i:i + len(a)] += a[: max(0, n - i)]
        cp = job_dir / 'shots' / f'shot-{s["n"]:04d}.cues.json'
        if cp.exists():
            for (t, kind) in json.loads(cp.read_text())['cues']:
                i = int((s['start'] + t) * SR)
                if kind.startswith('crowd'):
                    p = CROWD.get(kind)
                    if p and p.exists():
                        a = _read(p)[: int(4.5 * SR)]
                        a *= np.minimum(1, np.arange(len(a))[::-1] / (1.2 * SR))
                        sfx[i:i + len(a)] += a[: max(0, n - i)] * 0.30
                    continue
                a = fx(kind, rng)
                sfx[i:i + len(a)] += a[: max(0, n - i)] * 0.5
    # the score follows the chapters: tension builds through the middle, the last chapter turns major
    chs = [c['t'] for c in plan['chapters']] + [total]
    k = len(plan['chapters'])
    sections = []
    for j in range(k):
        mood = 'major' if j == k - 1 and k > 1 else 'tense' if j >= k - 2 and k > 2 else 'minor'
        energy = 0.25 + 0.6 * (j / max(1, k - 1))
        sections.append({'start': chs[j], 'end': chs[j + 1], 'mood': mood, 'energy': round(energy, 2)})
    music = score(sections)[:n]
    music = np.pad(music, (0, n - len(music)))
    d = job_dir / 'mix'
    d.mkdir(exist_ok=True)
    _write(d / 'voice.wav', voice)
    _write(d / 'music.wav', music)
    _write(d / 'sfx.wav', sfx)
    out = d / 'mix.m4a'
    fg = ('[1:a]volume=0.55[m];[m][0:a]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[md];'
          '[0:a]volume=1.0,highpass=f=70,acompressor=threshold=0.2:ratio=2.5:attack=5:release=120[v];'
          '[2:a]volume=0.9[s];[v][md][s]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]')
    r = subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(d / 'voice.wav'), '-i', str(d / 'music.wav'), '-i', str(d / 'sfx.wav'),
                        '-filter_complex', fg, '-map', '[a]', '-ac', '2', '-c:a', 'aac', '-b:a', '192k', str(out)], capture_output=True, text=True)
    if r.returncode:
        raise StageError('MIX_FAILED', r.stderr[-600:])
    log('Mix: narration, score and effects mixed to −14 LUFS')
    return out
