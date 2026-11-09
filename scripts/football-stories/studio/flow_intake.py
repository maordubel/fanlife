"""The Flow operator's mailbox (owner, 9.11.2026: automatic, no login). Runs in GitHub Actions with the worker's cron
secret — stories-flow-intake.yml — and never on the owner's machine.

    python3 -m studio.flow_intake queue     # print what Flow should make now (Shorts, promos, CLASSIFIED panels)
    python3 -m studio.flow_intake intake    # put every file waiting in the `flow-inbox` release into the studio

Claude (a scheduled task on the owner's computer, docs/fanlife/70-flow-operator.md) makes the files in Google Flow and
uploads them as assets of the GitHub release `flow-inbox`, named
    job--<job uuid>--clip-0.mp4 · job--<job uuid>--still-1.jpg      a Short's or promo's slot
    panel--file04--f04-p01.png                                       a CLASSIFIED panel
`intake` checks each file is what it says (an mp4 with frames, a decodable picture), uploads it through the worker door,
records it (a full set of slots queues the edit), and only then deletes the asset. Nothing else is trusted from a name.
"""
from __future__ import annotations

import io
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
FS = HERE.parent
if str(FS) not in sys.path:
    sys.path.insert(0, str(FS))

from studio.common import StageError  # noqa: E402
from studio.worker import Studio  # noqa: E402

TAG = 'flow-inbox'
JOB = re.compile(r'^job--([0-9a-f-]{36})--(clip-\d{1,2}\.mp4|still-\d{1,2}\.(?:jpg|png|webp))$')
PANEL = re.compile(r'^panel--(file\d{2})--(f\d{2}-[a-z0-9-]{1,40})\.(?:png|jpg|jpeg|webp)$')


def panel_needs() -> list[dict]:
    """CLASSIFIED panels the manifest names with no Drive picture but with a Flow prompt (comic/from_script.py)."""
    man = json.loads((FS / 'comic' / 'classified_manifest.json').read_text(encoding='utf-8'))
    out = []
    for k, f in (man.get('files') or {}).items():
        ps = [{'id': p['id'], 'role': p.get('role', ''), 'prompt': p['prompt']} for p in f.get('panels') or []
              if not p.get('drive_id') and isinstance(p.get('prompt'), str) and len(p['prompt']) > 10]
        if ps:
            out.append({'file': k, 'title': f.get('title', ''), 'panels': ps})
    return out


def gh(*args: str, cwd: Path | None = None) -> str:
    return subprocess.run(['gh', *args], check=True, capture_output=True, text=True, cwd=cwd).stdout


def is_video(p: Path) -> str | None:
    try:
        r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries',
                            'stream=nb_read_packets,width,height', '-of', 'json', str(p)], capture_output=True, text=True, timeout=60)
        s = (json.loads(r.stdout or '{}').get('streams') or [{}])[0]
        return None if int(s.get('nb_read_packets') or 0) > 10 else 'no video frames'
    except Exception as e:  # noqa: BLE001
        return f'unreadable ({type(e).__name__})'


def as_picture(p: Path, fmt: str) -> bytes | None:
    try:
        from PIL import Image
        with Image.open(p) as im:
            im.load()
            buf = io.BytesIO()
            im.convert('RGB').save(buf, fmt, **({'quality': 92} if fmt == 'JPEG' else {}))
            return buf.getvalue()
    except Exception:  # noqa: BLE001
        return None


def intake(st: Studio, repo: str, log=print) -> int:
    try:
        assets = json.loads(gh('release', 'view', TAG, '-R', repo, '--json', 'assets'))['assets']
    except subprocess.CalledProcessError:
        log('No flow-inbox release yet — nothing to take in.')
        return 0
    if not assets:
        log('flow-inbox is empty.')
        return 0
    tmp = Path(tempfile.mkdtemp(prefix='flow-'))
    jobs: dict[str, list[tuple[str, Path, str]]] = {}
    panels: dict[str, list[tuple[str, Path, str]]] = {}
    for a in assets:
        n = a['name']
        m, q = JOB.match(n), PANEL.match(n)
        if not (m or q):
            log(f'skipped {n}: not a Flow slot name')
            continue
        gh('release', 'download', TAG, '-R', repo, '-p', n, '-D', str(tmp), '--clobber')
        (jobs.setdefault(m.group(1), []).append((m.group(2), tmp / n, n)) if m else
         panels.setdefault(q.group(1), []).append((q.group(2), tmp / n, n)))
    done = 0
    for jid, files in jobs.items():
        ok = []
        for slot, path, asset in files:
            if slot.endswith('.mp4'):
                why, body, ctype = is_video(path), path.read_bytes(), 'video/mp4'
            else:
                body = as_picture(path, 'JPEG')
                why, ctype = (None if body else 'not a picture'), 'image/jpeg'
            if why:
                log(f'{asset}: refused — {why}')
                continue
            ok.append((slot, body, ctype, asset))
        if not ok:
            continue
        try:
            urls = st.call({'op': 'flow_urls', 'id': jid, 'names': [s for s, *_ in ok]})['urls']
            for slot, body, ctype, _ in ok:
                st.put(urls[slot], Path(slot), data=body, ctype=ctype)
            r = st.call({'op': 'flow_done', 'id': jid, 'files': [s for s, *_ in ok]})
            log(f'job {jid}: {len(r.get("added") or [])} file(s) in, state {r.get("state")}')
        except StageError as e:
            log(f'job {jid}: {e}')
            continue
        for *_, asset in ok:
            gh('release', 'delete-asset', TAG, asset, '-R', repo, '-y')
            done += 1
    for file, items in panels.items():
        ok = [(pid, as_picture(path, 'PNG'), asset) for pid, path, asset in items]
        bad = [a for _, b, a in ok if not b]
        for a in bad:
            log(f'{a}: refused — not a picture')
        ok = [x for x in ok if x[1]]
        if not ok:
            continue
        try:
            urls = st.call({'op': 'flow_urls', 'file': file, 'names': [p for p, *_ in ok]})['urls']
            for pid, body, _ in ok:
                st.put(urls[pid], Path(pid), data=body, ctype='image/png')
            log(f'{file}: {len(ok)} panel(s) in')
        except StageError as e:
            log(f'{file}: {e}')
            continue
        for *_, asset in ok:
            gh('release', 'delete-asset', TAG, asset, '-R', repo, '-y')
            done += 1
    return done


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else 'queue'
    st = Studio(os.environ.get('STORIES_URL', 'https://fanlife.dubelteam.com'), os.environ['FAN_LIFE_CRON_SECRET'],
                f"flow-{os.environ.get('GITHUB_RUN_ID', 'local')}")
    if mode == 'queue':
        q = st.call({'op': 'flow_queue', 'classified': panel_needs()})
        print('FLOW-QUEUE-BEGIN')
        print(json.dumps(q, ensure_ascii=False))
        print('FLOW-QUEUE-END')
        return 0
    if mode == 'intake':
        n = intake(st, os.environ['GITHUB_REPOSITORY'])
        print(f'{n} file(s) taken in')
        return 0
    print('usage: flow_intake queue|intake')
    return 2


if __name__ == '__main__':
    raise SystemExit(main())
