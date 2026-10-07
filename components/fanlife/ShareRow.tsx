'use client'

import { useState } from 'react'

import { fl } from '@/lib/fanlife/copy'

/**
 * FAN LIFE's share for the shirt economy: one button — the phone's own share sheet where there is
 * one, otherwise the link is copied. The Worker's ShareRow draws Hebrew story cards; this keeps the
 * same props so the forks need no change, and shares the page link with the headline.
 */
export function ShareRow({ headline, route, params }: { kind?: string; params?: Record<string, string>; headline?: string; route?: string; card?: unknown; challenge?: unknown }) {
  const [done, setDone] = useState(false)
  const share = async () => {
    const url = new URL(route || location.pathname, location.origin).href
    // the params carry what the old story card printed (the missing slots, the shirt) — they travel as the share's text
    const text = [headline, ...Object.values(params || {}).filter(Boolean)].filter(Boolean).join('\n')
    try {
      if (navigator.share) await navigator.share({ title: 'FAN LIFE', text, url })
      else { await navigator.clipboard.writeText(text ? `${text}\n${url}` : url); setDone(true); setTimeout(() => setDone(false), 2200) }
    } catch { /* the reader closed the sheet */ }
  }
  return (
    <button type="button" onClick={share} className="mag-chip min-h-tap" data-share="">
      {done ? fl('share.copied') : fl('share.button')}
    </button>
  )
}
