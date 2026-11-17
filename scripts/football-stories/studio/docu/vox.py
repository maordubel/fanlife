"""THE VOX PASS — every sentence gets its own picture and its own graphic idea (owner, 17.11.2026: "the results come out
without effects, without VOX, without HyperFrames … the system chooses unrelated pictures … the editor: precision,
VOX, transitions, animation, motion").

Measured on the St. Pauli 2019/20 film (16.11.2026): 16 beats for six minutes, one picture idea per beat, so a beat of
22 seconds was one picture cut into looks of itself — 84% of the film documentary, the longest run in one visual
language 349 s, one transition every 22 s. The devices existed (kinetic type, odometers, pen lines, cut-outs); the plan
gave them one chance a beat.

The pass works on the narrator's own timing, between the adapter's raw beats and the editor's cut:

  1  SEGMENT   a beat longer than SEG_LONG is cut at the starts of its sentences (a very long sentence at a comma) into
               segments of SEG_MIN–SEG_MAX seconds. Each segment is a beat of its own to the editor: its own picture,
               its own looks, its own transition in. The adapter's devices stay where they start; a board or a card
               that runs over a cut ends on it.
  2  SEE       a segment without a picture of its own gets the picture that shows what ITS sentence says (the media
               index's relevant pick: subjects and caption words — studio/media_index.Picker.pick_relevant); only when
               nothing shows it does the beat's own picture carry on in another framing.
  3  ACCENT    each segment gets one graphic idea on the word that asks for it, chosen from what the sentence says:
                 objects   the object library (studio/objects.py) — the ticket on "ticket", the plane on "flight", the
                           stopwatch on "the ninetieth minute" — printed in the club's inks, entering as the word is said
                 score     a scoreline the line says, slammed as type, the score highlighted
                 number    a number the line says with the noun after it ("eighteen matches"), rolled up as an odometer
                 phrase    the sentence's own short core as kinetic type, its longest word under the highlighter
               never the same kind three times running, and a segment that already carries type or a board keeps it.
  4  MOVE      segments arrive by a transition of their own (docu/editor.transition reads `seg`): the film moves
               between sentences, not only between beats.

Everything printed is the narrator's own words or a claim's number (Designer.sourced); an object only illustrates a
word that is said. STORIES_DOCU_VOX=0 keeps the beats whole (for comparison).
"""
from __future__ import annotations

import os
import re
from pathlib import Path

SEG_LONG = 9.0      # a beat longer than this is cut into segments …
SEG_MIN = 4.0       # … none shorter than this (a picture needs time to be seen) …
SEG_MAX = 8.0       # … and none longer than this when a sentence start allows it
ACCENT_MIN = 1.6
ACCENT_MAX = 4.2
SKIP = {'end', 'follow', 'trailer', 'quote'}   # never cut: the closing cards and a quote are read whole
CARDS = {'chapter', 'open', 'record', 'race', 'form', 'run', 'timeline', 'table'}   # cut after their card: the card keeps its first segment
TYPED = {'kinetic', 'word', 'question', 'lead', 'rule', 'verdict', 'quote', 'stat', 'explain', 'flap', 'table', 'form', 'ledger',
         'tally', 'cities', 'chalk', 'objects', 'score', 'ticket', 'card', 'press', 'clockdev', 'locator'}
SCORE = re.compile(r'\b(\d{1,2})\s?[–-]\s?(\d{1,2})\b')
NUM_NOUN = re.compile(r'\b(\d{2,6}|\d)\s+([a-z]{3,14})\b', re.I)
NOUN_OK = {'matches', 'games', 'goals', 'minutes', 'seasons', 'years', 'days', 'weeks', 'months', 'points', 'wins', 'defeats', 'draws',
           'titles', 'trophies', 'cups', 'fans', 'supporters', 'people', 'thousand', 'players', 'meetings', 'derbies', 'finals',
           'appearances', 'caps', 'seconds', 'nights', 'clean', 'straight', 'unbeaten', 'league'}
WEAK_WORDS = set('''a an the and or but of to in on at by for with from as is was were be been it its this that these those
he she they we our their his her them us you i me my so then than there here not no yes into onto over under up down out
off just only very more most much many some any all each both every one'''.split())


def sentences(text: str) -> list[tuple[int, int, str]]:
    """(first word, end word, text) of each sentence, by word index (the voice's word timings are by word)."""
    out, i = [], 0
    for sn in [x for x in re.split(r'(?<=[.?!…])\s+', (text or '').strip()) if x.strip()]:
        k = len(sn.split())
        out.append((i, i + k, sn))
        i += k
    return out


def clauses(text: str, a: int, z: int) -> list[int]:
    """Word indexes inside a sentence where a clause starts (after a comma, a dash or a colon)."""
    ws = text.split()
    return [a + j + 1 for j, w in enumerate(ws[:-1]) if w.endswith((',', ';', ':', '—')) or ws[j + 1] in ('—', '–')]


def cut_times(b: dict, text: str) -> list[float]:
    """Where a long beat is cut: sentence starts (and clause starts in a long sentence), in film time, so that every
    segment is between SEG_MIN and SEG_MAX seconds where the line allows it."""
    words = (b.get('meta') or {}).get('words') or []
    t0, t1 = b['t'], b['t'] + b['d']
    sents = sentences(text)
    if not words or sum(z - a for a, z, _ in sents) != len(words):
        return []
    starts = []
    for a, z, sn in sents:
        starts.append(a)
        if words[min(z, len(words)) - 1] - words[a] > SEG_MAX:
            starts += clauses(sn, a, z)
    cand = sorted({round(words[i], 3) for i in starts if 0 < i < len(words)})
    cuts, last = [], t0
    for c in cand:
        if c - last < SEG_MIN or t1 - c < SEG_MIN:
            continue
        nxt = next((x for x in cand if x > c), None)
        # take a sentence start when waiting for the next one would leave this segment too long
        if c - last >= SEG_MAX * 0.6 or nxt is None or nxt - last > SEG_MAX:
            cuts.append(c)
            last = c
    return cuts


def split(b: dict, cuts: list[float]) -> list[dict]:
    """The beat as segments at `cuts` (film times). A device belongs to the segment it starts in; one that runs over the
    end of its segment ends there (the next segment brings its own)."""
    edges = [b['t'], *cuts, b['t'] + b['d']]
    segs = []
    for k in range(len(edges) - 1):
        a, z = edges[k], edges[k + 1]
        m = {**b['meta'], 'seg': k, 'segs': len(edges) - 1, 'words': [w for w in b['meta'].get('words') or [] if a - 0.01 <= w < z - 0.01]}
        if k:
            m['type'] = 'illustration' if m.get('type') not in ('goal', 'score', 'versus') else 'segment'
        segs.append({**{x: y for x, y in b.items() if x not in ('shots', 'meta', 'subs', 't', 'd')}, 't': round(a, 3), 'd': round(z - a, 3),
                     'shots': [], 'meta': m, **({'subs': b['subs']} if k == 0 and b.get('subs') else {})})
    for dev in b['shots']:
        at = b['t'] + dev.get('dt', 0.0)
        k = max(i for i in range(len(segs)) if segs[i]['t'] <= at + 0.01)
        sg = segs[k]
        x = {**dev, 'dt': round(at - sg['t'], 3)}
        end = at + dev.get('d', b['t'] + b['d'] - at)
        if end > sg['t'] + sg['d'] + 0.01 or 'd' not in dev:
            x['d'] = round(sg['t'] + sg['d'] - at, 3)
        if 'hold' in x:
            x['hold'] = x['d']
        if x['d'] >= 0.6:
            sg['shots'].append(x)
    return segs


# ── the accents ──────────────────────────────────────────────────────────────────────────────────────────────────────
def word_times(text: str, words: list[float]) -> list[tuple[str, float]]:
    ws = text.split()
    return list(zip(ws, words)) if len(ws) == len(words) else []


MONTHS = {'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'}


def core(ws: list[str], i: int | None = None, n: int = 5) -> tuple[int, int]:
    """The short window of ONE sentence that carries it: around word `i`, else the window with the most strong words —
    never across a full stop (17.11.2026 sample: "3–1. At last," read as one line), never a run of dates."""
    ends = [j for j, w in enumerate(ws) if w.endswith(('.', '?', '!', '…'))]
    def inside(a, z):   # noqa: E306
        return not any(a <= j < z - 1 for j in ends)
    if i is not None:
        for a in sorted(range(max(0, i - n + 1), i + 1), key=lambda a: abs(a - (i - n // 2))):
            z = min(len(ws), a + n)
            if a <= i < z and inside(a, z):
                return a, z
        return i, i + 1
    best, at = -1.0, 0
    for a in range(0, max(1, len(ws) - n + 1)):
        win = ws[a:a + n]
        if not inside(a, a + len(win)):
            continue
        bare = [w.strip('.,?!…;:—"“”').lower() for w in win]
        sc = (sum(1 for w in bare if w not in WEAK_WORDS and w not in MONTHS and not w.isdigit())
              + sum(0.6 for w in win if w[:1].isupper() and w.strip('.,').lower() not in MONTHS) - 2 * sum(1 for w in bare if w in MONTHS or w.isdigit()))
        if sc > best:
            best, at = sc, a
    z = min(len(ws), at + n)
    while z - at > 2 and not inside(at, z):
        z -= 1
    return at, z


def kinetic(ws: list[tuple[str, float]], a: int, z: int, t0: float, seg_end: float, hot: list[int] | None = None) -> dict | None:
    if z - a < 2:
        return None
    at = ws[a][1] - t0
    hold = min(seg_end - ws[a][1], (ws[z - 1][1] - ws[a][1]) + 1.5, ACCENT_MAX)
    if at < 0 or hold < ACCENT_MIN:
        return None
    words = [{'w': w.strip('"“”'), 'at': round(tt - ws[a][1], 3)} for w, tt in ws[a:z]]
    if hot is None:
        hot = [max(range(len(words)), key=lambda j: (len(words[j]['w'].strip('.,?!…')), j))]
    return {'kind': 'kinetic', 'words': words, 'hot': hot, 'dt': round(at, 3), 'd': round(hold, 3), 'veil': 0.42, 'vox': True}


def accent(seg: dict, text: str, last: list[str], ad) -> dict | None:
    """One graphic idea for a segment, from what its sentence says (see the module doc). `last` = the kinds so far."""
    t0, end = seg['t'], seg['t'] + seg['d']
    ws = [(w, tt) for w, tt in word_times(text, (seg.get('_words_all') or [])) if t0 - 0.01 <= tt < end - 0.01]
    if len(ws) < 2:
        return None
    seg_text = ' '.join(w for w, _ in ws)
    tried = []
    obj = getattr(ad, 'object_device', None)
    order = ['objects', 'score', 'number', 'phrase']
    if last[-2:] and len(set(last[-2:])) == 1:   # never the same kind three times running
        order = [k for k in order if k != last[-1]] + [last[-1]]
    for kind in order:
        dev = None
        if kind == 'objects' and obj:
            dev = obj(seg_text, ws, t0, end)
        elif kind == 'score':
            m = SCORE.search(seg_text)
            if m:
                i = next((j for j, (w, _) in enumerate(ws) if SCORE.search(w) or w.strip('.,') == m.group(0)), None)
                if i is not None:
                    a, z = core([w for w, _ in ws], i, 5)
                    dev = kinetic(ws, a, z, t0, end, [i - a])
        elif kind == 'number':
            for m in NUM_NOUN.finditer(seg_text):
                if m.group(2).lower() in NOUN_OK:
                    i = next((j for j, (w, _) in enumerate(ws) if w.strip('.,') == m.group(1)), None)
                    if i is None:
                        continue
                    at = ws[i][1] - t0
                    hold = min(ACCENT_MAX, end - ws[i][1])
                    if hold >= 2.4:
                        dev = ad.design.sourced({'kind': 'explain', 'form': 'number', 'value': int(m.group(1)), 'label': m.group(2).upper(),
                                                 'title': '', 'dt': round(at, 3), 'd': round(hold, 3), 'vox': True},
                                                {'narration': text, 'visual': {}}) if getattr(ad, 'design', None) else None
                    break
        elif kind == 'phrase':
            a, z = core([w for w, _ in ws])
            dev = kinetic(ws, a, z, t0, end)
        if dev:
            dev['accent'] = kind
            return dev
        tried.append(kind)
    return None


def merge_blind(segs: list[dict]) -> list[dict]:
    """A sentence with no picture of its own that shows it joins the segment before it: its picture runs on under one
    camera move (film mode, 17.11.2026 — a cut to a closer framing of the same picture read as flicker)."""
    out = [segs[0]]
    for sg in segs[1:]:
        if has_picture(sg):
            out.append(sg)
            continue
        pv = out[-1]
        for x in sg['shots']:
            pv['shots'].append({**x, 'dt': round(x.get('dt', 0.0) + pv['d'], 3)})
        for x in pv['shots']:
            if x['kind'] in ('image', 'tint', 'video') and abs(x.get('dt', 0.0) + x.get('d', 0.0) - pv['d']) < 0.02:
                x['d'] = round(x['d'] + sg['d'], 3)
                if 'hold' in x:
                    x['hold'] = x['d']
        pv['d'] = round(pv['d'] + sg['d'], 3)
        pv['meta'] = {**pv['meta'], 'words': (pv['meta'].get('words') or []) + (sg['meta'].get('words') or [])}
    for k, sg in enumerate(out):
        sg['meta'] = {**sg['meta'], 'seg': k, 'segs': len(out)}
    return out


def busy(seg: dict) -> bool:
    return any(x['kind'] in TYPED for x in seg['shots'])


def has_picture(seg: dict) -> bool:
    return any(x['kind'] in ('image', 'tint', 'video') and x.get('dt', 0.0) <= 0.05 for x in seg['shots'])


def run(raw: list[dict], ad) -> list[dict]:
    """The pass over the adapter's raw beats → the beats the editor cuts (more of them, each a sentence or two)."""
    if os.environ.get('STORIES_DOCU_VOX', '1') == '0':
        return raw
    shots = {s['n']: s for s in ad.plan.get('shots') or []}
    out, kinds = [], []
    for b in raw:
        m = b.get('meta') or {}
        s = shots.get(m.get('n')) or {}
        text = s.get('narration') or ''
        cuts = cut_times(b, text) if m.get('type') not in SKIP and b['d'] > SEG_LONG else []
        segs = split(b, cuts) if cuts else [b]
        for k in range(1, len(segs)):
            if not has_picture(segs[k]):
                pic = ad.segment_picture(m['n'], segs[k], text, k) if hasattr(ad, 'segment_picture') else None
                if pic:
                    segs[k]['shots'].insert(0, pic)
        segs = merge_blind(segs)
        for k, sg in enumerate(segs):
            sg['_words_all'] = m.get('words') or []
            if m.get('type') in SKIP or (m.get('type') in ('goal',) or m.get('type') in CARDS) and k == 0:
                continue
            if busy(sg) and k == 0:
                kinds.append('board')
                continue
            if k == 0 and len(segs) > 1:
                continue   # the beat's first sentence is its own picture: the accents come with the sentences after it
            dev = accent(sg, text, kinds, ad)
            if dev and not any(x['kind'] in TYPED and x.get('dt', 0) < dev['dt'] + dev['d'] and dev['dt'] < x.get('dt', 0) + x.get('d', sg['d'])
                               for x in sg['shots']):
                sg['shots'].append(dev)
                kinds.append(dev['accent'])
                # its sound, on the plan shot's own cue list (the mix lays every effect from the cues)
                at = sg['t'] - float(s.get('start') or b['t']) + dev['dt']
                for it in dev.get('items') or []:
                    ad.cue(m['n'], round(at + it['at'] + 0.3, 2), 'stamp')
                if dev['kind'] == 'kinetic':
                    ad.cue(m['n'], round(at, 2), 'paper')
                elif dev['kind'] == 'explain':
                    ad.cue(m['n'], round(at + 0.35, 2), 'tick')
        for sg in segs:
            ws = [(w, tt) for w, tt in word_times(text, sg.pop('_words_all', None) or []) if sg['t'] - 0.01 <= tt < sg['t'] + sg['d'] - 0.01]
            sg['_key'] = key_word([w for w, _ in ws]) if m.get('type') not in SKIP else None
        out += segs
    threads(out)
    for sg in out:
        sg.pop('_key', None)
    return out


def key_word(ws: list[str]) -> str | None:
    """The word a sentence is about, for its knot on the story thread: a name if it says one, else its longest strong word."""
    bare = [w.strip('.,?!…;:—"“”()') for w in ws]
    names = [w for i, w in enumerate(bare) if i and w[:1].isupper() and w.lower() not in WEAK_WORDS and w.lower() not in MONTHS and len(w) > 2]
    if names:
        return names[0].upper()[:18]
    strong = [w for w in bare if w.lower() not in WEAK_WORDS and w.lower() not in MONTHS and not w.isdigit() and len(w) > 3]
    return max(strong, key=len).upper()[:18] if strong else None


THREAD_MIN = 3   # a chapter with fewer story knots than this keeps its picture clear


def threads(beats: list[dict]) -> None:
    """In place: the story thread (build.Film.thread) along each chapter — a knot and its key word at every sentence."""
    chapters: dict = {}
    for b in beats:
        m = b.get('meta') or {}
        if m.get('type') in ('end', 'follow') or m.get('chapter') is None:
            continue
        chapters.setdefault(m['chapter'], []).append(b)
    for ch, bs in chapters.items():
        first = bs[0]
        t0, t1 = first['t'], bs[-1]['t'] + bs[-1]['d']
        nodes, seen = [], set()
        for b in bs:
            k = b.get('_key')
            if k and k not in seen:
                seen.add(k)
                nodes.append({'at': round(max(0.6, b['t'] - t0 + 0.4), 2), 'word': k})
        if len(nodes) < THREAD_MIN or t1 - t0 < 12:
            continue
        nodes[-1]['hot'] = True
        first['shots'].append({'kind': 'thread', 'nodes': nodes[:9], 'dt': 0.05, 'd': round(t1 - t0 - 0.05, 3)})


def object_files(ids: list[str], palette, job_dir: Path) -> dict[str, Path]:
    """The objects printed in this film's inks, written once into the job (studio/objects.svg_for)."""
    from .. import objects as O
    d = job_dir / 'objects'
    d.mkdir(parents=True, exist_ok=True)
    out = {}
    for k in ids:
        p = d / f'obj-{k}.svg'
        if not p.exists():
            p.write_text(O.svg_for(k, palette), encoding='utf-8')
        out[k] = p
    return out
