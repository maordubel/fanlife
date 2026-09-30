'use client'

import { XIBuilder } from '@/app/xi/XIBuilder'
import { dealLifeRoster } from '@/app/life/mechanicActions'
import type { ActivityBoardProps } from '@/components/life/MechanicSheet'
import type { RosterEntry } from '@/lib/game/allTimeXI'

import { Nothing, Waiting, backLabel, useDeal } from './shared'

/** the year Kobi's own terrace years begin to be his son's too — the boy's birth (rule 45) */
const KOBIS_YEARS_END = 1978

/**
 * הטובים ביותר, עם אבא — the all-time eleven on the gate's own pitch, over the men who had worn
 * the shirt before the life's year. Nothing about it is graded (rules 24, 74): what Kobi
 * reacts to is a FACT about the sheet — how many of the eleven played before his son was
 * born, the men only he saw — and four or more is the whole sofa.
 */
export function kobisShare(picks: readonly RosterEntry[]): number {
  const his = picks.filter((entry) => typeof entry.toYear === 'number' && entry.toYear < KOBIS_YEARS_END).length
  return Math.min(1, his / 4)
}

export default function LifeXI({ request, onResult }: ActivityBoardProps) {
  const deal = useDeal(() => dealLifeRoster(request.window, true))
  if (deal.state === 'loading') return <Waiting />
  if (deal.state === 'empty') return <Nothing onLeave={() => onResult({ completed: false, score: 0 })} />
  const { roster, shirts, wardrobe, formations, slugAliases } = deal.data
  return (
    <XIBuilder
      formations={formations}
      roster={roster}
      shirts={shirts}
      wardrobe={wardrobe}
      slugAliases={slugAliases}
      embedded={{
        doneLabel: backLabel(request.activity),
        onResult: ({ picks }) =>
          onResult({
            completed: true,
            score: kobisShare(picks),
            answer: picks.map((entry) => entry.id ?? entry.slug).join('|'),
          }),
      }}
    />
  )
}
