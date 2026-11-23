"""Storyboard: AROUND THE BALL · 29 · PANATHINAIKOS 1971 — lost 4–1 in Belgrade, won 3–0 in Athens, and became the only
Greek club ever to play in a European Cup final (Ajax 2–0 Panathinaikos, Wembley, 2 June 1971). Then, because Ajax
declined, they played Nacional of Montevideo for the world club title.

Why this story on 23.11.2026: the sprint's evening check of 22.11 (claude/youtube-sprint-plan-2026-11-10.md) found that
films about a Greek club get Browse traffic (Inter 0–1 Panathinaikos: 3.9K impressions in two days, 95% Browse) while the
English stories get Suggested next to unrelated videos; it asked for a Greek club's European night with the score and the
opponent in the title. Built on the model film (pao_aek_1994.py) and the six-minute film (atb_six_minutes_2004.py): the
partial answer (4–1, then 3–0) inside 0:15, a chapter turn about every 90 s, one question planted in the cold open
("They lost the final. So why did they play for the world title?") and paid off at the end.

Facts (two independent publishers each; the ledger with URLs is docs/fanlife/around-the-ball/atb29-panathinaikos-1971.FACTS.md).
NOT said (one publisher): every Everton anecdote (the hotel night, Catterick, Glanville), the Goodison crowd, any direct
quote from Puskás, Antoniadis or Domazos, the Athens celebrations, the bonuses' size, the crowd at the Red Star return.
Disputes said as versions or without the minute: Antoniadis at Goodison ("with less than ten minutes left"), Kamaras in
Belgrade ("early in the second half"), the Belgrade crowd ("more than ninety thousand"), Ajax's second goal ("late on,
Haan's shot, deflected off Kapsis"), Puskás's appointment ("in 1970"). The bribery claim is said as a claim, never proven.
Pictures: the common library (studio/kit/beats/common), inked to the house paper in the club's green. Faces are
invented; no generic ground is labelled as Wembley or the Marakana. Panathinaikos's crest from public/crests.

    python3 -m studio.docu.films.atb_panathinaikos_1971 storyboard.json            # the storyboard (+ cuts.json, thumbs.json)
    python3 -m studio.docu.films.atb_panathinaikos_1971 --pack ASSETS              # the asset pack
"""
import json
import shutil
import sys
from pathlib import Path

GREEN, RED, COAL, CREAM = '#0B7A3E', '#C8102E', '#15130F', '#F4ECD8'
# The common library: the name the storyboard uses → the piece in studio/kit/beats/common.
LIB = {'bowl': 'stadium-night-bowl-n', 'stadium': 'europe-stadium-night-n', 'foreign': 'foreign-stadium-stands-n',
       'old-ground': 'old-ground-wide-kr', 'old-ground-b': 'old-ground-wide-b-kr', 'wooden': 'old-ground-wooden-n',
       'chimneys': 'old-ground-chimneys-n', 'manager': 'manager-blank-board-stadium', 'training': 'training-rain-kr',
       'dressing': 'dressing-room-silence-kr', 'dressing-b': 'dressing-room-silence-b-kr', 'tunnel': 'tunnel-walk-out',
       'tunnel-b': 'tunnel-bright-pitch-n', 'boots': 'close-boots-tunnel-n', 'header': 'header-goalmouth-kr',
       'header-b': 'header-goalmouth-b-kr', 'volley': 'volley-edge-box-kr', 'volley-b': 'volley-edge-box-b-kr',
       'net': 'ball-in-net-kr', 'net-b': 'ball-in-net-b-kr', 'clock': 'last-minute-clock-n', 'clock-b': 'last-minute-clock-b-n',
       'despair': 'despair-kneeling-kr', 'despair-b': 'despair-kneeling-b-kr', 'pile': 'celebration-pile-kr',
       'pile-b': 'celebration-pile-b-kr', 'home-end': 'home-end-night-kr', 'home-end-b': 'home-end-night-b-kr',
       'terrace': 'terrace-full-kr', 'terrace-b': 'terrace-full-b-kr', 'crowd': 'crowd-scarves-night-kr',
       'away-end': 'away-end-arrival-kr', 'airport': 'airport-gate-kr', 'airport-b': 'airport-gate-b-kr',
       'news': 'newspaper-stand-n', 'news-b': 'newspaper-stand-b-n', 'radio': 'radio-scarf-ticket-table',
       'boardroom': 'boardroom-table-n', 'archive': 'archive-trophy-spotlight', 'trophy': 'trophy-lift-crowd-kr',
       'whistle': 'final-whistle-arms-kr', 'whistle-b': 'final-whistle-arms-b-kr', 'lightsoff': 'stadium-lights-off-n',
       'photos': 'old-photo-wall-kr', 'scrap': 'scrapbook-desk-kr', 'grandfather': 'grandfather-bench-kr',
       'father-son': 'father-son-walk-kr', 'armband': 'close-armband-kr', 'rooftops': 'city-rooftops-dawn-n',
       'hands': 'close-hands-clasp-prayer-kr', 'fingers': 'close-fingers-crossed-kr', 'kickoff': 'kick-off-centre-kr',
       'flags': 'flags-pole-kr', 'office': 'signing-desk-kr', 'ferry': 'ferry-deck-kr', 'rain': 'rain-stadium-n',
       'terrace-empty': 'terrace-empty-old-n'}


def pack(out: Path) -> dict:
    """The film's asset folder from the common library, inked in the club's green. → {name: where it came from}."""
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
            im = paper.recolor(im, GREEN)
        inked(im).save(out / f'{name}.jpg', quality=93)
        made[f'{name}.jpg'] = f'beat:common/{piece}'
    # the one crest library (ecosystem/crests → public/crests), never an initials roundel
    shutil.copy(here.parents[5] / 'public' / 'crests' / 'panathinaikos.png', out / 'crest-pao.png')
    made['crest-pao.png'] = 'public/crests/panathinaikos.png'
    logo = here.parents[5] / 'public' / 'brand' / 'fanlife' / 'logo-512.png'
    (out / 'fanlife.png').write_bytes(logo.read_bytes())
    (out / 'PACK.json').write_text(json.dumps(made, indent=1, ensure_ascii=False))
    return made


def inked(im):
    """One world, few inks (editing rule 1): ink to cream by lightness with a halftone grain; only the club's green survives."""
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
    green = (deg > 95) & (deg < 175) & (hsv[..., 1] > 0.3 * 255)
    g = np.array([0x0B, 0x7A, 0x3E], 'float32')
    tone = np.clip(0.55 + lum * 0.9, 0, 1.45)[..., None]
    out = np.where(green[..., None], np.clip(g * tone, 0, 255), out)
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


RS = dict(id='rs', small='RED STAR · PANATHINAIKOS')   # the held corner boards
EV = dict(id='ev', small='EVERTON · PANATHINAIKOS')
AJ = dict(id='aj', small='AJAX · PANATHINAIKOS')
QUESTION = 'THEY LOST THE FINAL.|WHY DID THEY PLAY FOR THE WORLD?'

beat(None, dict(kind='ident', line='A FAN LIFE FILM'), type='open', hold=1.8, sound=[('sting', 0.1, 1.7, 0.5)])

# ── COLD OPEN ── the 4–1 and the 3–0 (the partial answer) before 0:15, then the question; no Wembley result
beat("Belgrade, April nineteen seventy-one. A European Cup semi-final. Red Star four, Panathinaikos one.",
     img('bowl', 'push', veil=0.05), stamp('4–1', 'them', x=520, y=460, dt=4.4, size=220, rot=-4, plate=True),
     type='open', emotion='dread', intensity=0.8, pre=0.2, pad=0.1, meta=dict(plain=True, board=dict(RS, score='4–1')),
     sound=[('impact', 4.4, 1.4, 0.7)])
beat("Two weeks later, in Athens, Panathinaikos win three nil.",
     img('home-end', 'slam', veil=0.0), stamp('3–0', 'us', x=300, y=460, dt=2.4, size=220, rot=-3, plate=True),
     type='open', emotion='release', intensity=1.0, pad=0.1, meta=dict(plain=True), sound=[('stamp', 2.4, 1.0, 0.8)])
beat("And a Greek club is going to Wembley, to a European Cup final. No Greek club had done it before. None has done it since.",
     img('tunnel-b', 'push', veil=0.05), word('THE ONLY|GREEK FINAL', bg='us', size=200, small='EUROPEAN CUP · 1971', at=4.6),
     type='open', emotion='pride', intensity=1.0, pad=0.2, meta=dict(plain=True), sound=[('riser', 0.2, 1.4, 0.5), ('impact', 4.6, 1.6, 0.7)])
beat("They lost that final. And six months later, they were playing for the title of best club in the world.",
     img('trophy', 'push', veil=0.3), word(QUESTION, bg='ink', size=120, small='WEMBLEY · JUNE 1971 · MONTEVIDEO · DECEMBER 1971', at=3.4),
     type='turning', emotion='tension', intensity=0.9, pad=0.6, meta=dict(plain=True), sound=[('impact', 3.4, 1.6, 0.7)])
beat(None, word('LOST 4–1.', bg='ink', size=230, d=1.2), word('THEN|WEMBLEY', bg='us', size=230, small='PANATHINAIKOS · 1971', at=1.2),
     type='trailer', hold=3.2, sound=[('impact', 0.0, 1.4, 0.7), ('impact2', 1.2, 2.2, 0.9)])

# ── CHAPTER ONE · THE COACH ── champions of Greece, Puskás, part-timers
chapter('CHAPTER ONE', 'THE COACH', 'ATHENS · 1970', 'old-ground')
beat("In nineteen seventy, Panathinaikos are the champions of Greece. That title puts them in the European Cup.",
     img('old-ground', 'push', veil=0.1), flap('2026', '1970', at=2.2, d=2.8, small='GREEK CHAMPIONS · 1969–70'),
     type='matchday', emotion='calm', intensity=0.5, pad=0.3, sound=[('page', 0.0, 1.0, 0.4)])
beat("Greek clubs have very little history in that competition.",
     img('terrace-empty', 'push', veil=0.1), type='illustration', emotion='calm', intensity=0.4, pad=0.3)
beat("That year the club changes coach. Lakis Petropoulos leaves the bench. And the man who takes it is Ferenc Puskás.",
     img('manager', 'push', veil=0.05), word('FERENC PUSKÁS', bg='us', size=190, small='PANATHINAIKOS COACH · 1970', at=5.2),
     type='turning', emotion='wonder', intensity=0.9, pad=0.4, sound=[('impact', 5.2, 1.4, 0.6)])
beat("The star of Hungary's great team of the nineteen fifties. Then a forward at Real Madrid, with three European Cups.",
     img('archive', 'push', veil=0.1), word('3 EUROPEAN CUPS', bg='ink', size=170, small='PUSKÁS · AS A REAL MADRID PLAYER', at=3.8),
     type='record', emotion='wonder', intensity=0.8, pad=0.3)
beat("As a coach, though, he has done little. Short spells in Spain and in North America.",
     img('office', 'push', veil=0.1), type='illustration', emotion='calm', intensity=0.5, pad=0.3)
beat("And his players are not full professionals. Even Antonis Antoniadis, who will score most of their goals, works in insurance.",
     img('training', 'push', veil=0.05), stamp('ANTONIADIS', 'us', x=240, y=200, dt=4.2, size=110, rot=-3, plate=True),
     type='illustration', emotion='wonder', intensity=0.7, pad=0.3, sound=[('stamp', 3.6, 1.0, 0.5)])
beat("The captain is Mimis Domazos. They call him The General.",
     img('armband', 'push', veil=0.05), word('THE GENERAL', bg='ink', size=210, small='MIMIS DOMAZOS · CAPTAIN', at=2.2),
     type='illustration', emotion='pride', intensity=0.7, pad=0.3)
beat("Domazos joined the club as a teenager, in nineteen fifty-nine. Twelve years later, this is his team.",
     img('photos', 'push', veil=0.1), flap('1970', '1959', at=2.4, d=2.8, small='DOMAZOS · JOINS PANATHINAIKOS'),
     type='illustration', emotion='pride', intensity=0.6, pad=0.3)
beat("Puskás gives them one idea above all. They have nothing to fear from anyone.",
     img('dressing', 'push', veil=0.1), type='turning', emotion='pride', intensity=0.8, pad=0.6, meta=dict(turn=True))

# ── CHAPTER TWO · THE FIRST STEPS ── Luxembourg, Bratislava, Antoniadis's goals
chapter('CHAPTER TWO', 'THE FIRST STEPS', 'LUXEMBOURG · BRATISLAVA · AUTUMN 1970', 'foreign')
beat("September nineteen seventy. The first round, away to Jeunesse Esch, of Luxembourg.",
     img('foreign', 'push', veil=0.1), type='matchday', emotion='calm', intensity=0.5, pad=0.3)
beat("Inside the first six minutes, Antoniadis scores. Panathinaikos win two, one.",
     img('volley', 'push', veil=0.0), type='goal', emotion='joy', intensity=0.8, pad=0.3, sound=[('goal', 1.6, 3.0, 0.4)])
beat("In Athens, five nil. Antoniadis scores four of them. Seven, one, on aggregate.",
     img('net', 'slam', veil=0.05), word('7–1', bg='us', size=280, small='JEUNESSE ESCH · AGGREGATE', at=3.2),
     type='record', emotion='joy', intensity=0.9, pad=0.4, sound=[('impact', 3.2, 1.4, 0.6)])
beat("The second round: Slovan Bratislava, of Czechoslovakia. In Athens, three nil. Domazos, Antoniadis and Deliyannis score.",
     img('home-end-b', 'push', veil=0.05), type='goal', emotion='joy', intensity=0.8, pad=0.3)
beat("In Bratislava, Slovan win two, one. Antoniadis scores again. Panathinaikos go through, four, two.",
     img('rain', 'push', veil=0.1), word('4–2', bg='us', size=280, small='SLOVAN BRATISLAVA · AGGREGATE', at=3.8),
     type='record', emotion='pride', intensity=0.8, pad=0.4)
beat("Four matches. Antoniadis has scored in every one. And now, the quarter-final draw.",
     img('news', 'push', veil=0.05), type='turning', emotion='tension', intensity=0.8, pad=0.4)
beat("Everton. The champions of England.",
     word('EVERTON', bg='them', size=260, small='ENGLISH CHAMPIONS · 1969–70'),
     type='turning', emotion='dread', intensity=1.0, pad=0.8, meta=dict(turn=True), sound=[('impact', 0.0, 1.4, 0.7)])

# ── CHAPTER THREE · GOODISON ── 1–1, the last minute, 0–0, the away goal
chapter('CHAPTER THREE', 'GOODISON', 'LIVERPOOL · 9 MARCH 1971', 'chimneys')
beat("Tuesday, the ninth of March, nineteen seventy-one. Goodison Park, Liverpool.",
     img('chimneys', 'push', veil=0.1), flap('1970', '1971', at=1.2, d=2.8, small='9 MARCH · QUARTER-FINAL'),
     type='matchday', emotion='tension', intensity=0.6, pad=0.3, meta=dict(board=dict(EV, score='0–0')))
beat("With less than ten minutes left, Antoniadis scores. Nil, one.",
     img('volley-b', 'slam', veil=0.0),
     type='goal', emotion='release', intensity=1.0, pad=0.4, meta=dict(board=dict(EV, score='0–1', flip_at=2.8), plain=True), sound=[('goal', 2.8, 4.0, 0.5)])
beat("They are holding on to win at the home of the English champions. Into the last minute.",
     img('clock', 'push', veil=0.05), clock(90), type='illustration', emotion='tension', intensity=0.9, pad=0.3,
     meta=dict(board=dict(EV, score='0–1')), sound=[('tick', 0.0, 3.0, 0.5)])
beat("And then David Johnson equalises for Everton. One, one.",
     img('net-b', 'slam', veil=0.05), type='goal', emotion='grief', intensity=0.9, pad=0.4,
     meta=dict(board=dict(EV, score='1–1', flip_at=2.0), plain=True), sound=[('groan', 2.0, 2.0, 0.4)])
beat("But Panathinaikos take home something worth more than it looks. A goal scored away.",
     img('airport', 'push', veil=0.1), word('AN AWAY GOAL', bg='us', size=200, small='EVERTON 1–1 PANATHINAIKOS', at=3.0),
     type='record', emotion='pride', intensity=0.8, pad=0.4, meta=dict(board=dict(EV, score='1–1')))
beat("Two weeks later, the return, at the Leoforos in Athens. A ground that held about twenty-five thousand.",
     img('old-ground-b', 'push', veil=0.05), type='matchday', emotion='tension', intensity=0.8, pad=0.3, meta=dict(board=dict(EV, score='1–1')))
beat("Ninety minutes. No goals. Nil, nil.",
     img('whistle', 'push', veil=0.05), clock(90), type='record', emotion='tension', intensity=0.9, pad=0.3,
     meta=dict(board=dict(EV, score='1–1')), sound=[('whistle', 2.4, 1.2, 0.6)])
beat("One, one on aggregate. And Panathinaikos are through, on the goal they scored at Goodison. The champions of England are out.",
     img('pile', 'push', veil=0.05), stamp('THROUGH', 'us', x=520, y=460, dt=3.6, size=170, rot=-4, plate=True),
     type='turning', emotion='joy', intensity=1.0, pad=0.8, meta=dict(turn=True), sound=[('stamp', 3.6, 1.0, 0.8), ('claps', 4.0, 3.0, 0.3)])

# ── CHAPTER FOUR · BELGRADE ── Red Star 4–1
chapter('CHAPTER FOUR', 'BELGRADE', 'THE MARAKANA · 14 APRIL 1971', 'bowl')
beat("The semi-final. Red Star Belgrade, the champions of Yugoslavia, coached by Miljan Miljanić.",
     img('bowl', 'pull', veil=0.05), word('RED STAR', bg='them', size=250, small='YUGOSLAV CHAMPIONS · 1969–70', at=2.6),
     type='matchday', emotion='dread', intensity=0.8, pad=0.3, meta=dict(board=dict(RS, score='0–0')))
beat("The fourteenth of April, at the Marakana. About ninety thousand people.",
     img('crowd', 'push', veil=0.05), dict(kind='stat', value='90,000', label='ABOUT · THE MARAKANA · 14 APRIL 1971', dt=1.6),
     type='stat', emotion='dread', intensity=0.9, pad=0.4, meta=dict(board=dict(RS, score='0–0')))
beat("Red Star's Stevan Ostojić scores a hat-trick that night.",
     img('header', 'slam', veil=0.05), word('HAT-TRICK', bg='them', size=230, small='STEVAN OSTOJIĆ · RED STAR', at=2.0),
     type='goal', emotion='dread', intensity=1.0, pad=0.3, meta=dict(board=dict(RS, score='0–0')), sound=[('impact', 2.0, 1.4, 0.6)])
beat("Slobodan Janković adds one, just before half-time.",
     img('net', 'slam', veil=0.05), stamp('JANKOVIĆ', 'them', x=240, y=200, dt=1.4, size=110, rot=-3, plate=True),
     type='goal', emotion='dread', intensity=0.9, pad=0.3, sound=[('groan', 1.4, 2.0, 0.4)])
beat("And early in the second half, Aristidis Kamaras scores for Panathinaikos. One goal, away from home. Remember it.",
     img('volley', 'push', veil=0.0), stamp('KAMARAS', 'us', x=520, y=200, dt=2.8, size=110, rot=-3, plate=True),
     type='goal', emotion='release', intensity=0.8, pad=0.3, meta=dict(plain=True), sound=[('goal', 2.8, 3.0, 0.4)])
beat("Red Star four, Panathinaikos one.",
     dict(kind='score', us='PANATHINAIKOS', them='RED STAR', us_goals=1, them_goals=4, cap='EUROPEAN CUP SEMI-FINAL · FIRST LEG · BELGRADE', bg='bowl.jpg'),
     type='score', emotion='grief', intensity=0.9, pad=0.4, meta=dict(outcome='loss', plain=True, claims=['result']), sound=[('final', 0.3, 4.0, 0.4)])
beat("To reach the final, three nil in Athens would do it, on that away goal. Against the champions of Yugoslavia.",
     img('despair', 'push', veil=0.1), word('3–0 WOULD DO', bg='ink', size=200, small='THE RETURN · ATHENS · TWO WEEKS', at=2.6),
     type='turning', emotion='dread', intensity=1.0, pad=0.8, meta=dict(turn=True, breath=True))

# ── CHAPTER FIVE · THE RETURN ── 3–0 in Athens, 4–4, away goals; the colonels and the doubts
chapter('CHAPTER FIVE', 'THE RETURN', 'ATHENS · 28 APRIL 1971', 'home-end')
beat("The twenty-eighth of April, the Leoforos. Red Star come without Dragan Džajić. He is suspended.",
     img('tunnel', 'push', veil=0.05), stamp('NO DŽAJIĆ', 'them', x=520, y=460, dt=4.0, size=130, rot=-3, plate=True),
     type='matchday', emotion='tension', intensity=0.8, pad=0.3, meta=dict(board=dict(RS, score='4–1')), sound=[('stamp', 4.0, 1.0, 0.5)])
beat("Inside two minutes, Antoniadis scores. One nil. Four, two on aggregate.",
     img('header-b', 'slam', veil=0.0), type='goal', emotion='release', intensity=1.0, pad=0.4,
     meta=dict(board=dict(RS, score='4–2', flip_at=2.2), plain=True), sound=[('goal', 2.2, 4.0, 0.5)])
beat("Early in the second half, Antoniadis again. Two nil. Four, three.",
     img('volley-b', 'slam', veil=0.0), type='goal', emotion='release', intensity=1.0, pad=0.4,
     meta=dict(board=dict(RS, score='4–3', flip_at=2.4), plain=True), sound=[('goal', 2.4, 4.0, 0.5)])
beat("And then Kamaras. Three nil.",
     img('net-b', 'slam', veil=0.0), type='goal', emotion='release', intensity=1.0, pad=0.4,
     meta=dict(board=dict(RS, score='4–4', flip_at=1.4), plain=True), sound=[('impact2', 1.4, 2.0, 0.9), ('goal', 1.6, 5.0, 0.6)])
beat("Four, four on aggregate. And the away goal from Belgrade, Kamaras's goal, sends Panathinaikos through.",
     dict(kind='explain', form='timeline', title='RED STAR v PANATHINAIKOS · 4–4', left='BELGRADE', right='ATHENS',
          marks=[dict(at=0.15, label='4–1')], ticks=[dict(at=0.15, label='KAMARAS · THE AWAY GOAL', value=1, suffix=' GOAL'),
                                                    dict(at=0.9, label='ATHENS · 3–0', value=3, suffix=' GOALS', hot=True)]),
     type='record', emotion='pride', intensity=0.9, pad=0.6, meta=dict(board=dict(RS, score='4–4')))
beat("Panathinaikos three, Red Star nil.",
     dict(kind='score', us='PANATHINAIKOS', them='RED STAR', us_goals=3, them_goals=0, cap='EUROPEAN CUP SEMI-FINAL · SECOND LEG · ATHENS', bg='home-end.jpg'),
     type='score', emotion='joy', intensity=1.0, pad=0.4, meta=dict(outcome='win', plain=True, claims=['result']), sound=[('final', 0.3, 5.0, 0.5)])
beat("There is one more thing to say about that night. Greece in nineteen seventy-one was ruled by a military dictatorship.",
     img('rooftops', 'push', veil=0.15), type='illustration', emotion='tension', intensity=0.6, pad=0.3)
beat("The regime used the club's success, and backed it with money and bonuses.",
     img('boardroom', 'push', veil=0.1), type='illustration', emotion='tension', intensity=0.6, pad=0.3)
beat("Years later, a claim went round that Red Star had been bribed before Athens. It was never proven. Some Red Star players still have their doubts.",
     img('news-b', 'push', veil=0.1), word('NEVER|PROVEN', bg='ink', size=230, small='THE BRIBERY CLAIM', at=4.8),
     type='record', emotion='tension', intensity=0.7, pad=0.4)
beat("What is on the record is the score. And a Greek club in the European Cup final.",
     img('pile-b', 'push', veil=0.05), type='turning', emotion='pride', intensity=1.0, pad=0.8, meta=dict(turn=True))

# ── CHAPTER SIX · WEMBLEY ── Ajax 2–0
chapter('CHAPTER SIX', 'WEMBLEY', 'LONDON · 2 JUNE 1971', 'home-end-b')
beat("Wednesday, the second of June, nineteen seventy-one. Wembley.",
     img('home-end-b', 'push', veil=0.05), flap('APRIL', 'JUNE', at=1.0, d=2.8, small='THE EUROPEAN CUP FINAL'),
     type='matchday', emotion='wonder', intensity=0.8, pad=0.3, meta=dict(board=dict(AJ, score='0–0')))
beat("Thousands of Greek supporters have travelled to London.",
     img('away-end', 'push', veil=0.05), type='illustration', emotion='pride', intensity=0.8, pad=0.3, meta=dict(board=dict(AJ, score='0–0')))
beat("In the other dressing room: Ajax of Amsterdam. Coached by Rinus Michels, with Johan Cruyff. They lost the final two years before. They are not here to lose another.",
     img('dressing-b', 'push', veil=0.1), word('AJAX', bg='them', size=280, small='MICHELS · CRUYFF', at=2.0),
     type='illustration', emotion='dread', intensity=0.8, pad=0.3, meta=dict(board=dict(AJ, score='0–0')))
beat("Eighty-three thousand people. The referee is Jack Taylor, of England.",
     img('bowl', 'push', veil=0.05), dict(kind='stat', value='83,000', label='WEMBLEY · 2 JUNE 1971', dt=0.6),
     type='stat', emotion='wonder', intensity=0.8, pad=0.4, meta=dict(board=dict(AJ, score='0–0')))
beat("Panathinaikos line up. Ikonomopoulos in goal. Tomaras, Sourpis, Kamaras, Vlachos. Eleftherakis, Domazos, Kapsis. Grammos, Antoniadis, Filakouris.",
     word('IKONOMOPOULOS|TOMARAS · SOURPIS · KAMARAS · VLACHOS|ELEFTHERAKIS · DOMAZOS · KAPSIS|GRAMMOS · ANTONIADIS · FILAKOURIS', bg='ink', size=78, small='PANATHINAIKOS · WEMBLEY · 2 JUNE 1971'),
     type='record', emotion='pride', intensity=0.8, pad=0.4, meta=dict(board=dict(AJ, score='0–0')))
beat("Five minutes in, Piet Keizer crosses, and Dick van Dijk heads Ajax in front.",
     img('header', 'slam', veil=0.0), clock(5), type='goal', emotion='grief', intensity=0.9, pad=0.4,
     meta=dict(board=dict(AJ, score='1–0', flip_at=3.4), plain=True), sound=[('groan', 3.4, 2.0, 0.4)])
beat("For more than an hour, it stays one, nil.",
     img('kickoff', 'push', veil=0.05), type='illustration', emotion='tension', intensity=0.8, pad=0.3, meta=dict(board=dict(AJ, score='1–0')))
beat("Late on, the substitute Arie Haan shoots. It hits Kapsis, and goes in. Two nil.",
     img('net', 'slam', veil=0.05), type='goal', emotion='grief', intensity=0.9, pad=0.4,
     meta=dict(board=dict(AJ, score='2–0', flip_at=3.6), plain=True), sound=[('groan', 3.6, 2.0, 0.4)])
beat("Ajax two, Panathinaikos nil.",
     dict(kind='score', us='PANATHINAIKOS', them='AJAX', us_goals=0, them_goals=2, cap='EUROPEAN CUP FINAL · WEMBLEY · 2 JUNE 1971', bg='home-end-b.jpg'),
     type='score', emotion='grief', intensity=0.9, pad=0.4, meta=dict(outcome='loss', plain=True, claims=['result']), sound=[('final', 0.3, 4.0, 0.4)])
beat("It is the first European Cup of Ajax.",
     img('trophy', 'pull', veil=0.2), type='illustration', emotion='grief', intensity=0.6, pad=0.3)
beat("And Antoniadis finishes the competition as its top scorer. Ten goals. Panathinaikos scored sixteen on the way to the final. Ten were his.",
     img('photos', 'push', veil=0.1), dict(kind='stat', value='10', label='ANTONIADIS · TOP SCORER · EUROPEAN CUP 1970–71', dt=2.6),
     type='stat', emotion='pride', intensity=0.9, pad=0.6, meta=dict(turn=True))

# ── CHAPTER SEVEN · THE WORLD ── the payoff: Nacional
chapter('CHAPTER SEVEN', 'THE WORLD', 'PIRAEUS · MONTEVIDEO · DECEMBER 1971', 'flags')
beat("The European champions were supposed to play the champions of South America for the Intercontinental Cup. Ajax declined.",
     img('office', 'push', veil=0.1), word('AJAX|DECLINED', bg='them', size=220, small='THE INTERCONTINENTAL CUP · 1971', at=5.4),
     type='turning', emotion='wonder', intensity=0.9, pad=0.4, sound=[('impact', 5.4, 1.4, 0.6)])
beat("So Europe sent the runners-up. Panathinaikos, against Nacional of Montevideo.",
     img('airport-b', 'push', veil=0.05), word('PANATHINAIKOS|v NACIONAL', bg='us', size=180, small='FOR THE WORLD CLUB TITLE', at=2.0),
     type='record', emotion='pride', intensity=0.9, pad=0.4)
beat("The fifteenth of December, at the Karaiskakis stadium in Piraeus. Just after half-time, Filakouris scores. About two minutes later, Luis Artime equalises. One, one.",
     img('home-end-b', 'push', veil=0.05), flap('JUNE', 'DECEMBER', at=1.0, d=2.8, small='FIRST LEG · PIRAEUS'),
     type='goal', emotion='tension', intensity=0.8, pad=0.4)
beat("The twenty-eighth of December, the Centenario, in Montevideo. Artime scores twice. Filakouris gets one back at the very end. Two, one to Nacional.",
     img('foreign', 'push', veil=0.05), type='goal', emotion='grief', intensity=0.8, pad=0.4)
beat("Nacional are the world club champions, three, two on aggregate.",
     word('NACIONAL 3–2', bg='them', size=230, small='INTERCONTINENTAL CUP · AGGREGATE · 1971'),
     type='record', emotion='grief', intensity=0.8, pad=0.6, meta=dict(turn=True))

# ── CLOSE · still the only one, the bookend answered, the hand-over ──
beat("Since then, Panathinaikos have come close once more. In nineteen eighty-five they reached the semi-final, and lost to Liverpool.",
     img('rain', 'pull', veil=0.15), flap('1971', '1985', at=4.0, d=2.8, small='SEMI-FINAL · LIVERPOOL'),
     type='illustration', emotion='grief', intensity=0.6, pad=0.3)
beat("Antoniadis kept scoring. The next season, thirty-nine league goals. One fewer than Gerd Müller, in all of Europe.",
     img('scrap', 'push', veil=0.1), word('39', bg='us', size=300, small='ANTONIADIS · LEAGUE GOALS · 1971–72', at=3.0),
     type='record', emotion='pride', intensity=0.8, pad=0.4)
beat("Puskás died in two thousand and six. In twenty fourteen, Athens honoured his team with an exhibition and a plaque.",
     img('grandfather', 'pull', veil=0.15), type='illustration', emotion='grief', intensity=0.6, pad=0.4)
beat("And no other Greek club has ever played in a European Cup final.",
     img('father-son', 'push', veil=0.1), word('STILL|THE ONLY ONE', bg='us', size=210, small='PANATHINAIKOS · WEMBLEY 1971', at=2.4),
     type='record', emotion='pride', intensity=0.9, pad=0.4)
beat(None, word(QUESTION, bg='ink', size=120, small='THE OPENING QUESTION', d=2.6), type='trailer', hold=2.8, sound=[('impact', 0.0, 1.6, 0.6)])
beat("So why did a team that lost the final play for the world title?",
     img('bowl', 'pull', veil=0.2), type='turning', emotion='wonder', intensity=0.9, pad=0.4)
beat("Because the champions said no. And the team that came back from four, one in Belgrade was next in line.",
     img('home-end', 'pull', veil=0.1), word('NEXT|IN LINE', bg='us', size=230, small='FROM 4–1 DOWN TO THE WORLD STAGE', at=4.6),
     type='illustration', emotion='pride', intensity=0.9, pad=0.8)
beat("More nights like this one on Around the Ball. If you love the stories behind this game, subscribe, and the next one will find you.",
     img('flags', 'push', veil=0.4), dict(kind='follow', club='Around the Ball', press_at=6.4, dt=1.2),
     type='follow', pad=1.0, sound=[('claps', 6.4, 2.0, 0.4)])
beat(None, img('lightsoff', 'push', veil=0.55), dict(kind='end', title='Lost 4–1. Then Wembley.', line='PANATHINAIKOS · 1971 · @FanLifeFootballStories'), type='end', hold=5.0)

# A card leaves after its reading time (docu/editor MAX_CARD, WORD_HOLD): each long card beat gets the picture that carries the rest.
UNDER = {'Everton. The champions': 'chimneys', 'Panathinaikos line up.': 'tunnel-b', 'Red Star four, Panathinaikos one.': 'despair-b', 'Panathinaikos three, Red Star': 'pile',
         'Ajax two, Panathinaikos': 'despair', 'Nacional are the world': 'foreign', 'Four, four on aggregate': 'crowd'}
for _b in B:
    for _k, _src in UNDER.items():
        if _b['vo'] and _b['vo'].startswith(_k):
            _b['shots'].insert(0, img(_src, 'push', veil=0.25))
assert sum(1 for _b in B for _k in UNDER if _b['vo'] and _b['vo'].startswith(_k)) == len(UNDER)

_CH = lambda big: next(i for i, b in enumerate(B) if b['shots'] and b['shots'][0].get('big') == big)
_C3, _C5, _C6, _C7 = (_CH(x) for x in ('GOODISON', 'THE RETURN', 'WEMBLEY', 'THE WORLD'))
M = 'dubelteam/'
SB = dict(slug='atb-panathinaikos-1971', title='Lost 4–1. Then Wembley.', minutes=[7.5, 14], palette=dict(us=GREEN, them=RED), edit=True, mark=True,
          shape='ball',
          pronounce={'Puskás': 'ˈpʊʃkɑːʃ', 'Ferenc Puskás': 'ˈfɛɹɛnts ˈpʊʃkɑːʃ', 'Ferenc': 'ˈfɛɹɛnts',
                     'Lakis Petropoulos': 'ˈlɑːkis ˌpɛtɹəˈpuːləs', 'Deliyannis': 'ˌdɛliˈjɑːnis', 'Grammos': 'ˈɡɹæməs',
                     'Slovan Bratislava': 'ˈslɒvæn ˌbɹætɪˈslɑːvə', 'Goodison Park': 'ˈɡʊdɪsən ˈpɑːk', 'Goodison': 'ˈɡʊdɪsən',
                     'David Johnson': 'ˈdeɪvɪd ˈdʒɒnsən', 'Miljan Miljanić': 'ˈmiːljæn ˈmiːljænɪtʃ', 'Marakana': 'ˌmæɹəˈkɑːnə',
                     'Stevan Ostojić': 'ˈstɛvæn ˈɒstəjɪtʃ', 'Ostojić': 'ˈɒstəjɪtʃ', 'Slobodan Janković': 'ˈslɒbədæn ˈjæŋkəvɪtʃ',
                     'Dragan Džajić': 'ˈdɹæɡæn ˈdʒaɪɪtʃ', 'Kamaras': 'kəˈmɑːɹəs', "Kamaras's": 'kəˈmɑːɹəsɪz',
                     'Rinus Michels': 'ˈɹiːnəs ˈmɪxəls', 'Johan Cruyff': 'ˈjoʊhæn ˈkɹaɪf', 'Piet Keizer': 'ˈpiːt ˈkaɪzə',
                     'Dick van Dijk': 'ˈdɪk væn ˈdaɪk', 'Arie Haan': 'ˈɑːɹi ˈhɑːn', 'Kapsis': 'ˈkæpsis', 'Filakouris': 'ˌfiləˈkʊəɹis',
                     'Luis Artime': 'ˈluːɪs ɑːˈtiːmeɪ', 'Artime': 'ɑːˈtiːmeɪ', 'Centenario': 'ˌsɛntəˈnɑːɹiəʊ', 'Montevideo': 'ˌmɒntɪvɪˈdeɪəʊ',
                     'Gerd Müller': 'ˈɡɛət ˈmʊlə', 'Jack Taylor': 'ˈdʒæk ˈteɪlə', 'Wembley': 'ˈwɛmbli', 'Ikonomopoulos': 'ˌɪkənɒməˈpuːləs', 'Tomaras': 'təˈmɑːɹəs', 'Sourpis': 'ˈsʊəpis', 'Vlachos': 'ˈvlɑːxɒs',
                     'Eleftherakis': 'ˌɛlɛfθəˈɹɑːkis', 'Mimis Domazos': 'ˈmiːmis dəˈmɑːzɒs', 'Domazos': 'dəˈmɑːzɒs',
                     'Antonis Antoniadis': 'ænˈtəʊnis ˌæntəniˈɑːdis', 'Antoniadis': 'ˌæntəniˈɑːdis', 'Aristidis Kamaras': 'ˌæɹɪsˈtiːdis kəˈmɑːɹəs',
                     'Jeunesse Esch': 'ʒəˈnɛs ˈɛʃ', 'Leoforos': 'ˌlɛəˈfɒɹɒs', 'Karaiskakis': 'ˌkæɹaɪsˈkɑːkis'},
          us=dict(), them=dict(), agg_label='', karaoke=True, sub_limit=44, bed=0.16,
          music=[dict(file=M + 'under-the-iron-watch.mp3', from_beat=1, to_beat=_C3 - 1, vol=0.12),
                 dict(file=M + 'before-the-collapse.mp3', from_beat=_C3, to_beat=_C5 - 1, vol=0.12),
                 dict(file=M + 'the-tapans-final-surge.mp3', from_beat=_C5, to_beat=_C6 - 1, vol=0.11),
                 dict(file=M + 'the-weight-of-stillness.mp3', from_beat=_C6, to_beat=_C7 - 1, vol=0.12),
                 dict(file=M + 'after-the-final-whistle.mp3', from_beat=_C7, vol=0.12)],
          credits=['Music: Under the Iron Watch · Before the Collapse · The Tapans Final Surge · The Weight of Stillness · After the Final Whistle — DubelTeam'],
          beats=B)

# ── THE VERTICAL CUTS (studio/docu/vertical.py) ── three Shorts (≤ 30 s, an open loop, the answer only in the film)
L = {k: next(b['vo'] for b in B if b['vo'] and b['vo'].startswith(k)) for k in (
    'Belgrade, April nineteen', 'Two weeks later, in Athens', 'To reach the final', 'Inside two minutes', 'And then Kamaras',
    'The European champions were', 'So Europe sent', 'And his players are not', 'And Antoniadis finishes')}
END = dict(big='Watch the full film', small='Lost 4–1. Then Wembley. · on YouTube')
VERTICAL = [
    dict(name='short-1-lost-4-1', kind='short', hook='Lost 4–1 in a European Cup semi-final. Then this.', kicker='Panathinaikos · 1971', music=M + 'the-tapans-final-surge.mp3', end=END, scenes=[
        dict(src='bowl.jpg', focus=(0.5, 0.5), zoom=(1.1, 1.3), vo=L['Belgrade, April nineteen']),
        dict(src='despair.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['To reach the final']),
        dict(src='header-b.jpg', focus=(0.5, 0.5), zoom=(1.2, 1.35), vo=L['Inside two minutes']),
        dict(card=dict(big='Did they do it?', small='The answer is in the film', size=120), d=2.6)]),
    dict(name='short-2-part-timers', kind='short', hook='He worked in insurance. Then he outscored all of Europe.', kicker='Puskás’s Panathinaikos · 1971', music=M + 'under-the-iron-watch.mp3', end=END, scenes=[
        dict(src='training.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['And his players are not']),
        dict(src='photos.jpg', focus=(0.5, 0.5), zoom=(1.05, 1.2), vo=L['And Antoniadis finishes']),
        dict(card=dict(big='How did they get there?', small='The whole road is in the film', size=120), d=2.6)]),
    dict(name='short-3-the-world', kind='short', hook='They lost the final. Then played for the world title.', kicker='Panathinaikos · 1971', music=M + 'after-the-final-whistle.mp3', end=END, scenes=[
        dict(src='home-end.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['Two weeks later, in Athens']),
        dict(src='office.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['The European champions were']),
        dict(src='airport-b.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.25), vo=L['So Europe sent']),
        dict(card=dict(big='Who won the world title?', small='The answer is in the film', size=120), d=2.6)]),
]
# The two thumbnails (studio/docu/model.thumb): the hook off the record, measured at 168×94; A and B for Test & Compare.
THUMBS = [dict(file='thumbnail-a.jpg', src='bowl.jpg', focus=(0.5, 0.5), zoom=1.15, side='right', lines=['LOST 4–1.', 'THEN', 'WEMBLEY'], hot=2, kicker='PANATHINAIKOS · 1971', size=150, top=140),
          dict(file='thumbnail-b.jpg', src='home-end-b.jpg', focus=(0.5, 0.5), zoom=1.1, side='right', lines=['THE ONLY', 'GREEK', 'FINAL'], hot=1, kicker='EUROPEAN CUP · 1971', size=150, top=150)]

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
