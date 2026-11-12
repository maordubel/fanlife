"""The director's score sheet (owner, 12.11.2026: "Directing that is interesting, viral, sweeping, dramatic. Make
mini-dramas. Create tension. Create joy and happiness. Excitement.").

Until now each craft guessed the feeling of a beat for itself: the editor from the visual type, the mix from a `mood`
word, the camera from nothing. ONE sheet now says, for every beat, an EMOTION and an INTENSITY (0–1), and the whole
pipeline reads it:

    tension · dread · release · joy · pride · grief · defiance · wonder · humour

It is derived, never asked of a model: from what the beat IS (a goal is a release; a scoreboard is the joy, the grief or
the tension of its recorded outcome; a trailer card is tension), from the MARKERS the writer already emits in the line —
stakes, a turn, a reversal, a scoreline, time-pressure words, a question — from the mood the edit already read off the
claims, and from where the beat stands in its chapter (a chapter climbs) and in the film (the last fifth is the climax).
The same script gives the same sheet on every machine.

What follows the sheet (each in its own module; this file only writes the sheet and the cues derived from it):

    camera        the move and how far it travels                       studio/camera.choose · docu/editor.direct
    shot length   short looks as tension rises, ONE held look before the turn, a burst of quick cuts at the release
                                                                        docu/editor.pace
    transition    grief and dread fade in, a release is a hard cut      docu/editor.transition
    music         the section's mood, a drop to near-silence before the turn, the lift on the release
                                                                        attach() → audio.mood_sections, audio.sheet_envelope
    narration     the held breath is spoken as a hush, the release excited (where the voice supports a delivery)
                                                                        direct_script() → voice.delivery_of
    colour        cooler and thinner for dread and grief, the club's colour blooming on joy — a slow grade, never a flash
                                                                        docu/editor.direct → build.Film.image (GRADES)
    devices       a match clock when the line is under time pressure, a scoreline that changes ON the cut
                                                                        docu/plan.Adapter.speak · build.Film.clockdev

`arc()` reads the film's shape off the sheet: the question planted in the opening and where it is paid off, the tension
passages and the joy passages. The gate reports it (qa.experience 'the arc')."""
from __future__ import annotations

import re

from .script import RESULT_CUES, TURN_WORDS

EMOTIONS = ('tension', 'dread', 'release', 'joy', 'pride', 'grief', 'defiance', 'wonder', 'humour')
# What a beat is, before a word is read: (emotion, base intensity).
BY_TYPE = {'goal': ('release', 0.85), 'trailer': ('tension', 0.75), 'open': ('tension', 0.65), 'turning': ('tension', 0.6),
           'matchday': ('tension', 0.5), 'versus': ('tension', 0.55), 'ticket': ('tension', 0.45), 'race': ('tension', 0.5),
           'chapter': ('wonder', 0.3), 'map': ('wonder', 0.45), 'table': ('pride', 0.45), 'record': ('pride', 0.5), 'stat': ('pride', 0.5),
           'form': ('pride', 0.45), 'run': ('pride', 0.5), 'timeline': ('pride', 0.4), 'quote': ('pride', 0.5), 'press': ('pride', 0.4),
           'fact': ('wonder', 0.35), 'follow': ('pride', 0.25), 'end': ('pride', 0.3), 'illustration': ('wonder', 0.35)}
OUTCOME = {'win': ('joy', 0.8), 'loss': ('grief', 0.75), 'draw': ('tension', 0.65)}
# The mood the edit already reads off the claims (edit.Editor.mood) is a vote, not an order.
MOOD_VOTE = {'tense': 'tension', 'build': 'tension', 'joy': 'joy', 'triumph': 'joy', 'anthem': 'pride', 'sad': 'grief'}
# The markers in the line. Each family is a list of whole words or phrases; a hit is a vote for its emotion.
MARKERS = {
    'tension': r'penalt\w+|shoot-?out|extra time|stoppage|injury time|last minute|final minute|minutes? (left|to go|gone|remaining)|still level|'
               r'on the line|at stake|had to|must win|needed|one (game|match|point|goal|kick|shoot-out) (from|away)|comes? down to|all or nothing|'
               r'decider|deadline|the clock|seconds|held (its|their) breath|nobody (knew|moved)|could they|would they|\bif\b',
    'dread': r'feared|fear|dread|nightmare|collapse\w*|threat\w*|relegation|the drop|doomed|slipping|falling apart|it would not last|worse was|crisis|'
             r'bankrupt\w*|point deduction|silence fell',
    'release': r'at last|finally|and then|scores?!|the net|the roar|erupt\w*|explod\w*|the whistle|it was over|they had done it|through!',
    'joy': r'champions|celebrat\w+|lifted|the double|the title was|joy|danc\w+|sang all|party|parade|open-top|delirium|heaven|glory|never forget',
    'pride': r'record|unbeaten|history|first (time|ever|club)|the only|legend\w*|greatest|proud|pride|honou?rs?|ever since|to this day',
    'grief': r'lost|defeat\w*|beaten|heartbr\w+|tears|wept|mourn\w+|died|death|funeral|empty|gone|the end of|relegated|went down|never recovered',
    'defiance': r'refus\w+|never (gave|stopped|left)|still (singing|there|standing)|against (all|the odds|everything)|would not (go|bow|stop)|'
                r'stood|away end|outnumbered|underdogs?|nobody gave|written off|anyway|regardless|despite',
    'wonder': r'journey|far from home|for the first time|nobody had|no one had|imagine|a long way|miles|across|strange|unlikely|somehow|who would have',
    'humour': r'laugh\w*|joke\w*|of all people|believe it or not|comedy|farce|absurd|wrong bus|own goal off',
}
_RX = {k: re.compile(r'\b(?:' + v + r')', re.I) for k, v in MARKERS.items()}
# Time pressure: the line is told against a clock — the device is a match clock (when a minute is sourced).
CLOCK = re.compile(r'\b(minutes?|extra time|stoppage|injury time|the clock|seconds|ninetieth|last kick|final whistle|penalt\w+|shoot-?out)\b', re.I)
# The question an opening plants without a question mark.
PLANTS = re.compile(r'\?|comes? down to|one (game|match|point|goal|kick|shoot-out|win) (from|away)|nobody knew|no one knew|still level|'
                    r'all to play for|how (did|do|could)|what happened|would (it|they|he)\b|could (it|they|he)\b', re.I)
# A turn: the sentence that changes the story's direction. "Until" and "Then" count at the head of a sentence only —
# "they sang until morning" turns nothing.
TURN = re.compile(r'(?:^|[.!?…]\s+)(?:But then|Until|And then|Then|Instead)\b|\b(?:then came|it would not last|everything (?:changed|turned)|that was when)\b')
WEAK = {'illustration', 'fact'}
ORDER = {e: i for i, e in enumerate(EMOTIONS)}
OPENING_S = 15.0           # the hook's window (HOOK LAWS, writer.py): the question is planted inside it
OPENING_WORDS = 37         # … or inside the words a narrator says in that time (script.WORDS_PER_MINUTE 148), when no time is known
STRONG = 0.6               # a passage of tension or of joy is a beat at least this intense
# emotion → the mix's mood name (audio.MOODS). Only a STRONG beat overrides the mood the edit read off the claims.
MUSIC = {'tension': 'tense', 'dread': 'tense', 'release': 'triumph', 'joy': 'joy', 'grief': 'sad'}
HUSH_S, HUSH_DEPTH = 1.4, 0.12   # the drop before the turn: the music falls to near-silence for this long …
LIFT_S, LIFT_GAIN = 2.6, 1.35    # … and on the release it lifts by this much for this long (≈ +2.6 dB, eased both ways)
DELIVERY = {'breath': 'hush', 'release': 'excited'}


def read(beat: dict, pos: float = 0.0, film_pos: float = 0.0) -> dict:
    """One beat → {emotion, intensity, why, turn, clock, question}. `beat`: {type, narration, outcome?, mood?};
    `pos` is where it stands in its chapter (0–1), `film_pos` in the film."""
    t = beat.get('type') or 'illustration'
    text = beat.get('narration') or ''
    votes: dict[str, float] = {}
    why: list[str] = []
    emo, base = BY_TYPE.get(t, ('wonder', 0.35))
    if t in ('score', 'versus') and beat.get('outcome') in OUTCOME:
        emo, base = OUTCOME[beat['outcome']]
        why.append(f'the recorded {beat["outcome"]}')
    elif t == 'score':
        emo, base = 'tension', 0.5
    votes[emo] = 0.5 if t in WEAK else 1.0     # a plain picture beat says little by its type: its words decide
    why.insert(0, f'a {t} beat')
    if beat.get('mood') in MOOD_VOTE:
        votes[MOOD_VOTE[beat['mood']]] = votes.get(MOOD_VOTE[beat['mood']], 0) + 0.8
        why.append(f'mood {beat["mood"]}')
    hits = 0
    for e, rx in _RX.items():
        found = sorted({m.group(0).lower() for m in rx.finditer(text)})
        if found:
            votes[e] = votes.get(e, 0) + 0.6 * min(2, len(found))
            hits += min(2, len(found))
            why.append(f'{e}: {", ".join(found[:2])}')
    question = '?' in text
    if question:
        votes['tension'] = votes.get('tension', 0) + 0.5
        why.append('a question')
    turn = t == 'turning' or bool(TURN.search(text))
    if turn:
        votes['tension'] = votes.get('tension', 0) + 0.6
    emotion = max(votes, key=lambda e: (round(votes[e], 3), -ORDER[e]))
    inten = base + 0.07 * hits + 0.15 * pos + (0.1 if film_pos >= 0.8 else 0.0) + (0.05 if question else 0.0)
    return {'emotion': emotion, 'intensity': round(max(0.1, min(1.0, inten)), 2), 'why': why[:5], 'turn': turn, 'clock': bool(CLOCK.search(text)), 'question': question}


def sheet(beats: list[dict]) -> dict:
    """The score sheet of a film. `beats`: [{n, chapter, type, narration, outcome?, mood?, start?, d?, claim_ids?}] in film
    order. → {'beats': {n: {...}}, 'arc': {...}}. After each beat is read on its own, the shape is put in: the beat
    before a turn is the held BREATH; a win told straight after a tension passage is the RELEASE."""
    by_ch: dict = {}
    for b in beats:
        by_ch.setdefault(b.get('chapter'), []).append(b)
    out: dict = {}
    for i, b in enumerate(beats):
        ch = by_ch[b.get('chapter')]
        k = ch.index(b)
        out[b['n']] = read(b, k / max(1, len(ch) - 1), i / max(1, len(beats) - 1))
    for prev, b in zip(beats, beats[1:]):
        a, z = out[prev['n']], out[b['n']]
        if z['turn'] and prev.get('type') not in ('chapter', 'end', 'follow'):
            a['breath'] = True
        if z['emotion'] == 'joy' and a['emotion'] in ('tension', 'dread') and a['intensity'] >= STRONG:
            z.update({'emotion': 'release', 'intensity': max(z['intensity'], 0.85)})
            z['why'] = (z['why'] + ['after the tension: the release'])[:6]
    return {'version': 1, 'beats': out, 'arc': arc(beats, out)}


def arc(beats: list[dict], sh: dict) -> dict:
    """The film's shape, from the sheet: where the opening's question is planted and where it is paid off (the first
    later beat that cites one of the same claims and tells a result), and the passages of tension and of joy."""
    said, q = 0, None
    for b in beats:
        early = (b.get('start') is not None and b['start'] < OPENING_S) or (b.get('start') is None and said < OPENING_WORDS)
        if not early:
            break
        if PLANTS.search(b.get('narration') or '') or (b.get('headline') and '?' in b['headline']):
            q = b
            break
        said += len((b.get('narration') or '').split())
    total = sum(len((b.get('narration') or '').split()) for b in beats) or 1
    ans, share, early_tell, run = None, None, None, 0
    if q:
        ids = set(q.get('claim_ids') or [])
        for b in beats:
            words = len((b.get('narration') or '').split())
            if b is not q and beats.index(b) > beats.index(q) and ids & set(b.get('claim_ids') or []) and RESULT_CUES.search(b.get('narration') or '') \
                    and b.get('type') in ('score', 'goal', 'versus', 'table', 'record', 'stat', 'illustration', 'turning', 'quote', 'fact'):
                at = (run + words / 2) / total
                if at < 0.5 and early_tell is None:
                    early_tell = b['n']       # the outcome is told before the midpoint: the question was not withheld
                if at >= 0.5:
                    ans, share = b['n'], round(at, 2)
                    break
            run += words
    strong = lambda emos: [n for n, x in sh.items() if x['emotion'] in emos and x['intensity'] >= STRONG]   # noqa: E731
    return {'question': q['n'] if q else None, 'answer': ans, 'answer_at': share, 'told_early': early_tell,
            'tension': strong(('tension', 'dread')), 'joy': strong(('joy', 'release')),
            'turns': [n for n, x in sh.items() if x['turn']], 'peak': max(sh, key=lambda n: sh[n]['intensity']) if sh else None}


def beats_of_script(script: dict) -> list[dict]:
    out, n = [], 0
    for ci, ch in enumerate(script.get('chapters') or []):
        for b in ch.get('beats') or []:
            if not isinstance(b, dict):
                continue
            v = b.get('visual') or {}
            out.append({'n': n, 'chapter': ci, 'type': v.get('type'), 'narration': b.get('narration') or '', 'mood': b.get('mood'),
                        'claim_ids': list(b.get('claim_ids') or []) + [v.get('claim')] if v.get('claim') else list(b.get('claim_ids') or []), 'headline': v.get('headline')})
            n += 1
    return out


def beats_of_plan(plan: dict, ledger: dict | None = None) -> list[dict]:
    by = {c['id']: c.get('fact') or {} for c in (ledger or {}).get('claims') or []}
    out = []
    for s in plan['shots']:
        v = s['visual']
        f = by.get(v.get('claim') or (s.get('claim_ids') or [None])[0]) or {}
        out.append({'n': s['n'], 'chapter': s.get('chapter'), 'type': v['type'], 'narration': s.get('narration') or '', 'mood': s.get('mood'),
                    'outcome': f.get('outcome') if f.get('kind') == 'match' else None, 'start': s.get('start'), 'd': s['frames'] / plan.get('fps', 25),
                    'claim_ids': [c for c in dict.fromkeys([v.get('claim'), *(s.get('claim_ids') or [])]) if c], 'headline': v.get('headline')})
    return out


def attach(plan: dict, script: dict | None = None, ledger: dict | None = None) -> dict:
    """The sheet on the plan, for every craft to read: `plan['sheet']`, each shot's `drama`, the mix's mood where the
    drama is strong (the old one is kept as `mood_was`), and the music's two cues — the hush before each turn and the
    lift on each release. Idempotent: attaching twice changes nothing."""
    for s in plan['shots']:
        if 'mood_was' in s:
            s['mood'] = s.pop('mood_was')
    beats = beats_of_plan(plan, ledger)
    sh = sheet(beats)
    hush, lift = [], []
    for s, b in zip(plan['shots'], beats):
        x = sh['beats'][s['n']]
        s['drama'] = {k: x[k] for k in ('emotion', 'intensity') if k in x} | {k: True for k in ('turn', 'clock', 'breath') if x.get(k)}
        if x['intensity'] >= STRONG and x['emotion'] in MUSIC and MUSIC[x['emotion']] != s.get('mood'):
            s['mood_was'], s['mood'] = s.get('mood'), MUSIC[x['emotion']]
        end = b['start'] + b['d'] if b.get('start') is not None else None
        if x.get('breath') and end is not None:
            hush.append([round(max(b['start'], end - HUSH_S), 2), round(min(HUSH_S, b['d']), 2)])
        if x['emotion'] == 'release' and b.get('start') is not None:
            lift.append([round(b['start'], 2), round(min(LIFT_S, b['d']), 2)])
    # `shaped`: the script declares it was written as mini-dramas ("drama": 1) — the gate enforces the arc only then
    plan['sheet'] = {**sh, 'hush': hush, 'lift': lift, 'shaped': bool(script and script.get('drama') == 1)}
    return plan


def direct_script(script: dict) -> dict:
    """Before the voice is recorded: the held breath is SPOKEN as a hush and the release excited — only where the writer
    set no delivery of his own. In place; → the script."""
    beats = beats_of_script(script)
    sh = sheet(beats)['beats']
    n = 0
    for ch in script.get('chapters') or []:
        for b in ch.get('beats') or []:
            if not isinstance(b, dict):
                continue
            x = sh[n]
            n += 1
            if b.get('delivery'):
                continue
            if x.get('breath'):
                b['delivery'] = DELIVERY['breath']
            elif x['emotion'] == 'release':
                b['delivery'] = DELIVERY['release']
    return script


def text(plan: dict) -> str:
    """The sheet as lines, for the desk and the proof."""
    out = []
    for s in plan['shots']:
        bs = (plan.get('sheet') or {}).get('beats', {})
        x = bs.get(s['n']) or bs.get(str(s['n'])) or {}     # a plan read back from plan.json has text keys
        flags = ' '.join(k for k in ('turn', 'clock', 'breath', 'question') if x.get(k))
        out.append(f"{s['start']:7.2f}s  shot {s['n']:>2} [{s['visual']['type']:<9}] {x.get('emotion', '?'):<8} {x.get('intensity', 0):.2f}  {flags:<22} — {'; '.join(x.get('why') or [])}")
    a = (plan.get('sheet') or {}).get('arc') or {}
    out.append(f"arc: question planted on shot {a.get('question')} · answered on shot {a.get('answer')} ({a.get('answer_at')}) · tension {a.get('tension')} · joy {a.get('joy')} · turns {a.get('turns')} · peak {a.get('peak')}")
    return '\n'.join(out) + '\n'
