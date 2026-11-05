"""The production pipeline, stage by stage, with a checkpoint after each one.

    python3 -m studio.pipeline --job DIR --club hapoel-tel-aviv --season 1999/00 --minutes 12 [--script FILE]

A stage whose output file exists is skipped, so an interrupted job resumes where it stopped and never repeats a paid
call. `progress(stage, fraction, message)` is how the worker reports to the studio. `--script` supplies a script written
elsewhere (it is validated exactly like the writer's).
"""
from __future__ import annotations

import argparse
import json
import re
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


# The film's grade, applied once at the master. 'archive' is the documentary look (owner, 3.11.2026: "take inspiration
# from The Last Dance"): a warmer, denser picture, moving film grain and a soft vignette — texture, never a filter you notice.
LOOKS = {
    'clean': None,
    'archive': ("eq=contrast=1.07:saturation=0.9:gamma=0.98,"
                "colorbalance=rs=0.03:gs=0.0:bs=-0.04:rm=0.02:bm=-0.03,"
                "noise=c0s=9:c0f=t+u:c1s=3:c1f=t,vignette=angle=PI/5.5"),
    'punch': "eq=contrast=1.08:saturation=1.12,unsharp=5:5:0.6",
    # a night broadcast: cooler, deeper blacks, the floodlights holding the highlights
    'night': ("eq=contrast=1.1:saturation=0.95:brightness=-0.03:gamma=0.96,"
              "colorbalance=rs=-0.03:bs=0.05:rm=-0.02:bm=0.03:rh=0.02:bh=-0.01,vignette=angle=PI/4.5"),
}
# Each visual style finishes with its own grade unless the brief names one (studio v3).
STYLE_LOOK = {'collage': 'clean', 'papercut': 'punch', 'archive': 'archive', 'night': 'night', 'vox': 'clean', 'classic': 'clean'}

STAGES = ['research', 'script', 'voice', 'graphics', 'edit', 'mix', 'master', 'package', 'qa']


def ingest_art(brief: dict, log) -> list[str]:
    """The owner's pictures for this film, the Drive library and the paper-cut set, as beat sets. Idempotent: run again
    on every resume, because each run of the worker starts on a clean machine and only the job's JSON is kept."""
    art_sets: list[str] = []
    if brief.get('art_dir'):
        from . import kit_ingest
        set_id = brief['art_set']
        files = [Path(brief['art_dir']) / a['name'] for a in brief.get('art') or [] if (Path(brief['art_dir']) / a['name']).exists()]
        masks = {a['name']: {'illustrated': True} for a in brief.get('art') or [] if a.get('illustrated')}
        if files:
            kit_ingest.ingest(set_id, files, masks, brief['club_id'], brief['season'], 'Owner pictures uploaded for this film.')
            art_sets.append(set_id)
            log(f'Research: {len(files)} owner pictures as beat:{set_id}/…')
    if brief.get('drive_dir'):
        from . import kit_ingest
        root = Path(brief['drive_dir'])
        pack = read_json(Path(brief['drive_pack'])) if brief.get('drive_pack') and Path(brief['drive_pack']).exists() else None
        rows = pack['files'] if pack else [{'file': str(p.relative_to(root)), 'targeted': False, 'pack': '', 'photo': False}
                                           for p in sorted(root.rglob('*')) if p.is_file()]
        pic = lambda r: (root / r['file']).suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp', '.heic') and (root / r['file']).exists()  # noqa: E731
        groups = {'pack': [r for r in rows if r['targeted'] and pic(r)], 'library': [r for r in rows if not r['targeted'] and pic(r)]}
        for g, rs in groups.items():
            if not rs:
                continue
            set_id = f'pack-{brief["club_id"]}' if g == 'pack' else f'drive-{brief["club_id"]}'
            files = [root / r['file'] for r in rs]
            # the story's own pack is used as the owner made it (owner, 4.11.2026): a press photograph stays a photograph
            masks = {(root / r['file']).name: {'description': (re.sub(r'[_-]+', ' ', Path(r['file']).stem) +
                                                                (' — press photograph of the real event' if r['photo'] else ''))}
                     for r in rs}
            kit_ingest.ingest(set_id, files, masks, brief['club_id'], brief['season'],
                              "The owner's own pack for this story." if g == 'pack' else "The owner's Google Drive library.")
            art_sets.append(set_id)
            log(f'Research: {len(files)} pictures from the Drive {"story pack" if g == "pack" else "library"} as beat:{set_id}/…')
    if brief.get('visual_style') == 'papercut':
        art_sets.append('papercut-library')
    return art_sets


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

    from . import director, research, writer, script as sc, voice, edit, audio, package, qa

    # 1 research
    step('research', 0.0, 'Reading the archive')
    lp = job_dir / 'ledger.json'
    if not lp.exists():
        extra = []
        d = Path(brief['dossier']) if brief.get('dossier') else STUDIO / 'dossiers' / f'{brief["club_id"]}-{brief["season"].replace("/", "-")}.json'
        art_sets: list[str] = []
        base = None
        if d.exists():
            dos = read_json(d)
            extra, art_sets = dos['claims'], dos.get('art_sets') or []
            base = research.dossier_ledger(dos) if dos.get('ledger') == 'dossier' else None
            log(f'Research: {len(extra)} dossier claims from {d.name}')
        notes = research.note_claims(brief.get('notes') or '')
        if notes:
            log(f'Research: {len(notes)} quotes and headlines from the brief')
        kind = brief.get('kind') or 'season'
        if kind == 'rivalry':
            ledger = research.rivalry_ledger(brief['club_id'], brief['opponent'], brief['season'])
            for c in extra + notes:
                research.validate_claim(c)
                ledger['claims'].append(c)
            log(f'Research: every meeting with {brief["opponent"]} ({sum(1 for c in ledger["claims"] if c["fact"].get("kind") == "match")} matches)')
        else:
            ledger = research.build_ledger(brief['club_id'], brief['season'], extra + notes, base)
        if kind in ('match', 'tie') and brief.get('match_ids'):
            ledger = research.pick(ledger, brief['match_ids'])
            log(f'Research: {len(brief["match_ids"])} chosen match(es)')
        elif kind != 'rivalry' and (brief.get('focus_from') or brief.get('focus_to')):
            ledger = research.focus(ledger, brief.get('focus_from'), brief.get('focus_to'))
            log(f'Research: focused on {brief.get("focus_from") or "…"} → {brief.get("focus_to") or "…"} '
                f'({sum(1 for c in ledger["claims"] if c["fact"].get("kind") == "match")} matches)')
        art_sets = [*art_sets, *ingest_art(brief, log)]
        if brief.get('drive_pack') and Path(brief['drive_pack']).exists():
            notes = read_json(Path(brief['drive_pack'])).get('notes') or []
            ledger['pack_notes'] = '\n\n'.join(f"{n['pack']} · {n['name']}\n{n['text']}" for n in notes)[:4000]
        ledger['art_sets'] = art_sets  # owner art made for this film, beyond <club>-<season> and common
        director.attach(ledger)  # the story the record proves (docs/fanlife/66-directors-cut.md §1), after any focus or pick
        write_json(lp, ledger)
        log(f'Research: {len(ledger["claims"])} claims, {len(ledger["held"])} held')
    else:
        # A resumed film (after the owner picked a script) runs on a fresh machine: the pictures are put back in place.
        ingest_art(brief, lambda *_: None)
    ledger = read_json(lp)
    if not isinstance(ledger.get('story'), dict) or ledger['story'].get('version') != director.STORY_VERSION:
        director.attach(ledger)  # a ledger written before the Director's Cut: its story is read off its own claims
        write_json(lp, ledger)

    # 2 script
    step('script', 0.1, 'Writing the film')
    sp_ = job_dir / 'script.json'
    if not sp_.exists():
        if script_file:
            s = read_json(script_file)
            sc.ensure_valid(s, ledger, float(brief['duration']), brief.get('kind'))
            s['_writer'] = [{'source': f'supplied file {script_file.name}'}]
            s = sc.with_cta(s, f"{brief['club_id']}-{brief['season']}{'-' + Path(brief['dossier']).stem if brief.get('dossier') else ''}")
            sc.ensure_valid(s, ledger, float(brief['duration']), brief.get('kind'))
        elif int(brief.get('scripts') or 1) > 1:
            # three scripts, three angles: the owner chooses one in the studio (studio v3)
            opts = sorted(job_dir.glob('script-option-*.json'))
            if not opts:
                made = writer.write_options(brief, {**ledger, 'bans': palette.bans}, cache, log)
                for i, o in enumerate(made, 1):
                    write_json(job_dir / f'script-option-{i}.json', o)
                opts = sorted(job_dir.glob('script-option-*.json'))
            choice = brief.get('choice')
            if not choice:
                return {'state': 'review', 'stage': 'script', 'options': [writer.option_summary(read_json(p), int(p.stem.rsplit('-', 1)[1])) for p in opts]}
            chosen = job_dir / f'script-option-{int(choice)}.json'
            if not chosen.exists():
                raise StageError('CHOICE', f'Script {choice} is not among the written options')
            s = read_json(chosen)
            log(f'Script: option {choice} chosen by the owner')
        else:
            s = writer.write_script(brief, {**ledger, 'bans': palette.bans}, cache, log)
        s = sc.with_cta(s, f"{brief['club_id']}-{brief['season']}{'-' + Path(brief['dossier']).stem if brief.get('dossier') else ''}")
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
    # the engine: VOX (one paper board the camera glides across) is the documentary default; STORIES_VOX=0 or a brief
    # with engine/visual_style 'classic' keeps the classic edit
    from . import vox
    plan['engine'] = vox.engine_for(brief)
    write_json(plan_p, plan)
    log(f'Edit: {len(plan["shots"])} shots, {plan["duration"] / 60:.2f} minutes, engine {plan["engine"]}')
    step('edit', 0.4, f'Rendering {len(plan["shots"])} shots')
    picture = job_dir / 'picture.mp4'
    if not picture.exists():
        render = edit.render_film
        if plan['engine'] == 'vox':
            from .vox.render import render_film as render
        render(job_dir, plan, palette, log, workers=int(os.environ.get('STORIES_WORKERS', '0')) or None,
               tick=lambda d, t: step('edit', 0.4 + 0.38 * d / max(t, 1), f'Rendering shots: {d} of {t}'))

    # 6 mix
    step('mix', 0.8, 'Mixing sound')
    mix = job_dir / 'mix' / 'mix.m4a'
    if not mix.exists():
        audio.build_mix(job_dir, plan, log, brief.get('crowd') or 'soft', brief.get('music') or 'auto',
                        tags=[x for x in (brief.get('tone'), brief.get('kind')) if x], seed=f"{brief.get('club_id')}|{brief.get('season')}")

    # 7 master + preview
    step('master', 0.85, 'Mastering')
    out = job_dir / 'out'
    out.mkdir(exist_ok=True)
    master = out / 'master.mp4'
    if not master.exists():
        kb = master_kbps(plan['duration'])
        look = LOOKS.get(brief.get('look') or STYLE_LOOK.get(brief.get('visual_style') or 'collage', 'clean'))
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(picture), '-i', str(mix), '-map', '0:v', '-map', '1:a',
                        *(['-vf', look] if look else []),
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
    used = job_dir / 'mix' / 'track.txt'
    if used.exists():
        t = audio.music_track(used.read_text(encoding='utf-8').strip())
        manifest['assets'] = [a for a in manifest['assets'] if a['id'] != 'score'] + [
            {'id': 'music-' + t['id'], 'kind': 'music', 'owner': f"{t['artist']} — {t['title']}", 'origin': t['origin'],
             'licence': t['licence'], 'credit': t.get('credit'), 'credit_source': t.get('credit_source'), 'photoreal': False}]
    write_json(out / 'assets.json', manifest)
    meta = package.youtube_metadata(s, plan, ledger, manifest)
    # the hook engine (studio/thumbs): three thumbnails, three hooks, and the Shorts cover — listed in youtube.json
    meta['thumbnails'] = package.thumbnails(s, ledger, palette, out, director=brief.get('director'))
    write_json(out / 'youtube.json', meta)
    (out / 'description.txt').write_text(meta['description'], encoding='utf-8')

    # 9 qa
    step('qa', 0.95, 'Checking the film')
    report = qa.check(job_dir, master, plan, cues, float(brief['duration']), palette, log)
    report['rights'] = rights_gaps(manifest)
    report['render_minutes'] = round((time.time() - t_start) / 60, 1)
    write_json(out / 'qa.json', report)

    # 10 shorts: every Short the script proposes, cut from the finished master (a failure costs the Shorts, not the film)
    shorts_p = out / 'shorts.json'
    if not shorts_p.exists():
        step('qa', 0.97, 'Cutting the Shorts')
        try:
            from . import shorts
            made = shorts.auto(job_dir, s, ledger['club_name'], ledger['season'], palette.accent)
            write_json(shorts_p, made)
            log(f'Shorts: {len(made)} cut')
        except Exception as e:  # noqa: BLE001 — reported, never swallowed silently
            log(f'Shorts: none cut ({type(e).__name__}: {e})')
            write_json(shorts_p, [])
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
    # every owner art set the script draws on beyond the common kit, with what it is
    from .paper import beat_index
    keys = {v.get(k) for ch in script.get('chapters') or [] for b in ch.get('beats') or [] for v in [b.get('visual') or {}]
            for k in ('art', 'backdrop') if isinstance(v.get(k), str)}
    from .paper import clip_index
    real = [p['key'] for set_id in sorted({k.split(':', 1)[1].split('/')[0] for k in keys if k and k.startswith(('beat:', 'clip:'))})
            for p in beat_index(set_id) + clip_index(set_id) if p['key'] in keys and (p.get('owner_photo') or p.get('owner_footage'))]
    if real:
        rows.append({'id': 'owner-footage', 'kind': 'photo/video', 'owner': 'FanLife (filmed by the owner in the stand)', 'origin': 'owner',
                     'licence': 'owned', 'photoreal': False, 'pieces': real,
                     'note': 'Real photos and phone clips from the stand that night; sound and metadata removed, no identifiable face.'})
    for set_id in sorted({k[5:].split('/')[0] for k in keys if k and k.startswith('beat:')} - {'common'}):
        pieces = [p for p in beat_index(set_id) if p['key'] in keys and not p.get('owner_photo')]
        if pieces:
            drawn = [p['key'] for p in pieces if p.get('illustrated')]
            rows.append({'id': f'art-{set_id}', 'kind': 'illustration', 'owner': 'FanLife (owner-supplied, AI-generated)', 'origin': 'ai-generated',
                         'licence': 'owned', 'photoreal': bool(drawn), 'pieces': len(pieces), 'illustrated': drawn,
                         'note': ('Some pictures are AI illustrations drawn to look like photographs or documents, based on match reports; '
                                  'marked ILLUSTRATION on screen. Personal details and newspaper marks are blurred.' if drawn else
                                  'Owner illustrations made for this film.')})
    # the moving-art library the cinema animated (studio/cinema/library.py): every piece, by name, from the plan
    plan_p = job_dir / 'plan.json'
    if plan_p.exists():
        used = sorted({e['key'] for sh in read_json(plan_p).get('shots') or [] for e in (sh.get('cinema') or {}).get('lib') or []})
        if used:
            rows.append({'id': 'moving-art-library', 'kind': 'illustration', 'owner': 'FanLife (owner-supplied, AI-generated)',
                         'origin': 'ai-generated', 'licence': 'owned', 'photoreal': False, 'pieces': used,
                         'note': 'Paper-cut pieces from the owner\'s "Dynamic Football Fan Art" folder, animated by the studio; '
                                 'fictional figures seen from behind, no identifiable person.'})
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
    ap.add_argument('--look', choices=list(LOOKS), default='clean', help='the grade at the master: clean, archive (documentary), punch')
    ap.add_argument('--music', default='auto', help="the score: an owner track (track:<id> from kit/music/index.json) or 'auto'")
    ap.add_argument('--crowd', choices=['soft', 'off'], default='soft', help='crowd reactions at goals: soft (default) or none')
    ap.add_argument('--dossier', type=Path, help='a film\'s own dossier when a season has more than one film')
    a = ap.parse_args()
    pals = read_json(a.palette) if a.palette else {}
    pal = Palette.from_json(pals.get(a.club) or {'club_id': a.club, 'club_name': a.club, 'primary': '#B02D10', 'bans': []})
    brief = {'club_id': a.club, 'season': a.season, 'duration': a.minutes, 'topic': a.topic, 'crowd': a.crowd, 'music': a.music, 'look': a.look,
             **({'dossier': str(a.dossier)} if a.dossier else {})}
    try:
        r = run(a.job, brief, pal, script_file=a.script)
    except StageError as e:
        print(f'FAILED [{e.code}] {e}', file=sys.stderr)
        return 1
    print(json.dumps({k: v for k, v in r.items() if k != 'qa'}), r.get('qa', {}).get('ok'))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
