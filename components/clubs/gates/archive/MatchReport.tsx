import Link from 'next/link'
import type {ClubData,Entity,Fact} from '@/lib/clubs/contract'
import {localizedDate,type UiLocale} from '@/lib/clubs/locale'
import css from './archive.module.css'
import {gameCopy} from '@/lib/clubs/game-copy'

type Named=string|{name:string}
type Goal={name:string;side:'home'|'away';minute?:number|null;minute_raw?:string;own_goal?:boolean;penalty?:boolean}
type Match=Entity&{on?:string;home?:string;away?:string;competition?:string;venue?:string;attendance?:number;referee?:string;lineup?:Named[];opponentLineup?:Named[];goalEvents?:Goal[]}
const names=(team:Named[])=>team.map(n=>typeof n==='string'?n:n.name)

export function MatchReport({match,club,locale,event}:{match:Fact<Entity>;club:ClubData;locale:UiLocale;event?:string}){
 const copy=gameCopy(locale) as Record<string,string>,t=(k:string)=>copy[k]??k
 const m=match.value as Match,date=m.on?localizedDate(m.on,locale):null
 const back=new URLSearchParams({lang:locale,...(event?{event}:{match:match.id})})
 const teams=[
  {label:club.identity.name,players:names(m.lineup??[])},
  {label:t('ar.report.opponent'),players:names(m.opponentLineup??[])},
 ]
 const sources=club.sources.filter(s=>match.sources.includes(s.id))
 return <article className={css.sheet}>
  <Link className={`${css.linkBtn} min-h-tap`} href={`/clubs/${club.identity.id}/archive?${back}`}>{t('ar.report.back')}</Link>
  <h2><bdi>{m.name}</bdi></h2>
  <p>{[date,m.competition,m.venue].filter(Boolean).join(' · ')}</p>
  {(typeof m.attendance==='number'||m.referee)&&<dl className={css.facts}>
   {typeof m.attendance==='number'&&<div><dt>{t('ar.report.attendance')}</dt><dd>{m.attendance.toLocaleString(locale)}</dd></div>}
   {m.referee&&<div><dt>{t('ar.report.referee')}</dt><dd><bdi>{m.referee}</bdi></dd></div>}
  </dl>}
  {teams.some(t=>t.players.length>0)&&<section className={css.group}>
   <h3>{t('ar.report.lineups')}</h3>
   <div className={css.facts}>{teams.map(team=><div key={team.label}>
    <h4>{team.label}</h4>
    {team.players.length?<ol>{team.players.map((name,i)=><li key={i}><bdi>{name}</bdi></li>)}</ol>:<p>{t('ar.report.noLineup')}</p>}
   </div>)}</div>
  </section>}
  {!!m.goalEvents?.length&&<section className={css.group}>
   <h3>{t('ar.report.goals')}</h3>
   <ol>{m.goalEvents.map((g,i)=><li key={i}>
    <bdi>{g.name}</bdi>{' · '}<bdi>{(g.side==='home'?m.home:m.away)??(g.side==='home'?t('ar.report.home'):t('ar.report.away'))}</bdi>
    {(g.minute_raw||g.minute!=null)&&<> · <bdi>{g.minute_raw||g.minute}′</bdi></>}
    {g.own_goal?t('ar.report.own'):g.penalty?t('ar.report.pen'):null}
   </li>)}</ol>
  </section>}
  {!!sources.length&&<section className={css.group}>
   <h3>{t('ar.report.sources')}</h3>
   <ul>{sources.map(s=><li key={s.id}>{s.url?<a className={css.src} href={s.url}><bdi>{s.title}</bdi></a>:<bdi>{s.title}</bdi>}</li>)}</ul>
  </section>}
 </article>
}
