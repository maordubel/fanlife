'use client'
import {useEffect,useMemo,useRef,useState,type CSSProperties,type PointerEvent as RPointerEvent} from 'react'
import Link from 'next/link'
import {firePickFxAt} from '@/components/stage/PickFx'
import {completeRun} from '@/lib/clubs/completion'
import {markStep,startVisit} from '@/lib/analytics/meter'
import {MIN_ROUND,answerOf,canPlay,dealRound,resultOf,roundQuery,scoreStep,shareText,summarise,type Choice,type Question,type Result,type WallMeeting} from '@/lib/clubs/derby-model'
import {dateText,type Shared,type Open} from './ui'
import css from './derby.module.css'

type Phase='intro'|'ask'|'reveal'|'done'
const SWIPE=90

/** Gate 11 · "Call it": a round dealt from the documented meetings — name the result before the score is shown. */
export function CallPanel({meetings,s,seed,cursor,version,rtl,autoStart,onOpen,onWall}:{meetings:WallMeeting[];s:Shared;seed:number;cursor:number;version:string;rtl:boolean;autoStart:boolean;onOpen:Open;onWall:()=>void}){
 const {t,locale,contentLocale,club,clubName,rival}=s
 const byId=useMemo(()=>new Map(meetings.map(m=>[m.id,m])),[meetings])
 const qs=useMemo(()=>dealRound(meetings,seed,cursor),[meetings,seed,cursor])
 const [phase,setPhase]=useState<Phase>(autoStart&&qs.length>0?'ask':'intro')
 const [i,setI]=useState(0),[trail,setTrail]=useState<boolean[]>([]),[picked,setPicked]=useState<Choice|null>(null)
 const [notice,setNotice]=useState(''),[drag,setDrag]=useState({dx:0,dy:0,on:false})
 const pointer=useRef<{x:number;y:number}|null>(null),nextRef=useRef<HTMLButtonElement>(null),rootRef=useRef<HTMLDivElement>(null)
 const q:Question|undefined=qs[i],right=q?answerOf(q,byId):null,summary=useMemo(()=>summarise(trail),[trail])
 const streak=(()=>{let n=0;for(let k=trail.length-1;k>=0&&trail[k];k--)n++;return n})()
 const points=summary.score
 // the side a swipe toward the START edge means: the club's plate sits on the inline-start side
 const startSign=rtl?1:-1

 useEffect(()=>{if(phase==='reveal')nextRef.current?.focus()},[phase])
 useEffect(()=>{if(phase==='ask')rootRef.current?.focus({preventScroll:true})},[phase,i])
 useEffect(()=>{
  if(phase!=='done')return
  completeRun(club,'derby',`derby:${version}:${seed}:${cursor}`,summary.score)
 },[phase,club,version,seed,cursor,summary.score])

 function answer(choice:Choice,el:Element|null){
  if(phase!=='ask'||!q)return
  const ok=choice===right
  setPicked(choice);setTrail(old=>[...old,ok]);setPhase('reveal');markStep(i+1)
  firePickFxAt(el,{tone:ok?'red':'sign',haptic:ok?'lock':'miss',label:ok?t('derby.call.points',{n:scoreStep(true,streak).points}):undefined})
 }
 function next(){
  if(i+1>=qs.length){setPhase('done');return}
  setI(i+1);setPicked(null);setPhase('ask')
 }
 function restart(){setI(0);setTrail([]);setPicked(null);setNotice('');setPhase('ask')}
 function begin(){startVisit();setPhase('ask')}

 // ---- keyboard: arrows mirror the swipe, and never fight the page when a control has focus
 useEffect(()=>{
  if(phase!=='ask'||!q)return
  const onKey=(e:KeyboardEvent)=>{
   if(e.metaKey||e.ctrlKey||e.altKey)return
   const target=e.target as HTMLElement|null
   if(target&&(target.tagName==='INPUT'||target.tagName==='SELECT'||target.tagName==='TEXTAREA'))return
   const card=document.querySelector('[data-call-card]') as HTMLElement|null
   if(q.kind==='result'){
    let c:Result|null=null
    if(e.key==='ArrowLeft')c=rtl?'L':'W';else if(e.key==='ArrowRight')c=rtl?'W':'L';else if(e.key==='ArrowUp'||e.key.toLowerCase()==='d')c='D'
    if(c){e.preventDefault();answer(c,document.querySelector(`[data-choice="${c}"]`)||card)}
   }else{
    const pick=e.key==='ArrowUp'||e.key==='1'?q.a:e.key==='ArrowDown'||e.key==='2'?q.b:null
    if(pick){e.preventDefault();answer(pick,document.querySelector(`[data-choice="${pick}"]`))}
   }
  }
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- answer closes over the live question and run state
 },[phase,q,rtl,streak,i])

 // ---- swipe the poster toward the call (a tap on a plate does the same job)
 const swipe=phase==='ask'&&q?.kind==='result'
 const down=(e:RPointerEvent<HTMLDivElement>)=>{if(!swipe)return;pointer.current={x:e.clientX,y:e.clientY};try{e.currentTarget.setPointerCapture(e.pointerId)}catch{/* a synthetic pointer cannot be captured */}setDrag({dx:0,dy:0,on:true})}
 const move=(e:RPointerEvent<HTMLDivElement>)=>{const p=pointer.current;if(!p)return;setDrag({dx:Math.max(-140,Math.min(140,e.clientX-p.x)),dy:Math.min(0,e.clientY-p.y),on:true})}
 const up=(e:RPointerEvent<HTMLDivElement>)=>{
  const p=pointer.current;if(!p)return;pointer.current=null
  const dx=e.clientX-p.x,dy=e.clientY-p.y;setDrag({dx:0,dy:0,on:false})
  const el=e.currentTarget
  if(Math.abs(dx)>SWIPE&&Math.abs(dx)>Math.abs(dy))answer(dx*startSign>0?'W':'L',el)
  else if(dy<-SWIPE&&Math.abs(dy)>Math.abs(dx))answer('D',el)
 }
 const cancel=()=>{pointer.current=null;setDrag({dx:0,dy:0,on:false})}
 const lean=drag.on?(drag.dy<-40&&Math.abs(drag.dy)>Math.abs(drag.dx)?'D':Math.abs(drag.dx)>40?(drag.dx*startSign>0?'W':'L'):null):null

 async function share(){
  const url=`${location.origin}/clubs/${club}/derby?${roundQuery(seed,cursor)}&tab=call&lang=${locale}`
  const text=shareText({club:clubName,rival,summary,url,title:t('derby.share.title')})
  try{
   if(typeof navigator.share==='function'){await navigator.share({title:t('derby.share.title'),text});setNotice(t('derby.res.shared'))}
   else{await navigator.clipboard.writeText(text);setNotice(t('derby.res.copied'))}
  }catch(e){if((e as Error)?.name!=='AbortError')setNotice(t('derby.res.shareFail'))}
 }

 if(!canPlay(meetings)||qs.length===0)return <div className={css.scroll}><div className={css.bare} data-testid="derby-call-locked"><h2>{t('derby.call.locked.title')}</h2><p>{t('derby.call.locked',{min:MIN_ROUND,n:meetings.filter(m=>m.us!==null).length})}</p><button type="button" className={css.btn} onClick={onWall}>{t('derby.res.wall')}</button></div></div>

 if(phase==='intro')return <div className={css.intro} data-testid="derby-call-intro">
  <div className={css.bare}><h2>{t('derby.call.title')}</h2><p>{t('derby.call.intro',{n:qs.reduce((n,x)=>n+(x.kind==='result'?1:2),0)})}</p><p className={css.fine}>{t('derby.call.rules')}</p></div>
  <button type="button" className={`${css.btn} ${css.btnPrimary} ${css.btnWide}`} onClick={begin} data-testid="derby-call-start">{t('derby.call.start')}</button>
 </div>

 if(phase==='done')return <div className={css.slip} data-testid="derby-slip">
  <div className={css.slipHead}><h2>{t('derby.res.title')}</h2><span className={css.slipBig}>{summary.correct}/{summary.total}</span><p className={css.status}>{t('derby.res.line',{correct:summary.correct,total:summary.total})} · {t('derby.call.points',{n:summary.score})} · {t('derby.res.best',{n:summary.bestStreak})}</p></div>
  <ol className={css.trail} aria-label={t('derby.res.title')}>{summary.trail.map((ok,k)=><li key={k} data-s={ok?'right':'wrong'}><span aria-hidden="true">{ok?'✓':'✗'}</span><span className="sr-only">{ok?t('derby.call.right'):t('derby.call.wrong')}</span></li>)}</ol>
  <div className={css.actions}>
   <button type="button" className={`${css.btn} ${css.btnPrimary}`} onClick={share} data-testid="derby-share">{t('derby.res.share')}</button>
   <button type="button" className={css.btn} onClick={restart}>{t('derby.res.again')}</button>
   <Link className={css.btn} href={`/clubs/${club}/derby?${roundQuery(seed,cursor+1)}&play=1&lang=${locale}`} data-testid="derby-new-round">{t('derby.res.new')}</Link>
   <button type="button" className={css.btn} onClick={onWall}>{t('derby.res.wall')}</button>
  </div>
  <p className={css.status} role="status">{notice}</p>
 </div>

 if(!q)return null
 const revealed=phase==='reveal',ok=revealed&&trail[trail.length-1]===true
 const m=q.kind==='result'?byId.get(q.meeting):null
 const trueResult=m?resultOf(m):null
 const dot=(k:number)=>k<trail.length?(trail[k]?'right':'wrong'):k===i?'now':'todo'
 const plate=(c:Result,kind:'club'|'rival'|'draw',label:string)=><button key={c} type="button" className={css.plate} data-k={kind} data-choice={c} data-lean={lean===c} onClick={e=>answer(c,e.currentTarget)} aria-keyshortcuts={c==='D'?'ArrowUp D':(c==='W')!==rtl?'ArrowLeft':'ArrowRight'}>{label}</button>
 return <div className={css.call} ref={rootRef} tabIndex={-1} data-testid="derby-call" data-phase={phase}>
  <div className={css.hud}>
   <ol className={css.dots} aria-label={t('derby.call.progress',{n:Math.min(i+1,qs.length),total:qs.length})}>{qs.map((x,k)=><li key={x.id} data-s={dot(k)}/>)}</ol>
   <span className={css.hudStat}>{t('derby.call.points',{n:points})}</span>
   {streak>1&&<span className={css.hudStat}>{t('derby.call.streak',{n:streak})}</span>}
  </div>
  <div className={css.arena}>
   {q.kind==='result'&&m&&<div className={css.card} data-call-card data-drag={drag.on} data-swipe={swipe} data-pop={phase==='ask'} style={{'--lean':`${drag.dx}px`} as CSSProperties}
     onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
    <div className={css.cardTop}><span><bdi lang={contentLocale} dir="auto">{m.comp||t('derby.dossier.noComp')}</bdi></span><span><bdi>{dateText(m,locale,t)}</bdi></span></div>
    <p className={css.q}>{t('derby.call.q.result')}</p>
    <div className={css.callSides}><span data-us={m.us==='home'}><bdi lang={contentLocale} dir="auto">{m.home}</bdi></span><span data-us={m.us==='away'}><bdi lang={contentLocale} dir="auto">{m.away}</bdi></span></div>
    <div className={css.callScore} data-hidden={!revealed} aria-label={revealed?t('derby.call.truth',{home:m.home,hg:m.hg,ag:m.ag,away:m.away}):t('derby.call.hidden')}>{revealed?`${m.hg}–${m.ag}`:'?–?'}</div>
    <p className={css.callComp}>{t('derby.you')}: <bdi>{clubName}</bdi></p>
    {revealed&&<span className={css.bigStamp} data-ok={ok} aria-hidden="true">{t(`derby.res.${trueResult??'U'}`)}</span>}
   </div>}
   {q.kind==='earlier'&&<div className={css.pair}>
    <p className={css.q} style={{textAlign:'center'}}>{t('derby.call.q.earlier')}</p>
    {([['A',q.a],['B',q.b]] as const).map(([tag,id])=>{const x=byId.get(id)!,state=!revealed?'':id===right?'right':id===picked?'wrong':''
     return <button key={id} type="button" className={css.pairCard} data-choice={id} data-s={state} disabled={revealed} onClick={e=>answer(id,e.currentTarget)} aria-keyshortcuts={tag==='A'?'ArrowUp 1':'ArrowDown 2'}
      aria-label={t('derby.call.pairKey',{tag,home:x.home,hg:x.hg,ag:x.ag,away:x.away,comp:x.comp||t('derby.dossier.noComp')})}>
      <span className={css.pairTag}>{tag==='A'?t('derby.call.pairA'):t('derby.call.pairB')}{revealed&&<> · <bdi>{dateText(x,locale,t)}</bdi></>}</span>
      <span className={css.pairLine}><bdi lang={contentLocale} dir="auto">{x.home}</bdi> {x.hg}–{x.ag} <bdi lang={contentLocale} dir="auto">{x.away}</bdi></span>
      <span className={css.callComp}><bdi lang={contentLocale} dir="auto">{x.comp||t('derby.dossier.noComp')}</bdi></span>
     </button>})}
   </div>}
  </div>
  <div className={css.dock}>
   {!revealed&&q.kind==='result'&&<div className={css.plates} role="group" aria-label={t('derby.call.q.result')}>
    {plate('W','club',t('derby.call.club',{club:clubName}))}{plate('D','draw',t('derby.call.draw'))}{plate('L','rival',t('derby.call.rival',{rival}))}
   </div>}
   {!revealed&&q.kind==='earlier'&&<p className={css.fine} style={{textAlign:'center'}}>{t('derby.call.q.earlier')}</p>}
   {revealed&&<>
    <div className={css.feedback} data-ok={ok} role="status"><p>{ok?t('derby.call.right'):t('derby.call.wrong')}{q.kind==='result'&&trueResult?<> · <bdi>{clubName}</bdi>: {t(`derby.word.${trueResult}`)}</>:null}</p>
     {m&&<button type="button" className={css.btn} onClick={e=>onOpen(m,e.currentTarget)} aria-label={t('derby.dossier')}>i</button>}</div>
    <button ref={nextRef} type="button" className={`${css.btn} ${css.btnPrimary} ${css.btnWide}`} onClick={next} data-testid="derby-next">{i+1>=qs.length?t('derby.call.finish'):t('derby.call.next')}</button>
   </>}
  </div>
 </div>
}
