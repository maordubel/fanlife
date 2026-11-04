"""The director's brain: the story the archive can PROVE, read off the ledger before a word is written.

`story(ledger)` returns `ledger['story']` exactly as docs/fanlife/66-directors-cut.md §1 defines it — deterministic, no
model, every value computed from the ledger's claims. It finds what a supporter would remember about a season (the final,
the derby, the night it turned, the run, the late winner, the hiding) and cuts it into acts, so the writer starts from a
story instead of a list of results, and the cinema knows where the climax is.

What it never does: compute a league position or points (the archive holds only the club's own matches, never the
league's), call a match a comeback or a late winner without the minutes that show it, or call a club a rival because the
name sounds like one. A tag exists only when the claims prove it (CLAUDE.md rule 11).
"""
from __future__ import annotations

import datetime as dt
import json
import re
import unicodedata

STORY_VERSION = 1

# Word forms a club name carries that say nothing about WHICH club it is ("FK Velež Mostar" is "Velež").
GENERIC = {'fc', 'fk', 'sc', 'ac', 'ca', 'cf', 'afc', 'sk', 'nk', 'cd', 'club', 'the', 'de', 'football', 'f.c.', 'f.k.'}
# A name that is only one of these is not a club: "Maccabi" alone is a dozen clubs.
FAMILY = {'maccabi', 'hapoel', 'beitar', 'bnei', 'real', 'sporting', 'dynamo', 'dinamo', 'olympique', 'racing', 'al', 'el',
          'as', 'us', 'union', 'athletic', 'atletico', 'inter', 'red', 'young', 'royal'}
CUP = re.compile(r'cup|pokal|coupe|copa|coppa|shield|uefa|champions|europa|conference|intertoto|winners|fairs|caf|confederation|super', re.I)
EUROPE = re.compile(r'uefa|european cup|champions league|europa|conference league|cup winners|intertoto|fairs|inter-cities', re.I)
KO_STAGE = re.compile(r'final|semi|quarter|round of|last \d+|play-?off|knockout|round \d|qualifying', re.I)
LEG2 = re.compile(r'(second|2nd) leg|leg 2|return', re.I)
LEG1 = re.compile(r'(first|1st) leg|leg 1', re.I)
TURN_MIN = 2 / 3   # a turn is at least two results' worth over a three-match window


# ── names ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
def fold(name: str | None) -> str:
    s = ''.join(ch for ch in unicodedata.normalize('NFKD', name or '') if not unicodedata.combining(ch)).lower()
    return re.sub(r'[^a-z0-9 ]+', ' ', s.replace('-', ' ')).strip()


def core(name: str | None) -> list[str]:
    return [t for t in fold(name).split() if t not in GENERIC]


def same_club(opponent: str | None, spellings: list[str]) -> bool:
    """Is this opponent one of these spellings of a club? Equal once the generic words are gone, or a shorter form that is
    the START of the full name ("Velež" of "FK Velež Mostar"). Never a longer name: "Olympiacos Volou" is not
    "Olympiacos", and "Berwick Rangers" is not "Rangers"."""
    o = core(opponent)
    if not o:
        return False
    for s in spellings:
        r = core(s)
        if not r:
            continue
        if o == r:
            return True
        if len(o) < len(r) and r[:len(o)] == o and not (len(o) == 1 and o[0] in FAMILY):
            return True
    return False


def _rival_rows(club_id: str) -> list[dict]:
    """Where a club's rivals are written: The Worker's own flag for Hapoel Tel Aviv (CLAUDE.md rule 13 — a derby means
    Maccabi Tel Aviv and nothing else), the compiled pack for every other club, else the pack's source (core.json)."""
    from . import research
    from .common import ROOT
    if club_id == 'hapoel-tel-aviv':
        try:
            recs = json.loads((research.MANUAL / 'clubs.json').read_text(encoding='utf-8')).get('records') or []
        except (OSError, ValueError):
            recs = []
        return [{'status': 'approved', 'value': {'name': r['nameEn'], 'aliases': [a for a in r.get('aliases') or [] if isinstance(a, str)]}}
                for r in recs if r.get('isDerbyRival') and r.get('sport', 'football') == 'football' and r.get('nameEn')]
    for p in (research.COMPILED / f'{club_id}.json', ROOT / 'club-packs' / club_id / 'core.json'):
        if not club_id or not p.exists():
            continue
        try:
            pack = json.loads(p.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            continue
        return list((pack.get('data') or pack).get('rivals') or [])
    return []


def _pack_rivals(club_id: str) -> list[list[str]]:
    """The club's approved rivals, each as every spelling the studio knows for it."""
    from . import research
    out = []
    for r in _rival_rows(club_id):
        v = (r or {}).get('value') or {}
        if not isinstance(v.get('name'), str) or (r.get('status') not in (None, 'approved')):
            continue
        names = [v['name'], *[a for a in v.get('aliases') or [] if isinstance(a, str)]]
        for n in list(names):  # a rival that is a FAN LIFE club brings its own other spellings (studio/dossiers/club-names.json)
            slug = '-'.join(fold(n).split())
            try:
                names += research._club_names(slug)
            except (OSError, ValueError):
                pass
        out.append(list(dict.fromkeys(names)))
    return out


# ── the matches ───────────────────────────────────────────────────────────────────────────────────────────────────────
def _is_int(x) -> bool:
    return isinstance(x, int) and not isinstance(x, bool)


def _matches(ledger: dict) -> list[dict]:
    out = []
    for c in ledger.get('claims') or []:
        f = c.get('fact') or {}
        if f.get('kind') != 'match' or not isinstance(f.get('date'), str) or len(f['date']) < 10:
            continue
        if not (_is_int(f.get('club_goals')) and _is_int(f.get('opponent_goals'))):
            continue
        out.append((c['id'], f))
    out.sort(key=lambda x: (x[1]['date'], x[0]))
    return out


def _r(f: dict) -> int:
    o = f.get('outcome') or ('win' if f['club_goals'] > f['opponent_goals'] else 'draw' if f['club_goals'] == f['opponent_goals'] else 'loss')
    return {'win': 1, 'draw': 0, 'loss': -1}[o]


def _club_minutes(f: dict) -> list[int] | None:
    """The club's goal minutes, when every goal of the club has a recorded minute."""
    sc = f.get('scorers')
    if not isinstance(sc, list) or len(sc) != f['club_goals']:
        return None
    mins = [x.get('minute') for x in sc if isinstance(x, dict)]
    return sorted(mins) if len(mins) == f['club_goals'] and all(_is_int(m) for m in mins) else None


def _detail(ledger: dict, date: str) -> dict | None:
    for c in ledger.get('claims') or []:
        g = c.get('fact') or {}
        if g.get('kind') == 'match-detail' and g.get('date') == date:
            return g
    return None


def _opp_minutes(f: dict, detail: dict | None) -> list[int] | None:
    """The opponent's goal minutes from a match-detail claim of the same night, when every goal has one."""
    if not detail:
        return [] if f['opponent_goals'] == 0 else None
    sc = detail.get('opponent_scorers')
    if f['opponent_goals'] == 0:
        return []
    if not isinstance(sc, list) or len(sc) != f['opponent_goals']:
        return None
    mins = [x.get('minute') for x in sc if isinstance(x, dict)]
    return sorted(mins) if len(mins) == len(sc) and all(_is_int(m) for m in mins) else None


def _pens(ledger: dict, f: dict) -> dict:
    """The shoot-out of this night: on the match claim, or a penalties claim of the same date (a dossier's)."""
    if isinstance(f.get('penalties'), dict) and f['penalties'].get('winner'):
        return f['penalties']
    for c in ledger.get('claims') or []:
        g = c.get('fact') or {}
        if g.get('kind') == 'penalties' and g.get('date') == f.get('date') and g.get('winner'):
            return {'winner': g['winner'], 'score': g.get('shootout')}
    return {}


def _pair(s) -> tuple[int, int] | None:
    m = re.fullmatch(r'\s*(\d+)\s*[–-]\s*(\d+)\s*', str(s or ''))
    return (int(m.group(1)), int(m.group(2))) if m else None


def _comeback(f: dict, detail: dict | None) -> bool:
    """Behind at some point and not beaten. Proven only by minutes for every goal of both sides, or by a recorded
    half-time score (home–away, as the record prints it)."""
    if _r(f) < 0:
        return False
    cm, om = _club_minutes(f), _opp_minutes(f, detail)
    if cm is not None and om is not None and (cm or om):
        events = sorted([(m, 0, 1) for m in cm] + [(m, 1, -1) for m in om])  # at one minute, count the opponent's first
        lead = 0
        for _, _, d in events:
            lead += d
            if lead < 0:
                return True
        return False
    ht = _pair((detail or {}).get('half_time'))
    if ht and f.get('side') in ('home', 'away'):
        us, them = ht if f['side'] == 'home' else ht[::-1]
        return us < them
    return False


def _late_winner(f: dict, detail: dict | None) -> bool:
    """Won by one goal, and the deciding goal — the club's last — came in the 85th minute or later. With the opponent's
    minutes too, the score must have been level just before it."""
    if f['club_goals'] - f['opponent_goals'] != 1:
        return False
    cm = _club_minutes(f)
    if not cm or cm[-1] < 85:
        return False
    om = _opp_minutes(f, detail)
    if om is not None and detail is not None:
        before = cm[-1]
        return sum(1 for m in cm if m < before) == sum(1 for m in om if m <= before)
    return True


def _ties(ms: list[tuple[str, dict]], club: str | None, pens_of=lambda f: {}) -> dict[str, dict]:
    """Second legs of two-legged ties the ledger holds both legs of: {second leg id: {first, first_result, through}}.
    The pairing the cinema uses (edit.Editor.tie_through): a cup, the same opponent and competition, sides swapped, 1–42
    days apart. And one more test, because a group plays every opponent home and away too: a tie's two legs are never
    interleaved with, or inside, another such pair of the same competition (a group's are — A, B, C, C, A, B)."""
    def meetings(days: int) -> list:
        found = []
        for i, (mid, f) in enumerate(ms):
            if not CUP.search(str(f.get('competition') or '')):
                continue
            d2 = dt.date.fromisoformat(f['date'][:10])
            first = None
            for gid, g in ms[:i]:
                if g.get('opponent') == f.get('opponent') and g.get('competition') == f.get('competition') and g.get('side') != f.get('side'):
                    if 0 < (d2 - dt.date.fromisoformat(g['date'][:10])).days <= days:
                        first = (gid, g)
            if first:
                found.append((first, (mid, f)))
        return found
    pairs = [p for p in meetings(42) if p[1][1].get('stage') != 'Final' and not LEG1.search(str(p[1][1].get('stage') or ''))]
    wide = meetings(120)  # a group's home-and-away can be ten weeks apart
    out = {}
    for (gid, g), (mid, f) in pairs:
        span = (g['date'], f['date'])
        if any(o is not f and q['competition'] == f['competition'] and not (q['date'] > span[1] or o['date'] < span[0])
               for (_, q), (_, o) in wide):
            continue  # a group stage, not a tie
        us, them = g['club_goals'] + f['club_goals'], g['opponent_goals'] + f['opponent_goals']
        through = None
        if us != them:
            through = us > them
        elif (f.get('penalties') or {}).get('winner') or pens_of(f).get('winner'):
            through = ((f.get('penalties') or {}).get('winner') or pens_of(f).get('winner')) == club
        elif f['date'][:7] < '2021-07':  # UEFA dropped away goals from 2021/22
            away_us = g['club_goals'] if g.get('side') == 'away' else f['club_goals']
            away_them = g['opponent_goals'] if g.get('side') == 'home' else f['opponent_goals']
            through = None if away_us == away_them else away_us > away_them
        out[mid] = {'first': gid, 'first_result': _r(g), 'through': through}
    return out


def _runs(ms: list[tuple[str, dict]]) -> list[dict]:
    rs = [_r(f) for _, f in ms]
    ids = [i for i, _ in ms]
    kinds = (('wins', lambda r: r == 1, 3), ('losses', lambda r: r == -1, 3),
             ('unbeaten', lambda r: r >= 0, 5), ('winless', lambda r: r <= 0, 5))
    out = []
    for kind, ok, least in kinds:
        i = 0
        while i < len(rs):
            if not ok(rs[i]):
                i += 1
                continue
            j = i
            while j + 1 < len(rs) and ok(rs[j + 1]):
                j += 1
            n = j - i + 1
            # an unbeaten run of wins only is the winning run said twice; a winless run of defeats only, likewise
            if n >= least and (kind in ('wins', 'losses') or 0 in rs[i:j + 1]):
                out.append({'kind': kind, 'from': ids[i], 'to': ids[j], 'length': n, '_i': i, '_j': j})
            i = j + 1
    out.sort(key=lambda r: (-r['length'], r['_i']))
    return out


def _turn(rs: list[int]) -> tuple[int, float] | None:
    """Where the rolling form changes most: the first match of the new trend, and the change (+ up, − down)."""
    n = len(rs)
    w = 3 if n < 16 else 4 if n < 30 else 5
    if n < 2 * w:
        return None
    best = None
    for i in range(w, n - w + 1):
        d = sum(rs[i:i + w]) / w - sum(rs[i - w:i]) / w
        if best is None or abs(d) > abs(best[1]) + 1e-9:
            best = (i, d)
    if not best or abs(best[1]) < TURN_MIN - 1e-9:
        return None
    i, d = best
    sign = 1 if d > 0 else -1
    j = next((k for k in range(i, min(n, i + w)) if rs[k] == sign), i)  # the turn starts with a result in its direction
    return j, round(d, 3)


def _shape(form: list[int], turn) -> tuple[str, int | None, int | None]:
    """The form line's shape and the two cuts it suggests (indices into the matches)."""
    n = len(form)
    if n < 3:
        return ('single' if n == 1 else 'tie'), None, None
    line = [0, *form]                       # line[k] = form after k matches
    amp = max(3, round(n * 0.12))
    t = min(range(len(line)), key=lambda k: (line[k], k))
    p = max(range(len(line)), key=lambda k: (line[k], -k))
    # a trough inside the season: fell, then climbed back
    if 0 < t < len(line) - 1:
        peak_before = max(range(t + 1), key=lambda k: (line[k], -k))
        if line[peak_before] - line[t] >= amp and line[-1] - line[t] >= amp:
            return 'fall-and-recovery', peak_before, t
    if 0 < p < len(line) - 1:
        low_before = min(range(p + 1), key=lambda k: (line[k], k))
        if line[p] - line[low_before] >= amp and line[p] - line[-1] >= amp:
            return 'rise-and-fall', low_before, p
    if turn and abs(turn[1]) >= 1 and 2 <= turn[0] <= n - 2:
        before = line[turn[0]] / turn[0]
        after = (line[-1] - line[turn[0]]) / (n - turn[0])
        if abs(after - before) >= 0.4 and (after - before) * turn[1] > 0:  # a dip that the season then shrugs off is not its shape
            return ('turn-up' if turn[1] > 0 else 'turn-down'), turn[0], None
    if line[-1] >= 0.3 * n:
        return 'rise', None, None
    if line[-1] <= -0.3 * n:
        return 'fall', None, None
    return 'steady', None, None


# ── moments ───────────────────────────────────────────────────────────────────────────────────────────────────────────
PRIORITY = ['final', 'title-decided', 'comeback', 'late-winner', 'decider', 'derby', 'turning-point', 'biggest-win',
            'run-ended', 'drought-ended', 'worst-defeat', 'europe', 'last', 'first']


def _weights(f: dict, tags: set[str], extra: dict) -> dict[str, float]:
    """What each proven reason is worth to a supporter. A final or the night the title was decided outweighs any
    early round; a won derby outweighs a cup tie against a small club; a qualifier counts less than a quarter-final."""
    w: dict[str, float] = {}
    r, margin = _r(f), abs(f['club_goals'] - f['opponent_goals'])
    stage = str(f.get('stage') or '')
    won = bool(extra.get('through') or (extra.get('through') is None and (r > 0 or extra.get('won_shootout'))))
    if 'final' in tags:
        w['final'] = 13 + (3 if r > 0 or extra.get('won_shootout') else 1)
    if f.get('title_decided'):
        w['title-decided'] = 14
    if 'comeback' in tags:
        w['comeback'] = 9 + (1 if r > 0 else 0)
    if 'late-winner' in tags:
        w['late-winner'] = 7.5
    if 'decider' in tags:
        w['decider'] = (5 + (1.5 if won else 0) + (2 if 'europe' in tags else 0) + (1 if extra.get('pens') else 0)
                        + (1.5 if re.search(r'final|semi|quarter', stage, re.I) else 0)
                        - (1.5 if re.search(r'qualif|early|preliminary', stage, re.I) else 0))
    if 'derby' in tags:
        w['derby'] = 6 + (2 if r > 0 else 0) + (1 if margin >= 2 else 0)
    if 'turning-point' in tags:
        w['turning-point'] = 5
    if 'biggest-win' in tags:
        w['biggest-win'] = 4 + 0.5 * min(margin, 6)
    if extra.get('run_ended'):
        w['run-ended'] = 4 + min(extra['run_ended'], 15) / 5
    if extra.get('drought_ended'):
        w['drought-ended'] = 4 + min(extra['drought_ended'], 15) / 5
    if 'worst-defeat' in tags:
        w['worst-defeat'] = 3.5 + 0.5 * min(margin, 6)
    if 'europe' in tags:
        w['europe'] = 3 + (1 if KO_STAGE.search(stage) and not re.search(r'qualif', stage, re.I) else 0) + (1 if r > 0 else 0)
    if 'last' in tags:
        w['last'] = 2.5
    if 'first' in tags:
        w['first'] = 1.5
    return w


def _tally(fs: list[dict]) -> dict:
    return {'won': sum(_r(f) == 1 for f in fs), 'drawn': sum(_r(f) == 0 for f in fs), 'lost': sum(_r(f) == -1 for f in fs),
            'for': sum(f['club_goals'] for f in fs), 'against': sum(f['opponent_goals'] for f in fs)}


def _note(name: str, fs: list[dict], line_from: int, line_to: int, role: str) -> str:
    t = _tally(fs)
    return (f'{role}: {len(fs)} match{"es" if len(fs) != 1 else ""}, W{t["won"]} D{t["drawn"]} L{t["lost"]}, goals '
            f'{t["for"]}–{t["against"]}; form {line_from:+d} → {line_to:+d}')


def story(ledger: dict) -> dict:
    """The story block of docs/fanlife/66-directors-cut.md §1, computed from the ledger's claims."""
    club = ledger.get('club_name')
    ms = _matches(ledger)
    focus_opp = (ledger.get('focus') or {}).get('opponent')
    rival_sets = _pack_rivals(ledger.get('club_id') or '')
    if focus_opp:
        rival_sets.append([focus_opp])

    rs = [_r(f) for _, f in ms]
    form, gd, acc, g = [], [], 0, 0
    for (_, f), r in zip(ms, rs):
        acc += r
        g += f['club_goals'] - f['opponent_goals']
        form.append(acc)
        gd.append(g)

    tags: list[set[str]] = [set() for _ in ms]
    extra: list[dict] = [{} for _ in ms]
    rivals_met: list[str] = []
    ties = _ties(ms, club, lambda f: _pens(ledger, f))
    for k, (mid, f) in enumerate(ms):
        det = _detail(ledger, f['date'])
        stage, comp = str(f.get('stage') or ''), str(f.get('competition') or '')
        rival = any(same_club(f.get('opponent'), s) for s in rival_sets)
        extra[k]['rival'] = rival
        if rival:
            tags[k].add('derby')
            if f.get('opponent') not in rivals_met:
                rivals_met.append(f['opponent'])
        if stage.strip().lower() == 'final' or comp.lower().endswith(' final'):
            tags[k].add('final')
        if EUROPE.search(comp):
            tags[k].add('europe')
        pens = _pens(ledger, f)
        extra[k]['pens'] = bool(pens)
        if pens.get('winner'):
            extra[k]['won_shootout'] = pens['winner'] == club
        if mid in ties:
            tags[k].add('decider')
            extra[k]['through'] = ties[mid]['through']
            if ties[mid]['first_result'] < 0 and ties[mid]['through']:
                tags[k].add('comeback')  # lost the first leg, went through
        elif 'final' not in tags[k] and (f.get('title_decided') or pens.get('winner') or (
                CUP.search(comp) and KO_STAGE.search(stage) and not LEG1.search(stage)
                and not re.search(r'group|matchday|qualifying round \d, leg 1', stage, re.I))):
            tags[k].add('decider')
        if _comeback(f, det):
            tags[k].add('comeback')
        if _late_winner(f, det):
            tags[k].add('late-winner')

    def best(sign: int) -> list[int]:
        cand = [k for k, (_, f) in enumerate(ms) if rs[k] == sign and abs(f['club_goals'] - f['opponent_goals']) >= 2]
        if not cand:
            return []
        key = (lambda k: (abs(ms[k][1]['club_goals'] - ms[k][1]['opponent_goals']),
                          ms[k][1]['club_goals'] if sign > 0 else ms[k][1]['opponent_goals']))
        top = max(key(k) for k in cand)
        best_ = [k for k in cand if key(k) == top]
        return best_ if len(best_) <= 2 else []  # five 2-0 wins are a habit, not a biggest win
    for k in best(1):
        tags[k].add('biggest-win')
    for k in best(-1):
        tags[k].add('worst-defeat')

    runs = _runs(ms)
    shown_runs = runs[:6]
    for r in shown_runs:
        tags[r['_i']].add('streak-start')
        tags[r['_j']].add('streak-end')
    # the night a long run ended: the defeat after five or more unbeaten, the win after five or more without one
    for r in runs:
        nxt = r['_j'] + 1
        if nxt < len(ms) and r['length'] >= 5 and r['kind'] in ('unbeaten', 'wins') and rs[nxt] == -1:
            extra[nxt]['run_ended'] = max(extra[nxt].get('run_ended', 0), r['length'])
        if nxt < len(ms) and r['length'] >= 5 and r['kind'] in ('winless', 'losses') and rs[nxt] == 1:
            extra[nxt]['drought_ended'] = max(extra[nxt].get('drought_ended', 0), r['length'])

    turn = _turn(rs)
    tp = turn[0] if turn else None
    if tp is not None:
        tags[tp].add('turning-point')
    if ms:
        tags[0].add('first')
        tags[-1].add('last')

    # moments: one per match, its strongest reason first
    moments = []
    for k, (mid, f) in enumerate(ms):
        w = _weights(f, tags[k], extra[k])
        if not w:
            continue
        top = max(w.values())
        why = min((x for x in w if w[x] == top), key=PRIORITY.index)
        total = top + 0.25 * (sum(w.values()) - top) + 0.05 * min(abs(f['club_goals'] - f['opponent_goals']), 6)
        if set(w) <= {'first', 'last'} and len(ms) > 3:
            continue  # an opener or a closer with nothing else is not a moment of a season
        moments.append({'id': mid, 'why': why, 'also': sorted((x for x in w if x != why), key=PRIORITY.index),
                        'weight': total, '_k': k})
    moments.sort(key=lambda m: (-m['weight'], m['_k']))
    moments = moments[:12]
    if moments:
        hi = moments[0]['weight']
        for m in moments:
            m['weight'] = round(m['weight'] / hi, 3)

    shape, c1, c2 = _shape(form, turn)
    acts = _acts(ms, form, shape, c1, c2, tp, moments, ledger)

    out_matches = []
    for k, (mid, f) in enumerate(ms):
        order = ['derby', 'final', 'europe', 'decider', 'biggest-win', 'worst-defeat', 'late-winner', 'comeback',
                 'turning-point', 'streak-start', 'streak-end', 'first', 'last']
        out_matches.append({
            'id': mid, 'date': f['date'], 'competition': f.get('competition'), 'stage': f.get('stage'),
            'opponent': f.get('opponent'), 'side': f.get('side'),
            'club_goals': f['club_goals'], 'opponent_goals': f['opponent_goals'],
            'outcome': {1: 'win', 0: 'draw', -1: 'loss'}[rs[k]], 'form': form[k], 'gd': gd[k], 'rival': extra[k]['rival'],
            'tags': [t for t in order if t in tags[k]],
            **({'through': extra[k]['through']} if 'through' in extra[k] else {}),
        })
    honours = [{'id': c['id'], 'competition': c['fact'].get('competition'), 'result': c['fact'].get('result')}
               for c in ledger.get('claims') or [] if (c.get('fact') or {}).get('kind') == 'honour']
    return {
        'version': STORY_VERSION,
        'matches': out_matches,
        'runs': [{k: v for k, v in r.items() if not k.startswith('_')} for r in shown_runs],
        'turning_point': ms[tp][0] if tp is not None else None,
        'turning_direction': (('up' if turn[1] > 0 else 'down') if turn else None),
        'shape': shape,
        'moments': [{k: v for k, v in m.items() if not k.startswith('_')} for m in moments],
        'rivals': rivals_met,
        'honours': honours,
        'acts': acts,
        'totals': {'played': len(ms), **_tally([f for _, f in ms]), 'form': form[-1] if form else 0, 'gd': gd[-1] if gd else 0,
                   'form_high': max(form) if form else 0, 'form_low': min(form) if form else 0},
        'note': 'Computed from the match claims only. form = wins minus defeats, cumulative — never points, never a league '
                'position (the archive holds only the club\'s own matches). Tags and moments exist only where the claims prove them.',
    }


def _acts(ms, form, shape, c1, c2, tp, moments, ledger) -> list[dict]:
    n = len(ms)
    ids = [m[0] for m in ms]
    fs = [m[1] for m in ms]
    honours = [c['id'] for c in ledger.get('claims') or [] if (c.get('fact') or {}).get('kind') == 'honour']
    if not ms:
        return [{'name': 'Epilogue', 'ids': honours, 'note': 'no readable match'}]
    cold = [moments[0]['id']] if moments else [ids[-1]]
    line = [0, *form]

    def act(name, a, b, role):
        return {'name': name, 'ids': ids[a:b], 'note': _note(name, fs[a:b], line[a], line[b], role)}

    if n < 3:
        acts = [{'name': 'Act I', 'ids': ids[:1], 'note': _note('Act I', fs[:1], 0, form[0], 'the build-up and the first whistle')},
                {'name': 'Act II', 'ids': ids, 'note': _note('Act II', fs, 0, form[-1], 'the match' if n == 1 else 'the tie')},
                {'name': 'Act III', 'ids': ids[-1:], 'note': _note('Act III', fs[-1:], line[-2], form[-1], 'the decisive minutes')}]
    else:
        roles = {'fall-and-recovery': ('the setup', 'the fall', 'the recovery'),
                 'rise-and-fall': ('the setup', 'the rise', 'the fall'),
                 'turn-up': ('the struggle', 'the turn', 'the charge'),
                 'turn-down': ('the good times', 'the turn', 'the run-in'),
                 'rise': ('the setup', 'the march', 'the climax'),
                 'fall': ('the setup', 'the slide', 'the run-in'),
                 'steady': ('the setup', 'the grind', 'the run-in')}[shape]
        if shape in ('fall-and-recovery', 'rise-and-fall'):
            a, b = c1, c2                                   # line indices: act II = matches a..b-1
            if a == 0:                                      # it fell (or rose) from the first whistle: Act I is its start
                a = max(1, b // 2)
        elif shape in ('turn-up', 'turn-down'):
            a = c1
            b = a + max(1, (n - a + 1) // 2)                    # the turn, then what it led to
        else:
            a, b = n // 3, (2 * n) // 3
        if not (0 < a < b < n):
            a, b = max(1, n // 3), max(2, (2 * n) // 3)
            a, b = min(a, n - 2), min(max(b, a + 1), n - 1)
        acts = [act('Act I', 0, a, roles[0]), act('Act II', a, b, roles[1]), act('Act III', b, n, roles[2])]
        climax = next((m['id'] for m in moments if m['id'] in acts[2]['ids']), ids[-1])
        cf = fs[ids.index(climax)]
        acts[2]['note'] += f'; climax: {cf.get("opponent")} on {cf["date"]}'
        if tp is not None:
            for x in acts:
                if ids[tp] in x['ids']:
                    x['note'] += f'; the turning point: {fs[tp].get("opponent")} on {fs[tp]["date"]}'
    return [{'name': 'Cold open', 'ids': cold, 'note': 'the strongest moment the record proves: open on it, then go back'},
            *acts,
            {'name': 'Epilogue', 'ids': [*honours, ids[-1]], 'note': 'what it added up to' + (' — the honours' if honours else '')}]


def story_of(ledger: dict) -> dict:
    """The ledger's story block, computed when an older ledger was written before there was one."""
    s = ledger.get('story')
    return s if isinstance(s, dict) and s.get('version') == STORY_VERSION else story(ledger)


def attach(ledger: dict) -> dict:
    ledger['story'] = story(ledger)
    return ledger
