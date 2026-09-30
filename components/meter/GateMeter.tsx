'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { meteredGate } from '@/lib/analytics/events'
import { closeVisit, countPick, currentGate, meterEnabled, openVisit, startVisit } from '@/lib/analytics/meter'

/**
 * The one measurement hook (delta 89) — mounted once in the root layout, so no gate carries
 * a line for it. It opens a visit when the route enters a measured gate (`gate_view`, with
 * where the person came from), counts the ground's pick hits (`tw:pickfx`, the one effect
 * every gate already fires) and the first real touch (`gate_start`), and on another route,
 * a hidden app or a closed tab reports how far a started round got (`gate_leave`).
 * `gate_finish` arrives through the progress ledger (`lib/analytics/progress.ts`).
 */
const XLINK = 'tw.meter.xlink'
// what counts as a real touch in a gate: a control, a drag handle, a drawing surface
const TOUCH = ['button', "[role='button']", '[data-draggable]', 'input', 'select', 'textarea', 'canvas', 'svg'].join(', ')

function arrivedFrom(first: boolean): string {
  try {
    if (window.sessionStorage.getItem(XLINK)) {
      window.sessionStorage.removeItem(XLINK)
      return 'xlink'
    }
  } catch {
    /* storage blocked — no matter */
  }
  if (!first) return 'internal'
  const ref = document.referrer
  if (!ref) return 'direct'
  try {
    return new URL(ref).origin === window.location.origin ? 'internal' : 'external'
  } catch {
    return 'external'
  }
}

/** Called by a cross-link chip just before it navigates: the next view says "xlink". */
export function noteCrossLink() {
  try {
    window.sessionStorage.setItem(XLINK, '1')
  } catch {
    /* storage blocked */
  }
}

export function GateMeter() {
  const pathname = usePathname()
  const first = useRef(true)

  useEffect(() => {
    if (!meterEnabled()) return
    const gate = meteredGate(pathname)
    if (gate === currentGate()) return
    if (gate) openVisit(gate, arrivedFrom(first.current))
    else closeVisit(false)
    first.current = false
  }, [pathname])

  useEffect(() => {
    if (!meterEnabled()) return
    const onPick = () => countPick()
    const onTouch = (event: Event) => {
      const target = event.target as Element | null
      if (!target?.closest || !target.closest('#main')) return
      if (target.closest('a[href]')) return
      if (target.closest(TOUCH)) startVisit()
    }
    const onHide = () => closeVisit(true)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') closeVisit(true)
    }
    window.addEventListener('tw:pickfx', onPick)
    window.addEventListener('pointerdown', onTouch, { capture: true, passive: true })
    window.addEventListener('keydown', onTouch, { capture: true, passive: true })
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('tw:pickfx', onPick)
      window.removeEventListener('pointerdown', onTouch, { capture: true })
      window.removeEventListener('keydown', onTouch, { capture: true })
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return null
}
