"""
LIFE · RUSH — the city at the end of the street, cut from the owner's own concept frames (22.10.2026).

The owner painted what each city should look like down a street: the Acropolis on its rock, the towers
and palms of Tel Aviv, Mostar's old bridge with the minaret and the hills. Those paintings ARE the
landmark; this cuts the part above the street from each frame, feathers its edges into the game's own sky, and writes one file per town, plus a
version with no green for a club whose rival owns green, and one with no yellow band for Hapoel (rule 8).

    python3 -I scripts/life/cut-rush-backdrops.py <athens.png> <tel-aviv.png> <mostar.png>
"""
import colorsys, os, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'life', 'rush', 'backdrops')
# town → crop box in the 1024×572 frame: above the street furniture, inside the buildings either side
BOX = {'ath': (284, 0, 476, 112), 'tlv': (284, 0, 476, 104), 'mos': (280, 0, 476, 158)}


def feather(h, w):
    """A matte painting's edges: the painted sky fades into the game's own over the top third and the sides,
    so the frame never shows as a rectangle. (Keying the sky out was tried: clouds and pale towers sit in
    the same colours, and a tower with a hole in it is worse than a soft edge.)"""
    y = np.linspace(0, 1, h)[:, None]; x = np.linspace(0, 1, w)[None, :]
    top = np.clip(y / 0.34, 0, 1) ** 1.4
    side = np.clip(np.minimum(x, 1 - x) / 0.12, 0, 1)
    bottom = np.clip((1 - y) / 0.06, 0, 1)
    return top * side * bottom


def band(rgb, lo, hi, s_min=0.18):
    hsv = np.asarray(Image.fromarray(rgb).convert('HSV')).astype(np.float32)
    h = hsv[..., 0] * 360 / 255; s = hsv[..., 1] / 255
    return (h >= lo) & (h <= hi) & (s >= s_min), hsv


def without(rgb, lo, hi, to_hue=None):
    m, hsv = band(rgb, lo, hi)
    out = hsv.copy()
    if to_hue is None:
        out[..., 1][m] = out[..., 1][m] * 0.15  # to grey, value kept
    else:
        out[..., 0][m] = to_hue * 255 / 360; out[..., 1][m] = np.minimum(out[..., 1][m], 0.45 * 255)
    return np.asarray(Image.fromarray(out.astype(np.uint8), 'HSV').convert('RGB'))


def main(ath, tlv, mos):
    os.makedirs(OUT, exist_ok=True)
    for town, f in (('ath', ath), ('tlv', tlv), ('mos', mos)):
        im = Image.open(f).convert('RGB').crop(BOX[town])
        im = im.resize((im.width * 4, im.height * 4), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 60, 2))
        rgb = np.asarray(im)
        al = feather(*rgb.shape[:2])
        variants = {'': rgb, '-nogreen': without(rgb, 75, 170), '-noyellow': without(rgb, 30, 80, 24)}
        for suf, px in variants.items():
            Image.fromarray(np.dstack([px, (al * 255).astype(np.uint8)]), 'RGBA').save(os.path.join(OUT, f'{town}{suf}.webp'), 'WEBP', quality=90, method=6)
        y, _ = band(variants['-noyellow'], 38, 70, 0.35)
        print(town, im.size, 'yellow left in -noyellow:', int((y & (al > 0.5)).sum()))


if __name__ == '__main__':
    main(*sys.argv[1:4])
