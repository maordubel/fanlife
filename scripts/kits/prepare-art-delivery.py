#!/usr/bin/env python3
"""
קליטת חבילת הגרפיקה הגולמית של השערים — delta 87, 23.9.2026.

Takes the 37 raw shirt PNGs delivered for the five body-template cuts (each 1122×1402 on a green
screen, README.md/QA.md alongside them: green is NOT exact #00FF00 everywhere, magenta marks are
NOT a uniform #FF00FF, some variants drift a few px off their base) and turns them into the sources
`scripts/kits/build-photo-templates.py` expects under `brand/source/kits/<cut>/`:

  · `<cut>__base.png`        → `base.png`            (green removed by colour DISTANCE, not equality)
  · `<cut>__<part>__mark.png` → `mask-<part>.png`     (magenta region extracted by colour distance,
                                                        normalised, aligned to base, traced to alpha)
  · `<cut>__<part>__photo.png` → archived only, under `photo-<part>.png` — a structural reference
    (the mark for that part was painted ON this photo, per README, so it is kept for provenance) but
    NOT consumed by the renderer: the engine draws every construction from ONE shading/highlight map
    per template plus traced masks (`lib/kit/engine.ts` — "one engine, two looks"), it has no
    per-part texture layer to plug these into. Wiring that in is a separate, bigger change.

A file is REJECTED (not written) when: the green/magenta extraction leaves fewer than a viable
number of pixels (extraction failed), or the shape cannot be aligned to its base within a sane
bound. Every decision is printed and returned as JSON on stdout for the report.

Usage:
    python3 scripts/kits/prepare-art-delivery.py <path-to-delivery>/kits
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'brand', 'source', 'kits')

# role -> raw part slug, per cut (only parts the archive of that era actually needs, per BRIEF §a2
# "חובה" column, plus the extra structural collars the delivery included as bonuses)
CUT_PARTS = {
    # NOTE: 2010s-fitted is NOT reprocessed here. It already has a working, tested source
    # (imported from Maor's V14 delivery, 21.9.2026) at brand/source/kits/2010s-fitted/ — this
    # delivery's 2010s-fitted files are a second, independent generation of the SAME 12 files, kept
    # only as an unused reference archive (see `archive_only_2010s_fitted` below) so a future delta
    # can compare them, rather than risking a visual regression on the one cut already shipped.
    'modern-athletic': {
        'collarCrew': 'collar-crew',
    },
    'early-2000s-athletic': {
        'collarCrew': 'collar-crew', 'cuffs': 'sleeves-cuff',
    },
    'retro-90s-boxy': {
        'collarPolo': 'collar-polo', 'collarV': 'collar-v-neck', 'cuffs': 'sleeves-cuff',
    },
    'retro-80s-long': {
        'collarCrew': 'collar-crew', 'collarPolo': 'collar-polo', 'collarV': 'collar-v-neck',
        'sleeveStripe': 'sleeves-shoulder-stripe',
    },
}
# parts delivered as __mark.png but with NO consumer in the engine today (no pattern-layer role
# exists for a raw shoulder-panel or a plain-sleeve repaint) — still processed and measured, just
# not linked into a masks{} role, so they cannot silently vanish from the report
UNWIRED_MARKS = {
    '2010s-fitted': ['sleeves-plain', 'sleeves-raglan'],
    'modern-athletic': ['shoulder-panels', 'sleeves-plain'],
    'early-2000s-athletic': ['shoulder-panels', 'sleeves-plain'],
    'retro-90s-boxy': ['sleeves-plain'],
    'retro-80s-long': ['sleeves-plain'],
}
PHOTO_VARIANTS = {
    '2010s-fitted': ['collar-v-neck', 'sleeves-cuff', 'sleeves-raglan'],
    'modern-athletic': [],
    'early-2000s-athletic': ['sleeves-cuff'],
    'retro-90s-boxy': ['collar-v-neck', 'sleeves-cuff'],
    'retro-80s-long': ['collar-polo', 'collar-v-neck'],
}

ALIGN_LIMIT_PX = 14.0  # a mask beyond this offset from its own base is rejected, not silently shifted


def green_alpha(rgb, return_green=False):
    """alpha = 255 inside the garment, 0 on the green screen — by DISTANCE to the frame's own green,
    sampled from its four corners (README: not exactly #00FF00 everywhere), not by equality."""
    h, w = rgb.shape[:2]
    corners = np.concatenate([
        rgb[0:20, 0:20].reshape(-1, 3), rgb[0:20, w - 20:w].reshape(-1, 3),
        rgb[h - 20:h, 0:20].reshape(-1, 3), rgb[h - 20:h, w - 20:w].reshape(-1, 3),
    ]).astype(np.float64)
    green = np.median(corners, axis=0)
    dist = np.linalg.norm(rgb.astype(np.float64) - green, axis=2)
    # a garment pixel is never this close to a saturated green; 60 clears anti-aliased fringe too
    alpha = np.clip((dist - 28) / (85 - 28) * 255, 0, 255).astype(np.uint8)
    # binarise the interior (flat-lay product shots need a clean cutout, not a soft-keyed one),
    # keep a 1px feather only at the very edge
    hard = (dist > 60).astype(np.uint8) * 255
    hard = cv2.morphologyEx(hard, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    hard = cv2.morphologyEx(hard, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(hard, 8)
    if n > 1:
        biggest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        hard = np.where(labels == biggest, 255, 0).astype(np.uint8)
    # erode the hard cutout by 1px: the green screen leaves a spill fringe (its own colour bleeding
    # onto the garment edge) that a distance threshold alone does not fully clear
    hard = cv2.erode(hard, np.ones((3, 3), np.uint8))
    soft = cv2.GaussianBlur(alpha, (3, 3), 0)
    out_alpha = np.where(hard > 0, np.maximum(soft, 200), np.minimum(soft, 40)).astype(np.uint8)
    return (out_alpha, green) if return_green else out_alpha


def decontaminate(rgb, alpha, green):
    """pull green-screen spill out of the RGB near the cut edge (README: fabric edges pick up cast
    from the screen). Where a pixel leans toward the sampled green, push it back along that axis."""
    rgb = rgb.astype(np.float64)
    lean = np.clip((rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])) / 40.0, 0, 1)
    edge = (alpha > 0) & (alpha < 255)
    out = rgb.copy()
    for c in range(3):
        out[..., c] = np.where(edge, rgb[..., c] - lean * (green[c] - np.median(green)) * 0.6, rgb[..., c])
    return np.clip(out, 0, 255).astype(np.uint8)


def magenta_alpha(rgb, garment_alpha):
    """alpha = coverage of the painted part — by colour DISTANCE to magenta (impure per README:
    shadows, seams, off-hue survive in the delivery), normalised by hue/relationship not equality."""
    r, g, b = (rgb[..., i].astype(np.float64) for i in range(3))
    mx = np.maximum(r, b)
    # magenta: red and blue both well above green, and roughly balanced against each other
    score = np.clip(mx - g, 0, 255) * np.clip(1 - np.abs(r - b) / 180, 0, 1)
    mask = (score > 55) & (garment_alpha > 128)
    hard = (mask.astype(np.uint8)) * 255
    hard = cv2.morphologyEx(hard, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    hard = cv2.morphologyEx(hard, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    return hard


def offset_to_base(mask, base_alpha):
    """translation (dx, dy) that best aligns `mask`'s own garment silhouette to the base's"""
    a = (base_alpha > 128).astype(np.float32)
    b = (mask > 128).astype(np.float32)
    if a.sum() < 100 or b.sum() < 100:
        return None
    (dx, dy), _ = cv2.phaseCorrelate(a, b)
    return dx, dy


def shift(img, dx, dy):
    m = np.float32([[1, 0, dx], [0, 1, dy]])
    return cv2.warpAffine(img, m, (img.shape[1], img.shape[0]), flags=cv2.INTER_NEAREST, borderValue=0)


def process(raw_dir):
    report = {'shipped': [], 'rejected': [], 'archived': []}

    for fn in sorted(os.listdir(os.path.join(raw_dir, '2010s-fitted'))) if os.path.isdir(os.path.join(raw_dir, '2010s-fitted')) else []:
        report['archived'].append({
            'file': f'2010s-fitted/{fn}', 'as': None,
            'note': 'not reprocessed — 2010s-fitted already has a working source from V14 (21.9.2026); '
                    'this second generation of the same 12 files is left out of brand/source to avoid a regression',
        })

    for cut, parts in CUT_PARTS.items():
        cdir = os.path.join(raw_dir, cut)
        odir = os.path.join(SRC, cut)
        os.makedirs(odir, exist_ok=True)
        base_path = os.path.join(cdir, f'{cut}__base.png')
        if not os.path.exists(base_path):
            report['rejected'].append({'file': f'{cut}/__base', 'reason': 'missing from delivery'})
            continue
        base_rgb = np.array(Image.open(base_path).convert('RGB'))
        base_alpha, base_green = green_alpha(base_rgb, return_green=True)
        base_rgb = decontaminate(base_rgb, base_alpha, base_green)
        out = np.dstack([base_rgb, base_alpha])
        out[base_alpha == 0, :3] = 0
        Image.fromarray(out, 'RGBA').save(os.path.join(odir, 'base.png'), optimize=True)
        report['shipped'].append({'file': f'{cut}/__base.png', 'as': f'{cut}/base.png', 'note': 'green removed by distance'})

        for role, part in parts.items():
            mpath = os.path.join(cdir, f'{cut}__{part}__mark.png')
            name = f'{cut}/{cut}__{part}__mark.png'
            if not os.path.exists(mpath):
                report['rejected'].append({'file': name, 'reason': 'missing from delivery'})
                continue
            rgb = np.array(Image.open(mpath).convert('RGB'))
            g_alpha = green_alpha(rgb)
            mag = magenta_alpha(rgb, g_alpha)
            covered = int((mag > 0).sum())
            if covered < 400:
                report['rejected'].append({'file': name, 'reason': f'magenta extraction found only {covered}px — cannot trust as a mask'})
                continue
            off = offset_to_base(g_alpha, base_alpha)
            dx, dy = off if off else (0.0, 0.0)
            dist = (dx ** 2 + dy ** 2) ** 0.5
            if dist > ALIGN_LIMIT_PX:
                report['rejected'].append({'file': name, 'reason': f'{dist:.1f}px off base (limit {ALIGN_LIMIT_PX}px) — not aligned'})
                continue
            aligned = shift(mag, dx, dy) if dist > 0.5 else mag
            out_path = os.path.join(odir, f'mask-{part}.png')
            Image.fromarray(aligned, 'L').save(out_path, optimize=True)
            report['shipped'].append({'file': name, 'as': f'{cut}/mask-{part}.png', 'role': role, 'offsetPx': round(dist, 2)})

        for part in UNWIRED_MARKS.get(cut, []):
            mpath = os.path.join(cdir, f'{cut}__{part}__mark.png')
            name = f'{cut}/{cut}__{part}__mark.png'
            if not os.path.exists(mpath):
                continue
            rgb = np.array(Image.open(mpath).convert('RGB'))
            g_alpha = green_alpha(rgb)
            mag = magenta_alpha(rgb, g_alpha)
            covered = int((mag > 0).sum())
            if covered < 400:
                report['rejected'].append({'file': name, 'reason': f'magenta extraction found only {covered}px'})
                continue
            out_path = os.path.join(odir, f'unwired-mask-{part}.png')
            Image.fromarray(mag, 'L').save(out_path, optimize=True)
            report['archived'].append({'file': name, 'as': f'{cut}/unwired-mask-{part}.png', 'note': 'no engine consumer today (no per-part pattern role) — kept for the next delta'})

        for part in PHOTO_VARIANTS.get(cut, []):
            ppath = os.path.join(cdir, f'{cut}__{part}__photo.png')
            name = f'{cut}/{cut}__{part}__photo.png'
            if not os.path.exists(ppath):
                report['rejected'].append({'file': name, 'reason': 'missing from delivery'})
                continue
            rgb = np.array(Image.open(ppath).convert('RGB'))
            g_alpha, g_green = green_alpha(rgb, return_green=True)
            rgb = decontaminate(rgb, g_alpha, g_green)
            off = offset_to_base(g_alpha, base_alpha)
            dx, dy = off if off else (0.0, 0.0)
            dist = (dx ** 2 + dy ** 2) ** 0.5
            out = np.dstack([rgb, g_alpha])
            out[g_alpha == 0, :3] = 0
            out_path = os.path.join(odir, f'photo-{part}.png')
            Image.fromarray(out, 'RGBA').save(out_path, optimize=True)
            report['archived'].append({
                'file': name, 'as': f'{cut}/photo-{part}.png', 'offsetPx': round(dist, 2),
                'note': 'structural reference, not consumed by the renderer (see module docstring)',
            })

    return report


def main():
    if len(sys.argv) < 2:
        print('usage: prepare-art-delivery.py <path-to-delivery>/kits', file=sys.stderr)
        sys.exit(2)
    report = process(sys.argv[1])
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report['rejected']:
        print(f"\n{len(report['rejected'])} REJECTED, {len(report['shipped'])} shipped, {len(report['archived'])} archived (not wired)", file=sys.stderr)


if __name__ == '__main__':
    main()
