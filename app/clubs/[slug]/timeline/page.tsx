import {notFound} from 'next/navigation'
import {requestClub} from '@/lib/clubs/request'
import {clubTimeline} from '@/lib/clubs/timeline'
import {roundFrom} from '@/lib/rotation/round'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {uiLocale,localeDirection,UI_LOCALES} from '@/lib/clubs/locale'
import en from '@/messages/timeline/en.json'
import he from '@/messages/timeline/he.json'
import clubEn from '@/messages/clubs/en.json'
import clubHe from '@/messages/clubs/he.json'
import {gameCopy} from '@/lib/clubs/game-copy'
import {gateAvailability} from '@/lib/clubs/gates'
import {modeOf,isPlayMode} from '@/lib/clubs/layout-mode'
import {GateHead} from '@/components/clubs/GateHead'
import {PlayHeader} from '@/components/clubs/PlayHeader'
import {ClubThread} from '@/components/clubs/gates/timeline-thread/ClubThread'
import {ModeTabs} from '@/components/clubs/gates/timeline-thread/ModeTabs'
import {threadEvents,threadLinks,threadPage} from '@/components/clubs/gates/timeline-thread/data'
import {ClubTimelineBoard} from './ClubTimelineBoard'
export const dynamic='force-dynamic'
export const metadata={title:'Timeline'}
type Search={seed?:string;r?:string;lang?:string;mode?:string;at?:string;dec?:string;[k:string]:string|undefined}

/**
 * Gate 13 · Timeline — two views of one club's dated history. Chronology (the default, and what every existing link
 * opens) deals cards you place on the line; The Thread (`?mode=thread`) walks the documented entries in order.
 */
export default async function Page({params,searchParams}:{params:{slug:string};searchParams:Search}) {
 const resolved=await requestClub(params.slug)
 if(!resolved)notFound()
 const club=resolved.data,game=clubTimeline(club),locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en,identityCopy=locale==='he'?clubHe:clubEn,games=gameCopy(locale)
 const mode=searchParams.mode==='thread'?'thread':'chronology'
 const compact=game.available&&isPlayMode(modeOf('timeline'))
 const langLinks=(['en','he'] as const).map(l=>({l,label:l==='en'?copy.english:copy.hebrew,href:`?${new URLSearchParams(Object.entries({...searchParams,lang:l}).filter((e):e is [string,string]=>typeof e[1]==='string'))}`}))
 const fallback=searchParams.lang&&!UI_LOCALES.includes(searchParams.lang as 'en'|'he')&&<p className="my-4 border-hair border-ink p-3">{identityCopy.fallback}</p>
 let body:JSX.Element
 if(!game.available){
  body=<p className="my-8 border-rule border-ink p-5">{copy.locked}</p>
 }else{
  const events=threadEvents(club)
  const tabs=<ModeTabs mode={mode} locale={locale} aria={String(games['tl.tabs'])} labels={{chronology:String(games['tl.tab.chron']),thread:String(games['tl.tab.thread'])}}/>
  if(mode==='thread'){
   const {plan,sources}=threadPage(club,events,{at:searchParams.at,dec:searchParams.dec})
   body=<>{fallback}{tabs}<ClubThread key={`${club.identity.id}:${club.version}:${locale}:${plan?.decade??'none'}:${plan?.events[plan.start]?.id??''}`} club={club.identity.id} clubName={club.identity.name} locale={locale} contentLocale={club.locales.content} copy={games} plan={plan} sources={sources} archiveOpen={gateAvailability(club,'archive').playable} exactTotal={events.filter(e=>e.precision==='day').length}/></>
  }else{
   const round=roundFrom(searchParams),deal=game.dealTimelineRun(round.seed,round.cursor)
   const links=threadLinks(club,events,[deal.anchor.id,...deal.queue.map(c=>c.id)])
   body=<>{fallback}{tabs}{club.readiness.state==='PARTIAL'&&<p className="my-4 border-hair border-ink bg-sheet p-3">{copy.partial}</p>}<ClubTimelineBoard key={`${club.identity.id}:${club.version}:${round.seed}:${round.cursor}:${locale}`} deal={deal} slug={club.identity.id} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale} contentLocale={club.locales.content} threadLinks={links} threadLabel={String(games['tl.result.open'])}/></>
  }
 }
 return <ClubSurface theme={club.theme} clubId={club.identity.id} locale={locale} tabbar={!compact}><main id="main" dir={localeDirection(locale)} lang={locale} data-mode={compact?modeOf('timeline'):'reading'} data-view={mode} className={`mag-game mx-auto min-h-screen ${mode==='thread'?'max-w-4xl':'max-w-2xl'} px-gutter py-8`}>
  {compact
   ?<PlayHeader clubId={club.identity.id} clubName={club.identity.name} title={copy.title} locale={locale} help={String(games['tl.help'])} copy={{back:games['play.back'],help:games['play.help'],close:games['play.close'],fanlife:games['play.fanlife'],language:games['play.language']}} langLinks={langLinks}/>
   :<><GateHead clubId={club.identity.id} clubName={club.identity.name} hubLabel={games.hub} gateNo="13" gateNoLabel={games.gateNo} title={copy.title} locale={locale} langLinks={langLinks}/><p>{copy.sub}</p></>}
  {body}
 </main></ClubSurface>
}
