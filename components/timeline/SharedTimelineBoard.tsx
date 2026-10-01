'use client'
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react'
import {Burst} from '@/components/play/Burst'
import {Confetti} from '@/components/play/Confetti'
import {Num} from '@/components/ui/Num'
import {firePickFxAt} from '@/components/stage/PickFx'
import {LIVES,MAX_MULTIPLIER} from '@/lib/game/session'
import {formatDate,secondsFor,type BlindCard,type DatedCard} from '@/lib/game/timeline-run'
import type {InsertVerdict} from '@/lib/game/timeline-engine'
export type TimelineCopy={lives:string;where:string;right:string;wrong:string;intro:string;note:string;slot:string;here:string;error:string}
export type ResultProps={run:Run;board:DatedCard[];seed:number;cursor:number;missed:string[];queue:BlindCard[]}
export type Run = {
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

export function SharedTimelineBoard({
  anchor,
  queue,
  seed,
  cursor = 0,
  submit, renderResult, copy, coachOpen = false,
}: {
  anchor: DatedCard
  queue: BlindCard[]
  seed: number
  cursor?: number
  submit: (seed:number, placed:number, slot:number, cursor:number) => Promise<InsertVerdict | null>
  renderResult: (props: ResultProps) => ReactNode
  copy: TimelineCopy
  coachOpen?: boolean
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
  const [error, setError] = useState(false)
  const inFlight = useRef(false)
  const length = queue.length

  const hand = queue[run.placed] ?? null
  const total = secondsFor(run.placed)

  const resolve = useCallback(
    async (slot: number, el?: HTMLElement) => {
      if (inFlight.current || locked || !hand || run.over) return
      inFlight.current = true
      setError(false)
      setLocked(true)
      let verdict: InsertVerdict | null
      try { verdict = await submit(seed, run.placed, slot, cursor) } catch { verdict = null }
      if (!verdict) {
        inFlight.current = false
        setError(true)
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
          over: lives <= 0 || placed >= length,
        }
      })
    },
    [hand, locked, run.combo, run.over, run.placed, secondsLeft, seed, cursor, total, length, submit],
  )

  const pick = useCallback(
    (slot: number, event: React.MouseEvent<HTMLButtonElement>) => {
      void resolve(slot, event.currentTarget)
    },
    [resolve],
  )

  /** the clock — running out places the card in the worst slot, which is a miss */
  useEffect(() => {
    if (run.over || locked || !hand || coachOpen || error) return
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
  }, [run.placed, run.over, locked, coachOpen, error])

  /** after the feedback has been read, the next card deals itself */
  useEffect(() => {
    if (!feedback) return
    const wait = window.setTimeout(() => {
      setFeedback(null)
      setBurst(null)
      setCelebrate(false)
      inFlight.current = false
      setLocked(false)
    }, 1700)
    return () => window.clearTimeout(wait)
  }, [feedback])

  if (run.over && !feedback)
    return renderResult({run, board, seed, cursor, missed, queue})

  const fraction = total > 0 ? Math.max(0, secondsLeft / total) : 0

  return (
    <div className="relative" data-testid="timeline-board">
      {error && <p role="alert" className="my-3 border-rule border-ink p-3">{copy.error}</p>}
      {celebrate && <Confetti />}
      {burst && <Burst points={burst.points} combo={burst.combo} />}

      {/* the bar */}
      <div className="sticky top-0 z-20 -mx-gutter bg-sheet/95 px-gutter pb-2 pt-2 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <ol className="flex items-center gap-1.5" aria-label={copy.lives}>
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
            <Num>{`${run.placed + (run.over ? 0 : 1)}/${length}`}</Num>
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
        <div data-testid="timeline-hand" data-card-id={hand.id} className="mt-2.5 border-plate border-ink bg-red px-4 py-3">
          <p className="font-body text-[10px] font-extrabold tracking-widest text-ink">
            {copy.where}
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
          role="status" aria-live="polite"
          className={`mt-2.5 border-plate border-ink px-4 py-3 ${
            feedback.correct ? 'bg-red' : 'bg-ink'
          }`}
        >
          <p className="font-body text-[10px] font-extrabold tracking-widest text-paper/80">
            {feedback.correct ? copy.right : copy.wrong}
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
      {run.placed === 0 && <p className="mt-3 font-display text-step-0 leading-tight text-ink">{copy.intro}</p>}
      <p className="mt-1 font-body text-[11.5px] leading-snug text-muted">{copy.note}</p>

      {/* the board, with a slot between every pair */}
      <ol className="mt-2">
        <Slot copy={copy} index={0} disabled={locked || !hand} onPick={pick} />
        {board.map((card, index) => (
          <li key={card.id} data-testid="timeline-entry" data-card-id={card.id}>
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
            <Slot copy={copy} index={index + 1} disabled={locked || !hand} onPick={pick} />
          </li>
        ))}
      </ol>
    </div>
  )
}

/** One gap on the board. The whole game is choosing between these. */
function Slot({
  copy,
  index,
  disabled,
  onPick,
}: {
  copy: TimelineCopy
  index: number
  disabled: boolean
  onPick: (slot: number, event: React.MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => onPick(index, event)}
      aria-label={copy.slot.replace('{n}', String(index + 1))}
      className="group my-1 flex min-h-tap w-full items-center justify-center border-hair border-dashed border-ink/45 transition-colors duration-press ease-stamp hover:border-red hover:bg-red/10 disabled:opacity-0 motion-reduce:transition-none"
    >
      <span className="font-body text-[11px] font-extrabold tracking-widest text-muted group-hover:text-red">
        {copy.here}
      </span>
    </button>
  )
}

