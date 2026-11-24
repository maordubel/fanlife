"""LIFE IN THE FRAME — things that move INSIDE the picture, not only the camera over it (owner, 23.11.2026, after the
story-first sample: "still boring … the backgrounds are not good enough … not enough movement for the eyes, not fun to
watch").

Measured on that sample: every shot moved (the camera glided over every still, 99% of the film), and nothing in any
shot did. A glide over a still is still a still. This module is the layer between the picture and the graphics where
the scene itself is alive, drawn in code in the film's own inks (the club's colour, paper, ink — never a rival's
colour: rule 95), one seeded function of time (HyperFrames seeks any frame):

  crowd     the library's own painted crowd rows as the nearest planes: a far row and a near one, each on its own rhythm —
            bouncing on joy, swaying when calm — drifting against each other
  flags     the row with the flags, rocking, behind them
  confetti  torn paper falling and turning, a burst on the release and a drift after it
  beams     floodlight beams that sweep slowly across the night
  glow      flare light from below in the club's colour, breathing
  dust      motes in the light and a slow light leak — the quiet life of a calm shot
  ball      the ball crossing the frame on an arc, spinning, when the line is about a goal

`direct()` is the life director: what each beat gets, from its emotion on the score sheet (studio/drama.py), what it
is and what its line says. Never the same set three beats running; nothing over a full-frame board, a map or the
closing cards. Everything eases in over 0.8 s and out over 0.6 s; nothing pops, shakes or flashes (rule 142).
`STORIES_LIFE=0` turns the layer off.
"""
from __future__ import annotations

import hashlib
import math
import os
import random
import re

W, H = 1920, 1080
ROW_H = {'far': 230, 'near': 310}   # the crowd is a band at the foot of the frame: under a third of it, always
FADE_IN, FADE_OUT = 0.8, 0.6
BOARDS = {'press', 'gazette', 'atlas', 'table', 'form', 'ledger', 'end', 'follow', 'cities', 'chalk', 'flap', 'replay', 'verdict', 'rule', 'question', 'lead', 'stat', 'tally'}
GOAL_TALK = re.compile(r'\b(scored|scores|goal|goals|header|headed|finish|finished|net|struck|shot|winner|equalis\w+|penalt\w+)\b', re.I)
CSS = ('.lf{position:absolute;left:0;top:0;width:1920px;height:1080px;pointer-events:none;overflow:hidden}'
       '.lfc{position:absolute;max-width:none;will-change:transform}'
       '.lfp{position:absolute;top:-60px;will-change:transform}'
       '.lfb{position:absolute;top:-260px;width:520px;height:1700px;transform-origin:50% 0;mix-blend-mode:screen;will-change:transform;'
       'background:linear-gradient(to bottom,rgba(255,250,235,.42) 0%,rgba(255,250,235,.12) 55%,rgba(255,250,235,0) 100%);'
       'clip-path:polygon(42% 0,58% 0,100% 100%,0 100%)}'   # no mask: a masked gradient is how a still was once sliced into bands (test_camera)
       '.lfg{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:50% 100%;mix-blend-mode:screen}'
       '.lfd{position:absolute;border-radius:50%;background:rgba(255,250,235,.85);will-change:transform}'
       '.lfl{position:absolute;top:-200px;width:900px;height:1500px;mix-blend-mode:screen;will-change:transform}'
       '.lfball{position:absolute;width:150px;height:150px;will-change:transform;filter:drop-shadow(10px 14px 0 rgba(20,17,13,.4))}')


def rng_of(*k) -> random.Random:
    return random.Random(int(hashlib.sha256('|'.join(map(str, k)).encode()).hexdigest()[:10], 16))


def r2(x: float) -> float:
    return round(x + 1e-9, 2)


# ── the crowd: the library's own painted rows (cinema/flow_library: crowd-row-*), alive ──────────────────────────────
def crowd(cid: str, t: float, d: float, rg: random.Random, rows: dict, joy: float, flags: bool) -> tuple[str, list[str]]:
    """The owner's painted crowd rows as the nearest planes of the shot: a far row and a near row (and the row with the
    flags, when asked), each wider than the frame, each on its own rhythm — bouncing on joy, swaying when calm — and
    drifting against each other, so the stand has depth. `rows`: {'far'|'near'|'flags': {'src', 'w', 'h'}}."""
    html, tw = '', []
    order = [k for k in ('far', 'near') if rows.get(k)]   # the flags row is line art in another hand: not used until it is repainted
    for j, k in enumerate(order):
        r = rows[k]
        # a band at the foot of the frame, never more: the row keeps its own proportions at a fixed height and repeats
        # sideways (measured 23.11.2026: a short piece scaled to the frame's width covered the whole picture)
        h = ROW_H[k]
        tile = r['w'] * h / r['h']
        y = H - h * {'far': 1.28, 'near': 0.8}[k]
        rid = f'{cid}r{j}'
        html += (f'<div class="lfc" id="{rid}" style="left:-200px;top:{y:.0f}px;width:{W + 400}px;height:{h}px;'
                 f'background:url(assets/img/{r["src"]}) {-(j * tile * 0.37) % tile:.0f}px 0/{tile:.0f}px {h}px repeat-x"></div>')
        fast = joy >= 0.6
        per = rg.uniform(0.44, 0.56) if fast else rg.uniform(1.1, 1.6)
        amp = ({'far': 10, 'near': 18}[k] * (0.6 + joy)) if fast else {'far': 4, 'near': 8}[k]
        drift = (1 if j % 2 else -1) * rg.uniform(40, 90)
        tw.append(f'tl.fromTo("#{rid}",{{y:{r2(amp * 0.4)}}},{{y:{r2(-amp)},duration:{r2(per)},ease:"sine.inOut",repeat:{max(1, int(d / per))},yoyo:true,immediateRender:false}},{r2(t + rg.uniform(0, per * 0.5))});')
        tw.append(f'tl.fromTo("#{rid}",{{x:{r2(-drift)}}},{{x:{r2(drift)},duration:{r2(d)},ease:"sine.inOut",immediateRender:false}},{r2(t)});')
    return html, tw


def confetti(cid: str, t: float, d: float, rg: random.Random, ink: str, us: str, paper: str, n: int = 70) -> tuple[str, list[str]]:
    """Torn paper: every piece falls the whole frame at its own speed, drifts sideways, and turns on two axes."""
    html, tw = '', []
    cols = [us, paper, us, paper, ink]
    for i in range(n):
        pid = f'{cid}p{i}'
        w, h = rg.uniform(14, 34), rg.uniform(10, 26)
        x = rg.uniform(-40, W)
        html += f'<i class="lfp" id="{pid}" style="left:{x:.0f}px;width:{w:.0f}px;height:{h:.0f}px;background:{cols[i % len(cols)]}"></i>'
        fall = rg.uniform(2.6, 5.2)
        start = t + rg.uniform(0, min(2.2, d * 0.4)) - (rg.uniform(0, fall * 0.5) if i % 3 == 0 else 0)
        loops = max(1, math.ceil((t + d - start) / fall))
        tw.append(f'tl.fromTo("#{pid}",{{y:-80,x:0,rotation:{rg.randrange(360)}}},{{y:{H + 140},x:{r2(rg.uniform(-220, 220))},rotation:{rg.randrange(-540, 540)},'
                  f'duration:{r2(fall)},ease:"none",repeat:{loops - 1},immediateRender:false}},{r2(max(0.0, start))});')
        # the turn is a flat flip (scaleY through zero), not a 3D rotation: a 3D transform drops the renderer's motion blur to its slow tier
        flip = rg.uniform(0.35, 0.7)
        tw.append(f'tl.fromTo("#{pid}",{{scaleY:1}},{{scaleY:-1,duration:{r2(flip)},ease:"sine.inOut",repeat:{max(1, int((t + d - max(0.0, start)) / flip))},yoyo:true,immediateRender:false}},{r2(max(0.0, start))});')
    return html, tw


def beams(cid: str, t: float, d: float, rg: random.Random, n: int = 3) -> tuple[str, list[str]]:
    html, tw = '', []
    for i, x in enumerate([180, 1500, 860][:n]):
        bid = f'{cid}b{i}'
        html += f'<i class="lfb" id="{bid}" style="left:{x - 260}px"></i>'
        a0 = rg.uniform(-26, -10) if i % 2 == 0 else rg.uniform(10, 26)
        per = rg.uniform(3.2, 4.6)
        tw.append(f'tl.fromTo("#{bid}",{{rotation:{r2(a0)}}},{{rotation:{r2(-a0)},duration:{r2(per)},ease:"sine.inOut",repeat:{max(0, int(d / per))},yoyo:true,immediateRender:false}},{r2(t)});')
    return html, tw


def glow(cid: str, t: float, d: float, rg: random.Random, us: str) -> tuple[str, list[str]]:
    """Flare light from below, in the club's colour: it rises and breathes. A light, not a cloud — nothing to smear."""
    gid = f'{cid}g'
    html = f'<i class="lfg" id="{gid}" style="background:radial-gradient(ellipse 70% 62% at 50% 100%,{us}cc 0%,{us}55 38%,{us}00 74%)"></i>'
    per = rg.uniform(1.3, 1.9)
    tw = [f'tl.fromTo("#{gid}",{{opacity:0.25,scaleY:0.8}},{{opacity:0.62,scaleY:1.08,duration:{r2(per)},ease:"sine.inOut",repeat:{max(1, int(d / per))},yoyo:true,immediateRender:false}},{r2(t)});']
    return html, tw


def dust(cid: str, t: float, d: float, rg: random.Random, us: str, n: int = 26) -> tuple[str, list[str]]:
    html, tw = '', []
    lid = f'{cid}l'
    html += f'<i class="lfl" id="{lid}" style="left:-500px;background:radial-gradient(ellipse at center,rgba(255,244,214,.34),rgba(255,244,214,0) 70%)"></i>'
    tw.append(f'tl.fromTo("#{lid}",{{x:0,rotation:12}},{{x:{W + 600},rotation:20,duration:{r2(max(4.0, d))},ease:"sine.inOut",immediateRender:false}},{r2(t)});')
    for i in range(n):
        did = f'{cid}d{i}'
        s = rg.uniform(3, 9)
        html += f'<i class="lfd" id="{did}" style="left:{rg.uniform(0, W):.0f}px;top:{rg.uniform(60, H - 200):.0f}px;width:{s:.0f}px;height:{s:.0f}px;opacity:{rg.uniform(.25, .7):.2f}"></i>'
        tw.append(f'tl.fromTo("#{did}",{{x:0,y:0}},{{x:{r2(rg.uniform(-160, 160))},y:{r2(-rg.uniform(60, 260))},duration:{r2(max(3.0, d))},ease:"sine.inOut",immediateRender:false}},{r2(t)});')
    return html, tw


def ball(cid: str, t: float, d: float, rg: random.Random, src: str | None, ink: str, paper: str, at: float = 0.4) -> tuple[str, list[str]]:
    """The ball across the frame on an arc, spinning: in from one side, over the top of its flight, out or down."""
    bid = f'{cid}o'
    if src:
        inner = f'<img class="lfball" id="{bid}" src="assets/img/{src}">'
    else:
        inner = (f'<svg class="lfball" id="{bid}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="{paper}" stroke="{ink}" stroke-width="6"/>'
                 f'<path d="M50 28 L70 43 L62 66 L38 66 L30 43 Z" fill="{ink}"/><path d="M50 28 L50 6 M70 43 L92 36 M62 66 L76 86 M38 66 L24 86 M30 43 L8 36" stroke="{ink}" stroke-width="6"/></svg>')
    way = 1 if rg.random() < 0.5 else -1
    x0, x1 = (-200, W + 60) if way == 1 else (W + 60, -200)
    y0, top, y1 = rg.uniform(620, 800), rg.uniform(120, 260), rg.uniform(380, 560)
    dur = min(2.4, max(1.4, d - at - 0.2))
    tw = [f'tl.fromTo("#{bid}",{{x:{x0},rotation:0,opacity:1}},{{x:{x1},rotation:{720 * way},duration:{r2(dur)},ease:"none",immediateRender:false}},{r2(t + at)});',
          f'tl.fromTo("#{bid}",{{y:{r2(y0)},scale:0.7}},{{y:{r2(top)},scale:1.25,duration:{r2(dur * 0.5)},ease:"sine.out",immediateRender:false}},{r2(t + at)});',
          f'tl.to("#{bid}",{{y:{r2(y1)},scale:0.85,duration:{r2(dur * 0.5)},ease:"sine.in"}},{r2(t + at + dur * 0.5)});',
          f'tl.set("#{bid}",{{x:{x0},opacity:0}},{r2(max(0.0, t - 0.01))});']
    return inner, tw


# ── the life director ────────────────────────────────────────────────────────────────────────────────────────────────
RECIPES = {   # emotion → the sets he may choose between, strongest first
    'joy': (('confetti', 'crowd', 'flags'), ('crowd', 'flags', 'glow'), ('confetti', 'crowd')),
    'release': (('confetti', 'crowd', 'flags'), ('crowd', 'glow', 'flags')),
    'pride': (('flags', 'dust'), ('crowd', 'flags'), ('flags', 'beams')),
    'tension': (('beams', 'crowd'), ('beams', 'glow'), ('crowd', 'dust')),
    'dread': (('beams', 'dust'), ('glow', 'dust')),
    'defiance': (('glow', 'flags', 'crowd'), ('flags', 'beams')),
    'grief': (('dust',),),
    'wonder': (('dust', 'beams'), ('dust',)),
    'humour': (('dust', 'crowd'), ('dust',)),
}
DEFAULT = (('dust',), ('crowd', 'dust'), ('beams', 'dust'))


def direct(beats: list[dict], lines: dict[int, str] | None = None, seed: str = '') -> int:
    """In place: a `life` shot on every beat that is a scene (see the module doc). Returns how many beats got one."""
    if os.environ.get('STORIES_LIFE', '1') == '0':
        return 0
    last: list[tuple] = []
    n_set = crowd_run = 0
    for i, b in enumerate(beats):
        m = b.get('meta') or {}
        kinds = {x['kind'] for x in b['shots']}
        if kinds & BOARDS or not kinds & {'image', 'video', 'tint'} or b['d'] < 2.4:
            last.append(())
            crowd_run = 0
            continue
        if any(x['kind'] in ('image', 'video') and x.get('as') == 'print' and x.get('dt', 0) < 0.1 for x in b['shots']) and len(kinds) <= 2:
            pass   # a print on the desk still breathes: dust is right for it
        emo = m.get('emotion') or ''
        inten = float(m.get('intensity') or 0.5)
        opts = RECIPES.get(emo, DEFAULT)
        rg = rng_of(seed, m.get('n'), round(b['t'], 1))
        pick = opts[0] if inten >= 0.75 else opts[rg.randrange(len(opts))]
        if len(last) >= 2 and last[-1] == last[-2] == pick:   # never the same life three beats running
            pick = next((o for o in (*opts, *DEFAULT) if o != pick), pick)
        fx = list(pick)
        text = (lines or {}).get(m.get('n'), '')
        if GOAL_TALK.search(text) and emo in ('joy', 'release', 'tension', 'pride', '') and 'ball' not in fx and b['d'] >= 3.0 \
                and not kinds & {'pcard', 'kitdev', 'kinetic', 'explain', 'score', 'ticket', 'word'}:
            fx.append('ball')
        if 'crowd' in fx and (crowd_run >= 1 and emo not in ('joy', 'release')):
            fx = [f for f in fx if f not in ('crowd', 'flags')] or ['dust']   # never two crowd beats running, except in the joy itself
        if kinds & {'pcard', 'kitdev', 'objects', 'cutout'}:
            fx = [f for f in fx if f not in ('flags', 'crowd')] or ['dust']   # a prop owns the foreground: the life stays behind it
        if kinds & {'kinetic', 'explain', 'score', 'ticket', 'word', 'clockdev'}:
            fx = [f for f in fx if f not in ('flags', 'confetti')] or ['dust']   # type is read on a calm ground
        b['shots'].append({'kind': 'life', 'fx': fx, 'level': round(inten, 2), 'seed': f'{seed}|{m.get("n")}|{i}', 'dt': 0.0, 'd': round(b['d'], 3)})
        last.append(tuple(fx))
        crowd_run = crowd_run + 1 if 'crowd' in fx else 0
        n_set += 1
    return n_set
