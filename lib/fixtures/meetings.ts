import 'server-only'
import {REGISTRY} from '@/lib/master/registry'
import {loadClub} from '@/lib/clubs/resolver'
import {eligibleArchive} from '@/lib/clubs/archive'
import {readMatch} from '@/lib/life/universal/match'
import {sameClub} from './names'

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
}

/** The meetings the two clubs' own archives record. Nothing is inferred; a row we cannot read as a scoreline is not a meeting. */
export async function meetingsBetween(clubId: string, opponent: string): Promise<Meeting[]> {
  const ids = new Set([clubId])
  const rival = REGISTRY.find(c => c.id !== clubId && sameClub(c.name, opponent))
  if (rival) ids.add(rival.id)
  const found = new Map<string, Meeting>()
  for (const id of ids) {
    const club = REGISTRY.find(c => c.id === id)
    const pack = await loadClub(id).catch(() => null)
    if (!club || !pack) continue
    for (const f of eligibleArchive(pack.data)) {
      const m = readMatch(f.value.title, [club.name])
      if (!m) continue
      const other = m.us === 'home' ? m.away : m.home
      const target = id === clubId ? opponent : REGISTRY.find(c => c.id === clubId)!.name
      if (!sameClub(other, target)) continue
      // one meeting per day and pairing, wherever it was recorded
      const key = `${f.value.on ?? f.value.year ?? '?'}|${m.homeGoals}-${m.awayGoals}|${m.us === 'home' ? club.name : other}`
      const have = found.get(key)
      if (have) { if (!have.from.includes(club.name)) have.from.push(club.name); continue }
      found.set(key, {on: f.value.on, year: f.value.year, home: m.home, away: m.away, homeGoals: m.homeGoals, awayGoals: m.awayGoals, competition: f.value.hint, from: [club.name]})
    }
  }
  return [...found.values()].sort((a, b) => (b.on ?? `${b.year ?? 0}`).localeCompare(a.on ?? `${a.year ?? 0}`))
}
