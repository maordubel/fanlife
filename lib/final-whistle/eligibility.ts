import type {State} from '@/lib/master/types'
import {FIXTURE_TEAMS} from '@/lib/fixtures/teams'
import type {Config} from './types'

/**
 * Which clubs FINAL WHISTLE watches: every club the provider can identify (owner, 16.10.2026: published or not), or only the
 * chosen ones when `allClubs` is off. `lib/fixtures/teams.ts` says who the provider can identify.
 */
export function eligibleClubIds(state: Pick<State, 'clubs'>, config: Pick<Config, 'clubIds' | 'allClubs'>): string[] {
  const mapped = new Set(FIXTURE_TEAMS.map(t => t.clubId))
  return state.clubs.filter(c => mapped.has(c.id) && (config.allClubs !== false || config.clubIds.includes(c.id))).map(c => c.id).sort()
}
