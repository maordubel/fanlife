import Link from 'next/link'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {FixtureCard} from '@/components/clubs/FixtureCard'
import {ClubActivity} from '@/components/clubs/games/ClubActivity'
import {Dye} from '@/components/master/Dye'
import {readState} from '@/lib/master/store'
import {loadClub,resolveClubId} from '@/lib/clubs/resolver'
import {gateAccess} from '@/lib/clubs/access'
import {evaluationMode} from '@/lib/master/mode'
import {REGISTRY} from '@/lib/master/registry'
import {clubTheme} from '@/lib/clubs/theme'
import {uiLocale} from '@/lib/clubs/locale'
import {gateAvailability,sharedGate} from '@/lib/clubs/gates'
import {worldFor} from '@/lib/clubs/world'
import {getFixtureFeed} from '@/lib/fixtures/service'
import {livery} from '@/lib/club-livery'
import {clubHref} from '@/lib/clubs/club-href'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
export const dynamic='force-dynamic'
export function generateMetadata({params}:{params:{slug:string}}){const c=REGISTRY.find(r=>r.id===params.slug);return {title:c?`${worldFor(c).terraceTab} · ${c.name}`:en.terraceTitle}}

/** The terrace: the club's loudest end, your season so far on this device, the vote, and the next meeting. */
export default async function Terrace({params,searchParams}:{params:{slug:string};searchParams:{lang?:string}}) {
 const id=resolveClubId(headers().get('host'),params.slug,evaluationMode())
 if(!id)notFound()
 const [state,core]=await Promise.all([readState(),loadClub(id)])
 const c=state.clubs.find(x=>x.id===id)
 if(!c)notFound()
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en,reg=REGISTRY.find(r=>r.id===id)||c,theme=core?.data.theme||clubTheme(reg),world=worldFor(reg),lv=livery(id)
 const feed=await getFixtureFeed(new Date()).catch(()=>null),fx=feed?.fixtures.find(f=>f.clubId===id)
 const vote=core&&gateAccess(c,sharedGate('polls')!.number,evaluationMode()).allowed&&gateAvailability(core.data,'polls').playable
 return <ClubSurface theme={theme} clubId={id} locale={locale}><main id="main" className="mag-home club-terrace">
  <section className="mag-section"><div className="mag-hometerrace"><Dye art="terrace-scarf" className="mag-homescarf"/><div className="mag-head"><div><p className="mag-kicker">{copy.terraceKicker}</p><h1 className="mag-h2">{world.terrace?.name??copy.terraceTitle}{world.terrace?.local&&<> <bdi className="club-local" lang={world.terrace.script} dir="auto">{world.terrace.local}</bdi></>}</h1></div></div></div>
   {world.terrace&&<p className="club-terrace-line">{world.terrace.line}</p>}
  </section>
  {fx&&lv?<FixtureCard clubId={id} clubName={c.name} fx={fx} lv={lv} locale={locale} copy={{kicker:copy.fixtureCard,vs:copy.vs,cta:copy.nextCta}}/>:<section className="mag-section"><p className="mag-fine">{copy.terraceNoFixture}</p></section>}
  {core&&<section className="mag-section"><hr className="mag-rule"/><div className="mag-head"><div><p className="mag-kicker">{copy.terraceSeason}</p></div>{vote&&<Link className="mag-chip" href={clubHref(id,'polls',locale)}>{copy.terraceVote} →</Link>}</div><ClubActivity club={id} locale={locale}/></section>}
 </main></ClubSurface>
}
