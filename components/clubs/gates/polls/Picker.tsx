'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {ClubShirt} from '@/components/clubs/stage/ClubShirt'
import {NUMBERS,POSITION_CODES,poolFor,type PoolFilter} from '@/lib/clubs/polls-model'
import type {ClubPlayer} from '@/lib/clubs/contract'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import css from './polls.module.css'

type T=(k:string,v?:Record<string,string|number>)=>string
const PAGE=40
const years=(p:ClubPlayer)=>`${p.fromYear??'?'}–${p.toYear??'?'}`

/**
 * The player picker: a sheet with search and "from my XI". `players` is ONLY the people the line's evidence allows
 * (PO-R02/R03): the picker cannot be talked into offering a non-keeper as best keeper, so there is no chip to remove.
 */
export function PlayerPicker({open,onClose,title,players,wardrobe,contentLocale,mine,current,closeLabel,searchLabel,posLabel,t,onPick}:{
 open:boolean;onClose:()=>void;title:string;players:ClubPlayer[];wardrobe:RumbleWardrobe;contentLocale:string;mine:ReadonlySet<string>;current:string|undefined
 closeLabel:string;searchLabel:string;posLabel:(p:string)=>string;t:T;onPick:(id:string,from:HTMLElement|null)=>void
}){
 const [f,setF]=useState<PoolFilter>({q:'',mine:false}),[limit,setLimit]=useState(PAGE),input=useRef<HTMLInputElement>(null)
 useEffect(()=>{if(open){setF({q:'',mine:false});setLimit(PAGE)}},[open])
 const list=useMemo(()=>poolFor(players,f,mine).sort((a,b)=>(b.id===current?1:0)-(a.id===current?1:0)||a.name.localeCompare(b.name,contentLocale)),[players,f,mine,current,contentLocale])
 return <SlideSheet open={open} onClose={onClose} title={title} size="full" closeLabel={closeLabel}>
  <div className={css.pickBody}>
   <div className={css.pickTop}>
    <input ref={input} type="search" className={css.search} value={f.q} placeholder={searchLabel} aria-label={searchLabel} data-testid="polls-search" onChange={e=>{setF(x=>({...x,q:e.target.value}));setLimit(PAGE)}}/>
    {mine.size>0&&<div className={css.chipRow} role="group" aria-label={title}>
     {<button type="button" className={`${css.chip} min-h-tap`} aria-pressed={f.mine} onClick={()=>{setF(x=>({...x,mine:!x.mine}));setLimit(PAGE)}}>{t('tv.pick.mine')}</button>}
    </div>}
   </div>
   {list.length===0
    ?<p className={css.empty}>{t('tv.pick.none')}</p>
    :<ul className={css.rows} data-testid="polls-players">{list.slice(0,limit).map(p=><li key={p.id}>
      <button type="button" className={`${css.prow} min-h-tap`} data-player-id={p.id} data-current={p.id===current} onClick={e=>onPick(p.id,e.currentTarget)}>
       <span className={css.prowShirt}><ClubShirt player={p} wardrobe={wardrobe} side="us"/></span>
       <span className={css.prowText}><span className={css.prowName} lang={contentLocale} dir="auto">{p.name}</span>
        <span className={css.prowSub}>{p.positions.map(posLabel).join(' / ')||t('tv.pick.none2')} · {years(p)}</span></span>
      </button></li>)}</ul>}
   {list.length>limit&&<button type="button" className={`${css.more} min-h-tap`} onClick={()=>setLimit(l=>l+PAGE)}>+ {list.length-limit}</button>}
  </div>
 </SlideSheet>
}

/** A debate's options — events or players — as a searchable list. No shirts: some options are matches. */
export function ChoicePicker({open,onClose,title,choices,current,contentLocale,closeLabel,searchLabel,t,onPick}:{
 open:boolean;onClose:()=>void;title:string;choices:readonly {id:string;name:string}[];current:string|undefined;contentLocale:string;closeLabel:string;searchLabel:string;t:T;onPick:(id:string,from:HTMLElement|null)=>void
}){
 const [q,setQ]=useState(''),[limit,setLimit]=useState(PAGE)
 useEffect(()=>{if(open){setQ('');setLimit(PAGE)}},[open])
 const list=useMemo(()=>{const s=q.trim().toLocaleLowerCase();return choices.filter(c=>!s||c.name.toLocaleLowerCase().includes(s))},[choices,q])
 return <SlideSheet open={open} onClose={onClose} title={title} size="full" closeLabel={closeLabel}>
  <div className={css.pickBody}>
   <div className={css.pickTop}><input type="search" className={css.search} value={q} placeholder={searchLabel} aria-label={searchLabel} data-testid="polls-search" onChange={e=>{setQ(e.target.value);setLimit(PAGE)}}/></div>
   {list.length===0?<p className={css.empty}>{t('tv.deb.none')}</p>
    :<ul className={css.rows} data-testid="polls-choices">{list.slice(0,limit).map(c=><li key={c.id}>
      <button type="button" className={`${css.prow} min-h-tap`} data-choice-id={c.id} data-current={c.id===current} onClick={e=>onPick(c.id,e.currentTarget)}>
       <span className={css.prowText}><span className={css.prowName} lang={contentLocale} dir="auto">{c.name}</span></span></button></li>)}</ul>}
   {list.length>limit&&<button type="button" className={`${css.more} min-h-tap`} onClick={()=>setLimit(l=>l+PAGE)}>+ {list.length-limit}</button>}
  </div>
 </SlideSheet>
}

/** 1–99 as a grid of shirt-number tiles. */
export function NumberPicker({open,onClose,title,current,closeLabel,t,onPick}:{open:boolean;onClose:()=>void;title:string;current:string|undefined;closeLabel:string;t:T;onPick:(v:string,from:HTMLElement|null)=>void}){
 return <SlideSheet open={open} onClose={onClose} title={title} size="full" closeLabel={closeLabel}>
  <ul className={css.numbers} data-testid="polls-numbers">{NUMBERS.map(n=><li key={n}><button type="button" className={`${css.num} min-h-tap`} aria-pressed={current===String(n)} aria-label={t('tv.num.aria',{n})} onClick={e=>onPick(String(n),e.currentTarget)}>{n}</button></li>)}</ul>
 </SlideSheet>
}

/** The eight roles, in the pitch's own words. */
export function PositionPicker({open,onClose,title,current,closeLabel,t,onPick}:{open:boolean;onClose:()=>void;title:string;current:string|undefined;closeLabel:string;t:T;onPick:(v:string,from:HTMLElement|null)=>void}){
 return <SlideSheet open={open} onClose={onClose} title={title} closeLabel={closeLabel}>
  <ul className={css.posGrid} data-testid="polls-positions">{POSITION_CODES.map(c=><li key={c}><button type="button" className={`${css.posBtn} min-h-tap`} aria-pressed={current===c} onClick={e=>onPick(c,e.currentTarget)}><b>{c}</b><span>{t(`tv.posn.${c}`)}</span></button></li>)}</ul>
 </SlideSheet>
}
