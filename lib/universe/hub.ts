import 'server-only'
import {door} from '@/lib/features-server'
import {readState} from '@/lib/master/store'
import {getFixtureFeed} from '@/lib/fixtures/service'
import {getCatalog} from './catalog'
import {HUB_ORIGIN, matchdayDecision, type Decision, type Origin, type Policy} from './discovery'

/** FAN LIFE's interface language as the companion apps name it */
export const originLang = (locale: string): Origin['lang'] => locale === 'he' ? 'he' : locale === 'el' ? 'el' : 'en'

/** The control room's switches for discovery units (CF-06): the universe door and what is held out. */
export async function universePolicy(): Promise<{open: boolean; policy: Policy}> {
  const d = await door('universe').catch(() => null)
  return {open: !!d?.open, policy: {off: new Set(d?.features.universeOff ?? [])}}
}

/**
 * The hub's one matchday decision, for a list of open clubs. HubMatchday, /api/universe/companion and the desk all
 * call this, so the card, its re-check and the control room can never disagree. Unknown (no feed, no catalog) → null.
 */
export async function hubDecision(open: readonly {id: string}[], now = new Date(), origin: Origin = HUB_ORIGIN): Promise<Decision | null> {
  const [feed, cat, u] = await Promise.all([getFixtureFeed(now).catch(() => null), getCatalog().catch(() => null), universePolicy()])
  if (!feed || !cat || !u.open) return null
  const ids = new Set(open.map(c => c.id))
  return matchdayDecision(feed.fixtures.filter(f => ids.has(f.clubId)), cat, now, {policy: u.policy, origin})
}

/** the clubs on the hub's roll, exactly as the home page lists them */
export async function hubOpenClubs(): Promise<{id: string}[]> {
  const {clubs} = await readState()
  return clubs.filter(c => c.status !== 'paused')
}
