import { isPlayerId } from '@/lib/archive/player-identity'
import type { RosterFilter } from '@/lib/game/roster-search'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * שער 7 — אגף הסקרים.
 *
 * The gate Maor cut the crest game for. Eight questions, and every one of them is an
 * argument this terrace has already had a thousand times: the keeper, the centre back,
 * the number you would wear.
 *
 * **What this wing is honest about.** A poll is a count, and a count needs other people.
 * Until the wing has a live table behind it there is exactly one voter — you — and the
 * screen says so rather than drawing bars that mean nothing. So the thing the wing gives
 * back today is not a percentage, it is a BALLOT: your eight picks on one printed slip,
 * with your name on it, made to be shared. That is also what fills the count when the
 * table arrives, which is the right order to build it in. Inventing a baseline so the
 * bars look busy would be inventing data (rule 11), and it would be the kind of lie that
 * is very hard to take back once people have seen it.
 *
 * **What the questions can and cannot ask.** When this wing was built the archive held
 * 637 names and almost no positions, so every player question opened the WHOLE roster.
 * Since 17.9.2026 a sourced position exists for 633 of the 653 players (ויקיפועל's
 * `תפקיד`, read as a list — rule 74) and a foreign-slot record for 637, so the picker now
 * OPENS pre-filtered by the question (`QUESTION_FILTER`, 21.9.2026): the keepers for the
 * keeper, the foreign-slot men for the best foreigner. The filter is a chip the voter can
 * remove, and the men no source places are one tap away under "לא מתועד". What the wing
 * still refuses is a list of FEATURED names: six men chosen by the app above a counted
 * vote would be the app steering the count.
 *
 * **What is stored is an id, never a label** (players.md §3.3). A roster answer is the
 * Player Master's `p_…` id, a position is a code (`GK`…`ST`), a number is its digits.
 * A slip saved before holds display strings; `migrateBallot` moves them on read.
 */

export type PollKind = 'roster' | 'number' | 'position'

export type PollQuestion = {
  id: string
  kind: PollKind
  /** the question, in the voice of somebody asking it across a table */
  ask: MessageKey
  /** the Latin line on the slip's row */
  latin: string
  /** one line under the question on the stage — about the voter, never about a player */
  sub: MessageKey
}

/**
 * The order is deliberate. It opens on the one question everybody already has an answer
 * to and closes on the two that are about the voter rather than the club — a slip that
 * ends on "which number would you wear" ends on the voter's own shirt.
 */
export const BALLOT: readonly PollQuestion[] = [
  { id: 'favourite', kind: 'roster', ask: 'poll.favourite', latin: 'ALL-TIME FAVOURITE', sub: 'poll.run.sub.favourite' },
  { id: 'keeper', kind: 'roster', ask: 'poll.keeper', latin: 'GOALKEEPER', sub: 'poll.run.sub.keeper' },
  { id: 'centreback', kind: 'roster', ask: 'poll.centreback', latin: 'CENTRE BACK', sub: 'poll.run.sub.centreback' },
  { id: 'midfield', kind: 'roster', ask: 'poll.midfield', latin: 'MIDFIELD', sub: 'poll.run.sub.midfield' },
  { id: 'striker', kind: 'roster', ask: 'poll.striker', latin: 'STRIKER', sub: 'poll.run.sub.striker' },
  { id: 'foreign', kind: 'roster', ask: 'poll.foreign', latin: 'BEST FOREIGNER', sub: 'poll.run.sub.foreign' },
  { id: 'number', kind: 'number', ask: 'poll.number', latin: 'YOUR NUMBER', sub: 'poll.run.sub.number' },
  { id: 'position', kind: 'position', ask: 'poll.position', latin: 'YOUR POSITION', sub: 'poll.run.sub.position' },
] as const

/**
 * The shirt numbers on offer.
 *
 * 1 to 99, because that is the range a squad number lives in and cutting it at 11 would
 * decide for the voter that they are a starter. The picker is a grid, not a list.
 */
export const NUMBERS: readonly number[] = Array.from({ length: 99 }, (_, index) => index + 1)

/**
 * The positions, as the pitch already names them.
 *
 * These are the role labels the lineup formations use, lifted by hand rather than
 * imported: `lib/game/lineup.ts` is `server-only` and this file is read by the client.
 * Ten roles, one line of the pitch each, no invented specialisations.
 */
export const POSITIONS: readonly { id: string; he: MessageKey }[] = [
  { id: 'GK', he: 'pos.gk' },
  { id: 'CB', he: 'pos.cb' },
  { id: 'FB', he: 'pos.fb' },
  { id: 'DM', he: 'pos.dm' },
  { id: 'CM', he: 'pos.cm' },
  { id: 'AM', he: 'pos.am' },
  { id: 'W', he: 'pos.w' },
  { id: 'ST', he: 'pos.st' },
] as const

/**
 * questionId → the pick: a `p_…` id for a roster question, a code (`GK`…`ST`) for the
 * position, the digits for the number. A slip from before 21.9.2026 may still hold a
 * display name or a translated label until `migrateBallot` has read it.
 */
export type Ballot = Record<string, string>

/**
 * The filter each player question OPENS with — the question's own, removable like any
 * chip. The favourite opens on everybody: it asks about a man, not a position.
 */
export const QUESTION_FILTER: Readonly<Record<string, Partial<RosterFilter>>> = {
  favourite: {},
  keeper: { position: 'GK' },
  centreback: { position: 'DF' },
  midfield: { position: 'MF' },
  striker: { position: 'FW' },
  foreign: { origin: 'foreign' },
}

export const POSITION_CODES: readonly string[] = POSITIONS.map((position) => position.id)

export function isPositionCode(value: string): boolean {
  return POSITION_CODES.includes(value)
}

/** The Hebrew label of a position code — or null for anything that is not one. */
export function positionLabel(code: string | null | undefined): string | null {
  const found = POSITIONS.find((position) => position.id === code)
  return found ? t(found.he) : null
}

/** A label a slip saved before 21.9.2026 printed (`שוער`) → its code (`GK`). */
export function legacyPositionCode(label: string): string | null {
  const found = POSITIONS.find((position) => t(position.he) === label)
  return found?.id ?? null
}

/**
 * Where each position stands on the picker's pitch — DISPLAY only, physical percentages
 * with our goal at the bottom. The answer stored is the code.
 */
export const POSITION_SPOT: Readonly<Record<string, { x: number; y: number }>> = {
  GK: { x: 50, y: 90 },
  CB: { x: 50, y: 74 },
  FB: { x: 17, y: 68 },
  DM: { x: 50, y: 58 },
  CM: { x: 30, y: 46 },
  AM: { x: 50, y: 34 },
  W: { x: 82, y: 26 },
  ST: { x: 50, y: 13 },
}

/**
 * A saved slip, moved to ids and codes.
 *
 * `resolveName` answers a legacy display name with the id of the one person it names (the
 * Player Master's own resolution — exact, never fuzzy) or null. Anything it cannot move
 * stays as it was and is listed in `unresolved`: a pick the voter made is never dropped.
 */
export function migrateBallot(
  raw: Ballot,
  resolveName: (name: string) => string | null,
): { ballot: Ballot; changed: string[]; unresolved: string[] } {
  const ballot: Ballot = {}
  const changed: string[] = []
  const unresolved: string[] = []
  for (const question of BALLOT) {
    const value = raw[question.id]
    if (value === undefined || value === '') continue
    let next = value
    if (question.kind === 'roster' && !isPlayerId(value)) {
      const id = resolveName(value)
      if (id) next = id
      else unresolved.push(question.id)
    } else if (question.kind === 'position' && !isPositionCode(value)) {
      const code = legacyPositionCode(value)
      if (code) next = code
      else unresolved.push(question.id)
    }
    if (next !== value) changed.push(question.id)
    ballot[question.id] = next
  }
  return { ballot, changed, unresolved }
}

/** The legacy strings a slip holds — what the screen asks the server to resolve. */
export function legacyNames(raw: Ballot): string[] {
  return BALLOT.filter((question) => question.kind === 'roster')
    .map((question) => raw[question.id])
    .filter((value): value is string => typeof value === 'string' && value !== '' && !isPlayerId(value))
}

export function ballotFilled(ballot: Ballot): number {
  return BALLOT.filter((question) => (ballot[question.id] ?? '') !== '').length
}

export function ballotComplete(ballot: Ballot): boolean {
  return ballotFilled(ballot) === BALLOT.length
}

/**
 * A tally row. Nothing produces these yet on the client — see `store.ts` — but the
 * shape is fixed here so the screen that will draw the bars is written against it now
 * rather than being rewritten when the table lands.
 */
export type TallyRow = { pick: string; votes: number }
export type Tally = { total: number; rows: TallyRow[] }
