"""Burned-in captions that follow the narrator word by word, in The Weekly's type.

A caption is a short line of the narration on an ink plate with the club colour as its second plate (the Weekly's
offset print, not a drop shadow). Words already spoken print in cream, the word being spoken sits in a block of the club
colour and pops, the words still to come wait in grey. Lines break where the narrator breathes (a full stop, a comma
after three words) or at 34 characters. The YouTube caption track is still delivered separately.
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .common import FONTS, INK, PAPER, H, W, hex_rgb

MAX_CHARS = 34
SIZE = 54
CACHE = Path(os.environ.get('STORIES_FONT_CACHE', Path.home() / '.cache' / 'fanlife-stories-fonts'))


@lru_cache(maxsize=16)
def _face(file: str, size: int) -> tuple[ImageFont.FreeTypeFont, frozenset]:
    """PIL cannot read woff2: a Weekly face is unpacked to TTF once (fontTools + brotli) and cached, with its cmap."""
    from fontTools.ttLib import TTFont
    CACHE.mkdir(parents=True, exist_ok=True)
    ttf = CACHE / file.replace('.woff2', '.ttf')
    f = TTFont(str(FONTS / file))
    cmap = frozenset(f.getBestCmap() or {})
    if not ttf.exists():
        f.flavor = None
        f.save(str(ttf))
    return ImageFont.truetype(str(ttf), size), cmap


class Face:
    """The latin subset with the latin-ext subset behind it, char by char — Računica keeps its č."""

    def __init__(self, name: str = 'weekly-head', size: int = SIZE):
        self.parts = [_face(f'{name}-latin.woff2', size), _face(f'{name}-latin-ext.woff2', size)]

    def _for(self, ch: str) -> ImageFont.FreeTypeFont:
        for f, cmap in self.parts:
            if ord(ch) in cmap:
                return f
        return self.parts[0][0]

    def getlength(self, text: str) -> float:
        return sum(self._for(c).getlength(c) for c in text)

    def getmetrics(self):
        return self.parts[0][0].getmetrics()

    def draw(self, d: ImageDraw.ImageDraw, xy, text: str, fill):
        x, y = xy
        for c in text:
            f = self._for(c)
            d.text((x, y), c, font=f, fill=fill)
            x += f.getlength(c)


@lru_cache(maxsize=4)
def font(name: str = 'weekly-head', size: int = SIZE) -> Face:
    return Face(name, size)


def groups(words: list[dict]) -> list[list[dict]]:
    out: list[list[dict]] = [[]]
    for w in words:
        cur = out[-1]
        if cur and len(' '.join(x['w'] for x in cur + [w])) > MAX_CHARS:
            out.append([])
            cur = out[-1]
        cur.append(w)
        t = w['w'].rstrip('"\'’”)')
        if t.endswith(('.', '?', '!', ':', ';')) or (t.endswith(',') and len(cur) >= 3):
            out.append([])
    return [g for g in out if g]


class Captions:
    """Per-frame caption overlay for one shot. `offset` is when the narration starts inside the shot (seconds)."""

    def __init__(self, words: list[dict], offset: float, accent: str):
        self.offset = offset
        self.accent = hex_rgb(accent)
        self.groups = groups([w for w in words if w.get('w')])
        self.spans = []
        for i, g in enumerate(self.groups):
            a = g[0]['start'] - 0.06
            b = (self.groups[i + 1][0]['start'] - 0.06) if i + 1 < len(self.groups) else g[-1]['end'] + 0.35
            self.spans.append((a, max(b, g[-1]['end'] + 0.05)))
        self._cache: dict[tuple[int, int], tuple[Image.Image, int, int]] = {}

    def _render(self, gi: int, active: int) -> tuple[Image.Image, int, int]:
        key = (gi, active)
        if key in self._cache:
            return self._cache[key]
        f = font()
        g = self.groups[gi]
        texts = [w['w'].upper() for w in g]
        space = f.getlength(' ') * 1.35
        widths = [f.getlength(t) for t in texts]
        pad_x, pad_y, shift = 34, 18, 9
        asc, desc = f.getmetrics()
        line_h = asc + desc
        tw = sum(widths) + space * (len(texts) - 1)
        pw, ph = int(tw + pad_x * 2), int(line_h + pad_y * 2)
        im = Image.new('RGBA', (pw + shift + 8, ph + shift + 8), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.rectangle([shift, shift, shift + pw, shift + ph], fill=self.accent + (255,))       # second plate
        d.rectangle([0, 0, pw, ph], fill=hex_rgb(INK) + (255,))
        x, y = pad_x, pad_y
        cream, waiting = hex_rgb(PAPER), (150, 142, 128)
        for i, (t, wd) in enumerate(zip(texts, widths)):
            if i == active:
                d.rectangle([x - 8, y - 4, x + wd + 8, y + line_h + 2], fill=self.accent + (255,))
                f.draw(d, (x, y), t, cream)
            else:
                f.draw(d, (x, y), t, cream if i < active or active < 0 else waiting)
            x += wd + space
        res = (im, pw, ph)
        self._cache[key] = res
        return res

    def __call__(self, t: float):
        """(RGBA image, x, y) for the frame at shot time t, or None between lines."""
        v = t - self.offset
        for gi, (a, b) in enumerate(self.spans):
            if a <= v < b:
                g = self.groups[gi]
                active = -1
                for i, w in enumerate(g):
                    if w['start'] - 0.04 <= v < max(w['end'], w['start'] + 0.12):
                        active = i
                if active < 0 and v >= g[-1]['end']:
                    active = len(g)  # all spoken
                im, pw, ph = self._render(gi, min(active, len(g)) if active < len(g) else -1)
                k = min(1.0, (v - a) / 0.14)
                y = int(H - 96 - ph / 2 + (1 - k) * 18)
                x = int((W - pw) / 2)
                if k < 1:
                    im = im.copy()
                    im.putalpha(im.getchannel('A').point(lambda p: int(p * k)))
                return im, x, y
        return None
