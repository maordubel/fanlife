'use client'
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react'
import type {GameCopy} from '@/lib/clubs/game-copy'
import {goalPos,screenPos,type ShowEvent,type ShowPlayer,type ShowScript,type Side} from '@/lib/clubs/rumble-show'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {Bulbs,RumbleShirt,money,posShort,shortName,tr,type Sfx} from './shared'
import s from './rumble.module.css'

/* ---------------------------------------------------------------- the pitch both fives stand on (port of RumblePitchFive) */

function Token({p,shown,active,pulse,wardrobe,copy}:{p:ShowPlayer;shown:boolean;active:boolean;pulse:boolean;wardrobe:RumbleWardrobe;copy:GameCopy}){
 const at=screenPos(p)
 return <div className={s.token} style={{insetInlineStart:`${at.x}%`,insetBlockStart:`${at.y}%`}} data-shown={shown} data-active={active} data-pulse={pulse} data-side={p.side} data-testid={`rumble-token-${p.side}`}>
  <div className={s.tokenBody}>
   <span className={s.tokenShirt}><RumbleShirt card={p} side={p.side} wardrobe={wardrobe}/></span>
   <span className={s.tokenName} dir="auto">{shortName(p.name)}</span>
   <span className={`${s.mono} ${s.tokenPos}`}>{posShort(copy,p.position)}</span>
  </div>
 </div>
}

export function RumblePitch({us,them,usCount,themCount,wardrobe,copy,active,ball,pulse=false,children}:{us:ShowPlayer[];them:ShowPlayer[];usCount:number;themCount:number;wardrobe:RumbleWardrobe;copy:GameCopy;active?:{side:Side;id:string}|null;ball?:{x:number;y:number}|null;pulse?:boolean;children?:ReactNode}){
 return <div className={s.pitch} data-testid="rumble-pitch">
  {['half','circle','box-top','box-bottom','goal-top','goal-bottom'].map(l=><i key={l} data-line={l}/>)}
  {us.map((p,i)=><Token key={`us-${p.id}`} p={p} shown={i<usCount} active={active?.side==='us'&&active.id===p.id} pulse={pulse} wardrobe={wardrobe} copy={copy}/>)}
  {them.map((p,i)=><Token key={`them-${p.id}`} p={p} shown={i<themCount} active={active?.side==='them'&&active.id===p.id} pulse={false} wardrobe={wardrobe} copy={copy}/>)}
  {ball&&<span className={s.ball} style={{insetInlineStart:`${ball.x}%`,insetBlockStart:`${ball.y}%`}} aria-hidden="true"/>}
  {children}
 </div>
}

/* ---------------------------------------------------------------- your entrance, theirs, head to head */

const ARRIVAL_MS=[520,580,640,640,700]
export type RevealStep='entrance'|'five'|'opponent'|'h2h'
/**
 * GK → DF → MF → MF → FW walk on one at a time, the five breathes once, then theirs (300 ms each),
 * then both bills under one VS. The opponent was fixed before the first pick: nothing here reacts.
 * Reduced motion: everyone is stamped into place and each step simply holds.
 */
export function RumbleReveal({script,step,onStep,onDone,wardrobe,copy,reduced}:{script:ShowScript;step:RevealStep;onStep:(s:RevealStep)=>void;onDone:()=>void;wardrobe:RumbleWardrobe;copy:GameCopy;reduced:boolean}){
 const [usCount,setUs]=useState(reduced?5:0),[themCount,setThem]=useState(reduced?5:0)
 useEffect(()=>{
  const t:number[]=[],at=(ms:number,f:()=>void)=>t.push(window.setTimeout(f,ms))
  if(step==='entrance'){
   if(reduced){setUs(script.us.length);at(900,()=>onStep('five'))}
   else if(usCount<script.us.length)at(ARRIVAL_MS[usCount]??600,()=>setUs(n=>n+1))
   else at(80,()=>onStep('five'))
  }else if(step==='five')at(reduced?900:1000,()=>onStep('opponent'))
  else if(step==='opponent'){
   if(reduced){setThem(script.them.length);at(900,()=>onStep('h2h'))}
   else if(themCount<script.them.length)at(300,()=>setThem(n=>n+1))
   else at(500,()=>onStep('h2h'))
  }else at(reduced?1400:1800,onDone)
  return()=>t.forEach(id=>window.clearTimeout(id))
  // the parent only ever moves the step forward
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[step,usCount,themCount,reduced])
 const ours=step==='entrance'||step==='five'
 const arrived=script.us[Math.min(usCount,script.us.length)-1]
 return <section className={s.stage} data-testid="rumble-reveal" data-step={step}>
  <div className={s.showGrid}>
   <div className={s.showHead}>
    <p className={`${s.mono} ${s.stageKicker}`}>{tr(copy,ours?'rr.entranceKicker':step==='opponent'?'rr.opponentKicker':'rr.h2h')}</p>
    <h2 className={s.stageTitle}>{tr(copy,step==='five'?'rr.entranceFive':ours?'rr.entranceTitle':step==='opponent'?'rr.opponentTitle':'rr.h2h')}</h2>
    <p className={s.stageLine} aria-live="polite">{step==='entrance'&&arrived?<><span className={s.mono}>{posShort(copy,arrived.position)}</span> · <bdi>{arrived.name}</bdi></>:''}</p>
    <Bulbs n={15} className={`${s.bulbs} ${s.stageBulbs}`}/>
   </div>
   <div className={s.showPitch}><RumblePitch us={script.us} them={ours?[]:script.them} usCount={usCount} themCount={themCount} wardrobe={wardrobe} copy={copy} pulse={step==='five'}/></div>
   <div className={s.showSide}>{step==='h2h'&&<div className={s.bills}><p dir="ltr">{money(script.bills.us)}</p><span className={s.vs}>{tr(copy,'rr.vs')}</span><p dir="ltr">{money(script.bills.them)}</p></div>}</div>
  </div>
 </section>
}

/* ---------------------------------------------------------------- the match (port of RumbleMatchStage + RumbleGoalMoment) */

const RUN_MS=12000,GOAL_HOLD=2400,MOMENT_HOLD=1400
export const findPlayer=(script:ShowScript,side:Side,id:string|undefined)=>id?(side==='us'?script.us:script.them).find(p=>p.id===id):undefined
export function eventLine(copy:GameCopy,script:ShowScript,e:ShowEvent):string{
 const def:Side=e.side==='us'?'them':'us',name=(id?:string,side:Side=e.side)=>{const p=findPlayer(script,side,id);return p?shortName(p.name):''}
 return tr(copy,`rr.${e.type}.${e.variant}`,{name:name(e.player),keeper:name(e.keeper,def),other:name(e.other,def)})
}

/**
 * It plays the script the server staged and decides nothing: kickoff → the clock runs to each moment →
 * the moment holds → … → 90 → full time. Skip just reads `script.final`.
 */
export function RumbleMatch({script,wardrobe,copy,reduced,sound,onSound,soundOn,onDone}:{script:ShowScript;wardrobe:RumbleWardrobe;copy:GameCopy;reduced:boolean;sound:(n:Sfx,v?:number)=>void;onSound:()=>void;soundOn:boolean;onDone:()=>void}){
 const [step,setStep]=useState<'kickoff'|'playing'|'goal'|'full-time'>('kickoff')
 const [clock,setClock]=useState(0),[score,setScore]=useState({us:0,them:0})
 const [active,setActive]=useState<{side:Side;id:string}|null>(null),[ball,setBall]=useState<{x:number;y:number}|null>({x:50,y:50})
 const [line,setLine]=useState(tr(copy,'rr.matchLive')),[moment,setMoment]=useState<ShowEvent|null>(null),[log,setLog]=useState<ShowEvent[]>([])
 const timers=useRef<number[]>([]),done=useRef(false),finishRef=useRef<(skipped:boolean)=>void>(()=>undefined)
 const cbs=useRef({onDone,sound});cbs.current={onDone,sound}
 const speed=reduced?0.35:1
 useEffect(()=>{
  let cancelled=false;timers.current=[]
  const wait=(ms:number)=>new Promise<void>(r=>{timers.current.push(window.setTimeout(r,ms*speed))})
  async function runClock(from:number,to:number){const ms=(Math.max(0,to-from)/90)*RUN_MS,steps=Math.max(1,Math.round(ms/120));for(let i=1;i<=steps;i++){await wait(ms/steps);if(cancelled)return;setClock(Math.round(from+((to-from)*i)/steps))}}
  function finish(skipped:boolean){
   if(done.current)return;done.current=true
   setClock(90);setScore({us:script.final.us,them:script.final.them});setLog(script.events);setMoment(null);setActive(null);setBall(null);setStep('full-time')
   cbs.current.sound('final',.5);window.setTimeout(()=>cbs.current.sound('roar',.4),200)
   timers.current.push(window.setTimeout(()=>cbs.current.onDone(),skipped?500:1000))
  }
  finishRef.current=finish
  async function play(){
   cbs.current.sound('kickoff',.45)
   await wait(800);if(cancelled)return
   setStep('playing');let at=0
   for(const e of script.events){
    await runClock(at,e.minute);if(cancelled)return;at=e.minute
    const shooter=findPlayer(script,e.side,e.player)
    setActive(shooter?{side:e.side,id:shooter.id}:null);setBall(shooter?screenPos(shooter):null);setLine(eventLine(copy,script,e));setLog(l=>[...l,e])
    await wait(520);if(cancelled)return
    if(e.type==='goal'){
     setBall(goalPos(e.side));cbs.current.sound('kick',.5)
     await wait(420);if(cancelled)return
     setScore(e.scoreAfter);setMoment(e);setStep('goal');cbs.current.sound(e.side==='us'?'goal':'concede',e.side==='us'?.9:.7)
     await wait(GOAL_HOLD-940);if(cancelled)return
     setMoment(null);setBall({x:50,y:50});setActive(null);setStep('playing')
    }else{
     const keeper=findPlayer(script,e.side==='us'?'them':'us',e.keeper),g=goalPos(e.side)
     setBall(e.type==='save'&&keeper?screenPos(keeper):{x:e.type==='miss'?84:50,y:g.y<50?6:94})
     await wait(MOMENT_HOLD-520);if(cancelled)return
     setBall({x:50,y:50});setActive(null)
    }
    setLine(tr(copy,'rr.matchLive'))
   }
   await runClock(at,90);if(cancelled)return
   finish(false)
  }
  void play()
  return()=>{cancelled=true;timers.current.forEach(id=>window.clearTimeout(id));timers.current=[]}
  // one script, one show
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[script])
 const skip=useCallback(()=>{if(done.current)return;timers.current.forEach(id=>window.clearTimeout(id));timers.current=[];finishRef.current(true)},[])
 const scorer=moment?findPlayer(script,moment.side,moment.player):undefined,assist=moment?findPlayer(script,moment.side,moment.assist):undefined
 return <section className={s.stage} data-testid="rumble-match" data-step={step}>
  <div className={s.showGrid}>
  <div className={`${s.board} ${s.showHead}`}>
   <div><p className={`${s.mono} ${s.stageKicker}`}>{tr(copy,'rr.live')}</p><p className={s.display} style={{fontSize:20}}>{tr(copy,'gate.royal-rumble')}</p></div>
   <p className={s.boardScore} dir="ltr" data-testid="rumble-score">{score.us}–{score.them}</p>
   <div className={s.boardClock}><p className={`${s.mono} ${s.stageKicker}`}>{tr(copy,'rr.clock')}</p><b dir="ltr">{String(clock).padStart(2,'0')}:00</b></div>
  </div>
  <div className={s.showPitch}><RumblePitch us={script.us} them={script.them} usCount={5} themCount={5} wardrobe={wardrobe} copy={copy} active={active} ball={ball}>
   {moment&&scorer&&<div className={s.goalBand} data-ours={moment.side==='us'} role="status" aria-live="assertive">
    <b>{tr(copy,moment.side==='us'?'rr.goalUs':'rr.goalThem')}</b>
    <p style={{fontWeight:700,fontSize:15}}><bdi>{shortName(scorer.name)}</bdi> <bdi className={s.mono} dir="ltr">{moment.minute}′</bdi></p>
    {assist&&<p style={{fontSize:12}}>{tr(copy,'rr.assist',{name:shortName(assist.name)})}</p>}
    <p className={s.display} style={{fontSize:28,marginTop:4}} dir="ltr">{moment.scoreAfter.us}–{moment.scoreAfter.them}</p>
   </div>}
   {step==='kickoff'&&<div className={s.overlay}><p>{tr(copy,'rr.kickoff')}</p></div>}
   {step==='full-time'&&<div className={s.overlay}><p>{tr(copy,'rr.fullTime')}</p></div>}
  </RumblePitch></div>
  <div className={s.showSide}>
  <div className={s.liveRow}>
   <div className={s.live}><span className={s.mono}>{tr(copy,'rr.live')}</span><p aria-live="polite">{line}</p></div>
  </div>
  <div className={s.liveRow}>
   <button type="button" className={`${s.ghostBtn} min-h-tap`} aria-pressed={soundOn} onClick={onSound}>{tr(copy,soundOn?'rr.sound':'rr.soundOff')}</button>
   <button type="button" className={`${s.ghostBtn} min-h-tap`} style={{flex:1}} onClick={skip} disabled={step==='full-time'} data-testid="rumble-skip">{tr(copy,'rr.skip')}</button>
  </div>
  {log.length>0&&<ol className={s.ticker} aria-hidden="true">{[...log].reverse().map(e=><li key={e.id} data-side={e.side} data-goal={e.type==='goal'}><bdi dir="ltr">{e.minute}′</bdi><span>{eventLine(copy,script,e)}</span></li>)}</ol>}
  </div>
  </div>
 </section>
}
