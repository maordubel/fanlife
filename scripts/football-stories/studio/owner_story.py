"""Facts explicitly declared in a selected owner story outrank archive variants for that film."""
from __future__ import annotations

import datetime as dt
import re
import unicodedata
from difflib import SequenceMatcher

from .common import sha256_json

FIELDS = {'name', 'scorer', 'club_scorer', 'speaker', 'home', 'away', 'club', 'opponent', 'winner'}
DECLARATION = re.compile(r'^(?:[-*]\s+)?\**(key figures|exact names|names|historical facts|aggregate|leg \d+|match|alias)\**:\**\s*(.+)', re.I)
LEG = re.compile(r'^(?P<date>[A-Za-z]+ \d{1,2}, \d{4})\s+[-–]\s+(?P<venue>.+?)\s+\((?P<home>.+?)\s+(?P<h>\d+)\s*[-–]\s*(?P<a>\d+)\s+(?P<away>.+)\)\.?$')


def folded(text: str) -> str:
    normalized = unicodedata.normalize('NFKD', text.casefold())
    return ' '.join(re.findall(r'[^\W_]+', ''.join(c for c in normalized if not unicodedata.combining(c))))


def match_fields(kind: str, line: str) -> dict | None:
    if kind.startswith('leg '):
        match = LEG.fullmatch(line)
        if not match:
            return None
        fields = match.groupdict()
        date = re.sub(r'^Sept\b', 'Sep', fields['date'])
        for fmt in ('%b %d, %Y', '%B %d, %Y'):
            try:
                fields['date'] = dt.datetime.strptime(date, fmt).date().isoformat()
                return fields
            except ValueError:
                pass
        return None
    parts = [p.strip() for p in line.split('|')]
    if len(parts) != 5 or not all(parts):
        return None
    date, home, away, score, venue = parts
    goals = re.fullmatch(r'(\d+)\s*[-–]\s*(\d+)', score)
    try:
        day = dt.date.fromisoformat(date).isoformat()
    except ValueError:
        return None
    if not goals:
        return None
    return dict(date=day, home=home, away=away, h=goals[1], a=goals[2], venue=venue)


def names_in(value):
    if isinstance(value, dict):
        for key, child in value.items():
            if key in FIELDS and isinstance(child, str):
                yield child
            else:
                yield from names_in(child)
    elif isinstance(value, list):
        for child in value:
            yield from names_in(child)


def alias_for(name: str, names: list[str], *, matched_fixture: bool) -> str | None:
    normalized = folded(name)
    words = normalized.split()
    if len(words) < 2:
        return None
    exact = [candidate for candidate in names if folded(candidate) == normalized]
    if exact:
        return exact[0] if len(exact) == 1 else None
    if not matched_fixture:
        return None
    similar = [candidate for candidate in names if len(folded(candidate).split()) == len(words)
               and folded(candidate)[0] == normalized[0]
               and SequenceMatcher(None, normalized, folded(candidate)).ratio() >= .85]
    return similar[0] if len(similar) == 1 else None


def team_matches(stored, supplied) -> bool:
    stored, supplied = folded(stored or ''), folded(supplied)
    return bool(stored and supplied and (stored == supplied or stored.startswith(supplied + ' ') or supplied.startswith(stored + ' ')))


def named_goals(text: str, figures: dict[str, str]) -> dict[int, list[tuple[str, str]]]:
    """Read explicit scoring actions from the numbered script section, apart from teaser hooks."""
    structure = re.search(r'^\s*\d+\.\s+.*script structure\s*$(.*?)(?=^\s*\d+\.\s|\Z)', text, re.I | re.M | re.S)
    if not structure:
        return {}
    result, leg = {}, None
    for line in structure[1].splitlines():
        if re.search(r'\bfirst leg\b', line, re.I):
            leg = 1
        if re.search(r'\b(return|second) leg\b', line, re.I):
            leg = 2
        if leg is None:
            continue
        events = []
        for name, team in figures.items():
            for event in re.finditer(r'(?<!\w)' + re.escape(name) + r"\s+(?:scores\b|heads the ball into the net\b|breaks the deadlock\b)", line, re.I):
                events.append((event.start(), name, team))
        if events:
            result.setdefault(leg, []).extend((name, team) for _, name, team in sorted(events))
    return result


def normalize(value, aliases: dict[str, str]):
    """Preserve casing/diacritics of an owner name wherever an identified archive alias appears."""
    if not aliases:
        return value
    pattern = re.compile(r'(?<!\w)(' + '|'.join(re.escape(k) for k in sorted(aliases, key=len, reverse=True)) + r')(?!\w)', re.I)
    by_case = {k.casefold(): v for k, v in aliases.items()}

    def walk(item):
        if isinstance(item, str):
            return pattern.sub(lambda m: by_case.get(m.group().casefold(), m.group()), unicodedata.normalize('NFC', item))
        if isinstance(item, dict):
            return {k: walk(v) for k, v in item.items()}
        if isinstance(item, list):
            return [walk(v) for v in item]
        return item

    return walk(value)


def apply(ledger: dict) -> bool:
    documents = ledger.get('story_documents') or []
    if not documents:
        return False
    before = sha256_json(ledger)
    names, fixtures, declared, sequences = [], [], [], {}
    aliases = dict(ledger.get('owner_name_aliases') or {})
    for doc in documents:
        source = doc.get('name') or 'Owner story'
        figures = {}
        for raw in (doc.get('text') or '').splitlines():
            match = DECLARATION.match(raw.strip())
            if not match:
                continue
            kind, line = match[1].lower(), match[2].strip()
            if kind in ('key figures', 'exact names', 'names'):
                for group, team in re.findall(r'([^().]+)\(([^()]+?)\s+Goalscorers?\)', line, re.I):
                    figures.update((n.strip(), team.strip()) for n in group.split(',') if n.strip())
                clean = re.sub(r'\([^)]*\)\s*\.\s*', ';', line)
                clean = re.sub(r'\([^)]*\)', '', clean)
                names.extend(n.strip(' .') for n in re.split(r'[,;]', clean) if n.strip(' .'))
            elif kind == 'alias':
                old, sep, new = line.partition('=>')
                if sep and old.strip() and new.strip():
                    aliases[old.strip()] = new.strip()
                    names.append(new.strip())
            else:
                fixture = match_fields(kind, line) if kind.startswith('leg ') or kind == 'match' else None
                if fixture:
                    fixtures.append((fixture, source, int(kind.split()[1]) if kind.startswith('leg ') else None))
                if kind in ('historical facts', 'aggregate') or fixture:
                    declared.append((kind, line, source))
        sequences[source] = named_goals(doc.get('text') or '', figures)
    names = list(dict.fromkeys(names))
    days = {entry['date'] for entry, _, _ in fixtures}
    for claim in ledger.get('claims') or []:
        fact = claim.get('fact') or {}
        matched_fixture = fact.get('kind') in ('match', 'match-detail') and fact.get('date') in days
        for recorded in names_in(fact):
            canonical = alias_for(recorded, names, matched_fixture=matched_fixture)
            if canonical and canonical != recorded:
                aliases.setdefault(recorded, canonical)
    # Include the exact spelling as a self-mapping to restore capitalization after an AI rewrite.
    for name in names:
        aliases[name] = name
        plain = ''.join(c for c in unicodedata.normalize('NFKD', name) if not unicodedata.combining(c))
        if plain != name:
            aliases.setdefault(plain, name)
    if names:
        ledger['owner_names'] = names
    if aliases:
        ledger['owner_name_aliases'] = aliases
    matches = [c for c in ledger.get('claims') or [] if (c.get('fact') or {}).get('kind') == 'match']
    for entry, source, leg in fixtures:
        teams = [c for c in matches if all(team_matches(c['fact'].get(side), entry[side]) for side in ('home', 'away'))]
        candidates = [c for c in teams if c['fact'].get('date') == entry['date']]
        if not candidates and len(teams) == 1:
            recorded_day = teams[0]['fact'].get('date') or ''
            try:
                if abs((dt.date.fromisoformat(recorded_day) - dt.date.fromisoformat(entry['date'])).days) <= 2:
                    candidates = teams
            except ValueError:
                pass
        if len(candidates) != 1:
            continue
        claim = candidates[0]
        f = claim['fact']
        home, away = int(entry['h']), int(entry['a'])
        club, opponent = (away, home) if f.get('side') == 'away' else (home, away)
        venue_name, _, city = entry['venue'].partition(',')
        venue = f['venue'].copy() if isinstance(f.get('venue'), dict) and team_matches(f['venue'].get('name'), venue_name) else {}
        venue['name'] = venue_name.strip()
        if city.strip():
            venue['city'] = city.strip()
        f.update(date=entry['date'], score_home=home, score_away=away, club_goals=club, opponent_goals=opponent,
                 outcome='win' if club > opponent else 'loss' if club < opponent else 'draw', venue=venue)
        if len(f.get('scorers') or []) > club:
            f['scorers'] = []
        order = []
        for name, team in sequences[source].get(leg, []):
            sides = [side for side in ('home', 'away') if team_matches(f[side], team)]
            if len(sides) == 1:
                order.append({'name': name, 'side': sides[0]})
        if sum(g['side'] == 'home' for g in order) == home and sum(g['side'] == 'away' for g in order) == away and order:
            previous = normalize(f.get('scorers') or [], aliases)
            f['owner_goal_order'] = order
            f['scorers'] = [next((g for g in previous if g.get('name') == name), {'name': name})
                            for name in (g['name'] for g in order if g['side'] == f.get('side'))]
        claim['owner_story_source'] = source
    existing = {c['id'] for c in ledger.get('claims') or []}
    for kind, text, source in declared:
        cid = 'owner-story-' + sha256_json([kind, text, source])[:12]
        if cid not in existing:
            ledger['claims'].append({'id': cid, 'type': 'history', 'fact': {'kind': 'history', 'text': text},
                                     'sources': [], 'confidence': 2, 'owner_story_source': source})
            existing.add(cid)
    for claim in ledger.get('claims') or []:
        claim['fact'] = normalize(claim['fact'], aliases)
    return sha256_json(ledger) != before
