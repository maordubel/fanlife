"""
Keep yellow out of the artwork Maor sends — images and video frames alike.

Rule 8 is absolute: no yellow, in either token system, with **no exemption for artwork
or for "the pictures"**. That rule is Maor's own, recorded after an earlier attempt of
mine to scope it down was reversed. It applies to a JPEG exactly as it applies to a CSS
variable, so this is the shared pass that every incoming asset goes through.

What it does is the same editorial move as `badge.py`: a pixel whose HUE lands in the
yellow band is rotated to a warm brown at the SAME saturation and value. Only the hue
moves, so shading keeps its weight and the drawing keeps its form — nothing is flattened,
recoloured wholesale, or painted over.

The band is wider than `lib/isYellow.ts` (38–70) on both sides. A browser scaling a
1080px asset down averages neighbouring pixels, and an average of two colours just
outside the band can land inside it: the margin is what makes the RENDERED page clean
rather than only the file. It stops above the skin tones (~32°), which are left exactly
as drawn.

    python3 scripts/brand/deyellow.py <in> <out>            # one image
    python3 scripts/brand/deyellow.py --dir <in> <out>      # a folder of frames
    python3 scripts/brand/deyellow.py --dir --video <in> <out>   # frames bound for h.264
"""
import sys
from pathlib import Path

from PIL import Image

# wider than lib/isYellow.ts on both sides, but above the skin tones
BAND = (37.0, 76.0)
SAT_FLOOR = 0.28
VAL_FLOOR = 0.28
TARGET_HUE = 20.0

# Video needs a wider net than a still does, and the reason is the codec rather than the
# artwork. h.264 stores chroma at a quarter resolution (yuv420p), so a 2×2 block of dark
# olive and bright grass comes back as one averaged colour — and an average of two
# colours just OUTSIDE the band lands inside it. The cleaned frames scanned at zero and
# the encoded file still carried 1,412 pixels of (92,86,52): value 0.36 against a floor
# of 0.35, which is the encoder, not the drawing. This is the same failure that put
# yellow back into the badge after Next re-encoded it to WebP.
VIDEO = {"band": (33.0, 82.0), "sat_floor": 0.18, "val_floor": 0.16}


def hue_of(r: int, g: int, b: int) -> tuple[float, float, float, int]:
    mx, mn = max(r, g, b), min(r, g, b)
    delta = mx - mn
    if delta == 0:
        return 0.0, 0.0, mx / 255, 0
    if mx == r:
        hue = 60 * (((g - b) / delta + 6) % 6)
    elif mx == g:
        hue = 60 * ((b - r) / delta + 2)
    else:
        hue = 60 * ((r - g) / delta + 4)
    return hue, delta / mx, mx / 255, delta


def rotate(r: int, g: int, b: int) -> tuple[int, int, int]:
    """Same saturation, same value, hue moved to warm brown."""
    _, sat, val, _ = hue_of(r, g, b)
    h = TARGET_HUE / 60.0
    i = int(h) % 6
    f = h - int(h)
    p = val * (1 - sat)
    q = val * (1 - sat * f)
    t = val * (1 - sat * (1 - f))
    table = [(val, t, p), (q, val, p), (p, val, t), (p, q, val), (t, p, val), (val, p, q)]
    nr, ng, nb = table[i]
    return round(nr * 255), round(ng * 255), round(nb * 255)


def deyellow(image: Image.Image, profile: dict | None = None) -> tuple[Image.Image, int]:
    band = profile["band"] if profile else BAND
    sat_floor = profile["sat_floor"] if profile else SAT_FLOOR
    val_floor = profile["val_floor"] if profile else VAL_FLOOR
    has_alpha = image.mode == "RGBA"
    work = image.convert("RGBA") if has_alpha else image.convert("RGB")
    pixels = work.load()
    moved = 0
    for y in range(work.height):
        for x in range(work.width):
            value = pixels[x, y]
            if has_alpha:
                r, g, b, a = value
                if a < 8:
                    continue
            else:
                r, g, b = value
                a = 255
            hue, sat, val, delta = hue_of(r, g, b)
            if delta == 0 or sat < sat_floor or val < val_floor:
                continue
            if not (band[0] <= hue <= band[1]):
                continue
            nr, ng, nb = rotate(r, g, b)
            pixels[x, y] = (nr, ng, nb, a) if has_alpha else (nr, ng, nb)
            moved += 1
    return work, moved


def main() -> int:
    args = sys.argv[1:]
    video = "--video" in args
    args = [a for a in args if a != "--video"]
    profile = VIDEO if video else None

    if args[:1] == ["--dir"]:
        source, target = Path(args[1]), Path(args[2])
        target.mkdir(parents=True, exist_ok=True)
        total = 0
        files = sorted(source.glob("*.png"))
        for path in files:
            image, moved = deyellow(Image.open(path), profile)
            image.save(target / path.name)
            total += moved
        print(f"{len(files)} frames · {total} pixels rotated out of the yellow band")
        return 0

    source, target = Path(args[0]), Path(args[1])
    image, moved = deyellow(Image.open(source), profile)
    Path(target).parent.mkdir(parents=True, exist_ok=True)
    image.save(target)
    print(f"{source.name} → {target} · {moved} pixels rotated out of the yellow band")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
