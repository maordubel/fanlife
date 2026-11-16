"""THE HOUSE CREW — the studio's own three screenwriters, three directors and three editors (owner, 16.11.2026: "three
directors, three editors and three screenwriters in-house, who understand football, analyse the archive, build a full,
moving story on it and produce it without waiting for Google when it is unavailable or out of credit").

Everything here runs in code on the runner: no model, no key, no network. The crew reads the evidence ledger and the
story block the record proves (studio/director.story — the shape of the season, its moments, runs, turning point and
acts) and writes, directs and cuts from that alone. They never add a fact: every number, score, name and date they say
comes from a claim the beat cites, and every script they hand over passes the same checks a model's script must pass
(script.validate_script with the director rules, writer.hook_option_errors) — what does not pass is cut, never padded.

The crew works in three units, one per model director of studio/directors.py, so a film keeps its director's angle
whether a model or the house writes it:

    unit           writer               director (shot list)     editor (the cut)
    broadcaster    The Chronicler       The Match Director       The Cutter
    terrace        The Terrace Poet     The Documentarian        The Storyteller
    trailer        The Myth-Maker       The Auteur               The Montage

  writers    studio/house_writer.py — a full script: hook and three openings, chapters written as mini-dramas, the
             Director's Cut cards, titles, description, tags, Shorts and thumbnails.
  directors  `direct()` below — the shot list without Gemini: for every line, the candidate picture that shows its
             feeling and its subject, and the candidates that would mislead (a celebration over a defeat, a stranger's
             face over a named man). studio/sight.direct is asked first when a key answers; this is the house's own eye.
  editors    `editor_profile()` below — the rhythm of the cut (how long a look lasts, how long a card stays), read by
             docu/editor.pace. Each editor keeps every rule of docu/editor (MIN_SUB, MAX_STILL, MAX_CARD).

When the house writes: writer.write_script hands a director's script to his house writer when the model cannot answer
(no key, no credit, a busy or spent quota, the provider unreachable) — at once, never a wait — and always when the
repository variable STORIES_WRITER is "house". Rule: docs/rules/house-crew.md.
"""
from __future__ import annotations

import re

# ── the crew ──────────────────────────────────────────────────────────────────────────────────────────────────────────
WRITERS: list[dict] = [
    {'id': 'chronicler', 'unit': 'broadcaster', 'name': 'The Chronicler',
     'tagline': 'The season as a thriller told forward: the clock, the score, what was at stake.',
     'craft': 'Linear three-act drama on the record. Every chapter wants something, meets its obstacle, runs against a clock, '
              'turns, pays off and ends on a question. Short sentences when the ball is live. Cards carry the numbers.'},
    {'id': 'poet', 'unit': 'terrace', 'name': 'The Terrace Poet',
     'tagline': 'From the stands: "we", the trips, the hope, the self-irony of following this club.',
     'craft': 'First person plural, warm and wry. Opens on the people, widens to the season, closes on what it meant. '
              'Tickets, the away end, the long way home; humour only where the record gives it.'},
    {'id': 'mythmaker', 'unit': 'trailer', 'name': 'The Myth-Maker',
     'tagline': 'Cinema: the climax first, then how it began, then the climax again.',
     'craft': 'Non-linear. A trailer card opens, rhetorical questions, the rule of three, a whisper before the goal and the '
              'roar after it. Every line could stand on a poster.'},
]
DIRECTORS: list[dict] = [
    {'id': 'match-director', 'unit': 'broadcaster', 'name': 'The Match Director',
     'tagline': 'The gantry: the action, the pitch, the scoreboard when it changes.',
     'prefers': ('goal', 'keeper', 'pitch', 'ball', 'stand', 'crowd'), 'cameras': ('push', 'whip', 'pull')},
    {'id': 'documentarian', 'unit': 'terrace', 'name': 'The Documentarian',
     'tagline': 'People first: the terrace, the scarf, the street on matchday.',
     'prefers': ('crowd', 'stand', 'street', 'portrait', 'newspaper', 'scarf'), 'cameras': ('drift', 'slow', 'pull')},
    {'id': 'auteur', 'unit': 'trailer', 'name': 'The Auteur',
     'tagline': 'Mood and myth: the night, the light, the silhouette before the storm.',
     'prefers': ('pyro', 'night', 'stand', 'trophy', 'goal', 'crowd'), 'cameras': ('orbit', 'slow', 'push', 'whip')},
]
# The rhythm of each editor, as factors on docu/editor's own constants (TARGET 2.6 s a look, MAX_CARD 4 s a card).
# Every factor keeps the editor's hard limits: no look under MIN_SUB (a flicker) or over MAX_STILL (a slide).
EDITORS: list[dict] = [
    {'id': 'cutter', 'unit': 'broadcaster', 'name': 'The Cutter',
     'tagline': 'Fast and exact: cuts on the beat, short looks as the clock runs down.', 'tempo': 0.88, 'card': 0.85, 'calm': 1.0},
    {'id': 'storyteller', 'unit': 'terrace', 'name': 'The Storyteller',
     'tagline': 'Lets a face and a terrace breathe; quick only where the goal goes in.', 'tempo': 1.08, 'card': 1.0, 'calm': 1.15},
    {'id': 'montage', 'unit': 'trailer', 'name': 'The Montage',
     'tagline': 'Trailer rhythm: bursts of quick cuts, then one long held breath.', 'tempo': 0.82, 'card': 0.8, 'calm': 1.25},
]
UNITS = {w['unit']: {'writer': w, 'director': d, 'editor': e} for w, d, e in zip(WRITERS, DIRECTORS, EDITORS)}
DEFAULT_UNIT = 'broadcaster'


def unit(director_id: str | None) -> dict:
    """The house unit that stands behind a model director (studio/directors.py id), the broadcaster's by default."""
    return UNITS.get(director_id or '', UNITS[DEFAULT_UNIT])


def roster() -> dict:
    """What the desk shows: the nine people of the house crew, by role."""
    pick = ('id', 'unit', 'name', 'tagline')
    return {'writers': [{k: w[k] for k in pick} for w in WRITERS], 'directors': [{k: d[k] for k in pick} for d in DIRECTORS],
            'editors': [{k: e[k] for k in pick} for e in EDITORS]}


# ── the editors: the rhythm docu/editor.pace reads ───────────────────────────────────────────────────────────────────
def editor_profile(director_id: str | None) -> dict:
    e = unit(director_id)['editor']
    return {'id': e['id'], 'name': e['name'], 'tempo': e['tempo'], 'card': e['card'], 'calm': e['calm']}


def paced(seconds: float, emotion: str | None, profile: dict | None, lo: float, hi: float) -> float:
    """A look's target length under an editor's rhythm: tension and joy take his tempo, grief/wonder/pride his calm.
    Always inside [lo, hi] — the editor's own MIN_SUB and MAX_STILL."""
    if not profile:
        return seconds
    f = profile.get('calm', 1.0) if emotion in ('grief', 'wonder', 'pride') else profile.get('tempo', 1.0)
    return round(max(lo, min(hi, seconds * float(f))), 2)


# ── the directors: the shot list without a model ─────────────────────────────────────────────────────────────────────
EMOTION_MOOD = {'tension': 'tension', 'dread': 'tension', 'release': 'joy', 'joy': 'joy', 'pride': 'joy', 'grief': 'grief',
                'defiance': 'defiance', 'wonder': 'calm', 'humour': 'joy'}
CLASH = {'grief': {'joy'}, 'joy': {'grief'}, 'tension': set(), 'defiance': {'grief'}, 'calm': set()}
CELEBRATION = re.compile(r'celebrat|trophy|parade|pyro|flare|cup-?lift|champion', re.I)
BARS = re.compile(r'bars|prison|cell|cage|police|riot', re.I)
TRANSFER = re.compile(r'\b(sign\w*|transfer\w*|join\w*|moved to|bought|sold|contract)\b', re.I)
DEFEAT = re.compile(r'\b(lost|defeat\w*|beaten|went down|relegat\w+|knocked out|eliminat\w+|heartbr\w+)\b', re.I)
NAMED = re.compile(r'\b[A-Z][a-zà-ÿ]+(?:[- ][A-Z][a-zà-ÿ]+)+\b')
_WORD = re.compile(r'[a-z]{4,}')


def _words(text: str) -> set[str]:
    return set(_WORD.findall((text or '').lower()))


def direct(lines: list[dict], director_id: str | None = None, log=print) -> dict[int, dict]:
    """The house director's shot list. `lines` as studio/sight.direct takes them ({'n', 'type', 'text', 'candidates':
    [{'id', 'shows', 'subjects'?, 'moods'?}]}), the candidates already allowed by the media index (club, rival colours,
    freshness) and in its order. → {n: {'see', 'pick', 'reject', 'fit', 'by'}}.

    He reads the feeling of the line (studio/drama.read: a defeat is grief, a goal a release, a decider tension), and:
      refuses  a picture whose mood fights the line (a celebration over a defeat, grief over a win), bars or a police
               line on a transfer, a celebration or a trophy on any defeat;
      prefers  a picture whose mood is the line's, whose subjects the line says, and — between equals — the subjects his
               own eye goes to (the Match Director the action, the Documentarian the people, the Auteur the night);
      keeps    the index's order as the last word, so a tie never jumps over a fresher picture.
    A line with no candidate left is given no pick: a card or a new picture will carry it, as with sight."""
    from .drama import read
    me = unit(director_id)['director']
    prefers = me['prefers']
    out: dict[int, dict] = {}
    for x in lines:
        text = str(x.get('text') or '')
        if not text or not x.get('candidates'):
            continue
        feel = read({'type': x.get('type') or 'illustration', 'narration': text})
        mood = EMOTION_MOOD.get(feel['emotion'], 'calm')
        defeat = bool(DEFEAT.search(text))
        transfer = bool(TRANSFER.search(text))
        said = _words(text)
        scored, reject = [], []
        for rank, c in enumerate(x['candidates']):
            shows = f"{c.get('id', '')} {c.get('shows', '')}"
            moods = set(c.get('moods') or [])
            subjects = set(c.get('subjects') or [])
            bad = (bool(moods & CLASH.get(mood, set())) and mood not in moods) \
                or (defeat and bool(CELEBRATION.search(shows))) or (transfer and bool(BARS.search(shows))) \
                or ('not for' in shows.lower() and bool(said & _words(shows.lower().split('not for', 1)[1])))
            if bad:
                reject.append(c['id'])
                continue
            hit_mood = mood in moods
            hit_subj = len(subjects & said) + len(_words(shows) & said)
            taste = sum(1 for p in prefers if p in subjects or p in shows.lower())
            score = 3.0 * hit_mood + 1.5 * min(3, hit_subj) + 0.4 * min(3, taste) - 0.15 * rank
            scored.append((score, rank, c, hit_mood, hit_subj))
        if not scored:
            out[int(x['n'])] = {'see': f'{feel["emotion"]}: nothing in the library shows it — a card carries the line', 'pick': None,
                                'reject': reject, 'fit': 0, 'by': me['id']}
            continue
        score, _, best, hm, hs = max(scored, key=lambda s: (s[0], -s[1]))
        fit = 2 if (hm and hs) else 1
        what = ', '.join(sorted(set(best.get('subjects') or []) & said)) or (best.get('shows') or best['id'])[:60]
        out[int(x['n'])] = {'see': f'{feel["emotion"]} — {what}'[:240], 'pick': best['id'], 'reject': reject, 'fit': fit, 'by': me['id']}
    log(f'House director ({me["name"]}): shot list for {len(out)} lines — {sum(1 for v in out.values() if v["pick"])} pictures chosen, '
        f'{sum(len(v["reject"]) for v in out.values())} refused as misleading')
    return out


# ── the writers ──────────────────────────────────────────────────────────────────────────────────────────────────────
def wanted() -> bool:
    """The house writes first (repository variable STORIES_WRITER=house), not only when the model cannot."""
    import os
    return os.environ.get('STORIES_WRITER', '').strip().lower() == 'house'


def write(brief: dict, ledger: dict, director_id: str | None, log=print, avoid: list[dict] | None = None, check_at=None,
          reason: str = '') -> dict:
    """One script by the house writer of `director_id`'s unit. Raises StageError('SCRIPT_INVALID') only when the record
    cannot carry a film at all. `check_at(script, minutes) -> [errors]` is the writer's own validation (writer.py)."""
    from .house_writer import write_script
    u = unit(director_id)
    s = write_script(brief, ledger, u['writer']['id'], log=log, avoid=avoid, check_at=check_at)
    s['_house'] = {'writer': u['writer']['id'], 'director': u['director']['id'], 'editor': u['editor']['id'],
                   'unit': u['writer']['unit'], **({'why': reason[:200]} if reason else {})}
    log(f'House: {u["writer"]["name"]} wrote "{s["title_candidates"][s["selected"]]["title"]}" · '
        f'{sum(len(b["narration"].split()) for ch in s["chapters"] for b in ch["beats"])} words · {s["_minutes"]:g} min'
        + (f' — {reason[:120]}' if reason else ''))
    return s
