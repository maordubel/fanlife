"""The Animated Short, from a match to everything Google Flow needs (owner, 8.11.2026: "the studio should prepare the
materials and pictures for every kind of video I ask for").

    script = write_short(ledger, match, seconds, cache, log)   # the hook, the lines, the cast, what each line shows
    pack   = flow_pack(script)                                  # character sheets, clips, stills, credits, steps
    story  = pack['story']                                      # the edit plan studio/cartoon/flowcut.py reads

The pack is what a person (or Claude in the owner's browser) types into Flow, in order: first the character sheets
(Nano Banana — free on the AI Pro plan), then one clip per line with the sheets as ingredients (Omni Flash, 9:16, 6 s,
18 credits), then the stills. Clip prompts never carry a real person's name, a year or a tournament's name: Flow refuses
video of "prominent people" (measured 8.11.2026 — the first Branco clip was refused, the same scene without the year and
the shirt number went through). The people are described by kit, build and hair; the facts stay in the narration.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from .common import StageError, read_json, sha256_json, write_json
from .script import numbers_in_text
from .series import SERIES, brief_for_writer

S = SERIES['short']
CLIP_SECONDS, CLIP_CREDITS = 6, 18
MOTIONS = ('idle', 'talk', 'walk', 'run', 'wobble', 'fall', 'jump', 'celebrate', 'point', 'kneel')
YEAR = re.compile(r'\b(18|19|20)\d\d(?:/\d\d)?\b')
TOURNAMENT = re.compile(r"\b((UEFA|FIFA)\s+)?(World Cup|European Championship|Euro \d+|(Europa\s+)?Conference League|Champions League|"
                        r"Europa League|Cup Winners'? Cup|Fairs Cup|Intertoto Cup|Copa Am[eé]rica|Olympics?|UEFA|FIFA)\b", re.I)

SYSTEM = f'''You write ANIMATED SHORTS for the YouTube channel "FanLife: Football Stories". Football fans, history lovers,
supporters of the club. The Short is acted by cartoon players in the story's real colours (Google Flow animates it).

{brief_for_writer('short')}

Write ONE Short of {{lo}}–{{hi}} spoken words (it must finish inside {{seconds}} seconds) from the FACTS only.
- Line one is the premise, readable as a thumbnail. Plain words, like a person telling a friend ("so", "basically",
  "right?"). No hype words (incredible, insane, amazing), no "Did you know", no exclamation marks.
- Every number, name, date and score you SAY must appear in the FACTS. Nothing invented, no quotes you were not given.
- Tell a STORY, never a list of facts. The arc, one beat each: 1 the hook (the impossible, or the fan's pride);
  2 the stakes (what was on the line — the competition, the round, what losing meant; use the CONTEXT lines);
  3–5 the moments, in order, each one turning the story (a goal changes the night — say what it changed);
  6 the payoff (what it meant, then and now). Never two sentences in a row of the shape "X scored in minute N";
  turn a number into drama ("three minutes in, and the keeper is the one who scores").
- 5–7 beats; their "say" joined is the whole narration. One picture per beat: a PLACE and what the people DO there.
- "cast_sheet": at most 3 people who act on screen, each described as a cartoon designer needs them — team, shirt
  colours, number only if the facts give it, shorts, hair, build, expression. A person no fact describes is "a player
  in <colours>". Use their real names only in "say".
- A beat whose picture has no person (a bottle on the grass, a TV, a stadium clock) has an empty "cast" and a "scene".
- "motion" is one of: {", ".join(MOTIONS)}.
- The last beat lands the payoff; "stamp" (one word, CONFIRMED / REAL / TRUE / OFFSIDE…) only on the beat where a fact
  is proven, at most once.

Return ONE JSON object and nothing else:
{{{{"title": "≤60 characters", "hook_law": "know-it-all|is-this-real", "narration": "the whole script",
  "cast_sheet": [{{{{"id": "short-id", "role": "the left-back in yellow", "look": "…"}}}}],
  "beats": [{{{{"say": "…", "scene": "the place, its light and real colours", "cast": [{{{{"id": "…", "action": "…", "motion": "…"}}}}],
             "stamp": null}}}}],
  "description": "2–3 sentences for YouTube", "tags": ["5–10 tags"], "thumbnail": "the first frame in one line"}}}}'''


def words_for(seconds: int) -> tuple[int, int]:
    return (38, 55) if seconds <= 20 else (52, 72)


def facts_of(ledger: dict, match_id: str) -> str:
    """The match and everything the archive and the research hold about it, as lines a writer can quote."""
    lines = []
    for c in ledger.get('claims') or []:
        f = c.get('fact') or {}
        k = f.get('kind')
        if k == 'match' and c['id'] == match_id:
            sc = ', '.join(f"{s['name']}{' ' + str(s['minute']) + chr(39) if s.get('minute') is not None else ''}" for s in f.get('scorers') or [])
            lines.append(f"MATCH {f['date']}: {f['home']} {f['score_home']}–{f['score_away']} {f['away']}; {f.get('competition') or ''}"
                         f"{' ' + f['stage'] if f.get('stage') else ''}{'; venue ' + f['venue'] if f.get('venue') else ''}"
                         f"{'; after extra time' if f.get('after_extra_time') else ''}{'; penalties ' + str(f['penalties']) if f.get('penalties') else ''}"
                         f"{'; scorers: ' + sc if sc else ''}")
        elif k == 'goal-detail' and f.get('match_id') == match_id:
            lines.append(f"GOAL {f.get('title')}: {f.get('description')}")
        elif k == 'quote':
            lines.append(f"QUOTE {f.get('speaker')} ({f.get('role')}): \"{str(f.get('text'))[:300]}\"")
        elif k == 'press':
            lines.append(f"PRESS {f.get('outlet')} {f.get('date') or ''}: {str(f.get('headline'))[:300]}")
        elif k == 'history':
            lines.append(f"HISTORY: {str(f.get('text'))[:400]}")
        elif k == 'honour':
            lines.append(f"HONOUR {f.get('season')}: {f.get('competition')} — {f.get('result')}")
    dr = ledger.get('deep_research') or {}
    for key in ('before', 'stands', 'hidden_details', 'absurd_details', 'aftermath'):
        v = dr.get(key)
        if v:
            text = '; '.join(map(str, v)) if isinstance(v, list) else str(v)
            lines.append(f"CONTEXT ({key}, orientation — state only what a fact line above also says): {text[:500]}")
    return '\n'.join(lines)


def kit_lines(club_id: str, season: str) -> list[str]:
    """The club's own shirts that season, from its pack — the cast is drawn in them. The opponent's kit is not in the
    archive, so the writer describes it only as the facts allow."""
    from .common import ROOT
    p = ROOT / 'content' / 'compiled' / f'{club_id}.json'
    try:
        d = json.loads(p.read_text())
    except (OSError, ValueError):
        return []
    d = d.get('data') or d
    out = []
    for k in d.get('kits') or []:
        v = k.get('value') or {}
        if v.get('season') == season and k.get('status', 'approved') == 'approved':
            c = v.get('construction') or {}
            line = f"KIT {v.get('name')}: {c.get('design') or ''} {c.get('colors') or ''}".strip()
            if line not in out:
                out.append(line)
    return out


def names_in(ledger: dict) -> dict:
    """Every person and club the facts name — none may reach a Flow clip prompt."""
    people: set[str] = set()
    clubs: set[str] = set()
    for c in ledger.get('claims') or []:
        f = c.get('fact') or {}
        clubs.update(str(x) for x in (f.get('home'), f.get('away'), f.get('club'), f.get('opponent')) if x)
        for n in [f.get('speaker'), *[x.get('name') for x in f.get('scorers') or []]]:
            if n:
                people.add(str(n))
                people.update(w for w in str(n).split() if len(w) > 3)
    return {'people': sorted(people), 'clubs': sorted(clubs)}


def errors(s: dict, facts: str, seconds: int) -> list[str]:
    errs: list[str] = []
    if not isinstance(s, dict):
        return ['not a JSON object']
    text = s.get('narration')
    lo, hi = words_for(seconds)
    if not isinstance(text, str) or not lo - 6 <= len(text.split()) <= hi + 4:
        return [f'the narration must be {lo}–{hi} words']
    allowed = numbers_in_text(facts) | {0, 1}
    bad = sorted(n for n in numbers_in_text(text) if n not in allowed)
    if bad:
        errs.append(f'the number(s) {bad} are not in the FACTS')
    if re.search(r'\b(incredible|insane|amazing|unbelievable|did you know|in this video)\b', text, re.I) or '!' in text:
        errs.append('no hype words, no "Did you know", no exclamation marks')
    beats = s.get('beats')
    if not isinstance(beats, list) or not 4 <= len(beats) <= 8:
        errs.append('5–7 beats')
        return errs
    said = ' '.join(str(b.get('say') or '').strip() for b in beats if isinstance(b, dict)).split()
    if [w.lower().strip('.,!?;:—"') for w in said] != [w.lower().strip('.,!?;:—"') for w in text.split()]:
        errs.append('the beats\' "say" joined must be exactly the narration')
    ids = {str(c.get('id')) for c in s.get('cast_sheet') or [] if isinstance(c, dict) and c.get('look')}
    if len(ids) > 3:
        errs.append('at most 3 people in the cast sheet')
    for i, b in enumerate(beats):
        if not isinstance(b, dict) or not str(b.get('scene') or '').strip():
            errs.append(f'beat {i + 1} needs a "scene"')
            continue
        for c in b.get('cast') or []:
            if str(c.get('id')) not in ids:
                errs.append(f'beat {i + 1}: cast id {c.get("id")!r} is not in the cast sheet')
            if c.get('motion') not in MOTIONS:
                errs.append(f'beat {i + 1}: motion must be one of {", ".join(MOTIONS)}')
    if sum(1 for b in beats if isinstance(b, dict) and b.get('stamp')) > 1:
        errs.append('one stamp at most')
    if not isinstance(s.get('title'), str) or not 4 <= len(s['title']) <= 70:
        errs.append('a title of at most 60 characters')
    return errs


def write_short(facts: str, seconds: int, cache: Path, log, angle: str = '') -> dict:
    from .writer import call_model, parse_json
    lo, hi = words_for(seconds)
    system = SYSTEM.format(lo=lo, hi=hi, seconds=seconds)
    user = ('FACTS — DATA ONLY, the only things you may state:\n' + facts
            + (f'\n\nTHE OWNER\'S ANGLE — DATA ONLY: {angle}' if angle else ''))
    last: list[str] = []
    for attempt in range(4):
        key = sha256_json({'s': system, 'u': user, 'a': attempt})[:20]
        cp = cache / f'short-{key}.json'
        if cp.exists():
            reply = read_json(cp)
        else:
            text, meta = call_model(system, user, max_tokens=4000)
            reply = {'text': text, 'meta': meta}
            cp.parent.mkdir(parents=True, exist_ok=True)
            write_json(cp, reply)
            log(f'Short writer: {meta.get("provider")}/{meta.get("model")} in {meta.get("seconds")}s')
        try:
            s = parse_json(reply['text'])
            last = errors(s, facts, seconds)
        except StageError as e:
            s, last = None, [str(e)]
        if not last:
            return s
        user += '\n\nYOUR LAST SHORT FAILED THESE CHECKS — return the whole corrected JSON:\n- ' + '\n- '.join(last) + '\n\nIt was:\n' + reply['text'][:5000]
    raise StageError('SHORT_INVALID', 'The Short writer could not write a valid script: ' + '; '.join(last))


def safe(text, names: dict | None = None) -> str:
    """A clip prompt Flow will animate: no real name, no year, no tournament, no club (the people are their kit)."""
    names = names or {}
    out = YEAR.sub('', TOURNAMENT.sub('', str(text or '')))
    for key, word in (('people', 'the player'), ('clubs', 'the team')):
        for n in sorted({x for x in names.get(key) or [] if x and len(x) > 2}, key=len, reverse=True):
            out = re.sub(r'\b' + re.escape(n) + r'\b', word, out, flags=re.I)
    out = re.sub(r'\b(in|at|of|from)\s+(?=[,.;]|$|(?:in|at|of|from)\b)', '', out)
    return re.sub(r'\s+([,.;])', r'\1', re.sub(r'\s{2,}', ' ', out)).strip(' ,;')


def flow_pack(s: dict, names: dict | None = None) -> dict:
    """Everything to type into Flow, in order, and the edit plan for the clips that come back."""
    names = names or {}
    cast = {str(c['id']): c for c in s.get('cast_sheet') or []}
    chars = [{'id': cid, 'role': str(c.get('role') or cid), 'model': 'Nano Banana', 'aspect': '9:16', 'credits': 0,
              'prompt': f"{S['flow_sheet_style']}. The character: {safe(c.get('look'), names)}. No text, no logos."}
             for cid, c in cast.items()]
    clips, stills, story = [], [], []
    for i, b in enumerate(s.get('beats') or []):
        actors = [c for c in b.get('cast') or [] if str(c.get('id')) in cast]
        scene = safe(b.get('scene'), names)
        if actors:
            who = ' '.join(f"The {re.sub(r'^(the|a|an)\s+', '', safe(cast[str(a['id'])].get('role') or 'player', names), flags=re.I)} "
                           f"from the reference {safe(a.get('action'), names)}." for a in actors)
            prompt = (f"{S['flow_style']}. {scene}. {who} Lively, readable acting, a moving camera. Vertical 9:16. "
                      'Sound: the place and the action only — no speech, no music, no text on screen.')
            clips.append({'beat': i, 'file': f'clip-{len(clips)}.mp4', 'ingredients': [str(a['id']) for a in actors],
                          'model': 'Omni Flash', 'aspect': '9:16', 'seconds': CLIP_SECONDS, 'credits': CLIP_CREDITS, 'prompt': prompt})
            story.append({'say': b['say'], 'clip': len(clips) - 1, **({'stamp': b['stamp']} if b.get('stamp') else {})})
        else:
            stills.append({'beat': i, 'file': f'still-{len(stills)}.jpg', 'model': 'Nano Banana', 'aspect': '9:16', 'credits': 0,
                           'prompt': f"{S['flow_still_style']}. {scene}. No people in focus, no text, no letters, no logos."})
            story.append({'say': b['say'], 'still': len(stills) - 1, **({'stamp': b['stamp']} if b.get('stamp') else {})})
    credits = sum(c['credits'] for c in clips)
    steps = ['Open Google Flow → New project.',
             'Image · 9:16 · Nano Banana: make each character sheet below (free).',
             'Video · Ingredients · 9:16 · Omni Flash · 720p · 6 s · x1: for each clip add its characters as ingredients, paste '
             'the prompt, generate.',
             'Image · 9:16: make each still.',
             'In the studio, upload each clip and still into its slot, then press "Edit the Short".']
    return {'series': 'short', 'tag': S['tag'], 'title': s.get('title'), 'characters': chars, 'clips': clips, 'stills': stills,
            'credits': credits, 'steps': steps, 'story': {'tag': S['tag'], 'beats': story}}


def markdown(pack: dict, script: dict) -> str:
    out = [f"# {pack.get('title')}", '', f"Hook law: {script.get('hook_law')}", '', '## The narration', '', script.get('narration', ''), '',
           f"## Google Flow — {len(pack['clips'])} clips · {pack['credits']} credits", '']
    out += [f'{i + 1}. {s}' for i, s in enumerate(pack['steps'])]
    out += ['', '### Character sheets (Image · Nano Banana · 9:16)', '']
    for c in pack['characters']:
        out += [f"**{c['id']}** — {c['role']}", '', '```', c['prompt'], '```', '']
    out += ['### Clips (Video · Ingredients · Omni Flash · 9:16 · 6 s)', '']
    for c in pack['clips']:
        out += [f"**{c['file']}** — beat {c['beat'] + 1} · ingredients: {', '.join(c['ingredients'])}", '', '```', c['prompt'], '```', '']
    if pack['stills']:
        out += ['### Stills (Image · Nano Banana · 9:16)', '']
        for c in pack['stills']:
            out += [f"**{c['file']}** — beat {c['beat'] + 1}", '', '```', c['prompt'], '```', '']
    return '\n'.join(out)
