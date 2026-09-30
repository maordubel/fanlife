"""
Build the badge assets from Maor's original artwork — and keep yellow out of them.

Nothing here re-draws the badge. The pipeline is: crop his upload to the circle, scale
it, cut a circular alpha just inside the black keyline, write the six sizes.

The last step is the only editorial one. Rule 8 is absolute — no yellow, with no
exemption for artwork — and a handful of dark edge pixels in the drawing land inside the
yellow hue band. Those get rotated to a warm brown at the SAME saturation and value, so
the shading keeps its weight and only its hue moves. The band used here is a little
wider than `lib/isYellow.ts` because a browser scaling a 192px PNG down to 124px
averages neighbours, and an average of two colours just outside the band can land inside
it; the margin is what makes the RENDERED page clean, not just the file. It stops short
of the skin tones (~32 deg), which are left exactly as drawn.

    python3 scripts/brand/badge.py
"""
import colorsys
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SOURCE = Path("brand/source/badge-original.png")
OUT_DIR = Path("public/brand")
MASTER = 1024
SIZES = [512, 192, 96, 48, 32]

# the circle inside his sheet, and the inset that lands just inside the black keyline
CROP = (30, 107, 671, 757)
INSET = 0.004

# guard band — wider than lib/isYellow.ts (38..70) on both sides, but above the skin
BAND = (37.0, 76.0)
SAT_FLOOR = 0.30
VAL_FLOOR = 0.30
TARGET_HUE = 20.0


def deyellow(image: Image.Image) -> tuple[Image.Image, int]:
    pixels = image.load()
    moved = 0
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a < 8:
                continue
            mx, mn = max(r, g, b), min(r, g, b)
            delta = mx - mn
            if delta == 0:
                continue
            sat, val = delta / mx, mx / 255
            if sat < SAT_FLOOR or val < VAL_FLOOR:
                continue
            if mx == r:
                hue = 60 * (((g - b) / delta + 6) % 6)
            elif mx == g:
                hue = 60 * ((b - r) / delta + 2)
            else:
                hue = 60 * ((r - g) / delta + 4)
            if not (BAND[0] <= hue <= BAND[1]):
                continue
            nr, ng, nb = colorsys.hsv_to_rgb(TARGET_HUE / 360, sat, val)
            pixels[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
            moved += 1
    return image, moved


def circular(image: Image.Image) -> Image.Image:
    size = image.width
    mask = Image.new("L", (size * 4, size * 4), 0)
    pad = round(size * 4 * INSET)
    ImageDraw.Draw(mask).ellipse((pad, pad, size * 4 - pad, size * 4 - pad), fill=255)
    image.putalpha(mask.resize((size, size), Image.LANCZOS))
    return image


def main() -> int:
    if not SOURCE.exists():
        print(f"missing {SOURCE}", file=sys.stderr)
        return 1
    art = Image.open(SOURCE).convert("RGBA").crop(CROP)
    art = circular(art.resize((MASTER, MASTER), Image.LANCZOS))
    art, moved = deyellow(art)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    art.save(OUT_DIR / "logo.png")
    print(f"logo.png         {MASTER:>5}px  de-yellowed {moved}")
    for size in SIZES:
        scaled, moved = deyellow(art.resize((size, size), Image.LANCZOS))
        scaled.save(OUT_DIR / f"logo-{size}.png")
        print(f"logo-{size}.png{'':<{max(0, 9 - len(str(size)))}} {size:>5}px  de-yellowed {moved}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
