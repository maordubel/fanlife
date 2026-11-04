"""Which of two uploaded pictures fills which brief role, decided by measuring them — never by guessing a name.

Owner decisions (4.11.2026), recorded as rules in classified_manifest.json → "role_rules":
  * CH2 is the goalkeeper character sheet in the GREEN jersey (Casillas), CH1 the one in the RED training top
    (Cañizares): the sheet whose saturated pixels are mostly green is CH2.
  * S04 (WAR) is the abstract background with the most vermilion/red; S05 (HEART) the navy one.

Each picture's saturated pixels are counted by hue family (on a 512 px copy). A rule is decided only when the
measurement is unambiguous (the winner leads by a clear margin, in BOTH directions where the rule names two hues);
otherwise the run reports it as undecided and uses the manifest's listed order, saying so. The owner's pictures are
only read.

    python3 scripts/football-stories/comic/roles.py --panels <folder> [--file file01]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from comic.manifest import entries, load_manifest  # noqa: E402

# hue families on OpenCV's 0–180 scale (degrees / 2)
FAMILIES = {'red': ((0, 8), (170, 180)), 'green': ((38, 85),), 'navy': ((100, 128),)}
MARGIN = 1.5     # the winner's share must be this many times the loser's


def hue_profile(path: Path, size: int = 512) -> dict[str, float]:
    """Share of the picture's pixels that are saturated (S > 0.4, V > 0.18) in each hue family."""
    with Image.open(path) as im:
        im = im.convert('RGB')
        im.thumbnail((size, size))
        rgb = np.asarray(im)
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    h, s, v = hsv[..., 0], hsv[..., 1] / 255, hsv[..., 2] / 255
    sat = (s > .4) & (v > .18)
    n = h.size
    out = {}
    for fam, ranges in FAMILIES.items():
        m = np.zeros_like(sat)
        for lo, hi in ranges:
            m |= (h >= lo) & (h < hi)
        out[fam] = round(float((m & sat).sum()) / n, 5)
    return out


def decide(rule: dict, profiles: dict[str, dict]) -> dict:
    """One rule over its two pictures → {role: id} or undecided, with the evidence."""
    a, b = rule['ids']
    ra, rb = rule['roles']
    ha, hb = rule['hues']          # the hue that marks role ra, and the one that marks rb
    pa, pb = profiles.get(a), profiles.get(b)
    ev = {'rule': rule.get('why', ''), 'profiles': {a: pa, b: pb}}
    if pa is None or pb is None:
        return {**ev, 'decided': False, 'why': 'a picture is missing', 'map': {ra: a, rb: b}}
    eps = 1e-4

    def leads(x, y, hue):
        return (x[hue] + eps) / (y[hue] + eps) >= MARGIN

    if leads(pa, pb, ha) and leads(pb, pa, hb):
        return {**ev, 'decided': True, 'map': {ra: a, rb: b}}
    if leads(pb, pa, ha) and leads(pa, pb, hb):
        return {**ev, 'decided': True, 'map': {ra: b, rb: a}}
    return {**ev, 'decided': False, 'why': f'the {ha}/{hb} measurement is not clear-cut', 'map': {ra: a, rb: b}}


def resolve(man: dict, panels: Path, file_key: str | None = None) -> dict:
    """Every role rule for this FILE (and the series kit), measured on the pictures in `panels`."""
    files = {e['id']: panels / e['file'] for e in entries(man, file_key)}
    out = {'map': {}, 'rules': []}
    for rule in man.get('role_rules', []):
        if rule.get('file') not in (None, file_key) and file_key is not None:
            continue
        prof = {i: hue_profile(files[i]) for i in rule['ids'] if i in files and files[i].exists()}
        d = decide(rule, prof)
        out['rules'].append(d)
        out['map'].update(d['map'])
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--panels', type=Path, required=True)
    ap.add_argument('--file', default='file01')
    ap.add_argument('--out', type=Path)
    a = ap.parse_args()
    r = resolve(load_manifest(), a.panels, a.file)
    for d in r['rules']:
        print(('decided ' if d['decided'] else 'UNDECIDED ') + json.dumps(d['map']) + ' ' + json.dumps(d['profiles']))
    if a.out:
        a.out.write_text(json.dumps(r, indent=2), encoding='utf-8')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
