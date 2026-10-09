import type { Currency } from '@/lib/collector/types'

import type { HubItem, MyWant } from './types'

/**
 * Why a copy is in front of THIS collector — in words, never as a score. There is no match percentage in the
 * hub (owner's brief): a reason is a plain fact the collector can check against what they asked for, and a
 * copy with no reason simply shows none. The budget is the collector's own private number; it is compared on
 * their device and never leaves it.
 */
export type ReasonKey = 'wishlist' | 'yourSize' | 'budget' | 'swap' | 'justListed'

const HOURS = 3600_000
const sameCurrency = (a: Currency, b: Currency) => a === b

export function reasonsFor(item: HubItem, wants: readonly MyWant[], now: number = Date.now()): ReasonKey[] {
  const out: ReasonKey[] = []
  const want = wants.find((w) => w.archiveSlug === item.archiveSlug || (w.kitId && item.kitId && w.kitId === item.kitId))
  if (want && !item.mine) {
    out.push('wishlist')
    if (want.size && item.size === want.size) out.push('yourSize')
    if (want.maxPrice !== null && item.askingPrice !== null && sameCurrency(want.currency, item.currency) && item.askingPrice <= want.maxPrice) out.push('budget')
    if ((want.mode === 'swap' || want.mode === 'any') && item.forTrade) out.push('swap')
  }
  if (item.openedAt && now - Date.parse(item.openedAt) < 72 * HOURS && now >= Date.parse(item.openedAt)) out.push('justListed')
  return out.slice(0, 3)
}

/**
 * How a copy reaches this collector, in words — facts about two places both of which chose to be shown, plus the
 * seller's own shipping setting. Never a distance, never a score. Empty when the server sent no route.
 */
export type RouteWord = 'sameCity' | 'sameCountry' | 'crossBorder' | 'ships' | 'noShip' | 'meetOnly'

export function routeWords(route: HubItem['route']): RouteWord[] {
  if (!route) return []
  const out: RouteWord[] = []
  if (route.sameCity) out.push('sameCity')
  else if (route.sameCountry) out.push('sameCountry')
  else if (route.crossBorder) out.push('crossBorder')
  if (route.delivery === 'local') out.push('meetOnly')
  else if (route.reaches === true) out.push('ships')
  else if (route.reaches === false) out.push('noShip')
  return out
}
