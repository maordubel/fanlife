'use client'

import { GoalRun } from '@/app/goal/GoalRun'
import { dealLifeGoal } from '@/app/life/mechanicActions'
import type { ActivityBoardProps } from '@/components/life/MechanicSheet'
import { goalScore } from '@/lib/mechanics/registry'

import { Nothing, Waiting, backLabel, useDeal } from './shared'

/**
 * הפרלמנט ליד הגדר — the goal the life pinned (one scored before the chapter's year), rebuilt
 * on the gate's own pitch and graded by the gate's own judge. The judge's overall is the score.
 */
export default function LifeGoal({ request, onResult }: ActivityBoardProps) {
  const deal = useDeal(() => dealLifeGoal(request.seed, request.window), (deal) => deal.goals.length === 0)
  if (deal.state === 'loading') return <Waiting />
  if (deal.state === 'empty') return <Nothing onLeave={() => onResult({ completed: false, score: 0 })} />
  return (
    <div className="mt-2">
      <GoalRun
        goals={deal.data.goals}
        shirts={deal.data.shirts}
        seed={request.seed}
        pin={request.window.pin ?? null}
        embedded={{
          doneLabel: backLabel(request.activity),
          onResult: (verdict) => onResult({ completed: true, score: goalScore(verdict), contentId: request.contentId }),
        }}
      />
    </div>
  )
}
