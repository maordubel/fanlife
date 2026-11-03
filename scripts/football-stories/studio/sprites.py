"""Graphic sprites: the owner's kit, typeset in the Weekly faces by a headless Chromium, as transparent PNGs.

Every card follows the geometry of the FanLife video kits (offset ink shadow block, an accent header bar, halftone dots,
skewed chapter plates) and is drawn as HTML so long names fit: text shrinks to its box instead of overflowing.
The neutral #808080 of the kit is replaced by the club's permitted accent (Palette.accent — never a rival colour).
A data card prints the CLAIM's fields; it never receives free text for a score, a date or a team.
"""
from __future__ import annotations

import datetime as dt
import html
import re
import os
from pathlib import Path

from .common import FONTS, INK, KIT, NEWSPRINT, PAPER, Palette, StageError

FACES = {
    'Weekly Head': ['weekly-head-latin.woff2', 'weekly-head-latin-ext.woff2'],
    'Weekly Caps': ['weekly-caps-latin.woff2', 'weekly-caps-latin-ext.woff2'],
    'Weekly Body': ['weekly-body-latin.woff2', 'weekly-body-latin-ext.woff2'],
    'Ultra': ['ultra-latin-400-normal.woff2', 'ultra-latin-ext-400-normal.woff2'],
    'Shrikhand': ['shrikhand-latin-400-normal.woff2', 'shrikhand-latin-ext-400-normal.woff2'],
    'Knewave': ['knewave-latin-400-normal.woff2', 'knewave-latin-ext-400-normal.woff2'],
    'Courier Prime': ['courier-prime-latin-700-normal.woff2', 'courier-prime-latin-ext-700-normal.woff2'],
}


def _font_css() -> str:
    out = []
    for fam, files in FACES.items():
        for f in files:
            p = FONTS / f
            if p.exists():
                out.append(f"@font-face{{font-family:'{fam}';src:url('{p.as_uri()}') format('woff2');}}")
    return '\n'.join(out)


def esc(s) -> str:
    return html.escape(str(s if s is not None else ''))


def long_date(iso: str | None) -> str:
    if not iso:
        return ''
    d = dt.date.fromisoformat(iso)
    return f'{d.day} {d.strftime("%B")} {d.year}'


BASE_CSS = '''
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:transparent;}
body{font-family:'Weekly Body',sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}
:root{--ink:%(ink)s;--paper:%(paper)s;--news:%(news)s;--accent:%(accent)s;--onacc:%(onacc)s}
.s{display:inline-block;position:relative;padding:0 26px 26px 0}
.sh{position:absolute;inset:18px 0 0 18px;background:var(--ink)}
.box{position:relative;background:var(--paper);border:6px solid var(--ink)}
.bar{background:var(--accent);color:var(--onacc);border-bottom:5px solid var(--ink);font-family:'Weekly Caps';letter-spacing:.06em;text-transform:uppercase}
.dots{background-image:radial-gradient(var(--ink) 2.2px,transparent 2.6px);background-size:14px 14px;opacity:.85}
.lines{background-image:repeating-linear-gradient(45deg,var(--ink) 0 3px,transparent 3px 15px)}
.head{font-family:'Weekly Head';text-transform:uppercase;line-height:.92;letter-spacing:.005em}
.caps{font-family:'Weekly Caps';text-transform:uppercase;letter-spacing:.07em}
.goal{font-family:'Ultra';line-height:1}
.src{font-family:'Weekly Caps';text-transform:uppercase;letter-spacing:.08em;font-size:20px;opacity:.75}
.fit{white-space:nowrap}
'''

FIT_JS = '''
const textWidth = el => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width; };
for (const el of document.querySelectorAll('[data-fit]')) {
  const max = +el.dataset.fit; let size = parseFloat(getComputedStyle(el).fontSize);
  el.style.whiteSpace = 'nowrap';
  while (textWidth(el) > max && size > 12) { size -= 2; el.style.fontSize = size + 'px'; }
}
for (const el of document.querySelectorAll('[data-fith]')) {
  const max = +el.dataset.fith; let size = parseFloat(getComputedStyle(el).fontSize);
  while (el.scrollHeight > max && size > 14) { size -= 2; el.style.fontSize = size + 'px'; }
}
'''


class SpriteFactory:
    """One Chromium for a whole job. `render(html)` → path of a transparent PNG cropped to the sprite."""

    def __init__(self, palette: Palette, out: Path):
        self.palette = palette
        self.out = out
        out.mkdir(parents=True, exist_ok=True)
        self._pw = self._browser = self._page = None
        self.n = 0

    def __enter__(self):
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as e:
            raise StageError('CHROMIUM_MISSING', 'Playwright is required for the graphics stage') from e
        self._pw = sync_playwright().start()
        self._open()
        return self

    def _open(self):
        if self._browser:
            try:
                self._browser.close()
            except Exception:
                pass
        self._browser = self._pw.chromium.launch()
        self._page = self._browser.new_page(viewport={'width': 1920, 'height': 1080}, device_scale_factor=float(os.environ.get('STORIES_SPRITE_SCALE', '1.5')))

    def _shoot(self, path: Path, doc: str, take) -> Path:
        # Each process has its own page file, and the PNG lands by rename: parallel shot workers
        # share the sprites folder, and a shared _page.html crashed Chromium mid-load (2.11.2026).
        tmp = self.out / f'_page-{os.getpid()}.html'
        tmp.write_text(doc, encoding='utf-8')
        part = path.with_name(f'.{path.stem}-{os.getpid()}.png')
        for attempt in (1, 2):
            try:
                self._page.goto(tmp.as_uri())
                self._page.evaluate('document.fonts.ready')
                take(part)
                break
            except Exception:
                if attempt == 2:
                    raise
                self._open()
        os.replace(part, path)
        return path

    def __exit__(self, *a):
        if self._browser:
            self._browser.close()
        if self._pw:
            self._pw.stop()

    def css(self) -> str:
        p = self.palette
        return _font_css() + BASE_CSS % {'ink': INK, 'paper': PAPER, 'news': NEWSPRINT, 'accent': p.accent, 'onacc': PAPER}

    def render(self, name: str, body: str, extra_css: str = '', scale: float = 1.0) -> Path:
        path = self.out / f'{name}.png'
        if path.exists():
            return path
        doc = f'<!doctype html><html><head><meta charset="utf-8"><style>{self.css()}{extra_css}</style></head><body><div id="s" class="s">{body}</div></body></html>'
        def take(out):
            self._page.evaluate(FIT_JS)
            self._page.locator('#s').screenshot(path=str(out), omit_background=True)
        self._shoot(path, doc, take)
        self.n += 1
        return path

    def svg(self, name: str, file: str, replace: dict | None = None) -> Path:
        """A kit SVG element recoloured (neutral #808080 → club accent) and cropped to its ink."""
        path = self.out / f'{name}.png'
        if path.exists():
            return path
        s = (KIT / 'svg' / file).read_text(encoding='utf-8').replace('#808080', self.palette.accent)
        s = s.replace('DejaVu Sans, sans-serif', "'Weekly Head', sans-serif")
        for a, b in (replace or {}).items():
            s = s.replace(a, b)
        doc = f'<!doctype html><html><head><style>{_font_css()}html,body{{margin:0;background:transparent}}</style></head><body>{s}</body></html>'
        def take(out):
            box = self._page.evaluate('''() => { const b = document.querySelector('svg').getBBox(); return [b.x, b.y, b.width, b.height] }''')
            x, y, w, h = [round(v) for v in box]
            pad = 12
            self._page.screenshot(path=str(out), omit_background=True, clip={'x': max(0, x - pad), 'y': max(0, y - pad), 'width': min(1920, w + 2 * pad), 'height': min(1080, h + 2 * pad)})
        return self._shoot(path, doc, take)

    # ---------- cards ----------
    def open_title(self, key: str, headline: str, kicker: str) -> Path:
        body = f'''<div class="sh" style="clip-path:polygon(0 0,96% 0,100% 100%,3% 100%)"></div>
        <div class="box" style="width:1240px;padding:0 0 46px;clip-path:polygon(0 0,96% 0,100% 100%,3% 100%);border:none;background:var(--paper);outline:none">
          <div class="bar" style="padding:16px 60px;font-size:30px">FanLife · Football Stories</div>
          <div class="head fit" data-fit="1020" style="font-size:148px;padding:34px 70px 0">{esc(headline)}</div>
          <div class="caps fit" data-fit="1020" style="font-size:40px;padding:18px 74px 0">{esc(kicker)}</div>
          <div class="dots" style="position:absolute;right:90px;bottom:40px;width:160px;height:120px"></div>
        </div>'''
        return self.render(f'open-{key}', body)

    def chapter(self, key: str, number: int, title: str) -> Path:
        body = f'''<div class="sh" style="clip-path:polygon(0 0,96.5% 0,100% 100%,3.5% 100%)"></div>
        <div style="position:relative;width:1280px;height:270px;background:var(--paper);clip-path:polygon(0 0,96.5% 0,100% 100%,3.5% 100%)">
          <div class="bar" style="position:absolute;left:0;top:0;width:430px;height:74px;clip-path:polygon(0 0,94% 0,100% 100%,2% 100%);padding:16px 40px;font-size:34px;border:none">Chapter {number:02d}</div>
          <div class="head fit" data-fit="1000" style="position:absolute;left:66px;top:104px;font-size:112px">{esc(title)}</div>
          <div class="dots" style="position:absolute;right:120px;top:96px;width:120px;height:120px"></div>
        </div>'''
        return self.render(f'chapter-{key}', body, extra_css='')

    def matchday(self, key: str, f: dict) -> Path:
        venue = (f.get('venue') or {}).get('name')
        line2 = ' · '.join(x for x in [long_date(f.get('date')), venue] if x)
        stage = ' · '.join(x for x in [f.get('competition'), f.get('stage')] if x)
        body = f'''<div class="sh"></div><div class="box" style="width:1260px">
          <div class="bar" style="padding:18px 40px;font-size:30px">Matchday · {esc(stage)}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:56px 56px 26px;gap:30px">
            <div class="head fit" data-fit="470" style="font-size:84px;width:470px">{esc(f['home'])}</div>
            <div class="goal" style="font-size:70px">v</div>
            <div class="head fit" data-fit="470" style="font-size:84px;width:470px;text-align:right">{esc(f['away'])}</div>
          </div>
          <div style="height:6px;background:var(--ink);margin:0 56px"></div>
          <div class="caps" style="font-size:34px;padding:28px 56px 40px;display:flex;justify-content:space-between;align-items:center">
            <span class="fit" data-fit="900">{esc(line2)}</span><span class="dots" style="width:150px;height:84px;display:inline-block"></span></div>
        </div>'''
        return self.render(f'matchday-{key}', body)

    def score(self, key: str, f: dict, extra: str | None = None) -> Path:
        stage = ' · '.join(x for x in [f.get('competition'), f.get('stage')] if x)
        note = f'<div class="caps" style="font-size:30px;padding:0 50px 12px;color:var(--accent)">{esc(extra)}</div>' if extra else ''
        body = f'''<div class="sh"></div><div class="box" style="width:1180px">
          <div class="bar" style="padding:16px 40px;font-size:30px">Full time · {esc(long_date(f.get("date")))}</div>
          <div style="display:grid;grid-template-columns:330px auto 330px;align-items:center;padding:44px 50px 24px;gap:28px">
            <div class="head fit" data-fit="330" style="font-size:66px">{esc(f['home'])}</div>
            <div class="goal" style="font-size:170px;letter-spacing:.02em;white-space:nowrap">{f['score_home']}<span style="font-size:110px;padding:0 18px">–</span>{f['score_away']}</div>
            <div class="head fit" data-fit="330" style="font-size:66px;text-align:right">{esc(f['away'])}</div>
          </div>{note}
          <div class="caps fit" data-fit="1060" style="font-size:28px;padding:10px 50px 34px">{esc(stage)}</div>
        </div>'''
        return self.render(f'score-{key}', body)

    def fact(self, key: str, heading: str, text: str, source: str | None) -> Path:
        src = f'<div class="src" style="padding:0 40px 30px">Source · {esc(source)}</div>' if source else ''
        body = f'''<div class="sh"></div><div class="box" style="width:820px">
          <div class="bar" style="padding:16px 34px;font-size:30px">{esc(heading)}</div>
          <div data-fith="330" style="font-family:'Weekly Head';font-size:58px;line-height:1.02;padding:34px 40px 28px;text-transform:none">{esc(text)}</div>
          {src}<div class="dots" style="position:absolute;right:26px;bottom:24px;width:70px;height:70px"></div></div>'''
        return self.render(f'fact-{key}', body)

    def quote(self, key: str, text: str, who: str, role: str | None, source: str | None) -> Path:
        """Somebody's own words, as they were printed: a big quotation, the speaker under it, the source in the corner."""
        src = f'<div class="src" style="padding:0 46px 30px">{esc(source)}</div>' if source else ''
        role_ = f'<div class="caps fit" data-fit="840" style="font-size:26px;opacity:.8;padding-top:6px">{esc(role)}</div>' if role else ''
        body = f'''<div class="sh"></div><div class="box" style="width:1040px">
          <div class="goal" style="position:absolute;left:28px;top:-34px;font-size:220px;color:var(--accent);-webkit-text-stroke:4px var(--ink)">“</div>
          <div data-fith="430" style="font-family:'Weekly Head';font-size:66px;line-height:1.04;padding:96px 56px 22px 56px;text-transform:none">{esc(text)}”</div>
          <div style="padding:0 56px 24px;border-top:5px solid var(--ink);margin:0 56px 0 0;padding-top:18px">
            <div class="head fit" data-fit="880" style="font-size:52px">— {esc(who)}</div>{role_}</div>
          {src}<div class="dots" style="position:absolute;right:26px;bottom:24px;width:70px;height:70px"></div></div>'''
        return self.render(f'quote-{key}', body)

    def press(self, key: str, outlet: str, date: str | None, headline: str, standfirst: str | None) -> Path:
        """A cutting from the papers, set in our own type: the outlet's name in plain caps (never its masthead), the date,
        the headline exactly as it ran."""
        sub = f'<div style="font-family:\'Weekly Body\';font-size:34px;line-height:1.2;padding:0 50px 30px">{esc(standfirst)}</div>' if standfirst else ''
        body = f'''<div class="sh" style="inset:16px 0 0 16px"></div><div class="box" style="width:1080px;background:var(--news);border-width:4px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;padding:22px 50px 14px;border-bottom:3px double var(--ink)">
            <span class="caps fit" data-fit="640" style="font-size:34px">{esc(outlet)}</span><span class="caps" style="font-size:26px">{esc(long_date(date))}</span></div>
          <div data-fith="380" style="font-family:'Weekly Head';font-size:84px;line-height:.98;padding:30px 50px 26px;text-transform:none">{esc(headline)}</div>
          {sub}<div class="lines" style="height:22px;margin:0 50px 26px;opacity:.35"></div></div>'''
        return self.render(f'press-{key}', body)

    def stat(self, key: str, value: str, label: str, source: str | None) -> Path:
        src = f'<div class="src" style="padding:6px 0 0">Source · {esc(source)}</div>' if source else ''
        body = f'''<div class="sh" style="inset:20px 0 0 20px"></div><div class="box" style="padding:30px 60px 40px;text-align:center;min-width:620px">
          <div class="goal fit" data-fit="1100" style="font-size:260px;color:var(--accent);-webkit-text-stroke:5px var(--ink)">{esc(value)}</div>
          <div class="head fit" data-fit="1100" style="font-size:66px;padding-top:10px">{esc(label)}</div>{src}</div>'''
        return self.render(f'stat-{key}', body)

    def table(self, key: str, f: dict, club: str, source: str | None) -> Path:
        rows = ''.join(
            f'''<div style="display:grid;grid-template-columns:70px 1fr 120px 140px;align-items:center;padding:14px 34px;border-top:4px solid var(--ink);{'background:var(--accent);color:var(--onacc)' if r['club'] == club else ''}">
            <span class="goal" style="font-size:44px">{r['pos']}</span><span class="head fit" data-fit="540" style="font-size:52px;display:block">{esc(r['club'])}</span>
            <span class="caps" style="font-size:30px;text-align:right">{'+' if r['goal_difference'] > 0 else ''}{r['goal_difference']}</span>
            <span class="goal" style="font-size:52px;text-align:right">{r['points']}</span></div>''' for r in f['rows'])
        src = f'<div class="src" style="padding:14px 34px 20px">Source · {esc(source)}</div>' if source else ''
        body = f'''<div class="sh"></div><div class="box" style="width:1040px">
          <div class="bar" style="padding:16px 34px;font-size:30px;display:flex;justify-content:space-between"><span>{esc(f['competition'])} · {esc(f['season'])}</span><span>GD · Pts</span></div>
          {rows}{src}</div>'''
        return self.render(f'table-{key}', body)

    def ticket(self, key: str, f: dict) -> Path:
        body = f'''<div class="sh"></div><div class="box" style="width:860px;display:grid;grid-template-columns:1fr 150px">
          <div style="padding:0 0 30px"><div class="bar" style="padding:14px 30px;font-size:26px">Admit one · {esc(f.get('competition'))}</div>
            <div class="head fit" data-fit="640" style="font-size:64px;padding:26px 30px 6px">{esc(f['home'])}</div>
            <div class="caps" style="font-size:26px;padding:0 32px">v</div>
            <div class="head fit" data-fit="640" style="font-size:64px;padding:6px 30px 12px">{esc(f['away'])}</div>
            <div class="caps" style="font-size:28px;padding:0 32px">{esc(long_date(f.get('date')))}</div></div>
          <div class="lines" style="border-left:6px dashed var(--ink);opacity:.9"></div></div>'''
        return self.render(f'ticket-{key}', body, extra_css='')

    def turning(self, key: str, title: str, subtitle: str) -> Path:
        body = f'''<div class="sh"></div><div class="box" style="width:1100px;display:grid;grid-template-columns:22px 1fr 190px;border-left:none">
          <div style="background:var(--accent);border-right:5px solid var(--ink)"></div>
          <div style="padding:38px 40px 40px"><div class="head fit" data-fit="780" style="font-size:96px">{esc(title)}</div>
            <div class="caps" data-fith="140" style="font-size:38px;padding-top:16px;line-height:1.15">{esc(subtitle)}</div></div>
          <div class="lines" style="margin:30px 30px 30px 0"></div></div>'''
        return self.render(f'turning-{key}', body)

    def label(self, key: str, text: str, tone: str = 'accent', size: int = 40) -> Path:
        bg = {'accent': 'var(--accent)', 'ink': 'var(--ink)', 'paper': 'var(--paper)'}[tone]
        fg = 'var(--ink)' if tone == 'paper' else 'var(--paper)'
        body = f'''<div style="background:{bg};color:{fg};border:4px solid var(--ink);padding:8px 20px 6px;box-shadow:8px 8px 0 var(--ink)" class="head fit" data-fit="1300"><span style="font-size:{size}px">{esc(text)}</span></div>'''
        return self.render(f'label-{key}', body, extra_css='.s{padding:0 12px 12px 0}')

    def caption(self, key: str, text: str) -> Path:
        """Kit lower-third: a cream plate with an accent spine, for illustration captions."""
        body = f'''<div class="sh" style="inset:12px 0 0 12px"></div><div class="box" style="display:flex;border-width:5px">
          <div style="width:20px;background:var(--accent);border-right:5px solid var(--ink)"></div>
          <div class="head fit" data-fit="1100" style="font-size:44px;padding:16px 26px 12px">{esc(text)}</div></div>'''
        return self.render(f'caption-{key}', body, extra_css='.s{padding:0 16px 16px 0}')

    def timeline(self, key: str, points: list[dict], label: str) -> Path:
        n = len(points)
        cells = ''.join(f'''<div style="text-align:center;width:{1500 // n}px">
            <div class="caps" style="font-size:24px;padding-bottom:12px">{esc(p['top'])}</div>
            <div style="width:36px;height:36px;border-radius:50%;margin:0 auto;border:6px solid var(--ink);background:{'var(--accent)' if p['hot'] else 'var(--paper)'}"></div>
            <div class="head" style="font-size:34px;padding-top:12px">{esc(p['mid'])}</div>
            <div class="caps fit" data-fit="{1500 // n - 20}" style="font-size:22px;padding-top:4px">{esc(p['low'])}</div></div>''' for p in points)
        body = f'''<div class="sh"></div><div class="box" style="width:1660px;padding:0 0 30px">
          <div class="bar" style="padding:14px 34px;font-size:28px">{esc(label)}</div>
          <div style="position:relative;padding:34px 80px 0"><div style="position:absolute;left:80px;right:80px;top:96px;height:6px;background:var(--ink)"></div>
          <div style="display:flex;justify-content:space-between;position:relative">{cells}</div></div></div>'''
        return self.render(f'timeline-{key}', body)

    def stamp(self, key: str, text: str) -> Path:
        body = f'''<div style="width:300px;height:300px;border-radius:50%;border:10px solid var(--ink);background:var(--news);display:grid;place-items:center;transform:rotate(-9deg)">
          <div style="width:256px;height:256px;border-radius:50%;border:4px solid var(--ink);display:grid;place-items:center">
          <div class="head" style="background:var(--accent);color:var(--paper);border:5px solid var(--ink);padding:10px 10px 6px;font-size:36px;width:290px;text-align:center">{esc(text)}</div></div></div>'''
        return self.render(f'stamp-{key}', body, extra_css='.s{padding:20px}')

    def end_card(self, key: str, title: str, sources_line: str) -> Path:
        body = f'''<div style="width:1920px;height:1080px;background:var(--news);position:relative;overflow:hidden">
          <div style="position:absolute;left:0;top:0;bottom:0;width:150px;background:var(--accent);border-right:8px solid var(--ink)"></div>
          <div class="dots" style="position:absolute;inset:0;opacity:.08"></div>
          <div style="position:absolute;left:420px;top:300px;width:1180px;background:var(--paper);border:7px solid var(--ink);box-shadow:22px 22px 0 var(--ink);padding:48px 60px">
            <div style="font-family:'Shrikhand';font-size:96px;line-height:1">FanLife</div>
            <div class="head" style="font-size:64px;padding-top:10px">Football Stories</div>
            <div class="caps" style="font-size:34px;padding-top:34px;line-height:1.35">Football is ninety minutes.<br>Being a supporter is a lifetime.</div>
            <div class="src fit" data-fit="1050" style="padding-top:34px;font-size:22px">{esc(title)}</div>
            <div class="src fit" data-fit="1050" style="padding-top:8px;font-size:20px">{esc(sources_line)}</div></div></div>'''
        return self.render(f'end-{key}', body, extra_css='.s{padding:0}')

    def shout(self, key: str, text: str, tone: str = 'accent') -> Path:
        """The Weekly's exclamation (Knewave): GOAL!, CHAMPIONS! — printed twice, ink under, colour over."""
        fg = {'accent': 'var(--accent)', 'paper': 'var(--paper)', 'ink': 'var(--ink)'}[tone]
        body = f'''<div style="position:relative;font-family:'Knewave';font-size:150px;line-height:1;transform:rotate(-7deg);padding:10px 30px 30px 10px">
          <div style="position:absolute;left:24px;top:24px;color:var(--ink)">{esc(text)}</div>
          <div style="position:relative;color:{fg};-webkit-text-stroke:5px var(--ink)">{esc(text)}</div></div>'''
        return self.render(f'shout-{key}', body, extra_css='.s{padding:0}')

    # ---------- the call to follow the channel ----------
    def follow_card(self, key: str, head: str, sub: str) -> Path:
        """A supporters' membership card, the viewer's to fill in: the invitation to follow, in The Weekly's type."""
        body = f'''<div class="sh"></div><div class="box" style="width:1180px">
          <div class="bar" style="padding:14px 34px;font-size:28px;display:flex;justify-content:space-between">
            <span>FanLife: Football Stories</span><span>Supporters' card</span></div>
          <div style="padding:30px 44px 34px;display:grid;grid-template-columns:1fr 250px;gap:30px;align-items:center">
            <div><div class="head fit" data-fit="800" style="font-size:104px;line-height:.95">{esc(head)}</div>
              <div class="caps fit" data-fit="800" style="font-size:32px;padding-top:18px">{esc(sub)}</div>
              <div style="display:grid;grid-template-columns:auto 1fr;gap:14px 18px;padding-top:30px;align-items:end">
                <div class="caps" style="font-size:24px">Name</div><div style="border-bottom:4px dashed var(--ink);height:30px"></div>
                <div class="caps" style="font-size:24px">Club</div><div style="border-bottom:4px dashed var(--ink);height:30px"></div>
                <div class="caps" style="font-size:24px">Since</div><div style="border-bottom:4px dashed var(--ink);height:30px"></div></div></div>
            <div style="width:250px;height:250px;border-radius:50%;border:9px solid var(--ink);background:var(--news);display:grid;place-items:center;transform:rotate(-8deg)">
              <div style="width:206px;height:206px;border-radius:50%;border:4px solid var(--ink);display:grid;place-items:center;text-align:center">
                <div class="head" style="font-size:40px;line-height:1">One<br>of us</div></div></div></div></div>'''
        return self.render(f'follow-{key}', body)

    def sub_button(self, key: str, done: bool) -> Path:
        """A subscribe button in the film's own colours (not a platform's logo): SUBSCRIBE with a bell, then SUBSCRIBED."""
        bell = ('<svg width="64" height="64" viewBox="0 0 24 24"><path d="M12 22a2.5 2.5 0 0 0 2.4-2h-4.8A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5.5-6.8V3.5a1.5 1.5 0 0 0-3 0v.7A7 7 0 0 0 5 11v5l-2 2v1h18v-1z" '
                'fill="currentColor"/></svg>')
        tick = '<svg width="60" height="60" viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" stroke="currentColor" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        bg, fg, word, icon = ('var(--ink)', 'var(--paper)', 'Subscribed', tick) if done else ('var(--accent)', 'var(--paper)', 'Subscribe', bell)
        body = f'''<div class="sh" style="border-radius:26px"></div><div style="position:relative;display:flex;align-items:center;gap:22px;background:{bg};color:{fg};
          border:7px solid var(--ink);border-radius:26px;padding:22px 46px 22px 36px">{icon}<div class="head" style="font-size:84px;line-height:1;color:{fg}">{esc(word)}</div></div>'''
        return self.render(f'subbtn-{key}-{int(done)}', body)

    def pointer(self, key: str) -> Path:
        body = '''<svg width="150" height="190" viewBox="0 0 30 38"><path d="M3 2l22 21-10 1 6 11-4 2-6-11-8 7z" fill="#F4EEDF" stroke="#15130F" stroke-width="2.4" stroke-linejoin="round"/></svg>'''
        return self.render(f'pointer-{key}', body, extra_css='.s{padding:0}')

    # ---------- the closing call to the site ----------
    def cta_headline(self, key: str, text: str, sub: str) -> Path:
        body = f'''<div class="sh"></div><div class="box" style="background:var(--ink);border-color:var(--ink);padding:26px 44px 30px">
          <div class="head fit" data-fit="1080" style="font-size:92px;color:var(--paper)">{esc(text)}</div>
          <div class="caps fit" data-fit="1080" style="font-size:30px;color:var(--accent);padding-top:14px">{esc(sub)}</div></div>'''
        return self.render(f'cta-head-{key}', body, extra_css='.sh{background:var(--accent)}')

    def feature_tile(self, key: str, label: str, img: Path | None, tone: str = 'paper') -> Path:
        pic = (f'<img src="{img.as_uri()}" style="width:100%;height:100%;object-fit:contain;display:block">' if img else '')
        body = f'''<div class="sh" style="inset:12px 0 0 12px"></div><div class="box" style="width:330px;border-width:5px">
          <div style="height:210px;padding:14px;background:var(--news)">{pic}</div>
          <div class="head fit" data-fit="300" style="font-size:38px;padding:12px 14px 10px;border-top:5px solid var(--ink);background:var(--{'accent' if tone == 'accent' else 'paper'});color:var(--{'paper' if tone == 'accent' else 'ink'})">{esc(label)}</div></div>'''
        return self.render(f'tile-{key}', body, extra_css='.s{padding:0 16px 16px 0}')

    def url_banner(self, key: str, url: str, sub: str) -> Path:
        body = f'''<div class="sh"></div><div class="box" style="display:flex;align-items:stretch">
          <div style="background:var(--accent);color:var(--paper);border-right:6px solid var(--ink);padding:18px 30px" class="caps"><div style="font-size:30px;line-height:1.1">Play<br>the<br>archive</div></div>
          <div style="padding:16px 40px 14px"><div class="goal fit" data-fit="1180" style="font-size:96px;letter-spacing:.01em">{esc(url)}</div>
          <div class="caps fit" data-fit="1180" style="font-size:28px;padding-top:8px">{esc(sub)}</div></div></div>'''
        return self.render(f'url-{key}', body)

    def small_print(self, key: str, text: str) -> Path:
        body = f'''<div class="src fit" data-fit="1760" style="color:var(--paper);opacity:.8;font-size:20px">{esc(text)}</div>'''
        return self.render(f'small-{key}', body, extra_css='.s{padding:0}')

    def thumbnail(self, key: str, text: str, sub: str, art_uri: str) -> Path:
        body = f'''<div style="width:1280px;height:720px;position:relative;overflow:hidden;background:var(--ink)">
          <img src="{art_uri}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:contrast(1.08)">
          <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(21,19,15,.9) 0%,rgba(21,19,15,.45) 55%,rgba(21,19,15,0) 80%)"></div>
          <div style="position:absolute;left:60px;top:70px;width:780px">
            <div class="head" style="font-size:150px;color:var(--paper);line-height:.88;-webkit-text-stroke:2px var(--ink);text-shadow:10px 10px 0 var(--accent)" data-fith="440">{esc(text)}</div>
            <div class="caps" style="display:inline-block;margin-top:26px;background:var(--accent);color:var(--paper);border:5px solid var(--ink);padding:10px 20px 6px;font-size:40px">{esc(sub)}</div></div>
          <div style="position:absolute;right:34px;bottom:26px;font-family:'Shrikhand';font-size:46px;color:var(--paper)">FanLife</div></div>'''
        return self.render(f'thumb-{key}', body, extra_css='.s{padding:0}')


def key_of(*parts) -> str:
    return re.sub(r'[^a-zA-Z0-9]+', '-', '-'.join(str(p) for p in parts)).strip('-')[:80]
