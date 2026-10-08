'use client'
import type {WallMeeting} from '@/lib/clubs/derby-model'
import type {UiLocale} from '@/lib/clubs/locale'
import {dateText,resKey,type T,type Open} from './ui'
import css from './derby.module.css'

/** One documented meeting, pasted on the wall as a printed match poster. Result is a stamp, never colour alone. */
export function Poster({m,locale,contentLocale,t,onOpen}:{m:WallMeeting;locale:UiLocale;contentLocale:string;t:T;onOpen:Open}){
 const r=resKey(m),date=dateText(m,locale,t)
 const label=t('derby.poster.aria',{date,home:m.home,hg:m.hg,ag:m.ag,away:m.away,result:t(`derby.word.${r}`)})
 return <button type="button" className={css.poster} data-r={r} data-testid="derby-poster" data-meeting={m.id} aria-label={label} onClick={e=>onOpen(m,e.currentTarget)}>
  <span className={css.pTop}><span className={css.pDate}><bdi>{date}</bdi></span><span className={css.stamp} aria-hidden="true">{t(`derby.res.${r}`)}</span></span>
  <span className={css.pScore} dir="ltr" aria-hidden="true">{m.hg}–{m.ag}</span>
  <span className={css.pSides} dir="ltr" aria-hidden="true"><span data-us={m.us==='home'}><bdi lang={contentLocale} dir="auto">{m.home}</bdi></span><span data-us={m.us==='away'}><bdi lang={contentLocale} dir="auto">{m.away}</bdi></span></span>
  {m.comp&&<span className={css.pComp} aria-hidden="true"><bdi lang={contentLocale} dir="auto">{m.comp}</bdi></span>}
 </button>
}
