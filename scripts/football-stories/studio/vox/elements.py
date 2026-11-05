"""The pieces that live on the Vox board: paper cards with torn edges and soft shadows, kinetic words, typewriter lines,
hand-drawn marker strokes that draw themselves, highlighter swipes, odometer counters, flip digits, line charts that
draw with their tip, pins that drop.

Every element is positioned in PANEL units (a panel is 1920×1080, the screen at zoom 1) and drawn into the panel canvas
at `res` pixels per unit. `pieces(t, cv)` returns what to paste at shot time t: a list of (RGBA image, x, y) in canvas
pixels, optionally with a blend mode ('multiply' for a highlighter, so the ink printed under it stays ink). `settle` is
the time after which an element never changes again: the renderer bakes it into the canvas and stops redrawing it.
Everything is deterministic — the same shot draws the same pixels in any worker.
"""
from __future__ import annotations

import hashlib
import math
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from ..motion import Pose, clamp, ease_in_out, ease_out_back, ease_out_cubic, transformed
from ..cinema.type import face, text

INK = (21, 19, 15)
PAPER = (255, 251, 242)
NEWS = (244, 236, 216)


def hsh(*a) -> int:
    return int(hashlib.sha256(':'.join(str(x) for x in a).encode()).hexdigest()[:8], 16)


def ease_io3(x: float) -> float:
    x = clamp(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def rot_pt(cx: float, cy: float, dx: float, dy: float, deg: float) -> tuple[float, float]:
    """A point at offset (dx, dy) from (cx, cy) on a piece of paper turned `deg` degrees (counter-clockwise, as PIL)."""
    a = math.radians(-deg)
    return cx + dx * math.cos(a) - dy * math.sin(a), cy + dx * math.sin(a) + dy * math.cos(a)


class Canvas:
    """Panel units → canvas pixels. The canvas reaches `m` units outside the panel on every side."""

    def __init__(self, res: float, m: float = 320):
        self.res, self.m = res, m

    def px(self, v: float) -> float:
        return (v + self.m) * self.res

    @property
    def size(self) -> tuple[int, int]:
        return int((1920 + 2 * self.m) * self.res), int((1080 + 2 * self.m) * self.res)


class El:
    z = 50
    layer = 'board'      # 'board' (on the paper, 1.0) or 'near' (a cut-out in front, moves faster than the board)
    kind = 'misc'        # 'data' | 'cutout' | 'annotation' | 'text' | 'photo' | 'decor'
    rect: tuple[float, float, float, float] | None = None   # resting box in panel units (x, y, w, h)
    settle = 0.0
    t0 = 0.0

    def pieces(self, t: float, cv: Canvas) -> list:
        return []


def tline(s: str, font: str, px: int, fill, *, plate=None, shift: int = 0, max_w: float | None = None) -> Image.Image:
    """One line of type on its own baseline: the image is the full line height (ascent + descent), cropped only left
    and right — so words set one by one sit on one line, and a highlighter knows how tall a line is."""
    from ..cinema.type import fitted
    f = fitted(font, px, s, max_w) if max_w else face(font, px)
    asc, desc = f.metrics()
    pad = 4
    w = int(f.length(s)) + pad * 2 + shift
    im = Image.new('RGBA', (max(1, w), asc + desc + pad * 2 + shift), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if shift:
        f.draw(d, (pad + shift, pad + shift), s, plate or (21, 19, 15, 255))
    f.draw(d, (pad, pad), s, fill)
    bb = im.getbbox()
    if bb:
        im = im.crop((bb[0], 0, bb[2], im.height))
    return im


# ------------------------------------------------------------------ paper
@lru_cache(maxsize=64)
def _fibre(w: int, h: int, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    small = rng.random((max(2, h // 40), max(2, w // 40))).astype('float32')
    lo = np.asarray(Image.fromarray((small * 255).astype('uint8')).resize((w, h), Image.BICUBIC), 'float32') / 255
    fine = rng.normal(0, 1, (h, w)).astype('float32')
    return (lo - 0.5) * 18 + fine * 3.2


def torn_mask(w: int, h: int, seed: int, edges: str = 'tblr', depth: float = 9.0) -> Image.Image:
    """A paper cut-out's alpha: straight where a blade cut it, ragged where it was torn (`edges` names the torn sides)."""
    rng = np.random.default_rng(seed)
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)

    def rag(n):
        x = np.cumsum(rng.normal(0, 1, n)).astype('float32')
        x = np.convolve(x, np.ones(5) / 5, 'same')
        x = x - x.min()
        x = x / max(1e-3, x.max()) * depth
        return x + rng.random(n) * 2.2
    pts = []
    step = 6
    top = rag(w // step + 2) if 't' in edges else np.zeros(w // step + 2)
    right = rag(h // step + 2) if 'r' in edges else np.zeros(h // step + 2)
    bot = rag(w // step + 2) if 'b' in edges else np.zeros(w // step + 2)
    left = rag(h // step + 2) if 'l' in edges else np.zeros(h // step + 2)
    for i, x in enumerate(range(0, w, step)):
        pts.append((x, top[i]))
    for i, y in enumerate(range(0, h, step)):
        pts.append((w - 1 - right[i], y))
    for i, x in enumerate(range(w - 1, -1, -step)):
        pts.append((x, h - 1 - bot[i]))
    for i, y in enumerate(range(h - 1, -1, -step)):
        pts.append((left[i], y))
    d.polygon(pts, fill=255)
    return m


def tape_strip(w: int, seed: int, res: float) -> Image.Image:
    rng = np.random.default_rng(seed)
    W_, H_ = int(w * res), int(44 * res)
    im = Image.new('RGBA', (W_, H_), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pts = [(0, int(rng.integers(0, 5) * res))] + [(x, int(rng.integers(0, 6) * res)) for x in range(int(10 * res), W_, int(10 * res))] + \
          [(W_, 2), (W_, H_ - 2)] + [(x, H_ - int(rng.integers(1, 7) * res)) for x in range(W_ - int(10 * res), 0, -int(10 * res))] + [(0, H_ - 3)]
    d.polygon(pts, fill=(238, 230, 210, 165))
    return im


def paper(w: float, h: float, res: float, seed: int, tone=NEWS, edges: str = 'tblr', shadow: bool = True,
          tape: int = 0, border: tuple | None = None, halftone: bool = False) -> tuple[Image.Image, float]:
    """A card of newsprint (or any tone) w×h units: fibres, torn sides, a soft drop shadow, tape on the corners.
    Returns the image and the pad (pixels) between the image's top-left and the card's top-left."""
    W_, H_ = max(2, int(w * res)), max(2, int(h * res))
    base = np.empty((H_, W_, 3), 'float32')
    base[:] = tone
    base += _fibre(W_, H_, seed % 97)[..., None] * (0.55 if sum(tone) > 380 else 0.25)
    if halftone:
        yy, xx = np.mgrid[0:H_, 0:W_].astype('float32')
        cell = 9 * res
        dots = (np.sin(xx * np.pi * 2 / cell) * np.sin(yy * np.pi * 2 / cell)) > 0.55
        base[dots] *= 0.93
    card = Image.fromarray(np.clip(base, 0, 255).astype('uint8'), 'RGB').convert('RGBA')
    if border:
        ImageDraw.Draw(card).rectangle([0, 0, W_ - 1, H_ - 1], outline=border, width=max(2, int(5 * res)))
    mask = torn_mask(W_, H_, seed, edges, depth=9 * res) if edges else Image.new('L', (W_, H_), 255)
    card.putalpha(mask)
    pad = int(30 * res) if shadow else int(10 * res)
    out = Image.new('RGBA', (W_ + pad * 2, H_ + pad * 2), (0, 0, 0, 0))
    if shadow:
        sh = Image.new('L', out.size, 0)
        sh.paste(mask, (pad + int(8 * res), pad + int(13 * res)))
        sh = sh.filter(ImageFilter.GaussianBlur(11 * res)).point(lambda v: int(v * 0.42))
        out.putalpha(sh)
        rgb = Image.new('RGBA', out.size, (40, 30, 22, 0))
        rgb.putalpha(sh)
        out = rgb
    out.alpha_composite(card, (pad, pad))
    for i in range(tape):
        t_ = tape_strip(150 if i < 2 else 110, seed + i, res).rotate((-31, 28, -8)[i % 3], expand=True, resample=Image.BICUBIC)
        x = (pad - int(40 * res)) if i == 0 else (pad + W_ - int(110 * res)) if i == 1 else (pad + W_ // 2 - t_.width // 2)
        y = pad - int(22 * res) if i < 2 else pad + H_ - int(24 * res)
        out.alpha_composite(t_, (max(0, x), max(0, y)))
    return out, pad


def photo_treat(im: Image.Image, accent=None, amount: float = 0.38) -> Image.Image:
    """The archive treatment on a picture: a little of the colour pulled into an ink-on-newsprint duotone, a dot
    screen, lifted blacks. Keeps the picture readable; makes it printed."""
    rgb = np.asarray(im.convert('RGB'), 'float32')
    g = rgb.mean(-1, keepdims=True) / 255
    duo = np.array(INK, 'float32') * (1 - g) + np.array(NEWS, 'float32') * g
    out = rgb * (1 - amount) + duo * amount
    h, w = g.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype('float32')
    cell = 6.0
    dots = (np.sin(xx * np.pi * 2 / cell) * np.sin(yy * np.pi * 2 / cell) + 1) / 2
    out *= (1 - 0.14 * ((dots > g[..., 0]) * (1 - g[..., 0])))[..., None]
    out = out * 0.92 + 16
    return Image.fromarray(np.clip(out, 0, 255).astype('uint8'), 'RGB')


# ------------------------------------------------------------------ a picture or card that arrives and stays
class Sprite(El):
    """An image whose centre, scale, turn and opacity follow `pose(t)` (panel units); None = not on the board yet."""

    def __init__(self, img: Image.Image, pose, *, z=50, kind='misc', rect=None, settle=0.0, layer='board', t0=0.0, blend=None):
        self.img, self.pose, self.z, self.kind, self.rect, self.settle = img, pose, z, kind, rect, settle
        self.layer, self.t0, self.blend = layer, t0, blend
        self._cache: dict = {}

    def pieces(self, t, cv):
        p = self.pose(t)
        if p is None:
            return []
        r = transformed(self.img, Pose(cv.px(p.x), cv.px(p.y), p.scale, p.rot, p.alpha, p.reveal), self._cache)
        if not r:
            return []
        return [r + ((self.blend,) if self.blend else ())]


def arrive(x, y, t0, *, frm=(0, 0), rot0=0.0, rot1=0.0, s0=1.0, dur=0.55, style='slide', exit_at=None, exit_to=(0, 900)):
    """How a piece lands on the board: 'slide' (eased with a little overshoot), 'drop' (falls onto the table and settles
    from a bigger size, as if from above), 'stamp' (slammed down), 'fade'."""
    def pose(t):
        if t < t0:
            return None
        k = clamp((t - t0) / dur)
        if style == 'drop':
            e = ease_out_cubic(k)
            sc = s0 + (1 - s0) * e
            r = rot0 + (rot1 - rot0) * ease_out_back(k, 1.6)
            px, py = x + frm[0] * (1 - e), y + frm[1] * (1 - e)
            a = clamp(k / 0.25)
        elif style == 'stamp':
            e = ease_out_cubic(clamp(k / 0.55))
            sc = s0 + (1 - s0) * e
            r = rot0 + (rot1 - rot0) * e
            px, py, a = x, y, clamp(k / 0.1)
        elif style == 'fade':
            sc, r, px, py, a = 1.0, rot1, x, y, ease_in_out(k)
        else:
            e = ease_out_back(k, 1.25)
            sc = s0 + (1 - s0) * ease_out_cubic(k)
            r = rot0 + (rot1 - rot0) * e
            px, py = x + frm[0] * (1 - e), y + frm[1] * (1 - e)
            a = clamp(k / 0.12)
        if exit_at is not None and t > exit_at:
            ko = ease_in_out((t - exit_at) / 0.5)
            px += exit_to[0] * ko
            py += exit_to[1] * ko
            if ko >= 1:
                return None
        return Pose(px, py, max(0.01, sc), r, a)
    return pose


# ------------------------------------------------------------------ type
class Words(El):
    """Kinetic type: words arriving one by one — risen from behind a mask, popped, slid or stamped — the key words in the
    accent. Lines wrap inside `max_w`. Each word's resting box is known (`boxes`), so a highlighter or a marker can be
    aimed at a word."""
    z = 70
    kind = 'text'

    def __init__(self, words: list[tuple[str, bool]], x: float, y: float, *, size: float, res: float, fill=INK, hot=None,
                 font='head', max_w: float = 1500, align='left', t0=0.0, stagger=0.09, style='rise', rot=0.0,
                 line_gap: float = 0.06, upper=True, dur=0.42, plate=None, shift=0):
        self.res, self.t0, self.style, self.rot, self.dur = res, t0, style, rot, dur
        hot = hot or fill
        f = face(font, int(size * res))
        space = f.length(' ') * 1.7 + size * res * 0.06
        self.items = []
        lines, cur, cur_w = [], [], 0.0
        for w, k in words:
            s = w.upper() if upper else w
            im = tline(s, font, int(size * res), hot + (255,) if k else fill + (255,), plate=plate, shift=int(shift * res))
            wpx = im.width
            if cur and cur_w + space + wpx > max_w * res:
                lines.append((cur, cur_w))
                cur, cur_w = [], 0.0
            cur.append((s, im, k))
            cur_w += (space if len(cur) > 1 else 0) + wpx
        if cur:
            lines.append((cur, cur_w))
        asc, desc = f.metrics()
        lh = (asc + desc) * (1 + line_gap)
        self.boxes = []      # (x, y, w, h) panel units, at rest, unrotated around (x, y)
        yy = 0.0
        n = 0
        for ln, lw in lines:
            xx = {'left': 0.0, 'center': -lw / 2, 'right': -lw}[align]
            for s, im, k in ln:
                bx, by = x + xx / res, y + yy / res
                self.items.append({'im': im, 'x': bx, 'y': by, 'k': k, 'i': n, 's': s})
                self.boxes.append((bx, by, im.width / res, im.height / res))
                xx += im.width + space
                n += 1
            yy += lh
        self.ox, self.oy = x, y
        xs = [b[0] for b in self.boxes] + [b[0] + b[2] for b in self.boxes]
        ys = [b[1] for b in self.boxes] + [b[1] + b[3] for b in self.boxes]
        self.rect = (min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)) if self.boxes else (x, y, 1, 1)
        self.stagger = stagger
        self.settle = t0 + stagger * max(0, n - 1) + dur + 0.05
        self._rc: dict = {}

    def fit(self, end: float) -> None:
        """A short beat: the words come faster, so the last one has landed before the camera moves on."""
        n = len(self.items)
        if self.settle <= end:
            return
        self.stagger = max(0.025, (end - self.t0 - self.dur) / max(1, n - 1)) if n > 1 else self.stagger
        if self.t0 + self.dur + self.stagger * (n - 1) > end:
            self.t0 = max(0.0, end - self.dur - self.stagger * (n - 1))
        self.settle = self.t0 + self.stagger * max(0, n - 1) + self.dur + 0.05

    def word_t(self, i: int) -> float:
        return self.t0 + self.stagger * i

    def center(self, i: int) -> tuple[float, float]:
        x, y, w, h = self.boxes[i]
        return rot_pt(self.ox, self.oy, x + w / 2 - self.ox, y + h / 2 - self.oy, self.rot)

    def pieces(self, t, cv):
        out = []
        for it in self.items:
            ti = self.word_t(it['i'])
            if t < ti:
                continue
            k = clamp((t - ti) / self.dur)
            im = it['im']
            cx, cy = rot_pt(self.ox, self.oy, it['x'] + im.width / self.res / 2 - self.ox, it['y'] + im.height / self.res / 2 - self.oy, self.rot)
            if self.style == 'rise' and k < 1:
                e = ease_out_cubic(k)
                dy = int((1 - e) * im.height)
                vis = im.crop((0, 0, im.width, max(1, im.height - dy)))
                if abs(self.rot) > 0.05:
                    vis2 = Image.new('RGBA', im.size, (0, 0, 0, 0))
                    vis2.alpha_composite(vis, (0, dy))
                    r = transformed(vis2, Pose(cv.px(cx), cv.px(cy), 1.0, self.rot, 1.0), {})
                    if r:
                        out.append(r)
                else:
                    out.append((vis, int(cv.px(cx) - im.width / 2), int(cv.px(cy) - im.height / 2 + dy)))
                continue
            if self.style == 'pop':
                s = 1 + 0.35 * (1 - ease_out_back(k, 2.4)) if k < 1 else 1.0
                a = clamp(k / 0.25)
            elif self.style == 'stamp':
                s = 1 + 0.9 * (1 - ease_out_cubic(clamp(k / 0.5)))
                a = clamp(k / 0.1)
            elif self.style == 'slide':
                s, a = 1.0, clamp(k / 0.3)
                cx -= (1 - ease_out_cubic(k)) * 60
            else:
                s, a = 1.0, 1.0
            r = transformed(im, Pose(cv.px(cx), cv.px(cy), s, self.rot, a), self._rc.setdefault(it['i'], {}))
            if r:
                out.append(r)
        return out


def words_of(s: str, hot: set[str] | None = None) -> list[tuple[str, bool]]:
    hot = {h.lower() for h in (hot or set())}
    return [(w, w.lower().strip('.,!?;:’\'"“”') in hot) for w in s.split()]


class Typewriter(El):
    """A line typed in, letter by letter, with a block cursor that blinks a moment after the last letter."""
    z = 72
    kind = 'text'

    def __init__(self, s: str, x: float, y: float, *, size: float, res: float, fill=INK, font='mono', t0=0.0, cps=30.0,
                 rot=0.0, max_w: float | None = None, plate=None, pad=0.0):
        self.s, self.x, self.y, self.size, self.res, self.fill, self.font = s, x, y, size, res, fill, font
        self.t0, self.cps, self.rot, self.max_w, self.plate, self.pad = t0, cps, rot, max_w, plate, pad
        full = self._img(len(s), False)
        self.rect = (x, y, full.width / res, full.height / res)
        self.blink = 0.8
        self.settle = t0 + len(s) / cps + self.blink + 0.1
        self._c: dict = {}

    def fit(self, end: float) -> None:
        """A short beat: type faster (and start sooner) so the line is whole when the camera moves on."""
        L = max(1, len(self.s))
        if self.t0 + L / self.cps > end - 0.1:
            if self.t0 > end - 0.5:
                self.t0 = max(0.0, end - 0.5)
            self.cps = max(self.cps, L / max(0.25, end - 0.1 - self.t0))
        self.blink = max(0.0, min(0.8, end - (self.t0 + L / self.cps)))
        self.settle = self.t0 + L / self.cps + self.blink + 0.05

    def _img(self, n: int, cur: bool) -> Image.Image:
        f = (self.max_w * self.res) if self.max_w else None
        px = int(self.size * self.res)
        full = text(self.s + '  ', self.font, px, self.fill + (255,), max_w=f)
        p = int(self.pad * self.res)
        canvas = Image.new('RGBA', (full.width + 2 * p, full.height + 2 * p), self.plate + (255,) if self.plate else (0, 0, 0, 0))
        w = 0
        if n:
            im = text(self.s[:n], self.font, px, self.fill + (255,), max_w=f)
            canvas.alpha_composite(im, (p, p))
            w = im.width
        if cur:  # the block cursor, drawn (the faces have no full block)
            ImageDraw.Draw(canvas).rectangle([p + w + int(4 * self.res), p, p + w + int(4 * self.res) + int(px * 0.5), p + full.height - 2],
                                             fill=self.fill + (220,))
        return canvas

    def pieces(self, t, cv):
        if t < self.t0:
            return []
        n = min(len(self.s), int((t - self.t0) * self.cps) + 1)
        done = n >= len(self.s)
        cur = (not done) or (t - self.t0 - len(self.s) / self.cps < self.blink and int(t * 4) % 2 == 0)
        key = (n, cur)
        if key not in self._c:
            if len(self._c) > 4:
                self._c.clear()
            self._c[key] = self._img(n, cur)
        im = self._c[key]
        if abs(self.rot) > 0.05:
            cx, cy = rot_pt(self.x, self.y, im.width / self.res / 2, im.height / self.res / 2, self.rot)
            r = transformed(im, Pose(cv.px(cx), cv.px(cy), 1.0, self.rot, 1.0), {})
            return [r] if r else []
        return [(im, int(cv.px(self.x)), int(cv.px(self.y)))]


# ------------------------------------------------------------------ the pen
def wobble(pts: list[tuple[float, float]], seed: int, amp: float) -> list[tuple[float, float]]:
    rng = np.random.default_rng(seed)
    n = len(pts)
    noise = np.convolve(rng.normal(0, 1, n + 8), np.ones(9) / 9, 'same')[4:4 + n] * amp * 2.2
    return [(x + noise[i], y + noise[(i * 7) % n]) for i, (x, y) in enumerate(pts)]


def circle_path(rect, seed: int, pad: float = 22) -> list[tuple[float, float]]:
    """A hand-drawn loop around a box: one and a bit turns, the end overlapping the start, a little tilted."""
    x, y, w, h = rect
    cx, cy = x + w / 2, y + h / 2
    rx, ry = w / 2 + pad, h / 2 + pad * 0.8
    rng = np.random.default_rng(seed)
    a0 = rng.uniform(-2.6, -2.0)
    tilt = math.radians(rng.uniform(-4, 4))
    pts = []
    n = 90
    for i in range(n + 1):
        a = a0 + (2 * math.pi + 0.55) * i / n
        r = 1 + 0.06 * math.sin(a * 2 + seed) + 0.05 * i / n
        px, py = rx * r * math.cos(a), ry * r * math.sin(a)
        pts.append((cx + px * math.cos(tilt) - py * math.sin(tilt), cy + px * math.sin(tilt) + py * math.cos(tilt)))
    return wobble(pts, seed, 1.2)


def underline_path(rect, seed: int, below: float = 12) -> list[tuple[float, float]]:
    x, y, w, h = rect
    rng = np.random.default_rng(seed)
    yy = y + h + below
    lift = rng.uniform(-6, 6)
    return wobble([(x - 10 + (w + 30) * i / 40, yy + lift * i / 40 + 3 * math.sin(i / 6)) for i in range(41)], seed, 0.8)


def arrow_path(a, b, seed: int, bend: float = 0.22) -> list[tuple[float, float]]:
    (x0, y0), (x1, y1) = a, b
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    nx, ny = -(y1 - y0), (x1 - x0)
    side = 1 if seed % 2 else -1
    cx, cy = mx + nx * bend * side, my + ny * bend * side
    pts = [((1 - u) ** 2 * x0 + 2 * (1 - u) * u * cx + u ** 2 * x1, (1 - u) ** 2 * y0 + 2 * (1 - u) * u * cy + u ** 2 * y1)
           for u in (i / 40 for i in range(41))]
    return wobble(pts, seed, 0.6)


def bracket_path(rect, seed: int, side='top', reach: float = 26) -> list[tuple[float, float]]:
    x, y, w, h = rect
    if side == 'top':
        y0 = y - reach
        pts = [(x, y0 + reach * 0.7), (x, y0)] + [(x + w * i / 30, y0) for i in range(31)] + [(x + w, y0 + reach * 0.7)]
    else:
        y0 = y + h + reach
        pts = [(x, y0 - reach * 0.7), (x, y0)] + [(x + w * i / 30, y0) for i in range(31)] + [(x + w, y0 - reach * 0.7)]
    return wobble(pts, seed, 0.5)


class Marker(El):
    """A felt-tip stroke that draws itself along a path: a loop around a score, an arrow to a name, an underline, a
    bracket over a run. `target` names what it points at (checked in the tests)."""
    z = 90
    kind = 'annotation'

    def __init__(self, path, *, t0: float, dur: float, res: float, colour, width: float = 9.0, head: bool = False, target=None, name=''):
        self.path, self.t0, self.dur, self.res, self.col, self.w, self.head = path, t0, dur, res, colour, width, head
        self.target, self.name = target, name
        xs = [p[0] for p in path]
        ys = [p[1] for p in path]
        pad = width * 3 + 30
        self.box = (min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad)
        self.rect = (self.box[0], self.box[1], self.box[2] - self.box[0], self.box[3] - self.box[1])
        self.settle = t0 + dur + 0.02
        seg = [math.dist(path[i], path[i + 1]) for i in range(len(path) - 1)]
        self.cum = np.concatenate([[0], np.cumsum(seg)])
        self._final = None

    def fit(self, end: float) -> None:
        _fit_span(self, end)

    def point_at(self, u: float) -> tuple[float, float]:
        L = self.cum[-1] * clamp(u)
        i = int(np.searchsorted(self.cum, L, side='right') - 1)
        i = min(max(i, 0), len(self.path) - 2)
        seg = self.cum[i + 1] - self.cum[i]
        f = (L - self.cum[i]) / seg if seg > 0 else 0
        (x0, y0), (x1, y1) = self.path[i], self.path[i + 1]
        return x0 + (x1 - x0) * f, y0 + (y1 - y0) * f

    def _draw(self, u: float) -> Image.Image:
        r = self.res
        bx, by = self.box[0], self.box[1]
        W_, H_ = int((self.box[2] - bx) * r) + 2, int((self.box[3] - by) * r) + 2
        im = Image.new('RGBA', (W_, H_), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        L = self.cum[-1] * u
        pts = [p for p, c in zip(self.path, self.cum) if c <= L]
        if u < 1 and len(pts) < len(self.path):
            pts.append(self.point_at(u))
        if len(pts) >= 2:
            P = [((x - bx) * r, (y - by) * r) for x, y in pts]
            # the ink pools: a slightly wider, lighter pass under the line, then the line itself
            d.line(P, fill=self.col + (110,), width=int(self.w * r * 1.35), joint='curve')
            d.line(P, fill=self.col + (245,), width=int(self.w * r), joint='curve')
            for (x, y) in (P[0], P[-1]):
                rr = self.w * r * 0.5
                d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=self.col + (245,))
        if self.head and u >= 0.96 and len(pts) >= 3:
            (x1, y1), (x0, y0) = self.path[-1], self.path[-4]
            ang = math.atan2(y1 - y0, x1 - x0)
            L_ = 30
            for s in (-1, 1):
                a = ang + math.pi - s * 0.5
                d.line([((x1 - bx) * r, (y1 - by) * r), ((x1 + L_ * math.cos(a) - bx) * r, (y1 + L_ * math.sin(a) - by) * r)],
                       fill=self.col + (245,), width=int(self.w * r))
        return im

    def pieces(self, t, cv):
        if t < self.t0:
            return []
        u = ease_in_out(clamp((t - self.t0) / self.dur)) ** 0.85
        if u >= 1:
            if self._final is None:
                self._final = self._draw(1.0)
            im = self._final
        else:
            im = self._draw(u)
        return [(im, int(cv.px(self.box[0])), int(cv.px(self.box[1])))]


def _fit_span(e, end: float) -> None:
    if e.t0 + e.dur > end:
        e.t0 = max(0.0, end - e.dur)
        e.settle = e.t0 + e.dur + 0.02


class Highlight(El):
    """A highlighter swipe across a box, left to right, printed in multiply — the ink under it stays ink."""
    z = 75
    kind = 'annotation'

    def __init__(self, rect, *, t0: float, dur: float, res: float, colour, rot: float = 0.0, seed: int = 0, target=None):
        x, y, w, h = rect
        self.r = (x - 8, y + h * 0.08, w + 16, h * 0.9)
        self.rect = self.r
        self.t0, self.dur, self.res, self.col, self.rot, self.seed = t0, dur, res, colour, rot, seed
        self.settle = t0 + dur + 0.02
        self.target = target
        self.blend = 'multiply'
        self._c: dict = {}

    def fit(self, end: float) -> None:
        _fit_span(self, end)

    def _img(self, u: float) -> Image.Image:
        key = round(u, 2)
        if key in self._c:
            return self._c[key]
        x, y, w, h = self.r
        r = self.res
        W_, H_ = max(2, int(w * r)), max(2, int(h * r))
        im = Image.new('RGBA', (W_, H_), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        ww = W_ * u
        rng = np.random.default_rng(self.seed)
        slant = H_ * 0.18
        d.polygon([(0, slant * rng.random()), (ww, 0), (ww - slant, H_), (0, H_ - slant * rng.random())], fill=self.col + (255,))
        if len(self._c) > 40:
            self._c.clear()
        self._c[key] = im
        return im

    def pieces(self, t, cv):
        if t < self.t0:
            return []
        u = ease_out_cubic(clamp((t - self.t0) / self.dur))
        if u <= 0.01:
            return []
        im = self._img(u)
        x, y, w, h = self.r
        if abs(self.rot) > 0.05:
            im = im.rotate(self.rot, expand=True, resample=Image.BICUBIC)
            cx, cy = x + w / 2, y + h / 2
            return [(im, int(cv.px(cx) - im.width / 2), int(cv.px(cy) - im.height / 2), 'multiply')]
        return [(im, int(cv.px(x)), int(cv.px(y)), 'multiply')]


# ------------------------------------------------------------------ numbers that move
@lru_cache(maxsize=64)
def _digit_strip(font: str, size: int, fill: tuple, stroke: int = 0) -> tuple[Image.Image, int, int]:
    """0..9 then 0 again, stacked on one baseline: an odometer wheel. Returns (strip, cell width, cell height)."""
    f = face(font, size)
    asc, desc = f.metrics()
    cw = int(max(f.length(str(d)) for d in range(10))) + 6 + 2 * stroke
    ch = asc + desc + 2 * stroke
    strip = Image.new('RGBA', (cw, ch * 11), (0, 0, 0, 0))
    d = ImageDraw.Draw(strip)
    for j in range(11):
        g = str(j % 10)
        x = (cw - f.length(g)) / 2
        f.draw(d, (x, j * ch + stroke), g, fill + (255,), stroke=stroke, stroke_fill=INK + (255,) if stroke else None)
    return strip, cw, ch


class Odometer(El):
    """A number on rolling wheels. `value(t)` may rise and fall (the form line); each wheel turns only as far as the
    value asks, carrying into the next wheel the way a meter does. Lands exactly on `final`."""
    z = 80
    kind = 'data'

    def __init__(self, value, x: float, y: float, *, size: float, res: float, digits: int, fill=INK, font='ultra',
                 prefix: str = '', suffix: str = '', sign: bool = False, final: float = 0.0, t0: float = 0.0, settle: float = 0.0,
                 plate=None, pad: float = 10, rot: float = 0.0, stroke: int = 0, name=''):
        self.value, self.x, self.y, self.res, self.digits, self.fill = value, x, y, res, digits, fill
        self.prefix, self.suffix, self.sign, self.final, self.t0, self.settle = prefix, suffix, sign, final, t0, settle
        self.plate, self.pad, self.rot, self.name = plate, pad, rot, name
        px = int(size * res)
        self.strip, self.cw, self.ch = _digit_strip(font, px, fill, stroke)
        self.pre = text(prefix, font, px, fill + (255,)) if prefix else None
        self.suf = text(suffix, font, int(px * 0.6), fill + (255,)) if suffix else None
        self.plus = text('+', font, px, fill + (255,)) if sign else None
        self.minus = text('–', font, px, fill + (255,)) if sign else None
        sw = max(self.plus.width, self.minus.width) if sign else 0
        self.W = (self.pre.width if self.pre else 0) + sw + self.cw * digits + (self.suf.width + 6 if self.suf else 0) + int(2 * pad * res)
        self.H = self.ch + int(2 * pad * res)
        self.rect = (x - self.W / res / 2, y - self.H / res / 2, self.W / res, self.H / res)
        self._c: dict = {}

    def shown(self, t: float) -> float:
        return self.final if t >= self.settle else float(self.value(t))

    def _img(self, v: float) -> Image.Image:
        key = round(v, 2)
        if key in self._c:
            return self._c[key]
        im = Image.new('RGBA', (self.W, self.H), self.plate + (255,) if self.plate else (0, 0, 0, 0))
        x = int(self.pad * self.res)
        y = int(self.pad * self.res)
        if self.pre:
            im.alpha_composite(self.pre, (x, y + int(self.ch / 2 - self.pre.height / 2)))
            x += self.pre.width
        if self.sign:
            s = self.plus if v > 0.05 else self.minus if v < -0.05 else None
            if s is not None:
                im.alpha_composite(s, (x, y + int(self.ch / 2 - s.height / 2)))
            x += max(self.plus.width, self.minus.width)
        a = abs(v)
        for p in range(self.digits - 1, -1, -1):
            base = 10 ** p
            pos = (a / base) % 10
            if p > 0:
                frac = (a % base) - (base - 1)
                pos = math.floor(a / base) % 10 + clamp(frac)
            else:
                pos = a % 10
            if p > 0 and a < base and pos < 0.999:
                x += self.cw
                continue  # no leading zero
            off = int(round(pos * self.ch)) % (10 * self.ch)
            im.alpha_composite(self.strip.crop((0, off, self.cw, off + self.ch)), (x, y))
            x += self.cw
        if self.suf:
            im.alpha_composite(self.suf, (x + 6, y + int(self.ch * 0.62 - self.suf.height / 2)))
        if len(self._c) > 300:
            self._c.clear()
        self._c[key] = im
        return im

    def pieces(self, t, cv):
        if t < self.t0:
            return []
        im = self._img(self.shown(t))
        if abs(self.rot) > 0.05:
            r = transformed(im, Pose(cv.px(self.x), cv.px(self.y), 1.0, self.rot, 1.0), self._c.setdefault('rot', {}))
            return [r] if r else []
        return [(im, int(cv.px(self.x) - im.width / 2), int(cv.px(self.y) - im.height / 2))]


def roll(a: float, b: float, t0: float, dur: float):
    """A value rolling from a to b, fast at first and easing in at the end (the odometer's own rhythm)."""
    def v(t):
        return a + (b - a) * ease_out_cubic(clamp((t - t0) / max(0.05, dur)))
    return v


class Flip(El):
    """A split-flap number: each change folds the old figure away and the new one down, with the hinge line showing."""
    z = 82
    kind = 'data'

    def __init__(self, steps: list[tuple[float, str]], x: float, y: float, *, size: float, res: float, fill=INK, tile=PAPER,
                 font='ultra', w: float | None = None, name=''):
        self.steps, self.x, self.y, self.res, self.name = steps, x, y, res, name
        px = int(size * res)
        self.ims = {s: text(s, font, px, fill + (255,)) for _, s in steps}
        mw = max(i.width for i in self.ims.values())
        mh = max(i.height for i in self.ims.values())
        self.TW = int((w * res) if w else mw + 30 * res)
        self.TH = int(mh + 34 * res)
        self.tile = tile
        self.rect = (x - self.TW / res / 2, y - self.TH / res / 2, self.TW / res, self.TH / res)
        self.t0 = steps[0][0]
        self.settle = steps[-1][0] + 0.25
        self.final = steps[-1][1]
        self._c: dict = {}

    def _card(self, s: str) -> Image.Image:
        if s not in self._c:
            im = Image.new('RGBA', (self.TW, self.TH), self.tile + (255,))
            d = ImageDraw.Draw(im)
            d.rectangle([0, 0, self.TW - 1, self.TH - 1], outline=INK + (255,), width=max(2, int(4 * self.res)))
            g = self.ims[s]
            im.alpha_composite(g, (int(self.TW / 2 - g.width / 2), int(self.TH / 2 - g.height / 2)))
            d.line([(0, self.TH // 2), (self.TW, self.TH // 2)], fill=INK + (150,), width=max(1, int(2 * self.res)))
            self._c[s] = im
        return self._c[s]

    def pieces(self, t, cv):
        if t < self.t0:
            return []
        i = max(j for j, (ts, _) in enumerate(self.steps) if t >= ts)
        cur = self._card(self.steps[i][1])
        prev = self._card(self.steps[i - 1][1]) if i > 0 else None
        X, Y = int(cv.px(self.x) - self.TW / 2), int(cv.px(self.y) - self.TH / 2)
        k = clamp((t - self.steps[i][0]) / 0.2)
        if prev is None or k >= 1:
            return [(cur, X, Y)]
        # the old top half folds down over the new one: top of new + bottom of old, then the flap
        out = Image.new('RGBA', (self.TW, self.TH), (0, 0, 0, 0))
        hh = self.TH // 2
        out.alpha_composite(cur.crop((0, 0, self.TW, hh)), (0, 0))
        out.alpha_composite(prev.crop((0, hh, self.TW, self.TH)), (0, hh))
        if k < 0.5:
            fl = prev.crop((0, 0, self.TW, hh))
            fh = max(1, int(hh * (1 - k * 2)))
            fl = fl.resize((self.TW, fh), Image.BILINEAR)
            out.alpha_composite(fl, (0, hh - fh))
        else:
            fl = cur.crop((0, hh, self.TW, self.TH))
            fh = max(1, int(hh * (k * 2 - 1)))
            fl = fl.resize((self.TW, fh), Image.BILINEAR)
            out.alpha_composite(fl, (0, hh))
        return [(out, X, Y)]


# ------------------------------------------------------------------ a line that draws itself
class Line(El):
    """A polyline drawn left to right with its tip leading: the form line, the timeline. `tip(t)` is where the pen is
    (the camera follows it); `at(i)` is the time the pen reaches point i."""
    z = 60
    kind = 'data'

    def __init__(self, pts: list[tuple[float, float]], *, t0: float, dur: float, res: float, colour, width: float = 10,
                 fill_to: float | None = None, fill_col=None, dots=None, shadow=INK):
        self.pts, self.t0, self.dur, self.res, self.col, self.w = pts, t0, dur, res, colour, width
        self.fill_to, self.fill_col, self.dots, self.shadow = fill_to, fill_col, dots or [], shadow
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts] + ([fill_to] if fill_to is not None else [])
        pad = 30
        self.box = (min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad)
        self.rect = (self.box[0], self.box[1], self.box[2] - self.box[0], self.box[3] - self.box[1])
        self.settle = t0 + dur + 0.02
        self._final = None

    def frac(self, t: float) -> float:
        return ease_in_out(clamp((t - self.t0) / self.dur))

    def at(self, i: int) -> float:
        n = len(self.pts)
        u = i / max(1, n - 1)
        # invert ease_in_out: u = 0.5 - 0.5 cos(pi k)
        k = math.acos(clamp(1 - 2 * u, -1, 1)) / math.pi
        return self.t0 + k * self.dur

    def tip(self, t: float) -> tuple[float, float]:
        n = len(self.pts)
        u = self.frac(t) * (n - 1)
        j = min(int(u), n - 2)
        f = u - j
        (x0, y0), (x1, y1) = self.pts[j], self.pts[j + 1]
        return x0 + (x1 - x0) * f, y0 + (y1 - y0) * f

    def _draw(self, p: float) -> Image.Image:
        r = self.res
        bx, by = self.box[0], self.box[1]
        im = Image.new('RGBA', (int((self.box[2] - bx) * r) + 2, int((self.box[3] - by) * r) + 2), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        n = len(self.pts)
        upto = p * (n - 1)
        j = int(upto)
        seg = self.pts[:j + 1]
        if j < n - 1:
            seg = seg + [self.tip_at(upto)]
        P = [((x - bx) * r, (y - by) * r) for x, y in seg]
        if len(P) >= 2:
            if self.fill_to is not None and self.fill_col:
                z_ = (self.fill_to - by) * r
                d.polygon(P + [(P[-1][0], z_), (P[0][0], z_)], fill=self.fill_col)
            if self.shadow:
                d.line([(x + 5 * r, y + 6 * r) for x, y in P], fill=self.shadow + (200,), width=int(self.w * r), joint='curve')
            d.line(P, fill=self.col + (255,), width=int(self.w * r), joint='curve')
        for i in range(min(j + 1, n)):
            if i < len(self.dots) and self.dots[i]:
                col, edge = self.dots[i]
                x, y = P[i] if i < len(P) else ((self.pts[i][0] - bx) * r, (self.pts[i][1] - by) * r)
                rr = 9 * r
                d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=col + (255,), outline=edge + (255,), width=max(2, int(3 * r)))
        return im

    def tip_at(self, u: float) -> tuple[float, float]:
        n = len(self.pts)
        j = min(int(u), n - 2)
        f = u - j
        (x0, y0), (x1, y1) = self.pts[j], self.pts[j + 1]
        return x0 + (x1 - x0) * f, y0 + (y1 - y0) * f

    def pieces(self, t, cv):
        if t < self.t0:
            return []
        p = self.frac(t)
        if p >= 1:
            if self._final is None:
                self._final = self._draw(1.0)
            im = self._final
        else:
            im = self._draw(p)
        return [(im, int(cv.px(self.box[0])), int(cv.px(self.box[1])))]


class Bar(El):
    """A bar of segments growing from its left edge (won · drawn · lost), each segment its own colour."""
    z = 62
    kind = 'data'

    def __init__(self, x, y, w, h, parts: list[tuple[float, tuple]], *, t0, dur, res):
        self.x, self.y, self.w, self.h, self.parts, self.t0, self.dur, self.res = x, y, w, h, parts, t0, dur, res
        self.rect = (x, y, w, h)
        self.settle = t0 + dur + 0.02
        self._c: dict = {}

    def pieces(self, t, cv):
        if t < self.t0:
            return []
        k = round(ease_out_cubic(clamp((t - self.t0) / self.dur)), 3)
        if k not in self._c:
            r = self.res
            tot = sum(v for v, _ in self.parts) or 1
            im = Image.new('RGBA', (int((self.w + 12) * r), int((self.h + 12) * r)), (0, 0, 0, 0))
            d = ImageDraw.Draw(im)
            d.rectangle([10 * r, 10 * r, (10 + self.w * k) * r, (10 + self.h) * r], fill=INK + (200,))
            x = 0.0
            for v, col in self.parts:
                ww = self.w * v / tot * k
                if ww > 0.5:
                    d.rectangle([x * r, 0, (x + ww) * r, self.h * r], fill=col + (255,), outline=INK + (255,), width=max(2, int(3 * r)))
                x += ww
            if len(self._c) > 64:
                self._c.clear()
            self._c[k] = im
        return [(self._c[k], int(cv.px(self.x)), int(cv.px(self.y)))]


# ------------------------------------------------------------------ cut-outs
class Cutout(Sprite):
    """A cut-out person or object in front of the board (layer 'near': it moves faster than the paper as the camera
    glides, which is what makes the board read as depth). It rises in, breathes, and leaves before the cut."""

    def __init__(self, img, x, y, *, t0, dur, side=1, motion='rise', res=1.0, exit_at=None, z=95, layer='near', rect=None):
        self.side = side

        def pose(t, img=img):
            if t < t0:
                return None
            k = ease_out_cubic(clamp((t - t0) / 0.7))
            px, py = x, y
            if motion == 'slide':
                px = x + side * (1 - k) * (img.width / res + 300)
            elif motion == 'drop':
                py = y - (1 - ease_out_back(clamp((t - t0) / 0.7), 1.4)) * 500
            else:
                py = y + (1 - k) * (img.height / res * 0.9 + 120)
            py += 5 * math.sin((t - t0) * 2.2)
            r = 1.2 * math.sin((t - t0) * 1.3)
            if exit_at is not None and t > exit_at:
                ko = ease_in_out((t - exit_at) / 0.55)
                if motion == 'slide':
                    px += side * ko * (img.width / res + 400)
                else:
                    py += ko * (img.height / res + 200)
                if ko >= 1:
                    return None
            return Pose(px, py, 1.0, r, 1.0)
        w, h = img.width / res, img.height / res
        super().__init__(img, pose, z=z, kind='cutout', rect=rect or (x - w / 2, y - h / 2, w, h),
                         settle=1e9 if exit_at is None else exit_at + 0.6, layer=layer, t0=t0)
