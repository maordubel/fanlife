"""The cinema's direction over the whole edit (contract §3.1 and §4), decided once in the plan and applied to every shot.

`direct(editor, shots)` annotates each planned shot with a `cinema` block — the scorebug's running W–D–L, the
lower-third scorelines the shot owes, the entry transition, the letterbox, the grade, the b-roll, the act — so the
decisions are in plan.json (testable without rendering, identical in every render worker). `dress(editor, shot, s)`
then puts that block on the built shot: the camera the director asked for, the transition, the grade and the glass
graphics, for the old visual types as much as for the new ones.
"""
from __future__ import annotations

import math

from PIL import Image, ImageDraw

from ..common import FPS, H, W
from ..motion import clamp, ease_in_out, ease_out_back, ease_out_cubic
from . import animate, gfx, library, look
from .story import LETTER, story_of

# visuals that print a match's score themselves (contract §3.1); matchday is the pre-match card the contract lists too
SHOWS_SCORE = {'score', 'versus', 'goal', 'matchday'}
# visuals that print every match they cite (a form strip, a streak, a timeline)
SHOWS_CLAIMS = {'form', 'run', 'timeline'}
AGGREGATE = {'form', 'run', 'race', 'record', 'timeline', 'map', 'stat', 'table'}
NO_BUG = {'open', 'chapter', 'end', 'follow', 'trailer', 'versus', 'form', 'run', 'record', 'race', 'table', 'map', 'goal'}
DATA_CARDS = {'matchday', 'score', 'ticket', 'fact', 'stat', 'table', 'timeline', 'turning', 'quote', 'press'}
SFX = {'roar': 'crowd-goal', 'whistle': 'whistle', 'groan': 'crowd-miss', 'gasp': 'crowd-after', 'drum': 'drum'}


def beat_fx(b: dict) -> dict:
    """The director's beat-level wishes (camera, pace, broll, sfx): on the beat, or on its visual."""
    v = b.get('visual') or {}
    out = {k: b.get(k, v.get(k)) for k in ('camera', 'pace', 'broll', 'sfx') if b.get(k, v.get(k)) is not None}
    # the writer's screenplay craft (contract, soul.py): a slug line, the motif returning, the parallel "meanwhile" cut
    if isinstance(b.get('slug'), str) and b['slug'].strip():
        out['slug'] = b['slug'].strip()[:80]
    if b.get('motif') is True:
        out['motif'] = True
    if b.get('cut') == 'meanwhile':
        out['cut'] = 'meanwhile'
    return out


def _cited(ed, s: dict) -> list[str]:
    v = s['visual']
    ids = list(s.get('claim_ids') or [])
    for k in ('claim',):
        if v.get(k):
            ids.append(v[k])
    ids += list(v.get('claims') or []) + list(v.get('mark') or [])
    out = []
    for i in ids:
        c = ed.by.get(i)
        if c and c['fact'].get('kind') == 'match' and i not in out:
            out.append(i)
    return out


def _shown(s: dict) -> set[str]:
    v = s['visual']
    kind = v['type']
    if kind in SHOWS_SCORE:
        return {v.get('claim')}
    if kind in SHOWS_CLAIMS:
        return set(v.get('claims') or [])
    if kind == 'race':
        return set(v.get('mark') or [])
    return set()


# How each of the three directors (studio/directors.py) leans on the cinema: his favourite moves when the beat asks for
# none, his cuts, how much letterbox, grade and crowd he wants. A script with no director gets the house look.
LOOKS = {
    'broadcaster': {'entries': ('cut', 'whip', 'cut', 'push'), 'letterbox': (), 'leak': ('triumph',), 'warm': False,
                    'bug_on_climax': True, 'crowd': False, 'stings': ('goal', 'versus', 'trailer')},
    'terrace': {'entries': ('dissolve', 'fade', 'dissolve', 'burn'), 'letterbox': (), 'leak': ('joy', 'triumph', 'anthem', 'minor'),
                'warm': True, 'bug_on_climax': False, 'crowd': True, 'stings': ('goal', 'trailer'),
                'broll': ('home', 'record', 'press', 'away')},
    'trailer': {'entries': ('flash', 'burn', 'whip', 'flash'), 'letterbox': ('goal', 'versus', 'turning', 'trailer'),
                'leak': ('joy', 'triumph', 'anthem', 'build', 'tense'), 'warm': False, 'bug_on_climax': False, 'crowd': False,
                'stings': ('goal', 'versus', 'trailer', 'chapter', 'turning')},
}


def director_of(ed) -> dict | None:
    sc = getattr(ed, 'script', None) or {}
    did = sc.get('director') if isinstance(sc.get('director'), str) else sc.get('_director')
    if not isinstance(did, str) or not did:  # `"director": 2` is the script schema's version, not a director
        return None
    try:
        from ..directors import BY_ID
    except ImportError:  # a studio without the directors file still renders the house look
        BY_ID = {}
    d = dict(BY_ID.get(did) or {'id': did})
    d['look'] = LOOKS.get(did, {})
    return d


def direct(ed, shots: list[dict], script: dict | None = None) -> list[dict]:
    st = story_of(ed.ledger)
    dr = director_of(ed)
    dl = (dr or {}).get('look') or {}
    favourite = list((dr or {}).get('camera') or [])
    motif = str((getattr(ed, 'script', None) or {}).get('motif') or '').strip()
    rows = {m['id']: m for m in st.get('matches') or []}
    acts = {}
    for ai, a in enumerate(st.get('acts') or []):
        for i in a.get('ids') or []:
            acts.setdefault(i, (ai, a.get('name')))
    first_chapter = next((s['n'] for s in shots if s['visual']['type'] == 'chapter'), None)
    strongest = (st.get('moments') or [{}])[0].get('id') if st.get('moments') else None
    climax = None
    if strongest:
        # the beat that shows the strongest moment itself (not a strip or a count that includes it), after the cold open
        cands = [s for s in shots if strongest in _cited(ed, s) and (first_chapter is None or s['n'] > first_chapter)]
        own = [s for s in cands if s['visual'].get('claim') == strongest or len(_cited(ed, s)) == 1]
        pick_ = own or [s for s in cands if s['visual']['type'] not in AGGREGATE]
        climax = pick_[0]['n'] if pick_ else None
    neutral = bool(ed.ledger.get('neutral'))
    bug_date, act, prev_broll, prev_entry = None, (0, None), None, None
    ctxs: list[dict] = []
    for s in shots:
        v = s['visual']
        kind = v['type']
        fx = dict(s.get('beat_fx') or {})
        if favourite and not fx.get('camera') and kind not in ('end', 'follow'):
            fx['camera'] = favourite[s['n'] % len(favourite)]
            fx['camera_from'] = 'director'
        cited = _cited(ed, s)
        primary = v.get('claim') if v.get('claim') in cited else (max(cited, key=lambda i: ed.by[i]['fact']['date']) if cited else None)
        pf = ed.by[primary]['fact'] if primary else None
        hot = None
        if primary and not neutral and kind not in AGGREGATE:
            # the season so far AS OF the night on screen: a flashback to August shows August's record, and the result
            # of the night itself ticks into the bug while we watch
            bug_date = pf['date']
            hot = LETTER[pf['outcome']]
        for i in cited:
            if i in acts:
                act = acts[i]
                break
        derby = bool(primary and kind not in AGGREGATE and rows.get(primary, {}).get('rival'))
        cold = first_chapter is not None and s['n'] < first_chapter and kind not in ('end', 'follow')
        letterbox = (cold and kind not in ('open',)) or s['n'] == climax or kind == 'trailer' or kind in dl.get('letterbox', ())
        lower = [] if kind in SHOWS_SCORE | {'end', 'follow', 'chapter', 'open'} else _lower(ed, s, cited)
        mood = s.get('mood')
        loss = bool(pf and pf['outcome'] == 'loss' and kind in ('score', 'versus', 'illustration', 'matchday'))
        broll = fx.get('broll')
        if broll and not (broll.startswith(('beat:', 'clip:')) or broll in ('tunnel', 'terrace-crowd', 'terrace-empty', 'supporter')):
            broll = None
        if broll and broll.startswith('beat:') and not look.allowed(broll, ed.pal.bans):
            broll = None
        if not broll and (kind in DATA_CARDS or kind in ('chapter', 'form', 'race', 'versus', 'goal', 'record', 'run', 'trailer')) and not v.get('backdrop'):
            broll = look.pick(list(dl.get('broll', ())) * (kind in ('stat', 'fact', 'quote', 'press', 'ticket', 'chapter')) + look.moods_for(kind, pf, mood, derby), ed.pal.bans, f"{ed.ledger.get('club_id')}:{ed.ledger.get('season')}:{s['n']}",
                              {prev_broll} if prev_broll else set(), animate.recorded_weather(ed, s, cited))
        prev_broll = broll or v.get('backdrop') or v.get('art') or prev_broll
        entry = _entry(s, kind, fx.get('pace'), mood, prev_entry, pf, dl.get('entries'))
        if fx.get('cut') == 'meanwhile' and s['n'] > 0:
            entry = 'split'
        motif_art = look.motif_piece(motif, ed.pal.bans, ed.ledger.get('club_id') or '') if fx.get('motif') and motif else None
        if motif_art and kind not in ('illustration', 'map', 'end', 'follow') and not v.get('backdrop'):
            broll = motif_art  # the motif comes back as the picture behind the card
        prev_entry = entry
        s['cinema'] = {
            'camera': fx.get('camera'), 'pace': fx.get('pace'), 'broll': broll, 'sfx': fx.get('sfx'),
            'cam_pace': fx.get('pace') or {'terrace': 'slow', 'broadcaster': 'fast' if kind in ('versus', 'goal', 'score', 'run') else None,
                                           'trailer': 'slow' if (s['n'] == climax or kind in ('goal', 'turning')) else None}.get((dr or {}).get('id')),
            'bug': None if (neutral or bug_date is None or kind in NO_BUG or (letterbox and not dl.get('bug_on_climax'))) else
            {**{k: v_ for k, v_ in _tally(st, bug_date).items()}, 'hot': hot},
            'lower': lower, 'derby': derby, 'letterbox': letterbox, 'cold_open': cold, 'climax': s['n'] == climax,
            'entry': entry, 'hush': loss or mood == 'sad' and kind in ('score', 'versus'),
            'leak': mood in (dl.get('leak') or ('joy', 'triumph', 'anthem')) or kind in ('trailer', 'open') or s['n'] == climax,
            'act': act[0], 'act_name': act[1],
            'director': (dr or {}).get('id'), 'warm': bool(dl.get('warm')), 'crowd': bool(dl.get('crowd')),
            'sting': kind in dl.get('stings', ()),
            'slug': fx.get('slug'), 'meanwhile': fx.get('cut') == 'meanwhile',
            'motif': motif_art if (motif_art and kind in ('illustration', 'map')) else None,
        }
        ctxs.append(animate.context(ed, s, cited, pf, rows.get(primary) if primary else None, derby))
    # the owner's moving-art library (studio/cinema/library.py): who walks in, what flies in, the scene behind, the cut
    animate.choose(ed, shots, ctxs, library.load())
    return shots


def _lower(ed, s: dict, cited: list[str]) -> list[str]:
    """Contract rule 1 on screen: the first cited match whose opponent the narration names, else the first cited match —
    unless the visual already prints every match it cites (a form strip, a streak, a timeline, a race's marks)."""
    rest = [i for i in cited if i not in _shown(s)]
    if not rest:
        return []
    text = (s.get('narration') or '').lower()
    named = [i for i in rest if (ed.by[i]['fact'].get('opponent') or '').lower() in text and ed.by[i]['fact'].get('opponent')]
    return [(named or rest)[0]]


def _tally(st: dict, upto: str) -> dict:
    out = {'W': 0, 'D': 0, 'L': 0}
    for m in st.get('matches') or []:
        if m['date'] <= upto:
            out[LETTER[m['outcome']]] += 1
    return out


def _entry(s: dict, kind: str, pace: str | None, mood: str | None, prev: str | None, f: dict | None,
           house: tuple | None = None) -> str:
    """The cut into this shot, by what it is and how fast the director wants it."""
    if s['n'] == 0 or kind == 'open':
        return 'black'
    if kind in ('trailer', 'goal'):
        return 'flash'
    if kind == 'chapter':
        return 'burn' if (s.get('chapter') or 0) % 2 else 'wipe'
    if kind == 'end':
        return 'wipe'
    if kind == 'versus':
        return 'push'
    if pace == 'fast':
        return 'cut' if prev == 'whip' else 'whip'
    if pace == 'slow' or mood == 'sad':
        return 'dissolve'
    if kind == 'score' and f and f.get('outcome') == 'win':
        return 'flash'
    return (house or ('fade', 'whip', 'fade', 'push'))[s['n'] % 4]


# ------------------------------------------------------------------ the glass graphics
class Scorebug:
    def __init__(self, ink: gfx.Inks, club: str, season: str, bug: dict):
        self.ink, self.club, self.season, self.bug = ink, club, season, bug
        hot = bug.get('hot')
        before = dict(bug)
        if hot:
            before[hot] = max(0, before[hot] - 1)
        self.before = gfx.scorebug(ink, club, season, before)
        self.after = gfx.scorebug(ink, club, season, bug, hot, 1.0) if hot else None
        self.final = gfx.scorebug(ink, club, season, bug, hot, 0.0) if hot else self.before

    def __call__(self, t: float):
        k = ease_out_cubic(clamp((t - 0.15) / 0.35))
        if k <= 0:
            return None
        x = int(40 - (1 - k) * 480)
        hot = self.bug.get('hot')
        if not hot or t < 0.75:
            im = self.before
        elif t < 1.5:
            im = self.after
        else:
            im = self.final
        return im, x, 34


class LowerThird:
    def __init__(self, ink: gfx.Inks, facts: list[dict], club: str, dur: float, lead: float, at: str):
        self.items = [gfx.lower_third(ink, f, club) for f in facts]
        self.dur, self.lead, self.at = dur, lead, at
        n = len(self.items)
        span = max(1.0, dur - lead - 0.4)
        self.slots = [(lead + 0.25 + span * i / n, lead + 0.25 + span * (i + 1) / n - (0.15 if i < n - 1 else 0)) for i in range(n)]

    def __call__(self, t: float):
        for im, (a, b) in zip(self.items, self.slots):
            if a <= t < b:
                k = ease_out_cubic(clamp((t - a) / 0.35))
                ko = ease_in_out(clamp((t - (b - 0.3)) / 0.3)) if b < self.dur - 0.05 else 0
                if self.at == 'bottom':
                    x = int(60 - (1 - k) * (im.width + 80) - ko * (im.width + 80))
                    return im, x, H - 300
                x = int(W - 50 - im.width + (1 - k) * (im.width + 80) + ko * (im.width + 80))
                return im, x, 40
        return None


class Slug:
    """A screenplay slug line typed in at the start of the shot, lower left: "ATHENS — A SUNDAY IN MARCH"."""

    def __init__(self, ink: gfx.Inks, slug: str, t0: float = 0.25, hold: float = 1.8):
        self.text = slug.upper()
        self.ink, self.t0, self.hold = ink, t0, hold
        full = gfx.text(self.text, 'mono', 40, gfx.a(ink.paper), max_w=1300)
        self.size = full.height
        self._c: dict[int, Image.Image] = {}

    def _img(self, n: int) -> Image.Image:
        if n not in self._c:
            t = gfx.text(self.text[:n] + ('_' if n < len(self.text) else ''), 'mono', 40, gfx.a(self.ink.paper), max_w=1300)
            pl = Image.new('RGBA', (t.width + 40, t.height + 24), gfx.a(self.ink.ink, 215))
            ImageDraw.Draw(pl).rectangle([0, 0, 7, pl.height], fill=gfx.a(self.ink.accent))
            pl.alpha_composite(t, (24, 12))
            self._c[n] = pl
        return self._c[n]

    def __call__(self, t: float):
        tt = t - self.t0
        end = self.hold + 0.45
        if tt < 0 or tt > end:
            return None
        n = min(len(self.text), int(tt / 0.035) + 1)  # a typewriter: about 28 letters a second
        im = self._img(n)
        if tt > self.hold:
            im = im.copy()
            k = 1 - (tt - self.hold) / 0.45
            im.putalpha(im.getchannel('A').point(lambda p: int(p * k)))
        return im, 60, H - 330


class Meanwhile:
    """The parallel cut's caption: MEANWHILE, stamped small at the top."""

    def __init__(self, ink: gfx.Inks, top: int):
        t = gfx.text('MEANWHILE…', 'mono', 34, gfx.a(ink.on_accent))
        self.im = gfx.plate(t.width + 36, t.height + 18, ink.accent, shift=6)
        self.im.alpha_composite(t, (18, 9))
        self.top = top

    def __call__(self, t: float):
        if t > 2.4:
            return None
        k = 1 - clamp((t - 2.0) / 0.4)
        im = self.im if k >= 1 else self.im.copy()
        if k < 1:
            im.putalpha(im.getchannel('A').point(lambda p: int(p * k)))
        return im, int(W * 0.75 - self.im.width / 2), self.top  # over the new scene, which plays on the right of the split


class Motif:
    """The film's motif returning: its picture, taped in the corner, swaying in on its own."""

    def __init__(self, path, t0: float = 0.6):
        im = Image.open(path).convert('RGB')
        im.thumbnail((440, 300))
        card = Image.new('RGBA', (im.width + 28, im.height + 28), (244, 236, 216, 255))
        card.paste(im, (14, 14))
        self.card = card.rotate(4, expand=True, resample=Image.BICUBIC)
        self.t0 = t0

    def __call__(self, t: float):
        if t < self.t0:
            return None
        k = ease_out_back(clamp((t - self.t0) / 0.5), 1.4)
        x = W - self.card.width - 60
        y = int(170 + (1 - k) * -420 + 4 * math.sin(t * 1.3))
        return self.card, x, y


class Flash:
    def __init__(self, at: list[float], strength: int = 220, dur: float = 0.14):
        self.at, self.strength, self.d = at, strength, dur
        self._im = {}

    def __call__(self, t: float):
        for a in self.at:
            if a <= t < a + self.d:
                v = int(self.strength * (1 - (t - a) / self.d))
                v = (v // 16) * 16
                if v not in self._im:
                    self._im[v] = Image.new('RGBA', (W, H), (255, 251, 242, v))
                return self._im[v], 0, 0
        return None


class DerbyBands:
    """A derby splits the frame: the club's colour field on one edge, ink on the other, and the word."""

    def __init__(self, ink: gfx.Inks):
        self.l = Image.new('RGBA', (90, H), gfx.a(ink.accent, 235))
        self.r = Image.new('RGBA', (90, H), gfx.a(ink.ink, 235))
        ImageDraw.Draw(self.l).line([(86, 0), (86, H)], fill=gfx.a(ink.ink), width=8)
        ImageDraw.Draw(self.r).line([(4, 0), (4, H)], fill=gfx.a(ink.paper), width=8)
        w = gfx.text('DERBY', 'shout', 56, gfx.a(ink.accent), stroke=3, stroke_fill=gfx.a(ink.ink)).rotate(90, expand=True)
        self.word = w

    def __call__(self, t: float):
        k = ease_out_cubic(clamp((t - 0.1) / 0.4))
        if k <= 0:
            return None
        out = [(self.l, int(-90 * (1 - k)), 0), (self.r, int(W - 90 + 90 * (1 - k)), 0)]
        if k >= 1:
            out.append((self.word, W - 90 - self.word.width - 10, int(H / 2 - self.word.height / 2)))
        return out


def _nudge(layer, top: float, x_max: float | None) -> None:
    """Keep a screen layer out of a band at the top of the frame (under the letterbox, beside the scorebug): a layer
    whose top edge would sit in the band is drawn lower by exactly what it needs."""
    pose0 = layer.pose
    h = layer.img.height

    def pose(t, pose0=pose0):
        p = pose0(t)
        if p is None:
            return None
        y_top = p.y - h * p.scale / 2
        left = p.x - layer.img.width * p.scale / 2
        if y_top < top and (x_max is None or left < x_max) and y_top > -h * 0.5:
            p = type(p)(p.x, p.y + (top - y_top), p.scale, p.rot, p.alpha, p.reveal)
        return p
    layer.pose = pose


def dress(ed, shot, s: dict) -> None:
    """The cinema's layer on a built shot (any visual type)."""
    import os
    from ..captions import Captions
    cin = s.get('cinema')
    if not cin or os.environ.get('STORIES_CINEMA', '1') == '0':  # the kill switch: the house edit without the film layer
        return
    dur = s['frames'] / FPS
    seed = 1000 + s['n'] * 7
    lead = (s['voice_at'] - s['start']) if s.get('voice_at') is not None else 0.4
    kind = s['visual']['type']
    ink = gfx.Inks(ed.pal)
    if not shot.meta.get('cinema') and kind not in ('map', 'end') and (cin.get('camera') or cin.get('cam_pace') == 'slow'):
        shot.camera = look.move(cin.get('camera') or 'slow', dur, seed, cin.get('cam_pace'))
    if cin.get('entry') and not (shot.entry == 'black' and s['n'] == 0):
        shot.entry = cin['entry']
    shot.meta['side'] = 1 if s['n'] % 2 else -1
    animate.stage(ed, shot, s)
    shot.post.append(look.Grade(letterbox=cin.get('letterbox', False), hush=cin.get('hush', False), leak=cin.get('leak', False),
                                seed=seed, dur=dur, vignette=0.34 if cin.get('letterbox') else 0.26, warm=cin.get('warm', False)))
    for l in shot.layers:
        if l.space != 'screen' or l.img.width > W * 0.9:
            continue
        if cin.get('letterbox'):
            _nudge(l, look.LETTERBOX + 18, None)
        elif cin.get('bug'):
            _nudge(l, 150, 520)
    ovs = shot.overlay if isinstance(shot.overlay, list) else [shot.overlay] if shot.overlay else []
    caps = [o for o in ovs if isinstance(o, Captions)]
    rest = [o for o in ovs if not isinstance(o, Captions)]
    glass = []
    if cin.get('derby') and kind in ('score', 'matchday', 'ticket', 'illustration'):
        glass.append(DerbyBands(ink))
    if kind == 'score':
        f = (ed.by.get(s['visual'].get('claim') or '') or {}).get('fact') or {}
        if f.get('outcome') == 'win':
            glass.append(Flash([0.25]))
            shot.cues.append((0.27, 'sting'))
            shot.shake.append((0.3, 8))
    if shot.meta.get('flash_at'):
        glass.append(Flash(shot.meta['flash_at']))
    if cin.get('bug'):
        glass.append(Scorebug(ink, ed.ledger.get('club_name') or '', str(ed.ledger.get('season') or ''), cin['bug']))
    if cin.get('lower'):
        facts = [ed.by[i]['fact'] for i in cin['lower'] if i in ed.by]
        at = 'bottom' if kind in ('illustration', 'map', 'turning', 'trailer') else 'top'
        # a slug line owns the lower left for its first two seconds: the scoreline waits for it
        glass.append(LowerThird(ink, facts, ed.ledger.get('club_name') or '', dur, max(lead, 2.3) if (cin.get('slug') and at == 'bottom') else lead, at))
    if cin.get('motif'):
        from ..paper import beat_path
        mp = beat_path(cin['motif'])
        if mp:
            glass.append(Motif(mp))
    if cin.get('slug'):
        glass.append(Slug(ink, cin['slug']))
    if cin.get('meanwhile'):
        glass.append(Meanwhile(ink, look.LETTERBOX + 20 if cin.get('letterbox') else 40))
        shot.cues.append((0.0, 'drum'))
    shot.overlay = rest + glass + caps
    if cin.get('sfx') in SFX:
        shot.cues.append((max(0.0, lead), SFX[cin['sfx']]))
    if cin.get('hush'):
        shot.cues.append((0.2, f'hush:{min(dur, 4.0):.2f}'))
    if cin.get('entry') in ('cut',):
        shot.cues.append((0.0, 'drum'))
    if cin.get('entry') == 'burn':
        shot.cues.append((0.0, 'whoosh'))
    art = str(s['visual'].get('art') or s['visual'].get('backdrop') or cin.get('broll') or '')
    if cin.get('sting') and not any(k == 'sting' for _, k in shot.cues):
        shot.cues.append((0.05, 'sting'))
    if cin.get('crowd') or any(w in art for w in ('terrace', 'crowd', 'home-end', 'choreography', 'scarves', 'away-end', 'flags')):
        shot.cues.append((0.0, f'crowd-bed:{dur:.2f}'))
