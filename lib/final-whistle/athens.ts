/** Owner-facing time is Europe/Athens (the owner lives there). Pure, no dependencies, DST-safe via Intl. */
const ZONE = 'Europe/Athens'
const fmt = new Intl.DateTimeFormat('en-GB', {timeZone: ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'})
function parts(ms: number) {
  const p: Record<string, number> = {}
  for (const x of fmt.formatToParts(new Date(ms))) if (x.type !== 'literal') p[x.type] = Number(x.value)
  return p as {year: number; month: number; day: number; hour: number; minute: number; second: number}
}
/** UTC offset of Athens at an instant, in ms */
const offsetAt = (ms: number) => { const p = parts(ms); return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000 }
/** the instant at which Athens' wall clock reads y-m-d h:00 */
export function athensWall(y: number, m: number, d: number, h: number): number {
  const guess = Date.UTC(y, m - 1, d, h)
  let t = guess - offsetAt(guess)
  t = guess - offsetAt(t) // second pass settles the day the clocks change
  return t
}
/** Athens calendar day of an instant, as y-m-d numbers */
export const athensDay = (iso: string | number | Date) => { const p = parts(new Date(iso).getTime()); return {year: p.year, month: p.month, day: p.day} }
/** 00:00 Athens on the day BEFORE the day of `iso` */
export function startOfPreviousAthensDay(iso: string | number | Date): number { const {year, month, day} = athensDay(iso); return athensWall(year, month, day - 1, 0) }
/** 06:00 Athens on the day after the match's Athens day — when its result is due (the owner's morning delivery) */
export function morningAfter(kickoffIso: string): string {
  const {year, month, day} = athensDay(kickoffIso)
  return new Date(athensWall(year, month, day + 1, 6)).toISOString()
}
