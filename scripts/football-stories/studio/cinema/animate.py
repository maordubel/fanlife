"""The library in motion: which of the owner's moving-art pieces a beat gets, and how each one moves.

`choose(...)` runs once per film in the plan (cinema.direct), so the decision is in plan.json and identical in every
render worker: per shot 1–3 animated elements chosen by MEANING (what the beat shows, the match on screen, the story
block's tags, the era, the side, what the record says about the weather), spread over the library (never the same
piece in two shots running, the least-used first), plus the library transition into some shots and a library scene
(an era ground, a depth layer, a city, an insert, a clip) behind others.

`stage(ed, shot, s)` puts that decision on the built shot: every element ENTERS (walks in, flies in, rises, slides
in) with easing, PERFORMS (a step bob, a kick, a dive, a cheer, a float), and LEAVES before the cut. Elements sit
behind the cards and every glass graphic (scorebug, lower-thirds, captions), and on the sides, so data stays readable.

Rules held here (contract §4, rule 11, rule 95):
  · weather pieces (rain, snow, fog, storm, heat) only when a claim cited in the beat records that weather;
  · a night sky only when the claim records an evening kick-off; otherwise a neutral time of day;
  · a trophy or medal only on a final won or an honour claim in the beat; a city only when it is where the match was
    played (or the club's own city at home); nothing implying an incident the record does not hold (no riot line,
    no police, no doctor);
  · every piece is painted in the club's colour and scrubbed of the rival's families before it is drawn.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
from collections import Counter

import numpy as np
from PIL import Image

from ..common import FPS, H, INK, W, hex_rgb
from ..motion import Layer, Pose, clamp, ease_in_out, ease_out_back, ease_out_cubic
from ..paper import CANVAS, ClipWorld, cover, vignette
from . import library as L

CW, CH = CANVAS
CARD_KINDS = {'matchday', 'score', 'ticket', 'fact', 'stat', 'table', 'timeline', 'turning', 'quote', 'press',
              'form', 'race', 'record', 'run', 'versus', 'goal', 'trailer', 'chapter', 'open'}
SCENE_KINDS = {'matchday', 'score', 'ticket', 'fact', 'stat', 'table', 'timeline', 'turning', 'quote', 'press',
               'chapter', 'form', 'race', 'versus', 'goal', 'record', 'run', 'illustration'}
QUIET = {'end', 'follow', 'map'}
AGGREGATE = {'form', 'run', 'race', 'record', 'timeline', 'map', 'stat', 'table'}
CHARTS = {'form', 'race', 'record', 'run', 'timeline', 'table'}   # graphics that use the whole frame: people keep to the edges
# the weather a claim RECORDS, as whole words (a club called Rainham is not rain)
WEATHER = {'rain': r'rain|rained|raining|rainy|rainswept|drizzle|downpour|waterlogged',
           'snow': r'snow|snowed|snowing|snowy|snowfall|sleet|blizzard|frost|frosty',
           'fog': r'fog|foggy|mist|misty', 'storm': r'storm|thunderstorm|gale|gales',
           'heat': r'heatwave|scorching|sweltering'}
PIECE_WEATHER = {'rain': 'rain', 'umbrella': 'rain', 'snow': 'snow', 'fog': 'fog', 'storm': 'storm', 'haze': 'heat'}
NEVER = ('ppl-riot-line', 'ppl-policeman', 'ppl-doctor', 'ppl-physio', 'ins-tears-cheek', 'ground-demolition')
FACING = {'keeper': 'right', 'referee': 'right'}
PUPPET_MOTION = {'striker': 'kick', 'keeper': 'dive', 'defender': 'slide', 'supporter': 'cheer', 'supporter-child': 'wave',
                 'old-man': 'sway', 'referee': 'point', 'manager': 'pace', 'captain': 'lift'}


def _q(rot: float) -> float:
    """Angles in quarter degrees: invisible on screen, and a swaying figure repeats them, so the rotated picture is
    drawn once per angle and served from the layer's cache (a bicubic rotation of a figure costs ~20 ms)."""
    return round(rot * 4) / 4


class Angles(dict):
    """A layer cache that keeps a swaying figure's angles (motion.transformed reads `cap`)."""
    cap = 48


def _layer(im: Image.Image, pose) -> Layer:
    return Layer(im, pose, _cache=Angles())


def _h(*a) -> int:
    return int(hashlib.sha256(':'.join(map(str, a)).encode()).hexdigest()[:8], 16)


# ------------------------------------------------------------------ what the beat is about
def recorded_weather(ed, s: dict, cited: list[str]) -> set[str]:
    """The weather the claims cited in this beat record (their own words), as families: rain, snow, fog, storm, heat.
    A strip, a race or a count stands for many nights: one wet night among them does not make the picture rain."""
    if s['visual']['type'] in AGGREGATE:
        return set()
    facts = [ed.by[i]['fact'] for i in (list(s.get('claim_ids') or []) + list(cited)) if i in ed.by]
    blob = ' '.join(json.dumps(f, ensure_ascii=False).lower() for f in facts)
    return {w for w, rx in WEATHER.items() if re.search(rf'\b({rx})\b', blob)}


def context(ed, s: dict, cited: list[str], pf: dict | None, row: dict | None, derby: bool) -> dict:
    """Everything the choice reads, from the shot, its claims and the story block — nothing typed."""
    v = s['visual']
    kind = v['type']
    text = (s.get('narration') or '').lower()
    facts = [ed.by[i]['fact'] for i in (list(s.get('claim_ids') or []) + cited) if i in ed.by]
    weather = recorded_weather(ed, s, cited)
    kick = None
    for f in facts:
        k = str(f.get('kickoff') or f.get('kick_off') or f.get('time') or '')
        m = re.match(r'(\d{1,2})[:.h](\d\d)', k)
        if m:
            kick = int(m.group(1))
    season = str(ed.ledger.get('season') or '')
    m = re.match(r'(\d{4})', season)
    year = int(m.group(1)) if m else None
    if pf and pf.get('date'):
        year = int(pf['date'][:4])
    comp = f"{(pf or {}).get('competition') or ''} {(pf or {}).get('stage') or ''}".lower()
    tags = set((row or {}).get('tags') or [])
    honour = any(f.get('kind') == 'honour' for f in facts)
    pens = bool(pf and (pf.get('penalties') or any(f.get('kind') == 'penalties' and f.get('date') == pf.get('date')
                                                     for f in (c['fact'] for c in ed.ledger['claims']))))
    explicit = isinstance(v.get('art') or v.get('backdrop'), str) and str(v.get('art') or v.get('backdrop')).startswith(('beat:', 'clip:', 'gen:'))
    return {
        'kind': kind, 'n': s['n'], 'mood': s.get('mood'), 'text': text, 'outcome': (pf or {}).get('outcome'),
        'side': (pf or {}).get('side'), 'europe': bool(re.search(r'uefa|champions|europa|conference|cup winners|fairs|intertoto', comp)),
        'final': 'final' in comp and 'semi' not in comp and 'quarter' not in comp, 'derby': derby, 'tags': tags,
        'year': year, 'weather': weather, 'night': kick is not None and kick >= 18, 'day': kick is not None and kick < 17,
        'honour': honour, 'pens': pens or bool(re.search(r'penalt|shoot-out|shootout', text)),
        'save': bool(re.search(r'\bsave[ds]?\b|keeper|goalkeeper', text)),
        'manager': bool(re.search(r'manager|coach|gaffer', text)), 'chairman': bool(re.search(r'chairman|president|owner', text)),
        'press': kind in ('press', 'quote') or bool(re.search(r'newspaper|headline|paper said|reporter|journalist', text)),
        'memory': bool(re.search(r'remember|years later|grandfather|grandad|father|dad|son|daughter|old man|childhood|memory|still talk', text)),
        'goal_kind': kind == 'goal' or bool(re.search(r'\bscore[ds]?\b|\bgoal\b|header|volley|struck|strike', text)),
        'late': 'late-winner' in tags or bool(re.search(r'last minute|ninetieth|injury time|stoppage time|at the death', text)),
        'away_city': _city(ed, pf), 'explicit': explicit, 'claims': bool(facts),
    }


def _city(ed, pf: dict | None) -> str | None:
    from ..maps import city_of, place_of
    club = ed.ledger.get('club_name') or ''
    if pf and pf.get('side') == 'away':
        p = place_of(pf, club)
        return p[0] if p else None
    c = city_of(club)
    return c[0] if c else None


def wants(c: dict) -> dict:
    """Tiers of patterns per role, strongest meaning first. A pattern is a stem prefix, or `ground@`, `sky@`, `city@`."""
    k, out = c['kind'], {'actor': [], 'object': [], 'scene': [], 'tr': []}
    win, loss, draw = c['outcome'] == 'win', c['outcome'] == 'loss', c['outcome'] == 'draw'
    A, O, S, T = out['actor'], out['object'], out['scene'], out['tr']
    if c['pens']:
        A.append(['pup-keeper-pose', 'pup-referee-pose'])
        S.append(['clip-shootout-walk', 'clip-keeper-save', 'ins-penalty-spot'])
        O.append(['obj-ball'])
    if c['save'] and not c['pens']:
        A.append(['pup-keeper-pose'])
        S.append(['clip-keeper-save'])
    if k == 'goal' or (c['goal_kind'] and win and k in ('score', 'illustration', 'versus')):
        A.append(['pup-striker-pose'])
        S.append(['clip-late-goal-surge'] if c['late'] else [])
        S.append(['clip-goal-net-ripple', 'ins-net-bulge', 'ins-boot-strike', 'ins-ball-spin'])
        O.append(['obj-ball'])
    if c['derby']:
        A.append(['ppl-ultras-capo', 'ppl-drummer', 'sup-scarf-up', 'pup-supporter-pose'])
        O.append(['obj-drum', 'obj-flag-stick', 'obj-megaphone', 'obj-tifo-panel', 'obj-banner-rolled'])
        S.append(['layer-terrace-night', 'layer-street-march'])
        T.append(['tr-smoke-wipe', 'tr-flag-wipe'])
    if (c['final'] and win) or c['honour']:
        A.append(['pup-captain-pose', 'sup-hug', 'sup-scarf-up'])
        O.append(['obj-trophy-plain', 'obj-medal'])
        S.append(['ground-neutral-final'] if c['final'] else [])
    if c['europe'] or c['side'] == 'away':
        A.append(['sup-bus-window', 'sup-walk', 'ppl-bus-driver'])
        S.append(['city@'])
        S.append(['layer-europe-night', 'layer-away-end'] if c['europe'] else ['layer-away-end', 'layer-street-march'])
        O.append(['era-ticket-stub', 'obj-pennant', 'obj-season-ticket-book'])
        T.append(['tr-ticket-tear', 'tr-film-strip'])
    if loss:
        if 'rain' in c['weather']:
            A.append(['sup-rain'])   # the record says it rained: the supporter stands in it
        A.append(['sup-sit-step'])
        S.append(['clip-empty-after'])
        T.append(['tr-paper-crumple', 'tr-smoke-wipe'])
    if draw:
        A.append(['sup-stand-terrace', 'ppl-referee', 'pup-referee-pose'])
        O.append(['ins-stopwatch'])
    if win and not c['derby']:
        A.append(['sup-scarf-up', 'pup-supporter-pose', 'sup-hug', 'ppl-girl-flag', 'ppl-kid-ball'])
        T.append(['tr-scarf-whip', 'tr-flag-wipe'])
    if c['memory'] or k in ('record', 'chapter', 'quote', 'timeline', 'turning'):
        A.append(['pup-old-man-pose', 'sup-old', 'sup-young', 'sup-child-hand', 'pup-supporter-child-pose', 'ppl-old-woman-scarf', 'ppl-family-four'])
        O.append(['obj-programme-closed', 'obj-season-ticket-book', 'obj-rosette', 'obj-pennant', 'doc-photo-old', 'era-radio'])
        S.append(['layer-kitchen-radio', 'layer-old-ground'] if (c['year'] or 2000) < 1975 else ['layer-kitchen-radio'])
        T.append(['tr-polaroid', 'tr-film-strip'])
    if c['press']:
        A.append(['ppl-journalist', 'ppl-photographer', 'ppl-tv-presenter', 'ppl-commentator'])
        O.append(['doc-press-clipping', 'doc-telegram', 'era-newspaper-front'])
        T.append(['tr-newsprint'])
    if c['manager']:
        A.append(['pup-manager-pose', 'ppl-manager-dugout'])
        O.append(['doc-team-sheet'])
    if c['chairman']:
        A.append(['ppl-chairman'])
    if k in ('matchday', 'ticket', 'versus') or (c['side'] == 'home' and k in ('score', 'illustration')):
        A.append(['sup-turnstile', 'sup-walk', 'sup-child-hand', 'ppl-vendor', 'ppl-steward', 'ppl-player-tunnel'])
        O.append(['era-ticket-stub', 'obj-programme-closed', 'obj-turnstile', 'obj-thermos', 'obj-pie', 'obj-beer-cup', 'obj-bag-of-sweets'])
        S.append(['ground@ext', 'layer-street-march', 'layer-tunnel'])
        T.append(['tr-ticket-tear'])
    if k in ('form', 'race', 'run', 'stat', 'table', 'fact'):
        A.append(['sup-stand-terrace', 'sup-walk', 'pup-supporter-pose', 'sup-radio', 'sup-scarf-up'])
        O.append(['obj-ball', 'obj-flag-stick', 'obj-scarf', 'era-radio', 'era-scoreboard'])
        S.append(['ground@int'])   # the ground of the season's own era, then a sky
        S.append(['sky@'])
    if k in ('chapter', 'trailer', 'open'):
        A.append(['sup-walk', 'ppl-player-tunnel', 'sup-stand-terrace'])
        S.append(['ground@', 'sky@', 'layer-tunnel', 'layer-terrace-night'])
    if c['weather']:
        S.insert(0, ['layer-rain-stand', 'sky-storm'] if 'rain' in c['weather'] or 'storm' in c['weather'] else
                 ['sky-snow'] if 'snow' in c['weather'] else ['sky-fog'] if 'fog' in c['weather'] else ['sky-heat-haze'])
    # the general library, so every beat that may move has something to move
    A.append(['sup-walk', 'sup-stand-terrace', 'sup-scarf-up', 'ppl-kid-ball', 'ppl-family-four', 'ppl-drummer', 'sup-child-hand'])
    O.append(['obj-ball', 'obj-flag-stick', 'obj-pennant', 'era-ticket-stub', 'obj-programme-closed'])
    S.append(['ground@', 'sky@'])
    T.append(['tr-scarf-whip', 'tr-flag-wipe', 'tr-newsprint', 'tr-film-strip', 'tr-ticket-tear', 'tr-paper-crumple',
              'tr-smoke-wipe', 'tr-polaroid'])
    return {r: [t for t in tiers if t] for r, tiers in out.items()}


def budget(c: dict) -> tuple[int, int]:
    """(actors, objects) a shot of this kind carries."""
    k = c['kind']
    if k in QUIET:
        return 0, 0
    if c['explicit']:
        return 0, 1   # the writer's own picture already shows the scene: no second person over it, one object at most
    if k in ('illustration', 'chapter', 'open', 'turning'):
        return 2, 1
    if k in ('trailer',):
        return 1, 0
    if k in ('goal', 'versus', 'score'):
        return 1, 1
    return 1, 1 if c['n'] % 2 else 0


# ------------------------------------------------------------------ the choice over the whole film
class Picker:
    def __init__(self, lib: L.Library, bans: list[str], salt: str):
        self.lib, self.bans, self.salt = lib, bans, salt
        self.used: Counter = Counter()
        self.last: set[str] = set()

    def ok(self, p: dict, c: dict) -> bool:
        st = p['stem']
        if st.startswith(NEVER) or p['cls'] in ('sheet', 'fx', 'skip', 'thumb'):
            return False
        for w, need in PIECE_WEATHER.items():
            if w in p['words'] and need not in c['weather']:
                return False
        if p['cls'] == 'sky' and any(w in p['words'] for w in ('floodlit', 'night', 'stars')) and not c['night']:
            return False
        if p['cls'] == 'sky' and 'dawn' in p['words'] and not c['day']:
            return False
        if any(w in p['words'] for w in ('trophy', 'medal')) and not ((c['final'] and c['outcome'] == 'win') or c['honour']):
            return False
        if 'final' in p['words'] and p['cls'] == 'ground' and not c['final']:
            return False
        return True

    def matches(self, pat: str, c: dict, role: str) -> list[dict]:
        lib = self.lib
        if pat.startswith('ground@'):
            want = pat.split('@')[1] or None
            gs = [p for p in lib.of('ground') if p.get('era') and (not want or p.get('side') == want)]
            if not gs or not c['year']:
                return []
            older = [p['era'] for p in gs if p['era'] <= c['year']]
            if not older or c['year'] - max(older) >= 20:
                return []   # a ground of another age is not this season's ground: the scene comes from elsewhere
            return [p for p in gs if p['era'] == max(older)]
        if pat.startswith('sky@'):
            return [p for p in lib.of('sky')]
        if pat.startswith('city@'):
            city = re.sub(r'[^a-z0-9]+', '-', L.stem_of(f"{c['away_city'] or ''}.png") or '') if c['away_city'] else ''
            return [p for p in lib.of('city') if city and city in p['stem']]
        out = [p for p in lib.pieces if p['stem'].startswith(pat)]
        if role == 'scene':
            # a depth layer is one scene: its group, shown through its bg (or full) part
            seen, rows = set(), []
            for p in out:
                if p['cls'] == 'layer':
                    if p['group'] in seen:
                        continue
                    seen.add(p['group'])
                    rows.append({**p, 'stem': p['group'], 'key': p['group']})
                elif p['cls'] in ('sky', 'ground', 'city', 'insert', 'clip') and not p.get('keyed'):
                    rows.append(p)
            return rows
        if role == 'actor':
            return [p for p in out if p['cls'] in ('puppet', 'person', 'supporter') and p.get('keyed')]
        if role == 'object':
            return [p for p in out if p['cls'] in ('object', 'document', 'insert') and p.get('keyed')]
        if role == 'tr':
            return [p for p in out if p['cls'] == 'transition']
        return out

    def take(self, tiers: list[list[str]], c: dict, role: str, n: int, avoid: set[str]) -> list[dict]:
        got: list[dict] = []
        # THE supporter (sup-*) is one recurring man: never twice in one frame, nor beside his own puppet twin
        has_sup = any(a.startswith('sup-') for a in avoid)
        for tier in tiers:
            if len(got) >= n:
                break
            cands, seen = [], set()
            for pat in tier:
                for p in self.matches(pat, c, role):
                    st = p['stem']
                    if st in seen or st in self.last or st in avoid or any(g['stem'] == st for g in got) or not self.ok(p, c):
                        continue
                    if st.startswith('sup-') and (has_sup or any(g['stem'].startswith('sup-') for g in got)):
                        continue
                    seen.add(st)
                    cands.append(p)
            while cands and len(got) < n:
                cands.sort(key=lambda p: (self.used[p['stem']], _h(self.salt, c['n'], p['stem'])))
                pick = cands.pop(0)
                got.append(pick)
                # one figure of a kind at a time (two keepers in one frame is a mistake, not variety)
                cands = [p for p in cands if role != 'actor' or not (
                    (p['cls'] == 'puppet' and pick['cls'] == 'puppet' and p.get('figure') == pick.get('figure')) or
                    (p['stem'].startswith('sup-') and pick['stem'].startswith('sup-')))]
        return got

    def commit(self, stems: list[str]) -> None:
        for st in stems:
            self.used[st] += 1
        self.last = set(stems)


def motion_of(p: dict, c: dict) -> str:
    w = p['words']
    if p['cls'] == 'puppet':
        return PUPPET_MOTION.get(p.get('figure') or '', 'sway')
    if p['cls'] in ('object', 'document', 'insert'):
        return 'fly'
    if any(x in w for x in ('walk', 'march')) or 'child' in w and 'hand' in w:
        return 'walk'
    if any(x in w for x in ('sit', 'step', 'bus', 'window', 'radio', 'old', 'young')):
        return 'rise'
    if any(x in w for x in ('scarf', 'up', 'hug', 'drummer', 'capo', 'flag')):
        return 'cheer'
    return 'arrive'


def choose(ed, shots: list[dict], ctxs: list[dict], lib: L.Library | None) -> None:
    """Annotate each shot's cinema block with the library's elements, transition and scene (deterministic)."""
    if not lib:
        return
    pk = Picker(lib, ed.pal.bans, f"{ed.ledger.get('club_id')}:{ed.ledger.get('season')}")
    tr_used: Counter = Counter()
    last_tr, last_clip = None, -99
    clips = {p['stem'] for p in lib.of('clip')}
    for s, c in zip(shots, ctxs):
        cin = s.get('cinema')
        if cin is None or c is None:
            continue
        w = wants(c)
        na, no = budget(c)
        stems: list[str] = []
        els = []
        # the scene behind (a library ground, sky, layer, city, insert or clip) — for a strong meaning always, else
        # every other shot so the owner's b-roll still plays its part
        v = s['visual']
        if c['kind'] in SCENE_KINDS and not c['explicit'] and not v.get('backdrop') and not (c['kind'] == 'illustration' and v.get('art')):
            strong = c['derby'] or c['europe'] or c['pens'] or c['kind'] == 'goal' or bool(c['weather']) or c['outcome'] == 'loss' and c['kind'] in ('score', 'illustration')
            if strong or c['n'] % 2 == 0 or c['kind'] == 'illustration':
                # a moving clip is the dearest world to draw: one in five shots at most, where it means the most
                sc = pk.take(w['scene'], c, 'scene', 1, clips if c['n'] - last_clip < 5 else set())
                if sc and sc[0]['cls'] == 'clip':
                    last_clip = c['n']
                if sc:
                    cin['broll'] = 'lib:' + sc[0]['stem']
                    stems.append(sc[0]['stem'])
                    els.append({'key': sc[0]['stem'], 'role': 'scene', 'motion': 'parallax' if sc[0]['cls'] == 'layer' else
                                ('clip' if sc[0]['cls'] == 'clip' else 'camera')})
        actors = pk.take(w['actor'], c, 'actor', na, set(stems))
        side = 1 if _h(pk.salt, 'side', c['n']) % 2 else -1
        for i, p in enumerate(actors):
            els.append({'key': p['stem'], 'role': 'actor', 'motion': motion_of(p, c), 'side': side if i == 0 else -side})
            stems.append(p['stem'])
        objs = pk.take(w['object'], c, 'object', no, set(stems))
        for p in objs:
            els.append({'key': p['stem'], 'role': 'object', 'motion': 'fly', 'side': -side if actors else side})
            stems.append(p['stem'])
        # the library's own transition art into this shot: every chapter, and a soft cut every few shots
        entry = cin.get('entry')
        if s['n'] > 0 and c['kind'] not in QUIET and entry not in ('black', 'flash', 'split') and \
                (c['kind'] == 'chapter' or (entry in ('fade', 'dissolve', 'whip', 'push', 'wipe', 'burn') and _h(pk.salt, 'tr', c['n']) % 3 == 0)):
            tiers = [[x for x in t if x != last_tr] for t in w['tr']]
            cands = []
            for t in tiers:
                cands = [p for pat in t for p in pk.matches(pat, c, 'tr')]
                if cands:
                    break
            if cands:
                cands.sort(key=lambda p: (tr_used[p['stem']], _h(pk.salt, 'trp', c['n'], p['stem'])))
                p = cands[0]
                cin['entry_fallback'] = entry
                cin['entry'] = 'tr:' + p['stem']
                tr_used[p['stem']] += 1
                last_tr = p['stem']
                els.append({'key': p['stem'], 'role': 'transition', 'motion': 'wipe'})
        cin['lib'] = els
        pk.commit(stems)


# ------------------------------------------------------------------ pictures
def _sprite(ed, stem: str, height: int, flip: bool = False, dim: float = 0.0) -> Image.Image | None:
    lib = L.load()
    p = lib and lib.by.get(stem)
    if not p:
        return None
    out = ed.sprites_dir / f"lib-{stem}-{height}-{int(flip)}-{round(dim * 100)}.png"
    if not out.exists():
        im = Image.open(lib.path(stem)).convert('RGBA')
        s_ = height / im.height
        im = im.resize((max(1, round(im.width * s_)), height), Image.LANCZOS)
        im = L.paint(im, p.get('colour'), ed.pal.accent, ed.pal.bans)
        if flip:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        if dim:
            a = im.getchannel('A')
            im = Image.blend(im.convert('RGB'), Image.new('RGB', im.size, hex_rgb(INK)), dim).convert('RGBA')
            im.putalpha(a)
        ed.sprites_dir.mkdir(parents=True, exist_ok=True)
        tmp = out.with_suffix('.part.png')
        im.save(tmp, compress_level=1)
        tmp.replace(out)
    return Image.open(out).convert('RGBA')


def backdrop(ed, key: str, dim: float = 0.0):
    """`lib:<stem>` → a world picture path for Editor.backdrop (a clip also leaves its reader on ed._clip); None when
    the library or the piece is not here (the editor then falls back to its own b-roll)."""
    lib = L.load()
    stem = key[4:]
    if not lib:
        return None
    if stem in lib.by and lib.by[stem]['cls'] == 'clip':
        p = lib.by[stem]
        ed._clip = LibClip(lib.path(stem), ed.pal.bans, dim, accent=ed.pal.accent if p.get('colour') == 'kr' else None)
        first = ed._clip(0)
        return ed.world_image(f'lib-clip-{stem}-{round(dim * 100)}', lambda: first)
    grp = lib.group(stem)
    p = (grp.get('bg') or grp.get('full')) if grp else lib.by.get(stem)
    if not p or p.get('keyed'):
        return None

    def make():
        im = cover(Image.open(lib.path(p['stem'])).convert('RGB'), CANVAS)
        im = L.paint(im, p.get('colour'), ed.pal.accent, ed.pal.bans)
        im = vignette(im, 0.3)
        if dim:
            im = Image.blend(im, Image.new('RGB', im.size, hex_rgb(INK)), dim)
        return im
    return ed.world_image(f"lib-{p['stem']}-{round(dim * 100)}", make)


class LibClip(ClipWorld):
    """A library clip as a moving world: the house ClipWorld, decoded at the clip's own 720p (the owner's clips are
    made there; the canvas is only a resample of it), painted through `paint_fast`, then scaled to the canvas — a
    six-second clip behind a goal costs about what a still does."""
    WORK = (1280, 720)

    def __init__(self, path, bans=None, dim: float = 0.0, accent: str | None = None):
        super().__init__(path, bans, dim, size=self.WORK, accent=accent)

    def _read(self):
        size = self.w * self.h * 3
        buf = self.proc.stdout.read(size) if self.proc.stdout else b''
        if len(buf) < size:
            self.close()
            return None
        a = np.frombuffer(buf, np.uint8).reshape(self.h, self.w, 3)
        a = L.paint_fast(a, 'kr' if self.accent else None, self.accent, self.bans)
        a = np.clip(a * self.mul + self.add, 0, 255).astype('uint8')
        return Image.fromarray(a, 'RGB').resize(CANVAS, Image.BILINEAR)


# ------------------------------------------------------------------ motion
def _enter_exit(t: float, dur: float, t0: float, d_in: float = 0.7, d_out: float = 0.55) -> tuple[float, float]:
    """(k_in, k_out): eased 0→1 entering from t0, and 0→1 leaving over the last d_out seconds (none in a short shot)."""
    k_in = ease_out_cubic(clamp((t - t0) / d_in))
    k_out = ease_in_out(clamp((t - (dur - d_out - 0.05)) / d_out)) if dur > 3.0 else 0.0
    return k_in, k_out


def pivot_pose(px: float, py: float, h: float, rot: float, alpha: float = 1.0) -> Pose:
    """The pose that turns an image `rot` degrees (counter-clockwise) about its bottom centre (px, py)."""
    rot = _q(rot)
    r = math.radians(rot)
    return Pose(px - h / 2 * math.sin(r), py - h / 2 * math.cos(r), 1.0, rot, alpha)


def actor_layer(im: Image.Image, motion: str, side: int, dur: float, t0: float, x: float, foot: float, n: int) -> Layer:
    """A person or puppet that enters, performs and leaves. `x` = where it stands, `foot` = the ground line (screen)."""
    w, h = im.width, im.height
    off = W / 2 + side * (W / 2 + w)          # off-screen on its own side
    ph = (n % 7) * 0.37

    if motion == 'walk':   # across the whole frame, a step bob and a sway, in at one side, out at the other
        span = max(2.6, dur - t0 - 0.2)

        def pose(t):
            if t < t0:
                return None
            u = (t - t0) / span
            if u > 1.05:
                return None
            xx = off + (W / 2 - side * (W / 2 + w) - off) * u
            step = abs(math.sin((t - t0) * 5.4 + ph))
            return Pose(xx, foot - h / 2 - 9 * step, 1.0, _q(side * 1.6 * math.sin((t - t0) * 5.4 + ph)), 1.0)
        return _layer(im, pose)

    if motion == 'rise':   # up from the bottom edge, a slow breath, back down at the end
        def pose(t):
            if t < t0:
                return None
            ki, ko = _enter_exit(t, dur, t0, 0.8)
            y = foot - h / 2 + (1 - ki) * (h + 120) + ko * (h + 120) + 3 * math.sin(t * 1.6 + ph)
            return Pose(x, y, 1.0, _q(0.8 * math.sin(t * 0.9 + ph)), 1.0)
        return _layer(im, pose)

    if motion == 'kick':   # run in, plant, wind up, strike through (turning about the planted foot), hold, leave
        t_hit = t0 + 1.15

        def pose(t):
            if t < t0:
                return None
            ki, ko = _enter_exit(t, dur, t0, 0.8)
            xx = off + (x - off) * ki - ko * side * (W / 2 + w)
            run = (1 - ki) * 8 * abs(math.sin(t * 9))
            if t < t_hit - 0.3:
                rot = 0.0
            elif t < t_hit:
                rot = -side * 7 * ease_in_out((t - (t_hit - 0.3)) / 0.3)        # lean back, away from the ball
            else:
                k = clamp((t - t_hit) / 0.22)
                rot = -side * (7 - 23 * ease_out_back(k, 2.2)) if k < 1 else side * (16 - 16 * ease_in_out(clamp((t - t_hit - 0.22) / 1.2)))
            return pivot_pose(xx, foot - run, h, rot)
        return _layer(im, pose)

    if motion == 'dive':   # a keeper's dive: set, then up and out along an arc, laid flat on the ground, and away
        t_go = t0 + 0.9

        def pose(t):
            if t < t0:
                return None
            ki, ko = _enter_exit(t, dur, t0, 0.6)
            xx = off + (x - off) * ki
            if t < t_go:
                return Pose(xx, foot - h / 2 + 4 * math.sin(t * 6), 1.0, 0, 1.0)
            k = clamp((t - t_go) / 0.8)
            arc = math.sin(math.pi * min(1.0, k * 1.15))
            # towards the edge of the frame he stands at (the card keeps the middle); he leaves that way at the end
            x2 = xx + side * 300 * ease_out_cubic(k) + side * ko * (W / 2)
            y2 = foot - h / 2 - 240 * arc + 0.22 * h * ease_out_cubic(k)
            return Pose(x2, y2, 1.0, _q(-side * 72 * ease_out_cubic(k)), 1.0)
        return _layer(im, pose)

    if motion in ('cheer', 'wave', 'lift'):   # in, then hops of joy that die away, a sway
        def pose(t):
            if t < t0:
                return None
            ki, ko = _enter_exit(t, dur, t0)
            xx = off + (x - off) * ki - ko * side * (W / 2 + w)
            tt = t - t0 - 0.6
            hop = 34 * abs(math.sin(tt * 4.2)) * math.exp(-max(0, tt) / 3.2) if tt > 0 else 0
            amp = {'cheer': 3.0, 'wave': 5.0, 'lift': 2.0}[motion]
            return Pose(xx, foot - h / 2 - hop, 1.0, _q(amp * math.sin(t * 3.1 + ph)), 1.0)
        return _layer(im, pose)

    if motion == 'slide':   # a defender's slide: in fast along the ground, a lean, a stop
        def pose(t):
            if t < t0:
                return None
            k = ease_out_cubic(clamp((t - t0) / 0.6))
            ko = _enter_exit(t, dur, t0)[1]
            return pivot_pose(off + (x - off) * k - ko * side * (W / 2 + w), foot, h, side * 12 * (1 - k) + side * 3)
        return _layer(im, pose)

    # arrive · sway · point · pace: slide in, live there (weight shifts, a turn of the shoulders), slide out
    def pose(t):
        if t < t0:
            return None
        ki, ko = _enter_exit(t, dur, t0)
        xx = off + (x - off) * ki - ko * side * (W / 2 + w)
        if motion == 'pace':
            xx += 40 * math.sin((t - t0) * 0.9)
        bob = 4 * math.sin(t * 2.2 + ph)
        rot = {'point': 4 * math.sin(t * 1.4 + ph), 'sway': 2.4 * math.sin(t * 1.1 + ph)}.get(motion, 1.4 * math.sin(t * 1.7 + ph))
        return pivot_pose(xx, foot + bob * 0.3, h, rot)
    return _layer(im, pose)


def object_layer(im: Image.Image, side: int, dur: float, t0: float, rest: tuple[float, float], n: int) -> Layer:
    """An object that flies in on an arc, spinning, lands with a little overshoot, floats, and is thrown out again."""
    rx, ry = rest
    sx, sy = W / 2 + side * (W / 2 + im.width), -im.height
    rest_rot = (8 if side > 0 else -8) * (1 if n % 2 else -1)
    ph = (n % 5) * 0.5

    def pose(t):
        if t < t0:
            return None
        k = clamp((t - t0) / 0.75)
        e = ease_out_back(k, 1.25)
        x = sx + (rx - sx) * e
        y = sy + (ry - sy) * ease_out_cubic(k) - 160 * math.sin(math.pi * k) * (1 - k)
        rot = rest_rot + side * 540 * (1 - ease_out_cubic(k))
        if k >= 1:
            x += 3 * math.sin(t * 1.3 + ph)
            y += 5 * math.sin(t * 1.9 + ph)
            rot = rest_rot + 2 * math.sin(t * 1.1 + ph)
        if dur > 3.0:
            ko = ease_in_out(clamp((t - (dur - 0.6)) / 0.5))
            if ko > 0:
                x += side * ko * (W / 2)
                y += ko * 260
                rot += side * 140 * ko
        return Pose(x, y, 1.0, round(rot * 2) / 2, 1.0)
    return _layer(im, pose)


def parallax_layer(im: Image.Image, shot, factor: float, drift: float, rise: float, dur: float) -> Layer:
    """A depth plane on the glass: it moves against the camera by `factor` (the world moves at 1), drifts on its own,
    and rises into place at the start."""
    def pose(t):
        z, cx, cy = shot.camera(t)
        dx = -(cx - CW / 2) * z * (factor - 1) - drift * ease_in_out(clamp(t / max(dur, 0.5)))
        dy = -(cy - CH / 2) * z * (factor - 1) * 0.6 + rise * (1 - ease_out_cubic(clamp(t / 0.8)))
        return Pose(W / 2 + dx, H / 2 + dy, 1.0, 0.0, 1.0)
    return _layer(im, pose)


def stage(ed, shot, s: dict) -> None:
    """Put the plan's library elements on a built shot (behind the cards and the glass graphics)."""
    cin = s.get('cinema') or {}
    els = cin.get('lib') or []
    lib = L.load()
    if not els or not lib:
        if str(shot.entry).startswith('tr:'):
            shot.entry = cin.get('entry_fallback') or 'fade'
        return
    dur = shot.duration
    kind = s['visual']['type']
    card = kind in CARD_KINDS
    dim = 0.16 if card else 0.0
    lead = (s['voice_at'] - s['start']) if s.get('voice_at') is not None else 0.4
    back, front = [], []
    i_actor = 0
    for e in els:
        role, key, side = e['role'], e['key'], e.get('side', 1)
        if role == 'scene' and e['motion'] == 'parallax':
            grp = lib.group(key)
            for part, fac, drift, rise in (('mid', 1.22, 30, 60), ('fg', 1.55, 70, 160)):
                p = grp.get(part)
                if not p or not p.get('keyed'):
                    continue
                pim = Image.open(lib.path(p['stem'])).convert('RGBA')
                pim = cover_rgba(pim, (int(W * 1.14), int(H * 1.14)))
                pim = L.paint(pim, p.get('colour'), ed.pal.accent, ed.pal.bans)
                if card:
                    pim = _dim(pim, 0.38 if part == 'fg' else 0.3)
                back.append(parallax_layer(pim, shot, fac, drift * (1 if s['n'] % 2 else -1), rise, dur))
            continue
        if role == 'actor':
            p = lib.by.get(key)
            if not p:
                continue
            chart = kind in CHARTS
            hh = int(H * (0.42 if chart else 0.52 if card else 0.62) * (0.8 if p['cls'] == 'puppet' and p.get('figure') == 'keeper' else 1))
            hh = int(hh * (0.92 if e['motion'] == 'rise' else 1))
            # a puppet turns to face the middle of the frame (the sheets face one way: the keeper right, the rest left)
            facing = FACING.get(p.get('figure') or '', 'left')
            flip = p['cls'] == 'puppet' and ((facing == 'right') == (side > 0))
            im = _sprite(ed, key, hh, flip=flip, dim=0.3 if chart else dim)
            if im is None:
                continue
            x = W * (0.5 + side * (0.41 if chart else 0.36 if card else 0.27)) if e['motion'] != 'walk' else 0
            t0 = max(0.15, min(lead, 0.8)) + 0.35 * i_actor
            front.append(actor_layer(im, e['motion'], side, dur, t0, x, H - 18, s['n'] + i_actor))
            shot.cues.append((t0, 'whoosh' if e['motion'] in ('walk', 'kick', 'dive', 'slide') else 'pop'))
            i_actor += 1
        elif role == 'object':
            p = lib.by.get(key)
            if not p:
                continue
            im = _sprite(ed, key, int(H * (0.26 if p['cls'] == 'document' else 0.2)), dim=dim)
            if im is None:
                continue
            if im.width > W * 0.3:
                im = im.resize((int(W * 0.3), int(im.height * W * 0.3 / im.width)), Image.LANCZOS)
            rest = (W * (0.5 + side * 0.4), H * (0.7 if card else 0.66))
            t0 = 0.5 + 0.2 * i_actor
            front.append(object_layer(im, side, dur, t0, rest, s['n']))
            shot.cues.append((t0 + 0.7, 'pop'))
    if str(shot.entry).startswith('tr:'):
        tr = Transition.of(ed, shot.entry[3:], 1 if s['n'] % 2 else -1)
        if tr:
            shot.meta['tr_fn'] = tr
            shot.cues.append((0.0, 'whoosh'))
        else:
            shot.entry = cin.get('entry_fallback') or 'fade'
    # behind everything the shot already holds (its card, its caption): depth planes, then people and objects
    shot.layers = back + front + shot.layers


def cover_rgba(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    w, h = size
    s = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def _dim(im: Image.Image, k: float) -> Image.Image:
    a = im.getchannel('A')
    out = Image.blend(im.convert('RGB'), Image.new('RGB', im.size, hex_rgb(INK)), k).convert('RGBA')
    out.putalpha(a)
    return out


# ------------------------------------------------------------------ the transition art
class Transition:
    """The owner's transition piece AS the cut. A full picture (a torn panel) slides over the old shot, holds a beat and
    slides off the other way onto the new one; a cut-out piece (a scarf, a ticket, a flag) sweeps across and the new
    shot is revealed behind it, exactly where it has passed."""
    DUR = 0.78

    def __init__(self, img: Image.Image, keyed: bool, side: int, paint=None):
        self.keyed, self.side = keyed, side
        paint = paint or (lambda im: im)   # applied AFTER every resample: a resize after the scrub can make a banned hue
        if keyed:
            h = int(H * 1.08)
            im = img.resize((max(1, int(img.width * h / img.height)), h), Image.LANCZOS)
            if im.width < W * 0.45:
                im = im.resize((int(W * 0.45), int(im.height * W * 0.45 / im.width)), Image.LANCZOS)
            im = paint(im)
            self.im = im.transpose(Image.FLIP_LEFT_RIGHT) if side < 0 else im
        else:
            pw = W + 160
            im = paint(cover(img.convert('RGB'), (pw, H))).convert('RGBA')
            rng = np.random.default_rng(len(img.tobytes()) % 9973)
            a = np.full((H, pw), 255, np.uint8)
            jag = np.cumsum(rng.normal(0, 3.2, H)).clip(-26, 26) + 34
            jag2 = np.cumsum(rng.normal(0, 3.2, H)).clip(-26, 26) + 34
            xs = np.arange(pw)[None, :]
            a[(xs < jag[:, None])] = 0
            a[(xs > pw - jag2[:, None])] = 0
            im.putalpha(Image.fromarray(a, 'L'))
            # the paper's own edge: a thin cream rim on the torn sides
            rim = np.zeros((H, pw), bool)
            rim |= (xs >= jag[:, None]) & (xs < jag[:, None] + 7)
            rim |= (xs <= pw - jag2[:, None]) & (xs > pw - jag2[:, None] - 7)
            arr = np.asarray(im).copy()
            arr[rim] = (244, 236, 216, 255)
            self.im = Image.fromarray(arr, 'RGBA')

    @staticmethod
    def of(ed, stem: str, side: int) -> 'Transition | None':
        lib = L.load()
        p = lib and lib.by.get(stem)
        if not p:
            return None
        im = Image.open(lib.path(stem))
        im = im.convert('RGBA') if p.get('keyed') else im.convert('RGB')
        return Transition(im, bool(p.get('keyed')), side, lambda x: L.paint(x, p.get('colour'), ed.pal.accent, ed.pal.bans))

    def __call__(self, t: float, frame: np.ndarray, prev: np.ndarray | None) -> np.ndarray:
        if t >= self.DUR or prev is None:
            return frame
        k = t / self.DUR
        sd = self.side
        if self.keyed:   # the piece sweeps across; behind its centre line the new shot, ahead of it the old one
            e = ease_in_out(k)
            pw = self.im.width
            cx = (W + pw / 2) - e * (W + pw) if sd > 0 else -pw / 2 + e * (W + pw)
            edge = int(clamp(cx, 0, W))
            out = frame.copy()
            if sd > 0:
                out[:, :edge] = prev[:, :edge]
            else:
                out[:, edge:] = prev[:, edge:]
            base = Image.fromarray(out)
            base.paste(self.im, (int(cx - pw / 2), int(H / 2 - self.im.height / 2)), self.im)
            return np.asarray(base)
        # a torn panel: in over the old shot (0–0.42), a beat (0.42–0.55), off the other way onto the new shot
        pw = self.im.width
        if k < 0.42:
            e = ease_in_out(k / 0.42)
            x = int((W if sd > 0 else -pw) + e * ((W - pw) / 2 - (W if sd > 0 else -pw)))
            base = prev
        elif k < 0.55:
            x = int((W - pw) / 2)
            base = prev
        else:
            e = ease_in_out((k - 0.55) / 0.45)
            x0 = (W - pw) / 2
            x = int(x0 + e * ((-pw if sd > 0 else W) - x0))
            base = frame
        b = Image.fromarray(base)
        b.paste(self.im, (x, 0), self.im)
        return np.asarray(b)
