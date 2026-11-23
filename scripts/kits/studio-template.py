"""Kit studio template (owner, 23.11.2026: "the Hapoel uniforms are the level I want for every club").

Reads the owner's drawn crew shirt (brand/source/kits/studio/crew-base.webp, a red shirt with ink folds) and writes its drawing as
vector layers that any colour can wear: the cut (outline), the ink (contour and fold lines), the shade (fold shadows in bands),
the inside of the neck, and the parts a kit colours on its own (collar, sleeves, cuffs, hem). Output: scripts/kits/studio-template.json,
read by scripts/kits/kit-render.js through STUDIO. Coordinates are the template's own pixels (721 x 638).
  python3 scripts/kits/studio-template.py
"""
import json, cv2, numpy as np
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
im = np.asarray(Image.open(ROOT / 'brand/source/kits/studio/crew-base.webp').convert('RGBA')).astype(np.float32)
rgb, a = im[..., :3], im[..., 3]
H, W = a.shape
V = rgb.max(axis=2)
S = (V - rgb.min(axis=2)) / np.maximum(V, 1)
cloth = (a > 128)
white = cloth & (V > 200) & (S < .25)                 # the inside of the neck
ink = cloth & (V < 70)                                # contour and fold lines
red = cloth & ~white & ~ink
base = np.median(V[red & (S > .6)])
dark = np.clip(1 - V / base, 0, 1) * red             # fold shadow, 0 (flat) .. 1


def path_of(mask, eps=.9, min_area=6):
    m = (mask * 255).astype(np.uint8)
    cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cs:
        if cv2.contourArea(c) < min_area:
            continue
        c = cv2.approxPolyDP(c, eps, True).reshape(-1, 2)
        if len(c) < 3:
            continue
        out.append('M' + 'L'.join(f'{x} {y}' for x, y in c) + 'Z')
    return ''.join(out)


def blur_mask(m, k=3):
    return cv2.GaussianBlur(m.astype(np.float32), (0, 0), k) > .5


layers = {
    'size': [W, H],
    'cut': path_of(blur_mask(cloth, 1.2), eps=1.2, min_area=500),
    'neck': path_of(blur_mask(white, 1.0), eps=1.0, min_area=200),
    'ink': path_of(ink, eps=.8, min_area=4),
    'shade': [path_of(cv2.GaussianBlur(dark, (0, 0), 1.5) > t, eps=1.2, min_area=10) for t in (.06, .16, .3, .48)],
}
# the parts a kit colours on its own, drawn by hand on the template (mirrored at x = 360)
L_SLEEVE = [(122, 78), (96, 98), (52, 178), (2, 288), (6, 300), (126, 348), (150, 300), (163, 280), (152, 200), (138, 128)]
L_CUFF = [(6, 268), (152, 314), (138, 342), (124, 348), (2, 294)]
mirror = lambda pts: [(720 - x, y) for x, y in pts][::-1]
poly = lambda pts: 'M' + 'L'.join(f'{x} {y}' for x, y in pts) + 'Z'
layers['sleeves'] = poly(L_SLEEVE) + poly(mirror(L_SLEEVE))
layers['cuffs'] = poly(L_CUFF) + poly(mirror(L_CUFF))
layers['collar'] = 'M262 10C300 2 420 2 456 12C456 60 420 102 360 104C300 102 262 60 262 10Z'
layers['hem'] = 'M150 585C260 606 460 606 570 585L580 650H140Z'
# where the marks sit on this cut (template pixels): the crest on the wearer's left chest, the maker on the right, the sponsor across
layers['marks'] = {'crest': [450, 160, 84, 92], 'maker': [230, 178, 70, 36], 'sponsor': [360, 290, 300, 110]}
(ROOT / 'scripts/kits/studio-template.json').write_text(json.dumps(layers))
print({k: (len(v) if isinstance(v, str) else [len(x) for x in v] if isinstance(v, list) and v and isinstance(v[0], str) else v) for k, v in layers.items()})
