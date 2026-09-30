'use server'

import { cardOf, entity } from '@/lib/archive/graph'
import { archiveHref } from '@/lib/links'

/**
 * "חזר מהארכיון" (§55) — one saved archive item, named and linked by the server.
 *
 * The device holds only ids (gate 12's "שלי", `archive.mine` in the profile). The newest
 * id the Entity Graph still resolves is described here, and its door comes from
 * `lib/links` — so the home screen never builds an archive URL and never prints a saved
 * id the archive no longer knows.
 */
export type SavedArchiveItem = { titleHe: string; when: string | null; href: string }

export async function savedArchiveItem(ids: string[]): Promise<SavedArchiveItem | null> {
  if (!Array.isArray(ids)) return null
  const newestFirst = ids.slice(-40).reverse()
  for (const raw of newestFirst) {
    if (typeof raw !== 'string' || raw.length > 160) continue
    const e = entity(raw)
    const href = e ? archiveHref(e.id) : null
    if (!e || !href) continue
    const card = cardOf(e)
    return { titleHe: card.titleHe, when: card.when, href }
  }
  return null
}
