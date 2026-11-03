"""Vertical Shorts cut from a finished film: whole beats only, 60 seconds at most, and every one sends the viewer to the full
film and the channel.

    python3 -m studio.shorts --job <job dir> --shots 34-38 --hook "Eighty thousand. One city." --kicker "Celtic · 2003" --out a.mp4

The picture is the film's own 16:9 frame (burned captions included), set in a 9:16 page: the hook in The Weekly's type
above, the same shot blurred and darkened behind, and the call to the full film below. The cut starts and ends on beat
boundaries from plan.json, so the narrator never starts mid-word.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw

from .captions import _face as face  # the Weekly faces, unpacked once
from .common import ROOT, StageError, hex_rgb, read_json

W, H = 1080, 1920
FRAME_Y = 660            # the 16:9 picture: 1080×608 from here
MAX_SECONDS = 59.0
HANDLE = '@FanLifeFootballStories'


def _font(size: int):
    f, _ = face('weekly-head-latin.woff2', size)
    return f


def overlay(hook: str, kicker: str, accent: str, out: Path) -> Path:
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    ink, paper, acc = (21, 19, 15, 255), (244, 238, 223, 255), (*hex_rgb(accent), 255)
    # top: the hook, printed twice (ink under, paper over), on a dark band
    d.rectangle((0, 0, W, FRAME_Y - 24), fill=(21, 19, 15, 205))
    size = 104
    lines = textwrap.wrap(hook.upper(), 16)
    while len(lines) > 4 and size > 70:
        size -= 8
        lines = textwrap.wrap(hook.upper(), int(16 * 104 / size))
    f = _font(size)
    y = 120
    for ln in lines[:4]:
        d.text((66, y + 7), ln, font=f, fill=ink)
        d.text((60, y), ln, font=f, fill=paper)
        y += int(size * 1.02)
    kf = _font(40)
    kw = d.textlength(kicker.upper(), font=kf)
    d.rectangle((60, y + 26, 60 + kw + 36, y + 90), fill=acc)
    d.text((78, y + 34), kicker.upper(), font=kf, fill=paper)
    # the frame: a paper edge around the picture
    d.rectangle((0, FRAME_Y - 10, W, FRAME_Y + 608 + 10), outline=paper, width=10)
    # bottom: the call to the full film and the channel
    by = FRAME_Y + 608 + 70
    d.rectangle((60, by, W - 60, by + 150), fill=acc, outline=ink, width=6)
    bf = _font(68)
    t = 'FULL FILM ON THE CHANNEL'
    tw = d.textlength(t, font=bf)
    d.text(((W - tw) / 2, by + 30), t, font=bf, fill=paper)
    hf = _font(54)
    hw = d.textlength(HANDLE, font=hf)
    d.text(((W - hw) / 2, by + 200), HANDLE, font=hf, fill=paper)
    sf = _font(40)
    s = 'SUBSCRIBE · ONE OF US'
    sw = d.textlength(s, font=sf)
    d.text(((W - sw) / 2, by + 280), s, font=sf, fill=(244, 238, 223, 190))
    badge = ROOT / 'public' / 'brand' / 'fanlife' / 'logo-512.png'
    if badge.exists():
        b = Image.open(badge).convert('RGBA').resize((150, 150), Image.LANCZOS)
        im.alpha_composite(b, (W - 60 - 150, by + 330))
    im.save(out)
    return out


def cut(job: Path, first: int, last: int, hook: str, kicker: str, accent: str, out: Path) -> dict:
    plan = read_json(job / 'plan.json')
    shots = {s['n']: s for s in plan['shots']}
    if first not in shots or last not in shots or last < first:
        raise StageError('SHORT_RANGE', f'Shots {first}-{last} are not in the plan')
    t0 = shots[first]['start']
    t1 = shots[last]['start'] + shots[last]['frames'] / plan.get('fps', 25)
    if t1 - t0 > MAX_SECONDS + 0.5:
        raise StageError('SHORT_TOO_LONG', f'{t1 - t0:.1f}s: a Short is at most {MAX_SECONDS:.0f}s')
    master = job / 'out' / 'master.mp4'
    ov = overlay(hook, kicker, accent, out.with_suffix('.overlay.png'))
    fade = max(0.0, t1 - t0 - 0.6)
    fc = (f"[0:v]split=2[a][b];"
          f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=28:2,eq=brightness=-0.22:saturation=0.7[bg];"
          f"[b]scale={W}:-2[fg];"
          f"[bg][fg]overlay=0:{FRAME_Y}[v1];[v1][1:v]overlay=0:0,fade=t=in:st=0:d=0.25,fade=t=out:st={fade:.2f}:d=0.5[v];"
          f"[0:a]afade=t=in:st=0:d=0.2,afade=t=out:st={fade:.2f}:d=0.5[aout]")
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{t0:.3f}', '-t', f'{t1 - t0:.3f}', '-i', str(master),
                    '-loop', '1', '-t', f'{t1 - t0:.3f}', '-i', str(ov), '-filter_complex', fc, '-map', '[v]', '-map', '[aout]',
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '25',
                    '-c:a', 'aac', '-b:a', '192k', '-t', f'{t1 - t0:.3f}', '-movflags', '+faststart', str(out)], check=True)
    return {'file': str(out), 'start': round(t0, 2), 'end': round(t1, 2), 'seconds': round(t1 - t0, 1)}


def pick_range(plan: dict, claim_ids: list[str], max_s: float = 58.0, min_s: float = 20.0) -> tuple[int, int] | None:
    """The stretch of the film a Short idea is about: the longest run of consecutive shots that cite one of its claims,
    trimmed from the front to fit a Short, extended forward when it is too short to stand alone. Never the end card or
    the call to follow (they belong to the film)."""
    fps = plan.get('fps', 25)
    shots = [s for s in plan['shots'] if s['visual'].get('type') not in ('end', 'follow')]
    want = set(claim_ids)
    runs, cur = [], []
    for s in shots:
        if want & set(s.get('claim_ids') or []) and (not cur or s['n'] == cur[-1]['n'] + 1):
            cur.append(s)
        else:
            if cur:
                runs.append(cur)
            cur = [s] if want & set(s.get('claim_ids') or []) else []
    if cur:
        runs.append(cur)
    if not runs:
        return None
    dur = lambda r: sum(x['frames'] for x in r) / fps
    run = max(runs, key=lambda r: (min(dur(r), max_s), -r[0]['n']))
    while len(run) > 1 and dur(run) > max_s:
        run = run[1:]
    by_n = {s['n']: s for s in shots}
    while dur(run) < min_s and run[-1]['n'] + 1 in by_n and dur(run + [by_n[run[-1]['n'] + 1]]) <= max_s:
        run = run + [by_n[run[-1]['n'] + 1]]
    return (run[0]['n'], run[-1]['n']) if dur(run) <= max_s + 1 else None


def auto(job: Path, script: dict, club: str, season: str, accent: str) -> list[dict]:
    """Every Short the script proposes, cut from the finished master into out/shorts/."""
    plan = read_json(job / 'plan.json')
    out = []
    for i, sh in enumerate(script.get('shorts') or [], 1):
        r = pick_range(plan, sh.get('claim_ids') or [])
        if not r:
            continue
        dst = job / 'out' / 'shorts' / f'short-{i}.mp4'
        dst.parent.mkdir(parents=True, exist_ok=True)
        res = cut(job, r[0], r[1], sh['hook'], f'{club} · {season}', accent, dst)
        out.append({**res, 'hook': sh['hook'], 'idea': sh.get('idea'), 'shots': list(r), 'file': str(dst)})
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--job', type=Path, required=True)
    ap.add_argument('--shots', required=True, help='first-last shot numbers from plan.json')
    ap.add_argument('--hook', required=True)
    ap.add_argument('--kicker', required=True)
    ap.add_argument('--accent', default='#B02D10')
    ap.add_argument('--out', type=Path, required=True)
    a = ap.parse_args()
    f, l = (int(x) for x in a.shots.split('-'))
    print(json.dumps(cut(a.job, f, l, a.hook, a.kicker, a.accent, a.out)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
