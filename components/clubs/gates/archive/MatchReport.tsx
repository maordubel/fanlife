import Link from 'next/link'
import type {ClubData,Entity,Fact} from '@/lib/clubs/contract'
import {localizedDate,type UiLocale} from '@/lib/clubs/locale'
import css from './archive.module.css'

type Named=string|{name:string}
type Goal={name:string;side:'home'|'away';minute?:number|null;minute_raw?:string;own_goal?:boolean;penalty?:boolean}
type Match=Entity&{on?:string;home?:string;away?:string;competition?:string;venue?:string;lineup?:Named[];opponentLineup?:Named[];goalEvents?:Goal[]}
const names=(team:Named[])=>team.map(n=>typeof n==='string'?n:n.name)

export function MatchReport({match,club,locale,event}:{match:Fact<Entity>;club:ClubData;locale:UiLocale;event?:string}){
 const m=match.value as Match,he=locale==='he',date=m.on?localizedDate(m.on,locale):null
 const back=new URLSearchParams({lang:locale,...(event?{event}:{match:match.id})})
 const teams=[
  {label:club.identity.name,players:names(m.lineup??[])},
  {label:he?'היריבה':'Opponent',players:names(m.opponentLineup??[])},
 ]
 const sources=club.sources.filter(s=>match.sources.includes(s.id))
 return <article className={css.sheet}>
  <Link className={`${css.linkBtn} min-h-tap`} href={`/clubs/${club.identity.id}/archive?${back}`}>{he?'חזרה לארכיון':'Back to the archive'}</Link>
  <h2><bdi>{m.name}</bdi></h2>
  <p>{[date,m.competition,m.venue].filter(Boolean).join(' · ')}</p>
  {teams.some(t=>t.players.length>0)&&<section className={css.group}>
   <h3>{he?'הרכבים פותחים':'Starting lineups'}</h3>
   <div className={css.facts}>{teams.map(team=><div key={team.label}>
    <h4>{team.label}</h4>
    {team.players.length?<ol>{team.players.map((name,i)=><li key={i}><bdi>{name}</bdi></li>)}</ol>:<p>{he?'אין הרכב מתועד':'No documented lineup'}</p>}
   </div>)}</div>
  </section>}
  {!!m.goalEvents?.length&&<section className={css.group}>
   <h3>{he?'שערים מתועדים':'Documented goals'}</h3>
   <ol>{m.goalEvents.map((g,i)=><li key={i}>
    <bdi>{g.name}</bdi>{' · '}<bdi>{(g.side==='home'?m.home:m.away)??(g.side==='home'?(he?'בית':'Home'):(he?'חוץ':'Away'))}</bdi>
    {(g.minute_raw||g.minute!=null)&&<> · <bdi>{g.minute_raw||g.minute}′</bdi></>}
    {g.own_goal?(he?' · שער עצמי':' · own goal'):g.penalty?(he?' · פנדל':' · penalty'):null}
   </li>)}</ol>
  </section>}
  {!!sources.length&&<section className={css.group}>
   <h3>{he?'מקורות':'Sources'}</h3>
   <ul>{sources.map(s=><li key={s.id}>{s.url?<a className={css.src} href={s.url}><bdi>{s.title}</bdi></a>:<bdi>{s.title}</bdi>}</li>)}</ul>
  </section>}
 </article>
}
