import 'server-only'

import { archive } from '../archive'

/**
 * מה שאסור לשאול — every unresolved row in `fact-conflicts.json`, read once.
 *
 * Rule 15: a fact recorded with no resolution is never asked. The old bank checked this
 * for one question (the championship count) and asked everything else — including the
 * score of the Zimbru tie, which RSSSF and ויקיפועל give differently, and who wore 2 in
 * 2016/17. The master checks every question built from a match or a shirt against the
 * whole list, and the ones it drops are written into the master's `excluded` map with
 * the reason, so a question that disappears says why.
 */
const open = archive.factConflicts.filter(
  (row) =>
    !row.resolution ||
    // A decision (delta 89) moves the Match Master to the winner, but the questions are
    // built from the raw `matches.json` rows, which keep the losing reading as provenance.
    // So a decision that CHANGES a value (date, home side, result, venue, stage, scorers)
    // keeps the raw row out of the bank; a naming decision (same club, two spellings) does not.
    (row.decisions ?? []).some((d) => d.field !== 'opponent'),
)

const CONTESTED = new Set(open.map((row) => `${row.entityTable}.${row.field}`))

export function isContested(entityTable: string, field: string): boolean {
  return CONTESTED.has(`${entityTable}.${field}`)
}

const matchKeys = new Map<string, string>()
for (const row of open) {
  if (row.entityTable !== 'match' || !row.entityKey) continue
  matchKeys.set(row.entityKey, row.field)
}

/** A match addressed any of the three ways the conflicts file addresses one. */
export function matchConflict(match: {
  seasonLabel: string
  competitionSlug: string
  stage: string | null
  playedOn: string | null
  homeClubSlug: string
  awayClubSlug: string
}): string | null {
  const keys = [
    `${match.playedOn ?? ''} ${match.homeClubSlug} — ${match.awayClubSlug}`,
    `${match.seasonLabel}|${match.competitionSlug}|${match.playedOn ?? ''}`,
    `${match.seasonLabel} ${match.competitionSlug} · ${match.stage ?? ''} · ${match.homeClubSlug} — ${match.awayClubSlug}`,
  ]
  for (const key of keys) {
    const field = matchKeys.get(key)
    if (field) return `conflict:match:${key}:${field}`
  }
  return null
}

const shirtKeys = new Set<string>()
for (const row of open) {
  if (row.entityTable !== 'shirt_number' || !row.entityKey) continue
  const [season, numbers] = row.entityKey.split(' · ')
  if (!season || !numbers) continue
  for (const number of numbers.match(/\d+/g) ?? []) shirtKeys.add(`${season}|${Number(number)}`)
}

/** "2016/17 · 2" and "2021/22 · 7 ו-18" — who wore the shirt is contested. */
export function shirtConflict(season: string, number: number): string | null {
  return shirtKeys.has(`${season}|${number}`) ? `conflict:shirt_number:${season} · ${number}` : null
}

/**
 * The 2010 and 2012 cup-final opponents. The goal records name Beitar (2010) and Hapoel
 * Be'er Sheva (2012); the masters pass found sources that disagree and records the
 * conflict in `fact-conflicts.json` on its own branch. Until that lands and is resolved,
 * the OPPONENT of those five goals is not asked — named here so the exclusion is visible
 * rather than inferred.
 */
export const CUP_FINAL_OPPONENT_CONFLICT = /^cupfinal-(2010|2012)-/

export function goalOpponentConflict(goalId: string): string | null {
  return CUP_FINAL_OPPONENT_CONFLICT.test(goalId) ? `conflict:goal:${goalId}:opponent` : null
}
