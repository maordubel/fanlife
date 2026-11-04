"""Render a comic scene (scenes/<name>.js, using lib.js) to a silent 1920×1080 24 fps MP4.

    python3 scripts/football-stories/comic/animate.py <scene> <out.mp4> [--from S --to S] [--stills t1,t2,...]

Frames are drawn deterministically (frame(t) is called with a set time) and piped straight into ffmpeg.
"""
from __future__ import annotations

import argparse
import base64
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
FONTS = HERE.parents[2] / 'public' / 'fonts'
FPS = 24
FACES = {'Shout': 'knewave-latin-400-normal.woff2', 'Mast': 'shrikhand-latin-400-normal.woff2', 'Head': 'weekly-head-latin.woff2',
         'Caps': 'weekly-caps-latin.woff2', 'Body': 'weekly-body-latin.woff2', 'Num': 'ultra-latin-400-normal.woff2'}


def page(scene: str) -> str:
    faces = ''.join(f"@font-face{{font-family:'{k}';src:url('file://{FONTS / v}')}}" for k, v in FACES.items())
    warm = ''.join(f'<span style="font-family:{k}">.</span>' for k in FACES)
    return (f'<!doctype html><meta charset=utf-8><style>{faces}html,body{{margin:0;background:#000}}canvas{{display:block}}</style>'
            f'<div style="position:absolute;opacity:0">{warm}</div><canvas id=c width=1920 height=1080></canvas>'
            f'<script>{(HERE / "lib.js").read_text()}\n{(HERE / "scenes" / (scene + ".js")).read_text()}</script>')


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('scene'); ap.add_argument('out', type=Path)
    ap.add_argument('--from', dest='t0', type=float, default=0); ap.add_argument('--to', dest='t1', type=float)
    ap.add_argument('--stills', default='')
    a = ap.parse_args()
    html = a.out.with_suffix('.html'); html.write_text(page(a.scene), encoding='utf-8')
    with sync_playwright() as pw:
        b = pw.chromium.launch(); p = b.new_page(viewport={'width': 1920, 'height': 1080})
        p.goto(html.as_uri()); p.evaluate('document.fonts.ready'); p.wait_for_timeout(300)
        p.evaluate("Promise.all(['Shout','Mast','Head','Caps','Body','Num'].map(f=>document.fonts.load('40px '+f)))")
        T = p.evaluate('T'); t1 = a.t1 if a.t1 is not None else T
        grab = lambda t: base64.b64decode(p.evaluate(f"(frame({t}), c.toDataURL('image/jpeg', .9))").split(',', 1)[1])
        if a.stills:
            for t in a.stills.split(','):
                a.out.with_name(f'{a.out.stem}-{float(t):05.2f}.jpg').write_bytes(grab(float(t)))
        else:
            ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'image2pipe', '-framerate', str(FPS), '-i', '-',
                                   '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(a.out)], stdin=subprocess.PIPE)
            n0, n1 = round(a.t0 * FPS), round(t1 * FPS)
            for i in range(n0, n1):
                ff.stdin.write(grab(i / FPS))
            ff.stdin.close(); ff.wait()
        b.close()
    html.unlink()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
