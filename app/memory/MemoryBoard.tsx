'use client'

import type { MouseEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ArchiveCard } from '@/components/memory/ArchiveCard'
import { FusionPlate } from '@/components/memory/FusionPlate'
import { PairThreads } from '@/components/memory/PairThreads'
import { SouvenirShelf } from '@/components/memory/SouvenirShelf'
import { FitBox } from '@/components/stage/FitBox'
import { firePickFx } from '@/components/stage/PickFx'
import { SlideSheet } from '@/components/stage/SlideSheet'
import { Mast } from '@/components/ui/LampGrid'
import { BannerCloth } from '@/components/ui/BannerCloth'
import { Num } from '@/components/ui/Num'
import { PlayLink } from '@/components/play/PlayLink'
import { RecordRun } from '@/components/play/RecordRun'
import { ShareRow } from '@/components/share/ShareRow'
import { UniversalExit } from '@/components/result/UniversalExit'
import { track } from '@/lib/analytics/meter'
import type { NextAction } from '@/lib/results/types'
import { hashSeed, microFeedback, voice, voiceAction, type ResultTier } from '@/lib/voice'
import { contactCard } from '@/lib/share/artefacts'
import type { ChallengeResult } from '@/lib/challenges/contract'
import { CompareCard } from '@/components/share/CompareCard'
import { collect, collected, readProfile } from '@/lib/profile/store'
import { t, type MessageKey } from '@/lib/i18n'
import type { MemoryPair, MemoryRound } from '@/lib/game/memory'
import type { Embedded } from '@/lib/mechanics/types'
import { readCompletedChapters } from '@/lib/life/memoryPassport'
import {
  ECHO_MS,
  ECHO_STREAK,
  FLASH_MS,
  RE_FLASH_MS,
  closeOpen,
  countdownAt,
  echoMate,
  finished,
  flip,
  morale,
  numericFace,
  spendEcho,
  spendFlash,
  startRun,
  verdict,
  wallLit,
  type MemoryVerdict,
} from '@/lib/game/memory-run'

/** the collection every closed pair is filed into, shared with the personal area */
const SHELF = 'memory'

/** the wall is four across — the grid below and the threads over it read the same number */
const COLS = 4

/**
 * The four closing lines, each written out in full.
 *
 * A key built from the verdict in a template literal would work and would be invisible to
 * `tests/i18n.test.ts`, which can only resolve a literal — rule 71's lesson, in its
 * cheapest form: a `Record` typed against the union costs one object and makes every key
 * both checkable and greppable.
 */
/** The wall's four verdicts in the voice's tiers (§15): a count of memories, never a grade. */
const VERDICT_TIER: Record<MemoryVerdict, ResultTier> = {
  flawless: 'perfect',
  sharp: 'high',
  solid: 'mid',
  lit: 'low',
}

/**
 * The hint line: a catalogue key for the mechanics (flash, find, echo, hot streak), or a line
 * the voice spoke (§15) — the opening, "חזר למקום.", "לא זה." — with what it was about.
 */
type Hint = MessageKey | { line: string; kind: 'intro' | 'locked' | 'wrong' }

/** m:ss, in `<Num>` so a bidi run never puts the colon on the wrong side of the digits */
function clock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * שער 6 — קיר הזיכרון (delta 87, phone stage).
 *
 * The board that was here matched pairs and counted moves, and both of those are still
 * the spine. What it did not have is the thing the prototype is actually about: a wall
 * that is LIT for a moment and then goes dark, a pair that becomes a memory instead of
 * disappearing, and a shelf that fills. Four mechanics carry that, and each one is a
 * rule rather than an effect — `lib/game/memory-run.ts` owns all four and is tested on
 * its own, because "the echo fires on the third pair and only once" is not a thing a
 * screenshot can check. **None of that logic moved for delta 87** — this file only
 * changed how it is laid out and how a closed card looks.
 *
 * **Maor, 23.9.2026 — the phone stage.** Three things changed shape, none of them the
 * game: (1) a closed card used to print its `object` and its `kind` — the topic — which
 * made the wall very easy the moment it loaded; a closed card now wears the exact same
 * plain back as every other closed card, in the pixels and in the `aria-label`
 * (`ArchiveCard`). (2) the screen is one HUD strip (pairs · moves · a clock this file
 * keeps, since the run itself never needed a clock), the board filling the rest of the
 * phone (`FitBox`), and a dock — the three mechanic explainers, the souvenir shelf and
 * the closing mural all moved into `SlideSheet`s instead of stacking under the board.
 * (3) a locked pair now also fires the ground's one pick effect, `firePickFx`, from the
 * exact point the second card was tapped.
 *
 * **The shelf outlives the run.** A closed pair is filed into the profile's collections
 * under `memory`, the same store the Ussishkin cards use, so the personal area can count
 * memories without this gate inventing a second place to keep them (rule 1). Ids are
 * archive keys (`trophy:state-cup:1998/99`), so the same memory found twice is one
 * memory — `collect()` is idempotent by design.
 */
export function MemoryBoard({
  round,
  seed,
  cursor = 0,
  embedded,
  links = {},
  lived = {},
  next = [],
}: {
  round: MemoryRound
  seed: number
  cursor?: number
  /** pair id → its archive card (`/archive?at=…`), resolved and CHECKED on the server (§15) */
  links?: Readonly<Record<string, string>>
  /**
   * ONE RED WORLD §15 — pair id → the LIFE chapters its archive entity is lived in
   * (`chaptersOfEntity`, server). A pair gets "את זה כבר ראית ב-LIFE" only when THIS
   * device's save has FINISHED one of them — never a chapter ahead, never a character's name.
   */
  lived?: Readonly<Record<string, readonly string[]>>
  /** the Universal Exit's one or two doors, resolved on the server from the same round (§6) */
  next?: readonly NextAction[]
  /**
   * Opened from inside THE WORKER LIFE — the old fan at the bus stop remembers. The same wall
   * and the same four verdicts; nothing is filed on the shelf, nothing is recorded or shared,
   * and the verdict goes back to the room.
   */
  embedded?: Omit<Embedded<MemoryVerdict>, 'window'>
}) {
  const { cards, pairs } = round
  const total = pairs.length

  const [run, setRun] = useState(startRun)
  /** 'idle' before the wall has ever been lit, then the two flashes and play */
  const [phase, setPhase] = useState<'idle' | 'flash' | 'play'>('idle')
  const [wrong, setWrong] = useState<string[]>([])
  const [echoOn, setEchoOn] = useState<string | null>(null)
  const [fused, setFused] = useState<{ pair: MemoryPair; perfect: boolean } | null>(null)
  // §15 — the wall opens on the voice: "תסתכל טוב. עוד רגע זה נעלם."
  const [hint, setHint] = useState<Hint>(() => ({ line: voice({ gate: 6, moment: 'intro' }).title, kind: 'intro' }))
  const [streakShown, setStreakShown] = useState(0)
  const [kept, setKept] = useState<number | null>(null)
  /** the pair just locked — the v3 "MEMORY LOCKED" panel, folded into the hint line */
  const [lockedPair, setLockedPair] = useState<MemoryPair | null>(null)
  /** 3·2·1 on the flash strip; null when no flash is running */
  const [count, setCount] = useState<number | null>(null)

  // The stage's three sheets — the mechanics/guide, the shelf, and the closing mural —
  // replace what used to be stacked under the board (delta 87: "slide windows wherever
  // possible", so nothing here needs the page itself to scroll).
  const [guideOpen, setGuideOpen] = useState(false)
  const [shelfOpen, setShelfOpen] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)

  // The clock in the HUD strip. The run itself never needed one — `verdict()` reads
  // moves and misses, not time — so it stays a view-only stopwatch, started the moment
  // the wall is first lit and frozen the moment the board is finished.
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const byId = useMemo(() => new Map(pairs.map((pair) => [pair.id, pair] as const)), [pairs])
  /** §15 — the chapters this device finished; read once, only on the gate (not inside LIFE) */
  const [livedDone, setLivedDone] = useState<readonly string[]>([])
  useEffect(() => {
    if (embedded || Object.keys(lived).length === 0) return
    let alive = true
    void readCompletedChapters().then((done) => {
      if (alive) setLivedDone(done)
    })
    return () => {
      alive = false
    }
  }, [embedded, lived])
  const livedPair = useCallback((pairId: string) => (lived[pairId] ?? []).some((chapter) => livedDone.includes(chapter)), [lived, livedDone])
  const timers = useRef<number[]>([])

  /** every timer this screen starts is parked here, so leaving mid-beat cancels all of them */
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])

  useEffect(
    () => () => {
      for (const id of timers.current) {
        window.clearTimeout(id)
        window.clearInterval(id)
      }
      timers.current = []
    },
    [],
  )

  // The shelf's across-runs count is read after mount, never during render: the server
  // has no browser storage and reading it in a render is how a hydration mismatch is born.
  useEffect(() => {
    if (embedded) return
    setKept(collected(readProfile(), SHELF).length)
  }, [embedded])

  const done = finished(run, total)
  const lit = wallLit(run, total)
  const flashing = phase === 'flash'

  // The clock ticks once a second while the board is live, and stops counting the
  // instant the board is finished (a done wall does not keep gaining seconds while its
  // mural sheet is open).
  useEffect(() => {
    if (startedAt === null || done) return
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => window.clearInterval(id)
  }, [startedAt, done])

  // The mural opens itself the moment the wall is finished — one screen, no scroll to
  // find out how it went.
  useEffect(() => {
    if (done && !embedded) setResultOpen(true)
  }, [done, embedded])

  /** the countdown ticks with the beat and stops with it, however the beat ends */
  function countDown(ms: number) {
    const opened = Date.now()
    setCount(countdownAt(0, ms))
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - opened
      if (elapsed >= ms) {
        window.clearInterval(tick)
        return
      }
      setCount(countdownAt(elapsed, ms))
    }, 200)
    timers.current.push(tick)
  }

  function lightTheWall() {
    setStartedAt((at) => at ?? Date.now())
    setPhase('flash')
    setHint('memory.hint.photograph')
    countDown(FLASH_MS)
    later(() => {
      setPhase('play')
      setCount(null)
      setHint('memory.hint.find')
    }, FLASH_MS)
  }

  function endFlash() {
    if (phase !== 'flash') return
    for (const id of timers.current) {
      window.clearTimeout(id)
      window.clearInterval(id)
    }
    timers.current = []
    setPhase('play')
    setCount(null)
    setHint('memory.hint.find')
  }

  function extraFlash() {
    if (run.flashUsed || phase !== 'play' || done) return
    setRun(spendFlash)
    setPhase('flash')
    setHint('memory.hint.photograph')
    countDown(RE_FLASH_MS)
    later(() => {
      setPhase('play')
      setCount(null)
      setHint('memory.hint.find')
    }, RE_FLASH_MS)
  }

  function onFlip(id: string, event: MouseEvent<HTMLButtonElement>) {
    if (phase !== 'play' || fused !== null) return

    // The echo is read against the run BEFORE the flip, because the card being opened is
    // the one that points at its partner — and it is spent whether or not the partner
    // turned out to be useful.
    const mate = echoMate(run, cards, id)

    const outcome = flip(run, cards, id)
    if (outcome.kind === 'ignored') return
    setRun(mate === null ? outcome.run : spendEcho(outcome.run))

    if (mate !== null) {
      setEchoOn(mate)
      setHint('memory.hint.echo')
      later(() => setEchoOn(null), ECHO_MS)
    }

    if (outcome.kind === 'pair') {
      const pair = byId.get(outcome.pair)
      if (pair) setFused({ pair, perfect: outcome.perfect })
      setLockedPair(pair ?? null)
      setStreakShown(outcome.run.streak)
      setHint(
        outcome.run.streak >= 2
          ? 'memory.hint.hot'
          : { line: microFeedback(6, 'correct', `${seed}:${cursor}`, outcome.run.done.length)?.line ?? '', kind: 'locked' },
      )
      // every locked pair is a pick — the one print hit the whole ground shares
      firePickFx(event.clientX, event.clientY, {
        label: microFeedback(6, 'correct', `${seed}:${cursor}`, outcome.run.done.length)?.line ?? '',
        tone: 'red',
        haptic: 'lock',
      })
      if (!embedded) {
        collect(SHELF, [outcome.pair])
        setKept(collected(readProfile(), SHELF).length)
      }
      return
    }

    if (outcome.kind === 'miss') {
      setLockedPair(null)
      setWrong(outcome.run.open)
      setHint({ line: microFeedback(6, 'wrong', `${seed}:${cursor}`, outcome.run.misses)?.line ?? '', kind: 'wrong' })
      firePickFx(event.clientX, event.clientY, { tone: 'sign', haptic: 'miss' })
      later(() => {
        setWrong([])
        setRun(closeOpen)
        setHint('memory.hint.remember')
      }, 820)
    }
  }

  const found = run.done.length
  const memoryResult: ChallengeResult = { gate: 6, moves: run.moves, misses: run.misses, order: run.done, perfect: run.perfect }
  const percent = Math.round(morale(run, total) * 100)

  // §15 — "6 זיכרונות חזרו למקום.": the wall's verdict in the voice, and one memory kept
  const spoken = voice({
    gate: 6,
    moment: 'result',
    result: VERDICT_TIER[verdict(run, total)],
    seed: `${seed}:${cursor}`,
    vars: { n: String(total) },
  })
  const souvenir = pairs.length > 0 ? (pairs[hashSeed(`${seed}:${cursor}|souvenir`) % pairs.length] ?? null) : null
  useEffect(() => {
    if (done && !embedded) track('run_complete', { detail: 'memory', value: run.moves })
    // once, when the wall closes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  return (
    <div className="flex min-h-0 flex-1 flex-col md:block md:flex-none">
      {/* HUD strip — one line: pairs, moves, and the clock this screen keeps */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b-hair border-sheet/35 pb-1.5 md:mt-stack md:border-rule md:border-sheet/45 md:bg-sheet/[.06] md:p-3 md:pb-3">
        <div className="flex items-baseline gap-3 font-mono text-[12px] tabular-nums text-sheet">
          <span>
            <span className="text-concrete">{t('memory.pairs')} </span>
            <Num>{`${found}/${total}`}</Num>
          </span>
          <span>
            <span className="text-concrete">{t('memory.moves')} </span>
            <Num>{String(run.moves)}</Num>
          </span>
          <span aria-hidden="true" className="text-concrete">·</span>
          <span aria-label={t('memory.stage.time')}>
            <Num>{clock(elapsed)}</Num>
          </span>
        </div>
        <p className="shrink-0 font-mono text-[11px] tabular-nums text-red">
          <Num>{`${percent}%`}</Num>
        </p>
      </div>

      {/* the live hint line — what just happened, and what to do next */}
      <p aria-live="polite" className="mt-1.5 shrink-0 font-body text-step--1 text-concrete">
        {hint === 'memory.hint.hot'
          ? t('memory.hint.hot', { n: String(streakShown) })
          : typeof hint === 'string'
            ? t(hint)
            : hint.line}
        {lockedPair && (hint === 'memory.hint.hot' || (typeof hint !== 'string' && hint.kind === 'locked')) && (
          <span className="block font-sign text-[13px] font-bold text-sheet">
            {t('memory.hint.lockedFact')}{' '}
            {numericFace(lockedPair.a) ? <Num>{lockedPair.a}</Num> : lockedPair.a}
            {' · '}
            {numericFace(lockedPair.b) ? <Num>{lockedPair.b}</Num> : lockedPair.b}
          </span>
        )}
      </p>

      {/* THE WALL — as big as the phone allows */}
      <FitBox ratio={1} className="mt-1.5 md:mt-2" innerClassName="flex items-center justify-center">
        <div
          className={`relative grid h-full w-full grid-cols-4 gap-1.5 border-plate p-1.5 transition-colors duration-plate motion-reduce:transition-none ${
            lit ? 'border-red bg-red/10' : 'border-sheet/50'
          }`}
          style={{ transform: 'rotate(-1.5deg)' }}
        >
          {cards.map((card) => (
            <ArchiveCard
              key={card.id}
              card={card}
              open={run.open.includes(card.id)}
              done={run.done.includes(card.pair)}
              wrong={wrong.includes(card.id)}
              echo={echoOn === card.id}
              flashing={flashing}
              onFlip={onFlip}
            />
          ))}
          <PairThreads cards={cards} done={run.done} cols={COLS} />
        </div>
      </FitBox>
      <div className="flex shrink-0 justify-center md:block">
        <Mast height={28} night />
      </div>

      {/* DOCK — one primary action, and the chips that open this gate's sheets */}
      <div className="mt-2 shrink-0 md:mt-stack">
        {phase === 'idle' ? (
          <button
            type="button"
            onClick={lightTheWall}
            className="flex min-h-tap w-full items-center justify-center bg-red px-4 font-body text-step-1 font-extrabold text-paper transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
          >
            {t('memory.flash.cta')}
          </button>
        ) : (
          <button
            type="button"
            onClick={extraFlash}
            disabled={run.flashUsed || flashing || done}
            className={`flex min-h-tap w-full items-center justify-center border-rule px-4 font-body text-[15px] font-extrabold transition-transform duration-press ease-stamp active:scale-[.98] disabled:active:scale-100 motion-reduce:transition-none ${
              run.flashUsed || flashing || done
                ? 'border-sheet/30 text-sheet/40'
                : 'border-sheet bg-sheet/[.08] text-sheet'
            }`}
          >
            {run.flashUsed ? t('memory.flash.spent') : voiceAction(6, 'flash')}
          </button>
        )}

        <div className="mt-1.5 flex gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className={`flex min-h-tap shrink-0 items-center gap-1.5 border-hair px-2.5 font-body text-[11.5px] font-extrabold ${
              run.echo === 'armed' ? 'border-red bg-red/15 text-sheet' : 'border-sheet/35 text-sheet/85'
            }`}
          >
            {run.echo === 'armed' && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 bg-red" />}
            {t('memory.stage.guideChip')}
          </button>
          {!embedded && (
            <button
              type="button"
              onClick={() => setShelfOpen(true)}
              className="flex min-h-tap shrink-0 items-center gap-1.5 border-hair border-sheet/35 px-2.5 font-body text-[11.5px] font-extrabold text-sheet/85"
            >
              {t('memory.stage.shelfChip')}
              <span className="font-mono text-[10px] tabular-nums text-red">
                <Num>{`${found}/${total}`}</Num>
              </span>
            </button>
          )}
          {done && !embedded && (
            <button
              type="button"
              onClick={() => setResultOpen(true)}
              className="flex min-h-tap shrink-0 items-center border-hair border-red bg-red/15 px-2.5 font-body text-[11.5px] font-extrabold text-sheet"
            >
              {t('memory.stage.resultChip')}
            </button>
          )}
        </div>
      </div>

      {embedded && done && (
        <div className="mt-stack shrink-0 border-rule border-sheet bg-sheet p-4">
          <p className="font-body text-[9px] font-extrabold tracking-[0.2em] text-red">{t('memory.mural')}</p>
          <h2 className="mt-1 font-display text-step-2 leading-tight text-ink">{spoken.title}</h2>
          <button
            type="button"
            onClick={() => embedded.onResult(verdict(run, total))}
            data-memory="back"
            className="mt-3 flex min-h-tap w-full items-center justify-center bg-red px-4 font-body text-step-0 font-extrabold text-paper"
          >
            {embedded.doneLabel}
          </button>
        </div>
      )}

      {fused && <FusionPlate pair={fused.pair} perfect={fused.perfect} onDone={() => setFused(null)} />}

      {/* המנגנונים — the three mechanics explained, and the echo's own state, in a sheet
          rather than stacked above the board (delta 87: explanatory paragraphs never sit
          above the field). */}
      <SlideSheet
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        title={t('memory.stage.guide.title')}
        latin="HOW IT WORKS"
      >
        <ul className="grid gap-1.5" aria-label={t('memory.intro.aria')}>
          {(
            [
              ['MEMORY FLASH', 'memory.intro.flash'],
              ['ARCHIVE OBJECTS', 'memory.intro.objects'],
              ['MEMORY ECHO', 'memory.intro.echo'],
            ] as const
          ).map(([latin, key]) => (
            <li key={key} className="border-hair border-ink/25 bg-ink/[.03] px-2.5 py-2">
              <p className="font-latin text-[9px] font-bold tracking-[0.18em] text-red" dir="ltr">
                {latin}
              </p>
              <p className="mt-0.5 font-body text-[12px] leading-snug text-ink/80">{t(key)}</p>
            </li>
          ))}
        </ul>

        <div className={`mt-2 border-hair p-2.5 ${run.echo === 'armed' ? 'border-red bg-red/10' : 'border-ink/20'}`}>
          <p className="font-body text-[9px] font-extrabold tracking-[0.18em] text-red">{t('memory.echo.title')}</p>
          <p className="mt-0.5 font-body text-[11.5px] leading-snug text-ink/75">
            {run.echo === 'armed'
              ? t('memory.echo.armed')
              : run.echo === 'spent'
                ? t('memory.echo.spent')
                : t('memory.echo.idle', { n: String(ECHO_STREAK) })}
          </p>
        </div>

        {!embedded && (
          <div className="mt-2">
            <BannerCloth>{t('slogan.collective')}</BannerCloth>
          </div>
        )}
      </SlideSheet>

      {/* מדף המזכרות — what the run leaves behind, in its own sheet */}
      {!embedded && (
        <SlideSheet open={shelfOpen} onClose={() => setShelfOpen(false)} title={t('memory.shelf.title')}>
          <SouvenirShelf pairs={pairs} done={run.done} kept={kept} />
        </SlideSheet>
      )}

      {/* קיר הזיכרון — the closing mural, opened automatically the moment the wall is done */}
      {!embedded && (
        <SlideSheet
          open={resultOpen}
          onClose={() => setResultOpen(false)}
          title={t('memory.mural')}
          size="full"
        >
          {done && (
            <UniversalExit
              voice={spoken}
              next={next}
              from="memory"
              share={
                <ShareRow
                  kind="memory"
                  params={{ s: String(seed), r: String(cursor) }}
                  headline={String(run.moves)}
                  card={contactCard({
                    moves: run.moves,
                    // the things, never what each one pairs with — the pairing is the answer
                    frames: pairs.map((pair) => ({ label: pair.a, hit: run.perfect.includes(pair.id) })),
                  })}
                  challenge={{ gate: 6, result: memoryResult }}
                />
              }
            >
              <CompareCard gate={6} mine={memoryResult} names={Object.fromEntries(pairs.map((pair) => [pair.id, pair.a]))} />
              <dl className="mt-3 flex items-end gap-5 border-y-hair border-ink/25 py-2">
                {(
                  [
                    ['memory.moves', String(run.moves)],
                    ['memory.misses', String(run.misses)],
                    ['memory.bestStreak', String(run.bestStreak)],
                  ] as const
                ).map(([key, value]) => (
                  <div key={key}>
                    <dt className="font-body text-[8.5px] font-extrabold tracking-[0.16em] text-muted">{t(key)}</dt>
                    <dd className="font-poster text-[26px] leading-none text-ink">
                      <Num>{value}</Num>
                    </dd>
                  </div>
                ))}
              </dl>

              {/* §15 — "אחד מהם נשאר אצלך": one memory of the wall, chosen by the round, kept */}
              {souvenir && (
                <div className="mt-3 border-rule border-red bg-sheet p-3" data-memory="souvenir">
                  <p className="font-body text-[10px] font-extrabold tracking-widest text-red">{voiceAction(6, 'souvenir')}</p>
                  <MuralFace pair={souvenir} href={links[souvenir.id]} />
                </div>
              )}

              {/* the mural — every memory the board held, printed together; each one a door to
                  its archive card where the archive holds it (§15) */}
              <ol className="mt-3">
                {pairs.map((pair) => (
                  <li
                    key={pair.id}
                    className="flex flex-wrap items-baseline gap-x-2 border-b-hair border-ink/20 py-1.5"
                  >
                    <MuralFace pair={pair} href={links[pair.id]} />
                    <span className="w-full basis-full font-body text-[11px] leading-tight text-muted">{pair.kind}</span>
                    {pair.factHe && (
                      <span className="w-full basis-full font-body text-[11.5px] leading-snug text-ink" data-memory-fact={pair.id}>
                        {pair.factHe}
                      </span>
                    )}
                    {livedPair(pair.id) && (
                      <span className="w-full basis-full font-body text-[11px] font-extrabold leading-tight text-red" data-memory-lived={pair.id}>
                        {t('redworld.memory.lived')}
                      </span>
                    )}
                  </li>
                ))}
              </ol>

              <RecordRun gate="/memory" score={run.bestStreak} correct={total} asked={run.moves} />
            </UniversalExit>
          )}
          {done && (
            <PlayLink
              gate="/memory"
              className="mt-3 flex min-h-tap w-full items-center justify-center bg-red px-4 font-body text-step-1 font-extrabold text-paper"
            >
              {t('run.again')}
            </PlayLink>
          )}
        </SlideSheet>
      )}

      {/*
        MEMORY FLASH — the wall is lit and the strip says so.

        Deliberately NOT a full-screen scrim, which is what the reference uses: the whole
        content of this beat is the twelve faces, and an overlay over them would hide the
        one thing the player is here to photograph. So the strip sits at the foot, above
        the tab bar, and is itself the skip control — one tap ends the beat now.
      */}
      {flashing && (
        <button
          type="button"
          onClick={endFlash}
          className="fixed inset-x-0 bottom-0 z-[60] flex min-h-tap animate-slam items-center justify-between gap-3 border-t-plate border-red bg-ink px-gutter pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 text-start"
        >
          <span className="min-w-0">
            <span className="block font-display text-step-1 leading-none text-sheet">
              {t('memory.flash.title')}
              {count !== null && (
                <span className="ms-2 font-poster text-[26px] leading-none text-red" aria-live="polite">
                  {t('memory.flash.count', { n: String(count) })}
                </span>
              )}
            </span>
            <span className="mt-0.5 block font-body text-[11px] leading-snug text-concrete">
              {t('memory.flash.skip')}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="shrink-0 border-rule border-sheet px-2.5 py-1 font-latin text-[9px] font-bold tracking-[0.16em] text-sheet"
          >
            FLASH
          </span>
        </button>
      )}
    </div>
  )
}

/**
 * One memory of the wall, printed as the mural prints it — and, where the archive holds the
 * thing, a door to its card (§15: "כל pair/souvenir → archive deep link"). The href was resolved
 * and checked on the server; a memory the archive does not hold is printed, not linked.
 */
function MuralFace({ pair, href }: { pair: MemoryPair; href?: string }) {
  const body = (
    <>
      <span className="min-w-0 flex-1 truncate font-sign text-[14px] font-bold text-ink">
        {numericFace(pair.a) ? <Num>{pair.a}</Num> : pair.a}
      </span>
      <span aria-hidden="true" className="-translate-y-[3px] min-w-[10px] flex-1 border-b border-dotted border-ink/30" />
      <span className="shrink-0 font-sign text-[13px] font-bold text-red">
        {numericFace(pair.b) ? <Num>{pair.b}</Num> : pair.b}
      </span>
    </>
  )
  return href ? (
    <a
      href={href}
      data-memory-link={pair.id}
      className="flex min-h-tap w-full min-w-0 items-baseline gap-x-2 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-sign"
    >
      {body}
      <span aria-hidden="true" className="shrink-0 font-body text-[11px] text-muted">←</span>
    </a>
  ) : (
    <span className="flex w-full min-w-0 items-baseline gap-x-2">{body}</span>
  )
}
