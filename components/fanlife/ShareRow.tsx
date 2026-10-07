'use client'

import { useState } from 'react'

import { fl } from '@/lib/fanlife/copy'

/**
 * FAN LIFE's share for the shirt economy: one button — the phone's own share sheet where there is
 * one, otherwise the link is copied. The Worker's ShareRow draws Hebrew story cards; this keeps the
 * same props so the forks need no change, and shares the page link with the headline.
 */
export function ShareRow({ headline, route }: { kind?: string; params?: Record<string, string>; headline?: string; route?: string; card?: unknown; challenge?: unknown }) {
  const [done, setDone] = useState(false)
  const share = async () => {
    const url = new URL(route || location.pathname, location.origin).href
    try {
      if (navigator.share) await navigator.share({ title: 'FAN LIFE', text: headline, url })
      else { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2200) }
    } catch { /* the reader closed the sheet */ }
  }
  return (
    <button type="button" onClick={share} className="mag-chip min-h-tap" data-share="">
      {done ? fl('share.copied') : fl('share.button')}
    </button>
  )
}
