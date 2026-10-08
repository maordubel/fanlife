'use client'
import type {ClubPlayer} from '@/lib/clubs/contract'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {precisionOf,type Entry} from '@/lib/clubs/entities'
import {lookOf} from '@/lib/clubs/archive-model'
import {ClubShirt} from '@/components/clubs/stage/ClubShirt'
import {tr} from '@/components/clubs/rumble/shared'
import css from './archive.module.css'

export type CardCtx={copy:GameCopy;locale:string;contentLocale:string;wardrobe:RumbleWardrobe}

const fmt=(locale:string,opts:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat(locale==='he'?'he':'en-GB',{timeZone:'UTC',...opts})
const at=(iso:string)=>new Date(`${iso}T00:00:00Z`)
/** "13 May" — day and month of an exact day, in the page language */
export const dayMonth=(iso:string,locale:string)=>fmt(locale,{day:'numeric',month:'short'}).format(at(iso))
/** "13 May" for a MM-DD key (any year: the reference year is a leap one) */
export const keyLabel=(key:string,locale:string,long=false)=>fmt(locale,{day:'numeric',month:long?'long':'short'}).format(new Date(Date.UTC(2000,Number(key.slice(0,2))-1,Number(key.slice(3)))))

/** a bookmark — the Archive's own "save", separate from "I was there" */
export function SaveButton({saved,title,copy,onToggle,tone}:{saved:boolean;title:string;copy:GameCopy;onToggle:()=>void;tone?:'card'|'sheet'}){
 return <button type="button" className={css.save} data-tone={tone} aria-pressed={saved} onClick={onToggle}
  aria-label={tr(copy,saved?'ar.card.unsaveLabel':'ar.card.saveLabel',{title})} title={tr(copy,saved?'ar.card.saved':'ar.card.save')}>
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 3h12v18l-6-4.5L6 21z" fill={saved?'currentColor':'none'} stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"/></svg>
 </button>
}

/** the date stub of a card: an exact day prints as <time>; a year-only entry prints a year and never a day */
export function DateStub({e,locale,copy}:{e:Entry;locale:string;copy:GameCopy}){
 const p=precisionOf(e)
 if(p==='day')return <time className={css.stub} dateTime={e.on!}><b>{e.year}</b><span>{dayMonth(e.on!,locale)}</span></time>
 if(p==='year')return <span className={css.stub} data-precision="year"><b>{e.year}</b><span>{tr(copy,'ar.time.yearOnly')}</span></span>
 return <span className={css.stub} data-precision="unknown"><b aria-hidden="true">?</b><span>{tr(copy,'ar.date.unknown')}</span></span>
}

const posList=(copy:GameCopy,e:Entry)=>(e.player?.positions||[]).map(p=>(copy as Record<string,string>)[p]||p).join(' / ')
const yearsOf=(copy:GameCopy,p:NonNullable<Entry['player']>)=>p.from!==null&&p.to!==null?tr(copy,'ar.card.years',{from:`\u2066${p.from}`,to:`${p.to}\u2069`}):p.from!==null||p.to!==null?String(p.from??p.to):''
const asPlayer=(e:Entry):Pick<ClubPlayer,'id'|'fromYear'|'toYear'>=>({id:e.id,fromYear:e.player?.from??null,toYear:e.player?.to??null})

/**
 * One archive object. The look is chosen by the entry (a match programme, a clipping, an index card, a player card) —
 * graphics from code, no imagery of anyone. The whole card opens the entry (the title button stretches over it);
 * the bookmark sits above it so both stay reachable by tap and keyboard.
 */
export function EntryCard({e,ctx,variant='row',saved,onOpen,onToggleSave,id}:{e:Entry;ctx:CardCtx;variant?:'deck'|'row'|'mini';saved:boolean;onOpen:(id:string)=>void;onToggleSave:(id:string)=>void;id?:string}){
 const {copy,locale,contentLocale,wardrobe}=ctx,look=lookOf(e),isPlayer=e.kind==='player'
 return <article id={id} className={css.card} data-look={look} data-variant={variant} data-testid="archive-entry" data-entry-id={e.id}>
  {isPlayer
   ?<span className={css.shirtStub} aria-hidden="true"><ClubShirt player={asPlayer(e)} wardrobe={wardrobe} className="h-full w-full"/></span>
   :<DateStub e={e} locale={locale} copy={copy}/>}
  <div className={css.cardBody}>
   <p className={css.kicker}>{tr(copy,isPlayer?'ar.kind.player':'ar.kind.moment')}{isPlayer&&e.player&&posList(copy,e)?` · ${posList(copy,e)}`:''}</p>
   <h3 className={css.cardTitle} lang={contentLocale} dir="auto">
    <button type="button" className={css.open} aria-label={tr(copy,'ar.card.open',{title:e.title})} onClick={()=>onOpen(e.id)}>{e.title}</button>
   </h3>
   {isPlayer
    ?e.player&&yearsOf(copy,e.player)&&<p className={css.cardHint}>{yearsOf(copy,e.player)}</p>
    :e.hint&&<p className={css.cardHint} lang={contentLocale} dir="auto">{e.hint}</p>}
  </div>
  <SaveButton saved={saved} title={e.title} copy={copy} onToggle={()=>onToggleSave(e.id)}/>
 </article>
}
