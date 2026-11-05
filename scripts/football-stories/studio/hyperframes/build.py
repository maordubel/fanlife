"""The composition: one chapter of a planned film → one HyperFrames project (index.html + assets/).

Every word, figure and date on screen is read from the plan's own data: a match claim (`ed.by`), the script beat's visual
(already checked by script.ensure_valid, and a stat value is checked again here through script.fact_guard), the story's
cinema block (scorebug W–D–L, lower-third claims), the narrator's word timings. Nothing is typed by this module.

Colours are the club palette's (studio.vox.compose.Ink: accent, pen, highlighter) and the paper's; a colour in a rival's
family (rule 95, Palette.bans) is refused when the page is written (`check_colours`). Pictures come from the same library
calls the PIL engine makes (Editor.backdrop / cut_img / pick_cut, maps.render), which already scrub the rival's family.

Layout and camera are the PIL engine's own: `vox.render.place` puts each beat's panel on the board, `vox.camera.CameraPath`
moves over each panel's focus keys — sampled once per frame into the page, so a HyperFrames render of the chapter and a
PIL render of it are the same choreography drawn by two different renderers.

The output is deterministic: the same plan, ledger, voice and palette give byte-identical index.html (assets are named
by the hash of their bytes; numbers are rounded; every seed is E.hsh of the club, season and beat).
"""
from __future__ import annotations

import hashlib
import html
import json
import math
import re
import shutil
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image

from ..common import FPS, H, W, StageError, hex_rgb, is_banned_pixel
from ..vox import elements as E
from ..vox.compose import Ink, _f, _score_steps, shout_word, style_of, CLASSIC, DECOR, _NUM
from ..vox.elements import INK, NEWS, PAPER

PW, PH = 1920, 1080
HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
FONTS = REPO / 'public' / 'fonts'
FACES = {  # css family → (latin, latin-ext) files in public/fonts (The Weekly's own faces, as cinema/type.py uses them)
    'head': ('weekly-head-latin.woff2', 'weekly-head-latin-ext.woff2'),
    'caps': ('weekly-caps-latin.woff2', 'weekly-caps-latin-ext.woff2'),
    'body': ('weekly-body-latin.woff2', 'weekly-body-latin-ext.woff2'),
    'ultra': ('ultra-latin-400-normal.woff2', 'ultra-latin-ext-400-normal.woff2'),
    'shout': ('knewave-latin-400-normal.woff2', 'knewave-latin-ext-400-normal.woff2'),
    'cond': ('oswald-latin-700-normal.woff2', 'oswald-latin-ext-700-normal.woff2'),
    'mono': ('courier-prime-latin-700-normal.woff2', 'courier-prime-latin-ext-700-normal.woff2'),
}


def rgb(c) -> str:
    c = hex_rgb(c) if isinstance(c, str) else tuple(int(x) for x in c[:3])
    return '#%02x%02x%02x' % c


def r3(x: float) -> float:
    return round(float(x), 3)


def esc(s) -> str:
    return html.escape(str(s), quote=True)


def text_width(s: str, font: str, size: float) -> float:
    from ..cinema.type import face
    return face(font, max(6, int(size))).length(s)


def fit_size(s: str, font: str, size: float, max_w: float, floor: float = 0.55) -> float:
    sz = size
    while sz > size * floor and text_width(s, font, sz) > max_w:
        sz -= 2
    return sz


class Assets:
    """Files the page needs, named by the hash of their bytes (so the page is the same for the same pictures)."""

    def __init__(self, root: Path):
        self.root = root
        (root / 'assets').mkdir(parents=True, exist_ok=True)
        self.files: dict[str, str] = {}

    def put_bytes(self, data: bytes, ext: str, stem: str = 'a') -> str:
        name = f'{stem}-{hashlib.sha256(data).hexdigest()[:16]}.{ext}'
        p = self.root / 'assets' / name
        if not p.exists():
            p.write_bytes(data)
        self.files[name] = name
        return f'assets/{name}'

    def put_image(self, im: Image.Image, stem: str, alpha: bool | None = None, q: int = 86) -> str:
        import io
        b = io.BytesIO()
        if alpha is None:
            alpha = im.mode in ('RGBA', 'LA')
        if alpha:
            im.convert('RGBA').save(b, 'WEBP', quality=90, method=4)
            return self.put_bytes(b.getvalue(), 'webp', stem)
        im.convert('RGB').save(b, 'JPEG', quality=q, optimize=False)
        return self.put_bytes(b.getvalue(), 'jpg', stem)

    def put_file(self, src: Path, stem: str) -> str:
        return self.put_bytes(Path(src).read_bytes(), Path(src).suffix.lstrip('.'), stem)


@dataclass
class Panel:
    n: int
    start: float
    dur: float
    lead: float
    html: list = field(default_factory=list)      # on the board, panel units
    near: list = field(default_factory=list)      # in front of the board, panel units (parallax layer)
    js: list = field(default_factory=list)
    focus: list = field(default_factory=list)
    cues: list = field(default_factory=list)
    shakes: list = field(default_factory=list)
    flashes: list = field(default_factory=list)
    rects: list = field(default_factory=list)      # data rects (people step out of their way)

    def look(self, t, x, y, z):
        self.focus.append((round(max(0.0, min(t, self.dur)), 3), float(x), float(y), float(z)))


class B:
    """One beat's builder: pieces of HTML on the panel, and the tweens that move them (absolute film time)."""

    def __init__(self, comp: 'Composition', s: dict):
        self.c, self.ed, self.s = comp, comp.ed, s
        self.ink = comp.ink
        self.st = comp.style
        self.dur = s['frames'] / FPS
        self.lead = (s['voice_at'] - s['start']) if s.get('voice_at') is not None else 0.4
        self.vdur = float(s.get('voice_dur') or 0.0)
        self.T0 = float(s['start'])
        self.cin = s.get('cinema') or {}
        self.n = s['n']
        self.P = Panel(s['n'], self.T0, self.dur, self.lead)
        self.side = 1 if E.hsh(self.ed.ledger.get('club_id'), s['n']) % 2 else -1
        self.k = 0

    # ---------------------------------------------------------------- helpers
    def id(self, kind: str) -> str:
        self.k += 1
        return f'p{self.n}-{kind}{self.k}'

    def T(self, t: float) -> float:
        return r3(self.T0 + max(0.0, min(t, self.dur - 0.05)))

    def js(self, line: str):
        self.P.js.append(line)

    def at_voice(self, frac: float, lo: float = 0.4, hi: float | None = None) -> float:
        t = self.lead + frac * max(self.vdur, 1.5)
        return max(lo, min(t, hi if hi is not None else max(lo, self.dur - 1.0)))

    def seed(self, extra=0) -> int:
        return 1000 + self.n * 7 + int(extra)

    # ---------------------------------------------------------------- paper cards
    def torn(self, w: float, h: float, seed: int, edges: str = 'tblr', depth: float = 9.0) -> str:
        """A torn outline as a CSS polygon (percent of the box): jagged on the torn edges, straight on the cut ones."""
        import random
        rnd = random.Random(seed)
        pts = []

        def run(a, b, torn, n):
            for i in range(n):
                u = i / n
                x = a[0] + (b[0] - a[0]) * u
                y = a[1] + (b[1] - a[1]) * u
                if torn:
                    j = rnd.uniform(0, depth)
                    if a[1] == b[1]:   # horizontal edge
                        y += j if a[1] == 0 else -j
                    else:
                        x += j if a[0] == 0 else -j
                pts.append((x, y))
        nx, ny = max(6, int(w / 26)), max(6, int(h / 26))
        run((0, 0), (w, 0), 't' in edges, nx)
        run((w, 0), (w, h), 'r' in edges, ny)
        run((w, h), (0, h), 'b' in edges, nx)
        run((0, h), (0, 0), 'l' in edges, ny)
        return 'polygon(' + ','.join(f'{x / w * 100:.2f}% {y / h * 100:.2f}%' for x, y in pts) + ')'

    def card(self, w, h, cx, cy, rot, t0, *, tone=NEWS, frm=(0, 700), style='slide', tape=2, inner='', z=40, edges='tblr',
             s0=1.0, dur=0.6, cls='') -> str:
        """A paper card landing on the board. The paper itself — fibres, torn sides, soft shadow, tape — is the PIL
        engine's own (elements.paper), baked once into a picture: Chromium then only moves it (no clip-path, no filter,
        which HyperFrames' capture handles badly in numbers)."""
        cid = self.id('card')
        im, pad = E.paper(w, h, 1.0, self.seed(cx + cy), tone=tone, edges=edges, tape=tape)
        url = self.c.assets.put_image(im, 'paper', alpha=True)
        self.P.html.append(
            f'<div id="{cid}" class="card {cls}" style="left:{cx - w / 2:.1f}px;top:{cy - h / 2:.1f}px;width:{w:.1f}px;'
            f'height:{h:.1f}px;z-index:{z}"><img class="pbg" src="{url}" style="left:{-pad}px;top:{-pad}px;width:{im.width}px;'
            f'height:{im.height}px">{inner}</div>')
        T = self.T(t0)
        sd = 6 * (1 if self.side > 0 else -1) if (frm[0] or frm[1]) else 0
        ease = 'back.out(1.25)' if style == 'drop' else 'power3.out'
        self.js(f'tl.fromTo("#{cid}",{{x:{frm[0]},y:{frm[1]},rotation:{r3(rot + sd)},scale:{s0},opacity:0}},'
                f'{{x:0,y:0,rotation:{r3(rot)},scale:1,opacity:1,duration:{dur},ease:"{ease}"}},{T});')
        self.P.cues.append((t0, 'paper'))
        self.P.rects.append((cx - w / 2, cy - h / 2, w, h))
        return cid

    # ---------------------------------------------------------------- type
    def lines(self, s: str, font: str, size: float, max_w: float, upper=True) -> list[list[str]]:
        words = [w.upper() if upper else w for w in str(s).split()]
        out, cur = [], []
        sp = text_width(' ', font, size) * 1.7 + size * 0.06
        cw = 0.0
        for w in words:
            ww = text_width(w, font, size)
            if cur and cw + sp + ww > max_w:
                out.append(cur)
                cur, cw = [], 0.0
            cur.append(w)
            cw += (sp if len(cur) > 1 else 0) + ww
        if cur:
            out.append(cur)
        return out

    def words(self, s: str, x: float, y: float, size: float, t0: float, *, font='head', fill=INK, max_w=1500, align='left',
              style='rise', hot: set | None = None, hot_fill=None, hl: set | None = None, plate=None, stagger=None, rot=0.0,
              upper=True, z=70, lh=1.06) -> tuple[str, tuple, float]:
        """Kinetic words: each rises from behind its own mask (or is stamped), one after another; `hot` words in the
        accent, `hl` words get the highlighter swept over them once they have landed. Returns (id, rect, settle)."""
        stagger = stagger if stagger is not None else (0.085 if self.st['count'] >= 1 else 0.06)
        size = min(size, max(14, fit_size(max(str(s).split() or [''], key=len).upper(), font, size, max_w)))
        lines = self.lines(s, font, size, max_w, upper)
        hot = {h.lower() for h in (hot or set())}
        hl = {h.lower() for h in (hl or set())}
        hot_fill = hot_fill or self.ink.accent
        wid = self.id('words')
        sp = text_width(' ', font, size) * 1.7 + size * 0.06
        widths = [sum(text_width(w, font, size) for w in ln) + sp * (len(ln) - 1) for ln in lines]
        mw = max(widths) if widths else 1
        nwords = sum(len(ln) for ln in lines)
        rows = []
        for ln in lines:
            ws = []
            for w in ln:
                key = w.lower().strip('.,!?;:’\'"“”')
                col = hot_fill if key in hot else fill
                inner = esc(w)
                if key in hl:
                    inner = f'<b class="hlb"></b>{inner}'
                ws.append(f'<span class="w{" hk" if key in hl else ""}"><span class="wi" style="color:{rgb(col)}">{inner}</span></span>')
            rows.append(f'<div class="ln" style="text-align:{align}">{" ".join(ws)}</div>')
        left = {'left': x, 'center': x - mw / 2, 'right': x - mw}[align]
        pl = (f'background:{rgb(plate)};padding:{size * 0.12:.0f}px {size * 0.22:.0f}px;box-shadow:{size * 0.08:.0f}px {size * 0.08:.0f}px 0 '
              f'{rgb(self.ink.accent if plate != self.ink.accent else INK)};') if plate is not None else ''
        self.P.html.append(f'<div id="{wid}" class="words f-{font}" style="left:{left:.1f}px;top:{y:.1f}px;width:{mw + size * 0.5:.1f}px;'
                           f'font-size:{size:.1f}px;line-height:{lh};z-index:{z};rotate:{r3(rot)}deg;{pl}">{"".join(rows)}</div>')
        T = self.T(t0)
        if style == 'stamp':
            self.js(f'tl.fromTo("#{wid} .wi",{{scale:2.2,opacity:0,rotation:-8}},{{scale:1,opacity:1,rotation:0,duration:0.3,'
                    f'ease:"back.out(2.2)",stagger:{stagger}}},{T});')
        elif style == 'pop':
            self.js(f'tl.fromTo("#{wid} .wi",{{scale:0.2,opacity:0}},{{scale:1,opacity:1,duration:0.32,ease:"back.out(2.6)",stagger:{stagger}}},{T});')
        else:
            self.js(f'tl.fromTo("#{wid} .wi",{{yPercent:112,rotation:5}},{{yPercent:0,rotation:0,duration:0.46,ease:"power3.out",'
                    f'stagger:{stagger}}},{T});')
        settle = t0 + stagger * max(0, nwords - 1) + 0.46
        if hl:
            self.js(f'tl.fromTo("#{wid} .hlb",{{scaleX:0}},{{scaleX:1,duration:0.45,ease:"power2.inOut",stagger:0.12}},{self.T(settle + 0.1)});')
            self.P.cues.append((settle + 0.1, 'pen'))
        ph = size * lh * len(lines) + (size * 0.24 if plate is not None else 0)
        rect = (left, y, mw + (size * 0.44 if plate is not None else 0), ph)
        return wid, rect, settle

    def type(self, s: str, x: float, y: float, size: float, t0: float, *, font='mono', fill=INK, cps=30.0, plate=None, pad=0.0,
             max_w=1400, rot=0.0, z=72) -> tuple[str, tuple, float]:
        """A typewriter line: letter by letter, a block cursor that blinks after the last one."""
        s = str(s)
        size = fit_size(s, font, size, max_w)
        tid = self.id('type')
        cps = max(cps, len(s) / max(0.4, self.dur - t0 - 0.6))
        chars = ''.join(f'<span class="ch">{esc(c) if c != " " else "&nbsp;"}</span>' for c in s)
        pl = f'background:{rgb(plate)};padding:{pad:.0f}px {pad * 1.4:.0f}px;' if plate is not None else ''
        self.P.html.append(f'<div id="{tid}" class="type f-{font}" style="left:{x:.1f}px;top:{y:.1f}px;font-size:{size:.1f}px;'
                           f'color:{rgb(fill)};z-index:{z};rotate:{r3(rot)}deg;{pl}">{chars}<span class="cur" style="background:{rgb(fill)}"></span></div>')
        T = self.T(t0)
        end = t0 + len(s) / cps
        self.js(f'tl.fromTo("#{tid} .ch",{{opacity:0}},{{opacity:1,duration:0.001,stagger:{r3(1 / cps)}}},{T});')
        self.js(f'tl.fromTo("#{tid}",{{opacity:0}},{{opacity:1,duration:0.001}},{T});')
        self.js(f'tl.fromTo("#{tid} .cur",{{opacity:1}},{{opacity:0,duration:0.001,repeat:5,yoyo:true,repeatDelay:0.22,immediateRender:false}},{self.T(end)});')
        self.P.cues.append((t0, 'tick'))
        w = text_width(s, font, size) + pad * 2.8
        return tid, (x, y, w, size * 1.2 + pad * 2), end + 0.8

    # ---------------------------------------------------------------- the pen and the highlighter
    def marker(self, pts: list, t0: float, dur: float, *, width=9.0, head=False, colour=None) -> str:
        mid = self.id('pen')
        d = 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts)
        L = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts, pts[1:])) + 2
        col = rgb(colour or self.ink.pen)
        extra = ''
        if head and len(pts) > 3:
            (x0, y0), (x1, y1) = pts[-4], pts[-1]
            a = math.atan2(y1 - y0, x1 - x0)
            hp = [(x1 + 34 * math.cos(a + math.pi * 0.82), y1 + 34 * math.sin(a + math.pi * 0.82)), (x1, y1),
                  (x1 + 34 * math.cos(a - math.pi * 0.82), y1 + 34 * math.sin(a - math.pi * 0.82))]
            extra = f'<path class="ph" d="M{hp[0][0]:.1f} {hp[0][1]:.1f} L{hp[1][0]:.1f} {hp[1][1]:.1f} L{hp[2][0]:.1f} {hp[2][1]:.1f}" stroke="{col}" stroke-width="{width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
        self.P.html.append(f'<svg id="{mid}" class="pen" width="{PW}" height="{PH}" viewBox="0 0 {PW} {PH}"><path class="pp" d="{d}" stroke="{col}" '
                           f'stroke-width="{width}" fill="none" stroke-linecap="round" stroke-linejoin="round" '
                           f'stroke-dasharray="{L:.1f}" stroke-dashoffset="{L:.1f}"/>{extra}</svg>')
        T = self.T(t0)
        self.js(f'tl.fromTo("#{mid} .pp",{{strokeDashoffset:{L:.1f}}},{{strokeDashoffset:0,duration:{dur},ease:"power1.inOut"}},{T});')
        if extra:
            self.js(f'tl.fromTo("#{mid} .ph",{{opacity:0}},{{opacity:1,duration:0.08}},{self.T(t0 + dur)});')
        self.P.cues.append((t0, 'pen'))
        return mid

    def circle(self, rect, t0, dur=0.6, pad=22):
        return self.marker(E.circle_path(rect, self.seed(len(self.P.html)), pad), t0, dur)

    def underline(self, rect, t0, dur=0.45):
        return self.marker(E.underline_path(rect, self.seed(len(self.P.html))), t0, dur)

    def arrow(self, a, b, t0, dur=0.5):
        return self.marker(E.arrow_path(a, b, self.seed(len(self.P.html))), t0, dur, width=8, head=True)

    def highlight(self, rect, t0, rot=0.0, dur=0.45):
        hid = self.id('hl')
        x, y, w, h = rect
        self.P.html.append(f'<div id="{hid}" class="hlr" style="left:{x - 10:.1f}px;top:{y + h * 0.12:.1f}px;width:{w + 20:.1f}px;'
                           f'height:{h * 0.82:.1f}px;rotate:{r3(rot - 0.8)}deg"></div>')
        self.js(f'tl.fromTo("#{hid}",{{scaleX:0}},{{scaleX:1,duration:{dur},ease:"power2.inOut"}},{self.T(t0)});')
        self.P.cues.append((t0, 'pen'))
        return hid

    def stamp(self, word: str, x: float, y: float, t0: float, rot=-7.0, size=110, tone='accent'):
        sid = self.id('stamp')
        fill = self.ink.on_accent if tone == 'accent' else INK
        bg = self.ink.accent if tone == 'accent' else NEWS
        size = fit_size(word, 'shout', size, 700)
        self.P.html.append(f'<div id="{sid}" class="stamp f-shout" style="left:{x:.1f}px;top:{y:.1f}px;font-size:{size:.0f}px;'
                           f'color:{rgb(fill)};background:{rgb(bg)};box-shadow:9px 9px 0 {rgb(INK)};z-index:92">{esc(word)}</div>')
        self.js(f'tl.fromTo("#{sid}",{{xPercent:-50,yPercent:-50,scale:2.1,rotation:{r3(rot - 4)},opacity:0}},'
                f'{{xPercent:-50,yPercent:-50,scale:1,rotation:{r3(rot)},opacity:1,duration:0.32,ease:"back.out(1.8)"}},{self.T(t0)});')
        self.P.cues.append((t0, 'stamp'))
        self.P.shakes.append((t0 + 0.08, 9))
        w = text_width(word, 'shout', size) + 60
        return sid, (x - w / 2, y - size * 0.7, w, size * 1.4)

    # ---------------------------------------------------------------- numbers
    def odometer(self, val: int, x: float, y: float, size: float, t0: float, dur: float, *, prefix='', suffix='', fill=None):
        """Digit drums that roll to the claim's value, overshoot a little and roll back (the odometer's own rhythm)."""
        oid = self.id('odo')
        digits = len(str(abs(int(val))))
        strip = '<br>'.join(str(d % 10) for d in range(11))
        cols = ''.join(f'<span class="oc"><span class="os">{strip}</span></span>' for _ in range(digits))
        pre = f'<span class="oa">{esc(prefix)}</span>' if prefix else ''
        suf = f'<span class="oa">{esc(suffix)}</span>' if suffix else ''
        col = rgb(fill or (self.ink.accent if self.ink.accent != INK else INK))
        self.P.html.append(f'<div id="{oid}" class="odo f-ultra" data-val="{int(val)}" style="left:{x:.1f}px;top:{y:.1f}px;'
                           f'font-size:{size:.0f}px;color:{col}">{pre}{cols}{suf}</div>')
        self.js(f'odo(tl,"#{oid}",{int(val)},{self.T(t0)},{r3(dur)});')
        self.P.cues.append((t0, 'tick'))
        w = text_width(prefix + str(val) + suffix, 'ultra', size) * 1.08
        return oid, (x - w / 2, y - size * 0.62, w, size * 1.2)

    def flip(self, steps: list, x: float, y: float, size: float, w: float, tile, fill) -> tuple[str, tuple]:
        """A split-flap figure: every change folds the old card away and the new one down, the hinge showing."""
        fid = self.id('flip')
        h = size * 1.18
        cards = ''.join(f'<div class="fv" id="{fid}-{i}">{esc(v)}</div>' for i, (_, v) in enumerate(steps))
        self.P.html.append(f'<div id="{fid}" class="flip f-ultra" style="left:{x - w / 2:.1f}px;top:{y - h / 2:.1f}px;width:{w:.1f}px;'
                           f'height:{h:.1f}px;font-size:{size:.0f}px;line-height:{h:.1f}px;background:{rgb(tile)};color:{rgb(fill)}">{cards}<i class="hinge"></i></div>')
        times = [t for t, _ in steps]
        for i, (t, _) in enumerate(steps):
            if i == 0:
                self.js(f'tl.fromTo("#{fid}-0",{{rotationX:0,opacity:1}},{{rotationX:0,opacity:1,duration:0.01}},{self.T(0)});')
                continue
            T = self.T(t)
            gap = (times[i + 1] - t) if i + 1 < len(times) else 1.0
            d_out = r3(min(0.1, gap * 0.4))
            d_in = r3(max(0.04, min(0.16, gap - d_out - 0.02)))
            self.js(f'tl.fromTo("#{fid}-{i - 1}",{{rotationX:0}},{{rotationX:90,duration:{d_out},ease:"power2.in",immediateRender:false}},{T});')
            self.js(f'tl.fromTo("#{fid}-{i}",{{rotationX:-90,opacity:1}},{{rotationX:0,opacity:1,duration:{d_in},ease:"back.out(2)"}},{r3(T + d_out)});')
            self.P.cues.append((t, 'tick'))
        return fid, (x - w / 2, y - h / 2, w, h)

    # ---------------------------------------------------------------- pictures
    def art(self, key: str | None, w, h, cx, cy, rot, t0, *, frm=(0, 0), style='drop', z=30, tape=2, dim=0.0):
        """A library picture as a print on the board: halftone-treated, a paper border, tape; a library clip plays."""
        from ..paper import piece_meta
        ed = self.ed
        key = key or 'terrace-crowd'
        W_, H_ = int(w), int(h)
        if self.s.get('required_asset') == key:
            from ..media_assets import require_file, whole_picture
            pic = whole_picture(require_file(key), (W_, H_), ed.pal.bans)
        else:
            try:
                src = Image.open(ed.backdrop(key, self.seed(), dim=dim)).convert('RGB')
            except Exception:  # optional library art only
                key = 'terrace-crowd'
                src = Image.open(ed.backdrop(key, self.seed())).convert('RGB')
            s_ = max(W_ / src.width, H_ / src.height)
            src = src.resize((max(W_, int(src.width * s_)), max(H_, int(src.height * s_))), Image.LANCZOS)
            L, T_ = (src.width - W_) // 2, (src.height - H_) // 2
            pic = E.photo_treat(src.crop((L, T_, L + W_, T_ + H_)), amount=0.34)
        url = self.c.assets.put_image(pic, 'print')
        inner = f'<img class="pic" src="{url}" style="left:18px;top:18px;width:{W_}px;height:{H_}px">'
        if key.startswith('clip:'):
            vurl = self.c.clip_video(key, self.dur + 1.0)
            if vurl:
                vid = self.id('clip')
                inner += (f'<video id="{vid}" class="clip pic" src="{vurl}" muted playsinline data-start="{self.T(t0 + 0.6)}" '
                          f'data-duration="{r3(self.dur - t0 - 0.6)}" data-track-index="2" style="left:18px;top:18px;width:{W_}px;height:{H_}px"></video>')
        if piece_meta(key).get('illustrated'):
            inner += '<span class="illu f-caps">ILLUSTRATION</span>'
        cid = self.card(w + 36, h + 36, cx, cy, rot, t0, tone=PAPER, frm=frm, style=style, tape=tape, inner=inner, z=z,
                        s0=1.18 if style == 'drop' else 1.0, dur=0.7)
        return cid, (cx - (w + 36) / 2, cy - (h + 36) / 2, w + 36, h + 36)

    def person(self, im: Image.Image, x: float, foot: float, t0: float, side: int, flip=False):
        """A cut-out in front of the board (the parallax layer): it rises in, stands, and steps out before the move."""
        if flip:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        w, h = im.width, im.height
        out = 1 if x > PW / 2 else -1
        for _ in range(9):
            r_ = (x - w / 2, foot - h, w, h)
            if all(_ov(r_, d) < 0.03 * d[2] * d[3] for d in self.P.rects):
                break
            x += out * 60
        else:
            return None
        url = self.c.assets.put_image(_shadowed(im), 'cut', alpha=True)
        pid = self.id('cut')
        self.P.near.append(f'<img id="{pid}" class="cutp" src="{url}" style="left:{x - w / 2:.1f}px;top:{foot - h:.1f}px;width:{w}px;height:{h}px">')
        self.js(f'tl.fromTo("#{pid}",{{y:{h * 0.9:.0f},rotation:{-4 * side}}},{{y:0,rotation:0,duration:0.7,ease:"power3.out"}},{self.T(t0)});')
        self.js(f'tl.fromTo("#{pid}",{{y:0}},{{y:{h * 1.1:.0f},duration:0.55,ease:"power2.in",immediateRender:false}},{self.T(self.dur - 0.75)});')
        self.P.cues.append((t0, 'paper'))
        return pid

    def cut(self, base: str, h: float, x: float, foot: float, t0: float, side: int):
        key = self.ed.pick_cut(base, self.n * 3 + self.k)
        if not key:
            return None
        try:
            im = self.ed.cut_img(key, int(h))
        except Exception:  # noqa: BLE001
            return None
        return self.person(im, x, foot, t0, side)

    def library(self):
        from ..cinema import animate
        k = 0
        for e in self.cin.get('lib') or []:
            role, key, side = e.get('role'), e.get('key'), e.get('side', 1) or 1
            if role != 'actor':
                continue
            im = animate._sprite(self.ed, key, 560)
            if im is None:
                continue
            self.person(im, PW / 2 + side * 820, PH + 40, max(0.3, min(self.lead, 0.9)) + 0.35 * k, side)
            k += 1

    def slip(self, f: dict, x: float, y: float, t0: float, rot=-2.5):
        """Contract rule 1 on the board: the scoreline of the match the narrator names, on a torn slip, underlined."""
        from ..cinema import gfx
        top = ' · '.join(x_ for x_ in [gfx.short_date(f.get('date')), f.get('competition')] if x_).upper()
        line = f"{f['home']} {f['score_home']}–{f['score_away']} {f['away']}".upper()
        s2 = fit_size(line, 'cond', 46, 760)
        w = max(text_width(top, 'caps', 24), text_width(line, 'cond', s2)) + 60
        h = 24 * 1.3 + s2 * 1.3 + 40
        inner = (f'<div class="f-caps" style="position:absolute;left:30px;top:14px;font-size:24px;color:#5a5246">{esc(top)}</div>'
                 f'<div class="f-cond" style="position:absolute;left:30px;top:{22 + 24 * 1.3:.0f}px;font-size:{s2:.0f}px;color:{rgb(INK)}">{esc(line)}</div>')
        self.card(w, h, x + w / 2, y + h / 2, rot, t0, tone=PAPER, frm=(-900, 0), edges='lr', z=55, inner=inner, tape=1)
        self.underline((x + 30, y + 22 + 24 * 1.3, text_width(line, 'cond', s2), s2 * 1.2), t0 + 0.75)


def _shadowed(im: Image.Image, dx: int = 8, dy: int = 14, blur: float = 10.0) -> Image.Image:
    """A cut-out with its soft shadow baked in (the same size: the shadow falls inside the picture's own margin)."""
    from PIL import ImageFilter
    a = im.getchannel('A')
    sh = Image.new('L', im.size, 0)
    sh.paste(a, (dx, dy))
    sh = sh.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * 0.35))
    out = Image.new('RGBA', im.size, (20, 16, 10, 0))
    out.putalpha(sh)
    out.alpha_composite(im)
    return out


def _ov(a, b) -> float:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    w = min(ax + aw, bx + bw) - max(ax, bx)
    h = min(ay + ah, by + bh) - max(ay, by)
    return max(0, w) * max(0, h)


# ==================================================================== the panels (one per visual type)
def result(b: B) -> None:
    from ..cinema import gfx
    s, ed, ink = b.s, b.ed, b.ink
    v = s['visual']
    kind = v['type']
    f = _f(ed, v.get('claim'))
    if not f:
        raise StageError('VOX_NO_MATCH', f'a {kind} panel needs a match claim')
    rot = (-1.4, 1.1, -0.8)[s['n'] % 3]
    cx, cy = 960 + b.side * 40, 470
    W_, H_ = 1300, 600
    head = 'MATCHDAY' if kind == 'matchday' else 'FULL TIME'
    stage = ' · '.join(x for x in [f.get('competition'), f.get('stage')] if x)
    bar = f'{head} · {stage}'.upper()
    venue = (f.get('venue') or {}).get('name')
    dline = ' · '.join(x for x in [gfx.long_date(f.get('date')).upper() if f.get('date') else None, venue.upper() if venue else None] if x)
    inner = (f'<div class="bar f-caps" style="font-size:{fit_size(bar, "caps", 30, W_ - 80):.0f}px">{esc(bar)}</div>'
             f'<i class="rule" style="top:470px"></i><div class="dash f-ultra">–</div>')
    t_land = 0.15
    card = b.card(W_, H_, cx, cy, rot, t_land, inner=inner, tape=2, frm=(0, 820) if s['n'] % 2 else (-1300, 40), tone=PAPER)
    x0, y0 = cx - W_ / 2, cy - H_ / 2
    t_n = t_land + 0.55
    hs = min(74, fit_size(f['home'].upper(), 'head', 74, 520))
    as_ = min(74, fit_size(f['away'].upper(), 'head', 74, 520))
    win_name = f['home'] if f['score_home'] > f['score_away'] else f['away'] if f['score_away'] > f['score_home'] else None
    hl_home = {w.lower().strip('.,') for w in f['home'].upper().split()} if (win_name == f['home'] and kind != 'matchday') else set()
    hl_away = {w.lower().strip('.,') for w in f['away'].upper().split()} if (win_name == f['away'] and kind != 'matchday') else set()
    left = b.words(f['home'], x0 + 60, y0 + 110, hs, t_n, max_w=520, z=72, hl=hl_home, rot=rot)
    right = b.words(f['away'], x0 + W_ - 60, y0 + 110, as_, t_n + 0.18, max_w=520, align='right', z=72, hl=hl_away, rot=rot)
    pace = 0.24 * b.st['count']
    n_goals = int(f['score_home']) + int(f['score_away'])
    t_sc0 = max(t_n + 0.6, b.at_voice(0.18, lo=1.0))
    if kind == 'matchday':
        t_sc0 = max(t_n + 1.2, b.at_voice(0.55, lo=1.6))
    t_sc0 = max(t_n + 0.3, min(t_sc0, b.dur - 1.6 - pace * n_goals))
    t_sc1 = t_sc0 + max(0.25, pace * n_goals)
    hsteps, asteps = _score_steps(f, t_sc0, t_sc1)
    club = ed.ledger.get('club_name')
    tone_h = ink.accent if f['home'] == club else PAPER
    tone_a = ink.accent if f['away'] == club else PAPER
    fs = 150
    fx, gx, fy = cx - 130, cx + 130, y0 + 280
    _, rh = b.flip(hsteps, fx, fy, fs, fs * 1.27, tone_h, ink.on_accent if tone_h == ink.accent else INK)
    _, ra = b.flip(asteps, gx, fy, fs, fs * 1.27, tone_a, ink.on_accent if tone_a == ink.accent else INK)
    score_rect = (rh[0], rh[1], ra[0] + ra[2] - rh[0], rh[3])
    b.type(dline, x0 + 56, y0 + 500, 30, t_n + 0.4, max_w=W_ - 120)
    pens = f.get('penalties') or next((c['fact'] for c in ed.ledger['claims'] if c['fact'].get('kind') == 'penalties' and c['fact'].get('date') == f.get('date')), None)
    extra = f"{pens['winner']} won {pens.get('shootout') or pens.get('score')} on penalties" if pens else ('After extra time' if f.get('after_extra_time') else None)
    if f.get('title_decided'):
        extra = (extra + ' · ' if extra else '') + 'The title is decided'
    t_mark = min(t_sc1 + 0.3, b.dur - 0.65)
    b.circle(score_rect, t_mark, dur=0.55)
    if kind == 'matchday':
        b.underline(left[1], t_n + 1.0)
    if extra:
        b.type(extra.upper(), x0 + 56, y0 + H_ + 30, 28, t_mark + 0.5, fill=ink.pen, max_w=W_ - 120)
    sw = shout_word(ed, f, s['n'])
    if sw and kind in ('score', 'versus', 'matchday'):
        b.stamp(sw[0], cx + W_ / 2 - 190, cy + H_ / 2 - 70, t_sc1 + 0.15, size=96 if len(sw[0]) < 7 else 80, tone=sw[1])
        if sw[1] == 'accent':
            b.P.flashes.append(t_sc1 + 0.15)
            b.P.cues.append((t_sc1 + 0.2, 'crowd-goal' if f['outcome'] == 'win' else 'crowd-after'))
        else:
            b.P.cues.append((t_sc1 + 0.2, 'crowd-miss'))
    sc = f.get('scorers') or []
    if sc and f.get('club_goals') == len(sc):
        by: dict[str, list[str]] = {}
        for g in sc:
            mark = '’' + (' PEN' if g.get('penalty') else '') + (' OG' if g.get('own_goal') else '')
            by.setdefault(g['name'], []).append(f"{g['minute']}{mark}" if g.get('minute') is not None else '')
        line = '   '.join(f"{n.upper()} {' '.join(m for m in ms if m)}".strip() for n, ms in list(by.items())[:4])
        sx, sy = x0 + 60, y0 + 405
        _, srect, _ = b.type(line, sx, sy, 30, t_mark + 0.9, font='cond', max_w=W_ - 140)
        b.arrow((score_rect[0] - 30, score_rect[1] + score_rect[3] * 0.6), (sx + 40, sy + 4), t_mark + 0.6, dur=0.35)
    if b.st['people']:
        base = ('fig-celebrate-arms-kr' if f['outcome'] == 'win' else 'fig-kneel-despair-kr' if f['outcome'] == 'loss' else 'fig-supporter-scarf-up-kr')
        b.cut(base, 560, 960 - b.side * 830, 1130, t_sc1 + 0.1, side=-b.side)
    zp = min(b.st['push'], 1.32)
    sx_, sy_ = score_rect[0] + score_rect[2] / 2, score_rect[1] + score_rect[3] / 2
    b.P.look(0.0, cx, cy + 60, 0.92)
    b.P.look(t_n + 0.2, cx, cy + 20, 0.98)
    b.P.look(t_sc0 - 0.05, sx_, sy_, zp)
    b.P.look(t_mark + 0.9, sx_, sy_ + 40, zp * 0.96)
    b.P.look(b.dur, cx, cy + 90, 1.0)


def stat(b: B) -> None:
    from ..script import fact_guard
    s, ed, ink = b.s, b.ed, b.ink
    v = s['visual']
    value, label = str(v.get('value') or ''), str(v.get('label') or '')
    cites = list(s.get('claim_ids') or []) + ([v['claim']] if v.get('claim') else [])
    bad = fact_guard(f'{value} {label}', ed.ledger, cites)
    if bad:
        raise StageError('HF_STAT_UNSUPPORTED', f'beat {s["n"]}: {bad[0]}')
    rot = -2.0 * b.side
    b.card(1000, 640, 960, 470, rot, 0.15, tone=NEWS, frm=(0, 800), tape=2)
    m = _NUM.match(value)
    t_c = 0.7
    if m and not m.group(3):
        sign, num, _, suf = m.groups()
        dur = 1.4 * b.st['count']
        _, vr = b.odometer(int(num), 960, 400, 250, t_c, dur, prefix=sign.replace('-', '–') if sign else '', suffix=suf or '')
        t_done = t_c + dur
    else:
        _, vr = b.stamp(value, 960, 400, t_c, rot=rot, size=200 if len(value) < 6 else 130)
        t_done = t_c + 0.4
    lw = b.words(label, 960, 560, 60, t_done + 0.1, max_w=880, align='center', rot=rot, hl={w.lower().strip('.,!?') for w in label.split()})
    src = ed.source_of(v.get('claim')) or ('the archive' if str(v.get('claim', '')).startswith('summary:') else None)
    if src:
        b.type(f'SOURCE · {src}'.upper(), 520, 740, 22, t_done + 0.6, font='caps', fill=(90, 82, 70))
    b.circle(vr, t_done + 0.25)
    if b.st['people'] and any(w in (s.get('narration') or '').lower() for w in (' won', ' wins', 'goals', 'champion', 'unbeaten')):
        b.cut('fig-supporter-jump-kr', 560, 960 + b.side * 760, 1140, t_done, side=b.side)
    b.P.look(0.0, 960, 520, 0.92)
    b.P.look(t_c, 960, 420, b.st['push'])
    b.P.look(t_done + 0.6, 960, 520, 1.05)
    b.P.look(b.dur, 960, 540, 1.0)


def timeline(b: B) -> None:
    from ..cinema import gfx
    s, ed, ink = b.s, b.ed, b.ink
    v = s['visual']
    pts_ = sorted((f for cid in v.get('claims') or [] if (f := _f(ed, cid))), key=lambda f: f['date'])
    if not pts_:
        raise StageError('VOX_TIMELINE_EMPTY', 'a timeline needs match claims')
    b.words(v.get('label') or 'The run', 120, 170, 76, 0.2, max_w=1300)
    b.card(PW - 200, 520, PW / 2, 560, -0.6, 0.0, tone=PAPER, frm=(0, 700), edges='lr', z=15, tape=2)
    n = len(pts_)
    X0, X1, Y = 200, PW - 200, 560
    xs = [X0 + (X1 - X0) * i / max(1, n - 1) for i in range(n)] if n > 1 else [PW / 2]
    t0 = 0.7
    dur = max(0.6, min(max(min(max(b.dur - b.lead, 2.0) * 0.6, 6.0), 1.6) * b.st['count'] ** 0.5, b.dur - t0 - 0.9))
    line = [(x, Y) for x in xs] if n > 1 else [(X0, Y), (X1, Y)]
    b.marker(line, t0, dur, width=9, colour=INK)
    for i, f in enumerate(pts_):
        ti = t0 + dur * (i / max(1, n - 1) if n > 1 else 0.0)
        up = i % 2 == 0
        cy = Y - 150 if up else Y + 150
        tone = ink.accent if f['outcome'] == 'win' else PAPER if f['outcome'] == 'draw' else INK
        fg = ink.on_accent if f['outcome'] == 'win' else INK if f['outcome'] == 'draw' else PAPER
        sh = INK if tone != INK else ink.accent
        opp = f"{'v' if f['side'] == 'home' else 'at'} {f['opponent']}".upper()
        cid = b.id('chip')
        b.P.html.append(f'<div id="{cid}" class="chip" style="left:{xs[i]:.1f}px;top:{cy:.1f}px;background:{rgb(tone)};color:{rgb(fg)};'
                        f'box-shadow:8px 8px 0 {rgb(sh)}"><div class="f-ultra" style="font-size:44px">{f["club_goals"]}–{f["opponent_goals"]}</div>'
                        f'<div class="f-cond" style="font-size:{fit_size(opp, "cond", 26, 320):.0f}px">{esc(opp)}</div></div>')
        b.js(f'tl.fromTo("#{cid}",{{xPercent:-50,yPercent:-50,y:{-80 if up else 80},scale:1.3,rotation:-6,opacity:0}},'
             f'{{xPercent:-50,yPercent:-50,y:0,scale:1,rotation:{(-2, 2)[i % 2]},opacity:1,duration:0.35,ease:"back.out(1.7)"}},{b.T(ti)});')
        did = b.id('dot')
        b.P.html.append(f'<i id="{did}" class="dot" style="left:{xs[i] - 17:.1f}px;top:{Y - 17:.1f}px;background:{rgb(tone)}"></i>')
        b.js(f'tl.fromTo("#{did}",{{scale:0}},{{scale:1,duration:0.25,ease:"back.out(3)"}},{b.T(ti)});')
        b.type(gfx.short_date(f['date']), xs[i] - 90, (Y + 34) if up else (Y - 76), 28, ti + 0.1, font='caps')
        b.P.cues.append((ti, 'pop'))
    b.P.look(0.0, PW / 2, 420, 0.9)
    for j in range(7):
        tt = t0 + dur * j / 6
        x = X0 + (X1 - X0) * (j / 6)
        b.P.look(tt, max(760, min(PW - 760, x + 100)), Y - 40, b.st['push'] * 1.02)
    b.P.look(min(b.dur, t0 + dur + 0.8), PW / 2, 470, 0.93)
    b.P.look(b.dur, PW / 2, 480, 0.96)


def chapter(b: B) -> None:
    s, ed = b.s, b.ed
    v = s['visual']
    num = int(v.get('number') or s.get('chapter', 0) + 1)
    title = str(v.get('title') or ed.script['chapters'][s['chapter']]['title'])
    broll = v.get('backdrop') or b.cin.get('broll') or 'paper'
    if broll != 'paper':
        b.art(broll, 760, 480, 1460, 330, 4, 0.2, style='drop', z=25)
    b.stamp(f'CHAPTER {num}', 520, 300, 0.55, rot=-5, size=86)
    _, wr, settle = b.words(title, 180, 450, 150, 0.9, max_w=1150, style='rise', stagger=0.12,
                            hl={w.lower().strip('.,!?') for w in title.split()[-1:]})
    b.stamp(str(ed.ledger.get('season') or ''), 1500, 780, settle + 0.3, rot=9, size=64, tone='paper')
    if b.st['people']:
        b.cut('crowd-row-flags-kr', 300, 960, 1200, 0.5, side=1)
    b.P.cues.append((0.0, 'whoosh'))
    b.P.look(0.0, 900, 520, 0.7)
    b.P.look(0.55, 700, 420, 0.95)
    b.P.look(settle, 760, 520, b.st['push'] * 0.9)
    b.P.look(b.dur, 900, 540, 1.0)


def illustration(b: B) -> None:
    s = b.s
    v = s['visual']
    art = v.get('art') or b.cin.get('broll') or 'terrace-crowd'
    rot = (-1.6, 2.0, -2.4)[s['n'] % 3]
    cx, cy = 960 + b.side * 70, 470
    b.art(art, 1240, 700, cx, cy, rot, 0.1, frm=(0, -150), style='drop')
    if v.get('caption'):
        cap = str(v['caption'])
        b.words(cap, cx - 560, cy + 210, 64, 0.9, max_w=1000, fill=PAPER, hot_fill=PAPER, plate=INK, rot=rot, z=80,
                hl={w.lower().strip('.,!?') for w in cap.split()[-1:]})
    if s.get('required_asset'):
        b.P.look(0.0, cx, cy, 0.95)
        b.P.look(b.dur, cx, cy, 1.0)
        return
    a = (cx - 200 * b.side, cy - 120)
    c = (cx + 160 * b.side, cy + 40)
    b.P.look(0.0, cx, cy + 40, 0.88)
    b.P.look(0.9, a[0], a[1], b.st['push'] * 1.05)
    b.P.look(b.dur, c[0], c[1], b.st['push'] * 1.12)
    if s.get('mood') in ('joy', 'triumph'):
        b.P.cues.append((0.35, 'crowd-goal'))


def turning(b: B) -> None:
    v = b.s['visual']
    b.art(v.get('backdrop') or b.cin.get('broll') or 'terrace-empty', 1250, 520, 980, 620, 2.5, 0.1)
    title = str(v.get('title') or '')
    _, tr, settle = b.words(title, 150, 300, 118, 0.6, max_w=900, style='stamp', stagger=0.14, plate=NEWS, z=82,
                            hl={w.lower().strip('.,!?') for w in title.split()[-2:]})
    sub = str(v.get('subtitle') or '')
    if sub:
        b.type(sub.upper(), 156, tr[1] + tr[3] + 40, 34, settle + 0.3, font='caps', max_w=820, plate=PAPER, pad=10)
    b.P.cues.append((0.6, 'drum'))
    b.P.look(0.0, 1100, 520, 0.88)
    b.P.look(0.6, 560, 420, b.st['push'] * 0.95)
    b.P.look(b.dur, 900, 520, 1.0)


def map_panel(b: B) -> None:
    from ..maps import city_of, place_of
    from ..maps import render as render_map
    s, ed, ink = b.s, b.ed, b.ink
    v = s['visual']
    pts, seen = [], set()
    home = city_of(ed.ledger['club_name'])
    if home:
        pts.append({'name': home[0], 'lat': home[1][0], 'lon': home[1][1], 'home': True})
        seen.add(home[0])
    for cid in v.get('claims') or []:
        c = ed.by.get(cid)
        if not c or c['fact'].get('kind') != 'match':
            continue
        co = place_of(c['fact'], ed.ledger['club_name'])
        if co and co[0] not in seen:
            pts.append({'name': co[0], 'lat': co[1][0], 'lon': co[1][1], 'home': False})
            seen.add(co[0])
    focus = v.get('focus') or 'domestic'
    if not pts:
        raise StageError('HF_MAP_EMPTY', 'a map needs at least one place the claims name')
    W_, H_ = 1500, 845
    cx, cy = 960, 520
    base, pins = render_map(pts, focus, s['n'] % 9, ed.ledger.get('country', 'Israel' if ed.ledger.get('club_id') == 'hapoel-tel-aviv' else None) if focus != 'europe' else None)
    sx, sy = W_ / base.width, H_ / base.height
    url = b.c.assets.put_image(base.resize((W_, H_), Image.LANCZOS), 'map')
    b.card(W_, H_, cx, cy, -0.8, 0.1, tone=NEWS, inner=f'<img class="pic" src="{url}" style="left:0;top:0;width:{W_}px;height:{H_}px">',
           tape=3, frm=(0, -900), style='drop', s0=1.1, edges='')
    t0 = 0.8
    step = min(1.0, max(0.5, (b.dur * 0.5) / max(1, len(pins))))
    home_pt, last = None, (cx, cy)
    for i, p in enumerate(pins):
        x, y = cx - W_ / 2 + p['x'] * sx, cy - H_ / 2 + p['y'] * sy
        ti = t0 + i * step
        if p.get('home'):
            home_pt = (x, y)
        elif home_pt:
            b.arrow(home_pt, (x, y - 30), ti - 0.45, dur=0.45)
        pid = b.id('pin')
        col = rgb(ink.accent if p.get('home') else INK)
        b.P.html.append(f'<i id="{pid}" class="pin" style="left:{x - 22:.1f}px;top:{y - 58:.1f}px;background:{col}"></i>')
        b.js(f'tl.fromTo("#{pid}",{{y:-260,opacity:0}},{{y:0,opacity:1,duration:0.55,ease:"bounce.out"}},{b.T(ti)});')
        b.P.cues.append((ti, 'pop'))
        b.type(p['name'].upper(), x + 40, y - 70, 32, ti + 0.15, font='cond', plate=PAPER, pad=8)
        last = (x, y)
    if v.get('label'):
        b.words(str(v['label']), 160, 70, 60, 0.4, max_w=1300, plate=INK, fill=PAPER, hot_fill=PAPER, z=90)
    b.P.look(0.0, cx, cy, 0.8)
    b.P.look(t0, cx, cy, 0.95)
    b.P.look(t0 + step * len(pins), last[0], last[1], 1.6 if len(pins) <= 2 else 1.35)
    b.P.look(b.dur, last[0], last[1], 1.7 if len(pins) <= 2 else 1.42)


def document(b: B) -> None:
    """A press cutting, a fact or a quote: the text set in columns, the highlighter swept over its key words."""
    s, ed, ink = b.s, b.ed, b.ink
    v = s['visual']
    kind = v['type']
    if kind == 'press':
        head, body, top = v.get('headline') or '', v.get('standfirst') or '', (v.get('outlet') or '').upper()
    elif kind == 'quote':
        head, body, top = f"“{v.get('text') or ''}”", '', f"— {v.get('who') or ''}".upper()
    else:
        head, body, top = v.get('heading') or '', v.get('text') or '', 'THE RECORD'
    rot = 1.2 * b.side
    b.card(1360, 760, 960, 520, rot, 0.15, tone=NEWS, tape=2, frm=(0, 900))
    b.type(top, 340, 190, 30, 0.5, font='caps')
    keys = {w.lower().strip('.,!?;:“”') for w in str(head + ' ' + body).split() if re.search(r'\d', w) or (w[:1].isupper() and len(w) > 3)}
    _, hr, st1 = b.words(head, 340, 250, 84 if kind != 'quote' else 64, 0.8, max_w=1240, hl=keys, upper=kind != 'quote', style='rise')
    if body:
        b.words(body, 340, hr[1] + hr[3] + 30, 40, st1 + 0.2, font='body', max_w=1240, hl=keys, upper=False, stagger=0.03)
    b.P.look(0.0, 960, 520, 0.9)
    b.P.look(0.8, 900, 400, b.st['push'] * 0.95)
    b.P.look(b.dur, 960, 560, 1.02)


BUILDERS = {'score': result, 'matchday': result, 'versus': result, 'stat': stat, 'timeline': timeline, 'chapter': chapter,
            'open': chapter, 'illustration': illustration, 'turning': turning, 'map': map_panel, 'fact': document,
            'quote': document, 'press': document}


def compose(comp: 'Composition', s: dict) -> Panel:
    kind = s['visual']['type']
    b = B(comp, s)
    broll = b.cin.get('broll')
    if kind in DECOR and broll and broll != 'paper':
        corner = DECOR[kind]
        x, y = (1480, 800) if (corner == 'br') == (b.side > 0) else (430, 260)
        if corner == 'tr':
            x, y = 1530, 210
        b.art(broll, 720, 450, x, y, 5.0 * b.side, 0.0, style='drop', z=12, tape=2)
    fn = BUILDERS.get(kind)
    if fn is None:
        # a type this prototype does not draw yet: the beat's own picture with its narration's first words
        b.s = {**s, 'visual': {'type': 'illustration', 'art': broll or 'terrace-crowd'}}
        fn = illustration
    fn(b)
    b.library()
    for cid in (b.cin.get('lower') or [])[:1]:
        f = _f(b.ed, cid)
        if f:
            b.slip(f, 90 if kind != 'illustration' else 120, 790, max(0.6, b.lead + 0.2))
    if b.cin.get('slug'):
        b.type(str(b.cin['slug']).upper(), 80, 40, 30, 0.2, plate=INK, fill=PAPER, pad=12, max_w=1300)
    P = b.P
    P.focus.sort(key=lambda k: k[0])
    if not P.focus or P.focus[0][0] > 0:
        P.focus.insert(0, (0.0, 960, 540, 0.95))
    out = [P.focus[0]]
    for k in P.focus[1:]:
        if k[0] - out[-1][0] < 0.4:
            if len(out) > 1:
                out[-1] = (max(k[0], out[-2][0] + 0.4),) + tuple(k[1:])
            else:
                out.append((min(P.dur, out[-1][0] + 0.4),) + tuple(k[1:]))
        else:
            out.append(k)
    P.focus = out
    return P


# ==================================================================== the page
CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1920px;height:1080px;overflow:hidden;background:#151310}
#root{position:absolute;inset:0;overflow:hidden}
#cam{position:absolute;inset:0;overflow:hidden;background:var(--news)}
#shk{position:absolute;inset:0}
.board{position:absolute;left:0;top:0;transform-origin:0 0;background-size:100% 100%;will-change:transform}
.near{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
.panel{position:absolute;width:1920px;height:1080px}
.card{position:absolute}
.pbg{position:absolute;max-width:none}
.pic{position:absolute;object-fit:cover}
.illu{position:absolute;right:28px;top:28px;background:var(--ink);color:var(--paper);font-size:22px;padding:6px 12px;letter-spacing:2px}
.bar{position:absolute;left:0;top:0;right:0;height:74px;background:var(--ink);color:var(--paper);padding:0 40px;line-height:74px;letter-spacing:2px;white-space:nowrap;overflow:hidden}
.rule{position:absolute;left:50px;right:50px;height:6px;background:var(--ink)}
.dash{position:absolute;left:0;right:0;top:190px;text-align:center;font-size:120px;color:var(--ink)}
.words{position:absolute;white-space:nowrap;transform-origin:0 0}
.ln{white-space:nowrap}
.w{display:inline-block;overflow:hidden;vertical-align:top;padding:0 .02em .1em;margin-bottom:-.1em}
.wi{display:inline-block;position:relative}
.hk .wi{isolation:isolate}
.hlb{position:absolute;left:-.08em;right:-.08em;top:.18em;bottom:.04em;background:var(--hl);mix-blend-mode:multiply;transform-origin:0 50%;transform:scaleX(0);z-index:-1;border-radius:.08em .2em .12em .25em}
.hlr{position:absolute;background:var(--hl);mix-blend-mode:multiply;transform-origin:0 50%;z-index:60;border-radius:6px 14px 8px 18px}
.type{position:absolute;white-space:nowrap;letter-spacing:.02em;transform-origin:0 0}
.cur{display:inline-block;width:.55em;height:.95em;vertical-align:-.12em;margin-left:.06em}
.pen{position:absolute;left:0;top:0;overflow:visible;z-index:95;pointer-events:none}
.stamp{position:absolute;padding:.12em .42em .1em;border:4px solid var(--ink);white-space:nowrap;line-height:1.05}
.odo{position:absolute;display:flex;line-height:1;height:1em;transform:translate(-50%,-50%);-webkit-text-stroke:4px var(--ink);paint-order:stroke fill;z-index:80}
.oc{display:inline-block;height:1.04em;overflow:hidden}
.os{display:block;line-height:1em;text-align:center}
.oa{display:inline-block}
.flip{position:absolute;perspective:600px;text-align:center;border:4px solid var(--ink);box-shadow:8px 8px 0 var(--ink);z-index:82}
.fv{position:absolute;inset:0;backface-visibility:hidden;transform-origin:50% 50%}
.hinge{position:absolute;left:0;right:0;top:50%;height:3px;background:var(--ink);opacity:.55}
.chip{position:absolute;padding:8px 18px 10px;border:3px solid var(--ink);text-align:center;white-space:nowrap;z-index:70;line-height:1.1}
.dot{position:absolute;width:34px;height:34px;border-radius:50%;border:4px solid var(--ink);z-index:65}
.pin{position:absolute;width:44px;height:44px;border-radius:50% 50% 50% 0;rotate:-45deg;border:4px solid var(--paper);box-shadow:3px 6px 6px rgba(0,0,0,.35);z-index:85}
.cutp{position:absolute}
#veil{position:absolute;inset:0;background:var(--news);opacity:0;pointer-events:none}
#flash{position:absolute;inset:0;background:#fffbf2;opacity:0;pointer-events:none}
#vig{position:absolute;inset:0;background-image:var(--vig);background-size:100% 100%;pointer-events:none}
#grain{position:absolute;inset:-256px;background-image:var(--grain);opacity:.10;mix-blend-mode:overlay;pointer-events:none}
.lb{position:absolute;left:0;right:0;height:120px;background:#0d0b09;transform:scaleY(0)}
.bug{position:absolute;left:40px;top:34px;display:flex;align-items:stretch;height:66px;box-shadow:8px 8px 0 var(--accent);z-index:5}
.bug .ab{background:var(--accent);color:var(--onaccent);padding:0 18px;line-height:66px;font-size:44px}
.bug .cells{background:rgba(21,19,15,.94);display:flex;align-items:center;padding:0 14px;gap:16px}
.bug .lab{font-size:22px;color:#beb6a6;margin-right:6px}
.bug .num{font-size:40px;color:var(--paper);display:inline-block}
.bug .num.hot{color:var(--accent)}
.bug .tab{position:absolute;left:0;top:66px;background:var(--news);color:var(--ink);font-size:18px;padding:6px 11px;white-space:nowrap}
.bug .wdl{position:absolute;left:0;top:104px;display:flex;gap:4px;height:10px;width:100%}
.bug .wdl i{display:block;height:10px;transform-origin:0 50%}
.cap{position:absolute;left:50%;bottom:62px;transform:translateX(-50%);background:var(--ink);box-shadow:9px 9px 0 var(--accent);padding:14px 34px;white-space:nowrap;font-size:46px;color:#968e80;letter-spacing:.02em}
.cap .cw{display:inline-block;padding:0 .12em;margin:0 .08em}
"""

RUNTIME = """
function odo(tl,id,val,t0,dur){
  const el=document.querySelector(id); const cols=[...el.querySelectorAll('.os')]; const o={v:0};
  const set=(v)=>{ const n=cols.length; for(let k=0;k<n;k++){ const p=Math.pow(10,k); let d=Math.floor(v/p)%10;
      const below=(v%p)/p*10; if(k===0){ d=v%10; } else if(below>9){ d+=below-9; } cols[n-1-k].style.transform='translateY('+(-d)+'em)'; } };
  set(0);
  tl.fromTo(o,{v:0},{v:val,duration:dur,ease:'back.out(1.35)',onUpdate:()=>set(Math.max(0,o.v))},t0);
}
function camera(tl,P,boards,nears){
  const veil=document.getElementById('veil'), grain=document.getElementById('grain');
  const pose=(i)=>{ const p=P[Math.max(0,Math.min(P.length-1,i))];
    for(let b=0;b<boards.length;b++){ const on=(b===p[4]); boards[b].style.opacity=on?1:0; nears[b].style.opacity=on?1:0;
      if(!on) continue;
      boards[b].style.transform='translate(960px,540px) rotate('+(-p[3])+'deg) scale('+p[2]+') translate('+(-p[0])+'px,'+(-p[1])+'px)';
      nears[b].style.transform='translate(960px,540px) rotate('+(-p[3])+'deg) scale('+(p[2]*1.22)+') translate('+(-p[0])+'px,'+(-p[1])+'px)'; }
    const th=p[5], ar=p[6]; veil.style.opacity=Math.max(th>0.6?(th-0.6)/0.4:0, ar>0.75?(ar-0.75)/0.25:0);
    grain.style.transform='translate('+((i*37)%256)+'px,'+((i*91)%256)+'px)'; };
  const c={f:0}; pose(0);
  tl.fromTo(c,{f:0},{f:P.length-1,duration:(P.length-1)/FPS,ease:'none',onUpdate:()=>pose(Math.round(c.f))},0);
}
"""


class Composition:
    def __init__(self, ed, plan: dict, project: Path, shots: list[dict] | None = None, fps: int = FPS):
        from ..vox.render import director_id, place
        from ..vox.camera import CameraPath
        self.ed, self.plan, self.root = ed, plan, Path(project)
        self.fps = int(fps)
        self.ink = Ink(ed.pal)
        self.director = director_id(ed)
        self.style = style_of(self.director)
        self.style['layout'] = 'stairs' if self.director == 'trailer' else 'snake'
        self.seed = f"{ed.ledger.get('club_id')}:{ed.ledger.get('season')}"
        self.shots = [s for s in (shots if shots is not None else plan['shots']) if s['visual']['type'] not in CLASSIC]
        if not self.shots:
            raise StageError('HF_EMPTY', 'no board shots to compose')
        self.t0 = float(self.shots[0]['start'])
        self.shots = [{**s, 'start': r3(s['start'] - self.t0), **({'voice_at': r3(s['voice_at'] - self.t0)} if s.get('voice_at') is not None else {})}
                      for s in self.shots]
        self.duration = r3(self.shots[-1]['start'] + self.shots[-1]['frames'] / FPS)
        self.assets = Assets(self.root)
        self.layout = place({'shots': self.shots}, self.style, self.seed)
        self.panels = {s['n']: compose(self, s) for s in self.shots}
        path = []
        for s in self.shots:
            p = self.layout['shots'][s['n']]
            keys = [(t, x + p['ox'], y + p['oy'], z) for (t, x, y, z) in self.panels[s['n']].focus]
            path.append({'n': s['n'], 'start': s['start'], 'dur': s['frames'] / FPS, 'board': p['board'], 'engine': 'vox',
                         'keys': keys, 'ox': p['ox'], 'oy': p['oy']})
        self.path = path
        self.cam = CameraPath(path, self.style)

    # ---------------------------------------------------------------- media
    def clip_video(self, key: str, seconds: float) -> str | None:
        """A library clip as a short muted MP4 (scrubbed of the rival's family by paper.ClipWorld, like the PIL engine)."""
        import subprocess
        import tempfile
        from ..paper import ClipWorld, clip_path, piece_meta
        cp = clip_path(key)
        if not cp:
            return None
        cw = ClipWorld(cp, self.ed.pal.bans, 0.0, size=(960, 540), fps=FPS,
                       accent=self.ed.pal.accent if piece_meta(key).get('accent') == 'key-red' else None)
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / 'clip.mp4'
            p = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '960x540', '-r', str(FPS), '-i', '-',
                                  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p', '-bitexact', '-map_metadata', '-1',
                                  '-fflags', '+bitexact', '-flags:v', '+bitexact', str(out)], stdin=subprocess.PIPE)
            for i in range(int(seconds * FPS)):
                p.stdin.write(cw(i).convert('RGB').tobytes())
            p.stdin.close()
            p.wait()
            cw.close() if hasattr(cw, 'close') else None
            return self.assets.put_file(out, 'clip') if out.exists() else None

    def board_image(self, bi: int) -> str:
        from ..vox.render import BR, board_paper
        from ..vox.compose import PW as PW_, PH as PH_
        b = self.layout['boards'][bi]
        photos = []
        from ..cinema import look
        avoid: set = set()
        for j, mood in enumerate(('home', 'record', 'form', 'away', 'win')):
            k = look.pick([mood, 'home'], self.ed.pal.bans, f'{self.seed}:board{bi}:{j}', avoid)
            if k and k not in avoid:
                avoid.add(k)
                try:
                    photos.append(self.ed.backdrop(k, 7 + j))
                except Exception:  # noqa: BLE001
                    pass
        photos = photos[:max(2, min(5, len(b['panels'])))]
        import re as _re
        years = _re.findall(r'\d{4}', str(self.ed.ledger.get('season') or ''))[:2]
        centres = [(self.layout['shots'][m]['ox'] + PW_ / 2, self.layout['shots'][m]['oy'] + PH_ / 2) for m in b['panels']]
        im = board_paper(b, E.hsh(self.seed, bi), self.style.get('warm', False), hex_rgb(self.ed.pal.accent), photos, years, centres)
        return self.assets.put_image(im, f'board{bi}', q=84)

    # ---------------------------------------------------------------- the glass
    def glass(self) -> tuple[list[str], list[str]]:
        from ..captions import groups
        out, js = [], []
        club = self.ed.ledger.get('club_name') or ''
        season = str(self.ed.ledger.get('season') or '')
        from ..cinema.gfx import abbr
        prev_bug = None
        for s in self.shots:
            cin = s.get('cinema') or {}
            st, du = s['start'], s['frames'] / FPS
            bug = cin.get('bug')
            if bug:
                bid = f'bug{s["n"]}'
                hot = bug.get('hot')
                tot = max(1, sum(int(bug.get(k, 0)) for k in 'WDL'))
                cells = ''.join(f'<span><span class="lab f-caps">{k}</span><span class="num f-cond{" hot" if k == hot else ""}" id="{bid}-{k}">'
                                f'{int(bug.get(k, 0))}</span></span>' for k in 'WDL')
                cols = {'W': self.ink.accent, 'D': PAPER, 'L': INK}
                bars = ''.join(f'<i id="{bid}-b{k}" style="width:{int(bug.get(k, 0)) / tot * 100:.1f}%;background:{rgb(cols[k])};'
                               f'outline:2px solid {rgb(INK)}"></i>' for k in 'WDL')
                out.append(f'<div id="{bid}" class="bug clip" data-start="{r3(st)}" data-duration="{r3(du)}" data-track-index="5">'
                           f'<span class="ab f-cond">{esc(abbr(club))}</span><span class="cells">{cells}</span>'
                           f'<span class="tab f-caps">{esc(season)} · SEASON SO FAR</span><span class="wdl">{bars}</span></div>')
                fresh = prev_bug is None
                if fresh:
                    js.append(f'tl.fromTo("#{bid}",{{x:-520}},{{x:0,duration:0.4,ease:"power3.out"}},{r3(st + 0.15)});')
                    js.append(f'tl.fromTo("#{bid} .wdl i",{{scaleX:0}},{{scaleX:1,duration:0.5,ease:"power2.out",stagger:0.12}},{r3(st + 0.45)});')
                if hot:
                    js.append(f'tl.fromTo("#{bid}-{hot}",{{scale:1,rotationX:-90}},{{scale:1.25,rotationX:0,duration:0.25,ease:"back.out(2)"}},{r3(st + 0.75)});')
                    js.append(f'tl.fromTo("#{bid}-{hot}",{{scale:1.25}},{{scale:1,duration:0.3,immediateRender:false}},{r3(st + 1.5)});')
            prev_bug = bug
            if cin.get('letterbox'):
                for side, k in (('top', 'lbt'), ('bottom', 'lbb')):
                    lid = f'{k}{s["n"]}'
                    out.append(f'<i id="{lid}" class="lb clip" data-start="{r3(st)}" data-duration="{r3(du)}" data-track-index="4" style="{side}:0;transform-origin:50% {"0" if side == "top" else "100%"}"></i>')
                    js.append(f'tl.fromTo("#{lid}",{{scaleY:0}},{{scaleY:1,duration:0.5,ease:"power2.out"}},{r3(st)});')
            words = [w for w in s.get('words') or [] if w.get('w')]
            if words and s.get('voice_at') is not None:
                off = s['voice_at']
                gs = groups(words)
                for gi, g in enumerate(gs):
                    a = off + g[0]['start'] - 0.06
                    bnd = (off + gs[gi + 1][0]['start'] - 0.06) if gi + 1 < len(gs) else min(st + du, off + g[-1]['end'] + 0.35)
                    bnd = max(bnd, off + g[-1]['end'] + 0.05)
                    bnd = min(bnd, st + du)
                    if bnd - a < 0.1:
                        continue
                    cid = f'cap{s["n"]}-{gi}'
                    sp = ''.join(f'<span class="cw" id="{cid}-{j}">{esc(w["w"].upper())}</span>' for j, w in enumerate(g))
                    out.append(f'<div id="{cid}" class="cap f-head clip" data-start="{r3(a)}" data-duration="{r3(bnd - a)}" data-track-index="6">{sp}</div>')
                    js.append(f'tl.fromTo("#{cid}",{{opacity:0,y:18}},{{opacity:1,y:0,duration:0.14}},{r3(a)});')
                    for j, w in enumerate(g):
                        t_w = r3(off + w['start'] - 0.04)
                        js.append(f'tl.fromTo("#{cid}-{j}",{{color:"#968e80",backgroundColor:"rgba(0,0,0,0)"}},{{color:"{rgb(PAPER)}",'
                                  f'backgroundColor:"{rgb(self.ink.accent)}",duration:0.04}},{t_w});')
                        t_off = r3(off + max(w['end'], w['start'] + 0.12))
                        js.append(f'tl.fromTo("#{cid}-{j}",{{backgroundColor:"{rgb(self.ink.accent)}"}},{{backgroundColor:"rgba(0,0,0,0)",'
                                  f'duration:0.04,immediateRender:false}},{t_off});')
        return out, js

    # ---------------------------------------------------------------- the page
    def poses(self) -> list:
        n = int(round(self.duration * self.fps))
        out = []
        for i in range(n):
            p = self.cam.pose(i / self.fps)
            out.append([round(p.cx, 2), round(p.cy, 2), round(p.z, 5), round(p.rot, 3), int(max(0, p.board)), round(p.through, 3), round(p.arrive, 3)])
        return out

    def cues(self) -> dict:
        out = {}
        for i, s in enumerate(self.shots):
            P = self.panels[s['n']]
            cin = s.get('cinema') or {}
            c = list(P.cues)
            w = self.cam.win[i]
            if w['same'] or w['new']:
                c.append((0.0, 'whoosh'))
            from ..cinema.direct import SFX
            lead = (s['voice_at'] - s['start']) if s.get('voice_at') is not None else 0.4
            if cin.get('sfx') in SFX:
                c.append((max(0.0, lead), SFX[cin['sfx']]))
            if cin.get('hush'):
                c.append((0.2, f'hush:{min(P.dur, 4.0):.2f}'))
            if cin.get('crowd'):
                c.append((0.0, f'crowd-bed:{P.dur:.2f}'))
            out[s['n']] = sorted((round(a, 3), b_) for a, b_ in c if a < P.dur)
        return out

    def write(self) -> Path:
        root = self.root
        a = self.assets
        fonts_css = ''
        for name, files in FACES.items():
            for j, fn in enumerate(files):
                url = a.put_file(FONTS / fn, f'font-{name}{j}')
                fonts_css += f"@font-face{{font-family:'hf-{name}{j}';src:url('{url}') format('woff2');font-display:block}}\n"
            fonts_css += f".f-{name}{{font-family:'hf-{name}0','hf-{name}1',sans-serif}}\n"
        shutil.copyfile(gsap_file(), root / 'assets' / 'gsap.min.js')
        gsap = 'assets/gsap.min.js'
        vig = a.put_image(vignette(), 'vig', alpha=True)
        grain_tex = a.put_image(grain_texture(), 'grain')
        ink = self.ink
        vars_css = (f':root{{--accent:{rgb(ink.accent)};--onaccent:{rgb(ink.on_accent)};--pen:{rgb(ink.pen)};--hl:{rgb(ink.hl)};'
                    f'--ink:{rgb(INK)};--paper:{rgb(PAPER)};--news:{rgb(NEWS)};--vig:url({vig});--grain:url({grain_tex})}}\n')
        boards, nears = [], []
        js = []
        for bi, bd in enumerate(self.layout['boards']):
            img = self.board_image(bi)
            panels, near = [], []
            for n in bd['panels']:
                p = self.layout['shots'][n]
                P = self.panels[n]
                panels.append(f'<div class="panel" id="panel{n}" style="left:{p["ox"]:.1f}px;top:{p["oy"]:.1f}px">{"".join(P.html)}</div>')
                near.append(f'<div class="panel" style="left:{p["ox"]:.1f}px;top:{p["oy"]:.1f}px">{"".join(P.near)}</div>')
                js += P.js
                for (ts, amp) in P.shakes:
                    T = r3(P.start + ts)
                    js.append(f'tl.fromTo("#shk",{{x:0,y:0}},{{keyframes:[{{x:{amp},y:{-amp * 0.6:.1f},duration:0.04}},{{x:{-amp * 0.8:.1f},y:{amp * 0.5:.1f},'
                              f'duration:0.05}},{{x:{amp * 0.4:.1f},y:{-amp * 0.3:.1f},duration:0.05}},{{x:0,y:0,duration:0.08}}],immediateRender:false}},{T});')
                for fl in P.flashes:
                    T = r3(P.start + fl)
                    js.append(f'tl.fromTo("#flash",{{opacity:0.55}},{{opacity:0,duration:0.14,immediateRender:false}},{T});')
            boards.append(f'<div class="board" id="board{bi}" style="width:{bd["w"]:.0f}px;height:{bd["h"]:.0f}px;background-image:url({img})">{"".join(panels)}</div>')
            nears.append(f'<div class="near" id="near{bi}">{"".join(near)}</div>')
        glass, gjs = self.glass()
        js += gjs
        poses = self.poses()
        D = self.duration
        page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1920, height=1080">
<script src="{gsap}"></script>
<style>
{fonts_css}{vars_css}{CSS}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{D}" data-width="1920" data-height="1080" data-fps="{self.fps}">
<div id="cam" data-layout-allow-overflow data-layout-allow-overlap data-layout-ignore>
<div id="shk">{''.join(boards)}{''.join(nears)}</div>
<div id="veil"></div><div id="flash"></div><div id="vig"></div><div id="grain"></div>
</div>
<div id="glass" data-layout-allow-overlap>{''.join(glass)}</div>
</div>
<script>
const FPS={self.fps};
{RUNTIME}
const tl=gsap.timeline({{paused:true}});
const P={json.dumps(poses, separators=(',', ':'))};
camera(tl,P,[...document.querySelectorAll('.board')],[...document.querySelectorAll('.near')]);
{chr(10).join(js)}
window.__timelines=window.__timelines||{{}};
window.__timelines["main"]=tl;
tl.seek(0);
</script>
</body>
</html>
"""
        check_colours(page, self.ed.pal.bans)
        (root / 'index.html').write_text(page, encoding='utf-8')
        (root / 'hyperframes.json').write_text(json.dumps({'name': 'vox-hf', 'width': 1920, 'height': 1080, 'fps': self.fps}, indent=1) + '\n')
        return root / 'index.html'


def check_colours(page: str, bans: list[str]) -> None:
    """Rule 95: no colour of a rival's family anywhere on the page — every hex and rgb()/rgba() literal it writes, held to
    the measure the PIL engine's frames are held to (common.is_banned_pixel)."""
    cols = {h: hex_rgb(h) for h in re.findall(r'#[0-9a-fA-F]{6}\b', page)}
    for m in re.finditer(r'rgba?\((\d+),\s*(\d+),\s*(\d+)', page):
        cols[m.group(0)] = tuple(int(x) for x in m.groups())
    bad = sorted(k for k, c in cols.items() if is_banned_pixel(c, list(bans)))
    if bad:
        raise StageError('HF_RIVAL_COLOUR', f'rival colour(s) on the page: {", ".join(bad)}')


def gsap_file() -> Path:
    """GSAP from the studio's own node_modules (studio/hyperframes/package.json pins it) — never a CDN at render time."""
    for p in (HERE / 'node_modules' / 'gsap' / 'dist' / 'gsap.min.js', REPO / 'node_modules' / 'gsap' / 'dist' / 'gsap.min.js'):
        if p.exists():
            return p
    raise StageError('HF_NO_GSAP', 'gsap is not installed: npm ci in scripts/football-stories/studio/hyperframes')


def vignette() -> Image.Image:
    import numpy as np
    yy, xx = np.mgrid[0:270, 0:480].astype('float32')
    r = np.sqrt(((xx - 240) / 240) ** 2 + ((yy - 135) / 135) ** 2)
    a = (np.clip((r - 0.55) / 0.6, 0, 1) ** 1.5 * 0.34 * 255).astype('uint8')
    im = Image.new('RGBA', (480, 270), (30, 20, 10, 0))
    im.putalpha(Image.fromarray(a, 'L'))
    return im


def grain_texture() -> Image.Image:
    import numpy as np
    rng = np.random.default_rng(7)
    a = (rng.normal(128, 46, (512, 512))).clip(0, 255).astype('uint8')
    return Image.fromarray(a, 'L').convert('RGB')
