import {athensDay, athensWall} from '@/lib/final-whistle/athens'
import {PER_PAGE} from './types'

/** Athens calendar day of an instant, as YYYY-MM-DD */
export function dayKeyOf(at: string | number | Date): string {
  const {year, month, day} = athensDay(at)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
export const isDayKey = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s
const parts = (day: string) => day.split('-').map(Number) as [number, number, number]

/** [00:00 today, 00:00 tomorrow) in Athens, and the delivery instant. A day may be 23 or 25 hours long. */
export function dayBounds(day: string, sendHour = 5): {start: number; end: number; sendAt: number} {
  const [y, m, d] = parts(day)
  return {start: athensWall(y, m, d, 0), end: athensWall(y, m, d + 1, 0), sendAt: athensWall(y, m, d, sendHour)}
}
export const nextDayKey = (day: string) => dayKeyOf(dayBounds(day).end + 3600_000)

/** does an event belong to this Athens day? A date-only event is judged by its written date, never by a made-up hour. */
export function belongsToDay(e: {kickoff: string; dateOnly: boolean}, day: string): boolean {
  if (e.dateOnly) return e.kickoff.slice(0, 10) === day
  const {start, end} = dayBounds(day), t = Date.parse(e.kickoff)
  return t >= start && t < end
}
/** is the event strictly after this Athens day? (used to prove a club has no match today) */
export function afterDay(e: {kickoff: string; dateOnly: boolean}, day: string): boolean {
  if (e.dateOnly) return e.kickoff.slice(0, 10) > day
  return Date.parse(e.kickoff) >= dayBounds(day).end
}
export const pagesFor = (fixtures: number) => Math.max(1, Math.ceil(fixtures / PER_PAGE))
