'use client'
import {useMemo,useState} from 'react'
import {tr} from '@/components/clubs/rumble/shared'
import type {Entry} from '@/lib/clubs/entities'
import {digOrder,passes,type Filter} from '@/lib/clubs/archive-model'
import {EntryCard,type CardCtx} from './ArchiveCards'
import css from './archive.module.css'

const TABLE_MAX=12
const FILTERS:Filter[]=['all','moment','player']

/**
 * The dig box: a crate of cards in a fixed order (the round's seed), pulled out ONE at a time. The newest pull is
 * on top; the last few lie on the table. Nothing here is a fact — it only decides which entry you see next.
 */
export function DigBox({entries,byId,seed,ctx,saved,onOpen,onToggleSave}:{entries:Entry[];byId:Map<string,Entry>;seed:number;ctx:CardCtx;saved:ReadonlySet<string>;onOpen:(id:string)=>void;onToggleSave:(id:string)=>void}){
 const {copy}=ctx,t=(k:string,v?:Record<string,string|number>)=>tr(copy,k,v)
 const [filter,setFilter]=useState<Filter>('all'),[cursor,setCursor]=useState(0),[drawn,setDrawn]=useState(0),[table,setTable]=useState<string[]>([])
 const order=useMemo(()=>digOrder(entries.filter(e=>passes(e,filter)).map(e=>e.id),seed,cursor),[entries,filter,seed,cursor])
 const left=order.length-drawn,topId=drawn>0?order[drawn-1]:null,top=topId?byId.get(topId)??null:null
 const pull=()=>{if(left<=0)return;const id=order[drawn]!;setDrawn(d=>d+1);setTable(tb=>[id,...tb.filter(x=>x!==id)].slice(0,TABLE_MAX))}
 const reshuffle=()=>{setCursor(c=>c+1);setDrawn(0)}
 const pick=(f:Filter)=>{setFilter(f);setDrawn(0)}
 return <div className={css.dig}>
  <h2 className={css.panelTitle}>{t('ar.dig.title')}</h2>
  <p className={css.fine}>{t('ar.dig.hint')}</p>
  <div className={css.chips} role="group" aria-label={t('ar.filter.label')}>{FILTERS.map(f=><button key={f} type="button" className={css.chip} aria-pressed={filter===f} onClick={()=>pick(f)}>{t(`ar.filter.${f}`)}</button>)}</div>
  <div className={css.digStage}>
   <div className={css.pulled} aria-live="polite">
    {top?<div key={top.id} className={css.pullIn}><EntryCard e={top} ctx={ctx} variant="deck" saved={saved.has(top.id)} onOpen={onOpen} onToggleSave={onToggleSave}/><p className="sr-only">{t('ar.dig.pulled',{title:top.title})}</p></div>
     :<p className={css.fine}>{t('ar.dig.tableEmpty')}</p>}
   </div>
   <div className={css.crate} role="img" aria-label={t('ar.dig.boxLabel',{n:Math.max(0,left)})}>
    <span className={css.crateCards} aria-hidden="true">{Array.from({length:Math.min(6,Math.max(0,left))},(_,i)=><i key={i} style={{'--i':i} as React.CSSProperties}/>)}</span>
    <span className={css.crateFront} aria-hidden="true"><b>{Math.max(0,left)}</b></span>
   </div>
   <p className={css.count} role="status">{left>0?t('ar.dig.left',{n:left}):t('ar.dig.empty')}</p>
   {left>0
    ?<button type="button" className={`${css.tool} ${css.primary} ${css.digBtn}`} onClick={pull}>{drawn?t('ar.dig.again'):t('ar.dig.pull')}</button>
    :<button type="button" className={`${css.tool} ${css.primary} ${css.digBtn}`} onClick={reshuffle} disabled={!order.length&&filter==='all'&&!entries.length}>{t('ar.dig.reshuffle')}</button>}
  </div>
  <section className={css.tableRow} aria-label={t('ar.dig.table')}>
   <h3 className={css.subTitle}>{t('ar.dig.table')} · {table.length}</h3>
   {table.length?<ul className={css.tableCards}>{table.map(id=>{const e=byId.get(id);return e&&<li key={id}><button type="button" className={css.tableCard} onClick={()=>onOpen(id)}>
    <span>{e.on?e.on.slice(0,4):e.year??'?'}</span><b lang={ctx.contentLocale} dir="auto">{e.title}</b></button></li>})}</ul>:<p className={css.fine}>{t('ar.dig.tableEmpty')}</p>}
  </section>
 </div>
}
