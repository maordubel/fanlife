"""Lettering in The Weekly's own faces: the CLASSIFIED stamp, case-file captions, SMASH! shouts, the title card, the
tone tab. Each is drawn once as an RGBA sprite (PIL) and moved per frame by the renderer. These are the only words
the composer prints; it never writes on the owner's art itself.
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPO = Path(__file__).resolve().parents[3]
FONTS = REPO / 'public' / 'fonts'
CACHE = Path(os.environ.get('STORIES_FONT_CACHE', Path.home() / '.cache' / 'fanlife-stories-fonts'))

INK, PAPER, NEWS = (21, 19, 15), (255, 251, 242), (244, 236, 216)
RED, CYAN, NAVY = (215, 25, 32), (27, 154, 214), (35, 60, 143)

FACES = {
    'shout': 'knewave-latin-400-normal.woff2',       # fixed exclamations only (SMASH!, CRACK!)
    'brand': 'shrikhand-latin-400-normal.woff2',
    'head': 'weekly-head-latin.woff2',              # Archivo 900 italic, narrow
    'caps': 'weekly-caps-latin.woff2',              # Archivo 800, narrow
    'num': 'ultra-latin-400-normal.woff2',
    'type': 'courier-prime-latin-700-normal.woff2',  # the case-file typewriter
}


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


@lru_cache(maxsize=64)
def face(name: str, size: int) -> ImageFont.FreeTypeFont:
    """PIL cannot read woff2: unpacked to TTF once (fontTools + brotli) and cached outside the repo."""
    from fontTools.ttLib import TTFont
    file = FACES[name]
    CACHE.mkdir(parents=True, exist_ok=True)
    ttf = CACHE / file.replace('.woff2', '.ttf')
    if not ttf.exists():   # written to a temp name and moved: parallel renderers never read half a font
        f = TTFont(str(FONTS / file))
        f.flavor = None
        tmp = ttf.with_name(f'{ttf.stem}.{os.getpid()}.tmp')
        f.save(str(tmp))
        os.replace(tmp, ttf)
    return ImageFont.truetype(str(ttf), size)


def warm() -> None:
    """Unpack every face once, before frames are shared out between processes."""
    for name in FACES:
        face(name, 40)


def _arr(im: Image.Image) -> np.ndarray:
    return np.asarray(im.convert('RGBA')).copy()


def _grunge(size, seed: int, coarse: int = 9) -> np.ndarray:
    """A rubber-stamp wear mask (1 = ink kept)."""
    r = np.random.default_rng(seed)
    w, h = size
    import cv2
    n = cv2.resize(r.random((max(2, h // coarse), max(2, w // coarse))).astype(np.float32), (w, h), interpolation=cv2.INTER_CUBIC)
    fine = r.random((h, w)).astype(np.float32)
    m = (n * .7 + fine * .3)
    return np.clip((m - .18) * 3.2, 0, 1)


def stamp(text: str = 'CLASSIFIED', color=RED, height: int = 230, seed: int = 7) -> np.ndarray:
    """A rubber stamp: double border, condensed caps, worn ink. Transparent elsewhere."""
    f = face('caps', int(height * .56))
    l, t, r, b = f.getbbox(text)
    tw, th = r - l, b - t
    pad = int(height * .2)
    W, H = tw + pad * 2 + 40, height
    im = Image.new('RGBA', (W + 40, H + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    o = 20
    lw = max(6, height // 22)
    d.rounded_rectangle([o, o, o + W, o + H], radius=height // 12, outline=color + (255,), width=lw)
    d.rounded_rectangle([o + lw * 2, o + lw * 2, o + W - lw * 2, o + H - lw * 2], radius=height // 16, outline=color + (255,), width=max(2, lw // 2))
    d.text((o + (W - tw) / 2 - l, o + (H - th) / 2 - t), text, font=f, fill=color + (255,))
    a = _arr(im)
    a[..., 3] = (a[..., 3] * _grunge((a.shape[1], a.shape[0]), seed)).astype(np.uint8)
    return a


def shout(text: str = 'SMASH!', size: int = 260, fill=RED, burst: bool = True, seed: int = 3) -> np.ndarray:
    """A Weekly shout: Knewave, ink outline, offset ink plate (the second plate, not a drop shadow), on a starburst."""
    f = face('shout', size)
    l, t, r, b = f.getbbox(text)
    tw, th = r - l, b - t
    pad = int(size * .55)
    W, H = tw + pad * 2, th + pad * 2
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if burst:
        rng = np.random.default_rng(seed)
        cx, cy, n = W / 2, H / 2, 18
        pts = []
        for i in range(n * 2):
            ang = i / (n * 2) * 2 * np.pi
            rr = (1.0 + rng.uniform(-.05, .1)) if i % 2 == 0 else (.66 + rng.uniform(-.06, .05))
            pts.append((cx + np.cos(ang) * W * .5 * rr * .98, cy + np.sin(ang) * H * .5 * rr * .98))
        sh = [(x + size * .06, y + size * .06) for x, y in pts]
        d.polygon(sh, fill=INK + (255,))
        d.polygon(pts, fill=PAPER + (255,), outline=INK + (255,))
        d.line(pts + [pts[0]], fill=INK + (255,), width=max(5, size // 40), joint='curve')
    x0, y0 = (W - tw) / 2 - l, (H - th) / 2 - t
    sw = max(6, size // 16)
    off = size * .07
    d.text((x0 + off, y0 + off), text, font=f, fill=INK + (255,), stroke_width=sw, stroke_fill=INK + (255,))
    d.text((x0, y0), text, font=f, fill=fill + (255,), stroke_width=sw, stroke_fill=INK + (255,))
    return _arr(im)


def paper_strip(w: int, h: int, seed: int = 5, color=NEWS) -> Image.Image:
    rng = np.random.default_rng(seed)
    base = np.zeros((h, w, 4), np.uint8)
    base[..., :3] = color
    base[..., 3] = 255
    fib = rng.random((h, w)) * 14 - 7
    base[..., :3] = np.clip(base[..., :3].astype(np.float32) + fib[..., None], 0, 255).astype(np.uint8)
    im = Image.fromarray(base, 'RGBA')
    return im


def caption_card(lines: list[str], label: str = '', width: int = 820, seed: int = 11) -> tuple[np.ndarray, list[tuple]]:
    """A case-file strip: aged paper, ink rule, a small caps label, typewriter lines. Returns the sprite with the text
    NOT yet printed, and the glyph positions so the renderer can type it on one character at a time."""
    f = face('type', 40)
    lab = face('caps', 26)
    asc, desc = f.getmetrics()
    lh = int((asc + desc) * 1.18)
    top = 62 if label else 30
    h = top + lh * len(lines) + 30
    im = paper_strip(width, h, seed)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, width - 1, h - 1], outline=INK + (255,), width=4)
    glyphs = []
    if label:
        d.text((28, 18), label, font=lab, fill=RED + (255,))
        d.line([(28, 52), (width - 28, 52)], fill=INK + (170,), width=2)
    y = top
    for ln in lines:
        x = 30
        for ch in ln:
            glyphs.append((x, y, ch))
            x += f.getlength(ch)
        glyphs.append((x, y, '\n'))
        y += lh
    # offset ink plate behind the strip
    W2, H2 = width + 14, h + 14
    out = Image.new('RGBA', (W2, H2), (0, 0, 0, 0))
    plate = Image.new('RGBA', (width, h), INK + (255,))
    out.paste(plate, (12, 12))
    out.alpha_composite(im, (0, 0))
    return _arr(out), glyphs


def type_on(card: np.ndarray, glyphs: list[tuple], n: int, cursor: bool) -> np.ndarray:
    """The card with its first n characters typed (and a cursor block after them)."""
    im = Image.fromarray(card, 'RGBA')
    d = ImageDraw.Draw(im)
    f = face('type', 40)
    shown = 0
    last = None
    for x, y, ch in glyphs:
        if shown >= n:
            break
        if ch != '\n':
            d.text((x, y), ch, font=f, fill=INK + (255,))
            last = (x + f.getlength(ch), y)
        else:
            last = None
        shown += 1
    if cursor:
        if last is None:
            # cursor at the next glyph position
            nxt = glyphs[min(n, len(glyphs) - 1)]
            last = (nxt[0], nxt[1])
        d.rectangle([last[0] + 2, last[1] + 6, last[0] + 22, last[1] + 44], fill=INK + (200,))
    return _arr(im)


def title_card(number: str, title: str, tone: str, tone_rgb, width: int = 1180) -> np.ndarray:
    """FILE 01 · THE BOTTLE — a paper plate with the tone colour as its second plate, and the tone tab on top."""
    fnum, fhead, fcaps = face('num', 120), face('head', 150), face('caps', 40)
    tl, tt, tr, tb = fhead.getbbox(title)
    width = max(width, (tr - tl) + 140)
    h = 380
    im = Image.new('RGBA', (width + 40, h + 110), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # tab
    tab_w = int(fcaps.getlength(f'CLASSIFIED · {tone}')) + 60
    d.rectangle([40, 0, 40 + tab_w, 70], fill=tone_rgb + (255,), outline=INK + (255,), width=5)
    d.text((70, 14), f'CLASSIFIED · {tone}', font=fcaps, fill=PAPER + (255,))
    d.rectangle([20 + 18, 66 + 18, 20 + width + 18, 66 + h + 18], fill=tone_rgb + (255,))
    d.rectangle([20, 66, 20 + width, 66 + h], fill=PAPER + (255,), outline=INK + (255,), width=7)
    lab = f'FILE {number}'
    d.text((64, 96), lab, font=fnum, fill=INK + (255,))
    d.line([(64, 252), (width - 30, 252)], fill=INK + (255,), width=4)
    d.text((60 - tl, 270 - tt), title, font=fhead, fill=RED + (255,), stroke_width=0)
    return _arr(im)


def tone_tab(tone: str, tone_rgb, file_label: str) -> np.ndarray:
    fcaps = face('caps', 30)
    a = f'{tone}'
    b = f'CLASSIFIED · {file_label}'
    wa, wb = int(fcaps.getlength(a)) + 44, int(fcaps.getlength(b)) + 44
    h = 54
    im = Image.new('RGBA', (wa + wb + 12, h + 10), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([8, 8, wa + wb + 8, h + 8], fill=INK + (255,))
    d.rectangle([0, 0, wb, h], fill=PAPER + (255,), outline=INK + (255,), width=4)
    d.text((22, 9), b, font=fcaps, fill=INK + (255,))
    d.rectangle([wb, 0, wb + wa, h], fill=tone_rgb + (255,), outline=INK + (255,), width=4)
    d.text((wb + 22, 9), a, font=fcaps, fill=PAPER + (255,))
    return _arr(im)
