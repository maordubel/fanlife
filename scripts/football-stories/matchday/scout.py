"""I WAS THERE — the scout: what is IN each clip, second by second, so an edit can be written without the footage.

The survey (survey.py) says what a clip is; the scout says where its moments are:
  · a film strip at one frame a second (small, numbered by second) — to choose an `in` point by eye
  · the sound as a curve: loudness every half second (dBFS) and the peaks — a roar, a chant, a whistle
  · speech: Whisper's words with their times — what the crowd sings, and any voice near the camera that has to be
    muted or cut before publication (RULES §4). A name said aloud is listed so it can be cut.
  · the camera's clock: the clip's local start time, so every second can be stamped with the hour it happened

    python3 scripts/football-stories/matchday/scout.py <folder> <out>

Writes <out>/scout.json and <out>/strips/<clip>-NN.jpg (ten seconds a strip). Sources are never modified.
"""
from __future__ import annotations

import datetime as dt
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

VIDEO = {'.mov', '.mp4', '.m4v'}
TZ = dt.timezone(dt.timedelta(hours=3))     # Israel, May: IDT
SR = 16000
TONE = ('zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,'
        'zscale=t=bt709:m=bt709:r=tv,format=yuv420p')   # render.TONE: HLG iPhone footage to SDR, once


def probe(p: Path) -> dict:
    return json.loads(subprocess.run(['ffprobe', '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', str(p)],
                                     capture_output=True, text=True).stdout)


def started(meta: dict) -> str | None:
    tags = {k.lower(): v for k, v in (meta['format'].get('tags') or {}).items()}
    iso = tags.get('com.apple.quicktime.creationdate') or tags.get('creation_time')
    if not iso:
        return None
    try:
        d = dt.datetime.fromisoformat(iso.replace('Z', '+00:00'))
    except ValueError:
        return None
    return d.astimezone(TZ).strftime('%H:%M:%S') if d.tzinfo else d.strftime('%H:%M:%S')


def strips(p: Path, dur: float, out: Path, name: str) -> list[str]:
    tmp = out / '.f' / name
    tmp.mkdir(parents=True, exist_ok=True)
    hdr = any(s.get('color_transfer') in ('arib-std-b67', 'smpte2084') for s in probe(p)['streams'])
    tone = (TONE + ',') if hdr else ''
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(p), '-vf', f'{tone}fps=1,scale=288:-2', '-q:v', '5',
                    str(tmp / '%04d.jpg')], check=False)
    frames = sorted(tmp.glob('*.jpg'))
    made = []
    for k in range(0, len(frames), 10):
        chunk = [Image.open(f) for f in frames[k:k + 10]]
        w, h = chunk[0].size
        sheet = Image.new('RGB', (5 * w, 2 * h), (21, 19, 15))
        d = ImageDraw.Draw(sheet)
        for j, im in enumerate(chunk):
            x, y = (j % 5) * w, (j // 5) * h
            sheet.paste(im, (x, y))
            d.rectangle([x, y, x + 34, y + 16], fill=(21, 19, 15))
            d.text((x + 3, y + 2), f'{k + j}s', fill=(240, 230, 210))
        target = out / 'strips' / f'{name}-{k // 10:02d}.jpg'
        target.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(target, quality=78)
        made.append(str(target.relative_to(out)))
    return made


def sound(p: Path) -> dict:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-vn', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True).stdout
    a = np.frombuffer(raw, np.float32)
    if not len(a):
        return {'curve': [], 'peaks': []}
    n = SR // 2
    curve = [round(float(20 * np.log10(np.sqrt(np.mean(a[i:i + n] ** 2)) + 1e-9)), 1) for i in range(0, len(a), n)]
    base = float(np.median(curve))
    peaks = [round(i * 0.5, 1) for i, v in enumerate(curve) if v > base + 6 and (i == 0 or curve[i - 1] <= v) and
             (i + 1 >= len(curve) or curve[i + 1] <= v)]
    return {'curve': curve, 'median': round(base, 1), 'peaks': peaks}


_W = None


def speech(p: Path) -> list[dict]:
    global _W
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return []
    if _W is None:
        _W = WhisperModel('small', device='cpu', compute_type='int8')
    segs, info = _W.transcribe(str(p), word_timestamps=True, beam_size=1, vad_filter=True)
    out = []
    for s in segs:
        out.append({'start': round(s.start, 2), 'end': round(s.end, 2), 'text': s.text.strip(),
                    'p_speech': round(1 - s.no_speech_prob, 2), 'lang': info.language})
    return out


def main() -> None:
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for p in sorted(x for x in src.rglob('*') if x.suffix.lower() in VIDEO):
        meta = probe(p)
        dur = float(meta['format'].get('duration', 0))
        name = p.stem
        print(f'scout {name} {dur:.1f}s', flush=True)
        rows.append({'clip': str(p.relative_to(src)), 'seconds': round(dur, 2), 'starts': started(meta),
                     'strips': strips(p, dur, out, name), 'sound': sound(p), 'speech': speech(p)})
    (out / 'scout.json').write_text(json.dumps({'clips': rows}, indent=1, ensure_ascii=False))
    subprocess.run(['rm', '-rf', str(out / '.f')])


if __name__ == '__main__':
    main()
