import Link from 'next/link'
import {clubHref} from '@/lib/clubs/club-href'
import type {UiLocale} from '@/lib/clubs/locale'
import type {Moment} from '@/lib/clubs/today'

type Copy={kicker:string;exact:string;near:string;open:string;pick:string}
/** The first thing a returning supporter meets: one real moment from the club's own history, and today's round. */
export function ClubToday({clubId,clubName,moment,pick,locale,copy}:{clubId:string;clubName:string;moment:Moment|null;pick:{key:string;name:string}|null;locale:UiLocale;copy:Copy}) {
 if(!moment&&!pick)return null
 const date=moment?new Intl.DateTimeFormat(locale,{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${moment.on}T00:00:00Z`)):''
 return <section className="mag-section club-today" aria-labelledby="today-h">
  <p className="mag-kicker" id="today-h">{copy.kicker.replace('{club}',clubName)}</p>
  <div className="ct-grid">
   {moment&&<Link className="ct-moment min-h-tap" href={clubHref(clubId,'timeline',locale)} data-testid="today-moment"><small>{moment.offset===0?copy.exact.replace('{n}',String(moment.yearsAgo)):copy.near.replace('{n}',String(moment.yearsAgo))}</small><b>{moment.title}</b><i><bdi>{date}</bdi> · {copy.open} →</i></Link>}
   {pick&&<Link className="ct-pick min-h-tap" href={clubHref(clubId,pick.key,locale)} data-testid="today-pick"><small>{copy.pick}</small><b>{pick.name}</b><i>→</i></Link>}
  </div>
 </section>
}
