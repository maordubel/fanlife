"""Look at the Vox film without a narrator: a script and a ledger → stills (and short silent clips) of chosen beats,
timed by a stand-in voice. For review only.

    python3 -m studio.vox.stills --club aek-athens --season 2002/03 --script s.json --out /tmp/vox --shots 0-4 --at 0.1,0.5,0.9
    python3 -m studio.vox.stills ... --clip 2-4 --out /tmp/vox           # those beats as one MP4, glides included
"""
from __future__ import annotations

import argparse
import json
import subprocess
import time
from pathlib import Path

from ..common import FPS, H, W, Palette, read_json, write_json


def film_for(job: Path, ledger: dict, script: dict, pal: Palette, director: str | None = None):
    from ..cinema.stills import editor_for
    from .render import VoxFilm
    if director:
        script = {**script, 'director': director}
    ed = editor_for(job, ledger, script, pal)
    plan = ed.plan()
    write_json(job / 'plan.json', plan)
    return ed, plan, VoxFilm(ed, plan, job)


def main() -> int:
    from PIL import Image
    from ..research import build_ledger
    ap = argparse.ArgumentParser()
    ap.add_argument('--club', required=True)
    ap.add_argument('--season', required=True)
    ap.add_argument('--script', type=Path, required=True)
    ap.add_argument('--palette', default='{}')
    ap.add_argument('--director', default=None)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--shots', default='')
    ap.add_argument('--at', default='0.1,0.5,0.9')
    ap.add_argument('--clip', default='')
    ap.add_argument('--scale', type=float, default=0.5)
    a = ap.parse_args()
    pal = Palette.from_json({'club_id': a.club, 'club_name': a.club, 'primary': '#B02D10', 'bans': [], **json.loads(a.palette)})
    ledger = build_ledger(a.club, a.season)
    a.out.mkdir(parents=True, exist_ok=True)
    ed, plan, film = film_for(a.out / 'job', ledger, read_json(a.script), pal, a.director)
    shots = plan['shots']
    if a.clip:
        lo, _, hi = a.clip.partition('-')
        idx = list(range(int(lo), int(hi or lo) + 1))
        out = a.out / f'clip-{idx[0]:02d}-{idx[-1]:02d}.mp4'
        p = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                              '-vf', f'scale={int(W * a.scale)}:-2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', str(out)],
                             stdin=subprocess.PIPE)
        t0, nf = time.time(), 0
        for i in idx:
            s = shots[i]
            if film.where(s['n'])['engine'] != 'vox':
                continue
            cache = film.dressing(s['n'])
            for fi in range(s['frames']):
                p.stdin.write(film.frame(s['n'], fi, cache).tobytes())
                nf += 1
        p.stdin.close()
        p.wait()
        print(out, f'{nf} frames, {(time.time() - t0) / max(1, nf) * 1000:.0f} ms a frame')
        return 0
    if a.shots:
        lo, _, hi = a.shots.partition('-')
        idx = list(range(int(lo), int(hi or lo) + 1))
    else:
        idx = list(range(len(shots)))
    for i in idx:
        s = shots[i]
        if film.where(s['n'])['engine'] != 'vox':
            continue
        dur = s['frames'] / FPS
        cache = film.dressing(s['n'])
        for frac in [float(x) for x in a.at.split(',')]:
            t = frac * dur if frac <= 1 else frac
            fi = min(s['frames'] - 1, int(t * FPS))
            t0 = time.time()
            im = Image.fromarray(film.frame(s['n'], fi, cache))
            ms = (time.time() - t0) * 1000
            if a.scale != 1:
                im = im.resize((int(W * a.scale), int(H * a.scale)), Image.LANCZOS)
            p = a.out / f"s{i:02d}-{s['visual']['type']}-{t:.1f}.jpg"
            im.save(p, quality=86)
            print(p, f'{ms:.0f} ms')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
