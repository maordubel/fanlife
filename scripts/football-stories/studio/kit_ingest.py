"""Bring an owner's art drop into the studio kit as one beat set.

    python3 -m studio.kit_ingest --set olympiacos-maccabi-2024 --club olympiacos --season 2023/24 \
        --src <file or folder> ... [--masks masks.json] [--note "..."]

Every picture becomes `kit/beats/<set>/<slug>.webp` (2048 px wide at most) and a row in that set's index.json, so a script
can say `beat:<set>/<slug>`. A masks file blurs out what must not be printed — a name and an ID number on a ticket, a
masthead and a byline on a page made to look like a newspaper:

    {"<source file name>": {"slug": "...", "description": "...", "illustrated": true,
                            "blur": [[x0, y0, x1, y1], ...]}}

`illustrated: true` marks a picture drawn to look like a photograph or a document: the film prints ILLUSTRATION on it,
and the upload says so in YouTube's altered-content question. `families` are measured, not typed: the colour families
that cover more than 3% of the picture, so a club whose rival owns one gets it scrubbed (rule 95).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import date
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

from .paper import BEATS, HUES

MAX_W = 2048


def families(im: Image.Image) -> list[str]:
    hsv = np.asarray(im.convert('RGB').resize((256, 160)).convert('HSV'), 'float32')
    deg, sat, val = hsv[..., 0] * (360 / 255), hsv[..., 1] / 255, hsv[..., 2] / 255
    live = (sat >= 0.25) & (val >= 0.2)
    out = []
    for fam, bands in HUES.items():
        hit = np.zeros(deg.shape, bool)
        for lo, hi in bands:
            hit |= (deg >= lo) & (deg <= hi)
        if (hit & live).mean() > 0.03:
            out.append(fam)
    return out


def blur_out(im: Image.Image, boxes: list[list[int]]) -> Image.Image:
    """Make printed text unreadable while keeping the paper's grain: a heavy blur, lifted towards the paper's own tone."""
    im = im.convert('RGB')
    for x0, y0, x1, y1 in boxes:
        box = (max(0, x0), max(0, y0), min(im.width, x1), min(im.height, y1))
        reg = im.crop(box)
        soft = reg.filter(ImageFilter.GaussianBlur(18))
        tone = Image.new('RGB', reg.size, tuple(int(c) for c in np.asarray(reg).reshape(-1, 3).mean(0)))
        im.paste(Image.blend(soft, tone, 0.55), box[:2])
    return im


def slug_of(name: str) -> str:
    s = re.sub(r'[^a-z0-9]+', '-', Path(name).stem.lower()).strip('-')
    return s or 'piece'


def ingest(set_id: str, sources: list[Path], masks: dict, club: str | None, season: str | None, note: str) -> dict:
    if not re.fullmatch(r'[a-z0-9-]+', set_id):
        raise SystemExit('set must be lower-case letters, digits and dashes')
    out_dir = BEATS / set_id
    out_dir.mkdir(parents=True, exist_ok=True)
    idx_p = out_dir / 'index.json'
    index = json.loads(idx_p.read_text(encoding='utf-8')) if idx_p.exists() else {
        'set': set_id, 'club': club, 'season': season, 'origin': 'owner-upload', 'supplied': date.today().isoformat(),
        'note': note, 'pieces': []}
    by_key = {p['key']: p for p in index['pieces']}
    for src in sources:
        m = masks.get(src.name, {})
        slug = m.get('slug') or slug_of(src.name)
        try:
            import pillow_heif  # the owner's iPhone stills
            pillow_heif.register_heif_opener()
        except ImportError:
            pass
        im = Image.open(src)
        if im.mode in ('RGBA', 'LA', 'P'):
            # a transparent cut-out sits on the paper the studio prints on, never on black
            rgba = im.convert('RGBA')
            paper = Image.new('RGBA', rgba.size, (244, 236, 216, 255))
            im = Image.alpha_composite(paper, rgba)
        im = im.convert('RGB')
        if m.get('blur'):
            im = blur_out(im, m['blur'])
        if im.width > MAX_W:
            im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
        dst = out_dir / f'{slug}.webp'
        im.save(dst, 'WEBP', quality=90, method=6)
        key = f'beat:{set_id}/{slug}'
        by_key[key] = {'key': key, 'description': m.get('description') or slug.replace('-', ' '),
                       'families': families(im), 'source': src.name,
                       'sha256': hashlib.sha256(dst.read_bytes()).hexdigest()[:16], 'size': list(im.size),
                       **({'illustrated': True} if m.get('illustrated') else {}),
                       **({'masked': len(m['blur'])} if m.get('blur') else {})}
    index['pieces'] = sorted(by_key.values(), key=lambda p: p['key'])
    idx_p.write_text(json.dumps(index, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    return index


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--set', required=True)
    ap.add_argument('--src', nargs='+', type=Path, required=True)
    ap.add_argument('--masks', type=Path)
    ap.add_argument('--club')
    ap.add_argument('--season')
    ap.add_argument('--note', default='Owner-supplied illustrations for one film.')
    a = ap.parse_args()
    files = [f for s in a.src for f in (sorted(s.iterdir()) if s.is_dir() else [s]) if f.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp')]
    masks = json.loads(a.masks.read_text(encoding='utf-8')) if a.masks else {}
    idx = ingest(a.set, files, masks, a.club, a.season, a.note)
    print(json.dumps({'set': a.set, 'pieces': len(idx['pieces'])}))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
