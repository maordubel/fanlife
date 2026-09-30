/**
 * Sport guard. The source wiki covers Hapoel Tel Aviv's football AND basketball
 * sections under one namespace, so every record must prove it is football before it
 * reaches a canonical table. Ambiguity is rejected, never assumed to be football.
 */

import { normalizeLoose } from './normalize'

export type SportVerdict =
  | { sport: 'football'; reason: string }
  | { sport: 'basketball'; reason: string }
  | { sport: 'unknown'; reason: string }

const FOOTBALL_MARKERS = [
  'כדורגל',
  'ליגת העל',
  'גביע המדינה בכדורגל',
  'גביע הטוטו',
  'אופא',
  'שוער',
  'חלוץ',
  'football',
] as const

const BASKETBALL_MARKERS = [
  'כדורסל',
  'ליגת ווינר',
  'יורוליג',
  'יורוקאפ',
  'סל',
  'basketball',
] as const

/**
 * Classify a page (or any record) by title plus optional body and categories.
 * A page carrying both markers is `unknown` — a disambiguation or a shared page,
 * and importing it as football would silently mix the two sections.
 */
export function classifySport(input: {
  title: string
  body?: string
  categories?: readonly string[]
}): SportVerdict {
  const haystack = normalizeLoose(
    [input.title, input.categories?.join(' ') ?? '', input.body ?? ''].join(' '),
  )

  const football = FOOTBALL_MARKERS.filter((marker) =>
    haystack.includes(normalizeLoose(marker)),
  )
  const basketball = BASKETBALL_MARKERS.filter((marker) =>
    haystack.includes(normalizeLoose(marker)),
  )

  if (football.length > 0 && basketball.length > 0) {
    return {
      sport: 'unknown',
      reason: `both sports present (football: ${football.join(', ')}; basketball: ${basketball.join(', ')})`,
    }
  }
  if (basketball.length > 0) {
    return { sport: 'basketball', reason: `basketball marker: ${basketball.join(', ')}` }
  }
  if (football.length > 0) {
    return { sport: 'football', reason: `football marker: ${football.join(', ')}` }
  }
  return { sport: 'unknown', reason: 'no sport marker found' }
}

/** True only for records proven to be football. Used as the import gate. */
export function isFootball(input: {
  title: string
  body?: string
  categories?: readonly string[]
}): boolean {
  return classifySport(input).sport === 'football'
}

/* ------------------------------------------------------------------ derby */

/**
 * A derby is our club against the one declared rival. For Hapoel Tel Aviv football
 * that is Maccabi Tel Aviv and nothing else — Bnei Yehuda and Hapoel Petah Tikva are
 * ordinary fixtures here. Derived from the club rows, never typed onto a match, so a
 * single flag governs every mode that filters on it.
 */
export function isDerbyFixture(
  clubs: ReadonlyArray<{ slug: string; isUs: boolean; isDerbyRival: boolean }>,
  match: { homeClubSlug: string; awayClubSlug: string },
): boolean {
  const home = clubs.find((club) => club.slug === match.homeClubSlug)
  const away = clubs.find((club) => club.slug === match.awayClubSlug)
  if (!home || !away) return false
  return (home.isUs && away.isDerbyRival) || (away.isUs && home.isDerbyRival)
}
