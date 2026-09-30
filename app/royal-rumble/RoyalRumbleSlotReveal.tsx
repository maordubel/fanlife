'use client'

import { useEffect, useMemo, useState } from 'react'

import type { RoyalRumbleOffer } from '@/lib/game/royal-rumble-public'
import { t } from '@/lib/royal-rumble/i18n'

/** the whole reveal, first tick to last lock — 700–900ms and no longer (spec §47) */
const REVEAL_MS = 780
const TICK_MS = 60

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function RoyalRumbleSlotReveal({
  offers,
  signature,
}: {
  offers: RoyalRumbleOffer[]
  signature: string
}) {
  const [tick, setTick] = useState(0)
  const [open, setOpen] = useState(true)
  const names = useMemo(() => offers.map((offer) => offer.player.nameHe), [offers])

  useEffect(() => {
    // under reduced motion the names simply are (rule 21: every animation is off)
    if (reducedMotion()) {
      setOpen(false)
      return
    }
    setTick(0)
    setOpen(true)
    const spin = window.setInterval(() => setTick((value) => value + 1), TICK_MS)
    const stop = window.setTimeout(() => {
      window.clearInterval(spin)
      setOpen(false)
    }, REVEAL_MS)
    return () => {
      window.clearInterval(spin)
      window.clearTimeout(stop)
    }
  }, [names, signature])

  if (!open || names.length === 0) return null

  return (
    <div className="absolute inset-0 z-30 grid grid-cols-3 gap-2 bg-paper sm:gap-3" aria-hidden="true">
      {offers.map((offer, index) => {
        // the three lock in a stagger — the last one just inside the budget above
        const lockAt = 5 + index * 3
        const locked = tick >= lockAt
        const current = locked
          ? offer.player.nameHe
          : names[(tick + index * 2) % names.length] ?? offer.player.nameHe
        return (
          <div
            key={`${signature}-${index}`}
            className={`relative flex min-h-[232px] flex-col items-center justify-center overflow-hidden border-rule px-2 text-center sm:min-h-[300px] ${
              locked ? 'border-red bg-paper text-ink' : 'border-ink bg-ink text-paper'
            }`}
          >
            <div className="absolute inset-x-0 top-0 h-2 bg-red" />
            <p className="font-mono tabular-nums text-[8px] font-black tracking-[0.22em] text-red" dir="ltr">
              {locked ? 'LOCKED' : 'SPINNING'}
            </p>
            <div className="mt-3 h-[64px] w-full overflow-hidden border-y-hair border-current/15">
              <div
                className={`flex h-full items-center justify-center px-2 font-display text-[21px] leading-[0.9] sm:text-[30px] ${
                  locked ? 'animate-[rrSlotLock_.22s_ease-out]' : 'animate-[rrSlotPulse_.14s_linear_infinite]'
                }`}
              >
                {current}
              </div>
            </div>
            <p className="mt-2 font-body text-[8px] sm:text-[9px] opacity-55">
              {locked ? t('slotLocked') : t('slotSpinning')}
            </p>
          </div>
        )
      })}
      <style>{`
        @keyframes rrSlotPulse{0%{transform:translateY(-6px);opacity:.35}50%{transform:translateY(5px);opacity:1}100%{transform:translateY(-6px);opacity:.35}}
        @keyframes rrSlotLock{0%{transform:scale(1.08);opacity:.35}100%{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  )
}
