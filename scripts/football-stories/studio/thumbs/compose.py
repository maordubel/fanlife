"""The three looks of a thumbnail, each in 1280×720 and as a 1080×1920 Shorts cover.

* `documentary` — VOX: the picture, a torn newsprint card with the hook set big, the highlighter under the key word,
  the scoreline on the club's colour plate, ONE pen stroke (a loop round the score, an underline, an arrow to the
  figure). The directors keep their flavour: the Broadcaster's score is a TV scorebug, the Terrace is warm paper and a
  supporter, the Trailer Cut is letterboxed with a wide-tracked title.
* `classified` — the case folder on the desk: the evidence photo clipped in, the CLASSIFIED stamp, a redacted line,
  the FILE tab in the tone's colour (LAUGH / WAR / HEART).
* `vlog` — I WAS THERE: the owner's own frame from the stand, a viewfinder, the stamp, the night's scoreline.
"""
from __future__ import annotations

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .render import (INK, NEWS, PAPER, Board, contrast, grade, highlight, line, lum, medallion, paper_card, pen_stroke,
                     plate, readable_on, rotate, shade, split_lines, fit_size, wordmark)


def _inks(pal):
    from ..vox.compose import Ink
    return Ink(pal)


def _key_word(lines: list[str]) -> tuple[int, int]:
    """Which word the highlighter goes under: a number, else the last word of the last line (the payload)."""
    for li, l in enumerate(lines):
        for wi, w in enumerate(l.split()):
            if any(ch.isdigit() for ch in w):
                return li, wi
    return len(lines) - 1, len(lines[-1].split()) - 1


def _word_box(text: str, wi: int, font: str, size: int, x: float, y: float, h: float) -> tuple[float, float, float, float]:
    from .render import face
    f = face(font, size)
    words = text.split()
    pre = ' '.join(words[:wi]) + (' ' if wi else '')
    x0 = x + f.length(pre)
    return (x0, y, x0 + f.length(words[wi]), y + h)


def _figure(B: Board, fig: Image.Image, side: str, top_room: int = 40) -> tuple[int, int, int, int]:
    """A library cut-out standing in front of the picture on the side away from the words, with its ink plate."""
    s = (B.h - top_room) * 0.94 / fig.height
    f = fig.resize((max(1, round(fig.width * s)), max(1, round(fig.height * s))), Image.LANCZOS)
    x = int(B.w * 0.97 - f.width) if side == 'left' else int(B.w * 0.03)
    y = B.h - f.height + 6
    sh = Image.new('RGBA', f.size, INK + (255,))
    sh.putalpha(f.getchannel('A').point(lambda v: int(v * 0.9)))
    B.paste(sh, (x + 12, y + 10))
    B.paste(f, (x, y))
    return (x, y, x + f.width, y + f.height)


def _kicker(B: Board, text: str, x: int, y: int, ink, max_w: int, seed: int = 0) -> tuple[int, int, int, int]:
    size = fit_size('caps', 30, text, max_w - 40)
    im, m = line(text, 'caps', size, ink.on_accent, track=1.5)
    from ..vox.elements import tape_strip
    w, h = im.width + 36, im.height + 22
    p = plate(w, h, ink.accent, shift=7, border=4)
    p, _ = rotate(p, None, -1.2)
    B.paste(p, (x, y))
    B.paste(im, (x + 18, y + 11 + (p.height - h) // 2), m, 'kicker', text, ink.on_accent)
    return (x, y, x + p.width, y + p.height)


def _chip(B: Board, h: dict, ink, cx: int, cy: int, scale: float = 1.0, tilt: float = -4.0) -> tuple[int, int, int, int]:
    """The scoreline on the club's colour plate (Ultra digits, the second plate in ink), the opponent on an ink strip
    under it. Returns the plate's box on the board."""
    size = int(170 * scale)
    on = ink.on_accent
    dig, dm = line(h['chip'], 'ultra', size, on, stroke=int(5 * scale) if lum(on) > 0.5 else 0, stroke_fill=INK)
    lab = h.get('label') or ''
    pw = max(dig.width + int(70 * scale), int(330 * scale))
    ph = dig.height + int(46 * scale)
    card = Image.new('RGBA', (pw + int(40 * scale), ph + int(130 * scale)), (0, 0, 0, 0))
    card.alpha_composite(plate(pw, ph, ink.accent, shift=int(14 * scale), border=int(7 * scale)), (0, 0))
    card.alpha_composite(dig, ((pw - dig.width) // 2, (ph - dig.height) // 2))
    mm = Image.new('L', card.size, 0)
    mm.paste(dm, ((pw - dig.width) // 2, (ph - dig.height) // 2))
    lm = None
    if lab:
        ls = fit_size('caps', int(38 * scale), lab, pw + int(10 * scale))
        li, lm0 = line(lab, 'caps', ls, PAPER, track=1.2)
        sw = li.width + int(28 * scale)
        strip = plate(sw, li.height + int(18 * scale), INK, second=None, border=int(3 * scale))
        sx = (pw - sw) // 2 + int(14 * scale)
        sy = ph + int(4 * scale)
        card.alpha_composite(strip, (sx, sy))
        card.alpha_composite(li, (sx + int(14 * scale), sy + int(9 * scale)))
        lm = Image.new('L', card.size, 0)
        lm.paste(lm0, (sx + int(14 * scale), sy + int(9 * scale)))
    rc, rm = rotate(card, mm, tilt)
    x, y = int(cx - rc.width / 2), int(cy - rc.height / 2)
    B.paste(rc, (x, y), rm, 'chip', h['chip'], ink.on_accent)
    if lm is not None:
        _, rl = rotate(card, lm, tilt)
        B.paste(Image.new('RGBA', rc.size, (0, 0, 0, 0)), (x, y), rl, 'label', lab, PAPER)
    return (x + int(6 * scale), y + int(6 * scale), x + rc.width - int(30 * scale), y + rc.height - int(30 * scale))


def _scorebug(B: Board, h: dict, ink, club: str, cx: int, y: int) -> tuple[int, int, int, int]:
    """The Broadcaster's score: a TV scorebug — club, score, opponent, FT — on dark glass."""
    from ..cinema.gfx import abbr
    a, b = h['chip'].split('–')
    opp = h.get('opponent') or (h.get('label') or '').split(' ', 1)[-1]
    parts = [(abbr(club), 'caps', 76, PAPER, INK), (f'{a}–{b}', 'ultra', 112, ink.on_accent, ink.accent),
             (abbr(opp), 'caps', 76, PAPER, INK), ('FT', 'caps', 56, INK, PAPER)]
    ims = [(line(t, f, s, fg), bg) for t, f, s, fg, bg in parts]
    hgt = 150
    widths = [im.width + 60 for (im, _), _ in ims]
    W = sum(widths)
    bar = Image.new('RGBA', (W + 14, hgt + 14), (0, 0, 0, 0))
    d = ImageDraw.Draw(bar)
    d.rectangle([14, 14, W + 13, hgt + 13], fill=INK + (255,))
    x = 0
    masks = []
    for ((im, m), bg), w in zip(ims, widths):
        d.rectangle([x, 0, x + w - 1, hgt - 1], fill=tuple(bg) + (240,), outline=INK + (255,), width=4)
        bar.alpha_composite(im, (x + (w - im.width) // 2, (hgt - im.height) // 2))
        mm = Image.new('L', bar.size, 0)
        mm.paste(m, (x + (w - im.width) // 2, (hgt - im.height) // 2))
        masks.append(mm)
        x += w
    bx = int(cx - bar.width / 2)
    B.paste(bar, (bx, y), masks[1], 'chip', h['chip'], ink.on_accent)
    return (bx + widths[0], y, bx + widths[0] + widths[1], y + hgt)


def _headline(B: Board, h: dict, ink, x: int, y: int, max_w: int, kind: str, *, n_lines: int = 2, max_size: int = 150,
              seed: int = 0, style: str = 'vox', align: str = 'left', max_h: int = 330) -> dict:
    """The hook set big — the line break that sets it biggest in the box. Returns where each line went (for the pen and
    the highlighter)."""
    from .render import best_lines
    track = 4.0 if style == 'trailer' else 0.0
    lines, size = best_lines(h['headline'], 'head', max_size, max_w - 40, max_h, n_lines, track=track)
    out = {'lines': [], 'size': size, 'box': None}
    if kind == 'score' and style == 'vox':
        fill, stroke, shift, plate_c = INK, 0, 0, INK
    elif kind == 'question':
        fill, stroke, shift, plate_c = PAPER, 0, 0, INK
    else:
        fill, stroke, shift, plate_c = PAPER, 5, 10, ink.accent if lum(ink.accent) < 0.6 else INK
    qcol = ink.accent if contrast(ink.accent, INK) > 2.2 else PAPER
    rendered = []
    for l in lines:
        if kind == 'question' and l.endswith('?') and len(l) > 1:   # the question mark in the club's colour
            a, am = line(l[:-1], 'head', size, fill, stroke=stroke, stroke_fill=INK, shift=shift, plate=plate_c, track=track)
            q, qm = line('?', 'head', size, qcol, stroke=stroke, stroke_fill=INK, shift=shift, plate=plate_c)
            gap = int(size * 0.04)
            im = Image.new('RGBA', (a.width + gap + q.width, max(a.height, q.height)), (0, 0, 0, 0))
            im.alpha_composite(a, (0, im.height - a.height))
            im.alpha_composite(q, (a.width + gap, im.height - q.height))
            m = Image.new('L', im.size, 0)
            m.paste(am, (0, im.height - a.height))
            m.paste(qm, (a.width + gap, im.height - q.height))
            rendered.append((im, m))
        else:
            rendered.append(line(l, 'head', size, fill, stroke=stroke, stroke_fill=INK, shift=shift, plate=plate_c, track=track))
    lh = int(size * 0.9)
    total_h = lh * (len(lines) - 1) + rendered[-1][0].height
    wmax = max(im.width for im, _ in rendered)
    if kind == 'score' and style == 'vox':
        card, pad = paper_card(wmax + 70, total_h + 64, seed + 3, tone=NEWS, tape=2)
        card, _ = rotate(card, None, -1.5)
        B.paste(card, (x - pad - 28, y - pad - 28))
    elif kind == 'question':
        q = plate(wmax + 64, total_h + 50, INK, second=ink.accent if lum(ink.accent) < 0.85 else PAPER, shift=14, border=0)
        B.paste(q, (x - 32, y - 26))
    for i, ((im, m), l) in enumerate(zip(rendered, lines)):
        lx = x if align == 'left' else int(x + (max_w - im.width) / 2)
        ly = y + i * lh
        B.paste(im, (lx, ly), m, 'headline', l, fill)
        out['lines'].append((l, lx, ly, im.width, im.height))
    xs = [a[1] for a in out['lines']]
    out['box'] = (min(xs), y, max(a[1] + a[3] for a in out['lines']), y + total_h)
    return out


def _letterbox(B: Board, bar: int = 74) -> None:
    d = ImageDraw.Draw(B.im)
    d.rectangle([0, 0, B.w, bar], fill=INK + (255,))
    d.rectangle([0, B.h - bar, B.w, B.h], fill=INK + (255,))


def _circle(rect, seed):
    from ..vox.elements import circle_path
    x0, y0, x1, y1 = rect
    return circle_path((x0, y0, x1 - x0, y1 - y0), seed, pad=26)


def _underline(rect, seed):
    from ..vox.elements import underline_path
    x0, y0, x1, y1 = rect
    return underline_path((x0, y0, x1 - x0, y1 - y0), seed, below=6)


def _arrow(a, b, seed):
    from ..vox.elements import arrow_path
    return arrow_path(a, b, seed, bend=0.25)


# ── documentary ───────────────────────────────────────────────────────────────────────────────────────────────────────
def documentary(h: dict, pic, pal, crest_path, director: str | None = None, seed: int = 0, size=(1280, 720)) -> Board:
    B = Board(*size)
    ink = _inks(pal)
    warm = director == 'terrace'
    B.im = grade(pic.image, warm=warm).convert('RGBA')
    side = pic.text_side
    fig_box = None
    if pic.figure is not None:
        fig_box = _figure(B, pic.figure, side)
    shade(B, side, 0.9 if pic.kind not in ('hero',) else 0.55, 0.66 if side == 'left' else 0.5)
    top = 40
    if director == 'trailer':
        _letterbox(B)
        top = 96
    has_chip = h['kind'] == 'score' and h.get('chip') and director != 'broadcaster'
    text_w = int(B.w * ((0.52 if has_chip else 0.6) if side == 'left' else 0.40))
    x0 = 56 if side == 'left' else B.w - text_w - 30
    med = medallion(crest_path, 128)
    if med is not None:
        mx = B.w - med.width - 30 if side == 'left' else 30
        B.paste(med, (mx, top - 10 if director != 'trailer' else B.h - 74 - med.width - 20))
    _kicker(B, h.get('kicker') or '', x0 - 8, top, ink, text_w - (150 if side == 'right' and med is not None else 0), seed)
    kind = h['kind']
    style = 'trailer' if director == 'trailer' else 'vox'
    hy = top + 96
    if kind == 'score' and director == 'broadcaster':
        hl = _headline(B, h, ink, x0, hy, text_w, 'emotion', seed=seed, max_h=B.h - hy - 230)
    else:
        room = (B.h - hy - (100 if director == 'trailer' else 90)) if kind != 'score' or side == 'left' else 300
        hl = _headline(B, h, ink, x0, hy, text_w, kind, seed=seed, style=style,
                       n_lines=3, max_size=170 if side == 'left' else 120, max_h=min(room, 400))
    # the highlighter under the payload word (VOX), on the paper card only
    if kind == 'score' and style == 'vox' and director != 'broadcaster':
        li, wi = _key_word([l[0] for l in hl['lines']])
        l, lx, ly, w, hh = hl['lines'][li]
        if wi < len(l.split()):
            highlight(B, _word_box(l, wi, 'head', hl['size'], lx, ly, hh), ink.hl, seed)
            im, m = line(l, 'head', hl['size'], INK)
            B.paste(im, (lx, ly))   # the ink stays ink over the highlighter
    pen = ink.pen
    stroke = None
    if kind == 'score' and h.get('chip'):
        if director == 'broadcaster':
            box = _scorebug(B, h, ink, pal.club_name, int(B.w * 0.36) if side == 'left' else int(B.w * 0.33), B.h - 232)
        else:
            cx = int(B.w * 0.76) if side == 'left' else int(B.w - text_w / 2 - 30)
            cy = int(B.h * 0.58) if side == 'left' else min(B.h - 150, hl['box'][3] + 150)
            box = _chip(B, h, ink, cx, cy, scale=1.0 if side == 'left' else 0.78)
        stroke = pen_stroke(_circle(box, seed), pen, 11, size=size)
    elif kind == 'emotion':
        l, lx, ly, w, hh = hl['lines'][-1]
        stroke = pen_stroke(_underline((lx, ly, lx + w, ly + hh), seed), pen, 12, size=size)
    elif kind == 'question':
        l, lx, ly, w, hh = hl['lines'][-1]
        if fig_box:
            tgt = ((fig_box[0] + fig_box[2]) / 2, fig_box[1] + (fig_box[3] - fig_box[1]) * 0.22)
        else:
            tgt = (pic.focus[0] * B.w, pic.focus[1] * B.h)
        start = (lx + w + 30, ly + hh * 0.5) if side == 'left' else (lx - 30, ly + hh * 0.5)
        if abs(tgt[0] - start[0]) > 120:
            stroke = pen_stroke(_arrow(start, tgt, seed), pen, 11, head=True, size=size)
    if stroke is not None:
        B.im.alpha_composite(stroke)
    wm, wmm = wordmark(34)
    B.paste(wm, (x0 if side == 'left' else B.w - wm.width - 40, B.h - wm.height - (30 if director != 'trailer' else 90)))
    return B


def documentary_short(h: dict, pic, pal, crest_path, director: str | None = None, seed: int = 0) -> Board:
    """The Shorts cover: the picture over the top two thirds, the hook on torn newsprint under it, the score on the seam."""
    W, H = 1080, 1920
    B = Board(W, H)
    ink = _inks(pal)
    from .art import cover
    top_h = 1240
    pimg = cover(pic.image, (W, top_h), (0.33 if pic.text_side == 'right' else 0.5, 0.45))
    B.im.alpha_composite(grade(pimg, warm=director == 'terrace').convert('RGBA'), (0, 0))
    if pic.figure is not None:
        f = pic.figure
        s = top_h * 0.78 / f.height
        f = f.resize((max(1, round(f.width * s)), max(1, round(f.height * s))), Image.LANCZOS)
        B.paste(f, (W - f.width - 20, top_h - f.height))
    card, pad = paper_card(W + 80, H - top_h + 160, seed + 11, tone=NEWS, tape=0, edges='t')
    B.paste(card, (-40 - pad, top_h - 80 - pad))
    med = medallion(crest_path, 150)
    if med is not None:
        B.paste(med, (W - med.width - 40, 60))
    _kicker(B, h.get('kicker') or '', 40, 70, ink, W - 260)
    kind = h['kind']
    from .render import best_lines
    y0 = top_h + 190 if kind == 'score' and h.get('chip') else top_h + 40
    room = H - 190 - y0
    lines, size = best_lines(h['headline'], 'head', 230, W - 110, room, 3)
    lh = int(size * 0.92)
    y = y0 + max(0, (room - (lh * (len(lines) - 1) + size)) // 2)
    rendered = []
    for i, l in enumerate(lines):
        im, m = line(l, 'head', size, INK)
        lx = (W - im.width) // 2
        B.paste(im, (lx, y + i * lh), m, 'headline', l, INK)
        rendered.append((l, lx, y + i * lh, im.width, im.height))
    pen = ink.pen
    if kind == 'score' and h.get('chip'):
        box = _chip(B, h, ink, W // 2, top_h - 40, scale=1.15)
        B.im.alpha_composite(pen_stroke(_circle(box, seed), pen, 13, size=(W, H)))
    else:
        l, lx, ly, w, hh = rendered[-1]
        B.im.alpha_composite(pen_stroke(_underline((lx, ly, lx + w, ly + hh), seed), pen, 14, size=(W, H)))
    wm, _ = wordmark(52)
    B.paste(wm, ((W - wm.width) // 2, H - wm.height - 70))
    return B


# ── CLASSIFIED ────────────────────────────────────────────────────────────────────────────────────────────────────────
def _tone_rgb(tone_hex: str):
    h = tone_hex.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def classified(h: dict, panel, backdrop, number: str, title: str, tone: str, tone_hex: str, seed: int = 0, size=(1280, 720)) -> Board:
    """The case folder on the desk: the panel clipped in as the evidence photo with the pen's loop on it, the hook big on
    the folder, a redacted line under it, the CLASSIFIED stamp, the FILE tab in the tone's colour."""
    from comic import letter
    W, H = size
    B = Board(W, H)
    tone_rgb = _tone_rgb(tone_hex)
    if backdrop is not None:
        bg = grade(backdrop, punch=1.05)
    elif panel is not None:
        from .art import cover
        bg = cover(panel, size).filter(ImageFilter.GaussianBlur(12))
        bg = Image.blend(bg, Image.new('RGB', size, INK), 0.6)
    else:
        bg = Image.new('RGB', size, INK)
    B.im = bg.convert('RGBA')
    rng = np.random.default_rng(seed)
    # the evidence photo first (the folder overlaps its edge)
    photo_box = None
    if panel is not None:
        from .art import cover
        ph = grade(cover(panel, (520, 380), (0.5, 0.45)), punch=1.1)
        card = Image.new('RGBA', (548, 408), PAPER + (255,))
        card.paste(ph, (14, 14))
        ImageDraw.Draw(card).rectangle([0, 0, 547, 407], outline=INK + (255,), width=5)
        ang = float(rng.uniform(3, 6))
        rc = card.rotate(ang, expand=True, resample=Image.BICUBIC)
        sh = Image.new('RGBA', rc.size, INK + (255,))
        sh.putalpha(rc.getchannel('A'))
        px, py = W - rc.width - 14, 150
        B.paste(sh, (px + 16, py + 16))
        B.paste(rc, (px, py))
        photo_box = (px + 60, py + 60, px + rc.width - 60, py + rc.height - 60)
        d = ImageDraw.Draw(B.im)
        d.rounded_rectangle([px + 40, py - 26, px + 84, py + 80], radius=20, outline=(150, 150, 156, 255), width=8)
    # the folder
    fx0, fy0, fx1, fy1 = 24, 104, 850, 696
    d = ImageDraw.Draw(B.im)
    d.rectangle([fx0 + 16, fy0 + 16, fx1 + 16, fy1 + 16], fill=tone_rgb + (255,))
    d.polygon([(fx0, fy0), (fx0 + 40, fy0 - 62), (fx0 + 330, fy0 - 62), (fx0 + 370, fy0)], fill=NEWS + (255,), outline=INK + (255,))
    d.rectangle([fx0, fy0, fx1, fy1], fill=NEWS + (255,), outline=INK + (255,), width=6)
    fi, fm = line(f'FILE {number}', 'ultra', 42, INK)
    B.paste(fi, (fx0 + 58, fy0 - 54))
    lines = [l.upper() for l in (h.get('lines') or [h['headline']])][:3]
    room = fy1 - fy0 - 230
    size_ = min(min(fit_size('head', 190, l, fx1 - fx0 - 64) for l in lines), int(room / (0.95 * (len(lines) - 1) + 1.05)))
    lh = int(size_ * 0.95)
    y = fy0 + 40 + max(0, (room - lh * (len(lines) - 1) - size_) // 2)
    for i, l in enumerate(lines):
        col = letter.RED if i == len(lines) - 1 else INK
        im, m = line(l, 'head', size_, col, shift=6, plate=tone_rgb)
        B.paste(im, (fx0 + 30, y), m, 'headline', l, col)
        y += lh
    # the redacted line: what the file will not say yet
    ty = min(fy1 - 150, y + 18)
    ti, _ = line('SUBJECT:', 'mono', 30, INK)
    B.paste(ti, (fx0 + 46, ty))
    d = ImageDraw.Draw(B.im)
    xr = fx0 + 60 + ti.width
    for wbar in (150, 96, 190):
        if xr + wbar > fx1 - 40:
            break
        d.rectangle([xr, ty + 4, xr + wbar, ty + 34], fill=INK + (255,))
        xr += wbar + 16
    d.line([(fx0 + 46, fy1 - 100), (fx1 - 46, fy1 - 100)], fill=INK + (255,), width=4)
    ci, _ = line(f'CLASSIFIED · {title}'.upper(), 'caps', fit_size('caps', 44, f'CLASSIFIED · {title}'.upper(), fx1 - fx0 - 100), INK)
    B.paste(ci, (fx0 + 46, fy1 - 82))
    # the pen on the evidence: a red loop round the heart of the photo
    if photo_box:
        cx, cy = (photo_box[0] + photo_box[2]) / 2, (photo_box[1] + photo_box[3]) / 2
        r = (cx - 120, cy - 90, cx + 120, cy + 90)
        B.im.alpha_composite(pen_stroke(_circle(r, seed + 5), letter.RED, 10, size=size))
    st = Image.fromarray(letter.stamp('CLASSIFIED', letter.RED, 116, seed=seed + 7), 'RGBA').rotate(9, expand=True, resample=Image.BICUBIC)
    B.paste(st, (W - st.width - 16, H - st.height - 6))
    tab = Image.fromarray(letter.tone_tab(tone, tone_rgb, f'FILE {number}'), 'RGBA')
    B.paste(tab, (W - tab.width - 40, 24))
    return B


def classified_short(h: dict, panel, backdrop, number: str, title: str, tone: str, tone_hex: str, seed: int = 0) -> Board:
    from comic import letter
    W, H = 1080, 1920
    B = Board(W, H)
    tone_rgb = _tone_rgb(tone_hex)
    from .art import cover
    src = backdrop if backdrop is not None else panel
    bg = cover(src, (W, H)).filter(ImageFilter.GaussianBlur(14)) if src is not None else Image.new('RGB', (W, H), INK)
    B.im = Image.blend(bg, Image.new('RGB', (W, H), INK), 0.55).convert('RGBA')
    d = ImageDraw.Draw(B.im)
    fx0, fy0, fx1, fy1 = 24, 1210, 1050, 1840
    d.rectangle([fx0 + 18, fy0 + 18, fx1 + 18, fy1 + 18], fill=tone_rgb + (255,))
    d.polygon([(fx0, fy0), (fx0 + 50, fy0 - 80), (fx0 + 420, fy0 - 80), (fx0 + 470, fy0)], fill=NEWS + (255,), outline=INK + (255,))
    d.rectangle([fx0, fy0, fx1, fy1], fill=NEWS + (255,), outline=INK + (255,), width=7)
    fi, _ = line(f'FILE {number}', 'ultra', 56, INK)
    B.paste(fi, (fx0 + 70, fy0 - 70))
    if panel is not None:
        ph = grade(cover(panel, (950, 860)), punch=1.1)
        card = Image.new('RGBA', (980, 890), PAPER + (255,))
        card.paste(ph, (15, 15))
        ImageDraw.Draw(card).rectangle([0, 0, 979, 889], outline=INK + (255,), width=6)
        rc = card.rotate(-3, expand=True, resample=Image.BICUBIC)
        B.paste(rc, ((W - rc.width) // 2, 150))
        B.im.alpha_composite(pen_stroke(_circle((W / 2 - 190, 470, W / 2 + 190, 720), seed + 5), letter.RED, 13, size=(W, H)))
    lines = [l.upper() for l in (h.get('lines') or [h['headline']])][:3]
    room = fy1 - fy0 - 200
    size_ = min(min(fit_size('head', 240, l, fx1 - fx0 - 70) for l in lines), int(room / (0.95 * (len(lines) - 1) + 1.05)))
    y = fy0 + 40 + max(0, (room - int(size_ * 0.95) * (len(lines) - 1) - size_) // 2)
    for i, l in enumerate(lines):
        col = letter.RED if i == len(lines) - 1 else INK
        im, m = line(l, 'head', size_, col, shift=7, plate=tone_rgb)
        B.paste(im, (fx0 + 34, y), m, 'headline', l, col)
        y += int(size_ * 0.95)
    st = Image.fromarray(letter.stamp('CLASSIFIED', letter.RED, 150, seed=seed + 7), 'RGBA').rotate(9, expand=True, resample=Image.BICUBIC)
    B.paste(st, (W - st.width - 30, fy1 - st.height + 40))
    tab = Image.fromarray(letter.tone_tab(tone, tone_rgb, f'FILE {number}'), 'RGBA')
    B.paste(tab, ((W - tab.width) // 2, 50))
    return B


# ── I WAS THERE ───────────────────────────────────────────────────────────────────────────────────────────────────────
def _viewfinder(B: Board, inset: int = 28, arm: int = 64) -> None:
    d = ImageDraw.Draw(B.im)
    for (x, y, dx, dy) in ((inset, inset, 1, 1), (B.w - inset, inset, -1, 1), (inset, B.h - inset, 1, -1), (B.w - inset, B.h - inset, -1, -1)):
        d.line([(x, y), (x + arm * dx, y)], fill=PAPER + (255,), width=6)
        d.line([(x, y), (x, y + arm * dy)], fill=PAPER + (255,), width=6)
    ri, _ = line('REC', 'caps', 34, PAPER)
    rx = B.w - inset - 40 - ri.width
    d.ellipse([rx - 40, inset + 32, rx - 14, inset + 58], fill=(232, 40, 40, 255))
    B.paste(ri, (rx, inset + 28))


def vlog(h: dict, frame: Image.Image, pal, crest_path, episode: str, place: str, seed: int = 0, size=(1280, 720)) -> Board:
    from comic import letter
    from .art import cover
    W, H = size
    B = Board(W, H)
    ink = _inks(pal)
    B.im = grade(cover(frame, size, (0.5, 0.62)), punch=1.1).convert("RGBA")
    sh = Image.new('RGBA', size, (0, 0, 0, 0))
    a = np.clip((np.linspace(0, 1, H, dtype='float32') - 0.35) / 0.65, 0, 1) ** 1.2 * 0.9
    sh.putalpha(Image.fromarray((np.tile(a[:, None], (1, W)) * 255).astype('uint8')))
    B.im.alpha_composite(Image.composite(Image.new('RGBA', size, INK + (255,)), sh, sh.getchannel('A')))
    _viewfinder(B)
    stamp_col = ink.accent if ink.accent != INK and contrast(ink.accent, INK) > 2.5 else PAPER
    st = Image.fromarray(letter.stamp('I WAS THERE', stamp_col, 104, seed=seed + 3), 'RGBA').rotate(-6, expand=True, resample=Image.BICUBIC)
    B.paste(st, (40, 40))
    if episode:
        ei, em = line(f'EP.{episode}', 'caps', 40, ink.on_accent)
        p = plate(ei.width + 30, ei.height + 20, ink.accent, shift=8, border=4)
        B.paste(p, (60 + st.width - 30, 70))
        B.paste(ei, (75 + st.width - 30, 80))
    kind = h['kind']
    lines = split_lines(h['headline'], 2)
    max_w = int(W * (0.6 if h.get('chip') else 0.86))
    size_ = min(fit_size('head', 132, l, max_w) for l in lines)
    lh = int(size_ * 0.9)
    y = H - 62 - lh * (len(lines) - 1) - int(size_ * 1.02)
    placed = []
    for i, l in enumerate(lines):
        im, m = line(l, 'head', size_, PAPER, stroke=6, stroke_fill=INK, shift=9, plate=INK)
        B.paste(im, (56, y + i * lh), m, 'headline', l, PAPER)
        placed.append((l, 56, y + i * lh, im.width, im.height))
    if h.get('sub'):
        si, sm = line(h['sub'], 'caps', fit_size('caps', 30, h['sub'], max_w), PAPER)
        B.paste(si, (60, y - si.height - 16))
    pen = ink.pen if ink.pen != INK else PAPER
    if h.get('chip'):
        box = _chip(B, {'chip': h['chip'], 'label': h.get('label')}, ink, int(W * 0.8), int(H * 0.58), scale=0.92)
        if kind in ('score', 'question'):
            B.im.alpha_composite(pen_stroke(_circle(box, seed), pen, 11, size=size))
    if kind == 'emotion' or not h.get('chip'):
        l, lx, ly, w, hh = placed[-1]
        B.im.alpha_composite(pen_stroke(_underline((lx, ly, lx + w, ly + hh), seed), pen, 12, size=size))
    med = medallion(crest_path, 116)
    if med is not None:
        B.paste(med, (W - med.width - 46, 110))
        if place:
            pi, _ = line(place.upper(), 'caps', 24, PAPER)
            pl = plate(pi.width + 20, pi.height + 12, INK, second=None, border=2)
            B.paste(pl, (W - med.width // 2 - 46 - pl.width // 2, 110 + med.height + 6))
            B.paste(pi, (W - med.width // 2 - 46 - pl.width // 2 + 10, 116 + med.height + 6))
    return B


def vlog_short(h: dict, frame: Image.Image, pal, crest_path, episode: str, place: str, seed: int = 0) -> Board:
    from comic import letter
    from .art import cover
    W, H = 1080, 1920
    B = Board(W, H)
    ink = _inks(pal)
    B.im = grade(cover(frame, (W, H), (0.5, 0.45)), punch=1.1).convert('RGBA')
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    a = np.clip((np.linspace(0, 1, H, dtype='float32') - 0.45) / 0.55, 0, 1) ** 1.1 * 0.92
    sh.putalpha(Image.fromarray((np.tile(a[:, None], (1, W)) * 255).astype('uint8')))
    B.im.alpha_composite(Image.composite(Image.new('RGBA', (W, H), INK + (255,)), sh, sh.getchannel('A')))
    _viewfinder(B, 40, 90)
    stamp_col = ink.accent if contrast(ink.accent, INK) > 2.5 else PAPER
    st = Image.fromarray(letter.stamp('I WAS THERE', stamp_col, 140, seed=seed + 3), 'RGBA').rotate(-6, expand=True, resample=Image.BICUBIC)
    B.paste(st, ((W - st.width) // 2, 140))
    lines = split_lines(h['headline'], 3)
    size_ = min(fit_size('head', 180, l, W - 120) for l in lines)
    y = 1380
    for i, l in enumerate(lines):
        im, m = line(l, 'head', size_, PAPER, stroke=7, stroke_fill=INK, shift=10, plate=INK)
        B.paste(im, ((W - im.width) // 2, y + i * int(size_ * 0.9)), m, 'headline', l, PAPER)
    if h.get('chip'):
        box = _chip(B, {'chip': h['chip'], 'label': h.get('label')}, ink, W // 2, 1150, scale=1.2)
        B.im.alpha_composite(pen_stroke(_circle(box, seed), ink.pen if ink.pen != INK else PAPER, 13, size=(W, H)))
    med = medallion(crest_path, 150)
    if med is not None:
        B.paste(med, (W - med.width - 60, 1700 - med.height))
    return B
