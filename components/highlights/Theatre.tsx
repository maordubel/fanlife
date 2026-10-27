'use client'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {PALETTE as BASE,type Palette} from '@/lib/highlights/kit'
import {FX} from '@/lib/highlights/fx'
import {closingFor,goalGraphicFor,sceneFor,storyOf,type Scene} from '@/lib/highlights/scenes'
import {attackDir,endsChange,type Dir} from '@/lib/highlights/pitch'
import {shirtArt,surname,teamMark} from '@/lib/highlights/board'
import {CELEBRATIONS,type Celebration,type Moment,type Reel,type ReelPlayer,type ReelTeam} from '@/lib/highlights/types'
import {H,NARROW,RES,WIDE,draw,drawEnds,freshCam,tagAt} from './paint'
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
// a man is a bigger pixel there and the camera pans more. The picture itself is `paint.ts`.
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
  const fired=new Set<number>(),cam=freshCam(),m=sc.moment
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
   const holder=currentTag(sc,t,named);if(holder){const a=sc.actors.find(x=>x.id===holder)!,at=tagAt(sc,holder,t,cam,VW),text=`${a.no} ${surname(a.name)}`;setTag(old=>old&&old.text===text&&Math.abs(old.x-at.x)<.4&&Math.abs(old.y-at.y)<.4?old:{...at,text,side:a.team===1?1:0})}
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
   <canvas ref={canvas} width={VW*RES} height={H*RES} className={css.canvas} aria-hidden="true"/>
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
export type {Moment}
