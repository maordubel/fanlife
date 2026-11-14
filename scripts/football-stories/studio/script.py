"""Script contract: what the writer must return, and the checks that hold it to the evidence.

The script is beats of narration, each citing ledger claims and naming ONE visual from a fixed vocabulary that the
renderer knows how to draw. Every data-bearing graphic (a score, a matchday card, a table, a ticket) names a CLAIM, not
text — the renderer prints the claim's own fields, so the film's typography cannot say something the archive does not.
Free text (narration, fact boxes, headlines) goes through `fact_guard`: every number must come from a cited claim.
"""
from __future__ import annotations

import json
import re

from .common import StageError

VISUALS = {
    'open': {'backdrop', 'headline', 'kicker'},
    'chapter': {'number', 'title', 'backdrop'},
    'map': {'focus', 'claims', 'label'},
    'matchday': {'claim', 'backdrop'},
    'score': {'claim', 'backdrop', 'in_play'},
    'fact': {'heading', 'text', 'claim', 'backdrop'},
    'stat': {'value', 'label', 'claim', 'backdrop'},
    'timeline': {'claims', 'label', 'backdrop'},
    'table': {'claim', 'backdrop'},
    'turning': {'title', 'subtitle', 'backdrop'},
    'illustration': {'art', 'caption', 'prompt'},
    'ticket': {'claim', 'backdrop'},
    'quote': {'text', 'who', 'role', 'claim', 'backdrop'},
    'press': {'outlet', 'date', 'headline', 'standfirst', 'claim', 'backdrop'},
    'follow': {'backdrop'},
    'end': set(),
    # the Director's Cut (docs/fanlife/66-directors-cut.md §2): data from the claims, the writer picks which and a label
    'form': {'claims', 'label'},
    'race': {'label', 'mark'},
    'versus': {'claim'},
    'goal': {'claim', 'scorer'},
    'record': {'claim'},
    'run': {'claims', 'label'},
    'trailer': {'lines'},
}
DIRECTOR_VISUALS = {'form', 'race', 'versus', 'goal', 'record', 'run', 'trailer'}
CAMERAS = {'push', 'pull', 'whip', 'shake', 'drift', 'slow', 'orbit'}  # 'shake' is no longer offered (rule 142); a saved script that
# carries it still passes and is filmed as a push (cinema/look.move)
PACES = {'fast', 'normal', 'slow'}
SFX = {'roar', 'whistle', 'groan', 'gasp', 'drum', 'none'}
SCORE_VISUALS = {'matchday', 'score', 'versus', 'goal'}   # a visual that puts a match's score on screen itself
SLUG_WORDS = {'the', 'a', 'an', 'of', 'at', 'in', 'on', 'and', 'night', 'morning', 'evening', 'afternoon', 'day', 'week',
              'final', 'derby', 'whistle', 'kick', 'off', 'full', 'time', 'half', 'before', 'after', 'later', 'earlier', 'meanwhile',
              'same', 'that', 'this', 'next', 'last', 'first', 'second', 'leg', 'home', 'away', 'end', 'ground', 'stadium',
              'terrace', 'tunnel', 'dressing', 'room', 'city', 'town', 'street', 'station', 'airport', 'bus', 'train',
              'summer', 'autumn', 'winter', 'spring', 'august', 'midnight', 'dawn', 'dusk', 'minutes', 'minute', 'hours'}
DIRECTOR = 2   # a script that declares "director": 2 is held to the director rules (contract §3)
PROPS = {'board_member', 'coach', 'football', 'generic_trophy', 'goal_net', 'match_ticket', 'passenger_plane', 'portable_radio',
         'referee', 'supporter_scarf', 'supporters_bus', 'tactics_board'}
LIBRARY_ART = {'tunnel', 'terrace-crowd', 'terrace-empty', 'supporter', 'paper'}

SITE = 'fanlife.dubelteam.com'
CTA = (f'Every match in this film is waiting in the FanLife archive, with the games, the trivia and the stories of the whole '
       f'club. Come and play it at {SITE}. And if this story was yours too, subscribe, and the next one will find you.')

# The call to follow the channel, said once in every film by a supporter to supporters. No numbers but the free ninety,
# no promise the channel cannot keep (no schedule), no begging: an invitation onto the terrace. Picked per club and season,
# so two films in a row do not say the same line.
FOLLOW = (
    "Quick one, before we go on. If you've ever stood in the rain for ninety minutes and called it a good day, you belong here. "
    "Subscribe to FanLife Football Stories, and take your place on the terrace.",
    "A word from the stands. These films are made for people who still keep the ticket stub in a drawer. If that's you, "
    "hit subscribe. There is always room in the away end.",
    "If your club has ever broken your heart, and you went back the next week anyway, this channel is for you. "
    "Subscribe, switch on the bell, and come to the next match with us.",
    "Every club has supporters who remember things no record keeps. If you're one of them, subscribe, and tell us your "
    "season in the comments. The best stories come from the terrace.",
)
FOLLOW_AFTER_CHAPTER = 1   # after the second chapter: the viewer has had the hook and the first act, the story is moving


def follow_line(key: str) -> str:
    import hashlib
    return FOLLOW[int(hashlib.sha256(key.encode()).hexdigest(), 16) % len(FOLLOW)]


def with_cta(s: dict, key: str = '') -> dict:
    """Every film asks the viewer to follow the channel once, early, and ends on the site.
    The follow beat closes the second chapter (or the first, in a one-chapter film); the closing beat sends the viewer to
    FanLife, on the end visual. Both are added here, so no writer can forget them and no film says them twice."""
    chapters = s['chapters']
    if not any(b.get('visual', {}).get('type') == 'follow' for ch in chapters for b in ch.get('beats') or []):
        ch = chapters[min(FOLLOW_AFTER_CHAPTER, len(chapters) - 1)]
        beats = ch['beats']
        if len(chapters) == 1:
            at = max(1, len(beats) // 3)
        else:
            at = len(beats) - (1 if ch is chapters[-1] and beats and beats[-1].get('visual', {}).get('type') == 'end' else 0)
        beats.insert(at, {'narration': follow_line(key or s.get('hook') or ''), 'claim_ids': [], 'visual': {'type': 'follow'}})
    else:
        for ch in chapters:
            for b in ch['beats']:
                if b.get('visual', {}).get('type') == 'follow':
                    b['narration'], b['claim_ids'] = follow_line(key or s.get('hook') or ''), []
    beats = chapters[-1]['beats']
    if beats and beats[-1].get('visual', {}).get('type') == 'end':
        beats[-1]['narration'] = CTA
        beats[-1]['claim_ids'] = []
    else:
        beats.append({'narration': CTA, 'claim_ids': [], 'visual': {'type': 'end'}})
    return s


def beat_set(ledger: dict) -> str:
    """The folder of owner beat illustrations for this film: <club id>-<season with a dash>."""
    return f"{ledger.get('club_id') or ''}-{str(ledger.get('season') or '').replace('/', '-')}"


def art_ok(key, ledger: dict, *, allow_gen: bool = False) -> bool:
    """A library piece, an owner beat piece made for THIS club and season, or (for illustrations) a generated one."""
    from .paper import beat_path, clip_path, cut_path
    if not isinstance(key, str):
        return False
    if key in LIBRARY_ART or (allow_gen and key == 'gen'):
        return True
    for kind, find in (('beat', beat_path), ('clip', clip_path), ('cut', cut_path)):
        for set_id in (beat_set(ledger), *(ledger.get('art_sets') or []), 'common'):
            if key.startswith(f'{kind}:{set_id}/') and find(key) is not None:
                return True
    return False


CLAIM_VISUALS = {'matchday', 'score', 'table', 'ticket', 'quote', 'press', 'versus', 'goal', 'record'}
ANGLES = {'search', 'discovery'}
DURATIONS = {0.5, 1, 2, 3, 5, *range(7, 26)}

WORDS_PER_MINUTE = 148  # Kokoro at speed 1.0: a supporter telling it, not a lecture

SCHEMA_TEXT = '''{
  "director": 2 — always; it says this script is cut by the director rules,
  "drama": 1 — always; it says every chapter is written as a mini-drama (want, obstacle, clock, turn, payoff, cliff edge),
  "motif": optional — the film's recurring image, ≤6 words, no fact in it ("a scarf in the club colours", "the clock above the stand"),
  "title_candidates": [{"title": string <=100 chars, "angle": "search" | "discovery"}] — EXACTLY 10,
  "selected": integer index into title_candidates,
  "hook": string — the first sentence the viewer hears; must be the start of the first beat's narration,
  "hook_options": [{"text": string, "claim_ids": [string]}] — EXACTLY 3 alternative complete openings for the selected title; each 3–4 sentences, about 20 seconds, distinct, with cited evidence. The first is used in the opening narration.
  "chapters": [{"title": string, "beats": [{
      "narration": string (one to three sentences),
      "claim_ids": [string] — ledger ids this beat relies on (may be empty only for pure atmosphere with no fact);
                   "story" may be cited for a number the STORY block counted (a run's length, the form line),
      "camera": optional "push|pull|whip|drift|slow|orbit" — the move you want on this beat,
      "pace": optional "fast|normal|slow" — fast = hard cuts and quick motion, slow = held frames,
      "broll": optional art key ("beat:…", "clip:…", tunnel|terrace-crowd|terrace-empty|supporter) behind a data card,
      "sfx": optional "roar|whistle|groan|gasp|drum|none",
      "slug": optional screenplay slug line "<place> — <time phrase>" ("Piraeus — the night of the final"), ≤60 chars;
              the place and any month or weekday must come from a claim cited in this beat,
      "visual": one of
        {"type":"open","backdrop":"tunnel|terrace-crowd|terrace-empty|supporter","headline":string,"kicker":string}
        {"type":"chapter","number":int,"title":string,"backdrop":"tunnel|terrace-crowd|terrace-empty|supporter|paper"}
        {"type":"map","focus":"home|domestic|europe","claims":[match claim ids whose grounds/cities to pin],"label":string}
        {"type":"matchday","claim":match claim id}
        {"type":"score","claim":match claim id}
        {"type":"fact","heading":string,"text":string,"claim":claim id}
        {"type":"stat","value":string (a number from the claim or the season summary),"label":string,"claim":claim id or "summary:<competition>"}
        {"type":"timeline","claims":[2-8 match claim ids in date order],"label":string}
        {"type":"table","claim":table claim id}
        {"type":"turning","title":string,"subtitle":string,"backdrop":"..."}
        {"type":"illustration","art":"tunnel|terrace-crowd|terrace-empty|supporter|gen|beat:<key>","prompt":string (only when art is gen),"caption":string}
        {"type":"ticket","claim":match claim id}
        {"type":"quote","claim":quote claim id,"text":the speaker's words copied EXACTLY from the claim (≤40 words),"who":the claim's speaker,"role":string}
        {"type":"press","claim":press claim id,"outlet":the claim's outlet,"headline":the claim's headline EXACTLY,"date":"YYYY-MM-DD" optional}
        {"type":"end"}
      — the Director's Cut cards (data printed from the claims; you choose which claims and a short label):
        {"type":"form","claims":[3-12 match claim ids in date order],"label":string <=40} — W/D/L tiles with their scores
        {"type":"race","label":string <=40,"mark":[0-4 match claim ids]} — the season's form line drawing itself; marked matches pop
        {"type":"versus","claim":match claim id} — the face-off before the whistle, then the score slams in
        {"type":"goal","claim":match claim id,"scorer":index into that claim's scorers} — only when the claim names scorers WITH minutes
        {"type":"record","claim":"summary:<competition>"} — won / drawn / lost / for / against counting up
        {"type":"run","claims":[3+ consecutive match ids of one streak],"label":string <=40} — a streak counter
        {"type":"trailer","lines":[1-4 lines, each at most 5 words]} — kinetic title cards; no number, date or name a cited claim does not hold
      Every "backdrop" and "art" may also be an owner piece from BEAT ART when one is listed — a still ("beat:…") or a
      ten-second stop-motion clip ("clip:…", it plays once and holds; use it where a moment builds or arrives). Colour
      paper-cut pictures made for this story. Prefer them — the right picture for each beat (a penalty picture for a shoot-out,
      an empty terrace for a bad run). Card visuals (matchday, score, fact, stat, timeline, table, ticket) may add "backdrop" too;
      the picture is darkened behind the card. Do not use the same piece on two beats in a row.
      Any visual may add "prop": one cut-out that moves in the shot — passenger_plane (European trips), supporters_bus (away days),
      portable_radio (news from another ground), generic_trophy (a trophy won; never a specific real trophy), football, goal_net
      (goals, penalties), referee, coach, board_member, tactics_board (illustrative only), supporter_scarf, match_ticket.
  }]}],
  "description": string — 2-4 natural paragraphs; NO sources, credits or chapters (they are appended from the cut),
  "tags": [string] 8-15, total under 450 characters,
  "shorts": [{"hook": string, "idea": string, "narration": string, "claim_ids": [string], "hook_law": "know-it-all" | "is-this-real", "cast_sheet": [{"id": string, "look": string}], "cartoon": [{"say": string, "scene": string, "cast": [{"id": string, "action": string, "motion": string}], "show": string}]}] — 2 or 3. Each is an independently written hook-led short, 25–55 spoken words, under 30 seconds including ending. Start narration with hook, use cited evidence, do not copy film narration. "cartoon" splits the narration into 5–7 beats (their "say" joined is the narration): "scene" is the painted set, "cast" who acts in it and how (ids from "cast_sheet").
  "thumbnails": [{"text": string <= 4 words, "concept": string, "claim": claim id or null}] — EXACTLY 3
}'''

NUM_WORDS = {w: n for n, w in enumerate(
    'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen '
    'eighteen nineteen twenty'.split())}
NUM_WORDS.update({'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90, 'hundred': 100,
                  'thousand': 1000})
ORDINALS = {'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9,
            'tenth': 10, 'eleventh': 11, 'twelfth': 12, 'thirteenth': 13}
# Numbers that describe football itself, not a claim about this season.
FREE_NUMBERS = {0, 1, 11, 45, 90, 120}
MONTHS = 'January February March April May June July August September October November December'.split()


UNITS = {**{w: n for w, n in NUM_WORDS.items() if n < 20}}
TENS = {'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90}
ORD_UNITS = {'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9}
ORD_TENS = {'twentieth': 20, 'thirtieth': 30, 'fortieth': 40, 'fiftieth': 50, 'sixtieth': 60, 'seventieth': 70, 'eightieth': 80, 'ninetieth': 90}


def numbers_in_text(text: str) -> set[int]:
    """Every number a sentence states: digits, and spelled numbers read as a whole ("a hundred and twenty" = 120,
    "forty thousand" = 40000, "eighty-fifth" = 85). Simple ordinals on their own ("second leg") are not numbers."""
    out: set[int] = set()
    for m in re.finditer(r'\d[\d,]*', text):
        try:
            out.add(int(m.group().replace(',', '')))
        except ValueError:
            pass
    toks = re.findall(r"[a-z]+", text.lower().replace('-', ' '))

    def sub100(j):
        if j < len(toks) and toks[j] in TENS:
            v = TENS[toks[j]]
            if j + 1 < len(toks) and toks[j + 1] in UNITS and 0 < UNITS[toks[j + 1]] < 10:
                return v + UNITS[toks[j + 1]], j + 2
            if j + 1 < len(toks) and toks[j + 1] in ORD_UNITS:
                return v + ORD_UNITS[toks[j + 1]], j + 2
            return v, j + 1
        if j < len(toks) and toks[j] in ORD_TENS:
            return ORD_TENS[toks[j]], j + 1
        if j < len(toks) and toks[j] in UNITS:
            return UNITS[toks[j]], j + 1
        return None, j

    def sub1000(j):
        if j + 1 < len(toks) and toks[j] in ('a', 'one') and toks[j + 1] == 'hundred':
            v, j = 100, j + 2
        else:
            u, k = sub100(j)
            if u is None:
                return None, j
            if k < len(toks) and toks[k] == 'hundred' and 0 < u < 10:
                v, j = u * 100, k + 1
            else:
                return u, k
        if j + 1 < len(toks) and toks[j] == 'and':
            r, k = sub100(j + 1)
            if r is not None:
                return v + r, k
        r, k = sub100(j)
        return (v + r, k) if r is not None else (v, j)

    i = 0
    while i < len(toks):
        v, j = sub1000(i)
        if v is None:
            i += 1
            continue
        if j < len(toks) and toks[j] == 'thousand':
            v *= 1000
            j += 1
            r, k = sub1000(j)
            if r is not None:
                v, j = v + r, k
        out.add(v)
        i = j
    return out


def numbers_in_value(v, out: set[int] | None = None) -> set[int]:
    out = set() if out is None else out
    if isinstance(v, bool) or v is None:
        return out
    if isinstance(v, (int, float)):
        out.add(int(v))
    elif isinstance(v, str):
        for m in re.finditer(r'\d+', v):
            out.add(int(m.group()))
        if m := re.fullmatch(r'(\d{4})/(\d{2})', v):
            out.add(int(m.group(1)) + 1)
    elif isinstance(v, dict):
        for x in v.values():
            numbers_in_value(x, out)
    elif isinstance(v, list):
        for x in v:
            numbers_in_value(x, out)
    return out


def claim_numbers(ledger: dict, ids: list[str]) -> set[int]:
    by = {c['id']: c for c in ledger['claims']}
    out: set[int] = set(FREE_NUMBERS)
    numbers_in_value(ledger.get('season'), out)  # the film's own season label, e.g. 1999/00 → 1999, 2000
    for i in ids:
        if i == 'story':
            numbers_in_value(story_numbers(ledger), out)
        elif i.startswith('summary:'):
            numbers_in_value(ledger.get('summary', {}).get('by_competition', {}).get(i[8:]), out)
        elif i in by:
            numbers_in_value(by[i]['fact'], out)
    # Counts and totals COUNTED from the cited match records (all of them, and per calendar month), e.g.
    # "four games in October, four wins, fourteen goals" when the beat cites those four matches.
    matches = [by[i]['fact'] for i in dict.fromkeys(ids) if i in by and by[i]['fact'].get('kind') == 'match']
    groups: dict = {'all': matches}
    for m in matches:
        groups.setdefault(str(m.get('date') or '')[:7], []).append(m)
    dates = sorted({m['date'] for m in matches if m.get('date')})
    import datetime as _dt
    ds = [_dt.date.fromisoformat(d) for d in dates]
    for a in ds:
        for b in ds:
            if b > a:
                days = (b - a).days
                out.add(days)
                if days % 7 == 0:
                    out.add(days // 7)
    for m in matches:  # "three times in fifteen minutes": spans between one match's own goals
        mins = [x['minute'] for x in (m.get('scorers') or []) if isinstance(x.get('minute'), int)]
        out.update(b - a for a in mins for b in mins if b > a)
        names = [x.get('name') for x in (m.get('scorers') or [])]
        out.update(names.count(n) for n in set(names))
    for g in groups.values():
        if not g:
            continue
        out.update({len(g), sum(m['club_goals'] for m in g), sum(m['opponent_goals'] for m in g),
                    sum(m['outcome'] == 'win' for m in g), sum(m['outcome'] == 'draw' for m in g), sum(m['outcome'] == 'loss' for m in g)})
    return out


def story_of(ledger: dict) -> dict:
    from .director import story_of as _so
    return _so(ledger)


def story_numbers(ledger: dict) -> list[int]:
    """The numbers the story block COUNTED, which a beat may say when it cites "story": every run's length, the form
    line's end, high and low, the goal difference, and how many matches it covers."""
    st = story_of(ledger)
    t = st.get('totals') or {}
    return [*(r['length'] for r in st.get('runs') or []), *(abs(t.get(k) or 0) for k in ('form', 'form_high', 'form_low', 'gd')),
            t.get('played') or 0]


def fact_guard(text: str, ledger: dict, ids: list[str]) -> list[str]:
    """Numbers in `text` that none of the cited claims carries. Empty list = passes."""
    allowed = claim_numbers(ledger, ids)
    missing = sorted(n for n in numbers_in_text(text) if n not in allowed)
    return [f'number {n} is not in the cited claims {ids or "[]"}' for n in missing]



def identity_guard(text: str, ledger: dict, *, motif: bool = False) -> list[str]:
    """Flag an unsupported focus-supporter scarf colour; never police rival or background colours."""
    from .common import family, hex_rgb
    primary = ledger.get('identity_primary')
    if not primary:
        return []
    try:
        club_colour = family(hex_rgb(primary))
    except ValueError:
        return []
    if not club_colour:
        return []
    out = []
    # Process sentences separately, so a reference to the other club does not taint the whole film.
    for sentence in re.split(r'(?<=[.!?])\s+', text):
        for m in re.finditer(r'\b(red|blue|green|yellow)\s+(?:and\s+\w+\s+)?scar(?:f|ves)\b', sentence, re.I):
            colour = m.group(1).lower()
            focus = motif or bool(re.search(r"\b(our|ours|we|us|my|the supporter|supporters|fans|terrace|wear|wearing|wrap|wrapped|put on)\b", sentence, re.I))
            opponents = [str((c.get('fact') or {}).get('opponent') or '') for c in ledger.get('claims') or []]
            opponent = any(len(o) >= 4 and o.lower() in sentence.lower() for o in opponents)
            if focus and not opponent and colour != club_colour:
                out.append(f'{colour} scarf attributed to {ledger.get("club_name")}: verify club identity against a source or use a colour-neutral scarf')
    return out


def knockout_guard(text: str, ledger: dict, ids: list[str], story: dict) -> list[str]:
    """Catch explicit first-person qualification contradictions when one decisive tie is cited."""
    matches = [m for m in (story.get('matches') or []) if m.get('id') in ids and 'through' in m]
    if len(matches) != 1 or matches[0]['through'] is None:
        return []
    # The outcome is focus-club-relative. Do not infer the subject for named opponents.
    positive = re.search(r"\b(?:we|our (?:club|team|side))\s+(?:had\s+)?(?:qualified|advanced|went through|progressed)\b", text, re.I)
    negative = re.search(r"\b(?:we|our (?:club|team|side))\s+(?:were|was|had been)\s+(?:eliminated|knocked out|out)\b", text, re.I)
    if (positive and matches[0]['through'] is False) or (negative and matches[0]['through'] is True):
        return ['qualification contradicts the cited two-leg result; distinguish the match result from the tie outcome']
    return []

def squash(t: str) -> str:
    """Text compared as words: curly and straight quotes, dashes and spacing do not make a quote different."""
    t = t.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"').replace('–', '-').replace('—', '-')
    return re.sub(r'\s+', ' ', t).strip().strip('"').lower()


# Measured on the first full film (AEK 2002/03, 4.11.2026): a script at the old 148-word rate ran 8.83 min for a
# 7 min request, because the cold open, chapter cards, pauses and the end card take screen time the voice does not.
# A film is planned at this rate; the narrator still speaks at WORDS_PER_MINUTE.
FILM_WORDS_PER_MINUTE = 122


def target_words(minutes: float) -> tuple[int, int]:
    w = minutes * FILM_WORDS_PER_MINUTE
    return int(w * 0.9), int(w * 1.08)


def film_kind(ledger: dict) -> str:
    """What kind of film a ledger is for, read off how research cut it: a rivalry, one match, a tie, or a season."""
    f = ledger.get('focus') or {}
    if f.get('opponent'):
        return 'rivalry'
    if f.get('matches'):
        return 'match' if len(f['matches']) == 1 else 'tie'
    return 'season'


def validate_script(s: dict, ledger: dict, minutes: float, kind: str | None = None) -> list[str]:
    """Every problem with a script, as sentences. An empty list means the script may be voiced. A script that declares
    "director": 2 is also held to the director rules of docs/fanlife/66-directors-cut.md §3; an older script is checked
    as it always was, so a film already in progress never breaks."""
    errs: list[str] = []
    if not isinstance(s, dict):
        return ['Script is not an object']
    ids = {c['id'] for c in ledger['claims']}
    by = {c['id']: c for c in ledger['claims']}
    summaries = {f'summary:{k}' for k in ledger.get('summary', {}).get('by_competition', {})}
    if any((c.get('fact') or {}).get('kind') == 'match' for c in ledger['claims']):
        summaries.add('story')  # a pseudo-claim: the numbers the story block counted (story_numbers)
    if 'director' in s and s['director'] not in (1, DIRECTOR):
        errs.append(f'"director" must be {DIRECTOR}')
    directed = s.get('director') == DIRECTOR
    story = story_of(ledger) if any(c['fact'].get('kind') == 'match' for c in ledger['claims']) else {}
    order = {m['id']: i for i, m in enumerate(story.get('matches') or [])}
    seq: list[tuple[str, dict, dict, list[str]]] = []   # (where, beat, visual, cites) in film order, for the director rules
    tc = s.get('title_candidates')
    if not isinstance(tc, list) or len(tc) != 10:
        errs.append('Exactly ten title candidates are required')
    else:
        for i, t in enumerate(tc):
            if not isinstance(t, dict) or not isinstance(t.get('title'), str) or not t['title'].strip() or len(t['title']) > 100:
                errs.append(f'Title {i} is missing or longer than 100 characters')
            elif t.get('angle') not in ANGLES:
                errs.append(f'Title {i} must be marked search or discovery')
            else:
                errs += [f'Title {i}: {e}' for e in fact_guard(t['title'], ledger, list(ids) + list(summaries))]
        angles = {t.get('angle') for t in tc if isinstance(t, dict)}
        if angles != ANGLES:
            errs.append('Titles must include both search-oriented and discovery-oriented concepts')
    if not isinstance(s.get('selected'), int) or not (isinstance(tc, list) and 0 <= s['selected'] < len(tc)):
        errs.append('selected must index a title candidate')
    chapters = s.get('chapters')
    if not isinstance(chapters, list) or not chapters:
        return errs + ['At least one chapter is required']
    words = 0
    first = True
    for ci, ch in enumerate(chapters):
        if not isinstance(ch, dict) or not isinstance(ch.get('title'), str) or not ch['title'].strip():
            errs.append(f'Chapter {ci + 1} needs a title')
            continue
        beats = ch.get('beats')
        if not isinstance(beats, list) or not beats:
            errs.append(f'Chapter {ci + 1} has no beats')
            continue
        for bi, b in enumerate(beats):
            where = f'Chapter {ci + 1} beat {bi + 1}'
            if not isinstance(b, dict) or not isinstance(b.get('narration'), str) or not b['narration'].strip():
                errs.append(f'{where}: narration missing')
                continue
            if first:
                if not b['narration'].startswith(str(s.get('hook') or '\0')):
                    errs.append('The first beat must begin with the exact hook')
                first = False
            words += len(b['narration'].split())
            cites = b.get('claim_ids')
            if not isinstance(cites, list) or any(c not in ids and c not in summaries for c in cites):
                errs.append(f'{where}: cites an unknown claim')
                cites = [c for c in cites or [] if isinstance(c, str)]
            v = b.get('visual')
            if not isinstance(v, dict) or v.get('type') not in VISUALS:
                errs.append(f'{where}: unknown visual')
                continue
            t = v['type']
            extra = set(v) - VISUALS[t] - {'type', 'prop', 'figure'}
            for fk in ([v['figure']] if isinstance(v.get('figure'), str) else v.get('figure') or []):
                if not (isinstance(fk, str) and fk.startswith('cut:') and art_ok(fk, ledger)):
                    errs.append(f'{where}: unknown figure {fk}')
            if 'prop' in v and v['prop'] not in PROPS:
                errs.append(f'{where}: unknown prop {v["prop"]}')
            if extra:
                errs.append(f'{where}: visual {t} has unknown fields {sorted(extra)}')
            vc = [v['claim']] if isinstance(v.get('claim'), str) else []
            vc += [c for c in v.get('claims') or [] if isinstance(c, str)]
            vc += [c for c in v.get('mark') or [] if isinstance(c, str)] if isinstance(v.get('mark'), list) else []
            for c in vc:
                if c not in ids and c not in summaries:
                    errs.append(f'{where}: visual names unknown claim {c}')
            if t in CLAIM_VISUALS and not vc:
                errs.append(f'{where}: a {t} must name its claim')
            if t in ('matchday', 'score', 'ticket') and vc and vc[0] in by and by[vc[0]]['fact'].get('kind') != 'match':
                errs.append(f'{where}: {t} needs a match claim')
            if t == 'score' and 'in_play' in v and not isinstance(v['in_play'], bool):
                errs.append(f'{where}: in_play must be a boolean')
            if t == 'table' and vc and vc[0] in by and by[vc[0]]['fact'].get('kind') != 'table':
                errs.append(f'{where}: table needs a table claim')
            if t == 'quote' and vc and vc[0] in by:
                qf = by[vc[0]]['fact']
                if qf.get('kind') != 'quote':
                    errs.append(f'{where}: a quote needs a quote claim')
                elif not isinstance(v.get('text'), str) or squash(v['text']) not in squash(qf.get('text') or ''):
                    errs.append(f'{where}: a quote must be the speaker\'s own words, word for word from its claim')
                elif v.get('who') != qf.get('speaker'):
                    errs.append(f'{where}: a quote names its speaker as the claim does ({qf.get("speaker")})')
                elif len(v['text'].split()) > 40:
                    errs.append(f'{where}: a quote is at most 40 words')
            if t == 'press' and vc and vc[0] in by:
                pf = by[vc[0]]['fact']
                if pf.get('kind') != 'press':
                    errs.append(f'{where}: a press cutting needs a press claim')
                elif v.get('headline') != pf.get('headline') or v.get('outlet') != pf.get('outlet'):
                    errs.append(f'{where}: a press cutting prints the headline and outlet exactly as its claim has them')
            if t == 'timeline' and not (2 <= len(v.get('claims') or []) <= 8):
                errs.append(f'{where}: a timeline needs 2–8 claims')
            errs += [f'{where}: {e}' for e in director_visual(t, v, by, order, story, ledger, cites + vc)]
            errs += [f'{where}: {e}' for e in beat_fields(b, ledger, by, cites + vc)]
            seq.append((where, b, v, cites + vc))
            if 'backdrop' in v and not art_ok(v['backdrop'], ledger):
                errs.append(f'{where}: unknown backdrop {v["backdrop"]}')
            if t == 'illustration':
                art = v.get('art')
                if not art_ok(art, ledger, allow_gen=True):
                    errs.append(f'{where}: illustration art must be a library piece, an owner beat piece for this film, or gen')
                if art == 'gen' and (not isinstance(v.get('prompt'), str) or len(v['prompt']) < 20):
                    errs.append(f'{where}: a generated illustration needs a prompt')
            verbatim = {'quote': {'text'}, 'press': {'headline'}}.get(t, set())  # checked word for word against the claim above
            texts = [b['narration']] + [v.get(k) for k in ('headline', 'kicker', 'title', 'subtitle', 'heading', 'text', 'label', 'value', 'caption',
                                                           'who', 'role', 'outlet', 'standfirst')
                                        if isinstance(v.get(k), str) and k not in verbatim]
            texts += [x for x in v.get('lines') or [] if isinstance(x, str)] if t == 'trailer' and isinstance(v.get('lines'), list) else []
            texts += [b['slug']] if isinstance(b.get('slug'), str) else []
            for tx in texts:
                errs += [f'{where}: {e}' for e in fact_guard(tx, ledger, cites + vc)]
                errs += [f'{where}: {e}' for e in identity_guard(tx, ledger)]
                errs += [f'{where}: {e}' for e in knockout_guard(tx, ledger, cites + vc, story)]
            if t == 'stat' and isinstance(v.get('value'), str) and not numbers_in_text(v['value']):
                errs.append(f'{where}: a stat value must be a number')
    if 'motif' in s:  # the film's recurring object or image (the owner's craft): an image, never a fact
        mo = s['motif']
        if isinstance(mo, str):
            errs += [f'motif: {e}' for e in identity_guard(mo, ledger, motif=True)]
        known: set[str] = set()
        for c in by.values():
            _name_words(c['fact'], known)
        if not isinstance(mo, str) or not mo.strip() or len(mo) > 40 or len(mo.split()) > 6:
            errs.append('"motif" is a short image of at most six words (a scarf in the club colours, the clock above the north stand)')
        elif numbers_in_text(mo) or any(w in known for w in _fold(mo).split()) or any(m.lower() in mo.lower() for m in MONTHS):
            errs.append('"motif" is an image, not a fact: no number, date, club or name in it')
    if directed:
        errs += director_rules(s, seq, ledger, story, kind or film_kind(ledger), by)
    lo, hi = target_words(minutes)
    if not lo <= words <= hi:
        errs.append(f'Narration is {words} words; a {minutes}-minute film needs {lo}–{hi}')
    if not isinstance(s.get('description'), str) or not 200 <= len(s['description']) <= 3500:
        errs.append('Description must be 200–3500 characters (sources and chapters are appended later)')
    tags = s.get('tags')
    if not isinstance(tags, list) or not 5 <= len(tags) <= 20 or len(','.join(map(str, tags))) > 450:
        errs.append('Tags: 5–20, under 450 characters together')
    sh = s.get('shorts')
    if not isinstance(sh, list) or not 2 <= len(sh) <= 3:
        errs.append('Two or three Shorts ideas are required')
    if isinstance(sh, list):
        film_text = ' '.join(b.get('narration', '') for ch in chapters for b in ch.get('beats') or [] if isinstance(b, dict)).lower()
        for i, short in enumerate(sh):
            if not isinstance(short, dict) or 'narration' not in short:
                continue  # Older scripts can still be filmed; their Shorts need to be rewritten.
            narration = short.get('narration')
            cited = short.get('claim_ids')
            if not isinstance(narration, str) or not 15 <= len(narration.split()) <= 55:
                errs.append(f'Short {i+1}: independent narration must contain 15–55 words')
                continue
            if not isinstance(short.get('hook'), str) or not narration.startswith(short['hook']):
                errs.append(f'Short {i+1}: narration must start with its hook')
            if not isinstance(cited, list) or not cited or any(x not in ids and x not in summaries for x in cited):
                errs.append(f'Short {i+1}: cite evidence for the short')
                continue
            errs += [f'Short {i+1}: {e}' for e in fact_guard(narration, ledger, cited)]
            errs += [f'Short {i+1}: {e}' for e in identity_guard(narration, ledger) + knockout_guard(narration, ledger, cited, story)]
            if len(narration.split()) >= 12 and narration.lower() in film_text:
                errs.append(f'Short {i+1}: write independently rather than copy the main film')
    th = s.get('thumbnails')
    if not isinstance(th, list) or len(th) != 3 or any(not isinstance(x, dict) or not isinstance(x.get('text'), str) or len(x['text'].split()) > 5 for x in th):
        errs.append('Exactly three thumbnail concepts with text of at most four words')
    return errs


# ── the Director's Cut (docs/fanlife/66-directors-cut.md §2–§3) ───────────────────────────────────────────────────────
NAME_STOP = {'fc', 'fk', 'sc', 'ac', 'ca', 'cf', 'afc', 'sk', 'nk', 'cd', 'sv', 'the', 'of', 'de', 'del', 'la', 'le', 'club', 'city',
             'united', 'real', 'sporting', 'athletic', 'cup', 'league', 'final', 'stadium', 'national', 'football', 'and', 'st',
             'red', 'star', 'young', 'boys', 'old', 'new', 'royal', 'union', 'inter', 'county', 'town', 'rovers', 'wanderers'}
NAME_FIELDS = ('club', 'opponent', 'home', 'away', 'name', 'speaker', 'outlet', 'city', 'venue', 'winner', 'club_scorer')
RESULT_CUES = re.compile(r'\b(won|win|wins|beat|beaten|beating|lost|lose|loses|losing|drew|draw|drawn|defeat|defeated|victory|'
                         r'thrash\w*|hammer\w*|crush\w*|held|equalis\w*|equaliz\w*|winner|scored|nil|knocked|eliminat\w*|through)\b', re.I)
SCORE_WORDS = {'nil': 0, 'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8,
               'nine': 9, 'ten': 10}
_SW = '|'.join(SCORE_WORDS)
SCORELINE = re.compile(r'(?<![\d–-])(\d{1,2})\s?[–-]\s?(\d{1,2})(?![\d–-])|'
                       rf'(?<!\ba )\b({_SW})-({_SW}|all)\b|\b({_SW}) nil\b', re.I)   # "a two-one lead" is not a score told; "Vienna three-nil" is
COLD_TITLE = re.compile(r'^\s*(in|during)\s+(the\s+)?(\d{4}|season|summer|autumn|winter|spring)|^\s*(the\s+)?\d{4}(/\d{2,4})?\s+season'
                        r'|^\s*this is the story|^\s*once upon', re.I)
TABLE_TALK = re.compile(r'\b(league table|the table|the standings|top of the (league|pile)|bottom of the (league|table)|'
                        r'league leaders|top spot|(first|second|third|fourth|fifth|top|bottom|last|\d+(st|nd|rd|th)) place|'
                        r'points? (clear|behind|ahead|adrift|gap)|relegation zone|\d+ points)\b', re.I)
META_NARRATION = re.compile(r"\b(we (track|revisit|look (at|back)|explore|follow|trace|examine|will see|dive)|you will see|join us|"
                            r"in this (video|film|documentary|episode)|this is (a|the) (record|story|tale|chronicle) of|"
                            r"the story of how|let'?s (look|go|take|dive))\b", re.I)
TURN_WORDS = re.compile(r'\b(but|until|then|yet|still|only|nobody|no one|not yet|what|who|how|why|would|could|next|waiting|'
                        r'remember|unless|before|soon|coming|ahead|tomorrow|almost|if)\b', re.I)


def _fold(t: str) -> str:
    import unicodedata
    t = ''.join(ch for ch in unicodedata.normalize('NFKD', t or '') if not unicodedata.combining(ch)).lower()
    return re.sub(r'[^a-z0-9 ]+', ' ', t.replace('-', ' '))


def _name_words(fact: dict, out: set[str] | None = None) -> set[str]:
    """The distinctive words of the names a claim carries (clubs, scorers, speakers, places): what a trailer may not
    print unless it cites the claim."""
    out = set() if out is None else out

    def add(x):
        for w in _fold(str(x)).split():
            if len(w) > 2 and w not in NAME_STOP and not w.isdigit():
                out.add(w)
    for k, x in (fact or {}).items():
        if k in NAME_FIELDS and isinstance(x, str):
            add(x)
        elif k in NAME_FIELDS and isinstance(x, dict) and isinstance(x.get('name'), str):
            add(x['name'])
        elif k in ('scorers', 'opponent_scorers', 'extra_time_scorers') and isinstance(x, list):
            for y in x:
                add(y.get('name') if isinstance(y, dict) else y)
    return out


def scorelines(text: str) -> list[tuple[int, int]]:
    out = []
    for m in SCORELINE.finditer(text or ''):
        if m.group(1):
            out.append((int(m.group(1)), int(m.group(2))))
        elif m.group(3):
            a, b = m.group(3).lower(), m.group(4).lower()
            if a == 'one' and b == 'two':
                continue  # "a one-two" is a pass, and "one-two" is never how a narrator says a 1–2 defeat
            out.append((SCORE_WORDS[a], SCORE_WORDS[a] if b == 'all' else SCORE_WORDS[b]))
        else:
            out.append((SCORE_WORDS[m.group(5).lower()], 0))
    return out


def timed_scorelines(shot: dict) -> list[tuple[float, tuple[int, int]]]:
    """Match score phrases to the word timing used for the spoken captions."""
    from .voice import spoken
    if shot.get('voice_at') is None:
        return []
    tokens = []
    for word in shot.get('words') or []:
        tokens.extend((t, word['start']) for t in re.findall(r'\w+', word['w'].casefold()))
    values = [SCORE_WORDS.get(t, t) for t, _ in tokens]
    lead = shot['voice_at'] - shot['start']
    cursor = 0
    timed = []
    for match in SCORELINE.finditer(shot.get('narration') or ''):
        phrase = match.group()
        scores = scorelines(phrase)
        if not scores:
            continue
        pattern = [SCORE_WORDS.get(t, t) for t in re.findall(r'\w+', spoken(phrase).casefold())]
        pattern = [int(t) if isinstance(t, str) and t.isdecimal() else t for t in pattern]
        for i in range(cursor, len(values) - len(pattern) + 1):
            window = [int(t) if isinstance(t, str) and t.isdecimal() else t for t in values[i:i + len(pattern)]]
            if window == pattern:
                timed.append((lead + tokens[i + len(pattern) - 1][1], scores[0]))
                cursor = i + len(pattern)
                break
    return timed


def match_score_reveals(ledger: dict, shot: dict, match: dict) -> list[tuple[float, tuple[int, int]]]:
    from .director import match_goal_states
    valid = {(match['score_home'], match['score_away'])}
    for _, before, after in match_goal_states(ledger, match):
        valid.update((before, after))
    reveals = []
    for at, score in timed_scorelines(shot):
        if score not in valid:
            score = score[::-1]
        if score in valid and (not reveals or score != reveals[-1][1]):
            reveals.append((at, score))
    return reveals


def _pairs_in(v, out: set) -> set:
    if isinstance(v, str):
        for a, b in scorelines(v):
            out.add((a, b))
    elif isinstance(v, dict):
        for x in v.values():
            _pairs_in(x, out)
    elif isinstance(v, list):
        if len(v) == 2 and all(isinstance(x, int) and not isinstance(x, bool) for x in v):
            out.add((v[0], v[1]))
        for x in v:
            _pairs_in(x, out)
    return out


def director_visual(t: str, v: dict, by: dict, order: dict, story: dict, ledger: dict, cites: list[str]) -> list[str]:
    """The fields of the Director's Cut cards: right types, real ids, the right lengths (contract §2)."""
    errs: list[str] = []
    matches = story.get('matches') or []

    def is_match(c):
        return isinstance(c, str) and c in by and by[c]['fact'].get('kind') == 'match'

    def label(need=True):
        lb = v.get('label')
        if lb is None and not need:
            return
        if not isinstance(lb, str) or not lb.strip() or len(lb) > 40:
            errs.append(f'a {t} needs a label of at most 40 characters')
    if t == 'form':
        cl = v.get('claims')
        if not isinstance(cl, list) or not 3 <= len(cl) <= 12 or not all(is_match(c) for c in cl):
            errs.append('a form card takes 3–12 match claim ids')
        elif [order.get(c, -1) for c in cl] != sorted(order.get(c, -1) for c in cl) or len(set(cl)) != len(cl):
            errs.append('a form card lists its matches in date order, each once')
        label()
    elif t == 'race':
        label()
        mk = v.get('mark', [])
        if not isinstance(mk, list) or len(mk) > 4 or not all(is_match(c) for c in mk):
            errs.append('a race marks 0–4 match claim ids')
        if len(matches) < 3:
            errs.append('a race needs a form line of at least three matches')
    elif t == 'versus':
        if not is_match(v.get('claim')):
            errs.append('a versus needs a match claim')
    elif t == 'goal':
        c = v.get('claim')
        sc = by[c]['fact'].get('scorers') if is_match(c) else None
        i = v.get('scorer')
        if not is_match(c):
            errs.append('a goal needs a match claim')
        elif not isinstance(sc, list) or not sc:
            errs.append('a goal card needs a match whose claim names its scorers (this one does not)')
        elif not isinstance(i, int) or isinstance(i, bool) or not 0 <= i < len(sc):
            errs.append(f'a goal card names its scorer by index 0–{len(sc) - 1} into the claim\'s scorers')
        elif not isinstance(sc[i].get('minute'), int):
            errs.append('a goal card needs a scorer with a recorded minute')
    elif t == 'record':
        c = v.get('claim')
        if not (isinstance(c, str) and c.startswith('summary:') and c[8:] in (ledger.get('summary') or {}).get('by_competition', {})):
            errs.append('a record card names a season summary: "summary:<competition>"')
    elif t == 'run':
        cl = v.get('claims')
        label()
        if not isinstance(cl, list) or len(cl) < 3 or not all(is_match(c) for c in cl):
            errs.append('a run card takes 3 or more match claim ids')
        else:
            idx = [order.get(c, -1) for c in cl]
            if idx != list(range(idx[0], idx[0] + len(idx))):
                errs.append('a run card lists consecutive matches of the season, in order')
            else:
                rs = [matches[k]['outcome'] for k in idx]
                if not (all(r == 'win' for r in rs) or all(r == 'loss' for r in rs) or all(r != 'loss' for r in rs)
                        or all(r != 'win' for r in rs)):
                    errs.append('a run card shows one streak: all wins, all defeats, unbeaten, or without a win')
    elif t == 'trailer':
        lines = v.get('lines')
        if not isinstance(lines, list) or not 1 <= len(lines) <= 4 or not all(isinstance(x, str) and x.strip() for x in lines):
            errs.append('a trailer has 1–4 lines')
            return errs
        if any(len(x.split()) > 5 for x in lines):
            errs.append('a trailer line is at most 5 words')
        for x in lines:
            errs += [f'trailer line "{x}" {e}' for e in cited_words(x, by, cites, ledger)]
    return errs


# Literal weather only: "stormed back", "a thunderbolt", "a lightning break" are football, not a forecast.
WEATHER = re.compile(r'\b(rain|rains|rained|raining|rainy|rainswept|rain-soaked|drizzle|drizzly|downpour|snow|snowed|snowing|'
                     r'snowy|snowfall|sleet|fog|foggy|mist|misty|sunshine|sunny|sunlit|sun-baked|heatwave|scorching|sweltering|'
                     r'frost|frosty|blizzard|waterlogged|muddy|gale|gales|windy|windswept|thunderstorm)\b', re.I)
DAYS = 'Monday Tuesday Wednesday Thursday Friday Saturday Sunday'.split()


def _cited_text(by: dict, cites: list[str], ledger: dict) -> str:
    return _fold(' '.join([str(ledger.get('club_name') or '')] + [json.dumps(by[c]['fact'], ensure_ascii=False) for c in cites if c in by]))


def cited_words(text: str, by: dict, cites: list[str], ledger: dict, strict: bool = False) -> list[str]:
    """What a short line (a trailer card, a slug) may not say unless a claim cited in its beat says it: a club, person or
    place the ledger knows, a month or a weekday no cited claim is dated in, the weather. `strict` (a slug) also refuses
    any capitalised word the cited claims do not hold — a slug line is a place and a time, and both come from the record."""
    import datetime as _dt
    errs: list[str] = []
    allowed = _name_words({'club': ledger.get('club_name')})
    for c in cites:
        if c in by:
            _name_words(by[c]['fact'], allowed)
    known: set[str] = set()
    for c in by.values():
        _name_words(c['fact'], known)
    dates = [str(by[c]['fact'].get('date') or '') for c in cites if c in by]
    months = {d[5:7] for d in dates if len(d) >= 7}
    days = set()
    for d in dates:
        try:
            days.add(DAYS[_dt.date.fromisoformat(d[:10]).weekday()])
        except ValueError:
            pass
    for w in _fold(text).split():
        if w in known and w not in allowed:
            errs.append(f'names "{w}", which no claim cited in this beat holds')
    for mi, mn in enumerate(MONTHS):
        if re.search(rf'\b{mn}\b', text, re.I) and f'{mi + 1:02d}' not in months:
            errs.append(f'names {mn}, and no cited claim is dated in it')
    for dn in DAYS:
        if re.search(rf'\b{dn}\b', text, re.I) and dn not in days:
            errs.append(f'names a {dn}, and no cited claim fell on one')
    cited = _cited_text(by, cites, ledger)
    for m in WEATHER.finditer(text):
        if _fold(m.group(0)).strip() not in cited:
            errs.append(f'says "{m.group(0)}" — the weather is a fact, and no cited claim records it')
    if strict:
        words = cited.split()
        for i, tok in enumerate(re.findall(r"[A-Za-zÀ-ÿĀ-ž'’.-]+", text)):
            f = _fold(tok).strip()
            if (tok[:1].isupper() and f and f not in SLUG_WORDS and f not in words
                    and f.capitalize() not in MONTHS and f.capitalize() not in DAYS):
                errs.append(f'"{tok}" is not in a claim cited in this beat — a slug is a place and a time from the record')
    return errs


def beat_fields(b: dict, ledger: dict, by: dict | None = None, cites: list[str] | None = None) -> list[str]:
    errs = []
    if 'slug' in b:  # a screenplay slug line: "<place> — <time phrase>", both from the claims this beat cites
        sl = b['slug']
        if not isinstance(sl, str) or not 5 <= len(sl) <= 60 or not re.fullmatch(r'[^—]+ — [^—]+', sl.strip()):
            errs.append('a slug is "<place> — <time phrase>" (an em dash between them), at most 60 characters')
        else:
            errs += [f'slug "{sl}" {e}' for e in cited_words(sl, by or {}, cites or [], ledger, strict=True)]
    if 'camera' in b and b['camera'] not in CAMERAS:
        errs.append(f'camera must be one of {sorted(CAMERAS)}')
    if 'pace' in b and b['pace'] not in PACES:
        errs.append(f'pace must be one of {sorted(PACES)}')
    if 'sfx' in b and b['sfx'] not in SFX:
        errs.append(f'sfx must be one of {sorted(SFX)}')
    if 'broll' in b and not art_ok(b['broll'], ledger):
        errs.append(f'unknown broll {b["broll"]}')
    return errs


def director_rules(s: dict, seq: list, ledger: dict, story: dict, kind: str, by: dict) -> list[str]:
    """Contract §3, rules 1–5, as errors the writer can act on. Rule 6 (humour only from the record) is a writing rule."""
    errs: list[str] = []
    seq = [x for x in seq if x[2].get('type') not in ('follow', 'end')]
    types = [x[2].get('type') for x in seq]
    moments = story.get('moments') or []
    matches_by_opp: dict[str, list[str]] = {}
    for c in by.values():
        f = c['fact']
        if f.get('kind') == 'match' and f.get('opponent'):
            matches_by_opp.setdefault(f['opponent'], []).append(c['id'])

    # 1 · every match the narration names is shown with its score on that beat
    for where, b, v, cites in seq:
        text = b.get('narration') or ''
        folded = f' {_fold(text)} '
        cited_matches = [c for c in cites if c in by and by[c]['fact'].get('kind') == 'match']
        if RESULT_CUES.search(text):
            for opp, mids in matches_by_opp.items():
                core = ' '.join(w for w in _fold(opp).split() if w not in NAME_STOP) or _fold(opp).strip()
                if core and f' {core} ' in folded and not set(mids) & set(cited_matches):
                    errs.append(f'{where}: [director rule 1] the narration tells a result against {opp} but the beat cites none '
                                f'of those matches, so its score cannot be on screen')
        pairs: set = set()
        for c in cites:
            if c in by:
                f = by[c]['fact']
                if f.get('kind') == 'match':
                    from .director import match_goal_states
                    pairs |= {(f['club_goals'], f['opponent_goals']), (f['opponent_goals'], f['club_goals'])}
                    for _, before, after in match_goal_states(ledger, f):
                        pairs.update((before, after))
                _pairs_in(f, pairs)
        pairs |= {(b_, a) for a, b_ in pairs}
        for sl in scorelines(text):
            if sl not in pairs:
                errs.append(f'{where}: [director rule 1] the scoreline {sl[0]}–{sl[1]} is not the score of a match this beat cites')

    # no position the archive cannot prove (contract §1, rule 11): table talk needs a table claim in the beat
    for where, b, v, cites in seq:
        m = TABLE_TALK.search(b.get('narration') or '')
        if m and not any(c in by and by[c]['fact'].get('kind') == 'table' for c in cites):
            errs.append(f'{where}: [no position] "{m.group(0)}" — the archive holds only this club\'s matches; a table, a '
                        f'place or points need a table claim cited in the beat')

    # the weather is a fact like any other (contract rule 6: humour from the weather only when the record has it)
    for where, b, v, cites in seq:
        cited = _cited_text(by, cites, ledger)
        for m in WEATHER.finditer(b.get('narration') or ''):
            if _fold(m.group(0)).strip() not in cited:
                errs.append(f'{where}: [no invented weather] "{m.group(0)}" — no claim cited in this beat records the weather')
                break

    # 2 · the cards each kind of film must have
    has = set(types)
    if kind == 'season':
        if len(story.get('matches') or []) >= 3 and not has & {'race', 'form'}:
            errs.append('[director rule 2] a season film needs a "race" or a "form" card')
        if 'record' not in has:
            errs.append('[director rule 2] a season film needs a "record" card')
    elif kind in ('match', 'tie'):
        if 'versus' not in has:
            errs.append(f'[director rule 2] a {kind} film needs a "versus" card')
        if not has & {'score', 'goal'}:
            errs.append(f'[director rule 2] a {kind} film needs a "score" or a "goal" card')
    elif kind == 'rivalry':
        if 'All competitions' in (ledger.get('summary') or {}).get('by_competition', {}) and not any(
                x[2].get('type') == 'record' and x[2].get('claim') == 'summary:All competitions' for x in seq):
            errs.append('[director rule 2] a rivalry film needs a "record" card of "summary:All competitions"')
        if moments and not any(x[2].get('type') == 'versus' and x[2].get('claim') == moments[0]['id'] for x in seq):
            errs.append(f'[director rule 2] a rivalry film needs a "versus" card for its biggest meeting ({moments[0]["id"]})')

    # 3 · open cold on the strongest moment, or on a trailer — never "In the season of…"
    if seq:
        where, b, v, cites = seq[0]
        if moments and v.get('type') != 'trailer' and moments[0]['id'] not in cites:
            errs.append(f'[director rule 3] the film must open cold: a "trailer" card, or the strongest moment '
                        f'({moments[0]["id"]}) cited in the first beat')
    if COLD_TITLE.search(str(s.get('hook') or '')):
        errs.append('[director rule 3] the hook may not open like a history lesson ("In the season of…")')

    # 4 · no visual type more than twice in a row; no camera move three times in a row
    for i in range(2, len(seq)):
        if types[i] == types[i - 1] == types[i - 2]:
            errs.append(f'{seq[i][0]}: [director rule 4] a third "{types[i]}" in a row')
        cams = [seq[j][1].get('camera') for j in (i - 2, i - 1, i)]
        if cams[0] and cams[0] == cams[1] == cams[2]:
            errs.append(f'{seq[i][0]}: [director rule 4] the same camera move ({cams[0]}) three times in a row')

    # 5 · every chapter but the last ends on a question, a cliffhanger or a turn
    chs = s.get('chapters') or []
    for ci, ch in enumerate(chs[:-1]):
        beats = [b for b in (ch.get('beats') or []) if isinstance(b, dict)
                 and (b.get('visual') or {}).get('type') not in ('follow', 'end')]
        if not beats:
            continue
        text = (beats[-1].get('narration') or '').strip()
        sentences = [x for x in re.split(r'(?<=[.!?…])\s+', text) if x.strip()]
        last = sentences[-1] if sentences else ''
        if not (last.endswith(('?', '…', '...', '—', '-')) or TURN_WORDS.search(last)):
            errs.append(f'Chapter {ci + 1}: [director rule 5] its last line must end on a question, a cliffhanger or a turn')

    # 6 · the narrator tells the story; he never talks about the film (owner, 14.11.2026: "boring, a long slideshow")
    for ci, ch in enumerate(chs):
        for b in ch.get('beats') or []:
            if not isinstance(b, dict) or (b.get('visual') or {}).get('type') in ('follow', 'end'):
                continue   # the studio's own hand-over (rule 136) speaks to the viewer by design
            m = META_NARRATION.search(str(b.get('narration') or ''))
            if m:
                errs.append(f'Chapter {ci + 1}: [director rule 6] "{m.group(0)}" talks about the film — tell the moment itself '
                            f'(who, where, the minute, what happened)')

    # 7 · the opening asks its question out loud (one short "?" sentence in the first fifteen seconds, set in type by
    # docu/plan.question_cards). Asked of the writer in its brief, not enforced here: a script without it is not wrong,
    # it only loses its question card — and a hard rule would send good scripts back for want of a punctuation mark.
    return errs


# ── the mini-drama (owner, 12.11.2026: "Make mini-dramas. Create tension. Create joy and happiness.") ───────────────────
# Every chapter is written as a small drama — a WANT, an OBSTACLE, a CLOCK, a TURN, a PAYOFF — and ends on a cliff edge;
# the film plants a question in its opening, withholds the outcome and pays it off after the midpoint, with one moment
# of real tension and one of pure joy. These are read off the words the writer wrote (no model), and each failure is a
# sentence the writer can act on. They never fail a film: writer.write_script asks for ONE rewrite when a chapter
# fails and keeps the better script; the experience gate reports the arc on the finished film (qa.experience).
DRAMA = 1   # a script that declares "drama": 1 was written to this shape
WANT = re.compile(r'\b(want\w*|need\w*|must|had to|has to|have to|chas\w+|hop\w+|dream\w*|aim\w*|to win|to stay up|to survive|to reach|a win would|'
                  r'on the line|at stake|stakes?|for the first time|one (game|match|point|goal|win|shoot-out) (from|away)|waited|waiting|promise\w*|ambition)\b', re.I)
OBSTACLE = re.compile(r'\b(but|yet|against|behind|trail\w*|without|injur\w+|suspend\w+|sent off|lost|los(e|ing)|down|deficit|never|nobody|no one|only|'
                      r'favourites?|stronger|rivals?|doubt\w*|problem|trouble|debt|crisis|feared|unbeaten|had not won|had never)\b', re.I)
CLOCKED = re.compile(r'\b(minutes?|seconds|hours?|days?|weeks?|months?|left|remaining|to go|deadline|last|final (day|game|match|whistle)|by (the end|then|may|june)|'
                     r'before|until|extra time|stoppage|penalt\w+|shoot-?out|the clock|time was|running out|\d{1,2}(st|nd|rd|th))\b', re.I)
TURNED = re.compile(r'\b(then|until|suddenly|but then|turned|chang\w+|instead|equalis\w+|equaliz\w+|comeback|came back|that was when|and yet|everything|'
                    r'out of nowhere|this time|at last|finally)\b', re.I)
PAYOFF_VISUALS = {'score', 'goal', 'versus', 'table', 'record', 'stat', 'form', 'run'}
PLANTED = re.compile(r'\?|comes? down to|one (game|match|point|goal|kick|shoot-out|win) (from|away)|nobody knew|no one knew|still level|all to play for|'
                     r'how (did|do|could)|what happened|would (it|they|he)\b|could (it|they|he)\b', re.I)
DRAMA_MIN_BEATS = 4   # a chapter shorter than this is a scene, not a drama: only its cliff edge is asked of it


def mini_drama(s: dict) -> list[str]:
    """What is missing from the script's mini-drama shape, as sentences (empty when it holds)."""
    errs: list[str] = []
    chs = [c for c in (s.get('chapters') or []) if isinstance(c, dict)]
    flat = []
    for ci, ch in enumerate(chs):
        beats = [b for b in (ch.get('beats') or []) if isinstance(b, dict) and (b.get('visual') or {}).get('type') not in ('follow', 'end')]
        flat += [(ci, b) for b in beats]
        text = [(b.get('narration') or '') for b in beats]
        name = f'Chapter {ci + 1} ("{(ch.get("title") or "").strip()[:40]}")'
        if len(beats) >= DRAMA_MIN_BEATS:
            third = max(1, len(beats) // 3)
            if not any(WANT.search(t) for t in text[:max(2, third + 1)]):
                errs.append(f'{name}: [mini-drama] its opening beats never say what the club or the people WANT here — state the want or the stake in the first two beats')
            if not any(OBSTACLE.search(t) for t in text):
                errs.append(f'{name}: [mini-drama] nothing stands in the way — name the OBSTACLE (the opponent, the deficit, the doubt) before the result')
            if not any(CLOCKED.search(t) for t in text):
                errs.append(f'{name}: [mini-drama] there is no CLOCK — say how much time is left (minutes, matches, days) so the viewer feels it running out')
            if not any(TURNED.search(t) for t in text[len(beats) // 2:]):
                errs.append(f'{name}: [mini-drama] its second half has no TURN — one beat where the story changes direction ("Then…", "Until…", "But this time…")')
            tail = beats[-third - 1:]
            if not any(RESULT_CUES.search(b.get('narration') or '') or (b.get('visual') or {}).get('type') in PAYOFF_VISUALS for b in tail):
                errs.append(f'{name}: [mini-drama] it never pays off — its last beats must tell what happened (a result, a score, a table) before the cliff edge')
        if ci < len(chs) - 1 and beats:
            last = [x for x in re.split(r'(?<=[.!?…])\s+', (beats[-1].get('narration') or '').strip()) if x.strip()]
            line = last[-1] if last else ''
            if not (line.endswith(('?', '…', '...', '—', '-')) or TURN_WORDS.search(line)):
                errs.append(f'{name}: [mini-drama] it does not end on a cliff edge — its last line must be a question, a cliffhanger or a turn that the next chapter answers')
    if not flat:
        return errs
    said, planted = 0, False
    for _, b in flat:
        if said >= 60:
            break
        t = b.get('narration') or ''
        planted = planted or bool(PLANTED.search(t)) or '?' in ((b.get('visual') or {}).get('headline') or '')
        said += len(t.split())
    if not planted:
        errs.append('The film: [mini-drama] the first fifteen seconds plant no question — open on a moment whose outcome the viewer does not know yet, and do not tell it')
    opening = set(flat[0][1].get('claim_ids') or [])
    total = sum(len((b.get('narration') or '').split()) for _, b in flat) or 1
    run = 0
    if opening and len(flat) >= 8:
        early = late = False
        for i, (_, b) in enumerate(flat):
            w = len((b.get('narration') or '').split())
            if i and opening & set(b.get('claim_ids') or []) and RESULT_CUES.search(b.get('narration') or '') and (b.get('visual') or {}).get('type') in PAYOFF_VISUALS:
                early, late = early or (run + w / 2) / total < 0.5, late or (run + w / 2) / total >= 0.5
            run += w
        if early and not late:
            errs.append('The film: [mini-drama] the opening\'s outcome is told before the midpoint — withhold it and pay it off late')
        elif not late:
            errs.append('The film: [mini-drama] the question the opening plants is never paid off — return to that moment after the midpoint and tell how it ended')
    from .drama import STRONG, beats_of_script, sheet
    sh = sheet(beats_of_script(s))['beats']
    if len(flat) >= 8:
        if not any(x['emotion'] in ('tension', 'dread') and x['intensity'] >= STRONG for x in sh.values()):
            errs.append('The film: [mini-drama] there is no moment of real tension — tell one match or one decision against its clock, with what was at stake')
        if not any(x['emotion'] in ('joy', 'release') and x['intensity'] >= STRONG for x in sh.values()):
            errs.append('The film: [mini-drama] there is no moment of pure joy — give the win, the goal or the celebration its own beat')
    return errs


def selected_title(s: dict) -> str:
    return s['title_candidates'][s['selected']]['title']


def all_beats(s: dict):
    for ci, ch in enumerate(s['chapters']):
        for bi, b in enumerate(ch['beats']):
            yield ci, bi, ch, b


def ensure_valid(s: dict, ledger: dict, minutes: float, kind: str | None = None) -> None:
    errs = validate_script(s, ledger, minutes, kind)
    if errs:
        raise StageError('SCRIPT_INVALID', '; '.join(errs[:12]) + (f' (+{len(errs) - 12} more)' if len(errs) > 12 else ''))


def ensure_football_accuracy(s: dict, ledger: dict) -> None:
    """Recheck selected/resumed scripts before voice, without reapplying unrelated length rules."""
    story = story_of(ledger) if any((c.get('fact') or {}).get('kind') == 'match' for c in ledger.get('claims') or []) else {}
    errors = identity_guard(str(s.get('motif') or ''), ledger, motif=True)
    for ci, bi, _, beat in all_beats(s):
        visual = beat.get('visual') or {}
        ids = list(beat.get('claim_ids') or [])
        ids += [visual['claim']] if isinstance(visual.get('claim'), str) else []
        ids += visual.get('claims') or []
        texts = [beat.get('narration') or '']
        texts += [v for k, v in visual.items() if isinstance(v, str) and k in
                  ('headline', 'kicker', 'title', 'subtitle', 'heading', 'text', 'label', 'caption')]
        texts += [v for v in visual.get('lines') or [] if isinstance(v, str)]
        for text in texts:
            errors += [f'Chapter {ci + 1} beat {bi + 1}: {e}' for e in
                       identity_guard(text, ledger) + knockout_guard(text, ledger, ids, story)]
    if errors:
        raise StageError('SCRIPT_INVALID', '; '.join(errors[:12]))
