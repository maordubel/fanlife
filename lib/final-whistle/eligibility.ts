import type {State} from '@/lib/master/types'
import {FIXTURE_TEAMS} from '@/lib/fixtures/teams'
import type {Config} from './types'

/**
 * Which clubs FINAL WHISTLE may watch: published (`live`, not preview), chosen by the owner, and known to the provider.
 * `lib/fixtures/teams.ts` says who the provider can identify — it is NOT the list of what is public (spec §3).
 */
export function eligibleClubIds(state: Pick<State, 'clubs'>, config: Pick<Config, 'clubIds'>): string[] {
  const mapped = new Set(FIXTURE_TEAMS.map(t => t.clubId))
  return state.clubs.filter(c => c.status === 'live' && config.clubIds.includes(c.id) && mapped.has(c.id)).map(c => c.id).sort()
}
