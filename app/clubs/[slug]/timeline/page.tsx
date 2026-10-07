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
import {GateHead} from '@/components/clubs/GateHead'
import {ClubTimelineBoard} from './ClubTimelineBoard'
export const dynamic='force-dynamic'
export const metadata={title:'Timeline · FAN LIFE'}
export default async function Page({params,searchParams}:{params:{slug:string};searchParams:{seed?:string;r?:string;lang?:string}}) {
 const resolved=await requestClub(params.slug)
 if(!resolved)notFound()
 const club=resolved.data,game=clubTimeline(club),round=roundFrom(searchParams),locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en,identityCopy=locale==='he'?clubHe:clubEn,games=gameCopy(locale)
  return <ClubSurface theme={club.theme} clubId={club.identity.id} locale={locale}><main id="main" dir={localeDirection(locale)} lang={locale} className="mag-game mx-auto min-h-screen max-w-2xl px-gutter py-8">
  <GateHead clubId={club.identity.id} clubName={club.identity.name} hubLabel={games.hub} gateNo="13" gateNoLabel={games.gateNo} title={copy.title} locale={locale} langLinks={(['en','he'] as const).map(l=>({l,label:l==='en'?copy.english:copy.hebrew,href:`?seed=${round.seed}&r=${round.cursor}&lang=${l}`}))}/>
  <p>{copy.sub}</p>
  {searchParams.lang&&!UI_LOCALES.includes(searchParams.lang as 'en'|'he')&&<p className="my-4 border-hair border-ink p-3">{identityCopy.fallback}</p>}
  {game.available?<>{club.readiness.state==='PARTIAL'&&<p className="my-4 border-hair border-ink bg-sheet p-3">{copy.partial}</p>}<ClubTimelineBoard key={`${club.identity.id}:${club.version}:${round.seed}:${round.cursor}:${locale}`} deal={game.dealTimelineRun(round.seed,round.cursor)} slug={club.identity.id} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale} contentLocale={club.locales.content}/></>:<p className="my-8 border-rule border-ink p-5">{copy.locked}</p>}
 </main></ClubSurface>
}
