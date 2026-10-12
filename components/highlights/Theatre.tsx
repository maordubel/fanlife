'use client'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {PALETTE as BASE,type Palette} from '@/lib/highlights/kit'
import {FX} from '@/lib/highlights/fx'
import {actorAt,ballAt,celebrationFor,closingFor,sceneFor,storyOf,type Scene} from '@/lib/highlights/scenes'
import {CELEBRATIONS,type Celebration,type Moment,type Reel} from '@/lib/highlights/types'
import {drawMan,type Look} from './sprite'
import {Lineups} from './Lineups'
import css from './theatre.module.css'

/**
 * THE MATCH HIGHLIGHTS — watch only (owner, 12.10.2026). The line-ups as a broadcast card, then each moment of the match drawn
 * as a sixteen-bit scene on an angled pitch, the arcade scoreboard on top, the owner's celebration film on a goal and at full
 * time. Nobody plays: the controls only skip, speed up or watch again. Everything is decided before the first frame — the reel
 * is the server's, the scenes are seeded — so the same match always plays the same way.
 * Reduced motion: each scene is shown at its decisive frame, one after another, with the same words.
 */
// 256 × 160: the sixteen-bit screen, scaled up — a bigger pixel reads as a person on a phone
const W=256,H=160,S=5.6,YS=.62
type Phase={k:'lineups'}|{k:'title';i:number}|{k:'scene';i:number}|{k:'closing'}|{k:'done'}
export type TheatreSound=(n:'kick'|'goal'|'concede'|'whistle'|'final'|'save')=>void
export type TheatreAllow={fx:Celebration[];yellowCard:boolean;/** the paint of this page (rule 95) — `paletteFor()` on the server */palette?:Palette}
const ALL:TheatreAllow={fx:[...CELEBRATIONS],yellowCard:true}
const LETTERS:Record<Celebration,string>={goal:'Goal!',hattrick:'Hat-trick!','fire-goal':'Goal!',win:'The win',champion:'Champions!',loss:'Beaten','game-over':'Game over'}

export function Theatre({reel,onDone,sound,allow=ALL,max=10,autoStart=false}:{reel:Reel;onDone?:()=>void;sound?:TheatreSound;allow?:TheatreAllow;max?:number;autoStart?:boolean}){
 const pal=allow.palette??(BASE as unknown as Palette)
 const story=useMemo(()=>storyOf(reel,max),[reel,max])
 const scenes=useMemo(()=>story.map((m,i)=>sceneFor(reel,m,i)),[reel,story])
 const [phase,setPhase]=useState<Phase>({k:'lineups'})
 const [speed,setSpeed]=useState<1|2>(1),[score,setScore]=useState<[number,number]>([0,0]),[fx,setFx]=useState<Celebration|null>(null),[letters,setLetters]=useState<string|null>(null)
 const [caption,setCaption]=useState<string>(''),[tag,setTag]=useState<{x:number;y:number;text:string;side:0|1}|null>(null)
 const [reduced,setReduced]=useState(false)
 const canvas=useRef<HTMLCanvasElement>(null),raf=useRef(0),speedRef=useRef(1)
 speedRef.current=speed
 useEffect(()=>{setReduced(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false)},[])
 const closingAny=useMemo(()=>closingFor(reel),[reel]),closing=closingAny&&allow.fx.includes(closingAny)?closingAny:null
 const next=useCallback((i:number)=>{if(i+1<scenes.length)setPhase({k:'title',i:i+1});else setPhase({k:'closing'})},[scenes.length])

 // the title card between scenes: the minute and what is coming
 useEffect(()=>{
  if(phase.k!=='title')return
  const m=scenes[phase.i]?.moment;if(!m){setPhase({k:'closing'});return}
  setFx(null);setLetters(null);setTag(null);setCaption(`${m.label??`${m.minute}′`} · ${reel.teams[m.side]!.name}`)
  const id=window.setTimeout(()=>setPhase({k:'scene',i:phase.i}),reduced?700:900/speedRef.current);return()=>window.clearTimeout(id)
 },[phase,scenes,reel,reduced])
 // the closing card
 useEffect(()=>{
  if(phase.k!=='closing')return
  setScore(reel.final);setTag(null);sound?.('final')
  setCaption(`Full time · ${reel.teams[0]!.name} ${reel.final[0]}–${reel.final[1]} ${reel.teams[1]!.name}${reel.pens?` (${reel.pens[0]}–${reel.pens[1]} on penalties)`:''}`)
  setFx(closing);setLetters(!closing&&closingAny?LETTERS[closingAny]:null)
  const id=window.setTimeout(()=>setPhase({k:'done'}),closingAny?(closing?FX[closing].ms:1400)+1800:1800);return()=>window.clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[phase])
 useEffect(()=>{if(phase.k==='done')onDone?.()},[phase,onDone])
 // autoStart: the line-ups hold for a few seconds, then the match kicks off by itself — nobody has to press anything to watch
 useEffect(()=>{if(!autoStart||phase.k!=='lineups')return;const id=window.setTimeout(()=>{sound?.('whistle');setPhase({k:'title',i:0})},reduced?2500:4200);return()=>window.clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[autoStart,phase.k])

 // the scene itself
 useEffect(()=>{
  if(phase.k!=='scene')return
  const sc=scenes[phase.i]!,c=canvas.current?.getContext('2d');if(!c)return
  const fired=new Set<number>(),cam={x:34,y:10},m=sc.moment,att=sc.attack
  // a name tag only for a man the record names in this moment — the others run the move unnamed
  const named=new Set([m.player,m.assist,m.keeper].filter((x):x is string=>!!x))
  const before=m.kind==='goal'?(m.side?[m.score[0],m.score[1]-1]:[m.score[0]-1,m.score[1]]) as [number,number]:m.score
  setScore(before);setFx(null);setLetters(null);setCaption(`${m.label??`${m.minute}′`} · ${sc.variant}`)
  let t=0,last=performance.now(),stopAt=reduced?decisive(sc):sc.duration
  const step=(now:number)=>{
   const dt=Math.min(.05,(now-last)/1000)*speedRef.current;last=now;t=reduced?stopAt:Math.min(stopAt,t+dt)
   // cues
   sc.cues.forEach((q,qi)=>{if(fired.has(qi)||q.t>t)return;fired.add(qi);onCue(sc,q,qi)})
   draw(c,sc,t,cam,att,allow.yellowCard,pal)
   const holder=currentTag(sc,t,named);if(holder){const a=sc.actors.find(x=>x.id===holder)!,p=actorAt(a,t),sp=toScreen(p.x,p.y,cam);setTag(old=>old&&old.text===`${a.no} ${a.name}`&&Math.abs(old.x-sp.x)<.5&&Math.abs(old.y-sp.y)<.5?old:{x:sp.x/W*100,y:(sp.y-22)/H*100,text:`${a.no} ${surname(a.name)}`,side:a.team===1?1:0})}
   if(t<stopAt)raf.current=requestAnimationFrame(step)
   else window.setTimeout(()=>next(phase.i),reduced?2200:m.kind==='goal'?900:500)
  }
  const onCue=(s:Scene,q:Scene['cues'][number],_qi:number)=>{
   if(q.kind==='goal'){setScore(m.score);const cel=celebrationFor(reel,m,s,story);const ok=cel&&allow.fx.includes(cel)?cel:null;setFx(ok);setLetters(cel&&!ok?LETTERS[cel]:null);sound?.(reel.mine===null||m.side===reel.mine?'goal':'concede')
    const who=reel.teams[m.side]!.lineup.find(p=>p.id===m.player),ast=reel.teams[m.side]!.lineup.find(p=>p.id===m.assist)
    setCaption(`GOAL · ${m.label??`${m.minute}′`} · ${who?`${who.no} ${who.name}`:reel.teams[m.side]!.name}${ast&&ast.id!==who?.id?` — assist ${ast.name}`:''}`)}
   else if(q.kind==='kick')sound?.('kick')
   else if(q.kind==='save'){sound?.('save');setCaption(m.kind==='block'?'Blocked!':'Saved!')}
   else if(q.kind==='post')setCaption('Off the post!')
   else if(q.kind==='whistle')sound?.('whistle')
   else if(q.kind==='card-yellow'||q.kind==='card-red'){const who=reel.teams[m.side]!.lineup.find(p=>p.id===m.player);setCaption(`${q.kind==='card-red'?'Red card':allow.yellowCard?'Yellow card':'Booked'} · ${who?`${who.no} ${who.name}`:''}`)}
   else if(q.kind==='caption'&&q.text)setCaption(`${m.label??`${m.minute}′`} · ${q.text}`)
   if(m.kind==='miss'&&q.kind==='kick'&&s.cues.filter(x=>x.kind==='kick').at(-1)===q)window.setTimeout(()=>setCaption('Wide!'),600/speedRef.current)
  }
  raf.current=requestAnimationFrame(step)
  return()=>cancelAnimationFrame(raf.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[phase,scenes,reduced])

 const skipScene=()=>{if(phase.k==='scene'||phase.k==='title')next(phase.i);else if(phase.k==='lineups')setPhase({k:'title',i:0})}
 const toEnd=()=>{cancelAnimationFrame(raf.current);setPhase({k:'closing'})}
 const again=()=>{setScore([0,0]);setFx(null);setPhase({k:'lineups'})}
 const T=reel.teams
 return <section className={css.theatre} data-testid="highlights" data-phase={phase.k} aria-label={`Highlights: ${T[0].name} v ${T[1].name}`}>
  {phase.k==='lineups'?<Lineups teams={T} onStart={()=>{sound?.('whistle');setPhase({k:'title',i:0})}}/>:null}
  <div className={css.screen} hidden={phase.k==='lineups'}>
   <canvas ref={canvas} width={W} height={H} className={css.canvas} aria-hidden="true"/>
   <header className={css.hud} aria-live="off">
    <span className={css.team}><Chip t={T[0]}/><b>{T[0].code}</b></span>
    <span className={css.score} data-testid="highlights-score"><b>{score[0]}</b><i>{phase.k==='scene'||phase.k==='title'?(scenes[(phase as {i:number}).i]?.moment.label??`${scenes[(phase as {i:number}).i]?.moment.minute??0}′`):phase.k==='closing'||phase.k==='done'?'FT':'KO'}</i><b>{score[1]}</b></span>
    <span className={css.team} data-right><b>{T[1].code}</b><Chip t={T[1]}/></span>
   </header>
   {tag&&phase.k==='scene'?<span className={css.tag} style={{insetInlineStart:`${tag.x}%`,insetBlockStart:`${tag.y}%`}} data-side={tag.side}>{tag.text}<i aria-hidden="true">▼</i></span>:null}
   {fx?<Fx c={fx} key={`${fx}:${phase.k}:${(phase as {i?:number}).i??''}`}/>:letters?<b className={css.fxText} key={`${letters}:${phase.k}:${(phase as {i?:number}).i??''}`} aria-hidden="true">{letters}</b>:null}
   {phase.k==='done'?<div className={css.final}><p className={css.finalScore}><span>{T[0].name}</span><b>{reel.final[0]} – {reel.final[1]}</b><span>{T[1].name}</span></p>{reel.pens?<p className={css.small}>{reel.pens[0]}–{reel.pens[1]} on penalties</p>:null}<p className={css.small}>Full time</p></div>:null}
  </div>
  <p className={css.caption} role="status" aria-live="polite">{caption||' '}</p>
  <p className={css.controls}>
   {phase.k==='done'?<button type="button" className={`${css.btn} min-h-tap`} onClick={again}>Watch again</button>:<>
    <button type="button" className={`${css.btn} min-h-tap`} onClick={skipScene}>{phase.k==='lineups'?'Kick off':'Next highlight'}</button>
    <button type="button" className={`${css.btn} min-h-tap`} aria-pressed={speed===2} onClick={()=>setSpeed(speed===1?2:1)}>{speed===1?'×2':'×1'}</button>
    <button type="button" className={`${css.btn} ${css.ghost} min-h-tap`} onClick={toEnd}>Skip to full time</button></>}
   <span className={css.count}>{scenes.length} highlight{scenes.length===1?'':'s'}</span>
  </p>
 </section>
}
function Chip({t}:{t:Reel['teams'][number]}){return <i className={css.chip} style={{background:t.kit.second&&t.kit.pattern!=='plain'?`linear-gradient(90deg,${t.kit.shirt} 0 50%,${t.kit.second} 50% 100%)`:t.kit.shirt}} aria-hidden="true"/>}
function Fx({c}:{c:Celebration}){
 // eslint-disable-next-line @next/next/no-img-element -- an animated, transparent WebP: the bytes are the cut, not re-encoded
 return <img className={css.fx} data-fx={c} src={FX[c].src} alt={FX[c].alt} decoding="async" draggable={false}/>
}
const surname=(n:string)=>{const p=n.trim().split(/\s+/);return (p.length>1?p[p.length-1]!:p[0]!).toUpperCase()}
function currentTag(sc:Scene,t:number,named:ReadonlySet<string>){let id:string|undefined;for(const q of sc.cues){if(q.t>t)break;if(q.kind==='tag')id=q.actor}const a=id?sc.actors.find(x=>x.id===id):undefined;return a&&a.name&&named.has(a.id)?id:undefined}
/** the frame that tells the story when motion is off: the goal, the save, the card */
function decisive(sc:Scene){const q=sc.cues.find(x=>['goal','save','post','card-yellow','card-red','flag'].includes(x.kind))??sc.cues.find(x=>x.kind==='kick');return Math.min(sc.duration,(q?.t??sc.duration)+.25)}
function toScreen(x:number,y:number,cam:{x:number;y:number}){return {x:(x-cam.x)*S+W/2,y:(y-cam.y)*S*YS+H*.56}}

/* ───────── drawing ───────── */
function draw(c:CanvasRenderingContext2D,sc:Scene,t:number,cam:{x:number;y:number},att:0|1,yellow:boolean,PALETTE:Palette){
 const b=ballAt(sc.ball,t)
 // the goal sits in the upper third, clear of the scoreboard; the camera drifts back with the ball
 const tx=Math.max(W/2/S,Math.min(68-W/2/S,b.x)),ty=Math.max(8,Math.min(38,b.y+1))
 cam.x+=(tx-cam.x)*.12;cam.y+=(ty-cam.y)*.1
 c.imageSmoothingEnabled=false
 // the stand behind the goal: a dark terrace and a crowd of dots, so a high camera never shows an empty sky
 c.fillStyle=PALETTE.ref;c.fillRect(0,0,W,H)
 const top=toScreen(0,-7,cam).y-10
 for(let y=0;y<top;y+=3)for(let x=(y/3)%2?1:0;x<W;x+=3){const k=(x*7+y*13)%11;c.fillStyle=k<5?PALETTE.skin[k]!:k<8?PALETTE.board:PALETTE.hair[k%5]!;c.fillRect(x,y,2,2)}
 // grass in bands across the pitch, like the cut of a real one
 for(let wy=-7;wy<70;wy+=5){const a=toScreen(0,wy,cam),z=toScreen(0,wy+5,cam);c.fillStyle=Math.floor(wy/5)%2?PALETTE.grassA:PALETTE.grassB;c.fillRect(0,Math.floor(a.y),W,Math.ceil(z.y-a.y)+1)}
 // the boards behind the goal
 const bd=toScreen(0,-7,cam);c.fillStyle=PALETTE.board;c.fillRect(0,Math.floor(bd.y)-10,W,10);c.fillStyle=PALETTE.boardText;c.font='7px monospace';c.textBaseline='top'
 for(let i=-2;i<8;i++){const p=toScreen(i*14,-7,cam);c.fillText(i%2?'ALL FOOTBALL':'FAN LIFE',Math.floor(p.x),Math.floor(bd.y)-9)}
 // lines
 c.fillStyle=PALETTE.line
 const line=(x1:number,y1:number,x2:number,y2:number)=>{const a=toScreen(x1,y1,cam),z=toScreen(x2,y2,cam);if(Math.abs(a.y-z.y)<1)c.fillRect(Math.floor(Math.min(a.x,z.x)),Math.floor(a.y),Math.ceil(Math.abs(z.x-a.x))+1,1);else{const n=Math.ceil(Math.abs(z.y-a.y));for(let i=0;i<=n;i++)c.fillRect(Math.floor(a.x+(z.x-a.x)*i/n),Math.floor(a.y+(z.y-a.y)*i/n),1,1)}}
 line(0,0,68,0);line(0,0,0,60);line(68,0,68,60);line(13.85,0,13.85,16.5);line(54.15,0,54.15,16.5);line(13.85,16.5,54.15,16.5);line(24.85,0,24.85,5.5);line(43.15,0,43.15,5.5);line(24.85,5.5,43.15,5.5);line(0,52.5,68,52.5)
 for(let a=0;a<=Math.PI;a+=.06){const p=toScreen(34+9.15*Math.cos(a),11+9.15*Math.sin(a),cam);if((11+9.15*Math.sin(a))>16.5)c.fillRect(Math.floor(p.x),Math.floor(p.y),1,1)}
 for(let a=Math.PI;a<=2*Math.PI;a+=.04){const p=toScreen(34+9.15*Math.cos(a),52.5+9.15*Math.sin(a),cam);c.fillRect(Math.floor(p.x),Math.floor(p.y),1,1)}
 const spot=toScreen(34,11,cam);c.fillRect(Math.floor(spot.x),Math.floor(spot.y),1,1)
 // the goal: net behind, posts and bar in front of it
 const netShake=sc.cues.some(q=>q.kind==='net'&&t>=q.t&&t<q.t+.6)?Math.round(Math.sin(t*60)):0
 const gl=toScreen(30.34,0,cam),gr=toScreen(37.66,0,cam),gb=toScreen(30.34,-2.2,cam),hh=Math.round(2.44*S*.9)
 c.fillStyle=PALETTE.net
 for(let x=Math.floor(gl.x);x<=gr.x;x+=2)for(let y=Math.floor(gb.y)-hh+netShake;y<gl.y;y+=2)if(((x+y)&3)===0)c.fillRect(x,y,1,1)
 c.fillStyle=PALETTE.post;c.fillRect(Math.floor(gl.x)-1,Math.floor(gl.y)-hh,2,hh);c.fillRect(Math.floor(gr.x),Math.floor(gr.y)-hh,2,hh);c.fillRect(Math.floor(gl.x)-1,Math.floor(gl.y)-hh,Math.ceil(gr.x-gl.x)+3,2)
 // people, far to near; the ball where it belongs among them
 const phase=Math.floor(t*10)%4
 const card=sc.cues.find(q=>(q.kind==='card-yellow'||q.kind==='card-red')&&t>=q.t)
 const items=sc.actors.map(a=>({a,p:actorAt(a,t)})).sort((u,v)=>u.p.y-v.p.y)
 let ballDrawn=false
 const drawBall=()=>{const s=toScreen(b.x,b.y,cam),lift=Math.round(b.z*S*.9);c.fillStyle=PALETTE.shadow;c.fillRect(Math.round(s.x)-1,Math.round(s.y),3,1);c.fillStyle=PALETTE.ball;c.fillRect(Math.round(s.x)-1,Math.round(s.y)-lift-2,3,3);c.fillStyle=PALETTE.ballDark;c.fillRect(Math.round(s.x)+(phase%2),Math.round(s.y)-lift-1,1,1);ballDrawn=true}
 for(const {a,p} of items){
  if(!ballDrawn&&b.y<p.y)drawBall()
  const s=toScreen(p.x,p.y,cam)
  if(s.x<-12||s.x>W+12||s.y<-30||s.y>H+20)continue
  const look:Look={kit:a.kit,skin:a.skin,hair:a.hair,role:a.role,card:card?(card.kind==='card-red'?'red':yellow?'yellow':null):null}
  drawMan(c,cellOf(),look,p.pose,p.moving?phase:0,p.face,s.x,s.y,a.dive,PALETTE)
 }
 if(!ballDrawn)drawBall()
 void att
}
let shared:HTMLCanvasElement|null=null
const cellOf=()=>shared??=Object.assign(document.createElement('canvas'),{width:16,height:20})
export type {Moment}
