"""Find the owner's Drive material for ONE film, every time (owner, 4.11.2026: "the system must always scan Google for
things that fit this story, this documentary, this match — and always use the general library too").

How it works:
  1. The library is listed LIVE from the runner through each public folder's embedded view (matchday/drive_fetch.py —
     no key, no login), merged with the last static listing (docs/fanlife/drive-library/inventory.json), so a folder
     the owner made an hour ago is found and a listing hiccup never empties the library. The scan is cached in the
     job folder, so a resumed film does not list the Drive again.
  2. Every folder is scored against the film: the club's own name, the opponent, the years, the story's words (topic,
     the match's competition, "derby", a nickname like "Fouad" or a ground like "Maksimir"), the series (CLASSIFIED).
     The best folders above the bar are the film's TARGETED packs; a folder link pasted in the brief always is one.
  3. A targeted pack is used as the owner made it (owner, 4.11.2026: press photographs identical to the originals,
     faces and all, are allowed and wanted there). Its README / ASSET_INDEX / PROMPTS text travels with it to the
     writer as notes. Transparent cut-outs are kept as cut-outs.
  4. The general library still feeds the film: the club's own folders (worker.drive_folder_fits) and the series kits.

Nothing here guesses: a folder that cannot be listed or a file that does not download is reported by name.
"""
from __future__ import annotations

import json
import re
import time
import unicodedata
from pathlib import Path

from .common import ROOT

ROOT_ID = '1CNLhWlab7Irfq4jJw-QRGHI37tpJcucw'   # FAN LIFE's shared library (owner, 3.11.2026)
INVENTORY = ROOT / 'docs' / 'fanlife' / 'drive-library' / 'inventory.json'
PICTURE = re.compile(r'\.(png|jpe?g|webp|heic)$', re.I)
NOTE = re.compile(r'(readme|asset_index|prompts?|notes?|credits?|sources?)\.(md|txt|csv)$', re.I)
# words that say nothing about WHICH story a folder is
GENERIC = {'fanlife', 'fan', 'life', 'pack', 'graphic', 'graphics', 'art', 'research', 'documentary', 'assets', 'asset',
           'editing', 'scenes', 'scene', 'source', 'sources', 'references', 'reference', 'the', 'and', 'club', 'clubs',
           'png', 'jpg', 'jpeg', 'newspaper', 'complete', 'football', 'stories', 'story', 'library', 'kit', 'files',
           'drafts', 'draft', 'approved', 'images', 'image', 'photo', 'photos', 'illustrations', 'frames', 'final',
           'new', 'old', 'fc', 'fk', 'sk', 'ac', 'cf', 'hsk', 'hapoel', 'maccabi', 'png', 'svg', 'webp', 'vs', 'v'}
TARGET_BAR = 5.0


def fold(s: str) -> str:
    s = unicodedata.normalize('NFKD', s or '')
    return ''.join(c for c in s if not unicodedata.combining(c)).lower()


def words(s: str) -> list[str]:
    return [w for w in re.split(r'[^a-z0-9]+', fold(s)) if len(w) >= 3 and w not in GENERIC]


def drive_id(s: str | None) -> str | None:
    if not s:
        return None
    m = re.search(r'folders/([\w-]{10,})', s) or re.search(r'[?&]id=([\w-]{10,})', s) or re.fullmatch(r'\s*([\w-]{10,})\s*', s)
    return m.group(1) if m else None


# ------------------------------------------------------------------ listing

def static_tree() -> dict:
    if not INVENTORY.exists():
        return {'folders': [], 'files': []}
    inv = json.loads(INVENTORY.read_text())
    return {'folders': list(inv.get('folders') or []), 'files': list(inv.get('files') or [])}


def live_tree(root: str, log, deadline_s: float = 120.0, max_folders: int = 500, prefix: str = '', strict: bool = False) -> dict:
    """Breadth-first listing of a public folder and everything below it. Stops at the deadline, saying so."""
    from matchday.drive_fetch import listing  # the one Drive reader
    folders, files, queue, seen, t0 = [], [], [(root, prefix)], set(), time.time()
    while queue and len(seen) < max_folders:
        if time.time() - t0 > deadline_s:
            if strict:
                from .common import StageError
                raise StageError('REQUIRED_MEDIA', 'Your Drive folder could not be fully listed before the deadline. Retry; no selected pictures were discarded.', retryable=True)
            log(f'Drive scan: stopped after {len(seen)} folders (time budget); the rest comes from the last listing')
            break
        fid, path = queue.pop(0)
        if fid in seen:
            continue
        seen.add(fid)
        try:
            entries = listing(fid)
            if strict and not entries:
                # The public reader also returns [] for an inaccessible folder. Do not interpret that as proof
                # that it contains no selected images, including when an otherwise readable parent has siblings.
                raise ValueError('Folder is empty or its public listing could not be read')
        except Exception as e:  # noqa: BLE001 — a folder that does not list is reported, the scan goes on
            if strict:
                from .common import StageError
                raise StageError('REQUIRED_MEDIA', f'Cannot read your Drive folder {path or root}. Check its sharing and retry.', retryable=True) from e
            log(f'Drive scan: could not list {path or "the library"} ({type(e).__name__})')
            continue
        for eid, title, is_folder in entries:
            p = f'{path}/{title}' if path else title
            if is_folder:
                folders.append({'id': eid, 'path': p})
                queue.append((eid, p))
            else:
                files.append({'id': eid, 'path': path, 'name': title})
    if strict and queue:
        from .common import StageError
        raise StageError('REQUIRED_MEDIA', 'Your selected Drive folder has too many subfolders to scan completely. Choose a more specific folder.')
    return {'folders': folders, 'files': files}


def merged_tree(live: dict, static: dict) -> dict:
    """Live wins; whatever the live listing missed is kept from the last static one (by id)."""
    f_ids = {f['id'] for f in live['folders']}
    x_ids = {f['id'] for f in live['files']}
    return {'folders': live['folders'] + [f for f in static['folders'] if f['id'] not in f_ids],
            'files': live['files'] + [f for f in static['files'] if f['id'] not in x_ids]}


# ------------------------------------------------------------------ matching

NAME_KEEP = {'hapoel', 'maccabi', 'fc', 'ac'}   # inside a club's name these words are the name


def name_words(s: str) -> tuple[str, ...]:
    return tuple(w for w in re.split(r'[^a-z0-9]+', fold(s)) if len(w) >= 2 and (w in NAME_KEEP or w not in GENERIC)
                 and w not in {'fc', 'ac'})


def story_terms(brief: dict) -> list[tuple[tuple[str, ...], float]]:
    """What a folder about THIS film would be called: club names as phrases ("maccabi tel aviv" is not "hapoel tel
    aviv"), years, the story's own words — each with a weight."""
    t: list[tuple[tuple[str, ...], float]] = []
    seen: set[tuple[str, ...]] = set()

    def add(tok, w):
        if tok and tok not in seen:
            seen.add(tok)
            t.append((tok, w))
    if brief.get('club_name'):
        add(name_words(brief['club_name']), 2.5)
    if brief.get('opponent'):
        add(name_words(brief['opponent']), 3.0)
    for y in re.findall(r'(19\d\d|20\d\d)', str(brief.get('season') or '') + ' ' + str(brief.get('story_words') or '')):
        add((y,), 2.5)
    sw = str(brief.get('story_words') or '')
    for w in words(brief.get('topic') or ''):
        add((w,), 3.0)
    # story words are written by the studio as "Home Side Away Side Competition Year": the clubs inside them are matched
    # as names by the brief's own club/opponent; the rest count as single words (a ground, a nickname)
    known = {w for tok, _ in t for w in tok}
    for w in words(sw):
        if w not in known and not re.fullmatch(r'(19|20)\d\d', w):
            add((w,), 1.0)
    for name in (brief.get('sides') or []):
        add(name_words(name), 2.5)
    if brief.get('kind') == 'classified':
        add(('classified',), 5.0)
    return t


def score(path: str, terms) -> float:
    have = set(re.split(r'[^a-z0-9]+', fold(path)))
    total = 0.0
    for tok, w in terms:
        if not tok:
            continue
        if all(x in have for x in tok):
            total += w
        elif len(tok) > 1 and tok[0] in have:
            total += 0.6 * w
    return total


def targeted_folders(tree: dict, terms, pinned: str | None = None) -> list[dict]:
    """The film's own packs: a pasted link first, then folders whose names carry the story (best first). A sub-folder of
    a chosen pack is part of it, not a second pack."""
    out: list[dict] = []
    if pinned:
        known = next((f for f in tree['folders'] if f['id'] == pinned), None)
        out.append({'id': pinned, 'path': known['path'] if known else pinned, 'score': 99.0, 'pinned': True})
    scored = sorted(({**f, 'score': score(f['path'].split('/')[-1], terms) + 0.5 * score(f['path'], terms)} for f in tree['folders']),
                    key=lambda f: -f['score'])
    best = scored[0]['score'] if scored else 0
    for f in scored:
        if f['score'] < TARGET_BAR or f['score'] < 0.7 * best:
            break
        if any(f['path'] == o['path'] or f['path'].startswith(o['path'] + '/') or o['path'].startswith(f['path'] + '/') for o in out):
            continue
        out.append(f)
        if len(out) >= 3:
            break
    return out


def files_under(tree: dict, folder_path: str) -> list[dict]:
    return [f for f in tree['files'] if f['path'] == folder_path or f['path'].startswith(folder_path + '/')]


def plan(tree: dict, brief: dict, limit: int = 60) -> dict:
    """{targeted: [folders], pictures: [file], notes: [file]} for the film."""
    terms = story_terms(brief)
    packs = targeted_folders(tree, terms, drive_id(brief.get('drive_folder')))
    pics, notes = [], []
    for p in packs:
        for f in files_under(tree, p['path']):
            (pics if PICTURE.search(f['name']) else notes if NOTE.search(f['name']) else []).append({**f, 'pack': p['path'], 'required': bool(p.get('pinned'))})
    # A selected folder is a requirement, not a top-N suggestion. Rank optional pictures by their own names too.
    from .media_assets import rank_files
    required = {f['id']: f for f in pics if f['required']}
    optional = rank_files([f for f in pics if f['id'] not in required], brief)
    return {'terms': [' '.join(t) for t, _ in terms], 'targeted': packs,
            'pictures': [*required.values(), *optional[:limit]], 'notes': notes[:12]}


def is_photo(f: dict) -> bool:
    """A press or owner photograph (used as it is) rather than an illustration: its folder or name says source/photo."""
    s = fold(f.get('path', '') + ' ' + f.get('name', ''))
    return bool(re.search(r'source|reference|photo|press|original|scan|archive', s))
