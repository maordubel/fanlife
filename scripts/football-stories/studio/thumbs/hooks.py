"""The hook on a thumbnail, read off the record (owner, 5.11.2026: "there must be a HOOK tied to the club, the story, the
event, to grab attention — for all categories").

A hook is the few words a supporter's eye stops on, and every one of them is something the archive can prove:

* `score`    — the strongest night's scoreline as a chip ("4–1"), the opponent beside it, and what that night WAS (the
               stake: "THE TITLE NIGHT", "REAL MADRID HELD", "THE NIGHT IT ENDED"), read off `story.moments[0]`.
* `emotion`  — the feeling of the film: the writer's own thumbnail concept when it passes the checks, else what the
               season carried ("THE DOUBLE", "10 UNBEATEN"), else the second night's stake.
* `question` — a question the film answers ("WHO STOPPED THEM?" only when a run was stopped, "HOW DID THEY COME BACK?"
               only when the record shows a comeback).

Every number, name, month and weather word of a hook passes the same checks a script's trailer card passes
(`script.claim_numbers` / `script.cited_words`) against the claims the hook cites — a hook that does not is dropped,
never softened (CLAUDE.md rule 11). Clickbait that lies is impossible by construction: a stake exists only for a reason
the story block proved, a question only for the event that answers it.
"""
from __future__ import annotations

import re

MAX_WORDS = 4


# ── the record ────────────────────────────────────────────────────────────────────────────────────────────────────────
def _story(ledger: dict) -> dict:
    st = ledger.get('story')
    if isinstance(st, dict) and st.get('moments') is not None:
        return st
    from ..director import story_of
    return story_of(ledger)


def _by(ledger: dict) -> dict:
    return {c['id']: c for c in ledger.get('claims') or []}


def _match(by: dict, cid: str | None) -> dict | None:
    c = by.get(cid or '')
    f = (c or {}).get('fact') or {}
    return f if f.get('kind') == 'match' and isinstance(f.get('club_goals'), int) and isinstance(f.get('opponent_goals'), int) else None


def short_name(name: str | None, limit: int = 14) -> str | None:
    """The opponent as a supporter says it on a thumbnail: the full name when it is short, else its distinctive words
    ("FK Velež Mostar" → "VELEŽ MOSTAR"), else nothing (a long name is not a hook)."""
    if not name:
        return None
    n = name.strip()
    if len(n) <= limit:
        return n.upper()
    from ..director import GENERIC
    words = [w for w in re.split(r'\s+', n) if w.lower().strip('.') not in GENERIC]
    s = ' '.join(words)
    if len(s) <= limit:
        return s.upper()
    return words[0].upper() if words and len(words[0]) <= limit and len(words[0]) > 3 else None


def _won_honour(st: dict, by: dict, competition: str | None) -> str | None:
    """The honour claim that proves `competition` was won, if any."""
    for h in st.get('honours') or []:
        if (h.get('result') or '').lower() in ('won', 'winner', 'winners', 'champions') and \
                (competition is None or (h.get('competition') or '').lower() == (competition or '').lower()):
            return h.get('id')
    return None


# ── what a night WAS (the stake) ──────────────────────────────────────────────────────────────────────────────────────
def stake(why: str, f: dict, st: dict, by: dict, also: list[str] | None = None) -> tuple[str, list[str]] | None:
    """The words for what this night was, and any extra claim they rest on. None when the reason gives no honest line."""
    o = f.get('outcome') or ('win' if f['club_goals'] > f['opponent_goals'] else 'draw' if f['club_goals'] == f['opponent_goals'] else 'loss')
    opp = short_name(f.get('opponent'), 13)
    extra: list[str] = []
    if why == 'final':
        h = _won_honour(st, by, f.get('competition'))
        if h:
            return 'CUP WINNERS', [h]
        return ('FINAL GLORY' if o == 'win' else 'THE LOST FINAL' if o == 'loss' else 'THE FINAL'), extra
    if why == 'title-decided':
        h = next((x.get('id') for x in st.get('honours') or [] if (x.get('result') or '').lower() in ('won', 'winner', 'winners', 'champions')
                  and re.search(r'league|liga|division|championship|super', x.get('competition') or '', re.I)), None)
        return ('CHAMPIONS!', [h]) if h else ('THE TITLE NIGHT', extra)
    if why == 'comeback':
        return 'THE COMEBACK', extra
    if why == 'late-winner':
        return 'THE LATE WINNER', extra
    if why == 'decider':
        thr = next((m.get('through') for m in st.get('matches') or [] if m.get('date') == f.get('date') and m.get('opponent') == f.get('opponent')), None)
        if thr is True:
            return 'THROUGH!', extra
        if thr is False:
            return 'KNOCKED OUT', extra
        return 'ALL OR NOTHING', extra
    if why == 'derby':
        return ('DERBY DAY' if o == 'win' else 'DERBY HEARTBREAK' if o == 'loss' else 'THE DERBY'), extra
    if why == 'turning-point':
        return 'THE NIGHT IT TURNED', extra
    if why == 'biggest-win':
        return (f'{opp} THRASHED' if opp and len(opp.split()) <= 2 else 'THE THRASHING'), extra
    if why == 'worst-defeat':
        return 'THE NIGHT IT HURT', extra
    if why == 'run-ended':
        return 'THE NIGHT IT ENDED', extra
    if why == 'drought-ended':
        return 'AT LAST', extra
    if why == 'europe':
        if opp and len(opp.split()) <= 2:
            return (f'{opp} BEATEN' if o == 'win' else f'{opp} HELD' if o == 'draw' else 'A EUROPEAN NIGHT'), extra
        return 'A EUROPEAN NIGHT', extra
    if why == 'first':
        return 'WHERE IT BEGAN', extra
    if why == 'last':
        return 'THE LAST NIGHT', extra
    return None


def _moment_tag(m: dict, f: dict) -> str:
    """Which picture a moment wants (the Drive library's thumb-hero tags): penalty, europe, derby, trophy, despair, goal."""
    reasons = [m.get('why')] + list(m.get('also') or [])
    o = f.get('outcome')
    if 'final' in reasons or 'title-decided' in reasons:
        return 'trophy' if o != 'loss' else 'despair'
    if f.get('penalties') or any(x and x.get('penalty') for x in f.get('scorers') or [] if isinstance(x, dict)):
        return 'penalty'
    if o == 'loss' and any(r in reasons for r in ('worst-defeat', 'run-ended', 'decider', 'derby')):
        return 'despair'
    if 'derby' in reasons:
        return 'derby'
    if 'europe' in reasons or re.search(r'uefa|champions|europa|conference|cup winners|intertoto|fairs', f.get('competition') or '', re.I):
        return 'europe'
    return 'goal' if o == 'win' else 'despair' if o == 'loss' else 'terrace'


# ── questions the film answers ────────────────────────────────────────────────────────────────────────────────────────
def questions(st: dict, by: dict) -> list[tuple[str, list[str], str]]:
    """(question, claim ids that make it honest, picture tag), strongest first. A question is asked only when the record
    holds its answer."""
    out: list[tuple[str, list[str], str]] = []
    ms = st.get('moments') or []
    for m in ms:
        f = _match(by, m['id'])
        if not f:
            continue
        reasons = [m['why']] + list(m.get('also') or [])
        if 'run-ended' in reasons:
            out.append(('WHO STOPPED THEM?', [m['id']], 'despair'))
        if 'comeback' in reasons:
            out.append(('HOW DID THEY COME BACK?', [m['id']], 'goal'))
        if 'late-winner' in reasons:
            out.append(('WHO WON IT LATE?', [m['id']], 'goal'))
        if 'final' in reasons:
            won = _won_honour(st, by, f.get('competition'))
            if won or f.get('outcome') == 'win':
                out.append(('HOW DID THEY WIN IT?', [m['id']] + ([won] if won else []), 'trophy'))
            elif f.get('outcome') == 'loss':
                out.append(('WHAT WENT WRONG?', [m['id']], 'despair'))
        if 'worst-defeat' in reasons:
            out.append(('HOW DID THIS HAPPEN?', [m['id']], 'despair'))
        if 'derby' in reasons:
            out.append(('WHO WON THE DERBY?', [m['id']], 'derby'))
        if 'title-decided' in reasons:
            out.append(('WHERE WAS IT DECIDED?', [m['id']], 'trophy'))
    played = (st.get('totals') or {}).get('played') or len(st.get('matches') or [])
    first = next((m['id'] for m in ms if _match(by, m['id'])), None)
    if first:
        out.append(('HOW DID IT END?', [first], 'terrace'))
    rank = ['WHO STOPPED THEM?', 'HOW DID THEY COME BACK?', 'WHO WON IT LATE?', 'HOW DID THEY WIN IT?', 'WHAT WENT WRONG?',
            'WHO WON THE DERBY?', 'HOW DID THIS HAPPEN?', 'WHERE WAS IT DECIDED?']
    out.sort(key=lambda q: rank.index(q[0]) if q[0] in rank else len(rank))
    seen, uniq = set(), []
    for q in out:
        if q[0] not in seen:
            seen.add(q[0])
            uniq.append(q)
    return uniq


# ── what the season carried ───────────────────────────────────────────────────────────────────────────────────────────
def season_lines(st: dict) -> list[tuple[str, list[str], str]]:
    out: list[tuple[str, list[str], str]] = []
    won = [h for h in st.get('honours') or [] if (h.get('result') or '').lower() in ('won', 'winner', 'winners', 'champions')]
    if len(won) >= 2:
        out.append(('THE DOUBLE' if len(won) == 2 else 'THE TREBLE' if len(won) == 3 else 'THE CLEAN SWEEP', [h['id'] for h in won], 'trophy'))
    elif won:
        lg = re.search(r'league|liga|division|championship|super', won[0].get('competition') or '', re.I)
        out.append(('CHAMPIONS!' if lg else 'CUP WINNERS', [won[0]['id']], 'trophy'))
    for r in st.get('runs') or []:
        n = r.get('length') or 0
        k = r.get('kind')
        line = None
        if k == 'wins' and n >= 4:
            line = f'{n} IN A ROW'
        elif k == 'unbeaten' and n >= 6:
            line = f'{n} UNBEATEN'
        elif k == 'winless' and n >= 5:
            line = f'{n} WITHOUT A WIN'
        elif k == 'losses' and n >= 4:
            line = f'{n} STRAIGHT DEFEATS'
        if line:
            out.append((line, ['story', r['from'], r['to']], 'despair' if k in ('winless', 'losses') else 'terrace'))
    return out


def match_lines(ms: list[dict], by: dict) -> list[tuple[str, list[str], str]]:
    """Lines a single night carries on its own record: the man who scored twice, the competition's big night."""
    out: list[tuple[str, list[str], str]] = []
    for m in ms[:3]:
        f = _match(by, m['id'])
        names = [x.get('name') for x in f.get('scorers') or [] if isinstance(x, dict) and x.get('name') and not x.get('own_goal')]
        for n in dict.fromkeys(names):
            k = names.count(n)
            sur = n.split()[-1].upper()
            if k >= 3 and len(sur) <= 12:
                out.append((f'{sur} HAT-TRICK', [m['id']], 'goal'))
            elif k == 2 and len(sur) <= 12:
                out.append((f'{sur} TWICE', [m['id']], 'goal'))
        comp = (f.get('competition') or '').upper().replace('UEFA ', '')
        if re.search(r'CHAMPIONS LEAGUE|EUROPEAN CUP|EUROPA|CUP WINNERS|UEFA CUP|CONFERENCE', comp) and len(comp.split()) <= 2:
            out.append((f'{comp} NIGHT', [m['id']], 'europe'))
    return out


# ── the checks ───────────────────────────────────────────────────────────────────────────────────────────────────────
def hook_text(h: dict) -> str:
    return ' '.join(x for x in (h.get('headline'), h.get('chip'), h.get('label'), h.get('kicker'), h.get('sub')) if x)


def check_hook(h: dict, ledger: dict) -> list[str]:
    """Why this hook may not be printed (empty = it may): too many words, a number no cited claim carries, a club,
    person, month, weekday or weather the cited claims do not hold."""
    from ..script import claim_numbers, cited_words, numbers_in_text
    errs = []
    head = h.get('headline') or ''
    words = [w for w in head.split() if re.search(r'[A-Za-z0-9]', w)]
    if not words or len(words) > MAX_WORDS:
        errs.append(f'headline "{head}" must be 1–{MAX_WORDS} words')
    cites = [c for c in h.get('claims') or [] if c]
    by = _by(ledger)
    for c in cites:
        if c != 'story' and c not in by:
            errs.append(f'cites {c}, which is not in the ledger')
    allowed = claim_numbers(ledger, cites)
    for n in sorted(numbers_in_text(hook_text(h))):
        if n not in allowed:
            errs.append(f'number {n} is in no cited claim')
    errs += cited_words(hook_text(h), by, [c for c in cites if c in by], ledger)
    return errs


def _fold(s: str) -> str:
    return re.sub(r'[^a-z0-9 ]+', '', (s or '').lower()).strip()


# ── the three hooks of a documentary ─────────────────────────────────────────────────────────────────────────────────
def kicker(ledger: dict, f: dict | None, single: bool) -> str:
    club = (ledger.get('club_name') or '').upper()
    if single and f and f.get('date'):
        return f"{club} · {f['date'][:4]}"
    season = str(ledger.get('season') or '').replace('/', '–')
    return f'{club} · {season}' if season and re.search(r'\d', season) else club


def film_hooks(script: dict | None, ledger: dict) -> list[dict]:
    """Three hooks for a documentary — score, emotion, question — each with different words, each passing
    `check_hook`. Fewer than three only when the record cannot give three honest ones (then the next kind repeats with
    another moment)."""
    st, by = _story(ledger), _by(ledger)
    ms = [m for m in st.get('moments') or [] if _match(by, m['id'])]
    single = ((st.get('totals') or {}).get('played') or len(st.get('matches') or [])) <= 2
    cands: dict[str, list[dict]] = {'score': [], 'emotion': [], 'question': []}

    for m in ms[:6]:
        f = _match(by, m['id'])
        s = stake(m['why'], f, st, by, m.get('also'))
        if not s:
            continue
        tag = _moment_tag(m, f)
        cands['score'].append({'kind': 'score', 'headline': s[0], 'chip': f"{f['club_goals']}–{f['opponent_goals']}",
                               'label': f"v {(f.get('opponent') or '').upper()}".strip(), 'sub': (f.get('competition') or '').upper(),
                               'kicker': kicker(ledger, f, single), 'claims': [m['id'], *s[1]], 'tag': tag, 'moment': m['id'],
                               'outcome': f.get('outcome'), 'side': f.get('side'), 'opponent': f.get('opponent'), 'target': 'chip'})
    # the writer's own concepts first for the emotion: they were written for this film
    for th in (script or {}).get('thumbnails') or []:
        t = (th.get('text') or '').strip()
        if not t:
            continue
        cid = th.get('claim')
        f = _match(by, cid)
        tag = 'trophy' if (by.get(cid or '') or {}).get('fact', {}).get('kind') == 'honour' else (
            _moment_tag(next((m for m in ms if m['id'] == cid), {'why': ''}), f) if f else 'terrace')
        cands['emotion'].append({'kind': 'emotion', 'headline': t.upper(), 'kicker': kicker(ledger, f, single),
                                 'claims': [cid] if cid else [], 'tag': tag, 'source': 'writer', 'target': 'headline',
                                 'concept': th.get('concept')})
    for line, cl, tag in season_lines(st):
        cands['emotion'].append({'kind': 'emotion', 'headline': line, 'kicker': kicker(ledger, None, single),
                                 'claims': cl, 'tag': tag, 'source': 'story', 'target': 'headline'})
    for line, cl, tag in match_lines(ms, by):
        cands['emotion'].append({'kind': 'emotion', 'headline': line, 'kicker': kicker(ledger, _match(by, cl[0]), single),
                                 'claims': cl, 'tag': tag, 'source': 'story', 'target': 'headline'})
    for m in ms[1:4]:
        f = _match(by, m['id'])
        s = stake(m['why'], f, st, by, m.get('also'))
        if s:
            cands['emotion'].append({'kind': 'emotion', 'headline': s[0], 'kicker': kicker(ledger, f, single),
                                     'claims': [m['id'], *s[1]], 'tag': _moment_tag(m, f), 'source': 'story', 'target': 'headline'})
    for q, cl, tag in questions(st, by):
        f = _match(by, cl[0])
        cands['question'].append({'kind': 'question', 'headline': q, 'kicker': kicker(ledger, f if single else None, single),
                                  'claims': cl, 'tag': tag, 'target': 'figure'})

    for hs in cands.values():
        for h in hs:
            f = next((_match(by, c) for c in h.get('claims') or [] if _match(by, c)), None)
            if f and 'side' not in h:
                h['side'] = f.get('side')
    out: list[dict] = []
    used: set[str] = set()
    tags_used: list[str] = []
    for kind in ('score', 'emotion', 'question'):
        for h in cands[kind]:
            if _fold(h['headline']) in used or check_hook(h, ledger):
                continue
            out.append(h)
            used.add(_fold(h['headline']))
            tags_used.append(h['tag'])
            break
    # a film the record gives little to: fill from any kind left, never by repeating words
    if len(out) < 3:
        for kind in ('emotion', 'score', 'question'):
            for h in cands[kind]:
                if len(out) >= 3:
                    break
                if _fold(h['headline']) not in used and not check_hook(h, ledger):
                    out.append(h)
                    used.add(_fold(h['headline']))
    return out[:3]


# ── CLASSIFIED and I WAS THERE ───────────────────────────────────────────────────────────────────────────────────────
def classify_line(text: str) -> str:
    t = text.strip()
    if t.endswith('?'):
        return 'question'
    if re.search(r'\d', t):
        return 'score'
    return 'emotion'


def classified_hooks(ep: dict) -> list[dict]:
    """A FILE's three hooks are its approved script's (`package.thumbnails`): the owner approved every word. They are
    ordered so the three are different kinds where the script allows (score / emotion / question)."""
    rows = []
    for th in (ep.get('package') or {}).get('thumbnails') or []:
        lines = [str(x).strip() for x in th.get('hook') or [] if str(x).strip()]
        if not lines:
            continue
        rows.append({'kind': classify_line(lines[-1]), 'lines': lines, 'headline': ' '.join(lines), 'panel': th.get('panel'),
                     'source': 'approved script', 'target': 'photo'})
    return rows


def _minute(label) -> float:
    m = re.match(r"\s*(\d+)(?:\s*\+\s*(\d+))?", str(label or ''))
    return int(m.group(1)) + (int(m.group(2)) / 100 if m.group(2) else 0) if m else 999.0


def night_lines(fx: dict) -> list[str]:
    """What the night's own goal list proves: the winner came from N down, the winner came late."""
    goals = sorted((g for g in fx.get('goals') or [] if g.get('side') in ('home', 'away')), key=lambda g: _minute(g.get('minute_label')))
    hs, as_ = fx.get('home_score'), fx.get('away_score')
    if not goals or not isinstance(hs, int) or not isinstance(as_, int) or len(goals) != hs + as_ or hs == as_:
        return []
    win = 'home' if hs > as_ else 'away'
    h = a = 0
    worst = (0, 0, 0)
    for g in goals:
        if g['side'] == 'home':
            h += 1
        else:
            a += 1
        mine, theirs = (h, a) if win == 'home' else (a, h)
        if theirs - mine > worst[0]:
            worst = (theirs - mine, mine, theirs)
    out = []
    if worst[0] >= 2:
        out.append(f'FROM {worst[1]}–{worst[2]} DOWN')
    last = goals[-1]
    if last['side'] == win and _minute(last.get('minute_label')) >= 85 and abs(hs - as_) == 1:
        out.append('THE LATE WINNER')
    return out


def vlog_hooks(ep: dict, cut: str = 'film') -> list[dict]:
    """An I WAS THERE episode's hooks: the night's scoreline from the fixture with what its goal list proves (or the
    episode's own thumbnail line, already checked against its claims by vlog_auto), the episode's line on its own, and
    the question every supporter in the picture can answer."""
    fx = ep.get('fixture') or {}
    th = (ep.get(cut) or {}).get('thumbnail') or (ep.get('film') or {}).get('thumbnail') or {}
    hs, hm = fx.get('home_score'), fx.get('away_score')
    score = f'{hs}–{hm}' if isinstance(hs, int) and isinstance(hm, int) else None
    home, away = fx.get('home_short') or fx.get('home'), fx.get('away_short') or fx.get('away')
    line = (th.get('text') or '').strip().upper()
    derived = night_lines(fx)
    ground = (fx.get('ground') or '').upper()
    out = []
    if score:
        out.append({'kind': 'score', 'headline': (derived[0] if derived else line) or 'FULL TIME', 'chip': score,
                    'label': f'{home} v {away}'.upper(), 'sub': ' · '.join(x for x in (fx.get('ground'), fx.get('date_long')) if x).upper(),
                    'target': 'chip'})
    emo = next((x for x in [line, *derived[1:]] if x and x != out[0]['headline']), None) if out else line
    if not emo and ground and len(ground.split()) <= 3:
        emo = f'NIGHT AT {ground}' if len(ground.split()) <= 2 else ground
    if emo:
        out.append({'kind': 'emotion', 'headline': emo, 'sub': (th.get('sub') or fx.get('date_long') or '').upper(), 'target': 'headline'})
    out.append({'kind': 'question', 'headline': 'WERE YOU THERE?', 'sub': f'{home} v {away} · {fx.get("year") or ""}'.strip(' ·').upper(),
                'chip': score, 'label': f'{home} v {away}'.upper() if score else None, 'target': 'figure'})
    return out[:3]


def vlog_numbers_ok(h: dict, ep: dict) -> list[str]:
    """Every number on a vlog thumbnail is in the episode's fixture or its sources (the episode's claims)."""
    import json
    from ..script import numbers_in_text, numbers_in_value
    allowed = numbers_in_value(ep.get('fixture') or {})
    for s in ep.get('sources') or []:
        allowed |= numbers_in_text(json.dumps(s, ensure_ascii=False))
    allowed |= {0, 1, 11, 45, 90}
    return [f'number {n} is in no claim of the episode' for n in sorted(numbers_in_text(hook_text(h))) if n not in allowed]
