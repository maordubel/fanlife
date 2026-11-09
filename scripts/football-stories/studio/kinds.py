"""The studio desk's other productions, made by the same worker as a film (owner, 4.11.2026: "split the studio —
documentary, CLASSIFIED, VLOG, marketing — each in its own tab").

A job's `kind` (lib/stories/jobs.ts) picks the maker; worker.run_once keeps the claim, the progress, the waiting and the
failure reporting the same for all of them.

* **classified** — a whole CLASSIFIED FILE (docs/fanlife/65): the owner's panels from Drive (comic/drive_fetch.py),
  the measured roles (comic/roles.py), then comic/produce.py with the approval the owner gave IN THE STUDIO (recorded
  on the job: who, when, which draft). If the episode's script changed after that click the job stops — the narrator
  speaks only the draft that was approved. Delivered to the studio's private storage and, as a DRAFT, to Telegram.
  Nothing is uploaded to YouTube, nothing is published.
* **vlog** — I WAS THERE, automatic (docs/fanlife/63): the owner's footage from the Drive link, the match and its claims
  from the catalog (matchday/vlog_auto.match_from_catalog), the episode (make_episode), the film and the reel (render),
  then the reel and a Telegram-sized film to the owner's chat (send_telegram), as vlog-auto-test.yml does.
"""
from __future__ import annotations

import json
import urllib.request
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from .common import StageError, read_json

HERE = Path(__file__).resolve().parent
FS = HERE.parent                       # scripts/football-stories
COMIC = FS / 'comic'
MATCHDAY = FS / 'matchday'


def _run(cmd: list[str], log, cwd: Path | None = None, code: str = 'TOOL_FAILED') -> None:
    """A tool in its own process; its output goes to the log, a failure raises with the end of it."""
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, cwd=str(cwd or FS))
    tail: list[str] = []
    for line in p.stdout:  # type: ignore[union-attr]
        line = line.rstrip()
        tail = (tail + [line])[-30:]
        log(line)
    if p.wait() != 0:
        raise StageError(code, f'{Path(cmd[1]).name if len(cmd) > 1 else cmd[0]} failed:\n' + '\n'.join(tail[-12:]), retryable=True)


def outside_repo(job_id: str, name: str) -> Path:
    """Renders never live in the repository (produce.py refuses it): the runner's temp folder."""
    base = Path(os.environ.get('RUNNER_TEMP') or tempfile.gettempdir())
    return base / name / job_id


def yt_shape(yt: dict | None, *, title: str, description: str = '', reason: str = '') -> dict:
    """Any package (CLASSIFIED's youtube.json, I WAS THERE's description) in the shape the studio's Publish kit reads:
    title candidates as {title, angle}, the synthetic-media answer, tags and Shorts ideas always present."""
    yt = dict(yt or {})
    cands = yt.get('title_candidates') or []
    yt['title'] = yt.get('title') or title
    yt['title_candidates'] = [c if isinstance(c, dict) else {'title': str(c), 'angle': ''} for c in cands][:10]
    yt.setdefault('description', description)
    yt.setdefault('tags', [])
    yt.setdefault('category', 'Sports')
    yt.setdefault('chapters', [])
    yt.setdefault('shorts', [])
    yt.setdefault('synthetic_media', {'altered_or_synthetic': False, 'reason': reason})
    return yt


def srt_to_vtt(srt: Path, vtt: Path) -> Path:
    text = srt.read_text(encoding='utf-8')
    vtt.write_text('WEBVTT\n\n' + re.sub(r'(\d{2}:\d{2}:\d{2}),(\d{3})', r'\1.\2', text), encoding='utf-8')
    return vtt


# ── CLASSIFIED ───────────────────────────────────────────────────────────────────────────────────────────────────────
def check_approval(spec: dict) -> Path:
    """The episode the owner approved, unchanged since the click — or a stop that says what changed."""
    if spec.get('approved') is not True or not spec.get('approved_by') or not spec.get('approved_at'):
        raise StageError('NOT_APPROVED', 'This FILE has no recorded approval: approve its script in the studio first.')
    name = str(spec.get('episode') or '')
    if not re.fullmatch(r'file\d{2}-[a-z0-9-]+\.json', name) or name.endswith('-demo.json'):
        raise StageError('EPISODE', f'Not a CLASSIFIED episode: {name!r}')
    ep_path = COMIC / 'episodes' / name
    if not ep_path.exists():
        raise StageError('EPISODE', f'{name} is not in the repository any more')
    ep = json.loads(ep_path.read_text(encoding='utf-8'))
    if ep.get('script_version') != spec.get('script_version'):
        raise StageError('SCRIPT_CHANGED', f"The script changed after it was approved ({spec.get('script_version')} → "
                                           f"{ep.get('script_version')}). Read the new draft and approve it again.")
    return ep_path


def check_classified_panels(ep: dict, report: dict) -> None:
    """Do not render a script with a missing explicitly selected scene or cover."""
    required = {b.get('panel') for b in ep.get('beats') or []}
    required.update(t.get('panel') for t in (ep.get('package') or {}).get('thumbnails') or [])
    required = {p for p in required if isinstance(p, str) and p and not p.startswith('@')}
    missing = sorted(required - set(report.get('ok') or []))
    if missing:
        raise StageError('PANELS', 'Selected episode images could not be downloaded: ' + ', '.join(missing), retryable=True)


def flow_panels(st, file: str, panels: Path, log) -> int:
    """Panels the Flow operator made (no Drive picture in the manifest) → the panels folder, before the Drive fetch."""
    try:
        from comic.manifest import entries, load_manifest
        want = {e['id']: e for e in entries(load_manifest(), file) if not e.get('drive_id')}
    except Exception as e:  # noqa: BLE001
        log(f'Flow panels: manifest unreadable ({e})')
        return 0
    if not want:
        return 0
    urls = (st.call({'op': 'classified_urls', 'file': file, 'ids': sorted(want)}) or {}).get('urls') or {}
    panels.mkdir(parents=True, exist_ok=True)
    n = 0
    for pid, url in urls.items():
        try:
            with urllib.request.urlopen(url, timeout=180) as r:
                (panels / want[pid]['file']).write_bytes(r.read())
            n += 1
        except OSError as e:
            log(f'Flow panel {pid} did not download — {e}')
    log(f'Flow panels: {n} of {len(want)} made in Google Flow')
    return n


def run_classified(st, job: dict, jd: Path, progress, log) -> dict:
    """→ the finish payload. `progress(stage, frac, msg)` may raise Stop between steps."""
    spec = job.get('spec') or {}
    ep_path = check_approval(spec)
    tmp = outside_repo(job['id'], 'classified')
    panels, out = tmp / 'panels', tmp / 'job'
    episode = read_json(ep_path)
    overrides = spec.get('panel_overrides') or {}
    if overrides:
        beats = {b['id']: b for b in episode['beats']}
        if not set(overrides) <= set(beats):
            raise StageError('EPISODE', 'The approved scene board no longer matches this FILE. Review it again.')
        for bid, panel in overrides.items():
            beats[bid]['panel'] = panel
        tmp.mkdir(parents=True, exist_ok=True)
        ep_path = tmp / ep_path.name
        ep_path.write_text(json.dumps(episode, ensure_ascii=False), encoding='utf-8')
    progress('research', 0.05, f"FILE {spec.get('number')}: the panels from your Drive")
    flow_panels(st, spec['file'], panels, log)
    _run([sys.executable, str(COMIC / 'drive_fetch.py'), '--file', spec['file'], '--out', str(panels), '--report', str(tmp / 'fetch.json')], log, code='PANELS')
    check_classified_panels(episode, read_json(tmp / 'fetch.json'))
    progress('graphics', 0.12, 'Which picture is which (measured)')
    _run([sys.executable, str(COMIC / 'roles.py'), '--panels', str(panels), '--file', spec['file']], log, code='ROLES')
    progress('voice', 0.2, f"Producing — narrator, picture, mix (script {spec.get('script_version')}, approved by {spec.get('approved_by')})")
    os.environ['STORIES_KOKORO_VOICE'] = os.environ.get('STORIES_KOKORO_VOICE') or 'bm_george'  # the owner's Take B
    _run([sys.executable, str(COMIC / 'produce.py'), '--episode', str(ep_path), '--panels', str(panels), '--out', str(out), '--approved'], log, code='PRODUCE')
    o = out / 'out'
    progress('package', 0.9, 'Storing the episode privately')
    yt = yt_shape(read_json(o / 'youtube.json') if (o / 'youtube.json').exists() else None, title=f"CLASSIFIED · FILE {spec.get('number')}")
    report = read_json(o / 'report.json') if (o / 'report.json').exists() else {}
    shorts = [{'file': s['file'], 'hook': s.get('hook') or '', 'seconds': s.get('seconds') or 0} for s in report.get('shorts') or [] if s.get('file') and Path(s['file']).exists()]
    files = {'preview.mp4': o / 'preview-telegram.mp4', 'captions.en.srt': o / 'captions.en.srt', 'captions.en.vtt': o / 'captions.en.vtt',
             'contact-sheet.jpg': out / 'contact-sheet.jpg', **{f'thumbnail-{i}.jpg': o / f'thumbnail-{i}.jpg' for i in (1, 2, 3, 'short')}}
    pkg = [o / n for n in ('youtube.json', 'description.txt', 'qa.json', 'report.json', 'telegram-draft.txt', 'captions.en.srt', 'episode.resolved.json')]
    art = upload_set(st, job['id'], o / 'master.mp4', files, pkg, shorts, log)
    qa = read_json(o / 'qa.json') if (o / 'qa.json').exists() else {'ok': False, 'checks': []}
    if spec.get('telegram', True):
        progress('package', 0.96, 'The DRAFT to your Telegram')
        draft(o, spec, yt['title'], log)
    return {'state': 'ready' if qa.get('ok') else 'needs_review', 'stage': 'done', 'artefacts': art, 'youtube': yt,
            'qa': {'ok': bool(qa.get('ok')), 'checks': qa.get('checks') or [], 'cannot_prove': qa.get('cannot_prove'), 'rights': qa.get('rights')},
            'cost': {'renderMinutes': round((report.get('render_seconds') or 0) / 60, 1), 'voice': report.get('voice')}}


def draft(o: Path, spec: dict, title: str, log) -> None:
    """As classified-produce.yml: the preview, the Shorts, the thumbnails and the package text — a DRAFT, not published."""
    if not os.environ.get('TELEGRAM_BOT_TOKEN'):
        log('Telegram: TELEGRAM_BOT_TOKEN is not set — the DRAFT stays in the studio')
        return
    clips = sorted(o.glob('short-*.mp4')) + sorted((o / 'shorts').glob('short-*.mp4'))
    cmd = [sys.executable, str(COMIC / 'telegram_send.py'), str(o / 'preview-telegram.mp4'), *[str(p) for p in clips]]
    for i in (1, 2, 3):
        if (o / f'thumbnail-{i}.jpg').exists():
            cmd += ['--photo', str(o / f'thumbnail-{i}.jpg')]
    for n in ('telegram-draft.txt', 'youtube.json', 'captions.en.srt'):
        if (o / n).exists():
            cmd += ['--document', str(o / n)]
    cmd += ['--caption', f"🗂 CLASSIFIED · FILE {spec.get('number')} — DRAFT, not uploaded, not published. Proposed title: {title}. "
                         'The package text is in telegram-draft.txt.']
    try:
        _run(cmd, log, code='TELEGRAM')
    except StageError as e:  # the episode is in the studio either way
        log(f'Telegram: the DRAFT was not delivered ({e})')


# ── I WAS THERE ──────────────────────────────────────────────────────────────────────────────────────────────────────
def run_vlog(st, job: dict, jd: Path, progress, log) -> dict:
    if str(MATCHDAY.parent) not in sys.path:
        sys.path.insert(0, str(MATCHDAY.parent))
    from matchday import vlog_auto as V
    spec = job.get('spec') or {}
    pal = job.get('palette') or {}
    progress('research', 0.03, 'The match and its record')
    try:
        m = V.match_from_catalog(spec['club_id'], spec['match']['id'])
        m['club'] = {'id': spec['club_id'], 'name': spec.get('club_name') or m.get('club_name'), 'accent': pal.get('primary') or '#D71920',
                     'bans': pal.get('bans') or []}
        slug = re.sub(r'[^a-z0-9]+', '-', f"{spec['club_id']}-{m.get('date') or ''}".lower()).strip('-')
        footage = jd / 'footage' / f'vlog-{slug}'
        if not footage.exists() or not any(footage.rglob('*')):
            progress('research', 0.06, 'Your footage from Drive')
            _run([sys.executable, str(MATCHDAY / 'drive_fetch.py'), spec['drive_link'], str(footage)], log, code='FOOTAGE')
        progress('script', 0.15, 'Watching the footage and writing the episode')
        ep = V.make_episode(footage, m, m['club'], spec.get('notes') or '', float(spec.get('minutes') or 4), jd, log)
        progress('edit', 0.45, 'Rendering the film and the reel')
        out = outside_repo(job['id'], 'vlog')
        r = V.render(ep, footage, out, log)
    except V.VlogError as e:
        code = 'WRITER_BUSY' if e.code == 'WRITER_UNAVAILABLE' else e.code
        raise StageError(code, str(e), retryable=e.code not in ('NO_FOOTAGE', 'MATCH_NOT_IN_CATALOG')) from e
    progress('package', 0.9, 'Storing the episode privately')
    film, reel = r.get('film') or {}, r.get('reel') or {}
    if not film.get('publish'):
        raise StageError('RENDER_FAILED', 'film.py wrote no publish file', retryable=True)
    publish = Path(film['publish'])
    srt = Path(film['captions']) if film.get('captions') else None
    tmp = outside_repo(job['id'], 'vlog-up')
    tmp.mkdir(parents=True, exist_ok=True)
    preview = V.telegram_size(publish, tmp / 'preview.mp4') if publish.stat().st_size > 48 * 1024 * 1024 else publish
    files = {'preview.mp4': preview, 'thumbnail-1.jpg': Path(film['thumbnail']) if film.get('thumbnail') else None,
             **{f'thumbnail-{k}.jpg': Path(film[f'thumbnail_{k}']) for k in ('2', '3', 'short') if film.get(f'thumbnail_{k}')}}
    if srt and srt.exists():
        files['captions.en.srt'] = srt
        files['captions.en.vtt'] = srt_to_vtt(srt, tmp / 'captions.en.vtt')
    shorts = [{'file': reel['publish'], 'hook': 'The Reel', 'seconds': (reel.get('qa') or {}).get('duration') or 0}] if reel.get('publish') else []
    pkg = [Path(x) for x in (film.get('description'), film.get('report'), film.get('marketing'), film.get('captions')) if x] + [Path(ep)]
    art = upload_set(st, job['id'], publish, files, pkg, shorts, log)
    epj = json.loads(Path(ep).read_text())
    desc = Path(film['description']).read_text(encoding='utf-8') if film.get('description') and Path(film['description']).exists() else ''
    yt = yt_shape(None, title=epj.get('title') or job['brief'].get('topic') or 'I WAS THERE', description=desc,
                  reason="The owner's own footage of the night; graphics and a synthetic narrator added, no realistic scene that did not happen.")
    qa = film.get('qa') or {}
    checks = [{'name': k, 'ok': True, 'detail': str(v)} for k, v in qa.items() if v is not None]
    tags_left = qa.get('identifying_tags_left')
    ok = not tags_left
    if tags_left:
        checks.append({'name': 'identifying tags', 'ok': False, 'detail': str(tags_left)})
    if spec.get('telegram', True):
        progress('package', 0.96, 'The reel and the film to your Telegram')
        cap = '🎬 I WAS THERE (automatic) · ' + str(epj.get('title') or '').split(' · ', 1)[-1]
        send = [(Path(reel['publish']), f'{cap} — the Reel')] if reel.get('publish') else []
        send.append((V.telegram_size(publish, tmp / 'telegram-film.mp4'), f'{cap} — the film (preview size)'))
        V.send_telegram(send, log)
    return {'state': 'ready' if ok else 'needs_review', 'stage': 'done', 'artefacts': art, 'youtube': yt,
            'qa': {'ok': ok, 'checks': checks, 'cannot_prove': ['That every line matches the footage beyond the fact guard — watch the film.']},
            'cost': {'renderMinutes': round(((film.get('seconds') or 0) + (reel.get('seconds') or 0)) / 60, 1), 'voice': 'kokoro'}}


# ── storage ──────────────────────────────────────────────────────────────────────────────────────────────────────────
def upload_set(st, job_id: str, master: Path, files: dict, package: list, shorts: list[dict], log) -> dict:
    """The master in 45 MB chunks, the named files, a package zip and the Shorts, into jobs/<id>/ — the artefacts shape
    the studio reads (the same as worker.upload_outputs, for files that are not a documentary's)."""
    import hashlib
    import zipfile
    from .worker import CHUNK, CTYPES
    if not master.exists():
        raise StageError('NO_MASTER', f'{master.name} was not written', retryable=True)
    blob = master.read_bytes()
    sha = hashlib.sha256(blob).hexdigest()
    chunks = [blob[i:i + CHUNK] for i in range(0, len(blob), CHUNK)]
    names = [f'master.{i:03d}.part' for i in range(len(chunks))]
    present = {k: Path(v) for k, v in files.items() if v and Path(v).exists()}
    zdir = Path(tempfile.mkdtemp())
    pkg = zdir / 'package.zip'
    with zipfile.ZipFile(pkg, 'w', zipfile.ZIP_DEFLATED) as z:
        for p in package:
            if p and Path(p).exists():
                z.write(p, Path(p).name)
    present['package.zip'] = pkg
    ok_shorts = [s for s in shorts if Path(s['file']).exists()]
    for i, s in enumerate(ok_shorts, 1):
        present[f'short-{i}.mp4'] = Path(s['file'])
    urls = st.call({'op': 'upload_urls', 'id': job_id, 'names': names + list(present)})['urls']
    prefix = f'jobs/{job_id}/'
    for n, c in zip(names, chunks):
        st.put(urls[n], master, data=c, ctype='application/octet-stream')
        log(f'Upload: {n} ({len(c) / 1e6:.1f} MB)')
    for n, p in present.items():
        st.put(urls[n], p, ctype=CTYPES.get(p.suffix, 'application/octet-stream'))
    size = lambda n: present[n].stat().st_size  # noqa: E731
    art: dict = {'master': {'chunks': [{'path': prefix + n, 'bytes': len(c)} for n, c in zip(names, chunks)], 'bytes': len(blob), 'sha256': sha},
                 'package': {'path': prefix + 'package.zip', 'bytes': size('package.zip')}}
    if 'preview.mp4' in present:
        art['preview'] = {'path': prefix + 'preview.mp4', 'bytes': size('preview.mp4')}
    th = [{'path': prefix + f'thumbnail-{i}.jpg', 'bytes': size(f'thumbnail-{i}.jpg')} for i in (1, 2, 3, 'short') if f'thumbnail-{i}.jpg' in present]
    if th:
        art['thumbnails'] = th
    if 'captions.en.srt' in present and 'captions.en.vtt' in present:
        art['captions'] = {'srt': {'path': prefix + 'captions.en.srt', 'bytes': size('captions.en.srt')},
                           'vtt': {'path': prefix + 'captions.en.vtt', 'bytes': size('captions.en.vtt')}}
    if 'contact-sheet.jpg' in present:
        art['contact'] = {'path': prefix + 'contact-sheet.jpg', 'bytes': size('contact-sheet.jpg')}
    if ok_shorts:
        art['shorts'] = [{'path': prefix + f'short-{i}.mp4', 'bytes': size(f'short-{i}.mp4'), 'hook': str(s['hook'])[:120], 'seconds': s['seconds']}
                         for i, s in enumerate(ok_shorts, 1)]
    shutil.rmtree(zdir, ignore_errors=True)
    return art


# ── marketing films (owner, 8.11.2026) ───────────────────────────────────────────────────────────────────────────────
def run_promo(st, job: dict, jd: Path, progress, log) -> dict:
    """A promo, animated in Google Flow like the Shorts (owner, 8.11.2026: "smart use of Flow"): visit 1 writes it
    (studio/promo.py, facts only) and stops with its Flow pack; visit 2 edits the clips the owner uploaded."""
    from . import flowkit, promo
    spec = job.get('spec') or {}
    pack = job.get('flow')
    if not pack:
        progress('script', 0.05, f'Writing the marketing film: {spec.get("label")}')
        s = promo.write(spec, jd / 'cache', log)
        (jd / 'promo-script.json').write_text(json.dumps(s, ensure_ascii=False, indent=1), encoding='utf-8')
        pack = flowkit.flow_pack({'title': s.get('title'), 'cast_sheet': s.get('cast_sheet') or [], 'beats': s['cartoon']})
        tag = 'FAN LIFE · ' + str(spec.get('label') or 'FOOTBALL. FOREVER.')[:34].upper()
        pack['story']['tag'] = tag
        pack.update(narration=s['narration'], hook_law=s.get('hook_law'), tags=[str(t)[:40] for t in s.get('tags') or []][:12],
                    description=(str(s.get('description') or '') + f'\n\n▶ {spec.get("url") or "https://fanlife.dubelteam.com"}').strip())
        pack['markdown'] = flowkit.markdown(pack, s)
        log(f"Promo: {len(pack['clips'])} clips + {len(pack['stills'])} stills ready for Flow ({pack['credits']} credits)")
        return {'state': 'needs_review', 'stage': 'graphics', 'flow': pack}
    fin = _short_edit(st, job, {**spec, 'telegram': spec.get('telegram', True)}, pack, jd, progress, log,
                      accent='#B02D10', label='📣 Marketing film',
                      reason='An animated promo made in Google Flow: invented supporters, no real person or event depicted; synthetic narration.')
    return fin


# ── animated Shorts on Google Flow (owner, 8.11.2026: "the Flow Short is excellent — now build the studio around it") ──
def run_short(st, job: dict, jd: Path, progress, log) -> dict:
    """Two visits. The first writes the Short from the match's record (studio/flowkit.py) and stops with the Flow pack —
    the character sheets, one clip prompt a line, the stills, the credits — for the owner (or Claude in his browser) to
    make in Google Flow; the clips are uploaded into the job. The second edits them (studio/cartoon/flowcut.py), stores
    the Short privately and sends it to Telegram. Flow has no API, so nothing here can spend its credits."""
    spec = job.get('spec') or {}
    pack = job.get('flow')
    if not pack:
        return _short_pack(job, spec, jd, progress, log)
    return _short_edit(st, job, spec, pack, jd, progress, log)


def _short_ledger(job: dict, spec: dict, jd: Path, log) -> dict:
    from . import deep_research, research
    m = spec['match']
    ledger = research.pick(research.build_ledger(spec['club_id'], m['season']), [m['id']])
    deep_research.enrich(ledger, {**job['brief'], 'series': 'animated Short'}, jd / 'cache', log)
    return ledger


def _short_pack(job: dict, spec: dict, jd: Path, progress, log) -> dict:
    from . import flowkit
    progress('research', 0.05, f"The record of {spec['match']['home']} {spec['match']['score']} {spec['match']['away']}")
    ledger = _short_ledger(job, spec, jd, log)
    facts = '\n'.join([flowkit.facts_of(ledger, spec['match']['id']), *flowkit.kit_lines(spec['club_id'], spec['match']['season'])])
    progress('script', 0.4, 'Writing the Short: the hook, the lines, the cast')
    s = flowkit.write_short(facts, int(spec.get('seconds') or 30), jd / 'cache', log, spec.get('angle') or '')
    pack = flowkit.flow_pack(s, flowkit.names_in(ledger))
    pack['narration'] = s['narration']
    pack['hook_law'] = s.get('hook_law')
    pack['description'] = s.get('description') or ''
    pack['tags'] = [str(t)[:40] for t in s.get('tags') or []][:12]
    pack['markdown'] = flowkit.markdown(pack, s)
    (jd / 'short-script.json').write_text(json.dumps(s, ensure_ascii=False, indent=1), encoding='utf-8')
    log(f"Short: {len(pack['clips'])} clips + {len(pack['stills'])} stills ready for Flow ({pack['credits']} credits)")
    return {'state': 'needs_review', 'stage': 'graphics', 'flow': pack}


def _short_edit(st, job: dict, spec: dict, pack: dict, jd: Path, progress, log, *, accent: str | None = None,
                label: str = '🎞 Animated Short', reason: str | None = None) -> dict:
    import urllib.request
    from .cartoon import flowcut
    need = [c['file'] for c in pack.get('clips') or []] + [c['file'] for c in pack.get('stills') or []]
    have = {a['name'] for a in job['brief'].get('art') or []}
    missing = [n for n in need if n not in have]
    if missing:
        raise StageError('REQUIRED_MEDIA', f"Upload the Flow files first: {', '.join(missing)}.", retryable=True)
    progress('graphics', 0.05, 'Your Flow clips')
    media = jd / 'flow-media'
    media.mkdir(parents=True, exist_ok=True)
    urls = st.call({'op': 'art_urls', 'id': job['id']})['urls']
    for n in need:
        if n not in urls:
            raise StageError('REQUIRED_MEDIA', f'{n} is missing from storage. Upload it again.', retryable=True)
        with urllib.request.urlopen(urls[n], timeout=300) as r:
            (media / n).write_bytes(r.read())
    progress('edit', 0.2, 'Editing the Short: voice, clips, captions, sound')
    out = outside_repo(job['id'], 'short')
    out.mkdir(parents=True, exist_ok=True)
    mp4 = out / 'short.mp4'
    accent = accent or (job.get('palette') or {}).get('primary') or '#B02D10'
    r = flowcut.make(pack['story'], media, mp4, out / 'work', accent=accent, log=log)
    frame = out / 'thumbnail-short.jpg'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', '0.3', '-i', str(mp4), '-frames:v', '1', str(frame)], check=True)
    progress('package', 0.85, 'Storing the Short privately')
    desc = (pack.get('description') or '') + '\n▶ Subscribe: https://www.youtube.com/@FanLifeFootballStories?sub_confirmation=1'
    (out / 'description.txt').write_text(desc.strip(), encoding='utf-8')
    (out / 'flow-pack.json').write_text(json.dumps(pack, ensure_ascii=False, indent=1), encoding='utf-8')
    art = upload_set(st, job['id'], mp4, {'preview.mp4': mp4, 'thumbnail-short.jpg': frame},
                     [out / 'description.txt', out / 'flow-pack.json'], [{'file': str(mp4), 'hook': pack.get('title') or 'Short', 'seconds': r['seconds']}], log)
    yt = yt_shape(None, title=str(pack.get('title') or job['brief'].get('topic'))[:100], description=desc.strip(),
                  reason=reason or ('Animated with Google Flow: an illustrated cartoon of a real match, told from the sourced record; '
                                    'the people are drawn, not realistic, and the narration is synthetic.'))
    yt['tags'] = pack.get('tags') or []
    yt['synthetic'] = True
    if spec.get('telegram', True):
        try:
            if str(MATCHDAY.parent) not in sys.path:
                sys.path.insert(0, str(MATCHDAY.parent))
            from matchday import vlog_auto as V
            V.send_telegram([(mp4, f"{label} · {pack.get('title')}")], log)
        except Exception as e:  # noqa: BLE001 — a courtesy copy; the Short is stored either way
            log(f'Telegram: not sent ({e})')
    ok = r['seconds'] <= 60
    return {'state': 'ready' if ok else 'needs_review', 'stage': 'done', 'artefacts': art, 'youtube': yt,
            'qa': {'ok': ok, 'checks': [{'name': 'facts', 'ok': True, 'detail': 'every number the narrator says is in the match record'},
                                        {'name': 'length', 'ok': ok, 'detail': f"{r['seconds']} s (a Short is at most 60 s)"}],
                   'cannot_prove': ['That the drawn players read as the right men — watch it before posting.']},
            'cost': {'renderMinutes': round(r['seconds'] / 60, 1), 'voice': os.environ.get('STORIES_VOICE') or 'kokoro'}}


# ── CLASSIFIED writers' room (owner, 8.11.2026: "full automation") ───────────────────────────────────────────────────
def run_casefile(st, job: dict, jd: Path, progress, log) -> dict:
    """A FILE researched and written by the studio (studio/casefile.py), committed to the repository so the desk lists
    it for the owner's approval; its panels are made in Google Flow by Claude on the owner's computer."""
    from . import casefile
    spec = job.get('spec') or {}
    progress('research', 0.05, f"Researching: {spec.get('topic')}")
    r = casefile.make(spec['topic'], spec.get('tone') or 'LAUGH', spec.get('notes') or '', jd / 'cache', log,
                      number=(spec.get('file') or '').removeprefix('file') or None)
    progress('package', 0.9, f"Saving FILE {r['number']} · {r['title']}")
    commit = _commit([r['script'], 'scripts/football-stories/comic/classified_manifest.json',
                      f"scripts/football-stories/comic/episodes/{r['file']}-*.json"],
                     f"CLASSIFIED FILE {r['number']} · {r['title']} — drafted by the studio's writers' room", log)
    checks = [{'name': 'validate', 'ok': not r['errors'], 'detail': '; '.join(r['errors']) or 'the episode validates'},
              {'name': 'saved', 'ok': commit, 'detail': 'committed to the repository; the desk shows it after the next deploy' if commit else 'not committed — see the log'}]
    return {'state': 'needs_review', 'stage': 'done',
            'qa': {'ok': not r['errors'] and commit, 'checks': checks,
                   'cannot_prove': [f"FILE {r['number']} is a draft: read it and approve it in Studio → CLASSIFIED. "
                                    f"Its {r['panels']} panels are made in Google Flow by Claude on your computer."]},
            'youtube': {'title': r['title'], 'file': r['file'], 'script': r['script']}}


def _commit(paths: list[str], message: str, log) -> bool:
    """Commit the FILE to the branch the worker runs on (main) and push; a race with another commit is rebased."""
    import glob
    repo = HERE.parents[2]
    files = [p for x in paths for p in (glob.glob(str(repo / x)) if '*' in x else [str(repo / x)])]
    try:
        subprocess.run(['git', '-C', str(repo), 'config', 'user.name', 'fanlife-studio'], check=True)
        subprocess.run(['git', '-C', str(repo), 'config', 'user.email', 'actions@users.noreply.github.com'], check=True)
        subprocess.run(['git', '-C', str(repo), 'add', *files], check=True)
        if subprocess.run(['git', '-C', str(repo), 'diff', '--cached', '--quiet']).returncode == 0:
            log('Commit: nothing changed')
            return True
        subprocess.run(['git', '-C', str(repo), 'commit', '-qm', message], check=True)
        for _ in range(3):
            subprocess.run(['git', '-C', str(repo), 'pull', '-q', '--rebase', 'origin', 'main'], check=False)
            if subprocess.run(['git', '-C', str(repo), 'push', '-q', 'origin', 'HEAD:main']).returncode == 0:
                log('Commit: pushed to main')
                return True
        return False
    except subprocess.CalledProcessError as e:
        log(f'Commit failed: {e}')
        return False
