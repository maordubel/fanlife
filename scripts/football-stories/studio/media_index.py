"""The media index (owner, 12.11.2026: "smart use of the media libraries we have in GitHub and in Drive: real index
management, correct use of pictures from the libraries").

Before this every engine had its own picker: DOCU's ten-name `SPARE` tuple, `cinema/look.pick` hashing a mood list, the
Drive scan's first match. None knew what another film had shown last week, and none could say what art is missing.

ONE index of every picture and clip the studio can reach, one record each:

    id          the key an engine already uses — `beat:common/terrace-full-kr`, `clip:…`, `cut:…`, `art:…`, `prop:…`,
                `lib:<stem>` (the moving-art library and its Flow-made pieces), `drive:<file id>` (the Drive inventory)
    source      kit · wikimedia (a `commons-*` set) · moving-art · flow · drive
    path / ref  the file on this machine (None when the piece is only listed: a Drive file not brought into the kit, a
                Flow piece not made yet, the moving-art library on a machine without `STORIES_CINEMA_LIB`)
    kind        still · clip · cutout · texture
    clubs       the club the set was made for ([] = any club)        era      the decade, when the set or the name says it
    subjects    stand, crowd, pyro, goal, keeper, trophy, street, portrait-silhouette, newspaper, map, …  (SUBJECTS)
    moods       tension, joy, grief, defiance, calm                                                      (MOODS)
    families    the colour families the kit already measured (rule 95)      colours  the three dominant colours (hex)
    size, orientation      rights      owner-made · library · needs-check

Tags are built from what already exists and nothing else: folder and file names, the kit's own index entries
(description, mood, families, size), the Drive inventory's path, the library's stem grammar, PIL for the size and a
cheap dominant-colour pass. No model is asked and nothing is guessed — a tag that cannot be read stays absent
(rules 2 and 11: unknown is unknown).

    pick(beat)  scores every usable candidate for a beat: the club (another club's art is refused, and so is a colour
                family the caller bans — the rival's), the era, the subjects and the mood the beat asks for, whether the
                picture is big enough for the frame, and FRESHNESS — a picture already in this film or in the last
                RECENT_FILMS films is marked down, and none goes on more than MAX_SHOTS shots of one film.
    Ledger      which asset was on which shot of which film, and when — kept across films (STORIES_MEDIA_LEDGER).
    report()    for the desk: what there is per club by subject and mood, the most used pictures, and the gaps
                ("no joy picture of its own for club X") — the list of art worth adding.

    python -m studio.media_index build   [--dest DIR]          # (re)build the generated index
    python -m studio.media_index report  [--club ID] [--out F] # the coverage report
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import tempfile
import time
from pathlib import Path

VERSION = 2
HERE = Path(__file__).resolve().parent
KIT = HERE / 'kit'
REPO = HERE.parents[2]
INVENTORY = REPO / 'docs' / 'fanlife' / 'drive-library' / 'inventory.json'
FLOW_SPEC = HERE / 'cinema' / 'flow_library.json'
ENV_DIR, ENV_LEDGER = 'STORIES_MEDIA_INDEX', 'STORIES_MEDIA_LEDGER'
FRAME = (1920, 1080)
# Freshness. A picture a viewer saw in the last few films is "that picture again"; five films is about a fortnight of
# the channel. The gate's own limit (qa.MAX_ASSET_SHOTS) is the hard stop inside one film.
RECENT_FILMS = 5
MAX_SHOTS = 2
KEEP_FILMS = 60          # the ledger's memory: older films are dropped, so the file stays a few hundred kB

# What a picture shows, read off the words of its name and description. A word may open several subjects.
SUBJECTS = {
    'stand': ('stand', 'stands', 'terrace', 'terraces', 'bleachers', 'kop', 'seats', 'seat', 'tribune', 'end'),
    'crowd': ('crowd', 'crowds', 'supporters', 'fans', 'ultras', 'people', 'queue', 'choreography', 'tifo', 'capo', 'chant'),
    'pyro': ('pyro', 'flare', 'flares', 'smoke', 'firework', 'fireworks', 'torch', 'torches'),
    'goal': ('goal', 'goalmouth', 'net', 'header', 'volley', 'shot', 'striker', 'penalty', 'shootout', 'spot'),
    'keeper': ('keeper', 'goalkeeper', 'save', 'gloves', 'dive'),
    'trophy': ('trophy', 'cup', 'medal', 'confetti', 'lift', 'champions', 'shelf', 'bus'),
    'street': ('street', 'road', 'alley', 'pub', 'bar', 'cafe', 'kiosk', 'market', 'lamp', 'door', 'shop', 'square'),
    'portrait-silhouette': ('silhouette', 'portrait', 'figure', 'back', 'profile', 'fig', 'ppl', 'sup', 'pup'),
    'newspaper': ('newspaper', 'newspapers', 'headline', 'press', 'cutting', 'clipping', 'news', 'paper'),
    'map': ('map', 'route', 'journey', 'atlas', 'globe', 'compass'),
    'stadium': ('stadium', 'ground', 'bowl', 'floodlight', 'floodlights', 'arena', 'pitch', 'turnstile', 'gate'),
    'tunnel': ('tunnel', 'dressing', 'corridor', 'walk'),
    'bench': ('manager', 'coach', 'bench', 'dugout', 'touchline', 'chairman'),
    'referee': ('referee', 'whistle', 'card', 'linesman'),
    'travel': ('away', 'train', 'coach', 'plane', 'airport', 'station', 'ferry', 'bus', 'journey', 'arrival', 'border'),
    'celebration': ('celebration', 'celebrate', 'celebrating', 'pile', 'hug', 'arms', 'cheer', 'cheering', 'roar', 'party'),
    'despair': ('despair', 'kneeling', 'heads', 'tears', 'silence', 'empty', 'relegation', 'shock'),
    'ball': ('ball', 'football', 'boots', 'boot', 'corner', 'kick'),
    'flag': ('flag', 'flags', 'scarf', 'scarves', 'banner', 'banners'),
    'clock': ('clock', 'minute', 'watch', 'time', 'scoreboard', 'stopwatch'),
    'city': ('city', 'skyline', 'harbour', 'port', 'acropolis', 'rooftops', 'sea', 'beach', 'promenade'),
    'archive': ('archive', 'scrapbook', 'photo', 'desk', 'album', 'ticket', 'programme', 'radio', 'tv', 'television', 'memory'),
    'weather': ('rain', 'snow', 'fog', 'storm', 'mud'),
    'night': ('night', 'dusk', 'evening', 'floodlit', 'midnight'),
}
# What a picture FEELS like. The kit's own `mood` field is read first (MOOD_OF), then the same word lists.
MOODS = {
    'tension': ('tension', 'tense', 'penalties', 'penalty', 'shootout', 'waiting', 'doubt', 'clock', 'fingers', 'prayer', 'clasp',
                'last', 'minute', 'nervous', 'wall', 'spot', 'time', 'save'),
    'joy': ('celebration', 'celebrate', 'celebrating', 'joy', 'win', 'won', 'trophy', 'confetti', 'pile', 'hug', 'party', 'roar',
            'goal', 'lift', 'cheer', 'cheering', 'champions', 'triumph'),
    'grief': ('defeat', 'loss', 'lost', 'despair', 'kneeling', 'tears', 'silence', 'relegation', 'shock', 'empty', 'rain',
              'morning-after', 'heartbreak', 'heads'),
    'defiance': ('march', 'derby', 'ultras', 'capo', 'choreography', 'tifo', 'drum', 'flare', 'flares', 'pyro', 'smoke', 'fence',
                 'away', 'chant', 'banner', 'megaphone', 'fist'),
    'calm': ('memory', 'archive', 'dusk', 'summer', 'morning', 'city', 'beginnings', 'desk', 'scrapbook', 'sunset', 'quiet',
             'window', 'shelf', 'radio', 'season', 'record', 'dawn'),
}
MOOD_OF = {'away': 'defiance', 'supporter': 'defiance', 'crowd': 'defiance', 'matchday': 'tension', 'walk-out': 'tension',
           'night': 'tension', 'referee': 'tension', 'bench': 'tension', 'manager': 'tension', 'league': 'calm',
           'journey': 'calm', 'news': 'calm', 'commentary': 'calm'}
ERA = re.compile(r'(?<!\d)(18|19|20)(\d)(\d)(?:s|/\d{2,4}|-\d{2,4})?(?!\d)')
TEXTURE = ('tex', 'texture', 'grain', 'halftone', 'paper-texture', 'vignette')
IMG = ('.webp', '.png', '.jpg', '.jpeg')


def words(text: str) -> list[str]:
    return re.findall(r'[a-z][a-z-]*[a-z]|[a-z]', (text or '').lower().replace('_', ' '))


def tags_of(text: str, vocab: dict) -> list[str]:
    """The tags whose words appear in `text` as whole words (a hyphenated name counts whole and by its parts)."""
    ws = set(words(text))
    ws |= {p for w in ws for p in w.split('-')}
    return sorted(t for t, keys in vocab.items() if ws & set(keys))


def era_of(*texts) -> str | None:
    """`1999/00`, `1970s`, `ground-1950s-kr` → '1990s', '1970s', '1950s'. None when no year is written."""
    for t in texts:
        m = ERA.search(str(t or ''))
        if m:
            return f'{m.group(1)}{m.group(2)}0s'
    return None


def dominant(path: Path, n: int = 3) -> tuple[list[str], tuple[int, int] | None]:
    """The picture's `n` commonest colours as hex (quantised on a 48 px thumbnail: cheap, stable) and its pixel size.
    ([], None) for a file PIL cannot read — a clip, a missing file."""
    try:
        from PIL import Image
        with Image.open(path) as im:
            size = im.size
            th = im.convert('RGB').resize((48, 48))
        q = th.quantize(colors=6, method=Image.Quantize.MEDIANCUT)
        pal = q.getpalette() or []
        counts = sorted(q.getcolors() or [], reverse=True)[:n]
        return ['#%02X%02X%02X' % tuple(pal[i * 3:i * 3 + 3]) for _, i in counts], size
    except Exception:  # noqa: BLE001 — unreadable is unknown, never a guess
        return [], None


def orientation(size) -> str | None:
    if not size:
        return None
    w, h = size
    return 'landscape' if w >= h * 1.15 else 'portrait' if h >= w * 1.15 else 'square'


def record(id_: str, source: str, kind: str, text: str, *, path: Path | None = None, ref: str | None = None, clubs=(), era=None,
           mood_field: str | None = None, families=None, size=None, colours=None, rights='needs-check', sha=None, extra=None) -> dict:
    moods = set(tags_of(text, MOODS))
    if mood_field:
        moods |= set(tags_of(mood_field, MOODS)) | ({MOOD_OF[mood_field]} if mood_field in MOOD_OF else set())
    return {'id': id_, 'source': source, 'kind': kind, 'path': str(path) if path else None, 'ref': ref, 'clubs': sorted(clubs),
            'era': era, 'subjects': tags_of(text, SUBJECTS), 'moods': sorted(moods), 'families': sorted(families or []),
            'colours': colours or [], 'size': list(size) if size else None, 'orientation': orientation(size), 'rights': rights,
            'sha': sha, **(extra or {})}


# ── the sources ─────────────────────────────────────────────────────────────────────────────────────────────────────
def kit_records(kit: Path = KIT, seen: dict | None = None) -> list[dict]:
    """The repository's own art: every set's index.json under beats/, clips/ and cutouts/ (a `commons-*` set is the
    Wikimedia pictures a film already cached), the four `art/` pictures and the props. `seen` is the last index by id:
    a piece whose sha has not changed keeps its measured colours, so a rebuild opens only new files."""
    seen = seen or {}
    out: list[dict] = []
    for folder, prefix, kind, ext in (('beats', 'beat', 'still', '.webp'), ('clips', 'clip', 'clip', '.mp4'), ('cutouts', 'cut', 'cutout', '.webp')):
        for idx in sorted((kit / folder).glob('*/index.json')):
            head = json.loads(idx.read_text(encoding='utf-8'))
            set_id = head.get('set') or idx.parent.name
            club = head.get('club') or None
            wiki = set_id.startswith('commons-')
            for p in head.get('pieces') or []:
                key = p.get('key') or ''
                slug = key.split('/')[-1]
                path = idx.parent / f'{slug}{ext}'
                text = f"{slug} {p.get('description') or ''} {p.get('motion') or ''}"
                old = seen.get(key) or {}
                cols, size = (old.get('colours'), old.get('size')) if old.get('sha') == p.get('sha256') and old.get('colours') else dominant(path)
                is_tex = any(w in TEXTURE for w in words(slug))
                # rights: the owner's own photograph or drawing is his; Commons pictures were checked PD/CC0 when they
                # were ingested (commons.py); a piece the index marks as masked or archive wants a look before reuse
                rights = 'library' if wiki else 'needs-check' if p.get('archive') else 'owner-made' if head.get('origin') in ('owner-upload', 'code') else 'needs-check'
                out.append(record(key, 'wikimedia' if wiki else 'kit', 'texture' if is_tex else kind, text, path=path if path.exists() else None,
                                  clubs=[club] if club else [], era=era_of(head.get('season'), slug, p.get('description')), mood_field=p.get('mood'),
                                  families=p.get('families'), size=p.get('size') or size, colours=cols, rights=rights, sha=p.get('sha256'),
                                  extra={'set': set_id, **({'accent': p['accent']} if p.get('accent') else {}), **({'seconds': p['seconds']} if p.get('seconds') else {}),
                                         **({'source_file': p['source']} if p.get('source') else {})}))
    for folder, prefix, kind in (('art', 'art', 'still'), ('props', 'prop', 'cutout')):
        for path in sorted((kit / folder).glob('*')):
            if path.suffix.lower() not in IMG:
                continue
            key = f'{prefix}:{path.stem}'
            st = path.stat()
            sha = f'{st.st_size}-{int(st.st_mtime)}'
            old = seen.get(key) or {}
            cols, size = (old.get('colours'), old.get('size')) if old.get('sha') == sha and old.get('colours') else dominant(path)
            out.append(record(key, 'kit', kind, path.stem.replace('_', ' '), path=path, size=size, colours=cols, rights='owner-made', sha=sha, extra={'set': folder}))
    return out


def library_records(root: str | Path | None = None, spec: Path = FLOW_SPEC) -> list[dict]:
    """The moving-art library (cinema/library.py) as it is on this machine, plus the Flow spec's pieces that are not made
    yet (path None: listed so the report can say what the operator still owes). A `-fl<N>-` stem is Flow's."""
    from .cinema import library as L
    out: list[dict] = []
    have: set[str] = set()
    lib = L.load(root) if (root or os.environ.get(L.ENV)) else None
    for p in (lib.pieces if lib else []):
        stem, cls = p['stem'], p.get('cls')
        flow = bool(re.search(r'-fl\d+(-|$)', stem))
        kind = 'clip' if cls == 'clip' else 'cutout' if p.get('keyed') else 'texture' if cls in ('fx', 'transition') else 'still'
        path = lib.path(stem)
        cols, size = dominant(path) if path and kind != 'clip' else ([], None)
        have.add(stem)
        out.append(record(f'lib:{stem}', 'flow' if flow else 'moving-art', kind, stem.replace('-', ' ') + ' ' + ' '.join(p.get('words') or []), path=path,
                          era=era_of(stem), families=['red'] if p.get('colour') == 'kr' else [], size=size or p.get('size'), colours=cols,
                          rights='library' if flow else 'owner-made', sha=p.get('sha'), extra={'cls': cls, **({'accent': 'key-red'} if p.get('colour') == 'kr' else {})}))
    if spec.exists():
        for p in json.loads(spec.read_text(encoding='utf-8')).get('pieces') or []:
            if p['stem'] in have:
                continue
            cls = L.classify(p['stem']).get('cls')
            out.append(record(f'lib:{p["stem"]}', 'flow', 'cutout' if cls in L.CUT else 'still', p['stem'].replace('-', ' '), era=era_of(p['stem']),
                              families=['red'], rights='library', extra={'cls': cls, 'accent': 'key-red', 'wanted': True}))
    return out


def drive_records(inventory: Path = INVENTORY, kit_sources: set[str] | None = None) -> list[dict]:
    """The Drive library's pictures and clips, from its committed inventory (metadata only: path, name, type, bytes).
    No pixel was read, so size and colours are unknown; the folder guide says drafts and source photographs need a look
    before publication, so every one is `needs-check`. A file already brought into the kit (same original file name) is
    marked `in_kit` and is not a second candidate."""
    from .media_assets import named_clubs
    if not inventory.exists():
        return []
    out = []
    for f in json.loads(inventory.read_text(encoding='utf-8')).get('files') or []:
        mime = f.get('mime') or ''
        if not mime.startswith(('image/', 'video/')) or mime == 'image/svg+xml':
            continue
        where = f"{f.get('path') or ''}/{f.get('name') or ''}"
        clubs = set(named_clubs(where.replace('_', ' ').replace('-', ' ')))
        if 'the worker' in where.lower().replace('-', ' '):
            clubs.add('hapoel-tel-aviv')          # THE WORKER is the Hapoel Tel Aviv edition (CLAUDE.md, the universe table)
        stem = Path(f.get('name') or '').stem
        kind = 'clip' if mime.startswith('video/') else 'cutout' if re.search(r'cut-?outs?', where, re.I) else 'texture' if any(w in TEXTURE for w in words(stem)) else 'still'
        out.append(record(f'drive:{f["id"]}', 'drive', kind, f'{stem} {(f.get("path") or "").split("/")[-1]}', ref=f['id'], clubs=clubs,
                          era=era_of(stem, f.get('path')), rights='needs-check',
                          extra={'folder': f.get('path') or '', 'name': f.get('name'), 'bytes': f.get('bytes'),
                                 **({'in_kit': True} if kit_sources and f.get('name') in kit_sources else {})}))
    return out


# ── the generated file ──────────────────────────────────────────────────────────────────────────────────────────────
_MEMO: dict[str, dict] = {}


def index_dir() -> Path:
    """Where the generated index lives: next to the prepared moving-art library when the worker has one (that folder is
    already an actions/cache, so the index rides in it), else `STORIES_MEDIA_INDEX`, else the machine's temp folder."""
    from .cinema import library as L
    d = os.environ.get(ENV_DIR) or os.environ.get(L.ENV)
    return Path(d).expanduser() if d else Path(tempfile.gettempdir()) / 'fanlife-media-index'


def fingerprint(kit: Path = KIT, inventory: Path = INVENTORY, lib_root: str | None = None) -> str:
    """What the index was built from: every kit index file, the Drive inventory, the Flow spec and the library's own
    index — by content. Unchanged sources → the saved index is the index (a rebuild costs one hash of a few small files)."""
    from .cinema import library as L
    h = hashlib.sha256(f'v{VERSION}'.encode())
    files = sorted(kit.glob('*/*/index.json')) + [inventory, FLOW_SPEC]
    root = lib_root or os.environ.get(L.ENV)
    if root:
        files.append(Path(root).expanduser() / 'index.json')
    for folder in ('art', 'props'):
        for p in sorted((kit / folder).glob('*')):
            h.update(f'{p.name}:{p.stat().st_size}'.encode())
    for f in files:
        h.update(f.name.encode())
        h.update(f.read_bytes() if f.exists() else b'-')
    return h.hexdigest()[:24]


def build(dest: Path | None = None, kit: Path = KIT, inventory: Path = INVENTORY, lib_root: str | None = None, force: bool = False) -> dict:
    """The index, from the saved file when its fingerprint still holds, otherwise rebuilt (colours of unchanged pieces
    are carried over) and saved. Never raises for a folder it cannot write: the index is then built in memory."""
    dest = dest or index_dir()
    fp_now = fingerprint(kit, inventory, lib_root)
    file = dest / 'media-index.json'
    if not force and _MEMO.get(str(file), {}).get('fingerprint') == fp_now:
        return _MEMO[str(file)]       # the same process asked before (a film builds several adapters)
    old: dict = {}
    if file.exists():
        try:
            old = json.loads(file.read_text(encoding='utf-8'))
        except ValueError:
            old = {}
        if not force and old.get('fingerprint') == fp_now and old.get('version') == VERSION:
            _MEMO[str(file)] = old
            return old
    seen = {r['id']: r for r in old.get('records') or []}
    recs = kit_records(kit, seen)
    recs += library_records(lib_root)
    recs += drive_records(inventory, {r.get('source_file') for r in recs if r.get('source_file')})
    idx = {'version': VERSION, 'fingerprint': fp_now, 'built': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'records': recs}
    try:
        dest.mkdir(parents=True, exist_ok=True)
        tmp = file.with_suffix('.tmp')
        tmp.write_text(json.dumps(idx, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        tmp.replace(file)
    except OSError:
        pass
    _MEMO[str(file)] = idx
    return idx


# ── the usage ledger ────────────────────────────────────────────────────────────────────────────────────────────────
class Ledger:
    """Which asset was on which shot of which film, and when. One small JSON file kept across films (the worker restores
    and saves it around every run); without a file it simply remembers nothing, and no film fails for it."""

    def __init__(self, path: Path | str | None = None):
        p = path or os.environ.get(ENV_LEDGER)
        self.path = Path(p).expanduser() if p else None
        self.films: list[dict] = []
        if self.path and self.path.exists():
            try:
                self.films = json.loads(self.path.read_text(encoding='utf-8')).get('films') or []
            except ValueError:
                self.films = []

    def record(self, film: str, uses: list[dict], club: str | None = None, when: str | None = None) -> None:
        """`uses`: [{'asset': id, 'shot': n, 't': seconds}]. A film rendered again replaces its own entry."""
        self.films = [f for f in self.films if f.get('film') != film]
        self.films.append({'film': film, 'club': club, 'at': when or time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'uses': uses})
        self.films = self.films[-KEEP_FILMS:]
        if self.path:
            try:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                self.path.write_text(json.dumps({'version': 1, 'films': self.films}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
            except OSError:
                pass

    def recent(self, n: int = RECENT_FILMS, but: str | None = None) -> dict[str, int]:
        """asset → in how many of the last `n` films (other than `but`) it appeared."""
        out: dict[str, int] = {}
        for f in [x for x in self.films if x.get('film') != but][-n:]:
            for a in {u['asset'] for u in f.get('uses') or []}:
                out[a] = out.get(a, 0) + 1
        return out

    def totals(self) -> list[tuple[str, int, int]]:
        """(asset, films, shots) over everything remembered, most used first."""
        films: dict[str, int] = {}
        shots: dict[str, int] = {}
        for f in self.films:
            for u in f.get('uses') or []:
                shots[u['asset']] = shots.get(u['asset'], 0) + 1
            for a in {u['asset'] for u in f.get('uses') or []}:
                films[a] = films.get(a, 0) + 1
        return sorted(((a, films[a], shots[a]) for a in films), key=lambda x: (-x[1], -x[2], x[0]))


# ── the selection ───────────────────────────────────────────────────────────────────────────────────────────────────
# What a beat is asks for these subjects and this mood before a word of its narration is read (plan visual types).
TYPE_WANTS = {
    'open': (('stadium', 'crowd', 'clock'), ()), 'trailer': (('tunnel', 'stadium', 'crowd'), ('tension',)),
    'matchday': (('stand', 'crowd', 'stadium', 'flag'), ('tension', 'defiance')), 'goal': (('goal', 'celebration', 'ball'), ('joy',)),
    'score': (('stand', 'crowd', 'clock', 'goal'), ()), 'versus': (('stand', 'crowd', 'flag'), ('defiance',)),
    'turning': (('archive', 'newspaper', 'tunnel', 'clock'), ('tension',)), 'map': (('travel', 'city', 'map'), ('calm',)),
    'race': (('stand', 'crowd'), ('tension',)), 'table': (('newspaper', 'archive'), ('calm',)), 'press': (('newspaper',), ('calm',)),
    'stat': (('archive', 'stadium'), ()), 'record': (('archive', 'trophy'), ('calm',)), 'quote': (('portrait-silhouette', 'bench'), ()),
    'ticket': (('stadium', 'street', 'archive'), ('tension',)), 'fact': (('archive', 'stadium'), ('calm',)),
    'follow': (('stand', 'street'), ('calm',)), 'illustration': ((), ()),
}
# The score sheet's emotion (studio/drama.py) → the index's five moods.
EMOTION_MOOD = {'tension': 'tension', 'dread': 'tension', 'release': 'joy', 'joy': 'joy', 'pride': 'joy', 'grief': 'grief',
                'defiance': 'defiance', 'wonder': 'calm', 'humour': 'calm'}
# The weights, in the order they argue: what the LINE names (W_SUBJECT × SAID) outranks the club's own drawer, which
# outranks what the beat's type merely suggests; the mood breaks ties between pictures of the same thing.
W_CLUB, W_ERA, W_SUBJECT, W_MOOD, W_TECH, W_USED, W_RECENT, SAID = 2.5, 1.0, 2.5, 1.5, 2.0, 4.0, 0.8, 1.6


def beat_query(shot: dict, emotion: str | None = None, era: str | None = None) -> dict:
    """What a plan shot asks the index for: subjects and moods from its visual type, its narration's own words and the
    score sheet's emotion. Nothing here is a fact about the match — it only steers which picture is fetched."""
    t = (shot.get('visual') or {}).get('type') or 'illustration'
    subj, moods = TYPE_WANTS.get(t, ((), ()))
    text = shot.get('narration') or ''
    said = tags_of(text, SUBJECTS)
    mood = [EMOTION_MOOD[emotion]] if emotion in EMOTION_MOOD else list(moods) or tags_of(text, MOODS)
    return {'n': shot.get('n'), 'type': t, 'subjects': list(dict.fromkeys([*said, *subj])), 'said': said, 'moods': mood, 'era': era}



RIVAL_SHARE = 0.015   # a banned colour family covering this share of a picture's saturated pixels (scarves, flags, a shirt) refuses it
_PRINTED: dict = {}


def printed(path) -> list[str]:
    """The saturated colour families a picture actually prints (cinema/library.families on a 160 px thumbnail), cached by
    path and mtime. [] for a file that cannot be read — unknown is not a pass for a ban: the caller checks `families` too."""
    try:
        p = Path(path)
        key = (str(p), p.stat().st_mtime)
    except OSError:
        return []
    if key not in _PRINTED:
        try:
            import numpy as np
            from PIL import Image
            from .cinema.library import families
            with Image.open(p) as im:
                th = im.convert('RGB')
                th.thumbnail((160, 160))
            _PRINTED[key] = sorted(families(np.asarray(th), RIVAL_SHARE))
        except Exception:  # noqa: BLE001
            _PRINTED[key] = []
    return _PRINTED[key]

class Picker:
    """One film's view of the index. `bans` are the colour families refused on this film (the caller passes the
    palette's — rule 95; a piece drawn in the signal red that is repainted in the club's colour is not red, exactly as
    cinema/look.allowed reads it). Another club's own art is always refused."""

    def __init__(self, index: dict, club: str | None = None, bans=(), era: str | None = None, film: str = '', ledger: Ledger | None = None,
                 rivals=(), frame: tuple[int, int] = FRAME):
        self.records = index.get('records') or []
        self.by = {r['id']: r for r in self.records}
        self.club, self.bans, self.era, self.film, self.frame = club, set(bans or ()), era, film, frame
        self.rivals = set(rivals or ())
        self.ledger = ledger or Ledger()
        self.recent = self.ledger.recent(RECENT_FILMS, but=film)
        self.shots: dict[str, set] = {}      # asset → the shots of THIS film it is on
        self.uses: list[dict] = []

    def refused(self, r: dict, kind: str = 'still') -> str | None:
        """Why this record can never be picked for this film (None = it is a candidate)."""
        if r['kind'] != kind:
            return 'kind'
        if not r.get('path') or r.get('in_kit') or r.get('wanted'):
            return 'not on this machine'
        if r['clubs'] and (self.club not in r['clubs'] or set(r['clubs']) & self.rivals):
            return 'another club\'s art'
        fam = set(r.get('families') or []) - ({'red'} if r.get('accent') == 'key-red' else set())
        if fam & self.bans:
            return 'a rival\'s colour'
        if self.bans and r.get('accent') != 'key-red' and set(printed(r['path'])) & self.bans:
            # Owner, 14.11.2026: "a film about Panathinaikos cannot pick a crowd with red scarves". The metadata's families
            # are not enough (a Drive or library picture often has none): the picture's own pixels are read.
            return 'a rival\'s colour in the picture'
        if len(self.shots.get(r['id'], ())) >= MAX_SHOTS:
            return f'already on {MAX_SHOTS} shots of this film'
        return None

    def score(self, r: dict, beat: dict) -> tuple[float, list[str]]:
        why: list[str] = []
        s = 0.0
        if self.club and self.club in r['clubs']:
            s += W_CLUB
            why.append('club')
        era = beat.get('era') or self.era
        if era and r.get('era'):
            s += W_ERA if r['era'] == era else -W_ERA
            why.append('era' if r['era'] == era else 'other era')
        said = set(beat.get('said') or ())
        hit = [x for x in beat.get('subjects') or () if x in r['subjects']]
        s += sum(W_SUBJECT * (SAID if x in said else 1.0) for x in hit[:3])   # what the line itself names counts for more than what its type suggests
        why += [f'subject:{x}' for x in hit[:3]]
        mood = [x for x in beat.get('moods') or () if x in r['moods']]
        clash = bool(beat.get('moods')) and bool(r['moods']) and not mood
        s += W_MOOD * len(mood[:2]) - (W_MOOD if clash else 0)
        why += [f'mood:{x}' for x in mood[:2]] + (['other mood'] if clash else [])
        if r.get('size'):
            w, h = r['size']
            need = (beat.get('need') or self.frame)[0]
            if w < need * 0.6:
                s -= W_TECH
                why.append('small')
            if r.get('orientation') == 'portrait' and self.frame[0] > self.frame[1]:
                s -= W_TECH / 2
                why.append('portrait')
        n_here = len(self.shots.get(r['id'], ()))
        if n_here:
            s -= W_USED * n_here
            why.append('in this film')
        if self.recent.get(r['id']):
            s -= W_RECENT * self.recent[r['id']]
            why.append(f'in {self.recent[r["id"]]} of the last {RECENT_FILMS} films')
        return round(s, 3), why

    def ranked(self, beat: dict, kind: str = 'still', avoid=()) -> list[tuple[float, dict, list[str]]]:
        out = []
        for r in self.records:
            if r['id'] in avoid or self.refused(r, kind):
                continue
            s, why = self.score(r, beat)
            out.append((s, r, why))
        # equal scores fall in an order fixed by the film and the beat, so a re-render draws the same film and two
        # films do not open the same drawer
        out.sort(key=lambda x: (-x[0], hashlib.sha256(f'{self.film}:{beat.get("n")}:{x[1]["id"]}'.encode()).hexdigest()))
        return out

    def pick(self, beat: dict, kind: str = 'still', avoid=()) -> dict | None:
        """The best candidate for the beat (and it is marked used on that shot), or None when nothing may be shown."""
        top = self.ranked(beat, kind, avoid)
        if not top:
            return None
        s, r, why = top[0]
        self.use(r['id'], beat.get('n'), beat.get('t'), why=why, score=s)
        return r

    def use(self, asset: str, shot, t=None, **more) -> None:
        """Say that `asset` is on `shot` — for a picture the plan chose itself, too, so the picker keeps away from it."""
        self.shots.setdefault(asset, set()).add(shot)
        self.uses.append({'asset': asset, 'shot': shot, **({'t': round(float(t), 2)} if t is not None else {}), **more})

    def close(self) -> list[dict]:
        """The film is made: write its uses into the ledger (once per asset and shot). → the uses, for the job folder."""
        seen, uses = set(), []
        for u in self.uses:
            if (u['asset'], u['shot']) not in seen:
                seen.add((u['asset'], u['shot']))
                uses.append({k: u[k] for k in ('asset', 'shot', 't') if k in u})
        if self.film:
            self.ledger.record(self.film, uses, self.club)
        return uses


def freshest(keys: list[str], film: str = '', n: int = RECENT_FILMS) -> list[str]:
    """Of `keys` (kit keys, in the caller's order), the ones the last `n` films showed least — the drop-in for the older
    engines' picker (cinema/look.pick), which then chooses among them as it always did. With no ledger on the machine,
    or nothing remembered, the list comes back unchanged, so a film without a ledger is drawn exactly as before."""
    if not keys or not os.environ.get(ENV_LEDGER):
        return keys
    rec = Ledger().recent(n, but=film)
    low = min(rec.get(k, 0) for k in keys)
    return [k for k in keys if rec.get(k, 0) == low] if rec else keys


# ── the desk's report ───────────────────────────────────────────────────────────────────────────────────────────────
def coverage(index: dict, club: str | None, bans=()) -> dict:
    """What a film for `club` could show today: counts of usable stills (the club's own + any-club) by subject and mood,
    and the same for the club's own art alone."""
    pk = Picker(index, club, bans)
    usable = [r for r in pk.records if not pk.refused(r, r['kind'])]
    own = [r for r in usable if club and club in r['clubs']]
    def count(rs, field):   # noqa: E306
        out: dict[str, int] = {}
        for r in rs:
            for t in r[field]:
                out[t] = out.get(t, 0) + 1
        return out
    stills = [r for r in usable if r['kind'] == 'still']
    return {'club': club, 'usable': len(usable), 'own': len(own), 'kinds': count([{'k': [r['kind']]} for r in usable], 'k'),
            'subjects': count(stills, 'subjects'), 'moods': count(stills, 'moods'),
            'own_subjects': count([r for r in own if r['kind'] == 'still'], 'subjects'), 'own_moods': count([r for r in own if r['kind'] == 'still'], 'moods'),
            'listed_only': sum(1 for r in pk.records if club and club in r['clubs'] and not r.get('path') and not r.get('in_kit'))}


def gaps(cov: dict) -> list[str]:
    """What is missing for a club, most painful first: a mood with no picture of the club's own, then the subjects a
    film reaches for most (the brief's list) with none of its own."""
    out = []
    name = cov['club'] or 'any club'
    for m in MOODS:
        if not cov['own_moods'].get(m):
            out.append(f'no {m} picture of its own for {name}' + (f' ({cov["moods"].get(m, 0)} any-club ones stand in)' if cov['moods'].get(m) else ' — and none in the shared library either'))
    for s in ('stand', 'crowd', 'goal', 'trophy', 'pyro', 'keeper', 'street', 'newspaper', 'portrait-silhouette', 'map', 'stadium', 'celebration'):
        if not cov['own_subjects'].get(s):
            out.append(f'no {s} picture of its own for {name}' + (f' ({cov["subjects"].get(s, 0)} any-club)' if cov['subjects'].get(s) else ' — none shared either'))
    return out


def clubs_in(index: dict) -> list[str]:
    return sorted({c for r in index.get('records') or [] for c in r['clubs']})


def report(index: dict, ledger: Ledger | None = None, clubs: list[str] | None = None) -> str:
    recs = index.get('records') or []
    ledger = ledger or Ledger()
    L = [f'MEDIA INDEX — {len(recs)} records · built {index.get("built")} · fingerprint {index.get("fingerprint")}', '']
    def tally(field):   # noqa: E306
        out: dict[str, int] = {}
        for r in recs:
            out[r[field]] = out.get(r[field], 0) + 1
        return ' · '.join(f'{k} {v}' for k, v in sorted(out.items(), key=lambda x: -x[1]))
    here = sum(1 for r in recs if r.get('path'))
    L += [f'by source: {tally("source")}', f'by kind:   {tally("kind")}', f'by rights: {tally("rights")}',
          f'on this machine: {here} · listed only (Drive files not brought into the kit, Flow pieces not made, library not synced): {len(recs) - here}',
          f'with a decade: {sum(1 for r in recs if r.get("era"))} · with a subject tag: {sum(1 for r in recs if r["subjects"])} · with a mood tag: {sum(1 for r in recs if r["moods"])} · untagged: {sum(1 for r in recs if not r["subjects"] and not r["moods"])}', '']
    L.append('COVERAGE PER CLUB (usable stills: the club\'s own + any-club · [own])')
    for club in clubs or [None, *clubs_in(index)]:
        c = coverage(index, club)
        L.append(f'\n{club or "any club (the shared library)"} — {c["usable"]} usable assets ({", ".join(f"{k} {v}" for k, v in sorted(c["kinds"].items()))}), {c["own"]} its own'
                 + (f', {c["listed_only"]} more listed in Drive but not in the kit' if c['listed_only'] else ''))
        L.append('  moods:    ' + ' · '.join(f'{m} {c["moods"].get(m, 0)} [{c["own_moods"].get(m, 0)}]' for m in MOODS))
        L.append('  subjects: ' + ' · '.join(f'{s} {c["subjects"].get(s, 0)} [{c["own_subjects"].get(s, 0)}]' for s in SUBJECTS))
        if club:
            g = gaps(c)
            L += ['  gaps:'] + [f'    - {x}' for x in g[:8]] if g else ['  gaps: none']
    L += ['', f'MOST USED (the last {len(ledger.films)} films remembered)']
    tot = ledger.totals()
    L += [f'  {a} — {f} films, {s} shots' for a, f, s in tot[:15]] or ['  no film has been recorded yet (the ledger starts with the next film the worker makes)']
    return '\n'.join(L) + '\n'


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=('build', 'report'))
    ap.add_argument('--dest', type=Path)
    ap.add_argument('--club', action='append')
    ap.add_argument('--out', type=Path)
    a = ap.parse_args(argv)
    idx = build(a.dest, force=a.cmd == 'build')
    text = report(idx, clubs=a.club) if a.cmd == 'report' else f'{len(idx["records"])} records → {(a.dest or index_dir()) / "media-index.json"}\n'
    if a.out:
        a.out.write_text(text, encoding='utf-8')
    print(text, end='')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
