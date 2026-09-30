"""
החולצה של 1984/85 — the kit the archive actually holds, drawn because the photograph is
not in this repo.

Maor chose the real 1984/85 home shirt over the VISA one the game was handing a
seven-year-old in the summer of 1985: `content/manual/kit-designs.json` files that
combination as 1988/89, and the brief forbids inventing a sponsor. The archive's own row,
at confidence 3 from photographs Maor supplied on 1.9.2026, reads:

    adidas · גלאב הוטל טבריה · red · diagonal · cream · plain sleeves · v-neck, cream

So that is what this draws: red, thin cream and blue diagonals, a cream v-neck, and NO
lettering of any kind — the sponsor's name is printed by `ShirtCard` from the archive row,
where it carries its source, rather than painted into a picture where it would not.

It is a stand-in, and it says so: `docs/life/GRAPHICS-REQUESTS.md` asks for the photograph,
and the moment it arrives it overwrites this file under the same name.

    python3 scripts/life/make-shirt-8485.py
"""
from PIL import Image, ImageDraw, ImageFilter
import math

W, H = 960, 880
img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

RED = (176, 30, 38, 255)
RED_DARK = (140, 22, 30, 255)
CREAM = (238, 231, 214, 255)
BLUE = (36, 52, 104, 255)

# the silhouette: body + two sleeves, the same squat 1980s cut as the other shirts here
body = [(300, 190), (660, 190), (700, 300), (700, 800), (600, 830), (360, 830), (260, 800), (260, 300)]
d.polygon(body, fill=RED)
d.polygon([(300, 190), (200, 210), (120, 330), (200, 400), (275, 300)], fill=RED)
d.polygon([(660, 190), (760, 210), (840, 330), (760, 400), (685, 300)], fill=RED)

# the diagonals — thin, cream with a blue companion, running shoulder to hip
mask = Image.new('L', (W, H), 0)
md = ImageDraw.Draw(mask)
md.polygon(body, fill=255)
md.polygon([(300, 190), (200, 210), (120, 330), (200, 400), (275, 300)], fill=255)
md.polygon([(660, 190), (760, 210), (840, 330), (760, 400), (685, 300)], fill=255)

stripes = Image.new('RGBA', (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(stripes)
angle = math.tan(math.radians(24))
for x in range(-900, W + 900, 96):
    sd.line([(x, 0), (x + int(H * angle), H)], fill=CREAM, width=13)
    sd.line([(x + 22, 0), (x + 22 + int(H * angle), H)], fill=BLUE, width=7)
img.paste(stripes, (0, 0), Image.composite(mask, Image.new('L', (W, H), 0), stripes.split()[3]))

# the v-neck, cream, over everything
d.polygon([(408, 190), (552, 190), (480, 300)], fill=(0, 0, 0, 0))
d.line([(400, 186), (480, 306)], fill=CREAM, width=20)
d.line([(560, 186), (480, 306)], fill=CREAM, width=20)
d.line([(300, 192), (400, 188)], fill=CREAM, width=18)
d.line([(660, 192), (560, 188)], fill=CREAM, width=18)

# cuffs and hem, the way the photographs of this era show them
d.line([(150, 350), (215, 392)], fill=CREAM, width=16)
d.line([(810, 350), (745, 392)], fill=CREAM, width=16)

# cloth: a soft vertical shade so it reads as fabric rather than as a flat shape
shade = Image.new('RGBA', (W, H), (0, 0, 0, 0))
shd = ImageDraw.Draw(shade)
for i in range(0, W, 4):
    a = int(38 * abs(math.sin((i / W) * math.pi * 1.6)))
    shd.line([(i, 0), (i, H)], fill=(0, 0, 0, a))
shade = shade.filter(ImageFilter.GaussianBlur(9))
img = Image.alpha_composite(img, Image.composite(shade, Image.new('RGBA', (W, H), (0, 0, 0, 0)), mask))

# the fold across the middle every shirt kept in a drawer for forty years has
fold = Image.new('RGBA', (W, H), (0, 0, 0, 0))
fd = ImageDraw.Draw(fold)
fd.line([(262, 520), (698, 512)], fill=(0, 0, 0, 46), width=7)
fd.line([(262, 528), (698, 520)], fill=(255, 255, 255, 30), width=4)
fold = fold.filter(ImageFilter.GaussianBlur(3))
img = Image.alpha_composite(img, Image.composite(fold, Image.new('RGBA', (W, H), (0, 0, 0, 0)), mask))

img.save('public/life/art/shirtTveria85.png')
print('wrote public/life/art/shirtTveria85.png', img.size)

# no yellow, ever — the brand test fails the build on it, so it is checked at source
px = img.convert('RGB').load()
bad = 0
for y in range(0, H, 3):
    for x in range(0, W, 3):
        r, g, b = px[x, y]
        if r > 150 and g > 130 and b < 90:
            bad += 1
print('yellowish samples:', bad)
