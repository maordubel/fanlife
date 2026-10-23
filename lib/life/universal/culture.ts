import type {Chapter, LifeCulture, LifePack} from './types'

/**
 * The one culture line an archive night closes on. It comes from the pack's `culture`, which the
 * composer copies from the club's sourced world.json and nothing else; a universal chapter, a club
 * with no recorded culture, or a kind the record lacks gets nothing. Rotates by chapter so two
 * nights do not repeat the same line while others are unused. Deterministic, so server and client agree.
 */
export function cultureLineFor(pack: Pick<LifePack, 'culture' | 'chapters'>, chapter: Pick<Chapter, 'id' | 'anchor'>): LifeCulture | null {
  const lines = pack.culture ?? []
  if (!lines.length || !chapter.anchor) return null
  const nights = pack.chapters.filter(c => c.anchor)
  const at = nights.findIndex(c => c.id === chapter.id)
  return lines[(at < 0 ? 0 : at) % lines.length]!
}
