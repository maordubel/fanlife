#!/usr/bin/env python3
"""
תבניות הצילום של מנוע החולצות — photo mode, built from sources rather than shipped as cut-outs.

    python3 scripts/kits/build-photo-templates.py                 # rebuild everything from brand/source/kits
    python3 scripts/kits/build-photo-templates.py --import-v14 D  # (once) sanitise Maor's V14 overlay into brand/source/kits

WHY THIS EXISTS (21.9.2026). Gate 4 V14 arrived as 30 full-canvas PNGs. Ten of its "correct" layers
were pixel cut-outs of the reveal image, and the same ten kept the WHOLE reveal image in RGB under
alpha=0 — remove the alpha and you had the answer. The builder must never ship a part that is a crop of
a real shirt (brief §15), and nothing under public/ may hide pixels a player is not meant to see. So the
photo look is rebuilt here from what is honest to keep:

  · the garment → two GREYSCALE maps (shading = multiply, highlight = screen). A grey map carries fold
    and light and no hue, so any spec colour prints through it and the map itself has 0 yellow by
    construction (the rule-27 argument: no yellow entry in the table, no yellow pixel in the file);
  · every construction layer → an ALPHA-ONLY mask, traced to SVG path data. The engine fills the path
    with the spec's own ink, so the same geometry draws a white 2009/10 collar or a navy 2014/15 one;
  · the logos Maor granted for gates 4–5 (CLAUDE.md, rule 25, 21.9.2026) → trimmed marks. A logo
    whose colours cross into yellow/gold/orange is recoloured into palette tones (rule 8).

Every written file is DECODED again and its yellow pixels counted with the canonical band
(lib/isYellow.ts: hue 38–70°, S ≥ 0.35, V ≥ 0.35), and the number goes to the ledger
`content/manual/kit-templates.json`. `tests/kit-assets.test.ts` holds every file under public/kits that
is not an archive photograph to a ledger row with yellowPx 0.
"""
import argparse
import colorsys
import datetime
import json
import os
import re
import sys

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'brand', 'source', 'kits')
PUBLIC = os.path.join(ROOT, 'public')
OUT_TEMPLATES = os.path.join(PUBLIC, 'kits', 'templates')
OUT_MARKS = os.path.join(PUBLIC, 'kits', 'marks')
GEOMETRY = os.path.join(ROOT, 'content', 'generated', 'kit-photo-geometry.json')
LEDGER = os.path.join(ROOT, 'content', 'manual', 'kit-templates.json')
TODAY = datetime.date.today().isoformat()

# ------------------------------------------------------------------ palette (app/globals.css)
TOKENS = {
    'red': (176, 45, 16),
    'sign': (30, 44, 90),
    'concrete': (201, 191, 164),
    'paper': (233, 223, 199),
    'ink': (21, 18, 14),
}

# ------------------------------------------------------------------ the templates we can build
#
# Coordinates are the 1122×1402 canvas of the source garment. The seams are read off the garment
# itself (the set-in sleeve seam is visible in the photograph); the raglan line runs from the neck
# edge to the armpit, which is what a raglan IS. Anchors are the V14 mark boxes, measured on the
# alpha of its own layers, so a mark sits where the delivery put it.
TEMPLATES = {
    '2010s-fitted': {
        'canvas': [1122, 1402],
        'sleeveLeft': [(0, 0), (236, 0), (236, 238), (222, 330), (212, 450), (207, 556), (150, 640), (0, 640)],
        'sleeveRight': [(1122, 0), (886, 0), (886, 238), (900, 330), (910, 450), (912, 560), (972, 640), (1122, 640)],
        'raglanLeft': [(0, 0), (438, 0), (438, 116), (207, 556), (150, 640), (0, 640)],
        'raglanRight': [(1122, 0), (684, 0), (684, 116), (912, 560), (972, 640), (1122, 640)],
        'anchors': {
            'crest': {'x': 660, 'y': 330, 'w': 132, 'h': 142},
            'maker': {'x': 332, 'y': 356, 'w': 136, 'h': 78},
            'sponsor': {'x': 352, 'y': 468, 'w': 418, 'h': 214},
        },
        # the masks this template has, by the role the engine gives them
        'masks': {
            'collarCrew': 'mask-collar-crew.png',
            'collarV': 'mask-collar-v.png',
            'cuffs': 'mask-cuffs.png',
            'sidePanels': 'mask-side-panels.png',
            'hem': 'mask-hem.png',
        },
    },
    # the four cuts below share 2010s-fitted's camera (delta 87 art brief §a1: "same camera and
    # light in all five cuts", shirt centred at x=561, collar ~100px from top) — so the SAME
    # sleeve/raglan/anchor polygons apply; only each cut's OWN masks and supports differ, built
    # from exactly the parts its delivery contained (23.9.2026, THE-WORKER-GATES-ART-2026-09).
    'modern-athletic': {
        'canvas': [1122, 1402],
        'sleeveLeft': [(0, 0), (236, 0), (236, 238), (222, 330), (212, 450), (207, 556), (150, 640), (0, 640)],
        'sleeveRight': [(1122, 0), (886, 0), (886, 238), (900, 330), (910, 450), (912, 560), (972, 640), (1122, 640)],
        'raglanLeft': [(0, 0), (438, 0), (438, 116), (207, 556), (150, 640), (0, 640)],
        'raglanRight': [(1122, 0), (684, 0), (684, 116), (912, 560), (972, 640), (1122, 640)],
        'anchors': {
            'crest': {'x': 660, 'y': 330, 'w': 132, 'h': 142},
            'maker': {'x': 332, 'y': 356, 'w': 136, 'h': 78},
            'sponsor': {'x': 352, 'y': 468, 'w': 418, 'h': 214},
        },
        'masks': {'collarCrew': 'mask-collar-crew.png'},
        'supports': {
            'patternExcept': ['shoulder-panel', 'yoke-v', 'side-panel'],
            'collar': ['crew'],
            'sleeves': ['plain', 'raglan'],
        },
    },
    'early-2000s-athletic': {
        'canvas': [1122, 1402],
        'sleeveLeft': [(0, 0), (236, 0), (236, 238), (222, 330), (212, 450), (207, 556), (150, 640), (0, 640)],
        'sleeveRight': [(1122, 0), (886, 0), (886, 238), (900, 330), (910, 450), (912, 560), (972, 640), (1122, 640)],
        'raglanLeft': [(0, 0), (438, 0), (438, 116), (207, 556), (150, 640), (0, 640)],
        'raglanRight': [(1122, 0), (684, 0), (684, 116), (912, 560), (972, 640), (1122, 640)],
        'anchors': {
            'crest': {'x': 660, 'y': 330, 'w': 132, 'h': 142},
            'maker': {'x': 332, 'y': 356, 'w': 136, 'h': 78},
            'sponsor': {'x': 352, 'y': 468, 'w': 418, 'h': 214},
        },
        'masks': {'collarCrew': 'mask-collar-crew.png', 'cuffs': 'mask-sleeves-cuff.png'},
        'supports': {
            'patternExcept': ['shoulder-panel', 'yoke-v', 'side-panel'],
            'collar': ['crew'],
            'sleeves': ['plain', 'cuff', 'raglan'],
        },
    },
    'retro-90s-boxy': {
        'canvas': [1122, 1402],
        'sleeveLeft': [(0, 0), (236, 0), (236, 238), (222, 330), (212, 450), (207, 556), (150, 640), (0, 640)],
        'sleeveRight': [(1122, 0), (886, 0), (886, 238), (900, 330), (910, 450), (912, 560), (972, 640), (1122, 640)],
        'raglanLeft': [(0, 0), (438, 0), (438, 116), (207, 556), (150, 640), (0, 640)],
        'raglanRight': [(1122, 0), (684, 0), (684, 116), (912, 560), (972, 640), (1122, 640)],
        'anchors': {
            'crest': {'x': 660, 'y': 330, 'w': 132, 'h': 142},
            'maker': {'x': 332, 'y': 356, 'w': 136, 'h': 78},
            'sponsor': {'x': 352, 'y': 468, 'w': 418, 'h': 214},
        },
        # base collar for this cut IS the polo (the archive's 90s shirts wear polo collars) — no
        # crew mask was delivered for this cut, so 'crew' is honestly absent from supports below
        'masks': {'collarPolo': 'mask-collar-polo.png', 'collarV': 'mask-collar-v-neck.png', 'cuffs': 'mask-sleeves-cuff.png'},
        'supports': {
            'patternExcept': ['shoulder-panel', 'yoke-v', 'side-panel'],
            'collar': ['polo', 'v-neck'],
            'sleeves': ['plain', 'cuff', 'raglan'],
        },
    },
    'retro-80s-long': {
        'canvas': [1122, 1402],
        'sleeveLeft': [(0, 0), (236, 0), (236, 238), (222, 330), (212, 450), (207, 556), (150, 640), (0, 640)],
        'sleeveRight': [(1122, 0), (886, 0), (886, 238), (900, 330), (910, 450), (912, 560), (972, 640), (1122, 640)],
        'raglanLeft': [(0, 0), (438, 0), (438, 116), (207, 556), (150, 640), (0, 640)],
        'raglanRight': [(1122, 0), (684, 0), (684, 116), (912, 560), (972, 640), (1122, 640)],
        'anchors': {
            'crest': {'x': 660, 'y': 330, 'w': 132, 'h': 142},
            'maker': {'x': 332, 'y': 356, 'w': 136, 'h': 78},
            'sponsor': {'x': 352, 'y': 468, 'w': 418, 'h': 214},
        },
        # long sleeves to the wrist: no separate cuff overlay was delivered (the rib cuff is baked
        # into the sleeve itself, as it is on the real 1983–89 shirts) — 'cuff' stays out of supports
        'masks': {
            'collarCrew': 'mask-collar-crew.png', 'collarPolo': 'mask-collar-polo.png',
            'collarV': 'mask-collar-v-neck.png', 'sleeveStripe': 'mask-sleeves-shoulder-stripe.png',
        },
        'supports': {
            'patternExcept': ['shoulder-panel', 'yoke-v', 'side-panel'],
            'collar': ['crew', 'polo', 'v-neck'],
            'sleeves': ['plain', 'raglan', 'shoulder-stripe'],
        },
    },
}

# which V14 file becomes which sanitised source (alpha only for masks)
V14_MASKS = {
    'mask-collar-crew.png': 'layer-collar-white.png',
    'mask-collar-v.png': 'construction-vneck-white.png',
    'mask-cuffs.png': 'layer-cuffs-white.png',
    'mask-side-panels.png': 'layer-side-panels-white.png',
    'mask-hem.png': 'layer-hem-white.png',
}
V14_MARKS = {
    'maker-puma.png': 'preview-maker-puma.png',
    'maker-macron.png': 'preview-maker-macron.png',
    'sponsor-arkia.png': 'preview-sponsor-arkia.png',
    'sponsor-fujitsu.png': 'preview-sponsor-fujitsu.png',
}

# the marks this script builds, and how each prints on cloth
MARKS = {
    # a single-colour wordmark prints in the shirt's contrast ink, like a real applique
    'maker-puma': {'mode': 'mono', 'label': 'PUMA'},
    'maker-macron': {'mode': 'mono', 'label': 'MACRON'},
    'sponsor-fujitsu': {'mode': 'mono', 'label': 'FUJITSU'},
    # a logo whose colour IS the logo keeps it — recoloured into the palette where it crossed rule 8
    'sponsor-arkia': {'mode': 'palette', 'label': 'ARKIA'},
}


# ------------------------------------------------------------------ yellow, exactly as lib/isYellow.ts
def yellow_mask(rgb, alpha=None):
    r, g, b = (rgb[..., i].astype(np.float64) for i in range(3))
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    delta = mx - mn
    with np.errstate(divide='ignore', invalid='ignore'):
        sat = np.where(mx > 0, delta / mx, 0)
        hue = np.zeros_like(mx)
        safe = np.where(delta == 0, 1, delta)
        hr = 60 * (((g - b) / safe + 6) % 6)
        hg = 60 * ((b - r) / safe + 2)
        hb = 60 * ((r - g) / safe + 4)
        hue = np.where(mx == r, hr, np.where(mx == g, hg, hb))
    hit = (delta > 0) & (sat >= 0.35) & (mx / 255 >= 0.35) & (hue >= 38) & (hue <= 70)
    if alpha is not None:
        hit &= alpha > 0
    return hit


def measure_file(path):
    """decode what was WRITTEN and count — never the array we meant to write"""
    im = Image.open(path).convert('RGBA')
    arr = np.array(im)
    hits = int(yellow_mask(arr[..., :3], arr[..., 3]).sum())
    visible = int((arr[..., 3] > 0).sum())
    return hits, round(100 * hits / max(1, visible), 3)


HEX = re.compile(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')
RGBF = re.compile(r'rgb\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)\s*\)')


def _colours(text):
    out = []
    for m in HEX.finditer(text):
        h = m.group(1)
        if len(h) == 3:
            h = ''.join(c * 2 for c in h)
        out.append(tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)))
    for m in RGBF.finditer(text):
        out.append(tuple(int(m.group(i)) for i in (1, 2, 3)))
    return out


GRADIENT = re.compile(r'<(linear|radial)Gradient\b.*?</\1Gradient>', re.S)


def measure_svg(path):
    """
    An SVG is its colour table: every fill/stroke/stop is a literal, so the proof is over the table
    (rule 27's argument for palette PNGs). A gradient paints the colours BETWEEN its stops too, so every
    pair of neighbouring stops is sampled along the line the renderer interpolates on.
    """
    text = open(path, encoding='utf8').read()
    colours = _colours(text)
    for block in GRADIENT.finditer(text):
        stops = _colours(block.group(0))
        for a, b in zip(stops, stops[1:]):
            for t in np.linspace(0, 1, 17):
                colours.append(tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3)))
    bad = [c for c in colours if yellow_mask(np.array([[c]], dtype=np.uint8))[0, 0]]
    return len(bad), 0.0 if not bad else 100.0


# ------------------------------------------------------------------ tracing
def trace(mask, epsilon=1.0):
    """alpha → SVG path data (even-odd), in canvas coordinates"""
    m = cv2.GaussianBlur(mask.astype(np.uint8) * (255 if mask.dtype == bool else 1), (5, 5), 0)
    m = (m >= 128).astype(np.uint8)
    contours, _ = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    parts = []
    for c in contours:
        if cv2.contourArea(c) < 60:
            continue
        a = cv2.approxPolyDP(c, epsilon, True)[:, 0, :]
        if len(a) < 3:
            continue
        parts.append('M' + 'L'.join(f'{int(x)} {int(y)}' for x, y in a) + 'Z')
    return ''.join(parts)


def polygon_mask(shape, points):
    m = np.zeros(shape, np.uint8)
    cv2.fillPoly(m, [np.array(points, np.int32)], 255)
    return m


def bbox(mask):
    ys, xs = np.nonzero(mask)
    return {'x': int(xs.min()), 'y': int(ys.min()), 'w': int(xs.max() - xs.min() + 1), 'h': int(ys.max() - ys.min() + 1)}


# ------------------------------------------------------------------ import (once) from V14
def import_v14(folder):
    """
    Sanitise the delivery into sources. What is KEPT: the garment (its hidden RGB zeroed), the alpha of
    each construction layer (and nothing else of it), and the four flat logos. What is NOT kept: the
    reveal image, every "-exact" cut-out, the invented cup badge, the drawn crest distractors.
    """
    tdir = os.path.join(SRC, '2010s-fitted')
    mdir = os.path.join(SRC, 'marks')
    os.makedirs(tdir, exist_ok=True)
    os.makedirs(mdir, exist_ok=True)
    base = np.array(Image.open(os.path.join(folder, 'base-red-realistic.png')).convert('RGBA'))
    base[base[..., 3] == 0, :3] = 0
    Image.fromarray(base, 'RGBA').save(os.path.join(tdir, 'base.png'), optimize=True)
    for out, name in V14_MASKS.items():
        alpha = np.array(Image.open(os.path.join(folder, name)).convert('RGBA'))[..., 3]
        Image.fromarray(alpha, 'L').save(os.path.join(tdir, out), optimize=True)
    for out, name in V14_MARKS.items():
        mark = np.array(Image.open(os.path.join(folder, name)).convert('RGBA'))
        mark[mark[..., 3] == 0, :3] = 0
        Image.fromarray(mark, 'RGBA').save(os.path.join(mdir, out), optimize=True)
    print('imported V14 sources →', os.path.relpath(SRC, ROOT))


# ------------------------------------------------------------------ the garment → grey maps
def build_maps(tid, cfg):
    tdir = os.path.join(SRC, tid)
    base = np.array(Image.open(os.path.join(tdir, 'base.png')).convert('RGBA')).astype(np.float64)
    alpha = base[..., 3]
    rgb = base[..., :3]
    inside = alpha > 200
    value = rgb.max(axis=2)
    low = rgb.min(axis=2)

    # The delivery left dark smudges where white cuffs and hem trims were lifted off the red garment,
    # mostly in the half-transparent fringe of the cut. They are not folds; on any other colour they
    # print as soot. Every such pixel is refilled from the fabric AROUND it (a normalised blur of the
    # clean cloth), which keeps the fold that runs into the smudge and loses the smudge.
    med = np.median(value[inside])
    fringe = (alpha > 0) & (alpha < 235)
    smudge = (alpha > 0) & ((value < 0.66 * med) | (fringe & (value < 0.9 * med)))
    # the inside of the back neck is legitimately dark — keep it
    smudge &= ~polygon_mask(value.shape, [(420, 90), (700, 90), (700, 330), (420, 330)]).astype(bool)
    smudge = cv2.dilate(smudge.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool) & (alpha > 0)
    clean = (inside & ~smudge).astype(np.float64)

    def refill(plane):
        num = cv2.GaussianBlur(plane * clean, (0, 0), 18)
        den = cv2.GaussianBlur(clean, (0, 0), 18)
        filled = np.where(den > 1e-3, num / np.maximum(den, 1e-3), np.median(plane[inside]))
        return np.where(smudge, filled, plane)

    value = refill(value)
    ref = np.percentile(value[inside], 94)
    shade = np.clip(value / ref, 0, 1)
    # the fabric's own highlight: where the MIN channel lifts above the cloth's floor, light is hitting
    # it. The fringe is where the lifted trims left white — no light there, only residue.
    floor = np.percentile(low[inside], 50)
    lift = np.clip((low - floor * 1.15) / (255 - floor), 0, 1)
    lift = refill(np.where(fringe, 0, lift))
    high = np.clip(lift * 1.6, 0, 1)

    a8 = np.clip(alpha, 0, 255).astype(np.uint8)
    out_dir = os.path.join(OUT_TEMPLATES, tid)
    os.makedirs(out_dir, exist_ok=True)
    written = []
    for name, plane in (('shading', shade), ('highlight', high)):
        g = (plane * 255).round().astype(np.uint8)
        arr = np.dstack([g, g, g, a8])
        arr[a8 == 0, :3] = 0
        path = os.path.join(out_dir, f'{name}.webp')
        Image.fromarray(arr, 'RGBA').save(path, 'WEBP', quality=86, method=6, alpha_quality=100, exact=False)
        written.append(path)

    # ---- geometry
    silhouette = (alpha > 128).astype(np.uint8) * 255
    sleeve_l = cv2.bitwise_and(silhouette, polygon_mask(silhouette.shape, cfg['sleeveLeft']))
    sleeve_r = cv2.bitwise_and(silhouette, polygon_mask(silhouette.shape, cfg['sleeveRight']))
    raglan_l = cv2.bitwise_and(silhouette, polygon_mask(silhouette.shape, cfg['raglanLeft']))
    raglan_r = cv2.bitwise_and(silhouette, polygon_mask(silhouette.shape, cfg['raglanRight']))
    torso = cv2.bitwise_and(silhouette, cv2.bitwise_not(cv2.bitwise_or(sleeve_l, sleeve_r)))
    masks = {}
    for role, file in cfg['masks'].items():
        m = np.array(Image.open(os.path.join(tdir, file)).convert('L'))
        masks[role] = trace(m >= 110)
    geometry = {
        'canvas': {'w': cfg['canvas'][0], 'h': cfg['canvas'][1]},
        'shading': f'/kits/templates/{tid}/shading.webp',
        'highlight': f'/kits/templates/{tid}/highlight.webp',
        'silhouette': trace(silhouette > 0),
        'torso': trace(torso > 0),
        'torsoBox': bbox(torso > 0),
        'sleeves': [trace(sleeve_l > 0), trace(sleeve_r > 0)],
        'raglan': [trace(raglan_l > 0), trace(raglan_r > 0)],
        'masks': masks,
        'anchors': cfg['anchors'],
        # what this template can draw: a generic surface pattern is a full-bleed shape clipped to the
        # torso and needs no geometry of its own; construction-bound values need their masks.
        # Defaulted for the 2010s-fitted / V14 shape; every other cut declares its OWN supports in
        # TEMPLATES, built from exactly the mask files that cut's delivery contained (23.9.2026) —
        # a cut never claims a look it has no honest geometry for.
        'supports': cfg.get('supports') or {
            'patternExcept': ['shoulder-panel', 'yoke-v'],
            'collar': ['crew', 'v-neck'],
            'sleeves': ['plain', 'cuff', 'raglan'],
        },
    }
    return geometry, written


# ------------------------------------------------------------------ the granted marks
def component_filter(alpha):
    """drop the hairline frame lines the delivery left at the logo edges; keep the logo"""
    m = (alpha > 40).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    keep = np.zeros_like(m)
    H, W = m.shape
    biggest = max((stats[i, cv2.CC_STAT_AREA] for i in range(1, n)), default=0)
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        thin = (w <= max(4, W * 0.012) and h >= H * 0.5) or (h <= max(4, H * 0.012) and w >= W * 0.5)
        if thin or area < biggest * 0.002:
            continue
        keep[labels == i] = 1
    return keep.astype(bool)


def palette_recolour(rgb, alpha):
    """every chromatic pixel onto a palette ink by its hue bucket; neutrals to ink/paper by value"""
    out = rgb.copy()
    flat = rgb.reshape(-1, 3) / 255.0
    hsv = np.array([colorsys.rgb_to_hsv(*p) for p in flat]).reshape(rgb.shape)
    h, s, v = hsv[..., 0] * 360, hsv[..., 1], hsv[..., 2]
    chroma = (s >= 0.25) & (v >= 0.2)
    buckets = [
        (((h < 75) | (h >= 300)), 'red'),       # red, orange, yellow, gold, pink → vermilion
        (((h >= 75) & (h < 190)), 'concrete'),  # green, teal → concrete
        (((h >= 190) & (h < 300)), 'sign'),     # blue, violet → navy
    ]
    for sel, token in buckets:
        out[chroma & sel] = TOKENS[token]
    neutral = ~chroma
    out[neutral & (v < 0.5)] = TOKENS['ink']
    out[neutral & (v >= 0.5)] = TOKENS['paper']
    out[alpha == 0] = 0
    return out


def build_marks():
    mdir = os.path.join(SRC, 'marks')
    os.makedirs(OUT_MARKS, exist_ok=True)
    written = []
    assets = {}
    for name, cfg in MARKS.items():
        src = os.path.join(mdir, f'{name}.png')
        if not os.path.exists(src):
            continue
        arr = np.array(Image.open(src).convert('RGBA'))
        keep = component_filter(arr[..., 3])
        alpha = np.where(keep, arr[..., 3], 0).astype(np.uint8)
        box = bbox(alpha > 0)
        pad = 6
        x0, y0 = max(0, box['x'] - pad), max(0, box['y'] - pad)
        x1, y1 = min(arr.shape[1], box['x'] + box['w'] + pad), min(arr.shape[0], box['y'] + box['h'] + pad)
        rgb = arr[y0:y1, x0:x1, :3]
        alpha = alpha[y0:y1, x0:x1]
        if cfg['mode'] == 'mono':
            # the SHAPE only, in white: the engine prints it through an SVG mask in the shirt's ink,
            # so the file carries no colour of its own at all. A white halo around a dark logo (the
            # delivery's anti-aliasing onto a light card) is not part of the mark and is dropped.
            lum = rgb.astype(np.float64).mean(axis=2)
            shape = alpha.astype(np.float64) * np.clip((235 - lum) / 45, 0, 1)
            out = np.dstack([np.full_like(alpha, 255)] * 3 + [shape.round().astype(np.uint8)])
        else:
            out = np.dstack([palette_recolour(rgb, alpha), alpha])
        img = Image.fromarray(out.astype(np.uint8), 'RGBA')
        longest = max(img.size)
        if longest > 640:
            s = 640 / longest
            img = img.resize((round(img.size[0] * s), round(img.size[1] * s)), Image.LANCZOS)
        a = np.array(img)
        a[a[..., 3] == 0, :3] = 0
        if cfg['mode'] == 'palette':
            # resampling blends palette inks at their edges — snap back so the file stays a palette
            a[..., :3] = palette_recolour(a[..., :3], a[..., 3])
        path = os.path.join(OUT_MARKS, f'{name}.webp')
        Image.fromarray(a, 'RGBA').save(path, 'WEBP', lossless=True, method=6, exact=False)
        written.append(path)
        assets[name] = {'src': f'/kits/marks/{name}.webp', 'w': a.shape[1], 'h': a.shape[0], 'mode': cfg['mode'], 'label': cfg['label']}
    return assets, written


# ------------------------------------------------------------------ ledger
def ledger_rows(files):
    rows = []
    for path in sorted(files):
        rel = os.path.relpath(path, os.path.join(PUBLIC, 'kits')).replace(os.sep, '/')
        if path.endswith('.svg'):
            px, pct = measure_svg(path)
            method = 'svg-colour-table'
        else:
            px, pct = measure_file(path)
            method = 'decoded-rgba'
        if rel.startswith('templates/'):
            role, treatment = 'photo-template', ['shading-map', 'lossy-webp-measured']
        elif rel.startswith('marks/'):
            role = 'granted-mark'
            treatment = ['cut-from-sheet', 'trim-alpha', 'de-yellow' if 'arkia' in rel else 'none']
        else:
            role, treatment = 'assembly', ['crop', 'trim-alpha']
        rows.append({
            'file': rel,
            'role': role,
            'bytes': os.path.getsize(path),
            'yellowPx': px,
            'yellowPct': pct,
            'method': method,
            'treatment': [t for t in treatment if t != 'none'] or ['none'],
            'measuredOn': TODAY,
        })
    return rows


def all_non_photo_files():
    photos = {r['file'] for r in json.load(open(os.path.join(ROOT, 'content', 'manual', 'kit-photos.json')))['records']}
    out = []
    for dirpath, _, names in os.walk(os.path.join(PUBLIC, 'kits')):
        for n in names:
            full = os.path.join(dirpath, n)
            rel = os.path.relpath(full, os.path.join(PUBLIC, 'kits')).replace(os.sep, '/')
            if rel in photos:
                continue
            out.append(full)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--import-v14', dest='v14')
    args = ap.parse_args()
    if args.v14:
        import_v14(args.v14)

    geometry = {}
    for tid, cfg in TEMPLATES.items():
        if not os.path.exists(os.path.join(SRC, tid, 'base.png')):
            continue
        geometry[tid], _ = build_maps(tid, cfg)
    marks, _ = build_marks()

    os.makedirs(os.path.dirname(GEOMETRY), exist_ok=True)
    with open(GEOMETRY, 'w', encoding='utf8') as f:
        json.dump({'schemaVersion': 1, 'templates': geometry, 'marks': marks}, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')

    rows = ledger_rows(all_non_photo_files())
    doc = json.load(open(LEDGER, encoding='utf8')) if os.path.exists(LEDGER) else {}
    doc.setdefault('note', '')
    doc.setdefault('confidence', 2)
    doc.setdefault('source', '')
    doc['records'] = rows
    with open(LEDGER, 'w', encoding='utf8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
        f.write('\n')

    bad = [r for r in rows if r['yellowPx'] > 0]
    for r in rows:
        print(f"{r['yellowPx']:>6}  {r['bytes']:>8}  {r['file']}")
    if bad:
        print('YELLOW in', [r['file'] for r in bad])
        sys.exit(1)
    print(f'{len(rows)} files measured, 0 yellow · geometry → {os.path.relpath(GEOMETRY, ROOT)}')


if __name__ == '__main__':
    main()
