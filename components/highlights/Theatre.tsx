'use client'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {PALETTE as BASE,type Palette} from '@/lib/highlights/kit'
import {FX} from '@/lib/highlights/fx'
import {actorAt,ballAt,closingFor,goalGraphicFor,sceneFor,storyOf,type Scene} from '@/lib/highlights/scenes'
import {LENGTH,WIDTH,attackDir,endsChange,toWorld,type Dir} from '@/lib/highlights/pitch'
import {shirtArt,surname,teamMark} from '@/lib/highlights/board'
import {CELEBRATIONS,type Celebration,type Moment,type Reel,type ReelPlayer,type ReelTeam} from '@/lib/highlights/types'
import {drawMan,type Look} from './sprite'
import {Lineups} from './Lineups'
import {Shirt} from './Shirt'
import css from './theatre.module.css'

/**
 * THE MATCH HIGHLIGHTS — watch only (owner, 12.10.2026). The line-ups as a broadcast card, then each moment of the match drawn
 * as a sixteen-bit scene, the arcade scoreboard on top, a goal graphic after every goal and the closing film at full time.
 * Nobody plays: the controls only skip, speed up or watch again. Everything is decided before the first frame — the reel is the
 * server's, the scenes are seeded — so the same match always plays the same way.
 *
 * The whole ground (13.10.2026, "both sides of the pitch"): a broadcast camera on the halfway line, both goals on the pitch, the
 * camera panning the length of it with the ball; each side attacks its own end, the arrows on the scoreboard say which, and at
 * half-time the teams change ends on screen. A radar in the corner shows all twenty-two. Reduced motion: each scene is shown at
 * its decisive frame, one after another, with the same words.
 */
// 256 × 160 on a wide screen, 192 × 160 on a phone: the sixteen-bit screen, scaled up — the phone gets its own, squarer frame so
// a man is a bigger pixel there (×1.9 instead of ×1.4) and the camera pans more; S is metres → pixels along the length (55 m of
// the 105 in view on the wide screen, 42 m on the phone), YS the camera's tilt across it
const WIDE=256,NARROW=192,H=160,S=4.6,YS=.62,HORIZON=.56
// the frame being drawn — set at the top of each synchronous draw, so two theatres on one page cannot disagree
let W=WIDE,VIEW_L=W/S
const view=(w:number)=>{W=w;VIEW_L=W/S}
type Ends=NonNullable<ReturnType<typeof endsChange>>
type Phase={k:'lineups'}|{k:'title';i:number}|{k:'ends';i:number;why:Ends}|{k:'scene';i:number}|{k:'quiet'}|{k:'break'}|{k:'closing'}|{k:'done'}
/** a live match is watched in parts: the moments after `from` up to the stop at `to`; only the last part has the closing card */
export type TheatreSegment={from:number;to:number;outro:boolean}
export type TheatreSound=(n:'kick'|'goal'|'concede'|'whistle'|'final'|'save')=>void
export type TheatreAllow={fx:Celebration[];yellowCard:boolean;/** the paint of this page (rule 95) — `paletteFor()` on the server */palette?:Palette}
const ALL:TheatreAllow={fx:[...CELEBRATIONS],yellowCard:true}
const LETTERS:Record<Celebration,string>={goal:'Goal!',hattrick:'Hat-trick!','fire-goal':'Goal!',win:'The win',champion:'Champions!',loss:'Beaten','game-over':'Game over'}
const ENDS:Record<Ends,string>={'half-time':'Half time · the teams change ends','extra-time':'Extra time · the teams change ends','extra-time-interval':'Extra time, second period · the teams change ends'}
type Card={side:0|1;player:ReelPlayer|null;against:boolean;hattrick:boolean}

export function Theatre({reel,onDone,sound,allow=ALL,max=10,autoStart=false,segment,onClock}:{reel:Reel;onDone?:()=>void;sound?:TheatreSound;allow?:TheatreAllow;max?:number;autoStart?:boolean;segment?:TheatreSegment;/** the minute the picture has reached — LEGENDS MANAGER's Tactics button pauses the match there */onClock?:(minute:number)=>void}){
 const pal=allow.palette??(BASE as unknown as Palette)
 const intro=!segment||segment.from===0,outro=!segment||segment.outro
 const scoreAt=useCallback((minute:number):[number,number]=>{let s:[number,number]=[0,0];for(const m of reel.moments)if(m.minute<=minute)s=m.score;return s},[reel])
 const story=useMemo(()=>segment?storyOf({...reel,moments:reel.moments.filter(m=>m.minute>segment.from&&m.minute<=(segment.outro?999:segment.to))},Math.min(max,6)):storyOf(reel,max),[reel,max,segment])
 const scenes=useMemo(()=>story.map((m,i)=>sceneFor(reel,m,i)),[reel,story])
 const [phase,setPhase]=useState<Phase>(intro?{k:'lineups'}:{k:'title',i:0})
 const [speed,setSpeed]=useState<1|2>(1),[score,setScore]=useState<[number,number]>(()=>segment?scoreAt(segment.from):[0,0]),[fx,setFx]=useState<Celebration|null>(null),[letters,setLetters]=useState<string|null>(null)
 const [card,setCard]=useState<Card|null>(null)
 const [caption,setCaption]=useState<string>(''),[tag,setTag]=useState<{x:number;y:number;text:string;side:0|1}|null>(null)
 const [reduced,setReduced]=useState(false),[narrow,setNarrow]=useState(false),VW=narrow?NARROW:WIDE
 // the minute the scoreboard's arrows read: which way each side is attacking now
 const [clock,setClock]=useState<number>(()=>segment?.from??0)
 useEffect(()=>{onClock?.(clock)},[clock]) // eslint-disable-line react-hooks/exhaustive-deps
 const canvas=useRef<HTMLCanvasElement>(null),raf=useRef(0),speedRef=useRef(1)
 speedRef.current=speed
 useEffect(()=>{setReduced(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false);const q=window.matchMedia?.('(max-width: 619px)');if(!q)return;const on=()=>setNarrow(q.matches);on();q.addEventListener?.('change',on);return()=>q.removeEventListener?.('change',on)},[])
 const closingAny=useMemo(()=>closingFor(reel),[reel]),closing=closingAny&&allow.fx.includes(closingAny)?closingAny:null
 const end=useCallback(()=>setPhase(outro?{k:'closing'}:{k:'break'}),[outro])
 const next=useCallback((i:number)=>{if(i+1<scenes.length)setPhase({k:'title',i:i+1});else end()},[scenes.length,end])
 const clearGoal=()=>{setFx(null);setLetters(null);setCard(null)}

 // the title card between scenes: the minute and what is coming — and, when the ends have changed since the last scene, the change of ends first
 useEffect(()=>{
  if(phase.k!=='title')return
  const m=scenes[phase.i]?.moment;if(!m){setPhase(scenes.length||outro?(outro?{k:'closing'}:{k:'break'}):{k:'quiet'});return}
  const prev=phase.i>0?scenes[phase.i-1]!.moment.minute:segment&&segment.from>0?segment.from:null,why=endsChange(prev,m.minute)
  if(why){setPhase({k:'ends',i:phase.i,why});return}
  clearGoal();setTag(null);setClock(m.minute);setCaption(`${m.label??`${m.minute}′`} · ${reel.teams[m.side]!.name}`)
  const id=window.setTimeout(()=>setPhase({k:'scene',i:phase.i}),reduced?700:900/speedRef.current);return()=>window.clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[phase,scenes,reel,reduced])
 // the change of ends: the whole ground, each side's arrow turning round
 useEffect(()=>{
  if(phase.k!=='ends')return
  const m=scenes[phase.i]!.moment,c=canvas.current?.getContext('2d');clearGoal();setTag(null);setCaption(ENDS[phase.why]);sound?.('whistle')
  const before=phase.i>0?scenes[phase.i-1]!.moment.minute:segment?.from??0,ms=reduced?1300:2200/speedRef.current,t0=performance.now()
  const step=(now:number)=>{const u=reduced?1:Math.min(1,(now-t0)/ms);if(c)drawEnds(c,reel.teams,before,m.minute,u,pal,VW);if(u<.5)setClock(before);else setClock(m.minute);if(u<1)raf.current=requestAnimationFrame(step)}
  raf.current=requestAnimationFrame(step)
  const id=window.setTimeout(()=>{setClock(m.minute);setCaption(`${m.label??`${m.minute}′`} · ${reel.teams[m.side]!.name}`);setPhase({k:'scene',i:phase.i})},ms+(reduced?600:500))
  return()=>{window.clearTimeout(id);cancelAnimationFrame(raf.current)}
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[phase])
 // the closing card
 useEffect(()=>{
  if(phase.k!=='closing')return
  setScore(reel.final);setTag(null);setCard(null);sound?.('final')
  setCaption(`Full time · ${reel.teams[0]!.name} ${reel.final[0]}–${reel.final[1]} ${reel.teams[1]!.name}${reel.pens?` (${reel.pens[0]}–${reel.pens[1]} on penalties)`:''}`)
  setFx(closing);setLetters(!closing&&closingAny?LETTERS[closingAny]:null)
  const id=window.setTimeout(()=>setPhase({k:'done'}),closingAny?(closing?FX[closing].ms:1400)+1800:1800);return()=>window.clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[phase])
 useEffect(()=>{if(phase.k==='done'||phase.k==='break')onDone?.()},[phase,onDone])
 // a part of a live match with nothing worth showing: the clock runs on to the stop
 useEffect(()=>{if(phase.k!=='quiet'||!segment)return;setCaption(`${segment.from}′–${segment.to}′ · a quiet spell — nothing in the boxes`);const id=window.setTimeout(()=>setPhase({k:'break'}),reduced?900:1800/speedRef.current);return()=>window.clearTimeout(id)},[phase,segment,reduced])
 useEffect(()=>{if(phase.k==='break'&&segment){setScore(scoreAt(segment.to));setTag(null);clearGoal();setClock(segment.to)}},[phase,segment,scoreAt])
 // autoStart: the line-ups hold for a few seconds, then the match kicks off by itself — nobody has to press anything to watch
 useEffect(()=>{if(!autoStart||phase.k!=='lineups')return;const id=window.setTimeout(()=>{sound?.('whistle');setPhase({k:'title',i:0})},reduced?2500:4200);return()=>window.clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[autoStart,phase.k])

 // the scene itself
 useEffect(()=>{
  if(phase.k!=='scene')return
  const sc=scenes[phase.i]!,c=canvas.current?.getContext('2d');if(!c)return
  const fired=new Set<number>(),cam:Cam={L:NaN,D:NaN,t:0},m=sc.moment
  // a name tag only for a man the record names in this moment — the others run the move unnamed
  const named=new Set([m.player,m.assist,m.keeper].filter((x):x is string=>!!x))
  const before=m.kind==='goal'?(m.side?[m.score[0],m.score[1]-1]:[m.score[0]-1,m.score[1]]) as [number,number]:m.score
  setScore(before);clearGoal();setClock(m.minute);setCaption(`${m.label??`${m.minute}′`} · ${sc.variant}`)
  let t=0,last=performance.now()
  const stopAt=reduced?decisive(sc):sc.duration
  const step=(now:number)=>{
   const dt=Math.min(.05,(now-last)/1000)*speedRef.current;last=now;t=reduced?stopAt:Math.min(stopAt,t+dt)
   sc.cues.forEach((q,qi)=>{if(fired.has(qi)||q.t>t)return;fired.add(qi);onCue(sc,q)})
   draw(c,sc,t,cam,allow.yellowCard,pal,reel.teams,VW)
   const holder=currentTag(sc,t,named);if(holder){const a=sc.actors.find(x=>x.id===holder)!,p=actorAt(a,t),w=toWorld(p.x,p.y,sc.dir),sp=toScreen(w.L,w.D,cam),text=`${a.no} ${surname(a.name)}`;setTag(old=>old&&old.text===text&&Math.abs(old.x-sp.x/VW*100)<.4&&Math.abs(old.y-(sp.y-22)/H*100)<.4?old:{x:sp.x/VW*100,y:(sp.y-22)/H*100,text,side:a.team===1?1:0})}
   if(t<stopAt)raf.current=requestAnimationFrame(step)
   else window.setTimeout(()=>next(phase.i),reduced?2200:m.kind==='goal'?1300:500)
  }
  const onCue=(s:Scene,q:Scene['cues'][number])=>{
   if(q.kind==='goal'){
    setScore(m.score)
    const g=goalGraphicFor(reel,m,s,reel.moments),who=reel.teams[m.side]!.lineup.find(p=>p.id===m.player)??null,ast=reel.teams[m.side]!.lineup.find(p=>p.id===m.assist)
    // every goal plays something: our film (or its lettering where the page may not show the film's colours), their muted card
    if(g?.kind==='film'){const ok=allow.fx.includes(g.film)?g.film:null;setFx(ok);setLetters(ok?null:LETTERS[g.film]);setCard({side:m.side,player:who,against:false,hattrick:g.film==='hattrick'})}
    else if(g?.kind==='against'){setFx(null);setLetters(null);setCard({side:m.side,player:who,against:true,hattrick:g.hattrick})}
    sound?.(reel.mine===null||m.side===reel.mine?'goal':'concede')
    setCaption(`GOAL · ${m.label??`${m.minute}′`} · ${who?`${who.no} ${who.name}`:reel.teams[m.side]!.name}${ast&&ast.id!==who?.id?` — assist ${ast.name}`:''}`)}
   else if(q.kind==='kick')sound?.('kick')
   else if(q.kind==='save'){sound?.('save');setCaption(m.kind==='block'?'Blocked!':'Saved!')}
   else if(q.kind==='post')setCaption('Off the post!')
   else if(q.kind==='whistle')sound?.('whistle')
   else if(q.kind==='card-yellow'||q.kind==='card-red'){const who=reel.teams[m.side]!.lineup.find(p=>p.id===m.player);setCaption(`${q.kind==='card-red'?'Red card':allow.yellowCard?'Yellow card':'Booked'} · ${who?`${who.no} ${who.name}`:''}`)}
   else if(q.kind==='caption'&&q.text)setCaption(`${m.label??`${m.minute}′`} · ${q.text}`)
   if(m.kind==='miss'&&q.kind==='kick'&&s.cues.filter(x=>x.kind==='kick').at(-1)===q)window.setTimeout(()=>setCaption(s.moment.shape==='penalty'?'Missed!':'Wide!'),600/speedRef.current)
  }
  raf.current=requestAnimationFrame(step)
  return()=>cancelAnimationFrame(raf.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[phase,scenes,reduced,VW])

 const skipScene=()=>{if(phase.k==='ends')setPhase({k:'scene',i:phase.i});else if(phase.k==='scene'||phase.k==='title')next(phase.i);else if(phase.k==='lineups')setPhase({k:'title',i:0})}
 // a skip during the closing card ends it — a second tap must never restart the card's timer
 const toEnd=()=>{cancelAnimationFrame(raf.current);if(phase.k==='closing')setPhase({k:'done'});else end()}
 const again=()=>{setScore([0,0]);clearGoal();setClock(0);setPhase({k:'lineups'})}
 const T=reel.teams,dir0=attackDir(clock,0),live=phase.k==='scene'||phase.k==='title'||phase.k==='ends'
 const minute=live?(scenes[(phase as {i:number}).i]?.moment.label??`${scenes[(phase as {i:number}).i]?.moment.minute??0}′`):phase.k==='break'||phase.k==='quiet'?`${segment?.to??0}′`:phase.k==='closing'||phase.k==='done'?'FT':'KO'
 const gkey=`${phase.k}:${(phase as {i?:number}).i??''}`
 return <section className={css.theatre} dir="ltr" data-testid="highlights" data-phase={phase.k} aria-label={`Highlights: ${T[0].name} v ${T[1].name}`}>
  {phase.k==='lineups'?<Lineups teams={T} onStart={()=>{sound?.('whistle');setPhase({k:'title',i:0})}}/>:null}
  <div className={css.screen} data-frame={narrow?'narrow':'wide'} hidden={phase.k==='lineups'}>
   <canvas ref={canvas} width={VW} height={H} className={css.canvas} aria-hidden="true"/>
   <header className={css.hud} aria-live="off">
    <span className={css.team}><Mark t={T[0]}/><b>{T[0].code}</b><Arrow d={dir0}/></span>
    <span className={css.score} data-testid="highlights-score"><b>{score[0]}</b><i>{minute}</i><b>{score[1]}</b></span>
    <span className={css.team} data-right><Arrow d={(-dir0) as Dir}/><b>{T[1].code}</b><Mark t={T[1]}/></span>
   </header>
   {tag&&phase.k==='scene'?<span className={css.tag} style={{insetInlineStart:`${tag.x}%`,insetBlockStart:`${tag.y}%`}} data-side={tag.side}>{tag.text}<i aria-hidden="true">▼</i></span>:null}
   {fx?<Fx c={fx} key={`${fx}:${gkey}`}/>:letters?<b className={css.fxText} key={`${letters}:${gkey}`} aria-hidden="true">{letters}</b>:null}
   {card&&phase.k==='scene'?(card.against?<Against key={`a:${gkey}`} team={T[card.side]} player={card.player} hattrick={card.hattrick} from={attackDir(clock,card.side)}/>:<Scorer key={`s:${gkey}`} team={T[card.side]} player={card.player}/>):null}
   {phase.k==='done'?<div className={css.final}><p className={css.finalScore}><span>{T[0].name}</span><b>{reel.final[0]} – {reel.final[1]}</b><span>{T[1].name}</span></p>{reel.pens?<p className={css.small}>{reel.pens[0]}–{reel.pens[1]} on penalties</p>:null}<p className={css.small}>Full time</p></div>:null}
  </div>
  <p className={css.caption} role="status" aria-live="polite">{caption||' '}</p>
  <p className={css.controls}>
   {phase.k==='break'?null:phase.k==='done'?<button type="button" className={`${css.btn} min-h-tap`} onClick={again}>Watch again</button>:<>
    <button type="button" className={`${css.btn} min-h-tap`} onClick={skipScene}>{phase.k==='lineups'?'Kick off':'Next highlight'}</button>
    <button type="button" className={`${css.btn} min-h-tap`} aria-pressed={speed===2} onClick={()=>setSpeed(speed===1?2:1)}>{speed===1?'×2':'×1'}</button>
    <button type="button" className={`${css.btn} ${css.ghost} min-h-tap`} onClick={toEnd}>{outro?'Skip to full time':`Skip to ${segment!.to}′`}</button></>}
   <span className={css.count}>{scenes.length} highlight{scenes.length===1?'':'s'}</span>
  </p>
 </section>
}
/** the club's crest where the repo holds one, otherwise the colour chip */
function Mark({t}:{t:ReelTeam}){const m=teamMark(t)
 // eslint-disable-next-line @next/next/no-img-element -- the club's own crest file, at scoreboard size
 return m.kind==='crest'?<img className={css.hudCrest} src={m.src} alt="" width={139} height={181} decoding="async"/>:<i className={css.chip} style={{background:m.background}} aria-hidden="true"/>}
function Arrow({d}:{d:Dir}){return <i className={css.dir} data-dir={d>0?'right':'left'} aria-label={d>0?'attacking right':'attacking left'}>{d>0?'▶':'◀'}</i>}
function Fx({c}:{c:Celebration}){
 // eslint-disable-next-line @next/next/no-img-element -- an animated, transparent WebP: the bytes are the cut, not re-encoded
 return <img className={css.fx} data-fx={c} src={FX[c].src} alt={FX[c].alt} decoding="async" draggable={false}/>
}
/** after our goal, under the film: the scorer's shirt, back to camera, his name and number on it */
function Scorer({team,player}:{team:ReelTeam;player:ReelPlayer|null}){
 if(!player)return null
 return <div className={css.scorer} data-goal-card="ours"><Shirt art={shirtArt(team,player,true)} className={css.scorerShirt}/><span><b>{surname(player.name)}</b><i>{team.code}</i></span></div>
}
/** the other side's goal: no film — a muted card in their colours, slid in from the end they attack */
function Against({team,player,hattrick,from}:{team:ReelTeam;player:ReelPlayer|null;hattrick:boolean;from:Dir}){
 return <div className={css.against} data-goal-card="against" data-from={from>0?'left':'right'} style={{['--opp' as string]:team.kit.shirt,['--opp-2' as string]:team.kit.second??team.kit.shorts}}>
  {player?<Shirt art={shirtArt(team,player,true)} className={css.againstShirt}/>:null}
  <span className={css.againstText}><b>{hattrick?'Hat-trick':'Goal'}</b><i>{team.name}{player?` · ${player.no} ${surname(player.name)}`:''}</i></span>
 </div>
}
function currentTag(sc:Scene,t:number,named:ReadonlySet<string>){let id:string|undefined;for(const q of sc.cues){if(q.t>t)break;if(q.kind==='tag')id=q.actor}const a=id?sc.actors.find(x=>x.id===id):undefined;return a&&a.name&&named.has(a.pid??a.id)?id:undefined}
/** the frame that tells the story when motion is off: the goal, the save, the card */
function decisive(sc:Scene){const q=sc.cues.find(x=>['goal','save','post','card-yellow','card-red','flag'].includes(x.kind))??sc.cues.find(x=>x.kind==='kick');return Math.min(sc.duration,(q?.t??sc.duration)+.25)}
function toScreen(L:number,D:number,cam:Cam,s=S){return {x:(L-cam.L)*s+W/2,y:(D-cam.D)*s*YS+H*HORIZON}}

/* ───────── drawing ───────── */
type Cam={L:number;D:number;t?:number}
const lerp=(a:number,b:number,u:number)=>a+(b-a)*u
const VIEW_D=H/(S*YS)
function clampCam(L:number,D:number):Cam{return {L:Math.max(VIEW_L/2-7,Math.min(LENGTH+7-VIEW_L/2,L)),D:Math.max(-18+VIEW_D*HORIZON,Math.min(WIDTH+11-VIEW_D*(1-HORIZON),D))}}
function draw(c:CanvasRenderingContext2D,sc:Scene,t:number,cam:Cam,yellow:boolean,P:Palette,teams:Reel['teams'],w:number){
 view(w)
 const bs=ballAt(sc.ball,t),bw=toWorld(bs.x,bs.y,sc.dir)
 // the camera leads the ball a little toward the goal it is going to, keeps the goal mouth in the frame once the ball is near it,
 // and never shows past the stands; it eases in scene time, so a slow phone and the ×2 button frame the same shot
 const near=Math.max(0,1-Math.abs((sc.dir>0?LENGTH:0)-bw.L)/30),want=clampCam(bw.L+sc.dir*4,lerp(bw.D,WIDTH/2,near*.45))
 if(Number.isNaN(cam.L)){cam.L=want.L;cam.D=want.D;cam.t=t}else{const k=1-Math.exp(-Math.max(0,t-(cam.t??t))*5.5);cam.L+=(want.L-cam.L)*k;cam.D+=(want.D-cam.D)*k;cam.t=t}
 c.imageSmoothingEnabled=false
 ground(c,cam,P,t)
 goal(c,cam,P,0,sc.dir===-1&&sc.cues.some(q=>q.kind==='net'&&t>=q.t&&t<q.t+.6)?t:null)
 goal(c,cam,P,LENGTH,sc.dir===1&&sc.cues.some(q=>q.kind==='net'&&t>=q.t&&t<q.t+.6)?t:null)
 // people, far to near; the ball where it belongs among them
 const phase=Math.floor(t*10)%4
 const card=sc.cues.find(q=>(q.kind==='card-yellow'||q.kind==='card-red')&&t>=q.t)
 const items=sc.actors.map(a=>{const p=actorAt(a,t),q=actorAt(a,Math.max(0,t-.08)),w=toWorld(p.x,p.y,sc.dir),wq=toWorld(q.x,q.y,sc.dir),dL=w.L-wq.L
  const face=(Math.abs(dL)>.02?Math.sign(dL):Math.sign(bw.L-w.L)||1) as -1|1
  return {a,p,w,face}}).sort((u,v)=>u.w.D-v.w.D)
 let ballDrawn=false
 const drawBall=()=>{const s=toScreen(bw.L,bw.D,cam),lift=Math.round(bs.z*S*.9);c.fillStyle=P.shadow;c.fillRect(Math.round(s.x)-1,Math.round(s.y),3,1);c.fillStyle=P.ball;c.fillRect(Math.round(s.x)-1,Math.round(s.y)-lift-2,3,3);c.fillStyle=P.ballDark;c.fillRect(Math.round(s.x)+(phase%2),Math.round(s.y)-lift-1,1,1);ballDrawn=true}
 for(const {a,p,w,face} of items){
  if(!ballDrawn&&bw.D<w.D)drawBall()
  const s=toScreen(w.L,w.D,cam)
  if(s.x<-12||s.x>W+12||s.y<-30||s.y>H+20)continue
  const look:Look={kit:a.kit,skin:a.skin,hair:a.hair,role:a.role,card:card?(card.kind==='card-red'?'red':yellow?'yellow':null):null}
  drawMan(c,cellOf(),look,p.pose,p.moving?phase:0,face,s.x,s.y,a.dive?((a.dive*sc.dir) as -1|1):undefined,P)
 }
 if(!ballDrawn)drawBall()
 radar(c,sc,t,cam,P,teams,bw)
}
/** the stands, the boards, the grass cut in bands across the length, and every line of the ground */
function ground(c:CanvasRenderingContext2D,cam:Cam,P:Palette,t:number,s=S){
 const at=(L:number,D:number)=>toScreen(L,D,cam,s)
 c.fillStyle=P.ref;c.fillRect(0,0,W,H)
 const far=at(0,-4).y,near=at(0,WIDTH+4).y
 // grass, in bands across the length like the cut of a real pitch
 for(let L=-10.5,i=0;L<LENGTH+10.5;L+=5.25,i++){const a=at(L,0),z=at(L+5.25,0);c.fillStyle=i%2?P.grassA:P.grassB;c.fillRect(Math.floor(a.x),Math.floor(far),Math.ceil(z.x-a.x)+1,Math.ceil(near-far)+1)}
 // the crowd in the far stand and the near one, a little restless
 const flick=Math.floor(t*3)
 for(let y=0;y<far-10;y+=3)for(let x=(y/3)%2?1:0;x<W;x+=3){const k=(x*7+y*13+((x*y+flick)%23===0?3:0))%11;c.fillStyle=k<5?P.skin[k]!:k<8?P.board:P.hair[k%5]!;c.fillRect(x,y,2,2)}
 for(let y=Math.ceil(near+9);y<H;y+=3)for(let x=(y/3)%2?0:1;x<W;x+=3){const k=(x*5+y*11)%11;c.fillStyle=k<5?P.skin[k]!:k<8?P.board:P.hair[k%5]!;c.fillRect(x,y,2,2)}
 // the boards along both touchlines
 c.fillStyle=P.board;c.fillRect(0,Math.floor(far)-10,W,10);c.fillRect(0,Math.ceil(near),W,9)
 c.fillStyle=P.boardText;c.font=`7px ${caps()}`;c.textBaseline='top'
 // the boards slide past with the camera, one message every 72 pixels whatever the zoom
 const off=Math.floor(((cam.L*s)%72+72)%72)
 for(let x=-off-72,i=Math.floor(cam.L*s/72);x<W+72;x+=72,i++){c.fillText(i%2?'ALL FOOTBALL':'FAN LIFE',x,Math.floor(far)-9);c.fillText(i%2?'LEGENDS':'FAN LIFE',x+20,Math.ceil(near)+1)}
 // lines
 c.fillStyle=P.line
 const line=(L1:number,D1:number,L2:number,D2:number)=>{const a=at(L1,D1),z=at(L2,D2);if(Math.abs(a.y-z.y)<1)c.fillRect(Math.floor(Math.min(a.x,z.x)),Math.floor(a.y),Math.ceil(Math.abs(z.x-a.x))+1,1);else{const n=Math.ceil(Math.max(Math.abs(z.y-a.y),Math.abs(z.x-a.x)));for(let i=0;i<=n;i++)c.fillRect(Math.floor(a.x+(z.x-a.x)*i/n),Math.floor(a.y+(z.y-a.y)*i/n),1,1)}}
 line(0,0,LENGTH,0);line(0,WIDTH,LENGTH,WIDTH);line(0,0,0,WIDTH);line(LENGTH,0,LENGTH,WIDTH);line(LENGTH/2,0,LENGTH/2,WIDTH)
 for(const g of [0,LENGTH]){const d=g?-1:1
  line(g,13.85,g+d*16.5,13.85);line(g,54.15,g+d*16.5,54.15);line(g+d*16.5,13.85,g+d*16.5,54.15)
  line(g,24.85,g+d*5.5,24.85);line(g,43.15,g+d*5.5,43.15);line(g+d*5.5,24.85,g+d*5.5,43.15)
  const sp=at(g+d*11,34);c.fillRect(Math.floor(sp.x),Math.floor(sp.y),1,1)
  for(let a=-Math.PI/2;a<=Math.PI/2;a+=.05){const L=g+d*(11+9.15*Math.cos(a)),D=34+9.15*Math.sin(a);if(Math.abs(L-g)>16.5){const p=at(L,D);c.fillRect(Math.floor(p.x),Math.floor(p.y),1,1)}}
 }
 for(let a=0;a<Math.PI*2;a+=.03){const p=at(LENGTH/2+9.15*Math.cos(a),34+9.15*Math.sin(a));c.fillRect(Math.floor(p.x),Math.floor(p.y),1,1)}
 const cs=at(LENGTH/2,34);c.fillRect(Math.floor(cs.x),Math.floor(cs.y),1,1)
}
/** a goal seen from the side: the net behind the line, the far post, the bar running across, the near post */
function goal(c:CanvasRenderingContext2D,cam:Cam,P:Palette,gL:number,shake:number|null,s=S){
 const d=gL?1:-1,at=(L:number,D:number)=>toScreen(L,D,cam,s),fp=at(gL,30.34),np=at(gL,37.66),bk=at(gL+d*2.2,30.34),hh=Math.max(5,Math.round(2.44*s))
 if(Math.max(fp.x,bk.x)<-4||Math.min(fp.x,bk.x)>W+4)return
 const sh=shake===null?0:Math.round(Math.sin(shake*60)),x0=Math.floor(Math.min(fp.x,bk.x)),x1=Math.ceil(Math.max(fp.x,bk.x)),top=Math.floor(fp.y)-hh,low=Math.ceil(np.y)
 // the net: a shadow inside the frame, then the mesh, bulging when the ball hits it
 c.globalAlpha=.28;c.fillStyle=P.shadow;c.fillRect(x0,top,x1-x0+1,low-top);c.globalAlpha=1
 c.fillStyle=P.net
 for(let x=x0;x<=x1;x++)for(let y=top+(x%2);y<low;y+=2)c.fillRect(x+(x===x1?sh:0),y+((x+y)%4===0?sh:0),1,1)
 // the back of the frame, the far post, the bar across, the near post (twice as thick: it is nearer the camera)
 c.fillRect(Math.floor(bk.x),top+2,1,low-top-2);c.fillRect(x0,top,x1-x0+1,1)
 c.fillStyle=P.post
 c.fillRect(Math.floor(fp.x),top,2,hh);c.fillRect(Math.floor(fp.x),top,2,Math.ceil(np.y-fp.y)+1);c.fillRect(Math.floor(np.x)-(d<0?1:0),Math.floor(np.y)-hh,3,hh+1)
}
/** the radar: the whole ground in the corner, all twenty-two in their shirts, the ball, and the camera's window */
function radar(c:CanvasRenderingContext2D,sc:Scene,t:number,cam:Cam,P:Palette,teams:Reel['teams'],bw:{L:number;D:number}){
 const RW=46,RH=30,x0=W-RW-4,y0=H-RH-4,kx=RW/LENGTH,ky=RH/WIDTH
 c.globalAlpha=.62;c.fillStyle=P.ref;c.fillRect(x0-1,y0-1,RW+2,RH+2);c.globalAlpha=.5;c.fillStyle=P.grassB;c.fillRect(x0,y0,RW,RH)
 c.globalAlpha=.8;c.fillStyle=P.line;c.fillRect(x0,y0,RW,1);c.fillRect(x0,y0+RH-1,RW,1);c.fillRect(x0,y0,1,RH);c.fillRect(x0+RW-1,y0,1,RH);c.fillRect(x0+Math.round(RW/2),y0,1,RH)
 c.fillRect(x0,y0+Math.round(13.85*ky),Math.round(16.5*kx),1);c.fillRect(x0,y0+Math.round(54.15*ky),Math.round(16.5*kx),1);c.fillRect(x0+Math.round(16.5*kx),y0+Math.round(13.85*ky),1,Math.round(40.3*ky))
 c.fillRect(x0+RW-Math.round(16.5*kx),y0+Math.round(13.85*ky),Math.round(16.5*kx),1);c.fillRect(x0+RW-Math.round(16.5*kx),y0+Math.round(54.15*ky),Math.round(16.5*kx),1);c.fillRect(x0+RW-1-Math.round(16.5*kx),y0+Math.round(13.85*ky),1,Math.round(40.3*ky))
 c.globalAlpha=1
 for(const a of sc.actors){if(a.team<0)continue;const p=actorAt(a,t),w=toWorld(p.x,p.y,sc.dir);c.fillStyle=a.role==='gk'?(teams[a.team as 0|1].keeper.shirt):a.kit?.shirt??P.line;c.fillRect(x0+Math.round(w.L*kx)-1,y0+Math.round(w.D*ky),2,2)}
 c.fillStyle=P.ball;if(Math.floor(t*6)%2===0)c.fillRect(x0+Math.round(bw.L*kx),y0+Math.round(bw.D*ky)-1,1,1);else c.fillRect(x0+Math.round(bw.L*kx)-1,y0+Math.round(bw.D*ky)-1,2,2)
 // the camera's window
 c.globalAlpha=.55;c.fillStyle=P.line
 const l=x0+Math.round((cam.L-VIEW_L/2)*kx),r=x0+Math.round((cam.L+VIEW_L/2)*kx),top=Math.max(y0,y0+Math.round((cam.D-VIEW_D*HORIZON)*ky)),bot=Math.min(y0+RH-1,y0+Math.round((cam.D+VIEW_D*(1-HORIZON))*ky))
 c.fillRect(Math.max(x0,l),top,Math.min(r,x0+RW)-Math.max(x0,l),1);c.fillRect(Math.max(x0,l),bot,Math.min(r,x0+RW)-Math.max(x0,l),1)
 c.globalAlpha=1
}
/** the change of ends: the whole ground at a glance, each side's arrow turning round to the other goal */
function drawEnds(c:CanvasRenderingContext2D,teams:Reel['teams'],before:number,after:number,u:number,P:Palette,w:number){
 view(w)
 const s=w/LENGTH*.88,cam:Cam={L:LENGTH/2,D:WIDTH/2-6}
 c.imageSmoothingEnabled=false
 ground(c,cam,P,u*3,s);goal(c,cam,P,0,null,s);goal(c,cam,P,LENGTH,null,s)
 const turn=u<.42?0:u>.58?1:(u-.42)/.16
 teams.forEach((tm,side)=>{
  const d0=attackDir(before,side as 0|1),d1=attackDir(after,side as 0|1),d=turn<.5?d0:d1,squash=Math.abs(1-turn*2)
  const lane=side?44:20,shift=(turn<.5?d0:d1)*(8+12*(turn<.5?1-u/.42:Math.min(1,(u-.58)/.42)))
  const p=toScreen(LENGTH/2+shift,lane,cam,s),len=Math.round(46*(w/WIDE)*Math.max(.18,squash)),h=12
  // the arrow: a block in the side's shirt, its head pointing at the goal it now attacks, outlined in ink
  const x=Math.round(p.x-len/2*d),y=Math.round(p.y-h/2)
  c.fillStyle=P.ref;c.fillRect(Math.min(x,x+len*d)-1,y-1,len+2,h+2)
  c.fillStyle=tm.kit.shirt;c.fillRect(Math.min(x,x+len*d),y,len,h)
  if(tm.kit.second){c.fillStyle=tm.kit.second;for(let i=2;i<len-2;i+=6)c.fillRect(Math.min(x,x+len*d)+i,y+1,2,h-2)}
  const tip=x+len*d;for(let i=0;i<9;i++){c.fillStyle=P.ref;c.fillRect(tip+d*i-(d<0?1:0),y-3+i,1,h+6-2*i);c.fillStyle=tm.kit.shirt;if(i>0&&i<8)c.fillRect(tip+d*i-(d<0?1:0),y-2+i,1,h+4-2*i)}
  c.fillStyle=P.boardText;c.font=`8px ${caps()}`;c.textBaseline='middle';c.fillText(tm.code,Math.round(p.x-10),Math.round(p.y)-12)
 })
}
/** the boards' lettering in the weekly's caps face (rule 124), read once from the page's own token; a bare canvas keeps monospace */
let capsFace:string|null=null
const caps=()=>capsFace??=((typeof document!=='undefined'&&getComputedStyle(document.documentElement).getPropertyValue('--mag-mono').trim())||'monospace')
let shared:HTMLCanvasElement|null=null
const cellOf=()=>shared??=Object.assign(document.createElement('canvas'),{width:16,height:20})
export type {Moment}
