"""The score follows the story (owner, 9.11.2026: "the score must change with the story and the match — never show the
final result in advance. Build tension, story, plot.").

One pass over the film, in film order, before any panel is drawn. For every match it keeps what the VIEWER knows:
the running score the narrator (or a goal card) has reached, and whether the result has been told yet. Each shot is
annotated with `score_story[claim] = {'before': (h, a), 'told_before': bool, 'told_at': float | None}`:

  * `before`     — the score the viewer knows when the shot starts (0–0 until a goal or a spoken score moves it)
  * `told_before`— the result was already told earlier in the film (a later card may show it from the start)
  * `told_at`    — the moment, in this shot, the narrator tells the result (a final scoreline, "won", "full time"…)
  * `last`       — no later shot is about this match (a one-card result in a season story, or the story's end)

A result card never shows the final score before `told_at`; until then it is a live scoreboard at `before`. The one
exception is the LAST card about a match: there the card itself tells the result (a season's results column, the
end of a match story), so the final lands on it.
"""
from __future__ import annotations

import re

RESULT_WORDS = re.compile(r"\b(ended|ends|finished|final whistle|full[- ]time|won|wins|win|beat|beaten|lost|loses|drew|draw|"
                          r"defeated|defeat|victory|triumph|hammered|thrashed|clinched|sealed)\b", re.I)


def _match(ledger: dict, cid: str | None) -> dict | None:
    for c in ledger.get('claims') or []:
        if c.get('id') == cid and (c.get('fact') or {}).get('kind') == 'match':
            return c['fact']
    return None


def word_time(shot: dict, pattern: re.Pattern) -> float | None:
    """When (shot-local seconds) the narrator says the first word the pattern matches, on the captions' clock."""
    words = shot.get('words') or []
    if shot.get('voice_at') is None or not words:
        return None
    lead = shot['voice_at'] - shot['start']
    text = ' '.join(w['w'] for w in words)
    m = pattern.search(text)
    if not m:
        return None
    upto = len(text[:m.start()].split())
    return lead + words[min(upto, len(words) - 1)]['start']


def annotate(plan: dict, ledger: dict) -> None:
    from .director import goal_scores
    from .script import match_score_reveals
    known: dict[str, tuple[int, int]] = {}
    told: set[str] = set()
    last = {((s.get('visual') or {}).get('claim')): s['n'] for s in plan.get('shots') or []}
    for s in plan.get('shots') or []:
        v = s.get('visual') or {}
        cid = v.get('claim')
        f = _match(ledger, cid)
        if not f:
            continue
        final = (f['score_home'], f['score_away'])
        before = known.get(cid, (0, 0))
        reveals = match_score_reveals(ledger, s, f)
        told_at = next((at for at, sc in reveals if sc == final), None)
        said = word_time(s, RESULT_WORDS)
        if told_at is None and said is not None and v.get('type') != 'goal':
            told_at = said
        if cid in told and told_at is None:
            told_at = 0.0
        s.setdefault('score_story', {})[cid] = {'before': before, 'told_before': cid in told, 'told_at': told_at,
                                                'last': last.get(cid) == s['n']}
        if reveals:
            known[cid] = reveals[-1][1]
        if v.get('type') == 'goal':
            g = goal_scores(ledger, f).get(int(v.get('scorer') or 0))
            if g:
                known[cid] = g[1]
        if told_at is not None:
            told.add(cid)
            known[cid] = final


def state(shot: dict, cid: str | None) -> dict:
    return (shot.get('score_story') or {}).get(cid or '') or {'before': (0, 0), 'told_before': False, 'told_at': None, 'last': True}
