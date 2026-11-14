"""DOCU as the studio's engine (owner, 9.11.2026: "from now on this is the graphic minimum").

The pipeline's plan — every shot with its own start, length, narration, word timings, claims and the owner picture chosen for
it — drawn in the DOCU look instead of the paper board: the owner's art full frame with a slow move, the scoreboard with
both crests, chapter tickets, the ledger, rule cards, lead banners, the follow card and the channel card. The timing is the
plan's to the frame, so the pipeline's own narrator, crowd and music mix (audio.build_mix) lands where it always did; the
picture is silent and carries burned subtitles cut from the narrator's word timings.

Every figure on screen is read from a claim (score, date, competition, ground, scorer, minute) or written by the script the
claim check already passed. Nothing here invents a number.

    engine 'docu' — the default for a documentary film (STORIES_DOCU=0 or look 'vox' / 'vox-hf' / 'classic' keep the old ones)
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import time
from datetime import date as Date
from pathlib import Path

from ..common import FPS, Palette, StageError, read_json, write_json
from . import build as B
from . import editor as E
from . import explainer as X
from .designer import Designer

ENGINE = 'docu'
OLD = ('vox', 'vox-hf', 'classic', 'paper')
NAMED = {'tunnel': 'beat:common/tunnel-walk-out', 'terrace-crowd': 'beat:common/terrace-full-kr',
         'terrace-empty': 'beat:common/old-ground-wide-kr', 'supporter': 'beat:common/supporter-cap-old-ground'}
FOLLOW = ('follow-seat-kept-kr', 'follow-turnstile-welcome-kr', 'follow-away-end-gap-kr', 'follow-pub-door-kr')
WORDS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN']
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
NEUTRAL = '#2B2A33'   # an opponent with no recorded colour wears ink, never a guessed kit


def wanted(brief: dict | None) -> bool:
    b = brief or {}
    if os.environ.get('STORIES_DOCU', '1') == '0':
        return False
    # Only an explicit request for an older engine keeps it; a picture style (collage, night, mixed, papercut…) is a
    # mood the writer reads, not an engine, so it still gets the DOCU minimum.
    if (b.get('look') or b.get('engine')) in OLD or b.get('visual_style') == 'classic':
        return False
    return True


def long_date(iso: str | None) -> str:
    if not iso:
        return ''
    try:
        d = Date.fromisoformat(str(iso)[:10])
    except ValueError:
        return ''
    return f'{d.day} {MONTHS[d.month - 1]} {d.year}'


def media(key: str | None) -> Path | None:
    from ..paper import beat_path, clip_path
    if not key:
        return None
    key = NAMED.get(key, key)
    return beat_path(key) or clip_path(key)


def crests(names: list[str]) -> dict[str, str | None]:
    """The marketing kit's crest finder (the owner's packs first, then the shared crest library), asked once for the film."""
    names = sorted({n for n in names if n})
    if not names:
        return {}
    vis = Path(__file__).resolve().parents[4] / 'scripts' / 'marketing' / 'kit' / 'visual.mjs'
    js = (f"const m=await import({json.dumps(vis.as_uri())});const o={{}};"
          f"for(const n of {json.dumps(names)}){{try{{o[n]=await m.crestPath(n)}}catch{{o[n]=null}}}}console.log(JSON.stringify(o))")
    try:
        r = subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True, timeout=90)
        return json.loads(r.stdout.strip().splitlines()[-1]) if r.returncode == 0 and r.stdout.strip() else {n: None for n in names}
    except Exception:
        return {n: None for n in names}


class Adapter:
    """plan + ledger + palette → DOCU beats at the plan's own times, and the pictures they need."""

    def __init__(self, job_dir: Path, plan: dict, palette: Palette, ledger: dict, script: dict):
        self.jd, self.plan, self.pal, self.led, self.script = job_dir, plan, palette, ledger, script
        self.by = {c['id']: c for c in ledger.get('claims', [])}
        self.files: dict[str, Path] = {}
        self.club = palette.club_name
        self.cues: dict[int, list] = {}
        self.shown: dict[int, Path] = {}             # shot → the picture it shows (spare() keeps neighbours apart)
        self.spares: dict[int, Path | None] = {}     # shot → the spare picture it was given
        self._picker = None                          # the media index's view of this film (studio/media_index.py)
        self.explainable: dict[int, bool] = {}       # shot → its data could carry an explainer passage (docu/explainer.py)
        self.sheet = {int(k): v for k, v in (plan.get('sheet') or {}).get('beats', {}).items()} if isinstance(plan.get('sheet'), dict) else {}
        self.foci: dict[str, str | None] = {}        # picture → where its detail look looks
        self.horizons: dict[str, float | None] = {}  # picture → where its foreground band begins (the camera's near plane)
        self.lib_used: list[str] = []                # the library pieces this film put on screen
        self.last: str | None = None                 # the rich device of the shot before (two city splits never run back to back)
        names = [palette.club_name]
        for c in self.by.values():
            f = c.get('fact') or {}
            if f.get('kind') == 'match':
                names += [f.get('home'), f.get('away'), f.get('opponent')]
        self.crest = crests(names)
        self.keys: dict[int, str] = {}               # shot → the key of the picture it shows (the designer reads its index entry)
        self.also: dict[int, list[str]] = {}         # shot → the further pictures a long line was given
        self.design = Designer(self)                 # the richer devices, each only when the beat's data earns it (docu/designer.py)

    # ── assets ──────────────────────────────────────────────────────────────────────────────────────────────────────
    def asset(self, p: Path | str | None, prefix: str = 'a') -> str | None:
        if not p:
            return None
        p = Path(p)
        if not p.exists():
            return None
        name = f'{prefix}-{hashlib.sha1(str(p).encode()).hexdigest()[:10]}{p.suffix.lower()}'
        self.files[name] = p
        return name

    def crest_of(self, name: str | None) -> str | None:
        if not name:
            return None
        own = Path(__file__).resolve().parents[4] / 'public' / 'crests' / f'{self.pal.club_id}.png'
        if name == self.club and own.exists():
            return self.asset(own, 'crest')
        return self.asset(self.crest.get(name), 'crest')

    def picture(self, s: dict) -> tuple[str | None, bool]:
        v = s['visual']
        p = None
        for key in (s.get('required_asset'), v.get('art') if v['type'] == 'illustration' else None, v.get('backdrop'),
                    (s.get('cinema') or {}).get('broll')):
            # `lib:` is the owner's moving-art library (cinema/animate.choose put it in the plan): its scene, painted
            p = self.lib_scene(key) if str(key or '').startswith('lib:') else media(key) if key and key != 'paper' else None
            if p:
                self.keys[s['n']] = NAMED.get(key, key)
                if s['n'] not in self.shown:   # the plan's own choice is a use too: the index keeps away from it elsewhere
                    self.picker.use(self.keys[s['n']], s['n'], s.get('start'))
                break
        if not p and v['type'] == 'follow':
            p = media(f'beat:common/{FOLLOW[s["n"] % len(FOLLOW)]}')
        p = p or self.spare(s['n'])
        if not p:
            return None, False
        self.shown[s['n']] = p
        return self.asset(p, 'img'), p.suffix.lower() == '.mp4'

    @property
    def picker(self):
        """The media index, as this film sees it (studio/media_index.py): its club, the colour families its palette
        refuses in a picture, its decade, and what the last films showed. Built on first use, once."""
        if self._picker is None:
            from .. import media_index as MI
            self._picker = MI.Picker(MI.build(), self.pal.club_id, self.pal.render_bans, MI.era_of(self.led.get('season')), self.jd.name)
        return self._picker

    def query(self, n: int) -> dict:
        from .. import media_index as MI
        s = next((x for x in self.plan.get('shots') or [] if x['n'] == n), None) or {'n': n, 'visual': {'type': 'illustration'}}
        return {**MI.beat_query(s, (self.sheet.get(n) or {}).get('emotion')), 't': s.get('start')}

    def spare(self, n: int) -> Path | None:
        """The picture for a shot that has none of its own. First it was always `terrace-full-kr`, then the least recently
        used of ten crowd pictures (batch 1's SPARE). Now the media index chooses (owner, 12.11.2026: "real index
        management"): the picture whose subject and mood fit the beat, of this club or of any, never another club's,
        fresh against this film and the last films — and never the picture of the shot before."""
        if n in self.spares:   # a shot may ask twice (its background and its card): the same picture both times
            return self.spares[n]
        mine = self.own_picture(n)
        if mine:   # the named person's own picture comes first (docs/rules/studio-pictures.md 2–3)
            self.spares[n] = self.ink(Path(mine['path']))
            self.keys.setdefault(n, mine['id'])
            return self.spares[n]
        before = self.keys.get(max((k for k in self.keys if k < n), default=-1))
        q = self.query(n)
        av = ({before} if before else set()) | self.people_pictures(n)
        r = self.picker.pick(q, avoid=av) or self.picker.pick(q, avoid=self.people_pictures(n))
        self.spares[n] = self.ink(Path(r['path'])) if r else None
        if r:
            self.keys.setdefault(n, r['id'])
        return self.spares[n]

    def related(self, n: int, i: int) -> str | None:
        """Another picture for a line so long that three looks at its own picture are not enough (docu/editor.looks): the
        index's next best for the same beat, never the one this shot already shows."""
        own = self.keys.get(n)
        r = self.picker.pick({**self.query(n), 'n': n}, avoid=({own} if own else set()) | self.people_pictures(n))
        if r:
            self.also.setdefault(n, []).append(r['id'])
        return self.asset(self.ink(Path(r['path'])), 'img') if r else None

    def ink(self, path: Path) -> Path:
        """The library picture redrawn in the house inks with the club's colour as the one accent (paper.inked; editing
        rule 1). Cached per job; a clip or an unreadable file is passed through."""
        if path.suffix.lower() not in ('.jpg', '.jpeg', '.png', '.webp'):
            return path
        out = self.jd / 'inked' / f'{path.stem}-{hashlib.sha1(str(path).encode()).hexdigest()[:8]}.jpg'
        if not out.exists():
            try:
                from PIL import Image
                from ..paper import inked
                out.parent.mkdir(parents=True, exist_ok=True)
                with Image.open(path) as im:
                    inked(im, self.pal.accent).save(out, quality=90)
            except OSError:
                return path
        return out

    def focus(self, src: str) -> str | None:
        """Where a detail look should look on this picture: the busiest part of it (most edges), as a transform origin —
        a close-up of empty paper or sky is a look at nothing. Kept off the very edges so the push stays inside the frame."""
        if src not in self.foci:
            self.foci[src] = None
            try:
                import numpy as np
                from PIL import Image
                with Image.open(self.files[src]) as im:
                    a = np.asarray(im.convert('L').resize((96, 54)), dtype='float32')
                g = np.abs(np.diff(a, axis=0))[:, :-1] + np.abs(np.diff(a, axis=1))[:-1, :]
                cells = [(float(g[r * 17:(r + 1) * 17 + 2, c * 23:(c + 1) * 23 + 3].mean()), c, r) for r in range(3) for c in range(4)]
                _, c, r = max(cells)
                self.foci[src] = f'{(26, 42, 58, 74)[c]}% {(30, 50, 68)[r]}%'
            except Exception:  # noqa: BLE001 — a clip, a missing file: the editor's fixed corners
                pass
        return self.foci[src]

    def horizon(self, src: str) -> float | None:
        """Where this picture's foreground band begins (studio/camera.horizon), read once per picture: the near plane of
        the camera's parallax. None for a picture with no such line — the camera then lifts its lower part by default."""
        if src not in self.horizons:
            from .. import camera as C
            self.horizons[src] = C.horizon(self.files[src]) if src in self.files else None
        return self.horizons[src]

    def backdrop(self, n: int) -> dict | None:
        """The picture for the rest of a beat whose card has left (docu/editor.cut): the beat's own, else a spare."""
        s = next((x for x in self.plan['shots'] if x['n'] == n), None)
        return self.back(s, 'push') if s else None

    # ── the moving-art library (cinema/library.py, chosen per shot by cinema/animate.choose) ──────────────────────────
    # The worker syncs the owner's "Dynamic Football Fan Art" every run and the plan names pieces for every shot, but
    # only the classic engine drew them: DOCU read `lib:` keys as nothing and showed a spare crowd picture instead.
    def lib_scene(self, key: str) -> Path | None:
        """`lib:<stem>` → the scene behind a shot: a ground, a sky, a city or a layer's background as a still painted in
        the club's colour (library.paint, as the classic engine paints it), or a clip that needs no painting. None when
        the library or the piece is not on this machine — the shot then borrows a spare, as before."""
        from PIL import Image
        from ..cinema import library as L
        from ..paper import cover
        lib, stem = L.load(), key[4:]
        if not lib:
            return None
        if stem in lib.by and lib.by[stem]['cls'] == 'clip':
            # a `-kr` clip is repainted frame by frame in the classic engine; here it plays as made, so only a clip
            # that carries no colour to repaint is taken
            return lib.path(stem) if lib.by[stem].get('colour') != 'kr' else None
        grp = lib.group(stem)
        piece = (grp.get('bg') or grp.get('full')) if grp else lib.by.get(stem)
        if not piece or piece.get('keyed'):
            return None
        out = self.jd / 'lib' / f"{piece['stem']}.jpg"
        if not out.exists():
            out.parent.mkdir(parents=True, exist_ok=True)
            im = L.paint(cover(Image.open(lib.path(piece['stem'])).convert('RGB'), (B.W, B.H)), piece.get('colour'), self.pal.accent, self.pal.render_bans)
            im.save(out, quality=90)
        self.lib_used.append(piece['stem'])
        return out

    FIGURE = re.compile(r'(^|[/:])(pup|ppl|fig|sup|person|player)-', re.I)   # a cut-out that is a person (the rest are objects)

    def named(self, text: str) -> bool:
        """Does this line name a real person? Names the narrator knows (studio/kit/pronounce/lexicon.json) and the match's
        scorers. A line that names someone never gets a generic figure (rule model-film 19; owner, 14.11.2026: "a player
        named in the film appears only in a picture tagged for him, right in look and era — otherwise a card")."""
        if not hasattr(self, '_names'):
            names: set[str] = set()
            try:
                lex = json.loads((Path(__file__).resolve().parents[1] / 'kit' / 'pronounce' / 'lexicon.json').read_text())
                names |= {k for k in (lex.get('names') or {}) if k[:1].isupper() and len(k) > 3}
            except (OSError, ValueError):
                pass
            for f in (self.led.get('facts') or []) if isinstance(self.led, dict) else []:
                for x in (f.get('fact') or {}).get('scorers') or []:
                    if isinstance(x, dict) and x.get('name'):
                        names.add(x['name'])
            self._names = names
        return bool(self.names_on(text))

    def names_on(self, text: str) -> list[str]:
        """The real people this line names (see `named`), longest name first."""
        if not hasattr(self, '_names'):
            self.named('')
        low = text or ''
        return [n for n in sorted(self._names, key=len, reverse=True) if re.search(r'\b' + re.escape(n) + r'\b', low)]

    def own_picture(self, n: int) -> dict | None:
        """A picture made for the person this line names (studio/looks.py → Flow → `person-<slug>-<era>-…`), of the
        film's era when there is one. Found: it is the beat's picture. Not found: the person is written to the job's Flow
        orders (`missing_people`, flow-people.json) and the line keeps its card or place picture."""
        from .. import looks
        s = next((x for x in self.plan.get('shots') or [] if x['n'] == n), None) or {}
        names = self.names_on(s.get('narration') or '')
        if not names:
            return None
        era = looks.era_of(self.led.get('season') if isinstance(self.led, dict) else '')
        for name in names:
            tag = f'person-{looks.slug(name)}-'
            mine = [r for r in self.picker.records if tag in r['id']]
            if era:
                mine = [r for r in mine if f'-{era}-' in r['id']] or [r for r in mine if not re.search(r'-\d{4}s-', r['id'])]
            if mine:
                r = sorted(mine, key=lambda r: (r['id'] in self.picker.shots, r['id']))[0]   # a pose not shown yet first
                if n not in self.picker.shots.get(r['id'], set()):
                    self.picker.use(r['id'], n, s.get('start'), why=[f'tagged for {name}'])
                return r
            if not hasattr(self, 'missing_people'):
                self.missing_people = {}
            o = self.missing_people.setdefault(name, {'name': name, 'club': self.pal.club_id, 'era': era,
                                                      'season': str(self.led.get('season') or '') if isinstance(self.led, dict) else '', 'beats': []})
            if n not in o['beats']:
                o['beats'].append(n)
        return None

    def people_pictures(self, n: int) -> set[str]:
        """On a line that names a real person: every library picture of a figure, so no generic player or face stands in
        for him (owner, 14.11.2026: "if the player is dark-skinned the graphic must be too" — a library figure cannot know).
        The line is carried by the place, the crowd, the archive or a card instead."""
        s = next((x for x in self.plan.get('shots') or [] if x['n'] == n), None) or {}
        if not self.named(s.get('narration') or ''):   # a real person's own picture is shown only on a line about him
            return {r['id'] for r in self.picker.records if re.search(r'(^|[/:])person-[a-z0-9-]+-(\d{4}s-)?(portrait|celebrate|action)-', r['id'])}
        own = (self.own_picture(n) or {}).get('id')
        return {r['id'] for r in self.picker.records if r['id'] != own and ('portrait-silhouette' in (r.get('subjects') or []) or self.FIGURE.search(r['id']))}

    TOSSED = re.compile(r'ball|scarf|flare|flag|hat|boot|shirt|confetti|ribbon|bottle|can\b', re.I)
    DROPPED = re.compile(r'ticket|newspaper|paper|programme|program|letter|document|photo|telegram|card|cutting|clipping|page', re.I)
    ROSE = re.compile(r'celebrat|jump|leap|trophy|cup-lift|lift', re.I)

    def entrance(self, rid: str, person: bool) -> str:
        """How a cut-out enters, by what it is (build.Film.cutout): a person walks in (a celebration rises), a thrown
        thing is tossed in, paper drops onto the scene, anything else slides in from its side."""
        if self.ROSE.search(rid):
            return 'rise'
        if person:
            return 'walk'
        if self.DROPPED.search(rid):
            return 'drop'
        if self.TOSSED.search(rid):
            return 'toss'
        return 'slide'

    def index_cutout(self, s: dict) -> list[dict]:
        """A cut-out from the PNG library (studio/kit/cutouts, through the media index) in front of the picture: the beat's
        object or supporter, sized to the frame and rising in on its own layer (build.Film.cutout). Never a person when
        the line names a real one; never another club's or a rival's colour (Picker.refused reads the pixels)."""
        n = s['n']
        q = {**self.query(n), 'n': n}
        named = self.named(s.get('narration') or '')
        for _, r, why in self.picker.ranked(q, 'cutout'):
            if named and self.FIGURE.search(r['id']):
                continue
            if 'subject' not in ' '.join(why) and not (set(r.get('subjects') or []) & set(q.get('subjects') or [])):
                continue   # a cut-out that has nothing to do with the line is decoration, not direction
            self.picker.use(r['id'], n, s.get('start'), why=why)
            person = bool(self.FIGURE.search(r['id']))
            h = int(B.H * (0.62 if person else 0.34))
            right = n % 2 == 0
            png = self.jd / 'cut' / f"{Path(r['path']).stem}-{h}.png"
            try:
                from PIL import Image
                from ..cinema import library as L
                if not png.exists():   # painted like every library piece: key-red becomes the club's colour, banned families scrubbed
                    png.parent.mkdir(parents=True, exist_ok=True)
                    im = Image.open(r['path']).convert('RGBA')
                    im = im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)
                    L.paint(im, 'kr' if r.get('accent') == 'key-red' else None, self.pal.accent, self.pal.render_bans).save(png, compress_level=1)
                with Image.open(png) as im:
                    w = im.width
            except OSError:
                return []
            return [{'kind': 'cutout', 'role': 'actor' if person else 'object', 'src': self.asset(png, 'cut'), 'h': h,
                     'x': (B.W - w - 130) if right else 130, 'y': B.H - h - (18 if person else int(B.H * 0.2)), 'dt': 0.5,
                     'way': 1 if right else -1, 'enter': self.entrance(r['id'], person)}]
        return []

    def lib_figures(self, s: dict) -> list[dict]:
        """The library's people and objects the plan chose for this shot, as cut-out layers (build.Film.cutout: each rises
        in on its own plane and drifts): one person at the side the plan gave, one object opposite. Painted and scrubbed
        like every library piece."""
        from PIL import Image
        from ..cinema import library as L
        lib = L.load()
        out: list[dict] = []
        if not lib:
            return out
        for e in (s.get('cinema') or {}).get('lib') or []:
            piece = lib.by.get(e.get('key'))
            role = e.get('role')
            if not piece or not piece.get('keyed') or role not in ('actor', 'object') or any(x['role'] == role for x in out):
                continue
            h = int(B.H * (0.62 if role == 'actor' else 0.22))
            png = self.jd / 'lib' / f"{piece['stem']}-{h}.png"
            if not png.exists():
                png.parent.mkdir(parents=True, exist_ok=True)
                im = Image.open(lib.path(piece['stem'])).convert('RGBA')
                im = im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)
                L.paint(im, piece.get('colour'), self.pal.accent, self.pal.render_bans).save(png, compress_level=1)
            with Image.open(png) as im:
                w = im.width
            right = e.get('side', 1) > 0
            out.append({'kind': 'cutout', 'role': role, 'src': self.asset(png, 'lib'), 'h': h, 'x': (B.W - w - 130) if right else 130,
                        'y': B.H - h - (18 if role == 'actor' else int(B.H * 0.24)), 'dt': 0.5 if role == 'actor' else 0.9})
            self.lib_used.append(piece['stem'])
        return out

    def fact(self, cid) -> dict:
        return (self.by.get(cid) or {}).get('fact') or {}

    # ── pieces ──────────────────────────────────────────────────────────────────────────────────────────────────────
    def back(self, s, move='push', **kw) -> dict | None:
        src, is_video = self.picture(s)
        if not src:
            return None
        if is_video:
            return {'kind': 'video', 'src': src, **{k: v for k, v in kw.items() if k in ('lt',)}}
        return {'kind': 'image', 'src': src, 'move': move, **kw}

    def scoreline(self, f: dict) -> dict:
        us_home = f.get('side') != 'away'
        us, them = (f.get('home'), f.get('away')) if us_home else (f.get('away'), f.get('home'))
        ug, tg = (f.get('score_home'), f.get('score_away')) if us_home else (f.get('score_away'), f.get('score_home'))
        return {'us': us or self.club, 'them': them or f.get('opponent') or '', 'ug': ug, 'tg': tg, 'home': us_home}

    def cap(self, f: dict) -> str:
        bits = [long_date(f.get('date')), f.get('competition'), (f.get('stage') if f.get('stage') not in (None, 'League') else None),
                ((f.get('venue') or {}).get('name') if isinstance(f.get('venue'), dict) else None)]
        return ' · '.join(b for b in bits if b).upper()

    def cue(self, n: int, at: float, kind: str):
        self.cues.setdefault(n, []).append([round(at, 2), kind])

    def shots(self, s: dict, d: float) -> list[dict]:
        v, t = s['visual'], v_type(s)
        n = s['n']
        f = self.fact(v.get('claim') or (s.get('claim_ids') or [None])[0])
        out: list[dict] = []
        if t == 'open':
            b = self.back(s, 'pull')
            out += [b] if b else []
            head = v.get('headline') or ''
            out.append({'kind': 'question', 'text': head, 'small': v.get('kicker') or '', 'dt': 0.6})
            self.cue(n, 0.2, f'crowd-bed:{d:.1f}')
        elif t == 'chapter':
            out.append({'kind': 'ticket', 'small': f'CHAPTER {WORDS[(v.get("number") or 1) - 1] if 0 < (v.get("number") or 0) <= 10 else v.get("number")}',
                        'big': (v.get('title') or '').upper(), 'line': ''})
            self.cue(n, 0.1, 'paper')
        elif t in ('score', 'versus') and f.get('kind') == 'match':
            sc = self.scoreline(f)
            bg = self.picture(s)
            if bg[0] and not bg[1]:   # the picture behind the board is its own device, so the editor can cut it into looks
                out.append({'kind': 'image', 'src': bg[0], 'veil': 0.55, 'move': 'push', 'z': 1})
            out.append({'kind': 'score', 'us': B.e(sc['us']), 'them': sc['them'], 'us_goals': sc['ug'], 'them_goals': sc['tg'],
                        'us_crest': self.crest_of(sc['us']), 'them_crest': self.crest_of(sc['them']), 'cap': self.cap(f)})
            cid = v.get('claim') or (s.get('claim_ids') or [None])[0]
            vd = self.design.verdict(s, f, cid) if d >= 6 else None
            st = None if vd else self.design.stamp(s, f, cid)
            if vd:      # the second half of the beat: the board has been read, now what the result meant
                at = round(d - min(5.0, d * 0.5), 2)
                out.append({**vd, 'dt': at, 'd': round(d - at, 2)})
                self.cue(n, at, 'sting')
            elif st and d >= 4:
                at = round(max(1.5, d - 2.4), 2)
                out.append({**st, 'dt': at, 'd': round(d - at, 2)})
                self.cue(n, at, 'stamp')
            if f.get('outcome') == 'win':
                self.cue(n, 0.6, 'crowd-goal' if (s.get('cinema') or {}).get('climax') else 'stamp')
            elif f.get('outcome') == 'loss':
                self.cue(n, 0.6, f'hush:{min(3.0, d):.1f}')
            else:
                self.cue(n, 0.6, 'stamp')
        elif t == 'goal' and f.get('kind') == 'match':
            sc = self.scoreline(f)
            sco = (f.get('scorers') or [])
            k = v.get('scorer') if isinstance(v.get('scorer'), int) else 0
            who = sco[k] if 0 <= k < len(sco) else {}
            mini = {'home': f.get('home') or '', 'score': f'{f.get("score_home")}–{f.get("score_away")}', 'away': f.get('away') or '', 'at': 1.2}
            try:    # the score as it stood, changing to the score after THIS goal when the scorer is named — only when the
                    # record orders the goals (director.goal_scores); otherwise the final score, as before
                from ..director import goal_scores, goal_word_time
                st = goal_scores(self.led, f).get(k)
                if st:
                    mini = {**mini, 'score': f'{st[0][0]}–{st[0][1]}', 'at': 0.4,
                            'flip': {'score': f'{st[1][0]}–{st[1][1]}', 'at': round(max(1.0, min(d - 1.0, goal_word_time(s, who.get('name') or '', d * 0.5))), 2)}}
            except Exception:  # noqa: BLE001 — a claim without minutes or sides: no order is claimed
                pass
            b = self.back(s, 'slam', tag={'small': f"{who['minute']}'" if who.get('minute') is not None else 'GOAL', 'big': who.get('name') or ''}, mini=mini)
            ch = self.design.chalk(s, f, who, list(s.get('claim_ids') or []) + [v.get('claim')]) if d >= 5 else None
            if ch and b:   # the move on the board first, then the goal itself: the picture arrives as the ball does
                c = round(min(E.MAX_CARD, d * 0.55), 2)
                out.append({**ch, 'd': c})
                b = {**b, 'dt': c, 'd': round(d - c, 2), 'fade': False}
                self.cue(n, max(0.2, c - 1.2), 'whoosh')
            out += [b] if b else []
            self.cue(n, 0.3 if not ch else c, 'crowd-goal')
        elif t == 'matchday' and f.get('kind') == 'match':
            sc = self.scoreline(f)
            b = self.back(s, 'panr', tag={'small': self.cap(f)[:60], 'big': f'{"v" if sc["home"] else "at"} {sc["them"]}'})
            ct = self.design.cities(s, [f]) if d >= 5 and b and self.last != 'cities' else None
            if ct:      # an away day opens on the journey: the two cities, then the ground
                c = round(min(3.2, d * 0.4), 2)
                out.append({**ct, 'd': c})
                b = {**b, 'dt': c, 'd': round(d - c, 2), 'fade': False}
            out += [b] if b else []
            self.cue(n, 0.4, 'whoosh')
        elif t == 'ticket' and f.get('kind') == 'match':
            b = self.back(s, 'push', veil=0.5)
            out += [b] if b else []
            out.append({'kind': 'ticket', 'small': (f.get('competition') or '').upper(), 'big': f'{f.get("home", "")} v {f.get("away", "")}'.upper(),
                        'line': ' · '.join(x for x in (long_date(f.get('date')), ((f.get('venue') or {}).get('name') if isinstance(f.get('venue'), dict) else '')) if x).upper(),
                        'dt': 0.5, 'compact': True})
            self.cue(n, 0.5, 'stamp')
        elif t in ('timeline', 'form', 'run'):
            rows = []
            for cid in (v.get('claims') or s.get('claim_ids') or [])[:6]:
                g = self.fact(cid)
                if g.get('kind') != 'match':
                    continue
                sc = self.scoreline(g)
                d0 = long_date(g.get('date'))
                rows.append([f'{d0.rsplit(" ", 1)[0] if d0 else ""} · {"v" if sc["home"] else "at"} {sc["them"]}'.strip(' ·'), sc['ug'], sc['tg']])
            results = []
            for cid in (v.get('claims') or s.get('claim_ids') or []):
                g = self.fact(cid)
                if g.get('kind') == 'match' and g.get('outcome') in ('win', 'draw', 'loss'):
                    results.append({'win': 'W', 'draw': 'D', 'loss': 'L'}[g['outcome']])
            if len(results) >= 6:   # a run reads as a strip of results, dealt one by one
                out.append({'kind': 'form', 'results': results[:30], 'per_row': 15 if len(results) > 10 else len(results),
                            'title': (v.get('label') or '').upper(), 'sub': self.club.upper(), 'step': min(0.09, max(0.03, (d - 1.2) / max(1, len(results))))})
                self.cue(n, 0.3, 'tick')
            elif rows:
                out.append({'kind': 'ledger', 'us': self.club.upper(), 'them': 'OPPONENTS', 'rows': rows, 'compact': True,
                            'title': (v.get('label') or '').upper(), 'row_at': [0.3 + 0.45 * i for i in range(len(rows))]})
                self.cue(n, 0.3, 'tick')
            else:
                b = self.back(s)
                out += [b] if b else []
        elif t == 'stat':
            b = self.back(s, 'push', veil=0.62)
            out += [b] if b else []
            out.append({'kind': 'stat', 'value': str(v.get('value') or ''), 'label': (v.get('label') or '').upper(), 'dt': 0.3})
            self.cue(n, 0.4, 'stamp')
        elif t == 'record':
            g = self.fact(v.get('claim'))
            vals = [(lab, g.get(k)) for lab, k in (('WON', 'won'), ('DRAWN', 'drawn'), ('LOST', 'lost'), ('SCORED', 'goals_for'), ('CONCEDED', 'goals_against')) if g.get(k) is not None]
            if vals:
                out.append({'kind': 'tally', 'title': (g.get('competition') or '').upper(), 'cells': vals})
                self.cue(n, 0.3, 'tick')
            else:
                b = self.back(s)
                out += [b] if b else []
        elif t == 'fact':
            b = self.back(s, 'push', veil=0.0)
            out += [b] if b else []
            out.append(self.design.rule(s) or {'kind': 'card', 'small': (v.get('heading') or '').upper(), 'text': v.get('text') or '', 'dt': 0.5})
            self.cue(n, 0.5, 'paper')
        elif t == 'quote':
            out.append({'kind': 'quote', 'text': v.get('text') or '', 'who': v.get('who') or '', 'role': v.get('role') or ''})
            self.cue(n, 0.2, 'paper')
        elif t == 'press' and not (v.get('headline') or '').strip():
            b = self.back(s)
            out += [b] if b else []
        elif t == 'press' and self.design.press(s, *self.cutting(s)):
            out.append(self.design.press(s, *self.cutting(s)))
            self.cue(n, 0.2, 'paper')
        elif t == 'press':
            out.append({'kind': 'card', 'small': ' · '.join(x for x in ((v.get('outlet') or '').upper(), long_date(v.get('date')).upper()) if x),
                        'text': v.get('headline') or '', 'sub': v.get('standfirst') or '', 'paper': True})
            self.cue(n, 0.2, 'paper')
        elif t == 'table':
            g = self.fact(v.get('claim'))
            rows = [[str(r.get('team') or r.get('club') or ''), r.get('position') or r.get('pos') or '', r.get('points') or r.get('pts') or '']
                    for r in (g.get('rows') or [])[:6]]
            tb = self.design.table(s, g)
            if tb:      # the table itself, every row in its place and the club's own lit
                out.append(tb)
                self.cue(n, 0.3, 'tick')
            elif rows:
                out.append({'kind': 'ledger', 'us': 'POS', 'them': 'PTS', 'rows': rows, 'compact': True, 'title': (g.get('competition') or '').upper()})
            else:
                b = self.back(s)
                out += [b] if b else []
        elif t == 'turning':
            src, is_video = self.picture(s)
            if src and not is_video:   # the turn of the story: the picture in the club's colour, slammed in
                out.append({'kind': 'tint', 'src': src})
            out.append({'kind': 'word', 'text': (v.get('title') or '').upper(), 'bg': 'ink', 'size': 150, 'at': 0.8,
                        'small': v.get('subtitle') or ''} if len(v.get('title') or '') <= 22 else
                       {'kind': 'lead', 'text': (v.get('title') or '').upper(), 'sub': v.get('subtitle') or '', 'dt': 0.5})
            self.cue(n, 0.5, 'sting')
        elif t == 'race':
            b = self.back(s, 'panl')
            out += [b] if b else []
            if v.get('label'):
                out.append({'kind': 'lead', 'text': v['label'].upper(), 'dt': 0.6})
        elif t == 'trailer':
            b = self.back(s, 'slam', veil=0.5)
            out += [b] if b else []
            out.append({'kind': 'question', 'text': '|'.join(v.get('lines') or []), 'dt': 0.3})
            self.cue(n, 0.3, 'drum')
        elif t == 'map':
            pins = []
            for cid in (v.get('claims') or [])[:4]:
                g = self.fact(cid)
                ven = (g.get('venue') or {}).get('name') if isinstance(g.get('venue'), dict) else None
                if ven and ven not in pins:
                    pins.append(ven)
            b = self.back(s, 'panr', lt=[(v.get('label') or '').upper(), ' · '.join(pins)] if (v.get('label') or pins) else None)
            out += [b] if b else []
            ct = self.design.cities(s, [self.fact(c) for c in (v.get('claims') or [])])
            if ct:      # a real journey: two cities the place book knows. Without both, the picture and its lower third stay.
                if b:
                    b.pop('lt', None)
                out.append(ct)
                self.cue(n, 0.3, 'whoosh')
        elif t == 'follow':
            b = self.back(s, 'push', veil=0.45)
            out += [b] if b else []
            out.append({'kind': 'follow', 'club': self.club, 'dt': 0.4, 'press_at': max(0.8, d - 2.2)})
            self.cue(n, max(0.8, d - 2.2), 'pop')
        elif t == 'end':
            title = (self.script.get('title_candidates') or [{}])[self.script.get('selected', 0) or 0].get('title') if self.script.get('title_candidates') else ''
            out.append({'kind': 'end', 'title': title or self.club, 'line': 'YouTube · @FanLifeFootballStories'})
            self.cue(n, 0.2, 'end')
        else:   # an illustration, or a card whose claim is not a match: the owner's picture with its caption
            # A picture's caption describes it for the editor ("Supporter holding scarf high"); it is never printed —
            # a name tag on screen is a claim, and only a cited scorer or minute earns one.
            b = self.back(s, ('pull', 'push', 'panl', 'panr')[n % 4])
            out += [b] if b else []
        if t in ('illustration', 'matchday', 'goal', 'race', 'open') and any(x['kind'] in ('image', 'video') for x in out if x):
            cu = self.design.cutout(s)
            # the figure the writer asked for by key comes first; else the library's own people for this shot — over a
            # picture only (under a full-frame card nobody would see them), and never over the city split or the board
            out += [cu] if cu else ([] if any(x and E.opaque(x) for x in out) else (self.lib_figures(s) or self.index_cutout(s)))
        out = self.speak(s, d, f, [x for x in out if x])
        self.last = next((x['kind'] for x in out if x['kind'] in ('cities', 'table', 'chalk', 'verdict', 'rule', 'press')), None)
        return out

    # ── the three languages (docu/explainer.py) ─────────────────────────────────────────────────────────────────────
    def checked(self, dev: dict | None, s: dict) -> dict | None:
        """An explainer through the designer's rule (rules 2, 11): every label and every number it would print must be in
        the ledger's claims or in the beat's own checked words — else no device."""
        if not dev:
            return None
        labels = [dev.get('label') or ''] + [x.get('label') or '' for x in (dev.get('ticks') or []) + (dev.get('bars') or [])]
        nums = [str(dev['value'])] if dev.get('value') is not None else []
        nums += [str(x['value']) for x in (dev.get('ticks') or []) + (dev.get('bars') or [])]
        probe = {'kind': 'explain', 'title': dev.get('title') or '', 'label': ' '.join(x for x in labels if x), 'text': ' '.join(nums)}
        return dev if self.design.sourced(probe, s) else None

    def speak(self, s: dict, d: float, f: dict, out: list[dict]) -> list[dict]:
        """Which language tells this beat best, after the adapter laid its documentary devices. An EXPLANATION the claims
        can draw becomes an explainer passage — when the goals came (a score beat that talks about its goals), a counted
        number the line says (the wait, the crowd), a record as bars — and a quote becomes kinetic type over its picture.
        `explainable[n]` records that the beat's data could carry one, whether or not there was room (the gate reads it).
        STORIES_DOCU_LANG=0 keeps batch 3's devices for comparison."""
        n, t, v = s['n'], v_type(s), s['visual']
        self.explainable[n] = False
        if os.environ.get('STORIES_DOCU_LANG', '1') == '0':
            return out
        text = s.get('narration') or ''
        facts = [g for g in (self.fact(c) for c in dict.fromkeys([v.get('claim'), *(s.get('claim_ids') or [])]) if c) if g]
        if t in ('score', 'versus', 'goal') and f.get('kind') == 'match':
            tl = self.checked(X.goal_timeline(f, self.club), s)
            self.explainable[n] = bool(tl)
            if tl and t != 'goal' and d >= X.EXPLAIN_MIN_S + 2.6 and X.GOAL_TALK.search(text):
                # the board is read first (2.6 s at least), then HOW the score came about — in place of a verdict stamp
                at = round(max(2.6, d - min(X.EXPLAIN_MAX_S, d * 0.6)), 2)
                out = [x for x in out if x['kind'] not in ('verdict', 'stamp')] + [{**tl, 'dt': at, 'd': round(d - at, 2)}]
                self.cues[n] = [c for c in self.cues.get(n, []) if c[1] not in ('sting', 'stamp')]
                self.cue(n, at + 0.25, 'pen')
                self.cue(n, at + 1.1, 'tick')
        elif t == 'record':
            br = self.checked(X.bars(self.fact(v.get('claim'))), s)
            self.explainable[n] = bool(br) or any(x['kind'] == 'tally' for x in out)
            if br:
                out = [x for x in out if x['kind'] != 'tally'] + [br]
        elif t == 'quote':
            kq = X.quote_lines(v.get('text') or '', d)
            b = self.back(s, 'push', veil=0.3) if kq else None
            if kq and b:     # the words themselves, arriving, over a picture — not a card of text
                out = [b, {**kq, 'who': ' · '.join(x for x in (v.get('who') or '', v.get('role') or '') if x).upper(), 'dt': 0.3, 'd': round(d - 0.3, 2), 'veil': 0.66}]
        elif t in ('turning', 'illustration', 'fact', 'matchday', 'trailer'):
            nb = self.checked(X.number(text, facts), s)
            self.explainable[n] = bool(nb)
            lead = max((x.get('at', 0.0) + E.WORD_HOLD for x in out if x['kind'] == 'word'), default=0.0)
            at = round(max(lead, d * 0.42), 2)
            if nb and d - at >= X.EXPLAIN_MIN_S:
                out.append({**nb, 'dt': at, 'd': round(min(X.EXPLAIN_MAX_S, d - at), 2)})
                self.cue(n, at + 0.35, 'tick')
        if any(x['kind'] in X.EXPLAIN_KINDS for x in out):
            self.explainable[n] = True
        # time pressure (the score sheet's `clock`): the match clock over the picture, at a minute that is sourced — one
        # the line says AND that is a scorer's minute of the cited match or the end of a period (45, 90, 120)
        if (self.sheet.get(n) or {}).get('clock') and f.get('kind') == 'match' and t in ('matchday', 'illustration', 'goal', 'race', 'ticket') \
                and any(x['kind'] == 'image' for x in out):
            from ..script import numbers_in_text
            ok = {x.get('minute') for x in f.get('scorers') or [] if isinstance(x.get('minute'), int)} | {45, 90, 120}
            said = sorted(m for m in numbers_in_text(text) if m in ok)
            if said:
                m = said[-1]
                ck = self.design.sourced({'kind': 'clockdev', 'minute': m, 'span': 120 if m > 90 else 90}, s)
                if ck:
                    out.append({**ck, 'dt': 0.6, 'd': round(d - 0.6, 2)})
                    self.cue(n, 0.8, 'tick')
        return out

    def punch_up(self, raw: list[dict]) -> None:
        """The mix (explainer.PLAIN_MAX): while more of the film than that is plain art, the beats that are ALL art — the
        most intense first, by the score sheet — get their one short line as kinetic type (explainer.punch). In place."""
        for b in raw:
            b['lang'] = X.languages(b['shots'], b['d'])
        if os.environ.get('STORIES_DOCU_LANG', '1') == '0':
            return
        # the beats that are mostly art and have no type of their own yet — the most art first, then the most intense
        todo = sorted((b for b in raw if b['meta']['type'] not in ('end', 'follow', 'chapter') and b['lang']['documentary'] >= 0.6 * b['d']
                       and not any(x['kind'] == 'kinetic' for x in b['shots'])),
                      key=lambda b: (-b['lang']['documentary'], -(b['meta'].get('intensity') or 0.5), b['meta']['n']))
        for b in todo:
            if X.mix(raw)['documentary'] <= X.PLAIN_MAX:
                break
            s = next(x for x in self.plan['shots'] if x['n'] == b['meta']['n'])
            k = X.punch(s.get('narration') or '', b['meta'].get('words') or [], b['t'], b['d'])
            busy = X.spans(b['shots'], b['d'], X.EXPLAIN_KINDS | X.KINETIC_KINDS)
            if k and not any(a < k['dt'] + k['d'] and k['dt'] < z for a, z in busy):   # never over a board or another line of type
                b['shots'].append(k)
                b['lang'] = X.languages(b['shots'], b['d'])

    @staticmethod
    def spoken(beats: list[dict]) -> list[dict]:
        """Each beat's seconds in each language, read off the beat as it will be drawn (after the cut: a card that left
        early no longer counts), and the language that leads it."""
        for b in beats:
            lg = b['lang'] = X.languages(b['shots'], b['d'])
            b['language'] = max(lg, key=lambda k: (lg[k], k == 'documentary'))
        return beats

    def cutting(self, s: dict) -> tuple[str | None, str | None]:
        """The beat's own picture (never a spare) and its key — what a press beat may show as the cutting."""
        v = s['visual']
        for key in (s.get('required_asset'), v.get('backdrop')):
            p = media(key) if key and key != 'paper' else None
            if p and p.suffix.lower() != '.mp4':
                return self.asset(p, 'img'), NAMED.get(key, key)
        return None, None

    def raw_beats(self) -> list[dict]:
        """One beat per plan shot, as the adapter reads it — before the edit."""
        out = []
        for s in self.plan['shots']:
            t, d = s['start'], s['frames'] / FPS
            cin = s.get('cinema') or {}
            at0 = s.get('voice_at')
            devs = self.shots(s, d)
            rec = self._picker.by.get(self.keys.get(s['n'])) if self._picker is not None else None
            b = {'t': t, 'd': d, 'shots': devs,
                 'meta': {'n': s['n'], 'type': v_type(s), 'chapter': s.get('chapter'), 'camera': cin.get('camera'), 'pace': cin.get('cam_pace'),
                          'subjects': (rec or {}).get('subjects') or [],   # what the picture shows, by its index entry: the camera reads it
                          'explainable': self.explainable.get(s['n'], False),
                          **{k: (self.sheet.get(s['n']) or {}).get(k) for k in ('emotion', 'intensity', 'turn', 'clock', 'breath')},
                          'outcome': self.fact(s['visual'].get('claim')).get('outcome') if v_type(s) in ('score', 'versus') else None,
                          'words': [round(at0 + w['start'], 3) for w in (s.get('words') or [])] if at0 is not None else []}}
            if s.get('narration') and s.get('voice_at') is not None and v_type(s) != 'end':
                b['subs'] = subtitles(s)
            out.append(b)
        self.question_cards(out)
        self.year_flaps(out)
        self.score_board(out)
        self.chapter_windows(out)
        return out

    YEAR = re.compile(r'^(19[0-9]{2}|20[0-3][0-9])[.,;:!?]?$')
    FLAPS_MAX = 4

    def year_flaps(self, beats: list[dict]) -> None:
        """Editing rule 3, numbers are objects: the first time the narration says a year, a split-flap board turns from
        the year before (or this year, the first time) to it, on the word. At most one a chapter, four a film. Only a
        year the narration says — the board prints nothing the script does not."""
        by_n = {s['n']: s for s in self.plan['shots']}
        shown, last, chapters = 0, str(Date.today().year), set()
        for b in beats:
            if shown >= self.FLAPS_MAX or b['meta']['type'] in ('end', 'follow', 'chapter', 'open'):
                continue
            s = by_n.get(b['meta']['n']) or {}
            if s.get('voice_at') is None or b['meta'].get('chapter') in chapters:
                continue
            for w in s.get('words') or []:
                m = self.YEAR.match(str(w.get('w') or '').strip('"\'’”('))
                if m and m.group(1) != last:
                    at = round(s['voice_at'] + w['start'] - 0.2, 3)
                    if 0 <= at <= b['d'] - 2.2:
                        b['shots'].append({'kind': 'flap', 'frm': last, 'to': m.group(1), 'at': max(0.0, at), 'd': round(max(0.0, at) + 2.6, 3), 'z': 14})
                        last, shown = m.group(1), shown + 1
                        chapters.add(b['meta'].get('chapter'))
                    break

    def chapter_windows(self, beats: list[dict]) -> None:
        """Editing rule 4, the shape as a window: each chapter card shows the chapter's first picture through the film's
        shape (build.Film.ticket draws it when the film has a shape). The picture is the one the chapter opens on, so the
        window is a promise the next cut keeps."""
        for k, b in enumerate(beats):
            if b['meta']['type'] != 'chapter':
                continue
            card = next((x for x in b['shots'] if x.get('kind') == 'ticket'), None)
            if not card:
                continue
            for nb in beats[k + 1:]:
                if nb['meta']['type'] == 'chapter':
                    break
                src = next((x.get('src') for x in nb['shots'] if x.get('kind') == 'image' and x.get('src')), None)
                if src:
                    card['window'] = src
                    break

    def score_board(self, beats: list[dict]) -> None:
        """Editing rule 3, the held scoreboard: in a chapter with goals told in the record's order, the score is one board
        that stays up from the first goal to the end of the chapter and turns on every goal, instead of a new score box on
        each goal picture. Only scores the record gives (the beat's `mini` with its `flip`); a goal without order keeps
        its own box."""
        def mini_of(b):
            for sh in b['shots']:
                m = sh.get('mini')
                if m and m.get('flip'):
                    return sh, m
            return None, None
        groups: dict = {}
        for b in beats:
            sh, m = mini_of(b)
            if m:
                groups.setdefault(b['meta'].get('chapter'), []).append((b, sh, m))
        for ch, goals in groups.items():
            first, sh0, m0 = goals[0]
            last = max((b for b in beats if b['meta'].get('chapter') == ch), key=lambda b: b['t'] + b['d'])
            end = last['t'] + last['d'] - first['t'] - 0.1
            board = {'kind': 'flap', 'corner': True, 'frm': m0['score'], 'to': m0['flip']['score'], 'at': m0.get('at', 0.4),
                     'turns': [], 'd': round(end, 3), 'z': 13,
                     'small': f"{str(m0.get('home') or '').upper()} · {str(m0.get('away') or '').upper()}".strip(' ·')}
            board['turn_at'] = m0['flip']['at']
            for b, sh, m in goals[1:]:
                board['turns'].append([round(b['t'] - first['t'] + m['flip']['at'], 3), m['flip']['score']])
            for b, sh, m in goals:
                sh.pop('mini', None)
            first['shots'].append(board)

    QUESTION_MAX_WORDS = 9      # a question card is read at a glance (editing rule 2: "the film's question in type")
    QUESTION_BY_S = 15.0        # on screen before 0:15 (rule model-film 3; qa.STAKE_BY_S)

    def question_cards(self, beats: list[dict]) -> None:
        """Editing rule 2 and model-film rules 3 and 9: the question the writer plants in the opening is set as a full-
        screen type card the moment the narrator asks it, and the same card comes back before the hand-over, where the
        film has answered it (the bookend). Only a real question the narration asks (ending in "?"), never invented."""
        by_n = {s['n']: s for s in self.plan['shots']}
        q = None
        for b in beats:
            if b['t'] >= self.QUESTION_BY_S:
                break
            s = by_n.get(b['meta']['n']) or {}
            ws = s.get('words') or []
            if not ws or s.get('voice_at') is None:
                continue
            i0 = 0
            for j, w in enumerate(ws):
                tok = str(w.get('w') or '')
                if tok.endswith('.') or tok.endswith('!'):
                    i0 = j + 1
                elif tok.rstrip('"\'’”)').endswith('?'):
                    words = [str(x.get('w') or '') for x in ws[i0:j + 1]]
                    if 2 <= len(words) <= self.QUESTION_MAX_WORDS:
                        a = s['voice_at'] + ws[i0]['start']
                        z = s['voice_at'] + ws[j].get('end', ws[j]['start'] + 0.4)
                        if b['t'] + a < self.QUESTION_BY_S:
                            q = {'text': ' '.join(words).upper(), 'beat': b, 'at': round(a, 3), 'd': round(min(b['d'] - a, z - a + 1.0), 3)}
                    i0 = j + 1
                if q:
                    break
            if q:
                break
        if not q or q['d'] < 1.2:
            return
        half = len(q['text'].split()) // 2 + (len(q['text'].split()) % 2)
        text = ' '.join(q['text'].split()[:half]) + '|' + ' '.join(q['text'].split()[half:])
        q['beat']['shots'].append({'kind': 'word', 'text': text, 'bg': 'ink', 'size': 130, 'small': 'THE QUESTION', 'at': q['at'], 'd': round(q['at'] + q['d'], 3), 'z': 16})   # word() counts its `at` inside d
        last = next((b for b in reversed(beats) if b['meta']['type'] not in ('end', 'follow', 'chapter') and b['d'] >= 4.0), None)
        if last is not None and last is not q['beat']:
            last['shots'].append({'kind': 'word', 'text': text, 'bg': 'ink', 'size': 130, 'small': 'THE OPENING QUESTION', 'at': 0.0, 'd': 2.4, 'z': 16})
        self.question = q['text']

    def beats(self) -> list[dict]:
        """The film's beats, edited (docu/editor.py): long stills cut into looks, cards that leave, a transition into
        every beat, the docs/71 rules. STORIES_DOCU_EDIT=0 keeps the adapter's own one-still-per-line cut (for comparison)."""
        raw = self.raw_beats()
        self.punch_up(raw)   # the language mix: kinetic lines where too much of the film is plain art (docu/explainer.py)
        if os.environ.get('STORIES_DOCU_EDIT', '1') == '0':
            return self.spoken(raw)
        # the producer's gate named shots to re-plan (studio/qa.experience → pipeline): {shot n: [long | asset | flash | shake]}
        fp = self.jd / 'experience-replan.json'
        fixes = {int(k): v for k, v in (read_json(fp).get('shots') or {}).items()} if fp.exists() else {}
        for b in raw:
            if 'asset' in fixes.get(b['meta']['n'], []):   # another picture where one was on screen too often (never the owner's chosen one)
                s = next(x for x in self.plan['shots'] if x['n'] == b['meta']['n'])
                for x in b['shots']:
                    if x['kind'] == 'image' and not s.get('required_asset'):
                        x['src'] = self.related(b['meta']['n'], 0) or x['src']
        out = E.cut(raw, self.plan.get('beat_grid'), self.related, self.backdrop, fixes, self.focus)
        for b in out:   # the camera's near plane, read off each picture it moves over
            for x in b['shots']:
                if x.get('cam') and x['kind'] == 'image' and x.get('as') != 'print':
                    h = self.horizon(x['src'])
                    if h is not None:
                        x['horizon'] = h
        return self.spoken(out)


def v_type(s: dict) -> str:
    return s['visual']['type']


def subtitles(s: dict, limit: int = 64) -> list[tuple[str, float, float]]:
    """The narrator's line in two-line pieces, each on screen from its first word to its last (the word timings the
    voice step measured), so a subtitle never runs ahead of the voice."""
    words = s.get('words') or []
    at0 = s['voice_at']
    parts = B.chunks(s['narration'], limit)
    if not words:
        total = sum(len(x) for x in parts) or 1
        out, at = [], at0
        for p in parts:
            dd = (s.get('voice_dur') or 2.0) * len(p) / total
            out.append((p, at, dd))
            at += dd
        return out
    out, i = [], 0
    for p in parts:
        k = len(p.split())
        ws = words[i:i + k] or words[-1:]
        i += k
        a, z = at0 + ws[0]['start'], at0 + ws[-1]['end']
        out.append((p, a, max(0.6, z - a + 0.15)))
    return out


def write_project(job_dir: Path, plan: dict, palette: Palette, root: Path) -> tuple[Path, float, dict]:
    ledger = read_json(job_dir / 'ledger.json')
    script = read_json(job_dir / 'script.json')
    ad = Adapter(job_dir, plan, palette, ledger, script)
    beats = ad.beats()
    from .. import looks
    book = looks.load()
    people = [{**o, 'look': 'ready' if looks.ready(book.get(looks.slug(o['name']) + '-' + (o.get('era') or ''))) else 'needs research'}
              for o in getattr(ad, 'missing_people', {}).values()]
    write_json(job_dir / 'flow-people.json', {'people': people})   # named with no picture of their own: studio/looks.py orders them
    write_json(job_dir / 'docu-shots.json', {'shots': E.shot_list(beats), 'errors': E.errors(beats) if beats and 'in' in beats[0] else [],
                                             'beat_grid': bool(plan.get('beat_grid')), 'library': sorted(set(ad.lib_used)),
                                             **({'mix': X.mix(beats)} if beats and 'lang' in beats[0] else {})})
    # the film's pictures, by their index entries, and the ledger across films (studio/media_index.py): which asset on
    # which shot — what the next film's picker reads as "seen lately" and the gate reports as library hygiene
    if ad._picker is not None:
        pk = ad._picker
        uses = pk.close()
        write_json(job_dir / 'media-index-usage.json', {'film': job_dir.name, 'club': palette.club_id, 'uses': uses, 'recent': {a: k for a, k in pk.recent.items() if a in pk.shots},
                   'assets': {a: {k: pk.by[a].get(k) for k in ('source', 'kind', 'clubs', 'era', 'subjects', 'moods', 'rights', 'size')} for a in sorted(pk.shots) if a in pk.by}})
    if root.exists():
        shutil.rmtree(root)
    (root / 'assets' / 'img').mkdir(parents=True)
    (root / 'assets' / 'fonts').mkdir(parents=True)
    for name, p in ad.files.items():
        shutil.copyfile(p, root / 'assets' / 'img' / name)
    for _, f in B.FACES:
        shutil.copyfile(B.FONTS / f'{f}.woff2', root / 'assets' / 'fonts' / f'{f}.woff2')
    shutil.copyfile(B.GSAP, root / 'assets' / 'gsap.min.js')
    fl = Path(__file__).resolve().parents[4] / 'public' / 'brand' / 'fanlife' / 'logo-512.png'
    if fl.exists():
        shutil.copyfile(fl, root / 'assets' / 'img' / 'fanlife.png')
    them = NEUTRAL
    sb = {'palette': {'us': palette.accent, 'them': them}, 'silent': True, 'karaoke': True, 'sub_limit': 44,
          'shape': B.CLUB_SHAPES.get(palette.club_id, 'ticket'),            # editing rule 4: one shape per film, from its club
          'mark': (root / 'assets' / 'img' / 'fanlife.png').exists()}       # model-film rule 9: the channel's mark the whole film
    film = B.Film(sb, root)
    film.agg_moves = []
    D = film.build(beats)
    D = max(D, plan['duration'])
    (root / 'index.html').write_text(film.page(D), encoding='utf-8')
    (root / 'hyperframes.json').write_text(json.dumps({'name': 'docu', 'width': B.W, 'height': B.H, 'fps': FPS}) + '\n')
    return root / 'index.html', D, ad.cues


def render_film(job_dir: Path, plan: dict, palette: Palette, log, workers: int | None = None, tick=None) -> Path:
    """The pipeline's render contract: shot cue files for the mix, one silent picture.mp4 back."""
    from ..hyperframes.render import hf_render
    t0 = time.time()
    proj = job_dir / 'docu'
    _, D, cues = write_project(job_dir, plan, palette, proj)
    sd = job_dir / 'shots'
    sd.mkdir(parents=True, exist_ok=True)
    for s in plan['shots']:
        write_json(sd / f'shot-{s["n"]:04d}.cues.json', {'cues': cues.get(s['n'], []), 'kind': s['visual']['type'], 'engine': ENGINE,
                                                        'required_asset': s.get('required_asset')})
    log(f'DOCU: {len(plan["shots"])} shots composed in {time.time() - t0:.1f}s ({D / 60:.2f} min)')
    try:   # the people the film named with no picture of their own: their look researched, their picture ordered in Flow
        from .. import looks
        looks.after_film(job_dir, log)
    except Exception as x:  # noqa: BLE001 — never the film's problem
        log(f'Looks: skipped ({str(x)[:120]})')
    used = read_json(job_dir / 'docu-shots.json').get('library') or []
    log(f'DOCU: {len(used)} moving-art library pieces on screen' if used else 'DOCU: no moving-art library on this machine (STORIES_CINEMA_LIB) — spare pictures only')
    if tick:
        tick(1, 3)
    raw = job_dir / 'docu.mp4'
    hf_render(proj, raw, FPS, log, workers=workers)
    if tick:
        tick(2, 3)
    pic = job_dir / 'picture.mp4'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(raw), '-an', '-r', str(FPS), '-c:v', 'libx264', '-preset', 'veryfast',
                    '-crf', '19', '-pix_fmt', 'yuv420p', '-g', str(FPS * 2), str(pic)], check=True)
    if not pic.exists():
        raise StageError('DOCU_RENDER_FAILED', 'The DOCU render left no picture.', retryable=True)
    if tick:
        tick(3, 3)
    log(f'DOCU: rendered in {(time.time() - t0) / 60:.1f} min')
    return pic
