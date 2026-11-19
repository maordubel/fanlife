"""Storyboard: AROUND THE BALL · 20 · PAUL THE OCTOPUS — the Sea Life Oberhausen octopus who picked the winner of
Germany's six matches at Euro 2008 (wrong twice, the final included) and of all eight of his matches at the 2010 World
Cup: Germany's seven and the final, Spain over the Netherlands.

Script: docs/fanlife/around-the-ball/atb20-paul-octopus.script.md (its source slot is filled here, 19.11.2026).
Built on the six-minute film (atb_six_minutes_2004.py) and the model film (docs/rules/model-film.md); the long form is
the sprint's (claude/youtube-sprint-plan-2026-11-10.md): the partial answer (eight of eight) inside 0:15, a chapter turn
about every 90 s, one question planted in the cold open ("Psychic, lucky, or something else?") and paid off at the end.

Facts (two independent publishers each; the ledger with URLs is docs/fanlife/around-the-ball/atb20-paul-octopus.FACTS.md).
NOT said (one publisher, or disputed): the exact hatch day; songs against him in a stadium; Elena Espinosa; Madrid Zoo's
bid; the statue and No. 8 shirt; the replica trophy; the bookmakers' payouts; bond markets; the Dutch reactions; the
England 2018 pick; a named stripes scientist; the body-double rumour. Disputes told as versions or kept general: the
Euro 2008 record (four of six in most reports — said as "he got the final wrong"); O Carballiño's honour ("honoured by
the town"); his age at death ("about two and a half").
Pictures: the common library (studio/kit/beats/common), inked to the house paper, and the film's own drawn octopus and
boxes (studio/kit/beats/paul-octopus-2010, drawn for this film in the house inks: flags as three bands, no yellow).
No real person is drawn as himself.

    python3 -m studio.docu.films.atb_paul_octopus_2010 storyboard.json            # the storyboard (+ cuts.json, thumbs.json)
    python3 -m studio.docu.films.atb_paul_octopus_2010 --pack ASSETS              # the asset pack
"""
import json
import sys
from pathlib import Path

BLUE, RED, COAL, CREAM = '#1D3F8F', '#C8102E', '#15130F', '#F4ECD8'
# The common library: the name the storyboard uses → the piece in studio/kit/beats/common.
LIB = {'bowl': 'stadium-night-bowl-n', 'stadium': 'europe-stadium-night-n', 'tv': 'tv-shop-window-kr', 'tv-b': 'tv-shop-window-b-kr',
       'crowd': 'crowd-scarves-night-kr', 'home-end': 'home-end-night-kr', 'despair': 'despair-kneeling-kr', 'despair-b': 'despair-kneeling-b-kr',
       'pile': 'celebration-pile-kr', 'trophy': 'trophy-lift-crowd-kr', 'news': 'newspaper-stand-n', 'news-b': 'newspaper-stand-b-n',
       'press': 'press-conference-n', 'press-b': 'press-conference-b-n', 'boardroom': 'boardroom-table-n', 'signing': 'signing-desk-kr',
       'flags': 'flags-pole-kr', 'fingers': 'close-fingers-crossed-kr', 'prayer': 'close-hands-clasp-prayer-kr', 'scrap': 'scrapbook-desk-kr',
       'archive': 'archive-trophy-spotlight', 'rooftops': 'city-rooftops-dawn-n', 'lightsoff': 'stadium-lights-off-n', 'pub': 'pub-before-kr',
       'pub-b': 'pub-before-b-kr', 'ferry': 'ferry-deck-kr', 'whistle': 'final-whistle-arms-kr', 'net': 'ball-in-net-kr', 'net-b': 'ball-in-net-b-kr',
       'clock': 'last-minute-clock-n', 'kickoff': 'kick-off-centre-kr', 'photos': 'old-photo-wall-kr', 'street': 'street-matchday-crowd-kr',
       'radio': 'radio-scarf-ticket-table', 'skyline': 'city-skyline-dawn-kr', 'terrace': 'terrace-full-kr', 'empty': 'terrace-empty-dusk-n'}
# The film's own drawings (house inks), kept beside the library: studio/kit/beats/paul-octopus-2010/<name>.webp
OWN = ('octo', 'octo-dark', 'tank', 'pick', 'pick-ger', 'final', 'boxes')


def pack(out: Path) -> dict:
    """The film's asset folder from the common library, inked, plus its own drawings. → {name: where it came from}."""
    from PIL import Image
    here = Path(__file__).resolve()
    sys.path.insert(0, str(here.parents[3]))
    from studio import paper
    lib = here.parents[2] / 'kit' / 'beats' / 'common'
    own = here.parents[2] / 'kit' / 'beats' / 'paul-octopus-2010'
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
    for name in OWN:
        Image.open(own / f'{name}.webp').convert('RGB').save(out / f'{name}.jpg', quality=93)
        made[f'{name}.jpg'] = f'beat:paul-octopus-2010/{name}'
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


QUESTION = 'PSYCHIC, LUCKY,|OR SOMETHING ELSE?'
PICKS = 'PAUL PICKED'

beat(None, dict(kind='ident', line='A FAN LIFE FILM'), type='open', hold=1.8, sound=[('sting', 0.1, 1.7, 0.5)])

# ── COLD OPEN ── the record off the ledger (eight of eight) before 0:15, the threat, the question, no answer
beat("The World Cup, two thousand and ten. The most accurate pundit of the whole tournament lived in a tank, in Germany.",
     img('octo', 'push', veil=0.0), type='open', emotion='wonder', intensity=0.8, pre=0.2, pad=0.1, meta=dict(plain=True))
beat("He picked eight matches. He got all eight right.",
     img('tank', 'push', veil=0.05), stamp('8 OF 8', 'us', x=760, y=200, dt=1.6, size=190, rot=-4, plate=True),
     type='open', emotion='wonder', intensity=1.0, pad=0.1, meta=dict(plain=True), sound=[('stamp', 1.6, 1.0, 0.7)])
beat("Then he picked against Germany. And German fans wanted him on a plate.",
     img('pick', 'slam', veil=0.0), stamp('FRIED · GRILLED · PAELLA', 'them', x=260, y=860, dt=2.4, size=96, rot=-3, plate=True),
     type='open', emotion='dread', intensity=0.9, pad=0.1, meta=dict(plain=True), sound=[('impact', 0.3, 1.4, 0.6), ('stamp', 2.4, 1.0, 0.6)])
beat("The Prime Minister of Spain thought about sending him protection.",
     img('press', 'push', veil=0.05), type='open', emotion='wonder', intensity=0.9, pad=0.1, meta=dict(plain=True))
beat("He was an octopus. His name was Paul. So how did he do it?", img('octo-dark', 'push', veil=0.2),
     word(QUESTION, bg='ink', size=150, small='SEA LIFE OBERHAUSEN · 2008–2010', at=2.6),
     type='turning', emotion='tension', intensity=0.9, pad=0.6, meta=dict(plain=True), sound=[('riser', 0.2, 1.4, 0.5), ('impact', 2.6, 1.6, 0.7)])
beat(None, word('PAUL', bg='ink', size=300, d=1.2), word('PAUL|THE OCTOPUS', bg='us', size=200, small='EIGHT ARMS · EIGHT PICKS', at=1.2),
     type='trailer', hold=3.2, sound=[('impact', 0.0, 1.4, 0.7), ('impact2', 1.2, 2.2, 0.9)])

# ── CHAPTER ONE · ENGLISH-BORN ── where he came from, the tank, the method
chapter('CHAPTER ONE', 'ENGLISH-BORN', 'WEYMOUTH · OBERHAUSEN · 2008', 'ferry')
beat("Start with the twist nobody in Germany liked to mention. Paul was English.", img('ferry', 'push', veil=0.05),
     type='illustration', emotion='wonder', intensity=0.7, pad=0.3)
beat("He hatched at the Sea Life Centre in Weymouth, on the south coast of England, in January two thousand and eight.",
     img('skyline', 'push', veil=0.1), flap('2010', '2008', at=1.8, d=2.8, small='WEYMOUTH · ENGLAND'),
     type='record', emotion='calm', intensity=0.6, pad=0.3)
beat("Then he moved to another Sea Life aquarium, in Oberhausen, in western Germany.", img('rooftops', 'push', veil=0.1),
     word('OBERHAUSEN', bg='us', size=200, small='SEA LIFE · GERMANY', at=1.8),
     type='illustration', emotion='calm', intensity=0.6, pad=0.3)
beat("A common octopus. Eight arms, a soft body, and a tank of his own.", img('octo', 'pull', veil=0.1),
     type='illustration', emotion='wonder', intensity=0.6, pad=0.3)
beat("And before the big matches, his keepers played a game with him.", img('boxes', 'push', veil=0.05),
     type='illustration', emotion='wonder', intensity=0.7, pad=0.3)
beat("Two clear boxes go into the tank. In each one, a mussel, his food. On each box, a flag. One for each team.",
     img('boxes', 'push', veil=0.0), stamp('A MUSSEL · A FLAG', 'us', x=420, y=140, dt=3.0, size=110, rot=-3, plate=True),
     type='record', emotion='calm', intensity=0.7, pad=0.3, sound=[('stamp', 3.0, 1.0, 0.5)])
beat("Whichever box Paul opens first, that team wins. That is the prediction.", img('pick', 'push', veil=0.0),
     word('FIRST BOX OPENED|= THE WINNER', bg='ink', size=150, small='THE METHOD', at=2.6),
     type='record', emotion='wonder', intensity=0.8, pad=0.3)
beat("Notice what is missing. There is no box for a draw. Paul always has to pick a winner.",
     img('tank', 'pull', veil=0.1), stamp('NO DRAWS', 'them', x=720, y=160, dt=2.2, size=150, rot=-4, plate=True),
     type='turning', emotion='wonder', intensity=0.8, pad=0.8, meta=dict(turn=True), sound=[('stamp', 2.2, 1.0, 0.6)])

# ── CHAPTER TWO · EURO 2008 ── the first tournament, Germany every time, the final he got wrong
chapter('CHAPTER TWO', 'THE FIRST TRY', 'EURO 2008 · GERMANY', 'stadium')
beat("His first tournament is the European Championship, in the summer of two thousand and eight. He picks only Germany's matches.",
     img('stadium', 'push', veil=0.1), type='matchday', emotion='calm', intensity=0.6, pad=0.3)
beat("And he picks Germany. Every single time.", img('pick-ger', 'push', veil=0.05),
     stamp('GERMANY · GERMANY · GERMANY', 'us', x=200, y=140, dt=1.6, size=96, rot=-3, plate=True),
     type='illustration', emotion='wonder', intensity=0.7, pad=0.3, sound=[('stamp', 1.6, 1.0, 0.5)])
beat("Germany beat Poland two nil. Right. Then Germany lose to Croatia, two one. Wrong.",
     dict(kind='ledger', title='EURO 2008 · GERMANY', us=PICKS, them='SCORE', compact=True,
          rows=[('v POLAND', 'GER', '2–0'), ('v CROATIA', 'GER', '1–2')], row_at=[0.4, 2.6]),
     type='record', emotion='wonder', intensity=0.7, pad=0.3)
beat("Then they beat Austria, Portugal and Turkey, and Germany are in the final. Against Spain.",
     dict(kind='ledger', title='EURO 2008 · GERMANY', us=PICKS, them='SCORE', compact=True,
          rows=[('v AUSTRIA', 'GER', '1–0'), ('v PORTUGAL', 'GER', '3–2'), ('v TURKEY', 'GER', '3–2')],
          row_at=[0.6, 1.4, 2.2]),
     type='record', emotion='tension', intensity=0.8, pad=0.3)
beat("Paul picks Germany. Spain win the final, one nil.", img('despair', 'push', veil=0.05),
     word('SPAIN 1–0', bg='them', size=230, small='EURO 2008 FINAL · PAUL PICKED GERMANY', at=1.8),
     type='record', emotion='grief', intensity=0.8, pad=0.4)
beat("Most reports put his first tournament at four right out of six. Not bad for an octopus. Not magic either.",
     img('scrap', 'push', veil=0.1), type='illustration', emotion='calm', intensity=0.6, pad=0.3)
beat("But remember that final. Germany against Spain. Paul got it wrong.", img('pick-ger', 'pull', veil=0.2),
     type='turning', emotion='wonder', intensity=0.9, pad=0.8, meta=dict(turn=True))

# ── CHAPTER THREE · SOUTH AFRICA ── the group, the Serbia pick, the knockouts, the TV cameras
chapter('CHAPTER THREE', 'SOUTH AFRICA', 'THE WORLD CUP · JUNE 2010', 'tv')
beat("Two years later, the World Cup in South Africa. Once again, the boxes go into the tank before every Germany match.",
     img('tank', 'push', veil=0.05), flap('2008', '2010', at=1.6, d=2.8, small='THE WORLD CUP · SOUTH AFRICA'),
     type='illustration', emotion='calm', intensity=0.6, pad=0.3)
beat("And this time, the cameras come too. His picks are shown live on television.", img('tv', 'push', veil=0.05),
     stamp('LIVE', 'them', x=260, y=160, dt=1.8, size=170, rot=-4, plate=True),
     type='illustration', emotion='wonder', intensity=0.7, pad=0.3, sound=[('stamp', 1.8, 1.0, 0.6)])
beat("First match: Germany against Australia. Paul picks Germany. Germany win four nil.",
     dict(kind='ledger', title='WORLD CUP 2010 · GERMANY', us=PICKS, them='SCORE', compact=True,
          rows=[('v AUSTRALIA', 'GER', '4–0')], row_at=[1.6]),
     type='record', emotion='joy', intensity=0.7, pad=0.3)
beat("Second match: Germany against Serbia. And this time, Paul does not pick Germany. He opens the box with the Serbian flag.",
     img('pick', 'push', veil=0.0), type='illustration', emotion='tension', intensity=0.8, pad=0.3)
beat("Serbia win, one nil.", img('net', 'slam', veil=0.0), word('SERBIA 1–0', bg='them', size=230, small='WORLD CUP 2010 · GROUP D', at=0.6),
     type='record', emotion='dread', intensity=0.9, pad=0.4, sound=[('groan', 0.4, 2.0, 0.4)])
beat("Ghana. He picks Germany, and Germany win one nil. Then the last sixteen. Germany against England.",
     dict(kind='ledger', title='WORLD CUP 2010 · GERMANY', us=PICKS, them='SCORE', compact=True,
          rows=[('v SERBIA', 'SRB', '0–1'), ('v GHANA', 'GER', '1–0')], row_at=[0.4, 1.4]),
     type='record', emotion='tension', intensity=0.7, pad=0.3)
beat("The English-born octopus picks Germany. Germany win four one.", img('ferry', 'pull', veil=0.1),
     word('GERMANY 4–1|ENGLAND', bg='us', size=190, small='LAST 16 · PAUL PICKED GERMANY', at=2.4),
     type='record', emotion='joy', intensity=0.8, pad=0.3)
beat("The quarter-final. Germany against Argentina. He picks Germany. Four nil.",
     dict(kind='ledger', title='WORLD CUP 2010 · GERMANY', us=PICKS, them='SCORE', compact=True,
          rows=[('v ENGLAND', 'GER', '4–1'), ('v ARGENTINA', 'GER', '4–0')], row_at=[0.4, 1.6]),
     type='record', emotion='joy', intensity=0.8, pad=0.3)
beat("In Argentina, people were not amused. A chef posted a recipe for him online.", img('pub', 'push', veil=0.05),
     stamp('A RECIPE', 'them', x=520, y=460, dt=2.4, size=150, rot=-3, plate=True),
     type='illustration', emotion='wonder', intensity=0.7, pad=0.3, sound=[('stamp', 2.4, 1.0, 0.6)])
beat("Five matches, five right. And next, the semi-final. Germany against Spain. The same final he got wrong two years before.",
     img('pick-ger', 'pull', veil=0.1), type='turning', emotion='tension', intensity=0.9, pad=0.8, meta=dict(turn=True))

# ── CHAPTER FOUR · THE SEMI-FINAL ── the pick against Germany, the threats, the guard
chapter('CHAPTER FOUR', 'THE BETRAYAL', 'OBERHAUSEN · JULY 2010', 'pick')
beat("The boxes go in. Germany on one. Spain on the other.", img('tank', 'push', veil=0.0),
     type='illustration', emotion='tension', intensity=0.9, pad=0.3, sound=[('tick', 0.0, 2.6, 0.4)])
beat("Paul goes to Spain.", img('pick', 'slam', veil=0.0), stamp('SPAIN', 'them', x=1060, y=160, dt=0.8, size=200, rot=-4, plate=True),
     type='illustration', emotion='dread', intensity=1.0, pad=0.6, meta=dict(breath=True), sound=[('impact', 0.2, 1.4, 0.7), ('stamp', 0.8, 1.0, 0.7)])
beat("In Germany, the reaction is not polite. Fans call for him to be fried. Grilled. Made into paella.",
     img('pub-b', 'push', veil=0.05), word('FRIED|GRILLED|PAELLA', bg='them', size=170, small='THE GERMAN FANS', at=2.6),
     type='record', emotion='dread', intensity=0.9, pad=0.3)
beat("Recipes arrive. So do threats. The aquarium adds security.", img('news', 'push', veil=0.05),
     stamp('SECURITY', 'us', x=520, y=460, dt=2.6, size=150, rot=-3, plate=True),
     type='illustration', emotion='dread', intensity=0.8, pad=0.3, sound=[('stamp', 2.6, 1.0, 0.6)])
beat("His keeper, Oliver Walenciak, put it simply.", img('rooftops', 'push', veil=0.1), type='illustration', emotion='calm', intensity=0.6, pad=0.3)
beat("There are always people who want to eat our octopus. We are here to protect him.",
     dict(kind='quote', text='“There are always people who want to eat our octopus … we are here to protect him.”', who='OLIVER WALENCIAK · HIS KEEPER'),
     type='quote', emotion='wonder', intensity=0.8, pad=0.6)
beat("Then the match. Spain win, one nil. Germany are out.", img('despair-b', 'push', veil=0.05),
     dict(kind='score', us='GERMANY', them='SPAIN', us_goals=0, them_goals=1, cap='WORLD CUP 2010 · SEMI-FINAL', bg='stadium.jpg'),
     type='score', emotion='grief', intensity=0.9, pad=0.4, meta=dict(outcome='loss', plain=True, claims=['result']), sound=[('groan', 0.6, 2.0, 0.4)])
beat("Paul was right again. And now, he was famous far beyond Germany.", img('tv-b', 'push', veil=0.05),
     type='turning', emotion='wonder', intensity=0.9, pad=0.8, meta=dict(turn=True))

# ── CHAPTER FIVE · SPAIN FALLS IN LOVE ── the Prime Minister, the minister, the third-place pick
chapter('CHAPTER FIVE', 'SPAIN FALLS IN LOVE', 'MADRID · JULY 2010', 'press')
beat("In Spain, the octopus who picked them became a hero overnight.", img('crowd', 'push', veil=0.05),
     type='illustration', emotion='joy', intensity=0.8, pad=0.3)
beat("The Prime Minister, José Luis Rodríguez Zapatero, was asked about him on Spanish radio.", img('radio', 'push', veil=0.05),
     type='illustration', emotion='wonder', intensity=0.7, pad=0.3)
beat("I am concerned for the octopus. I am thinking of sending him a protective team.",
     dict(kind='quote', text='“I am concerned for the octopus … I am thinking of sending him a protective team.”', who='JOSÉ LUIS RODRÍGUEZ ZAPATERO · PRIME MINISTER OF SPAIN'),
     type='quote', emotion='wonder', intensity=0.9, pad=0.6)
beat("A government minister, Miguel Sebastián, went further. He called for Paul to get a free transfer to Spain.",
     img('signing', 'push', veil=0.05), stamp('FREE TRANSFER', 'us', x=240, y=460, dt=3.2, size=140, rot=-3, plate=True),
     type='illustration', emotion='wonder', intensity=0.8, pad=0.3, sound=[('stamp', 3.2, 1.0, 0.6)])
beat("Meanwhile, Germany still had one match to play. Third place, against Uruguay. Paul picked Germany. Germany won, three two.",
     dict(kind='ledger', title='WORLD CUP 2010 · GERMANY', us=PICKS, them='SCORE', compact=True,
          rows=[('v SPAIN', 'ESP', '0–1'), ('v URUGUAY', 'GER', '3–2')], row_at=[0.4, 3.0]),
     type='record', emotion='calm', intensity=0.7, pad=0.3)
beat("Seven Germany matches. Seven right. Including the two Germany lost.",
     dict(kind='tally', title='GERMANY · WORLD CUP 2010', cells=[('RIGHT', '7'), ('WRONG', '0')]),
     type='stat', emotion='wonder', intensity=0.9, pad=0.4)
beat("And then, for the first time, his keepers asked him about a match without Germany in it. The final.",
     img('final', 'push', veil=0.05), type='turning', emotion='tension', intensity=0.9, pad=0.8, meta=dict(turn=True))

# ── CHAPTER SIX · THE FINAL ── Spain or the Netherlands, the rival oracle, Iniesta
chapter('CHAPTER SIX', 'THE FINAL', 'SPAIN v THE NETHERLANDS · 2010', 'final')
beat("Friday, the ninth of July. Two boxes. Spain on one. The Netherlands on the other.", img('final', 'push', veil=0.0),
     type='illustration', emotion='tension', intensity=0.9, pad=0.3, sound=[('tick', 0.0, 2.6, 0.4)])
beat("Live on television, Paul opens Spain.", img('pick', 'slam', veil=0.0),
     stamp('SPAIN', 'us', x=1060, y=160, dt=1.4, size=200, rot=-4, plate=True),
     type='illustration', emotion='wonder', intensity=1.0, pad=0.4, sound=[('stamp', 1.4, 1.0, 0.7)])
beat("He was not the only animal in the business. In Singapore, a parakeet called Mani was making picks too.", img('flags', 'push', veil=0.05),
     word('MANI', bg='them', size=260, small='THE PARAKEET · SINGAPORE', at=2.8),
     type='illustration', emotion='wonder', intensity=0.7, pad=0.3)
beat("Mani picked the Netherlands. The final would settle it. Octopus against parakeet.", img('tv', 'pull', veil=0.1),
     word('OCTOPUS|v PARAKEET', bg='ink', size=190, small='THE WORLD CUP FINAL · 11 JULY 2010', at=1.8),
     type='record', emotion='tension', intensity=0.8, pad=0.3)
beat("Sunday, the eleventh of July. Nil nil after ninety minutes. Into extra time.", img('clock', 'push', veil=0.05),
     type='matchday', emotion='tension', intensity=0.9, pad=0.3, sound=[('tick', 0.0, 2.6, 0.4)])
beat("In the hundred and sixteenth minute, Andrés Iniesta scores.", img('net-b', 'slam', veil=0.0),
     type='goal', emotion='release', intensity=1.0, pad=0.4, meta=dict(plain=True), sound=[('impact2', 0.6, 2.0, 0.9), ('goal', 0.8, 5.0, 0.6)])
beat("Spain one, the Netherlands nil. Spain are champions of the world.",
     dict(kind='score', us='SPAIN', them='NETHERLANDS', us_goals=1, them_goals=0, cap='WORLD CUP FINAL · AFTER EXTRA TIME', bg='stadium.jpg'),
     type='score', emotion='joy', intensity=0.9, pad=0.4, meta=dict(outcome='win', plain=True, claims=['result']), sound=[('final', 0.3, 5.0, 0.5)])
beat("Eight picks. Eight right.", dict(kind='tally', title='PAUL · WORLD CUP 2010', cells=[('RIGHT', '8'), ('WRONG', '0')]),
     type='stat', emotion='wonder', intensity=1.0, pad=0.4, sound=[('impact', 0.2, 1.4, 0.6)])
beat("And this time, against Spain, he had picked the side that won. The opposite of two years before.", img('trophy', 'pull', veil=0.1),
     type='turning', emotion='joy', intensity=0.9, pad=0.8, meta=dict(turn=True), sound=[('claps', 0.0, 3.0, 0.3)])

# ── CHAPTER SEVEN · THE MOST FAMOUS OCTOPUS IN THE WORLD ── the retirement, the offers, Tehran
chapter('CHAPTER SEVEN', 'WORLD FAMOUS', 'THE SUMMER OF 2010', 'news-b')
beat("The day after the final, the aquarium made an announcement. Paul was retiring. No more predictions.",
     img('press-b', 'push', veil=0.05), stamp('RETIRED', 'us', x=520, y=460, dt=2.6, size=170, rot=-4, plate=True),
     type='illustration', emotion='calm', intensity=0.7, pad=0.3, sound=[('stamp', 2.6, 1.0, 0.6)])
beat("Everyone wanted him. In the Spanish town of O Carballiño, famous for its octopus festival, businessmen offered thirty thousand euros to bring him there.",
     img('boardroom', 'push', veil=0.05), word('€30,000', bg='us', size=240, small='THE OFFER · O CARBALLIÑO', at=4.2),
     type='record', emotion='wonder', intensity=0.8, pad=0.3)
beat("The aquarium said no. Paul was not for sale, and not for loan.", img('signing', 'pull', veil=0.1),
     stamp('NOT FOR SALE', 'them', x=300, y=460, dt=2.0, size=150, rot=-3, plate=True),
     type='illustration', emotion='calm', intensity=0.7, pad=0.3, sound=[('stamp', 2.0, 1.0, 0.6)])
beat("So the town honoured him anyway.", img('trophy', 'push', veil=0.1),
     type='illustration', emotion='joy', intensity=0.7, pad=0.3)
beat("Not everyone was charmed. In a speech in Tehran, Iran's president, Mahmoud Ahmadinejad, called him a sign of Western decline.",
     img('news-b', 'push', veil=0.05), type='illustration', emotion='dread', intensity=0.7, pad=0.3)
beat("Those who believe in this type of thing cannot be the leaders of the global nations.",
     dict(kind='quote', text='“Those who believe in this type of thing cannot be the leaders of the global nations.”', who='MAHMOUD AHMADINEJAD · PRESIDENT OF IRAN'),
     type='quote', emotion='wonder', intensity=0.8, pad=0.6)
beat("A head of state, a minister, a festival town, and a mussel in a box. All in one summer.", img('octo', 'pull', veil=0.1),
     type='turning', emotion='wonder', intensity=0.8, pad=0.8, meta=dict(turn=True))

# ── CHAPTER EIGHT · THE ANSWER ── the odds, the luck, the stripes
chapter('CHAPTER EIGHT', 'THE ANSWER', 'HOW DID HE DO IT?', 'tank')
beat(None, word(QUESTION, bg='ink', size=150, small='THE OPENING QUESTION', d=2.6), type='trailer', hold=2.8, sound=[('impact', 0.0, 1.6, 0.6)])
beat("So, was Paul psychic? Start with the numbers.", img('scrap', 'push', veil=0.1), type='illustration', emotion='wonder', intensity=0.7, pad=0.3)
beat("Two boxes, so every pick is a coin toss. To get eight coin tosses right, by pure chance, the odds are one in two hundred and fifty-six.",
     dict(kind='explain', form='number', value=256, label='1 IN 256 · EIGHT RIGHT BY CHANCE', title='THE ODDS'),
     type='stat', emotion='wonder', intensity=0.9, pad=0.4)
beat("Long odds. But not impossible.", img('fingers', 'push', veil=0.1), type='illustration', emotion='calm', intensity=0.6, pad=0.3)
beat("The Cambridge statistician David Spiegelhalter put it this way. Lots of animals were making predictions that summer. We only hear about the one who got lucky.",
     img('flags', 'push', veil=0.05), word('LOTS OF ANIMALS.|WE HEAR ABOUT ONE.', bg='ink', size=130, small='DAVID SPIEGELHALTER · CAMBRIDGE', at=4.6),
     type='record', emotion='calm', intensity=0.8, pad=0.4)
beat("Remember Mani the parakeet? We remember Paul because Mani got the final wrong.", img('tv-b', 'pull', veil=0.1),
     type='illustration', emotion='wonder', intensity=0.7, pad=0.3)
beat("And there is one more idea. Octopuses are almost certainly colour-blind. But they can tell light from dark, and shapes.",
     img('octo-dark', 'push', veil=0.05), type='illustration', emotion='wonder', intensity=0.7, pad=0.3)
beat("Some scientists suggested octopuses are drawn to strong horizontal stripes.", img('boxes', 'push', veil=0.0),
     word('HORIZONTAL|STRIPES', bg='us', size=210, small='ONE THEORY', at=2.6),
     type='record', emotion='wonder', intensity=0.8, pad=0.3)
beat("Look at the flags he chose. Germany. Spain. Serbia. All of them, horizontal stripes.", img('pick', 'push', veil=0.0),
     stamp('STRIPES', 'them', x=760, y=160, dt=2.6, size=170, rot=-4, plate=True),
     type='illustration', emotion='wonder', intensity=0.9, pad=0.4, sound=[('stamp', 2.6, 1.0, 0.6)])
beat("Proof? No. A coin toss, a story we chose to remember, and maybe a taste for stripes.", img('tank', 'pull', veil=0.1),
     type='turning', emotion='calm', intensity=0.8, pad=0.8, meta=dict(turn=True))

# ── CHAPTER NINE · THE LAST BOX ── his death, the memorial, the successor
chapter('CHAPTER NINE', 'THE LAST BOX', 'OBERHAUSEN · OCTOBER 2010', 'lightsoff')
beat("Octopuses do not live long.", img('octo-dark', 'push', veil=0.2), type='illustration', emotion='grief', intensity=0.6, pad=0.4)
beat("On the morning of Tuesday, the twenty-sixth of October, two thousand and ten, staff found Paul dead in his tank. Natural causes. He died peacefully in the night.",
     img('lightsoff', 'push', veil=0.1), flap('JULY', 'OCTOBER', at=3.0, d=2.8, small='26 OCTOBER 2010 · OBERHAUSEN'),
     type='record', emotion='grief', intensity=0.8, pad=0.4)
beat("He was about two and a half years old.", dict(kind='stat', value='2½', label='YEARS · ABOUT', dt=0.4),
     type='stat', emotion='grief', intensity=0.8, pad=0.4)
beat("The aquarium's manager, Stefan Porwoll, said he would be sorely missed.", img('press', 'pull', veil=0.1),
     type='illustration', emotion='grief', intensity=0.7, pad=0.3)
beat("Paul was cremated. And in January two thousand and eleven, Oberhausen unveiled his memorial.", img('photos', 'push', veil=0.1),
     type='illustration', emotion='calm', intensity=0.7, pad=0.3)
beat("A two-metre Paul, holding a football. Inside the ball, a gold-leaf urn, with his ashes.", img('archive', 'push', veil=0.05),
     word('2 METRES|ASHES IN THE BALL', bg='us', size=170, small='OBERHAUSEN · 20 JANUARY 2011', at=2.8),
     type='record', emotion='wonder', intensity=0.8, pad=0.4)
beat("And in the aquarium, a successor was already growing up. His name? Also Paul.", img('octo', 'push', veil=0.1),
     stamp('PAUL II', 'us', x=760, y=160, dt=3.2, size=170, rot=-4, plate=True),
     type='illustration', emotion='joy', intensity=0.7, pad=0.4, sound=[('stamp', 3.2, 1.0, 0.6)])

# ── CLOSE · the bookend answered, the hand-over ──
beat("So, psychic, lucky, or something else?", img('tank', 'pull', veil=0.2), type='turning', emotion='wonder', intensity=0.9, pad=0.4)
beat("Lucky, most likely. One in two hundred and fifty-six, maybe helped by a few stripes. But in two summers, he went from getting Spain wrong to getting Spain right.",
     img('final', 'pull', veil=0.1), word('LUCKY|1 IN 256', bg='us', size=200, small='THE BEST GUESS', at=4.0),
     type='illustration', emotion='pride', intensity=0.9, pad=0.4)
beat("He never said a word. And for one World Cup, he was the best pundit in the world.", img('octo', 'pull', veil=0.2),
     type='illustration', emotion='wonder', intensity=0.8, pad=0.8)
beat("Next on Around the Ball: a team that was not supposed to be at the tournament at all. If you love the strange side of this game, subscribe, and it will find you.",
     img('flags', 'push', veil=0.4), dict(kind='follow', club='Around the Ball', press_at=8.0, dt=1.2),
     type='follow', pad=1.0, sound=[('claps', 8.0, 2.0, 0.4)])
beat(None, img('lightsoff', 'push', veil=0.55), dict(kind='end', title='Paul the Octopus', line='NEXT · DENMARK 1992 · @FanLifeFootballStories'), type='end', hold=5.0)

# A card leaves after its reading time (docu/editor MAX_CARD, WORD_HOLD): each long card beat gets the picture that carries the rest.
UNDER = {'Germany beat Poland': 'stadium', 'Then they beat Austria': 'bowl', 'First match: Germany': 'tank', 'Ghana. He picks': 'kickoff',
         'The quarter-final.': 'terrace', 'There are always people': 'pub-b', 'I am concerned': 'radio', 'Meanwhile, Germany': 'kickoff',
         'Seven Germany matches': 'tank', 'Eight picks. Eight right.': 'octo', 'Those who believe': 'news-b',
         'Two boxes, so every pick': 'boxes', 'He was about two and a half': 'lightsoff'}
for _b in B:
    for _k, _src in UNDER.items():
        if _b['vo'] and _b['vo'].startswith(_k):
            _b['shots'].insert(0, img(_src, 'push', veil=0.25))
assert sum(1 for _b in B for _k in UNDER if _b['vo'] and _b['vo'].startswith(_k)) == len(UNDER)

_CH = lambda big: next(i for i, b in enumerate(B) if b['shots'] and b['shots'][0].get('big') == big)
_C3, _C5, _C7, _C9 = (_CH(x) for x in ('SOUTH AFRICA', 'SPAIN FALLS IN LOVE', 'WORLD FAMOUS', 'THE LAST BOX'))
M = 'dubelteam/'
SB = dict(slug='atb-paul-octopus-2010', title='Paul the Octopus', minutes=[8, 14], palette=dict(us=BLUE, them=RED), edit=True, mark=True,
          shape='ball',
          pronounce={'Oberhausen': 'ˈəʊbəhaʊzən', 'Weymouth': 'ˈweɪməθ', 'Oliver Walenciak': 'ˈɒlɪvə vaˈlɛntʃiæk', 'Walenciak': 'vaˈlɛntʃiæk',
                     'José Luis Rodríguez Zapatero': 'xoˈseɪ ˈlwiːs ɹɒˈdɹiːɡɛθ ˌθæpəˈtɛəɹəʊ', 'Zapatero': 'ˌθæpəˈtɛəɹəʊ',
                     'Miguel Sebastián': 'mɪˈɡɛl sɛbæsˈtjæn', 'O Carballiño': 'əʊ ˌkɑːbəˈliːnjəʊ', 'Carballiño': 'ˌkɑːbəˈliːnjəʊ',
                     'Mahmoud Ahmadinejad': 'mɑːˈmuːd ɑːˌmædɪnəˈʒɑːd', 'Ahmadinejad': 'ɑːˌmædɪnəˈʒɑːd', 'Tehran': 'tɛəˈɹɑːn',
                     'David Spiegelhalter': 'ˈdeɪvɪd ˈspiːɡəlhɔːltə', 'Stefan Porwoll': 'ˈʃtɛfæn ˈpɔːvɒl', 'Andrés Iniesta': 'ænˈdɹeɪs ˌɪniˈɛstə',
                     'Mani': 'ˈmɑːni', 'Sea Life': 'ˈsiː laɪf'},
          us=dict(), them=dict(), agg_label='', karaoke=True, sub_limit=44, bed=0.16,
          music=[dict(file=M + 'ninety-minutes-of-glory.mp3', from_beat=1, to_beat=_C3 - 1, vol=0.11),
                 dict(file=M + 'a-stand-of-thousands.mp3', from_beat=_C3, to_beat=_C5 - 1, vol=0.11),
                 dict(file=M + 'before-the-collapse.mp3', from_beat=_C5, to_beat=_C7 - 1, vol=0.11),
                 dict(file=M + 'the-weight-of-stillness.mp3', from_beat=_C7, to_beat=_C9 - 1, vol=0.11),
                 dict(file=M + 'after-the-final-whistle.mp3', from_beat=_C9, vol=0.11)],
          credits=['Music: Ninety Minutes of Glory · A Stand of Thousands · Before the Collapse · The Weight of Stillness · After the Final Whistle — DubelTeam',
                   'The octopus and the boxes are drawn for this film; the flags are drawn in the house inks.'],
          beats=B)

# ── THE VERTICAL CUTS (studio/docu/vertical.py) ── three Shorts (≤ 30 s, an open loop, the answer only in the film)
L = {k: next(b['vo'] for b in B if b['vo'] and b['vo'].startswith(k)) for k in (
    'The World Cup, two thousand', 'He picked eight matches', 'Then he picked against', 'Two clear boxes', 'Whichever box Paul',
    'The boxes go in. Germany', 'Paul goes to Spain', 'In Germany, the reaction', 'The Prime Minister, José', 'I am concerned',
    'Two boxes, so every pick')}
END = dict(big='Watch the full film', small='Paul the Octopus · on YouTube')
VERTICAL = [
    dict(name='short-1-eight-of-eight', kind='short', hook='An octopus picked 8 World Cup matches. All 8 right.', kicker='Oberhausen · 2010', music=M + 'ninety-minutes-of-glory.mp3', end=END, scenes=[
        dict(src='octo.jpg', focus=(0.5, 0.45), zoom=(1.0, 1.2), vo=L['The World Cup, two thousand']),
        dict(src='tank.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['He picked eight matches']),
        dict(src='pick.jpg', focus=(0.6, 0.5), zoom=(1.0, 1.15), vo=L['Two clear boxes']),
        dict(card=dict(big='Psychic, lucky, or something else?', small='The answer is in the film', size=110), d=2.8)]),
    dict(name='short-2-paella', kind='short', hook='He picked Spain. Germany wanted him as paella.', kicker='World Cup semi-final · 2010', music=M + 'a-stand-of-thousands.mp3', end=END, scenes=[
        dict(src='tank.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['The boxes go in. Germany']),
        dict(src='pick.jpg', focus=(0.7, 0.5), zoom=(1.1, 1.3), vo=L['Paul goes to Spain']),
        dict(src='pub-b.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['In Germany, the reaction']),
        dict(card=dict(big='Was he right?', small='The answer is in the film', size=130), d=2.6)]),
    dict(name='short-3-prime-minister', kind='short', hook='Spain’s Prime Minister worried about an octopus', kicker='Madrid · July 2010', music=M + 'before-the-collapse.mp3', end=END, scenes=[
        dict(src='radio.jpg', focus=(0.5, 0.5), zoom=(1.0, 1.2), vo=L['The Prime Minister, José']),
        dict(src='octo.jpg', focus=(0.5, 0.45), zoom=(1.0, 1.25), vo=L['I am concerned']),
        dict(card=dict(big='Why did Spain love an octopus?', small='The answer is in the film', size=110), d=2.8)]),
]
# The two thumbnails (studio/docu/model.thumb): the hook off the record, measured at 168×94; A and B for Test & Compare.
THUMBS = [dict(file='thumbnail-a.jpg', src='octo.jpg', focus=(0.5, 0.45), zoom=1.0, side='left', lines=['8 OF 8', 'RIGHT'], hot=0, kicker='WORLD CUP 2010', size=170, top=200),
          dict(file='thumbnail-b.jpg', src='pick.jpg', focus=(0.5, 0.5), zoom=1.0, side='left', lines=['GERMANY', 'WANTED', 'HIM EATEN'], hot=2, kicker='PAUL THE OCTOPUS', size=140, top=150)]

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
