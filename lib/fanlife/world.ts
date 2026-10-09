import type { CollectorShirt } from '@/lib/collector/types'

/**
 * REST OF THE WORLD (9.10.2026). A shirt from a club that is not in the game has no archive row, and
 * nothing here pretends it does: the database holds `archive_slug = null` and a `world` object. The
 * screens, though, were written around `shirts[item.archiveSlug]`, so on the way in a world copy gets a
 * VIEW key — `world~<item id>` — and a shirt built from what the seller said. The view key never reaches
 * the database (`isWorldSlug` guards every place that would send a slug to a function that wants a real one).
 */
export const WORLD_PREFIX = 'world~'
export const isWorldSlug = (slug: string | null | undefined): boolean => Boolean(slug && slug.startsWith(WORLD_PREFIX))
export const worldItemId = (slug: string): string => slug.slice(WORLD_PREFIX.length)

export type WorldInfo = {
  clubKey: string | null
  club: string
  country: string | null
  season: string | null
  variant: string | null
  maker: string | null
  checked: boolean
}

export type WorldShirt = CollectorShirt & { club: string; clubName: string; kit: null; world: WorldInfo }

const VARIANT: Record<string, string> = { home: 'Home', away: 'Away', third: 'Third', goalkeeper: 'Goalkeeper', training: 'Training', special: 'Special', other: 'Other' }
export const worldVariantLabel = (v: string | null): string => (v ? VARIANT[v] ?? v : 'Pending identification')

const registry = new Map<string, WorldShirt>()

/** Build (and remember) the shirt a world copy stands for. */
export function worldShirt(id: string, w: WorldInfo): WorldShirt {
  const slug = WORLD_PREFIX + id
  const shirt: WorldShirt = {
    slug,
    src: '',
    seasonLabel: w.season ?? 'Season unknown',
    yearRaw: null,
    seasonAmbiguous: false,
    year: 0,
    decade: 0,
    variant: w.variant ?? 'other',
    variantHe: `${w.club} · ${worldVariantLabel(w.variant)}`,
    kitId: null,
    spoiler: null,
    club: w.clubKey ?? 'world',
    clubName: w.club,
    kit: null,
    world: w,
  }
  registry.set(slug, shirt)
  return shirt
}

/**
 * A screen that holds the shirt catalogue calls this once. World shirts that arrive later are written into
 * the same object, so `shirts[item.archiveSlug]` just works — no screen needs to know there are two kinds.
 */
export function adoptShirts<T extends Readonly<Record<string, unknown>>>(shirts: T): T {
  if (shirts && typeof shirts === 'object') {
    trackCatalogue(shirts)
    for (const [k, v] of registry) (shirts as Record<string, unknown>)[k] = v
  }
  return shirts
}

/** Walk an RPC answer; give every world copy its view key and put its shirt in every adopted catalogue. */
export function normaliseWorld<T>(data: T): T {
  const seen = new Set<unknown>()
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object' || seen.has(node)) return
    seen.add(node)
    if (Array.isArray(node)) {
      for (const n of node) walk(n)
      return
    }
    const o = node as Record<string, unknown>
    if (typeof o.id === 'string' && o.archiveSlug === null && o.world && typeof o.world === 'object') {
      const shirt = worldShirt(o.id, o.world as WorldInfo)
      o.archiveSlug = shirt.slug
      for (const cat of liveCatalogues) (cat as Record<string, unknown>)[shirt.slug] = shirt
    }
    for (const v of Object.values(o)) walk(v)
  }
  walk(data)
  return data
}

/** the catalogues on screen right now; a catalogue that is replaced is simply never written to again */
const liveCatalogues: Set<object> = new Set()
function trackCatalogue(shirts: object): void {
  if (liveCatalogues.size > 8) liveCatalogues.delete(liveCatalogues.values().next().value as object)
  liveCatalogues.add(shirts)
}

/** library key → club name, for every world club seen so far (the facet rail only has keys) */
export function worldClubs(): Map<string, string> {
  const m = new Map<string, string>()
  for (const s of registry.values()) if (s.world.clubKey) m.set(s.world.clubKey, s.clubName)
  return m
}
