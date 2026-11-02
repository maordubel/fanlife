"""Checks on the actual output. They measure what can be measured — streams, length, loudness, silence, black frames,
caption timing, rival colours — and say plainly what they cannot prove (facts, likeness, artistic quality)."""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

from .common import FPS, Palette, is_banned_pixel


def probe(path: Path) -> dict:
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def tolerance(minutes: float) -> float:
    return 0.20 if minutes <= 3 else 0.15


def check(job_dir: Path, master: Path, plan: dict, cues: list[dict], requested_minutes: float, palette: Palette, log) -> dict:
    out: dict = {'checks': [], 'cannot_prove': [
        'Historical accuracy beyond the cited records (the script is checked number-by-number against its claims, not against the world).',
        'That no generated image resembles a real person (prompts forbid faces; frames should be reviewed).',
        'Artistic quality — watch the film.']}

    def add(name, ok, detail):
        out['checks'].append({'name': name, 'ok': bool(ok), 'detail': detail})
        log(f'QA {"✓" if ok else "✗"} {name}: {detail}')

    p = probe(master)
    v = next((s for s in p['streams'] if s['codec_type'] == 'video'), None)
    a = next((s for s in p['streams'] if s['codec_type'] == 'audio'), None)
    dur = float(p['format']['duration'])
    add('streams', v and a and v['codec_name'] == 'h264' and a['codec_name'] == 'aac' and int(v['height']) >= 1080,
        f"{v and v['codec_name']} {v and v['width']}x{v and v['height']} · {a and a['codec_name']} {a and a.get('sample_rate')}Hz")
    want = requested_minutes * 60
    tol = tolerance(requested_minutes)
    add('duration', abs(dur - want) <= want * tol, f'{dur / 60:.2f} min for a {requested_minutes} min request (±{int(tol * 100)}%)')
    mb = master.stat().st_size / 1e6
    add('fits storage', mb <= 900, f'master {mb:.0f} MB (budget 850 MB: the private bucket holds 1 GB)')
    add('picture/audio sync', abs(dur - plan['duration']) < 0.25, f'master {dur:.2f}s, edit {plan["duration"]:.2f}s')
    # loudness
    r = subprocess.run(['ffmpeg', '-v', 'info', '-i', str(master), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)
    tp = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r.stderr)
    lufs = float(m[-1]) if m else None
    add('loudness', lufs is not None and -16 <= lufs <= -12, f'{lufs} LUFS integrated, true peak {tp[-1] if tp else "?"} dBFS')
    # silence longer than 4 s anywhere before the end card
    r = subprocess.run(['ffmpeg', '-v', 'info', '-i', str(master), '-af', 'silencedetect=n=-45dB:d=4', '-f', 'null', '-'], capture_output=True, text=True)
    sil = [float(x) for x in re.findall(r'silence_start: (-?[\d.]+)', r.stderr) if float(x) < dur - 8]
    add('no dead air', not sil, f'{len(sil)} silences over 4s' + (f' at {sil[:5]}' if sil else ''))
    # black frames
    r = subprocess.run(['ffmpeg', '-v', 'info', '-i', str(master), '-vf', 'blackdetect=d=0.6:pic_th=0.97', '-an', '-f', 'null', '-'], capture_output=True, text=True)
    blk = [float(x) for x in re.findall(r'black_start:(-?[\d.]+)', r.stderr) if float(x) > 1.0]
    add('no black gaps', not blk, f'{len(blk)} black runs' + (f' at {blk[:5]}' if blk else ''))
    # captions
    bad = [c for c in cues if c['end'] <= c['start'] or c['end'] > dur + 0.1 or any(len(l) > 46 for l in c['lines'])]
    add('captions', cues and not bad, f'{len(cues)} cues, {len(bad)} malformed')
    # rival colours, on frames sampled every 2 s
    frames_dir = job_dir / 'qa'
    frames_dir.mkdir(exist_ok=True)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(master), '-vf', 'fps=1/2,scale=480:-1', str(frames_dir / 'f-%04d.png')], check=True)
    worst = 0.0
    if palette.bans:
        for f in sorted(frames_dir.glob('f-*.png')):
            arr = np.asarray(Image.open(f).convert('RGB')).reshape(-1, 3)
            sample = arr[:: 7]
            bad_px = sum(1 for px in sample if is_banned_pixel(tuple(int(x) for x in px), palette.bans))
            worst = max(worst, bad_px / len(sample))
    add('rival colours', worst < 0.002, f'banned families {palette.bans or "none"} · worst frame {worst * 100:.3f}% of pixels')
    # contact sheet: one frame per shot, for a human look
    sheet = []
    for s in plan['shots']:
        t = s['start'] + min(s['frames'] / FPS * 0.6, s['frames'] / FPS - 0.1)
        fp = frames_dir / f'shot-{s["n"]:04d}.jpg'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{t:.2f}', '-i', str(master), '-frames:v', '1', '-vf', 'scale=384:-1', str(fp)], check=True)
        sheet.append(fp)
    cols = 6
    rows = (len(sheet) + cols - 1) // cols
    cs = Image.new('RGB', (cols * 384, rows * 216), (21, 19, 15))
    for i, fp in enumerate(sheet):
        if fp.exists():
            cs.paste(Image.open(fp), ((i % cols) * 384, (i // cols) * 216))
    cs.save(job_dir / 'contact-sheet.jpg', quality=82)
    out['ok'] = all(c['ok'] for c in out['checks'])
    out['duration_seconds'] = round(dur, 2)
    return out
