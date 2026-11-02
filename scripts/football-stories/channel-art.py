"""YouTube channel art for FanLife: Football Stories — the banner (2048×1152, everything that matters inside the
1235×338 safe area every device shows) and the video watermark (the FanLife badge, 300×300 PNG).

    python3 scripts/football-stories/channel-art.py

Writes scripts/football-stories/channel/{banner.jpg,watermark.png}. The picture behind the banner is one of the owner's
paper-cut beat illustrations (fictional figures, seen from behind), darkened under the type.
"""
from __future__ import annotations

import base64
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from PIL import Image  # noqa: E402

from studio.common import INK, NEWSPRINT, PAPER, SLOGAN, VERMILION  # noqa: E402
from studio.sprites import _font_css  # noqa: E402

ROOT = HERE.parents[1]
OUT = HERE / 'channel'
ART = HERE / 'studio' / 'kit' / 'beats' / 'hapoel-tel-aviv-1999-00' / 'terrace-scarves-scoreboard.webp'
BADGE = ROOT / 'public' / 'brand' / 'fanlife' / 'logo-512.png'


def data_uri(p: Path, mime: str) -> str:
    return f'data:{mime};base64,' + base64.b64encode(p.read_bytes()).decode()


def banner_html() -> str:
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>{_font_css()}
html,body{{margin:0;width:2048px;height:1152px;overflow:hidden;background:{INK}}}
.bg{{position:absolute;inset:0;background:url('{data_uri(ART, 'image/webp')}') center 38%/cover;filter:saturate(1.05)}}
.shade{{position:absolute;inset:0;background:linear-gradient(180deg,rgba(21,19,15,.55),rgba(21,19,15,.78) 40%,rgba(21,19,15,.78) 60%,rgba(21,19,15,.55))}}
.safe{{position:absolute;left:406px;top:407px;width:1235px;height:338px;display:flex;align-items:center;gap:44px}}
.badge{{width:250px;height:250px;flex:none;filter:drop-shadow(6px 6px 0 {INK})}}
.copy{{flex:1;min-width:0}}
.bar{{display:inline-block;background:{VERMILION};color:{PAPER};font:800 30px/1 'Weekly Caps','Archivo',sans-serif;letter-spacing:.08em;padding:12px 18px 10px;text-transform:uppercase}}
h1{{margin:14px 0 0;color:{PAPER};font:900 italic 104px/0.92 'Weekly Head','Archivo',sans-serif;letter-spacing:-.01em;text-transform:uppercase;text-shadow:6px 6px 0 {INK}}}
p{{margin:16px 0 0;color:{NEWSPRINT};font:600 34px/1.2 'Weekly Body','Archivo',sans-serif}}
</style></head><body><div class="bg"></div><div class="shade"></div>
<div class="safe"><img class="badge" src="{data_uri(BADGE, 'image/png')}" alt="">
<div class="copy"><span class="bar">New documentaries · club football</span><h1>Football Stories</h1><p>{SLOGAN}</p></div></div>
</body></html>'''


def main() -> int:
    from playwright.sync_api import sync_playwright
    OUT.mkdir(exist_ok=True)
    page_file = OUT / '_banner.html'
    page_file.write_text(banner_html(), encoding='utf-8')
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        pg = b.new_page(viewport={'width': 2048, 'height': 1152})
        pg.goto(page_file.as_uri())
        pg.evaluate('document.fonts.ready')
        pg.wait_for_timeout(300)
        pg.screenshot(path=str(OUT / '_banner.png'))
        b.close()
    Image.open(OUT / '_banner.png').convert('RGB').save(OUT / 'banner.jpg', quality=90, optimize=True)
    (OUT / '_banner.png').unlink()
    page_file.unlink()
    badge = Image.open(BADGE).convert('RGBA').resize((300, 300), Image.LANCZOS)
    badge.save(OUT / 'watermark.png', optimize=True)
    for f in ('banner.jpg', 'watermark.png'):
        print(f, Image.open(OUT / f).size, (OUT / f).stat().st_size)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
