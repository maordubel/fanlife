'use client'

import { useEffect, useState } from 'react'

/**
 * Is the window wide enough for the drawer to sit BESIDE the pitch (`lg`, 1024px)?
 *
 * Read after mount only — the server has no window, and the drawer only ever opens after
 * a tap, so the first paint is the same on both sides and nothing hydrates differently.
 */
export function useWide(query = '(min-width: 1024px)'): boolean {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(query)
    const update = () => setWide(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [query])
  return wide
}
