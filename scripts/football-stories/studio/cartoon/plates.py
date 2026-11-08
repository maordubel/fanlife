"""The owner's drawn library as a Short's cast and sets (owner, 8.11.2026: "the animation is not at the level I expect —
not in sound, not in experience, not in items, not in graphics"; the reference he sent is a full-screen illustrated
scene behind every sentence, a character inside it, objects that belong to the drawing).

Every Short is now built from the studio kit the owner already supplied, never from shapes drawn in code:
  * a PLATE for every line — a full illustrated scene (kit/beats: `common`, `papercut-library`, the club's own set),
    chosen by what the line says, never the same plate twice in one Short;
  * a FIGURE — one of the inked cut-out people (kit/cutouts/common: celebrating, kneeling, the referee, the manager,
    the supporter jumping…) on the lines whose pose asks for one;
  * a CROWD ROW in the foreground on stadium plates, so the drawing has depth and moves;
  * an OBJECT — the owner's inked props (kit/props: the ball, the cup, the radio, the ticket, the plane, the bus…).

Colours follow the films' rules: a piece drawn in the key red takes the club's colour (paper.recolor), and any pixel in a
rival's family is scrubbed to grey (paper.scrub, rule 95). Matching is by words and a fixed table, never a model, so
the same Short always draws the same film. Nothing is invented: the plates carry no text and no club marks.
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

from PIL import Image, ImageFilter

from ..paper import BEATS, CUTS, KIT, beat_index, cut_index, recolor, scrub

PROPS = KIT / 'props'
PLATE_H = 2150          # plates are scaled to this height: 1920 + room for the camera to push in
FIGURE_H = 920         # a figure stands about half the frame tall
STOP = set('a an the and or of to in on at by for with from as is was were be been it its his her their they them this that these '
           'those he she we you i our your who whom which what when where why how not no but if then than so too very just '
           'one two three four five six seven eight nine ten into over under after before up down out off again only '
           'still also there here had has have do did done can could would should will may might must shall'.split())

# words a line says → words the drawings are described with (the football reading of a line)
SYN: list[tuple[str, str]] = [
    (r'\bwon\b|\bwin(?:s|ning)?\b|\bchampion|\btitle|\btroph|(?<!world )\bcup\b|\bdouble\b|\blift', 'trophy captain cup celebrations confetti titles'),
    (r'\bgoals?\b|\bscor|\bnet\b|\bequali[sz]', 'ball net goal celebration'),
    (r'\bcelebrat|\bparty|\bparade|\bstreets?\b.*\bfull\b', 'celebration confetti open-top bus crowd'),
    (r'\bfans?\b|\bsupporters?\b|\bterrace|\bcrowd|\bultras?\b|\bstands?\b|\bcurva|\bkop\b', 'terrace supporters scarves crowd stand'),
    (r'\bflew\b|\bfl(?:y|ight)\b|\bplane\b|\bairport|\babroad\b', 'airport plane gate abroad'),
    (r'\bbus\b|\bcoach(?:es)?\b(?! of)|\bdrove\b', 'bus coach road'),
    (r'\btrain\b|\brailway', 'train carriage'),
    (r'\bferry|\bboat|\bsail', 'ferry deck'),
    (r'\bnight\b|\bfloodlight|\bevening\b|\bunder the lights', 'night floodlit floodlights'),
    (r'\brain|\bstorm|\bmud', 'rain'),
    (r'\bsnow|\bfrozen|\bice\b|\bwinter', 'snow winter'),
    (r'\bmanager|\bcoach(?:ed)?\b of|\btactic|\bboss\b|\bgaffer', 'manager board tactics coat'),
    (r'\breferee|\bwhistle|\bref\b|\bofficial', 'referee whistle'),
    (r'\bred card|\bsent off|\bsending off|\bdismiss', 'referee card'),
    (r'\bpenalt|\bshoot-?out|\bspot\b', 'penalty spot shootout'),
    (r'\bphysio|\bdoctor|\bmedic|\btreatment|\bmagic sponge', 'stretcher injury bench dugout'),
    (r'\binjur|\bstretcher|\bbroke(?:n)? (?:his|a) leg', 'injury stretcher'),
    (r'\bnewspaper|\bheadline|\bpress\b|\breporters?\b|\bjournalist', 'newspaper press headlines scrapbook'),
    (r'\bmoney|\bpaid\b|\bpay\b|\bfee\b|\bcontract|\bsign(?:ed|ing)\b|\btransfer|\bbribe|\bransom|\bmillion', 'contract signing desk boardroom'),
    (r'\bsheikh|\bowner|\bpresident\b|\bchairman|\bboard\b|\bdirectors?\b', 'boardroom table board'),
    (r'\bkidnap|\bprison|\bjail|\bpolice|\barrest|\bsecret|\bcover-?up|\bhidden', 'tunnel gate silhouette dark'),
    (r'\bradio|\bcommentat|\bbroadcast', 'radio commentator booth'),
    (r'\btv\b|\btelevision|\bwatch(?:ed|ing)\b', 'televisions shop window'),
    (r'\btickets?\b|\bsold out|\bsell-?out|\bqueue', 'ticket turnstile queue'),
    (r'\bstadium|\bground\b|\barena', 'stadium ground'),
    (r'\brelegat|\bdown\b to|\blost\b|\blosing\b|\bdefeat|\bhumiliat|\bthrashed', 'despair relegation rain kneeling'),
    (r'\blast minute|\bclock\b|\bminutes?\b|\bseconds?\b|\binjury time|\bstoppage', 'clock last minute'),
    (r'\beurop|\bfinal\b|\bchampions league|\buefa', 'european stadium night finals'),
    (r'\bcity\b|\bdawn|\bmorning', 'city dawn skyline'),
    (r'\bfounded|\bhistory|\b19[0-4]\d\b|\bold\b', 'old ground wooden 1930s'),
    (r'\bdemoli|\bbulldoz', 'demolished stand crane'),
    (r'\bson\b|\bfather|\bdad\b|\bchild|\bkid\b|\bfirst match', 'father son child boy'),
    (r'\bdied\b|\bdeath\b|\bmemorial|\btribute|\bmourn|\bfuneral', 'scarf railing flowers bench'),
    (r'\bfree[- ]kick|\bwall\b', 'free-kick wall'),
    (r'\bcorner\b', 'corner'),
    (r'\bheader|\bheaded', 'header'),
    (r'\bvolley|\bstrike|\bshot\b|\bshoot', 'volley striking'),
    (r'\bkick-?off', 'kick-off centre'),
    (r'\bdressing room|\bhalf-?time|\bchanging room', 'dressing room'),
    (r'\bbench\b|\bsubstitut|\bdugout', 'dugout substitutes bench'),
    (r'\bpub\b|\bbar\b|\bbeer|\bdrink', 'bar pub'),
    (r'\btifo|\bchoreo|\bbanner|\bflags?\b', 'choreography flags tifo'),
    (r'\byouth|\bacademy|\byoung', 'youth academy boys'),
    (r'\btraining|\bpractice', 'training'),
    (r'\boffside|\bdisallow|\bruled out|\bvar\b', 'offside flag'),
    (r'\bhotel', 'hotel window'),
    (r'\bkeeper|\bgoalkeeper|\bsave[ds]?\b', 'goalkeeper diving save'),
    (r'\bbottles?\b|\bwater\b|\bpoison|\bdrugg', 'dressing room bench'),
]
EXCLUDE = re.compile(r'^(tr-|follow-)')  # transitions and the follow-moment pictures are not a Short's sets
FALLBACK = ('terrace-full-kr', 'stadium-night-bowl-n', 'street-matchday-crowd-kr', 'home-end-night-kr', 'crowd-scarves-night-kr',
            'europe-stadium-night-n', 'stadium-green-pitch-kr', 'flags-pole-kr')
CROWDED = re.compile(r'terrace|stand|stadium|crowd|home-end|choreograph|flags|away-end|celebration|final-whistle|trophy-lift|europe')

# what the line is about → which inked person stands in front (cut-outs, kit/cutouts/common)
FIGURES: list[tuple[str, str]] = [
    (r'\bcaptain|\blift(?:ed|s)? the|\btroph|(?<!world )\bcup\b', 'fig-captain-cup-kr'),
    (r'\bred card|\bsent off|\bbooked', 'fig-referee-card-n'),
    (r'\breferee|\bwhistle|\bref\b', 'fig-referee-whistle-n'),
    (r'\bkeeper|\bgoalkeeper|\bsaved?\b', 'fig-keeper-dive-n'),
    (r'\bheader|\bheaded', 'fig-header-kr'),
    (r'\bshot\b|\bshoot|\bstrike|\bvolley|\bkicked', 'fig-striker-shoot-kr'),
    (r'\bran\b|\brun\b|\bsprint|\bcounter', 'fig-striker-run-kr'),
    (r'\btackle|\bslid', 'fig-defender-slide-n'),
    (r'\bmanager|\bcoach\b|\bboss\b', 'fig-manager-coat-n'),
    (r'\bson\b|\bchild|\bkid\b|\bshoulders', 'fig-supporter-child-shoulders-kr'),
]
POSE_FIGURE = {'cheer': ('fig-celebrate-arms-kr', 'fig-supporter-jump-kr', 'fig-celebrate-knee-slide-kr'),
               'scared': ('fig-kneel-despair-kr',), 'facepalm': ('fig-kneel-despair-kr',),
               }

# which inked object a gag uses, when the owner drew one (kit/props); other gags stay the studio's own drawn props
PROP_FOR = {'ball': 'football', 'ball_goal': 'football', 'trophy': 'generic_trophy'}
PROP_WORDS: list[tuple[str, str]] = [
    (r'\bradio|\bbroadcast|\bcommentat', 'portable_radio'), (r'\btickets?\b', 'match_ticket'),
    (r'\bflew\b|\bplane\b|\bflight\b|\bairport', 'passenger_plane'), (r'\bbus\b', 'supporters_bus'),
    (r'\bscarf|\bscarves', 'supporter_scarf'), (r'\btactic|\bblackboard|\bformation', 'tactics_board'),
]


def _words(text: str) -> set[str]:
    out = set()
    for w in re.findall(r"[a-z][a-z'-]+", text.lower()):
        w = w.strip("'-")
        if len(w) < 3 or w in STOP:
            continue
        for suf in ('ing', 'ers', 'ed', 'es', 's'):
            if w.endswith(suf) and len(w) - len(suf) >= 3:
                w = w[: -len(suf)]
                break
        out.add(w)
    return out


def expand(text: str) -> set[str]:
    words = _words(text)
    low = text.lower()
    for pat, more in SYN:
        if re.search(pat, low):
            words |= _words(more)
    return words


SAD = re.compile(r'\blos(?:t|ing|e|es)\b|\bdefeat|\bout\b|\bwent home|\bspiked|\bdrugg|\bpoison|\bdied|\bdeath|\bkidnap|\bbanned|'
                 r'\brelegat|\bsacked|\bscandal|\bcheat|\bbarely\b|\binjur|\bcried|\btears|\bnightmare|\bhumiliat|\bcollapse')
GLAD = re.compile(r'\bwon\b|\bwin\b|\bchampion|\bcelebrat|\btitle\b|\btroph|\bparty|\bparade|\bhero|\bscored\b|\bcomeback')
JOY_PLATE = re.compile(r'celebrat|trophy|confetti|open-top|jump|choreograph|flags-pole|crowd-scarves|scarves-up|final-whistle-arms')
SAD_PLATE = re.compile(r'despair|relegation|rain|kneel|stretcher|lights-off|demolition|railing|grandfather')


def polarity(text: str) -> int:
    """-1 a hard line, +1 a happy one, 0 neither — a losing line never stands on a trophy lift."""
    sad, glad = len(SAD.findall(text.lower())), len(GLAD.findall(text.lower()))
    return -1 if sad > glad else 1 if glad > sad else 0


def _families(p: dict) -> set[str]:
    return set(p.get('families') or []) - ({'red'} if p.get('accent') == 'key-red' else set())


def _seed(*parts) -> int:
    return int(hashlib.sha256(':'.join(str(p) for p in parts).encode()).hexdigest()[:8], 16)


def catalog(club_id: str | None = None, season: str | None = None) -> list[dict]:
    """Every plate a Short may stand on: the common library, the paper-cut scenes, and the club's own sets (their own
    pictures of their own nights) when the Short is that club's."""
    out = []
    sets = ['common', 'papercut-library']
    for d in sorted(BEATS.iterdir()) if BEATS.exists() else []:
        if d.is_dir() and d.name not in sets and (d / 'index.json').exists():
            import json
            meta = json.loads((d / 'index.json').read_text(encoding='utf-8'))
            if club_id and meta.get('club') == club_id and (not season or not meta.get('season') or meta.get('season') == season):
                sets.append(d.name)
    for s in sets:
        for p in beat_index(s):
            slug = p['key'].split('/', 1)[1]
            if EXCLUDE.match(slug):
                continue
            words = _words(p.get('description', '') + ' ' + slug.replace('-', ' ') + ' ' + str(p.get('mood') or ''))
            out.append({**p, 'slug': slug, 'set': s, 'words': words, 'own': s not in ('common', 'papercut-library'),
                        'stem': re.sub(r'-(?:[bc]-)?(?:kr|n)$', '', slug)})
    return out


def pick_plates(beats: list[dict], bans: list[str], *, club_id: str | None = None, season: str | None = None) -> list[str]:
    """One plate per beat: the drawing whose description shares the most meaning with the line (rare words count
    more), the club's own set first when it matches, never a plate — or a variant of one — twice; a line that names
    nothing drawable stands on one of the big stadium plates."""
    cat = [p for p in catalog(club_id, season) if not (_families(p) & set(bans))]
    if not cat:
        raise ValueError('no plate survives the rival-colour bans')
    import math
    df: dict[str, int] = {}
    for p in cat:
        for w in p['words']:
            df[w] = df.get(w, 0) + 1
    idf = {w: math.log(1 + len(cat) / n) for w, n in df.items()}
    used_stems: set[str] = set()
    out = []
    for b in beats:
        if b.get('plate'):
            want = str(b['plate']).replace('beat:', '')
            hit = next((p for p in cat if p['key'] == 'beat:' + want or p['slug'] == want), None)
            if hit and hit['stem'] not in used_stems:
                used_stems.add(hit['stem'])
                out.append(hit['key'])
                continue
        q = expand(f"{b.get('say', '')} {b.get('show', '')}")
        pol = polarity(f"{b.get('say', '')} {b.get('show', '')}")
        best, best_s = None, 0.0
        for p in cat:
            if p['stem'] in used_stems:
                continue
            if (pol < 0 and JOY_PLATE.search(p['slug'])) or (pol > 0 and SAD_PLATE.search(p['slug'])):
                continue
            s = sum(idf.get(w, 0) for w in q & p['words'])
            if s and p['own']:
                s += 1.5
            s += (_seed(b.get('say'), p['key']) % 1000) / 1e5  # a stable tie-break
            if s > best_s:
                best, best_s = p, s
        if best is None or best_s < 1.0:
            pool = [p for p in cat if p['stem'] not in used_stems and p['slug'] in FALLBACK
                    and not (pol < 0 and JOY_PLATE.search(p['slug']))] or \
                   [p for p in cat if p['stem'] not in used_stems] or cat
            best = pool[_seed(b.get('say'), len(out)) % len(pool)]
        used_stems.add(best['stem'])
        out.append(best['key'])
    return out


def crowded(plate_key: str) -> bool:
    return bool(CROWDED.search(plate_key.split('/', 1)[-1]))


def _cut_variant(base: str, bans: list[str], salt) -> str | None:
    stem, kind = base.rsplit('-', 1)
    opts = []
    for p in cut_index('common'):
        if re.fullmatch(rf'cut:common/{re.escape(stem)}(-[bc])?-{kind}', p['key']) and not (_families(p) & set(bans)):
            opts.append(p['key'])
    return sorted(opts)[_seed(salt) % len(opts)] if opts else None


def pick_figure(beat: dict, bans: list[str], salt: str) -> str | None:
    """The inked person a line asks for, or None when the plate should carry the line alone."""
    low = f"{beat.get('say', '')} {beat.get('show', '')}".lower()
    pol = polarity(low)
    for pat, base in FIGURES:
        if pol < 0 and base in ('fig-captain-cup-kr',):
            continue
        if re.search(pat, low):
            return _cut_variant(base, bans, salt + base)
    bases = POSE_FIGURE.get(beat.get('pose') or '')
    if bases and pol < 0 and beat.get('pose') == 'cheer':
        bases = None
    if bases:
        base = bases[_seed(salt) % len(bases)]
        return _cut_variant(base, bans, salt + base)
    return None


def pick_crowd(beat: dict, bans: list[str], salt: str) -> str | None:
    pose = beat.get('pose')
    base = 'crowd-row-celebrate-kr' if pose == 'cheer' else 'crowd-row-arms-up-kr' if beat.get('gag') in ('ball_goal', 'scoreboard') \
        else 'crowd-row-still-kr' if pose in ('scared', 'facepalm') else 'crowd-row-scarves-up-kr'
    return _cut_variant(base, bans, salt + base) or _cut_variant('crowd-row-flags-kr', bans, salt)


def pick_prop(beat: dict) -> str | None:
    """The owner's inked object for this line, when he drew one."""
    if beat.get('gag') in PROP_FOR:
        return PROP_FOR[beat['gag']]
    low = f"{beat.get('say', '')} {beat.get('show', '')}".lower()
    for pat, name in PROP_WORDS:
        if re.search(pat, low):
            return name
    return None


def _paint(im: Image.Image, accent: str | None, bans: list[str], key_red: bool) -> Image.Image:
    alpha = im.getchannel('A') if im.mode == 'RGBA' else None
    rgb = im.convert('RGB')
    if key_red and accent:
        rgb = recolor(rgb, accent)
    rgb = scrub(rgb, bans)
    if alpha is not None:
        rgb = rgb.convert('RGBA')
        rgb.putalpha(alpha)
    return rgb


def plate_file(key: str, dest: Path, accent: str | None, bans: list[str]) -> tuple[str, int, int]:
    """The plate at Short size, in the club's colour, scrubbed of the rival's. Returns (file name, width, height)."""
    from ..paper import beat_path, piece_meta
    src = beat_path(key)
    if not src:
        raise ValueError(f'no such plate: {key}')
    name = 'plate-' + key[5:].replace('/', '--') + '.jpg'
    im = Image.open(src)
    w = round(im.width * PLATE_H / im.height)
    out = dest / name
    if not out.exists():
        im = _paint(im.convert('RGB'), accent, bans, piece_meta(key).get('accent') == 'key-red')
        im = im.resize((w, PLATE_H), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2))
        im.save(out, quality=90, optimize=True)
    return name, w, PLATE_H


def cut_file(key: str, dest: Path, h: int, accent: str | None, bans: list[str]) -> tuple[str, int, int]:
    from ..paper import cut_path, piece_meta
    src = cut_path(key)
    if not src:
        raise ValueError(f'no such cut-out: {key}')
    im = Image.open(src).convert('RGBA')
    w = round(im.width * h / im.height)
    name = f"cut-{key[4:].replace('/', '--')}-{h}.png"
    if not (dest / name).exists():
        im = _paint(im, accent, bans, piece_meta(key).get('accent') == 'key-red').resize((w, h), Image.LANCZOS)
        im.save(dest / name, optimize=True)
    return name, w, h


def prop_file(name: str, dest: Path, h: int, bans: list[str]) -> tuple[str, int, int]:
    src = PROPS / f'{name}.webp'
    im = Image.open(src).convert('RGBA')
    w = round(im.width * h / im.height)
    out = f'prop-{name}-{h}.png'
    if not (dest / out).exists():
        _paint(im, None, bans, False).resize((w, h), Image.LANCZOS).save(dest / out, optimize=True)
    return out, w, h


def has_library() -> bool:
    return bool(beat_index('common')) and (CUTS / 'common' / 'index.json').exists()
