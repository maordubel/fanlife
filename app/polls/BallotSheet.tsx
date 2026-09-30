'use client'

import { todayInIsrael } from '@/lib/date/israel'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BallotSlip } from '@/components/ballot/BallotSlip'
import { Manifesto } from '@/components/ballot/Manifesto'
import { QuestionStage } from '@/components/ballot/QuestionStage'
import { VoteReaction } from '@/components/ballot/VoteReaction'
import { RosterSheet } from '@/components/roster/RosterSheet'
import { firePickFx } from '@/components/stage/PickFx'
import { SlideSheet } from '@/components/stage/SlideSheet'
import { ReportLink } from '@/components/ui/ReportLink'
import type { RosterEntry, RosterIndex } from '@/lib/game/allTimeXI'
import { filterRoster, NO_FILTER } from '@/lib/game/roster-search'
import type { ShirtBoard } from '@/lib/xi/board'
import type { KitSpec } from '@/lib/kit/spec'
import {
  BALLOT,
  QUESTION_FILTER,
  ballotComplete,
  ballotFilled,
  legacyNames,
  migrateBallot,
  positionLabel,
  type Ballot,
  type PollQuestion,
} from '@/lib/polls/ballot'
import { pickFact } from '@/lib/polls/pickFact'
import type { Reasons } from '@/lib/polls/reasons'
import { shirtNumber, supporterId, supporterRecord } from '@/lib/polls/supporter'
import { activeStore } from '@/lib/polls/store'
import { wornBy, type NumberBoard } from '@/lib/polls/wore'
import { activeXI, migrateSheet, refResolver } from '@/lib/xi/store'
import { readBook, writeBook, type MemberBook } from '@/lib/game/member'
import { emit } from '@/lib/profile/events'
import { haptic } from '@/lib/play/haptics'
import { t, type MessageKey } from '@/lib/i18n'
import { resolveLegacyPicks } from './actions'

/**
 * פתק ההצבעה — the polls wing: one debate at a time, a slip that fills as you go, and a
 * manifesto at the seal (players.md §2, Gate 7 V3, 21.9.2026).
 *
 * A poll screen usually opens on a bar chart, and this one cannot: one voter behind it
 * and bars off a sample of one — or a seeded baseline — would be inventing the only thing
 * a poll is made of. So the screen is built around the ARTEFACT:
 *
 *  · **the stage** (`QuestionStage`) holds one question: the player questions open the
 *    shared roster sheet pre-filtered by the question — never a list of names the app
 *    featured — with the voter's own gate 1 eleven as optional shortcuts; the number is
 *    the 1–99 grid; the position is picked on a pitch;
 *  · **the beat** (`VoteReaction`) confirms the pick, prints what the archive holds on
 *    the man — or who wore the number, with sources — offers the "why" chips, and moves
 *    on: 2600ms with an archive row to read, 1500ms without; a tap goes now, "שיניתי את
 *    דעתי" cancels, Escape dismisses;
 *  · **the slip** (`BallotSlip`) is the progress rail under the stage;
 *  · **the seal** writes `book.supporter` through the progress layer
 *    (`emit({type:'ballot_sealed'})` — the favourite's id, the position's code, the
 *    reasons) and opens the manifesto.
 *
 * **Stored values are ids and codes** (players.md §3.3): a roster answer is the Player
 * Master's `p_…` id, a position is `GK`…`ST`. A slip saved before is migrated on read —
 * names through the master's own resolution on the server, labels through the position
 * table — written back to the device's paper WITHOUT casting, and anything that cannot be
 * moved stays as it was and is said on screen.
 *
 * The name on the shirt and the number on the back are the member book's fields
 * (`lib/game/member.ts`), not new ones: answering "איזה מספר" here changes the shirt in
 * gate 10, and signing in carries one name rather than two (rule 59).
 */
export function BallotSheet({
  roster,
  shirts,
  shirt,
  numbers,
  slugAliases,
}: {
  roster: RosterIndex
  /** the shirt join gate 1 already receives — used here for the men on the slip */
  shirts: ShirtBoard
  /** the club's own home kit, for the supporter's own shirt */
  shirt: KitSpec
  /** who wore which number, season-bound, sources sent once */
  numbers: NumberBoard
  /** retired slugs → ids, so the voter's gate 1 eleven can be read as shortcuts */
  slugAliases: Readonly<Record<string, string>>
}) {
  const store = useMemo(() => activeStore(), [])
  const [ballot, setBallot] = useState<Ballot>({})
  const [reasons, setReasons] = useState<Reasons>({})
  const [sealed, setSealed] = useState(false)
  const [ready, setReady] = useState(false)
  const [book, setBook] = useState<MemberBook | null>(null)
  const [stage, setStage] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [slipOpen, setSlipOpen] = useState(false)
  const [reacting, setReacting] = useState<{ question: PollQuestion; pick: string } | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [xiIds, setXiIds] = useState<string[]>([])
  const [lost, setLost] = useState<string[]>([])

  const byId = useMemo(() => new Map(roster.all.map((entry) => [entry.id ?? entry.slug, entry])), [roster.all])

  /**
   * The stage follows the question: when the next one takes it (after a beat, or a tap on
   * a slip row far below), the stage is brought back into view — never on the first paint.
   */
  const stageRef = useRef<HTMLDivElement | null>(null)
  const shownStage = useRef<number | null>(null)
  useEffect(() => {
    if (!ready) return
    if (shownStage.current !== null && shownStage.current !== stage) {
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
      stageRef.current?.scrollIntoView({ block: 'nearest', behavior: still ? 'auto' : 'smooth' })
    }
    shownStage.current = stage
  }, [stage, ready])

  // The saved slip is read AFTER mount, never during render — the server has no browser
  // storage. Legacy names go to the server once, to be answered with ids.
  useEffect(() => {
    let live = true
    void (async () => {
      const [saved, isSealed, savedReasons, xiBook] = await Promise.all([
        store.read(),
        store.sealed(),
        store.reasons(),
        activeXI().read(),
      ])
      const names = legacyNames(saved)
      const answers = names.length > 0 ? await resolveLegacyPicks(names).catch(() => ({})) : {}
      const lookup = answers as Record<string, string | null>
      const migrated = migrateBallot(saved, (name) => lookup[name] ?? null)
      if (migrated.changed.length > 0) void store.rewrite(migrated.ballot)
      const best = xiBook.best
      const eleven = best
        ? Object.values(migrateSheet(best, refResolver({ roster: roster.all, slugAliases })).sheet.picks)
        : []
      if (!live) return
      setBallot(migrated.ballot)
      setLost(migrated.unresolved)
      setSealed(isSealed)
      setReasons(savedReasons)
      setBook(readBook())
      setXiIds(eleven)
      const firstEmpty = BALLOT.findIndex((question) => (migrated.ballot[question.id] ?? '') === '')
      setStage(firstEmpty === -1 ? BALLOT.length - 1 : firstEmpty)
      setReady(true)
    })()
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once, on mount
  }, [store])

  /** How a stored pick is printed: an id → the roster's name; a code → its label. */
  const display = useCallback(
    (question: PollQuestion, pick: string): string => {
      if (question.kind === 'roster') return byId.get(pick)?.nameHe ?? pick
      if (question.kind === 'position') return positionLabel(pick) ?? pick
      return pick
    },
    [byId],
  )

  const question = BALLOT[stage] ?? (BALLOT[0] as PollQuestion)

  function cast(target: PollQuestion, pick: string) {
    const next: Ballot = { ...ballot, [target.id]: pick }
    setBallot(next)
    void store.save(target.id, pick)
    // the vote itself is anonymous (rule 76) — the progress layer hears the question only
    emit({ type: 'vote_cast', questionId: target.id })
    haptic('tap')
    // the ballot-slip stamp — the one pick effect the whole stage shares (delta 87)
    const at = document.activeElement as HTMLElement | null
    if (at && stageRef.current?.contains(at)) {
      const box = at.getBoundingClientRect()
      firePickFx(box.left + box.width / 2, box.top + box.height / 2, { tone: 'red', haptic: false })
    } else if (stageRef.current) {
      const box = stageRef.current.getBoundingClientRect()
      firePickFx(box.left + box.width / 2, box.top + Math.min(box.height, window.innerHeight) / 2, {
        tone: 'red',
        haptic: false,
      })
    }

    // The shirt number is the member book's own field, so answering it here answers it there.
    if (target.kind === 'number') {
      const value = shirtNumber(next)
      if (value !== null && book !== null && book.number !== value) {
        const updated = { ...book, number: value }
        setBook(updated)
        writeBook(updated)
      }
    }
    setSheetOpen(false)
    setReacting({ question: target, pick })
  }

  function markReason(questionId: string, reason: MessageKey) {
    setReasons((current) => {
      const draft = { ...current }
      if (draft[questionId] === reason) delete draft[questionId]
      else draft[questionId] = reason
      return draft
    })
    void store.saveReason(questionId, reason)
  }

  function saveName(value: string) {
    if (book === null) return
    const updated = { ...book, nameHe: value.slice(0, 18) }
    setBook(updated)
    writeBook(updated)
  }

  /** The next row with nothing in it, after `after` and wrapping; null when the slip is full. */
  function nextEmpty(after: PollQuestion, filled: Ballot): number | null {
    const from = BALLOT.findIndex((row) => row.id === after.id)
    for (let step = 1; step <= BALLOT.length; step += 1) {
      const at = (from + step) % BALLOT.length
      const candidate = BALLOT[at]
      if (candidate && (filled[candidate.id] ?? '') === '') return at
    }
    return null
  }

  function advance() {
    if (reacting === null) return
    const next = nextEmpty(reacting.question, ballot)
    setReacting(null)
    if (next !== null) setStage(next)
  }

  function seal() {
    if (!ballotComplete(ballot)) return
    setSealed(true)
    setCelebrate(true)
    void store.seal()
    // The seal is the wing's deed, and the supporter record goes on the member book —
    // ids, a code and message keys only — through the progress layer's one entry point.
    emit({
      type: 'ballot_sealed',
      supporter: supporterRecord(ballot, reasons, todayInIsrael()),
    })
    haptic('lock')
  }

  function fresh() {
    // A new slip clears the paper. The seal already on the member book stays (lib/game/member.ts).
    setBallot({})
    setReasons({})
    setSealed(false)
    setCelebrate(false)
    setStage(0)
    setLost([])
    void store.clear()
  }

  const filled = ballotFilled(ballot)
  const complete = ballotComplete(ballot)
  const supporter = useMemo(
    () => supporterId(ballot, reasons, book ?? {}, display),
    [ballot, reasons, book, display],
  )
  const favourite = useMemo(
    () => pickFact(ballot.favourite ?? null, roster.all, shirts),
    [ballot.favourite, roster.all, shirts],
  )
  const reactingFact = useMemo(
    () =>
      reacting === null || reacting.question.kind !== 'roster'
        ? null
        : pickFact(reacting.pick, roster.all, shirts),
    [reacting, roster.all, shirts],
  )
  const filter = useMemo(() => QUESTION_FILTER[question.id] ?? {}, [question.id])
  const fromXi = useMemo(() => {
    if (question.kind !== 'roster') return []
    const entries = xiIds.map((id) => byId.get(id)).filter((entry): entry is RosterEntry => entry !== undefined)
    return filterRoster(entries, { ...NO_FILTER, ...filter })
  }, [question, xiIds, byId, filter])

  if (!ready) return null

  const slipRow = (row: PollQuestion) => {
    setStage(BALLOT.findIndex((candidate) => candidate.id === row.id))
    setSlipOpen(false)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:block md:flex-none">
      {lost.length > 0 && (
        <p className="mb-2 shrink-0 border-s-rule border-red bg-sheet px-3 py-2 font-body text-[11.5px] leading-snug text-ink">
          {t('poll.migrate.lost', { n: String(lost.length) })}
        </p>
      )}

      {/* at lg the stage and the slip stand side by side: the question, and the rail beside it.
          On a phone the slip moves into a sheet (delta 87) — the stage is the one screen. */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-none lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-5">
      <div
        ref={stageRef}
        className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto overscroll-contain scroll-mt-4 md:flex-none md:overflow-visible md:block"
      >
      {sealed ? (
        <Manifesto
          ballot={ballot}
          supporter={supporter}
          nameHe={book?.nameHe ?? ''}
          shirt={shirt}
          favourite={favourite}
          celebrate={celebrate}
          display={display}
        />
      ) : (
        <>
          {complete && (
            <div className="mb-2 hidden flex-wrap items-center justify-between gap-2 border-rule border-ink bg-ink px-3.5 py-2.5 md:flex">
              <p className="font-body text-[12.5px] font-extrabold text-sheet">{t('poll.run.full')}</p>
              <button
                type="button"
                onClick={seal}
                className="min-h-tap bg-red px-4 font-body text-[15px] font-extrabold text-sheet transition-transform duration-press ease-stamp active:scale-[.97] motion-reduce:transition-none"
              >
                {t('poll.seal.cta')}
              </button>
            </div>
          )}
          {/* phone stage (delta 87): the ballot as eight boxes across the top — the one
              you are on is framed, the ones you voted are stamped — and the question's
              number printed big behind the card, two plates, the way a poll bill is set. */}
          <ol aria-label={t('stage.play.ballotSlip')} className="mb-3 grid shrink-0 grid-cols-8 gap-1 md:hidden">
            {BALLOT.map((row, i) => {
              const voted = (ballot[row.id] ?? '') !== ''
              const here = i === stage
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setStage(i)}
                    aria-current={here ? 'step' : undefined}
                    aria-label={t('stage.play.ballotBox', { n: String(i + 1) })}
                    className={`grid min-h-tap w-full place-items-center border-rule font-poster text-[20px] leading-none transition-transform duration-press ease-stamp active:scale-[.92] motion-reduce:transition-none ${
                      voted ? 'border-red bg-red text-paper' : 'border-ink/40 bg-paper text-ink'
                    } ${here ? 'outline outline-[3px] outline-offset-2 outline-ink' : ''}`}
                  >
                    {voted ? '✓' : i + 1}
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="relative md:contents">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-10 end-1 font-poster text-[150px] leading-none md:hidden"
            >
              <span className="plate-shift absolute inset-0 text-sign/15">{stage + 1}</span>
              <span className="plate-top relative text-red/15">{stage + 1}</span>
            </span>
          <QuestionStage
            question={question}
            index={stage}
            pickLabel={ballot[question.id] ? display(question, ballot[question.id] as string) : null}
            filter={filter}
            fromXi={fromXi}
            shirt={shirt}
            number={question.kind === 'number' ? shirtNumber(ballot) : null}
            position={question.kind === 'position' ? (ballot.position ?? null) : null}
            onOpenRoster={() => setSheetOpen(true)}
            onPickEntry={(entry) => cast(question, entry.id ?? entry.slug)}
            onNumber={(n) => cast(question, String(n))}
            onPosition={(code) => cast(question, code)}
            onStep={(delta) => setStage((current) => Math.min(BALLOT.length - 1, Math.max(0, current + delta)))}
          />
          </div>
        </>
      )}
      </div>

      <div className="hidden lg:block">
        <BallotSlip
          ballot={ballot}
          filled={filled}
          complete={complete}
          sealed={sealed}
          nameHe={book?.nameHe ?? ''}
          current={question.id}
          display={display}
          onRowTap={slipRow}
          onName={saveName}
          onSeal={seal}
          onNewSlip={fresh}
        />
      </div>
      </div>

      {/* the dock — the slip and the seal, one line, under the stage (delta 87) */}
      <div className="mt-2 flex shrink-0 items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => setSlipOpen(true)}
          className="flex min-h-tap flex-1 items-center justify-between border-rule border-ink bg-paper px-3 font-body text-[13px] font-extrabold text-ink transition-transform duration-press active:scale-[.97] motion-reduce:transition-none"
        >
          <span>{t('stage.play.ballotSlip')}</span>
          <span className="font-mono text-[13px] tabular-nums text-red">
            {filled}/{BALLOT.length}
          </span>
        </button>
        {!sealed && complete && (
          <button
            type="button"
            onClick={seal}
            className="min-h-tap shrink-0 bg-red px-5 font-display text-step-1 text-sheet transition-transform duration-press ease-stamp active:scale-[.95] motion-reduce:transition-none"
          >
            {t('poll.seal.cta')}
          </button>
        )}
        {sealed && (
          <Link
            href="/polls/board"
            className="flex min-h-tap shrink-0 items-center justify-center bg-red px-5 font-display text-step-1 text-sheet transition-transform duration-press ease-stamp active:scale-[.95] motion-reduce:transition-none"
          >
            {t('poll.board.link')}
          </Link>
        )}
      </div>

      <SlideSheet open={slipOpen} onClose={() => setSlipOpen(false)} title={t('stage.play.ballotSlip')} size="full">
        <BallotSlip
          ballot={ballot}
          filled={filled}
          complete={complete}
          sealed={sealed}
          nameHe={book?.nameHe ?? ''}
          current={question.id}
          display={display}
          onRowTap={slipRow}
          onName={saveName}
          onSeal={() => {
            seal()
            setSlipOpen(false)
          }}
          onNewSlip={fresh}
        />
        <div className="px-1 pb-2">
          <ReportLink />
        </div>
      </SlideSheet>

      {sheetOpen && question.kind === 'roster' && (
        <RosterSheet
          key={question.id}
          title={t(question.ask)}
          roster={roster}
          initialFilter={filter}
          onPick={(entry) => cast(question, entry.id ?? entry.slug)}
          onClose={() => setSheetOpen(false)}
        />
      )}

      {reacting !== null && (
        <VoteReaction
          question={reacting.question}
          pick={display(reacting.question, reacting.pick)}
          fact={reactingFact}
          worn={reacting.question.kind === 'number' ? wornBy(numbers, Number(reacting.pick)) : []}
          chosen={reasons[reacting.question.id]}
          filled={filled}
          last={nextEmpty(reacting.question, ballot) === null}
          onReason={(reason) => markReason(reacting.question.id, reason)}
          onRethink={() => {
            const target = reacting.question
            setReacting(null)
            setStage(BALLOT.findIndex((row) => row.id === target.id))
            if (target.kind === 'roster') setSheetOpen(true)
          }}
          onClose={() => setReacting(null)}
          onDone={advance}
        />
      )}
    </div>
  )
}
