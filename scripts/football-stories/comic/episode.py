"""A CLASSIFIED episode: a list of beats, and the clock that lays them end to end.

    {"file": "file01", "tone": "LAUGH", "fps": 25,
     "beats": [{"panel": "f01-p08-reach", "dur": 2.0 | "voice": "line-03", "move": "push", "focus": [.6, .4],
                "fx": ["droplets", {"type": "glint", "at": [.62, .3]}], "caption": {...}, "smash": "SMASH!",
                "transition": "whip"}]}

A beat's length is `dur` seconds, or the length of its `voice` key in a timing file ({key: [start, end]} or
{key: seconds}) — so a cut lands on the narrator's line — plus an optional `pad`.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from comic.camera import MOVES

TRANSITIONS = {'cut': 0.0, 'whip': .36, 'smash': .16, 'slide': .55, 'turn': .7, 'fade': .45}
FX_KINDS = {'smoke', 'shards', 'droplets', 'glint', 'rain', 'flare', 'godrays', 'embers', 'speedlines', 'stars', 'flash',
            'stamp', 'smash', 'caption', 'title', 'tab', 'handheld', 'cutout'}
TONES = ('LAUGH', 'WAR', 'HEART')


@dataclass
class Beat:
    panel: str
    dur: float
    move: str = 'hold'
    focus: tuple | None = None
    amount: float | None = None
    ease: str | None = None
    fx: list = field(default_factory=list)
    transition: str = 'cut'
    tdur: float = 0.0
    shake: float | None = None
    speed: float = 1.0
    start: float = 0.0
    raw: dict = field(default_factory=dict)


class EpisodeError(ValueError):
    pass


def _fx_list(b: dict) -> list[dict]:
    out = []
    for e in b.get('fx', []) or []:
        e = {'type': e} if isinstance(e, str) else dict(e)
        if e.get('type') not in FX_KINDS:
            raise EpisodeError(f"unknown fx: {e.get('type')}")
        out.append(e)
    if b.get('caption'):
        c = b['caption']
        out.append({'type': 'caption', **({'text': c} if isinstance(c, str) else c)})
    if b.get('smash'):
        s = b['smash']
        out.append({'type': 'smash', **({'text': s} if isinstance(s, str) else s)})
    return out


def timing_of(timing: dict | None, key: str) -> float | None:
    if not timing or key not in timing:
        return None
    v = timing[key]
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, (list, tuple)) and len(v) == 2:
        return float(v[1]) - float(v[0])
    if isinstance(v, dict) and 'start' in v and 'end' in v:
        return float(v['end']) - float(v['start'])
    raise EpisodeError(f'timing for {key} is not [start, end] or seconds')


def load(path: Path | dict, timing: dict | None = None) -> tuple[dict, list[Beat]]:
    ep = path if isinstance(path, dict) else json.loads(Path(path).read_text(encoding='utf-8'))
    if ep.get('tone', 'LAUGH') not in TONES:
        raise EpisodeError(f"tone must be one of {TONES}")
    beats, t = [], 0.0
    for i, b in enumerate(ep['beats']):
        dur = None
        if b.get('voice'):
            dur = timing_of(timing, b['voice'])
            if dur is None and 'dur' not in b:
                raise EpisodeError(f"beat {i}: voice key {b['voice']!r} is not in the timing file and the beat has no dur")
        if dur is None:
            dur = float(b['dur'])
        dur += float(b.get('pad', 0))
        if dur <= 0:
            raise EpisodeError(f'beat {i}: duration must be positive')
        mv = b.get('move', 'hold')
        if mv not in MOVES:
            raise EpisodeError(f'beat {i}: unknown move {mv}')
        tr = b.get('transition', 'cut')
        if tr not in TRANSITIONS:
            raise EpisodeError(f'beat {i}: unknown transition {tr}')
        td = float(b.get('tdur', TRANSITIONS[tr])) if i > 0 else 0.0
        if td >= dur:
            raise EpisodeError(f'beat {i}: the transition is longer than the beat')
        foc = b.get('focus')
        beats.append(Beat(b['panel'], dur, mv, tuple(foc) if isinstance(foc, (list, tuple)) else None, b.get('amount'), b.get('ease'),
                          _fx_list(b), tr if i > 0 else 'cut', td, b.get('shake'), float(b.get('speed', 1.0)), t, b))
        t += dur
    return ep, beats


def total(beats: list[Beat]) -> float:
    return beats[-1].start + beats[-1].dur if beats else 0.0


def frames(beats: list[Beat], fps: int) -> int:
    return int(round(total(beats) * fps))


def beat_at(beats: list[Beat], t: float) -> int:
    for i in range(len(beats) - 1, -1, -1):
        if t >= beats[i].start - 1e-9:
            return i
    return 0
