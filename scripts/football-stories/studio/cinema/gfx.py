"""Broadcast graphics: the scorebug, the lower-third scoreline, form tiles, counters, plates and the goal net.

Drawn in PIL with The Weekly's faces in the film's three inks — ink, paper and the club's permitted accent
(Palette.accent, never a rival family) — plus newsprint. An opponent never gets a colour of its own: its field is ink,
because its colour may be the very colour the club's rival owns (rule 95).
"""
from __future__ import annotations

import datetime as dt
import math
import re

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from ..common import INK, NEWSPRINT, PAPER, Palette, hex_rgb
from .type import text

INK_RGB = hex_rgb(INK)
PAPER_RGB = hex_rgb(PAPER)
NEWS_RGB = hex_rgb(NEWSPRINT)
GREY = (122, 116, 104)


class Inks:
    def __init__(self, pal: Palette):
        self.accent = hex_rgb(pal.accent)
        r, g, b = self.accent
        lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
        self.on_accent = INK_RGB if lum > 0.55 else PAPER_RGB
        self.ink, self.paper, self.news, self.grey = INK_RGB, PAPER_RGB, NEWS_RGB, GREY


def a(rgb, alpha=255):
    return tuple(rgb) + (alpha,)


def abbr(name: str | None) -> str:
    """A broadcast abbreviation: AEK Athens → AEK, Hapoel Tel Aviv → HTA, Panathinaikos → PAN, Real Madrid → RMA."""
    n = re.sub(r'[^\w\s]', ' ', name or '').split()
    if not n:
        return '—'
    for w in n:
        if w.isupper() and 2 <= len(w) <= 4:
            return w
    skip = {'fc', 'cf', 'ac', 'sc', 'afc', 'cd', 'sv', 'fk', 'nk', 'the', 'de', 'of', 'club'}
    words = [w for w in n if w.lower() not in skip] or n
    if len(words) >= 3:
        return ''.join(w[0] for w in words[:3]).upper()
    if len(words) == 2:
        return (words[0][0] + words[1][:2]).upper()
    return words[0][:3].upper()


def short_date(iso: str | None) -> str:
    if not iso:
        return ''
    d = dt.date.fromisoformat(iso)
    return f'{d.day} {d.strftime("%b").upper()} {d.year}'


def long_date(iso: str | None) -> str:
    if not iso:
        return ''
    d = dt.date.fromisoformat(iso)
    return f'{d.day} {d.strftime("%B")} {d.year}'


def plate(w: int, h: int, fill, shift: int = 12, shift_fill=INK_RGB, border: int = 0, border_fill=INK_RGB,
          skew: float = 0.0) -> Image.Image:
    """A flat plate with the second plate printed under it at a hard offset (the Weekly's offset print)."""
    k = int(abs(skew) * h)
    im = Image.new('RGBA', (w + shift + k + 2, h + shift + 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    def poly(ox, oy):
        return [(ox + k, oy), (ox + w + k, oy), (ox + w, oy + h), (ox, oy + h)] if skew else [(ox, oy), (ox + w, oy), (ox + w, oy + h), (ox, oy + h)]
    if shift:
        d.polygon(poly(shift, shift), fill=a(shift_fill))
    d.polygon(poly(0, 0), fill=a(fill), outline=a(border_fill) if border else None, width=border or 1)
    return im


def paste_center(dst: Image.Image, src: Image.Image, cx: float, cy: float) -> None:
    dst.alpha_composite(src, (int(round(cx - src.width / 2)), int(round(cy - src.height / 2))))


# ------------------------------------------------------------------ form tiles
def tile(ink: Inks, outcome: str, score: str, opp: str, side: str, size: int) -> Image.Image:
    """A result tile: W in the club colour, D in paper, L in ink — the letter big, the score and the opponent under it."""
    bg, fg = {'win': (ink.accent, ink.on_accent), 'draw': (ink.paper, ink.ink), 'loss': (ink.ink, ink.paper)}[outcome]
    letter = {'win': 'W', 'draw': 'D', 'loss': 'L'}[outcome]
    h = int(size * 1.62)
    im = Image.new('RGBA', (size + 12, h + 12), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([10, 10, size + 10, h + 10], fill=a(ink.ink if outcome != 'loss' else ink.accent))
    d.rectangle([0, 0, size, h], fill=a(bg), outline=a(ink.ink), width=max(3, size // 28))
    L = text(letter, 'ultra', int(size * 0.62), a(fg))
    im.alpha_composite(L, (int(size / 2 - L.width / 2), int(size * 0.47 - L.height / 2)))
    d.line([(size * 0.12, size * 0.9), (size * 0.88, size * 0.9)], fill=a(fg), width=max(2, size // 40))
    sc = text(score, 'cond', int(size * 0.26), a(fg), max_w=size * 0.86)
    im.alpha_composite(sc, (int(size / 2 - sc.width / 2), int(size * 1.02)))
    op = text(f"{'v' if side == 'home' else '@'} {opp}", 'caps', int(size * 0.16), a(fg), max_w=size * 0.9)
    im.alpha_composite(op, (int(size / 2 - op.width / 2), int(size * 1.36)))
    return im


# ------------------------------------------------------------------ the scorebug
def scorebug(ink: Inks, club: str, season: str, t: dict, hot: str | None = None, pulse: float = 0.0) -> Image.Image:
    """Top-left broadcast bug: the club, its running W–D–L as the story moves, the season under it."""
    h = 66
    ab = text(abbr(club), 'cond', 44, a(ink.on_accent))
    cells = []
    for k in ('W', 'D', 'L'):
        hl = hot == k and pulse > 0
        lab = text(k, 'caps', 22, a(ink.accent if hl else (190, 182, 166)))
        num = text(str(t.get(k, 0)), 'cond', int(40 + 10 * pulse) if hl else 40, a(ink.accent if hl else ink.paper))
        cells.append((lab, num))
    w_ab = ab.width + 36
    w_cells = sum(max(l.width, n.width) + l.width + 26 for l, n in cells) + 20
    W_ = w_ab + w_cells
    im = Image.new('RGBA', (W_ + 10, h + 44), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([8, 8, W_ + 8, h + 8], fill=a(ink.accent if ink.accent != ink.ink else ink.paper, 255))
    d.rectangle([0, 0, W_, h], fill=a(ink.ink, 238))
    d.rectangle([0, 0, w_ab, h], fill=a(ink.accent))
    im.alpha_composite(ab, (int(w_ab / 2 - ab.width / 2), int(h / 2 - ab.height / 2)))
    x = w_ab + 18
    for lab, num in cells:
        im.alpha_composite(lab, (x, int(h / 2 - lab.height / 2) + 2))
        x += lab.width + 8
        im.alpha_composite(num, (x, int(h / 2 - num.height / 2)))
        x += max(num.width, 22) + 18
    tab = text(f'{season} · SEASON SO FAR', 'caps', 18, a(ink.ink))
    d.rectangle([0, h, tab.width + 22, h + tab.height + 12], fill=a(ink.news))
    im.alpha_composite(tab, (11, h + 6))
    return im


# ------------------------------------------------------------------ the lower third
def lower_third(ink: Inks, f: dict, club: str) -> Image.Image:
    """The scoreline a broadcast drops under a picture: home · score · away, then competition and date on a strap."""
    hn, an = f.get('home') or '', f.get('away') or ''
    us_home = hn == club
    name_w = 430
    nf = 46
    hi = text(hn.upper(), 'cond', nf, a(ink.on_accent if us_home else ink.paper), max_w=name_w - 40)
    ai = text(an.upper(), 'cond', nf, a(ink.paper if us_home else ink.on_accent), max_w=name_w - 40)
    sc = text(f"{f['score_home']}–{f['score_away']}", 'ultra', 54, a(ink.ink))
    h = 78
    sw = sc.width + 54
    W_ = name_w * 2 + sw
    im = Image.new('RGBA', (W_ + 12, h + 52), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([10, 10, W_ + 10, h + 10], fill=a(ink.ink))
    d.rectangle([0, 0, name_w, h], fill=a(ink.accent if us_home else ink.ink))
    d.rectangle([name_w + sw, 0, W_, h], fill=a(ink.ink if us_home else ink.accent))
    d.rectangle([name_w, 0, name_w + sw, h], fill=a(ink.paper), outline=a(ink.ink), width=4)
    im.alpha_composite(hi, (int(name_w - 26 - hi.width), int(h / 2 - hi.height / 2)))
    im.alpha_composite(ai, (int(name_w + sw + 26), int(h / 2 - ai.height / 2)))
    im.alpha_composite(sc, (int(name_w + sw / 2 - sc.width / 2), int(h / 2 - sc.height / 2)))
    extra = []
    if f.get('after_extra_time'):
        extra.append('A.E.T.')
    if f.get('penalties'):
        extra.append(f"{f['penalties'].get('winner')} won {f['penalties'].get('score') or f['penalties'].get('shootout')} on pens")
    strap = ' · '.join(x for x in [f.get('competition'), f.get('stage'), short_date(f.get('date')), *extra] if x).upper()
    st = text(strap, 'caps', 22, a(ink.ink), max_w=W_ - 40)
    d.rectangle([0, h, st.width + 30, h + st.height + 14], fill=a(ink.news))
    im.alpha_composite(st, (15, h + 7))
    ft = text('FULL TIME', 'caps', 18, a(ink.paper))
    d.rectangle([W_ - ft.width - 24, h, W_, h + ft.height + 12], fill=a(ink.ink))
    im.alpha_composite(ft, (W_ - ft.width - 12, h + 6))
    return im


def header(ink: Inks, kicker: str, label: str, width: int = 980) -> Image.Image:
    """The graphic's title strap: a small accent kicker over a big ink-on-paper label."""
    k = text(kicker.upper(), 'caps', 26, a(ink.on_accent), track=2)
    lab = text(label.upper(), 'head', 70, a(ink.ink), max_w=width)
    w = max(k.width + 40, lab.width + 52)
    im = Image.new('RGBA', (w + 14, lab.height + k.height + 52), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([12, k.height + 26, w + 12, im.height - 2], fill=a(ink.ink))
    d.rectangle([0, k.height + 14, w, im.height - 14], fill=a(ink.paper), outline=a(ink.ink), width=4)
    d.rectangle([0, 0, k.width + 40, k.height + 16], fill=a(ink.accent), outline=a(ink.ink), width=3)
    im.alpha_composite(k, (20, 8))
    im.alpha_composite(lab, (26, k.height + 24))
    return im


def counter_box(ink: Inks, value: str, label: str, tone: str, w: int = 300, h: int = 300) -> Image.Image:
    bg, fg = {'accent': (ink.accent, ink.on_accent), 'paper': (ink.paper, ink.ink), 'ink': (ink.ink, ink.paper)}[tone]
    im = Image.new('RGBA', (w + 14, h + 14), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([12, 12, w + 12, h + 12], fill=a(ink.ink if tone != 'ink' else ink.accent))
    d.rectangle([0, 0, w, h], fill=a(bg), outline=a(ink.ink), width=6)
    num = text(value, 'ultra', int(h * 0.48), a(fg), max_w=w - 30)
    im.alpha_composite(num, (int(w / 2 - num.width / 2), int(h * 0.43 - num.height / 2)))
    lab = text(label.upper(), 'caps', int(h * 0.1), a(fg), max_w=w - 30, track=1)
    d.line([(w * 0.14, h * 0.74), (w * 0.86, h * 0.74)], fill=a(fg), width=4)
    im.alpha_composite(lab, (int(w / 2 - lab.width / 2), int(h * 0.82 - lab.height / 2)))
    return im


def stripes(w: int, h: int, colour, gap: int = 22, width: int = 6, alpha: int = 60) -> Image.Image:
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for x in range(-h, w, gap):
        d.line([(x, h), (x + h, 0)], fill=a(colour, alpha), width=width)
    return im


def speedlines(w: int, h: int, cx: float, cy: float, seed: int, n: int = 70, colour=PAPER_RGB, alpha: int = 120,
               inner: float = 0.36) -> Image.Image:
    """Manga speed lines radiating from a point (classified composer's fx.speedlines, as a still sprite)."""
    rng = np.random.default_rng(seed)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    R = math.hypot(w, h)
    for _ in range(n):
        ang = rng.uniform(0, 2 * math.pi)
        r0 = R * rng.uniform(inner, inner + 0.25)
        wd = rng.uniform(0.004, 0.016)
        p = [(cx + math.cos(ang - wd) * R, cy + math.sin(ang - wd) * R), (cx + math.cos(ang + wd) * R, cy + math.sin(ang + wd) * R),
             (cx + math.cos(ang) * r0, cy + math.sin(ang) * r0)]
        d.polygon(p, fill=a(colour, alpha))
    return im


# ------------------------------------------------------------------ the net
class Net:
    """A goal net seen from inside the goal: a diamond mesh that bellies out from where the ball hits it, the wave running
    outward and dying away. Drawn as sampled polylines, so the ripple bends every cord."""

    def __init__(self, w: int, h: int, cell: int = 74, colour=PAPER_RGB):
        self.w, self.h, self.colour = w, h, colour
        self.lines = []
        n = int((w + h) / cell) + 2
        for k in range(-n, n + 1):
            for sgn in (1, -1):
                c = k * cell
                pts = []
                for j in range(0, 33):
                    y = h * j / 32
                    x = c + sgn * y if sgn > 0 else c + w - y
                    if -cell <= x <= w + cell:
                        pts.append((x, y))
                if len(pts) >= 2:
                    self.lines.append(np.array(pts, 'float32'))

    def frame(self, t: float, hit: tuple[float, float] | None, t_hit: float, alpha: float = 1.0) -> Image.Image | None:
        if alpha <= 0.01:
            return None
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        col = a(self.colour, int(150 * alpha))
        for P in self.lines:
            X, Y = P[:, 0].copy(), P[:, 1].copy()
            Y += 5 * np.sin(np.pi * Y / self.h) * np.sin(t * 1.4 + X / 160)
            if hit and t >= t_hit:
                dt_ = t - t_hit
                hx, hy = hit
                r = np.hypot(X - hx, Y - hy)
                wave = 70 * math.exp(-dt_ * 2.8) * np.exp(-((r - dt_ * 700) / 110) ** 2) + 60 * math.exp(-dt_ * 4.0) * np.exp(-(r / 190) ** 2)
                ux, uy = (X - hx) / (r + 1e-3), (Y - hy) / (r + 1e-3)
                X = X + ux * wave * 0.55
                Y = Y + uy * wave * 0.55 + wave * 0.3
            d.line(list(zip(X.tolist(), Y.tolist())), fill=col, width=3)
        return im


def soft_glow(r: int, colour, alpha: int = 200) -> Image.Image:
    """A round glow (for the turning point and the line's head)."""
    s = r * 2
    im = Image.new('L', (s, s), 0)
    d = ImageDraw.Draw(im)
    d.ellipse([r * 0.62, r * 0.62, s - r * 0.62, s - r * 0.62], fill=alpha)
    im = im.filter(ImageFilter.GaussianBlur(r * 0.22))
    out = Image.new('RGBA', (s, s), a(colour, 0))
    out.putalpha(im)
    return out
