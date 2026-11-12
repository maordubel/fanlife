"""The film's look: the camera moves a director asks for, the grade (vignette, letterbox, light leaks, the hush of a
defeat), the transitions between shots, and the b-roll the cinema puts behind a data card.

All of it is deterministic, and all of it runs per frame in numpy at a cost a 4-worker runner can carry for a
10-minute film: a few full-frame array operations, never a resample of the whole canvas twice.
"""
from __future__ import annotations

import hashlib
import math
from functools import lru_cache

import numpy as np
from PIL import Image

from ..common import H, W
from ..motion import ease_in_out, ease_out_cubic
from ..paper import CANVAS, beat_path, piece_meta

CW, CH = CANVAS
MOVES = ('push', 'pull', 'whip', 'drift', 'slow', 'orbit')
# Owner: "a feeling of epilepsy, the pictures shake" (rule 142). The shaking camera is gone; a script saved before that
# may still ask for it, and gets the calm move that lands the same beat.
CALM = {'shake': 'push'}


def _handheld(t: float, amp: float, seed: int) -> tuple[float, float]:
    s = seed % 97
    return (amp * (math.sin(t * 1.7 + s) * 0.6 + math.sin(t * 3.1 + s * 0.3) * 0.4),
            amp * (math.cos(t * 1.3 + s * 0.7) * 0.6 + math.sin(t * 2.6 + s) * 0.4))


def move(name: str | None, dur: float, seed: int = 0, pace: str | None = None):
    """The camera for a shot: t → (zoom, cx, cy) on the canvas. Every move moves; `slow` slows it, `fast` sharpens it."""
    name = CALM.get(name, name)
    name = name if name in MOVES else ('push', 'drift', 'pull', 'orbit')[seed % 4]
    sp = {'fast': 1.6, 'slow': 0.55}.get(pace or '', 1.0)
    side = 1 if seed % 2 else -1
    X, Y = CW / 2, CH / 2
    D = max(dur, 0.5)

    def f(t: float):
        k = ease_in_out(min(1.0, t * sp / D))
        hx, hy = _handheld(t, 1.6, seed)
        if name == 'push':
            return 1.0 + 0.10 * k, X + side * 36 * k + hx, Y - 14 * k + hy
        if name == 'pull':
            return 1.15 - 0.15 * k, X - side * 30 * k + hx, Y + hy
        if name == 'whip':
            w = ease_out_cubic(min(1.0, t / 0.42))
            return 1.07 + 0.03 * k, X + side * (1 - w) * 260 + side * 24 * k + hx, Y + hy
        if name == 'drift':
            return 1.08, X + side * (-70 + 140 * k) + hx, Y + 10 * math.sin(t * 0.5) + hy
        if name == 'slow':
            return 1.0 + 0.045 * k, X + hx * 0.5, Y + hy * 0.5
        th = -0.6 * math.pi + math.pi * k  # orbit
        return 1.09 + 0.025 * math.sin(th), X + 72 * math.cos(th) * side, Y + 34 * math.sin(th)
    return f


def parallax(camera, factor: float = -0.18):
    """Screen-space offset that moves a card against the world under it, so a flat card reads as a plane in front."""
    def off(t):
        z, cx, cy = camera(t)
        return (cx - CW / 2) * factor * z, (cy - CH / 2) * factor * z
    return off


# ------------------------------------------------------------------ the grade
@lru_cache(maxsize=4)
def _vignette(strength: float) -> np.ndarray:
    yy, xx = np.mgrid[0:H, 0:W].astype('float32')
    r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    return (1 - strength * np.clip(r - 0.45, 0, 1.2) ** 1.7)[..., None].astype('float32')


@lru_cache(maxsize=1)
def _leak_blob() -> Image.Image:
    yy, xx = np.mgrid[0:270, 0:960].astype('float32')
    g = np.exp(-(((xx - 480) / 150) ** 2 + ((yy - 120) / 110) ** 2))
    return Image.fromarray((g * 255).astype('uint8'), 'L')


LEAK = np.array([255, 255, 255], 'float32')  # a neutral screen keeps every pixel's hue exactly: a leak cannot print a rival colour
LETTERBOX = int(round((H - W / 2.35) / 2))  # 2.35:1 inside 16:9


class Grade:
    """Per-frame finishing, applied to the picture before the glass graphics (scorebug, lower-third, captions)."""

    def __init__(self, *, vignette: float = 0.28, letterbox: bool = False, hush: bool = False, leak: bool = False,
                 seed: int = 0, dur: float = 10.0, slow: bool = False, warm: bool = False):
        self.vig = _vignette(round(vignette, 2)) if vignette else None
        self.letterbox, self.hush, self.leak, self.seed, self.dur, self.slow = letterbox, hush, leak, seed, dur, slow
        # the Terrace's warm print: a touch more red-orange in the paper and less blue, a little lifted shadows — a shift
        # small enough (and towards orange, a family no club bans) that no rival colour can come out of it
        self.warm = np.array([1.035, 1.0, 0.93], 'float32') if warm else None

    def __call__(self, t: float, arr: np.ndarray) -> np.ndarray:
        out = arr.astype('float32')
        if self.hush:  # a defeat: the colour drains out and the picture sinks a little
            k = 0.62 * ease_in_out(min(1.0, (t - 0.2) / 1.2)) if t > 0.2 else 0.0
            if k:
                lum = out @ np.array([0.299 * k, 0.587 * k, 0.114 * k], 'float32')
                out *= (1 - k)
                out += lum[..., None]
                out *= 1 - 0.12 * k
        if self.leak:
            ph = (self.seed % 7) / 7
            x = 0.15 + 0.7 * (((t / max(self.dur, 1)) * 0.6 + ph) % 1.0)
            strength = 0.30 * (0.6 + 0.4 * math.sin(t * 1.1 + self.seed))
            x0 = 480 * (1 - x)  # the window slides over a wider strip, so the glow drifts across the frame
            # only the columns the glow reaches are touched (the blob is 2.2 sigma wide either side of its centre)
            c0, c1 = max(0.0, 150 - x0), min(480.0, 810 - x0)
            if c1 - c0 > 4:
                f0, f1 = int(c0 * 4), int(c1 * 4)
                blob = _leak_blob().resize((f1 - f0, H), Image.BILINEAR, box=(x0 + c0, 0, x0 + c1, 270))
                m = np.asarray(blob, 'float32')[..., None] * (strength / 255)
                part = out[:, f0:f1]
                room = 255 - part           # screen blend: part + (255 - part) * m * leak
                room *= m * (LEAK / 255)
                part += room
        if self.warm is not None:
            # only the paper and the greys take the tint (a saturated pixel keeps its hue exactly), so the shift can never
            # turn a scrubbed green-yellow into the rival's yellow: a tinted grey stays under 0.12 saturation
            mx, mn = out.max(-1), out.min(-1)
            k = np.clip(1 - (mx - mn) / np.maximum(mx, 1) / 0.22, 0, 1)[..., None]
            out = out * (1 + k * (self.warm - 1)) + 6 * k
        if self.vig is not None:
            out *= self.vig
        if self.letterbox:
            k = ease_out_cubic(min(1.0, t / 0.5))
            b = int(LETTERBOX * k)
            if b:
                out[:b] = 9
                out[H - b:] = 9
        return np.clip(out, 0, 255).astype('uint8')


# ------------------------------------------------------------------ transitions
def _blur_x(a: np.ndarray, r: int) -> np.ndarray:
    if r < 2:
        return a
    c = np.cumsum(np.pad(a.astype('int32'), ((0, 0), (r, r), (0, 0)), mode='edge'), axis=1)
    return ((c[:, 2 * r:] - c[:, :-2 * r]) // (2 * r)).astype('uint8')[:, :W]


def _scaled(a: np.ndarray, s: float) -> np.ndarray:
    im = Image.fromarray(a)
    w, h = W / s, H / s
    return np.asarray(im.transform((W, H), Image.EXTENT, ((W - w) / 2, (H - h) / 2, (W + w) / 2, (H + h) / 2), Image.BILINEAR))


ENTRY_DUR = {'whip': 0.3, 'push': 0.36, 'burn': 0.62, 'flash': 0.2, 'dissolve': 0.7, 'split': 1.25}


def blend(entry: str, t: float, frame: np.ndarray, prev: np.ndarray | None, side: int = 1) -> np.ndarray | None:
    """The cinema's own entries; None when the entry is not one of them (motion.blend_entry handles the rest)."""
    if entry == 'flash':
        if t >= ENTRY_DUR['flash']:
            return frame
        k = 1 - t / ENTRY_DUR['flash']
        return np.clip(frame.astype('float32') * (1 - k) + 250 * k, 0, 255).astype('uint8')
    if entry == 'cut':
        return frame
    if entry not in ENTRY_DUR or t >= ENTRY_DUR[entry]:
        return frame if entry in ENTRY_DUR else None
    if prev is None:
        return frame
    k = t / ENTRY_DUR[entry]
    if entry == 'whip':  # the old shot smears out one way, the new one smears in from the other
        e = ease_in_out(k)
        off = int(e * W) * side
        r = int(90 * math.sin(math.pi * k)) + 1
        a = _blur_x(prev, r)
        b = _blur_x(frame, r)
        out = np.empty_like(frame)
        if side > 0:
            out[:, :W - off] = a[:, off:] if off < W else out[:, :0]
            out[:, W - off:] = b[:, :off]
        else:
            o = -off
            out[:, o:] = a[:, :W - o]
            out[:, :o] = b[:, W - o:]
        return out
    if entry == 'push':  # push through the old picture into the new one
        e = ease_in_out(k)
        a = _scaled(prev, 1 + 0.5 * e).astype('float32')
        b = _scaled(frame, 0.86 + 0.14 * e).astype('float32')
        return np.clip(a * (1 - e) + b * e, 0, 255).astype('uint8')
    if entry == 'split':  # the parallel cut: the old scene holds on the left, the new one plays on the right, then takes over
        out = frame.copy()
        if k < 0.7:
            edge = W // 2
        else:
            edge = int(W / 2 * (1 - ease_in_out((k - 0.7) / 0.3)))
        if edge > 0:
            src = prev[:, W // 4: W // 4 + edge]
            out[:, :edge] = src[:, :edge]
            out[:, max(0, edge - 5):edge + 5] = 245
        return out
    if entry == 'dissolve':
        e = ease_in_out(k)
        return (prev.astype('float32') * (1 - e) + frame.astype('float32') * e).astype('uint8')
    if entry == 'burn':  # film burn: the old frame overexposes from a corner to white, the new one develops out of it
        yy, xx = _burn_grid()
        cx, cy = (0.82, 0.25) if side > 0 else (0.18, 0.75)
        r = np.sqrt(((xx - cx) * 1.6) ** 2 + (yy - cy) ** 2)
        if k < 0.5:
            e = k / 0.5
            m = np.clip((e * 1.9 - r) * 2.6, 0, 1)[..., None]
            base = prev.astype('float32')
        else:
            e = (k - 0.5) / 0.5
            m = np.clip((1 - e) * 1.6 - r * 0.6, 0, 1)[..., None]
            base = frame.astype('float32')
        hot = np.array([255, 236, 214], 'float32')
        return np.clip(base * (1 - m) + hot * m, 0, 255).astype('uint8')
    return None


@lru_cache(maxsize=1)
def _burn_grid():
    yy, xx = np.mgrid[0:H, 0:W].astype('float32')
    return yy / H, xx / W


# ------------------------------------------------------------------ b-roll
BROLL = {
    'europe': ('europe-stadium-night-n', 'foreign-stadium-stands-n', 'stadium-night-bowl-n', 'crowd-scarves-night-kr', 'home-end-night-kr'),
    'away': ('away-end-arrival-kr', 'away-end-arrival-b-kr', 'away-fence-group-kr', 'train-supporters-kr', 'foreign-stadium-stands-n'),
    'home': ('home-end-night-kr', 'home-end-night-b-kr', 'terrace-full-kr', 'terrace-full-b-kr', 'street-matchday-crowd-kr', 'turnstile-queue-kr'),
    'win': ('celebration-pile-kr', 'celebration-pile-b-kr', 'ball-in-net-kr', 'ball-in-net-b-kr', 'terrace-full-kr', 'choreography-kr'),
    'goal': ('ball-in-net-kr', 'ball-in-net-b-kr', 'header-goalmouth-kr', 'header-goalmouth-b-kr', 'volley-edge-box-kr', 'volley-edge-box-b-kr'),
    'loss': ('despair-kneeling-kr', 'despair-kneeling-b-kr', 'dressing-room-silence-kr', 'stand-roof-rain-kr', 'rain-stadium-n', 'relegation-rain-kr'),
    'draw': ('last-minute-clock-n', 'last-minute-clock-b-n', 'close-fingers-crossed-kr', 'close-hands-clasp-prayer-kr', 'close-hands-fence-kr'),
    'final': ('trophy-lift-crowd-kr', 'trophy-lift-crowd-b-kr', 'final-whistle-arms-kr', 'open-top-bus-kr', 'tr-confetti-cover-kr'),
    'derby': ('choreography-kr', 'choreography-b-kr', 'flags-pole-kr', 'tifo-making-kr', 'home-end-night-kr'),
    'record': ('scrapbook-desk-kr', 'old-photo-wall-kr', 'old-photo-wall-b-kr', 'radio-scarf-ticket-table', 'archive-trophy-spotlight'),
    'form': ('terrace-full-kr', 'crowd-scarves-night-kr', 'street-lamp-crowd-kr', 'terrace-fence-scarves-kr', 'kick-off-centre-kr'),
    'trailer': ('tunnel-bright-pitch-n', 'tunnel-walk-out', 'crowd-scarves-night-kr', 'home-end-night-kr', 'stadium-night-bowl-n', 'tunnel-gate-silhouette-n'),
    'press': ('newspaper-stand-n', 'newspaper-stand-b-n', 'scrapbook-desk-kr', 'tv-shop-window-kr'),
    'tense': ('last-minute-clock-n', 'shootout-line-kr', 'close-hands-clasp-prayer-kr', 'penalty-spot-close-n', 'close-fingers-crossed-b-kr'),
}


def allowed(key: str, bans: list[str]) -> bool:
    if not beat_path(key):
        return False
    meta = piece_meta(key)
    fam = set(meta.get('families') or []) - ({'red'} if meta.get('accent') == 'key-red' else set())
    return not (set(bans) & fam)


WEATHER_WORDS = {'rain': 'rain', 'snow': 'snow', 'fog': 'fog', 'storm': 'storm'}


def pick(moods: list[str], bans: list[str], salt: str, avoid: set[str] | None = None, weather: set[str] | None = None) -> str | None:
    """A fitting picture from the owner's library: the first mood with a usable piece, chosen by a hash of the salt so
    two films (and two shots) differ, never one in the rival's colours, never the picture of the shot before, and never
    a rainy (snowy, foggy) picture unless a claim cited in the beat records that weather (contract §4)."""
    avoid = avoid or set()
    weather = weather or set()

    def dry(s: str) -> bool:
        return all(need in weather for w, need in WEATHER_WORDS.items() if w in s.split('-'))
    for m in moods:
        opts = [f'beat:common/{s}' for s in BROLL.get(m, ()) if dry(s) and allowed(f'beat:common/{s}', bans)]
        fresh = [o for o in opts if o not in avoid] or opts
        if fresh:
            h = int(hashlib.sha256(salt.encode()).hexdigest()[:8], 16)
            return fresh[h % len(fresh)]
    return None


def moods_for(kind: str, f: dict | None, mood: str | None, rival: bool = False) -> list[str]:
    out: list[str] = []
    comp = f"{(f or {}).get('competition') or ''} {(f or {}).get('stage') or ''}".lower()
    if kind == 'trailer':
        out.append('trailer')
    if kind == 'goal':
        out.append('goal')
    if kind in ('record', 'stat', 'fact', 'table', 'timeline'):
        out.append('record')
    if kind in ('press', 'quote'):
        out.append('press')
    if rival:
        out.append('derby')
    if f:
        if 'final' in comp and 'semi' not in comp and f.get('outcome') == 'win':
            out.append('final')
        out.append({'win': 'win', 'loss': 'loss', 'draw': 'draw'}.get(f.get('outcome'), 'form'))
        if any(w in comp for w in ('uefa', 'champions', 'europa', 'conference')):
            out.insert(0 if kind in ('versus', 'matchday') else len(out), 'europe')
        out.append('home' if f.get('side') == 'home' else 'away')
    if mood in ('sad',):
        out.insert(0, 'loss')
    if mood in ('tense',):
        out.append('tense')
    out += ['form', 'home', 'record']
    return out


def motif_piece(motif: str, bans: list[str], club_id: str = '') -> str | None:
    """The library picture that matches the film's motif ("his grandfather's scarf" → beat:common/close-old-man-hands-scarf…):
    the piece whose key and description share the most words with the motif, never one in the rival's colours; None
    when nothing in the library is the motif (the beat then plays without it)."""
    import re as _re
    from ..paper import BEATS, beat_index
    words = {w for w in _re.findall(r'[a-z]+', motif.lower()) if len(w) >= 4} - {'that', 'with', 'from', 'this', 'their', 'there'}
    words |= {w[:-1] for w in words if w.endswith('s') and len(w) > 4}
    if not words:
        return None
    best, best_score = None, 0
    # the shared sets, and a set made for this club; never another film's own pictures
    sets = [d for d in sorted(p.name for p in BEATS.iterdir() if p.is_dir())
            if d in ('common', 'papercut-library') or (club_id and d.startswith(club_id))]
    for d in sets:
        for piece in beat_index(d):
            text = (piece['key'].split('/', 1)[-1].replace('-', ' ') + ' ' + str(piece.get('description') or '')).lower()
            toks = set(_re.findall(r'[a-z]+', text))
            score = len(words & toks) + 0.5 * len({w for w in words for t in toks if len(t) >= 4 and (t.startswith(w) or w.startswith(t))})
            if score > best_score and allowed(piece['key'], bans):
                best, best_score = piece['key'], score
    return best if best_score >= 1 else None
