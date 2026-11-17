'use client'
import {useDeferredValue,useMemo,useState} from 'react'
import type {Entry} from '@/lib/clubs/entities'
import {fold} from '@/lib/clubs/entities'
import type {ArchiveIndex,IndexRow,Tally} from '@/lib/clubs/archive-index'
import css from './archive.module.css'

/**
 * Gate 12 · INDEX (owner, 17.11.2026) — the archive as a yearbook's back pages: Seasons · Opponents · Competitions ·
 * Players A–Z. One segmented choice (never a sideways menu), one open row at a time, the row's own entries under it.
 * The three groupings are built on the server (lib/clubs/archive-index.ts); A–Z is read here from the entries.
 */
export type IndexView='season'|'opponent'|'competition'|'az'
const VIEWS:IndexView[]=['season','opponent','competition','az']
const PAGE=24
type T=(k:string,v?:Record<string,string|number>)=>string
type CardFn=(e:Entry,v?:'deck'|'row'|'mini')=>React.ReactNode

/** the surname a printed name is filed under: the last word, unless the name is one word */
const filedUnder=(name:string)=>{const w=name.replace(/\(.*?\)/g,'').trim().split(/\s+/);return w[w.length-1]||name}
const letterOf=(name:string)=>{const c=fold(filedUnder(name)).charAt(0).toUpperCase();return /[A-Z]/.test(c)?c:'#'}
const LETTERS=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ','#']

function TallyLine({t,tally}:{t:T;tally:Tally}){
 const pct=tally.p?Math.round((tally.w/tally.p)*100):0
 return <span className={css.ixRecord}>
  <span className={css.ixPWDL} aria-label={t('ar.ix.recordAria',{p:tally.p,w:tally.w,d:tally.d,l:tally.l})}>
   <b>{tally.p}</b><i data-k="w">{tally.w}</i><i data-k="d">{tally.d}</i><i data-k="l">{tally.l}</i>
  </span>
  <span className={css.ixGoals}>{t('ar.ix.goals',{f:tally.gf,a:tally.ga})}</span>
  <span className={css.ixBar} aria-hidden="true"><span style={{inlineSize:`${pct}%`}}/></span>
 </span>
}

function Rows({rows,entries,t,card,find}:{rows:IndexRow[];entries:Entry[];t:T;card:CardFn;find:boolean}){
 const [open,setOpen]=useState<string|null>(null),[shown,setShown]=useState(PAGE),[q,setQ]=useState('')
 const dq=useDeferredValue(q)
 const list=useMemo(()=>{const k=fold(dq.trim());return k?rows.filter(r=>fold(r.label).includes(k)):rows},[rows,dq])
 return <div className={css.ixBody}>
  {find&&<label className={css.searchBox}><span className="sr-only">{t('ar.ix.find')}</span>
   <input type="search" value={q} onChange={e=>{setQ(e.target.value);setOpen(null)}} placeholder={t('ar.ix.find')} autoComplete="off" maxLength={60} spellCheck={false} enterKeyHint="search"/></label>}
  <p className={css.count} role="status">{t('ar.ix.rows',{n:list.length})}{list.some(r=>r.t)&&<span className={css.ixKey}> · {t('ar.ix.key')}</span>}</p>
  <ul className={css.ixRows}>
   {list.map(r=>{const isOpen=open===r.key,items=isOpen?r.ids.map(i=>entries[i]).filter((e):e is Entry=>!!e):[]
    const span=r.from&&r.to?(r.from.slice(0,4)===r.to.slice(0,4)?r.from.slice(0,4):`${r.from.slice(0,4)}–${r.to.slice(0,4)}`):null
    return <li key={r.key} className={css.ixItem} data-open={isOpen||undefined}>
     <button type="button" className={`${css.ixRow} min-h-tap`} aria-expanded={isOpen} onClick={()=>{setOpen(isOpen?null:r.key);setShown(PAGE)}}>
      <span className={css.ixLabel}><b>{r.label}</b>{span&&<small>{span}</small>}</span>
      {r.t?<TallyLine t={t} tally={r.t}/>:<span className={css.ixGoals}>{t('ar.ix.entries',{n:r.ids.length})}</span>}
      <span className={css.ixChev} aria-hidden="true">{isOpen?'−':'+'}</span>
     </button>
     {isOpen&&<div className={css.ixOpen}>
      <p className={css.kicker}>{t('ar.ix.entries',{n:items.length})}</p>
      <ul className={css.list}>{items.slice(0,shown).map(e=>card(e))}</ul>
      {items.length>shown&&<button type="button" className={`${css.tool} min-h-tap`} onClick={()=>setShown(shown+PAGE)}>{t('ar.sheet.more',{n:Math.min(PAGE,items.length-shown)})}</button>}
     </div>}
    </li>})}
  </ul>
 </div>
}

function AZ({entries,t,card}:{entries:Entry[];t:T;card:CardFn}){
 const by=useMemo(()=>{const m=new Map<string,Entry[]>();for(const e of entries)if(e.kind==='player'){const l=letterOf(e.title);(m.get(l)??m.set(l,[]).get(l)!).push(e)}
  for(const list of m.values())list.sort((a,b)=>fold(filedUnder(a.title)).localeCompare(fold(filedUnder(b.title)))||fold(a.title).localeCompare(fold(b.title)))
  return m},[entries])
 const first=LETTERS.find(l=>by.has(l))??'A'
 const [letter,setLetter]=useState(first),[shown,setShown]=useState(PAGE*2)
 const list=by.get(letter)??[],total=[...by.values()].reduce((n,l)=>n+l.length,0)
 return <div className={css.ixBody}>
  <p className={css.count} role="status">{t('ar.ix.players',{n:total})}</p>
  <div className={css.ixLetters} role="group" aria-label={t('ar.ix.letters')}>
   {LETTERS.map(l=>{const n=by.get(l)?.length??0
    return <button key={l} type="button" className={`${css.ixLetter} min-h-tap`} aria-pressed={l===letter} disabled={!n} onClick={()=>{setLetter(l);setShown(PAGE*2)}} aria-label={t('ar.ix.letterAria',{l,n})}>
     <b>{l}</b><small>{n||''}</small></button>})}
  </div>
  <h3 className={css.subTitle}>{letter} · {list.length}</h3>
  <ul className={css.list}>{list.slice(0,shown).map(e=>card(e))}</ul>
  {list.length>shown&&<button type="button" className={`${css.tool} min-h-tap`} onClick={()=>setShown(shown+PAGE*2)}>{t('ar.sheet.more',{n:Math.min(PAGE*2,list.length-shown)})}</button>}
 </div>
}

export function IndexPanel({index,entries,t,card}:{index:ArchiveIndex;entries:Entry[];t:T;card:CardFn}){
 const [view,setView]=useState<IndexView>('season')
 const counts:Record<IndexView,number>={season:index.seasons.length,opponent:index.opponents.length,competition:index.competitions.length,az:entries.filter(e=>e.kind==='player').length}
 return <div className={css.ix}>
  <h2 className={css.panelTitle}>{t('ar.ix.title')}</h2>
  <p className={css.fine}>{t('ar.ix.lede')}</p>
  <div className={css.ixSeg} role="group" aria-label={t('ar.ix.by')}>
   {VIEWS.map(v=><button key={v} type="button" className={`${css.chip} min-h-tap`} aria-pressed={view===v} onClick={()=>setView(v)}>
    <span>{t(`ar.ix.view.${v}`)}</span><small>{counts[v]}</small></button>)}
  </div>
  {view==='season'&&<Rows key="s" rows={index.seasons} entries={entries} t={t} card={card} find={false}/>}
  {view==='opponent'&&<Rows key="o" rows={index.opponents} entries={entries} t={t} card={card} find/>}
  {view==='competition'&&<Rows key="c" rows={index.competitions} entries={entries} t={t} card={card} find={index.competitions.length>12}/>}
  {view==='az'&&<AZ entries={entries} t={t} card={card}/>}
 </div>
}
