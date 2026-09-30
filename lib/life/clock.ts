/**
 * השעון — the only clock, and the reason you cannot do everything.
 *
 * Time is the chapter's antagonist, so it is a first-class value rather than a number
 * a scene happens to increment. One real second is one game minute at `RATE`; every
 * action that should cost you something costs MINUTES, not a stat.
 *
 * The label is deliberately the whole HUD (brief §15): a day and a time, nothing else.
 * No relationship percentages, no passion bar. If Kobi is angry you see Kobi.
 */

/** game minutes per real second while the world is running */
export const RATE = 1

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] as const

export function dayName(weekday: number): string {
  return DAY_NAMES[((weekday % 7) + 7) % 7] ?? DAY_NAMES[6]
}

export function timeLabel(minute: number): string {
  const total = ((Math.round(minute) % 1440) + 1440) % 1440
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** "שבת • 12:35" — the entire permanent interface. */
export function clockLabel(weekday: number, minute: number): string {
  return `${dayName(weekday)} • ${timeLabel(minute)}`
}

export function minutesUntil(now: number, target: number): number {
  return target - now
}

export function hasPassed(now: number, target: number): boolean {
  return now >= target
}

/** `13:20` → 800. Used only by chapter data, so a schedule reads like a timetable. */
export function at(hour: number, minute = 0): number {
  return hour * 60 + minute
}
