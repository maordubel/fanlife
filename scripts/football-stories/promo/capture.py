"""Promo capture — the live Royal Rumble and Legends Manager, filmed on a phone (owner, 3.11.2026).

    python3 scripts/football-stories/promo/capture.py <out dir> [club …]

For each club: stills of every step (390×844 @3x, crisp for a phone frame) and a screen recording of the parts that
move (the slot reels, the highlights theatre) at 540×960 @2x → 1080×1920. Every step also writes what was on screen
(visible buttons, a slice of text) to log.json, so a script change is made from evidence, not from a guess.

Legends Manager creates a career for this throwaway browser; nothing is signed in and nothing is published.
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path

SITE = 'https://fanlife.dubelteam.com'
UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 FanLife-Studio'
CARD = re.compile(r'(^(?!.*locked).*, [a-z ]+, €\dM$)|(^Sign .*, €\dM$)', re.I)
CLUB_NAME = {'olympiacos': 'OLYMPIACOS', 'panathinaikos': 'PANATHINAIKOS', 'aek-athens': 'AEK ATHENS', 'celtic': 'CELTIC',
             'st-pauli': 'FC ST. PAULI', 'hapoel-tel-aviv': 'HAPOEL TEL AVIV', 'zrinjski-mostar': 'ZRINJSKI MOSTAR'}


def seen(page) -> dict:
    """What a person would see now: the visible controls and the first lines of text."""
    try:
        return page.evaluate("""() => ({
          buttons: [...document.querySelectorAll('button,a[role=button]')].filter(b => b.offsetParent !== null)
            .map(b => (b.getAttribute('aria-label') || b.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 90)).filter(Boolean).slice(0, 60),
          text: (document.querySelector('main') || document.body).innerText.replace(/\\n{2,}/g, '\\n').slice(0, 1800)
        })""")
    except Exception as e:     # navigation in flight
        return {'error': str(e)[:120]}


def cards(page):
    return [b for b in page.query_selector_all('button[aria-label]') if CARD.search(b.get_attribute('aria-label') or '') and b.is_visible()]


def click_text(page, rx: str, timeout=3000) -> bool:
    pat = re.compile(rx, re.I)
    for loc in (page.get_by_role('button', name=pat), page.get_by_role('link', name=pat), page.get_by_text(pat)):
        try:
            loc.first.click(timeout=timeout)
            return True
        except Exception:
            continue
    return False


def dismiss(page):
    page.keyboard.press('Escape')
    for label in ('Accept', 'Got it', 'OK'):
        click_text(page, f'^{label}$', 500)
    # the house ad strip at the foot of the screen is not ours to film
    page.add_style_tag(content='[data-ad],.dubel-top-ad,[class*="house-ad"],[aria-label*="advert" i]{display:none!important}')


class Run:
    def __init__(self, out: Path, club: str, game: str):
        self.dir = out / club / game
        self.dir.mkdir(parents=True, exist_ok=True)
        self.log, self.t0, self.marks = [], time.monotonic(), {}

    def shot(self, page, name: str, full=False):
        p = self.dir / f'{name}.png'
        page.screenshot(path=str(p), full_page=full)
        self.log.append({'step': name, 't': round(time.monotonic() - self.t0, 2), **seen(page)})

    def mark(self, name: str):
        self.marks[name] = round(time.monotonic() - self.t0, 2)

    def save(self, extra=None):
        (self.dir / 'log.json').write_text(json.dumps({'marks': self.marks, 'steps': self.log, **(extra or {})}, indent=1, ensure_ascii=False))


def rumble(ctx, out: Path, club: str, video: bool):
    r = Run(out, club, 'rumble-video' if video else 'rumble')
    page = ctx.new_page()
    page.goto(f'{SITE}/clubs/{club}/royal-rumble', wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(2500)
    dismiss(page)
    r.mark('door')
    if not video:
        r.shot(page, 'door')
    budget_order = [None, r'€[12]M$', r'€[12]M$', r'€[12]M$', r'€[12]M$']    # a premium first, then what the budget allows
    for i, want in enumerate(budget_order):
        cs = cards(page)
        if not cs:
            break
        cs[0].scroll_into_view_if_needed()
        page.mouse.wheel(0, -120)
        page.wait_for_timeout(900)
        r.mark(f'deal{i + 1}')
        if not video:
            r.shot(page, f'deal{i + 1}')
        pick = cs[0] if want is None else next((c for c in cs if re.search(want, c.get_attribute('aria-label'))), cs[-1])
        r.log.append({'picked': pick.get_attribute('aria-label')})
        pick.click()
        page.wait_for_timeout(2400)
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(800)
    if not video:
        r.shot(page, 'five-top')
        r.shot(page, 'five-full', full=True)
    r.mark('lock')
    if click_text(page, r'^LOCK THE FIVE', 4000):
        page.wait_for_timeout(2600)
        r.mark('entrance')
        if not video:
            r.shot(page, 'entrance')
        page.wait_for_timeout(6000)
        r.mark('headtohead')
        if not video:
            r.shot(page, 'headtohead')
        page.wait_for_timeout(5000)
        if not video:
            r.shot(page, 'teams')
        if click_text(page, r'^KICK OFF$', 4000):
            r.mark('kickoff')
            for j in range(6):
                page.wait_for_timeout(3500)
                if not video:
                    r.shot(page, f'match{j + 1}')
            if click_text(page, r'(^|\s)FT$|full time', 3000):
                page.wait_for_timeout(4000)
                r.mark('fulltime')
                if not video:
                    r.shot(page, 'fulltime')
                    r.shot(page, 'fulltime-full', full=True)
    r.save()
    vid = page.video
    page.close()
    return vid


def legends(ctx, out: Path, club: str, video: bool):
    r = Run(out, club, 'legends-video' if video else 'legends')
    page = ctx.new_page()
    page.goto(f'{SITE}/all-football/legends', wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(2500)
    dismiss(page)
    r.mark('door')
    if not video:
        r.shot(page, 'door')
    name = CLUB_NAME.get(club, club.upper())
    tile = page.locator('button', has_text=re.compile(rf'{re.escape(name)}.*legends to draft', re.I | re.S)).first
    tile.scroll_into_view_if_needed()
    tile.click()
    page.wait_for_timeout(1500)
    r.mark('club')
    if not video:
        r.shot(page, 'club')
    found = page.get_by_role('button', name=re.compile(r'^FOUND THE', re.I)).first
    found.scroll_into_view_if_needed()
    page.wait_for_timeout(700)
    if not video:
        r.shot(page, 'found')
    found.click()
    try:
        page.wait_for_url(re.compile(r'/career/'), timeout=150000)
    except Exception:
        pass
    page.wait_for_timeout(3500)
    dismiss(page)
    r.mark('founded')
    if not video:
        r.shot(page, 'founded')
    # From here the flow is read off the screen, step by step: the board's story, the line, the cards, the next line.
    prio = [r'^pull the lever', r'^skip', r'^(continue|next|go on|let.s go|start|to the draft|meet|sign|confirm|register|done|play|kick off|watch)', r'^(GK|DF|MF|FW)\b']
    block = re.compile(r'^(menu|pin|←|legends manager|fewer clubs|more clubs|sound|rules|how to play|\?|close|×|delete|put away|archive|full screen|menu)', re.I)
    tries: dict[str, int] = {}
    for k in range(64):
        page.wait_for_timeout(1400)
        clicked = None
        cs = cards(page)
        if cs:
            want = r'€[12]M$' if k % 3 else r'€[345]M$'
            pick = next((c for c in cs if re.search(want, c.get_attribute('aria-label'))), cs[-1])
            pick.scroll_into_view_if_needed()
            page.wait_for_timeout(500)
            if not video:
                r.shot(page, f'step{k:02d}-deal')
            clicked = pick.get_attribute('aria-label')
            pick.click()
            page.wait_for_timeout(2600)
        else:
            for rx in prio:
                if tries.get(rx, 0) < 6 and click_text(page, rx, 700):
                    clicked = rx
                    tries[rx] = tries.get(rx, 0) + 1
                    break
            if clicked is None:     # read the screen: the first live control that is not chrome
                for b in page.query_selector_all('button'):
                    try:
                        lab = ((b.get_attribute('aria-label') or b.inner_text() or '').strip())[:80]
                    except Exception:
                        continue
                    if not lab or block.search(lab) or not b.is_visible() or not b.is_enabled() or tries.get(lab, 0) >= 2:
                        continue
                    try:
                        b.scroll_into_view_if_needed(timeout=1500)
                        b.click(timeout=1500)
                    except Exception:
                        continue
                    clicked, tries[lab] = lab, tries.get(lab, 0) + 1
                    break
            page.wait_for_timeout(2400)
        r.mark(f'step{k:02d}')
        if not video:
            r.shot(page, f'step{k:02d}')
        r.log.append({'clicked': clicked})
        if clicked is None:
            break
    if not video:
        r.shot(page, 'last-full', full=True)
    r.save()
    vid = page.video
    page.close()
    return vid


def main():
    from playwright.sync_api import sync_playwright
    out = Path(sys.argv[1])
    clubs = sys.argv[2:] or ['olympiacos', 'panathinaikos', 'aek-athens']
    out.mkdir(parents=True, exist_ok=True)
    report = {}
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        for club in clubs:
            for game, fn in (('rumble', rumble), ('legends', legends)):
                if os.environ.get('GAMES') and game not in os.environ['GAMES'].split(','):
                    continue
                if game == 'legends' and os.environ.get('LEGENDS_CLUBS') and club not in os.environ['LEGENDS_CLUBS'].split(','):
                    continue
                for video in (False, True):
                    kw = dict(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True, user_agent=UA)
                    if video:
                        vdir = out / club / f'{game}-video'
                        vdir.mkdir(parents=True, exist_ok=True)
                        kw.update(viewport={'width': 540, 'height': 960}, device_scale_factor=2, record_video_dir=str(vdir),
                                  record_video_size={'width': 1080, 'height': 1920})
                    ctx = b.new_context(**kw)
                    try:
                        v = fn(ctx, out, club, video)
                        ctx.close()
                        if video and v:
                            src = Path(v.path())
                            src.rename(src.with_name('screen.webm'))
                        report[f'{club}/{game}{"-video" if video else ""}'] = 'ok'
                    except Exception as e:
                        report[f'{club}/{game}{"-video" if video else ""}'] = f'failed: {str(e)[:300]}'
                        ctx.close()
                    print(club, game, video, report[f'{club}/{game}{"-video" if video else ""}'], flush=True)
        b.close()
    (out / 'report.json').write_text(json.dumps(report, indent=1))


if __name__ == '__main__':
    main()
