import type { MessageKey } from '@/lib/i18n'

/**
 * היום בהפועל — the types (ONE RED WORLD §7, §42). Client-safe.
 *
 * One entry point, three things a day: אחד לזכור · אחד לבחור · אחד לגלות. The server
 * resolves them (`lib/daily/resolve.ts`) for one Israel date; the home screen draws them
 * and reads the device's own ledger to say which are done (`lib/daily/progress.ts`).
 * Nothing here is text a screen prints except `subjectHe`, which is DATA — a debate's
 * prompt, an archive title, a match's opponent and year — never composed copy.
 */

export const DAILY_SLOTS = ['remember', 'choose', 'discover'] as const
export type DailySlot = (typeof DAILY_SLOTS)[number]

export type DailyKind =
  | 'blindCow'
  | 'trivia'
  | 'memory'
  | 'timeline'
  | 'goal'
  | 'lineup'
  | 'debate'
  | 'xi'
  | 'kit'
  | 'archiveDay'
  | 'archiveItem'

/**
 * How the device knows an item was done — read from the ledger every gate already
 * reports into (`emit()` → `lib/profile/store.ts`), so no gate screen learns about the
 * daily at all.
 *
 *   `run`    a round filed today under exactly this id (`/blind-cow/daily`)
 *   `gate`   a round or a deed filed today anywhere under this plate (`/trivia/*`, `/xi`)
 *   `debate` gate 7's debate store holds a vote for this debate
 */
export type DoneRule =
  | { by: 'run'; id: string }
  | { by: 'gate'; gate: string }
  | { by: 'debate'; debateId: string }

export type DailyItem = {
  slot: DailySlot
  kind: DailyKind
  /** what the no-repeat rule is about — a debate id, an archive id, a trivia topic */
  key: string
  /** checked on the server (`lib/links`) — never built on the client */
  href: string
  /** a message key for the line under the kind, when the line is ours (an XI prompt) */
  promptKey: MessageKey | null
  /** vars for `promptKey` — data (a name), never copy */
  promptVars: Record<string, string> | null
  /** data: the debate prompt, the archive title, "צ'לסי 2001" */
  subjectHe: string | null
  /** for an "היום לפני" item: how many years ago the dated row was */
  yearsAgo: number | null
  done: DoneRule
}

export type DailyThemeReason = 'goal' | 'lineup' | 'final' | 'europe' | 'moment' | 'derby'

/** The anchor a themed day hangs on — one real, dated, confidence ≥ 2 row. */
export type DailyTheme = {
  matchId: string
  /** the row's own date, `YYYY-MM-DD` — its month-day IS the date's month-day */
  playedOn: string
  yearsAgo: number
  reason: DailyThemeReason
  /** the opponent and the year, as the archive names the match */
  subjectHe: string
  /** null where the archive holds an open conflict on the competition */
  competitionHe: string | null
  /** `24 במאי 1986` */
  dateHe: string
}

export type Daily = {
  /** the Israel date this daily is for, `YYYY-MM-DD` */
  date: string
  theme: DailyTheme | null
  /** always three, in slot order */
  items: [DailyItem, DailyItem, DailyItem]
}
