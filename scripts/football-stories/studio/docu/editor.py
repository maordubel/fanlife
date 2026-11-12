"""The editor in DOCU (owner, 12.11.2026: "every film must be an experience"; earlier: a slideshow-looking film, rejected).

The adapter (docu/plan.py) gives one beat per narrated line. Left alone, a line with a picture under it was ONE still
with a slow push for as long as the line lasted — thirteen seconds in the pilot — joined to the next by an opacity fade.
This is the cut. It changes no time of the plan (the mix and the subtitles land where they did) and no fact:

  a  no still holds longer than MAX_STILL. A longer one is cut into looks at the same scene — wide → detail → reverse —
     and, past three, a related picture; the cuts land on a music beat when the film's beat grid is known, else on a word.
  b  a full-frame card (a chapter ticket, a quote, a table) leaves after MAX_CARD and the beat's picture carries the rest.
  c  every beat arrives by a transition chosen from what it is (build.Film.transition): never the same one three times.
  d  the editor rules of docs/fanlife/71 as VOX holds them: no picture treatment and no camera move three times running;
     a chapter ends on a turn (the last look pushes in, and the way out is the dive through the chapter card).

`errors()` says what is still wrong in plain words; the producer's gate (studio/qa.py) reads it before a frame is drawn.
"""
from __future__ import annotations

import math

# A still held longer than this reads as a slide (measured on the pilot: stills of 8–13 s, 5.6 shots a minute; the
# hand-written films the owner approved change picture every 2–4 s).
MAX_STILL = 4.0
TARGET = 3.4        # what a split aims for, so a cut can move to a beat or a word and still be under MAX_STILL
MIN_SUB = 1.4       # a look shorter than this is a flicker, not a look (rule 142)
MAX_CARD = 6.0      # a full-frame card is read in this time; after it the frame is paper with nothing happening
WORD_HOLD = 2.6     # a slammed word (the turn of the story) lands, is read, and gets out of the picture's way
BEAT_SNAP = 0.3     # a cut moves this far to sit on a music beat …
WORD_SNAP = 0.7     # … or this far to sit on the start of a word
PICTURES = ('image', 'tint')
FRAMES = ('detail', 'reverse', 'wide')                       # the looks after the first, in order
FOCUS = ('34% 40%', '66% 42%', '50% 30%', '40% 62%')         # where a detail looks: never the same corner twice running
MOVES = ('push', 'panl', 'pull', 'panr')
# What each beat is decides how it arrives. A hard cut for the moments that hit; a whip for travel and the next match;
# the scale match for centred heroes; the old fade only where the story slows down.
HARD = {'goal', 'trailer', 'turning', 'open'}
CENTRED = {'score', 'versus', 'stat', 'record'}
TRAVEL = {'matchday', 'map', 'race', 'ticket'}
SOFT = {'follow', 'end', 'quote'}
OTHER = {'cut': 'whip', 'whip': 'match', 'match': 'cut', 'fade': 'cut', 'tear': 'cut', 'dive': 'cut'}


def opaque(dev: dict) -> bool:
    """A device that covers the whole frame with its own ground (paper or ink), so nothing under it is seen."""
    k = dev['kind']
    return (k in ('ledger', 'quote', 'rule', 'tally', 'form', 'table', 'press', 'chalk', 'cities', 'verdict', 'word')
            or (k == 'ticket' and not dev.get('compact')) or (k == 'card' and bool(dev.get('paper'))))


def span(dev: dict, d: float) -> tuple[float, float]:
    dt = dev.get('dt', 0.0) + (dev.get('at', 0.0) if dev['kind'] == 'word' else 0.0)
    return dt, dev.get('d', d - dev.get('dt', 0.0))


def cut_points(t0: float, d: float, words: list[float], grid: list[float] | None) -> list[float]:
    """Where a hold of `d` seconds starting at film time `t0` is cut, as offsets into it. As many looks as keep every one
    under MAX_STILL; each cut is moved to the nearest music beat (within BEAT_SNAP), else to the nearest word start
    (within WORD_SNAP), else left where the arithmetic put it — and never so far that a look breaks MIN_SUB or MAX_STILL."""
    if d <= MAX_STILL:
        return []
    n = max(2, math.ceil(d / TARGET))
    out, last = [], 0.0
    for i in range(1, n):
        ideal = d * i / n
        pick = ideal
        for marks, reach in ((grid or [], BEAT_SNAP), (words or [], WORD_SNAP)):
            near = [m - t0 for m in marks if abs(m - t0 - ideal) <= reach]
            near = [x for x in near if x - last >= MIN_SUB and x - last <= MAX_STILL and d - x >= MIN_SUB and (d - x) / (n - i) <= MAX_STILL]
            if near:
                pick = min(near, key=lambda x: abs(x - ideal))
                break
        out.append(round(pick, 3))
        last = pick
    return out


def looks(dev: dict, d: float, cuts: list[float], related, key) -> list[dict]:
    """One picture device over `d` seconds → its sub-shots. The first is the device as the adapter made it (its move, its
    tint, its tag — the tag and mini score stay for the whole hold); then detail → reverse → wide of the same picture;
    every fourth look is a related picture (`related(i)` → src or None), so a very long line still shows something new."""
    edges = [0.0, *cuts, d]
    base = dev.get('dt', 0.0)
    out, src = [], dev['src']
    for i in range(len(edges) - 1):
        a, z = edges[i], edges[i + 1]
        if i == 0:
            out.append({**dev, 'd': round(z - a, 3), 'hold': d})
            continue
        if i % 3 == 0:
            src = (related(i) if related else None) or dev['src']
        frame = FRAMES[(i - 1) % 3]
        out.append({'kind': 'image', 'src': src, 'frame': frame, 'focus': FOCUS[(key + i) % len(FOCUS)] if frame == 'detail' else None,
                    'dt': round(base + a, 3), 'd': round(z - a, 3), 'fade': False,
                    **{k: dev[k] for k in ('veil', 'pos', 'z', 'recon') if k in dev}})
    for x in out:
        if x.get('focus') is None:
            x.pop('focus', None)
    return out


def transition(prev: dict | None, meta: dict, history: list[str]) -> str:
    """How this beat arrives, from what it is and what came before (see build.Film.transition for what each one does)."""
    t = meta.get('type')
    if prev is None:
        name = 'cut'            # the film opens on its first frame: nothing fades up from black
    elif t == 'chapter':
        name = 'dive'
    elif prev.get('type') == 'chapter':
        name = 'tear'           # out of the chapter card through the paper
    elif t in SOFT or meta.get('outcome') == 'loss' or meta.get('pace') == 'slow':
        name = 'fade'
    elif t in HARD:
        name = 'cut'
    elif t in CENTRED:
        name = 'match'
    elif t in TRAVEL or meta.get('camera') == 'whip':
        name = 'whip'
    else:
        name = ('cut', 'whip', 'match')[meta.get('n', 0) % 3]
    if history[-2:] == [name, name] and t != 'chapter':
        name = OTHER[name]      # never the same way in three times running
    return name


def cut(beats: list[dict], grid: list[float] | None = None, related=None, backdrop=None) -> list[dict]:
    """The edit of a film's beats (each with `meta`: n, type, chapter, words, …). `related(n, i)` → another picture's src
    for a long hold; `backdrop(n)` → a picture device for a beat whose card leaves and has nothing under it."""
    out, history, prev = [], [], None
    for b in beats:
        m, d = b.get('meta') or {}, b['d']
        shots = [dict(x) for x in b['shots']]
        if m.get('type') not in ('end', 'follow'):
            # b · a card that outstays its reading leaves; the picture under it (or one fetched for it) carries the rest
            for dev in shots:
                if not opaque(dev):
                    continue
                at, hold = span(dev, d)
                limit = WORD_HOLD if dev['kind'] == 'word' else MAX_CARD
                rest = d - (at + limit)
                if hold <= limit or rest < MIN_SUB:
                    continue
                under = any(x['kind'] in PICTURES or x['kind'] == 'video' for x in shots)
                pic = None if under else (backdrop(m.get('n')) if backdrop else None)
                if not under and not pic:
                    continue   # nothing to show in its place: the card stays rather than leave an empty frame
                dev['d'] = round(limit + (dev.get('at', 0.0) if dev['kind'] == 'word' else 0.0), 3)   # word() counts its `at` inside d
                if pic:
                    shots.insert(0, {**pic, 'dt': round(at + limit, 3), 'd': round(rest, 3), **({'fade': False} if pic['kind'] == 'image' else {})})
        # a · no still longer than MAX_STILL
        cutup = []
        for dev in shots:
            dt, hold = span(dev, d) if dev['kind'] != 'word' else (0, 0)
            if dev['kind'] in PICTURES and hold > MAX_STILL:
                pts = cut_points(b['t'] + dt, hold, m.get('words') or [], grid)
                cutup += looks(dev, hold, pts, (lambda i, n=m.get('n'): related(n, i)) if related else None, m.get('n') or 0)
            else:
                cutup.append(dev)
        # a figure in front of a picture belongs to the look it rose over: it leaves at the first cut of what is behind it
        firsts = [x.get('dt', 0.0) + x['d'] for x in cutup if x['kind'] in PICTURES and 'hold' in x and x['hold'] > x['d']]
        for x in cutup:
            if x['kind'] == 'cutout' and firsts and min(firsts) - x.get('dt', 0.0) >= MIN_SUB:
                x['d'] = round(min(firsts) - x.get('dt', 0.0), 3)
        name = transition(prev, m, history)
        history.append(name)
        for x in cutup:   # the transition is the entrance now: the picture's own fade would be a second one
            if x['kind'] == 'image' and x.get('dt', 0) == 0:
                x['fade'] = False
        out.append({**b, 'shots': cutup, 'in': name})
        prev = m
    rules(out)
    return out


def pictures(b: dict) -> list[dict]:
    return [x for x in b['shots'] if x['kind'] in PICTURES]


def treatment(b: dict) -> str | None:
    """What a beat looks like when it is only a picture: 'image', 'print', 'tint' — None when a card or a graphic leads it."""
    if any(x['kind'] not in PICTURES for x in b['shots']):
        return None
    p = pictures(b)
    return (p[0].get('as') or p[0]['kind']) if p else None


def motion(x: dict) -> str:
    return x.get('frame') or x.get('move') or 'push'


def rules(beats: list[dict]) -> None:
    """d · the editor rules, applied (in place). A third plain still in a row becomes a print on the desk; a third identical
    camera move in a row takes the next move; the last look of every chapter but the last is the turn."""
    for i in range(2, len(beats)):
        if treatment(beats[i]) == treatment(beats[i - 1]) == treatment(beats[i - 2]) == 'image':
            beats[i]['shots'][0]['as'] = 'print'
    seq = [x for b in beats for x in pictures(b)]
    for i in range(2, len(seq)):
        if motion(seq[i]) == motion(seq[i - 1]) == motion(seq[i - 2]):
            if seq[i].get('frame'):
                seq[i]['frame'] = FRAMES[(FRAMES.index(seq[i]['frame']) + 1) % 3] if seq[i]['frame'] in FRAMES else 'wide'
            else:
                seq[i]['move'] = MOVES[(MOVES.index(motion(seq[i])) + 1) % 4] if motion(seq[i]) in MOVES else 'push'
    for i, b in enumerate(beats[:-1]):
        nxt = beats[i + 1]
        if (b.get('meta') or {}).get('chapter') != (nxt.get('meta') or {}).get('chapter') or (nxt.get('meta') or {}).get('type') == 'chapter':
            p = pictures(b)
            if p and p[-1]['kind'] == 'image' and not p[-1].get('tag'):
                p[-1]['frame'] = 'turn'
                p[-1].pop('focus', None)


def errors(beats: list[dict]) -> list[str]:
    """What the cut still gets wrong, in plain English (empty when it holds). The producer's gate reads this."""
    errs = []
    for b in beats:
        n = (b.get('meta') or {}).get('n')
        if (b.get('meta') or {}).get('type') in ('end', 'follow'):
            continue
        for x in pictures(b):
            hold = x.get('d', b['d'] - x.get('dt', 0))
            if hold > MAX_STILL + 0.01:
                errs.append(f'shot {n}: a still holds {hold:.1f}s (at most {MAX_STILL:.0f}s)')
    for i in range(2, len(beats)):
        if treatment(beats[i]) is not None and treatment(beats[i]) == treatment(beats[i - 1]) == treatment(beats[i - 2]):
            errs.append(f'shot {(beats[i].get("meta") or {}).get("n")}: the same picture treatment three times in a row')
        if beats[i].get('in') == beats[i - 1].get('in') == beats[i - 2].get('in') and (beats[i].get('meta') or {}).get('type') != 'chapter':
            errs.append(f'shot {(beats[i].get("meta") or {}).get("n")}: the same transition ({beats[i].get("in")}) three times in a row')
    seq = [x for b in beats for x in pictures(b)]
    for i in range(2, len(seq)):
        if motion(seq[i]) == motion(seq[i - 1]) == motion(seq[i - 2]):
            errs.append(f'the same camera move ({motion(seq[i])}) three times in a row')
    for i, b in enumerate(beats[:-1]):
        nm = beats[i + 1].get('meta') or {}
        if nm.get('type') == 'chapter' and beats[i + 1].get('in') != 'dive':
            errs.append(f'chapter {(b.get("meta") or {}).get("chapter")}: it does not end on a turn')
    return errs


def shot_list(beats: list[dict]) -> list[dict]:
    """The cut as data (job/docu-shots.json): every beat, how it arrives, its devices and each look at its pictures — what
    the desk can show and what the experience gate measures before and after the render."""
    out = []
    for b in beats:
        m = b.get('meta') or {}
        subs = [{'kind': x['kind'], 'at': round(b['t'] + x.get('dt', 0), 2), 'd': round(x.get('d', b['d'] - x.get('dt', 0)), 2),
                 'look': x.get('as') or motion(x), 'src': x.get('src')} for x in b['shots'] if x['kind'] in (*PICTURES, 'video', 'cutout')]
        out.append({'n': m.get('n'), 'type': m.get('type'), 'chapter': m.get('chapter'), 't': round(b['t'], 2), 'd': round(b['d'], 2),
                    'in': b.get('in'), 'devices': [x['kind'] for x in b['shots']], 'pictures': subs})
    return out
