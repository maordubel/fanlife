import {notFound} from 'next/navigation'
import Link from 'next/link'
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

/** AWAY DAYS, for a club whose European journey has been built from UEFA's own match records. */
export default async function Page({params,searchParams}:{params:{slug:string};searchParams:{lang?:string}}) {
 const id=resolveClubId(headers().get('host'),params.slug,evaluationMode())
 if(!id)notFound()
 const data=clubAwayData(id)
 if(!data)notFound()
 const [state,core]=await Promise.all([readState(),loadClub(id)])
 const c=state.clubs.find(x=>x.id===id)
 if(!c)notFound()
 const locale=uiLocale(searchParams.lang),all=locale==='he'?clubHe:clubEn,copy=Object.fromEntries(Object.entries(all).filter(([k])=>k.startsWith('awayd_')).map(([k,v])=>[k.slice(6),v])) as unknown as Parameters<typeof ClubAwayDays>[0]['copy'],reg=REGISTRY.find(r=>r.id===id)||c,theme=core?.data.theme||clubTheme(reg)
 return <ClubSurface theme={theme} clubId={id} locale={locale}>
  <main id="main" className="mag-home club-home cad-page">
   <header className="cad-head">
    <p className="mag-kicker">{copy.kicker}</p>
    <h1 className="mag-h2">{copy.title.replace('{club}',c.name)}</h1>
    <p className="cad-lede">{copy.lede.replace('{a}',data.visits[0]!.playedOn.slice(0,4)).replace('{b}',data.visits[data.visits.length-1]!.playedOn.slice(0,4))}</p>
    <Link className="mag-chip min-h-tap" href={clubHref(id,'history',locale)}>← {copy.back}</Link>
   </header>
   <ClubAwayDays data={data} locale={locale} copy={copy}/>
  </main>
 </ClubSurface>
}
