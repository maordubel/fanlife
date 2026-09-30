'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { Num } from '@/components/ui/Num'
import {
  BALLOT,
  NUMBERS,
  POSITIONS,
  isPositionCode,
  legacyPositionCode,
  positionLabel,
  type Ballot,
  type PollQuestion,
  type Tally,
} from '@/lib/polls/ballot'
import { isPlayerId } from '@/lib/archive/player-identity'
import {
  boardDisplay,
  histogramBars,
  mergeLegacyRows,
  positionBars,
  rankRows,
  type BoardRow,
} from '@/lib/polls/board'
import { activeStore } from '@/lib/polls/store'
import { t } from '@/lib/i18n'

/**
 * לוח הספירה — gate 7's second screen, reached only from a sealed slip.
 *
 * `lib/polls/board.ts` decides, per question, which of three shapes to draw: the
 * honesty plate (no votes, or only this device's), exact integers (under a hundred),
 * or percentages and bars (a hundred or more). `LocalBallotStore.tally()` always
 * resolves to `null` — this build has no live table behind it — so in production every
 * card on this screen renders the honesty plate today. The other two shapes exist and
 * are exercised by `tests/polls.test.ts` with fixture tallies, exactly as the brief
 * asks: built and covered, never seeded into the product to look busy (rule 11).
 *
 * **No "מוקאפ" badge.** The reference marks its whole board with one because every
 * number on it is invented for the demonstration. This screen never prints an invented
 * number, so it needs no warning label — the honesty plate IS the label, on every
 * question that has nothing behind it yet.
 */
export function CountBoard({
  names,
  legacy,
}: {
  /** id → the name to print */
  names: Readonly<Record<string, string>>
  /** a legacy display name (or alias) → the id it belongs to */
  legacy: Readonly<Record<string, string>>
}) {
  const store = useMemo(() => activeStore(), [])
  /** One key per answer: an id or a code, whatever build cast it. */
  const canonical = useCallback(
    (pick: string): string | null => {
      if (isPlayerId(pick) || isPositionCode(pick)) return pick
      return legacy[pick] ?? legacyPositionCode(pick)
    },
    [legacy],
  )
  /** How a key is printed. */
  const label = useCallback(
    (pick: string): string => names[pick] ?? positionLabel(pick) ?? pick,
    [names],
  )
  const [ballot, setBallot] = useState<Ballot>({})
  const [tallies, setTallies] = useState<Record<string, Tally | null>>({})
  const [ready, setReady] = useState(false)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    let live = true
    void Promise.all([store.read(), Promise.all(BALLOT.map((question) => store.tally(question.id)))]).then(
      ([saved, tallyList]) => {
        if (!live) return
        const map: Record<string, Tally | null> = {}
        BALLOT.forEach((question, index) => {
          map[question.id] = mergeLegacyRows(tallyList[index] ?? null, canonical)
        })
        // an unmigrated slip still reads right: its picks go through the same keys
        const mine: Ballot = {}
        for (const [id, pick] of Object.entries(saved)) mine[id] = canonical(pick) ?? pick
        setBallot(mine)
        setTallies(map)
        setReady(true)
      },
    )
    return () => {
      live = false
    }
  }, [store, canonical])

  if (!ready) return null

  const currentQuestion = BALLOT[current] ?? BALLOT[0]!

  return (
    <div className="mt-stack">
      {/* the question strip — mobile navigates one at a time; md+ shows all eight below */}
      <nav aria-label={t('poll.board.questionsNav')} className="border-y-hair border-ink/35 py-1.5 md:hidden">
        <ol className="flex gap-1.5">
          {BALLOT.map((question, index) => (
            <li key={question.id} className="flex-1">
              <button
                type="button"
                onClick={() => setCurrent(index)}
                aria-current={index === current ? 'true' : undefined}
                className={`flex h-[26px] w-full items-center justify-center font-poster text-[13px] leading-none transition-transform duration-press ease-stamp active:scale-[.94] motion-reduce:transition-none ${
                  index === current ? 'bg-red text-sheet' : 'border-hair border-ink/40 text-muted'
                }`}
              >
                <Num>{String(index + 1)}</Num>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-3 md:hidden">
        <QuestionCard
          question={currentQuestion}
          tally={tallies[currentQuestion.id] ?? null}
          myPick={ballot[currentQuestion.id] ?? null}
          label={label}
        />
      </div>

      <div className="mt-3 flex gap-2 md:hidden">
        <button
          type="button"
          onClick={() => setCurrent((index) => (index + 1) % BALLOT.length)}
          className="flex min-h-tap flex-1 items-center justify-center bg-red font-body text-[16px] font-extrabold text-sheet transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
        >
          {t('poll.board.nextQuestion')}
        </button>
        <Link
          href="/polls"
          className="flex min-h-tap shrink-0 items-center justify-center border-rule border-ink bg-sheet px-3.5 font-body text-[14px] font-extrabold text-ink transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
        >
          {t('poll.board.myBallot')}
        </Link>
      </div>

      {/* desktop: every question at once, two columns (B3) */}
      <div className="hidden md:mt-3 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-4">
        {BALLOT.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            tally={tallies[question.id] ?? null}
            myPick={ballot[question.id] ?? null}
            label={label}
          />
        ))}
      </div>

      <div className="mt-stack border-rule border-ink bg-ink p-4">
        <p className="font-body text-[9.5px] font-extrabold tracking-[0.2em] text-red">
          {t('poll.board.howWeCount')}
        </p>
        <p className="mt-1.5 font-body text-[12.5px] leading-relaxed text-concrete">
          {t('poll.board.howWeCountBody')}
        </p>
      </div>
    </div>
  )
}

function QuestionCard({
  question,
  tally,
  myPick,
  label,
}: {
  question: PollQuestion
  tally: Tally | null
  myPick: string | null
  /** how a stored key (an id, a code, a number) is printed */
  label: (pick: string) => string
}) {
  const display = boardDisplay(tally, myPick)
  return (
    <div className="border-rule border-ink bg-paper p-3.5">
      <div className="flex items-end justify-between gap-2.5">
        <p className="min-w-0 font-sign text-[18px] leading-tight text-ink">{t(question.ask)}</p>
        {display.kind !== 'honest' && (
          <div className="shrink-0 text-end">
            <p className="font-poster text-[26px] leading-[.85] text-ink">
              <Num>{String(display.total)}</Num>
            </p>
            <p className="mt-0.5 font-body text-[8px] font-extrabold tracking-[0.16em] text-muted">
              {t('poll.board.ballots')}
            </p>
          </div>
        )}
      </div>

      <div className="mt-3">
        {display.kind === 'honest' && <HonestCard myPick={display.myPick === null ? null : label(display.myPick)} />}
        {display.kind === 'raw' && (
          <CountedBody question={question} tally={tally} total={display.total} percent={false} remaining={display.remaining} label={label} />
        )}
        {display.kind === 'percent' && (
          <CountedBody question={question} tally={tally} total={display.total} percent={true} remaining={0} label={label} />
        )}
      </div>

      {display.kind !== 'honest' && display.myPick !== null && (
        <YourPick pick={label(display.myPick)} majority={display.myMajority} />
      )}
    </div>
  )
}

/** no votes yet, or only your own — the same voice the sealed slip already uses */
function HonestCard({ myPick }: { myPick: string | null }) {
  return (
    <div className="border-rule border-ink bg-ink p-4">
      <p className="font-body text-[9.5px] font-extrabold tracking-[0.2em] text-red">{t('poll.noCount')}</p>
      <p className="mt-1.5 font-body text-[12.5px] leading-relaxed text-concrete">{t('poll.noCountBody')}</p>
      {myPick !== null && (
        <div className="mt-3.5 flex items-center gap-2.5 border-hair border-concrete/40 p-2.5">
          <span aria-hidden="true" className="block h-5 w-5 shrink-0 border-2 border-red bg-red" />
          <div className="min-w-0">
            <p className="font-body text-[9.5px] font-extrabold tracking-[0.16em] text-concrete">
              {t('poll.board.yours')}
            </p>
            <p className="mt-0.5 truncate font-sign text-[15px] font-bold text-sheet">{myPick}</p>
          </div>
        </div>
      )}
      <Link
        href="/polls"
        className="mt-3.5 flex min-h-tap items-center justify-center bg-red font-body text-[16px] font-extrabold text-sheet transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
      >
        {t('poll.board.shareQuestion')}
      </Link>
    </div>
  )
}

/** a real count exists — raw integers under 100, ranked bars at 100 and above */
function CountedBody({
  question,
  tally,
  total,
  percent,
  remaining,
  label,
}: {
  question: PollQuestion
  tally: Tally | null
  total: number
  percent: boolean
  remaining: number
  label: (pick: string) => string
}) {
  const named = (rows: BoardRow[]): BoardRow[] => rows.map((row) => ({ ...row, pick: label(row.pick) }))
  if (question.kind === 'number') {
    if (percent) return <Histogram tally={tally} />
    // Under a hundred a histogram is still a shape claim, so the shirt-number question
    // falls back to the same plain, no-bar list every other question uses below 100 —
    // only the numbers that actually received a vote, exactly like a name.
    const cast = histogramBars(tally, NUMBERS)
      .filter((bar) => bar.votes > 0)
      .map((bar) => ({ pick: String(bar.n), votes: bar.votes }))
    return <RawList rows={rankRows(cast, total)} remaining={remaining} />
  }

  if (question.kind === 'position') {
    const rows = named(rankRows(positionBars(tally, POSITIONS), total))
    return percent ? <RankedRows rows={rows} /> : <RawList rows={rows} remaining={remaining} />
  }

  // roster — only the men who actually received a vote, printed by name
  const rows = named(rankRows(tally?.rows ?? [], total))
  return percent ? <RankedRows rows={rows} /> : <RawList rows={rows} remaining={remaining} />
}

/** ≥100 ballots: dotted-leader ranked rows, top three vermilion, a bar under each */
function RankedRows({ rows }: { rows: BoardRow[] }) {
  return (
    <ol>
      {rows.map((row, index) => (
        <li key={row.pick} className={index > 0 ? 'mt-2.5' : undefined}>
          <div className="flex items-baseline gap-2">
            <span className={`shrink-0 font-poster text-[15px] leading-none ${row.top ? 'text-red' : 'text-muted'}`}>
              <Num>{String(index + 1)}</Num>
            </span>
            <span className="min-w-0 flex-1 truncate font-sign text-[15px] font-bold leading-tight text-ink">
              {row.pick}
            </span>
            <span aria-hidden="true" className="-translate-y-[3px] min-w-[10px] flex-1 border-b border-dotted border-ink/35" />
            <span className="shrink-0 font-mono text-[13px] font-bold text-ink">
              <Num>{`${row.pct}%`}</Num>
            </span>
          </div>
          <div className="mt-1 h-[14px] border-hair border-ink/55 bg-ink/10">
            <div className={`h-full ${row.top ? 'bg-red' : 'bg-muted'}`} style={{ width: `${row.pct}%` }} />
          </div>
        </li>
      ))}
    </ol>
  )
}

/** <100 ballots: exact counts, no bar, no percent — plus the "עוד N" line (B3, rule 2) */
function RawList({ rows, remaining }: { rows: BoardRow[]; remaining: number }) {
  return (
    <>
      <ol>
        {rows.map((row, index) => (
          <li
            key={row.pick}
            className={`flex items-baseline gap-2 ${index > 0 ? 'mt-1.5 border-t-hair border-ink/20 pt-1.5' : ''}`}
          >
            <span className="min-w-0 flex-1 truncate font-sign text-[15px] font-bold leading-tight text-ink">
              {row.pick}
            </span>
            <span aria-hidden="true" className="-translate-y-[3px] min-w-[10px] flex-1 border-b border-dotted border-ink/30" />
            <span className="shrink-0 font-poster text-[16px] leading-none text-ink">
              <Num>{String(row.votes)}</Num>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-2.5 border-hair border-sign p-2 font-body text-[11.5px] leading-relaxed text-sign">
        {t('poll.board.remaining', { n: String(remaining) })}
      </p>
    </>
  )
}

/** the shirt-number question, ≥100 ballots: a 24-column-and-up histogram, bottom-aligned,
 *  scrolling past the picker's own 1..99 range rather than cutting it down to fit a
 *  phone (B2's own picker offers every number a squad could carry — see `NUMBERS` in
 *  `lib/polls/ballot.ts` — and the count board keeps that same axis rather than
 *  narrowing the answer set to fit a chart) */
function Histogram({ tally }: { tally: Tally | null }) {
  const bars = histogramBars(tally, NUMBERS)
  const max = Math.max(1, ...bars.map((bar) => bar.votes))
  return (
    <div className="-mx-3.5 overflow-x-auto px-3.5">
      <ol className="flex h-[120px] items-end gap-[3px]">
        {bars.map((bar) => {
          const peak = bar.votes / max >= 0.6
          return (
            <li key={bar.n} className="flex h-full w-[16px] shrink-0 flex-col items-center justify-end gap-1">
              <span
                aria-hidden="true"
                className={`w-full border-x-hair border-t-hair ${peak ? 'border-ink/60 bg-red' : 'border-ink/40 bg-muted'}`}
                style={{ height: `${Math.round((bar.votes / max) * 100)}%` }}
              />
              <span className="font-poster text-[10px] leading-none text-muted">
                <Num>{String(bar.n)}</Num>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** always printed beside the count: your own pick, marked with or against the lead (brief) */
function YourPick({ pick, majority }: { pick: string; majority: boolean | null }) {
  return (
    <div className="relative mt-3.5 overflow-hidden border-rule border-ink bg-sheet">
      <div aria-hidden="true" className="screen-dots pointer-events-none absolute inset-0" />
      <div className="relative flex items-center gap-2.5 p-2.5">
        <span aria-hidden="true" className="block h-[22px] w-[22px] shrink-0 border-2 border-red bg-red" />
        <div className="min-w-0">
          <p className="font-body text-[9.5px] font-extrabold tracking-[0.16em] text-muted">
            {t('poll.board.yours')}
          </p>
          <p className="mt-0.5 truncate font-sign text-[15px] font-bold leading-tight text-ink">
            {pick}
            {majority !== null && (
              <span className={`ms-1.5 font-body text-[11px] font-extrabold ${majority ? 'text-red' : 'text-muted'}`}>
                — {majority ? t('poll.board.withMajority') : t('poll.board.againstMajority')}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
