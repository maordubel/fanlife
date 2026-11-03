"""Writes episodes/2023-04-26-aek-paok.json — I WAS THERE · episode 4 · OPAP Arena, 26 April 2023.

The owner's footage of the night (18 clips, 7 stills) is the spine: two goals answered by Gate 21 in flares and smoke,
the board at full time, the ride home. What the camera did not film — how the goals were scored, the red card, the
lights before kick-off — is drawn as reconstructions (plays.py), each only as far as a cited report describes it.
    python3 scripts/football-stories/matchday/episodes/build-iwt-04.py
"""
import json
from pathlib import Path

ACC = '#F2C400'          # AEK's yellow (all colours are approved for the series, RULES §7)
PAPER = '#1A1813'
CLIP = '1B8C5511-7711-4822-BB2D-BF02B339D065.MP4'   # 3.27 s · the board at 90:00 · 22:59:19 +03:00
CREST = 'public/club-kits/aek-athens/crest.png'
NUM = 'ultra-latin-400-normal.woff2'


def board(score, scorers, prev=None, minute=None, w=0.6, at_t=0.3):
    return {'crest': CREST, 'away': 'PAOK', 'score': score, 'prev': prev, 'minute': minute or ("90:00" if score == '4 - 0' else ''),
            'scorers': scorers, 'w': w, 'at_t': at_t}


S1, S2, S3, S4 = "ZUBER 21'", "MOUKOUDI 24'", "GARCÍA 77'", "FERNANDES 86'"

TICKET = {'art': 'kitprop:match_ticket', 'w': 0.62, 'texts': [
    {'t': 'AEK ATHENS  v  PAOK', 'x': 0.42, 'y': 0.34, 'size': 64, 'face': 'head', 'color': 'ink'},
    {'t': 'OPAP ARENA · WED 26 APR 2023 · 21:00', 'x': 0.42, 'y': 0.55, 'size': 27, 'face': 'type', 'color': 'ink'},
    {'t': 'SUPER LEAGUE · PLAY-OFFS · ROUND 6', 'x': 0.42, 'y': 0.70, 'size': 27, 'face': 'type', 'color': 'ink'}]}

# ── the goals, re-drawn. Coordinates: metres across (0–68, posts 30.3–37.7) and out from the goal line ───────────────
G1 = {  # 21' · iefimerida.gr: Kotarski played it to Schwab under pressure, Schwab lost it in the box, Zuber scored;
        # Fox Sports credits Jonsson with the assist
    'minute': "21'", 'name': 'STEVEN ZUBER', 'sub': 'Kotarski to Schwab · Jonsson takes it · Zuber',
    'source': 'iefimerida.gr · Fox Sports', 'at_t': 0.3,
    'theirs': [{'name': 'KOTARSKI', 'keys': [[0, 34, 2.5], [1.0, 34.5, 3]]},
               {'name': 'SCHWAB', 'keys': [[0, 41, 13], [1.6, 40, 12.5], [2.2, 39, 12]]},
               {'keys': [[0, 25, 9], [3.0, 28, 8]]}, {'keys': [[0, 48, 7], [3.0, 45, 6]]}],
    'ours': [{'name': 'JONSSON', 'keys': [[0, 47, 19], [1.7, 41.5, 13.5], [2.4, 40, 12]]},
             {'name': 'ZUBER', 'keys': [[0, 31, 17], [2.4, 34, 12], [3.2, 34.5, 10]]},
             {'keys': [[0, 24, 18], [3.0, 26, 14]]}, {'keys': [[0, 52, 20], [3.0, 50, 15]]}],
    'ball': [{'from': 0.8, 'to': 1.6, 'path': [[34.5, 3, 0], [40.5, 12.5, 0]]},
             {'from': 1.9, 'to': 2.6, 'path': [[40.5, 12.5, 0], [37, 12, 0], [34.3, 11.6, 0]]},
             {'from': 3.1, 'to': 3.45, 'path': [[34.3, 11, 0], [36.5, -0.6, 0.4]]}],
    'goal': 3.45,
    'callouts': [[0.8, 'KOTARSKI PLAYS IT SHORT', 1.0], [1.9, 'JONSSON TAKES IT OFF SCHWAB', 1.2]]}

G2 = {  # 24' · iefimerida.gr: from Hajsafi's corner Jonsson headed it back toward the near post, Moukoudi finished on
        # the move; Fox Sports: Jonsson's second assist
    'minute': "24'", 'name': 'HAROLD MOUKOUDI', 'sub': 'Hajsafi corner · Jonsson heads it back · Moukoudi',
    'source': 'iefimerida.gr · Fox Sports', 'at_t': 0.3,
    'ours': [{'name': 'HAJSAFI', 'keys': [[0, 4, 1.5]]},
             {'name': 'JONSSON', 'keys': [[0, 46, 13], [1.5, 43, 7.5]]},
             {'name': 'MOUKOUDI', 'keys': [[0, 35, 14], [2.2, 31.5, 6.5], [2.8, 31.5, 5.5]]},
             {'keys': [[0, 26, 11], [2.0, 28, 8]]}],
    'theirs': [{'keys': [[0, 34, 1.5]]}, {'keys': [[0, 42, 6], [1.5, 42, 7.2]]},
               {'keys': [[0, 33, 8], [2.2, 32.5, 7.5]]}, {'keys': [[0, 28, 5]]}, {'keys': [[0, 38, 10], [2, 36, 9]]}],
    'ball': [{'from': 0.4, 'to': 1.5, 'path': [[4, 1.5, 0], [24, 4, 9], [43, 7.5, 2.2]]},
             {'from': 1.7, 'to': 2.3, 'path': [[43, 7.5, 2.2], [36, 6, 1.4], [31.8, 5.6, 0]]},
             {'from': 2.75, 'to': 3.05, 'path': [[31.8, 5.6, 0], [32.6, -0.6, 0.6]]}],
    'goal': 3.05,
    'callouts': [[0.4, 'CORNER · HAJSAFI', 1.2], [1.7, 'JONSSON — BACK TO THE NEAR POST', 1.2]]}

G3 = {  # 77' · iefimerida.gr: Fernandes hit the bar; seconds later García, left foot, from the edge of the box
    'minute': "77'", 'name': 'LEVI GARCÍA', 'sub': 'Fernandes hits the bar · seconds later, García',
    'source': 'iefimerida.gr', 'at_t': 0.3,
    'ours': [{'name': 'FERNANDES', 'keys': [[0, 44, 22], [0.9, 42, 19]]},
             {'name': 'GARCÍA', 'show': 2.0, 'keys': [[0, 24, 22], [2.6, 27, 17.5]]},
             {'keys': [[0, 34, 24], [3.5, 35, 18]]}],
    'theirs': [{'keys': [[0, 34, 1.5]]}, {'keys': [[0, 38, 12], [1, 40, 14]]}, {'keys': [[0, 30, 11], [3, 29, 13]]},
               {'keys': [[0, 34, 9]]}],
    'ball': [{'from': 0.6, 'to': 1.15, 'path': [[42, 19, 0], [36, 6, 1.6], [34, 0, 2.44]], 'fade': True},
             {'from': 1.15, 'to': 1.6, 'path': [[34, 0, 2.44], [33, 8, 1.0], [32, 12, 0]], 'kick': False, 'fade': True, 'hide': True},
             {'from': 2.7, 'to': 3.15, 'path': [[27.2, 17, 0], [33, 6, 1.5], [36.6, -0.4, 2.0]]}],
    'bar': 1.15, 'goal': 3.15,
    'callouts': [[0.6, 'FERNANDES — THE BAR', 1.3], [2.3, 'GARCÍA · LEFT FOOT · EDGE OF THE BOX', 1.4]]}

RUN = [{'date': '30 APR', 'text': 'Panathinaikos 0–0'}, {'date': '3 MAY', 'text': 'Olympiacos 0–0'},
       {'date': '8 MAY', 'text': 'Aris 1–2 AEK'}, {'date': '14 MAY', 'text': 'AEK 4–0 Volos'}]
HOME = [{'date': '2013', 'text': 'Relegated'}, {'date': '2018', 'text': 'Champions'},
        {'date': 'SEP 2022', 'text': 'A home again'}, {'date': 'APR 2023', 'text': '?'}]

# the owner's material (survey 3.11.2026): 18 clips, 7 stills, all shot on the night. Camera clock → match minute: the
# scoreboard in IMG_2832 (21:25:13) reads 1–0 at 21:54, so the clock ran ~3.5 min behind real time: Zuber's 21' ≈ 21:24
# (IMG_2830, the board says GOAL) and Moukoudi's 24' ≈ 21:27 (IMG_2835, GOAL again). Left out on purpose: the two
# selfies (BB9C…, 2E44…), the beer photo (a hand with a tattoo), the food counter, and the walk-out of IMG_2798 after
# its first second (feet). Speech: IMG_2798 / 2838 / 2842 / video_1 open with a word — those clips run muted or start
# after it.
GOAL1, GOAL2 = 'IMG_2830.MOV', 'IMG_2835.MOV'          # 21:24 · 21:27
WIDE = 'IMG_2829.MOV'                                    # 21:19, before the goals
HAZE = 'IMG_2840.MOV'                                    # 21:36, the smoke still over the pitch
GATE = 'video_1_f40a55c92b7d4e5893301f86277b48be.MP4'   # 21:47, Gate 21's banners (a typed caption is smudged)
SECOND = '1EC12267-2022-4360-9871-9BBDB3507F65.MP4'     # 22:04
LATE = '5938EF8A-0F1C-417B-91B5-DC93071A3CC5.MP4'       # 22:42, GOAL on the board, flares
FT = '95C437BB-85A3-4A52-AF8F-74E25FBFAD6A.MP4'         # 22:58, the board at 90:00
ACROPOLIS, HOME_RIDE = 'IMG_2798.MOV', 'IMG_2854.MOV'   # 18:43 · 23:48 (a number plate, smudged)
PYRO, PYRO_BOARD = 'IMG_2831.HEIC', 'IMG_2832.HEIC'     # 21:25, Gate 21 in flares; the board reads 1–0

film = [
    # ── cold open: the loudest true moment ───────────────────────────────────────────────────────────────────────────
    {'kind': 'clip', 'clip': GOAL1, 'in': 0.0, 'dur': 4.2, 'sound': 'clip', 'gain': 1.35, 'entry': 'black', 'level': 0.0,
     'crowd_ok': True, 'clock': '21:24'},
    {'kind': 'clip', 'clip': GOAL2, 'in': 0.2, 'sound': 'clip', 'gain': 1.1, 'level': 0.45, 'crowd_ok': True, 'clock': '21:27',
     'speed_voice': 0.92, 'say': 'Two goals in three minutes… and Agia Sophia disappeared into smoke.'},
    {'kind': 'title', 'clip': WIDE, 'in': 2.0, 'dur': 4.8, 'sound': 'clip', 'gain': 1.1, 'level': 1.0, 'crowd_ok': True,
     'head': 'I was there', 'kicker': 'OPAP Arena · AEK 4–0 PAOK'},

    # ── 01 · a home again ────────────────────────────────────────────────────────────────────────────────────────────
    {'kind': 'chapter', 'number': 1, 'title': 'A home again', 'dur': 2.4, 'level': 0.8},
    {'kind': 'clip', 'clip': ACROPOLIS, 'in': 0.0, 'dur': 1.6, 'speed': 0.55, 'sound': 'mute', 'level': 0.6, 'clock': '18:43'},
    {'kind': 'art', 'art': 'beat:common/new-stadium-wide-kr', 'push': [1.0, 1.1], 'level': 0.55, 'min': 7.0,
     'figures': [{'art': 'cut:common/crowd-row-scarves-up-kr', 'h': 0.34, 'x': 0.5, 'y': 0.93, 'drift': [30, 0], 'at': 0.6}],
     'say': 'For nineteen years, AEK had no home of its own. In September twenty twenty-two… it finally did. Agia Sophia, in Nea Filadelfeia.'},
    {'kind': 'timeline', 'level': 0.5, 'min': 7.0,
     'timeline': {'points': HOME, 'title': 'AEK ATHENS · TEN YEARS', 'at_t': 0.5, 'step': 1.2},
     'say': 'Ten years earlier, the club had gone down. Now, in its first season back home… it was chasing a title.'},
    {'kind': 'prop', 'level': 0.55, 'min': 6.2, 'entry': 'fade', 'prop': {**TICKET, 'at_t': 0.3},
     'say': 'Wednesday, the twenty-sixth of April. PAOK at home. Four games left… and the title between AEK and Panathinaikos.'},

    # ── 02 · lights out ──────────────────────────────────────────────────────────────────────────────────────────────
    {'kind': 'chapter', 'number': 2, 'title': 'Lights out', 'dur': 2.4, 'level': 0.6},
    {'kind': 'black', 'backdrop': 'beat:common/terrace-full-kr', 'dim': 0.9, 'level': 0.35, 'min': 7.4, 'entry': 'black',
     'lights': {'at_t': 0.6, 'n': 1600, 'build': 4.5, 'region': (0.0, 0.05, 1.0, 0.7)}, 'cues': [[0.4, 'crowd-build']],
     'say': 'Before kick-off, the floodlights went off… and the stands lit the pitch themselves.'},
    {'kind': 'clip', 'clip': WIDE, 'in': 7.0, 'dur': 5.6, 'dim': 0.0, 'sound': 'clip', 'gain': 1.1, 'level': 0.6, 'crowd_ok': True,
     'clock': '21:19', 'stat': {'value': 30570, 'label': 'AT AGIA SOPHIA', 'source': 'ESPN · Wikipedia', 'at_t': 0.4, 'pos': (0.5, 0.2)}},
    {'kind': 'clip', 'clip': WIDE, 'in': 13.0, 'dur': 5.4, 'sound': 'clip', 'gain': 1.1, 'level': 0.7, 'crowd_ok': True, 'subscribe': True},

    # ── 03 · ninety minutes ──────────────────────────────────────────────────────────────────────────────────────────
    {'kind': 'chapter', 'number': 3, 'title': 'Ninety minutes', 'dur': 2.4, 'level': 0.6},
    {'kind': 'art', 'art': 'beat:common/referee-red-card-n', 'push': [1.0, 1.08], 'dim': 0.35, 'level': 0.4, 'min': 6.8,
     'red': {'name': 'KARGAS', 'minute': 'PAOK', 'at_t': 2.2}, 'cues': [[1.9, 'whistle']],
     'say': "Inside ten minutes, PAOK were down to ten. Kargas, studs on Jonsson's ankle… Straight red."},
    {'kind': 'black', 'level': 0.45, 'min': 7.2, 'entry': 'fade', 'play': G1, 'speed_voice': 0.95,
     'say': 'Twenty-one minutes. Kotarski plays it short to Schwab. Jonsson takes it off him… Steven Zuber.'},
    {'kind': 'clip', 'clip': GOAL1, 'in': 7.0, 'dur': 6.0, 'sound': 'clip', 'gain': 1.3, 'level': 0.3, 'crowd_ok': True,
     'clock': '21:24', 'doc': 'Gate 21'},
    {'kind': 'art', 'photo': PYRO, 'push': [1.0, 1.12], 'pan': [0, -60], 'level': 0.5, 'min': 5.8, 'cues': [[0.1, 'crowd-after']],
     'say': 'And Gate 21 answered… in flares.'},
    {'kind': 'art', 'photo': PYRO_BOARD, 'crop': [0.12, 0.30, 0.5, 0.42], 'push': [1.0, 1.15], 'level': 0.5, 'min': 4.6,
     'typed': {'lines': ['21:25'], 'at_t': 0.4, 'size': 52, 'pos': (0.12, 0.12)},
     'say': 'One–nil. The board says so.'},
    {'kind': 'black', 'level': 0.45, 'min': 7.0, 'entry': 'fade', 'play': G2, 'speed_voice': 0.95,
     'say': 'Three minutes later. A corner from Hajsafi. Jonsson heads it back across… Harold Moukoudi.'},
    {'kind': 'clip', 'clip': GOAL2, 'in': 0.0, 'dur': 6.4, 'sound': 'clip', 'gain': 1.3, 'level': 0.3, 'crowd_ok': True,
     'clock': '21:27', 'doc': 'Two–nil'},
    {'kind': 'clip', 'clip': HAZE, 'in': 0.5, 'sound': 'clip', 'gain': 1.0, 'level': 0.55, 'crowd_ok': True, 'clock': '21:36',
     'say': 'Ten minutes later, the smoke was still hanging over the pitch.'},
    {'kind': 'clip', 'clip': GATE, 'in': 0.6, 'sound': 'clip', 'gain': 1.15, 'level': 0.6, 'crowd_ok': True, 'clock': '21:47',
     'doc': 'Gate 21', 'blur': [[0.12, 0.80, 0.76, 0.13]],
     'say': 'Two–nil at the break. And Gate 21 kept singing… through half-time too.'},
    {'kind': 'clip', 'clip': SECOND, 'in': 0.0, 'dur': 5.0, 'sound': 'clip', 'gain': 1.1, 'level': 0.6, 'crowd_ok': True, 'clock': '22:04',
     'doc': 'Second half'},
    {'kind': 'black', 'level': 0.45, 'min': 7.6, 'entry': 'fade', 'play': G3, 'speed_voice': 0.95,
     'say': 'Seventy-seven. Paolo Fernandes hits the bar… and seconds later, Levi García. Left foot, from the edge of the box.'},
    {'kind': 'clip', 'clip': LATE, 'in': 0.0, 'dur': 6.4, 'sound': 'clip', 'gain': 1.3, 'level': 0.3, 'crowd_ok': True,
     'clock': '22:42', 'doc': 'Gate 21'},
    {'kind': 'black', 'level': 0.0, 'min': 4.0, 'cues': [[0.1, 'heart'], [0.9, 'heart']], 'lead': 1.6, 'speed_voice': 0.9,
     'typed': {'lines': ["86'"], 'at_t': 0.2, 'size': 150, 'face': NUM, 'cps': 8},
     'say': 'And Fernandes, who had been looking for one all night…'},
    {'kind': 'clip', 'kitclip': 'common/clip-ball-into-net-kr', 'in': 0.0, 'dur': 3.6, 'sound': 'mute', 'no_scope': True,
     'level': 1.0, 'cues': [[1.1, 'boom'], [1.15, 'crowd-goal']]},
    {'kind': 'art', 'art': 'beat:common/celebration-pile-kr', 'push': [1.04, 1.12], 'level': 1.0, 'min': 4.6,
     'figures': [{'art': 'cut:common/fig-celebrate-knee-slide-kr', 'h': 0.62, 'x': 0.5, 'y': 0.80, 'drift': [0, 0], 'at': 0.2, 'rise': 220}],
     'cues': [[0.2, 'crowd-after']], 'say': 'Found one.'},
    {'kind': 'black', 'level': 0.8, 'min': 4.6, 'entry': 'cut', 'board': board('4 - 0', [S1, S2, S3, S4], prev='3 - 0', minute="86'")},
    {'kind': 'black', 'backdrop': 'beat:common/terrace-full-kr', 'dim': 0.8, 'level': 0.5, 'min': 5.6,
     'stat': {'value': 18, 'label': 'SHOTS · PAOK HAD ONE', 'source': 'Sporting Life match centre', 'at_t': 0.4, 'count': 0.9},
     'say': 'Eighteen shots for AEK. One for PAOK.'},

    # ── 04 · full time ───────────────────────────────────────────────────────────────────────────────────────────────
    {'kind': 'chapter', 'number': 4, 'title': 'Full time', 'dur': 2.4, 'level': 0.5},
    {'kind': 'clip', 'clip': FT, 'in': 0.0, 'sound': 'clip', 'gain': 1.2, 'level': 0.55, 'crowd_ok': True, 'clock': '22:58',
     'speed_voice': 0.95, 'say': 'Ninety minutes on the board… four–nil.'},
    {'kind': 'clip', 'clip': CLIP, 'in': 0.0, 'dur': 4.4, 'sound': 'clip', 'gain': 1.2, 'level': 0.6, 'crowd_ok': True, 'clock': '22:59'},
    {'kind': 'black', 'level': 0.45, 'min': 6.2, 'entry': 'fade',
     'typed': {'lines': ['AEK · PANATHINAIKOS', 'LEVEL AT THE TOP'], 'at_t': 0.3, 'accent_line': 1, 'size': 64},
     'say': 'Level on points at the top. And on Sunday… Panathinaikos, away.'},

    # ── 05 · what came next ──────────────────────────────────────────────────────────────────────────────────────────
    {'kind': 'chapter', 'number': 5, 'title': 'What came next', 'dur': 2.4, 'level': 0.7},
    {'kind': 'timeline', 'level': 0.6, 'min': 8.4,
     'timeline': {'points': RUN, 'title': 'THE LAST FOUR', 'at_t': 0.6, 'step': 1.3},
     'say': 'A draw at Leoforos. A draw with Olympiacos. A win in Thessaloniki… and then, on the last night, Volos. Four–nil.'},
    {'kind': 'art', 'art': 'beat:common/trophy-lift-crowd-kr', 'push': [1.0, 1.1], 'level': 1.0, 'min': 6.4,
     'typed': {'lines': ['14 MAY 2023', 'CHAMPIONS'], 'at_t': 0.4, 'accent_line': 1, 'size': 70},
     'cues': [[0.3, 'crowd-final']], 'say': 'Champions. The thirteenth title… the first in their new home.'},
    {'kind': 'clip', 'kitclip': 'common/clip-confetti-kr', 'in': 0.0, 'dur': 6.4, 'sound': 'mute', 'no_scope': True,
     'level': 1.0, 'typed': {'lines': ['24 MAY 2023 · CUP FINAL', 'AEK 2–0 PAOK'], 'at_t': 0.5, 'accent_line': 1, 'size': 62, 'panel': True},
     'say': 'Ten days later, PAOK again — in the cup final. Two–nil. The first double since nineteen seventy-eight.'},
    {'kind': 'clip', 'clip': HOME_RIDE, 'in': 0.0, 'dur': 2.2, 'speed': 0.55, 'sound': 'mute', 'level': 0.8, 'clock': '23:48',
     'blur': [[0.0, 0.36, 0.5, 0.26]], 'speed_voice': 0.92, 'min': 3.6, 'say': 'And then… the ride home.'},
    {'kind': 'end', 'min': 5.0, 'level': 0.7, 'say': 'Were you there?'},
]

reel = [
    {'kind': 'hook', 'clip': GOAL1, 'in': 0.0, 'dur': 3.2, 'sound': 'clip', 'gain': 1.3, 'crowd_ok': True,
     'hook': 'Gate 21 on fire.', 'accent_line': 'AEK 4–0 PAOK.', 'level': 0.7},
    {'kind': 'clip', 'clip': GOAL2, 'in': 0.0, 'sound': 'clip', 'gain': 1.2, 'crowd_ok': True, 'level': 0.6, 'clock': '21:27',
     'say': 'Two goals in three minutes. The whole ground in smoke.'},
    {'kind': 'black', 'level': 0.0, 'min': 4.6, 'cues': [[0.1, 'heart'], [0.8, 'heart']],
     'typed': {'lines': ["21'", "24'", "77'", "86'"], 'at_t': 0.2, 'size': 120, 'face': NUM, 'cps': 8, 'gap': 0.3},
     'lead': 1.2, 'say': 'Twenty-one. Twenty-four. Seventy-seven. Eighty-six.'},
    {'kind': 'clip', 'clip': FT, 'in': 0.5, 'sound': 'clip', 'gain': 1.2, 'crowd_ok': True, 'level': 0.8, 'clock': '22:58',
     'say': 'Four–nil. Level at the top.'},
    {'kind': 'black', 'backdrop': 'beat:common/trophy-lift-crowd-kr', 'dim': 0.6, 'level': 1.0, 'min': 4.6,
     'typed': {'lines': ['THREE WEEKS LATER', 'THE DOUBLE'], 'at_t': 0.2, 'accent_line': 1, 'size': 70},
     'say': 'Three weeks later… the double.'},
    {'kind': 'end', 'min': 4.4, 'level': 0.7, 'say': 'Were you there?'},
]

ep = {
    'id': 'iwt-04-aek-paok-2023',
    'title': 'I WAS THERE · OPAP Arena, 26 April 2023 · AEK Athens 4–0 PAOK',
    'folder': 'aek-paok-2023',
    'drive': 'https://drive.google.com/drive/folders/15cZJoP2flSu5J0o2c4mGm6uQUxusjf3J',
    'accent': ACC,
    'music': {'track': 'atlasaudio-sports', 'gain': 0.6},
    'look': {'scope': 54, 'vignette': 0.32, 'paper': PAPER, 'vertical': 'fill'},
    'fixture': {
        'home': 'AEK Athens', 'away': 'PAOK', 'home_short': 'AEK', 'away_short': 'PAOK',
        'date_long': '26 April 2023', 'year': '2023', 'ground': 'OPAP Arena', 'city': 'Athens',
        'competition': 'Super League · play-offs, round 6', 'home_score': 4, 'away_score': 0,
        'goals': [{'side': 'home', 'name': 'Zuber', 'minute_label': "21'"}, {'side': 'home', 'name': 'Moukoudi', 'minute_label': "24'"},
                  {'side': 'home', 'name': 'García', 'minute_label': "77'"}, {'side': 'home', 'name': 'Fernandes', 'minute_label': "86'"}],
        'source': 'FAN LIFE archive · Sporting Life', 'episode': 4, 'date_iso': '2023-04-26', 'date_short': '26·4·2023',
        'score_note': 'OPAP Arena · Athens', 'kickoff': '21:00'},
    'sources': [
        {'claim': 'date, AEK 4–0 PAOK, Super League play-offs; the play-off results after it (30.4 Panathinaikos 0–0 AEK, 3.5 AEK 0–0 Olympiacos, 8.5 Aris 1–2 AEK, 14.5 AEK 4–0 Volos) and the cup final (24.5 AEK 2–0 PAOK)',
         'file': 'club-packs/aek-athens/wave-deep-history-2026-10-08.json', 'short': 'FAN LIFE archive'},
        {'claim': "scorers Zuber 21', Moukoudi 24', García 77', Fernandes 86'; shots 18–1",
         'url': 'https://sportinglife.com/football/live/160650/aek-athens-vs-paok-salonika/stats', 'short': 'Sporting Life'},
        {'claim': 'Jonsson assisted the first two goals', 'url': 'https://www.foxsports.com/soccer/greek-super-league-aek-athens-vs-paok-apr-26-2023-game-boxscore-117509',
         'short': 'Fox Sports'},
        {'claim': "Kargas sent off in the first ten minutes for studs on Jonsson's ankle; how the goals were scored; Fernandes hit the bar before García's goal; AEK and Panathinaikos level at the top after the round, Panathinaikos away next",
         'url': 'https://www.iefimerida.gr/spor/aek-paok-plei-super-league', 'short': 'iefimerida.gr'},
        {'claim': 'attendance 30,570; kick-off 20:00 CEST (21:00 Athens)', 'url': 'https://www.espn.nl/voetbal/lineups/_/wedstrijdId/667317', 'short': 'ESPN'},
        {'claim': 'attendance 30,570; Agia Sophia opened 30 September 2022, AEK\'s own home after 19 years', 'url': 'https://en.wikipedia.org/wiki/2022%E2%80%9323_AEK_Athens_F.C._season',
         'short': 'Wikipedia: 2022–23 AEK Athens season'},
        {'claim': 'before kick-off the floodlights were off and the stands lit the pitch; singing through half-time',
         'url': 'https://greekcitytimes.com/2023/04/27/american-youtuber-aek-atmosphere/', 'short': 'Greek City Times, 27.4.2023'},
        {'claim': '13th title, the first in five years', 'url': 'https://origin01-en.protothema.gr/2023/05/15/aek-wins-greek-football-championship-photos', 'short': 'Proto Thema'},
        {'claim': '13th title, the first in the new stadium, after five years', 'url': 'https://greekreporter.com/2023/05/15/aek-celebrates-13th-title-greece/', 'short': 'Greek Reporter'},
        {'claim': 'relegated in 2013, champions ten years later, first domestic double since 1978', 'url': 'https://www.brightonandhovealbion.com/news/3691282/who-are-aek-athens',
         'short': 'Brighton & Hove Albion FC'},
        {'claim': 'the 2023 cup final completed the double', 'url': 'https://www.greekherald.com.au/sports/aek-athens-defeats-paok-to-secure-historic-double-in-greek-cup-final/',
         'short': 'The Greek Herald'},
    ],
    'ipa': {'AEK': 'ˌeɪ iː kˈeɪ', 'PAOK': 'pɑːˈɒk', 'Moukoudi': 'muːkˈuːdi', 'Hajsafi': 'hɑːʤsˈɑːfi', 'Kotarski': 'kɒtˈɑːski',
            'Schwab': 'ʃvˈɑːb', 'Zuber': 'tsˈuːbə', 'Kargas': 'kˈɑːɹɡəs', 'García': 'ɡɑːɹsˈiːə', 'Agia': 'ˈɑːʝə',
            'Sophia': 'soʊfˈiːə', 'Filadelfeia': 'filɑːðˈɛlfiə', 'Nea': 'nˈɛə', 'Leoforos': 'lɛˈɔfɔɹɔs',
            'Panathinaikos': 'pænæθɪnˈaɪkɒs', 'Olympiacos': 'əlɪmpiˈɑːkɒs', 'Volos': 'vˈɒlɒs', 'Jonsson': 'jˈɔnsɔn',
            'Fernandes': 'fəɹnˈændɛs'},
    'film': {
        'beats': film,
        'thumbnail': {'at': 1.2, 'text': 'Gate 21 on fire', 'sub': 'AEK 4–0 PAOK'},
        'description': (
            "Wednesday, 26 April 2023. AEK Athens against PAOK at the new OPAP Arena, four games left in the title race. "
            "I WAS THERE — the night from the stand: a club home again after nineteen years, the floodlights off before "
            "kick-off, a red card inside ten minutes, two goals in three minutes and Gate 21 answering in flares, four "
            "goals re-drawn from the match reports, and what came after.\n\nAEK Athens 4–0 PAOK · Super League play-offs · "
            "OPAP Arena (Agia Sophia), Nea Filadelfeia. The goal plates are reconstructions from the reports listed below."),
    },
    'reel': {
        'beats': reel,
        'description': ('Gate 21 on fire. AEK Athens 4–0 PAOK, OPAP Arena, 26 April 2023 — floodlights '
                        'off before kick-off, four goals, and three weeks later the double.'),
        'post': ('Gate 21 on fire. AEK 4–0 PAOK. 💛🖤\nAEK v PAOK · OPAP Arena · 26.4.2023\n'
                 'Full film on YouTube: FanLife: Football Stories\n#AEK #AEKFC #OPAPArena #AgiaSophia #IWasThere #FANLIFE #football'),
    },
}

out = Path(__file__).resolve().parent / '2023-04-26-aek-paok.json'
out.write_text(json.dumps(ep, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(out.name, len(film), 'film beats', len(reel), 'reel beats')
