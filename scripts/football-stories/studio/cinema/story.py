"""The story block the cinema reads (contract docs/fanlife/66-directors-cut.md §1).

Workstream A writes `ledger['story']`. A ledger built before it (or by a studio without the director) still gets a
working edit: the same block is counted here from the ledger's match claims — form = wins minus defeats, cumulative
goal difference, runs, the turning point — and never from anything typed. Only what the claims prove is tagged.
"""
from __future__ import annotations

# The known derbies of the core clubs, used only when neither the story block nor the ledger names the rivals.
# A derby here changes the LOOK of a beat (split colour fields, a DERBY tag), never a fact on screen.
DERBIES = {
    'aek-athens': ('Olympiacos', 'Panathinaikos'),
    'panathinaikos': ('Olympiacos', 'AEK Athens'),
    'olympiacos': ('Panathinaikos', 'AEK Athens'),
    'celtic': ('Rangers',),
    'hapoel-tel-aviv': ('Maccabi Tel Aviv',),
    'hapoel-petah-tikva': ('Maccabi Petah Tikva',),
    'raja-casablanca': ('Wydad Casablanca', 'Wydad AC'),
    'wydad-casablanca': ('Raja Casablanca', 'Raja CA'),
    'al-ahly': ('Zamalek',),
    'st-pauli': ('Hamburger SV', 'Hansa Rostock'),
    'zrinjski-mostar': ('Velež Mostar', 'Velez Mostar'),
}

LETTER = {'win': 'W', 'draw': 'D', 'loss': 'L'}


def matches_of(ledger: dict) -> list[dict]:
    """The club's match claims in date order, as {id, fact}."""
    out = [c for c in ledger.get('claims') or [] if (c.get('fact') or {}).get('kind') == 'match' and c['fact'].get('date')]
    return sorted(out, key=lambda c: (c['fact']['date'], c['id']))


def rivals_of(ledger: dict) -> list[str]:
    st = ledger.get('story') or {}
    if st.get('rivals'):
        return list(st['rivals'])
    if ledger.get('rivals'):
        return list(ledger['rivals'])
    return list(DERBIES.get(ledger.get('club_id') or '', ()))


def _is_rival(name: str | None, rivals: list[str]) -> bool:
    n = (name or '').lower()
    return bool(n) and any(r.lower() in n or n in r.lower() for r in rivals)


def computed(ledger: dict) -> dict:
    """The story block counted from the claims (the contract's shape; tags limited to what the claims prove)."""
    ms = matches_of(ledger)
    rivals = rivals_of(ledger)
    rows, form, gd = [], 0, 0
    for i, c in enumerate(ms):
        f = c['fact']
        form += {'win': 1, 'loss': -1}.get(f['outcome'], 0)
        gd += f['club_goals'] - f['opponent_goals']
        tags = []
        comp = f"{f.get('competition') or ''} {f.get('stage') or ''}".lower()
        if _is_rival(f.get('opponent'), rivals):
            tags.append('derby')
        if 'final' in comp and 'semi' not in comp and 'quarter' not in comp:
            tags.append('final')
        if any(w in comp for w in ('uefa', 'champions', 'europa', 'conference', 'cup winners', 'intertoto')):
            tags.append('europe')
        sc = f.get('scorers') or []
        if f['outcome'] == 'win' and sc and len(sc) == f['club_goals'] and all(g.get('minute') is not None for g in sc):
            # the winner is the club's goal number (opponent goals + 1) in minute order: late when it came at 85+
            decider = sorted(g['minute'] for g in sc)[f['opponent_goals']]
            if decider >= 85:
                tags.append('late-winner')
        if i == 0:
            tags.append('first')
        if i == len(ms) - 1:
            tags.append('last')
        rows.append({'id': c['id'], 'date': f['date'], 'competition': f.get('competition'), 'opponent': f.get('opponent'),
                     'side': f.get('side'), 'club_goals': f['club_goals'], 'opponent_goals': f['opponent_goals'],
                     'outcome': f['outcome'], 'form': form, 'gd': gd, 'rival': 'derby' in tags, 'tags': tags})
    if rows:
        best = max(rows, key=lambda r: (r['club_goals'] - r['opponent_goals'], r['club_goals']))
        worst = min(rows, key=lambda r: (r['club_goals'] - r['opponent_goals'], -r['opponent_goals']))
        if best['outcome'] == 'win':
            best['tags'].append('biggest-win')
        if worst['outcome'] == 'loss':
            worst['tags'].append('worst-defeat')
    runs = runs_of(rows)
    turning = turning_point(rows)
    if turning:
        next(r for r in rows if r['id'] == turning)['tags'].append('turning-point')
    weight = {'final': 5, 'derby': 3, 'late-winner': 4, 'biggest-win': 3, 'worst-defeat': 2, 'turning-point': 2, 'europe': 1}
    moments = sorted(({'id': r['id'], 'why': max((t for t in r['tags'] if t in weight), key=lambda t: weight[t]),
                       'weight': float(sum(weight.get(t, 0) for t in r['tags']))} for r in rows if any(t in weight for t in r['tags'])),
                     key=lambda m: -m['weight'])
    honours = [{'competition': c['fact'].get('competition'), 'result': c['fact'].get('result')}
               for c in ledger.get('claims') or [] if (c.get('fact') or {}).get('kind') == 'honour']
    return {'matches': rows, 'runs': runs, 'turning_point': turning, 'moments': moments, 'rivals': rivals,
            'honours': honours, 'acts': [], 'computed_by': 'cinema'}


def runs_of(rows: list[dict], min_len: int = 3) -> list[dict]:
    out = []
    for kind, ok in (('unbeaten', lambda o: o != 'loss'), ('winless', lambda o: o != 'win'),
                     ('wins', lambda o: o == 'win'), ('losses', lambda o: o == 'loss')):
        i = 0
        while i < len(rows):
            if not ok(rows[i]['outcome']):
                i += 1
                continue
            j = i
            while j + 1 < len(rows) and ok(rows[j + 1]['outcome']):
                j += 1
            if j - i + 1 >= min_len:
                out.append({'kind': kind, 'from': rows[i]['id'], 'to': rows[j]['id'], 'length': j - i + 1})
            i = j + 1
    return sorted(out, key=lambda r: -r['length'])


def turning_point(rows: list[dict], window: int = 4) -> str | None:
    """Where the rolling form changes most: the match after which the next `window` games differ most from the last."""
    if len(rows) < window * 2:
        return None
    pts = [{'win': 1, 'loss': -1}.get(r['outcome'], 0) for r in rows]
    best, at = 0, None
    for i in range(window, len(rows) - window + 1):
        d = sum(pts[i:i + window]) - sum(pts[i - window:i])
        if abs(d) > abs(best):
            best, at = d, rows[i]['id']
    return at if abs(best) >= 3 else None


def story_of(ledger: dict) -> dict:
    """ledger['story'] when the director wrote it; else the director's own reading of this ledger (studio/director.py,
    when the studio has it); else the one counted here. Cached on the ledger dict."""
    st = ledger.get('story')
    if isinstance(st, dict) and st.get('matches') is not None:
        return st
    cached = ledger.get('_cinema_story')
    if cached is None:
        try:
            from ..director import story_of as director_story
            cached = director_story(ledger)
        except Exception:  # an older studio, or a ledger the director cannot read: count it here
            cached = None
        if not (isinstance(cached, dict) and cached.get('matches') is not None):
            cached = computed(ledger)
        ledger['_cinema_story'] = cached
    return cached


def tally(story: dict, upto_date: str | None, *, through: set[str] | None = None) -> dict:
    """The club's W–D–L over the story's matches up to and including `upto_date`."""
    out = {'W': 0, 'D': 0, 'L': 0, 'played': 0}
    if not upto_date:
        return out
    for m in story.get('matches') or []:
        if m['date'] <= upto_date:
            out[LETTER[m['outcome']]] += 1
            out['played'] += 1
    return out
