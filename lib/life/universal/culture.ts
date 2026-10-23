import type {Chapter, LifeCulture, LifePack} from './types'

const inYear = (c: LifeCulture, year: number) => (c.fromYear === undefined || year >= c.fromYear) && (c.untilYear === undefined || year <= c.untilYear)

/**
 * The one culture line an archive night closes on. It comes from the pack's `culture`, which the
 * composer copies from the club's sourced world.json and nothing else; a universal chapter, a club
 * with no recorded culture, or a kind the record lacks gets nothing. An era-bound line is shown only
 * on a night whose year sits inside its range. Rotates by night so two nights do not repeat the same
 * line while others are unused. Deterministic, so server and client agree.
 */
export function cultureLineFor(pack: Pick<LifePack, 'culture' | 'chapters'>, chapter: Pick<Chapter, 'id' | 'anchor'>): LifeCulture | null {
  const year = chapter.anchor?.year
  if (!chapter.anchor || typeof year !== 'number') return null
  const lines = (pack.culture ?? []).filter(c => c.kind !== 'home' && inYear(c, year))
  if (!lines.length) return null
  const nights = pack.chapters.filter(c => c.anchor)
  const at = nights.findIndex(c => c.id === chapter.id)
  return lines[(at < 0 ? 0 : at) % lines.length]!
}

/** The supporter's own neighbourhood, when the club's record names one; otherwise nothing. */
export const homeOf = (pack: Pick<LifePack, 'culture'>): LifeCulture | null => (pack.culture ?? []).find(c => c.kind === 'home') ?? null
