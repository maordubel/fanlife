import type {Metadata} from 'next'
import {headers} from 'next/headers'
import {notFound, redirect} from 'next/navigation'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {LifeGame} from '@/components/clubs/life/LifeGame'
import {HoodDoor} from '@/components/clubs/life/hood/HoodDoor'
import {rushView} from '@/lib/clubs/life/rush'
import {LIFE_TIMELINE} from '@/lib/clubs/life/packs'
import {storyNights} from '@/lib/life/hood/story/night'
import {lifeThings} from '@/lib/clubs/life/things'
import {markFor} from '@/lib/brand/logos'
import {clubLife} from '@/lib/clubs/life/pack'
import {rushDoor} from '@/lib/clubs/life/rush'
import {door, isOwner} from '@/lib/features-server'
import {LIFE_SOON_PATH} from '@/lib/life/lock/paths'
import {uiLocale} from '@/lib/clubs/locale'
import {loadClub, resolveClubId} from '@/lib/clubs/resolver'
import {clubWorld} from '@/lib/clubs/world'
import {evaluationMode} from '@/lib/master/mode'
import {lifeOpen} from '@/lib/clubs/life/entry'
import {readState} from '@/lib/master/store'
import en from '@/messages/life-universal/en.json'
import he from '@/messages/life-universal/he.json'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {title: en.metaTitle, robots: {index: false, follow: false}}

/**
 * LIFE for any club. Since 28.11.2026 this address IS the new game: the open neighbourhood (`components/clubs/life/hood`),
 * one engine for every club, with the story's director, the day that turns and the club's own archive nights. The room
 * engine it replaces stays reachable for the owner at `?engine=classic` until its chapters have all moved across.
 *
 * Classic: one engine and one set of universal chapters, composed with what this
 * club's pack holds. The life says PARTIAL until the club's own
 * culture is written and approved. Preview opens it for every club; the real site opens it for a published (live) club.
 */
export default async function Page({params, searchParams}: {params: {slug: string}; searchParams: {lang?: string; engine?: string; clock?: string; quality?: string}}) {
  const preview = evaluationMode()
  // LIFE is closed to the public (owner, 24.11.2026): only the owner's session enters (the middleware already shows everyone else Coming soon)
  if (!(await lifeOpen())) redirect(LIFE_SOON_PATH)
  const owner = isOwner()
  const id = resolveClubId(headers().get('host'), params.slug, preview)
  if (!id) notFound()
  const [state, club, rushSwitch] = await Promise.all([readState(), loadClub(id), door('lifeRush')])
  const control = state.clubs.find(c => c.id === id)
  if (!club || !control || control.status === 'paused') notFound()
  if (!preview && !owner && control.status !== 'live') notFound()   // the owner plays every club's LIFE, published or not
  const locale = uiLocale(searchParams.lang), base = `/clubs/${id}`, copy = locale === 'he' ? he : en
  const pack = clubLife(club.data, {locale})
  if (!pack.readiness.playable) notFound()
  if (searchParams.engine !== 'classic') {
    // the nights the Fitter dated for this club's life, over the years its birth year puts them in
    const birth = (LIFE_TIMELINE as Record<string, {birthYear?: number} | undefined>)[id]?.birthYear
    const born = typeof birth === 'number' ? birth : null
    return (
      <ClubSurface theme={club.data.theme} clubId={id} locale="en" tabbar={false}>
        <main id="main">
          <HoodDoor mark={markFor(headers().get('host'), 192)} club={{id, things: lifeThings(club.data), skin: pack.skin, cast: pack.cast, nights: storyNights(rushView(club.data), born), town: club.data.identity.city, born, country: club.data.identity.country}} quality={searchParams.quality === 'high' ? 'high' : searchParams.quality === 'lite' ? 'lite' : undefined} />
        </main>
      </ClubSurface>
    )
  }
  // RUSH missions: the switch (or the owner's preview), and the missions this club's own archive can hold
  const rush = rushSwitch.open ? rushDoor(club.data, pack.skin) : null
  // the title card names the club the way its own people do, only from its researched (sourced) world
  const world = clubWorld(id)
  const heart = world ? {nickname: world.nicknames[0]?.text, ground: world.ground?.name} : null
  return (
    <ClubSurface theme={club.data.theme} clubId={id} locale={locale} tabbar={false}>
      <main id="main">
        <LifeGame key={`${id}:${locale}`} pack={pack} locale={locale} copy={copy} hubHref={`${base}?lang=${locale}`} langHref={{en: `${base}/life?lang=en`, he: `${base}/life?lang=he`}} rush={rush} heart={heart} />
      </main>
    </ClubSurface>
  )
}
