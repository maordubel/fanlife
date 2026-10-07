import 'server-only'

import { collectorShirts } from '@/lib/collector/catalog'
import type { AuctionShirt } from '@/lib/collector/auction'
import type { CollectorShirt } from '@/lib/collector/types'
import { kitViews, type KitView } from '@/lib/clubs/gate-content'
import { CORE_CLUB_IDS, loadClub } from '@/lib/clubs/resolver'
import { REGISTRY } from '@/lib/master/registry'

/**
 * FAN LIFE's shirt catalogue: every club's shirts in one list, for the closet, the market and the
 * auction (owner, 7.10.2026).
 *
 * - Hapoel Tel Aviv brings its photographed archive (168 shirts) with the SAME slugs The Worker
 *   uses, so a copy held in one product is the same copy in the other — they share the worker_*
 *   tables in production.
 * - Every other core club brings the kits its pack documents (season, type, maker, colours). They
 *   have no photograph we may show, so they are drawn (KitPlate). Their slug is `<sub>--<kit>`,
 *   inside the database's own slug rule (`^[a-z0-9][a-z0-9-]{2,63}$`), so no table changes.
 * - `variantHe` carries the ENGLISH label with the club in it ("Olympiacos away"): the forked screens
 *   print that field wherever they name the shirt — card, listing, lot title ("1985/86 Olympiacos
 *   away shirt") — so a shirt is never shown without its club. The field name is The Worker's.
 * - Nothing is a spoiler in FAN LIFE: the gate-4 shield belongs to The Worker's Hebrew game.
 */
export type FanShirt = CollectorShirt & { club: string; clubName: string; kit: Pick<KitView, 'id' | 'design' | 'colours' | 'season'> | null }
export type FanAuctionShirt = AuctionShirt & { club: string; clubName: string; kit: FanShirt['kit'] }

const VARIANT: Record<string, string> = { home: 'Home', away: 'Away', third: 'Third', fourth: 'Fourth', gk: 'Goalkeeper', special: 'Special' }
const label = (v: string) => VARIANT[v.toLowerCase()] ?? v.charAt(0).toUpperCase() + v.slice(1)
const slugPart = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** `<sub>--<kit>`, clipped to the database's 64 characters. */
export function fanSlug(sub: string, kitId: string): string {
  return `${sub}--${slugPart(kitId)}`.slice(0, 64).replace(/-+$/, '')
}

function yearOf(season: string): number | null {
  const m = season.match(/(18|19|20)\d{2}/)
  return m ? Number(m[0]) : null
}

let cached: Promise<FanShirt[]> | null = null
export function fanShirts(): Promise<FanShirt[]> {
  cached ??= (async () => {
    const out: FanShirt[] = []
    const hapoel = REGISTRY.find((c) => c.id === 'hapoel-tel-aviv')!
    for (const shirt of collectorShirts()) {
      out.push({ ...shirt, variantHe: `${hapoel.name} ${label(shirt.variant).toLowerCase()}`, spoiler: null, club: hapoel.id, clubName: hapoel.name, kit: null })
    }
    for (const id of CORE_CLUB_IDS) {
      if (id === 'hapoel-tel-aviv') continue
      const club = REGISTRY.find((c) => c.id === id)
      const pack = await loadClub(id)
      if (!club || !pack) continue
      for (const kit of kitViews(pack.data)) {
        const year = yearOf(kit.season)
        if (year === null) continue
        out.push({
          slug: fanSlug(club.sub, kit.id),
          src: '',
          seasonLabel: kit.season,
          yearRaw: year,
          seasonAmbiguous: false,
          year,
          decade: Math.floor(year / 10) * 10,
          variant: kit.type,
          variantHe: `${club.name} ${label(kit.type).toLowerCase()}`,
          kitId: null,
          spoiler: null,
          club: club.id,
          clubName: club.name,
          kit: { id: kit.id, design: kit.design, colours: kit.colours, season: kit.season },
        })
      }
    }
    return out
  })()
  return cached
}

export async function fanShirtMap(): Promise<Record<string, FanShirt>> {
  return Object.fromEntries((await fanShirts()).map((s) => [s.slug, s]))
}

/** The auction's view of the same catalogue (`lib/collector/auctionShirts.ts`, for every club). */
export async function fanAuctionShirts(): Promise<Record<string, FanAuctionShirt>> {
  const out: Record<string, FanAuctionShirt> = {}
  for (const shirt of await fanShirts()) {
    const approx = shirt.seasonAmbiguous || !shirt.seasonLabel
    out[shirt.slug] = {
      slug: shirt.slug, src: shirt.src, season: approx ? String(shirt.yearRaw ?? shirt.year) : (shirt.seasonLabel as string), approx,
      variantHe: shirt.variantHe, kitId: shirt.kitId, spoiler: false, club: shirt.club, clubName: shirt.clubName, kit: shirt.kit,
    }
  }
  return out
}
