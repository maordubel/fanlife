"""Script contract: what the writer must return, and the checks that hold it to the evidence.

The script is beats of narration, each citing ledger claims and naming ONE visual from a fixed vocabulary that the
renderer knows how to draw. Every data-bearing graphic (a score, a matchday card, a table, a ticket) names a CLAIM, not
text — the renderer prints the claim's own fields, so the film's typography cannot say something the archive does not.
Free text (narration, fact boxes, headlines) goes through `fact_guard`: every number must come from a cited claim.
"""
from __future__ import annotations

import re

from .common import StageError

VISUALS = {
    'open': {'backdrop', 'headline', 'kicker'},
    'chapter': {'number', 'title', 'backdrop'},
    'map': {'focus', 'claims', 'label'},
    'matchday': {'claim', 'backdrop'},
    'score': {'claim', 'backdrop'},
    'fact': {'heading', 'text', 'claim', 'backdrop'},
    'stat': {'value', 'label', 'claim', 'backdrop'},
    'timeline': {'claims', 'label', 'backdrop'},
    'table': {'claim', 'backdrop'},
    'turning': {'title', 'subtitle', 'backdrop'},
    'illustration': {'art', 'caption', 'prompt'},
    'ticket': {'claim', 'backdrop'},
    'end': set(),
}
PROPS = {'board_member', 'coach', 'football', 'generic_trophy', 'goal_net', 'match_ticket', 'passenger_plane', 'portable_radio',
         'referee', 'supporter_scarf', 'supporters_bus', 'tactics_board'}
LIBRARY_ART = {'tunnel', 'terrace-crowd', 'terrace-empty', 'supporter', 'paper'}


def beat_set(ledger: dict) -> str:
    """The folder of owner beat illustrations for this film: <club id>-<season with a dash>."""
    return f"{ledger.get('club_id') or ''}-{str(ledger.get('season') or '').replace('/', '-')}"


def art_ok(key, ledger: dict, *, allow_gen: bool = False) -> bool:
    """A library piece, an owner beat piece made for THIS club and season, or (for illustrations) a generated one."""
    from .paper import beat_path, clip_path
    if key in LIBRARY_ART or (allow_gen and key == 'gen'):
        return True
    if not isinstance(key, str):
        return False
    for kind, find in (('beat', beat_path), ('clip', clip_path)):
        for set_id in (beat_set(ledger), 'common'):
            if key.startswith(f'{kind}:{set_id}/') and find(key) is not None:
                return True
    return False


CLAIM_VISUALS = {'matchday', 'score', 'table', 'ticket'}
ANGLES = {'search', 'discovery'}
DURATIONS = {0.5, 1, 2, 3, 5, *range(7, 26)}

WORDS_PER_MINUTE = 135

SCHEMA_TEXT = '''{
  "title_candidates": [{"title": string <=100 chars, "angle": "search" | "discovery"}] — EXACTLY 10,
  "selected": integer index into title_candidates,
  "hook": string — the first sentence the viewer hears; must be the start of the first beat's narration,
  "chapters": [{"title": string, "beats": [{
      "narration": string (one to three sentences),
      "claim_ids": [string] — ledger ids this beat relies on (may be empty only for pure atmosphere with no fact),
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
        {"type":"end"}
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
  "shorts": [{"hook": string, "idea": string, "claim_ids": [string]}] — 2 or 3,
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
        if i.startswith('summary:'):
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


def fact_guard(text: str, ledger: dict, ids: list[str]) -> list[str]:
    """Numbers in `text` that none of the cited claims carries. Empty list = passes."""
    allowed = claim_numbers(ledger, ids)
    missing = sorted(n for n in numbers_in_text(text) if n not in allowed)
    return [f'number {n} is not in the cited claims {ids or "[]"}' for n in missing]


def target_words(minutes: float) -> tuple[int, int]:
    w = minutes * WORDS_PER_MINUTE
    return int(w * 0.85), int(w * 1.12)


def validate_script(s: dict, ledger: dict, minutes: float) -> list[str]:
    """Every problem with a script, as sentences. An empty list means the script may be voiced."""
    errs: list[str] = []
    if not isinstance(s, dict):
        return ['Script is not an object']
    ids = {c['id'] for c in ledger['claims']}
    by = {c['id']: c for c in ledger['claims']}
    summaries = {f'summary:{k}' for k in ledger.get('summary', {}).get('by_competition', {})}
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
            extra = set(v) - VISUALS[t] - {'type', 'prop'}
            if 'prop' in v and v['prop'] not in PROPS:
                errs.append(f'{where}: unknown prop {v["prop"]}')
            if extra:
                errs.append(f'{where}: visual {t} has unknown fields {sorted(extra)}')
            vc = [v['claim']] if isinstance(v.get('claim'), str) else []
            vc += [c for c in v.get('claims') or [] if isinstance(c, str)]
            for c in vc:
                if c not in ids and c not in summaries:
                    errs.append(f'{where}: visual names unknown claim {c}')
            if t in CLAIM_VISUALS and not vc:
                errs.append(f'{where}: a {t} must name its claim')
            if t in ('matchday', 'score', 'ticket') and vc and vc[0] in by and by[vc[0]]['fact'].get('kind') != 'match':
                errs.append(f'{where}: {t} needs a match claim')
            if t == 'table' and vc and vc[0] in by and by[vc[0]]['fact'].get('kind') != 'table':
                errs.append(f'{where}: table needs a table claim')
            if t == 'timeline' and not (2 <= len(v.get('claims') or []) <= 8):
                errs.append(f'{where}: a timeline needs 2–8 claims')
            if 'backdrop' in v and not art_ok(v['backdrop'], ledger):
                errs.append(f'{where}: unknown backdrop {v["backdrop"]}')
            if t == 'illustration':
                art = v.get('art')
                if not art_ok(art, ledger, allow_gen=True):
                    errs.append(f'{where}: illustration art must be a library piece, an owner beat piece for this film, or gen')
                if art == 'gen' and (not isinstance(v.get('prompt'), str) or len(v['prompt']) < 20):
                    errs.append(f'{where}: a generated illustration needs a prompt')
            texts = [b['narration']] + [v.get(k) for k in ('headline', 'kicker', 'title', 'subtitle', 'heading', 'text', 'label', 'value', 'caption')
                                        if isinstance(v.get(k), str)]
            for tx in texts:
                errs += [f'{where}: {e}' for e in fact_guard(tx, ledger, cites + vc)]
            if t == 'stat' and isinstance(v.get('value'), str) and not numbers_in_text(v['value']):
                errs.append(f'{where}: a stat value must be a number')
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
    th = s.get('thumbnails')
    if not isinstance(th, list) or len(th) != 3 or any(not isinstance(x, dict) or not isinstance(x.get('text'), str) or len(x['text'].split()) > 5 for x in th):
        errs.append('Exactly three thumbnail concepts with text of at most four words')
    return errs


def selected_title(s: dict) -> str:
    return s['title_candidates'][s['selected']]['title']


def all_beats(s: dict):
    for ci, ch in enumerate(s['chapters']):
        for bi, b in enumerate(ch['beats']):
            yield ci, bi, ch, b


def ensure_valid(s: dict, ledger: dict, minutes: float) -> None:
    errs = validate_script(s, ledger, minutes)
    if errs:
        raise StageError('SCRIPT_INVALID', '; '.join(errs[:12]) + (f' (+{len(errs) - 12} more)' if len(errs) > 12 else ''))
