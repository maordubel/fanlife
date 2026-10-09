'use client'

import { useEffect, useState } from 'react'

import { PressPhoto } from '@/components/master/Poster'

const KEY = 'fanlife.market.curtain.v1'

/**
 * The market's door: a short curtain with the shirt swap on it, once per visit session.
 * It never blocks — a tap or Escape skips it, reduced motion and a repeat visit never see it,
 * and the market underneath is already drawn (rule 30's "over the wall, never instead of it").
 */
export function MarketCurtain({ label }: { label: string }) {
  const [on, setOn] = useState(false)

  useEffect(() => {
    let skip = false
    try {
      skip = window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.sessionStorage.getItem(KEY) === '1'
    } catch {
      skip = false
    }
    if (skip) return
    setOn(true)
    const end = window.setTimeout(() => close(), 1500)
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', key)
    function close() {
      setOn(false)
      try {
        window.sessionStorage.setItem(KEY, '1')
      } catch {
        // the curtain is a flourish; remembering it is a convenience
      }
    }
    return () => {
      window.clearTimeout(end)
      window.removeEventListener('keydown', key)
    }
  }, [])

  if (!on) return null
  return (
    <div className="fl-mk-curtain" aria-hidden="true" onClick={() => setOn(false)} data-market-curtain>
      <div className="fl-mk-curtain-in">
        <PressPhoto art="shirt-swap" className="fl-mk-curtain-art" />
        <p>{label}</p>
      </div>
    </div>
  )
}
