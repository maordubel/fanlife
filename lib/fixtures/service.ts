import 'server-only'
import {FIXTURE_TEAMS} from './teams'
import {nextForClub} from './provider'
import type {Fixture, FixtureDiagnostic, FixtureFeed} from './types'

const OK_TTL = 6 * 3600_000
const FAIL_TTL = 10 * 60_000
let cache: {at: number; ttl: number; feed: FixtureFeed} | null = null

async function get(url: string): Promise<unknown> {
  const res = await fetch(url, {signal: AbortSignal.timeout(8000), next: {revalidate: 6 * 3600}, headers: {accept: 'application/json'}})
  if (!res.ok) throw new Error(`provider answered ${res.status}`)
  return res.json()
}

/** The next real match of every club the provider can identify. Cached in memory for six hours. */
export async function getFixtureFeed(now = new Date()): Promise<FixtureFeed> {
  if (cache && now.getTime() - cache.at < cache.ttl) return cache.feed
  const key = process.env.THESPORTSDB_KEY?.trim() || '123' // the provider's published free key
  const settled = await Promise.allSettled(FIXTURE_TEAMS.map(t => nextForClub(t, key, get, now)))
  const fixtures: Fixture[] = [], diagnostics: FixtureDiagnostic[] = []
  let failed = 0
  settled.forEach((r, i) => {
    const clubId = FIXTURE_TEAMS[i]!.clubId
    if (r.status === 'rejected') { failed++; diagnostics.push({clubId, teamId: null, note: `unavailable: ${String(r.reason?.message ?? r.reason).slice(0, 120)}`, eventsNext: 0, leagueNext: 0}); return }
    if (r.value.fixture) fixtures.push(r.value.fixture)
    diagnostics.push({clubId, teamId: r.value.teamId, note: r.value.note, eventsNext: r.value.eventsNext, leagueNext: r.value.leagueNext})
  })
  const feed: FixtureFeed = {
    status: failed === 0 ? 'ok' : failed === FIXTURE_TEAMS.length ? 'unavailable' : 'partial',
    source: 'thesportsdb', generatedAt: now.toISOString(), fixtures, diagnostics,
  }
  cache = {at: now.getTime(), ttl: failed ? FAIL_TTL : OK_TTL, feed}
  return feed
}
