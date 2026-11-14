"""The camera grammar (owner, 12.11.2026: "as little static camera as possible — interesting camera movement").

Until now a DOCU picture had one of five tweens on ONE flat layer (push, pull, two pans, a slam), and the editor's looks
glided at a constant speed. That is motion to a ruler; to a viewer it is a photograph sliding. This is a camera: every
move is a named move with a PURPOSE, played on two or three depth planes so near things travel further than far ones
(parallax), eased at both ends, and bounded in speed and acceleration — "movement" here is deliberate camera and layer
motion, never jitter (rule 142: no shake, no flicker, no flash).

    dolly    the walls close in — a slow push, the foreground growing faster than the ground behind      tension, dread
    crane    the reveal — the camera rises over the foreground and the ground opens                      pride, wonder, a stadium
    track    travelling along a line of people — a lateral move, near plane ahead of the far one         defiance, a crowd, a journey
    rack     from one subject to the other — the frame travels between two points of the picture         a duel, humour, cause → effect
    orbit    the planes drift opposite ways, as if the camera walked round the subject                   joy, awe
    snap     the hit — a fast zoom that settles once (ease-out, no overshoot) and then breathes          release, a goal
    pull     stepping back from it — the frame widens slowly                                             grief, the morning after
    breath   a held frame is never frozen — a very slow drift, for a picture under a card                calm, under type

The planes of a still (`planes`): `back` is the picture; `fore` is the same picture again, masked to its foreground band
(below the picture's horizon — read off the picture by `horizon`, else the lower 42%) and moved further; `vig` is a soft
vignette that moves least — the 2-plane fallback when a picture has no band to lift. A cut-out figure the plan put in
front is the nearest plane and takes the move's direction (docu/build.Film.cutout).

One description, three readers: `gsap()` writes the tweens for the HyperFrames layer (DOCU, vox-hf), `pose()` gives the
same move as numbers at a time (VOX's PIL stills, `frame_pil`), and `flow()` is VOX's `CameraPath.flow()` for a move —
dead frames and the worst jerk of the tween curves, held by a unit test for every move at every intensity
(docs/fanlife/71: "what the code measures, so it cannot drift").

The director chooses (`choose`): by the beat's emotion on the score sheet (studio/drama.py), then by what the picture
shows, and never the same move three times running (docs/71).
"""
from __future__ import annotations

import math

W, H = 1920, 1080
# Bounds, in film pixels at the edge of the 1920 frame, per frame at 25 fps. VOX retimes any move faster than
# 1400 px/s (docs/71) — 56 px a frame; a camera move inside a shot stays far under that, and its acceleration under
# JERK_MAX. `snap` alone starts fast: it starts ON the cut, so its first frame is the cut's, not a jerk.
SPEED_MAX = 30.0
JERK_MAX = 4.0
SNAP_S = 0.7            # the snap's travel; after it the frame breathes
BREATH = 0.006          # scale a second while a frame "holds": 5.8 px a second at the frame's edge
# What the gate calls motion is measured on 160×90 grey frames (qa.MOTION_FLOOR 0.05 levels a frame): BREATH on a
# picture with any detail measures 0.1–0.3. Slower than this a held frame reads as dead.

GLIDE, SETTLE = 0.3, 0.06
# The two eases GSAP does not ship, as the page defines them (docu/build.Film.page, hyperframes/build): the same
# formulas as `ease()` below, so what is measured is what plays.
EASES_JS = (f'var glide=function(u){{return {GLIDE}*u+{1 - GLIDE}*(0.5-0.5*Math.cos(Math.PI*u))}};'
            f'var settle=function(u){{return {SETTLE}*u+{1 - SETTLE}*(1-Math.pow(1-u,3))}};')
OWN_EASES = ('glide', 'settle')
SNAP_SPEED_MAX = 56.0   # the snap alone may travel at VOX's own limit (1400 px/s, docs/71 `_retime`) …
SNAP_JERK_MAX = 8.0     # … and it only ever slows down

MOVES = ('dolly', 'crane', 'track', 'rack', 'orbit', 'snap', 'pull', 'breath')
PURPOSE = {'dolly': 'the walls close in', 'crane': 'the reveal: rise and the ground opens', 'track': 'travelling along the people',
           'rack': 'from one subject to the other', 'orbit': 'walking round it', 'snap': 'the hit, settled once',
           'pull': 'stepping back from it', 'breath': 'a held frame that still breathes'}
# emotion → the moves that tell it, best first (the director takes the first that is not the third of its kind running)
BY_EMOTION = {
    'tension': ('dolly', 'rack', 'track'), 'dread': ('dolly', 'pull', 'rack'), 'release': ('snap', 'orbit', 'crane'),
    'joy': ('orbit', 'crane', 'snap'), 'pride': ('crane', 'orbit', 'dolly'), 'grief': ('pull', 'breath', 'dolly'),
    'defiance': ('track', 'dolly', 'orbit'), 'wonder': ('crane', 'orbit', 'pull'), 'humour': ('rack', 'track', 'orbit'),
    None: ('dolly', 'track', 'orbit', 'crane', 'rack', 'pull'),
}
# what the picture shows can ask for a move before the emotion does (a stadium wants the crane, a crowd the track)
BY_SUBJECT = {'stadium': 'crane', 'crowd': 'track', 'stand': 'track', 'travel': 'track', 'city': 'crane', 'trophy': 'orbit', 'map': 'rack'}


def ease(name: str, u: float) -> float:
    """GSAP's eases, as numbers (so the curves written into the page are the curves measured here)."""
    u = min(1.0, max(0.0, u))
    if name in ('none', 'linear'):
        return u
    if name == 'sine.inOut':
        return 0.5 - 0.5 * math.cos(math.pi * u)
    if name == 'glide':     # eased at both ends but never stopped: 30% of the way is constant speed (docs/71: never dead)
        return GLIDE * u + (1 - GLIDE) * (0.5 - 0.5 * math.cos(math.pi * u))
    if name == 'settle':    # the snap's landing: a cubic ease-out that arrives still moving at the breath's pace
        return SETTLE * u + (1 - SETTLE) * (1 - (1 - u) ** 3)
    kind, _, way = name.partition('.')
    p = {'power1': 2, 'power2': 3, 'power3': 4, 'power4': 5}.get(kind)
    if p is None:
        raise ValueError(f'unknown ease {name}')
    if way == 'in':
        return u ** p
    if way == 'out':
        return 1 - (1 - u) ** p
    return 0.5 * (2 * u) ** p if u < 0.5 else 1 - 0.5 * (2 - 2 * u) ** p


def spec(move: str, d: float, intensity: float = 0.5, base: float = 1.0, way: int = 1, rack: tuple[float, float] | None = None) -> list[dict]:
    """A move over `d` seconds → its segments per plane: [{'plane', 'at', 'dur', 'ease', 'a': {scale,x,y}, 'b': {…}}].
    `intensity` (0–1, the score sheet's) is how far the move travels, never how fast it shakes; `base` is the framing's
    own scale (a detail look sits at 1.5 and moves from there); `way` ±1 flips a lateral move; `rack` is the second
    subject's offset from the first in frame pixels. Amplitudes scale with the time there is, so a long hold does not
    crawl and a short one does not rush past SPEED_MAX."""
    if move not in MOVES:
        raise ValueError(f'unknown camera move {move}')
    k = 0.8 + 0.9 * min(1.0, max(0.0, intensity))          # 0.8 … 1.7
    span = min(1.0, max(0.35, d / 4.0))                    # a 1.4 s look travels a third of what a 4 s one does
    g = k * span
    seg = lambda plane, a, b, e='glide', at=0.0, dur=None: {'plane': plane, 'at': round(at, 3), 'dur': round(d - at if dur is None else dur, 3), 'ease': e,  # noqa: E731
                                                                 'a': {'scale': round(a[0] * base, 4), 'x': round(a[1], 1), 'y': round(a[2], 1)},
                                                                 'b': {'scale': round(b[0] * base, 4), 'x': round(b[1], 1), 'y': round(b[2], 1)}}
    if move == 'dolly':      # the foreground grows faster than the ground: the walls close in
        return [seg('back', (1.03, 0, 0), (1.03 + 0.09 * g, 0, 0)), seg('fore', (1.06, 0, 6), (1.06 + 0.17 * g, 0, 6 + 14 * g)),
                seg('vig', (1.0, 0, 0), (1.0 + 0.10 * g, 0, 0))]
    if move == 'pull':
        return [seg('back', (1.04 + 0.09 * g, 0, 0), (1.04, 0, 0)), seg('fore', (1.07 + 0.17 * g, 0, 10 + 14 * g), (1.07, 0, 10)),
                seg('vig', (1.0 + 0.08 * g, 0, 0), (1.0, 0, 0))]
    # Every plane stays larger than the frame by more than it travels (scale − 1 against x and y), so no edge shows.
    if move == 'crane':      # rise: the ground comes down the frame, the foreground drops away faster
        return [seg('back', (1.12, 0, -22 * g), (1.09, 0, 20 * g)), seg('fore', (1.28, 0, -24 * g), (1.24, 0, 72 * g)), seg('vig', (1.04, 0, 0), (1.0, 0, 0))]
    if move == 'track':      # lateral: near plane ahead of the far one
        return [seg('back', (1.10, -46 * g * way, 0), (1.10, 46 * g * way, 0)), seg('fore', (1.18, -90 * g * way, 8), (1.18, 90 * g * way, 8)),
                seg('vig', (1.02, 12 * g * way, 0), (1.02, -12 * g * way, 0))]
    if move == 'orbit':      # the planes pass each other
        return [seg('back', (1.10, 40 * g * way, 0), (1.12, -40 * g * way, 0)), seg('fore', (1.16, -58 * g * way, 8), (1.19, 58 * g * way, 8)),
                seg('vig', (1.02, 0, 0), (1.04, 0, 0))]
    if move == 'rack':       # the frame travels from the first subject to the second, tighter as it arrives
        rx, ry = rack or (150.0 * way, -30.0)
        gg = min(g, 1.2)
        rx, ry = max(-180.0, min(180.0, rx)) * gg, max(-90.0, min(90.0, ry)) * gg
        return [seg('back', (1.18, rx / 2, ry / 2), (1.24, -rx / 2, -ry / 2)), seg('fore', (1.24, rx * 0.7, ry * 0.7 + 8), (1.32, -rx * 0.7, -ry * 0.7 + 8)),
                seg('vig', (1.0, 0, 0), (1.05, 0, 0))]
    if move == 'snap':       # in fast on the cut, settle once (ease-out: nothing comes back), then breathe
        t1 = min(SNAP_S, d * 0.5)
        rest = max(0.0, d - t1)
        z = (0.11 + 0.07 * (k - 0.8)) * min(1.0, t1 / SNAP_S)
        out = [seg('back', (1.06 + z, 0, 0), (1.06, 0, 0), 'settle', 0.0, t1), seg('fore', (1.10 + z * 1.3, 0, 10), (1.10, 0, 10), 'settle', 0.0, t1),
               seg('vig', (1.0 + z, 0, 0), (1.0, 0, 0), 'settle', 0.0, t1)]
        if rest > 0.2:
            out += [seg('back', (1.06, 0, 0), (1.06 + BREATH * rest, 0, 0), 'none', t1, rest), seg('fore', (1.10, 0, 10), (1.10 + 2 * BREATH * rest, 0, 10), 'none', t1, rest)]
        return out
    # breath: under a card or a board the picture must not pull the eye — it only never stops
    return [seg('back', (1.03, -6 * way, 0), (1.03 + BREATH * d, 6 * way, 0), 'none'), seg('fore', (1.05, -12 * way, 6), (1.05 + 1.8 * BREATH * d, 12 * way, 6), 'none')]


def pose(move: str, d: float, t: float, plane: str = 'back', **kw) -> dict:
    """The move as numbers: the plane's {scale, x, y} at `t` seconds — what the PIL engines draw (frame_pil)."""
    last = None
    for s in spec(move, d, **kw):
        if s['plane'] != plane:
            continue
        if t < s['at'] and last is None:
            return dict(s['a'])
        if t <= s['at'] + s['dur'] or last is None or s['at'] >= last['at']:
            last = s
            if t <= s['at'] + s['dur']:
                break
    if last is None:
        return {'scale': 1.0, 'x': 0.0, 'y': 0.0}
    u = ease(last['ease'], (t - last['at']) / last['dur']) if last['dur'] > 0 else 1.0
    return {k: last['a'][k] + (last['b'][k] - last['a'][k]) * u for k in ('scale', 'x', 'y')}


def flow(move: str, d: float, fps: int = 25, **kw) -> dict:
    """VOX's CameraPath.flow() for a move's tween curves: how far the frame's edge travels each frame on the plane that
    moves most. `dead_frames` — frames that move under 0.05 px (must be 0); `worst_jerk` — the largest change of that
    speed from one frame to the next (the first frame is the cut the shot arrives on); `max_speed`."""
    n = max(2, int(round(d * fps)))
    worst = {'frames': n, 'dead_frames': 0, 'worst_jerk': 0.0, 'max_speed': 0.0, 'slowest': 1e9}
    per_plane = []
    for plane in ('back', 'fore'):
        ps = [pose(move, d, i / fps, plane, **kw) for i in range(n + 1)]
        # the edge of the frame moves by Δscale × half the width, plus the translation
        sp = [abs(b['scale'] - a['scale']) * (W / 2) + math.hypot(b['x'] - a['x'], b['y'] - a['y']) for a, b in zip(ps, ps[1:])]
        per_plane.append(sp)
    speeds = [max(a, b) for a, b in zip(*per_plane)]
    jerk = [abs(b - a) for a, b in zip(speeds, speeds[1:])]
    return {'frames': n, 'dead_frames': sum(1 for v in speeds if v < 0.05), 'worst_jerk': round(max(jerk[1:] or [0.0]), 2),
            'max_speed': round(max(speeds[1:] or speeds), 2), 'slowest': round(min(speeds), 3), 'first_frame': round(speeds[0], 2)}


def problems(move: str, d: float, **kw) -> list[str]:
    """What is wrong with a move at this length, in words (empty when it is calm by construction)."""
    f = flow(move, d, **kw)
    out = []
    top, jerk = (SNAP_SPEED_MAX, SNAP_JERK_MAX) if move == 'snap' else (SPEED_MAX, JERK_MAX)
    if f['dead_frames']:
        out.append(f'{move} over {d:.1f}s stands dead for {f["dead_frames"]} frames')
    if max(f['max_speed'], f['first_frame']) > top:
        out.append(f'{move} over {d:.1f}s travels {max(f["max_speed"], f["first_frame"])} px a frame (at most {top:.0f})')
    if f['worst_jerk'] > jerk:
        out.append(f'{move} over {d:.1f}s jerks by {f["worst_jerk"]} px a frame (at most {jerk:.0f})')
    return out


def choose(emotion: str | None, history: list[str], subjects=(), under_card: bool = False, key: int = 0) -> str:
    """The director's choice for one look: `breath` under a card (the type is the hero); else what the picture shows
    (a stadium → crane, a crowd → track) when that also tells the emotion or there is none; else the emotion's own
    moves — and never the move of the two looks before (docs/71: not the same move three times in a row; here not even
    twice when another tells the beat as well)."""
    if under_card:
        return 'breath'
    wants = list(BY_EMOTION.get(emotion) or BY_EMOTION[None])
    hint = next((BY_SUBJECT[s] for s in subjects if s in BY_SUBJECT), None)
    if hint and (emotion is None or hint in wants):
        wants = [hint] + [m for m in wants if m != hint]
    if emotion is None:
        wants = wants[key % len(wants):] + wants[:key % len(wants)]
    last2 = history[-2:]
    for m in wants:
        if m not in last2[-1:]:
            return m
    return next(m for m in MOVES if m not in last2)


# ── the HyperFrames layer (DOCU, vox-hf) ─────────────────────────────────────────────────────────────────────────────
def gsap(segments: list[dict], sel: dict[str, str], t: float) -> list[str]:
    """The move as GSAP tweens on transforms. `sel` maps a plane to its CSS selector; a plane the page does not have is
    skipped. Every tween is a fromTo with explicit ends (HyperFrames seeks: nothing may depend on a previous frame)."""
    out, first = [], set()
    for s in segments:
        if s['plane'] not in sel or s['dur'] <= 0:
            continue
        a = ','.join(f'{k}:{v}' for k, v in s['a'].items())
        b = ','.join(f'{k}:{v}' for k, v in s['b'].items())
        lazy = '' if s['plane'] not in first else ',immediateRender:false'
        first.add(s['plane'])
        e = s['ease'] if s['ease'] in OWN_EASES else f'"{s["ease"]}"'     # the page defines glide and settle (EASES_JS)
        out.append(f'tl.fromTo("{sel[s["plane"]]}",{{{a}}},{{{b},duration:{round(s["dur"], 2)},ease:{e}{lazy}}},{round(t + s["at"], 2)});')
    return out


def horizon(path) -> float | None:
    """Where a still's foreground begins, as a share of its height from the top (0.35–0.75), read off the picture: the
    row band where the picture changes most from the rows above (sky or far stand → crowd, pitch, fence). None when the
    picture has no such line (a flat card, a pattern) — the caller then lifts the lower 42%, or uses two planes only."""
    try:
        import numpy as np
        from PIL import Image
        with Image.open(path) as im:
            a = np.asarray(im.convert('L').resize((64, 48)), dtype='float32')
    except Exception:  # noqa: BLE001 — a clip, a missing file
        return None
    rows = a.mean(axis=1)
    tex = np.abs(np.diff(a, axis=1)).mean(axis=1)            # how busy each row is
    best, at = 0.0, None
    for r in range(17, 36):                                  # 35% … 75% of the height
        above, below = slice(max(0, r - 8), r), slice(r, min(48, r + 8))
        step = abs(float(rows[below].mean() - rows[above].mean())) / 255 + abs(float(tex[below].mean() - tex[above].mean())) / 40
        if step > best:
            best, at = step, r
    return round(at / 48, 3) if at is not None and best >= 0.12 else None


# OWNER, 14.11.2026 (docs/rules/no-sliced-parallax.md): NEVER slice one picture into bands that move apart to fake depth.
# "That effect — cutting the picture to make an illusion that it moves — is awful and ugly; I don't want to use it."
# The still moves as ONE sheet (back plane + vignette); only a real cut-out (a transparent PNG) may move in front of it.
SLICE_PLANES = False
FORE_DEFAULT = 0.58     # with no horizon to read, the lower 42% is the near plane
FEATHER = 0.14          # the mask's soft edge, as a share of the height: a hard line would show the planes' seam


def planes(src_css: str, cid: str, h: float | None, extra_style: str = '') -> str:
    """The HTML of a still's depth planes inside its clip: the picture, the same picture masked to its foreground band,
    and the vignette. `src_css` is the picture's own background CSS (image, position, fit)."""
    top = FORE_DEFAULT if h is None else h
    a, b = round(max(0.0, top - FEATHER / 2) * 100, 1), round(min(1.0, top + FEATHER / 2) * 100, 1)
    mask = f'linear-gradient(to bottom,transparent {a}%,#000 {b}%)'
    fore = (f'<div class="phi fore" id="{cid}f" style="{src_css}{extra_style}-webkit-mask-image:{mask};mask-image:{mask}"></div>'
            if SLICE_PLANES else '')
    return f'<div class="phi" id="{cid}i" style="{src_css}{extra_style}"></div>{fore}<div class="vig" id="{cid}v"></div>'


CSS = ('.fore{will-change:transform}'
       '.vig{position:absolute;left:-10%;top:-10%;width:120%;height:120%;pointer-events:none;'
       'background:radial-gradient(ellipse at center,rgba(0,0,0,0) 52%,rgba(0,0,0,.34) 100%)}')


# ── the PIL engines (VOX's stills, the classic edit) ────────────────────────────────────────────────────────────────
def frame_pil(im, move: str, d: float, t: float, size: tuple[int, int] = (W, H), **kw):
    """One frame of a move over a still, drawn with PIL: the back plane's pose applied as a crop (the same numbers the
    HyperFrames layer tweens). Kept to one plane — the PIL engines composite their own cut-outs in front."""
    from PIL import Image
    p = pose(move, d, t, 'back', **kw)
    w, h = size
    cover = max(w / im.width, h / im.height) * p['scale']
    cw, ch = w / cover, h / cover
    cx, cy = im.width / 2 - p['x'] / cover, im.height / 2 - p['y'] / cover
    box = (max(0.0, min(im.width - cw, cx - cw / 2)), max(0.0, min(im.height - ch, cy - ch / 2)))
    return im.resize((w, h), Image.BILINEAR, box=(box[0], box[1], box[0] + cw, box[1] + ch))
