import type {Metadata} from 'next'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {LifeGame} from '@/components/clubs/life/LifeGame'
import {clubLife} from '@/lib/clubs/life/pack'
import {uiLocale} from '@/lib/clubs/locale'
import {loadClub, resolveClubId} from '@/lib/clubs/resolver'
import {evaluationMode} from '@/lib/master/mode'
import {readState} from '@/lib/master/store'
import en from '@/messages/life-universal/en.json'
import he from '@/messages/life-universal/he.json'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {title: en.metaTitle, robots: {index: false, follow: false}}

/**
 * LIFE for any club: one engine and one set of universal chapters, composed with what this
 * club's pack holds. It is an evaluation build — the life says PARTIAL until the club's own
 * culture is written and approved — so outside evaluation the route does not exist.
 */
export default async function Page({params, searchParams}: {params: {slug: string}; searchParams: {lang?: string; story?: string}}) {
  const preview = evaluationMode()
  const id = resolveClubId(headers().get('host'), params.slug, preview)
  if (!id || !preview) notFound()
  const [state, club] = await Promise.all([readState(), loadClub(id)])
  const control = state.clubs.find(c => c.id === id)
  if (!club || !control || control.status === 'paused') notFound()
  const locale = uiLocale(searchParams.lang), base = `/clubs/${id}`, copy = locale === 'he' ? he : en
  const edition = searchParams.story === '2' ? 2 : undefined
  const pack = clubLife(club.data, {edition, locale})
  if (!pack.readiness.playable) notFound()
  return (
    <ClubSurface theme={club.data.theme} clubId={id} locale={locale} tabbar={false}>
      <main id="main">
        <nav aria-label={copy.editionNav} className="flex flex-wrap gap-3 p-3">
          <a className="min-h-tap inline-flex items-center underline" aria-current={!edition ? 'page' : undefined} href={`${base}/life?lang=${locale}`}>{copy.editionOriginal}</a>
          <a className="min-h-tap inline-flex items-center underline" aria-current={edition ? 'page' : undefined} href={`${base}/life?lang=${locale}&story=2`}>{copy.editionTwo}</a>
        </nav>
        <LifeGame key={`${id}:${edition ?? 1}:${locale}`} pack={pack} locale={locale} copy={copy} hubHref={`${base}?lang=${locale}`} langHref={{en: `${base}/life?lang=en${edition ? '&story=2' : ''}`, he: `${base}/life?lang=he${edition ? '&story=2' : ''}`}} legacyHref={club.data.life.state === 'legacy' ? '/life' : null} />
      </main>
    </ClubSurface>
  )
}
