'use client'

import { LineupBoard } from '@/app/lineup/LineupBoard'
import { dealLifeLineup } from '@/app/life/mechanicActions'
import type { ActivityBoardProps } from '@/components/life/MechanicSheet'
import { Num } from '@/components/ui/Num'
import { lineupScore } from '@/lib/mechanics/registry'

import { Nothing, Waiting, backLabel, useDeal } from './shared'

/**
 * מי פתח באותו ערב — the café's argument and the schoolyard's bet, on the gate's own lockers.
 * The match is the one the life pinned, dated before its year; the grade is the gate's, read
 * at the life's age (a child is asked who played, a man where).
 */
export default function LifeLineup({ request, onResult }: ActivityBoardProps) {
  const deal = useDeal(() => dealLifeLineup(request.seed, request.window))
  if (deal.state === 'loading') return <Waiting />
  if (deal.state === 'empty') return <Nothing onLeave={() => onResult({ completed: false, score: 0 })} />
  const challenge = deal.data
  return (
    <div className="mt-3">
      {/* the archive's own words for the match — the people at the table say none of it */}
      <section className="border-rule border-ink bg-sheet px-3 py-2.5" data-match={challenge.matchId}>
        <p className="font-sign text-step-1 leading-tight text-ink">{challenge.titleHe}</p>
        {challenge.subtitleHe && (
          <p className="mt-1 font-mono text-[11px] leading-snug text-sign">
            <Num>{challenge.subtitleHe}</Num>
          </p>
        )}
      </section>
      <LineupBoard
        bank={challenge.bank}
        seed={request.seed}
        graded
        kit={challenge.kit}
        kitSeason={challenge.kitSeason}
        look={challenge.look}
        keeperLook={challenge.keeperLook}
        embedded={{
          window: { before: request.window.before, pin: request.window.pin ?? null },
          doneLabel: backLabel(request.activity),
          onResult: (verdict) =>
            onResult({ completed: true, score: lineupScore(verdict, request.window.level), contentId: request.contentId }),
        }}
      />
    </div>
  )
}
