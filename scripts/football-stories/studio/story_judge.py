"""THE STORY JUDGE — does this script tell a football story a supporter would watch to the end?

Owner, 28.11.2026: "still far from a realistic script that sticks to the facts, builds tension, understands football,
knows how to tell a football story … far from viral, interesting, gripping, precise." Measured the same day on the
house writer's Celtic 2016/17 scripts (the season of the treble):

    * the film opened on a 3–0 over Lincoln Red Imps (part-timers from Gibraltar) and never said what the season won
    * one stock line in three ("supporters still describe with their hands", "football keeps its best timing for the end")
    * a question every second sentence ("And then?", "So where did it begin?")
    * club names cut to "L Red Imps", "H Beer-Sheva", "Man City"
    * "beaten 2–0 … and Celtic were through", with no aggregate: true, and senseless to a viewer
    * a list of results and tallies read aloud ("12 matches, 3 of them won, 5 lost")

Each of those is a rule here, read the same way every time — no model decides. `judge(script, ledger)` returns a score
out of 100, a verdict and every failure with the sentence that caused it, so a writer can be told exactly what to fix
(studio/writer.py asks for one rewrite against this list) and the hook pick prefers the script that tells the story.
"""
from __future__ import annotations

import re

PASS = 70

# stock lines: true of every match ever played, so they say nothing about this one (each one costs the viewer a beat)
STOCK = [
    r'describe with their hands', r'best timing for the end', r'difficult on purpose', r'now you know why',
    r'nobody saw (?:what was|it) coming', r'is (?:that|this) (?:even )?real', r'hearts? in (?:our|their) mouths?',
    r'still remember(?:s)? it', r'it usually does', r'the rest is history', r'what happened next',
    r'you won\'t believe', r'little did (?:they|we|anyone) know', r'football is a funny game', r'nothing is ever simple',
    r'the record keeps', r'the ordinary weeks', r'not a disaster\. not a promise', r'a night (?:we|they) still talk about',
    r'strangers hugging', r'sang all the way home', r'heads? down', r'week after week', r'match after match',
    r'(?:the )?calendar was not on (?:their|our) side', r'nobody had told the opposition', r'round the corner',
    r'and for once,? nobody', r'football (?:keeps|has|always)', r'that is football', r'only football',
    r'(?:one|a) night that', r'every supporter', r'supporters? like us', r'faster than the trains',
    r'hope is a dangerous thing', r'read the same script', r'out of nowhere', r'the stuff of legend',
]
STOCK_RE = re.compile('|'.join(STOCK), re.I)
# a club name cut to an initial: "L Red Imps", "H. Beer-Sheva", "Man City", "B. Dortmund"
CUT_NAME = re.compile(r"\b(?:[A-Z]\.?\s(?=[A-Z][a-z])|Man (?:City|Utd|United)\b|Nott'm|M'gladbach)")
TALLY = re.compile(r'\b\d+ (?:matches|games)\b[^.]{0,40}\b\d+ (?:of them )?(?:won|wins|drawn|draws|lost|defeats)\b|\bW\d+ D\d+ L\d+\b|'
                   r'\b\d+ wins?, \d+ draws?, \d+ defeats?\b', re.I)
RESULT_ONLY = re.compile(r'^(?:[^.]{0,40}\b(?:beat|defeated|lost to|drew with|were beaten|were held|won)\b[^.]{0,40}\d+\s*[–-]\s*\d+[^.]{0,30}\.)$', re.I)
DATE = re.compile(r'\b\d{1,2} (?:January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\b')
NUMBER = re.compile(r'\b\d[\d,.]*\b|\b(?:first|second|third|fourth|fifth|last|twice|three|four|five|six|seven|eight|nine|ten)\b', re.I)


def sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r'(?<=[.!?])\s+(?=[A-Z0-9"“‘])', text.strip()) if s.strip()]


def _beats(script: dict) -> list[str]:
    from .script import all_beats
    return [str(b.get('narration') or '') for *_, b in all_beats(script)]


def _names(ledger: dict) -> set[str]:
    out = {str(ledger.get('club_name') or '')}
    for c in ledger.get('claims') or []:
        f = c.get('fact') or {}
        for k in ('opponent', 'name', 'venue', 'competition', 'city'):
            v = f.get(k)
            if isinstance(v, dict):
                v = v.get('name')
            if isinstance(v, str) and len(v) > 2:
                out.add(v)
        for s in f.get('scorers') or []:
            if isinstance(s, dict) and s.get('name'):
                out.add(s['name'])
    return {n for n in out if n}


def _anchored(s: str, names: set[str]) -> bool:
    """A sentence carries something only this story has: a number, a date or a name the evidence names."""
    if NUMBER.search(s) or DATE.search(s):
        return True
    low = s.lower()
    return any(len(w) > 3 and w.lower() in low for n in names for w in [n, n.split()[-1]])


def judge(script: dict, ledger: dict) -> dict:
    beats = _beats(script)
    text = ' '.join(beats)
    ss = sentences(text)
    words = max(1, len(text.split()))
    names = _names(ledger)
    fails: list[dict] = []

    def fail(rule: str, cost: float, where: str = '') -> None:
        fails.append({'rule': rule, 'cost': round(cost, 1), 'where': where[:160]})

    # 1 stock lines
    for s in ss:
        m = STOCK_RE.search(s)
        if m:
            fail('stock', 4, s)
    # 2 questions: one a chapter can open a door; one in every few sentences is a tic
    qs = [s for s in ss if s.rstrip().endswith('?')]
    per100 = 100 * len(qs) / words
    if per100 > 1.2:
        fail('questions', min(20, (per100 - 1.2) * 8), f'{len(qs)} questions in {words} words: ' + ' / '.join(qs[:3]))
    # 3 club names cut to an initial
    for s in ss:
        if CUT_NAME.search(s):
            fail('cut-name', 5, s)
    # 4 tallies read aloud
    for s in ss:
        if TALLY.search(s):
            fail('tally', 4, s)
    # 5 a list of results: three bare results in a row is a fixture list, not a story
    streak = 0
    for s in ss:
        streak = streak + 1 if RESULT_ONLY.match(s) else 0
        if streak == 3:
            fail('fixture-list', 6, s)
    # 6 sentences with nothing of this story in them
    empty = [s for s in ss if not _anchored(s, names) and len(s.split()) > 4]
    share = len(empty) / max(1, len(ss))
    if share > 0.35:
        fail('vague', min(18, (share - 0.35) * 60), f'{len(empty)} of {len(ss)} sentences name nothing: ' + ' / '.join(empty[:3]))
    # 7 the season's achievement: a film about a season that won something says so
    won = [c['fact'].get('competition') for c in ledger.get('claims') or [] if (c.get('fact') or {}).get('kind') == 'honour' and c['fact'].get('result') == 'won']
    if won:
        told = [w for w in won if w and any(t in text.lower() for t in _tokens(w))]
        if not told:
            fail('untold-honour', 15, 'won: ' + ', '.join(w for w in won if w))
    # 8 the strongest moment by significance opens the film (studio/director.py → story.moments[0])
    st = ledger.get('story') or {}
    top = (st.get('moments') or [{}])[0]
    by = {c['id']: c.get('fact') or {} for c in ledger.get('claims') or []}
    top = {**by.get(top.get('id'), {}), **top}
    opp = str(top.get('opponent') or '')
    if opp and beats:
        head = ' '.join(beats[: max(2, len(beats) // 6)])
        if not any(w.lower() in head.lower() for w in [opp, opp.split()[-1]] if len(w) > 3):
            fail('weak-open', 8, f'the opening never reaches the season\'s strongest moment ({opp}, {top.get("date")})')
    # 9 a result that contradicts itself without the aggregate ("lost 2–0 … and were through")
    for s in ss:
        if re.search(r'\b(?:beaten|lost|defeat)\b', s, re.I) and re.search(r'\bthrough\b', s, re.I) and not re.search(r'aggregate|over (?:the )?two legs|on away goals|\d+\s*[–-]\s*\d+ overall', s, re.I):
            fail('tie-sense', 6, s)
    # 10 the same opening three words, again and again
    starts: dict[str, int] = {}
    for s in ss:
        k = ' '.join(s.lower().split()[:2])
        starts[k] = starts.get(k, 0) + 1
    worst = max(starts.items(), key=lambda kv: kv[1], default=('', 0))
    if worst[1] >= max(4, len(ss) // 8):
        fail('monotone', 5, f'{worst[1]} sentences open "{worst[0]}"')
    score = max(0, round(100 - sum(f['cost'] for f in fails)))
    return {'score': score, 'verdict': 'pass' if score >= PASS else 'rewrite', 'sentences': len(ss), 'words': words,
            'questions_per_100_words': round(per100, 2), 'vague_share': round(share, 2), 'failures': fails}


def _tokens(comp: str) -> list[str]:
    c = comp.lower()
    out = [c]
    if 'premiership' in c or 'premier league' in c or 'league' in c:
        out += ['league', 'title', 'champions', 'premiership']
    if 'cup' in c:
        out += [c.replace('scottish ', '').replace('the ', ''), 'cup']
    return [t for t in out if t]


def brief_for_rewrite(verdict: dict, limit: int = 12) -> str:
    """The judge's findings as a short list a writer can act on (studio/writer.py)."""
    lines = []
    for f in sorted(verdict['failures'], key=lambda f: -f['cost'])[:limit]:
        lines.append(f'- {RULES[f["rule"]]}' + (f' — e.g. "{f["where"]}"' if f['where'] else ''))
    return '\n'.join(lines)


RULES = {
    'stock': 'Cut every stock line that could be said of any match ever played; replace it with a fact of this one',
    'questions': 'At most one question per chapter; state, don\'t ask',
    'cut-name': 'Write every club\'s full name (Lincoln Red Imps, Hapoel Beer-Sheva, Manchester City), never an initial',
    'tally': 'Never read a tally aloud (W/D/L counts); give the one number that matters and what it meant',
    'fixture-list': 'No run of bare results: pick the match that mattered and tell it as a scene',
    'vague': 'Every sentence must carry something only this story has: a name, a minute, a score, a number, a place',
    'untold-honour': 'Say what the season won — the trophies are the story, and the film must build to them',
    'weak-open': 'Open on the season\'s strongest moment (the story block\'s first moment), its result withheld',
    'tie-sense': 'When a lost leg still took the club through, say the aggregate in the same sentence',
    'monotone': 'Vary how sentences begin',
}
