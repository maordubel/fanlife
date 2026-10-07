'use client'
import {useEffect,useMemo,useRef,useState,type MouseEvent} from 'react'
import {playRumble} from '@/app/clubs/[slug]/[gate]/gate-actions'
import {gameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import {BUDGET,type RumbleCard} from '@/lib/clubs/rumble'
import {canAfford,type ShowScript} from '@/lib/clubs/rumble-show'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {firePickFxAt} from '@/components/stage/PickFx'
import {Crown,RumbleShirt,money,posShort,tr,useReducedMotion,useRumbleSound} from './shared'
import {RumbleSlotMachine} from './RumbleSlotMachine'
import {RumbleMatch,RumbleReveal,type RevealStep} from './RumbleStage'
import {RumbleFullTime,type RecentRound} from './RumbleFullTime'
import {RecordRun} from '../games/RecordRun'
import s from './rumble.module.css'

type Board={seed:number;draft:RumbleCard[][]}
type Phase='draft'|'jackpot'|'reveal'|'match'|'result'
const HISTORY_MAX=8

/**
 * Gate 9 for every club — The Worker's Royal Rumble, ported whole (owner, 7.10.2026): the slot-machine
 * draft, the squad entrance, the head to head, the match on the pitch with its goals, full time.
 * The boards are dealt on the server from the round seed; the five is checked, the score decided and the
 * match staged on the server (`playRumble`). This screen only shows what it is handed.
 */
export function RumbleGame({club,version,locale,main,shuffle,wardrobe,playerCount,againHref}:{club:string;version:string;locale:UiLocale;main:Board;shuffle:Board;wardrobe:RumbleWardrobe;playerCount:number;againHref:string}){
 const copy=gameCopy(locale),reduced=useReducedMotion(),sound=useRumbleSound()
 const [board,setBoard]=useState<Board>(main),[shuffled,setShuffled]=useState(false),[fresh,setFresh]=useState(false)
 const [picks,setPicks]=useState<(string|null)[]>(()=>main.draft.map(()=>null)),[slot,setSlot]=useState(0)
 const [phase,setPhase]=useState<Phase>('draft'),[step,setStep]=useState<RevealStep>('entrance')
 const [script,setScript]=useState<ShowScript|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null)
 const [rules,setRules]=useState(false),[recent,setRecent]=useState<RecentRound[]>([])
 const root=useRef<HTMLDivElement>(null)
 const historyKey=`fan-life:club:${club}:rumble:recent:v1`

 const chosen=picks.map((id,i)=>id?board.draft[i]!.find(c=>c.id===id)??null:null)
 const spent=chosen.reduce((t,c)=>t+(c?.price||0),0),left=BUDGET-spent,count=chosen.filter(Boolean).length,complete=count===board.draft.length
 const trail=useMemo(()=>{const out=[BUDGET];let l=BUDGET;for(const c of chosen){if(!c)continue;l-=c.price;out.push(l)}return out.map(money).join(' → ')},[chosen])
 const shuffleOpen=!shuffled&&count===0&&phase==='draft'&&!busy

 useEffect(()=>{if(phase!=='draft')root.current?.scrollIntoView({block:'start',behavior:reduced?'auto':'smooth'})},[phase,reduced])
 useEffect(()=>{if(!rules)return;const k=(e:KeyboardEvent)=>{if(e.key==='Escape')setRules(false)};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[rules])

 function pick(card:RumbleCard,e:MouseEvent<HTMLButtonElement>){
  if(phase!=='draft'||!canAfford(board.draft,picks,slot,card))return
  setError(null)
  const next=picks.map((x,i)=>i===slot?card.id:x)
  setPicks(next)
  firePickFxAt(e.currentTarget,{label:money(card.price),tone:'red',haptic:card.price===5?'lock':'tap',big:card.price===5})
  const after=next.findIndex((x,i)=>i>slot&&x===null),any=next.findIndex(x=>x===null)
  if(after>=0)setSlot(after);else if(any>=0)setSlot(any)
 }
 function doShuffle(e:MouseEvent<HTMLButtonElement>){
  if(!shuffleOpen)return
  setBoard(shuffle);setPicks(shuffle.draft.map(()=>null));setSlot(0);setShuffled(true);setFresh(true);setError(null)
  firePickFxAt(e.currentTarget,{tone:'ink',haptic:'tap'})
  window.setTimeout(()=>setFresh(false),1100)
 }
 async function lock(e:MouseEvent<HTMLButtonElement>){
  if(!complete||left<0||busy)return
  firePickFxAt(e.currentTarget,{label:tr(copy,'rr.lockReady'),tone:'red',big:true,haptic:'lock'})
  setBusy(true);setError(null)
  const res=await playRumble(club,version,board.seed,picks as string[]).catch(()=>null)
  setBusy(false)
  if(!res){setError(tr(copy,'rr.invalid'));return}
  setScript(res.script);setStep('entrance');setPhase('jackpot')
  sound.play('roar',.35)
  const r:RecentRound={seed:board.seed,cost:spent,us:res.goals[0],them:res.goals[1],r:res.verdict==='win'?'W':res.verdict==='draw'?'D':'L'}
  try{const raw=JSON.parse(window.localStorage.getItem(historyKey)||'[]') as unknown;const prev=Array.isArray(raw)?raw.filter((x):x is RecentRound=>!!x&&typeof x==='object'&&typeof (x as RecentRound).seed==='number'):[];const next=[r,...prev.filter(x=>x.seed!==r.seed)].slice(0,HISTORY_MAX);window.localStorage.setItem(historyKey,JSON.stringify(next));setRecent(next)}catch{setRecent([r])}
  window.setTimeout(()=>setPhase('reveal'),reduced?700:1250)
 }

 if(phase==='result'&&script)return <div ref={root}><RecordRun club={club} gate="royal-rumble" run={`royal-rumble:${version}:${board.seed}:${picks.join(',')}`} score={script.final.us}/><RumbleFullTime script={script} copy={copy} wardrobe={wardrobe} againHref={againHref} recent={recent}/></div>
 if((phase==='reveal'||phase==='match')&&script)return <div ref={root} className={s.game} data-phase="show">
  {phase==='reveal'?<RumbleReveal script={script} step={step} onStep={setStep} onDone={()=>setPhase('match')} wardrobe={wardrobe} copy={copy} reduced={reduced}/>
   :<RumbleMatch script={script} wardrobe={wardrobe} copy={copy} reduced={reduced} sound={sound.play} soundOn={sound.on} onSound={sound.toggle} onDone={()=>setPhase('result')}/>}
 </div>

 const current=board.draft[slot]?.[0]
 return <div ref={root} className={s.game} data-testid="rumble" data-phase={phase}>
  <header className={s.hud}>
   <div className={s.hudCopy}>
    <p className={`${s.mono} ${s.hudKicker}`}>{tr(copy,'rr.kicker')}</p>
    <p className={s.hudIntro}>{tr(copy,'rr.intro')}</p>
    <p className={s.hudBody}>{tr(copy,'rr.introBody')}</p>
   </div>
   <div className={s.money} data-testid="rumble-money">
    <div className={`${s.mono} ${s.moneyTop}`}><span>{tr(copy,'rr.moneyLeft')}</span><Crown className={s.crown}/></div>
    <p className={s.moneyValue} data-short={left<0} dir="ltr" aria-live="polite">{money(left)}</p>
    <p className={`${s.mono} ${s.trail}`} dir="ltr" aria-hidden="true">{trail}</p>
    <div className={s.progress}><i style={{width:`${(count/board.draft.length)*100}%`}}/></div>
    <p className={`${s.mono} ${s.trail}`}>{tr(copy,'rr.lockedCount',{n:count})} · {tr(copy,'rr.archiveCount',{n:playerCount})}</p>
   </div>
  </header>

  <section className={s.rail} aria-label={tr(copy,'rr.yourFive')}>
   <div className={`${s.mono} ${s.railHead}`}><span>{tr(copy,'rr.yourFive')}</span><span>{tr(copy,'rr.editHint')}</span></div>
   <div className={s.railSlots}>
    {board.draft.map((cards,i)=>{const c=chosen[i],pos=cards[0]?.position;return <button type="button" key={i} className={`${s.slot} min-h-tap`} data-filled={!!c} aria-current={slot===i?'step':undefined} onClick={()=>setSlot(i)} aria-label={`${pos?posShort(copy,pos):''} · ${c?`${c.name} · ${money(c.price)}`:tr(copy,'rr.vacant')}`} data-testid="rumble-slot">
     <span className={`${s.mono} ${s.slotPos}`}>{pos?posShort(copy,pos):''}</span>
     {c?<><span className={s.slotShirt}><RumbleShirt card={c} side="us" wardrobe={wardrobe}/></span><span className={s.slotName} dir="auto">{c.name}</span><span className={`${s.mono} ${s.slotPrice}`} dir="ltr">{money(c.price)}</span></>:<span className={s.slotEmpty} aria-hidden="true">?</span>}
    </button>})}
   </div>
  </section>

  <div className={s.chips}>
   <button type="button" className={`${s.chip} min-h-tap`} disabled={!shuffleOpen} onClick={doShuffle} data-testid="rumble-shuffle"><span>{fresh?tr(copy,'rr.shuffleFresh'):shuffled?tr(copy,'rr.shuffleUsed'):count>0?tr(copy,'rr.shuffleBefore'):tr(copy,'rr.shuffle')}</span><b>×1</b></button>
   <button type="button" className={`${s.chip} ${s.rules} min-h-tap`} onClick={()=>setRules(true)}>{tr(copy,'rr.rules')}</button>
  </div>

  {current&&<RumbleSlotMachine board={board.draft} slot={slot} seed={board.seed} picks={picks} canPick={c=>canAfford(board.draft,picks,slot,c)} onPick={pick} copy={copy} wardrobe={wardrobe} reduced={reduced} signature={`${board.seed}-${slot}`}/>}

  {error&&<p className={s.error} role="alert">{error}</p>}

  <button type="button" className={`${s.lock} min-h-tap`} disabled={!complete||left<0||busy} onClick={e=>void lock(e)} data-ready={complete&&left>=0} data-testid="rumble-lock">
   <span style={{minWidth:0}}><small className={s.mono}>{tr(copy,'rr.lockLine',{left:money(left)})}</small><strong>{busy?tr(copy,'rr.locking'):complete?tr(copy,'rr.lockReady'):tr(copy,'rr.lockMissing',{n:board.draft.length-count})}</strong></span>
   <span aria-hidden="true">→</span>
  </button>

  {phase==='jackpot'&&<div className={s.jackpot} role="status" data-testid="rumble-jackpot"><div className={s.jackpotPlate}><b>{tr(copy,'rr.jackpot')}</b><small className={s.mono}>{tr(copy,'rr.yourFive')} · {money(spent)}</small></div></div>}

  {rules&&<div className={s.sheetBack} onClick={()=>setRules(false)}>
   <div className={`${s.sheet} relative z-[60]`} role="dialog" aria-modal="true" aria-labelledby="rr-rules" onClick={e=>e.stopPropagation()}>
    <div className={s.sheetHead}><h2 id="rr-rules">{tr(copy,'rr.rulesTitle')}</h2><button type="button" className={`${s.closeBtn} min-h-tap`} onClick={()=>setRules(false)} autoFocus>{tr(copy,'rr.close')}</button></div>
    <ul>{[1,2,3,4,5].map(n=><li key={n}>{tr(copy,`rr.rule${n}`)}</li>)}</ul>
    <p className={s.sheetNote}>{tr(copy,'rr.ratingNever')}</p>
    <p className={s.sheetNote}>{tr(copy,'rr.kitNote')}</p>
   </div>
  </div>}
 </div>
}
