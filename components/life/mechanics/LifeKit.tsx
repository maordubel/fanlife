'use client'

import { KitGameRun } from '@/app/kits/build/KitGameRun'
import { dealLifeKit } from '@/app/life/mechanicActions'
import type { ActivityBoardProps } from '@/components/life/MechanicSheet'
import { kitScore } from '@/lib/mechanics/registry'
import { KIT_OPTIONS } from '@/lib/mechanics/types'

import { Nothing, Waiting, backLabel, useDeal } from './shared'

/**
 * ההזמנה בחנות — one shirt of a season before the life's year, built part by part on the gate's
 * own board, with a step's choices set by age. Graded on the server with the same window the
 * deal used, so the round cannot be graded against a different shirt.
 */
export default function LifeKit({ request, onResult }: ActivityBoardProps) {
  const deal = useDeal(() => dealLifeKit(request.seed, request.window), (puzzles) => puzzles.length === 0)
  if (deal.state === 'loading') return <Waiting />
  if (deal.state === 'empty') return <Nothing onLeave={() => onResult({ completed: false, score: 0 })} />
  return (
    <div className="-mx-gutter mt-2">
      <KitGameRun
        puzzles={deal.data}
        seed={request.seed}
        embedded={{
          window: { before: request.window.before, pin: request.window.pin ?? null, options: KIT_OPTIONS[request.window.level] },
          doneLabel: backLabel(request.activity),
          onResult: (verdict) => onResult({ completed: true, score: kitScore(verdict), contentId: request.contentId }),
        }}
      />
    </div>
  )
}
