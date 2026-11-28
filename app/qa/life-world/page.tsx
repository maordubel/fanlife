import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { ClubSurface } from '@/components/clubs/ClubSurface'
import { clubLife } from '@/lib/clubs/life/pack'
import { rushView } from '@/lib/clubs/life/rush'
import { LIFE_TIMELINE } from '@/lib/clubs/life/packs'
import { storyNights } from '@/lib/life/hood/story/night'
import { loadClub } from '@/lib/clubs/resolver'
import { qaAllowed } from '@/lib/qa'
import { lifeThings } from '@/lib/clubs/life/things'
import { FANLIFE_LOGO } from '@/lib/brand/logos'
import { isOwner } from '@/lib/features-server'

import { WorldQa } from './WorldQa'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/** `?clock=13:30` holds the street at that minute of the day (the light does not move): the day's hours, one at a time */
const clockOf = (v: string | undefined): number | undefined => { const m = /^(\d{1,2})[:.](\d{2})$/.exec(v ?? ''); return m && +m[1]! < 24 && +m[2]! < 60 ? +m[1]! * 60 + +m[2]! : undefined }

/**
 * LIFE · the hood test stand — the open neighbourhood, any club, no save.
 * `?club=olympiacos&clock=13:30&time=day|night&quality=lite|high&seed=1&start=play|title&people=classic&chapter=the-way-in` (the stand opens on the game's title; `start=play` goes straight to free roam). `notFound()` on the live site, like every stand under `app/qa/` (rule 19).
 */
export default async function LifeWorldQaPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  // on the live site only the owner's session reaches this stand (the middleware has already turned everyone else to Coming soon)
  if (!qaAllowed() && !isOwner()) notFound()
  const club = await loadClub(searchParams.club ?? 'hapoel-tel-aviv')
  if (!club) notFound()
  const pack = clubLife(club.data)
  // the nights the Fitter dated for this club's childhood, over the years its proposed birth year puts them in
  const birth = (LIFE_TIMELINE as Record<string, { birthYear?: number } | undefined>)[club.data.identity.id]?.birthYear
  const nights = storyNights(rushView(club.data), typeof birth === 'number' ? birth : null)
  return (
    <ClubSurface theme={club.data.theme} clubId={club.data.identity.id} locale="en" tabbar={false}>
      <WorldQa mark={FANLIFE_LOGO[192]} club={{ id: club.data.identity.id, things: lifeThings(club.data), skin: pack.skin, cast: pack.cast, nights, town: club.data.identity.city, born: typeof birth === 'number' ? birth : null, country: club.data.identity.country }} chapterAt={searchParams.chapter} seed={Number(searchParams.seed ?? 1) || 1} time={searchParams.time === 'night' ? 'night' : searchParams.time === 'day' ? 'day' : 'dusk'} clockAt={clockOf(searchParams.clock)} quality={searchParams.quality === 'high' ? 'high' : searchParams.quality === 'lite' ? 'lite' : undefined} start={searchParams.start === 'play' ? 'play' : 'title'} people={searchParams.people === 'classic' ? 'classic' : 'human'} />
    </ClubSurface>
  )
}
