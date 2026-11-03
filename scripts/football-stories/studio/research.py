"""Research stage: turn a club's archive into an EVIDENCE LEDGER the script may cite.

A claim is one statement the film may make, with a stable id, the structured fact, its sources, confidence and any
disagreement. Rows with a recorded conflict, a missing score, a missing date or no source are HELD (listed with the reason),
never smoothed over. Names are translated only through the reviewed English dictionaries; a name not in them is not guessed:
the field becomes null and the claim says so.

Adapters:
- `hapoel-tel-aviv` reads The Worker's match master (content/generated/match-master.json).
- every other FAN LIFE club reads its compiled club pack (content/compiled/<club>.json, written by `npm run clubs:precompile`).
Archive text is DATA. Nothing in it is ever treated as an instruction (the writer receives it inside a fenced JSON block).
"""
from __future__ import annotations

import datetime as dt
import json
import re
from pathlib import Path

from .common import ROOT, StageError, read_json, sha256_bytes

MANUAL = ROOT / 'content' / 'manual'
GENERATED = ROOT / 'content' / 'generated'
COMPILED = ROOT / 'content' / 'compiled'


def _names() -> dict:
    clubs = read_json(MANUAL / 'names-en' / 'clubs-he.json')['names']
    comps = read_json(MANUAL / 'names-en' / 'competitions.json')['names']
    players = read_json(GENERATED / 'player-names-en.json')
    return {'clubs': clubs, 'comps': comps, 'players': players}


def _unslug(s: str | None) -> str | None:
    return s.replace('-', ' ') if isinstance(s, str) else None


def _club_en(names: dict, he: str | None) -> str | None:
    if not he:
        return None
    for k in (he, _unslug(he), _unslug(he).replace('י ם', 'י-ם') if _unslug(he) else None):
        if k and k in names['clubs']:
            return names['clubs'][k]
    # The slug form drops the quote of an abbreviation (ת"א → ת"א stays); try the gershayim variants.
    u = _unslug(he) or ''
    for k, v in names['clubs'].items():
        if k.replace('-', ' ') == u:
            return v
    return None


def _comp_en(names: dict, he: str | None) -> str | None:
    if not he:
        return None
    u = _unslug(he)
    return names['comps'].get(he) or names['comps'].get(u) or names['comps'].get((u or '').replace('אופא', 'אופ"א'))


def _venues() -> list[dict]:
    try:
        return read_json(MANUAL / 'venue-registry.json')['records']
    except (OSError, KeyError):
        return []


def _venue(venues: list[dict], slug: str | None) -> dict | None:
    if not slug:
        return None
    u = _unslug(slug)
    for v in venues:
        keys = {v.get('canonicalNameHe'), v.get('legacySlug')}
        for a in [*(v.get('aliases') or []), *(v.get('historicalNames') or [])]:
            keys.add(a if isinstance(a, str) else (a or {}).get('name') or (a or {}).get('nameHe'))
        if slug in keys or u in keys:
            return {'name': v.get('canonicalNameLatin'), 'city': v.get('cityLatin'), 'country': v.get('countryCode'),
                    'lat': v.get('latitude'), 'lon': v.get('longitude'), 'source': (v.get('sourceRefs') or [None])[0]}
    return None


STAGE_EN = {
    'גמר': 'Final', '1/2 גמר': 'Semi-final', '1/4 גמר': 'Quarter-final', '1/8 גמר': 'Round of 16',
}


def _stage_en(he: str | None) -> str | None:
    if not he:
        return None
    if he in STAGE_EN:
        return STAGE_EN[he]
    import re
    if m := re.match(r'מחזור (\d+)', he):
        return f'Matchday {m.group(1)}'
    if m := re.match(r'(1/\d) גמר משחק (\d)', he):
        return f'{STAGE_EN.get(m.group(1) + " גמר", m.group(1))}, leg {m.group(2)}'
    if m := re.match(r'סיבוב מוקדם (\d) משחק (\d)', he):
        return f'Qualifying round {m.group(1)}, leg {m.group(2)}'
    if m := re.match(r'סיבוב (\d) משחק (\d)', he):
        return f'Round {m.group(1)}, leg {m.group(2)}'
    if m := re.match(r"סיבוב (.)'", he):
        return 'Early round'
    return None


def hapoel_ledger(season: str) -> dict:
    path = GENERATED / 'match-master.json'
    raw = path.read_bytes()
    master = json.loads(raw)
    names = _names()
    venues = _venues()
    sources = master.get('sources') or {}
    pl = names['players'].get('hapoel-tel-aviv', {})
    claims, held = [], []
    rows = [m for m in master['matches'] if m.get('season') == season and m.get('sport') == 'football']
    if not rows:
        raise StageError('SEASON_NOT_IN_ARCHIVE', f'Season {season} is not in the archive')
    rows.sort(key=lambda m: ((m.get('playedOn') or {}).get('value') or '9999', m['matchId']))
    for m in rows:
        date = (m.get('playedOn') or {}).get('value')
        res = m.get('result') or {}
        src = [{'id': s, 'title': (sources.get(s) or {}).get('title'), 'url': (sources.get(s) or {}).get('url')} for s in m.get('sourceIds') or []]
        src = [s for s in src if s['url']] or [s for s in src]
        reasons = []
        if not date:
            reasons.append('no date')
        if res.get('hapoel') is None or res.get('opponent') is None:
            reasons.append('no score')
        if m.get('conflictRefs'):
            reasons.append('recorded conflict: ' + ', '.join(m['conflictRefs']))
        if not src:
            reasons.append('no source')
        opp = _club_en(names, m.get('opponent'))
        if not opp:
            reasons.append(f'no reviewed English name for {m.get("opponent")!r}')
        comp = _comp_en(names, m.get('competition'))
        if not comp:
            reasons.append(f'no reviewed English name for competition {m.get("competition")!r}')
        if reasons:
            held.append({'match_id': m['matchId'], 'date': date, 'reasons': reasons})
            continue
        side = m.get('hapoelSide')
        scorers = []
        all_named = True
        for s in m.get('scorers') or []:
            en = (pl.get(s.get('playerId') or '') or {}).get('name')
            if not en or (s.get('confidence') or 0) < 2:
                all_named = False
                continue
            scorers.append({'name': en, 'minute': s.get('minute'), 'penalty': s.get('penalty'), 'own_goal': s.get('ownGoal')})
        gh, ga = res['hapoel'], res['opponent']
        fact = {
            'kind': 'match', 'date': date, 'competition': comp, 'stage': _stage_en(m.get('stage')),
            'club': 'Hapoel Tel Aviv', 'opponent': opp, 'side': side,
            'home': 'Hapoel Tel Aviv' if side == 'home' else opp, 'away': opp if side == 'home' else 'Hapoel Tel Aviv',
            'score_home': gh if side == 'home' else ga, 'score_away': ga if side == 'home' else gh,
            'club_goals': gh, 'opponent_goals': ga,
            'outcome': 'win' if gh > ga else 'draw' if gh == ga else 'loss',
            'venue': _venue(venues, m.get('venue')),
            'title_decided': 'האליפות הוכרעה' in (m.get('stage') or ''),
            'scorers': scorers if (all_named and len(scorers) == gh) else None,
            'scorers_note': None if (all_named and len(scorers) == gh) else 'Scorers not printed: not every goal is a reviewed, named record.',
        }
        claims.append({'id': m['matchId'], 'type': 'match', 'fact': fact, 'sources': src,
                       'confidence': m.get('confidence'), 'status': 'archive', 'conflicts': []})
    try:
        records = read_json(MANUAL / 'trophies.json').get('records') or []
    except (OSError, ValueError):
        records = []
    for r in records:
        if r.get('seasonLabel') != season or r.get('sport') != 'football' or r.get('clubSlug') != 'הפועל-תל-אביב':
            continue
        comp = _comp_en(names, r.get('competitionSlug'))
        if not comp or not str(r.get('sourceUrl') or '').startswith('https://') or (r.get('confidence') or 0) < 2:
            held.append({'match_id': f"trophy:{r.get('competitionSlug')}", 'date': None, 'reasons': ['honour without English name, https source or confidence 2']})
            continue
        claims.append({'id': f"honour-{season.replace('/', '')}-{comp.lower().replace(' ', '-')}", 'type': 'honour',
                       'fact': {'kind': 'honour', 'season': season, 'club': 'Hapoel Tel Aviv', 'competition': comp, 'result': r.get('result')},
                       'sources': [{'id': None, 'title': r.get('sourceTitle'), 'url': r.get('sourceUrl')}],
                       'confidence': r.get('confidence'), 'status': 'archive', 'conflicts': []})
    return {
        'version': 1, 'club_id': 'hapoel-tel-aviv', 'club_name': 'Hapoel Tel Aviv', 'season': season,
        'built_at': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
        'archive': {'file': 'content/generated/match-master.json', 'sha256': sha256_bytes(raw)},
        'claims': claims, 'held': held,
        'note': 'Archive records with sources and confidence. They are research inputs: confidence is not independent '
                'verification, and nothing here is permission to use any image or sound.',
    }


def season_of(date: str) -> str | None:
    """A European season label for a date: July–June, '2002/03'."""
    if not isinstance(date, str) or len(date) < 7 or not date[:4].isdigit():
        return None
    y, mo = int(date[:4]), int(date[5:7])
    a = y if mo >= 7 else y - 1
    return f'{a}/{str(a + 1)[2:]}'


def _uefa_comp(comp: str | None, season: str) -> tuple[str | None, str | None]:
    """The competition's name IN THAT SEASON, and a stage the label carries. UEFA's archive files every UEFA Cup tie under
    'UEFA Europa League'; before 2009/10 the competition was the UEFA Cup, and a film says what it was called then."""
    if not comp:
        return None, None
    stage = None
    c = re.sub(r'\s+\d{4}/\d{2}$', '', comp.strip())  # 'Greek Super League 2023/24' is the competition, not the season
    if c.lower().endswith(' final'):
        c, stage = c[:-6].strip(), 'Final'
    m = STAGE_IN_NAME.match(c)
    if m:  # 'UEFA Conference League round of 16, first leg' — the round rides in the competition's name
        c, stage = m.group(1).strip(), m.group(2)[:1].upper() + m.group(2)[1:]
    if c in ('UEFA Conference League', 'UEFA Europa Conference League'):
        c = 'UEFA Europa Conference League' if int(season[:4]) < 2024 else 'UEFA Conference League'
    if c == 'UEFA Europa League' and int(season[:4]) < 2009:
        c = 'UEFA Cup'
    if c == 'UEFA Champions League' and int(season[:4]) < 1992:
        c = 'European Cup'
    return c, stage


def _split_name(name: str, score: str) -> tuple[str, str] | None:
    """'Celtic 5-2 Rangers' with score '5-2' → ('Celtic', 'Rangers')."""
    if not isinstance(name, str) or not isinstance(score, str) or f' {score} ' not in name:
        return None
    h, a = name.split(f' {score} ', 1)
    return h.strip(), AET_NOTE.sub('', a).strip()


AET_NOTE = re.compile(r'\s*\(([^()]*)\)\s*$')
STAGE_IN_NAME = re.compile(r'^(UEFA [A-Za-z ]*?League)\s+((?:knockout|round of|quarter|semi|group|play-off|first|second|third).*)$', re.I)
PENS_NOTE = re.compile(r'^(.+?) won (\d+)-(\d+) on penalties$', re.I)


def _name_note(name: str) -> str:
    """The words a record put in brackets after the score: '(after extra time)', '(Olympiacos won 3-2 on penalties)'."""
    m = AET_NOTE.search(name or '')
    return m.group(1).strip() if m else ''


def _fold(name: str) -> str:
    import unicodedata
    return ''.join(ch for ch in unicodedata.normalize('NFKD', name) if not unicodedata.combining(ch)).lower().replace('-', ' ')


def _best_name(names: list[str]) -> str:
    """Of two spellings of one opponent, the one a reader would print: not shortened ('M. Tel-Aviv'), and with its
    accents when the two are the same name without them ('Fenerbahçe', not 'Fenerbahce')."""
    full = [n for n in names if not re.match(r'^\w\. ', n)] or names
    return max(full, key=lambda n: (sum(_fold(n) == _fold(m) for m in full), sum(ord(ch) > 127 for ch in n), -len(names.index(n).__str__())))


def _same_match(rows: list[dict]) -> list[dict]:
    """A pack can hold one match twice (two research waves, two spellings of the opponent). A club plays once a day: rows of
    one date with one score are one match — kept once, the row that names every goal first, the cleaner name next; the
    other ids, stage and sources are carried on it. Two rows of one date with DIFFERENT scores are a conflict, not a merge."""
    by: dict[str, list[dict]] = {}
    for c in rows:
        by.setdefault(c['fact']['date'], []).append(c)
    out = []
    for date, group in by.items():
        scores = {(c['fact']['score_home'], c['fact']['score_away']) for c in group}
        if len(group) == 1 or len(scores) > 1:
            out.extend(group)
            continue
        group.sort(key=lambda c: (c['fact']['scorers'] is None,
                                  any(x.get('minute') is None for x in c['fact']['scorers'] or []),
                                  # UEFA's own match record decides its competitions (CLAUDE.md rule 102)
                                  not any('uefa.com' in str(x['url']) and '/match/' in str(x['url']) for x in c['sources']),
                                  '(' in c['fact']['opponent'], c['fact']['stage'] is None))
        keep, rest = group[0], group[1:]
        f = keep['fact']
        f['opponent'] = _best_name([c['fact']['opponent'] for c in group])
        f['home' if f['side'] == 'away' else 'away'] = f['opponent']
        for o in rest:
            g = o['fact']
            f['stage'] = f['stage'] or g['stage']
            for k in ('after_extra_time', 'penalties', 'venue'):
                f[k] = f.get(k) or g.get(k)
            urls = {x['url'] for x in keep['sources']}
            keep['sources'] += [x for x in o['sources'] if x['url'] not in urls]
            keep.setdefault('also_ids', []).append(o['id'])
            keep['confidence'] = max(keep.get('confidence') or 0, o.get('confidence') or 0)
        out.append(keep)
    return out


def _club_names(club_id: str) -> list[str]:
    """The club's own other spellings: the pack's ingest names and the studio's list (studio/dossiers/club-names.json)."""
    out: list[str] = []
    ing = ROOT / 'club-packs' / club_id / 'ingest.json'
    if ing.exists():
        out += [n for n in (json.loads(ing.read_text(encoding='utf-8')).get('names') or []) if isinstance(n, str)]
    extra = Path(__file__).parent / 'dossiers' / 'club-names.json'
    if extra.exists():
        out += [n for n in (json.loads(extra.read_text(encoding='utf-8')).get(club_id) or []) if isinstance(n, str)]
    return out


def compiled_ledger(club_id: str, season: str) -> dict:
    """FAN LIFE club packs (content/compiled/<club>.json): every APPROVED, sourced match of the season."""
    path = COMPILED / f'{club_id}.json'
    if not path.exists():
        raise StageError('CLUB_NOT_COMPILED', f'No compiled pack for {club_id}; run the build (npm run clubs:precompile)')
    raw = path.read_bytes()
    pack = json.loads(raw)
    data = pack.get('data') or pack
    ident = data.get('identity') or {}
    name = ident.get('name') or club_id
    srcs = {s['id']: s for s in (data.get('sources') or []) if isinstance(s, dict) and s.get('id')}
    own = {name, *(_club_names(club_id))}
    claims, held = [], []
    rows = []
    for m in data.get('matches') or []:
        v = m.get('value') or {}
        if v.get('sport', 'football') != 'football' or season_of(v.get('on')) != season:
            continue
        rows.append(m)
    rows.sort(key=lambda m: (m['value'].get('on') or '9999', m.get('id')))
    for m in rows:
        v = m['value']
        date, score = v.get('on'), v.get('score')
        sources = [{'id': i, 'title': (srcs.get(i) or {}).get('title'), 'url': (srcs.get(i) or {}).get('url')}
                   for i in m.get('sources') or []]
        sources = [x for x in sources if str(x['url'] or '').startswith('https://')]
        sides = _split_name(v.get('name'), score)
        reasons = [r for r, bad in (
            ('no date', not date or len(date) < 10),
            ('no score', not sides),
            ('no https source', not sources),
            ('not approved', m.get('status') != 'approved'),
            ('confidence below 2', (m.get('confidence') or 0) < 2),
        ) if bad]
        if sides:  # another spelling of the club itself is the club, printed under its own name
            sides = tuple(name if x in own else x for x in sides)
        if sides and name not in sides:
            reasons.append(f'neither side is {name}')
        if reasons:
            held.append({'match_id': m.get('id'), 'date': date, 'reasons': reasons})
            continue
        home, away = sides
        note = _name_note(v.get('name'))
        pens = PENS_NOTE.match(note)
        aet = bool(pens) or note.lower() in ('after extra time', 'aet', 'a.e.t.')
        sh, sa = (int(x) for x in score.split('-'))
        ours_home = home == name
        cg, og = (sh, sa) if ours_home else (sa, sh)
        comp, stage = _uefa_comp(v.get('competition'), season)
        named = [x for x in v.get('scorers') or [] if isinstance(x, dict) and x.get('name')]
        complete = len(named) == cg
        claims.append({'id': m['id'], 'type': 'match', 'fact': {
            'kind': 'match', 'date': date, 'competition': comp, 'stage': v.get('stage') or stage, 'club': name,
            'opponent': away if ours_home else home, 'side': 'home' if ours_home else 'away', 'home': home, 'away': away,
            'score_home': sh, 'score_away': sa, 'club_goals': cg, 'opponent_goals': og,
            'outcome': 'win' if cg > og else 'draw' if cg == og else 'loss', 'venue': {'name': v['venue']} if v.get('venue') else None,
            'after_extra_time': aet or None,
            'penalties': {'winner': pens.group(1).strip(), 'score': f'{pens.group(2)}–{pens.group(3)}'} if pens else None,
            'scorers': [{'name': x['name'], 'minute': x.get('minute'), 'penalty': x.get('penalty'), 'own_goal': x.get('ownGoal')}
                        for x in named] if complete else None,
            'scorers_note': None if complete else 'Scorers not printed: the record does not name every goal.'},
            'sources': sources, 'confidence': m.get('confidence'), 'status': 'archive', 'conflicts': []})
    claims = _same_match(claims)
    if not claims:
        raise StageError('SEASON_NOT_IN_ARCHIVE', f'{name} {season}: no approved, sourced match records')
    return {'version': 1, 'club_id': club_id, 'club_name': name, 'country': ident.get('country'), 'season': season,
            'built_at': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
            'archive': {'file': f'content/compiled/{club_id}.json', 'sha256': sha256_bytes(raw)},
            'claims': claims, 'held': held,
            'note': 'Approved club-pack records with sources and confidence. Only the matches the archive holds for the season: '
                    'a total is the season only when the summary says complete.'}


def build_ledger(club_id: str, season: str, extra_claims: list[dict] | None = None) -> dict:
    ledger = hapoel_ledger(season) if club_id == 'hapoel-tel-aviv' else compiled_ledger(club_id, season)
    for c in extra_claims or []:
        validate_claim(c)
        ledger['claims'].append(c)
    ledger['summary'] = season_summary(ledger)
    return ledger


def note_claims(notes: str) -> list[dict]:
    """The owner's quotes and headlines from the brief, one per line, each with its https source:

        quote | speaker | role | the exact words | https://…
        press | outlet | YYYY-MM-DD | headline | https://…

    They become claims like any dossier's (confidence 2 — a source the owner read), so the script may quote them word
    for word through the quote and press visuals and nothing else. A malformed line is refused, never guessed."""
    out: list[dict] = []
    for i, line in enumerate(x.strip() for x in notes.splitlines()):
        if not line:
            continue
        parts = [p.strip() for p in line.split('|')]
        kind = parts[0].lower() if parts else ''
        if kind not in ('quote', 'press') or len(parts) != 5 or not re.fullmatch(r'https://\S+', parts[4]) or not all(parts[1:4]):
            raise StageError('BAD_NOTE', f'Brief notes, line {i + 1}: expected "quote | speaker | role | words | https://…" '
                                         f'or "press | outlet | YYYY-MM-DD | headline | https://…"')
        a, b, c, url = parts[1], parts[2], parts[3], parts[4]
        if kind == 'quote':
            fact = {'kind': 'quote', 'speaker': a, 'role': b, 'text': c}
        else:
            if b != '-' and not re.fullmatch(r'\d{4}-\d{2}-\d{2}', b):
                raise StageError('BAD_NOTE', f'Brief notes, line {i + 1}: the date is YYYY-MM-DD or -')
            fact = {'kind': 'press', 'outlet': a, 'headline': c, **({'date': b} if b != '-' else {})}
        out.append({'id': f'note-{len(out) + 1}', 'type': kind, 'fact': fact,
                    'sources': [{'title': f'{a} (owner note)', 'url': url, 'accessed': dt.date.today().isoformat()}],
                    'confidence': 2})
    return out


def focus(ledger: dict, start: str | None, end: str | None) -> dict:
    """Keep only the matches inside [start, end] (dates inclusive) — a film about one tie, not the whole season.
    Every other claim stays (quotes, records, people), and the season summary is counted again from what is left, so a
    focused film can only say what the focused matches add up to."""
    def inside(c: dict) -> bool:
        f = c['fact']
        if f.get('kind') != 'match':
            d = f.get('date')
            return not (f.get('kind') == 'match-detail' and d and ((start and d < start) or (end and d > end)))
        d = f.get('date') or ''
        return (not start or d >= start) and (not end or d <= end)
    kept = [c for c in ledger['claims'] if inside(c)]
    out = {**ledger, 'claims': kept, 'held': [h for h in ledger['held'] if not h.get('date') or
                                               ((not start or h['date'] >= start) and (not end or h['date'] <= end))],
           'focus': {'from': start, 'to': end}}
    out['summary'] = season_summary(out)
    if not any(c['fact'].get('kind') == 'match' for c in kept):
        raise StageError('EMPTY_FOCUS', f'No match of {ledger["club_name"]} {ledger["season"]} falls between {start} and {end}')
    return out


def validate_claim(c: dict) -> None:
    if not isinstance(c, dict) or not c.get('id') or not isinstance(c.get('fact'), dict):
        raise StageError('BAD_CLAIM', 'A claim needs an id and a fact')
    if not c.get('sources') or not any(isinstance(s, dict) and str(s.get('url') or '').startswith('https://') for s in c['sources']):
        raise StageError('BAD_CLAIM', f'Claim {c.get("id")} has no https source')


def season_summary(ledger: dict) -> dict:
    """Totals the film may state because they are COUNTED from the ledger, never typed."""
    out: dict = {}
    for c in ledger['claims']:
        f = c['fact']
        if f.get('kind') != 'match':
            continue
        comp = f['competition']
        s = out.setdefault(comp, {'played': 0, 'won': 0, 'drawn': 0, 'lost': 0, 'for': 0, 'against': 0, 'claim_ids': []})
        s['played'] += 1
        s[{'win': 'won', 'draw': 'drawn', 'loss': 'lost'}[f['outcome']]] += 1
        s['for'] += f['club_goals']
        s['against'] += f['opponent_goals']
        s['claim_ids'].append(c['id'])
    held_comps = {h['match_id'] for h in ledger['held']}
    return {'by_competition': out, 'complete': not held_comps,
            'note': 'Totals cover the claims above only; held rows are not counted, so a total is only "the season" when complete is true.'}
