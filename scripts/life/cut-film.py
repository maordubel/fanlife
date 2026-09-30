#!/usr/bin/env python3
"""
מעברונים — the city between one room and the next, cut from film that exists.

    python3 scripts/life/cut-film.py            (all sources it can find)
    python3 scripts/life/cut-film.py 1995       (one source)

This replaces `cut-film-1989.py`, which cut nine clips from one reel. Maor sent two more
films on 7.9.2026 and asked for order across the whole set — *"לעשות סדר בכל המעברונים,
לעשות מגוון יפה ומעניין. נכון ומדוייק… להעביר אווירה אותנטית ונעימה, מעניינת ונוסטלגית"* —
and the honest way to do that is not more clips from the same afternoon. It is to make the
transitions know what YEAR the life is in.

So the library is keyed by decade:

  · **1989** — Meir Mendelssohn's Tel Aviv, 240p. Every chapter in the eighties.
  · **1995** — a home video shot on 5.4.1995, 480p, the camcorder's own date burned into
    the corner. Every chapter in the nineties. The date stamp stays: it is the provenance,
    printed on the picture by the camera that took it, and it is the most nostalgic thing
    in the frame.
  · **הטיילת היום** — the Frishman promenade at 720p. NOT USED, and the reason is in
    `FILM_NOW` below: it is contemporary footage, and this game runs to 2000.

Three rules the pipeline enforces rather than trusts:

 1. **חוק הצהוב.** Rule 8 has no exemption for film. Nine clips have been shipping with a
    yellow billboard and a yellow awning in them since 5.9.2026. Every frame now goes
    through the SAME transform the paintings and the sticker scans go through — a yellow
    hue rotated onto the badge's warm brown at its own saturation and value — done in
    numpy per frame rather than with ffmpeg's `selectivecolor`, which turned a whole
    concrete building pink because its "yellows" range is nothing like a hue band.
 2. **הדירוג לפי המקור.** 1989 is 240p and is upscaled; it gets grain and a soft grade so
    it reads as film rather than as a low-resolution video. 1995 is 480p and native at
    16:9 after the crop; it gets almost nothing.
 3. **נמדד, לא מובטח.** Every finished clip is decoded again and measured, and the number
    is written into the manifest as `yellowLeft` — the same field the art manifest carries.
    A still image reaches exactly zero and is held to exactly zero. A VIDEO cannot: the
    browser-safe profile is 4:2:0, chroma is stored at half resolution, and the decoder
    interpolates it — so a leaf at 90° next to a treated sign at 26° produces, on the
    boundary pixel between them, an average that lands in the band nothing in the source
    occupies. Green foliage at 90° beside a treated sign at 26° averages, on the pixel
    between them, to about 58° — and moving the green as well only moves the average.
    Exactly zero is unreachable for a 4:2:0 video that contains both colours, so what is
    enforced is a stated CEILING of five hundredths of one per cent — roughly one pixel in
    two thousand, every one of them on an edge, none of them a shape — and the measured
    number for every clip is written into the manifest where a person can read it rather
    than being rounded away in a build log.
"""
import json
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OUT = os.path.join(ROOT, 'public/life/film')

UPLOADS = '/mnt/user-data/uploads'

# ---------------------------------------------------------------------------------
# המקורות
# ---------------------------------------------------------------------------------
FILM_1989 = os.environ.get(
    'WORKER_FILM_1989',
    os.path.join(UPLOADS, 'תל אביב 1989 Tel-Aviv Meir Mendelssohn מאיר מנדלסון - Meir Mendelssohn (240p, h264).mp4'),
)
FILM_1995 = os.environ.get(
    'WORKER_FILM_1995',
    os.path.join(UPLOADS, 'YTDown.com_YouTube_Old-Tel-Aviv-1995_Media_-F-8a6vQsUI_001_480p.mp4'),
)

# The promenade film Maor sent at 720p is the best-looking of the three and is not cut
# here. Its bicycles, its buildings and the people in it are of the 2010s, and this game
# ends in 2000: putting it between two rooms in 1986 would be the one thing this project
# does not do, which is print something that is not true. It is registered so the next
# person does not have to work out why it is missing, and it is ready the day a chapter
# is set in a year it belongs to.
FILM_NOW = os.environ.get('WORKER_FILM_NOW', '')

# id → (start seconds, seconds, what it is, where it belongs)
CLIPS_1989 = [
    ('promenade-dusk', 957, 5.0, 'הטיילת מול הים, בין מנחת לחוף', 'הנסיעה דרומה→צפונה: בלומפילד → אוסישקין'),
    ('promenade-walk', 1018, 5.0, 'אנשים על הטיילת, אור אחרון', 'מעבר בין הרחוב לתחנה'),
    ('sea-wall', 1049, 4.5, 'גבר הולך על שובר הגלים, גל נשבר', 'לפני ערב גדול: הליכה אל משהו'),
    ('palms-evening', 1078, 4.5, 'דקלים וכיסאות על הטיילת, ערב', 'סוף פרק שנגמר טוב'),
    ('street-morning', 121, 4.5, 'רחוב בבוקר, תריסים ומרפסות', 'יציאה מהבית'),
    ('market', 268, 4.5, 'דוכנים, ארגזים, אנשים קונים', 'הדרך לקיוסק, ולכל שליחות'),
    ('plaza-evening', 611, 4.0, 'כיכר מוארת בערב, אנשים עוברים', 'מעבר בין שנים'),
    ('alley-shade', 733, 4.0, 'סמטה צרה, כביסה, צל', 'הסמטה והמגרש'),
    ('night-lights', 1301, 4.5, 'ערב, אורות, אנשים ברחוב', 'ערב משחק — היציאה מהבית אל האור'),
]

# 5.4.1995, 14:32–15:33 by the camera's own clock. Read off a contact sheet of the whole
# reel and then checked frame by frame: nothing here is a pan across a cut, and nothing
# here has a face large enough in frame to be a person rather than a passer-by.
CLIPS_1995 = [
    ('sea-road-95', 3, 4.5, 'הכביש מול הים, מכוניות חונות', 'העיר, בדרך החוצה'),
    ('promenade-95', 91, 5.0, 'הטיילת והקו של העיר מאחור', 'הנסיעה דרומה→צפונה'),
    ('promenade-rail-95', 113, 4.5, 'מעקה הטיילת, הרחוב ממול', 'לתוך העיר'),
    ('boardwalk-95', 177, 4.5, 'אנשים הולכים על הטיילת', 'הדרך חזרה'),
    ('jaffa-95', 199, 5.0, 'החוף, ויפו באופק', 'סוף פרק'),
    ('breakwater-95', 245, 4.5, 'הים מעבר למעקה, שובר הגלים', 'לפני ערב גדול'),
    ('street-cars-95', 311, 4.5, 'רחוב מגורים, מכוניות חונות', 'יציאה מהבית'),
    ('shops-95', 397, 4.0, 'חזית בניין ישן, חנות ברחוב', 'הדרך לקיוסק'),
    ('bus-street-95', 443, 4.5, 'רחוב עם עצים, אוטובוס, שלט', 'העיר, בדרך לתחנה'),
]

SOURCES = {
    '1989': {
        'file': FILM_1989,
        'era': '80s',
        'clips': CLIPS_1989,
        'credit': 'Meir Mendelssohn, Tel Aviv 1989',
        # 240p upscaled: grain and a soft cool grade, so it reads as film and not as a
        # low-resolution video somebody forgot to replace
        'grade': (
            'crop=in_w:in_w*9/16,scale=640:360:flags=lanczos,'
            'eq=saturation=0.86:contrast=1.04:brightness=-0.015,'
            'colorbalance=rs=-0.04:gs=-0.02:bs=0.06:rm=-0.03:bm=0.05,'
            'noise=alls=6:allf=t'
        ),
    },
    '1995': {
        'file': FILM_1995,
        'era': '90s',
        'clips': CLIPS_1995,
        'credit': 'תל אביב, 5.4.1995 — וידאו ביתי',
        # 480p, native 16:9 after the crop. Almost nothing: a touch off the saturation so
        # it sits with the eighties reel, and grain at a third of the strength.
        'grade': (
            'crop=in_w:in_w*9/16,scale=640:360:flags=lanczos,'
            'eq=saturation=0.92:contrast=1.02,'
            'colorbalance=rs=-0.02:bs=0.03,'
            'noise=alls=2:allf=t'
        ),
    },
}

W, H = 640, 360
FPS = 24

# the scanner's band with margin, and where a yellow goes — the same numbers as
# `scripts/life/build-stickers.py`, and for the same reason
HUE = (33.0, 78.0)
SAT_MIN, VAL_MIN = 0.22, 0.26
SAFE_HUE = 26.0
SAFE_SAT_CAP = 0.86

# what a 4:2:0 decode is allowed to put back on an edge, as a fraction of all pixels
CEILING = 0.0005


def deyellow(frames: np.ndarray) -> np.ndarray:
    """Rotate every pixel in the yellow band onto the badge's brown. Vectorised over a
    whole clip: a hundred frames of 640×360 is 23 million pixels and a Python loop is
    twenty minutes of it."""
    rgb = frames.astype(np.float32) / 255.0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(axis=-1)
    mn = rgb.min(axis=-1)
    d = mx - mn
    safe = np.where(d == 0, 1.0, d)
    hue = np.where(
        mx == r,
        ((g - b) / safe % 6) * 60,
        np.where(mx == g, ((b - r) / safe + 2) * 60, ((r - g) / safe + 4) * 60),
    )
    sat = np.where(mx == 0, 0.0, d / np.where(mx == 0, 1.0, mx))
    hit = (d > 0) & (sat >= SAT_MIN) & (mx >= VAL_MIN) & (hue >= HUE[0]) & (hue <= HUE[1])
    if not hit.any():
        return frames
    s2 = np.minimum(sat, SAFE_SAT_CAP)
    c = mx * s2
    x = c * (1 - abs(((SAFE_HUE / 60) % 2) - 1))
    m = mx - c
    out = rgb.copy()
    out[..., 0] = np.where(hit, c + m, r)
    out[..., 1] = np.where(hit, x + m, g)
    out[..., 2] = np.where(hit, m, b)
    return np.clip(out * 255.0, 0, 255).astype(np.uint8)


def fraction_yellow(frames: np.ndarray) -> float:
    rgb = frames.astype(np.float32) / 255.0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(axis=-1), rgb.min(axis=-1)
    d = mx - mn
    safe = np.where(d == 0, 1.0, d)
    hue = np.where(
        mx == r,
        ((g - b) / safe % 6) * 60,
        np.where(mx == g, ((b - r) / safe + 2) * 60, ((r - g) / safe + 4) * 60),
    )
    sat = np.where(mx == 0, 0.0, d / np.where(mx == 0, 1.0, mx))
    hit = (d > 0) & (sat >= 0.35) & (mx >= 0.35) & (hue >= 38) & (hue <= 70)
    return float(hit.mean())


def read_frames(src, start, length, grade):
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-ss', str(start), '-t', str(length), '-i', src,
         '-vf', f'{grade},fps={FPS}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
        check=True, capture_output=True,
    ).stdout
    n = len(raw) // (W * H * 3)
    return np.frombuffer(raw, np.uint8)[: n * W * H * 3].reshape(n, H, W, 3)


def write_clip(frames, path, length):
    fade = f'fade=t=in:st=0:d=0.5,fade=t=out:st={length - 0.6:.2f}:d=0.6'
    proc = subprocess.Popen(
        ['ffmpeg', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
         '-r', str(FPS), '-i', '-', '-vf', fade, '-an', '-c:v', 'libx264',
         '-profile:v', 'baseline', '-pix_fmt', 'yuv420p', '-crf', '28',
         '-movflags', '+faststart', path, '-y'],
        stdin=subprocess.PIPE,
    )
    proc.communicate(frames.tobytes())
    if proc.returncode != 0:
        raise SystemExit(f'ffmpeg failed writing {path}')


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    os.makedirs(OUT, exist_ok=True)
    manifest_path = os.path.join(OUT, 'manifest.json')
    rows = {}
    if os.path.exists(manifest_path):
        rows = json.load(open(manifest_path, encoding='utf8'))
    bad = []
    for key, spec in SOURCES.items():
        if only and key != only:
            continue
        if not os.path.exists(spec['file']):
            print(f'{key}: source not staged, leaving its clips alone ({spec["file"]})')
            continue
        print(f'== {key} — {spec["credit"]}')
        for name, start, length, what, where in spec['clips']:
            frames = read_frames(spec['file'], start, length, spec['grade'])
            before = fraction_yellow(frames)
            frames = deyellow(frames)
            path = os.path.join(OUT, f'{name}.mp4')
            write_clip(frames, path, length)
            # measure what SHIPPED, not what was in memory
            check = read_frames(path, 0, length, f'scale={W}:{H}')
            after = fraction_yellow(check)
            kb = os.path.getsize(path) / 1024
            print(f'  {name:20s} {length:.1f}s {kb:6.0f}KB  yellow {before * 100:5.2f}% -> {after * 100:5.3f}%  {what}')
            if after > CEILING:
                bad.append(f'{name} ({after * 100:.3f}%)')
            # a still for the manifest, and the poster the player sees before the first frame
            mid = frames[len(frames) // 2]
            from PIL import Image

            Image.fromarray(mid).save(os.path.join(OUT, f'{name}.jpg'), quality=82)
            rows[name] = {
                'seconds': length,
                'bytes': os.path.getsize(path),
                'era': spec['era'],
                'whatHe': what,
                'whereHe': where,
                'source': spec['credit'],
                'yellowLeft': round(after, 6),
            }
    json.dump(rows, open(manifest_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    if bad:
        raise SystemExit('STILL YELLOW: ' + ', '.join(bad))
    print(f'{len(rows)} transitions in public/life/film')


if __name__ == '__main__':
    main()
