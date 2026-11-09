"""One camera over the whole film: it glides across the board from beat to beat instead of cutting, pulls back a little
on the way (so you see the board you are crossing), arrives with a small overshoot and settles, drifts while it holds,
and dives through the paper into the next chapter's board.

`CameraPath.pose(T)` is a pure function of the layout (where every panel sits, what every beat wants to look at, the
shot timings): every render worker computes the same path, so a glide that starts in one shot and lands in the next is
seamless even when two different processes render the two shots.
"""
from __future__ import annotations

import bisect
import math
from dataclasses import dataclass

from ..motion import clamp
from .elements import ease_io3


@dataclass
class Pose:
    board: int
    cx: float
    cy: float
    z: float
    rot: float = 0.0
    through: float = 0.0   # 0..1: diving through the paper (chapter change) — the renderer adds the zoom blur
    arrive: float = 0.0    # 0..1: just surfaced on a new board


def _smooth(x: float) -> float:
    x = clamp(x)
    return x * x * (3 - 2 * x)


def _seg(keys: list, t: float) -> tuple[float, float, float]:
    """Inside one shot: ease between the beat's focus keys (in-out per segment, zoom in log space)."""
    if t <= keys[0][0]:
        _, x, y, z = keys[0]
        return x, y, z
    if t >= keys[-1][0]:
        _, x, y, z = keys[-1]
        return x, y, z
    i = bisect.bisect_right([k[0] for k in keys], t) - 1
    t0, x0, y0, z0 = keys[i]
    t1, x1, y1, z1 = keys[i + 1]
    k = ease_io3((t - t0) / max(1e-3, t1 - t0))
    return x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, math.exp(math.log(z0) + (math.log(z1) - math.log(z0)) * k)


def _retime(keys: list, limit: float) -> list:
    """A move inside a beat that would cross the screen too fast borrows time from the hold before it (never below
    0.2 s of hold), so a push from one detail to the next eases instead of whipping (docs/fanlife/71)."""
    ks = [list(k) for k in keys]
    for i in range(1, len(ks)):
        t0, x0, y0, z0 = ks[i - 1]
        t1, x1, y1, z1 = ks[i]
        travel = math.hypot(x1 - x0, y1 - y0) * max(z0, z1) + abs(math.log(z1 / z0)) * 1000
        need = travel / limit
        if t1 - t0 >= need or i < 2:
            continue
        hold = t0 - ks[i - 2][0]
        take = min(need - (t1 - t0), max(0.0, hold - 0.2))
        ks[i - 1][0] = t0 - take
    return [tuple(k) for k in ks]


class CameraPath:
    """`shots`: [{n, start, dur, board, engine: vox|classic, keys: [(t, bx, by, z)] in board units}] in film order."""

    def __init__(self, shots: list[dict], style: dict):
        shots = [{**s, 'keys': _retime(s['keys'], style.get('max_speed', 1400.0))} if s.get('keys') else s for s in shots]
        self.shots = shots
        self.st = style
        self.starts = [s['start'] for s in shots]
        G = style['glide']
        self.win = []
        for i, s in enumerate(shots):
            prev = shots[i - 1] if i else None
            same = bool(prev and prev['engine'] == 'vox' and s['engine'] == 'vox' and prev['board'] == s['board'])
            new_board = s['engine'] == 'vox' and not same
            # a long way across the board takes a little longer than a short hop to the neighbouring beat
            g = G
            if same:
                a, b = prev['keys'][-1], s['keys'][0]
                g = G * max(0.75, min(1.6, math.hypot(b[1] - a[1], b[2] - a[2]) / 2000))
            pre = min(0.4 * g, 0.42 * prev['dur']) if prev else 0.0
            post = min(0.6 * g, 0.45 * s['dur'])
            if new_board:
                pre = min(0.55, 0.4 * prev['dur']) if (prev and prev['engine'] == 'vox') else 0.0
                post = min(1.05, 0.5 * s['dur'])
            self.win.append({'same': same, 'new': new_board, 'pre': pre, 'post': post})
        # the creep during a hold (board units a second): toward the next beat on the same board, else a slow drift
        v = style.get('lead', 14.0)
        self.lead = []
        for i, s in enumerate(shots):
            nx = shots[i + 1] if i + 1 < len(shots) else None
            a = s['keys'][-1]
            if nx and nx['board'] == s['board'] and nx['engine'] == s['engine']:
                b = nx['keys'][0]
                d = math.hypot(b[1] - a[1], b[2] - a[2])
                self.lead.append(((b[1] - a[1]) / d * v, (b[2] - a[2]) / d * v) if d > 1 else (v, 0.0))
            else:
                self.lead.append((v * 0.8, v * 0.3))

    # the beat's own move, with the hand-held drift that keeps a held frame alive
    def local(self, i: int, t: float) -> Pose:
        s = self.shots[i]
        x, y, z = _seg(s['keys'], t)
        T = s['start'] + t
        amp = 7.0 * self.st.get('roll', 1.2) / 1.2
        x += amp * (math.sin(T * 0.53 + i) * 0.7 + math.sin(T * 1.31) * 0.3)
        y += amp * 0.6 * (math.cos(T * 0.41 + i * 0.7) * 0.7 + math.sin(T * 1.07) * 0.3)
        z *= 1 + 0.006 * math.sin(T * 0.37 + i)
        rot = self.st.get('roll', 1.2) * 0.35 * math.sin(T * 0.23 + i * 1.7)
        # it never stops dead: while it holds it creeps on toward the next beat (the way it is about to go)
        lx, ly = self.lead[i]
        x += lx * t
        y += ly * t
        return Pose(s['board'], x, y, z, rot)

    def pose(self, T: float) -> Pose:
        i = max(0, bisect.bisect_right(self.starts, T) - 1)
        s = self.shots[i]
        # the tail of this shot belongs to the move into the next one
        if i + 1 < len(self.shots):
            nw = self.win[i + 1]
            S1 = self.starts[i + 1]
            if s['engine'] == 'vox' and T >= S1 - nw['pre'] and nw['pre'] > 0:
                if nw['same']:
                    return self.glide(i + 1, T)
                if nw['new']:
                    return self.dive(i, T, S1, nw['pre'])
        w = self.win[i]
        t = T - s['start']
        if w['same'] and t < w['post']:
            return self.glide(i, T)
        if w['new'] and t < w['post']:
            return self.surface(i, t, w['post'])
        return self.local(i, t)

    def glide(self, i: int, T: float) -> Pose:
        """A glide that hands over smoothly at both ends: it leaves the previous beat's own move and joins this beat's,
        so the speed never steps (docs/fanlife/71 — every start and stop eases, nothing jerks)."""
        g = self._glide(i, T)
        w = self.win[i]
        a_t = self.starts[i] - w['pre']
        k = clamp((T - a_t) / max(1e-3, w['pre'] + w['post']))
        if k < 0.3:
            o, m = self.local(i - 1, T - self.starts[i - 1]), _smooth(k / 0.3)
        elif k > 0.7:
            o, m = self.local(i, T - self.starts[i]), 1 - _smooth((k - 0.7) / 0.3)
        else:
            return g
        return Pose(g.board, o.cx + (g.cx - o.cx) * m, o.cy + (g.cy - o.cy) * m, math.exp(math.log(o.z) + (math.log(g.z) - math.log(o.z)) * m),
                    o.rot + (g.rot - o.rot) * m)

    def _glide(self, i: int, T: float) -> Pose:
        """From the previous beat to this one across the board: ease in-out, a pull-back on the way, a small overshoot."""
        w = self.win[i]
        S = self.starts[i]
        a_t = S - w['pre']
        prev = i - 1
        A = self.local(prev, a_t - self.starts[prev])
        B = self.local(i, w['post'])
        k = clamp((T - a_t) / max(1e-3, w['pre'] + w['post']))
        over = self.st.get('over', 0.045)
        e = ease_io3(k) + over * math.sin(math.pi * k ** 1.5)
        x = A.cx + (B.cx - A.cx) * e
        y = A.cy + (B.cy - A.cy) * e
        dist = math.hypot(B.cx - A.cx, B.cy - A.cy)
        bump = self.st.get('bump', 0.24) * clamp(dist / 2400)
        lz = math.log(A.z) + (math.log(B.z) - math.log(A.z)) * clamp(e, 0, 1)
        z = math.exp(lz) * (1 - bump * math.sin(math.pi * k))
        side = 1 if (B.cx - A.cx) >= 0 else -1
        rot = A.rot + (B.rot - A.rot) * k + side * self.st.get('roll', 1.2) * 1.1 * math.sin(math.pi * k)
        return Pose(A.board, x, y, z, rot)

    def dive(self, i: int, T: float, S1: float, pre: float) -> Pose:
        """The end of a chapter: the camera dives into the paper (the next board is under this one)."""
        A = self.local(i, S1 - pre - self.starts[i])
        k = clamp((T - (S1 - pre)) / pre)
        z = A.z * (1 + 4.5 * k ** 2.2)
        return Pose(A.board, A.cx, A.cy, z, A.rot + 3 * k ** 2, through=k)

    def surface(self, i: int, t: float, post: float) -> Pose:
        """A new board: it rises out of the dive — the camera far above the paper, falling onto the first beat."""
        B = self.local(i, post)
        k = clamp(t / post)
        e = 1 - (1 - k) ** 3
        z0 = B.z * 0.42
        z = math.exp(math.log(z0) + (math.log(B.z) - math.log(z0)) * e)
        A = self.local(i, 0.0)
        x = A.cx + (B.cx - A.cx) * e
        y = A.cy + (B.cy - A.cy) * e
        return Pose(B.board, x, y, z, B.rot - 4 * (1 - e), arrive=1 - k)

    def jumps(self, step: float = 1 / 25) -> list[tuple[float, float]]:
        """(time, screen pixels moved in one frame) along the whole path, leaving out the dive into a new chapter's board
        and the fall onto it (the one place the film is meant to break): the tests prove the rest is continuous."""
        out = []
        T, end = 0.0, self.shots[-1]['start'] + self.shots[-1]['dur']
        prev = self.pose(0.0)
        while T + step < end:
            T += step
            p = self.pose(T)
            if p.board == prev.board and not (p.through or prev.through or p.arrive or prev.arrive):
                d = math.hypot(p.cx - prev.cx, p.cy - prev.cy) * p.z + abs(math.log(p.z / prev.z)) * 1000
                out.append((T, d))
            prev = p
        return out

    def flow(self, step: float = 1 / 25) -> dict:
        """The owner's continuous-camera rules, measured (docs/fanlife/71-continuous-camera-edit.md): the camera never
        stops dead (the slowest frame still moves), and no start or stop jerks (the largest frame-to-frame change in
        speed). Same frames as `jumps` — the chapter dive is the one designed break."""
        js = self.jumps(step)
        if len(js) < 3:
            return {'frames': len(js), 'slowest': 0.0, 'dead_frames': 0, 'worst_jerk': 0.0, 'mean': 0.0}
        speeds = [d for _, d in js]
        jerk = [abs(b - a) for a, b in zip(speeds, speeds[1:])]
        return {'frames': len(js), 'slowest': round(min(speeds), 3), 'dead_frames': sum(1 for v in speeds if v < 0.05),
                'worst_jerk': round(max(jerk), 2), 'mean': round(sum(speeds) / len(speeds), 2)}
