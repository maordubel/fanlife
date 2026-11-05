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

from .captions import font as weekly  # the Weekly head, latin with latin-ext behind it (Kožulj keeps its Ž)
from .common import ROOT, StageError, hex_rgb, read_json

W, H = 1080, 1920
FRAME_Y = 660            # the 16:9 picture: 1080×608 from here
TIGHT_Y, TIGHT_H = 560, 810   # a VOX film's Short: the middle 4:3 of the board, 1080×810
MAX_SECONDS = 59.0
HANDLE = '@FanLifeFootballStories'


def _font(size: int):
    return weekly('weekly-head', size)


def _len(text: str, font) -> float:
    return font.getlength(text)


def _text(d: ImageDraw.ImageDraw, xy, text: str, f, fill) -> None:
    f.draw(d, xy, text, fill)


def overlay(hook: str, kicker: str, accent: str, out: Path, frame_y: int = FRAME_Y, frame_h: int = 608) -> Path:
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    ink, paper, acc = (21, 19, 15, 255), (244, 238, 223, 255), (*hex_rgb(accent), 255)
    # top: the hook, printed twice (ink under, paper over), on a dark band
    d.rectangle((0, 0, W, frame_y - 24), fill=(21, 19, 15, 205))
    size = 104
    lines = textwrap.wrap(hook.upper(), 16)
    most = 4 if frame_y >= FRAME_Y else 3
    while len(lines) > most and size > 70:
        size -= 8
        lines = textwrap.wrap(hook.upper(), int(16 * 104 / size))
    f = _font(size)
    y = 120 if frame_y >= FRAME_Y else 80
    for ln in lines[:most]:
        _text(d, (66, y + 7), ln, f, ink)
        _text(d, (60, y), ln, f, paper)
        y += int(size * 1.02)
    kf = _font(40)
    kw = _len(kicker.upper(), font=kf)
    d.rectangle((60, y + 26, 60 + kw + 36, y + 90), fill=acc)
    _text(d, (78, y + 34), kicker.upper(), kf, paper)
    # the frame: a paper edge around the picture
    d.rectangle((0, frame_y - 10, W, frame_y + frame_h + 10), outline=paper, width=10)
    # bottom: the call to the full film and the channel
    by = frame_y + frame_h + (70 if frame_h <= 608 else 50)
    d.rectangle((60, by, W - 60, by + 150), fill=acc, outline=ink, width=6)
    bf = _font(68)
    t = 'FULL FILM ON THE CHANNEL'
    tw = _len(t, font=bf)
    _text(d, ((W - tw) / 2, by + 30), t, bf, paper)
    hf = _font(54)
    hw = _len(HANDLE, font=hf)
    _text(d, ((W - hw) / 2, by + 200), HANDLE, hf, paper)
    sf = _font(40)
    s = 'SUBSCRIBE · ONE OF US'
    sw = _len(s, font=sf)
    _text(d, ((W - sw) / 2, by + 280), s, sf, (244, 238, 223, 190))
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
    # a VOX film keeps what matters at the centre of its camera, so the Short reframes the board tighter: the middle
    # 4:3 of the frame, larger on the page (captions are centred, so they stay whole)
    tight = plan.get('engine') == 'vox'
    fy, fh = (TIGHT_Y, TIGHT_H) if tight else (FRAME_Y, 608)
    ov = overlay(hook, kicker, accent, out.with_suffix('.overlay.png'), fy, fh)
    fade = max(0.0, t1 - t0 - 0.6)
    fc = (f"[0:v]split=2[a][b];"
          f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=28:2,eq=brightness=-0.22:saturation=0.7[bg];"
          + (f"[b]crop=1440:1080,scale={W}:-2[fg];" if tight else f"[b]scale={W}:-2[fg];") +
          f"[bg][fg]overlay=0:{fy}[v1];[v1][1:v]overlay=0:0,fade=t=in:st=0:d=0.25,fade=t=out:st={fade:.2f}:d=0.5[v];"
          f"[0:a]afade=t=in:st=0:d=0.2,afade=t=out:st={fade:.2f}:d=0.5[aout]")
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{t0:.3f}', '-t', f'{t1 - t0:.3f}', '-i', str(master),
                    '-loop', '1', '-t', f'{t1 - t0:.3f}', '-i', str(ov), '-filter_complex', fc, '-map', '[v]', '-map', '[aout]',
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '25',
                    '-c:a', 'aac', '-b:a', '192k', '-t', f'{t1 - t0:.3f}', '-movflags', '+faststart', str(out)], check=True)
    return {'file': str(out), 'start': round(t0, 2), 'end': round(t1, 2), 'seconds': round(t1 - t0, 1)}


def pick_range(plan: dict, claim_ids: list[str], max_s: float = 58.0, min_s: float = 20.0,
               used: set[int] | None = None) -> tuple[int, int] | None:
    """The stretch of the film a Short idea is about: of every run of consecutive shots that fits a Short, the one where
    the most seconds cite the idea's claims and the fewest repeat a Short already cut (`used`), the earliest on a tie.
    Never the end card or the call to follow (they belong to the film)."""
    fps = plan.get('fps', 25)
    shots = [s for s in plan['shots'] if s['visual'].get('type') not in ('end', 'follow')]
    want, used = set(claim_ids), used or set()
    sec = [s['frames'] / fps for s in shots]
    hit = [bool(want & set(s.get('claim_ids') or [])) for s in shots]
    best, best_key = None, None
    for i in range(len(shots)):
        if not hit[i]:
            continue  # a Short opens on its own subject, never on the shot before it
        total = covered = repeat = 0.0
        for j in range(i, len(shots)):
            if j > i and shots[j]['n'] != shots[j - 1]['n'] + 1:
                break
            total += sec[j]
            if total > max_s + 0.5:
                break
            covered += sec[j] if hit[j] else 0
            repeat += sec[j] if shots[j]['n'] in used else 0
            if total >= min_s or j == len(shots) - 1:
                key = (covered - 1.5 * repeat, -i)
                if best_key is None or key > best_key:
                    best, best_key = (shots[i]['n'], shots[j]['n']), key
    if best_key is None or best_key[0] <= 0:
        return None
    return best


def auto(job: Path, script: dict, club: str, season: str, accent: str) -> list[dict]:
    """Every Short the script proposes, cut from the finished master into out/shorts/."""
    plan = read_json(job / 'plan.json')
    out, used = [], set()
    for i, sh in enumerate(script.get('shorts') or [], 1):
        r = pick_range(plan, sh.get('claim_ids') or [], used=used)
        if not r:
            continue
        used |= set(range(r[0], r[1] + 1))
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
