import { OUTFIT_PREFIX, PLAIN_OUTFIT, onSale, outfitFlag, ownedShirts, shirtById, type Shirt } from './shirts'
import type { LifeEvent } from './events'
import type { LifeState } from './types'

/**
 * טקס לפני משחק — Pre-Match Ritual (תוכנית השדרוג 27.9.2026, §4).
 *
 * לא מערכת חולצות חדשה. `shirts.ts` כבר יודע מה יש לו, מאיפה, ומתי נלבש (`own:worn:*`),
 * והארון (`WardrobeRail`) כבר מצייר אותו. מה שחסר היה **הרגע**: לפני משחק, לפתוח את
 * הארון ולבחור. עד היום המשחק בחר בשבילו את החדשה ביותר (`wearingAt`) — נכון, ושקוף.
 *
 * ── הכללים ────────────────────────────────────────────────────────────────────
 *
 *  · **אין באף** — חולצה לא נותנת מזל ולא אהבה. היא זהות וזיכרון, ושום אירוע כאן לא נוגע
 *    במד כלשהו. (`tests/life-match-ritual.test.ts` אוכף.)
 *  · **רק מה שבאמת שלו, ורק מה שכבר היה קיים** — ילד בוחר מבין מה שיש לו באותה שנה, בוגר
 *    מכל הארון עד אותו פרק. חולצה מעונה עתידית לא מוצגת.
 *  · **פעם אחת לאירוע** — הבחירה נשמרת כ-`own:outfit:<chapter>` (ששורד חצות, שנה ועשור),
 *    ו-`wearingAt` קורא אותה לפני שהוא מנחש. ריסטארט של פרק לא משכפל: הדגל הוא ערך, לא
 *    מונה, ו-`own:worn:<id>:<chapter>` נכתב פעם אחת בסוף היום.
 *  · **שמירה באמצע** — הבחירה עצמה היא אירוע אחד. מי שסגר את הלשונית לפני שבחר נשאל שוב,
 *    ולא מאבד כלום.
 *  · **בלי חולצות — בלי טקס.** ילד שאין לו חולצה של הפועל לא נשאל שאלה שאין לה תשובה.
 */

export type MatchRitualDef = {
  /** the event this wardrobe decision belongs to — one per chapter today */
  eventId: string
  /** may he go without a Hapoel shirt? Not on the day whose whole title is the shirt. */
  allowPlain: boolean
  /** the shirts that make sense for the day first — the rest of the wardrobe after them */
  prefer: Shirt['kind']
  /**
   * (delta 93) the day is a match he goes to only in SOME lives — 2010: only the one who
   * took the seat in Oli's car goes to Teddy. Absent: every life that reaches the chapter.
   */
  when?: (state: LifeState) => boolean
}

const F = (eventId: string, allowPlain = true): MatchRitualDef => ({ eventId, allowPlain, prefer: 'football' })
const B = (eventId: string, allowPlain = true): MatchRitualDef => ({ eventId, allowPlain, prefer: 'basketball' })

/**
 * The chapters whose day is a match he goes to. A chapter that HEARS a match (the radio,
 * a phone, another country) is not here: nobody chooses a shirt for a transistor.
 */
export const MATCH_RITUALS: Readonly<Record<string, MatchRitualDef>> = {
  // "בחולצה שלך" — the day is named after the shirt; going without it is not a choice
  'a5-first': F('1985-09-28', false),
  '1986': F('1986-05-24'),
  '1990': F('1990-promotion'),
  '1991': B('1991-03-11'),
  '1993-cup': F('1993-cup-final'),
  '1993-galil': B('1993-galil'),
  '1997-basket': B('1997-relegation'),
  '1999-basket': B('1999-basket'),
  '1999-cup': F('1999-cup-final'),
  '2000-title': F('2000-title'),
  '2000-double': F('2000-cup-final'),
  '2002-europe': F('2002-milan'),
  '2006-home': B('2006-derby'),
  '2009-up': B('2009-promotion'),
  '2010-cup': F('2010-cup'),
  // delta 93 — both were match days nobody dressed for
  '1998-laces': F('1998-laces'),
  '2010-teddy': { ...F('2010-teddy'), when: (state) => state.flags['d10:mode'] === 'venue' },
  '2024-terrace': F('2024-terrace'),
  '2025-eurocup': B('2025-eurocup'),
  '2026-finale': B('2026-botevgrad'),
}

export { OUTFIT_PREFIX, outfitFlag }
/** the value that means "not a Hapoel shirt today" */
export const PLAIN = PLAIN_OUTFIT

/** the shirts he could put on for this chapter's match: his, and already in existence */
export function ritualOptions(state: LifeState, chapter: string): Shirt[] {
  const def = MATCH_RITUALS[chapter]
  const existing = new Set(onSale(chapter).map((shirt) => shirt.id))
  const mine = ownedShirts(state).filter((shirt) => existing.has(shirt.id))
  if (!def) return mine
  return [...mine.filter((s) => s.kind === def.prefer), ...mine.filter((s) => s.kind !== def.prefer)]
}

/** the ritual this chapter asks for, or null — no match, or nothing in the wardrobe to choose */
export function ritualFor(state: LifeState, chapter: string): MatchRitualDef | null {
  const def = MATCH_RITUALS[chapter]
  if (!def) return null
  if (state.chapterDone) return null
  if (def.when && !def.when(state)) return null
  if (ritualOptions(state, chapter).length === 0) return null
  return def
}

export function outfitChosen(state: LifeState, chapter: string): boolean {
  const value = state.flags[outfitFlag(chapter)]
  return typeof value === 'string' && value.length > 0
}

/** what he chose for this chapter: a shirt, `'plain'`, or null (not asked, or not yet) */
export function chosenOutfit(state: LifeState, chapter: string): Shirt | typeof PLAIN | null {
  const value = state.flags[outfitFlag(chapter)]
  if (value === PLAIN) return PLAIN
  if (typeof value !== 'string') return null
  return shirtById(value)
}

/**
 * The one event a choice is. A shirt he does not own, or one from a later season, is
 * refused here — the UI never offers it, and a forged call cannot record it.
 */
export function wearEvents(state: LifeState, chapter: string, choice: string): LifeEvent[] {
  if (choice === PLAIN) {
    if (MATCH_RITUALS[chapter]?.allowPlain === false) return []
    return [{ t: 'flag.set', flag: outfitFlag(chapter), value: PLAIN }]
  }
  if (!ritualOptions(state, chapter).some((shirt) => shirt.id === choice)) return []
  return [{ t: 'flag.set', flag: outfitFlag(chapter), value: choice }]
}

/** the last chapter this shirt was chosen for, before this one — "לבשת אותה לאחרונה ב…" */
export function lastChosenBefore(state: LifeState, shirtId: string, chapterOrder: readonly string[], chapter: string): string | null {
  const now = chapterOrder.indexOf(chapter)
  let best: string | null = null
  let bestAt = -1
  for (const [flag, value] of Object.entries(state.flags)) {
    if (!flag.startsWith(OUTFIT_PREFIX) || value !== shirtId) continue
    const id = flag.slice(OUTFIT_PREFIX.length)
    const at = chapterOrder.indexOf(id)
    if (at >= 0 && (now < 0 || at < now) && at > bestAt) {
      best = id
      bestAt = at
    }
  }
  return best
}
