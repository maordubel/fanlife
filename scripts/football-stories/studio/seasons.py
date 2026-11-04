"""What the studio can make a film about, per club — read with the research stage's own reader, so the desk never offers
something that fails at Research (owner, 4.11.2026: "a film about a specific match, not only a season; more choices,
less freedom").

  python3 -m studio.seasons        (after npm run clubs:precompile)
    → content/generated/stories-seasons.json        index: every club's seasons (matches per season)
    → content/generated/stories/<club>.json         catalog: every match (with its "big night" tags) and every opponent

A match row is everything the desk's picker shows: date, competition and stage as the film will name them, both sides,
the score, and tags — final, europe, derby, big-win, comeback-free facts only (nothing guessed).
"""
from __future__ import annotations

import json
import sys

from . import research
from .common import ROOT, StageError

OUT = ROOT / 'content' / 'generated' / 'stories-seasons.json'
CATALOG = ROOT / 'content' / 'generated' / 'stories'
EUROPE = ('UEFA', 'European Cup', 'Cup Winners', 'Champions League', 'Europa', 'Conference League', 'Intertoto', 'Fairs Cup')


def _rivals(club_id: str) -> set[str]:
    p = ROOT / 'content' / 'compiled' / f'{club_id}.json'
    if not p.exists():
        return set()
    data = json.loads(p.read_text()).get('data') or {}
    return {(r.get('value') or {}).get('name') for r in data.get('rivals') or [] if (r.get('value') or {}).get('name')}


def tags_for(f: dict, rivals: set[str]) -> list[str]:
    out = []
    stage, comp = str(f.get('stage') or ''), str(f.get('competition') or '')
    if 'final' in stage.lower() and 'semi' not in stage.lower() and 'quarter' not in stage.lower():
        out.append('final')
    if any(e.lower() in comp.lower() for e in EUROPE):
        out.append('europe')
    if f.get('opponent') in rivals:
        out.append('derby')
    if abs((f.get('club_goals') or 0) - (f.get('opponent_goals') or 0)) >= 4:
        out.append('big-score')
    if f.get('penalties'):
        out.append('penalties')
    elif f.get('after_extra_time'):
        out.append('extra-time')
    if (f.get('club_goals') or 0) + (f.get('opponent_goals') or 0) >= 6:
        out.append('goals')
    return out


def club_catalog(club_id: str) -> dict:
    seasons: dict[str, int] = {}
    matches: list[dict] = []
    rivals = _rivals(club_id)
    for y in range(1900, 2031):
        s = f'{y}/{str(y + 1)[2:]}'
        try:
            l = research.hapoel_ledger(s) if club_id == 'hapoel-tel-aviv' else research.compiled_ledger(club_id, s)
        except StageError:
            continue
        rows = [c for c in l['claims'] if c['fact'].get('kind') == 'match']
        if not rows:
            continue
        seasons[s] = len(rows)
        for c in rows:
            f = c['fact']
            matches.append({'id': c['id'], 'date': f['date'], 'season': s, 'competition': f.get('competition'), 'stage': f.get('stage'),
                            'home': f['home'], 'away': f['away'], 'score': f"{f['score_home']}–{f['score_away']}", 'outcome': f['outcome'],
                            'opponent': f['opponent'], 'side': f['side'], 'scorers': bool(f.get('scorers')),
                            'tags': tags_for(f, rivals)})
    matches.sort(key=lambda m: m['date'], reverse=True)
    opp: dict[str, dict] = {}
    for m in matches:
        o = opp.setdefault(m['opponent'], {'name': m['opponent'], 'played': 0, 'won': 0, 'drawn': 0, 'lost': 0, 'first': m['date'], 'last': m['date'], 'derby': 'derby' in m['tags']})
        o['played'] += 1
        o[{'win': 'won', 'draw': 'drawn', 'loss': 'lost'}[m['outcome']]] += 1
        o['first'] = min(o['first'], m['date'])
        o['last'] = max(o['last'], m['date'])
    return {'club_id': club_id, 'seasons': dict(sorted(seasons.items(), reverse=True)), 'matches': matches,
            'opponents': sorted(opp.values(), key=lambda o: (-o['derby'], -o['played'], o['name']))}


def main() -> None:
    man = json.loads((ROOT / 'content' / 'compiled' / 'manifest.json').read_text())
    CATALOG.mkdir(parents=True, exist_ok=True)
    index = {}
    for c in man['clubs']:
        cat = club_catalog(c)
        if not cat['matches']:
            print(f'{c}: nothing readable', file=sys.stderr)
            continue
        (CATALOG / f'{c}.json').write_text(json.dumps(cat, ensure_ascii=False, separators=(',', ':')) + '\n')
        index[c] = cat['seasons']
        print(f"{c}: {len(cat['seasons'])} seasons, {len(cat['matches'])} matches, {len(cat['opponents'])} opponents", file=sys.stderr)
    OUT.write_text(json.dumps({'note': 'Seasons a Football Stories film can be made about (matches the research stage can read). '
                                       'Regenerate: npm run clubs:precompile, then python3 -m studio.seasons in scripts/football-stories. '
                                       'The full per-club catalog (matches, opponents) is content/generated/stories/<club>.json.',
                               'clubs': index}, ensure_ascii=False, indent=1) + '\n')


if __name__ == '__main__':
    main()
