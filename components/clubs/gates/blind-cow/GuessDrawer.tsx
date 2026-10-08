'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {firePickFxAt} from '@/components/stage/PickFx'
import {searchClubPlayers} from '@/lib/clubs/xi'
import type {ClubPlayer} from '@/lib/clubs/contract'
import {penalties} from '@/lib/clubs/mystery-model'
import {homonyms} from '@/lib/clubs/mystery-rules'
import css from './blind-cow.module.css'

type T=(k:string,v?:Record<string,string|number>)=>string
const POS=['GK','DF','MF','FW'] as const
const PAGE=40

/**
 * The guess drawer: search, not a hundred buttons. A tap sends one canonical player id; the server compares ids.
 * No shirt and no photograph in the list — a face or an era's kit would make the question too easy.
 * A wrong pick shakes its row and strikes it; the drawer stays open for another try.
 */
export function GuessDrawer({open,onClose,players,tried,contentLocale,closeLabel,t,posLabel,allLabel,groupLabel,onPick}:{
 open:boolean;onClose:()=>void;players:ClubPlayer[];tried:readonly string[];contentLocale:string;closeLabel:string;t:T;posLabel:(p:string)=>string;allLabel:string;groupLabel:string
 /** resolves to the verdict for this id */
 onPick:(id:string)=>Promise<'right'|'wrong'|'none'>
}){
 const [query,setQuery]=useState(''),[pos,setPos]=useState(''),[limit,setLimit]=useState(PAGE),[busy,setBusy]=useState(false),[shaking,setShaking]=useState<string|null>(null),[missed,setMissed]=useState(false)
 const input=useRef<HTMLInputElement>(null),rows=useRef(new Map<string,HTMLElement>()),pen=penalties()
 useEffect(()=>{if(!open)return;setMissed(false);const id=window.setTimeout(()=>input.current?.focus({preventScroll:true}),80);return()=>window.clearTimeout(id)},[open])
 /** BC-R11: two people behind one name are shown with what tells them apart (position, years) — never merged, never picked for you */
 const same=useMemo(()=>homonyms(players.map(p=>({id:p.id,name:p.name}))),[players])
 const fold=(x:string)=>x.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase().replace(/[\u05f3\u05f4'"`]/g,'').trim()
 const results=useMemo(()=>searchClubPlayers(players,query).filter(p=>!pos||p.positions.includes(pos as ClubPlayer['positions'][number])).sort((a,b)=>a.name.localeCompare(b.name,contentLocale)),[players,query,pos,contentLocale])
 async function pick(id:string){
  if(busy||tried.includes(id))return
  setBusy(true)
  const row=rows.current.get(id)??null,verdict=await onPick(id)
  setBusy(false)
  if(verdict==='wrong'){setMissed(true);setShaking(id);firePickFxAt(row,{tone:'ink',label:t('bc.drawer.missed',{s:pen.wrong})});window.setTimeout(()=>setShaking(null),420)}
 }
 return <SlideSheet open={open} onClose={onClose} title={t('bc.drawer.title')} size="full" closeLabel={closeLabel}>
  <div className={css.drawer}>
   <div className={css.drawerTop}>
    <label className={css.searchLabel}><span className="sr-only">{t('bc.drawer.search')}</span>
     <input ref={input} type="search" dir="auto" className={css.search} value={query} onChange={e=>{setQuery(e.target.value);setLimit(PAGE)}} placeholder={t('bc.drawer.search')} autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search" data-testid="mystery-search"/></label>
    <div className={css.chips} role="group" aria-label={groupLabel}>
     {['',...POS].map(p=><button key={p||'all'} type="button" className={css.chip} aria-pressed={pos===p} onClick={()=>{setPos(p);setLimit(PAGE)}}>{p?posLabel(p):allLabel}</button>)}
    </div>
    <p className={css.drawerNote} data-missed={missed} role="status">{missed?t('bc.drawer.missed',{s:pen.wrong}):query.trim()&&!results.length?t('bc.drawer.none'):t('bc.drawer.hint',{s:pen.wrong})}</p>
   </div>
   <ul className={css.guessList} data-testid="mystery-players">
    {results.slice(0,limit).map(p=>{const struck=tried.includes(p.id);return <li key={p.id}>
     <button type="button" ref={el=>{if(el)rows.current.set(p.id,el);else rows.current.delete(p.id)}} className={css.guessRow} data-player-id={p.id} data-struck={struck} data-shake={shaking===p.id} disabled={struck||busy} onClick={()=>void pick(p.id)}>
      <span className={css.guessName} lang={contentLocale} dir="auto">{p.name}</span>
      <span className={css.guessMeta}>{struck?t('bc.drawer.tried'):[same.has(p.id)?p.positions.map(x=>posLabel(x)).join('/'):'',(()=>{const q=fold(query);const hit=q&&!fold(p.name).includes(q.split(/\s+/)[0]!)?p.aliases.find(a=>fold(a).includes(q.split(/\s+/)[0]!)):null;return hit?`≈ ${hit}`:''})(),`${p.fromYear??'?'}–${p.toYear??'?'}`].filter(Boolean).join(' · ')}</span>
     </button></li>})}
   </ul>
   {results.length>limit&&<button type="button" className={css.btn} onClick={()=>setLimit(l=>l+PAGE)}>{t('bc.drawer.more')}</button>}
  </div>
 </SlideSheet>
}
