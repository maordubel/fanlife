"""
הסמלים של 22.9.2026 — שבעה קבצים, שלושה נכנסים עכשיו, ושלושה מחכים לשנה שלהם.

מאור שלח ב-22.9.2026 את הסמלים שחסרו, ובתוכם את הסמל של 1997–2000 — כתר בכתום, בצהוב
ובכחול — וכתב עליו: **"שהיה עם צהוב. וזה מאושר! זה ההיסטוריה."** ב-1.9.2026 הקובץ הזה לא
נכתב בכלל (`scripts/brand/crests.py`), כי כלל 8 לא מכיר חריג לאמנות. עכשיו הבעלים נתן חריג,
במילים שלו, על נכס אחד — וזה בדיוק מה שכלל 8 דורש. `lib/brand/yellowExemptions.ts` רושם אותו
כנתיב, לא כצבע.

מה נכנס:
  · `keter-color.png` — 1997–2000. **לא עובר de-yellow**: הצהוב הוא ההיסטוריה, והחריג הוא על
    הקובץ הזה בלבד. נשמר כ-PNG פלטה (כלל 27), כך שמה שנמדד הוא מה שנשלח.
  · `circle-1923.png`, `circle-1927.png` — אותם סמלים בדיוק, בגרסה חדה יותר. עוברים de-yellow
    (אפס בכל מקרה) ובדיקת פלטה, כמו כל אמנות אחרת.

מה מחכה (נשמר ב-`brand/source/crests-2026-09-22/`, לא נשלח לאתר): `keter-black.png`,
`keter-patch.png`, `worker-cream.png`. לכל אחד צריך שנה מתוך ציר הסמלים, וסמל שמודפס על
חולצה הוא טענה על החולצה (כלל 25) — לכן הוא נכנס רק כשמאור אומר לאיזו תקופה הוא שייך.

    python3 scripts/brand/crests-2026-09-22.py
"""
import colorsys
from pathlib import Path

from PIL import Image

SOURCE = Path("brand/source/crests-2026-09-22")
OUT = Path("public/brand/crests")
MAX_SIDE = 560

# key -> (source file, palette size, de-yellow?)
JOBS = {
    "keter-color": ("keter-color-1997.png", 128, False),
    "circle-1923": ("circle-1923.png", 96, True),
    "circle-1927": ("circle-1927.png", 96, True),
}


def hsv(r: int, g: int, b: int) -> tuple[float, float, float]:
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return h * 360, s, v


def is_yellow(r: int, g: int, b: int) -> bool:
    # the canonical band of lib/isYellow.ts
    h, s, v = hsv(r, g, b)
    return 38 <= h <= 70 and s >= 0.35 and v >= 0.2


def main() -> int:
    for key, (name, colours, clean) in JOBS.items():
        image = Image.open(SOURCE / name).convert("RGBA")
        image = image.crop(image.getbbox())
        image.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        quantised = image.quantize(colors=colours, method=Image.Quantize.FASTOCTREE)
        # An RGBA image quantises to an RGBA PALETTE: the alpha lives in the table itself. Read
        # and write it as RGBA — an RGB round trip drops it, and the crest lands on a black
        # square (it did, once).
        palette = quantised.getpalette("RGBA")[: colours * 4]
        moved = 0
        if clean:
            for i in range(0, len(palette), 4):
                r, g, b = palette[i : i + 3]
                h, s, v = hsv(r, g, b)
                if 34 <= h <= 74 and s >= 0.30:
                    nr, ng, nb = colorsys.hsv_to_rgb(20 / 360, s, v)
                    palette[i : i + 3] = [round(nr * 255), round(ng * 255), round(nb * 255)]
                    moved += 1
            quantised.putpalette(palette, "RGBA")
        target = OUT / f"{key}.png"
        quantised.save(target, optimize=True)
        written = Image.open(target).convert("RGBA")
        yellow = sum(1 for r, g, b, a in written.get_flattened_data() if a > 128 and is_yellow(r, g, b))
        if clean and yellow:
            raise SystemExit(f"{target} still carries {yellow} yellow pixels")
        print(f"{key:12} {written.size} {target.stat().st_size:>7}B palette-moved {moved:>3} yellow {yellow}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
