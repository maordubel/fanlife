'use client'
import {useMemo,useState} from 'react'
import Link from 'next/link'
import {BeenThere} from '@/components/fanlife/BeenThere'
import {tr} from '@/components/clubs/rumble/shared'
import {localizedDate,type UiLocale} from '@/lib/clubs/locale'
import {precisionOf,type Entry} from '@/lib/clubs/entities'
import {nextStep,related} from '@/lib/clubs/archive-model'
import type {ArchiveWire} from '@/lib/clubs/entities'
import {dayMonth,type CardCtx} from './ArchiveCards'
import css from './archive.module.css'

const SHOW=4
export type SheetProps={
 entry:Entry;entries:Entry[];byId:Map<string,Entry>;seen:ReadonlySet<string>;ctx:CardCtx;club:string;clubName:string;locale:UiLocale
 sources:ArchiveWire['sources'];links:{xi:string|null;derby:string|null};saved:boolean
 onOpen:(id:string)=>void;onBack:(()=>void)|null;backTitle:string|null;onToggleSave:(id:string)=>void;onSearch:(q:string)=>void
}

/** The entry drawer: documented facts, sources, and links ONLY to things that exist — other entries, a search that
 *  finds them, and club gates that are open. A thread of "dig deeper" ends when nothing unvisited links on. */
export function ArchiveSheetBody({entry:e,entries,byId,seen,ctx,club,clubName,locale,sources,links,saved,onOpen,onBack,backTitle,onToggleSave,onSearch}:SheetProps){
 const {copy,contentLocale}=ctx,t=(k:string,v?:Record<string,string|number>)=>tr(copy,k,v)
 const rel=useMemo(()=>related(entries,byId,e),[entries,byId,e])
 const deeper=useMemo(()=>nextStep(entries,byId,e,seen),[entries,byId,e,seen])
 const [notice,setNotice]=useState(''),[more,setMore]=useState<Record<string,boolean>>({})
 const prec=precisionOf(e),isPlayer=e.kind==='player'
 const dateText=prec==='day'?localizedDate(e.on!,locale):prec==='year'?String(e.year):t('ar.sheet.precision.unknown')
 const posText=(e.player?.positions||[]).map(p=>(copy as Record<string,string>)[p]||p).join(' / ')
 async function share(){
  const url=`${location.origin}/clubs/${club}/archive?${new URLSearchParams({event:e.id,lang:locale})}`
  const text=`${e.title} — ${t('ar.sheet.sharePrefix',{club:clubName})}`
  try{
   if(typeof navigator.share==='function'){await navigator.share({title:e.title,text,url});setNotice(t('ar.sheet.shared'))}
   else{await navigator.clipboard.writeText(`${text}\n${url}`);setNotice(t('ar.sheet.copied'))}
  }catch(err){if((err as Error)?.name!=='AbortError')setNotice(t('ar.sheet.shareFail'))}
 }
 const group=(key:string,title:string,list:Entry[])=>list.length?<section className={css.group} key={key}>
  <h3>{title}</h3>
  <ul>{(more[key]?list:list.slice(0,SHOW)).map(x=><li key={x.id}><button type="button" className={css.mini} data-entry-id={x.id} onClick={()=>onOpen(x.id)}>
   <span className={css.miniDate}>{x.on?dayMonth(x.on,locale)+' '+x.year:x.year??''}</span><span lang={contentLocale} dir="auto">{x.title}</span></button></li>)}</ul>
  {list.length>SHOW&&!more[key]&&<button type="button" className={css.linkBtn} onClick={()=>setMore(m=>({...m,[key]:true}))}>{t('ar.sheet.more',{n:list.length-SHOW})}</button>}
 </section>:null
 const hasRelated=rel.named.length+rel.namedBy.length+rel.sameDay.length+rel.sameYear.length+e.refs.length>0
 return <div className={css.sheet} data-testid="archive-detail" data-entry-id={e.id}>
  {onBack&&<button type="button" className={css.linkBtn} onClick={onBack}><span aria-hidden="true" className={css.arrow}>←</span> {t('ar.sheet.back',{title:backTitle||t('ar.sheet.fallback')})}</button>}
  <p className={css.kicker}>{t(isPlayer?'ar.kind.player':'ar.kind.moment')} · <bdi>{prec==='day'?dayMonth(e.on!,locale)+' '+e.year:dateText}</bdi></p>
  {!isPlayer&&e.hint&&<p className={css.sheetHint} lang={contentLocale} dir="auto">{e.hint}</p>}
  <section aria-label={t('ar.sheet.facts')}>
  <dl className={css.facts}>
   <div><dt>{t('ar.sheet.type')}</dt><dd>{t(isPlayer?'ar.kind.player':'ar.kind.moment')}</dd></div>
   <div><dt>{t('ar.sheet.date')}</dt><dd>{prec==='day'?<time dateTime={e.on!}>{dateText}</time>:dateText}</dd></div>
   <div><dt>{t('ar.sheet.precision')}</dt><dd>{t(`ar.sheet.precision.${prec}`)}</dd></div>
   {isPlayer&&e.player&&<>
    <div><dt>{t('ar.sheet.positions')}</dt><dd>{posText||copy.unknown}</dd></div>
    <div><dt>{t('ar.sheet.years')}</dt><dd>{e.player.from!==null||e.player.to!==null?<bdi dir="ltr">{`${e.player.from??'?'}–${e.player.to??'?'}`}</bdi>:copy.unknown}</dd></div>
    {e.player.aliases.length>0&&<div><dt>{t('ar.sheet.aliases')}</dt><dd lang={contentLocale} dir="auto">{e.player.aliases.join(' · ')}</dd></div>}
   </>}
  </dl>
  <p className={css.documented}>{copy.documented}: {e.confidence}/3</p>
  </section>
  <p className={css.note} lang={e.legacy?locale:undefined}>{e.legacy?copy.legacy:e.note}</p>
  <section className={css.group}>
   <h3>{t('ar.sheet.sources')}</h3>
   {e.sources.length?<ul>{e.sources.map(id=>{const s=sources[id];return <li key={id}>{s?.[1]?<a className={css.src} href={s[1]} target="_blank" rel="noreferrer">{copy.source}: <bdi>{s[0]}</bdi> ↗</a>:<span className={css.src}>{copy.source}: <bdi>{s?.[0]||id}</bdi></span>}</li>})}</ul>:<p className={css.fine}>{t('ar.sheet.noSources')}</p>}
  </section>
  <div className={css.actions}>
   {!isPlayer&&<BeenThere club={club} id={e.id} label={e.title} on={e.on||(e.year?String(e.year):null)} copy={{mark:copy.beenMark,marked:copy.beenMarked,hint:copy.beenHint}}/>}
   <button type="button" className={css.tool} aria-pressed={saved} onClick={()=>{onToggleSave(e.id)}}>{saved?t('ar.sheet.saved'):t('ar.sheet.save')}</button>
   <button type="button" className={css.tool} onClick={share}>{t('ar.sheet.share')}</button>
  </div>
  <p className={css.fine} role="status">{notice}</p>
  {hasRelated&&<div className={css.related}>
   <h3 className={css.relatedTitle}>{t('ar.sheet.related')}</h3>
   {group('named',t('ar.sheet.named'),rel.named)}
   {group('namedBy',t('ar.sheet.namedBy'),rel.namedBy)}
   {group('sameDay',t('ar.sheet.sameDay'),rel.sameDay)}
   {group('sameYear',t('ar.sheet.sameYear'),rel.sameYear)}
   {e.refs.length>0&&<section className={css.group}><h3>{t('ar.sheet.refs')}</h3>
    <ul>{e.refs.map(r=><li key={`${r.kind}:${r.id}`}><button type="button" className={css.mini} onClick={()=>onSearch(r.name)}>
     <span className={css.miniDate}>{t(r.kind==='rival'?'ar.sheet.refRival':'ar.sheet.refSeason')}</span><span lang={contentLocale} dir="auto">{t('ar.sheet.refSearch',{name:r.name})}</span></button></li>)}</ul></section>}
  </div>}
  <div className={css.deeper}>
   {deeper?<button type="button" className={`${css.tool} ${css.primary}`} onClick={()=>onOpen(deeper.id)}>{t('ar.sheet.deeper')} <span aria-hidden="true" className={css.arrow}>→</span></button>
    :<p className={css.fine} role="status" data-testid="archive-thread-end">{t('ar.sheet.endThread')}</p>}
  </div>
  {(links.xi&&isPlayer||links.derby&&e.refs.some(r=>r.kind==='rival'))&&<nav className={css.gateLinks} aria-label={t('ar.link.more')}>
   {links.xi&&isPlayer&&<Link className={css.tool} href={links.xi}>{t('ar.link.xi')} ↗</Link>}
   {links.derby&&e.refs.some(r=>r.kind==='rival')&&<Link className={css.tool} href={links.derby}>{t('ar.link.derby')} ↗</Link>}
  </nav>}
 </div>
}
