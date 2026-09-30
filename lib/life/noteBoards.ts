import type { LifeEvent } from './events'
import type { LifeState } from './types'
import { meets, type Condition } from './world/types'

/**
 * הפתק — the one shared screen of Stage B's information chapters (implementation pass
 * 27.9.2026, §1 "EvidenceBoard", used by 1990, 1998 and 2000-title).
 *
 * Three chapters of this decade are ABOUT information arriving late and crooked: a
 * transistor at Bloomfield in 1990, a terrace full of accusations in 1998, and in 2000 a
 * pager, a radio and a phone that disagree for four minutes. Each one used to end the
 * same way — the boy heard things, and a box of dialogue told him what they were worth.
 * The brief asked for the opposite: *"לגרור ידיעה למקום הנכון; לא quiz"* — the boy sorts
 * what he has heard, in his own hand, and the sorting is what the chapter remembers.
 *
 * So a board is scraps of paper, each one a sentence WITH THE NAME OF WHOEVER SAID IT, and
 * two or three columns drawn in pencil. What is on the scraps is only what this life has
 * actually heard — every card carries a `Condition`, and a card whose source the boy
 * never went to is not on the table. The columns are about HOW he knows, never whether a
 * thing is true: "יבנה מובילה" can turn out right and still be a rumour when it is
 * written down, and that is the lesson 1990 plants (the journalist seed of the bible, B1).
 *
 * Some boards have an honest column for each card (`fits`) and grade the sorting; 1998's
 * does not, because the bible's rule for that day is *"no objective motive truth"* —
 * the board records where he put the accusation, and the Red Box note is worded from it.
 *
 * Pure: the registry is content (`content/noteBoards.ts`), the sheet is React
 * (`components/life/NoteBoardSheet.tsx`), and the only thing that crosses into the life is
 * the list of events `settleBoard` returns. A board is opened as
 * `{ e: 'minigame', id: 'board:<id>' }` — the same seam every played interaction uses, so
 * the world pauses, the sim can play it, and the density audit counts it.
 */

export const BOARD_PREFIX = 'board:'

export type NoteBoardColumn = {
  id: string
  labelHe: string
  /** one short line under the column's name, in pencil */
  subHe?: string
}

export type NoteBoardCard = {
  id: string
  /** the scrap, in the words it arrived in — a function when the words come from the save */
  textHe: string | ((state: LifeState) => string | null)
  /** who said it. Attribution is the point of the whole screen. */
  whoHe: string
  /** only what this life has actually heard is on the table */
  when?: Condition
  /** the honest column, when the board has one */
  fits?: string
}

export type ResolvedCard = { id: string; textHe: string; whoHe: string; fits: string | null }

export type BoardOutcome = {
  events: LifeEvent[]
  /** one sentence, printed on the sheet before it is put away */
  verdictHe: string
  /** a conversation the world opens when the sheet is closed */
  after?: string
}

export type NoteBoardDef = {
  id: string
  titleHe: string
  kickerHe: string
  introHe: string
  columns: readonly NoteBoardColumn[]
  cards: readonly NoteBoardCard[]
  /** a visible clock, in real seconds; `null` — no clock (the brief keeps pressure off unless earned) */
  seconds: number | null
  /** fewer cards than this and the board does not open — there is nothing to sort */
  minCards: number
  settle: (placed: Readonly<Record<string, string>>, cards: readonly ResolvedCard[], state: LifeState) => BoardOutcome
}

/** what the sheet is handed — plain data, no functions, no conditions */
export type NoteBoardView = {
  id: string
  titleHe: string
  kickerHe: string
  introHe: string
  columns: NoteBoardColumn[]
  cards: ResolvedCard[]
  seconds: number | null
  /** whether the board has an honest column per card, and so shows the pencil corrections */
  graded: boolean
}

export function resolveCards(def: NoteBoardDef, state: LifeState): ResolvedCard[] {
  const out: ResolvedCard[] = []
  for (const card of def.cards) {
    if (!meets(state, card.when)) continue
    const text = typeof card.textHe === 'function' ? card.textHe(state) : card.textHe
    if (!text) continue
    out.push({ id: card.id, textHe: text, whoHe: card.whoHe, fits: card.fits ?? null })
  }
  return out
}

export function boardView(def: NoteBoardDef, state: LifeState): NoteBoardView | null {
  const cards = resolveCards(def, state)
  if (cards.length < def.minCards) return null
  return {
    id: def.id,
    titleHe: def.titleHe,
    kickerHe: def.kickerHe,
    introHe: def.introHe,
    columns: def.columns.map((column) => ({ ...column })),
    cards,
    seconds: def.seconds,
    graded: cards.some((card) => card.fits !== null),
  }
}

/**
 * Only placements of cards that are on the table, into columns the board has — whatever
 * the sheet sends back. A tampered or stale placement is dropped, never trusted.
 */
export function cleanPlacements(def: NoteBoardDef, cards: readonly ResolvedCard[], placed: Readonly<Record<string, string>>): Record<string, string> {
  const columns = new Set(def.columns.map((column) => column.id))
  const onTable = new Set(cards.map((card) => card.id))
  const out: Record<string, string> = {}
  for (const [card, column] of Object.entries(placed)) {
    if (onTable.has(card) && columns.has(column)) out[card] = column
  }
  return out
}

/** how many placed cards sit in their honest column, and how many were placed at all */
export function gradeOf(cards: readonly ResolvedCard[], placed: Readonly<Record<string, string>>): { right: number; placed: number; graded: number } {
  let right = 0
  let count = 0
  let graded = 0
  for (const card of cards) {
    if (card.fits) graded += 1
    const column = placed[card.id]
    if (!column) continue
    count += 1
    if (card.fits && card.fits === column) right += 1
  }
  return { right, placed: count, graded }
}

/** the flag a board writes the moment it is put away, whatever was on it */
export const boardDoneFlag = (id: string) => `board:done:${id}`

export function settleWith(def: NoteBoardDef, placed: Readonly<Record<string, string>>, state: LifeState): BoardOutcome {
  const cards = resolveCards(def, state)
  const clean = cleanPlacements(def, cards, placed)
  const outcome = def.settle(clean, cards, state)
  return { ...outcome, events: [{ t: 'flag.raised', flag: boardDoneFlag(def.id) }, ...outcome.events] }
}
