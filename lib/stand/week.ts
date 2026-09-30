import { dayNumber, permutation } from '@/lib/daily/rotation'
import { GATES, isOpen } from '@/lib/gates'
import type { MessageKey } from '@/lib/i18n'
import { canonicalGate, wallGate } from '@/lib/profile/gate-id'
import type { Profile } from '@/lib/profile/store'

/**
 * "השבוע ביציע" — five stations from the gates that already exist (ONE RED WORLD §31, §48).
 * Client-safe, pure arithmetic on an Israel date.
 *
 * No new mechanic: a station is a gate, played the way that gate is always played, at any
 * moment of the week. The five are dealt from a fixed pool by the ISO week of the Israel
 * date — the same five for everybody, solo or in a stand — so "השבוע ביציע" works with no
 * second person in the system (§1.1). A station is closed when the device's own ledger
 * (`emit()` → `worker.profile.v1`) filed anything on that plate during the week.
 */

export const STATION_IDS = ['g2', 'g3', 'g4', 'g6', 'g8', 'g10', 'g13'] as const
export type StationId = (typeof STATION_IDS)[number]

export type Station = { id: StationId; gate: number; href: string; labelKey: MessageKey }

const LABEL: Readonly<Record<StationId, MessageKey>> = {
  g2: 'stand.station.g2',
  g3: 'stand.station.g3',
  g4: 'stand.station.g4',
  g6: 'stand.station.g6',
  g8: 'stand.station.g8',
  g10: 'stand.station.g10',
  g13: 'stand.station.g13',
}

export const WEEK_STATIONS = 5

/** Monday of the ISO week the Israel date `day` falls in, as `YYYY-MM-DD`. */
export function isoWeekStart(day: string): string {
  const n = dayNumber(day)
  // 1970-01-01 was a Thursday: ISO weekday (Mon=1) of day n is ((n + 3) mod 7) + 1
  const isoDow = (((n + 3) % 7) + 7) % 7 + 1
  const monday = n - (isoDow - 1)
  return new Date(monday * 86_400_000).toISOString().slice(0, 10)
}

/** `2026-W40` — the week's own name, for the rotation salt. */
export function isoWeekKey(day: string): string {
  const start = isoWeekStart(day)
  // the ISO year is the year of the week's Thursday
  const thursday = new Date((dayNumber(start) + 3) * 86_400_000)
  const year = thursday.getUTCFullYear()
  const jan4 = dayNumber(`${year}-01-04`)
  const jan4Dow = (((jan4 + 3) % 7) + 7) % 7 + 1
  const week1 = jan4 - (jan4Dow - 1)
  const week = Math.floor((dayNumber(start) - week1) / 7) + 1
  return `${year}-W${String(week).padStart(2, '0')}`
}

function stationOf(id: StationId): Station | null {
  const gateNo = Number(id.slice(1))
  const gate = GATES.find((g) => g.number === gateNo)
  if (!gate || !isOpen(gate)) return null
  return { id, gate: gateNo, href: gate.href.split('?')[0] as string, labelKey: LABEL[id] }
}

/** The week's five stations, in the order they are played on the card. */
export function weekProgram(day: string): Station[] {
  const pool = STATION_IDS.map(stationOf).filter((s): s is Station => s !== null)
  return permutation(pool, `stand-week|${isoWeekKey(day)}`).slice(0, WEEK_STATIONS)
}

/** Did the device file anything on this station's plate between Monday and `day`? */
export function stationDone(station: Station, weekStart: string, profile: Profile): boolean {
  const plate = wallGate(station.href)
  if (!plate) return false
  return Object.entries(profile.gates).some(
    ([id, stat]) => stat.lastOn !== '' && stat.lastOn >= weekStart && wallGate(canonicalGate(id)) === plate,
  )
}

export function weekDone(program: readonly Station[], weekStart: string, profile: Profile): StationId[] {
  return program.filter((station) => stationDone(station, weekStart, profile)).map((station) => station.id)
}
