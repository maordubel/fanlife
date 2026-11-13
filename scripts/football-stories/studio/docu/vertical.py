"""Vertical cuts of a DOCU film — Shorts and Reels drawn FOR 9:16, not a 16:9 frame in a blurred page.

The film's Shorts tool (studio/shorts.py) sets the finished 16:9 picture inside a vertical page. That keeps the film's
own graphics but leaves two thirds of a phone screen as blur. The model film (docs/fanlife/74) asks for the other
kind: each picture re-framed for the phone around a FOCUS the storyboard names (a face, the ball — never a centre crop
that cuts a head), a slow camera on it the whole time (studio/camera.py's `glide`: eased at both ends, never stopped,
no shake — rule 142), the narrator's own takes from the film (`assets/vo/l###.wav`, so no line is re-voiced), big
burned-in captions two or three words at a time, a hook in type from the first frame, and an end card that sends the
viewer to the full film.

A cut is a spec: {'name', 'hook', 'kicker', 'scenes': [...], 'end': {'big', 'small'}}; a scene is
    {'src': picture, 'focus': (x, y) 0–1, 'zoom': (from, to), 'vo': 'the line as the storyboard has it' | None,
     'd': seconds when there is no line, 'card': {'big', 'small', 'bg': 'us' | 'ink'}}
Nothing here writes a fact: a scene's words are the storyboard's line, a card's are the storyboard's own cards.

    python3 -m studio.docu.vertical cuts.json --storyboard storyboard.json --project <built project> --out <dir>
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

from .. import camera as C
from ..captions import font as weekly

W, H, FPS = 1080, 1920, 30
INK, PAPER = (21, 19, 15), (244, 236, 216)
HANDLE = '@FanLifeFootballStories'
GAP = 0.18            # the breath between two lines
CARD_S = 2.2          # a type card with no line
END_S = 2.8
MAX_GROUP = 16        # characters in one burned caption (two or three words: read in a glance on a phone)
MUSIC = Path(__file__).resolve().parents[1] / 'kit' / 'music'


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip('#')
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def groups(text: str, limit: int = MAX_GROUP) -> list[str]:
    """The line in caption groups: never across a sentence end, at most `limit` characters, a lone short word joins its neighbour."""
    out, cur = [], ''
    for w in text.split():
        if cur and (len(cur) + 1 + len(w) > limit or cur[-1] in '.?!'):
            out.append(cur)
            cur = w
        else:
            cur = f'{cur} {w}'.strip()
    if cur:
        out.append(cur)
    return out


def crop_box(size: tuple[int, int], focus: tuple[float, float], zoom: float) -> tuple[float, float, float, float]:
    """The 9:16 window on a picture of `size`: as tall as the picture allows, divided by `zoom`, centred on `focus` and
    kept inside the picture — so the subject the storyboard names is in frame at every zoom."""
    w, h = size
    ch = h / zoom
    cw = ch * W / H
    if cw > w:
        cw, ch = w, w * H / W
    x = min(max(focus[0] * w - cw / 2, 0), w - cw)
    y = min(max(focus[1] * h - ch / 2, 0), h - ch)
    return x, y, x + cw, y + ch


def wrap(f, text: str, max_w: float) -> list[str]:
    lines, cur = [], ''
    for w in text.split():
        t = f'{cur} {w}'.strip()
        if cur and f.getlength(t) > max_w:
            lines.append(cur)
            cur = w
        else:
            cur = t
    return lines + ([cur] if cur else [])


def plate_text(im: Image.Image, text: str, size: int, cy: int, fill, plate, max_w: int = 940, pad: int = 22) -> None:
    """Type on its own plate, centred — readable over any picture (the gate's legibility rule for a phone)."""
    f = weekly('weekly-head', size)
    lines = wrap(f, text, max_w)
    lh = int(size * 1.16)
    y = cy - lh * len(lines) // 2
    d = ImageDraw.Draw(im, 'RGBA')
    for ln in lines:
        w = f.getlength(ln)
        x = (W - w) / 2
        d.rectangle((x - pad, y - pad // 2, x + w + pad, y + lh - pad // 3), fill=plate)
        f.draw(d, (x, y), ln, fill)
        y += lh


def timeline(spec: dict, lines: dict[str, tuple[str, float]]) -> tuple[list[dict], float]:
    """Scenes on the clock: a scene lasts its line (the film's own take) plus a breath; a card with no line CARD_S."""
    t, out = 0.0, []
    for s in spec['scenes']:
        s = dict(s)
        if s.get('vo'):
            if s['vo'] not in lines:
                raise SystemExit(f'the storyboard has no line: {s["vo"][:50]}')
            s['wav'], s['vo_d'] = lines[s['vo']]
            s['d'] = s['vo_d'] + s.get('pad', GAP)
        else:
            s['d'] = s.get('d', CARD_S)
        s['t'] = t
        t += s['d']
        out.append(s)
    return out, t


def render(spec: dict, lines: dict, assets: Path, vo_dir: Path, out: Path, accent: str, music: str | None = None, logo: Path | None = None) -> dict:
    scenes, body = timeline(spec, lines)
    D = body + END_S
    acc = hex_rgb(accent)
    pics: dict[str, Image.Image] = {}
    for s in scenes:
        if s.get('src') and s['src'] not in pics:
            pics[s['src']] = Image.open(assets / s['src']).convert('RGB')
    # the static dressing: gradients for the type, the hook, the handle
    shade = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    for y in range(520):
        sd.line((0, y, W, y), fill=(*INK, int(215 * (1 - y / 520) ** 1.4)))
    for y in range(700):
        sd.line((0, H - 1 - y, W, H - 1 - y), fill=(*INK, int(225 * (1 - y / 700) ** 1.5)))
    hf = weekly('weekly-head', 84)
    hook_lines = wrap(hf, spec['hook'].upper(), 960)
    hd = ImageDraw.Draw(shade)
    y = 150
    for ln in hook_lines[:3]:
        hf.draw(hd, (64, y + 5), ln, (*INK, 255))
        hf.draw(hd, (60, y), ln, (*PAPER, 255))
        y += 92
    kf = weekly('weekly-head', 38)
    hd.rectangle((60, y + 14, 60 + kf.getlength(spec['kicker'].upper()) + 36, y + 70), fill=(*acc, 255))
    kf.draw(hd, (78, y + 20), spec['kicker'].upper(), (255, 255, 255, 255))
    sf = weekly('weekly-head', 30)
    sf.draw(hd, (60, H - 150), HANDLE, (*PAPER, 235))
    lab = 'Illustration · graphic reconstruction'
    sf2 = weekly('weekly-head', 22)
    sf2.draw(hd, (W - 60 - sf2.getlength(lab), H - 142), lab, (*PAPER, 170))
    mark = Image.open(logo).convert('RGBA').resize((220, 220), Image.LANCZOS) if logo and logo.exists() else None

    out.parent.mkdir(parents=True, exist_ok=True)
    silent = out.with_suffix('.silent.mp4')
    ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', str(silent)], stdin=subprocess.PIPE)
    n = int(round(D * FPS))
    for i in range(n):
        t = i / FPS
        if t >= body:   # the end card: where the full film is
            u = (t - body) / END_S
            im = Image.new('RGB', (W, H), INK)
            if mark:
                k = 1 + 0.05 * u
                m = mark.resize((int(220 * k), int(220 * k)), Image.BILINEAR)
                im.paste(m, ((W - m.width) // 2, 520 - m.height // 2), m)
            plate_text(im, spec['end']['big'].upper(), 104, 900, (255, 255, 255), (*acc, 255))
            plate_text(im, spec['end']['small'], 46, 1160, PAPER, (*INK, 0))
            plate_text(im, HANDLE, 44, 1300, PAPER, (*INK, 0))
            d = ImageDraw.Draw(im)
            d.rectangle((300, 1420, 300 + int(480 * C.ease('glide', u)), 1430), fill=acc)   # a line that travels: never a dead frame
            ff.stdin.write(im.tobytes())
            continue
        s = next(x for x in reversed(scenes) if x['t'] <= t + 1e-6)
        u = (t - s['t']) / s['d']
        if s.get('src'):
            z0, z1 = s.get('zoom', (1.0, 1.12))
            f0, f1 = s.get('focus', (0.5, 0.5)), s.get('focus_to', s.get('focus', (0.5, 0.5)))
            e_ = C.ease('glide', u)
            box = crop_box(pics[s['src']].size, (f0[0] + (f1[0] - f0[0]) * e_, f0[1] + (f1[1] - f0[1]) * e_), z0 + (z1 - z0) * e_)
            im = pics[s['src']].resize((W, H), Image.BILINEAR, box=box)
        else:
            im = Image.new('RGB', (W, H), acc if (s.get('card') or {}).get('bg') == 'us' else INK)
        im.paste(shade, (0, 0), shade)
        if s.get('card'):
            c = s['card']
            k = min(1.0, (t - s['t']) / 0.18)      # arrives once, settles, then creeps (no bounce)
            size = int(c.get('size', 150) * (1.25 - 0.25 * k) * (1 + 0.02 * u))
            plate_text(im, c['big'].upper(), size, 980, (255, 255, 255), (*(acc if c.get('bg') != 'us' else INK), 255))
            if c.get('small'):
                plate_text(im, c['small'].upper(), 44, 1260, PAPER, (*INK, 200))
        if s.get('vo'):
            gs = groups(s['vo'])
            tot = sum(len(g) + 1 for g in gs)
            at, tv = 0.0, (t - s['t'])
            for g in gs:
                dd = s['vo_d'] * (len(g) + 1) / tot
                if at <= tv < at + dd or (g is gs[-1] and tv >= at):
                    plate_text(im, g.upper(), 96, 1380, (255, 255, 255), (*INK, 235))
                    break
                at += dd
        d = ImageDraw.Draw(im)
        d.rectangle((0, 0, int(W * t / body), 10), fill=acc)   # how much of the cut is left: a phone viewer stays for a bar that is nearly full
        ff.stdin.write(im.tobytes())
    ff.stdin.close()
    if ff.wait():
        raise SystemExit('ffmpeg could not write the picture')
    # the sound: the film's own takes where their scenes stand, the owner's track under them
    ins, fc, mix = [], [], []
    for k, s in enumerate(x for x in scenes if x.get('vo')):
        ins += ['-i', str(vo_dir / s['wav'])]
        fc.append(f'[{k}:a]adelay={int(s["t"] * 1000)}:all=1,volume=1.15[v{k}]')
        mix.append(f'[v{k}]')
    nv = len(mix)
    if music:
        ins += ['-stream_loop', '-1', '-i', str(MUSIC / music)]
        fc.append(f'[{nv}:a]atrim=0:{D:.2f},volume=0.16,afade=t=in:d=0.4,afade=t=out:st={D - 1.2:.2f}:d=1.2[m]')
        mix.append('[m]')
    fc.append(f'{"".join(mix)}amix=inputs={len(mix)}:normalize=0:duration=longest,apad=whole_dur={D:.2f},loudnorm=I=-14:TP=-1.5:LRA=11[a]')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', *ins, '-i', str(silent), '-filter_complex', ';'.join(fc), '-map', f'{nv + (1 if music else 0)}:v', '-map', '[a]',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', f'{D:.2f}', '-movflags', '+faststart', str(out)], check=True)
    silent.unlink()
    return {'file': out.name, 'seconds': round(D, 1), 'scenes': len(scenes), 'hook': spec['hook'], 'lines': [s['vo'] for s in scenes if s.get('vo')]}


def lines_of(storyboard: dict, project: Path) -> dict[str, tuple[str, float]]:
    """The storyboard's narrated lines → the take the film recorded for each (build.speak names them by beat)."""
    durs = json.loads((project / 'assets' / 'vo' / 'durations.json').read_text())
    return {b['vo']: (f'l{i:03d}.wav', durs[f'l{i:03d}.wav']) for i, b in enumerate(storyboard['beats']) if b.get('vo')}


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('cuts')
    ap.add_argument('--storyboard', required=True)
    ap.add_argument('--project', required=True)
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    sb = json.loads(Path(a.storyboard).read_text())
    proj = Path(a.project)
    rows = [render(c, lines_of(sb, proj), proj / 'assets' / 'img', proj / 'assets' / 'vo', Path(a.out) / f'{c["name"]}.mp4', sb['palette']['us'],
                   c.get('music'), proj / 'assets' / 'img' / 'fanlife.png') for c in json.loads(Path(a.cuts).read_text())]
    (Path(a.out) / 'vertical.json').write_text(json.dumps(rows, indent=1, ensure_ascii=False) + '\n')
    print(json.dumps([{k: r[k] for k in ('file', 'seconds')} for r in rows]))
