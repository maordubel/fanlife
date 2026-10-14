'use client'
import {useEffect,useMemo,useState} from 'react'
import {decadeGroups,resultOf,tallyOf,whenKey,type WallMeeting} from '@/lib/clubs/derby-model'
import {Poster} from './Poster'
import {Coverage} from './Coverage'
import {dateText,type Shared,type Open} from './ui'
import css from './derby.module.css'

const PAGE=24
/** decades from this one on are pasted up as posters; older ones are yellowed clippings */
const POSTER_FROM=2010
const FORM=10

/**
 * The Rivalry Wall — the derby-day poster wall (The Weekly, rule 124): the form guide in Ultra numerals, the last ten as
 * W/D/L roundels, a decade-by-decade grid to jump through, then every documented meeting as a torn match poster (older
 * decades as clippings). Every figure is counted from the meetings the archives hold — nothing is added.
 */
export function WallPanel({meetings,s,onOpen,gateNo=null,playable=false,onCall}:{meetings:WallMeeting[];s:Shared;onOpen:Open;gateNo?:number|null;playable?:boolean;onCall?:()=>void}){
 const {t,locale,contentLocale}=s
 const groups=useMemo(()=>decadeGroups(meetings),[meetings])
 const tally=useMemo(()=>tallyOf(meetings),[meetings])
 // the last ten the record can both date and read from the club's side, newest first
 const form=useMemo(()=>meetings.filter(m=>resultOf(m)!==null&&whenKey(m)!==null).sort((a,b)=>whenKey(b)!.localeCompare(whenKey(a)!)).slice(0,FORM),[meetings])
 // a long rivalry is paged: the newest decades first, the rest on request
 const [limit,setLimit]=useState(PAGE),[jump,setJump]=useState<string|null>(null)
 const shown=useMemo(()=>{let left=limit;const out:typeof groups=[];for(const g of groups){if(left<=0)break;out.push({...g,items:g.items.slice(0,left)});left-=g.items.length}return out},[groups,limit])
 useEffect(()=>{if(!jump)return;const el=document.getElementById(jump);if(el){const calm=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;el.scrollIntoView({block:'start',behavior:calm?'auto':'smooth'})}setJump(null)},[jump,shown])
 const key=(d:number|null)=>`derby-dec-${d??'none'}`
 // tapping a decade that is still folded away shows everything up to the end of it, then lands on it
 const goTo=(d:number|null)=>{let upto=0;for(const g of groups){upto+=g.items.length;if(g.decade===d)break}if(upto>limit)setLimit(upto);setJump(key(d))}
 const label=(d:number|null)=>d===null?t('derby.wall.undated'):t('derby.wall.decade',{decade:d})
 if(meetings.length===0)return <div className={css.scroll}><div className={css.bare} data-testid="derby-empty"><h2>{t('derby.wall.empty.title')}</h2><p>{t('derby.wall.empty',{club:s.clubName,rival:s.rival})}</p></div></div>
 return <div className={css.scroll} data-testid="derby-wall-panel">
  <div className={css.wallGrid}>
   <div className={css.formCol}>
    {tally.played>0&&<section className={css.form} aria-labelledby="derby-form-h">
     <div className={css.secHead}><h2 id="derby-form-h" className={css.secTitle}>{t('derby.form.title')}</h2><span className={css.secNote}>{t('derby.form.goals')} <b className={css.goals} dir="ltr">{tally.for}–{tally.against}</b></span></div>
     <div className={css.strip} role="group" aria-label={`${t('derby.word.W')} ${tally.won}, ${t('derby.word.D')} ${tally.drawn}, ${t('derby.word.L')} ${tally.lost}`}>
      <div className={css.cell} data-r="W"><b>{tally.won}</b><span>{t('derby.word.W')}</span></div>
      <div className={css.cell} data-r="D"><b>{tally.drawn}</b><span>{t('derby.word.D')}</span></div>
      <div className={css.cell} data-r="L"><b>{tally.lost}</b><span>{t('derby.word.L')}</span></div>
     </div>
     {form.length>0&&<div className={css.formRow}>
      <div className={css.secHead}><span className={css.kicker}>{t('derby.form.last',{n:form.length})}</span><span className={css.kicker}><bdi>{dateText(form[0]!,locale,t)}</bdi> → <bdi>{dateText(form[form.length-1]!,locale,t)}</bdi></span></div>
      <ol className={css.formDots} role="img" aria-label={t('derby.form.aria',{n:form.length,list:form.map(m=>t(`derby.word.${resultOf(m)}`)).join(', ')})}>
       {form.map(m=><li key={m.id} data-r={resultOf(m)!} aria-hidden="true">{t(`derby.res.${resultOf(m)}`)}</li>)}
      </ol>
     </div>}
    </section>}
    <Coverage meetings={meetings} s={s}/>
    {groups.length>1&&<section className={css.decades} aria-labelledby="derby-dec-h">
     <div className={css.secHead}><h2 id="derby-dec-h" className={css.secTitle}>{t('derbyDecade')}</h2><span className={css.kicker}>{t('derby.dec.jump')}</span></div>
     <ul className={css.decGrid}>{groups.map(g=>{const ty=tallyOf(g.items);return <li key={key(g.decade)}><button type="button" className={`${css.dec} min-h-tap`} onClick={()=>goTo(g.decade)} aria-label={t('derby.dec.aria',{decade:label(g.decade),n:g.items.length,w:ty.won,d:ty.drawn,l:ty.lost})}>
      <span className={css.decTop}><b>{label(g.decade)}</b><span>{g.items.length}</span></span>
      {ty.played>0&&<span className={css.decBar} aria-hidden="true">{ty.won>0&&<i data-r="W" style={{flexGrow:ty.won}}/>}{ty.drawn>0&&<i data-r="D" style={{flexGrow:ty.drawn}}/>}{ty.lost>0&&<i data-r="L" style={{flexGrow:ty.lost}}/>}</span>}
      <small>{ty.won}{t('derby.res.W')} · {ty.drawn}{t('derby.res.D')} · {ty.lost}{t('derby.res.L')}</small>
     </button></li>})}</ul>
    </section>}
   </div>
   <div className={css.wallCol}>
    <p className={css.kicker}>{t('derby.wall.tap')}</p>
    {shown.map(g=>{const ty=tallyOf(groups.find(x=>x.decade===g.decade)?.items??g.items),posters=g.decade!==null&&g.decade>=POSTER_FROM
     return <section key={g.decade??'none'} id={key(g.decade)} className={css.decSection} aria-label={label(g.decade)}>
      <div className={css.decadeHead}><h2 className={css.decade} data-old={!posters||undefined}>{label(g.decade)}</h2><span className={css.kicker}>{t('derby.mode.count.meetings',{n:groups.find(x=>x.decade===g.decade)?.items.length??g.items.length})}{ty.played>0&&<><br/><span className={css.muted}>{ty.won} {t('derby.res.W')} · {ty.drawn} {t('derby.res.D')} · {ty.lost} {t('derby.res.L')}</span></>}</span></div>
      <ul className={posters?css.posters:css.clips}>{g.items.map(m=><li key={m.id}><Poster m={m} locale={locale} contentLocale={contentLocale} t={t} onOpen={onOpen} look={posters?'poster':'clip'}/></li>)}</ul>
     </section>})}
    {meetings.length>limit&&<button type="button" className={`wk-seeall ${css.more} min-h-tap`} data-testid="derby-wall-more" onClick={()=>setLimit(l=>l+PAGE)}>{t('derby.wall.more',{n:meetings.length-limit})}<span aria-hidden="true">↓</span></button>}
    {playable&&onCall&&<div className={css.kickWrap}>
     <button type="button" className="wk-kick min-h-tap" onClick={onCall} data-testid="derby-kick">
      {gateNo!==null&&<span className="wk-kick-gate" aria-hidden="true"><small>{t('ticketGate')}</small><b>{gateNo}</b></span>}
      <span className="wk-kick-go"><span className="wk-speed" style={{['--sx' as string]:'92%',['--sy' as string]:'50%'}}/><span>{t('derby.kick.go')}</span><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="var(--mag-white)" stroke="var(--mag-ink)" strokeWidth="3"/><path d="M20 11l7 5-3 8h-8l-3-8z" fill="var(--mag-ink)"/></svg></span>
     </button>
     <p className={css.kickNote}>{t('derby.kick.note')}</p>
    </div>}
   </div>
  </div>
 </div>
}
