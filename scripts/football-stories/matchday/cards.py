"""I WAS THERE — the graphic layers a film is built from, shot as PNGs at the output size.

Overlays are transparent (they sit on footage); `paper_*` and `band_*` are the opaque newsprint grounds a clip of the
other shape is set into (a vertical clip in the wide film, a wide clip in a reel — RULES §7). Typeset in the Weekly
faces through the same kit as templates.py; every fact comes from the episode's fixture block.
"""
from __future__ import annotations

import tempfile
from pathlib import Path

from templates import BADGE, CSS, FIT_JS, INK, NEWSPRINT, PAPER, SITE, _font_css, esc, flaps, ticket, uri  # noqa: F401

CLEAR = 'html,body{background:transparent!important}'


class Painter:
    def __init__(self, accent: str, on_accent: str = PAPER):
        self.acc, self.onacc = accent, on_accent
        self.tmp = Path(tempfile.mkdtemp(prefix='iwt-cards-'))

    def __enter__(self):
        from playwright.sync_api import sync_playwright
        self._pw = sync_playwright().start()
        self._b = self._pw.chromium.launch()
        return self

    def __exit__(self, *a):
        self._b.close()
        self._pw.stop()

    def shoot(self, target: Path, size: tuple[int, int], body: str, clear: bool = True, extra: str = '') -> Path:
        w, h = size
        css = CSS % {'w': w, 'h': h, 'ink': INK, 'paper': PAPER, 'news': NEWSPRINT, 'acc': self.acc, 'onacc': self.onacc}
        doc = (f'<!doctype html><html><head><meta charset="utf-8"><style>{_font_css()}{css}{CLEAR if clear else ""}{extra}'
               f'</style></head><body>{body}<script>{FIT_JS}</script></body></html>')
        src = self.tmp / (target.stem + '.html')
        src.write_text(doc)
        page = self._b.new_page(viewport={'width': w, 'height': h})
        page.goto(uri(src))
        page.evaluate('document.fonts.ready')
        page.wait_for_timeout(120)
        target.parent.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(target), omit_background=clear)
        page.close()
        return target


# ── shared pieces ────────────────────────────────────────────────────────────────────────────────────────────────────
class F:
    """The fixture block of an episode, read once."""
    def __init__(self, d: dict):
        self.__dict__.update(d)
        self.hs = '–' if d.get('home_score') is None else str(d['home_score'])
        self.as_ = '–' if d.get('away_score') is None else str(d['away_score'])


def finish(P: Painter, out: Path, size: tuple[int, int]) -> Path:
    """The house finish over every frame: a 14px ink frame and a faint printed dot."""
    w, h = size
    body = ('<div style="position:absolute;inset:0;background-image:radial-gradient(rgba(21,19,15,.32) 1.2px,transparent 1.6px);'
            'background-size:7px 7px"></div><div style="position:absolute;inset:0;box-shadow:inset 0 0 0 14px var(--ink)"></div>')
    return P.shoot(out, size, body)


# ── WIDE overlays ────────────────────────────────────────────────────────────────────────────────────────────────────
def w_open(P: Painter, f: F, out: Path) -> Path:
    body = f'''
<div style="position:absolute;left:86px;top:70px;display:flex;align-items:center;gap:22px">
 <img src="{uri(BADGE)}" style="width:120px;height:120px;border-radius:50%">
 <div><div class="brand stroke" style="font-size:78px;color:var(--paper);transform:rotate(-3deg)">I was there</div>
 <div class="caps" style="font-size:24px;color:var(--paper);margin-top:6px">a FAN LIFE matchday diary</div></div>
</div>
<div style="position:absolute;left:340px;top:330px">{ticket(f)}</div>'''
    return P.shoot(out, (1920, 1080), body)


def w_chapter(P: Painter, f: F, n: int, title: str, out: Path) -> Path:
    body = f'''
<div style="position:absolute;left:96px;bottom:110px;display:flex;align-items:flex-end">
 <div class="block"><div class="card acc" style="padding:16px 28px 6px;transform:skewX(-8deg)">
   <div class="goal" style="font-size:150px;color:var(--paper);-webkit-text-stroke:5px var(--ink);paint-order:stroke fill">{n:02d}</div></div></div>
 <div class="block" style="margin-left:-6px;margin-bottom:30px"><div class="card" style="padding:20px 34px 14px;transform:skewX(-8deg)">
   <div class="caps" style="font-size:24px;color:var(--acc)">{esc(f.ground)} · {esc(f.date_long)}</div>
   <div class="head" data-fit="820" style="font-size:104px">{esc(title)}</div></div></div>
</div>'''
    return P.shoot(out, (1920, 1080), body)


def w_fulltime(P: Painter, f: F, out: Path) -> Path:
    scorers = ' · '.join(f"{g['name']} {g['minute_label']}" for g in f.goals)
    body = f'''
<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-52%) rotate(1.5deg)">
 <div class="block"><div class="card news" style="width:1500px">
  <div class="acc caps" style="font-size:34px;padding:14px 30px;border-bottom:6px solid var(--ink);display:flex;justify-content:space-between">
   <span>Full time</span><span>{esc(f.ground)} · {esc(f.date_long)}</span></div>
  <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:40px 40px 24px;gap:30px">
   <div class="head" data-fit="470" style="font-size:84px;text-align:right">{esc(f.home)}</div>
   <div style="display:flex;gap:14px">{flaps(f.hs, 130, 170, 120)}<span class="goal" style="font-size:90px;align-self:center">:</span>{flaps(f.as_, 130, 170, 120)}</div>
   <div class="head" data-fit="470" style="font-size:84px">{esc(f.away)}</div>
  </div>
  <div style="padding:0 40px 30px;display:flex;justify-content:space-between;align-items:flex-end;gap:30px">
   <div class="caps" data-fit="1000" style="font-size:30px">{esc(scorers)}</div>
   <div class="mono" style="font-size:20px;opacity:.75;white-space:nowrap">source: {esc(f.source)}</div>
  </div></div></div>
 <div class="stamp solid" style="font-size:72px;right:-50px;top:-84px;transform:rotate(7deg)">I was there</div>
</div>'''
    return P.shoot(out, (1920, 1080), body)


def w_end(P: Painter, f: F, out: Path) -> Path:
    """YouTube's own end-screen elements go on the right half; this card holds the left."""
    body = f'''
<div style="position:absolute;left:0;top:0;bottom:0;width:900px;background:var(--ink);opacity:.82"></div>
<div style="position:absolute;left:96px;top:110px;width:760px">
 <div class="brand stroke" style="font-size:100px;color:var(--paper);transform:rotate(-3deg)">Were you there?</div>
 <div class="block" style="margin-top:50px;width:700px"><div class="card news" style="padding:28px 34px">
  <div class="head" style="font-size:58px">Stamp your ticket</div>
  <div style="font-size:32px;margin-top:12px;line-height:1.25">Find {esc(f.home)} v {esc(f.away)}, {esc(f.date_long)}, in the FAN LIFE archive and mark it <b>I was there</b>.</div>
  <div class="acc caps" style="display:inline-block;margin-top:22px;font-size:32px;padding:10px 18px;border:4px solid var(--ink)">{SITE}</div>
 </div></div>
</div>
<img src="{uri(BADGE)}" style="position:absolute;left:96px;bottom:70px;width:110px;height:110px;border-radius:50%">'''
    return P.shoot(out, (1920, 1080), body)


def w_paper(P: Painter, f: F, n: int | None, title: str, lines: list[str], out: Path) -> Path:
    """Opaque newsprint ground for a vertical clip in the wide film: the clip window sits at x 192–737, y 62–1018."""
    lines_html = ''.join(f'<div style="font-size:40px;line-height:1.25;margin-top:16px">{esc(l)}</div>' for l in lines)
    num = (f'<div class="block" style="display:inline-block;margin-bottom:26px"><div class="card acc" style="padding:8px 22px 0;transform:skewX(-8deg)">'
           f'<span class="goal" style="font-size:96px;color:var(--paper);-webkit-text-stroke:4px var(--ink);paint-order:stroke fill">{n:02d}</span></div></div>') if n else ''
    body = f'''
<div style="position:absolute;inset:0;background:var(--news)"></div>
<div class="halftone" style="position:absolute;left:0;top:0;width:930px;bottom:0;opacity:.13"></div>
<div style="position:absolute;left:150px;top:30px;width:630px;height:1020px;background:var(--ink);transform:rotate(-1.2deg)"></div>
<div style="position:absolute;left:880px;top:150px;width:900px">
 {num}
 <div class="head" data-fith="330" style="font-size:132px">{esc(title)}</div>
 <div style="width:160px;height:10px;background:var(--acc);margin:30px 0 10px"></div>
 {lines_html}
 <div class="caps" style="font-size:24px;margin-top:40px;opacity:.75">{esc(f.home)} v {esc(f.away)} · {esc(f.date_long)}</div>
</div>
<div style="position:absolute;inset:0;box-shadow:inset 0 0 0 14px var(--ink)"></div>'''
    return P.shoot(out, (1920, 1080), body, clear=False)


def w_tape(P: Painter, out: Path) -> Path:
    """Tape over the clip window's top corners (window x 192–737, y 62)."""
    body = ('<div class="tape" style="left:150px;top:44px;transform:rotate(-28deg)"></div>'
            '<div class="tape" style="left:640px;top:44px;transform:rotate(26deg)"></div>')
    return P.shoot(out, (1920, 1080), body)


# ── TALL overlays (Reels / TikTok / Shorts) ──────────────────────────────────────────────────────────────────────────
SAFE = 'left:60px;right:150px;top:250px;bottom:420px'


def t_hook(P: Painter, f: F, hook: str, accent: str, out: Path) -> Path:
    body = f'''
<div style="position:absolute;{SAFE}">
 <div style="transform:rotate(-3deg);margin-top:30px">
  <div class="head stroke" data-fith="300" style="font-size:118px;color:var(--paper);-webkit-text-stroke:7px var(--ink);text-shadow:9px 9px 0 var(--ink)">{esc(hook)}</div>
  <div class="head acc" style="display:inline-block;font-size:118px;padding:6px 18px 0;border:6px solid var(--ink);margin-top:10px;box-shadow:12px 12px 0 var(--ink)">{esc(accent)}</div>
 </div>
 <div style="position:absolute;left:0;bottom:30px;display:flex;align-items:center;gap:18px">
  <img src="{uri(BADGE)}" style="width:110px;height:110px;border-radius:50%">
  <div><div class="brand stroke" style="font-size:54px;color:var(--paper)">I was there</div>
   <div class="caps" style="font-size:24px;color:var(--paper)">{esc(f.ground)} · {esc(f.year)}</div></div>
 </div>
</div>'''
    return P.shoot(out, (1080, 1920), body)


def t_band(P: Painter, f: F, headline: str, sub: str, out: Path) -> Path:
    """Opaque newsprint ground for a wide clip in a reel: the clip sits at y 656–1264."""
    body = f'''
<div style="position:absolute;inset:0;background:var(--news)"></div>
<div class="halftone" style="position:absolute;left:0;right:0;top:0;height:640px;opacity:.12"></div>
<div style="position:absolute;left:60px;right:150px;top:270px">
 <div class="head" data-fith="340" style="font-size:112px">{esc(headline)}</div>
</div>
<div style="position:absolute;left:0;right:0;top:640px;height:640px;background:var(--ink)"></div>
<div style="position:absolute;left:60px;right:150px;top:470px">
 <div class="caps" style="font-size:34px;color:var(--acc)">{esc(sub)}</div>
 <div class="caps" style="font-size:24px;margin-top:10px;opacity:.75">{esc(f.ground)} · {esc(f.date_long)}</div>
</div>'''
    return P.shoot(out, (1080, 1920), body, clear=False)


def t_caption(P: Painter, words: list[str], active: int, out: Path) -> Path:
    """The studio's caption plate (studio/captions.py), stood up for 9:16: an ink plate on an accent second plate,
    words in capitals, the spoken word on an accent block, the words still to come in warm grey."""
    spans = ''.join(
        f'<span class="head" style="display:inline-block;margin:2px 8px;padding:4px 10px 0;font-size:70px;text-transform:uppercase;'
        + ('background:var(--acc);color:var(--paper)' if i == active else
           ('color:var(--paper)' if i < active or active < 0 else 'color:#968E80'))
        + f'">{esc(w)}</span>' for i, w in enumerate(words))
    body = (f'<div style="position:absolute;left:60px;right:150px;top:1330px;text-align:center">'
            f'<div style="display:inline-block;background:var(--ink);box-shadow:12px 12px 0 var(--acc);padding:20px 22px 14px;'
            f'transform:rotate(-1.5deg)">{spans}</div></div>')
    return P.shoot(out, (1080, 1920), body)


def t_fulltime(P: Painter, f: F, out: Path) -> Path:
    scorers = ' · '.join(f"{g['name']} {g['minute_label']}" for g in f.goals)
    body = f'''
<div style="position:absolute;{SAFE};display:flex;flex-direction:column;justify-content:center;align-items:center">
 <div class="block" style="transform:rotate(-2deg);width:820px"><div class="card news">
  <div class="acc caps" style="font-size:32px;padding:12px 26px;border-bottom:6px solid var(--ink)">Full time · {esc(f.date_long)}</div>
  <div style="padding:26px 30px 6px;text-align:center">
   <div class="head" data-fit="740" style="font-size:80px">{esc(f.home)}</div>
   <div style="display:flex;justify-content:center;gap:12px;margin:18px 0">{flaps(f.hs, 130, 168, 118)}<span style="width:24px"></span>{flaps(f.as_, 130, 168, 118)}</div>
   <div class="head" data-fit="740" style="font-size:80px">{esc(f.away)}</div>
  </div>
  <div class="caps" data-fit="740" style="font-size:24px;text-align:center;padding:8px 20px 22px">{esc(scorers)}</div>
 </div></div>
 <div class="stamp solid" style="position:relative;font-size:84px;margin-top:36px;transform:rotate(-8deg)">I was there</div>
</div>'''
    return P.shoot(out, (1080, 1920), body)


def t_end(P: Painter, f: F, out: Path) -> Path:
    body = f'''
<div style="position:absolute;inset:0;background:var(--ink);opacity:.7"></div>
<div style="position:absolute;{SAFE};display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:40px">
 <img src="{uri(BADGE)}" style="width:180px;height:180px;border-radius:50%">
 <div class="brand stroke" style="font-size:118px;color:var(--paper);transform:rotate(-4deg);line-height:1.05">Were you<br>there?</div>
 <div class="block"><div class="card news" style="padding:24px 30px">
  <div class="head" style="font-size:62px">Stamp your ticket</div>
  <div class="caps" style="font-size:30px;margin-top:10px">link in bio →</div>
  <div class="acc caps" style="display:inline-block;margin-top:10px;font-size:32px;padding:8px 14px;border:4px solid var(--ink)">{SITE}/today</div>
 </div></div>
</div>'''
    return P.shoot(out, (1080, 1920), body)
