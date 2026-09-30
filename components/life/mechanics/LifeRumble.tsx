'use client'

import { RoyalRumbleRun } from '@/app/royal-rumble/RoyalRumbleRun'
import { dealLifeRumble } from '@/app/life/mechanicActions'
import type { ActivityBoardProps } from '@/components/life/MechanicSheet'
import { rumbleScore } from '@/lib/mechanics/registry'

import { Nothing, Waiting, useDeal } from './shared'

/**
 * הקלפים של אופיר על האספלט — the Royal Rumble over the men of the life's years. A dare, not a
 * job: the pot is won by winning (`rumbleScore`), a draw and a loss pay nothing and cost
 * nothing, and the friends settle it back on the pitch.
 *
 * V2 (25.9.2026, spec §74): the same composer, over the historical window — FLEX, the two
 * formations, one shuffle before the first pick. Embedded is short: no replay CTA, no recent
 * five, no share. A scene may hand `allowShuffle={false}` — "אלה הקלפים. תסתדר."
 */
export default function LifeRumble({ request, onResult, allowShuffle = true }: ActivityBoardProps & { allowShuffle?: boolean }) {
  const deal = useDeal(() => dealLifeRumble(request.seed, request.window))
  if (deal.state === 'loading') return <Waiting />
  if (deal.state === 'empty') return <Nothing onLeave={() => onResult({ completed: false, score: 0 })} />
  const pack = deal.data
  return (
    <div className="-mx-gutter mt-2">
      <RoyalRumbleRun
        draft={pack.draft}
        shuffleDraft={pack.shuffleDraft}
        cursor={0}
        playerCount={pack.playerCount}
        kits={pack.kits}
        looks={pack.looks}
        allowShuffle={allowShuffle}
        embedded={{
          window: { before: request.window.before },
          doneLabel: '',
          onResult: (result) => {
            const settled = rumbleScore(result)
            onResult({ completed: true, score: settled.score, won: settled.won, pay: settled.pay })
          },
        }}
      />
    </div>
  )
}
