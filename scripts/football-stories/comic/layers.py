"""Split a picture into background / subject / foreground for parallax.

Three layers by depth quantiles with soft mattes (smoothstep, then snapped to the picture's edges with a guided
filter). What the nearer layers cover is filled in the layer behind them (cv2.inpaint TELEA on a dilated mask at a
working size, softened), so a layer can slide without showing a hole. The owner's picture itself is never altered:
the layers re-composite to it exactly where nothing moves (alpha over a filled copy of the same pixels).

Cached per picture by sha256 (CLASSIFIED_CACHE, default ~/.cache/fanlife-classified/layers) — never in the repo.
A cut-out PNG with its own alpha is one foreground layer as it comes.
"""
from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from comic.depth import depth_map, guided

VERSION = 'layers-v5'
CACHE = Path(os.environ.get('CLASSIFIED_CACHE', Path.home() / '.cache' / 'fanlife-classified' / 'layers'))
MAX_SIDE = 2560


@dataclass
class Layers:
    rgb: np.ndarray          # original HxWx3 uint8
    bg: np.ndarray           # HxWx3 uint8, nearer layers' area filled
    sub: np.ndarray          # HxWx3 uint8, foreground's area filled
    fg: np.ndarray           # HxWx3 uint8, the foreground's own colours (edges unmixed)
    a_sub: np.ndarray        # HxW float32 0..1 (subject + foreground)
    a_fg: np.ndarray         # HxW float32 0..1
    depth: np.ndarray        # HxW float32
    method: str
    sha: str

    @property
    def size(self) -> tuple[int, int]:
        return self.rgb.shape[1], self.rgb.shape[0]

    def subject_centre(self) -> tuple[float, float]:
        """Weighted centre of the subject matte, panel-normalised (for reframing 9:16)."""
        a = self.a_sub
        s = float(a.sum())
        if s < 1:
            return .5, .5
        H, W = a.shape
        ys, xs = np.mgrid[0:H, 0:W]
        return float((a * xs).sum() / s / W), float((a * ys).sum() / s / H)


def smoothstep(e0: float, e1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - e0) / max(e1 - e0, 1e-6), 0, 1)
    return t * t * (3 - 2 * t)


def read_rgb(path: Path) -> np.ndarray:
    with Image.open(path) as im:
        im = im.convert('RGB')
        if max(im.size) > MAX_SIDE:
            im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        return np.asarray(im).copy()


def read_rgba(path: Path) -> np.ndarray:
    with Image.open(path) as im:
        im = im.convert('RGBA')
        if max(im.size) > MAX_SIDE:
            im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        return np.asarray(im).copy()


def fill(rgb: np.ndarray, hole: np.ndarray) -> np.ndarray:
    """What is behind a nearer layer: TELEA on the (dilated) hole at a working width of 640, so the colours come from
    beyond its soft edge; upsampled, softened, and blended in over a feathered copy of the hole. float32 0..255."""
    rgbf = rgb.astype(np.float32)
    if not hole.any():
        return rgbf
    H, W = hole.shape
    s = min(1.0, 640 / W)
    sw, sh = max(8, int(W * s)), max(8, int(H * s))
    small = cv2.resize(rgb, (sw, sh), interpolation=cv2.INTER_AREA)
    m = cv2.resize(hole.astype(np.uint8) * 255, (sw, sh), interpolation=cv2.INTER_NEAREST)
    m = cv2.dilate(m, np.ones((3, 3), np.uint8))
    painted = cv2.inpaint(small, m, 9, cv2.INPAINT_TELEA)
    painted = cv2.GaussianBlur(painted, (0, 0), 1.6)
    big = cv2.resize(painted, (W, H), interpolation=cv2.INTER_CUBIC).astype(np.float32)
    w = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), max(1.5, W / 900))[..., None]
    w = np.clip(w * 2, 0, 1)
    return rgbf * (1 - w) + big * w


def unmix(I: np.ndarray, B: np.ndarray, a: np.ndarray) -> np.ndarray:
    """The front colour F of a soft edge, from I = (1-a)·B + a·F (matting compositing equation)."""
    a3 = a[..., None]
    F = (I - (1 - a3) * B) / np.maximum(a3, 1e-3)
    F = np.clip(F, 0, 255)
    keep = a3 < .04   # too thin to solve: keep the picture
    return np.where(keep, I, F)


def _clean(mask: np.ndarray, min_frac: float = .002) -> np.ndarray:
    """Drop specks and pin-holes from a hard layer mask."""
    k = max(3, mask.shape[1] // 400) | 1
    m = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN, np.ones((k, k), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((k, k), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    keep = np.zeros(n, bool)
    keep[1:] = stats[1:, cv2.CC_STAT_AREA] >= min_frac * mask.size
    m = keep[lab].astype(np.uint8)
    inv = 1 - m   # fill small holes inside the layer too
    n, lab, stats, _ = cv2.connectedComponentsWithStats(inv, 8)
    small = np.zeros(n, bool)
    small[1:] = stats[1:, cv2.CC_STAT_AREA] < min_frac * mask.size
    m[small[lab] & (inv > 0)] = 1
    return m.astype(bool)


def cut_level(d: np.ndarray, gray: np.ndarray, q: float, window: float = .12) -> float:
    """A depth threshold near quantile q that runs along the picture's own edges (so a layer boundary sits on an
    outline, not across a smooth floor)."""
    sm = cv2.resize(d, (320, max(8, int(320 * d.shape[0] / d.shape[1]))), interpolation=cv2.INTER_AREA)
    g = cv2.resize(gray, (sm.shape[1], sm.shape[0]), interpolation=cv2.INTER_AREA)
    edge = np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1))
    best, best_score = float(np.quantile(d, q)), -1.0
    for qq in np.linspace(max(.05, q - window), min(.95, q + window), 13):
        t = float(np.quantile(sm, qq))
        m = (sm > t).astype(np.uint8)
        b = cv2.morphologyEx(m, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8)) > 0
        if b.sum() < 10:
            continue
        score = float(edge[b].mean()) * (1 - abs(qq - q))   # on edges, and not far from the asked quantile
        if score > best_score:
            best, best_score = float(np.quantile(d, qq)), score
    return best


def split(rgb: np.ndarray, allow_model: bool = True, q=(0.45, 0.80)) -> tuple:
    d, how = depth_map(rgb, allow_model)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
    if how == 'fallback-saliency':   # plateaus: background ≤ .3 · subject .7 · nearest 1
        t1, t2 = .5, .85
    else:
        t1 = cut_level(d, gray, q[0])
        t2 = max(cut_level(d, gray, q[1], .08), t1 + 1e-3)
    h1 = _clean(d > t1)
    h2 = _clean(d > t2) & h1
    # soft mattes: the hard cut snapped to the picture's edges, a few pixels wide
    r = max(2, rgb.shape[1] // 600)
    a1 = np.clip(guided(gray, h1.astype(np.float32), r, 1e-3), 0, 1)
    a2 = np.clip(guided(gray, h2.astype(np.float32), r, 1e-3), 0, 1)
    a1 = cv2.GaussianBlur(a1, (0, 0), .8)
    a2 = np.minimum(cv2.GaussianBlur(a2, (0, 0), .8), a1)
    a1[a1 < .01], a2[a2 < .01] = 0, 0
    a1[a1 > .99], a2[a2 > .99] = 1, 1
    k = max(3, rgb.shape[1] // 300) | 1
    ker = np.ones((k, k), np.uint8)
    I = rgb.astype(np.float32)
    B1 = fill(rgb, cv2.dilate(h1.astype(np.uint8), ker) > 0)           # the background behind everything nearer
    B2 = fill(rgb, cv2.dilate(h2.astype(np.uint8), ker) > 0)           # the subject plane behind the foreground
    S0 = unmix(I, B1, a1)                                               # the subject's own colours at its edge
    c2 = np.clip((a2 - .02) * 8, 0, 1)[..., None]
    sub = S0 * (1 - c2) + B2 * c2                                       # …with the foreground's area filled
    Y = B1 * (1 - a1[..., None]) + sub * a1[..., None]
    fg = unmix(I, Y, a2)
    bg = np.clip(B1, 0, 255).astype(np.uint8)
    sub = np.clip(sub, 0, 255).astype(np.uint8)
    fg = np.clip(fg, 0, 255).astype(np.uint8)
    return bg, sub, fg, a1.astype(np.float32), a2.astype(np.float32), d, how


def recompose(L: 'Layers') -> np.ndarray:
    """The three layers back together, nothing moved — the owner's picture to within rounding."""
    a1, a2 = L.a_sub[..., None], L.a_fg[..., None]
    out = L.bg.astype(np.float32) * (1 - a1) + L.sub.astype(np.float32) * a1
    out = out * (1 - a2) + L.fg.astype(np.float32) * a2
    return np.clip(out + .5, 0, 255).astype(np.uint8)




def load(path: Path, allow_model: bool = True, log=None) -> Layers:
    path = Path(path)
    data = path.read_bytes()
    sha = hashlib.sha256(data).hexdigest()
    rgb = read_rgb(path)
    key = CACHE / f'{sha[:24]}-{VERSION}-{"m" if allow_model else "f"}.npz'
    if key.exists():
        try:
            z = np.load(key)
            L = Layers(rgb, z['bg'], z['sub'], z['fg'], z['a_sub'].astype(np.float32) / 255, z['a_fg'].astype(np.float32) / 255,
                       z['depth'].astype(np.float32) / 65535, str(z['method']), sha)
            if L.bg.shape == rgb.shape:
                return L
        except Exception:  # noqa: BLE001 — a broken cache entry is rebuilt
            pass
    bg, sub, fg, a1, a2, d, how = split(rgb, allow_model)
    if log:
        log(f'layers: {path.name} → {how}')
    try:
        CACHE.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(key, bg=bg, sub=sub, fg=fg, a_sub=(a1 * 255).astype(np.uint8), a_fg=(a2 * 255).astype(np.uint8),
                            depth=(d * 65535).astype(np.uint16), method=np.array(how))
    except OSError:
        pass
    return Layers(rgb, bg, sub, fg, a1, a2, d, how, sha)
