"""CLASSIFIED · VOX — the case-file board (owner, 5.11.2026: "there's a feeling of epilepsy, the pictures shake, they're
not clear. Take the VOX atmosphere there too. VOX is our leading edit.").

The FILE is laid out as the studio's VOX film is (studio/vox): one board per chapter that a single camera glides across.
Here the board is the case board — cork, manila folders, typed index cards, the case number — and every beat is a piece
of evidence pinned to it:

  * the owner's panel or press photograph as a PRINT (white border, whole picture, never cropped, never treated),
    dropped onto the board and then left still: no line boil, no depth re-warp, no lamp flicker, no flashbulbs, no
    flash frames, no hand-held shake, no impact jitter, no crash zoom, no strobing grain;
  * red string from the previous print's pin to this one's, drawn on as the print lands;
  * the slug line (date · place) typed on its own strip, letter by letter;
  * the pen circling the key detail on the print, an arrow from the shout word (SMASH!) that pops beside it;
  * the source's quoted headline on a torn clipping, highlighter swept over the quote;
  * VERSION A / VERSION B as two prints side by side on one row, the camera moving between them;
  * a chapter as a manila folder with its title rising, the case line printed with its subject blacked out;
  * the CLASSIFIED stamp landing ONCE per chapter (no flash, no thump);
  * the sources sheet at the end, the supporters' card (rule 136) and the end card on the same board.

The camera is VOX's (`studio.vox.camera.CameraPath`, the 'classified' style: the slowest glide, ease in-out, a
shallow pull-back, a settle with almost no overshoot); a chapter change lifts off the board and settles onto the next
one instead of diving through the paper. Motion blur only while the camera is gliding fast.

Same contract as compose.Composer (produce.py swaps one for the other): `CaseFilm(ep, beats, assets, size, ...)`,
`.post` for the burned captions, `.render(out, audio)`, `.report`, and `.cues()` for the mix.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import tempfile
import time
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from comic import compose, episode as epi, layers as lay, letter  # noqa: E402
from comic.manifest import load_manifest, scan_folder  # noqa: E402
from studio.common import Palette  # noqa: E402
from studio.motion import Pose as SPose, clamp, ease_in_out, ease_out_cubic  # noqa: E402
from studio.vox import elements as E  # noqa: E402
from studio.vox import render as VR  # noqa: E402
from studio.vox.camera import CameraPath, Pose  # noqa: E402
from studio.vox.compose import PH, PW, Builder, _wrap, style_of  # noqa: E402
from studio.vox.elements import INK, NEWS, PAPER, hsh, rot_pt  # noqa: E402

REPO = HERE.parents[2]
VW, VH = 1920, 1080                 # the virtual frame every geometry is in; the output may be any 16:9 size
CORK = (134, 97, 66)
KRAFT = (190, 158, 124)
PRINT = (250, 247, 240)
STRING = (176, 24, 30)
PIN = (198, 32, 38)
RED = letter.RED
MAX_PRINTS = 12                     # a longer chapter goes on to a second board
PRINT_BOX = (1250, 720)             # where the owner's picture fits, whole (contain), in panel units
PRINT_C = (900, 570)                # the print's centre on its panel
BORDER = 26
STILL_MOVES = {'hold', 'static'}
PUSH_MOVES = {'push', 'crash', 'follow', 'slowmo', 'crane_down', 'tilt3d', 'orbit'}
PULL_MOVES = {'pull', 'crane_up'}
SHOUT_FILL = {'red': letter.RED, 'cyan': letter.CYAN, 'navy': letter.NAVY}
# effects of the old living comic that flicker, flash or wobble: never drawn on the case board (owner, 5.11.2026)
DROPPED = {'flicker', 'flashbulbs', 'flash', 'glint', 'droplets', 'shards', 'stars', 'speedlines', 'rain', 'confetti',
           'embers', 'smoke', 'godrays', 'flare', 'glow', 'dof', 'handheld'}
# the effects that point at the key detail: the pen circles it instead
POINTERS = ('glint', 'droplets', 'shards', 'stars', 'dof')


class _Ed:
    """The little of the studio's Editor that VOX's Builder reads: the palette and a seed."""

    def __init__(self, ep: dict, tone_hex: str):
        self.pal = Palette('classified', 'CLASSIFIED', tone_hex, bans=[])
        self.ledger = {'club_id': f"classified-{ep.get('file', 'file')}", 'season': f"FILE {ep.get('number', '00')}",
                       'club_name': 'CLASSIFIED'}


def _np2im(a: np.ndarray) -> Image.Image:
    return Image.fromarray(np.ascontiguousarray(a), 'RGBA')


def _scaled(im: Image.Image, w_units: float, res: float) -> Image.Image:
    w = max(2, int(w_units * res))
    return im.resize((w, max(2, int(im.height * w / im.width))), Image.LANCZOS)


def parse_source(title: str) -> tuple[str, str | None, str]:
    """`Reuters via CNN — "Canizares ruled out by aftershave accident", 18 May 2002` → publisher, quote, date."""
    m = re.search(r'["“]([^"”]{6,})["”]', title)
    pub = title.split(' — ')[0].strip() if ' — ' in title else ''
    d = re.search(r'(\d{1,2} [A-Z][a-z]+ \d{4})', title)
    return pub, (m.group(1).strip() if m else None), (d.group(1) if d else '')


def _sag(a, b, n: int = 28, sag: float = 0.07):
    """A string hung between two pins: a shallow curve below the straight line."""
    (x0, y0), (x1, y1) = a, b
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2 + math.hypot(x1 - x0, y1 - y0) * sag
    return [((1 - u) ** 2 * x0 + 2 * (1 - u) * u * mx + u * u * x1, (1 - u) ** 2 * y0 + 2 * (1 - u) * u * my + u * u * y1)
            for u in (i / (n - 1) for i in range(n))]


# ------------------------------------------------------------------ what one beat lays on the board
class CaseBuilder(Builder):
    """VOX's Builder (cards, typewriter, kinetic words, the pen, the highlighter) with the case file's own pieces."""

    def __init__(self, film: 'CaseFilm', s: dict, beat, res: float):
        super().__init__(film.ed, s, res, film.style)
        self.film, self.b, self.raw = film, beat, beat.raw
        self.ink.pen = RED                    # the case marker is red felt-tip, like the string
        self.geo = None                       # the print: centre, picture size, turn (panel units)
        self.stamps = 0

    # -- the owner's picture as a print: whole, untreated, a white border, laid on the board
    def print_(self, path: Path | None, *, cx=PRINT_C[0], cy=PRINT_C[1], box=PRINT_BOX, t0=0.0, label: str = ''):
        rot = (-1.4, 1.2, -0.7, 1.6, -1.8)[self.s['n'] % 5]
        if path is not None:
            src = Image.open(path)
            src = src.convert('RGBA') if src.mode in ('RGBA', 'LA', 'P') else src.convert('RGB')
            k = min(box[0] / src.width, box[1] / src.height)
            pw, ph = src.width * k, src.height * k
        else:
            src, pw, ph = None, box[0] * 0.8, box[1] * 0.8
        card, pad = E.paper(pw + 2 * BORDER, ph + 2 * BORDER, self.res, self.seed + 3, tone=PRINT, edges='', tape=0)
        X0, Y0 = int(pad + BORDER * self.res), int(pad + BORDER * self.res)
        if src is not None:
            pic = src.resize((max(1, int(pw * self.res)), max(1, int(ph * self.res))), Image.LANCZOS).convert('RGBA')
            card.alpha_composite(pic, (X0, Y0))
        else:   # an honest stand-in for a panel the owner has not supplied: never an invented picture
            d = ImageDraw.Draw(card)
            d.rectangle([X0, Y0, X0 + pw * self.res, Y0 + ph * self.res], fill=INK + (255,))
            msg = self.t(f'PANEL NOT SUPPLIED · {label}', 'caps', 46, PAPER, max_w=pw - 80)
            card.alpha_composite(msg, (int(X0 + (pw * self.res - msg.width) / 2), int(Y0 + (ph * self.res - msg.height) / 2)))
        w, h = pw + 2 * BORDER, ph + 2 * BORDER
        sp = E.Sprite(card, E.arrive(cx, cy, t0, frm=(0, -70), rot0=rot + 2.0, rot1=rot, style='drop', s0=1.05, dur=0.75),
                      z=30, kind='photo', rect=(cx - w / 2, cy - h / 2, w, h), settle=t0 + 0.8)
        self.P.add(sp)
        self.P.cues.append((t0, 'paper'))
        self.geo = {'cx': cx, 'cy': cy, 'pw': pw, 'ph': ph, 'rot': rot}
        self.P.targets['print'] = sp.rect
        self.pin(cx, cy - h / 2 + 16, rot, t0 + 0.8)
        return sp

    def pin(self, x, y, rot, t):
        px, py = rot_pt(self.geo['cx'], self.geo['cy'], x - self.geo['cx'], y - self.geo['cy'], rot) if self.geo else (x, y)
        self.P.targets['pin'] = (px, py, t)

    def at_pic(self, fx: float, fy: float) -> tuple[float, float]:
        g = self.geo
        return rot_pt(g['cx'], g['cy'], (fx - 0.5) * g['pw'], (fy - 0.5) * g['ph'], g['rot'])

    def card_img(self, im: Image.Image, cx, cy, rot, t0, *, z=60, style='drop', frm=(0, -60), s0=1.05, dur=0.6, blend=None):
        w, h = im.width / self.res, im.height / self.res
        sp = E.Sprite(im, E.arrive(cx, cy, t0, frm=frm, rot0=rot + 1.5, rot1=rot, style=style, s0=s0, dur=dur), z=z,
                      kind='data', rect=(cx - w / 2, cy - h / 2, w, h), settle=t0 + dur + 0.05, blend=blend)
        self.P.add(sp)
        self.P.cues.append((t0, 'paper'))
        return sp

    # -- the slug line: date · place, typed
    def slug(self, e: dict, x=90.0, y=40.0):
        t0 = float(e.get('t0', 0.4))
        label = str(e.get('label') or '').upper()
        cps = float(e.get('cps', 30))
        if label:
            self.type(label, x, y, 28, t0, font='caps', plate=INK, fill=PAPER, pad=11, cps=cps * 1.2, max_w=1100)
            t0 += len(label) / (cps * 1.2) + 0.15
            y += 58
        self.type(str(e['text']), x, y, 40, t0, font='mono', plate=NEWS, fill=INK, pad=13, cps=cps, max_w=1150)

    # -- the pen on the key detail, and the shout beside it
    def circle_at(self, fx: float, fy: float, t0: float, name='detail'):
        x, y = self.at_pic(fx, fy)
        r = max(70.0, 0.12 * self.geo['pw'])
        self.circle((x - r, y - r * 0.8, 2 * r, 1.6 * r), t0, name, dur=0.7, pad=8)
        return x, y, r

    def shout(self, e: dict, target=None):
        t0 = float(e.get('t0', 0.6))
        text = str(e.get('text', 'SMASH!'))
        col = SHOUT_FILL.get(e.get('color', 'red'), RED)
        if target:
            tx, ty, r = target
            sx = tx + (420 if tx < 960 else -420)
            sy = max(200.0, ty - r - 120)
        else:
            sx, sy = 1480.0, 260.0
        sx = min(1640.0, max(280.0, sx))
        w = self.words(text, sx, sy, 150, t0, font='shout', style='pop', fill=col, hot_fill=col, plate=INK, shift=7,
                       align='center', upper=False, stagger=0.05, max_w=900)
        if target:
            a = (w.rect[0] + w.rect[2] / 2, w.rect[1] + w.rect[3])
            self.arrow(a, (tx, ty - r * 0.6), w.settle, 'shout', target=(tx - r, ty - r, 2 * r, 2 * r), dur=0.45)
        return w

    # -- the source's own headline on a torn clipping, highlighter over the quote
    def clipping(self, src: dict, t0: float):
        pub, quote, date = parse_source(src['title'])
        if not quote:
            return None
        cw = 640.0
        boxes, bh = _wrap(self, quote, 'head', 44, cw - 60)
        top = self.t(' · '.join(x for x in (pub.upper(), date.upper()) if x), 'caps', 22, (96, 88, 76), max_w=cw - 60)
        h = top.height / self.res + 22 + bh + 40
        cx, cy = 1560.0, 1020.0 - h / 2

        def bake(im, pad, r):
            self.put(top, im, 0, pad, 30, 18)
            for (w_, x_, y_, ww, hh) in boxes:
                im.alpha_composite(self.t(w_, 'head', 44, INK), (int(pad + (30 + x_) * r), int(pad + (40 + top.height / r + y_) * r)))
        sp = self.card(cw, h, cx, cy, 2.2, t0, tone=NEWS, style='slide', frm=(520, 0), edges='tblr', z=55, bake=bake)
        # one swipe per printed line of the quote (the card is turned 2.2°: each box is placed by turning it with the card)
        lines: dict = {}
        for (w_, x_, y_, ww, hh) in boxes:
            a = lines.setdefault(round(y_, 1), [x_, x_ + ww, hh])
            a[0], a[1] = min(a[0], x_), max(a[1], x_ + ww)
        k = 0
        t_hl = max(sp.settle + 0.1, self.at_voice(0.5))
        for y_, (x0, x1, hh) in sorted(lines.items()):
            lx, ly = cx - cw / 2 + 30 + x0, cy - h / 2 + 40 + top.height / self.res + y_
            mx, my = rot_pt(cx, cy, lx + (x1 - x0) / 2 - cx, ly + hh / 2 - cy, 2.2)
            self.highlight((mx - (x1 - x0) / 2, my - hh / 2, x1 - x0, hh), t_hl + 0.35 * k, f'quote{k}', rot=2.2, dur=0.4)
            k += 1
        self.P.targets['clipping'] = sp.rect
        return sp

    # -- VERSION A / VERSION B, SUBJECT · …: a kraft tab above the print, typed
    def version(self, e: dict, slug: bool):
        t0 = float(e.get('t0', 0.3))
        text = str(e.get('text', '')).upper()
        side = e.get('side', 'r')
        if slug and side == 'l':
            side = 'r'
        ink = letter.NAVY if e.get('ink') == 'navy' else RED
        img = self.t(text, 'mono', 42, INK)
        w = img.width / self.res + 80
        x = 300 + w / 2 if side == 'l' else 1560 - w / 2
        y = 110.0
        im, pad = E.paper(w, 92, self.res, self.seed + 21, tone=KRAFT, edges='', tape=1)
        sp = self.card_img(im, x, y, -1.0 if side == 'l' else 1.0, t0, z=58, style='slide', frm=(0, -260), s0=1.0, dur=0.55)
        self.type(text, x - w / 2 + 40, y - 30, 42, sp.settle, font='mono', fill=ink, cps=34)
        if text.startswith('VERSION '):   # the letter, circled
            lx = x - w / 2 + 40 + self.tl('VERSION ', 'mono', 42, INK).width / self.res
            lw = self.tl('A', 'mono', 42, INK).width / self.res
            tc = sp.settle + len(text) / 34 + 0.1
            m = E.Marker(E.circle_path((lx - 10, y - 38, lw + 20, 72), self.seed + 77, 16), t0=tc, dur=0.5, res=self.res,
                         colour=RED, width=5.5, target=(lx, y - 30, lw, 60), name='version')
            self.P.add(m)
            self.P.cues.append((tc, 'pen'))
        self.P.targets['version'] = (x - w / 2, y - 46, w, 92, side)

    def score(self, e: dict):
        t0 = float(e.get('t0', 0.6))
        x, y = 1560.0, 330.0
        im, pad = E.paper(470, 300, self.res, self.seed + 31, tone=PAPER, edges='lr', tape=2)
        sp = self.card_img(im, x, y, 2.0, t0, z=62, style='slide', frm=(500, 0), s0=1.0)
        if e.get('label'):
            self.type(str(e['label']).upper(), x - 200, y - 120, 30, sp.settle, font='caps', fill=RED, cps=36)
        w = self.words(str(e.get('text', '')), x, y - 70, 150, sp.settle + 0.3, font='ultra', style='pop', align='center',
                       upper=False, stagger=0.12)
        self.underline(w.rect, w.settle + 0.1, 'score')
        self.P.targets['score'] = w.rect

    def title_card(self, e: dict):
        t0 = float(e.get('t0', 0.6))
        fx_, fy_ = e.get('at', (0.5, 0.7))
        x, y = self.at_pic(fx_, fy_)
        im = _scaled(_np2im(letter.title_card(self.film.ep.get('number', '00'), self.film.ep.get('title', ''),
                                              self.film.tone, self.film.tone_rgb)), min(1100.0, self.geo['pw'] * 0.86), self.res)
        self.card_img(im, x, y, -2.0, t0, z=66, style='drop', frm=(0, -40), s0=1.06)

    def tab(self, e: dict):
        t0 = float(e.get('t0', 0.2))
        im = _scaled(_np2im(letter.tone_tab(self.film.tone, self.film.tone_rgb, f"FILE {self.film.ep.get('number', '00')}")), 420, self.res)
        g = self.geo
        self.card_img(im, g['cx'] - g['pw'] / 2 + 230, g['cy'] + g['ph'] / 2 + 10, 0.0, t0, z=64, style='slide', frm=(-400, 0), s0=1.0)

    # -- the stamp: once per chapter, pressed into the paper — no flash, no thump, no shake
    def stamp_(self, e: dict, at: tuple[float, float], rot: float, height: float = 200):
        t0 = float(e.get('t0', 0.5))
        text = str(e.get('text', 'CLASSIFIED'))
        spr = _np2im(letter.stamp(text, RED))
        im = spr.resize((max(2, int(spr.width * height * self.res / spr.height)), int(height * self.res)), Image.LANCZOS)
        x, y = at

        def pose(t):
            if t < t0:
                return None
            k = clamp((t - t0) / 0.34)
            return SPose(x, y, 1.14 - 0.14 * ease_out_cubic(k), rot, ease_in_out(clamp(k / 0.5)))
        w, h = im.width / self.res, im.height / self.res
        self.P.add(E.Sprite(im, pose, z=88, kind='stamp', rect=(x - w / 2, y - h / 2, w, h), settle=t0 + 0.4, blend='multiply'))
        bleed = _np2im(compose._bleed(np.asarray(im)))

        def bpose(t):
            if t < t0 + 0.34:
                return None
            return SPose(x, y, 1.0, rot, 0.3 * ease_in_out(clamp((t - t0 - 0.34) / 0.9)))
        self.P.add(E.Sprite(bleed, bpose, z=87, kind='stamp-ink', settle=t0 + 1.3, blend='multiply'))
        self.P.cues.append((t0 + 0.3, 'stamp'))
        self.P.targets['stamp'] = (text, t0)
        self.stamps += 1


# ------------------------------------------------------------------ the camera: VOX's path, lifting off between chapters
class CaseCamera(CameraPath):
    """VOX's camera with a calmer chapter change: instead of diving through the paper it lifts off the board (eased,
    0.65 of the zoom) while the board fades to cork, then settles onto the next board from a little higher."""

    def __init__(self, shots, style):
        super().__init__(shots, style)
        for i, w in enumerate(self.win):
            if w['new'] and i > 0:
                w['pre'] = min(0.9, 0.4 * shots[i - 1]['dur'])
                w['post'] = min(1.5, 0.5 * shots[i]['dur'])

    def glide(self, i, T):
        """VOX's glide from beat to beat (ease in-out, a pull-back on the way, a settle) with the pull-back, the roll and
        no overshoot — the pull-back and the roll shaped as sin², so a glide starts and ends at rest."""
        w = self.win[i]
        S = self.starts[i]
        a_t = S - w['pre']
        A = self.local(i - 1, a_t - self.starts[i - 1])
        B = self.local(i, w['post'])
        k = clamp((T - a_t) / max(1e-3, w['pre'] + w['post']))
        e = ease_in_out(k)   # a cosine ease: half the peak speed and less than half the acceleration of VOX's cubic, no overshoot
        dist = math.hypot(B.cx - A.cx, B.cy - A.cy)
        bump = self.st.get('bump', 0.2) * clamp(dist / 2400) * math.sin(math.pi * k) ** 2
        lz = math.log(A.z) + (math.log(B.z) - math.log(A.z)) * clamp(e, 0, 1)
        side = 1 if (B.cx - A.cx) >= 0 else -1
        rot = A.rot + (B.rot - A.rot) * e + side * self.st.get('roll', 0.4) * math.sin(math.pi * k) ** 2
        return Pose(A.board, A.cx + (B.cx - A.cx) * e, A.cy + (B.cy - A.cy) * e, math.exp(lz) * (1 - bump), rot)

    def dive(self, i, T, S1, pre):
        A = self.local(i, S1 - pre - self.starts[i])
        k = clamp((T - (S1 - pre)) / pre)
        return Pose(A.board, A.cx, A.cy, A.z * (1 - 0.35 * ease_in_out(k)), A.rot, through=k)

    def surface(self, i, t, post):
        B = self.local(i, post)
        A = self.local(i, 0.0)
        k = clamp(t / post)
        e = ease_in_out(k)
        z0 = B.z * 0.7
        z = math.exp(math.log(z0) + (math.log(B.z) - math.log(z0)) * e)
        return Pose(B.board, A.cx + (B.cx - A.cx) * e, A.cy + (B.cy - A.cy) * e, z, B.rot, arrive=1 - k)


# ------------------------------------------------------------------ the case board
def case_board(b: dict, seed: int, number: str, title: str) -> Image.Image:
    """Cork, a few closed manila folders and typed index cards (some lines redacted) in the gutters, the case number
    stencilled huge and faint. Drawn small and scaled up: the board is the background, the prints are the subject."""
    from studio.cinema.type import text as T
    BR = VR.BR
    w, h = int(b['w'] * BR), int(b['h'] * BR)
    rng = np.random.default_rng(seed)
    sw, sh = max(64, w // 3), max(64, h // 3)
    lo = np.asarray(Image.fromarray((rng.random((max(2, sh // 30), max(2, sw // 30))) * 255).astype('uint8')).resize((sw, sh), Image.BICUBIC), 'float32') / 255
    gr = rng.normal(0, 1, (sh, sw)).astype('float32')
    a = np.empty((sh, sw, 3), 'float32')
    a[:] = CORK
    a += ((lo - 0.5) * 22 + gr * 9)[..., None] * np.array([1.0, 0.85, 0.7], 'float32')
    fl = rng.random((sh, sw)) > 0.985                      # the dark flecks of cork
    a[fl] *= 0.72
    im = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGB').resize((w, h), Image.BICUBIC)
    del a, lo, gr, fl
    d = ImageDraw.Draw(im, 'RGBA')
    big = T(f'FILE {number}', 'ultra', int(760 * BR), (0, 0, 0, 0), stroke=max(2, int(5 * BR)), stroke_fill=(70, 46, 28, 60))
    im.paste(big, (int(rng.uniform(0, max(1, w - big.width))), int(rng.uniform(0, max(1, h - big.height)))), big)
    st = T('CLASSIFIED', 'caps', int(520 * BR), (150, 30, 30, 26))
    st = st.rotate(rng.uniform(-14, 14), expand=True, resample=Image.BICUBIC)
    im.paste(st, (int(rng.uniform(0, max(1, w - st.width))), int(rng.uniform(0, max(1, h - st.height)))), st)
    n = max(3, int(b['w'] * b['h'] / 1.4e6))
    for j in range(n):
        if j % 2 == 0:   # a closed manila folder with its tab
            fw, fh = rng.uniform(900, 1300), rng.uniform(600, 820)
            card, pad = E.paper(fw, fh, BR, int(rng.integers(0, 9999)), tone=KRAFT, edges='', shadow=True)
            cd = ImageDraw.Draw(card)
            cd.rectangle([pad + 40 * BR, pad + 40 * BR, pad + 360 * BR, pad + 110 * BR], outline=(120, 92, 64, 200), width=max(1, int(3 * BR)))
            lab = T(f'CASE {number} · {title}'[:28], 'mono', int(40 * BR), (70, 50, 34, 230))
            card.alpha_composite(lab, (int(pad + 60 * BR), int(pad + 56 * BR)))
        else:            # a typed index card, some lines blacked out
            fw, fh = rng.uniform(560, 760), rng.uniform(340, 460)
            card, pad = E.paper(fw, fh, BR, int(rng.integers(0, 9999)), tone=NEWS, edges='', shadow=True)
            cd = ImageDraw.Draw(card)
            for k in range(int(60 * BR), int(fh * BR - 30 * BR), max(1, int(34 * BR))):
                x1 = pad + (fw - 40 - rng.uniform(0, fw * 0.4)) * BR
                col = INK + (235,) if rng.random() < 0.3 else (120, 112, 100, 150)
                cd.rectangle([pad + 30 * BR, pad + k, x1, pad + k + (16 if col[3] > 200 else 6) * BR], fill=col)
        card = card.rotate(rng.uniform(-8, 8), expand=True, resample=Image.BICUBIC)
        im.paste(card, (int(rng.uniform(-card.width / 4, w - card.width * 0.75)), int(rng.uniform(-card.height / 4, h - card.height * 0.75))), card)
    return im


def vignette(wh: tuple[int, int]) -> np.ndarray:
    W, H = wh
    yy, xx = np.mgrid[0:H, 0:W].astype('float32')
    r = np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2))
    v = 1 - 0.16 * np.clip(r - 0.45, 0, None) ** 1.6
    return (np.clip(v, 0, 1) * 256).astype('uint16')[..., None]


# ------------------------------------------------------------------ the film
class CaseFilm(VR.VoxFilm):
    """compose.Composer's contract on VOX's board and camera. (VoxFilm's own __init__ reads the studio's Editor; the
    case file builds its layout from the episode instead and keeps everything else: the baked finals, canvas_at.)"""

    render = compose.Composer.render

    def __init__(self, ep: dict, beats: list, assets: dict, out_wh=(1920, 1080), allow_model=True, missing='slate',
                 log=print, plan: dict | None = None, work: Path | None = None):
        self.ep, self.assets, self.wh, self.allow_model, self.log = ep, assets, tuple(out_wh), allow_model, log
        if abs(self.wh[0] / self.wh[1] - VW / VH) > 0.02:
            raise ValueError('the case board renders 16:9 (Shorts are cut from the master by studio/shorts.py)')
        self.fps = int(ep.get('fps', 25))
        man = load_manifest()
        self.tone = ep.get('tone', 'LAUGH')
        tone_hex = man['tones'][self.tone]['color']
        self.tone_rgb = letter.hex_rgb(tone_hex)
        self.ed = _Ed(ep, tone_hex)
        self.style = style_of('classified')
        self.seed = f"classified:{ep.get('file')}"
        self.report = {'beats': [], 'missing': [], 'depth': {}, 'engine': 'vox', 'dropped_fx': {}, 'stamps': {}}
        self.post = None
        keep = []
        for b in beats:
            if b.panel not in assets and not _no_picture(b):
                self.report['missing'].append(b.panel)
                if missing == 'fail':
                    raise SystemExit(f'panel {b.panel} not supplied')
                if missing == 'skip':
                    continue
            keep.append(b)
        if missing == 'skip':
            t = 0.0
            for b in keep:
                b.start = t
                t += b.dur
        self.beats = keep
        if self.report['missing']:
            log('missing panels: ' + ', '.join(self.report['missing']))
        work = Path(work) if work else Path(tempfile.mkdtemp(prefix='classified-vox-'))
        if compose.inside_repo(work):
            raise SystemExit(f'refused: {work} is inside the repository')
        self.dir = work
        self.dir.mkdir(parents=True, exist_ok=True)
        self.cv = E.Canvas(VR.RES)
        self._panels: dict = {}
        self._board = None
        self._centre: dict = {}
        self._live: dict = {}
        self.vign = vignette(self.wh)
        self.k = self.wh[0] / VW
        # the shots: one per beat, on the frame clock
        words = {s.get('id'): s for s in (plan or {}).get('shots', [])}
        self.f0 = []
        self.shots, self.order = {}, []
        for i, b in enumerate(self.beats):
            n = i + 1
            a, z = int(round(b.start * self.fps)), int(round((b.start + b.dur) * self.fps))
            self.f0.append(a)
            ps = words.get(b.raw.get('id')) or {}
            said = bool(b.raw.get('say'))
            lead = float(b.raw.get('_lead', 0.25)) if said else 0.4
            vdur = float(ps['words'][-1]['end']) if ps.get('words') else (max(0.8, b.dur - lead - 0.5) if said else 0.0)
            self.shots[n] = {'n': n, 'start': a / self.fps, 'frames': z - a, 'voice_at': a / self.fps + lead if said else None,
                             'voice_dur': vdur, 'visual': {'type': _kind(b)}, 'cinema': {}, 'i': i}
            self.order.append(n)
        self.n_frames = int(round(epi.total(self.beats) * self.fps)) if self.beats else 0
        self.stamp_beat = self._stamps()
        self.layout = self._layout()
        self.cam = CaseCamera(self.layout['path'], self.style)
        for b in self.beats:
            for e in b.fx:
                if e['type'] in DROPPED:
                    self.report['dropped_fx'][e['type']] = self.report['dropped_fx'].get(e['type'], 0) + 1

    # -------------------------------------------------------------- chapters and the one stamp each
    def chapter_of(self) -> list[int]:
        out, c = [], -1
        for i, b in enumerate(self.beats):
            if i == 0 or b.raw.get('chapter'):
                c += 1
            out.append(c)
        return out

    def _stamps(self) -> dict[int, dict]:
        """n → the stamp that lands on that beat: the chapter's own (its first stamp effect), else CLASSIFIED on the
        chapter's folder (or its first beat). Exactly one per chapter."""
        ch = self.chapter_of()
        out = {}
        for c in sorted(set(ch)):
            idx = [i for i, x in enumerate(ch) if x == c]
            pick = next(((i, e) for i in idx for e in self.beats[i].fx if e['type'] == 'stamp'), None)
            if pick is None:
                i = next((i for i in idx if _kind(self.beats[i]) == 'chapter'), idx[0])
                pick = (i, {'type': 'stamp', 'text': 'CLASSIFIED', 't0': 0.9})
            out[pick[0] + 1] = dict(pick[1])
            self.report['stamps'][str(c)] = self.beats[pick[0]].raw.get('id', pick[0])
        return out

    def centre(self, pid: str) -> tuple[float, float]:
        if pid not in self._centre:
            a = self.assets.get(pid)
            c = (0.5, 0.5)
            if a is not None and a.kind != 'cutout':
                try:
                    t0 = time.time()
                    L = lay.load(a.path, self.allow_model, self.log)
                    self.report['depth'][pid] = L.method
                    c = L.subject_centre()
                    self.log(f'subject {pid}: {L.method} ({time.time() - t0:.1f}s)')
                except Exception as e:  # noqa: BLE001 — the centre is a guide for the pen, never a reason to stop
                    self.log(f'subject {pid}: centre not measured ({e}); the middle is used')
            self._centre[pid] = c
        return self._centre[pid]

    # -------------------------------------------------------------- the boards
    def _pair(self, i: int) -> bool:
        """Beat i opens a VERSION A | VERSION B pair (side l, then side r): the two go side by side on one row."""
        def side(j):
            if j >= len(self.beats):
                return None
            return next((e.get('side') for e in self.beats[j].fx if e['type'] == 'version'), None)
        return side(i) == 'l' and side(i + 1) == 'r'

    def _layout(self) -> dict:
        boards, cur, idx, out = [], None, 0, {}
        for i, b in enumerate(self.beats):
            n = i + 1
            if cur is None or b.raw.get('chapter') or len(cur['panels']) >= MAX_PRINTS:
                cur = {'id': len(boards), 'panels': []}
                boards.append(cur)
                idx = 0
            if self._pair(i):          # A on the left, B on its right: start the pair where a row runs left to right
                r_, c_ = divmod(idx, 3)
                if r_ % 2:
                    idx = (r_ + 1) * 3
                elif c_ == 2:
                    idx = (r_ + 2) * 3
            h = hsh(self.seed, n)
            gx, gy = PW + 60 + (h % 120), PH + 140 + ((h >> 8) % 100)
            r_, c_ = divmod(idx, 3)
            if r_ % 2:
                c_ = 2 - c_
            ox = c_ * gx + ((h >> 4) % 100) - 50
            oy = r_ * gy + ((h >> 12) % 80) - 40
            out[n] = {'board': cur['id'], 'ox': float(ox), 'oy': float(oy)}
            cur['panels'].append(n)
            idx += 1
        for bd in boards:
            xs = [out[n]['ox'] for n in bd['panels']]
            ys = [out[n]['oy'] for n in bd['panels']]
            x0, y0 = min(xs) - VR.MARGIN, min(ys) - VR.MARGIN
            for n in bd['panels']:
                out[n]['ox'] -= x0
                out[n]['oy'] -= y0
            bd['w'] = max(xs) - x0 + PW + VR.MARGIN
            bd['h'] = max(ys) - y0 + PH + VR.MARGIN
        path = []
        for n in self.order:
            s, p = self.shots[n], out[n]
            P = self.panel(n)
            pin = P.targets.get('pin')
            path.append({'n': n, 'start': s['start'], 'dur': s['frames'] / self.fps, 'board': p['board'], 'engine': 'vox',
                         'keys': [(t, x + p['ox'], y + p['oy'], z) for (t, x, y, z) in P.focus], 'ox': p['ox'], 'oy': p['oy'],
                         'pin': [pin[0] + p['ox'], pin[1] + p['oy'], pin[2]] if pin else None})
        return {'path': path, 'boards': boards}

    def panel(self, n: int):
        if n not in self._panels:
            if len(self._panels) > 3:
                self._panels.pop(next(iter(self._panels)))
            self._panels[n] = self.compose(n)
        return self._panels[n]

    def compose(self, n: int):
        s = self.shots[n]
        b = self.beats[s['i']]
        B = CaseBuilder(self, s, b, VR.RES)
        kind = s['visual']['type']
        fx = b.fx
        a = self.assets.get(b.panel)
        dur = B.dur
        if kind == 'chapter':
            self._chapter(B, next(e for e in fx if e['type'] == 'chapter'))
        elif kind == 'sources':
            self._sources(B, next(e for e in fx if e['type'] == 'sources'))
        elif kind == 'follow':
            self._follow(B, next(e for e in fx if e['type'] == 'follow'))
        elif kind == 'end':
            self._end(B, next(e for e in fx if e['type'] == 'end'))
        else:
            B.print_(a.path if a is not None else None, label=b.panel)
            focus = b.focus
            if b.raw.get('focus') == 'subject' or focus is None:
                focus = self.centre(b.panel) if a is not None else (0.5, 0.5)
            fxs = [e for e in fx if e['type'] not in DROPPED]
            slug = next((e for e in fxs if e['type'] == 'caption'), None)
            if slug:
                B.slug(slug)
            for e in fxs:
                t = e['type']
                if t == 'version':
                    B.version(e, slug is not None)
                elif t == 'score':
                    B.score(e)
                elif t == 'title':
                    B.title_card(e)
                elif t == 'tab':
                    B.tab(e)
            # the pen on the key detail: where an old effect pointed (a glint, droplets, shards, depth blur) or a shout
            point = next((e for e in fx if e['type'] in POINTERS), None)
            shout = next((e for e in fxs if e['type'] == 'smash'), None)
            target = None
            if point is not None or shout is not None:
                at = point.get('at') if point is not None else None
                fp = focus if (at in (None, 'subject') or not isinstance(at, (list, tuple))) else tuple(at)
                tm = float(shout['t0']) - 0.75 if shout is not None else (float(point.get('t0', 0)) if isinstance(point.get('t0'), (int, float)) else B.at_voice(0.45))
                target = B.circle_at(fp[0], fp[1], max(0.6, tm), 'detail')
            for e in fxs:
                if e['type'] == 'smash':
                    B.shout(e, target)
                    target = None   # a second shout on the same beat sits on its own
            srcs = {x['n']: x for x in self.ep.get('sources') or []}
            prev = self.beats[s['i'] - 1].raw.get('sources') if s['i'] > 0 else None
            sid = next((x for x in (b.raw.get('sources') or []) if x in srcs and parse_source(srcs[x]['title'])[1]), None)
            if sid is not None and sid not in (prev or []):
                B.clipping(srcs[sid], max(0.9, B.lead + 0.4))
            for e in fxs:
                if e['type'] == 'fade_black':
                    B.P.targets.setdefault('dim', []).append((float(e.get('t0', 0)) if isinstance(e.get('t0'), (int, float)) else max(0.0, dur - 1.4),
                                                              float(e.get('dur', 1.4)), float(e.get('to', 1.0))))
            self._camera(B, b, focus)
        st = self.stamp_beat.get(n)
        if st is not None:
            if 'folder' in B.P.targets:
                fx_, fy_ = B.P.targets['folder']
                B.stamp_({**st, 't0': float(st.get('t0', 0.9))}, (fx_, fy_), -9.0, 150)
            elif B.geo:
                at = st.get('at', (0.5, 0.4))
                t0 = st.get('t0', 0.5)
                t0 = max(0.0, dur - 1.4) if isinstance(t0, str) else float(t0)
                B.stamp_({**st, 't0': max(0.9, t0)}, B.at_pic(*at), float(st.get('rot', -8)), 210 * float(st.get('scale', 1.0)))
            else:
                B.stamp_({**st, 't0': 0.9}, (1500, 240), -8.0, 160)
        # VOX's finish: every word typed and every stroke drawn before the camera moves on
        P = B.P
        for e in P.els:
            if hasattr(e, 'fit'):
                e.fit(P.dur - 0.35)
        P.focus.sort(key=lambda k: k[0])
        if not P.focus or P.focus[0][0] > 0:
            P.focus.insert(0, (0.0, 960, 540, 0.94))
        out = [P.focus[0]]
        for k in P.focus[1:]:
            if k[0] - out[-1][0] < 0.4:
                out[-1] = (out[-1][0],) + tuple(k[1:]) if len(out) == 1 else (max(k[0], out[-2][0] + 0.4),) + tuple(k[1:])
            else:
                out.append(k)
        P.focus = out
        return P

    # -------------------------------------------------------------- the camera's wishes for a print
    def _camera(self, B: CaseBuilder, b, focus):
        P, dur, g = B.P, B.dur, B.geo
        c = (960.0, 560.0)
        z0 = 0.94
        a = float(b.amount if b.amount is not None else 0.16)
        F = B.at_pic(*focus)
        zf = min(1.36, z0 * (1 + 1.1 * a))
        near = (c[0] + (F[0] - c[0]) * 0.6, c[1] + (F[1] - c[1]) * 0.6)
        mv = b.move
        t1 = hold_until(dur)
        if mv in PUSH_MOVES:
            S, Ep = (c[0], c[1], z0), (near[0], near[1], zf)
        elif mv in PULL_MOVES:
            S, Ep = (near[0], near[1], zf), (c[0], c[1], z0)
        elif mv in ('pan_l', 'dolly_l', 'pan_r', 'dolly_r'):
            dx = 0.16 * g['pw'] * (1 if mv.endswith('_l') else -1)
            S, Ep = (c[0] + dx, c[1], z0 * 1.1), (c[0] - dx, c[1], z0 * 1.1)
        elif mv in ('pan_up', 'pan_down'):
            dy = 0.12 * g['ph'] * (1 if mv == 'pan_up' else -1)
            S, Ep = (c[0], c[1] + dy, z0 * 1.12), (c[0], c[1] - dy, z0 * 1.12)
        else:
            S, Ep = (c[0], c[1], z0), (c[0], c[1], z0 * 1.03)
        P.look(0.0, *S)
        P.look(t1, *S)
        if 'detail' in P.targets and mv not in PUSH_MOVES:   # the pen draws: look towards it on the way
            tm = next(e.t0 for e in P.els if isinstance(e, E.Marker) and e.name == 'detail')
            if t1 + 0.6 < tm < dur - 0.6:
                P.look(tm, near[0], near[1], max(z0 * 1.1, min(zf, 1.25)))
        P.look(dur, *Ep)
        fr = b.raw.get('freeze')
        if isinstance(fr, (list, tuple)) and len(fr) == 2:   # the camera stops dead on the word, then carries on
            f0, f1 = float(fr[0]), float(fr[1])
            keys = sorted(P.focus)
            here = _key_at(keys, f0)
            P.focus = [k for k in keys if not (f0 <= k[0] <= f1)] + [(f0,) + here, (min(dur, f1),) + here]

    # -------------------------------------------------------------- the other cards
    def _chapter(self, B: CaseBuilder, e: dict):
        P = B.P
        n = int(e.get('n', 1))
        cx, cy, fw, fh = 900.0, 560.0, 1240.0, 700.0
        tabh = 86.0
        im, pad = E.paper(fw, fh + tabh, B.res, B.seed + 41, tone=KRAFT, edges='', tape=0)
        a = np.asarray(im).copy()
        y1, xt = int(pad + tabh * B.res), int(pad + 420 * B.res)
        a[:y1 - int(2 * B.res), xt:, 3] = 0             # the folder's tab: only the left part of the top strip is paper
        a[:int(pad), :, 3] = 0
        im = Image.fromarray(a, 'RGBA')
        d = ImageDraw.Draw(im)
        d.line([(pad, y1), (pad + fw * B.res, y1)], fill=(150, 120, 88, 255), width=max(2, int(3 * B.res)))
        # the case line printed on the folder, its subject blacked out
        line = f"CASE FILE {self.ep.get('number', '00')} · {self.ep.get('title', '')} · SUBJECT:"
        lt = B.t(line, 'mono', 34, INK)
        lx, ly = int(pad + 80 * B.res), int(pad + (tabh + fh - 120) * B.res)
        im.alpha_composite(lt, (lx, ly))
        d.rectangle([lx + lt.width + int(18 * B.res), ly - int(2 * B.res), lx + lt.width + int(330 * B.res), ly + lt.height + int(2 * B.res)],
                    fill=INK + (255,))
        P.targets['redaction'] = (cx - fw / 2 + 80 + lt.width / B.res + 18, cy - (fh + tabh) / 2 + tabh + fh - 122, 312, lt.height / B.res + 4)
        sp = B.card_img(im, cx, cy, -1.2, 0.1, z=20, style='drop', frm=(0, -80), s0=1.04, dur=0.7)
        top = cy - (fh + tabh) / 2
        B.type(f'CHAPTER {n}', cx - fw / 2 + 40, top + 16, 46, sp.settle, font='mono', fill=INK, cps=24)
        t0 = sp.settle + 0.5
        w = B.words(str(e.get('text', '')), cx - fw / 2 + 80, top + tabh + 140, 128, t0, max_w=fw - 160, style='rise', stagger=0.11)
        B.highlight(w.rect, w.settle + 0.1, 'title', dur=0.55)
        P.targets['folder'] = (cx + fw / 2 - 270, top + tabh + 95)
        B.geo = {'cx': cx, 'cy': cy, 'pw': fw, 'ph': fh, 'rot': -1.2}
        B.pin(cx - fw / 2 + 390, top + 26, -1.2, sp.settle)
        P.look(0.0, cx + 40, cy - 20, 0.94)
        P.look(hold_until(B.dur), cx + 40, cy - 20, 0.94)
        P.look(B.dur, cx, cy - 30, 1.0)

    def _sources(self, B: CaseBuilder, e: dict):
        P = B.P
        srcs = e.get('sources') or self.ep.get('sources') or []
        im = _np2im(letter.sources_card(srcs))
        h_units = min(980.0, 1720.0 * im.height / im.width)
        im = _scaled(im, h_units * im.width / im.height, B.res)
        sp = B.card_img(im, 960, 540, -0.6, 0.2, z=30, style='drop', frm=(0, -60), s0=1.03, dur=0.7)
        B.geo = {'cx': 960.0, 'cy': 540.0, 'pw': im.width / B.res, 'ph': im.height / B.res, 'rot': -0.6}
        B.pin(960, 540 - h_units / 2 + 14, -0.6, sp.settle)
        P.look(0.0, 960, 420, 1.02)
        P.look(hold_until(B.dur), 960, 420, 1.02)
        P.look(B.dur, 960, 660, 1.04)

    def _follow(self, B: CaseBuilder, e: dict):
        """Rule 136 on the board: the supporters' card to fill in, JOIN US!, and our own SUBSCRIBE button pressed on the
        word "subscribe" (press_at, set from the narrator's word timing) — it turns to SUBSCRIBED."""
        P = B.P
        t0 = float(e.get('t0', 0.1))
        card = _scaled(_np2im(letter.member_card(e.get('club', 'CLASSIFIED · FANLIFE'), self.tone_rgb)), 820, B.res)
        sp = B.card_img(card, 680, 580, -3.0, t0, z=30, style='drop', frm=(0, -80), s0=1.04, dur=0.7)
        B.geo = {'cx': 680.0, 'cy': 580.0, 'pw': card.width / B.res, 'ph': card.height / B.res, 'rot': -3.0}
        B.pin(680, 580 - card.height / B.res / 2 + 14, -3.0, sp.settle)
        B.words('JOIN US!', 1420, 250, 150, t0 + 0.6, font='shout', style='pop', fill=RED, hot_fill=RED, plate=INK, shift=7,
                align='center', upper=False)
        press = float(e.get('press_at', B.dur * 0.8)) if isinstance(e.get('press_at'), (int, float)) else B.dur * 0.8
        ups = _scaled(_np2im(letter.subscribe_button(False, self.tone_rgb)), 560, B.res)
        dn = _scaled(_np2im(letter.subscribe_button(True, self.tone_rgb)), 560, B.res)
        P.add(Button(ups, dn, 1420, 700, t0 + 1.0, press))
        P.targets['press'] = press
        t1 = hold_until(B.dur)
        P.look(0.0, 960, 560, 0.94)
        P.look(t1, 960, 560, 0.94)
        P.look(max(t1 + 1.0, press - 0.8), 1100, 580, 1.0)
        P.look(B.dur, 1100, 580, 1.02)

    def _end(self, B: CaseBuilder, e: dict):
        P = B.P
        im = _scaled(_np2im(letter.end_card(e.get('site', 'fanlife.dubelteam.com'), e.get('handle', '@FanLifeFootballStories'), self.tone_rgb)), 1300, B.res)
        sp = B.card_img(im, 960, 540, -1.5, float(e.get('t0', 0.3)), z=30, style='drop', frm=(0, -60), s0=1.04, dur=0.7)
        B.geo = {'cx': 960.0, 'cy': 540.0, 'pw': im.width / B.res, 'ph': im.height / B.res, 'rot': -1.5}
        B.pin(960, 540 - im.height / B.res / 2 + 14, -1.5, sp.settle)
        P.look(0.0, 960, 540, 0.94)
        P.look(hold_until(B.dur), 960, 540, 0.94)
        P.look(B.dur, 960, 540, 1.0)

    # -------------------------------------------------------------- the board under beat n
    def board_upto(self, board: int, n: int) -> Image.Image:
        if self._board and self._board[0] == (board, n):
            return self._board[1]
        self._board = None
        b = self.layout['boards'][board]
        pp = self.dir / f'board-{board}.png'
        if not pp.exists():
            im = case_board(b, hsh(self.seed, board), str(self.ep.get('number', '00')), str(self.ep.get('title', '')))
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
    def n_at(self, f: int) -> int:
        i = 0
        for j, a in enumerate(self.f0):
            if f >= a:
                i = j
        return i + 1

    def _M(self, pose: Pose, scale: float, ox: float = 0.0, oy: float = 0.0) -> np.ndarray:
        """Output pixel → source pixel for a source drawn at `scale` px per unit with its origin at board units (ox, oy)."""
        c, s_ = math.cos(math.radians(pose.rot)), math.sin(math.radians(pose.rot))
        z, k = pose.z, self.k
        a, b, d, e = c / z / k, s_ / z / k, -s_ / z / k, c / z / k
        u0 = pose.cx - (c / z * VW / 2 + s_ / z * VH / 2)
        v0 = pose.cy - (-s_ / z * VW / 2 + c / z * VH / 2)
        return np.array([[a * scale, b * scale, (u0 - ox) * scale], [d * scale, e * scale, (v0 - oy) * scale]], np.float64)

    def screen(self, pose: Pose, bx: float, by: float) -> tuple[float, float]:
        c, s_ = math.cos(math.radians(pose.rot)), math.sin(math.radians(pose.rot))
        du, dv = bx - pose.cx, by - pose.cy
        return ((VW / 2 + pose.z * (c * du - s_ * dv)) * self.k, (VH / 2 + pose.z * (s_ * du + c * dv)) * self.k)

    def _strings(self, arr: np.ndarray, pose: Pose, n: int, t: float) -> None:
        """Red string from pin to pin across the board, drawn on as each print lands; the pins on top."""
        bd = self.where(n)['board']
        path = [p for p in self.layout['path'] if p['board'] == bd and p['n'] <= n and p['pin']]
        th = max(1, int(round(4.2 * pose.z * self.k)))
        pins = []
        for j, p in enumerate(path):
            land = p['pin'][2] if p['n'] == n else -1.0
            if p['n'] == n and t < land:
                break
            pins.append(p)
            if j == 0:
                continue
            q = path[j - 1]
            u = 1.0 if p['n'] < n else ease_in_out(clamp((t - land) / 0.9))
            pts = _sag(q['pin'][:2], p['pin'][:2])
            m = max(2, int(round(u * (len(pts) - 1))) + 1)
            sp = np.array([self.screen(pose, x, y) for x, y in pts[:m]], np.float32)
            sh = (sp + np.float32([2.5 * pose.z * self.k, 4 * pose.z * self.k])).astype(np.int32)
            ov = arr.copy()
            cv2.polylines(ov, [sh.reshape(-1, 1, 2)], False, (30, 20, 14), th + 1, cv2.LINE_AA)
            cv2.addWeighted(ov, 0.35, arr, 0.65, 0, arr)
            cv2.polylines(arr, [(sp * 16).astype(np.int32).reshape(-1, 1, 2)], False, STRING, th, cv2.LINE_AA, 4)
        r = max(2, int(round(10 * pose.z * self.k)))
        for p in pins:
            X, Y = self.screen(pose, *p['pin'][:2])
            if -20 < X < self.wh[0] + 20 and -20 < Y < self.wh[1] + 20:
                cv2.circle(arr, (int(X * 16 + 40 * pose.z * self.k), int(Y * 16 + 56 * pose.z * self.k)), r * 16, (40, 26, 18), -1, cv2.LINE_AA, 4)
                cv2.circle(arr, (int(X * 16), int(Y * 16)), r * 16, PIN, -1, cv2.LINE_AA, 4)
                cv2.circle(arr, (int((X - r * 0.35) * 16), int((Y - r * 0.35) * 16)), max(1, r // 3) * 16, (246, 190, 180), -1, cv2.LINE_AA, 4)

    def frame(self, f: int) -> np.ndarray:
        T = f / self.fps
        n = self.n_at(f)
        s = self.shots[n]
        t = T - s['start']
        pose = self.cam.pose(T)
        w = self.where(n)
        Wo, Ho = self.wh
        self.board_upto(w['board'], n)
        fill = tuple(int(c) for c in CORK)
        arr = cv2.warpAffine(self._board[2], self._M(pose, VR.BR), (Wo, Ho), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
                             borderMode=cv2.BORDER_CONSTANT, borderValue=fill)
        # the beat's own pieces: what has settled is baked once, what still moves is drawn over it
        P = self.panel(n)
        live = self._live.get(n)
        if live is None:
            self._live = {n: {'count': -1}}
            live = self._live[n]
        settled = [e for e in P.els if e.layer == 'board' and e.settle <= t]
        if live['count'] != len(settled):
            base = Image.new('RGBA', self.cv.size, (0, 0, 0, 0))
            for e in sorted(settled, key=lambda e: e.z):
                for pc in e.pieces(t, self.cv):
                    VR._paste(base, pc)
            live.update(count=len(settled), base=base, mip=None)
        moving = any(e.layer == 'board' and e.settle > t for e in P.els)
        canvas = self.canvas_at(P, t, live['base'], live_only=True) if moving else live['base']
        res = VR.RES
        src = canvas
        if res / (pose.z * self.k) > 1.75:   # a wide view: read a canvas half the size (no aliasing shimmer)
            if moving or live.get('mip') is None:
                half = canvas.resize((canvas.width // 2, canvas.height // 2), Image.BOX)
                if not moving:
                    live['mip'] = half
            else:
                half = live['mip']
            src, res = half, res / 2
        lay_ = cv2.warpAffine(np.asarray(src), self._M(pose, res, w['ox'] - self.cv.m, w['oy'] - self.cv.m), (Wo, Ho),
                              flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
        al = lay_[..., 3:4].astype(np.uint16)
        arr = ((arr.astype(np.uint16) * (255 - al) + lay_[..., :3].astype(np.uint16) * al + 127) // 255).astype(np.uint8)
        self._strings(arr, pose, n, t)
        # motion blur only while the camera glides fast
        prev = self.cam.pose(T - 1 / self.fps)
        if prev.board == pose.board:
            vx, vy = (pose.cx - prev.cx) * pose.z * self.k, (pose.cy - prev.cy) * pose.z * self.k
            sp = math.hypot(vx, vy)
            if sp > 24 * self.k:   # a short smear along the glide (VOX's blur, at half its length): fast, never a smudge
                arr = VR._dir_blur(arr, vx * 0.5, vy * 0.5, min(4, int(sp / (24 * self.k)) + 1))
        # a chapter change: the board fades to cork as the camera lifts off, the next one fades in as it settles
        fade = 0.0
        if pose.through > 0.4:
            fade = ease_in_out((pose.through - 0.4) / 0.6)
        if pose.arrive > 0.45:
            fade = max(fade, ease_in_out((pose.arrive - 0.45) / 0.55))
        a = self.dim(n, t)
        if a > 0.002:
            arr = (arr.astype(np.float32) * (1 - a) + np.float32(INK) * a).astype(np.uint8)
        if fade > 0:
            arr = (arr.astype(np.float32) * (1 - fade) + np.float32(CORK) * fade).astype(np.uint8)
        arr = ((arr.astype(np.uint16) * self.vign) >> 8).astype(np.uint8)
        if T < 1.6:   # the film opens out of the dark, once, slowly
            arr = (arr.astype(np.float32) * ease_in_out(T / 1.6)).astype(np.uint8)
        if self.post is not None:
            self.post(arr, T)
        return arr

    def dim(self, n: int, t: float) -> float:
        """How far the light is down (0..1): the beat's own fade_black, and a dimming left over from the beat before
        lifted over the first 0.9 s of this one — the light never comes back in one frame."""
        own = 0.0
        for (d0, dd, to) in self.panel(n).targets.get('dim', []):
            k = clamp((t - d0) / max(0.4, dd))
            own = max(own, to * k * k * (3 - 2 * k))
        if n > 1 and t < 0.9:
            prev = self.shots[n - 1]
            own = max(own, self.dim(n - 1, prev['frames'] / self.fps) * (1 - ease_in_out(t / 0.9)))
        return own

    # -------------------------------------------------------------- Composer.render's hooks
    def warm(self) -> None:
        """Before the frames are shared out: every board's paper and every print as it is left on the board, baked once."""
        letter.warm()
        t0 = time.time()
        for bd in self.layout['boards']:
            self.board_upto(bd['id'], bd['panels'][-1] + 1)
        self._board = None
        self.log(f"case board: {len(self.layout['boards'])} boards, {len(self.order)} pieces of evidence baked in {time.time() - t0:.0f}s")

    def chunk(self, f0: int, f1: int) -> bytes:
        return b''.join(self.frame(f).tobytes() for f in range(f0, f1))

    def cues(self) -> dict[int, list]:
        """n → [(t, sound)]: paper as a print lands, the typewriter, the pen, the stamp, a whoosh on every glide."""
        out = {}
        for j, n in enumerate(self.order):
            P = self.panel(n)
            c = [(round(a, 3), b) for a, b in P.cues if a < P.dur]
            w = self.cam.win[j]
            if j and (w['same'] or w['new']):
                c.append((0.0, 'whoosh'))
            out[n] = sorted(c)
        return out


class Button(E.El):
    """Our own SUBSCRIBE button: slides in, then on the word it turns to SUBSCRIBED with one small press (no flash)."""
    z = 70
    kind = 'data'

    def __init__(self, up: Image.Image, down: Image.Image, x: float, y: float, t0: float, press: float):
        self.up, self.down, self.x, self.y, self.t0, self.press = up, down, x, y, t0, press
        self.rect = (x - up.width / (2 * VR.RES), y - up.height / (2 * VR.RES), up.width / VR.RES, up.height / VR.RES)
        self.settle = max(t0 + 0.6, press + 0.3)
        self._c: dict = {}

    def pieces(self, t, cv):
        if t < self.t0:
            return []
        k = ease_out_cubic(clamp((t - self.t0) / 0.5))
        im = self.down if t >= self.press else self.up
        s = 1.0 - 0.06 * math.sin(math.pi * clamp((t - self.press) / 0.25)) if t >= self.press else 1.0
        r = E.transformed(im, SPose(cv.px(self.x), cv.px(self.y + (1 - k) * 160), s, 0.0, k), self._c.setdefault(id(im), {}))
        return [r] if r else []


def hold_until(dur: float) -> float:
    """The beat holds its arrival framing at least as long as the glide or the settle onto a new board takes, so the
    camera's own move starts from rest (CaseCamera: post ≤ 0.6 × glide ≤ 1.5 s, and ≤ half the beat)."""
    return min(0.5 * dur, 1.6)


def _key_at(keys: list, t: float) -> tuple[float, float, float]:
    from studio.vox.camera import _seg
    return _seg(keys, t)


def _kind(b) -> str:
    types = {e['type'] for e in b.fx}
    for k in ('chapter', 'sources', 'follow', 'end'):
        if k in types:
            return k
    return 'print'


def _no_picture(b) -> bool:
    return _kind(b) != 'print'


# ------------------------------------------------------------------ look at it
def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description='CLASSIFIED on the VOX case board: stills or a clip, with stand-in timing')
    ap.add_argument('--episode', type=Path, required=True)
    ap.add_argument('--panels', type=Path, action='append', required=True)
    ap.add_argument('--out', type=Path, required=True, help='a folder for stills, or an .mp4')
    ap.add_argument('--stills', default='', help='seconds, comma separated')
    ap.add_argument('--clip', default='', help='a-b seconds: an mp4 of that stretch')
    ap.add_argument('--size', default='1920x1080')
    ap.add_argument('--no-model', action='store_true')
    a = ap.parse_args(argv)
    if compose.inside_repo(a.out):
        print('refused: renders are never written inside the repository', file=sys.stderr)
        return 2
    man = load_manifest()
    ep_raw = json.loads(a.episode.read_text(encoding='utf-8'))
    from comic import produce
    from comic.roles import resolve
    for d in a.panels:
        r = resolve(man, d, ep_raw['file'])
        for b in ep_raw['beats']:
            if b['panel'].startswith('@') and b['panel'][1:] in r['map']:
                b['panel'] = r['map'][b['panel'][1:]]
    ep_raw = produce.with_follow(ep_raw)
    ep, beats = epi.load(ep_raw)
    assets = {}
    for d in a.panels:
        assets.update(scan_folder(d, 'auto', man))
    w, h = (int(x) for x in a.size.split('x'))
    film = CaseFilm(ep, beats, assets, (w, h), not a.no_model, 'slate', print, work=Path(tempfile.gettempdir()) / f"classified-vox-{ep['file']}")
    if a.stills:
        a.out.mkdir(parents=True, exist_ok=True)
        for s in a.stills.split(','):
            fr = film.frame(int(round(float(s) * film.fps)))
            cv2.imwrite(str(a.out / f'still-{float(s):07.2f}.png'), cv2.cvtColor(fr, cv2.COLOR_RGB2BGR))
        return 0
    if a.clip:
        import subprocess
        t0, t1 = (float(x) for x in a.clip.split('-'))
        p = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', str(film.fps),
                              '-i', '-', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', str(a.out)], stdin=subprocess.PIPE)
        for f in range(int(t0 * film.fps), int(t1 * film.fps)):
            p.stdin.write(film.frame(f).tobytes())
        p.stdin.close()
        return p.wait()
    film.render(a.out)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
