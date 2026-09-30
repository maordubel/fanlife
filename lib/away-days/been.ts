import type { JourneyData } from './journey'

/**
 * "הייתי שם" — the supporter's own journey (spec §30, 25.9.2026).
 *
 * One entry per visit the supporter ticked: `{ b, at }`. An un-tick is KEPT as `b: false`
 * with its own time rather than deleted, so a phone and a laptop that disagree merge to
 * the same answer — the newer `at` wins, and on a tie "been" wins. The account side
 * (`supabase/migrations/20260925092000_worker_away_been.sql`) applies exactly this merge,
 * so the order two devices push in cannot matter.
 *
 * The device is the source for a guest and the first write for everyone: storage may be
 * blocked (private window, previews), so every read and write is wrapped and the page
 * works — ticks just do not survive the tab.
 */

export const BEEN_KEY = 'worker.away.been.v1'

export type BeenEntry = { b: boolean; at: string }
export type BeenLedger = Record<string, BeenEntry>

const VISIT_ID = /^visit:[a-z0-9_:.-]{1,80}$/

/** Keep only well-formed entries — storage is user-editable. */
export function cleanBeen(raw: unknown): BeenLedger {
  const out: BeenLedger = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [id, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!VISIT_ID.test(id) || !entry || typeof entry !== 'object') continue
    const { b, at } = entry as { b?: unknown; at?: unknown }
    if (typeof b !== 'boolean' || typeof at !== 'string' || Number.isNaN(Date.parse(at))) continue
    out[id] = { b, at }
  }
  return out
}

export function readBeen(): BeenLedger {
  try {
    const raw = window.localStorage.getItem(BEEN_KEY)
    return raw ? cleanBeen(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

export function writeBeen(ledger: BeenLedger): void {
  try {
    window.localStorage.setItem(BEEN_KEY, JSON.stringify(ledger))
  } catch {
    // blocked storage: the tick lives for this tab only
  }
}

/** Newer wins; on a tie, "been" wins — the same rule as `worker_away_been_set`. */
export function pickEntry(a: BeenEntry | undefined, b: BeenEntry | undefined): BeenEntry | undefined {
  if (!a) return b
  if (!b) return a
  const ta = Date.parse(a.at)
  const tb = Date.parse(b.at)
  if (ta > tb) return a
  if (tb > ta) return b
  return { b: a.b || b.b, at: a.at }
}

export function mergeBeen(local: BeenLedger, remote: BeenLedger): BeenLedger {
  const out: BeenLedger = {}
  for (const id of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const entry = pickEntry(local[id], remote[id])
    if (entry) out[id] = entry
  }
  return out
}

export function isBeen(ledger: BeenLedger, visitId: string): boolean {
  return ledger[visitId]?.b === true
}

/** Flip one visit; returns the new ledger (the caller writes it). */
export function toggleBeen(ledger: BeenLedger, visitId: string, now: Date = new Date()): BeenLedger {
  return { ...ledger, [visitId]: { b: !isBeen(ledger, visitId), at: now.toISOString() } }
}

export type MyJourney = { countries: number; stadiums: number; matches: number; first: number | null; last: number | null }

/** "המסע שלי" — counted over PUBLIC visits only; a ticked id the journey no longer has is ignored. */
export function myJourney(data: JourneyData, ledger: BeenLedger): MyJourney {
  const countries = new Set<string>()
  const stadiums = new Set<string>()
  let matches = 0
  let first: number | null = null
  let last: number | null = null
  for (const visit of data.visits) {
    if (!isBeen(ledger, visit.id)) continue
    const venue = data.venues[visit.venueId]
    if (!venue) continue
    matches += 1
    stadiums.add(venue.id)
    countries.add(venue.countryCode)
    first = first === null ? visit.year : Math.min(first, visit.year)
    last = last === null ? visit.year : Math.max(last, visit.year)
  }
  return { countries: countries.size, stadiums: stadiums.size, matches, first, last }
}

/** The ids the account should hear about — every entry, ticks and kept un-ticks alike. */
export function beenRows(ledger: BeenLedger): { v: string; b: boolean; at: string }[] {
  return Object.entries(ledger).map(([v, e]) => ({ v, b: e.b, at: e.at }))
}

export function beenFromRows(rows: readonly { v?: unknown; b?: unknown; at?: unknown }[]): BeenLedger {
  const raw: Record<string, unknown> = {}
  for (const row of rows) if (typeof row.v === 'string') raw[row.v] = { b: row.b, at: row.at }
  return cleanBeen(raw)
}
