'use server'

import { crestLabel } from '@/lib/game/kitBuild'
import { kitByLegacyKey, kitRecord, specOf } from '@/lib/kit/kit-master'
import { COLOUR_NAME, PATTERNS, type KitSpec } from '@/lib/kit/spec'
import { signKitUnlock, verifyKitUnlock } from '@/lib/kit/unlock'
import { gateHref } from '@/lib/links'
import { recommend, type NextAction, type ResultContext } from '@/lib/results/context'

/**
 * שער 5 — the shirts a device proved it built, and nothing else.
 *
 * The /kits page ships every kit as a season and a variant; the spec — the sponsor, the maker, the
 * crest, the whole answer to that shirt's Gate 4 puzzle — comes from here, and only for a token
 * Gate 4 signed (`lib/kit/unlock.ts`). A collection written before tokens existed sends its keys
 * once as `legacy`; they are accepted and handed back tokens, which the device then keeps.
 * That is exactly as strong as the device store it came from — written down, not hidden.
 */

export type UnlockedKit = {
  key: string
  seasonLabel: string
  variant: KitSpec['variant']
  spec: KitSpec
  dna: boolean
  makerHe: string | null
  sponsorHe: string | null
  crestHe: string | null
  patternHe: string
  baseHe: string
  noteHe: string
  sourceTitle: string
  confidence: number
  look: 'photo' | 'vector'
}

const MAX = 60

function unlocked(kitId: string, dna: boolean): UnlockedKit | null {
  const kit = kitRecord(kitId)
  if (!kit) return null
  const spec = specOf(kit)
  return {
    key: kit.legacyKey,
    seasonLabel: kit.seasonLabel,
    variant: kit.variant,
    spec,
    dna,
    makerHe: spec.makerHe,
    sponsorHe: spec.sponsorHe,
    crestHe: spec.crestKey ? crestLabel(spec.crestKey) : null,
    patternHe: PATTERNS.find((row) => row.id === spec.pattern)?.he ?? spec.pattern,
    baseHe: COLOUR_NAME[spec.base],
    noteHe: kit.noteHe,
    sourceTitle: kit.sourceTitle,
    confidence: kit.confidence,
    look: kit.render.photo.available && kit.render.photo.complete ? 'photo' : 'vector',
  }
}

export async function kitDnaFor(
  tokens: string[],
  legacy: { key: string; dna: boolean }[] = [],
): Promise<{ rows: UnlockedKit[]; minted: Record<string, { token: string; dna: boolean }> }> {
  const rows = new Map<string, UnlockedKit>()
  for (const token of (Array.isArray(tokens) ? tokens : []).slice(0, MAX)) {
    const proof = verifyKitUnlock(token)
    if (!proof) continue
    const row = unlocked(proof.kitId, proof.dna)
    if (row && (!rows.get(row.key)?.dna || proof.dna)) rows.set(row.key, row)
  }
  const minted: Record<string, { token: string; dna: boolean }> = {}
  for (const entry of (Array.isArray(legacy) ? legacy : []).slice(0, MAX)) {
    if (typeof entry?.key !== 'string' || rows.has(entry.key)) continue
    const kit = kitByLegacyKey(entry.key)
    if (!kit) continue
    const dna = entry.dna === true
    const row = unlocked(kit.id, dna)
    if (!row) continue
    rows.set(row.key, row)
    minted[row.key] = { token: signKitUnlock(kit.id, dna), dna }
  }
  return { rows: [...rows.values()], minted }
}

/**
 * The wardrobe's Universal Exit (ONE RED WORLD §6, §14): the act that fills the closet is gate
 * 4, so it is the first door; the second is the archive card of a shirt already HOME — never of
 * a locked one, which would hand over the answer gate 4 asks for (rule 24). Hrefs from `lib/links`.
 */
const KIT_KEY = /^\d{4}(\/\d{2})?\|(home|away|third)$/

export async function nextAfterWardrobe(input: { built: string[] }): Promise<{ context: ResultContext; next: NextAction[] }> {
  const keys = Array.isArray(input?.built)
    ? input.built.filter((key): key is string => typeof key === 'string' && KIT_KEY.test(key)).slice(-6).reverse()
    : []
  const context: ResultContext = { gateId: 5, kitIds: keys, archiveEntityIds: keys }
  const build = gateHref(4)
  const doors: NextAction[] = build
    ? [{ kind: 'gate', href: build, label: 'voice.next.gate.4', subject: null, reason: 'wardrobe→build' }]
    : []
  for (const door of recommend(context, { exclude: doors.map((door) => door.href) })) {
    if (doors.length >= 2) break
    doors.push(door)
  }
  return { context, next: doors }
}
