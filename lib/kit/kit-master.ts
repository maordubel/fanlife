import 'server-only'

import masterFile from '../../content/generated/kit-master.json'

import type { KitField, KitMaster, KitMasterRecord } from './kit-master-build'
import { DEFAULT_SPEC, type KitSpec } from './spec'

/**
 * The Kit Master, read. Server-only, because a record is the ANSWER to a Gate 4 puzzle: the
 * sponsor, the maker, the crest. A client component receives a redacted projection of it (a
 * season and a variant for a locked shirt) or a spec for a shirt it proved it built.
 *
 * Built by `npm run kits:master` (`lib/kit/kit-master-build.ts`); `tests/kit-master.test.ts`
 * rebuilds it and fails when the committed file has drifted from content/manual.
 */

export type { KitField, KitMasterRecord } from './kit-master-build'

const master = masterFile as unknown as KitMaster

export function kitMaster(): KitMaster {
  return master
}

export function kitRecords(): readonly KitMasterRecord[] {
  return master.kits
}

export function kitRecord(id: string): KitMasterRecord | null {
  return master.kits.find((kit) => kit.id === id) ?? null
}

export function kitByLegacyKey(key: string): KitMasterRecord | null {
  return master.kits.find((kit) => kit.legacyKey === key) ?? null
}

export function playableKits(): KitMasterRecord[] {
  return master.kits.filter((kit) => kit.gate4.playable)
}

/** every value a field accepts — its own and the alternates another source gives */
export function accepted<T>(field: KitField<T>): T[] {
  return field.value === null ? [...field.alternates] : [field.value, ...field.alternates]
}

/** The record as the engine draws it. */
export function specOf(kit: KitMasterRecord): KitSpec {
  const f = kit.fields
  return {
    ...DEFAULT_SPEC,
    seasonLabel: kit.seasonLabel,
    variant: kit.variant,
    base: f.base.value ?? DEFAULT_SPEC.base,
    pattern: f.pattern.value ?? 'solid',
    patternInk: f.secondary.value ?? DEFAULT_SPEC.patternInk,
    collar: f.collar.value?.id ?? 'crew',
    collarInk: f.collar.value?.ink ?? DEFAULT_SPEC.collarInk,
    sleeves: f.sleeves.value?.id ?? 'plain',
    sleeveInk: f.sleeves.value?.ink ?? DEFAULT_SPEC.sleeveInk,
    makerHe: f.maker.value?.name ?? null,
    sponsorHe: f.sponsor.value?.name ?? null,
    crestKey: f.crest.value?.key ?? null,
    shorts: f.shorts.value ?? DEFAULT_SPEC.shorts,
    socks: f.socks.value ?? DEFAULT_SPEC.socks,
    number: null,
  }
}
