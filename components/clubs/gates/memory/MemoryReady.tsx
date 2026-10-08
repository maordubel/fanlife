'use client'
import Link from 'next/link'
import type {GameCopy} from '@/lib/clubs/game-copy'
import {FLASH_MS,RE_FLASH_MS} from '@/lib/game/memory-run'
import {categoryOfRun,memoryQuery,type MemoryPlan} from '@/lib/clubs/memory-model'
import type {MemoryBlocker,MemSize} from '@/lib/clubs/memory-solver'
import type {Bests} from '@/lib/clubs/memory-best'
import type {T} from './MemoryParts'
import css from './memory.module.css'

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
 return <section className={css.stage} data-testid="memory-ready" data-size={deal.size} data-label={deal.label} data-theme={deal.theme??undefined}>
  <div className={css.ready}>
   <p className={css.readyKicker}>{clubName} · {t('mem.kicker')}</p>
   <p className={css.readyNo} aria-hidden="true">{deal.size}</p>
   <h2 className={css.readyTitle}>{t('mem.ready.title',{n:deal.size})}</h2>
   <p className={css.readyLine}>{t('mem.ready.goal')}</p>
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
   <div className={css.modes} role="group" aria-label={t('mem.size.label')}>
    {plan.sizes.slice().sort((a,b)=>a.size-b.size).map(s=>s.available
     ?<Link key={s.size} className={css.chip} data-on={s.size===sel.size||undefined} aria-current={s.size===sel.size?'true':undefined} href={href({size:s.size})} replace scroll={false} data-testid={`memory-size-${s.size}`}>{t('mem.size.n',{n:s.size})}</Link>
     :<span key={s.size} className={css.chip} data-off="true" aria-disabled="true" data-testid={`memory-size-${s.size}`} data-code={s.blocker?.code}>{t('mem.size.n',{n:s.size})}<small>{s.blocker?blockerLine(t,s.blocker):''}</small></span>)}
   </div>
   {plan.themes.length>0&&<div className={css.modes} role="group" aria-label={t('mem.theme.label')}>
    <Link className={css.chip} data-on={!sel.theme||undefined} aria-current={!sel.theme?'true':undefined} href={href({theme:null})} replace scroll={false} data-testid="memory-theme-all">{t('mem.theme.all')}</Link>
    {plan.themes.map(x=><Link key={x.theme} className={css.chip} data-on={x.theme===sel.theme||undefined} aria-current={x.theme===sel.theme?'true':undefined} href={href({theme:x.theme})} replace scroll={false} data-testid={`memory-theme-${x.theme}`}>{decadeLabel(t,x.decade)}<small>{t('mem.theme.max',{n:x.maxSize})}</small></Link>)}
   </div>}
   <div className={css.modes} role="group" aria-label={t('mem.peek.label')}>
    <button type="button" className={`min-h-tap ${css.chip}`} data-on={peek||undefined} aria-pressed={peek} onClick={()=>onPeek(true)} data-testid="memory-peek-on">{t('mem.peek.on')}</button>
    <button type="button" className={`min-h-tap ${css.chip}`} data-on={!peek||undefined} aria-pressed={!peek} onClick={()=>onPeek(false)} data-testid="memory-peek-off">{t('mem.peek.off')}</button>
   </div>
   <div className={css.fine} data-testid="memory-best">{kept.length===0?t('mem.best.none',{mode:modeLabel(t,deal.size,false)}):kept.map(x=><p key={String(x.h)} style={{margin:0}}>{t('mem.best.have',{n:x.b.score,mode:modeLabel(t,deal.size,x.h)})}</p>)}</div>
   <p className={css.fine}>{t('mem.ready.shelf',{n:shelf})}</p>
   <p className={css.fine}>{copy.localOnly}</p>
   <button type="button" className={`min-h-tap ${css.start}`} onClick={onStart} data-testid="memory-start">{t('mem.start')}</button>
  </div>
 </section>
}

/** the wall cannot be dealt at all: the reason in the pool's own numbers, the way back, and nothing invented to fill it */
export function MemoryBlocked({t,copy,plan,clubName,club,locale,seed}:{t:T;copy:GameCopy;plan:MemoryPlan;clubName:string;club:string;locale:string;seed:number}){
 const b=plan.blocker
 return <section className={css.stage} data-testid="memory-empty" data-code={b?.code}>
  <div className={css.ready}>
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
