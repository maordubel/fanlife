'use server'

import { describe } from '@/lib/archive/graph'
import { ENTITY_TYPES, type ArchiveCard, type EntityDetail, type EntityType } from '@/lib/archive/graph-types'
import { archiveIdentity, boxDeal, detailOf, rabbitDetail, searchCards, seasonCards, type ArchiveIdentity } from '@/lib/archive/wing'

/**
 * שער 12 — the wing's server actions. Every answer is an `ArchiveCard` or an
 * `EntityDetail` projection built in `lib/archive/wing.ts`; the graph itself never
 * leaves the server. Inputs are clamped here, because an action is a public endpoint.
 */

const clampId = (id: unknown): string => (typeof id === 'string' ? id.slice(0, 160) : '')
const clampInt = (n: unknown, max = 0x7fffffff): number =>
  typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(max, Math.floor(n))) : 0

export async function openEntity(id: string): Promise<EntityDetail | null> {
  return detailOf(clampId(id))
}

export async function rabbit(fromId: string, seed: number, depth: number, trail: string[]): Promise<EntityDetail | null> {
  const safeTrail = Array.isArray(trail) ? trail.slice(-40).map(clampId) : []
  return rabbitDetail(clampId(fromId), clampInt(seed), clampInt(depth, 999), safeTrail)
}

export async function searchArchive(query: string, type: EntityType | null): Promise<ArchiveCard[]> {
  const q = typeof query === 'string' ? query.slice(0, 80) : ''
  const safeType = type && ENTITY_TYPES.includes(type) ? type : null
  return searchCards(q, safeType)
}

export async function digBox(seed: number, decade: number | null, round: number): Promise<ArchiveCard[]> {
  const d = typeof decade === 'number' && decade >= 1900 && decade <= 2100 ? Math.floor(decade / 10) * 10 : null
  return boxDeal(clampInt(seed), d, clampInt(round, 9999))
}

export async function seasonDeck(label: string): Promise<ArchiveCard[]> {
  return typeof label === 'string' && /^\d{4}(\/\d{2})?$/.test(label) ? seasonCards(label) : []
}

/** Mine: the device's saved ids, described — legacy spellings resolved, unknown ones dropped. */
export async function describeIds(ids: string[]): Promise<ArchiveCard[]> {
  return Array.isArray(ids) ? describe(ids.slice(0, 400).map(clampId)).cards : []
}

/** Gate 10: the device's archive sets, described — see `archiveIdentity`. */
export async function archiveIdentityOf(saved: string[], seen: string[], reactions: string[]): Promise<ArchiveIdentity> {
  const list = (ids: unknown) => (Array.isArray(ids) ? ids.slice(0, 2000).map(clampId) : [])
  return archiveIdentity({ saved: list(saved), seen: list(seen), reactions: list(reactions) })
}
