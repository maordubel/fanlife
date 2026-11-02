"""The edit: script + measured narration + evidence → shots (an edit decision list) → frames → MP4.

Each beat becomes one shot that lasts exactly as long as its narration plus a lead-in and a breath. Data graphics read
their claim; nothing typed by the writer reaches a score, a date or a team name on screen.
Shots render in parallel worker processes and are joined without re-encoding; the narration is laid on the exact frame
each shot starts, so picture and voice cannot drift.
"""
from __future__ import annotations

import math
import os
import subprocess
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from .common import FPS, H, INK, KIT, NEWSPRINT, PAPER, W, Palette, StageError, hex_rgb, read_json, write_json
from .maps import city_of, pin_sprite
from .maps import render as render_map
from .motion import Layer, Pose, Shot, ShotRenderer, blend_entry, clamp, ease_in_out, ease_out_back, ease_out_cubic
from .paper import CANVAS, art_backdrop, beat_path, crumpled, supporter_scene
from .sprites import SpriteFactory, key_of

LEAD = 0.35       # picture before the voice
TAIL = 0.5        # breath after the voice
CHAPTER_LEAD = 1.3
CW, CH = CANVAS


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


class Editor:
    def __init__(self, job_dir: Path, ledger: dict, script: dict, voice: dict, palette: Palette, art_dir: Path):
        self.dir = job_dir
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
        if not art.startswith('beat:'):
            dim = 0.0
        if art.startswith('beat:') and beat_path(art):
            name = art[5:].replace('/', '--')
            return self.world_image(f'beat-{name}-{round(dim * 100)}', lambda: art_backdrop(art, bans=self.pal.bans, dim=dim))
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
                dur = lead + v['duration'] + tail
                start_f = round(t * FPS)
                end_f = round((t + dur) * FPS)
                shots.append({'n': n, 'chapter': ci, 'beat': bi, 'visual': b['visual'], 'claim_ids': b.get('claim_ids') or [],
                              'start': start_f / FPS, 'frames': end_f - start_f, 'voice_at': start_f / FPS + lead,
                              'voice_file': v['file'], 'voice_dur': v['duration'], 'words': v['words'], 'narration': b['narration']})
                t += dur
                n += 1
        start_f = round(t * FPS)
        shots.append({'n': n, 'chapter': len(self.script['chapters']) - 1, 'beat': -1, 'visual': {'type': 'end'}, 'claim_ids': [],
                      'start': start_f / FPS, 'frames': round(6.0 * FPS), 'voice_at': None, 'voice_file': None, 'voice_dur': 0, 'words': [], 'narration': ''})
        total = (start_f + round(6.0 * FPS)) / FPS
        chapters, last = [], None
        for s in shots:
            if s['beat'] == 0:
                chapters.append({'t': s['start'], 'title': self.script['chapters'][s['chapter']]['title']})
        return {'fps': FPS, 'shots': shots, 'duration': round(total, 3), 'chapters': chapters}

    # ------------------------------------------------------------------ shots
    def build(self, sp: SpriteFactory, s: dict) -> Shot:
        v = s['visual']
        kind = v['type']
        dur = s['frames'] / FPS
        seed = 1000 + s['n'] * 7
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
            world = self.backdrop(v.get('backdrop') or 'paper', seed, dim=0.32)
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
                co = city_of(c['fact']['opponent'])
                if co and co[0] not in seen:
                    pts.append({'name': co[0], 'lat': co[1][0], 'lon': co[1][1], 'home': False})
                    seen.add(co[0])
            focus = v.get('focus') or 'domestic'
            if len(pts) < 2 and focus != 'home':
                pts = pts or [{'name': 'Tel Aviv', 'lat': 32.08, 'lon': 34.78, 'home': True}]
            base, pins = render_map(pts, focus, seed % 9, 'Israel' if focus != 'europe' else None)
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
                layers.append(Layer(cap, slide_in(cap.width / 2 + 90, H - 150, 0.3, frm=(-700, 0), rot0=0, rot1=0, dur=0.5, drift=False), settle=1e9))
            lx, ly = last
            z1 = 1.18 if len(pins) > 1 else 1.3
            cam = (lambda lx=lx, ly=ly, z1=z1: (lambda t: (1.0 + (z1 - 1) * ease_in_out(t / dur), CW / 2 + (lx - CW / 2) * 0.35 * ease_in_out(t / dur), CH / 2 + (ly - CH / 2) * 0.35 * ease_in_out(t / dur))))()
        elif kind in ('matchday', 'score', 'ticket', 'fact', 'stat', 'table', 'timeline', 'turning'):
            backdrop = 'paper'
            if kind == 'turning':
                backdrop = v.get('backdrop') or 'terrace-empty'
            if kind == 'score' and f and f.get('outcome') == 'win' and f.get('stage') in ('Final', 'Semi-final'):
                backdrop = 'terrace-crowd'
            backdrop = v.get('backdrop') or backdrop
            # Behind a card an owner picture is darkened so the card is what the eye reads first.
            world = self.backdrop(backdrop, seed, dim=0.42 if backdrop.startswith('beat:') else 0.0)
            card = self.card(sp, k, v, f, claim, s)
            target = {'matchday': (1560, 760), 'score': (1560, 760), 'ticket': (1300, 620), 'fact': (1300, 720), 'stat': (1000, 820),
                      'table': (1480, 900), 'timeline': (1800, 640), 'turning': (1500, 560)}[kind]
            card = fit(card, *target)
            if kind not in ('timeline', 'table', 'turning'):
                card = taped(card, seed)
            cx, cy = W * (0.5 + ((seed % 3) - 1) * 0.04), H * 0.5
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
            elif kind == 'timeline':
                layers.append(Layer(card, reveal_lr(W / 2, H * 0.52, 0.3, dur=min(2.4, dur * 0.4)), settle=1e9))
                cues.append((0.3, 'paper'))
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
            art = v.get('art') or 'terrace-crowd'
            if art == 'gen':
                art = 'gen:' + key_of(s['n'])
            world = self.backdrop(art, seed)
            d = [(1.0, 1.12, 60, -20), (1.12, 1.0, -60, 20), (1.04, 1.14, -80, 0)][seed % 3]
            cam = cam_push(d[0], d[1], d[2], d[3], dur)
            if v.get('caption'):
                cap = fit(_img(sp.caption(k, v['caption'])), 1300, 130)
                layers.append(Layer(cap, slide_in(cap.width / 2 + 90, H - 140, 0.7, frm=(-700, 0), rot0=0, rot1=0, dur=0.5, drift=False), settle=1e9))
                cues.append((0.7, 'paper'))
        elif kind == 'end':
            srcs = sorted({(s_.get('title') or '').split('—')[0].strip() for c in self.ledger['claims'] for s_ in c.get('sources') or [] if s_.get('title')})
            line = 'Sources: ' + '; '.join(x for x in srcs[:4] if x) + ('; and others listed in the description' if len(srcs) > 4 else '')
            card = _img(sp.end_card('end', self.script['title_candidates'][self.script['selected']]['title'], line))
            world_img = Image.new('RGB', CANVAS, hex_rgb(NEWSPRINT))
            world_img.paste(card.convert('RGB'), ((CW - W) // 2, (CH - H) // 2))
            wp = self.worlds / 'end.png'
            world_img.save(wp)
            world = wp
            cam = cam_push(1.0, 1.02, 0, 0, dur)
            entry = 'fade'
            cues.append((0.0, 'end'))
        else:
            raise StageError('UNKNOWN_VISUAL', kind)

        layers += self.props(v, s, kind, dur, cues)
        return Shot(index=s['n'], duration=dur, world=Image.open(world).convert('RGB'), camera=cam, layers=layers,
                    entry=entry, shake=shake, cues=cues, meta={'kind': kind})

    def prop_img(self, name: str, h: int) -> Image.Image:
        im = Image.open(KIT / 'props' / f'{name}.webp').convert('RGBA')
        s_ = h / im.height
        return im.resize((max(1, round(im.width * s_)), h), Image.LANCZOS)

    def props(self, v: dict, s: dict, kind: str, dur: float, cues: list) -> list[Layer]:
        """The owner's cut-outs, moving: chosen by the script (`prop`) or by what the beat is about."""
        kinds = {self.by[c]['fact'].get('kind') for c in s['claim_ids'] if c in self.by}
        prop = v.get('prop')
        # An owner beat picture already shows the scene; an automatic cut-out over it would draw a second goal or a
        # second scarf. Only a prop the script asks for goes on top of one.
        owner_art = str(v.get('art') or v.get('backdrop') or '').startswith('beat:')
        if not prop and not owner_art:
            if kind == 'map' and v.get('focus') == 'europe':
                prop = 'passenger_plane'
            elif kind == 'map' and v.get('focus') == 'domestic':
                prop = 'supporters_bus'
            elif 'penalties' in kinds and kind in ('score', 'illustration', 'turning'):
                prop = 'goal_net'
            elif 'honour' in kinds and kind in ('score', 'turning', 'stat', 'illustration'):
                prop = 'generic_trophy'
            elif 'manager' in kinds:
                prop = 'coach'
            elif kind == 'chapter':
                prop = 'supporter_scarf'
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
            pens = next((c['fact'] for c in self.ledger['claims'] if c['fact'].get('kind') == 'penalties' and c['fact'].get('date') == f.get('date')), None)
            extra = f"{pens['winner']} won {pens['shootout']} on penalties" if pens else None
            if f.get('title_decided'):
                extra = (extra + ' · ' if extra else '') + 'The title is decided'
            return _img(sp.score(k, f, extra))
        if kind == 'ticket':
            return _img(sp.ticket(k, f))
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
            if i > 0 and shot.entry in ('fade', 'wipe'):
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
            write_json(Path(out_dir) / f'shot-{i:04d}.cues.json', {'cues': shot.cues, 'kind': shot.meta['kind']})
    return f'{idxs[0]}-{idxs[-1]}'


def render_film(job_dir: Path, plan: dict, palette: Palette, log, workers: int | None = None, only: list[int] | None = None) -> Path:
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
        with ProcessPoolExecutor(max_workers=len(args)) as ex:
            for done in ex.map(_render_range, args):
                log(f'Edit: shots {done} rendered')
    if only is not None:
        return out_dir
    lst = out_dir / 'list.txt'
    lst.write_text(''.join(f"file 'shot-{i:04d}.mp4'\n" for i in range(n)))
    silent = job_dir / 'picture.mp4'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', str(silent)], check=True)
    return silent
