"""Bring an owner art batch into the studio library (docs/fanlife/55-football-stories-art-prompts.md).

    python3 scripts/football-stories/ingest-art.py <batch.zip or folder> [--set <club-id>-<season>]

File names are the keys from the prompt document:
  `*-kr.*`  → common set, the one signal red is repainted into each club's colour (`accent: key-red`)
  `*-n.*`   → common set, no colour
  anything else needs --set and goes to that club's own set.
Stills (jpg/png/webp) become webp under studio/kit/beats/<set>/, clips (mp4/mov/webm) become silent h.264 under
studio/kit/clips/<set>/, and each lands in its folder's index.json with its colour families and source hash. A file
whose name is not a key is reported and skipped; nothing is overwritten without saying so.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import io
import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
KIT = HERE / 'studio' / 'kit'
STILL = {'.jpg', '.jpeg', '.png', '.webp'}
CLIP = {'.mp4', '.mov', '.webm'}


def families(im: Image.Image) -> list[str]:
    a = np.asarray(im.convert('HSV'), 'float32') / 255
    h, s, v = a[..., 0] * 360, a[..., 1], a[..., 2]
    # The families a piece is MADE of (the QA's band, over 2% of the picture): warm paper and olive grass graze the
    # yellow band in a few pixels, which the render-time scrub handles; they do not make a piece a "yellow" piece.
    m = (s >= .35) & (v >= .35)
    f = {'red': m & ((h <= 18) | (h >= 342)), 'yellow': m & (h >= 38) & (h <= 70),
         'green': m & (h >= 90) & (h <= 170), 'blue': m & (h >= 190) & (h <= 260)}
    return sorted(k for k, x in f.items() if x.mean() > 0.02)


def describe(slug: str) -> str:
    return re.sub(r'-(kr|n)$', '', slug).replace('-', ' ').capitalize()


def load_index(folder: Path, set_id: str, note: str) -> dict:
    p = folder / 'index.json'
    if p.exists():
        return json.loads(p.read_text(encoding='utf-8'))
    return {'set': set_id, 'origin': 'owner-upload', 'note': note, 'pieces': []}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('--set', dest='set_id')
    a = ap.parse_args()
    tmp = None
    src = Path(a.src)
    if src.suffix == '.zip':
        tmp = Path(tempfile.mkdtemp())
        with zipfile.ZipFile(src) as z:
            z.extractall(tmp)
        src = tmp
    today = dt.date.today().isoformat()
    done, skipped = [], []
    for f in sorted(p for p in src.rglob('*') if p.is_file() and not p.name.startswith('.')):
        slug = f.stem.lower()
        ext = f.suffix.lower()
        if ext not in STILL | CLIP or not re.fullmatch(r'[a-z0-9-]+', slug):
            skipped.append(f'{f.name}: not a key'); continue
        common = slug.endswith(('-kr', '-n'))
        set_id = 'common' if common else a.set_id
        if not set_id:
            skipped.append(f'{f.name}: a club piece needs --set'); continue
        kind = 'beat' if ext in STILL else 'clip'
        folder = KIT / ('beats' if kind == 'beat' else 'clips') / set_id
        folder.mkdir(parents=True, exist_ok=True)
        idx = load_index(folder, set_id, 'Owner-supplied paper-cut art (AI-generated, supplied by the owner). Fictional figures, no text, no marks.')
        sha = hashlib.sha256(f.read_bytes()).hexdigest()[:16]
        if kind == 'beat':
            im = Image.open(f).convert('RGB')
            if im.width > 2752:
                im = im.resize((2752, round(im.height * 2752 / im.width)), Image.LANCZOS)
            out = folder / f'{slug}.webp'
            im.save(out, quality=88, method=6)
            fam, size = families(im), list(im.size)
        else:
            out = folder / f'{slug}.mp4'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(f), '-an', '-vf', 'scale=1920:-2', '-c:v', 'libx264',
                            '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(out)], check=True)
            png = subprocess.run(['ffmpeg', '-v', 'error', '-sseof', '-1', '-i', str(out), '-frames:v', '1', '-f', 'image2pipe',
                                  '-vcodec', 'png', '-'], capture_output=True, check=True).stdout
            fam, size = families(Image.open(io.BytesIO(png)).convert('RGB')), [1920, 1080]
        key = f'{kind}:{set_id}/{slug}'
        piece = {'key': key, 'description': describe(slug), 'families': fam, 'source': f.name, 'sha256': sha,
                 'size': size, 'supplied': today}
        if slug.endswith('-kr'):
            piece['accent'] = 'key-red'
        old = [p for p in idx['pieces'] if p['key'] == key]
        idx['pieces'] = [p for p in idx['pieces'] if p['key'] != key] + [{**(old[0] if old else {}), **piece}]
        (folder / 'index.json').write_text(json.dumps(idx, indent=1, ensure_ascii=False), encoding='utf-8')
        warn = ''
        if slug.endswith('-n') and fam:
            warn = f'  ⚠ meant to have no colour, prints {fam}'
        if slug.endswith('-kr') and set(fam) - {'red'}:
            warn = f'  ⚠ meant to be red only, prints {fam}'
        done.append(f'{"replaced" if old else "added"} {key}{warn}')
    if tmp:
        shutil.rmtree(tmp)
    print('\n'.join(done + skipped) or 'nothing found')
    print('Edit each piece\'s "description" in index.json: the writer chooses pieces by it.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
