'use client'

import { useCallback, useEffect, useState } from 'react'

import { t } from '@/lib/i18n'
import { GateLogo, type ArenaLogo } from './GateLogo'

/**
 * "אווירת כניסה" — the walk in through the tunnel, once per session (rule 30's pattern).
 *
 * An OVERLAY over a screen that is already rendered and complete underneath, so a shared link,
 * a crawler and a slow phone all reach the game either way. Dismissed by a tap anywhere, Escape,
 * or its own end; the seen-flag is written when it ENDS (not when chosen, or React's dev
 * double-invoke reads back its own flag and the entrance never plays). Off entirely under
 * `prefers-reduced-motion`. No audio — a sound that plays before a gesture is refused anyway.
 */
const HOLD_MS = 2600

export function ArenaEntrance({ logo }: { logo: ArenaLogo }) {
  const key = `the-worker:arena:${logo}`
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      if (window.sessionStorage.getItem(key)) return
    } catch {
      /* storage refused: play it, it costs nothing */
    }
    setOpen(true)
  }, [key])

  const end = useCallback(() => {
    setOpen(false)
    try {
      window.sessionStorage.setItem(key, '1')
    } catch {
      /* fine */
    }
  }, [key])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(end, HOLD_MS)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') end()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, end])

  if (!open) return null
  const rumble = logo === 'royal-rumble'
  return (
    <button
      type="button"
      onClick={end}
      data-arena-entrance={logo}
      aria-label={t('arena.skip')}
      className={`min-h-tap arena-entrance arena-entrance-${rumble ? 'rumble' : 'cow'} fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden bg-ink px-5 text-paper`}
    >
      <span aria-hidden="true" className="arena-beam absolute inset-0" />
      {rumble && (
        <>
          <span aria-hidden="true" className="arena-scarf arena-scarf-a absolute inset-x-0" />
          <span aria-hidden="true" className="arena-scarf arena-scarf-b absolute inset-x-0" />
        </>
      )}
      <GateLogo logo={logo} decorative className={`arena-logo relative ${rumble ? 'w-[min(92vw,560px)]' : 'w-[min(94vw,600px)]'}`} />
      <span className="arena-line relative font-latin text-[10px] font-bold tracking-[0.3em] text-paper/80" dir="ltr">
        {t(rumble ? 'arena.line.rumble' : 'arena.line.cow')}
      </span>
      <span className="relative font-body text-[11px] text-concrete">{t('arena.skip')}</span>
    </button>
  )
}
