/**
 * מה אומרים ביציע — the bridge from a canonical event to a sentence a man can say.
 *
 * A mission about information cannot get its information from string literals. Until
 * 7.9.2026 the 2.5.1998 script carried lines like `"שוויון שם! שוויון!"` written straight
 * into the step list, and Maor's audit named exactly that: *"the mission must consume the
 * actual parallel sequence rather than generic strings."* The strings were not wrong —
 * they are what people shouted — but nothing in the code connected them to the day.
 *
 * Now every parallel line in the script comes through here, and here has one job: take an
 * event id, refuse it if the archive holds nothing sayable about it, and give back the
 * impression a fallible man on a terrace would have. Two rules, both enforced by
 * `tests/life-history.test.ts`:
 *
 *   · An impression is never a fact. `lineHe` carries no scorer, no minute and no
 *     scoreline; those live in `personHe`, `minute` and `scoreAfter` and reach the player
 *     only from an event marked `speakable`. A supporter saying "שם השוו" is a supporter
 *     saying something. A game printing "1–1" is an archive making a claim, and the
 *     archive does not hold that one.
 *   · A line that names no event does not exist. `terrace()` throws at module load if the
 *     id is not in the day, so a typo is a build failure and not a silent piece of
 *     invented history.
 *
 * `terraceMix` is the other half of it: two channels with different lag, standing three
 * metres apart, carrying two different truths about the same ground at the same second.
 * That is not a writing device, it is what a latency table does when you let it — and it
 * is why the 1998 half-time line is generated rather than written.
 */
import { DAY_1998, HISTORY_DAYS } from './days'
import type { HistoricalMatchEvent } from './types'

const INDEX: Map<string, HistoricalMatchEvent> = new Map()
for (const day of Object.values(HISTORY_DAYS)) {
  for (const venue of day.venues) for (const event of venue.events) INDEX.set(event.id, event)
}

export const eventById = (id: string): HistoricalMatchEvent | null => INDEX.get(id) ?? null

/** the impression, and nothing but — throws at module load on an id the archive does not hold */
export function terrace(eventId: string): string {
  const event = INDEX.get(eventId)
  if (!event) throw new Error(`terrace(): no canonical event "${eventId}"`)
  if (!event.lineHe) throw new Error(`terrace(): "${eventId}" holds nothing a person could say about it`)
  return event.lineHe
}

/**
 * שני רדיו, שתי אמיתות — the same ground, two lags, three metres apart.
 * "…and then somebody else: …and then: who said?"
 */
export function terraceMix(newerId: string, olderId: string): string {
  return `מאחור, טרנזיסטור: "${terrace(newerId)}" ואז מישהו אחר: "${terrace(olderId)}" ואז: "מי אמר?"`
}

/**
 * הקווים של 2.5.1998 — every parallel line the shoelaces script speaks, derived here so
 * the script holds ids and the archive holds words. Computed once, at module load, which
 * is also when a broken id stops the build.
 */
export const LACES_LINES = {
  /** half-time at Bloomfield: their ground is a quarter of an hour behind ours and only one thing has happened there */
  half: terraceMix('1998-parallel-goal-1', '1998-parallel-standing'),
  /** the pager, and the stand going up in the air about a match nobody can see */
  late: `פייג׳ר אצל מישהו. "${terrace('1998-parallel-goal-4')}" היציע עולה באוויר על משחק שלא רואים.`,
  /** our whistle — verified, speakable, and not the end of anything */
  oursOver: terrace('1998-bloomfield-full'),
} as const

/** the ending policy of the day, in one sentence, for the status document and the debug panel */
export const LACES_ENDING_HE =
  'השריקה שלנו איננה סיום: המשחק המקביל התחיל מאוחר יותר, חייב להסתיים, ופוגי חייב לשמוע מה קרה שם — שלושת התנאים יושבים ב-PRESET_1998.ending.'

export const LACES_DAY = DAY_1998
