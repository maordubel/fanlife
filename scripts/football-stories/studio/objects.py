"""THE OBJECT LIBRARY — football objects drawn in one house style, for every film and every club (owner, 17.11.2026:
"a repository of universal files and pictures, and one per club … lots of PNG objects. Football atmosphere, retro,
minimalist").

Every object is drawn here, in code, as a vector: a thick ink line, flat fills in three inks (the club's colour, paper,
ink), a halftone shadow and the off-register print of an old matchday programme. One drawing, many prints:

    universal   the drawing in the house inks (a signal red) — kit/objects/<id>.svg and .png, the library the owner and
                his designer can open (`python -m studio.objects export`)
    per club    the same drawing printed in the club's own colour and second colour (`svg_for(id, palette)`), made when a
                film needs it; a colour the club's page refuses (rule 95: no rival colour) is never printed — an object
                whose meaning IS that colour (a red card on a Panathinaikos film) is not offered at all

`index.json` (written with the files) says what each object is for: the words a line says that ask for it, the
subjects and moods of the media index (studio/media_index.py), and whether it may stand for the club's colour. The
editor's VOX pass (docu/vox.py) drops the objects a sentence names onto the picture as it is said — so a line about a
ticket shows a ticket, a line about a flight shows a plane, a line about the ninetieth minute shows a stopwatch.

Nothing here is a fact: an object illustrates a word the narrator says. No object carries a crest, a sponsor, a
letter or a number of its own.
"""
from __future__ import annotations

import json
import math
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
DIR = HERE / 'kit' / 'objects'
INK, PAPER, PAPER2, SIGNAL = '#17140F', '#F4ECD8', '#E3D5B8', '#D0021B'
SW = 14   # the ink line, at 512 px

# ── drawing helpers ──────────────────────────────────────────────────────────────────────────────────────────────────
def P(d: str, fill: str = 'P', sw: float = SW, extra: str = '') -> str:
    return f'<path d="{d}" fill="{{{fill}}}" stroke="{{K}}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round" {extra}/>'


def C(cx, cy, r, fill='P', sw=SW) -> str:
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{{{fill}}}" stroke="{{K}}" stroke-width="{sw}"/>'


def R(x, y, w, h, fill='P', rx=10, sw=SW, extra='') -> str:
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{{{fill}}}" stroke="{{K}}" stroke-width="{sw}" {extra}/>'


def L(x1, y1, x2, y2, sw=SW, col='K') -> str:
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{{{col}}}" stroke-width="{sw}" stroke-linecap="round"/>'


def DOTS(d: str) -> str:
    """A halftone shadow over a shape (no stroke)."""
    return f'<path d="{d}" fill="url(#dots)" stroke="none"/>'


def star_d(cx, cy, r, k=5, inner=0.45, rot=-90) -> str:
    pts = []
    for i in range(2 * k):
        a = math.radians(rot + i * 180 / k)
        rr = r if i % 2 == 0 else r * inner
        pts.append(f'{cx + rr * math.cos(a):.1f} {cy + rr * math.sin(a):.1f}')
    return 'M' + ' L'.join(pts) + ' Z'


# ── the drawings (512 × 512, centred, the ground line near y 470) ────────────────────────────────────────────────────
def ball():
    """The classic ball: a black pentagon in the middle, five around it cut by the edge, the seams between."""
    cx, cy, R0 = 256, 256, 190
    pent = lambda x, y, r, rot=-90: star_d(x, y, r, 5, 1.0, rot)  # noqa: E731
    out = C(cx, cy, R0)
    out += P(pent(cx, cy, 58), 'K', 8)
    for i in range(5):
        a = math.radians(-90 + 72 * i + 36)
        x, y = cx + 158 * math.cos(a), cy + 158 * math.sin(a)
        out += f'<clipPath id="bc{i}"><circle cx="{cx}" cy="{cy}" r="{R0 - 7}"/></clipPath>'
        out += f'<g clip-path="url(#bc{i})">' + P(pent(x, y, 52, -90 + 72 * i + 36 + 180), 'K', 8) + '</g>'
        a0 = math.radians(-90 + 72 * i)
        out += L(cx + 58 * math.cos(a0), cy + 58 * math.sin(a0), cx + 120 * math.cos(a0), cy + 120 * math.sin(a0), 9)
    out += DOTS(f'M{cx} {cy - R0} A{R0} {R0} 0 0 1 {cx} {cy + R0} A{R0 * 0.75:.0f} {R0} 0 0 0 {cx} {cy - R0}Z')
    return out + C(cx, cy, R0, 'none')

def boot():
    d = 'M120 150 L250 150 L262 250 Q300 300 400 310 Q452 318 452 362 L452 392 L96 392 Q78 392 82 360 L104 170 Q106 150 120 150Z'
    studs = ''.join(R(x, 392, 26, 34, 'K', 6, 8) for x in (130, 200, 300, 380))
    laces = ''.join(L(170 + 22 * i, 240 + 14 * i, 240 + 22 * i, 230 + 14 * i, 10) for i in range(4))
    return P(d) + DOTS('M96 330 L452 350 L452 392 L96 392Z') + P('M104 170 L250 170', 'P', 10) + laces + studs + P('M300 300 Q360 318 452 330 L452 362 L300 340Z', 'A', 10)


def whistle():
    return (P('M110 230 A90 90 0 1 0 290 300 L420 300 L420 220 L250 220 Q210 190 160 200 Q130 210 110 230Z', 'A')
            + C(190, 290, 34, 'P', 10) + R(380, 200, 70, 40, 'K', 8, 8) + L(110, 230, 60, 150, 10) + L(60, 150, 70, 110, 10)
            + DOTS('M120 330 A90 90 0 0 0 290 300 L290 330 Z'))


def card():
    return (f'<g transform="rotate(-14 256 256)">{R(150, 92, 210, 300, "A", 18)}{DOTS("M150 300 L360 250 L360 392 L150 392Z")}'
            f'{P("M180 120 L300 120", "none", 10, chr(32) + "stroke=" + chr(34) + "{P}" + chr(34) + " opacity=" + chr(34) + "0.7" + chr(34))}</g>')

def trophy():
    cup = 'M156 90 L356 90 L346 210 Q336 300 256 312 Q176 300 166 210Z'
    return (P('M156 120 Q86 120 96 190 Q106 240 176 246', 'none', 16) + P('M356 120 Q426 120 416 190 Q406 240 336 246', 'none', 16)
            + P(cup, 'A') + DOTS('M300 96 L346 96 L338 210 Q330 280 280 300Z') + R(232, 312, 48, 60, 'A', 6)
            + R(176, 372, 160, 40, 'P', 8) + R(146, 412, 220, 48, 'K', 8) + P(star_d(256, 190, 44), 'P', 8))


def medal():
    return (P('M196 70 L256 230 L316 70 L276 70 L256 130 L236 70Z', 'A', 10) + P('M156 70 L236 70 L272 170 L230 230Z', 'P', 10)
            + P('M356 70 L276 70 L240 170 L282 230Z', 'A', 10) + C(256, 330, 112, 'A') + C(256, 330, 76, 'P', 10)
            + P(star_d(256, 330, 50), 'A', 8) + DOTS('M256 218 A112 112 0 0 1 256 442 A80 112 0 0 0 256 218Z'))


def scarf():
    body = 'M70 200 Q256 120 442 200 L442 280 Q256 200 70 280Z'
    stripes = ''.join(f'<path d="M{x} {205 - 0.0005 * (x - 256) ** 2 * -1 - 40} L{x + 46} {200 - 40} L{x + 46} {280 - 40} L{x} {285 - 40}Z" fill="{{A}}" stroke="none"/>'
                      for x in ())
    tails = (P('M70 280 L70 420 L130 420 L130 260', 'A') + P('M442 280 L442 420 L382 420 L382 260', 'A')
             + ''.join(L(x, 420, x, 452, 8) for x in (80, 100, 120, 392, 412, 432)))
    bands = ''.join(P(f'M{x} {172 if 150 < x < 362 else 190} L{x + 40} {168 if 150 < x < 362 else 184} L{x + 40} {248 if 150 < x < 362 else 264} L{x} {252 if 150 < x < 362 else 270}Z', 'A', 0)
                    for x in (110, 206, 302, 398))
    return tails + P(body, 'P') + bands + P(body, 'none') + stripes + DOTS('M70 250 Q256 170 442 250 L442 280 Q256 200 70 280Z')


def flag():
    return (L(130, 60, 130, 470, 18) + C(130, 56, 16, 'A', 10)
            + P('M136 80 Q240 50 300 90 Q360 130 440 100 L440 280 Q360 310 300 270 Q240 230 136 260Z', 'A')
            + DOTS('M300 90 Q360 130 440 100 L440 280 Q360 310 300 270Z') + P('M136 170 Q240 140 300 180 Q360 220 440 190', 'none', 10))


def ticket():
    d = 'M70 160 L442 160 L442 220 A36 36 0 0 0 442 292 L442 352 L70 352 L70 292 A36 36 0 0 0 70 220Z'
    return (f'<g transform="rotate(-8 256 256)">{P(d)}{R(110, 196, 200, 26, "A", 4, 0)}{R(110, 238, 150, 18, "K", 4, 0)}{R(110, 268, 180, 18, "K", 4, 0)}'
            f'{L(340, 176, 340, 336, 6)}{"".join(C(340, y, 4, "K", 0) for y in range(188, 336, 22))}{R(362, 206, 50, 100, "A", 6, 8)}</g>')


def programme():
    return (R(130, 70, 250, 350, 'P', 6) + R(150, 90, 210, 120, 'A', 4, 10) + P(star_d(255, 150, 38), 'P', 8)
            + R(150, 232, 210, 22, 'K', 4, 0) + R(150, 270, 160, 14, 'K', 4, 0) + R(150, 298, 190, 14, 'K', 4, 0)
            + R(150, 340, 90, 52, 'A', 4, 8) + DOTS('M330 70 L380 70 L380 420 L330 420Z') + P('M380 80 L400 92 L400 432 L142 432 L130 420', 'none', 10))


def newspaper():
    return (f'<g transform="rotate(-6 256 256)">{R(80, 90, 352, 320, "P", 4)}{R(104, 110, 304, 40, "K", 2, 0)}{R(104, 164, 150, 120, "A", 2, 8)}'
            + ''.join(R(272, y, 136, 12, 'K', 2, 0) for y in (166, 190, 214, 238, 262))
            + ''.join(R(104, y, 304, 12, 'K', 2, 0) for y in (304, 328, 352, 376)) + '</g>'
            + P('M432 100 Q470 240 440 420', 'none', 10))


def radio():
    return (R(80, 170, 352, 230, 'A', 30) + L(150, 170, 330, 70, 12) + C(330, 70, 12, 'K', 0)
            + C(176, 285, 72, 'P', 12) + ''.join(L(126, y, 226, y, 8) for y in (255, 280, 305)) + R(282, 220, 120, 50, 'P', 8, 10)
            + L(300, 230, 300, 260, 6) + C(310, 330, 20, 'K', 8) + C(372, 330, 20, 'K', 8) + DOTS('M80 340 L432 340 L432 400 L80 400Z'))


def tv():
    return (R(80, 130, 352, 270, 'K', 30) + R(110, 158, 250, 214, 'P', 24, 10) + R(130, 180, 210, 170, 'A', 18, 0)
            + DOTS('M130 280 L340 230 L340 350 L130 350Z') + L(200, 130, 150, 60, 10) + L(310, 130, 360, 60, 10)
            + C(396, 200, 16, 'P', 8) + C(396, 250, 16, 'P', 8) + R(130, 400, 40, 50, 'K', 6) + R(342, 400, 40, 50, 'K', 6))


def stopwatch():
    hand = 'M256 290 L256 170'
    ticks = ''.join(L(256 + 120 * math.cos(math.radians(a)), 290 + 120 * math.sin(math.radians(a)),
                      256 + 140 * math.cos(math.radians(a)), 290 + 140 * math.sin(math.radians(a)), 10) for a in range(-90, 270, 30))
    return (R(228, 60, 56, 50, 'A', 8) + R(240, 110, 32, 30, 'K', 4, 0) + L(380, 150, 410, 120, 16)
            + C(256, 290, 170, 'A') + C(256, 290, 150, 'P', 10) + ticks + P('M256 290 L256 152 A138 138 0 0 1 372 230Z', 'A', 0, 'opacity="0.9"')
            + P(hand, 'none', 14) + L(256, 290, 330, 330, 12) + C(256, 290, 14, 'K', 0))


def scoreboard():
    return (R(60, 120, 392, 230, 'K', 18) + R(90, 150, 140, 120, 'A', 10, 8) + R(282, 150, 140, 120, 'A', 10, 8)
            + C(256, 190, 9, 'P', 0) + C(256, 230, 9, 'P', 0) + R(90, 290, 332, 34, 'P', 6, 0)
            + L(160, 350, 160, 460, 18) + L(352, 350, 352, 460, 18) + DOTS('M90 210 L230 210 L230 270 L90 270Z M282 210 L422 210 L422 270 L282 270Z'))


def goal():
    net = ''.join(L(x, 150, x - 30 * ((x - 256) / 200), 400, 5) for x in range(76, 450, 34)) + ''.join(L(70, y, 442, y, 5) for y in range(180, 400, 34))
    return (f'<g opacity="0.55">{net}</g>' + L(60, 140, 452, 140, 22) + L(60, 140, 60, 420, 22) + L(452, 140, 452, 420, 22)
            + L(60, 140, 100, 200, 10) + L(452, 140, 412, 200, 10) + L(30, 430, 482, 430, 12) + C(330, 360, 44, 'P', 10) + P(star_d(330, 360, 16, 5, 1), 'K', 4))


def corner_flag():
    return (L(200, 70, 220, 440, 14) + P('M204 80 L380 130 L210 200Z', 'A') + DOTS('M300 108 L380 130 L300 160Z')
            + P('M60 450 Q140 380 220 440', 'none', 10) + L(40, 452, 470, 452, 12) + P('M220 440 Q330 390 470 400', 'none', 8, 'stroke-dasharray="20 18"'))


def floodlight():
    lamps = ''.join(R(150 + 56 * i, 70 + 50 * j, 44, 38, 'P', 6, 8) for i in range(4) for j in range(2))
    return (R(132, 54, 248, 120, 'K', 12) + lamps + P('M240 174 L272 174 L310 470 L202 470Z', 'A') + L(210, 260, 300, 330, 8) + L(300, 260, 210, 330, 8)
            + L(220, 350, 296, 420, 8) + L(296, 350, 220, 420, 8) + P('M150 70 L40 10 M362 70 L472 10', 'none', 6, 'stroke-dasharray="10 12" opacity="0.6"'))


def stadium():
    return (P('M40 300 Q256 170 472 300 L472 400 Q256 300 40 400Z', 'A') + P('M40 400 Q256 300 472 400 L472 440 Q256 360 40 440Z', 'K', 8)
            + P('M110 330 Q256 280 402 330 L402 372 Q256 330 110 372Z', 'P', 8) + DOTS('M40 300 Q256 170 472 300 L472 330 Q256 210 40 330Z')
            + L(100, 280, 100, 160, 10) + R(76, 130, 48, 34, 'P', 4, 8) + L(412, 280, 412, 160, 10) + R(388, 130, 48, 34, 'P', 4, 8))


def turnstile():
    return (R(130, 140, 160, 320, 'A', 10) + R(150, 170, 120, 70, 'P', 6, 10) + C(330, 250, 26, 'K', 0)
            + L(330, 250, 450, 210, 16) + L(330, 250, 430, 330, 16) + L(330, 250, 350, 380, 16) + L(60, 462, 470, 462, 12) + DOTS('M130 360 L290 360 L290 460 L130 460Z'))


def megaphone():
    return (P('M110 210 L300 120 L300 380 L110 300Z', 'A') + R(70, 200, 50, 110, 'K', 10) + P('M300 120 Q350 250 300 380', 'P')
            + P('M170 300 L190 400 L240 400 L222 320', 'P', 12) + P('M360 160 Q400 250 360 340 M400 120 Q460 250 400 380', 'none', 12) + DOTS('M110 260 L300 260 L300 380 L110 300Z'))


def drum():
    return (P('M96 170 L96 370 Q256 450 416 370 L416 170', 'A') + '<ellipse cx="256" cy="170" rx="160" ry="54" fill="{P}" stroke="{K}" stroke-width="14"/>'
            + ''.join(L(96 + 64 * i, 210 + (20 if 0 < i < 5 else 0), 128 + 64 * i, 380 - (10 if 0 < i < 5 else 30), 8) for i in range(5))
            + L(320, 60, 210, 150, 14) + C(320, 60, 18, 'K', 0) + L(420, 80, 300, 160, 14) + C(420, 80, 18, 'K', 0) + DOTS('M300 200 L416 170 L416 370 Q360 400 300 410Z'))


def flare():
    return (R(220, 250, 72, 210, 'A', 10) + R(220, 250, 72, 30, 'K', 6) + P('M256 250 Q190 180 230 110 Q250 150 262 120 Q270 70 250 30 Q340 100 310 190 Q300 230 256 250Z', 'P', 12)
            + P('M256 240 Q226 200 246 160 Q262 190 276 170 Q290 210 256 240Z', 'A', 8) + '<g opacity="0.5">' + C(170, 120, 30, 'P', 6) + C(350, 70, 24, 'P', 6) + C(380, 160, 18, 'P', 6) + '</g>')


def bus():
    return (R(50, 150, 412, 220, 'A', 26) + ''.join(R(80 + 76 * i, 180, 60, 70, 'P', 8, 10) for i in range(5))
            + R(50, 290, 412, 26, 'P', 0, 0) + C(140, 380, 40, 'K') + C(140, 380, 14, 'P', 0) + C(372, 380, 40, 'K') + C(372, 380, 14, 'P', 0)
            + R(436, 200, 26, 40, 'P', 4, 8) + DOTS('M50 316 L462 316 L462 370 L50 370Z') + L(20, 430, 490, 430, 10))


def train():
    return (P('M80 140 Q80 90 140 90 L380 90 Q440 90 440 160 L440 360 L80 360Z', 'A') + R(120, 130, 120, 90, 'P', 10, 10) + R(280, 130, 120, 90, 'P', 10, 10)
            + R(80, 250, 360, 26, 'P', 0, 0) + C(170, 316, 18, 'P', 8) + C(350, 316, 18, 'P', 8) + R(130, 360, 260, 40, 'K', 6)
            + L(60, 440, 452, 440, 12) + ''.join(L(x, 400, x - 30, 440, 10) for x in (150, 230, 310, 390)) + DOTS('M80 276 L440 276 L440 360 L80 360Z'))


def plane():
    return (P('M60 270 Q60 238 110 236 L420 226 Q470 228 470 256 Q470 282 420 286 L110 296 Q60 298 60 270Z', 'P')
            + P('M240 250 L330 110 L372 110 L320 254Z', 'A') + P('M250 290 L320 420 L362 420 L330 286Z', 'A') + P('M90 250 L60 170 L100 170 L140 246Z', 'A')
            + ''.join(C(170 + 40 * i, 262, 9, 'K', 0) for i in range(6)) + DOTS('M110 276 L420 266 Q460 268 460 270 L420 286 L110 296Z') + P('M20 330 Q120 310 200 340', 'none', 6, 'stroke-dasharray="14 14" opacity="0.6"'))


def suitcase():
    return (R(176, 90, 160, 70, 'none', 26, 16) + R(80, 150, 352, 270, 'A', 24) + R(80, 230, 352, 30, 'P', 0, 0)
            + R(130, 300, 110, 70, 'P', 10, 10) + P(star_d(185, 335, 24), 'A', 6) + C(380, 340, 26, 'P', 10) + DOTS('M300 150 L432 150 L432 420 L300 420Z'))


def calendar():
    return (R(90, 110, 332, 320, 'P', 18) + R(90, 110, 332, 80, 'A', 18) + L(170, 80, 170, 140, 18) + L(342, 80, 342, 140, 18)
            + ''.join(R(120 + 60 * (i % 5), 220 + 52 * (i // 5), 36, 30, 'K' if i != 7 else 'A', 4, 0) for i in range(15)) + DOTS('M330 190 L422 190 L422 430 L330 430Z'))


def pin():
    return (P('M256 470 Q140 320 140 220 A116 116 0 1 1 372 220 Q372 320 256 470Z', 'A') + C(256, 216, 48, 'P', 12)
            + DOTS('M290 110 A116 116 0 0 1 372 220 Q372 320 256 470 Q330 320 330 220 A80 110 0 0 0 290 110Z') + '<ellipse cx="256" cy="476" rx="80" ry="14" fill="{K}" opacity="0.25"/>')


def contract():
    return (f'<g transform="rotate(-5 256 256)">{R(110, 70, 270, 360, "P", 6)}' + ''.join(R(140, y, 210, 12, 'K', 2, 0) for y in (110, 140, 170, 200, 230, 260))
            + P('M150 340 Q190 300 220 340 Q250 380 280 330', 'none', 8) + L(140, 370, 350, 370, 6) + '</g>'
            + P('M330 430 L440 210 L470 226 L362 444 L320 460Z', 'A', 12) + L(440, 210, 470, 226, 12))


def money():
    """A stack of coins and a banknote: the money of the story, in no one currency."""
    out = R(150, 250, 290, 150, 'P', 12) + C(295, 325, 46, 'A', 10) + R(170, 270, 40, 24, 'A', 4, 0) + R(380, 356, 40, 24, 'A', 4, 0)
    for k in range(5):
        y = 400 - 34 * k
        out += f'<ellipse cx="160" cy="{y}" rx="92" ry="30" fill="{{A}}" stroke="{{K}}" stroke-width="12"/>'
    out += '<ellipse cx="160" cy="264" rx="92" ry="30" fill="{P}" stroke="{K}" stroke-width="12"/>' + C(160, 264, 18, 'A', 6)
    return out + DOTS('M200 280 L250 270 L250 420 L200 430Z')

def crown():
    return (P('M90 360 L70 150 L170 250 L256 110 L342 250 L442 150 L422 360Z', 'A') + R(90, 360, 332, 56, 'P', 6)
            + C(70, 150, 20, 'P', 10) + C(256, 110, 20, 'P', 10) + C(442, 150, 20, 'P', 10) + C(180, 388, 12, 'A', 6) + C(256, 388, 12, 'A', 6) + C(332, 388, 12, 'A', 6)
            + DOTS('M300 210 L342 250 L442 150 L422 360 L300 360Z'))


def star():
    return P(star_d(256, 260, 200, 5, 0.46), 'A') + DOTS(star_d(296, 300, 120, 5, 0.46)) + P(star_d(256, 260, 90, 5, 0.46), 'P', 8)


def bolt():
    return P('M300 40 L120 290 L240 290 L190 470 L400 200 L270 200 L330 40Z', 'A') + DOTS('M270 200 L400 200 L190 470Z')


def heart():
    d = 'M256 440 Q60 300 70 180 Q86 90 176 90 Q230 92 256 150 Q282 92 336 90 Q426 90 442 180 Q452 300 256 440Z'
    return P(d, 'A') + DOTS('M300 120 Q420 110 420 200 Q410 300 256 420 Q370 300 360 200Z') + P('M140 160 Q150 130 180 126', 'none', 10, 'stroke="{P}"')


def broken_heart():
    d = 'M256 440 Q60 300 70 180 Q86 90 176 90 Q230 92 256 150 L226 230 L280 290 L240 360 L256 440Z'
    d2 = 'M268 440 L256 360 L300 290 L244 230 L270 150 Q296 92 350 90 Q440 90 456 180 Q466 300 268 440Z'
    return f'<g transform="rotate(-6 200 300)">{P(d, "A")}</g><g transform="rotate(8 340 300) translate(14 10)">{P(d2, "A")}{DOTS("M330 110 Q440 110 440 200 Q430 300 290 410Z")}</g>'


def arrow_up():
    return P('M256 50 L440 250 L330 250 L330 460 L182 460 L182 250 L72 250Z', 'A') + DOTS('M256 50 L440 250 L330 250 L330 460 L280 460 L280 250Z')


def arrow_down():
    return P('M256 462 L440 262 L330 262 L330 52 L182 52 L182 262 L72 262Z', 'A') + DOTS('M256 462 L440 262 L330 262 L330 52 L280 52 L280 262Z')


def question():
    return (P('M170 180 Q170 80 260 78 Q350 80 352 170 Q352 230 296 260 Q270 276 270 320 L270 340 L212 340 L212 310 Q212 250 262 222 Q296 202 294 170 Q292 136 260 136 Q228 136 226 180Z', 'A')
            + C(242, 410, 36, 'A'))


def exclaim():
    return P('M210 60 L302 60 L286 330 L226 330Z', 'A') + C(256, 410, 40, 'A') + DOTS('M260 60 L302 60 L286 330 L260 330Z')


def gloves():
    g = 'M120 420 L110 260 Q100 180 130 140 L150 170 L160 90 Q170 70 190 80 L196 170 L210 70 Q226 54 244 70 L240 180 L262 96 Q280 84 294 102 L276 220 Q310 200 330 230 L270 330 L260 420Z'
    return f'<g transform="rotate(-10 200 260)">{P(g, "A")}{R(110, 380, 160, 60, "P", 10, 12)}{DOTS("M200 220 L276 220 L260 420 L200 420Z")}</g>' + \
        f'<g transform="translate(150 20) rotate(12 200 260)">{P(g, "P")}{R(110, 380, 160, 60, "A", 10, 12)}</g>'


def penalty():
    return ('<ellipse cx="256" cy="380" rx="210" ry="62" fill="{A}" stroke="{K}" stroke-width="14"/>'
            + '<ellipse cx="256" cy="380" rx="26" ry="10" fill="{P}" stroke="{K}" stroke-width="6"/>'
            + '<ellipse cx="256" cy="372" rx="74" ry="14" fill="{K}" opacity="0.28"/>'
            + f'<g transform="translate(256 260) scale(0.42) translate(-256 -256)">{ball()}</g>'
            + P('M80 380 Q256 300 432 380', 'none', 8, 'stroke-dasharray="18 16" opacity="0.6"'))

def tactics():
    xs = [(150, 160), (150, 350), (256, 120), (256, 255), (256, 390), (360, 200), (360, 310)]
    return (R(60, 80, 392, 300, 'A', 10) + R(84, 104, 344, 252, 'none', 4, 8, 'stroke="{P}"') + L(256, 104, 256, 356, 8, 'P') + f'<circle cx="256" cy="230" r="44" fill="none" stroke="{{P}}" stroke-width="8"/>'
            + ''.join(C(x, y, 16, 'P', 6) for x, y in xs) + P('M150 160 Q210 120 256 160', 'none', 8, 'stroke="{P}" stroke-dasharray="12 10"')
            + L(180, 380, 150, 470, 14) + L(332, 380, 362, 470, 14) + DOTS('M300 104 L428 104 L428 356 L300 356Z'))


def hourglass():
    return (R(130, 60, 252, 40, 'A', 8) + R(130, 412, 252, 40, 'A', 8) + P('M160 100 L352 100 Q352 210 270 256 Q352 302 352 412 L160 412 Q160 302 242 256 Q160 210 160 100Z', 'P')
            + P('M196 160 L316 160 Q300 220 256 244 Q212 220 196 160Z', 'A', 0) + P('M180 400 Q256 330 332 400Z', 'A', 0) + L(256, 256, 256, 380, 6, 'A'))


def rosette():
    pet = ''.join(f'<ellipse cx="{256 + 120 * math.cos(math.radians(a)):.1f}" cy="{220 + 120 * math.sin(math.radians(a)):.1f}" rx="56" ry="36" '
                  f'transform="rotate({a} {256 + 120 * math.cos(math.radians(a)):.1f} {220 + 120 * math.sin(math.radians(a)):.1f})" fill="{{{"A" if i % 2 else "P"}}}" stroke="{{K}}" stroke-width="10"/>'
                  for i, a in enumerate(range(0, 360, 30)))
    return (P('M200 300 L150 470 L210 440 L240 480 L256 320Z', 'A', 10) + P('M312 300 L362 470 L302 440 L272 480 L256 320Z', 'A', 10) + pet + C(256, 220, 86, 'A') + C(256, 220, 54, 'P', 10))


def camera():
    return (R(70, 170, 372, 240, 'K', 24) + R(180, 120, 140, 60, 'K', 10) + C(256, 290, 96, 'P') + C(256, 290, 64, 'A', 10) + C(236, 270, 16, 'P', 0)
            + R(96, 196, 60, 30, 'A', 6, 0) + C(380, 210, 16, 'P', 6))


def microphone():
    return (R(196, 60, 120, 210, 'A', 60) + ''.join(L(210, y, 302, y, 6, 'P') for y in (110, 140, 170, 200)) + P('M150 210 Q150 320 256 320 Q362 320 362 210', 'none', 14)
            + L(256, 320, 256, 420, 16) + R(176, 420, 160, 36, 'K', 8) + DOTS('M260 60 Q316 70 316 130 L316 210 Q316 270 260 270Z'))


def boots_pair():
    return f'<g transform="translate(-60 -40) scale(0.85)">{boot()}</g><g transform="translate(120 90) scale(0.8)">{boot()}</g>'


def shirt():
    d = 'M180 70 Q256 110 332 70 L452 130 L412 230 L362 210 L362 450 L150 450 L150 210 L100 230 L60 130Z'
    return P(d, 'A') + P('M180 70 Q256 140 332 70', 'P', 12) + DOTS('M300 120 L362 150 L362 450 L300 450Z') + R(150, 270, 212, 30, 'P', 0, 0)


OBJECTS: dict[str, dict] = {
    # id: drawing, the words that ask for it, media-index subjects, moods, and whether its meaning is a fixed colour
    'ball': {'draw': ball, 'words': ('ball', 'football', 'kick', 'kicked', 'shot', 'struck', 'volley', 'header', 'headed'), 'subjects': ('ball', 'goal'), 'moods': ('tension', 'joy')},
    'boot': {'draw': boot, 'words': ('boot', 'boots', 'left foot', 'right foot', 'kit'), 'subjects': ('ball',), 'moods': ('calm',)},
    'boots-pair': {'draw': boots_pair, 'words': ('boots', 'retired', 'hung up'), 'subjects': ('ball',), 'moods': ('calm',)},
    'shirt': {'draw': shirt, 'words': ('shirt', 'shirts', 'jersey', 'colours', 'kit', 'number'), 'subjects': ('flag',), 'moods': ('joy', 'defiance')},
    'whistle': {'draw': whistle, 'words': ('whistle', 'referee', 'final whistle', 'kick-off', 'kickoff', 'half-time', 'full-time', 'full time'), 'subjects': ('referee',), 'moods': ('tension',)},
    'card': {'draw': card, 'words': ('red card', 'sent off', 'sending off', 'dismissed', 'sent-off', 'ten men'), 'subjects': ('referee',), 'moods': ('tension', 'grief'), 'colour': 'red'},
    'trophy': {'draw': trophy, 'words': ('trophy', 'cup', 'title', 'champions', 'championship', 'final', 'silverware', 'double', 'won the'), 'subjects': ('trophy',), 'moods': ('joy',)},
    'medal': {'draw': medal, 'words': ('medal', 'medals', 'winners', 'runners-up', 'podium'), 'subjects': ('trophy',), 'moods': ('joy',)},
    'scarf': {'draw': scarf, 'words': ('scarf', 'scarves', 'supporters', 'fans', 'terrace', 'terraces', 'we'), 'subjects': ('flag', 'crowd'), 'moods': ('defiance', 'joy')},
    'flag': {'draw': flag, 'words': ('flag', 'flags', 'banner', 'banners', 'tifo', 'colours'), 'subjects': ('flag',), 'moods': ('defiance',)},
    'ticket': {'draw': ticket, 'words': ('ticket', 'tickets', 'sold out', 'sell-out', 'entry', 'season ticket'), 'subjects': ('archive',), 'moods': ('calm', 'tension')},
    'programme': {'draw': programme, 'words': ('programme', 'program', 'matchday', 'souvenir'), 'subjects': ('archive',), 'moods': ('calm',)},
    'newspaper': {'draw': newspaper, 'words': ('newspaper', 'newspapers', 'headline', 'headlines', 'press', 'papers', 'reported', 'wrote', 'front page'), 'subjects': ('newspaper',), 'moods': ('calm',)},
    'radio': {'draw': radio, 'words': ('radio', 'commentary', 'commentator', 'listened', 'transistor'), 'subjects': ('archive',), 'moods': ('calm', 'tension')},
    'tv': {'draw': tv, 'words': ('television', 'tv', 'broadcast', 'watched', 'screen', 'live'), 'subjects': ('archive',), 'moods': ('calm',)},
    'camera': {'draw': camera, 'words': ('camera', 'photograph', 'photo', 'picture', 'photographers'), 'subjects': ('archive',), 'moods': ('calm',)},
    'microphone': {'draw': microphone, 'words': ('microphone', 'interview', 'said', 'told', 'press conference', 'speech'), 'subjects': ('newspaper',), 'moods': ('calm',)},
    'stopwatch': {'draw': stopwatch, 'words': ('minute', 'minutes', 'clock', 'seconds', 'stoppage', 'injury time', 'extra time', 'late', 'time'), 'subjects': ('clock',), 'moods': ('tension',)},
    'hourglass': {'draw': hourglass, 'words': ('waited', 'wait', 'waiting', 'years', 'decades', 'generation', 'long', 'drought'), 'subjects': ('clock',), 'moods': ('tension', 'calm')},
    'calendar': {'draw': calendar, 'words': ('season', 'date', 'days', 'weeks', 'months', 'fixture', 'fixtures', 'schedule', 'weekend'), 'subjects': ('clock',), 'moods': ('calm',)},
    'scoreboard': {'draw': scoreboard, 'words': ('score', 'scoreline', 'scoreboard', 'result', 'results', 'lead', 'level', 'draw', 'drew'), 'subjects': ('clock',), 'moods': ('tension',)},
    'goal': {'draw': goal, 'words': ('goal', 'goals', 'net', 'scored', 'scoring', 'crossbar', 'post', 'woodwork', 'equaliser', 'equalizer', 'winner'), 'subjects': ('goal',), 'moods': ('joy', 'tension')},
    'penalty': {'draw': penalty, 'words': ('penalty', 'penalties', 'spot', 'shootout', 'spot-kick'), 'subjects': ('goal',), 'moods': ('tension',)},
    'gloves': {'draw': gloves, 'words': ('keeper', 'goalkeeper', 'save', 'saved', 'saves', 'clean sheet'), 'subjects': ('keeper',), 'moods': ('tension',)},
    'corner-flag': {'draw': corner_flag, 'words': ('corner', 'corners', 'touchline', 'wing', 'winger'), 'subjects': ('ball',), 'moods': ('tension',)},
    'tactics': {'draw': tactics, 'words': ('tactics', 'manager', 'coach', 'formation', 'system', 'plan', 'dugout', 'bench'), 'subjects': ('bench',), 'moods': ('tension', 'calm')},
    'floodlight': {'draw': floodlight, 'words': ('floodlights', 'floodlight', 'night', 'evening', 'under the lights'), 'subjects': ('stadium', 'night'), 'moods': ('tension',)},
    'stadium': {'draw': stadium, 'words': ('stadium', 'ground', 'arena', 'home', 'at home', 'capacity', 'crowd'), 'subjects': ('stadium',), 'moods': ('defiance', 'calm')},
    'turnstile': {'draw': turnstile, 'words': ('turnstile', 'turnstiles', 'gates', 'queue', 'attendance', 'thousands'), 'subjects': ('stadium', 'crowd'), 'moods': ('calm',)},
    'megaphone': {'draw': megaphone, 'words': ('chant', 'chants', 'chanted', 'sang', 'songs', 'song', 'singing', 'capo', 'roar', 'shouted'), 'subjects': ('crowd',), 'moods': ('defiance', 'joy')},
    'drum': {'draw': drum, 'words': ('drum', 'drums', 'ultras', 'beat of'), 'subjects': ('crowd',), 'moods': ('defiance',)},
    'flare': {'draw': flare, 'words': ('flare', 'flares', 'pyro', 'smoke', 'fireworks', 'torches'), 'subjects': ('pyro',), 'moods': ('defiance', 'joy')},
    'bus': {'draw': bus, 'words': ('bus', 'coach trip', 'away day', 'away trip', 'travelled', 'convoy', 'parade'), 'subjects': ('travel',), 'moods': ('defiance', 'joy')},
    'train': {'draw': train, 'words': ('train', 'trains', 'station', 'railway', 'rail'), 'subjects': ('travel',), 'moods': ('calm',)},
    'plane': {'draw': plane, 'words': ('plane', 'flight', 'flew', 'flying', 'airport', 'abroad', 'europe', 'european'), 'subjects': ('travel',), 'moods': ('calm', 'tension')},
    'suitcase': {'draw': suitcase, 'words': ('away', 'trip', 'journey', 'travel', 'travelling', 'hotel', 'left for', 'moved'), 'subjects': ('travel',), 'moods': ('calm',)},
    'pin': {'draw': pin, 'words': ('city', 'town', 'capital', 'where', 'country', 'map', 'there'), 'subjects': ('map', 'city'), 'moods': ('calm',)},
    'contract': {'draw': contract, 'words': ('signed', 'signing', 'contract', 'transfer', 'deal', 'joined', 'bought', 'sold', 'loan'), 'subjects': ('bench',), 'moods': ('calm',)},
    'money': {'draw': money, 'words': ('money', 'fee', 'million', 'millions', 'euros', 'pounds', 'dollars', 'shekels', 'budget', 'debt', 'paid', 'price', 'cost'), 'subjects': ('archive',), 'moods': ('calm',)},
    'crown': {'draw': crown, 'words': ('king', 'kings', 'legend', 'legends', 'greatest', 'crowned', 'ruled', 'throne'), 'subjects': ('trophy',), 'moods': ('joy',)},
    'star': {'draw': star, 'words': ('star', 'stars', 'hero', 'heroes', 'icon', 'idol', 'best'), 'subjects': ('trophy',), 'moods': ('joy',)},
    'bolt': {'draw': bolt, 'words': ('suddenly', 'shock', 'stunned', 'stunning', 'thunder', 'electric', 'lightning', 'out of nowhere', 'blow'), 'subjects': (), 'moods': ('tension',)},
    'heart': {'draw': heart, 'words': ('love', 'loved', 'heart', 'hearts', 'passion', 'forever', 'belong'), 'subjects': ('crowd',), 'moods': ('joy', 'calm')},
    'broken-heart': {'draw': broken_heart, 'words': ('heartbreak', 'heartbroken', 'broke', 'broken', 'tears', 'cried', 'pain', 'hurt', 'agony'), 'subjects': ('despair',), 'moods': ('grief',)},
    'arrow-up': {'draw': arrow_up, 'words': ('rise', 'rose', 'climbed', 'climb', 'up', 'promotion', 'promoted', 'top', 'soared'), 'subjects': (), 'moods': ('joy',)},
    'arrow-down': {'draw': arrow_down, 'words': ('fell', 'fall', 'dropped', 'down', 'relegation', 'relegated', 'slide', 'slid', 'sank', 'collapse'), 'subjects': ('despair',), 'moods': ('grief',)},
    'question': {'draw': question, 'words': ('why', 'how', 'who', 'what', 'question', 'mystery', 'nobody knew', 'could'), 'subjects': (), 'moods': ('tension',)},
    'exclaim': {'draw': exclaim, 'words': ('incredible', 'unbelievable', 'amazing', 'remarkable', 'miracle', 'impossible'), 'subjects': (), 'moods': ('joy', 'tension')},
    'rosette': {'draw': rosette, 'words': ('rosette', 'old days', 'founded', 'history', 'tradition', 'first ever', 'origins'), 'subjects': ('archive',), 'moods': ('calm',)},
}

# a word on the line asks for an object only as a whole word or phrase; the longest phrase wins over its parts
_WORDS = sorted(((w, k) for k, o in OBJECTS.items() for w in o['words']), key=lambda x: -len(x[0]))
WEAK = {'we', 'up', 'down', 'how', 'what', 'who', 'could', 'there', 'where', 'long', 'time', 'best', 'home', 'live', 'top', 'lead', 'level', 'draw', 'said', 'told'}


def asked(text: str, limit: int = 3, avoid: set[str] | None = None) -> list[tuple[str, str]]:
    """The objects a line names, strongest first: [(object id, the word that asked for it)]. A weak word ("we", "up",
    "how") asks only when nothing stronger does."""
    low = ' ' + re.sub(r'[^a-z0-9\'\- ]+', ' ', (text or '').lower()) + ' '
    strong, weak, seen, taken = [], [], set(avoid or ()), []
    for w, k in _WORDS:
        if k in seen:
            continue
        m = next((x for x in re.finditer(rf'(?<![a-z]){re.escape(w)}(?![a-z])', low)
                  if not any(a < x.end() and x.start() < z for a, z in taken)), None)   # "final whistle" is a whistle, not a final
        if m:
            taken.append((m.start(), m.end()))
            (weak if w in WEAK else strong).append((m.start(), k, w))
            seen.add(k)
    # in the order they are said (they enter on their words). A weak word alone ("there", "long", "we") never asks: measured
    # on the 17.11.2026 sample, a map pin on "there" and an hourglass on "long" read as noise, not as the line's meaning
    return [(k, w) for _, k, w in sorted(strong)][:limit]


# ── printing a drawing ───────────────────────────────────────────────────────────────────────────────────────────────
HUE = {'red': ('#d0021b', '#b02d10', '#c8102e', '#e30613', '#e2001a', '#ed1c24', '#cc0000'),
       'green': ('#007a3d', '#1b7a3e', '#006633', '#00843d', '#0f7a3b', '#008751'),
       'yellow': ('#ffd700', '#ffe500', '#f5c400', '#fcd116', '#ffcc00'),
       'blue': ('#1f4ea8', '#0057b8', '#003da5', '#00529f', '#1e3a8a', '#0b3d91'), 'black': ('#000000', '#17140f', '#1b1a17')}


def family(col: str) -> str | None:
    """The colour family of a hex colour, by hue (the families rule 95 bans by name)."""
    c = (col or '').lstrip('#')
    if len(c) != 6:
        return None
    r, g, b = (int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))
    mx, mn = max(r, g, b), min(r, g, b)
    if mx - mn < 0.12:
        return 'black' if mx < 0.35 else 'white' if mn > 0.85 else 'grey'
    h = (60 * ((g - b) / (mx - mn)) % 360 if mx == r else 60 * ((b - r) / (mx - mn)) + 120 if mx == g else 60 * ((r - g) / (mx - mn)) + 240)
    return 'red' if h < 18 or h >= 335 else 'orange' if h < 42 else 'yellow' if h < 68 else 'green' if h < 170 else 'blue' if h < 255 else 'purple' if h < 300 else 'pink'


def inks(palette=None) -> dict:
    """The three inks of a print: the club's colour (or the house signal red), paper and ink."""
    acc = getattr(palette, 'accent', None) or getattr(palette, 'primary', None) or SIGNAL
    if isinstance(palette, dict):
        acc = palette.get('primary') or palette.get('accent') or SIGNAL
    if family(acc) in ('black', 'grey', 'white'):
        acc = SIGNAL if 'red' not in bans_of(palette) else '#1F4EA8'
    return {'A': acc, 'P': PAPER, 'K': INK, 'none': 'none'}


def bans_of(palette) -> set[str]:
    if palette is None:
        return set()
    b = palette.get('bans') if isinstance(palette, dict) else (getattr(palette, 'render_bans', None) or getattr(palette, 'bans', None))
    return {str(x).lower() for x in (b or ())}


def allowed(oid: str, palette=None) -> bool:
    """An object whose meaning is a colour the club refuses is not offered (a red card on a club that bans red)."""
    o = OBJECTS.get(oid)
    return bool(o) and (o.get('colour') is None or o['colour'] not in bans_of(palette))


DEFS = ('<defs><pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">'
        '<circle cx="4" cy="4" r="3.1" fill="{K}" opacity="0.42"/></pattern></defs>')


def svg_for(oid: str, palette=None, offset: bool = True) -> str:
    """The object printed in the palette's inks: the drawing, its off-register print in the club's colour behind it,
    on a transparent ground."""
    o = OBJECTS[oid]
    ink = inks(palette)
    if o.get('colour') == 'red':
        ink = {**ink, 'A': SIGNAL}
    body = o['draw']()
    fill = lambda s: re.sub(r'\{(A|P|K|none)\}', lambda m: ink[m.group(1)], s)  # noqa: E731
    shadow = (f'<g transform="translate(11 12)" opacity="0.9">'
              + re.sub(r'(fill|stroke)="\{(?:A|P|K)\}"', lambda m: f'{m.group(1)}="{ink["A"]}"', body).replace('url(#dots)', 'none')
              + '</g>') if offset else ''
    shadow = re.sub(r'\{(A|P|K|none)\}', lambda m: ink[m.group(1)], shadow)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 548 548" width="548" height="548">{fill(DEFS)}'
            f'{shadow}<g>{fill(body)}</g></svg>')


def index() -> dict:
    return {'version': 1, 'style': 'FAN LIFE objects — thick ink line, three inks (club colour, paper, ink), halftone shadow, off-register print',
            'objects': {k: {'words': list(o['words']), 'subjects': list(o['subjects']), 'moods': list(o['moods']), **({'colour': o['colour']} if o.get('colour') else {}),
                            'svg': f'{k}.svg', 'png': f'png/{k}.png'} for k, o in OBJECTS.items()}}


def export(out: Path = DIR, png: bool = True) -> int:
    """The universal library on disk: every object as SVG (house inks) and PNG (transparent, 512 px), and index.json."""
    out.mkdir(parents=True, exist_ok=True)
    (out / 'png').mkdir(exist_ok=True)
    for k in OBJECTS:
        (out / f'{k}.svg').write_text(svg_for(k), encoding='utf-8')
    (out / 'index.json').write_text(json.dumps(index(), indent=1) + '\n', encoding='utf-8')
    if png:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch()
            pg = b.new_page(viewport={'width': 512, 'height': 512})
            for k in OBJECTS:
                svg = svg_for(k).replace('width="548" height="548"', 'width="512" height="512"')
                pg.set_content('<html><body style="margin:0;background:transparent">' + svg + '</body></html>')
                pg.screenshot(path=str(out / 'png' / f'{k}.png'), omit_background=True)
            b.close()
    return len(OBJECTS)


if __name__ == '__main__':
    import sys
    if sys.argv[1:2] == ['export']:
        print(f'{export()} objects written to {DIR}')
