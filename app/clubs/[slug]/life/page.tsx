import type {Metadata} from 'next'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {LifeGame} from '@/components/clubs/life/LifeGame'
import {clubLife} from '@/lib/clubs/life/pack'
import {rushDoor} from '@/lib/clubs/life/rush'
import {door} from '@/lib/features-server'
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
 * club's pack holds. The life says PARTIAL until the club's own
 * culture is written and approved. Preview opens it for every club; the real site opens it for a published (live) club.
 */
export default async function Page({params, searchParams}: {params: {slug: string}; searchParams: {lang?: string}}) {
  const preview = evaluationMode()
  const id = resolveClubId(headers().get('host'), params.slug, preview)
  if (!id) notFound()
  const [state, club, rushSwitch] = await Promise.all([readState(), loadClub(id), door('lifeRush')])
  const control = state.clubs.find(c => c.id === id)
  if (!club || !control || control.status === 'paused') notFound()
  if (!preview && control.status !== 'live') notFound()
  const locale = uiLocale(searchParams.lang), base = `/clubs/${id}`, copy = locale === 'he' ? he : en
  const pack = clubLife(club.data, {locale})
  if (!pack.readiness.playable) notFound()
  // RUSH missions: the switch (or the owner's preview), and the missions this club's own archive can hold
  const rush = rushSwitch.open ? rushDoor(club.data, pack.skin) : null
  return (
    <ClubSurface theme={club.data.theme} clubId={id} locale={locale} tabbar={false}>
      <main id="main">
        <LifeGame key={`${id}:${locale}`} pack={pack} locale={locale} copy={copy} hubHref={`${base}?lang=${locale}`} langHref={{en: `${base}/life?lang=en`, he: `${base}/life?lang=he`}} rush={rush} />
      </main>
    </ClubSurface>
  )
}
