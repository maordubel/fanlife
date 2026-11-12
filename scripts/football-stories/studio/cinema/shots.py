"""The new visual types of the Director's Cut (contract §2), as animated shots: form, race, versus, goal, record, run,
trailer. Every number, date and name on screen is read from a claim or the story block; the writer only chooses which
claims and a short label.
"""
from __future__ import annotations

import math
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw

from ..common import FPS, H, W, StageError
from ..motion import Shot, clamp, ease_in_out, ease_out_back, ease_out_cubic
from . import gfx, look
from .story import LETTER, story_of
from .type import text

TYPES = ('form', 'race', 'versus', 'goal', 'record', 'run', 'trailer')


def _match(ed, cid: str | None) -> dict | None:
    c = ed.by.get(cid or '')
    return c['fact'] if c and c['fact'].get('kind') == 'match' else None


def _scale(im: Image.Image, s: float, sy: float | None = None) -> Image.Image:
    sy = s if sy is None else sy
    w, h = max(1, round(im.width * s)), max(1, round(im.height * sy))
    return im if (w, h) == im.size else im.resize((w, h), Image.BILINEAR)


def _fade(im: Image.Image, k: float) -> Image.Image:
    if k >= 0.999:
        return im
    out = im.copy()
    out.putalpha(im.getchannel('A').point(lambda p: int(p * k)))
    return out


def _at(im: Image.Image, cx: float, cy: float):
    return im, int(round(cx - im.width / 2)), int(round(cy - im.height / 2))


class Pieces:
    """An overlay made of pieces: `fn(t)` → list of (img, x, y); the motion engine draws them in order."""

    def __init__(self, fn):
        self.fn = fn

    def __call__(self, t):
        return [p for p in self.fn(t) if p]


def build(ed, sp, s: dict) -> Shot:
    kind = s['visual']['type']
    fn = {'form': form, 'race': race, 'versus': versus, 'goal': goal, 'record': record, 'run': run, 'trailer': trailer}.get(kind)
    if not fn:
        raise StageError('UNKNOWN_VISUAL', kind)
    return fn(ed, s)


def _ctx(ed, s: dict):
    dur = s['frames'] / FPS
    seed = 1000 + s['n'] * 7
    lead = (s['voice_at'] - s['start']) if s.get('voice_at') is not None else 0.4
    cin = s.get('cinema') or {}
    return dur, seed, lead, cin, gfx.Inks(ed.pal)


def _world(ed, s: dict, cin: dict, moods: list[str], seed: int, dim: float = 0.55) -> Image.Image:
    key = cin.get('broll') or look.pick(moods, ed.pal.render_bans, f"{ed.ledger.get('club_id')}:{s['n']}") or 'terrace-crowd'
    return Image.open(ed.backdrop(key, seed, dim=dim)).convert('RGB')


def _shot(s, dur, world, cam, overlays, cues, shake, kind, **kw) -> Shot:
    return Shot(index=s['n'], duration=dur, world=world, camera=cam, layers=[], entry='fade', shake=shake, cues=cues,
                meta={'kind': kind, 'cinema': True}, overlay=overlays, **kw)


# ------------------------------------------------------------------ form
def form(ed, s: dict) -> Shot:
    dur, seed, lead, cin, ink = _ctx(ed, s)
    v = s['visual']
    rows = sorted(((cid, f) for cid in v.get('claims') or [] if (f := _match(ed, cid))), key=lambda x: x[1]['date'])
    if not rows:
        raise StageError('FORM_NO_MATCHES', 'a form graphic needs match claims')
    n = len(rows)
    size = int(min(168, (W - 220) / n - 18))
    tiles = [gfx.tile(ink, f['outcome'], f"{f['club_goals']}–{f['opponent_goals']}", gfx.abbr(f['opponent']), f['side'], size) for _, f in rows]
    head = gfx.header(ink, f"Form guide · {gfx.short_date(rows[0][1]['date'])} – {gfx.short_date(rows[-1][1]['date'])}", v.get('label') or 'The run of results')
    t0 = 0.45
    step = clamp((max(dur - lead, 2.0) * 0.5) / n, 0.16, 0.48)
    gap = 18
    total = n * (size + 12) + (n - 1) * gap
    x0 = W / 2 - total / 2
    cy = H * 0.52
    cam = look.move(cin.get('camera') or 'push', dur, seed, cin.get('cam_pace') or cin.get('pace'))
    par = look.parallax(cam)
    lands = [t0 + 0.5 + i * step for i in range(n)]
    tallies = []
    acc = {'W': 0, 'D': 0, 'L': 0}
    for _, f in rows:
        acc[LETTER[f['outcome']]] += 1
        tallies.append(dict(acc))

    @lru_cache(maxsize=16)
    def tally_img(i: int) -> Image.Image:
        t_ = tallies[i] if i >= 0 else {'W': 0, 'D': 0, 'L': 0}
        return text(f"WON {t_['W']}  ·  DRAWN {t_['D']}  ·  LOST {t_['L']}", 'cond', 58, gfx.a(ink.paper), shift=6, plate=gfx.a(ink.accent))

    band = Image.new('RGBA', (W, tiles[0].height + 120), gfx.a(ink.ink, 150))

    def pieces(t):
        dx, dy = par(t)
        out = []
        k = ease_out_cubic(clamp((t - 0.15) / 0.45))
        if k > 0:
            out.append((head, int(90 - (1 - k) * 900 + dx), int(120 + dy)))
            out.append((band, int(-W * (1 - k)), int(cy - band.height / 2 + 10 + dy)))
        for i, tl in enumerate(tiles):
            ti = lands[i] - 0.22
            if t < ti:
                continue
            p = clamp((t - ti) / 0.22)
            sy = abs(math.cos(math.pi * (1 - p) / 2)) if p < 1 else 1.0
            sx = 1.0 + 0.12 * math.sin(math.pi * p) if p < 1 else 1.0
            im = _scale(tl, sx, max(0.04, sy))
            cx = x0 + i * (size + 12 + gap) + (size + 12) / 2
            bounce = -18 * math.sin(math.pi * clamp((t - lands[i]) / 0.25)) if t >= lands[i] else 0
            out.append(_at(im, cx + dx, cy + bounce + dy))
        done = max((i for i in range(n) if t >= lands[i]), default=-1)
        if t > t0 + 0.3:
            ti = tally_img(done)
            out.append(_at(ti, W / 2 + dx, cy + tiles[0].height / 2 + 110 + dy))
        return out

    cues = [(0.15, 'whoosh')] + [(lt, 'pop') for lt in lands] + [(lands[-1] + 0.3, 'stamp')]
    shake = [(lands[-1], 5)]
    world = _world(ed, s, cin, ['form', 'home'], seed)
    return _shot(s, dur, world, cam, [Pieces(pieces)], cues, shake, 'form')


# ------------------------------------------------------------------ race
def race(ed, s: dict) -> Shot:
    dur, seed, lead, cin, ink = _ctx(ed, s)
    v = s['visual']
    st = story_of(ed.ledger)
    rows = st.get('matches') or []
    if len(rows) < 2:
        raise StageError('RACE_TOO_SHORT', 'a form line needs at least two matches')
    n = len(rows)
    marks = [m for m in (v.get('mark') or []) if any(r['id'] == m for r in rows)][:4]
    tp = st.get('turning_point')
    ys = [r['form'] for r in rows]
    lo, hi = min(0, min(ys)) - 1, max(0, max(ys)) + 1
    X0, X1, Y0, Y1 = 170, W - 190, 300, 860

    def px(i):
        return X0 + (X1 - X0) * i / (n - 1)

    def py(y):
        return Y1 - (Y1 - Y0) * (y - lo) / (hi - lo)
    pts = [(px(i), py(y)) for i, y in enumerate(ys)]
    zero = py(0)
    # the static furniture: axis, zero line, month ticks
    base = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    d.rectangle([X0 - 40, Y0 - 40, X1 + 60, Y1 + 70], fill=gfx.a(ink.ink, 120))
    for x in range(int(X0), int(X1), 26):
        d.line([(x, zero), (x + 13, zero)], fill=gfx.a(ink.paper, 200), width=3)
    lab0 = text('WINS MINUS DEFEATS', 'caps', 20, gfx.a(ink.paper, 210), track=2)
    base.alpha_composite(lab0, (int(X0 - 20), int(Y0 - 32)))
    seen = set()
    for i, r in enumerate(rows):
        mo = r['date'][:7]
        if mo in seen:
            continue
        seen.add(mo)
        lab = text(gfx.short_date(r['date']).split(' ', 1)[1][:3], 'caps', 20, gfx.a(ink.paper, 200))
        base.alpha_composite(lab, (int(px(i) - lab.width / 2), int(Y1 + 30)))
        d.line([(px(i), Y1 + 14), (px(i), Y1 + 24)], fill=gfx.a(ink.paper, 200), width=3)
    head = gfx.header(ink, f"{ed.ledger.get('season')} · every match, all competitions", v.get('label') or 'The season')
    ball = _scale(ed.prop_img('football', 58), 1.0)
    glow = gfx.soft_glow(70, ink.paper, 170)
    t0, draw = 0.6, clamp(max(dur - lead, 3.0) * 0.62, 2.4, 7.5)
    ends = {}
    for m in marks + ([tp] if tp else []):
        i = next(j for j, r in enumerate(rows) if r['id'] == m)
        ends[m] = t0 + draw * i / (n - 1)

    @lru_cache(maxsize=8)
    def chip(m: str) -> Image.Image:
        r = next(x for x in rows if x['id'] == m)
        tone = ink.accent if r['outcome'] == 'win' else ink.paper if r['outcome'] == 'draw' else ink.ink
        fg = ink.on_accent if r['outcome'] == 'win' else ink.ink if r['outcome'] == 'draw' else ink.paper
        t1 = text(f"{r['club_goals']}–{r['opponent_goals']}", 'ultra', 40, gfx.a(fg))
        t2 = text(f"{'v' if r['side'] == 'home' else 'at'} {r['opponent']}".upper(), 'cond', 26, gfx.a(fg), max_w=300)
        w = max(t1.width, t2.width) + 34
        im = Image.new('RGBA', (w + 8, t1.height + t2.height + 32), (0, 0, 0, 0))
        dd = ImageDraw.Draw(im)
        dd.rectangle([8, 8, w + 8, im.height], fill=gfx.a(ink.ink if tone != ink.ink else ink.accent))
        dd.rectangle([0, 0, w, im.height - 8], fill=gfx.a(tone), outline=gfx.a(ink.ink), width=3)
        im.alpha_composite(t1, (int(w / 2 - t1.width / 2), 8))
        im.alpha_composite(t2, (int(w / 2 - t2.width / 2), t1.height + 14))
        return im
    tp_tag = text('TURNING POINT', 'caps', 22, gfx.a(ink.on_accent), track=2)
    tp_tag_p = gfx.plate(tp_tag.width + 24, tp_tag.height + 12, ink.accent, shift=5)
    tp_tag_p.alpha_composite(tp_tag, (12, 6))
    cam = look.move(cin.get('camera') or 'drift', dur, seed, cin.get('cam_pace') or cin.get('pace'))
    par = look.parallax(cam, -0.1)
    settled = {}

    def line_img(p: float) -> Image.Image:
        key = round(p, 3)
        if p >= 1 and 'done' in settled:
            return settled['done']
        im = base.copy()
        dd = ImageDraw.Draw(im)
        upto = p * (n - 1)
        j = int(upto)
        seg = pts[:j + 1]
        if j < n - 1:
            fr = upto - j
            seg = seg + [(pts[j][0] + (pts[j + 1][0] - pts[j][0]) * fr, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * fr)]
        if len(seg) >= 2:
            poly = seg + [(seg[-1][0], zero), (seg[0][0], zero)]
            dd.polygon(poly, fill=gfx.a(ink.accent, 70))
            dd.line([(x + 6, y + 6) for x, y in seg], fill=gfx.a(ink.ink), width=12, joint='curve')
            dd.line(seg, fill=gfx.a(ink.accent), width=10, joint='curve')
        for i in range(min(j + 1, n)):
            r = rows[i]
            col = ink.accent if r['outcome'] == 'win' else ink.paper if r['outcome'] == 'draw' else ink.ink
            x, y = pts[i]
            dd.ellipse([x - 7, y - 7, x + 7, y + 7], fill=gfx.a(col), outline=gfx.a(ink.ink if col != ink.ink else ink.paper), width=2)
        if p >= 1:
            fin = text(f"{'+' if ys[-1] > 0 else ''}{ys[-1]}", 'ultra', 54, gfx.a(ink.paper), shift=5, plate=gfx.a(ink.accent))
            im.alpha_composite(fin, (int(pts[-1][0] + 18), int(pts[-1][1] - fin.height / 2)))
            settled['done'] = im
        return im

    def pieces(t):
        dx, dy = par(t)
        out = []
        k = ease_out_cubic(clamp((t - 0.1) / 0.45))
        if k > 0:
            out.append((head, int(90 - (1 - k) * 900 + dx), int(64 + dy)))
        if t < t0 - 0.3:
            return out
        p = ease_in_out(clamp((t - t0) / draw))
        out.append((line_img(p), int(dx), int(dy)))
        upto = p * (n - 1)
        j = min(int(upto), n - 2)
        fr = upto - j
        hx = pts[j][0] + (pts[j + 1][0] - pts[j][0]) * fr
        hy = pts[j][1] + (pts[j + 1][1] - pts[j][1]) * fr
        if p < 1:
            out.append(_at(glow, hx + dx, hy + dy))
            out.append(_at(ball.rotate(-t * 540, resample=Image.BILINEAR), hx + dx, hy + dy))
        if tp and t >= ends.get(tp, 1e9):
            i = next(j for j, r in enumerate(rows) if r['id'] == tp)
            pulse = 1 + 0.25 * math.sin((t - ends[tp]) * 6)
            out.append(_at(_scale(glow, pulse * 1.3), pts[i][0] + dx, pts[i][1] + dy))
            kk = ease_out_back(clamp((t - ends[tp]) / 0.3), 2)
            out.append(_at(_scale(tp_tag_p, max(0.05, kk)), pts[i][0] + dx, pts[i][1] + 70 + dy))
        for idx, m in enumerate(marks):
            if t < ends[m]:
                continue
            i = next(j for j, r in enumerate(rows) if r['id'] == m)
            c = chip(m)
            kk = ease_out_back(clamp((t - ends[m]) / 0.32), 2.2)
            up = pts[i][1] > (Y0 + Y1) / 2 if idx % 2 == 0 else pts[i][1] > Y0 + 160
            cy_ = pts[i][1] - 110 if up else pts[i][1] + 110
            out.append(_at(_scale(c, max(0.05, kk)), clamp(pts[i][0], X0 + c.width / 2, X1 - c.width / 2) + dx, cy_ + dy))
        return out
    cues = [(0.1, 'whoosh'), (t0, 'whoosh')] + [(ends[m], 'pop') for m in marks] + ([(ends[tp], 'stamp')] if tp else []) + [(t0 + draw, 'stamp')]
    shake = [(ends[m], 4) for m in marks]
    world = _world(ed, s, cin, ['form', 'home'], seed, dim=0.6)
    return _shot(s, dur, world, cam, [Pieces(pieces)], cues, shake, 'race')


# ------------------------------------------------------------------ versus
def versus(ed, s: dict) -> Shot:
    dur, seed, lead, cin, ink = _ctx(ed, s)
    v = s['visual']
    f = _match(ed, v.get('claim'))
    if not f:
        raise StageError('VERSUS_NO_MATCH', 'a face-off needs a match claim')
    club = ed.ledger.get('club_name')
    rival = bool(cin.get('derby'))
    us_left = f['home'] == club or ed.ledger.get('neutral')
    left_name, right_name = f['home'], f['away']

    def field(colour, alpha, left: bool) -> Image.Image:
        im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        poly = [(0, 0), (W / 2 + 110, 0), (W / 2 - 110, H), (0, H)] if left else [(W / 2 + 110, 0), (W, 0), (W, H), (W / 2 - 110, H)]
        d.polygon(poly, fill=gfx.a(colour, alpha))
        st = gfx.stripes(W, H, ink.ink if colour != ink.ink else ink.paper, alpha=34 if colour != ink.ink else 18)
        mask = Image.new('L', (W, H), 0)
        ImageDraw.Draw(mask).polygon(poly, fill=255)
        im.paste(st, (0, 0), Image.composite(st, Image.new('RGBA', (W, H)), mask).getchannel('A'))
        return im
    lc = (ink.accent, 218) if us_left == (f['home'] == club) and f['home'] == club else (ink.ink, 225)
    rc = (ink.accent, 218) if f['away'] == club else (ink.ink, 225)
    if ed.ledger.get('neutral'):
        lc, rc = (ink.accent, 218), (ink.ink, 225)
    L = field(lc[0], lc[1], True)
    R = field(rc[0], rc[1], False)
    seam = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(seam).line([(W / 2 + 110, -10), (W / 2 - 110, H + 10)], fill=gfx.a(ink.paper), width=14)

    def name_img(nm, colour):
        fg = ink.on_accent if colour == ink.accent else ink.paper
        words = nm.upper().split()
        if len(words) >= 2 and len(nm) > 11:
            mid = len(words) // 2 if len(words) > 2 else 1
            lines = [' '.join(words[:mid]), ' '.join(words[mid:])]
        else:
            lines = [nm.upper()]
        ims = [text(x, 'head', 150, gfx.a(fg), max_w=640, shift=8, plate=gfx.a(ink.ink if colour != ink.ink else ink.accent)) for x in lines]
        w = max(i.width for i in ims)
        out = Image.new('RGBA', (w, sum(i.height for i in ims) + 10 * (len(ims) - 1)), (0, 0, 0, 0))
        y = 0
        for i in ims:
            out.alpha_composite(i, (int(w / 2 - i.width / 2), y))
            y += i.height + 10
        return out
    ln, rn = name_img(left_name, lc[0]), name_img(right_name, rc[0])
    top = ' · '.join(x for x in [f.get('competition'), f.get('stage')] if x).upper()
    top_i = text(top, 'caps', 30, gfx.a(ink.ink), max_w=1100, track=2)
    top_p = gfx.plate(top_i.width + 50, top_i.height + 22, ink.news, shift=7)
    top_p.alpha_composite(top_i, (25, 11))
    bot = ' · '.join(x for x in [gfx.long_date(f.get('date')), (f.get('venue') or {}).get('name')] if x).upper()
    bot_i = text(bot, 'caps', 28, gfx.a(ink.paper), max_w=1100, track=2)
    bot_p = gfx.plate(bot_i.width + 50, bot_i.height + 22, ink.ink, shift=7, shift_fill=ink.accent)
    bot_p.alpha_composite(bot_i, (25, 11))
    vs = text('VS', 'shout', 230, gfx.a(ink.paper), stroke=6, stroke_fill=gfx.a(ink.ink), shift=14, plate=gfx.a(ink.ink))
    sc = text(f"{f['score_home']}–{f['score_away']}", 'ultra', 170, gfx.a(ink.ink))
    sc_p = gfx.plate(sc.width + 90, sc.height + 50, ink.paper, shift=16, border=8)
    sc_p.alpha_composite(sc, (45, 25))
    ft_extra = 'A.E.T. · ' if f.get('after_extra_time') else ''
    ft = text(f"{ft_extra}FULL TIME", 'caps', 30, gfx.a(ink.on_accent), track=3)
    ft_p = gfx.plate(ft.width + 40, ft.height + 18, ink.accent, shift=6)
    ft_p.alpha_composite(ft, (20, 9))
    dtag = None
    if rival:
        dt_ = text('DERBY', 'shout', 70, gfx.a(ink.accent), stroke=3, stroke_fill=gfx.a(ink.ink))
        dtag = gfx.plate(dt_.width + 40, dt_.height + 20, ink.ink, shift=6, shift_fill=ink.accent)
        dtag.alpha_composite(dt_, (20, 10))
    t_vs = 0.85
    t_sc = dur + 1 if s.get('match_preview') else clamp(lead + 0.55 * max(s.get('voice_dur') or 0, 2.0), t_vs + 1.4, max(t_vs + 1.4, dur - 1.3))
    cam = look.move(cin.get('camera') or 'push', dur, seed, cin.get('cam_pace') or cin.get('pace'))
    par = look.parallax(cam, -0.12)

    def pieces(t):
        dx, dy = par(t)
        out = []
        k = ease_out_cubic(clamp(t / 0.45))
        out.append((L, int(-W * (1 - k)), 0))
        out.append((R, int(W * (1 - k)), 0))
        if k >= 1:
            out.append((seam, 0, 0))
        kn = ease_out_back(clamp((t - 0.35) / 0.35), 1.6)
        up = ease_in_out(clamp((t - t_sc + 0.05) / 0.3))  # when the score lands the names step up to make room
        if kn > 0:
            ny = H * (0.5 - 0.13 * up) + dy
            out.append(_at(_scale(ln, (0.6 + 0.4 * kn) * (1 - 0.18 * up)), W * 0.25 + dx - (1 - kn) * 200 - 40 * up, ny))
            out.append(_at(_scale(rn, (0.6 + 0.4 * kn) * (1 - 0.18 * up)), W * 0.75 + dx + (1 - kn) * 200 + 40 * up, ny))
        kt = ease_out_cubic(clamp((t - 0.5) / 0.4))
        if kt > 0:
            out.append(_at(top_p, W / 2 + dx, 186 - (1 - kt) * 300 + dy))
            out.append(_at(bot_p, W / 2 + dx, 186 + top_p.height + 4 - (1 - kt) * 300 + dy))
        if dtag is not None and t > 1.1:
            kd = ease_out_back(clamp((t - 1.1) / 0.3), 2)
            out.append(_at(_scale(dtag, max(0.05, kd)), (W * 0.2 if us_left else W * 0.8) + dx, H * 0.2 + dy))
        if t_vs <= t < t_sc + 0.15:
            kv = clamp((t - t_vs) / 0.2)
            sv = 2.4 - 1.4 * ease_out_cubic(kv)
            if t > t_sc - 0.1:
                sv *= 1 - clamp((t - (t_sc - 0.1)) / 0.25)
            if sv > 0.05:
                out.append(_at(_scale(vs, sv), W / 2 + dx, H * 0.52 + dy))
        if t >= t_sc:
            ks = clamp((t - t_sc) / 0.22)
            ss = 1.9 - 0.9 * ease_out_cubic(ks)
            out.append(_at(_scale(sc_p, ss), W / 2 + dx, H * 0.6 + dy))
            if t > t_sc + 0.35:
                kf = ease_out_back(clamp((t - t_sc - 0.35) / 0.3), 2)
                out.append(_at(_scale(ft_p, max(0.05, kf)), W / 2 + dx, H * 0.6 + sc_p.height / 2 + 26 + dy))
        return out
    roar = {'win': 'crowd-goal', 'loss': 'crowd-miss'}.get(f['outcome'], 'crowd-after')
    cues = [(0.0, 'whoosh'), (t_vs, 'drum'), (t_vs + 0.02, 'stamp'), (t_sc, 'sting'), (t_sc + 0.1, roar)]
    shake = [(0.45, 6), (t_vs, 12), (t_sc, 16)]
    world = _world(ed, s, cin, look.moods_for('versus', f, s.get('mood'), rival), seed, dim=0.5)
    sh = _shot(s, dur, world, cam, [Pieces(pieces)], cues, shake, 'versus')
    sh.meta['flash_at'] = [t_sc]
    return sh


# ------------------------------------------------------------------ goal
def goal(ed, s: dict) -> Shot:
    from ..director import goal_scores, goal_word_time
    dur, seed, lead, cin, ink = _ctx(ed, s)
    v = s['visual']
    f = _match(ed, v.get('claim'))
    if not f or not f.get('scorers'):
        raise StageError('GOAL_NO_SCORER', 'a goal graphic needs a match claim that names its scorers')
    sc = f['scorers']
    i = int(v.get('scorer') or 0)
    if not 0 <= i < len(sc):
        raise StageError('GOAL_SCORER_INDEX', f'scorer {i} is not in the claim')
    g = sc[i]
    club = ed.ledger.get('club_name')
    scores = goal_scores(ed.ledger, f).get(i)
    m = g.get('minute')
    t_hit = clamp(lead + 0.25 * max(s.get('voice_dur') or 0, 2.0), 1.6, 3.2)
    t_hit = clamp(goal_word_time(s, g['name'], t_hit), 0.8, dur - 0.9)
    t_clock = t_hit - 0.55
    us_home = f['home'] == club
    ab_us, ab_them = gfx.abbr(club), gfx.abbr(f['opponent'])

    @lru_cache(maxsize=64)
    def clock(mm: int, ss: int, goals: tuple[int, int] | None) -> Image.Image:
        h = 64
        tm = text(f'{mm:02d}:{ss:02d}', 'cond', 42, gfx.a(ink.ink))
        a1 = text(ab_us if us_home else ab_them, 'cond', 40, gfx.a(ink.paper))
        a2 = text(ab_them if us_home else ab_us, 'cond', 40, gfx.a(ink.paper))
        mid = None
        if goals is not None:
            hs, as_ = goals
            mid = text(f'{hs}–{as_}', 'cond', 40, gfx.a(ink.on_accent))
        w = a1.width + a2.width + (mid.width + 40 if mid else 30) + 60 + tm.width + 40
        im = Image.new('RGBA', (w + 8, h + 8), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.rectangle([8, 8, w + 8, h + 8], fill=gfx.a(ink.accent))
        d.rectangle([0, 0, w, h], fill=gfx.a(ink.ink))
        x = 20
        im.alpha_composite(a1, (x, int(h / 2 - a1.height / 2)))
        x += a1.width + 15
        if mid:
            d.rectangle([x, 0, x + mid.width + 20, h], fill=gfx.a(ink.accent))
            im.alpha_composite(mid, (x + 10, int(h / 2 - mid.height / 2)))
            x += mid.width + 35
        else:
            x += 15
        im.alpha_composite(a2, (x, int(h / 2 - a2.height / 2)))
        x += a2.width + 20
        d.rectangle([x, 0, w, h], fill=gfx.a(ink.paper))
        im.alpha_composite(tm, (x + 20, int(h / 2 - tm.height / 2)))
        return im
    net = gfx.Net(W + 200, int(H * 0.9))
    ball0 = ed.prop_img('football', 150)
    hit = (W * 0.6 + 100, H * 0.38)
    shout = text('GOAL!', 'shout', 250, gfx.a(ink.accent if ink.accent != ink.ink else ink.paper), stroke=7,
                 stroke_fill=gfx.a(ink.ink), shift=16, plate=gfx.a(ink.ink))
    mark = (' pen.' if g.get('penalty') else '') + (' o.g.' if g.get('own_goal') else '')
    mins = text(f"{m}’" if m is not None else '—', 'ultra', 70, gfx.a(ink.on_accent))
    nm = text(g['name'].upper() + mark.upper(), 'head', 92, gfx.a(ink.ink), max_w=1050)
    strap = Image.new('RGBA', (mins.width + nm.width + 110, max(mins.height, nm.height) + 50), (0, 0, 0, 0))
    d = ImageDraw.Draw(strap)
    hh = strap.height - 12
    d.rectangle([12, 12, strap.width - 1, strap.height - 1], fill=gfx.a(ink.ink))
    d.rectangle([0, 0, mins.width + 40, hh], fill=gfx.a(ink.accent), outline=gfx.a(ink.ink), width=5)
    d.rectangle([mins.width + 40, 0, strap.width - 12, hh], fill=gfx.a(ink.paper), outline=gfx.a(ink.ink), width=5)
    strap.alpha_composite(mins, (20, int(hh / 2 - mins.height / 2)))
    strap.alpha_composite(nm, (mins.width + 70, int(hh / 2 - nm.height / 2)))
    tick = text(f"{scores[1][0]}–{scores[1][1]}", 'ultra', 130, gfx.a(ink.on_accent)) if scores else None
    lines = gfx.speedlines(W, H, hit[0] - 100, hit[1], seed, alpha=110)
    cam = look.move(cin.get('camera') or 'push', dur, seed, cin.get('cam_pace') or cin.get('pace'))

    def pieces(t):
        out = []
        na = clamp((t - (t_hit - 0.5)) / 0.5) * (1 - clamp((t - t_hit - 1.6) / 0.8))
        nf = net.frame(t, (hit[0] + 100, hit[1] - H * 0.06), t_hit, na)
        if nf is not None:
            out.append((nf, -100, int(H * 0.06)))
        if m is not None and t >= 0.2:
            run_ = clamp((t - 0.2) / max(0.4, t_clock - 0.2))
            total = max(0, m - 6) * 60 + run_ * 6 * 60 if m >= 6 else run_ * m * 60
            total = min(total, m * 60) if t < t_hit else m * 60
            goals_ = scores[int(t >= t_hit)] if scores else None
            c = clock(int(total // 60), int(total % 60), goals_)
            out.append((c, 56, 46))
        if t_clock <= t < t_hit + 0.05:
            k = clamp((t - t_clock) / (t_hit - t_clock))
            e = k * k
            bx = -80 + (hit[0] + 80) * e
            by = H + 60 - (H + 60 - hit[1]) * e - 260 * math.sin(math.pi * k)
            out.append(_at(_scale(ball0.rotate(-k * 900, resample=Image.BILINEAR), 1.0 - 0.55 * e), bx, by))
        if t >= t_hit:
            k = clamp((t - t_hit) / 0.6)
            out.append(_at(_scale(ball0, 0.45), hit[0] + 30 * ease_out_cubic(k), hit[1] + 120 * ease_out_cubic(k)))
            if t < t_hit + 0.5:
                out.append((_fade(lines, 1 - (t - t_hit) / 0.5), 0, 0))
            if t < t_hit + 0.14:
                fl = Image.new('RGBA', (W, H), (255, 251, 242, int(235 * (1 - (t - t_hit) / 0.14))))
                out.append((fl, 0, 0))
            ks = clamp((t - t_hit - 0.05) / 0.2)
            if ks > 0:
                s_ = 2.6 - 1.6 * ease_out_cubic(ks)
                wob = 1 + 0.03 * math.sin((t - t_hit) * 9) * max(0, 1 - (t - t_hit) / 2)
                out.append(_at(_scale(shout, s_ * wob), W * 0.42, H * 0.36))
            kn = ease_out_cubic(clamp((t - t_hit - 0.55) / 0.4))
            if kn > 0:
                out.append((strap, int(70 - (1 - kn) * (strap.width + 100)), int(H * 0.66)))
            kt = clamp((t - t_hit - 0.4) / 0.3)
            if kt > 0 and tick is not None:
                p = gfx.plate(tick.width + 60, tick.height + 40, ink.accent, shift=12, border=6)
                p.alpha_composite(tick, (30, 20))
                out.append(_at(_scale(p, ease_out_back(kt, 1.8)), W - 70 - p.width / 2, H * 0.3))
        return out
    cues = [(0.1, 'whistle'), (t_clock, 'whoosh'), (t_hit, 'sting'), (t_hit + 0.02, 'crowd-goal'), (t_hit + 0.6, 'whoosh')]
    shake = [(t_hit, 18), (t_hit + 0.2, 10)]
    world = _world(ed, s, cin, ['goal', 'win'], seed, dim=0.45)
    sh = _shot(s, dur, world, cam, [Pieces(pieces)], cues, shake, 'goal')
    sh.meta['goal_at'] = t_hit
    return sh


# ------------------------------------------------------------------ record
def record(ed, s: dict) -> Shot:
    dur, seed, lead, cin, ink = _ctx(ed, s)
    v = s['visual']
    cid = str(v.get('claim') or '')
    if not cid.startswith('summary:'):
        raise StageError('RECORD_NEEDS_SUMMARY', 'a record graphic reads a summary:<competition> claim')
    comp = cid[8:]
    data = summary_for(ed.ledger, comp)
    if not data:
        raise StageError('RECORD_UNKNOWN', f'no summary for {comp}')
    vals = [('Won', data['won'], 'accent'), ('Drawn', data['drawn'], 'paper'), ('Lost', data['lost'], 'ink'),
            ('For', data['for'], 'paper'), ('Against', data['against'], 'paper')]
    head = gfx.header(ink, f"{ed.ledger.get('season')} · {comp}", v.get('label') or 'The record')
    bw = 270
    gap = 40
    x0 = W / 2 - (5 * bw + 4 * gap) / 2 + bw / 2
    cy = H * 0.5
    starts = [0.7 + 0.28 * i for i in range(5)]
    count_dur = 0.9

    @lru_cache(maxsize=256)
    def box(i: int, value: int) -> Image.Image:
        lab, _, tone = vals[i]
        return gfx.counter_box(ink, str(value), lab, tone, bw, bw)
    played = data['won'] + data['drawn'] + data['lost']
    bar_w = 5 * bw + 4 * gap
    cam = look.move(cin.get('camera') or 'pull', dur, seed, cin.get('cam_pace') or cin.get('pace'))
    par = look.parallax(cam)
    pl = text(f"PLAYED {played}", 'cond', 46, gfx.a(ink.paper), shift=5, plate=gfx.a(ink.ink))

    def pieces(t):
        dx, dy = par(t)
        out = []
        k = ease_out_cubic(clamp((t - 0.1) / 0.45))
        if k > 0:
            out.append((head, int(90 - (1 - k) * 900 + dx), int(80 + dy)))
        for i, (lab, val, tone) in enumerate(vals):
            if t < starts[i]:
                continue
            kc = ease_out_cubic(clamp((t - starts[i] - 0.15) / count_dur))
            cur = int(round(val * kc))
            kp = ease_out_back(clamp((t - starts[i]) / 0.35), 2)
            out.append(_at(_scale(box(i, cur), max(0.05, kp)), x0 + i * (bw + gap) + dx, cy + dy))
        tb = starts[2] + count_dur
        if t > tb and played:
            kb = ease_in_out(clamp((t - tb) / 0.9))
            bar = Image.new('RGBA', (bar_w + 10, 46), (0, 0, 0, 0))
            d = ImageDraw.Draw(bar)
            d.rectangle([8, 8, bar_w + 8, 44], fill=gfx.a(ink.accent if ink.accent != ink.ink else ink.paper))
            d.rectangle([0, 0, bar_w, 36], fill=gfx.a(ink.news), outline=gfx.a(ink.ink), width=3)
            x = 0
            for val, col in ((data['won'], ink.accent), (data['drawn'], ink.paper), (data['lost'], ink.ink)):
                w_ = bar_w * val / played * kb
                if w_ > 0:
                    d.rectangle([x, 0, x + w_, 36], fill=gfx.a(col), outline=gfx.a(ink.ink), width=3)
                x += w_
            out.append((bar, int(W / 2 - bar_w / 2 + dx), int(cy + bw / 2 + 50 + dy)))
            if kb >= 1:
                out.append((pl, int(W / 2 + bar_w / 2 - pl.width + dx), int(cy + bw / 2 + 110 + dy)))
        return out
    cues = [(0.1, 'whoosh')] + [(st_, 'pop') for st_ in starts] + [(starts[-1] + count_dur, 'stamp')]
    shake = [(starts[0], 4)]
    world = _world(ed, s, cin, ['record', 'form'], seed, dim=0.6)
    return _shot(s, dur, world, cam, [Pieces(pieces)], cues, shake, 'record')


def summary_for(ledger: dict, comp: str) -> dict | None:
    by = (ledger.get('summary') or {}).get('by_competition') or {}
    if comp in by:
        return by[comp]
    if comp == 'All competitions':
        out = {'played': 0, 'won': 0, 'drawn': 0, 'lost': 0, 'for': 0, 'against': 0}
        for c in ledger.get('claims') or []:
            f = c.get('fact') or {}
            if f.get('kind') != 'match':
                continue
            out['played'] += 1
            out[{'win': 'won', 'draw': 'drawn', 'loss': 'lost'}[f['outcome']]] += 1
            out['for'] += f['club_goals']
            out['against'] += f['opponent_goals']
        return out if out['played'] else None
    return None


# ------------------------------------------------------------------ run
def run_kind(outcomes: list[str]) -> str:
    if all(o == 'win' for o in outcomes):
        return 'wins in a row'
    if all(o != 'loss' for o in outcomes):
        return 'unbeaten'
    if all(o == 'loss' for o in outcomes):
        return 'defeats in a row'
    if all(o != 'win' for o in outcomes):
        return 'without a win'
    return 'matches'


def run(ed, s: dict) -> Shot:
    dur, seed, lead, cin, ink = _ctx(ed, s)
    v = s['visual']
    rows = sorted(((cid, f) for cid in v.get('claims') or [] if (f := _match(ed, cid))), key=lambda x: x[1]['date'])
    if not rows:
        raise StageError('RUN_NO_MATCHES', 'a streak needs match claims')
    n = len(rows)
    kind = run_kind([f['outcome'] for _, f in rows])
    head = gfx.header(ink, f"{gfx.short_date(rows[0][1]['date'])} – {gfx.short_date(rows[-1][1]['date'])}", v.get('label') or kind)
    per_row = n if n <= 7 else math.ceil(n / 2)
    size = 118 if n > 7 else 140
    tiles = [gfx.tile(ink, f['outcome'], f"{f['club_goals']}–{f['opponent_goals']}", gfx.abbr(f['opponent']), f['side'], size) for _, f in rows]
    t0 = 0.6
    step = clamp((max(dur - lead, 2.0) * 0.55) / n, 0.18, 0.6)
    lands = [t0 + i * step for i in range(n)]
    gx0 = W * 0.44
    th = tiles[0].height
    rows_n = math.ceil(n / per_row)
    gy0 = H * 0.55 - (rows_n * (th + 20)) / 2 + th / 2
    kind_i = text(kind.upper(), 'cond', 52, gfx.a(ink.paper), max_w=520, shift=5, plate=gfx.a(ink.accent))

    @lru_cache(maxsize=64)
    def big(k: int) -> Image.Image:
        return text(str(k), 'ultra', 330, gfx.a(ink.accent if ink.accent != ink.ink else ink.paper), stroke=8,
                    stroke_fill=gfx.a(ink.ink), shift=18, plate=gfx.a(ink.ink))
    cam = look.move(cin.get('camera') or 'push', dur, seed, cin.get('cam_pace') or cin.get('pace'))
    par = look.parallax(cam)

    def pieces(t):
        dx, dy = par(t)
        out = []
        k = ease_out_cubic(clamp((t - 0.1) / 0.45))
        if k > 0:
            out.append((head, int(90 - (1 - k) * 900 + dx), int(80 + dy)))
        done = sum(1 for lt in lands if t >= lt)
        if t > t0 - 0.2:
            b = big(done)
            j = max((i for i in range(n) if t >= lands[i]), default=None)
            pop = 1 + 0.22 * math.sin(math.pi * clamp((t - lands[j]) / 0.22)) if j is not None else 1
            out.append(_at(_scale(b, pop), W * 0.22 + dx, H * 0.5 + dy))
            out.append(_at(kind_i, W * 0.22 + dx, H * 0.5 + b.height / 2 + 30 + dy))
        for i, tl in enumerate(tiles):
            if t < lands[i]:
                continue
            kk = ease_out_back(clamp((t - lands[i]) / 0.28), 2.2)
            r_, c_ = divmod(i, per_row)
            out.append(_at(_scale(tl, max(0.05, kk)), gx0 + c_ * (tl.width + 14) + tl.width / 2 + dx, gy0 + r_ * (th + 20) + dy))
        return out
    cues = [(0.1, 'whoosh')] + [(lt, 'pop') for lt in lands] + [(lands[-1] + 0.25, 'stamp')]
    shake = [(lt, 3) for lt in lands[::2]]
    f_last = rows[-1][1]
    world = _world(ed, s, cin, ['win' if kind in ('wins in a row', 'unbeaten') else 'loss', 'form'], seed, dim=0.58)
    return _shot(s, dur, world, cam, [Pieces(pieces)], cues, shake, 'run')


# ------------------------------------------------------------------ trailer
def trailer(ed, s: dict) -> Shot:
    dur, seed, lead, cin, ink = _ctx(ed, s)
    v = s['visual']
    lines = [str(x) for x in (v.get('lines') or []) if str(x).strip()][:4]
    if not lines:
        raise StageError('TRAILER_NO_LINES', 'a trailer card needs 1–4 lines')
    n = len(lines)
    span = max(s.get('voice_dur') or 0, dur - lead - 0.4, n * 0.9)
    starts = [max(0.15, lead * 0.6) + span * j / n for j in range(n)]
    styles = [('slam', 'whip', 'settle')[(j + seed) % 3] for j in range(n)]
    styles[0] = 'slam'
    imgs = []
    for ln in lines:
        im = text(ln.upper(), 'head', 190, gfx.a(ink.paper), max_w=1640, shift=12, plate=gfx.a(ink.accent if ink.accent != ink.paper else ink.ink))
        bar = Image.new('RGBA', (im.width, im.height + 34), (0, 0, 0, 0))
        bar.alpha_composite(im, (0, 0))
        ImageDraw.Draw(bar).rectangle([0, im.height + 10, int(im.width * 0.38), im.height + 26], fill=gfx.a(ink.accent))
        imgs.append(bar)
    blurred = [Image.fromarray(look._blur_x(np.asarray(im), 40)) for im in imgs]
    lines_sp = gfx.speedlines(W, H, W / 2, H / 2, seed, n=90, alpha=90, inner=0.42)
    # the world cuts between pictures on each line: a trailer shows the season in flashes
    keys = []
    avoid = set()
    for j in range(n):
        k_ = look.pick(['trailer', 'europe', 'derby', 'win', 'form'][j % 5:] + ['trailer'], ed.pal.render_bans, f"{ed.ledger.get('club_id')}:{s['n']}:{j}", avoid)
        if cin.get('broll') and j == 0:
            k_ = cin['broll']
        keys.append(k_ or 'terrace-crowd')
        avoid.add(keys[-1])
    worlds = [Image.open(ed.backdrop(k_, seed + j, dim=0.48)).convert('RGB') for j, k_ in enumerate(keys)]

    def world_at(i: int) -> Image.Image:
        t = i / FPS
        j = max((jj for jj in range(n) if t >= starts[jj] - 0.04), default=0)
        return worlds[j]
    cam = look.move(cin.get('camera') or 'push', dur, seed, 'fast')

    def pieces(t):
        out = []
        j = max((jj for jj in range(n) if t >= starts[jj]), default=None)
        if j is None:
            return out
        tt = t - starts[j]
        im, st_ = imgs[j], styles[j]
        cy = H * 0.5
        if st_ == 'slam':
            k = clamp(tt / 0.18)
            out.append(_at(_scale(im, 2.3 - 1.3 * ease_out_cubic(k)), W / 2, cy))
        elif st_ == 'whip':
            k = clamp(tt / 0.2)
            if k < 1:
                out.append((_fade(lines_sp, 1 - k), 0, 0))
                out.append(_at(blurred[j], W / 2 + (1 - ease_out_cubic(k)) * W, cy))
            else:
                out.append(_at(im, W / 2 + 6 * math.sin(tt * 3), cy))
        else:  # settle: the line comes up once and eases into place, then holds (it used to flicker on like a bad splice — rule 142)
            k = ease_out_cubic(clamp(tt / 0.36))
            out.append(_at(_fade(_scale(im, 1.12 - 0.12 * k), k), W / 2, cy))
        if tt < 0.1:
            out.append((Image.new('RGBA', (W, H), (255, 251, 242, int(200 * (1 - tt / 0.1)))), 0, 0))
        return out
    cues = [(starts[0], 'sting')] + [(st_, 'drum') for st_ in starts[1:]]
    shake = [(st_, 14 if styles[j] == 'slam' else 7) for j, st_ in enumerate(starts)]
    sh = _shot(s, dur, worlds[0], cam, [Pieces(pieces)], cues, shake, 'trailer', world_frames=world_at)
    return sh
