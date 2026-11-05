"""What each beat puts on the board — the Vox panels. One function per visual type, all reading the same claims the
classic edit reads (never a number the writer typed), and all built from the pieces in elements.py.

A panel is 1920×1080 units — the screen at zoom 1 — with everything placed in that frame: paper cards that slide or
drop onto the table, the words that rise onto them, the pen that circles the score, the counters that roll, the
cut-outs at the edges. Its `focus` is where the camera wants to look over the shot (panel units, shot time, zoom); the
board turns that into one continuous path (camera.py).
"""
from __future__ import annotations

import datetime as dt
import math
import re
from dataclasses import dataclass, field

from PIL import Image, ImageDraw

from ..common import FPS, StageError, hex_rgb
from ..motion import Pose, clamp, ease_in_out, ease_out_cubic
from ..cinema import gfx
from ..cinema.story import LETTER, story_of
from ..cinema.type import text
from . import elements as E
from .elements import INK, NEWS, PAPER, hsh, rot_pt

PW, PH = 1920, 1080

# How each director moves through the board (studio/directors.py): glide time between beats, overshoot on arrival,
# how far the camera pulls back mid-glide, how hard it pushes in on the key number, how fast counters roll, how many
# cut-out people stand at the edges, and the paper.
STYLES = {
    None: {'glide': 1.0, 'over': 0.045, 'bump': 0.24, 'push': 1.24, 'count': 1.0, 'people': 1, 'warm': False, 'roll': 1.2},
    'broadcaster': {'glide': 0.72, 'over': 0.065, 'bump': 0.16, 'push': 1.32, 'count': 0.7, 'people': 1, 'warm': False, 'roll': 0.8},
    'terrace': {'glide': 1.35, 'over': 0.02, 'bump': 0.27, 'push': 1.16, 'count': 1.25, 'people': 2, 'warm': True, 'roll': 1.6},
    'trailer': {'glide': 0.95, 'over': 0.07, 'bump': 0.42, 'push': 1.46, 'count': 0.9, 'people': 1, 'warm': False, 'roll': 2.4},
}


def style_of(director: str | None) -> dict:
    return dict(STYLES.get(director) or STYLES[None])


@dataclass
class Panel:
    n: int
    kind: str
    dur: float
    lead: float
    res: float
    els: list = field(default_factory=list)
    focus: list = field(default_factory=list)     # [(t, x, y, zoom)]
    cues: list = field(default_factory=list)
    shake: list = field(default_factory=list)
    flash: list = field(default_factory=list)
    targets: dict = field(default_factory=dict)   # name → rect (panel units), what the pen and the highlighter aim at

    def add(self, *els):
        for e in els:
            if e is not None:
                self.els.append(e)
        return els[0] if els else None

    def look(self, t, x, y, z):
        self.focus.append((round(max(0.0, min(t, self.dur)), 3), float(x), float(y), float(z)))

    def data_rects(self):
        return [e.rect for e in self.els if e.kind in ('data', 'text', 'photo') and e.layer == 'board' and e.rect]

    def cutout_rects(self):
        return [e.rect for e in self.els if e.kind == 'cutout' and e.rect]


class Ink:
    def __init__(self, pal):
        g = gfx.Inks(pal)
        self.accent, self.on_accent, self.ink, self.paper, self.news = g.accent, g.on_accent, INK, PAPER, NEWS
        r, gg, b = self.accent
        lum = (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255
        # the pen: the club colour, unless it is too pale to read on paper (then ink)
        self.pen = self.accent if lum < 0.62 and max(self.accent) - min(self.accent) > 40 else INK
        # the highlighter: a light tint of the club colour; ink-only clubs (every family banned) get a warm grey
        if max(self.accent) - min(self.accent) < 40:
            self.hl = (224, 214, 196)
        else:
            self.hl = tuple(int(c * 0.45 + 255 * 0.55) for c in self.accent)


def _f(ed, cid):
    c = ed.by.get(cid or '')
    return c['fact'] if c and c['fact'].get('kind') == 'match' else None


def _date(iso):
    return gfx.long_date(iso).upper() if iso else ''


# ------------------------------------------------------------------ shared pieces
class Builder:
    def __init__(self, ed, s: dict, res: float, style: dict):
        self.ed, self.s, self.res, self.st = ed, s, res, style
        self.ink = Ink(ed.pal)
        self.dur = s['frames'] / FPS
        self.lead = (s['voice_at'] - s['start']) if s.get('voice_at') is not None else 0.4
        self.vdur = float(s.get('voice_dur') or 0.0)
        self.seed = 1000 + s['n'] * 7
        self.cin = s.get('cinema') or {}
        self.P = Panel(s['n'], s['visual']['type'], self.dur, self.lead, res)
        self.side = 1 if hsh(ed.ledger.get('club_id'), s['n']) % 2 else -1

    # when the narrator reaches a fraction of his line
    def at_voice(self, frac: float, lo: float = 0.4, hi: float | None = None) -> float:
        t = self.lead + frac * max(self.vdur, 1.5)
        return clamp(t, lo, hi if hi is not None else max(lo, self.dur - 1.0))

    def card(self, w, h, cx, cy, rot, t0, *, tone=NEWS, style='slide', frm=(0, 700), tape=0, edges='tblr', z=40,
             kind='data', bake=None, halftone=False, border=None, s0=1.0, dur=0.6):
        """A paper card landing on the board; `bake(draw_img, pad, res)` prints its static type before it moves."""
        im, pad = E.paper(w, h, self.res, self.seed + int(cx) + int(cy), tone=tone, edges=edges, tape=tape, halftone=halftone, border=border)
        if bake:
            bake(im, pad, self.res)
        rect = (cx - w / 2, cy - h / 2, w, h)
        sp = E.Sprite(im, E.arrive(cx, cy, t0, frm=frm, rot0=rot + (6 if frm[0] or frm[1] else 0) * (1 if self.side > 0 else -1),
                                   rot1=rot, style=style, s0=s0, dur=dur), z=z, kind=kind, rect=rect, settle=t0 + dur + 0.05)
        self.P.add(sp)
        self.P.cues.append((t0, 'paper'))
        return sp

    def put(self, im: Image.Image, x: float, y: float, card_pad: float, dx: float, dy: float, center=False):
        """Print an image onto a card image at card-local units (dx, dy) from its top-left."""
        r = self.res
        X = int(card_pad + dx * r - (im.width / 2 if center else 0))
        Y = int(card_pad + dy * r - (im.height / 2 if center else 0))
        x.alpha_composite(im, (max(0, X), max(0, Y)))

    def t(self, s, font, size, fill, **k):
        return text(s, font, int(size * self.res), tuple(fill) + (255,), **{kk: (int(v * self.res) if kk in ('max_w', 'shift') and v else v) for kk, v in k.items()})

    def tl(self, s, font, size, fill):
        return E.tline(s, font, int(size * self.res), tuple(fill) + (255,))

    def one_line(self, s, font, size, max_w):
        """The size at which `s` fits on one line of `max_w` units (never under 60% of the asked size)."""
        from ..cinema.type import face as F
        sz = size
        while sz > size * 0.6 and F(font, int(sz * self.res)).length(s.upper()) / self.res * 1.08 + 0.12 * sz * len(s.split()) > max_w:
            sz -= 3
        return sz

    def words(self, s, x, y, size, t0, *, hot=None, **k):
        k.setdefault('stagger', 0.085 if self.st['count'] >= 1 else 0.06)
        w = E.Words(E.words_of(s, hot), x, y, size=size, res=self.res, hot=k.pop('hot_fill', self.ink.accent), t0=t0, **k)
        self.P.add(w)
        return w

    def type(self, s, x, y, size, t0, **k):
        tw = E.Typewriter(s, x, y, size=size, res=self.res, t0=t0, **k)
        self.P.add(tw)
        self.P.cues.append((t0, 'tick'))
        return tw

    def circle(self, rect, t0, name, dur=0.6, pad=22):
        m = E.Marker(E.circle_path(rect, self.seed + len(self.P.els), pad), t0=t0, dur=dur, res=self.res, colour=self.ink.pen, target=rect, name=name)
        self.P.add(m)
        self.P.targets[name] = rect
        self.P.cues.append((t0, 'pen'))
        return m

    def underline(self, rect, t0, name, dur=0.45):
        m = E.Marker(E.underline_path(rect, self.seed + len(self.P.els)), t0=t0, dur=dur, res=self.res, colour=self.ink.pen, target=rect, name=name)
        self.P.add(m)
        self.P.targets[name] = rect
        self.P.cues.append((t0, 'pen'))
        return m

    def arrow(self, a, b, t0, name, target=None, dur=0.5):
        m = E.Marker(E.arrow_path(a, b, self.seed + len(self.P.els)), t0=t0, dur=dur, res=self.res, colour=self.ink.pen, head=True,
                     target=target, name=name, width=8)
        self.P.add(m)
        if target:
            self.P.targets[name] = target
        self.P.cues.append((t0, 'pen'))
        return m

    def bracket(self, rect, t0, name, side='top'):
        m = E.Marker(E.bracket_path(rect, self.seed + len(self.P.els), side), t0=t0, dur=0.5, res=self.res, colour=self.ink.pen, target=rect, name=name)
        self.P.add(m)
        self.P.targets[name] = rect
        self.P.cues.append((t0, 'pen'))
        return m

    def highlight(self, rect, t0, name, rot=0.0, dur=0.45):
        h = E.Highlight(rect, t0=t0, dur=dur, res=self.res, colour=self.ink.hl, rot=rot, seed=self.seed + len(self.P.els), target=rect)
        self.P.add(h)
        self.P.targets[name] = rect
        self.P.cues.append((t0, 'pen'))
        return h

    def stamp(self, word, x, y, t0, rot=-7.0, size=110, tone='accent'):
        fill = self.ink.on_accent if tone == 'accent' else INK
        bg = self.ink.accent if tone == 'accent' else NEWS
        tw = self.t(word, 'shout', size, fill)
        pl = Image.new('RGBA', (tw.width + int(60 * self.res), tw.height + int(36 * self.res)), (0, 0, 0, 0))
        d = ImageDraw.Draw(pl)
        o = int(9 * self.res)
        d.rectangle([o, o, pl.width - 1, pl.height - 1], fill=INK + (255,))
        d.rectangle([0, 0, pl.width - 1 - o, pl.height - 1 - o], fill=bg + (255,), outline=INK + (255,), width=max(2, int(4 * self.res)))
        pl.alpha_composite(tw, (int(30 * self.res - o / 2), int(18 * self.res - o / 2)))
        w, h = pl.width / self.res, pl.height / self.res
        sp = E.Sprite(pl, E.arrive(x, y, t0, rot0=rot - 4, rot1=rot, s0=2.1, style='stamp', dur=0.32), z=92, kind='text',
                      rect=(x - w / 2, y - h / 2, w, h), settle=t0 + 0.4)
        self.P.add(sp)
        self.P.cues.append((t0, 'stamp'))
        self.P.shake.append((t0 + 0.08, 9))
        return sp

    def cut(self, base: str, h: float, x: float, foot: float, t0: float, *, side=None, motion='rise', near=True, exit=True):
        """One of the owner's cut-out people (kit/cutouts), wearing the club colour, standing at the panel's edge."""
        key = self.ed.pick_cut(base, self.s['n'] * 3 + len(self.P.els))
        if not key:
            return None
        try:
            im = self.ed.cut_img(key, int(h * self.res))
        except Exception:  # noqa: BLE001 — a missing cut-out leaves the edge empty, never stops the film
            return None
        return self.person(im, x, foot, t0, side=side, motion=motion, near=near, exit=exit)

    def person(self, im, x: float, foot: float, t0: float, *, side=None, motion='rise', near=True, exit=True):
        side = side if side is not None else self.side
        if side > 0 and motion == 'slide':
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        w, h = im.width / self.res, im.height / self.res
        y = foot - h / 2
        # a person stands beside the cards, never on them: step out towards the edge until clear, or stay out
        out_dir = 1 if x > PW / 2 else -1
        for _ in range(9):
            r_ = (x - w / 2, y - h / 2, w, h)
            if all(_ov(r_, d) < 0.03 * d[2] * d[3] for d in self.P.data_rects()):
                break
            x += out_dir * 60
        else:
            return None
        c = E.Cutout(im, x, y, t0=t0, dur=self.dur, side=side, motion=motion, res=self.res,
                     exit_at=(self.dur - 0.75) if exit else None, layer='near' if near else 'board',
                     rect=(x - w / 2, y - h / 2, w, h))
        self.P.add(c)
        self.P.cues.append((t0, 'paper'))
        return c

    def library(self):
        """The owner's moving-art library (cinema/library.py), as the plan chose it for this beat: its people step
        in at the edges of the board, its objects and documents are laid on the paper."""
        from ..cinema import animate
        els = self.cin.get('lib') or []
        k = 0
        for e in els:
            role, key, side = e.get('role'), e.get('key'), e.get('side', 1) or 1
            if role == 'actor':
                im = animate._sprite(self.ed, key, int(560 * self.res))
                if im is None:
                    continue
                self.person(im, PW / 2 + side * 820, PH + 40, max(0.3, min(self.lead, 0.9)) + 0.35 * k, side=side,
                            motion='slide' if e.get('motion') in ('walk', 'run', 'slide') else 'rise')
                k += 1
            elif role == 'object':
                im = animate._sprite(self.ed, key, int(300 * self.res))
                if im is None:
                    continue
                if im.width > 560 * self.res:
                    im = im.resize((int(560 * self.res), int(im.height * 560 * self.res / im.width)), Image.LANCZOS)
                w, h = im.width / self.res, im.height / self.res
                x, y = PW / 2 + side * 700, 230 if k % 2 else 820
                if any(_ov((x - w / 2, y - h / 2, w, h), d) > 0.2 * d[2] * d[3] for d in self.P.data_rects()):
                    continue
                self.P.add(E.Sprite(im, E.arrive(x, y, 0.5 + 0.25 * k, frm=(side * 700, 0), rot0=side * 10, rot1=side * 4, dur=0.6),
                                    z=34, kind='photo', rect=(x - w / 2, y - h / 2, w, h), settle=1.2 + 0.25 * k))
                self.P.cues.append((0.5 + 0.25 * k, 'paper'))
                k += 1

    def art(self, key: str | None, w: float, h: float, cx: float, cy: float, rot: float, t0: float, *, dim=0.0, frm=(0, 0),
            style='drop', z=30, tape=2, clip_ok=True):
        """A picture from the owner's library as a torn print on the board (halftone, a little duotone, tape)."""
        ed = self.ed
        key = key or 'terrace-crowd'
        clip = None
        if key.startswith('clip:') and clip_ok:
            from ..paper import ClipWorld, clip_path, piece_meta
            cp = clip_path(key)
            if cp:
                clip = ClipWorld(cp, ed.pal.bans, 0.0, accent=ed.pal.accent if piece_meta(key).get('accent') == 'key-red' else None)
        try:
            src = Image.open(ed.backdrop(key, self.seed, dim=dim)).convert('RGB')
        except Exception:  # noqa: BLE001
            src = Image.open(ed.backdrop('terrace-crowd', self.seed)).convert('RGB')
        W_, H_ = int(w * self.res), int(h * self.res)
        from ..paper import scrub
        # resampling can mix a new rival colour out of two allowed ones (rule 44): scrub again after the resize
        pic = scrub(_cover(src, (W_, H_)), ed.pal.bans)
        pic = E.photo_treat(pic, amount=0.34)
        card, pad = E.paper(w + 36, h + 36, self.res, self.seed + 11, tone=PAPER, edges='tblr', tape=tape)
        card.alpha_composite(pic.convert('RGBA'), (int(pad + 18 * self.res), int(pad + 18 * self.res)))
        from ..paper import piece_meta
        if piece_meta(key).get('illustrated'):
            tag = self.t('ILLUSTRATION', 'caps', 22, PAPER, track=2)
            pl = Image.new('RGBA', (tag.width + int(24 * self.res), tag.height + int(14 * self.res)), INK + (230,))
            pl.alpha_composite(tag, (int(12 * self.res), int(7 * self.res)))
            card.alpha_composite(pl, (int(pad + W_ + 18 * self.res - pl.width - 10 * self.res), int(pad + 28 * self.res)))
        rect = (cx - (w + 36) / 2, cy - (h + 36) / 2, w + 36, h + 36)
        sp = E.Sprite(card, E.arrive(cx, cy, t0, frm=frm, rot0=rot + 5, rot1=rot, style=style, s0=1.18 if style == 'drop' else 1.0, dur=0.7),
                      z=z, kind='photo', rect=rect, settle=t0 + 0.75)
        self.P.add(sp)
        self.P.cues.append((t0, 'paper'))
        if clip is not None:
            self.P.add(ClipPrint(clip, cx, cy, W_, H_, rot, t0 + 0.7, self.res, self.dur))
        return sp

    def slip(self, f: dict, x: float, y: float, t0: float, rot: float = -2.5):
        """Contract rule 1 on the board: the scoreline of the match the narrator names, on a torn slip, underlined."""
        club = self.ed.ledger.get('club_name') or ''
        line = f"{f['home']} {f['score_home']}–{f['score_away']} {f['away']}"
        top = ' · '.join(x_ for x_ in [gfx.short_date(f.get('date')), f.get('competition')] if x_)
        a = self.t(top.upper(), 'caps', 24, (90, 82, 70), max_w=760, track=1)
        b = self.t(line.upper(), 'cond', 46, INK, max_w=760)
        w = max(a.width, b.width) / self.res + 60
        h = (a.height + b.height) / self.res + 44

        def bake(im, pad, r):
            self.put(a, im, 0, pad, 30, 14)
            self.put(b, im, 0, pad, 30, 22 + a.height / r)
        sp = self.card(w, h, x + w / 2, y + h / 2, rot, t0, tone=PAPER, style='slide', frm=(-900, 0), edges='lr', z=55, bake=bake)
        # the scoreline itself, underlined by the pen
        sc = (x + 30, y + 22 + a.height / self.res, b.width / self.res, b.height / self.res)
        self.underline(sc, t0 + 0.75, 'slip')
        self.P.targets['slip_match'] = f.get('date')
        return sp


def _ov(a, b) -> float:
    w = min(a[0] + a[2], b[0] + b[2]) - max(a[0], b[0])
    h = min(a[1] + a[3], b[1] + b[3]) - max(a[1], b[1])
    return max(0.0, w) * max(0.0, h)


def _cover(im: Image.Image, size) -> Image.Image:
    w, h = size
    s = max(w / im.width, h / im.height)
    r = im.resize((max(w, round(im.width * s)), max(h, round(im.height * s))), Image.LANCZOS)
    x, y = (r.width - w) // 2, (r.height - h) // 2
    return r.crop((x, y, x + w, y + h))


class ClipPrint(E.El):
    """The owner's moving picture playing inside its print: frames read in order (ClipWorld never seeks)."""
    z = 31
    kind = 'photo'

    def __init__(self, clip, cx, cy, w, h, rot, t0, res, dur):
        self.clip, self.cx, self.cy, self.w, self.h, self.rot, self.t0, self.res = clip, cx, cy, w, h, rot, t0, res
        self.rect = None
        self.settle = 1e9
        self._last = None
        self.bans = list(getattr(clip, 'bans', None) or [])

    def pieces(self, t, cv):
        if t < self.t0:
            return []
        i = int((t - self.t0) * FPS)
        if self._last is None or self._last[0] != i:
            from ..paper import scrub
            fr = self.clip(i)
            im = E.photo_treat(scrub(_cover(fr, (self.w, self.h)), self.bans), amount=0.34).convert('RGBA')
            if abs(self.rot) > 0.05:
                im = im.rotate(self.rot, expand=True, resample=Image.BILINEAR)
            self._last = (i, im)
        im = self._last[1]
        a = clamp((t - self.t0) / 0.4)
        if a < 1:
            im = im.copy()
            im.putalpha(im.getchannel('A').point(lambda v: int(v * a)))
        return [(im, int(cv.px(self.cx) - im.width / 2), int(cv.px(self.cy) - im.height / 2))]


# ------------------------------------------------------------------ result family
def shout_word(ed, f: dict, n: int) -> tuple[str, str] | None:
    if not f or f.get('kind') != 'match':
        return None
    if ed.ledger.get('neutral'):
        return ('SHOCK!', 'accent') if f.get('outcome') == 'loss' else None
    if f.get('title_decided'):
        return 'CHAMPIONS!', 'accent'
    if ed.won_shootout(f):
        return ('CUP!' if f.get('stage') == 'Final' else 'YES!'), 'accent'
    tie = ed.tie_through(f)
    if tie is not None:
        return ('THROUGH!', 'accent') if tie else ('OUT', 'paper')
    if f.get('outcome') == 'win' and f.get('stage') == 'Final':
        return 'CUP!', 'accent'
    if f.get('outcome') == 'win':
        return ('GOAL!', 'YES!', 'WIN!')[n % 3], 'accent'
    if f.get('outcome') == 'loss':
        return 'LOST', 'paper'
    return None


def _score_steps(f: dict, t0: float, t1: float) -> tuple[list, list]:
    """The figures counting up to the final score, goal by goal: the home side's and the away side's flips."""
    hs, as_ = int(f['score_home']), int(f['score_away'])
    n = hs + as_
    hsteps, asteps = [(t0, '0')], [(t0, '0')]
    if n:
        step = (t1 - t0) / n
        # interleaved, so the score climbs the way a night does, not one side and then the other
        hi, ai = 0, 0
        seq = []
        while hi < hs or ai < as_:
            if hi < hs and (hi * (as_ + 1) <= ai * (hs + 1) or ai >= as_):
                hi += 1
                seq.append(('h', hi))
            else:
                ai += 1
                seq.append(('a', ai))
        for j, (side, v) in enumerate(seq):
            tt = t0 + step * (j + 1)
            (hsteps if side == 'h' else asteps).append((tt, str(v)))
    return hsteps, asteps


def result(ed, s, B: Builder) -> Panel:
    v = s['visual']
    kind = v['type']
    f = _f(ed, v.get('claim'))
    if not f:
        raise StageError('VOX_NO_MATCH', f'a {kind} panel needs a match claim')
    P, ink, r = B.P, B.ink, B.res
    rot = (-1.4, 1.1, -0.8)[s['n'] % 3]
    cx, cy = 960 + B.side * 40, 470
    # two layouts, so a season of results does not look like one card: side by side, or stacked like a results column
    stack = kind == 'score' and s['n'] % 2 == 1
    W_, H_ = (1180, 640) if stack else (1300, 600)
    head = 'MATCHDAY' if kind == 'matchday' else 'RESULT' if stack else 'FULL TIME'
    stage = ' · '.join(x for x in [f.get('competition'), f.get('stage')] if x)
    bar = B.t(f'{head} · {stage}'.upper(), 'caps', 30, PAPER, max_w=W_ - 80, track=2)

    def bake(im, pad, res):
        d = ImageDraw.Draw(im)
        d.rectangle([pad, pad, pad + W_ * res, pad + 74 * res], fill=INK + (255,))
        B.put(bar, im, 0, pad, 40, 37 - bar.height / res / 2)
        d.rectangle([pad + 50 * res, pad + 470 * res, pad + (W_ - 50) * res, pad + 476 * res], fill=INK + (255,))
        if stack:
            for yy in (258, 262):
                d.rectangle([pad + 50 * res, pad + yy * res, pad + (W_ - 50) * res, pad + (yy + 2) * res], fill=(120, 110, 96, 255))
        else:
            dash = B.t('–', 'ultra', 120, INK)
            B.put(dash, im, 0, pad, W_ / 2, 280, center=True)
    t_land = 0.15
    B.card(W_, H_, cx, cy, rot, t_land, bake=bake, tape=2, frm=(0, 820) if s['n'] % 2 else (-1300, 40), tone=NEWS if stack else PAPER)
    # the names rise onto the card, home then away
    t_n = t_land + 0.55
    if stack:
        sz = min(B.one_line(f['home'], 'head', 78, 760), B.one_line(f['away'], 'head', 78, 760))
        left = B.words(f['home'], *rot_pt(cx, cy, -W_ / 2 + 60, -H_ / 2 + 125, rot), sz, t_n, max_w=800, rot=rot, style='rise')
        right = B.words(f['away'], *rot_pt(cx, cy, -W_ / 2 + 60, -H_ / 2 + 305, rot), sz, t_n + 0.18, max_w=800, rot=rot, style='rise')
    else:
        left = B.words(f['home'], *rot_pt(cx, cy, -W_ / 2 + 60, -H_ / 2 + 110, rot), 74, t_n, max_w=520, rot=rot, style='rise')
        right = B.words(f['away'], *rot_pt(cx, cy, W_ / 2 - 60, -H_ / 2 + 110, rot), 74, t_n + 0.18, max_w=520, rot=rot, style='rise', align='right')
    # the score flips up goal by goal, timed to the narrator
    t_sc0 = max(t_n + 0.6, B.at_voice(0.18, lo=1.0))
    pace = 0.24 * B.st['count']
    n_goals = int(f['score_home']) + int(f['score_away'])
    t_sc1 = t_sc0 + max(0.25, pace * n_goals)
    if kind == 'matchday':  # the pre-match card: the score waits, then the result is stamped in at the end of the line
        t_sc0 = max(t_n + 1.2, B.at_voice(0.55, lo=1.6))
    # whatever the narration, the score lands, is circled and read before the camera moves on
    t_sc0 = max(t_n + 0.3, min(t_sc0, B.dur - 1.6 - pace * n_goals))
    t_sc1 = t_sc0 + max(0.25, pace * n_goals)
    hs, as_ = _score_steps(f, t_sc0, t_sc1)
    if stack:
        fx, fy = rot_pt(cx, cy, W_ / 2 - 150, 165 - H_ / 2, rot)
        gx, gy = rot_pt(cx, cy, W_ / 2 - 150, 350 - H_ / 2, rot)
    else:
        fx, fy = rot_pt(cx, cy, -130, 280 - H_ / 2, rot)
        gx, gy = rot_pt(cx, cy, 130, 280 - H_ / 2, rot)
    tone_h = ink.accent if f['home'] == ed.ledger.get('club_name') else PAPER
    tone_a = ink.accent if f['away'] == ed.ledger.get('club_name') else PAPER
    fs = 130 if stack else 150
    fh = P.add(E.Flip(hs, fx, fy, size=fs, res=r, w=fs * 1.27, tile=tone_h, fill=ink.on_accent if tone_h == ink.accent else INK, name='home'))
    fa = P.add(E.Flip(as_, gx, gy, size=fs, res=r, w=fs * 1.27, tile=tone_a, fill=ink.on_accent if tone_a == ink.accent else INK, name='away'))
    for (tt, _) in hs[1:] + as_[1:]:
        P.cues.append((tt, 'tick'))
    x0_ = min(fh.rect[0], fa.rect[0])
    y0_ = min(fh.rect[1], fa.rect[1])
    score_rect = (x0_, y0_, max(fh.rect[0] + fh.rect[2], fa.rect[0] + fa.rect[2]) - x0_, max(fh.rect[1] + fh.rect[3], fa.rect[1] + fa.rect[3]) - y0_)
    P.targets['score'] = score_rect
    P.targets['score_value'] = f"{f['score_home']}–{f['score_away']}"
    # the line under it, typed: the date and the ground
    venue = (f.get('venue') or {}).get('name')
    line = ' · '.join(x for x in [_date(f.get('date')), venue.upper() if venue else None] if x)
    tx, ty = rot_pt(cx, cy, -W_ / 2 + 56, 500 - H_ / 2, rot)
    dline = B.type(line, tx, ty, 30, t_n + 0.4, rot=rot, max_w=W_ - 120)
    P.targets['date'] = dline.rect
    # extra time, penalties, a title decided — in the accent, under the date
    pens = f.get('penalties') or next((c['fact'] for c in ed.ledger['claims'] if c['fact'].get('kind') == 'penalties' and c['fact'].get('date') == f.get('date')), None)
    extra = f"{pens['winner']} won {pens.get('shootout') or pens.get('score')} on penalties" if pens else ('After extra time' if f.get('after_extra_time') else None)
    if f.get('title_decided'):
        extra = (extra + ' · ' if extra else '') + 'The title is decided'
    # the pen circles the score as it lands; the winner's name is highlighted
    t_mark = min(t_sc1 + 0.3, B.dur - 0.65)
    B.circle(score_rect, t_mark, 'score', dur=0.55)
    if f['outcome'] != 'draw' and kind != 'matchday':
        winner = left if (f['score_home'] > f['score_away']) else right
        B.highlight(winner.rect, min(t_mark + 0.5, B.dur - 0.5), 'winner', rot=rot)
    elif kind == 'matchday':
        B.underline(left.rect, t_n + 1.0, 'home')
    if extra:
        ex, ey = rot_pt(cx, cy, -W_ / 2 + 56, H_ / 2 + 30, rot)
        B.type(extra.upper(), ex, ey, 28, t_mark + 0.5, rot=rot, fill=ink.pen if ink.pen != INK else INK, max_w=W_ - 120)
    # GOAL! / CHAMPIONS! / LOST stamped on the card's corner
    sw = shout_word(ed, f, s['n'])
    if sw and kind in ('score', 'versus', 'matchday'):
        sx, sy = rot_pt(cx, cy, W_ / 2 - 190, H_ / 2 - 70, rot)
        B.stamp(sw[0], sx, sy, t_sc1 + 0.15, size=96 if len(sw[0]) < 7 else 80, tone=sw[1])
        if sw[1] == 'accent':
            P.flash.append(t_sc1 + 0.15)
            P.cues.append((t_sc1 + 0.2, 'crowd-goal' if f['outcome'] == 'win' else 'crowd-after'))
        else:
            P.cues.append((t_sc1 + 0.2, 'crowd-miss'))
    # the scorers, typed onto the card under the score, the pen's arrow pointing at them — only when the archive
    # names every goal (as the classic edit)
    sc = f.get('scorers') or []
    if sc and f.get('club_goals') == len(sc):
        by: dict[str, list[str]] = {}
        for g in sc:
            mark = '’' + (' PEN' if g.get('penalty') else '') + (' OG' if g.get('own_goal') else '')
            by.setdefault(g['name'], []).append(f"{g['minute']}{mark}" if g.get('minute') is not None else '')
        line = '   '.join(f"{n.upper()} {' '.join(m for m in ms if m)}".strip() for n, ms in list(by.items())[:4])
        sx, sy = rot_pt(cx, cy, -W_ / 2 + 60, 405 - H_ / 2, rot)
        strip = B.type(line, sx, sy + (25 if stack else 0), 30, t_mark + 0.9, font='cond', max_w=W_ - (420 if stack else 140), rot=rot, fill=INK)
        B.arrow((score_rect[0] - 30, score_rect[1] + score_rect[3] * 0.6), (sx + 40, sy + 4), t_mark + 0.6, 'scorers', target=strip.rect, dur=0.35)
        P.targets['scorers'] = strip.rect
    # people at the edge: the club's own, celebrating or not
    if B.st['people']:
        base = ('fig-celebrate-arms-kr' if f['outcome'] == 'win' else 'fig-kneel-despair-kr' if f['outcome'] == 'loss' else 'fig-supporter-scarf-up-kr')
        B.cut(base, 560, 960 - B.side * 830, 1130, t_sc1 + 0.1, side=-B.side)
    # the push onto the score keeps the names in the frame (a stacked card has its score at the side)
    zp = min(B.st['push'], 1.22 if stack else 1.32)
    sx_ = (score_rect[0] + score_rect[2] / 2)
    if stack:
        sx_ = cx + 170
    P.look(0.0, cx, cy + 60, 0.92)
    P.look(t_n + 0.2, cx, cy + 20, 0.98)
    P.look(t_sc0 - 0.05, sx_, score_rect[1] + score_rect[3] / 2, zp)
    P.look(t_mark + 0.9, sx_, score_rect[1] + score_rect[3] / 2 + 40, zp * 0.96)
    P.look(B.dur, cx, cy + 90, 1.0)
    if kind == 'versus':
        pass
    return P


def versus(ed, s, B: Builder) -> Panel:
    """The face-off: two torn fields of colour meet on the board, the names rise, VS is stamped, then the score."""
    v = s['visual']
    f = _f(ed, v.get('claim'))
    if not f:
        raise StageError('VOX_NO_MATCH', 'a versus panel needs a match claim')
    P, ink, r = B.P, B.ink, B.res
    club = ed.ledger.get('club_name')
    neutral = bool(ed.ledger.get('neutral'))
    lt = ink.accent if (neutral or f['home'] == club) else INK
    rt = ink.accent if (not neutral and f['away'] == club) else INK
    if lt == rt:
        rt = INK if lt != INK else ink.accent
    fl = B.card(900, 760, 520, 500, -2.2, 0.1, tone=lt, frm=(-1400, 0), edges='tblr', z=20, tape=1)
    fr = B.card(900, 760, 1400, 520, 1.8, 0.25, tone=rt, frm=(1400, 0), edges='tblr', z=21, tape=1)
    on_l = ink.on_accent if lt == ink.accent else PAPER
    on_r = ink.on_accent if rt == ink.accent else PAPER
    nl = B.words(f['home'], 520, 300, 104, 0.7, max_w=760, align='center', rot=-2.2, fill=on_l, hot_fill=on_l)
    nr = B.words(f['away'], 1400, 320, 104, 0.85, max_w=760, align='center', rot=1.8, fill=on_r, hot_fill=on_r)
    stage = ' · '.join(x for x in [f.get('competition'), f.get('stage')] if x).upper()
    tw = B.type(stage, 960 - min(800, len(stage) * 11), 96, 34, 0.6, font='caps', plate=NEWS, pad=12, max_w=1500)
    t_vs = 1.15
    B.stamp('VS', 960, 560, t_vs, rot=-6, size=150, tone='paper')
    venue = (f.get('venue') or {}).get('name')
    line = ' · '.join(x for x in [_date(f.get('date')), venue.upper() if venue else None] if x)
    B.type(line, 960 - min(700, len(line) * 9.5), 920, 30, 1.0, plate=PAPER, pad=10, max_w=1500)
    t_sc = clamp(B.lead + 0.55 * max(B.vdur, 2.0), t_vs + 1.4, max(t_vs + 1.4, B.dur - 1.6))
    hs, as_ = _score_steps(f, t_sc, t_sc + 0.24 * B.st['count'] * (int(f['score_home']) + int(f['score_away'])) + 0.05)
    fh = P.add(E.Flip(hs, 810, 760, size=130, res=r, w=170, tile=PAPER, name='home'))
    fa = P.add(E.Flip(as_, 1110, 760, size=130, res=r, w=170, tile=PAPER, name='away'))
    end = max(hs[-1][0], as_[-1][0])
    for (tt, _) in hs[1:] + as_[1:]:
        P.cues.append((tt, 'tick'))
    score_rect = (fh.rect[0], fh.rect[1], fa.rect[0] + fa.rect[2] - fh.rect[0], fh.rect[3])
    P.targets['score'] = score_rect
    P.targets['score_value'] = f"{f['score_home']}–{f['score_away']}"
    B.circle(score_rect, end + 0.3, 'score')
    if B.cin.get('derby'):
        B.stamp('DERBY', 520 if lt == ink.accent else 1400, 200, 1.5, rot=8, size=80)
    sw = shout_word(ed, f, s['n'])
    if sw:
        B.stamp(sw[0], 1460, 790, end + 0.2, size=84, tone=sw[1])
        P.flash.append(end + 0.2)
    P.cues += [(0.1, 'whoosh'), (t_vs, 'drum')]
    P.look(0.0, 960, 540, 0.82)
    P.look(0.9, 960, 520, 0.9)
    P.look(t_vs + 0.1, 960, 540, 1.0)
    P.look(t_sc - 0.1, 960, 700, B.st['push'] * 0.96)
    P.look(end + 1.0, 960, 720, B.st['push'])
    P.look(B.dur, 960, 600, 1.02)
    return P


def goal(ed, s, B: Builder) -> Panel:
    """A goal on paper: the minute rolls up on the clock, GOAL! is stamped, the scorer's name rises, the score flips."""
    v = s['visual']
    f = _f(ed, v.get('claim'))
    if not f or not f.get('scorers'):
        raise StageError('GOAL_NO_SCORER', 'a goal panel needs a match claim that names its scorers')
    sc = f['scorers']
    i = int(v.get('scorer') or 0)
    if not 0 <= i < len(sc):
        raise StageError('GOAL_SCORER_INDEX', f'scorer {i} is not in the claim')
    g = sc[i]
    P, ink, r = B.P, B.ink, B.res
    club = ed.ledger.get('club_name')
    m = g.get('minute')
    t_clock = 0.55
    t_hit = clamp(B.lead + 0.3 * max(B.vdur, 2.0), 1.9, max(1.9, B.dur - 2.4))
    # the clock slip
    B.card(430, 230, 470, 330, -3, 0.15, tone=INK, frm=(-700, -200), edges='tb', z=40, tape=1)
    lab = B.type('MINUTE', 300, 248, 26, 0.5, font='caps', fill=PAPER)
    if m is not None:
        od = P.add(E.Odometer(E.roll(0, m, t_clock, t_hit - t_clock), 470, 360, size=118, res=r, digits=len(str(m)), fill=PAPER,
                              final=m, t0=t_clock, settle=t_hit, rot=-3, name='minute'))
        P.targets['minute'] = od.rect
        P.targets['minute_value'] = m
        P.cues.append((t_clock, 'tick'))
    # the stamp and the name
    B.stamp('GOAL!', 1180, 300, t_hit, rot=-6, size=170)
    P.flash.append(t_hit)
    P.cues += [(t_hit, 'sting'), (t_hit + 0.05, 'crowd-goal')]
    mark = (' (pen.)' if g.get('penalty') else '') + (' (o.g.)' if g.get('own_goal') else '')
    nm = B.words(g['name'] + mark, 230, 560, 128, t_hit + 0.35, max_w=1300, style='rise', hot={w.lower() for w in g['name'].split()[-1:]})
    P.targets['scorer'] = nm.rect
    B.underline(nm.rect, t_hit + 0.35 + 0.09 * len(nm.boxes) + 0.4, 'scorer')
    # the score on a card: the goal ticking in when the record says the order (every goal of the night has a minute)
    order = sorted(range(len(sc)), key=lambda j: (sc[j].get('minute') if sc[j].get('minute') is not None else 999, j))
    nth = order.index(i) + 1
    exact = f['opponent_goals'] == 0 and all(x.get('minute') is not None for x in sc)
    us_home = f['home'] == club
    if exact:
        a_, b_ = (str(nth - 1), '0') if us_home else ('0', str(nth - 1))
        a2, b2 = (str(nth), '0') if us_home else ('0', str(nth))
        hs, as_ = [(t_hit - 0.6, a_), (t_hit + 0.9, a2)], [(t_hit - 0.6, b_), (t_hit + 0.9, b2)]
    else:
        hs, as_ = _score_steps(f, t_hit + 0.7, t_hit + 0.7 + 0.2 * (f['score_home'] + f['score_away']))
    B.card(560, 250, 1340, 860, 2, t_hit - 0.75, tone=NEWS, frm=(900, 0), edges='lr', z=40)
    fh = P.add(E.Flip(hs, 1230, 880, size=110, res=r, w=150, tile=ink.accent if us_home else PAPER, fill=ink.on_accent if us_home else INK, name='home'))
    fa = P.add(E.Flip(as_, 1450, 880, size=110, res=r, w=150, tile=ink.accent if not us_home else PAPER, fill=ink.on_accent if not us_home else INK, name='away'))
    B.type(f"{gfx.abbr(f['home'])}   {gfx.abbr(f['away'])}", 1150, 760, 28, t_hit - 0.4, font='caps')
    if not exact:
        B.type(f"GOAL {nth} OF {f['club_goals']} · FINAL SCORE", 1100, 960, 24, t_hit + 1.0, font='caps')
    P.targets['score'] = (fh.rect[0], fh.rect[1], fa.rect[0] + fa.rect[2] - fh.rect[0], fh.rect[3])
    P.targets['score_value'] = f"{hs[-1][1]}–{as_[-1][1]}"
    if m is not None:
        B.arrow((610, 400), (300, 540), t_hit + 0.2, 'minute_to_name', target=nm.rect)
    if B.st['people']:
        B.cut('fig-celebrate-knee-slide-kr', 520, 1700, 1140, t_hit + 0.2, side=1, motion='slide')
    P.look(0.0, 600, 420, 1.1)
    P.look(t_clock + 0.2, 480, 360, B.st['push'] * 1.05)
    P.look(t_hit - 0.15, 900, 420, 1.0)
    P.look(t_hit + 0.8, 800, 600, 1.05)
    P.look(B.dur, 960, 600, 1.0)
    return P


def ticket(ed, s, B: Builder) -> Panel:
    v = s['visual']
    f = _f(ed, v.get('claim'))
    if not f:
        raise StageError('VOX_NO_MATCH', 'a ticket needs a match claim')
    P, ink = B.P, B.ink
    rot = -4.0 * B.side
    cx, cy, W_, H_ = 900, 480, 1000, 470
    bar = B.t(f"ADMIT ONE · {f.get('competition') or ''}".upper(), 'caps', 28, PAPER, max_w=800, track=2)

    def bake(im, pad, res):
        d = ImageDraw.Draw(im)
        d.rectangle([pad, pad, pad + (W_ - 170) * res, pad + 64 * res], fill=INK + (255,))
        B.put(bar, im, 0, pad, 30, 32 - bar.height / res / 2)
        for yy in range(0, int(H_ * res), int(26 * res)):
            d.rectangle([pad + (W_ - 160) * res, pad + yy, pad + (W_ - 152) * res, pad + yy + 13 * res], fill=INK + (255,))
        B.put(B.t(f['home'].upper(), 'head', 70, INK, max_w=740), im, 0, pad, 34, 90)
        B.put(B.t('v', 'caps', 30, INK), im, 0, pad, 38, 190)
        B.put(B.t(f['away'].upper(), 'head', 70, INK, max_w=740), im, 0, pad, 34, 230)
    B.card(W_, H_, cx, cy, rot, 0.15, tone=PAPER, bake=bake, tape=1, border=INK + (255,), frm=(0, 800))
    tx, ty = rot_pt(cx, cy, -W_ / 2 + 34, H_ / 2 - 90, rot)
    dl = B.type(_date(f.get('date')), tx, ty, 34, 0.9, rot=rot)
    B.circle(dl.rect, 0.9 + len(dl.s) / 30 + 0.2, 'date', dur=0.55)
    st = B.stamp(str(ed.ledger.get('season') or ''), cx + 380, cy + 160, 1.4, rot=12, size=72, tone='accent')
    P.targets['season'] = st.rect
    P.look(0.0, cx, cy + 40, 0.92)
    P.look(1.0, dl.rect[0] + dl.rect[2] / 2, dl.rect[1], B.st['push'])
    P.look(B.dur, cx + 60, cy + 40, 1.02)
    return P


# ------------------------------------------------------------------ the season in numbers
def form(ed, s, B: Builder) -> Panel:
    v = s['visual']
    rows = sorted(((cid, f) for cid in v.get('claims') or [] if (f := _f(ed, cid))), key=lambda x: x[1]['date'])
    if not rows:
        raise StageError('FORM_NO_MATCHES', 'a form graphic needs match claims')
    P, ink, r = B.P, B.ink, B.res
    n = len(rows)
    size = int(min(150, (PW - 260) / n - 22))
    head = B.words(v.get('label') or 'The run of results', 120, 90, 76, 0.2, max_w=1200)
    B.type(f"FORM GUIDE · {gfx.short_date(rows[0][1]['date'])} – {gfx.short_date(rows[-1][1]['date'])}", 124, 90 + head.rect[3] + 16, 28, 0.5, font='caps')
    gap = 22
    total = n * (size + 12) + (n - 1) * gap
    x0 = PW / 2 - total / 2
    ty = 520
    t0 = 0.9
    step = min(clamp((max(B.dur - B.lead, 2.0) * 0.55) / n, 0.18, 0.5) * B.st['count'], max(0.06, (B.dur - t0 - 1.3) / n))
    lands = [t0 + i * step for i in range(n)]
    tiles = []
    for i, (cid, f) in enumerate(rows):
        tl = gfx.tile(gfx.Inks(ed.pal), f['outcome'], f"{f['club_goals']}–{f['opponent_goals']}", gfx.abbr(f['opponent']), f['side'], int(size * r))
        cx = x0 + i * (size + 12 + gap) + (size + 12) / 2
        rot = ((hsh(cid) % 7) - 3) * 0.9
        w, h = tl.width / r, tl.height / r
        sp = E.Sprite(tl, _flip_in(cx, ty, lands[i], rot), z=50, kind='data', rect=(cx - w / 2, ty - h / 2, w, h), settle=lands[i] + 0.3)
        P.add(sp)
        tiles.append(sp)
        P.cues.append((lands[i], 'pop'))
    # a small form line above the tiles, its pen following the tiles as they land (wins minus defeats)
    vals, acc = [], 0
    for _, f in rows:
        acc += {'win': 1, 'draw': 0, 'loss': -1}[f['outcome']]
        vals.append(acc)
    lo, hi = min(0, min(vals)), max(0, max(vals))
    span = max(1, hi - lo)
    pts = [(x0 + i * (size + 12 + gap) + (size + 12) / 2, 400 - (vals[i] - lo) / span * 110) for i in range(n)]
    ln = P.add(E.Line(pts, t0=lands[0], dur=max(0.4, lands[-1] - lands[0]) + 0.01, res=r, colour=ink.accent, width=8,
                      dots=[((ink.accent if f['outcome'] == 'win' else PAPER if f['outcome'] == 'draw' else INK), INK) for _, f in rows]))
    # the running tally rolls up as the tiles land
    tal = {'W': 0, 'D': 0, 'L': 0}
    for _, f in rows:
        tal[LETTER[f['outcome']]] += 1
    tally_y = ty + tiles[0].rect[3] / 2 + 150
    for j, (key, word) in enumerate((('W', 'WON'), ('D', 'DRAWN'), ('L', 'LOST'))):
        times = [lands[i] for i, (_, f) in enumerate(rows) if LETTER[f['outcome']] == key]

        def val(t, times=times):
            return sum(1 for x in times if t >= x) - (1 - clamp((t - max([x for x in times if t >= x], default=-9)) / 0.25)) * (1 if any(t >= x for x in times) else 0) * 0
        x = PW / 2 + (j - 1) * 330
        B.type(word, x - 140, tally_y - 22, 30, t0, font='caps')
        od = P.add(E.Odometer(_count_up(times), x + 60, tally_y, size=64, res=r, digits=2, final=tal[key], t0=t0, settle=lands[-1] + 0.3,
                              fill=ink.on_accent if key == 'W' else INK, plate=ink.accent if key == 'W' else NEWS, name=key))
        P.targets[f'tally_{key}'] = od.rect
        P.targets[f'tally_{key}_value'] = tal[key]
    # the longest run of wins inside the strip gets a bracket
    best, cur, start = (0, 0), 0, 0
    for i, (_, f) in enumerate(rows):
        if f['outcome'] == 'win':
            cur += 1
            if cur > best[0]:
                best = (cur, i - cur + 1)
        else:
            cur = 0
    if best[0] >= 2:
        a, b = tiles[best[1]].rect, tiles[best[1] + best[0] - 1].rect
        rr = (a[0], a[1], b[0] + b[2] - a[0], a[3])
        tb = lands[best[1] + best[0] - 1] + 0.35
        B.bracket(rr, tb, 'wins', side='bottom')
        B.type(f"{best[0]} WINS IN A ROW", rr[0] + rr[2] / 2 - 120, rr[1] + rr[3] + 38, 30, tb + 0.4, font='caps', fill=INK)
    P.look(0.0, PW / 2, PH / 2 - 20, 0.9)
    z = 1.08 + (0.12 if n <= 6 else 0)
    for i in range(0, n, max(1, n // 4)):
        P.look(lands[i] + 0.1, clamp(tiles[i].rect[0] + tiles[i].rect[2] / 2, 760, 1160), 560, z)
    P.look(lands[-1] + 0.3, clamp(tiles[-1].rect[0], 760, 1160), 560, z)
    P.look(min(B.dur, lands[-1] + 1.3), PW / 2, 520, 0.95)
    P.look(B.dur, PW / 2, 530, 0.98)
    return P


def _flip_in(x, y, t_land, rot):
    def pose(t):
        if t < t_land - 0.24:
            return None
        k = clamp((t - (t_land - 0.24)) / 0.24)
        sy = abs(math.cos(math.pi * (1 - k) / 2))
        b = -18 * math.sin(math.pi * clamp((t - t_land) / 0.25)) if t >= t_land else 0
        return Pose(x, y + b, max(0.05, 0.7 + 0.3 * sy), rot * k, clamp(k / 0.3))
    return pose


def _count_up(times):
    """A count that rolls to the next figure each time one of `times` passes."""
    ts = sorted(times)

    def v(t):
        done = sum(1 for x in ts if t >= x)
        if done < len(ts):
            k = clamp((t - (ts[done] - 0.25)) / 0.25)
            return done + ease_out_cubic(k) * (1 if k > 0 else 0) * 0.999
        return float(done)
    return v


def race(ed, s, B: Builder) -> Panel:
    """The season's form line, drawn on the board with the camera riding its tip; the number beside the pen rolls up and
    down with it; marked nights drop their scores; the turning point is circled."""
    v = s['visual']
    st = story_of(ed.ledger)
    rows = st.get('matches') or []
    if len(rows) < 2:
        raise StageError('RACE_TOO_SHORT', 'a form line needs at least two matches')
    P, ink, r = B.P, B.ink, B.res
    n = len(rows)
    marks = [m for m in (v.get('mark') or []) if any(x['id'] == m for x in rows)][:4]
    tp = st.get('turning_point')
    ys = [x['form'] for x in rows]
    lo, hi = min(0, min(ys)) - 1, max(0, max(ys)) + 1
    X0, X1, Y0, Y1 = 170, PW - 220, 300, 880

    def px(i):
        return X0 + (X1 - X0) * i / (n - 1)

    def py(y):
        return Y1 - (Y1 - Y0) * (y - lo) / (hi - lo)
    pts = [(px(i), py(y)) for i, y in enumerate(ys)]
    zero = py(0)
    # the chart's sheet: graph paper with the zero line and the months
    grid_w, grid_h = X1 - X0 + 160, Y1 - Y0 + 170

    def bake(im, pad, res):
        d = ImageDraw.Draw(im)
        ox, oy = 80, 70
        for gx in range(0, int(grid_w), 40):
            d.line([(pad + gx * res, pad), (pad + gx * res, pad + grid_h * res)], fill=(180, 196, 205, 110), width=1)
        for gy in range(0, int(grid_h), 40):
            d.line([(pad, pad + gy * res), (pad + grid_w * res, pad + gy * res)], fill=(180, 196, 205, 110), width=1)
        zy = (zero - Y0 + oy) * res
        for xx in range(0, int((X1 - X0) * res), int(26 * res)):
            d.line([(pad + ox * res + xx, pad + zy), (pad + ox * res + xx + 13 * res, pad + zy)], fill=INK + (220,), width=max(2, int(3 * res)))
        lab = B.t('WINS MINUS DEFEATS', 'caps', 22, (90, 82, 70), track=2)
        B.put(lab, im, 0, pad, ox - 20, 18)
        seen = set()
        for i, row in enumerate(rows):
            mo = row['date'][:7]
            if mo in seen:
                continue
            seen.add(mo)
            mlab = B.t(gfx.short_date(row['date']).split(' ', 1)[1][:3], 'caps', 22, (90, 82, 70))
            B.put(mlab, im, 0, pad, px(i) - X0 + ox, Y1 - Y0 + oy + 36, center=True)
    gcx, gcy = X0 - 80 + grid_w / 2, Y0 - 70 + grid_h / 2
    B.card(grid_w, grid_h, gcx, gcy, -0.6, 0.1, tone=PAPER, bake=bake, tape=2, frm=(0, 900), edges='tb', z=20)
    head = B.words(v.get('label') or 'The season', 140, 120, 70, 0.35, max_w=1100)
    B.type(f"{ed.ledger.get('season')} · EVERY MATCH, ALL COMPETITIONS", 144, 120 + head.rect[3] + 10, 26, 0.6, font='caps')
    t0 = 1.0
    draw = max(0.8, min(clamp(max(B.dur - B.lead, 3.0) * 0.62, 2.6, 8.5) * (B.st['count'] ** 0.5), B.dur - t0 - 1.0))
    col = lambda o: ink.accent if o == 'win' else PAPER if o == 'draw' else INK  # noqa: E731
    ln = P.add(E.Line(pts, t0=t0, dur=draw, res=r, colour=ink.accent, width=11, fill_to=zero,
                      fill_col=tuple(ink.accent) + (60,), dots=[(col(x['outcome']), INK) for x in rows]))
    P.cues.append((t0, 'pen'))
    # the number at the pen's tip: rises and falls with the line, lands on the season's final figure
    def form_at(t, ln=ln):
        u = ln.frac(t) * (n - 1)
        j = min(int(u), n - 2)
        return ys[j] + (ys[j + 1] - ys[j]) * (u - j)
    tag = P.add(Follower(E.Odometer(form_at, 0, 0, size=56, res=r, digits=2, sign=True, final=ys[-1], t0=t0, settle=t0 + draw,
                                    fill=ink.on_accent, plate=ink.accent, name='form'), ln, dx=70, dy=-70))
    P.targets['form_value'] = ys[-1]
    P.cues.append((t0, 'tick'))
    # marked nights drop their score chips; the turning point is circled and labelled
    ends = {m: ln.at(next(j for j, x in enumerate(rows) if x['id'] == m)) for m in marks + ([tp] if tp else [])}
    for k_, m in enumerate(marks):
        i = next(j for j, x in enumerate(rows) if x['id'] == m)
        row = rows[i]
        chip = _chip(B, row)
        up = pts[i][1] > (Y0 + Y1) / 2
        cy = pts[i][1] - 120 if up else pts[i][1] + 120
        cx = clamp(pts[i][0], X0 + chip.width / r / 2, X1 - chip.width / r / 2)
        w, h = chip.width / r, chip.height / r
        P.add(E.Sprite(chip, E.arrive(cx, cy, ends[m], frm=(0, -120), rot0=-8, rot1=(-3, 3)[k_ % 2], style='drop', s0=1.4, dur=0.4),
                       z=70, kind='data', rect=(cx - w / 2, cy - h / 2, w, h), settle=ends[m] + 0.45))
        P.cues.append((ends[m], 'pop'))
        P.targets[f'mark_{m}'] = (cx - w / 2, cy - h / 2, w, h)
    if tp:
        i = next(j for j, x in enumerate(rows) if x['id'] == tp)
        rr = (pts[i][0] - 30, pts[i][1] - 30, 60, 60)
        B.circle(rr, ends[tp] + 0.15, 'turning_point', dur=0.45)
        lx = clamp(pts[i][0] + 120, X0 + 40, X1 - 380)
        ly = clamp(pts[i][1] + (170 if pts[i][1] < (Y0 + Y1) / 2 else -200), Y0 + 20, Y1 - 60)
        B.arrow((lx + 10, ly + 10), (pts[i][0] + 26, pts[i][1] + (26 if ly > pts[i][1] else -26)), ends[tp] + 0.5, 'tp_arrow', target=rr)
        B.words('Turning point', lx, ly, 46, ends[tp] + 0.6, style='pop', fill=ink.pen if ink.pen != INK else INK)
    # the camera rides the pen, close, then pulls back to see the whole season
    z = B.st['push'] * 1.12
    P.look(0.0, PW / 2, PH / 2, 0.86)
    P.look(t0 - 0.1, pts[0][0] + 260, pts[0][1] - 20, z * 0.92)
    k = 10
    for j in range(1, k + 1):
        tt = t0 + draw * j / k
        x, y = ln.tip(tt)
        P.look(tt, clamp(x + 120, 700, PW - 700), clamp(y, 470, 700), z)
    P.look(min(B.dur, t0 + draw + 1.0), PW / 2, PH / 2 + 10, 0.9)
    P.look(B.dur, PW / 2, PH / 2, 0.93)
    return P


class Follower(E.El):
    """An element that rides another one's tip (the form number beside the pen)."""
    z = 85
    kind = 'data'

    def __init__(self, el, line, dx=0, dy=0):
        self.el, self.line, self.dx, self.dy = el, line, dx, dy
        self.t0, self.settle = el.t0, el.settle
        x, y = line.pts[-1]
        w, h = el.rect[2], el.rect[3]
        self.rect = (x + dx - w / 2, y + dy - h / 2, w, h)

    def pieces(self, t, cv):
        if t < self.el.t0:
            return []
        x, y = self.line.tip(t)
        im = self.el._img(self.el.shown(t))
        return [(im, int(cv.px(x + self.dx) - im.width / 2), int(cv.px(y + self.dy) - im.height / 2))]


def _chip(B, row):
    ink, r = B.ink, B.res
    tone = ink.accent if row['outcome'] == 'win' else PAPER if row['outcome'] == 'draw' else INK
    fg = ink.on_accent if row['outcome'] == 'win' else INK if row['outcome'] == 'draw' else PAPER
    t1 = B.t(f"{row['club_goals']}–{row['opponent_goals']}", 'ultra', 44, fg)
    t2 = B.t(f"{'v' if row['side'] == 'home' else 'at'} {row['opponent']}".upper(), 'cond', 26, fg, max_w=320)
    w = max(t1.width, t2.width) + int(34 * r)
    im = Image.new('RGBA', (w + int(9 * r), t1.height + t2.height + int(34 * r)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    o = int(8 * r)
    d.rectangle([o, o, w + o, im.height - 1], fill=INK + (255,) if tone != INK else ink.accent + (255,))
    d.rectangle([0, 0, w, im.height - 1 - o], fill=tone + (255,), outline=INK + (255,), width=max(2, int(3 * r)))
    im.alpha_composite(t1, (int(w / 2 - t1.width / 2), int(8 * r)))
    im.alpha_composite(t2, (int(w / 2 - t2.width / 2), t1.height + int(14 * r)))
    return im


def run(ed, s, B: Builder) -> Panel:
    v = s['visual']
    rows = sorted(((cid, f) for cid in v.get('claims') or [] if (f := _f(ed, cid))), key=lambda x: x[1]['date'])
    if not rows:
        raise StageError('RUN_NO_MATCHES', 'a streak needs match claims')
    from ..cinema.shots import run_kind
    P, ink, r = B.P, B.ink, B.res
    n = len(rows)
    kind = run_kind([f['outcome'] for _, f in rows])
    per_row = n if n <= 6 else math.ceil(n / 2)
    size = 112 if n > 6 else 128
    t0 = 0.8
    step = min(clamp((max(B.dur - B.lead, 2.0) * 0.55) / n, 0.2, 0.55) * B.st['count'], max(0.06, (B.dur - t0 - 1.4) / n))
    lands = [t0 + i * step for i in range(n)]
    gx0 = 820
    tiles = []
    for i, (cid, f) in enumerate(rows):
        tl = gfx.tile(gfx.Inks(ed.pal), f['outcome'], f"{f['club_goals']}–{f['opponent_goals']}", gfx.abbr(f['opponent']), f['side'], int(size * r))
        rr, cc = divmod(i, per_row)
        w, h = tl.width / r, tl.height / r
        cx, cy = gx0 + cc * (w + 16) + w / 2, 420 + rr * (h + 26)
        sp = E.Sprite(tl, _flip_in(cx, cy, lands[i], ((hsh(cid) % 5) - 2) * 1.2), z=50, kind='data', rect=(cx - w / 2, cy - h / 2, w, h), settle=lands[i] + 0.3)
        P.add(sp)
        tiles.append(sp)
        P.cues.append((lands[i], 'pop'))
    head = B.words(v.get('label') or kind, 120, 110, 72, 0.25, max_w=1300)
    B.type(f"{gfx.short_date(rows[0][1]['date'])} – {gfx.short_date(rows[-1][1]['date'])}", 124, 110 + head.rect[3] + 12, 28, 0.5, font='caps')
    B.card(560, 520, 420, 610, -2.5, 0.3, tone=ink.accent, frm=(-800, 0), z=30, tape=1)
    od = P.add(E.Odometer(_count_up(lands), 420, 560, size=260, res=r, digits=len(str(n)), final=n, t0=t0, settle=lands[-1] + 0.3,
                          fill=ink.on_accent, rot=-2.5, name='streak'))
    P.targets['streak'] = od.rect
    P.targets['streak_value'] = n
    P.cues.append((t0, 'tick'))
    B.words(kind, 420, 780, 46, lands[-1] + 0.1, align='center', style='pop', fill=ink.on_accent, hot_fill=ink.on_accent, rot=-2.5)
    a, b = tiles[0].rect, tiles[-1].rect
    grid = (a[0], a[1], (max(t.rect[0] + t.rect[2] for t in tiles)) - a[0], (max(t.rect[1] + t.rect[3] for t in tiles)) - a[1])
    B.circle(grid, lands[-1] + 0.35, 'run', dur=0.7, pad=30)
    P.look(0.0, PW / 2, PH / 2, 0.88)
    P.look(t0, 700, 540, B.st['push'] * 0.9)
    P.look(lands[-1], 1000, 520, 1.04)
    P.look(B.dur, PW / 2, 520, 0.96)
    return P


def record(ed, s, B: Builder) -> Panel:
    from ..cinema.shots import summary_for
    v = s['visual']
    cid = str(v.get('claim') or '')
    if not cid.startswith('summary:'):
        raise StageError('RECORD_NEEDS_SUMMARY', 'a record graphic reads a summary:<competition> claim')
    comp = cid[8:]
    data = summary_for(ed.ledger, comp)
    if not data:
        raise StageError('RECORD_UNKNOWN', f'no summary for {comp}')
    P, ink, r = B.P, B.ink, B.res
    head = B.words(v.get('label') or 'The record', 120, 100, 76, 0.2, max_w=1300)
    B.type(f"{ed.ledger.get('season')} · {comp}".upper(), 124, 100 + head.rect[3] + 12, 28, 0.45, font='caps')
    vals = [('WON', data['won'], 'accent'), ('DRAWN', data['drawn'], 'paper'), ('LOST', data['lost'], 'ink'),
            ('FOR', data['for'], 'paper'), ('AGAINST', data['against'], 'paper')]
    bw, gap = 280, 46
    x0 = PW / 2 - (5 * bw + 4 * gap) / 2 + bw / 2
    cy = 560
    cnt = 1.1 * B.st['count']
    starts = [0.75 + 0.3 * i * B.st['count'] for i in range(5)]
    for i, (lab, val, tone) in enumerate(vals):
        bg = ink.accent if tone == 'accent' else INK if tone == 'ink' else NEWS
        fg = ink.on_accent if tone == 'accent' else PAPER if tone == 'ink' else INK
        cx = x0 + i * (bw + gap)
        rot = ((i * 37 + s['n']) % 5 - 2) * 0.9
        B.card(bw, bw * 1.05, cx, cy, rot, starts[i] - 0.3, tone=bg, frm=(0, 700), z=30 + i, edges='tb')
        B.type(lab, cx - bw / 2 + 22, cy - bw * 0.52 + 18, 26, starts[i], font='caps', fill=fg)
        od = P.add(E.Odometer(E.roll(0, val, starts[i], cnt), cx, cy + 22, size=128, res=r, digits=max(1, len(str(val))), final=val,
                              t0=starts[i], settle=starts[i] + cnt, fill=fg, rot=rot, name=lab))
        P.targets[f'count_{lab}'] = od.rect
        P.targets[f'count_{lab}_value'] = val
        P.cues.append((starts[i], 'tick'))
    played = data['won'] + data['drawn'] + data['lost']
    tb = starts[2] + cnt
    if played:
        bar = P.add(E.Bar(x0 - bw / 2, cy + bw * 0.62, 5 * bw + 4 * gap, 40, [(data['won'], ink.accent), (data['drawn'], PAPER), (data['lost'], INK)],
                          t0=tb, dur=1.0, res=r))
        B.stamp(f'PLAYED {played}', PW / 2 + 560, cy + bw * 0.62 + 120, tb + 1.0, rot=-4, size=58, tone='paper')
    B.circle(P.targets['count_WON'], starts[-1] + cnt + 0.2, 'won')
    P.look(0.0, PW / 2, PH / 2, 0.92)
    P.look(starts[0], x0 + 120, cy, B.st['push'] * 0.95)
    P.look(starts[4], x0 + 4 * (bw + gap) - 120, cy, B.st['push'] * 0.95)
    P.look(starts[-1] + cnt + 0.5, PW / 2, cy + 40, 0.98)
    P.look(B.dur, PW / 2, PH / 2, 1.0)
    return P


_NUM = re.compile(r'^\s*([+\-–]?)(\d{1,6})(?:[.,](\d))?\s*(%|st|nd|rd|th|’)?\s*$')


def stat(ed, s, B: Builder) -> Panel:
    v = s['visual']
    P, ink, r = B.P, B.ink, B.res
    value = str(v.get('value') or '')
    label = v.get('label') or ''
    rot = -2.0 * B.side
    B.card(1000, 640, 960, 470, rot, 0.15, tone=NEWS, frm=(0, 800), tape=2)
    m = _NUM.match(value)
    t_c = 0.7
    if m and not m.group(3):
        sign, num, _, suf = m.groups()
        val = int(num)
        od = P.add(E.Odometer(E.roll(0, val, t_c, 1.4 * B.st['count']), 960, 400, size=250, res=r, digits=len(num), final=val,
                              prefix=sign.replace('-', '–') if sign else '', suffix=suf or '', t0=t_c, settle=t_c + 1.4 * B.st['count'],
                              fill=ink.accent if ink.accent != INK else INK, stroke=4, name='value'))
        P.targets['value'] = od.rect
        P.targets['value_value'] = val
        P.cues.append((t_c, 'tick'))
        t_done = t_c + 1.4 * B.st['count']
    else:
        sp = B.stamp(value, 960, 400, t_c, rot=rot, size=200 if len(value) < 6 else 130)
        P.targets['value'] = sp.rect
        t_done = t_c + 0.4
    lw = B.words(label, 960, 600, 60, t_done + 0.1, max_w=880, align='center', rot=rot)
    B.highlight(lw.rect, lw.settle + 0.1, 'label', rot=rot)
    src = ed.source_of(v.get('claim')) or ('the archive' if str(v.get('claim', '')).startswith('summary:') else None)
    if src:
        B.type(f'SOURCE · {src}'.upper(), 520, 760, 22, t_done + 0.6, font='caps', fill=(90, 82, 70), rot=rot)
    B.circle(P.targets['value'], t_done + 0.25, 'value_circle')
    if B.st['people'] and any(w in (s.get('narration') or '').lower() for w in (' won', ' wins', 'goals', 'champion', 'unbeaten')):
        B.cut('fig-supporter-jump-kr', 560, 960 + B.side * 760, 1140, t_done)
    P.look(0.0, 960, 520, 0.92)
    P.look(t_c, 960, 420, B.st['push'])
    P.look(t_done + 0.6, 960, 520, 1.05)
    P.look(B.dur, 960, 540, 1.0)
    return P


# ------------------------------------------------------------------ documents
def _wrap(B, s, font, size, max_w):
    """Word boxes for a paragraph: [(word, x, y, w, h)] in card units, and the block height."""
    from ..cinema.type import face as F
    f = F(font, int(size * B.res))
    asc, desc = f.metrics()
    lh = (asc + desc) / B.res * 1.12
    sp = f.length(' ') / B.res
    x = y = 0.0
    out = []
    for w in s.split():
        ww = f.length(w) / B.res
        if x and x + ww > max_w:
            x, y = 0.0, y + lh
        out.append((w, x, y, ww, (asc + desc) / B.res))
        x += ww + sp
    return out, y + lh


def _keywords(words: list[tuple]) -> list[int]:
    """Which words the highlighter goes over: a number, or a run of proper names — else the last three words."""
    idx = [i for i, w in enumerate(words) if re.search(r'\d', w[0])]
    if not idx:
        idx = [i for i, w in enumerate(words) if i > 0 and w[0][:1].isupper() and not words[i - 1][0].endswith('.')]
    if not idx:
        idx = list(range(max(0, len(words) - 3), len(words)))
    # a contiguous span around the first hit, on one line
    i0 = idx[0]
    span = [i0]
    for j in range(i0 + 1, min(len(words), i0 + 4)):
        if words[j][2] == words[i0][2] and (j in idx or j == span[-1] + 1 and j - i0 < 3):
            span.append(j)
    return span


def document(ed, s, B: Builder) -> Panel:
    """fact · quote · press: a cutting or a card slides onto the board, the camera reads it, the highlighter finds the
    line that matters."""
    v = s['visual']
    kind = v['type']
    P, ink, r = B.P, B.ink, B.res
    claim = ed.by.get(v.get('claim') or '')
    src = ed.source_of(v.get('claim'))
    rot = (-2.4, 1.6, -1.2)[s['n'] % 3]
    if kind == 'press':
        outlet = str(v.get('outlet') or '')
        date = v.get('date') or (claim or {}).get('fact', {}).get('date')
        headline = str(v.get('headline') or '')
        stand = str(v.get('standfirst') or '')
        W_ = 1200
        hw, hh = _wrap(B, headline.upper(), 'head', 72, W_ - 120)
        sw, sh = _wrap(B, stand, 'body', 32, W_ - 120) if stand else ([], 0)
        H_ = 150 + hh + 30 + sh + 170
        mast = B.t(outlet.upper(), 'head', 58, INK, max_w=W_ - 120)

        def bake(im, pad, res):
            d = ImageDraw.Draw(im)
            B.put(mast, im, 0, pad, W_ / 2, 62, center=True)
            d.rectangle([pad + 50 * res, pad + 104 * res, pad + (W_ - 50) * res, pad + 108 * res], fill=INK + (255,))
            d.rectangle([pad + 50 * res, pad + 114 * res, pad + (W_ - 50) * res, pad + 116 * res], fill=INK + (255,))
            for (w, x, y, ww, h) in hw:
                B.put(B.tl(w, 'head', 72, INK), im, 0, pad, 60 + x, 150 + y)
            for (w, x, y, ww, h) in sw:
                B.put(B.tl(w, 'body', 32, (60, 54, 46)), im, 0, pad, 60 + x, 150 + hh + 30 + y)
            # the columns below, set in grey bars (a cutting is cut out of a page; its body is not part of the record)
            y0 = 150 + hh + 30 + sh + 30
            for c in range(3):
                for k_ in range(4):
                    yy = y0 + k_ * 26
                    ww_ = (W_ - 160) / 3 - 20 - (40 if (k_ + c) % 3 == 0 else 0)
                    d.rectangle([pad + (60 + c * (W_ - 120) / 3) * res, pad + yy * res, pad + (60 + c * (W_ - 120) / 3 + ww_) * res, pad + (yy + 11) * res], fill=(150, 142, 128, 255))
        cx, cy = 960, 120 + H_ / 2 if H_ < 860 else 540
        B.card(W_, H_, cx, cy, rot, 0.15, tone=NEWS, bake=bake, tape=2, style='drop', s0=1.25, frm=(0, -200), dur=0.55)
        if date:
            dx_, dy_ = rot_pt(cx, cy, -W_ / 2 + 60, -H_ / 2 + 118, rot)
            B.type(_date(date), dx_, dy_, 22, 0.8, font='caps', rot=rot, fill=(90, 82, 70))
        # the highlighter goes over the headline, line by line
        lines: dict[float, list] = {}
        for w in hw:
            lines.setdefault(w[2], []).append(w)
        t_h = max(1.1, B.at_voice(0.25, lo=1.1))
        first = None
        for j, (y, ws) in enumerate(sorted(lines.items())):
            x0 = min(w[1] for w in ws)
            x1 = max(w[1] + w[3] for w in ws)
            lx, ly = rot_pt(cx, cy, -W_ / 2 + 60 + x0, -H_ / 2 + 150 + y, rot)
            rr = (lx, ly, x1 - x0, ws[0][4])
            B.highlight(rr, t_h + j * 0.5, f'headline_{j}', rot=rot, dur=0.5)
            first = first or rr
        P.targets['headline'] = first
        P.look(0.0, cx, cy, 0.86)
        P.look(0.75, cx, cy - 40, 0.96)
        if first:
            P.look(t_h - 0.1, first[0] + first[2] / 2, first[1] + 40, B.st['push'] * 1.05)
            P.look(t_h + 0.5 * len(lines) + 0.4, first[0] + first[2] / 2 + 60, first[1] + 80, B.st['push'] * 1.08)
        P.look(B.dur, cx, cy + 20, 0.98)
        return P
    if kind == 'quote':
        q = str(v.get('text') or '')
        who, role = str(v.get('who') or ''), v.get('role')
        outlet = (claim or {}).get('fact', {}).get('outlet') or src
        W_ = 1300
        cx, cy = 900, 470
        ws_, hh = _wrap(B, q, 'head', 62, W_ - 200)
        H_ = hh + 300
        B.card(W_, H_, cx, cy, rot, 0.15, tone=PAPER, tape=2, frm=(-1200, 60))
        B.stamp('“', cx - W_ / 2 + 70, cy - H_ / 2 + 50, 0.6, rot=-4, size=160, tone='accent')
        x0, y0 = cx - W_ / 2 + 120, cy - H_ / 2 + 110
        w = B.words(q, x0, y0, 62, 0.9, max_w=W_ - 200, rot=0, upper=False, stagger=0.06 if len(q) > 160 else 0.08, font='head')
        span = _keywords([(it['s'], b[0], b[1], b[2], b[3]) for it, b in zip(w.items, w.boxes)])
        bx = [w.boxes[i] for i in span]
        rr = (min(b[0] for b in bx), min(b[1] for b in bx), max(b[0] + b[2] for b in bx) - min(b[0] for b in bx), max(b[3] for b in bx))
        B.highlight(rr, w.settle + 0.15, 'quote_key')
        attr = '— ' + ', '.join(x for x in [who, role] if x) + (f' · {outlet}' if outlet else '')
        B.type(attr.upper(), x0, cy + H_ / 2 - 100, 28, w.settle + 0.4, font='caps', max_w=W_ - 200)
        P.look(0.0, cx, cy, 0.9)
        P.look(1.0, cx - 80, cy - 40, B.st['push'] * 0.92)
        P.look(w.settle + 0.2, rr[0] + rr[2] / 2, rr[1] + 30, B.st['push'])
        P.look(B.dur, cx, cy + 20, 1.0)
        return P
    # fact
    heading = str(v.get('heading') or 'The record')
    body = str(v.get('text') or '')
    W_ = 1150
    ws_, hh = _wrap(B, body, 'body', 40, W_ - 120)
    H_ = 170 + hh + 110
    cx, cy = 960 - B.side * 60, 120 + H_ / 2 if H_ < 840 else 520

    def bake(im, pad, res):
        for (w, x, y, ww, h) in ws_:
            B.put(B.tl(w, 'body', 40, INK), im, 0, pad, 60 + x, 170 + y)
        if src:
            B.put(B.t(f'SOURCE · {src}'.upper(), 'caps', 22, (90, 82, 70)), im, 0, pad, 60, 170 + hh + 40)
    B.card(W_, H_, cx, cy, rot, 0.15, tone=NEWS, bake=bake, tape=2, frm=(0, 820))
    hx, hy = rot_pt(cx, cy, -W_ / 2 + 60, -H_ / 2 + 50, rot)
    hw = B.words(heading, hx, hy, 70, 0.7, max_w=W_ - 120, rot=rot)
    B.underline(hw.rect, hw.settle + 0.1, 'heading')
    if ws_:
        span = _keywords(ws_)
        bx = [ws_[i] for i in span]
        x0 = min(b[1] for b in bx)
        lx, ly = rot_pt(cx, cy, -W_ / 2 + 60 + x0, -H_ / 2 + 170 + bx[0][2], rot)
        rr = (lx, ly, max(b[1] + b[3] for b in bx) - x0, bx[0][4])
        t_h = max(hw.settle + 0.4, B.at_voice(0.4, lo=1.2))
        B.highlight(rr, t_h, 'key', rot=rot)
        P.look(t_h - 0.1, rr[0] + rr[2] / 2, rr[1] + 20, B.st['push'] * 1.04)
    P.look(0.0, cx, cy, 0.9)
    P.look(0.8, hx + 400, hy + 60, B.st['push'] * 0.92)
    P.focus.sort()
    P.look(B.dur, cx, cy, 1.0)
    return P


def table(ed, s, B: Builder) -> Panel:
    v = s['visual']
    claim = ed.by.get(v.get('claim') or '')
    f = (claim or {}).get('fact') or {}
    P, ink, r = B.P, B.ink, B.res
    club = ed.ledger.get('club_name')
    rows = f.get('rows') or []
    if not rows:
        return document(ed, {**s, 'visual': {'type': 'fact', 'heading': 'The table', 'text': ''}}, B)
    rows = rows[:12]
    W_, rh = 1180, 68
    H_ = 110 + rh * len(rows) + 60
    cx, cy = 960, 70 + H_ / 2 if H_ < 940 else 540
    rot = -1.0
    bar = B.t(f"{f.get('competition') or ''} · {f.get('season') or ''}".upper(), 'caps', 30, PAPER, max_w=W_ - 260, track=2)
    gdp = B.t('GD · PTS', 'caps', 26, PAPER, track=2)

    def bake(im, pad, res):
        d = ImageDraw.Draw(im)
        d.rectangle([pad, pad, pad + W_ * res, pad + 74 * res], fill=INK + (255,))
        B.put(bar, im, 0, pad, 34, 37 - bar.height / res / 2)
        B.put(gdp, im, 0, pad, W_ - 34 - gdp.width / res, 37 - gdp.height / res / 2)
    B.card(W_, H_, cx, cy, rot, 0.15, tone=NEWS, bake=bake, tape=2, frm=(0, 900))
    t_r = 0.7
    ours = None
    for i, row in enumerate(rows):
        y = cy - H_ / 2 + 110 + i * rh
        line = B.t(f"{row['pos']}", 'ultra', 40, INK)
        nm = B.t(str(row['club']).upper(), 'head', 46, INK, max_w=640)
        gd = B.t(f"{'+' if row['goal_difference'] > 0 else ''}{row['goal_difference']}", 'caps', 30, INK)
        pts = B.t(str(row['points']), 'ultra', 44, INK)
        im = Image.new('RGBA', (int((W_ - 70) * r), int(rh * r)), (0, 0, 0, 0))
        im.alpha_composite(line, (int(10 * r), int(rh * r / 2 - line.height / 2)))
        im.alpha_composite(nm, (int(90 * r), int(rh * r / 2 - nm.height / 2)))
        im.alpha_composite(gd, (int((W_ - 300) * r), int(rh * r / 2 - gd.height / 2)))
        im.alpha_composite(pts, (int((W_ - 70) * r - pts.width - 20 * r), int(rh * r / 2 - pts.height / 2)))
        ImageDraw.Draw(im).line([(0, 0), (im.width, 0)], fill=INK + (255,), width=max(2, int(3 * r)))
        x = cx - W_ / 2 + 35
        rect = (x, y, W_ - 70, rh)
        P.add(E.Sprite(im, E.arrive(x + (W_ - 70) / 2, y + rh / 2, t_r + 0.07 * i, frm=(-200, 0), style='slide', dur=0.35),
                       z=60, kind='data', rect=rect, settle=t_r + 0.07 * i + 0.4))
        if row['club'] == club:
            ours = rect
    if ours:
        t_o = t_r + 0.07 * len(rows) + 0.4
        B.highlight(ours, t_o, 'club_row')
        B.circle((ours[0], ours[1], 80, ours[3]), t_o + 0.5, 'position')
        P.look(t_o, cx, ours[1] + rh / 2, B.st['push'])
    P.look(0.0, cx, cy, 0.86)
    P.focus.sort()
    P.look(B.dur, cx, cy, 0.95)
    return P


def timeline(ed, s, B: Builder) -> Panel:
    v = s['visual']
    P, ink, r = B.P, B.ink, B.res
    pts_ = []
    for cid in v.get('claims') or []:
        f = _f(ed, cid)
        if f:
            pts_.append(f)
    pts_.sort(key=lambda f: f['date'])
    if not pts_:
        raise StageError('VOX_TIMELINE_EMPTY', 'a timeline needs match claims')
    head = B.words(v.get('label') or 'The run', 120, 170, 76, 0.2, max_w=1300)
    B.card(PW - 200, 520, PW / 2, 560, -0.6, 0.0, tone=PAPER, frm=(0, 700), edges='lr', z=15, tape=2)
    n = len(pts_)
    X0, X1, Y = 200, PW - 200, 560
    xs = [X0 + (X1 - X0) * i / max(1, n - 1) for i in range(n)] if n > 1 else [PW / 2]
    t0 = 0.7
    dur = max(0.6, min(clamp(max(B.dur - B.lead, 2.0) * 0.6, 1.6, 6.0) * B.st['count'] ** 0.5, B.dur - t0 - 0.9))
    ln = P.add(E.Line([(x, Y) for x in xs] if n > 1 else [(X0, Y), (X1, Y)], t0=t0, dur=dur, res=r, colour=INK, width=9, shadow=None,
                      dots=[(ink.accent if f['outcome'] == 'win' else PAPER, INK) for f in pts_]))
    P.cues.append((t0, 'pen'))
    for i, f in enumerate(pts_):
        ti = ln.at(i) if n > 1 else t0
        chip = _chip(B, {'club_goals': f['club_goals'], 'opponent_goals': f['opponent_goals'], 'side': f['side'], 'opponent': f['opponent'], 'outcome': f['outcome']})
        up = i % 2 == 0
        cy = Y - 150 if up else Y + 150
        w, h = chip.width / r, chip.height / r
        P.add(E.Sprite(chip, E.arrive(xs[i], cy, ti, frm=(0, -80 if up else 80), style='drop', s0=1.3, rot0=-6, rot1=(-2, 2)[i % 2], dur=0.35),
                       z=70, kind='data', rect=(xs[i] - w / 2, cy - h / 2, w, h), settle=ti + 0.4))
        B.type(gfx.short_date(f['date']), xs[i] - 90, (Y + 34) if up else (Y - 76), 28, ti + 0.1, font='caps')
        P.cues.append((ti, 'pop'))
    P.look(0.0, PW / 2, 420, 0.9)
    for j in range(0, 7):
        tt = t0 + dur * j / 6
        x, _ = ln.tip(tt)
        P.look(tt, clamp(x + 100, 760, PW - 760), Y - 40, B.st['push'] * 1.02)
    P.look(min(B.dur, t0 + dur + 0.8), PW / 2, 470, 0.93)
    P.look(B.dur, PW / 2, 480, 0.96)
    return P


# ------------------------------------------------------------------ words and pictures
def turning(ed, s, B: Builder) -> Panel:
    v = s['visual']
    P, ink = B.P, B.ink
    B.art(v.get('backdrop') or B.cin.get('broll') or 'terrace-empty', 980, 620, 1250, 520, 2.5, 0.1, dim=0.0)
    t1 = B.words(str(v.get('title') or ''), 150, 330, 118, 0.6, max_w=900, style='stamp', stagger=0.14)
    B.highlight(t1.rect, t1.settle + 0.1, 'title')
    sub = str(v.get('subtitle') or '')
    if sub:
        B.type(sub.upper(), 156, t1.rect[1] + t1.rect[3] + 40, 34, t1.settle + 0.3, font='caps', max_w=800)
    P.cues.append((0.6, 'drum'))
    P.look(0.0, 1100, 520, 0.88)
    P.look(0.6, 560, 420, B.st['push'] * 0.95)
    P.look(B.dur, 900, 520, 1.0)
    return P


def illustration(ed, s, B: Builder) -> Panel:
    v = s['visual']
    P, ink = B.P, B.ink
    art = v.get('art') or B.cin.get('broll') or 'terrace-crowd'
    if art == 'gen':
        from ..sprites import key_of
        art = 'gen:' + key_of(s['n'])
    rot = (-1.6, 2.0, -2.4)[s['n'] % 3]
    cx, cy = 960 + B.side * 70, 470
    pic = B.art(art, 1240, 700, cx, cy, rot, 0.1, frm=(0, -150), style='drop')
    if v.get('caption'):
        cw = B.words(str(v['caption']), cx - 560, cy + 210, 64, 0.9, max_w=1000, style='rise', fill=PAPER, hot_fill=PAPER, plate=INK, shift=6, rot=rot)
        B.highlight(cw.rect, cw.settle + 0.1, 'caption')
    # the camera wanders inside the picture, as you would look at a photograph on a table
    a = (cx - 200 * B.side, cy - 120)
    b = (cx + 160 * B.side, cy + 40)
    P.look(0.0, cx, cy + 40, 0.88)
    P.look(0.9, a[0], a[1], B.st['push'] * 1.05)
    P.look(B.dur, b[0], b[1], B.st['push'] * 1.12)
    if s.get('mood') in ('joy', 'triumph'):
        P.cues.append((0.35, 'crowd-goal'))
    elif s.get('mood') == 'tense':
        P.cues.append((0.35, 'crowd-after'))
    return P


def title(ed, s, B: Builder) -> Panel:
    """The open: the film's title rising out of the board as the camera comes down onto it."""
    v = s['visual']
    P, ink = B.P, B.ink
    B.art(v.get('backdrop') or 'tunnel', 1500, 780, 1000, 470, -1.5, 0.0, style='fade', tape=3)
    hl = str(v.get('headline') or '')
    words_ = hl.split()
    hot = {w.lower().strip('.,!?') for w in words_[-1:]} if words_ else set()
    h = B.words(hl, 960, 430, 132, 1.0, max_w=1500, align='center', hot=hot, style='rise', stagger=0.12, plate=INK, shift=8, fill=PAPER, hot_fill=ink.accent if ink.accent != INK else PAPER)
    if v.get('kicker'):
        B.type(str(v['kicker']).upper(), 960 - min(700, len(str(v['kicker'])) * 11), h.rect[1] + h.rect[3] + 50, 40, h.settle + 0.2, font='caps', plate=NEWS, pad=12, max_w=1400)
    B.underline(h.rect, h.settle + 0.1, 'title')
    st = B.stamp(str(ed.ledger.get('season') or ''), 1600, 220, h.settle + 0.6, rot=10, size=74)
    P.look(0.0, 960, 520, 0.55)
    P.look(1.0, 960, 500, 0.82)
    P.look(h.settle + 0.6, 960, 520, 1.0)
    P.look(B.dur, 960, 520, 1.06)
    P.cues += [(0.0, 'whoosh')]
    return P


def chapter(ed, s, B: Builder) -> Panel:
    v = s['visual']
    P, ink = B.P, B.ink
    num = int(v.get('number') or s['chapter'] + 1)
    tl = str(v.get('title') or ed.script['chapters'][s['chapter']]['title'])
    broll = v.get('backdrop') or B.cin.get('broll') or 'paper'
    if broll != 'paper':
        B.art(broll, 760, 480, 1460, 330, 4, 0.2, style='drop', z=25)
    B.stamp(f'CHAPTER {num}', 520, 300, 0.55, rot=-5, size=86)
    w = B.words(tl, 180, 450, 150, 0.9, max_w=1150, style='rise', stagger=0.12)
    B.highlight(w.rect, w.settle + 0.1, 'title', dur=0.55)
    B.stamp(str(ed.ledger.get('season') or ''), 1500, 780, w.settle + 0.3, rot=9, size=64, tone='paper')
    if B.st['people']:
        B.cut('crowd-row-flags-kr', 300, 960, 1200, 0.5, side=1, motion='rise')
    P.cues += [(0.0, 'whoosh')]
    P.look(0.0, 900, 520, 0.7)
    P.look(0.55, 700, 420, 0.95)
    P.look(w.settle, 760, 520, B.st['push'] * 0.9)
    P.look(B.dur, 900, 540, 1.0)
    return P


def trailer(ed, s, B: Builder) -> Panel:
    v = s['visual']
    P, ink = B.P, B.ink
    lines = [str(x) for x in (v.get('lines') or []) if str(x).strip()][:4]
    if not lines:
        raise StageError('TRAILER_NO_LINES', 'a trailer card needs 1–4 lines')
    n = len(lines)
    span = max(B.vdur, B.dur - B.lead - 0.4, n * 0.9)
    starts = [max(0.15, B.lead * 0.6) + span * j / n for j in range(n)]
    B.art(B.cin.get('broll') or 'terrace-crowd', 1700, 900, 960, 540, -1, 0.0, style='fade', tape=0, z=10)
    spots = [(330, 260), (1100, 420), (420, 700), (1150, 820)]
    for j, (ln, t) in enumerate(zip(lines, starts)):
        x, y = spots[j % 4]
        w = B.words(ln, x, y, 120, t, max_w=1000, style='stamp' if j % 2 == 0 else 'rise', stagger=0.07, plate=INK, shift=10, fill=PAPER,
                    hot_fill=PAPER)
        P.cues.append((t, 'sting' if j == 0 else 'drum'))
        P.shake.append((t + 0.05, 12))
        P.flash.append(t)
        P.look(t + 0.02, w.rect[0] + w.rect[2] / 2, w.rect[1] + w.rect[3] / 2, B.st['push'] * 1.1)
        P.look(min(B.dur, t + span / n - 0.4), w.rect[0] + w.rect[2] / 2 + 40, w.rect[1] + w.rect[3] / 2, B.st['push'] * 1.16)
    P.focus.insert(0, (0.0, 960, 540, 0.8))
    P.look(B.dur, 960, 540, 0.85)
    return P


def map_panel(ed, s, B: Builder) -> Panel:
    from ..maps import city_of, pin_sprite, place_of
    from ..maps import render as render_map
    v = s['visual']
    P, ink, r = B.P, B.ink, B.res
    pts, seen = [], set()
    home = city_of(ed.ledger['club_name'])
    if home:
        pts.append({'name': home[0], 'lat': home[1][0], 'lon': home[1][1], 'home': True})
        seen.add(home[0])
    for cid in v.get('claims') or []:
        c = ed.by.get(cid)
        if not c or c['fact'].get('kind') != 'match':
            continue
        co = place_of(c['fact'], ed.ledger['club_name'])
        if co and co[0] not in seen:
            pts.append({'name': co[0], 'lat': co[1][0], 'lon': co[1][1], 'home': False})
            seen.add(co[0])
    focus = v.get('focus') or 'domestic'
    if len(pts) < 2 and focus != 'home':
        pts = pts or [{'name': 'Tel Aviv', 'lat': 32.08, 'lon': 34.78, 'home': True}]
    W_, H_ = 1500, 845
    cx, cy = 960, 520
    try:
        base, pins = render_map(pts, focus, s['n'] % 9, ed.ledger.get('country', 'Israel' if ed.ledger.get('club_id') == 'hapoel-tel-aviv' else None) if focus != 'europe' else None)
    except Exception:  # noqa: BLE001 — no atlas on this machine: the pins on plain paper
        from ..paper import CANVAS
        base = Image.new('RGB', CANVAS, NEWS)
        pins = [{'name': p['name'], 'x': CANVAS[0] * (0.2 + 0.6 * i / max(1, len(pts) - 1)), 'y': CANVAS[1] * (0.5 + 0.15 * math.sin(i)), 'home': p['home']} for i, p in enumerate(pts)]
    sx, sy = W_ / base.width, H_ / base.height
    pic = base.resize((int(W_ * r), int(H_ * r)), Image.LANCZOS)

    def bake(im, pad, res):
        im.alpha_composite(pic.convert('RGBA'), (int(pad), int(pad)))
    B.card(W_, H_, cx, cy, -0.8, 0.1, tone=NEWS, bake=bake, tape=3, frm=(0, -900), style='drop', s0=1.1, edges='')
    t0 = 0.8
    step = min(1.0, max(0.5, (B.dur * 0.5) / max(1, len(pins))))
    home_pt = None
    last = (cx, cy)
    for i, p in enumerate(pins):
        x, y = cx - W_ / 2 + p['x'] * sx, cy - H_ / 2 + p['y'] * sy
        ti = t0 + i * step
        if p.get('home'):
            home_pt = (x, y)
        elif home_pt:
            B.arrow(home_pt, (x, y - 30), ti - 0.45, f'route_{i}', target=(x - 20, y - 20, 40, 40), dur=0.45)
        pin = pin_sprite(ed.pal.accent, p.get('home', False))
        pin = pin.resize((int(pin.width * r), int(pin.height * r)), Image.LANCZOS)
        w, h = pin.width / r, pin.height / r
        P.add(E.Sprite(pin, _drop_pin(x, y, ti), z=80, kind='data', rect=(x - w / 2, y - h / 2, w, h), settle=ti + 0.5))
        P.cues.append((ti, 'pop'))
        B.type(p['name'].upper(), x + 40, y - 70, 32, ti + 0.15, font='cond', plate=PAPER, pad=8)
        last = (x, y)
    if v.get('label'):
        B.words(str(v['label']), 160, 70, 60, 0.4, max_w=1300, plate=INK, fill=PAPER, hot_fill=PAPER, shift=0)
    prop = 'passenger_plane' if focus == 'europe' else 'supporters_bus' if focus == 'domestic' else None
    if prop and home_pt:
        im = ed.prop_img(prop, int(170 * r))
        if prop == 'passenger_plane':
            im = im.rotate(8, expand=True, resample=Image.BICUBIC)
        (x0, y0), (x1, y1) = home_pt, last
        T0, T1 = t0, t0 + step * max(1, len(pins) - 1)

        def travel(t, x0=x0, y0=y0, x1=x1, y1=y1):
            if t < T0 or t > T1 + 0.4:
                return None
            k = ease_in_out((t - T0) / max(0.3, T1 - T0))
            return Pose(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k - 160 * math.sin(math.pi * k) - 60, 1.0, 0, 1.0 if t <= T1 else 1 - (t - T1) / 0.4)
        P.add(E.Sprite(im, travel, z=96, kind='cutout', layer='near', settle=T1 + 0.5))
    P.look(0.0, cx, cy, 0.8)
    P.look(t0, cx, cy, 0.95)
    P.look(t0 + step * len(pins), last[0], last[1], 1.6 if len(pins) <= 2 else 1.35)
    P.look(B.dur, last[0], last[1], 1.7 if len(pins) <= 2 else 1.42)
    return P


def _drop_pin(x, y, t0):
    def pose(t):
        if t < t0:
            return None
        k = clamp((t - t0) / 0.45)
        # falls, bounces twice, settles
        yy = y - 260 * (1 - k) ** 2 if k < 0.6 else y - 38 * abs(math.sin((k - 0.6) / 0.4 * math.pi * 2)) * (1 - k) * 2.5
        return Pose(x, yy - 24, 1.0, 0, clamp(k / 0.15))
    return pose


BUILDERS = {'score': result, 'matchday': result, 'versus': versus, 'goal': goal, 'ticket': ticket, 'form': form, 'race': race,
            'run': run, 'record': record, 'stat': stat, 'fact': document, 'quote': document, 'press': document, 'table': table,
            'timeline': timeline, 'turning': turning, 'illustration': illustration, 'open': title, 'chapter': chapter,
            'trailer': trailer, 'map': map_panel}
# the two shots that are not on the board: the call to follow the channel and the call to the site keep their own
# designed animation (edit.py) — the board hands over to them with a push-through
CLASSIC = {'follow', 'end'}
# where the beat's picture sits behind a data panel: under a corner of the card ('br' alternates with top-left), or
# along the top for the wide panels
DECOR = {'score': 'br', 'matchday': 'br', 'ticket': 'br', 'stat': 'br', 'fact': 'br', 'quote': 'br', 'press': 'br',
         'record': 'tr', 'run': 'tr', 'table': 'br', 'goal': 'br', 'form': 'tr', 'timeline': 'tr'}


def compose(ed, s: dict, res: float, style: dict) -> Panel:
    kind = s['visual']['type']
    B = Builder(ed, s, res, style)
    # the collage: the beat's picture (the b-roll the director chose) laid on the board first, half under the card
    broll = B.cin.get('broll')
    if kind in DECOR and broll and broll != 'paper':
        corner = DECOR[kind]
        x, y = (1480, 800) if (corner == 'br') == (B.side > 0) else (430, 260)
        if corner == 'tr':
            x, y = 1530, 210
        B.art(broll, 720, 450, x, y, 5.0 * B.side, 0.0, style='drop', z=12, tape=2, clip_ok=False)
    P = BUILDERS[kind](ed, s, B)
    B.library()
    # rule 1 on the board: a beat that names a match the visual does not print gets the slip with its scoreline
    for cid in (B.cin.get('lower') or [])[:1]:
        f = _f(ed, cid)
        if f:
            B.slip(f, 90 if kind != "illustration" else 120, 790, max(0.6, B.lead + 0.2))
    # the slug line (contract §2): typed on its own strip, lower left, before the visual's own text
    if B.cin.get('slug'):
        B.type(str(B.cin['slug']).upper(), 80, 40, 30, 0.2, plate=INK, fill=PAPER, pad=12, max_w=1300)
    # a short beat: every line typed, every word landed, every stroke drawn before the camera leaves
    for e in P.els:
        if hasattr(e, 'fit'):
            e.fit(P.dur - 0.35)
    P.focus.sort(key=lambda k: k[0])
    if not P.focus or P.focus[0][0] > 0:
        P.focus.insert(0, (0.0, 960, 540, 0.95))
    # the camera needs time between two wishes: two looks closer than 0.4 s are one (the later wins)
    out = [P.focus[0]]
    for k in P.focus[1:]:
        if k[0] - out[-1][0] < 0.4:
            if len(out) > 1:
                out[-1] = (max(k[0], out[-2][0] + 0.4),) + tuple(k[1:])
            else:
                out.append((min(P.dur, out[-1][0] + 0.4),) + tuple(k[1:]))
        else:
            out.append(k)
    P.focus = out
    return P
