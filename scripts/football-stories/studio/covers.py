"""Channel covers: the thumbnail a supporter's eye stops on, in two shapes.

`club` — a documentary. The club is the hook: its name on a paper plate, its colours over the stadium, its kit as the
ring of a medallion with the crest in the middle. A Celtic supporter scrolling past sees hoops and the shamrock before
he reads a word.

`vlog` — an I WAS THERE diary. A phone frame from the stand, a camera's viewfinder corners and REC light, the episode
on a taped label and the hook in two lines: what happened, then the turn.

    python3 -m studio.covers <covers.json> <out dir>

Each entry: {"name", "shape": "club"|"vlog", ...}. club: club, hook, sub, crest, art, primary, secondary, pattern
(stripes|hoops|sash|solid). vlog: frames [one or two paths], hook [line, turn], episode, place, crest, accent.
Paths are relative to the json file. Every figure on a cover comes from the film's own record; a cover prints no
number the film does not.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from .sprites import FIT_JS, _font_css, esc

# iPhone footage is HLG/PQ: tone-mapped to SDR the way the render does (matchday/render.py TONE)
TONE = ('zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,'
        'zscale=t=bt709:m=bt709:r=tv,format=yuv420p')

W, H = 1280, 720
INK, PAPER = '#15130F', '#FFFBF2'

CSS = '''
*{box-sizing:border-box;margin:0;padding:0}
body{width:1280px;height:720px;overflow:hidden;background:#15130F;-webkit-font-smoothing:antialiased}
.head{font-family:'Weekly Head';text-transform:uppercase;line-height:.9}
.caps{font-family:'Weekly Caps';text-transform:uppercase;letter-spacing:.07em}
.abs{position:absolute}
'''


def pattern(kind: str, a: str, b: str) -> str:
    if kind == 'stripes':
        return f'repeating-linear-gradient(90deg,{a} 0 46px,{b} 46px 92px)'
    if kind == 'hoops':
        return f'repeating-linear-gradient(0deg,{a} 0 44px,{b} 44px 88px)'
    if kind == 'sash':
        return f'linear-gradient(135deg,{a} 0 40%,{b} 40% 58%,{a} 58%)'
    return a


def club(c: dict, root: Path) -> str:
    a, b = c['primary'], c.get('secondary', PAPER)
    art = (root / c['art']).resolve().as_uri()
    crest = (root / c['crest']).resolve().as_uri()
    hook = ''.join(f'<div data-fit="630" style="white-space:nowrap">{esc(l)}</div>' for l in c['hook'].split('\n'))
    return f'''
<div class="abs" style="inset:0;background:url({art}) center/cover;filter:grayscale(1) contrast(1.25) brightness(1.05)"></div>
<div class="abs" style="inset:0;background:{a};mix-blend-mode:multiply"></div>
<div class="abs" style="inset:0;background:linear-gradient(90deg,rgba(21,19,15,.92) 0,rgba(21,19,15,.72) 46%,rgba(21,19,15,.05) 78%)"></div>
<div class="abs" style="inset:0;background-image:radial-gradient(rgba(255,251,242,.10) 1.6px,transparent 2px);background-size:12px 12px"></div>
<div class="abs" style="right:52px;top:96px;width:520px;height:520px">
  <div class="abs" style="inset:0;transform:translate(18px,18px);border-radius:50%;background:{INK}"></div>
  <div class="abs" style="inset:0;border-radius:50%;border:14px solid {INK};background:{pattern(c.get('pattern','solid'), a, b)};overflow:hidden"></div>
  <div class="abs" style="inset:92px;border-radius:50%;background:{PAPER};border:10px solid {INK};display:flex;align-items:center;justify-content:center">
    <img src="{crest}" style="width:78%;height:78%;object-fit:contain;filter:drop-shadow(0 4px 0 rgba(21,19,15,.25))"></div>
</div>
<div class="abs" style="left:56px;top:56px;width:690px">
  <div style="display:inline-block;position:relative;transform:rotate(-2deg);margin-left:6px">
    <div class="abs" style="inset:0;transform:translate(12px,12px);background:{a};border:5px solid {INK}"></div>
    <div class="head" data-fit="640" style="position:relative;background:{PAPER};color:{INK};border:6px solid {INK};padding:14px 24px 6px;font-size:92px;white-space:nowrap">{esc(c['club'])}</div>
  </div>
  <div class="head" style="margin-top:34px;font-size:128px;color:{PAPER};-webkit-text-stroke:3px {INK};paint-order:stroke fill;text-shadow:9px 9px 0 {a}">{hook}</div>
  <div class="caps" style="display:inline-block;margin-top:24px;background:{INK};color:{PAPER};border:4px solid {PAPER};padding:10px 18px 6px;font-size:34px">{esc(c['sub'])}</div>
</div>
<div class="abs" style="left:58px;bottom:28px;font-family:'Shrikhand';font-size:40px;color:{PAPER}">FanLife</div>
'''


def vlog(c: dict, root: Path) -> str:
    acc = c.get('accent', '#D71920')
    frames = [Path(f).resolve().as_uri() if Path(f).is_absolute() else (root / f).resolve().as_uri() for f in c['frames']]
    if len(frames) == 1:
        bg = f'<div class="abs" style="inset:0;background:url({frames[0]}) {c.get("focus", "center")}/cover;filter:saturate(1.3) contrast(1.08)"></div>'
    else:
        bg = (f'<div class="abs" style="inset:0;background:url({frames[0]}) center/cover;filter:saturate(1.35) contrast(1.1)"></div>'
              f'<div class="abs" style="inset:0;clip-path:polygon(62% 0,100% 0,100% 100%,40% 100%);background:url({frames[1]}) center/cover;filter:saturate(1.35) contrast(1.1)"></div>'
              f'<div class="abs" style="inset:0;clip-path:polygon(61% 0,63% 0,41% 100%,39% 100%);background:{PAPER}"></div>')
    line, turn = c['hook']
    crest = (root / c['crest']).resolve().as_uri()
    corner = f'width:64px;height:64px;border-color:{PAPER};border-style:solid;'
    return f'''
{bg}
<div class="abs" style="inset:0;background:linear-gradient(0deg,rgba(21,19,15,.88) 0,rgba(21,19,15,.35) 46%,rgba(21,19,15,0) 70%)"></div>
<div class="abs" style="inset:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 55%,rgba(0,0,0,.45) 100%)"></div>
<div class="abs" style="left:28px;top:28px;{corner}border-width:6px 0 0 6px"></div>
<div class="abs" style="right:28px;top:28px;{corner}border-width:6px 6px 0 0"></div>
<div class="abs" style="left:28px;bottom:28px;{corner}border-width:0 0 6px 6px"></div>
<div class="abs" style="right:28px;bottom:28px;{corner}border-width:0 6px 6px 0"></div>
<div class="abs caps" style="right:62px;top:56px;display:flex;align-items:center;gap:12px;color:{PAPER};font-size:34px;text-shadow:0 2px 6px rgba(0,0,0,.6)">
  <span style="width:26px;height:26px;border-radius:50%;background:#FF2D2D;box-shadow:0 0 14px #FF2D2D"></span>REC</div>
<div class="abs" style="left:62px;top:58px;transform:rotate(-3deg)">
  <div class="abs" style="left:-14px;top:-14px;width:84px;height:30px;background:rgba(255,251,242,.75);transform:rotate(-24deg)"></div>
  <div style="display:flex;border:5px solid {INK};box-shadow:10px 10px 0 {INK}">
    <div class="head" style="background:{PAPER};color:{INK};font-size:52px;padding:10px 18px 2px">I WAS THERE</div>
    <div class="head" style="background:{acc};color:{PAPER};font-size:52px;padding:10px 16px 2px;border-left:5px solid {INK}">EP.{esc(c['episode'])}</div>
  </div>
</div>
<div class="abs" style="left:58px;bottom:58px;width:900px">
  <div class="head" data-fit="880" style="font-size:118px;color:{PAPER};-webkit-text-stroke:12px {INK};paint-order:stroke fill;white-space:nowrap;filter:drop-shadow(0 6px 0 {INK})">{esc(line)}</div>
  <div style="margin-top:14px"><span class="head" data-fit="860" style="display:inline-block;background:{acc};color:{PAPER};border:6px solid {INK};box-shadow:10px 10px 0 {INK};padding:12px 22px 2px;font-size:96px;transform:rotate(-1.5deg);white-space:nowrap">{esc(turn)}</span></div>
</div>
<div class="abs" style="right:62px;bottom:62px;display:flex;flex-direction:column;align-items:center;gap:10px">
  <div style="width:150px;height:150px;border-radius:50%;background:{PAPER};border:7px solid {INK};box-shadow:8px 8px 0 {INK};display:flex;align-items:center;justify-content:center">
    <img src="{crest}" style="width:76%;height:76%;object-fit:contain"></div>
  <div class="caps" style="background:{INK};color:{PAPER};padding:6px 12px 2px;font-size:24px">{esc(c['place'])}</div>
</div>
'''


def banner(c: dict, root: Path) -> str:
    """The channel banner (2560x1440): the owner's art, and across the band every device shows, what the channel is."""
    art = (root / c['art']).resolve().as_uri()
    logo = (root / c['logo']).resolve().as_uri()
    crests = ''.join(f'<div style="width:118px;height:118px;border-radius:50%;background:{PAPER};border:6px solid {INK};'
                     f'display:flex;align-items:center;justify-content:center"><img src="{(root / x).resolve().as_uri()}" '
                     f'style="width:76%;height:76%;object-fit:contain"></div>' for x in c['crests'])
    return f'''
<div class="abs" style="inset:0;background:url({art}) center/cover"></div>
<div class="abs" style="left:0;right:0;top:500px;height:440px;background:{INK};border-block:8px solid {c.get('accent', '#D71920')}"></div>
<div class="abs" style="left:530px;top:530px;width:1500px;height:380px;display:flex;align-items:center;gap:44px">
  <img src="{logo}" style="width:300px;height:300px">
  <div style="flex:1">
    <div class="head" data-fit="1130" style="font-size:150px;color:{PAPER};white-space:nowrap;text-shadow:9px 9px 0 {c.get('accent', '#D71920')}">{esc(c['title'])}</div>
    <div class="caps" data-fit="1130" style="font-size:44px;color:{PAPER};margin-top:16px;white-space:nowrap">{esc(c['sub'])}</div>
    <div style="display:flex;gap:18px;margin-top:26px">{crests}</div>
  </div>
</div>'''


def frame(ref: str, root: Path, out: Path) -> Path:
    """`clip:<file>@<seconds>` → a still from the owner's footage (COVERS_FOOTAGE), tone-mapped; anything else is a path."""
    if not ref.startswith('clip:'):
        return root / ref
    import os
    import subprocess
    name, at = ref[5:].rsplit('@', 1)
    src = next(Path(os.environ.get('COVERS_FOOTAGE', '.')).rglob(name), None)
    if src is None:
        raise SystemExit(f'COVER_FOOTAGE_MISSING {name}')
    trc = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=color_transfer',
                          '-of', 'csv=p=0', str(src)], capture_output=True, text=True).stdout.strip()
    vf = (TONE + ',' if trc in ('arib-std-b67', 'smpte2084') else '') + 'scale=1920:-2'
    dst = out / f'_src-{Path(name).stem}-{at}.jpg'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', at, '-i', str(src), '-frames:v', '1', '-vf', vf, '-q:v', '2', str(dst)], check=True)
    return dst


def sheet(refs: list[str], root: Path, out: Path, name: str) -> Path:
    from PIL import Image, ImageDraw
    ims = [(r, Image.open(frame(r, root, out)).convert('RGB')) for r in refs]
    S = Image.new('RGB', (1500, 300 * ((len(ims) + 4) // 5)), 'white')
    d = ImageDraw.Draw(S)
    for i, (r, im) in enumerate(ims):
        im.thumbnail((296, 270))
        S.paste(im, ((i % 5) * 300, (i // 5) * 300))
        d.text(((i % 5) * 300 + 4, (i // 5) * 300 + 274), r[5:], fill='black')
    p = out / f'{name}-sheet.jpg'
    S.save(p, quality=85)
    return p


def render(spec: Path, out: Path) -> list[Path]:
    from playwright.sync_api import sync_playwright
    root = spec.parent
    out.mkdir(parents=True, exist_ok=True)
    made = []
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        p = b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=1.5)
        for c in json.loads(spec.read_text()):
            if c.get('candidates'):
                made.append(sheet(c['candidates'], root, out, c['name']))
            if c['shape'] == 'vlog':
                c = {**c, 'frames': [str(frame(f, root, out).resolve()) for f in c['frames']]}
            body = {'club': club, 'vlog': vlog, 'banner': banner}[c['shape']](c, root)
            size = (2560, 1440) if c['shape'] == 'banner' else (W, H)
            p.set_viewport_size({'width': size[0], 'height': size[1]})
            page = out / f'_{c["name"]}.html'
            page.write_text(f'<!doctype html><meta charset=utf-8><style>{_font_css()}{CSS}body{{width:{size[0]}px;height:{size[1]}px}}</style><body>{body}'
                            f'<script>document.fonts.ready.then(()=>{{{FIT_JS};document.body.dataset.ok=1}})</script>')
            p.goto(page.as_uri())
            p.wait_for_selector('body[data-ok]')
            png = out / f'{c["name"]}.png'
            p.screenshot(path=str(png))
            jpg = out / f'{c["name"]}.jpg'
            from PIL import Image
            Image.open(png).convert('RGB').resize(size, Image.LANCZOS).save(jpg, quality=90)
            png.unlink()
            page.unlink()
            made.append(jpg)
        b.close()
    return made


if __name__ == '__main__':
    for m in render(Path(sys.argv[1]), Path(sys.argv[2])):
        print(m, m.stat().st_size)
