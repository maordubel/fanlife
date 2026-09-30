import 'server-only'

import { collectorShirts } from './catalog'
import type { AuctionShirt } from './auction'

/**
 * הארכיון, בגודל שהמכירה הפומבית צריכה — slug, תצלום, עונה, סוג. נקרא על השרת; לא עונה,
 * יצרן או ספונסר מועתקים לשום לוט (מפרט §72), והלוט מצביע על ה-slug בלבד.
 */
export function auctionShirts(): Record<string, AuctionShirt> {
  const out: Record<string, AuctionShirt> = {}
  for (const shirt of collectorShirts()) {
    const approx = shirt.seasonAmbiguous || !shirt.seasonLabel
    out[shirt.slug] = {
      slug: shirt.slug,
      src: shirt.src,
      season: approx ? String(shirt.yearRaw ?? shirt.year) : (shirt.seasonLabel as string),
      approx,
      variantHe: shirt.variantHe,
      kitId: shirt.kitId,
      spoiler: shirt.spoiler !== null,
    }
  }
  return out
}
