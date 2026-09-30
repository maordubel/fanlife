import 'server-only'

import crestFile from '../../content/manual/crest-versions.json'

import { kitRecords, specOf } from './kit-master'
import type { KitSpec, KitVariant } from './spec'

/**
 * עונות החולצה — every kit the archive knows, as the engine draws it.
 *
 * Since 21.9.2026 this is a projection of the Kit Master (`lib/kit/kit-master.ts`), not a second
 * resolver. It used to read `kit-designs.json` and `kit-assembly.json` itself and resolve the
 * crest from the timeline with a fallback to the era BEFORE — which quietly printed the 1992 crest
 * on the 1999/00 shirt, an era the archive has no artwork for. The master resolves each field once,
 * with its source, and in gates 4 and 5 a shirt whose era has no printed crest wears none
 * (rule 25) and is not dealt.
 *
 * **One exception, and it is a debt, not a design.** The minis outside gates 4–5 (the XI, the
 * Rumble, the member card) read THIS projection, and the XI draws the 1999/00 shirt Maor asked
 * for by name (*"לשלום תקוה להצמיד חולצה 99-00"*). The archive has no artwork for the
 * 1997–2000 crest, so for those surfaces the old resolver's answer — the last era before it that
 * has artwork — is kept, exactly as it was before the Kit Master, and marked here. Two year-only
 * archive photographs of 1999 show a KETER crest rather than that one, which is why this is
 * written down as a sourcing request (art need 3 in the kits report) and not as a fact.
 */

export type SeasonKit = {
  seasonLabel: string
  variant: KitVariant
  noteHe: string
  spec: KitSpec
  sourceTitle: string
  sourceUrl: string | null
  confidence: number
}

type CrestRow = { fromYear: number; imageKey: string | null }
const CRESTS = (crestFile as unknown as { records: CrestRow[] }).records

/** the pre-Kit-Master answer for an era with no artwork: the last earlier era that has one */
function legacyCrest(seasonLabel: string): string | null {
  const year = Number(seasonLabel.slice(0, 4))
  return CRESTS.filter((row) => row.fromYear <= year && row.imageKey !== null).sort((a, b) => b.fromYear - a.fromYear)[0]?.imageKey ?? null
}

export function seasonKits(): SeasonKit[] {
  return kitRecords().map((kit) => ({
    seasonLabel: kit.seasonLabel,
    variant: kit.variant,
    noteHe: kit.noteHe,
    spec: { ...specOf(kit), crestKey: kit.fields.crest.value?.key ?? legacyCrest(kit.seasonLabel) },
    sourceTitle: kit.sourceTitle,
    sourceUrl: kit.sourceUrl,
    confidence: kit.confidence,
  }))
}

export function homeKits(): SeasonKit[] {
  return seasonKits()
    .filter((kit) => kit.variant === 'home')
    .sort((a, b) => b.seasonLabel.localeCompare(a.seasonLabel))
}

export function kitForSeason(seasonLabel: string): SeasonKit | null {
  return seasonKits().find((kit) => kit.seasonLabel === seasonLabel && kit.variant === 'home') ?? null
}
