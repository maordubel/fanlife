import 'server-only'
import edition from '@/content/generated/album-edition-1.json'
import ledger from '@/content/generated/album-stickers.json'
import type {ClubData} from '@/lib/clubs/contract'
import {crestFor} from '@/lib/clubs/crest'
import {kitViews} from '@/lib/clubs/gate-content'
import {kitTypeKey} from '@/lib/clubs/kit-model'
import {kitArt} from '@/lib/clubs/kit-sources'
import type {CardThing, HoodThings, KitThing} from '@/lib/life/hood/things'

/**
 * What a club already owns that LIFE plays with (owner, 28.11.2026): its crest (`lib/clubs/crest.ts`), its home shirts by
 * season as the studio-cut SVGs of the kit archive (`lib/clubs/kit-sources.ts`), and THE ALBUM's stickers with each man's
 * years (`content/generated/album-edition-1.json`, pressed in `album-stickers.json`). Read here once, on the server, and
 * handed to the game as plain data; the game never reads the archive itself.
 */
type Row = {slot: number; name: string; from?: number; to?: number; kit?: string | null}
type Pressed = {code?: string; file?: string; status?: string; portrait?: string | null}
const WINGS = (edition as unknown as {wings: Record<string, Row[]>}).wings
const STICKERS = (ledger as unknown as {stickers: Record<string, Pressed>}).stickers

export function lifeThings(club: ClubData): HoodThings {
  const id = club.identity.id
  const byYear = new Map<number, KitThing>()
  for (const k of kitViews(club)) {
    if (kitTypeKey(k.type) !== 'home') continue
    const year = Number(/^(\d{4})/.exec(k.season)?.[1])
    const src = kitArt(id, k.id, k.season, k.type, k.also)?.svg
    if (!Number.isFinite(year) || !src || byYear.has(year)) continue
    byYear.set(year, {year, season: k.season, src})
  }
  const cards: CardThing[] = (WINGS[id] ?? []).flatMap(r => {
    if (typeof r.from !== 'number') return []
    const p = STICKERS[`${id}:${r.slot}`]
    // a sticker with a face (a photograph, or a painted portrait); a bare silhouette is not a find
    const src = p?.file && (p.status === 'photo' || p.portrait === 'painted') ? p.file : null
    return [{id: `${id}:${r.slot}`, code: p?.code ?? '', name: r.name, from: r.from, to: typeof r.to === 'number' ? r.to : r.from, src, kit: r.kit ?? null}]
  })
  return {crest: crestFor(id), kits: [...byYear.values()].sort((a, b) => a.year - b.year), cards}
}
