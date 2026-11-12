"""More VOX and more kinetic type INSIDE the documentary (owner, 12.11.2026: "More VOX editing. More HyperFrames editing.
More documentary editing.").

The engines were alternatives: a film was DOCU or it was VOX. Now DOCU is an editor that cuts between three LANGUAGES
inside one film, and the plan decides per beat which tells it best:

    documentary   art and the camera (studio/camera.py) — a place, a face, a feeling
    explainer     the VOX board's devices, drawn by the same HyperFrames page: a pen-drawn line, a highlighter, odometer
                  numbers that roll up, labelled ticks and arrows, bars that grow — for anything that is an EXPLANATION
                  (when the goals came, how long the wait was, a record, a table, a journey)
    kinetic       type that arrives with the voice — a quote, a chant, the one short line a beat turns on

VOX's pen, highlighter and odometer existed only on the board engines (vox/elements.py in PIL, hyperframes/build.B for
vox-hf, both tied to the board's coordinates). The smallest useful set is ported to the DOCU page (build.Film.explain,
Film.kinetic) rather than shelling out to a second renderer per shot: `timeline`, `number`, `bars`.

SOURCED OR ABSENT (rules 2, 11). Every builder here reads a claim's own fields — a scorer's name and minute, a counted
number, a record's cells — and every device then passes Designer.sourced(), which drops it if it would print a word or
a number outside the ledger and the beat's own checked words. A kinetic line prints only words the narrator says in
that beat. Nothing is estimated, rounded or labelled with a word the record does not hold.

THE MIX (named, reported by the gate — qa.experience 'language mix'):
"""
from __future__ import annotations

import re

from ..script import numbers_in_text

# No more than this share of a film's running time is plain art shots (owner: "more VOX … more HyperFrames … more
# documentary" — three languages, none of them the whole film). Batch 3's pilot passage was 72% plain.
PLAIN_MAX = 0.55
# A chapter whose beats hold data an explainer can draw gets at least this many explainer passages.
EXPLAINERS_PER_CHAPTER = 1
# A kinetic line is short enough to read as it is said: a sentence of at most this many words …
PUNCH_WORDS = 8
PUNCH_MIN_S = 1.6          # … on screen at least this long
EXPLAIN_MIN_S = 3.2        # an explainer shorter than this cannot be read (the pen, the ticks, a hold)
# … and one longer than this is a held shot to the gate (qa.MAX_SHOT_S 4.5: measured on the pilot, a 6 s board failed
# 'shot length' — its ticks arriving are not a change of picture). The picture carries the rest of the beat.
EXPLAIN_MAX_S = 4.2
EXPLAIN_KINDS = {'explain', 'table', 'form', 'ledger', 'tally', 'cities', 'chalk', 'stat'}
READ_S = {'question': 3.0, 'lead': 3.0, 'word': 2.6}   # a title is type while it arrives and is read; a slammed word leaves after editor.WORD_HOLD
KINETIC_KINDS = {'kinetic', 'word', 'quote', 'question', 'lead', 'rule', 'verdict'}
GOAL_TALK = re.compile(r'\b(goals?|scored|scorer|minutes?|extra time|late|early|apart|equalis\w+|winner)\b', re.I)
# A counted field of a claim and the word that names it on screen. The word is the ledger's own field, in capitals.
FIELD_LABEL = {'gap_seasons': 'SEASONS', 'attendance': 'ATTENDANCE', 'points': 'POINTS', 'goals_for': 'GOALS SCORED',
               'goals_against': 'GOALS CONCEDED', 'won': 'WON', 'drawn': 'DRAWN', 'lost': 'LOST', 'unbeaten': 'UNBEATEN',
               'run': 'IN A ROW', 'position': 'PLACE', 'played': 'PLAYED', 'gap_years': 'YEARS', 'years': 'YEARS', 'titles': 'TITLES'}


def surname(name: str) -> str:
    return (name or '').split()[-1].upper() if name else ''


def goal_timeline(f: dict, club: str) -> dict | None:
    """When the goals came: the match's clock as a pen line, a tick for every scorer the claim records with a minute.
    The span is 90, or 120 when a goal came after the ninetieth. None when no scorer has a minute."""
    sc = [x for x in (f.get('scorers') or []) if isinstance(x.get('minute'), int) and x.get('name')]
    if f.get('kind') != 'match' or not sc:
        return None
    span = 120 if any(x['minute'] > 90 for x in sc) else 90
    ticks = [{'at': round(min(1.0, x['minute'] / span), 4), 'label': surname(x['name']), 'value': x['minute'], 'suffix': "'"} for x in sorted(sc, key=lambda x: x['minute'])]
    ticks[-1]['hot'] = True
    return {'kind': 'explain', 'form': 'timeline', 'title': ' · '.join(x for x in ((f.get('competition') or '').upper(), (f.get('stage') or '').upper() if f.get('stage') not in (None, 'League') else '') if x),
            'left': "0'", 'right': f"{span}'", 'marks': [{'at': 0.75, 'label': "90'"}] if span == 120 else [{'at': 0.5, 'label': "45'"}], 'ticks': ticks}


def number(narration: str, facts: list[dict]) -> dict | None:
    """One counted number the beat SAYS and a cited claim HOLDS — the wait in seasons, the crowd, the points — as an
    odometer with the ledger's own word under it. The first such field wins; a number nobody says is not shown."""
    said = numbers_in_text(narration or '')
    for f in facts:
        for k, lab in FIELD_LABEL.items():
            v = f.get(k)
            if isinstance(v, int) and not isinstance(v, bool) and v > 1 and v in said:
                return {'kind': 'explain', 'form': 'number', 'value': v, 'label': lab, 'title': (f.get('competition') or '').upper() if isinstance(f.get('competition'), str) else ''}
    return None


def bars(f: dict) -> dict | None:
    """A record as bars that grow to its own cells (won, drawn, lost): the longest is the full width."""
    cells = [(lab, f.get(k)) for lab, k in (('WON', 'won'), ('DRAWN', 'drawn'), ('LOST', 'lost')) if isinstance(f.get(k), int)]
    if len(cells) < 2 or not max(v for _, v in cells):
        return None
    top = max(v for _, v in cells)
    return {'kind': 'explain', 'form': 'bars', 'title': (f.get('competition') or '').upper(), 'bars': [{'label': lab, 'value': v, 'share': round(v / top, 4), 'hot': v == top} for lab, v in cells]}


def punch(narration: str, words: list[float], t0: float, d: float) -> dict | None:
    """The one short sentence a beat turns on, as type that arrives with the voice: the LAST sentence of at most
    PUNCH_WORDS words (a line ends on its point), each word on the narrator's own timing for it. `words` are the film
    times of the narration's words; None when there is no short sentence or no timing."""
    sents = [x.strip() for x in re.split(r'(?<=[.?!…])\s+', (narration or '').strip()) if x.strip()]
    i = 0
    spans = []
    for sn in sents:
        k = len(sn.split())
        spans.append((sn, i, i + k))
        i += k
    if not words or i != len(words):
        return None
    for sn, a, z in reversed(spans):
        if 2 <= z - a <= PUNCH_WORDS:
            at = words[a] - t0
            hold = min(d - at, (words[z - 1] - words[a]) + 1.4)
            if at < 0 or hold < PUNCH_MIN_S:
                continue
            ws = sn.split()
            hot = max(range(len(ws)), key=lambda j: (len(ws[j].strip('.,?!…')), j))   # the longest word, the later of two
            return {'kind': 'kinetic', 'words': [{'w': w, 'at': round(words[a + j] - words[a], 3)} for j, w in enumerate(ws)], 'hot': [hot],
                    'dt': round(at, 3), 'd': round(hold, 3)}
    return None


def quote_lines(text: str, d: float) -> dict | None:
    """A quote or a chant as kinetic type: its own words, spread over the time the beat gives them (a quote is not the
    narrator's line, so there is no word timing to ride)."""
    ws = (text or '').split()
    if not 2 <= len(ws) <= 22:
        return None
    span = min(max(1.6, d - 1.6), 0.26 * len(ws))
    hot = max(range(len(ws)), key=lambda j: (len(ws[j].strip('.,?!…"“”')), j))
    return {'kind': 'kinetic', 'words': [{'w': w, 'at': round(span * j / len(ws), 3)} for j, w in enumerate(ws)], 'hot': [hot], 'quote': True}


def spans(devs: list[dict], d: float, kinds: set[str]) -> list[tuple[float, float]]:
    out = []
    for x in devs:
        if x['kind'] in kinds:
            a = x.get('dt', 0.0) + (x.get('at', 0.0) if x['kind'] == 'word' else 0.0)
            z = min(d, x.get('dt', 0.0) + x.get('d', d - x.get('dt', 0.0)))
            # a title that stays over the pictures is type for as long as it takes to arrive and be read; after that
            # it is a caption on a documentary shot
            out.append((a, min(z, a + READ_S[x['kind']]) if x['kind'] in READ_S else z))
    return out


def covered(sp: list[tuple[float, float]]) -> float:
    total, end = 0.0, -1.0
    for a, z in sorted(sp):
        a = max(a, end)
        if z > a:
            total += z - a
            end = z
    return total


def languages(devs: list[dict], d: float) -> dict[str, float]:
    """A beat's seconds in each language: explainer devices first, kinetic type over what is left, the rest is art."""
    ex = spans(devs, d, EXPLAIN_KINDS)
    both = covered(ex + spans(devs, d, KINETIC_KINDS))
    e = covered(ex)
    return {'explainer': round(e, 2), 'kinetic': round(both - e, 2), 'documentary': round(max(0.0, d - both), 2)}


def mix(beats: list[dict]) -> dict:
    """The film's language mix from its beats (each with `lang`: the three seconds, and meta.chapter): shares of the
    running time, explainer passages per chapter, and the chapters whose data could carry one."""
    tot = {'documentary': 0.0, 'explainer': 0.0, 'kinetic': 0.0}
    chapters: dict = {}
    for b in beats:
        m = b.get('meta') or {}
        if m.get('type') in ('end', 'follow'):
            continue
        for k, v in (b.get('lang') or {}).items():
            tot[k] += v
        c = chapters.setdefault(m.get('chapter'), {'explainers': 0, 'possible': 0})
        c['explainers'] += 1 if (b.get('lang') or {}).get('explainer', 0) > 0 else 0
        c['possible'] += 1 if m.get('explainable') else 0
    run = sum(tot.values()) or 1.0
    short = sorted(str(k) for k, c in chapters.items() if c['possible'] and c['explainers'] < EXPLAINERS_PER_CHAPTER)
    return {**{k: round(v / run, 3) for k, v in tot.items()}, 'seconds': {k: round(v, 1) for k, v in tot.items()},
            'chapters': {str(k): c for k, c in chapters.items()}, 'chapters_short': short}


__doc__ += f"""    PLAIN_MAX {PLAIN_MAX:.0%} of the running time at most in plain art shots · at least {EXPLAINERS_PER_CHAPTER} explainer passage per chapter when its data supports one
"""
