"""THE DRAMA DESK — what a match MEANT, counted from the archive (owner, 17.11.2026: "everything that helps the writer build
mini-drama, tension and excitement with all the information you can add").

A result is a fact; a drama is a fact against what came before it. Broadcasters build tension from exactly this kind of
context — the record between two clubs, the drought, the clock, the road (research notes in
docs/fanlife/studio-drama-playbook.md). The archive already holds every recorded match of the club across all seasons
(content/generated/stories/<club>.json) and the place book holds where every opponent comes from, so for each match of
a film's season this module counts, before kick-off:

  record      the meetings the archive holds between the two clubs before this one: played, won, drawn, lost
  first       the first meeting the archive holds (said as "the first meeting on record", never "ever")
  drought     the years since the club last beat this opponent (and since it last won AT their ground)
  never there away visits on record with no win
  rematch     an earlier meeting in the same season, and how it went
  road        the trip from the club's city to the opponent's city, in kilometres (rounded to the hundred), and
              whether it was the season's longest
  clock       league matches left after this one

Each count becomes a `context` claim of its own, cited by the match beat that speaks it and carrying the sources of the
match claims it was counted from — so script.fact_guard holds every number in a context line the way it holds a score.
Nothing here is a guess: a count the archive cannot make (a club it does not hold, a city the place book lacks) is
simply absent.
"""
from __future__ import annotations

import math
from datetime import date as Date

from .common import ROOT, read_json

STORIES = ROOT / 'content' / 'generated' / 'stories'
LEAGUE_HINT = ('league', 'liga', 'serie a', 'premiership', 'bundesliga', 'super league', 'botola', 'premier league', 'division')


def _km(a: tuple[float, float], b: tuple[float, float]) -> float:
    (la1, lo1), (la2, lo2) = map(math.radians, a), map(math.radians, b)
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


def _year(d: str) -> int:
    return int(d[:4])


def _years_between(a: str, b: str) -> int:
    da, db = Date.fromisoformat(a), Date.fromisoformat(b)
    return db.year - da.year - ((db.month, db.day) < (da.month, da.day))


def _archive(club_id: str) -> list[dict]:
    p = STORIES / f'{club_id}.json'
    return (read_json(p).get('matches') or []) if p.exists() else []


def _season_of(day: str) -> str:
    y, m = int(day[:4]), int(day[5:7])
    a = y if m >= 7 else y - 1
    return f'{a}/{str(a + 1)[2:]}'


def coverage(club_id: str) -> callable:
    """complete(a, b): does the archive hold every season between dates a and b nearly whole? A drought ("not beaten
    them in six years") is only said across seasons the archive holds whole — a gap in the record is not a drought.
    A season counts as whole at 75% of the club's usual season (the median of its ten fullest)."""
    idx = (read_json(ROOT / 'content' / 'generated' / 'stories-seasons.json').get('clubs') or {}).get(club_id) or {}
    full = sorted(idx.values(), reverse=True)[:10]
    need = 0.75 * (full[len(full) // 2] if full else 10 ** 6)

    def complete(a: str, b: str) -> bool:
        y0, y1 = int(_season_of(a)[:4]), int(_season_of(b)[:4])
        return all(idx.get(f'{y}/{str(y + 1)[2:]}', 0) >= need for y in range(y0, y1 + 1))
    return complete


def _league(comp: str) -> bool:
    c = (comp or '').lower()
    return any(h in c for h in LEAGUE_HINT) and 'cup' not in c and 'uefa' not in c and 'champions' not in c


def counts(ledger: dict) -> dict[str, dict]:
    """match claim id → its context fact (see the module doc). Pure: reads the ledger, the archive and the place book."""
    from .director import same_club
    from .maps import city_of, place_of
    club, cid = ledger.get('club_name') or '', ledger.get('club_id') or ''
    history = sorted(_archive(cid), key=lambda m: m.get('date') or '')
    matches = sorted(((c['id'], c['fact']) for c in ledger.get('claims') or [] if (c.get('fact') or {}).get('kind') == 'match'),
                     key=lambda x: x[1].get('date') or '')
    home = city_of(club)
    trips = {}
    for mid, f in matches:
        if f.get('side') == 'away' and home:
            there = place_of(f, club)
            if there and there[0] != home[0]:
                km = _km(home[1], there[1])
                if km >= 150:   # a trip across a city or to the next town is not a journey
                    trips[mid] = (there[0], km)
    longest = max(trips, key=lambda k: trips[k][1]) if len(trips) >= 3 else None
    complete = coverage(cid)
    out: dict[str, dict] = {}
    for k, (mid, f) in enumerate(matches):
        opp, day = f.get('opponent') or '', f.get('date') or ''
        if not opp or not day:
            continue
        spell = [opp]
        before = [m for m in history if (m.get('date') or '') < day and same_club(m.get('opponent'), spell)]
        ctx: dict = {'kind': 'context', 'match_id': mid, 'date': day, 'opponent': opp}
        if history:
            w = sum(m['outcome'] == 'win' for m in before)
            d_ = sum(m['outcome'] == 'draw' for m in before)
            ctx.update({'meetings_before': len(before), 'meeting_number': len(before) + 1, 'won_before': w, 'drawn_before': d_,
                        'lost_before': len(before) - w - d_})
            if before and complete(before[0]['date'], day):
                ctx['record_complete'] = True   # every meeting since the first is in the archive: the count is the record
            if not before and history[0].get('date', '9') < day:
                ctx['first_on_record'] = True
            if before:
                last = before[-1]
                ctx['last_meeting'] = {'date': last['date'], 'outcome': last['outcome'], 'side': last.get('side'), 'score': last.get('score')}
                wins = [m for m in before if m['outcome'] == 'win']
                # the droughts are said only across seasons the archive holds whole (see coverage)
                if wins and complete(wins[-1]['date'], day):
                    ctx['last_win'] = wins[-1]['date']
                    ctx['years_since_win'] = _years_between(wins[-1]['date'], day)
                elif not wins and len(before) >= 3 and complete(before[0]['date'], day):
                    ctx['never_beaten_in'] = len(before)
                if f.get('side') == 'away':
                    there = [m for m in before if m.get('side') == 'away']
                    aw = [m for m in there if m['outcome'] == 'win']
                    if there and complete(there[0]['date'], day):
                        ctx['away_visits_before'] = len(there)
                        ctx['away_wins_before'] = len(aw)
                    if aw and complete(aw[-1]['date'], day):
                        ctx['years_since_away_win'] = _years_between(aw[-1]['date'], day)
        earlier = [(m2, f2) for m2, f2 in matches[:k] if same_club(f2.get('opponent'), spell)]
        if earlier:
            ctx['earlier_wins_this_season'] = sum(f2['outcome'] == 'win' for _, f2 in earlier)
            m2, f2 = earlier[-1]
            ctx['earlier_this_season'] = {'match_id': m2, 'date': f2['date'], 'outcome': f2['outcome'], 'side': f2.get('side'),
                                          'club_goals': f2['club_goals'], 'opponent_goals': f2['opponent_goals']}
        if mid in trips:
            city, km = trips[mid]
            ctx['trip'] = {'from': home[0], 'to': city, 'km': int(round(km, -2))}
            if mid == longest:
                ctx['trip']['longest_of_season'] = True
        if _league(f.get('competition') or ''):   # every later league match, however the record spells the league that day
            ctx['league_left'] = sum(1 for _, f3 in matches[k + 1:] if _league(f3.get('competition') or ''))
        out[mid] = ctx
    return out


def attach(ledger: dict) -> dict:
    """In place: one `context` claim per match of the season (id `<match id>:context`), citing the match's own sources."""
    if any((c.get('fact') or {}).get('kind') == 'context' for c in ledger.get('claims') or []):
        return ledger
    by = {c['id']: c for c in ledger.get('claims') or []}
    for mid, fact in counts(ledger).items():
        src = list((by.get(mid) or {}).get('sources') or [])
        if not src:
            continue
        ledger['claims'].append({'id': f'{mid}:context', 'type': 'context', 'fact': fact, 'sources': src,
                                 'confidence': (by.get(mid) or {}).get('confidence', 2),
                                 'derived': 'counted from the FAN LIFE archive and the place book (studio/drama_facts.py)'})
    return ledger
