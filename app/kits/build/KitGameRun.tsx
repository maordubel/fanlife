'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { RealShirtAsk, RealShirtPending } from '@/components/collector/RealShirtAsk'
import { KitMarkArt } from '@/components/kit/KitEngineShirt'
import { KitShirt } from '@/components/kit/KitShirt'
import { RecordRun } from '@/components/play/RecordRun'
import { UniversalExit } from '@/components/result/UniversalExit'
import { ShareRow } from '@/components/share/ShareRow'
import { FitBox } from '@/components/stage/FitBox'
import { firePickFxAt } from '@/components/stage/PickFx'
import { SlideSheet } from '@/components/stage/SlideSheet'
import { dropZone, useDragSource } from '@/components/stage/useDrag'
import { Num } from '@/components/ui/Num'
import { SourceNote } from '@/components/ui/SourceNote'
import { useDialog } from '@/components/ui/useDialog'
import {
  HINT_KINDS,
  KIT_HINT_PENALTY,
  KIT_MODE_SIZE,
  STEP_ORDER,
  kitNextCursor,
  type KitMode,
  type KitHintAnswer,
  type KitHintKind,
  type KitOption,
  type KitPuzzle,
  type KitStep,
  type KitVerdict,
  type StepVerdict,
} from '@/lib/game/kit-build-run'
import { t, type MessageKey } from '@/lib/i18n'
import { activeCollection } from '@/lib/kit/collection'
import type { KitMarksRegime } from '@/lib/kit/engine'
import type { KitSpec } from '@/lib/kit/spec'
import type { Embedded } from '@/lib/mechanics/types'
import { haptic } from '@/lib/play/haptics'
import { track } from '@/lib/analytics/meter'
import { readProfile, setRotation } from '@/lib/profile/store'
import type { NextAction } from '@/lib/results/types'
import { microFeedback, tierFromShare, voice, voiceAction, type ResultTier } from '@/lib/voice'

import { askKitHint, nextAfterKits, submitKit } from './actions'

/**
 * שער 4 — חידון המדים. Maor's V14 layout on the one engine and the server deal.
 *
 * ONE SCREEN THE HEIGHT OF THE PHONE: the season, the five steps, the question, a big shirt and a
 * row of cards. A tap places a part and — with the automatic advance on — moves to the next step
 * after 150ms; the advance is one tap to switch off, and every step stays tappable. After the
 * fifth part the round does NOT reveal itself: it lands on a review of the whole shirt with
 * **בדוק את החולצה**, because changing your mind about the sleeves after the sponsor told you the
 * era IS the game (rule 24). Nothing on this screen knows which card is right (rule 4).
 *
 * Every card has a visible ⓘ and a long-press for the same sheet: a keyboard user and a thumb both
 * reach the information, and it never names a year.
 */

type Placed = Partial<Record<KitStep, string>>
const REVIEW = STEP_ORDER.length
const LONG_PRESS_MS = 480
const ADVANCE_MS = 150

function variantLabel(variant: KitSpec['variant']): string {
  return t(`kits.facet.${variant}` as MessageKey)
}

function stepLabel(step: KitStep): string {
  return t(`kitgame.step.${step}` as MessageKey)
}

function optionsOf(puzzle: KitPuzzle, step: KitStep): KitOption[] {
  return puzzle.steps.find((row) => row.step === step)?.options ?? []
}

function chosenOf(puzzle: KitPuzzle, placed: Placed, step: KitStep): KitOption | null {
  const id = placed[step]
  return id ? optionsOf(puzzle, step).find((option) => option.id === id) ?? null : null
}

function shirtOf(puzzle: KitPuzzle, placed: Placed, extra?: Partial<KitSpec>): KitSpec {
  let spec: KitSpec = { ...puzzle.blank }
  for (const step of STEP_ORDER) {
    const option = chosenOf(puzzle, placed, step)
    if (option) spec = { ...spec, ...option.patch }
  }
  if (extra) spec = { ...spec, ...extra }
  // Until the construction is chosen the cloth is ONE cloth: the sleeves and the collar take the
  // body's colour. A white collar on a red body would be a construction answer nobody gave.
  if (!placed.construction && !extra?.sleeveInk) spec = { ...spec, sleeveInk: spec.base, collarInk: spec.base }
  return spec
}

function nextOpen(placed: Placed, from: number): number {
  for (let i = from + 1; i < STEP_ORDER.length; i += 1) if (!placed[STEP_ORDER[i]!]) return i
  for (let i = 0; i <= from && i < STEP_ORDER.length; i += 1) if (!placed[STEP_ORDER[i]!]) return i
  return REVIEW
}

/**
 * `embedded` — the same round opened from inside THE WORKER LIFE (the shop on Allenby wants a
 * shirt of a season before the life's year). The server deals and grades with the life's
 * window; the board keeps no collection, prints the rule-25 marks (the real-logo grant is
 * this gate's and the wing's only — owner, 21.9.2026) and hands the verdict back.
 */
export type KitEmbedded = Omit<Embedded<KitVerdict>, 'window'> & {
  window: { before: number; pin?: string | null; options?: number }
}

export function KitGameRun({
  puzzles,
  seed,
  cursor = 0,
  embedded,
  exactKits,
  mode: chosenMode = null,
  legacy = false,
}: {
  puzzles: KitPuzzle[]
  seed: number
  cursor?: number
  /**
   * A link from before the cursor counted shirts (`?seed=&r=k`, no `n`): `cursor` is ROUND k and
   * the server replays the old deal (`legacyRound` in `lib/game/kitBuild.ts`). Always Full.
   */
  legacy?: boolean
  /**
   * Full (5) or Quick (3) — ONE RED WORLD §13. `null` = the link named no mode, so the gate opens
   * on its line and asks. A deal is always five; Quick plays the first three and the cursor moves
   * three (`kitNextCursor`).
   */
  mode?: KitMode | null
  embedded?: KitEmbedded
  /**
   * archive slug → Kit Master id for the shirts with an exact photograph, for the closet question on
   * the reveal (spec §42). Real ownership only — it never writes, or reads, the game's collection.
   */
  exactKits?: Record<string, string>
}) {
  const store = useMemo(() => activeCollection(), [])
  const marks: KitMarksRegime = embedded ? 'rule25' : 'granted'
  const lifeWindow = embedded?.window
  const [index, setIndex] = useState(0)
  const [placed, setPlaced] = useState<Placed>({})
  const [active, setActive] = useState(0)
  const [history, setHistory] = useState<{ placed: Placed; active: number }[]>([])
  const [auto, setAuto] = useState(true)
  const [hints, setHints] = useState<KitHintAnswer[]>([])
  const [hintsOpen, setHintsOpen] = useState(false)
  const [info, setInfo] = useState<KitOption | null>(null)
  const [busy, setBusy] = useState(false)
  const [verdict, setVerdict] = useState<KitVerdict | null>(null)
  const [log, setLog] = useState<KitVerdict[]>([])
  const [finished, setFinished] = useState(false)
  const timer = useRef<number | null>(null)
  const shirtRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const [mode, setMode] = useState<KitMode | null>(embedded ? 'full' : chosenMode)
  const played = mode ? puzzles.slice(0, KIT_MODE_SIZE[mode]) : puzzles
  if (!mode) return <KitIntro onPick={setMode} />
  const puzzle = played[index]
  if (finished || !puzzle) return <RoundSummary log={log} seed={seed} cursor={cursor} mode={mode} legacy={legacy} />

  const complete = STEP_ORDER.every((step) => Boolean(placed[step]))
  const reviewing = active === REVIEW
  const step = STEP_ORDER[Math.min(active, STEP_ORDER.length - 1)]!
  const options = optionsOf(puzzle, step)
  const shirt = shirtOf(puzzle, placed)
  const total = log.reduce((sum, row) => sum + row.score, 0)

  function remember() {
    setHistory((rows) => [...rows.slice(-19), { placed, active }])
  }

  function pick(option: KitOption) {
    if (busy || verdict) return
    remember()
    const next = { ...placed, [step]: option.id }
    setPlaced(next)
    firePickFxAt(shirtRef.current, { label: option.labelHe, tone: 'red' })
    if (timer.current) window.clearTimeout(timer.current)
    if (!auto) return
    const target = nextOpen(next, active)
    timer.current = window.setTimeout(() => setActive(target), ADVANCE_MS)
  }

  function goTo(target: number) {
    if (timer.current) window.clearTimeout(timer.current)
    setActive(target)
  }

  function undo() {
    const previous = history.at(-1)
    if (!previous || verdict) return
    if (timer.current) window.clearTimeout(timer.current)
    setPlaced(previous.placed)
    setActive(previous.active)
    setHistory((rows) => rows.slice(0, -1))
    haptic('tap')
  }

  function reset() {
    if (verdict) return
    if (timer.current) window.clearTimeout(timer.current)
    remember()
    setPlaced({})
    setActive(0)
    haptic('tap')
  }

  async function hint(kind: KitHintKind) {
    if (busy || hints.some((row) => row.kind === kind)) return
    setBusy(true)
    const answer = await askKitHint(seed, index, kind, cursor, lifeWindow, legacy)
    setBusy(false)
    if (answer) {
      setHints((rows) => [...rows, answer])
      haptic('lock')
    }
  }

  async function check() {
    if (!complete || busy || !puzzle) return
    setBusy(true)
    const answer = await submitKit(seed, index, placed, cursor, hints.map((row) => row.receipt), hints.length, lifeWindow, legacy)
    setBusy(false)
    if (!answer) return
    setVerdict(answer)
    setLog((rows) => [...rows, answer])
    haptic(answer.perfect ? 'lock' : answer.right >= 3 ? 'tap' : 'miss')
    // a shirt built for the shop is the shop's — the collection is the gate's own record
    if (embedded) return
    void store.record({
      seasonLabel: answer.seasonLabel,
      variant: answer.variant,
      parts: answer.right,
      score: answer.score,
      hintsUsed: answer.hintsUsed,
      token: answer.unlock.token,
      dna: answer.unlock.dna,
    }).then(() => window.dispatchEvent(new Event('worker:kit-built')))
  }

  function next() {
    if (embedded && verdict) {
      embedded.onResult(verdict)
      return
    }
    if (index + 1 >= played.length) {
      setVerdict(null)
      setFinished(true)
      return
    }
    setIndex((value) => value + 1)
    setPlaced({})
    setActive(0)
    setHistory([])
    setHints([])
    setVerdict(null)
  }

  return (
    <div
      data-kit-run=""
      className={`mx-auto flex ${embedded ? 'h-[calc(100dvh-8.5rem)] min-h-[520px]' : 'min-h-0 flex-1'} w-full max-w-[460px] flex-col gap-1 overflow-hidden bg-paper px-3 pb-[max(6px,env(safe-area-inset-bottom))] pt-[max(4px,env(safe-area-inset-top))] md:h-auto md:flex-none md:py-3`}
    >
      {/* HUD strip — season, the five steps, the score, one thin line (delta 87) */}
      <div className="flex shrink-0 items-center gap-2 border-b-rule border-ink pb-1">
        {!embedded && (
          <a
            href="/"
            aria-label={t('kitgame.exit')}
            className="flex min-h-tap min-w-tap shrink-0 items-center justify-center font-body text-[18px] font-black text-ink"
          >
            <span aria-hidden="true">✕</span>
          </a>
        )}
        <p className="min-w-0 flex-1 truncate font-display text-[clamp(14px,4.4vw,18px)] leading-none text-ink">
          <Num>{puzzle.seasonLabel}</Num> · {variantLabel(puzzle.variant)}
        </p>
        <ol className="flex shrink-0 items-center gap-[3px]" aria-label={t('kitgame.kicker')}>
          {STEP_ORDER.map((row, i) => {
            const done = Boolean(placed[row])
            const current = i === active
            return (
              <li key={row}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  disabled={Boolean(verdict)}
                  aria-current={current ? 'step' : undefined}
                  aria-label={t('kitgame.stepAria', { n: String(i + 1), step: stepLabel(row) })}
                  className="block h-[10px] min-h-0 w-[10px] p-0"
                >
                  <span className={`block h-full w-full ${current ? 'bg-red' : done ? 'bg-ink' : 'bg-ink/20'}`} />
                </button>
              </li>
            )
          })}
        </ol>
        {log.length > 0 && (
          <p className="shrink-0 font-poster text-[18px] leading-none text-red" dir="ltr">
            <Num>{String(total)}</Num>
          </p>
        )}
      </div>
      <p className="shrink-0 text-center font-body text-[10.5px] font-bold text-muted">
        {embedded ? null : <Num>{t('kitgame.shirtOf', { n: String(index + 1), total: String(played.length) })}</Num>}
        {embedded ? null : ' · '}
        <Num>{`${Math.min(active + 1, STEP_ORDER.length)}/${STEP_ORDER.length}`}</Num>
      </p>

      <h2 className="shrink-0 text-center font-display text-[clamp(16px,4.8vw,22px)] leading-none text-red">
        {voiceAction(4, reviewing ? 'review' : step)}
      </h2>

      {/* the shirt — as big as the glass allows, and the drop zone every rail item targets */}
      <FitBox ratio={0.84} className="min-h-0">
        <div ref={shirtRef} {...dropZone('shirt')} className="relative flex h-full w-full items-center justify-center">
          <span
            key={JSON.stringify(shirt)}
            className="flex h-full w-full animate-fx-pop items-center justify-center motion-reduce:animate-none"
          >
            <KitShirt spec={shirt} look={puzzle.look} marks={marks} className="h-full max-w-full" title={puzzle.seasonLabel} />
          </span>
        </div>
      </FitBox>

      {reviewing ? (
        <ReviewPanel puzzle={puzzle} placed={placed} onEdit={goTo} onCheck={() => void check()} busy={busy} complete={complete} />
      ) : (
        <section aria-label={t('kitgame.pick', { step: stepLabel(step) })} className="w-full min-w-0 shrink-0">
          <p className="mb-1 flex items-baseline justify-between gap-2 font-body text-[10.5px] font-bold text-muted">
            <span className="text-ink">{t('kitgame.sample.caption')}</span>
            <span>{t('stage.dragHint')}</span>
          </p>
          <ul
            data-kit-rail=""
            className="flex snap-x snap-proximity gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {options.map((option) => (
              <li key={option.id} className="w-[104px] shrink-0 snap-start">
                <RailOption
                  step={step}
                  option={option}
                  preview={shirtOf(puzzle, placed, option.patch)}
                  look={puzzle.look}
                  marks={marks}
                  selected={placed[step] === option.id}
                  onDrop={() => pick(option)}
                  onInfo={() => setInfo(option)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer data-kit-footer="" className="grid grid-cols-4 border-t-hair border-ink/30">
        <button type="button" onClick={undo} disabled={history.length === 0 || Boolean(verdict)} className="min-h-tap font-body text-[12px] font-extrabold text-ink disabled:opacity-35">
          ↶ {t('kitgame.undo')}
        </button>
        <button type="button" onClick={reset} disabled={Boolean(verdict)} className="min-h-tap font-body text-[12px] font-extrabold text-ink disabled:opacity-35">
          {t('kitgame.reset')}
        </button>
        <button
          type="button"
          onClick={() => setAuto((value) => !value)}
          aria-pressed={auto}
          className={`min-h-tap font-body text-[12px] font-extrabold ${auto ? 'bg-ink text-paper' : 'text-ink'}`}
        >
          {t('kitgame.auto')}
        </button>
        <button type="button" onClick={() => setHintsOpen(true)} className="min-h-tap font-body text-[12px] font-extrabold text-ink">
          {t('kitgame.hint.open')}
          {hints.length > 0 && <span className="ms-1 text-red"><Num>{`−${hints.length * KIT_HINT_PENALTY}`}</Num></span>}
        </button>
      </footer>

      {info && <InfoSheet option={info} onClose={() => setInfo(null)} />}
      {hintsOpen && <HintSheet hints={hints} busy={busy} onAsk={(kind) => void hint(kind)} onClose={() => setHintsOpen(false)} />}
      {verdict && (
        <RevealSheet
          verdict={verdict}
          mine={shirt}
          onNext={next}
          last={index + 1 >= played.length}
          marks={marks}
          doneLabel={embedded?.doneLabel}
          real={embedded ? null : realShirtOf(verdict, exactKits)}
        />
      )}
    </div>
  )
}

/**
 * The archive shirt behind a checked verdict: its exact photograph's slug and the Kit Master id.
 * Only an EXACT photograph — a candidate is a guess at a season, and a closet does not file guesses.
 */
function realShirtOf(verdict: KitVerdict, exactKits: Record<string, string> | undefined): { slug: string; kitId: string } | null {
  if (verdict.evidence.kind !== 'exact' || !exactKits) return null
  const file = verdict.evidence.photos[0]?.src.split('/').pop() ?? ''
  const slug = file.replace(/\.webp$/, '')
  const kitId = exactKits[slug]
  return kitId ? { slug, kitId } : null
}

/* ------------------------------------------------------------------ one rail item — drag it onto the shirt, or tap it */
function RailOption({
  step,
  option,
  preview,
  look,
  marks,
  selected,
  onDrop,
  onInfo,
}: {
  step: KitStep
  option: KitOption
  preview: KitSpec
  look: KitPuzzle['look']
  marks: KitMarksRegime
  selected: boolean
  onDrop: () => void
  onInfo: () => void
}) {
  const hold = useRef<number | null>(null)
  const held = useRef(false)
  const drag = useDragSource({ payload: option.id, axis: 'up', onDrop })

  function start() {
    held.current = false
    if (hold.current) window.clearTimeout(hold.current)
    hold.current = window.setTimeout(() => {
      held.current = true
      haptic('tap')
      onInfo()
    }, LONG_PRESS_MS)
  }
  function stop() {
    if (hold.current) window.clearTimeout(hold.current)
    hold.current = null
  }

  return (
    <div className={`relative h-[124px] ${selected ? 'border-plate border-red bg-paper' : 'border-hair border-ink/35 bg-sheet'}`}>
      <button
        type="button"
        {...drag}
        onPointerDown={(event) => {
          start()
          drag.onPointerDown(event)
        }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(event) => event.preventDefault()}
        onClick={(event) => {
          if (event.defaultPrevented || held.current) {
            held.current = false
            return
          }
          onDrop()
        }}
        aria-pressed={selected}
        aria-label={t('kitgame.pick', { step: option.labelHe })}
        data-kit-option=""
        className="grid h-full w-full select-none grid-rows-[minmax(0,1fr)_auto] p-1 transition-transform duration-press active:scale-[.97] motion-reduce:transition-none"
        style={{ ...drag.style, WebkitTouchCallout: 'none' }}
      >
        <span className="flex min-h-0 items-center justify-center overflow-hidden">
          {step === 'body' ? (
            <KitShirt spec={preview} look={look} marks={marks} className="h-full max-w-full" />
          ) : step === 'construction' ? (
            <KitShirt spec={preview} look={look} marks={marks} crop="top" className="h-full max-w-full" />
          ) : (
            <KitMarkArt spec={preview} which={step} marks={marks} className="h-[86%] w-[90%]" />
          )}
        </span>
        <span className="flex min-h-[28px] items-center justify-center border-t-hair border-ink/20 pt-0.5 text-center font-body text-[11px] font-black leading-[1.15] text-ink">
          <span className="line-clamp-2 break-words">{option.labelHe}</span>
        </span>
      </button>
      {selected && (
        <span aria-hidden="true" className="pointer-events-none absolute start-0 top-0 flex h-[18px] w-[18px] items-center justify-center bg-red font-body text-[12px] font-black leading-none text-paper">
          ✓
        </span>
      )}
      <button
        type="button"
        onClick={onInfo}
        aria-label={t('kitgame.info.open', { label: option.labelHe })}
        className="absolute end-0 top-0 flex h-8 w-8 items-start justify-end p-1 font-body text-[12px] font-black leading-none text-muted"
      >
        <span aria-hidden="true" className="flex h-[15px] w-[15px] items-center justify-center border-hair border-ink/40 bg-paper">i</span>
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ review */
function ReviewPanel({
  puzzle,
  placed,
  onEdit,
  onCheck,
  busy,
  complete,
}: {
  puzzle: KitPuzzle
  placed: Placed
  onEdit: (i: number) => void
  onCheck: () => void
  busy: boolean
  complete: boolean
}) {
  return (
    <section className="grid gap-1.5">
      <ul className="grid grid-cols-5 gap-1">
        {STEP_ORDER.map((step, i) => {
          const option = chosenOf(puzzle, placed, step)
          return (
            <li key={step} className="min-w-0">
              <button
                type="button"
                onClick={() => onEdit(i)}
                className="flex min-h-[64px] w-full flex-col items-center justify-start gap-0.5 border-hair border-ink/35 bg-sheet px-0.5 py-1"
              >
                <span className="block w-full break-words text-center font-body text-[10px] font-extrabold leading-tight text-muted">{t(`kitgame.step.${step}` as MessageKey)}</span>
                <span className="block w-full break-words text-center font-body text-[11px] font-black leading-[1.15] text-ink">{option?.labelHe ?? '—'}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        onClick={onCheck}
        disabled={!complete || busy}
        data-kit-check=""
        className="flex min-h-tap w-full items-center justify-center bg-red px-4 font-body text-step-0 font-extrabold text-paper disabled:opacity-40"
      >
        {busy ? t('kitgame.checking') : t('kitgame.check')}
      </button>
    </section>
  )
}

/* ------------------------------------------------------------------ the sheets */
function InfoSheet({ option, onClose }: { option: KitOption; onClose: () => void }) {
  const ref = useDialog<HTMLDivElement>(onClose)
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={option.labelHe}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="z-[60] w-full max-w-[460px] border-t-plate border-red bg-sheet px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3"
      >
        <h3 className="font-display text-[22px] leading-none text-ink">{option.labelHe}</h3>
        <p className="mt-2 font-body text-[13px] leading-relaxed text-ink">{option.infoHe}</p>
        <button type="button" onClick={onClose} className="mt-3 min-h-tap w-full border-rule border-ink font-body text-[13px] font-black text-ink">
          {t('kitgame.info.close')}
        </button>
      </div>
    </div>
  )
}

function HintSheet({
  hints,
  busy,
  onAsk,
  onClose,
}: {
  hints: KitHintAnswer[]
  busy: boolean
  onAsk: (kind: KitHintKind) => void
  onClose: () => void
}) {
  const ref = useDialog<HTMLDivElement>(onClose)
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t('kitgame.hint.open')}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="z-[60] w-full max-w-[460px] border-t-plate border-ink bg-sheet px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-[22px] leading-none text-ink">{t('kitgame.hint.open')}</h3>
          <p className="font-body text-[11px] font-bold text-red">
            <Num>{t('kitgame.hint.title', { n: String(KIT_HINT_PENALTY) })}</Num>
          </p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {HINT_KINDS.map((kind) => {
            const used = hints.some((row) => row.kind === kind)
            return (
              <button
                key={kind}
                type="button"
                onClick={() => onAsk(kind)}
                disabled={busy || used}
                className="min-h-tap border-hair border-ink/40 bg-paper px-2 font-body text-[12px] font-extrabold text-ink disabled:opacity-40"
              >
                {t(`kitgame.hint.${kind}` as MessageKey)}
              </button>
            )
          })}
        </div>
        {hints.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-s-plate border-red ps-2">
            {hints.map((row) => (
              <li key={row.kind} className="font-body text-[13px] leading-snug text-ink">
                {row.textHe}
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={onClose} className="mt-3 min-h-tap w-full border-rule border-ink font-body text-[13px] font-black text-ink">
          {t('kitgame.hint.close')}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ the reveal */
function RevealSheet({
  verdict,
  mine,
  onNext,
  last,
  marks,
  doneLabel,
  real = null,
}: {
  verdict: KitVerdict
  mine: KitSpec
  onNext: () => void
  last: boolean
  marks: KitMarksRegime
  /** set inside the life: the way back into the room, and no photograph of the real marks */
  doneLabel?: string
  /** the archive shirt behind this kit, when there is an exact photograph of it */
  real?: { slug: string; kitId: string } | null
}) {
  const ref = useDialog<HTMLDivElement>(onNext)
  const photo = doneLabel ? null : (verdict.evidence.photos[0] ?? null)
  const evidenceLabel =
    verdict.evidence.kind === 'exact'
      ? t('kitgame.evidence.exact')
      : verdict.evidence.kind === 'candidate' && photo?.yearRaw
        ? t('kitgame.evidence.candidate', { year: String(photo.yearRaw) })
        : t('kitgame.evidence.reconstruction')
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={t('kitgame.reveal.kicker')}
      tabIndex={-1}
      data-kit-reveal=""
      className="fixed inset-0 z-[60] mx-auto grid max-w-[460px] grid-rows-[auto_minmax(0,1fr)_auto] bg-paper"
    >
      <div className={`px-3 pb-2 pt-[max(8px,env(safe-area-inset-top))] ${verdict.perfect ? 'bg-red' : 'bg-ink'} text-paper`}>
        <p className="font-body text-[11px] font-bold tracking-widest text-paper/80">{t('kitgame.reveal.kicker')}</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h2 className="font-display text-[clamp(22px,6.6vw,30px)] leading-none">
            {revealLine(verdict) ?? <Num>{t('kitgame.reveal.score', { right: String(verdict.right) })}</Num>}
          </h2>
          <p className="font-poster text-[36px] leading-none" dir="ltr">
            <Num>{String(verdict.score)}</Num>
          </p>
        </div>
        {/* the micro line (§13): "יושב בדיוק." for a shirt that came back, "לא החולצה הזאת." when it did not */}
        <p className="mt-1 font-body text-[12px] font-bold text-paper/90">
          {microFeedback(4, verdict.right >= 3 ? 'correct' : 'wrong', verdict.puzzleId, 0)?.line}
        </p>
      </div>

      <div className="min-h-0 overflow-y-auto px-3 pb-3 pt-2">
        {photo ? (
          // a real photograph always beats the graphics we generate (Maor, 23.9.2026): it fills the
          // screen as the hero, our reconstruction rides along as a small corner comparison
          <figure className="relative m-0 border-rule border-red bg-sheet p-1.5">
            <figcaption className="pb-1 text-center font-body text-[11px] font-black text-red">{t('kitgame.reveal.history')}</figcaption>
            <div className="flex h-[min(50dvh,440px)] items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- the archive ships the bytes it measured (rule 69) */}
              <img
                data-archive-photo=""
                src={photo.src}
                alt={t('kitgame.evidence.alt', { season: verdict.seasonLabel })}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <p className="mt-1 text-center font-body text-[11px] font-bold leading-tight text-ink">
              <Num>{evidenceLabel}</Num>
            </p>
            <div className="absolute bottom-3 start-3 w-[34%] max-w-[128px] border-hair border-ink bg-paper p-1">
              <p className="truncate text-center font-body text-[9px] font-black leading-tight text-ink">{t('kitgame.reveal.mine')}</p>
              <div className="flex h-[19cqw] max-h-[92px] items-center justify-center">
                <KitShirt spec={mine} look={verdict.look} marks={marks} className="h-full max-w-full" />
              </div>
            </div>
          </figure>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <figure className="m-0 border-rule border-red bg-sheet p-1.5">
              <figcaption className="pb-1 text-center font-body text-[11px] font-black text-red">{t('kitgame.reveal.history')}</figcaption>
              <div className="flex h-[min(38dvh,300px)] items-center justify-center">
                <KitShirt spec={verdict.answer} look={verdict.look} marks={marks} className="h-full max-w-full" title={verdict.seasonLabel} />
              </div>
              <p className="mt-1 text-center font-body text-[11px] font-bold leading-tight text-ink">
                <Num>{evidenceLabel}</Num>
              </p>
            </figure>
            <figure className="m-0 border-rule border-ink bg-sheet p-1.5">
              <figcaption className="pb-1 text-center font-body text-[11px] font-black text-ink">{t('kitgame.reveal.mine')}</figcaption>
              <div className="flex h-[min(38dvh,300px)] items-center justify-center">
                <KitShirt spec={mine} look={verdict.look} marks={marks} className="h-full max-w-full" />
              </div>
            </figure>
          </div>
        )}

        {verdict.evidence.kind === 'candidate' && (
          <p className="mt-1.5 font-body text-[11px] leading-snug text-muted">{t('kitgame.evidence.candidateNote')}</p>
        )}
        {verdict.evidence.kind === 'reconstruction' && (
          <p className="mt-1.5 font-body text-[11px] leading-snug text-muted">{t('kitgame.evidence.reconstructionNote')}</p>
        )}

        {/* the closet's question — on the reveal, after the check, never in the way of the next shirt */}
        {real && !doneLabel ? <RealShirtAsk key={real.slug} slug={real.slug} kitId={real.kitId} /> : null}

        <ul className="mt-2 border-t-rule border-ink">
          {verdict.steps.map((row) => (
            <StepRow key={row.step} row={row} />
          ))}
        </ul>

        <div className="mt-2 space-y-1 font-body text-[11px] leading-snug text-muted">
          {verdict.perfect && <p className="font-bold text-red"><Num>{t('kitgame.reveal.bonus', { n: '15' })}</Num></p>}
          {verdict.hintsUsed > 0 && (
            <p><Num>{t('kitgame.reveal.hints', { n: String(verdict.hintsUsed), p: String(verdict.hintsUsed * KIT_HINT_PENALTY) })}</Num></p>
          )}
          {!doneLabel && <p>{t('kitgame.reveal.collected')}{verdict.unlock.dna ? ` ${t('kitgame.reveal.dna')}` : ''}</p>}
          {/* which photograph, and whose, is on /credits (spec §0.3); a verdict opens it in a new tab */}
          {verdict.sourceTitle !== '' && <SourceNote newTab />}
        </div>
      </div>

      <div className="border-t-rule border-ink bg-paper px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
        <button type="button" onClick={onNext} data-kit-next="" className="flex min-h-tap w-full items-center justify-center bg-red px-4 font-body text-step-0 font-extrabold text-paper">
          {doneLabel ?? (last ? t('kitgame.finish') : t('kitgame.next'))}
        </button>
      </div>
    </div>
  )
}

function StepRow({ row }: { row: StepVerdict }) {
  const partial = !row.correct && row.points > 0
  const wrong = row.fields.filter((f) => !f.ok)
  return (
    <li className="border-b-hair border-ink/20 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-body text-[13px] font-extrabold text-ink">{t(`kitgame.step.${row.step}` as MessageKey)}</span>
        <span className="flex items-center gap-2">
          <span className="font-mono tabular-nums text-[11px] text-muted" dir="ltr">
            <Num>{t('kitgame.reveal.partial', { points: String(row.points), max: String(row.max) })}</Num>
          </span>
          <span
            className={`font-body text-[12px] font-black ${row.correct ? 'text-ink' : partial ? 'text-sign' : 'text-red'}`}
            aria-label={row.correct ? t('kitgame.reveal.stepRight') : partial ? t('kitgame.reveal.stepPartial') : t('kitgame.reveal.stepWrong')}
          >
            {row.correct ? '✓' : partial ? '◐' : '✕'}
          </span>
        </span>
      </div>
      {(wrong.length > 0 || row.fields.length > 1) && (
        <ul className="mt-0.5 space-y-px font-body text-[11px] leading-snug text-muted" data-kit-fields="">
          {row.fields.map((f) => (
            <li key={f.field} className="flex items-baseline gap-1.5">
              <span className={`w-3 shrink-0 font-black ${f.ok ? 'text-ink' : 'text-red'}`} aria-label={f.ok ? t('kitgame.reveal.stepRight') : t('kitgame.reveal.stepWrong')}>
                {f.ok ? '✓' : '✕'}
              </span>
              <span>
                {t(`kitgame.field.${f.field}` as MessageKey)}: {f.ok ? f.truthHe : t('kitgame.reveal.fieldWas', { truth: f.truthHe })}
              </span>
            </li>
          ))}
        </ul>
      )}
      {row.tolerant && <p className="mt-0.5 font-body text-[11px] leading-snug text-sign">{t('kitgame.reveal.tolerant')}</p>}
    </li>
  )
}

/* ------------------------------------------------------------------ the voice */

/**
 * The reveal's headline (§13): a perfect shirt is "לא שכחת פרט."; a shirt whose ONLY miss was
 * the sponsor is "הספונסר ברח. החולצה לא."; one other miss is the voice's `near`. Anything
 * else keeps its count.
 */
function revealLine(verdict: KitVerdict): string | null {
  if (verdict.perfect) return voice({ gate: 4, moment: 'result', result: 'perfect', seed: verdict.puzzleId }).title
  const missed = verdict.steps.filter((row) => !row.correct)
  if (missed.length === 1 && missed[0]?.step === 'sponsor') return voiceAction(4, 'nearSponsor')
  if (missed.length === 1) return voice({ gate: 4, moment: 'result', result: 'near', seed: verdict.puzzleId }).title
  return null
}

/** The round's tier: every step right, one detail short (the sponsor has its own line), or a share. */
function roundTier(log: readonly KitVerdict[]): { tier: ResultTier; sponsorOnly: boolean } {
  const steps = log.flatMap((row) => row.steps)
  const missed = steps.filter((row) => !row.correct)
  if (steps.length > 0 && missed.length === 0) return { tier: 'perfect', sponsorOnly: false }
  if (missed.length === 1) return { tier: 'near', sponsorOnly: missed[0]?.step === 'sponsor' }
  return { tier: tierFromShare(steps.length > 0 ? (steps.length - missed.length) / steps.length : 0), sponsorOnly: false }
}

/* ------------------------------------------------------------------ the opening */

/**
 * "את החולצה אתה זוכר בלי לראות אותה?" — and the one choice before the first shirt: Full (5)
 * or Quick (3). Nothing else stands between the line and the game (§13, §54: first action in 3s).
 */
function KitIntro({ onPick }: { onPick: (mode: KitMode) => void }) {
  const line = voice({ gate: 4, moment: 'intro' })
  return (
    <section data-kit-intro="" className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center gap-3 bg-paper px-4 py-6">
      <h1 className="font-display text-[clamp(26px,8vw,36px)] leading-[1.05] text-ink">{line.title}</h1>
      {line.body && <p className="font-body text-step-0 leading-relaxed text-muted">{line.body}</p>}
      <div className="mt-2 grid gap-2">
        {(['full', 'quick'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            data-kit-mode={mode}
            onClick={(event) => {
              firePickFxAt(event.currentTarget, { tone: 'ink', haptic: 'tap' })
              onPick(mode)
            }}
            className={`flex min-h-tap flex-col items-start justify-center border-rule px-4 py-2 text-start transition-transform duration-press active:scale-[.98] motion-reduce:transition-none ${
              mode === 'full' ? 'border-red bg-red text-paper' : 'border-ink bg-sheet text-ink'
            }`}
          >
            <span className="font-display text-step-1 leading-tight">{voiceAction(4, `mode.${mode}`)}</span>
            <span className={`font-body text-[12px] leading-snug ${mode === 'full' ? 'text-paper' : 'text-muted'}`}>
              {voiceAction(4, `mode.${mode}.body`)}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ the round */
function RoundSummary({ log, seed, cursor, mode, legacy = false }: { log: KitVerdict[]; seed: number; cursor: number; mode: KitMode; legacy?: boolean }) {
  const router = useRouter()
  const score = log.reduce((sum, row) => sum + row.score, 0)
  const right = log.reduce((sum, row) => sum + row.right, 0)
  const asked = log.length * STEP_ORDER.length
  const marks = log.flatMap((row) => row.steps.map((s) => s.correct))
  // the cursor counts SHIRTS: the next round starts where this one stopped (§13)
  const size = KIT_MODE_SIZE[mode]
  // a legacy round k sat where shirt k×5 sits now, so the deck carries on from the shirt after it
  const following = kitNextCursor(legacy ? cursor * KIT_MODE_SIZE.full : cursor, log.length)
  const { tier, sponsorOnly } = roundTier(log)
  const spoken = voice({ gate: 4, moment: 'result', result: tier, seed: `${seed}:${cursor}:${mode}` })
  if (sponsorOnly) spoken.title = voiceAction(4, 'nearSponsor') ?? spoken.title
  const [next, setNext] = useState<NextAction[]>([])
  useEffect(() => {
    track('run_complete', { detail: 'kits-build', value: right })
    // the device's own deck moves on by the shirts it spent — never a friend's deck (a shared seed)
    const own = readProfile().rotation['/kits/build']
    if (!own || own.seed === seed) setRotation('/kits/build', { seed, cursor: following })
    let live = true
    nextAfterKits({
      context: {
        gateId: 4,
        runId: `${seed}:${cursor}:${mode}`,
        score,
        // the shirt that slipped most is the one the archive card is for (§13 cross-links)
        archiveEntityIds: [...log]
          .sort((a, b) => a.right - b.right)
          .map((row) => `${row.seasonLabel}|${row.variant}`),
      },
    })
      .then((answer) => {
        if (live) setNext(answer.next)
      })
      .catch(() => {})
    return () => {
      live = false
    }
    // one round, one context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div
      data-kit-summary=""
      className="mx-auto min-h-0 w-full max-w-[460px] flex-1 overflow-y-auto overscroll-contain bg-paper px-3 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(8px,env(safe-area-inset-top))] md:min-h-[100dvh] md:flex-none md:overflow-visible"
    >
      <UniversalExit
        voice={spoken}
        next={next}
        from="kits-build"
        again={{
          label: t('kitgame.round.again'),
          onClick: () => {
            setRotation('/kits/build', { seed, cursor: following })
            router.push(`/kits/build?seed=${seed}&r=${following}&n=${size}`)
          },
        }}
        share={
          <ShareRow
            kind="kit"
            // the link hands over the SAME round in the same mode — `n` travels with the seed; a
            // legacy round is re-shared in its own form (no `n`), the only form that deals it
            route={legacy ? '/kits/build' : `/kits/build?n=${size}`}
            params={{ total: String(asked), s: String(seed), r: String(cursor) }}
            headline={String(right)}
            card={{
              template: 'score' as const,
              kicker: 'GATE 04 · KITS',
              label: t('kitgame.round.cardLabel'),
              eyebrow: t('kitgame.round.cardEyebrow'),
              hero: `${right}/${asked}`,
              bigStat: { v: String(score), k: t('kitgame.round.points') },
              stats: log.map((row) => ({ k: row.seasonLabel, v: `${row.right}/5` })).slice(0, 3),
              cta: t('kitgame.round.cardCta'),
              challenge: t('kitgame.round.cardChallenge'),
              marks,
            }}
          />
        }
      >
      <p className="mt-2 flex items-baseline justify-between gap-3 border-b-hair border-ink/25 pb-1 font-body text-[12px] text-ink">
        <span>
          <Num>{t('kitgame.round.steps', { n: String(right), total: String(asked) })}</Num>
        </span>
        <span className="font-poster text-[26px] leading-none text-red" dir="ltr">
          <Num>{String(score)}</Num>
        </span>
      </p>
      <ul className={`mt-2 grid gap-1 ${log.length > 3 ? 'grid-cols-5' : 'grid-cols-3'}`}>
        {log.map((row) => (
          <li key={row.puzzleId} className="border-rule border-ink bg-sheet p-1.5 text-center">
            <p className="font-mono tabular-nums text-[11px] font-black text-ink">
              <Num>{row.seasonLabel}</Num>
            </p>
            <p className="mt-1 font-poster text-[20px] leading-none text-red" dir="ltr">
              <Num>{`${row.right}/5`}</Num>
            </p>
          </li>
        ))}
      </ul>
      <RecordRun gate="/kits/build" score={score} correct={right} asked={asked} />
      <RealShirtPending />
      </UniversalExit>
    </div>
  )
}
