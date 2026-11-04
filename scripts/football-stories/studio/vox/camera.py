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


class CameraPath:
    """`shots`: [{n, start, dur, board, engine: vox|classic, keys: [(t, bx, by, z)] in board units}] in film order."""

    def __init__(self, shots: list[dict], style: dict):
        self.shots = shots
        self.st = style
        self.starts = [s['start'] for s in shots]
        G = style['glide']
        self.win = []
        for i, s in enumerate(shots):
            prev = shots[i - 1] if i else None
            same = bool(prev and prev['engine'] == 'vox' and s['engine'] == 'vox' and prev['board'] == s['board'])
            new_board = s['engine'] == 'vox' and not same
            pre = min(0.4 * G, 0.42 * prev['dur']) if prev else 0.0
            post = min(0.6 * G, 0.45 * s['dur'])
            if new_board:
                pre = min(0.55, 0.4 * prev['dur']) if (prev and prev['engine'] == 'vox') else 0.0
                post = min(1.05, 0.5 * s['dur'])
            self.win.append({'same': same, 'new': new_board, 'pre': pre, 'post': post})

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
        """(time, screen pixels moved in one frame) wherever the camera moves more than a glide can: used by the tests
        to prove the path is continuous except where a chapter changes board."""
        out = []
        T, end = 0.0, self.shots[-1]['start'] + self.shots[-1]['dur']
        prev = self.pose(0.0)
        while T + step < end:
            T += step
            p = self.pose(T)
            if p.board == prev.board:
                d = math.hypot(p.cx - prev.cx, p.cy - prev.cy) * p.z + abs(math.log(p.z / prev.z)) * 1000
                out.append((T, d))
            prev = p
        return out
