import type { Shirt } from '@/lib/life/shirts'

/**
 * איפה קונים — the one registry of shop links the product is allowed to print (27.9.2026).
 *
 * `content/manual` is facts with sources; a shop link is neither a fact nor a source, so it
 * lives here. Every screen that links out to a shop reads this file, and no component or
 * page may carry a shop address of its own (`tests/merch.test.ts` scans for it).
 *
 * Two kinds, and they are never confused:
 *   · `official-club` — the club's own store;
 *   · `independent-replica` — an independent site. It is never labelled official, its name
 *     never says `רשמי`, and its disclosure says in so many words that what it sells are
 *     nostalgic replicas and not match-worn shirts of the historical season.
 *
 * A shop is NOT a source. `lib/credits` lists the independent site on the community shelf
 * for what it does for the club's memory; no fact, asset or scan cites it.
 *
 * Client-safe: type-only import, no disk, no server code.
 */

export type ShirtId = Shirt['id']

export type MerchKind = 'official-club' | 'independent-replica'

/**
 * (delta 93, brief §30) what the link promises. The club's store is a GENERAL store: it is
 * linked under an old shirt as "the club's shop", never as "buy this shirt" — it does not
 * sell a 1986 kit, and a link placed under one must not imply it does.
 */
export type MerchScope = 'general-store' | 'season'

export type MerchLink = {
  id: string
  nameHe: string
  url: string
  kind: MerchKind
  scope: MerchScope
  /** printed beside the link every time it is shown — never behind a tooltip */
  disclosureHe: string
  /** the shirts this shop is linked to; absent together with `seasons` = every shirt */
  shirtIds?: ShirtId[]
  /** a year the shop's offer names; a shirt's season matches when it starts or ends in it */
  seasons?: string[]
}

export const MERCH_LINKS: readonly MerchLink[] = [
  {
    id: 'htafc-official',
    nameHe: 'החנות הרשמית של הפועל תל אביב',
    url: 'https://shop.htafc.co.il/shop/',
    kind: 'official-club',
    scope: 'general-store',
    disclosureHe: 'החנות הכללית של המועדון — לא בהכרח החולצה הזאת.',
  },
  {
    id: 'mishak-hashabbat',
    nameHe: 'משחק השבת',
    url: 'https://www.mishakhashabbat.com/',
    kind: 'independent-replica',
    scope: 'season',
    disclosureHe:
      'אתר עצמאי לשימור ההיסטוריה של הפועל תל אביב. חלק מהחולצות המוצעות בו הן חולצות רפליקה נוסטלגיות ואינן חולצות משחק מקוריות מהעונה ההיסטורית.',
    // No shirt id in `lib/life/shirts.ts` is certainly the shirt this shop reproduces, so it
    // is linked by year only (the brief's 1986, 1999, 2010) — never to a specific kit.
    seasons: ['1986', '1999', '2010'],
  },
]

export const merchLink = (id: string): MerchLink | null => MERCH_LINKS.find((link) => link.id === id) ?? null

/** `'1985/86'` → `['1985', '1986']`, `'1999/00'` → `['1999', '2000']`, `'1986'` → `['1986']` */
export function seasonYears(season: string): string[] {
  const match = /^(\d{4})(?:\s*[/\-–]\s*(\d{2}|\d{4}))?/.exec(season.trim())
  if (!match) return []
  const start = match[1] as string
  if (!match[2]) return [start]
  const end = match[2].length === 4 ? match[2] : `${Number(start.slice(0, 2)) + (Number(match[2]) < Number(start.slice(2)) ? 1 : 0)}${match[2]}`
  return [start, end]
}

/**
 * The shops to show under one shirt: the club's own store always, an independent shop only
 * where it is tied to that shirt id or to a year the shirt's season covers. Official first.
 */
export function merchForShirt(shirtId: ShirtId, season?: string | null): MerchLink[] {
  const years = season ? new Set(seasonYears(season)) : new Set<string>()
  const matches = (link: MerchLink) => {
    if (!link.shirtIds && !link.seasons) return true
    if (link.shirtIds?.includes(shirtId)) return true
    return link.seasons?.some((year) => years.has(year)) ?? false
  }
  return MERCH_LINKS.filter(matches).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'official-club' ? -1 : 1))
}
