import Link from 'next/link'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {REGISTRY} from '@/lib/master/registry'
import {clubTheme} from '@/lib/clubs/theme'
import {BeenThere} from '@/components/fanlife/BeenThere'
import {readState} from '@/lib/master/store'
import {resolveClubId} from '@/lib/clubs/resolver'
import {evaluationMode} from '@/lib/master/mode'
import {uiLocale,localizedDate} from '@/lib/clubs/locale'
import {clubHref} from '@/lib/clubs/club-href'
import {meetingsBetween} from '@/lib/fixtures/meetings'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
export const dynamic='force-dynamic'

/** The archive of meetings with one opponent, as THE WEEKLY's ticket stubs (rule 124): date on the stub, score in the box, "I was there". */
export default async function Meetings({params,searchParams}:{params:{slug:string};searchParams:{vs?:string;lang?:string}}){
 const id=resolveClubId(headers().get('host'),params.slug,evaluationMode())
 if(!id)notFound()
 const {clubs}=await readState()
 const c=clubs.find(x=>x.id===id)
 const vs=(searchParams.vs||'').slice(0,80).trim()
 if(!c||!vs)notFound()
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en
 const rows=await meetingsBetween(id,vs)
 return <ClubSurface theme={clubTheme(REGISTRY.find(r=>r.id===c.id)||c)} clubId={id} locale={locale}><main id="main" className="wkk wkk-meet">
  <header className="wkk-meet-head">
   <Link className="wkk-back min-h-tap" href={clubHref(id,'',locale)}>‹ {copy.meetingsBack}</Link>
   <p className="wk-banner">{copy.meetingsKicker}</p>
   <h1 className="wk-logo red wk-tilt wkk-meet-h">{c.name} <span className="wkk-v">{copy.vs}</span> <bdi>{vs}</bdi></h1>
  </header>
  {rows.length===0?<p className="wk-cap white wkk-meet-none">{copy.meetingsNone}</p>
  :<ol className="wkk-stubs wkk-meet-list">{rows.map(m=><li className="wkk-stub" key={`${m.on??m.year}-${m.home}-${m.homeGoals}`}>
   <span className="wkk-stub-date">{m.on?<><b className="wk-num" dir="ltr">{m.on.slice(0,4)}</b><small className="wk-k"><bdi>{localizedDate(m.on,locale)}</bdi></small></>:<b className="wk-num" dir="ltr">{m.year??''}</b>}</span>
   <div className="wkk-stub-body">
    <b className="wk-head"><bdi>{m.home}</bdi> <span className="wkk-v">{copy.vs}</span> <bdi>{m.away}</bdi></b>
    {m.competition&&<p className="wk-k wkk-stub-comp">{m.competition}</p>}
    <p className="wkk-stub-note">{copy.meetingsFrom}: {m.from.join(' · ')}</p>
   </div>
   <div className="wkk-stub-score">
    <b className="wk-num" dir="ltr"><bdi>{m.homeGoals}–{m.awayGoals}</bdi></b>
    <BeenThere club={id} id={`m-${m.on??m.year??'x'}-${m.home}-${m.away}`.replace(/\s+/g,'_').slice(0,150)} label={`${m.home} ${m.homeGoals}–${m.awayGoals} ${m.away}`} on={m.on??(m.year?String(m.year).slice(0,4):null)} copy={{mark:copy.beenMark,marked:copy.beenMarked,hint:copy.beenHint}}/>
   </div>
  </li>)}</ol>}
 </main></ClubSurface>}
