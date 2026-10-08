'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import Link from 'next/link'
import {markStep} from '@/lib/analytics/meter'
import type {GameCopy} from '@/lib/clubs/game-copy'
import {localeDirection,localizedDate,type UiLocale} from '@/lib/clubs/locale'
import {tr} from '@/components/clubs/rumble/shared'
import {clampIndex,gapBetween,stepFor,yearKnots,type Gap,type ThreadEvent,type ThreadPlan} from '@/lib/clubs/thread-model'
import css from './thread.module.css'

export type ThreadSource={title:string;publisher:string;url:string|null}
export type ClubThreadProps={
 club:string;clubName:string;locale:UiLocale;contentLocale:string;copy:GameCopy
 /** null = the archive holds no dated event for this club */
 plan:ThreadPlan|null
 /** the sources of the entries in the chosen decade, by id */
 sources:Record<string,ThreadSource>
 /** the archive gate (12) is open for this club, so an entry can link to it */
 archiveOpen:boolean
 /** the number of entries dated to the day across the whole thread (for the honesty line) */
 exactTotal:number
}

const SWIPE=60

/**
 * Gate 13 · The Thread (a generic template — every club, whatever its archive holds).
 * One decade travels to the browser; inside it you scrub, swipe, tap the year knots or press the arrow keys, and the
 * thread continues into the neighbouring decade through a link. Entries dated to the day are ordered by it; a
 * year-only entry says so on its stamp and never states a gap it cannot know.
 */
export function ClubThread(p:ClubThreadProps){
 const {club,clubName,locale,contentLocale,copy,plan,sources,archiveOpen,exactTotal}=p
 const t=(k:string,v?:Record<string,string|number>)=>tr(copy,k,v)
 const rtl=localeDirection(locale)==='rtl'
 const events=useMemo(()=>plan?.events??[],[plan])
 const [idx,setIdx]=useState(plan?.start??0),[dir,setDir]=useState<'next'|'prev'|'none'>('none'),[lean,setLean]=useState(0),[drag,setDrag]=useState(false)
 const seen=useRef<Set<number>>(new Set([plan?.start??0])),down=useRef<{x:number;y:number;id:number}|null>(null),knotsRef=useRef<HTMLUListElement|null>(null)
 const len=events.length,cur=events[idx]
 const knots=useMemo(()=>yearKnots(events),[events])

 const go=(n:number)=>{
  const next=clampIndex(n,len);if(next===idx)return
  setDir(next>idx?'next':'prev');setIdx(next)
  seen.current.add(next);markStep(seen.current.size)
 }
 useEffect(()=>{markStep(0,undefined,true)},[])

 // the arrow keys step through the thread (mirrored in RTL); Home/End jump to the ends of the decade
 const goRef=useRef(go);goRef.current=go
 const idxRef=useRef(idx);idxRef.current=idx
 useEffect(()=>{
  const onKey=(e:KeyboardEvent)=>{
   if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||len===0)return
   const el=e.target as HTMLElement|null
   if(el&&(el.closest('input,select,textarea,[contenteditable="true"],[role="dialog"]')))return
   if(document.querySelector('[role="dialog"]'))return
   if(e.key==='Home'){e.preventDefault();goRef.current(0);return}
   if(e.key==='End'){e.preventDefault();goRef.current(len-1);return}
   const s=stepFor(e.key,rtl);if(s===null)return
   e.preventDefault();goRef.current(idxRef.current+s)
  }
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)
 },[len,rtl])

 // keep the current year's knot in view as the thread moves
 useEffect(()=>{
  const el=knotsRef.current?.querySelector<HTMLElement>('[aria-current="true"]');if(!el)return
  const calm=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({inline:'center',block:'nearest',behavior:calm?'auto':'smooth'})
 },[cur?.year])

 if(!plan||!cur)return <section className={css.stage} data-testid="timeline-thread-empty" lang={locale}><div className={css.bare}><h2>{t('tl.empty.title')}</h2><p>{t('tl.empty',{club:clubName})}</p></div></section>

 const href=(q:Record<string,string>)=>`?${new URLSearchParams({mode:'chronicle',lang:locale,...q})}`
 const dateOf=(e:ThreadEvent)=>e.on?localizedDate(e.on,locale):t('tl.yearOnly.line',{year:e.year})
 const before=events[idx-1],after=events[idx+1]
 const gap=gapBetween(before,cur)
 const gapText=(g:Gap)=>g.kind==='same'?t('tl.gap.same'):g.kind==='days'?(g.n===1?t('tl.gap.d1'):t('tl.gap.dn',{n:g.n})):g.kind==='months'?t('tl.gap.mn',{n:g.n}):t('tl.gap.yn',{n:g.n})
 const gapLine=before
  ?(gap?gapText(gap):t('tl.gap.unstated'))
  :(plan.prev?t('tl.cont',{decade:plan.prev.decade}):t('tl.start'))
 const month=cur.on?new Intl.DateTimeFormat(locale==='he'?'he':'en-GB',{month:'short',timeZone:'UTC'}).format(new Date(`${cur.on}T00:00:00Z`)):''
 const srcs=cur.sources.map(id=>sources[id]).filter((s):s is ThreadSource=>!!s)

 const onDown=(e:React.PointerEvent)=>{if(e.pointerType==='mouse'&&e.button!==0)return;down.current={x:e.clientX,y:e.clientY,id:e.pointerId}}
 const onMove=(e:React.PointerEvent)=>{
  const d=down.current;if(!d||d.id!==e.pointerId)return
  const dx=e.clientX-d.x,dy=e.clientY-d.y
  if(!drag&&Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.5){setDrag(true);(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)}
  if(drag)setLean(Math.max(-40,Math.min(40,dx/3)))
 }
 const finish=(e:React.PointerEvent,commit:boolean)=>{
  const d=down.current;down.current=null
  if(!d||d.id!==e.pointerId){setDrag(false);setLean(0);return}
  const dx=e.clientX-d.x,dy=e.clientY-d.y
  setDrag(false);setLean(0)
  if(commit&&Math.abs(dx)>=SWIPE&&Math.abs(dx)>Math.abs(dy)*1.5){
   // finger toward the line's end = the newer entry; in RTL reading the line runs the other way
   const forward=rtl?dx>0:dx<0
   go(idx+(forward?1:-1))
  }
 }

 const prevGlyph=rtl?'→':'←',nextGlyph=rtl?'←':'→'
 const atStart=idx===0,atEnd=idx===len-1
 const stepPrev=!atStart
  ?<button type="button" className={`${css.step} min-h-tap`} onClick={()=>go(idx-1)} data-testid="timeline-thread-prev"><span aria-hidden="true">{prevGlyph}</span>{t('tl.prev')}</button>
  :plan.prev?<Link prefetch={false} scroll={false} className={css.step} href={href({at:plan.prev.id})} data-testid="timeline-thread-prev-decade"><span aria-hidden="true">{prevGlyph}</span>{t('tl.prevDecade',{decade:plan.prev.decade})}</Link>
  :<button type="button" className={`${css.step} min-h-tap`} disabled data-testid="timeline-thread-prev"><span aria-hidden="true">{prevGlyph}</span>{t('tl.prev')}</button>
 const stepNext=!atEnd
  ?<button type="button" className={`${css.step} ${css.stepNext}`} onClick={()=>go(idx+1)} data-testid="timeline-thread-next">{t('tl.next')}<span aria-hidden="true">{nextGlyph}</span></button>
  :plan.next?<Link prefetch={false} scroll={false} className={`${css.step} ${css.stepNext}`} href={href({at:plan.next.id})} data-testid="timeline-thread-next-decade">{t('tl.nextDecade',{decade:plan.next.decade})}<span aria-hidden="true">{nextGlyph}</span></Link>
  :<button type="button" className={`${css.step} ${css.stepNext}`} disabled data-testid="timeline-thread-next">{t('tl.next')}<span aria-hidden="true">{nextGlyph}</span></button>

 return <section className={css.stage} data-testid="timeline-thread" data-decade={plan.decade} data-index={idx} lang={locale}>
  <div className={css.layout}>
   <div className={css.rail}>
    <nav aria-label={t('tl.decades')}>
     <ul className={css.decades}>{plan.decades.map(d=><li key={d.decade}><Link prefetch={false} scroll={false} className={css.decade} href={href({dec:String(d.decade)})} aria-current={d.decade===plan.decade?'page':undefined} data-testid="timeline-thread-decade"><span>{t('tl.decade',{decade:d.decade})}</span><small>{d.count===1?t('tl.count.one'):t('tl.count',{n:d.count})}</small></Link></li>)}</ul>
    </nav>
    <ul className={css.knots} ref={knotsRef} aria-label={t('tl.years')}>{knots.map(k=><li key={k.year}><button type="button" className={`${css.knot} min-h-tap`} aria-current={k.year===cur.year?'true':undefined} aria-label={t('tl.year.chip',{year:k.year,n:k.count})} onClick={()=>go(k.first)} data-testid="timeline-thread-knot"><bdi>{k.year}</bdi></button></li>)}</ul>
    <p className={css.fine}>{t('tl.coverage',{n:plan.total,exact:exactTotal})}</p>
   </div>
   <div className={css.main}>
    <div className={css.scrub}>
     <input className={css.range} type="range" min={0} max={Math.max(0,len-1)} step={1} value={idx} onChange={e=>go(Number(e.target.value))} disabled={len<2}
      aria-label={t('tl.scrub')} aria-valuetext={t('tl.scrub.value',{date:dateOf(cur),title:cur.title})} data-testid="timeline-thread-scrub"/>
     <span className={css.pos}><bdi>{t('tl.pos',{n:idx+1,total:len,decade:plan.decade})}</bdi></span>
    </div>
    <p className="sr-only" aria-live="polite" data-testid="timeline-thread-live">{t('tl.scrub.value',{date:dateOf(cur),title:cur.title})}</p>
    <div className={css.scroll}>
     <div className={css.trail}>
      {before&&<button type="button" className={`${css.peek} min-h-tap`} onClick={()=>go(idx-1)} aria-label={`${t('tl.peek.before')}: ${dateOf(before)} — ${before.title}`}><small>{t('tl.peek.before')}</small><span lang={contentLocale} dir="auto">{before.title}</span><time dateTime={before.on??undefined}><bdi>{before.on?localizedDate(before.on,locale):before.year}</bdi></time></button>}
      <article key={cur.id} className={css.clip} data-testid="timeline-thread-card" data-event={cur.id} data-precision={cur.precision} data-dir={dir} data-parity={idx%2} data-drag={drag} style={{'--lean':`${lean}px`} as React.CSSProperties} aria-label={`${dateOf(cur)} — ${cur.title}`}
       onPointerDown={onDown} onPointerMove={onMove} onPointerUp={e=>finish(e,true)} onPointerCancel={e=>finish(e,false)}>
       <div className={css.stamp} aria-hidden="true">
        {cur.on?<><b>{Number(cur.on.slice(8,10))}</b><span>{month}</span><i>{cur.year}</i></>:<><b>{cur.year}</b><span>{t('tl.yearOnly')}</span></>}
       </div>
       <div className={css.body}>
        <h2 lang={contentLocale} dir="auto">{cur.title}</h2>
        <p className="sr-only"><time dateTime={cur.on??String(cur.year)}>{dateOf(cur)}</time></p>
        {cur.hint&&<p className={css.hint} lang={contentLocale} dir="auto">{cur.hint}</p>}
        {cur.precision==='year'&&<p className={css.fine}>{t('tl.yearOnly.note')}</p>}
        <p className={css.gap} data-testid="timeline-thread-gap">{gapLine}</p>
        <div>
         <p className={css.kicker}>{t('tl.sources')}</p>
         {srcs.length>0?<ul className={css.src}>{srcs.slice(0,3).map(s=><li key={s.title}>{s.url?<a href={s.url} target="_blank" rel="noreferrer"><bdi>{s.title}</bdi></a>:<bdi>{s.title}</bdi>}{s.publisher&&s.publisher!==s.title?<> · <bdi>{s.publisher}</bdi></>:null}</li>)}</ul>:<p className={css.fine}>{t('tl.source.none')}</p>}
        </div>
        {archiveOpen&&<Link prefetch={false} className={css.open} href={`/clubs/${club}/archive?${new URLSearchParams({event:cur.id,lang:locale})}`} data-testid="timeline-thread-archive">{t('tl.archive')}</Link>}
       </div>
      </article>
      {after&&<button type="button" className={`${css.peek} min-h-tap`} onClick={()=>go(idx+1)} aria-label={`${t('tl.peek.after')}: ${dateOf(after)} — ${after.title}`}><small>{t('tl.peek.after')}</small><span lang={contentLocale} dir="auto">{after.title}</span><time dateTime={after.on??undefined}><bdi>{after.on?localizedDate(after.on,locale):after.year}</bdi></time></button>}
     </div>
    </div>
    <div className={css.dock}>{stepPrev}{stepNext}</div>
    <p className={`${css.fine} ${css.hintRow}`}>{t('tl.hint')}</p>
   </div>
  </div>
 </section>
}
