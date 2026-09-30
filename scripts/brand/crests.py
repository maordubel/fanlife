"""
Cut the club's crests out of their backgrounds and keep yellow out of them.

Maor supplied eight crest variants on 1.9.2026 for the crest chapter of the game — the
one where the question is which era had a crown, which said 1923 and which said 1927.
This turns his files into transparent PNGs the app can print at any size.

Two things are deliberate:

  · **Background removal is a flood fill from the four corners**, not a colour key. The
    crests contain white INSIDE them — the worker figure is white on red in half of
    them — and a colour key would eat the figure. A fill that only reaches white
    connected to the edge cannot.

  · **The yellow-KETER variant is not written at all.** It carries 912 pixels in the
    forbidden hue band, and rule 8 has no exemption for artwork or for "the pictures".
    That era still EXISTS in the game: `content/manual/crest-eras.json` records that the
    wordmark was yellow in that period and the question asks about it in words. The app
    states the fact without painting it, which is the only way to keep both promises.

    python3 scripts/brand/crests.py
"""
import colorsys
import sys
from collections import deque
from pathlib import Path

from PIL import Image

UPLOADS = Path("/root/.claude/uploads/65b9022f-7ba4-5c3b-819d-af0606e68557")
OUT = Path("public/brand/crests")

# key -> source file. `keter-yellow` is absent on purpose; see the note above.
SOURCES = {
    "circle-1923": "4424655e-image.png",
    "keter-ball": "74e5c676-image.png",
    "ball-waves": "16d1f4dd-image.png",
    "worker-white": "af56209a-image.png",
    "worker-hapoel": "5647bf15-image.png",
    "worker-ta": "5692d787-image.png",
    "circle-1927": "1386cef0-image.png",
}

BAND = (37.0, 76.0)
SAT_FLOOR = 0.30
VAL_FLOOR = 0.30
TARGET_HUE = 20.0
TOLERANCE = 26


def hue_of(r: int, g: int, b: int) -> tuple[float, float, float] | None:
    mx, mn = max(r, g, b), min(r, g, b)
    delta = mx - mn
    if delta == 0:
        return None
    sat, val = delta / mx, mx / 255
    if mx == r:
        hue = 60 * (((g - b) / delta + 6) % 6)
    elif mx == g:
        hue = 60 * ((b - r) / delta + 2)
    else:
        hue = 60 * ((r - g) / delta + 4)
    return hue, sat, val


def deyellow(image: Image.Image) -> int:
    pixels = image.load()
    moved = 0
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a < 8:
                continue
            hsv = hue_of(r, g, b)
            if hsv is None:
                continue
            hue, sat, val = hsv
            if sat < SAT_FLOOR or val < VAL_FLOOR:
                continue
            if not (BAND[0] <= hue <= BAND[1]):
                continue
            nr, ng, nb = colorsys.hsv_to_rgb(TARGET_HUE / 360, sat, val)
            pixels[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
            moved += 1
    return moved


def cut_background(image: Image.Image) -> int:
    """Flood the background from the corners. White inside the mark survives."""
    pixels = image.load()
    width, height = image.size
    seeds = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
    base = [pixels[x, y][:3] for x, y in seeds]
    seen = set()
    queue: deque[tuple[int, int]] = deque()
    for point in seeds:
        queue.append(point)
        seen.add(point)
    cleared = 0
    while queue:
        x, y = queue.popleft()
        r, g, b, a = pixels[x, y]
        if a == 0:
            near = True
        else:
            near = any(
                abs(r - br) <= TOLERANCE and abs(g - bg) <= TOLERANCE and abs(b - bb) <= TOLERANCE
                for br, bg, bb in base
            )
        if not near:
            continue
        if a != 0:
            pixels[x, y] = (r, g, b, 0)
            cleared += 1
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in seen:
                seen.add((nx, ny))
                queue.append((nx, ny))
    return cleared


def trim(image: Image.Image) -> Image.Image:
    box = image.getbbox()
    return image.crop(box) if box else image


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    for key, name in SOURCES.items():
        path = UPLOADS / name
        if not path.exists():
            print(f"missing {path}", file=sys.stderr)
            continue
        image = Image.open(path).convert("RGBA")
        cleared = cut_background(image)
        moved = deyellow(image)
        image = trim(image)
        image.save(OUT / f"{key}.png")
        print(f"{key:15} {image.size}  background {cleared}px  de-yellowed {moved}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
