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
import {ModeTabs,type TimelineMode} from '@/components/clubs/gates/timeline-thread/ModeTabs'
import {ChronologyStart} from '@/components/clubs/gates/timeline-thread/ChronologyStart'
import {ThreadView} from '@/components/clubs/gates/timeline-thread/ThreadView'
import {threadEvents,threadLinks,threadPage} from '@/components/clubs/gates/timeline-thread/data'
import {bindThread,publicPlan} from '@/lib/clubs/thread-data'
import {FULL_DATES,MIN_DATES,chronologyShape,runKey} from '@/lib/clubs/chronology'
import {ClubTimelineBoard} from './ClubTimelineBoard'
export const dynamic='force-dynamic'
export const metadata={title:'Timeline'}
type Search={seed?:string;r?:string;lang?:string;mode?:string;at?:string;dec?:string;play?:string;[k:string]:string|undefined}

/**
 * Gate 13 · Timeline — three views of one club's dated history, each its own URL.
 *   Chronology (default; what every existing link opens) deals cards you place on the line.
 *   The Thread (`?mode=thread`) connects two cards with typed, approved, sourced links — a puzzle with five tiers.
 *   The Chronicle (`?mode=chronicle`) walks the documented entries in order. (`?mode=thread&at=…` is the old Chronicle link.)
 * A view that cannot open says why, with the exact counts, and never fills the gap with a guess.
 */
export default async function Page({params,searchParams}:{params:{slug:string};searchParams:Search}) {
 const resolved=await requestClub(params.slug)
 if(!resolved)notFound()
 const club=resolved.data,game=clubTimeline(club),locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en,identityCopy=locale==='he'?clubHe:clubEn,games=gameCopy(locale)
 const mode:TimelineMode=searchParams.mode==='chronicle'||(searchParams.mode==='thread'&&(searchParams.at||searchParams.dec))?'chronicle':searchParams.mode==='thread'?'thread':'chronology'
 const compact=game.available&&mode==='chronology'&&isPlayMode(modeOf('timeline'))
 const langLinks=(['en','he'] as const).map(l=>({l,label:l==='en'?copy.english:copy.hebrew,href:`?${new URLSearchParams(Object.entries({...searchParams,lang:l}).filter((e):e is [string,string]=>typeof e[1]==='string'))}`}))
 const fallback=searchParams.lang&&!UI_LOCALES.includes(searchParams.lang as 'en'|'he')&&<p className="my-4 border-hair border-ink p-3">{identityCopy.fallback}</p>
 const round=roundFrom(searchParams)
 const name=club.identity.name
 const tabs=<ModeTabs mode={mode} locale={locale} aria={String(games['tl.tabs'])} labels={{chronology:String(games['tl.tab.chron']),thread:String(games['tl.tab.thread']),chronicle:String(games['tl.tab.chronicle'])}}/>
 const fmt=(k:string,v:Record<string,string|number>)=>String(games[k]).replace(/\{(\w+)\}/g,(_,x:string)=>x in v?String(v[x]):`{${x}}`)
 let body:JSX.Element
 if(mode==='chronology'){
  if(!game.available){
   body=<section className="my-8 border-rule border-dashed border-ink p-5" data-testid="timeline-locked" data-blocker="TIMELINE_EXACT_DATES_SHORT"><h2 className="font-display text-step-2">{fmt('tl.c.locked.title',{})}</h2><p className="my-3">{fmt('tl.c.locked.body',{need:MIN_DATES,club:name,have:game.distinctDays})}</p><p className="font-mono tabular-nums text-[11px] uppercase tracking-wider">{fmt('tl.c.locked.blocker',{code:'TIMELINE_EXACT_DATES_SHORT'})}</p></section>
  }else{
   const shape=chronologyShape(game.distinctDays),deal=game.dealTimelineRun(round.seed,round.cursor)
   const events=threadEvents(club),links=threadLinks(club,events,[deal.anchor.id,...deal.queue.map(c=>c.id)])
   body=<>{club.readiness.state==='PARTIAL'&&<p className="my-4 border-hair border-ink bg-sheet p-3">{copy.partial}</p>}<ChronologyStart key={`${club.identity.id}:${round.seed}:${round.cursor}`} copy={games} clubName={name} placements={deal.queue.length} category={shape.category==='full'?'full':'short'} have={game.distinctDays} need={FULL_DATES} autoStart={searchParams.play==='1'}><ClubTimelineBoard key={`${club.identity.id}:${club.version}:${round.seed}:${round.cursor}:${locale}`} deal={deal} slug={club.identity.id} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale} contentLocale={club.locales.content} threadLinks={links} threadLabel={String(games['tl.result.open'])} runId={runKey(club.version,round.seed,round.cursor,{...shape,placements:deal.queue.length})}/></ChronologyStart></>
  }
 }else if(mode==='thread'){
  const plan=publicPlan(await bindThread(club),round.seed)
  const chronicleHref=`?${new URLSearchParams({mode:'chronicle',lang:locale})}`
  const again=`?${new URLSearchParams({mode:'thread',seed:String(round.seed),r:String(round.cursor+1),lang:locale})}`
  body=<ThreadView plan={plan} club={club.identity.id} clubName={name} slug={club.identity.id} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale} contentLocale={club.locales.content} copy={games} playUrl={again} chronicleHref={chronicleHref}/>
 }else{
  const events=threadEvents(club)
  const {plan,sources}=threadPage(club,events,{at:searchParams.at,dec:searchParams.dec})
  body=<ClubThread key={`${club.identity.id}:${club.version}:${locale}:${plan?.decade??'none'}:${plan?.events[plan.start]?.id??''}`} club={club.identity.id} clubName={name} locale={locale} contentLocale={club.locales.content} copy={games} plan={plan} sources={sources} archiveOpen={gateAvailability(club,'archive').playable} exactTotal={events.filter(e=>e.precision==='day').length}/>
 }
 const wide=mode!=='chronology'
 return <ClubSurface theme={club.theme} clubId={club.identity.id} locale={locale} tabbar={!compact}><main id="main" dir={localeDirection(locale)} lang={locale} data-mode={compact?modeOf('timeline'):'reading'} data-view={mode} className={`mag-game mx-auto min-h-screen ${wide?'max-w-4xl':'max-w-2xl'} px-gutter py-8`}>
  {compact
   ?<PlayHeader clubId={club.identity.id} clubName={name} title={copy.title} locale={locale} help={String(games['tl.help'])} copy={{back:games['play.back'],help:games['play.help'],close:games['play.close'],fanlife:games['play.fanlife'],language:games['play.language']}} langLinks={langLinks}/>
   :<><GateHead clubId={club.identity.id} clubName={name} hubLabel={games.hub} gateNo="13" gateNoLabel={games.gateNo} title={copy.title} locale={locale} langLinks={langLinks}/><p>{copy.sub}</p></>}
  {fallback}{tabs}{body}
 </main></ClubSurface>
}
