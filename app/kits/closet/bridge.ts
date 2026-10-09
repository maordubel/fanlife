'use server'

import { kitByLegacyKey } from '@/lib/kit/kit-master'

/**
 * Which closet slug a shirt built in Gate 4 stands for. Only a kit whose EXACT archive photo is known has one
 * (`evidence.exactPhoto`, rule 69 §4) — a candidate photo is a guess at the season, and two collectors must
 * never "hold the same shirt" on a guess. A built kit with no exact photo simply stays out of the closet.
 */
export async function closetSlugsFor(keys: string[]): Promise<Record<string, { slug: string; kitId: string }>> {
  const out: Record<string, { slug: string; kitId: string }> = {}
  for (const key of keys.slice(0, 200)) {
    if (typeof key !== 'string' || key.length > 80) continue
    const kit = kitByLegacyKey(key)
    const photo = kit?.evidence.exactPhoto
    if (kit && photo) out[key] = { slug: photo.file.replace(/\.webp$/, ''), kitId: kit.id }
  }
  return out
}
