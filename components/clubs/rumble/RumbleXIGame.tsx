'use client'
import {useEffect,useMemo,useRef,useState,type MouseEvent} from 'react'
import {gameCopy,xiCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import type {RumbleCard} from '@/lib/clubs/rumble'
import {type ShowScript} from '@/lib/clubs/rumble-show'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {slotsOf} from '@/lib/clubs/rumble-xi/formations'
import type {Group} from '@/lib/draft-core/types'
import {budgetFor,type FormationId} from '@/lib/clubs/rumble-xi/types'
import {firePickFxAt} from '@/components/stage/PickFx'
import {Crown,RumbleShirt,money,shortName,tr,useReducedMotion,useRumbleSound} from './shared'
import {DraftPanel} from './DraftPanel'
import {useDraft} from './useDraft'
import {RumbleReveal,type RevealStep} from './RumbleStage'
import {RumbleMatchCentre,type ClubFace} from './RumbleMatchCentre'
import {RumbleHighlights} from './RumbleHighlights'
import type {HighlightsAllow} from '@/lib/highlights/page'
import {RumbleFullTime,type RecentRound} from './RumbleFullTime'
import {RecordRun} from '../games/RecordRun'
import s from './rumble.module.css'

type Phase='draft'|'jackpot'|'reveal'|'match'|'result'
const HISTORY_MAX=8
const left_=(slotY:number)=>8+((slotY-20)/64)*84

/**
 * Gate 9, eleven a side (€35M). The same machine, the same show — on a pitch of eleven slots. Tap a slot, the reels roll three men of
 * that family, the pick flies to its place. The board is dealt on the server from the round seed; the eleven is checked, the match
 * decided and staged on the server (`playRumbleXI`). This screen only shows what it is handed.
 */
export function RumbleXIGame({club,version,locale,formation,rival,wardrobe,faces,highlights,againHref,playerCount,roundSeed}:{roundSeed:number;club:string;version:string;locale:UiLocale;formation:FormationId;rival:string;wardrobe:RumbleWardrobe;faces:{us:ClubFace;them:ClubFace};highlights?:HighlightsAllow;againHref:string;playerCount:number}){
 const copy=xiCopy(gameCopy(locale)),reduced=useReducedMotion(),sound=useRumbleSound(),slots=useMemo(()=>slotsOf(formation),[formation])
 const budget=budgetFor(roundSeed),dr=useDraft({slug:club,version,mode:'xi',seed:roundSeed,formation,rival},useMemo(()=>slots.map(x=>({id:x.id,group:x.family})),[slots])),view=dr.view
 const [phase,setPhase]=useState<Phase>('draft'),[step,setStep]=useState<RevealStep>('entrance')
 const [script,setScript]=useState<ShowScript|null>(null),[busy,setBusy]=useState(false)
 const [rules,setRules]=useState(false),[recent,setRecent]=useState<RecentRound[]>([])
 const root=useRef<HTMLDivElement>(null),machine=useRef<HTMLDivElement>(null)
 const historyKey=`fan-life:club:${club}:rumble:xi:${formation}:${rival}:recent:v1`

 const chosen:(RumbleCard|null)[]=slots.map(sl=>view?.picks.find(p=>p.slotId===sl.id)?.card??null)
 const left=view?view.cash:budget,spent=budget-left,count=view?view.picks.length:0,complete=!!view?.complete
 const perSlot=count<slots.length?Math.round((left/(slots.length-count))*10)/10:0
 const groupsLeft={GK:slots.filter(x=>x.family==='GK').length,DF:slots.filter(x=>x.family==='DF').length,MF:slots.filter(x=>x.family==='MF').length,FW:slots.filter(x=>x.family==='FW').length}
 const nextSlotId=view?.active?view.next[view.active]:null
 const nextLabel=(g:Group)=>{const id=view?view.next[g]:slots.find(x=>x.family===g)?.id,sl=slots.find(x=>x.id===id);return sl?tr(copy,'rr.draft.nextPlace',{place:tr(copy,`rr.fines.${sl.fine}`)}):null}

 useEffect(()=>{if(phase!=='draft')root.current?.scrollIntoView({block:'start',behavior:reduced?'auto':'smooth'})},[phase,reduced])
 useEffect(()=>{if(!rules)return;const k=(e:KeyboardEvent)=>{if(e.key==='Escape')setRules(false)};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[rules])

 async function pick(card:RumbleCard,e:MouseEvent<HTMLButtonElement>){
  if(phase!=='draft'||dr.busy)return
  const el=e.currentTarget,v=await dr.act({t:'pick',id:card.id})
  if(v){firePickFxAt(el,{label:money(card.price),tone:'red',haptic:card.price>=4.5?'lock':'tap',big:card.price>=4.5});window.setTimeout(()=>machine.current?.scrollIntoView({block:'nearest',behavior:reduced?'auto':'smooth'}),60)}
 }

 async function lock(e:MouseEvent<HTMLButtonElement>){
  if(!complete||left<0||busy)return
  firePickFxAt(e.currentTarget,{label:tr(copy,'rr.lockReady'),tone:'red',big:true,haptic:'lock'})
  setBusy(true);dr.setError(null)
  const res=await dr.lock()
  setBusy(false)
  if(!res){dr.setError(tr(copy,'rr.invalid'));return}
  setScript(res.script as ShowScript);setStep('entrance');setPhase('jackpot');sound.play('roar',.35)
  const r:RecentRound={seed:roundSeed,cost:spent,us:res.goals[0],them:res.goals[1],r:res.verdict==='win'?'W':res.verdict==='draw'?'D':'L'}
  try{const raw=JSON.parse(window.localStorage.getItem(historyKey)||'[]') as unknown;const prev=Array.isArray(raw)?raw.filter((x):x is RecentRound=>!!x&&typeof x==='object'&&typeof (x as RecentRound).seed==='number'):[];const next=[r,...prev.filter(x=>x.seed!==r.seed)].slice(0,HISTORY_MAX);window.localStorage.setItem(historyKey,JSON.stringify(next));setRecent(next)}catch{setRecent([r])}
  window.setTimeout(()=>setPhase('reveal'),reduced?700:1250)
 }

 if(phase==='result'&&script)return <div ref={root}><RecordRun club={club} gate="royal-rumble" run={`royal-rumble:xi35-v1:${version}:${formation}:${rival}:${roundSeed}:${chosen.map(c=>c?.id).join(',')}`} score={script.final.us}/><RumbleFullTime script={script} copy={copy} wardrobe={wardrobe} againHref={againHref} recent={recent} club={club} seed={roundSeed} xi={{formation,rival,rivalName:faces.them.name}}/></div>
 if((phase==='reveal'||phase==='match')&&script)return <div ref={root} className={s.game} data-phase="show">
  {phase==='reveal'?<RumbleReveal script={script} step={step} onStep={setStep} onDone={()=>setPhase('match')} wardrobe={wardrobe} copy={copy} reduced={reduced}/>
   :highlights?<RumbleHighlights script={script} wardrobe={wardrobe} copy={copy} reduced={reduced} sound={sound.play} soundOn={sound.on} onSound={sound.toggle} onDone={()=>setPhase('result')} usClub={faces.us} themClub={faces.them} allow={highlights} seed={roundSeed}/>
   :<RumbleMatchCentre script={script} wardrobe={wardrobe} copy={copy} reduced={reduced} sound={sound.play} soundOn={sound.on} onSound={sound.toggle} onDone={()=>setPhase('result')} usClub={faces.us} themClub={faces.them}/>}
 </div>

 return <div ref={root} className={s.game} data-testid="rumble" data-mode="xi" data-phase={phase}>
  <header className={s.hud}>
   <div className={s.hudCopy}>
    <p className={`${s.mono} ${s.hudKicker}`}>{tr(copy,'rr.kicker')} · {formation}</p>
    <p className={`${s.hudIntro} ${s.hudIntroXI}`}>{tr(copy,'rr.xi.vs',{home:faces.us.name,away:faces.them.name})}</p>
    <p className={s.hudBody}>{tr(copy,'rr.xi.general')}</p>
   </div>
   <div className={s.money} data-testid="rumble-money">
    <div className={`${s.mono} ${s.moneyTop}`}><span>{tr(copy,'rr.moneyLeft')}</span><Crown className={s.crown}/></div>
    <p className={s.moneyValue} data-short={left<0} dir="ltr" aria-live="polite">{[...money(left)].map((ch,i)=><span key={`${i}${ch}`} className={s.flap}>{ch}</span>)}</p>
    <p className={`${s.mono} ${s.trail}`} dir="ltr">{count<slots.length?tr(copy,'rr.xi.leftPerSlot',{n:money(perSlot)}):money(spent)+' / '+money(budget)}</p>
    <div className={s.progress}><i style={{width:`${(count/slots.length)*100}%`}}/></div>
    <p className={`${s.mono} ${s.trail}`}>{tr(copy,'rr.xi.picked',{n:count,total:slots.length})} · {tr(copy,'rr.archiveCount',{n:playerCount})}</p>
   </div>
  </header>

  <section className={s.xiPitch} aria-label={tr(copy,'rr.xi.yourEleven')} data-testid="rumble-xi-pitch">
   {['half','circle','box-top','box-bottom'].map(l=><i key={l} data-line={l}/>)}
   {slots.map((sl,i)=>{const c=chosen[i];return <button type="button" key={sl.id} className={`${s.xiSlot} min-h-tap`} style={{insetInlineStart:`${sl.x}%`,insetBlockStart:`${left_(sl.y)}%`}} data-filled={!!c} aria-current={nextSlotId===sl.id?'step':undefined} data-next={nextSlotId===sl.id||undefined} onClick={()=>{if(!c&&!dr.busy&&phase==='draft'){void dr.act({t:'open',g:sl.family});machine.current?.scrollIntoView({block:'nearest',behavior:reduced?'auto':'smooth'})}}} aria-label={`${tr(copy,`rr.fine.${sl.fine}`)} · ${c?`${c.name} · ${money(c.price)}`:tr(copy,'rr.vacant')}`} data-testid="rumble-slot">
    <span className={`${s.mono} ${s.xiFine}`}>{tr(copy,`rr.fines.${sl.fine}`)}</span>
    {c?<><span className={s.xiShirt}><RumbleShirt card={c} side="us" wardrobe={wardrobe}/></span><span className={s.xiName} dir="auto">{shortName(c.name)}</span><span className={`${s.mono} ${s.xiPrice}`} dir="ltr">{money(c.price)}</span></>:<span className={s.xiEmpty} aria-hidden="true">?</span>}
   </button>})}
  </section>

  <div className={s.pickArea}>
   <div ref={machine}>{phase==='draft'&&!complete&&<DraftPanel copy={copy} view={view} groupsLeft={groupsLeft} busy={dr.busy} error={dr.error} onOpen={g=>void dr.act({t:'open',g})} onReroll={()=>void dr.act({t:'reroll'})} onPick={(c,e)=>void pick(c,e)} nextLabel={nextLabel} wardrobe={wardrobe} reduced={reduced} seed={roundSeed} pickedCount={count} total={slots.length}/>}</div>
   <div className={s.chips}>
    <button type="button" className={`${s.chip} ${s.rules} min-h-tap`} onClick={()=>setRules(true)}>{tr(copy,'rr.rules')}</button>
   </div>
  </div>

  <button type="button" className={`${s.lock} min-h-tap`} disabled={!complete||left<0||busy||dr.busy} onClick={e=>void lock(e)} data-ready={complete&&left>=0} data-testid="rumble-lock">
   <span style={{minWidth:0}}><small className={s.mono}>{tr(copy,'rr.xi.lockLine',{left:money(left)})}</small><strong>{busy?tr(copy,'rr.locking'):complete?tr(copy,'rr.lockReady'):tr(copy,'rr.lockMissing',{n:slots.length-count})}</strong></span>
   <span aria-hidden="true">→</span>
  </button>

  {phase==='jackpot'&&<div className={s.jackpot} role="status" data-testid="rumble-jackpot"><div className={s.jackpotPlate}><b>{tr(copy,'rr.jackpot')}</b><small className={s.mono}>{tr(copy,'rr.xi.yourEleven')} · {money(spent)}</small></div></div>}

  {rules&&<div className={s.sheetBack} onClick={()=>setRules(false)}>
   <div className={`${s.sheet} relative z-[61]`} role="dialog" aria-modal="true" aria-labelledby="rr-rules" onClick={e=>e.stopPropagation()}>
    <div className={s.sheetHead}><h2 id="rr-rules">{tr(copy,'rr.rulesTitle')}</h2><button type="button" className={`${s.closeBtn} min-h-tap`} onClick={()=>setRules(false)} autoFocus>{tr(copy,'rr.close')}</button></div>
    <ul>{[1,2,3,4,5].map(n=><li key={n}>{tr(copy,`rr.xi.rule${n}`,{budget:budget})}</li>)}</ul>
    <p className={s.sheetNote}>{tr(copy,'rr.draft.freeRule')}</p>
    <p className={s.sheetNote}>{tr(copy,'rr.ratingNever')}</p>
    <p className={s.sheetNote}>{tr(copy,'rr.xi.general')}</p>
   </div>
  </div>}
 </div>
}
