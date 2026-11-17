"""THE CAST AND THE ANGLE (owner, 17.11.2026: "the system, the writer, the director and the editor must understand the
material, read it right, vary from film to film, find the interesting and important points, understand football and
competition and how tension is built — create heroes, create tragedies; every film a world of its own, with life,
characters and stories").

A season is not a list of results; it is people and a shape. From the ledger alone this module reads:

  the hero     the player whose goals carried the season: goals, and above all the goals that decided — a winner, a
               late goal that saved or won a match, a goal in a final or a decider. Introduced early, paid off late.
  the bench    the managers (a dossier's `managers` claim): a change of manager is a turn of the story.
  the wound    the night it went wrong: an elimination, a lost final, the defeat that ended a run, the worst defeat.
  the angle    what kind of film this season is — 'hero' (one man's season), 'road' (a European journey), 'tragedy'
               (so close), 'redemption' (from a wound to a trophy), 'siege' (a title held) or 'rise' — chosen from the
               record, so two films of two seasons do not read the same.

Each finding is a `character` / `angle` claim counted from cited match claims, carrying their sources (the counts are
the claim's own numbers for script.fact_guard). Nothing is invented: a season without a clear hero has none.
"""
from __future__ import annotations

from collections import defaultdict

DECIDER_TAGS = {'final', 'decider'}


def _story(ledger: dict) -> dict:
    from .director import story_of
    return story_of(ledger) or {}


def hero(ledger: dict) -> dict | None:
    """The season's hero, or None. Score = goals + 2 per goal that decided a match + 3 per goal in a final or decider."""
    st = _story(ledger)
    tags = {m['id']: set(m.get('tags') or []) for m in st.get('matches') or []}
    by = {c['id']: c for c in ledger.get('claims') or []}
    goals: dict = defaultdict(lambda: {'goals': 0, 'decisive': 0, 'big': 0, 'ids': [], 'first': None, 'big_ids': []})
    for mid, c in by.items():
        f = c.get('fact') or {}
        if f.get('kind') != 'match':
            continue
        sc = [s for s in f.get('scorers') or [] if isinstance(s, dict) and s.get('name') and not s.get('own_goal')]
        margin = f['club_goals'] - f['opponent_goals']
        timed = sorted((s for s in sc if isinstance(s.get('minute'), int)), key=lambda s: s['minute'])
        last = timed[-1] if timed else None
        for s in sc:
            g = goals[s['name']]
            g['goals'] += 1
            g['ids'].append(mid)
            g['first'] = min(g['first'] or f['date'], f['date'])
            if last is s and margin in (0, 1) and (s['minute'] >= 75 or margin == 1):
                g['decisive'] += 1     # the last goal of a one-goal win, or a late equaliser
            if tags.get(mid, set()) & DECIDER_TAGS:
                g['big'] += 1
                g['big_ids'].append(mid)
    if not goals:
        return None
    total = sum(g['goals'] for g in goals.values())
    scored = sum(c['fact']['club_goals'] for c in by.values() if (c.get('fact') or {}).get('kind') == 'match')
    top = max(g['goals'] for g in goals.values())
    if scored and total < 0.5 * scored and not (top >= 8 and top >= 0.4 * total):
        return None   # the archive names too few of the season's scorers to say who carried it (unless one man dominates what it names)
    name, g = max(goals.items(), key=lambda kv: (kv[1]['goals'] + 2 * kv[1]['decisive'] + 3 * kv[1]['big'], kv[1]['goals']))
    if g['goals'] < 5 or g['goals'] < 0.2 * total:
        return None
    return {'kind': 'character', 'role': 'hero', 'name': name, 'goals': g['goals'], 'decisive_goals': g['decisive'],
            'goals_in_finals_and_deciders': g['big'], 'share_pct': int(round(100 * g['goals'] / total)), 'first_goal': g['first'],
            'season_goals_recorded': total, 'scorers_complete': bool(scored) and total >= 0.95 * scored, 'match_ids': sorted(set(g['ids'])), 'big_match_ids': sorted(set(g['big_ids']))}


def wound(ledger: dict) -> dict | None:
    """The night it went wrong: a lost final, an elimination, the defeat that ended a long run, else the worst defeat."""
    st = _story(ledger)
    ms = st.get('matches') or []
    pick = (next((m for m in ms if 'final' in m['tags'] and m['outcome'] == 'loss'), None)
            or next((m for m in ms if m.get('through') is False), None)
            or next((m for m in ms if 'worst-defeat' in m['tags']), None))
    if not pick:
        return None
    why = 'lost final' if 'final' in pick['tags'] else 'elimination' if pick.get('through') is False else 'worst defeat'
    return {'kind': 'character', 'role': 'wound', 'match_id': pick['id'], 'date': pick['date'], 'opponent': pick.get('opponent'), 'why': why}


def angle(ledger: dict, h: dict | None, w: dict | None) -> str:
    """What kind of film this season is (see the module doc). Read from the record, in this order of strength."""
    st = _story(ledger)
    ms = st.get('matches') or []
    honours_won = any((c.get('fact') or {}).get('kind') == 'honour' and c['fact'].get('result') == 'won' for c in ledger.get('claims') or [])
    europe_away = sum(1 for m in ms if 'europe' in m['tags'] and m.get('side') == 'away')
    if not honours_won and ((w and w['why'] in ('lost final', 'elimination') and ms and w['date'] >= ms[int(len(ms) * 0.6)]['date'])
                             or st.get('shape') in ('rise-and-fall', 'turn-down')):
        return 'tragedy'
    if honours_won and w and w['date'] < (ms[len(ms) // 2]['date'] if ms else ''):
        return 'redemption'
    if h and (h['share_pct'] >= 30 or h['goals_in_finals_and_deciders'] >= 2):
        return 'hero'
    if europe_away >= 4:
        return 'road'
    if honours_won and st.get('shape') in ('steady', 'rise'):
        return 'siege'
    return 'rise'


def attach(ledger: dict) -> dict:
    """In place: the hero and the wound as `character` claims, the angle on the ledger (ledger['angle'])."""
    if any((c.get('fact') or {}).get('kind') == 'character' for c in ledger.get('claims') or []):
        return ledger
    by = {c['id']: c for c in ledger.get('claims') or []}
    h, w = hero(ledger), wound(ledger)
    for x, cid in ((h, 'character:hero'), (w, 'character:wound')):
        if not x:
            continue
        ids = x.get('match_ids') or [x.get('match_id')]
        src = []
        for i in ids:
            for s in (by.get(i) or {}).get('sources') or []:
                if s not in src and str(s.get('url', '')).startswith('https://'):
                    src.append(s)
        if src:
            ledger['claims'].append({'id': cid, 'type': 'character', 'fact': x, 'sources': src[:6], 'confidence': 2,
                                     'derived': 'counted from the season\'s match claims (studio/characters.py)'})
    ledger['angle'] = angle(ledger, h, w)
    return ledger
