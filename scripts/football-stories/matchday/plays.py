"""I WAS THERE — the match plates (owner, 3.11.2026: "a visual of the goal … as close to the source as possible").

What the camera in the stand did not film, the film draws, and only as far as the match reports describe it:

  · play()     a goal (or a near miss) re-drawn the way a broadcast's tactics camera shows it: the goal at the top, the
               box in perspective, our players in the club's colour, theirs in white, the ball's path traced as it
               moves. Every movement on it is a sentence in a cited report; what no report says is not drawn (a goal
               whose build-up nobody described gets no plate). Each plate prints RECONSTRUCTION and its source.
  · board()    the ground's own scoreboard, re-drawn from the owner's clip of it, filling up goal by goal
  · red()      a red card slammed onto the frame, with the name of the man it was shown to
  · lights()   the stands lighting up in the dark, one point at a time (a supporter's phone, from the report)

Each returns (overlay, cues) like doc.py: overlay(t) → (RGBA, x, y) | None, in shot time.
"""
from __future__ import annotations

import math
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import studio.common as C
from studio.motion import ease_out_cubic

from doc import CAPS_FACE, CREAM, HEAD_FACE, INK, NUM_FACE, TYPE_FACE, _font, _rgb

SHOUT_FACE = 'knewave-latin-400-normal.woff2'
GRASS = (36, 58, 42)
GRASS_B = (40, 64, 46)
LINE = (226, 220, 200)
OPP = (246, 244, 236)

# ── pitch geometry: the attacking third seen from behind the attack, goal at the top ─────────────────────────────────
DEPTH = 30.0            # metres shown from the goal line


def _geo(W: int, H: int):
    top, bot = int(H * 0.27), int(H * 0.97)
    s_top, s_bot = W * 0.0165, W * 0.032          # px per metre across, at the goal line and at the bottom edge

    def P(x: float, y: float, z: float = 0.0) -> tuple[float, float, float]:
        k = max(0.0, min(1.25, y / DEPTH))
        s = s_top + (s_bot - s_top) * k
        sy = top + (bot - top) * (k ** 0.92)
        return W / 2 + (x - 34) * s, sy - z * s * 0.9, s
    return P, top, bot


@lru_cache(maxsize=4)
def _pitch(W: int, H: int, accent: str) -> Image.Image:
    P, top, bot = _geo(W, H)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # the grass: mown bands across, in perspective, inside a paper border
    for i in range(0, 36, 3):
        a, b = P(-6, i), P(74, i)
        c, e = P(74, i + 3), P(-6, i + 3)
        d.polygon([a[:2], b[:2], c[:2], e[:2]], fill=GRASS if (i // 3) % 2 else GRASS_B)

    def line(pts, w=3):
        d.line([P(*p)[:2] for p in pts], fill=LINE, width=w, joint='curve')

    line([(-6, 0), (74, 0)])                                     # goal line
    line([(13.84, 0), (13.84, 16.5), (54.16, 16.5), (54.16, 0)])    # the box
    line([(24.84, 0), (24.84, 5.5), (43.16, 5.5), (43.16, 0)])      # six-yard box
    sx, sy, s = P(34, 11)
    d.ellipse([sx - s * 0.25, sy - s * 0.18, sx + s * 0.25, sy + s * 0.18], fill=LINE)
    arc = [(34 + 9.15 * math.cos(a), 11 + 9.15 * math.sin(a)) for a in np.linspace(0.6435, math.pi - 0.6435, 24)]
    line(arc)
    # the goal: posts, crossbar, the net behind
    g0, g1 = 34 - 3.66, 34 + 3.66
    for x in np.linspace(g0, g1, 13):
        d.line([P(x, 0, 0)[:2], P(x, -2.0, 0.6)[:2]], fill=(200, 196, 182, 120), width=1)
    for z in np.linspace(0, 2.44, 6):
        d.line([P(g0, -2.0 * z / 2.44, z)[:2], P(g1, -2.0 * z / 2.44, z)[:2]], fill=(200, 196, 182, 110), width=1)
    d.line([P(g0, 0)[:2], P(g0, 0, 2.44)[:2], P(g1, 0, 2.44)[:2], P(g1, 0)[:2]], fill=(250, 248, 240), width=6)
    # darken toward the edges: a stage, not a diagram
    ys = np.linspace(0, 1, H)[:, None]
    xs = np.linspace(-1, 1, W)[None, :]
    vig = np.clip(1 - 0.55 * (xs ** 2) - 0.35 * (ys - 0.5) ** 2, 0, 1)
    a = np.asarray(im, 'float32')
    a[..., :3] *= vig[..., None]
    im = Image.fromarray(a.clip(0, 255).astype('uint8'), 'RGBA')
    soft = im.filter(ImageFilter.GaussianBlur(0.6))
    return soft


def _lerp_keys(keys: list, t: float) -> tuple | None:
    """keys = [[t, x, y, (z)], …] → the point at t, eased between keys. None before the first key."""
    if not keys or t < keys[0][0]:
        return None
    for a, b in zip(keys, keys[1:]):
        if t <= b[0]:
            u = (t - a[0]) / max(1e-6, b[0] - a[0])
            u = u * u * (3 - 2 * u)
            za, zb = (a[3] if len(a) > 3 else 0), (b[3] if len(b) > 3 else 0)
            return a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, za + (zb - za) * u
    k = keys[-1]
    return k[1], k[2], (k[3] if len(k) > 3 else 0)


def _ball_at(segs: list, t: float):
    """segs = [{'from': t, 'to': t, 'path': [[x, y, z], …]}] — a pass, a cross, a shot. Between segments the ball
    rests where the last one ended; a segment marked 'jump' starts fresh (another moment, seconds later)."""
    cur = None
    for s in segs:
        if t < s['from']:
            break
        if s.get('hide') and t > s['to'] + 0.25:      # the ball leaves the picture: another moment comes next
            cur = None
            continue
        path = s['path']
        u = min(1.0, (t - s['from']) / max(1e-6, s['to'] - s['from']))
        if s.get('ease', 'out') == 'out':
            u = 1 - (1 - u) ** 2
        pos = u * (len(path) - 1)
        i = min(len(path) - 2, int(pos))
        f = pos - i
        a, b = path[i], path[i + 1]
        cur = (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, (a[2] if len(a) > 2 else 0) + ((b[2] if len(b) > 2 else 0) - (a[2] if len(a) > 2 else 0)) * f,
               s, u)
    return cur


def _tag(text: str, size: int, fg, bg) -> Image.Image:
    f = _font(CAPS_FACE, size)
    w = int(f.getlength(text)) + size
    im = Image.new('RGBA', (w, int(size * 1.5)), bg + (235,))
    ImageDraw.Draw(im).text((w / 2, size * 0.76), text, font=f, fill=fg, anchor='mm')
    return im


def play(spec: dict, accent: str, t0: float = 0.2):
    """spec = {'minute': "21'", 'name': 'STEVEN ZUBER', 'source': '…',
               'ours': [{'name', 'keys': [[t, x, y], …]}], 'theirs': [...same...],
               'ball': [{'from', 'to', 'path': [[x, y, z], …], 'label': 'CORNER', 'kick': True}],
               'goal': t | None, 'bar': t | None, 'callouts': [[t, 'TEXT', dur]]}
    Coordinates in metres: x across the pitch (0–68, goal posts 30.3–37.7), y out from the goal line (0–34)."""
    W, H = C.W, C.H
    acc = _rgb(accent)
    base = _pitch(W, H, accent)
    P, top, bot = _geo(W, H)
    rng = np.random.default_rng(len(spec.get('name', '')))
    cues: list[tuple[float, str]] = []
    for s in spec.get('ball', []):
        if s.get('kick', True):
            cues.append((t0 + s['from'], 'tick'))
    if spec.get('goal') is not None:
        cues += [(t0 + spec['goal'], 'boom'), (t0 + spec['goal'] + 0.05, 'crowd-goal')]
    if spec.get('bar') is not None:
        cues += [(t0 + spec['bar'], 'boom')]
    f_min = _font(NUM_FACE, int(H * 0.085))
    f_name = _font(HEAD_FACE, int(H * 0.05))
    f_src = _font(TYPE_FACE, int(H * 0.019))
    f_shout = _font(SHOUT_FACE, int(H * 0.15))
    name_tags = {}

    def ov(t: float):
        tt = t - t0
        if tt < 0:
            return None
        k_in = ease_out_cubic(min(1.0, tt / 0.6))
        im = base.copy()
        if k_in < 1:
            a = np.asarray(im, 'float32')
            a[..., 3] *= k_in
            im = Image.fromarray(a.astype('uint8'), 'RGBA')
        d = ImageDraw.Draw(im)
        ball = _ball_at(spec.get('ball', []), tt)
        # the ball's trail: the path so far on the ground, dashed, in our colour
        for s in spec.get('ball', []):
            if tt < s['from'] or (s.get('fade') and tt > s['to'] + 1.2 and not (ball and ball[3] is s)):
                continue
            u = 1.0 if tt > s['to'] else (ball[4] if ball and ball[3] is s else 0)
            path = s['path']
            n = 60
            pts = []
            for j in range(int(n * u) + 1):
                pos = (j / n) * (len(path) - 1)
                i = min(len(path) - 2, int(pos))
                f = pos - i
                a_, b_ = path[i], path[i + 1]
                pts.append(P(a_[0] + (b_[0] - a_[0]) * f, a_[1] + (b_[1] - a_[1]) * f)[:2])
            for j in range(0, len(pts) - 1, 2):
                d.line([pts[j], pts[j + 1]], fill=acc + (230,), width=5)
        # players: theirs, then ours, nearer ones drawn last
        bodies = []
        for side, fill in (('theirs', OPP), ('ours', acc)):
            for pl in spec.get(side, []):
                p = _lerp_keys(pl['keys'], tt)
                if p:
                    bodies.append((p[1], side, fill, pl, p))
        for y, side, fill, pl, p in sorted(bodies, key=lambda b: b[0]):
            sx, sy, s = P(p[0], p[1])
            r = max(12, s * 0.85)
            d.ellipse([sx - r * 1.05, sy + r * 0.55, sx + r * 1.05, sy + r * 1.05], fill=(0, 0, 0, 90))        # shadow
            d.ellipse([sx - r, sy - r * 2.2, sx + r, sy - r * 0.2], fill=fill + (255,), outline=INK + (255,), width=4)
            if pl.get('name') and (pl.get('show', 0) <= tt):
                key = (pl['name'], side)
                if key not in name_tags:
                    name_tags[key] = _tag(pl['name'], int(H * 0.022), INK + (255,) if side == 'ours' else CREAM + (255,),
                                          acc if side == 'ours' else INK)
                tg = name_tags[key]
                im.alpha_composite(tg, (int(sx - tg.width / 2), int(sy - r * 2.2 - tg.height - 6)))
        # the ball, lifted off its shadow when it is in the air
        if ball:
            bx, by, bz = ball[0], ball[1], ball[2]
            gx, gy, s = P(bx, by)
            _, ay, _ = P(bx, by, bz)
            rb = max(6, s * 0.3)
            d.ellipse([gx - rb, gy - rb * 0.45, gx + rb, gy + rb * 0.45], fill=(0, 0, 0, 120))
            d.ellipse([gx - rb, ay - rb * 2, gx + rb, ay], fill=(252, 250, 244, 255), outline=INK + (255,), width=3)
        # callouts: what the report says happened, in its words, typed on a strip
        for c in spec.get('callouts', []):
            ct, text, cd = c[0], c[1], (c[2] if len(c) > 2 else 1.6)
            if ct <= tt <= ct + cd:
                u = min(1.0, (tt - ct) / 0.25)
                tg = _tag(text, int(H * 0.03), CREAM + (255,), INK)
                x = int(W * 0.5 - tg.width / 2)
                x = int(W * 0.95 - tg.width)
                y = int(H * 0.075 + (1 - u) * 20)
                tg.putalpha(tg.getchannel('A').point(lambda v, u=u: int(v * u)))
                im.alpha_composite(tg, (x, y))
        # the net, and the word
        if spec.get('goal') is not None and tt >= spec['goal']:
            g = tt - spec['goal']
            if g < 0.5:            # the net bulges: a pale flash behind the line
                for _ in range(40):
                    x = rng.uniform(30.4, 37.6)
                    z = rng.uniform(0, 2.4)
                    a1 = P(x, -1.0 - 1.2 * (1 - g / 0.5), z)[:2]
                    d.point(a1, fill=(255, 255, 255, 200))
            k = ease_out_cubic(min(1.0, g / 0.3))
            word = Image.new('RGBA', (int(W * 0.6), int(H * 0.24)), (0, 0, 0, 0))
            wd = ImageDraw.Draw(word)
            wd.text((word.width / 2 + 8, word.height / 2 + 8), 'GOAL!', font=f_shout, fill=INK + (255,), anchor='mm')
            wd.text((word.width / 2, word.height / 2), 'GOAL!', font=f_shout, fill=acc + (255,), anchor='mm')
            sc = 1.5 - 0.5 * k
            word = word.resize((max(1, int(word.width * sc)), max(1, int(word.height * sc))), Image.BICUBIC).rotate(-4, expand=True)
            word.putalpha(word.getchannel('A').point(lambda v, k=k: int(v * min(1, k * 1.4))))
            im.alpha_composite(word, (int(W / 2 - word.width / 2), int(H * 0.60 - word.height / 2)))
        if spec.get('bar') is not None and spec['bar'] <= tt <= spec['bar'] + 1.0:
            u = (tt - spec['bar'])
            x0, y0, s = P(34, 0, 2.44)
            d.line([P(30.34, 0, 2.44)[:2], P(37.66, 0, 2.44)[:2]], fill=acc + (int(255 * (1 - u)),), width=int(10 + 8 * (1 - u)))
        # the slate: minute and name top-left, the source bottom-right
        d.text((int(W * 0.05), int(H * 0.06)), spec.get('minute', ''), font=f_min, fill=acc + (255,), anchor='lt')
        mx = int(W * 0.05 + f_min.getlength(spec.get('minute', '')) + 24)
        d.text((mx, int(H * 0.075)), spec.get('name', ''), font=f_name, fill=CREAM + (255,), anchor='lt')
        if spec.get('sub'):
            d.text((mx, int(H * 0.075 + H * 0.06)), spec['sub'], font=_font(CAPS_FACE, int(H * 0.024)), fill=(200, 194, 176, 255), anchor='lt')
        src = 'RECONSTRUCTION · ' + spec.get('source', 'from the match reports')
        d.text((int(W * 0.95), int(H * 0.955)), src, font=f_src, fill=(200, 194, 176, 220), anchor='rs')
        return im, 0, 0
    return ov, cues


# ── the ground's scoreboard, re-drawn from the owner's own clip of it ────────────────────────────────────────────────
@lru_cache(maxsize=16)
def board_image(home_crest: str, away: str, score: str, minute: str, scorers: tuple, accent: str, w: int) -> Image.Image:
    h = int(w * 0.62)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, w, h], radius=int(w * 0.02), fill=(14, 14, 16, 255), outline=(60, 60, 66, 255), width=6)
    d.rectangle([int(w * 0.02), int(h * 0.03), int(w * 0.98), int(h * 0.97)], outline=(32, 32, 36, 255), width=2)
    # a fine LED grid over the panel
    grid = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    for x in range(0, w, 6):
        gd.line([(x, 0), (x, h)], fill=(0, 0, 0, 40))
    crest = Image.open(home_crest).convert('RGBA')
    cs = int(h * 0.36)
    crest.thumbnail((cs, cs), Image.LANCZOS)
    im.alpha_composite(crest, (int(w * 0.13 - crest.width / 2), int(h * 0.30 - crest.height / 2)))
    r = int(h * 0.15)
    cx, cy = int(w * 0.87), int(h * 0.30)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(245, 245, 245, 255), outline=(20, 20, 20, 255), width=5)
    d.text((cx, cy), away, font=_font(HEAD_FACE, int(r * 0.6)), fill=(20, 20, 20, 255), anchor='mm')
    d.text((w / 2, int(h * 0.30)), score, font=_font(NUM_FACE, int(h * 0.30)), fill=(250, 248, 240, 255), anchor='mm')
    d.text((w / 2, int(h * 0.56)), minute, font=_font(NUM_FACE, int(h * 0.11)), fill=(250, 248, 240, 255), anchor='mm')
    f = _font(CAPS_FACE, int(h * 0.052))
    for i, s in enumerate(scorers):
        d.text((int(w * 0.06), int(h * 0.69 + i * h * 0.062)), s, font=f, fill=(236, 232, 220, 255), anchor='ls')
    d.rectangle([int(w * 0.06), int(h * 0.90), int(w * 0.94), int(h * 0.93)], fill=_rgb(accent) + (255,))
    im.alpha_composite(grid)
    return im


def board(home_crest: str, away: str, score: str, minute: str, scorers: list[str], accent: str, t0: float = 0.25,
          w_frac: float = 0.5, at=(0.5, 0.47), prev: str | None = None):
    """The scoreboard swings in; if `prev` is given, it first shows the old score and the new one flips in."""
    W, H = C.W, C.H
    w = int(W * w_frac)
    new = board_image(home_crest, away, score, minute, tuple(scorers), accent, w)
    old = board_image(home_crest, away, prev, minute, tuple(scorers[:-1]), accent, w) if prev else None
    cues = [(t0, 'whoosh')] + ([(t0 + 0.9, 'stamp')] if prev else [(t0 + 0.35, 'stamp')])

    def ov(t: float):
        tt = t - t0
        if tt < 0:
            return None
        k = ease_out_cubic(min(1.0, tt / 0.45))
        img = old if (old is not None and tt < 0.9) else new
        if old is not None and 0.9 <= tt < 1.05:      # the flip: a flash on the numbers
            img = new.copy()
            ImageDraw.Draw(img).rectangle([int(w * 0.3), 0, int(w * 0.7), int(w * 0.62 * 0.45)], fill=(255, 255, 255, 90))
        s = 0.86 + 0.14 * k
        im = img.resize((max(1, int(img.width * s)), max(1, int(img.height * s))), Image.BICUBIC).rotate(-1.5 * (1 - k) - 1, expand=True)
        im.putalpha(im.getchannel('A').point(lambda v: int(v * min(1, k * 1.5))))
        return im, int(W * at[0] - im.width / 2), int(H * at[1] - im.height / 2 + (1 - k) * 80)
    return ov, cues


def red(name: str, minute: str, t0: float = 0.4):
    """A red card, slammed. The man's name under it, as the report gives it."""
    W, H = C.W, C.H
    cw, ch = int(H * 0.30), int(H * 0.42)
    card = Image.new('RGBA', (cw + 30, ch + 30), (0, 0, 0, 0))
    cd = ImageDraw.Draw(card)
    cd.rounded_rectangle([18, 18, cw + 18, ch + 18], radius=16, fill=(0, 0, 0, 150))
    cd.rounded_rectangle([0, 0, cw, ch], radius=16, fill=(206, 24, 30, 255), outline=INK + (255,), width=5)
    tag = _tag(f'{minute}  {name}', int(H * 0.04), CREAM + (255,), INK)
    cues = [(t0, 'whoosh'), (t0 + 0.3, 'stamp')]

    def ov(t: float):
        tt = t - t0
        if tt < 0:
            return None
        k = ease_out_cubic(min(1.0, tt / 0.3))
        s = 1.6 - 0.6 * k
        im = card.resize((int(card.width * s), int(card.height * s)), Image.BICUBIC).rotate(8 - 2 * k, expand=True)
        out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        out.alpha_composite(im, (int(W * 0.72 - im.width / 2), int(H * 0.42 - im.height / 2)))
        if tt > 0.45:
            u = min(1.0, (tt - 0.45) / 0.3)
            tg = tag.copy()
            tg.putalpha(tg.getchannel('A').point(lambda v: int(v * u)))
            out.alpha_composite(tg, (int(W * 0.72 - tg.width / 2), int(H * 0.73)))
        return out, 0, 0
    return ov, cues


def lights(t0: float = 0.3, n: int = 1400, region=(0.0, 0.08, 1.0, 0.62), build: float = 4.0, seed: int = 7):
    """Points of light coming on across a dark stand, flickering a little — a ground before kick-off with the
    floodlights off and the supporters' phones held up."""
    W, H = C.W, C.H
    rng = np.random.default_rng(seed)
    xs = rng.uniform(region[0], region[2], n) * W
    ys = (region[1] + (region[3] - region[1]) * rng.beta(1.3, 1.1, n)) * H
    on = t0 + rng.uniform(0, 1, n) ** 1.6 * build
    ph = rng.uniform(0, 6.28, n)
    sz = rng.choice([1.5, 2.0, 2.6, 3.4], n, p=[0.35, 0.35, 0.2, 0.1])
    cues: list[tuple[float, str]] = []

    def ov(t: float):
        if t < t0:
            return None
        im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        live = on <= t
        for x, y, p, s, o in zip(xs[live], ys[live], ph[live], sz[live], on[live]):
            a = min(1.0, (t - o) / 0.25) * (0.75 + 0.25 * math.sin(t * 5 + p))
            r = s * (1.0 + 0.15 * math.sin(t * 3 + p))
            d.ellipse([x - r * 2.6, y - r * 2.6, x + r * 2.6, y + r * 2.6], fill=(255, 246, 214, int(40 * a)))
            d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 252, 240, int(255 * a)))
        return im, 0, 0
    return ov, cues
