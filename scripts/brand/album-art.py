#!/usr/bin/env python3
"""
THE ALBUM's printed art (18.11.2026), cut from the owner's reference artwork (brand/source/album/, rule 122):
  - scene.webp: the illustrated terrace-and-pitch scene, the oval of the owner's cover, for the packet and the cover;
  - foil-top.webp / foil-bottom.webp: the crimped silver foil ends of the owner's packet.
Everything printed around them (title, badges, counts, the FAN LIFE roundel) is drawn by the app, so no claim the owner's
reference carries ("official licensed", a league's crest, national flags) reaches the product. Yellow is moved to orange
(rule 8: the product prints no yellow). Usage: python3 scripts/brand/album-art.py
"""
import colorsys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC, OUT = ROOT / 'brand/source/album', ROOT / 'public/album/art'


def no_yellow(im):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b = px[x, y][:3]
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if 0.105 < h < 0.19 and s > 0.28 and v > 0.3:   # yellow → the weekly's orange family
                r2, g2, b2 = colorsys.hsv_to_rgb(0.065 + (h - 0.105) * 0.25, min(1, s * 1.05), v * 0.97)
                px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255)) + tuple(px[x, y][3:])
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    cover = Image.open(SRC / 'cover-reference.png').convert('RGB')
    scene = no_yellow(cover.crop((85, 295, 685, 785)))
    scene.resize((1200, 980), Image.LANCZOS).save(OUT / 'scene.webp', 'WEBP', quality=86, method=6)
    scene.resize((600, 490), Image.LANCZOS).save(OUT / 'scene-600.webp', 'WEBP', quality=84, method=6)
    pack = Image.open(SRC / 'packet-reference.png').convert('RGB')
    pack.crop((0, 0, 765, 62)).save(OUT / 'foil-top.webp', 'WEBP', quality=84)
    pack.crop((0, 962, 765, 1024)).save(OUT / 'foil-bottom.webp', 'WEBP', quality=84)
    pack.crop((0, 120, 40, 900)).save(OUT / 'foil-side.webp', 'WEBP', quality=84)
    print('album art written to', OUT)


if __name__ == '__main__':
    main()
