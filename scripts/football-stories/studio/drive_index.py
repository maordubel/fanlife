"""THE DRIVE INDEX — every file in the owner's library with its tags (owner, 16.11.2026: "complete the tagging index in
our Drive and make the system know how to work with it perfectly; you may change order, names and folders").

Three files under docs/fanlife/drive-library/:
    tags.json       the tag map, written by hand: per folder id (inherited by everything below it) and by path rules
    inventory.json  the listing: folders and files (id, path, name, MIME type, bytes) — rebuilt from the live Drive
    index.json      what the engines read: one row per file with its resolved tags

A row:  id · path · name · mime · bytes · clubs · use · status · rights · kind · subjects · era · series · labels
    clubs     the clubs the piece belongs to ([] = any club)          use     studio · shop · marketing · site · life · reference
    status    approved · draft · reference · source-photo · doc · vlog rights  owner-made · needs-check · library
    kind      still · clip · cutout · texture · vector · 3d · doc · archive

Nothing is guessed: a tag comes from the owner's folder (tags.json), a path rule or the file's own extension. A folder
with no tag of its own and no tagged ancestor is listed in `untagged` so the map can be completed.

    python -m studio.drive_index build [--live]     # --live lists the Drive first (runner only; no key needed)
    python -m studio.drive_index check              # exit 1 when a folder has no tags (CI / the daily job)
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

from .common import ROOT

LIB = ROOT / 'docs' / 'fanlife' / 'drive-library'
TAGS, INVENTORY, INDEX = LIB / 'tags.json', LIB / 'inventory.json', LIB / 'index.json'
LISTS = ('clubs', 'use', 'subjects')
SCALARS = ('status', 'rights', 'kind', 'era', 'series', 'feature', 'project', 'style', 'story')
EXT_KIND = [(re.compile(r'\.(mp4|mov|webm|m4v)$', re.I), 'clip'), (re.compile(r'\.svg$', re.I), 'vector'),
            (re.compile(r'\.(md|txt|csv|json|xlsx|docx|pdf|html)$', re.I), 'doc'), (re.compile(r'\.(zip|rar|7z)$', re.I), 'archive'),
            (re.compile(r'\.(blend1?|glb|gltf|fbx|obj)$', re.I), '3d'), (re.compile(r'\.(png|jpe?g|webp|gif|heic)$', re.I), 'still')]
MIME = {'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'webp': 'image/webp', 'gif': 'image/gif', 'svg': 'image/svg+xml',
        'mp4': 'video/mp4', 'mov': 'video/quicktime', 'md': 'text/markdown', 'txt': 'text/plain', 'csv': 'text/csv', 'json': 'application/json',
        'zip': 'application/zip', 'html': 'text/html', 'pdf': 'application/pdf'}


def load_tags(p: Path = TAGS) -> dict:
    return json.loads(p.read_text(encoding='utf-8')) if p.exists() else {'folders': {}, 'rules': []}


def _merge(into: dict, add: dict) -> None:
    for k, v in add.items():
        if k in LISTS:
            into[k] = sorted(set(into.get(k) or []) | set(v or []))
        elif k == 'label':
            into.setdefault('labels', []).append(v)
        elif k in SCALARS or k in ('priority', 'protect'):
            into[k] = v


def _rules(tags: dict, on: str = 'folder') -> list[tuple[re.Pattern, dict]]:
    """the path rules that read folder names (on='folder') or file names (on='file'); a rule marked 'any' reads both"""
    return [(re.compile(r['match']), {k: v for k, v in r.items() if k not in ('match', 'on')})
            for r in tags.get('rules') or [] if r.get('on', 'folder') in (on, 'any')]


def folder_tags(inv: dict, tags: dict) -> dict[str, dict]:
    """path → resolved tags of that folder: its ancestors' tags, then its own (by id), then the path rules."""
    by_path = {f['path']: f['id'] for f in inv.get('folders') or []}
    own, rules, out = tags.get('folders') or {}, _rules(tags), {}

    def resolve(path: str) -> dict:
        if path in out:
            return out[path]
        parent = path.rsplit('/', 1)[0] if '/' in path else ''
        t = json.loads(json.dumps(resolve(parent))) if path else {}
        fid = by_path.get(path)
        if fid and fid in own:
            _merge(t, own[fid])
        leaf = path.rsplit('/', 1)[-1]
        for rx, add in rules:
            if leaf and rx.search(leaf):
                _merge(t, add)
        t['tagged'] = bool(path == '' or (fid and fid in own) or out.get(parent, {}).get('tagged'))
        out[path] = t
        return t

    resolve('')
    for p in by_path:
        resolve(p)
    return out


def file_row(f: dict, ftags: dict, rules) -> dict:
    t = json.loads(json.dumps(ftags.get(f.get('path') or '', {})))
    for rx, add in rules:
        if rx.search(f.get('name') or ''):
            _merge(t, add)
    name = f.get('name') or ''
    if 'kind' not in t or t['kind'] in ('still', None):
        for rx, k in EXT_KIND:
            if rx.search(name):
                t['kind'] = t.get('kind') if (k == 'still' and t.get('kind')) else k
                break
    # an extension that is not a picture is never a cutout / texture whatever its folder says
    for rx, k in EXT_KIND:
        if rx.search(name) and k in ('clip', 'doc', 'archive', '3d', 'vector'):
            t['kind'] = k
            break
    mime = f.get('mime') or MIME.get(name.rsplit('.', 1)[-1].lower(), '')
    return {'id': f['id'], 'path': f.get('path') or '', 'name': name, 'mime': mime, 'bytes': f.get('bytes'),
            'clubs': t.get('clubs') or [], 'use': t.get('use') or [], 'status': t.get('status') or 'unreviewed',
            'rights': t.get('rights') or 'needs-check', 'kind': t.get('kind') or 'still', 'subjects': t.get('subjects') or [],
            **{k: t[k] for k in ('era', 'series', 'feature', 'project', 'style', 'story', 'priority', 'protect') if t.get(k) is not None},
            'labels': t.get('labels') or []}


def build_index(inv: dict, tags: dict) -> dict:
    ft, rules = folder_tags(inv, tags), _rules(tags, 'file')
    rows = [file_row(f, ft, rules) for f in inv.get('files') or []]
    untagged = sorted(p for p, t in ft.items() if p and not t.get('tagged'))
    by = lambda k: {v: sum(1 for r in rows if v in (r[k] if isinstance(r[k], list) else [r[k]])) for v in sorted({x for r in rows for x in (r[k] if isinstance(r[k], list) else [r[k]])})}
    return {'version': 1, 'built': inv.get('built'), 'root': inv.get('root') or tags.get('root'),
            'totals': {'files': len(rows), 'folders': len(inv.get('folders') or []), 'by_club': by('clubs'), 'by_use': by('use'),
                       'by_status': by('status'), 'by_kind': by('kind')},
            'untagged': untagged, 'folders': {p: {k: v for k, v in t.items() if k != 'tagged'} for p, t in sorted(ft.items()) if p},
            'files': rows}


# ── reading the index (the engines) ─────────────────────────────────────────────────────────────────────────────────
_IDX: dict | None = None


def index(p: Path = INDEX) -> dict:
    global _IDX
    if _IDX is None:
        _IDX = json.loads(p.read_text(encoding='utf-8')) if p.exists() else {'files': [], 'folders': {}}
    return _IDX


def tags_for(file_id: str | None = None, path: str | None = None) -> dict:
    """The resolved tags of one file (by Drive id) or one folder (by path). {} when unknown."""
    ix = index()
    if file_id:
        return next((r for r in ix.get('files') or [] if r['id'] == file_id), {})
    return (ix.get('folders') or {}).get(path or '', {})


def folder_clubs(path: str) -> set[str]:
    return set(tags_for(path=path).get('clubs') or [])


def usable(row: dict, use: str, club: str | None = None, rivals: set[str] = frozenset()) -> bool:
    """May `use` (studio · shop · marketing · site) take this piece for `club`? Drafts, docs, archives, vlog footage and
    another club's art are refused; a rival's art never appears."""
    if row.get('status') in ('draft', 'doc', 'reference') or row.get('kind') in ('doc', 'archive'):
        return False
    if row.get('use') and use not in row['use']:
        return False
    clubs = set(row.get('clubs') or [])
    if clubs & set(rivals):
        return False
    return not club or not clubs or club in clubs


# ── building ────────────────────────────────────────────────────────────────────────────────────────────────────────
def live_inventory(log=print) -> dict:
    from .drive_scan import ROOT_ID, live_tree, merged_tree
    tree = live_tree(ROOT_ID, log, deadline_s=600.0, max_folders=2000)
    old = json.loads(INVENTORY.read_text(encoding='utf-8')) if INVENTORY.exists() else {}
    if len(tree['files']) < 0.8 * len(old.get('files') or []):
        # a listing that came back short is a hiccup, not a deleted library: keep what it missed
        log(f"live listing found {len(tree['files'])} files of {len(old.get('files') or [])}; keeping the rest from the last inventory")
        tree = merged_tree(tree, {'folders': old.get('folders') or [], 'files': old.get('files') or []})
    known = {f['id']: f for f in old.get('files') or []}
    files = []
    for f in tree['files']:
        k = known.get(f['id'], {})
        ext = (f['name'].rsplit('.', 1)[-1] if '.' in f['name'] else '').lower()
        files.append({'id': f['id'], 'path': f['path'], 'name': f['name'], 'mime': k.get('mime') or MIME.get(ext, ''), 'bytes': k.get('bytes')})
    if not files:
        raise SystemExit('the live listing returned no files — the last inventory is kept')
    return {'root': ROOT_ID, 'built': time.strftime('%Y-%m-%d'), 'folders': tree['folders'], 'files': files}


def write(inv: dict, tags: dict) -> dict:
    LIB.mkdir(parents=True, exist_ok=True)
    INVENTORY.write_text(json.dumps(inv, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    ix = build_index(inv, tags)
    INDEX.write_text(json.dumps(ix, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    return ix


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog='studio.drive_index')
    ap.add_argument('cmd', choices=['build', 'check'])
    ap.add_argument('--live', action='store_true')
    a = ap.parse_args(argv)
    tags = load_tags()
    inv = live_inventory() if a.live else json.loads(INVENTORY.read_text(encoding='utf-8'))
    if a.cmd == 'build':
        ix = write(inv, tags)
        print(json.dumps(ix['totals'], ensure_ascii=False))
        if ix['untagged']:
            print('untagged folders:', *ix['untagged'], sep='\n  ')
        return 0
    ix = build_index(inv, tags)
    if ix['untagged']:
        print('untagged folders:', *ix['untagged'], sep='\n  ')
        return 1
    print('every folder is tagged')
    return 0


if __name__ == '__main__':
    sys.exit(main())
