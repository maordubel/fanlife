'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import type { CollectorShirt } from '@/lib/collector/types'
import { activeCollection } from '@/lib/kit/collection'

/**
 * The archive's spoiler shield, for the market (rule 69, brief §15): a shirt Gate 4 can still deal
 * (`CollectorShirt.spoiler`) stays covered until this device has built it or a tap uncovers it.
 * Before the collection is read every such shirt is covered — the safe default.
 */
export function useShield() {
  const store = useMemo(() => activeCollection(), [])
  const [built, setBuilt] = useState<Set<string> | null>(null)
  const [uncovered, setUncovered] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    let live = true
    void store.read().then((rows) => {
      if (live) setBuilt(new Set(Object.keys(rows)))
    })
    return () => {
      live = false
    }
  }, [store])
  const shielded = useCallback(
    (shirt: CollectorShirt) => shirt.spoiler !== null && !uncovered.has(shirt.slug) && !(built?.has(shirt.spoiler) ?? false),
    [built, uncovered],
  )
  const uncover = useCallback((slug: string) => setUncovered((rows) => new Set(rows).add(slug)), [])
  return { shielded, uncover }
}
