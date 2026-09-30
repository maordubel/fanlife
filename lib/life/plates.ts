import { bloomfieldRebuilt } from './world/scenes'

/**
 * הלוח של פרק — the picture behind a chapter's title card and its stage finale.
 *
 * The card asked for `plate-<chapter id>`, and thirteen such plates were painted — 1986 to
 * the Double. Every chapter after them (and the six days of Stage A) asked for a file that
 * does not exist, so forty-odd chapter cards opened on black and the browser logged a 404
 * for each one (21.9.2026). The painted sets already in the folder cover the gap:
 * `plate-stageA` for the days before the Saturday, the old ground from its own stands for
 * 2000–2015, the hall of `plate-stageB` for the years Bloomfield was a building site, and
 * `plate-today` — the rebuilt ground at night — from the reopening on.
 */
export const PAINTED_PLATES = [
  '1986', '1990', '1991', '1993-cup', '1993-galil', '1995-sinai', '1996-army',
  '1997-basket', '1998-laces', '1999-basket', '1999-cup', '2000-title', '2000-double',
] as const

export function plateFor(chapter: string): string {
  if ((PAINTED_PLATES as readonly string[]).includes(chapter)) return `plate-${chapter}`
  if (chapter === 'prologue' || /^a\d/.test(chapter)) return 'plate-stageA'
  const year = Number(chapter.slice(0, 4))
  if (!Number.isFinite(year) || year < 2000) return 'plate-stageB'
  if (bloomfieldRebuilt(chapter)) return 'plate-today'
  // 2016–2018: the ground is shut, and the hall is where the club still happened
  if (year >= 2016) return 'plate-stageB'
  return 'bloomOldHigh'
}
