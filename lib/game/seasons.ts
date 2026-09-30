/**
 * Season labels as ranges.
 *
 * Sourced facts are stored as spells — "Umbro, 2006/07 → 2010/11", "Keter, 2010/11".
 * Anything that asks "what did we wear in 2010/11" has to intersect those spells, and
 * comparing `fromLabel` to `fromLabel` does not: it only ever matches a fact that
 * happens to start in the same season, which quietly hid every mid-spell season.
 *
 * Pure string/number work, no archive import, so it is usable from either side.
 */

/** `2010/11` → 2010 · `1999/00` → 1999. Null when the label is not a season. */
export function seasonStartYear(label: string | null | undefined): number | null {
  if (!label) return null
  const match = /^(\d{4})\/(\d{2})$/.exec(label.trim())
  if (!match) return null
  return Number(match[1])
}

/** 2010 → `2010/11` · 1999 → `1999/00` (two digits, zero padded, wraps the century). */
export function seasonLabelOf(startYear: number): string {
  const end = String((startYear + 1) % 100).padStart(2, '0')
  return `${startYear}/${end}`
}

/**
 * Does a spell cover a season? An open `to` (a current deal or supply) runs forward
 * indefinitely — it is open precisely because no source ends it.
 */
export function spellCoversSeason(
  spell: { fromLabel: string | null; toLabel?: string | null },
  seasonLabel: string,
): boolean {
  const season = seasonStartYear(seasonLabel)
  const from = seasonStartYear(spell.fromLabel)
  if (season === null || from === null) return false
  if (season < from) return false
  const to = seasonStartYear(spell.toLabel)
  return to === null ? true : season <= to
}

/**
 * The seasons a spell covers, oldest first. An open spell is capped at `openThrough`
 * rather than run to infinity; a spell longer than the cap is truncated, not guessed.
 */
export function seasonsInSpell(
  spell: { fromLabel: string | null; toLabel?: string | null },
  openThrough: number,
): string[] {
  const from = seasonStartYear(spell.fromLabel)
  if (from === null) return []
  const to = seasonStartYear(spell.toLabel) ?? openThrough
  if (to < from) return []
  const out: string[] = []
  for (let year = from; year <= Math.min(to, openThrough); year += 1) {
    out.push(seasonLabelOf(year))
  }
  return out
}

/**
 * The season a date falls in, on the Israeli calendar: a season is named for the
 * calendar year it kicks off in, and it kicks off in the summer.
 */
export function currentSeasonStartYear(now: Date = new Date()): number {
  // Months are zero-based; July (6) onward belongs to the season starting this year.
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
}
