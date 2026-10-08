'use client'
import {useMemo,useState} from 'react'
import {decadeGroups,tallyOf,type WallMeeting} from '@/lib/clubs/derby-model'
import {Poster} from './Poster'
import {Coverage} from './Coverage'
import type {Shared,Open} from './ui'
import css from './derby.module.css'

const PAGE=24

/** The Rivalry Wall: every documented meeting as a poster, newest decade first, a one-line scoreboard above. */
export function WallPanel({meetings,s,onOpen}:{meetings:WallMeeting[];s:Shared;onOpen:Open}){
 const {t,locale,contentLocale}=s
 const groups=useMemo(()=>decadeGroups(meetings),[meetings])
 const tally=useMemo(()=>tallyOf(meetings),[meetings])
 // a long rivalry is paged: the newest decades first, the rest on request
 const [limit,setLimit]=useState(PAGE)
 const shown=useMemo(()=>{let left=limit;const out:typeof groups=[];for(const g of groups){if(left<=0)break;out.push({...g,items:g.items.slice(0,left)});left-=g.items.length}return out},[groups,limit])
 if(meetings.length===0)return <div className={css.scroll}><div className={css.bare} data-testid="derby-empty"><h2>{t('derby.wall.empty.title')}</h2><p>{t('derby.wall.empty',{club:s.clubName,rival:s.rival})}</p></div></div>
 return <div className={css.scroll} data-testid="derby-wall-panel">
  {tally.played>0&&<div className={css.strip} role="group" aria-label={`${t('derby.word.W')} ${tally.won}, ${t('derby.word.D')} ${tally.drawn}, ${t('derby.word.L')} ${tally.lost}`}>
   <div className={css.cell} data-r="W"><b>{tally.won}</b><span>{t('derby.word.W')}</span></div>
   <div className={css.cell} data-r="D"><b>{tally.drawn}</b><span>{t('derby.word.D')}</span></div>
   <div className={css.cell} data-r="L"><b>{tally.lost}</b><span>{t('derby.word.L')}</span></div>
   <p className={css.goals}><bdi>{tally.for}–{tally.against}</bdi> · {tally.played}</p>
  </div>}
  <Coverage meetings={meetings} s={s}/>
  <p className={css.fine}>{t('derby.wall.tap')}</p>
  {shown.map(g=><section key={g.decade??'none'} aria-label={g.decade===null?t('derby.wall.undated'):t('derby.wall.decade',{decade:g.decade})}>
   <h2 className={css.decade}>{g.decade===null?t('derby.wall.undated'):t('derby.wall.decade',{decade:g.decade})}</h2>
   <ul className={css.posters}>{g.items.map(m=><li key={m.id}><Poster m={m} locale={locale} contentLocale={contentLocale} t={t} onOpen={onOpen}/></li>)}</ul>
  </section>)}
  {meetings.length>limit&&<button type="button" className={`${css.btn} ${css.btnWide} ${css.more} min-h-tap`} data-testid="derby-wall-more" onClick={()=>setLimit(l=>l+PAGE)}>{t('derby.wall.more',{n:meetings.length-limit})}</button>}
 </div>
}
