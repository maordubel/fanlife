import {notFound} from 'next/navigation'
import Link from 'next/link'
import type {CSSProperties} from 'react'
import {headers} from 'next/headers'
import {REGISTRY} from '@/lib/master/registry'
import {evaluationMode} from '@/lib/master/mode'
import {readState} from '@/lib/master/store'
import {resolveClubId,loadClub} from '@/lib/clubs/resolver'
import {clubTheme} from '@/lib/clubs/theme'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {ClubAwayDays} from '@/components/clubs/ClubAwayDays'
import {clubAwayData} from '@/lib/away-days/club'
import {clubHref} from '@/lib/clubs/club-href'
import {uiLocale} from '@/lib/clubs/locale'
import clubEn from '@/messages/clubs/en.json'
import clubHe from '@/messages/clubs/he.json'

export const dynamic='force-dynamic'
export const metadata={title:'Away Days'}

/** The team bus (decorative): the club's colour, sky windows, ink outline. */
function Bus(){return <svg className="wkk-bus" viewBox="0 0 120 60" aria-hidden="true"><path className="body" d="M8 12h96a8 8 0 0 1 8 8v26H8z"/><path className="win" d="M18 18h14v12H18zM36 18h14v12H36zM54 18h14v12H54zM72 18h14v12H72zM90 18h12v12H90z"/><path className="band" d="M8 36h104"/><circle className="wheel" cx="30" cy="48" r="7"/><circle className="wheel" cx="88" cy="48" r="7"/><path className="speed" d="M0 22h4M0 30h6M0 38h4"/></svg>}

/**
 * AWAY DAYS, for a club whose European journey has been built from UEFA's own match records — THE WEEKLY's travel log
 * (rule 124): the bus on the cover, the road on the map, a decade at a time, every night away a ticket stub.
 */
export default async function Page({params,searchParams}:{params:{slug:string};searchParams:{lang?:string}}) {
 const id=resolveClubId(headers().get('host'),params.slug,evaluationMode())
 if(!id)notFound()
 const data=clubAwayData(id)
 if(!data)notFound()
 const [state,core]=await Promise.all([readState(),loadClub(id)])
 const c=state.clubs.find(x=>x.id===id)
 if(!c)notFound()
 const locale=uiLocale(searchParams.lang),all=locale==='he'?clubHe:clubEn,copy=Object.fromEntries(Object.entries(all).filter(([k])=>k.startsWith('awayd_')).map(([k,v])=>[k.slice(6),v])) as unknown as Parameters<typeof ClubAwayDays>[0]['copy'],reg=REGISTRY.find(r=>r.id===id)||c,theme=core?.data.theme||clubTheme(reg)
 const title=copy.title.replace('{club}',c.name),longest=Math.max(6,...title.split(/\s+/).map(w=>w.length))
 return <ClubSurface theme={theme} clubId={id} locale={locale}>
  <main id="main" className="wkk wkk-away cad-page">
   <header className="wkk-away-head">
    <Link className="wkk-back min-h-tap" href={clubHref(id,'history',locale)}>‹ {copy.back}</Link>
    <div className="wk-panel shadow wkk-away-cover wk-sky">
     <span className="wk-speed" aria-hidden="true"/>
     <span className="wk-tag ink wkk-away-tag">{copy.kicker}</span>
     <h1 className="wk-logo wkk-away-h" style={{['--len' as string]:longest} as CSSProperties}>{title}</h1>
     <Bus/>
     <span className="wk-roundel wkk-away-nights" dir="ltr"><b className="wk-num">{data.counts.abroad}</b><small className="wk-k">{copy.nightsAway}</small></span>
    </div>
    <p className="wkk-away-lede">{copy.lede.replace('{a}',data.visits[0]!.playedOn.slice(0,4)).replace('{b}',data.visits[data.visits.length-1]!.playedOn.slice(0,4))}</p>
   </header>
   <ClubAwayDays data={data} locale={locale} copy={copy}/>
  </main>
 </ClubSurface>
}
