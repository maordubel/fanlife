"""Look at the cinema without a narrator: a script and a ledger → stills (and, if asked, a short silent clip) of chosen
shots, timed by a stand-in voice (2.7 words a second). For review only; the film pipeline is studio.pipeline.

    python3 -m studio.cinema.stills --club aek-athens --season 2002/03 --script s.json --out /tmp/stills --shots 0-4 --at 0.2,0.5,0.85
    python3 -m studio.cinema.stills ... --clip 3 --out /tmp/stills        # one shot as an MP4, with its transition in
"""
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

from ..common import FPS, H, W, Palette, hex_rgb, read_json, write_json


def stand_in_voice(script: dict, wps: float = 2.7) -> dict:
    beats = []
    for ci, ch in enumerate(script['chapters']):
        for bi, b in enumerate(ch['beats']):
            words, t = [], 0.0
            for w in (b.get('narration') or '').split():
                d = 0.16 + 0.055 * len(w)
                words.append({'w': w, 'start': round(t, 3), 'end': round(t + d, 3)})
                t += d + 0.07
            beats.append({'chapter': ci, 'beat': bi, 'file': None, 'duration': round(max(t, 1.0), 3), 'words': words})
    return {'beats': beats}


def editor_for(job: Path, ledger: dict, script: dict, pal: Palette):
    from ..edit import Editor
    job.mkdir(parents=True, exist_ok=True)
    voice = stand_in_voice(script)
    write_json(job / 'ledger.json', ledger)
    write_json(job / 'script.json', script)
    write_json(job / 'voice.json', voice)
    return Editor(job, ledger, script, voice, pal, job / 'art')


def frame_of(ed, sp, plan: dict, i: int, t: float):
    from ..motion import ShotRenderer, blend_entry
    s = plan['shots'][i]
    shot = ed.build(sp, s)
    fi = min(shot.frames - 1, int(t * FPS))
    prev = None
    if i > 0 and fi / FPS < 0.8:
        ps = ed.build(sp, plan['shots'][i - 1])
        prev = ShotRenderer(ps).frame(ps.frames - 1)
    fr = ShotRenderer(shot).frame(fi, round(s['start'] * FPS) + fi)
    return blend_entry(shot, fi, fr, prev, hex_rgb(ed.pal.accent))


def clip(ed, sp, plan: dict, i: int, out: Path) -> Path:
    from ..motion import ShotRenderer, blend_entry
    s = plan['shots'][i]
    shot = ed.build(sp, s)
    prev = None
    if i > 0:
        ps = ed.build(sp, plan['shots'][i - 1])
        prev = ShotRenderer(ps).frame(ps.frames - 1)
    r = ShotRenderer(shot)
    p = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', str(out)], stdin=subprocess.PIPE)
    g0 = round(s['start'] * FPS)
    for fi in range(shot.frames):
        p.stdin.write(blend_entry(shot, fi, r.frame(fi, g0 + fi), prev, hex_rgb(ed.pal.accent)).tobytes())
    p.stdin.close()
    p.wait()
    return out


def main() -> int:
    from PIL import Image
    from ..research import build_ledger
    from ..sprites import SpriteFactory
    ap = argparse.ArgumentParser()
    ap.add_argument('--club', required=True)
    ap.add_argument('--season', required=True)
    ap.add_argument('--script', type=Path, required=True)
    ap.add_argument('--palette', default='{}', help='Palette JSON')
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--shots', default='')
    ap.add_argument('--at', default='0.3,0.75')
    ap.add_argument('--clip', type=int, default=None)
    ap.add_argument('--scale', type=float, default=0.5)
    a = ap.parse_args()
    pal = Palette.from_json({'club_id': a.club, 'club_name': a.club, 'primary': '#B02D10', 'bans': [], **json.loads(a.palette)})
    ledger = build_ledger(a.club, a.season)
    script = read_json(a.script)
    a.out.mkdir(parents=True, exist_ok=True)
    ed = editor_for(a.out / 'job', ledger, script, pal)
    plan = ed.plan()
    write_json(a.out / 'plan.json', plan)
    with SpriteFactory(pal, ed.sprites_dir) as sp:
        if a.clip is not None:
            print(clip(ed, sp, plan, a.clip, a.out / f'clip-{a.clip:02d}.mp4'))
            return 0
        if a.shots:
            lo, _, hi = a.shots.partition('-')
            idx = list(range(int(lo), int(hi or lo) + 1))
        else:
            idx = list(range(len(plan['shots'])))
        for i in idx:
            dur = plan['shots'][i]['frames'] / FPS
            for frac in [float(x) for x in a.at.split(',')]:
                t = frac * dur if frac <= 1 else frac
                im = Image.fromarray(frame_of(ed, sp, plan, i, t))
                if a.scale != 1:
                    im = im.resize((int(W * a.scale), int(H * a.scale)), Image.LANCZOS)
                p = a.out / f"s{i:02d}-{plan['shots'][i]['visual']['type']}-{t:.1f}.jpg"
                im.save(p, quality=86)
                print(p)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
