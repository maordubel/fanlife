#!/usr/bin/env python3
"""
מעברונים — transitions cut from Meir Mendelssohn's Tel Aviv, 1989.

    WORKER_FILM=<the mp4> python3 scripts/life/cut-film-1989.py

Maor found the promenade in it at minute sixteen and said what it was: the road between
Bloomfield and Ussishkin, which is the journey this game has been describing in words.
So the transitions are not drawn, they are the city itself, four seconds at a time.

Each clip is cropped from 4:3 to 16:9 (the band a phone can show without bars), scaled to
640×360, graded the way every backdrop in this project is graded — pulled cooler, contrast
eased, the gold of a 1989 sunset taken off the rival's hue and left copper — and faded up
and down so it can be laid between two rooms without a cut that reads as a glitch.

The audio is dropped on purpose. These sit under the game's own ambience: a 240p camera
microphone from 1989 under a crowd bed is noise, and the sea is already in the park loop.
"""
import json
import os
import subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OUT = os.path.join(ROOT, 'public/life/film')
SRC = os.environ.get(
    'WORKER_FILM',
    '/mnt/user-data/uploads/תל אביב 1989 Tel-Aviv Meir Mendelssohn מאיר מנדלסון - Meir Mendelssohn (240p, h264).mp4',
)

# id → (start seconds, seconds, what it is, where it belongs)
CLIPS = [
    ('promenade-dusk', 957, 5.0, 'הטיילת מול הים, בין מנחת לחוף',
     'הנסיעה דרומה→צפונה: בלומפילד → אוסישקין'),
    ('promenade-walk', 1018, 5.0, 'אנשים על הטיילת, אור אחרון',
     'מעבר בין הרחוב לתחנה — כל נסיעה בתוך העיר'),
    ('sea-wall', 1049, 4.5, 'גבר הולך על שובר הגלים, גל נשבר',
     'לפני ערב גדול: הליכה אל משהו'),
    ('palms-evening', 1078, 4.5, 'דקלים וכיסאות על הטיילת, ערב',
     'סוף פרק שנגמר טוב'),
    # …and six more from the rest of the reel, because a transition that repeats is a
    # transition you stop seeing (5.9.2026, at Maor's ask).
    ('street-morning', 121, 4.5, 'רחוב בבוקר, תריסים ומרפסות',
     'יציאה מהבית — כל בוקר בשלב א׳'),
    ('market', 268, 4.5, 'דוכנים, ארגזים, אנשים קונים',
     'הדרך לקיוסק, ולכל שליחות'),
    ('plaza-evening', 611, 4.0, 'כיכר מוארת בערב, אנשים עוברים',
     'מעבר בין שנים — אותה עיר, ארבע שנים אחר כך'),
    ('alley-shade', 733, 4.0, 'סמטה צרה, כביסה, צל',
     'הסמטה והמגרש'),
    ('night-lights', 1301, 4.5, 'ערב, אורות, אנשים ברחוב',
     'ערב משחק — היציאה מהבית אל האור'),
]

# cooler, flatter, and off the yellow band — the same grade the paintings get
GRADE = (
    'crop=in_w:in_w*9/16,scale=640:360:flags=lanczos,'
    'eq=saturation=0.86:contrast=1.04:brightness=-0.015,'
    'colorbalance=rs=-0.04:gs=-0.02:bs=0.06:rm=-0.03:bm=0.05,'
    'noise=alls=6:allf=t'
)


def main():
    if not os.path.exists(SRC):
        raise SystemExit(f'no film at {SRC}')
    os.makedirs(OUT, exist_ok=True)
    rows = {}
    for name, start, length, whatHe, whereHe in CLIPS:
        path = os.path.join(OUT, f'{name}.mp4')
        fade = f'fade=t=in:st=0:d=0.5,fade=t=out:st={length - 0.6:.2f}:d=0.6'
        subprocess.run(
            ['ffmpeg', '-v', 'error', '-ss', str(start), '-t', str(length), '-i', SRC,
             '-vf', f'{GRADE},{fade}', '-an', '-c:v', 'libx264', '-profile:v', 'baseline',
             '-pix_fmt', 'yuv420p', '-crf', '30', '-movflags', '+faststart', path, '-y'],
            check=True,
        )
        kb = os.path.getsize(path) / 1024
        rows[name] = {'seconds': length, 'bytes': os.path.getsize(path), 'whatHe': whatHe, 'whereHe': whereHe,
                      'source': 'Meir Mendelssohn, Tel Aviv 1989'}
        print(f'  {name:16s} {length:.1f}s  {kb:6.0f}KB  {whatHe}')
        # a still, for a manifest a person can look at
        subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(start + length / 2), '-i', SRC, '-frames:v', '1',
                        '-vf', GRADE, os.path.join(OUT, f'{name}.jpg'), '-y'], check=True)
    json.dump(rows, open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(f'{len(CLIPS)} transitions in public/life/film')


if __name__ == '__main__':
    main()
