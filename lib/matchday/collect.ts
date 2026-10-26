import {createHash} from 'node:crypto'
import {crestFor} from '@/lib/clubs/crest'
import {crestSlug} from '@/ecosystem/crests/index.mjs'
import {finalStatusOf, parseEvents, providerUrl, type ProviderEvent} from '@/lib/fixtures/provider'
import {afterDay, belongsToDay} from './day'
import {TEMPLATE_VERSION, type ClubDay, type FixtureStatus, type ProviderDayEvent, type Snapshot, type TemplateFixture} from './types'

type Class = FixtureStatus | 'excluded'
const NOT_STARTED = /^(|ns|not started|scheduled|tbd|tba|time to be defined)$/
const LIVE = /^(1h|2h|ht|et|bt|p|live|in play|in progress|1st half|2nd half|half time|extra time|break time|susp|int|interrupted|suspended)$/
/** The provider's word → ours. Cancelled/abandoned/void are left out of the day on purpose; a status never seen before is not guessed into a finished game. */
export function classify(rawStatus: string, kickoff: string, dateOnly: boolean, now: Date): Class {
  const s = rawStatus.trim().toLowerCase()
  if (/cancel|abandon|void|walkover|awarded/.test(s)) return 'excluded'
  if (/postpon|delay/.test(s)) return 'postponed'
  if (finalStatusOf(s)) return 'finished'
  if (LIVE.test(s)) return 'live'
  if (NOT_STARTED.test(s)) return 'scheduled'
  // unknown word: a game that started within the last three hours is shown as live, anything else as scheduled — never as finished
  const t = Date.parse(kickoff)
  return !dateOnly && t <= now.getTime() && now.getTime() - t < 3 * 3600_000 ? 'live' : 'scheduled'
}

const toDayEvent = (e: ProviderEvent): ProviderDayEvent => ({id: e.id, home: e.home, away: e.away, homeId: e.homeId, awayId: e.awayId, kickoff: e.kickoff, dateOnly: e.dateOnly, competition: e.competition, status: e.status})

/**
 * One club's look at the provider, judged. A club has "complete" coverage for the day only when we can PROVE it: it has a
 * match that day, or the provider's upcoming list continues past the day (so the gap is real, not missing data). A provider
 * that returned nothing later is never read as "no match today".
 */
export function judgeClubDay(o: {clubId: string; teamId: string; day: string; next: ProviderEvent[]; last: ProviderEvent[]; fetchedAt: string}): ClubDay {
  const mine = (e: ProviderEvent) => e.homeId === o.teamId || e.awayId === o.teamId
  const all = new Map<string, ProviderEvent>()
  for (const e of [...o.next, ...o.last]) if (mine(e) && !all.has(e.id)) all.set(e.id, e)
  const today = [...all.values()].filter(e => belongsToDay(e, o.day)).map(toDayEvent)
  const base = {clubId: o.clubId, providerTeamId: o.teamId, fetchedAt: o.fetchedAt, events: today}
  if (today.length) return {...base, coverage: 'complete', reason: null}
  if (o.next.filter(mine).some(e => afterDay(e, o.day))) return {...base, coverage: 'complete', reason: null}
  return {...base, coverage: 'unconfirmed', reason: 'the provider lists no later match, so a match today cannot be ruled out'}
}
export const errorClubDay = (clubId: string, teamId: string | null, reason: string, fetchedAt: string): ClubDay => ({clubId, providerTeamId: teamId, coverage: 'error', reason: reason.slice(0, 160), fetchedAt, events: []})

/** the provider calls for one club: upcoming and recent. Throws on any network failure (the caller records it as an error, never as "no match"). */
export async function lookClub(o: {clubId: string; teamId: string; day: string; key: string; get: (url: string) => Promise<unknown>; pause: (ms: number) => Promise<void>; now: Date}): Promise<ClubDay> {
  const next = parseEvents(await o.get(providerUrl(o.key, `eventsnext.php?id=${o.teamId}`)))
  await o.pause(2200)
  const last = parseEvents(await o.get(providerUrl(o.key, `eventslast.php?id=${o.teamId}`)))
  return judgeClubDay({clubId: o.clubId, teamId: o.teamId, day: o.day, next, last, fetchedAt: o.now.toISOString()})
}

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/**
 * Folds every club's day into one snapshot. The same provider event seen from two clubs is ONE match (the provider's event id
 * decides, never the names). Order: by Athens kick-off, "time to be confirmed" last, ties by the stable id.
 */
export function buildSnapshot(o: {day: string; now: Date; clubs: ClubDay[]; unmappedClubIds: string[]}): Snapshot {
  const teamToClub = new Map<string, string>()
  for (const c of o.clubs) if (c.providerTeamId) teamToClub.set(c.providerTeamId, c.clubId)
  const seen = new Map<string, {e: ProviderDayEvent; at: string}>()
  for (const c of o.clubs) for (const e of c.events) if (!seen.has(e.id)) seen.set(e.id, {e, at: c.fetchedAt})
  const fixtures: TemplateFixture[] = [], excluded: Snapshot['excluded'] = []
  for (const {e, at} of seen.values()) {
    const cls = classify(e.status, e.kickoff, e.dateOnly, o.now)
    if (cls === 'excluded') { excluded.push({id: `thesportsdb:${e.id}`, reason: e.status || 'cancelled'}); continue }
    const team = (name: string, pid: string | null) => ({id: (pid && teamToClub.get(pid)) || slug(name) || 'unknown', name: name.trim()})
    fixtures.push({
      id: `thesportsdb:${e.id}`, home: team(e.home, e.homeId), away: team(e.away, e.awayId),
      kickoff: e.dateOnly || cls === 'postponed' ? null : e.kickoff, ...(e.dateOnly || cls === 'postponed' ? {localDate: o.day} : {}),
      competition: e.competition, status: cls, source: {url: `https://www.thesportsdb.com/event/${encodeURIComponent(e.id)}`, observedAt: at},
    })
  }
  fixtures.sort((a, b) => (a.kickoff === null ? 1 : 0) - (b.kickoff === null ? 1 : 0) || String(a.kickoff).localeCompare(String(b.kickoff)) || a.id.localeCompare(b.id))
  const coverageByClub = Object.fromEntries(o.clubs.map(c => [c.clubId, c.coverage])) as Snapshot['coverageByClub']
  const bad = o.clubs.filter(c => c.coverage !== 'complete').map(c => c.clubId)
  const missingClubIds = [...new Set([...bad, ...o.unmappedClubIds])].sort()
  const allBad = o.clubs.length > 0 && o.clubs.every(c => c.coverage === 'error')
  const coverage = allBad || o.clubs.length === 0 ? 'unavailable' : missingClubIds.length ? 'partial' : 'complete'
  const teams = fixtures.flatMap(f => [f.home.id, f.away.id])
  // a crest is on file when the club holds its own or the universe's crest library (OFFSIDES, ecosystem/crests) names one
  const named = new Map(fixtures.flatMap(f => [[f.home.id, f.home.name], [f.away.id, f.away.name]] as [string, string][]))
  const missingCrests = [...new Set(teams.filter(id => !crestFor(id) && !crestSlug(named.get(id) ?? '')))].sort()
  const updatedAt = o.clubs.map(c => c.fetchedAt).sort().at(-1) ?? o.now.toISOString()
  const core = {day: o.day, coverage, fixtures: fixtures.map(f => ({...f, source: f.source.url})), missingClubIds, templateVersion: TEMPLATE_VERSION}
  const hash = createHash('sha256').update(JSON.stringify(core)).digest('hex').slice(0, 20)
  return {sample: false, day: o.day, coverage, updatedAt, fixtures, coverageByClub, missingClubIds, excluded, missingCrests, hash, templateVersion: TEMPLATE_VERSION}
}
