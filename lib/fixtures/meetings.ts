import 'server-only'
import {REGISTRY} from '@/lib/master/registry'
import {loadClub} from '@/lib/clubs/resolver'
import {eligibleArchive} from '@/lib/clubs/archive'
import {readMatch} from '@/lib/life/universal/match'
import {sameClub,namesOf} from './names'

export type Meeting = {
  /** the day if the record states one */
  on: string | null
  year: number | null
  home: string
  away: string
  homeGoals: number
  awayGoals: number
  competition: string
  /** which archives hold this meeting */
  from: string[]
  /** the asking club's side, when the record says it; null = not stated */
  us: 'home' | 'away' | null
}

type Structured = {home?: unknown; away?: unknown; homeGoals?: unknown; awayGoals?: unknown; on?: unknown; competition?: unknown; us?: unknown}
/** A structured match row (home, away and both goal counts as numbers) — the shape a full archive carries. */
function structured(v: Structured) {
  if (typeof v.home !== 'string' || typeof v.away !== 'string' || !Number.isInteger(v.homeGoals) || !Number.isInteger(v.awayGoals)) return null
  return {home: v.home, away: v.away, homeGoals: v.homeGoals as number, awayGoals: v.awayGoals as number, on: typeof v.on === 'string' ? v.on : null, competition: typeof v.competition === 'string' ? v.competition : '', us: v.us === 'home' || v.us === 'away' ? v.us : null}
}

export type Tally = {played: number; won: number; drawn: number; lost: number; for: number; against: number}
/** The asking club's record in these meetings. Rows whose side is not stated are not counted. */
export function tallyOf(ms: Meeting[]): Tally {
  const t: Tally = {played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0}
  for (const m of ms) {
    if (!m.us) continue
    const f = m.us === 'home' ? m.homeGoals : m.awayGoals, a = m.us === 'home' ? m.awayGoals : m.homeGoals
    t.played++; t.for += f; t.against += a
    if (f > a) t.won++; else if (f === a) t.drawn++; else t.lost++
  }
  return t
}

/** The meetings the two clubs' own archives record. Nothing is inferred; a row we cannot read as a scoreline is not a meeting. */
export async function meetingsBetween(clubId: string, opponent: string, aliases: string[] = []): Promise<Meeting[]> {
  const names = [...namesOf(opponent), ...aliases]
  const isRival = (n: string) => names.some(x => sameClub(n, x))
  const ids = new Set([clubId])
  const rival = REGISTRY.find(c => c.id !== clubId && sameClub(c.name, opponent))
  if (rival) ids.add(rival.id)
  const found = new Map<string, Meeting>()
  for (const id of ids) {
    const club = REGISTRY.find(c => c.id === id)
    const pack = await loadClub(id).catch(() => null)
    if (!club || !pack) continue
    // the club's own structured matches — the full archive, side stated by the record
    if (id === clubId) for (const f of pack.data.matches || []) {
      const m = structured(f.value as unknown as Structured)
      if (!m || !m.us) continue
      const other = m.us === 'home' ? m.away : m.home
      if (!isRival(other)) continue
      const key = `${m.on ?? '?'}|${m.homeGoals}-${m.awayGoals}|${m.us === 'home' ? club.name : other}`
      if (!found.has(key)) found.set(key, {on: m.on, year: m.on ? Number(m.on.slice(0, 4)) : null, home: m.home, away: m.away, homeGoals: m.homeGoals, awayGoals: m.awayGoals, competition: m.competition, from: [club.name], us: m.us as 'home' | 'away'})
    }
    for (const f of eligibleArchive(pack.data)) {
      const m = readMatch(f.value.title, [club.name])
      if (!m) continue
      const other = m.us === 'home' ? m.away : m.home
      const target = id === clubId ? opponent : REGISTRY.find(c => c.id === clubId)!.name
      if (id === clubId ? !isRival(other) : !sameClub(other, target)) continue
      // one meeting per day and pairing, wherever it was recorded
      const key = `${f.value.on ?? f.value.year ?? '?'}|${m.homeGoals}-${m.awayGoals}|${m.us === 'home' ? club.name : other}`
      const have = found.get(key)
      if (have) { if (!have.from.includes(club.name)) have.from.push(club.name); continue }
      found.set(key, {on: f.value.on, year: f.value.year, home: m.home, away: m.away, homeGoals: m.homeGoals, awayGoals: m.awayGoals, competition: f.value.hint, from: [club.name], us: id === clubId ? m.us : (m.us === 'home' ? 'away' : 'home')})
    }
  }
  return [...found.values()].sort((a, b) => (b.on ?? `${b.year ?? 0}`).localeCompare(a.on ?? `${a.year ?? 0}`))
}
