"""The Vox render: lay every beat out on the chapter's board, run one camera over it, and draw each frame.

Per frame: the board (paper, decor, every panel already played, baked once per shot) is cut out by the camera in one
affine transform; the current panel's canvas (its settled pieces baked, its live pieces drawn) goes through the same
transform; cut-outs in front move with a parallax of their own; then the motion blur of a fast glide, the grade, the
glass (scorebug, captions) and the grain. The board and the panel are drawn at their own resolution and only the output
frame is full size, so a 5-minute film renders in minutes on four workers, not hours.
"""
from __future__ import annotations

import math
import os
import subprocess
import time
from concurrent.futures import FIRST_COMPLETED, ProcessPoolExecutor, wait
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

from ..common import FPS, H, W, Palette, StageError, hex_rgb, read_json, write_json
from ..motion import _grain, blend_entry, clamp, ease_in_out, ShotRenderer
from . import elements as E
from .camera import CameraPath, Pose
from .compose import CLASSIC, PW, PH, compose, style_of

RES = 1.25          # panel canvas pixels per unit: crisp up to a 1.25 zoom, soft but clean beyond
BR = 0.7            # board pixels per unit (the panels already played, seen while the camera crosses the board)
MARGIN = 700        # paper around the outermost panels
VERSION = 2
MAX_PANELS = 15     # a longer chapter goes on to a second board (the memory of a board is its width × height)


def director_id(ed) -> str | None:
    from ..cinema.direct import director_of
    d = director_of(ed)
    return (d or {}).get('id')


# ------------------------------------------------------------------ the boards
def place(plan: dict, style: dict, seed: str) -> dict:
    """Which board each beat is on and where its panel sits. A board starts at the open, at every chapter card and
    after a shot that is not on the board; on a board the panels follow a path with a little irregularity, so the
    camera never moves the same way twice running."""
    out = {}
    boards = []
    cur = None
    idx = 0
    direction = style.get('layout', 'snake')
    for s in plan['shots']:
        kind = s['visual']['type']
        if kind in CLASSIC:
            out[s['n']] = {'engine': 'classic', 'board': -1, 'ox': 0.0, 'oy': 0.0}
            cur = None
            continue
        if cur is None or kind == 'chapter' or len(cur['panels']) >= MAX_PANELS:
            cur = {'id': len(boards), 'panels': []}
            boards.append(cur)
            idx = 0
        h = E.hsh(seed, s['n'])
        gx = PW + 320 + (h % 260)
        gy = PH + 300 + ((h >> 8) % 220)
        cols = 3
        r_, c_ = divmod(idx, cols)
        if r_ % 2:                     # a snake: right, right, down, left, left, down…
            c_ = cols - 1 - c_
        jx = ((h >> 4) % 240) - 120
        jy = ((h >> 12) % 200) - 100
        ox, oy = c_ * gx + jx, r_ * gy + jy
        if direction == 'stairs':      # the Trailer Cut: every move a diagonal, a big one
            oy += c_ * 460 if r_ % 2 == 0 else (cols - 1 - c_) * 460
        cur['panels'].append(s['n'])
        out[s['n']] = {'engine': 'vox', 'board': cur['id'], 'ox': float(ox), 'oy': float(oy)}
        idx += 1
    for b in boards:
        xs = [out[n]['ox'] for n in b['panels']]
        ys = [out[n]['oy'] for n in b['panels']]
        x0, y0 = min(xs) - MARGIN, min(ys) - MARGIN
        for n in b['panels']:
            out[n]['ox'] -= x0
            out[n]['oy'] -= y0
        b['w'] = max(xs) - x0 + PW + MARGIN
        b['h'] = max(ys) - y0 + PH + MARGIN
    return {'shots': out, 'boards': boards}


def paper_safe(a: np.ndarray, most: float = 0.2) -> np.ndarray:
    """Warm paper is a beige, never a yellow: wherever the paper's hue sits in the yellow band (38–70°) its
    saturation is held under `most` (the scanner counts a pixel only from 0.35), so no club's rival yellow can come
    out of the table, however warm the director wants it."""
    mx, mn = a.max(-1), a.min(-1)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = np.maximum(mx - mn, 1e-3)
    hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    sat = (mx - mn) / np.maximum(mx, 1)
    band = (hue >= 34) & (hue <= 74) & (sat > most)
    k = np.where(band, most / np.maximum(sat, 1e-3), 1.0)[..., None]
    return mx[..., None] - (mx[..., None] - a) * k


def board_paper(b: dict, seed: int, warm: bool, accent, photos=(), years=(), centres=(), bans=()) -> Image.Image:
    """The table the film is laid out on: warm crumpled newsprint the size of the board, older cuttings and faded
    archive prints scattered in the gutters, the season's years printed huge and faint, and a pencil line from beat to
    beat — the path the camera is about to take."""
    from ..paper import crumpled
    w, h = int(b['w'] * BR), int(b['h'] * BR)
    tone = '#F0DCC6' if warm else '#ECE0CE'
    small = crumpled(seed % 9, (max(64, w // 2), max(64, h // 2)), tone)
    a = np.asarray(small.convert('RGB'), 'float32')
    a = a * (np.array([1.02, 0.985, 0.94], 'float32') if warm else np.array([1.0, 0.985, 0.95], 'float32')) + np.array([8, 6, 3], 'float32')
    a = paper_safe(np.clip(a, 0, 255))
    im = Image.fromarray(a.astype('uint8'), 'RGB').resize((w, h), Image.BICUBIC)
    del a
    rng = np.random.default_rng(seed)
    d = ImageDraw.Draw(im, 'RGBA')
    from ..cinema.type import text as T
    # the years, huge and faint, outlined like a stencil
    for k, yv in enumerate(years[:3]):
        big = T(str(yv), 'ultra', int(900 * BR), (0, 0, 0, 0), stroke=max(2, int(5 * BR)), stroke_fill=(120, 108, 88, 70))
        im.paste(big, (int(rng.uniform(0, max(1, w - big.width))), int(rng.uniform(0, max(1, h - big.height)))), big)
    # cuttings with their columns in grey bars
    for _ in range(int(b['w'] * b['h'] / 1.1e6)):
        sw, sh = rng.uniform(260, 620) * BR, rng.uniform(180, 420) * BR
        scrap, _pad = E.paper(sw / BR, sh / BR, BR, int(rng.integers(0, 9999)), tone=(230, 220, 198), shadow=True)
        sd = ImageDraw.Draw(scrap)
        p0 = _pad
        for kk in range(int(30 * BR), int(sh - 20 * BR), max(1, int(16 * BR))):
            sd.line([(p0 + 16 * BR, p0 + kk), (p0 + sw - 16 * BR - rng.uniform(0, sw * 0.3), p0 + kk)], fill=(150, 140, 120, 150), width=max(1, int(6 * BR)))
        scrap = scrap.rotate(rng.uniform(-9, 9), expand=True, resample=Image.BICUBIC)
        im.paste(scrap, (int(rng.uniform(-scrap.width / 3, w - scrap.width / 2)), int(rng.uniform(-scrap.height / 3, h - scrap.height / 2))), scrap)
    # faded archive prints
    for k, ph in enumerate(photos):
        try:
            src = Image.open(ph).convert('RGB')
        except Exception:  # noqa: BLE001
            continue
        pw_, ph_ = int(rng.uniform(520, 900) * BR), int(rng.uniform(340, 560) * BR)
        s_ = max(pw_ / src.width, ph_ / src.height)
        src = src.resize((max(pw_, int(src.width * s_)), max(ph_, int(src.height * s_))), Image.BILINEAR).crop((0, 0, pw_, ph_))
        from ..paper import scrub
        src = E.photo_treat(scrub(src, bans), amount=0.75)
        src = Image.blend(src, Image.new('RGB', src.size, (236, 226, 204)), 0.35)
        card, pad = E.paper(pw_ / BR + 24, ph_ / BR + 24, BR, seed + k, tone=(246, 240, 226), tape=2)
        card.alpha_composite(src.convert('RGBA'), (int(pad + 12 * BR), int(pad + 12 * BR)))
        card = card.rotate(rng.uniform(-7, 7), expand=True, resample=Image.BICUBIC)
        im.paste(card, (int(rng.uniform(0, max(1, w - card.width))), int(rng.uniform(0, max(1, h - card.height)))), card)
    # the pencil path from beat to beat
    d = ImageDraw.Draw(im, 'RGBA')
    pts = [(x * BR, y * BR) for x, y in centres]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        L = math.hypot(x1 - x0, y1 - y0)
        n = max(2, int(L / (28 * BR)))
        for j in range(0, n - 1, 2):
            a, b_ = j / n, (j + 1) / n
            bend = math.sin(math.pi * a) * 60 * BR
            d.line([(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a + bend), (x0 + (x1 - x0) * b_, y0 + (y1 - y0) * b_ + math.sin(math.pi * b_) * 60 * BR)],
                   fill=(60, 52, 42, 140), width=max(2, int(5 * BR)))
    return im


# ------------------------------------------------------------------ the film
class VoxFilm:
    def __init__(self, ed, plan: dict, job_dir: Path):
        self.ed, self.plan, self.dir = ed, plan, Path(job_dir) / 'vox'
        self.dir.mkdir(parents=True, exist_ok=True)
        self.director = director_id(ed)
        self.style = style_of(self.director)
        self.style['layout'] = 'stairs' if self.director == 'trailer' else 'snake'
        self.seed = f"{ed.ledger.get('club_id')}:{ed.ledger.get('season')}"
        self.shots = {s['n']: s for s in plan['shots']}
        self.order = [s['n'] for s in plan['shots']]
        self.cv = E.Canvas(RES)
        self._panels: dict = {}
        self._board: tuple | None = None
        lp = self.dir / 'layout.json'
        lay = read_json(lp) if lp.exists() else None
        if not lay or lay.get('version') != VERSION or lay.get('plan') != self._plan_key():
            lay = self._layout()
            write_json(lp, lay)
        self.layout = lay
        self.cam = CameraPath(lay['path'], self.style)

    def _plan_key(self) -> str:
        from ..common import sha256_json
        return sha256_json([[s['n'], s['frames'], s['visual']] for s in self.plan['shots']])

    def _layout(self) -> dict:
        pl = place(self.plan, self.style, self.seed)
        path = []
        for s in self.plan['shots']:
            p = pl['shots'][s['n']]
            dur = s['frames'] / FPS
            if p['engine'] == 'vox':
                P = self.panel(s['n'])
                keys = [(t, x + p['ox'], y + p['oy'], z) for (t, x, y, z) in P.focus]
            else:
                keys = [(0.0, 960.0, 540.0, 1.0)]
            path.append({'n': s['n'], 'start': s['start'], 'dur': dur, 'board': p['board'], 'engine': p['engine'], 'keys': keys,
                         'ox': p['ox'], 'oy': p['oy']})
        return {'version': VERSION, 'plan': self._plan_key(), 'path': path, 'boards': pl['boards'],
                'director': self.director}

    def where(self, n: int) -> dict:
        return next(p for p in self.layout['path'] if p['n'] == n)

    def panel(self, n: int):
        if n not in self._panels:
            if len(self._panels) > 3:
                self._panels.pop(next(iter(self._panels)))
            s = self.shots[n]
            try:
                self._panels[n] = compose(self.ed, s, RES, self.style)
            except Exception as e:  # noqa: BLE001 — one beat the board cannot draw must not cost the film
                import sys
                print(f'Vox: beat {n} ({s["visual"].get("type")}) falls back to its picture: {type(e).__name__}: {e}', file=sys.stderr)
                art = (s.get('cinema') or {}).get('broll') or 'terrace-crowd'
                self._panels[n] = compose(self.ed, {**s, 'visual': {'type': 'illustration', 'art': art}}, RES, self.style)
        return self._panels[n]

    # -------------------------------------------------------------- baked pieces
    def canvas_at(self, P, t: float, base: Image.Image | None = None, live_only: bool = False) -> Image.Image:
        cv = self.cv
        out = base.copy() if base is not None else Image.new('RGBA', cv.size, (0, 0, 0, 0))
        for e in sorted((e for e in P.els if e.layer == 'board'), key=lambda e: e.z):
            if live_only and e.settle <= t:
                continue
            for pc in e.pieces(t, cv):
                _paste(out, pc)
        return out

    def final(self, n: int) -> tuple[Image.Image, int, int]:
        """The panel as it is left on the board when the camera moves on, at board resolution."""
        p = self.dir / f'final-{n:04d}.png'
        w = self.where(n)
        x, y = int((w['ox'] - self.cv.m) * BR), int((w['oy'] - self.cv.m) * BR)
        if not p.exists():
            P = self.panel(n)
            im = self.canvas_at(P, P.dur)
            im = im.resize((int(im.width * BR / RES), int(im.height * BR / RES)), Image.LANCZOS)
            tmp = p.with_name(f'{p.stem}.{os.getpid()}.tmp.png')
            im.save(tmp, compress_level=1)
            os.replace(tmp, p)
        return Image.open(p).convert('RGBA'), x, y

    def _years(self) -> list[str]:
        import re
        return re.findall(r'\d{4}', str(self.ed.ledger.get('season') or ''))[:2] or [str(self.ed.ledger.get('season') or '')]

    def _photos(self, board: int) -> list:
        from ..cinema import look
        out, avoid = [], set()
        for j, mood in enumerate(('home', 'record', 'form', 'away', 'win')):
            k = look.pick([mood, 'home'], self.ed.pal.bans, f'{self.seed}:board{board}:{j}', avoid)
            if k and k not in avoid:
                avoid.add(k)
                try:
                    out.append(self.ed.backdrop(k, 7 + j))
                except Exception:  # noqa: BLE001
                    pass
        n = len(self.layout['boards'][board]['panels'])
        return out[:max(2, min(5, n))]

    def board_upto(self, board: int, n: int) -> Image.Image:
        """The board with every panel before beat `n` already played on it."""
        if self._board and self._board[0] == (board, n):
            return self._board[1]
        self._board = None
        b = self.layout['boards'][board]
        pp = self.dir / f'board-{board}.png'
        if not pp.exists():
            sd = E.hsh(self.seed, board)
            im = board_paper(b, sd, self.style.get('warm', False), hex_rgb(self.ed.pal.accent), self._photos(board),
                             self._years(), [(self.where(m)['ox'] + PW / 2, self.where(m)['oy'] + PH / 2) for m in b['panels']],
                             list(self.ed.pal.bans))
            tmp = pp.with_name(f'{pp.stem}.{os.getpid()}.tmp.png')
            im.save(tmp, compress_level=1)
            os.replace(tmp, pp)
        im = Image.open(pp).convert('RGB')
        for m in b['panels']:
            if m >= n:
                break
            f, x, y = self.final(m)
            im.paste(f, (x, y), f)
        self._board = ((board, n), im, np.asarray(im))
        return im

    # -------------------------------------------------------------- one frame
    def _affine(self, pose: Pose, scale: float, ox: float = 0.0, oy: float = 0.0, shake=(0.0, 0.0)):
        """PIL affine data: output pixel → source pixel, for a source drawn at `scale` px per unit with its origin at
        board units (ox, oy)."""
        c, s_ = math.cos(math.radians(pose.rot)), math.sin(math.radians(pose.rot))
        z = pose.z
        cx, cy = pose.cx + shake[0], pose.cy + shake[1]
        a, b = c / z, s_ / z
        d, e = -s_ / z, c / z
        u0 = cx - (a * W / 2 + b * H / 2)
        v0 = cy - (d * W / 2 + e * H / 2)
        return (a * scale, b * scale, (u0 - ox) * scale, d * scale, e * scale, (v0 - oy) * scale)

    def frame(self, n: int, fi: int, base_cache: dict) -> np.ndarray:
        s = self.shots[n]
        T = s['start'] + fi / FPS
        t = fi / FPS
        pose = self.cam.pose(T)
        P = self.panel(n)
        w = self.where(n)
        sh = (0.0, 0.0)
        for (ts, amp) in P.shake:
            if ts <= t < ts + 0.3:
                k = (1 - (t - ts) / 0.3) * amp / max(0.6, pose.z)
                sh = (sh[0] + k * math.sin(t * 91), sh[1] + k * math.cos(t * 77))
        board = self.board_upto(pose.board if pose.board >= 0 else w['board'], n)
        fill = board.getpixel((0, 0))
        frame = warp(self._board[2] if self._board and self._board[1] is board else board, self._affine(pose, BR, shake=sh), fill, 'RGB')
        if pose.board == w['board']:
            # the live panel: settled pieces baked once into a base, live ones drawn over it every frame
            key = 'base'
            settled = [e for e in P.els if e.layer == 'board' and e.settle <= t]
            if base_cache.get('n') != len(settled):
                base_cache['n'] = len(settled)
                cvim = Image.new('RGBA', self.cv.size, (0, 0, 0, 0))
                for e in sorted(settled, key=lambda e: e.z):
                    for pc in e.pieces(t, self.cv):
                        _paste(cvim, pc)
                base_cache[key] = cvim
            cvim = self.canvas_at(P, t, base_cache[key], live_only=True)
            ox, oy = w['ox'] - self.cv.m, w['oy'] - self.cv.m
            layer = warp(cvim, self._affine(pose, RES, ox, oy, sh))
            frame.paste(layer, (0, 0), layer)
            # cut-outs in front of the board: they move faster than the paper, which is the depth
            for e in sorted((e for e in P.els if e.layer == 'near'), key=lambda e: e.z):
                for pc in e.pieces(t, E.Canvas(1.0, 0)):
                    _near(frame, pc, pose, w, RES, sh)
        arr = np.asarray(frame)
        # motion blur on a fast glide, a zoom blur through the paper
        prev = self.cam.pose(T - 1 / FPS)
        if prev.board == pose.board:
            vx = (pose.cx - prev.cx) * pose.z
            vy = (pose.cy - prev.cy) * pose.z
            vz = abs(math.log(max(1e-3, pose.z) / max(1e-3, prev.z)))
            sp = math.hypot(vx, vy)
            if sp > 20:
                arr = _dir_blur(arr, vx, vy, min(7, int(sp / 14) + 1))
            if pose.through > 0.05 or vz > 0.05:
                arr = _zoom_blur(arr, min(0.06, max(vz, pose.through * 0.07)))
        if pose.through > 0.6:
            k = (pose.through - 0.6) / 0.4
            arr = (arr.astype('float32') * (1 - k) + np.array(E.NEWS, 'float32') * k).astype('uint8')
        if pose.arrive > 0.75:
            k = (pose.arrive - 0.75) / 0.25
            arr = (arr.astype('float32') * (1 - k) + np.array(E.NEWS, 'float32') * k).astype('uint8')
        for fl in P.flash:
            if fl <= t < fl + 0.14:
                k = 0.55 * (1 - (t - fl) / 0.14)
                arr = (arr.astype('float32') * (1 - k) + np.array((255, 251, 242), 'float32') * k).astype('uint8')
        for g in base_cache.get('grade', []):
            arr = g(t, arr)
        im = Image.fromarray(arr, 'RGB')
        for ov in base_cache.get('glass', []):
            o = ov(t)
            for piece in (o if isinstance(o, list) else [o] if o else []):
                pim, x, y = piece
                im.paste(pim, (x, y), pim)
        a = np.asarray(im, dtype='int16') + _grain(round(s['start'] * FPS) + fi)
        return np.clip(a, 0, 255).astype('uint8')

    def dressing(self, n: int) -> dict:
        """The glass over a beat and its grade: the scorebug, the captions, the vignette, the letterbox at the climax."""
        from ..captions import Captions
        from ..cinema import gfx, look
        from ..cinema.direct import Scorebug
        s = self.shots[n]
        cin = s.get('cinema') or {}
        dur = s['frames'] / FPS
        glass = []
        if cin.get('bug'):
            glass.append(Scorebug(gfx.Inks(self.ed.pal), self.ed.ledger.get('club_name') or '', str(self.ed.ledger.get('season') or ''), cin['bug']))
        if os.environ.get('STORIES_BURN_CAPTIONS', '1') != '0' and s.get('words') and s.get('voice_at') is not None:
            glass.append(Captions(s['words'], s['voice_at'] - s['start'], self.ed.pal.accent))
        # the Terrace's warmth is in its paper (board_paper), not in a grade over the frame: a grade would warm the
        # photographs and the cards too, and warm paper must never drift into the rival's yellow (paper_safe)
        grade = [look.Grade(letterbox=bool(cin.get('letterbox')), hush=bool(cin.get('hush')), leak=bool(cin.get('leak')),
                            seed=1000 + n * 7, dur=dur, vignette=0.2)]
        return {'glass': glass, 'grade': grade}

    def cues(self, n: int) -> list:
        P = self.panel(n)
        s = self.shots[n]
        cin = s.get('cinema') or {}
        out = list(P.cues)
        w = self.cam.win[self.order.index(n)]
        if w['same'] or w['new']:
            out.append((0.0, 'whoosh'))
        from ..cinema.direct import SFX
        lead = (s['voice_at'] - s['start']) if s.get('voice_at') is not None else 0.4
        if cin.get('sfx') in SFX:
            out.append((max(0.0, lead), SFX[cin['sfx']]))
        if cin.get('hush'):
            out.append((0.2, f'hush:{min(P.dur, 4.0):.2f}'))
        if cin.get('crowd'):
            out.append((0.0, f'crowd-bed:{P.dur:.2f}'))
        return sorted((round(a, 3), b) for a, b in out if a < P.dur)


try:  # OpenCV's warp is ten times faster than PIL's bilinear transform; PIL is the fallback, pixel for pixel the same move
    import cv2
except ImportError:  # pragma: no cover
    cv2 = None


def warp(src, data, fill=(0, 0, 0), mode: str | None = None) -> Image.Image:
    """Cut the frame out of a big image (PIL, or its numpy array) by an affine map (output pixel → source pixel)."""
    mode = mode or src.mode
    if cv2 is None:
        im = src if isinstance(src, Image.Image) else Image.fromarray(src, mode)
        kw = {'fillcolor': fill} if mode == 'RGB' else {}
        return im.transform((W, H), Image.AFFINE, data, Image.BILINEAR, **kw)
    a = src if isinstance(src, np.ndarray) else np.asarray(src)
    M = np.array([data[:3], data[3:]], np.float64)
    border = tuple(int(c) for c in fill) + ((0,) if mode == 'RGBA' else ())
    out = cv2.warpAffine(a, M, (W, H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_CONSTANT, borderValue=border)
    return Image.fromarray(out, mode)


def _paste(dst: Image.Image, pc) -> None:
    im, x, y = pc[0], int(pc[1]), int(pc[2])
    if len(pc) > 3 and pc[3] == 'multiply':
        box = (max(0, x), max(0, y), min(dst.width, x + im.width), min(dst.height, y + im.height))
        if box[2] <= box[0] or box[3] <= box[1]:
            return
        part = im.crop((box[0] - x, box[1] - y, box[2] - x, box[3] - y))
        region = dst.crop(box)
        white = Image.new('RGBA', part.size, (255, 255, 255, 255))
        white.alpha_composite(part)
        mul = ImageChops.multiply(region.convert('RGB'), white.convert('RGB')).convert('RGBA')
        mul.putalpha(region.getchannel('A'))
        dst.paste(mul, box[:2])
        return
    if 0 <= x and 0 <= y and x + im.width <= dst.width and y + im.height <= dst.height:
        dst.alpha_composite(im, (x, y))
    else:
        dst.paste(im, (x, y), im)


def _near(frame: Image.Image, pc, pose: Pose, w: dict, res: float, sh, f: float = 1.22) -> None:
    """A cut-out in front of the board: its board position is pushed away from the camera centre by `f`, and it is
    drawn `f` times bigger, so it slides faster than the paper behind it."""
    im, x, y = pc[0], pc[1], pc[2]
    # pieces from a 1-px-per-unit canvas with no margin: (x, y) is the top-left in panel units, im is at `res`
    cx_u = w['ox'] + x + im.width / 2     # (x, y) = centre in units minus half the image in pixels: add it back
    cy_u = w['oy'] + y + im.height / 2
    c, s_ = math.cos(math.radians(-pose.rot)), math.sin(math.radians(-pose.rot))
    dx, dy = (cx_u - pose.cx - sh[0]) * pose.z * f, (cy_u - pose.cy - sh[1]) * pose.z * f
    X = W / 2 + dx * c - dy * s_
    Y = H / 2 + dx * s_ + dy * c
    sc = pose.z * f / res
    nw, nh = max(1, int(im.width * sc)), max(1, int(im.height * sc))
    if X + nw / 2 < 0 or X - nw / 2 > W or Y + nh / 2 < 0 or Y - nh / 2 > H:
        return
    im2 = im.resize((nw, nh), Image.BILINEAR)
    if abs(pose.rot) > 0.2:
        im2 = im2.rotate(-pose.rot, expand=True, resample=Image.BILINEAR)
    frame.paste(im2, (int(X - im2.width / 2), int(Y - im2.height / 2)), im2)


def _dir_blur(a: np.ndarray, vx: float, vy: float, taps: int) -> np.ndarray:
    acc = a.astype('uint16')
    n = 1
    for k in range(1, taps):
        dx = int(round(-vx * k / taps * 0.8))
        dy = int(round(-vy * k / taps * 0.8))
        sh = np.roll(a, (dy, dx), axis=(0, 1))
        acc += sh
        n += 1
    return (acc // n).astype('uint8')


def _zoom_blur(a: np.ndarray, amt: float) -> np.ndarray:
    im = Image.fromarray(a)
    acc = a.astype('uint16')
    n = 1
    for k in (1, 2):
        s = 1 + amt * k
        w, h = int(W * s), int(H * s)
        big = im.resize((w, h), Image.BILINEAR).crop(((w - W) // 2, (h - H) // 2, (w - W) // 2 + W, (h - H) // 2 + H))
        acc += np.asarray(big, 'uint16')
        n += 1
    return (acc // n).astype('uint8')


# ------------------------------------------------------------------ rendering the film
def _render_range(args) -> str:
    job_dir, plan_path, palette_json, idxs, out_dir = args
    from ..edit import Editor
    from ..common import read_json as rj
    from ..sprites import SpriteFactory
    jd = Path(job_dir)
    ed = Editor(jd, rj(jd / 'ledger.json'), rj(jd / 'script.json'), rj(jd / 'voice.json'), Palette.from_json(palette_json), jd / 'art')
    plan = rj(Path(plan_path))
    film = VoxFilm(ed, plan, jd)
    acc = hex_rgb(ed.pal.accent)
    sp = None
    try:
        for i in idxs:
            s = plan['shots'][i]
            out = Path(out_dir) / f'shot-{i:04d}.mp4'
            if out.exists():
                continue
            tmp = out.with_suffix('.part.mp4')
            p = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                                  '-c:v', 'libx264', '-preset', os.environ.get('STORIES_X264_PRESET', 'veryfast'), '-crf', '19', '-pix_fmt', 'yuv420p',
                                  '-g', str(FPS * 2), '-movflags', '+faststart', str(tmp)], stdin=subprocess.PIPE)
            n = s['n']
            if film.where(n)['engine'] == 'classic':
                if sp is None:
                    sp = SpriteFactory(ed.pal, ed.sprites_dir).__enter__()
                shot = ed.build(sp, s)
                prev_last = film.last_frame(i - 1) if i > 0 else None
                r = ShotRenderer(shot)
                g0 = round(s['start'] * FPS)
                for fi in range(s['frames']):
                    p.stdin.write(blend_entry(shot, fi, r.frame(fi, g0 + fi), prev_last, acc).tobytes())
                cues = shot.cues
            else:
                cache = film.dressing(n)
                for fi in range(s['frames']):
                    fr = film.frame(n, fi, cache)
                    if i == 0 and fi < 20:
                        fr = (fr.astype('float32') * ease_in_out(fi / 20)).astype('uint8')
                    p.stdin.write(fr.tobytes())
                cues = film.cues(n)
            p.stdin.close()
            if p.wait() != 0:
                raise StageError('ENCODE_FAILED', f'ffmpeg failed on shot {i}', retryable=True)
            tmp.rename(out)
            write_json(Path(out_dir) / f'shot-{i:04d}.cues.json', {'cues': cues, 'kind': s['visual']['type'], 'engine': film.where(n)['engine']})
    finally:
        if sp is not None:
            sp.__exit__(None, None, None)
    return f'{idxs[0]}-{idxs[-1]}'


def _last_frame(self, i: int) -> np.ndarray | None:
    s = self.plan['shots'][i]
    if self.where(s['n'])['engine'] != 'vox':
        return None
    return self.frame(s['n'], s['frames'] - 1, self.dressing(s['n']))


VoxFilm.last_frame = _last_frame


def render_film(job_dir: Path, plan: dict, palette: Palette, log, workers: int | None = None, only: list[int] | None = None,
                tick=None) -> Path:
    """The Vox film: the same contract as edit.render_film (shot files, cue files, picture.mp4)."""
    from ..edit import Editor
    out_dir = job_dir / 'shots'
    out_dir.mkdir(parents=True, exist_ok=True)
    plan_path = job_dir / 'plan.json'
    write_json(plan_path, plan)
    t0 = time.time()
    ed = Editor(job_dir, read_json(job_dir / 'ledger.json'), read_json(job_dir / 'script.json'), read_json(job_dir / 'voice.json'), palette, job_dir / 'art')
    film = VoxFilm(ed, plan, job_dir)   # the layout pass: every beat composed once, the camera path fixed
    log(f'Vox: {len(film.layout["boards"])} boards, director {film.director or "house"}, layout in {time.time() - t0:.1f}s')
    n = len(plan['shots'])
    idxs = only if only is not None else list(range(n))
    todo = [i for i in idxs if not (out_dir / f'shot-{i:04d}.mp4').exists()]
    workers = workers or max(1, min(4, (os.cpu_count() or 2)))
    # contiguous runs: a worker keeps its board and its panels warm between neighbouring beats
    size = max(1, math.ceil(len(todo) / (workers * 3)))
    chunks = [todo[i:i + size] for i in range(0, len(todo), size)]
    args = [(str(job_dir), str(plan_path), palette.to_json(), c, str(out_dir)) for c in chunks]
    if args:
        log(f'Vox: rendering {len(todo)} shots on {min(workers, len(args))} workers')
        with ProcessPoolExecutor(max_workers=min(workers, len(args))) as ex:
            futs = {ex.submit(_render_range, a) for a in args}
            while futs:
                done_now, futs = wait(futs, timeout=40, return_when=FIRST_COMPLETED)
                for f in done_now:
                    log(f'Vox: shots {f.result()} rendered')
                if tick:
                    tick(sum(1 for i in idxs if (out_dir / f'shot-{i:04d}.mp4').exists()), len(idxs))
    frames = sum(s['frames'] for s in plan['shots'])
    log(f'Vox: {frames} frames in {time.time() - t0:.0f}s ({(time.time() - t0) / max(1, frames) * 1000:.0f} ms a frame, all workers)')
    if only is not None:
        return out_dir
    lst = out_dir / 'list.txt'
    lst.write_text(''.join(f"file 'shot-{i:04d}.mp4'\n" for i in range(n)))
    silent = job_dir / 'picture.mp4'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', str(silent)], check=True)
    return silent
