'use client'
import Link from 'next/link'
import type {MemoryObject} from '@/lib/game/memory'
import {numericFace} from '@/lib/game/memory-run'
import type {GameCopy} from '@/lib/clubs/game-copy'
import {memoryKindLabel} from '@/lib/clubs/memory-kinds'
import {displayFace,type PublicPair,type Reveal} from '@/lib/clubs/memory-model'
import {shelfList,type Shelf} from '@/lib/clubs/memory-shelf'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {ObjectMark} from '@/components/memory/ObjectMark'
import {Num} from '@/components/ui/Num'
import css from './memory.module.css'

export type T=(k:string,v?:Record<string,string|number>)=>string
export type RevealState={status:'loading'|'ok'|'failed';reveal?:Reveal}
export type Plate={pair:PublicPair;perfect:boolean}

/** one face, printed the way the eye should read it: an ISO date as a date, a season or a span isolated as a figure */
export function Face({value,locale}:{value:string;locale:string}){
 const shown=displayFace(value,locale)
 return <>{numericFace(shown)?<Num>{shown}</Num>:shown}</>
}

/**
 * What a matched pair turned out to be (ME-R12): the relation between its two faces, the archive's own sentence if the
 * row holds one, the source it rests on and the archive entry — all of it from the server's reveal, none of it on the
 * closed wall. While the answer is on its way the faces are already shown; if it never comes the line says so and offers
 * a retry instead of printing a relation nobody confirmed.
 */
export function RevealLines({t,copy,state,locale,contentLocale,onRetry,fallbackFact}:{t:T;copy:GameCopy;state:RevealState|undefined;locale:string;contentLocale:string;onRetry?:()=>void;fallbackFact?:string|null}){
 if(!state||state.status==='loading')return <p className={css.plateKind} role="status">{fallbackFact?`${fallbackFact} · `:''}{t('mem.reveal.loading')}</p>
 if(state.status==='failed'||!state.reveal)return <p className={css.plateKind}>{fallbackFact?`${fallbackFact} · `:''}{t('mem.reveal.failed')}{onRetry&&<> <button type="button" className={`min-h-tap ${css.inlineBtn}`} onClick={onRetry}>{t('mem.reveal.retry')}</button></>}</p>
 const r=state.reveal
 return <>
  <p className={css.plateKind}><b>{t('mem.reveal.relation')}</b> {t(`mem.type.${r.type}`)} · {memoryKindLabel(r.kind,locale)}</p>
  {r.fact&&<p className={css.plateKind} lang={contentLocale} dir="auto">{r.fact}</p>}
  {r.source&&<p className={css.plateKind} lang={contentLocale} dir="auto"><b>{t('mem.reveal.source')}</b> {r.source.url?<a className={css.plateLink} href={r.source.url} target="_blank" rel="noopener noreferrer">{r.source.publisher} — {r.source.title}</a>:`${r.source.publisher} — ${r.source.title}`}</p>}
  {r.href&&<Link className={css.plateLink} href={r.href}>{copy.archiveEntry} →</Link>}
 </>
}

/** a locked pair as one memory: the two faces joined at once, the rest as the server confirms it */
export function FusionPlate({t,copy,plate,state,locale,contentLocale,fusing,onRetry}:{t:T;copy:GameCopy;plate:Plate;state:RevealState|undefined;locale:string;contentLocale:string;fusing:boolean;onRetry:()=>void}){
 const {pair,perfect}=plate
 return <div className={css.plate} data-perfect={perfect||undefined} data-fusing={fusing||undefined} role="status" data-testid="memory-plate" key={pair.id}>
  <span className={css.plateIcon}><ObjectMark object={pair.object} className={css.obj}/></span>
  <div className={css.plateText} lang={contentLocale} dir="auto">
   <p className={css.plateHead}><span className={css.plateKicker}>{t('mem.plate.kicker')}</span>{perfect&&<span className={css.perfect}>{t('mem.plate.perfect')}</span>}</p>
   <p className={css.plateFaces}><b><Face value={pair.a} locale={locale}/></b> <span aria-hidden="true">↔</span> <b><Face value={pair.b} locale={locale}/></b></p>
   <RevealLines t={t} copy={copy} state={state} locale={locale} contentLocale={contentLocale} onRetry={onRetry}/>
  </div>
 </div>
}

/** the souvenir shelf: every pair this device has ever found on this club's wall */
export function ShelfSheet({t,copy,open,onClose,shelf,ok,locale,contentLocale}:{t:T;copy:GameCopy;open:boolean;onClose:()=>void;shelf:Shelf;ok:boolean;locale:string;contentLocale:string}){
 const list=shelfList(shelf)
 return <SlideSheet open={open} onClose={onClose} title={t('mem.shelf.title')} closeLabel={copy['play.close']} size="half">
  {list.length===0?<p className={css.fine}>{t('mem.shelf.empty')}</p>
   :<ul className={css.shelf}>{list.map(e=><li key={e.id} lang={contentLocale} dir="auto">
    <span className={css.plateIcon}><ObjectMark object={e.object as MemoryObject} className={css.obj}/></span>
    <div><p className={css.plateFaces}><b><Face value={e.a} locale={locale}/></b> <span aria-hidden="true">↔</span> <b><Face value={e.b} locale={locale}/></b></p>
     <p className={css.plateKind}>{memoryKindLabel(e.kind,locale)}{e.fact?` · ${e.fact}`:''}</p>
     {e.href&&<Link className={css.plateLink} href={e.href}>{copy.archiveEntry} →</Link>}</div>
   </li>)}</ul>}
  <p className={css.fine}>{t('mem.shelf.kept',{n:list.length})} {copy.localOnly}</p>
  {!ok&&<p className={css.fine} role="alert">{t('mem.shelf.blocked')}</p>}
 </SlideSheet>
}
