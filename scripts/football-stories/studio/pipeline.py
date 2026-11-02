"""The production pipeline, stage by stage, with a checkpoint after each one.

    python3 -m studio.pipeline --job DIR --club hapoel-tel-aviv --season 1999/00 --minutes 12 [--script FILE]

A stage whose output file exists is skipped, so an interrupted job resumes where it stopped and never repeats a paid
call. `progress(stage, fraction, message)` is how the worker reports to the studio. `--script` supplies a script written
elsewhere (it is validated exactly like the writer's).
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

from .common import STUDIO, Palette, StageError, read_json, write_json

# The private bucket holds a film until it is uploaded; the free plan stores 1 GB in all, so a master is encoded to fit.
MASTER_BUDGET_MB = 800


def master_kbps(seconds: float) -> int:
    """Video bitrate for the master: YouTube's 1080p ceiling (12 Mb/s) or what fits MASTER_BUDGET_MB with 192 kb/s audio."""
    return int(max(3000, min(12000, MASTER_BUDGET_MB * 8 * 1000 / max(30.0, seconds) - 192)))


STAGES = ['research', 'script', 'voice', 'graphics', 'edit', 'mix', 'master', 'package', 'qa']


def run(job_dir: Path, brief: dict, palette: Palette, progress=None, script_file: Path | None = None) -> dict:
    job_dir.mkdir(parents=True, exist_ok=True)
    cache = job_dir / 'cache'
    cache.mkdir(exist_ok=True)
    logf = (job_dir / 'log.txt').open('a', encoding='utf-8')
    t_start = time.time()

    def log(msg: str):
        line = time.strftime('%H:%M:%S') + ' ' + msg
        logf.write(line + '\n')
        logf.flush()
        print(line, flush=True)

    def step(stage: str, frac: float, msg: str = ''):
        if progress:
            progress(stage, frac, msg)

    from . import research, writer, script as sc, voice, edit, audio, package, qa
    from .sprites import SpriteFactory

    # 1 research
    step('research', 0.0, 'Reading the archive')
    lp = job_dir / 'ledger.json'
    if not lp.exists():
        extra = []
        d = STUDIO / 'dossiers' / f'{brief["club_id"]}-{brief["season"].replace("/", "-")}.json'
        if d.exists():
            extra = read_json(d)['claims']
            log(f'Research: {len(extra)} dossier claims from {d.name}')
        ledger = research.build_ledger(brief['club_id'], brief['season'], extra)
        write_json(lp, ledger)
        log(f'Research: {len(ledger["claims"])} claims, {len(ledger["held"])} held')
    ledger = read_json(lp)

    # 2 script
    step('script', 0.1, 'Writing the film')
    sp_ = job_dir / 'script.json'
    if not sp_.exists():
        if script_file:
            s = read_json(script_file)
            sc.ensure_valid(s, ledger, float(brief['duration']))
            s['_writer'] = [{'source': f'supplied file {script_file.name}'}]
            s = sc.with_cta(s)
            sc.ensure_valid(s, ledger, float(brief['duration']))
        else:
            s = writer.write_script(brief, {**ledger, 'bans': palette.bans}, cache, log)
        s = sc.with_cta(s)
        write_json(sp_, s)
        log(f'Script: "{sc.selected_title(s)}" · {sum(len(b["narration"].split()) for *_, b in sc.all_beats(s))} words')
    s = read_json(sp_)
    if brief.get('stop_after') == 'script':
        return {'state': 'review', 'stage': 'script'}

    # 3 voice
    step('voice', 0.2, 'Recording narration')
    vp = job_dir / 'voice.json'
    if not vp.exists():
        write_json(vp, voice.voice_script(s, job_dir / 'voice', cache / 'voice', log))
    v = read_json(vp)

    # 4 graphics + 5 edit
    step('graphics', 0.35, 'Drawing graphics')
    ed = edit.Editor(job_dir, ledger, s, v, palette, job_dir / 'art')
    plan_p = job_dir / 'plan.json'
    plan = ed.plan()
    write_json(plan_p, plan)
    log(f'Edit: {len(plan["shots"])} shots, {plan["duration"] / 60:.2f} minutes')
    step('edit', 0.4, f'Rendering {len(plan["shots"])} shots')
    picture = job_dir / 'picture.mp4'
    if not picture.exists():
        edit.render_film(job_dir, plan, palette, log, workers=int(os.environ.get('STORIES_WORKERS', '0')) or None)

    # 6 mix
    step('mix', 0.8, 'Mixing sound')
    mix = job_dir / 'mix' / 'mix.m4a'
    if not mix.exists():
        audio.build_mix(job_dir, plan, log)

    # 7 master + preview
    step('master', 0.85, 'Mastering')
    out = job_dir / 'out'
    out.mkdir(exist_ok=True)
    master = out / 'master.mp4'
    if not master.exists():
        kb = master_kbps(plan['duration'])
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(picture), '-i', str(mix), '-map', '0:v', '-map', '1:a',
                        '-c:v', 'libx264', '-preset', os.environ.get('STORIES_MASTER_PRESET', 'medium'), '-profile:v', 'high', '-crf', '18',
                        '-maxrate', f'{kb}k', '-bufsize', f'{kb * 2}k', '-pix_fmt', 'yuv420p', '-g', '50', '-c:a', 'aac', '-b:a', '192k',
                        '-shortest', '-movflags', '+faststart', str(out / 'master.part.mp4')], check=True)
        (out / 'master.part.mp4').rename(master)
    preview = out / 'preview.mp4'
    if not preview.exists():
        # under 45 MB whatever the length (the storage plan's per-file limit): bitrate from duration
        kbps = max(220, min(1400, int(40 * 8 * 1000 / max(30, plan['duration'])) - 96))
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(master), '-vf', 'scale=-2:540', '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', f'{kbps}k',
                        '-maxrate', f'{kbps * 2}k', '-bufsize', f'{kbps * 2}k', '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-movflags', '+faststart', str(out / 'preview.part.mp4')], check=True)
        (out / 'preview.part.mp4').rename(preview)

    # 8 package
    step('package', 0.9, 'Packaging for YouTube')
    cues = package.captions(plan)
    package.write_captions(cues, out)
    manifest = {
        'voice': {'provider': v['provider'], 'cloned_real_person': False,
                  'credit': ('ElevenLabs synthetic voice' if v['provider'] == 'elevenlabs' else 'Kokoro synthetic British voice (open model, Apache-2.0)')},
        'assets': asset_ledger(job_dir, s),
    }
    write_json(out / 'assets.json', manifest)
    meta = package.youtube_metadata(s, plan, ledger, manifest)
    write_json(out / 'youtube.json', meta)
    (out / 'description.txt').write_text(meta['description'], encoding='utf-8')
    with SpriteFactory(palette, job_dir / 'sprites') as sp:
        package.thumbnails(sp, s, ledger, out)

    # 9 qa
    step('qa', 0.95, 'Checking the film')
    report = qa.check(job_dir, master, plan, cues, float(brief['duration']), palette, log)
    report['rights'] = rights_gaps(manifest)
    report['render_minutes'] = round((time.time() - t_start) / 60, 1)
    write_json(out / 'qa.json', report)
    step('done', 1.0, 'Ready for review')
    return {'state': 'ready' if report['ok'] and not report['rights'] else 'needs_review', 'qa': report}


def asset_ledger(job_dir: Path, script: dict) -> list[dict]:
    rows = [
        {'id': 'kit-graphics', 'kind': 'graphics', 'owner': 'FanLife (owner-supplied kits, 2 Nov 2026)', 'origin': 'owner', 'licence': 'owned', 'photoreal': False},
        {'id': 'kit-illustrations', 'kind': 'illustration', 'owner': 'FanLife (owner-supplied, AI-generated)', 'origin': 'ai-generated', 'licence': 'owned', 'photoreal': False,
         'note': 'Paper-cut collage (owner-supplied, AI-generated); symbolic scenes, fictional figures, no identifiable person.'},
        {'id': 'natural-earth', 'kind': 'map data', 'owner': 'Natural Earth', 'origin': 'world-atlas npm package', 'licence': 'public domain', 'photoreal': False},
        {'id': 'weekly-fonts', 'kind': 'fonts', 'owner': 'Archivo, Ultra, Shrikhand, Knewave (OFL)', 'origin': 'public/fonts', 'licence': 'SIL Open Font License', 'photoreal': False},
        {'id': 'score', 'kind': 'music', 'owner': 'FanLife', 'origin': 'synthesised by studio/audio.py for this film', 'licence': 'owned', 'photoreal': False},
        {'id': 'crowd', 'kind': 'sound', 'owner': 'FanLife (owner recordings, public/life/sfx/crowd-real-*)', 'origin': 'owner', 'licence': 'owned', 'photoreal': False,
         'note': 'Atmosphere only; not the sound of the matches described.'},
    ]
    for f in sorted((job_dir / 'art').glob('*.json')) if (job_dir / 'art').exists() else []:
        rows.append(read_json(f))
    return rows


def rights_gaps(manifest: dict) -> list[str]:
    return [f'{a["id"]}: licence not documented' for a in manifest['assets'] if not a.get('licence')]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--job', type=Path, required=True)
    ap.add_argument('--club', required=True)
    ap.add_argument('--season', required=True)
    ap.add_argument('--minutes', type=float, default=12)
    ap.add_argument('--topic', default='')
    ap.add_argument('--palette', type=Path, help='JSON from scripts/football-stories/palettes.ts')
    ap.add_argument('--script', type=Path)
    a = ap.parse_args()
    pals = read_json(a.palette) if a.palette else {}
    pal = Palette.from_json(pals.get(a.club) or {'club_id': a.club, 'club_name': a.club, 'primary': '#B02D10', 'bans': []})
    brief = {'club_id': a.club, 'season': a.season, 'duration': a.minutes, 'topic': a.topic}
    try:
        r = run(a.job, brief, pal, script_file=a.script)
    except StageError as e:
        print(f'FAILED [{e.code}] {e}', file=sys.stderr)
        return 1
    print(json.dumps({k: v for k, v in r.items() if k != 'qa'}), r.get('qa', {}).get('ok'))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
