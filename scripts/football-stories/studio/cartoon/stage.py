"""The illustrated Short: one owner-drawn scene behind every line, a camera that travels across it, the inked people
and objects of the library acting inside it, and transitions that cut on the narrator's words (owner, 8.11.2026 — the
reference he sent: a full-screen painted scene per sentence, the character in it, the camera always moving).

Shot i plays from just before its line's first word to just before the next line's. Inside a shot:
  * the PLATE (a 16:9 drawing shown 9:16) is a camera move — a pan across the drawing, a push in on the line's key
    word, or a pull back on the last line — with a hand-held breath, never still;
  * a FIGURE (an inked cut-out) springs up from the bottom of the frame, breathes, and hops on the key word; it moves
    a little against the plate, so the drawing has depth;
  * a CROWD ROW in front on stadium plates, bobbing, out of focus, moving fastest of all;
  * an OBJECT — the owner's inked prop, or one of the studio's drawn gags (the stamp, the scoreboard, the money);
  * the cut to the next shot is a whip pan (blur, both shots moving) or a punch-in with a flash on a hard turn.
Over everything: the narrator's words two or three at a time, film grain, a vignette. Everything is ONE pure function
of time, draw(t), so any frame renders the same whenever it is asked for (HyperFrames' contract).
"""
from __future__ import annotations

import html
import json
import math
import re
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

from ..common import StageError
from . import build, plates, rig

W, H, FPS = 1080, 1920, 30
HARD = {'scared', 'facepalm'}
HARD_GAGS = {'stamp', 'bars', 'red_card', 'scoreboard', 'ball_goal'}
PROP_H = {'football': 330, 'generic_trophy': 520, 'passenger_plane': 360, 'supporters_bus': 330, 'portable_radio': 380,
          'match_ticket': 300, 'supporter_scarf': 260, 'tactics_board': 520}
SVG_GAGS = {'bottle', 'whistle', 'newspaper', 'phone', 'money', 'red_card', 'clock', 'stamp', 'scoreboard', 'bars'}
SOUND_OF_PROP = {'football': 'ball-kick', 'generic_trophy': 'reveal', 'passenger_plane': 'car-pass', 'supporters_bus': 'bus-door',
                 'portable_radio': 'radio-tune', 'match_ticket': 'envelope-tear', 'supporter_scarf': 'spray', 'tactics_board': 'pickup'}
SOUND_OF_GAG = {'stamp': 'stamp', 'whistle': 'whistle-2', 'newspaper': 'page', 'phone': 'phone-text', 'money': 'coins',
                'clock': 'clock-tick', 'red_card': 'whistle-1', 'bars': 'clang', 'scoreboard': 'tick', 'bottle': 'pop'}


def _grain(dest: Path) -> str:
    rng = np.random.default_rng(5)
    a = (rng.normal(128, 46, (256, 256))).clip(0, 255).astype('uint8')
    Image.merge('LA', (Image.fromarray(a), Image.fromarray(np.full((256, 256), 70, 'uint8')))).save(dest / 'grain.png')
    return 'grain.png'


def _gag_runtime() -> str:
    """The studio's drawn gags keep their own motion (build.RUNTIME's gag())."""
    src = build.RUNTIME
    return src[src.index('function gag('):]


def interest(plate_path: Path) -> float:
    """Where across a wide drawing the eye goes (0 = left edge, 1 = right): the band, 30% of the width, with the
    most ink detail in it — so a 9:16 window shows the drawing's subject, not its empty paper."""
    im = Image.open(plate_path).convert('L').resize((240, 120))
    a = np.asarray(im, 'float32')
    gx = np.abs(np.diff(a, axis=1)).sum(axis=0)
    gy = np.abs(np.diff(a, axis=0)).sum(axis=0)[:-1]
    e = gx + gy
    w = int(len(e) * 0.30)
    win = np.convolve(e, np.ones(w), 'valid')
    centre = (int(np.argmax(win)) + w / 2) / len(e)
    return float(min(0.85, max(0.15, centre)))


def ambience_of(plate_key: str) -> str:
    """Which of the owner's room recordings plays under a plate (public/life/sfx)."""
    s = plate_key.split('/', 1)[-1]
    if plates.crowded(plate_key) or re.search(r'header|volley|corner|free-kick|kick-off|penalty|shootout|goal|celebrat', s):
        return 'crowd-real-murmur'
    if re.search(r'tunnel', s):
        return 'amb-tunnel'
    if re.search(r'train|bus|coach|ferry', s):
        return 'amb-bus'
    if re.search(r'airport|station|turnstile|ticket', s):
        return 'amb-station'
    if re.search(r'radio|commentator|tv-shop', s):
        return 'amb-radio'
    if re.search(r'street|city|programme|pub|bench|railing|cobbles|lamp', s):
        return 'amb-street-dusk'
    if re.search(r'training|youth|pitch|flag|rain|snow|old-ground|boots', s):
        return 'amb-park'
    return 'amb-room'


def plan_shots(beats: list[dict], duration: float, plate_keys: list[str], bans: list[str], salt: str) -> list[dict]:
    shots = []
    n = len(beats)
    for i, b in enumerate(beats):
        t0 = 0.0 if i == 0 else max(shots[-1]['t0'] + 0.6, b['t0'] - 0.12)
        hard = b['pose'] in HARD or b.get('gag') in HARD_GAGS
        if i == n - 1 and n > 2:
            move = 'pull'
        elif b.get('gag') or hard:
            move = 'push'
        else:
            move = 'pan'
        fig = plates.pick_figure(b, bans, f'{salt}:{i}')
        prop = plates.pick_prop(b)
        crowd = plates.pick_crowd(b, bans, f'{salt}:{i}') if plates.crowded(plate_keys[i]) and not fig else None
        shots.append({'i': i, 't0': round(t0, 3), 'hit': b['hit'], 'plate_key': plate_keys[i], 'move': move,
                      'dir': 1 if i % 2 == 0 else -1, 'trans': 'cut' if i == 0 else ('punch' if hard else 'whip'),
                      'fig_key': fig, 'prop': prop, 'crowd_key': crowd, 'gag': b.get('gag'), 'pose': b['pose'],
                      'side': ('L', 'R')[i % 2], 'amb': ambience_of(plate_keys[i])})
    for i, s in enumerate(shots):
        s['t1'] = shots[i + 1]['t0'] if i + 1 < len(shots) else duration
    return shots


CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:#15130F}
#root{position:absolute;inset:0;overflow:hidden;background:#15130F}
.shot{position:absolute;inset:0;overflow:hidden;display:none;transform-origin:540px 960px}
.pl{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
.pl img{display:block}
.fig{position:absolute;left:0;top:0;transform-origin:50% 100%;filter:drop-shadow(0 18px 22px rgba(10,8,6,.45))}
.crowd{position:absolute;left:0;top:0;filter:blur(2px) brightness(.62);transform-origin:50% 100%}
.prop{position:absolute;left:0;top:0;transform-origin:50% 50%;opacity:0;filter:drop-shadow(0 14px 18px rgba(10,8,6,.5))}
.fx{position:absolute;left:0;top:0;transform-origin:50% 50%;opacity:0;filter:drop-shadow(0 16px 18px rgba(10,8,6,.5)) contrast(1.05)}
.fx>svg{transform:scale(1.55);transform-origin:50% 50%;filter:url(#paper)}
.ring{position:absolute;border:8px solid #FFFBF2;border-radius:50%;opacity:0}
#topfade{position:absolute;left:0;right:0;top:0;height:760px;background:linear-gradient(to bottom,rgba(16,14,11,.72),rgba(16,14,11,.38) 55%,rgba(16,14,11,0))}
#vig{position:absolute;inset:0;background:radial-gradient(ellipse 75% 60% at 50% 52%,rgba(0,0,0,0) 58%,rgba(12,10,8,.62) 100%)}
#grain{position:absolute;inset:-4px;background-image:url(assets/grain.png);background-size:256px 256px;opacity:.13;mix-blend-mode:overlay}
#cap{position:absolute;left:60px;right:60px;top:300px;height:280px}
.line{position:absolute;left:0;right:0;top:0;text-align:center;font-family:hf-head0,sans-serif;font-size:84px;line-height:1.04;color:#FFFBF2;
 -webkit-text-stroke:12px #15130F;paint-order:stroke fill;letter-spacing:.5px;opacity:0}
.line span{display:inline-block;margin:0 .13em;transform-origin:50% 80%}
.line span.key{color:var(--accent)}
#tag{position:absolute;left:56px;top:196px;font-family:hf-caps0,sans-serif;font-size:27px;letter-spacing:4px;color:#15130F;
 background:#FFFBF2;padding:7px 14px 5px;transform:rotate(-2deg);box-shadow:6px 6px 0 #15130F}
#flash{position:absolute;inset:0;background:#FFFBF2;opacity:0}
"""

RUNTIME = r"""
const E=(t,a,b)=>Math.min(1,Math.max(0,(t-a)/(b-a)));
const ease=(u)=>u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;
const sine=(u)=>-(Math.cos(Math.PI*u)-1)/2;
const outBack=(u)=>{const c=1.7;return 1+(c+1)*Math.pow(u-1,3)+c*Math.pow(u-1,2)};
const outQuad=(u)=>1-(1-u)*(1-u);
const spring=(dt,f=9,d=7)=>dt<0?0:Math.exp(-d*dt)*Math.cos(f*dt);
const lerp=(a,b,u)=>a+(b-a)*u;
function camera(s,lt){
  const d=Math.max(0.6,s.t1-s.t0),u=sine(Math.min(1,lt/d));
  const fc=s.focus,sp=0.16;
  let z0=1.03,z1=1.08,f0=s.dir>0?fc-sp:fc+sp,f1=s.dir>0?fc+sp:fc-sp;
  if(s.move==='push'){z0=1.0;z1=1.16;f0=f1=s.focus;}
  if(s.move==='pull'){z0=1.2;z1=1.0;f0=f1=s.focus;}
  let z=lerp(z0,z1,u);
  if(s.move==='push'&&s.hit>s.t0){const k=E(s.t0+lt,s.hit-0.05,s.hit+0.35);z=lerp(z0,z1,0.35*u+0.65*ease(k));}
  const k=z*1920/s.ph,wd=s.pw*k,hd=s.ph*k;
  const room=Math.max(0,wd-1080),fr=(f)=>Math.min(1,Math.max(0,(f*wd-540)/Math.max(1,room))),px=fr(lerp(f0,f1,u))*room+Math.sin(lt*0.9+s.i)*5,py=(hd-1920)/2+Math.sin(lt*1.3+s.i*2)*4;
  return {k,px,py,pan:fr(lerp(f0,f1,u))*room};
}
function figure(el,s,lt,pan0,pan){
  if(!el)return;
  const enter=0.12,u=E(lt,enter,enter+0.42),up=outBack(u);
  const T=s.t0+lt,dh=T-s.hit,hop=dh>0&&dh<0.7?-60*Math.max(0,spring(dh,11,5)):0;
  const breathe=1+0.012*Math.sin(lt*2.2+s.i),sway=1.4*Math.sin(lt*1.1+s.i);
  const par=-(pan-pan0)*0.28;
  el.style.opacity=Math.min(1,u*3);
  el.style.transform=`translate(${s.fig.x+par}px,${s.fig.y+(1-up)*420+hop}px) rotate(${sway}deg) scale(${(0.86+0.14*up)*(s.fig.flip?-1:1)},${(0.86+0.14*up)*breathe})`;
}
function crowd(el,s,lt,pan0,pan){
  if(!el)return;
  const par=-(pan-pan0)*0.7,bob=Math.abs(Math.sin(lt*4.2+s.i))*16;
  el.style.transform=`translate(${s.crowd.x+par}px,${s.crowd.y-bob}px)`;
}
function prop(el,s,lt){
  if(!el)return;
  const p=s.prop,T=s.t0+lt,h=s.hit,dh=T-h,a=Math.max(0.05,Math.min(h-s.t0-0.15,0.6));
  const app=outBack(E(lt,a,a+0.38)),gone=T>s.t1-0.05?0:1;
  let o=Math.min(1,E(lt,a,a+0.15)*2)*gone,x=p.x,y=p.y,r=0,sc=app,sx=1;
  switch(p.name){
    case 'football':{ if(s.gag==='ball_goal'){const D=0.75;const u=E(T,h-0.05,h-0.05+D);x=lerp(p.x-260,p.x+260,u);y=lerp(p.y+520,p.y-260,u)-Math.sin(u*Math.PI)*260;r=u*900;sc=lerp(1.25,0.55,u);o=T>h-0.05?gone:0;}
      else {const b=Math.abs(Math.sin(lt*5.2));y=p.y-b*170;r=lt*260;sx=1+0.1*(1-b);} break;}
    case 'generic_trophy':{const u=E(lt,a,a+0.7);y=lerp(p.y+500,p.y,outBack(u))+Math.sin(lt*2.6)*8;r=Math.sin(lt*2)*3;sc=1;o=Math.min(1,u*3)*gone;break;}
    case 'passenger_plane':{const u=E(T,s.t0,s.t1);x=lerp(-900,1150,u);y=p.y-u*180+Math.sin(lt*3)*10;r=-7+Math.sin(lt*2)*2;sc=1;o=gone;break;}
    case 'supporters_bus':{const u=E(T,s.t0,s.t1);x=lerp(1150,-950,u);y=p.y+Math.abs(Math.sin(lt*16))*-5;sc=1;o=gone;break;}
    case 'portable_radio':{r=dh>0?Math.sin(lt*38)*2.5:0;break;}
    case 'match_ticket':{sx=Math.max(0.02,app);sc=1;r=-8+Math.sin(lt*1.8)*4;y=p.y+Math.sin(lt*2.4)*12;break;}
    case 'supporter_scarf':{x=lerp(-600,p.x,outQuad(E(lt,a,a+0.5)));r=Math.sin(lt*5)*5;sc=1;break;}
    default:{y=p.y+Math.sin(lt*2.2)*8;}
  }
  el.style.opacity=o;el.style.transform=`translate(${x}px,${y}px) rotate(${r}deg) scale(${sc*sx},${sc})`;
  if(p.name==='portable_radio'){document.querySelectorAll(`#s${s.i} .ring`).forEach((rg,j)=>{const q=((lt-a)*0.9+j/3)%1;
    rg.style.opacity=lt>a+0.2?(1-q)*0.8:0;const R=120+q*260;rg.style.width=rg.style.height=(2*R)+'px';
    rg.style.left=(p.x+p.w*0.5-R)+'px';rg.style.top=(p.y+p.h*0.4-R)+'px';});}
}
function draw(t){
  let cur=0;for(let i=0;i<S.length;i++){if(t>=S[i].t0)cur=i;}
  const loop=t>=D-LOOP;
  let a=loop?0:cur,lt=loop?0:t-S[a].t0,prev=loop?S.length-1:cur-1,tr=loop?'whip':S[cur].trans,ut=loop?(t-(D-LOOP))/LOOP:lt/(tr==='whip'?0.3:0.2);
  document.querySelectorAll('.shot').forEach((el,i)=>{el.style.display=(i===a||(i===prev&&ut<1&&tr==='whip'))?'block':'none';el.style.filter='';el.style.transform='';});
  const draw1=(s,lt2)=>{const c=camera(s,lt2),c0=camera(s,0);const el=document.getElementById('s'+s.i);
    el.querySelector('.pl').style.transform=`translate(${-c.px}px,${-c.py}px) scale(${c.k})`;
    figure(el.querySelector('.fig'),s,lt2,c0.pan,c.pan);crowd(el.querySelector('.crowd'),s,lt2,c0.pan,c.pan);prop(el.querySelector('.prop'),s,lt2);
    for(const g of G){if(g.shot!==s.i)continue;const ge=document.getElementById(g.id);if(!ge)continue;const r=gag(g,s.t0+lt2);
      ge.style.opacity=r.o;ge.style.transform=`translate(${r.x}px,${r.y}px) rotate(${r.r||0}deg) scale(${r.sx??r.s??1},${r.sy??r.s??1})`;
      if(g.kind==='scoreboard'){const v=s.t0+lt2>=g.hit?g.score:[0,0];ge.querySelector('.sba').textContent=v[0];ge.querySelector('.sbb').textContent=v[1];}
      if(g.kind==='clock'){const an=(lt2)*720;const hm=ge.querySelector('.hand-m');if(hm){hm.style.transformOrigin='120px 120px';hm.style.transform=`rotate(${an}deg)`;}}
      const pf=ge.querySelector('.pf');if(pf){const u=outBack(E(s.t0+lt2,g.hit-0.05,g.hit+0.25));pf.style.transformOrigin='120px 120px';pf.style.transform=`scale(${Math.max(0,u)})`;}}
  };
  draw1(S[a],lt);
  let fl=0;
  if(ut<1&&(cur>0||loop)){
    if(tr==='whip'){const u=ease(Math.min(1,ut)),bl=22*Math.sin(Math.PI*Math.min(1,ut));
      const ps=S[prev];draw1(ps,(loop?D-LOOP:S[cur].t0)-ps.t0+ut*0.3);
      const pe=document.getElementById('s'+prev),ce=document.getElementById('s'+a);
      pe.style.transform=`translateX(${-1080*u}px)`;pe.style.filter=`blur(${bl}px)`;ce.style.transform=`translateX(${1080*(1-u)}px)`;ce.style.filter=`blur(${bl}px)`;}
    else {const u=Math.min(1,ut);const ce=document.getElementById('s'+a);ce.style.transform=`scale(${1.22-0.22*outQuad(u)})`;fl=0.55*(1-u);}
  }
  for(const x of FL){const d2=t-x;if(d2>=0&&d2<0.2)fl=Math.max(fl,0.5*(1-d2/0.2));}
  document.getElementById('flash').style.opacity=fl;
  const fr=Math.floor(t*FPS);document.getElementById('grain').style.backgroundPosition=`${(fr*53)%256}px ${(fr*97)%256}px`;
  document.querySelectorAll('.line').forEach((ln,i)=>{const q=Q[i];const until=i+1<Q.length?Q[i+1].t0:q.t1+0.35;const on=t>=q.t0&&t<until&&t<D-LOOP;ln.style.opacity=on?1:0;
    if(!on)return;ln.querySelectorAll('span').forEach((sp,j)=>{const u=E(t,q.w[j].t-0.03,q.w[j].t+0.14);const first=i===0&&t<0.35;const k=first?1:outBack(u);
      sp.style.opacity=first?1:Math.min(1,u*3);sp.style.transform=`scale(${0.6+0.4*k}) translateY(${(1-Math.min(1,u))*24}px)`;});});
}
"""


def compose(root: Path, beats: list[dict], words: list[dict], duration: float, *, accent: str, bans: list[str], tag: str,
            masthead: str = '', club_id: str | None = None, season: str | None = None, fps: int = FPS, salt: str = '',
            gsap: Path | None = None, lead: float = 0.1) -> tuple[Path, list[tuple[float, str]], list[dict]]:
    """Writes root/index.html. Returns (it, the sound cues [(t, sample)], the shots — for the ambience bed)."""
    if not beats:
        raise StageError('CARTOON_EMPTY', 'a Short needs at least one beat')
    root.mkdir(parents=True, exist_ok=True)
    assets = root / 'assets'
    assets.mkdir(exist_ok=True)
    fonts = ''
    for name, fn in build.FACES.items():
        p = build.FONTS / fn
        if p.exists():
            shutil.copyfile(p, assets / fn)
            fonts += f"@font-face{{font-family:'hf-{name}0';src:url('assets/{fn}') format('woff2');font-display:block}}\n"
    from ..hyperframes.build import gsap_file
    shutil.copyfile(gsap or gsap_file(), assets / 'gsap.min.js')
    _grain(assets)
    paint = accent if build._ok(accent, bans) else None
    keys = plates.pick_plates(beats, bans, club_id=club_id, season=season)
    shots = plan_shots(beats, duration, keys, bans, salt or ' '.join(b['say'] for b in beats)[:60])
    pal = build.palette(accent, '#FFFBF2', bans)
    cues: list[tuple[float, str]] = []
    gags: list[dict] = []
    flashes: list[float] = []
    body = []
    for s in shots:
        src, pw, ph = plates.plate_file(s['plate_key'], assets, paint, bans)
        s.update(pw=pw, ph=ph, focus=interest(assets / src))
        parts = [f'<div class="pl"><img src="assets/{src}" width="{pw}" height="{ph}"></div>']
        if s['crowd_key']:
            c_src, cw, ch = plates.cut_file(s['crowd_key'], assets, 430, paint, bans)
            s['crowd'] = {'x': (W - cw) / 2, 'y': H - ch + 60}
            parts.append(f'<img class="crowd" src="assets/{c_src}" width="{cw}" height="{ch}">')
        if s['fig_key']:
            f_src, fw, fh = plates.cut_file(s['fig_key'], assets, plates.FIGURE_H, paint, bans)
            if fw > 980:
                f_src, fw, fh = plates.cut_file(s['fig_key'], assets, int(plates.FIGURE_H * 980 / fw), paint, bans)
            cx = {'L': 300, 'R': 780}[s['side']]
            s['fig'] = {'x': cx - fw / 2, 'y': H - fh + 40, 'w': fw, 'h': fh, 'flip': False}
            parts.append(f'<img class="fig" src="assets/{f_src}" width="{fw}" height="{fh}" style="transform-origin:{fw / 2}px {fh}px">')
            cues.append((s['t0'] + 0.14, 'pickup'))
        if s['prop']:
            p_src, pw2, ph2 = plates.prop_file(s['prop'], assets, PROP_H.get(s['prop'], 380), bans)
            if s.get('fig'):
                px = (760 if s['side'] == 'L' else 320) - pw2 / 2
                py = 980 - ph2 / 2
            else:
                px, py = (W - pw2) / 2, 1120 - ph2 / 2
            s['prop'] = {'name': s['prop'], 'x': px, 'y': py, 'w': pw2, 'h': ph2}
            parts.append(f'<img class="prop" src="assets/{p_src}" width="{pw2}" height="{ph2}">')
            if s['prop']['name'] == 'portable_radio':
                parts.append('<div class="ring"></div><div class="ring"></div><div class="ring"></div>')
            at = s['hit'] - 0.05 if s['gag'] == 'ball_goal' else s['t0'] + max(0.05, min(s['hit'] - s['t0'] - 0.15, 0.6))
            cues.append((at, SOUND_OF_PROP.get(s['prop']['name'], 'pop')))
        else:
            s['prop'] = None
        g = s['gag']
        if g in SVG_GAGS:
            svg, gw, gh = build._prop_svg(g, pal, {'masthead': masthead})
            svg = re.sub(r'<g class="pf">.*?</g>', '', svg, flags=re.S)  # inked objects have no cartoon faces
            entry = {'id': f'g{s["i"]}', 'shot': s['i'], 'kind': g, 't0': s['t0'] + 0.15, 't1': s['t1'] - 0.1, 'hit': s['hit'], 'seed': s['i'] * 1.7}
            if g == 'stamp':
                txt = 'CLASSIFIED' if re.search(r'classified|file|secret', beats[s['i']]['say'], re.I) else 'CONFIRMED'
                svg, gw, gh = rig.stamp(txt, pal['stamp']), 34 * len(txt) + 30, 140
                entry.update(x=(W - gw) / 2, y=1120)
                flashes.append(s['hit'])
            elif g == 'scoreboard':
                entry.update(x=(W - gw) / 2, y=760, score=list(beats[s['i']].get('score') or (0, 0)))
            elif g == 'bars':
                svg, gw, gh = rig.bars(), 1080, 1500
                entry.update(x=0, y=300)
            elif g == 'money':
                entry.update(x=(W - gw) / 2, y=600)
            else:
                ox = 700 if s.get('fig') and s['side'] == 'L' else 380 if s.get('fig') else (W - gw) / 2
                entry.update(x=ox - (0 if not s.get('fig') else gw / 2), y=1180)
                if g == 'bottle':
                    entry['falls'] = bool(re.search(r'\b(drop|dropp|fell|fall|slip|broke|smash|shatter)', beats[s['i']]['say'], re.I))
                    if entry['falls']:
                        cues.append((s['hit'] + 0.55, 'glass'))
            entry.update(svg=svg, w=gw, h=gh)
            # the drawn gags are bigger in a Short than on the old stage
            gags.append(entry)
            cues.append((s['hit'] if g not in ('newspaper',) else s['hit'] - 0.3, SOUND_OF_GAG.get(g, 'pop')))
            if g == 'red_card':
                cues.append((s['hit'] + 0.2, 'crowd-groan'))
        if g == 'ball_goal':
            gags.append({'id': f'b{s["i"]}', 'shot': s['i'], 'kind': 'burst', 'svg': rig.burst('GOAL', pal['accent'] if build._ok(pal['accent'], bans) else '#FFFBF2'),
                         'w': 400, 'h': 300, 't0': s['t0'], 't1': s['t1'], 'hit': s['hit'] + 0.7, 'x': 340, 'y': 640})
            cues += [(s['hit'] + 0.7, 'crowd-real-goal'), (s['hit'] + 0.68, 'drum')]
            flashes.append(s['hit'] + 0.7)
        if s['pose'] == 'cheer' and g != 'ball_goal':
            cues.append((s['hit'], 'crowd-swell'))
        if s['pose'] in ('scared', 'facepalm') and g not in ('red_card',):
            cues.append((s['hit'], 'heart'))
        if s['i'] > 0:
            cues.append((s['t0'] - 0.05, 'whoosh' if s['trans'] == 'whip' else 'drum'))
        for gg in gags:
            if gg['shot'] == s['i']:
                parts.append(f'<div class="fx" id="{gg["id"]}" style="width:{gg["w"]}px;height:{gg["h"]}px">'
                             f'<svg width="{gg["w"]}" height="{gg["h"]}" viewBox="0 0 {gg["w"]} {gg["h"]}" overflow="visible">{gg["svg"]}</svg></div>')
        body.append(f'<div class="shot" id="s{s["i"]}">' + ''.join(parts) + '</div>')
    # the climb into the last line: the crowd builds when the Short lands on a high
    if len(shots) > 2 and shots[-1]['pose'] == 'cheer':
        cues.append((max(0.0, shots[-1]['t0'] - 1.6), 'crowd-real-build'))
    Q = build._caption_chunks(words, lead)
    def span(w):
        return ('<span class="key">' if w['key'] else '<span>') + html.escape(w['w']) + '</span>'
    lines = ''.join('<div class="line">' + ''.join(span(w) for w in q['w']) + '</div>' for q in Q)
    js_shots = [{k: s.get(k) for k in ('i', 't0', 't1', 'hit', 'move', 'dir', 'trans', 'pw', 'ph', 'focus', 'fig', 'crowd', 'prop', 'gag')}
                for s in shots]
    accent_css = accent if build._ok(accent, bans) else '#FFFBF2'
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=1080, height=1920">
<script src="assets/gsap.min.js"></script>
<style>{fonts}:root{{--accent:{accent_css}}}{CSS}</style></head>
<body><div id="root" data-composition-id="main" data-start="0" data-duration="{duration:.3f}" data-width="{W}" data-height="{H}" data-fps="{fps}">
<svg width="0" height="0" style="position:absolute"><defs><filter id="paper" x="-10%" y="-10%" width="120%" height="120%">
<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n"/>
<feColorMatrix in="n" type="matrix" values="0 0 0 0 .5  0 0 0 0 .46  0 0 0 0 .4  0 0 0 -1.4 1.05" result="g"/>
<feComposite in="g" in2="SourceGraphic" operator="in" result="gi"/>
<feBlend in="SourceGraphic" in2="gi" mode="multiply" result="m"/>
<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="9" result="w"/>
<feDisplacementMap in="m" in2="w" scale="5" xChannelSelector="R" yChannelSelector="G"/>
</filter></defs></svg>
{''.join(body)}
<div id="vig"></div><div id="grain"></div><div id="topfade"></div>
<div id="tag">{html.escape(tag.upper())}</div>
<div id="cap">{lines}</div>
<div id="flash"></div>
</div>
<script>
const D={duration:.3f},FPS={fps},LOOP=0.35;
const S={json.dumps(js_shots)};
const G={json.dumps([{k: v for k, v in g.items() if k != 'svg'} for g in gags])};
const FL={json.dumps(sorted(flashes))};
const Q={json.dumps(Q)};
{RUNTIME}
{_gag_runtime()}
const clock={{t:0}};
const tl=gsap.timeline({{paused:true}});
tl.to(clock,{{t:D,duration:D,ease:'none',onUpdate:()=>draw(clock.t)}},0);
window.__timelines=window.__timelines||{{}};
window.__timelines["main"]=tl;
tl.seek(0);draw(0);
</script></body></html>
"""
    from ..hyperframes.build import check_colours
    page = build.neutralize(page, bans)
    check_colours(page, bans)
    (root / 'index.html').write_text(page, encoding='utf-8')
    (root / 'hyperframes.json').write_text(json.dumps({'name': 'illustrated-short', 'width': W, 'height': H, 'fps': fps}, indent=1) + '\n')
    cues = [(round(max(0.0, t), 3), k) for t, k in cues if t < duration]
    return root / 'index.html', sorted(cues), [{k: s[k] for k in ('i', 't0', 't1', 'amb', 'plate_key', 'pose')} for s in shots]
