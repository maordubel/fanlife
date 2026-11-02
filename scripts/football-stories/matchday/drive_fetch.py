"""Pull a Google Drive folder the owner shared as "Anyone with the link · Viewer", with no key and no login.

The folder's own embedded view lists its files and sub-folders; each file is then downloaded through Drive's public
download endpoint. Runs on the GitHub runner (this sandbox cannot reach Drive). A file that cannot be fetched is
reported by name, never skipped silently.

    python3 scripts/football-stories/matchday/drive_fetch.py <folder url or id> <dest>
"""
from __future__ import annotations

import html
import json
import re
import sys
import urllib.request
from pathlib import Path

UA = {'User-Agent': 'Mozilla/5.0 (FAN LIFE matchday survey)'}
ENTRY = re.compile(r'<div class="flip-entry" id="entry-([\w-]+)".*?<div class="flip-entry-title">(.*?)</div>', re.S)


def folder_id(s: str) -> str:
    m = re.search(r'folders/([\w-]+)', s) or re.search(r'id=([\w-]+)', s)
    return m.group(1) if m else s.strip()


def get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def listing(fid: str) -> list[tuple[str, str, bool]]:
    page = get(f'https://drive.google.com/embeddedfolderview?id={fid}#list').decode('utf-8', 'replace')
    out = []
    for m in ENTRY.finditer(page):
        eid, title = m.group(1), html.unescape(re.sub('<[^>]+>', '', m.group(2))).strip()
        is_folder = f'/drive/folders/{eid}' in page
        out.append((eid, title, is_folder))
    return out


def download(fid: str, target: Path) -> int:
    url = f'https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t'
    target.parent.mkdir(parents=True, exist_ok=True)
    part = target.with_suffix(target.suffix + '.part')
    n = 0
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=600) as r, open(part, 'wb') as f:
        if 'text/html' in (r.headers.get('Content-Type') or ''):
            raise RuntimeError('Drive answered with a page, not the file (not shared publicly, or quota)')
        while chunk := r.read(1 << 20):
            f.write(chunk)
            n += len(chunk)
    part.rename(target)
    return n


def fetch(fid: str, dest: Path, report: dict, prefix: str = '') -> None:
    for eid, title, is_folder in listing(fid):
        name = re.sub(r'[\\/:*?"<>|]+', '_', title)
        if is_folder:
            fetch(eid, dest / name, report, f'{prefix}{name}/')
            continue
        try:
            n = download(eid, dest / name)
            report['files'].append({'path': prefix + name, 'drive_id': eid, 'bytes': n})
        except Exception as e:
            report['failed'].append({'path': prefix + name, 'drive_id': eid, 'reason': str(e)[:200]})


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    rep = {'folder': folder_id(sys.argv[1]), 'files': [], 'failed': []}
    fetch(rep['folder'], Path(sys.argv[2]), rep)
    print(json.dumps({'files': len(rep['files']), 'failed': rep['failed'],
                      'gb': round(sum(f['bytes'] for f in rep['files']) / 1e9, 2)}))
    (Path(sys.argv[2]) / '_fetch.json').write_text(json.dumps(rep, indent=2, ensure_ascii=False))
    if not rep['files']:
        sys.exit('nothing downloaded — is the folder shared as "Anyone with the link"?')
