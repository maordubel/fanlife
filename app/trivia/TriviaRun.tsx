'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { Burst } from '@/components/play/Burst'
import { RevealBar, useReveal } from '@/components/play/Reveal'
import { ChoiceList, OrderPicker, PairMatcher, TrueFalse, YearScale, type AnswerValue } from '@/components/play/answers'
import { Num } from '@/components/ui/Num'
import type { PublicQuestion, Verdict } from '@/lib/game/questions/types'
import {
  NEW_SESSION,
  RUN_LENGTH,
  advance,
  isStageBreak,
  outcomeOf,
  secondsFor,
  stageCap,
  stageOf,
  type Session,
} from '@/lib/game/session'
import { HEAT_START, heatAfter, reactionFor, streakCall, type AnswerLog } from '@/lib/game/trivia-report'
import type { Topic } from '@/lib/game/topics'
import { haptic } from '@/lib/play/haptics'
import { recordAnswer } from '@/lib/profile/marks'
import { t, type MessageKey } from '@/lib/i18n'
import { microFeedback } from '@/lib/voice'
import { requestHint, submitAnswer } from './actions'
import { MatchReport } from './MatchReport'
import { StageBreak } from './StageBreak'
import { RunHud } from './RunHud'

/**
 * הריצה — twelve questions, six ways to answer, one screen.
 *
 * The loop is still `lib/game/session.ts` (rule 21): three stages, three lamps, a combo,
 * a clock. What Quick Pick v5 adds is the texture between the answers:
 *
 *  · **six interaction types** from `components/play/answers` — a tap, a tick, a
 *    true/false, a year on a scale, an order, a set of pairs;
 *  · **the explanation after right AND wrong** — what you knew is worth saying too;
 *  · **a reaction** chosen from how hard, how fast and how hot (never `Math.random`);
 *  · **auto-advance after 1,400 ms that any tap skips** — the feedback is readable and
 *    never a wait (brief §10), and the stage card between stages is skippable too;
 *  · **a derived hint** that costs 40 and the combo gain (practice: free).
 *
 * Server authority is untouched: the questions arrive without answers, every answer is
 * graded by id on the server, and this component learns the truth only after committing.
 * Each graded answer is written into the device's revenge ledger (`lib/profile/marks`).
 */

export type RunMode = 'mix' | 'surprise' | 'revenge'

const ADVANCE_MS = 1400

type Hint = { text?: string; strike?: string[] }

export function TriviaRun({
  questions,
  seed,
  cursor,
  topic,
  era,
  hard,
  practice,
  mode,
  personal,
  revengeCount,
}: {
  questions: PublicQuestion[]
  seed: number
  cursor: number
  topic: Topic
  era: number | null
  hard: boolean
  practice: boolean
  mode: RunMode
  personal: boolean
  revengeCount: number | null
}) {
  const [started, setStarted] = useState(false)
  const [round, setRound] = useState(0)
  const [session, setSession] = useState<Session>(NEW_SESSION)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [locked, setLocked] = useState(false)
  const [hint, setHint] = useState<Hint | null>(null)
  const [hinted, setHinted] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(secondsFor(0))
  const [showStage, setShowStage] = useState<number | null>(null)
  const [log, setLog] = useState<AnswerLog[]>([])
  const [heat, setHeat] = useState(HEAT_START)
  const [burst, setBurst] = useState<{ points: number; combo: number } | null>(null)
  const [reaction, setReaction] = useState<{
    /** the reaction's words — a named reaction's key, or the Red Voice's line for a plain hit/miss */
    line: string
    sub: string | null
    points: number
    timeout: boolean
    /** the clock when the answer was committed — what `advance` scores, same as the burst */
    left: number
  } | null>(null)
  const [call, setCall] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const startedAt = useRef(Date.now())
  const busy = useRef(false)

  const index = session.index
  const question = questions[index]
  const total = practice ? 0 : secondsFor(index)
  const cap = stageCap(index)
  const done = session.over || index >= questions.length

  /** one place a question ends, whatever ended it */
  const settle = useCallback(
    (result: Verdict | null, left: number, timeout: boolean) => {
      if (!question) return
      const correct = result?.correct ?? false
      const outcome = { correct, difficulty: result?.difficulty ?? question.difficulty, secondsLeft: left, total, hinted, cap }
      const { gained, combo } = outcomeOf(session, outcome)
      const entry: AnswerLog = {
        id: question.id,
        type: question.type,
        topic: question.topic,
        difficulty: question.difficulty,
        correct,
        hinted,
        elapsed: practice ? 0 : Math.max(0, total - left),
        timeout,
      }
      const run = correct ? trailingStreak([...log, entry]) : 0
      const picked = reactionFor(entry, run, index)
      const spoken = picked.key
        ? { line: t(picked.key as MessageKey), sub: t(`${picked.key}.sub` as MessageKey) }
        : microFeedback(2, correct ? 'correct' : 'wrong', seed, index)
      setVerdict(result)
      setReaction({ line: spoken?.line ?? '', sub: spoken?.sub ?? null, points: gained, timeout, left })
      setLog((current) => [...current, entry])
      setHeat((current) => heatAfter(current, entry))
      recordAnswer(question.id, correct)
      if (correct) {
        setBurst({ points: gained, combo: Math.max(1, combo) })
        haptic('lock')
        setCall(streakCall(run))
      } else {
        haptic('miss')
        setCall(null)
      }
      setAnnouncement(
        correct
          ? t('trivia.announceCorrect', {
              points: String(gained),
              combo: String(combo),
              lives: String(session.lives),
            })
          : t('trivia.announceWrong', { lives: String(session.lives - 1) }),
      )
    },
    [question, total, hinted, cap, session, log, practice, index, seed],
  )

  const next = useCallback(() => {
    if (!question || (!verdict && !reaction)) return
    const correct = verdict?.correct ?? false
    const after = advance(session, {
      correct,
      difficulty: verdict?.difficulty ?? question.difficulty,
      secondsLeft: reaction?.left ?? 0,
      total,
      hinted,
      cap,
    })
    setVerdict(null)
    setReaction(null)
    setBurst(null)
    setHint(null)
    setHinted(false)
    setLocked(false)
    busy.current = false
    setSession(after)
    if (!after.over && isStageBreak(after.index)) setShowStage(stageOf(after.index))
    startedAt.current = Date.now()
  }, [question, verdict, reaction, session, total, hinted, cap])

  const reveal = useReveal({ ms: ADVANCE_MS, onDone: next, active: reaction !== null && !done })

  /** the clock — only while a question is live, never in practice */
  useEffect(() => {
    if (!started || done || showStage !== null || locked || !question || practice) return
    setSecondsLeft(total)
    const opened = Date.now()
    const tick = window.setInterval(() => {
      const left = total - (Date.now() - opened) / 1000
      if (left > 0) {
        setSecondsLeft(left)
        return
      }
      window.clearInterval(tick)
      setSecondsLeft(0)
      if (busy.current) return
      busy.current = true
      setLocked(true)
      void submitAnswer(question.id, '__timeout__').then((result) => settle(result, 0, true))
    }, 100)
    return () => window.clearInterval(tick)
  }, [started, done, showStage, locked, question, practice, total, settle, index])

  useEffect(() => {
    if (!call) return
    const off = window.setTimeout(() => setCall(null), 900)
    return () => window.clearTimeout(off)
  }, [call])

  function answer(value: AnswerValue) {
    if (!question || busy.current) return
    busy.current = true
    setLocked(true)
    const left = practice ? 0 : secondsLeft
    void submitAnswer(question.id, value).then((result) => settle(result, left, false))
  }

  function askHint() {
    if (!question || locked || hinted) return
    haptic('tap')
    setHinted(true)
    void requestHint(question.id, seed).then((result) => {
      if (!result) return
      if (result.kind === 'strike') setHint({ strike: result.strike ?? [] })
      else if (result.kind === 'decade') setHint({ text: t('trivia.hint.decade', { decade: result.text ?? '' }) })
      else setHint({ text: t('trivia.hint.context', { text: result.text ?? '' }) })
    })
  }

  function again() {
    setSession(NEW_SESSION)
    setLog([])
    setHeat(HEAT_START)
    setVerdict(null)
    setReaction(null)
    setHint(null)
    setHinted(false)
    setLocked(false)
    busy.current = false
    setRound((value) => value + 1)
    setStarted(true)
  }

  if (!started)
    return (
      <Ready
        count={questions.length}
        practice={practice}
        onStart={() => {
          haptic('lock')
          startedAt.current = Date.now()
          setStarted(true)
        }}
      />
    )

  if (done)
    return (
      <MatchReport
        key={round}
        session={session}
        log={log}
        seed={seed}
        cursor={cursor}
        topic={topic}
        era={era}
        hard={hard}
        practice={practice}
        mode={mode}
        personal={personal}
        ids={questions.map((item) => item.id)}
        revengeCount={revengeCount}
        onAgain={again}
      />
    )

  if (!question) return null
  const stage = stageOf(index)
  const graded = verdict ? { correct: verdict.correct, correctAnswers: verdict.correctAnswers } : null
  const answerProps = { options: question.options, locked, graded, struck: hint?.strike, onAnswer: answer }

  return (
    <>
      {showStage !== null && <StageBreak stage={showStage} practice={practice} onDone={() => setShowStage(null)} />}

      <RunHud
        session={session}
        secondsLeft={secondsLeft}
        total={total}
        cap={cap}
        heat={heat}
        practice={practice}
        call={call ? t(call as MessageKey) : null}
      />

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div key={`${round}:${index}`} className={`relative mt-3 animate-slam ${verdict && !verdict.correct ? 'animate-shake' : ''}`}>
        {burst && <Burst points={burst.points} combo={burst.combo} />}

        <div className={`relative border-rule border-ink bg-sheet p-4 ${verdict?.correct ? 'animate-flash' : ''}`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-latin text-[10px] font-bold tracking-[0.2em] text-red" dir="ltr">
              {String(index + 1).padStart(2, '0')} / {RUN_LENGTH} · S{stage + 1}
            </span>
            <Pill strong>{t(`trivia.type.${question.type}` as MessageKey)}</Pill>
            <Pill>{t('trivia.pill.difficulty', { d: String(question.difficulty) })}</Pill>
            <Pill>{t(`trivia.lobby.topic.${question.topic}` as MessageKey)}</Pill>
          </div>

          {question.quoteHe && (
            <blockquote className="mt-3 border-s-[4px] border-red ps-3">
              <p className="font-display text-step-2 leading-tight text-ink">{`”${question.quoteHe}“`}</p>
              {question.quoteByHe && (
                <footer className="mt-1 font-body text-[12px] tracking-wide text-muted">{question.quoteByHe}</footer>
              )}
            </blockquote>
          )}

          <h2 className={`mt-2 font-display leading-snug text-ink ${question.quoteHe ? 'text-step-1' : 'text-step-2'}`}>
            {question.prompt}
          </h2>
          <p className="mt-1 font-body text-[12px] text-muted">{t(`trivia.how.${question.type}` as MessageKey)}</p>
        </div>

        <div className="mt-3" data-answers={question.type}>
          {question.type === 'mcq' && <ChoiceList {...answerProps} />}
          {question.type === 'multi' && <ChoiceList {...answerProps} pickCount={question.pickCount} />}
          {question.type === 'tf' && <TrueFalse {...answerProps} />}
          {question.type === 'year' && <YearScale {...answerProps} />}
          {question.type === 'order' && <OrderPicker {...answerProps} />}
          {question.type === 'match' && <PairMatcher {...answerProps} left={question.left} />}
        </div>

        {!reaction && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={askHint}
              disabled={locked || hinted}
              className="min-h-tap border-rule border-ink bg-paper px-3 font-body text-step--1 font-extrabold text-ink transition-transform duration-press active:scale-[.96] disabled:opacity-45 motion-reduce:transition-none"
            >
              {practice ? t('trivia.hint.free') : t('trivia.hint.cost')}
            </button>
            {hint?.text && <p className="min-w-0 flex-1 font-body text-step--1 font-bold text-ink">{hint.text}</p>}
            {hint?.strike && hint.strike.length > 0 && (
              <p className="min-w-0 flex-1 font-body text-[12px] text-muted">{t('trivia.hint.struck')}</p>
            )}
          </div>
        )}

        {reaction && (
          <Feedback
            correct={verdict?.correct ?? false}
            line={reaction.line}
            sub={reaction.sub}
            points={reaction.points}
            timeout={reaction.timeout}
            hinted={hinted}
            practice={practice}
            explanation={verdict?.explanation ?? ''}
            answer={verdict && !verdict.correct && (question.type === 'mcq' || question.type === 'year') ? verdict.correctAnswers.join(' · ') : null}
            hits={verdict && question.type === 'multi' && !verdict.correct ? verdict.hits : null}
            tf={question.type === 'tf' && verdict ? verdict.correctAnswers[0] === 'true' : null}
            progress={reveal.progress}
            onNext={reveal.skip}
          />
        )}
      </div>
    </>
  )
}

function trailingStreak(log: readonly AnswerLog[]): number {
  let run = 0
  for (let at = log.length - 1; at >= 0 && log[at]?.correct; at -= 1) run += 1
  return run
}

function Pill({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span
      className={`border-hair px-1.5 py-0.5 font-body text-[11px] font-bold leading-none ${
        strong ? 'border-ink bg-ink text-paper' : 'border-ink/40 text-ink'
      }`}
    >
      {children}
    </span>
  )
}

/** the verdict plate — the reaction, the points, and what the archive says, every time */
function Feedback({
  correct,
  line,
  sub,
  points,
  timeout,
  hinted,
  practice,
  explanation,
  answer,
  hits,
  tf,
  progress,
  onNext,
}: {
  correct: boolean
  line: string
  sub: string | null
  points: number
  timeout: boolean
  hinted: boolean
  practice: boolean
  explanation: string
  answer: string | null
  hits: number | null
  tf: boolean | null
  progress: number
  onNext: () => void
}) {
  return (
    <button
      type="button"
      onClick={onNext}
      data-feedback=""
      className={`mt-3 block w-full border-rule text-start ${correct ? 'border-red bg-red/[.08]' : 'border-ink bg-paper'}`}
      aria-label={t('trivia.feedback.next')}
    >
      <span className="flex items-start gap-3 px-3 pt-3">
        <span
          aria-hidden="true"
          className={`grid h-10 w-10 shrink-0 place-items-center font-poster text-[26px] leading-none ${
            correct ? 'bg-red text-sheet' : 'bg-ink text-paper'
          }`}
        >
          {correct ? '✓' : '✗'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-step-1 leading-tight text-ink">{line}</span>
          {sub && <span className="block font-body text-[12px] text-muted">{sub}</span>}
        </span>
        {correct && (
          <span className="shrink-0 font-poster text-[24px] leading-none text-red">
            <Num>{practice ? '—' : `+${points}`}</Num>
          </span>
        )}
      </span>
      <span className="block px-3 pb-2 pt-2 font-body text-step--1 leading-relaxed text-ink">
        {timeout && <span className="font-bold">{t('run.timeup')} · </span>}
        {tf !== null && !correct && (
          <span className="font-bold">{t(tf ? 'trivia.feedback.wasTrue' : 'trivia.feedback.wasFalse')} · </span>
        )}
        {answer && (
          <span className="font-bold">
            {t('trivia.feedback.answer')} <bdi>{answer}</bdi> ·{' '}
          </span>
        )}
        {hits !== null && <span className="font-bold">{t('trivia.feedback.hits', { hits: String(hits) })} · </span>}
        <span className="font-bold">{t(correct ? 'trivia.feedback.knew' : 'trivia.feedback.archive')}</span>{' '}
        {explanation}
        {hinted && !practice && correct && <span className="block text-[12px] text-muted">{t('trivia.feedback.hinted')}</span>}
      </span>
      <span className="flex items-center gap-3 px-3 pb-3">
        <span className="flex-1">
          <RevealBar progress={progress} />
        </span>
        <span className="font-body text-[12px] font-extrabold text-ink">{t('trivia.feedback.tap')}</span>
      </span>
    </button>
  )
}

/** one tap before the clock starts, so a run never begins while the page is loading */
function Ready({ onStart, count, practice }: { onStart: () => void; count: number; practice: boolean }) {
  return (
    <div className="mt-stack border-rule border-ink bg-ink p-6 text-center">
      <p className="font-latin text-[10px] font-bold tracking-[0.28em] text-red" dir="ltr">
        GATE 2 · QUICK PICK
      </p>
      <p className="mt-3 font-poster text-[64px] leading-none text-paper">
        <Num>{Math.min(count, RUN_LENGTH)}</Num>
      </p>
      <p className="font-body text-step-0 text-concrete">{t('trivia.ready.types')}</p>
      <p className="mx-auto mt-3 max-w-[32ch] font-body text-step--1 leading-relaxed text-concrete">
        {practice ? t('trivia.ready.practice') : t('trivia.ready.rule')}
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-5 flex min-h-tap w-full items-center justify-center bg-red px-4 font-display text-step-2 text-paper transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none"
      >
        {t('trivia.lobby.go')}
      </button>
    </div>
  )
}
