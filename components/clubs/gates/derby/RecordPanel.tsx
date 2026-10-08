'use client'
import {useMemo} from 'react'
import {recordOf,resultOf,type WallMeeting} from '@/lib/clubs/derby-model'
import {dateText,type Shared,type Open} from './ui'
import css from './derby.module.css'

/** The Derby Record — a programme insert: the club's side of every documented meeting, and only what the record states. */
export function RecordPanel({meetings,s,onOpen}:{meetings:WallMeeting[];s:Shared;onOpen:Open}){
 const {t,locale,contentLocale}=s
 const rec=useMemo(()=>recordOf(meetings),[meetings])
 const {tally}=rec
 const peak=Math.max(1,...rec.decades.map(r=>r.w+r.d+r.l))
 const line=(label:string,m:WallMeeting|null)=>m&&<li key={label}><button type="button" className={css.rowBtn} onClick={e=>onOpen(m,e.currentTarget)} aria-label={`${label}: ${t('derby.call.truth',{home:m.home,hg:m.hg,ag:m.ag,away:m.away})}, ${dateText(m,locale,t)}. ${t('derby.rec.open')}`}>
  <span><small>{label}</small><b><bdi lang={contentLocale} dir="auto">{m.home}</bdi> {m.hg}–{m.ag} <bdi lang={contentLocale} dir="auto">{m.away}</bdi></b><small><bdi>{dateText(m,locale,t)}</bdi></small></span>
  <span className={css.pill} data-r={resultOf(m)??'U'} aria-hidden="true">{t(`derby.res.${resultOf(m)??'U'}`)}</span></button></li>
 // one meeting must not be listed four times: each fixture appears once, under the first label that names it
 const seen=new Set<string>()
 const rows=([[t('derby.rec.best'),rec.best],[t('derby.rec.worst'),rec.worst],[t('derby.rec.first'),rec.first],[t('derby.rec.last'),rec.last]] as const).filter(([,m])=>{if(!m||seen.has(m.id))return false;seen.add(m.id);return true})
 if(meetings.length===0)return <div className={css.scroll}><div className={css.bare}><h2>{t('derby.rec.title')}</h2><p>{t('derby.wall.empty',{club:s.clubName,rival:s.rival})}</p></div></div>
 return <div className={css.scroll} data-testid="derby-record">
  <div className={css.recordGrid}>
   <div className={css.col}>
    {tally.played>0?<div className={css.strip} role="group" aria-label={t('derby.rec.title')}>
     <div className={css.cell} data-r="W"><b>{tally.won}</b><span>{t('derby.word.W')}</span></div>
     <div className={css.cell} data-r="D"><b>{tally.drawn}</b><span>{t('derby.word.D')}</span></div>
     <div className={css.cell} data-r="L"><b>{tally.lost}</b><span>{t('derby.word.L')}</span></div>
     <p className={css.goals}><bdi>{tally.for}–{tally.against}</bdi> · {t('derby.rec.played',{n:tally.played})}</p>
    </div>:<p className={css.fine}>{t('derby.rec.none')}</p>}
    <ul className={css.rows}>{rows.map(([label,m])=>line(label,m))}</ul>
   </div>
   <div className={css.col}>
    {rec.decades.length>0&&<><p className={css.kicker}>{t('derbyDecade')}</p>
     <ol className={css.bars}>{rec.decades.map(r=>{const n=r.w+r.d+r.l;return <li key={r.decade}><span>{r.decade}s</span><span className={css.bar} style={{inlineSize:`${Math.max(10,(n/peak)*100)}%`}} role="img" aria-label={`${r.decade}s: ${r.w} ${t('derby.word.W')}, ${r.d} ${t('derby.word.D')}, ${r.l} ${t('derby.word.L')}`}>{r.w>0&&<i className={css.w} style={{flexGrow:r.w}}>{r.w}</i>}{r.d>0&&<i className={css.d} style={{flexGrow:r.d}}>{r.d}</i>}{r.l>0&&<i className={css.l} style={{flexGrow:r.l}}>{r.l}</i>}</span></li>})}</ol></>}
    <p className={css.fine}>{t('derby.coverage',{n:meetings.length})}</p>
    {rec.unstated>0&&<p className={css.fine}>{t('derby.rec.unstated',{n:rec.unstated,club:s.clubName})}</p>}
    {rec.undated>0&&<p className={css.fine}>{t('derby.rec.undated',{n:rec.undated})}</p>}
   </div>
  </div>
 </div>
}
