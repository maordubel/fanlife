'use client'

import { useCallback, useEffect, useState } from 'react'

import { AdSlot } from '@/components/ads/AdSlot'
import { Burst } from '@/components/play/Burst'
import { Confetti } from '@/components/play/Confetti'
import { Num } from '@/components/ui/Num'
import { Punch } from '@/components/play/Punch'
import { PlayLink } from '@/components/play/PlayLink'
import { RecordRun } from '@/components/play/RecordRun'
import { ShareRow } from '@/components/share/ShareRow'
import { firePickFxAt } from '@/components/stage/PickFx'
import { LIVES, MAX_MULTIPLIER, rankFor } from '@/lib/game/session'
import {
  TIMELINE_LENGTH,
  formatDate,
  secondsFor,
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

type Run = {
  placed: number
  lives: number
  score: number
  combo: number
  bestCombo: number
  correct: number
  history: boolean[]
  over: boolean
}

const NEW_RUN: Run = {
  placed: 0,
  lives: LIVES,
  score: 0,
  combo: 0,
  bestCombo: 0,
  correct: 0,
  history: [],
  over: false,
}

export function TimelineBoard({
  anchor,
  queue,
  seed,
  cursor = 0,
}: {
  anchor: DatedCard
  queue: BlindCard[]
  seed: number
  cursor?: number
}) {
  const [run, setRun] = useState<Run>(NEW_RUN)
  const [board, setBoard] = useState<DatedCard[]>([anchor])
  const [feedback, setFeedback] = useState<{
    correct: boolean
    card: DatedCard
    position: number
  } | null>(null)
  const [burst, setBurst] = useState<{ points: number; combo: number } | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(secondsFor(0))
  const [locked, setLocked] = useState(false)
  /** the cards placed in the wrong gap — the ResultContext asks about them after the run */
  const [missed, setMissed] = useState<string[]>([])
  const coachOpen = useThreadCoachOpen()

  const hand = queue[run.placed] ?? null
  const total = secondsFor(run.placed)

  const resolve = useCallback(
    async (slot: number, el?: HTMLElement) => {
      if (locked || !hand || run.over) return
      setLocked(true)
      const verdict = await submitInsert(seed, run.placed, slot, cursor)
      if (!verdict) {
        setLocked(false)
        return
      }
      if (el) firePickFxAt(el, { tone: verdict.correct ? 'red' : 'sign', haptic: verdict.correct ? 'lock' : 'miss' })

      const gained = verdict.correct
        ? Math.round(
            (120 + 90 * Math.max(0, Math.min(1, secondsLeft / total))) *
              Math.min(MAX_MULTIPLIER, Math.max(1, run.combo + 1)),
          )
        : 0

      setFeedback({ correct: verdict.correct, card: verdict.card, position: verdict.position })
      if (!verdict.correct) setMissed((old) => [...old, verdict.card.id])
      setBoard(verdict.board)
      if (gained > 0) setBurst({ points: gained, combo: run.combo + 1 })
      if (verdict.correct && run.combo + 1 >= 4) setCelebrate(true)

      setRun((previous) => {
        const combo = verdict.correct ? previous.combo + 1 : 0
        const lives = verdict.correct ? previous.lives : previous.lives - 1
        const placed = previous.placed + 1
        return {
          placed,
          lives,
          score: previous.score + gained,
          combo,
          bestCombo: Math.max(previous.bestCombo, combo),
          correct: previous.correct + (verdict.correct ? 1 : 0),
          history: [...previous.history, verdict.correct],
          over: lives <= 0 || placed >= TIMELINE_LENGTH,
        }
      })
    },
    [hand, locked, run.combo, run.over, run.placed, secondsLeft, seed, cursor, total],
  )

  const pick = useCallback(
    (slot: number, event: React.MouseEvent<HTMLButtonElement>) => {
      void resolve(slot, event.currentTarget)
    },
    [resolve],
  )

  /** the clock — running out places the card in the worst slot, which is a miss */
  useEffect(() => {
    if (run.over || locked || !hand || coachOpen) return
    setSecondsLeft(total)
    const started = Date.now()
    const tick = window.setInterval(() => {
      const left = total - Math.floor((Date.now() - started) / 1000)
      setSecondsLeft(Math.max(0, left))
      if (left <= 0) {
        window.clearInterval(tick)
        // -1 can never be the right slot, so a timeout grades as a miss without
        // pretending the player guessed something.
        void resolve(-1)
      }
    }, 200)
    return () => window.clearInterval(tick)
    // the clock belongs to the CARD, so it restarts on the card index and nothing else
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.placed, run.over, locked, coachOpen])

  /** after the feedback has been read, the next card deals itself */
  useEffect(() => {
    if (!feedback) return
    const wait = window.setTimeout(() => {
      setFeedback(null)
      setBurst(null)
      setCelebrate(false)
      setLocked(false)
    }, 1700)
    return () => window.clearTimeout(wait)
  }, [feedback])

  if (run.over && !feedback)
    return <Result run={run} board={board} seed={seed} cursor={cursor} missed={missed} queue={queue} />

  const fraction = total > 0 ? Math.max(0, secondsLeft / total) : 0

  return (
    <div className="relative">
      {celebrate && <Confetti />}
      {burst && <Burst points={burst.points} combo={burst.combo} />}

      {/* the bar */}
      <div className="sticky top-0 z-20 -mx-gutter bg-sheet/95 px-gutter pb-2 pt-2 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <ol className="flex items-center gap-1.5" aria-label={t('run.lives')}>
            {Array.from({ length: LIVES }, (_, index) => (
              <li
                key={index}
                className={`h-3.5 w-3.5 border-hair border-ink transition-all duration-press ${
                  index < run.lives ? 'bg-red' : 'bg-transparent opacity-40'
                }`}
              />
            ))}
          </ol>
          <p className="font-poster text-[26px] leading-none text-ink">
            <Num>{run.score}</Num>
          </p>
          <p className="font-mono text-[11px] tabular-nums text-muted">
            <Num>{`${run.placed + (run.over ? 0 : 1)}/${TIMELINE_LENGTH}`}</Num>
          </p>
        </div>
        <div className="mt-1.5 h-1.5 w-full bg-ink/15">
          <div
            className={`h-full transition-[width] duration-200 ease-linear ${
              fraction <= 0.28 ? 'bg-red' : 'bg-ink'
            }`}
            style={{ width: `${fraction * 100}%` }}
          />
        </div>
      </div>

      {/* the card in hand */}
      {hand && !feedback && (
        <div className="mt-2.5 border-plate border-ink bg-red px-4 py-3">
          <p className="font-body text-[10px] font-extrabold tracking-widest text-ink">
            {voiceAction(13, 'where')}
          </p>
          <p className="mt-1 font-display text-step-2 leading-tight text-paper">{hand.title}</p>
          {hand.hint !== '' && (
            <p className="mt-1 font-mono text-[11px] text-ink">
              <bdi>{hand.hint}</bdi>
            </p>
          )}
        </div>
      )}

      {/* the verdict on the card just played */}
      {feedback && (
        <div
          className={`mt-2.5 border-plate border-ink px-4 py-3 ${
            feedback.correct ? 'bg-red' : 'bg-ink'
          }`}
        >
          <p className="font-body text-[10px] font-extrabold tracking-widest text-paper/80">
            {feedback.correct ? t('timeline.right') : t('timeline.wrong')}
          </p>
          <p className="mt-1 font-display text-step-2 leading-tight text-paper">
            {feedback.card.title}
          </p>
          <p className="mt-1 font-mono text-[13px] text-paper">
            <Num>{formatDate(feedback.card.on)}</Num>
          </p>
        </div>
      )}

      {/* §22: "תנסה לסדר את הזיכרון." — then the rule, once */}
      {run.placed === 0 && <p className="mt-3 font-display text-step-0 leading-tight text-ink">{voiceAction(13, 'orderIntro')}</p>}
      <p className="mt-1 font-body text-[11.5px] leading-snug text-muted">{t('timeline.note')}</p>

      {/* the board, with a slot between every pair */}
      <ol className="mt-2">
        <Slot index={0} disabled={locked || !hand} onPick={pick} />
        {board.map((card, index) => (
          <li key={card.id}>
            <div
              className={`border-rule border-ink bg-sheet px-3 py-2.5 ${
                feedback?.card.id === card.id
                  ? feedback.correct
                    ? 'outline outline-4 outline-offset-2 outline-red'
                    : 'animate-shake outline outline-4 outline-offset-2 outline-sign'
                  : ''
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 font-sign text-step-0 leading-tight text-ink">
                  {card.title}
                </span>
                <span className="shrink-0 font-mono text-[12px] tabular-nums text-red">
                  <Num>{formatDate(card.on)}</Num>
                </span>
              </div>
            </div>
            <Slot index={index + 1} disabled={locked || !hand} onPick={pick} />
          </li>
        ))}
      </ol>
    </div>
  )
}

/** One gap on the board. The whole game is choosing between these. */
function Slot({
  index,
  disabled,
  onPick,
}: {
  index: number
  disabled: boolean
  onPick: (slot: number, event: React.MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => onPick(index, event)}
      aria-label={t('timeline.slot', { n: String(index + 1) })}
      className="group my-1 flex min-h-tap w-full items-center justify-center border-hair border-dashed border-ink/45 transition-colors duration-press ease-stamp hover:border-red hover:bg-red/10 disabled:opacity-0 motion-reduce:transition-none"
    >
      <span className="font-body text-[11px] font-extrabold tracking-widest text-muted group-hover:text-red">
        {t('timeline.here')}
      </span>
    </button>
  )
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
