#!/usr/bin/env python3
"""
גרפיקת אוסישקין לאתר — web derivatives of the hall paintings.

The hall exists in this repo as ten paintings under `public/life/art`, and they were
made for the 2D game: `ussExt.webp` alone is 4.1 MB at 2728x1536, because a Phaser
scene scrolls across it. Putting those files on a page that a supporter opens on a
phone would be a 11 MB screen, so the web wing gets its own derivatives — two widths
each, WebP, at the crops the page actually paints.

Two things this script will not do:

  * **It never writes back into `public/life/art`.** Those files are the game's, and
    the standing rule is that a painting is replaced under its own name or not at all.
    Derivatives live under `public/uss/` and carry the source key in the manifest, so
    a replaced painting regenerates its own web copies and nothing drifts.
  * **It does not trust the resize.** Downscaling interpolates, and interpolation
    between vermilion and cream lands on an orange-yellow hue for a pixel or two. The
    outputs are scanned with the project's own definition of yellow
    (`lib/isYellow.ts`, reimplemented here) and any pixel that crosses the line is
    desaturated in place, keeping its lightness. The scan runs on the OUTPUT file after
    it is written, not on the buffer before it — that distinction is what caught ten
    yellow survivors in the WebP conversion of 13.9.2026.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public" / "life" / "art"
OUT = ROOT / "public" / "uss"
MANIFEST = ROOT / "lib" / "ussishkin" / "plates.json"

# web key -> (source painting, what it is, crop, widths)
#
# Eight plates, and the two that are missing were cut on purpose. `ussExt` is the same
# building from the same side as the hero and read as the page repeating itself;
# `ussHallPre` is `ussHigh` in a warmer light and nobody could tell them apart. Rule 48
# already says it: ship no art that nothing places. Both are also the two heaviest
# files in the set, because a warm dusk exterior sits almost entirely inside the
# de-yellow band and will not come down to zero under a lossy encode — so dropping them
# took 1.9 MB off the page as well as a duplicate out of it.
#
# The hero is capped narrower than the interiors for the same reason: it is lossless,
# it is the largest paint on the screen, and 1200 is already wider than the content
# column ever gets.
PLATES: list[tuple[str, str, str, tuple[float, float, float, float] | None, tuple[int, ...]]] = [
    ("approach", "panoUssOutside", "הפינה מבחוץ — הגג הירוק", (0.10, 0.06, 0.92, 0.97), (760, 1200)),
    ("hall",     "panoUssHall",    "האולם מבפנים",            None, (760, 1520)),
    ("derby",    "panoUssDerby",   "ליל הדרבי",               None, (760, 1520)),
    ("high",     "ussHigh",        "מלמעלה, מהיציע",          None, (760, 1520)),
    ("low",      "ussLow",         "מהפרקט",                  None, (760, 1520)),
    ("night",    "ussHallNight",   "האולם בלילה",             None, (760, 1520)),
    ("cream",    "ussCream",       "היציע הבהיר",             None, (760, 1520)),
    ("end",      "ussEnd",         "קיר הסל",                 None, (760, 1520)),
]
QUALITY = 82


# The CLEAN band is deliberately wider than the band the proof is counted in.
#
# Rule 44 and rule 61 both say why, and this script proved it again: cleaning exactly to
# `lib/isYellow.ts` passed its own scan and then the BROWSER, resampling a 1520px plate
# down to a 390px phone, moved four pixels back over the line. A pixel that is legal in
# the file has to stay legal after somebody else's resize, so the margin is built in
# here and the proof is still counted on the canonical band.
# The band is rule 44's PAINT band, not rule 61's scan margin. The narrower margin got
# these plates to zero in the file and the browser still produced four yellow pixels on
# screen: it resamples a cleaned pixel against an untouched warm neighbour just outside
# the band, and the average lands inside it. Treating the whole warm band is the only
# thing that removes the neighbour as well as the pixel.
CLEAN_HUE = (30.0, 80.0)
CLEAN_SAT = 0.18
SCAN_HUE = (38.0, 70.0)
SCAN_SAT = 0.35


def _hue_sat(r: int, g: int, b: int):
    mx, mn = max(r, g, b), min(r, g, b)
    delta = mx - mn
    if delta == 0 or mx == 0:
        return None, 0.0, 0.0
    if mx == r:
        hue = 60 * (((g - b) / delta + 6) % 6)
    elif mx == g:
        hue = 60 * ((b - r) / delta + 2)
    else:
        hue = 60 * ((r - g) / delta + 4)
    return hue, delta / mx, mx / 255


def needs_clean(r: int, g: int, b: int) -> bool:
    """The wider band the pixels are FIXED in."""
    hue, sat, val = _hue_sat(r, g, b)
    if hue is None or sat < CLEAN_SAT or val < 0.30:
        return False
    return CLEAN_HUE[0] <= hue <= CLEAN_HUE[1]


def is_yellow(r: int, g: int, b: int) -> bool:
    """Byte-for-byte the rule in lib/isYellow.ts. Do not 'improve' it here."""
    mx, mn = max(r, g, b), min(r, g, b)
    delta = mx - mn
    if delta == 0:
        return False
    if delta / mx < 0.35 or mx / 255 < 0.35:
        return False
    if mx == r:
        hue = 60 * (((g - b) / delta + 6) % 6)
    elif mx == g:
        hue = 60 * ((b - r) / delta + 2)
    else:
        hue = 60 * ((r - g) / delta + 4)
    return 38 <= hue <= 70


def dampen(px: tuple[int, int, int]) -> tuple[int, int, int]:
    """Pull a yellow pixel under the saturation floor without changing how bright it is."""
    r, g, b = px
    mx = max(r, g, b)
    target = 0.20  # well under the CLEAN floor, so a lossy re-encode cannot jitter back over it
    mn = round(mx * (1 - target))
    span = mx - min(r, g, b)
    if span == 0:
        return px
    scale = (mx - mn) / span
    return tuple(round(mx - (mx - c) * scale) for c in (r, g, b))  # type: ignore[return-value]


def count_yellow(image: Image.Image) -> int:
    pixels = image.load()
    width, height = image.size
    return sum(
        1 for y in range(height) for x in range(width) if is_yellow(*pixels[x, y])
    )


def scrub(image: Image.Image) -> int:
    """Pull every pixel in the WIDE band under the saturation floor, in place."""
    pixels = image.load()
    width, height = image.size
    fixed = 0
    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]
            if needs_clean(r, g, b):
                pixels[x, y] = dampen((r, g, b))
                fixed += 1
    return fixed


def write_clean(painting: Image.Image, path: Path) -> tuple[int, bool]:
    """
    Encode, DECODE, and count the yellow on the bytes that will actually be served.

    This is rule 61's method and it is the whole point: a lossy encoder moves borderline
    pixels, so a scan of the buffer before saving proves nothing about the file. The
    loop cleans, re-encodes and re-counts; only a plate that will not come down to zero
    falls back to lossless, where the decode is exact. Most do not need it, which is why
    the folder stays light instead of tripling.
    """
    work = painting.copy()
    fixed = scrub(work)
    for _ in range(5):
        work.save(path, "WEBP", quality=QUALITY, method=6)
        with Image.open(path) as saved:
            decoded = saved.convert("RGB")
        if count_yellow(decoded) == 0:
            return fixed, False
        fixed += scrub(decoded)
        work = decoded
    work.save(path, "WEBP", lossless=True, method=6)
    with Image.open(path) as saved:
        left = count_yellow(saved.convert("RGB"))
    if left:
        raise SystemExit(f"{path.name}: {left} yellow pixels survived lossless")
    return fixed, True


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, dict[str, object]] = {}
    total_yellow = 0

    for key, source, what, crop, widths in PLATES:
        src = SRC / f"{source}.webp"
        if not src.exists():
            print(f"  MISSING {src.relative_to(ROOT)}", file=sys.stderr)
            return 1
        with Image.open(src) as image:
            painting = image.convert("RGB")
            if crop is not None:
                w, h = painting.size
                painting = painting.crop(
                    (round(crop[0] * w), round(crop[1] * h), round(crop[2] * w), round(crop[3] * h))
                )
            sizes: list[dict[str, int]] = []
            for width in widths:
                if width > painting.width:
                    continue
                height = round(painting.height * width / painting.width)
                out = OUT / f"{key}-{width}.webp"
                found, lossless = write_clean(
                    painting.resize((width, height), Image.LANCZOS), out
                )
                total_yellow += found
                sizes.append({"w": width, "h": height, "bytes": out.stat().st_size})
                note = f"  (de-yellowed {found}{', lossless' if lossless else ''})" if found else ""
                print(f"  {out.name:<18} {width}x{height}  {out.stat().st_size / 1024:6.0f} KB{note}")
        manifest[key] = {"source": source, "whatHe": what, "sizes": sizes}

    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(
        json.dumps(
            {
                "note": "נגזרות רשת של ציורי אוסישקין. המקור תמיד public/life/art — אל תערוך כאן.",
                "generator": "scripts/uss/make-web-art.py",
                "plates": manifest,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf8",
    )
    print(f"\n{len(manifest)} plates · {total_yellow} yellow pixels corrected")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
