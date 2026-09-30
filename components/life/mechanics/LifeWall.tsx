'use client'

import { HateWall } from '@/app/derby/HateWall'
import { dealLifeWall } from '@/app/life/mechanicActions'
import type { ActivityBoardProps } from '@/components/life/MechanicSheet'
import { wallScore } from '@/lib/mechanics/registry'

import { Nothing, Waiting, useDeal } from './shared'

/**
 * הפנקס של שחור — the black wall outside the hall, one sport (the hall's), over the names that
 * were names before the life's year. An opinion: the life counts the duels he answered and
 * never which name he kept (rule 74).
 */
export default function LifeWall({ request, onResult }: ActivityBoardProps) {
  const deal = useDeal(() => dealLifeWall(request.seed, request.window))
  if (deal.state === 'loading') return <Waiting />
  if (deal.state === 'empty') return <Nothing onLeave={() => onResult({ completed: false, score: 0 })} />
  const wall = deal.data
  return (
    <HateWall
      enemies={wall.enemies}
      order={wall.order}
      noMercy={wall.noMercy}
      seed={request.seed}
      pinned={false}
      rosterSize={wall.rosterSize}
      embedded={{
        doneLabel: '',
        onResult: ({ duels, of }) => onResult({ completed: true, score: wallScore(duels, of) }),
      }}
    />
  )
}
