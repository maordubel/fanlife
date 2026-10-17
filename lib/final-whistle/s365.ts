/**
 * THE ONLY FILE THAT KNOWS 365SCORES. Second source for FINAL WHISTLE: used when TheSportsDB cannot answer for a club
 * (its shared free key answers 429 for many clubs at once). 365scores' web API needs no key and is not an official, documented
 * API — it may change without notice, so every field is read defensively and nothing is guessed. An unreadable game is dropped.
 * Two calls per club the first time (find the team once, kept in teams.json), then one call per look.
 */
import {norm} from '@/lib/fixtures/names'
import type {FixtureTeam} from '@/lib/fixtures/types'
import type {FinalStatus} from '@/lib/fixtures/types'
import type {ProviderFinal} from '@/lib/fixtures/provider'

const BASE = 'https://webws.365scores.com/web'
const COMMON = 'appTypeId=5&langId=1&timezoneName=Europe/Athens&userCountryId=1'
export const s365SearchUrl = (name: string) => `${BASE}/search/?${COMMON}&query=${encodeURIComponent(name)}&filter=competitors`
export const s365ResultsUrl = (teamId: string) => `${BASE}/games/results/?${COMMON}&competitors=${encodeURIComponent(teamId)}&showOdds=false`

type Json = Record<string, unknown>
const obj = (v: unknown): Json | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : null)
const arr = (v: unknown): Json[] => (Array.isArray(v) ? v.map(obj).filter((x): x is Json => !!x) : [])
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const idOf = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? String(v) : null)

/** Exactly one football team whose name is one of the club's known names; none or several mean "do not guess". */
export function parseS365Team(json: unknown, team: FixtureTeam): string | null {
  const hits = arr(obj(json)?.competitors).filter(c => c.sportId === 1 && text(c.name) && team.names.includes(norm(text(c.name)!)))
  if (hits.length !== 1) return null
  return idOf(hits[0]!.id)
}

/** The words 365scores uses for a finished game, mapped to ours. Penalties are NOT read (the kicks are not verified): they wait. */
const FINAL: Record<string, FinalStatus> = {'ended': 'FT', 'after extra time': 'AET', 'aet': 'AET'}

export function parseS365Finals(json: unknown): ProviderFinal[] {
  const out: ProviderFinal[] = []
  for (const g of arr(obj(json)?.games)) {
    const id = idOf(g.id), home = obj(g.homeCompetitor), away = obj(g.awayCompetitor)
    const hn = text(home?.name), an = text(away?.name), hid = idOf(home?.id), aid = idOf(away?.id)
    const raw = text(g.statusText), fin = raw ? FINAL[raw.toLowerCase()] : undefined
    const hs = home?.score, as = away?.score
    const start = text(g.startTime), t = start ? Date.parse(start) : NaN
    if (!id || !hn || !an || !hid || !aid || !raw || !fin || g.sportId !== 1 || !Number.isFinite(t)) continue
    if (g.statusGroup !== 4) continue
    if (typeof hs !== 'number' || typeof as !== 'number' || !Number.isInteger(hs) || !Number.isInteger(as) || hs < 0 || as < 0 || hs > 99 || as > 99) continue
    out.push({
      id: `s365:${id}`, home: hn, away: an, homeId: hid, awayId: aid, kickoff: new Date(t).toISOString(), dateOnly: false,
      competition: text(g.competitionDisplayName), round: text(g.roundName), venue: null, status: raw.toLowerCase(),
      rawStatus: raw, finalStatus: fin, homeScore: hs, awayScore: as, updatedAt: null, source: '365scores',
    })
  }
  return out
}
