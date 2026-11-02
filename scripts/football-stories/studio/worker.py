"""The production worker: takes the next film from the studio, makes it, stores it privately, reports back.

Runs in GitHub Actions (.github/workflows/stories-worker.yml) — the network, CPUs and hours a film needs, at no cost on a
public repository. Talks to the studio only through /api/master/stories/worker with the existing CRON secret:
    STORIES_URL (or FAN_LIFE_RESEARCH_URL) · FAN_LIFE_CRON_SECRET
Paid answers (script, voice) are cached in the job directory, which the workflow keeps between runs per job, so a retry
after a crash resumes and never pays twice. The master is uploaded in 45 MB chunks (the storage plan's file limit);
joined back in order they are byte-for-byte the master (sha256 recorded).
"""
from __future__ import annotations

import hashlib
import json
import os
import socket
import sys
import time
import traceback
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

from .common import Palette, StageError, read_json, write_json

CHUNK = 45 * 1024 * 1024


class Stop(Exception):
    def __init__(self, control: str):
        super().__init__(control)
        self.control = control


class Studio:
    def __init__(self, base: str, secret: str, worker: str):
        self.base = base.rstrip('/')
        self.secret = secret
        self.worker = worker

    def call(self, payload: dict, timeout: int = 60) -> dict:
        data = json.dumps({**payload, 'worker': self.worker}).encode()
        for attempt in range(4):
            req = urllib.request.Request(self.base + '/api/master/stories/worker', data=data, method='POST',
                                         headers={'Authorization': 'Bearer ' + self.secret, 'Content-Type': 'application/json'})
            try:
                with urllib.request.urlopen(req, timeout=timeout) as r:
                    return json.load(r)
            except urllib.error.HTTPError as e:
                msg = e.read()[:300].decode('utf-8', 'replace')
                if e.code in (409, 401, 400, 404):
                    raise StageError(f'STUDIO_{e.code}', msg)
                if attempt == 3:
                    raise StageError(f'STUDIO_{e.code}', msg, retryable=True)
            except (urllib.error.URLError, TimeoutError) as e:
                if attempt == 3:
                    raise StageError('STUDIO_UNREACHABLE', str(e), retryable=True)
            time.sleep(4 * (attempt + 1))
        raise StageError('STUDIO_UNREACHABLE', 'no answer', retryable=True)

    def put(self, url: str, path: Path, data: bytes | None = None, ctype: str = 'application/octet-stream') -> None:
        body = data if data is not None else path.read_bytes()
        for attempt in range(4):
            req = urllib.request.Request(url, data=body, method='PUT', headers={'Content-Type': ctype, 'x-upsert': 'true'})
            try:
                with urllib.request.urlopen(req, timeout=600) as r:
                    r.read()
                    return
            except (urllib.error.URLError, TimeoutError) as e:
                if attempt == 3:
                    raise StageError('MEDIA_UPLOAD', f'{path.name}: {e}', retryable=True)
                time.sleep(5 * (attempt + 1))


CTYPES = {'.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.srt': 'application/x-subrip', '.vtt': 'text/vtt', '.zip': 'application/zip', '.json': 'application/json'}


def upload_outputs(st: Studio, job_id: str, job_dir: Path, log) -> dict:
    out = job_dir / 'out'
    master = out / 'master.mp4'
    blob = master.read_bytes()
    sha = hashlib.sha256(blob).hexdigest()
    chunks = [blob[i:i + CHUNK] for i in range(0, len(blob), CHUNK)]
    names = [f'master.{i:03d}.part' for i in range(len(chunks))]
    pkg = out / 'package.zip'
    with zipfile.ZipFile(pkg, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in ['youtube.json', 'description.txt', 'captions.en.srt', 'captions.en.vtt', 'qa.json', 'assets.json']:
            if (out / f).exists():
                z.write(out / f, f)
        for f in ['script.json', 'ledger.json', 'plan.json', 'log.txt']:
            if (job_dir / f).exists():
                z.write(job_dir / f, f)
    files = {'preview.mp4': out / 'preview.mp4', 'contact-sheet.jpg': job_dir / 'contact-sheet.jpg', 'package.zip': pkg,
             'captions.en.srt': out / 'captions.en.srt', 'captions.en.vtt': out / 'captions.en.vtt',
             **{f'thumbnail-{i}.jpg': out / f'thumbnail-{i}.jpg' for i in (1, 2, 3)}}
    files = {k: v for k, v in files.items() if v.exists()}
    urls = st.call({'op': 'upload_urls', 'id': job_id, 'names': names + list(files)})['urls']
    prefix = f'jobs/{job_id}/'
    for n, c in zip(names, chunks):
        st.put(urls[n], master, data=c, ctype='application/octet-stream')
        log(f'Upload: {n} ({len(c) / 1e6:.1f} MB)')
    for n, p in files.items():
        st.put(urls[n], p, ctype=CTYPES.get(p.suffix, 'application/octet-stream'))
    art = {'master': {'chunks': [{'path': prefix + n, 'bytes': len(c)} for n, c in zip(names, chunks)], 'bytes': len(blob), 'sha256': sha},
           'preview': {'path': prefix + 'preview.mp4', 'bytes': files['preview.mp4'].stat().st_size},
           'thumbnails': [{'path': prefix + f'thumbnail-{i}.jpg', 'bytes': files[f'thumbnail-{i}.jpg'].stat().st_size} for i in (1, 2, 3) if f'thumbnail-{i}.jpg' in files],
           'captions': {'srt': {'path': prefix + 'captions.en.srt', 'bytes': files['captions.en.srt'].stat().st_size},
                        'vtt': {'path': prefix + 'captions.en.vtt', 'bytes': files['captions.en.vtt'].stat().st_size}},
           'contact': {'path': prefix + 'contact-sheet.jpg', 'bytes': files['contact-sheet.jpg'].stat().st_size} if 'contact-sheet.jpg' in files else None,
           'package': {'path': prefix + 'package.zip', 'bytes': pkg.stat().st_size}}
    return {k: v for k, v in art.items() if v is not None}


def brief_for_pipeline(job: dict) -> dict:
    b = job['brief']
    return {'club_id': b['club_id'], 'season': b['season'], 'duration': b['duration'], 'topic': b.get('topic') or '',
            'visual_style': b.get('visual_style', 'collage'), 'stop_after': 'script' if b.get('review') == 'script' else None}


def run_once(st: Studio, root: Path, log) -> bool:
    from . import pipeline
    got = st.call({'op': 'claim'})
    job = got.get('job')
    if not job:
        log('No film waiting.')
        return False
    jid = job['id']
    jd = root / jid
    log(f'Job {jid}: {job["brief"]["club_name"]} {job["brief"]["season"]} · {job["brief"]["duration"]} min')
    voice = job['brief'].get('voice', 'auto')
    if voice in ('elevenlabs', 'kokoro'):
        os.environ['STORIES_VOICE'] = voice
    last = {'t': 0.0, 'stage': None}
    pending: list[str] = []

    def progress(stage: str, frac: float, msg: str):
        pending.append(f'{stage}: {msg}')
        now = time.time()
        if stage != last['stage'] or now - last['t'] > 45 or stage == 'done':
            r = st.call({'op': 'progress', 'id': jid, 'stage': stage, 'progress': round(frac, 3), 'message': msg, 'log': pending[-10:]})
            pending.clear()
            last.update(t=now, stage=stage)
            if r.get('control') in ('pause', 'cancel'):
                raise Stop(r['control'])

    try:
        pb = brief_for_pipeline(job)
        result = pipeline.run(jd, pb, Palette.from_json(job['palette']), progress=progress)
        if result.get('state') == 'review' and result.get('stage') == 'script':
            urls = st.call({'op': 'upload_urls', 'id': jid, 'names': ['script.json']})['urls']
            st.put(urls['script.json'], jd / 'script.json', ctype='application/json')
            st.call({'op': 'finish', 'id': jid, 'state': 'needs_review', 'stage': 'script',
                     'artefacts': {'package': {'path': f'jobs/{jid}/script.json', 'bytes': (jd / 'script.json').stat().st_size}}})
            log('Script written; waiting for the owner to approve it.')
            return True
        progress('done', 1.0, 'Uploading the film to private storage')
        art = upload_outputs(st, jid, jd, log)
        out = jd / 'out'
        qa = read_json(out / 'qa.json')
        st.call({'op': 'finish', 'id': jid, 'state': result['state'], 'stage': 'done', 'artefacts': art,
                 'youtube': read_json(out / 'youtube.json'),
                 'qa': {'ok': qa['ok'], 'checks': qa['checks'], 'cannot_prove': qa.get('cannot_prove'), 'rights': qa.get('rights')},
                 'cost': {'renderMinutes': qa.get('render_minutes'), 'voice': read_json(jd / 'voice.json').get('provider')}}, timeout=120)
        log(f'Job {jid}: {result["state"]}')
    except Stop as s:
        log(f'Job {jid}: {s.control} requested by the owner — stopping at a checkpoint.')
    except StageError as e:
        log(f'Job {jid} failed [{e.code}] {e}')
        try:
            st.call({'op': 'finish', 'id': jid, 'state': 'failed', 'error': {'code': e.code, 'message': str(e)[:600], 'retryable': e.retryable}})
        except StageError:
            pass
    except Exception as e:  # an unexpected fault is reported, never swallowed
        log(traceback.format_exc())
        try:
            st.call({'op': 'finish', 'id': jid, 'state': 'failed', 'error': {'code': 'INTERNAL', 'message': f'{type(e).__name__}: {e}'[:600], 'retryable': True}})
        except StageError:
            pass
    return True


def main() -> int:
    base = os.environ.get('STORIES_URL') or os.environ.get('FAN_LIFE_RESEARCH_URL') or 'https://fanlife.dubelteam.com'
    secret = os.environ.get('FAN_LIFE_CRON_SECRET', '')
    if len(secret) < 32:
        print('FAN_LIFE_CRON_SECRET is not set: the worker cannot talk to the studio.', file=sys.stderr)
        return 1
    root = Path(os.environ.get('STORIES_JOBS', 'stories-jobs'))
    st = Studio(base, secret, os.environ.get('GITHUB_RUN_ID', socket.gethostname())[:60] + '-gh')
    log = lambda m: print(time.strftime('%H:%M:%S'), m, flush=True)
    # one film per run: a 6-hour runner is enough for one 25-minute film with room to spare
    run_once(st, root, log)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
