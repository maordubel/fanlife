"""Sound: the narration laid on its frames, an original score written by code, effects, and the final mix.

Everything here is free and owned: the score is synthesised (no samples), the paper, stamp and whoosh effects are
synthesised, and crowd sounds come only from the owner's own recordings in public/life/sfx (crowd-real-*), which are
listed in the asset ledger. Nothing pretends to be the sound of a real historical match: crowd beds are atmosphere.
The mix ducks the score under the voice and is normalised for YouTube (−14 LUFS integrated, −1.5 dBTP).
"""
from __future__ import annotations

import json
import os
import re
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


# The cinema's colour on the score (Director's Cut): a director's music key, or the act the story is in, leans the mood.
# drive = the broadcaster's quicker pulse; warm = the terrace's slower, softer band; epic = the trailer's low swell and
# crashes. An act moves the harmony to another key, so the music turns when the story turns (cinema.direct).
FLAVOURS = {
    'drive': {'bpm': 1.12, 'energy': 0.08, 'add': ('pulse',), 'drop': ()},
    'warm': {'bpm': 0.92, 'energy': -0.06, 'add': ('claps',), 'drop': ('heart', 'crash')},
    'epic': {'bpm': 0.96, 'energy': 0.1, 'add': ('rise', 'low'), 'drop': ('claps',)},
}
ACT_FLAVOUR = {'Cold open': 'epic', 'Act I': 'drive', 'Act II': 'drive', 'Act III': 'epic', 'Epilogue': 'warm'}
ACT_SHIFT = (0, 2, -3, 5, 0)


def _section(sec: dict, rng) -> np.ndarray:
    prog_name, energy, bpm, extras = MOODS.get(sec['mood'], MOODS['minor'])
    fl = FLAVOURS.get(sec.get('flavour') or '')
    if fl:
        bpm, energy = bpm * fl['bpm'], min(1.0, max(0.08, energy + fl['energy']))
        extras = tuple(x for x in extras if x not in fl['drop']) + tuple(x for x in fl['add'] if x not in extras)
    shift = int(sec.get('shift') or 0)
    prog = [[n + shift for n in ch] for ch in PROGRESSIONS[prog_name]]
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
    """The track's file. A library track (a url) or an owner track kept on his Drive (drive: folder + name) is fetched
    once into kit/music/cache/, which is never committed."""
    path = MUSIC_DIR / t['file']
    if not path.exists() and t.get('drive'):
        _fetch_drive_track(t, path)
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


def _fetch_drive_track(t: dict, path: Path) -> None:
    """An owner track from his public Drive music folder, found by its name (the runner reaches Drive; a sandbox may not)."""
    if os.environ.get('STORIES_MUSIC_FETCH', '1') == '0':
        return
    try:
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'matchday'))
        import drive_fetch as DF  # noqa: E402
        norm = lambda x: re.sub(r'[\s_]+', ' ', x.lower()).strip()  # noqa: E731 — Drive keeps spaces where a download had underscores
        want = norm(t['drive']['name'])
        hit = t['drive'].get('id') or next((fid for fid, title, folder in DF.listing(t['drive']['folder'])
                                           if not folder and want in norm(title)), None)
        if hit:
            DF.download(hit, path)
    except Exception:  # noqa: BLE001 — the next owner track is tried (pick_owner_track / resolve_music)
        path.unlink(missing_ok=True)


# Owner rule (5.11.2026): "the studio and the films are always produced with music I supplied". Only tracks marked
# owner: true are ever used; the synthesiser and libraries he did not choose are never picked.
DIRECTOR_TAGS = {'drive': ['drive', 'hype', 'matchday'], 'warm': ['warm', 'memory', 'light'], 'epic': ['epic', 'tension', 'drive']}
TONE_TAGS = {'triumph': ['triumph', 'joy', 'anthem'], 'heartbreak': ['heartbreak', 'sad', 'sombre'], 'underdog': ['hope', 'drive'],
             'rivalry': ['drive', 'tension'], 'nostalgia': ['memory', 'warm'], 'drama': ['tension', 'epic'],
             'laugh': ['laugh', 'humour', 'quirky'], 'war': ['war', 'tension', 'sombre'], 'heart': ['memory', 'hope', 'warm'],
             'vlog': ['vlog', 'light', 'warm'], 'explainer': ['explainer', 'light']}


def owner_tracks() -> list[dict]:
    idx = json.loads((MUSIC_DIR / 'index.json').read_text(encoding='utf-8'))
    return [t for t in idx['tracks'] if t.get('owner')]


def pick_owner_track(tags: list[str], seed: str = '', avoid: tuple = ()) -> list[str]:
    """The owner's tracks ranked for these wishes (best first): matching tags, then a stable shuffle by the film's seed so
    two films of the same mood do not always get the same track; a track whose file cannot be had comes last."""
    import hashlib
    def rank(t):
        hit = sum(2 if g in (t.get('tags') or []) else 0 for g in tags[:1]) + sum(1 for g in tags[1:] if g in (t.get('tags') or []))
        local = (MUSIC_DIR / t['file']).exists() or bool(t.get('drive'))
        h = int(hashlib.sha256(f"{seed}|{t['id']}".encode()).hexdigest()[:6], 16)
        return (-hit, t['id'] in avoid, not local, h)
    return [t['id'] for t in sorted(owner_tracks(), key=rank)]


def resolve_music(choice: str | None, tags: list[str], seed: str = '') -> list[str]:
    """Owner tracks to try, in order: the brief's own choice when it is an owner track, then the best for the film."""
    first = []
    if choice and choice.startswith('track:'):
        tid = choice.split(':', 1)[1]
        if any(t['id'] == tid for t in owner_tracks()):
            first = [tid]
    return first + [x for x in pick_owner_track(tags, seed) if x not in first]


def owner_score(sections: list[dict], candidates: list[str], log=None) -> tuple[np.ndarray, str]:
    """The film's score from the first owner track that can be had. Never the synthesiser (owner, 5.11.2026)."""
    errs = []
    for tid in candidates:
        try:
            return track_score(sections, tid), tid
        except (StageError, subprocess.CalledProcessError, OSError) as e:
            errs.append(f'{tid}: {e}'[:120])
            if log:
                log(f'Music: {tid} unavailable — trying the next owner track')
    raise StageError('MUSIC', 'None of the owner\'s tracks could be fetched: ' + '; '.join(errs)[:500], retryable=True)


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
    """Consecutive shots of one mood become one section; a section shorter than min_len joins its neighbour. When the
    story has acts the music changes key at each act; the director's music key colours it all (without a director, the
    act's own colour: an epic cold open and last act, a driving middle, a warm epilogue)."""
    secs: list[dict] = []
    key = plan.get('music_key')
    for s in plan['shots']:
        a, b = s['start'], s['start'] + s['frames'] / plan['fps']
        mood = s.get('mood') or 'minor'
        cin = s.get('cinema') or {}
        act, name = cin.get('act') or 0, cin.get('act_name')
        flavour = key or (ACT_FLAVOUR.get(name) if name else None)  # the director's colour; else the act's own
        shift = ACT_SHIFT[act % len(ACT_SHIFT)] if name else 0
        if secs and secs[-1]['mood'] == mood and secs[-1].get('act', 0) == act:
            secs[-1]['end'] = b
        else:
            secs.append({'start': a, 'end': b, 'mood': mood, 'act': act, 'flavour': flavour, 'shift': shift})
    merged: list[dict] = []
    for sec in secs:
        if merged and (sec['end'] - sec['start'] < min_len) and sec['mood'] not in ('triumph', 'anthem') and sec.get('act', 0) == merged[-1].get('act', 0):
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
        # a rubber stamp on paper, heard from across a desk: a felt knock and a short paper slap, no sub-bass boom
        n = int(0.22 * SR)
        t = np.arange(n) / SR
        knock = np.sin(2 * np.pi * (150 + 60 * np.exp(-t * 55)) * t) * np.exp(-t * 34)
        slap = _noise(n, rng)
        slap = slap - np.convolve(slap, np.ones(5) / 5, 'same')
        slap = np.convolve(slap, np.ones(3) / 3, 'same') * np.exp(-t * 90) * 0.35
        return ((knock * 0.55 + slap) * 0.8).astype('float32')
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
    if kind == 'glass':
        # a bottle breaking on a tiled floor, from across the room: a short bright crack, then a few tinkles that ring
        # and die — synthesised, quieter than the narrator like every effect (level_fx)
        n = int(0.9 * SR)
        t = np.arange(n) / SR
        crack = _noise(n, rng)
        crack = (crack - np.convolve(crack, np.ones(4) / 4, 'same')) * np.exp(-t * 55)
        out = crack * 0.6
        for _ in range(7):
            at = rng.uniform(0.02, 0.45)
            f0 = rng.uniform(2400, 5200)
            k = np.clip(t - at, 0, None)
            out += np.sin(2 * np.pi * f0 * k) * np.exp(-k * rng.uniform(14, 26)) * (t >= at) * rng.uniform(0.12, 0.25)
        return (out * 0.7).astype('float32')
    if kind == 'sting':
        # an orchestral stab for a trailer card or a goal: a bright chord of buzzing harmonics over a low hit
        n = int(1.3 * SR)
        t = np.arange(n) / SR
        out = np.zeros(n, 'float32')
        for note in (50, 57, 62, 66, 69):
            f0 = midi(note)
            for h_, amp in ((1, 1.0), (2, 0.5), (3, 0.33), (4, 0.22), (5, 0.15)):
                out += (np.sin(2 * np.pi * f0 * h_ * t) * amp).astype('float32')
        out *= (np.exp(-t * 3.2) * np.minimum(1, t / 0.006)).astype('float32') / 8
        out[: int(0.5 * SR)] += _kick(int(0.5 * SR)) * 0.8
        return out.astype('float32')
    if kind == 'drum':
        n = int(0.6 * SR)
        t = np.arange(n) / SR
        body = np.sin(2 * np.pi * (78 + 40 * np.exp(-t * 18)) * t) * np.exp(-t * 6)
        skin = _noise(n, rng)
        skin = np.convolve(skin, np.ones(12) / 12, 'same') * np.exp(-t * 22) * 0.6
        return ((body + skin) * 0.8).astype('float32')
    if kind == 'whistle':
        n = int(0.55 * SR)
        t = np.arange(n) / SR
        trill = 0.6 + 0.4 * np.sin(2 * np.pi * 32 * t)
        env = np.minimum(1, t / 0.02) * np.minimum(1, (t[::-1]) / 0.06)
        return (np.sin(2 * np.pi * 2900 * t) * trill * env * 0.5).astype('float32')
    if kind == 'pen':
        # a felt-tip drawn across paper: a soft, bright scratch that rises and falls with the stroke
        n = int(0.5 * SR)
        t = np.arange(n) / SR
        x = _noise(n, rng)
        x = x - np.convolve(x, np.ones(6) / 6, 'same')
        grain = 0.6 + 0.4 * np.sin(2 * np.pi * 23 * t + rng.uniform(0, 6)) ** 2
        env = np.sin(np.pi * t / t[-1]) ** 0.7
        return (x * grain * env * 0.22).astype('float32')
    if kind == 'tick':
        # a counter's wheels: a run of small clicks, fast then slowing as the number lands
        n = int(0.8 * SR)
        out = np.zeros(n, 'float32')
        at = 0.0
        gap = 0.035
        while at < 0.72:
            i = int(at * SR)
            m = int(0.012 * SR)
            k = np.arange(m) / SR
            out[i:i + m] += (np.sin(2 * np.pi * 2600 * k) * np.exp(-k * 600) * 0.3)[: max(0, n - i)]
            at += gap
            gap *= 1.12
        return out
    if kind == 'end':
        return (_pluck(midi(74), int(3 * SR), 1.2) * 0.4 + _pluck(midi(78), int(3 * SR), 1.2) * 0.3 + _pluck(midi(81), int(3 * SR), 1.2) * 0.3).astype('float32')
    return np.zeros(1, 'float32')


# Effects (owner, 4.11.2026: "the studio makes the effects too loud"). Measured on the Kokoro narrator: the old stamp was
# 3 dB LOUDER than the voice and every card fired two of them. An effect is seasoning: each kind is levelled to its own
# distance under the narrator's measured loudness (dB below the speech RMS), thinned so the same sound never repeats
# within its gap, varied a little so a repeat never sounds mechanical, and ducked a few dB more while he speaks.
FX_UNDER_VOICE_DB = {'paper': 17.0, 'stamp': 14.0, 'whoosh': 18.0, 'pop': 19.0, 'glass': 15.0, 'end': 10.0, 'pen': 21.0, 'tick': 22.0,
                     'sting': 11.0, 'drum': 14.0, 'whistle': 19.0}
FX_GAP_S = {'paper': 1.4, 'stamp': 1.6, 'whoosh': 1.2, 'pop': 0.35, 'pen': 0.9, 'tick': 1.0, 'glass': 2.0, 'end': 0.0, 'sting': 3.0, 'drum': 0.9, 'whistle': 4.0}
FX_ANY_GAP_S = 0.3        # two different effects never land on top of each other
FX_PER_MINUTE = 22        # a ceiling: past it, the rest of that minute is quiet
FX_JITTER_DB = 1.5


def _rms_db(x: np.ndarray) -> float:
    return float(20 * np.log10(np.sqrt(np.mean(np.square(x, dtype='float64'))) + 1e-9))


def speech_db(voice: np.ndarray) -> float:
    """The narrator's loudness while he speaks: RMS over 100 ms windows that are not silence."""
    w = SR // 10
    frames = voice[: len(voice) // w * w].reshape(-1, w) if len(voice) >= w else voice.reshape(1, -1)
    rms = np.sqrt(np.mean(np.square(frames, dtype='float64'), axis=1))
    active = rms[rms > 10 ** (-45 / 20)]
    return float(20 * np.log10(np.sqrt(np.mean(active ** 2)))) if len(active) else -21.0


# The score (owner, 5.11.2026: "the background music is too loud relative to the narrator — sort out the sound"). It
# used to go in at a fixed 0.55 of whatever the track was, so a mastered library track sat level with the voice. Now it
# is measured like the effects: its body (the 75th percentile of 400 ms windows) is set MUSIC_UNDER_VOICE_DB below the
# narrator's speech, and the sidechain takes it a further ~6–9 dB down while he talks. Between lines the music breathes
# back up to that bed, never over it.
MUSIC_UNDER_VOICE_DB = 17.0
MUSIC_DUCK = 'sidechaincompress=threshold=0.02:ratio=10:attack=15:release=450:makeup=1'


def music_db(music: np.ndarray, rate: int = SR) -> float:
    """The music's playing loudness: the 75th percentile of 400 ms RMS windows that are not silence."""
    w = max(1, int(0.4 * rate))
    if len(music) < w:
        return _rms_db(music) if len(music) else -90.0
    frames = music[: len(music) // w * w].reshape(-1, w)
    rms = np.sqrt(np.mean(np.square(frames, dtype='float64'), axis=1))
    active = rms[rms > 10 ** (-50 / 20)]
    return float(20 * np.log10(np.percentile(active, 75))) if len(active) else -90.0


MUSIC_FLOOR_DB = 10.0   # a quiet passage is lifted to at most this far under the music's body (never dead air)


def level_music(music: np.ndarray, voice_db: float, under: float = MUSIC_UNDER_VOICE_DB, rate: int = SR) -> np.ndarray:
    """The score set `under` dB below the narrator's speech, its quiet passages lifted so a held beat never falls into
    dead air (measured 5.11.2026: a 4 s silence on the CLASSIFIED sources card once the music sat lower). Silence stays
    silence; a hush (a dip the edit asked for) is a dip, not a passage, and stays within the lift."""
    m = music_db(music, rate)
    if m <= -89:
        return music
    w = max(1, int(0.4 * rate))
    k = len(music) // w
    if k >= 3:
        rms = np.sqrt(np.mean(np.square(music[: k * w].reshape(k, w), dtype='float64'), axis=1)) + 1e-9
        db = 20 * np.log10(rms)
        lift = np.where(db > -60, np.clip(m - MUSIC_FLOOR_DB - db, 0, 14), 0.0)
        lift = np.convolve(lift, np.ones(5) / 5, mode='same')  # ~2 s glide, no pumping
        g = np.interp(np.arange(len(music)), np.arange(k) * w + w / 2, 10 ** (lift / 20))
        music = music * g.astype('float32')
    return (music * 10 ** ((voice_db - under - m) / 20)).astype('float32')


def level_fx(kind: str, a: np.ndarray, voice_db: float, rng) -> np.ndarray:
    """An effect at its distance under the narrator, measured on its loudest 120 ms (the part the ear hears)."""
    if kind not in FX_UNDER_VOICE_DB or not len(a):
        return a
    w = max(1, int(0.12 * SR))
    body = max((a[i:i + w] for i in range(0, max(1, len(a) - w + 1), max(1, w // 4))), key=lambda x: float(np.mean(x * x)))
    target = voice_db - FX_UNDER_VOICE_DB[kind] + float(rng.uniform(-FX_JITTER_DB, FX_JITTER_DB))
    return (a * 10 ** ((target - _rms_db(body)) / 20)).astype('float32')


def thin_cues(cues: list[tuple[float, str]], total: float) -> list[tuple[float, str]]:
    """Effect cues, in time order, without repeats inside their gap, without collisions, under the per-minute ceiling."""
    out: list[tuple[float, str]] = []
    last: dict[str, float] = {}
    per_min: dict[int, int] = {}
    for at, kind in sorted(cues):
        if at < 0 or at > total:
            continue
        if kind != 'end':
            if at - last.get(kind, -1e9) < FX_GAP_S.get(kind, 1.0):
                continue
            if out and at - out[-1][0] < FX_ANY_GAP_S:
                continue
            if per_min.get(int(at // 60), 0) >= FX_PER_MINUTE:
                continue
        out.append((at, kind))
        last[kind] = at
        per_min[int(at // 60)] = per_min.get(int(at // 60), 0) + 1
    return out


# Crowd (owner, 3.11.2026: "I don't like the crowd sounds — soften them or take them out"): no continuous bed any more,
# only a short reaction at a goal or a result, filtered to sound distant and ducked under the narrator.
# CROWD_LEVELS: 'soft' (default) or 'off', set per film in the brief.
CROWD_LEVELS = {'soft': 0.12, 'off': 0.0}
CROWD_MAX_S = 2.6
CROWD_GAP_S = 8.0


# The narrator's chain (owner, 4.11.2026: "a narrator as human and real as possible"). The voice model renders at 24 kHz
# with nothing above 12 kHz, dry, with an even level: a studio voice has a low end, a presence, a little air and a room.
# Upsample, cut rumble and mud, warm the chest, lift the presence, tame the s's, add a hint of air from harmonics,
# give it a few milliseconds of booth, then a gentle leveller. STORIES_NARRATOR_FX=0 turns it off (an A/B test).
NARRATOR_FX = ('aresample=48000,highpass=f=80,equalizer=f=170:t=q:w=1.1:g=2,equalizer=f=330:t=q:w=1.4:g=-2.5,'
               'equalizer=f=3100:t=q:w=1.2:g=2,deesser=i=0.45:m=0.5:f=0.5:s=o,'
               'aexciter=amount=1.4:drive=6:blend=0:freq=6500:ceil=16000,aecho=0.85:0.7:11|23:0.05|0.035,'
               'acompressor=threshold=0.16:ratio=2.4:attack=6:release=150:makeup=1.15')


def narrator_fx(sr: int = SR) -> str:
    """The chain as an ffmpeg filter, ending at the mix's sample rate."""
    import os
    if os.environ.get('STORIES_NARRATOR_FX', '1') == '0':
        return 'highpass=f=70,acompressor=threshold=0.2:ratio=2.5:attack=5:release=120'
    return f'{NARRATOR_FX},aresample={sr}'


def hush_envelope(hushes: list[tuple[float, float]], n: int, depth: float = 0.35) -> np.ndarray:
    """The music's gain over the film: 1, dipping to `depth` over each hush (0.4 s in, 1 s back)."""
    env = np.ones(n, 'float32')
    for at, d_ in hushes:
        a, b = int(at * SR), int((at + d_) * SR)
        idx = np.arange(max(0, a), min(n, b + SR))
        if not len(idx):
            continue
        tt = (idx - a) / SR
        g = np.where(tt < 0.4, 1 - (1 - depth) * tt / 0.4, np.where(idx < b, depth, depth + (1 - depth) * np.clip((idx - b) / SR, 0, 1)))
        env[idx] = np.minimum(env[idx], g.astype('float32'))
    return env


def build_mix(job_dir: Path, plan: dict, log, crowd_level: str = 'soft', music: str = 'auto', tags: list[str] | None = None,
              seed: str = '') -> Path:
    total = plan['duration']
    n = int(total * SR) + SR
    rng = np.random.default_rng(5)
    voice = np.zeros(n, 'float32')
    sfx = np.zeros(n, 'float32')
    crowd = np.zeros(n, 'float32')
    gain = CROWD_LEVELS.get(crowd_level, CROWD_LEVELS['soft'])
    last_crowd = -1e9
    fx_cues: list[tuple[float, str]] = []
    hushes: list[tuple[float, float]] = []
    beds: list[tuple[float, float]] = []
    for s in plan['shots']:
        if s['voice_file']:
            a = _read(job_dir / 'voice' / s['voice_file'])
            i = int(round(s['voice_at'] * SR))
            voice[i:i + len(a)] += a[: max(0, n - i)]
        cp = job_dir / 'shots' / f'shot-{s["n"]:04d}.cues.json'
        if cp.exists():
            for (t, kind) in json.loads(cp.read_text())['cues']:
                i = int((s['start'] + t) * SR)
                if kind.startswith('hush:'):  # a defeat: the music steps back for a breath
                    hushes.append((s['start'] + t, float(kind[5:])))
                    continue
                if kind.startswith('crowd-bed:'):  # terrace art: the stands murmur far away under the voice
                    beds.append((s['start'] + t, float(kind[10:])))
                    continue
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
                fx_cues.append((s['start'] + t, kind))
    murmur = CROWD['crowd-murmur']
    if gain and beds and murmur.exists():
        m = _read(murmur)
        for at, d_ in beds:
            i, k = int(at * SR), int(d_ * SR)
            if k < SR or not len(m):
                continue
            seg = np.resize(m, k) * gain * 0.4
            ramp = np.minimum(1, np.arange(k) / (0.8 * SR)) * np.minimum(1, np.arange(k)[::-1] / (0.8 * SR))
            crowd[i:i + k] += (seg * ramp)[: max(0, n - i)]
    vdb = speech_db(voice)
    kept = thin_cues(fx_cues, total)
    for at, kind in kept:
        i = int(at * SR)
        a = level_fx(kind, fx(kind, rng), vdb, rng)
        sfx[i:i + len(a)] += a[: max(0, n - i)]
    log(f'Mix: {len(kept)} of {len(fx_cues)} effect cues kept, levelled {min(FX_UNDER_VOICE_DB.values()):.0f}–{max(FX_UNDER_VOICE_DB.values()):.0f} dB under the narrator ({vdb:.1f} dBFS)')
    # the score follows the story beat by beat: tension under a shoot-out, joy on a win, sadness on a defeat
    sections = mood_sections(plan)
    wish = list(tags or []) + DIRECTOR_TAGS.get(plan.get('music_key') or '', [])
    music, used = owner_score(sections, resolve_music(music, wish, seed), log)
    plan['music_track'] = used
    (job_dir / 'mix').mkdir(exist_ok=True)
    (job_dir / 'mix' / 'track.txt').write_text(used, encoding='utf-8')
    log(f'Music: {used} (the owner\'s track)')
    music = music[:n]
    music = np.pad(music, (0, n - len(music)))
    music *= hush_envelope(hushes, n)
    music = level_music(music, vdb)
    log(f'Mix: score set {MUSIC_UNDER_VOICE_DB:.0f} dB under the narrator, ducked further while he speaks')
    d = job_dir / 'mix'
    d.mkdir(exist_ok=True)
    _write(d / 'voice.wav', voice)
    _write(d / 'music.wav', music)
    _write(d / 'sfx.wav', sfx)
    _write(d / 'crowd.wav', crowd)
    out = d / 'mix.m4a'
    fg = ('[0:a]asplit=4[v0][vk1][vk2][vk3];'
          f'[1:a]anull[m];[m][vk1]{MUSIC_DUCK}[md];'
          f'[v0]volume=1.0,{narrator_fx()}[v];'
          # effects sit in the same room as the picture: rounded top, a short room, a few dB further back while he speaks
          '[2:a]lowpass=f=9000,equalizer=f=3500:t=q:w=1.2:g=-2,aecho=0.8:0.6:28|47:0.12|0.07[sf];'
          '[sf][vk3]sidechaincompress=threshold=0.04:ratio=3:attack=10:release=300[s];'
          # the crowd sounds far away (no hiss, no boom) and steps aside whenever the narrator speaks
          '[3:a]highpass=f=180,lowpass=f=3200,aecho=0.6:0.5:60:0.25[cf];[cf][vk2]sidechaincompress=threshold=0.02:ratio=12:attack=15:release=500[c];'
          '[v][md][s][c]amix=inputs=4:normalize=0,afade=t=in:d=0.4,alimiter=limit=0.89:attack=4:release=60:level=disabled,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]')
    r = subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(d / 'voice.wav'), '-i', str(d / 'music.wav'), '-i', str(d / 'sfx.wav'),
                        '-i', str(d / 'crowd.wav'), '-filter_complex', fg, '-map', '[a]', '-ac', '2', '-c:a', 'aac', '-b:a', '192k', str(out)], capture_output=True, text=True)
    if r.returncode:
        raise StageError('MIX_FAILED', r.stderr[-600:])
    log(f'Mix: narration, score and effects mixed to −14 LUFS (crowd: {crowd_level})')
    return out
