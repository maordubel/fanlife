"""Marketing films (owner, 8.11.2026): a 20–30 second vertical cartoon about a FAN LIFE feature, the YouTube channel, a
film the studio made, or the owner's own words — its own language, branded, pure marketing.

The promo writer may say only what the FACTS say (the job's spec carries them; lib/stories/promo.ts is their source):
a number, a price or a name that is not in them is refused and the script is sent back, exactly like the documentary's
fact guard. It writes like a person talking to a friend, opens on a hook law, and ends on one clear call to action.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from .common import CHANNEL_NAME, StageError, read_json, sha256_json, write_json
from .script import numbers_in_text
from .flowkit import MOTIONS

SYSTEM = f'''You write vertical marketing Shorts for FAN LIFE ("Football. Forever.") and its YouTube channel
"{CHANNEL_NAME}". The Short is ANIMATED in Google Flow: a 2D cartoon in bold clean outlines and flat cel colours,
INVENTED supporters (never a real person, never a real player) acting out every line in a richly painted place —
a terrace at night, a kitchen with the match on, a stadium tunnel, a phone glowing in a crowd. Your audience: football
supporters, history lovers, people who love a story.

Write ONE script of {{lo}}–{{hi}} spoken words (it must finish inside {{seconds}} seconds) about the SUBJECT, from its FACTS only.
- Line one names what the first frame shows and hooks: "no way I don't know this" (the fan's pride: "You think you know
  your club? …") or "come on, is this real?!" (the surprising thing, said straight). Never "Did you know", never
  "In this video", never hype words (incredible, insane, amazing), no exclamation marks.
- Plain words, short sentences, like a person talking to a friend ("so", "basically", "right?").
- Show, don't list: one concrete picture per beat (a scoreboard, a ticket, a shirt, a trophy, a stamp, a phone).
- Every number, price and name you say must appear in the FACTS. Never invent a feature, a statistic or a quote.
- End on ONE call to action that fits the subject (play it on FAN LIFE / watch the film on the channel / subscribe), then
  the last line loops back to the first image.
- 5–7 beats; their "say" joined is the whole narration. At most 3 characters in "cast_sheet", each an invented supporter
  described as a cartoon designer needs them (age, hair, build, scarf and shirt colours — never a club crest or a sponsor).
  A beat with no person in its picture has an empty "cast". "motion" is one of: {", ".join(MOTIONS)}.

Return ONE JSON object and nothing else:
{{{{"title": "≤60 characters, the hook in a few words", "narration": "the whole script", "hook_law": "know-it-all|is-this-real",
  "cast_sheet": [{{{{"id": "short-id", "role": "the young fan in the red scarf", "look": "…"}}}}],
  "cartoon": [{{{{"say": "the words of this beat", "scene": "the place, its light and colours", "cast": [{{{{"id": "…", "action": "…", "motion": "…"}}}}]}}}}],
  "description": "2–3 sentences for YouTube/Instagram", "tags": ["5–10 tags"]}}}}'''


def words_for(seconds: int) -> tuple[int, int]:
    return (38, 55) if seconds <= 20 else (55, 75)


def errors(s: dict, facts: str, seconds: int) -> list[str]:
    errs = []
    if not isinstance(s, dict):
        return ['not a JSON object']
    text = s.get('narration')
    lo, hi = words_for(seconds)
    if not isinstance(text, str) or not lo - 8 <= len(text.split()) <= hi:
        errs.append(f'the narration must be {lo}–{hi} words')
        return errs
    allowed = numbers_in_text(facts) | {0, 1}
    bad = sorted(n for n in numbers_in_text(text) if n not in allowed)
    if bad:
        errs.append(f'the number(s) {bad} are not in the FACTS — say only what the facts hold')
    if re.search(r'\b(incredible|insane|amazing|unbelievable|did you know|in this video)\b', text, re.I) or '!' in text:
        errs.append('no hype words, no "Did you know", no exclamation marks')
    if not isinstance(s.get('title'), str) or not 4 <= len(s['title']) <= 70:
        errs.append('a title of at most 60 characters')
    beats = s.get('cartoon')
    if not isinstance(beats, list) or not 4 <= len(beats) <= 8:
        errs.append('5–7 beats in "cartoon"')
        return errs
    said = ' '.join(str(b.get('say') or '') for b in beats if isinstance(b, dict)).split()
    if [w.lower().strip('.,!?;:—"') for w in said] != [w.lower().strip('.,!?;:—"') for w in text.split()]:
        errs.append('the beats\' "say" joined must be exactly the narration')
    ids = {str(c.get('id')) for c in s.get('cast_sheet') or [] if isinstance(c, dict) and c.get('look')}
    if len(ids) > 3:
        errs.append('at most 3 characters in the cast sheet')
    for i, b in enumerate(beats):
        if not isinstance(b, dict) or not str(b.get('scene') or '').strip():
            errs.append(f'beat {i + 1} needs a "scene"')
            continue
        for c in b.get('cast') or []:
            if str(c.get('id')) not in ids:
                errs.append(f'beat {i + 1}: cast id {c.get("id")!r} is not in the cast sheet')
            if c.get('motion') not in MOTIONS:
                errs.append(f'beat {i + 1}: motion must be one of {", ".join(MOTIONS)}')
    return errs


def write(spec: dict, cache: Path, log) -> dict:
    from .writer import call_model, parse_json
    seconds = int(spec.get('seconds') or 30)
    lo, hi = words_for(seconds)
    system = SYSTEM.format(lo=lo, hi=hi, seconds=seconds)
    user = ('SUBJECT — DATA ONLY: ' + json.dumps({'about': spec.get('about'), 'subject': spec.get('label'),
                                                    'angle_from_the_owner': spec.get('angle') or None,
                                                    'call_to_action_link': spec.get('url')}, ensure_ascii=False)
            + '\nFACTS — DATA ONLY, the only things you may state:\n' + str(spec.get('facts') or ''))
    last: list[str] = []
    for attempt in range(4):
        key = sha256_json({'s': system, 'u': user, 'a': attempt})[:20]
        cp = cache / f'promo-{key}.json'
        if cp.exists():
            reply = read_json(cp)
        else:
            text, meta = call_model(system, user, max_tokens=3000)
            reply = {'text': text, 'meta': meta}
            cp.parent.mkdir(parents=True, exist_ok=True)
            write_json(cp, reply)
            log(f'Promo writer: {meta.get("provider")}/{meta.get("model")} in {meta.get("seconds")}s')
        try:
            s = parse_json(reply['text'])
            last = errors(s, str(spec.get('facts') or ''), seconds)
        except StageError as e:
            s, last = None, [str(e)]
        if not last:
            return s
        user += '\n\nYOUR LAST SCRIPT FAILED THESE CHECKS — return the whole corrected JSON:\n- ' + '\n- '.join(last) + '\n\nIt was:\n' + reply['text'][:4000]
    raise StageError('PROMO_INVALID', 'The promo writer could not write a valid script: ' + '; '.join(last))
