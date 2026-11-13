import 'server-only'
import {REGISTRY} from '@/lib/master/registry'
import {loadClub} from '@/lib/clubs/resolver'
import {eligibleArchive} from '@/lib/clubs/archive'
import {readMatch} from '@/lib/life/universal/match'
import {sameClub,namesOf,core} from './names'
import {CLUB_SPELLINGS} from '@/lib/clubs/spellings'
import {canonClub} from '@/lib/trivia/club-names'
import {enClub} from '@/lib/trivia/names'

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
  /** a penalty shoot-out, when the record states one; never folded into the score */
  shootout?: {home: number; away: number} | null
}

type Structured = {shootoutHome?: unknown; shootoutAway?: unknown; home?: unknown; away?: unknown; homeGoals?: unknown; awayGoals?: unknown; on?: unknown; competition?: unknown; us?: unknown}
/** A structured match row (home, away and both goal counts as numbers) — the shape a full archive carries. */
function structured(v: Structured) {
  if (typeof v.home !== 'string' || typeof v.away !== 'string' || !Number.isInteger(v.homeGoals) || !Number.isInteger(v.awayGoals)) return null
  return {shootout: Number.isInteger(v.shootoutHome) && Number.isInteger(v.shootoutAway) ? {home: v.shootoutHome as number, away: v.shootoutAway as number} : null, home: v.home, away: v.away, homeGoals: v.homeGoals as number, awayGoals: v.awayGoals as number, on: typeof v.on === 'string' ? v.on : null, competition: typeof v.competition === 'string' ? v.competition : '', us: v.us === 'home' || v.us === 'away' ? v.us : null}
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
      // keyed by day, score and side, never by a spelling: the archive line prints the rival in English, the match row in its own script
      const key = `${m.on ?? '?'}|${m.homeGoals}-${m.awayGoals}|${m.us}`
      if (!found.has(key)) found.set(key, {on: m.on, year: m.on ? Number(m.on.slice(0, 4)) : null, home: m.home, away: m.away, homeGoals: m.homeGoals, awayGoals: m.awayGoals, competition: m.competition, from: [club.name], us: m.us as 'home' | 'away', shootout: m.shootout})
    }
    for (const f of eligibleArchive(pack.data)) {
      const m = readMatch(f.value.title, [club.name])
      if (!m) continue
      const other = m.us === 'home' ? m.away : m.home
      const target = id === clubId ? opponent : REGISTRY.find(c => c.id === clubId)!.name
      if (id === clubId ? !isRival(other) : !sameClub(other, target)) continue
      // one meeting per day and pairing, wherever it was recorded
      const key = `${f.value.on ?? f.value.year ?? '?'}|${m.homeGoals}-${m.awayGoals}|${id === clubId ? m.us : (m.us === 'home' ? 'away' : 'home')}`
      const have = found.get(key)
      if (have) { if (!have.from.includes(club.name)) have.from.push(club.name); continue }
      found.set(key, {on: f.value.on, year: f.value.year, home: m.home, away: m.away, homeGoals: m.homeGoals, awayGoals: m.awayGoals, competition: f.value.hint, from: [club.name], us: id === clubId ? m.us : (m.us === 'home' ? 'away' : 'home')})
    }
  }
  return [...found.values()].sort((a, b) => (b.on ?? `${b.year ?? 0}`).localeCompare(a.on ?? `${a.year ?? 0}`))
}

// ------------------------------------------------------------------ the head-to-head ledger (12.11.2026)
/**
 * Every meeting a club's approved archive records, against every opponent — one row per night — and the balance against each:
 * played, won, drawn, lost, goals, first and last meeting, the biggest win and the heaviest defeat, the last five, per competition.
 * Read for the studio (`npm run h2h:build` → content/generated/head-to-head.json) and for the match card beside "next match".
 *
 * A row is read from the record's own fields (home, away, both goal counts), else from its printed scoreline ("A 2-1 B") with the
 * club named on one side by its own name or a spelling it is known by (lib/clubs/spellings.ts). The opponent is named in English
 * where the trivia name table knows him (canonClub ∘ enClub), and grouped by his core name (legal forms dropped, rule 7) — never
 * by similarity. A row we cannot read as a scoreline with our side stated is not a meeting.
 */

export type Ledger = Tally & {
  opponent: string
  first: Meeting | null
  last: Meeting | null
  biggestWin: Meeting | null
  heaviestDefeat: Meeting | null
  lastFive: ('W' | 'D' | 'L')[]
  byCompetition: Record<string, Tally>
}
const english = (n: string) => canonClub(enClub(n) ?? n) || n
const margin = (m: Meeting) => (m.us === 'home' ? m.homeGoals - m.awayGoals : m.awayGoals - m.homeGoals)
const forOf = (m: Meeting) => (m.us === 'home' ? m.homeGoals : m.awayGoals)
const letter = (m: Meeting): 'W' | 'D' | 'L' => (margin(m) > 0 ? 'W' : margin(m) < 0 ? 'L' : 'D')
const when = (m: Meeting) => m.on ?? `${m.year ?? 0}`

const MEMO = new Map<string, (Meeting & {opponent: string})[]>()
/** every meeting of one club, with the opponent's English name (newest first) — read once per club version per instance */
export async function clubMeetings(clubId: string): Promise<(Meeting & {opponent: string})[]> {
  const club = REGISTRY.find(c => c.id === clubId)
  const pack = await loadClub(clubId).catch(() => null)
  if (!club || !pack) return []
  const memo = `${clubId}:${pack.data.version}`, hit = MEMO.get(memo)
  if (hit) return hit
  const rows = readMeetings(clubId, club.name, pack.data)
  if (MEMO.size >= 24) MEMO.delete(MEMO.keys().next().value as string)
  MEMO.set(memo, rows)
  return rows
}
function readMeetings(clubId: string, clubName: string, data: Awaited<ReturnType<typeof loadClub>> extends infer R ? R extends {data: infer D} ? D : never : never): (Meeting & {opponent: string})[] {
  const club = {name: clubName}, pack = {data}
  const ours = [club.name, ...(CLUB_SPELLINGS[clubId] ?? []), ...namesOf(club.name)]
  const found = new Map<string, Meeting & {opponent: string}>()
  const add = (m: Meeting) => {
    if (!m.us) return
    const other = m.us === 'home' ? m.away : m.home
    // one night is one meeting: the day and the two numbers, whatever spelling recorded it
    const key = `${m.on ?? m.year ?? '?'}|${[m.homeGoals, m.awayGoals].sort((a, b) => a - b).join('-')}`
    if (!found.has(key)) found.set(key, {...m, opponent: english(other)})
  }
  for (const f of pack.data.matches || []) {
    if (f.status !== 'approved') continue
    const v = f.value as unknown as Structured & {name?: unknown; score?: unknown}
    const s = structured(v)
    if (s && s.us) { add({...s, year: s.on ? Number(s.on.slice(0, 4)) : null, from: [club.name], us: s.us as 'home' | 'away'}); continue }
    const name = typeof v.name === 'string' ? v.name : ''
    const r = name ? readMatch(name, ours) : null
    if (!r) continue
    const on = typeof v.on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.on) ? v.on : null
    add({on, year: on ? Number(on.slice(0, 4)) : null, home: r.home, away: r.away, homeGoals: r.homeGoals, awayGoals: r.awayGoals, competition: typeof v.competition === 'string' ? v.competition : '', from: [club.name], us: r.us, shootout: null})
  }
  for (const f of eligibleArchive(pack.data)) {
    const r = readMatch(f.value.title, ours)
    if (!r) continue
    add({on: f.value.on, year: f.value.year, home: r.home, away: r.away, homeGoals: r.homeGoals, awayGoals: r.awayGoals, competition: f.value.hint, from: [club.name], us: r.us})
  }
  return [...found.values()].sort((a, b) => when(b).localeCompare(when(a)))
}

/** the balance against every opponent, most-met first */
export function ledgerOf(ms: (Meeting & {opponent: string})[]): Ledger[] {
  const by = new Map<string, (Meeting & {opponent: string})[]>()
  for (const m of ms) { const k = core(m.opponent) || m.opponent; (by.get(k) ?? by.set(k, []).get(k)!).push(m) }
  const out: Ledger[] = []
  for (const rows of by.values()) {
    const sorted = [...rows].sort((a, b) => when(a).localeCompare(when(b)))
    const byCompetition: Record<string, Tally> = {}
    for (const m of rows) { const c = m.competition?.trim() || '—'; byCompetition[c] = tallyOf([...(rows.filter(x => (x.competition?.trim() || '—') === c))]) }
    const wins = rows.filter(m => margin(m) > 0), losses = rows.filter(m => margin(m) < 0)
    const pick = (a: Meeting[], cmp: (x: Meeting, y: Meeting) => number) => (a.length ? [...a].sort(cmp)[0]! : null)
    out.push({
      opponent: sorted[sorted.length - 1]!.opponent, ...tallyOf(rows),
      first: sorted[0] ?? null, last: sorted[sorted.length - 1] ?? null,
      biggestWin: pick(wins, (x, y) => margin(y) - margin(x) || forOf(y) - forOf(x)),
      heaviestDefeat: pick(losses, (x, y) => margin(x) - margin(y)),
      lastFive: sorted.slice(-5).reverse().map(letter), byCompetition,
    })
  }
  return out.sort((a, b) => b.played - a.played || a.opponent.localeCompare(b.opponent))
}

/** the balance against one opponent (any spelling the name table knows), or null when the archive records no meeting */
export async function headToHead(clubId: string, opponent: string): Promise<Ledger | null> {
  const k = core(english(opponent))
  return ledgerOf((await clubMeetings(clubId)).filter(m => core(m.opponent) === k))[0] ?? null
}
