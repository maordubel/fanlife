"""The CLASSIFIED panel map, and the loader that turns a folder of the owner's pictures into assets.

Owner decision (4.11.2026): what the owner puts in a targeted folder is approved material and is used AS IS — comic
panels, press photographs, real faces. Nothing here blurs, rejects or anonymises a picture. The loader only reads it.

Two ways in, one result (`Asset`):
  * the manifest (classified_manifest.json) — every panel by Drive id, local file name, brief role;
  * a pack folder — any folder of pictures. Recognised layout (all optional):
        01_Scenes/              scenes (comic panels OR plain photographs) — full-frame pictures
        02_Editing_Assets/      PNG cut-outs with alpha — composited over a scene as foreground layers
        03_Source_References/   listed and kept out of the edit
        credits.json            {"<file name>": "credit line", "*": "pack credit"} — optional
    A flat folder of pictures counts as scenes.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / 'classified_manifest.json'
PICTURE = re.compile(r'\.(png|jpe?g|webp)$', re.I)


@dataclass
class Asset:
    id: str
    path: Path
    kind: str = 'panel'          # panel (drawn) · photo · cutout · sheet · reference
    role: str = ''
    credit: str = ''
    meta: dict = field(default_factory=dict)

    @property
    def drawn(self) -> bool:
        """Line boil and halftone shimmer belong to ink. A photograph keeps grain only."""
        return self.kind in ('panel', 'sheet')


def load_manifest(path: Path = MANIFEST) -> dict:
    return json.loads(Path(path).read_text(encoding='utf-8'))


def entries(man: dict, file_key: str | None = None) -> list[dict]:
    """Every downloadable entry (the series kit plus one FILE, or every FILE)."""
    out = list(man.get('kit', []))
    for k, f in man['files'].items():
        if file_key is None or k == file_key:
            out += f['panels']
    return out


def missing_roles(man: dict, file_key: str) -> list[str]:
    """Brief roles no supplied panel covers (a role like 'P05/P15' covers both, uncertainly)."""
    f = man['files'][file_key]
    covered = set()
    for p in f['panels']:
        covered.update(p['role'].split('/'))
    return [r for r in f['brief_roles'] if r not in covered]


def _credits(folder: Path) -> dict:
    p = folder / 'credits.json'
    if p.exists():
        try:
            return json.loads(p.read_text(encoding='utf-8'))
        except ValueError:
            return {}
    return {}


def _has_alpha(path: Path) -> bool:
    if path.suffix.lower() not in ('.png', '.webp'):
        return False
    from PIL import Image
    with Image.open(path) as im:
        if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
            a = im.convert('RGBA').getchannel('A')
            lo, hi = a.getextrema()
            return lo < 250
    return False


def slug(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', Path(name).stem.lower()).strip('-')


def scan_folder(folder: Path, kind: str = 'auto', man: dict | None = None) -> dict[str, Asset]:
    """Assets from a folder. `kind` is 'panel', 'photo' or 'auto' (manifest kind when the file is in the manifest,
    else 'panel' for a CLASSIFIED drop and 'photo' inside a pack's 01_Scenes)."""
    folder = Path(folder)
    known = {}
    if man:
        for e in entries(man):
            known[e['file']] = e
    credits = _credits(folder)
    out: dict[str, Asset] = {}

    def add(p: Path, k: str, role: str = ''):
        e = known.get(p.name)
        aid = e['id'] if e else slug(p.name)
        if aid in out:
            aid = f'{aid}-{len(out)}'
        credit = credits.get(p.name) or credits.get('*', '') or (e or {}).get('credit', '')
        out[aid] = Asset(aid, p, (e or {}).get('kind', k) if k != 'cutout' else 'cutout', (e or {}).get('role', role), credit, dict(e or {}))

    scenes, assets, refs = folder / '01_Scenes', folder / '02_Editing_Assets', folder / '03_Source_References'
    if scenes.is_dir() or assets.is_dir():
        for p in sorted(scenes.rglob('*')) if scenes.is_dir() else []:
            if PICTURE.search(p.name):
                add(p, 'photo' if kind == 'auto' else kind)
        for p in sorted(assets.rglob('*')) if assets.is_dir() else []:
            if PICTURE.search(p.name):
                add(p, 'cutout' if _has_alpha(p) else ('photo' if kind == 'auto' else kind))
        for p in sorted(refs.rglob('*')) if refs.is_dir() else []:
            if PICTURE.search(p.name):
                add(p, 'reference')
    else:
        for p in sorted(folder.iterdir()):
            if p.is_file() and PICTURE.search(p.name):
                add(p, 'cutout' if _has_alpha(p) else ('panel' if kind == 'auto' else kind))
    return out
