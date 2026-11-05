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
    low = r.random((max(2, h // coarse), max(2, w // coarse))).astype(np.float32)
    n = np.asarray(Image.fromarray(low, 'F').resize((w, h), Image.BICUBIC), dtype=np.float32)
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


# ------------------------------------------------------------------ full episode cards (produce.py)
def _plate(w: int, h: int, second=None, seed: int = 9) -> Image.Image:
    """A paper plate with an ink frame and (optionally) a coloured second plate offset behind it."""
    im = Image.new('RGBA', (w + 24, h + 24), (0, 0, 0, 0))
    if second is not None:
        im.paste(Image.new('RGBA', (w, h), tuple(second) + (255,)), (18, 18))
    im.alpha_composite(paper_strip(w, h, seed), (0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, w - 1, h - 1], outline=INK + (255,), width=6)
    return im


def chapter_card(n: int, title: str, tone_rgb) -> np.ndarray:
    """CHAPTER 2 · FRIDAY NIGHT, JEREZ — a case-file divider: the chapter number in Ultra, the title in the head face."""
    fn, fh, fc = face('num', 150), face('head', 118), face('caps', 38)
    tl, tt, tr, tb = fh.getbbox(title)
    w = max(900, tr - tl + 120)
    im = _plate(w, 330, tone_rgb, seed=20 + n)
    d = ImageDraw.Draw(im)
    d.text((44, 24), f'CHAPTER', font=fc, fill=RED + (255,))
    d.text((44, 58), f'{n:02d}', font=fn, fill=INK + (255,))
    d.line([(44, 218), (w - 44, 218)], fill=INK + (255,), width=4)
    d.text((44 - tl, 236 - tt), title, font=fh, fill=INK + (255,))
    return _arr(im)


def version_tab(text: str, tone_rgb) -> np.ndarray:
    """VERSION A · REUTERS — a folder tab: which telling the picture shows."""
    f = face('caps', 44)
    w = int(f.getlength(text)) + 64
    im = Image.new('RGBA', (w + 14, 92), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.polygon([(10, 88), (24, 10), (w - 10, 10), (w + 4, 88)], fill=INK + (255,))
    d.polygon([(0, 80), (14, 2), (w - 20, 2), (w - 6, 80)], fill=tuple(tone_rgb) + (255,), outline=INK + (255,))
    d.line([(0, 80), (14, 2), (w - 20, 2), (w - 6, 80)], fill=INK + (255,), width=5)
    d.text((32, 16), text, font=f, fill=PAPER + (255,))
    return _arr(im)


def score_card(score: str, label: str, tone_rgb) -> np.ndarray:
    """1–1 · AFTER EXTRA TIME — the score in Ultra on a plate."""
    fs, fc = face('num', 190), face('caps', 40)
    l, t, r, b = fs.getbbox(score)
    w = max(560, r - l + 120, int(fc.getlength(label)) + 100)
    im = _plate(w, 330, tone_rgb, seed=31)
    d = ImageDraw.Draw(im)
    d.text(((w - (r - l)) / 2 - l, 40 - t), score, font=fs, fill=INK + (255,))
    d.line([(40, 250), (w - 40, 250)], fill=INK + (255,), width=4)
    d.text(((w - fc.getlength(label)) / 2, 266), label, font=fc, fill=RED + (255,))
    return _arr(im)


def sources_card(sources: list[dict], width: int = 1720) -> np.ndarray:
    """The case file's sources, numbered, typed on one sheet of paper (paper, not ink: a black card reads as a gap)."""
    ft, fc, fh = face('type', 27), face('caps', 30), face('head', 70)
    asc, desc = ft.getmetrics()
    lh = int((asc + desc) * 1.32)
    maxc = int((width - 140) / ft.getlength('M'))
    lines: list[tuple[str, str]] = []
    for s in sources:
        text = f"{s['title']}"
        first, rest = text[:maxc - 4], text[maxc - 4:]
        if rest:   # one wrap at a word, then cut: a sources card lists, it does not quote
            cut_at = first.rfind(' ')
            first, rest = (first[:cut_at], first[cut_at + 1:] + rest) if cut_at > 20 else (first, rest)
            rest = rest if len(rest) <= maxc - 4 else rest[:maxc - 5] + '…'
        lines.append((f"{s['n']:>2}", first))
        if rest:
            lines.append(('', rest))
    h = 150 + lh * len(lines) + 40
    im = _plate(width, h, None, seed=41)
    d = ImageDraw.Draw(im)
    d.text((48, 26), 'SOURCES', font=fh, fill=INK + (255,))
    d.text((width - 48 - fc.getlength('CASE FILE · ON THE RECORD'), 52), 'CASE FILE · ON THE RECORD', font=fc, fill=RED + (255,))
    d.line([(48, 118), (width - 48, 118)], fill=INK + (255,), width=4)
    y = 140
    for n, ln in lines:
        if n:
            d.text((48, y), n, font=ft, fill=RED + (255,))
        d.text((110, y), ln, font=ft, fill=INK + (255,))
        y += lh
    return _arr(im)


def member_card(club_line: str, tone_rgb) -> np.ndarray:
    """The supporters' card the follow beat asks the viewer to fill in: NAME · CLUB · SINCE, blank lines to write on
    (rule 136). No logo of any platform; the button is ours."""
    fh, fc, ft = face('head', 92), face('caps', 34), face('type', 34)
    w, h = 980, 520
    im = _plate(w, h, tone_rgb, seed=51)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, w - 1, 96], fill=INK + (255,))
    d.text((40, 18), 'SUPPORTERS’ CARD', font=face('caps', 52), fill=PAPER + (255,))
    d.text((w - 40 - fc.getlength(club_line), 32), club_line, font=fc, fill=tuple(tone_rgb) + (255,))
    for i, lab in enumerate(('NAME', 'CLUB', 'SINCE')):
        y = 150 + i * 110
        d.text((40, y), lab, font=fc, fill=RED + (255,))
        d.line([(190, y + 44), (w - 40, y + 44)], fill=INK + (255,), width=3)
    d.text((40, h - 66), 'For the terrace, not the TV.', font=ft, fill=INK + (200,))
    return _arr(im)


def subscribe_button(pressed: bool, tone_rgb) -> np.ndarray:
    """SUBSCRIBE in the tone colour; once pressed, SUBSCRIBED ✓ in ink. Drawn here — never a platform's logo."""
    f = face('caps', 64)
    text = 'SUBSCRIBED' if pressed else 'SUBSCRIBE'
    w = int(f.getlength('SUBSCRIBED')) + 150
    h = 118
    im = Image.new('RGBA', (w + 16, h + 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if not pressed:
        d.rounded_rectangle([14, 14, w + 14, h + 14], radius=20, fill=INK + (255,))
    off = 8 if pressed else 0
    fill = INK if pressed else tuple(tone_rgb)
    d.rounded_rectangle([off, off, w + off, h + off], radius=20, fill=fill + (255,), outline=INK + (255,), width=6)
    tx = off + (w - f.getlength(text) - (52 if pressed else 0)) / 2
    d.text((tx, off + 22), text, font=f, fill=PAPER + (255,))
    if pressed:   # a tick, drawn
        x = tx + f.getlength(text) + 18
        d.line([(x, off + 62), (x + 16, off + 80), (x + 44, off + 38)], fill=PAPER + (255,), width=10, joint='curve')
    return _arr(im)


def end_card(site: str, handle: str, tone_rgb) -> np.ndarray:
    fh, fc = face('head', 96), face('caps', 46)
    w = max(1100, int(fh.getlength(site.upper())) + 120)
    im = _plate(w, 360, tone_rgb, seed=61)
    d = ImageDraw.Draw(im)
    d.text((48, 30), 'MORE FILES', font=fc, fill=RED + (255,))
    d.text((48, 96), site.upper(), font=fh, fill=INK + (255,))
    d.line([(48, 236), (w - 48, 236)], fill=INK + (255,), width=4)
    d.text((48, 258), handle, font=fc, fill=INK + (255,))
    return _arr(im)
