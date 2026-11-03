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

# mood → (progression, energy, bpm, extras)
MOODS = {
    'minor':   ('minor', 0.30, 76, ()),
    'sad':     ('minor', 0.12, 64, ('low',)),
    'build':   ('tense', 0.45, 84, ('pulse', 'rise')),
    'tense':   ('tense', 0.55, 88, ('pulse', 'heart')),
    'joy':     ('major', 0.70, 96, ('claps',)),
    'triumph': ('major', 0.92, 100, ('claps', 'crash')),
    'anthem':  ('major', 0.80, 92, ('claps', 'crash')),
}

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


def _section(sec: dict, rng) -> np.ndarray:
    prog_name, energy, bpm, extras = MOODS.get(sec['mood'], MOODS['minor'])
    prog = PROGRESSIONS[prog_name]
    dur = sec['end'] - sec['start']
    n_total = int(dur * SR)
    out = np.zeros(n_total + SR, 'float32')
    bar = 60 / bpm * 4
    t, i = 0.0, int(sec.get('offset', 0))
    while t < dur - 0.2:
        chord = prog[i % len(prog)]
        n = int(min(bar * 2, dur - t + 0.6) * SR)
        a = int(t * SR)
        seg = np.zeros(n, 'float32')
        low = 'low' in extras
        seg += _pad([midi(c - (24 if low else 12)) for c in chord[:3]] + [midi(chord[3] - (12 if low else 0))], n, rng) * 0.55
        notes = [chord[j % 4] + 12 * (j // 4) for j in (0, 2, 1, 3, 2, 4, 3, 5)]
        step = bar / (2 if energy < 0.25 else 4 if energy < 0.6 else 8)
        for j in range(int(bar * 2 / step)):
            p0 = int(j * step * SR)
            if p0 >= n or rng.random() < 0.3 * (1 - energy):
                continue
            nt = notes[j % len(notes)] + (0 if low else 12)
            pl = _pluck(midi(nt), min(n - p0, int(3.0 * SR)), 2.0 if low else 2.6)
            seg[p0:p0 + len(pl)] += pl * (0.12 if low else 0.15)
        beat = bar / 4
        if 'pulse' in extras:  # an eighth-note low string ostinato on the root
            for b in range(int(n / (beat / 2 * SR))):
                p0 = int(b * beat / 2 * SR)
                pl = _pluck(midi(chord[0] - 24), min(n - p0, int(0.3 * SR)), 9)
                seg[p0:p0 + len(pl)] += pl * 0.22
        if 'heart' in extras:
            k = _kick(int(0.35 * SR))
            for b in range(int(n / (beat * SR))):
                for off in (0.0, 0.22):
                    p0 = int((b * beat + off) * SR)
                    if p0 + len(k) < n:
                        seg[p0:p0 + len(k)] += k * (0.30 if off == 0 else 0.18)
        elif energy >= 0.55:
            k = _kick(int(0.5 * SR))
            for b in range(int(n / (beat * SR))):
                p0 = int(b * beat * SR)
                if p0 + len(k) < n:
                    seg[p0:p0 + len(k)] += k * 0.26 * energy
        if 'claps' in extras:
            for b in range(int(n / (beat * SR))):
                if b % 2 == 1:
                    p0 = int(b * beat * SR)
                    m = int(0.09 * SR)
                    if p0 + m < n:
                        seg[p0:p0 + m] += (rng.normal(0, 1, m) * np.exp(-np.arange(m) / SR * 45)).astype('float32') * 0.10
        out[a:a + n] += seg * (0.55 + 0.45 * energy)
        t += bar * 2
        i += 1
    if 'rise' in extras:  # a swell into the next section
        m = int(min(dur, 4.0) * SR)
        sw = rng.normal(0, 1, m).astype('float32')
        sw = np.convolve(sw, np.ones(40) / 40, 'same') * np.linspace(0, 1, m) ** 2
        out[max(0, n_total - m):n_total] += sw[: n_total - max(0, n_total - m)] * 0.35
    if 'crash' in extras:
        m = int(2.5 * SR)
        cr = rng.normal(0, 1, m).astype('float32')
        cr = (cr - np.convolve(cr, np.ones(6) / 6, 'same')) * np.exp(-np.arange(m) / SR * 1.6)
        out[:m] += cr * 0.18
    return out


def score(sections: list[dict], seed: int = 3, style: str = 'synth') -> np.ndarray:
    """sections: [{start, end, mood}] in seconds. Each mood has its own harmony, tempo and instruments; sections
    overlap by a crossfade so the music turns with the story instead of cutting. style 'balkan' plays original brass-band
    music (studio/balkan.py, FluidSynth); without FluidSynth it falls back to the synthesiser."""
    rng = np.random.default_rng(seed)
    if style.startswith('track:'):
        return track_score(sections, style.split(':', 1)[1])
    total = int(max(s['end'] for s in sections) * SR) + 2 * SR
    out = np.zeros(total, 'float32')
    xf = 0.9
    for k, sec in enumerate(sections):
        part = _section({**sec, 'offset': k * 3}, rng)
        a = int(sec['start'] * SR)
        n = min(len(part), total - a)
        env = np.ones(n, 'float32')
        fi = int(xf * SR)
        if k > 0:
            env[:fi] = np.linspace(0, 1, fi)
        fo_start = int((sec['end'] - sec['start']) * SR)
        if fo_start < n:
            env[fo_start:] = np.linspace(1, 0, n - fo_start)
        out[a:a + n] += part[:n] * env
    k = np.ones(5, 'float32') / 5
    out = np.convolve(out, k, mode='same')
    peak = np.max(np.abs(out)) or 1
    return out / peak * 0.5


MUSIC_DIR = Path(__file__).parent / 'kit' / 'music'
LOUD_MOODS = {'joy', 'triumph', 'anthem'}


def music_track(track_id: str) -> dict:
    idx = json.loads((MUSIC_DIR / 'index.json').read_text(encoding='utf-8'))
    for t in idx['tracks']:
        if t['id'] == track_id:
            return t
    raise StageError('MUSIC', f'No track "{track_id}" in kit/music/index.json')


def track_path(t: dict) -> Path:
    """The track's file. A library track (one with a url) is fetched once into kit/music/cache/, which is not committed."""
    path = MUSIC_DIR / t['file']
    if not path.exists() and t.get('url'):
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix('.part')
        r = subprocess.run(['curl', '-sSfL', '--retry', '2', '-o', str(tmp), t['url']], capture_output=True, text=True)
        if r.returncode or not tmp.exists() or tmp.stat().st_size < 50_000:
            tmp.unlink(missing_ok=True)
            raise StageError('MUSIC', f'Could not fetch "{t["id"]}" from {t["url"]}: {r.stderr.strip()[:200]}')
        tmp.rename(path)
    if not path.exists():
        raise StageError('MUSIC', f'Track file missing: kit/music/{t["file"]}')
    return path


def track_score(sections: list[dict], track_id: str, xf: float = 1.4) -> np.ndarray:
    """The owner's chosen track under the whole film, edited to the story: each part of the film gets a passage of the
    track whose loudness fits it — the quiet intro and breaks under the tension, the full band under a goal — carried on
    from where the last passage stopped when it still fits, so the music runs rather than jumps. Joins are crossfaded."""
    t = music_track(track_id)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(track_path(t)), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    trk = np.frombuffer(raw, 'float32').copy()
    hop = SR // 2
    rms = np.array([np.sqrt(np.mean(trk[i:i + hop] ** 2)) for i in range(0, len(trk) - hop, hop)])
    rms = np.convolve(rms, np.ones(6) / 6, mode='same')
    loud = rms >= np.percentile(rms, 55)
    total = int(max(s['end'] for s in sections) * SR) + 2 * SR
    out = np.zeros(total, 'float32')
    cursor = 0  # in hops

    def fits(i: int, want_loud: bool) -> bool:
        return bool(loud[i % len(loud)] == want_loud)

    for k, sec in enumerate(sections):
        want = sec['mood'] in LOUD_MOODS
        need = int((sec['end'] - sec['start'] + xf) * SR)
        if not fits(cursor, want):  # find the next passage of the right kind, wrapping round the track
            cursor = next((j % len(loud) for j in range(cursor, cursor + 2 * len(loud)) if fits(j, want)), cursor)
        start = cursor * hop
        piece = np.concatenate([trk[start:], trk] * (1 + need // len(trk)))[:need]
        env = np.ones(len(piece), 'float32')
        fi = int(xf * SR)
        if k > 0:
            env[:fi] = np.linspace(0, 1, fi)
        env[-fi:] = np.minimum(env[-fi:], np.linspace(1, 0, fi))
        a = int(sec['start'] * SR)
        n = min(len(piece), total - a)
        out[a:a + n] += piece[:n] * env[:n]
        cursor = ((start + need - fi) // hop) % len(loud)
    peak = float(np.max(np.abs(out))) or 1.0
    return out / peak * 0.5


def mood_sections(plan: dict, min_len: float = 7.0) -> list[dict]:
    """Consecutive shots of one mood become one section; a section shorter than min_len joins its neighbour."""
    secs: list[dict] = []
    for s in plan['shots']:
        a, b = s['start'], s['start'] + s['frames'] / plan['fps']
        mood = s.get('mood') or 'minor'
        if secs and secs[-1]['mood'] == mood:
            secs[-1]['end'] = b
        else:
            secs.append({'start': a, 'end': b, 'mood': mood})
    merged: list[dict] = []
    for sec in secs:
        if merged and (sec['end'] - sec['start'] < min_len) and sec['mood'] not in ('triumph', 'anthem'):
            merged[-1]['end'] = sec['end']
        else:
            merged.append(sec)
    return merged


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


# Crowd (owner, 3.11.2026: "I don't like the crowd sounds — soften them or take them out"): no continuous bed any more,
# only a short reaction at a goal or a result, filtered to sound distant and ducked under the narrator.
# CROWD_LEVELS: 'soft' (default) or 'off', set per film in the brief.
CROWD_LEVELS = {'soft': 0.12, 'off': 0.0}
CROWD_MAX_S = 2.6
CROWD_GAP_S = 8.0


def build_mix(job_dir: Path, plan: dict, log, crowd_level: str = 'soft', music: str = 'synth') -> Path:
    total = plan['duration']
    n = int(total * SR) + SR
    rng = np.random.default_rng(5)
    voice = np.zeros(n, 'float32')
    sfx = np.zeros(n, 'float32')
    crowd = np.zeros(n, 'float32')
    gain = CROWD_LEVELS.get(crowd_level, CROWD_LEVELS['soft'])
    last_crowd = -1e9
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
                    at = s['start'] + t
                    # one short reaction at the moments that earn it (a goal, the final whistle), never a wall of noise
                    if gain and kind in ('crowd-goal', 'crowd-final') and p and p.exists() and at - last_crowd >= CROWD_GAP_S:
                        a = _read(p)[: int(CROWD_MAX_S * SR)]
                        k = np.arange(len(a))
                        a = a * np.minimum(1, k / (0.25 * SR)) * np.minimum(1, k[::-1] / (1.2 * SR))
                        crowd[i:i + len(a)] += a[: max(0, n - i)] * gain
                        last_crowd = at
                    continue
                a = fx(kind, rng)
                sfx[i:i + len(a)] += a[: max(0, n - i)] * 0.5
    # the score follows the story beat by beat: tension under a shoot-out, joy on a win, sadness on a defeat
    sections = mood_sections(plan)
    music = score(sections, style=music)[:n]
    music = np.pad(music, (0, n - len(music)))
    d = job_dir / 'mix'
    d.mkdir(exist_ok=True)
    _write(d / 'voice.wav', voice)
    _write(d / 'music.wav', music)
    _write(d / 'sfx.wav', sfx)
    _write(d / 'crowd.wav', crowd)
    out = d / 'mix.m4a'
    fg = ('[0:a]asplit=3[v0][vk1][vk2];'
          '[1:a]volume=0.55[m];[m][vk1]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[md];'
          '[v0]volume=1.0,highpass=f=70,acompressor=threshold=0.2:ratio=2.5:attack=5:release=120[v];'
          '[2:a]volume=0.9[s];'
          # the crowd sounds far away (no hiss, no boom) and steps aside whenever the narrator speaks
          '[3:a]highpass=f=180,lowpass=f=3200,aecho=0.6:0.5:60:0.25[cf];[cf][vk2]sidechaincompress=threshold=0.02:ratio=12:attack=15:release=500[c];'
          '[v][md][s][c]amix=inputs=4:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]')
    r = subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(d / 'voice.wav'), '-i', str(d / 'music.wav'), '-i', str(d / 'sfx.wav'),
                        '-i', str(d / 'crowd.wav'), '-filter_complex', fg, '-map', '[a]', '-ac', '2', '-c:a', 'aac', '-b:a', '192k', str(out)], capture_output=True, text=True)
    if r.returncode:
        raise StageError('MIX_FAILED', r.stderr[-600:])
    log(f'Mix: narration, score and effects mixed to −14 LUFS (crowd: {crowd_level})')
    return out
