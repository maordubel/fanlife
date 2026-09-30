import { ISRAEL_TIME_ZONE } from '@/lib/date/israel'
import type { MessageKey } from '@/lib/i18n'

import type { DailyKind, DailySlot } from './types'

/**
 * The daily's words — which KEY to say, never the sentence itself (rule 10). Client-safe.
 */

const HOUR = new Intl.DateTimeFormat('en-GB', { timeZone: ISRAEL_TIME_ZONE, hour: '2-digit', hourCycle: 'h23' })

/** 0–23, the hour it is in Tel Aviv at `now`. */
export function hourInIsrael(now: Date = new Date()): number {
  const value = Number(HOUR.formatToParts(now).find((part) => part.type === 'hour')?.value)
  return Number.isFinite(value) ? value % 24 : 12
}

export type GreetingKey = 'home.greet.morning' | 'home.greet.noon' | 'home.greet.evening' | 'home.greet.night'

/** בוקר 05–11 · צהריים 12–16 · ערב 17–21 · לילה 22–04 — by the hour in Israel. */
export function greetingKey(hour: number): GreetingKey {
  if (hour >= 5 && hour < 12) return 'home.greet.morning'
  if (hour >= 12 && hour < 17) return 'home.greet.noon'
  if (hour >= 17 && hour < 22) return 'home.greet.evening'
  return 'home.greet.night'
}

/** "היום חזרת לשלושה רגעים." — with the count the day actually holds (1–3). */
export function recapKey(done: number): MessageKey | null {
  if (done <= 0) return null
  if (done === 1) return 'daily.recap.1'
  if (done === 2) return 'daily.recap.2'
  return 'daily.recap.3'
}

/** "לפני שנה" / "לפני שנתיים" / "לפני 38 שנים" — Hebrew counts one and two in words. */
export function agoKey(years: number): { key: MessageKey; vars: Record<string, string> } {
  if (years === 1) return { key: 'daily.ago.1', vars: {} }
  if (years === 2) return { key: 'daily.ago.2', vars: {} }
  return { key: 'daily.ago.n', vars: { n: String(years) } }
}

export const SLOT_KEY: Readonly<Record<DailySlot, MessageKey>> = {
  remember: 'daily.slot.remember',
  choose: 'daily.slot.choose',
  discover: 'daily.slot.discover',
}

export const KIND_KEY: Readonly<Record<DailyKind, MessageKey>> = {
  blindCow: 'daily.kind.blindCow',
  trivia: 'daily.kind.trivia',
  memory: 'daily.kind.memory',
  timeline: 'daily.kind.timeline',
  goal: 'daily.kind.goal',
  lineup: 'daily.kind.lineup',
  debate: 'daily.kind.debate',
  xi: 'daily.kind.xi',
  kit: 'daily.kind.kit',
  archiveDay: 'daily.kind.archiveDay',
  archiveItem: 'daily.kind.archiveItem',
}

/** "שנות ה־80" for the twentieth century, "שנות ה־2010" after it. */
export function eraLabel(decade: number): string {
  return decade >= 2000 ? String(decade) : String(decade % 100).padStart(2, '0')
}
