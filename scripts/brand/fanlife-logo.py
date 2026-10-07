"""FAN LIFE logo (Maor's artwork, 7.10.2026) → the sizes the site uses.

- logo-<n>.png: the full colour seal (hub pages, favicon, app icon, share card).
- mark-32.png / mark-64.png: the ball and its blue ring only — the words cannot be read at tab size.
- logo-mono.webp: greyscale for club pages, where the seal's red/green/blue could be a rival's colour
  (owner, 7.10.2026: rival colours are banned on that club's pages).
- og.png: the 1200×630 share card on the magazine's cream.
Usage: python3 scripts/brand/fanlife-logo.py <logo.png>
"""
import sys
from PIL import Image, ImageOps
OUT = 'public/brand/fanlife'
src = Image.open(sys.argv[1]).convert('RGBA')
src = src.crop(src.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox())
W = src.width
for n in (512, 192, 180, 96):
    src.resize((n, n), Image.LANCZOS).save(f'{OUT}/logo-{n}.png', optimize=True)
c = W / 2; r = W * 0.318  # outer edge of the blue ring
mark = src.crop((round(c - r), round(c - r), round(c + r), round(c + r)))
from PIL import ImageDraw
disc = Image.new('L', (mark.width * 4, mark.height * 4), 0); ImageDraw.Draw(disc).ellipse((0, 0, disc.width - 1, disc.height - 1), fill=255)
mark.putalpha(disc.resize(mark.size, Image.LANCZOS))  # only the ring and the ball: the lettering stays outside
for n in (32, 64):
    mark.resize((n, n), Image.LANCZOS).save(f'{OUT}/mark-{n}.png', optimize=True)
g = ImageOps.autocontrast(src.convert('L'), cutoff=1)
mono = Image.merge('LA', (g, src.getchannel('A'))).convert('RGBA')
mono.resize((256, 256), Image.LANCZOS).save(f'{OUT}/logo-mono.webp', quality=90, method=6)
og = Image.new('RGBA', (1200, 630), (239, 230, 212, 255))
og.alpha_composite(src.resize((520, 520), Image.LANCZOS), (340, 55))
og.convert('RGB').save(f'{OUT}/og.png', optimize=True)
print('ok', W)
