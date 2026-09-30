import 'server-only'

import { archiveShirts } from '@/lib/kit/archive'
import { kitRecords, playableKits } from '@/lib/kit/kit-master'

import type { CollectorShirt } from './types'

/**
 * הקטלוג של האספנים — אותן 168 חולצות של הארכיון, עם `kit_id` איפה שה-Kit Master יודע אותו.
 *
 * `kit_id` נקשר רק לתצלום **המדויק** של ערכה (`evidence.exactPhoto`). תצלום מועמד הוא ניחוש
 * של עונה (כלל 69 §4), ולקשור אותו היה גורם לשני אספנים "להחזיק אותה חולצה" על סמך "בערך".
 * ההתאמות במסד (`worker_same_shirt`) משוות לפי התצלום, ולפי `kit_id` רק כששני הצדדים יודעים אותו.
 */
export function collectorShirts(): CollectorShirt[] {
  const kitOf = new Map<string, string>()
  for (const kit of kitRecords()) {
    const photo = kit.evidence.exactPhoto
    if (photo) kitOf.set(photo.file.replace(/\.webp$/, ''), kit.id)
  }
  const spoilerOf = new Map<string, string>()
  for (const kit of playableKits()) {
    const photo = kit.evidence.exactPhoto
    if (photo) spoilerOf.set(photo.file.replace(/\.webp$/, ''), kit.legacyKey)
  }
  return archiveShirts().map((shirt) => ({
    slug: shirt.slug,
    src: shirt.src,
    seasonLabel: shirt.seasonLabel,
    yearRaw: shirt.yearRaw,
    seasonAmbiguous: shirt.seasonAmbiguous,
    year: shirt.year,
    decade: shirt.decade,
    variant: shirt.variant,
    variantHe: shirt.variantHe,
    kitId: kitOf.get(shirt.slug) ?? null,
    spoiler: spoilerOf.get(shirt.slug) ?? null,
  }))
}

/** A lookup by slug, for screens that receive collector rows and need the shirt behind each. */
export function collectorShirtMap(): Record<string, CollectorShirt> {
  return Object.fromEntries(collectorShirts().map((shirt) => [shirt.slug, shirt]))
}
