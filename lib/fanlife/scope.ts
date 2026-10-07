import type { CollectorShirt } from '@/lib/collector/types'

type Clubbed = CollectorShirt & { club?: string }

/**
 * The closet's "decade by decade" counts slots in the archive. In FAN LIFE the archive spans every
 * club, so the denominator is narrowed to the clubs this closet actually holds — "1/10 of the 2010s"
 * means one of that club's ten seasons, not of ten seasons pooled from strangers' clubs.
 */
export function archiveForCloset<T extends Clubbed>(archive: readonly T[], items: readonly { archiveSlug: string }[], shirts: Record<string, Clubbed>): T[] {
  const clubs = new Set(items.map((item) => shirts[item.archiveSlug]?.club).filter(Boolean))
  return clubs.size ? archive.filter((s) => clubs.has(s.club)) : []
}
