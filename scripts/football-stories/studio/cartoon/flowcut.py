"""Edit an animated Short from Google Flow clips (owner, 8.11.2026: "I pay for Google PRO — work with Google Flow").

Flow (the owner's AI Pro plan) draws the story's characters and animates them; this is the editor that turns its clips
into a finished Short: the narrator's voice, each clip cut to its line, quick cuts between them, captions on the
narrator's words, a stamp on the reveal, the clips' own sound under the voice, the owner's music, loudness for Shorts.

    python3 -m studio.cartoon.flowcut --story story.json --media media/ --out short.mp4

story.json: {"beats": [{"say": "...", "clip": 0} | {"say": "...", "still": 0, "stamp": "CONFIRMED"}], "tag": "FAN LIFE · CLASSIFIED"}
media/: clip-0.mp4 … and still-0.jpg … (downloaded from Flow).
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
from pathlib import Path

from ..common import read_json
from . import build, scene

W, H, FPS = 1080, 1920, 30
XF = 0.22  # the cut: a short push-dissolve between clips


def _run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def _dur(p: Path) -> float:
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)], capture_output=True, text=True)
    return float(r.stdout.strip() or 0)


def font_file(work: Path) -> tuple[Path, str]:
    """The house display face as a TTF for the caption renderer (libass reads TTF/OTF, not WOFF2)."""
    from fontTools.ttLib import TTFont
    src = build.FONTS / build.FACES['head']
    dst = work / 'fonts' / 'weekly-head.ttf'
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not dst.exists():
        f = TTFont(str(src))
        f.flavor = None
        f.save(str(dst))
    name = TTFont(str(dst))['name'].getDebugName(1) or 'Weekly Head'
    return dst.parent, name


def _ts(t: float) -> str:
    t = max(0.0, t)
    return f'{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}'


def captions_ass(words: list[dict], duration: float, font: str, accent: str, tag: str, stamps: list[tuple[float, str]],
                 lead: float = 0.1) -> str:
    """Two or three words at a time, each word popping in on its time; the key words in the club's colour."""
    def bgr(h: str) -> str:
        h = h.lstrip('#')
        return f'&H00{h[4:6]}{h[2:4]}{h[0:2]}'
    Q = build._caption_chunks(words, lead)
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{font},112,&H00F2FBFF,&H00F2FBFF,&H000F1315,&H64000000,0,0,0,0,100,100,1,0,1,9,4,8,60,60,330,1
Style: Tag,{font},30,&H000F1315,&H000F1315,&H00F2FBFF,&H00F2FBFF,0,0,0,0,100,100,4,0,3,10,0,7,56,56,196,1
Style: Stamp,{font},120,{bgr(accent)},{bgr(accent)},{bgr(accent)},&H00000000,0,0,0,0,100,100,6,0,1,6,0,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = [f'Dialogue: 2,{_ts(0)},{_ts(duration)},Tag,,0,0,0,,{tag.upper()}']
    for i, q in enumerate(Q):
        end = Q[i + 1]['t0'] if i + 1 < len(Q) else min(duration - 0.2, q['t1'] + 0.4)
        parts = []
        for w in q['w']:
            ms = max(0, int((w['t'] - q['t0']) * 1000))
            col = f'\\1c{bgr(accent)}' if w['key'] else ''
            parts.append(f"{{\\alpha&HFF&\\fscx60\\fscy60\\t({ms},{ms + 140},\\alpha&H00&\\fscx112\\fscy112)\\t({ms + 140},{ms + 240},\\fscx100\\fscy100){col}}}{w['w'].upper()}")
        ev.append(f"Dialogue: 1,{_ts(q['t0'])},{_ts(end)},Cap,,0,0,0,,{' '.join(parts)}")
    for t, txt in stamps:
        ev.append(f"Dialogue: 3,{_ts(t)},{_ts(duration)},Stamp,,0,0,0,,{{\\pos({W // 2},{int(H * 0.56)})\\frz8\\fscx260\\fscy260\\t(0,160,\\fscx100\\fscy100)\\bord7\\3c&H00F2FBFF&\\shad5}}{txt}")
    return head + '\n'.join(ev) + '\n'


def segment(src: Path, out: Path, need: float, still: bool) -> None:
    """One line's picture at Short size: a clip from its start (slowed a touch, or held on its last frame, if the line
    runs longer), or a still with a slow push-in."""
    vf = f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS}'
    if still:
        n = int(need * FPS) + 2
        _run(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-i', str(src), '-t', f'{need:.3f}', '-vf',
              f'scale={W * 2}:{H * 2}:force_original_aspect_ratio=increase,crop={W * 2}:{H * 2},'
              f"zoompan=z='min(1.0+0.12*on/{n},1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS},setsar=1",
              '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', str(out)])
        return
    have = _dur(src)
    # a short line gets the END of its clip — where the action pays off (the shot goes in, the man falls)
    start = max(0.0, have - need - 0.3) if need < have * 0.5 else 0.0
    speed = min(1.25, need / have) if need > have else 1.0
    pad = max(0.0, need - have * speed)
    v = f"setpts={speed:.4f}*PTS,{vf}" + (f',tpad=stop_mode=clone:stop_duration={pad + 0.1:.3f}' if pad > 0 else '')
    a = f"atempo={1 / speed:.4f},apad" if speed != 1.0 else 'apad'
    _run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{start:.3f}', '-i', str(src), '-t', f'{need:.3f}', '-filter_complex', f'[0:v]{v}[v];[0:a]{a}[a]',
          '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
          '-c:a', 'aac', '-ar', '48000', '-ac', '2', str(out)])


def make(story: dict, media: Path, out: Path, work: Path, *, accent: str = '#B02D10', fake_voice: bool = False, log=print) -> dict:
    from .make import voice
    work.mkdir(parents=True, exist_ok=True)
    beats_in = story['beats']
    text = ' '.join(b['say'].strip() for b in beats_in)
    wav, words, vdur = voice(text, work, work / 'cache', fake_voice)
    duration = round(vdur + 0.9, 3)
    beats = scene.plan([{'say': b['say'], 'show': ''} for b in beats_in], words)
    starts = [0.0] + [max(b['t0'] - 0.08, 0.1) for b in beats[1:]]
    ends = starts[1:] + [duration]
    segs = []
    stamps = []
    for i, (b, t0, t1) in enumerate(zip(beats_in, starts, ends)):
        need = t1 - t0 + (XF if i < len(beats_in) - 1 else 0)
        still = 'still' in b
        src = media / (f"still-{b['still']}.jpg" if still else f"clip-{b['clip']}.mp4")
        seg = work / f'seg-{i}.mp4'
        segment(src, seg, need, still)
        if still:  # a still has no sound: give it silence so the chain stays in step
            withsil = work / f'seg-{i}-a.mp4'
            _run(['ffmpeg', '-y', '-v', 'error', '-i', str(seg), '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest',
                  '-c:v', 'copy', '-c:a', 'aac', str(withsil)])
            seg = withsil
        segs.append((seg, need))
        if b.get('stamp'):
            stamps.append((beats[i]['t0'] + (beats[i]['t1'] - beats[i]['t0']) * 0.6, b['stamp']))
    # chain the segments with short push-dissolves
    inputs, fc, offset = [], [], 0.0
    for s, _ in segs:
        inputs += ['-i', str(s)]
    lv, la = '[0:v]', '[0:a]'
    trans = ['slideleft', 'smoothup', 'slideright', 'circleopen', 'smoothleft', 'zoomin']
    for i in range(1, len(segs)):
        offset += segs[i - 1][1] - XF
        fc.append(f"{lv}[{i}:v]xfade=transition={trans[i % len(trans)]}:duration={XF}:offset={offset:.3f}[v{i}]")
        fc.append(f"{la}[{i}:a]acrossfade=d={XF}[a{i}]")
        lv, la = f'[v{i}]', f'[a{i}]'
    pic = work / 'picture.mp4'
    _run(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', ';'.join(fc) or 'null', '-map', lv, '-map', la,
          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-t', f'{duration:.3f}', str(pic)])
    fonts, fname = font_file(work)
    ass = work / 'captions.ass'
    ass.write_text(captions_ass(words, duration, fname, accent, story.get('tag') or 'FAN LIFE', stamps), encoding='utf-8')
    # the sound: the voice on top, the clips' own sound and the owner's music under it, both ducked by the voice
    from ..audio import SR, _write, level_music, owner_score, resolve_music, speech_db
    from .sound import _read, duck_envelope
    import numpy as np
    n = int(duration * SR)
    v = np.zeros(n, 'float32')
    a = _read(wav, SR)
    i0 = int(0.1 * SR)
    v[i0:i0 + len(a)] += a[: max(0, n - i0)]
    vdb = speech_db(v)
    duck = duck_envelope(v, SR, depth_db=9.0)
    fx = _read(pic, SR)[:n]
    fx = np.pad(fx, (0, max(0, n - len(fx))))
    fx_db = 20 * np.log10(np.sqrt(np.mean(fx.astype('float64') ** 2)) + 1e-9)
    fx = fx * 10 ** ((vdb - 9 - fx_db) / 20) * duck
    try:
        music, tid = owner_score([{'start': 0.0, 'end': duration, 'mood': 'drive'}], resolve_music(None, ['tense', 'cinematic'], text[:30]), log)
        music = np.pad(music[:n], (0, max(0, n - len(music))))
        music = level_music(music, vdb, under=16.0) * duck
        log(f'Flow Short: music {tid}')
    except Exception as e:  # noqa: BLE001
        log(f'Flow Short: no owner track ({e})')
        music = np.zeros(n, 'float32')
    from .sound import limit
    mix = limit(v + fx + music)
    mixwav = work / 'mix.wav'
    _write(mixwav, mix, SR)
    out.parent.mkdir(parents=True, exist_ok=True)
    _run(['ffmpeg', '-y', '-v', 'error', '-i', str(pic), '-i', str(mixwav), '-map', '0:v', '-map', '1:a',
          '-vf', f"ass={ass}:fontsdir={fonts}", '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
          '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-t', f'{duration:.3f}',
          '-movflags', '+faststart', str(out)])
    return {'file': str(out), 'seconds': duration, 'beats': len(beats_in), 'engine': 'flow'}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--story', type=Path, required=True)
    ap.add_argument('--media', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--work', type=Path, default=Path('/tmp/flowcut'))
    ap.add_argument('--accent', default='#B02D10')
    ap.add_argument('--voice', choices=['kokoro', 'fake'], default='kokoro')
    a = ap.parse_args(argv)
    if a.work.exists():
        shutil.rmtree(a.work)
    print(json.dumps(make(read_json(a.story), a.media, a.out, a.work, accent=a.accent, fake_voice=a.voice == 'fake')))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
