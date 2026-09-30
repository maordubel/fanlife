import Link from 'next/link'
import {notFound} from 'next/navigation'
import type {CSSProperties} from 'react'
import {requestClub} from '@/lib/clubs/request'
import {clubTimeline} from '@/lib/clubs/timeline'
import {roundFrom} from '@/lib/rotation/round'
import en from '@/messages/timeline/en.json'
import he from '@/messages/timeline/he.json'
import {ClubTimelineBoard} from './ClubTimelineBoard'
export const dynamic='force-dynamic'
export const metadata={title:'Timeline · FAN LIFE'}
export default async function Page({params,searchParams}:{params:{slug:string};searchParams:{seed?:string;r?:string;lang?:string}}) {
 const resolved=await requestClub(params.slug)
 if(!resolved)notFound()
 const club=resolved.data,game=clubTimeline(club),round=roundFrom(searchParams),locale=searchParams.lang==='he'?'he':'en',copy=locale==='he'?he:en
 const primary=club.theme.primary.match(/\w\w/g)!.map(n=>parseInt(n,16)).join(' ')
 return <main id="main" dir={locale==='he'?'rtl':'ltr'} lang={locale} className="mx-auto min-h-screen max-w-2xl px-gutter py-8" style={{'--red':primary} as CSSProperties}>
 <nav className="mb-8 flex flex-wrap justify-between gap-3"><Link className="min-h-tap py-3" href={`/clubs/${club.identity.id}`}>{club.identity.name} ↗</Link><div className="flex gap-4"><Link className="min-h-tap py-3" href={`?seed=${round.seed}&r=${round.cursor}&lang=en`}>{copy.english}</Link><Link className="min-h-tap py-3" href={`?seed=${round.seed}&r=${round.cursor}&lang=he`}>{copy.hebrew}</Link></div></nav>
 <p className="font-latin text-xs tracking-widest">FAN LIFE / 13</p><h1 className="my-3 font-display text-step-3">{copy.title}</h1><p>{copy.sub}</p><p className="my-3 text-sm">{copy.content}: <bdi>{club.locales.content}</bdi> · <bdi>{club.readiness.state}</bdi></p>
 {game.available?<>{club.readiness.state==='PARTIAL'&&<p className="my-4 border-hair border-ink p-3">{copy.partial}</p>}<ClubTimelineBoard key={`${club.identity.id}:${club.version}:${round.seed}:${round.cursor}:${locale}`} deal={game.dealTimelineRun(round.seed,round.cursor)} slug={club.identity.id} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale}/></>:<p className="my-8 border-rule border-ink p-5">{copy.locked}</p>}
 <footer className="mt-12 border-t-hair border-ink/25 pt-5 text-sm"><Link className="min-h-tap py-3" href={`/master/core?club=${club.identity.id}`}>{copy.evidence} ↗</Link><p className="mt-3">{copy.version}: <bdi>{club.version}</bdi></p></footer>
 </main>
}
