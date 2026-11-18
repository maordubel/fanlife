"""Storyboard: AROUND THE BALL · 22 · THE SIX-MINUTE MATCH — Real Madrid v Real Sociedad, La Liga, stopped three
minutes from time at 1–1 on 12 December 2004 by a bomb warning phoned to Gara in the name of ETA; completed on
5 January 2005, Real Madrid 2–1 (Zidane, penalty), Vanderlei Luxemburgo's first match.

Script: docs/fanlife/around-the-ball/atb22-six-minutes.script.md (its source slot is filled here, 18.11.2026).
Built on the Ronaldo film (atb_ronaldo_1998.py) and the model film (docs/rules/model-film.md); the long form is the
sprint's (claude/youtube-sprint-plan-2026-11-10.md): the partial answer (the evacuation) inside 0:15, a chapter turn
about every 90 s, one question planted in the cold open ("Who wins a match that never ended?") and paid off at the end.

Facts (two independent publishers each; the ledger with URLs is docs/fanlife/around-the-ball/atb22-six-minutes.FACTS.md).
NOT said (one publisher, or the publishers disagree): García Remón "sacked" (UEFA: kept in another role — said
as "replaced"); the 2002 injury count (17 · 6 · 8 · 9 — said as "minor"); the minute of Nihat's goal; the exact minute of the stop (said as
"three minutes from time"); Pérez learning first; coats from the kit men; the referee in blankets; the street's name;
the Kovačević / Nihat bus exchange; "the first evacuation of a Spanish stadium"; García Remón's last match and sacking
date; Madrid's place before 5 January; the minute and corner of the penalty; Raúl hitting the post. Disputes told as
versions: the length of the last minutes (six · six forty · seven); the crowd on 5 January (15,000 · 22,000).
Pictures: the common library (studio/kit/beats/common), inked to the house paper. Faces are invented; no real person
is drawn as himself, no generic ground is labelled as the Bernabéu.

    python3 -m studio.docu.films.atb_six_minutes_2004 storyboard.json            # the storyboard (+ cuts.json, thumbs.json)
    python3 -m studio.docu.films.atb_six_minutes_2004 --pack ASSETS              # the asset pack
"""
import json
import sys
from pathlib import Path

BLUE, RED, COAL, CREAM = '#1D3F8F', '#C8102E', '#15130F', '#F4ECD8'
# The common library: the name the storyboard uses → the piece in studio/kit/beats/common.
LIB = {'bowl': 'stadium-night-bowl-n', 'stadium': 'europe-stadium-night-n', 'radio': 'radio-street-kr', 'radio-b': 'radio-street-b-kr',
       'street': 'street-matchday-crowd-kr', 'street-b': 'street-matchday-crowd-b-kr', 'streetdusk': 'street-dusk-kr',
       'lamp': 'street-lamp-crowd-kr', 'lightsoff': 'stadium-lights-off-n', 'ticket': 'close-ticket-in-hand-kr',
       'dugout': 'dugout-substitutes', 'volley': 'volley-edge-box-kr', 'volley-b': 'volley-edge-box-b-kr', 'net': 'ball-in-net-kr',
       'net-b': 'ball-in-net-b-kr', 'manager': 'manager-blank-board-stadium', 'clock': 'last-minute-clock-n',
       'clock-b': 'last-minute-clock-b-n', 'tunnel-gate': 'tunnel-gate-silhouette-n', 'tunnel': 'tunnel-walk-out',
       'rooftops': 'city-rooftops-dawn-n', 'news': 'newspaper-stand-n', 'news-b': 'newspaper-stand-b-n',
       'whistle': 'final-whistle-arms-kr', 'home-end': 'home-end-night-kr', 'crowd': 'crowd-scarves-night-kr',
       'terrace-empty': 'terrace-empty-dusk-n', 'terrace-empty-b': 'terrace-empty-old-n', 'boots': 'close-boots-tunnel-n',
       'press': 'press-conference-n', 'press-b': 'press-conference-b-n', 'spot': 'penalty-spot-close-n', 'spot-b': 'penalty-spot-close-b-n',
       'boardroom': 'boardroom-table-n', 'boardroom-b': 'boardroom-table-b-n', 'signing': 'signing-desk-kr',
       'kickoff': 'kick-off-centre-kr', 'dressing': 'dressing-room-silence-kr', 'turnstile': 'turnstile-queue-kr',
       'scrap': 'scrapbook-desk-kr', 'despair': 'despair-kneeling-kr', 'pile': 'celebration-pile-kr', 'archive': 'archive-trophy-spotlight',
       'flags': 'flags-pole-kr'}


def pack(out: Path) -> dict:
    """The film's asset folder from the common library, inked. → {name: where it came from}."""
    from PIL import Image
    here = Path(__file__).resolve()
    sys.path.insert(0, str(here.parents[3]))
    from studio import paper
    lib = here.parents[2] / 'kit' / 'beats' / 'common'
    out.mkdir(parents=True, exist_ok=True)
    made = {}
    for name, piece in LIB.items():
        src = next((p for p in lib.glob(piece + '.*') if p.suffix.lower() in ('.webp', '.jpg', '.png')), None)
        if src is None:
            raise SystemExit(f'the common library has no {piece}')
        im = Image.open(src).convert('RGB')
        if im.width < 1600:
            k = 1600 / im.width
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        if piece.endswith('-kr'):
            im = paper.recolor(im, BLUE)
        inked(im).save(out / f'{name}.jpg', quality=93)
        made[f'{name}.jpg'] = f'beat:common/{piece}'
    logo = here.parents[5] / 'public' / 'brand' / 'fanlife' / 'logo-512.png'
    (out / 'fanlife.png').write_bytes(logo.read_bytes())
    (out / 'PACK.json').write_text(json.dumps(made, indent=1, ensure_ascii=False))
    return made


def inked(im):
    """One world, few inks (editing rule 1): ink to cream by lightness with a halftone grain; only the film's blue survives."""
    import numpy as np
    from PIL import Image
    a = np.asarray(im.convert('RGB'), 'float32') / 255
    hsv = np.asarray(im.convert('HSV'), 'float32')
    lum = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2])
    h, w = lum.shape
    yy, xx = np.mgrid[0:h, 0:w]
    dots = 0.5 + 0.5 * np.sin(xx * 1.05 + yy * 0.6) * np.sin(yy * 1.05 - xx * 0.6)
    lum = np.clip(lum + (dots - 0.5) * 0.10 * (1 - np.abs(lum - 0.5) * 2), 0, 1)
    lum = np.clip((lum - 0.04) / 0.92, 0, 1) ** 0.95
    ink, cream = np.array([0x15, 0x13, 0x0f], 'float32'), np.array([0xf4, 0xec, 0xd8], 'float32')
    out = ink + (cream - ink) * lum[..., None]
    deg = hsv[..., 0] * (360 / 255)
    blue = (deg > 195) & (deg < 255) & (hsv[..., 1] > 0.3 * 255)
    b = np.array([0x1D, 0x3F, 0x8F], 'float32')
    tone = np.clip(0.55 + lum * 0.9, 0, 1.45)[..., None]
    out = np.where(blue[..., None], np.clip(b * tone, 0, 255), out)
    return Image.fromarray(out.astype('uint8'), 'RGB')



def img(src, move='push', **k): return dict(kind='image', src=src + '.jpg', move=move, **k)
def word(text, **k): return dict(kind='word', text=text, **k)
def stamp(text, side='us', x=300, y=560, dt=1.0, size=150, **k): return dict(kind='stamp', text=text, side=side, x=x, y=y, dt=dt, size=size, **k)
def clock(minute, dt=0.4, **k): return dict(kind='clockdev', minute=minute, dt=dt, **k)
def flap(frm, to, at=0.3, d=3.0, small=''): return dict(kind='flap', frm=frm, to=to, at=at, d=d, small=small, z=14)


B = []
CH = [-1]


def beat(vo=None, *shots, type='illustration', emotion=None, intensity=None, **k):
    meta = dict(type=type, chapter=max(0, CH[0]), emotion=emotion, intensity=intensity, **(k.pop('meta', {})))
    B.append(dict(vo=vo, shots=list(shots), meta=meta, **k))


def chapter(small, big, line, window):
    CH[0] += 1
    B.append(dict(vo=None, shots=[dict(kind='ticket', small=small, big=big, line=line, window=window + '.jpg')], hold=2.0,
                  meta=dict(type='chapter', chapter=CH[0]), sound=[('page', 0.0, 1.0, 0.5)]))


RS = dict(id='rs', small='R. MADRID · R. SOCIEDAD')   # the held corner board
QUESTION = 'WHO WINS A MATCH|THAT NEVER ENDED?'

beat(None, dict(kind='ident', line='A FAN LIFE FILM'), type='open', hold=1.8, sound=[('sting', 0.1, 1.7, 0.5)])

# ── COLD OPEN ── the stake off the record, the evacuation (the partial answer) before 0:15, the question, no result
beat("Madrid. Real Madrid against Real Sociedad. One, one, and three minutes left.",
     img('bowl', 'push', veil=0.05), clock(87), type='open', emotion='tension', intensity=0.7, pre=0.2, pad=0.1,
     meta=dict(plain=True, board=dict(RS, score='1–1')), sound=[('tick', 0.0, 2.4, 0.5)])
beat("A caller phones a Basque newspaper, in the name of ETA. A bomb in the stadium, set for nine o'clock.",
     img('radio', 'slam', veil=0.0), stamp('A BOMB · 9 PM', 'them', x=240, y=460, dt=3.2, size=130, rot=-4, plate=True),
     type='open', emotion='dread', intensity=0.9, pad=0.1, meta=dict(plain=True), sound=[('stamp', 3.2, 1.0, 0.7)])
beat("In about ten minutes, some seventy thousand people are out in the street. The players too, still in their kit.",
     img('street', 'push', veil=0.05), stamp('70,000 OUT', 'them', x=520, y=460, dt=2.6, size=140, rot=-3, plate=True),
     type='open', emotion='dread', intensity=1.0, pad=0.1, meta=dict(plain=True), sound=[('impact', 0.4, 1.4, 0.7), ('stamp', 2.6, 1.0, 0.7)])
beat("No bomb is found. But the match has not ended.",
     img('lightsoff', 'push', veil=0.1), type='open', emotion='tension', intensity=0.9, pad=0.3, meta=dict(plain=True))
beat("Twenty-four days later, they come back to play the rest.", img('ticket', 'push', veil=0.3),
     word(QUESTION, bg='ink', size=140, small='12 DECEMBER 2004 · 5 JANUARY 2005', at=1.8),
     type='turning', emotion='tension', intensity=0.9, pad=0.6, meta=dict(plain=True), sound=[('riser', 0.2, 1.4, 0.5), ('impact', 1.8, 1.6, 0.7)])
beat(None, word('THE SIX-MINUTE', bg='ink', size=210, d=1.2), word('THE SIX-MINUTE|MATCH', bg='us', size=200, small='MADRID · 2004–2005', at=1.2),
     type='trailer', hold=3.2, sound=[('impact', 0.0, 1.4, 0.7), ('impact2', 1.2, 2.2, 0.9)])

# ── CHAPTER ONE · A SUNDAY IN DECEMBER ── the match as it was, the coach to remember
chapter('CHAPTER ONE', 'A SUNDAY IN DECEMBER', 'MADRID · 12 DECEMBER 2004', 'stadium')
beat("Sunday, the twelfth of December, two thousand and four. Real Madrid are at home to Real Sociedad, in La Liga.",
     img('stadium', 'push', veil=0.1), flap('2026', '2004', at=1.6, d=2.8, small='12 DECEMBER · LA LIGA'),
     type='matchday', emotion='calm', intensity=0.5, pad=0.3, sound=[('page', 0.0, 1.0, 0.4)])
beat("Look at the Madrid team that night. Zidane. Ronaldo. Beckham. Roberto Carlos. Raúl. Figo.",
     word('ZIDANE · RONALDO · BECKHAM|ROBERTO CARLOS · RAÚL · FIGO', bg='ink', size=104, small='REAL MADRID · 12 DECEMBER 2004'),
     type='record', emotion='wonder', intensity=0.7, pad=0.4)
beat("And on the bench, Michael Owen, who comes on in the second half.", img('dugout', 'push', veil=0.1),
     stamp('MICHAEL OWEN', 'us', x=220, y=200, dt=1.4, size=110, rot=-3, plate=True),
     type='illustration', emotion='wonder', intensity=0.5, pad=0.3, sound=[('stamp', 1.4, 1.0, 0.5)])
beat("Just before half-time, Míchel Salgado crosses, and Ronaldo scores with his left foot.", img('volley', 'push', veil=0.0), clock(42),
     type='goal', emotion='joy', intensity=0.9, pad=0.4, meta=dict(board=dict(RS, score='1–0', flip_at=3.4), plain=True), sound=[('goal', 3.4, 4.0, 0.5)])
beat("In the second half, Real Sociedad's striker Nihat equalises, with an acrobatic finish. One, one.", img('net', 'slam', veil=0.05),
     type='goal', emotion='tension', intensity=0.9, pad=0.4, meta=dict(board=dict(RS, score='1–1', flip_at=2.6), plain=True), sound=[('groan', 2.6, 2.0, 0.4)])
beat("On the Madrid bench sits the coach, Mariano García Remón.", img('manager', 'push', veil=0.1),
     word('MARIANO GARCÍA REMÓN', bg='ink', size=130, small='REAL MADRID COACH · 12 DECEMBER', at=1.8),
     type='illustration', emotion='calm', intensity=0.5, pad=0.3, meta=dict(board=dict(RS, score='1–1')))
beat("Remember his name. When this match finally ends, he will not be there.", img('dugout', 'pull', veil=0.2),
     type='turning', emotion='wonder', intensity=0.8, pad=0.5, meta=dict(board=dict(RS, score='1–1')))
beat("Into the last minutes, it is still one, one.", img('clock', 'push', veil=0.05), clock(85),
     type='illustration', emotion='tension', intensity=0.8, pad=0.3, meta=dict(board=dict(RS, score='1–1')), sound=[('tick', 0.0, 2.4, 0.4)])
beat("And then, three minutes from time, the players walk off the pitch.", img('tunnel-gate', 'push', veil=0.05),
     type='turning', emotion='dread', intensity=0.9, pad=0.8, meta=dict(turn=True, board=dict(RS, score='1–1')))

# ── CHAPTER TWO · THE CALL ── the days before, the record of the ground, the warning
chapter('CHAPTER TWO', 'THE CALL', 'A BASQUE NEWSPAPER · THAT EVENING', 'news')
beat("To understand why, go back a few days.", img('rooftops', 'push', veil=0.1), type='illustration', emotion='tension', intensity=0.5, pad=0.3)
beat("In early December, the Basque separatist group ETA had set off a wave of small bombs across Spain.",
     img('news', 'push', veil=0.05), stamp('ETA', 'them', x=520, y=460, dt=2.2, size=160, rot=-3, plate=True),
     type='illustration', emotion='dread', intensity=0.7, pad=0.3, sound=[('stamp', 2.2, 1.0, 0.6)])
beat("Before the explosions came warnings, phoned to a Basque newspaper. Its name was Gara.",
     img('radio-b', 'push', veil=0.05), word('GARA', bg='ink', size=280, small='A BASQUE NEWSPAPER', at=2.8),
     type='illustration', emotion='dread', intensity=0.7, pad=0.3)
beat("And the Bernabéu had been a target before.", img('stadium', 'pull', veil=0.2), type='turning', emotion='dread', intensity=0.8, pad=0.3)
beat("In May two thousand and two, hours before a Champions League semi-final against Barcelona, a car bomb exploded near the stadium.",
     img('lamp', 'push', veil=0.05), flap('2004', '2002', at=0.6, d=2.8, small='MAY · BEFORE MADRID v BARCELONA'),
     type='illustration', emotion='dread', intensity=0.8, pad=0.3)
beat("The injuries were minor. That time too, the warning had come by phone, to Gara. And the match went ahead that same night.",
     img('stadium', 'push', veil=0.1), word('MINOR INJURIES|THE MATCH WENT AHEAD', bg='ink', size=120, small='1 MAY 2002 · MADRID v BARCELONA', at=1.8),
     type='record', emotion='calm', intensity=0.6, pad=0.4)
beat("Now, on this Sunday evening, Gara takes another call. The caller speaks in the name of ETA.",
     img('radio', 'push', veil=0.05), type='illustration', emotion='dread', intensity=0.9, pad=0.3, sound=[('tick', 0.0, 3.0, 0.4)])
beat("There is a bomb in the stadium, he says. It will go off at nine.",
     word('A BOMB|AT 9 PM', bg='them', size=230, small='THE WARNING · IN THE NAME OF ETA'),
     type='record', emotion='dread', intensity=1.0, pad=0.5, sound=[('impact', 0.0, 1.4, 0.7)])
beat("Nine o'clock is about when the final whistle is due.", img('clock-b', 'push', veil=0.05), clock(87),
     type='illustration', emotion='dread', intensity=0.9, pad=0.3, meta=dict(board=dict(RS, score='1–1')))
beat("The referee, Vicente Lizondo Cortés, is ordered to stop the match.", img('whistle', 'push', veil=0.05),
     stamp('LIZONDO CORTÉS', 'them', x=220, y=200, dt=2.0, size=100, rot=-3, plate=True),
     type='illustration', emotion='tension', intensity=0.9, pad=0.3, meta=dict(board=dict(RS, score='1–1')), sound=[('whistle', 0.4, 1.2, 0.6), ('stamp', 2.0, 1.0, 0.5)])
beat("He sends the players off. He does not tell them why.", img('tunnel', 'push', veil=0.05),
     type='turning', emotion='dread', intensity=1.0, pad=0.8, meta=dict(turn=True, breath=True, board=dict(RS, score='1–1')), sound=[('hush', 0.0, 2.6, 0.5)])

# ── CHAPTER THREE · TEN MINUTES ── the emptying, the street, the search, nine o'clock
chapter('CHAPTER THREE', 'TEN MINUTES', 'THE BERNABÉU · THE EVACUATION', 'crowd')
beat("Then the announcement. Everyone must leave the stadium.", img('home-end', 'push', veil=0.05),
     type='illustration', emotion='dread', intensity=0.9, pad=0.3, sound=[('impact', 0.3, 1.4, 0.6)])
beat("About seventy thousand people.",
     dict(kind='stat', value='70,000', label='PEOPLE · OUT OF THE BERNABÉU', dt=0.4),
     type='stat', emotion='dread', intensity=0.9, pad=0.4)
beat("Hundreds of fans stream across the pitch to reach the exits.", img('crowd', 'push', veil=0.05),
     type='illustration', emotion='tension', intensity=0.8, pad=0.3)
beat("In about ten minutes, the stadium is empty. Nobody is seriously hurt.", img('terrace-empty', 'pull', veil=0.05),
     word('ABOUT|10 MINUTES', bg='ink', size=220, small='70,000 PEOPLE OUT', at=2.0),
     type='record', emotion='wonder', intensity=0.9, pad=0.4)
beat("Outside, Real Madrid's players stand in the street, still in their kit.", img('street-b', 'push', veil=0.05),
     type='illustration', emotion='wonder', intensity=0.8, pad=0.3)
beat("Zidane, Ronaldo, Beckham, in shirts and boots on a Madrid pavement, in December.", img('boots', 'push', veil=0.05),
     stamp('IN THEIR KIT', 'us', x=520, y=460, dt=2.8, size=130, rot=-3, plate=True),
     type='illustration', emotion='wonder', intensity=0.8, pad=0.3, sound=[('stamp', 2.8, 1.0, 0.6)])
beat("One of them, the defender Iván Helguera, said it plainly.", img('streetdusk', 'push', veil=0.1),
     type='illustration', emotion='dread', intensity=0.7, pad=0.3)
beat("We were scared to death. It's a shame that sport and politics get mixed up.",
     dict(kind='quote', text='“We were scared to death. It’s a shame that sport and politics get mixed up.”', who='IVÁN HELGUERA · REAL MADRID'),
     type='quote', emotion='dread', intensity=0.9, pad=0.6)
beat("Inside, police with sniffer dogs search the empty stands.", img('terrace-empty-b', 'push', veil=0.1),
     type='illustration', emotion='tension', intensity=0.8, pad=0.3, sound=[('tick', 0.0, 3.0, 0.4)])
beat("Nine o'clock comes.", img('clock', 'push', veil=0.0),
     type='illustration', emotion='dread', intensity=1.0, pad=1.0, meta=dict(breath=True), sound=[('hush', 0.0, 2.6, 0.5)])
beat("And goes.", img('lightsoff', 'pull', veil=0.1), type='illustration', emotion='release', intensity=0.8, pad=0.4)
beat("No bomb is found. It was a false alarm.",
     img('terrace-empty', 'push', veil=0.2), stamp('FALSE ALARM', 'us', x=520, y=460, dt=1.6, size=150, rot=-4, plate=True),
     type='record', emotion='release', intensity=0.9, pad=0.4, sound=[('stamp', 1.6, 1.0, 0.7)])
beat("The club's president, Florentino Pérez, spoke that night.", img('press', 'push', veil=0.1),
     type='illustration', emotion='calm', intensity=0.6, pad=0.3)
beat("The best thing we can all do now is to put this nightmare behind us.",
     dict(kind='quote', text='“The best thing we can all do now is to put this nightmare behind us.”', who='FLORENTINO PÉREZ · REAL MADRID PRESIDENT'),
     type='quote', emotion='calm', intensity=0.7, pad=0.6)
beat("But one thing was still left on the pitch. A match at one, one, with three minutes to play. A match that had never ended.",
     img('spot', 'push', veil=0.1), type='turning', emotion='wonder', intensity=0.9, pad=0.8, meta=dict(turn=True, board=dict(RS, score='1–1')))

# ── CHAPTER FOUR · THE UNFINISHED MATCH ── the choice, the federation, the date
chapter('CHAPTER FOUR', 'THE UNFINISHED MATCH', 'THE SPANISH FEDERATION · 13 DECEMBER', 'boardroom')
beat("What do you do with a match that stops three minutes from time?", img('boardroom', 'push', veil=0.05),
     type='illustration', emotion='wonder', intensity=0.7, pad=0.4)
beat("One choice: let the score stand. One, one.",
     word('LET IT STAND|1–1', bg='ink', size=200, small='CHOICE ONE'), type='record', emotion='tension', intensity=0.7, pad=0.3)
beat("The other: finish it.",
     word('FINISH IT', bg='us', size=260, small='CHOICE TWO'), type='record', emotion='tension', intensity=0.8, pad=0.4)
beat("The next day, the two clubs meet at the Spanish Football Federation, and agree.", img('boardroom-b', 'push', veil=0.05),
     type='illustration', emotion='calm', intensity=0.6, pad=0.3)
beat("The last minutes will be played on Wednesday, the fifth of January.",
     img('signing', 'push', veil=0.1), flap('12 DEC', '5 JAN', at=1.4, d=3.0, small='THE LAST MINUTES'),
     type='record', emotion='tension', intensity=0.8, pad=0.3)
beat("Not a replay. The same match, picking up three minutes from the end, at one, one.", img('kickoff', 'push', veil=0.1),
     type='illustration', emotion='wonder', intensity=0.8, pad=0.3, meta=dict(board=dict(RS, score='1–1')))
beat("Twenty-four days away.", dict(kind='stat', value='24', label='DAYS BETWEEN THE TWO HALVES OF ONE ENDING', dt=0.4),
     type='stat', emotion='wonder', intensity=0.8, pad=0.4)
beat("And in those twenty-four days, almost everything around the match changes.", img('rooftops', 'pull', veil=0.2),
     type='turning', emotion='tension', intensity=0.9, pad=0.8, meta=dict(turn=True))

# ── CHAPTER FIVE · A NEW COACH ── the sacking, the debut, the team, the free gate
chapter('CHAPTER FIVE', 'A NEW COACH', 'MADRID · BETWEEN THE DATES', 'manager')
beat("Before the match is finished, Real Madrid replace their coach, Mariano García Remón.", img('press-b', 'push', veil=0.05),
     stamp('REPLACED', 'them', x=520, y=460, dt=2.4, size=160, rot=-4, plate=True),
     type='illustration', emotion='dread', intensity=0.9, pad=0.3, sound=[('stamp', 2.4, 1.0, 0.7)])
beat("On the thirtieth of December, the new coach is presented: Vanderlei Luxemburgo.", img('manager', 'pull', veil=0.1),
     word('VANDERLEI LUXEMBURGO', bg='us', size=130, small='THE NEW REAL MADRID COACH', at=1.2),
     type='illustration', emotion='wonder', intensity=0.8, pad=0.3)
beat("His first match in charge will be the last minutes of this one.", img('dugout', 'push', veil=0.05),
     type='turning', emotion='wonder', intensity=0.9, pad=0.4)
beat("He makes a change before a ball is kicked. Fernando Morientes starts up front. Michael Owen goes back to the bench.",
     img('tunnel', 'push', veil=0.05), word('MORIENTES IN|OWEN ON THE BENCH', bg='ink', size=130, small='5 JANUARY 2005 · THE MADRID XI', at=3.4),
     type='record', emotion='tension', intensity=0.8, pad=0.3)
beat("Real Sociedad change their side too.", img('dressing', 'push', veil=0.1), type='illustration', emotion='tension', intensity=0.6, pad=0.3)
beat("And the stadium? Entry is free.", img('turnstile', 'push', veil=0.05),
     stamp('FREE ENTRY', 'us', x=520, y=460, dt=1.8, size=150, rot=-3, plate=True),
     type='illustration', emotion='wonder', intensity=0.7, pad=0.3, sound=[('stamp', 1.8, 1.0, 0.6)])
beat("How many come back? Fifteen thousand, said one report. Twenty-two thousand, said another.",
     word('15,000', bg='ink', size=240, small='ONE REPORT', d=2.8), word('22,000', bg='us', size=240, small='ANOTHER', at=2.8),
     type='record', emotion='wonder', intensity=0.7, pad=0.4)
beat("Either way, a fraction of the seventy thousand who had left in December.", img('terrace-empty-b', 'pull', veil=0.1),
     type='illustration', emotion='calm', intensity=0.6, pad=0.3)
beat("Wednesday, the fifth of January, two thousand and five. The Bernabéu opens again, for a few minutes of football.",
     img('bowl', 'push', veil=0.05), flap('2004', '2005', at=2.6, d=2.8, small='5 JANUARY · THE LAST MINUTES'),
     type='turning', emotion='tension', intensity=0.9, pad=0.8, meta=dict(turn=True))

# ── CHAPTER SIX · THE LAST MINUTES ── the length nobody agrees on, the mini-drama, the result
chapter('CHAPTER SIX', 'THE LAST MINUTES', 'MADRID · 5 JANUARY 2005', 'bowl')
beat("How long is this match? Even the reports cannot agree.", img('scrap', 'push', veil=0.1),
     type='illustration', emotion='wonder', intensity=0.7, pad=0.3)
beat("Six minutes, in some. Six minutes and forty seconds, in others. Seven, in the rest.",
     word('6 MINUTES', bg='ink', size=220, small='SOME REPORTS', d=1.6), word('6 MIN 40 SEC', bg='us', size=200, small='OTHERS', at=1.6, d=2.2),
     word('7 MINUTES', bg='them', size=220, small='THE REST', at=3.8), type='record', emotion='wonder', intensity=0.8, pad=0.4)
beat("What they agree on: the minutes that were left, and four minutes of added time.", img('clock-b', 'push', veil=0.1),
     type='illustration', emotion='tension', intensity=0.7, pad=0.3)
beat("The same referee, Lizondo Cortés. The same score. One, one.", img('kickoff', 'push', veil=0.05), clock(87),
     type='matchday', emotion='tension', intensity=0.9, pad=0.3, meta=dict(board=dict(RS, score='1–1')), sound=[('whistle', 0.3, 1.2, 0.6)])
beat("Madrid attack at once.", img('volley', 'push', veil=0.05),
     type='illustration', emotion='tension', intensity=0.9, pad=0.2, meta=dict(board=dict(RS, score='1–1')))
beat("A few minutes in, Ronaldo, who scored the first goal back in December, runs into the Sociedad box.", img('volley-b', 'push', veil=0.0), clock(89),
     type='illustration', emotion='tension', intensity=1.0, pad=0.2, meta=dict(board=dict(RS, score='1–1')))
beat("Mikel Labaka brings him down.", img('despair', 'slam', veil=0.0),
     stamp('LABAKA', 'them', x=220, y=200, dt=1.0, size=120, rot=-3, plate=True),
     type='illustration', emotion='tension', intensity=1.0, pad=0.2, meta=dict(board=dict(RS, score='1–1')), sound=[('impact', 0.3, 1.4, 0.7)])
beat("Penalty.", word('PENALTY', bg='us', size=300, small='5 JANUARY 2005 · THE LAST MINUTES'),
     type='stat', emotion='tension', intensity=1.0, pad=0.3, meta=dict(board=dict(RS, score='1–1')), sound=[('whistle', 0.0, 1.2, 0.7)])
beat("Zinedine Zidane takes it.", img('spot', 'push', veil=0.0),
     type='illustration', emotion='tension', intensity=1.0, pad=1.0, meta=dict(breath=True, board=dict(RS, score='1–1')), sound=[('hush', 0.0, 2.6, 0.6)])
beat("Low, into the corner. Two, one.", img('net-b', 'slam', veil=0.0),
     type='goal', emotion='release', intensity=1.0, pad=0.4, meta=dict(board=dict(RS, score='2–1', flip_at=0.8), plain=True),
     sound=[('impact2', 0.8, 2.0, 0.9), ('goal', 1.0, 5.0, 0.6)])
beat(None, word('ZIDANE|2–1', bg='us', size=230, small='REAL MADRID · REAL SOCIEDAD · 5 JANUARY 2005'), type='goal', emotion='joy', intensity=1.0, hold=2.4,
     meta=dict(board=dict(RS, score='2–1')), sound=[('stamp', 0.2, 1.0, 0.8)])
beat("Luxemburgo brings on two substitutes, Pavón and Solari, and the clock runs down.", img('dugout', 'push', veil=0.1), clock(90),
     type='illustration', emotion='tension', intensity=0.8, pad=0.3, meta=dict(board=dict(RS, score='2–1')))
beat("The final whistle. Real Madrid two, Real Sociedad one.",
     dict(kind='score', us='REAL MADRID', them='REAL SOCIEDAD', us_goals=2, them_goals=1, cap='LA LIGA · 12 DECEMBER 2004 – 5 JANUARY 2005', bg='stadium.jpg'),
     type='score', emotion='joy', intensity=0.9, pad=0.4, meta=dict(outcome='win', plain=True, claims=['result']), sound=[('final', 0.3, 5.0, 0.5)])
beat("A match that kicked off in December, and ended in January.", img('pile', 'push', veil=0.05),
     type='turning', emotion='joy', intensity=0.9, pad=0.8, meta=dict(turn=True), sound=[('claps', 0.0, 3.0, 0.3)])

# ── PAYOFF ── the ledger, the table, the afterlives
beat("Put the whole match on one line.",
     dict(kind='explain', form='timeline', title='ONE MATCH · TWENTY-FOUR DAYS', left='12 DEC', right='5 JAN',
          marks=[dict(at=0.1, label='STOPPED · 1–1')], ticks=[dict(at=0.1, label='STOPPED AT 1–1', value=87, suffix="'"),
                                                              dict(at=0.92, label='ZIDANE · 2–1', value=24, suffix=' DAYS', hot=True)]),
     type='record', emotion='calm', intensity=0.7, pad=0.6)
beat("The win took Real Madrid up to third. Level on points with Valencia, ten behind Barcelona.",
     img('archive', 'push', veil=0.1), word('3RD|10 BEHIND BARCELONA', bg='ink', size=150, small='LA LIGA · AFTER 5 JANUARY 2005', at=2.6),
     type='record', emotion='pride', intensity=0.7, pad=0.4)
beat("It has been called the shortest match in La Liga history.", img('news-b', 'push', veil=0.1),
     word('THE SHORTEST|MATCH', bg='us', size=200, small='LA LIGA · 5 JANUARY 2005', at=2.0),
     type='record', emotion='wonder', intensity=0.8, pad=0.4)
beat("Four days later, in his first full match, Luxemburgo's Madrid won the derby at Atlético, three nil.", img('crowd', 'push', veil=0.1),
     type='illustration', emotion='pride', intensity=0.7, pad=0.3)
beat("And at the end of the season, Real Madrid finished four points behind the champions, Barcelona.", img('archive', 'pull', veil=0.2),
     type='illustration', emotion='grief', intensity=0.6, pad=0.4)
beat("Luxemburgo did not last long either. In December two thousand and five, just over eleven months after he arrived, Real Madrid let him go.",
     img('press', 'pull', veil=0.1), flap('JAN 2005', 'DEC 2005', at=3.0, d=2.8, small='LUXEMBURGO · LET GO'),
     type='illustration', emotion='grief', intensity=0.6, pad=0.4)
beat("And ETA? In twenty eleven, it announced the end of its armed activity. In twenty eighteen, it dissolved itself.",
     img('rooftops', 'pull', veil=0.1), word('2011 · ARMED ACTIVITY ENDS|2018 · DISSOLVED', bg='ink', size=110, small='ETA', at=3.4),
     type='record', emotion='calm', intensity=0.6, pad=0.6)

# ── CLOSE · the bookend answered, the hand-over ──
beat(None, word(QUESTION, bg='ink', size=140, small='THE OPENING QUESTION', d=2.6), type='trailer', hold=2.8, sound=[('impact', 0.0, 1.6, 0.6)])
beat("So who wins a match that never ended?", img('bowl', 'pull', veil=0.2), type='turning', emotion='wonder', intensity=0.9, pad=0.4)
beat("Real Madrid. Twenty-four days late, under a coach who was not there when it began, from the penalty spot.",
     img('spot-b', 'pull', veil=0.1), word('REAL MADRID|24 DAYS LATE', bg='us', size=180, small='ZIDANE · FROM THE SPOT', at=4.4),
     type='illustration', emotion='pride', intensity=0.9, pad=0.4)
beat("And the bomb that stopped it never existed.", img('terrace-empty', 'pull', veil=0.2),
     type='illustration', emotion='wonder', intensity=0.8, pad=0.8)
beat("Next on Around the Ball: an octopus, a World Cup, and a run of predictions nobody could explain. If you love the strange side of this game, subscribe, and it will find you.",
     img('flags', 'push', veil=0.4), dict(kind='follow', club='Around the Ball', press_at=8.6, dt=1.2),
     type='follow', pad=1.0, sound=[('claps', 8.6, 2.0, 0.4)])
beat(None, img('lightsoff', 'push', veil=0.55), dict(kind='end', title='The Six-Minute Match', line='NEXT · PAUL THE OCTOPUS · @FanLifeFootballStories'), type='end', hold=5.0)

# A card leaves after its reading time (docu/editor MAX_CARD, WORD_HOLD): each long card beat gets the picture that carries the rest.
UNDER = {'Look at the Madrid team': 'stadium', 'The injuries were minor': 'lamp', 'There is a bomb in the stadium': 'radio-b',
         'About seventy thousand': 'street', 'We were scared': 'streetdusk', 'The best thing we can all do': 'press',
         'One choice: let': 'boardroom', 'The other: finish': 'boardroom-b', 'Twenty-four days away': 'signing',
         'How many come back': 'turnstile', 'Six minutes, in some': 'clock', 'Penalty.': 'spot-b'}
for _b in B:
    for _k, _src in UNDER.items():
        if _b['vo'] and _b['vo'].startswith(_k):
            _b['shots'].insert(0, img(_src, 'push', veil=0.25))
assert sum(1 for _b in B for _k in UNDER if _b['vo'] and _b['vo'].startswith(_k)) == len(UNDER)

_CH = lambda big: next(i for i, b in enumerate(B) if b['shots'] and b['shots'][0].get('big') == big)
_C2, _C3, _C4, _C5, _C6 = (_CH(x) for x in ('THE CALL', 'TEN MINUTES', 'THE UNFINISHED MATCH', 'A NEW COACH', 'THE LAST MINUTES'))
M = 'dubelteam/'
SB = dict(slug='atb-six-minutes-2004', title='The Six-Minute Match', minutes=[7.5, 14], palette=dict(us=BLUE, them=RED), edit=True, mark=True,
          shape='ball',
          pronounce={'Real Sociedad': 'ɹeɪˈæl ˌsɒsiəˈdæd', "Real Sociedad's": 'ɹeɪˈæl ˌsɒsiəˈdædz', 'Sociedad': 'ˌsɒsiəˈdæd',
                     'Real Madrid': 'ɹeɪˈæl məˈdɹɪd', "Real Madrid's": 'ɹeɪˈæl məˈdɹɪdz', 'Bernabéu': 'ˌbɜːnəˈbeɪuː',
                     'ETA': 'ˈɛtə', 'Gara': 'ˈɡæɹə', 'La Liga': 'læ ˈliːɡə', 'Zidane': 'zɪˈdæn', 'Zinedine Zidane': 'ˈzɪnədiːn zɪˈdæn',
                     'Ronaldo': 'ɹəˈnældəʊ', 'Roberto Carlos': 'ɹəˈbɜːtəʊ ˈkɑːləs', 'Raúl': 'ɹɑːˈuːl', 'Figo': 'ˈfiːɡəʊ',
                     'Míchel Salgado': 'ˈmɪtʃɛl sælˈɡɑːdəʊ', 'Nihat': 'ˈniːhæt', 'Mariano García Remón': 'ˌmæɹiˈɑːnəʊ ɡɑːˈθiːə ɹɛˈmɒn',
                     'Vicente Lizondo Cortés': 'vɪˈθɛnteɪ lɪˈθɒndəʊ kɔːˈtɛs', 'Lizondo Cortés': 'lɪˈθɒndəʊ kɔːˈtɛs',
                     'Iván Helguera': 'iˈvæn ɛlˈɡɛəɹə', 'Florentino Pérez': 'ˌflɒɹənˈtiːnəʊ ˈpɛɹɛθ', 'Vanderlei Luxemburgo': 'ˈvændəleɪ ˌlʊʃɛmˈbʊəɡəʊ',
                     'Luxemburgo': 'ˌlʊʃɛmˈbʊəɡəʊ', "Luxemburgo's": 'ˌlʊʃɛmˈbʊəɡəʊz', 'Fernando Morientes': 'fəˈnændəʊ ˌmɒɹiˈɛnteɪs',
                     'Mikel Labaka': 'ˈmiːkɛl læˈbækə', 'Labaka': 'læˈbækə', 'Pavón': 'pæˈvɒn', 'Solari': 'səʊˈlɑːɹi',
                     'Atlético': 'ætˈlɛtɪkəʊ', 'Valencia': 'vəˈlɛnsiə', 'Beckham': 'ˈbɛkəm', 'Michael Owen': 'ˈmaɪkəl ˈəʊɪn'},
          us=dict(), them=dict(), agg_label='', karaoke=True, sub_limit=44, bed=0.16,
          music=[dict(file=M + 'under-the-iron-watch.mp3', from_beat=1, to_beat=_C2 - 1, vol=0.12),
                 dict(file=M + 'before-the-collapse.mp3', from_beat=_C2, to_beat=_C4 - 1, vol=0.12),
                 dict(file=M + 'the-weight-of-stillness.mp3', from_beat=_C4, to_beat=_C6 - 1, vol=0.12),
                 dict(file=M + 'the-tapans-final-surge.mp3', from_beat=_C6, vol=0.11)],
          credits=['Music: Under the Iron Watch · Before the Collapse · The Weight of Stillness · The Tapans Final Surge — DubelTeam'],
          beats=B)

# ── THE VERTICAL CUTS (studio/docu/vertical.py) ── three Shorts (≤ 30 s, an open loop, the answer only in the film)
L = {k: next(b['vo'] for b in B if b['vo'] and b['vo'].startswith(k)) for k in (
    'Madrid. Real Madrid against', 'A caller phones', 'In about ten minutes, some', 'No bomb is found. But',
    'Outside, Real Madrid', 'Zidane, Ronaldo, Beckham, in shirts', 'We were scared', 'Nine o\'clock comes',
    'Before the match is finished', 'On the thirtieth of December', 'His first match in charge')}
END = dict(big='Watch the full film', small='The Six-Minute Match · on YouTube')
VERTICAL = [
    dict(name='short-1-evacuated', kind='short', hook='A bomb warning emptied the Bernabéu at 1–1', kicker='Madrid · December 2004', music=M + 'under-the-iron-watch.mp3', end=END, scenes=[
        dict(src='bowl.jpg', focus=(0.5, 0.5), zoom=(1.1, 1.3), vo=L['Madrid. Real Madrid against']),
        dict(src='radio.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['A caller phones']),
        dict(src='street.jpg', focus=(0.5, 0.5), zoom=(1.2, 1.35), vo=L['In about ten minutes, some']),
        dict(card=dict(big='Who won the last three minutes?', small='The answer is in the film', size=120), d=2.6)]),
    dict(name='short-2-in-their-kit', kind='short', hook='Real Madrid’s stars, out on the street in their kit', kicker='The Bernabéu · 12 December 2004', music=M + 'before-the-collapse.mp3', end=END, scenes=[
        dict(src='street-b.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['Outside, Real Madrid']),
        dict(src='boots.jpg', focus=(0.5, 0.5), zoom=(1.05, 1.2), vo=L['Zidane, Ronaldo, Beckham, in shirts']),
        dict(src='streetdusk.jpg', focus=(0.5, 0.5), zoom=(1.2, 1.05), vo=L['We were scared']),
        dict(src='clock.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['Nine o\'clock comes']),
        dict(card=dict(big='And the match was still 1–1', small='How it ended is in the film', size=120), d=2.6)]),
    dict(name='short-3-new-coach', kind='short', hook='His first Real Madrid match started in the 87th minute', kicker='Madrid · January 2005', music=M + 'the-weight-of-stillness.mp3', end=END, scenes=[
        dict(src='press-b.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['Before the match is finished']),
        dict(src='manager.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['On the thirtieth of December']),
        dict(src='dugout.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.25), vo=L['His first match in charge']),
        dict(card=dict(big='What happened in those minutes?', small='The answer is in the film', size=120), d=2.6)]),
]
# The two thumbnails (studio/docu/model.thumb): the hook off the record, measured at 168×94; A and B for Test & Compare.
THUMBS = [dict(file='thumbnail-a.jpg', src='street.jpg', focus=(0.5, 0.5), zoom=1.15, side='right', lines=['BOMB', 'WARNING', 'AT 1–1'], hot=0, kicker='REAL MADRID · 2004', size=150, top=140),
          dict(file='thumbnail-b.jpg', src='bowl.jpg', focus=(0.5, 0.5), zoom=1.1, side='right', lines=['THE', '6-MINUTE', 'MATCH'], hot=1, kicker='BERNABÉU · 2005', size=150, top=150)]

if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--pack':
        made = pack(Path(sys.argv[2]))
        print(len(made), 'assets in', sys.argv[2])
    else:
        out = sys.argv[1] if len(sys.argv) > 1 else 'storyboard.json'
        open(out, 'w').write(json.dumps(SB, indent=1, ensure_ascii=False))
        Path(out).with_name('cuts.json').write_text(json.dumps(VERTICAL, indent=1, ensure_ascii=False))
        Path(out).with_name('thumbs.json').write_text(json.dumps(THUMBS, indent=1, ensure_ascii=False))
        print(out, len(B), 'beats', sum(len((b['vo'] or '').split()) for b in B), 'words')
