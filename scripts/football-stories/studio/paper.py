"""Backgrounds made in code: crumpled newsprint, duotone illustrations and halftone grain. No third-party imagery.

Illustrations (the owner's AI kit art, or a generated one) are re-inked as a two-tone print — ink on newsprint — which also
keeps every frame clear of the club's rival colour family: a two-tone between ink and paper has no saturated hue at all.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

from .common import INK, KIT, NEWSPRINT, H, W, hex_rgb

CANVAS = (int(W * 1.12), int(H * 1.12))


def _noise(shape, rng, scale):
    h, w = shape
    small = rng.random((max(2, h // scale), max(2, w // scale))).astype('float32')
    return np.asarray(Image.fromarray((small * 255).astype('uint8')).resize((w, h), Image.BICUBIC), dtype='float32') / 255


def crumpled(seed: int, size=CANVAS, tone: str = NEWSPRINT) -> Image.Image:
    """Newsprint with creases: low-frequency light, a web of folds lit from the top-left, fibre noise."""
    rng = np.random.default_rng(seed)
    w, h = size
    light = 0.55 * _noise((h, w), rng, 220) + 0.3 * _noise((h, w), rng, 90) + 0.15 * _noise((h, w), rng, 30)
    # folds: random straight creases, each a ridge with a lit and a shaded side
    yy, xx = np.mgrid[0:h, 0:w].astype('float32')
    folds = np.zeros((h, w), 'float32')
    for _ in range(int(rng.integers(9, 15))):
        a = rng.uniform(0, np.pi)
        nx, ny = np.cos(a), np.sin(a)
        c = rng.uniform(-0.3, 1.3) * (w * abs(nx) + h * abs(ny))
        d = (xx * nx + yy * ny - c)
        width = rng.uniform(18, 70)
        strength = rng.uniform(0.25, 0.7)
        side = np.tanh(d / width)
        folds += strength * side * np.exp(-(d / (width * 2.2)) ** 2) * (1 if nx + ny > 0 else -1)
    shade = 0.92 + 0.10 * (light - 0.5) + 0.07 * folds
    fibre = rng.normal(0, 0.018, (h, w)).astype('float32')
    shade = np.clip(shade + fibre, 0.70, 1.06)
    base = np.array(hex_rgb(tone), 'float32')
    img = np.clip(base[None, None, :] * shade[..., None], 0, 255).astype('uint8')
    im = Image.fromarray(img, 'RGB')
    return vignette(im, 0.22)


def vignette(im: Image.Image, amount: float) -> Image.Image:
    w, h = im.size
    yy, xx = np.mgrid[0:h, 0:w].astype('float32')
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    m = 1 - amount * np.clip(r - 0.55, 0, 1) ** 1.5
    a = np.asarray(im, 'float32') * m[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGB')


def duotone(src: Image.Image, dark: str = INK, light: str = NEWSPRINT, contrast: float = 1.08) -> Image.Image:
    """Re-ink any picture as ink on newsprint (keeps alpha)."""
    alpha = src.getchannel('A') if src.mode == 'RGBA' else None
    g = np.asarray(src.convert('L'), 'float32') / 255
    g = np.clip((g - 0.5) * contrast + 0.5, 0, 1)
    d, l = np.array(hex_rgb(dark), 'float32'), np.array(hex_rgb(light), 'float32')
    rgb = (d[None, None] * (1 - g[..., None]) + l[None, None] * g[..., None]).astype('uint8')
    out = Image.fromarray(rgb, 'RGB')
    if alpha is not None:
        out.putalpha(alpha)
    return out


def cover(im: Image.Image, size=CANVAS) -> Image.Image:
    w, h = size
    s = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def library_art(name: str) -> Image.Image:
    p = KIT / 'art' / f'{name}.webp'
    return Image.open(p).convert('RGBA' if name == 'supporter' else 'RGB')


BEATS = KIT / 'beats'
HUES = {'red': ((0, 22), (338, 360)), 'yellow': ((34, 74),), 'green': ((86, 174),), 'blue': ((186, 264),)}


def beat_path(key: str) -> Path | None:
    """`beat:<set>/<slug>` → the owner's colour illustration for a story beat, or None when there is no such piece."""
    if not isinstance(key, str) or not key.startswith('beat:'):
        return None
    rel = key[5:]
    if not re.fullmatch(r'[a-z0-9-]+/[a-z0-9-]+', rel):
        return None
    p = BEATS / f'{rel}.webp'
    return p if p.exists() else None


CLIPS = KIT / 'clips'


def clip_path(key: str) -> Path | None:
    """`clip:<set>/<slug>` → an owner stop-motion clip, or None."""
    if not isinstance(key, str) or not key.startswith('clip:'):
        return None
    rel = key[5:]
    if not re.fullmatch(r'[a-z0-9-]+/[a-z0-9-]+', rel):
        return None
    p = CLIPS / f'{rel}.mp4'
    return p if p.exists() else None


def clip_index(set_id: str) -> list[dict]:
    p = CLIPS / set_id / 'index.json'
    return json.loads(p.read_text(encoding='utf-8'))['pieces'] if p.exists() else []


class ClipWorld:
    """An owner clip as a moving world: decoded once, in order, at the film's frame rate and the canvas size, each
    frame scrubbed of the rival's family, vignetted and (behind a card) darkened. Plays once, then holds its last frame."""

    def __init__(self, path: Path, bans: list[str] | None = None, dim: float = 0.0, size=CANVAS, fps: int = 25,
                 accent: str | None = None):
        import subprocess
        self.w, self.h = size
        self.bans, self.dim, self.accent = bans or [], dim, accent
        self.proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', str(path), '-an', '-vf',
                                      f'fps={fps},scale={self.w}:{self.h}:force_original_aspect_ratio=increase,crop={self.w}:{self.h}',
                                      '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE,
                                     stderr=subprocess.DEVNULL)
        self.n, self.last, self.done = -1, None, False
        yy, xx = np.mgrid[0:self.h, 0:self.w].astype('float32')
        r = np.sqrt(((xx - self.w / 2) / (self.w / 2)) ** 2 + ((yy - self.h / 2) / (self.h / 2)) ** 2)
        shade = 1 - 0.3 * np.clip(r - 0.55, 0, 1) ** 1.6
        self.mul = (shade * (1 - dim))[..., None]
        self.add = (np.array(hex_rgb(INK), 'float32') * dim)[None, None]

    def _read(self) -> Image.Image | None:
        size = self.w * self.h * 3
        buf = self.proc.stdout.read(size) if self.proc.stdout else b''
        if len(buf) < size:
            self.close()
            return None
        im = Image.frombuffer('RGB', (self.w, self.h), buf, 'raw', 'RGB', 0, 1)
        if self.accent:
            im = recolor(im, self.accent)
        im = scrub(im, self.bans)
        a = np.asarray(im, 'float32') * self.mul + self.add
        return Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGB')

    def __call__(self, i: int) -> Image.Image:
        while self.n < i and not self.done:
            fr = self._read()
            if fr is None:
                self.done = True
                break
            self.last, self.n = fr, self.n + 1
        if self.last is None:
            raise RuntimeError('clip produced no frames')
        return self.last

    def close(self):
        if self.proc.stdout and not self.proc.stdout.closed:
            self.proc.stdout.close()
        try:
            self.proc.kill()
        except OSError:
            pass
        self.proc.wait()


def beat_index(set_id: str) -> list[dict]:
    p = BEATS / set_id / 'index.json'
    return json.loads(p.read_text(encoding='utf-8'))['pieces'] if p.exists() else []


KEY_RED = '#C8102E'


def piece_meta(key: str) -> dict:
    """The index entry of an owner piece (beat or clip), or {}."""
    kind, _, rel = str(key).partition(':')
    set_id = rel.split('/')[0]
    for piece in (beat_index(set_id) if kind == 'beat' else clip_index(set_id) if kind == 'clip' else []):
        if piece['key'] == key:
            return piece
    return {}


def recolor(im: Image.Image, to_hex: str | None) -> Image.Image:
    """Pieces drawn with the signal red KEY_RED as their one colour (index `"accent": "key-red"`) wear each club's own
    colour: every red-family pixel takes the club colour's hue, and its saturation and value move by the same ratio
    the club colour stands from KEY_RED, so the paper shading survives."""
    if not to_hex:
        return im
    hsv = np.asarray(im.convert('HSV'), 'float32')
    deg = hsv[..., 0] * (360 / 255)
    hit = ((deg <= 20) | (deg >= 340)) & (hsv[..., 1] >= 0.25 * 255)
    if not hit.any():
        return im
    key = np.asarray(Image.new('RGB', (1, 1), hex_rgb(KEY_RED)).convert('HSV'), 'float32')[0, 0]
    to = np.asarray(Image.new('RGB', (1, 1), hex_rgb(to_hex)).convert('HSV'), 'float32')[0, 0]
    out = hsv.copy()
    out[..., 0] = np.where(hit, to[0], hsv[..., 0])
    out[..., 1] = np.where(hit, np.clip(hsv[..., 1] * to[1] / max(key[1], 1), 0, 255), hsv[..., 1])
    out[..., 2] = np.where(hit, np.clip(hsv[..., 2] * to[2] / max(key[2], 1), 0, 255), hsv[..., 2])
    fixed = np.asarray(Image.fromarray(out.astype('uint8'), 'HSV').convert('RGB'))
    rgb = np.asarray(im.convert('RGB'))
    return Image.fromarray(np.where(hit[..., None], fixed, rgb).astype('uint8'), 'RGB')


def scrub(im: Image.Image, bans: list[str]) -> Image.Image:
    """Take the saturation out of every pixel in a banned colour family (a band wider than the QA's, as rule 44 asks),
    so a warm grass or a lamp in a colour picture can never print the rival's colour."""
    if not bans:
        return im
    hsv = np.asarray(im.convert('HSV'), 'float32')
    deg = hsv[..., 0] * (360 / 255)
    hit = np.zeros(deg.shape, bool)
    for fam in bans:
        for lo, hi in HUES.get(fam, ()):
            hit |= (deg >= lo) & (deg <= hi)
    hit &= hsv[..., 1] >= 0.18 * 255
    if not hit.any():
        return im
    hsv[..., 1] = np.where(hit, np.minimum(hsv[..., 1], 0.16 * 255), hsv[..., 1])
    fixed = np.asarray(Image.fromarray(hsv.astype('uint8'), 'HSV').convert('RGB'))
    rgb = np.asarray(im.convert('RGB'))
    return Image.fromarray(np.where(hit[..., None], fixed, rgb).astype('uint8'), 'RGB')


def art_backdrop(name_or_path: str | Path, size=CANVAS, bans: list[str] | None = None, dim: float = 0.0,
                 accent: str | None = None) -> Image.Image:
    """A library piece is re-inked as a two-tone print; an owner beat illustration keeps its colours, scrubbed of the
    rival's family. `dim` darkens the picture behind a card so the card stays the thing you read."""
    bp = beat_path(name_or_path) if isinstance(name_or_path, str) else None
    if bp:
        out = cover(Image.open(bp).convert('RGB'), size)
        if piece_meta(name_or_path).get('accent') == 'key-red':
            out = recolor(out, accent)
        out = scrub(out, bans or [])
        out = vignette(out, 0.3)
    else:
        src = Image.open(name_or_path).convert('RGB') if isinstance(name_or_path, Path) else library_art(name_or_path).convert('RGB')
        out = vignette(duotone(cover(src, size)), 0.35)
    if dim:
        out = Image.blend(out, Image.new('RGB', out.size, hex_rgb(INK)), dim)
    return out


def supporter_scene(seed: int, size=CANVAS) -> Image.Image:
    """The owner's rear-view supporter, re-inked, standing in a pool of floodlight on dark newsprint."""
    w, h = size
    bg = crumpled(seed, size, '#2A2620')
    yy, xx = np.mgrid[0:h, 0:w].astype('float32')
    glow = np.exp(-(((xx - w * 0.5) / (w * 0.32)) ** 2 + ((yy - h * 0.35) / (h * 0.55)) ** 2))
    a = np.asarray(bg, 'float32') + (np.array(hex_rgb(NEWSPRINT), 'float32') - 40) * (0.42 * glow[..., None])
    bg = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGB')
    fig = duotone(library_art('supporter'), contrast=1.15)
    s = h * 0.95 / fig.height
    fig = fig.resize((round(fig.width * s), round(fig.height * s)), Image.LANCZOS)
    bg.paste(fig, ((w - fig.width) // 2, h - fig.height), fig)
    return vignette(bg, 0.3)


def grain_frames(n: int = 6, seed: int = 7) -> list[np.ndarray]:
    rng = np.random.default_rng(seed)
    return [rng.normal(0, 6.5, (H, W, 1)).astype('int16') for _ in range(n)]


def halftone_overlay(im: Image.Image, cell: int = 7, strength: float = 0.18) -> Image.Image:
    """A soft dot screen over a picture, for the printed look on illustrations."""
    w, h = im.size
    yy, xx = np.mgrid[0:h, 0:w].astype('float32')
    dots = (np.sin(xx * np.pi * 2 / cell) * np.sin(yy * np.pi * 2 / cell) + 1) / 2
    g = np.asarray(im.convert('L'), 'float32') / 255
    m = 1 - strength * (dots > g) * (1 - g)
    a = np.asarray(im.convert('RGB'), 'float32') * m[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGB').filter(ImageFilter.SMOOTH)
