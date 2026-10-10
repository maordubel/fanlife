'use client'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import type {GameCopy} from '@/lib/clubs/game-copy'
import {goalPos,screenPosFor,type ShowPlayer,type ShowScript,type Side} from '@/lib/clubs/rumble-show'
import {statsAt,type Move} from '@/lib/clubs/rumble-play'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {Badge} from '@/components/clubs/Badge'
import {RumblePitch,findPlayer} from './RumbleStage'
import {StatBars} from './StatBars'
import {buildLine,endLine,stepLine} from './commentary'
import {shortName,tr,type Sfx} from './shared'
import s from './rumble.module.css'

type Step='kickoff'|'playing'|'ht'|'goal'|'full-time'
type Tab='live'|'stats'|'teams'
export type ClubFace={id:string;name:string}
const SPEEDS=[1,2,4] as const
const other=(x:Side):Side=>x==='us'?'them':'us'

/**
 * The match centre. It plays the script the server staged and decides nothing: kick-off → the clock runs to each move → the ball
 * goes from man to man → it ends (goal, save, tackle, corner, card …) → … → half time → … → full time. Commentary, stats and
 * line-ups sit beside the pitch like a match centre; the speed button is a manager's "fast forward".
 */
export function RumbleMatchCentre({script,wardrobe,copy,reduced,sound,onSound,soundOn,onDone,usClub,themClub}:{script:ShowScript;wardrobe:RumbleWardrobe;copy:GameCopy;reduced:boolean;sound:(n:Sfx,v?:number)=>void;onSound:()=>void;soundOn:boolean;onDone:()=>void;usClub:ClubFace;themClub:ClubFace}){
 const play=script.play!,eleven=script.format==='eleven'
 const [step,setStep]=useState<Step>('kickoff'),[tab,setTab]=useState<Tab>('live')
 const [clock,setClock]=useState(0),[score,setScore]=useState({us:0,them:0}),[statMin,setStatMin]=useState(0)
 const [active,setActive]=useState<{side:Side;id:string}|null>(null),[ball,setBall]=useState<{x:number;y:number}|null>({x:50,y:50}),[trail,setTrail]=useState<{x:number;y:number;side:Side}[]>([])
 const [line,setLine]=useState(tr(copy,'rr.mc.kickoffLine',{us:usClub.name,them:themClub.name})),[sub,setSub]=useState<string|null>(null)
 const [moment,setMoment]=useState<Move|null>(null),[carded,setCarded]=useState<Move|null>(null),[log,setLog]=useState<Move[]>([])
 const [speed,setSpeed]=useState<1|2|4>(1)
 const timers=useRef<number[]>([]),done=useRef(false),finishRef=useRef<(skipped:boolean)=>void>(()=>undefined),speedRef=useRef<number>(1)
 const cbs=useRef({onDone,sound});cbs.current={onDone,sound}
 speedRef.current=speed*(reduced?3:1)
 const pos=useCallback((p:ShowPlayer)=>screenPosFor(p,eleven),[eleven])
 const stats=useMemo(()=>statsAt(play,statMin),[play,statMin])

 useEffect(()=>{
  let cancelled=false;timers.current=[]
  const wait=(ms:number)=>new Promise<void>(r=>{timers.current.push(window.setTimeout(r,ms/speedRef.current))})
  const RUN_MS=eleven?18000:12000,STEP_MS=eleven?300:380,HOLD=eleven?700:900
  async function runClock(from:number,to:number){const ms=(Math.max(0,to-from)/90)*RUN_MS,steps=Math.max(1,Math.round(ms/120));for(let i=1;i<=steps;i++){await wait(ms/steps);if(cancelled)return;setClock(Math.round(from+((to-from)*i)/steps))}}
  function finish(skipped:boolean){
   if(done.current)return;done.current=true
   setClock(90);setScore({us:script.final.us,them:script.final.them});setLog(play.moves);setStatMin(90);setMoment(null);setCarded(null);setActive(null);setBall(null);setTrail([]);setStep('full-time')
   cbs.current.sound('final',.5);window.setTimeout(()=>cbs.current.sound('roar',.4),200)
   timers.current.push(window.setTimeout(()=>cbs.current.onDone(),skipped?500:1100))
  }
  finishRef.current=finish
  const mine=(side:Side)=>side==='us'?script.us:script.them
  async function run(){
   cbs.current.sound('kickoff',.45)
   await wait(900);if(cancelled)return
   setStep('playing');let at=0,half=false
   for(const m of play.moves){
    if(!half&&m.minute>45){
     await runClock(at,45);if(cancelled)return;at=45;half=true
     setStep('ht');setTab('stats');setStatMin(45);setLine(tr(copy,'rr.mc.htBody'));setSub(null);setBall({x:50,y:50});setTrail([])
     await wait(2400);if(cancelled)return
     setStep('playing');setTab('live')
    }
    await runClock(at,m.minute);if(cancelled)return;at=m.minute
    const t=mine(m.side)
    let first=true
    setTrail([])
    for(const st of m.steps){
     const to=t.find(p=>p.id===st.to)??t[0]!,pt=pos(to)
     setActive({side:m.side,id:to.id});setBall(pt);setTrail(t0=>[...t0.slice(-3),{...pt,side:m.side}])
     if(first||st===m.steps[m.steps.length-1])setLine(stepLine(copy,script,m.side,st,m.variant+(first?0:1)))
     first=false
     await wait(STEP_MS);if(cancelled)return
    }
    const shooter=t.find(p=>p.id===m.shooter),def=mine(other(m.side)),by=def.find(p=>p.id===m.by),keeper=def.find(p=>p.id===m.keeper)
    setLine(endLine(copy,script,m));setSub(buildLine(copy,script,m))
    if(m.end==='goal'){
     setBall(goalPos(m.side));cbs.current.sound('kick',.5)
     await wait(380);if(cancelled)return
     setScore(m.score);setMoment(m);setStep('goal');cbs.current.sound(m.side==='us'?'goal':'concede',m.side==='us'?.9:.7)
     setLog(l=>[...l,m]);setStatMin(m.minute)
     await wait(2100);if(cancelled)return
     setMoment(null);setBall({x:50,y:50});setActive(null);setTrail([]);setStep('playing')
    }else{
     const g=goalPos(m.side)
     if(m.end==='save'&&keeper)setBall(pos(keeper))
     else if(m.end==='miss')setBall({x:84,y:g.y<50?6:94})
     else if(m.end==='post')setBall({x:44,y:g.y<50?2:98})
     else if((m.end==='block'||m.end==='tackle'||m.end==='intercept'||m.end==='clear'||m.end==='foul'||m.end==='card')&&by)setBall(pos(by))
     else if(m.end==='corner')setBall({x:m.side==='us'?96:4,y:g.y<50?3:97})
     else if(m.end==='offside')setBall(shooter?pos(shooter):null)
     if(m.end==='card')setCarded(m)
     if(m.end==='card'||m.end==='foul')cbs.current.sound('kick',.25)
     setLog(l=>[...l,m]);setStatMin(m.minute)
     await wait(HOLD);if(cancelled)return
     setCarded(null);setBall({x:50,y:50});setActive(null);setTrail([])
    }
    setLine(tr(copy,'rr.mc.calm'));setSub(null)
   }
   await runClock(at,90);if(cancelled)return
   finish(false)
  }
  void run()
  return()=>{cancelled=true;timers.current.forEach(id=>window.clearTimeout(id));timers.current=[]}
  // one script, one show
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[script])
 const skip=useCallback(()=>{if(done.current)return;timers.current.forEach(id=>window.clearTimeout(id));timers.current=[];finishRef.current(true)},[])
 const scorer=moment?findPlayer(script,moment.side,moment.shooter):undefined,assist=moment?findPlayer(script,moment.side,moment.assist):undefined
 const booked=carded?findPlayer(script,other(carded.side),carded.by):undefined
 const cards=useMemo(()=>{const m=new Map<string,number>();for(const x of log)if(x.end==='card'&&x.by)m.set(other(x.side)+x.by,(m.get(other(x.side)+x.by)??0)+1);return m},[log])
 const lastLog=[...log].reverse()
 return <section className={s.stage} data-testid="rumble-match" data-step={step} data-format={script.format}>
  <div className={s.showGrid}>
   <div className={s.showHead}>
    <div className={s.scoreStrip}>
     <div className={s.scoreSide} data-side="us"><Badge club={usClub} className={s.scoreBadge}/><b dir="auto">{usClub.name}</b></div>
     <div className={s.scoreMid}><p className={s.boardScore} dir="ltr" data-testid="rumble-score">{score.us}–{score.them}</p><p className={`${s.mono} ${s.scoreClock}`} dir="ltr">{String(clock).padStart(2,'0')}′{script.formation?` · ${script.formation}`:''}</p></div>
     <div className={s.scoreSide} data-side="them"><Badge club={themClub} className={s.scoreBadge}/><b dir="auto">{themClub.name}</b></div>
    </div>
    <p className={s.mcLine} role="status" aria-live="polite" data-testid="rumble-line">{line}</p>
    {sub&&<p className={s.mcSub}>{sub}</p>}
   </div>
   <div className={s.showPitch}><RumblePitch us={script.us} them={script.them} usCount={script.us.length} themCount={script.them.length} wardrobe={wardrobe} copy={copy} active={active} ball={ball} trail={trail}>
    {moment&&scorer&&<div className={s.goalBand} data-ours={moment.side==='us'} role="status" aria-live="assertive">
     <b>{tr(copy,moment.side==='us'?'rr.goalUs':'rr.goalThem')}</b>
     <p style={{fontWeight:700,fontSize:15}}><bdi>{shortName(scorer.name)}</bdi> <bdi className={s.mono} dir="ltr">{moment.minute}′</bdi></p>
     {assist&&<p style={{fontSize:12}}>{tr(copy,'rr.assist',{name:shortName(assist.name)})}</p>}
     <p className={s.display} style={{fontSize:28,marginTop:4}} dir="ltr">{moment.score.us}–{moment.score.them}</p>
    </div>}
    {carded&&booked&&<div className={s.bookBand} role="status"><i aria-hidden="true"/><span><bdi>{shortName(booked.name)}</bdi> <bdi className={s.mono} dir="ltr">{carded.minute}′</bdi></span></div>}
    {step==='kickoff'&&<div className={s.overlay}><p>{tr(copy,'rr.kickoff')}</p></div>}
    {step==='ht'&&<div className={s.overlay}><p>{tr(copy,'rr.mc.ht')} · <span dir="ltr">{score.us}–{score.them}</span></p></div>}
    {step==='full-time'&&<div className={s.overlay}><p>{tr(copy,'rr.fullTime')}</p></div>}
   </RumblePitch></div>
   <div className={s.showSide}>
    <div className={s.mcTabs} role="tablist" aria-label={tr(copy,'rr.live')}>
     {(['live','stats','teams'] as const).map(id=><button key={id} type="button" role="tab" aria-selected={tab===id} className={`${s.mcTab} min-h-tap`} onClick={()=>setTab(id)}>{tr(copy,`rr.mc.tab.${id}`)}</button>)}
    </div>
    <div className={s.mcPanel} role="tabpanel">
     {tab==='live'&&(lastLog.length?<ol className={s.feed} data-testid="rumble-feed">{lastLog.map(m=><li key={m.id} data-side={m.side} data-end={m.end}><bdi dir="ltr">{m.minute}′</bdi><span><b data-end={m.end} aria-hidden="true"/>{endLine(copy,script,m)}</span></li>)}</ol>:<p className={s.mcEmpty}>{tr(copy,'rr.mc.calm')}</p>)}
     {tab==='stats'&&<><StatBars stats={stats} copy={copy} testId="rumble-stats"/><p className={s.mcNote}>{tr(copy,'rr.mc.xgNote')}</p></>}
     {tab==='teams'&&<div className={s.teams}>
      {([['us',usClub,script.us],['them',themClub,script.them]] as const).map(([side,club,players])=><section key={side} data-side={side}><h3><Badge club={club} className={s.teamBadge}/> <bdi>{club.name}</bdi></h3><ol>{players.map(p=><li key={p.id}><span className={s.mono}>{p.slot?tr(copy,`rr.fines.${p.slot}`):''}</span><bdi dir="auto">{p.name}</bdi>{cards.get(side+p.id)?<i className={s.yc} aria-label={tr(copy,'rr.mc.stat.booked')}/>:null}</li>)}</ol></section>)}
     </div>}
    </div>
    <div className={s.mcControls}>
     <div role="group" aria-label={tr(copy,'rr.mc.speed')} className={s.speed}>{SPEEDS.map(v=><button key={v} type="button" className={`${s.ghostBtn} min-h-tap`} aria-pressed={speed===v} onClick={()=>setSpeed(v)}>{v}×</button>)}</div>
     <button type="button" className={`${s.ghostBtn} min-h-tap`} aria-pressed={soundOn} onClick={onSound}>{tr(copy,soundOn?'rr.sound':'rr.soundOff')}</button>
     <button type="button" className={`${s.ghostBtn} min-h-tap`} style={{flex:1}} onClick={skip} disabled={step==='full-time'} data-testid="rumble-skip">{tr(copy,'rr.skip')}</button>
    </div>
   </div>
  </div>
 </section>
}
