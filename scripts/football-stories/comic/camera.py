"""The camera: where the view sits on a panel at time t, and how each depth layer follows it.

A view is a centre (panel-normalised) and a zoom (1 = the largest frame of the output's aspect that fits the panel).
Nearer layers follow the camera further than the background (parallax): a push-in pushes the foreground more, a
dolly slides it across. Every curve is eased; nothing starts or stops on a jolt.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

PARALLAX = {'bg': 0.0, 'sub': 0.3, 'fg': 0.7}


def ease_io(k: float) -> float:          # cubic in-out
    k = min(1.0, max(0.0, k))
    return 4 * k ** 3 if k < .5 else 1 - (-2 * k + 2) ** 3 / 2


def ease_out(k: float) -> float:         # quartic out
    k = min(1.0, max(0.0, k))
    return 1 - (1 - k) ** 4


def ease_sine(k: float) -> float:
    k = min(1.0, max(0.0, k))
    return -(math.cos(math.pi * k) - 1) / 2


def back(k: float, s: float = 1.9) -> float:
    k = min(1.0, max(0.0, k)) - 1
    return 1 + (s + 1) * k ** 3 + s * k ** 2


def ease_crash(k: float) -> float:       # quintic out over the first third, then resting
    k = min(1.0, max(0.0, k / .35))
    return 1 - (1 - k) ** 5


EASE = {'io': ease_io, 'out': ease_out, 'sine': ease_sine, 'crash': ease_crash, 'linear': lambda k: min(1.0, max(0.0, k))}


@dataclass
class View:
    cx: float
    cy: float
    z: float
    rot: float = 0.0          # degrees
    par: float = 1.0          # how strongly this move separates the layers


# move → (start view, end view, ease, parallax strength); built around a focus point and an amount
def plan(move: str, focus=(0.5, 0.5), amount: float | None = None, ease: str | None = None):
    fx, fy = focus
    a = amount
    if move in ('push', 'push_in'):
        a = a or .16
        return View(.5, .5, 1.04), View(fx, fy, 1.04 + a), EASE[ease or 'io'], 1.0
    if move in ('pull', 'pull_out'):
        a = a or .16
        return View(fx, fy, 1.04 + a), View(.5, .5, 1.04), EASE[ease or 'io'], 1.0
    if move in ('pan_l', 'pan_r', 'pan_up', 'pan_down'):
        a = a or .1
        z = 1.12 + a
        d = {'pan_l': (1, 0), 'pan_r': (-1, 0), 'pan_up': (0, 1), 'pan_down': (0, -1)}[move]
        # pan_l = the camera moves left (the picture slides right)
        return (View(fx + d[0] * a * .9, fy + d[1] * a * .9, z), View(fx - d[0] * a * .9, fy - d[1] * a * .9, z),
                EASE[ease or 'sine'], .8)
    if move in ('dolly_l', 'dolly_r'):
        a = a or .05
        s = 1 if move == 'dolly_r' else -1
        return View(fx - s * a, fy, 1.14), View(fx + s * a, fy, 1.16), EASE[ease or 'sine'], 1.7
    if move == 'slowmo':
        a = a or .045
        return View(fx, fy, 1.06), View(fx, fy, 1.06 + a), EASE[ease or 'sine'], 1.4
    # draft 2 directions (owner, 4.11.2026): a crane, an orbit with a 3-D tilt, a crash zoom, a follow down a tunnel
    if move == 'crane_down':   # from above the desk, down and onto the subject
        a = a or .14
        return View(fx, fy - a, 1.04), View(fx, fy + a * .2, 1.06 + a * .9), EASE[ease or 'io'], 1.3
    if move == 'crane_up':     # rise up the picture (a floodlight, a stand), a little closer
        a = a or .14
        return View(fx, fy + a, 1.1), View(fx, fy - a, 1.16), EASE[ease or 'io'], 1.3
    if move == 'orbit':        # round the subject: a slow sideways slide with the frame rolling through it
        a = a or .06
        return View(fx - a, fy, 1.14, -1.8), View(fx + a, fy, 1.18, 1.8), EASE[ease or 'sine'], 1.5
    if move == 'tilt3d':       # slow motion with the world tipping past the lens
        a = a or .06
        return View(fx, fy, 1.08, -2.6), View(fx, fy, 1.08 + a, 2.6), EASE[ease or 'sine'], 1.5
    if move == 'crash':        # a crash zoom: most of the way in the first few frames
        a = a or .42
        return View(.5, .5, 1.04), View(fx, fy, 1.04 + a), EASE[ease or 'crash'], 1.2
    if move == 'follow':       # walking in behind someone: forward, the far layers opening up
        a = a or .3
        return View(fx, fy + .04, 1.04), View(fx, fy, 1.04 + a), EASE[ease or 'io'], 1.6
    if move == 'hold':
        a = a or .025
        return View(fx, fy, 1.05), View(fx, fy, 1.05 + a), EASE[ease or 'sine'], .6
    if move == 'static':
        return View(fx, fy, 1.0), View(fx, fy, 1.0), EASE['linear'], 0.0
    raise ValueError(f'unknown move: {move}')


MOVES = ('push', 'pull', 'pan_l', 'pan_r', 'pan_up', 'pan_down', 'dolly_l', 'dolly_r', 'slowmo', 'hold', 'static',
         'crane_down', 'crane_up', 'orbit', 'tilt3d', 'crash', 'follow')


def view_at(move, k: float, focus=(0.5, 0.5), amount=None, ease=None) -> tuple[View, View]:
    """(current view, start view) at progress k in 0..1 (k may run past 1: the camera rests)."""
    a, b, e, par = plan(move, focus, amount, ease)
    u = e(k)
    v = View(a.cx + (b.cx - a.cx) * u, a.cy + (b.cy - a.cy) * u, a.z + (b.z - a.z) * u, a.rot + (b.rot - a.rot) * u, par)
    return v, a


def handheld(t: float, amp: float = 1.0, seed: int = 0) -> tuple[float, float, float]:
    """A gentle, smooth micro-shake (sum of slow sines): (dx, dy) in output pixels, rotation in degrees."""
    r = np.random.default_rng(seed)
    ph = r.uniform(0, 6.283, 6)
    dx = (math.sin(t * 1.7 + ph[0]) * .6 + math.sin(t * 4.3 + ph[1]) * .3 + math.sin(t * 9.1 + ph[2]) * .1) * 3.2 * amp
    dy = (math.sin(t * 1.3 + ph[3]) * .6 + math.sin(t * 3.7 + ph[4]) * .3 + math.sin(t * 8.3 + ph[5]) * .1) * 2.4 * amp
    rot = math.sin(t * 1.1 + ph[0] * 2) * .12 * amp
    return dx, dy, rot


def impact(t: float, t0: float, amp: float = 18.0, dur: float = .35, seed: int = 3) -> tuple[float, float]:
    """A decaying hit-shake after t0 (output pixels)."""
    k = (t - t0) / dur
    if k < 0 or k > 1:
        return 0.0, 0.0
    d = amp * (1 - k) ** 2
    return d * math.sin(t * 91 + seed), d * math.cos(t * 77 + seed * 2)


def _fit(panel_wh, out_wh):
    Wp, Hp = panel_wh
    Wo, Ho = out_wh
    asp_o = Wo / Ho
    vh = Hp if Wp / Hp >= asp_o else Wp / asp_o
    return vh * asp_o, vh


def valid(panel_wh, out_wh, v: View) -> View:
    """The same view with its centre moved just enough that the frame stays on the panel."""
    Wp, Hp = panel_wh
    vw, vh = _fit(panel_wh, out_wh)
    z = max(v.z, 1.0)
    hx, hy = vw / z / 2 / Wp, vh / z / 2 / Hp
    return View(min(max(v.cx, hx), 1 - hx), min(max(v.cy, hy), 1 - hy), z, v.rot, v.par)


def layer_matrix(panel_wh, out_wh, view: View, start: View, p: float, extra=(0.0, 0.0, 0.0, 1.0)):
    """2x3 affine panel→output for a layer of parallax p. extra = (dx, dy, rot°, scale) applied in output space.
    The background (p=0) always stays on the panel; a nearer layer runs ahead of it by the parallax factor."""
    Wp, Hp = panel_wh
    Wo, Ho = out_wh
    vw, vh = _fit(panel_wh, out_wh)
    view, start = valid(panel_wh, out_wh, view), valid(panel_wh, out_wh, start)
    k = 1 + p * view.par
    z = start.z * (view.z / start.z) ** k
    cxp = (start.cx + (view.cx - start.cx) * k) * Wp
    cyp = (start.cy + (view.cy - start.cy) * k) * Hp
    s = Wo / (vw / z)
    dx, dy, rot, sc = extra
    s *= sc
    th = math.radians(rot)
    c, si = math.cos(th) * s, math.sin(th) * s
    ox, oy = Wo / 2 + dx, Ho / 2 + dy
    return np.array([[c, -si, ox - c * cxp + si * cyp], [si, c, oy - si * cxp - c * cyp]], np.float32)


def apply(M: np.ndarray, x: float, y: float) -> tuple[float, float]:
    return float(M[0, 0] * x + M[0, 1] * y + M[0, 2]), float(M[1, 0] * x + M[1, 1] * y + M[1, 2])
