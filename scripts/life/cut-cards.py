"""
הקלפים החדשים — cut a sheet of Supergoal cards into single cards, and treat them.

Maor, 7.9.2026: *"והוספתי המון קלפים חדשים כעת, נא לעבוד עליהם."* What arrived is five
printed SHEETS — a page of a collector's album photographed flat, fifteen to twenty-three
cards to a sheet — plus a handful of singles. `build-stickers.py` crops singles by hand
because six numbers can be checked by eye; ninety cannot, so this one measures the sheet.

How it finds a card, in the order the passes run:

1. **Canny + contours, swept.** One edge threshold finds most of a sheet's cards and
   misses the ones whose border happens to match the ground. Twenty parameter pairs, all
   unioned and de-duplicated by overlap, miss almost nothing.
2. **Complete the rows.** The sheets are printed grids: within a row every card shares a
   top edge and a pitch. Once two cards in a row are known the rest are arithmetic, so a
   gap in the middle of a row is filled and the ends are probed outwards, each candidate
   kept only if it actually holds something (`cardness`).
3. **Grow to the card's own border.** A contour finds the photo window, not the printed
   border around it, and the border is part of the card. Each edge walks outwards while
   the line of pixels under it still differs from the sheet's ground.
4. **Snap.** Cards on one sheet are one size. Any box more than a fifth off the sheet's
   median has run into the sheet's own frame; it keeps its centre and takes the median
   size. Then the whole row is put on one baseline.
5. **חוק הצהוב.** The same prohibition as everything else in this game, with the same
   mapping as `build-stickers.py` — every yellow goes DOWN to the badge's warm brown —
   but vectorised, because ninety cards at 1100px is 100 million pixels.

Per-sheet numbers live in SHEETS below: an inset, a bottom extension where a name strip
sits below the frame the detector finds, and the indexes to drop (a sheet's own logo, an
advertisement, a blank). Those were read off the contact sheet this script writes, which
is the point of it writing one.

    python3 scripts/life/cut-cards.py
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cv2  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'public', 'life', 'docs')
SRC = os.environ.get('SG_SRC', '/mnt/user-data/uploads/גרפיקה מאושרת/סופרגול כללי')
CONTACT = os.environ.get('SG_CONTACT', '/home/claude/cut/final')

# the scanner's band, widened four degrees each end (`lib/isYellow.ts` is 38–70)
HUE = (33.0, 78.0)
SAT_MIN, VAL_MIN = 0.22, 0.26
SAFE_HUE, SAFE_SAT_CAP = 26.0, 0.86
# the band used on a re-treat. A JPEG encode rings where a big flat colour meets black
# and can put one or two pixels back inside 38–70 no matter how many times the normal
# band is applied — in memory the image measures zero and on disk it does not. Treating
# a WIDER band moves the colours that ring further from the boundary, so what the encoder
# invents around them lands outside it. Nothing legitimate lives between 30 and 33.
WIDE_HUE = (29.0, 84.0)
WIDE_SAT, WIDE_VAL = 0.12, 0.16

# sheet → (file, prefix, drop indexes, extra padding l,t,r,b, ground threshold)
#
# The threshold is how far from the sheet's own ground a pixel has to be to count as card.
# Sixty is right for a sheet printed on flat colour. The 1990s sheet is photographed on
# creased paper with red confetti scattered over it, and at sixty the confetti joins the
# cards into one blob — eighty-five separates them and keeps every card whole.
SHEETS = [
    ('הפועל שנות 80 3 לחתוך כל קלף בנפרד.jpg', 'sg80a', (), (0, 0, 0, 0), 60),
    ('הפועל שנות 80 2 לחתוך כל קלף בנפרד.jpg', 'sg80b', (19,), (0, 0, 0, 0.10), 60),
    ('הפועל שנות 80 לחתוך כל קלף בנפרד.jpg', 'sgcup', (14,), (-0.05, -0.04, -0.05, -0.04), 60),
    ('הפועל97-8 לחתוך כל קלף בנפרד.jpg', 'sg978', (), (0, 0, 0, 0), 60),
    ('הפועל שנות 90 לחתוך כל קלף בנפרד.jpg', 'sg90', (), (0, 0, 0, 0), 85),
]

# single cards that need no detection — file → (name, crop box as fractions)
SINGLES = [
    ('אמציה - אס.jpg', 'ace-levkovich', (0.035, 0.02, 0.965, 0.98)),
    ('חודורוב - אס.jpg', 'ace-chodorov', (0.035, 0.02, 0.965, 0.98)),
    ('טיש - אס.jpg', 'ace-tish', (0.035, 0.02, 0.965, 0.98)),
    ('פרימו - אס.jpg', 'ace-primo', (0.02, 0.02, 0.98, 0.98)),
    ('שייע - אס.jpg', 'ace-feingboim', (0.02, 0.02, 0.98, 0.98)),
    ('דרסליה 98.jpg', 'kt-dreslia', (0.03, 0.02, 0.97, 0.98)),
    ('מוסקאל 98.jpg', 'kt-moskal', (0.03, 0.02, 0.97, 0.98)),
    ('סימרוטיץ 99.jpg', 'kt-simrotic', (0.03, 0.02, 0.97, 0.98)),
    ('שלום תקוה 98.jpg', 'kt-tikva', (0.03, 0.02, 0.97, 0.98)),
    ('יעקב אקהויז 86.jpg', 'hand-ekhoiz', (0.06, 0.05, 0.94, 0.97)),
    ('מוריס זאנו 86.jpg', 'hand-zano', (0.06, 0.05, 0.94, 0.97)),
    ('דוד צילה שנות ה80.jpg', 'hand-hershkovitz', (0.06, 0.05, 0.94, 0.97)),
    ('עופר שיטרית 1997-8.jpg', 'hand-shitrit', (0.06, 0.05, 0.94, 0.97)),
    ('רופניק 2000.jpg', 'hand-rufnik', (0.06, 0.05, 0.94, 0.97)),
    # 27.9.2026 — the 2000s, from the approved folder ("גרפיקה מאושרת/סופרגול כללי")
    ('2002-3/651238713_10163839343739373_7033694082576789318_n.jpg', 'sg0203-00', (0.01, 0.006, 0.99, 0.994)),
    ('2002-3/652321891_10163839344374373_1681149829260192837_n.jpg', 'sg0203-01', (0.01, 0.006, 0.99, 0.994)),
    ('2002-3/652692676_10163839344569373_7115658593328930926_n.jpg', 'sg0203-02', (0.01, 0.006, 0.99, 0.994)),
    ('2002-3/653394089_10163839344799373_510023056689506792_n.jpg', 'sg0203-03', (0.01, 0.006, 0.99, 0.994)),
    ('2002-3/653403990_10163839343844373_7968447333274485523_n.jpg', 'sg0203-04', (0.01, 0.006, 0.99, 0.994)),
    ('2002-3/653406951_10163839344519373_1609308193930330786_n.jpg', 'sg0203-05', (0.01, 0.006, 0.99, 0.994)),
    ('2002-3/653421221_10163839343169373_2819283416704267698_n.jpg', 'sg0203-06', (0.01, 0.006, 0.99, 0.994)),
    ('2002-3/653454576_10163839342734373_8840224092222008624_n.jpg', 'sg0203-07', (0.01, 0.006, 0.99, 0.994)),
    ('2002-3/654361342_10163839344669373_9163581863543893200_n.jpg', 'sg0203-08', (0.01, 0.006, 0.99, 0.994)),
    ('2002-3/654416547_10163839344124373_5217278976293913295_n.jpg', 'sg0203-09', (0.01, 0.006, 0.99, 0.994)),
    ('2002-3/654788325_10163839343409373_6561140603101694989_n.jpg', 'sg0203-10', (0.01, 0.006, 0.99, 0.994)),
    ('2002-3/655979782_10163839343729373_6010544129032549753_n.jpg', 'sg0203-11', (0.01, 0.006, 0.99, 0.994)),
    ('2002-3/656533101_10163839342529373_5441980228286095209_n.jpg', 'sg0203-12', (0.01, 0.006, 0.99, 0.994)),
    ('2002-3/656865590_10163839342704373_7606193270081711898_n.jpg', 'sg0203-13', (0.006, 0.01, 0.994, 0.99)),
    ('שביט אלימלך מימין, פיני בלילי משמאל. 2002-3.jpg', 'sg00-balili', (0.03, 0.03, 0.485, 0.97)),
    ('שביט אלימלך מימין, פיני בלילי משמאל. 2002-3.jpg', 'sg00-elimelech', (0.515, 0.03, 0.975, 0.97)),
    ('יגאל אנטבי 2004.jpg', 'hand-antebi', (0.06, 0.05, 0.94, 0.97)),
    ('טל חן 2004.jpg', 'hand-talchen', (0.06, 0.05, 0.94, 0.97)),
    ('ניל אברברל 2007.jpg', 'hand-avrbrl', (0.06, 0.05, 0.94, 0.97)),
]

MAXPX = 1000


# ---------------------------------------------------------------- the yellow rule
def deyellow(a: np.ndarray, band=None) -> np.ndarray:
    lo, hi = band[0] if band else HUE
    smin, vmin = (band[1], band[2]) if band else (SAT_MIN, VAL_MIN)
    rgb = a.astype(np.float32) / 255.0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    safe = np.where(d == 0, 1.0, d)
    hue = np.where(mx == r, ((g - b) / safe % 6) * 60,
                   np.where(mx == g, ((b - r) / safe + 2) * 60, ((r - g) / safe + 4) * 60))
    sat = np.where(mx == 0, 0.0, d / np.where(mx == 0, 1.0, mx))
    hit = (d > 0) & (sat >= smin) & (mx >= vmin) & (hue >= lo) & (hue <= hi)
    if not hit.any():
        return a
    c = mx * np.minimum(sat, SAFE_SAT_CAP)
    x = c * (1 - abs(((SAFE_HUE / 60) % 2) - 1))
    m = mx - c
    out = rgb.copy()
    out[..., 0] = np.where(hit, c + m, r)
    out[..., 1] = np.where(hit, x + m, g)
    out[..., 2] = np.where(hit, m, b)
    return np.clip(out * 255.0, 0, 255).astype(np.uint8)


def fraction_yellow(a: np.ndarray) -> float:
    rgb = a.astype(np.float32) / 255.0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    safe = np.where(d == 0, 1.0, d)
    hue = np.where(mx == r, ((g - b) / safe % 6) * 60,
                   np.where(mx == g, ((b - r) / safe + 2) * 60, ((r - g) / safe + 4) * 60))
    sat = np.where(mx == 0, 0.0, d / np.where(mx == 0, 1.0, mx))
    return float(((d > 0) & (sat >= 0.35) & (mx >= 0.35) & (hue >= 38) & (hue <= 70)).mean())


# ---------------------------------------------------------------- finding the cards
def seeds_of(path, minf=0.004, maxf=0.14, aspect=(0.55, 2.4)):
    bgr = cv2.imread(path)
    H, W = bgr.shape[:2]
    g = cv2.bilateralFilter(cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY), 7, 60, 60)
    found = []
    for lo, hi in ((20, 60), (30, 90), (40, 120), (60, 160), (80, 200)):
        for close in (5, 9, 13, 17):
            e = cv2.morphologyEx(cv2.Canny(g, lo, hi), cv2.MORPH_CLOSE, np.ones((close, close), np.uint8))
            cnts, _ = cv2.findContours(e, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
            for c in cnts:
                ap = cv2.approxPolyDP(c, 0.02 * cv2.arcLength(c, True), True)
                x, y, w, h = cv2.boundingRect(ap)
                if not (minf * H * W < w * h < maxf * H * W):
                    continue
                if not (aspect[0] < h / max(1, w) < aspect[1]):
                    continue
                if cv2.contourArea(c) < 0.55 * w * h:
                    continue
                found.append([x, y, x + w, y + h])
    if not found:
        return []
    w = np.median([b[2] - b[0] for b in found])
    h = np.median([b[3] - b[1] for b in found])
    cand = [b for b in found if 0.72 * w < b[2] - b[0] < 1.35 * w and 0.72 * h < b[3] - b[1] < 1.35 * h]
    cand.sort(key=lambda b: -(b[2] - b[0]) * (b[3] - b[1]))
    keep = []
    for b in cand:
        if any(max(0, min(b[2], k[2]) - max(b[0], k[0])) * max(0, min(b[3], k[3]) - max(b[1], k[1]))
               > 0.35 * min((b[2] - b[0]) * (b[3] - b[1]), (k[2] - k[0]) * (k[3] - k[1])) for k in keep):
            continue
        keep.append(b)
    return keep


def ground(a):
    q = (a // 24 * 24).reshape(-1, 3)
    vals, counts = np.unique(q, axis=0, return_counts=True)
    return vals[counts.argmax()].astype(np.int16)


def cardness(m, box):
    x0, y0, x1, y1 = box
    return 0.0 if x1 <= x0 or y1 <= y0 else float(m[y0:y1, x0:x1].mean())


def complete_rows(boxes, m, W, H, tol=0.6):
    if not boxes:
        return []
    w = int(np.median([b[2] - b[0] for b in boxes]))
    h = int(np.median([b[3] - b[1] for b in boxes]))
    rows = {}
    for b in boxes:
        cy = (b[1] + b[3]) // 2
        key = min(rows, key=lambda k: abs(k - cy)) if rows else None
        rows.setdefault(key if key is not None and abs(key - cy) < h * tol else cy, []).append(b)
    pitches = []
    for bs in rows.values():
        cs = sorted((b[0] + b[2]) // 2 for b in bs)
        pitches += [x for x in np.diff(cs) if x > w * 0.6]
    pitch = int(np.median(pitches)) if pitches else int(w * 1.25)
    out = []
    for bs in rows.values():
        cy = int(np.median([(b[1] + b[3]) // 2 for b in bs]))
        cs = sorted((b[0] + b[2]) // 2 for b in bs)
        cand = set(cs)
        for i in range(len(cs) - 1):
            gap = cs[i + 1] - cs[i]
            k = int(round(gap / pitch))
            for j in range(1, k):
                cand.add(int(cs[i] + gap * j / k))
        for dd in range(1, 7):
            cand.add(cs[0] - pitch * dd)
            cand.add(cs[-1] + pitch * dd)
        for cx in sorted(cand):
            box = (max(0, cx - w // 2), max(0, cy - h // 2), min(W, cx + w // 2), min(H, cy + h // 2))
            if box[2] - box[0] < w * 0.9 or box[3] - box[1] < h * 0.9:
                continue
            if cardness(m, box) < 0.45:
                continue
            if any(abs(((o[0] + o[2]) // 2) - cx) < w * 0.55 and abs(((o[1] + o[3]) // 2) - cy) < h * 0.55 for o in out):
                continue
            out.append(box)
    return out


def grow(box, m, W, H, limit=0.45, thresh=0.55):
    x0, y0, x1, y1 = box
    for _ in range(int(limit * max(x1 - x0, y1 - y0))):
        moved = False
        if x0 > 0 and m[y0:y1, x0 - 1].mean() > thresh:
            x0 -= 1; moved = True
        if x1 < W and m[y0:y1, x1].mean() > thresh:
            x1 += 1; moved = True
        if y0 > 0 and m[y0 - 1, x0:x1].mean() > thresh:
            y0 -= 1; moved = True
        if y1 < H and m[y1, x0:x1].mean() > thresh:
            y1 += 1; moved = True
        if not moved:
            break
    return (x0, y0, x1, y1)


def refine(box, m, W, H, w, h, slack=0.16):
    """Pin the box to the card's own edges.

    A snapped box has the right size but can sit a few per cent off, and on these sheets a
    few per cent is the player's first name. Cards are separated by the sheet's ground, so
    the card is exactly the connected blob of not-ground that contains the box's centre:
    take that blob's bounding box, inside a window a sixth larger than the card so a
    neighbour cannot be walked into.
    """
    cx, cy = (box[0] + box[2]) // 2, (box[1] + box[3]) // 2
    wx0, wy0 = max(0, cx - int(w * (0.5 + slack))), max(0, cy - int(h * (0.5 + slack)))
    wx1, wy1 = min(W, cx + int(w * (0.5 + slack))), min(H, cy + int(h * (0.5 + slack)))
    win = m[wy0:wy1, wx0:wx1]
    if not win.any():
        return box
    lab, n = ndimage.label(ndimage.binary_closing(win, np.ones((5, 5))))
    tag = lab[min(cy - wy0, lab.shape[0] - 1), min(cx - wx0, lab.shape[1] - 1)]
    if tag == 0:
        return box
    ys, xs = np.where(lab == tag)
    b = (wx0 + int(xs.min()), wy0 + int(ys.min()), wx0 + int(xs.max()) + 1, wy0 + int(ys.max()) + 1)
    if not (0.82 * w < b[2] - b[0] < 1.30 * w and 0.82 * h < b[3] - b[1] < 1.30 * h):
        return box
    return b


def snap_rows(boxes, m, W, H, extra, edge=0.010):
    if not boxes:
        return []
    w = int(np.median([b[2] - b[0] for b in boxes]))
    h = int(np.median([b[3] - b[1] for b in boxes]))
    el, et, er, eb = (int(extra[0] * w), int(extra[1] * h), int(extra[2] * w), int(extra[3] * h))
    rows = []
    for b in sorted(boxes, key=lambda b: b[1]):
        cy = (b[1] + b[3]) // 2
        for r in rows:
            if abs(np.median([(x[1] + x[3]) // 2 for x in r]) - cy) < h * 0.6:
                r.append(b)
                break
        else:
            rows.append([b])
    out = []
    for row in rows:
        row.sort(key=lambda b: b[0])
        y0 = int(np.median([b[1] for b in row]))
        cxs = [(b[0] + b[2]) // 2 for b in row]
        d = [b - a for a, b in zip(cxs, cxs[1:])]
        pitch = int(np.median([x for x in d if x > w * 0.6])) if any(x > w * 0.6 for x in d) else int(w * 1.2)
        # A detected centre is measured; an extrapolated one accumulates the error in the
        # pitch. So every detection keeps its own x, and arithmetic is used only to fill a
        # gap wide enough to be a missing card, or to probe one position past each end.
        wanted = list(cxs)
        for a_, b_ in zip(cxs, cxs[1:]):
            k = int(round((b_ - a_) / pitch))
            for j in range(1, k):
                wanted.append(int(a_ + (b_ - a_) * j / k))
        wanted += [cxs[0] - pitch, cxs[-1] + pitch]
        for cx in sorted(set(wanted)):
            box = (cx - w // 2, y0, cx - w // 2 + w, y0 + h)
            if min(box[0], box[1]) < edge * min(W, H) or box[2] > W - edge * W or box[3] > H - edge * H:
                continue
            if cardness(m, box) < 0.62:
                continue
            if any(abs(((o[0] + o[2]) // 2) - ((box[0] + box[2]) // 2)) < w * 0.6
                   and abs(((o[1] + o[3]) // 2) - ((box[1] + box[3]) // 2)) < h * 0.6 for o in out):
                continue
            tight = refine(box, m, W, H, w, h)
            out.append((tight[0] - el, tight[1] - et, tight[2] + er, tight[3] + eb))
    out.sort(key=lambda b: (b[1] // max(30, h // 2), b[0]))
    return out


# ---------------------------------------------------------------- writing
def save(img: Image.Image, name: str) -> tuple:
    if max(img.size) > MAXPX:
        s = MAXPX / max(img.size)
        img = img.resize((round(img.size[0] * s), round(img.size[1] * s)), Image.LANCZOS)
    a = np.asarray(img.convert('RGB'))
    before = fraction_yellow(a)
    path = os.path.join(OUT, f'{name}.jpg')
    clean = deyellow(a)
    Image.fromarray(clean).save(path, 'JPEG', quality=90, subsampling=0, optimize=True, progressive=True)
    after = fraction_yellow(np.asarray(Image.open(path).convert('RGB')))
    for attempt in range(4):
        if after == 0:
            break
        band = None if attempt < 1 else (WIDE_HUE, WIDE_SAT, WIDE_VAL)
        again = deyellow(np.asarray(Image.open(path).convert('RGB')), band)
        Image.fromarray(again).save(path, 'JPEG', quality=93, subsampling=0, optimize=True, progressive=True)
        after = fraction_yellow(np.asarray(Image.open(path).convert('RGB')))
    if after > 0:
        # the encoder will not let this one go. A lossless file is measured once and
        # stays that way, which is what the rule actually asks for.
        png = os.path.join(OUT, f'{name}.png')
        Image.fromarray(deyellow(np.asarray(Image.open(path).convert('RGB')), (WIDE_HUE, WIDE_SAT, WIDE_VAL))).save(png, 'PNG', optimize=True)
        after = fraction_yellow(np.asarray(Image.open(png).convert('RGB')))
        os.remove(path)
        path = png
    return before, after, os.path.getsize(path) // 1024


def contact(crops, tag):
    os.makedirs(CONTACT, exist_ok=True)
    cell, cols = (300, 420), 6
    rows = max(1, (len(crops) + cols - 1) // cols)
    sheet = Image.new('RGB', (cols * cell[0], rows * cell[1]), (24, 24, 24))
    d = ImageDraw.Draw(sheet)
    for i, (name, c) in enumerate(crops):
        t = c.copy()
        t.thumbnail((cell[0] - 14, cell[1] - 40))
        sheet.paste(t, ((i % cols) * cell[0] + (cell[0] - t.size[0]) // 2, (i // cols) * cell[1] + 32))
        d.text(((i % cols) * cell[0] + 8, (i // cols) * cell[1] + 8), f'{i:02d} {name}', fill=(255, 220, 0))
    sheet.save(os.path.join(CONTACT, f'_contact-{tag}.jpg'), quality=86)


def main():
    bad, total = [], 0
    for filename, prefix, drop, extra, thr in SHEETS:
        path = os.path.join(SRC, filename)
        if not os.path.exists(path):
            print(f'{prefix}: source missing — archive left alone')
            continue
        a = cv2.cvtColor(cv2.imread(path), cv2.COLOR_BGR2RGB)
        H, W, _ = a.shape
        m = np.abs(a.astype(np.int16) - ground(a)).sum(-1) > thr
        grown = [grow(b, m, W, H) for b in complete_rows(seeds_of(path), m, W, H)]
        w = int(np.median([b[2] - b[0] for b in grown]))
        h = int(np.median([b[3] - b[1] for b in grown]))
        kept = [b for b in grown if abs((b[2] - b[0]) - w) < 0.22 * w and abs((b[3] - b[1]) - h) < 0.22 * h]
        boxes = snap_rows(kept or grown, m, W, H, extra)
        im = Image.fromarray(a)
        crops = []
        for i, box in enumerate(boxes):
            if i in drop:
                continue
            name = f'{prefix}-{i:02d}'
            card = im.crop(box)
            before, after, kb = save(card, name)
            crops.append((name, card))
            total += 1
            if after > 0:
                bad.append(name)
        contact(crops, prefix)
        print(f'{prefix}: {len(crops)} cards from {filename}')
    for filename, name, box in SINGLES:
        path = os.path.join(SRC, filename)
        if not os.path.exists(path):
            print(f'{name}: source missing — archive left alone')
            continue
        im = Image.open(path).convert('RGB')
        w, h = im.size
        card = im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)))
        before, after, kb = save(card, name)
        total += 1
        print(f'{name}: {card.size[0]}×{card.size[1]}  yellow {before * 100:5.2f}% -> {after * 100:5.2f}%  ({kb} KB)')
        if after > 0:
            bad.append(name)
    if bad:
        raise SystemExit('STILL YELLOW: ' + ', '.join(bad))
    print(f'{total} cards cut, treated and clean')


if __name__ == '__main__':
    main()
