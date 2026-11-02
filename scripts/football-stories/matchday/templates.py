"""I WAS THERE — the graphic templates of the matchday series, in both frames.

Every board is one HTML page typeset in the Weekly faces (the studio's own font kit, rule 124) and shot by headless
Chromium at the exact output size. Two families, never one design scaled to the other:

  wide  1920×1080 — the YouTube film (and 1280×720 for the thumbnail)
  tall  1080×1920 — Reels / TikTok / Shorts, with the platforms' own UI zones kept clear

The series' signature is the MATCH TICKET: every film opens on a stub stamped I WAS THERE, every score lives on the
ticket's split-flap board, and the end card asks the viewer to stamp their own ticket on FAN LIFE.

Facts on a board come from a fixture row (`Fixture`) — never free text. `--sample` uses one sourced archive row
(24.5.1986, content/manual/matches.json) so the boards can be reviewed before the owner's footage arrives; every sample
board says SAMPLE in its corner. The picture behind a board is a stand-in for the owner's footage and is labelled so.

    python3 scripts/football-stories/matchday/templates.py --sample --out /tmp/iwt-boards
"""
from __future__ import annotations

import argparse
import html
import json
import sys
import tempfile
from dataclasses import asdict, dataclass, field
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from studio.common import INK, NEWSPRINT, PAPER, Palette  # noqa: E402
from studio.sprites import FIT_JS, _font_css  # noqa: E402

ROOT = HERE.parents[2]
BADGE = ROOT / 'public' / 'brand' / 'fanlife' / 'logo-512.png'
BEATS = HERE.parent / 'studio' / 'kit' / 'beats'
SITE = 'fanlife.dubelteam.com'
SERIES = 'I WAS THERE'

WIDE = (1920, 1080)
THUMB = (1280, 720)
TALL = (1080, 1920)
# What Instagram / TikTok / Shorts draw over a vertical video. Nothing that matters may sit inside these bands.
TALL_SAFE = {'top': 250, 'bottom': 420, 'right': 150, 'left': 60}


@dataclass
class Fixture:
    """One match the owner attended, as the archive states it. Strings are printed exactly as given."""
    home: str
    away: str
    home_short: str
    away_short: str
    date_long: str          # '24 May 1986'
    year: str
    ground: str
    city: str
    competition: str
    home_score: int | None = None
    away_score: int | None = None
    goals: list[dict] = field(default_factory=list)   # [{'side': 'home', 'name': 'Landau', 'minute': 86}]
    source: str = ''
    episode: int = 1
    sample: bool = False


def sample_fixture() -> Fixture:
    """The one sourced row used to preview the boards. Read from the archive, not typed (rule 11)."""
    rows = json.loads((ROOT / 'content' / 'manual' / 'matches.json').read_text())
    rows = rows if isinstance(rows, list) else next(v for v in rows.values() if isinstance(v, list))
    row = next(r for r in rows if r.get('playedOn') == '1986-05-24' and r.get('homeClubSlug') == 'הפועל-תל-אביב')
    assert (row['homeScore'], row['awayScore']) == (1, 0), 'archive row changed — re-read before using it as a sample'
    return Fixture(
        home='Hapoel Tel Aviv', away='Maccabi Haifa', home_short='HTA', away_short='MHA',
        date_long='24 May 1986', year='1986', ground='Bloomfield', city='Tel Aviv', competition='League · final round',
        home_score=row['homeScore'], away_score=row['awayScore'],
        goals=[{'side': 'home', 'name': 'Landau', 'minute': 86}],
        source=row['sourceTitle'].split(' — ')[0], episode=1, sample=True)


def esc(s) -> str:
    return html.escape(str(s if s is not None else ''))


def uri(p: Path) -> str:
    return p.resolve().as_uri()


# ── the kit ──────────────────────────────────────────────────────────────────────────────────────────────────────────
CSS = '''
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:%(w)dpx;height:%(h)dpx;overflow:hidden;background:%(ink)s}
body{font-family:'Weekly Body',sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased;position:relative}
:root{--ink:%(ink)s;--paper:%(paper)s;--news:%(news)s;--acc:%(acc)s;--onacc:%(onacc)s}
.foot{position:absolute;inset:0;background-size:cover;background-position:center}
/* the house grade for owner footage: a touch of contrast, less colour, printed dots on top */
.foot.graded{filter:contrast(1.08) saturate(.88) brightness(.82)}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(21,19,15,.55) 1.3px,transparent 1.7px);background-size:7px 7px;mix-blend-mode:multiply;opacity:.35}
.vig{position:absolute;inset:0;box-shadow:inset 0 0 0 14px var(--ink), inset 0 0 220px 40px rgba(21,19,15,.85)}
.head{font-family:'Weekly Head';text-transform:uppercase;line-height:.9}
.caps{font-family:'Weekly Caps';text-transform:uppercase;letter-spacing:.08em}
.brand{font-family:'Shrikhand';line-height:1}
.shout{font-family:'Knewave';line-height:1}
.goal{font-family:'Ultra';line-height:1}
.mono{font-family:'Courier Prime';font-weight:700}
.block{position:relative}
.block::before{content:'';position:absolute;inset:16px -16px -16px 16px;background:var(--ink)}
.card{position:relative;background:var(--paper);border:6px solid var(--ink)}
.news{background:var(--news)}
.acc{background:var(--acc);color:var(--onacc)}
.inkbg{background:var(--ink);color:var(--paper)}
.stroke{-webkit-text-stroke:5px var(--ink);paint-order:stroke fill}
.halftone{background-image:radial-gradient(var(--ink) 2px,transparent 2.4px);background-size:12px 12px}
.speed{background-image:repeating-linear-gradient(-12deg,var(--ink) 0 4px,transparent 4px 22px)}
.perf{border-left:6px dashed var(--ink)}
.flap{display:inline-flex;align-items:center;justify-content:center;background:var(--ink);color:var(--paper);
      font-family:'Ultra';position:relative;border:4px solid var(--ink);box-shadow:inset 0 0 0 3px #2a2620}
.flap::after{content:'';position:absolute;left:0;right:0;top:50%%;height:3px;background:#000;opacity:.7}
.stamp{position:absolute;font-family:'Weekly Head';text-transform:uppercase;color:var(--acc);border:9px solid var(--acc);
       padding:10px 26px 6px;line-height:.9;letter-spacing:.02em;white-space:nowrap;background:rgba(255,251,242,.10);z-index:5}
.stamp::after{content:'';position:absolute;inset:-9px;background-image:radial-gradient(%(paper)s 1.2px,transparent 1.7px),
       radial-gradient(%(paper)s 2px,transparent 2.6px);background-size:9px 13px,37px 29px;background-position:0 0,11px 7px;opacity:.55}
.stamp.solid{background:%(paper)s}
.tape{position:absolute;width:150px;height:44px;background:rgba(236,228,205,.78);border-left:2px dashed rgba(21,19,15,.25);border-right:2px dashed rgba(21,19,15,.25)}
.sample{position:absolute;font-family:'Courier Prime';font-weight:700;font-size:22px;letter-spacing:.06em;color:var(--paper);
        background:var(--ink);padding:6px 12px;border:2px solid var(--paper);opacity:.9;z-index:50}
.badge{position:absolute;border-radius:50%%}
.guide{position:absolute;border:3px dashed rgba(255,251,242,.85);display:flex;align-items:center;justify-content:center;
       color:var(--paper);font-family:'Courier Prime';font-weight:700;font-size:24px;text-align:center;background:rgba(215,25,32,.22)}
'''


class Boards:
    def __init__(self, palette: Palette, out: Path):
        self.p = palette
        self.out = out
        out.mkdir(parents=True, exist_ok=True)
        self.tmp = Path(tempfile.mkdtemp(prefix='iwt-'))

    def __enter__(self):
        from playwright.sync_api import sync_playwright
        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch()
        return self

    def __exit__(self, *a):
        self._browser.close()
        self._pw.stop()

    def shoot(self, name: str, size: tuple[int, int], body: str, extra_css: str = '', sample: bool = False) -> Path:
        w, h = size
        css = CSS % {'w': w, 'h': h, 'ink': INK, 'paper': PAPER, 'news': NEWSPRINT, 'acc': self.p.accent,
                     'onacc': self.p.on_primary}
        tag = '<div class="sample" style="top:22px;left:22px">SAMPLE · stand-in picture · archive row</div>' if sample else ''
        doc = (f'<!doctype html><html><head><meta charset="utf-8"><style>{_font_css()}{css}{extra_css}</style></head>'
               f'<body>{body}{tag}<script>{FIT_JS}</script></body></html>')
        src = self.tmp / f'{name}.html'
        src.write_text(doc)
        page = self._browser.new_page(viewport={'width': w, 'height': h})
        page.goto(uri(src))
        page.evaluate('document.fonts.ready')
        page.wait_for_timeout(150)
        target = self.out / f'{name}.png'
        page.screenshot(path=str(target))
        page.close()
        return target


def footage(art: Path, graded: bool = True) -> str:
    return (f'<div class="foot{" graded" if graded else ""}" style="background-image:url({uri(art)})"></div>'
            '<div class="dots"></div><div class="vig"></div>')


def flaps(text: str, w: int, h: int, size: int) -> str:
    return ''.join(f'<span class="flap" style="width:{w}px;height:{h}px;font-size:{size}px;margin-right:6px">{esc(c)}</span>'
                   for c in text)


def score_text(f: Fixture) -> tuple[str, str]:
    return ('–' if f.home_score is None else str(f.home_score), '–' if f.away_score is None else str(f.away_score))


# ── WIDE · the film ──────────────────────────────────────────────────────────────────────────────────────────────────
def ticket(f: Fixture, scale: float = 1.0) -> str:
    """The signature: a match ticket with a perforated stub, printed on newsprint, stamped I WAS THERE."""
    return f'''
<div class="block" style="width:{1240*scale}px;transform:rotate(-2.5deg)">
 <div class="card news" style="display:flex;height:{470*scale}px">
  <div style="flex:1;padding:{34*scale}px {44*scale}px;display:flex;flex-direction:column;justify-content:space-between">
   <div style="display:flex;align-items:center;justify-content:space-between">
    <div class="caps" style="font-size:{26*scale}px">{esc(f.competition)}</div>
    <div class="caps" style="font-size:{26*scale}px">Admit one · terrace</div>
   </div>
   <div>
    <div class="head" data-fit="{1000*scale:.0f}" style="font-size:{112*scale}px">{esc(f.home)}</div>
    <div class="shout" style="font-size:{46*scale}px;color:var(--acc);margin:{6*scale}px 0 {4*scale}px">v</div>
    <div class="head" data-fit="{1000*scale:.0f}" style="font-size:{112*scale}px">{esc(f.away)}</div>
   </div>
   <div style="display:flex;gap:{30*scale}px;align-items:center">
    <span class="acc caps" style="font-size:{30*scale}px;padding:{8*scale}px {16*scale}px;border:4px solid var(--ink)">{esc(f.date_long)}</span>
    <span class="caps" style="font-size:{30*scale}px">{esc(f.ground)} · {esc(f.city)}</span>
   </div>
  </div>
  <div class="perf halftone" style="width:{230*scale}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:{10*scale}px;background-color:var(--paper)">
   <div class="caps" style="font-size:{22*scale}px;background:var(--paper);padding:2px 8px">Match no.</div>
   <div class="goal" style="font-size:{120*scale}px;background:var(--paper);padding:0 10px">{f.episode:02d}</div>
   <div class="caps" style="font-size:{22*scale}px;background:var(--paper);padding:2px 8px">FAN LIFE</div>
  </div>
 </div>
 <div class="stamp" style="font-size:{92*scale}px;right:{150*scale}px;bottom:{-46*scale}px;transform:rotate(-9deg)">I was there</div>
</div>'''


def b_open(B: Boards, f: Fixture, art: Path) -> Path:
    body = f'''{footage(art)}
<div style="position:absolute;left:86px;top:70px;display:flex;align-items:center;gap:22px">
 <img class="badge" src="{uri(BADGE)}" style="position:static;width:120px;height:120px">
 <div><div class="brand stroke" style="font-size:78px;color:var(--paper);transform:rotate(-3deg)">I was there</div>
 <div class="caps" style="font-size:24px;color:var(--paper);margin-top:6px">a FAN LIFE matchday diary</div></div>
</div>
<div style="position:absolute;left:340px;top:330px">{ticket(f)}</div>'''
    return B.shoot('wide-01-open', WIDE, body, sample=f.sample)


def b_chapter(B: Boards, f: Fixture, art: Path, n: int, title: str) -> Path:
    body = f'''{footage(art)}
<div class="speed" style="position:absolute;left:0;bottom:0;width:1920px;height:420px;opacity:.18"></div>
<div style="position:absolute;left:96px;bottom:120px;display:flex;align-items:flex-end;gap:0">
 <div class="block"><div class="card acc" style="padding:20px 34px 8px;transform:skewX(-8deg)">
   <div class="goal" style="font-size:210px;color:var(--paper);-webkit-text-stroke:6px var(--ink);paint-order:stroke fill">{n:02d}</div></div></div>
 <div class="block" style="margin-left:-6px;margin-bottom:40px"><div class="card" style="padding:26px 40px 18px;transform:skewX(-8deg)">
   <div class="caps" style="font-size:28px;color:var(--acc)">{esc(f.ground)} · {esc(f.date_long)}</div>
   <div class="head" data-fit="900" style="font-size:132px">{esc(title)}</div></div></div>
</div>'''
    return B.shoot(f'wide-02-chapter', WIDE, body, sample=f.sample)


def b_place(B: Boards, f: Fixture, art: Path, place: str, moment: str) -> Path:
    """The lower third: where we are and when, on a strip of taped paper. Never covers more than the bottom fifth."""
    body = f'''{footage(art)}
<div style="position:absolute;left:96px;bottom:96px">
 <div class="block" style="transform:rotate(-1.5deg)"><div class="card" style="display:flex;align-items:stretch">
  <div class="acc goal" style="font-size:54px;padding:18px 26px;border-right:6px solid var(--ink);display:flex;align-items:center">{esc(moment)}</div>
  <div style="padding:16px 30px 12px">
   <div class="head" style="font-size:66px">{esc(place)}</div>
   <div class="caps" style="font-size:24px;margin-top:4px">{esc(f.home)} v {esc(f.away)}</div>
  </div></div>
  <div class="tape" style="left:-40px;top:-18px;transform:rotate(-24deg)"></div>
 </div>
</div>
<img src="{uri(BADGE)}" class="badge" style="right:60px;bottom:52px;width:92px;height:92px;opacity:.9">'''
    return B.shoot('wide-03-place', WIDE, body, sample=f.sample)


def scorebug(f: Fixture, minute: str | None, scale: float = 1.0) -> str:
    hs, as_ = score_text(f)
    s = scale
    clock = (f'<span class="acc goal" style="font-size:{40*s}px;padding:{12*s}px {16*s}px;border-left:5px solid var(--ink)">'
             f'{esc(minute)}</span>') if minute else ''
    return f'''<div class="block"><div class="card" style="display:flex;align-items:center;border-width:5px">
  <span class="head inkbg" style="font-size:{44*s}px;padding:{12*s}px {16*s}px">{esc(f.home_short)}</span>
  <span style="padding:{8*s}px {10*s}px;display:flex">{flaps(hs, 58*s, 72*s, 50*s)}{flaps(as_, 58*s, 72*s, 50*s)}</span>
  <span class="head inkbg" style="font-size:{44*s}px;padding:{12*s}px {16*s}px">{esc(f.away_short)}</span>{clock}
</div></div>'''


def b_goal(B: Boards, f: Fixture, art: Path) -> Path:
    g = next((g for g in f.goals if g.get('minute') is not None), None)
    minute = f"{g['minute']}'" if g else None
    rays = ''.join(f'<div style="position:absolute;left:50%;top:50%;width:1400px;height:70px;background:var(--acc);'
                   f'opacity:.85;transform-origin:0 50%;transform:rotate({a}deg)"></div>' for a in range(0, 360, 30))
    body = f'''{footage(art)}
<div style="position:absolute;inset:0;overflow:hidden;opacity:.55">{rays}</div>
<div style="position:absolute;left:60px;top:54px">{scorebug(f, minute, 1.0)}</div>
<div style="position:absolute;left:0;right:0;top:300px;text-align:center">
 <div class="shout stroke" style="font-size:330px;color:var(--paper);transform:rotate(-6deg);-webkit-text-stroke:12px var(--ink);
   text-shadow:18px 18px 0 var(--ink)">Goal!</div>
 {f'<div class="block" style="display:inline-block;margin-top:40px"><div class="card" style="padding:14px 34px 8px"><span class="head" style="font-size:72px">{esc(g["name"])} {esc(minute)}</span></div></div>' if g else ''}
</div>'''
    return B.shoot('wide-04-goal', WIDE, body, sample=f.sample)


def b_fulltime(B: Boards, f: Fixture, art: Path) -> Path:
    hs, as_ = score_text(f)
    scorers = ' · '.join(f"{g['name']} {g['minute']}'" for g in f.goals if g.get('minute') is not None)
    body = f'''{footage(art)}
<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-52%) rotate(1.5deg)">
 <div class="block"><div class="card news" style="width:1500px">
  <div class="acc caps" style="font-size:34px;padding:14px 30px;border-bottom:6px solid var(--ink);display:flex;justify-content:space-between">
   <span>Full time</span><span>{esc(f.ground)} · {esc(f.date_long)}</span></div>
  <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:40px 40px 24px;gap:30px">
   <div class="head" data-fit="470" style="font-size:84px;text-align:right">{esc(f.home)}</div>
   <div style="display:flex;gap:14px">{flaps(hs, 130, 170, 120)}<span class="goal" style="font-size:90px;align-self:center">:</span>{flaps(as_, 130, 170, 120)}</div>
   <div class="head" data-fit="470" style="font-size:84px">{esc(f.away)}</div>
  </div>
  <div style="padding:0 40px 30px;display:flex;justify-content:space-between;align-items:flex-end">
   <div class="caps" style="font-size:30px">{esc(scorers)}</div>
   <div class="mono" style="font-size:20px;opacity:.75">source: {esc(f.source)}</div>
  </div></div></div>
 <div class="stamp solid" style="font-size:72px;right:-50px;top:-84px;transform:rotate(7deg)">I was there</div>
</div>'''
    return B.shoot('wide-05-fulltime', WIDE, body, sample=f.sample)


def b_end(B: Boards, f: Fixture, art: Path) -> Path:
    """End screen: YouTube draws its own elements in the dashed slots (two videos, subscribe). We draw the rest."""
    body = f'''{footage(art)}
<div class="halftone" style="position:absolute;inset:0;opacity:.18"></div>
<div style="position:absolute;left:96px;top:96px;width:760px">
 <div class="brand stroke" style="font-size:96px;color:var(--paper);transform:rotate(-3deg)">Were you there?</div>
 <div class="block" style="margin-top:46px;width:700px"><div class="card news" style="padding:28px 34px">
  <div class="head" style="font-size:58px">Stamp your ticket</div>
  <div style="font-size:32px;margin-top:12px;line-height:1.25">Find the match in the FAN LIFE archive and mark it <b>I was there</b>.</div>
  <div class="acc caps" style="display:inline-block;margin-top:22px;font-size:32px;padding:10px 18px;border:4px solid var(--ink)">{SITE}</div>
 </div></div>
</div>
<div class="guide" style="left:1010px;top:150px;width:780px;height:439px">YouTube end-screen<br>video 1 · 780×439</div>
<div class="guide" style="left:1010px;top:640px;width:500px;height:281px">video 2</div>
<div class="guide" style="left:1560px;top:660px;width:240px;height:240px;border-radius:50%">subscribe</div>
<img src="{uri(BADGE)}" class="badge" style="left:96px;bottom:70px;width:110px;height:110px">'''
    return B.shoot('wide-06-end', WIDE, body, sample=f.sample)


def b_thumb(B: Boards, f: Fixture, art: Path, words: str, sub: str) -> Path:
    body = f'''{footage(art, graded=False)}
<div style="position:absolute;left:0;top:0;bottom:0;width:640px;background:var(--ink);opacity:.9"></div>
<div class="halftone" style="position:absolute;left:640px;top:0;bottom:0;width:120px;opacity:.9"></div>
<div style="position:absolute;left:52px;top:64px;width:700px">
 <div class="head stroke" data-fith="330" style="font-size:168px;color:var(--paper);-webkit-text-stroke:8px var(--ink);text-shadow:10px 10px 0 var(--acc)">{esc(words)}</div>
 <div class="acc caps" style="display:inline-block;margin-top:26px;font-size:34px;padding:10px 18px;border:5px solid var(--ink)">{esc(sub)}</div>
</div>
<div class="stamp solid" style="font-size:64px;left:56px;bottom:60px;transform:rotate(-8deg);background:rgba(255,251,242,.92)">I was there</div>
<img src="{uri(BADGE)}" class="badge" style="right:34px;top:30px;width:118px;height:118px">'''
    return B.shoot('wide-07-thumbnail', THUMB, body, sample=f.sample)


# ── TALL · Reels / TikTok / Shorts ───────────────────────────────────────────────────────────────────────────────────
def safe_box() -> str:
    s = TALL_SAFE
    return f'left:{s["left"]}px;right:{s["right"]}px;top:{s["top"]}px;bottom:{s["bottom"]}px'


def t_guide(B: Boards, f: Fixture, art: Path) -> Path:
    s = TALL_SAFE
    body = f'''{footage(art)}
<div class="guide" style="left:0;right:0;top:0;height:{s["top"]}px">platform UI · keep clear</div>
<div class="guide" style="left:0;right:0;bottom:0;height:{s["bottom"]}px">caption · handle · music · keep clear</div>
<div class="guide" style="right:0;top:{s["top"]}px;bottom:{s["bottom"]}px;width:{s["right"]}px;writing-mode:vertical-rl">buttons</div>
<div style="position:absolute;{safe_box()};border:4px solid var(--paper);display:flex;align-items:center;justify-content:center">
 <div class="caps" style="font-size:34px;color:var(--paper);background:var(--ink);padding:10px 16px">safe area · {1080-s["left"]-s["right"]}×{1920-s["top"]-s["bottom"]}</div></div>'''
    return B.shoot('tall-00-safe-zones', TALL, body, sample=f.sample)


def t_hook(B: Boards, f: Fixture, art: Path, hook: str, accent_words: str) -> Path:
    body = f'''{footage(art)}
<div style="position:absolute;{safe_box()}">
 <div style="transform:rotate(-3deg);margin-top:30px">
  <div class="head stroke" data-fith="420" style="font-size:118px;color:var(--paper);-webkit-text-stroke:7px var(--ink);text-shadow:9px 9px 0 var(--ink)">{esc(hook)}</div>
  <div class="head acc" style="display:inline-block;font-size:118px;padding:6px 18px 0;border:6px solid var(--ink);margin-top:10px;box-shadow:12px 12px 0 var(--ink)">{esc(accent_words)}</div>
 </div>
 <div style="position:absolute;left:0;bottom:30px;display:flex;align-items:center;gap:18px">
  <img src="{uri(BADGE)}" style="width:110px;height:110px;border-radius:50%">
  <div><div class="brand stroke" style="font-size:54px;color:var(--paper)">I was there</div>
   <div class="caps" style="font-size:24px;color:var(--paper)">{esc(f.ground)} · {esc(f.year)}</div></div>
 </div>
</div>'''
    return B.shoot('tall-01-hook', TALL, body, sample=f.sample)


def t_captions(B: Boards, f: Fixture, art: Path, words: list[str], active: int) -> Path:
    """Burnt-in captions: three or four words at a time, the spoken word on the club's colour, centred low in the safe
    area (above the platform's caption band, below the faces line)."""
    spans = ''.join(
        f'<span class="head" style="display:inline-block;margin:6px 10px;padding:6px 14px 0;font-size:104px;'
        + ('background:var(--acc);color:var(--onacc);border:5px solid var(--ink);box-shadow:8px 8px 0 var(--ink);transform:rotate(-2deg)'
           if i == active else 'color:var(--paper);-webkit-text-stroke:6px var(--ink);paint-order:stroke fill')
        + f'">{esc(w)}</span>' for i, w in enumerate(words))
    body = f'''{footage(art)}
<div style="position:absolute;left:{TALL_SAFE["left"]}px;right:{TALL_SAFE["right"]}px;top:1060px;text-align:center">{spans}</div>
<div style="position:absolute;left:{TALL_SAFE["left"]}px;top:{TALL_SAFE["top"]+20}px">{scorebug(f, None, 0.82)}</div>'''
    return B.shoot('tall-02-captions', TALL, body, sample=f.sample)


def t_fulltime(B: Boards, f: Fixture, art: Path) -> Path:
    hs, as_ = score_text(f)
    body = f'''{footage(art)}
<div style="position:absolute;{safe_box()};display:flex;flex-direction:column;justify-content:center;align-items:center">
 <div class="block" style="transform:rotate(-2deg);width:820px"><div class="card news">
  <div class="acc caps" style="font-size:34px;padding:12px 26px;border-bottom:6px solid var(--ink)">Full time · {esc(f.date_long)}</div>
  <div style="padding:30px 30px 10px;text-align:center">
   <div class="head" data-fit="740" style="font-size:86px">{esc(f.home)}</div>
   <div style="display:flex;justify-content:center;gap:12px;margin:22px 0">{flaps(hs, 140, 180, 128)}<span style="width:24px"></span>{flaps(as_, 140, 180, 128)}</div>
   <div class="head" data-fit="740" style="font-size:86px">{esc(f.away)}</div>
  </div>
  <div class="caps" style="font-size:26px;text-align:center;padding:10px 0 26px">{esc(f.ground)} · {esc(f.city)}</div>
 </div></div>
 <div class="stamp solid" style="position:relative;font-size:96px;margin-top:40px;transform:rotate(-8deg)">I was there</div>
</div>'''
    return B.shoot('tall-03-fulltime', TALL, body, sample=f.sample)


def t_end(B: Boards, f: Fixture, art: Path) -> Path:
    body = f'''{footage(art)}
<div class="halftone" style="position:absolute;inset:0;opacity:.2"></div>
<div style="position:absolute;{safe_box()};display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:40px">
 <img src="{uri(BADGE)}" style="width:190px;height:190px;border-radius:50%">
 <div class="brand stroke" style="font-size:118px;color:var(--paper);transform:rotate(-4deg);line-height:1.05">Were you<br>there?</div>
 <div class="block"><div class="card news" style="padding:24px 30px">
  <div class="head" style="font-size:62px">Stamp your ticket</div>
  <div class="caps" style="font-size:30px;margin-top:10px">link in bio →</div>
  <div class="acc caps" style="display:inline-block;margin-top:10px;font-size:32px;padding:8px 14px;border:4px solid var(--ink)">{SITE}/today</div>
 </div></div>
</div>'''
    return B.shoot('tall-04-end', TALL, body, sample=f.sample)


# ── run ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
def render_all(f: Fixture, palette: Palette, out: Path) -> list[Path]:
    wide_art = BEATS / 'hapoel-tel-aviv-1999-00' / 'terrace-scarves-scoreboard.webp'
    walk_art = BEATS / 'hapoel-tel-aviv-1999-00' / 'street-march-scarves.webp'
    goal_art = BEATS / 'hapoel-tel-aviv-1999-00' / 'crowd-behind-goal-scarves.webp'
    tall_art = BEATS / 'hapoel-tel-aviv-1999-00' / 'supporter-scarf-raised.webp'
    gate_art = BEATS / 'hapoel-tel-aviv-1999-00' / 'ticket-ball-turnstile.webp'
    g = f.goals[0] if f.goals else None
    with Boards(palette, out) as B:
        return [
            b_open(B, f, gate_art),
            b_chapter(B, f, walk_art, 1, 'The walk in'),
            b_place(B, f, wide_art, f.ground, 'Kick-off'),
            b_goal(B, f, goal_art),
            b_fulltime(B, f, wide_art),
            b_end(B, f, wide_art),
            b_thumb(B, f, goal_art, f"{g['minute']}th minute." if g else f.ground, f'{f.home_short} v {f.away_short} · {f.year}'),
            t_guide(B, f, tall_art),
            t_hook(B, f, tall_art, 'Last day. One goal.', f"Minute {g['minute']}." if g else f.ground),
            t_captions(B, f, goal_art, ['the', 'whole', 'ground', 'jumped'], 2),
            t_fulltime(B, f, tall_art),
            t_end(B, f, tall_art),
        ]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--sample', action='store_true', help='preview with the one sourced archive row')
    ap.add_argument('--fixture', type=Path, help='a fixture JSON (fields of Fixture)')
    ap.add_argument('--out', type=Path, default=Path('/tmp/iwt-boards'))
    a = ap.parse_args()
    if a.fixture:
        f = Fixture(**json.loads(a.fixture.read_text()))
    elif a.sample:
        f = sample_fixture()
    else:
        ap.error('--sample or --fixture')
    palette = Palette('hapoel-tel-aviv', 'Hapoel Tel Aviv', '#D71920', PAPER, ['yellow'])
    for p in render_all(f, palette, a.out):
        print(p)


if __name__ == '__main__':
    main()
