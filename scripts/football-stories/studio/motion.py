"""The frame engine: a world (moved by a camera), layers that animate in it or on the glass, grain and transitions.

Everything is deterministic: the same edit decision list renders the same pixels, so a shot can be re-rendered alone
(for a retry, a preview or the transition into the next shot) without rendering the film again.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Callable

import numpy as np
from PIL import Image

from .common import FPS, H, W
from .paper import CANVAS


def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def ease_out_cubic(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_in_out(x):
    x = clamp(x)
    return 0.5 - 0.5 * math.cos(math.pi * x)


def ease_out_back(x, s=1.70158):
    x = clamp(x)
    return 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2


@dataclass
class Pose:
    x: float
    y: float
    scale: float = 1.0
    rot: float = 0.0  # degrees, counter-clockwise
    alpha: float = 1.0
    reveal: float = 1.0  # fraction of the width shown, left to right


@dataclass
class Layer:
    """An image whose pose is a function of shot time. `settle` = time after which the pose no longer changes."""
    img: Image.Image
    pose: Callable[[float], Pose | None]
    settle: float = 1e9
    space: str = 'screen'  # 'world' moves with the camera, 'screen' is glued to the glass
    start: float = 0.0
    _cache: dict = field(default_factory=dict)


def transformed(img: Image.Image, p: Pose, cache: dict) -> tuple[Image.Image, int, int] | None:
    if p.alpha <= 0.003 or p.scale <= 0.01 or p.reveal <= 0:
        return None
    key = (round(p.scale, 3), round(p.rot, 2), round(p.alpha, 3), round(p.reveal, 3))
    if key in cache:
        im = cache[key]
    else:
        im = img
        if p.reveal < 1:
            im = im.crop((0, 0, max(1, int(im.width * p.reveal)), im.height))
        if abs(p.scale - 1) > 1e-3 or abs(p.rot) > 1e-3:
            w, h = im.size
            nw, nh = max(1, round(w * p.scale)), max(1, round(h * p.scale))
            im = im.resize((nw, nh), Image.BICUBIC) if abs(p.scale - 1) > 1e-3 else im
            if abs(p.rot) > 1e-3:
                im = im.rotate(p.rot, resample=Image.BICUBIC, expand=True)
        if p.alpha < 0.999:
            a = im.getchannel('A').point(lambda v: int(v * p.alpha))
            im = im.copy()
            im.putalpha(a)
        if len(cache) > getattr(cache, 'cap', 6):  # a library figure's cache holds its repeating angles (cinema.animate)
            cache.clear()
        cache[key] = im
    # the pose's (x, y) is the CENTRE of the un-revealed image
    # reveal is used without rotation: the left edge stays where the whole image's left edge would be
    x = round(p.x - img.width * p.scale / 2) if p.reveal < 1 else round(p.x - im.width / 2)
    y = round(p.y - im.height / 2)
    return im, x, y


@dataclass
class Shot:
    index: int
    duration: float
    world: Image.Image  # CANVAS-sized RGB
    camera: Callable[[float], tuple[float, float, float]]  # t → (zoom, cx, cy) in canvas pixels; zoom 1 = W×H window
    layers: list[Layer] = field(default_factory=list)
    entry: str = 'cut'  # cut | fade | wipe | black
    shake: list[tuple[float, float]] = field(default_factory=list)  # (time, strength px)
    cues: list[tuple[float, str]] = field(default_factory=list)  # sound cues for the mix
    meta: dict = field(default_factory=dict)
    # A moving world (an owner stop-motion clip): frame index → CANVAS-sized RGB. Read in order, never seeked.
    world_frames: Callable[[int], Image.Image] | None = None
    # Drawn last, over everything (the burned-in captions): shot time → (RGBA, x, y) or None — or a list of them, or
    # a list of callables (the cinema's graphics, the scorebug, the lower-third, then the captions).
    overlay: Callable[[float], tuple[Image.Image, int, int] | None] | None = None
    # The cinema's finishing (cinema.look.Grade): shot time, an H×W×3 uint8 picture → the graded picture. Applied to
    # the picture before the overlays, so the glass graphics stay clean while the world is graded.
    post: list = field(default_factory=list)

    @property
    def frames(self) -> int:
        return max(1, round(self.duration * FPS))


GRAIN: list[np.ndarray] = []


def _grain(i: int) -> np.ndarray:
    global GRAIN
    if not GRAIN:
        rng = np.random.default_rng(11)
        GRAIN = [rng.normal(0, 3.0, (H, W, 1)).astype('int16') for _ in range(5)]
    # The grain changes every second frame (12.5 a second, like stop-motion film): half the noise for the encoder,
    # which is what keeps a 25-minute master inside the storage budget (pipeline.MASTER_BUDGET_MB).
    return GRAIN[(i // 2) % len(GRAIN)]


class ShotRenderer:
    def __init__(self, shot: Shot):
        self.s = shot
        self.base = shot.world.copy().convert('RGBA')
        self.baked = 0

    def _bake(self, t: float):
        layers = [l for l in self.s.layers if l.space == 'world']
        while self.baked < len(layers) and layers[self.baked].settle <= t:
            l = layers[self.baked]
            p = l.pose(l.settle + 1e-3)
            r = transformed(l.img, p, l._cache) if p else None
            if r:
                im, x, y = r
                self.base.alpha_composite(im, (x, y)) if 0 <= x and 0 <= y and x + im.width <= self.base.width and y + im.height <= self.base.height else self.base.paste(im, (x, y), im)
            self.baked += 1

    def frame(self, i: int, global_i: int = 0) -> np.ndarray:
        t = i / FPS
        s = self.s
        if s.world_frames is not None:
            self.base = s.world_frames(i).convert('RGBA')
            self.baked = 0
        self._bake(t)
        world_layers = [l for l in s.layers if l.space == 'world'][self.baked:]
        if world_layers:
            world = self.base.copy()
            for l in world_layers:
                p = l.pose(t)
                r = transformed(l.img, p, l._cache) if p else None
                if r:
                    world.paste(r[0], (r[1], r[2]), r[0])
        else:
            world = self.base
        z, cx, cy = s.camera(t)
        for (ts, strength) in s.shake:
            if ts <= t < ts + 0.28:
                k = (1 - (t - ts) / 0.28) * strength
                cx += k * math.sin(t * 91)
                cy += k * math.cos(t * 77)
        hw, hh = W / (2 * z), H / (2 * z)
        cx = clamp(cx, hw, CANVAS[0] - hw)
        cy = clamp(cy, hh, CANVAS[1] - hh)
        frame = world.transform((W, H), Image.EXTENT, (cx - hw, cy - hh, cx + hw, cy + hh), Image.BILINEAR)
        for l in s.layers:
            if l.space != 'screen':
                continue
            p = l.pose(t)
            r = transformed(l.img, p, l._cache) if p else None
            if r:
                frame.alpha_composite(r[0], (r[1], r[2])) if 0 <= r[1] and 0 <= r[2] and r[1] + r[0].width <= W and r[2] + r[0].height <= H else frame.paste(r[0], (r[1], r[2]), r[0])
        if s.post:
            arr = np.asarray(frame.convert('RGB'))
            for fn in s.post:
                arr = fn(t, arr)
            frame = Image.fromarray(arr, 'RGB').convert('RGBA')
        for ov in (s.overlay if isinstance(s.overlay, list) else [s.overlay] if s.overlay else []):
            o = ov(t)
            for piece in (o if isinstance(o, list) else [o] if o else []):
                im, x, y = piece
                if 0 <= x and 0 <= y and x + im.width <= W and y + im.height <= H:
                    frame.alpha_composite(im, (x, y))
                else:
                    frame.paste(im, (x, y), im)
        a = np.asarray(frame.convert('RGB'), dtype='int16') + _grain(global_i)
        return np.clip(a, 0, 255).astype('uint8')


def blend_entry(shot: Shot, i: int, frame: np.ndarray, prev_last: np.ndarray | None, accent_rgb) -> np.ndarray:
    t = i / FPS
    if str(shot.entry).startswith('tr:'):  # the owner's transition art (cinema.animate.Transition)
        fn = shot.meta.get('tr_fn')
        return fn(t, frame, prev_last) if fn else frame
    if shot.entry not in ('black', 'fade', 'wipe'):
        from .cinema.look import blend
        out = blend(shot.entry, t, frame, prev_last, shot.meta.get('side', 1))
        if out is not None:
            return out
    if shot.entry == 'black':
        k = ease_in_out(t / 0.8)
        return (frame.astype('float32') * k).astype('uint8')
    if prev_last is None:
        return frame
    if shot.entry == 'fade' and t < 0.32:
        k = ease_in_out(t / 0.32)
        return (prev_last.astype('float32') * (1 - k) + frame.astype('float32') * k).astype('uint8')
    if shot.entry == 'wipe' and t < 0.6:
        # the kit's diagonal wipe: an accent band with an ink edge sweeps left→right, revealing the new shot behind it
        k = ease_in_out(t / 0.6)
        out = prev_last.copy()
        xs = np.arange(W)[None, :]
        ys = np.arange(H)[:, None]
        edge = (k * (W + 700)) - 350 - (ys - H / 2) * 0.35
        newside = xs < edge - 120
        band = (xs >= edge - 120) & (xs < edge)
        inkb = (xs >= edge) & (xs < edge + 22)
        out[newside] = frame[newside]
        out[band] = accent_rgb
        out[inkb] = (21, 19, 15)
        return out
    return frame


class Confetti:
    """Paper confetti in the club colour, cream and ink, falling with a sway — for titles and cup nights.
    Seeded, so a re-render draws the same storm."""

    def __init__(self, accent_rgb, t0: float = 0.4, n: int = 150, seed: int = 9):
        rng = np.random.default_rng(seed)
        self.t0 = t0
        self.p = [(rng.uniform(-40, W + 40), rng.uniform(-H * 0.9, -20), rng.uniform(150, 330), rng.uniform(0, 6.28),
                   rng.uniform(1.5, 4.0), rng.uniform(8, 22), rng.uniform(6, 14),
                   (accent_rgb, (244, 236, 216), (21, 19, 15))[int(rng.integers(0, 3)) if rng.random() > 0.45 else 0])
                  for _ in range(n)]

    def __call__(self, t: float):
        if t < self.t0:
            return None
        from PIL import ImageDraw
        dt = t - self.t0
        im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        for (x, y, vy, ph, sw, w, h, col) in self.p:
            yy = y + vy * dt
            if yy > H + 30:
                continue
            xx = x + 40 * math.sin(ph + dt * sw)
            flip = abs(math.cos(ph + dt * sw * 1.7))
            hw, hh = w / 2, max(1.5, h * flip / 2)
            ang = ph + dt * sw
            ca, sa = math.cos(ang), math.sin(ang)
            pts = [(xx + ca * dx - sa * dy, yy + sa * dx + ca * dy) for dx, dy in ((-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh))]
            d.polygon(pts, fill=tuple(col) + (235,))
        return im, 0, 0
