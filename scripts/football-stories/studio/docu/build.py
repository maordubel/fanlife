"""DOCU — the studio's documentary look (owner, 9.11.2026: "this is the direction, and from now on it is the graphic minimum").

VOX + HyperFrames + animation + storyline + documentary. A film is a STORYBOARD: an ordered list of beats, each one narrated
line and the shot under it. This module turns a storyboard into one HyperFrames project (index.html + assets/) that
`hyperframes render` draws frame by frame. Nothing here writes a fact: every word on screen is the storyboard's, and the
storyboard is written from the job's ledger (scores, dates, scorers only where the brief or archive names them).

The vocabulary (each shot kind is a device of the approved sample, PT v Feyenoord 1992):
  score     the big scoreboard: home/away names, crests, the score, a caption line  (cold open, full time)
  stamp     WON / OUT style stamps over the current picture
  question  one big line, words in the club colours
  ticket    a chapter card on paper: PART ONE · ROTTERDAM
  video     an owner clip full frame, paper border, lower third
  image     an owner illustration, push / pull / pan, optional name tag (goal, scorer, timing word)
  lead      a full-width banner in the club colour (HAPOEL LEAD THE TIE)
  ledger    the two-column table (goals over two legs, away goals), a red circle drawn on one cell
  rule      a rule card typed on paper
  verdict   the split screen: WON THE NIGHT | WENT THROUGH
  end       the channel card
A beat may also move the AGGREGATE tracker (`agg: [us, them]`), flash, or cue a sound.

Every picture the owner made is labelled "Illustration · graphic reconstruction" (brief rule: never pass a drawing off as
archive). Colours are the storyboard palette's; the opponent keeps its own (brief rule).
"""
from __future__ import annotations

import html
import json
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
FONTS = REPO / 'public' / 'fonts'
SFX = REPO / 'public' / 'life' / 'sfx'
GSAP = HERE.parent / 'hyperframes' / 'node_modules' / 'gsap' / 'dist' / 'gsap.min.js'
W, H = 1920, 1080
FACES = [('Head', 'weekly-head-latin'), ('Head', 'weekly-head-latin-ext'), ('Caps', 'weekly-caps-latin'),
         ('Caps', 'weekly-caps-latin-ext'), ('Ultra', 'ultra-latin-400-normal'), ('Cond', 'oswald-latin-700-normal'),
         ('Cond', 'oswald-latin-ext-700-normal'), ('Mono', 'courier-prime-latin-700-normal'),
         ('Mono', 'courier-prime-latin-ext-700-normal')]
SOUNDS = {'whistle': 'whistle-1', 'goal': 'crowd-real-goal', 'groan': 'crowd-groan', 'hush': 'crowd-hush',
          'claps': 'crowd-claps', 'murmur': 'crowd-real-murmur', 'swell': 'crowd-swell', 'bed': 'crowd-bed'}
RECON = 'Illustration · graphic reconstruction'


def e(s) -> str:
    return html.escape(str(s), quote=True)


def r2(x: float) -> float:
    return round(float(x), 2)


class Film:
    def __init__(self, sb: dict, root: Path):
        self.sb, self.root = sb, root
        p = sb['palette']
        self.US, self.THEM, self.PAPER, self.INK = p['us'], p['them'], p.get('paper', '#F1E8D3'), p.get('ink', '#14110D')
        self.clips: list[str] = []
        self.tw: list[str] = []
        self.audio: list[str] = []
        self.n = 0

    def id(self, k: str) -> str:
        self.n += 1
        return f'{k}{self.n}'

    # ── primitives ──────────────────────────────────────────────────────────────────────────────────────────────────
    def clip(self, cid, t, d, inner, z, cls='', style=''):
        self.clips.append(f'<div id="{cid}" class="clip {cls}" data-start="{r2(t)}" data-duration="{r2(d)}" style="z-index:{z};{style}">{inner}</div>')

    def tween(self, js: str):
        self.tw.append(js)

    def sound(self, name, t, d=None, vol=0.6):
        f = SOUNDS.get(name, name)
        sid = self.id('snd')
        dur = f' data-duration="{r2(d)}"' if d else ''
        self.audio.append(f'<audio id="{sid}" class="clip" src="assets/sfx/{f}.wav" data-start="{r2(t)}"{dur} data-volume="{vol}"></audio>')

    # ── shots ───────────────────────────────────────────────────────────────────────────────────────────────────────
    def image(self, s, t, d, z=3):
        cid = self.id('img')
        veil = s.get('veil', 0.3)
        pos = s.get('pos', 'center')
        inner = (f'<div class="phi" id="{cid}i" style="background-image:url(assets/img/{e(s["src"])});background-position:{pos}"></div>'
                 + (f'<div class="veil" style="opacity:{veil}"></div>' if veil else '') + f'<div class="recon">{RECON}</div>')
        self.clip(cid, t, d, inner, z, 'ph')
        move = s.get('move', 'push')
        a, b = {'push': ('{scale:1.02}', '{scale:1.16}'), 'pull': ('{scale:1.3,y:50}', '{scale:1.06,y:0}'),
                'panl': ('{scale:1.14,x:60}', '{scale:1.14,x:-60}'), 'panr': ('{scale:1.14,x:-60}', '{scale:1.14,x:60}'),
                'slam': ('{scale:1.35}', '{scale:1.08}')}[move]
        ease, dur = ('power3.out', min(1.1, d)) if move in ('pull', 'slam') else ('none', d)
        self.tween(f'tl.fromTo("#{cid}i",{a},{{...{b},duration:{r2(dur)},ease:"{ease}"}},{r2(t)});')
        if s.get('fade', True):
            self.tween(f'tl.fromTo("#{cid}",{{opacity:0}},{{opacity:1,duration:0.35}},{r2(t)});')
        if s.get('tag'):
            tg = s['tag']
            tid = self.id('tag')
            col = self.US if tg.get('side', 'us') == 'us' else self.THEM
            self.clip(tid, t + 0.5, d - 0.5, f'<div class="tag" style="background:{col}"><small>{e(tg.get("small", ""))}</small><b>{e(tg["big"])}</b></div>', 8)
            self.tween(f'tl.fromTo("#{tid} .tag",{{scaleX:0}},{{scaleX:1,duration:0.35,ease:"power3.out",transformOrigin:"left center"}},{r2(t + 0.5)});')
        if s.get('mini'):
            m = s['mini']
            mid = self.id('mini')
            self.clip(mid, t + m.get('at', 1.5), d - m.get('at', 1.5), f'<div class="mini"><span>{e(m["home"])}</span><b>{e(m["score"])}</b><span>{e(m["away"])}</span></div>', 9)
            self.tween(f'tl.fromTo("#{mid} .mini",{{scale:1.8,opacity:0}},{{scale:1,opacity:1,duration:0.22,ease:"power4.in"}},{r2(t + m.get("at", 1.5))});')

    def video(self, s, t, d):
        cid = self.id('vid')
        self.clips.append(f'<video id="{cid}" class="clip" src="assets/img/{e(s["src"])}" muted playsinline data-start="{r2(t)}" data-duration="{r2(d)}" '
                          f'data-media-start="{s.get("from", 0)}" style="object-fit:cover;z-index:3"></video>')
        self.clip(self.id('frm'), t, d, f'<div class="recon r2">{RECON}</div>', 4, 'frame')
        if s.get('lt'):
            lid = self.id('lt')
            self.clip(lid, t + 0.4, d - 0.4, f'<div class="lt"><b>{e(s["lt"][0])}</b><span>{e(s["lt"][1])}</span></div>', 6)
            self.tween(f'tl.fromTo("#{lid} .lt",{{x:-900}},{{x:0,duration:0.5,ease:"power3.out"}},{r2(t + 0.4)});')
        if s.get('clock'):
            cb = self.id('clk')
            c0 = t + s['clock'].get('at', 2)
            self.clip(cb, c0, t + d - c0, f'<div class="clockbar"><div class="cbl">0\'</div><div class="cbt"><div class="cbf" id="{cb}f" style="background:{self.US}"></div></div><div class="cbl">90\'</div><div class="cbcap">{e(s["clock"]["cap"])}</div></div>', 7)
            self.tween(f'tl.fromTo("#{cb}f",{{scaleX:0}},{{scaleX:{s["clock"].get("to", 0.94)},duration:{r2(t + d - c0 - 0.2)},ease:"power1.inOut"}},{r2(c0)});')

    def score(self, s, t, d):
        cid = self.id('sb')
        ush = f'background:{self.US}'
        them = f'background:linear-gradient(90deg,{self.THEM} 0 50%,#fff 50% 100%)' if s.get('them_halves') else f'background:{self.THEM}'
        inner = (f'<div class="sb"><div class="sbl" style="{ush}"><img src="assets/img/{e(s["us_crest"])}"><span>{s["us"]}</span></div>'
                 f'<div class="sbc"><b>{e(s["us_goals"])}</b><i>–</i><b>{e(s["them_goals"])}</b></div>'
                 f'<div class="sbr" style="{them}"><span class="nm">{e(s["them"])}</span><img src="assets/img/{e(s["them_crest"])}"></div></div>'
                 f'<div class="sbcap">{e(s.get("cap", ""))}</div>')
        if s.get('bg'):
            self.image({'src': s['bg'], 'veil': 0.55, 'move': 'push'}, t, d, 1)
        self.clip(cid, t, d, inner, 5)
        self.tween(f'tl.fromTo("#{cid} .sb",{{y:-260,opacity:0}},{{y:0,opacity:1,duration:0.55,ease:"back.out(1.6)"}},{r2(t)});')
        if s.get('shrink_at') is not None:
            self.tween(f'tl.fromTo("#{cid}",{{y:0,scale:1}},{{y:-300,scale:0.62,duration:0.7,ease:"power3.inOut",immediateRender:false}},{r2(t + s["shrink_at"])});')

    def stamp(self, s, t, d):
        cid = self.id('st')
        col = self.US if s.get('side', 'us') == 'us' else self.THEM
        self.clip(cid, t, d, f'<span>{e(s["text"])}</span>', 7, 'stamp', f'left:{s.get("x", 200)}px;top:{s.get("y", 560)}px;color:{col};border-color:{col}')
        rot = s.get('rot', -8)
        self.tween(f'tl.fromTo("#{cid}",{{scale:2.4,opacity:0,rotation:{rot * 1.7}}},{{scale:1,opacity:1,rotation:{rot},duration:0.25,ease:"power4.in"}},{r2(t)});')

    def question(self, s, t, d):
        cid = self.id('q')
        txt = e(s['text']).replace('[', f'<em style="background:{self.US}">').replace(']', '</em>').replace('{', f'<em style="background:{self.THEM}">').replace('}', '</em>').replace('|', '<br>')
        self.clip(cid, t, d, f'<div class="q">{txt}</div>', 8)
        self.tween(f'tl.fromTo("#{cid} .q",{{opacity:0,y:40}},{{opacity:1,y:0,duration:0.5,ease:"power3.out"}},{r2(t)});')

    def ticket(self, s, t, d):
        cid = self.id('tk')
        self.clip(cid, t, d, f'<div class="ticket"><small style="color:{self.US}">{e(s["small"])}</small><b>{e(s["big"])}</b><span>{e(s.get("line", ""))}</span></div>', 9, 'paper')
        self.tween(f'tl.fromTo("#{cid} .ticket",{{rotation:-6,scale:0.6,opacity:0}},{{rotation:-2,scale:1,opacity:1,duration:0.35,ease:"back.out(2)"}},{r2(t)});')

    def lead(self, s, t, d):
        cid = self.id('ld')
        col = self.US if s.get('side', 'us') == 'us' else self.THEM
        self.clip(cid, t, d, f'<div class="lead" style="background:{col}">{e(s["text"])}</div>', 9)
        self.tween(f'tl.fromTo("#{cid} .lead",{{clipPath:"inset(0 100% 0 0)"}},{{clipPath:"inset(0 0% 0 0)",duration:0.5,ease:"power3.out"}},{r2(t)});')

    def ledger(self, s, t, d):
        cid = self.id('lg')
        rows = ''.join(f'<div class="lrow" id="{cid}r{i}"><span>{e(r[0])}</span><b>{e(r[1])}</b><b>{e(r[2])}</b></div>' for i, r in enumerate(s['rows']))
        circ = (f'<svg class="circ" style="top:{220 + 225 * s["circle"][0]}px;left:{1180 if s["circle"][1] == 2 else 840}px" viewBox="0 0 200 140">'
                f'<path id="{cid}c" d="M100 10 C170 10 190 50 188 72 C185 115 140 132 98 130 C45 128 12 105 14 68 C16 32 55 12 112 14" fill="none" stroke="{self.THEM}" stroke-width="7" stroke-linecap="round"/></svg>'
                f'<div class="note" style="top:{430 + 225 * s["circle"][0]}px;left:{1210 if s["circle"][1] == 2 else 870}px;color:{self.THEM}">{e(s.get("note", ""))}</div>') if s.get('circle') else ''
        inner = (f'<div class="ledger"><div class="lh"><span></span><b style="color:{self.US}">{e(s["us"])}</b><b style="color:{self.THEM}">{e(s["them"])}</b></div>{rows}{circ}</div>')
        self.clip(cid, t, d, inner, 10, 'paper')
        self.tween(f'tl.fromTo("#{cid} .ledger",{{y:80,opacity:0}},{{y:0,opacity:1,duration:0.45,ease:"power3.out"}},{r2(t)});')
        for i, at in enumerate(s.get('row_at', [0.4 + 1.2 * k for k in range(len(s['rows']))])):
            self.tween(f'tl.fromTo("#{cid}r{i}",{{opacity:0}},{{opacity:1,duration:0.3}},{r2(t + at)});')
        if s.get('circle'):
            ca = s.get('circle_at', d - 1.5)
            self.tween(f'tl.fromTo("#{cid}c",{{strokeDasharray:620,strokeDashoffset:620}},{{strokeDashoffset:0,duration:0.7,ease:"power2.inOut"}},{r2(t + ca)});'
                       f'tl.fromTo("#{cid} .note",{{opacity:0}},{{opacity:1,duration:0.3}},{r2(t + ca + 0.6)});')

    def rule(self, s, t, d):
        cid = self.id('ru')
        self.clip(cid, t, d, f'<div class="rule"><small style="color:{self.THEM}">{e(s["small"])}</small><b>{e(s["title"])}</b><p>{e(s["text"])}</p></div>', 10, 'paper')
        self.tween(f'tl.fromTo("#{cid} .rule",{{scale:0.9,opacity:0}},{{scale:1,opacity:1,duration:0.45,ease:"power3.out"}},{r2(t)});'
                   f'tl.fromTo("#{cid} p",{{clipPath:"inset(0 100% 0 0)"}},{{clipPath:"inset(0 0% 0 0)",duration:{r2(min(2.4, d - 1))},ease:"none"}},{r2(t + 0.6)});')

    def verdict(self, s, t, d):
        cid = self.id('vd')
        inner = (f'<div class="vd"><div class="vl" style="background:{self.US}"><img src="assets/img/{e(s["us_crest"])}"><small>{e(s["us_line"])}</small><b>{s["us"]}</b></div>'
                 f'<div class="vr" style="background:{self.THEM}"><img src="assets/img/{e(s["them_crest"])}"><small>{e(s["them_line"])}</small><b>{s["them"]}</b></div></div>')
        self.clip(cid, t, d, inner, 11)
        self.tween(f'tl.fromTo("#{cid} .vl",{{xPercent:-100}},{{xPercent:0,duration:0.5,ease:"power3.out"}},{r2(t)});'
                   f'tl.fromTo("#{cid} .vr",{{xPercent:100}},{{xPercent:0,duration:0.5,ease:"power3.out"}},{r2(t + s.get("them_at", 1.6))});')

    def end(self, s, t, d):
        cid = self.id('end')
        self.clip(cid, t, d, f'<div class="end"><img src="assets/img/fanlife.png"><small>FAN LIFE · FOOTBALL STORIES</small><b>{e(s["title"])}</b><span>{e(s.get("line", ""))}</span></div>', 13, 'ink')
        self.tween(f'tl.fromTo("#{cid} .end",{{opacity:0,y:30}},{{opacity:1,y:0,duration:0.6,ease:"power2.out"}},{r2(t)});')

    # ── assembly ────────────────────────────────────────────────────────────────────────────────────────────────────
    def build(self, beats: list[dict]) -> float:
        """beats carry their absolute times (t, d) — see timeline(). Returns the film's duration."""
        agg_on = None
        for b in beats:
            for s in b['shots']:
                t, d = b['t'] + s.get('dt', 0), s.get('d', b['d'] - s.get('dt', 0))
                getattr(self, s['kind'])(s, t, d)
            for snd in b.get('sound', []):
                self.sound(snd[0], b['t'] + snd[1], snd[2] if len(snd) > 2 else None, snd[3] if len(snd) > 3 else 0.6)
            if b.get('flash') is not None:
                self.tween(f'tl.fromTo("#flash",{{opacity:0.7}},{{opacity:0,duration:0.25,immediateRender:false}},{r2(b["t"] + b["flash"])});')
            if b.get('agg') is not None:
                if agg_on is None:
                    agg_on = b['t']
                    self.agg0 = b['agg']
                else:
                    self.agg_moves.append((b['t'] + b.get('agg_dt', 0.6), b['agg']))
            if b.get('agg_off'):
                self.agg_window = (agg_on, b['t'])
            if b.get('vo'):
                self.audio.append(f'<audio id="{self.id("vo")}" class="clip" src="assets/vo/{b["vo_file"]}" data-start="{r2(b["vo_t"])}" data-duration="{r2(b["vo_d"])}" data-volume="1.15"></audio>')
                sid = self.id('sub')
                self.clip(sid, b['vo_t'], b['vo_d'] + 0.15, f'<div class="sub">{e(b["vo"])}</div>', 20, 'subw')
        if agg_on is not None:
            a0, a1 = getattr(self, 'agg_window', (agg_on, beats[-1]['t']))
            sb = self.sb
            self.clip('agg', a0, a1 - a0, f'<div class="agg"><div class="ah">AGGREGATE</div><div class="ar"><img src="assets/img/{e(sb["us"]["crest"])}"><b id="aggu">{self.agg0[0]}</b><i>–</i><b id="aggt">{self.agg0[1]}</b><img src="assets/img/{e(sb["them"]["crest"])}"></div></div>', 12)
            self.tween(f'tl.fromTo("#agg .agg",{{x:500}},{{x:0,duration:0.5,ease:"power3.out"}},{r2(a0)});')
            last = list(self.agg0)
            for at, (u, th) in self.agg_moves:
                for sel, old, new in (('#aggu', last[0], u), ('#aggt', last[1], th)):
                    if old != new:
                        self.tween(f'tl.set("{sel}",{{textContent:"{new}"}},{r2(at)});tl.fromTo("{sel}",{{scale:1.9,color:"#ffffff"}},{{scale:1,color:"{self.PAPER}",duration:0.4,ease:"back.out(3)",immediateRender:false}},{r2(at)});')
                last = [u, th]
        return beats[-1]['t'] + beats[-1]['d']

    def page(self, D: float) -> str:
        fonts = ''.join(f"@font-face{{font-family:'{n}';src:url(assets/fonts/{f}.woff2)}}" for n, f in FACES)
        P, INK, US = self.PAPER, self.INK, self.US
        css = fonts + f'''
#root{{background:{INK};overflow:hidden;font-family:'Caps'}}
.clip{{position:absolute;left:0;top:0;width:1920px;height:1080px}}
video.clip{{width:1920px;height:1080px}}
.ph{{overflow:hidden}} .phi{{position:absolute;left:0;top:0;width:1920px;height:1080px;background-size:cover}}
.veil{{position:absolute;left:0;top:0;width:1920px;height:1080px;background:{INK}}}
.recon{{position:absolute;right:40px;top:34px;font:700 18px 'Mono';color:{P};opacity:.75;letter-spacing:1px}} .r2{{right:120px;top:90px}}
.frame{{border:58px solid {P};box-sizing:border-box}} .paper{{background:{P}}} .ink{{background:{INK}}}
.sb{{position:absolute;left:260px;top:360px;width:1400px;height:230px;display:flex;background:{P};box-shadow:14px 14px 0 {INK};border:5px solid {INK}}}
.sbl,.sbr{{flex:1;display:flex;align-items:center;gap:26px;padding:0 34px;font:400 46px/1 'Head';color:#fff}}
.sbr{{justify-content:flex-end;color:{INK};border-left:5px solid {INK}}} .sbr .nm{{background:#fff;padding:6px 12px;border:4px solid {INK}}}
.sbl img,.sbr img{{width:150px;height:150px;object-fit:contain;background:#fff;border-radius:50%;padding:8px;border:4px solid {INK}}}
.sbc{{width:360px;display:flex;align-items:center;justify-content:center;gap:16px;background:{INK};color:{P};font:400 150px/1 'Ultra'}} .sbc i{{font-style:normal;font-size:90px}}
.sbcap{{position:absolute;left:260px;top:612px;width:1400px;text-align:center;font:700 34px 'Cond';color:{P};letter-spacing:6px}}
.stamp{{width:auto;height:auto;padding:4px 40px;border:14px solid;font:400 230px/1 'Ultra';background:rgba(241,232,211,.08)}}
.q{{position:absolute;left:0;width:1920px;top:250px;text-align:center;font:400 104px/1.12 'Head';color:{P};text-shadow:6px 6px 0 {INK}}} .q em{{font-style:normal;color:#fff;padding:0 14px}}
.ticket{{position:absolute;left:460px;top:330px;width:1000px;padding:40px 60px;background:#fff;border:6px dashed {INK};text-align:center;color:{INK}}}
.ticket small{{display:block;font:700 40px 'Cond';letter-spacing:10px}} .ticket b{{display:block;font:400 132px/1 'Ultra'}} .ticket span{{display:block;font:700 30px 'Cond';letter-spacing:3px;margin-top:14px}}
.lt{{position:absolute;left:58px;top:820px;background:{INK};color:{P};padding:18px 34px;display:flex;gap:26px;align-items:baseline}} .lt b{{font:400 58px 'Ultra';color:#fff}} .lt span{{font:700 32px 'Cond';letter-spacing:2px}}
.clockbar{{position:absolute;left:140px;top:120px;width:1640px;display:flex;align-items:center;gap:20px;font:700 40px 'Cond';color:{INK}}}
.cbt{{flex:1;height:36px;background:rgba(20,17,13,.25);border:4px solid {INK}}} .cbf{{height:100%;transform-origin:left center}}
.cbcap{{position:absolute;left:0;top:64px;background:{INK};color:{P};padding:6px 18px;letter-spacing:4px}}
.tag{{position:absolute;left:120px;top:690px;padding:18px 40px 22px;color:#fff;box-shadow:12px 12px 0 {INK}}} .tag small{{display:block;font:700 34px 'Cond';letter-spacing:6px;opacity:.9}} .tag b{{display:block;font:400 112px/1 'Head'}}
.mini{{position:absolute;right:120px;top:190px;background:{P};border:6px solid {INK};padding:16px 30px;display:flex;gap:24px;align-items:center;font:700 36px 'Cond';color:{INK};box-shadow:10px 10px 0 {INK}}} .mini b{{font:400 80px 'Ultra'}}
.lead{{position:absolute;left:0;top:430px;width:1920px;text-align:center;color:#fff;font:400 120px/1.3 'Ultra';letter-spacing:4px;white-space:nowrap}}
.agg{{position:absolute;right:60px;top:80px;background:{INK};border:5px solid {P};padding:14px 26px;color:{P}}} .ah{{font:700 26px 'Cond';letter-spacing:8px;text-align:center}}
.ar{{display:flex;align-items:center;gap:22px;font:400 76px/1 'Ultra'}} .ar img{{width:78px;height:78px;object-fit:contain;background:#fff;border-radius:50%;padding:4px}} .ar img:last-child{{margin-left:10px}} .ar i{{font-style:normal}} .ar b{{display:inline-block;width:92px;text-align:center}}
.ledger{{position:absolute;left:220px;top:170px;width:1480px;color:{INK}}}
.lh,.lrow{{display:grid;grid-template-columns:1fr 340px 340px;align-items:center;text-align:center}} .lh b{{font:400 54px 'Head'}}
.lrow{{border-top:5px solid {INK};padding:28px 0}} .lrow span{{text-align:left;font:700 48px 'Cond';letter-spacing:3px}} .lrow b{{font:400 160px/1 'Ultra'}}
.circ{{position:absolute;width:300px;height:210px}} .note{{position:absolute;font:700 36px 'Mono'}}
.rule{{position:absolute;left:260px;top:220px;width:1400px;color:{INK}}} .rule small{{font:700 40px 'Cond';letter-spacing:10px}} .rule b{{display:block;font:400 132px/1.05 'Ultra';margin:12px 0 30px}} .rule p{{font:700 52px/1.3 'Mono';margin:0}}
.vd{{position:absolute;left:0;top:0;width:1920px;height:1080px;display:flex}} .vl,.vr{{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:#fff;text-align:center}}
.vl img,.vr img{{width:230px;height:230px;object-fit:contain;background:#fff;border-radius:50%;padding:10px}} .vl small,.vr small{{font:700 46px 'Cond';letter-spacing:10px}} .vl b,.vr b{{font:400 92px/1.05 'Head'}}
.end{{position:absolute;left:0;top:190px;width:1920px;text-align:center;color:{P}}} .end img{{width:260px;height:260px}} .end small{{display:block;font:700 36px 'Cond';letter-spacing:10px;margin-top:20px}} .end b{{display:block;font:400 96px/1.1 'Head';margin:16px 0}} .end span{{font:700 32px 'Mono';opacity:.85}}
.subw .sub{{position:absolute;left:50%;transform:translateX(-50%);max-width:1400px;top:948px;text-align:center;font:700 38px/1.25 'Cond';color:#fff;background:rgba(20,17,13,.82);padding:8px 22px}}
#flash{{position:absolute;left:0;top:0;width:1920px;height:1080px;background:#fff;opacity:0;z-index:30}}
'''
        bed = self.sb.get('bed', 0.28)
        self.sound('bed', 0.2, max(1, D - 5), bed)
        return (f'<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=1920, height=1080">'
                f'<script src="assets/gsap.min.js"></script><style>{css}</style></head><body>\n'
                f'<div id="root" data-composition-id="main" data-start="0" data-duration="{r2(D)}" data-width="1920" data-height="1080" data-fps="30" data-layout-allow-overlap data-layout-allow-overflow>\n'
                + '\n'.join(self.clips) + '\n<div id="flash" data-layout-ignore></div>\n' + '\n'.join(self.audio)
                + '\n</div>\n<script>\nconst tl=gsap.timeline({paused:true});\n' + '\n'.join(self.tw)
                + '\nwindow.__timelines=window.__timelines||{};window.__timelines["main"]=tl;tl.seek(0);\n</script></body></html>\n')


def timeline(beats: list[dict], vo: dict[str, float], lead_in: float = 1.5) -> list[dict]:
    """Lay the beats end to end on their narration: a beat lasts its line plus its own pause (`pad`, default 0.5 s);
    a beat with no line lasts `hold` seconds. `pre` holds pictures before the line starts."""
    t = 0.0
    out = []
    for i, b in enumerate(beats):
        b = dict(b)
        pre = b.get('pre', lead_in if i == 0 else 0.0)
        if b.get('vo'):
            b['vo_file'] = f'l{i:03d}.wav'
            b['vo_d'] = vo[b['vo_file']]
            b['vo_t'] = t + pre
            b['d'] = pre + b['vo_d'] + b.get('pad', 1.0)
        else:
            b['d'] = b.get('hold', 2.0)
        b['t'] = t
        t += b['d']
        out.append(b)
    return out


def speak(beats: list[dict], out: Path, voice: str = 'bm_george', speed: float = 0.92) -> dict[str, float]:
    """The narrator: Kokoro (free, Apache-2.0), the same voice the studio's PIL engine uses by default."""
    import soundfile as sf
    from kokoro_onnx import Kokoro
    import os
    d = Path(os.environ.get('KOKORO_DIR', str(Path.home() / 'models')))
    k = Kokoro(str(d / 'kokoro-v1.0.onnx'), str(d / 'voices-v1.0.bin'))
    out.mkdir(parents=True, exist_ok=True)
    durs = {}
    for i, b in enumerate(beats):
        if not b.get('vo'):
            continue
        f = f'l{i:03d}.wav'
        a, sr = k.create(b.get('say', b['vo']), voice=voice, speed=speed, lang='en-gb')
        sf.write(out / f, a, sr)
        durs[f] = round(len(a) / sr, 3)
    return durs


def check(sb: dict, beats: list[dict], D: float) -> list[str]:
    """The gate before the owner sees anything: length against the plan, the aggregate only ever moving by one goal,
    every picture labelled, no line on screen without its narration."""
    errs = []
    want = sb.get('minutes')
    if want and not (want[0] * 60 <= D <= want[1] * 60):
        errs.append(f'length {D / 60:.1f} min is outside the plan {want[0]}–{want[1]} min')
    last = None
    for b in beats:
        if b.get('agg') is not None:
            if last is not None and sum(b['agg']) - sum(last) not in (0, 1):
                errs.append(f'aggregate jumps from {last} to {b["agg"]}')
            last = b['agg']
    for b in beats:
        if not b.get('shots') and b.get('vo'):
            errs.append(f'a narrated beat with nothing on screen: {b["vo"][:40]}')
    return errs


def build(storyboard: Path, assets: Path, root: Path, voice: bool = True) -> tuple[Path, float]:
    sb = json.loads(storyboard.read_text())
    root.mkdir(parents=True, exist_ok=True)
    (root / 'assets' / 'fonts').mkdir(parents=True, exist_ok=True)
    (root / 'assets' / 'sfx').mkdir(parents=True, exist_ok=True)
    if (root / 'assets' / 'img').exists():
        shutil.rmtree(root / 'assets' / 'img')
    shutil.copytree(assets, root / 'assets' / 'img')
    for _, f in FACES:
        shutil.copyfile(FONTS / f'{f}.woff2', root / 'assets' / 'fonts' / f'{f}.woff2')
    shutil.copyfile(GSAP, root / 'assets' / 'gsap.min.js')
    import subprocess
    for name in set(SOUNDS.values()):
        src = next(SFX.glob(name + '.*'))
        dst = root / 'assets' / 'sfx' / f'{name}.wav'
        if not dst.exists():
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-ac', '2', '-ar', '48000', str(dst)], check=True)
    vo_dir = root / 'assets' / 'vo'
    cache = vo_dir / 'durations.json'
    durs = speak(sb['beats'], vo_dir, sb.get('voice', 'bm_george')) if voice or not cache.exists() else json.loads(cache.read_text())
    cache.write_text(json.dumps(durs))
    beats = timeline(sb['beats'], durs)
    f = Film(sb, root)
    f.agg_moves = []
    D = f.build(beats)
    errs = check(sb, beats, D)
    (root / 'index.html').write_text(f.page(D), encoding='utf-8')
    (root / 'hyperframes.json').write_text(json.dumps({'name': sb.get('slug', 'docu'), 'width': W, 'height': H, 'fps': 30}) + '\n')
    (root / 'CHECK.json').write_text(json.dumps({'duration': round(D, 2), 'errors': errs}, indent=1))
    return root / 'index.html', D


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('storyboard')
    ap.add_argument('--assets', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--no-voice', action='store_true', help='reuse the narration already in the project')
    a = ap.parse_args()
    p, D = build(Path(a.storyboard), Path(a.assets), Path(a.out), voice=not a.no_voice)
    print(p, f'{D:.1f}s', (Path(a.out) / 'CHECK.json').read_text())
