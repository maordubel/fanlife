"""Paper puppets: a figure the owner drew cut into parts on one sheet, pinned at the joints and animated.

A puppet sheet (docs/fanlife/64-football-stories-art-round-3.md §1) is one figure cut into separate pieces — head,
torso, upper arms, forearms, thighs, shins, extras — laid flat and apart on a white (or transparent) background, each
piece with a little overlap tab at its joint. This module:

  1. cuts the pieces out of the sheet (alpha): the paper-white background is keyed away (or the sheet's own alpha is
     used), every piece is a connected shape, its edge colours are un-mixed from the white so a moving limb carries no
     white fringe;
  2. pins them together from a rig (JSON, `comic/rigs/<name>.json`): for each part a point inside it (`pick`), its joint
     (`pivot`), its parent and the point on the parent its joint is pinned to (`attach`), and a draw order (`z`).
     Every point is a FRACTION of the sheet (x of its width, y of its height), so the same rig keeps working when the
     sheet is exported at another size;
  3. poses it: a pose is a list of keyframes, each a set of joint angles in degrees (positive = clockwise on screen),
     eased between keys. Built-in poses: kick (striker), dive (keeper), scarf_raise (supporter), head_turn. A rig may
     add or override poses of its own.

The owner's sheet is used as supplied; nothing here redraws, blurs or alters it. Only the background is removed.

    python3 scripts/football-stories/comic/rig.py --sheet <sheet.png> --list            # the pieces it finds
    python3 scripts/football-stories/comic/rig.py --rig rigs/<r>.json --sheet <sheet.png> --pose kick --stills /tmp/k
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from comic import camera as cam  # noqa: E402

RIGS = HERE / 'rigs'
HUMANOID = ('torso', 'head', 'upper_arm_l', 'forearm_l', 'upper_arm_r', 'forearm_r', 'thigh_l', 'shin_l', 'thigh_r', 'shin_r')


class RigError(ValueError):
    pass


# ------------------------------------------------------------------ cutting
@dataclass
class Piece:
    img: np.ndarray            # RGBA uint8, the piece's bounding box
    origin: tuple[int, int]    # where the box sits on the sheet (px)
    area: int
    centre: tuple[float, float]  # sheet px

    @property
    def bbox(self) -> tuple[int, int, int, int]:
        x, y = self.origin
        return x, y, x + self.img.shape[1], y + self.img.shape[0]


def read_sheet(path: Path) -> np.ndarray:
    with Image.open(path) as im:
        return np.asarray(im.convert('RGBA')).copy()


def background_alpha(rgba: np.ndarray, v_min: float = .86, s_max: float = .12) -> np.ndarray:
    """Coverage (0..1) of the pieces. A sheet with real alpha keeps it; a white sheet is keyed: paper-white (bright and
    unsaturated) is background, with a soft ramp so an edge is not a staircase. A soft grey paper shadow under a piece
    is bright and unsaturated too (lighter than `v_min`), and goes with the background; a sheet with darker shadows sets
    its own `key` in the rig."""
    a = rgba[..., 3].astype(np.float32) / 255
    if a.min() < .98:
        return a
    rgb = rgba[..., :3].astype(np.float32) / 255
    v = rgb.max(-1)
    s = (v - rgb.min(-1)) / np.maximum(v, 1e-6)
    # how far a pixel is from "paper": below v_min it is ink, above s_max it is colour
    dv = np.clip((v_min - v) / .08, 0, 1)
    ds = np.clip((s - s_max) / .08, 0, 1)
    return np.maximum(dv, ds)


def cut(rgba: np.ndarray, min_area: float = .0015, v_min: float = .86, s_max: float = .12) -> list[Piece]:
    """Every separate piece on the sheet, largest first. `min_area` is a fraction of the sheet (specks are dropped)."""
    H, W = rgba.shape[:2]
    cov = background_alpha(rgba, v_min, s_max)
    hard = (cov > .5).astype(np.uint8)
    hard = cv2.morphologyEx(hard, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    hard = cv2.morphologyEx(hard, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    n, lab, stats, cents = cv2.connectedComponentsWithStats(hard, connectivity=8)
    keyed = rgba[..., 3].min() >= 250
    out = []
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        if area < min_area * W * H:
            continue
        pad = 3
        x0, y0, x1, y1 = max(0, x - pad), max(0, y - pad), min(W, x + w + pad), min(H, y + h + pad)
        mask = (lab[y0:y1, x0:x1] == i).astype(np.uint8)
        grow = cv2.dilate(mask, np.ones((5, 5), np.uint8)).astype(np.float32)
        alpha = np.clip(cov[y0:y1, x0:x1] * grow, 0, 1)
        piece = rgba[y0:y1, x0:x1].copy()
        if keyed:   # un-mix the white: c = a·fg + (1 − a)·white  →  fg = (c − (1 − a)·white) / a
            c = piece[..., :3].astype(np.float32)
            a3 = np.maximum(alpha[..., None], 1e-3)
            fg = (c - (1 - a3) * 255) / a3
            piece[..., :3] = np.clip(np.where(alpha[..., None] > .02, fg, c), 0, 255).astype(np.uint8)
            piece[..., 3] = (alpha * 255).astype(np.uint8)
        else:
            piece[..., 3] = (np.minimum(piece[..., 3].astype(np.float32) / 255, grow) * 255).astype(np.uint8)
        out.append(Piece(piece, (int(x0), int(y0)), int(area), (float(cents[i][0]), float(cents[i][1]))))
    out.sort(key=lambda p: -p.area)
    return out


# ------------------------------------------------------------------ the rig
@dataclass
class Part:
    name: str
    piece: Piece
    pivot: np.ndarray              # sheet px
    parent: str | None = None
    attach: np.ndarray | None = None
    z: float = 0.0
    rest: float = 0.0


@dataclass
class Rig:
    name: str
    size: tuple[int, int]          # sheet W, H
    parts: dict[str, Part]
    root: str
    poses: dict = field(default_factory=dict)

    def order(self) -> list[str]:
        """Parents before children, then drawn by z."""
        return sorted(self.parts, key=lambda n: (self.parts[n].z, self.depth(n)))

    def depth(self, n: str) -> int:
        d, p = 0, self.parts[n].parent
        while p:
            d, p = d + 1, self.parts[p].parent
        return d

    def matrices(self, angles: dict[str, float], root_dx: float = 0.0, root_dy: float = 0.0) -> dict[str, np.ndarray]:
        """3×3 sheet→sheet transform of every part for these joint angles (degrees, clockwise positive). The root
        turns about its own pivot and moves by (root_dx, root_dy) sheet heights."""
        H = self.size[1]
        out: dict[str, np.ndarray] = {}

        def world(n: str) -> np.ndarray:
            if n in out:
                return out[n]
            p = self.parts[n]
            a = p.rest + float(angles.get(n, 0.0))
            if p.parent is None:
                M = _T(p.pivot[0] + root_dx * H, p.pivot[1] + root_dy * H) @ _R(a + float(angles.get('root', 0.0))) @ _T(-p.pivot[0], -p.pivot[1])
            else:
                M = world(p.parent) @ _T(*p.attach) @ _R(a) @ _T(-p.pivot[0], -p.pivot[1])
            out[n] = M
            return M
        for n in self.parts:
            world(n)
        return out

    def bounds(self, angles: dict | None = None) -> tuple[float, float, float, float]:
        Ms = self.matrices(angles or {})
        xs, ys = [], []
        for n, p in self.parts.items():
            x, y = p.piece.origin
            h, w = p.piece.img.shape[:2]
            c = np.array([[x, y, 1], [x + w, y, 1], [x, y + h, 1], [x + w, y + h, 1]], np.float64) @ Ms[n].T
            xs += list(c[:, 0])
            ys += list(c[:, 1])
        return min(xs), min(ys), max(xs), max(ys)

    def draw(self, frame: np.ndarray, angles: dict, at: tuple[float, float], height: float, flip: bool = False,
             opacity: float = 1.0, root_dx: float = 0.0, root_dy: float = 0.0) -> None:
        """Composite the posed puppet on an RGB frame. `at` = where the root's pivot lands (frame fractions); `height`
        = the figure's rest height as a fraction of the frame height."""
        from comic import fx
        Hf, Wf = frame.shape[:2]
        x0, y0, x1, y1 = self.bounds()
        s = height * Hf / max(1.0, y1 - y0)
        rp = self.parts[self.root].pivot
        G = _T(at[0] * Wf, at[1] * Hf) @ np.diag([-s if flip else s, s, 1.0]) @ _T(-rp[0], -rp[1])
        Ms = self.matrices(angles, root_dx, root_dy)
        for n in self.order():
            p = self.parts[n]
            M = G @ Ms[n] @ _T(*p.piece.origin)
            fx.blit(frame, p.piece.img, M[:2].astype(np.float32), opacity)


def _T(x: float, y: float) -> np.ndarray:
    return np.array([[1, 0, x], [0, 1, y], [0, 0, 1]], np.float64)


def _R(deg: float) -> np.ndarray:
    r = math.radians(deg)
    c, s = math.cos(r), math.sin(r)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], np.float64)


def _pt(v, W: int, H: int, what: str) -> np.ndarray:
    if not (isinstance(v, (list, tuple)) and len(v) == 2 and all(isinstance(c, (int, float)) for c in v)):
        raise RigError(f'{what}: a point is [x, y] as fractions of the sheet')
    if not (-.05 <= v[0] <= 1.05 and -.05 <= v[1] <= 1.05):
        raise RigError(f'{what}: {v} lies outside the sheet')
    return np.array([v[0] * W, v[1] * H], np.float64)


def build(spec: dict, rgba: np.ndarray, name: str = 'rig') -> Rig:
    """A rig from its JSON spec and the sheet's pixels. Every part must `pick` a different piece."""
    H, W = rgba.shape[:2]
    kw = spec.get('key') or {}
    pieces = cut(rgba, float(spec.get('min_area', .0015)), float(kw.get('v', .86)), float(kw.get('s', .12)))
    if not pieces:
        raise RigError('no pieces found on the sheet')
    parts_spec = spec.get('parts') or {}
    if not parts_spec:
        raise RigError('the rig names no parts')
    used: dict[int, str] = {}
    parts: dict[str, Part] = {}
    for pname, ps in parts_spec.items():
        pick = _pt(ps.get('pick'), W, H, f'{pname}.pick')
        idx = _piece_at(pieces, pick)
        if idx is None:
            raise RigError(f'{pname}: no piece under its pick point {ps.get("pick")}')
        if idx in used:
            raise RigError(f'{pname} and {used[idx]} pick the same piece')
        used[idx] = pname
        parts[pname] = Part(pname, pieces[idx], _pt(ps.get('pivot', ps.get('pick')), W, H, f'{pname}.pivot'),
                            ps.get('parent'), _pt(ps['attach'], W, H, f'{pname}.attach') if ps.get('parent') else None,
                            float(ps.get('z', 0)), float(ps.get('rest', 0)))
    roots = [n for n, p in parts.items() if p.parent is None]
    if len(roots) != 1:
        raise RigError(f'a rig has exactly one root (a part without a parent); this one has {roots or "none"}')
    for n, p in parts.items():
        if p.parent is not None and p.parent not in parts:
            raise RigError(f'{n}: parent {p.parent!r} is not a part')
        seen, q = {n}, p.parent
        while q:
            if q in seen:
                raise RigError(f'{n}: the parent chain loops')
            seen.add(q)
            q = parts[q].parent
    poses = {**POSES, **(spec.get('poses') or {})}
    for k, v in (spec.get('poses') or {}).items():
        validate_pose(v, k)
    return Rig(spec.get('name', name), (W, H), parts, roots[0], poses)


def _piece_at(pieces: list[Piece], pt: np.ndarray) -> int | None:
    x, y = pt
    best = None
    for i, p in enumerate(pieces):
        x0, y0, x1, y1 = p.bbox
        if x0 <= x < x1 and y0 <= y < y1 and p.img[int(y - y0), int(x - x0), 3] > 100:
            return i
        if x0 <= x < x1 and y0 <= y < y1 and best is None:
            best = i
    return best


def load(path: Path, sheet: Path | None = None) -> Rig:
    spec = json.loads(Path(path).read_text(encoding='utf-8'))
    if sheet is None:
        raise RigError('a rig needs its sheet (the owner\'s picture, never in the repository)')
    return build(spec, read_sheet(sheet), Path(path).stem)


# ------------------------------------------------------------------ poses
# Angles in degrees, clockwise on screen = positive, for a figure drawn FACING RIGHT (flip the puppet for a figure
# facing left). A hanging limb turned clockwise swings back; counter-clockwise swings it forward and up.
POSES: dict[str, dict] = {
    # a striker's swing: wind the leg back, strike through the ball, follow through; the arms counter the leg
    'kick': {'dur': 1.3, 'keys': [
        {'t': 0.0, 'a': {}},
        {'t': .38, 'a': {'thigh_r': 38, 'shin_r': 62, 'torso': 5, 'upper_arm_l': -38, 'upper_arm_r': 30, 'forearm_l': -20}, 'ease': 'io'},
        {'t': .58, 'a': {'thigh_r': -52, 'shin_r': -8, 'torso': -7, 'upper_arm_l': 26, 'upper_arm_r': -34, 'ball': 0}, 'ease': 'out'},
        {'t': .82, 'a': {'thigh_r': -66, 'shin_r': -4, 'torso': -9, 'upper_arm_l': 30, 'upper_arm_r': -38}, 'ease': 'out'},
        {'t': 1.0, 'a': {'thigh_r': -20, 'shin_r': 8, 'torso': -2}, 'ease': 'io'}]},
    # a keeper's dive to his right: the body lays out along an arc, arms stretched past his head, legs trailing
    'dive': {'dur': 1.1, 'keys': [
        {'t': 0.0, 'a': {}, 'move': [0, 0]},
        {'t': .18, 'a': {'thigh_l': 14, 'thigh_r': 14, 'shin_l': 22, 'shin_r': 22, 'upper_arm_l': -40, 'upper_arm_r': -40},
         'move': [0, .05], 'ease': 'io'},
        {'t': .62, 'a': {'root': 72, 'upper_arm_l': -168, 'upper_arm_r': -158, 'forearm_l': -6, 'forearm_r': -4,
                         'thigh_l': 12, 'thigh_r': -14, 'shin_r': 18, 'head': -10}, 'move': [.42, -.12], 'ease': 'out'},
        {'t': 1.0, 'a': {'root': 84, 'upper_arm_l': -172, 'upper_arm_r': -166, 'thigh_l': 8, 'thigh_r': -10, 'head': -12},
         'move': [.5, .18], 'ease': 'io'}]},
    # a supporter lifts the scarf over his head and holds it there
    'scarf_raise': {'dur': 1.6, 'keys': [
        {'t': 0.0, 'a': {}, 'move': [0, 0]},
        {'t': .45, 'a': {'upper_arm_r': -150, 'forearm_r': -22, 'upper_arm_l': -150, 'forearm_l': -22, 'head': -6},
         'move': [0, -.012], 'ease': 'out'},
        {'t': .75, 'a': {'upper_arm_r': -158, 'forearm_r': -16, 'upper_arm_l': -158, 'forearm_l': -16, 'head': -8},
         'move': [0, -.02], 'ease': 'sine'},
        {'t': 1.0, 'a': {'upper_arm_r': -152, 'forearm_r': -20, 'upper_arm_l': -152, 'forearm_l': -20, 'head': -6},
         'move': [0, -.012], 'ease': 'sine'}]},
    # a look over the shoulder and back
    'head_turn': {'dur': 1.4, 'keys': [
        {'t': 0.0, 'a': {}},
        {'t': .35, 'a': {'head': 24, 'torso': 2}, 'ease': 'io'},
        {'t': .65, 'a': {'head': 24, 'torso': 2}, 'ease': 'linear'},
        {'t': 1.0, 'a': {}, 'ease': 'io'}]},
}


def validate_pose(p: dict, name: str = 'pose') -> None:
    keys = p.get('keys')
    if not keys or not isinstance(keys, list):
        raise RigError(f'{name}: a pose is a list of keys')
    ts = [k.get('t') for k in keys]
    if any(not isinstance(t, (int, float)) for t in ts) or ts != sorted(ts) or ts[0] != 0 or ts[-1] != 1:
        raise RigError(f'{name}: key times run from 0 to 1, in order')
    if float(p.get('dur', 1)) <= 0:
        raise RigError(f'{name}: dur must be positive')
    for k in keys:
        if k.get('ease', 'io') not in cam.EASE:
            raise RigError(f"{name}: unknown ease {k.get('ease')}")


def pose_at(pose: dict, t: float, loop: bool = False) -> tuple[dict[str, float], tuple[float, float]]:
    """Joint angles and root move at pose time t seconds. Between two keys every joint is eased from one to the
    other (a joint a key does not name is at rest there); the move eases the same way."""
    dur = float(pose.get('dur', 1.0))
    u = (t / dur) % 1.0 if loop and t >= dur else min(1.0, max(0.0, t / dur))
    keys = pose['keys']
    j = next((i for i in range(1, len(keys)) if u <= keys[i]['t']), len(keys) - 1)
    a, b = keys[j - 1], keys[j]
    span = max(1e-9, b['t'] - a['t'])
    k = cam.EASE[b.get('ease', 'io')]((u - a['t']) / span)
    names = set(a['a']) | set(b['a'])
    angles = {n: (1 - k) * float(a['a'].get(n, 0)) + k * float(b['a'].get(n, 0)) for n in names}
    ma, mb = a.get('move', [0, 0]), b.get('move', [0, 0])
    move = ((1 - k) * ma[0] + k * mb[0], (1 - k) * ma[1] + k * mb[1])
    return angles, move


# ------------------------------------------------------------------ CLI
def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--sheet', type=Path, required=True)
    ap.add_argument('--rig', type=Path)
    ap.add_argument('--list', action='store_true', help='print the pieces found on the sheet (to write a rig)')
    ap.add_argument('--pose', default='kick')
    ap.add_argument('--stills', type=Path, help='a folder: six frames of the pose as PNG')
    a = ap.parse_args(argv)
    rgba = read_sheet(a.sheet)
    H, W = rgba.shape[:2]
    if a.list or not a.rig:
        for i, p in enumerate(cut(rgba)):
            x0, y0, x1, y1 = p.bbox
            print(f'{i:2d}  centre [{p.centre[0] / W:.3f}, {p.centre[1] / H:.3f}]  box [{x0 / W:.3f}, {y0 / H:.3f}, {x1 / W:.3f}, {y1 / H:.3f}]  area {p.area}')
        return 0
    r = build(json.loads(a.rig.read_text()), rgba, a.rig.stem)
    if a.stills:
        a.stills.mkdir(parents=True, exist_ok=True)
        pose = r.poses[a.pose]
        for i in range(6):
            t = pose.get('dur', 1) * i / 5
            fr = np.full((720, 1280, 3), 244, np.uint8)
            ang, mv = pose_at(pose, t)
            r.draw(fr, ang, (.4, .62), .7, root_dx=mv[0], root_dy=mv[1])
            cv2.imwrite(str(a.stills / f'{a.pose}-{i}.png'), cv2.cvtColor(fr, cv2.COLOR_RGB2BGR))
        print('stills →', a.stills)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
