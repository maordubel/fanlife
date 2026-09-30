/**
 * היום בישראל — the one answer to "what day is it" for anything the supporter reads as a
 * CALENDAR day: the archive's "היום לפני", the Blind Cow daily, the days a streak counts.
 *
 * `new Date().toISOString().slice(0, 10)` is the UTC date, and Tel Aviv is two or three
 * hours ahead of it. From midnight until 02:00 (03:00 in summer) that expression names
 * YESTERDAY: the archive opened at 00:30 on 1 October printed the anniversaries of 30
 * September, and a game played at 01:00 was filed on the day before (ONE RED WORLD §21,
 * P0.2). `Intl` with `Asia/Jerusalem` carries the DST rules, so no offset is typed here.
 *
 * Pure timestamps (`editedAt`, `at`, an audit row) stay UTC ISO strings — an instant is
 * not a day and must not be rewritten into one.
 *
 * Client-safe: no `server-only`, no Node API.
 */

export const ISRAEL_TIME_ZONE = 'Asia/Jerusalem'

const DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: ISRAEL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** `YYYY-MM-DD` for the day it is in Israel at `now`. */
export function todayInIsrael(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD; parts are read explicitly so a runtime that formats
  // otherwise cannot hand back a different shape.
  const parts = DAY.formatToParts(now)
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${pick('year')}-${pick('month')}-${pick('day')}`
}

/** `MM-DD` for the day it is in Israel — what an anniversary is matched on. */
export function monthDayInIsrael(now: Date = new Date()): string {
  return todayInIsrael(now).slice(5, 10)
}

/**
 * Step a `YYYY-MM-DD` by whole days. Calendar arithmetic on the string, at UTC noon, so
 * neither the machine's zone nor a DST night can move it by one.
 */
export function addDays(isoDay: string, days: number): string {
  const [y, m, d] = isoDay.split('-').map(Number)
  const at = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12))
  at.setUTCDate(at.getUTCDate() + days)
  return at.toISOString().slice(0, 10)
}
