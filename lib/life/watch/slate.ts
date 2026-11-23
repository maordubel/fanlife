/**
 * LIFE · the WATCH LAYER — the archive slate: what the card may print about the night, read from the archive row
 * it is handed and from nothing else. A field the row does not hold stays null and the card leaves its line out.
 */
import type {ArchiveRef} from '@/lib/life/universal/types'

export type WatchSlate = {
  /** ISO day, or a bare year when the archive knows only the year */
  date: string | null
  /** the competition, only when the caller's archive row names one (an `ArchiveRef` has no such field) */
  competition: string | null
  /** the scoreline as the row's own match facts give it, home side first */
  result: string | null
  /** the row's title, as recorded */
  title: string | null
  titleLocale: string | null
  /** who published the row */
  publisher: string | null
}

export function slateOf(ref: ArchiveRef | null, competition: string | null = null): WatchSlate | null {
  if (!ref) return null
  const m = ref.match
  return {
    date: ref.precision === 'day' && ref.on ? ref.on : String(ref.year),
    competition,
    result: m ? `${m.home} ${m.homeGoals}–${m.awayGoals} ${m.away}` : null,
    title: ref.title, titleLocale: ref.locale,
    publisher: ref.sources[0]?.publisher ?? null,
  }
}

/** "1986-05-24" → "24 May 1986"; a bare year stays a year; anything else is printed as it came */
export function slateDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) return date
  const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][Number(m[2]) - 1]
  return month ? `${Number(m[3])} ${month} ${m[1]}` : date
}
