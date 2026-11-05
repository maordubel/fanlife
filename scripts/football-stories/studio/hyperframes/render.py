"""Rendering VOX through HyperFrames: one composition per chapter (its board shots), rendered by `hyperframes render`,
normalised to the studio's encode and concatenated with the classic shots (`follow`, `end`) that the PIL engine draws.
The same contract as edit.render_film / vox.render.render_film: shot cue files for the mix, `picture.mp4` back.

    python3 -m studio.hyperframes.render --job DIR --palette palettes.json [--chapter 0] [--fps 30] [--out x.mp4]
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import time
from pathlib import Path

from ..common import FPS, Palette, StageError, read_json, write_json
from .build import HERE, Composition

PIN = 'hyperframes'  # resolved through studio/hyperframes/package.json (npm ci there); npx as the fallback


def cli() -> list[str]:
    local = HERE / 'node_modules' / '.bin' / 'hyperframes'
    if local.exists():
        return [str(local)]
    ver = json.loads((HERE / 'package.json').read_text())['dependencies']['hyperframes']
    return ['npx', '--yes', f'hyperframes@{ver}']


def browser() -> str | None:
    """chrome-headless-shell when one is on the machine (the fast BeginFrame capture path), else HyperFrames' own."""
    if os.environ.get('HYPERFRAMES_BROWSER_PATH'):
        return os.environ['HYPERFRAMES_BROWSER_PATH']
    roots = [Path('/opt/pw-browsers'), Path.home() / '.cache' / 'ms-playwright']
    for r in roots:
        if not r.exists():
            continue
        for pat in ('chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell',
                    'chromium_headless_shell-*/chrome-linux/headless_shell'):
            for p in sorted(r.glob(pat)):
                return str(p)
    return None


def env() -> dict:
    e = dict(os.environ)
    e.update({'HYPERFRAMES_NO_TELEMETRY': '1', 'HYPERFRAMES_NO_UPDATE_CHECK': '1', 'HYPERFRAMES_SKIP_SKILLS': '1'})
    b = browser()
    if b:
        e['HYPERFRAMES_BROWSER_PATH'] = b
    return e


def hf_render(project: Path, out: Path, fps: int, log, quality: str = 'standard', workers: int | None = None) -> dict:
    cmd = cli() + ['render', str(project), '-o', str(out), '--fps', str(fps), '--quality', quality]
    if workers:
        cmd += ['--workers', str(workers)]
    t0 = time.time()
    r = subprocess.run(cmd, env=env(), capture_output=True, text=True, timeout=7200)
    took = time.time() - t0
    tail = (r.stdout + r.stderr).strip().splitlines()[-12:]
    for ln in tail:
        log(f'HyperFrames: {ln}')
    if r.returncode != 0 or not out.exists():
        raise StageError('HF_RENDER_FAILED', f'hyperframes render failed ({r.returncode}): {" | ".join(tail[-3:])}', retryable=True)
    return {'seconds': round(took, 1), 'log': tail}


def render_chapter(job_dir: Path, plan: dict, palette: Palette, shots: list[dict], out: Path, log, fps: int = FPS,
                   workers: int | None = None) -> dict:
    from ..edit import Editor
    ed = Editor(job_dir, read_json(job_dir / 'ledger.json'), read_json(job_dir / 'script.json'), read_json(job_dir / 'voice.json'),
                palette, job_dir / 'art')
    proj = job_dir / 'hf' / f'chapter-{shots[0]["chapter"]:02d}'
    if proj.exists():
        shutil.rmtree(proj)
    t0 = time.time()
    comp = Composition(ed, plan, proj, shots, fps=fps)
    comp.write()
    built = time.time() - t0
    log(f'HyperFrames: chapter {shots[0]["chapter"]} composed in {built:.1f}s ({len(comp.shots)} beats, {comp.duration:.1f}s)')
    # the cue files the mix reads, exactly as the PIL engine writes them
    sd = job_dir / 'shots'
    sd.mkdir(parents=True, exist_ok=True)
    for s in shots:
        write_json(sd / f'shot-{s["n"]:04d}.cues.json', {'cues': comp.cues()[s['n']], 'kind': s['visual']['type'], 'engine': 'vox-hf', 'required_asset': s.get('required_asset')})
    r = hf_render(proj, out, fps, log, workers=workers)
    return {'compose_s': round(built, 1), 'render_s': r['seconds'], 'duration': comp.duration, 'fps': fps}


def render_film(job_dir: Path, plan: dict, palette: Palette, log, workers: int | None = None, only=None, tick=None) -> Path:
    """The whole film: chapters through HyperFrames, the classic shots through the PIL engine, one picture.mp4."""
    from ..vox.compose import CLASSIC
    from ..vox.render import _render_range
    parts: list[tuple[int, Path]] = []
    runs: list[list[dict]] = []
    for s in plan['shots']:
        if s['visual']['type'] in CLASSIC:
            runs.append([s])
        elif runs and runs[-1][0]['visual']['type'] not in CLASSIC and runs[-1][0]['chapter'] == s['chapter']:
            runs[-1].append(s)
        else:
            runs.append([s])
    pd = job_dir / 'shots'
    pd.mkdir(parents=True, exist_ok=True)
    write_json(job_dir / 'plan.json', plan)
    t0 = time.time()
    for k, run in enumerate(runs):
        i0 = plan['shots'].index(run[0])
        if run[0]['visual']['type'] in CLASSIC:
            _render_range((str(job_dir), str(job_dir / 'plan.json'), palette.to_json(), [i0], str(pd)))
            parts.append((i0, pd / f'shot-{i0:04d}.mp4'))
        else:
            raw = job_dir / 'hf' / f'chapter-{run[0]["chapter"]:02d}.mp4'
            norm = pd / f'hf-{i0:04d}.mp4'
            if not norm.exists():
                render_chapter(job_dir, plan, palette, run, raw, log, FPS, workers)
                # the studio's own encode, so the parts concatenate without a re-encode of the whole film
                subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(raw), '-an', '-r', str(FPS), '-c:v', 'libx264', '-preset', 'veryfast',
                                '-crf', '19', '-pix_fmt', 'yuv420p', '-g', str(FPS * 2), str(norm)], check=True)
            parts.append((i0, norm))
        if tick:
            tick(k + 1, len(runs))
    lst = pd / 'list-hf.txt'
    lst.write_text(''.join(f"file '{p.name}'\n" for _, p in parts))
    silent = job_dir / 'picture.mp4'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', str(silent)], check=True)
    frames = sum(s['frames'] for s in plan['shots'])
    log(f'HyperFrames: {frames} frames in {time.time() - t0:.0f}s ({(time.time() - t0) / max(1, frames) * 1000:.0f} ms a frame)')
    return silent


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--job', type=Path, required=True)
    ap.add_argument('--palette', type=Path, required=True)
    ap.add_argument('--plan', type=Path)
    ap.add_argument('--chapter', type=int, default=None)
    ap.add_argument('--fps', type=int, default=FPS)
    ap.add_argument('--workers', type=int, default=None)
    ap.add_argument('--out', type=Path)
    a = ap.parse_args()
    led = read_json(a.job / 'ledger.json')
    pal = Palette.from_json(read_json(a.palette)[led['club_id']])
    plan = read_json(a.plan or a.job / 'plan.json')
    from ..vox.compose import CLASSIC
    shots = [s for s in plan['shots'] if s['visual']['type'] not in CLASSIC and (a.chapter is None or s['chapter'] == a.chapter)]
    out = a.out or a.job / 'hf' / 'chapter.mp4'
    out.parent.mkdir(parents=True, exist_ok=True)
    r = render_chapter(a.job, plan, pal, shots, out, print, a.fps, a.workers)
    print(json.dumps(r))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
