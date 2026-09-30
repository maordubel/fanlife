import 'server-only'

import { archiveShirts, type ArchiveShirt } from './archive'
import { kitRecords, specOf } from './kit-master'
import type { KitSpec } from './spec'

export type DnaRackItem = {
  key: string
  seasonLabel: string
  variant: 'home' | 'away' | 'third'
  spec: KitSpec
  photoSrc: string | null
  photoSourceTitle: string | null
}

/** Exact-season evidence only. A bare-year Vikipoel row is never silently promoted. */
export function exactArchivePhoto(seasonLabel: string, variant: string): ArchiveShirt | null {
  return archiveShirts().find(
    (shirt) => !shirt.seasonAmbiguous && shirt.seasonLabel === seasonLabel && shirt.variant === variant,
  ) ?? null
}

/**
 * The whole rack — every kit's spec and its exact photograph. SERVER-ONLY and never handed to a
 * client wholesale: it is the answer sheet to Gate 4. Gate 5 serves a row of it only for a shirt
 * whose unlock token verifies (`app/kits/actions.ts`).
 */
export function kitDnaRack(): DnaRackItem[] {
  return kitRecords().map((kit) => ({
    key: kit.legacyKey,
    seasonLabel: kit.seasonLabel,
    variant: kit.variant,
    spec: specOf(kit),
    photoSrc: kit.evidence.exactPhoto?.src ?? null,
    photoSourceTitle: kit.evidence.exactPhoto?.sourceTitle ?? null,
  }))
}
