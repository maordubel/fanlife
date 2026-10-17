/**
 * THE ONLY FILE THAT KNOWS THESPORTSDB.  (House rule: one adapter per provider.)
 *
 * TheSportsDB (https://www.thesportsdb.com) — free key, 30 requests/minute. Its free tier
 * returns ONE event for `eventsnext`, so the adapter also reads the league's next events and
 * takes the earliest match that involves the club. Provider field names (`strHomeTeam`,
 * `dateEvent`, …) never leave this file; everything above sees `Fixture`.
 *
 * Nothing here invents. An unreadable field is null, an unusable event is dropped, a
 * team that cannot be identified exactly gives no fixture.
 */
import {norm} from './names'
import type {Fixture, FinalStatus, FixtureTeam, Result} from './types'

const BASE = 'https://www.thesportsdb.com/api/v1/json'
export const providerUrl = (key: string, path: string) => `${BASE}/${encodeURIComponent(key)}/${path}`

type Json = Record<string, unknown>
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const list = (json: unknown, key: string): Json[] => {
  const v = json && typeof json === 'object' ? (json as Json)[key] : null
  return Array.isArray(v) ? v.filter((x): x is Json => !!x && typeof x === 'object') : []
}

/** Identifies the provider's team for a club: exactly one football team, right name, right country. */
export function parseTeam(json: unknown, team: FixtureTeam): {teamId: string; leagueId: string | null} | null {
  const hits = list(json, 'teams').filter(t => {
    if (str(t.strSport)?.toLowerCase() !== 'soccer') return false
    const names = [str(t.strTeam), ...(str(t.strAlternate)?.split(',') ?? [])].filter((x): x is string => !!x).map(norm)
    const country = norm(str(t.strCountry) ?? '')
    return names.some(n => team.names.includes(n)) && team.countries.includes(country)
  })
  if (hits.length !== 1) return null // none, or ambiguous: both mean "do not guess"
  const id = str(hits[0]!.idTeam)
  return id ? {teamId: id, leagueId: str(hits[0]!.idLeague)} : null
}

export type ProviderEvent = {
  id: string; home: string; away: string; homeId: string | null; awayId: string | null
  kickoff: string; dateOnly: boolean; competition: string | null; round: string | null
  venue: string | null; status: string
}

/** Reads events; the provider's times are UTC. A missing time keeps the date and says so. */
export function parseEvents(json: unknown): ProviderEvent[] {
  const out: ProviderEvent[] = []
  for (const e of [...list(json, 'events'), ...list(json, 'results')]) {
    if (str(e.strSport) && str(e.strSport)!.toLowerCase() !== 'soccer') continue
    const id = str(e.idEvent), home = str(e.strHomeTeam), away = str(e.strAwayTeam)
    const date = str(e.dateEvent), time = str(e.strTime)
    if (!id || !home || !away || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    const hasTime = !!time && /^\d{2}:\d{2}(:\d{2})?$/.test(time) && time !== '00:00:00'
    const iso = `${date}T${hasTime ? (time!.length === 5 ? `${time}:00` : time) : '00:00:00'}Z`
    if (!Number.isFinite(Date.parse(iso))) continue
    out.push({
      id, home, away, homeId: str(e.idHomeTeam), awayId: str(e.idAwayTeam),
      kickoff: new Date(iso).toISOString(), dateOnly: !hasTime,
      competition: str(e.strLeague), round: str(e.intRound), venue: str(e.strVenue),
      status: (str(e.strStatus) ?? '').toLowerCase(),
    })
  }
  return out
}

const FINISHED = /finished|ft|aet|pen|cancel|abandon|awarded|walkover|void/
/** The earliest upcoming (or just-started) match that involves this provider team. */
export function chooseNext(clubId: string, teamId: string, events: readonly ProviderEvent[], now: Date): Fixture | null {
  const floor = now.getTime() - 2 * 3600_000 // a match that kicked off under two hours ago is still "now"
  const candidates = events
    .filter(e => (e.homeId === teamId || e.awayId === teamId) && !FINISHED.test(e.status) && Date.parse(e.kickoff) >= floor)
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff) || a.id.localeCompare(b.id))
  const e = candidates[0]
  if (!e) return null
  const clubSide = e.homeId === teamId ? 'home' : 'away'
  return {
    clubId, kickoff: e.kickoff, dateOnly: e.dateOnly, home: e.home, away: e.away, clubSide,
    opponent: clubSide === 'home' ? e.away : e.home, competition: e.competition, round: e.round, venue: e.venue,
    status: /postpon/.test(e.status) ? 'postponed' : 'scheduled', providerEventId: e.id,
  }
}

export type Fetcher = (url: string) => Promise<unknown>
/** The provider calls for one club. Throws on a network/HTTP failure so the caller can say "unavailable". */
export async function nextForClub(team: FixtureTeam, key: string, get: Fetcher, now: Date) {
  // The first search term that identifies exactly one right football club wins; a namesake in another sport never does.
  let found: ReturnType<typeof parseTeam> = null
  for (const term of [team.search, ...(team.searchAlso ?? [])]) {
    found = parseTeam(await get(providerUrl(key, `searchteams.php?t=${encodeURIComponent(term)}`)), team)
    if (found) break
  }
  if (!found) return {fixture: null, teamId: null, eventsNext: 0, leagueNext: 0, note: 'provider team not identified exactly'}
  const own = parseEvents(await get(providerUrl(key, `eventsnext.php?id=${found.teamId}`)))
  const league = found.leagueId ? parseEvents(await get(providerUrl(key, `eventsnextleague.php?id=${found.leagueId}`))) : []
  const fixture = chooseNext(team.clubId, found.teamId, [...own, ...league], now)
  return {fixture, teamId: found.teamId, eventsNext: own.length, leagueNext: league.length, note: fixture ? 'ok' : 'no upcoming match confirmed by the provider'}
}

/**
 * The provider's TEAM CARD (owner, 12.10.2026: team and stadium metadata, badges and kit pictures). It is a SECOND READING for
 * the control room to check the club file against — never a fact on a fan page by itself (rule 101: a club's voice needs two
 * publishers), and its pictures are the rights holders' marks shown "as is" (TheSportsDB terms), previewed to the owner only.
 * Both the old and the new field names are read (strTeamBadge → strBadge, strTeamJersey → strEquipment, strStadiumLocation → strLocation).
 */
export type TeamCard = {teamId: string; name: string; founded: number | null; stadium: string | null; capacity: number | null; location: string | null; website: string | null; league: string | null; badge: string | null; kit: string | null}
const https = (v: unknown) => { const s = str(v); return s && /^https:\/\/[^\s]+$/.test(s) ? s : null }
const intOf = (v: unknown, lo: number, hi: number) => { const n = Number(str(v) ?? v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null }
export function parseTeamCard(json: unknown, team: FixtureTeam): TeamCard | null {
  const hit = parseTeam(json, team); if (!hit) return null
  const t = list(json, 'teams').find(x => str(x.idTeam) === hit.teamId)!
  const site = str(t.strWebsite)
  return {
    teamId: hit.teamId, name: str(t.strTeam) ?? team.search, founded: intOf(t.intFormedYear, 1850, 2100),
    stadium: str(t.strStadium), capacity: intOf(t.intStadiumCapacity, 100, 200000), location: str(t.strLocation) ?? str(t.strStadiumLocation),
    website: site ? (/^https?:\/\//.test(site) ? site : `https://${site}`).replace(/^http:/, 'https:') : null, league: str(t.strLeague),
    badge: https(t.strBadge) ?? https(t.strTeamBadge), kit: https(t.strEquipment) ?? https(t.strTeamJersey),
  }
}
export async function teamCardFor(team: FixtureTeam, key: string, get: Fetcher): Promise<TeamCard | null> {
  for (const term of [team.search, ...(team.searchAlso ?? [])]) {
    const card = parseTeamCard(await get(providerUrl(key, `searchteams.php?t=${encodeURIComponent(term)}`)), team)
    if (card) return card
  }
  return null
}

/** Finished matches with both scores written by the provider; anything else is dropped, never guessed. */
export function parseResults(json: unknown): Array<ProviderEvent & {homeScore: number; awayScore: number}> {
  const byId = new Map(parseEvents(json).map(e => [e.id, e]))
  const out: Array<ProviderEvent & {homeScore: number; awayScore: number}> = []
  for (const e of [...list(json, 'results'), ...list(json, 'events')]) {
    const id = str(e.idEvent), ev = id ? byId.get(id) : undefined
    const h = str(e.intHomeScore), a = str(e.intAwayScore)
    if (!ev || h === null || a === null || !/^\d{1,2}$/.test(h) || !/^\d{1,2}$/.test(a)) continue
    if (!out.some(x => x.id === ev.id)) out.push({...ev, homeScore: Number(h), awayScore: Number(a)})
  }
  return out
}
/** The most recent finished match of this provider team, before now. */
export function chooseLast(clubId: string, teamId: string, results: ReturnType<typeof parseResults>, now: Date): Result | null {
  const e = results
    .filter(r => (r.homeId === teamId || r.awayId === teamId) && Date.parse(r.kickoff) < now.getTime())
    .sort((a, b) => Date.parse(b.kickoff) - Date.parse(a.kickoff) || a.id.localeCompare(b.id))[0]
  if (!e) return null
  const clubSide = e.homeId === teamId ? 'home' : 'away'
  return {clubId, kickoff: e.kickoff, home: e.home, away: e.away, homeScore: e.homeScore, awayScore: e.awayScore, clubSide,
    opponent: clubSide === 'home' ? e.away : e.home, competition: e.competition, providerEventId: e.id}
}
export async function lastForClub(clubId: string, teamId: string, key: string, get: Fetcher, now: Date): Promise<Result | null> {
  return chooseLast(clubId, teamId, parseResults(await get(providerUrl(key, `eventslast.php?id=${teamId}`))), now)
}

/**
 * FINAL WHISTLE: the provider's words for "the match is over", mapped to ours. Anything not listed — live, half time,
 * postponed, cancelled, abandoned, awarded, walkover, void, and any status never seen before — is NOT a final.
 * The list grows only from `rawStatus` values the dry run has actually recorded.
 */
const FINAL_WORDS: Record<string, FinalStatus> = {
  'ft': 'FT', 'match finished': 'FT', 'ended': 'FT', 'full time': 'FT', 'finished': 'FT',
  'aet': 'AET', 'after extra time': 'AET', 'finished after extra time': 'AET',
  'pen': 'PEN', 'ap': 'PEN', 'after penalties': 'PEN', 'finished after penalties': 'PEN', 'penalties': 'PEN',
}
export const finalStatusOf = (raw: string | null): FinalStatus | null => (raw ? FINAL_WORDS[raw.trim().toLowerCase()] ?? null : null)

export type ProviderFinal = ProviderEvent & {rawStatus: string; finalStatus: FinalStatus; homeScore: number; awayScore: number; updatedAt: string | null; source?: 'thesportsdb' | '365scores'}
/**
 * Events the provider calls finished, with whole non-negative scores. Never guesses: a missing or odd score, an unknown
 * status and a duplicate id are dropped. Penalty kicks are NOT read — no provider field for them has been verified yet,
 * so a shoot-out stays "penalties unknown" and waits for review rather than being invented.
 */
export function parseFinals(json: unknown): ProviderFinal[] {
  const byId = new Map(parseEvents(json).map(e => [e.id, e]))
  const out: ProviderFinal[] = []
  for (const e of [...list(json, 'results'), ...list(json, 'events')]) {
    const id = str(e.idEvent), ev = id ? byId.get(id) : undefined
    const raw = str(e.strStatus), fin = finalStatusOf(raw)
    const h = str(e.intHomeScore), a = str(e.intAwayScore)
    if (!ev || !raw || !fin || h === null || a === null || !/^\d{1,2}$/.test(h) || !/^\d{1,2}$/.test(a)) continue
    if (out.some(x => x.id === ev.id)) continue
    out.push({...ev, rawStatus: raw, finalStatus: fin, homeScore: Number(h), awayScore: Number(a), updatedAt: null})
  }
  return out
}
