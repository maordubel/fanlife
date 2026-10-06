'use client'

import { useEffect, useState } from 'react'

import type { KitSpec } from '@/lib/kit/spec'
import type { RumbleVisualPlayer } from '@/lib/game/royal-rumble-presentation'
import { voiceAction } from '@/lib/voice'
import { t } from '@/lib/royal-rumble/i18n'

import { RumblePitchFive } from './RumblePitchFive'
import { useReducedMotion } from './useReducedMotion'

type EraKit = { seasonLabel: string; spec: KitSpec }

const money = (price: number) => `€${price}M`

/**
 * THEIR entrance (1.5–2.5 s) and then the head-to-head (both fives, one VS, the two bills).
 * The opponent was fixed before the first pick, so nothing here reacts to the player's five.
 */
export function RumbleHeadToHead({
  us,
  them,
  kits,
  stage,
  onOpponentDone,
  onDone,
}: {
  us: RumbleVisualPlayer[]
  them: RumbleVisualPlayer[]
  kits: EraKit[]
  stage: 'opponent' | 'head-to-head'
  onOpponentDone: () => void
  onDone: () => void
}) {
  const reduced = useReducedMotion()
  const [count, setCount] = useState(stage === 'head-to-head' ? them.length : 0)

  useEffect(() => {
    if (stage === 'head-to-head') {
      const timer = window.setTimeout(onDone, reduced ? 1400 : 1700)
      return () => window.clearTimeout(timer)
    }
    if (reduced) {
      setCount(them.length)
      const timer = window.setTimeout(onOpponentDone, 1300)
      return () => window.clearTimeout(timer)
    }
    if (count >= them.length) {
      const timer = window.setTimeout(onOpponentDone, 500)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => setCount((value) => value + 1), 300)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, stage, reduced, them.length])

  const bill = (side: RumbleVisualPlayer[]) => side.reduce((sum, p) => sum + p.player.price, 0)

  return (
    <div className="relative text-center">
      <p className="font-mono tabular-nums text-[9px] font-black tracking-[0.32em] text-red" dir="ltr">
        {stage === 'opponent' ? 'OPPONENT ENTRANCE' : 'HEAD TO HEAD'}
      </p>
      <h2 className="mt-2 font-display text-[34px] leading-[0.9] sm:text-[56px]">{stage === 'opponent' ? voiceAction(9, 'opponent') : t('headToHead')}</h2>
      <div className="mt-2">
        <RumblePitchFive us={us} them={them} usCount={us.length} themCount={count} kits={kits} />
      </div>
      {stage === 'head-to-head' && (
        <div className="mx-auto mt-3 grid max-w-[460px] grid-cols-[1fr_auto_1fr] items-center gap-3">
          <p className="border-hair border-red bg-red px-2 py-1 font-display text-[20px] text-paper" dir="ltr">{money(bill(us))}</p>
          <span className="border-x-rule border-red px-4 font-display text-[30px] text-red" dir="ltr">VS</span>
          <p className="border-hair border-paper/40 bg-ink px-2 py-1 font-display text-[20px] text-paper" dir="ltr">{money(bill(them))}</p>
        </div>
      )}
    </div>
  )
}
