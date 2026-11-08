"""One cartoon Short → one HyperFrames project (index.html, 1080×1920): a 2.5D multiplane camera, pose swaps hidden
inside a squash, a gag on its word, kinetic captions on the narrator's word times, a last frame that loops to the first.

Everything moves through ONE pure function of time, `draw(t)`, which the GSAP timeline calls on every seek, so a frame
is the same whether HyperFrames renders it first or fortieth (no random per frame, no state between frames).
"""
from __future__ import annotations

import html
import json
import math
import shutil
from pathlib import Path

from ..common import StageError, hex_rgb, is_banned_pixel
from . import rig

W, H = 1080, 1920
FONTS = Path(__file__).resolve().parents[4] / 'public' / 'fonts'
FACES = {'head': 'weekly-head-latin.woff2', 'caps': 'weekly-caps-latin.woff2', 'shout': 'knewave-latin-400-normal.woff2'}


def _ok(hexcol: str, bans: list[str]) -> bool:
    return not is_banned_pixel(hex_rgb(hexcol), list(bans))


def palette(primary: str, on_primary: str, bans: list[str]) -> dict:
    """The set's colours: the club's own for the scarf and the crowd, and a green pitch only where green is not the
    rival's colour (an Olympiacos Short gets a dusk-sand pitch, never green — rule 95)."""
    pick = lambda *cs: next((c for c in cs if _ok(c, bans)), '#C9C0AE')  # noqa: E731
    return {'scarf': (primary, on_primary if _ok(on_primary, bans) else rig.WHITE),
            'crowd': (primary, pick('#2B2A28', '#3A3631')),
            'pitch': pick('#7DB36A', '#C9B48A'), 'pitch2': pick('#74AA61', '#BFA97E'),
            'sky': '#F2EBDD', 'sky2': '#E6DCC8', 'accent': primary, 'bottle': pick('#7FB8C9', '#B9B2A4'),
            'trophy': pick('#C9A227', '#B8B2A6'), 'stamp': pick('#C8102E', '#15130F')}


def _prop_svg(kind: str, pal: dict, ctx: dict) -> tuple[str, int, int]:
    if kind == 'bottle':
        return rig.bottle(pal['bottle']) + f'<g class="pf">{rig.prop_face(120, 168, 0.8, "shock")}</g>', 240, 240
    if kind == 'trophy':
        return rig.trophy(pal['trophy']) + f'<g class="pf">{rig.prop_face(120, 86, 0.75, "smile")}</g>', 240, 240
    if kind == 'whistle':
        return rig.whistle(), 240, 240
    if kind == 'newspaper':
        return rig.newspaper(ctx.get('masthead') or ''), 240, 240
    if kind == 'phone':
        return rig.phone() + f'<g class="pf">{rig.prop_face(120, 108, 0.7, "shock")}</g>', 240, 240
    if kind == 'money':
        return rig.money(), 240, 240
    if kind == 'red_card':
        return rig.red_card(), 240, 240
    if kind == 'clock':
        return rig.clock() + f'<g class="pf">{rig.prop_face(120, 150, 0.6, "shock")}</g>', 240, 240
    if kind in ('ball', 'ball_goal'):
        return rig.ball() + f'<g class="pf">{rig.prop_face(120, 120, 0.8, "smile")}</g>', 240, 240
    if kind == 'scoreboard':
        return (rig.scoreboard(pal['accent'])
                + '<text class="sba" x="105" y="168" text-anchor="middle" font-family="hf-head0,sans-serif" font-size="120" fill="#FFFBF2">0</text>'
                + '<text class="sbb" x="295" y="168" text-anchor="middle" font-family="hf-head0,sans-serif" font-size="120" fill="#FFFBF2">0</text>'), 400, 300
    return '', 0, 0


def neutralize(page: str, bans: list[str]) -> str:
    """Any drawn colour in a rival's family becomes a warm grey of the same lightness (a red card on a Panathinaikos
    Short, green money on an Olympiacos one) — the club's own colours are never touched, they are not banned for it."""
    import re

    def fix(m):
        c = m.group(0)
        r, g, b = hex_rgb(c)
        if not is_banned_pixel((r, g, b), list(bans)):
            return c
        y = int(0.3 * r + 0.59 * g + 0.11 * b)
        return '#{:02X}{:02X}{:02X}'.format(min(255, y + 8), y, max(0, y - 6))
    page = re.sub(r'#[0-9a-fA-F]{6}\b', fix, page)
    return page


def _caption_chunks(words: list[dict], lead: float) -> list[dict]:
    """Two or three words a line, broken at punctuation; each word keeps its own time."""
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        end = w['w'][-1:] in '.,?!;:—'
        if end or len(cur) >= 3 or sum(len(x['w']) for x in cur) > 16:
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    out = []
    for c in chunks:
        out.append({'t0': round(c[0]['start'] + lead, 3), 't1': round(c[-1]['end'] + lead, 3),
                    'w': [{'w': x['w'], 't': round(x['start'] + lead, 3),
                           'key': any(ch.isdigit() for ch in x['w']) or (x['w'][:1].isupper() and len(x['w']) > 3)} for x in c]})
    if out:
        out[0]['t0'] = 0.0  # frame 0 already reads the premise
    return out


CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:#F2EBDD}
#root{position:absolute;inset:0;overflow:hidden}
.layer{position:absolute;left:0;top:0;width:1080px;height:1920px;transform-origin:0 0}
.w{position:absolute;left:0;top:0;transform-origin:0 0}
.pose{position:absolute;left:0;top:0;display:none}
#sky{position:absolute;inset:0;background:radial-gradient(circle at 50% 30%,var(--sky) 0%,var(--sky2) 70%)}
#dots{position:absolute;inset:0;opacity:.18;background-image:radial-gradient(#15130F 1.4px,transparent 1.6px);background-size:22px 22px}
#cap{position:absolute;left:50px;right:50px;top:380px;height:300px;display:flex;align-items:center;justify-content:center;text-align:center}
.line{position:absolute;left:0;right:0;font-family:hf-head0,sans-serif;font-size:104px;line-height:1.02;color:#FFFBF2;
 -webkit-text-stroke:14px #15130F;paint-order:stroke fill;letter-spacing:1px;text-transform:uppercase;opacity:0}
.line span{display:inline-block;margin:0 .14em;transform-origin:50% 80%}
.line span.key{color:var(--accent)}
#tag{position:absolute;left:56px;top:250px;font-family:hf-caps0,sans-serif;font-size:30px;letter-spacing:4px;color:#15130F;
 background:#FFFBF2;border:5px solid #15130F;padding:8px 16px 6px;box-shadow:7px 7px 0 #15130F;transform:rotate(-2deg)}
#flash{position:absolute;inset:0;background:#FFFBF2;opacity:0}
.fx{position:absolute;left:0;top:0;transform-origin:50% 50%;opacity:0}
"""

RUNTIME = r"""
const E=(t,a,b)=>Math.min(1,Math.max(0,(t-a)/(b-a)));
const ease=(u)=>u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;
const outBack=(u)=>{const c=1.9;return 1+(c+1)*Math.pow(u-1,3)+c*Math.pow(u-1,2)};
const spring=(dt,f=9,d=7)=>dt<0?0:Math.exp(-d*dt)*Math.cos(f*dt);
const lerp=(a,b,u)=>a+(b-a)*u;
function cam(t){
  let k=C[0];for(let i=0;i<C.length-1;i++){ if(t>=C[i].t&&t<=C[i+1].t){const u=ease(E(t,C[i].t,C[i+1].t));
    return {x:lerp(C[i].x,C[i+1].x,u),y:lerp(C[i].y,C[i+1].y,u),z:Math.exp(lerp(Math.log(1100-C[i].z),Math.log(1100-C[i+1].z),u))};}
    if(t>C[i+1].t)k=C[i+1];}
  return {x:k.x,y:k.y,z:1100-k.z};
}
function shake(t){let a=0;for(const s of SH){const dt=t-s.t;if(dt>=0&&dt<0.6)a+=s.a*Math.exp(-dt*7);}
  return {x:a*Math.sin(t*13.3*6.283)+a*.4*Math.sin(t*7.1*6.283),y:a*.7*Math.sin(t*11.2*6.283+1)};}
function place(el,zDepth,c,s){const d=zDepth-(1100-c.z)+100;const k=1000/Math.max(250,d);
  el.style.transform=`translate(${540+s.x}px,${960+s.y}px) scale(${k}) translate(${-c.x}px,${-c.y}px)`;}
function draw(t){
  const c=cam(t),s=shake(t);
  for(const L of LAYERS){place(document.getElementById(L.id),L.z,c,s);}
  // the character: which drawing, the squash that hides the swap, breathing, a small bounce on the key word
  let cur=0;for(let i=0;i<B.length;i++){if(t>=B[i].t0-0.06)cur=i;}
  const sw=B[cur].t0-0.06,dt=t-sw;
  document.querySelectorAll('.pose').forEach((g,i)=>{g.style.display=(i===cur)?'block':'none';});
  let sx=1,sy=1;
  if(dt>-0.08&&dt<0){const u=1-Math.abs(dt)/0.08;sx=1-0.16*u;sy=1+0.05*u;}
  sy*=1+0.04*spring(dt,16,6)+0.009*Math.sin(t*0.6*6.283);
  sx*=1-0.02*spring(dt,16,6);
  const ch=document.getElementById('ch');
  ch.style.transform=`translate(${CH.x}px,${CH.y}px) scale(${sx},${sy}) translate(-200px,-630px)`;
  // gags
  for(const g of G){const el=document.getElementById(g.id);if(!el)continue;const r=gag(g,t);
    el.style.opacity=r.o;el.style.transform=`translate(${r.x}px,${r.y}px) rotate(${r.r||0}deg) scale(${r.sx??r.s??1},${r.sy??r.s??1})`;
    if(g.kind==='scoreboard'){const v=t>=g.hit?g.score:[0,0];el.querySelector('.sba').textContent=v[0];el.querySelector('.sbb').textContent=v[1];}
    const pf=el.querySelector('.pf');if(pf){const u=outBack(E(t,g.hit-0.05,g.hit+0.25));const blink=(Math.floor((t-g.hit)*2.3)%5===0&&t>g.hit+0.6)?0.15:1;
      pf.style.transformOrigin='120px 120px';pf.style.transform=`scale(${Math.max(0,u)},${Math.max(0,u)*blink})`;}
    if(g.kind==='clock'){const a=(t-g.t0)*720;el.querySelector('.hand-m').style.transform=`rotate(${a}deg)`;el.querySelector('.hand-m').style.transformOrigin='120px 120px';}
  }
  // captions
  document.querySelectorAll('.line').forEach((ln,i)=>{const q=Q[i];const until=i+1<Q.length?Q[i+1].t0:q.t1+0.35;const on=t>=q.t0&&t<until&&t<D-0.45;ln.style.opacity=on?1:0;
    if(!on)return;ln.querySelectorAll('span').forEach((sp,j)=>{const u=E(t,q.w[j].t-0.02,q.w[j].t+0.16);const k=i===0&&t<0.4?1:outBack(u);
      sp.style.opacity=(i===0&&t<0.4)?1:Math.min(1,u*3);sp.style.transform=`scale(${0.55+0.45*k}) translateY(${(1-u)*30}px)`;});});
  let f=0;for(const x of FL){const d2=t-x;if(d2>=0&&d2<0.18)f=Math.max(f,0.6*(1-d2/0.18));}
  document.getElementById('flash').style.opacity=f;
}
function gag(g,t){
  const appear=g.t0<0.3?1:outBack(E(t,g.t0-0.1,g.t0+0.25)),gone=t>g.t1+0.35?Math.max(0,1-(t-g.t1-0.35)/0.15):1;
  const o=Math.min(1,appear*1.4)*gone,bx=g.x,by=g.y;
  if(o<=0)return {o:0,x:bx,y:by};
  const h=g.hit,dh=t-h;
  switch(g.kind){
    case 'bottle':{ if(g.falls&&dh>0){const T=0.55;const u=Math.min(dh,T);const y=by+0.5*3800*u*u;const r=dh*540;
        return {o:dh>T+0.12?0:o,x:bx+60*u,y:Math.min(y,by+520),r};}
      return {o,x:bx,y:by+Math.sin(t*9)*4*(t>h?1:0),r:(t>h?Math.sin(t*14)*6:0),s:appear};}
    case 'stamp':{const u=E(t,h-0.12,h);return {o:t>=h-0.12?gone:0,x:bx,y:by,r:-8,s:lerp(3.2,1,ease(u))};}
    case 'newspaper':{const u=E(t,h-0.35,h+0.1);return {o:t>=h-0.35?gone:0,x:bx,y:by,r:(1-ease(u))*720,s:ease(u)*1.1};}
    case 'scoreboard':{const u=E(t,g.t0-0.1,g.t0+0.45);return {o,x:bx,y:lerp(-500,by,outBack(u))};}
    case 'trophy':{const u=E(t,g.t0,g.t0+0.6);return {o,x:bx,y:lerp(by+300,by,outBack(u))+Math.sin(t*3)*6,r:Math.sin(t*2.4)*4};}
    case 'whistle':{return {o,x:bx+(dh>0&&dh<0.8?Math.sin(t*60)*8:0),y:by,r:dh>0&&dh<0.8?Math.sin(t*40)*10:0,s:appear};}
    case 'phone':{return {o,x:bx+(dh>0?Math.sin(t*55)*7:0),y:by,r:dh>0?Math.sin(t*35)*8:0,s:appear};}
    case 'red_card':{const u=E(t,h-0.15,h+0.2);return {o:t>=h-0.15?gone:0,x:bx,y:by,sx:Math.cos((1-u)*Math.PI),sy:1,r:-6};}
    case 'money':{const u=E(t,g.t0,g.t1);return {o,x:bx+Math.sin(t*3+g.seed)*60,y:lerp(-260,by+260,u),r:Math.sin(t*4+g.seed)*30};}
    case 'bars':{const u=E(t,h-0.1,h+0.15);return {o:t>=h-0.1?gone:0,x:0,y:lerp(-1700,0,outBack(u))};}
    case 'clock':{return {o,x:bx,y:by,s:appear};}
    case 'ball':{const b=Math.abs(Math.sin((t-g.t0)*5));return {o,x:bx,y:by-b*140,r:(t-g.t0)*300,sy:1-0.12*(1-b),sx:1+0.08*(1-b)};}
    case 'ball_goal':{const T=0.7;if(dh<0)return {o,x:bx,y:by,r:0};const u=Math.min(dh,T)/T;
      const x=lerp(bx,g.tx,u),yb=lerp(by,g.ty,u)-Math.sin(u*Math.PI)*420;return {o:dh>T+0.5?0:o,x,y:yb,r:dh*900,s:lerp(1,0.55,u)};}
    case 'goalframe':{return {o:Math.min(1,E(t,g.t0-0.3,g.t0))*gone,x:bx,y:by,sx:1+(t>g.hit&&t<g.hit+0.4?0.04*spring(t-g.hit,30,8):0)};}
    case 'burst':{const u=E(t,h,h+0.2);return {o:t>=h&&t<h+0.9?1:0,x:bx,y:by,s:outBack(u),r:-6};}
    case 'stars':{const u=E(t,h,h+0.25);return {o:t>=h&&t<h+0.9?1:0,x:bx,y:by-u*60,s:outBack(u),r:(t-h)*90};}
    case 'sweat':{const u=E(t,g.t0+0.1,g.t1);return {o:t>=g.t0+0.1&&t<g.t1?1:0,x:bx+u*30,y:by+u*160,s:1};}
    case 'question':{const u=E(t,g.t0,g.t0+0.3);return {o,x:bx,y:by-Math.sin(t*4)*10,s:outBack(u),r:Math.sin(t*3)*8};}
  }
  return {o,x:bx,y:by};
}
"""


def compose(root: Path, beats: list[dict], words: list[dict], duration: float, pal: dict, *, tag: str, bans: list[str],
            masthead: str = '', fps: int = 30, gsap: Path | None = None, lead: float = 0.1) -> tuple[Path, list[tuple[float, str]]]:
    """Writes root/index.html; returns it and the sound cues [(t, fx kind)] for the mix."""
    if not beats:
        raise StageError('CARTOON_EMPTY', 'a cartoon Short needs at least one beat')
    root.mkdir(parents=True, exist_ok=True)
    (root / 'assets').mkdir(exist_ok=True)
    fonts = ''
    for name, fn in FACES.items():
        p = FONTS / fn
        if p.exists():
            shutil.copyfile(p, root / 'assets' / fn)
            fonts += f"@font-face{{font-family:'hf-{name}0';src:url('assets/{fn}') format('woff2');font-display:block}}\n"
    from ..hyperframes.build import gsap_file
    shutil.copyfile(gsap or gsap_file(), root / 'assets' / 'gsap.min.js')

    # world: character feet at (540, 1520) on the mid layer; props near his hand or centre stage
    CH = {'x': 540, 'y': 1500}
    poses = []
    for b in beats:
        poses.append(f'<svg class="pose" width="400" height="660" viewBox="0 0 400 660" overflow="visible">'
                     f'{rig.character(b["pose"], b["expr"], pal["scarf"])}</svg>')
    gags, cues, shakes, flashes = [], [], [], []
    for b in beats:
        g = b.get('gag')
        hx, hy = rig.hand_of(b['pose'], 1)
        hand = (CH['x'] - 200 + hx, CH['y'] - 630 + hy)
        if g:
            svg, w, h = _prop_svg(g, pal, {'masthead': masthead})
            entry = {'id': f'g{b["i"]}', 'kind': g, 't0': b['t0'], 't1': b['t1'], 'hit': b['hit'], 'seed': b['i'] * 1.7}
            if g in ('bottle', 'trophy', 'phone', 'whistle', 'money', 'red_card', 'clock', 'ball', 'newspaper') and b['pose'] in ('hold', 'point', 'cheer', 'shrug', 'scared'):
                entry.update(x=hand[0] - w / 2, y=hand[1] - h * 0.7)
            else:
                entry.update(x=540 - w / 2, y=520)
            if g == 'scoreboard':
                entry.update(x=540 - 200, y=430, score=list(b['score'] or (0, 0)))
                cues.append((b['t0'], 'whoosh'))
                cues.append((b['hit'], 'tick'))
            if g == 'bottle':
                entry['falls'] = bool(__import__('re').search(r'\b(drop|dropp|fell|fall|slip|broke|smash|shatter)', b['say'] + ' ' + b['show'], __import__('re').I))
                if entry['falls']:
                    cues.append((b['hit'] + 0.55, 'glass'))
                    shakes.append({'t': b['hit'] + 0.55, 'a': 18})
                    gags.append({'id': f's{b["i"]}', 'kind': 'stars', 'svg': rig.stars(), 'w': 240, 'h': 240, 't0': b['t0'], 't1': b['t1'],
                                 'hit': b['hit'] + 0.55, 'x': entry['x'] + 40, 'y': min(entry['y'] + 520, 1450)})
            if g == 'stamp':
                txt = 'CLASSIFIED' if 'classified' in (b['say'] + b['show']).lower() or 'file' in b['say'].lower() else 'CONFIRMED'
                svg, w, h = rig.stamp(txt, pal['stamp']), 34 * len(txt) + 30, 140
                entry.update(x=540 - w / 2, y=640)
                cues.append((b['hit'], 'stamp'))
                shakes.append({'t': b['hit'], 'a': 14})
            if g == 'whistle':
                cues.append((b['hit'], 'whistle'))
            if g == 'newspaper':
                cues.append((b['hit'] - 0.3, 'paper'))
                entry.update(x=540 - 120, y=560)
            if g == 'bars':
                svg, w, h = rig.bars(), 1080, 1500
                entry.update(x=0, y=0)
                cues.append((b['hit'], 'stamp'))
                shakes.append({'t': b['hit'], 'a': 22})
            if g == 'ball_goal':
                gl = {'id': f'n{b["i"]}', 'kind': 'goalframe', 'svg': rig.goal(), 'w': 640, 'h': 360, 't0': b['t0'], 't1': b['t1'],
                      'hit': b['hit'] + 0.7, 'x': 400, 'y': 700}
                gags.append(gl)
                entry.update(x=CH['x'] + 80, y=CH['y'] - 140, tx=640, ty=820)
                cues.append((b['hit'], 'whoosh'))
                cues.append((b['hit'] + 0.7, 'drum'))
                flashes.append(b['hit'] + 0.7)
                gags.append({'id': f'b{b["i"]}', 'kind': 'burst', 'svg': rig.burst('GOAL', pal['accent'] if _ok(pal['accent'], bans) else '#FFFBF2'),
                             'w': 400, 'h': 300, 't0': b['t0'], 't1': b['t1'], 'hit': b['hit'] + 0.75, 'x': 340, 'y': 380})
            if g in ('trophy', 'phone', 'money', 'clock', 'red_card', 'ball', 'bottle') and g != 'bottle':
                cues.append((b['hit'], 'pop'))
            if g == 'bottle' and not entry.get('falls'):
                cues.append((b['hit'], 'pop'))
            entry.update(svg=svg, w=w, h=h)
            gags.insert(0 if g == 'bars' else len(gags), entry)
        elif b['pose'] == 'scared':
            gags.append({'id': f'w{b["i"]}', 'kind': 'sweat', 'svg': rig.sweat(), 'w': 70, 'h': 90, 't0': b['t0'], 't1': b['t1'], 'hit': b['t0'],
                         'x': CH['x'] + 70, 'y': CH['y'] - 600})
        elif b['pose'] in ('shrug', 'think'):
            gags.append({'id': f'q{b["i"]}', 'kind': 'question', 'svg': rig.question(), 'w': 120, 'h': 160, 't0': b['t0'], 't1': b['t1'], 'hit': b['t0'],
                         'x': CH['x'] + 130, 'y': CH['y'] - 720})
            cues.append((b['t0'], 'pop'))
        elif b['pose'] == 'cheer':
            gags.append({'id': f's{b["i"]}', 'kind': 'stars', 'svg': rig.stars(), 'w': 240, 'h': 240, 't0': b['t0'], 't1': b['t1'],
                         'hit': b['t0'] + 0.1, 'x': CH['x'] - 300, 'y': CH['y'] - 760})
            cues.append((b['t0'] + 0.1, 'sting'))
    # camera: frame 0 close on the premise, a reveal on beat 2, close on each gag, back to frame 0 for the loop
    C = [{'t': 0.0, 'x': 540, 'y': 1120, 'z': 470}]
    for b in beats[1:]:
        tgt = next((g for g in gags if g['id'] == f'g{b["i"]}'), None)
        if tgt is not None and tgt['kind'] not in ('bars', 'money'):
            C.append({'t': b['t0'], 'x': (tgt['x'] + tgt['w'] / 2 + 540) / 2, 'y': min(1250, (tgt['y'] + tgt['h'] / 2 + 1150) / 2), 'z': 380})
        else:
            C.append({'t': b['t0'], 'x': 540 + (-50 if b['i'] % 2 else 50), 'y': 1080, 'z': 240 if b['i'] % 2 else 330})
    C.append({'t': max(C[-1]['t'] + 0.5, duration - 0.45), 'x': 540, 'y': 1120, 'z': 470})
    C.append({'t': duration, 'x': 540, 'y': 1120, 'z': 470})
    C.sort(key=lambda c: c['t'])
    Q = _caption_chunks(words, lead)

    def gdiv(g):
        return (f'<div class="fx" id="{g["id"]}" style="width:{g["w"]}px;height:{g["h"]}px">'
                f'<svg width="{g["w"]}" height="{g["h"]}" viewBox="0 0 {g["w"]} {g["h"]}" overflow="visible">{g["svg"]}</svg></div>')
    def span(w):
        cls = ' class="key"' if w['key'] else ''
        return f'<span{cls}>{html.escape(w["w"])}</span>'
    lines = ''.join('<div class="line">' + ''.join(span(w) for w in q['w']) + '</div>' for q in Q)
    LAYERS = [{'id': 'far', 'z': 3000}, {'id': 'mid', 'z': 1800}, {'id': 'near', 'z': 1000}]
    crowd = rig.stand(*pal['crowd'])
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=1080, height=1920">
<script src="assets/gsap.min.js"></script>
<style>{fonts}:root{{--sky:{pal['sky']};--sky2:{pal['sky2']};--accent:{pal['accent']}}}{CSS}</style></head>
<body><div id="root" data-composition-id="main" data-start="0" data-duration="{duration:.3f}" data-width="{W}" data-height="{H}" data-fps="{fps}">
<div id="sky"></div><div id="dots"></div>
<div class="layer" id="far"><div class="w" style="left:-1100px;top:-200px;transform:scale(2.4)"><svg width="1080" height="760" viewBox="0 0 1080 760" overflow="visible">{crowd}</svg></div></div>
<div class="layer" id="mid"><div class="w" style="left:-1500px;top:1180px;transform:scale(2.2)"><svg width="1080" height="900" viewBox="0 0 1080 900" overflow="visible">{rig.pitch().replace('#7DB36A', pal['pitch']).replace('#74AA61', pal['pitch2'])}</svg></div></div>
<div class="layer" id="near">
<div class="w" style="left:{CH['x'] - 150}px;top:{CH['y'] - 22}px"><svg width="300" height="44"><ellipse cx="150" cy="22" rx="140" ry="18" fill="rgba(72,54,42,0.26)"/></svg></div>
<div class="w" id="ch">{''.join(poses)}</div>
{''.join(gdiv(g) for g in gags if g['kind'] != 'bars')}
</div>
{''.join(gdiv(g) for g in gags if g['kind'] == 'bars')}
<div id="tag">{html.escape(tag.upper())}</div>
<div id="cap">{lines}</div>
<div id="flash"></div>
</div>
<script>
const D={duration:.3f};
const LAYERS={json.dumps(LAYERS)};const C={json.dumps(C)};const SH={json.dumps(shakes)};const FL={json.dumps(flashes)};
const B={json.dumps([{k: b[k] for k in ('t0', 't1', 'pose')} for b in beats])};
const CH={json.dumps(CH)};
const G={json.dumps([{k: v for k, v in g.items() if k != 'svg'} for g in gags])};
const Q={json.dumps(Q)};
{RUNTIME}
const clock={{t:0}};
const tl=gsap.timeline({{paused:true}});
tl.to(clock,{{t:D,duration:D,ease:'none',onUpdate:()=>draw(clock.t)}},0);
window.__timelines=window.__timelines||{{}};
window.__timelines["main"]=tl;
tl.seek(0);draw(0);
</script></body></html>
"""
    from ..hyperframes.build import check_colours
    page = neutralize(page, bans)
    check_colours(page, bans)
    (root / 'index.html').write_text(page, encoding='utf-8')
    (root / 'hyperframes.json').write_text(json.dumps({'name': 'cartoon-short', 'width': W, 'height': H, 'fps': fps}, indent=1) + '\n')
    return root / 'index.html', sorted(cues)
