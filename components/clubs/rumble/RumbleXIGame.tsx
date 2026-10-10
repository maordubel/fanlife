'use client'
import {useEffect,useMemo,useRef,useState,type MouseEvent} from 'react'
import {playRumbleXI} from '@/app/clubs/[slug]/[gate]/gate-actions'
import {gameCopy,xiCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import type {RumbleCard} from '@/lib/clubs/rumble'
import {canAfford,type ShowScript} from '@/lib/clubs/rumble-show'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {slotsOf} from '@/lib/clubs/rumble-xi/formations'
import {XI_BUDGET,type FormationId} from '@/lib/clubs/rumble-xi/types'
import {firePickFxAt} from '@/components/stage/PickFx'
import {Crown,RumbleShirt,money,shortName,tr,useReducedMotion,useRumbleSound} from './shared'
import {RumbleSlotMachine} from './RumbleSlotMachine'
import {RumbleReveal,type RevealStep} from './RumbleStage'
import {RumbleMatchCentre,type ClubFace} from './RumbleMatchCentre'
import {RumbleFullTime,type RecentRound} from './RumbleFullTime'
import {RecordRun} from '../games/RecordRun'
import s from './rumble.module.css'

type Board={seed:number;draft:RumbleCard[][]}
type Phase='draft'|'jackpot'|'reveal'|'match'|'result'
const HISTORY_MAX=8
const left_=(slotY:number)=>8+((slotY-20)/64)*84

/**
 * Gate 9, eleven a side (€35M). The same machine, the same show — on a pitch of eleven slots. Tap a slot, the reels roll three men of
 * that family, the pick flies to its place. The board is dealt on the server from the round seed; the eleven is checked, the match
 * decided and staged on the server (`playRumbleXI`). This screen only shows what it is handed.
 */
export function RumbleXIGame({club,version,locale,main,shuffle,formation,rival,wardrobe,faces,againHref,playerCount,roundSeed}:{roundSeed:number;club:string;version:string;locale:UiLocale;main:Board;shuffle:Board;formation:FormationId;rival:string;wardrobe:RumbleWardrobe;faces:{us:ClubFace;them:ClubFace};againHref:string;playerCount:number}){
 const copy=xiCopy(gameCopy(locale)),reduced=useReducedMotion(),sound=useRumbleSound(),slots=useMemo(()=>slotsOf(formation),[formation])
 const [board,setBoard]=useState<Board>(main),[shuffled,setShuffled]=useState(false),[fresh,setFresh]=useState(false)
 const [picks,setPicks]=useState<(string|null)[]>(()=>main.draft.map(()=>null)),[slot,setSlot]=useState(0)
 const [phase,setPhase]=useState<Phase>('draft'),[step,setStep]=useState<RevealStep>('entrance')
 const [script,setScript]=useState<ShowScript|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null)
 const [rules,setRules]=useState(false),[recent,setRecent]=useState<RecentRound[]>([])
 const root=useRef<HTMLDivElement>(null),machine=useRef<HTMLDivElement>(null)
 const historyKey=`fan-life:club:${club}:rumble:xi:${formation}:${rival}:recent:v1`

 const chosen=picks.map((id,i)=>id?board.draft[i]!.find(c=>c.id===id)??null:null)
 const spent=chosen.reduce((t,c)=>t+(c?.price||0),0),left=XI_BUDGET-spent,count=chosen.filter(Boolean).length,complete=count===slots.length
 const shuffleOpen=!shuffled&&count===0&&phase==='draft'&&!busy
 const perSlot=count<slots.length?Math.round((left/(slots.length-count))*10)/10:0

 useEffect(()=>{if(phase!=='draft')root.current?.scrollIntoView({block:'start',behavior:reduced?'auto':'smooth'})},[phase,reduced])
 useEffect(()=>{if(!rules)return;const k=(e:KeyboardEvent)=>{if(e.key==='Escape')setRules(false)};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[rules])

 function pick(card:RumbleCard,e:MouseEvent<HTMLButtonElement>){
  if(phase!=='draft'||!canAfford(board.draft,picks,slot,card,XI_BUDGET))return
  setError(null)
  const next=picks.map((x,i)=>i===slot?card.id:x)
  setPicks(next)
  firePickFxAt(e.currentTarget,{label:money(card.price),tone:'red',haptic:card.price>=4.5?'lock':'tap',big:card.price>=4.5})
  const after=next.findIndex((x,i)=>i>slot&&x===null),any=next.findIndex(x=>x===null)
  const to=after>=0?after:any
  if(to>=0){setSlot(to);window.setTimeout(()=>machine.current?.scrollIntoView({block:'nearest',behavior:reduced?'auto':'smooth'}),60)}
 }
 function doShuffle(e:MouseEvent<HTMLButtonElement>){
  if(!shuffleOpen)return
  setBoard(shuffle);setPicks(shuffle.draft.map(()=>null));setSlot(0);setShuffled(true);setFresh(true);setError(null)
  firePickFxAt(e.currentTarget,{tone:'ink',haptic:'tap'});window.setTimeout(()=>setFresh(false),1100)
 }
 async function lock(e:MouseEvent<HTMLButtonElement>){
  if(!complete||left<0||busy)return
  firePickFxAt(e.currentTarget,{label:tr(copy,'rr.lockReady'),tone:'red',big:true,haptic:'lock'})
  setBusy(true);setError(null)
  const res=await playRumbleXI(club,version,board.seed,picks as string[],formation,rival).catch(()=>null)
  setBusy(false)
  if(!res){setError(tr(copy,'rr.invalid'));return}
  setScript(res.script);setStep('entrance');setPhase('jackpot');sound.play('roar',.35)
  const r:RecentRound={seed:board.seed,cost:spent,us:res.goals[0],them:res.goals[1],r:res.verdict==='win'?'W':res.verdict==='draw'?'D':'L'}
  try{const raw=JSON.parse(window.localStorage.getItem(historyKey)||'[]') as unknown;const prev=Array.isArray(raw)?raw.filter((x):x is RecentRound=>!!x&&typeof x==='object'&&typeof (x as RecentRound).seed==='number'):[];const next=[r,...prev.filter(x=>x.seed!==r.seed)].slice(0,HISTORY_MAX);window.localStorage.setItem(historyKey,JSON.stringify(next));setRecent(next)}catch{setRecent([r])}
  window.setTimeout(()=>setPhase('reveal'),reduced?700:1250)
 }

 if(phase==='result'&&script)return <div ref={root}><RecordRun club={club} gate="royal-rumble" run={`royal-rumble:xi35-v1:${version}:${formation}:${rival}:${board.seed}:${picks.join(',')}`} score={script.final.us}/><RumbleFullTime script={script} copy={copy} wardrobe={wardrobe} againHref={againHref} recent={recent} club={club} seed={roundSeed} xi={{formation,rival,rivalName:faces.them.name}}/></div>
 if((phase==='reveal'||phase==='match')&&script)return <div ref={root} className={s.game} data-phase="show">
  {phase==='reveal'?<RumbleReveal script={script} step={step} onStep={setStep} onDone={()=>setPhase('match')} wardrobe={wardrobe} copy={copy} reduced={reduced}/>
   :<RumbleMatchCentre script={script} wardrobe={wardrobe} copy={copy} reduced={reduced} sound={sound.play} soundOn={sound.on} onSound={sound.toggle} onDone={()=>setPhase('result')} usClub={faces.us} themClub={faces.them}/>}
 </div>

 const current=board.draft[slot]?.[0]
 return <div ref={root} className={s.game} data-testid="rumble" data-mode="xi" data-phase={phase}>
  <header className={s.hud}>
   <div className={s.hudCopy}>
    <p className={`${s.mono} ${s.hudKicker}`}>{tr(copy,'rr.kicker')} · {formation}</p>
    <p className={`${s.hudIntro} ${s.hudIntroXI}`}>{tr(copy,'rr.xi.vs',{home:faces.us.name,away:faces.them.name})}</p>
    <p className={s.hudBody}>{tr(copy,'rr.xi.general')}</p>
   </div>
   <div className={s.money} data-testid="rumble-money">
    <div className={`${s.mono} ${s.moneyTop}`}><span>{tr(copy,'rr.moneyLeft')}</span><Crown className={s.crown}/></div>
    <p className={s.moneyValue} data-short={left<0} dir="ltr" aria-live="polite">{money(left)}</p>
    <p className={`${s.mono} ${s.trail}`} dir="ltr">{count<slots.length?tr(copy,'rr.xi.leftPerSlot',{n:money(perSlot)}):money(spent)+' / '+money(XI_BUDGET)}</p>
    <div className={s.progress}><i style={{width:`${(count/slots.length)*100}%`}}/></div>
    <p className={`${s.mono} ${s.trail}`}>{tr(copy,'rr.xi.picked',{n:count,total:slots.length})} · {tr(copy,'rr.archiveCount',{n:playerCount})}</p>
   </div>
  </header>

  <section className={s.xiPitch} aria-label={tr(copy,'rr.xi.yourEleven')} data-testid="rumble-xi-pitch">
   {['half','circle','box-top','box-bottom'].map(l=><i key={l} data-line={l}/>)}
   {slots.map((sl,i)=>{const c=chosen[i];return <button type="button" key={sl.id} className={`${s.xiSlot} min-h-tap`} style={{insetInlineStart:`${sl.x}%`,insetBlockStart:`${left_(sl.y)}%`}} data-filled={!!c} aria-current={slot===i?'step':undefined} onClick={()=>{setSlot(i);machine.current?.scrollIntoView({block:'nearest',behavior:reduced?'auto':'smooth'})}} aria-label={`${tr(copy,`rr.fine.${sl.fine}`)} · ${c?`${c.name} · ${money(c.price)}`:tr(copy,'rr.vacant')}`} data-testid="rumble-slot">
    <span className={`${s.mono} ${s.xiFine}`}>{tr(copy,`rr.fines.${sl.fine}`)}</span>
    {c?<><span className={s.xiShirt}><RumbleShirt card={c} side="us" wardrobe={wardrobe}/></span><span className={s.xiName} dir="auto">{shortName(c.name)}</span><span className={`${s.mono} ${s.xiPrice}`} dir="ltr">{money(c.price)}</span></>:<span className={s.xiEmpty} aria-hidden="true">?</span>}
   </button>})}
  </section>

  <div className={s.chips}>
   <button type="button" className={`${s.chip} min-h-tap`} disabled={!shuffleOpen} onClick={doShuffle} data-testid="rumble-shuffle"><span>{fresh?tr(copy,'rr.shuffleFresh'):shuffled?tr(copy,'rr.shuffleUsed'):count>0?tr(copy,'rr.shuffleBefore'):tr(copy,'rr.shuffle')}</span><b>×1</b></button>
   <button type="button" className={`${s.chip} ${s.rules} min-h-tap`} onClick={()=>setRules(true)}>{tr(copy,'rr.rules')}</button>
  </div>

  <div ref={machine}>{current&&<RumbleSlotMachine board={board.draft} slot={slot} seed={board.seed} picks={picks} canPick={c=>canAfford(board.draft,picks,slot,c,XI_BUDGET)} onPick={pick} copy={copy} wardrobe={wardrobe} reduced={reduced} signature={`${board.seed}-${slot}`}/>}</div>

  {error&&<p className={s.error} role="alert">{error}</p>}

  <button type="button" className={`${s.lock} min-h-tap`} disabled={!complete||left<0||busy} onClick={e=>void lock(e)} data-ready={complete&&left>=0} data-testid="rumble-lock">
   <span style={{minWidth:0}}><small className={s.mono}>{tr(copy,'rr.xi.lockLine',{left:money(left)})}</small><strong>{busy?tr(copy,'rr.locking'):complete?tr(copy,'rr.lockReady'):tr(copy,'rr.lockMissing',{n:slots.length-count})}</strong></span>
   <span aria-hidden="true">→</span>
  </button>

  {phase==='jackpot'&&<div className={s.jackpot} role="status" data-testid="rumble-jackpot"><div className={s.jackpotPlate}><b>{tr(copy,'rr.jackpot')}</b><small className={s.mono}>{tr(copy,'rr.xi.yourEleven')} · {money(spent)}</small></div></div>}

  {rules&&<div className={s.sheetBack} onClick={()=>setRules(false)}>
   <div className={`${s.sheet} relative z-[60]`} role="dialog" aria-modal="true" aria-labelledby="rr-rules" onClick={e=>e.stopPropagation()}>
    <div className={s.sheetHead}><h2 id="rr-rules">{tr(copy,'rr.rulesTitle')}</h2><button type="button" className={`${s.closeBtn} min-h-tap`} onClick={()=>setRules(false)} autoFocus>{tr(copy,'rr.close')}</button></div>
    <ul>{[1,2,3,4,5].map(n=><li key={n}>{tr(copy,`rr.xi.rule${n}`)}</li>)}</ul>
    <p className={s.sheetNote}>{tr(copy,'rr.ratingNever')}</p>
    <p className={s.sheetNote}>{tr(copy,'rr.xi.general')}</p>
   </div>
  </div>}
 </div>
}
