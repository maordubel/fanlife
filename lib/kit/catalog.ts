import 'server-only'

import { crestMark } from './crestMarks'
import { kitRecords, specOf } from './kit-master'
import { COLOUR_NAME, PATTERNS, type KitSpec } from './spec'

/**
 * הקטלוג — every shirt the archive can draw, as the collection reads it.
 *
 * A read-model over the Kit Master (rule 1): it copies nothing and sorts the way a wardrobe is
 * read, newest first. Two projections, and the difference between them is the point:
 *
 *  · `kitCatalog()` — the full row, spec included. SERVER-ONLY: the spec is the answer to the
 *    shirt's Gate 4 puzzle.
 *  · `lockedCatalog()` — what the /kits page ships: a season, a variant, a decade and whether
 *    Gate 4 can deal it. A locked shirt shows nothing more (rule 24, brief §15).
 */

export type CatalogKit = {
  /** `1984/85|home` — the collection's key, and stable */
  key: string
  seasonLabel: string
  variant: 'home' | 'away' | 'third'
  spec: KitSpec
  decade: number
  makerHe: string | null
  sponsorHe: string | null
  patternHe: string
  baseHe: string
  crestHe: string | null
  noteHe: string
  sourceTitle: string
  sourceUrl: string | null
  confidence: number
  /** true when Gate 4 can deal it — the Kit Master's own verdict */
  playable: boolean
}

export type LockedKit = Pick<CatalogKit, 'key' | 'seasonLabel' | 'variant' | 'decade' | 'playable'>

export type Facet = 'all' | 'home' | 'away' | 'third'

export function kitCatalog(): CatalogKit[] {
  return kitRecords().map((kit) => {
    const spec = specOf(kit)
    return {
      key: kit.legacyKey,
      seasonLabel: kit.seasonLabel,
      variant: kit.variant,
      spec,
      decade: kit.decade,
      makerHe: spec.makerHe,
      sponsorHe: spec.sponsorHe,
      patternHe: PATTERNS.find((row) => row.id === spec.pattern)?.he ?? 'חלק',
      baseHe: COLOUR_NAME[spec.base],
      crestHe: crestMark(spec.crestKey)?.nameHe ?? null,
      noteHe: kit.noteHe,
      sourceTitle: kit.sourceTitle,
      sourceUrl: kit.sourceUrl,
      confidence: kit.confidence,
      playable: kit.gate4.playable,
    }
  })
}

export function lockedCatalog(): LockedKit[] {
  return kitRecords().map((kit) => ({
    key: kit.legacyKey,
    seasonLabel: kit.seasonLabel,
    variant: kit.variant,
    decade: kit.decade,
    playable: kit.gate4.playable,
  }))
}

export function facetCounts(kits: readonly Pick<CatalogKit, 'variant'>[]): Record<Facet, number> {
  return {
    all: kits.length,
    home: kits.filter((kit) => kit.variant === 'home').length,
    away: kits.filter((kit) => kit.variant === 'away').length,
    third: kits.filter((kit) => kit.variant === 'third').length,
  }
}
