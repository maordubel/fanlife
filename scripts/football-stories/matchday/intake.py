"""I WAS THERE — bring an owner's Drive art folder into the matchday kit, transparency kept.

    python3 scripts/football-stories/matchday/intake.py <downloaded folder> <set id> [--note "..."]

The studio's kit_ingest flattens every picture to RGB; a matchday film composites cut-outs (a supporter, a scarf, a
blank ticket, a scoreboard frame) over its own footage, so their alpha has to survive. Every picture becomes
`matchday/art/<set>/<slug>.webp` (2048 px at most, alpha kept) and a row in that set's index.json with its size, whether
it is transparent, its source name and a hash. The sub-folder a file came from is kept in its slug's group.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import date
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
MAX = 2048


def slug_of(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', Path(name).stem.lower()).strip('-') or 'piece'


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('src', type=Path)
    ap.add_argument('set')
    ap.add_argument('--note', default='')
    a = ap.parse_args()
    out = HERE / 'art' / a.set
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for p in sorted(a.src.rglob('*')):
        if p.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
            continue
        im = Image.open(p)
        has_alpha = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
        im = im.convert('RGBA' if has_alpha else 'RGB')
        if has_alpha and im.getchannel('A').getextrema()[0] == 255:
            has_alpha, im = False, im.convert('RGB')
        if max(im.size) > MAX:
            k = MAX / max(im.size)
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        group = slug_of(p.parent.name) if p.parent != a.src else ''
        slug = slug_of(p.name)
        dst = out / f'{slug}.webp'
        im.save(dst, 'WEBP', quality=92, method=6, **({'exact': True} if has_alpha else {}))
        rows.append({'key': f'iwt-art:{a.set}/{slug}', 'file': dst.name, 'group': group, 'source': p.name,
                     'size': list(im.size), 'alpha': has_alpha,
                     'sha256': hashlib.sha256(dst.read_bytes()).hexdigest()[:16]})
    idx = {'set': a.set, 'supplied': date.today().isoformat(), 'origin': 'owner-upload', 'note': a.note, 'pieces': rows}
    (out / 'index.json').write_text(json.dumps(idx, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(json.dumps({'set': a.set, 'pieces': len(rows)}))


if __name__ == '__main__':
    main()
