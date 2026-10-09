'use client'

import { closetSlugsFor } from '@/app/kits/closet/bridge'
import { haveGame } from '@/lib/collector/api'
import { LocalCollectionStore } from '@/lib/kit/collection'
import { createClient } from '@/lib/supabase/client'
import { portalConfigured } from './env'

/**
 * הארון האחד — a shirt assembled in Gate 4 is carried into the account's closet (worker_collector_item,
 * origin 'game') so The Worker and FAN LIFE show the same closet. Safe to call as often as you like:
 * the database never makes a second copy and never turns a real one into a game one, and a key that was
 * delivered is remembered on the device so the next call asks about nothing.
 */
const SENT = 'worker.closet.sent.v1'

function sent(): Set<string> {
  try { return new Set(JSON.parse(window.localStorage.getItem(SENT) ?? '[]') as string[]) } catch { return new Set() }
}

export async function syncBuiltToCloset(): Promise<number> {
  if (!portalConfigured() || typeof window === 'undefined') return 0
  try {
    const { data } = await createClient().auth.getUser()
    if (!data.user) return 0
    const done = sent()
    const keys = Object.keys(await new LocalCollectionStore().read()).filter((key) => !done.has(key))
    if (keys.length === 0) return 0
    const slugs = await closetSlugsFor(keys)
    let added = 0
    for (const key of keys) {
      const target = slugs[key]
      if (!target) continue
      const result = await haveGame(target.slug, target.kitId)
      if (result.ok) {
        done.add(key)
        if (result.created) added += 1
      }
    }
    try { window.localStorage.setItem(SENT, JSON.stringify([...done])) } catch { /* private mode: asks again next time, harmlessly */ }
    return added
  } catch {
    return 0
  }
}
