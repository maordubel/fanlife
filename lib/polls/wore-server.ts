import 'server-only'

import { holdersOfNumber } from '@/lib/archive/player-master'
import { NUMBERS } from './ballot'
import type { NumberBoard, WornRow } from './wore'

let cached: NumberBoard | null = null

/** Every season-bound holder of every number the ballot offers, with the sources sent once. */
export function numberBoard(): NumberBoard {
  if (cached) return cached
  const sources: NumberBoard['sources'] = []
  const index = new Map<string, number>()
  const byNumber: Record<string, WornRow[]> = {}
  for (const n of NUMBERS) {
    const rows: WornRow[] = []
    for (const holder of holdersOfNumber(n)) {
      const key = `${holder.sourceTitle ?? ''}|${holder.sourceUrl ?? ''}`
      let at = index.get(key)
      if (at === undefined) {
        at = sources.length
        sources.push({ title: holder.sourceTitle ?? '', url: holder.sourceUrl })
        index.set(key, at)
      }
      rows.push({
        nameHe: holder.nameHe,
        seasonLabel: holder.seasonLabel,
        source: at,
        ...(holder.historical ? {} : { current: true as const }),
      })
    }
    if (rows.length > 0) byNumber[String(n)] = rows
  }
  cached = { sources, byNumber }
  return cached
}
