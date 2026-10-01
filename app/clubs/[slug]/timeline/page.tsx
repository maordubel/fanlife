import Link from 'next/link'
import {notFound} from 'next/navigation'
import {requestClub} from '@/lib/clubs/request'
import {clubTimeline} from '@/lib/clubs/timeline'
import {roundFrom} from '@/lib/rotation/round'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {uiLocale,localeDirection,UI_LOCALES} from '@/lib/clubs/locale'
import {REGISTRY} from '@/lib/master/registry'
import en from '@/messages/timeline/en.json'
import he from '@/messages/timeline/he.json'
import clubEn from '@/messages/clubs/en.json'
import clubHe from '@/messages/clubs/he.json'
import {ClubTimelineBoard} from './ClubTimelineBoard'
export const dynamic='force-dynamic'
export const metadata={title:'Timeline · FAN LIFE'}
export default async function Page({params,searchParams}:{params:{slug:string};searchParams:{seed?:string;r?:string;lang?:string}}) {
 const resolved=await requestClub(params.slug)
 if(!resolved)notFound()
 const club=resolved.data,game=clubTimeline(club),round=roundFrom(searchParams),locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en,identityCopy=locale==='he'?clubHe:clubEn
 const initials=REGISTRY.find(c=>c.id===club.identity.id)!.initials
 return <ClubSurface theme={club.theme} clubId={club.identity.id} locale={locale}><main id="main" dir={localeDirection(locale)} lang={locale} className="mx-auto min-h-screen max-w-2xl px-gutter py-8">
  <nav className="mb-8 flex flex-wrap justify-between gap-3"><Link className="club-wordmark min-h-tap py-3" href={`/clubs/${club.identity.id}?lang=${locale}`}><span className="identity-mark" aria-hidden="true">{initials}<small>FAN LIFE</small></span><span>{club.identity.name} ↗</span></Link><div className="flex gap-4"><Link className="min-h-tap py-3" href={`?seed=${round.seed}&r=${round.cursor}&lang=en`} hrefLang="en">{copy.english}</Link><Link className="min-h-tap py-3" href={`?seed=${round.seed}&r=${round.cursor}&lang=he`} hrefLang="he">{copy.hebrew}</Link></div></nav>
  <div className="identity-rule mb-6" aria-hidden="true"/><p className="font-latin text-xs tracking-widest">FAN LIFE / 13</p><h1 className="my-3 font-display text-step-3">{copy.title}</h1><p>{copy.sub}</p><p className="my-3 text-sm">{copy.content}: <bdi>{club.locales.content}</bdi> · <bdi>{club.readiness.state}</bdi></p>
  {searchParams.lang&&!UI_LOCALES.includes(searchParams.lang as 'en'|'he')&&<p className="my-4 border-hair border-ink p-3">{identityCopy.fallback}</p>}
  {game.available?<>{club.readiness.state==='PARTIAL'&&<p className="my-4 border-hair border-ink bg-sheet p-3">{copy.partial}</p>}<ClubTimelineBoard key={`${club.identity.id}:${club.version}:${round.seed}:${round.cursor}:${locale}`} deal={game.dealTimelineRun(round.seed,round.cursor)} slug={club.identity.id} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale} contentLocale={club.locales.content}/></>:<p className="my-8 border-rule border-ink p-5">{copy.locked}</p>}
  <footer className="mt-12 border-t-hair border-ink/25 pt-5 text-sm"><Link className="min-h-tap inline-block py-3" href={`/master/core?club=${club.identity.id}`}>{copy.evidence} ↗</Link><p className="mt-3 break-all">{copy.version}: <bdi>{club.version}</bdi></p><p className="mt-3">{club.theme.colorPolicy.status==='pending'?identityCopy.pending:club.theme.colorPolicy.status==='legacy'?identityCopy.legacy:identityCopy.approved}</p></footer>
 </main></ClubSurface>
}
