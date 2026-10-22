import { notFound } from 'next/navigation'

import { ClubSurface } from '@/components/clubs/ClubSurface'
import { clubLife } from '@/lib/clubs/life/pack'
import { rushDoor } from '@/lib/clubs/life/rush'
import { loadClub } from '@/lib/clubs/resolver'
import { missionSpecFor } from '@/lib/life/rush/call'
import { MISSION_TEMPLATES } from '@/lib/life/rush/templates'
import { qaAllowed } from '@/lib/qa'

import { RushQa } from './RushQa'

/**
 * LIFE · RUSH test stand — any mission, any club, any age, without a save or a chapter.
 *
 * `?club=olympiacos&mission=kickoff-run&beat=coach&age=27&time=night&lang=he&quality=lite&weather=rain`.
 * The same host LIFE opens, fitted from the same door the club's LIFE page builds. `notFound()` on
 * the live site, like every stand under `app/qa/` (rule 19).
 */
export default async function RushQaPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  if (!qaAllowed()) notFound()
  const club = await loadClub(searchParams.club ?? 'hapoel-tel-aviv')
  if (!club) notFound()
  const template = MISSION_TEMPLATES.find((t) => t.id === searchParams.mission) ?? MISSION_TEMPLATES[0]!
  const locale = searchParams.lang === 'he' ? 'he' : 'en'
  const pack = clubLife(club.data, { locale })
  const door = rushDoor(club.data, pack.skin)
  const age = Number(searchParams.age ?? (template.ages[0] + template.ages[1]) / 2 | 0)
  const spec = missionSpecFor(door, { template: template.id, mandatory: searchParams.mandatory === '1', ...(searchParams.beat ? { beat: searchParams.beat } : {}) }, { id: 'qa', age }, { time: searchParams.time === 'day' ? 'day' : 'night', locale, playId: searchParams.seed ?? '1' })
  if (!spec) return <p>{template.id} is not playable for {club.data.identity.id} at age {age}.</p>
  const weather = searchParams.weather === 'rain' || searchParams.weather === 'cold' || searchParams.weather === 'heat' ? searchParams.weather : spec.weather
  return (
    <ClubSurface theme={club.data.theme} clubId={club.data.identity.id} locale={locale} tabbar={false}>
      <RushQa spec={{ ...spec, weather }} skin={pack.skin} locale={locale} gateLabel={door.gateLabel} quality={searchParams.quality === 'lite' ? 'lite' : searchParams.quality === 'high' ? 'high' : undefined} />
    </ClubSurface>
  )
}
