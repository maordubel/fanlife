"""Drawing a thumbnail: PIL only (no browser, so it runs in the tests and on every runner), in The Weekly's faces.

A `Board` is the canvas plus a record of every line of type placed on it, so `legibility()` can measure the words the
way a viewer meets them — at 168×94, YouTube's smallest size — instead of trusting the font size.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

INK = (21, 19, 15)
PAPER = (255, 251, 242)
NEWS = (244, 236, 216)
SMALL = (168, 94)          # YouTube's smallest thumbnail (search results on a phone, the up-next list)
MIN_SMALL_PX = 9           # the hook's letters at that size: at least this many pixels tall
MIN_CONTRAST = 3.0         # WCAG large-text contrast, measured on the downscaled picture


def lum(rgb) -> float:
    def ch(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb[:3]
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast(a, b) -> float:
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def readable_on(bg) -> tuple:
    return INK if contrast(INK, bg) >= contrast(PAPER, bg) else PAPER


@dataclass
class Board:
    w: int
    h: int
    im: Image.Image = None
    texts: list = field(default_factory=list)     # {role, text, mask (L, full size), fill}

    def __post_init__(self):
        if self.im is None:
            self.im = Image.new('RGBA', (self.w, self.h), INK + (255,))

    def paste(self, sprite: Image.Image, xy, mask_of: Image.Image | None = None, role: str | None = None, text: str = '',
              fill=None) -> tuple[int, int, int, int]:
        x, y = int(xy[0]), int(xy[1])
        self.im.alpha_composite(sprite, (x, y)) if (x >= 0 and y >= 0) else self._paste_clip(sprite, x, y)
        if mask_of is not None and role:
            m = Image.new('L', (self.w, self.h), 0)
            m.paste(mask_of, (x, y))
            self.texts.append({'role': role, 'text': text, 'mask': m, 'fill': fill})
        return (x, y, x + sprite.width, y + sprite.height)

    def _paste_clip(self, sprite, x, y):
        tmp = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        tmp.paste(sprite, (x, y), sprite)
        self.im.alpha_composite(tmp)

    def rgb(self) -> Image.Image:
        return self.im.convert('RGB')


# ── type ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
def face(name: str, size: int):
    if name == 'brand':
        from comic.letter import face as lf
        return _PilFace(lf('brand', int(size)))
    from ..cinema.type import face as f
    return f(name, int(size))


class _PilFace:
    """The comic lettering's single-file faces behind the same small interface as cinema.type.Face."""
    def __init__(self, f):
        self.f = f

    def length(self, text, track=0.0):
        return self.f.getlength(text) + track * max(0, len(text) - 1)

    def metrics(self):
        return self.f.getmetrics()

    def draw(self, d, xy, text, fill, track=0.0, stroke=0, stroke_fill=None):
        d.text(xy, text, font=self.f, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill)


def best_lines(text: str, font: str, max_size: int, max_w: float, max_h: float, most: int = 3, track: float = 0.0,
               lead: float = 0.9) -> tuple[list[str], int]:
    """The line break that sets the headline biggest inside a box (1, 2 or 3 lines)."""
    best = ([text], fit_size(font, max_size, text, max_w, track=track))
    for n in range(2, most + 1):
        ls = split_lines(text, n)
        if len(ls) < n:
            continue
        s = min(min(fit_size(font, max_size, l, max_w, track=track) for l in ls), int(max_h / (lead * (n - 1) + 1.05)))
        if s > best[1] * 1.08:
            best = (ls, s)
    return best


def fit_size(font: str, size: int, text: str, max_w: float, floor: int = 18, track: float = 0.0) -> int:
    s = int(size)
    while s > floor and face(font, s).length(text, track) > max_w:
        s -= 2
    return s


def line(text: str, font: str, size: int, fill, *, stroke: int = 0, stroke_fill=INK, shift: int = 0, plate=INK,
         track: float = 0.0) -> tuple[Image.Image, Image.Image]:
    """One line of type cropped to its ink, and the mask of its FILL (what a viewer reads): printed twice when `shift`
    is set (the plate under at a hard offset, the colour over) — The Weekly's second plate, never a soft shadow."""
    f = face(font, size)
    asc, desc = f.metrics()
    pad = stroke + 6
    w = int(f.length(text, track)) + pad * 2 + shift
    h = asc + desc + pad * 2 + shift
    im = Image.new('RGBA', (max(1, w), max(1, h)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if shift:
        f.draw(d, (pad + shift, pad + shift), text, tuple(plate) + (255,), track, stroke, tuple(plate) + (255,))
    f.draw(d, (pad, pad), text, tuple(fill) + (255,), track, stroke, tuple(stroke_fill) + (255,) if stroke else None)
    m = Image.new('L', im.size, 0)
    f.draw(ImageDraw.Draw(m), (pad, pad), text, 255, track, 0, None)
    bb = im.getbbox()
    if bb:
        im, m = im.crop(bb), m.crop(bb)
    return im, m


def rotate(im: Image.Image, m: Image.Image | None, deg: float):
    r = im.rotate(deg, expand=True, resample=Image.BICUBIC)
    return r, (m.rotate(deg, expand=True, resample=Image.BICUBIC) if m is not None else None)


def split_lines(text: str, n: int = 2) -> list[str]:
    """A headline in at most `n` lines, as even as the words allow (a question keeps its mark on the last line)."""
    words = text.split()
    if len(words) <= 1 or n <= 1:
        return [text]
    if n >= 3 and len(words) >= 3:
        best3, cost3 = None, 1e9
        for i in range(1, len(words) - 1):
            for j in range(i + 1, len(words)):
                ls = [' '.join(words[:i]), ' '.join(words[i:j]), ' '.join(words[j:])]
                c = max(map(len, ls)) - min(map(len, ls)) * 0.2
                if c < cost3:
                    best3, cost3 = ls, c
        return best3
    best, cost = [text], 1e9
    for i in range(1, len(words)):
        a, b = ' '.join(words[:i]), ' '.join(words[i:])
        c = max(len(a), len(b)) + (2 if len(a) > len(b) * 2.2 or len(b) > len(a) * 2.2 else 0) + (0.5 if len(a) < len(b) else 0)
        if c < cost:
            best, cost = [a, b], c
    return best


# ── paper, plates and the pen ─────────────────────────────────────────────────────────────────────────────────────────
def paper_card(w: int, h: int, seed: int, tone=NEWS, tape: int = 2, edges='tblr') -> tuple[Image.Image, int]:
    from ..vox.elements import paper
    return paper(w, h, 1.0, seed, tone=tone, edges=edges, tape=tape)


def plate(w: int, h: int, fill, *, second=INK, shift: int = 12, border: int = 6) -> Image.Image:
    im = Image.new('RGBA', (w + shift, h + shift), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if second is not None:
        d.rectangle([shift, shift, w + shift - 1, h + shift - 1], fill=tuple(second) + (255,))
    d.rectangle([0, 0, w - 1, h - 1], fill=tuple(fill) + (255,), outline=INK + (255,), width=border)
    return im


def pen_stroke(path, colour, width: float = 11.0, head: bool = False, size=(1280, 720)) -> Image.Image:
    """The VOX felt-tip: a paper halo first (so the stroke reads on any picture), then the ink pooled under the line."""
    im = Image.new('RGBA', size, (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    P = [(float(x), float(y)) for x, y in path]
    halo = PAPER if lum(colour) < 0.45 else INK
    d.line(P, fill=halo + (200,), width=int(width * 2.0), joint='curve')
    d.line(P, fill=tuple(colour) + (120,), width=int(width * 1.35), joint='curve')
    d.line(P, fill=tuple(colour) + (250,), width=int(width), joint='curve')
    for (x, y) in (P[0], P[-1]):
        r = width * 0.5
        d.ellipse([x - r, y - r, x + r, y + r], fill=tuple(colour) + (250,))
    if head and len(P) >= 4:
        (x1, y1), (x0, y0) = P[-1], P[-5]
        ang = math.atan2(y1 - y0, x1 - x0)
        for s in (-1, 1):
            a = ang + math.pi - s * 0.5
            tip = (x1 + 34 * math.cos(a), y1 + 34 * math.sin(a))
            d.line([(x1, y1), tip], fill=halo + (200,), width=int(width * 2.0))
        for s in (-1, 1):
            a = ang + math.pi - s * 0.5
            d.line([(x1, y1), (x1 + 34 * math.cos(a), y1 + 34 * math.sin(a))], fill=tuple(colour) + (250,), width=int(width))
    return im


def highlight(board: Board, rect, colour, seed: int = 0) -> None:
    """The highlighter under a word, printed in multiply so the ink above it stays ink."""
    x0, y0, x1, y1 = rect
    w, h = int(x1 - x0) + 20, int((y1 - y0) * 0.62)
    rng = np.random.default_rng(seed)
    sw = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(sw)
    s = h * 0.2
    d.polygon([(0, s * rng.random()), (w, 0), (w - s, h), (0, h - s * rng.random())], fill=tuple(colour) + (255,))
    base = board.im.crop((int(x0) - 10, int(y1 - h * 1.02), int(x0) - 10 + w, int(y1 - h * 1.02) + h)).convert('RGB')
    a = np.asarray(base, 'float32')
    c = np.asarray(Image.new('RGB', (w, h), tuple(colour)), 'float32')
    mul = a * c / 255
    alpha = np.asarray(sw.getchannel('A'), 'float32')[..., None] / 255
    out = a * (1 - alpha) + mul * alpha
    board.im.paste(Image.fromarray(out.clip(0, 255).astype('uint8')).convert('RGBA'), (int(x0) - 10, int(y1 - h * 1.02)))


def medallion(crest_path, d: int = 132, ring=INK) -> Image.Image | None:
    """The club crest in a paper disc with an ink ring and the second plate — as the channel covers have it."""
    if not crest_path:
        return None
    im = Image.new('RGBA', (d + 10, d + 10), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    dr.ellipse([10, 10, d + 9, d + 9], fill=INK + (255,))
    dr.ellipse([0, 0, d - 1, d - 1], fill=PAPER + (255,), outline=tuple(ring) + (255,), width=max(5, d // 22))
    with Image.open(crest_path) as c:
        c = c.convert('RGBA')
        s = d * 0.72 / max(c.size)
        c = c.resize((max(1, round(c.width * s)), max(1, round(c.height * s))), Image.LANCZOS)
    im.alpha_composite(c, ((d - c.width) // 2, (d - c.height) // 2))
    return im


def wordmark(size: int = 34) -> tuple[Image.Image, Image.Image]:
    return line('FanLife', 'brand', size, PAPER, stroke=3, stroke_fill=INK)


def grade(im: Image.Image, warm: bool = False, punch: float = 1.12) -> Image.Image:
    a = np.asarray(im.convert('RGB'), 'float32')
    m = a.mean((0, 1), keepdims=True)
    a = (a - m) * punch + m
    g = a.mean(-1, keepdims=True)
    a = g + (a - g) * 1.12          # a little more colour: a thumbnail is seen small
    if warm:
        a *= np.array([1.04, 1.0, 0.93], 'float32')
    return Image.fromarray(a.clip(0, 255).astype('uint8'))


def shade(board: Board, side: str, strength: float = 0.88, reach: float = 0.62) -> None:
    """Darken the side the words stand on, so they read on any picture."""
    w, h = board.w, board.h
    x = np.linspace(0, 1, w, dtype='float32')
    if side == 'right':
        x = x[::-1]
    a = np.clip(1 - x / reach, 0, 1) ** 1.3 * strength
    al = (np.tile(a, (h, 1)) * 255).astype('uint8')
    sh = Image.new('RGBA', (w, h), INK + (0,))
    sh.putalpha(Image.fromarray(al))
    board.im.alpha_composite(sh)


# ── legibility ────────────────────────────────────────────────────────────────────────────────────────────────────────
def legibility(board: Board, small=SMALL, roles=('headline', 'chip')) -> dict:
    """The hook as YouTube shows it at its smallest: each line's letter height in pixels and its contrast against what
    is around it, measured on the downscaled picture. `ok` when every hook line is at least MIN_SMALL_PX tall and
    MIN_CONTRAST against its ground."""
    sm = board.rgb().resize(small, Image.LANCZOS)
    A = np.asarray(sm, 'float32')
    lines = []
    for t in board.texts:
        if t['role'] not in roles:
            continue
        m = np.asarray(t['mask'].resize(small, Image.BOX), 'float32') / 255
        ys, xs = np.nonzero(m > 0.35)
        if not len(ys):
            lines.append({'role': t['role'], 'text': t['text'], 'px': 0.0, 'contrast': 0.0, 'ok': False})
            continue
        # letter height: the rows the glyphs cover (a descender adds a row or two; the measure is conservative)
        full = np.asarray(t['mask'], 'float32') / 255
        fy = np.nonzero(full.max(1) > 0.5)[0]
        px = (fy.max() - fy.min() + 1) * small[1] / board.h
        y0, y1, x0, x1 = max(0, ys.min() - 1), min(small[1], ys.max() + 2), max(0, xs.min() - 1), min(small[0], xs.max() + 2)
        box = m[y0:y1, x0:x1]
        pix = A[y0:y1, x0:x1]
        fg = pix[box > 0.6]
        bg = pix[box < 0.05]
        if not len(fg) or not len(bg):
            c = 21.0 if len(fg) else 0.0
        else:
            c = contrast(np.median(fg, 0), np.median(bg, 0))
        lines.append({'role': t['role'], 'text': t['text'], 'px': round(float(px), 1), 'contrast': round(float(c), 2),
                      'ok': bool(px >= MIN_SMALL_PX and c >= MIN_CONTRAST)})
    return {'size': list(small), 'lines': lines, 'ok': bool(lines) and all(x['ok'] for x in lines)}
