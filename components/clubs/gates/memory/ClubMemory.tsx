'use client'
import Link from 'next/link'
import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties} from 'react'
import type {MemoryObject,MemoryPair,MemoryRound} from '@/lib/game/memory'
import {ECHO_MS,ECHO_STREAK,FLASH_MS,RE_FLASH_MS,closeOpen,countdownAt,echoMate,finished,flip,morale,numericFace,spendEcho,spendFlash,startRun,threadGeometry,verdict,wallLit} from '@/lib/game/memory-run'
import {completeRun} from '@/lib/clubs/completion'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import {MIN_PAIRS,MISS_MS,RESULT_DELAY_MS,clockOf,columnsFor,foundPairs,memoryQuery,memoryRunKey,resultOf,shareText,verdictKey} from '@/lib/clubs/memory-model'
import {addToShelf,readShelf,shelfList,writeShelf,type Shelf} from '@/lib/clubs/memory-shelf'
import {firePickFxAt} from '@/components/stage/PickFx'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {ObjectMark} from '@/components/memory/ObjectMark'
import {Num} from '@/components/ui/Num'
import {haptic} from '@/lib/play/haptics'
import {markStep} from '@/lib/analytics/meter'
import {tr} from '@/components/clubs/rumble/shared'
import {memoryKindLabel} from '@/lib/clubs/memory-kinds'
import {WallCard} from './WallCard'
import css from './memory.module.css'

export type ClubMemoryProps={
 round:MemoryRound;club:string;clubName:string;version:string;seed:number;cursor:number;locale:UiLocale;contentLocale:string
 copy:GameCopy;links:Record<string,string>;autostart:boolean
}
type Phase='ready'|'flash'|'play'|'done'
type Plate={pair:MemoryPair;perfect:boolean}

/** Gate 6 · the Memory Wall: one look, then the pairs — every pair is two faces of one archive fact. */
export function ClubMemory(props:ClubMemoryProps){
 const {round,club,clubName,version,seed,cursor,locale,contentLocale,copy,links}=props
 const t=useCallback((k:string,v?:Record<string,string|number>)=>tr(copy,k,v),[copy])
 const {cards,pairs}=round,total=pairs.length,cols=columnsFor(cards.length),rows=Math.ceil(cards.length/cols)
 const [run,setRun]=useState(startRun),[phase,setPhase]=useState<Phase>(props.autostart?'flash':'ready'),[wrong,setWrong]=useState<string[]>([]),[echoOn,setEchoOn]=useState<string|null>(null)
 const [plate,setPlate]=useState<Plate|null>(null),[count,setCount]=useState<number|null>(props.autostart?countdownAt(0,FLASH_MS):null),[hint,setHint]=useState('mem.hint.find'),[announce,setAnnounce]=useState('')
 const [startedAt,setStartedAt]=useState<number|null>(props.autostart?Date.now():null),[elapsed,setElapsed]=useState(0),[shelf,setShelf]=useState<Shelf>({}),[shelfOpen,setShelfOpen]=useState(false),[shelfOk,setShelfOk]=useState(true),[note,setNote]=useState('')
 const timers=useRef<number[]>([]),flashTimers=useRef<number[]>([]),shelfRef=useRef<Shelf>({}),recorded=useRef(false),finalSeconds=useRef(0)
 const byId=useMemo(()=>new Map(pairs.map(p=>[p.id,p] as const)),[pairs])
 const done=finished(run,total),flashing=phase==='flash',rtl=locale==='he'

 const later=useCallback((fn:()=>void,ms:number)=>{timers.current.push(window.setTimeout(fn,ms))},[])
 const clearFlash=useCallback(()=>{for(const id of flashTimers.current){window.clearTimeout(id);window.clearInterval(id)}flashTimers.current=[]},[])
 useEffect(()=>()=>{for(const id of [...timers.current,...flashTimers.current]){window.clearTimeout(id);window.clearInterval(id)}timers.current=[];flashTimers.current=[]},[])
 useEffect(()=>{const s=readShelf(club);shelfRef.current=s;setShelf(s)},[club])

 // ---- the flash: every card is face up, then the lights go down; it can be dimmed early
 const countDown=useCallback((ms:number)=>{
  const opened=Date.now();setCount(countdownAt(0,ms))
  flashTimers.current.push(window.setInterval(()=>setCount(countdownAt(Date.now()-opened,ms)),200))
 },[])
 const lightTheWall=useCallback((ms:number,first:boolean)=>{
  if(first)setStartedAt(at=>at??Date.now())
  clearFlash();setPhase('flash');setHint('mem.hint.photograph');setAnnounce(t('mem.announce.flash',{s:Math.round(ms/1000)}));countDown(ms)
  flashTimers.current.push(window.setTimeout(()=>{clearFlash();setPhase('play');setCount(null);setHint('mem.hint.find');setAnnounce(t('mem.announce.play'))},ms))
 },[countDown,clearFlash,t])
 useEffect(()=>{if(props.autostart)lightTheWall(FLASH_MS,true)},[]) // eslint-disable-line react-hooks/exhaustive-deps -- once on mount; strict mode runs it twice and the second run starts the beat afresh
 function endFlash(){
  if(phase!=='flash')return
  clearFlash();setPhase('play');setCount(null);setHint('mem.hint.find');setAnnounce(t('mem.announce.play'));haptic('tap')
 }
 function peek(){
  if(run.flashUsed||phase!=='play'||done||run.open.length>0||wrong.length>0)return
  setRun(spendFlash);lightTheWall(RE_FLASH_MS,false)
 }

 // ---- the clock is a stopwatch: it never ends a run
 useEffect(()=>{
  if(startedAt===null||done||phase==='ready')return
  const id=window.setInterval(()=>setElapsed(Math.floor((Date.now()-startedAt)/1000)),500)
  return ()=>window.clearInterval(id)
 },[startedAt,done,phase])

 // ---- a flip
 function onFlip(id:string,el:HTMLElement){
  if(phase!=='play')return
  const mate=echoMate(run,cards,id),out=flip(run,cards,id)
  if(out.kind==='ignored')return
  setRun(mate===null?out.run:spendEcho(out.run))
  if(mate!==null){setEchoOn(mate);later(()=>setEchoOn(null),ECHO_MS);setHint('mem.hint.echo')}
  if(out.kind==='open'){haptic('tap');setPlate(null);if(mate===null)setHint('mem.hint.one')}
  if(out.kind==='pair'){
   const pair=byId.get(out.pair)
   if(pair){
    setPlate({pair,perfect:out.perfect});setAnnounce(t('mem.announce.pair',{a:pair.a,b:pair.b}))
    const next=addToShelf(shelfRef.current,pair,Date.now())
    if(next!==shelfRef.current){shelfRef.current=next;setShelf(next);setShelfOk(writeShelf(club,next))}
   }
   markStep(out.run.done.length);setHint(out.run.streak>=2?'mem.hint.hot':'mem.hint.locked')
   firePickFxAt(el,{label:out.perfect?t('mem.plate.perfectShort'):t('mem.plate.kicker'),tone:'ink',big:out.perfect,haptic:'lock'})
  }
  if(out.kind==='miss'){
   setWrong(out.run.open);setHint('mem.hint.miss');setAnnounce(t('mem.announce.miss'));haptic('miss')
   later(()=>{setRun(closeOpen);setWrong([])},MISS_MS)
  }
 }

 // ---- one finished wall is one completion; the result waits one beat so the last lock is seen
 useEffect(()=>{
  if(!done||recorded.current)return
  recorded.current=true;finalSeconds.current=startedAt?Math.floor((Date.now()-startedAt)/1000):0
  completeRun(club,'memory',memoryRunKey({version,seed,cursor}),resultOf(run,total,finalSeconds.current).score)
  later(()=>setPhase('done'),RESULT_DELAY_MS)
 },[done,club,version,seed,cursor,run,total,startedAt,later])

 const labels=useMemo(()=>({closed:(n:number)=>t('mem.card.closed',{n}),matched:t('mem.card.matched'),echo:t('mem.card.echo')}),[t])
 const threads=useMemo(()=>threadGeometry(cards,run.done,cols,rtl),[cards,run.done,cols,rtl])
 const wall=Math.round(morale(run,total)*100),lit=wallLit(run,total),echoLeft=Math.max(0,ECHO_STREAK-run.streak)

 if(total<MIN_PAIRS)return <section className={css.stage} data-testid="memory-empty"><p className={css.fine}>{t('mem.short')}</p></section>
 if(phase==='ready')return <Ready t={t} clubName={clubName} total={total} shelf={Object.keys(shelf).length} onStart={()=>{haptic('lock');lightTheWall(FLASH_MS,true)}} partial={copy.partial} short={total<6}/>
 const result=phase==='done'?resultOf(run,total,finalSeconds.current):null

 return <section className={css.stage} data-testid="memory-run" data-phase={phase} data-lit={lit||undefined}>
  <p className="sr-only" role="status" aria-live="polite">{announce}</p>
  {result?<Result t={t} copy={copy} club={club} clubName={clubName} locale={locale} contentLocale={contentLocale} seed={seed} cursor={cursor} result={result} verdictOf={verdict(run,total)} pairs={foundPairs(pairs,run.done)} links={links} shelfCount={Object.keys(shelf).length} onShelf={()=>setShelfOpen(true)} perfectIds={run.perfect}/>
  :<div className={css.play}>
   <div className={css.hud} data-testid="memory-hud">
    <p className={css.hudPairs}><span>{t('mem.hud.pairs')}</span> <b data-testid="memory-pairs"><Num>{run.done.length}/{total}</Num></b></p>
    <ol className={css.pips} aria-hidden="true">{pairs.map(p=><li key={p.id} data-lit={run.done.includes(p.id)}/>)}</ol>
    <p className={css.hudMoves}><span>{copy.flips}</span> <b><Num>{run.moves}</Num></b></p>
    <p className={css.hudClock} aria-label={t('mem.hud.clock')}><Num>{clockOf(elapsed)}</Num></p>
    <div className={css.wallBar} role="img" aria-label={t('mem.hud.wallAria',{n:wall})} data-lit={lit||undefined}><span>{t('mem.hud.wall')}</span><i><b style={{inlineSize:`${wall}%`}}/></i><span className={css.wallPct}><Num>{wall}%</Num></span></div>
    <p className={css.echo} data-state={run.echo} data-testid="memory-echo">{run.echo==='armed'?t('mem.hud.echoArmed'):run.echo==='spent'?t('mem.hud.echoSpent'):t('mem.hud.echoIdle',{n:echoLeft})}</p>
   </div>
   <div className={css.boardBox}>
    {flashing&&<p className={css.flashBanner} data-testid="memory-flash"><b>{t('mem.flash.title')}</b><span aria-hidden="true">{count}</span></p>}
    <div className={css.boardWrap}>
     <ul className={css.board} data-testid="memory-board" aria-label={t('mem.board')} style={{'--cols':cols,'--rows':rows} as CSSProperties}>
      {cards.map((card,i)=><li key={card.id} className={css.cell}><WallCard card={card} n={i+1} order={run.done.indexOf(card.pair)+1} open={run.open.includes(card.id)} done={run.done.includes(card.pair)} wrong={wrong.includes(card.id)} echo={echoOn===card.id} flashing={flashing} locale={locale} contentLocale={contentLocale} labels={labels} onFlip={onFlip}/></li>)}
     </ul>
     {threads.length>0&&phase==='play'&&<svg className={css.threads} aria-hidden="true" focusable="false" viewBox={`0 0 ${cols} ${rows}`} preserveAspectRatio="none">
      {threads.slice(-1).map(th=><g key={th.pair}><line x1={th.x1} y1={th.y1} x2={th.x2} y2={th.y2}/><circle cx={th.x1} cy={th.y1} r={.06}/><circle cx={th.x2} cy={th.y2} r={.06}/></g>)}
     </svg>}
    </div>
   </div>
   <div className={css.dock}>
    {flashing?<div className={css.flashRow}><p className={css.hintText}>{t('mem.flash.sub')}</p><button type="button" className={css.tool} onClick={endFlash} data-testid="memory-skip">{t('mem.flash.skip')}</button></div>
    :<>
     {plate?<FusionPlate t={t} plate={plate} href={links[plate.pair.id]} copy={copy} locale={locale} contentLocale={contentLocale}/>:<p className={css.hintText} aria-live="polite">{t(hint)}</p>}
     <div className={css.toolRow}>
      <button type="button" className={css.tool} disabled={run.flashUsed||phase!=='play'||run.open.length>0} onClick={peek} title={t('mem.peek.title')} data-testid="memory-peek">{run.flashUsed?t('mem.peek.spent'):t('mem.peek')}</button>
      <button type="button" className={css.tool} onClick={()=>setShelfOpen(true)} data-testid="memory-shelf-open">{t('mem.shelf')} <b><Num>{Object.keys(shelf).length}</Num></b></button>
     </div>
    </>}
   </div>
  </div>}
  <ShelfSheet t={t} copy={copy} open={shelfOpen} onClose={()=>setShelfOpen(false)} shelf={shelf} ok={shelfOk} locale={locale} contentLocale={contentLocale} links={links}/>
  {note&&<p className="sr-only" role="status">{note}</p>}
 </section>
}

type T=(k:string,v?:Record<string,string|number>)=>string

/** the pregame: what the wall is, one explicit Start — nothing is lit until it is pressed */
function Ready({t,clubName,total,shelf,onStart,partial,short}:{t:T;clubName:string;total:number;shelf:number;onStart:()=>void;partial:string;short:boolean}){
 return <section className={css.stage} data-testid="memory-ready">
  <div className={css.ready}>
   <p className={css.readyKicker}>{clubName} · {t('mem.kicker')}</p>
   <p className={css.readyNo} aria-hidden="true">{total}</p>
   <h2 className={css.readyTitle}>{t('mem.ready.title',{n:total})}</h2>
   <ul className={css.rules}>
    <li><b>1</b><span>{t('mem.ready.rule1')}</span></li>
    <li><b>2</b><span>{t('mem.ready.rule2')}</span></li>
    <li><b>3</b><span>{t('mem.ready.rule3')}</span></li>
   </ul>
   {short&&<p className={css.fine}>{partial}</p>}
   <p className={css.fine}>{t('mem.ready.shelf',{n:shelf})}</p>
   <button type="button" className={css.start} onClick={onStart} data-testid="memory-start">{t('mem.start')}</button>
  </div>
 </section>
}

/** a locked pair as one memory: the two faces joined, what kind of fact it is, the archive's own sentence if it holds one */
function FusionPlate({t,plate,href,copy,locale,contentLocale}:{t:T;plate:Plate;href?:string;copy:GameCopy;locale:string;contentLocale:string}){
 const {pair,perfect}=plate
 const face=(v:string)=>numericFace(v)?<Num>{v}</Num>:v
 return <div className={css.plate} data-perfect={perfect||undefined} role="status" data-testid="memory-plate" key={pair.id}>
  <span className={css.plateIcon}><ObjectMark object={pair.object} className={css.obj}/></span>
  <div className={css.plateText} lang={contentLocale} dir="auto">
   <p className={css.plateHead}><span className={css.plateKicker}>{t('mem.plate.kicker')}</span>{perfect&&<span className={css.perfect}>{t('mem.plate.perfect')}</span>}</p>
   <p className={css.plateFaces}><b>{face(pair.a)}</b> <span aria-hidden="true">↔</span> <b>{face(pair.b)}</b></p>
   <p className={css.plateKind}>{memoryKindLabel(pair.kind,locale)}{pair.factHe?` · ${pair.factHe}`:''}</p>
   {href&&<Link className={css.plateLink} href={href}>{copy.archiveEntry} →</Link>}
  </div>
 </div>
}

/** the souvenir shelf: every pair this device has ever found on this club's wall */
function ShelfSheet({t,copy,open,onClose,shelf,ok,locale,contentLocale,links}:{t:T;copy:GameCopy;open:boolean;onClose:()=>void;shelf:Shelf;ok:boolean;locale:string;contentLocale:string;links:Record<string,string>}){
 const list=shelfList(shelf)
 return <SlideSheet open={open} onClose={onClose} title={t('mem.shelf.title')} closeLabel={copy['play.close']} size="half">
  {list.length===0?<p className={css.fine}>{t('mem.shelf.empty')}</p>
   :<ul className={css.shelf}>{list.map(e=><li key={e.id} lang={contentLocale} dir="auto">
    <span className={css.plateIcon}><ObjectMark object={e.object as MemoryObject} className={css.obj}/></span>
    <div><p className={css.plateFaces}><b>{numericFace(e.a)?<Num>{e.a}</Num>:e.a}</b> <span aria-hidden="true">↔</span> <b>{numericFace(e.b)?<Num>{e.b}</Num>:e.b}</b></p>
     <p className={css.plateKind}>{memoryKindLabel(e.kind,locale)}{e.fact?` · ${e.fact}`:''}</p>
     {links[e.id]&&<Link className={css.plateLink} href={links[e.id]!}>{copy.archiveEntry} →</Link>}</div>
   </li>)}</ul>}
  <p className={css.fine}>{t('mem.shelf.kept',{n:list.length})} {copy.localOnly}</p>
  {!ok&&<p className={css.fine} role="alert">{t('mem.shelf.blocked')}</p>}
 </SlideSheet>
}

/** the closing screen: a verdict read from the run's counters, the wall you built, and the next door */
function Result({t,copy,club,clubName,locale,contentLocale,seed,cursor,result,verdictOf,pairs,links,shelfCount,onShelf,perfectIds}:{t:T;copy:GameCopy;club:string;clubName:string;locale:UiLocale;contentLocale:string;seed:number;cursor:number;result:ReturnType<typeof resultOf>;verdictOf:ReturnType<typeof verdict>;pairs:MemoryPair[];links:Record<string,string>;shelfCount:number;onShelf:()=>void;perfectIds:readonly string[]}){
 const [copied,setCopied]=useState('')
 async function share(){
  const url=`${location.origin}${location.pathname}?${memoryQuery({seed,cursor,lang:locale})}`
  const text=shareText({club:clubName,title:copy['gate.memory'],pairs:result.pairs,moves:result.moves,misses:result.misses,url,verdict:t(verdictKey(verdictOf))})
  try{
   if(typeof navigator.share==='function'){await navigator.share({title:clubName,text,url});return}
   await navigator.clipboard.writeText(text);setCopied(t('mem.result.copied'))
  }catch{/* a cancelled share is not an error */}
 }
 return <section className={css.result} data-testid="memory-result" data-verdict={verdictOf}>
  <div className={css.resultHead}>
   <p className={css.readyKicker}>{clubName} · {t('mem.result.kicker')}</p>
   <h2 className={css.resultTitle}>{t(verdictKey(verdictOf))}</h2>
   <p className={css.resultScore}><span className="sr-only">{copy.score}: </span>{result.score}</p>
   <p className={css.resultLine}>{copy.memoryComplete}</p>
   <ul className={css.facts}>
    <li><b><Num>{result.moves}</Num></b>{copy.flips}</li>
    <li><b><Num>{result.misses}</Num></b>{t('mem.result.misses')}</li>
    <li><b><Num>{result.bestStreak}</Num></b>{t('mem.result.streak')}</li>
    <li><b><Num>{result.perfect}</Num></b>{t('mem.result.perfect')}</li>
    <li><b><Num>{clockOf(result.seconds)}</Num></b>{t('mem.result.time')}</li>
    <li><b><Num>{shelfCount}</Num></b>{t('mem.shelf')}</li>
   </ul>
  </div>
  <div className={css.card2}>
   <h3>{t('mem.result.mural')}</h3>
   <ol className={css.mural}>{pairs.map(p=><li key={p.id} lang={contentLocale} dir="auto" data-perfect={perfectIds.includes(p.id)||undefined}>
    <span className={css.plateIcon}><ObjectMark object={p.object} className={css.obj}/></span>
    <div><p className={css.plateFaces}><b>{numericFace(p.a)?<Num>{p.a}</Num>:p.a}</b> <span aria-hidden="true">↔</span> <b>{numericFace(p.b)?<Num>{p.b}</Num>:p.b}</b></p>
     <p className={css.plateKind}>{memoryKindLabel(p.kind,locale)}{p.factHe?` · ${p.factHe}`:''}</p>
     {links[p.id]&&<Link className={css.plateLink} href={links[p.id]!}>{copy.archiveEntry} →</Link>}</div>
   </li>)}</ol>
   <p className={css.fine}>{copy.localOnly}</p>
  </div>
  <div className={css.actions}>
   <Link className={css.cta} data-kind="lit" href={`?${memoryQuery({seed,cursor:cursor+1,lang:locale,go:true})}`}><span>{copy.replay}</span><span aria-hidden="true">→</span></Link>
   <button type="button" className={css.cta} onClick={share}><span>{t('mem.result.share')}</span><span aria-hidden="true">↗</span></button>
   {copied&&<p className={css.fine} role="status">{copied}</p>}
   <button type="button" className={css.cta} data-kind="plain" onClick={onShelf}><span>{t('mem.result.shelf')}</span><span aria-hidden="true">→</span></button>
   <Link className={css.cta} data-kind="plain" href={`/clubs/${club}/archive?lang=${locale}`}><span>{copy['gate.archive']}</span><span aria-hidden="true">→</span></Link>
   <Link className={css.cta} data-kind="plain" href={`/clubs/${club}?lang=${locale}`}><span>{copy.backToClub}</span><span aria-hidden="true">→</span></Link>
  </div>
 </section>
}
