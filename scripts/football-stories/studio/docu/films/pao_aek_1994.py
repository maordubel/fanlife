"""Storyboard: THE NINJA OF NEA FILADELFEIA — AEK Athens 0–1 Panathinaikos, Alpha Ethniki matchday 8, 7 November 1994.

THE MODEL FILM (owner, 13.11.2026: "take it as the assembly model for all our films") — docs/fanlife/74-model-film.md.
It is a hand-written storyboard cut by the studio's own editor (`"edit": true`, docu/build.edited): the writer gives
each beat its `meta` (type, chapter, emotion, intensity) and the editor, the camera and the gate do the rest.

Facts (the claim ledger with URLs is the package's FACTS.md; two independent publishers each, or the line was cut):
  date, matchday, score      our archive (club-packs/aek-athens, m-dh-e5daa77c5db2) · football.aek.com · Wikipedia
  Kalitzakis 20'             sport24.gr (5.12.2020) · Haniotika Nea
  Borrelli's free kick from the right, the unmarked header past Atmatsidis: sport24.gr and the owner's brief
  7 of 7 before it, 9 of 9 after, ended 0–0 at Iraklis: gazzetta.gr · fosonline.gr (scores agree with RSSSF's cross-table)
  final table (83 / 67 / AEK fifth on 62), Warzycha 29: Wikipedia · RSSSF
  cup final 19.4.1995, 1–0 after extra time, Warzycha's penalty: RSSSF · aektoday.com · Wikipedia
  "The Ninja": Wikipedia · Phantis. More than seventy caps, no goal: both (71 and 72 — so "more than seventy").
  Nikos Goumas Stadium, Nea Filadelfeia, demolished 2003: Wikipedia · stadiumdb.com
NOT said, because not proven twice: the attendance (the brief's "over 30,000" stands against Wikipedia's 19,506), the
line-ups of the night (so no line-up board), the radio call (so a plain GOAL card), any chance AEK had in the 70 minutes.
Pictures: the owner's 18 (his pack, not in git — see PACK) and the common library through the media index. Every
picture carries "Illustration · graphic reconstruction". Rule 142: nothing flickers; the brief's "flickering scoreboard"
is the scoreboard card and a scarf on a slow crane.

    python3 -m studio.docu.films.pao_aek_1994 storyboard.json            # the storyboard
    python3 -m studio.docu.films.pao_aek_1994 --pack OWNER_DIR ASSETS    # the asset pack the storyboard names
"""
import json
import sys
from pathlib import Path

GREEN, AMBER, COAL = '#0B7A3E', '#C99700', '#1A1A1A'
# The owner's pack: file-name prefix in his folder → the name the storyboard uses.
PACK = {'Military_investigation': 'dossier.jpg', 'Gemini_Generated': 'header-a.jpg', 'Player_heading': 'header-b.jpg', '195a8098': 'celebrate.jpg',
        'Football_tackle': 'tackle.jpg', 'Copy of 02-gate-13': 'gate13.jpg', 'Copy of 04-terrace': 'terrace.jpg', 'Paper-cut_collage_of_soccer_stadium': 'scarf.jpg',
        'Paper-cut_shamrock_badge': 'badge.jpg', 'Paper-cut_shamrock_emblem_134': 'emblem.jpg', 'Soccer_players_competing_during': 'supporter.jpg',
        'Soccer_players_on_grass_pitch': 'scarves.jpg', 'unnamed (5)': 'applause.jpg', 'unnamed (6)': 'team.jpg', 'unnamed (7)': 'portrait.jpg',
        'unnamed (8)': 'pyro.jpg', 'unnamed (9)': 'fence.jpg', 'images.png': 'crest-src.png'}
# 13.11.2026: the pack is read from the owner's Drive (folders "AEK–PAO 1994" and the Panathinaikos shamrock folder). Three
# pictures he attached in chat are not in Drive; his own Panathinaikos paper-cut scenes stand in for them (green only,
# no rival colour): the stadium collage (scarf), the green v white duel (supporter), the green players (scarves).
# The common library, asked of the media index (studio/media_index.py): role → (what the beat asks for, the piece that
# means it). The picker refuses another club's art and marks every use in the ledger; a preferred piece it refuses falls
# back to its own best.
LIB = {'lib-trophy': (['trophy', 'archive'], ['calm'], 'beat:common/archive-trophy-spotlight'),
       'lib-bowl': (['stadium', 'night'], ['tension'], 'beat:common/stadium-night-bowl-n'),
       'lib-freekick': (['ball', 'goal', 'stand'], ['tension'], 'beat:common/free-kick-wall-kr'),
       'lib-clock': (['clock', 'stadium'], ['tension'], 'beat:common/last-minute-clock-n'),
       'lib-corner': (['stadium', 'night', 'flag'], ['tension'], 'beat:common/corner-flag-night'),
       'lib-whistle': (['referee', 'clock'], ['tension'], 'beat:common/final-whistle-arms-kr'),
       'lib-radio': (['archive'], ['calm'], 'beat:common/radio-scarf-ticket-table'),
       'lib-desk': (['archive', 'newspaper'], ['calm'], 'beat:common/scrapbook-desk-kr'),
       'lib-tunnel': (['tunnel', 'stadium'], ['tension'], 'beat:common/tunnel-gate-silhouette-n')}


def pack(owner: Path, out: Path) -> dict:
    """The film's asset folder from the owner's pictures and the library. → {name: where it came from}."""
    from PIL import Image, ImageOps
    here = Path(__file__).resolve()
    sys.path.insert(0, str(here.parents[3]))
    from studio import media_index as M
    from studio import paper
    out.mkdir(parents=True, exist_ok=True)
    made = {}
    files = [p for p in owner.rglob('*') if p.is_file() and p.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp')]
    for pre, name in PACK.items():
        src = next((p for p in files if p.name.startswith(pre)), None)
        if src is None:
            raise SystemExit(f'the owner pack has no file starting "{pre}" ({name})')
        im = Image.open(src).convert('RGB')
        if im.width < 1500 and name != 'crest-src.png':   # his small pieces are enlarged once, cleanly, never stretched on the page
            k = 1500 / im.width
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        im.save(out / name, quality=93)
        made[name] = f'owner:{src.name}'
    # the crest he supplied sits on a checker ground: keep the roundel only
    c = Image.open(out / 'crest-src.png').convert('RGB')
    box = (98, 48, 508, 458)
    c = c.crop(box).resize((400, 400), Image.LANCZOS)
    mask = Image.new('L', (400, 400), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(mask).ellipse((2, 2, 398, 398), fill=255)
    c.putalpha(mask)
    c.save(out / 'crest-pao.png')
    (out / 'crest-src.png').unlink()
    made['crest-pao.png'] = made.pop('crest-src.png')
    # two portraits as prints with a paper border (cut-out layers: they stand in front of a picture, never stretched to 16:9)
    for name in ('portrait.jpg', 'applause.jpg'):
        im = Image.open(out / name).convert('RGB')
        im = ImageOps.expand(im, border=(36, 36, 36, 120), fill='#F1E8D3')
        im.save(out / name.replace('.jpg', '-print.png'))
        made[name.replace('.jpg', '-print.png')] = made[name]
    ix = M.build()
    pk = M.Picker(ix, club='panathinaikos', era='1990s', film=SB['slug'], ledger=M.Ledger())
    for n, (role, (subj, moods, want)) in enumerate(LIB.items()):
        ranked = pk.ranked({'n': n, 'subjects': subj, 'said': subj, 'moods': moods, 'era': '1990s'})
        rec = next((r for _, r, _ in ranked if r['id'] == want), ranked[0][1] if ranked else None)
        if rec is None:
            raise SystemExit(f'the media index has nothing for {role}')
        pk.use(rec['id'], n)
        im = Image.open(rec['path']).convert('RGB')
        if rec.get('accent') == 'key-red':
            im = paper.recolor(im, GREEN)
        inked(im).save(out / f'{role}.jpg', quality=93)
        made[f'{role}.jpg'] = rec['id']
    logo = here.parents[5] / 'public' / 'brand' / 'fanlife' / 'logo-512.png'
    (out / 'fanlife.png').write_bytes(logo.read_bytes())
    (out / 'media-index-usage.json').write_text(json.dumps({'film': SB['slug'], 'club': 'panathinaikos', 'uses': pk.close(), 'recent': {a: k for a, k in pk.recent.items() if a in pk.shots},
                                                           'assets': {a: {k: pk.by[a].get(k) for k in ('source', 'kind', 'clubs', 'era', 'subjects', 'moods', 'rights', 'size')} for a in sorted(pk.shots)}}, indent=1))
    (out / 'PACK.json').write_text(json.dumps(made, indent=1, ensure_ascii=False))
    return made


def inked(im):
    """ONE WORLD, FEW INKS (the editing reference of 13.11.2026): a library picture is redrawn in the film's own inks —
    ink to cream by its lightness, with a halftone grain, and only the club's green kept as colour — so pieces from
    different sets read as one film beside the owner's paper-cut scenes. No other hue survives (a rival's included)."""
    import numpy as np
    from PIL import Image
    a = np.asarray(im.convert('RGB'), 'float32') / 255
    hsv = np.asarray(im.convert('HSV'), 'float32')
    lum = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2])
    h, w = lum.shape
    yy, xx = np.mgrid[0:h, 0:w]
    dots = 0.5 + 0.5 * np.sin(xx * 1.05 + yy * 0.6) * np.sin(yy * 1.05 - xx * 0.6)   # a 45° screen, about 6 px
    lum = np.clip(lum + (dots - 0.5) * 0.10 * (1 - np.abs(lum - 0.5) * 2), 0, 1)
    lum = np.clip((lum - 0.04) / 0.92, 0, 1) ** 0.95
    ink, cream = np.array([0x15, 0x13, 0x0f], 'float32'), np.array([0xf4, 0xec, 0xd8], 'float32')
    out = ink + (cream - ink) * lum[..., None]
    deg = hsv[..., 0] * (360 / 255)
    green = (deg > 95) & (deg < 175) & (hsv[..., 1] > 0.3 * 255)
    g = np.array([0x0B, 0x7A, 0x3E], 'float32')
    tone = np.clip(0.55 + lum * 0.9, 0, 1.45)[..., None]
    out = np.where(green[..., None], np.clip(g * tone, 0, 255), out)
    return Image.fromarray(out.astype('uint8'), 'RGB')


def img(src, move='push', **k): return dict(kind='image', src=src, move=move, **k)
def word(text, **k): return dict(kind='word', text=text, **k)
def stamp(text, side='us', x=300, y=560, dt=1.0, size=150, **k): return dict(kind='stamp', text=text, side=side, x=x, y=y, dt=dt, size=size, **k)
def clock(minute, dt=0.4, **k): return dict(kind='clockdev', minute=minute, dt=dt, **k)
def pol(src, x=1180, h=820, y=130, **k): return dict(kind='cutout', src=src, x=x, h=h, y=y, **k)


B = []
CH = [-1]


def beat(vo=None, *shots, type='illustration', emotion=None, intensity=None, **k):
    meta = dict(type=type, chapter=max(0, CH[0]), emotion=emotion, intensity=intensity, **(k.pop('meta', {})))
    B.append(dict(vo=vo, shots=list(shots), meta=meta, **k))


def chapter(small, big, line):
    CH[0] += 1
    B.append(dict(vo=None, shots=[dict(kind='ticket', small=small, big=big, line=line)], hold=2.0, meta=dict(type='chapter', chapter=CH[0]),
                  sound=[('page', 0.0, 1.0, 0.5)]))


# ── IDENT ── (the owner's opening video goes in front through studio/intros.py when it can be fetched; this is the drawn one)
beat(None, dict(kind='ident', line='A FAN LIFE FILM'), type='open', hold=2.0, sound=[('sting', 0.1, 1.9, 0.5)])

# ── COLD OPEN · THE HOOK ── (a concrete stake in sentence one; the question asked inside ten seconds; the result withheld)
beat("He played more than seventy times for Greece.",
     img('dossier.jpg', 'push', veil=0.05, focus='24% 48%'), type='open', emotion='tension', intensity=0.7, pre=0.2, pad=0.1,
     meta=dict(headline='70+ CAPS · 0 GOALS', plain=True), sound=[('whoosh', 0.0, 1.2, 0.4)])
beat("He never scored once.",
     img('emblem.jpg', 'push', veil=0.72), stamp('70+ CAPS · 0 GOALS', 'us', x=330, y=420, dt=0.3, size=96, rot=-4),
     type='stat', emotion='tension', intensity=0.7, pad=0.15, meta=dict(plain=True), sound=[('stamp', 0.3, 1.0, 0.7)])
beat("They called him the Ninja.",
     img('lib-desk.jpg', 'push', veil=0.45), pol('portrait-print.png', x=300, h=860, y=90, stay=True), stamp('THE NINJA', 'us', x=1010, y=420, dt=0.5, size=110, rot=-6),
     type='illustration', emotion='tension', intensity=0.6, pad=0.15, meta=dict(plain=True), sound=[('stamp', 0.5, 1.0, 0.7)])
beat("A defender. Picked to stop goals.",
     img('fence.jpg', 'push', veil=0.05), type='illustration', emotion='tension', intensity=0.7, pad=0.15, meta=dict(plain=True))
beat("So what was he doing in the champions' penalty area, twenty minutes into the biggest match of the season?",
     img('header-b.jpg', 'push', veil=0.1, focus='54% 26%'),
     word('WHAT WAS A DEFENDER|DOING UP THERE?', bg='ink', size=128, small="THE CHAMPIONS' GROUND · MINUTE 20", at=2.3),
     type='turning', emotion='tension', intensity=0.9, pad=0.6, meta=dict(plain=True, claims=['result']), sound=[('riser', 0.2, 2.1, 0.5), ('impact', 2.3, 1.6, 0.7)])
beat(None, word('THE NINJA', bg='ink', size=250, d=1.2), word('THE NINJA|OF NEA FILADELFEIA', bg='us', size=150, small='AEK v PANATHINAIKOS · 7 NOVEMBER 1994', at=1.2), type='trailer', hold=3.4,
     sound=[('impact', 0.0, 1.4, 0.7), ('impact2', 1.2, 2.2, 0.9)])

# ── CHAPTER ONE · THE CHAMPIONS ──
chapter('CHAPTER ONE', 'THE CHAMPIONS', 'NEA FILADELFEIA · ATHENS')
beat("Nea Filadelfeia, in the north-west of Athens. The Nikos Goumas Stadium. The home of AEK.",
     dict(kind='locator', title='ATHENS', centre='CITY CENTRE', place='NEA FILADELFEIA', small='NIKOS GOUMAS STADIUM · AEK', bearing=315, d=4.3),
     word('NIKOS GOUMAS|STADIUM', bg='ink', size=170, small='THE HOME OF AEK · NEA FILADELFEIA', at=4.3),   # no stand-in picture passed off as the ground
     type='map', emotion='wonder', intensity=0.5,
     pad=0.5, sound=[('swish', 0.0, 1.0, 0.5)])
beat("And in November nineteen ninety-four, AEK are the champions of Greece. Not for one year. For three in a row.",
     img('lib-trophy.jpg', 'push', veil=0.2), dict(kind='stat', value='3', label='TITLES IN A ROW · 1992 · 1993 · 1994', dt=4.2),
     type='stat', emotion='pride', intensity=0.6,
     pad=0.5, sound=[('impact', 4.2, 1.4, 0.6)])
beat("Their manager is Dušan Bajević. For three seasons, every other club in the country has been chasing his team.",
     word('DUŠAN|BAJEVIĆ', bg='ink', size=210, small='AEK · THE MANAGER · 1994/95', d=4.1),   # a card, never a silhouette passed off as the man
     word('EVERYONE|IS CHASING', bg='paper', size=200, small='THREE SEASONS · ONE TEAM AHEAD', at=4.1),
     type='illustration', emotion='dread', intensity=0.5, pad=0.4)
beat("But this autumn, one club is not chasing. It is running away.",
     img('lib-bowl.jpg', 'push', veil=0.3), dict(kind='question', small='AUTUMN 1994', text='ONE CLUB IS|[RUNNING AWAY]', dt=1.4),
     type='turning', emotion='tension', intensity=0.8, pad=0.6, meta=dict(plain=True), sound=[('riser', 1.6, 2.0, 0.4)])

# ── CHAPTER TWO · THE PERFECT START ──
chapter('CHAPTER TWO', 'THE PERFECT START', 'PANATHINAIKOS · AUTUMN 1994')
beat("Panathinaikos. Managed by Juan Ramón Rocha. And they have started the season like nobody in Greece can remember.",
     img('gate13.jpg', 'panr', veil=0.1),
     type='matchday', emotion='defiance', intensity=0.7, meta=dict(subjects=['crowd', 'flag']), pad=0.4,
     sound=[('chant', 0.0, 6.0, 0.3)])
beat("Seven league matches. Seven wins.",
     dict(kind='form', title='SEVEN FROM SEVEN', sub='PANATHINAIKOS · ALPHA ETHNIKI 1994/95 · MATCHDAYS 1–7', results=list('WWWWWWW'), per_row=7, step=0.22, bracket=(0, 6, '21 POINTS FROM 21'), big=True),
     type='stat', emotion='pride', intensity=0.7, pad=1.2, sound=[('tick', 0.3, 2.0, 0.4)])
beat("Twenty-three goals scored. Five at Ionikos. Five at Kavala. Three past PAOK.",
     dict(kind='explain', form='bars', title='THE FIRST SEVEN MATCHES', bars=[dict(label='SCORED', share=1.0, value=23, hot=True), dict(label='CONCEDED', share=6 / 23, value=6)], d=4.2),
     word('23 GOALS|IN 7 MATCHES', bg='us', size=190, small='IONIKOS 2–5 · KAVALA 1–5 · PAOK 3–0', at=4.2),
     type='stat', emotion='pride', intensity=0.7, pad=0.5)
beat("Their striker, Krzysztof Warzycha, will finish the season with twenty-nine league goals. Their free kicks belong to the Argentine, Juan José Borrelli.",
     img('scarves.jpg', 'panl', veil=0.4), dict(kind='stat', value='29', label='LEAGUE GOALS · KRZYSZTOF WARZYCHA', dt=1.6, d=4.3),
     stamp('FREE KICKS · BORRELLI', 'us', x=420, y=420, dt=7.6, size=96, rot=-3, plate=True),
     type='illustration', emotion='pride', intensity=0.6, meta=dict(subjects=['crowd'], plain=True), sound=[('impact', 1.6, 1.4, 0.5), ('stamp', 7.6, 1.0, 0.6)], pad=0.4)
beat("And at the back, the centre-back. Giannis Kalitzakis. Twenty-eight years old. The Ninja.",
     img('terrace.jpg', 'push', veil=0.5), pol('applause-print.png', x=240, h=880, y=80, stay=True),
     stamp('KALITZAKIS', 'us', x=1040, y=250, dt=2.2, size=96, rot=4), stamp('CENTRE-BACK · 28', 'us', x=1010, y=470, dt=4.0, size=64, rot=-3),
     type='illustration', emotion='pride', intensity=0.6, pad=0.4,
     sound=[('stamp', 2.2, 1.0, 0.6), ('stamp', 4.0, 1.0, 0.6)])
beat("Then the fixture list sends the perfect record to the one ground where it is supposed to end. The home of the champions.",
     dict(kind='cities', a=dict(name='AEK', small='CHAMPIONS · 1992 · 1993 · 1994', bg=COAL), b=dict(name='PANATHINAIKOS', small='PLAYED 7 · WON 7', bg=GREEN, crest='crest-pao.png', size=70),
          mid='MATCHDAY 8', mid_at=2.4, d=4.4),
     word('MATCHDAY 8', bg='ink', size=180, small='THE HOME OF THE CHAMPIONS', at=4.4),
     type='versus', emotion='tension', intensity=0.85, pad=0.6, sound=[('swish', 0.0, 1.0, 0.6), ('clang', 0.9, 1.0, 0.4), ('riser', 4.0, 2.2, 0.4)])

# ── CHAPTER THREE · THE TWENTIETH MINUTE ── (the mini-drama: a want, a clock, a held breath, the release)
chapter('CHAPTER THREE', 'THE TWENTIETH MINUTE', 'MONDAY · 7 NOVEMBER 1994')
beat("Monday, the seventh of November, nineteen ninety-four. In the away end, green and white. On the pitch, the champions against the leaders.",
     img('terrace.jpg', 'pull', veil=0.05), type='matchday', emotion='tension', intensity=0.6, meta=dict(subjects=['stadium']), pad=0.4,
     sound=[('build', 0.0, 8.0, 0.35), ('whistle', 6.6, 1.2, 0.5)])
beat("Twenty minutes in, Panathinaikos win a free kick, out on the right.",
     img('lib-freekick.jpg', 'push', veil=0.1), clock(20), type='illustration', emotion='tension', intensity=0.8, pad=0.3, sound=[('whistle', 0.2, 1.0, 0.4)])
beat("Borrelli stands over it. He does not shoot. He hangs the ball into the penalty area.",
     img('lib-freekick.jpg', 'push', veil=0.1, focus='36% 62%', d=1.7), dict(kind='chalk', play='cross', attack='us', minute=20, go=1.9, hang=30, label='FREE KICK · BORRELLI', dt=1.7),
     type='illustration', emotion='tension', intensity=0.9, pad=0.2)
beat("And for one second, nobody in the ground breathes.",
     img('header-b.jpg', 'push', veil=0.0, focus='54% 26%'), type='illustration', emotion='tension', intensity=1.0, meta=dict(breath=True), pre=0.5, pad=0.9,
     sound=[('hush', 0.0, 4.0, 0.5)])
beat("Kalitzakis. Unmarked. A header, past Ilias Atmatsidis.",
     img('header-a.jpg', 'slam', veil=0.0, focus='54% 22%', mini=dict(home='AEK', score='0 – 0', away='PAO', at=0.3, flip=dict(at=2.6, score='0 – 1'))),
     type='goal', emotion='release', intensity=1.0, meta=dict(plain=True), pad=0.3,
     sound=[('impact', 0.0, 1.6, 0.8), ('goal', 2.4, 7.0, 0.7)])
beat(None, word("GOAL|KALITZAKIS 20'", bg='us', size=200, small='AEK 0 – 1 PANATHINAIKOS'), type='goal', emotion='release', intensity=1.0, hold=2.4,
     sound=[('impact2', 0.0, 2.0, 0.9)])
beat("One nil. The man picked to stop goals has scored one. In the champions' own ground.",
     img('celebrate.jpg', 'push', veil=0.0, focus='50% 30%'), type='illustration', emotion='joy', intensity=0.95, pad=0.4, sound=[('claps', 0.0, 5.0, 0.4)])
beat("Now comes the hard part. There are seventy minutes left.",
     dict(kind='explain', form='timeline', title='THE MATCH CLOCK', left="0'", right="90'", marks=[dict(at=0.5, label='HALF-TIME')],
          ticks=[dict(at=20 / 90, label='KALITZAKIS', value=20, suffix="'", hot=True)]), type='turning', emotion='tension', intensity=0.8, pad=0.7, sound=[('tick', 1.6, 2.6, 0.5)])

# ── CHAPTER FOUR · SEVENTY MINUTES ── (rising tension with a clock; nothing is claimed about a chance nobody recorded for us)
chapter('CHAPTER FOUR', 'SEVENTY MINUTES', 'ONE GOAL TO PROTECT')
beat("Seventy minutes to protect one goal. Away from home. Against the team that has won the last three titles.",
     img('pyro.jpg', 'push', veil=0.0), clock(30), dict(kind='stat', value="70'", label='TO PROTECT ONE GOAL', dt=0.3, d=3.6), type='illustration', emotion='tension', intensity=0.8, meta=dict(plain=True), pad=0.3,
     sound=[('build', 0.0, 7.0, 0.4)])
beat("This is the Ninja's kind of night. The work he was actually picked for.",
     img('supporter.jpg', 'push', veil=0.05), clock(45), type='illustration', emotion='tension', intensity=0.85, pad=0.3)
beat("An hour gone. Still one nil.", img('lib-bowl.jpg', 'push', veil=0.1), clock(60), type='illustration', emotion='tension', intensity=0.9, meta=dict(plain=True), pad=0.25,
     sound=[('tick', 0.0, 2.4, 0.5)])
beat("Seventy-five minutes. Still one nil.", img('lib-clock.jpg', 'push', veil=0.1), clock(75), type='illustration', emotion='tension', intensity=0.95, pad=0.25,
     sound=[('tick', 0.0, 2.4, 0.6)])
beat("Ninety.", img('lib-corner.jpg', 'push', veil=0.1), clock(90), type='illustration', emotion='tension', intensity=1.0, meta=dict(breath=True), pad=1.0,
     sound=[('tick', 0.0, 2.0, 0.7)])
beat("And the referee ends it.", img('lib-whistle.jpg', 'slam', veil=0.0), type='goal', emotion='release', intensity=0.9, meta=dict(plain=True), pad=0.4,
     sound=[('whistle', 0.9, 1.6, 0.8), ('final', 1.4, 6.0, 0.5)])
beat("AEK nil. Panathinaikos one.",
     dict(kind='score', us='PANATHINAIKOS', them='AEK', us_goals=1, them_goals=0, us_crest='crest-pao.png', cap='FULL TIME · NIKOS GOUMAS STADIUM · 7 NOVEMBER 1994', bg='scarf.jpg'),
     type='score', emotion='joy', intensity=0.9, meta=dict(outcome='win', plain=True, claims=['result']), pad=0.5)
beat("Eight matches. Eight wins.",
     dict(kind='form', title='EIGHT FROM EIGHT', sub='PANATHINAIKOS · AFTER MATCHDAY 8', results=list('WWWWWWWW'), per_row=8, step=0.16, bracket=(7, 7, 'AEK 0–1 · NEA FILADELFEIA')),
     type='stat', emotion='joy', intensity=0.9, pad=0.9, sound=[('tick', 0.3, 1.2, 0.5)])

# ── CHAPTER FIVE · WHAT ONE HEADER DECIDED ── (the payoff: the table answers the opening)
chapter('CHAPTER FIVE', 'WHAT IT DECIDED', 'THE SEASON · 1994/95')
beat("So what did one header in November actually decide? Follow the table.",
     img('lib-desk.jpg', 'push', veil=0.2), word('WHAT DID IT|ACTUALLY DECIDE?', bg='ink', size=150, small='ONE HEADER · ONE NIGHT'), type='illustration', emotion='wonder', intensity=0.5, pad=0.4)
beat("Panathinaikos won nine in a row before anybody took a point off them. The best start the club had ever made.",
     dict(kind='form', title='NINE STRAIGHT WINS', sub='THE RUN ENDED 0–0 AT IRAKLIS · MATCHDAY 10', results=list('WWWWWWWWWD'), per_row=10, step=0.2, bracket=(0, 8, 'MATCHDAY 8 · AEK 0–1'), d=4.3),
     img('gate13.jpg', 'pull', veil=0.05, dt=4.3),
     type='stat', emotion='pride', intensity=0.7, pad=0.5)
beat("By May they were champions, with eighty-three points. Sixteen clear of second place.",
     dict(kind='table', rows=[['PANATHINAIKOS', 83], ['OLYMPIACOS', 67], ['PAOK', 65], ['APOLLON ATHENS', 63], ['AEK', 62], ['IRAKLIS', 62], ['ARIS', 62]], highlight=0, mark=4, cut=False, zoom=1.6, d=4.2),
     word('83 POINTS', bg='us', size=250, small='CHAMPIONS · SIXTEEN CLEAR OF SECOND', at=4.2),
     type='record', emotion='joy', intensity=0.8, pad=0.5, sound=[('swish', 0.0, 1.0, 0.5)])
beat("And AEK, champions three years running, finished fifth.",
     img('lib-radio.jpg', 'pull', veil=0.1), dict(kind='stat', value='5TH', label='AEK · 62 POINTS · 21 BEHIND', dt=2.4),
     type='illustration', emotion='grief', intensity=0.6, meta=dict(plain=True), pad=0.6, sound=[('stamp', 2.6, 1.0, 0.6)])
beat("The two clubs met twice more that season. The return league match, three nil.",
     dict(kind='ledger', title='1994/95 · LEAGUE', us='PAO', them='AEK', compact=True, rows=[['7 NOVEMBER · AWAY', 1, 0], ['THE RETURN · HOME', 3, 0]], row_at=[0.3, 1.2], d=2.9),
     word('3 – 0', bg='us', size=330, small='THE RETURN · PANATHINAIKOS v AEK', at=2.9),
     type='record', emotion='joy', intensity=0.8, pad=0.3)
beat("The cup final, one nil. A Warzycha penalty, deep in extra time.",
     img('tackle.jpg', 'pull', veil=0.1, focus='52% 50%'), stamp('CUP FINAL · 1–0', 'us', x=110, y=150, dt=1.2, size=90, rot=-3, plate=True),
     type='illustration', emotion='joy', intensity=0.85, meta=dict(plain=True), pad=0.3, sound=[('stamp', 1.2, 1.0, 0.7)])
beat("Three matches. Three Panathinaikos wins. AEK did not score in any of them.",
     dict(kind='ledger', title='1994/95', us='PAO', them='AEK', compact=True, rows=[['LEAGUE · AWAY', 1, 0], ['LEAGUE · HOME', 3, 0], ['CUP FINAL', 1, 0]], row_at=[0.3, 1.2, 2.1], d=4.2),
     img('team.jpg', 'push', veil=0.0, dt=4.2), stamp('THE DOUBLE', 'us', x=700, y=700, dt=4.6, size=120, rot=-5),
     type='illustration', emotion='joy', intensity=0.9, pad=0.9, meta=dict(plain=True),
     sound=[('stamp', 4.6, 1.0, 0.8), ('claps', 4.2, 3.0, 0.4)])
beat("And it started with a defender, in the wrong penalty area, at exactly the right second.",
     img('header-a.jpg', 'pull', veil=0.0, focus='54% 22%'), type='illustration', emotion='pride', intensity=0.8, pad=0.7)

# ── CLOSE · the file's last pages, then the hand-over ──
beat("More than seventy caps for Greece, and not one goal. But on the night his club needed one, the Ninja was there.",
     img('dossier.jpg', 'pull', veil=0.1), stamp('FILE CLOSED', 'us', x=700, y=640, dt=5.6, size=110, rot=6),
     type='illustration', emotion='pride', intensity=0.7, pad=0.6, sound=[('stamp', 5.6, 1.0, 0.8)])
beat(None, word('WHAT WAS A DEFENDER|DOING UP THERE?', bg='ink', size=128, small='THE OPENING QUESTION', d=2.2),
     word('SCORING THE|ONLY GOAL', bg='us', size=190, small="KALITZAKIS 20' · AEK 0 – 1 PANATHINAIKOS", at=2.2), type='trailer', hold=5.2,
     sound=[('impact', 0.0, 1.6, 0.6), ('impact2', 2.2, 2.0, 0.9)])
beat("One last page. Before the decade was out, Giannis Kalitzakis changed clubs. He signed for AEK",
     img('lib-tunnel.jpg', 'push', veil=0.25), type='turning', emotion='wonder', intensity=0.6, pad=0.9, sound=[('page', 0.0, 1.0, 0.5)])
beat("And the ground where it happened is gone. The old Nikos Goumas Stadium was demolished in two thousand and three.",
     word('NIKOS GOUMAS|1930 – 2003', bg='ink', size=170, small='NEA FILADELFEIA', d=4.2),
     word('WHERE IT|HAPPENED', bg='paper', size=190, small='DEMOLISHED IN 2003', at=4.2),   # a card: no stand-in picture of the ground (model-film rule 19), and it breaks the documentary run (editing rule 5)
     type='trailer', emotion='grief', intensity=0.5, pad=0.6)
beat("The cup final they met in that spring is a story for another night. Subscribe, and it will find you.",
     img('badge.jpg', 'push', veil=0.3), dict(kind='follow', club='Panathinaikos · AEK', press_at=4.6, dt=1.2),
     type='follow', pad=1.0, sound=[('claps', 4.6, 2.0, 0.4)])
beat(None, img('scarf.jpg', 'push', veil=0.55), dict(kind='end', title='The Ninja of Nea Filadelfeia', line='NEXT · THE 1995 CUP FINAL · @FanLifeFootballStories'), type='end', hold=4.4)

_GOAL = next(i for i, b in enumerate(B) if b['vo'] and b['vo'].startswith('Kalitzakis. Unmarked'))
_CH4 = next(i for i, b in enumerate(B) if b['shots'][0].get('big') == 'SEVENTY MINUTES')
_CH5 = next(i for i, b in enumerate(B) if b['shots'][0].get('big') == 'WHAT IT DECIDED')
SB = dict(slug='pao-aek-1994', title='The Ninja of Nea Filadelfeia', minutes=[3.5, 7], palette=dict(us=GREEN, them=AMBER), edit=True, mark=True,
          pronounce={'Krzysztof Warzycha': 'ˈkʃɪʃtɒf vaˈʒɪha', 'Warzycha': 'vaˈʒɪha', 'Rocha': 'ˈrɒtʃa', 'Borrelli': 'boˈrɛli', 'Juan Ramón Rocha': 'ˈhwan raˈmɒn ˈrɒtʃa', 'Juan José Borrelli': 'ˈhwan hoˈseɪ boˈrɛli'},
          us=dict(), them=dict(), agg_label='', karaoke=True, sub_limit=44, bed=0.16,
          # the score: dark until the cross hangs; silence under the held breath; the lift ON the header; the siege; the close
          music=[dict(file='dark-leberch-625667.mp3', from_beat=1, to_beat=_GOAL - 2, vol=0.13),
                 dict(file='energy-gr0za-627556.mp3', from_beat=_GOAL, to_beat=_CH4 - 1, vol=0.11),
                 dict(file='sports-atlasaudio-625740.mp3', from_beat=_CH4, to_beat=_CH5 - 1, vol=0.11),
                 dict(file='lofi-sub-clair-628178.mp3', from_beat=_CH5, vol=0.12)],
          beats=B)

# ── THE VERTICAL CUTS (studio/docu/vertical.py) ── three Shorts that open a loop and send to the film; two Reels that
# stand on their own. Every line is one of the film's own takes; `focus` is where the picture's subject is.
L = {k: next(b['vo'] for b in B if b['vo'] and b['vo'].startswith(k)) for k in (
    'He played more', 'He never scored', 'They called him', 'A defender.', 'So what was he doing', 'Seven league matches', 'Twenty-three goals',
    'Then the fixture list', 'Twenty minutes in', 'Borrelli stands', 'And for one second', 'Kalitzakis. Unmarked', 'One nil.',
    'Panathinaikos won nine', 'By May they were', 'And AEK, champions', 'Three matches.')}
END = dict(big='Watch the full film', small='The Ninja of Nea Filadelfeia · on YouTube')
VERTICAL = [
    dict(name='short-1-the-ninja', kind='short', hook='70+ caps. 0 goals. One night.', kicker='AEK v Panathinaikos · 1994', music='energy-gr0za-627556.mp3', end=END, scenes=[
        dict(src='dossier.jpg', focus=(0.24, 0.5), zoom=(1.25, 1.5), vo=L['He played more']),
        dict(src='portrait.jpg', focus=(0.5, 0.36), zoom=(1.0, 1.12), vo=L['He never scored']),
        dict(src='applause.jpg', focus=(0.56, 0.32), zoom=(1.0, 1.15), vo=L['They called him']),
        dict(src='fence.jpg', focus=(0.38, 0.5), focus_to=(0.7, 0.5), zoom=(1.05, 1.05), vo=L['A defender.']),
        dict(src='header-b.jpg', focus=(0.53, 0.36), zoom=(1.0, 1.3), vo=L['So what was he doing']),
        dict(card=dict(big='What was a defender doing up there?', small='The answer is in the film', size=120), d=2.4)]),
    dict(name='short-2-seven-from-seven', kind='short', hook='Seven played. Seven won. Then this fixture.', kicker='Panathinaikos · autumn 1994', music='energy-gr0za-627556.mp3', end=END, scenes=[
        dict(src='gate13.jpg', focus=(0.47, 0.6), zoom=(1.0, 1.2), vo=L['Seven league matches']),
        dict(card=dict(big='7 from 7', small='23 goals scored · 6 conceded', bg='us', size=230), d=1.8),
        dict(src='scarves.jpg', focus=(0.3, 0.6), focus_to=(0.7, 0.55), zoom=(1.1, 1.1), vo=L['Twenty-three goals']),
        dict(src='terrace.jpg', focus=(0.22, 0.6), focus_to=(0.62, 0.55), zoom=(1.05, 1.2), vo=L['Then the fixture list']),
        dict(card=dict(big='Did the run survive?', small="Matchday 8 · the champions' ground", size=150), d=2.4)]),
    dict(name='short-3-one-second', kind='short', hook='The second nobody breathed', kicker='Nea Filadelfeia · minute 20', music='dark-leberch-625667.mp3', end=END, scenes=[
        dict(src='lib-freekick.jpg', focus=(0.36, 0.62), zoom=(1.0, 1.25), vo=L['Twenty minutes in']),
        dict(src='pyro.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.25), vo=L['Borrelli stands']),
        dict(src='header-b.jpg', focus=(0.53, 0.3), zoom=(1.2, 1.7), vo=L['And for one second'], pad=0.9),
        dict(card=dict(big='What happened next?', small='A defender. The champions. One header.', size=150), d=2.6)]),
    dict(name='reel-1-the-header', kind='reel', hook='The defender who beat the champions', kicker='AEK 0–1 Panathinaikos · 7 Nov 1994', music='energy-gr0za-627556.mp3',
         end=dict(big='The full story', small='The Ninja of Nea Filadelfeia · FanLife: Football Stories on YouTube'), scenes=[
        dict(src='lib-freekick.jpg', focus=(0.36, 0.62), zoom=(1.0, 1.2), vo=L['Twenty minutes in']),
        dict(src='header-b.jpg', focus=(0.53, 0.3), zoom=(1.2, 1.6), vo=L['And for one second'], pad=0.6),
        dict(src='header-a.jpg', focus=(0.52, 0.36), zoom=(1.0, 1.25), vo=L['Kalitzakis. Unmarked']),
        dict(card=dict(big="Goal Kalitzakis 20'", small='AEK 0 – 1 Panathinaikos', bg='us', size=170), d=1.8),
        dict(src='celebrate.jpg', focus=(0.5, 0.36), zoom=(1.0, 1.2), vo=L['One nil.'])]),
    dict(name='reel-2-what-it-decided', kind='reel', hook='What one header decided', kicker='Greece · 1994/95', music='sports-atlasaudio-625740.mp3',
         end=dict(big='The full story', small='The Ninja of Nea Filadelfeia · FanLife: Football Stories on YouTube'), scenes=[
        dict(src='header-a.jpg', focus=(0.52, 0.36), zoom=(1.3, 1.0), vo=L['Panathinaikos won nine']),
        dict(src='team.jpg', focus=(0.36, 0.42), focus_to=(0.62, 0.42), zoom=(1.1, 1.1), vo=L['By May they were']),
        dict(card=dict(big='83 points', small='Champions · 16 clear of second', bg='us', size=210), d=1.8),
        dict(src='lib-radio.jpg', focus=(0.62, 0.5), zoom=(1.0, 1.2), vo=L['And AEK, champions']),
        dict(src='celebrate.jpg', focus=(0.5, 0.36), zoom=(1.0, 1.2), vo=L['Three matches.']),
        dict(card=dict(big='The double', small='League and cup · 1994/95', bg='us', size=200), d=1.8)]),
]
# The two thumbnails (studio/docu/model.thumb): the hook read off the record, measured at 168×94.
THUMBS = [dict(file='thumbnail-a.jpg', src='header-a.jpg', focus=(0.2, 0.3), zoom=1.3, side='left', lines=['70+ CAPS', '0 GOALS', '1 HEADER'], hot=2, kicker='AEK v PANATHINAIKOS · 1994', size=132, top=150),
          dict(file='thumbnail-b.jpg', src='dossier.jpg', focus=(0.3, 0.5), zoom=1.45, side='right', lines=['THE NINJA', 'FILE'], hot=0, kicker='CLASSIFIED · ATHENS DERBY 1994', size=150, top=190)]

if __name__ == '__main__':
    if len(sys.argv) > 3 and sys.argv[1] == '--pack':
        made = pack(Path(sys.argv[2]), Path(sys.argv[3]))
        print(len(made), 'assets in', sys.argv[3])
    else:
        out = sys.argv[1] if len(sys.argv) > 1 else 'storyboard.json'
        open(out, 'w').write(json.dumps(SB, indent=1, ensure_ascii=False))
        Path(out).with_name('cuts.json').write_text(json.dumps(VERTICAL, indent=1, ensure_ascii=False))
        Path(out).with_name('thumbs.json').write_text(json.dumps(THUMBS, indent=1, ensure_ascii=False))
        print(out, len(B), 'beats', sum(len((b['vo'] or '').split()) for b in B), 'words')
