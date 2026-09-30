import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/brand'
import { GATES, isOpen } from '@/lib/gates'

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
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

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
  ]
}
