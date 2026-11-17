"""THE CLUB SCENES — a library of full-frame pictures for every club, drawn in code in the club's own inks (owner,
17.11.2026: "a picture library per club … retro, minimalist, football atmosphere … the system must always use pictures
relevant to the story").

Measured that day: of 945 indexed pictures, 264 were Hapoel Tel Aviv's own, Olympiacos 30, Zrinjski 29, AEK and
Panathinaikos 4 each, St. Pauli 1 — so a film about any other club drew almost only the universal crowds, and the line
"they took the train north" was shown a terrace. The scenes close that gap without a model and without a cost: twelve
compositions — the terrace with its scarves up, the ground at night under its floodlights, the pitch from above, the
ball in the net, the city at dusk, the road away, the desk of cuttings, the trophy under the lights, the empty stand,
the clock in the last minutes, the flags and smoke, the tunnel — each printed in the film's club colours (rule 95: never
a rival's colour) in the same hand as the object library (studio/objects.py): ink line, flat inks, halftone, the
off-register print.

Every scene is a record of the media index (studio/media_index.Picker) for the film's club, with its subjects, moods
and its own caption words, so the picker finds it by what it SHOWS — when it fits the line better than the library's
photographs and paintings, and only then. No scene carries a crest, a name, a letter or a face.
"""
from __future__ import annotations

import hashlib
import math
import random
import re
from pathlib import Path

from . import objects as O

W, H = 1920, 1080


def _rng(*k) -> random.Random:
    return random.Random(int(hashlib.sha256('|'.join(map(str, k)).encode()).hexdigest()[:10], 16))


def obj(oid: str, x: float, y: float, size: float, rot: float = 0) -> str:
    """An object of the library placed in a scene (its drawing, its offset print, no outer svg)."""
    body = O.OBJECTS[oid]['draw']()
    shadow = re.sub(r'(fill|stroke)="\{(?:A|P|K)\}"', lambda m: f'{m.group(1)}="{{A}}"', body).replace('url(#dots)', 'none')
    s = size / 512
    return (f'<g transform="translate({x:.0f} {y:.0f}) rotate({rot} {size / 2:.0f} {size / 2:.0f}) scale({s:.4f})">'
            f'<g transform="translate(11 12)" opacity="0.9">{shadow}</g>{body}</g>')


def sky(top: str, bottom: str, gid: str = 'sky') -> str:
    return (f'<linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bottom}"/></linearGradient>')


def halftone_band(y0: int, y1: int, op: float = 0.35) -> str:
    return f'<rect x="0" y="{y0}" width="{W}" height="{y1 - y0}" fill="url(#dotsL)" opacity="{op}"/>'


def fan(x: float, y: float, s: float, arms: str, scarf: bool, rng: random.Random) -> str:
    """One supporter seen from behind, in ink: head, shoulders, arms up or down, a scarf in the club's colour."""
    h = 70 * s
    body = (f'<circle cx="{x:.0f}" cy="{y - h * 1.55:.0f}" r="{h * 0.36:.0f}" fill="{{K}}"/>'
            f'<path d="M{x - h * 0.75:.0f} {y + 10:.0f} Q{x - h * 0.8:.0f} {y - h * 1.1:.0f} {x:.0f} {y - h * 1.2:.0f} Q{x + h * 0.8:.0f} {y - h * 1.1:.0f} {x + h * 0.75:.0f} {y + 10:.0f}Z" fill="{{K}}"/>')
    if arms == 'up':
        body += (f'<path d="M{x - h * 0.55:.0f} {y - h * 0.95:.0f} L{x - h * 0.9:.0f} {y - h * 2.3:.0f}" stroke="{{K}}" stroke-width="{h * 0.24:.0f}" stroke-linecap="round"/>'
                 f'<path d="M{x + h * 0.55:.0f} {y - h * 0.95:.0f} L{x + h * 0.9:.0f} {y - h * 2.3:.0f}" stroke="{{K}}" stroke-width="{h * 0.24:.0f}" stroke-linecap="round"/>')
        if scarf:
            yy = y - h * 2.3
            body += (f'<path d="M{x - h * 0.95:.0f} {yy:.0f} Q{x:.0f} {yy - h * 0.25:.0f} {x + h * 0.95:.0f} {yy:.0f} L{x + h * 0.95:.0f} {yy + h * 0.28:.0f} '
                     f'Q{x:.0f} {yy + h * 0.03:.0f} {x - h * 0.95:.0f} {yy + h * 0.28:.0f}Z" fill="{{A}}" stroke="{{K}}" stroke-width="{max(3, h * 0.06):.0f}"/>'
                     + ''.join(f'<rect x="{x - h * 0.95 + k * h * 0.38:.0f}" y="{yy - h * 0.12 + (abs(k - 2) * h * 0.04):.0f}" width="{h * 0.14:.0f}" height="{h * 0.3:.0f}" fill="{{P}}"/>' for k in range(1, 5)))
    return body


def terrace(rng, arms_up=0.6, scarves=0.8, rows=5, y0=520) -> str:
    out = ''
    for r in range(rows):
        s = 0.7 + r * 0.22
        y = y0 + r * 120 * s
        n = int(W / (90 * s)) + 2
        for i in range(n):
            x = i * 90 * s + (r % 2) * 45 * s + rng.uniform(-10, 10)
            out += fan(x, y, s, 'up' if rng.random() < arms_up else 'down', rng.random() < scarves, rng)
    return out


def stadium_shape(y: int, col: str = 'A') -> str:
    return (f'<path d="M-40 {y} Q960 {y - 260} 1960 {y} L1960 {y + 220} Q960 {y - 20} -40 {y + 220}Z" fill="{{{col}}}" stroke="{{K}}" stroke-width="16"/>'
            f'<path d="M-40 {y + 220} Q960 {y - 20} 1960 {y + 220} L1960 {y + 280} Q960 {y + 60} -40 {y + 280}Z" fill="{{K}}"/>')


def floodlight(x, y, h, beam=True) -> str:
    beam_ = (f'<path d="M{x - 90} {y} L{x - 520} {y + h + 240} L{x + 520} {y + h + 240} L{x + 90} {y}Z" fill="{{P}}" opacity="0.13"/>' if beam else '')
    lamps = ''.join(f'<rect x="{x - 84 + 44 * i}" y="{y - 70 + 34 * j}" width="34" height="26" rx="4" fill="{{P}}"/>' for i in range(4) for j in range(2))
    return (beam_ + f'<rect x="{x - 96}" y="{y - 84}" width="192" height="88" rx="8" fill="{{K}}"/>' + lamps
            + f'<path d="M{x - 14} {y + 4} L{x + 14} {y + 4} L{x + 34} {y + h} L{x - 34} {y + h}Z" fill="{{K}}"/>')


def skyline(rng, y: int, col: str = 'K', step=(60, 150)) -> str:
    out, x = '', -20
    while x < W + 20:
        w = rng.randint(*step)
        h = rng.randint(80, 320)
        out += f'<rect x="{x}" y="{y - h}" width="{w}" height="{h + 400}" fill="{{{col}}}"/>'
        for wy in range(y - h + 24, y - 20, 42):
            for wx in range(x + 14, x + w - 20, 34):
                if rng.random() < 0.28:
                    out += f'<rect x="{wx}" y="{wy}" width="14" height="18" fill="{{P}}" opacity="0.75"/>'
        x += w + rng.randint(0, 18)
    return out


def pitch_lines(op=0.9) -> str:
    st = f'stroke="{{P}}" stroke-width="10" fill="none" opacity="{op}"'
    return (f'<rect x="150" y="110" width="1620" height="860" {st}/><line x1="960" y1="110" x2="960" y2="970" {st}/><circle cx="960" cy="540" r="150" {st}/>'
            f'<rect x="150" y="320" width="260" height="440" {st}/><rect x="1510" y="320" width="260" height="440" {st}/>'
            f'<rect x="150" y="430" width="90" height="220" {st}/><rect x="1680" y="430" width="90" height="220" {st}/>')


# ── the twelve scenes ────────────────────────────────────────────────────────────────────────────────────────────────
def s_terrace(rng):
    return ('<rect width="1920" height="1080" fill="url(#sky)"/>' + halftone_band(0, 520, 0.4) + floodlight(260, 170, 260, False) + floodlight(1660, 170, 260, False)
            + terrace(rng, 0.75, 0.9) + '<rect y="1010" width="1920" height="70" fill="{K}"/>')


def s_night(rng):
    return ('<rect width="1920" height="1080" fill="url(#skyN)"/>' + ''.join(f'<circle cx="{rng.randint(0, W)}" cy="{rng.randint(20, 420)}" r="{rng.choice((2, 3, 4))}" fill="{{P}}" opacity="0.7"/>' for _ in range(60))
            + floodlight(300, 200, 420) + floodlight(1620, 200, 420) + stadium_shape(640) + '<rect y="900" width="1920" height="180" fill="{K}"/>'
            + '<ellipse cx="960" cy="860" rx="700" ry="60" fill="{P}" opacity="0.18"/>')


def s_pitch(rng):
    stripes = ''.join(f'<rect x="{i * 160}" y="0" width="80" height="1080" fill="{{K}}" opacity="0.10"/>' for i in range(13))
    return ('<rect width="1920" height="1080" fill="{A}"/>' + stripes + pitch_lines() + obj('ball', 1180, 420, 170) + halftone_band(0, 1080, 0.18)
            + f'<path d="M760 760 Q980 600 1220 520" stroke="{{P}}" stroke-width="10" fill="none" stroke-dasharray="26 22"/>'
            + ''.join(f'<circle cx="{x}" cy="{y}" r="34" fill="{{P}}" stroke="{{K}}" stroke-width="10"/>' for x, y in ((520, 300), (520, 780), (760, 760), (820, 420)))
            + ''.join(f'<circle cx="{x}" cy="{y}" r="34" fill="{{K}}" stroke="{{P}}" stroke-width="8"/>' for x, y in ((1380, 330), (1420, 720), (1600, 540))))


def s_goal(rng):
    net = ''.join(f'<line x1="{x}" y1="210" x2="{960 + (x - 960) * 0.8:.0f}" y2="880" stroke="{{P}}" stroke-width="5" opacity="0.7"/>' for x in range(250, 1680, 52))
    net += ''.join(f'<line x1="230" y1="{y}" x2="1690" y2="{y}" stroke="{{P}}" stroke-width="5" opacity="0.7"/>' for y in range(250, 880, 52))
    return ('<rect width="1920" height="1080" fill="url(#skyN)"/>' + halftone_band(0, 1080, 0.25) + net
            + '<path d="M210 900 L210 190 L1710 190 L1710 900" stroke="{P}" stroke-width="42" fill="none"/>' + obj('ball', 1050, 520, 300, 18)
            + '<rect y="900" width="1920" height="180" fill="{A}"/><rect y="900" width="1920" height="16" fill="{K}"/>' + halftone_band(916, 1080, 0.35))


def s_city(rng):
    return ('<rect width="1920" height="1080" fill="url(#skyD)"/><circle cx="1400" cy="560" r="230" fill="{A}" stroke="{K}" stroke-width="16"/>'
            + halftone_band(0, 700, 0.25) + skyline(rng, 860) + stadium_shape(760, 'A') + '<rect y="1000" width="1920" height="80" fill="{K}"/>')


def s_road(rng):
    road = '<path d="M820 1080 L940 560 L980 560 L1100 1080Z" fill="{K}"/>' + ''.join(f'<rect x="{955 - k * 3}" y="{600 + k * 48}" width="{10 + k * 6}" height="{20 + k * 4}" fill="{{P}}"/>' for k in range(9))
    return ('<rect width="1920" height="1080" fill="url(#skyD)"/>' + halftone_band(0, 560, 0.25) + '<path d="M0 560 Q480 470 960 560 Q1440 470 1920 560 L1920 1080 L0 1080Z" fill="{A}"/>'
            + road + obj('bus', 1060, 600, 330, -3) + obj('pin', 330, 260, 220) + obj('pin', 1500, 180, 180)
            + '<path d="M440 470 Q900 120 1590 360" stroke="{K}" stroke-width="10" fill="none" stroke-dasharray="28 22"/>' + halftone_band(560, 1080, 0.2))


def s_desk(rng):
    return ('<rect width="1920" height="1080" fill="{A}"/>' + halftone_band(0, 1080, 0.22) + '<rect y="0" width="1920" height="1080" fill="{K}" opacity="0.18"/>'
            + obj('newspaper', 180, 160, 760, -6) + obj('programme', 900, 300, 560, 7) + obj('ticket', 1330, 640, 420, -14) + obj('radio', 1380, 120, 420, 4))


def s_trophy(rng):
    rays = ''.join(f'<path d="M960 560 L{960 + 1400 * math.cos(math.radians(a)):.0f} {560 + 1400 * math.sin(math.radians(a)):.0f} '
                   f'L{960 + 1400 * math.cos(math.radians(a + 7)):.0f} {560 + 1400 * math.sin(math.radians(a + 7)):.0f}Z" fill="{{P}}" opacity="0.16"/>' for a in range(0, 360, 15))
    return ('<rect width="1920" height="1080" fill="{A}"/>' + rays + halftone_band(0, 1080, 0.18) + obj('trophy', 640, 150, 640)
            + '<rect x="560" y="880" width="800" height="200" fill="{K}"/>' + ''.join(obj('star', x, y, 120, r) for x, y, r in ((300, 220, -10), (1500, 260, 12), (1600, 640, 4))))


def s_empty(rng):
    seats = ''
    for r in range(8):
        y = 300 + r * 92
        for i in range(24):
            x = i * 84 + (r % 2) * 42 - 20
            seats += f'<path d="M{x} {y} q0 -44 34 -44 h8 q34 0 34 44 v24 h-76Z" fill="{{A}}" stroke="{{K}}" stroke-width="6"/>'
    return ('<rect width="1920" height="1080" fill="{K}"/>' + seats + halftone_band(0, 1080, 0.32)
            + '<rect width="1920" height="260" fill="{K}"/>' + floodlight(1560, 120, 160, False) + obj('scarf', 420, 640, 300, -8))


def s_clock(rng):
    return ('<rect width="1920" height="1080" fill="url(#skyN)"/>' + halftone_band(0, 1080, 0.25) + floodlight(280, 180, 360) + stadium_shape(700)
            + obj('stopwatch', 640, 60, 640) + '<rect y="980" width="1920" height="100" fill="{K}"/>')


def s_flags(rng):
    smoke = ''.join(f'<circle cx="{rng.randint(0, W)}" cy="{rng.randint(120, 640)}" r="{rng.randint(90, 220)}" fill="{{P}}" opacity="{rng.uniform(0.08, 0.2):.2f}"/>' for _ in range(26))
    return ('<rect width="1920" height="1080" fill="url(#sky)"/>' + smoke + halftone_band(0, 700, 0.3)
            + ''.join(obj('flag', x, y, 360, r) for x, y, r in ((120, 160, -8), (620, 90, 4), (1140, 150, -4), (1560, 110, 8)))
            + ''.join(obj('flare', x, 520, 260, r) for x, r in ((380, -6), (1000, 4), (1470, -3))) + terrace(rng, 0.85, 0.7, 3, 860))


def s_tunnel(rng):
    rings = ''.join(f'<path d="M{960 - 120 * k * 0.9:.0f} 1080 L{960 - 120 * k * 0.9:.0f} {700 - 52 * k} Q960 {520 - 70 * k} {960 + 120 * k * 0.9:.0f} {700 - 52 * k} L{960 + 120 * k * 0.9:.0f} 1080" '
                    f'fill="none" stroke="{{{"A" if k % 2 else "K"}}}" stroke-width="{24 + 8 * k}"/>' for k in range(1, 10))
    return ('<rect width="1920" height="1080" fill="{K}"/><path d="M820 1080 L820 680 Q960 560 1100 680 L1100 1080Z" fill="{P}"/>'
            + '<ellipse cx="960" cy="760" rx="160" ry="200" fill="{P}" opacity="0.5"/>' + rings + halftone_band(0, 1080, 0.22)
            + ''.join(fan(x, 1080, s, 'down', False, rng) for x, s in ((870, 1.1), (1050, 1.15))))


SCENES: dict[str, dict] = {
    'terrace': {'draw': s_terrace, 'subjects': ('stand', 'crowd', 'flag'), 'moods': ('defiance', 'joy'),
                'caption': 'supporters on the terrace raise their scarves and arms under the floodlights, singing'},
    'night': {'draw': s_night, 'subjects': ('stadium', 'night'), 'moods': ('tension',),
              'caption': 'the stadium at night under its floodlights, the beams over the pitch, evening match'},
    'pitch': {'draw': s_pitch, 'subjects': ('ball', 'goal', 'bench'), 'moods': ('tension',),
              'caption': 'the pitch from above, tactics, players and the ball moving towards goal, attack'},
    'goal': {'draw': s_goal, 'subjects': ('goal', 'ball', 'night'), 'moods': ('joy',),
             'caption': 'the ball in the back of the net, a goal scored, the winner'},
    'city': {'draw': s_city, 'subjects': ('city', 'stadium'), 'moods': ('calm',),
             'caption': 'the city skyline at dusk with the stadium among the rooftops, home town'},
    'road': {'draw': s_road, 'subjects': ('travel', 'map'), 'moods': ('defiance', 'calm'),
             'caption': 'the road away, a supporters bus on the journey between two cities, away trip travel'},
    'desk': {'draw': s_desk, 'subjects': ('newspaper', 'archive'), 'moods': ('calm',),
             'caption': 'old newspapers, a matchday programme, a ticket and a radio on the desk, headlines, history'},
    'trophy': {'draw': s_trophy, 'subjects': ('trophy',), 'moods': ('joy',),
               'caption': 'the trophy under the lights, champions, the cup won, title celebration'},
    'empty': {'draw': s_empty, 'subjects': ('stand', 'despair'), 'moods': ('grief',),
              'caption': 'empty seats in the stand after the defeat, a lost scarf, silence'},
    'clock': {'draw': s_clock, 'subjects': ('clock', 'stadium', 'night'), 'moods': ('tension',),
              'caption': 'the stadium clock in the last minutes, time running out, late drama'},
    'flags': {'draw': s_flags, 'subjects': ('flag', 'pyro', 'crowd'), 'moods': ('defiance',),
              'caption': 'flags, flares and smoke over the ultras on derby day, choreography, chant'},
    'tunnel': {'draw': s_tunnel, 'subjects': ('tunnel',), 'moods': ('tension',),
               'caption': 'the players walk out of the tunnel towards the light, kick-off'},
}


def svg(scene: str, palette=None, seed: str = '') -> str:
    ink = O.inks(palette)
    rng = _rng(scene, seed, ink['A'])
    body = SCENES[scene]['draw'](rng)
    a = ink['A']
    defs = ('<defs>' + sky('#1B1A2A', a, 'sky') + sky('#0E0D16', '#2A2740', 'skyN') + sky('#2B2236', a, 'skyD')
            + '<pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="4" cy="4" r="3.1" fill="{K}" opacity="0.42"/></pattern>'
            + '<pattern id="dotsL" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="6" cy="6" r="4.4" fill="{K}"/></pattern></defs>')
    out = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{defs}{body}</svg>'
    return re.sub(r'\{(A|P|K|none)\}', lambda m: ink[m.group(1)], out)


def records(palette, out_dir: Path) -> list[dict]:
    """The film's club scenes as media-index records (written once into `out_dir`), with their own caption words."""
    from . import media_index as MI
    out_dir.mkdir(parents=True, exist_ok=True)
    club = getattr(palette, 'club_id', None)
    recs = []
    for k, sc in SCENES.items():
        p = out_dir / f'scene-{club or "house"}-{k}.svg'
        if not p.exists():
            p.write_text(svg(k, palette, club or ''), encoding='utf-8')
        rid = f'scene:{club or "house"}/{k}'
        # printed for this film only, so no other club ever sees it; listed as any-club art so it wins a shot by what it
        # shows (subjects, caption words), never by the club bonus over the club's own photographs and paintings
        recs.append({'id': rid, 'kind': 'still', 'source': 'scene', 'path': str(p), 'clubs': [], 'subjects': list(sc['subjects']),
                     'moods': list(sc['moods']), 'size': [W, H], 'orientation': 'landscape', 'rights': 'own', 'families': [], 'era': None,
                     'accent': 'club'})
        MI._CAP_WORDS[rid] = (MI.content_words(sc['caption']), set())
    return recs


def sheet(palette, out: Path) -> Path:
    """A contact sheet of the twelve scenes in a club's inks (for the owner and the desk)."""
    from playwright.sync_api import sync_playwright
    cells = ''.join(f'<div class="c">{svg(k, palette)}</div>' for k in SCENES)
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1476, 'height': 3 * 282 + 12})
        pg.set_content('<html><head><style>.c{display:inline-block;width:480px;height:270px;margin:6px;overflow:hidden} .c svg{width:480px;height:270px}</style></head>'
                       f'<body style="margin:0;background:#F4ECD8">{cells}</body></html>')
        pg.screenshot(path=str(out), full_page=True)
        b.close()
    return out
