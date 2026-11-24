"""The FanLife Gazette cover — the channel's own thumbnail (owner, 24.11.2026: "titles and preview pictures that are
different, special and ours, that don't look like all of YouTube and the current trend … the cover picture preferably
from a picture I upload, connected directly to the script through the picture").

Not a face with an arrow and a red circle: a newspaper front page in miniature, the film's own first frame. The masthead,
the line the film says over the picture set as the headline (the narrator's own words — studio/docu/press.headline),
the owner's picture pasted as a print with tape and a bold outline on a disc of the club's colour, the number in the
headline ringed by hand. The same picture opens the film on its front page (docu/press.front_page), so the cover, the
first frame and the script are one thing.

    owner_cover(ledger, plan) → {key, image, line, claims, n} | None    the owner's picture and the line it accompanies
    front(hook, picture, pal, crest, seed) → Board                     1280×720
"""
from __future__ import annotations

import random
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

from .render import INK, Board, fit_size, line, medallion, pen_stroke, wordmark

PAPER_TEX = Path(__file__).resolve().parents[1] / 'kit' / 'press' / 'paper.webp'
WHITE = (247, 241, 227)
MAST = 'THE FANLIFE GAZETTE'


def _inks(pal):
    from ..vox.compose import Ink
    return Ink(pal)


def owner_picture(key: str) -> Path | None:
    from ..paper import beat_path
    from ..owner_media import poster_path
    return beat_path(key) or poster_path(key)


def owner_cover(ledger: dict, plan: dict | None) -> dict | None:
    """The first of the owner's pictures (or clips) the film puts under a spoken line, and that line; else the first
    one the owner chose, with no line. None when the owner chose nothing."""
    owned = {a['key'] for a in ledger.get('media_assets') or [] if a.get('required') and not a.get('archive')}
    if not owned:
        return None
    rows = [s for s in (plan or {}).get('shots') or [] if s.get('required_asset') in owned]
    pick = next((s for s in rows if str(s.get('narration') or '').strip()), rows[0] if rows else None)
    key = pick['required_asset'] if pick else sorted(owned)[0]
    path = owner_picture(key)
    if path is None:
        return None
    with Image.open(path) as im:
        image = ImageOps.exif_transpose(im).convert('RGB')
    return {'key': key, 'image': image, 'line': str((pick or {}).get('narration') or '').strip(),
            'claims': list((pick or {}).get('claim_ids') or []), 'n': (pick or {}).get('n')}


def head_of(line_text: str) -> list[str]:
    from ..docu.press import headline
    first = re.split(r'(?<=[.!?])\s+', line_text.strip())[0] if line_text.strip() else ''
    return headline(first)[0][:3] if first else []


def _cover(im: Image.Image, w: int, h: int) -> Image.Image:
    return ImageOps.fit(im, (w, h), Image.LANCZOS, centering=(0.5, 0.42))


BRAND = Path(__file__).resolve().parents[4] / 'public' / 'brand' / 'fanlife' / 'logo-192.png'


def _roundel(d: int) -> Image.Image | None:
    if not BRAND.exists():
        return None
    with Image.open(BRAND) as im:
        return im.convert('RGBA').resize((d, d), Image.LANCZOS)


def _paper(size) -> Image.Image:
    if PAPER_TEX.exists():
        with Image.open(PAPER_TEX) as p:
            return _cover(p.convert('RGB'), *size).convert('RGBA')
    return Image.new('RGBA', size, (241, 232, 211, 255))


def _print(pic: Image.Image, w: int, h: int, rg: random.Random, deg: float) -> Image.Image:
    """The picture as a pasted print: white border, a bold ink outline, a hard paper shadow, two strips of tape."""
    b, o, sh = 14, 6, 16
    body = Image.new('RGBA', (w + 2 * (b + o), h + 2 * (b + o)), INK + (255,))
    ImageDraw.Draw(body).rectangle([o, o, body.width - o - 1, body.height - o - 1], fill=WHITE + (255,))
    body.paste(_cover(pic, w, h), (b + o, b + o))
    tape = Image.new('RGBA', (150, 40), (236, 226, 198, 225))
    canvas = Image.new('RGBA', (body.width + 120, body.height + 120), (0, 0, 0, 0))
    canvas.alpha_composite(body, (60, 60))
    for tx, ty in ((-30, -14), (body.width - 120, body.height - 30)):
        t = tape.rotate(-32 + rg.uniform(-5, 5), expand=True, resample=Image.BICUBIC)
        canvas.alpha_composite(t, (max(0, 60 + tx), max(0, 60 + ty)))
    body = canvas.crop(canvas.getbbox())
    shadow = Image.new('RGBA', (body.width + sh, body.height + sh), (0, 0, 0, 0))
    a = body.getchannel('A').point(lambda v: int(v * 0.42))
    shadow.paste(Image.new('RGBA', body.size, INK + (255,)), (sh, sh), a)
    shadow.alpha_composite(body, (0, 0))
    return shadow.rotate(deg, expand=True, resample=Image.BICUBIC)


def _pack(words: list[str], width: float, height: float, top: int = 176, most: int = 4) -> tuple[int, list[list[str]]]:
    """The biggest size at which the words, in order, fill at most `most` lines of `width` and `height`."""
    from .render import face
    for size in range(top, 40, -4):
        f = face('ultra', size)
        rows, cur = [], []
        for w in words:
            if cur and f.length(' '.join(cur + [w])) > width:
                rows.append(cur)
                cur = [w]
            else:
                cur.append(w)
        rows.append(cur)
        if len(rows) <= most and len(rows) * size * 0.94 <= height and all(f.length(' '.join(r)) <= width for r in rows):
            return size, rows
    return 40, [words]


def front(h: dict, pic: Image.Image, pal, crest_path, seed: int = 0, size=(1280, 720), club: str = '') -> Board:
    """`h`: {lines (the headline, ≤ 3), kicker}. The page in miniature (see the module)."""
    W, H = size
    rg = random.Random(f'gz|{seed}')
    ink = _inks(pal)
    B = Board(W, H, im=_paper(size))
    d = ImageDraw.Draw(B.im)
    # the masthead: a heavy rule, the name, a double rule
    d.rectangle([34, 22, W - 34, 30], fill=INK)
    mast, mm = line(MAST, 'ultra', 50, INK)
    logo = _roundel(58)
    mx = (W - mast.width - (logo.width + 14 if logo else 0)) // 2
    if logo:   # the FanLife roundel beside the name (rule two-logos)
        B.paste(logo, (mx, 36))
        mx += logo.width + 14
    B.paste(mast, (mx, 40))
    side = f'{club.upper()} EDITION' if club else 'FOOTBALL STORIES'
    for txt, x_of in ((side, lambda w: 40), ('FOOTBALL. FOREVER.', lambda w: W - 40 - w)):
        im, _ = line(txt, 'caps', 18, INK, track=2.5)
        B.paste(im, (x_of(im.width), 58))
    d.rectangle([34, 106, W - 34, 110], fill=INK)
    d.rectangle([34, 116, W - 34, 118], fill=INK)
    # the disc of the club's colour, and the print on it
    disc = Image.new('RGBA', (560, 560), (0, 0, 0, 0))
    ImageDraw.Draw(disc).ellipse([0, 0, 559, 559], fill=tuple(ink.accent) + (255,))
    B.paste(disc, (W - 520, H - 430))
    pr = _print(pic, 400, 290, rg, rg.uniform(-4.5, -1.5))   # small enough that the headline reads at YouTube's smallest size
    B.paste(pr, (W - pr.width - 18, 200))
    # the headline: the film's own line, word by word, as big as the left column holds it (≤ 4 lines)
    words = ' '.join(x.upper() for x in (h.get('lines') or [])).split() or ['FOOTBALL', 'STORIES']
    col = W - pr.width - 18 - 44 - 18
    from .render import face
    size_h, rows = _pack(words, col, 500, top=190)
    f = face('ultra', size_h)
    gap = f.length(' ')
    y, ring = 140, None
    for row in rows:
        x = 44
        for w in row:
            hot = bool(re.search(r'\d', w))   # the number in the club's colour, ringed by hand
            im, m = line(w, 'ultra', size_h, tuple(ink.accent) if hot else INK)
            box = B.paste(im, (int(x), y), m, role='headline', text=w, fill=tuple(ink.accent) if hot else INK)
            if hot and ring is None:
                ring = box
            x = box[2] + gap
        y += int(size_h * 0.94)
    if ring:
        import math
        x0, y0, x1, y1 = ring
        cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + 30, (y1 - y0) / 2 + 22
        pts = [(cx + rx * math.cos(a) + rg.uniform(-3, 3), cy + ry * math.sin(a) + rg.uniform(-3, 3))
               for a in [math.radians(-160 + k * 7.6) for k in range(52)]]
        B.im.alpha_composite(pen_stroke(pts, INK, 9, size=size))
    y = y - int(size_h * 0.94) + size_h
    # the kicker plate under the headline
    kick = (h.get('kicker') or '').upper()[:40]
    if kick:
        im, _ = line(kick, 'caps', fit_size('caps', 30, kick, col - 60), tuple(ink.on_accent), track=2)
        plate = Image.new('RGBA', (im.width + 40, im.height + 22), tuple(ink.accent) + (255,))
        plate.alpha_composite(im, (20, 11))
        B.paste(plate, (44, min(H - 130, y + 18)))
    # the columns under it all: a few lines of mono type, the texture of a page (no words to read)
    for k in range(3):
        yy = H - 86 + k * 14
        d.rectangle([44, yy, 44 + rg.randint(300, col - 40), yy + 5], fill=INK + (90,))
    med = medallion(crest_path, 96)
    if med is not None:   # the club's crest pinned to the print's corner
        B.paste(med, (W - pr.width - 2, 168))
    wm, _ = wordmark(28)
    B.paste(wm, (44, H - wm.height - 22))
    return B
