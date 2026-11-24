/**
 * LIFE · the Flow pictures as the game reads them (rule life-flow-art). Pure: no three, no DOM.
 *
 * The bake (`scripts/life/flow/bake.py`, workflow `life-flow-bake`) turns what the Flow operator stored in
 * `library/life` into static files: `/life/flow/<stem>-<size>.webp` and `/life/flow/manifest.json`. This module is the
 * contract for every reader (the street renderer, the district map, the story cards): which pieces a club may wear and
 * where each file is. A piece reviewed `use:false` (writing, a crest, a flag, a face, or unusable) is never returned.
 */
import {CLUB_TOWN, type LifeTown, type LifeUse} from '@/lib/life/flowArtSpec'

export type FlowFile = {w: number; h: number; bytes: number; sha: string}
export type FlowFamilies = Partial<Record<'red' | 'yellow' | 'green' | 'blue', number>>
export type FlowPiece = {
  stem: string; kind: LifeUse; town?: LifeTown; club?: string; key?: string
  files: Record<string, FlowFile>; src?: {w: number; h: number}
  /** storeys in the picture (facades), from the prompt it was drawn for */
  floors?: number
  /** share of the picture's pixels in each colour family (rush-render/colour.ts families) and in yellow (rule 8) */
  families?: FlowFamilies; yellow?: number; avg?: string; glow?: number
  use?: boolean; note?: string
}
export type FlowManifest = {version: number; baked?: string; pieces: Record<string, FlowPiece>}
export type FlowQuery = {town?: LifeTown | string | null; club?: string | null; kind: LifeUse}

export const FLOW_BASE = '/life/flow'
export const flowUrl = (stem: string, size: number | string) => `${FLOW_BASE}/${stem}-${size}.webp`
export const FLOW_MANIFEST = `${FLOW_BASE}/manifest.json`

/** the town a club's street is built as: its own (CLUB_TOWN), else the skin's, else null */
export const flowTown = (club?: string | null, skinTown?: string | null): LifeTown | null =>
  (club && CLUB_TOWN[club]) || ((skinTown ?? null) as LifeTown | null)

const usable = (p: FlowPiece) => p.use !== false && !!p.files && Object.keys(p.files).length > 0

/**
 * The pieces a club's picture may wear, best first.
 *  facade  — the town's facades; the generic European set (`eur`) when the town has none
 *  stadium — the club's own ground plates, `-a` before `-b`
 *  skyline / aerial — the town's
 *  story   — every story plate (they are shared by every club)
 */
export function flowPieces(manifest: FlowManifest | null | undefined, q: FlowQuery): FlowPiece[] {
  const all = Object.values(manifest?.pieces ?? {}).filter(p => p.kind === q.kind && usable(p))
  const town = (q.town ?? flowTown(q.club)) as LifeTown | null
  const byStem = (a: FlowPiece, b: FlowPiece) => (a.key ?? a.stem).localeCompare(b.key ?? b.stem) || a.stem.localeCompare(b.stem)
  if (q.kind === 'facade') {
    const own = town ? all.filter(p => p.town === town) : []
    return (own.length ? own : all.filter(p => p.town === 'eur')).sort(byStem)
  }
  if (q.kind === 'stadium') return q.club ? all.filter(p => p.club === q.club).sort(byStem) : []
  if (q.kind === 'skyline' || q.kind === 'aerial') return town ? all.filter(p => p.town === town).sort(byStem) : []
  return all.sort(byStem)
}

/** the size to ask for: the largest of `want` the piece has (so a missing size never becomes a 404) */
export function flowSize(p: FlowPiece, want: readonly (number | string)[]): string | null {
  for (const w of want) if (p.files[String(w)]) return String(w)
  return null
}

/** a picture showing too much of a colour family the club may not show (its rivals', or yellow) is skipped */
export function flowFits(p: FlowPiece, banned: (family: 'red' | 'yellow' | 'green' | 'blue') => boolean, limit = 0.015): boolean {
  if ((p.yellow ?? 0) > 0.04) return false
  return !Object.entries(p.families ?? {}).some(([f, share]) => share > limit && banned(f as 'red' | 'yellow' | 'green' | 'blue'))
}

/** how tall (and, being square, how wide) a facade picture is in metres: a shop floor, ~3.1 m a storey, the roof edge */
export const facadeMetres = (p: FlowPiece) => 4.2 + Math.max(1, (p.floors ?? 4) - 1) * 3.1 + 0.9

let cached: Promise<FlowManifest | null> | null = null
/** the manifest, fetched once per page; null when it is missing or broken (the street keeps its own look) */
export function loadFlowManifest(fetcher: typeof fetch = fetch): Promise<FlowManifest | null> {
  return cached ??= fetcher(FLOW_MANIFEST).then(r => r.ok ? r.json() as Promise<FlowManifest> : null).then(m => m && m.pieces ? m : null).catch(() => null)
}
