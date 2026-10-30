import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/brand'
import { GATES, isOpen } from '@/lib/gates'
import { readState } from '@/lib/master/store'
import { DEFAULT_CLUB, REGISTRY } from '@/lib/master/registry'
import { indexableStatus } from '@/lib/seo/club'
import { SHARED_GATES, gateAvailability } from '@/lib/clubs/gates'
import { gateAccess } from '@/lib/clubs/access'
import { loadClub } from '@/lib/clubs/resolver'
import { clubAwayData } from '@/lib/away-days/club'
import { featuresOf } from '@/lib/features'

/**
 * מפת האתר — every public gate, derived from `lib/gates.ts` so it can never drift from
 * the wall itself: a gate added or removed there is added or removed here on the next
 * build, with nothing to remember to update by hand.
 *
 * A gate's own `href` sometimes carries the wall's `?seed=` (so the plate always hands
 * out a playable link); the sitemap strips it; a canonical URL does not commit to one
 * seed over every other. `/ussishkin` is added by hand because it is a memorial wing,
 * not a gate (rule 24) and so is not in `GATES` at all. `/kits/archive` is by hand for
 * the same reason: it is gate 5's photograph archive, a screen you read rather than a
 * gate you play, and it is listed because "the 1985 away shirt" is a page people link to.
 * `/kits/closet` is by hand for the same reason — the closet grows out of the archive (spec §71),
 * and its door is the page a supporter sends; a collector's own closet (`/kits/closet/<n>`) is
 * never listed, because a closet shared by link must not be found by a crawler.
 * `/kits/market` (שוק האדומים) is listed for the same reason: the table of copies is public, and a
 * listing or a conversation under it is not — those stay out of the map.
 * `/kits/auction` is by hand for the archive's reason: its lots are events on the same wing,
 * and a lot is a page people send each other. `/kits/admin` is never listed (noindex, §65).
 * `/credits` is by hand too: it is not a gate but the one page every source and credit
 * lives on (spec §0.3, 22.9.2026), and every screen that states a fact links to it.
 * `/away-days` is by hand: the journey is entered from the wall's strip, not a gate (24.9.2026).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  // ADR-U03 / master plan §SEO: only a PUBLISHED club is listed — a club in research is not a page to index.
  const state = await readState().catch(() => null)
  const live = state
    ? new Set(state.clubs.filter((c) => indexableStatus(c.status)).map((c) => c.id))
    : new Set<string>([DEFAULT_CLUB])

  // A gate under refurbishment has no URL to list. Putting one in the sitemap would be
  // asking a search engine to index a page that does not exist.
  const gateEntries: MetadataRoute.Sitemap = GATES.filter(isOpen).map((gate) => ({
    url: `${SITE_URL}${gate.href.split('?')[0]}`,
    lastModified: now,
  }))

  return [
    { url: SITE_URL, lastModified: now },
    ...gateEntries,
    { url: `${SITE_URL}/ussishkin`, lastModified: now },
    { url: `${SITE_URL}/kits/archive`, lastModified: now },
    { url: `${SITE_URL}/kits/closet`, lastModified: now },
    { url: `${SITE_URL}/kits/market`, lastModified: now },
    { url: `${SITE_URL}/kits/auction`, lastModified: now },
    { url: `${SITE_URL}/credits`, lastModified: now },
    { url: `${SITE_URL}/away-days`, lastModified: now },
    // FAN LIFE (7.10.2026): every club's own page and the sources page
    ...REGISTRY.filter((club) => live.has(club.id)).map((club) => ({ url: `${SITE_URL}/clubs/${club.id}`, lastModified: now })),
    ...(await clubPages(state, live, now)),
    { url: `${SITE_URL}/sources`, lastModified: now },
    // SEO pass (30.10.2026): the pages Google asks every publisher for, and the hub's own sections.
    ...['/about', '/privacy', '/terms', '/contact', '/our-games', '/market', '/shirts'].map((path) => ({ url: `${SITE_URL}${path}`, lastModified: now })),
    // ALL FOOTBALL and Legends Manager are listed only while their switch is on for everyone (off = owner preview, a 404 to the public).
    ...(featuresOf(state).allFootball ? [{ url: `${SITE_URL}/all-football`, lastModified: now }] : []),
    ...(featuresOf(state).fanLeague ? [{ url: `${SITE_URL}/all-football/legends`, lastModified: now }] : []),
  ]
}

/**
 * Every page inside a published club that a reader can actually use (SEO pass, 30.10.2026). Before this the
 * sitemap named only each club's front page, so ~170 club pages were found by links alone. A gate is listed
 * only when the control room has it on AND the club's data plays it — a locked gate is a thin page, not a
 * page to index. The reading pages (history, kit archive, play, terrace) exist for every published club.
 */
async function clubPages(state: Awaited<ReturnType<typeof readState>> | null, live: Set<string>, now: Date): Promise<MetadataRoute.Sitemap> {
  if (!state) return []
  const out: MetadataRoute.Sitemap = []
  for (const club of REGISTRY.filter((c) => live.has(c.id))) {
    const control = state.clubs.find((c) => c.id === club.id)
    const loaded = await loadClub(club.id).catch(() => null)
    if (!control || !loaded) continue
    const base = `${SITE_URL}/clubs/${club.id}`
    for (const sub of ['history', 'kit-archive', 'play', 'terrace']) out.push({ url: `${base}/${sub}`, lastModified: now })
    if (clubAwayData(club.id)) out.push({ url: `${base}/away-days`, lastModified: now })
    for (const gate of SHARED_GATES) {
      if (!gateAccess(control, gate.number, false).allowed) continue
      if (!gateAvailability(loaded.data, gate.key).playable) continue
      out.push({ url: `${base}/${gate.key}`, lastModified: now })
    }
  }
  return out
}
