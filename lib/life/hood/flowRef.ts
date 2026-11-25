/**
 * LIFE · the hood — the FLOW pictures, read at runtime and never required.
 *
 * The painted plates (kind `story`: first-walk, kitchen-radio …) and the district aerials (kind `aerial`) are published as
 * static files with a manifest at `/life/flow/manifest.json` by the Flow bake (`lib/life/rush-render/look/flowArt.ts`,
 * `flowPieces(manifest, {town, club, kind})` / `flowUrl(stem, size)`). This adapter speaks that contract without importing
 * it (the bake may not be on this branch yet): it fetches the manifest once, reads it tolerantly, and answers null for
 * anything it cannot read. No manifest, a bad one, a missing piece: the cards keep their drawn backgrounds and the map
 * its drawing. When flowArt.ts lands, `pick` and `urlOf` can call it instead; the callers do not change.
 */
export type FlowKind = 'story' | 'aerial' | (string & {})
export type FlowPiece = {stem: string; kind: FlowKind; town: string | null; club: string | null; sizes: number[]; /** the world rect it covers, in metres (aerials), when the manifest says */ world: {x: number; y: number; w: number; h: number} | null; files: Record<string, string>}
export type FlowManifest = {base: string; pieces: FlowPiece[]}

export const FLOW_MANIFEST = '/life/flow/manifest.json'
const BASE = '/life/flow'

const str = (v: unknown): string | null => typeof v === 'string' && v.trim() ? v.trim() : null
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** the manifest as published, read tolerantly: `pieces` (or `items` / `plates`) of objects with a stem (or id / name) and a kind */
export function parseFlow(raw: unknown): FlowManifest | null {
  if (!isObj(raw)) return null
  const list = [raw.pieces, raw.items, raw.plates].find(Array.isArray) as unknown[] | undefined
  if (!list) return null
  const pieces: FlowPiece[] = []
  for (const p of list) {
    if (!isObj(p)) continue
    const stem = str(p.stem) ?? str(p.id) ?? str(p.name), kind = str(p.kind)
    if (!stem || !kind || !/^[\w./-]+$/.test(stem)) continue
    const sizes = (Array.isArray(p.sizes) ? p.sizes : Array.isArray(p.widths) ? p.widths : []).filter((n): n is number => typeof n === 'number' && n > 0).sort((a, b) => a - b)
    const files: Record<string, string> = {}
    if (isObj(p.files)) for (const [k, v] of Object.entries(p.files)) { const f = str(v); if (f && /^\/?[\w./-]+$/.test(f)) files[k] = f }
    const w = isObj(p.world) ? p.world : isObj(p.bounds) ? p.bounds : null
    const world = w && [w.x, w.y, w.w, w.h].every(n => typeof n === 'number' && Number.isFinite(n)) ? {x: w.x as number, y: w.y as number, w: w.w as number, h: w.h as number} : null
    pieces.push({stem, kind, town: str(p.town), club: str(p.club), sizes, world, files})
  }
  return {base: str(raw.base) ?? BASE, pieces}
}

let once: Promise<FlowManifest | null> | null = null
/** the manifest, fetched once per page; null whenever it is not there or cannot be read */
export function loadFlow(fetcher: typeof fetch | undefined = typeof fetch === 'function' ? fetch : undefined): Promise<FlowManifest | null> {
  if (!fetcher) return Promise.resolve(null)
  once ??= fetcher(FLOW_MANIFEST, {cache: 'force-cache'}).then(r => (r.ok ? r.json() : null)).then(parseFlow).catch(() => null)
  return once
}

/**
 * The best piece of a kind for this club: one whose stem or name is the hint (a plate made for this moment), then one made
 * for the club, then for its town, then a universal one. Deterministic: the same moment gets the same picture.
 */
export function pick(m: FlowManifest | null, o: {kind: FlowKind; club?: string | null; town?: string | null; hint?: readonly string[]; salt?: number}): FlowPiece | null {
  if (!m) return null
  const all = m.pieces.filter(p => p.kind === o.kind && (!p.club || p.club === o.club) && (!p.town || !o.town || p.town === o.town))
  if (!all.length) return null
  for (const h of o.hint ?? []) { const hit = all.find(p => p.stem === h || p.stem.endsWith(`/${h}`) || p.stem.includes(h)); if (hit) return hit }
  const ranked = [...all].sort((a, b) => Number(!!b.club) - Number(!!a.club) || Number(!!b.town) - Number(!!a.town) || a.stem.localeCompare(b.stem))
  const best = ranked.filter(p => !!p.club === !!ranked[0]!.club && !!p.town === !!ranked[0]!.town)
  return best[Math.abs(o.salt ?? 0) % best.length]!
}

/** the file for a width: the smallest published size at least that wide (else the largest) */
export function urlOf(m: FlowManifest, p: FlowPiece, width: number): string {
  const size = p.sizes.find(s => s >= width) ?? p.sizes[p.sizes.length - 1]
  const named = size !== undefined ? p.files[String(size)] : undefined
  if (named) return named.startsWith('/') ? named : `${m.base}/${named}`
  const any = Object.values(p.files)[0]
  if (!size && any) return any.startsWith('/') ? any : `${m.base}/${any}`
  return `${m.base}/${p.stem}${size ? `-${size}` : ''}.webp`
}

/** the plate a chapter's card asks for first: named after its moment, then the chapter itself */
export const PLATE_HINT: Readonly<Record<string, readonly string[]>> = {
  'first-noise': ['kitchen-radio'], 'the-way-in': ['first-walk'], 'six-short': ['kiosk'], 'missing-square': ['album', 'school'], 'her-seat': ['terrace'],
  'lead-the-way': ['first-walk'], 'the-banner': ['banner'], 'no-ticket': ['fence', 'night'], 'the-box': ['box', 'bedroom'], 'monday-colours': ['school'], 'the-window': ['window'],
}
