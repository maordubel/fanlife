"""THE ARCHIVE ON SCREEN — the season's own shirt and the card of the player the film talks about (owner, 23.11.2026:
"if it talks about a certain season it pulls that season's kit into the film; it pulls the card of the player it talks
about" — "a tool that knows how to use the giant databases we have, the graphics we have").

Two things the club's archive already holds and no film used:

  the kit     public/club-kits/<club>/svg/<id>.svg — every season's shirt drawn from its measured reference
              (docs/rules/kit-drawings-measured.md), with its maker and sponsor. A film shows the SHIRT only
              (docs/rules/club-shirt-only.md): the drawing's own viewBox is cut to the shirt.
  the player  content/compiled/<club>.json → players (position, years at the club, appearances and goals where the
              archive counted them) and mysteries (the hand-researched clues of the guessing game: where he was born,
              what he did before football, the number he wore). A clue the games generate from a fact key ("A forward.")
              is not story material and is left out.

`attach(ledger)` adds them to the evidence ledger as claims (`kind: kit`, `kind: player`) with the pack's own sources, so
a writer may say them and a device may print them under the same rules as every other fact (rules 2, 11): nothing here
is invented, a field the archive does not hold is absent, and a name that matches two different records gets no card.

No network, no model. Without the compiled pack or the kit drawings a film is made exactly as before.
"""
from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KITS = ROOT / 'public' / 'club-kits'
COMPILED = ROOT / 'content' / 'compiled'
SHIRT_BOX = '0 20 340 300'          # the shirt inside the kit board (scripts/kits/kit-render.js: kitSVG without shorts and socks)
POSITION = {'GK': 'Goalkeeper', 'DF': 'Defender', 'MF': 'Midfielder', 'FW': 'Forward'}
KIT_ORDER = {'home': 0, 'away': 1, 'third': 2}
MAX_PLAYERS = 6                     # cards a film may carry: the hero and the scorers of its biggest nights
CLUE_MAX = 90                       # a clue is one short line on a card and one short sentence in a mouth
# Clue labels that tell something about the man (kept), in the order a storyteller reaches for them.
CLUE_TASTE = ('Trade', 'Before football', 'Nickname', 'Family', 'Birth', 'Previous clubs', 'Shirt', 'Debut', 'Record', 'Captain', 'After', 'Abroad')


def fold(s: str | None) -> str:
    s = unicodedata.normalize('NFKD', str(s or ''))
    return re.sub(r'[^a-z0-9א-ת ]+', ' ', ''.join(c for c in s if not unicodedata.combining(c)).lower().replace('-', ' ')).strip()


# ── the kit ──────────────────────────────────────────────────────────────────────────────────────────────────────────
@lru_cache(maxsize=None)
def _kit_index(club_id: str) -> list[dict]:
    p = KITS / club_id / 'svg' / 'index.json'
    try:
        return list(json.loads(p.read_text(encoding='utf-8')).get('kits') or [])
    except (OSError, ValueError):
        return []


def kits_of(club_id: str, season: str) -> list[dict]:
    """The season's drawn shirts, home first. A drawing whose reference was read unsurely is never shown as the season's
    shirt (a wrong shirt is worse than none)."""
    rows = [k for k in _kit_index(club_id) if k.get('season') == season and not k.get('readUnsure') and (KITS / club_id / 'svg' / f"{k['id']}.svg").exists()]
    rows.sort(key=lambda k: (KIT_ORDER.get(k.get('type'), 9), 0 if k.get('origin') == 'catalogue' else 1, k['id']))
    seen, out = set(), []
    for k in rows:
        if k.get('type') in seen:
            continue
        seen.add(k.get('type'))
        out.append(k)
    return out


def shirt_svg(club_id: str, kit_id: str) -> str | None:
    """The kit drawing cut to its shirt: the same file the archive shows, its viewBox set to the shirt's box."""
    p = KITS / club_id / 'svg' / f'{kit_id}.svg'
    try:
        svg = p.read_text(encoding='utf-8')
    except OSError:
        return None
    # shorts and socks are the drawing's last groups (kit-render.js: kitSVG) — cut them, or their edges show at the box's rim
    cut = min((i for i in (svg.find('<g transform="translate(70 318)">'), svg.find('<g transform="translate(336 128)">')) if i > 0), default=-1)
    if cut > 0:
        svg = svg[:cut] + '</svg>'
    return re.sub(r'viewBox="[^"]*"', f'viewBox="{SHIRT_BOX}"', svg, count=1)


def write_shirt(club_id: str, kit_id: str, out: Path) -> Path | None:
    svg = shirt_svg(club_id, kit_id)
    if not svg:
        return None
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(svg, encoding='utf-8')
    return out


# ── the players ──────────────────────────────────────────────────────────────────────────────────────────────────────
@lru_cache(maxsize=None)
def _pack(club_id: str) -> dict:
    try:
        d = json.loads((COMPILED / f'{club_id}.json').read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}
    return d.get('data') or d


@lru_cache(maxsize=None)
def _people(club_id: str) -> dict[str, list[dict]]:
    """folded written name → the approved player records that carry it (their name and every alias)."""
    out: dict[str, list[dict]] = {}
    for p in _pack(club_id).get('players') or []:
        v = p.get('value') or {}
        if p.get('status') != 'approved' or not v.get('name'):
            continue
        for n in {v['name'], *(v.get('aliases') or [])}:
            k = fold(n)
            if k and p not in out.setdefault(k, []):
                out[k].append(p)
    return out


def _sources(club_id: str, ids: list[str]) -> list[dict]:
    srcs = {s['id']: s for s in (_pack(club_id).get('sources') or []) if isinstance(s, dict) and s.get('id')}
    out = [{'id': i, 'title': srcs[i].get('title'), 'url': srcs[i].get('url')} for i in ids if i in srcs and str(srcs[i].get('url') or '').startswith('https://')]
    return out


def _latin(s: str) -> bool:
    return bool(s) and all(ord(c) < 0x250 for c in s)


def clue_of(club_id: str, player_id: str) -> dict | None:
    """One hand-researched line about the man, the most telling the archive holds: {'label', 'text', 'sources'}."""
    best = None
    for m in _pack(club_id).get('mysteries') or []:
        v = m.get('value') or {}
        if v.get('targetPlayerId') != player_id or m.get('status') != 'approved':
            continue
        for c in v.get('clues') or []:
            text = str(c.get('value') or '').strip()
            if c.get('factKey') or not text or len(text) > CLUE_MAX or not _latin(text):
                continue   # a clue a game generated from a fact key is a quiz hint, not a story
            rank = CLUE_TASTE.index(c['label']) if c.get('label') in CLUE_TASTE else len(CLUE_TASTE)
            if best is None or rank < best[0]:
                best = (rank, {'label': str(c.get('label') or ''), 'text': text if text.endswith(('.', '!', '?')) else text + '.', 'sources': list(c.get('sources') or [])})
    return best[1] if best and best[0] < len(CLUE_TASTE) else None


def player(club_id: str, name: str, season: str | None = None) -> dict | None:
    """The archive's record of the man a film names: one record, or none. Two records under one written name (a father
    and a son, two namesakes) are told apart by the season when their years allow it; otherwise there is no card."""
    rows = _people(club_id).get(fold(name)) or []
    if len(rows) > 1 and season and re.match(r'\d{4}', season):
        y = int(season[:4])
        fit = [p for p in rows if isinstance(p['value'].get('fromYear'), int) and p['value']['fromYear'] <= y + 1
               and (p['value'].get('toYear') is None or p['value']['toYear'] >= y)]
        rows = fit if len(fit) == 1 else rows
    if len(rows) != 1:
        return None
    p = rows[0]
    v = p['value']
    shown = v['name'] if _latin(v['name']) else next((a for a in v.get('aliases') or [] if _latin(a)), None)
    if not shown:
        return None
    car = v.get('career') or {}
    fact = {'kind': 'player', 'name': shown, 'player_id': v.get('id') or p.get('id'),
            'position': POSITION.get((v.get('positions') or [None])[0])}
    if isinstance(v.get('fromYear'), int):
        fact['from_year'] = v['fromYear']
        if isinstance(v.get('toYear'), int) and v['toYear'] >= v['fromYear']:
            fact['to_year'] = v['toYear']
    if isinstance(car.get('apps'), int) and car['apps'] > 0:
        fact['apps'] = car['apps']
        if isinstance(car.get('goals'), int):
            fact['goals'] = car['goals']
        fact['basis'] = str(car.get('basis') or '')[:160]
    src = list(p.get('sources') or [])
    cl = clue_of(club_id, fact['player_id'])
    if cl:
        fact['clue'], fact['clue_label'] = cl['text'], cl['label']
        src += cl['sources']
    sources = _sources(club_id, list(dict.fromkeys(src)))
    if not sources:
        return None
    return {'id': f'player:{fold(shown).replace(" ", "-")}', 'type': 'person', 'fact': {k: v_ for k, v_ in fact.items() if v_ not in (None, '')},
            'sources': sources, 'confidence': p.get('confidence') or 2, 'status': 'archive', 'conflicts': []}


def kit_claims(club_id: str, season: str) -> list[dict]:
    out = []
    for k in kits_of(club_id, season)[:2]:
        fact = {'kind': 'kit', 'season': season, 'type': k.get('type') or 'home', 'kit_id': k['id'], 'maker': k.get('maker'), 'sponsor': k.get('sponsor')}
        ref = k.get('reference') if str(k.get('reference') or '').startswith('https://') else f'https://fanlife.dubelteam.com/clubs/{club_id}/kit-archive'
        out.append({'id': f'kit:{fact["type"]}', 'type': 'kit', 'fact': {a: b for a, b in fact.items() if b not in (None, '')},
                    'sources': [{'id': f'kit-archive-{club_id}', 'title': f'FanLife kit archive: {club_id} {season} {fact["type"]}', 'url': ref}],
                    'confidence': 2, 'status': 'archive', 'conflicts': []})
    return out


def names_of_film(ledger: dict) -> list[str]:
    """The men a film is most likely to name, in the order they matter: the cast first, then the scorers by their goals."""
    names: list[str] = []
    for c in ledger.get('claims') or []:
        f = c.get('fact') or {}
        if f.get('kind') == 'character' and f.get('name'):
            names.append(f['name'])
    tally: dict[str, int] = {}
    for c in ledger.get('claims') or []:
        f = c.get('fact') or {}
        if f.get('kind') != 'match':
            continue
        for s in f.get('scorers') or []:
            if isinstance(s, dict) and s.get('name') and not s.get('own_goal'):
                tally[s['name']] = tally.get(s['name'], 0) + 1
    names += [n for n, _ in sorted(tally.items(), key=lambda kv: (-kv[1], kv[0]))]
    return list(dict.fromkeys(names))


def attach(ledger: dict) -> dict:
    """In place: the season's shirts and the film's players as claims. Runs after the cast is read (characters.attach),
    is safe to run twice, and never removes a claim another stage wrote."""
    club, season = str(ledger.get('club_id') or ''), str(ledger.get('season') or '')
    have = {c['id'] for c in ledger.get('claims') or []}
    add = [c for c in kit_claims(club, season) if c['id'] not in have]
    n = sum(1 for c in ledger.get('claims') or [] if (c.get('fact') or {}).get('kind') == 'player')
    for name in names_of_film(ledger):
        if n >= MAX_PLAYERS:
            break
        c = player(club, name, season)
        if c and c['id'] not in have and c['id'] not in {x['id'] for x in add}:
            c['fact']['said_as'] = name   # how the ledger's matches write him, for the device that listens for the name
            add.append(c)
            n += 1
    ledger.setdefault('claims', []).extend(add)
    return ledger


def cards(ledger: dict) -> dict[str, dict]:
    """folded name (and folded surname, when it is one man's alone) → the player claim, for the device that hears a name."""
    out: dict[str, dict] = {}
    last: dict[str, list[dict]] = {}
    for c in ledger.get('claims') or []:
        f = c.get('fact') or {}
        if f.get('kind') != 'player':
            continue
        for n in {f.get('name'), f.get('said_as')}:
            if n:
                out[fold(n)] = c
                last.setdefault(fold(n).split()[-1], []).append(c)
    for k, cs in last.items():
        if len({c['id'] for c in cs}) == 1 and len(k) >= 4:
            out.setdefault(k, cs[0])
    return out
