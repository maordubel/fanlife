"""Storyboard: THE TEAM THAT SCORED TWELVE — AEK Athens v Derby County, UEFA Cup second round, October–November 1976.

Hand-made after the owner's verdict on the pipeline's AEK–Derby film (15.11.2026: "a slideshow ... the results are
revealed in advance"). Built on the model film (pao_aek_1994.py, docs/rules/model-film.md) with every device of the
editing language (docs/rules/editing-language.md): a year flip board, one held corner scoreboard per match chapter that
turns on each goal, AEK's eagle as the film's one shape (window, wipe, frame), cut-outs that enter as what they are,
two narrator turn cards 45 s apart, and no result on screen before 60 % of the film.

Facts (two independent publishers each; the ledger is the package's FACTS.md):
  Derby 12–0 Finn Harps, 15.9.1976, Hector five            Wikipedia (1976–77 UEFA Cup; Derby County F.C. records) · RSSSF
  Derby 8–2 Tottenham, 16.10.1976                           Wikipedia (1976–77 Derby County season) · 11v11
  Derby champions 1974–75                                    Wikipedia · premierleague/EFL history
  1st leg AEK 2–0 Derby, Athens, 20.10.1976, 0–0 at half-time, Wagner 65' 69', 32,000      RSSSF · aek365 / Wikipedia
  2nd leg Derby 2–3 AEK, Baseball Ground, 3.11.1976, 28,000; George, Rioch; Nikoloudis, Konstantinou, Wagner   RSSSF · Wikipedia
  Mackay sacked 25.11.1976                                   Wikipedia · BBC
  Red Star (away goals), QPR (0–3, 3–0, 7–6 on penalties), semi-final v Juventus   Wikipedia · RSSSF
  Fadrhonc coach; Stergioudas, Mavros; Wagner a West German forward; Konstantinou Cypriot   Wikipedia · aek365
NOT said: "the first Greek club to win in England", the order of the second-leg goals (so its board turns once, on the
reveal), the fog of that night (the fog picture is mood, never a claim), any reception at the airport.
Pictures: the film's own Google Flow pack (15.11.2026, 20 paper-cut stills made for this story; see FLOW) and the
common cut-out library repainted in AEK yellow (Derby in cream). Faces are invented; no real person is drawn.

    python3 -m studio.docu.films.aek_derby_1976 storyboard.json            # the storyboard
    python3 -m studio.docu.films.aek_derby_1976 --pack FLOW_DIR ASSETS     # the asset pack the storyboard names
"""
import json
import shutil
import sys
from pathlib import Path

YELLOW, CREAM, COAL = '#F2C230', '#F4ECD8', '#15130F'
# The Flow pack: the id prefix Flow gave each still → the name the storyboard uses. `crop` cuts one half of a two-panel still.
FLOW = {'225b6e3e': 'lineup.jpg', '047cb84c': 'lineup-b.jpg', '3c7e40fb': 'athens.jpg', 'e814dbc5': 'net.jpg',
        '857365d1': 'plane.jpg', 'e79069b1': 'plane-b.jpg', 'e25b1b3b': 'volley.jpg', '7464da84': 'volley-b.jpg',
        '2147b69b': 'freekick.jpg', 'b107fce1': 'celebrate.jpg', '67c9dedd': 'fog.jpg', '0fa310fc': 'fog-b.jpg',
        '8d23c050': 'keeper.jpg', '1adac75f': 'keeper-b.jpg', 'ff3a81d4': 'coat.jpg'}
PRINTS = {'supporters-print.png': ('f0a057ac', (0.0, 0.0, 0.44, 1.0)), 'radio-print.png': ('539a7298', (0.5, 0.0, 1.0, 1.0)),
          'welcome-print.png': ('ea761954', (0.0, 0.0, 0.52, 1.0)), 'shirt-print.png': ('0ca6caf5', (0.52, 0.0, 1.0, 1.0))}
CUTS = {'cut-striker.png': ('fig-striker-shoot-kr', YELLOW), 'cut-celebrate.png': ('fig-celebrate-arms-kr', YELLOW),
        'cut-scarves.png': ('crowd-row-scarves-up-kr', YELLOW), 'cut-flags.png': ('crowd-row-flags-b-kr', YELLOW),
        'cut-still.png': ('crowd-row-still-kr', CREAM), 'cut-ticket.png': ('close-ticket-in-hand-c-kr', YELLOW),
        'cut-keeper.png': ('fig-keeper-dive-n', None), 'cut-knee.png': ('fig-celebrate-knee-slide-kr', YELLOW)}


def pack(flow: Path, out: Path) -> dict:
    from PIL import Image, ImageOps
    here = Path(__file__).resolve()
    sys.path.insert(0, str(here.parents[3]))
    from studio import paper
    out.mkdir(parents=True, exist_ok=True)
    made = {}
    files = {p.stem[:8]: p for p in flow.glob('*.webp')}
    for pre, name in FLOW.items():
        im = Image.open(files[pre]).convert('RGB')
        im = im.resize((1920, round(1920 * im.height / im.width)), Image.LANCZOS)
        im.save(out / name, quality=93)
        made[name] = f'flow:{pre}'
    for name, (pre, box) in PRINTS.items():
        im = Image.open(files[pre]).convert('RGB')
        w, h = im.size
        im = im.crop((round(box[0] * w), round(box[1] * h), round(box[2] * w), round(box[3] * h)))
        im = im.resize((round(im.width * 1.4), round(im.height * 1.4)), Image.LANCZOS)
        ImageOps.expand(im, border=(30, 30, 30, 100), fill=CREAM).save(out / name)
        made[name] = f'flow:{pre} (half)'
    lib = here.parents[2] / 'kit' / 'cutouts' / 'common'
    for name, (src, col) in CUTS.items():
        im = Image.open(lib / f'{src}.webp').convert('RGBA')
        if col:
            a = im.getchannel('A')
            im = paper.recolor(im.convert('RGB'), col).convert('RGBA')
            im.putalpha(a)
        im.save(out / name)
        made[name] = f'cutouts/common/{src}'
    shutil.copy(here.parents[5] / 'public' / 'crests' / 'aek-athens.png', out / 'crest-aek.png')
    made['crest-aek.png'] = 'public/crests/aek-athens.png'
    (out / 'fanlife.png').write_bytes((here.parents[5] / 'public' / 'brand' / 'fanlife' / 'logo-512.png').read_bytes())
    (out / 'PACK.json').write_text(json.dumps(made, indent=1))
    return made


def img(src, move='push', **k): return dict(kind='image', src=src, move=move, **k)
def word(text, **k): return dict(kind='word', text=text, **k)
def stamp(text, side='us', x=300, y=560, dt=1.0, size=150, **k): return dict(kind='stamp', text=text, side=side, x=x, y=y, dt=dt, size=size, **k)
def clock(minute, dt=0.4, **k): return dict(kind='clockdev', minute=minute, dt=dt, **k)
def cut(src, enter, x=1180, h=760, y=260, way=1, **k): return dict(kind='cutout', src=src, enter=enter, x=x, h=h, y=y, way=way, **k)
def flap(frm, to, at=0.3, d=3.0, small=''): return dict(kind='flap', frm=frm, to=to, at=at, d=d, small=small, z=14)


B = []
CH = [-1]


def beat(vo=None, *shots, type='illustration', emotion=None, intensity=None, **k):
    meta = dict(type=type, chapter=max(0, CH[0]), emotion=emotion, intensity=intensity, **(k.pop('meta', {})))
    B.append(dict(vo=vo, shots=list(shots), meta=meta, **k))


def chapter(small, big, line, window):
    CH[0] += 1
    B.append(dict(vo=None, shots=[dict(kind='ticket', small=small, big=big, line=line, window=window)], hold=2.0,
                  meta=dict(type='chapter', chapter=CH[0]), sound=[('page', 0.0, 1.0, 0.5)]))


L1 = dict(id='leg1', small='AEK · DERBY')
L2 = dict(id='leg2', small='DERBY · AEK')

beat(None, dict(kind='ident', line='A FAN LIFE FILM'), type='open', hold=1.8, sound=[('sting', 0.1, 1.7, 0.5)])

# ── COLD OPEN ── four objects of the story in twelve seconds, then its question in type; no result
beat("Twelve goals in one night.", img('fog.jpg', 'push', veil=0.15), stamp('12', 'us', x=760, y=330, dt=0.5, size=260, rot=-4),
     type='open', emotion='tension', intensity=0.8, pre=0.2, pad=0.15, meta=dict(plain=True), sound=[('stamp', 0.5, 1.0, 0.7)])
beat("Eight more, four days before Athens.", img('fog-b.jpg', 'push', veil=0.2), stamp('+8', 'us', x=760, y=330, dt=0.4, size=240, rot=5),
     type='open', emotion='tension', intensity=0.8, pad=0.15, meta=dict(plain=True), sound=[('stamp', 0.4, 1.0, 0.7)])
beat("Champions of England, the season before last.", img('lineup-b.jpg', 'push', veil=0.2),
     cut('cut-still.png', 'slide', x=40, h=520, y=560, way=-1),
     type='open', emotion='dread', intensity=0.7, pad=0.15, meta=dict(plain=True))
beat("And the UEFA Cup sends them to Athens.", img('athens.jpg', 'push', veil=0.05), flap('2026', '1976', at=0.2, d=2.6, small='UEFA CUP · OCTOBER'),
     type='open', emotion='tension', intensity=0.8, pad=0.2, meta=dict(plain=True), sound=[('whoosh', 0.0, 1.2, 0.4)])
beat("So who stops a team that scores twelve?", img('net.jpg', 'push', veil=0.3),
     word('WHO STOPS A TEAM|THAT SCORES TWELVE?', bg='ink', size=124, small='UEFA CUP · SECOND ROUND · 1976', at=0.6),
     type='turning', emotion='tension', intensity=0.9, pad=0.8, meta=dict(plain=True), sound=[('riser', 0.0, 1.6, 0.5), ('impact', 0.6, 1.6, 0.7)])
beat(None, word('TWELVE', bg='ink', size=300, d=1.1), word('THE TEAM THAT|SCORED TWELVE', bg='us', fg=COAL, size=150, small='AEK v DERBY COUNTY · 1976', at=1.1),
     type='trailer', hold=3.2, sound=[('impact', 0.0, 1.4, 0.7), ('impact2', 1.1, 2.0, 0.9)])

# ── CHAPTER ONE · THE MACHINE ──
chapter('CHAPTER ONE', 'THE MACHINE', 'DERBY COUNTY · AUTUMN 1976', 'fog.jpg')
beat("Derby County. Champions of England in nineteen seventy-five. Their manager, Dave Mackay.",
     img('fog.jpg', 'pull', veil=0.1, d=3.6), word('DAVE|MACKAY', bg='ink', size=200, small='DERBY COUNTY · THE MANAGER', at=3.6),
     type='illustration', emotion='dread', intensity=0.6, pad=0.4)
beat("In September they open their European season against Finn Harps, from Ireland. They win twelve nil.",
     img('lineup-b.jpg', 'push', veil=0.35), dict(kind='stat', value='12–0', label='DERBY v FINN HARPS · 15 SEPTEMBER 1976', dt=4.6),
     type='stat', emotion='dread', intensity=0.7, pad=0.5, sound=[('impact', 4.6, 1.4, 0.6)])
beat("Kevin Hector scores five of them on his own.",
     word('HECTOR|×5', bg='paper', size=230, small='FIVE GOALS · ONE NIGHT', at=0.2),
     type='stat', emotion='dread', intensity=0.7, pad=0.4)
beat("A month later they beat Tottenham eight two. That is the team AEK have drawn.",
     img('fog-b.jpg', 'push', veil=0.25), dict(kind='stat', value='8–2', label='DERBY v TOTTENHAM · 16 OCTOBER 1976', dt=2.0),
     cut('cut-still.png', 'rise', x=1100, h=560, y=520),
     type='stat', emotion='dread', intensity=0.8, pad=0.5, sound=[('impact', 2.0, 1.4, 0.6)])
beat("Four days after the eight, Derby land in Athens.",
     img('plane.jpg', 'push', veil=0.05), type='illustration', emotion='tension', intensity=0.6, pad=0.4,
     meta=dict(subjects=['travel']), sound=[('whoosh', 0.0, 1.4, 0.4)])

# ── CHAPTER TWO · ATHENS ── (the first match: one board in the corner, turning on each goal)
chapter('CHAPTER TWO', 'NIKOS GOUMAS', 'ATHENS · 20 OCTOBER 1976', 'athens.jpg')
beat("Wednesday, the twentieth of October. Nea Filadelfeia. Thirty-two thousand in yellow and black.",
     img('athens.jpg', 'panr', veil=0.0), cut('cut-scarves.png', 'rise', x=0, h=520, y=600), type='matchday', emotion='defiance', intensity=0.7, pad=0.4,
     meta=dict(board=dict(L1, score='0–0'), subjects=['crowd', 'flag']), sound=[('chant', 0.0, 7.0, 0.35)])
beat("On the bench, František Fadrhonc. In goal, Lakis Stergioudas. Up front, Thomas Mavros.",
     word('FADRHONC', bg='ink', size=170, small='AEK · THE COACH', d=2.7), word('STERGIOUDAS', bg='us', fg=COAL, size=150, small='IN GOAL', at=2.7, d=5.2),
     word('MAVROS', bg='ink', size=200, small='UP FRONT', at=5.2),
     type='illustration', emotion='defiance', intensity=0.6, pad=0.3, meta=dict(board=dict(L1, score='0–0')))
beat("And beside him, a forward from West Germany. Walter Wagner.",
     img('volley-b.jpg', 'push', veil=0.2, focus='60% 40%'), stamp('WALTER WAGNER', 'us', x=160, y=200, dt=2.4, size=100, rot=-3, plate=True),
     type='illustration', emotion='pride', intensity=0.6, pad=0.4, meta=dict(board=dict(L1, score='0–0'), plain=True), sound=[('stamp', 2.4, 1.0, 0.6)])
beat("Forty-five minutes. Nothing.",
     img('lineup.jpg', 'push', veil=0.1), clock(45), type='illustration', emotion='tension', intensity=0.8, pad=0.5,
     meta=dict(board=dict(L1, score='0–0'), breath=True), sound=[('whistle', 1.4, 1.2, 0.4)])
beat("Sixty-five minutes. Wagner.",
     img('volley.jpg', 'slam', veil=0.0, focus='50% 40%'), cut('cut-striker.png', 'walk', x=1150, h=820, y=220), clock(65),
     type='goal', emotion='release', intensity=1.0, pad=0.4, meta=dict(board=dict(L1, score='1–0', flip_at=1.2), plain=True),
     sound=[('impact', 0.0, 1.4, 0.8), ('goal', 1.2, 5.0, 0.7)])
beat("Four minutes later. Wagner again.",
     img('net.jpg', 'slam', veil=0.0), clock(69), type='goal', emotion='release', intensity=1.0, pad=0.4,
     meta=dict(board=dict(L1, score='2–0', flip_at=1.4), plain=True), sound=[('impact2', 0.0, 1.6, 0.9), ('goal', 1.4, 5.0, 0.7)])
beat("Two nil. The team that scored twelve has not scored at all.",
     img('celebrate.jpg', 'push', veil=0.0), cut('cut-celebrate.png', 'rise', x=1240, h=760, y=300),
     type='illustration', emotion='joy', intensity=0.9, pad=0.6, meta=dict(board=dict(L1, score='2–0')), sound=[('claps', 0.0, 4.0, 0.4)])
beat("But Derby score twelve at home. And the second leg is in Derby.",
     img('fog.jpg', 'pull', veil=0.2), type='turning', emotion='dread', intensity=0.8, pad=0.8, meta=dict(turn=True))

# ── CHAPTER THREE · THE BASEBALL GROUND ── (the mini-drama: a want, a clock, the held breath; the result after 60 %)
chapter('CHAPTER THREE', 'THE BASEBALL GROUND', 'DERBY · 3 NOVEMBER 1976', 'plane-b.jpg')
beat("Two weeks later, AEK travel to England.",
     img('plane-b.jpg', 'push', veil=0.05), cut('cut-ticket.png', 'drop', x=1250, h=600, y=380), type='illustration', emotion='tension', intensity=0.6, pad=0.3)
beat("The Baseball Ground. Twenty-eight thousand. Derby need three goals just to stay alive.",
     img('fog-b.jpg', 'push', veil=0.1), cut('cut-still.png', 'rise', x=0, h=540, y=580),
     dict(kind='stat', value='3', label='GOALS DERBY NEED', dt=4.4),
     type='illustration', emotion='dread', intensity=0.8, pad=0.4, meta=dict(board=dict(L2, score='0–0')), sound=[('build', 0.0, 7.0, 0.35)])
beat("A team that scores twelve. Ninety minutes. One goal at a time.",
     img('keeper-b.jpg', 'push', veil=0.15), cut('supporters-print.png', 'drop', x=1160, h=600, y=280), clock(30),
     type='illustration', emotion='tension', intensity=0.9, pad=0.3, meta=dict(board=dict(L2, score='0–0')), sound=[('tick', 0.0, 2.4, 0.5)])
beat("Derby score twice. Charlie George and Bruce Rioch.",
     img('keeper.jpg', 'slam', veil=0.05), cut('cut-keeper.png', 'slide', x=60, h=620, y=380, way=-1),
     type='illustration', emotion='dread', intensity=0.9, pad=0.4, meta=dict(board=dict(L2, score='0–0')), sound=[('groan', 0.6, 2.0, 0.5)])
beat("Three names change the night.",
     img('freekick.jpg', 'push', veil=0.0), type='turning', emotion='defiance', intensity=1.0, pad=0.5,
     meta=dict(board=dict(L2, score='0–0'), breath=True), sound=[('hush', 0.0, 2.6, 0.5)])
beat("Takis Nikoloudis. Tasos Konstantinou, from Cyprus. And Walter Wagner, one more time.",
     img('celebrate.jpg', 'pull', veil=0.0), cut('cut-knee.png', 'slide', x=1100, h=640, y=420),
     stamp('NIKOLOUDIS', 'us', x=120, y=170, dt=0.4, size=84, rot=-3), stamp('KONSTANTINOU', 'us', x=120, y=320, dt=1.9, size=84, rot=2),
     stamp('WAGNER', 'us', x=120, y=470, dt=4.3, size=84, rot=-2),
     type='goal', emotion='release', intensity=1.0, pad=0.5, meta=dict(board=dict(L2, score='2–3', flip_at=5.0), plain=True),
     sound=[('stamp', 0.4, 1.0, 0.6), ('stamp', 1.9, 1.0, 0.6), ('stamp', 4.3, 1.0, 0.6), ('goal', 5.0, 6.0, 0.7)])
beat("Derby two. AEK three. In Derby.",
     dict(kind='score', us='AEK', them='DERBY', us_goals=3, them_goals=2, us_crest='crest-aek.png', cap='BASEBALL GROUND · 3 NOVEMBER 1976 · FULL TIME', bg='athens.jpg'),
     type='score', emotion='joy', intensity=0.95, pad=0.5, meta=dict(outcome='win', plain=True, claims=['result']), sound=[('final', 0.3, 5.0, 0.5)])
beat("Over two matches, five two. AEK are through.",
     dict(kind='ledger', title='UEFA CUP · SECOND ROUND', us='AEK', them='DERBY', compact=True, rows=[['ATHENS · 20 OCT', 2, 0], ['DERBY · 3 NOV', 3, 2]], row_at=[0.3, 1.1], d=3.0),
     word('5 – 2', bg='us', fg=COAL, size=320, small='AEK · THROUGH TO THE THIRD ROUND', at=3.0),
     type='record', emotion='joy', intensity=0.9, pad=0.5)

# ── CHAPTER FOUR · WHAT IT STARTED ──
chapter('CHAPTER FOUR', 'WHAT IT STARTED', 'WINTER 1976 · SPRING 1977', 'radio-print.png')
beat("But the story does not end in Derby.",
     img('lineup.jpg', 'pull', veil=0.3), cut('radio-print.png', 'drop', x=1120, h=640, y=260),
     type='turning', emotion='wonder', intensity=0.7, pad=0.4, meta=dict(turn=True))
beat("Three weeks later, on the twenty-fifth of November, Derby sacked Dave Mackay.",
     img('fog.jpg', 'push', veil=0.5), stamp('25 NOVEMBER 1976', 'them', x=520, y=300, dt=2.2, size=96, rot=-3, plate=True),
     word('MACKAY|SACKED', bg='ink', size=190, small='DERBY COUNTY', at=4.4),
     type='illustration', emotion='grief', intensity=0.6, pad=0.4, sound=[('stamp', 2.2, 1.0, 0.6)])
beat("AEK went on. Past Red Star Belgrade, on away goals.",
     img('athens.jpg', 'push', veil=0.2), stamp('RED STAR · AWAY GOALS', 'us', x=200, y=640, dt=1.6, size=86, rot=-3, plate=True),
     type='illustration', emotion='pride', intensity=0.7, pad=0.3, sound=[('stamp', 1.6, 1.0, 0.6)])
beat("Against Queens Park Rangers they lost the first leg three nil. They won the second three nil. Then seven six, on penalties.",
     dict(kind='ledger', title='QUARTER-FINAL · QPR', us='AEK', them='QPR', compact=True, rows=[['LONDON', 0, 3], ['ATHENS', 3, 0], ['PENALTIES', 7, 6]], row_at=[0.4, 2.6, 5.0], d=6.8),
     img('keeper-b.jpg', 'pull', veil=0.1, dt=6.8),
     type='record', emotion='joy', intensity=0.9, pad=0.4)
beat("The semi-finals of the UEFA Cup. Against Juventus.",
     img('lineup-b.jpg', 'push', veil=0.2), cut('cut-flags.png', 'rise', x=0, h=520, y=600),
     dict(kind='question', small='SPRING 1977', text='THE SEMI-FINAL|[JUVENTUS]', dt=1.6),
     type='illustration', emotion='wonder', intensity=0.8, pad=0.6)
beat("And it began with the team that scored twelve.",
     img('volley.jpg', 'pull', veil=0.0), type='illustration', emotion='pride', intensity=0.8, pad=0.6)

# ── CLOSE ── the question answered, the hand-over
beat(None, word('WHO STOPS A TEAM|THAT SCORES TWELVE?', bg='ink', size=124, small='THE OPENING QUESTION', d=2.2),
     word('AEK.|TWICE.', bg='us', fg=COAL, size=260, small='ATHENS 2–0 · DERBY 2–3', at=2.2), type='trailer', hold=5.0,
     sound=[('impact', 0.0, 1.6, 0.6), ('impact2', 2.2, 2.0, 0.9)])
beat("Their semi-final against Juventus is a story for another night. Subscribe, and it will find you.",
     img('athens.jpg', 'pull', veil=0.45), cut('shirt-print.png', 'drop', x=1180, h=620, y=240),
     dict(kind='follow', club='AEK Athens', press_at=4.8, dt=1.0), type='follow', pad=1.0, sound=[('claps', 4.8, 2.0, 0.4)])
beat(None, img('celebrate.jpg', 'push', veil=0.55), dict(kind='end', title='The Team That Scored Twelve', line='MUSIC · DUBELTEAM · @FanLifeFootballStories'), type='end', hold=4.4)

_ATH = next(i for i, b in enumerate(B) if b['shots'][0].get('big') == 'NIKOS GOUMAS')
_GOAL1 = next(i for i, b in enumerate(B) if b['vo'] and b['vo'].startswith('Sixty-five'))
_BBG = next(i for i, b in enumerate(B) if b['shots'][0].get('big') == 'THE BASEBALL GROUND')
_ANS = next(i for i, b in enumerate(B) if b['vo'] and b['vo'].startswith('Takis'))
_CH4 = next(i for i, b in enumerate(B) if b['shots'][0].get('big') == 'WHAT IT STARTED')
M = 'dubelteam/'
SB = dict(slug='aek-derby-1976', title='The Team That Scored Twelve', minutes=[2.8, 3.6], palette=dict(us=YELLOW, them=CREAM), edit=True, mark=True,
          shape='eagle', club='aek-athens',
          pronounce={'Fadrhonc': 'ˈfadrɦonts', 'František Fadrhonc': 'ˈfrancɪʃɛk ˈfadrɦonts', 'Stergioudas': 'sterʝuˈðas', 'Lakis': 'ˈlakis',
                     'Mavros': 'ˈmavros', 'Nikoloudis': 'nikoˈluðis', 'Konstantinou': 'konstandiˈnu', 'Takis': 'ˈtakis', 'Tasos': 'ˈtasos',
                     'Nea Filadelfeia': 'ˈnea filaˈðelfia', 'Rioch': 'ˈriːɒx'},
          us=dict(), them=dict(), agg_label='', karaoke=True, sub_limit=44, bed=0.16,
          # dread under the machine; the stand of thousands for Athens; the iron watch over Derby; glory on the answer; stillness to close
          music=[dict(file=M + 'before-the-collapse.mp3', from_beat=1, to_beat=_ATH - 1, vol=0.13),
                 dict(file=M + 'a-stand-of-thousands.mp3', from_beat=_ATH, to_beat=_BBG - 1, vol=0.11),
                 dict(file=M + 'under-the-iron-watch.mp3', from_beat=_BBG, to_beat=_ANS - 1, vol=0.13),
                 dict(file=M + 'ninety-minutes-of-glory.mp3', from_beat=_ANS, to_beat=_CH4 - 1, vol=0.12),
                 dict(file=M + 'after-the-final-whistle.mp3', from_beat=_CH4, vol=0.12)],
          credits=['Music: Before the Collapse · A Stand of Thousands · Under the Iron Watch · Ninety Minutes of Glory · After the Final Whistle — DubelTeam'],
          beats=B)

L = {k: next(b['vo'] for b in B if b['vo'] and b['vo'].startswith(k)) for k in (
    'Twelve goals', 'Eight more', 'Champions of England', 'And the UEFA Cup', 'So who stops', 'In September', 'A month later',
    'Sixty-five', 'Four minutes later', 'But Derby score', 'The Baseball Ground', 'Three names', 'Takis')}
END = dict(big='Watch the full film', small='The Team That Scored Twelve · on YouTube')
VERTICAL = [
    dict(name='short-1-twelve', kind='short', hook='12 goals in one night. Then Athens.', kicker='AEK v Derby County · 1976', music=M + 'a-stand-of-thousands.mp3', end=END, scenes=[
        dict(src='fog.jpg', focus=(0.5, 0.5), zoom=(1.1, 1.35), vo=L['Twelve goals']),
        dict(src='fog-b.jpg', focus=(0.45, 0.5), zoom=(1.0, 1.25), vo=L['Eight more']),
        dict(src='athens.jpg', focus=(0.5, 0.45), zoom=(1.0, 1.2), vo=L['And the UEFA Cup']),
        dict(card=dict(big='Who stops a team that scores twelve?', small='The answer is in the film', size=110), d=2.4)]),
    dict(name='short-2-wagner', kind='short', hook='Four minutes. Two goals. One West German.', kicker='Athens · 20 October 1976', music=M + 'the-tapans-final-surge.mp3', end=END, scenes=[
        dict(src='athens.jpg', focus=(0.3, 0.6), focus_to=(0.7, 0.55), zoom=(1.1, 1.1), vo=L['Sixty-five']),
        dict(src='volley.jpg', focus=(0.5, 0.4), zoom=(1.0, 1.3), vo=L['Four minutes later']),
        dict(src='fog.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['But Derby score']),
        dict(card=dict(big='Could two goals be enough?', small='The second leg · Derby', size=140), d=2.4)]),
    dict(name='reel-1-the-answer', kind='reel', hook='They needed three. AEK kept answering.', kicker='Baseball Ground · 3 Nov 1976', music=M + 'ninety-minutes-of-glory.mp3',
         end=dict(big='The full story', small='The Team That Scored Twelve · FanLife: Football Stories on YouTube'), scenes=[
        dict(src='fog-b.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['The Baseball Ground']),
        dict(src='freekick.jpg', focus=(0.4, 0.55), zoom=(1.0, 1.25), vo=L['Three names']),
        dict(src='celebrate.jpg', focus=(0.5, 0.4), zoom=(1.0, 1.2), vo=L['Takis']),
        dict(card=dict(big='Derby 2 – 3 AEK', small='5–2 on aggregate', bg='us', size=170), d=2.0)]),
]
THUMBS = [dict(file='thumbnail-a.jpg', src='volley.jpg', focus=(0.5, 0.4), zoom=1.3, side='left', lines=['THEY SCORED', '12', 'THEN AEK'], hot=1, kicker='AEK v DERBY · UEFA CUP 1976', size=140, top=150),
          dict(file='thumbnail-b.jpg', src='athens.jpg', focus=(0.5, 0.5), zoom=1.3, side='right', lines=['WHO STOPS', 'TWELVE?'], hot=1, kicker='AEK · 1976', size=150, top=190)]

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
