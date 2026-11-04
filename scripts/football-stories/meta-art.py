"""Facebook / Instagram art for the business Page FanLife: Football Stories (owner, 4.11.2026) — the same look as the
YouTube banner (channel-art.py): the owner's paper-cut terrace, darkened, the FanLife badge and the title.

    python3 scripts/football-stories/meta-art.py

Writes scripts/football-stories/channel/meta/:
  fb-cover.jpg    1640×624  — Facebook shows ~820×312 on desktop and crops the sides to ~16:9 on a phone, so the badge
                              and type sit inside the centre 1000×520.
  profile.png     720×720   — Page and Instagram picture; both are shown as a circle, so the badge fills 88% of it
                              (the badge's largest source is 512px — 720 keeps the upscale small).
  ig-post.jpg     1080×1350 — a first "we're here" post for Instagram and the Page.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('channel_art', HERE / 'channel-art.py')
ca = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ca)  # type: ignore[union-attr]
INK, PAPER, NEWSPRINT, VERMILION, SLOGAN = ca.INK, ca.PAPER, ca.NEWSPRINT, ca.VERMILION, ca.SLOGAN
OUT = HERE / 'channel' / 'meta'


def page(w: int, h: int, body: str, extra: str = '') -> str:
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>{ca._font_css()}
html,body{{margin:0;width:{w}px;height:{h}px;overflow:hidden;background:{INK}}}
.bg{{position:absolute;inset:0;background:url('{ca.data_uri(ca.ART, 'image/webp')}') center 38%/cover}}
.shade{{position:absolute;inset:0;background:linear-gradient(180deg,rgba(21,19,15,.5),rgba(21,19,15,.8) 45%,rgba(21,19,15,.8) 60%,rgba(21,19,15,.55))}}
.badge{{filter:drop-shadow(6px 6px 0 {INK})}}
.bar{{display:inline-block;background:{VERMILION};color:{PAPER};font:800 26px/1 'Weekly Caps','Archivo',sans-serif;letter-spacing:.08em;padding:11px 16px 9px;text-transform:uppercase}}
h1{{margin:12px 0 0;color:{PAPER};font:900 italic 92px/0.92 'Weekly Head','Archivo',sans-serif;letter-spacing:-.01em;text-transform:uppercase;text-shadow:6px 6px 0 {INK}}}
p{{margin:14px 0 0;color:{NEWSPRINT};font:600 28px/1.25 'Weekly Body','Archivo',sans-serif;text-wrap:balance}}
{extra}</style></head><body>{body}</body></html>'''


def cover() -> str:
    badge = ca.data_uri(ca.BADGE, 'image/png')
    return page(1640, 624, f'''<div class="bg"></div><div class="shade"></div>
<div class="safe"><img class="badge" src="{badge}" alt=""><div><span class="bar">Club football · real supporters</span>
<h1>Football<br>Stories</h1><p>{SLOGAN}</p></div></div>''',
                '.safe{position:absolute;left:320px;top:52px;width:1000px;height:520px;display:flex;align-items:center;gap:40px}'
                '.safe .badge{width:230px;height:230px;flex:none}')


def profile() -> str:
    badge = ca.data_uri(ca.BADGE, 'image/png')
    return page(720, 720, f'<div class="disc"></div><img class="badge pf" src="{badge}" alt="">',
                f'.disc{{position:absolute;inset:0;background:radial-gradient(circle at 50% 46%,#2a2620,{INK} 70%)}}'
                '.pf{position:absolute;left:44px;top:44px;width:632px;height:632px;filter:none}')


def first_post() -> str:
    badge = ca.data_uri(ca.BADGE, 'image/png')
    return page(1080, 1350, f'''<div class="bg"></div><div class="shade"></div>
<div class="col"><img class="badge" src="{badge}" alt=""><span class="bar">New here · club football</span>
<h1>Football<br>Stories</h1><p>{SLOGAN}</p><p class="url">fanlife.dubelteam.com</p></div>''',
                '.col{position:absolute;left:90px;right:90px;top:170px;display:flex;flex-direction:column;align-items:flex-start}'
                '.col .badge{width:300px;height:300px;margin-bottom:48px}.col h1{font-size:124px}.col p{font-size:36px}'
                f'.url{{margin-top:40px!important;color:{PAPER}!important;font:800 30px/1 "Weekly Caps","Archivo",sans-serif!important;letter-spacing:.06em}}')


def main() -> int:
    from playwright.sync_api import sync_playwright
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = [('fb-cover.jpg', 1640, 624, cover()), ('profile.png', 720, 720, profile()), ('ig-post.jpg', 1080, 1350, first_post())]
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        for name, w, h, html in jobs:
            f = OUT / '_page.html'
            f.write_text(html, encoding='utf-8')
            pg = b.new_page(viewport={'width': w, 'height': h})
            pg.goto(f.as_uri())
            pg.evaluate('document.fonts.ready')
            pg.wait_for_timeout(300)
            pg.screenshot(path=str(OUT / '_shot.png'))
            pg.close()
            im = Image.open(OUT / '_shot.png').convert('RGB')
            im.save(OUT / name, **({'quality': 92, 'optimize': True} if name.endswith('.jpg') else {'optimize': True}))
            print(name, im.size, (OUT / name).stat().st_size)
        b.close()
    for f in ('_page.html', '_shot.png'):
        (OUT / f).unlink(missing_ok=True)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
