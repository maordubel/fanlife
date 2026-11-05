"""The picture under a thumbnail hook: the moment's best visual, in the club's colours.

In order (owner, 5.11.2026):
1. the story's own pack — a press photograph of the real event (`pack-<club>` beat set, faces as they are, owner 4.11.2026);
2. the Drive library's thumbnail hero for the moment's tag (`thumb-hero-{penalty,europe,derby,trophy,despair}-kr`,
   painted in the club colour; the hero fills the left two thirds and leaves the right third for the words);
3. the film's own art and the common paper-cut set, by the moment's mood, with a library cut-out in front of it;
4. the era's ground (`ground-<decade>s-*`), never one from twenty years later;
5. the house terrace print.

Every picture is scrubbed of the rival's colour families (rule 95) — and a picture never makes a thumbnail yellow for
Hapoel Tel Aviv (rule 8): its palette bans yellow and the scrub takes it out.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image

from ..common import ROOT

HERO = {'penalty': 'thumb-hero-penalty-kr', 'europe': 'thumb-hero-europe-kr', 'derby': 'thumb-hero-derby-kr',
        'trophy': 'thumb-hero-trophy-kr', 'despair': 'thumb-hero-despair-kr'}
CLASSIFIED_HERO = {'LAUGH': 'thumb-classified-laugh', 'WAR': 'thumb-classified-war', 'HEART': 'thumb-classified-heart'}
# the film's own art and the common set, by tag: (moods of an owner set, words of a common piece's description), best first
MOODS = {
    'trophy': (('trophy', 'celebration', 'record'), ('trophy-lift-crowd', 'open-top-bus', 'celebration-pile', 'final-whistle-arms')),
    'goal': (('goal', 'celebration', 'crowd'), ('ball-in-net', 'celebration-pile', 'volley-edge-box', 'header-goalmouth')),
    'penalty': (('penalties', 'save'), ('shootout-line', 'penalty-spot-close', 'close-hands-clasp-prayer')),
    'despair': (('defeat', 'doubt', 'waiting', 'morning-after'), ('despair-kneeling', 'relegation-rain', 'stadium-lights-off', 'terrace-empty-dusk')),
    'derby': (('crowd', 'night', 'matchday'), ('choreography', 'flags-pole', 'home-end-night', 'terrace-full')),
    'europe': (('away', 'journey', 'night', 'city'), ('europe-stadium-night', 'away-end-arrival', 'foreign-stadium-stands', 'crowd-scarves-night')),
    'europe-home': (('night', 'crowd', 'matchday'), ('europe-stadium-night', 'home-end-night', 'crowd-scarves-night', 'stadium-night-bowl')),
    'terrace': (('crowd', 'supporter', 'matchday'), ('terrace-full', 'street-matchday-crowd', 'crowd-scarves-night', 'follow-seat-kept')),
}
# the library cut-out that stands in front of a scene, by tag (a puppet's pose, a person, the recurring supporter)
FIGURES = {'penalty': ('pup-keeper-pose',), 'goal': ('pup-striker-pose', 'pup-captain-pose'), 'trophy': ('pup-captain-pose', 'pup-striker-pose'),
           'derby': ('ppl-ultras-capo', 'ppl-ultras-drummer', 'sup-'), 'europe': ('sup-', 'ppl-'), 'despair': ('pup-old-man-pose', 'sup-'),
           'terrace': ('sup-', 'ppl-ultras-capo', 'pup-old-man-pose')}


@dataclass
class Picture:
    image: Image.Image                 # RGB, the full canvas size
    key: str                           # what it is (a beat key, a library stem, a file)
    kind: str                          # press | hero | owner | beat | ground | house | panel | footage
    text_side: str = 'left'            # where the words go
    figure: Image.Image | None = None  # an RGBA cut-out to stand in front, already painted
    figure_key: str | None = None
    focus: tuple[float, float] = (0.76, 0.66)   # where the eye goes in the picture (fractions), for the pen's arrow
    notes: list[str] = field(default_factory=list)


def cover(im: Image.Image, size: tuple[int, int], focus=(0.5, 0.5)) -> Image.Image:
    w, h = size
    s = max(w / im.width, h / im.height)
    r = im.resize((max(w, round(im.width * s)), max(h, round(im.height * s))), Image.LANCZOS)
    x = int(min(max(0, r.width * focus[0] - w / 2), r.width - w))
    y = int(min(max(0, r.height * focus[1] - h / 2), r.height - h))
    return r.crop((x, y, x + w, y + h))


def crest(club_id: str | None) -> Path | None:
    """The club's crest, from the club pack's art (never re-drawn)."""
    if not club_id:
        return None
    for p in (ROOT / 'public' / 'crests' / f'{club_id}.png', ROOT / 'public' / 'club-kits' / club_id / 'crest.png'):
        if p.exists():
            return p
    return None


def _year(ledger: dict) -> int | None:
    m = re.search(r'(\d{4})', str(ledger.get('season') or ''))
    return int(m.group(1)) if m else None


def _press(ledger: dict, hook: dict, by: dict) -> tuple[str, Path] | None:
    """A press photograph from the story's own pack, the one whose name fits the hook's night best."""
    from ..paper import beat_index, beat_path
    f = (by.get(hook.get('moment') or (hook.get('claims') or [None])[0] or '') or {}).get('fact') or {}
    want = {w for w in re.findall(r'[a-z]{4,}', ' '.join(str(f.get(k) or '') for k in ('opponent', 'competition', 'stage')).lower())}
    if f.get('date'):
        want.add(f['date'][:4])
    best, score = None, -1
    for s in ledger.get('art_sets') or []:
        if not str(s).startswith('pack-'):
            continue
        for p in beat_index(s):
            d = (p.get('description') or '').lower()
            if 'press photograph' not in d and not p.get('owner_photo'):
                continue
            sc = sum(1 for w in want if w in d) * 2 + ('press photograph' in d)
            path = beat_path(p['key'])
            if path and sc > score:
                best, score = (p['key'], path), sc
    return best


def base_key(key: str) -> str:
    """A piece and its alternate take (`-b-kr`) are one picture: the variants never show both."""
    return re.sub(r'-b(-(kr|n))$', r'\1', key or '')


def _owner_beat(sets: list[str], tag: str, salt: int, avoid: set[str] = frozenset()) -> str | None:
    from ..paper import beat_index, beat_path
    moods, words = MOODS.get(tag, MOODS['terrace'])
    for s in sets:
        ps = [p for p in beat_index(s) if beat_path(p['key'])]
        if s == 'common':   # the common set is named by what it shows, and few pieces carry a mood: the words first
            for w in words:
                hit = [p['key'] for p in ps if w in p['key'] and not p['key'].split('/')[-1].startswith('tr-') and base_key(p['key']) not in avoid]
                if hit:
                    return hit[salt % len(hit)]
        for mood in moods:
            hit = [p['key'] for p in ps if p.get('mood') == mood and base_key(p['key']) not in avoid]
            if hit:
                return hit[salt % len(hit)]
        for w in words:
            hit = [p['key'] for p in ps if w in p['key'] and not p['key'].split('/')[-1].startswith('tr-') and base_key(p['key']) not in avoid]
            if hit:
                return hit[salt % len(hit)]
    return None


def _figure(lib, tag: str, accent: str, bans: list[str], avoid: set[str]) -> tuple[str, Image.Image] | None:
    if not lib:
        return None
    from ..cinema.library import paint
    for pre in FIGURES.get(tag, ()):
        for p in lib.pieces:
            if p['stem'].startswith(pre) and p.get('keyed') and p['cls'] in ('puppet', 'person', 'supporter') and p['stem'] not in avoid:
                with Image.open(lib.path(p['stem'])) as im:
                    return p['stem'], paint(im.convert('RGBA'), p.get('colour'), accent, bans)
    return None


def _ground(lib, year: int | None, accent: str, bans: list[str]) -> tuple[str, Image.Image] | None:
    if not lib or not year:
        return None
    from ..cinema.library import paint
    dec = year // 10 * 10
    gs = [p for p in lib.of('ground') if p.get('era') and dec - 10 <= p['era'] <= dec]   # never a ground from later
    if not gs:
        return None
    p = sorted(gs, key=lambda p: (dec - p['era'], p.get('side') != 'int'))[0]
    with Image.open(lib.path(p['stem'])) as im:
        return p['stem'], paint(im.convert('RGB'), p.get('colour'), accent, bans).convert('RGB')


def documentary_picture(ledger: dict, hook: dict, palette, size=(1280, 720), salt: int = 0, avoid: set[str] | None = None) -> Picture:
    """The picture for one hook of a documentary (see the module's order). `avoid` keeps the three variants apart."""
    from ..cinema import library as L
    from ..paper import art_backdrop, beat_path, scrub, library_art, duotone, vignette
    avoid = set(avoid or ())
    by = {c['id']: c for c in ledger.get('claims') or []}
    tag = hook.get('tag') or 'terrace'
    if tag == 'europe' and hook.get('side') == 'home':
        tag = 'europe-home'
    bans, accent = list(palette.bans), palette.accent
    lib = L.load()
    pr = _press(ledger, hook, by)
    if pr and pr[0] not in avoid:
        with Image.open(pr[1]) as im:
            return Picture(scrub(cover(im.convert('RGB'), size, (0.5, 0.4)), bans), pr[0], 'press', 'left', focus=(0.62, 0.42))
    if lib:
        stem = HERO.get('europe' if tag == 'europe-home' else tag)
        if stem and stem in lib.by and stem not in avoid:
            with Image.open(lib.path(stem)) as im:
                img = L.paint(im.convert('RGB'), 'kr', accent, bans).convert('RGB')
            return Picture(cover(img, size), stem, 'hero', 'right', focus=(0.33, 0.45))
    sets = [s for s in (ledger.get('art_sets') or []) if not str(s).startswith(('pack-', 'drive-'))]
    own = f"{ledger.get('club_id')}-{str(ledger.get('season') or '').replace('/', '-')}"
    key, kind = _owner_beat([own, *sets], tag, salt, avoid), 'owner'
    if not key:
        key, kind = _owner_beat(['common'], tag, salt, avoid), 'beat'
    fig = _figure(lib, tag, accent, bans, avoid)
    if key and beat_path(key):   # a whole illustration: it has its own people, a cut-out in front would crowd it
        img = art_backdrop(key, size, bans, accent=accent)
        return Picture(img, key, kind, 'left')
    g = _ground(lib, _year(ledger), accent, bans)
    if g:
        return Picture(cover(g[1], size), g[0], 'ground', 'left', figure=fig[1] if fig else None, figure_key=fig[0] if fig else None)
    img = vignette(duotone(cover(library_art('terrace-crowd').convert('RGB'), size)), 0.35)
    return Picture(img, 'terrace-crowd', 'house', 'left', figure=fig[1] if fig else None, figure_key=fig[0] if fig else None)


def classified_backdrop(tone: str, size=(1280, 720)) -> Image.Image | None:
    """The library's CLASSIFIED desk for this tone (the case folder lit on the desk), when the library holds it."""
    from ..cinema import library as L
    lib = L.load()
    stem = CLASSIFIED_HERO.get((tone or '').upper())
    if lib and stem and stem in lib.by:
        with Image.open(lib.path(stem)) as im:
            return cover(im.convert('RGB'), size)
    return None
