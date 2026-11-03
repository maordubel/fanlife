"""I WAS THERE — the documentary layer (owner, 3.11.2026: "more interesting, cooler, animation and movement, a real
story with emotion; take inspiration from The Last Dance").

What a sports documentary does that a matchday diary did not, each one a small, testable piece the film's shots wear:

  · typed()      a dateline typed on in a typewriter face, key by key, with its own key-clicks in the mix —
                 "BLOOMFIELD STADIUM · TEL AVIV / SATURDAY 11 MAY 2024 · 17:42" — the series' way of saying where and when
  · doc_line()   the same voice as a lower line on footage: where we are and the camera's clock, and before kick-off how
                 long is left (counted from the camera's clock to the kick-off on the archive row, never guessed)
  · stat()       one number, counted up to its value and slammed — 25,179 — with its label and its source
  · timeline()   a history drawn as a line: the dates appear one by one, the last one in the club's colour
  · bug()        a score in the corner while the match is on, only from what the archive records for that moment
  · look()       the picture's frame: scope bars on footage, a vignette, and a flashback grade for history (sepia,
                 heavier grain, a projector's flicker)
  · music_bed()  an owner-supplied track (studio/kit/music, each with its licence row) laid under the edit, with a level
                 per beat — it can drop to nothing before a moment and come back after it

Everything is drawn with PIL from the house faces (public/fonts, unpacked once by studio.captions), so nothing here
needs a browser. Positions are fractions of the frame, so the film (16:9) and the reel (9:16) share every piece.
"""
from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import studio.common as C
from studio.captions import _face
from studio.motion import ease_out_cubic

HERE = Path(__file__).resolve().parent
MUSIC = HERE.parent / 'studio' / 'kit' / 'music'
TYPE_FACE = 'courier-prime-latin-700-normal.woff2'
HEAD_FACE = 'weekly-head-latin.woff2'
CAPS_FACE = 'weekly-caps-latin.woff2'
NUM_FACE = 'ultra-latin-400-normal.woff2'
CREAM = (244, 236, 216)
INK = (21, 19, 15)


def _font(file: str, size: int):
    return _face(file, size)[0]


def _rgb(hex_: str) -> tuple[int, int, int]:
    h = hex_.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


# ── typewriter ───────────────────────────────────────────────────────────────────────────────────────────────────────
def typed(lines: list[str], t0: float, *, cps: float = 22.0, at: tuple[float, float] = (0.5, 0.5), size: int = 52,
          align: str = 'center', accent: str | None = None, hold_cursor: bool = True, out_at: float | None = None,
          face: str = TYPE_FACE, gap: float = 0.35, accent_line: int | None = None):
    """Lines typed on one after the other. Returns (overlay, cues): the overlay is shot time → (RGBA, x, y); the cues
    are the key clicks, one per printed character (spaces are silent)."""
    W, H = C.W, C.H
    f = _font(face, size)
    while max(f.getlength(s) for s in lines) + size > 0.94 * W and size > 20:      # never wider than the glass
        size -= 2
        f = _font(face, size)
    asc, desc = f.getmetrics()
    lh = int((asc + desc) * 1.28)
    widths = [f.getlength(s) for s in lines]
    bw = int(max(widths) + size)
    bh = lh * len(lines) + size // 2
    # each line starts when the previous one is finished, plus a breath
    starts, t = [], t0
    for s in lines:
        starts.append(t)
        t += len(s) / cps + gap
    cues = []
    for li, s in enumerate(lines):
        for k, ch in enumerate(s):
            if ch != ' ':
                cues.append((round(starts[li] + k / cps, 3), 'key'))
    cache: dict = {}
    acc = _rgb(accent) if accent else (200, 16, 46)

    def ov(tt: float):
        if tt < t0:
            return None
        alpha = 1.0
        if out_at is not None and tt > out_at:
            alpha = max(0.0, 1 - (tt - out_at) / 0.45)
            if alpha <= 0:
                return None
        shown = []
        for li, s in enumerate(lines):
            n = int(max(0, (tt - starts[li]) * cps))
            shown.append(s[:min(len(s), n)])
        blink = hold_cursor and int(tt * 2.2) % 2 == 0
        cur_line = max([i for i, s in enumerate(lines) if tt >= starts[i]] or [0])
        key = (tuple(shown), blink, round(alpha, 2))
        if key in cache:
            im = cache[key]
        else:
            im = Image.new('RGBA', (bw, bh), (0, 0, 0, 0))
            d = ImageDraw.Draw(im)
            for li, s in enumerate(shown):
                full = widths[li]
                x = (bw - full) / 2 if align == 'center' else size / 4
                col = acc if li == accent_line else CREAM
                d.text((x + 3, li * lh + 3), s, font=f, fill=(0, 0, 0, 170))
                d.text((x, li * lh), s, font=f, fill=col)
                if li == cur_line and blink and len(s) <= len(lines[li]):
                    cx = x + f.getlength(s) + 4
                    d.rectangle([cx, li * lh + asc * 0.15, cx + size * 0.5, li * lh + asc + 2], fill=acc)
            if alpha < 1:
                im.putalpha(im.getchannel('A').point(lambda v: int(v * alpha)))
            if len(cache) > 400:
                cache.clear()
            cache[key] = im
        x = int(at[0] * W - (bw / 2 if align == 'center' else 0))
        y = int(at[1] * H - bh / 2)
        return im, x, y
    return ov, cues


def doc_line(place: str, clock: str | None, kickoff: str | None, t0: float = 0.25, accent: str | None = None):
    """Top-left, on footage: WHERE · the camera's own clock · and, before kick-off, how long is left."""
    line2 = clock or ''
    if clock and kickoff:
        hc, mc = map(int, clock.split(':')[:2])
        hk, mk = map(int, kickoff.split(':'))
        left = (hk * 60 + mk) - (hc * 60 + mc)
        if 0 < left <= 180:
            line2 = f"{clock}  ·  KICK-OFF IN {left // 60}:{left % 60:02d}" if left >= 60 else f"{clock}  ·  KICK-OFF IN {left} MIN"
    lines = [place.upper()] + ([line2] if line2 else [])
    sz = 40 if C.W > C.H else 42
    ov, cues = typed(lines, t0, cps=30, at=(0.04, 0.125 if C.W > C.H else 0.165), size=sz, align='left',
                     accent=accent, hold_cursor=False, accent_line=1 if len(lines) > 1 else None, gap=0.15)
    return ov, cues


# ── the number ───────────────────────────────────────────────────────────────────────────────────────────────────────
def stat(value: int, label: str, t0: float = 0.3, *, source: str | None = None, prefix: str = '', suffix: str = '',
         accent: str = '#C8102E', at: tuple[float, float] = (0.5, 0.46), count: float = 1.5):
    """A number counting up to its value, then slammed (a scale kick), its label under it, the source small."""
    W, H = C.W, C.H
    big = 230 if W > H else 210
    fnum = _font(NUM_FACE, big)
    while fnum.getlength(f'{prefix}{value:,}{suffix}') * 1.37 + 90 > 0.94 * W and big > 60:
        big -= 6
        fnum = _font(NUM_FACE, big)
    flab = _font(CAPS_FACE, 54 if W > H else 58)
    fsrc = _font(TYPE_FACE, 24)
    acc = _rgb(accent)
    final = f'{prefix}{value:,}{suffix}'
    cache: dict = {}

    def ov(tt: float):
        if tt < t0:
            return None
        k = min(1.0, (tt - t0) / count)
        v = int(round(value * ease_out_cubic(k)))
        txt = f'{prefix}{v:,}{suffix}'
        landed = k >= 1.0
        kick = 1.0
        if landed:
            dt_ = tt - t0 - count
            kick = 1 + 0.10 * math.exp(-dt_ * 9) * math.cos(dt_ * 22)
        lab_a = min(1.0, max(0.0, (tt - t0 - count + 0.1) / 0.35))
        key = (txt, round(kick, 3), round(lab_a, 2))
        if key in cache:
            return cache[key]
        tw = fnum.getlength(final)
        cw, ch = int(tw * 1.25 + 80), int(big * 2.3)
        im = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        x = (cw - fnum.getlength(txt)) / 2
        d.text((x + 8, 10 + 8), txt, font=fnum, fill=INK + (255,))        # the second plate, offset in ink
        d.text((x, 10), txt, font=fnum, fill=acc + (255,) if landed else CREAM + (255,))
        if lab_a > 0:
            lw = flab.getlength(label)
            ly = int(big * 1.32)
            d.rectangle([(cw - lw) / 2 - 18, ly - 6, (cw + lw) / 2 + 18, ly + 66], fill=CREAM + (int(255 * lab_a),))
            d.text(((cw - lw) / 2, ly), label, font=flab, fill=INK + (int(255 * lab_a),))
            if source:
                sw = fsrc.getlength(source)
                d.text(((cw - sw) / 2, ly + 92), source, font=fsrc, fill=CREAM + (int(200 * lab_a),))
        if abs(kick - 1) > 1e-3:
            im = im.resize((int(cw * kick), int(ch * kick)), Image.BICUBIC)
        r = (im, max(0, int(at[0] * W - im.width / 2)), max(0, int(at[1] * H - im.height / 2)))
        if len(cache) > 300:
            cache.clear()
        cache[key] = r
        return r
    return ov, [(t0, 'tick'), (t0 + count, 'boom')]


# ── a history drawn as a line ────────────────────────────────────────────────────────────────────────────────────────
def timeline(points: list[dict], t0: float = 0.4, step: float = 1.1, accent: str = '#C8102E', title: str = ''):
    """points: [{'date': '1988/89', 'text': 'Relegated'}, …]; the last point is drawn in the accent and pulses."""
    W, H = C.W, C.H
    tall = H > W
    fd = _font(NUM_FACE, 86 if not tall else 78)
    ft = _font(CAPS_FACE, 40 if not tall else 44)
    fh = _font(TYPE_FACE, 40)
    acc = _rgb(accent)
    n = len(points)
    cache: dict = {}

    def pos(i):
        if tall:
            return W * 0.22, H * (0.30 + 0.42 * i / max(1, n - 1))
        return W * (0.16 + 0.68 * i / max(1, n - 1)), H * 0.50

    def ov(tt: float):
        if tt < t0 - 0.3:
            return None
        line_k = min(1.0, max(0.0, (tt - t0) / (step * max(1, n - 1) + 0.4)))
        shown = sum(1 for i in range(n) if tt >= t0 + i * step)
        pulse = 0.5 + 0.5 * math.sin(tt * 5.5) if shown == n else 0
        key = (round(line_k, 3), shown, round(pulse, 2), int(tt * 10) if title else 0)
        if key in cache:
            return cache[key]
        im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        a, b = pos(0), pos(n - 1)
        if tall:
            d.line([a[0], a[1], a[0], a[1] + (b[1] - a[1]) * line_k], fill=CREAM + (220,), width=6)
        else:
            d.line([a[0], a[1], a[0] + (b[0] - a[0]) * line_k, a[1]], fill=CREAM + (220,), width=6)
        for i in range(shown):
            x, y = pos(i)
            last = i == n - 1
            r = 22 + (8 * pulse if last else 0)
            col = acc if last else CREAM
            d.ellipse([x - r, y - r, x + r, y + r], fill=col + (255,), outline=INK + (255,), width=4)
            dt_ = points[i]['date']
            tx = points[i].get('text', '')
            if tall:
                d.text((x + 60, y - 70), dt_, font=fd, fill=col + (255,))
                d.text((x + 64, y + 26), tx, font=ft, fill=CREAM + (255,))
            else:
                dw = fd.getlength(dt_)
                d.text((x - dw / 2, y - 150), dt_, font=fd, fill=col + (255,))
                tw = ft.getlength(tx)
                d.text((x - tw / 2, y + 52), tx, font=ft, fill=CREAM + (255,))
        if title:
            tw = fh.getlength(title)
            d.text(((W - tw) / 2, H * (0.16 if tall else 0.17)), title, font=fh, fill=CREAM + (235,))
        r = (im, 0, 0)
        if len(cache) > 200:
            cache.clear()
        cache[key] = r
        return r
    cues = [(t0 + i * step, 'boom' if i == n - 1 else 'tick') for i in range(n)]
    return ov, cues


# ── the score in the corner ──────────────────────────────────────────────────────────────────────────────────────────
@lru_cache(maxsize=32)
def _bug_img(home: str, away: str, score: str, accent: str, tall: bool) -> Image.Image:
    f = _font(CAPS_FACE, 40 if not tall else 46)
    fn = _font(NUM_FACE, 44 if not tall else 50)
    pad = 18
    hw, aw, sw = f.getlength(home), f.getlength(away), fn.getlength(score)
    w = int(hw + aw + sw + pad * 6)
    h = 70 if not tall else 80
    im = Image.new('RGBA', (w + 6, h + 6), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([6, 6, w + 6, h + 6], fill=INK + (255,))
    d.rectangle([0, 0, w, h], fill=CREAM + (255,))
    x = pad
    d.text((x, (h - 44) / 2), home, font=f, fill=INK + (255,))
    x += hw + pad
    d.rectangle([x, 0, x + sw + pad * 2, h], fill=_rgb(accent) + (255,))
    d.text((x + pad, (h - 54) / 2), score, font=fn, fill=CREAM + (255,))
    x += sw + pad * 3
    d.text((x, (h - 44) / 2), away, font=f, fill=INK + (255,))
    return im


def bug(home: str, away: str, score: str, accent: str):
    W, H = C.W, C.H
    tall = H > W
    im = _bug_img(home, away, score, accent, tall)
    x = int(W - im.width - (70 if not tall else 60))
    y = int(H * (0.07 if not tall else 0.15))

    def ov(tt: float):
        k = ease_out_cubic(min(1.0, tt / 0.35))
        if k <= 0:
            return None
        return im, x + int((1 - k) * 260), y
    return ov


# ── the picture's frame ──────────────────────────────────────────────────────────────────────────────────────────────
_VIG: dict = {}


def _vignette(w: int, h: int, amount: float) -> np.ndarray:
    key = (w, h, amount)
    if key not in _VIG:
        ys, xs = np.mgrid[0:h, 0:w].astype('float32')
        r = np.sqrt(((xs - w / 2) / (w / 2)) ** 2 + ((ys - h / 2) / (h / 2)) ** 2) / math.sqrt(2)
        _VIG[key] = (1 - amount * np.clip(r - 0.35, 0, 1) ** 1.6 / 0.65 ** 1.6)[..., None].astype('float32')
    return _VIG[key]


def look(fr: np.ndarray, i: int, *, scope: int = 0, vignette: float = 0.0, flashback: bool = False,
         scope_k: float = 1.0) -> np.ndarray:
    """Applied to a finished frame. scope = bar height in px (eased in by scope_k); flashback = sepia + flicker."""
    out = fr
    if flashback:
        f = fr.astype('float32')
        lum = f @ np.array([0.299, 0.587, 0.114], 'float32')
        sep = np.stack([lum * 1.07 + 10, lum * 0.94 + 4, lum * 0.78 - 6], -1)
        flick = 1 + 0.035 * math.sin(i * 1.7) + 0.02 * math.sin(i * 0.37)
        rng = np.random.default_rng(i // 2)
        noise = rng.normal(0, 7, lum.shape)[..., None]
        out = np.clip(sep * flick + noise, 0, 255).astype('uint8')
    if vignette > 0:
        h, w = out.shape[:2]
        out = np.clip(out.astype('float32') * _vignette(w, h, vignette), 0, 255).astype('uint8')
    if scope > 0 and scope_k > 0:
        b = int(scope * scope_k)
        if b > 0:
            out = out.copy()
            out[:b] = 0
            out[-b:] = 0
    return out


# ── sound ────────────────────────────────────────────────────────────────────────────────────────────────────────────
def key_click(rng, sr: int) -> np.ndarray:
    n = int(0.045 * sr)
    t = np.arange(n) / sr
    hit = rng.normal(0, 1, n) * np.exp(-t * 260) * 0.55
    body = np.sin(2 * np.pi * (1900 + rng.uniform(-200, 200)) * t) * np.exp(-t * 180) * 0.25
    return (hit + body).astype('float32') * rng.uniform(0.6, 1.0)


def boom(sr: int) -> np.ndarray:
    n = int(1.6 * sr)
    t = np.arange(n) / sr
    sub = np.sin(2 * np.pi * (38 + 40 * np.exp(-t * 6)) * t) * np.exp(-t * 2.4)
    rng = np.random.default_rng(3)
    air = rng.normal(0, 1, n) * np.exp(-t * 9) * 0.12
    return ((sub + air) * 0.9).astype('float32')


def tick(sr: int) -> np.ndarray:
    n = int(0.09 * sr)
    t = np.arange(n) / sr
    return (np.sin(2 * np.pi * 1200 * t) * np.exp(-t * 90) * 0.3).astype('float32')


def heart(sr: int) -> np.ndarray:
    n = int(0.9 * sr)
    t = np.arange(n) / sr
    beat = lambda t0: np.where(t >= t0, np.sin(2 * np.pi * 52 * (t - t0)) * np.exp(-(t - t0) * 16), 0)  # noqa: E731
    return ((beat(0) + 0.7 * beat(0.26)) * 0.9).astype('float32')


def music_bed(spec: dict, plan: list[dict], total: float, sr: int, read_audio) -> np.ndarray:
    """The owner's track under the edit. spec = {'track': key, 'gain': 0..1, 'offset': s}; each beat may carry
    'level' (0..1, default 1) — the bed follows it with 0.9 s ramps, so a drop to 0 before a moment is a held breath,
    not a cut."""
    idx = json.loads((MUSIC / 'index.json').read_text())
    tr = next(t for t in idx['tracks'] if spec['track'] in (t.get('id'), t.get('key')))
    a = read_audio(MUSIC / tr['file'], spec.get('offset', 0))
    if not len(a):
        return np.zeros(int(total * sr), np.float32)
    rms = float(np.sqrt(np.mean(a ** 2))) or 1e-6
    a = a * (10 ** (-24 / 20) / rms)                    # every track starts from the same loudness
    n = int(total * sr)
    if len(a) < n:                                      # a short track loops with a two-second crossfade
        x = int(2 * sr)
        out = a.copy()
        while len(out) < n:
            fade = np.linspace(0, 1, x, dtype=np.float32)
            out[-x:] = out[-x:] * (1 - fade) + a[:x] * fade
            out = np.concatenate([out, a[x:]])
        a = out
    a = a[:n]
    lev = np.ones(n, np.float32)
    for p in plan:
        lvl = p.get('level', 1.0)
        i0, i1 = int(p['start'] * sr), int((p['start'] + p['dur']) * sr)
        lev[i0:i1] = lvl
    k = int(0.9 * sr)
    ker = np.ones(k, np.float32) / k
    lev = np.convolve(lev, ker, 'same')
    fo = int(3.0 * sr)
    lev[-fo:] *= np.linspace(1, 0, fo)
    return (a * lev * spec.get('gain', 0.6)).astype(np.float32)


def art_path(key: str) -> Path:
    """iwt-art:<set>/<slug> · life:<name> · beat:<set>/<slug> · public:<path>"""
    kind, rest = key.split(':', 1)
    if kind == 'iwt-art':
        return HERE / 'art' / f'{rest}.webp'
    if kind == 'life':
        return C.ROOT / 'public' / 'life' / 'art' / f'{rest}.webp'
    if kind == 'beat':
        return HERE.parent / 'studio' / 'kit' / 'beats' / f'{rest}.webp'
    if kind == 'public':
        return C.ROOT / 'public' / rest
    raise ValueError(key)


FACES = {'type': TYPE_FACE, 'head': HEAD_FACE, 'caps': CAPS_FACE, 'num': NUM_FACE}


def prop_card(spec: dict, accent: str) -> Image.Image:
    """An owner prop (a blank scoreboard, a blank ticket) with OUR type printed on it, so the words move with it.
    spec = {'art': key, 'w': frac of frame width, 'texts': [{'t', 'x', 'y' (fractions of the prop), 'size', 'face',
    'color': 'ink'|'cream'|'accent', 'anchor': 'mm'}]}"""
    im = Image.open(art_path(spec['art'])).convert('RGBA')
    box = im.getchannel('A').getbbox()
    im = im.crop(box) if box else im
    w = int(spec.get('w', 0.6) * C.W)
    im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    cols = {'ink': INK, 'cream': CREAM, 'accent': _rgb(accent)}
    for t in spec.get('texts', []):
        f = _font(FACES[t.get('face', 'head')], int(t.get('size', 60) * w / 1000))
        d.text((t['x'] * im.width, t['y'] * im.height), t['t'], font=f, fill=cols[t.get('color', 'ink')] + (255,),
               anchor=t.get('anchor', 'mm'))
    return im
