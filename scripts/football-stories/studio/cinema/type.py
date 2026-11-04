"""Type for the broadcast graphics, drawn straight into PIL (no Chromium round trip per frame): The Weekly's own faces,
unpacked from woff2 once (captions._face), latin with latin-ext behind it so a Kožulj keeps its Ž."""
from __future__ import annotations

from functools import lru_cache

from PIL import Image, ImageDraw, ImageFont

from ..captions import _face

FILES = {
    'head': ('weekly-head-latin.woff2', 'weekly-head-latin-ext.woff2'),
    'caps': ('weekly-caps-latin.woff2', 'weekly-caps-latin-ext.woff2'),
    'body': ('weekly-body-latin.woff2', 'weekly-body-latin-ext.woff2'),
    'ultra': ('ultra-latin-400-normal.woff2', 'ultra-latin-ext-400-normal.woff2'),
    'shout': ('knewave-latin-400-normal.woff2', 'knewave-latin-ext-400-normal.woff2'),
    'cond': ('oswald-latin-700-normal.woff2', 'oswald-latin-ext-700-normal.woff2'),
    'mono': ('courier-prime-latin-700-normal.woff2', 'courier-prime-latin-ext-700-normal.woff2'),
}


class Face:
    def __init__(self, name: str, size: int):
        self.size = size
        self.parts = [_face(f, size) for f in FILES[name]]

    def _for(self, ch: str) -> ImageFont.FreeTypeFont:
        for f, cmap in self.parts:
            if ord(ch) in cmap:
                return f
        return self.parts[0][0]

    def length(self, text: str, track: float = 0.0) -> float:
        return sum(self._for(c).getlength(c) + track for c in text) - (track if text else 0)

    def metrics(self) -> tuple[int, int]:
        return self.parts[0][0].getmetrics()

    def draw(self, d: ImageDraw.ImageDraw, xy, text: str, fill, track: float = 0.0, stroke: int = 0, stroke_fill=None):
        x, y = xy
        for c in text:
            f = self._for(c)
            d.text((x, y), c, font=f, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill)
            x += f.getlength(c) + track


@lru_cache(maxsize=64)
def face(name: str, size: int) -> Face:
    return Face(name, int(size))


def fitted(name: str, size: int, text: str, max_w: float, track: float = 0.0, floor: int = 14) -> Face:
    """The largest face at or under `size` whose line fits `max_w` (a long name shrinks to its box, never overflows)."""
    s = int(size)
    while s > floor and face(name, s).length(text, track) > max_w:
        s -= 2
    return face(name, s)


def text(s: str, name: str, size: int, fill, *, max_w: float | None = None, track: float = 0.0, stroke: int = 0,
         stroke_fill=None, plate: tuple | None = None, shift: int = 0) -> Image.Image:
    """One line as a transparent RGBA image cropped to its box. `shift` prints it twice (ink under at a hard offset,
    colour over): the Weekly's second plate, never a soft drop shadow."""
    f = fitted(name, size, s, max_w, track) if max_w else face(name, size)
    asc, desc = f.metrics()
    pad = stroke + 4
    w = int(f.length(s, track)) + pad * 2 + shift
    h = asc + desc + pad * 2 + shift
    im = Image.new('RGBA', (max(1, w), max(1, h)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if shift:
        f.draw(d, (pad + shift, pad + shift), s, plate or (21, 19, 15, 255), track, stroke, plate or (21, 19, 15, 255))
    f.draw(d, (pad, pad), s, fill, track, stroke, stroke_fill)
    bb = im.getbbox()
    return im.crop(bb) if bb else im
