'use client'

import { useState } from 'react'

import { dealLifeRoster } from '@/app/life/mechanicActions'
import { QuestionStage } from '@/components/ballot/QuestionStage'
import type { ActivityBoardProps } from '@/components/life/MechanicSheet'
import { RosterSheet } from '@/components/roster/RosterSheet'
import { t } from '@/lib/i18n'
import { BALLOT, QUESTION_FILTER, positionLabel } from '@/lib/polls/ballot'

import { Nothing, Waiting, backLabel, useDeal } from './shared'

/**
 * שאלה מהקופאי — ONE of the survey's eight questions, the next one this life has not answered,
 * on the gate's own stage and roster sheet over the men of the life's years.
 *
 * The answer stays in the life (owner, 21.9.2026): it is kept in the save as this life's
 * opinion and nothing is cast — no `BallotStore`, no `rpc_poll_vote`. An opinion is paid for
 * being given, never for agreeing with anybody (rule 74).
 */
export default function LifePoll({ request, onResult }: ActivityBoardProps) {
  const question = BALLOT.find((row) => row.id === request.contentId) ?? null
  const deal = useDeal(() => dealLifeRoster(request.window))
  const [sheet, setSheet] = useState(false)
  const [pick, setPick] = useState<{ key: string; label: string } | null>(null)
  const [number, setNumber] = useState<number | null>(null)
  const [position, setPosition] = useState<string | null>(null)

  if (!question) return <Nothing onLeave={() => onResult({ completed: false, score: 0 })} />
  if (deal.state === 'loading') return <Waiting />
  if (deal.state === 'empty') return <Nothing onLeave={() => onResult({ completed: false, score: 0 })} />
  const { roster, homeShirt } = deal.data
  const filter = QUESTION_FILTER[question.id] ?? {}

  return (
    <div className="mt-3" data-life="poll">
      <QuestionStage
        question={question}
        index={BALLOT.indexOf(question)}
        pickLabel={pick?.label ?? null}
        filter={filter}
        fromXi={[]}
        shirt={homeShirt}
        number={number}
        position={position}
        onOpenRoster={() => setSheet(true)}
        onPickEntry={(entry) => setPick({ key: entry.id ?? entry.slug, label: entry.nameHe })}
        onNumber={(n) => {
          setNumber(n)
          setPick({ key: String(n), label: String(n) })
        }}
        onPosition={(code) => {
          setPosition(code)
          setPick({ key: code, label: positionLabel(code) ?? code })
        }}
      />
      <button
        type="button"
        onClick={() => pick && onResult({ completed: true, score: 1, contentId: question.id, answer: pick.key })}
        disabled={!pick}
        data-life="poll-back"
        className="mt-3 flex min-h-tap w-full items-center justify-center bg-red px-4 font-body text-step-0 font-extrabold text-paper disabled:opacity-40"
      >
        {backLabel(request.activity)}
      </button>
      {sheet && question.kind === 'roster' && (
        <RosterSheet
          title={t(question.ask)}
          roster={roster}
          initialFilter={filter}
          onPick={(entry) => {
            setPick({ key: entry.id ?? entry.slug, label: entry.nameHe })
            setSheet(false)
          }}
          onClose={() => setSheet(false)}
        />
      )}
    </div>
  )
}
