import Link from 'next/link'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {BeenThere} from '@/components/fanlife/BeenThere'
import {readState} from '@/lib/master/store'
import {resolveClubId} from '@/lib/clubs/resolver'
import {evaluationMode} from '@/lib/master/mode'
import {uiLocale,localizedDate} from '@/lib/clubs/locale'
import {livery,wearLivery} from '@/lib/club-livery'
import {meetingsBetween} from '@/lib/fixtures/meetings'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
export const dynamic='force-dynamic'

export default async function Meetings({params,searchParams}:{params:{slug:string};searchParams:{vs?:string;lang?:string}}){
 const id=resolveClubId(headers().get('host'),params.slug,evaluationMode())
 if(!id)notFound()
 const {clubs}=await readState()
 const c=clubs.find(x=>x.id===id)
 const vs=(searchParams.vs||'').slice(0,80).trim()
 if(!c||!vs)notFound()
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en
 const l=livery(id)
 const rows=await meetingsBetween(id,vs)
 return <Shell club={c} locale={locale}><main id="main"><section className="mag-section">
  <hr className="mag-rule"/>
  <div className="mag-head"><div><p className="mag-kicker">{copy.meetingsKicker}</p><h1 className="mag-h2">{c.name} {copy.vs} {vs}</h1></div>
   <Link className="mag-chip" href={`/clubs/${id}?lang=${locale}`}>{copy.meetingsBack}</Link></div>
  {rows.length===0?<div className="mag-fixture empty"><div className="mag-fixture-body"><p>{copy.meetingsNone}</p></div></div>
  :<div style={{display:'grid',gap:16}}>{rows.map(m=><article className="mag-fixture" key={`${m.on??m.year}-${m.home}-${m.homeGoals}`} style={wearLivery(l)}>
   {l&&<span className="mag-band" data-livery={l.pattern} aria-hidden="true"/>}
   <div className="mag-fixture-body">
    <span className="mag-kicker">{m.on?localizedDate(m.on,locale):m.year??''}{m.competition?` · ${m.competition}`:''}</span>
    <h3>{m.home} <bdi>{m.homeGoals}–{m.awayGoals}</bdi> {m.away}</h3>
    <p className="mag-fixture-meta">{copy.meetingsFrom}: {m.from.join(' · ')}</p>
    <BeenThere club={id} id={`m-${m.on??m.year??'x'}-${m.home}-${m.away}`.replace(/\s+/g,'_').slice(0,150)} label={`${m.home} ${m.homeGoals}–${m.awayGoals} ${m.away}`} on={m.on??(m.year?String(m.year).slice(0,4):null)} copy={{mark:copy.beenMark,marked:copy.beenMarked,hint:copy.beenHint}}/>
   </div></article>)}</div>}
 </section></main></Shell>}
