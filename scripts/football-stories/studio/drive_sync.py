"""Bring pictures from the owner's public Google Drive library into the studio kit.

    python3 -m studio.drive_sync --folder "02_סטודיו_דוקומנטרי_ונכסים/Paper-Cut Football Scene Library" \
        --set papercut-library [--illustrated] [--club olympiacos --season 2023/24] [--limit 200]

The library is listed in `docs/fanlife/drive-library/inventory.json` (built from the Drive listing; it names every file
with its id, folder path and size). This script downloads the pictures under one folder path — the folder and everything
below it — through Drive's public download link, checks each file's size against the inventory, and hands them to
`kit_ingest`, which writes `kit/beats/<set>/<slug>.webp` (≤2048 px) and the set's index.json. Videos and documents are
listed, not ingested: a clip needs its own cut (doc 54).

It runs where Drive is reachable — the `drive-art` GitHub Action — and never needs a key: the folder is shared
"anyone with the link". A file that does not download is reported, never guessed.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

from .common import ROOT

INVENTORY = ROOT / 'docs' / 'fanlife' / 'drive-library' / 'inventory.json'
PICTURE = re.compile(r'\.(png|jpe?g|webp)$', re.I)
URL = 'https://drive.usercontent.google.com/download?id={id}&export=download&confirm=t'


def select(inv: dict, folder: str) -> list[dict]:
    """Every file at or below `folder` (a slash-joined path of folder titles from the library's root)."""
    folder = folder.strip('/')
    return [f for f in inv['files'] if f['path'] == folder or f['path'].startswith(folder + '/')]


def safe_name(f: dict, seen: set[str]) -> str:
    """A file name kit_ingest can slug: the Drive name, with the sub-folder in front when two files share a name."""
    base = re.sub(r'[^A-Za-z0-9._-]+', '-', f['name']).strip('-') or f['id']
    if base.lower() in seen:
        sub = re.sub(r'[^A-Za-z0-9]+', '-', f['path'].split('/')[-1]).strip('-').lower()
        base = f'{sub}-{base}'
    seen.add(base.lower())
    return base


def fetch(file_id: str, dst: Path, expect: int | None) -> None:
    for attempt in range(3):
        try:
            req = urllib.request.Request(URL.format(id=file_id), headers={'User-Agent': 'fanlife-studio/1.0'})
            with urllib.request.urlopen(req, timeout=300) as r:
                data = r.read()
            if data[:15].lower().startswith(b'<!doctype html') or data[:5].lower() == b'<html':
                raise OSError('Drive answered with a web page, not the file (is the folder still shared?)')
            if expect and len(data) != expect:
                raise OSError(f'{len(data)} bytes, the inventory says {expect}')
            dst.write_bytes(data)
            return
        except OSError as e:
            if attempt == 2:
                raise
            print(f'  retry {file_id}: {e}', file=sys.stderr)
            time.sleep(4 * (attempt + 1))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--folder', required=True, help='path of folder titles from the library root')
    ap.add_argument('--set', required=True, help='kit set id: lower-case letters, digits and dashes')
    ap.add_argument('--illustrated', action='store_true', help='the pictures look like photographs or documents')
    ap.add_argument('--club')
    ap.add_argument('--season')
    ap.add_argument('--limit', type=int, default=300)
    ap.add_argument('--work', type=Path, default=Path('drive-download'))
    a = ap.parse_args()
    if not re.fullmatch(r'[a-z0-9-]+', a.set):
        print('set: lower-case letters, digits and dashes', file=sys.stderr)
        return 2
    inv = json.loads(INVENTORY.read_text(encoding='utf-8'))
    files = select(inv, a.folder)
    if not files:
        print(f'No file under "{a.folder}" in the inventory.', file=sys.stderr)
        return 1
    pics = [f for f in files if PICTURE.search(f['name'])][: a.limit]
    others = [f for f in files if not PICTURE.search(f['name'])]
    a.work.mkdir(parents=True, exist_ok=True)
    seen: set[str] = set()
    got, failed = [], []
    for f in pics:
        dst = a.work / safe_name(f, seen)
        try:
            if not dst.exists() or (f.get('bytes') and dst.stat().st_size != int(f['bytes'])):
                fetch(f['id'], dst, int(f['bytes']) if f.get('bytes') else None)
            got.append(dst)
        except OSError as e:
            failed.append(f'{f["path"]}/{f["name"]}: {e}')
    from .kit_ingest import ingest
    masks = {p.name: {'illustrated': True} for p in got} if a.illustrated else {}
    idx = ingest(a.set, got, masks, a.club, a.season, f'Owner library (Google Drive): {a.folder}') if got else None
    print(json.dumps({'folder': a.folder, 'set': a.set, 'pictures': len(got), 'failed': failed,
                      'not_ingested': [f'{f["name"]} ({f["mime"]})' for f in others][:50],
                      'pieces_in_set': len(idx['pieces']) if idx else 0}, ensure_ascii=False, indent=1))
    return 1 if failed and not got else 0


if __name__ == '__main__':
    raise SystemExit(main())
