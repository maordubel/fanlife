"""THE PRESS — the collage look and the film's visual hook (owner, 23.11.2026: "still boring … the backgrounds are
banal … no visual HOOK that makes you want to stay. I, the creator, cannot watch more than 50 seconds"; his brief: a
newspaper front page with an enormous headline, halftone photographs, newsprint and paper textures, "Vox explainer
style — soft paper textures, bold outlines, minimal typography, and that characteristic handmade frame-rate look").

Two things, both built from the press kit (`studio/kit/press`: halftone pieces made in the owner's Flow) and the film's
own words:

  the front page   the film's first seconds are a newspaper front page ABOUT THIS FILM: a masthead, the door line as an
                   enormous headline stamped in line by line, a halftone photograph, columns of small type, a pasted
                   cut-out with a bold paper outline over a disc of the club's colour, a marker ring drawn round the
                   number — while the camera pushes into the headline. Every word on it is the narrator's own first
                   line (rule 2: nothing is composed).
  the scenes       a line that has no picture of its own (an `illustration` beat) is no longer a library still under a
                   glide: it is a collage — newsprint, a block or a sunburst of the club's colour turning slowly, a
                   halftone photograph printed over the colour (a duotone), a cut-out figure — four compositions,
                   never the same twice running.

The handmade frame rate: pasted pieces move ON TWOS AND THREES (`steps()` eases, a "boil" of a fraction of a degree
eight times a second), only inside these scenes; type and the camera stay smooth. Only the club's colour, paper and
ink (rule 95). No 3D transforms, no masks (see the lessons of 23.11.2026). `STORIES_PRESS=0` turns it off.
"""
from __future__ import annotations

import os
import random
import re
from html import escape as e
from pathlib import Path

W, H = 1920, 1080
KIT = Path(__file__).resolve().parents[1] / 'kit' / 'press'
PIECES = ('paper', 'crowd', 'ground', 'faithful', 'striker', 'keeper', 'celebrate')
STOP = {'in', 'on', 'the', 'of', 'at', 'for', 'a', 'an', 'and', 'by', 'to', 'were', 'was', 'with', 'from'}
HEAD_WORDS = 5
BOIL_FPS = 8
SCENES = ('duotone', 'ground', 'burst', 'paste')
ART_SCENE = {'terrace-crowd': 'duotone', 'terrace-empty': 'ground', 'supporter': 'burst', 'tunnel': 'paste'}
CSS = ('.pr{position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden}'
       '.prc{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:50% 50%;will-change:transform}'
       '.prp{position:absolute;left:-80px;top:-60px;width:2080px;height:1200px;background-size:cover;background-position:center}'
       '.prm{position:absolute;mix-blend-mode:multiply;background-size:cover;background-position:center}'
       '.prk{position:absolute;will-change:transform}'
       ".prmast{position:absolute;left:90px;right:90px;top:44px;height:92px;border-top:10px solid INK;border-bottom:4px double INK;display:flex;"
       "align-items:center;justify-content:space-between;font:700 26px 'Cond';letter-spacing:7px;color:INK}"
       ".prmast b{font:400 66px/1 'Ultra';letter-spacing:1px;display:flex;align-items:center;gap:22px} .prlogo{width:76px;height:76px}"
       ".prh{position:absolute;left:90px;top:176px;width:1180px;font:400 172px/0.9 'Ultra';color:INK;text-transform:uppercase;letter-spacing:-2px}"
       ".prh span{display:block;white-space:nowrap;transform-origin:0% 60%;will-change:transform} .prh i{font-style:normal;position:relative}"
       ".prsub{position:absolute;left:96px;width:1150px;font:700 46px/1.1 'Cond';letter-spacing:3px;color:INK;text-transform:uppercase}"
       ".prkick{position:absolute;padding:10px 26px 6px;font:700 34px 'Cond';letter-spacing:6px;color:#fff;transform-origin:0 50%}"
       ".prcol{position:absolute;font:700 17px/1.32 'Mono';color:INK;opacity:.78;column-gap:26px;column-rule:2px solid rgba(20,17,13,.35);text-align:justify;overflow:hidden}"
       '.prph{position:absolute;border:6px solid INK;background-size:cover;background-position:center;box-shadow:12px 14px 0 rgba(20,17,13,.5)}'
       ".prcap{position:absolute;font:700 22px 'Cond';letter-spacing:4px;color:INK;text-transform:uppercase}"
       '.prring{position:absolute;overflow:visible}'
       '.prdisc{position:absolute;border-radius:50%;will-change:transform}'
       '.prburst{position:absolute;left:-540px;top:-960px;width:3000px;height:3000px;border-radius:50%;will-change:transform}'
       '.prtape{position:absolute;height:54px;opacity:.86;box-shadow:0 3px 0 rgba(20,17,13,.25)}')


def r2(x: float) -> float:
    return round(x + 1e-9, 2)


BRAND = Path(__file__).resolve().parents[4] / 'public' / 'brand' / 'fanlife' / 'logo-192.png'   # the FanLife roundel (rule two-logos)


def kit() -> dict[str, Path]:
    return {n: KIT / f'{n}.webp' for n in PIECES if (KIT / f'{n}.webp').exists()}


def headline(line: str) -> tuple[list[str], str]:
    """The narrator's first sentence as a headline: its first words in two or three lines, the rest as the deck. Words
    are only cut at a word, never changed. The head ends at the sentence's own first comma or colon when that comes
    early; otherwise after `HEAD_WORDS` words, never on a small word. Lines are packed to about twelve letters."""
    words = re.sub(r'[.;:!?]+$', '', line.strip()).split()
    stop = next((i + 1 for i, w in enumerate(words[:HEAD_WORDS + 2]) if w[-1] in ',:' and i >= 1), None)
    n = stop or min(len(words), HEAD_WORDS + 1)
    while not stop and n > 2 and words[n - 1].lower().strip(',') in STOP:
        n -= 1
    head, rest = [w.rstrip(',:') if k == n - 1 else w for k, w in enumerate(words[:n])], words[n:]
    lines, cur = [], ''
    for w in head:
        if cur and len(cur) + 1 + len(w) > 12:
            lines.append(cur)
            cur = w
        else:
            cur = f'{cur} {w}'.strip()
    if cur:
        lines.append(cur)
    if len(lines) > 3:   # three lines of headline; the rest of the head opens the deck
        rest = ' '.join(lines[3:]).split() + rest
        lines = lines[:3]
    return lines, ' '.join(rest)


def boil(sel: str, t: float, d: float, rg: random.Random, deg: float = 0.5, px: float = 3.0) -> list[str]:
    """The handmade wobble of a pasted piece: a new tiny pose `BOIL_FPS` times a second, held between (steps)."""
    out, n = [], max(1, int(d * BOIL_FPS))
    for k in range(n):
        out.append(f'tl.set("{sel}",{{rotation:{r2(rg.uniform(-deg, deg))},x:{r2(rg.uniform(-px, px))},y:{r2(rg.uniform(-px, px))}}},{r2(t + k / BOIL_FPS)});')
    return out


def burst_css(us: str, paper: str) -> str:
    return f'background:repeating-conic-gradient({us} 0deg 9deg,{paper} 9deg 18deg)'


def front_page(cid: str, s: dict, t: float, d: float, ink: str, us: str, paper: str) -> tuple[str, list[str]]:
    """The film's opening as a front page. `s`: head (lines), deck, kicker, mast, dateline, body, files{piece: asset},
    off (seconds of the page already played by an earlier segment), total (its whole length)."""
    f = s['files']
    off, total = float(s.get('off') or 0), float(s.get('total') or d)
    t0 = t - off                       # when the page began
    rg = random.Random(7)
    im = lambda k: f'assets/img/{f[k]}'   # noqa: E731
    lines = s['head']
    brand = f'<img class="prlogo" src="assets/img/{f["brand"]}">' if f.get('brand') else ''
    size = int(min(172, 1150 / (max(len(x) for x in lines) * 0.74)))   # Ultra is wide: the longest line sets the size, no line wraps
    def line_html(i: int, x: str) -> str:
        x = e(x)
        if i == 0:   # the number in the first line is the thing the marker rings
            x = re.sub(r'(\d[\d,.]*)', lambda m: f'<i id="{cid}n">{m.group(1)}</i>', x, count=1)
        return f'<span id="{cid}h{i}">{x}</span>'
    hl = ''.join(line_html(i, x) for i, x in enumerate(lines))
    head_h = len(lines) * size * 0.9
    sub_y = 176 + head_h + 26
    body = e(' '.join([s.get('body') or ''] * 6))[:2600]
    html = (f'<div class="prc" id="{cid}cam"><div class="prp" style="background-image:url({im("paper")})"></div>'
            f'<div class="prmast"><span>{e(s.get("dateline") or "")}</span><b>{brand}{e(s.get("mast") or "THE FANLIFE GAZETTE")}</b><span>FOOTBALL. FOREVER.</span></div>'
            f'<div class="prh" style="font-size:{size}px">{hl}</div>'
            f'<div class="prsub" id="{cid}sub" style="top:{sub_y:.0f}px">{e(s.get("deck") or "")}</div>'
            f'<div class="prkick" id="{cid}k" style="left:96px;top:{sub_y + 124:.0f}px;background:{us}">{e((s.get("kicker") or "").upper())}</div>'
            f'<div class="prcol" id="{cid}col" style="left:96px;top:{sub_y + 206:.0f}px;width:1130px;height:{max(120, 1010 - sub_y - 206):.0f}px;column-count:4">{body}</div>'
            f'<div class="prph" id="{cid}ph" style="left:1330px;top:186px;width:500px;height:330px;background-image:url({im("owner" if f.get("owner") else "crowd")})"></div>'
            f'<div class="prcap" style="left:1330px;top:536px">{"Pictured in this story" if f.get("owner") else "The terrace · file photograph"}</div>'
            f'<div class="prdisc" id="{cid}d" style="left:1290px;top:560px;width:560px;height:560px;background:{us}"></div>'
            f'<img class="prk" id="{cid}fig" src="{im("striker")}" style="left:1270px;top:500px;width:560px">'
            f'<svg class="prring" id="{cid}ring" style="left:50px;top:{150 + (172 - size) * 0.2:.0f}px" width="{size * 4.2:.0f}" height="{size * 1.5:.0f}" viewBox="0 0 700 260" preserveAspectRatio="none">'
            f'<path id="{cid}rp" d="M40 130 C40 30 660 10 664 120 C668 240 60 252 36 140 C30 100 120 40 330 30" fill="none" stroke="{us}" stroke-width="12" '
            f'stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg></div>')
    tw = []
    # the sheet lands (on threes), then each headline line is stamped in
    tw.append(f'tl.fromTo("#{cid}cam",{{y:-1150,rotation:-5}},{{y:0,rotation:-1.2,duration:0.55,ease:"steps(5)"}},{r2(t0)});')
    for i in range(len(lines)):
        at = t0 + 0.7 + i * 0.42
        tw.append(f'tl.fromTo("#{cid}h{i}",{{scale:1.5,opacity:0}},{{scale:1,opacity:1,duration:0.28,ease:"steps(3)"}},{r2(at)});')
    after = t0 + 0.7 + len(lines) * 0.42
    tw.append(f'tl.fromTo("#{cid}sub",{{opacity:0,y:14}},{{opacity:1,y:0,duration:0.4,ease:"power2.out"}},{r2(after)});')
    tw.append(f'tl.fromTo("#{cid}k",{{scaleX:0}},{{scaleX:1,duration:0.36,ease:"steps(4)"}},{r2(after + 0.25)});')
    tw.append(f'tl.fromTo("#{cid}col",{{opacity:0}},{{opacity:0.78,duration:0.5,ease:"sine.out"}},{r2(after + 0.35)});')
    tw.append(f'tl.fromTo("#{cid}ph",{{y:-40,rotation:4,opacity:0}},{{y:0,rotation:1.5,opacity:1,duration:0.4,ease:"steps(4)"}},{r2(after + 0.1)});')
    tw.append(f'tl.fromTo("#{cid}d",{{scale:0}},{{scale:1,duration:0.45,ease:"steps(5)"}},{r2(after + 0.5)});')
    tw.append(f'tl.fromTo("#{cid}fig",{{x:700,rotation:14}},{{x:0,rotation:-3,duration:0.6,ease:"steps(6)"}},{r2(after + 0.7)});')
    tw.append(f'tl.fromTo("#{cid}rp",{{strokeDashoffset:1}},{{strokeDashoffset:0,duration:0.7,ease:"power1.inOut"}},{r2(after + 1.2)});')
    # the camera: a long push into the headline, smooth (the page is handmade; the camera is not)
    tw.append(f'tl.to("#{cid}cam",{{scale:1.22,x:150,y:70,rotation:0.4,duration:{r2(max(1.0, total - 1.4))},ease:"sine.inOut",transformOrigin:"30% 30%"}},{r2(t0 + 1.4)});')
    tw += boil(f'#{cid}fig', max(t, after + 1.35), max(0.2, t + d - max(t, after + 1.35)), rg, 0.7, 3)
    tw += boil(f'#{cid}ph', max(t, after + 0.6), max(0.2, t + d - max(t, after + 0.6)), rg, 0.35, 1.5)
    return html, tw


def scene(cid: str, s: dict, t: float, d: float, ink: str, us: str, paper: str) -> tuple[str, list[str]]:
    """One collage for a line with no picture of its own. `s`: scene (SCENES), files, seed, flip."""
    f = s['files']
    rg = random.Random(str(s.get('seed') or cid))
    im = lambda k: f'assets/img/{f[k]}'   # noqa: E731
    flip = bool(s.get('flip'))
    X = lambda x, w=0: (W - x - w) if flip else x   # noqa: E731
    k = s.get('scene') or 'duotone'
    html = f'<div class="prc" id="{cid}cam"><div class="prp" style="background-image:url({im("paper")})"></div>'
    tw = []
    if k == 'duotone':     # the terrace printed over the club's colour, a torn band of paper, the faithful pasted on
        html += (f'<div class="prk" id="{cid}blk" style="left:-40px;top:-40px;width:2000px;height:1160px;background:{us}"></div>'
                 f'<div class="prm" id="{cid}ph" style="left:-60px;top:-40px;width:2040px;height:1160px;background-image:url({im("crowd")})"></div>'
                 f'<div class="prtape" style="left:{X(-40, 900)}px;top:120px;width:900px;background:{paper};transform:rotate(-2deg)"></div>'
                 f'<div class="prph" id="{cid}p2" style="left:{X(1180, 620)}px;top:560px;width:620px;height:356px;background-image:url({im("faithful")})"></div>')
        tw.append(f'tl.fromTo("#{cid}ph",{{scale:1.0,x:0}},{{scale:1.12,x:{-60 if flip else 60},duration:{r2(d)},ease:"sine.inOut",immediateRender:false}},{r2(t)});')
        tw.append(f'tl.fromTo("#{cid}p2",{{y:500,rotation:9}},{{y:0,rotation:-3,duration:0.5,ease:"steps(5)",immediateRender:false}},{r2(t + 0.5)});')
        tw += boil(f'#{cid}p2', t + 1.1, d - 1.1, rg, 0.5, 2.5)
    elif k == 'ground':    # the quiet one: the ball, the pylon and the stand on newsprint, a disc of colour rising behind
        html += (f'<div class="prdisc" id="{cid}d" style="left:{X(170, 520)}px;top:90px;width:520px;height:520px;background:{us}"></div>'
                 f'<div class="prm" id="{cid}ph" style="left:-60px;top:-30px;width:2040px;height:1140px;background-image:url({im("ground")})"></div>')
        tw.append(f'tl.fromTo("#{cid}d",{{y:260,scale:0.8}},{{y:0,scale:1,duration:{r2(d)},ease:"sine.out",immediateRender:false}},{r2(t)});')
        tw.append(f'tl.fromTo("#{cid}ph",{{scale:1.14,x:{40 if flip else -40}}},{{scale:1.0,x:0,duration:{r2(d)},ease:"sine.inOut",immediateRender:false}},{r2(t)});')
    elif k == 'burst':     # the release: a sunburst of the club's colour turning, the man on his knees pasted over it
        html += (f'<div class="prburst" id="{cid}b" style="{burst_css(us, paper)}"></div>'
                 f'<div class="prp" style="background-image:url({im("paper")});mix-blend-mode:multiply;opacity:.55"></div>'
                 f'<img class="prk" id="{cid}fig" src="{im("celebrate")}" style="left:420px;top:330px;width:1080px">')
        tw.append(f'tl.fromTo("#{cid}b",{{rotation:0}},{{rotation:{-40 if flip else 40},duration:{r2(d)},ease:"none",immediateRender:false}},{r2(t)});')
        tw.append(f'tl.fromTo("#{cid}fig",{{y:700,scale:0.9}},{{y:0,scale:1,duration:0.5,ease:"steps(5)",immediateRender:false}},{r2(t + 0.25)});')
        tw += boil(f'#{cid}fig', t + 0.85, d - 0.85, rg, 0.45, 3)
    else:                  # paste: a block of colour, the striker and the keeper pasted across the sheet
        html += (f'<div class="prk" id="{cid}blk" style="left:{X(0, 860)}px;top:0;width:860px;height:1080px;background:{us}"></div>'
                 f'<div class="prm" style="left:{X(0, 860)}px;top:0;width:860px;height:1080px;background-image:url({im("paper")});opacity:.5"></div>'
                 f'<img class="prk" id="{cid}fig" src="{im("striker")}" style="left:{X(190, 620)}px;top:150px;width:620px;{"transform:scaleX(-1);" if False else ""}">'
                 f'<img class="prk" id="{cid}f2" src="{im("keeper")}" style="left:{X(1030, 760)}px;top:250px;width:760px">'
                 f'<div class="prtape" style="left:{X(960, 520)}px;top:880px;width:520px;background:{us};transform:rotate(2deg)"></div>')
        tw.append(f'tl.fromTo("#{cid}blk",{{scaleY:0,transformOrigin:"50% 100%"}},{{scaleY:1,duration:0.4,ease:"steps(4)",immediateRender:false}},{r2(t)});')
        tw.append(f'tl.fromTo("#{cid}fig",{{x:{-900 if not flip else 900},rotation:-12}},{{x:0,rotation:2,duration:0.5,ease:"steps(5)",immediateRender:false}},{r2(t + 0.3)});')
        tw.append(f'tl.fromTo("#{cid}f2",{{x:{900 if not flip else -900},y:-200,rotation:10}},{{x:0,y:0,rotation:-2,duration:0.5,ease:"steps(5)",immediateRender:false}},{r2(t + 0.6)});')
        tw += boil(f'#{cid}fig', t + 0.85, d - 0.85, rg, 0.5, 3)
        tw += boil(f'#{cid}f2', t + 1.15, d - 1.15, rg, 0.5, 3)
    html += '</div>'
    # the camera drifts, smooth, a little; the sheet itself is still
    tw.append(f'tl.fromTo("#{cid}cam",{{scale:1.03,rotation:{-0.5 if flip else 0.5}}},{{scale:1.09,rotation:{0.4 if flip else -0.4},duration:{r2(d)},ease:"sine.inOut",immediateRender:false}},{r2(t)});')
    return html, tw


def direct(beats: list[dict], shots: dict[int, dict], files: dict[str, str], club: str = '') -> dict:
    """In place: the front page on the film's opening beat, a collage on every illustration beat. `shots`: the plan's
    shots by n; `files`: press piece → asset name. Returns what was set, for the film's report."""
    made = {'front': 0, 'scenes': 0}
    if os.environ.get('STORIES_PRESS', '1') == '0' or not {'paper', 'crowd', 'striker'} <= set(files):
        return made
    first = [b for b in beats if (b.get('meta') or {}).get('n') == 0 and (b['meta'].get('type') == 'open')]
    if first:
        sh = shots.get(0) or {}
        text = str(sh.get('narration') or '')
        sents = re.split(r'(?<=[.!?])\s+', text.strip())
        head, deck = headline(sents[0] if sents else text)
        total = sum(b['d'] for b in first)
        off = 0.0
        for b in first:
            keep = [x for x in b['shots'] if x['kind'] not in ('image', 'video', 'tint', 'lead', 'thread', 'word', 'kinetic', 'life', 'cutout', 'objects', 'explain', 'question')]   # the page is the title: a second title over its headline was printed on the 23.11 sample
            b['shots'] = [{'kind': 'gazette', 'page': 'front', 'head': head, 'deck': deck, 'kicker': (sh.get('visual') or {}).get('kicker') or '',
                           'mast': 'THE FANLIFE GAZETTE', 'dateline': f'{club.upper()} EDITION' if club else '', 'body': text, 'files': files,
                           'off': round(off, 3), 'total': round(total, 3), 'dt': 0.0, 'd': round(b['d'], 3)}] + keep
            off += b['d']
            made['front'] += 1
    last, k = None, 0
    for b in beats:
        m = b.get('meta') or {}
        if m.get('type') != 'illustration' or not any(x['kind'] == 'image' and x.get('dt', 0) < 0.1 for x in b['shots']):
            continue
        if any(x['kind'] in ('pcard', 'kitdev', 'atlas', 'press') for x in b['shots']) or b['d'] < 2.6:
            continue
        art = ((shots.get(m.get('n')) or {}).get('visual') or {}).get('art')
        sc = ART_SCENE.get(art) or SCENES[k % len(SCENES)]
        need = {'duotone': {'crowd', 'faithful'}, 'ground': {'ground'}, 'burst': {'celebrate'}, 'paste': {'striker', 'keeper'}}[sc]
        if sc == last or not need <= set(files):
            sc = next((x for x in SCENES if x != last and {'duotone': {'crowd', 'faithful'}, 'ground': {'ground'}, 'burst': {'celebrate'},
                                                         'paste': {'striker', 'keeper'}}[x] <= set(files)), None)
        if not sc:
            continue
        b['shots'] = [{'kind': 'gazette', 'page': 'scene', 'scene': sc, 'files': files, 'seed': f'{club}|{m.get("n")}|{k}', 'flip': k % 2 == 1,
                       'dt': 0.0, 'd': round(b['d'], 3)}] + [x for x in b['shots'] if x['kind'] not in ('image', 'video', 'tint', 'life', 'cutout')]
        last, k = sc, k + 1
        made['scenes'] += 1
    return made
