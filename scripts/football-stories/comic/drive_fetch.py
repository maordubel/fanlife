"""Download the owner's CLASSIFIED panels from his public Drive folder into a folder OUTSIDE the repository.

    python3 scripts/football-stories/comic/drive_fetch.py --file file01 --out /tmp/classified-panels [--only id1,id2]

Works where Drive is reachable (GitHub Actions). The folder is shared "anyone with the link": no key. A file that comes
back as a web page (Drive's warning or sign-in page) or is not a decodable picture is reported and skipped — never
guessed, never substituted. The panels must never land in the repository: a destination inside it is refused.
"""
from __future__ import annotations

import argparse
import io
import json
import sys
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from comic.manifest import entries, load_manifest, missing_roles  # noqa: E402

REPO = HERE.parents[2]


def inside_repo(p: Path) -> bool:
    p = Path(p).resolve()
    return p == REPO or REPO in p.parents


def is_picture(data: bytes) -> str | None:
    """None when the bytes decode as an image, else the reason."""
    head = data[:64].lstrip().lower()
    if head.startswith(b'<!doctype html') or head.startswith(b'<html'):
        return 'Drive answered with a web page, not the file (is the folder still shared?)'
    try:
        from PIL import Image
        with Image.open(io.BytesIO(data)) as im:
            im.verify()
    except Exception as e:  # noqa: BLE001
        return f'not a picture ({type(e).__name__})'
    return None


def fetch_one(url: str, tries: int = 3) -> bytes:
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'fanlife-classified/1.0'})
            with urllib.request.urlopen(req, timeout=180) as r:
                return r.read()
        except OSError as e:
            last = e
            time.sleep(3 * (attempt + 1))
    raise OSError(str(last))


def fetch(items: list[dict], out: Path, url: str, log=print, getter=fetch_one) -> dict:
    if inside_repo(out):
        raise SystemExit(f'refused: {out} is inside the repository — the owner\'s panels are never stored there')
    out.mkdir(parents=True, exist_ok=True)
    report = {'ok': [], 'failed': []}
    for e in items:
        dst = out / e['file']
        if dst.exists() and is_picture(dst.read_bytes()) is None:
            report['ok'].append(e['id'])
            continue
        try:
            data = getter(url.format(id=e['drive_id']))
            why = is_picture(data)
            if why:
                raise OSError(why)
            dst.write_bytes(data)
            report['ok'].append(e['id'])
            log(f"Drive: {e['id']} ← {e['name']} ({len(data) // 1024} KB)")
        except OSError as err:
            report['failed'].append({'id': e['id'], 'name': e['name'], 'why': str(err)[:200]})
            log(f"Drive: {e['id']} did not download — {err}")
    return report


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--file', default=None, help='file01 · file02 · omitted = everything')
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--only', default='', help='comma-separated ids')
    ap.add_argument('--report', type=Path)
    a = ap.parse_args()
    man = load_manifest()
    items = entries(man, a.file)
    if a.only:
        want = set(a.only.split(','))
        items = [e for e in items if e['id'] in want]
    rep = fetch(items, a.out, man['download_url'])
    for k in ([a.file] if a.file else man['files']):
        miss = missing_roles(man, k)
        rep.setdefault('missing_roles', {})[k] = miss
        if miss:
            print(f'{k}: no panel supplied for {", ".join(miss)}')
    if a.report:
        a.report.write_text(json.dumps(rep, indent=2), encoding='utf-8')
    print(f"Drive: {len(rep['ok'])} downloaded, {len(rep['failed'])} failed")
    return 0 if rep['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
