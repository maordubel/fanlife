"""The animated Short (owner, 8.11.2026): the story's own painted sets, its own players drawn as cartoon characters,
and the characters ACT — they walk in, drink, wobble, fall, run, celebrate — in two-drawing animation over a moving
camera, cut on the narrator's words, with the sound of every step and fall.

Beat sheet (the writer's `cartoon` list, one entry per line):
    {"say": "...", "show": "...", "scene": "the place, with its era and real colours",
     "cast": [{"id": "branco", "action": "drinks from a water bottle, then wobbles dizzily", "motion": "wobble"}]}
and the Short's `cast_sheet`: [{"id": "branco", "look": "Brazil left-back, 1990, yellow shirt number 6 with green trim,
blue shorts, white socks, curly dark hair and a moustache"}].
Motions: idle · talk · walk · run · wobble · fall · jump · celebrate · point · kneel. A beat without a cast is a set
alone, with a stronger camera move.
"""
from __future__ import annotations

import html
import json
import re
import shutil
from pathlib import Path

from PIL import Image

from ..common import StageError
from . import build, genart, rig, stage

W, H, FPS = 1080, 1920, 30
MOTIONS = ('idle', 'talk', 'walk', 'run', 'wobble', 'fall', 'jump', 'celebrate', 'point', 'kneel')
FRAMES = {  # the two drawings of each motion
    'walk': ('mid-stride walking towards the side, left leg forward', 'mid-stride walking towards the side, right leg forward'),
    'run': ('running hard, left leg forward, arms pumping', 'running hard, right leg forward, arms pumping'),
    'jump': ('jumping in the air with joy, both arms up', 'landing from a jump, knees bent, fists clenched'),
    'celebrate': ('celebrating wildly, both arms up, mouth open shouting', 'celebrating, one fist pumping, the other arm out'),
    'wobble': ('dizzy, swaying to one side, eyes spinning, a hand on the head', 'dizzy, swaying to the other side, knees buckling'),
    'fall': ('stumbling, losing balance', 'lying on the ground, flat out'),
    'kneel': ('on his knees, head in his hands', 'on his knees, head dropped, shoulders slumped'),
    'point': ('pointing ahead, arm straight out, determined face', 'pointing ahead, mouth open, calling out'),
    'talk': ('talking, one hand gesturing, mouth open', 'talking, the other hand gesturing, mouth half open'),
    'idle': ('standing, a natural pose', 'standing, a slightly different moment of the same pose (breathing, a small gesture)'),
}
STEP_EVERY = {'walk': 0.36, 'run': 0.22}


def motion_of(cast_entry: dict) -> str:
    m = str(cast_entry.get('motion') or '').lower()
    if m in MOTIONS:
        return m
    a = str(cast_entry.get('action') or '').lower()
    for pat, mo in ((r'fall|collaps|faint|goes down', 'fall'), (r'dizz|wobbl|stagger|sway', 'wobble'), (r'celebrat|cheer|jubil', 'celebrate'),
                    (r'jump|leap', 'jump'), (r'\brun|sprint|dash|charg', 'run'), (r'walk|enter|stroll|comes on', 'walk'),
                    (r'kneel|knees|despair|head in', 'kneel'), (r'point', 'point'), (r'talk|says|tell|shout|argu|ask', 'talk')):
        if re.search(pat, a):
            return mo
    return 'idle'


def draw_story(beats: list[dict], cast_sheet: list[dict], cache: Path, bans: list[str], log=print) -> list[dict]:
    """Every picture the Short needs: a set per beat, each character's model sheet, two drawings per pose."""
    looks = {str(c.get('id')): str(c.get('look') or '') for c in cast_sheet or [] if c.get('id')}
    sheets: dict[str, tuple[Path, str]] = {}
    out = []
    for i, b in enumerate(beats):
        scene = str(b.get('scene') or b.get('show') or b.get('say'))
        bg = genart.draw(genart.set_prompt(scene, str(b.get('era') or '')), cache / 'sets', log=log)
        actors = []
        for j, c in enumerate((b.get('cast') or [])[:2]):
            cid = str(c.get('id') or f'c{i}{j}')
            look = looks.get(cid) or str(c.get('look') or '')
            if not look:
                continue
            key = genart.key_colour(look)
            if cid not in sheets:
                sheets[cid] = (genart.draw(genart.model_sheet_prompt(look, key), cache / 'cast', aspect='2:3', log=log), key)
            sheet, key = sheets[cid]
            mo = motion_of(c)
            act = str(c.get('action') or '')
            fa, fb = FRAMES[mo]
            imgs = [genart.draw(genart.pose_prompt(look, f'{act}; {f}' if act else f, key, 'Drawing ' + n + ' of 2.'),
                                cache / 'cast', aspect='2:3', refs=[sheet], log=log) for n, f in (('one', fa), ('two', fb))]
            actors.append({'id': cid, 'motion': mo, 'key': key, 'frames': imgs, 'facing': str(c.get('facing') or '')})
        out.append({'bg': bg, 'actors': actors})
    log(f'Animated Short: {genart.COUNT["images"]} new pictures drawn, {genart.COUNT["cached"]} from the cache')
    return out


CSS = stage.CSS + """
.bg{position:absolute;left:0;top:0;transform-origin:0 0}
.act{position:absolute;left:0;top:0;transform-origin:50% 100%;filter:drop-shadow(0 22px 18px rgba(10,8,6,.42))}
.act img{position:absolute;left:0;top:0;display:none}
.shadow{position:absolute;border-radius:50%;background:radial-gradient(rgba(10,8,6,.42),rgba(10,8,6,0) 70%)}
"""

RUNTIME = r"""
const E=(t,a,b)=>Math.min(1,Math.max(0,(t-a)/(b-a)));
const ease=(u)=>u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;
const sine=(u)=>-(Math.cos(Math.PI*u)-1)/2;
const outBack=(u)=>{const c=1.7;return 1+(c+1)*Math.pow(u-1,3)+c*Math.pow(u-1,2)};
const outQuad=(u)=>1-(1-u)*(1-u);
const spring=(dt,f=9,d=7)=>dt<0?0:Math.exp(-d*dt)*Math.cos(f*dt);
const lerp=(a,b,u)=>a+(b-a)*u;
const RATE={idle:3,talk:5,walk:5.5,run:9,wobble:2.5,fall:0,jump:4,celebrate:4,point:3,kneel:1.5};
function cam(s,lt){const d=Math.max(.6,s.t1-s.t0),u=sine(Math.min(1,lt/d));
  let z=lerp(1.0,1.09,u),x=lerp(-s.dir*24,s.dir*24,u),y=lerp(10,-14,u);
  if(s.move==='push'){const k=E(s.t0+lt,s.hit-0.1,s.hit+0.5);z=lerp(1.0,1.2,0.3*u+0.7*ease(k));x=0;}
  if(s.move==='pull'){z=lerp(1.22,1.0,u);x=0;}
  if(!s.actors.length){z=lerp(1.0,1.16,u);x=lerp(-s.dir*60,s.dir*60,u);}
  return {z,x:x+Math.sin(lt*.9+s.i)*4,y:y+Math.sin(lt*1.3+s.i*2)*3};}
function actor(el,a,s,lt){
  const T=s.t0+lt,dh=T-s.hit,mo=a.motion;let x=a.x,y=0,r=0,sx=a.flip?-1:1,sy=1,fr=Math.floor(lt*RATE[mo])%2;
  const breathe=1+0.012*Math.sin(lt*2.4+a.n);
  switch(mo){
    case 'walk':case 'run':{const D=mo==='run'?0.8:1.3,u=outQuad(E(lt,0.05,0.05+D));x=lerp(a.from,a.x,u);y=-Math.abs(Math.sin(lt*RATE[mo]*Math.PI))*(mo==='run'?26:14);if(u>=1)fr=Math.floor(lt*2)%2;break;}
    case 'wobble':{r=Math.sin(lt*3.2)*7;x+=Math.sin(lt*1.6)*24;break;}
    case 'fall':{fr=dh>0?1:0;if(dh>0){const u=E(dh,0,0.28);r=lerp(0,0,u);y=lerp(-30,0,outQuad(u));sy=1;}else{r=Math.sin(lt*6)*4;}break;}
    case 'jump':case 'celebrate':{const p=Math.abs(Math.sin(lt*Math.PI*(mo==='jump'?1.6:2)));y=-p*(mo==='jump'?150:90);sy=1+0.05*(1-p);sx*=1-0.03*(1-p);break;}
    case 'talk':{y=-Math.abs(Math.sin(lt*7))*5;break;}
    case 'point':{const u=outBack(E(lt,0.1,0.4));sx*=0.9+0.1*u;break;}
    default:{}
  }
  const ent=outBack(E(lt,0.02,0.32)),pop=(mo==='walk'||mo==='run')?1:0.86+0.14*ent;
  const hop=dh>0&&dh<0.6&&mo!=='fall'?-40*Math.max(0,spring(dh,11,5)):0;
  el.style.opacity=(mo==='walk'||mo==='run')?1:Math.min(1,ent*3);
  el.style.transform=`translate(${x-a.w/2}px,${a.y-a.h+y+hop}px) rotate(${r}deg) scale(${sx*pop},${sy*pop*breathe})`;
  const im=el.querySelectorAll('img');im.forEach((m,k)=>m.style.display=k===fr?'block':'none');
  const sh=document.getElementById(el.id+'sh');if(sh){sh.style.transform=`translate(${x-a.w*0.38}px,${a.y-26}px) scale(${1+y/600},1)`;}
}
function draw(t){
  let cur=0;for(let i=0;i<S.length;i++){if(t>=S[i].t0)cur=i;}
  const loop=t>=D-LOOP;
  let a=loop?0:cur,lt=loop?0:t-S[a].t0,prev=loop?S.length-1:cur-1,tr=loop?'whip':S[cur].trans,ut=loop?(t-(D-LOOP))/LOOP:lt/(tr==='whip'?0.3:0.2);
  document.querySelectorAll('.shot').forEach((el,i)=>{el.style.display=(i===a||(i===prev&&ut<1&&tr==='whip'))?'block':'none';el.style.filter='';el.style.transform='';});
  const one=(s,l)=>{const c=cam(s,l),el=document.getElementById('s'+s.i);
    el.querySelector('.bg').style.transform=`translate(${540-s.bw*c.z/2+c.x}px,${960-s.bh*c.z/2+c.y}px) scale(${c.z})`;
    s.actors.forEach((ac,k)=>actor(document.getElementById(`a${s.i}_${k}`),ac,s,l));
    for(const g of G){if(g.shot!==s.i)continue;const ge=document.getElementById(g.id);if(!ge)continue;const r=gag(g,s.t0+l);
      ge.style.opacity=r.o;ge.style.transform=`translate(${r.x}px,${r.y}px) rotate(${r.r||0}deg) scale(${r.sx??r.s??1},${r.sy??r.s??1})`;
      if(g.kind==='scoreboard'){const v=s.t0+l>=g.hit?g.score:[0,0];ge.querySelector('.sba').textContent=v[0];ge.querySelector('.sbb').textContent=v[1];}}};
  one(S[a],lt);
  let fl=0;
  if(ut<1&&(cur>0||loop)){
    if(tr==='whip'){const u=ease(Math.min(1,ut)),bl=22*Math.sin(Math.PI*Math.min(1,ut));const ps=S[prev];one(ps,(loop?D-LOOP:S[cur].t0)-ps.t0+ut*0.3);
      const pe=document.getElementById('s'+prev),ce=document.getElementById('s'+a);
      pe.style.transform=`translateX(${-1080*u}px)`;pe.style.filter=`blur(${bl}px)`;ce.style.transform=`translateX(${1080*(1-u)}px)`;ce.style.filter=`blur(${bl}px)`;}
    else{const u=Math.min(1,ut);document.getElementById('s'+a).style.transform=`scale(${1.22-0.22*outQuad(u)})`;fl=0.55*(1-u);}
  }
  for(const x of FL){const d2=t-x;if(d2>=0&&d2<0.2)fl=Math.max(fl,0.5*(1-d2/0.2));}
  document.getElementById('flash').style.opacity=fl;
  const f=Math.floor(t*FPS);document.getElementById('grain').style.backgroundPosition=`${(f*53)%256}px ${(f*97)%256}px`;
  document.querySelectorAll('.line').forEach((ln,i)=>{const q=Q[i];const until=i+1<Q.length?Q[i+1].t0:q.t1+0.35;const on=t>=q.t0&&t<until&&t<D-LOOP;ln.style.opacity=on?1:0;
    if(!on)return;ln.querySelectorAll('span').forEach((sp,j)=>{const u=E(t,q.w[j].t-0.03,q.w[j].t+0.14);const first=i===0&&t<0.35;const k=first?1:outBack(u);
      sp.style.opacity=first?1:Math.min(1,u*3);sp.style.transform=`scale(${0.6+0.4*k}) translateY(${(1-Math.min(1,u))*24}px)`;});});
}
"""


def _fit(src: Path, dest: Path, h: int, bans: list[str], k: float | None = None) -> tuple[str, int, int]:
    """A cut figure at the Short's size: the first drawing of a pose sets the scale, the second keeps it (a man lying
    down is not drawn as tall as a man standing)."""
    from ..paper import scrub
    im = Image.open(src).convert('RGBA')
    k = k or h / im.height
    w, h = round(im.width * k), round(im.height * k)
    a = im.getchannel('A')
    rgb = scrub(im.convert('RGB'), bans).convert('RGBA')
    rgb.putalpha(a)
    rgb.resize((w, h), Image.LANCZOS).save(dest / src.name.replace('.png', f'-{h}.png'), optimize=True)
    return src.name.replace('.png', f'-{h}.png'), w, h


def compose(root: Path, beats: list[dict], art: list[dict], words: list[dict], duration: float, *, accent: str, bans: list[str],
            tag: str, fps: int = FPS, gsap: Path | None = None, lead: float = 0.1) -> tuple[Path, list[tuple[float, str]], list[dict]]:
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
    stage._grain(assets)
    from ..paper import scrub
    pal = build.palette(accent, '#FFFBF2', bans)
    shots, body, cues, gags, flashes = [], [], [], [], []
    n = len(beats)
    for i, (b, a) in enumerate(zip(beats, art)):
        t0 = 0.0 if i == 0 else max(shots[-1]['t0'] + 0.6, b['t0'] - 0.12)
        hard = b.get('pose') in stage.HARD or b.get('gag') in stage.HARD_GAGS or any(x['motion'] in ('fall', 'kneel') for x in a['actors'])
        bgname = f'set-{i}-{a["bg"].stem}.jpg'
        im = Image.open(a['bg']).convert('RGB')
        k = max(W / im.width, H / im.height) * 1.04
        bw, bh = round(im.width * k), round(im.height * k)
        scrub(im, bans).resize((bw, bh), Image.LANCZOS).save(assets / bgname, quality=90)
        scene_text = str(b.get('scene') or b.get('show') or '')
        s = {'i': i, 't0': round(t0, 3), 'hit': b['hit'], 'dir': 1 if i % 2 == 0 else -1, 'trans': 'cut' if i == 0 else ('punch' if hard else 'whip'),
             'move': 'pull' if (i == n - 1 and n > 2) else 'push' if (b.get('gag') or hard) else 'pan', 'bw': bw, 'bh': bh,
             'amb': stage.ambience_of('x/' + scene_text.lower()), 'pose': b.get('pose'), 'plate_key': 'gen:' + a['bg'].stem, 'actors': []}
        parts = [f'<img class="bg" src="assets/{bgname}" width="{bw}" height="{bh}">']
        na = len(a['actors'])
        for j, ac in enumerate(a['actors']):
            hgt = 1080 if na == 1 else 940
            names = []
            cuts = []
            for fp in ac['frames']:
                cutp = assets / f'cut-{fp.stem}.png'
                if not cutp.exists():
                    genart.cut(fp, ac['key'], cutp)
                cuts.append(cutp)
            scale = hgt / max(Image.open(c_).height for c_ in cuts)  # the taller drawing sets the size
            for cutp in cuts:
                nm, fw, fh = _fit(cutp, assets, hgt, bans, scale)
                names.append((nm, fw, fh))
            fw = max(x[1] for x in names)
            cx = 540 if na == 1 else (330 if j == 0 else 750)
            mo = ac['motion']
            side = -1 if (s['dir'] > 0) == (j == 0) else 1
            src_x = cx + side * 900
            s['actors'].append({'n': j, 'motion': mo, 'x': cx, 'y': H - 40, 'w': fw, 'h': hgt, 'from': src_x, 'flip': False})
            imgs = ''.join(f'<img src="assets/{nm}" width="{w_}" height="{h_}" style="left:{(fw - w_) / 2}px;top:{hgt - h_}px">' for nm, w_, h_ in names)
            parts.append(f'<div class="shadow" id="a{i}_{j}sh" style="width:{fw * 0.76}px;height:52px"></div>')
            parts.append(f'<div class="act" id="a{i}_{j}" style="width:{fw}px;height:{hgt}px;transform-origin:{fw / 2}px {hgt}px">{imgs}</div>')
            if mo in STEP_EVERY:
                tt = t0 + 0.1
                while tt < t0 + (0.8 if mo == 'run' else 1.3):
                    cues.append((tt, 'step-terrace-' + str(1 + int(tt * 10) % 3)))
                    tt += STEP_EVERY[mo]
            elif mo == 'fall':
                cues += [(b['hit'], 'drum'), (b['hit'] + 0.05, 'crowd-groan')]
            elif mo in ('celebrate', 'jump'):
                cues.append((t0 + 0.2, 'crowd-swell'))
            elif mo == 'wobble':
                cues.append((t0 + 0.3, 'heart'))
            else:
                cues.append((t0 + 0.08, 'pickup'))
        g = b.get('gag')
        if g in ('scoreboard', 'stamp'):
            if g == 'stamp':
                txt = 'CLASSIFIED' if re.search(r'classified|file|secret', b['say'], re.I) else 'CONFIRMED'
                svg, gw, gh = rig.stamp(txt, pal['stamp']), 34 * len(txt) + 30, 140
                entry = {'x': (W - gw) / 2, 'y': 760}
                flashes.append(b['hit'])
            else:
                svg, gw, gh = build._prop_svg(g, pal, {})
                entry = {'x': (W - gw) / 2, 'y': 700, 'score': list(b.get('score') or (0, 0))}
            entry.update(id=f'g{i}', shot=i, kind=g, t0=t0 + 0.15, t1=b['t1'], hit=b['hit'], seed=i, svg=svg, w=gw, h=gh)
            gags.append(entry)
            cues.append((b['hit'], stage.SOUND_OF_GAG.get(g, 'pop')))
            parts.append(f'<div class="fx" id="g{i}" style="width:{gw}px;height:{gh}px"><svg width="{gw}" height="{gh}" viewBox="0 0 {gw} {gh}" overflow="visible">{svg}</svg></div>')
        if b.get('gag') == 'ball_goal' or re.search(r'\bscor(?:es|ed)\b|\bgoal\b', b['say'], re.I):
            cues += [(b['hit'] + 0.1, 'ball-kick'), (b['hit'] + 0.5, 'crowd-real-goal')]
            flashes.append(b['hit'] + 0.5)
        if i > 0:
            cues.append((t0 - 0.05, 'whoosh' if s['trans'] == 'whip' else 'drum'))
        body.append(f'<div class="shot" id="s{i}">' + ''.join(parts) + '</div>')
        shots.append(s)
    for i, s in enumerate(shots):
        s['t1'] = shots[i + 1]['t0'] if i + 1 < len(shots) else duration
    Q = build._caption_chunks(words, lead)

    def span(w):
        return ('<span class="key">' if w['key'] else '<span>') + html.escape(w['w']) + '</span>'
    lines = ''.join('<div class="line">' + ''.join(span(w) for w in q['w']) + '</div>' for q in Q)
    js = [{k: s[k] for k in ('i', 't0', 't1', 'hit', 'dir', 'trans', 'move', 'bw', 'bh', 'actors')} for s in shots]
    accent_css = accent if build._ok(accent, bans) else '#FFFBF2'
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=1080, height=1920">
<script src="assets/gsap.min.js"></script>
<style>{fonts}:root{{--accent:{accent_css}}}{CSS}</style></head>
<body><div id="root" data-composition-id="main" data-start="0" data-duration="{duration:.3f}" data-width="{W}" data-height="{H}" data-fps="{fps}">
{''.join(body)}
<div id="vig"></div><div id="grain"></div><div id="topfade"></div>
<div id="tag">{html.escape(tag.upper())}</div>
<div id="cap">{lines}</div>
<div id="flash"></div>
</div>
<script>
const D={duration:.3f},FPS={fps},LOOP=0.35;
const S={json.dumps(js)};
const G={json.dumps([{k: v for k, v in g.items() if k != 'svg'} for g in gags])};
const FL={json.dumps(sorted(flashes))};
const Q={json.dumps(Q)};
{RUNTIME}
{stage._gag_runtime()}
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
    (root / 'hyperframes.json').write_text(json.dumps({'name': 'animated-short', 'width': W, 'height': H, 'fps': fps}, indent=1) + '\n')
    cues = [(round(max(0.0, t), 3), k) for t, k in cues if t < duration]
    return root / 'index.html', sorted(cues), [{k: s[k] for k in ('i', 't0', 't1', 'amb', 'plate_key', 'pose')} for s in shots]
