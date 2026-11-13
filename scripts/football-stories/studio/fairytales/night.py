"""Football Fairy Tales — what a Good Night episode adds to the picture (owner, 13.11.2026: "calmer, more hypnotic, not a
slideshow; when the lights go off, animate the lights going off").

  Motes      a few dozen soft points of light drifting slowly across every shot — the same field through the cuts, so
             the film reads as one world rather than a set of slides. They breathe slowly; nothing blinks.
  Lamps      a plate's floodlights, each switched on or off by a level: the head, its halo and the pool of light go
             together, and the picture sinks a little further into the night with every lamp that goes out.
  soft_in    lets any overlay arrive by fading and rising a few pixels — no drop, no bounce, no pop.
"""
from __future__ import annotations

import math

import numpy as np
from PIL import Image

from studio.fairytales import papertheatre as pt

W, H = pt.W, pt.H


def smooth(x: float) -> float:
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


class Motes:
    def __init__(self, n: int = 46, seed: int = 9):
        rng = np.random.default_rng(seed)
        self.x = rng.uniform(0, W, n)
        self.y = rng.uniform(0, H, n)
        self.vx = rng.uniform(-9, 9, n)                     # pixels a second: slow enough to feel like floating
        self.vy = rng.uniform(-7, -2, n)                    # a gentle rise, like dust in lamplight
        self.r = rng.uniform(1.6, 4.2, n)
        self.ph = rng.uniform(0, 2 * math.pi, n)
        self.per = rng.uniform(5.0, 9.0, n)                 # one slow breath every 5–9 s
        self.warm = rng.random(n) < 0.35
        self._sprite = {}

    def _dot(self, r: float, warm: bool) -> np.ndarray:
        """The mote as light to add: a float (h, w, 3) array, glow and core, already coloured."""
        r, warm = float(r), bool(warm)
        key = (round(r, 1), warm)
        if key not in self._sprite:
            s = int(r * 8)
            yy, xx = np.mgrid[0:s, 0:s].astype(np.float32) - s / 2
            d2 = xx * xx + yy * yy
            a = 0.55 * np.exp(-d2 / (2 * (r * 1.6) ** 2)) + 0.9 * np.exp(-d2 / (2 * (r * 0.55) ** 2))
            col = np.array((255, 214, 170) if warm else (236, 240, 255), np.float32)
            self._sprite[key] = a[..., None] * col[None, None, :]
        return self._sprite[key]

    def draw(self, img: Image.Image, t: float, strength: float = 1.0) -> Image.Image:
        if strength <= 0:
            return img
        out = np.asarray(img).astype(np.float32)
        hh, ww = out.shape[:2]
        for i in range(len(self.x)):
            x = (self.x[i] + self.vx[i] * t) % (W + 60) - 30
            y = (self.y[i] + self.vy[i] * t) % (H + 60) - 30
            a = strength * (0.25 + 0.45 * (0.5 + 0.5 * math.sin(2 * math.pi * t / self.per[i] + self.ph[i])))
            sp = self._dot(self.r[i], self.warm[i])
            s = sp.shape[0]
            x0, y0 = int(x - s / 2), int(y - s / 2)
            ax0, ay0, ax1, ay1 = max(x0, 0), max(y0, 0), min(x0 + s, ww), min(y0 + s, hh)
            if ax1 <= ax0 or ay1 <= ay0:
                continue
            out[ay0:ay1, ax0:ax1] += a * sp[ay0 - y0:ay1 - y0, ax0 - x0:ax1 - x0] * 0.8
        return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


class Lamps:
    """The lamps of one plate, each with a level from 1 (on) to 0 (off). `lamps` is [[x, y, r], …] in the plate's
    pixels, read off the painting (not guessed by a detector: a moon is bright too). A lamp that is on glows — its head,
    a halo and a wide pool of light — whether or not the painter lit it; a lamp that goes off loses all three, and
    every lamp that goes out takes 7% of the whole picture with it, the rest turning a little moonlit."""

    def __init__(self, plate: Image.Image, lamps: list[list[float]]):
        self.a = np.asarray(plate.convert('RGB'), dtype=np.float32)
        hh, ww = self.a.shape[:2]
        yy, xx = np.mgrid[0:hh, 0:ww].astype(np.float32)
        self.g = []
        for x, y, r, *lit in lamps:                          # lit: the painter drew this lamp burning
            d2 = (xx - x) ** 2 + (yy - y) ** 2
            k = 1.0 if (lit and lit[0]) else 0.18                # an unlit-painted lamp only loses the glow we add
            self.g.append((k * np.exp(-d2 / (2 * (r * 1.1) ** 2)), k * np.exp(-d2 / (2 * (r * 3.2) ** 2)),
                           k * np.exp(-d2 / (2 * (r * 10.0) ** 2)), np.exp(-d2 / (2 * (r * 1.1) ** 2)),
                           np.exp(-d2 / (2 * (r * 3.2) ** 2)), np.exp(-d2 / (2 * (r * 10.0) ** 2))))

    def at(self, levels: list[float]) -> Image.Image:
        b = self.a.copy()
        keep = np.ones(b.shape[:2], np.float32)
        glow = np.zeros(b.shape[:2], np.float32)
        for (dh, dl, dp, head, halo, pool), l in zip(self.g, levels):
            keep *= 1 - (1 - l) * (0.38 * dh + 0.3 * dl + 0.1 * dp)
            glow += l * (150 * head + 60 * halo + 16 * pool)
        off = sum(1 - l for l in levels)
        b = b * keep[..., None] * (1 - 0.07 * off)
        b *= np.array([0.94, 0.96, 1.06], np.float32) ** (off / max(len(levels), 1))
        b += glow[..., None] * np.array([1.0, 0.86, 0.66], np.float32)
        return Image.fromarray(np.clip(b, 0, 255).astype(np.uint8))


def soft_in(base: Image.Image, landed: Image.Image, t: float, dur: float = 1.1) -> Image.Image:
    """`landed` is the frame with the overlay fully in place; arrive by a slow fade."""
    if t <= 0:
        return base
    q = smooth(t / dur)
    if q >= 1:
        return landed
    return Image.blend(base, landed, q)
