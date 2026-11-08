"""From a Short's words to a cartoon beat sheet: one visual beat per line, landing on its word.

The writer gives each Short a "cartoon" list ({say, show}); an older script has only the narration, which is split at
its sentences. Each beat gets a pose, an expression and at most one gag, picked from what the line SAYS and what the
writer asked the cartoon to SHOW — by words, never by a model, so the same Short always draws the same film.

The guide's rules, kept: frame 0 is the premise (character + the thing, big and centred); one focal action at a time;
the gag lands on its word; the last frame loops back to the first; nothing is cross-faded between drawings.
"""
from __future__ import annotations

import re

# words → the gag a beat plays (first match wins; the order is the priority)
GAGS: list[tuple[str, str]] = [
    (r'\bbottles?\b|\bcologne\b|\bwater\b|\bdrink|\bdrugged\b|\bsedative|\bpoison', 'bottle'),
    (r'\bscore(?:d|board|line)?\b|\b\d+\s*[–-]\s*\d+\b|\bnil\b|\bgoals?\b.*\bto\b', 'scoreboard'),
    (r'\bstamp\b|\bclassified\b|\bfile\b|\bsecret\b|\bconfess', 'stamp'),
    (r'\bnewspapers?\b|\bheadlines?\b|\bpaper\b|\breport(?:ed|s)?\b|\bpress\b', 'newspaper'),
    (r'\btroph(?:y|ies)\b|(?<!world )\bcup\b|\btitle\b|\bchampions?\b|\bwon the\b', 'trophy'),
    (r'\bwhistle\b|\breferee\b|\bref\b|\bdisallow|\bruled out\b|\bcancell?ed\b', 'whistle'),
    (r'\bred card\b|\bsent off\b|\bsending off\b', 'red_card'),
    (r'\bphone\b|\bcalled\b|\bcall\b|\bringing\b', 'phone'),
    (r'\bmoney\b|\bpaid\b|\bpay\b|\bransom\b|\bpesetas\b|\bdollars?\b|\bpounds\b|\bfee\b|\bmillions?\b', 'money'),
    (r'\bprison\b|\bjail\b|\bcell\b|\bkidnapp|\barrest', 'bars'),
    (r'\bminutes?\b|\bclock\b|\bseconds?\b|\blate\b|\bdays?\b', 'clock'),
    (r'\bheader\b|\bshot\b|\bscored\b|\bnet\b|\bpenalt|\bvolley|\bkick', 'ball_goal'),
    (r'\bball\b', 'ball'),
]
POSE_WORDS: list[tuple[str, tuple[str, str]]] = [
    (r'\bwon\b|\bwin\b|\bwinner\b|\bcelebrat|\bchampions\b|\bscored\b|\bgoal!?\b', ('cheer', 'grin')),
    (r'\blost\b|\blosing\b|\bout\b|\bmissed\b|\bcut\b|\binjur|\bbroke|\bkidnapp|\bdrugged|\bdied\b|\bshot dead', ('scared', 'shock')),
    (r'\bwhy\b|\bhow\b|\bwhat\b|\?|\bbut\b|\bwait\b', ('shrug', 'think')),
    (r'\blaugh|\bjoke|\bsmil|\bof course\b|\bobviously\b', ('stand', 'smug')),
    (r'\bthis is\b|\bthis\b|\bhere\b|\blook\b|\bmeet\b|\bthat\b', ('point', 'smile')),
    (r'\bimagine\b|\bpicture\b|\bthink\b|\bremember\b', ('think', 'think')),
    (r'\bnever\b|\bno\b|\bimpossible\b|\breally\b|\breal\b', ('facepalm', 'squeeze')),
]
HOLDABLE = {'bottle', 'trophy', 'phone', 'money', 'newspaper', 'whistle', 'red_card', 'ball'}
SCORE = re.compile(r'\b(\d{1,2})\s*[–-]\s*(\d{1,2})\b')
WORDNUM = {'nil': 0, 'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10}
SPOKEN_SCORE = re.compile(r'\b(nil|zero|one|two|three|four|five|six|seven|eight|nine|ten)[\s–-]+(nil|zero|one|two|three|four|five|six|seven|eight|nine|ten)\b', re.I)


def split_beats(narration: str, cartoon: list | None) -> list[dict]:
    """The writer's cartoon beats when their words add up to the narration; else the narration's sentences."""
    words = narration.split()
    if isinstance(cartoon, list) and cartoon and all(isinstance(b, dict) and isinstance(b.get('say'), str) for b in cartoon):
        said = ' '.join(b['say'].strip() for b in cartoon).split()
        if [w.lower().strip('.,!?;:—"') for w in said] == [w.lower().strip('.,!?;:—"') for w in words]:
            return [{**{k: b[k] for k in ('scene', 'era', 'cast') if k in b}, 'say': b['say'].strip(), 'show': str(b.get('show') or ''),
                     'plate': str(b.get('plate') or '')} for b in cartoon]
    parts = [p.strip() for p in re.split(r'(?<=[.?!])\s+', narration.strip()) if p.strip()]
    return [{'say': p, 'show': ''} for p in parts]


def score_in(text: str) -> tuple[int, int] | None:
    m = SCORE.search(text)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = SPOKEN_SCORE.search(text)
    if m:
        return WORDNUM[m.group(1).lower()], WORDNUM[m.group(2).lower()]
    return None


def gag_of(text: str) -> str | None:
    t = text.lower()
    for pat, gag in GAGS:
        if re.search(pat, t):
            if gag == 'scoreboard' and not score_in(text):
                continue
            return gag
    return None


def pose_of(text: str, i: int, n: int) -> tuple[str, str]:
    t = text.lower()
    for pat, pe in POSE_WORDS:
        if re.search(pat, t):
            return pe
    return ('point', 'smile') if i == 0 else ('stand', 'neutral') if i < n - 1 else ('shrug', 'smug')


def plan(beats: list[dict], words: list[dict], lead: float = 0.1) -> list[dict]:
    """Times every beat on its own words: start = its first word, the gag on its key word (or 40% in)."""
    out, k = [], 0
    for i, b in enumerate(beats):
        n = len(b['say'].split())
        ws = words[k:k + n] or words[-1:]
        k += n
        t0, t1 = ws[0]['start'] + lead, ws[-1]['end'] + lead
        text = f"{b['say']} {b['show']}"
        gag = gag_of(b['show']) or gag_of(b['say'])
        pose, expr = pose_of(b['say'] + ' ' + b['show'], i, len(beats))
        if gag in HOLDABLE and pose in ('stand', 'neutral'):
            pose = 'hold'
        # the gag's word: the first word of the beat that triggered it
        hit = t0 + (t1 - t0) * 0.35
        for w in ws:
            if gag and gag_of(w['w']) == gag:
                hit = w['start'] + lead
                break
        out.append({**{k: b[k] for k in ('scene', 'era', 'cast') if k in b}, 'i': i, 'say': b['say'], 'show': b['show'], 'plate': b.get('plate') or '', 't0': round(t0, 3), 't1': round(t1, 3), 'pose': pose, 'expr': expr,
                    'gag': gag, 'hit': round(hit, 3), 'score': score_in(text) if gag == 'scoreboard' else None})
    return out
