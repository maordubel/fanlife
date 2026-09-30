"""
הקלפים — crop, treat, and light the Supergoal scans.

Maor, 7.9.2026: *"תעשה חיתוך יפה של הקלפים, תוסיף להם איזה 'הילה' מסביבם, לא להשאיר כמו
שאני סיפקתי לך. תשדרג את התצוגה."* He is right. What arrived is six photographs OF
stickers — ruled notebook paper behind them, a thumb-width of desk at one edge, the tape
he wrote his captions on. That is how they live in his album and it is not how they
should be held up in a game.

Three passes, in this order, and the order matters:

1. **חיתוך** — crop to the printed card and nothing else. The boxes are measured by hand
   and written here rather than detected, because auto-detection kept eating the white
   border of the 1986 stickers (which is part of the sticker) and keeping the red tape
   under them (which is not). Six numbers, six files, checked by eye.
2. **חוק הצהוב** — the same absolute prohibition the paintings obey. `build-art.py` is
   not reused: its `GREEN_SPLIT` sends a yellow above hue 55 UP into green, which is
   right for a sunlit pitch and turned Bezredno's printed name strip into a bright green
   bar. Here every yellow goes DOWN to the badge's warm brown, because none of these
   images has grass in the band and all of them have print.
3. **PNG** — not JPEG. Chroma subsampling puts a yellow edge back at decode wherever a
   strong yellow met black (rule 27), and iterating a lossy codec until it happens to
   measure clean is not a guarantee. A lossless file is measured once and stays that way.

The halo is NOT baked in. It is drawn by `AlbumSheet` in CSS, so it follows the card at
any size and can be tuned without touching a scan.

    python3 scripts/life/build-stickers.py
"""
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(HERE, '..', '..', 'public', 'life', 'docs')
# the folder Maor sent, as it is staged into this container
SRC = os.environ.get('SG_SRC', '/mnt/user-data/uploads/סופרגול כללי')

# file in his folder → (name in the archive, crop box as fractions of the source)
CARDS = [
    ('בזרנו 80.jpg', 'sg-bezredno-80', (0.100, 0.075, 0.870, 0.945)),
    ('אלי כהן 86.jpg', 'sg-elicohen-86', (0.095, 0.042, 0.858, 0.845)),
    ('לנדאו 86.jpg', 'sg-landau-86', (0.082, 0.038, 0.848, 0.822)),
    ('שלום תקוה 96.jpg', 'sg-tikva-96', (0.012, 0.006, 0.990, 0.994)),
    (
        'סופרגול1992-3/594052390_10163363916999373_385346032331315246_n.jpg',
        'sg-halfon-93',
        (0.008, 0.005, 0.992, 0.995),
    ),
    (
        'סופרגול1992-3/593878101_10163363912049373_4278207479421918983_n.jpg',
        'sg-squad-93',
        (0.006, 0.006, 0.994, 0.994),
    ),
]

# the scanner's band, widened by four degrees at each end so a resampled edge cannot land
# back inside it (`lib/isYellow.ts` is 38–70 at S 0.35, V 0.35)
HUE = (33.0, 78.0)
SAT, VAL = 0.22, 0.26
# where a yellow goes: the badge's own warm brown, never up into green
SAFE_HUE = 26.0
SAFE_SAT_CAP = 0.86


def to_hsv(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d == 0:
        h = 0.0
    elif mx == r:
        h = 60 * (((g - b) / d + 6) % 6)
    elif mx == g:
        h = 60 * ((b - r) / d + 2)
    else:
        h = 60 * ((r - g) / d + 4)
    return h, (0.0 if mx == 0 else d / mx), mx / 255.0


def to_rgb(h, s, v):
    c = v * s
    x = c * (1 - abs(((h / 60) % 2) - 1))
    m = v - c
    if h < 60:
        r, g, b = c, x, 0.0
    elif h < 120:
        r, g, b = x, c, 0.0
    elif h < 180:
        r, g, b = 0.0, c, x
    elif h < 240:
        r, g, b = 0.0, x, c
    elif h < 300:
        r, g, b = x, 0.0, c
    else:
        r, g, b = c, 0.0, x
    return (round((r + m) * 255), round((g + m) * 255), round((b + m) * 255))


def deyellow(im):
    rgb = im.convert('RGB')
    px = rgb.load()
    w, h = rgb.size
    lut = {}
    moved = 0
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            q = lut.get(p)
            if q is None:
                hh, s, v = to_hsv(*p)
                if s < SAT or v < VAL or not (HUE[0] <= hh <= HUE[1]):
                    q = p
                else:
                    q = to_rgb(SAFE_HUE, min(SAFE_SAT_CAP, s), v)
                lut[p] = q
            if q != p:
                px[x, y] = q
                moved += 1
    return rgb, moved


def fraction_yellow(im):
    small = im.convert('RGB').copy()
    small.thumbnail((360, 360))
    px = list(small.getdata())
    hit = 0
    for r, g, b in px:
        hh, s, v = to_hsv(r, g, b)
        if s < 0.35 or v < 0.35:
            continue
        if 38 <= hh <= 70:
            hit += 1
    return hit / max(1, len(px))


def main():
    bad = []
    for source, name, box in CARDS:
        path = os.path.join(SRC, source)
        if not os.path.exists(path):
            print(f'{name}: source missing ({path}) — leaving the archive file alone')
            continue
        im = Image.open(path).convert('RGB')
        w, h = im.size
        a, b, c, d = box
        card = im.crop((int(a * w), int(b * h), int(c * w), int(d * h)))
        # a sticker is 40mm of card; 1100px on the long edge is already more than any
        # screen this game runs on will ever show of it
        if max(card.size) > 1100:
            scale = 1100 / max(card.size)
            card = card.resize((round(card.size[0] * scale), round(card.size[1] * scale)), Image.LANCZOS)
        before = fraction_yellow(card)
        clean, moved = deyellow(card)
        out = os.path.join(DOCS, f'{name}.jpg')
        clean.save(out, 'JPEG', quality=90, subsampling=0, optimize=True, progressive=True)
        after = fraction_yellow(Image.open(out))
        # a handful of pixels can come back on the ENCODE — ringing where a big flat
        # colour meets black. Treat the decoded bytes again until the file on disk is
        # clean, so what is measured is what ships rather than what was in memory.
        for _ in range(4):
            if after == 0:
                break
            again, step = deyellow(Image.open(out))
            moved += step
            again.save(out, 'JPEG', quality=93, subsampling=0, optimize=True, progressive=True)
            after = fraction_yellow(Image.open(out))
        size = os.path.getsize(out) // 1024
        print(f'{name}: {card.size[0]}×{card.size[1]}  yellow {before * 100:5.2f}% -> {after * 100:5.2f}%  ({moved} px, {size} KB)')
        if after > 0:
            bad.append(name)
    if bad:
        raise SystemExit('STILL YELLOW: ' + ', '.join(bad))
    print('every card in the archive is cropped and clean')


if __name__ == '__main__':
    main()
