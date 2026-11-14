"""The weekly ANTHOLOGY (youtube sprint plan, 10.11.2026): one long film cut from the channel's own published DOCU masters,
joined by new narration drawn once as a small DOCU storyboard (films/anthology_<week>.py, its `joins` name where each
link starts). Nothing is re-drawn: each film's picture is its master, cut before its own subscribe beat.

The sound of a film can be re-mixed from its built project (`mix`), exactly as HyperFrames lays it (clips hard-cut at
data-start, trimmed to data-duration from data-media-start, at data-volume — 0.96–0.98 correlation with the masters,
zero lag), with a music file swapped for another owner track: how a track under a Content ID claim leaves a film
without re-rendering it (13.11.2026, `sub-clair-lofi-study`).

    python3 -m studio.docu.anthology plan.json --out anthology.mp4

plan.json: {"links": {"film": links.mp4, "project": <built links project>, "storyboard": links.json},
            "films": [{"name", "master": film.mp4, "end": seconds, "project": <built project>?, "swap": {"old.mp3": "new.mp3@offset"}?}],
            "order": ["link:open", "link:file1", "film:0", ...]}
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

from . import build as B

MUSIC = Path(__file__).resolve().parent.parent / 'kit' / 'music'
FADE = 0.12   # a join never clicks: the sound of every piece opens and closes over a few frames


def mix(project: Path, out: Path, duration: float, swap: dict[str, str] | None = None) -> Path:
    """The project's sound as HyperFrames mixes it, with music files swapped (`old.mp3` → `new.mp3@offset_s`)."""
    swap = swap or {}
    tags = re.findall(r'<audio[^>]*>', (project / 'index.html').read_text())
    inputs, filt = [], []
    for n, t in enumerate(tags):
        a = dict(re.findall(r'(\S+?)="([^"]*)"', t))
        src, ms = project / a['src'], float(a.get('data-media-start', 0))
        if Path(a['src']).name in swap:
            f, _, off = swap[Path(a['src']).name].partition('@')
            src, ms = MUSIC / f, float(off or 0)
        st, du, vol = float(a['data-start']), float(a['data-duration']), float(a.get('data-volume', 1))
        inputs += ['-i', str(src)]
        filt.append(f'[{n}:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim={ms}:{ms + du},asetpts=PTS-STARTPTS,'
                    f'volume={vol},adelay={int(round(st * 1000))}:all=1[a{n}]')
    filt.append(''.join(f'[a{i}]' for i in range(len(tags))) + f'amix=inputs={len(tags)}:normalize=0:dropout_transition=0,apad,atrim=0:{duration}[out]')
    script = out.with_suffix('.filter')
    script.write_text(';\n'.join(filt))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex_script', str(script), '-map', '[out]', '-ar', '48000', '-ac', '2', str(out)], check=True)
    return out


def joins(storyboard: Path, project: Path) -> dict[str, tuple[float, float]]:
    """Each link's span in the rendered links film, from its storyboard's `joins` and the voiced beats."""
    sb = json.loads(storyboard.read_text())
    bs = B.timeline(sb['beats'], json.loads((project / 'assets' / 'vo' / 'durations.json').read_text()))
    D = bs[-1]['t'] + bs[-1]['d']
    names = sorted(sb['joins'].items(), key=lambda kv: kv[1])
    return {k: (bs[i]['t'], bs[names[j + 1][1]]['t'] if j + 1 < len(names) else D) for j, (k, i) in enumerate(names)}


def piece(video: Path, audio: Path, a: float, z: float, out: Path) -> Path:
    d = z - a
    af = f'atrim={a}:{z},asetpts=PTS-STARTPTS,afade=t=in:d={FADE},afade=t=out:st={d - FADE:.3f}:d={FADE}'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a:.3f}', '-t', f'{d:.3f}', '-i', str(video), '-i', str(audio),
                    '-filter_complex', f'[1:a]{af}[a]', '-map', '0:v:0', '-map', '[a]',
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '30', '-g', '60',
                    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-t', f'{d:.3f}', str(out)], check=True)
    return out


def assemble(plan: dict, out: Path) -> list[dict]:
    work = out.parent / (out.stem + '-pieces')
    work.mkdir(parents=True, exist_ok=True)
    L = plan['links']
    span = joins(Path(L['storyboard']), Path(L['project']))
    sounds = {}
    for i, f in enumerate(plan['films']):
        if f.get('project'):
            sounds[i] = mix(Path(f['project']), work / f'sound-{i}.wav', f['end'], f.get('swap'))
    parts, rows, t = [], [], 0.0
    for k, ref in enumerate(plan['order']):
        kind, name = ref.split(':', 1)
        if kind == 'link':
            a, z = span[name]
            p = piece(Path(L['film']), Path(L['film']), a, z, work / f'{k:02d}-link-{name}.mp4')
        else:
            f = plan['films'][int(name)]
            a, z = 0.0, f['end']
            p = piece(Path(f['master']), sounds.get(int(name), Path(f['master'])), a, z, work / f'{k:02d}-film-{name}.mp4')
            name = f['name']
        parts.append(p)
        rows.append({'piece': ref, 'name': name, 'at': round(t, 2), 'd': round(z - a, 2)})
        t += z - a
    lst = work / 'list.txt'
    lst.write_text(''.join(f"file '{p.resolve()}'\n" for p in parts))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', '-movflags', '+faststart', str(out)], check=True)
    (out.parent / (out.stem + '-chapters.json')).write_text(json.dumps(rows, indent=1, ensure_ascii=False) + '\n')
    return rows


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('plan')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    for r in assemble(json.loads(Path(a.plan).read_text()), Path(a.out)):
        print(f"{int(r['at'] // 60)}:{int(r['at'] % 60):02d}  {r['d']:7.2f}s  {r['piece']:12s} {r['name']}")
