"""The edit: script + measured narration + evidence → shots (an edit decision list) → frames → MP4.

Each beat becomes one shot that lasts exactly as long as its narration plus a lead-in and a breath. Data graphics read
their claim; nothing typed by the writer reaches a score, a date or a team name on screen.
Shots render in parallel worker processes and are joined without re-encoding; the narration is laid on the exact frame
each shot starts, so picture and voice cannot drift.
"""
from __future__ import annotations

import hashlib
import math
import re
import os
import subprocess
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from .common import FPS, H, INK, KIT, ROOT, NEWSPRINT, PAPER, W, Palette, StageError, hex_rgb, read_json, write_json
from .maps import city_of, pin_sprite, place_of
from .maps import render as render_map
from .audio import MOODS as _MOODS
from .motion import Confetti, Layer, Pose, Shot, ShotRenderer, blend_entry, clamp, ease_in_out, ease_out_back, ease_out_cubic
from .captions import Captions
from .package import sources_list
from .paper import CANVAS, ClipWorld, art_backdrop, beat_path, clip_path, crumpled, cut_path, cut_index, piece_meta, recolor, scrub, supporter_scene
from .sprites import SpriteFactory, key_of
from . import cinema

LEAD = 0.22       # picture before the voice: cut on the word, not before it
TAIL = 0.32       # breath after the voice
CHAPTER_LEAD = 0.95
CW, CH = CANVAS


END_MIN = 14.0


def _img(p) -> Image.Image:
    return Image.open(p).convert('RGBA')


def tape(seed: int, w: int = 150) -> Image.Image:
    rng = np.random.default_rng(seed)
    im = Image.new('RGBA', (w, 46), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pts = [(0, 4)] + [(x, int(rng.integers(0, 6))) for x in range(10, w, 10)] + [(w, 2), (w, 44)] + [(x, 40 + int(rng.integers(0, 6))) for x in range(w - 10, 0, -10)] + [(0, 42)]
    d.polygon(pts, fill=(236, 228, 205, 175))
    return im


def taped(card: Image.Image, seed: int) -> Image.Image:
    """Two strips of tape over the top corners, as on the reference collages."""
    pad = 30
    out = Image.new('RGBA', (card.width + pad * 2, card.height + pad * 2), (0, 0, 0, 0))
    out.alpha_composite(card, (pad, pad))
    for i, x in enumerate((pad - 40, card.width + pad - 110)):
        t = tape(seed + i).rotate(-28 if i == 0 else 26, expand=True, resample=Image.BICUBIC)
        out.alpha_composite(t, (max(0, x), 0))
    return out


def cam_push(z0=1.0, z1=1.06, dx=0.0, dy=0.0, dur=10.0):
    def f(t):
        k = ease_in_out(t / max(dur, 0.1))
        return z0 + (z1 - z0) * k, CW / 2 + dx * k, CH / 2 + dy * k
    return f


def slide_in(x, y, t0, *, frm=(0, 260), rot0=-6.0, rot1=-1.5, dur=0.6, drift=True, out_at=None):
    def pose(t):
        if t < t0:
            return None
        k = ease_out_back((t - t0) / dur, 1.2)
        px, py = x + frm[0] * (1 - k), y + frm[1] * (1 - k)
        r = rot0 + (rot1 - rot0) * k
        if drift and t > t0 + dur:
            px += 3 * math.sin((t - t0) * 0.7)
            py += 2 * math.cos((t - t0) * 0.6)
        a = clamp((t - t0) / 0.12)
        if out_at is not None and t > out_at:
            ko = ease_in_out((t - out_at) / 0.4)
            py += 900 * ko
        return Pose(px, py, 1.0, r, a)
    return pose


def slam(x, y, t0, *, s0=1.35, rot=-2.0, dur=0.32):
    def pose(t):
        if t < t0:
            return None
        k = ease_out_cubic((t - t0) / dur)
        return Pose(x, y, s0 + (1 - s0) * k, rot, clamp((t - t0) / 0.08))
    return pose


def pop(x, y, t0, *, dur=0.35, rot=0.0, scale=1.0):
    def pose(t):
        if t < t0:
            return None
        k = ease_out_back((t - t0) / dur, 2.2)
        return Pose(x, y, max(0.01, k) * scale, rot, clamp((t - t0) / 0.1))
    return pose


def reveal_lr(x, y, t0, dur=1.6):
    def pose(t):
        if t < t0:
            return None
        return Pose(x, y, 1.0, 0.0, 1.0, max(0.02, ease_in_out((t - t0) / dur)))
    return pose


def fit(img: Image.Image, maxw: int, maxh: int) -> Image.Image:
    s = min(1.0, maxw / img.width, maxh / img.height)
    return img if s >= 0.999 else img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)


MOOD_NAMES = set(_MOODS)


def atomic_save(im: Image.Image, out: Path) -> None:
    """Two render workers may cache the same picture at once: write aside, then rename, so a reader never sees half a PNG."""
    tmp = out.with_name(f'{out.stem}.{os.getpid()}.tmp{out.suffix}')
    im.save(tmp)
    os.replace(tmp, out)


class Editor:
    def __init__(self, job_dir: Path, ledger: dict, script: dict, voice: dict, palette: Palette, art_dir: Path):
        self.dir = job_dir
        self._clip = None
        self.ledger = ledger
        self.by = {c['id']: c for c in ledger['claims']}
        self.script = script
        self.voice = voice
        self.pal = palette
        self.art_dir = art_dir
        self.sprites_dir = job_dir / 'sprites'
        self.worlds = job_dir / 'worlds'
        self.worlds.mkdir(parents=True, exist_ok=True)

    def source_of(self, claim_id: str | None) -> str | None:
        c = self.by.get(claim_id or '')
        if not c or not c.get('sources'):
            return None
        t = c['sources'][0].get('title') or ''
        return 'Wikipedia' if 'wikipedia' in (c['sources'][0].get('url') or '') else t.split('—')[0].strip()[:48] or None

    def world_image(self, name: str, make) -> Path:
        p = self.worlds / f'{name}.png'
        if not p.exists():
            make().convert('RGB').save(p, compress_level=1)
        return p

    def backdrop(self, art: str | None, seed: int, dim: float = 0.0) -> Path:
        art = art or 'paper'
        if art.startswith('clip:') and clip_path(art):
            # A clip is a moving world: build() hands the reader to the shot, and the first frame stands in as the still.
            self._clip = ClipWorld(clip_path(art), self.pal.bans, dim, accent=self.pal.accent if piece_meta(art).get('accent') == 'key-red' else None)
            name = art[5:].replace('/', '--')
            first = self._clip(0)
            return self.world_image(f'clip-{name}-{round(dim * 100)}', lambda: first)
        if art.startswith('clip:'):
            art = 'terrace-crowd'
        if art.startswith('lib:'):  # the owner's moving-art library (cinema/library.py); absent → the house b-roll
            p = cinema.animate.backdrop(self, art, dim)
            if p:
                return p
            art = 'terrace-crowd'
        if not art.startswith('beat:'):
            dim = 0.0
        if art.startswith('beat:') and beat_path(art):
            name = art[5:].replace('/', '--')
            return self.world_image(f'beat-{name}-{round(dim * 100)}', lambda: art_backdrop(art, bans=self.pal.bans, dim=dim, accent=self.pal.accent))
        if art.startswith('beat:'):
            art = 'terrace-crowd'
        if art == 'paper':
            return self.world_image(f'paper-{seed % 9}', lambda: crumpled(seed % 9))
        if art == 'supporter':
            return self.world_image('supporter', lambda: supporter_scene(5))
        if art.startswith('gen:'):
            gp = self.art_dir / f'{art[4:]}.png'
            if gp.exists():
                return self.world_image(f'gen-{art[4:]}', lambda: art_backdrop(gp))
            art = 'terrace-crowd'
        return self.world_image(f'art-{art}', lambda: art_backdrop(art))

    def won_shootout(self, f: dict | None) -> bool:
        if not f:
            return False
        pens = f.get('penalties') or next((c['fact'] for c in self.ledger['claims']
                                             if c['fact'].get('kind') == 'penalties' and c['fact'].get('date') == f.get('date')), None)
        return bool(pens and pens.get('winner') == self.ledger.get('club_name'))

    def tie_through(self, f: dict | None) -> bool | None:
        """For a second leg: did the club go through? True / False, or None when this is not a two-legged tie the ledger
        holds both legs of. Aggregate first, then away goals (as the rule stood in the season the ledger is about)."""
        if not f or f.get('kind') != 'match' or f.get('stage') == 'Final' or not f.get('date'):
            return None
        comp = str(f.get('competition') or '')
        if not re.search(r'cup|uefa|champions|europa|conference|intertoto|cup winners|fairs', comp, re.I):
            return None  # a league plays each side twice, never as a tie: two derbies a month apart are not two legs
        import datetime as _d
        d2 = _d.date.fromisoformat(f['date'])
        first = None
        for c in self.ledger['claims']:
            g = c['fact']
            if (g.get('kind') == 'match' and g is not f and g.get('opponent') == f.get('opponent')
                    and g.get('competition') == f.get('competition') and g.get('date') and g.get('side') != f.get('side')):
                d1 = _d.date.fromisoformat(g['date'])
                if 0 < (d2 - d1).days <= 42:
                    first = g
        if not first:
            return None
        us, them = first['club_goals'] + f['club_goals'], first['opponent_goals'] + f['opponent_goals']
        if us != them:
            return us > them
        if int(str(self.ledger.get('season') or '0')[:4] or 0) >= 2021:
            return None  # UEFA dropped away goals from 2021/22: a level tie went to extra time and penalties
        away_us = first['club_goals'] if first['side'] == 'away' else f['club_goals']
        away_them = first['opponent_goals'] if first['side'] == 'home' else f['opponent_goals']
        return None if away_us == away_them else away_us > away_them

    def mood(self, b: dict) -> str:
        """What the music should feel under this beat: read from the record it shows and the words it says."""
        v, text = b['visual'], (b.get('narration') or '').lower().replace('champions league', 'european cup run')
        c = self.by.get(v.get('claim') or '')
        f = c['fact'] if c else {}
        if v['type'] == 'end':
            return 'anthem'
        if v['type'] == 'follow':
            return 'joy'
        if b.get('mood') in MOOD_NAMES:  # the script may say what a beat feels like when the words alone mislead
            return b['mood']
        if v['type'] == 'trailer':
            return 'build'
        if v['type'] in ('goal', 'versus') and f.get('kind') == 'match':
            if v['type'] == 'goal':
                return 'triumph' if f.get('outcome') == 'win' and (f.get('stage') == 'Final' or f.get('title_decided')) else 'joy'
            return 'tense'
        if v['type'] in ('form', 'run', 'race', 'record'):
            ids = v.get('claims') or []
            outs = [self.by[i]['fact'].get('outcome') for i in ids if i in self.by and self.by[i]['fact'].get('kind') == 'match']
            if outs and all(o == 'loss' for o in outs):
                return 'sad'
            if outs and all(o == 'win' for o in outs):
                return 'joy'
            return 'build'
        if v['type'] == 'score' and f.get('stage') == 'Final' and self.won_shootout(f):
            return 'triumph'
        if any(w in text for w in ('penalt', 'shoot-out', 'extra time', 'eighty-fifth', 'last minute')):
            return 'tense'
        if v['type'] == 'score' and f.get('kind') == 'match':
            if f.get('title_decided') or (f.get('outcome') == 'win' and f.get('stage') in ('Final', 'Semi-final')):
                return 'triumph'
            tie = self.tie_through(f)
            if tie is not None:  # a second leg is about the tie, not the night: lost 3-2 and through is still a good night
                return 'joy' if tie else 'sad'
            return {'win': 'joy', 'loss': 'sad', 'draw': 'minor'}.get(f.get('outcome'), 'minor')
        if any(w in text for w in ('champions', 'the double', 'title', 'won the', 'cup stayed')):
            return 'triumph' if v['type'] in ('turning', 'illustration', 'stat', 'table') else 'joy'
        if any(w in text for w in ('defeat', 'lost', 'slump', 'went wrong', 'over by', 'question', 'fear')):
            return 'sad'
        if v['type'] in ('matchday', 'turning'):
            return 'tense'
        if v['type'] == 'chapter':
            return 'build'
        return 'minor'

    def plan(self) -> dict:
        """The edit decision list: timing for every shot, without rendering anything."""
        shots, t = [], 0.0
        vb = {(b['chapter'], b['beat']): b for b in self.voice['beats']}
        n = 0
        for ci, ch in enumerate(self.script['chapters']):
            for bi, b in enumerate(ch['beats']):
                v = vb[(ci, bi)]
                kind = b['visual']['type']
                lead = CHAPTER_LEAD if kind == 'chapter' else (1.0 if n == 0 else LEAD)
                tail = TAIL + (0.4 if bi == len(ch['beats']) - 1 else 0)
                dur = max(lead + v['duration'] + tail, cinema.min_duration(b['visual']))
                if kind == 'end':
                    dur = max(dur, END_MIN)  # the call to the site holds until every tile and the address have landed
                start_f = round(t * FPS)
                end_f = round((t + dur) * FPS)
                shots.append({'n': n, 'chapter': ci, 'beat': bi, 'visual': b['visual'], 'claim_ids': b.get('claim_ids') or [],
                              'mood': self.mood(b),
                              'start': start_f / FPS, 'frames': end_f - start_f, 'voice_at': start_f / FPS + lead,
                              'voice_file': v['file'], 'voice_dur': v['duration'], 'words': v['words'], 'narration': b['narration'],
                              'beat_fx': cinema.beat_fx(b)})
                t += dur
                n += 1
        start_f = round(t * FPS)
        if not shots or shots[-1]['visual'].get('type') != 'end':
            shots.append({'n': n, 'chapter': len(self.script['chapters']) - 1, 'beat': -1, 'visual': {'type': 'end'}, 'claim_ids': [],
                          'start': start_f / FPS, 'frames': round(END_MIN * FPS), 'voice_at': None, 'voice_file': None, 'voice_dur': 0,
                          'words': [], 'narration': ''})
            start_f += round(END_MIN * FPS)
        from .media_assets import place
        shots, media_usage = place(shots, self.ledger)
        total = sum(s['frames'] for s in shots) / FPS
        cinema.direct_plan(self, shots)
        for s in shots:
            if s.get('required_asset'):
                s['cinema'] = {'entry': 'dissolve', 'lib': [], 'lower': [], 'letterbox': False}
        chapters, last = [], None
        for s in shots:
            if s['chapter'] != last:
                chapters.append({'t': s['start'], 'title': self.script['chapters'][s['chapter']]['title']})
                last = s['chapter']
        dr = cinema.direct_mod.director_of(self)
        return {'fps': FPS, 'shots': shots, 'duration': round(total, 3), 'chapters': chapters,
                'director': (dr or {}).get('id'), 'music_key': (dr or {}).get('music'), 'media_usage': media_usage}

    # ------------------------------------------------------------------ shots
    def build(self, sp: SpriteFactory, s: dict) -> Shot:
        if s['visual']['type'] in cinema.TYPES:
            self._clip = None
            shot = cinema.build(self, sp, s)
            if self._clip is not None and shot.world_frames is None:  # a moving b-roll (a library clip) behind the card
                shot.world_frames, self._clip = self._clip, None
            caps = None
            if os.environ.get('STORIES_BURN_CAPTIONS', '1') != '0' and s.get('words') and s.get('voice_at') is not None:
                caps = Captions(s['words'], s['voice_at'] - s['start'], self.pal.accent)
            shot.overlay = list(shot.overlay or []) + ([caps] if caps else [])
            cinema.dress(self, shot, s)
            return shot
        shot = self._build(sp, s)
        if not s.get('required_asset'):
            cinema.dress(self, shot, s)
        return shot

    def _build(self, sp: SpriteFactory, s: dict) -> Shot:
        v = s['visual']
        kind = v['type']
        dur = s['frames'] / FPS
        seed = 1000 + s['n'] * 7
        self._clip = None
        lead = s['voice_at'] - s['start'] if s['voice_at'] else 0.4
        claim = self.by.get(v.get('claim') or '')
        f = claim['fact'] if claim else None
        k = key_of(s['n'], kind)
        cues: list[tuple[float, str]] = []
        shake: list[tuple[float, float]] = []
        layers: list[Layer] = []
        entry = 'fade'
        cam = cam_push(1.0, 1.05, (seed % 5 - 2) * 18, (seed % 3 - 1) * 12, dur)
        world = None

        if kind == 'open':
            world = self.backdrop(v.get('backdrop') or 'tunnel', seed, dim=0.22)
            cam = cam_push(1.16, 1.0, 0, -30, dur)
            card = fit(_img(sp.open_title(k, v.get('headline') or '', v.get('kicker') or '')), 1560, 640)
            layers.append(Layer(card, slide_in(W / 2, H * 0.66, 0.9, frm=(0, 420), rot0=-3, rot1=-1.2, dur=0.8), settle=1e9))
            entry = 'black'
            cues += [(0.9, 'whoosh'), (1.6, 'paper')]
        elif kind == 'chapter':
            world = self.backdrop(v.get('backdrop') or (s.get('cinema') or {}).get('broll') or 'paper', seed, dim=0.32)
            card = fit(_img(sp.chapter(k, int(v.get('number') or s['chapter'] + 1), v.get('title') or self.script['chapters'][s['chapter']]['title'])), 1640, 460)
            layers.append(Layer(card, slam(W * 0.47, H * 0.48, 0.45, rot=-1.5), settle=1e9))
            st = _img(sp.stamp(key_of('season', self.ledger['season']), self.ledger['season']))
            layers.append(Layer(fit(st, 300, 300), slam(W * 0.82, H * 0.27, 1.0, s0=1.8, rot=6, dur=0.22), settle=1e9))
            shake += [(0.45, 9), (1.0, 6)]
            entry = 'wipe'
            cues += [(0.0, 'whoosh'), (0.45, 'stamp'), (1.0, 'stamp')]
        elif kind == 'map':
            pts, seen = [], set()
            home = city_of(self.ledger['club_name'])
            if home:
                pts.append({'name': home[0], 'lat': home[1][0], 'lon': home[1][1], 'home': True})
                seen.add(home[0])
            for cid in v.get('claims') or []:
                c = self.by.get(cid)
                if not c or c['fact'].get('kind') != 'match':
                    continue
                co = place_of(c['fact'], self.ledger['club_name'])
                if co and co[0] not in seen:
                    pts.append({'name': co[0], 'lat': co[1][0], 'lon': co[1][1], 'home': False})
                    seen.add(co[0])
            focus = v.get('focus') or 'domestic'
            if len(pts) < 2 and focus != 'home':
                pts = pts or [{'name': 'Tel Aviv', 'lat': 32.08, 'lon': 34.78, 'home': True}]
            base, pins = render_map(pts, focus, seed % 9, self.ledger.get('country', 'Israel' if self.ledger.get('club_id') == 'hapoel-tel-aviv' else None) if focus != 'europe' else None)
            wp = self.worlds / f'map-{s["n"]}.png'
            base.save(wp, compress_level=1)
            world = wp
            t0 = 0.5
            step = min(1.1, max(0.45, (dur * 0.55) / max(1, len(pins))))
            last = (CW / 2, CH / 2)
            for i, p in enumerate(pins):
                ti = t0 + i * step
                pin = pin_sprite(self.pal.accent, p['home'])
                layers.append(Layer(pin, pop(p['x'], p['y'], ti), settle=ti + 0.4, space='world'))
                lab = fit(_img(sp.label(key_of('city', p['name'], p['home']), p['name'].upper(), 'accent' if p['home'] else 'ink', 34)), 560, 84)
                lx = clamp(p['x'] + lab.width / 2 + 40, lab.width / 2 + 10, CW - lab.width / 2 - 10)
                layers.append(Layer(lab, pop(lx, p['y'] - 46, ti + 0.15, rot=2 if i % 2 else -2), settle=ti + 0.6, space='world'))
                cues.append((ti, 'pop'))
                last = (p['x'], p['y'])
            if v.get('label'):
                cap = fit(_img(sp.caption(k, v['label'])), 1300, 130)
                layers.append(Layer(cap, slide_in(cap.width / 2 + 90, 130, 0.3, frm=(-700, 0), rot0=0, rot1=0, dur=0.5, drift=False), settle=1e9))
            lx, ly = last
            z1 = 1.18 if len(pins) > 1 else 1.3
            cam = (lambda lx=lx, ly=ly, z1=z1: (lambda t: (1.0 + (z1 - 1) * ease_in_out(t / dur), CW / 2 + (lx - CW / 2) * 0.35 * ease_in_out(t / dur), CH / 2 + (ly - CH / 2) * 0.35 * ease_in_out(t / dur))))()
        elif kind in ('matchday', 'score', 'ticket', 'fact', 'stat', 'table', 'timeline', 'turning', 'quote', 'press'):
            backdrop = 'paper'
            if kind == 'turning':
                backdrop = v.get('backdrop') or 'terrace-empty'
            if kind == 'score' and f and f.get('outcome') == 'win' and f.get('stage') in ('Final', 'Semi-final'):
                backdrop = 'terrace-crowd'
            backdrop = v.get('backdrop') or (s.get('cinema') or {}).get('broll') or backdrop
            # Behind a card an owner picture is darkened so the card is what the eye reads first.
            world = self.backdrop(backdrop, seed, dim=0.42 if backdrop.startswith(('beat:', 'clip:')) else 0.0)
            card = self.card(sp, k, v, f, claim, s)
            target = {'matchday': (1560, 760), 'score': (1560, 760), 'ticket': (1300, 620), 'fact': (1300, 720), 'stat': (1000, 820),
                      'table': (1480, 800), 'timeline': (1800, 620), 'turning': (1500, 540), 'quote': (1380, 820),
                      'press': (1420, 840)}[kind]
            card = fit(card, *target)
            if kind not in ('timeline', 'table', 'turning'):
                card = taped(card, seed)
            cx, cy = W * (0.5 + ((seed % 3) - 1) * 0.04), H * 0.45
            if kind == 'score':
                layers.append(Layer(card, slam(cx, cy, 0.25, rot=-1.0), settle=1e9))
                shake.append((0.25, 10))
                cues += [(0.25, 'stamp')]
                if f and f.get('outcome') == 'win':
                    cues.append((0.4, 'crowd-goal'))
                elif f and f.get('outcome') == 'loss':
                    cues.append((0.4, 'crowd-miss'))
                else:
                    cues.append((0.4, 'crowd-after'))
                layers += self.scorer_chips(sp, f, cx, cy + card.height / 2, cues)
                layers += self.shout_for(sp, f, s, cx - card.width / 2, cy - card.height / 2, shake, cues, card.width)
            elif kind == 'timeline':
                layers.append(Layer(card, reveal_lr(W / 2, H * 0.46, 0.3, dur=min(2.4, dur * 0.4)), settle=1e9))
                cues.append((0.3, 'paper'))
            elif kind == 'press':  # a cutting dropped on the desk, then a slow read across it
                layers.append(Layer(card, slam(cx, cy, 0.2, s0=1.35, rot=-3.5, dur=0.3), settle=1e9))
                cues += [(0.2, 'paper'), (0.3, 'stamp')]
                shake.append((0.3, 5))
                cam = cam_push(1.0, 1.08, 30, -10, dur)
            elif kind == 'quote':
                layers.append(Layer(card, slide_in(cx, cy, 0.2, frm=(0, 260), rot0=2, rot1=-1, dur=0.55), settle=1e9))
                cues.append((0.2, 'paper'))
                cam = cam_push(1.0, 1.06, 0, 0, dur)
            elif kind == 'stat':
                layers.append(Layer(card, pop(cx, cy, 0.3, dur=0.45, rot=-2), settle=1e9))
                cues.append((0.3, 'stamp'))
                shake.append((0.4, 6))
            else:
                frm = [(0, 300), (-900, 40), (900, -30)][seed % 3]
                layers.append(Layer(card, slide_in(cx, cy, 0.25, frm=frm, rot0=-6 + (seed % 5), rot1=-1.5 + (seed % 3), dur=0.6), settle=1e9))
                cues.append((0.25, 'paper'))
            if kind == 'ticket':
                st = _img(sp.stamp(key_of('season', self.ledger['season']), self.ledger['season']))
                layers.append(Layer(fit(st, 260, 260), slam(cx + card.width * 0.36, cy + card.height * 0.18, 1.0, s0=1.8, rot=10, dur=0.2), settle=1e9))
                shake.append((1.0, 7))
                cues.append((1.0, 'stamp'))
            if kind == 'matchday' and dur > 5:
                ball = fit(_img(sp.svg('ball', 'element_05_ball.svg')), 210, 210)
                def roll(t, t0=1.2, x1=W * 0.84, y=H * 0.83):
                    if t < t0:
                        return None
                    kk = ease_out_cubic((t - t0) / 1.2)
                    return Pose(W + 160 - (W + 160 - x1) * kk, y, 1.0, 360 * kk * 1.3, 1.0)
                layers.append(Layer(ball, roll, settle=1e9))
            if kind == 'turning':
                fl = fit(_img(sp.svg('flood', 'element_03_floodlight.svg')), 420, 760)
                layers.append(Layer(fl, slide_in(W * 0.86, H * 0.52, 0.5, frm=(500, 0), rot0=0, rot1=0, dur=0.7, drift=False), settle=1e9))
                cam = cam_push(1.12, 1.0, 0, 0, dur)
        elif kind == 'illustration':
            art = v.get('art') or (s.get('cinema') or {}).get('broll') or 'terrace-crowd'
            if art == 'gen':
                art = 'gen:' + key_of(s.get('source_n', s['n']))
            if s.get('required_asset'):
                from .media_assets import require_file, whole_picture
                world = self.world_image(f'required-{s["n"]}', lambda: whole_picture(require_file(art), (W, H), self.pal.bans))
                cam = cam_push(1.0, 1.0, 0, 0, dur)
            else:
                world = self.backdrop(art, seed)
                d = [(1.0, 1.12, 60, -20), (1.12, 1.0, -60, 20), (1.04, 1.14, -80, 0)][seed % 3]
                cam = cam_push(d[0], d[1], d[2], d[3], dur)
            if v.get('caption'):
                cap = fit(_img(sp.caption(k, v['caption'])), 1300, 130)
                layers.append(Layer(cap, slide_in(cap.width / 2 + 90, 130, 0.7, frm=(-700, 0), rot0=0, rot1=0, dur=0.5, drift=False), settle=1e9))
                cues.append((0.7, 'paper'))
            if s.get('mood') in ('joy', 'triumph'):  # a goal or a night like this one is heard from the stands
                cues.append((0.35, 'crowd-goal'))
            elif s.get('mood') == 'tense':
                cues.append((0.35, 'crowd-after'))
        elif kind == 'follow':
            world, layers, cam = self.follow_shot(sp, k, v, s, dur, seed, cues, shake)
        elif kind == 'end':
            world, layers, cues = self.end_cta(sp, k, dur, seed, cues)
            cam = cam_push(1.04, 1.0, 0, 0, dur)
            entry = 'wipe'
        else:
            raise StageError('UNKNOWN_VISUAL', kind)

        drawn = v.get('art') if kind == 'illustration' else v.get('backdrop')
        if isinstance(drawn, str) and piece_meta(drawn).get('illustrated'):
            tag = fit(_img(sp.label(key_of('illustration-tag'), 'ILLUSTRATION', 'ink', 26)), 360, 64)
            layers.append(Layer(tag, lambda t, im=tag: Pose(W - im.width / 2 - 40, im.height / 2 + 46, 1.0, 0, 1.0), settle=1e9))
        layers += self.props(v, s, kind, dur, cues)
        behind, front = self.figures(v, s, kind, dur, cues, f)
        # A person stands BEHIND the card (paper laid on paper) and a crowd row rises in FRONT, along the bottom edge.
        layers = behind + layers + front
        clip, self._clip = self._clip, None
        caps = None
        if os.environ.get('STORIES_BURN_CAPTIONS', '1') != '0' and kind != 'end' and s.get('words') and s.get('voice_at') is not None:
            caps = Captions(s['words'], s['voice_at'] - s['start'], self.pal.accent)
        overlays = []
        if s.get('mood') == 'triumph' and kind in ('score', 'turning', 'illustration', 'stat', 'table'):
            overlays.append(Confetti(hex_rgb(self.pal.accent), t0=0.5, seed=s['n']))
            cues.append((0.5, 'crowd-final'))
        if caps:
            overlays.append(caps)
        return Shot(index=s['n'], duration=dur, world=Image.open(world).convert('RGB'), camera=cam, layers=layers,
                    entry=entry, shake=shake, cues=cues, meta={'kind': kind}, world_frames=clip, overlay=overlays)

    # ---------------------------------------------------------------- the call to follow the channel
    def follow_shot(self, sp: SpriteFactory, k: str, v: dict, s: dict, dur: float, seed: int, cues: list, shake: list):
        """Once per film: a supporters' card to fill in, a JOIN US! stamp, and a subscribe button that a pointer presses
        on the very word the narrator says it — the button turns to SUBSCRIBED, the bell rings and the end cheers."""
        world = self.backdrop(v.get('backdrop') or self.follow_backdrop(), seed, dim=0.45)
        layers: list[Layer] = []
        if cut_path('cut:common/fig-supporter-wave-in-kr'):  # a supporter beckoning the viewer in, behind the card
            fig = self.cut_img('cut:common/fig-supporter-wave-in-kr', 760)
            def beckon(t, im=fig, t0=0.15):
                if t < t0:
                    return None
                kk = ease_out_cubic(min(1.0, (t - t0) / 0.7))
                return Pose(-im.width / 2 + (W * 0.075 + im.width / 2) * kk, H - im.height / 2 + 30, 1.0, 1.5 * math.sin(t * 1.7), 1.0)
            layers.append(Layer(fig, beckon, settle=1e9))
        card = taped(fit(_img(sp.follow_card(k, 'Join the terrace', 'Subscribe for stories from the stands')), 1240, 640), seed)
        cx, cy = W * 0.43, H * 0.40
        layers.append(Layer(card, slide_in(cx, cy, 0.3, frm=(-900, 40), rot0=-5, rot1=-1.5, dur=0.6), settle=1e9))
        cues.append((0.3, 'paper'))
        sh = fit(_img(sp.shout(key_of('shout', 'JOIN US!', self.pal.accent), 'JOIN US!', 'accent')), 560, 230)
        layers.append(Layer(sh, slam(W * 0.80, H * 0.16, 1.1, s0=2.2, rot=-5, dur=0.22), settle=1e9))
        shake.append((1.1, 10))
        cues.append((1.1, 'stamp'))
        lead = (s['voice_at'] - s['start']) if s.get('voice_at') is not None else 0.6
        said = next((w['start'] for w in s.get('words') or [] if w['w'].lower().strip('.,!?;:') in ('subscribe', 'subscribe,')), None)
        t_click = clamp(lead + (said if said is not None else (dur - lead) * 0.55) + 0.25, 2.4, dur - 2.0)
        bx, by = W * 0.74, H * 0.80
        off = fit(_img(sp.sub_button(k, False)), 640, 200)
        on = fit(_img(sp.sub_button(k, True)), 640, 200)
        def before(t, t0=1.7, t1=t_click):
            if t < t0 or t >= t1:
                return None
            kk = ease_out_back(min(1.0, (t - t0) / 0.35), 2.0)
            pulse = 1.0 + 0.035 * math.sin((t - t0) * 7.0) if t > t0 + 0.5 else 1.0
            return Pose(bx, by, max(0.01, kk) * pulse, -2.0, 1.0)
        def after(t, t0=t_click):
            if t < t0:
                return None
            kk = ease_out_back(min(1.0, (t - t0) / 0.28), 2.6)
            return Pose(bx, by, 0.92 + 0.08 * kk, -2.0 + 3.0 * math.sin(min(1.0, (t - t0) / 0.5) * math.pi * 3) * (1 - min(1.0, (t - t0) / 0.6)), 1.0)
        layers += [Layer(off, before, settle=1e9), Layer(on, after, settle=1e9)]
        ptr = fit(_img(sp.pointer('p')), 110, 140)
        def point(t, t0=t_click - 1.0, t1=t_click):
            if t < t0:
                return None
            if t < t1:
                kk = ease_in_out((t - t0) / (t1 - t0))
                return Pose(W + 120 - (W + 120 - (bx + 120)) * kk, H + 120 - (H + 120 - (by + 30)) * kk, 1.0, 0, 1.0)
            press = 0.86 if t < t1 + 0.15 else 1.0
            fade = clamp(1 - (t - t1 - 1.2) / 0.5)
            return None if fade <= 0 else Pose(bx + 120, by + 30, press, 0, fade)
        layers.append(Layer(ptr, point, settle=1e9))
        if cut_path('cut:common/prop-handbell-n'):  # the bell rings when the button is pressed
            bell = self.cut_img('cut:common/prop-handbell-n', 210)
            def ring(t, t0=t_click + 0.1):
                if t < t0:
                    return None
                kk = ease_out_back(min(1.0, (t - t0) / 0.3), 2.4)
                swing = 18 * math.sin((t - t0) * 16) * max(0.0, 1 - (t - t0) / 1.6)
                return Pose(bx + 330, by - 150, max(0.01, kk), swing, 1.0)
            layers.append(Layer(bell, ring, settle=1e9))
            cues.append((t_click + 0.1, 'whoosh'))
        shake.append((t_click, 7))
        cues += [(t_click, 'stamp'), (t_click + 0.1, 'crowd-goal')]
        return world, layers, cam_push(1.0, 1.06, -20, 0, dur)

    FOLLOW_BACKDROPS = ('follow-seat-kept-kr', 'follow-turnstile-welcome-kr', 'follow-away-end-gap-kr', 'follow-pub-door-kr')

    def follow_backdrop(self) -> str:
        """One of the owner's follow-moment pictures, chosen by club and season, never one in the rival's colours."""
        bans = set(self.pal.bans)
        opts = []
        for slug in self.FOLLOW_BACKDROPS:
            key = f'beat:common/{slug}'
            if not beat_path(key):
                continue
            meta = piece_meta(key)
            fam = set(meta.get('families') or []) - ({'red'} if meta.get('accent') == 'key-red' else set())
            if not bans & fam:
                opts.append(key)
        if not opts:
            return 'terrace-crowd'
        h = int(hashlib.sha256(f"{self.ledger.get('club_id')}:{self.ledger.get('season')}".encode()).hexdigest()[:8], 16)
        return opts[h % len(opts)]

    # ---------------------------------------------------------------- the closing call to the site
    FEATURES = (('Trivia', 'brand/weekly/plates/cheer-line.webp'), ('Timeline', 'brand/magazine/photos/memorabilia.webp'),
                ('Shirt game', 'brand/magazine/photos/striped-shirt.webp'), ('Royal Rumble', 'brand/weekly/plates/kicker-line.webp'),
                ('Legends Manager', 'legends/brand/logo-512.webp'), ('LIFE', 'brand/weekly/plates/fatherson-line.webp'))

    def app_art(self, rel: str) -> Path:
        """A picture from the app itself (public/), scrubbed of the club's rival family; a badge in colours the rival
        owns is swapped for its one-ink version (rule 95)."""
        mono = {'brand/fanlife/logo-512.png': ('brand/fanlife/logo-mono.webp', {'red', 'green', 'blue'}),
                'legends/brand/logo-512.webp': ('legends/brand/logo-mono-512.webp', {'red', 'green', 'blue', 'yellow'})}
        if rel in mono and set(self.pal.bans) & mono[rel][1]:
            rel = mono[rel][0]
        out = self.sprites_dir / ('app-' + rel.replace('/', '--').rsplit('.', 1)[0] + '.png')
        if not out.exists():
            im = Image.open(ROOT / 'public' / rel).convert('RGBA')
            rgb = scrub(im.convert('RGB'), self.pal.bans).convert('RGBA')
            rgb.putalpha(im.getchannel('A'))
            atomic_save(rgb, out)
        return out

    def end_cta(self, sp: SpriteFactory, k: str, dur: float, seed: int, cues: list):
        """The last shot sends the viewer to the site: the badge, what is waiting there, the address, the sources."""
        wp = self.worlds / 'end-cta.png'
        if not wp.exists():
            crumpled(seed % 9, CANVAS, '#2A2620').save(wp)
        layers: list[Layer] = []
        badge = Image.open(self.app_art('brand/fanlife/logo-512.png')).convert('RGBA').resize((360, 360), Image.LANCZOS)
        layers.append(Layer(badge, slam(300, 300, 0.25, s0=1.8, rot=-8, dur=0.3), settle=1e9))
        cues += [(0.25, 'stamp')]
        head = fit(_img(sp.cta_headline('end', 'The whole archive is open', self.ledger.get('end_line') or f"{self.ledger['club_name']} and every club on FanLife")), 1250, 230)
        layers.append(Layer(head, slide_in(560 + head.width / 2, 210, 0.55, frm=(900, 0), rot0=2, rot1=-1, dur=0.5, drift=False), settle=1e9))
        cues.append((0.55, 'whoosh'))
        x0, y0, dx, dy = 700, 445, 380, 262
        for i, (label, rel) in enumerate(self.FEATURES):
            tile = fit(_img(sp.feature_tile(key_of('tile', label, self.pal.accent), label, self.app_art(rel),
                                            'accent' if i in (0, 4) else 'paper')), 300, 238)
            ti = 1.3 + 0.28 * i
            cx, cy = x0 + (i % 3) * dx, y0 + (i // 3) * dy
            layers.append(Layer(tile, pop(cx, cy, ti, dur=0.4, rot=(-3, 2, -1.5, 2.5, -2, 1)[i]), settle=1e9))
            cues.append((ti, 'pop'))
        url = fit(_img(sp.url_banner('end', 'fanlife.dubelteam.com', 'Every match · trivia · games · the life of a supporter')), 1500, 200)
        layers.append(Layer(url, slam(W / 2 - 40, H - 120, 3.6, s0=1.5, rot=-1.2, dur=0.3), settle=1e9))
        cues += [(3.6, 'stamp'), (3.7, 'crowd-goal')]
        srcs = sorted({x['title'].split(' — ')[0].strip() for x in sources_list(self.ledger['claims'])})
        line = 'Sources: ' + '; '.join(x for x in srcs[:4] if x) + ('; and others in the description' if len(srcs) > 4 else '')
        sm = fit(_img(sp.small_print('end', line)), 1700, 40)
        layers.append(Layer(sm, slide_in(W / 2, H - 22, 4.2, frm=(0, 60), rot0=0, rot1=0, dur=0.4, drift=False), settle=1e9))
        cues.append((0.0, 'end'))
        return wp, layers, cues

    def shout_for(self, sp: SpriteFactory, f: dict | None, s: dict, x: float, y: float, shake: list, cues: list,
                  card_w: float = 1100) -> list[Layer]:
        """One word stamped on the corner of a result: a win shouts, a title shouts louder, a defeat says so quietly."""
        if not f or f.get('kind') != 'match':
            return []
        if self.ledger.get('neutral'):  # a film with no side of its own: only an upset is shouted
            if f.get('outcome') != 'loss':
                return []
            word, tone = 'SHOCK!', 'accent'
        elif f.get('title_decided'):
            word, tone = 'CHAMPIONS!', 'accent'
        elif self.won_shootout(f):
            word, tone = ('CUP!' if f.get('stage') == 'Final' else 'YES!'), 'accent'
        elif (tie := self.tie_through(f)) is not None:
            word, tone = ('THROUGH!', 'accent') if tie else ('OUT', 'paper')
        elif f.get('outcome') == 'win' and f.get('stage') == 'Final':
            word, tone = 'CUP!', 'accent'
        elif f.get('outcome') == 'win':
            word, tone = ('GOAL!', 'YES!', 'WIN!')[s['n'] % 3], 'accent'
        elif f.get('outcome') == 'loss':
            word, tone = 'LOST', 'paper'
        else:
            return []
        im = fit(_img(sp.shout(key_of('shout', word, self.pal.accent), word, tone)), 640 if len(word) > 6 else 460, 240)
        t0 = 0.6
        shake.append((t0, 12 if tone == 'accent' else 4))
        cues.append((t0, 'stamp'))
        # on the card's top-right corner, where the bar is empty: the date on the left stays readable
        cx_ = min(W - im.width / 2 - 20, x + card_w - im.width / 2 + 70)
        return [Layer(im, slam(cx_, max(im.height / 2 + 14, y - im.height * 0.30), t0, s0=2.2, rot=-4, dur=0.22), settle=1e9)]

    def scorer_chips(self, sp: SpriteFactory, f: dict | None, cx: float, top: float, cues: list) -> list[Layer]:
        """The club's scorers as chips under the score, one after another — only when the archive names every goal."""
        if not f or not f.get('scorers') or f.get('club_goals') != len(f['scorers']):
            return []
        by: dict[str, list[str]] = {}
        for g in f['scorers']:
            mark = '’' + (' pen.' if g.get('penalty') else '') + (' o.g.' if g.get('own_goal') else '')
            by.setdefault(g['name'], []).append(f"{g['minute']}{mark}" if g.get('minute') is not None else '')
        chips = [fit(_img(sp.label(key_of('scorer', n, *m), f"{n}  {' '.join(x for x in m if x)}".strip(), 'paper', 34)), 620, 76) for n, m in by.items()]
        gap = 22
        total = sum(c.width for c in chips) + gap * (len(chips) - 1)
        if total > W - 160:
            chips = chips[:3]
            total = sum(c.width for c in chips) + gap * (len(chips) - 1)
        x = W / 2 - total / 2
        y = min(top + 64, H - 210)
        out = []
        for i, c in enumerate(chips):
            ti = 0.9 + 0.32 * i
            out.append(Layer(c, pop(x + c.width / 2, y, ti, dur=0.35, rot=(-2, 1.5, -1)[i % 3]), settle=1e9))
            cues.append((ti, 'pop'))
            x += c.width + gap
        return out

    def prop_img(self, name: str, h: int) -> Image.Image:
        im = Image.open(KIT / 'props' / f'{name}.webp').convert('RGBA')
        s_ = h / im.height
        return im.resize((max(1, round(im.width * s_)), h), Image.LANCZOS)

    # ---------------------------------------------------------------- people who move
    def cut_img(self, key: str, h: int) -> Image.Image:
        """An owner cut-out at height h: key red repainted in the club colour, the rival's family scrubbed, alpha kept."""
        out = self.sprites_dir / f"cut-{key[4:].replace('/', '--')}-{h}.png"
        if not out.exists():
            # a VOX worker can reach a cut-out before anything else has made the job's sprites folder: without it the
            # save failed and the board's people were silently left out
            out.parent.mkdir(parents=True, exist_ok=True)
            im = Image.open(cut_path(key)).convert('RGBA')
            s_ = h / im.height
            im = im.resize((max(1, round(im.width * s_)), h), Image.LANCZOS)
            rgb = im.convert('RGB')
            if piece_meta(key).get('accent') == 'key-red':
                rgb = recolor(rgb, self.pal.accent)
            rgb = scrub(rgb, self.pal.bans).convert('RGBA')
            rgb.putalpha(im.getchannel('A'))
            atomic_save(rgb, out)
        return Image.open(out).convert('RGBA')

    def pick_cut(self, base: str, salt: int) -> str | None:
        """One of the variants of a cut-out (`fig-x-kr`, `fig-x-b-kr`, `fig-x-c-kr`), chosen by club and shot — so two
        clubs' films, and two shots of one film, do not show the same drawing."""
        stem, kind = base.rsplit('-', 1)
        bans = set(self.pal.bans)
        opts = []
        for p in cut_index('common'):
            if not re.fullmatch(rf'cut:common/{re.escape(stem)}(-[bc])?-{kind}', p['key']):
                continue
            fam = set(p.get('families') or []) - ({'red'} if p.get('accent') == 'key-red' else set())
            if not bans & fam:
                opts.append(p['key'])
        if not opts:
            return None
        h = int(hashlib.sha256(f"{self.ledger.get('club_id')}:{salt}".encode()).hexdigest()[:8], 16)
        return sorted(opts)[h % len(opts)]

    def figures(self, v: dict, s: dict, kind: str, dur: float, cues: list, f: dict | None) -> tuple[list[Layer], list[Layer]]:
        """Figures and crowds that move over the shot: the script's `figure`, or one chosen by what the beat is about."""
        wanted = v.get('figure')
        keys = [wanted] if isinstance(wanted, str) else list(wanted or [])
        owner_illus = kind == 'illustration' and str(v.get('art') or '').startswith(('beat:', 'clip:'))
        lib_people = any(e.get('role') == 'actor' for e in (s.get('cinema') or {}).get('lib') or [])
        if not keys and not owner_illus and not lib_people and os.environ.get('STORIES_AUTO_FIGURES', '1') != '0':
            text = (s.get('narration') or '').lower()
            base = None
            if kind == 'score' and f:
                base = ('fig-celebrate-arms-kr', 'fig-celebrate-knee-slide-kr')[s['n'] % 2] if f.get('outcome') == 'win' else \
                       'fig-kneel-despair-kr' if f.get('outcome') == 'loss' else 'fig-supporter-scarf-up-kr'
                if 'penalt' in text or 'shoot-out' in text:
                    base = 'fig-keeper-dive-n'
            elif kind == 'matchday':
                base = 'crowd-row-scarves-up-kr'
            elif kind == 'chapter':
                base = 'crowd-row-flags-kr'
            elif kind == 'stat' and any(w in text for w in (' won', ' wins', 'goals', 'points', 'champion', 'unbeaten')):
                base = 'fig-supporter-jump-kr'
            elif kind == 'fact' and ('manager' in text or 'coach' in text):
                base = 'fig-manager-coat-n'
            elif kind == 'turning':
                base = 'fig-supporter-scarf-up-kr' if any(w in text for w in ('double', 'champion', 'won', 'title')) else 'crowd-row-still-kr'
            elif kind == 'ticket':
                base = 'crowd-row-still-kr'
            elif kind == 'follow':
                base = 'crowd-row-scarves-up-kr'
            if base:
                pk = self.pick_cut(base, s['n'])
                keys = [pk] if pk else []
        out: list[Layer] = []
        rows: list[Layer] = []
        side = 1 if (s['n'] % 2) else -1
        for i, key in enumerate(k for k in keys if cut_path(k)):
            motion = piece_meta(key).get('motion', 'stand')
            if motion == 'row':
                im = self.cut_img(key, 230)
                if im.width < W + 120:
                    im = im.resize((W + 120, round(im.height * (W + 120) / im.width)), Image.LANCZOS)
                def bob(t, im=im, t0=0.15):
                    if t < t0:
                        return None
                    k_ = ease_out_cubic(min(1.0, (t - t0) / 0.6))
                    return Pose(W / 2, H + im.height / 2 - min(170, im.height * 0.75) * k_ + 6 * math.sin(t * 5.2), 1.0, 0.6 * math.sin(t * 2.1), 1.0)
                rows.append(Layer(im, bob))
                cues.append((0.3, 'crowd-after'))
                continue
            hgt = {'dive': 380, 'run': 560, 'jump': 560, 'rise': 600, 'pop': 500}.get(motion, 560)
            im = self.cut_img(key, hgt)
            if side > 0:
                im = im.transpose(Image.FLIP_LEFT_RIGHT) if motion in ('run', 'dive') else im
            x_end = W * (0.5 + side * 0.42)
            y_end = H - 150 - im.height / 2
            t0 = 0.7 + 0.35 * i
            if motion == 'run':
                def go(t, im=im, t0=t0, x_end=x_end, y_end=y_end, side=side):
                    if t < t0:
                        return None
                    k_ = ease_out_cubic(min(1.0, (t - t0) / 0.9))
                    x0 = W / 2 + side * (W / 2 + im.width)
                    return Pose(x0 + (x_end - x0) * k_, y_end - 10 * abs(math.sin(t * 9)) * (1 - k_ * 0.7), 1.0, 0, 1.0)
            elif motion == 'dive':
                def go(t, im=im, t0=t0, x_end=x_end, side=side):
                    if t < t0:
                        return None
                    k_ = ease_out_cubic(min(1.0, (t - t0) / 0.7))
                    x0 = W / 2 - side * 260
                    return Pose(x0 + (x_end - x0) * k_, H * 0.62 - 140 * math.sin(math.pi * min(1.0, k_)), 1.0, -side * 8 * k_, 1.0)
            elif motion == 'jump':
                def go(t, im=im, t0=t0, x_end=x_end, y_end=y_end):
                    if t < t0:
                        return None
                    k_ = min(1.0, (t - t0) / 0.5)
                    hop = abs(math.sin((t - t0) * 3.4)) * 34 * max(0.25, 1 - (t - t0) / 6)
                    return Pose(x_end, y_end + (1 - ease_out_back(k_)) * 300 - hop, 1.0, 0, 1.0)
            elif motion == 'rise':
                def go(t, im=im, t0=t0, x_end=x_end, y_end=y_end):
                    if t < t0:
                        return None
                    k_ = ease_out_cubic(min(1.0, (t - t0) / 0.8))
                    return Pose(x_end, y_end + (1 - k_) * (im.height + 160) + 4 * math.sin(t * 2.6), 1.0, 0, 1.0)
            else:
                go = pop(x_end, y_end, t0, dur=0.4, rot=side * 1.5)
            out.append(Layer(im, go))
            cues.append((t0, 'whoosh' if motion in ('run', 'dive') else 'pop'))
        if kind in ('illustration', 'map', 'end'):
            return [], out + rows
        return out, rows

    def props(self, v: dict, s: dict, kind: str, dur: float, cues: list) -> list[Layer]:
        """The owner's cut-outs, moving: chosen by the script (`prop`) or by what the beat is about."""
        kinds = {self.by[c]['fact'].get('kind') for c in s['claim_ids'] if c in self.by}
        prop = v.get('prop')
        # An owner beat picture already shows the scene; an automatic cut-out over it would draw a second goal or a
        # second scarf. Only a prop the script asks for goes on top of one.
        owner_art = str(v.get('art') or v.get('backdrop') or '').startswith(('beat:', 'clip:'))
        if not prop and not owner_art:
            if kind == 'map' and v.get('focus') == 'europe':
                prop = 'passenger_plane'
            elif kind == 'map' and v.get('focus') == 'domestic':
                prop = 'supporters_bus'
            elif 'honour' in kinds and kind == 'illustration':
                prop = 'generic_trophy'
        if not prop:
            return []
        out: list[Layer] = []
        if prop == 'passenger_plane':
            im = self.prop_img(prop, 230).rotate(8, expand=True, resample=Image.BICUBIC)
            def fly(t, t0=0.6, d=max(3.0, dur * 0.7)):
                if t < t0:
                    return None
                k = ease_in_out((t - t0) / d)
                return Pose(-300 + (W + 600) * k, H * 0.78 - H * 0.42 * k, 0.8 + 0.25 * k, 6 * k, 1.0)
            out.append(Layer(im, fly))
            cues.append((0.6, 'whoosh'))
        elif prop == 'supporters_bus':
            im = self.prop_img(prop, 200)
            def drive(t, t0=0.5, d=max(3.0, dur * 0.8)):
                if t < t0:
                    return None
                k = (t - t0) / d
                return Pose(-im.width / 2 + (W + im.width) * clamp(k), H - 120 + 3 * math.sin(t * 20), 1.0, 0.0, 1.0)
            out.append(Layer(im, drive))
        elif prop == 'goal_net':
            net = self.prop_img(prop, 330)
            out.append(Layer(net, slide_in(W - net.width * 0.42, H - net.height * 0.42, 0.4, frm=(400, 0), rot0=0, rot1=0, dur=0.5, drift=False)))
            ball = self.prop_img('football', 110)
            def shot(t, t0=1.3, d=0.55):
                if t < t0:
                    return None
                k = ease_out_cubic((t - t0) / d)
                x0, y0, x1, y1 = W * 0.18, H * 0.95, W - net.width * 0.42, H - net.height * 0.5
                return Pose(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k - 160 * math.sin(math.pi * k), 1.0 - 0.35 * k, 540 * k, 1.0)
            out.append(Layer(ball, shot))
            cues.append((1.8, 'stamp'))
        elif prop == 'generic_trophy':
            im = self.prop_img(prop, 420)
            def rise(t, t0=0.9, d=0.9):
                if t < t0:
                    return None
                k = ease_out_back((t - t0) / d, 1.1)
                return Pose(W - im.width * 0.55, H + im.height * 0.5 - im.height * 0.95 * k, 1.0, -4 + 2 * math.sin(t), 1.0)
            out.append(Layer(im, rise))
        elif prop in ('coach', 'referee', 'board_member'):
            im = self.prop_img(prop, 560)
            out.append(Layer(im, slide_in(W - im.width * 0.55, H - im.height * 0.5 + 30, 0.7, frm=(420, 0), rot0=0, rot1=0, dur=0.7, drift=False)))
        elif prop == 'supporter_scarf':
            im = self.prop_img(prop, 230)
            def swing(t, t0=0.2):
                if t < t0:
                    return None
                k = ease_out_back((t - t0) / 0.7)
                return Pose(W * 0.5, -120 + 230 * k, 1.0, 2.5 * math.sin(t * 1.6), 1.0)
            out.append(Layer(im, swing))
        else:  # football, tactics_board, portable_radio, match_ticket: placed beside the main picture
            im = self.prop_img(prop, 360)
            out.append(Layer(im, pop(W - im.width * 0.6, H - im.height * 0.55, 0.9, dur=0.45, rot=-6)))
            cues.append((0.9, 'pop'))
        return out

    def card(self, sp: SpriteFactory, k: str, v: dict, f: dict | None, claim: dict | None, s: dict) -> Image.Image:
        kind = v['type']
        src = self.source_of(v.get('claim'))
        if kind == 'matchday':
            return _img(sp.matchday(k, f))
        if kind == 'score':
            pens = f.get('penalties') or next((c['fact'] for c in self.ledger['claims']
                                                if c['fact'].get('kind') == 'penalties' and c['fact'].get('date') == f.get('date')), None)
            extra = f"{pens['winner']} won {pens.get('shootout') or pens.get('score')} on penalties" if pens else None
            if not extra and f.get('after_extra_time'):
                extra = 'After extra time'
            if f.get('title_decided'):
                extra = (extra + ' · ' if extra else '') + 'The title is decided'
            return _img(sp.score(k, f, extra))
        if kind == 'ticket':
            return _img(sp.ticket(k, f))
        if kind == 'quote':
            return _img(sp.quote(k, v['text'], v['who'], v.get('role'), (claim or {}).get('fact', {}).get('outlet') or src))
        if kind == 'press':
            return _img(sp.press(k, v['outlet'], v.get('date') or (claim or {}).get('fact', {}).get('date'), v['headline'], v.get('standfirst')))
        if kind == 'fact':
            return _img(sp.fact(k, v.get('heading') or 'The record', v.get('text') or '', src))
        if kind == 'stat':
            return _img(sp.stat(k, v.get('value') or '', v.get('label') or '', src or ('the archive' if str(v.get('claim', '')).startswith('summary:') else None)))
        if kind == 'table':
            return _img(sp.table(k, f, self.ledger['club_name'], src))
        if kind == 'turning':
            return _img(sp.turning(k, v.get('title') or '', v.get('subtitle') or ''))
        if kind == 'timeline':
            pts = []
            for cid in v.get('claims') or []:
                c = self.by.get(cid)
                if not c or c['fact'].get('kind') != 'match':
                    continue
                m = c['fact']
                import datetime as dt
                d = dt.date.fromisoformat(m['date'])
                pts.append({'top': f'{d.day} {d.strftime("%b")} {d.year}', 'mid': f"{m['club_goals']}–{m['opponent_goals']}",
                            'low': ('v ' if m['side'] == 'home' else 'at ') + m['opponent'], 'hot': m['outcome'] == 'win'})
            return _img(sp.timeline(k, pts, v.get('label') or 'The run'))
        raise StageError('UNKNOWN_CARD', kind)


# ---------------------------------------------------------------------- rendering

def _render_range(args) -> str:
    job_dir, plan_path, ledger_path, script_path, voice_path, palette_json, idxs, out_dir = args
    from .common import read_json as rj
    ed = Editor(Path(job_dir), rj(Path(ledger_path)), rj(Path(script_path)), rj(Path(voice_path)), Palette.from_json(palette_json), Path(job_dir) / 'art')
    plan = rj(Path(plan_path))
    shots = plan['shots']
    acc = hex_rgb(ed.pal.accent)
    with SpriteFactory(ed.pal, ed.sprites_dir) as sp:
        for i in idxs:
            s = shots[i]
            out = Path(out_dir) / f'shot-{i:04d}.mp4'
            if out.exists():
                continue
            shot = ed.build(sp, s)
            prev_last = None
            if i > 0 and (shot.entry in ('fade', 'wipe', 'whip', 'push', 'burn', 'dissolve', 'split') or str(shot.entry).startswith('tr:')):
                ps = ed.build(sp, shots[i - 1])
                prev_last = ShotRenderer(ps).frame(ps.frames - 1, round(shots[i - 1]['start'] * FPS) + ps.frames - 1)
            r = ShotRenderer(shot)
            tmp = out.with_suffix('.part.mp4')
            p = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                                  '-c:v', 'libx264', '-preset', os.environ.get('STORIES_X264_PRESET', 'veryfast'), '-crf', '19', '-pix_fmt', 'yuv420p',
                                  '-g', str(FPS * 2), '-movflags', '+faststart', str(tmp)], stdin=subprocess.PIPE)
            g0 = round(s['start'] * FPS)
            for fi in range(s['frames']):
                fr = r.frame(fi, g0 + fi)
                fr = blend_entry(shot, fi, fr, prev_last, acc)
                p.stdin.write(fr.tobytes())
            p.stdin.close()
            if p.wait() != 0:
                raise StageError('ENCODE_FAILED', f'ffmpeg failed on shot {i}', retryable=True)
            tmp.rename(out)
            write_json(Path(out_dir) / f'shot-{i:04d}.cues.json', {'cues': shot.cues, 'kind': shot.meta['kind'], 'required_asset': s.get('required_asset')})
    return f'{idxs[0]}-{idxs[-1]}'


def render_film(job_dir: Path, plan: dict, palette: Palette, log, workers: int | None = None, only: list[int] | None = None,
                tick=None) -> Path:
    """`tick(done, total)` is called from this thread about every 40 s while shots render (the studio's progress bar)."""
    out_dir = job_dir / 'shots'
    out_dir.mkdir(parents=True, exist_ok=True)
    plan_path = job_dir / 'plan.json'
    write_json(plan_path, plan)
    n = len(plan['shots'])
    idxs = only if only is not None else list(range(n))
    todo = [i for i in idxs if not (out_dir / f'shot-{i:04d}.mp4').exists()]
    workers = workers or max(1, min(4, (os.cpu_count() or 2)))
    chunks = [todo[i::workers] for i in range(workers) if todo[i::workers]]
    args = [(str(job_dir), str(plan_path), str(job_dir / 'ledger.json'), str(job_dir / 'script.json'), str(job_dir / 'voice.json'), palette.to_json(), c, str(out_dir)) for c in chunks]
    if args:
        log(f'Edit: rendering {len(todo)} shots on {len(args)} workers')
        from concurrent.futures import FIRST_COMPLETED, wait
        with ProcessPoolExecutor(max_workers=len(args)) as ex:
            futs = {ex.submit(_render_range, a) for a in args}
            while futs:
                done_now, futs = wait(futs, timeout=40, return_when=FIRST_COMPLETED)
                for f in done_now:
                    log(f'Edit: shots {f.result()} rendered')
                if tick:
                    tick(sum(1 for i in idxs if (out_dir / f'shot-{i:04d}.mp4').exists()), len(idxs))
    if only is not None:
        return out_dir
    lst = out_dir / 'list.txt'
    lst.write_text(''.join(f"file 'shot-{i:04d}.mp4'\n" for i in range(n)))
    silent = job_dir / 'picture.mp4'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', str(silent)], check=True)
    return silent
