"""The owner's pictures and clips enter the film as VOX moments, never as slides (owner, 24.11.2026: "combine the pictures
I upload … with our VOX technology: an effect, a transition with motion, a cool entrance onto the screen, together with
the text — not as a slideshow. Between the speech." and "also video files I upload, inside the edit").

Every beat whose picture is one the owner chose (a film upload or a pinned Drive file: the plan's `required_asset`) gets
a reveal instead of a still that cuts in:

    print   the photograph slides in as a print on newsprint (white border, bold ink outline, tape), settles, and the
            line's own words are stamped beside it
    tear    the newsprint tears open down the middle and the picture is behind it, full frame
    strips  the picture arrives in six vertical strips from above and below, and closes into one (stills only)
    frame   the picture in a frame of the club's colour, small; the camera pushes through the frame into it
    stack   a picture with no line of its own drops onto the pile of the prints before it

A clip plays inside the same print or frame (muted; the narrator speaks over it). The words are the narrator's own, from
the line the picture accompanies (press.headline: his words, in order) — nothing is printed that he did not say. Every
entrance is soft (≥ 0.8 s, power3/sine, rule 142), the pieces boil at eight frames a second, no 3D, no filter, no mask
gradient. `STORIES_REVEAL=0` turns it off (the owner's pictures then cut in as before).
"""
from __future__ import annotations

import os
import random
import re
from html import escape as e

from . import press

STYLES_STILL = ('print', 'tear', 'strips', 'frame')
STYLES_CLIP = ('print', 'frame', 'tear')
DROP = {'image', 'video', 'tint', 'word', 'kinetic', 'cutout', 'objects', 'explain', 'question', 'life', 'lead'}
KEEP_PLAIN = {'pcard', 'kitdev', 'atlas', 'gazette', 'press', 'end', 'follow'}   # a beat that belongs to another device
MIN_D = 2.4
TEXT_W = 600

CSS = ('.rv{position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden}'
       '.rvg{position:absolute;left:-80px;top:-60px;width:2080px;height:1200px;background-size:cover;background-position:center}'
       '.rvs{position:absolute;border-radius:50%}'
       '.rvp{position:absolute;box-sizing:border-box;border:16px solid #F7F1E3;box-shadow:0 0 0 5px INK,18px 22px 0 rgba(20,17,13,.38);'
       'background:#F7F1E3;will-change:transform}'
       '.rvp img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover}'
       '.rvt{position:absolute;will-change:transform;pointer-events:none}'
       '.rvt i{position:absolute;width:190px;height:52px;background:rgba(236,226,198,.88);box-shadow:0 3px 0 rgba(20,17,13,.22)}'
       '.rvf{position:absolute;box-sizing:border-box;will-change:transform}'
       '.rvf img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover}'
       '.rvx{position:absolute;left:0;top:0;width:1920px;height:1080px;will-change:clip-path}'
       '.rvx img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover}'
       '.rvk{position:absolute;top:0;height:1080px;background-size:1920px 1080px;will-change:transform;box-shadow:0 0 0 3px INK}'
       ".rvw{position:absolute;font:400 92px/0.96 'Ultra';color:INK;text-transform:uppercase;letter-spacing:-1px}"
       '.rvw span{display:block;transform-origin:0 60%;will-change:transform;white-space:nowrap}'
       '.rvw b{font-weight:400}'
       ".rvl{position:absolute;padding:14px 26px 10px;background:#F7F1E3;box-shadow:0 0 0 4px INK,10px 12px 0 rgba(20,17,13,.4);"
       "font:400 64px/0.98 'Ultra';color:INK;text-transform:uppercase;transform-origin:0 50%;will-change:transform}"
       '.rvl span{display:block;white-space:nowrap}')


def r2(x: float) -> float:
    return round(float(x), 2)


def words(narration: str) -> list[str]:
    """The line's first sentence as up to three stamped lines (the narrator's words, in order), or []."""
    text = str(narration or '').strip()
    if not text:
        return []
    first = re.split(r'(?<=[.!?])\s+', text)[0]
    head, _ = press.headline(first)
    return head[:3]


def direct(beats: list[dict], shots: dict[int, dict], files: dict[str, str], seed: str = '') -> dict:
    """In place: the first beat of every line that carries an owner's picture or clip becomes a reveal. `shots`: the
    plan's shots by n; `files`: the press kit (paper). Returns {'reveals': n, 'clips': n} for the film's report."""
    made = {'reveals': 0, 'clips': 0}
    if os.environ.get('STORIES_REVEAL', '1') == '0' or 'paper' not in files:
        return made
    seen: set[int] = set()
    last_style, pile, k = None, [], 0
    for b in beats:
        m = b.get('meta') or {}
        n = m.get('n')
        sh = shots.get(n) or {}
        if n in seen or not sh.get('required_asset'):
            if n not in seen:
                pile = []
            continue
        seen.add(n)
        pic = next((x for x in b['shots'] if x['kind'] in ('image', 'video') and x.get('dt', 0) < 0.1), None)
        if pic is None or b['d'] < MIN_D or any(x['kind'] in KEEP_PLAIN for x in b['shots']):
            pile = []
            continue
        clip = pic['kind'] == 'video'
        head = words(sh.get('narration') or '')
        rg = random.Random(f'{seed}|{n}')
        if not head and pile and not clip:
            style = 'stack'
        else:
            pool = [s for s in (STYLES_CLIP if clip else STYLES_STILL) if s != last_style]
            style = pool[(k + rg.randrange(len(pool))) % len(pool)]
        keep = [x for x in b['shots'] if x['kind'] not in DROP]
        b['shots'] = [{'kind': 'reveal', 'style': style, 'src': pic['src'], 'clip': clip, 'from': pic.get('from', 0),
                       'head': head, 'under': pile[-2:] if style == 'stack' else [], 'paper': files['paper'],
                       'tilt': round(rg.uniform(-3.2, 3.2), 2), 'dt': 0.0}] + keep
        b['reveal'] = style
        if not clip:
            pile.append(pic['src'])
        last_style, k = style, k + 1
        made['reveals'] += 1
        made['clips'] += int(clip)
    return made


# ── the device (build.Film.reveal calls this) ─────────────────────────────────────────────────────────────────────

def _tape(w: int, h: int, rg: random.Random) -> str:
    return (f'<i style="left:{-40 + rg.randint(-10, 10)}px;top:{-18}px;transform:rotate({rg.uniform(-38, -28):.1f}deg)"></i>'
            f'<i style="left:{w - 150 + rg.randint(-10, 10)}px;top:{h - 34}px;transform:rotate({rg.uniform(-38, -28):.1f}deg)"></i>')


def _stamp(cid: str, lines: list[str], us: str) -> str:
    out = []
    for i, x in enumerate(lines):
        x = e(x)
        if i == 0:
            x = re.sub(r'(\d[\d,.]*)', lambda m: f'<b style="color:{us}">{m.group(1)}</b>', x, count=1)
        out.append(f'<span id="{cid}w{i}">{x}</span>')
    return ''.join(out)


def _size(lines: list[str], width: int, top: int = 92) -> int:
    """Ultra is a wide face (≈ 0.8 em a capital): the longest line sets the size, so no line runs under the picture."""
    return int(min(top, width / (max(len(x) for x in lines) * 0.8))) if lines else top


def build(cid: str, s: dict, t: float, d: float, ink: str, us: str) -> tuple[list[tuple], list[str], list[tuple]]:
    """→ (clips, tweens, sounds). clips: (id, z, html, kind) with kind 'div' or 'video' (a timed <video> of its own)."""
    rg = random.Random(f'{cid}|{s["src"]}')
    style, src, clip, lines = s['style'], s['src'], s.get('clip'), s.get('head') or []
    img = f'assets/img/{e(src)}'
    # a clip's poster frame sits under it: the renderer draws a clip only once it is settled on screen, so the print is
    # never empty in its first half-second (measured 24.11.2026)
    still = f'<img src="assets/img/{e(s["poster"])}">' if clip and s.get('poster') else ''
    clips, tw, snd = [], [], []
    ground = (f'<div class="rv"><div class="rvg" style="background-image:url(assets/img/{e(s["paper"])})"></div>'
              f'<div class="rvs" id="{cid}s" style="left:{rg.randint(-260, -120)}px;top:{rg.randint(440, 620)}px;width:900px;height:900px;background:{us}"></div></div>')
    end = t + d
    vid = lambda box: (f'{cid}v', 6, box, 'video')   # noqa: E731

    if style in ('print', 'stack'):
        text = bool(lines) and style == 'print'
        w, h = (1060, 596) if text else (1240, 698)
        x0 = 1920 - w - 110 if text else (1920 - w) // 2
        y0 = 150 if text else (1080 - h) // 2 - 10
        tilt = s.get('tilt', -2.5)
        clips.append((f'{cid}g', 3, ground, 'div'))
        for i, u in enumerate(s.get('under') or []):   # the pile the new print lands on: the prints before it, as they lay
            ux, uy, ur = x0 + (-60 if i % 2 else 70), y0 + (40 if i % 2 else -30), (-7 if i % 2 else 6)
            clips.append((f'{cid}u{i}', 4, f'<div class="rvp" style="left:{ux}px;top:{uy}px;width:{w}px;height:{h}px;transform:rotate({ur}deg)">'
                                            f'<img src="assets/img/{e(u)}"></div>', 'div'))
        inner = still if clip else f'<img src="{img}">'
        clips.append((f'{cid}p', 5, f'<div class="rvp" id="{cid}pp" style="left:{x0}px;top:{y0}px;width:{w}px;height:{h}px">{inner}</div>', 'div'))
        movers = [f'#{cid}pp']
        if clip:
            clips.append(vid(dict(left=x0 + 16, top=y0 + 16, width=w - 32, height=h - 32)))
            movers.append(f'#{cid}v')
        clips.append((f'{cid}t', 7, f'<div class="rvt" id="{cid}tt" style="left:{x0}px;top:{y0}px;width:{w}px;height:{h}px">{_tape(w, h, rg)}</div>', 'div'))
        movers.append(f'#{cid}tt')
        sel = ','.join(movers)
        if style == 'stack':
            tw.append(f'tl.fromTo("{sel}",{{y:-1150,x:{rg.randint(-160, 160)},rotation:{-14 if rg.random() < .5 else 13}}},{{y:0,x:0,rotation:{tilt},duration:0.85,ease:"power3.out"}},{r2(t)});')
        elif clip:   # a clip is drawn only while it is wholly on screen: it grows out of the paper instead of sliding in
            tw.append(f'tl.fromTo("{sel}",{{scale:0.55,x:90,y:60,rotation:5}},{{scale:1,x:0,y:0,rotation:{tilt},duration:0.9,ease:"power3.out"}},{r2(t)});')
        else:
            tw.append(f'tl.fromTo("{sel}",{{x:1250,y:140,rotation:12}},{{x:0,y:0,rotation:{tilt},duration:0.9,ease:"power3.out"}},{r2(t)});')
        tw.append(f'tl.fromTo("{sel}",{{scale:1}},{{scale:1.05,duration:{r2(max(0.4, d - 0.9))},ease:"sine.inOut",immediateRender:false}},{r2(t + 0.9)});')
        tw.append(f'tl.fromTo("#{cid}s",{{scale:0.2}},{{scale:1,duration:0.9,ease:"power3.out"}},{r2(t + 0.15)});')
        tw += press.boil(f'#{cid}tt', t + 0.95, max(0.2, end - t - 0.95), rg, 0.4, 1.5)
        snd.append(('page', t, 0.45))
        if text:
            size = _size(lines, TEXT_W)
            clips.append((f'{cid}w', 8, f'<div class="rvw" style="left:96px;top:{560 - len(lines) * size * 0.5:.0f}px;width:{TEXT_W}px;font-size:{size}px">{_stamp(cid, lines, us)}</div>', 'div'))
    elif style == 'frame':
        clips.append((f'{cid}g', 3, ground, 'div'))
        inner = still if clip else f'<img src="{img}">'
        clips.append((f'{cid}p', 5, f'<div class="rvf" id="{cid}ff" style="left:0;top:0;width:1920px;height:1080px;border:46px solid {us};'
                                    f'box-shadow:inset 0 0 0 6px {ink},0 0 0 6px {ink}">{inner}</div>', 'div'))
        sel = f'#{cid}ff' + (f',#{cid}v' if clip else '')
        if clip:
            clips.append(vid(dict(left=46, top=46, width=1828, height=988)))
        tw.append(f'tl.fromTo("{sel}",{{scale:0.4,rotation:-4,y:30}},{{scale:0.62,rotation:-2,y:0,duration:0.8,ease:"power3.out"}},{r2(t)});')
        tw.append(f'tl.fromTo("{sel}",{{scale:0.62,rotation:-2}},{{scale:1.1,rotation:0,duration:1.4,ease:"power2.inOut",immediateRender:false}},{r2(t + 1.0)});')
        tw.append(f'tl.fromTo("{sel}",{{scale:1.1}},{{scale:1.16,duration:{r2(max(0.3, d - 2.4))},ease:"none",immediateRender:false}},{r2(t + 2.4)});')
        snd.append(('whoosh', t + 1.0, 0.3))
    elif style == 'tear':
        # the newsprint over the picture tears down the middle and its two halves are pulled apart (static jagged
        # edges, moving halves: a clip under them is whole on screen the whole time)
        pts = 11
        edge = [50 + rg.uniform(-2.6, 2.6) for _ in range(pts)]
        ys = [i * 100 / (pts - 1) for i in range(pts)]
        lhalf = 'polygon(0% 0%,' + ','.join(f'{x:.2f}% {y:.2f}%' for x, y in zip(edge, ys)) + ',0% 100%)'
        rhalf = 'polygon(100% 0%,' + ','.join(f'{x:.2f}% {y:.2f}%' for x, y in zip(edge, ys)) + ',100% 100%)'
        inner = still if clip else f'<img src="{img}">'
        clips.append((f'{cid}p', 3, f'<div class="rvx" id="{cid}xx">{inner}</div>', 'div'))
        if clip:
            clips.append((f'{cid}v', 4, dict(left=0, top=0, width=1920, height=1080), 'video'))
        paper = f'background-image:url(assets/img/{e(s["paper"])});background-size:2080px 1200px;background-position:center'
        clips.append((f'{cid}h', 7, f'<div class="rv"><div class="rvx" id="{cid}hl" style="{paper};clip-path:{lhalf}"></div>'
                                    f'<div class="rvx" id="{cid}hr" style="{paper};clip-path:{rhalf}"></div></div>', 'div'))
        tw.append(f'tl.fromTo("#{cid}hl",{{x:0,rotation:0}},{{x:-60,rotation:-1.5,duration:0.35,ease:"power2.out"}},{r2(t)});')
        tw.append(f'tl.fromTo("#{cid}hr",{{x:0,rotation:0}},{{x:60,rotation:1.5,duration:0.35,ease:"power2.out"}},{r2(t)});')
        tw.append(f'tl.fromTo("#{cid}hl",{{x:-60}},{{x:-1150,rotation:-6,duration:0.9,ease:"power3.inOut",immediateRender:false}},{r2(t + 0.4)});')
        tw.append(f'tl.fromTo("#{cid}hr",{{x:60}},{{x:1150,rotation:6,duration:0.9,ease:"power3.inOut",immediateRender:false}},{r2(t + 0.4)});')
        sel = f'#{cid}xx' + (f',#{cid}v' if clip else '')
        tw.append(f'tl.fromTo("{sel}",{{scale:1.14}},{{scale:1.0,duration:{r2(max(0.6, d))},ease:"sine.out"}},{r2(t)});')
        snd.append(('page', t + 0.05, 0.5))
    else:   # strips
        n_s, sw = 6, 1920 // 6
        sx = ''.join(f'<div class="rvk" id="{cid}k{i}" style="left:{i * sw}px;width:{sw}px;background-image:url({img});background-position:-{i * sw}px 0"></div>' for i in range(n_s))
        clips.append((f'{cid}g', 3, ground, 'div'))
        clips.append((f'{cid}p', 5, f'<div class="rv" id="{cid}kk">{sx}</div>', 'div'))
        for i in range(n_s):
            tw.append(f'tl.fromTo("#{cid}k{i}",{{y:{1150 if i % 2 else -1150}}},{{y:0,duration:0.8,ease:"power3.out"}},{r2(t + i * 0.08)});')
        tw.append(f'tl.fromTo("#{cid}kk",{{scale:1}},{{scale:1.07,duration:{r2(max(0.4, d - 0.9))},ease:"sine.inOut",immediateRender:false}},{r2(t + 0.9)});')
        snd.append(('swish', t, 0.35))

    if lines and style in ('tear', 'strips', 'frame'):   # over a full-frame picture the words sit on a paper label
        at = t + (2.3 if style == 'frame' else 1.3)
        if at < end - 0.8:
            size = _size(lines, 900, 64)
            clips.append((f'{cid}w', 8, f'<div class="rvl" id="{cid}ll" style="left:84px;bottom:150px;font-size:{size}px;transform:rotate(-1.5deg)">{_stamp(cid, lines, us)}</div>', 'div'))
            tw.append(f'tl.fromTo("#{cid}ll",{{scaleX:0}},{{scaleX:1,duration:0.4,ease:"steps(4)"}},{r2(at)});')
            for i in range(len(lines)):
                tw.append(f'tl.fromTo("#{cid}w{i}",{{opacity:0}},{{opacity:1,duration:0.2,ease:"steps(2)"}},{r2(at + 0.12 + i * 0.26)});')
                snd.append(('stamp', at + 0.12 + i * 0.26, 0.35))
    elif lines and style == 'print':
        at = t + 0.9
        for i in range(len(lines)):
            tw.append(f'tl.fromTo("#{cid}w{i}",{{scale:1.45,opacity:0}},{{scale:1,opacity:1,duration:0.28,ease:"steps(3)"}},{r2(at + i * 0.38)});')
            snd.append(('stamp', at + i * 0.38, 0.4))
    return clips, tw, snd
