'use client'

import { MemoryBoard } from '@/app/memory/MemoryBoard'
import { dealLifeMemory } from '@/app/life/mechanicActions'
import type { ActivityBoardProps } from '@/components/life/MechanicSheet'
import { memoryScore } from '@/lib/mechanics/registry'

import { Nothing, Waiting, backLabel, useDeal } from './shared'

/**
 * הזיכרון של בארי בתחנה — the gate's wall of pairs, laid out from what came before the window's
 * year (before the boy was born, in the eighties; what he lived through, after). The wall is a
 * night board, so it gets its night here too.
 */
export default function LifeMemory({ request, onResult }: ActivityBoardProps) {
  const deal = useDeal(() => dealLifeMemory(request.seed, request.window))
  if (deal.state === 'loading') return <Waiting />
  if (deal.state === 'empty') return <Nothing onLeave={() => onResult({ completed: false, score: 0 })} />
  return (
    <div className="-mx-gutter mt-2 bg-ink px-gutter pb-6 pt-1">
      <MemoryBoard
        round={deal.data}
        seed={request.seed}
        embedded={{
          doneLabel: backLabel(request.activity),
          onResult: (verdict) => onResult({ completed: true, score: memoryScore(verdict) }),
        }}
      />
    </div>
  )
}
