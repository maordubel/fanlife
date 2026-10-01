'use client'

import { useEffect, useState } from 'react'

import { AdSlot } from '@/components/ads/AdSlot'
import { Num } from '@/components/ui/Num'
import { Punch } from '@/components/play/Punch'
import { PlayLink } from '@/components/play/PlayLink'
import { RecordRun } from '@/components/play/RecordRun'
import { ShareRow } from '@/components/share/ShareRow'
import { rankFor } from '@/lib/game/session'
import {
  TIMELINE_LENGTH,
  formatDate,
  type BlindCard,
  type DatedCard,
} from '@/lib/game/timeline-run'
import { stripCard } from '@/lib/share/artefacts'
import type { ChallengeResult } from '@/lib/challenges/contract'
import { CompareCard } from '@/components/share/CompareCard'
import { t, type MessageKey } from '@/lib/i18n'
import { ExitEmotion, ExitNext, ExitShare } from '@/components/result/UniversalExit'
import { track } from '@/lib/analytics/meter'
import type { NextAction } from '@/lib/results/types'
import { voice, voiceAction } from '@/lib/voice'
import { nextAfterOrder, submitInsert } from './actions'
import { useThreadCoachOpen } from './ThreadCoach'

/**
 * ציר הזמן — ten cards, one at a time, into a timeline you are building.
 *
 * There is no submit button and no reordering. The card is in your hand, the board is
 * on the glass, and you tap the gap it belongs in — that tap IS the answer. The card
 * then lands in its TRUE place whether you were right or not, so the board is always a
 * real chronology and the thing you got wrong is still sitting there to look at.
 *
 * Slots are buttons rather than a drag target because dragging is not keyboard
 * operable, and every interaction in this product has to be.
 */

import {SharedTimelineBoard,type Run} from '@/components/timeline/SharedTimelineBoard'
import timelineCopy from '@/messages/timeline/he.json'
export function TimelineBoard(props:{anchor:DatedCard;queue:BlindCard[];seed:number;cursor?:number}) {
 const coachOpen=useThreadCoachOpen()
 const copy={lives:t('run.lives'),where:voiceAction(13,'where')||'',right:t('timeline.right'),wrong:t('timeline.wrong'),intro:voiceAction(13,'orderIntro')||'',note:t('timeline.note'),slot:t('timeline.slot',{n:'{n}'}),here:t('timeline.here'),error:timelineCopy.error}
 return <SharedTimelineBoard {...props} coachOpen={coachOpen} copy={copy} submit={submitInsert} renderResult={result=><Result {...result}/>} />
}

function Result({
  run,
  board,
  seed,
  cursor,
  missed,
  queue,
}: {
  run: Run
  board: DatedCard[]
  seed: number
  cursor: number
  missed: string[]
  queue: BlindCard[]
}) {
  // ten ticks, one per card in the order it was DEALT — never the true order, which is the answer
  const marks = Array.from({ length: TIMELINE_LENGTH }, (_, i) => run.history[i] ?? false)
  const mine: ChallengeResult = { gate: 13, variant: 'order', marks }
  const rank = rankFor(run.score) as MessageKey
  // §22: "הסיפור חזר לסדר." — the board is always the true order, whatever was placed wrong
  const spoken = {
    ...voice({ gate: 13, moment: 'result', result: 'done', seed: `${seed}:${cursor}` }),
    title: voiceAction(13, 'ordered') ?? '',
    body: voiceAction(13, 'orderedBody') ?? undefined,
  }
  const [next, setNext] = useState<NextAction[]>([])
  useEffect(() => {
    track('run_complete', { detail: 'timeline-order', value: run.correct })
    let live = true
    nextAfterOrder(missed, `${seed}:${cursor}`, run.score)
      .then((answer) => {
        if (live) setNext(answer)
      })
      .catch(() => {})
    return () => {
      live = false
    }
    // one run, one context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="mt-stack">
      <Punch />
      <RecordRun
        gate="/timeline"
        variant="order"
        seed={seed}
        score={run.score}
        correct={run.correct}
        asked={TIMELINE_LENGTH}
      />
      <div className="border-b-rule border-ink pb-2">
        <p className="font-latin text-[9px] font-bold tracking-[0.2em] text-red" dir="ltr">
          FULL TIME
        </p>
        <ExitEmotion voice={spoken} compact />
      </div>

      <div className="mt-stack grid grid-cols-2 gap-2.5">
        <div className="border-rule border-ink bg-ink p-4 text-center">
          <p className="font-poster text-[52px] leading-none text-red">
            <Num>{run.score}</Num>
          </p>
          <p className="mt-1 font-body text-[10px] tracking-widest text-concrete">
            {t('run.score')}
          </p>
          <p className="mt-2 font-display text-step-0 leading-tight text-paper">{t(rank)}</p>
        </div>
        <div className="border-rule border-ink bg-sheet p-4">
          <p className="font-poster text-[34px] leading-none text-ink">
            <Num>{`${run.correct}/${TIMELINE_LENGTH}`}</Num>
          </p>
          <p className="mt-1 font-body text-[10px] tracking-widest text-muted">
            {t('timeline.placed')}
          </p>
          <p className="mt-2 font-body text-[11.5px] leading-snug text-muted">
            {t('run.best')}: <Num>{run.bestCombo}</Num>
          </p>
        </div>
      </div>

      <CompareCard gate={13} mine={mine} />

      {/* the finished chronology — the thing the run actually built */}
      <p className="mt-stack font-body text-[11px] tracking-widest text-muted">
        {t('timeline.built')}
      </p>
      <ol className="mt-2 border-t-hair border-ink/25">
        {board.map((card) => (
          <li
            key={card.id}
            className="flex items-baseline justify-between gap-2 border-b-hair border-ink/25 py-2"
          >
            <span className="min-w-0 font-body text-step-0 text-ink">{card.title}</span>
            <span className="shrink-0 font-mono text-[12px] tabular-nums text-red">
              <Num>{formatDate(card.on)}</Num>
            </span>
          </li>
        ))}
      </ol>


      <ExitNext next={next} from="timeline-order" />

      <ExitShare label={spoken.ctaShare} from="timeline-order">
      <ShareRow
        kind="timeline"
        route="/timeline/order"
        params={{ c: String(run.correct), s: String(seed), r: String(cursor) }}
        headline={`${run.correct}/${TIMELINE_LENGTH}`}
        card={stripCard({
          variant: 'order',
          rows: queue.slice(0, TIMELINE_LENGTH).map((card, i) => ({ text: card.title, ok: marks[i] ?? false })),
        })}
        challenge={{ gate: 13, params: { variant: 'order' }, result: mine }}
      />
      </ExitShare>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <PlayLink
          gate="/timeline/order"
          className="flex min-h-tap items-center justify-center border-rule border-ink bg-sheet px-4 font-body text-step-0 font-extrabold text-ink"
        >
          {t('run.again')}
        </PlayLink>
        <a
          href="/"
          className="flex min-h-tap items-center justify-center bg-ink px-4 font-body text-step-0 font-extrabold text-paper"
        >
          {t('nav.gates')}
        </a>
      </div>

      <AdSlot placement="result" />
    </div>
  )
}
