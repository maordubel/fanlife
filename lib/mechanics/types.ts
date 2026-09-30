/**
 * מכניקה, לא שער — the contract between a gate's game and THE WORKER LIFE (21.9.2026).
 *
 * Maor's sentence was *"Gate = Mechanic. LIFE = Context"*: the life opens the SAME game a
 * gate plays, from inside a room, for a person in it, and pays for it in its own wallet.
 * This file is that sentence as types, and nothing else — no archive, no React, no LIFE.
 *
 * Three rules shape it:
 *
 *  · **No gate numbers.** The gate plan moved more than once (rule 24) and a life that named
 *    a gate by its number would be wrong the next time it did. A mechanic is named for what
 *    it IS.
 *  · **"mode" is two optional parameters, not a layer.** A gate's server engine takes an
 *    optional `MechanicWindow` (only rows dated before the life's year, at the life's level),
 *    and a gate's board takes an optional `Embedded` (no share, no record, no "again" — just
 *    the result, handed back). Absent, the gate is exactly the gate it was. A wrapper that
 *    re-dealt or re-scored would be the duplicate engine Maor forbade.
 *  · **The life owns the context.** Money, time, energy, who reacts and how — none of it is
 *    here. `lib/life/activities.ts` owns it, because the engine owns the life (rule 39).
 */

/** What a room can open. Stable names, never a gate number. */
export type ActivityMechanic =
  | 'trivia'
  | 'lineupQuiz'
  | 'shirtDesigner'
  | 'memoryChallenge'
  | 'royalRumble'
  | 'goalReconstruction'
  | 'hateHistory'
  | 'poll'
  | 'allTimeXI'
  | 'archive'
  | 'myBag'
  /** the supporter's workbench — cut, paint, spray, place (spec 25.9.2026 §18) */
  | 'supporterCraft'

export const ACTIVITY_MECHANICS: readonly ActivityMechanic[] = [
  'trivia',
  'lineupQuiz',
  'shirtDesigner',
  'memoryChallenge',
  'royalRumble',
  'goalReconstruction',
  'hateHistory',
  'poll',
  'allTimeXI',
  'archive',
  'myBag',
  'supporterCraft',
]

/**
 * The same game at three ages. Not easy/hard: an eight-year-old is asked who played, a
 * man is asked who started and where. Derived from the life's age, never chosen.
 */
export type MechanicLevel = 'child' | 'teen' | 'adult'

export function levelForAge(age: number): MechanicLevel {
  if (age < 13) return 'child'
  if (age < 18) return 'teen'
  return 'adult'
}

/**
 * What a level changes, where it is a number and not a projection of one verdict. The server
 * deals with these and the board grades with the same window, so both read them from here.
 * A shirt: how many choices a step (three for a child, the gate's five for a man). The wall
 * of memories: how many pairs the old fan lays out.
 */
export const KIT_OPTIONS: Record<MechanicLevel, number> = { child: 3, teen: 4, adult: 5 }
export const MEMORY_PAIRS: Record<MechanicLevel, number> = { child: 4, teen: 5, adult: 6 }

/**
 * חלון בזמן — what a deal may draw from when the life asks.
 *
 * `before` is EXCLUSIVE and it is a year: a boy in 1993 is never dealt a 1998 shirt, a 2010
 * goal or a question about a season he has not lived to see (rules 45 and 88 — an object in
 * its year). `from` narrows the other end (the old fan at the bus stop remembers the years
 * before the boy was born). `pin` is the one archive row the life chose for this round, so
 * the deal and the grade on the server are the same round.
 */
export type MechanicWindow = {
  before: number
  from?: number
  level: MechanicLevel
  pin?: string | null
  /** for the one mechanic whose content is sport-split (the black wall) */
  sport?: 'football' | 'basketball'
}

/**
 * What came back — in the shape Maor wrote, normalised by `registry.ts` from the
 * mechanic's own verdict. Nothing here is money: the life decides what a score is worth.
 */
export type ActivityResult = {
  /** false when the player walked away before the end — nothing is paid, nothing is kept */
  completed: boolean
  /** 0..1 — the gate's own grade, projected; opinions report 1 for "answered" */
  score: number
  /** a contest that has a winner (the Royal Rumble): the wager pays only on true */
  won?: boolean
  /** the share of the pay range earned, where it is not the score itself (a win by three) */
  pay?: number
  /** the archive row the round was about — a row pays once per life */
  contentId?: string | null
  /** an opinion the life keeps (a poll pick, an XI) — never graded, never cast */
  answer?: string | null
  /**
   * מה נשאר ביד — a thing the player MADE, serialised small (a shirt's marks, a banner's
   * coverage), never a picture. The life decides whether it is kept, where it is seen
   * again and who reacts; the mechanic only hands it over (spec 25.9.2026 §23, §44).
   */
  output?: { id: string; data?: SerializableOutput }
}

/** JSON that survives a save: no functions, no dates, no class instances */
export type SerializableOutput =
  | string
  | number
  | boolean
  | null
  | readonly SerializableOutput[]
  | { readonly [key: string]: SerializableOutput }

/**
 * A gate board opened from inside the life. Present → the board plays one round, draws
 * nothing that belongs to the site (no RecordRun, no ShareRow, no PlayLink, no collection)
 * and hands its verdict back. Absent → the gate is unchanged.
 */
export type Embedded<R> = {
  window: MechanicWindow
  onResult: (result: R) => void
  /** the words on the way back into the room ("חזרה לקפה") */
  doneLabel: string
}

/**
 * מה קיים לפני איזו שנה — what the page tells the life about the archive, without a single
 * answer in it.
 *
 * `items` are the rows a pinned mechanic can be about (a lineup's match, a goal, a shirt),
 * each with the year it happened — an id and a year, which is what the site already puts in
 * a URL. `ready` is, for a pooled mechanic, the first `before` year at which a windowed deal
 * holds a full round: before it, the room offers the ordinary afternoon instead.
 */
export type CatalogItem = { id: string; year: number }

export type MechanicCatalog = {
  items: Partial<Record<ActivityMechanic, CatalogItem[]>>
  ready: Partial<Record<ActivityMechanic, number>>
}

export const EMPTY_CATALOG: MechanicCatalog = { items: {}, ready: {} }
