"""Storyboard: AROUND THE BALL · 16 · THE MISSING NAME — Ronaldo and the 1998 World Cup final, Stade de France,
Saint-Denis, 12 July 1998. With its answer four years later: Germany 0–2 Brazil, Yokohama, 30 June 2002.

Script: docs/fanlife/around-the-ball/atb16-ronaldo-1998.script.md (its source slot is filled here, 17.11.2026).
Built on the Barbados film (atb_barbados_grenada_1994.py) and the model film (docs/rules/model-film.md); the long form
is the sprint's (claude/youtube-sprint-plan-2026-11-10.md): the partial answer inside 0:15, a chapter turn about every
90 s, one question planted in the cold open ("Who decided Ronaldo would play?") and paid off at the end.

Facts (two independent publishers each; the ledger with URLs is docs/fanlife/around-the-ball/atb16-ronaldo-1998.FACTS.md).
NOT said (one publisher, or the publishers disagree): the hotel's name; the clock time of the fit, of the clinic and of
the all-clear; César Sampaio's first aid; Dr Toledo in tears; the cortisone/injection details; Motson's words on air;
Desailly's red card; Zagallo losing his job; the haircut; the minute of Ronaldo's second goal in 2002; the 1997
Ballon d'Or; assists in 1998 (three or four). Disputes told as two versions: how long the fit lasted (30–40 seconds ·
about four minutes, both his own accounts); the minutes he lasted in April 2000 (six · seven); the date of the first
knee injury is said only as November 1999.
Pictures: the common library (studio/kit/beats/common), inked to the house paper. Faces are invented; no real person
is drawn as himself.

    python3 -m studio.docu.films.atb_ronaldo_1998 storyboard.json            # the storyboard (+ cuts.json, thumbs.json)
    python3 -m studio.docu.films.atb_ronaldo_1998 --pack ASSETS              # the asset pack
"""
import json
import sys
from pathlib import Path

BLUE, RED, COAL, CREAM = '#1D3F8F', '#C8102E', '#15130F', '#F4ECD8'
# The common library: the name the storyboard uses → the piece in studio/kit/beats/common.
LIB = {'hotel': 'hotel-window-city-kr', 'hotel-b': 'hotel-window-city-b-kr', 'stretcher': 'injury-stretcher-kr',
       'stretcher-b': 'injury-stretcher-b-kr', 'booth': 'commentator-booth-night', 'tunnel': 'tunnel-walk-out',
       'tunnel-gate': 'tunnel-gate-silhouette-n', 'tunnel-bright': 'tunnel-bright-pitch-n', 'boots': 'close-boots-tunnel-n',
       'dressing': 'dressing-room-silence-kr', 'dressing-b': 'dressing-room-silence-b-kr', 'press': 'press-conference-n',
       'press-b': 'press-conference-b-n', 'boardroom': 'boardroom-table-n', 'boardroom-b': 'boardroom-table-b-n',
       'trophy-lift': 'trophy-lift-crowd-kr', 'trophy-lift-b': 'trophy-lift-crowd-b-kr', 'signing': 'signing-desk-kr',
       'news': 'newspaper-stand-n', 'news-b': 'newspaper-stand-b-n', 'manager': 'manager-blank-board-stadium',
       'stadium': 'europe-stadium-night-n', 'bowl': 'stadium-night-bowl-n', 'archive': 'archive-trophy-spotlight',
       'dugout': 'dugout-substitutes', 'bus': 'open-top-bus-kr', 'rooftops': 'city-rooftops-dawn-n',
       'header': 'header-goalmouth-kr', 'header-b': 'header-goalmouth-b-kr', 'corner': 'corner-taker-kr',
       'corner-b': 'corner-taker-b-kr', 'net': 'ball-in-net-kr', 'net-b': 'ball-in-net-b-kr', 'clock': 'last-minute-clock-n',
       'clock-b': 'last-minute-clock-b-n', 'despair': 'despair-kneeling-kr', 'despair-b': 'despair-kneeling-b-kr',
       'pile': 'celebration-pile-kr', 'pile-b': 'celebration-pile-b-kr', 'whistle': 'final-whistle-arms-kr',
       'kickoff': 'kick-off-centre-kr', 'lightsoff': 'stadium-lights-off-n', 'photo': 'old-photo-wall-kr',
       'scrap': 'scrapbook-desk-kr', 'tv': 'tv-shop-window-kr', 'tv-b': 'tv-shop-window-b-kr', 'radio': 'radio-street-kr',
       'flags': 'flags-pole-kr', 'training': 'training-rain-kr', 'rain': 'rain-pitch-n', 'airport': 'airport-gate-kr',
       'volley': 'volley-edge-box-kr', 'penalty': 'penalty-spot-close-n', 'hands': 'close-hands-clasp-prayer-kr',
       'fingers': 'close-fingers-crossed-kr', 'crowd': 'crowd-scarves-night-kr', 'dusk': 'terrace-empty-dusk-n',
       'stands': 'foreign-stadium-stands-n', 'armband': 'close-armband-kr', 'shootout': 'shootout-line-kr'}


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


F = dict(id='bf', small='BRAZIL · FRANCE')   # the held corner board of the final
QUESTION = 'WHO DECIDED|RONALDO WOULD PLAY?'

beat(None, dict(kind='ident', line='A FAN LIFE FILM'), type='open', hold=1.8, sound=[('sting', 0.1, 1.7, 0.5)])

# ── COLD OPEN ── the sheet without the name, the partial answer before 0:15, the question, no result
beat("Saint-Denis. The World Cup final. Seventy-two minutes before kick-off, Brazil hand in their team sheet.",
     img('signing', 'push', veil=0.05, focus='30% 55%'), type='open', emotion='tension', intensity=0.7, pre=0.2, pad=0.1,
     meta=dict(plain=True), sound=[('tick', 0.0, 2.4, 0.5)])
beat("Ronaldo, twenty-one years old, Brazil's top scorer at the tournament, is not on it.",
     img('tunnel-gate', 'push', veil=0.05), stamp('NOT ON THE SHEET', 'them', x=520, y=460, dt=2.6, size=120, rot=-4, plate=True),
     type='open', emotion='dread', intensity=0.9, pad=0.1, meta=dict(plain=True), sound=[('stamp', 2.6, 1.0, 0.7)])
beat("That afternoon, in the team hotel, he had suffered a convulsive fit.",
     img('hotel', 'slam', veil=0.0), type='open', emotion='dread', intensity=0.9, pad=0.1, meta=dict(plain=True), sound=[('impact', 0.4, 1.4, 0.7)])
beat("Thirty minutes later, a second team sheet. His name is back.",
     word('7.48 PM · EDMUNDO', bg='ink', size=170, d=2.2), word('8.18 PM · RONALDO', bg='us', size=170, at=2.2),
     type='open', emotion='tension', intensity=1.0, pad=0.3, meta=dict(plain=True), sound=[('stamp', 0.0, 1.0, 0.6), ('stamp', 2.2, 1.0, 0.8)])
beat("He played. And for years, a whole country asked one question.", img('news', 'push', veil=0.35),
     word(QUESTION, bg='ink', size=140, small='12 JULY 1998 · TWO TEAM SHEETS', at=1.8),
     type='turning', emotion='tension', intensity=0.9, pad=0.6, meta=dict(plain=True), sound=[('riser', 0.2, 1.4, 0.5), ('impact', 1.8, 1.6, 0.7)])
beat(None, word('THE MISSING', bg='ink', size=230, d=1.2), word('THE MISSING|NAME', bg='us', size=200, small='RONALDO · PARIS · 1998', at=1.2),
     type='trailer', hold=3.2, sound=[('impact', 0.0, 1.4, 0.7), ('impact2', 1.2, 2.2, 0.9)])

# ── CHAPTER ONE · THE PHENOMENON ── who he was in July 1998, and what was waiting
chapter('CHAPTER ONE', 'FRANCE 98', 'THE PHENOMENON · JUNE–JULY 1998', 'stadium')
beat("Start with who he was that summer. Ronaldo was twenty-one, a striker at Inter, billed by the press as the best player in the world.",
     img('crowd', 'push', veil=0.05), flap('2026', '1998', at=1.6, d=2.8, small='FRANCE · THE WORLD CUP'),
     type='illustration', emotion='wonder', intensity=0.6, pad=0.3, sound=[('page', 0.0, 1.0, 0.4)])
beat("Brazil were the champions of the world, and they had come to France to keep the trophy.",
     img('archive', 'push', veil=0.1), type='illustration', emotion='pride', intensity=0.6, pad=0.3)
beat("On the way to the final, Ronaldo scored four goals.",
     dict(kind='stat', value='4', label='RONALDO · GOALS ON THE WAY TO THE FINAL', dt=0.4),
     type='stat', emotion='pride', intensity=0.7, pad=0.4, sound=[('impact', 0.4, 1.4, 0.6)])
beat("Brazil came through the semi-final against the Netherlands on penalties.",
     img('shootout', 'push', veil=0.1), stamp('SEMI-FINAL · ON PENALTIES', 'us', x=300, y=200, dt=2.4, size=96, rot=-3, plate=True),
     type='record', emotion='tension', intensity=0.6, pad=0.3, sound=[('stamp', 2.4, 1.0, 0.6)])
beat("Waiting for them in the final were the hosts. France had never won the World Cup.",
     img('flags', 'push', veil=0.1), word('BRAZIL v FRANCE', bg='ink', size=170, small='THE HOLDERS · THE HOSTS', at=2.6),
     type='versus', emotion='tension', intensity=0.7, pad=0.3)
beat("France had a playmaker named Zinedine Zidane. Brazil had the phenomenon.",
     img('volley', 'push', veil=0.05), type='illustration', emotion='wonder', intensity=0.7, pad=0.3)
beat("The final was set for Sunday, the twelfth of July, at the Stade de France in Saint-Denis, just outside Paris. Kick-off, nine in the evening.",
     img('stadium', 'pull', veil=0.1), stamp('12 JULY 1998 · 9 PM', 'us', x=200, y=200, dt=4.4, size=96, rot=-2, plate=True),
     type='matchday', emotion='tension', intensity=0.6, pad=0.3, sound=[('build', 0.0, 7.0, 0.3), ('stamp', 4.4, 1.0, 0.6)])
beat("It should have been his night. Instead, it became the strangest day of his life.",
     img('hotel-b', 'push', veil=0.1), type='turning', emotion='dread', intensity=0.9, pad=0.8, meta=dict(turn=True))

# ── CHAPTER TWO · AFTER LUNCH ── the fit, in the words of the people in the room
chapter('CHAPTER TWO', 'AFTER LUNCH', 'THE TEAM HOTEL · 12 JULY', 'hotel')
beat("The day of the final. The squad have lunch, and go back to their rooms to rest.",
     img('hotel', 'push', veil=0.05, focus='40% 50%'), type='illustration', emotion='calm', intensity=0.4, pad=0.3)
beat("Ronaldo shares a room with the left-back, Roberto Carlos.",
     img('dressing', 'push', veil=0.1), stamp('ROBERTO CARLOS', 'us', x=200, y=200, dt=1.8, size=96, rot=-3, plate=True),
     type='illustration', emotion='calm', intensity=0.4, pad=0.3, sound=[('stamp', 1.8, 1.0, 0.5)])
beat("Ronaldo falls asleep. And while he sleeps, he starts to convulse.",
     img('hotel-b', 'slam', veil=0.0), type='illustration', emotion='dread', intensity=1.0, pad=0.6,
     meta=dict(breath=True), sound=[('hush', 0.0, 2.6, 0.5)])
beat("Roberto Carlos runs out, shouting for help.", img('tunnel-gate', 'push', veil=0.05),
     type='illustration', emotion='dread', intensity=1.0, pad=0.3, sound=[('impact', 0.4, 1.4, 0.6)])
beat("Players rush in. The striker Edmundo is one of them.",
     img('stretcher', 'push', veil=0.1), stamp('EDMUNDO', 'them', x=220, y=200, dt=2.6, size=110, rot=-3, plate=True),
     type='illustration', emotion='dread', intensity=0.9, pad=0.3, sound=[('stamp', 2.6, 1.0, 0.6)])
beat("The team doctor, Lídio Toledo, examines him. When the convulsions stop, Ronaldo falls asleep again.",
     img('stretcher-b', 'pull', veil=0.1), word('DR LÍDIO TOLEDO', bg='ink', size=150, small='BRAZIL TEAM DOCTOR', at=2.4),
     type='illustration', emotion='dread', intensity=0.7, pad=0.4)
beat("How long did the fit last? Ronaldo has told it two ways.",
     img('fingers', 'push', veil=0.2), type='turning', emotion='wonder', intensity=0.7, pad=0.3)
beat("In one account, it was a seizure of thirty or forty seconds. In another, he was unconscious for about four minutes.",
     word('30–40|SECONDS', bg='ink', size=200, small='ONE ACCOUNT', d=3.6), word('ABOUT FOUR|MINUTES', bg='them', size=200, small='ANOTHER ACCOUNT', at=3.6),
     type='record', emotion='tension', intensity=0.8, pad=0.4)
beat("When he wakes up, he does not know what has happened.", img('hotel', 'push', veil=0.15, focus='60% 50%'),
     type='illustration', emotion='grief', intensity=0.7, pad=0.4)
beat("It is Leonardo, his team-mate, who tells him. He takes Ronaldo out for a walk in the garden, and explains.",
     img('rooftops', 'push', veil=0.1), stamp('LEONARDO', 'us', x=220, y=200, dt=1.6, size=110, rot=-3, plate=True),
     type='illustration', emotion='grief', intensity=0.6, pad=0.3, sound=[('stamp', 1.6, 1.0, 0.5)])
beat("And the news is worse than the fit. Mário Zagallo, the coach, has decided. Edmundo will start the World Cup final.",
     img('manager', 'push', veil=0.05), word('EDMUNDO STARTS', bg='them', size=190, small='ZAGALLO’S DECISION', at=4.6),
     type='turning', emotion='dread', intensity=0.9, pad=0.8, meta=dict(turn=True), sound=[('impact', 4.6, 1.4, 0.7)])

# ── CHAPTER THREE · TWO TEAM SHEETS ── the clinic, the sheets, the thirty minutes
chapter('CHAPTER THREE', 'TWO TEAM SHEETS', 'PARIS · THE EVENING', 'signing')
beat("Ronaldo is taken to hospital for tests.", img('stretcher', 'pull', veil=0.2),
     type='illustration', emotion='tension', intensity=0.6, pad=0.3)
beat("Doctors look for anything abnormal.",
     img('archive', 'push', veil=0.3), type='illustration', emotion='tension', intensity=0.7, pad=0.3, sound=[('tick', 0.0, 2.4, 0.4)])
beat("They find nothing.", word('NOTHING|ABNORMAL', bg='us', size=230, small='THE TESTS · THE AFTERNOON OF THE FINAL'),
     type='stat', emotion='release', intensity=0.8, pad=0.5, sound=[('impact', 0.0, 1.4, 0.6)])
beat("Meanwhile, at the Stade de France, the clock is running.", img('clock', 'push', veil=0.1),
     type='illustration', emotion='tension', intensity=0.8, pad=0.3, sound=[('tick', 0.0, 3.0, 0.5)])
beat("At seven forty-eight, seventy-two minutes before kick-off, Brazil give FIFA their team sheet.",
     img('signing', 'push', veil=0.05, focus='30% 55%'), flap('7.30', '7.48', at=1.0, d=3.4, small='PM · LOCAL TIME'),
     type='record', emotion='tension', intensity=0.8, pad=0.3)
beat("Taffarel. Cafu, Júnior Baiano, Aldair, Roberto Carlos. Leonardo, Dunga, César Sampaio, Rivaldo. Bebeto. And Edmundo.",
     word('TAFFAREL · CAFU · J. BAIANO|ALDAIR · R. CARLOS · LEONARDO', bg='ink', size=96, small='THE FIRST TEAM SHEET · 7.48 PM', d=4.2),
     word('DUNGA · C. SAMPAIO · RIVALDO|BEBETO · EDMUNDO', bg='them', size=104, small='THE FIRST TEAM SHEET · 7.48 PM', at=4.2),
     type='record', emotion='tension', intensity=0.8, pad=0.4)
beat("No Ronaldo.", word('NO RONALDO', bg='them', size=280, small='THE FIRST TEAM SHEET · 7.48 PM'),
     type='stat', emotion='dread', intensity=1.0, pad=0.5, sound=[('stamp', 0.0, 1.0, 0.8)])
beat("Just after eight, the sheet reaches the press. Nobody had expected it.",
     img('booth', 'push', veil=0.05), type='illustration', emotion='wonder', intensity=0.8, pad=0.3)
beat("Brazil's top scorer was missing, and nobody outside the team knew why. The full story only came out after the final.",
     img('stands', 'push', veil=0.1), type='illustration', emotion='tension', intensity=0.8, pad=0.4)
beat("And then Ronaldo arrives at the stadium, with his test results.", img('tunnel', 'push', veil=0.05),
     type='turning', emotion='tension', intensity=0.9, pad=0.3)
beat("He goes to Zagallo. He tells him he is fine. He tells him he wants to play.",
     img('dressing-b', 'push', veil=0.05), stamp('I’M FINE', 'us', x=520, y=460, dt=3.0, size=140, rot=-3, plate=True),
     type='illustration', emotion='defiance', intensity=1.0, pad=0.3, sound=[('stamp', 3.0, 1.0, 0.8)])
beat("Brazil do not come out for their warm-up.", img('bowl', 'push', veil=0.1),
     type='illustration', emotion='tension', intensity=0.9, pad=0.4, sound=[('build', 0.0, 3.0, 0.3)])
beat("At eight eighteen, a modified team sheet. Edmundo is on the bench. Ronaldo is in the team.",
     img('signing', 'push', veil=0.2, focus='60% 55%'), flap('7.48', '8.18', at=0.6, d=3.4, small='PM · THE SECOND SHEET'),
     word('RONALDO|IS BACK', bg='us', size=200, small='8.18 PM · 42 MINUTES BEFORE KICK-OFF', at=4.0),
     type='turning', emotion='release', intensity=1.0, pad=0.4, sound=[('impact2', 4.0, 2.0, 0.8)])
beat("Thirty minutes. Two team sheets. One name.",
     dict(kind='explain', form='timeline', title='THE THIRTY MINUTES', left='7.48 PM', right='9.00 PM',
          marks=[dict(at=0.0, label='EDMUNDO')], ticks=[dict(at=0.4, label='RONALDO', value=1, hot=True)]),
     type='record', emotion='tension', intensity=0.9, pad=0.5)
beat("Forty-two minutes before the World Cup final, Brazil had changed their team. And put back a player who, that afternoon, had lost consciousness.",
     img('tunnel', 'pull', veil=0.2), type='illustration', emotion='dread', intensity=0.9, pad=0.5)
beat("When the teams walk out, Ronaldo is the last Brazil player out of the tunnel.",
     img('tunnel-bright', 'push', veil=0.0), type='illustration', emotion='dread', intensity=0.9, pad=0.8,
     meta=dict(breath=True, turn=True), sound=[('hush', 0.0, 2.6, 0.5)])

# ── CHAPTER FOUR · NINETY MINUTES ── the final, with the board in the corner
chapter('CHAPTER FOUR', 'NINETY MINUTES', 'STADE DE FRANCE · 9 PM', 'bowl')
beat("Nine o'clock. France kick off.", img('kickoff', 'push', veil=0.05), clock(1),
     type='matchday', emotion='tension', intensity=0.8, pad=0.3, meta=dict(board=dict(F, score='0–0')), sound=[('whistle', 0.4, 1.2, 0.6)])
beat("Twenty-seven minutes. Emmanuel Petit swings in a corner.", img('corner', 'push', veil=0.05), clock(27),
     type='illustration', emotion='tension', intensity=0.9, pad=0.2, meta=dict(board=dict(F, score='0–0')))
beat("Zinedine Zidane heads it in.", img('header', 'slam', veil=0.0),
     type='goal', emotion='dread', intensity=1.0, pad=0.4, meta=dict(board=dict(F, score='0–1', flip_at=1.8), plain=True), sound=[('groan', 1.8, 2.4, 0.6)])
beat("And on the Brazil bench, the coach has a doubt of his own. He said so later.",
     img('dugout', 'push', veil=0.1), type='illustration', emotion='dread', intensity=0.8, pad=0.3, meta=dict(board=dict(F, score='0–1')))
beat("For the whole of the first half I was wondering whether to take him off.",
     dict(kind='quote', text='“For the whole of the first half I was wondering whether to take him off.”', who='MÁRIO ZAGALLO · BRAZIL COACH'),
     type='quote', emotion='grief', intensity=0.8, pad=0.6, meta=dict(board=dict(F, score='0–1')))
beat("Just before half-time, another corner. Another Zidane header.", img('corner-b', 'push', veil=0.05), clock(45),
     type='goal', emotion='dread', intensity=1.0, pad=0.3, meta=dict(board=dict(F, score='0–2', flip_at=2.4), plain=True), sound=[('groan', 2.4, 2.4, 0.6)])
beat(None, word('ZIDANE|TWO HEADERS', bg='them', size=200, small='FRANCE 2 – 0 BRAZIL · HALF-TIME'), type='goal', emotion='dread', intensity=1.0, hold=2.4,
     meta=dict(board=dict(F, score='0–2')), sound=[('stamp', 0.2, 1.0, 0.8)])
beat("Two nil at half-time.", img('dressing', 'pull', veil=0.1),
     type='illustration', emotion='grief', intensity=0.8, pad=0.4, meta=dict(board=dict(F, score='0–2')))
beat("Fifty-five minutes. Roberto Carlos crosses, and the ball falls to Ronaldo, close to goal.",
     img('volley', 'push', veil=0.0), clock(55), type='illustration', emotion='tension', intensity=1.0, pad=0.2, meta=dict(board=dict(F, score='0–2')))
beat("He shoots straight at Fabien Barthez.", img('header-b', 'slam', veil=0.05), stamp('SAVED · BARTHEZ', 'them', x=520, y=460, dt=1.6, size=120, rot=-4, plate=True),
     type='illustration', emotion='grief', intensity=1.0, pad=0.4, meta=dict(board=dict(F, score='0–2')), sound=[('groan', 1.2, 2.0, 0.5)])
beat("With a quarter of an hour left, Edmundo comes on. Not for Ronaldo. Ronaldo plays all ninety minutes.",
     img('dugout', 'pull', veil=0.2), clock(75), type='illustration', emotion='wonder', intensity=0.7, pad=0.3, meta=dict(board=dict(F, score='0–2')))
beat("And in injury time, Patrick Vieira sends Petit clear. Three nil.", img('net', 'slam', veil=0.0), clock(90),
     type='goal', emotion='dread', intensity=1.0, pad=0.4, meta=dict(board=dict(F, score='0–3', flip_at=3.2), plain=True), sound=[('groan', 3.2, 2.4, 0.6)])
beat("France three, Brazil nil.",
     dict(kind='score', us='BRAZIL', them='FRANCE', us_goals=0, them_goals=3, cap='WORLD CUP FINAL · STADE DE FRANCE · 12 JULY 1998', bg='stadium.jpg'),
     type='score', emotion='grief', intensity=0.9, pad=0.4, meta=dict(outcome='loss', plain=True, claims=['result']), sound=[('final', 0.3, 5.0, 0.5)])
beat("France were champions of the world for the first time.", img('bus', 'push', veil=0.1),
     type='illustration', emotion='joy', intensity=0.6, pad=0.3, sound=[('claps', 0.0, 3.0, 0.3)])
beat("And FIFA's award for the best player of the whole tournament, the Golden Ball, went to Ronaldo.",
     img('archive', 'push', veil=0.2), word('GOLDEN BALL|RONALDO', bg='us', size=180, small='THE BEST PLAYER OF FRANCE 98', at=3.8),
     type='record', emotion='wonder', intensity=0.8, pad=0.4)
beat("The best player of the World Cup. The player nobody could explain.", img('lightsoff', 'pull', veil=0.1),
     type='turning', emotion='grief', intensity=0.9, pad=0.8, meta=dict(turn=True))

# ── CHAPTER FIVE · THE INQUIRY ── the theories, the voices on the record, the parliamentary inquiry
chapter('CHAPTER FIVE', 'THE INQUIRY', 'BRAZIL · AFTER THE FINAL', 'boardroom')
beat("Think about that day again. Lunch. A fit. A hospital. Two team sheets. And a three nil defeat in the World Cup final.",
     img('scrap', 'pull', veil=0.1), type='illustration', emotion='grief', intensity=0.7, pad=0.5)
beat("Back in Brazil, the defeat became a mystery. Why had a player who convulsed that afternoon been on the pitch at all?",
     img('news', 'push', veil=0.05), type='illustration', emotion='grief', intensity=0.7, pad=0.3)
beat("The theories came fast.", img('scrap', 'push', veil=0.1), type='illustration', emotion='wonder', intensity=0.7, pad=0.3)
beat("One newspaper, Folha de São Paulo, wrote of a nervous crisis. Other stories pointed at an injection, or a painkiller.",
     img('news-b', 'pull', veil=0.1), stamp('THEORIES', 'them', x=520, y=460, dt=3.2, size=140, rot=-4, plate=True),
     type='illustration', emotion='wonder', intensity=0.7, pad=0.3, sound=[('stamp', 3.2, 1.0, 0.6)])
beat("And one name kept coming back. Nike, the sponsor of the Brazil team.",
     img('boardroom', 'push', veil=0.1), word('NIKE', bg='ink', size=300, small='THE BRAZIL TEAM’S SPONSOR', at=2.4),
     type='turning', emotion='tension', intensity=0.8, pad=0.3)
beat("Edmundo, the man who lost his place that evening, said Nike had wanted Ronaldo on the pitch.",
     img('tunnel-gate', 'pull', veil=0.1), stamp('EDMUNDO', 'them', x=220, y=200, dt=1.0, size=110, rot=-3, plate=True),
     type='illustration', emotion='tension', intensity=0.8, pad=0.3, sound=[('stamp', 1.0, 1.0, 0.6)])
beat("Nike denied it, quickly and strongly.", img('press', 'push', veil=0.1), stamp('DENIED', 'us', x=520, y=460, dt=1.4, size=150, rot=4, plate=True),
     type='illustration', emotion='tension', intensity=0.7, pad=0.3, sound=[('stamp', 1.4, 1.0, 0.7)])
beat("Zagallo said the decision was his, and the player's.", img('manager', 'push', veil=0.2),
     type='illustration', emotion='defiance', intensity=0.7, pad=0.3)
beat("If there had been interference, I would have resigned.",
     dict(kind='quote', text='“If there had been interference, I would have resigned.”', who='MÁRIO ZAGALLO'),
     type='quote', emotion='defiance', intensity=0.8, pad=0.6)
beat("In Brazil, a parliamentary inquiry was set up to look at the national team's deal with Nike. Players, officials and doctors were questioned.",
     img('boardroom-b', 'push', veil=0.05), word('THE INQUIRY', bg='ink', size=220, small='BRAZIL’S CONGRESS · THE NIKE CONTRACT', at=4.8),
     type='record', emotion='tension', intensity=0.7, pad=0.3)
beat("Dr Toledo told it why he had not stopped Ronaldo from playing.", img('press-b', 'push', veil=0.1),
     type='illustration', emotion='tension', intensity=0.7, pad=0.3)
beat("Imagine if I stopped him playing and Brazil lost.",
     dict(kind='quote', text='“Imagine if I stopped him playing and Brazil lost.”', who='DR LÍDIO TOLEDO · TO THE INQUIRY'),
     type='quote', emotion='dread', intensity=0.9, pad=0.6)
beat("Doctors from outside the team said later that he should never have played that night. One called it an absolute error.",
     img('stretcher-b', 'pull', veil=0.2), stamp('AN ABSOLUTE ERROR', 'them', x=480, y=460, dt=4.2, size=110, rot=-3, plate=True),
     type='illustration', emotion='dread', intensity=0.8, pad=0.4, sound=[('stamp', 4.2, 1.0, 0.6)])
beat("The inquiry found no proof that Nike had forced anything. The questions about that afternoon were never fully answered.",
     img('archive', 'pull', veil=0.2), stamp('NO PROOF', 'us', x=520, y=460, dt=2.4, size=150, rot=-3, plate=True),
     type='record', emotion='grief', intensity=0.7, pad=0.4, sound=[('stamp', 2.4, 1.0, 0.7)])
beat("And by then, Ronaldo had a bigger problem than a final he had lost.", img('training', 'push', veil=0.1),
     type='turning', emotion='dread', intensity=0.9, pad=0.8, meta=dict(turn=True))

# ── CHAPTER SIX · THE KNEE ── November 1999, April 2000, the season lost
chapter('CHAPTER SIX', 'THE KNEE', 'INTER · 1999–2000', 'stretcher')
beat("November nineteen ninety-nine. Ronaldo is playing for Inter, against Lecce.", img('rain', 'push', veil=0.05),
     flap('1998', '1999', at=2.4, d=3.0, small='NOVEMBER · SERIE A'), type='illustration', emotion='tension', intensity=0.6, pad=0.3)
beat("His right knee gives way. A tendon is ruptured. He needs surgery.", img('stretcher', 'slam', veil=0.0),
     stamp('TENDON RUPTURED', 'them', x=520, y=460, dt=2.6, size=120, rot=-4, plate=True),
     type='illustration', emotion='grief', intensity=0.9, pad=0.4, sound=[('stamp', 2.6, 1.0, 0.7)])
beat("Five months later, April two thousand. The Coppa Italia final, against Lazio. Ronaldo comes back.",
     img('tunnel', 'push', veil=0.05), flap('1999', '2000', at=1.6, d=3.0, small='APRIL · COPPA ITALIA FINAL'),
     type='illustration', emotion='wonder', intensity=0.7, pad=0.3)
beat("He lasts six minutes, by one count. Seven, by another.",
     word('6 MINUTES', bg='ink', size=230, small='ONE COUNT', d=2.4), word('7 MINUTES', bg='them', size=230, small='ANOTHER', at=2.4),
     type='record', emotion='dread', intensity=0.9, pad=0.3)
beat("Then the same knee collapses. His physiotherapist, Nilton Petrone, said the kneecap actually exploded.",
     img('stretcher-b', 'slam', veil=0.0), word('“HIS KNEE-CAP|EXPLODED”', bg='them', size=160, small='NILTON PETRONE · PHYSIOTHERAPIST', at=3.6),
     type='illustration', emotion='grief', intensity=1.0, pad=0.6, sound=[('impact', 0.4, 1.4, 0.7)])
beat("His knee is in the hands of a surgeon in Paris, Gérard Saillant, who had been watching both his knees since early nineteen ninety-nine.",
     img('airport', 'push', veil=0.1), word('GÉRARD SAILLANT', bg='ink', size=150, small='THE SURGEON · PARIS', at=3.2),
     type='illustration', emotion='grief', intensity=0.6, pad=0.4)
beat("Ronaldo misses the whole of the next season.", dict(kind='stat', value='2000–01', label='THE SEASON RONALDO NEVER PLAYED', dt=0.4),
     img('training', 'pull', veil=0.3, dt=3.4), type='stat', emotion='grief', intensity=0.8, pad=0.4)
beat("Brazil go through qualifying for the next World Cup without him.", img('radio', 'push', veil=0.1),
     type='illustration', emotion='grief', intensity=0.6, pad=0.3)
beat("For two years, he barely plays at all.", img('lightsoff', 'push', veil=0.2),
     type='turning', emotion='grief', intensity=0.9, pad=0.8, meta=dict(turn=True, breath=True), sound=[('hush', 0.0, 2.6, 0.4)])

# ── CHAPTER SEVEN · YOKOHAMA ── the answer four years later
beat("In Paris, the question had been who put Ronaldo on the pitch. Now the question was whether he would ever play at the top again.",
     img('dusk', 'push', veil=0.2), type='turning', emotion='grief', intensity=0.8, pad=0.8)
chapter('CHAPTER SEVEN', 'YOKOHAMA', 'KOREA · JAPAN · 2002', 'stands')
beat("Summer two thousand and two. The World Cup, in Korea and Japan. Ronaldo is back in Brazil's attack.",
     img('stands', 'push', veil=0.05), flap('2000', '2002', at=1.0, d=3.0, small='KOREA · JAPAN'), type='illustration', emotion='wonder', intensity=0.7, pad=0.3)
beat("He scores in every match, except the quarter-final against England.",
     word('SCORED IN|6 OF 7', bg='us', size=220, small='EVERY MATCH BUT THE QUARTER-FINAL v ENGLAND'),
     type='stat', emotion='pride', intensity=0.8, pad=0.4)
beat("Brazil reach the final. Their opponents are Germany. Yokohama, the thirtieth of June.",
     img('bowl', 'push', veil=0.05), word('GERMANY v BRAZIL', bg='ink', size=170, small='YOKOHAMA · 30 JUNE 2002', at=2.6),
     type='versus', emotion='tension', intensity=0.8, pad=0.3)
beat("Sixty-seven minutes. Rivaldo shoots. Germany's goalkeeper, Oliver Kahn, cannot hold it.",
     img('header-b', 'push', veil=0.0), clock(67), type='illustration', emotion='tension', intensity=1.0, pad=0.2,
     meta=dict(board=dict(id='gb', small='GERMANY · BRAZIL', score='0–0')))
beat("Ronaldo has followed the shot in. One nil.", img('net-b', 'slam', veil=0.0),
     type='goal', emotion='release', intensity=1.0, pad=0.4, meta=dict(board=dict(id='gb', small='GERMANY · BRAZIL', score='0–1', flip_at=1.6), plain=True),
     sound=[('impact2', 1.6, 2.0, 0.9), ('goal', 1.8, 5.0, 0.6)])
beat("Then a second. Low, into the bottom corner. Two nil.", img('pile', 'slam', veil=0.0),
     type='goal', emotion='joy', intensity=1.0, pad=0.4, meta=dict(board=dict(id='gb', small='GERMANY · BRAZIL', score='0–2', flip_at=2.2), plain=True),
     sound=[('goal', 2.2, 5.0, 0.7)])
beat("Germany nil, Brazil two. Brazil are champions of the world again.",
     dict(kind='score', us='BRAZIL', them='GERMANY', us_goals=2, them_goals=0, cap='WORLD CUP FINAL · YOKOHAMA · 30 JUNE 2002', bg='stands.jpg'),
     type='score', emotion='joy', intensity=0.9, pad=0.4, meta=dict(outcome='win', plain=True, claims=['result']), sound=[('final', 0.3, 5.0, 0.5)])
beat("Four years after Saint-Denis, Ronaldo had his World Cup.", img('trophy-lift', 'push', veil=0.05),
     type='illustration', emotion='joy', intensity=1.0, pad=0.6, sound=[('claps', 0.0, 3.0, 0.4)])
beat("Ronaldo finishes with eight goals, and the Golden Boot. His twelve World Cup goals equal Pelé's record for Brazil.",
     dict(kind='stat', value='8', label='GOALS · GOLDEN BOOT · WORLD CUP 2002', dt=0.4), img('trophy-lift', 'pull', veil=0.1, dt=3.6),
     word('12 WORLD CUP GOALS|LEVEL WITH PELÉ', bg='us', size=130, small='THE BRAZIL RECORD', at=5.6),
     type='record', emotion='pride', intensity=0.9, pad=0.4)
beat("At the end of the year, FIFA named him World Player of the Year, for the third time.", img('trophy-lift-b', 'push', veil=0.1),
     type='record', emotion='pride', intensity=0.8, pad=0.6, sound=[('claps', 0.0, 3.0, 0.3)])

# ── CLOSE · the bookend answered, the hand-over ──
beat(None, word(QUESTION, bg='ink', size=140, small='THE OPENING QUESTION', d=2.6), type='trailer', hold=2.8, sound=[('impact', 0.0, 1.6, 0.6)])
beat("So who decided Ronaldo would play the final of nineteen ninety-eight?", img('signing', 'pull', veil=0.2),
     type='turning', emotion='wonder', intensity=0.9, pad=0.4)
beat("By his own account, he did. He went to Zagallo with his test results, and the coach accepted his decision.",
     img('dressing-b', 'pull', veil=0.1), word('RONALDO|DECIDED', bg='us', size=200, small='HIS OWN ACCOUNT · ACCEPTED BY ZAGALLO', at=4.4),
     type='illustration', emotion='pride', intensity=0.9, pad=0.4)
beat("The coach said there was no interference. The inquiry found no proof of any.", img('boardroom', 'pull', veil=0.2),
     type='illustration', emotion='calm', intensity=0.6, pad=0.3)
beat("What no one has ever fully explained is the fit itself. Why, on that afternoon, the best player in the world went to sleep, and woke up to the strangest day of his life.",
     img('hotel', 'pull', veil=0.2), type='illustration', emotion='wonder', intensity=0.7, pad=0.4)
beat("Two team sheets, thirty minutes apart. They are still the strangest documents of that final.", img('signing', 'push', veil=0.3, focus='60% 55%'),
     type='illustration', emotion='wonder', intensity=0.7, pad=0.5)
beat("Four years later, the same man answered the rest of the question. With a World Cup.", img('trophy-lift', 'push', veil=0.2),
     type='illustration', emotion='pride', intensity=0.9, pad=0.8)
beat("Next on Around the Ball: Madrid, two thousand and four. A match stopped near the end, and finished weeks later. If you love the strange side of this game, subscribe, and it will find you.",
     img('flags', 'push', veil=0.4), dict(kind='follow', club='Around the Ball', press_at=8.6, dt=1.2),
     type='follow', pad=1.0, sound=[('claps', 8.6, 2.0, 0.4)])
beat(None, img('lightsoff', 'push', veil=0.55), dict(kind='end', title='The Missing Name', line='NEXT · THE SIX-MINUTE MATCH · @FanLifeFootballStories'), type='end', hold=5.0)

# A card leaves after its reading time (docu/editor MAX_CARD, WORD_HOLD): each long card beat gets the picture that carries the rest.
UNDER = {'Thirty minutes later, a second': 'signing', 'On the way to the final': 'crowd', 'In one account': 'hotel-b',
         'Taffarel. Cafu': 'signing', 'No Ronaldo.': 'booth', 'Thirty minutes. Two team sheets': 'tunnel',
         'He lasts six minutes': 'stretcher', 'He scores in every match': 'stands', 'If there had been interference': 'manager',
         'Imagine if I stopped': 'boardroom-b', 'For the whole of the first half I was': 'dugout', 'They find nothing.': 'archive'}
for _b in B:
    for _k, _src in UNDER.items():
        if _b['vo'] and _b['vo'].startswith(_k):
            _b['shots'].insert(0, img(_src, 'push', veil=0.25))
assert sum(1 for _b in B for _k in UNDER if _b['vo'] and _b['vo'].startswith(_k)) == len(UNDER)

_CH = lambda big: next(i for i, b in enumerate(B) if b['shots'] and b['shots'][0].get('big') == big)
_C2, _C3, _C4, _C5, _C6, _C7 = (_CH(x) for x in ('AFTER LUNCH', 'TWO TEAM SHEETS', 'NINETY MINUTES', 'THE INQUIRY', 'THE KNEE', 'YOKOHAMA'))
M = 'dubelteam/'
SB = dict(slug='atb-ronaldo-1998', title='The Missing Name', minutes=[9.5, 14], palette=dict(us=BLUE, them=RED), edit=True, mark=True,
          shape='ball',
          pronounce={'Ronaldo': 'ɹəˈnældəʊ', "Ronaldo's": 'ɹəˈnældəʊz', 'Edmundo': 'ɛdˈmʊndəʊ', 'Zagallo': 'zəˈɡæləʊ', 'Mário Zagallo': 'ˈmɑːɹiəʊ zəˈɡæləʊ',
                     'Lídio Toledo': 'ˈliːdiəʊ təˈleɪdəʊ', 'Toledo': 'təˈleɪdəʊ', 'Roberto Carlos': 'ɹəˈbɜːtəʊ ˈkɑːləs', 'Leonardo': 'ˌliːəˈnɑːdəʊ',
                     'Zidane': 'zɪˈdæn', 'Zinedine Zidane': 'ˈzɪnədiːn zɪˈdæn', 'Emmanuel Petit': 'ɪˈmænjuəl pəˈtiː', 'Petit': 'pəˈtiː',
                     'Fabien Barthez': 'ˈfæbiæ̃ ˈbɑːtɛz', 'Barthez': 'ˈbɑːtɛz', 'Patrick Vieira': 'ˈpætɹɪk viˈɛəɹə', 'Saint-Denis': 'ˌsæ̃ dəˈniː',
                     'Taffarel': 'ˌtæfəˈɹɛl', 'Cafu': 'kæˈfuː', 'Júnior Baiano': 'ˈʒuːniəɹ baɪˈɑːnəʊ', 'Aldair': 'ˌældəˈiːə', 'Dunga': 'ˈdʊŋɡə',
                     'César Sampaio': 'ˈseɪzɑː sæmˈpaɪəʊ', 'Rivaldo': 'ɹɪˈvældəʊ', 'Bebeto': 'bɛˈbɛtəʊ', 'Folha de São Paulo': 'ˈfoʊljə dʒi ˌsaʊ ˈpaʊləʊ',
                     'Lecce': 'ˈlɛtʃeɪ', 'Lazio': 'ˈlætsiəʊ', 'Coppa Italia': 'ˈkɒpə ɪˈtæljə', 'Nilton Petrone': 'ˈnɪltən pɛˈtɹəʊni',
                     'Yokohama': 'ˌjəʊkəˈhɑːmə', 'Oliver Kahn': 'ˈɒlɪvə ˈkɑːn', 'Kahn': 'ˈkɑːn', 'Pelé': 'ˈpɛleɪ', "Pelé's": 'ˈpɛleɪz', 'Nike': 'ˈnaɪki', 'Gérard Saillant': 'ʒeɪˈɹɑː saɪˈjɒ̃', 'Inter': 'ˈɪntə'},
          us=dict(), them=dict(), agg_label='', karaoke=True, sub_limit=44, bed=0.16,
          music=[dict(file=M + 'before-the-collapse.mp3', from_beat=1, to_beat=_C2 - 1, vol=0.12),
                 dict(file=M + 'under-the-iron-watch.mp3', from_beat=_C2, to_beat=_C4 - 1, vol=0.12),
                 dict(file=M + 'the-weight-of-stillness.mp3', from_beat=_C4, to_beat=_C6 - 1, vol=0.12),
                 dict(file=M + 'a-seat-by-the-exit.mp3', from_beat=_C6, to_beat=_C7 - 1, vol=0.12),
                 dict(file=M + 'ninety-minutes-of-glory.mp3', from_beat=_C7, vol=0.11)],
          credits=['Music: Before the Collapse · Under the Iron Watch · The Weight of Stillness · A Seat by the Exit · Ninety Minutes of Glory — DubelTeam'],
          beats=B)

# ── THE VERTICAL CUTS (studio/docu/vertical.py) ── three Shorts (≤ 30 s, an open loop, the answer only in the film)
L = {k: next(b['vo'] for b in B if b['vo'] and b['vo'].startswith(k)) for k in (
    'Saint-Denis. The World Cup', 'Ronaldo, twenty-one', 'That afternoon, in the team', 'Thirty minutes later, a second',
    'Ronaldo falls asleep', 'Roberto Carlos runs out', 'When he wakes up', 'And the news is worse',
    'Edmundo, the man who lost', 'Nike denied it', 'Imagine if I stopped', 'At eight eighteen')}
END = dict(big='Watch the full film', small='The Missing Name · on YouTube')
VERTICAL = [
    dict(name='short-1-missing-name', kind='short', hook='The World Cup final team sheet without Ronaldo', kicker='France 98 · the final', music=M + 'under-the-iron-watch.mp3', end=END, scenes=[
        dict(src='signing.jpg', focus=(0.3, 0.55), zoom=(1.1, 1.3), vo=L['Saint-Denis. The World Cup']),
        dict(src='tunnel-gate.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['Ronaldo, twenty-one']),
        dict(src='signing.jpg', focus=(0.6, 0.55), zoom=(1.2, 1.35), vo=L['Thirty minutes later, a second']),
        dict(card=dict(big='Who put his name back?', small='The answer is in the film', size=130), d=2.4)]),
    dict(name='short-2-after-lunch', kind='short', hook='Hours before the World Cup final, Ronaldo had a fit', kicker='The team hotel · 12 July 1998', music=M + 'before-the-collapse.mp3', end=END, scenes=[
        dict(src='hotel.jpg', focus=(0.4, 0.5), zoom=(1.0, 1.2), vo=L['Ronaldo falls asleep']),
        dict(src='tunnel-gate.jpg', focus=(0.5, 0.5), zoom=(1.05, 1.2), vo=L['Roberto Carlos runs out']),
        dict(src='hotel.jpg', focus=(0.6, 0.5), zoom=(1.2, 1.05), vo=L['When he wakes up']),
        dict(src='manager.jpg', focus=(0.35, 0.5), zoom=(1.0, 1.2), vo=L['And the news is worse']),
        dict(card=dict(big='He played anyway. Why?', small='The full story is in the film', size=130), d=2.4)]),
    dict(name='short-3-nike', kind='short', hook='Did a sponsor put Ronaldo on the pitch?', kicker='France 98 · the inquiry', music=M + 'the-weight-of-stillness.mp3', end=END, scenes=[
        dict(src='tunnel-gate.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['Edmundo, the man who lost']),
        dict(src='press.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['Nike denied it']),
        dict(src='boardroom-b.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.25), vo=L['Imagine if I stopped']),
        dict(card=dict(big='What did the inquiry find?', small='The answer is in the film', size=130), d=2.6)]),
]
# The two thumbnails (studio/docu/model.thumb): the hook off the record, measured at 168×94; A and B for Test & Compare.
THUMBS = [dict(file='thumbnail-a.jpg', src='signing.jpg', focus=(0.35, 0.55), zoom=1.15, side='right', lines=['NO', 'RONALDO', '7.48 PM'], hot=1, kicker='WORLD CUP FINAL · 1998', size=150, top=140),
          dict(file='thumbnail-b.jpg', src='hotel.jpg', focus=(0.45, 0.5), zoom=1.1, side='right', lines=['A FIT', 'BEFORE', 'THE FINAL'], hot=0, kicker='RONALDO · FRANCE 98', size=150, top=150)]

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
