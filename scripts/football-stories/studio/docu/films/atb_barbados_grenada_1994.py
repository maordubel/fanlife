"""Storyboard: AROUND THE BALL · 21 · THE OWN GOAL THAT WON — Barbados 4–2 Grenada, Shell Caribbean Cup qualifying,
National Stadium, Barbados, 27 January 1994. With its mirror: Thailand 3–2 Indonesia, Tiger Cup, Vietnam 1998.

Script: docs/fanlife/around-the-ball/atb21-barbados-grenada.script.md (its source slot is filled here, 16.11.2026).
Built on the model film (pao_aek_1994.py, docs/rules/model-film.md) and the editing language; the long form (about
ten minutes) is the sprint's (claude/youtube-sprint-plan-2026-11-10.md): a chapter turn about every 90 s, a question
planted in the cold open and paid off at the end.

Facts (two independent publishers each; the ledger with URLs is docs/fanlife/around-the-ball/atb21-barbados-grenada.FACTS.md):
  group of three (Barbados, Grenada, Puerto Rico); Barbados 0–1 Puerto Rico; Grenada beat Puerto Rico by a golden goal,
  recorded 2–0                                          Wikipedia (Barbados 4–2 Grenada) · These Football Times (24.7.2019)
  every match needed a winner; an extra-time golden goal counted as two     Wikipedia (both articles) · TFT · Infobae
  27 January 1994, National Stadium, Barbados          Wikipedia · Infobae (TFT: "late January", the stadium)
  Barbados needed to win by two; 2–0, Grenada 2–1 on 83'; Sealey's own goal on 87' after passing with keeper Horace
  Stoute; Grenada attacked both goals, Barbados defended both; Trevor Thorne's golden goal in extra time; 4–2
                                                        Wikipedia · TFT · Infobae
  table after: all three on three points; Barbados +1, Grenada 0, Puerto Rico -1     Wikipedia · Infobae
  James Clarkson, Grenada's coach: "I feel cheated"; the rule-maker for a madhouse; players did not know which goal to attack
                                                        Wikipedia (Gardiner 2005) · TFT · Infobae (in translation)
  no punishment for Barbados (no rule broken)           Wikipedia · TFT
  the double golden goal used five times in 1994 qualifying, then scrapped    Wikipedia · TFT
  Barbados at the finals in Trinidad and Tobago: two draws (Guadeloupe, Dominica), one defeat, out in the group
                                                        Wikipedia (1994 Caribbean Cup) · TFT
  golden goal introduced by FIFA in 1993, formerly "sudden death"; meant to make extra time attack   Wikipedia · TFT · FourFourTwo
  Bierhoff, Euro 96 final, Germany v Czech Republic at Wembley · Blanc v Paraguay, the first World Cup golden goal (1998)
  · Trezeguet, Euro 2000 final, France v Italy · scrapped after Euro 2004; it made play more cautious   Wikipedia · TFT · FourFourTwo
  Tiger Cup 1998 in Vietnam: Thailand v Indonesia, Ho Chi Minh City, last group match; the winner to meet hosts Vietnam
  in Hanoi, the loser Singapore; 2–2 after 90; Mursyid Effendi's deliberate own goal in injury time; 3–2; FIFA fined both
  $40,000 for violating the spirit of the game; Effendi banned from international football for life; Singapore beat
  Vietnam 1–0 in the final                              Wikipedia (1998 AFF Championship) · Indonesia Expat
NOT said (one publisher, or the publishers disagree): who scored Barbados's first two goals or Grenada's goal; who
thought of the own goal (Infobae names a technical director, TFT says the players); the minute of the golden goal;
Sealey standing beside Grenada's keeper; Grenada trying to score in their own net (one article); the Thai attackers
trying to stop Effendi; the date of the Tiger Cup match; the Euro 96 and Euro 2000 minutes; the scoreline of the 1994
final tournament's matches.
Pictures: the owner's pack (Drive "Barbados v Grenada 1994", 18 pieces in the house paper-cut style) and the common
library through the media index, inked. Faces are invented; no real person is drawn as himself.

    python3 -m studio.docu.films.atb_barbados_grenada_1994 storyboard.json            # the storyboard
    python3 -m studio.docu.films.atb_barbados_grenada_1994 --pack OWNER_DIR ASSETS    # the asset pack
"""
import json
import sys
from pathlib import Path

BLUE, RED, COAL, CREAM = '#1D3F8F', '#C8102E', '#15130F', '#F4ECD8'
# The owner's pack: file-name prefix in his folder → the name the storyboard uses.
PACK = {'Blank_rule_sheet': 'rulesheet.jpg', 'Cork_investigation_board': 'board.jpg', 'Documentary_graphic_asset_design': 'grid.jpg',
        'Documentary_graphic_asset_for_Fa': 'kickers.jpg', 'Documentary_graphic_asset_for_fo': 'stopwatch.jpg',
        'Football_documentary_graphic': 'map.jpg', 'Goalkeeper_diving': 'keeper.jpg', 'Investigation_table': 'table.jpg',
        'Investigative_desk': 'desk.jpg', 'Manila_case_folder': 'folder.jpg', 'Open_manila_folder': 'openfolder.jpg',
        'Referee_raising_arm': 'referee.jpg', 'Symmetrical_football_pitch': 'pitch.jpg', 'Tactical_board_pieces': 'pieces.jpg',
        'Vintage_television': 'tv.jpg', 'White_football_goal': 'goal.jpg', 'White_football_net': 'net.jpg', 'White_leather_football': 'ball.jpg'}
# The common library, asked of the media index: role → (subjects, moods, the piece that means it).
LIB = {'lib-clock': (['clock', 'stadium'], ['tension'], 'beat:common/last-minute-clock-n'),
       'lib-ownnet': (['ball', 'goal'], ['tension'], 'beat:common/ball-in-net-kr'),
       'lib-net-b': (['ball', 'goal'], ['tension'], 'beat:common/ball-in-net-b-kr'),
       'lib-goalmouth': (['goal', 'ball'], ['tension'], 'beat:common/header-goalmouth-kr'),
       'lib-bowl': (['stadium', 'night'], ['tension'], 'beat:common/stadium-night-bowl-n'),
       'lib-pile': (['crowd', 'goal'], ['joy'], 'beat:common/celebration-pile-kr'),
       'lib-despair': (['player'], ['grief'], 'beat:common/despair-kneeling-kr'),
       'lib-whistle': (['referee', 'clock'], ['tension'], 'beat:common/final-whistle-arms-kr'),
       'lib-boardroom': (['archive'], ['calm'], 'beat:common/boardroom-table-n'),
       'lib-news': (['archive', 'newspaper'], ['calm'], 'beat:common/newspaper-stand-n'),
       'lib-press': (['archive'], ['calm'], 'beat:common/press-conference-n'),
       'lib-hotel': (['city'], ['calm'], 'beat:common/hotel-window-city-kr'),
       'lib-airport': (['travel'], ['calm'], 'beat:common/airport-gate-kr'),
       'lib-rain': (['stadium', 'rain'], ['grief'], 'beat:common/rain-pitch-n'),
       'lib-dressing': (['dressing room'], ['grief'], 'beat:common/dressing-room-silence-kr'),
       'lib-shootout': (['penalty'], ['tension'], 'beat:common/shootout-line-kr'),
       'lib-corner': (['stadium', 'night', 'flag'], ['tension'], 'beat:common/corner-flag-night'),
       'lib-kickoff': (['pitch'], ['tension'], 'beat:common/kick-off-centre-kr'),
       'lib-dusk': (['stadium'], ['calm'], 'beat:common/terrace-empty-dusk-n'),
       'lib-header-b': (['goal', 'ball'], ['joy'], 'beat:common/header-goalmouth-b-kr'),
       'lib-pile-b': (['crowd', 'goal'], ['joy'], 'beat:common/celebration-pile-b-kr'),
       'lib-despair-b': (['player'], ['grief'], 'beat:common/despair-kneeling-b-kr'),
       'lib-tvshop': (['archive'], ['calm'], 'beat:common/tv-shop-window-kr'),
       'lib-photo': (['archive'], ['calm'], 'beat:common/old-photo-wall-kr'),
       'lib-freekick': (['ball', 'goal'], ['tension'], 'beat:common/free-kick-wall-kr'),
       'lib-flags': (['flag', 'stadium'], ['calm'], 'beat:common/flags-pole-kr'),
       'lib-scrap': (['archive', 'newspaper'], ['calm'], 'beat:common/scrapbook-desk-kr'),
       'lib-lightsoff': (['stadium', 'night'], ['grief'], 'beat:common/stadium-lights-off-n')}


def pack(owner: Path, out: Path) -> dict:
    """The film's asset folder from the owner's pictures and the library. → {name: where it came from}."""
    from PIL import Image
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
        if im.width < 1600:   # his pieces are 1024–1376 px: enlarged once, cleanly
            k = 1600 / im.width
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        im.save(out / name, quality=93)
        made[name] = f'owner:{src.name}'
    ix = M.build()
    pk = M.Picker(ix, club=None, era='1990s', film=SB['slug'], ledger=M.Ledger())
    for n, (role, (subj, moods, want)) in enumerate(LIB.items()):
        ranked = pk.ranked({'n': n, 'subjects': subj, 'said': subj, 'moods': moods, 'era': '1990s'})
        rec = next((r for _, r, _ in ranked if r['id'] == want), ranked[0][1] if ranked else None)
        if rec is None:
            raise SystemExit(f'the media index has nothing for {role}')
        pk.use(rec['id'], n)
        im = Image.open(rec['path']).convert('RGB')
        if rec.get('accent') == 'key-red':
            im = paper.recolor(im, BLUE)
        inked(im).save(out / f'{role}.jpg', quality=93)
        made[f'{role}.jpg'] = rec['id']
    logo = here.parents[5] / 'public' / 'brand' / 'fanlife' / 'logo-512.png'
    (out / 'fanlife.png').write_bytes(logo.read_bytes())
    (out / 'media-index-usage.json').write_text(json.dumps({'film': SB['slug'], 'uses': pk.close()}, indent=1))
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


def img(src, move='push', **k): return dict(kind='image', src=src, move=move, **k)
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
    B.append(dict(vo=None, shots=[dict(kind='ticket', small=small, big=big, line=line, window=window)], hold=2.0,
                  meta=dict(type='chapter', chapter=CH[0]), sound=[('page', 0.0, 1.0, 0.5)]))


G = dict(id='bg', small='BARBADOS · GRENADA')   # the held corner board of the match chapters
T = dict(id='ti', small='THAILAND · INDONESIA')
QUESTION = 'WHY WAS ONLY ONE|A CRIME?'

beat(None, dict(kind='ident', line='A FAN LIFE FILM'), type='open', hold=1.8, sound=[('sting', 0.1, 1.7, 0.5)])

# ── COLD OPEN ── the objects of the story, the stake in sentence one, the question before 0:15, no result
beat("The eighty-seventh minute of an international match.", img('stopwatch.jpg', 'push', veil=0.05, focus='42% 46%'),
     type='open', emotion='tension', intensity=0.7, pre=0.2, pad=0.1, meta=dict(plain=True), sound=[('tick', 0.0, 2.4, 0.5)])
beat("A defender passes the ball back to his own goalkeeper.", img('keeper.jpg', 'push', veil=0.05, focus='60% 55%'),
     type='open', emotion='tension', intensity=0.7, pad=0.1, meta=dict(plain=True))
beat("Then he turns, and shoots. Into his own net.", img('net.jpg', 'slam', veil=0.0), stamp('OWN GOAL', 'them', x=640, y=420, dt=1.6, size=150, rot=-4),
     type='open', emotion='tension', intensity=0.9, pad=0.1, meta=dict(plain=True), sound=[('impact', 1.6, 1.4, 0.7)])
beat("On purpose.", word('ON PURPOSE', bg='ink', size=260), type='open', emotion='tension', intensity=1.0, pad=0.3, meta=dict(plain=True),
     sound=[('stamp', 0.0, 1.0, 0.7)])
beat("Four years later, another defender did the same thing. He was banned from international football for life.",
     img('folder.jpg', 'push', veil=0.1), stamp('BANNED FOR LIFE', 'them', x=520, y=470, dt=3.4, size=120, rot=4, plate=True),
     type='open', emotion='dread', intensity=0.8, pad=0.15, meta=dict(plain=True), sound=[('stamp', 3.4, 1.0, 0.8)])
beat("So why was one own goal a crime, and the other one genius?", img('ball.jpg', 'push', veil=0.35),
     word(QUESTION, bg='ink', size=150, small='TWO OWN GOALS · ONE LIFE BAN', at=1.4),
     type='turning', emotion='tension', intensity=0.9, pad=0.6, meta=dict(plain=True), sound=[('riser', 0.2, 1.4, 0.5), ('impact', 1.4, 1.6, 0.7)])
beat(None, word('THE OWN GOAL', bg='ink', size=230, d=1.2), word('THE OWN GOAL|THAT WON', bg='us', size=170, small='BARBADOS v GRENADA · 1994', at=1.2),
     type='trailer', hold=3.2, sound=[('impact', 0.0, 1.4, 0.7), ('impact2', 1.2, 2.2, 0.9)])

# ── CHAPTER ONE · THE GOLDEN GOAL ── where the rule came from; the turn: in the Caribbean it was worth two
chapter('CHAPTER ONE', 'THE GOLDEN GOAL', 'FIFA · 1993', 'tv.jpg')
beat("Start with a rule. In nineteen ninety-three, FIFA gave extra time a new ending.",
     img('rulesheet.jpg', 'push', veil=0.05), flap('2026', '1993', at=1.6, d=2.8, small='FIFA · EXTRA TIME'),
     type='illustration', emotion='wonder', intensity=0.5, pad=0.3, sound=[('page', 0.0, 1.0, 0.4)])
beat("The first goal scored in extra time would end the match, there and then.",
     img('lib-kickoff.jpg', 'push', veil=0.1), stamp('FIRST GOAL WINS', 'us', x=520, y=460, dt=2.6, size=120, rot=-3, plate=True),
     type='illustration', emotion='tension', intensity=0.6, pad=0.3, sound=[('stamp', 2.6, 1.0, 0.6)])
beat("The idea had an old name. Sudden death. FIFA gave it a better one.",
     word('SUDDEN DEATH', bg='ink', size=210, d=3.4), word('THE GOLDEN GOAL', bg='us', size=200, at=3.4),
     type='trailer', emotion='wonder', intensity=0.6, pad=0.4, sound=[('swish', 3.4, 1.0, 0.6)])
beat("It was meant to make teams attack in extra time, instead of waiting for penalties.",
     img('lib-shootout.jpg', 'pull', veil=0.1), type='illustration', emotion='tension', intensity=0.5, pad=0.3)
beat("The first golden goal on record came in March nineteen ninety-three, at the World Youth Championship in Australia.",
     img('lib-header-b.jpg', 'push', veil=0.15), stamp('THE FIRST · MARCH 1993', 'us', x=300, y=200, dt=2.4, size=96, rot=-3, plate=True),
     type='record', emotion='wonder', intensity=0.5, pad=0.3, sound=[('stamp', 2.4, 1.0, 0.6)])
beat("And for a few years, it made legends.", img('tv.jpg', 'push', veil=0.05, focus='42% 50%'), type='illustration', emotion='wonder', intensity=0.6, pad=0.3)
beat("At Wembley, in the final of Euro ninety-six, Oliver Bierhoff won it for Germany against the Czech Republic.",
     img('tv.jpg', 'push', veil=0.3, focus='42% 50%'), word('EURO 96 · FINAL|BIERHOFF', bg='ink', size=150, small='GERMANY v CZECH REPUBLIC · WEMBLEY', at=2.2),
     type='record', emotion='joy', intensity=0.6, pad=0.3)
beat("At the World Cup in France, Laurent Blanc scored the first golden goal the tournament had ever seen, against Paraguay.",
     word('WORLD CUP 1998|BLANC', bg='us', size=150, small='FRANCE v PARAGUAY · THE FIRST WORLD CUP GOLDEN GOAL'),
     type='record', emotion='joy', intensity=0.6, pad=0.3)
beat("In the final of Euro two thousand, France were losing to Italy deep into stoppage time. Sylvain Wiltord equalised. Then, in extra time, David Trezeguet won it.",
     img('lib-pile.jpg', 'pull', veil=0.1), stamp('EURO 2000 · TREZEGUET', 'us', x=360, y=200, dt=1.8, size=96, rot=-3, plate=True),
     type='record', emotion='joy', intensity=0.7, pad=0.4, sound=[('stamp', 1.8, 1.0, 0.6), ('claps', 2.0, 3.0, 0.3)])
beat("And at the World Cup of two thousand and two, Ahn Jung-hwan's golden goal for South Korea sent Italy home.",
     word('WORLD CUP 2002|AHN JUNG-HWAN', bg='ink', size=140, small='SOUTH KOREA v ITALY · GOLDEN GOAL'),
     type='record', emotion='joy', intensity=0.6, pad=0.3)
beat("But before any of that, in the Caribbean, one tournament took the idea a step further.",
     img('map.jpg', 'push', veil=0.05, focus='30% 45%'), type='turning', emotion='wonder', intensity=0.6, pad=0.3)
beat("Every match had to have a winner. And a golden goal would not count as one goal.",
     img('rulesheet.jpg', 'pull', veil=0.1), type='illustration', emotion='tension', intensity=0.7, pad=0.2)
beat("It would count as two.",
     dict(kind='explain', form='bars', title='ONE GOLDEN GOAL', bars=[dict(label='ON THE PITCH', share=0.5, value=1), dict(label='IN THE TABLE', share=1.0, value=2, hot=True)], d=3.2),
     word('1 GOAL = 2', bg='us', size=280, small='THE CARIBBEAN CUP RULE · 1994', at=3.2),
     type='turning', emotion='tension', intensity=0.9, pad=0.8, meta=dict(turn=True), sound=[('impact', 3.2, 1.6, 0.7)])

# ── CHAPTER TWO · THE MATHS ── the group of three and what Barbados needed
chapter('CHAPTER TWO', 'THE MATHS', 'CARIBBEAN CUP QUALIFYING · JANUARY 1994', 'map.jpg')
beat("The Shell Caribbean Cup. Qualifying, January nineteen ninety-four.",
     img('map.jpg', 'push', veil=0.05, focus='30% 40%'), flap('1993', '1994', at=0.6, d=2.6, small='JANUARY'),
     type='map', emotion='wonder', intensity=0.5, pad=0.3, sound=[('whoosh', 0.0, 1.2, 0.4)])
beat("A group of three. Barbados, Grenada and Puerto Rico. Only the winner goes to the finals.",
     dict(kind='table', rows=[['BARBADOS', 0], ['GRENADA', 0], ['PUERTO RICO', 0]], highlight=0, cut=False, zoom=1.6, d=4.0),
     word('ONE PLACE', bg='ink', size=230, small='THREE TEAMS · ONE WINNER', at=4.0),
     type='record', emotion='tension', intensity=0.5, pad=0.4)
beat("Barbados play first, at home. They lose. One nil to Puerto Rico.",
     img('lib-despair.jpg', 'push', veil=0.1), stamp('BARBADOS 0 – 1 PUERTO RICO', 'them', x=170, y=180, dt=2.6, size=84, rot=-2, plate=True),
     type='illustration', emotion='grief', intensity=0.6, pad=0.3, sound=[('groan', 1.4, 2.0, 0.4), ('stamp', 2.6, 1.0, 0.6)])
beat("Then Grenada play Puerto Rico. It goes to extra time. Grenada score a golden goal.",
     img('lib-goalmouth.jpg', 'push', veil=0.05), type='illustration', emotion='tension', intensity=0.7, pad=0.3, sound=[('goal', 4.0, 4.0, 0.4)])
beat("One goal on the pitch. In the record books, two nil.",
     word('2 – 0', bg='them', size=330, small='GRENADA v PUERTO RICO · AFTER A GOLDEN GOAL'),
     type='stat', emotion='tension', intensity=0.8, pad=0.4, sound=[('impact', 0.0, 1.6, 0.7)])
beat("So before the last match, Grenada have three points, and a goal difference of plus two. Puerto Rico have three points. Barbados have none.",
     dict(kind='table', rows=[['GRENADA', 3], ['PUERTO RICO', 3], ['BARBADOS', 0]], highlight=2, mark=0, cut=False, zoom=1.6, d=5.4),
     word('BARBADOS|0 POINTS', bg='ink', size=170, small='BOTTOM · ONE MATCH LEFT', at=5.4),
     type='record', emotion='dread', intensity=0.7, pad=0.4)
beat("The last match. Barbados against Grenada, at the National Stadium in Barbados. The twenty-seventh of January.",
     img('lib-bowl.jpg', 'push', veil=0.1), stamp('27 JANUARY 1994', 'us', x=200, y=200, dt=4.0, size=96, rot=-2, plate=True),
     type='matchday', emotion='tension', intensity=0.6, pad=0.3, meta=dict(subjects=['stadium']), sound=[('build', 0.0, 7.0, 0.3), ('stamp', 4.0, 1.0, 0.6)])
beat("And the maths is brutal. Barbados cannot just win.", img('board.jpg', 'push', veil=0.05, focus='50% 45%'),
     type='illustration', emotion='tension', intensity=0.7, pad=0.2)
beat("Win by one, two one say, and all three teams finish on three points. Then Grenada's goal difference is plus one. Barbados's is zero. Grenada go through.",
     dict(kind='ledger', title='WHAT BARBADOS NEED', us='BARBADOS', them='GRENADA', compact=True, rows=[['WIN BY ONE · 2–1', 'GD 0 · OUT', 'GD +1 · THROUGH']], row_at=[0.6], d=7.0),
     type='record', emotion='dread', intensity=0.7, pad=0.2)
beat("Barbados need to win by two goals. Nothing less.",
     dict(kind='stat', value='+2', label='THE ONLY RESULT THAT WORKS FOR BARBADOS', dt=0.6),
     type='turning', emotion='tension', intensity=0.9, pad=0.8, meta=dict(turn=True), sound=[('impact', 0.6, 1.6, 0.7)])

# ── CHAPTER THREE · THE 87TH MINUTE ── the mini-drama: the lead, the blow, the clock, the held breath, the release
chapter('CHAPTER THREE', 'THE 87TH MINUTE', 'NATIONAL STADIUM · BARBADOS', 'stopwatch.jpg')
beat("For most of the night, it goes to plan. Barbados score. And score again.",
     img('kickers.jpg', 'push', veil=0.05, focus='30% 50%'), type='goal', emotion='joy', intensity=0.8, pad=0.3,
     meta=dict(board=dict(G, score='2–0', flip_at=3.6), plain=True), sound=[('goal', 3.6, 4.0, 0.5)])
beat("Two nil. Exactly what they need.", img('lib-pile.jpg', 'push', veil=0.0), type='illustration', emotion='joy', intensity=0.8, pad=0.4,
     meta=dict(board=dict(G, score='2–0')), sound=[('claps', 0.0, 3.0, 0.4)])
beat("Eighty-three minutes gone. Grenada score.", img('lib-net-b.jpg', 'slam', veil=0.0), clock(83),
     type='goal', emotion='dread', intensity=1.0, pad=0.4, meta=dict(board=dict(G, score='2–1', flip_at=2.0), plain=True), sound=[('groan', 2.0, 2.4, 0.6)])
beat("Two one. Barbados are winning the match, and going out of the tournament.",
     img('lib-despair.jpg', 'pull', veil=0.1), type='turning', emotion='dread', intensity=0.9, pad=0.5, meta=dict(board=dict(G, score='2–1'), turn=True))
beat("Seven minutes left. They need one more goal.", img('lib-clock.jpg', 'push', veil=0.1), clock(84),
     type='illustration', emotion='tension', intensity=0.9, pad=0.25, meta=dict(board=dict(G, score='2–1')), sound=[('tick', 0.0, 2.6, 0.5)])
beat("It does not come.", img('lib-corner.jpg', 'push', veil=0.1), clock(85),
     type='illustration', emotion='tension', intensity=0.9, pad=0.3, meta=dict(board=dict(G, score='2–1'), plain=True), sound=[('tick', 0.0, 2.0, 0.6)])
beat("Every minute that passes takes Grenada closer to the finals.", img('stopwatch.jpg', 'push', veil=0.1, focus='42% 46%'), clock(86),
     type='illustration', emotion='dread', intensity=0.9, pad=0.3, meta=dict(board=dict(G, score='2–1')))
beat("And then Barbados see a way out. It is hidden inside the rule.", img('openfolder.jpg', 'push', veil=0.05),
     type='turning', emotion='wonder', intensity=0.9, pad=0.3, meta=dict(board=dict(G, score='2–1')))
beat("If the match ends level, it goes to extra time. And in extra time, one goal counts as two.",
     dict(kind='explain', form='timeline', title='THE WAY OUT', left="83'", right='EXTRA TIME', marks=[dict(at=0.4, label='LEVEL AT 90')],
          ticks=[dict(at=0.9, label='GOLDEN GOAL = 2', value=2, hot=True)]),
     type='illustration', emotion='tension', intensity=0.9, pad=0.3, meta=dict(board=dict(G, score='2–1')))
beat("A two-goal win, from a single goal.", word('ONE GOAL.|A TWO-GOAL WIN.', bg='us', size=170),
     type='stat', emotion='tension', intensity=0.9, pad=0.4, meta=dict(board=dict(G, score='2–1')), sound=[('impact', 0.0, 1.4, 0.6)])
beat("But first, the match has to be level. And there is one goal that Grenada are not defending.",
     img('goal.jpg', 'push', veil=0.0), type='illustration', emotion='tension', intensity=1.0, pad=0.6, meta=dict(board=dict(G, score='2–1')))
beat("Barbados's own.", img('goal.jpg', 'push', veil=0.0, focus='50% 45%'), type='illustration', emotion='tension', intensity=1.0, pad=0.9,
     meta=dict(board=dict(G, score='2–1'), breath=True), sound=[('hush', 0.0, 2.6, 0.5)])
beat("Eighty-seven minutes. Terry Sealey, a defender, plays the ball with his goalkeeper, Horace Stoute.",
     img('keeper.jpg', 'push', veil=0.0, focus='60% 55%'), clock(87),
     stamp('SEALEY', 'us', x=160, y=170, dt=2.4, size=92, rot=-3, plate=True), stamp('STOUTE', 'us', x=160, y=360, dt=5.0, size=92, rot=2, plate=True),
     type='illustration', emotion='tension', intensity=1.0, pad=0.3, meta=dict(board=dict(G, score='2–1')), sound=[('kick', 3.0, 0.6, 0.5), ('kick', 4.4, 0.6, 0.5)])
beat("Back and forth. Back and forth.", img('lib-freekick.jpg', 'push', veil=0.05), type='illustration', emotion='tension', intensity=1.0, pad=0.9,
     meta=dict(board=dict(G, score='2–1'), breath=True), sound=[('kick', 0.2, 0.6, 0.5), ('kick', 1.3, 0.6, 0.5)])
beat("And Sealey puts the ball into his own net.", img('lib-ownnet.jpg', 'slam', veil=0.0),
     type='goal', emotion='release', intensity=1.0, pad=0.3, meta=dict(board=dict(G, score='2–2', flip_at=2.2), plain=True),
     sound=[('impact2', 2.2, 2.0, 0.9)])
beat(None, word("OWN GOAL|SEALEY 87'", bg='us', size=200, small='BARBADOS 2 – 2 GRENADA · ON PURPOSE'), type='goal', emotion='release', intensity=1.0, hold=2.4,
     meta=dict(board=dict(G, score='2–2')), sound=[('stamp', 0.2, 1.0, 0.8)])
beat("Two, two. On purpose. Now Grenada have to work out what just happened.",
     img('lib-scrap.jpg', 'pull', veil=0.1), type='turning', emotion='wonder', intensity=0.9, pad=0.8, meta=dict(board=dict(G, score='2–2'), turn=True))

# ── CHAPTER FOUR · BOTH ENDS ── the strangest three minutes: attack both goals, defend both goals; then the golden goal
chapter('CHAPTER FOUR', 'BOTH ENDS', 'THE LAST THREE MINUTES', 'pieces.jpg')
beat("Grenada work it out fast. And then they work out something even stranger.",
     img('grid.jpg', 'push', veil=0.05), type='illustration', emotion='wonder', intensity=0.8, pad=0.3, meta=dict(board=dict(G, score='2–2')))
beat("A goal at the Barbados end, and Grenada win the match. A goal in their own net, and Barbados win by only one.",
     dict(kind='ledger', title='ANY GOAL BEFORE 90', us='GRENADA', them='BARBADOS', compact=True,
          rows=[['AT THE BARBADOS END', 'THROUGH', 'OUT'], ['IN GRENADA’S OWN NET', 'THROUGH', 'OUT']], row_at=[0.4, 3.6], d=6.6),
     type='record', emotion='tension', intensity=0.9, pad=0.3, meta=dict(board=dict(G, score='2–2')))
beat("Either way, Grenada go through.", word('ANY GOAL.|EITHER END.', bg='them', size=180, small='GRENADA THROUGH'),
     type='stat', emotion='tension', intensity=0.9, pad=0.4, meta=dict(board=dict(G, score='2–2')), sound=[('impact', 0.0, 1.4, 0.6)])
beat("So Grenada attack both goals.", img('pieces.jpg', 'panr', veil=0.0), stamp('ATTACK BOTH GOALS', 'them', x=420, y=140, dt=0.8, size=110, rot=-3, plate=True),
     type='illustration', emotion='tension', intensity=1.0, pad=0.3, meta=dict(board=dict(G, score='2–2')), sound=[('stamp', 0.8, 1.0, 0.7)])
beat("And Barbados defend both goals.", img('pieces.jpg', 'panl', veil=0.0), stamp('DEFEND BOTH GOALS', 'us', x=420, y=820, dt=0.8, size=110, rot=3, plate=True),
     type='illustration', emotion='defiance', intensity=1.0, pad=0.4, meta=dict(board=dict(G, score='2–2')), sound=[('stamp', 0.8, 1.0, 0.7)])
beat("For the last three minutes, it is the strangest football ever played. One team hunting a goal at either end. The other guarding both nets.",
     img('kickers.jpg', 'push', veil=0.05, focus='60% 50%'), clock(88), type='illustration', emotion='tension', intensity=1.0, pad=0.3,
     meta=dict(board=dict(G, score='2–2')), sound=[('build', 0.0, 8.0, 0.4)])
beat("Eighty-nine.", img('lib-clock.jpg', 'push', veil=0.1), clock(89), type='illustration', emotion='tension', intensity=1.0, pad=0.3,
     meta=dict(board=dict(G, score='2–2'), plain=True), sound=[('tick', 0.0, 1.6, 0.6)])
beat("Ninety.", img('referee.jpg', 'push', veil=0.0), clock(90), type='illustration', emotion='tension', intensity=1.0, pad=0.6,
     meta=dict(board=dict(G, score='2–2'), breath=True, plain=True), sound=[('whistle', 0.6, 1.4, 0.7)])
beat("Barbados hold on. Two, two. Extra time. Thirty minutes more.", img('lib-whistle.jpg', 'pull', veil=0.0), type='illustration', emotion='release', intensity=0.9, pad=0.4,
     meta=dict(board=dict(G, score='2–2')), sound=[('swell', 0.4, 3.0, 0.5)])
beat("And now the golden goal is worth two. One goal for Barbados, and they are through.",
     img('ball.jpg', 'push', veil=0.05), type='illustration', emotion='tension', intensity=1.0, pad=0.8, meta=dict(board=dict(G, score='2–2'), breath=True),
     sound=[('hush', 0.6, 2.6, 0.5)])
beat("Trevor Thorne.", img('lib-goalmouth.jpg', 'slam', veil=0.0), type='goal', emotion='release', intensity=1.0, pad=0.3,
     meta=dict(board=dict(G, score='4–2', flip_at=0.9), plain=True), sound=[('impact', 0.0, 1.6, 0.8), ('goal', 0.9, 6.0, 0.7)])
beat(None, word('GOLDEN GOAL|THORNE', bg='us', size=210, small='COUNTS AS TWO · BARBADOS 4 – 2 GRENADA'), type='goal', emotion='release', intensity=1.0, hold=2.4,
     meta=dict(board=dict(G, score='4–2')), sound=[('impact2', 0.0, 2.0, 0.9)])
beat("Four, two. A win by two goals.",
     dict(kind='score', us='BARBADOS', them='GRENADA', us_goals=4, them_goals=2, cap='AFTER EXTRA TIME · NATIONAL STADIUM · 27 JANUARY 1994', bg='pitch.jpg'),
     type='score', emotion='joy', intensity=0.9, pad=0.4, meta=dict(outcome='win', plain=True, claims=['result']), sound=[('final', 0.3, 5.0, 0.5)])
beat("All three teams finish on three points. Barbados go through, by one goal of difference.",
     dict(kind='table', rows=[['BARBADOS', 3], ['GRENADA', 3], ['PUERTO RICO', 3]], highlight=0, cut=False, zoom=1.6, d=4.4),
     word('THROUGH|BY ONE GOAL', bg='us', size=180, small='GOAL DIFFERENCE · BARBADOS +1 · GRENADA 0 · PUERTO RICO −1', at=4.4),
     type='record', emotion='joy', intensity=0.8, pad=0.4)
beat("But one man in the stadium did not think it was clever at all.", img('lib-dusk.jpg', 'push', veil=0.1),
     type='turning', emotion='dread', intensity=0.8, pad=0.8, meta=dict(turn=True))

# ── CHAPTER FIVE · THE MADHOUSE ── the coach, the verdict, the rule's end, Barbados at the finals
chapter('CHAPTER FIVE', 'THE MADHOUSE', 'AFTER THE MATCH', 'desk.jpg')
beat("Grenada's coach was James Clarkson. After the match, he said exactly how he felt.",
     img('lib-press.jpg', 'push', veil=0.35), word('JAMES CLARKSON', bg='ink', size=170, small="GRENADA'S COACH", at=2.6),
     type='illustration', emotion='grief', intensity=0.6, pad=0.3)
beat("I feel cheated.", dict(kind='quote', text='“I feel cheated.”', who='JAMES CLARKSON · GRENADA'), type='quote', emotion='grief', intensity=0.8, pad=0.6)
beat("He said the man who wrote these rules belonged in a madhouse. His players, he said, had not even known which goal to attack.",
     img('board.jpg', 'pull', veil=0.1), stamp('A MADHOUSE', 'them', x=260, y=420, dt=2.6, size=130, rot=-4, plate=True),
     type='illustration', emotion='grief', intensity=0.7, pad=0.4, sound=[('stamp', 2.6, 1.0, 0.7)])
beat("The rule had turned football inside out. Scoring against yourself had become the smartest move on the pitch.",
     img('net.jpg', 'pull', veil=0.1), type='illustration', emotion='wonder', intensity=0.7, pad=0.4)
beat("And Barbados had broken no rule. Nobody punished them.", img('openfolder.jpg', 'push', veil=0.05),
     stamp('NO RULE BROKEN', 'us', x=520, y=450, dt=1.8, size=120, rot=-3, plate=True),
     type='illustration', emotion='pride', intensity=0.6, pad=0.4, sound=[('stamp', 1.8, 1.0, 0.7)])
beat("The double golden goal was used five times in that year's qualifying. Then the organisers scrapped it.",
     dict(kind='stat', value='5', label='TIMES USED · 1994 QUALIFYING · THEN SCRAPPED', dt=0.4), img('lib-scrap.jpg', 'pull', veil=0.2, dt=4.6),
     stamp('SCRAPPED', 'them', x=640, y=480, dt=5.6, size=150, rot=5),
     type='record', emotion='wonder', intensity=0.6, pad=0.4, sound=[('stamp', 5.6, 1.0, 0.7)])
beat("Barbados went on to the finals, in Trinidad and Tobago. A draw with Guadeloupe. A draw with Dominica. A defeat by the hosts.",
     dict(kind='form', title='THE FINALS · TRINIDAD AND TOBAGO', sub='BARBADOS · GROUP STAGE', results=list('DDL'), per_row=3, step=0.9, big=True),
     type='stat', emotion='grief', intensity=0.6, pad=0.4)
beat("Out in the group. The trick had won them one match. Not the tournament.", img('lib-dressing.jpg', 'push', veil=0.1),
     type='illustration', emotion='grief', intensity=0.6, pad=0.5)
beat("Four years later, on the other side of the world, the same trick came back. Turned inside out.",
     img('lib-airport.jpg', 'push', veil=0.1), flap('1994', '1998', at=2.8, d=2.6, small='SOUTH-EAST ASIA'),
     type='turning', emotion='dread', intensity=0.8, pad=0.8, meta=dict(turn=True), sound=[('whoosh', 2.6, 1.2, 0.4)])

# ── CHAPTER SIX · THE OTHER OWN GOAL ── the mirror: a team scoring against itself to lose
chapter('CHAPTER SIX', 'THE OTHER OWN GOAL', 'TIGER CUP · VIETNAM · 1998', 'folder.jpg')
beat("Vietnam, nineteen ninety-eight. The Tiger Cup, the championship of South-East Asia.",
     img('lib-hotel.jpg', 'push', veil=0.05), type='map', emotion='wonder', intensity=0.5, pad=0.3)
beat("In Ho Chi Minh City, Thailand play Indonesia in the last match of their group.",
     img('lib-bowl.jpg', 'pull', veil=0.1), word('THAILAND v INDONESIA', bg='ink', size=150, small='TIGER CUP · HO CHI MINH CITY · LAST GROUP MATCH', at=2.4),
     type='versus', emotion='tension', intensity=0.6, pad=0.3)
beat("The winner would meet the hosts, Vietnam, in the semi-final. And have to move to Hanoi to play it.",
     dict(kind='ledger', title='THE SEMI-FINAL DRAW', us='WIN', them='LOSE', compact=True, rows=[['OPPONENT', 'VIETNAM', 'SINGAPORE'], ['WHERE', 'HANOI', '—']], row_at=[0.4, 3.4], d=6.0),
     type='record', emotion='tension', intensity=0.7, pad=0.3)
beat("The loser would meet Singapore. On paper, the easier draw.", img('lib-airport.jpg', 'pull', veil=0.2),
     type='illustration', emotion='wonder', intensity=0.6, pad=0.3)
beat("So this time, neither team wanted to win.", word('NOBODY|WANTS TO WIN', bg='them', size=190),
     type='stat', emotion='tension', intensity=0.9, pad=0.5, sound=[('impact', 0.0, 1.4, 0.6)])
beat("Ninety minutes. Two, two.", img('lib-rain.jpg', 'push', veil=0.1), clock(90),
     type='illustration', emotion='tension', intensity=0.9, pad=0.4, meta=dict(board=dict(T, score='2–2'), plain=True), sound=[('tick', 0.0, 2.0, 0.5)])
beat("In injury time, the Indonesian defender Mursyid Effendi turns, and kicks the ball into his own net.",
     img('lib-net-b.jpg', 'slam', veil=0.0), stamp('EFFENDI', 'them', x=180, y=180, dt=3.0, size=110, rot=-3, plate=True),
     type='goal', emotion='dread', intensity=1.0, pad=0.4, meta=dict(board=dict(T, score='3–2', flip_at=5.0), plain=True), sound=[('stamp', 3.0, 1.0, 0.6), ('groan', 5.0, 2.4, 0.5)])
beat("Thailand three, Indonesia two. A win Thailand never wanted.", img('lib-despair-b.jpg', 'push', veil=0.1),
     type='illustration', emotion='grief', intensity=0.8, pad=0.4, meta=dict(board=dict(T, score='3–2')))
beat("FIFA fined both teams forty thousand dollars, for violating the spirit of the game.",
     dict(kind='stat', value='$40,000', label='FIFA FINE · EACH TEAM · THE SPIRIT OF THE GAME', dt=0.6), img('lib-boardroom.jpg', 'push', veil=0.2, dt=4.0),
     type='record', emotion='dread', intensity=0.8, pad=0.3)
beat("And Mursyid Effendi was banned from international football for life.",
     img('folder.jpg', 'push', veil=0.05), stamp('BANNED FOR LIFE', 'them', x=520, y=470, dt=2.6, size=130, rot=4, plate=True),
     type='illustration', emotion='grief', intensity=0.9, pad=0.6, sound=[('stamp', 2.6, 1.0, 0.9)])
beat("It did not even work. Indonesia lost their semi-final to Singapore. Thailand lost theirs to Vietnam.",
     dict(kind='ledger', title='THE SEMI-FINALS', us='RESULT', them='BEATEN BY', compact=True, rows=[['INDONESIA', 'LOST', 'SINGAPORE'], ['THAILAND', 'LOST', 'VIETNAM']], row_at=[2.4, 4.6], d=6.4),
     type='record', emotion='grief', intensity=0.6, pad=0.3)
beat("And Singapore won the final, one nil, against Vietnam.", img('lib-pile-b.jpg', 'pull', veil=0.2),
     stamp('SINGAPORE 1 – 0 VIETNAM', 'us', x=200, y=200, dt=1.6, size=92, rot=-2, plate=True),
     type='record', emotion='wonder', intensity=0.5, pad=0.6, sound=[('stamp', 1.6, 1.0, 0.6)])

# ── CLOSE · the bookend answered, the last pages, the hand-over ──
beat(None, word(QUESTION, bg='ink', size=150, small='THE OPENING QUESTION', d=2.4),
     word('BARBADOS|SCORED TO WIN', bg='us', size=150, small='1994 · NO RULE BROKEN', at=2.4, d=2.6),
     word('EFFENDI|SCORED TO LOSE', bg='them', size=150, small='1998 · BANNED FOR LIFE', at=5.0),
     type='trailer', hold=7.8, sound=[('impact', 0.0, 1.6, 0.6), ('impact2', 2.4, 2.0, 0.9)])
beat("Because of what each own goal was for. Barbados scored against themselves to win a match. Mursyid Effendi scored against his own team to lose one.",
     img('lib-photo.jpg', 'pull', veil=0.1), type='illustration', emotion='wonder', intensity=0.8, pad=0.4)
beat("Barbados broke no rule. Indonesia and Thailand, FIFA said, broke the spirit of the game.",
     img('referee.jpg', 'pull', veil=0.05), type='illustration', emotion='pride', intensity=0.7, pad=0.6)
beat("One last page. The golden goal itself did not last. Before Euro two thousand and four, football's law-makers announced it would go after the tournament.",
     img('lib-tvshop.jpg', 'pull', veil=0.2), flap('1998', '2004', at=5.0, d=2.6, small='THE END OF THE GOLDEN GOAL'),
     type='turning', emotion='wonder', intensity=0.6, pad=0.4, sound=[('page', 0.0, 1.0, 0.5)])
beat("UEFA had already tried a gentler version, the silver goal. At Euro two thousand and four it sent Greece through to the final, with a Traianos Dellas header against the Czech Republic.",
     img('lib-header-b.jpg', 'pull', veil=0.2), stamp('SILVER GOAL · DELLAS', 'us', x=300, y=200, dt=5.2, size=96, rot=-3, plate=True),
     type='record', emotion='wonder', intensity=0.6, pad=0.3, sound=[('stamp', 5.2, 1.0, 0.6)])
beat("Both were gone after that summer. The golden goal had been meant to make teams braver. It made them more careful.", img('lib-shootout.jpg', 'push', veil=0.2),
     type='illustration', emotion='grief', intensity=0.5, pad=0.7)
beat("Next on Around the Ball: Paris, nineteen ninety-eight, and the night of the World Cup final nobody could explain. If you love the strange side of this game, subscribe, and it will find you.",
     img('lib-flags.jpg', 'push', veil=0.4), dict(kind='follow', club='Around the Ball', press_at=8.6, dt=1.2),
     type='follow', pad=1.0, sound=[('claps', 8.6, 2.0, 0.4)])
beat(None, img('lib-lightsoff.jpg', 'push', veil=0.55), dict(kind='end', title='The Own Goal That Won', line='NEXT · RONALDO, PARIS 1998 · @FanLifeFootballStories'), type='end', hold=5.0)

# A card leaves after its reading time (docu/editor MAX_CARD, WORD_HOLD): each long card beat gets the picture that carries the rest.
UNDER = {'At the World Cup in France': 'lib-kickoff.jpg', 'And at the World Cup of two thousand': 'lib-corner.jpg', 'A group of three': 'grid.jpg',
         'One goal on the pitch': 'lib-whistle.jpg', 'So before the last match': 'lib-photo.jpg', 'Win by one, two one say': 'table.jpg',
         'Barbados need to win by two': 'table.jpg', 'If the match ends level': 'lib-dusk.jpg', 'A goal at the Barbados end': 'desk.jpg',
         'All three teams finish': 'desk.jpg', 'Barbados went on to the finals': 'lib-dressing.jpg', 'The winner would meet': 'lib-hotel.jpg',
         'It did not even work': 'lib-news.jpg'}
for _b in B:
    for _k, _src in UNDER.items():
        if _b['vo'] and _b['vo'].startswith(_k):
            _b['shots'].insert(0, img(_src, 'push', veil=0.25))
assert sum(1 for _b in B for _k in UNDER if _b['vo'] and _b['vo'].startswith(_k)) == len(UNDER)

_CH = lambda big: next(i for i, b in enumerate(B) if b['shots'] and b['shots'][0].get('big') == big)
_C3, _C4, _C5, _C6 = _CH('THE 87TH MINUTE'), _CH('BOTH ENDS'), _CH('THE MADHOUSE'), _CH('THE OTHER OWN GOAL')
_OWN = next(i for i, b in enumerate(B) if b['vo'] and b['vo'].startswith('And Sealey puts'))
M = 'dubelteam/'
SB = dict(slug='atb-barbados-grenada-1994', title='The Own Goal That Won', minutes=[8.5, 13], palette=dict(us=BLUE, them=RED), edit=True, mark=True,
          shape='ball',
          pronounce={'Grenada': 'ɡrəˈneɪdə', "Grenada's": 'ɡrəˈneɪdəz', 'Barbados': 'bɑːˈbeɪdɒs', "Barbados's": 'bɑːˈbeɪdɒsɪz',
                     'Terry Sealey': 'ˈtɛri ˈsiːli', 'Sealey': 'ˈsiːli', 'Horace Stoute': 'ˈhɒrəs ˈstaʊt', 'Stoute': 'ˈstaʊt',
                     'Trevor Thorne': 'ˈtrɛvə ˈθɔːn', 'Clarkson': 'ˈklɑːksən', 'Mursyid Effendi': 'ˈmʊrʃɪd ɛˈfɛndi', 'Effendi': 'ɛˈfɛndi',
                     'Oliver Bierhoff': 'ˈɒlɪvə ˈbɪəhɒf', 'Laurent Blanc': 'ˈlɒrɒ̃ ˈblɒ̃', 'David Trezeguet': 'daˈviːd ˌtrɛzəˈɡeɪ',
                     'Guadeloupe': 'ˌɡwɑːdəˈluːp', 'Ahn Jung-hwan': 'ˈæn ˈdʒʊŋ ˈhwɑːn', 'Sylvain Wiltord': 'ˈsɪlvæ̃ ˈwɪltɔː', 'Traianos Dellas': 'traˈjanɒs ˈðɛlas', 'Dominica': 'ˌdɒmɪˈniːkə', 'Ho Chi Minh City': 'ˌhəʊ tʃiː ˈmɪn ˈsɪti', 'Hanoi': 'hæˈnɔɪ'},
          us=dict(), them=dict(), agg_label='', karaoke=True, sub_limit=44, bed=0.16,
          # a rule explained; dread at the bottom of the table; the iron watch over the 87th minute; glory on the golden goal;
          # stillness for the coach and the mirror; the close
          music=[dict(file=M + 'before-the-collapse.mp3', from_beat=1, to_beat=_C3 - 1, vol=0.12),
                 dict(file=M + 'under-the-iron-watch.mp3', from_beat=_C3, to_beat=_OWN - 1, vol=0.12),
                 dict(file=M + 'ninety-minutes-of-glory.mp3', from_beat=_OWN, to_beat=_C5 - 1, vol=0.11),
                 dict(file=M + 'the-weight-of-stillness.mp3', from_beat=_C5, to_beat=_C6 - 1, vol=0.12),
                 dict(file=M + 'a-seat-by-the-exit.mp3', from_beat=_C6, vol=0.12)],
          credits=['Music: Before the Collapse · Under the Iron Watch · Ninety Minutes of Glory · The Weight of Stillness · A Seat by the Exit — DubelTeam'],
          beats=B)

# ── THE VERTICAL CUTS (studio/docu/vertical.py) ── three Shorts (≤ 30 s, an open loop, the answer only in the film)
L = {k: next(b['vo'] for b in B if b['vo'] and b['vo'].startswith(k)) for k in (
    'The eighty-seventh minute', 'A defender passes', 'Then he turns', 'On purpose.', 'Two one. Barbados', 'And then Barbados see',
    'A goal at the Barbados end', 'So Grenada attack', 'And Barbados defend', 'Four years later, another', 'So this time',
    'In injury time', 'And Mursyid Effendi was', 'Barbados need to win by two', 'Eighty-three minutes gone')}
END = dict(big='Watch the full film', small='The Own Goal That Won · on YouTube')
VERTICAL = [
    dict(name='short-1-on-purpose', kind='short', hook='He scored in his own net. On purpose.', kicker='Barbados v Grenada · 1994', music=M + 'under-the-iron-watch.mp3', end=END, scenes=[
        dict(src='stopwatch.jpg', focus=(0.42, 0.46), zoom=(1.1, 1.3), vo=L['The eighty-seventh minute']),
        dict(src='keeper.jpg', focus=(0.6, 0.55), zoom=(1.0, 1.2), vo=L['A defender passes']),
        dict(src='net.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.25), vo=L['Then he turns']),
        dict(src='net.jpg', focus=(0.5, 0.5), zoom=(1.25, 1.4), vo=L['On purpose.']),
        dict(card=dict(big='Why would anyone do that?', small='It won them the match', size=130), d=2.4)]),
    dict(name='short-2-both-goals', kind='short', hook='One team attacked BOTH goals.', kicker='Barbados v Grenada · 1994', music=M + 'ninety-minutes-of-glory.mp3', end=END, scenes=[
        dict(src='board.jpg', focus=(0.5, 0.45), zoom=(1.0, 1.2), vo=L['Barbados need to win by two']),
        dict(src='grid.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.15), vo=L['A goal at the Barbados end']),
        dict(src='pieces.jpg', focus=(0.3, 0.45), zoom=(1.05, 1.2), vo=L['So Grenada attack']),
        dict(src='pieces.jpg', focus=(0.72, 0.45), zoom=(1.2, 1.05), vo=L['And Barbados defend']),
        dict(card=dict(big='Who got through?', small='Three minutes left · 2–2', size=150), d=2.4)]),
    dict(name='short-3-banned-for-life', kind='short', hook='Banned for life for one own goal', kicker='Tiger Cup · Vietnam 1998', music=M + 'a-seat-by-the-exit.mp3', end=END, scenes=[
        dict(src='lib-bowl.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['So this time']),
        dict(src='lib-net-b.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.3), vo=L['In injury time']),
        dict(src='folder.jpg', focus=(0.38, 0.5), zoom=(1.0, 1.2), vo=L['And Mursyid Effendi was']),
        dict(card=dict(big='Four years earlier, the same move was legal.', small='Why? The answer is in the film', size=110), d=2.8)]),
]
# The two thumbnails (studio/docu/model.thumb): the hook off the record, measured at 168×94; A and B for Test & Compare.
THUMBS = [dict(file='thumbnail-a.jpg', src='net.jpg', focus=(0.5, 0.45), zoom=1.15, side='left', lines=['OWN GOAL', 'ON', 'PURPOSE'], hot=2, kicker='BARBADOS v GRENADA · 1994', size=128, top=150),
          dict(file='thumbnail-b.jpg', src='pieces.jpg', focus=(0.5, 0.5), zoom=1.2, side='right', lines=['DEFEND', 'BOTH', 'GOALS'], hot=1, kicker='THE STRANGEST 3 MINUTES', size=150, top=170)]

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
