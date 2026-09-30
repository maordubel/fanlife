/**
 * דף ההרכב — the half of gate 3 that both sides of the wire are allowed to hold.
 *
 * `lib/game/lineup.ts` is `server-only` because it reads the verified XI, and the XI is
 * the answer: rule 4's shape applied to a lineup quiz. The locker room, the LOCK, the
 * tunnel and the per-player reveal are SCREEN work, so the verdict's vocabulary lives
 * here and `lineup.ts` imports it rather than declaring a second copy (rule 59). Nothing
 * in this file can reach the archive.
 *
 * ## Four bands, not eleven slots (21.9.2026, players.md §2 Gate 3 V3)
 *
 * Every record says `formationStated: false`: the sources list the eleven in the
 * conventional order and state no formation. The board used to draw a 4-4-2 anyway —
 * eleven slots that imply a shape no source claims. It is now FOUR LINE BANDS — keeper,
 * defence, midfield, attack — and any number of men per band. A placement is stored as
 * `{playerId, line, order}`; any x/y on screen is display only. Grading was already by
 * line on the server and stays exactly that.
 */

/** The four bands, keeper first — the order the reveal walks them. */
export type Line = 'GK' | 'D' | 'M' | 'F'

export const LINES: readonly Line[] = ['GK', 'D', 'M', 'F']

export function isLine(value: unknown): value is Line {
  return typeof value === 'string' && (LINES as readonly string[]).includes(value)
}

export type SlotId = string

/**
 * GK · D · M · F — the band a record's slot id belongs to (`D3` → `D`). The records keep
 * their slot ids because that is how the source listed the eleven; the game reads only
 * the band.
 */
export function lineOf(slotId: SlotId): string {
  return slotId.replace(/\d+$/, '')
}

/** How many men walk out of the tunnel. */
export const XI_SIZE = 11

/** One man on the board: who, in which band, and his place in it. x/y are display only. */
export type Placement = { playerId: string; line: Line; order: number }

/** One name hanging in the locker room: an id and the name to print. Nothing else crosses. */
export type LockerName = { id: string; nameHe: string }

/**
 * לא פתח — three sourced ways of not starting, and the third makes no claim.
 *
 *  · `sub-on` — the source names him coming on that night (`subsOn` / `benchHe`);
 *  · `season-squad` — `squads.json` has him in that season's squad. Those rows are
 *    confidence 1, so the screen prints the source's name beside the label;
 *  · `other` — nothing beyond "he did not start".
 */
export type DecoyKind = 'sub-on' | 'season-squad' | 'other'

export const DECOY_KINDS: readonly DecoyKind[] = ['sub-on', 'season-squad', 'other']

export type Decoy = {
  kind: DecoyKind
  /** the minute he came on, where the source states it */
  minute: number | null
  /** who stated it — the lineup record for `sub-on`, the squad row for `season-squad` */
  sourceTitle: string | null
}

export type PlacementStatus = 'exact' | 'wrong_line' | 'not_in_xi'

/**
 * The four honest outcomes of a sheet (Gate 3 grading, 29.9.2026). A placed man is
 * `correct` (started, right band), `wrongBand` (started, wrong band) or `wrongPlayer`
 * (did not start); a starter nobody placed is `missed`. `starters` alone can never say
 * "perfect": eleven starters in the wrong bands is eleven found and none right.
 */
export type LineupOutcome = 'correct' | 'wrongBand' | 'wrongPlayer' | 'missed'

export function outcomeOf(status: PlacementStatus): Exclude<LineupOutcome, 'missed'> {
  return status === 'exact' ? 'correct' : status === 'wrong_line' ? 'wrongBand' : 'wrongPlayer'
}

export type PlacementVerdict = {
  playerId: string
  nameHe: string
  line: Line
  order: number
  status: PlacementStatus
  /** the band he really started in, revealed after grading; null if he did not start */
  belongsToLine: Line | null
  /** why a non-starter is on the sheet at all — only for `not_in_xi` */
  decoy: Decoy | null
}

export type SheetMan = { playerId: string; nameHe: string; line: Line }

export type LineupVerdict = {
  /** starters placed in the band they started in */
  exact: number
  /** the four outcomes, counted once on the server: correct + wrongBand + wrongPlayer = placed */
  counts: Record<LineupOutcome, number>
  /** every one of the eleven, each in his own band — the only "perfect" there is */
  perfect: boolean
  /** starters placed at all, whatever the band */
  starters: number
  total: number
  rows: PlacementVerdict[]
  /** the real XI, revealed only after a submission, keeper first */
  solution: SheetMan[]
  /** the starters left in the locker room — drawn as ghosts in their band */
  missing: SheetMan[]
  /**
   * Whether the source names who came on in this match. A report that printed "0 bench
   * traps" for a record with no bench on file would state something the archive never
   * said (rule 11).
   */
  benchKnown: boolean
  sourceTitle: string
  sourceUrl: string | null
}

/* ------------------------------------------------------------------ the coach */

/**
 * פתק מהמאמן — a hint that counts, and never names anybody. Computed on the server
 * against the verified XI, exactly like the grade; only the number crosses.
 */
export type CoachNoteKind = 'stillOut' | 'benchOn' | 'lineRight'

export type CoachNote = {
  kind: CoachNoteKind
  n: number
  /** the denominator, where the sentence has one */
  of: number
}

/** How many notes a round hands out. Two, as the prototype's coach has. */
export const COACH_NOTES = 2

/** How many names a player may stake a LOCK on. */
export const MAX_LOCKS = 3

/* ------------------------------------------------------------------ the board */

/**
 * The board after a man is put in a band: he leaves wherever he stood, joins the END of
 * the new band, and the orders of both bands are closed up. Refused (unchanged board)
 * when the band move would put a twelfth man on the pitch.
 */
export function placeOn(board: readonly Placement[], playerId: string, line: Line): Placement[] {
  const without = board.filter((row) => row.playerId !== playerId)
  if (without.length >= XI_SIZE) return [...board]
  const inLine = without.filter((row) => row.line === line).length
  return normalise([...without, { playerId, line, order: inLine }])
}

/** The board without him; the rest of his band closes up. */
export function takeOff(board: readonly Placement[], playerId: string): Placement[] {
  return normalise(board.filter((row) => row.playerId !== playerId))
}

/** Orders renumbered 0.. within each band, bands in pitch order. */
export function normalise(board: readonly Placement[]): Placement[] {
  const out: Placement[] = []
  for (const line of LINES) {
    board
      .filter((row) => row.line === line)
      .map((row, index) => ({ row, index }))
      .sort((a, b) => a.row.order - b.row.order || a.index - b.index)
      .forEach(({ row }, order) => out.push({ playerId: row.playerId, line, order }))
  }
  return out
}

/** How many men stand in each band — the zone counters. No denominator: no formation is stated. */
export function lineCounts(board: readonly Placement[]): Record<Line, number> {
  const counts: Record<Line, number> = { GK: 0, D: 0, M: 0, F: 0 }
  for (const row of board) counts[row.line] += 1
  return counts
}

/**
 * Where a band's men stand on the drawn pitch — DISPLAY ONLY, never stored or graded.
 * Percentages, the defensive end at the bottom.
 */
export const LINE_Y: Record<Line, number> = { F: 16, M: 41, D: 66, GK: 88 }

export function displaySpot(order: number, of: number, line: Line): { x: number; y: number } {
  const gap = of <= 1 ? 0 : Math.min(19, 72 / (of - 1))
  const start = 50 - (gap * (of - 1)) / 2
  return { x: Math.round(start + gap * order), y: LINE_Y[line] }
}

/* ------------------------------------------------------------------ the reveal */

export type RevealRow = {
  playerId: string
  nameHe: string
  line: Line
  order: number
  status: PlacementStatus
  decoy: Decoy | null
  locked: boolean
}

/**
 * The placed men, in the order the reveal walks them: keeper, defence, midfield, attack,
 * and inside a band in the order they stand. Empty bands contribute nothing; the starters
 * who were missed are drawn as ghosts in their band, not walked.
 */
export function buildReveal(verdict: LineupVerdict, locks: readonly string[]): RevealRow[] {
  const locked = new Set(locks)
  const rows: RevealRow[] = []
  for (const line of LINES) {
    verdict.rows
      .filter((row) => row.line === line)
      .sort((a, b) => a.order - b.order)
      .forEach((row) =>
        rows.push({
          playerId: row.playerId,
          nameHe: row.nameHe,
          line: row.line,
          order: row.order,
          status: row.status,
          decoy: row.decoy,
          locked: locked.has(row.playerId),
        }),
      )
  }
  return rows
}

export type RevealTally = {
  exact: number
  wrongLine: number
  /** placed men the source names coming on that night */
  bench: number
  /** locks that landed on a man who really started */
  locksRight: number
  /** locks spent, whatever they landed on */
  locksUsed: number
}

/**
 * The running score, up to and including `index`. −1 is before the first card; the last
 * index is the final figure. **Both ends are the same function** — "הצג הכול" is
 * `tallyUpTo(rows, rows.length - 1)`, so a skip can never disagree with the walk.
 */
export function tallyUpTo(rows: readonly RevealRow[], index: number): RevealTally {
  const seen = rows.slice(0, Math.max(0, Math.min(index + 1, rows.length)))
  return {
    exact: seen.filter((row) => row.status === 'exact').length,
    wrongLine: seen.filter((row) => row.status === 'wrong_line').length,
    bench: seen.filter((row) => row.decoy?.kind === 'sub-on').length,
    locksRight: seen.filter((row) => row.locked && row.status !== 'not_in_xi').length,
    locksUsed: seen.filter((row) => row.locked).length,
  }
}

/** The starters left hanging in the locker room — named only after the sheet is in. */
export function missingStarters(verdict: LineupVerdict): SheetMan[] {
  return verdict.missing
}

/**
 * Which ghosts are visible at step `index`: a band's missed starters appear once the walk
 * has passed that band's last placed man (or at once, for a band nobody placed in before
 * the walk reached it) — the line is complete when it is revealed, not before.
 */
export function ghostsUpTo(verdict: LineupVerdict, rows: readonly RevealRow[], index: number): SheetMan[] {
  if (index >= rows.length - 1) return verdict.missing
  const out: SheetMan[] = []
  for (const line of LINES) {
    const last = rows.map((row) => row.line).lastIndexOf(line)
    const firstAfter = rows.findIndex((row) => LINES.indexOf(row.line) > LINES.indexOf(line))
    const passed = last >= 0 ? index >= last : firstAfter >= 0 && index >= firstAfter
    if (passed) out.push(...verdict.missing.filter((man) => man.line === line))
  }
  return out
}

/* ------------------------------------------------------------------ the fast walk */

/**
 * הריצה המהירה — the optional accelerated walk. **Opt-in only** (a button), at most 250ms
 * a row (the brief's own ceiling on a beat that is not gameplay), cancellable by any tap.
 * The walk itself never runs on a timer by default (brief §14 — "waiting 850ms × 11").
 */
export const FAST_ROW_MS = 220

/* ------------------------------------------------------------------ the memory */

/**
 * A device that has chosen to skip once opens on the report from then on, with the walk
 * offered rather than imposed. One id in `lib/profile/store.ts`'s collections, never a
 * private `localStorage` key.
 */
export const REVEAL_SET = 'lineup.reveal'
export const REVEAL_SKIPPED = 'skipped'

export function opensAtSummary(collectedIds: readonly string[]): boolean {
  return collectedIds.includes(REVEAL_SKIPPED)
}
