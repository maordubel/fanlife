'use client'
import Link from 'next/link'
import type {GameCopy} from '@/lib/clubs/game-copy'
import {FLASH_MS,RE_FLASH_MS} from '@/lib/game/memory-run'
import {categoryOfRun,memoryQuery,type MemoryPlan} from '@/lib/clubs/memory-model'
import type {MemoryBlocker,MemSize} from '@/lib/clubs/memory-solver'
import type {Bests} from '@/lib/clubs/memory-best'
import type {T} from './MemoryParts'
import css from './memory.module.css'
import {useState} from 'react'
import {Plate} from '@/components/weekly/Plate'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {sharedGate} from '@/lib/clubs/gates'

export const blockerLine=(t:T,b:MemoryBlocker)=>t(`mem.blocker.${b.code}`,{have:b.have,need:b.need,size:b.size})
export const decadeLabel=(t:T,decade:number)=>t('mem.theme.decade',{d:decade})
export const modeLabel=(t:T,size:number,hinted:boolean)=>t('mem.cat.line',{n:size,mode:t(hinted?'mem.cat.hinted':'mem.cat.unhinted')})

type Props={t:T;copy:GameCopy;plan:MemoryPlan;clubName:string;locale:string;seed:number;cursor:number;shelf:number;bests:Bests;peek:boolean;onPeek:(on:boolean)=>void;onStart:()=>void}

/**
 * The start card (§18.1): what the wall is, how big, how long it is lit, what a peek costs, what is recorded, and the
 * sizes and years this club's archive can really open — each chosen by a link, because the wall is dealt on the server.
 * A size or a year the pool cannot field is shown shut with its reason, never silently swapped for another. Nothing is
 * lit and no stopwatch runs until the one Start button is pressed.
 */
export function MemoryReady({t,copy,plan,clubName,locale,seed,cursor,shelf,bests,peek,onPeek,onStart}:Props){
 const deal=plan.deal!,sel=plan.selected
 const href=(over:{size?:MemSize;theme?:string|null})=>`?${memoryQuery({seed,cursor,lang:locale,size:over.size??sel.size,theme:over.theme===undefined?sel.theme:over.theme,peek})}`
 const kept=([false,true] as const).filter(h=>peek||!h).flatMap(h=>{const b=bests[categoryOfRun(deal.size,h)];return b?[{h,b}]:[]})
 const smaller=deal.size<6?plan.sizes.find(s=>s.size===6)?.blocker:undefined
 const [coupon,setCoupon]=useState(false)
 const gateNo=String(sharedGate('memory')?.number??6).padStart(2,'0'),gateName=(copy as Record<string,string>)['gate.memory']??t('mem.kicker')
 const themeName=sel.theme?decadeLabel(t,Number(sel.theme.slice(1))):t('mem.theme.all')
 const settings=<div className={css.settings}>
  {plan.themes.length>0&&<div className={css.setBlock}><h3 className={css.setHead}>{t('mem.theme.label')}</h3>
   <div className={css.optGrid} role="group" aria-label={t('mem.theme.label')}>
    <Link className={css.chip} data-on={!sel.theme||undefined} aria-current={!sel.theme?'true':undefined} href={href({theme:null})} replace scroll={false} data-testid="memory-theme-all">{t('mem.theme.all')}</Link>
    {plan.themes.map(x=><Link key={x.theme} className={css.chip} data-on={x.theme===sel.theme||undefined} aria-current={x.theme===sel.theme?'true':undefined} href={href({theme:x.theme})} replace scroll={false} data-testid={`memory-theme-${x.theme}`}>{decadeLabel(t,x.decade)}<small>{t('mem.theme.max',{n:x.maxSize})}</small></Link>)}
   </div></div>}
  <div className={css.setBlock}><h3 className={css.setHead}>{t('mem.peek.label')}</h3>
   <div className={`wk-seg ${css.seg}`} role="group" aria-label={t('mem.peek.label')}>
    <button type="button" className={`min-h-tap ${css.chip}`} data-on={peek||undefined} aria-pressed={peek} onClick={()=>onPeek(true)} data-testid="memory-peek-on">{t('mem.peek.on')}</button>
    <button type="button" className={`min-h-tap ${css.chip}`} data-on={!peek||undefined} aria-pressed={!peek} onClick={()=>onPeek(false)} data-testid="memory-peek-off">{t('mem.peek.off')}</button>
   </div></div>
 </div>
 return <section className={`${css.stage} ${css.pregame}`} data-testid="memory-ready" data-size={deal.size} data-label={deal.label} data-theme={deal.theme??undefined}>
  <div className={css.ready}>
   <div className={`wk-panel wk-lift wk-sky ${css.cover}`}>
    <span className="wk-speed" aria-hidden="true" style={{['--sx' as string]:'70%',['--sy' as string]:'50%'}}/>
    <Plate art="memo" ink="club" className={css.coverArt}/>
    <p className={`wk-banner ${css.coverBanner}`}>{clubName} · {t('mem.kicker')}</p>
    <h2 className={`wk-logo ${css.coverTitle}`}>{gateName}</h2>
    <span className={`wk-roundel ${css.coverNo}`} aria-hidden="true"><b>{deal.size}</b><small>{t('mem.hud.pairs')}</small></span>
    <p className={`wk-cap ${css.coverCap}`}><span className={css.readyTitle}>{t('mem.ready.title',{n:deal.size})}</span> <span className={css.readyLine}>{t('mem.ready.goal')}</span></p>
   </div>
   <div className={css.side}>
    <ul className={css.rules} data-testid="memory-rules">
     <li><b>1</b><span>{t('mem.ready.counts',{n:deal.size,c:deal.cards.length})} · {t('mem.ready.look',{s:Math.round(FLASH_MS/1000)})}</span></li>
     <li><b>2</b><span>{peek?t('mem.ready.peek',{s:(RE_FLASH_MS/1000).toFixed(1)}):t('mem.ready.nopeek')}</span></li>
     <li><b>3</b><span>{t('mem.ready.echo')}</span></li>
     <li><b>4</b><span>{t('mem.ready.clock')} {t('mem.ready.score')}</span></li>
    </ul>
    {deal.label==='date'&&<p className={css.notice} data-testid="memory-label-date">{t('mem.label.date')}</p>}
    {deal.label==='narrow'&&<p className={css.notice} data-testid="memory-label-narrow">{t('mem.label.narrow')}</p>}
    {smaller&&<p className={css.notice} data-testid="memory-smaller" data-code={smaller.code}>{t('mem.notice.smaller',{n:deal.size})} {blockerLine(t,smaller)}</p>}
    {plan.asked&&plan.asked.theme&&<p className={css.notice} data-testid="memory-theme-blocked" data-code={plan.asked.blocker.code}>{blockerLine(t,plan.asked.blocker)}</p>}
    <h3 className={css.setHead}>{t('mem.size.label')}</h3>
    <div className={`wk-seg ${css.seg}`} role="group" aria-label={t('mem.size.label')}>
     {plan.sizes.slice().sort((a,b)=>a.size-b.size).map(s=>s.available
      ?<Link key={s.size} className={css.chip} data-on={s.size===sel.size||undefined} aria-current={s.size===sel.size?'true':undefined} href={href({size:s.size})} replace scroll={false} data-testid={`memory-size-${s.size}`}>{t('mem.size.n',{n:s.size})}</Link>
      :<span key={s.size} className={css.chip} data-off="true" aria-disabled="true" data-testid={`memory-size-${s.size}`} data-code={s.blocker?.code}>{t('mem.size.n',{n:s.size})}<small>{s.blocker?blockerLine(t,s.blocker):''}</small></span>)}
    </div>
    <button type="button" className={`min-h-tap ${css.couponBtn}`} aria-haspopup="dialog" onClick={()=>setCoupon(true)}>
     <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6"/></svg>
     <span><b>{themeName} · {peek?t('mem.peek.on'):t('mem.peek.off')}</b><small>{t('mem.theme.label')} · {t('mem.peek.label')}</small></span>
     <svg viewBox="0 0 24 24" aria-hidden="true"><path d={locale==='he'?'M15 5l-7 7 7 7':'M9 5l7 7-7 7'}/></svg>
    </button>
    <div className={css.inline}>{settings}</div>
    <div className={css.fine} data-testid="memory-best">{kept.length===0?t('mem.best.none',{mode:modeLabel(t,deal.size,false)}):kept.map(x=><p key={String(x.h)} style={{margin:0}}>{t('mem.best.have',{n:x.b.score,mode:modeLabel(t,deal.size,x.h)})}</p>)}</div>
    <p className={css.fine}>{t('mem.ready.shelf',{n:shelf})} {copy.localOnly}</p>
    <div className={css.kickRow}>
     <button type="button" className={`min-h-tap wk-kick ${css.start}`} onClick={onStart} data-testid="memory-start">
      <span className="wk-kick-gate" aria-hidden="true"><small>{copy.ticketGate}</small><b>{gateNo}</b></span>
      <span className="wk-kick-go"><span className="wk-speed" aria-hidden="true" style={{['--sx' as string]:'100%',['--sy' as string]:'50%'}}/><span>{t('mem.start')}</span><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" className="wga-ball-fill"/><path d="M20 11l7 5-3 8h-8l-3-8z" className="wga-ball-ink"/></svg></span>
     </button>
    </div>
   </div>
  </div>
  <SlideSheet open={coupon} onClose={()=>setCoupon(false)} title={t('mem.coupon.title')} closeLabel={copy['play.close']} size="full"
   footer={<div className={css.couponFoot}><button type="button" className={`min-h-tap ${css.couponDone}`} onClick={()=>setCoupon(false)}>{t('mem.coupon.done')}</button></div>}>
   {settings}
  </SlideSheet>
 </section>
}

/** the wall cannot be dealt at all: the reason in the pool's own numbers, the way back, and nothing invented to fill it */
export function MemoryBlocked({t,copy,plan,clubName,club,locale,seed}:{t:T;copy:GameCopy;plan:MemoryPlan;clubName:string;club:string;locale:string;seed:number}){
 const b=plan.blocker
 return <section className={css.stage} data-testid="memory-empty" data-code={b?.code}>
  <div className={`wk-coupon ${css.blocked}`}>
   <p className={css.readyKicker}>{clubName} · {t('mem.kicker')}</p>
   <h2 className={css.readyTitle}>{t('mem.blocked.title')}</h2>
   <p className={css.readyLine}>{t('mem.short')}</p>
   {b&&<p className={css.notice} role="status">{blockerLine(t,b)} <code>{b.code}</code></p>}
   <p className={css.fine}>{t('mem.pool.line',{valid:plan.pool.valid,out:plan.pool.excluded})}</p>
   {plan.selected.theme&&<Link className={css.chip} href={`?${memoryQuery({seed,cursor:0,lang:locale})}`}>{t('mem.theme.all')}</Link>}
   <Link className={css.cta} data-kind="plain" href={`/clubs/${club}/archive?lang=${locale}`}><span>{copy['gate.archive']}</span><span aria-hidden="true">→</span></Link>
   <Link className={css.cta} data-kind="plain" href={`/clubs/${club}?lang=${locale}`}><span>{copy.backToClub}</span><span aria-hidden="true">→</span></Link>
  </div>
 </section>
}
