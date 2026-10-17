import 'server-only'
import {FIXTURE_TEAMS} from './teams'
import {lastForClub, nextForClub} from './provider'
import type {Fixture, FixtureDiagnostic, FixtureFeed, Result} from './types'

const OK_TTL = 6 * 3600_000
const FAIL_TTL = 10 * 60_000
let cache: {at: number; ttl: number; feed: FixtureFeed} | null = null

async function get(url: string): Promise<unknown> {
  const res = await fetch(url, {signal: AbortSignal.timeout(8000), next: {revalidate: 6 * 3600}, headers: {accept: 'application/json'}})
  if (!res.ok) throw new Error(`provider answered ${res.status}`)
  return res.json()
}

let inflight: Promise<FixtureFeed> | null = null

/**
 * The next real match of every club the provider can identify. Cached in memory for six hours.
 * Stale-while-revalidate (performance audit, 11.10.2026): an expired feed is answered at once and refreshed in the
 * background, and concurrent callers share ONE refresh — the hub's two readers (stop-press strip and Next up) never
 * fan out 17 clubs × 3 provider requests twice, and no page waits on the provider once any feed exists.
 */
export async function getFixtureFeed(now = new Date()): Promise<FixtureFeed> {
  if (cache && now.getTime() - cache.at < cache.ttl) return cache.feed
  const refresh = (inflight ??= fetchFeed(now).finally(() => { inflight = null }))
  if (cache) { refresh.catch(() => undefined); return cache.feed }
  return refresh
}

async function fetchFeed(now: Date): Promise<FixtureFeed> {
  const key = process.env.THESPORTSDB_KEY?.trim() || '123' // the provider's published free key
  const settled = await Promise.allSettled(FIXTURE_TEAMS.map(t => nextForClub(t, key, get, now)))
  const fixtures: Fixture[] = [], diagnostics: FixtureDiagnostic[] = [], results: Result[] = []
  const teamIds: Array<[string, string]> = []
  let failed = 0
  settled.forEach((r, i) => {
    const clubId = FIXTURE_TEAMS[i]!.clubId
    if (r.status === 'rejected') { failed++; diagnostics.push({clubId, teamId: null, note: `unavailable: ${String(r.reason?.message ?? r.reason).slice(0, 120)}`, eventsNext: 0, leagueNext: 0}); return }
    if (r.value.fixture) fixtures.push(r.value.fixture)
    if (r.value.teamId) teamIds.push([clubId, r.value.teamId])
    diagnostics.push({clubId, teamId: r.value.teamId, note: r.value.note, eventsNext: r.value.eventsNext, leagueNext: r.value.leagueNext})
  })
  // the latest finished match per club (Stop Press: LAST). A club the provider cannot answer simply has none.
  const last = await Promise.allSettled(teamIds.map(([clubId, teamId]) => lastForClub(clubId, teamId, key, get, now)))
  for (const l of last) if (l.status === 'fulfilled' && l.value) results.push(l.value)
  // A club the provider failed on this time keeps what we knew before: a bad minute at the provider must not empty the hub.
  const prev = cache?.feed
  if (prev && failed) {
    const failedIds = new Set(diagnostics.filter(d => d.note.startsWith('unavailable')).map(d => d.clubId))
    for (const f of prev.fixtures) if (failedIds.has(f.clubId) && Date.parse(f.kickoff) > now.getTime() && !fixtures.some(x => x.clubId === f.clubId)) fixtures.push(f)
    for (const r of prev.results ?? []) if (failedIds.has(r.clubId) && !results.some(x => x.clubId === r.clubId)) results.push(r)
  }
  const feed: FixtureFeed = {
    status: failed === 0 ? 'ok' : failed === FIXTURE_TEAMS.length ? 'unavailable' : 'partial',
    source: 'thesportsdb', generatedAt: now.toISOString(), fixtures, results, diagnostics,
  }
  cache = {at: now.getTime(), ttl: failed ? FAIL_TTL : OK_TTL, feed}
  return feed
}
