'use client'
import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties} from 'react'
import {revealMemoryPair} from '@/app/clubs/[slug]/[gate]/memory-actions'
import {ECHO_MS,ECHO_STREAK,FLASH_MS,FUSION_MS,RE_FLASH_MS,closeOpen,countdownAt,echoMate,finished,flip,morale,spendEcho,spendFlash,startRun,threadGeometry,verdict,wallLit} from '@/lib/game/memory-run'
import {completeRun} from '@/lib/clubs/completion'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import {MIN_PAIRS,MISS_MS,RESULT_DELAY_MS,clockOf,columnsFor,foundPairs,memoryRunKey,resultOf,type MemoryPlan,type MemoryResult,type PublicDeal,type PublicPair} from '@/lib/clubs/memory-model'
import {addToShelf,readShelf,writeShelf,type Shelf} from '@/lib/clubs/memory-shelf'
import {readBests,recordBest,writeBests,type Bests} from '@/lib/clubs/memory-best'
import {firePickFxAt} from '@/components/stage/PickFx'
import {Num} from '@/components/ui/Num'
import {haptic} from '@/lib/play/haptics'
import {markStep} from '@/lib/analytics/meter'
import {tr,useReducedMotion} from '@/components/clubs/rumble/shared'
import {WallCard} from './WallCard'
import {FusionPlate,ShelfSheet,type Plate,type RevealState,type T} from './MemoryParts'
import {MemoryBlocked,MemoryReady} from './MemoryReady'
import {MemoryReport} from './MemoryReport'
import css from './memory.module.css'

export type ClubMemoryProps={plan:MemoryPlan;club:string;clubName:string;version:string;seed:number;cursor:number;locale:UiLocale;contentLocale:string;copy:GameCopy;autostart:boolean}
type Phase='ready'|'flash'|'play'|'done'

/** Gate 6 · the Memory Wall: an explicit start, one look, then the pairs — every pair is two faces of one archive fact, revealed once you have it. */
export function ClubMemory(props:ClubMemoryProps){
 const t:T=useCallback((k,v)=>tr(props.copy,k,v),[props.copy])
 const {plan}=props
 if(!plan.deal||plan.deal.pairs.length<MIN_PAIRS)return <MemoryBlocked t={t} copy={props.copy} plan={plan} clubName={props.clubName} club={props.club} locale={props.locale} seed={props.seed}/>
 return <Wall {...props} deal={plan.deal} t={t}/>
}

function Wall(props:ClubMemoryProps&{deal:PublicDeal;t:T}){
 const {plan,deal,t,club,clubName,version,seed,cursor,locale,contentLocale,copy}=props
 const {cards,pairs}=deal,total=pairs.length,cols=columnsFor(cards.length,deal.longest),rows=Math.ceil(cards.length/cols)
 const reduced=useReducedMotion()
 const [run,setRun]=useState(startRun),[phase,setPhase]=useState<Phase>(props.autostart?'flash':'ready'),[wrong,setWrong]=useState<string[]>([]),[echoOn,setEchoOn]=useState<string|null>(null)
 const [plate,setPlate]=useState<Plate|null>(null),[fusing,setFusing]=useState(false),[count,setCount]=useState<number|null>(props.autostart?countdownAt(0,FLASH_MS):null),[hint,setHint]=useState('mem.hint.find'),[announce,setAnnounce]=useState('')
 const [startedAt,setStartedAt]=useState<number|null>(null),[elapsed,setElapsed]=useState(0),[shelf,setShelf]=useState<Shelf>({}),[shelfOpen,setShelfOpen]=useState(false),[shelfOk,setShelfOk]=useState(true)
 const [peekOn,setPeekOn]=useState(plan.selected.peek),[reveals,setReveals]=useState<Record<string,RevealState>>({}),[bests,setBests]=useState<Bests>({}),[result,setResult]=useState<MemoryResult|null>(null),[improved,setImproved]=useState(false)
 const timers=useRef<number[]>([]),flashTimers=useRef<number[]>([]),shelfRef=useRef<Shelf>({}),recorded=useRef(false),mounted=useRef(true)
 const phaseRef=useRef<Phase>(phase),flashKind=useRef({ms:FLASH_MS,first:true}),flashPaused=useRef(false),hiddenAt=useRef<number|null>(null),hiddenMs=useRef(0),firstFlashDone=useRef(false),ij=useRef<Record<string,[number,number]>>({})
 const pairById=useMemo(()=>new Map(pairs.map(p=>[p.id,p] as const)),[pairs])
 const done=finished(run,total),flashing=phase==='flash',rtl=locale==='he'
 phaseRef.current=phase

 const later=useCallback((fn:()=>void,ms:number)=>{timers.current.push(window.setTimeout(fn,ms))},[])
 const clearFlash=useCallback(()=>{for(const id of flashTimers.current){window.clearTimeout(id);window.clearInterval(id)}flashTimers.current=[]},[])
 useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;for(const id of [...timers.current,...flashTimers.current]){window.clearTimeout(id);window.clearInterval(id)}timers.current=[];flashTimers.current=[]}},[])
 useEffect(()=>{const s=readShelf(club);shelfRef.current=s;setShelf(s);setBests(readBests(club))},[club])

 // ---- the flash: every card is face up, then the lights go down. It can be dimmed early; the stopwatch starts when the FIRST one ends.
 const endFlashNow=useCallback(()=>{
  clearFlash();setPhase('play');setCount(null);setHint('mem.hint.find');setAnnounce(t('mem.announce.play'))
  if(!firstFlashDone.current){firstFlashDone.current=true;setStartedAt(Date.now())}
 },[clearFlash,t])
 const lightTheWall=useCallback((ms:number,first:boolean)=>{
  flashKind.current={ms,first}
  clearFlash();setPhase('flash');setHint('mem.hint.photograph');setAnnounce(t('mem.announce.flash',{s:Math.round(ms/1000)}))
  const opened=Date.now();setCount(countdownAt(0,ms))
  flashTimers.current.push(window.setInterval(()=>setCount(countdownAt(Date.now()-opened,ms)),200))
  flashTimers.current.push(window.setTimeout(endFlashNow,ms))
 },[clearFlash,endFlashNow,t])
 useEffect(()=>{if(props.autostart)lightTheWall(FLASH_MS,true)},[]) // eslint-disable-line react-hooks/exhaustive-deps -- once on mount; strict mode runs it twice and the second run starts the beat afresh
 function endFlash(){if(phase!=='flash')return;endFlashNow();haptic('tap')}
 function peek(){
  if(!peekOn||run.flashUsed||phase!=='play'||done||run.open.length>0||wrong.length>0)return
  setRun(spendFlash);lightTheWall(RE_FLASH_MS,false)
 }

 // ---- backgrounding (ME-R08): a flash that nobody saw is not spent — it starts again, whole, when the player is back;
 //      time spent away is not play time, so the stopwatch leaves it out. Cards face up after a miss close on their own timer.
 useEffect(()=>{
  const onVisibility=()=>{
   if(document.hidden){
    hiddenAt.current=Date.now()
    if(phaseRef.current==='flash'){clearFlash();flashPaused.current=true}
    return
   }
   if(hiddenAt.current!==null){hiddenMs.current+=Date.now()-hiddenAt.current;hiddenAt.current=null}
   if(flashPaused.current){flashPaused.current=false;lightTheWall(flashKind.current.ms,flashKind.current.first);setAnnounce(t('mem.announce.back'))}
  }
  document.addEventListener('visibilitychange',onVisibility)
  return ()=>document.removeEventListener('visibilitychange',onVisibility)
 },[clearFlash,lightTheWall,t])

 // ---- the clock is a stopwatch: it never ends a run
 useEffect(()=>{
  if(startedAt===null||done||phase==='ready')return
  const id=window.setInterval(()=>{if(!document.hidden)setElapsed(Math.floor((Date.now()-startedAt-hiddenMs.current)/1000))},500)
  return ()=>window.clearInterval(id)
 },[startedAt,done,phase])

 // ---- a matched pair is asked what it was: the faces are on the plate at once, the relation and the source arrive from the server
 const fileShelf=useCallback((pair:PublicPair,reveal?:{fact:string|null;href:string|null}|null)=>{
  const next=addToShelf(shelfRef.current,{id:pair.id,a:pair.a,b:pair.b,kind:pair.kind,object:pair.object,factHe:reveal?.fact??null,href:reveal?.href??null},Date.now())
  if(next!==shelfRef.current){shelfRef.current=next;setShelf(next);setShelfOk(writeShelf(club,next))}
 },[club])
 const askReveal=useCallback((pairId:string)=>{
  const at=ij.current[pairId],pair=pairById.get(pairId)
  if(!at||!pair)return
  setReveals(r=>({...r,[pairId]:{status:'loading'}}))
  revealMemoryPair({slug:club,version,seed,cursor,size:deal.size,theme:deal.theme,i:at[0],j:at[1],lang:locale}).then(res=>{
   if(!mounted.current)return
   if(res.ok){setReveals(r=>({...r,[pairId]:{status:'ok',reveal:res.reveal}}));fileShelf(pair,res.reveal)}
   else setReveals(r=>({...r,[pairId]:{status:'failed'}}))
  }).catch(()=>{if(mounted.current)setReveals(r=>({...r,[pairId]:{status:'failed'}}))})
 },[club,version,seed,cursor,deal.size,deal.theme,locale,pairById,fileShelf])

 // ---- a flip
 const indexOf=(id:string)=>Number(id.slice(1))
 function onFlip(id:string,el:HTMLElement){
  if(phase!=='play')return
  const firstOpen=run.open[0],mate=echoMate(run,cards,id),out=flip(run,cards,id)
  if(out.kind==='ignored')return
  setRun(mate===null?out.run:spendEcho(out.run))
  if(mate!==null){setEchoOn(mate);later(()=>setEchoOn(null),ECHO_MS);setHint('mem.hint.echo')}
  if(out.kind==='open'){haptic('tap');setPlate(null);if(mate===null)setHint('mem.hint.one')}
  if(out.kind==='pair'){
   const pair=pairById.get(out.pair)
   if(pair){
    setPlate({pair,perfect:out.perfect});setFusing(true);later(()=>setFusing(false),FUSION_MS)
    setAnnounce(t('mem.announce.pair',{a:pair.a,b:pair.b}))
    fileShelf(pair)
    if(firstOpen)ij.current[pair.id]=[indexOf(firstOpen),indexOf(id)]
    askReveal(pair.id)
   }
   markStep(out.run.done.length);setHint(out.run.streak>=2?'mem.hint.hot':'mem.hint.locked')
   if(!reduced)firePickFxAt(el,{label:out.perfect?t('mem.plate.perfectShort'):t('mem.plate.kicker'),tone:'ink',big:out.perfect,haptic:'lock'})
   else haptic('lock')
  }
  if(out.kind==='miss'){
   setWrong(out.run.open);setHint('mem.hint.miss');setAnnounce(t('mem.announce.miss'));haptic('miss')
   later(()=>{setRun(closeOpen);setWrong([])},MISS_MS)
  }
 }

 // ---- one finished wall is one completion, recorded as its best streak; the result waits one beat so the last lock is seen
 useEffect(()=>{
  if(!done||recorded.current)return
  recorded.current=true
  const seconds=startedAt?Math.max(0,Math.floor((Date.now()-startedAt-hiddenMs.current)/1000)):0
  const r=resultOf(run,total,seconds,deal.size);setResult(r)
  completeRun(club,'memory',memoryRunKey({version,seed,cursor,size:deal.size,theme:deal.theme}),r.score)
  const rec=recordBest(readBests(club),r.category,{score:r.score,moves:r.moves,misses:r.misses,pairs:r.pairs,at:Date.now()})
  setBests(rec.bests);setImproved(rec.improved);if(rec.improved)writeBests(club,rec.bests)
  later(()=>setPhase('done'),RESULT_DELAY_MS)
 },[done,club,version,seed,cursor,run,total,startedAt,deal.size,deal.theme,later])

 const labels=useMemo(()=>({closed:(n:number)=>t('mem.card.closed',{n}),matched:t('mem.card.matched'),echo:t('mem.card.echo')}),[t])
 const threads=useMemo(()=>threadGeometry(cards,run.done,cols,rtl),[cards,run.done,cols,rtl])
 const wall=Math.round(morale(run,total)*100),lit=wallLit(run,total),echoLeft=Math.max(0,ECHO_STREAK-run.streak)

 if(phase==='ready')return <MemoryReady t={t} copy={copy} plan={plan} clubName={clubName} locale={locale} seed={seed} cursor={cursor} shelf={Object.keys(shelf).length} bests={bests} peek={peekOn} onPeek={setPeekOn} onStart={()=>{haptic('lock');lightTheWall(FLASH_MS,true)}}/>

 return <section className={css.stage} data-testid="memory-run" data-phase={phase} data-lit={lit||undefined} data-reduced={reduced||undefined} data-size={deal.size}>
  <p className="sr-only" role="status" aria-live="polite">{announce}</p>
  {phase==='done'&&result?<MemoryReport t={t} copy={copy} club={club} clubName={clubName} locale={locale} contentLocale={contentLocale} seed={seed} cursor={cursor} plan={plan} result={result} verdict={verdict(run,total)} label={deal.label}
    pairs={foundPairs(pairs,run.done)} perfectIds={run.perfect} reveals={reveals} onRetry={askReveal} best={bests[result.category]} improved={improved} shelfCount={Object.keys(shelf).length} onShelf={()=>setShelfOpen(true)} peek={peekOn}/>
  :<div className={css.play}>
   <div className={css.hud} data-testid="memory-hud">
    <p className={css.hudPairs}><span>{t('mem.hud.pairs')}</span> <b data-testid="memory-pairs"><Num>{run.done.length}/{total}</Num></b></p>
    <ol className={css.pips} aria-hidden="true">{pairs.map(p=><li key={p.id} data-lit={run.done.includes(p.id)}/>)}</ol>
    <p className={css.hudMoves}><span>{copy.flips}</span> <b data-testid="memory-moves"><Num>{run.moves}</Num></b></p>
    <p className={css.hudClock} aria-label={t('mem.hud.clock')}><Num>{clockOf(elapsed)}</Num></p>
    <p className={css.hudStreak} data-testid="memory-streak"><span>{t('mem.hud.streak')}</span> <b><Num>{run.streak}</Num></b></p>
    <div className={css.wallBar} role="img" aria-label={t('mem.hud.wallAria',{n:wall})} data-lit={lit||undefined}><span>{t('mem.hud.wall')}</span><i><b style={{inlineSize:`${wall}%`}}/></i><span className={css.wallPct}><Num>{wall}%</Num></span></div>
    <p className={css.echo} data-state={run.echo} data-testid="memory-echo">{run.echo==='armed'?t('mem.hud.echoArmed'):run.echo==='spent'?t('mem.hud.echoSpent'):t('mem.hud.echoIdle',{n:echoLeft})}</p>
   </div>
   <div className={css.boardBox}>
    {flashing&&<p className={css.flashBanner} data-testid="memory-flash"><b>{t('mem.flash.title')}</b><span aria-hidden="true">{count}</span></p>}
    <div className={css.boardWrap} style={{'--cols':cols,'--rows':rows} as CSSProperties}>
     <ul className={css.board} data-testid="memory-board" aria-label={t('mem.board')}>
      {cards.map((card,i)=><li key={card.id} className={css.cell}><WallCard card={card} n={i+1} order={run.done.indexOf(card.pair)+1} open={run.open.includes(card.id)} done={run.done.includes(card.pair)} wrong={wrong.includes(card.id)} echo={echoOn===card.id} flashing={flashing} locale={locale} contentLocale={contentLocale} labels={labels} onFlip={onFlip}/></li>)}
     </ul>
     {threads.length>0&&phase==='play'&&fusing&&<svg className={css.threads} aria-hidden="true" focusable="false" viewBox={`0 0 ${cols} ${rows}`} preserveAspectRatio="none">
      {threads.slice(-1).map(th=><g key={th.pair}><line x1={th.x1} y1={th.y1} x2={th.x2} y2={th.y2} strokeLinecap="round"/></g>)}
     </svg>}
    </div>
   </div>
   <div className={css.dock}>
    {flashing?<div className={css.flashRow}><p className={css.hintText}>{t('mem.flash.sub')}</p><button type="button" className={`min-h-tap ${css.tool}`} onClick={endFlash} data-testid="memory-skip">{t('mem.flash.skip')}</button></div>
    :<>
     {plate?<FusionPlate t={t} copy={copy} plate={plate} state={reveals[plate.pair.id]} locale={locale} contentLocale={contentLocale} fusing={fusing} onRetry={()=>askReveal(plate.pair.id)}/>:<p className={css.hintText} aria-live="polite">{t(hint)}</p>}
     <div className={css.toolRow}>
      <button type="button" className={`min-h-tap ${css.tool}`} disabled={!peekOn||run.flashUsed||phase!=='play'||run.open.length>0} onClick={peek} title={t('mem.peek.title')} data-testid="memory-peek">{!peekOn?t('mem.peek.locked'):run.flashUsed?t('mem.peek.spent'):t('mem.peek')}</button>
      <button type="button" className={`min-h-tap ${css.tool}`} onClick={()=>setShelfOpen(true)} data-testid="memory-shelf-open">{t('mem.shelf')} <b><Num>{Object.keys(shelf).length}</Num></b></button>
     </div>
    </>}
   </div>
  </div>}
  <ShelfSheet t={t} copy={copy} open={shelfOpen} onClose={()=>setShelfOpen(false)} shelf={shelf} ok={shelfOk} locale={locale} contentLocale={contentLocale}/>
 </section>
}
