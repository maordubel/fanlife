"""The cut-out cartoon kit, drawn in code: one character, his poses and faces, the props that can come alive, the set.

Owner, 8.11.2026: Shorts must be a different film from the documentary — animated, fun, viral, up to 30 seconds — in the
cut-out style of the "Can we throw trash in a volcano?" Shorts (the guide he shared), and on free tools only. That guide
generates every pose as a paid AI picture; here every pose is SVG drawn by this module, so the character is identical in
every frame and every Short, costs nothing, and can wear any club's scarf without a rival's colour (rule 95).

The look follows the guide's rules: thick smooth black outlines of one weight family, flat fills with one soft shade,
small solid oval eyes, curved brows, no nose, a pink tongue only when the mouth is open. Objects get faces when it makes
the joke better. Nothing here prints a score, a name or a date: the timed captions and the scoreboard text are set from
the narration, which passed the studio's fact checks.

Every function returns an SVG fragment in its own local coordinates; scene.py places them.
"""
from __future__ import annotations

INK = '#15130F'
WHITE = '#FFFBF2'
SHADE = '#E4DED2'
TONGUE = '#E86C7A'
STROKE = 9

# ── the character ─────────────────────────────────────────────────────────────────────────────────────────────────────
# local box: 0..400 × 0..640, feet at (200, 630), head centre (200, 150), head radius 104.
HEAD = (200, 150, 104)
FEET = (200, 630)

EXPRESSIONS = ('neutral', 'smile', 'grin', 'shock', 'smug', 'sad', 'angry', 'squeeze', 'think')
POSES = ('stand', 'point', 'shrug', 'cheer', 'scared', 'facepalm', 'think', 'hold', 'run')


def _eye(cx: float, cy: float, rx: float = 11, ry: float = 16) -> str:
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{INK}"/><circle cx="{cx + 3}" cy="{cy - 6}" r="3.2" fill="{WHITE}"/>'


def face(expr: str) -> str:
    """Eyes, brows and mouth on the head (centre 200,150). `squeeze` is the guide's "> <"."""
    cx, cy, _ = HEAD
    lx, rx_, ey = cx - 36, cx + 36, cy - 6
    s = f'stroke="{INK}" stroke-width="7" stroke-linecap="round" fill="none"'
    if expr == 'squeeze':
        eyes = (f'<path d="M{lx - 14} {ey - 12} L{lx + 10} {ey} L{lx - 14} {ey + 12}" {s}/>'
                f'<path d="M{rx_ + 14} {ey - 12} L{rx_ - 10} {ey} L{rx_ + 14} {ey + 12}" {s}/>')
    elif expr == 'shock':
        eyes = _eye(lx, ey, 13, 20) + _eye(rx_, ey, 13, 20)
    elif expr == 'smug':
        eyes = (f'<path d="M{lx - 14} {ey} Q{lx} {ey - 6} {lx + 14} {ey}" {s}/>'
                f'<path d="M{rx_ - 14} {ey} Q{rx_} {ey - 6} {rx_ + 14} {ey}" {s}/>' + _eye(lx, ey + 6, 9, 9) + _eye(rx_, ey + 6, 9, 9))
    else:
        eyes = _eye(lx, ey) + _eye(rx_, ey)
    brow = {
        'neutral': (-4, 0), 'smile': (-6, 0), 'grin': (-8, 0), 'shock': (-18, 0), 'smug': (-2, -6),
        'sad': (-8, 10), 'angry': (-2, -12), 'squeeze': (-10, 4), 'think': (-12, -8),
    }.get(expr, (-4, 0))
    by = ey - 34 + brow[0]
    tilt = brow[1]
    brows = (f'<path d="M{lx - 18} {by + tilt * 0.5} Q{lx} {by - 8} {lx + 18} {by - tilt * 0.5}" {s}/>'
             f'<path d="M{rx_ - 18} {by - tilt * 0.5} Q{rx_} {by - 8} {rx_ + 18} {by + tilt * 0.5}" {s}/>')
    my = cy + 44
    if expr in ('smile', 'smug'):
        mouth = f'<path d="M{cx - 30} {my - 4} Q{cx} {my + 22} {cx + 30} {my - 4}" {s}/>'
    elif expr == 'grin':
        mouth = (f'<path d="M{cx - 38} {my - 8} Q{cx} {my + 46} {cx + 38} {my - 8} Z" fill="{INK}" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
                 f'<path d="M{cx - 18} {my + 20} Q{cx} {my + 8} {cx + 18} {my + 20} Q{cx} {my + 30} {cx - 18} {my + 20}" fill="{TONGUE}"/>')
    elif expr == 'shock':
        mouth = (f'<ellipse cx="{cx}" cy="{my + 10}" rx="20" ry="27" fill="{INK}"/>'
                 f'<ellipse cx="{cx}" cy="{my + 24}" rx="12" ry="9" fill="{TONGUE}"/>')
    elif expr in ('sad', 'squeeze'):
        mouth = f'<path d="M{cx - 26} {my + 12} Q{cx} {my - 8} {cx + 26} {my + 12}" {s}/>'
    elif expr == 'angry':
        mouth = f'<path d="M{cx - 26} {my + 6} L{cx + 26} {my + 2}" {s}/>'
    elif expr == 'think':
        mouth = f'<path d="M{cx - 10} {my + 6} Q{cx + 8} {my} {cx + 24} {my + 8}" {s}/>'
    else:
        mouth = f'<path d="M{cx - 18} {my + 4} Q{cx} {my + 10} {cx + 18} {my + 4}" {s}/>'
    return eyes + brows + mouth


def _arm(path: str) -> str:
    return (f'<path d="{path}" stroke="{INK}" stroke-width="{STROKE + 18}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
            f'<path d="{path}" stroke="{WHITE}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"/>')


def _hand(x: float, y: float) -> str:
    return f'<circle cx="{x}" cy="{y}" r="21" fill="{WHITE}" stroke="{INK}" stroke-width="{STROKE}"/>'


# shoulders at (152, 318) and (248, 318); hands end where each pose puts them (the hand positions are exported so a
# prop can be held exactly in the hand)
ARMS = {
    'stand':    ('M152 318 Q120 380 128 450', 'M248 318 Q280 380 272 450', (128, 450), (272, 450)),
    'point':    ('M152 318 Q120 380 128 450', 'M248 318 Q320 300 372 250', (128, 450), (372, 250)),
    'shrug':    ('M152 318 Q96 320 74 262', 'M248 318 Q304 320 326 262', (74, 262), (326, 262)),
    'cheer':    ('M152 318 Q110 240 112 150', 'M248 318 Q290 240 288 150', (112, 150), (288, 150)),
    'scared':   ('M152 318 Q100 300 120 230', 'M248 318 Q300 300 280 230', (120, 230), (280, 230)),
    'facepalm': ('M152 318 Q120 380 128 450', 'M248 318 Q300 250 236 168', (128, 450), (236, 168)),
    'think':    ('M152 318 Q120 380 128 450', 'M248 318 Q290 300 240 212', (128, 450), (240, 212)),
    'hold':     ('M152 318 Q130 380 170 396', 'M248 318 Q270 380 230 396', (170, 396), (230, 396)),
    'run':      ('M152 318 Q96 330 88 392', 'M248 318 Q300 290 330 330', (88, 392), (330, 330)),
}
LEGS = {
    'run': ('M178 520 Q150 570 120 600', 'M222 520 Q262 560 300 548'),
    'cheer': ('M178 520 Q168 580 160 620', 'M222 520 Q232 580 240 620'),
}


def character(pose: str, expr: str, scarf: tuple[str, str]) -> str:
    """One full drawing: legs, body, scarf in the club's colours, arms, head with its face. Hands on top of the body."""
    a1, a2, h1, h2 = ARMS.get(pose, ARMS['stand'])
    l1, l2 = LEGS.get(pose, ('M178 520 Q174 580 170 620', 'M222 520 Q226 580 230 620'))
    legs = ''.join(f'<path d="{p}" stroke="{INK}" stroke-width="{STROKE + 22}" stroke-linecap="round" fill="none"/>'
                   f'<path d="{p}" stroke="{WHITE}" stroke-width="22" stroke-linecap="round" fill="none"/>' for p in (l1, l2))
    feet = ''.join(f'<ellipse cx="{x}" cy="{y}" rx="30" ry="15" fill="{WHITE}" stroke="{INK}" stroke-width="{STROKE}"/>'
                   for x, y in ((float(l1.split()[-2]), float(l1.split()[-1])), (float(l2.split()[-2]), float(l2.split()[-1]))))
    body = (f'<path d="M140 300 Q200 268 260 300 Q290 420 262 520 Q200 548 138 520 Q110 420 140 300 Z" fill="{WHITE}" '
            f'stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round"/>'
            f'<path d="M250 318 Q276 420 254 512 Q236 520 230 516 Q252 420 236 322 Z" fill="{SHADE}"/>')
    c1, c2 = scarf
    scarf_svg = (f'<path d="M136 286 Q200 318 264 286 L268 318 Q200 352 132 318 Z" fill="{c1}" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
                 f'<path d="M150 296 L160 330 M178 304 L184 338 M206 306 L206 342 M232 304 L228 338 M252 296 L244 330" stroke="{c2}" stroke-width="9"/>'
                 f'<path d="M232 318 L246 410 L214 414 L208 330 Z" fill="{c1}" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
                 f'<path d="M214 380 L244 376 M218 396 L245 392" stroke="{c2}" stroke-width="7"/>')
    cx, cy, r = HEAD
    head = (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{WHITE}" stroke="{INK}" stroke-width="{STROKE}"/>'
            f'<path d="M{cx + 46} {cy - 86} A{r - 8} {r - 8} 0 0 1 {cx + 30} {cy + 92} A{r + 30} {r + 30} 0 0 0 {cx + 46} {cy - 86} Z" fill="{SHADE}"/>'
            f'<ellipse cx="{cx - r + 2}" cy="{cy + 8}" rx="13" ry="22" fill="{WHITE}" stroke="{INK}" stroke-width="7"/>'
            f'<ellipse cx="{cx + r - 2}" cy="{cy + 8}" rx="13" ry="22" fill="{WHITE}" stroke="{INK}" stroke-width="7"/>')
    hands = _hand(*h1) + _hand(*h2)
    arms = _arm(a1) + _arm(a2)
    front_hand_over_face = pose in ('facepalm', 'think')
    if front_hand_over_face:
        return legs + feet + body + scarf_svg + _arm(a1) + _hand(*h1) + head + face(expr) + _arm(a2) + _hand(*h2)
    return legs + feet + body + scarf_svg + arms + head + face(expr) + hands


def hand_of(pose: str, which: int = 1) -> tuple[float, float]:
    a = ARMS.get(pose, ARMS['stand'])
    return a[2 + which]


# ── props (local box 0..240 × 0..240 unless said; the face is a separate group so it can pop open) ───────────────────
def prop_face(cx: float, cy: float, scale: float = 1.0, expr: str = 'neutral') -> str:
    s = scale
    eyes = (f'<ellipse cx="{cx - 22 * s}" cy="{cy}" rx="{13 * s}" ry="{17 * s}" fill="{WHITE}" stroke="{INK}" stroke-width="{5 * s}"/>'
            f'<ellipse cx="{cx + 22 * s}" cy="{cy}" rx="{13 * s}" ry="{17 * s}" fill="{WHITE}" stroke="{INK}" stroke-width="{5 * s}"/>'
            f'<circle class="pupil" cx="{cx - 20 * s}" cy="{cy + 3 * s}" r="{6 * s}" fill="{INK}"/>'
            f'<circle class="pupil" cx="{cx + 24 * s}" cy="{cy + 3 * s}" r="{6 * s}" fill="{INK}"/>')
    mouth = {'shock': f'<ellipse cx="{cx}" cy="{cy + 30 * s}" rx="{9 * s}" ry="{12 * s}" fill="{INK}"/>',
             'smile': f'<path d="M{cx - 16 * s} {cy + 24 * s} Q{cx} {cy + 38 * s} {cx + 16 * s} {cy + 24 * s}" stroke="{INK}" stroke-width="{5 * s}" fill="none" stroke-linecap="round"/>',
             'angry': f'<path d="M{cx - 14 * s} {cy + 32 * s} Q{cx} {cy + 22 * s} {cx + 14 * s} {cy + 32 * s}" stroke="{INK}" stroke-width="{5 * s}" fill="none" stroke-linecap="round"/>'}
    brows = (f'<path d="M{cx - 36 * s} {cy - 24 * s} L{cx - 10 * s} {cy - 18 * s}" stroke="{INK}" stroke-width="{6 * s}" stroke-linecap="round"/>'
             f'<path d="M{cx + 36 * s} {cy - 24 * s} L{cx + 10 * s} {cy - 18 * s}" stroke="{INK}" stroke-width="{6 * s}" stroke-linecap="round"/>') if expr == 'angry' else ''
    return eyes + brows + mouth.get(expr, mouth['smile'])


def ball() -> str:
    pent = 'M120 92 L142 108 L134 134 L106 134 L98 108 Z'
    return (f'<circle cx="120" cy="120" r="96" fill="{WHITE}" stroke="{INK}" stroke-width="{STROKE}"/>'
            f'<path d="{pent}" fill="{INK}"/>'
            f'<path d="M120 92 L120 40 M142 108 L196 92 M134 134 L168 182 M106 134 L72 182 M98 108 L44 92" stroke="{INK}" stroke-width="6"/>'
            f'<path d="M80 40 L120 40 L150 30 M196 92 L210 130 M168 182 L150 214 M72 182 L90 214 M44 92 L30 130" stroke="{INK}" stroke-width="6" fill="none"/>'
            f'<path d="M168 52 A96 96 0 0 1 190 190 A120 120 0 0 0 168 52 Z" fill="{SHADE}" opacity="0.8"/>')


def bottle(colour: str = '#7FB8C9') -> str:
    return (f'<path d="M100 20 L140 20 L140 64 Q182 90 182 140 L182 214 Q182 230 166 230 L74 230 Q58 230 58 214 L58 140 Q58 90 100 64 Z" '
            f'fill="{colour}" stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round"/>'
            f'<rect x="92" y="6" width="56" height="26" rx="6" fill="{INK}"/>'
            f'<path d="M78 120 Q78 100 96 88" stroke="{WHITE}" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.85"/>'
            f'<rect x="76" y="148" width="88" height="44" rx="6" fill="{WHITE}" stroke="{INK}" stroke-width="6"/>')


def trophy(colour: str = '#C9A227') -> str:
    return (f'<path d="M60 30 L180 30 L176 90 Q170 150 120 160 Q70 150 64 90 Z" fill="{colour}" stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round"/>'
            f'<path d="M62 50 Q20 52 26 92 Q32 124 70 124 M178 50 Q220 52 214 92 Q208 124 170 124" stroke="{INK}" stroke-width="{STROKE}" fill="none"/>'
            f'<rect x="104" y="160" width="32" height="34" fill="{colour}" stroke="{INK}" stroke-width="{STROKE}"/>'
            f'<rect x="70" y="194" width="100" height="32" rx="6" fill="{INK}"/>'
            f'<path d="M86 50 Q88 110 112 138" stroke="{WHITE}" stroke-width="9" fill="none" stroke-linecap="round" opacity="0.7"/>')


def whistle() -> str:
    return (f'<path d="M40 100 Q40 60 90 60 L200 60 L200 100 L150 100 Q150 170 100 170 Q40 170 40 100 Z" fill="#9CA6AE" stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round"/>'
            f'<circle cx="96" cy="118" r="20" fill="{INK}"/><rect x="196" y="56" width="20" height="48" rx="4" fill="{INK}"/>')


def newspaper(masthead: str = '') -> str:
    """A folded paper. The masthead is an outlet's name only when a press claim holds one; the columns are grey bars —
    never a headline that did not run."""
    head = (f'<text x="120" y="58" text-anchor="middle" font-family="hf-caps0,sans-serif" font-size="26" fill="{INK}">{masthead[:20].upper()}</text>'
            if masthead else f'<rect x="54" y="36" width="132" height="22" fill="{INK}"/>')
    cols = ''.join(f'<rect x="{38 + c * 58}" y="{90 + r * 22}" width="48" height="10" fill="#B9B2A4"/>' for c in range(3) for r in range(5))
    return (f'<path d="M24 16 L216 16 L216 224 L24 224 Z" fill="{WHITE}" stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round"/>'
            f'{head}<path d="M34 72 L206 72" stroke="{INK}" stroke-width="5"/>{cols}'
            f'<path d="M216 16 L194 40 L194 224" fill="{SHADE}" stroke="{INK}" stroke-width="6"/>')


def scoreboard(accent: str) -> str:
    """The board; the two numbers are text elements scene.py fills from the narration (ids sb-a, sb-b)."""
    return (f'<rect x="10" y="30" width="380" height="200" rx="18" fill="{INK}" stroke="{INK}" stroke-width="{STROKE}"/>'
            f'<rect x="30" y="52" width="150" height="156" rx="10" fill="#26221C"/><rect x="220" y="52" width="150" height="156" rx="10" fill="#26221C"/>'
            f'<circle cx="200" cy="110" r="9" fill="{accent}"/><circle cx="200" cy="150" r="9" fill="{accent}"/>'
            f'<path d="M60 230 L60 290 M340 230 L340 290" stroke="{INK}" stroke-width="16"/>')


def stamp(text: str, colour: str = '#C8102E') -> str:
    w = max(260, 34 * len(text))
    return (f'<g transform="rotate(-12 {w / 2} 60)"><rect x="6" y="6" width="{w}" height="108" rx="10" fill="none" stroke="{colour}" stroke-width="12"/>'
            f'<rect x="18" y="18" width="{w - 24}" height="84" rx="6" fill="none" stroke="{colour}" stroke-width="4"/>'
            f'<text x="{w / 2 + 6}" y="80" text-anchor="middle" font-family="hf-caps0,sans-serif" font-size="58" fill="{colour}" letter-spacing="4">{text}</text></g>')


def clock() -> str:
    return (f'<circle cx="120" cy="120" r="96" fill="{WHITE}" stroke="{INK}" stroke-width="{STROKE}"/>'
            + ''.join(f'<rect x="116" y="30" width="8" height="18" fill="{INK}" transform="rotate({k * 30} 120 120)"/>' for k in range(12))
            + f'<g class="hand-m"><rect x="116" y="44" width="8" height="80" rx="4" fill="{INK}"/></g>'
            f'<g class="hand-h"><rect x="115" y="70" width="10" height="54" rx="5" fill="{INK}"/></g><circle cx="120" cy="120" r="10" fill="{INK}"/>')


def money() -> str:
    return (f'<rect x="20" y="70" width="200" height="104" rx="10" fill="#9BCB8A" stroke="{INK}" stroke-width="{STROKE}"/>'
            f'<circle cx="120" cy="122" r="30" fill="none" stroke="{INK}" stroke-width="6"/>'
            f'<rect x="34" y="84" width="24" height="76" rx="4" fill="none" stroke="{INK}" stroke-width="4"/>'
            f'<rect x="182" y="84" width="24" height="76" rx="4" fill="none" stroke="{INK}" stroke-width="4"/>')


def phone() -> str:
    return (f'<rect x="64" y="10" width="112" height="220" rx="22" fill="#3A3F45" stroke="{INK}" stroke-width="{STROKE}"/>'
            f'<rect x="78" y="34" width="84" height="160" rx="8" fill="#DCE8EC"/><circle cx="120" cy="210" r="9" fill="{WHITE}"/>')


def bars() -> str:
    return (f'<rect x="0" y="0" width="1080" height="34" fill="#4A4E54" stroke="{INK}" stroke-width="{STROKE}"/>'
            + ''.join(f'<rect x="{40 + k * 125}" y="0" width="34" height="1500" fill="#5B6067" stroke="{INK}" stroke-width="{STROKE}"/>' for k in range(9)))


def red_card() -> str:
    return f'<rect x="60" y="20" width="120" height="180" rx="12" fill="#D7261E" stroke="{INK}" stroke-width="{STROKE}"/>'


def goal() -> str:
    """The goal frame and net (local box 0..640 × 0..360)."""
    net = ''.join(f'<path d="M{30 + k * 36} 30 L{50 + k * 34} 330" stroke="#B8B2A6" stroke-width="3"/>' for k in range(17))
    net += ''.join(f'<path d="M30 {30 + k * 36} L610 {30 + k * 36}" stroke="#B8B2A6" stroke-width="3"/>' for k in range(9))
    return (f'<g class="net">{net}</g><path d="M20 340 L20 20 L620 20 L620 340" fill="none" stroke="{WHITE}" stroke-width="22" stroke-linejoin="round"/>'
            f'<path d="M20 340 L20 20 L620 20 L620 340" fill="none" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>')


def burst(text: str, fill: str) -> str:
    pts = []
    import math
    for k in range(24):
        r = 150 if k % 2 == 0 else 104
        a = k / 24 * 2 * math.pi
        pts.append(f'{200 + r * math.cos(a):.1f},{150 + r * 0.8 * math.sin(a):.1f}')
    return (f'<polygon points="{" ".join(pts)}" fill="{fill}" stroke="{INK}" stroke-width="{STROKE}" stroke-linejoin="round"/>'
            f'<text x="200" y="172" text-anchor="middle" font-family="hf-head0,sans-serif" font-size="74" fill="{INK}">{text}</text>')


def stars() -> str:
    def star(x, y, s):
        import math
        p = ' '.join(f'{x + (s if k % 2 == 0 else s * 0.45) * math.cos(k * math.pi / 5 - math.pi / 2):.1f},'
                     f'{y + (s if k % 2 == 0 else s * 0.45) * math.sin(k * math.pi / 5 - math.pi / 2):.1f}' for k in range(10))
        return f'<polygon points="{p}" fill="#F4F0E6" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
    return star(60, 60, 34) + star(170, 40, 26) + star(120, 120, 22)


def sweat() -> str:
    return (f'<path d="M30 0 Q60 40 52 62 Q44 84 22 80 Q2 74 6 52 Q10 30 30 0 Z" fill="#8FD0F2" stroke="{INK}" stroke-width="6"/>'
            f'<ellipse cx="22" cy="56" rx="6" ry="10" fill="{WHITE}"/>')


def question() -> str:
    return (f'<text x="0" y="120" font-family="hf-head0,sans-serif" font-size="150" fill="{WHITE}" stroke="{INK}" stroke-width="10" '
            f'paint-order="stroke">?</text>')


# ── the set (screen space, 1080 wide) ─────────────────────────────────────────────────────────────────────────────────
def stand(accent: str, alt: str) -> str:
    """A stadium stand: roof, floodlights, a crowd of round heads in two inks (club colour + its partner)."""
    import random
    rnd = random.Random(7)
    heads = []
    for row in range(5):
        y = 360 + row * 64
        for k in range(22):
            x = -40 + k * 54 + (27 if row % 2 else 0)
            c = accent if rnd.random() < 0.55 else alt
            heads.append(f'<circle cx="{x}" cy="{y}" r="24" fill="{c}" stroke="{INK}" stroke-width="5"/>')
    lights = ''.join(f'<g transform="translate({x} 40)"><rect x="-6" y="40" width="12" height="230" fill="{INK}"/>'
                     f'<rect x="-50" y="0" width="100" height="56" rx="6" fill="{WHITE}" stroke="{INK}" stroke-width="7"/>'
                     + ''.join(f'<circle cx="{-30 + j * 20}" cy="{16 + i * 22}" r="7" fill="{SHADE}"/>' for j in range(4) for i in range(2)) + '</g>'
                     for x in (120, 960))
    return (lights + f'<path d="M-60 300 L1140 300 L1140 700 L-60 700 Z" fill="#D9D2C3" stroke="{INK}" stroke-width="{STROKE}"/>'
            f'<path d="M-60 250 L1140 250 L1140 300 L-60 300 Z" fill="{INK}"/>' + ''.join(heads))


def pitch() -> str:
    return (f'<path d="M-200 0 L1280 0 L1280 900 L-200 900 Z" fill="#7DB36A"/>'
            + ''.join(f'<path d="M{-200 + k * 160} 0 L{-200 + k * 160 + 80} 0 L{-200 + k * 160 + 80} 900 L{-200 + k * 160} 900 Z" fill="#74AA61"/>' for k in range(10))
            + f'<path d="M-200 0 L1280 0" stroke="{INK}" stroke-width="{STROKE}"/>'
            f'<path d="M540 0 L540 900" stroke="{WHITE}" stroke-width="10"/><ellipse cx="540" cy="260" rx="260" ry="90" fill="none" stroke="{WHITE}" stroke-width="10"/>')
