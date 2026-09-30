'use client'

import { useEffect, useState } from 'react'

import { Num } from '@/components/ui/Num'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * כרטיס השלב — the full-bleed card between stages.
 *
 * It exists to make the difficulty curve VISIBLE. A game that quietly gets harder feels
 * like a game that is cheating; a game that stops for one second, tells you the clock
 * just got shorter, and then throws you back in feels like it is raising the stakes
 * with you. One second is the whole budget — it dismisses itself, because a card you
 * have to tap away is another "next" button, and the point is that there are none.
 */
export function StageCard({ stage, onDone }: { stage: number; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const out = window.setTimeout(() => setLeaving(true), 950)
    const done = window.setTimeout(onDone, 1250)
    return () => {
      window.clearTimeout(out)
      window.clearTimeout(done)
    }
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center bg-ink px-gutter transition-opacity duration-300 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
      role="status"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30">
        <div className="rays absolute inset-x-0 top-1/2 mx-auto h-[900px] w-[900px] -translate-y-1/2" />
      </div>
      <p className="relative font-latin text-[11px] font-bold tracking-[0.3em] text-red" dir="ltr">
        STAGE {stage + 1}
      </p>
      <p className="relative mt-2 font-poster text-[110px] leading-none text-paper">
        <Num>{stage + 1}</Num>
      </p>
      <p className="relative mt-1 font-display text-step-2 leading-tight text-paper">
        {t(`run.stage.${stage + 1}` as MessageKey)}
      </p>
      <p className="relative mt-2 max-w-[30ch] text-center font-body text-step-0 leading-relaxed text-concrete">
        {t(`run.stage.${stage + 1}.rule` as MessageKey)}
      </p>
    </div>
  )
}
