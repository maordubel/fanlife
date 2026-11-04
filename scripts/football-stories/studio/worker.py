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
import re
import socket
import sys
import time
import traceback
import urllib.error
import urllib.request
import zipfile
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
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

    def ping_chat(self) -> str | None:
        """The owner's linked Telegram chat id (Final Whistle link), or None."""
        req = urllib.request.Request(self.base + '/api/master/final-whistle/ping', data=b'{}', method='POST',
                                     headers={'Authorization': 'Bearer ' + self.secret, 'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=30) as r:
            chat = json.load(r).get('chatId')
        return str(chat) if chat else None

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


WAIT_CODES = ('WRITER_BUSY', 'WRITER_QUOTA_DAY')


def retry_at(code: str, now: datetime | None = None) -> str:
    """When a waiting film is tried again: Gemini's free quota resets at midnight Pacific time; a busy writer gets 20 minutes."""
    now = now or datetime.now(timezone.utc)
    if code == 'WRITER_QUOTA_DAY':
        la = now.astimezone(ZoneInfo('America/Los_Angeles'))
        nxt = (la + timedelta(days=1)).replace(hour=0, minute=7, second=0, microsecond=0)
        return nxt.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')
    return (now + timedelta(minutes=20)).isoformat().replace('+00:00', 'Z')


def upload_outputs(st: Studio, job_id: str, job_dir: Path, log) -> dict:
    out = job_dir / 'out'
    master = out / 'master.mp4'
    blob = master.read_bytes()
    sha = hashlib.sha256(blob).hexdigest()
    chunks = [blob[i:i + CHUNK] for i in range(0, len(blob), CHUNK)]
    names = [f'master.{i:03d}.part' for i in range(len(chunks))]
    pkg = out / 'package.zip'
    with zipfile.ZipFile(pkg, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in ['youtube.json', 'description.txt', 'captions.en.srt', 'captions.en.vtt', 'qa.json', 'assets.json', 'shorts.json']:
            if (out / f).exists():
                z.write(out / f, f)
        for f in ['script.json', 'ledger.json', 'plan.json', 'log.txt']:
            if (job_dir / f).exists():
                z.write(job_dir / f, f)
    files = {'preview.mp4': out / 'preview.mp4', 'contact-sheet.jpg': job_dir / 'contact-sheet.jpg', 'package.zip': pkg,
             'captions.en.srt': out / 'captions.en.srt', 'captions.en.vtt': out / 'captions.en.vtt',
             **{f'thumbnail-{i}.jpg': out / f'thumbnail-{i}.jpg' for i in (1, 2, 3)}}
    files = {k: v for k, v in files.items() if v.exists()}
    shorts = [x for x in (read_json(out / 'shorts.json') if (out / 'shorts.json').exists() else []) if Path(x['file']).exists()]
    for i, x in enumerate(shorts, 1):
        files[f'short-{i}.mp4'] = Path(x['file'])
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
           'package': {'path': prefix + 'package.zip', 'bytes': pkg.stat().st_size},
           'shorts': [{'path': prefix + f'short-{i}.mp4', 'bytes': files[f'short-{i}.mp4'].stat().st_size,
                       'hook': x['hook'][:120], 'seconds': x['seconds']} for i, x in enumerate(shorts, 1)] or None}
    return {k: v for k, v in art.items() if v is not None}


def brief_for_pipeline(job: dict, art_dir: Path | None = None) -> dict:
    b = job['brief']
    out = {'club_id': b['club_id'], 'season': b['season'], 'duration': b['duration'], 'topic': b.get('topic') or '',
           'visual_style': b.get('visual_style', 'collage'), 'stop_after': 'script' if b.get('review') == 'script' else None,
           'crowd': b.get('crowd') or 'soft', 'focus_from': b.get('focus_from') or None, 'focus_to': b.get('focus_to') or None, 'notes': b.get('notes') or '',
           # studio v3: what the film is about, its tone, three scripts and the owner's pick
           'kind': b.get('kind') or 'season', 'match_ids': b.get('match_ids') or [], 'opponent': b.get('opponent'),
           'tone': b.get('tone') or 'auto', 'scripts': b.get('scripts') or 1, 'choice': b.get('choice'),
           # a film made from a director's pitch: his script is written first and offered first (studio desk)
           'lead_director': b.get('lead_director') or None}
    if art_dir and b.get('art'):
        out.update(art_dir=str(art_dir), art=b['art'], art_set='job-' + job['id'][:40])
    return out


GENERIC = {'hapoel', 'maccabi', 'fc', 'fk', 'sk', 'ac', 'cf', 'club', 'sporting', 'the'}
# Folders outside 01_Football_Stories that are one club's own pictures (owner, 4.11.2026).
DRIVE_EXTRA = {'hapoel-tel-aviv': ['approved graphics the worker and hapoel 02 stadiums',
                                   'approved graphics the worker and hapoel 03 props shirts']}


def drive_folder_fits(club_id: str, club_name: str, path: str) -> bool:
    """A Drive picture belongs to a club's film when its folder in 01_Football_Stories names the club — by a word of the
    club's name that is not a generic one (Hapoel, Maccabi, FC…), or by every word when all are generic — or when it sits
    in one of the club's own folders elsewhere (DRIVE_EXTRA). Never another club's folder."""
    if any(path.startswith('04 ' + x) or x in path for x in DRIVE_EXTRA.get(club_id, [])):
        return True
    if not path.startswith('01 '):
        return False
    name = re.sub(r'[^a-z0-9]+', ' ', club_name.lower()).split()
    own = [w for w in name if w not in GENERIC and len(w) > 2]
    words = path.split()
    return bool(own) and own[0] in words if own else all(w in words for w in name)


def fetch_drive(job: dict, jd: Path, log) -> Path | None:
    """The owner's Drive material for this film (owner, 4.11.2026: scan Google every time, for this story).
    TARGETED packs first — a folder pasted in the brief, or folders whose names carry the story (studio/drive_scan.py) —
    used as the owner made them; then the club's own folders from the general library. Everything is downloaded into
    jd/drive-art/<pack>/…, and jd/drive-pack.json says which pack each file came from, what it is (a press photo or an
    illustration) and the pack's own notes (README / ASSET_INDEX), so the writer knows what it is holding."""
    if job['brief'].get('drive') is False and not job['brief'].get('drive_folder'):
        return None
    from . import drive_scan, drive_sync
    b = job['brief']
    jd.mkdir(parents=True, exist_ok=True)
    scan_p = jd / 'drive-scan.json'
    if os.environ.get('STORIES_DRIVE_SCAN', '0') != '1':
        tree = drive_scan.static_tree()  # tests and local runs: the last listing only, no network
    elif scan_p.exists():
        tree = json.loads(scan_p.read_text())
    else:
        tree = drive_scan.merged_tree(drive_scan.live_tree(drive_scan.ROOT_ID, log), drive_scan.static_tree())
        pinned = drive_scan.drive_id(b.get('drive_folder'))
        if pinned and not any(f['id'] == pinned for f in tree['folders']):
            sub = drive_scan.live_tree(pinned, log, deadline_s=60, prefix='pinned')
            tree['folders'] = [{'id': pinned, 'path': 'pinned'}, *sub['folders'], *tree['folders']]
            tree['files'] = [*sub['files'], *tree['files']]
        scan_p.write_text(json.dumps(tree, ensure_ascii=False))
        log(f"Drive scan: {len(tree['folders'])} folders, {len(tree['files'])} files")
    p = drive_scan.plan(tree, b)
    fold = lambda s: re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip()  # noqa: E731
    general = [f for f in tree['files'] if drive_sync.PICTURE.search(f['name']) and drive_folder_fits(b['club_id'], b['club_name'], fold(f['path']))
               and f['id'] not in {x['id'] for x in p['pictures']}][:16]
    if p['targeted']:
        log('Drive: targeted packs — ' + ' · '.join(f"{t['path']} ({t['score']:.0f})" for t in p['targeted']))
    else:
        log('Drive: no pack names this story; the club library only')
    d = jd / 'drive-art'
    d.mkdir(parents=True, exist_ok=True)
    rows, got = [], 0
    for f in [*p['pictures'], *[{**g, 'pack': ''} for g in general]]:
        sub = re.sub(r'[^A-Za-z0-9._-]+', '-', f.get('pack') or 'library').strip('-')[-60:] or 'library'
        out = d / sub / re.sub(r'[^A-Za-z0-9._-]+', '-', f['name'])
        out.parent.mkdir(parents=True, exist_ok=True)
        if not out.exists():
            try:
                with urllib.request.urlopen(drive_sync.URL.format(id=f['id']), timeout=180) as r:
                    data = r.read()
                if data[:15].lower().startswith(b'<!doctype html') or data[:5].lower() == b'<html':
                    raise OSError('Drive answered with a page')
                out.write_bytes(data)
            except Exception as e:  # noqa: BLE001 — reported, never guessed
                log(f"Drive: {f['name']} did not download ({type(e).__name__})")
                continue
        got += 1
        rows.append({'file': str(out.relative_to(d)), 'pack': f.get('pack') or '', 'targeted': bool(f.get('pack')),
                     'photo': drive_scan.is_photo(f)})
    notes = []
    for n in p['notes']:
        try:
            with urllib.request.urlopen(drive_sync.URL.format(id=n['id']), timeout=60) as r:
                notes.append({'pack': n['pack'], 'name': n['name'], 'text': r.read(4000).decode('utf-8', 'replace')})
        except Exception:  # noqa: BLE001
            log(f"Drive: note {n['name']} did not download")
    (jd / 'drive-pack.json').write_text(json.dumps({'targeted': p['targeted'], 'files': rows, 'notes': notes}, ensure_ascii=False))
    log(f'Drive: {got} pictures ({sum(r["targeted"] for r in rows)} from the story\'s own packs)')
    return d if got else None


def send_reel(st: Studio, job: dict, jd: Path, log) -> None:
    """The Reel (the first 9:16 cut) to the owner's linked Telegram chat, when the brief asks for it."""
    token = os.environ.get('TELEGRAM_BOT_TOKEN', '').strip()
    reels = sorted((jd / 'out' / 'shorts').glob('*.mp4')) if (jd / 'out' / 'shorts').exists() else []
    if not job['brief'].get('reel_to_telegram') or not token or not reels:
        return
    try:
        ping = st.ping_chat()
        if not ping:
            log('Telegram: no chat linked — the Reel stays in the studio')
            return
        boundary = 'fanlife' + os.urandom(8).hex()
        data = reels[0].read_bytes()
        if len(data) > 49 * 1024 * 1024:
            log('Telegram: the Reel is over 49 MB — not sent')
            return
        cap = f"🎬 {job['brief']['club_name']} · {job['brief']['season']} — the Reel from the studio"
        parts = [f'--{boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n{ping}\r\n'.encode(),
                 f'--{boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n{cap}\r\n'.encode(),
                 f'--{boundary}\r\nContent-Disposition: form-data; name="supports_streaming"\r\n\r\ntrue\r\n'.encode(),
                 f'--{boundary}\r\nContent-Disposition: form-data; name="video"; filename="{reels[0].name}"\r\nContent-Type: video/mp4\r\n\r\n'.encode(),
                 data, f'\r\n--{boundary}--\r\n'.encode()]
        req = urllib.request.Request(f'https://api.telegram.org/bot{token}/sendVideo', data=b''.join(parts),
                                     headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}, method='POST')
        with urllib.request.urlopen(req, timeout=300) as r:
            ok = json.load(r).get('ok')
        log('Telegram: Reel sent' if ok else 'Telegram: the Reel was refused')
        if not ok:
            return
        # the marketing rules (docs/fanlife/51, rule 127): a header, the caption in a copy box, the first comment
        # (the film's link) in a second box, smart tags — composed by the studio itself (lib/stories/social.ts)
        try:
            pk = st.call({'op': 'social_pack', 'id': job['id']})
        except Exception:  # noqa: BLE001 — the Reel is on Telegram either way
            log('Telegram: the ready captions could not be composed — the Reel went alone')
            return
        esc = lambda s: str(s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        packs = pk.get('packs') or {}
        lines = [f"📌 Reel · <b>FOOTBALL STORIES</b> · {esc(pk.get('title'))}",
                 'Ready to post — tap a box to copy it. The Social panel in the studio can publish or schedule it for you.']
        for key, label in (('instagram', 'Instagram / Facebook Reel'), ('tiktok', 'TikTok'), ('x', 'X')):
            p = packs.get(key) or {}
            if p.get('caption'):
                part = ['', f'<b>{label}</b> — caption:', f"<pre>{esc(p['caption'])}</pre>"]
                if p.get('comment'):
                    part += ['First comment:', f"<pre>{esc(p['comment'])}</pre>"]
                if len('\n'.join(lines + part)) < 4000:  # Telegram's limit; never cut a copy box in half
                    lines += part
        text = '\n'.join(lines)
        body = json.dumps({'chat_id': ping, 'text': text, 'parse_mode': 'HTML', 'disable_web_page_preview': True}).encode()
        req = urllib.request.Request(f'https://api.telegram.org/bot{token}/sendMessage', data=body,
                                     headers={'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(req, timeout=60) as r:
            log('Telegram: ready captions sent' if json.load(r).get('ok') else 'Telegram: the captions were refused')
    except Exception as e:  # noqa: BLE001 — the film is ready either way
        log(f'Telegram: the Reel was not sent ({type(e).__name__})')


def fetch_art(st: Studio, job: dict, jd: Path, log) -> Path | None:
    """The owner's pictures named in the brief, downloaded once into the job directory."""
    art = job['brief'].get('art') or []
    if not art:
        return None
    d = jd / 'owner-art'
    d.mkdir(parents=True, exist_ok=True)
    missing = [a['name'] for a in art if not (d / a['name']).exists()]
    if missing:
        urls = st.call({'op': 'art_urls', 'id': job['id']})['urls']
        for n in missing:
            if n not in urls:
                log(f'Art: {n} is named in the brief but not in storage — skipped')
                continue
            with urllib.request.urlopen(urls[n], timeout=300) as r:
                (d / n).write_bytes(r.read())
        log(f'Art: {len(art)} owner pictures ready')
    return d


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
        kind = job.get('kind') or 'film'
        if kind in ('classified', 'vlog'):
            # the studio desk's other productions (studio/kinds.py): same claim, progress, waiting and failure handling
            from . import kinds
            fin = (kinds.run_classified if kind == 'classified' else kinds.run_vlog)(st, job, jd, progress, log)
            progress('done', 1.0, 'Finished')
            st.call({'op': 'finish', 'id': jid, **fin}, timeout=120)
            log(f'Job {jid} ({kind}): {fin["state"]}')
            return True
        if kind != 'film':
            raise StageError('KIND', f'This worker does not know how to make a {kind!r} job — update the worker.')
        pb = brief_for_pipeline(job, fetch_art(st, job, jd, log))
        seen: list[str] = []
        drive = fetch_drive(job, jd, lambda m: (log(m), seen.append(m)))  # every run: a resumed film starts on a clean machine
        for m in [x for x in seen if x.startswith('Drive') and ('targeted' in x or 'pictures' in x or 'no pack' in x)][-2:]:
            progress('research', 0.01, m)  # the studio's Status tab shows the last Drive scans from the job log
        if drive:
            pb['drive_dir'] = str(drive)
            pb['drive_pack'] = str(jd / 'drive-pack.json')
        result = pipeline.run(jd, pb, Palette.from_json(job['palette']), progress=progress)
        if result.get('state') == 'review' and result.get('stage') == 'script' and result.get('options'):
            st.call({'op': 'finish', 'id': jid, 'state': 'needs_review', 'stage': 'script', 'options': result['options']})
            log(f"{len(result['options'])} scripts written; waiting for the owner to choose one.")
            return True
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
        send_reel(st, job, jd, log)
        log(f'Job {jid}: {result["state"]}')
    except Stop as s:
        log(f'Job {jid}: {s.control} requested by the owner — stopping at a checkpoint.')
    except StageError as e:
        if e.code in WAIT_CODES:
            at = retry_at(e.code)
            log(f'Job {jid} waits for the writer until {at} [{e.code}] {e}')
            try:
                st.call({'op': 'finish', 'id': jid, 'state': 'waiting', 'retryAt': at,
                         'error': {'code': e.code, 'message': str(e)[:600], 'retryable': True}})
                return True
            except StageError:
                pass
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
