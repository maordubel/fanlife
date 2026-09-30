/**
 * מי לבש את המספר — the reaction to "which number would you wear" (players.md §2, Gate 7).
 *
 * The reference answered a number with a crowd line. This answers it with the archive:
 * the men `shirt-numbers.json` and the current squad sheet put in that number, season by
 * season, each with the source that says so. Numbers are SEASON-BOUND here on purpose —
 * ויקיפועל's undated `מספר בהפועל` is one value over a whole career and is not a holding
 * of any season (rule 37), so it is not listed.
 *
 * The payload is built once on the server (`wore-server.ts`) with the sources sent once
 * and referenced by index; this file is the client-safe shape and its accessor.
 */

export type WornRow = {
  nameHe: string
  seasonLabel: string
  /** index into `NumberBoard.sources` */
  source: number
  /** the current squad sheet — working data, not history — says so on screen */
  current?: true
}

export type NumberBoard = {
  sources: Array<{ title: string; url: string | null }>
  byNumber: Record<string, WornRow[]>
}

/** Who wore #n, oldest season first — empty where the archive holds no season-bound record. */
export function wornBy(board: NumberBoard | null, n: number): WornRow[] {
  return board?.byNumber[String(n)] ?? []
}

/** How many rows the reaction prints before "and N more". */
export const WORN_SHOWN = 5
