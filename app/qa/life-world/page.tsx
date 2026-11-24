import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { ClubSurface } from '@/components/clubs/ClubSurface'
import { clubLife } from '@/lib/clubs/life/pack'
import { rushView } from '@/lib/clubs/life/rush'
import { LIFE_TIMELINE } from '@/lib/clubs/life/packs'
import { storyNights } from '@/lib/life/hood/story/night'
import { loadClub } from '@/lib/clubs/resolver'
import { qaAllowed } from '@/lib/qa'

import { WorldQa } from './WorldQa'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * LIFE · the hood test stand — the open neighbourhood, any club, no save.
 * `?club=olympiacos&time=day|night&quality=lite|high&seed=1&start=play|title&people=classic&chapter=the-way-in` (the stand opens on the game's title; `start=play` goes straight to free roam). `notFound()` on the live site, like every stand under `app/qa/` (rule 19).
 */
export default async function LifeWorldQaPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  if (!qaAllowed()) notFound()
  const club = await loadClub(searchParams.club ?? 'hapoel-tel-aviv')
  if (!club) notFound()
  const pack = clubLife(club.data)
  // the nights the Fitter dated for this club's childhood, over the years its proposed birth year puts them in
  const birth = (LIFE_TIMELINE as Record<string, { birthYear?: number } | undefined>)[club.data.identity.id]?.birthYear
  const nights = storyNights(rushView(club.data), typeof birth === 'number' ? birth : null)
  return (
    <ClubSurface theme={club.data.theme} clubId={club.data.identity.id} locale="en" tabbar={false}>
      <WorldQa club={{ id: club.data.identity.id, skin: pack.skin, cast: pack.cast, nights }} chapterAt={searchParams.chapter} seed={Number(searchParams.seed ?? 1) || 1} time={searchParams.time === 'night' ? 'night' : searchParams.time === 'day' ? 'day' : 'dusk'} quality={searchParams.quality === 'high' ? 'high' : searchParams.quality === 'lite' ? 'lite' : undefined} start={searchParams.start === 'play' ? 'play' : 'title'} people={searchParams.people === 'classic' ? 'classic' : 'human'} />
    </ClubSurface>
  )
}
