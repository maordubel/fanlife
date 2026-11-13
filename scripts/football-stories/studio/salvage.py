"""The writer's last resort, with no model call: a script that still fails its checks is repaired in code, honestly.

Why (13.11.2026, job 6f9c3de6, Celtic 1984/85): deep research was skipped, the archive gave 6 claims, the brief asked
for ten minutes, and three directors spent five model rounds each on "number 19 is not in the cited claims" and "tells a
result against Gent but the beat cites none of those matches". No film was made. The rule since (docs/rules/
writer-salvage.md): the studio always makes a film, and never says what it cannot prove.

What a salvage may do — and nothing else:
  · RE-CITE: add a claim the research already holds to a beat, when exactly one claim carries the number (or is the
    match against the opponent the line names) and the sentence itself names that claim's subject;
  · REMOVE: cut the sentence that carries what no cited claim proves; drop a beat left empty; drop an emptied chapter;
    merge a chapter whose cliff edge was cut into the next one; merge a third illustration in a row into the one before;
  · COPY: speak hook option 1 (already checked against its own evidence) as the opening, word for word.
It never adds a fact, a number or a name. What it cannot repair that way stays a failure of that script.

A salvaged script is accepted only when the whole validator passes AND it still stands as a film (FLOOR_*). Its length
is whatever the proven narration carries: the film is made shorter, never padded.
"""
from __future__ import annotations

import copy
import re

from .script import (FILM_WORDS_PER_MINUTE, NAME_STOP, RESULT_CUES, TABLE_TALK, WEATHER, _fold, _name_words, fact_guard,
                     identity_guard, knockout_guard, numbers_in_text, numbers_in_value, scorelines, story_of, target_words)

# ── the floor: below this a salvaged script is not a film (each number is a decision, change it here only) ────────────
FLOOR_MINUTES = 1.5    # the shortest film the studio makes from a salvage (≈180 words of narration)
FLOOR_BEATS = 6        # a cold open, a build-up, a turn, a result and a close need at least this many pictures
FLOOR_KEPT = 0.4       # a script that lost more than 60% of its narration is no longer that director's film
MIN_BEAT_WORDS = 4     # a beat left with fewer words than this cannot hold a picture: it is dropped
LONG_TOLERANCE = 1.25  # a script up to a quarter over the asked length is filmed at its own length (writer._length_only)
EARLY_LOSS = 0.10      # between model rounds a salvage is taken at once only if it cost at most this share of the words…
ROUNDS = 10            # …and the repair loop itself always ends

NEUTRAL = {'type': 'illustration', 'art': 'terrace-crowd', 'caption': ''}
_SPLIT = re.compile(r'(?<=[.!?…])\s+')
_BEAT = re.compile(r'^Chapter (\d+) beat (\d+): (.*)$', re.S)
_TEXT_KEYS = ('headline', 'kicker', 'title', 'subtitle', 'heading', 'text', 'label', 'value', 'caption', 'who', 'role', 'outlet', 'standfirst')


def sentences(text: str) -> list[str]:
    return [x for x in _SPLIT.split((text or '').strip()) if x.strip()]


def narration_words(script: dict) -> int:
    return sum(len(str(b.get('narration') or '').split()) for ch in script.get('chapters') or [] if isinstance(ch, dict)
               for b in ch.get('beats') or [] if isinstance(b, dict))


def beat_count(script: dict) -> int:
    return sum(1 for ch in script.get('chapters') or [] if isinstance(ch, dict) for b in ch.get('beats') or []
               if isinstance(b, dict) and str(b.get('narration') or '').strip())


def fit_minutes(script: dict, asked: float) -> float:
    """The film's real length, read off the script: the asked length when the narration fits it, otherwise what the
    words carry (shorter, or up to LONG_TOLERANCE longer). Never a reason to pad."""
    words = narration_words(script)
    lo, hi = target_words(asked)
    if lo <= words <= hi or words > hi * LONG_TOLERANCE or not words:
        return asked
    return round(words / FILM_WORDS_PER_MINUTE, 2)


def _core(name: str) -> str:
    return ' '.join(w for w in _fold(name).split() if w not in NAME_STOP) or _fold(name).strip()


def _names(text: str, name: str) -> bool:
    core = _core(name)
    return bool(core) and f' {core} ' in f' {" ".join(_fold(text).split())} '


def _related(claim: dict, text: str, ledger: dict) -> bool:
    """Does `text` itself name what this claim is about? A match: its opponent. Anything else: one of its own names
    (never the film's club, which every line names)."""
    fact = claim.get('fact') or {}
    if fact.get('kind') == 'match':
        return _names(text, str(fact.get('opponent') or ''))
    own = _name_words({'club': ledger.get('club_name')})
    words = set(_fold(text).split())
    return bool((_name_words(fact) - own) & words)


def _cites(beat: dict) -> list[str]:
    v = beat.get('visual') if isinstance(beat.get('visual'), dict) else {}
    out = [c for c in beat.get('claim_ids') or [] if isinstance(c, str)]
    out += [v['claim']] if isinstance(v.get('claim'), str) else []
    out += [c for c in v.get('claims') or [] if isinstance(c, str)]
    out += [c for c in v.get('mark') or [] if isinstance(c, str)] if isinstance(v.get('mark'), list) else []
    return out


def _claim_for_number(n: int, text: str, cited: list[str], ledger: dict) -> str | None:
    """The ONE researched claim that carries `n` and that `text` names — or None (none, or more than one: no guess)."""
    hits = [c['id'] for c in ledger.get('claims') or [] if isinstance(c.get('fact'), dict) and c['id'] not in cited
            and n in numbers_in_value(c['fact']) and _related(c, text, ledger)]
    return hits[0] if len(hits) == 1 else None


def _match_for_opponent(opp: str, text: str, ledger: dict) -> str | None:
    """The match against `opp` this beat means: the only one in the research, or the only one whose final score the
    narration says. Two legs and no score said → None."""
    ms = [c for c in ledger.get('claims') or [] if (c.get('fact') or {}).get('kind') == 'match' and c['fact'].get('opponent') == opp]
    if len(ms) == 1:
        return ms[0]['id']
    said = set(scorelines(text))
    hits = [c['id'] for c in ms if {(c['fact'].get('club_goals'), c['fact'].get('opponent_goals')),
                                    (c['fact'].get('opponent_goals'), c['fact'].get('club_goals'))} & said]
    return hits[0] if len(hits) == 1 else None


def _match_for_score(pair: tuple, text: str, cited: list[str], ledger: dict) -> str | None:
    hits = [c['id'] for c in ledger.get('claims') or [] if (c.get('fact') or {}).get('kind') == 'match' and c['id'] not in cited
            and pair in ((c['fact'].get('club_goals'), c['fact'].get('opponent_goals')), (c['fact'].get('opponent_goals'), c['fact'].get('club_goals')))
            and _names(text, str(c['fact'].get('opponent') or ''))]
    return hits[0] if len(hits) == 1 else None


class _Tally:
    def __init__(self):
        self.removed = self.recited = self.dropped = self.merged = 0
        self.hook = False

    def as_dict(self) -> dict:
        return {'removed_sentences': self.removed, 'recited': self.recited, 'dropped_beats': self.dropped,
                'merged': self.merged, 'hook_copied': self.hook}


def _cut(beat: dict, bad, tally: _Tally) -> bool:
    """Remove from the beat's narration every sentence `bad(sentence)` names. → whether anything was cut."""
    keep, cut = [], 0
    for sent in sentences(str(beat.get('narration') or '')):
        if bad(sent):
            cut += 1
        else:
            keep.append(sent)
    if cut:
        beat['narration'] = ' '.join(keep)
        tally.removed += cut
    return bool(cut)


def _cite(beat: dict, cid: str, tally: _Tally) -> bool:
    ids = beat.get('claim_ids') if isinstance(beat.get('claim_ids'), list) else []
    if cid in ids:
        return False
    beat['claim_ids'] = [*ids, cid]
    tally.recited += 1
    return True


def _repair_beat(beat: dict, msgs: list[str], ledger: dict, story: dict, tally: _Tally) -> bool:
    changed = False
    v = beat.get('visual') if isinstance(beat.get('visual'), dict) else {}
    def unproven(n: int, piece: str) -> bool:   # asked again each time: a re-cite earlier in this round may have proven it
        return any(e.startswith(f'number {n} ') for e in fact_guard(piece, ledger, _cites(beat)))
    for msg in sorted(msgs, key=lambda x: '[director rule 1]' not in x):   # the match a line means is cited before its numbers are judged
        text = str(beat.get('narration') or '')
        cited = _cites(beat)
        if m := re.match(r'number (\d+) is not in the cited claims', msg):
            n = int(m.group(1))
            if not any(unproven(n, x) for x in [text, beat.get('slug'), *(v.get(k) for k in _TEXT_KEYS), *(v.get('lines') or [])] if isinstance(x, str)):
                continue
            if isinstance(beat.get('slug'), str) and n in numbers_in_text(beat['slug']):
                beat.pop('slug'); changed = True
            if v.get('type') == 'trailer' and isinstance(v.get('lines'), list) and any(isinstance(x, str) and n in numbers_in_text(x) for x in v['lines']):
                left = [x for x in v['lines'] if not (isinstance(x, str) and n in numbers_in_text(x))]
                if left:
                    v['lines'] = left
                else:
                    beat['visual'] = v = dict(NEUTRAL)
                changed = True
            for k in _TEXT_KEYS:
                if isinstance(v.get(k), str) and n in numbers_in_text(v[k]) and not (v.get('type'), k) in (('quote', 'text'), ('press', 'headline')):
                    if k == 'caption':
                        v['caption'] = ''
                    else:   # a card whose own words state it: the card goes, a picture of the terrace stays
                        beat['visual'] = v = dict(NEUTRAL)
                    changed = True
            for sent in [x for x in sentences(text) if unproven(n, x)]:
                cid = _claim_for_number(n, sent, _cites(beat), ledger)
                if cid:
                    return _cite(beat, cid, tally) or changed   # new evidence: the validator judges the beat again before anything is cut
                changed |= _cut(beat, lambda x, s_=sent: x == s_, tally)
        elif m := re.search(r'\[director rule 1\] the narration tells a result against (.+?) but the beat cites none', msg):
            opp = m.group(1)
            cid = _match_for_opponent(opp, text, ledger)
            if cid:
                return _cite(beat, cid, tally) or changed
            if not _cut(beat, lambda x: _names(x, opp) and bool(RESULT_CUES.search(x)), tally):
                changed |= _cut(beat, lambda x: _names(x, opp), tally)   # the name and the result word sat in two sentences
            else:
                changed = True
        elif m := re.search(r'\[director rule 1\] the scoreline (\d+)–(\d+) is not the score', msg):
            pair = (int(m.group(1)), int(m.group(2)))
            cid = _match_for_score(pair, text, cited, ledger)
            if cid:
                return _cite(beat, cid, tally) or changed
            changed |= _cut(beat, lambda x: pair in scorelines(x), tally)
        elif '[no position]' in msg:
            changed |= _cut(beat, lambda x: bool(TABLE_TALK.search(x)), tally)
        elif '[no invented weather]' in msg:
            changed |= _cut(beat, lambda x: bool(WEATHER.search(x)), tally)
        elif 'qualification contradicts' in msg:
            changed |= _cut(beat, lambda x: bool(knockout_guard(x, ledger, cited, story)), tally)
        elif 'scarf attributed' in msg:
            changed |= _cut(beat, lambda x: bool(identity_guard(x, ledger)), tally)
        elif 'cites an unknown claim' in msg:
            known = {c['id'] for c in ledger.get('claims') or []} | {f'summary:{k}' for k in (ledger.get('summary') or {}).get('by_competition', {})} | {'story'}
            ids = [c for c in beat.get('claim_ids') or [] if isinstance(c, str) and c in known]
            if ids != beat.get('claim_ids'):
                beat['claim_ids'] = ids; changed = True
        elif '[director rule 4] the same camera move' in msg and 'camera' in beat:
            beat.pop('camera'); changed = True
    return changed


def _speak_hook(t: dict, ledger: dict, tally: _Tally) -> bool:
    """Hook option 1 becomes the opening narration, word for word, across the first beat(s) — exactly what
    writer.hook_option_errors compares. Only an option that passes its own evidence checks is copied; the beats that
    speak it also cite its evidence. Nothing is written that the writer did not already offer."""
    from .writer import hook_option_errors
    opts = t.get('hook_options')
    if not isinstance(opts, list) or not opts or not isinstance(opts[0], dict) or not isinstance(opts[0].get('text'), str):
        return False
    if any(e.startswith('Hook option 1:') for e in hook_option_errors(t, ledger)):
        return False
    new = sentences(opts[0]['text'])
    first = next((ch for ch in t.get('chapters') or [] if isinstance(ch, dict) and ch.get('beats')), None)
    beats = [b for b in (first or {}).get('beats') or [] if isinstance(b, dict) and str(b.get('narration') or '').strip()]
    if not new or not beats:
        return False
    want, got, k = len(opts[0]['text'].split()), 0, 0
    while k < min(len(beats), len(new), 3) and got < want * 0.75:   # the beats the writer's own (paraphrased) opening took
        got += len(beats[k]['narration'].split())
        k += 1
    per, extra = divmod(len(new), k)
    i = 0
    known = {c['id'] for c in ledger.get('claims') or []} | {f'summary:{x}' for x in (ledger.get('summary') or {}).get('by_competition', {})} | {'story'}
    for j, b in enumerate(beats[:k]):   # sentences dealt in order, the spare ones to the first beats (as hook_judge.apply)
        take = per + (1 if j < extra else 0)
        b['narration'] = ' '.join(new[i:i + take])
        b['claim_ids'] = list(dict.fromkeys([*(c for c in b.get('claim_ids') or [] if isinstance(c, str)),
                                             *(c for c in opts[0].get('claim_ids') or [] if c in known)]))
        i += take
    tally.hook = True
    return True


def _repair_hook_option(t: dict, i: int, msg: str, ledger: dict, tally: _Tally) -> bool:
    opts = t.get('hook_options') or []
    if not (0 <= i < len(opts)) or not isinstance(opts[i], dict) or not isinstance(opts[i].get('text'), str):
        return False
    m = re.match(r'number (\d+) is not in the cited claims', msg)
    if not m:
        return False
    n, o = int(m.group(1)), opts[i]
    ids = [c for c in o.get('claim_ids') or [] if isinstance(c, str)]
    for sent in [x for x in sentences(o['text']) if n in numbers_in_text(x)]:
        cid = _claim_for_number(n, sent, ids, ledger)
        if cid:
            o['claim_ids'] = ids = [*ids, cid]
            tally.recited += 1
            return True
        left = [x for x in sentences(o['text']) if x != sent]
        if len(left) >= 3 and 35 <= len(' '.join(left).split()) <= 60:   # the option still stands as an opening
            o['text'] = ' '.join(left)
            tally.removed += 1
            return True
    return False


def _step(t: dict, errs: list[str], ledger: dict, story: dict, tally: _Tally) -> bool:
    """One round of repairs for the errors the validator named. → whether the script changed."""
    changed = False
    chapters = [ch for ch in t.get('chapters') or [] if isinstance(ch, dict)]
    at = {(ci, bi): b for ci, ch in enumerate(t.get('chapters') or []) if isinstance(ch, dict)
          for bi, b in enumerate(ch.get('beats') or []) if isinstance(b, dict)}
    per_beat: dict = {}
    for e in errs:
        if m := _BEAT.match(e):
            per_beat.setdefault((int(m.group(1)) - 1, int(m.group(2)) - 1), []).append(m.group(3))
    merge_into_prev = []
    for key, msgs in per_beat.items():
        b = at.get(key)
        if b is None:
            continue
        changed |= _repair_beat(b, msgs, ledger, story, tally)
        if any('[director rule 4] a third "illustration"' in x for x in msgs):
            merge_into_prev.append(key)
    for ci, bi in sorted(merge_into_prev, reverse=True):   # three pictures in a row: the third is told under the second
        beats = t['chapters'][ci]['beats']
        prev = at.get((ci, bi - 1)) if bi > 0 else None
        if prev is None or (prev.get('visual') or {}).get('type') != 'illustration':
            continue
        b = beats[bi]
        prev['narration'] = f'{prev.get("narration") or ""} {b.get("narration") or ""}'.strip()
        prev['claim_ids'] = list(dict.fromkeys([*(prev.get('claim_ids') or []), *(b.get('claim_ids') or [])]))
        del beats[bi]
        tally.merged += 1
        changed = True
    for i, e in enumerate(errs):
        if m := re.match(r'Hook option (\d+): (.*)$', e):
            changed |= _repair_hook_option(t, int(m.group(1)) - 1, m.group(2), ledger, tally)
    shorts = t.get('shorts')
    if isinstance(shorts, list):   # a Short that fails goes, while two are left (the film needs two)
        bad = sorted({int(m.group(1)) - 1 for e in errs if (m := re.match(r'Short (\d+):', e))}, reverse=True)
        for i in bad:
            if len(shorts) > 2 and 0 <= i < len(shorts):
                del shorts[i]; changed = True
    if any(e.startswith('Your chosen title is the same') for e in errs) and isinstance(t.get('title_candidates'), list) and isinstance(t.get('selected'), int):
        t['selected'] = (t['selected'] + 1) % max(1, len(t['title_candidates'])); changed = True
    # a beat left with nothing to say is dropped; an emptied chapter goes with it
    for ch in chapters:
        beats = ch.get('beats') or []
        keep = [b for b in beats if not isinstance(b, dict) or (b.get('visual') or {}).get('type') in ('follow', 'end')
                or len(str(b.get('narration') or '').split()) >= MIN_BEAT_WORDS]
        if len(keep) != len(beats):
            tally.dropped += len(beats) - len(keep)
            ch['beats'] = keep
            changed = True
    full = [ch for ch in t.get('chapters') or [] if not isinstance(ch, dict) or ch.get('beats')]
    if len(full) != len(t.get('chapters') or []) and full:
        t['chapters'] = full
        changed = True
    if not changed:   # only once the lines stand: a chapter whose cliff edge was cut runs on into the next
        for e in errs:
            if m := re.match(r'Chapter (\d+): \[director rule 5\]', e):
                ci = int(m.group(1)) - 1
                chs = t.get('chapters') or []
                if 0 <= ci < len(chs) - 1:
                    chs[ci]['beats'] = [*chs[ci]['beats'], *chs[ci + 1]['beats']]
                    del chs[ci + 1]
                    tally.merged += 1
                    return True
    return changed


def stands(script: dict, words_before: int, minutes: float, asked: float | None = None, beats_before: int | None = None) -> str | None:
    """The floor. None when the salvaged script is still a film; otherwise the plain reason it is not. A film that was
    asked short to begin with (a one-minute brief, a script of five beats) is held to what it was asked, not to more."""
    words, beats = narration_words(script), beat_count(script)
    least = min(FLOOR_MINUTES, asked * 0.9) if asked else FLOOR_MINUTES
    need = min(FLOOR_BEATS, beats_before) if beats_before else FLOOR_BEATS
    if minutes < least:
        return f'only {words} proven words are left (about {minutes:.1f} min; the shortest film is {least:g} min)'
    if beats < need:
        return f'only {beats} beats are left (a film needs {need})'
    if words_before and words / words_before < FLOOR_KEPT:
        return f'only {round(100 * words / words_before)}% of the narration could be proven'
    return None


def salvage(script: dict, ledger: dict, check_at, asked: float) -> tuple[dict | None, dict]:
    """Repair `script` in code until `check_at(script, minutes) -> [errors]` is empty, or nothing more can be repaired
    honestly. → (the salvaged script with '_salvage' and '_minutes' set, its report) or (None, {'left': [...errors],
    'why': …}). The given script is never changed."""
    from .writer import autofix, repair
    t = copy.deepcopy(script)
    tally = _Tally()
    before = narration_words(script)
    story = story_of(ledger) if any((c.get('fact') or {}).get('kind') == 'match' for c in ledger.get('claims') or []) else {}
    errs: list[str] = []
    for _ in range(ROUNDS):
        t = repair(t)
        minutes = fit_minutes(t, asked)
        errs = check_at(t, minutes)
        if not errs:
            break
        fixed = autofix(t, errs, ledger)   # the optional devices (a slug, a motif, a trailer line) and the hook card
        if fixed is not None and len(check_at(repair(fixed), fit_minutes(fixed, asked))) < len(errs):
            t = fixed
            continue
        if _step(t, errs, ledger, story, tally):
            continue
        if any(e.startswith('Use hook option 1 verbatim') for e in errs) and not tally.hook and _speak_hook(t, ledger, tally):
            continue
        break
    else:
        t = repair(t)
        errs = check_at(t, fit_minutes(t, asked))
    minutes = fit_minutes(t, asked)
    if errs:
        return None, {'left': errs, 'why': f'{len(errs)} check(s) no honest repair could meet'}
    why = stands(t, before, minutes, asked, beat_count(script))
    if why:
        return None, {'left': [], 'why': why}
    words = narration_words(t)
    report = {**tally.as_dict(), 'words_before': before, 'words': words, 'minutes': minutes,
              'lost': round(1 - words / before, 3) if before else 0.0}
    t['_salvage'], t['_minutes'] = report, minutes
    return t, report


def line(name: str, report: dict) -> str:
    return (f'Writer: salvaged {name} script — removed {report["removed_sentences"]} sentence(s), re-cited {report["recited"]}, '
            f'dropped {report["dropped_beats"]} beat(s); film length now ~{report["minutes"]:g} min')
