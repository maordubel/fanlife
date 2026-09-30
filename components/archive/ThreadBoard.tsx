'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'

import { PlayLink } from '@/components/play/PlayLink'
import { RecordRun } from '@/components/play/RecordRun'
import { ExitNext } from '@/components/result/UniversalExit'
import { CompareCard } from '@/components/share/CompareCard'
import { ShareRow } from '@/components/share/ShareRow'
import type { ChallengeResult } from '@/lib/challenges/contract'
import { stripCard } from '@/lib/share/artefacts'
import { track } from '@/lib/analytics/meter'
import { microFeedback, tierFromShare, voice } from '@/lib/voice'
import { RevealBar, useReveal } from '@/components/play/Reveal'
import { firePickFxAt } from '@/components/stage/PickFx'
import { SlideSheet } from '@/components/stage/SlideSheet'
import { Num } from '@/components/ui/Num'
import { SourceNote } from '@/components/ui/SourceNote'
import { useDialog } from '@/components/ui/useDialog'
import { closeThread, linkThread, nextAfterThread } from '@/app/timeline/actions'
import type { NextAction } from '@/lib/results/types'
import { ENTITY_TYPES, type ArchiveCard, type EntityType, type SourceLine } from '@/lib/archive/graph-types'
import { costsIntegrity, ruleStates, type ClosedEdge, type PublicLevel, type RuleKey } from '@/lib/game/thread-run'
import { haptic } from '@/lib/play/haptics'
import { emit, telemetry } from '@/lib/profile/events'
import { t, type MessageKey } from '@/lib/i18n'
import { ArtifactMark, CardHeadline, CloseMark, Eyebrow, cardTitle, typeLabel } from './EntityCard'

/**
 * החוט האדום — the board (brief §23, prototype v7).
 *
 * Two anchors, a hand of real archive items, and a thread you stretch between them one
 * card at a time. Every link is asked of the SERVER (`linkThread`): the board holds cards
 * and rules, never an edge (rule 4). A real link reveals its label and its source; a
 * missing one, a step back in time under a `forward` rule, or two matches in a row tears
 * the thread — one point of integrity. The path can be cut at any stop, Undo takes one
 * back, and a torn-through route stops and waits for a RESTART BUTTON (the prototype's
 * 1.2-second auto-restart was passive waiting, brief §10).
 *
 * The rule checklist is computed here from the TYPES printed on the cards — which is all
 * a rule needs — and the one thing it cannot know, whether the last stop reaches the end,
 * is again the server's (`closeThread`).
 */

type Stop = { card: ArchiveCard; labelKey: string; params: Record<string, number> | null; sources: SourceLine[] }
type Outcome = { ref: string; closed: boolean; score: number; stops: number; optimum: number | null; start: ArchiveCard; end: ArchiveCard }
type Feedback = { tone: 'ok' | 'bad' | 'info'; big: string; small?: string }

const REASON: Record<string, MessageKey> = {
  'no-edge': 'thread.feedback.noEdge',
  backward: 'thread.feedback.backward',
  consecutive: 'thread.feedback.consecutive',
  full: 'thread.feedback.full',
  invalid: 'thread.feedback.noEdge',
  stops: 'thread.feedback.full',
  used: 'thread.feedback.full',
  'not-in-hand': 'thread.feedback.noEdge',
}

function label(key: string, params: Record<string, number> | null): string {
  const vars = params ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) : undefined
  return t(key as MessageKey, vars)
}

function ruleText(rule: RuleKey, passNames: Record<string, string>): string {
  switch (rule.key) {
    case 'stops':
      return rule.exact ? t('thread.rule.exact', { n: String(rule.n) }) : t('thread.rule.stops', { n: String(rule.n) })
    case 'type':
      return t(`thread.rule.type.${rule.type}` as MessageKey)
    case 'pass':
      return t('thread.rule.pass', { name: passNames[rule.id] ?? rule.id })
    case 'world':
      return t('thread.rule.world')
    case 'noConsecutive':
      return t('thread.rule.noConsecutive')
    case 'time':
      return rule.mode === 'forward' ? t('thread.rule.forward') : t('thread.rule.free')
  }
}

export function ThreadBoard({ levels, seed, cursor }: { levels: PublicLevel[]; seed: number; cursor: number }) {
  const [at, setAt] = useState(0)
  const [path, setPath] = useState<Stop[]>([])
  const [integrity, setIntegrity] = useState(levels[0]?.integrity ?? 3)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const intro = voice({ gate: 13, moment: 'intro', seed: `${seed}:${cursor}` })
  // "מצאת דרך." — the route is closed; the number of steps is the figure beside it
  const found = voice({ gate: 13, moment: 'result', result: 'high', seed: `${seed}:${cursor}`, vars: { n: String(path.length + 1) } })
  const [torn, setTorn] = useState<string | null>(null)
  const [filter, setFilter] = useState<EntityType | null>(null)
  const [success, setSuccess] = useState<{ edges: ClosedEdge[]; stops: number; optimum: number; score: number } | null>(null)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [finished, setFinished] = useState(false)
  const [pending, start] = useTransition()

  // the phone stage (delta 87): a "more" sheet for the rules/log/routes that used to sit
  // under the board, the knot that is about to be filled, shaken on a miss the way a
  // hand card shakes on the desktop layout.
  const [moreOpen, setMoreOpen] = useState(false)
  const [shakeKnot, setShakeKnot] = useState(false)
  const knotRefs = useRef<Array<HTMLElement | null>>([])

  const level = levels[at] as PublicLevel
  const broken = integrity <= 0 && !success

  // a feedback line reads itself away — it never blocks a tap
  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback(null), 1800)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const typeOf = useMemo(() => {
    const map = new Map<string, EntityType>()
    for (const card of [level.start, level.end, ...level.hand]) map.set(card.id, card.type)
    return (id: string) => map.get(id) ?? null
  }, [level])

  const pathIds = path.map((stop) => stop.card.id)
  const rules = ruleStates(level.rules, pathIds, typeOf, { start: level.start.id, end: level.end.id })
  const handTypes = ENTITY_TYPES.filter((type) => level.hand.some((card) => card.type === type))
  const hand = level.hand.filter((card) => filter === null || card.type === filter)

  function tear(reason: string, cardId?: string) {
    haptic('miss')
    setIntegrity((n) => Math.max(0, n - 1))
    if (cardId) {
      setTorn(cardId)
      window.setTimeout(() => setTorn(null), 360)
    }
    // the knot that was about to be filled shakes too — the mobile stage's only feedback
    // surface, since there is no route list under it to look at.
    const knot = knotRefs.current[path.length]
    firePickFxAt(knot, { tone: 'sign', haptic: false })
    setShakeKnot(true)
    window.setTimeout(() => setShakeKnot(false), 360)
    setFeedback({ tone: 'bad', big: t('thread.feedback.torn'), small: t(REASON[reason] ?? 'thread.feedback.noEdge') })
  }

  function tryCard(card: ArchiveCard) {
    if (pending || broken || success) return
    if (pathIds.includes(card.id)) return
    if (path.length >= level.rules.maxStops) {
      setFeedback({ tone: 'info', big: t('thread.feedback.full') })
      return
    }
    const knot = knotRefs.current[path.length]
    start(async () => {
      const result = await linkThread(level.ref, pathIds, card.id)
      telemetry('red_thread_edge_attempted', { ok: result.ok, reason: result.ok ? null : result.reason })
      if (result.ok) {
        haptic('lock')
        setPath((old) => [...old, { card, labelKey: result.labelKey, params: result.params, sources: result.sources }])
        // §22: physical-thread words — "יש חיבור." — and the edge the archive holds under it
        setFeedback({ tone: 'ok', big: microFeedback(13, 'correct', seed, path.length)?.line ?? '', small: label(result.labelKey, result.params) })
        // the one pick effect the whole ground shares — fired from the knot that just locked
        firePickFxAt(knot, { label: '✓', tone: 'red', haptic: false })
        // the thread just grew: keep its end in view, without yanking a page that already shows it
        window.requestAnimationFrame(() => {
          const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          document.getElementById('thread-end')?.scrollIntoView({ block: 'nearest', behavior: still ? 'auto' : 'smooth' })
        })
        return
      }
      if (costsIntegrity(result.reason)) tear(result.reason, card.id)
      else {
        firePickFxAt(knot, { tone: 'sign', haptic: false })
        // §22: "החוט לא עובר כאן." — and why, in the archive's terms
        setFeedback({ tone: 'info', big: microFeedback(13, 'wrong', seed, path.length)?.line ?? '', small: t(REASON[result.reason] ?? 'thread.feedback.noEdge') })
      }
    })
  }

  function cut(index: number) {
    setPath((old) => old.slice(0, index))
  }

  function undo() {
    if (!path.length) return
    telemetry('undo_used', { gate: '/timeline' })
    setPath((old) => old.slice(0, -1))
  }

  function close() {
    if (pending || broken || success) return
    const missing = rules.filter((row) => !row.met)
    if (missing.length) {
      setFeedback({ tone: 'info', big: t('thread.feedback.missing', { list: missing.map((row) => ruleText(row.rule, level.passNames)).join(' · ') }) })
      return
    }
    start(async () => {
      const result = await closeThread(level.ref, pathIds, integrity)
      telemetry('red_thread_edge_attempted', { ok: result.ok, reason: result.ok ? 'close' : result.reason })
      if (result.ok) {
        haptic('lock')
        emit({ type: 'red_thread_completed', routeId: result.routeId })
        setSuccess({ edges: result.edges, stops: result.stops, optimum: result.optimum, score: result.score })
        setOutcomes((old) => [...old, { ref: level.ref, closed: true, score: result.score, stops: result.stops, optimum: result.optimum, start: level.start, end: level.end }])
        return
      }
      if (costsIntegrity(result.reason)) tear(result.reason)
      else setFeedback({ tone: 'info', big: t(REASON[result.reason] ?? 'thread.feedback.noEdge') })
    })
  }

  function load(next: number) {
    if (next >= levels.length) {
      setFinished(true)
      return
    }
    setAt(next)
    setPath([])
    setIntegrity(levels[next]?.integrity ?? 3)
    setFilter(null)
    setSuccess(null)
    setFeedback(null)
  }

  function restart() {
    telemetry('gate_restarted', { gate: '/timeline' })
    setPath([])
    setIntegrity(level.integrity)
    setFeedback(null)
  }

  function skip() {
    setOutcomes((old) => [...old, { ref: level.ref, closed: false, score: 0, stops: path.length, optimum: null, start: level.start, end: level.end }])
    load(at + 1)
  }

  if (finished) return <Result outcomes={outcomes} total={levels.length} seed={seed} cursor={cursor} />

  const ghosts = Math.max(0, Math.min(2, level.rules.maxStops - path.length))

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col md:mt-3 md:block md:flex-none">
      {/* the plate: which route, and how much thread is left */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b-rule border-ink pb-2">
        <div className="min-w-0">
          <p className="font-latin text-[9px] font-bold tracking-[0.22em] text-red" dir="ltr">
            {`ROUTE ${String(level.index + 1).padStart(2, '0')} · LEVEL ${level.tier}`}
          </p>
          <p className="font-display text-step-1 leading-tight text-ink">
            {t('thread.level', { n: String(level.index + 1), total: String(level.total) })}
            <span className="font-body text-[13px] text-muted"> · {t(`thread.tier.${level.tier}` as MessageKey)}</span>
          </p>
          {/* §22 — the intro, once, before the first knot: "בהפועל הכול מתחבר בסוף." */}
          {level.index === 0 && path.length === 0 && (
            <p className="mt-0.5 line-clamp-2 font-body text-[12px] leading-snug text-ink" data-thread="intro">
              <b className="font-display text-[13.5px]">{intro.title}</b> <span className="text-muted">{intro.body}</span>
            </p>
          )}
        </div>
        <div className="shrink-0 text-end">
          <p className="font-body text-[11px] font-bold text-muted">{t('thread.integrity')}</p>
          <ol className="mt-1 flex justify-end gap-1" aria-label={t('thread.integrity.aria', { n: String(integrity), total: String(level.integrity) })}>
            {Array.from({ length: level.integrity }, (_, i) => (
              <li key={i} className={`h-3.5 w-3.5 border-hair border-ink ${i < integrity ? 'bg-red' : 'bg-transparent opacity-40'}`} />
            ))}
          </ol>
        </div>
      </div>

      {/* the rules, as the level states them — ticked from the card types alone (desktop:
          the mobile stage shows a one-line count and the full list lives in the "more"
          sheet instead, so a wrapping list never eats the one screen the field needs) */}
      <ul className="mt-2 hidden flex-wrap gap-1 md:flex" aria-label={t('thread.rules.title')}>
        {rules.map((row, i) => (
          <li
            key={i}
            className={`border-hair px-1.5 py-0.5 font-body text-[11.5px] leading-snug ${row.met ? 'border-red bg-paper text-ink' : 'border-ink/40 bg-sheet text-muted'}`}
          >
            <span aria-hidden="true" className={`font-bold ${row.met ? 'text-red' : ''}`}>
              {row.met ? '✓ ' : '· '}
            </span>
            {ruleText(row.rule, level.passNames)}
            <span className="sr-only"> · {row.met ? t('thread.rule.met') : t('thread.rule.open')}</span>
          </li>
        ))}
      </ul>

      {/* the feedback floats over the board, so a tap far down the hand still sees it */}
      {feedback && (
        <p
          aria-live="polite"
          className={`fixed inset-x-3 top-[max(10px,env(safe-area-inset-top))] z-40 mx-auto max-w-md border-plate px-3 py-2 text-center font-body text-[13px] leading-snug ${
            feedback.tone === 'ok'
              ? 'border-ink bg-red text-paper'
              : feedback.tone === 'bad'
                ? 'animate-shake border-red bg-ink text-paper motion-reduce:animate-none'
                : 'border-ink bg-sheet text-ink'
          }`}
        >
          <b className="font-display text-[16px]">{feedback.big}</b>
          {feedback.small && <span> · {feedback.small}</span>}
        </p>
      )}

      {/* ============================================================ desktop board
          (unchanged since before delta 87 — the phone stage below replaces it only
          under md, brief: "desktop keeps its own (separate) design"). */}
      <div className="hidden md:block">
      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* ---------------------------------------------------------- the route */}
        <section aria-labelledby="thread-route" className="min-w-0">
          <h2 id="thread-route" className="sr-only">
            {t('thread.mission')}
          </h2>
          <ol className="border-s-plate border-red ps-3">
            <li>
              <Anchor card={level.start} caption={t('thread.start')} />
            </li>
            {path.map((stop, i) => (
              <li key={stop.card.id} className="mt-1">
                <EdgeTag text={label(stop.labelKey, stop.params)} sourced={stop.sources.length > 0} />
                <div className="mt-1 flex items-stretch gap-1.5">
                  <div className="min-w-0 flex-1">
                    <Anchor card={stop.card} compact />
                  </div>
                  <button
                    type="button"
                    onClick={() => cut(i)}
                    aria-label={t('thread.cut', { name: cardTitle(stop.card) })}
                    className="flex min-h-tap min-w-tap shrink-0 items-center justify-center border-rule border-ink bg-paper"
                  >
                    <CloseMark />
                  </button>
                </div>
              </li>
            ))}
            {Array.from({ length: ghosts }, (_, i) => (
              <li key={`ghost-${i}`} className="mt-1.5 flex min-h-[32px] items-center border-hair border-dashed border-ink/40 px-3 font-body text-[11.5px] text-muted">
                + {t('thread.stops')}
              </li>
            ))}
            <li className="mt-2" id="thread-end">
              <Anchor card={level.end} caption={t('thread.end')} end />
            </li>
          </ol>
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-1.5">
            <button
              type="button"
              onClick={close}
              disabled={pending || broken}
              aria-label={t('thread.close.aria')}
              className="min-h-tap border-rule border-red bg-red px-3 font-body text-[15px] font-extrabold text-paper disabled:opacity-50"
            >
              {pending ? t('thread.feedback.checking') : t('thread.close')}
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={!path.length || pending}
              className="min-h-tap border-rule border-ink bg-sheet px-3 font-body text-[13.5px] font-bold text-ink disabled:opacity-40"
            >
              ↶ {t('thread.undo')}
            </button>
          </div>
          <p className="mt-1.5 font-body text-[12px] text-muted">
            {t('thread.stops')}: {t('thread.stops.value', { n: String(path.length), max: String(level.rules.maxStops) })}
          </p>
        </section>

        {/* ---------------------------------------------------------- the hand */}
        <section aria-labelledby="thread-hand" className="min-w-0">
          {broken ? (
            <div className="border-plate border-ink bg-ink px-4 py-4 text-paper">
              <p className="font-latin text-[10px] font-bold tracking-[0.24em] text-red" dir="ltr">
                THREAD TORN
              </p>
              <h2 id="thread-hand" className="font-display text-step-2 leading-tight">
                {t('thread.broken.title')}
              </h2>
              <p className="mt-1 font-body text-[13px] leading-relaxed text-concrete">{t('thread.broken.body')}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={restart} className="min-h-tap border-rule border-red bg-red px-3 font-body text-[14px] font-extrabold text-paper">
                  {t('thread.broken.restart')}
                </button>
                <button type="button" onClick={skip} className="min-h-tap border-rule border-concrete px-3 font-body text-[14px] font-bold text-paper">
                  {t('thread.broken.skip')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <h2 id="thread-hand" className="font-display text-step-1 leading-tight text-ink">
                  {t('thread.hand')}
                </h2>
                <p className="font-latin text-[9px] font-bold tracking-[0.22em] text-sign" dir="ltr">
                  ARCHIVE HAND
                </p>
              </div>
              <div className="-mx-gutter mt-1.5 flex gap-1.5 overflow-x-auto px-gutter pb-1" role="group" aria-label={t('thread.filter.aria')}>
                {[null, ...handTypes].map((type) => (
                  <button
                    key={type ?? 'all'}
                    type="button"
                    onClick={() => setFilter(type)}
                    aria-pressed={filter === type}
                    className={`min-h-tap shrink-0 border-rule px-3 font-body text-[12.5px] font-bold ${filter === type ? 'border-red bg-red text-paper' : 'border-ink/40 bg-sheet text-ink'}`}
                  >
                    {type ? t(`graph.types.${type}` as MessageKey) : t('thread.filter.all')}
                  </button>
                ))}
              </div>
              {/* a row you thumb through on a phone, a grid on a desk */}
              <ul
                className="-mx-gutter mt-2 flex snap-x gap-1.5 overflow-x-auto px-gutter pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0"
                aria-label={t('thread.hand.aria')}
                aria-busy={pending}
              >
                {hand.map((card) => {
                  const used = pathIds.includes(card.id)
                  return (
                    <li key={card.id} className="w-[44%] min-w-[136px] max-w-[176px] shrink-0 snap-start lg:w-auto lg:max-w-none">
                      <button
                        type="button"
                        onClick={() => tryCard(card)}
                        disabled={used || pending}
                        aria-pressed={used}
                        className={`flex h-full min-h-[104px] w-full min-w-0 flex-col items-start border-rule p-2 text-start transition-transform duration-press ease-stamp active:scale-[.97] motion-reduce:transition-none ${
                          used ? 'border-red bg-paper opacity-60' : 'border-ink bg-sheet hover:bg-paper'
                        } ${torn === card.id ? 'animate-shake motion-reduce:animate-none' : ''}`}
                      >
                        <span className="flex w-full items-start justify-between gap-1">
                          <span className="min-w-0 font-body text-[11px] font-extrabold leading-tight text-red">
                            {used && <span aria-hidden="true">✓ </span>}
                            {typeLabel(card)}
                          </span>
                          <ArtifactMark card={card} className="h-7 w-7 shrink-0" />
                        </span>
                        <CardHeadline card={card} className="mt-1 line-clamp-3 w-full min-w-0 break-words font-sign text-[13.5px] leading-tight text-ink" />
                        {card.when && (
                          <span className="mt-auto block w-full truncate pt-1 font-mono text-[11px] tabular-nums text-muted">
                            <Num>{card.when}</Num>
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          {/* the route log */}
          <div className="mt-2 border-t-hair border-ink/30 pt-2">
            <p className="font-body text-[12px] font-extrabold text-ink">{t('thread.log.title')}</p>
            {path.length === 0 ? (
              <p className="mt-1 font-body text-[12px] text-muted">{t('thread.log.empty')}</p>
            ) : (
              <ol className="mt-1 grid gap-1">
                {path.map((stop, i) => (
                  <li key={stop.card.id} className="font-body text-[12px] leading-snug text-ink">
                    <span className="font-bold text-red">{label(stop.labelKey, stop.params)}</span>
                    {' · '}
                    <bdi>{i === 0 ? cardTitle(level.start) : cardTitle(path[i - 1]!.card)}</bdi> ← <bdi>{cardTitle(stop.card)}</bdi>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>

      {/* the red line: this run's five routes */}
      <div className="mt-stack border-t-rule border-ink pt-2">
        <p className="font-body text-[11px] font-extrabold text-muted">{t('thread.world')}</p>
        <ol className="mt-1.5 grid grid-cols-5 gap-1">
          {levels.map((row, i) => {
            const outcome = outcomes.find((o) => o.ref === row.ref)
            const state = outcome ? (outcome.closed ? 'done' : 'skipped') : i === at ? 'current' : 'locked'
            return (
              <li
                key={row.ref}
                className={`border-t-plate px-0.5 pt-1 text-center ${state === 'done' ? 'border-red' : state === 'current' ? 'border-ink' : 'border-ink/20'}`}
              >
                <span className="block font-poster text-[20px] leading-none text-ink">
                  <Num>{i + 1}</Num>
                </span>
                <span className="block font-body text-[10.5px] leading-tight text-muted">{t(`thread.world.${state}` as MessageKey)}</span>
              </li>
            )
          })}
        </ol>
      </div>
      </div>
      {/* ============================================================ /desktop board */}

      {/* ============================================================ phone stage
          (delta 87, Maor 23.9.2026: "the game is not understood because of the
          design — must improve"). Start pinned at the top, the goal pinned at the
          bottom, a red line stretched between them through the stops laid so far,
          and the candidates docked at the foot so the whole run fits one screen. */}
      <div className="mt-2 flex min-h-0 flex-1 flex-col md:hidden">
        <p className="shrink-0 font-mono text-[11px] font-bold tabular-nums text-muted">
          {t('stage.play.thread.hud.stop', { n: String(Math.min(path.length + 1, level.rules.maxStops)), max: String(level.rules.maxStops) })}
          {' · '}
          <span className={rules.every((row) => row.met) ? 'text-red' : ''}>
            {t('stage.play.thread.hud.rules', { met: String(rules.filter((row) => row.met).length), total: String(rules.length) })}
          </span>
        </p>
        <p aria-live="polite" className="shrink-0 font-body text-[12.5px] leading-snug text-ink">
          {broken
            ? t('thread.broken.body')
            : success
              ? found.title
              : t('stage.play.thread.instruct', {
                  name: path.length ? cardTitle((path[path.length - 1] as Stop).card) : cardTitle(level.start),
                })}
        </p>

        {broken ? (
          <div className="mt-2 flex min-h-0 flex-1 flex-col justify-center border-plate border-ink bg-ink px-4 py-4 text-paper">
            <p className="font-latin text-[10px] font-bold tracking-[0.24em] text-red" dir="ltr">
              THREAD TORN
            </p>
            <h2 className="font-display text-step-2 leading-tight">{t('thread.broken.title')}</h2>
            <p className="mt-1 font-body text-[13px] leading-relaxed text-concrete">{t('thread.broken.body')}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={restart} className="min-h-tap border-rule border-red bg-red px-3 font-body text-[14px] font-extrabold text-paper">
                {t('thread.broken.restart')}
              </button>
              <button type="button" onClick={skip} className="min-h-tap border-rule border-concrete px-3 font-body text-[14px] font-bold text-paper">
                {t('thread.broken.skip')}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* THE FIELD — start anchored top, goal anchored bottom, the thread between */}
            <div className="mt-1.5 flex min-h-0 flex-1 flex-col">
              <Anchor card={level.start} caption={t('thread.start')} />
              <div className="min-h-0 flex-1 overflow-y-auto py-0.5">
                <ol aria-label={t('thread.mission')} className="grid">
                  {Array.from({ length: level.rules.maxStops }, (_, i) => {
                    const stop = path[i]
                    const filled = Boolean(stop)
                    const current = !filled && i === path.length
                    return (
                      <li key={i} className="flex items-stretch gap-2">
                        <div className="flex w-6 shrink-0 flex-col items-center">
                          <span
                            aria-hidden="true"
                            className={`w-[3px] flex-1 origin-top transition-transform duration-500 ease-stamp motion-reduce:transition-none ${
                              filled ? 'scale-y-100 bg-red' : 'scale-y-100 border-s-2 border-dashed border-ink/25'
                            }`}
                          />
                          <span
                            ref={(el) => {
                              knotRefs.current[i] = el
                            }}
                            aria-hidden="true"
                            className={`flex h-6 w-6 shrink-0 items-center justify-center border-rule font-mono text-[11px] font-bold tabular-nums transition-transform duration-press ease-stamp ${
                              filled
                                ? 'border-red bg-red text-paper'
                                : current
                                  ? `border-red bg-paper text-red ${shakeKnot ? 'animate-shake motion-reduce:animate-none' : ''}`
                                  : 'border-ink/30 bg-sheet text-muted'
                            }`}
                          >
                            {filled ? '✓' : i + 1}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 py-1">
                          {stop ? (
                            <button
                              type="button"
                              onClick={() => cut(i)}
                              aria-label={t('thread.cut', { name: cardTitle(stop.card) })}
                              className="flex w-full min-w-0 items-center justify-between gap-1.5 border-hair border-red bg-paper px-2 py-1 text-start"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-sign text-[13px] leading-tight text-ink">{cardTitle(stop.card)}</span>
                                <span className="block truncate font-body text-[10px] font-bold text-red">{label(stop.labelKey, stop.params)}</span>
                              </span>
                              <CloseMark className="h-3.5 w-3.5 shrink-0 stroke-ink" />
                            </button>
                          ) : (
                            <p className={`truncate py-1.5 font-body text-[11.5px] leading-tight ${current ? 'font-bold text-ink' : 'text-muted'}`}>
                              {current ? t('thread.stops') : '···'}
                            </p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </div>
              <span
                aria-hidden="true"
                className={`mx-3 block h-3 w-[3px] ${success || path.length >= level.rules.maxStops ? 'bg-red' : 'border-s-2 border-dashed border-ink/25'}`}
              />
              <Anchor card={level.end} caption={t('thread.end')} end />
            </div>

            {/* DOCK — candidates, then the primary action */}
            <div className="mt-2 shrink-0">
              <div className="-mx-gutter flex gap-1.5 overflow-x-auto px-gutter pb-1" role="group" aria-label={t('thread.filter.aria')}>
                {[null, ...handTypes].map((type) => (
                  <button
                    key={type ?? 'all'}
                    type="button"
                    onClick={() => setFilter(type)}
                    aria-pressed={filter === type}
                    className={`min-h-tap shrink-0 border-rule px-3 font-body text-[12px] font-bold ${filter === type ? 'border-red bg-red text-paper' : 'border-ink/40 bg-sheet text-ink'}`}
                  >
                    {type ? t(`graph.types.${type}` as MessageKey) : t('thread.filter.all')}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  className="ms-auto flex min-h-tap shrink-0 items-center gap-1 border-rule border-ink/40 bg-sheet px-3 font-body text-[12px] font-bold text-ink"
                >
                  {t('stage.more')}
                  {rules.some((row) => !row.met) && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 bg-red" />}
                </button>
              </div>

              <ul
                className="-mx-gutter mt-1.5 flex snap-x gap-1.5 overflow-x-auto px-gutter pb-1.5"
                aria-label={t('thread.hand.aria')}
                aria-busy={pending}
              >
                {hand.map((card) => {
                  const used = pathIds.includes(card.id)
                  return (
                    <li key={card.id} className="w-[42%] min-w-[132px] max-w-[168px] shrink-0 snap-start">
                      <button
                        type="button"
                        onClick={() => tryCard(card)}
                        disabled={used || pending}
                        aria-pressed={used}
                        className={`flex h-full min-h-[92px] w-full min-w-0 flex-col items-start border-rule p-2 text-start transition-transform duration-press ease-stamp active:scale-[.97] motion-reduce:transition-none ${
                          used ? 'border-red bg-paper opacity-60' : 'border-ink bg-sheet'
                        } ${torn === card.id ? 'animate-shake motion-reduce:animate-none' : ''}`}
                      >
                        <span className="flex w-full items-start justify-between gap-1">
                          <span className="min-w-0 font-body text-[10.5px] font-extrabold leading-tight text-red">
                            {used && <span aria-hidden="true">✓ </span>}
                            {typeLabel(card)}
                          </span>
                          <ArtifactMark card={card} className="h-6 w-6 shrink-0" />
                        </span>
                        <CardHeadline card={card} className="mt-1 line-clamp-3 w-full min-w-0 break-words font-sign text-[13px] leading-tight text-ink" />
                        {card.when && (
                          <span className="mt-auto block w-full truncate pt-1 font-mono text-[10.5px] tabular-nums text-muted">
                            <Num>{card.when}</Num>
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-1.5">
                <button
                  type="button"
                  onClick={close}
                  disabled={pending || broken}
                  aria-label={t('thread.close.aria')}
                  className="min-h-tap border-rule border-red bg-red px-3 font-body text-[15px] font-extrabold text-paper disabled:opacity-50"
                >
                  {pending ? t('thread.feedback.checking') : t('thread.close')}
                </button>
                <button
                  type="button"
                  onClick={undo}
                  disabled={!path.length || pending}
                  className="min-h-tap border-rule border-ink bg-sheet px-3 font-body text-[13px] font-bold text-ink disabled:opacity-40"
                >
                  ↶ {t('thread.undo')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* the "more" sheet — the rules in full, the route log, this run's five routes:
          everything that used to sit stacked under the board now slides up over it */}
      <SlideSheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t('thread.rules.title')} latin="HOW IT WORKS">
        <ul className="grid gap-1" aria-label={t('thread.rules.title')}>
          {rules.map((row, i) => (
            <li
              key={i}
              className={`border-hair px-2 py-1 font-body text-[13px] leading-snug ${row.met ? 'border-red bg-paper text-ink' : 'border-ink/40 bg-sheet text-muted'}`}
            >
              <span aria-hidden="true" className={`font-bold ${row.met ? 'text-red' : ''}`}>
                {row.met ? '✓ ' : '· '}
              </span>
              {ruleText(row.rule, level.passNames)}
              <span className="sr-only"> · {row.met ? t('thread.rule.met') : t('thread.rule.open')}</span>
            </li>
          ))}
        </ul>
        <p className="mt-1 font-body text-[12px] text-muted">
          {t('thread.stops')}: {t('thread.stops.value', { n: String(path.length), max: String(level.rules.maxStops) })}
        </p>

        <p className="mt-3 font-body text-[12px] font-extrabold text-ink">{t('thread.log.title')}</p>
        {path.length === 0 ? (
          <p className="mt-1 font-body text-[12px] text-muted">{t('thread.log.empty')}</p>
        ) : (
          <ol className="mt-1 grid gap-1">
            {path.map((stop, i) => (
              <li key={stop.card.id} className="font-body text-[12px] leading-snug text-ink">
                <span className="font-bold text-red">{label(stop.labelKey, stop.params)}</span>
                {' · '}
                <bdi>{i === 0 ? cardTitle(level.start) : cardTitle((path[i - 1] as Stop).card)}</bdi> ← <bdi>{cardTitle(stop.card)}</bdi>
              </li>
            ))}
          </ol>
        )}

        <p className="mt-3 font-body text-[11px] font-extrabold text-muted">{t('thread.world')}</p>
        <ol className="mt-1.5 grid grid-cols-5 gap-1">
          {levels.map((row, i) => {
            const outcome = outcomes.find((o) => o.ref === row.ref)
            const state = outcome ? (outcome.closed ? 'done' : 'skipped') : i === at ? 'current' : 'locked'
            return (
              <li
                key={row.ref}
                className={`border-t-plate px-0.5 pt-1 text-center ${state === 'done' ? 'border-red' : state === 'current' ? 'border-ink' : 'border-ink/20'}`}
              >
                <span className="block font-poster text-[20px] leading-none text-ink">
                  <Num>{i + 1}</Num>
                </span>
                <span className="block font-body text-[10.5px] leading-tight text-muted">{t(`thread.world.${state}` as MessageKey)}</span>
              </li>
            )
          })}
        </ol>
      </SlideSheet>
      {/* ============================================================ /phone stage */}

      {success && (
        <Success
          level={level}
          success={success}
          last={at + 1 >= levels.length}
          onNext={() => load(at + 1)}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ pieces */

function Anchor({ card, caption, end = false, compact = false }: { card: ArchiveCard; caption?: string; end?: boolean; compact?: boolean }) {
  if (compact)
    return (
      <div className="flex min-h-tap items-center gap-2 border-rule border-ink bg-sheet px-2 py-1">
        <ArtifactMark card={card} className="h-7 w-7 shrink-0" />
        <div className="min-w-0 flex-1">
          <CardHeadline card={card} className="block truncate font-sign text-[14px] leading-tight text-ink" />
          <p className="truncate font-body text-[10.5px] font-bold text-red">
            {typeLabel(card)}
            {card.when && <span className="font-mono tabular-nums text-muted"> · <Num>{card.when}</Num></span>}
          </p>
        </div>
      </div>
    )
  return (
    <div className={`flex items-center gap-2.5 border-rule px-2.5 py-2 ${end ? 'border-red bg-paper' : caption ? 'border-ink bg-ink text-paper' : 'border-ink bg-sheet'}`}>
      <ArtifactMark card={card} className={`h-9 w-9 shrink-0 ${caption && !end ? 'bg-sheet p-0.5' : ''}`} />
      <div className="min-w-0 flex-1">
        {caption && <p className={`font-body text-[11px] font-extrabold ${end ? 'text-red' : 'text-concrete'}`}>{caption}</p>}
        <CardHeadline card={card} className={`block font-sign text-[15px] leading-tight ${caption && !end ? 'text-paper' : 'text-ink'}`} />
        <Eyebrow card={card} className={caption && !end ? '[&_*]:text-concrete' : ''} />
      </div>
    </div>
  )
}

/** an edge's label, and — when the graph holds a source for it — the one indicator (spec §0.3) */
function EdgeTag({ text, sourced }: { text: string; sourced: boolean }) {
  return (
    <p className="-ms-3 flex items-center gap-1.5">
      <span aria-hidden="true" className="h-[3px] w-3 bg-red" />
      <span className="border-hair border-red bg-sheet px-1.5 py-0.5 font-body text-[11.5px] font-bold leading-tight text-red">{text}</span>
      {sourced && <SourceNote newTab />}
    </p>
  )
}

function Success({
  level,
  success,
  last,
  onNext,
}: {
  level: PublicLevel
  success: { edges: ClosedEdge[]; stops: number; optimum: number; score: number }
  last: boolean
  onNext: () => void
}) {
  const ref = useDialog<HTMLDivElement>(onNext)
  const [shown, setShown] = useState(false)
  // §22: "מצאת דרך." — the shortest route is perfect, a longer one is still a way
  const found = voice({ gate: 13, moment: 'result', result: success.stops <= success.optimum ? 'perfect' : 'high', seed: level.ref, vars: { n: String(success.stops + 1) } })
  const beat = useReveal({ ms: 700 * success.edges.length + 600, active: !shown, onDone: () => setShown(true) })
  const visible = shown ? success.edges.length : Math.max(1, Math.ceil((1 - beat.progress) * success.edges.length))

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={found.title}
      className="fixed inset-0 z-[60] flex flex-col justify-end bg-ink/70 outline-none sm:justify-center"
    >
      <div className="max-h-[90dvh] w-full animate-sheet-in overflow-y-auto border-t-plate border-red bg-sheet motion-reduce:animate-none sm:mx-auto sm:max-w-[560px] sm:border-plate">
        <div className="bg-ink px-4 pb-3 pt-3 text-paper">
          <p className="font-latin text-[10px] font-bold tracking-[0.24em] text-red" dir="ltr">
            {t('thread.success.kicker')}
          </p>
          <h2 className="font-display text-step-3 leading-tight">{found.title}</h2>
          <p className="font-body text-[13px] text-concrete">
            {t('thread.success.body', { stops: String(success.stops), optimum: String(success.optimum) })} ·{' '}
            <b className="text-paper">{t('thread.success.points', { n: String(success.score) })}</b>
          </p>
        </div>
        {!shown && <RevealBar progress={beat.progress} />}
        <ol className="grid gap-2 px-4 py-3">
          {success.edges.slice(0, visible).map((edge, i) => (
            <li key={i} className="animate-paste-in border-s-plate border-red ps-2.5 motion-reduce:animate-none">
              <p className="font-body text-[13px] leading-snug text-ink">
                <Link href={`/archive?at=${encodeURIComponent(edge.from.id)}`} className="font-bold underline decoration-ink/30 underline-offset-2">
                  <bdi>{cardTitle(edge.from)}</bdi>
                </Link>{' '}
                <span className="font-extrabold text-red">— {label(edge.labelKey, edge.params)} ←</span>{' '}
                <Link href={`/archive?at=${encodeURIComponent(edge.to.id)}`} className="font-bold underline decoration-ink/30 underline-offset-2">
                  <bdi>{cardTitle(edge.to)}</bdi>
                </Link>
              </p>
              {/* how sure the graph is stays here; which source is on /credits (spec §0.3) */}
              {edge.sources[0] && (
                <p className="flex flex-wrap items-center gap-x-2 font-body text-[11px] leading-snug text-muted">
                  <span>{t(`graph.conf.${edge.sources[0].confidence}` as MessageKey)}</span>
                  <SourceNote newTab />
                </p>
              )}
            </li>
          ))}
        </ol>
        <div className="grid grid-cols-2 gap-2 border-t-rule border-ink px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
          {shown ? (
            <Link
              href={`/archive?at=${encodeURIComponent(level.end.id)}`}
              className="flex min-h-tap items-center justify-center border-rule border-ink bg-sheet px-2 text-center font-body text-[13px] font-bold leading-tight text-ink"
            >
              {t('thread.success.archive')}
            </Link>
          ) : (
            <button type="button" onClick={() => beat.skip()} className="min-h-tap border-rule border-ink bg-sheet px-2 font-body text-[13.5px] font-bold text-ink">
              {t('thread.success.skip')}
            </button>
          )}
          <button type="button" onClick={onNext} className="min-h-tap border-rule border-red bg-red px-2 font-body text-[13.5px] font-extrabold text-paper">
            {last ? t('thread.success.finish') : t('thread.success.next')}
          </button>
        </div>
        <p className="sr-only">{`${cardTitle(level.start)} ← ${cardTitle(level.end)}`}</p>
      </div>
    </div>
  )
}


function Result({ outcomes, total, seed, cursor }: { outcomes: Outcome[]; total: number; seed: number; cursor: number }) {
  const closed = outcomes.filter((o) => o.closed)
  const score = outcomes.reduce((sum, o) => sum + o.score, 0)
  const mine: ChallengeResult = {
    gate: 13,
    variant: 'thread',
    steps: outcomes.map((o) => (o.closed ? o.stops + 1 : 0)),
    solved: outcomes.map((o) => o.closed),
  }
  const spoken = voice({ gate: 13, moment: 'result', result: tierFromShare(total > 0 ? closed.length / total : 0), seed: `${seed}:${cursor}`, vars: { n: String(closed.reduce((sum, o) => sum + o.stops + 1, 0)) } })
  const [next, setNext] = useState<NextAction[]>([])
  useEffect(() => {
    track('run_complete', { detail: 'timeline-thread', value: closed.length })
    let live = true
    // the ResultContext: every anchor of a closed route is a canonical archive id
    nextAfterThread(closed.flatMap((o) => [o.start.id, o.end.id]), `${seed}:${cursor}`, score)
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
    <div className="mt-3">
      <RecordRun gate="/timeline" seed={seed} score={score} correct={closed.length} asked={total} />
      <div className="border-plate border-ink bg-ink px-4 py-4 text-paper">
        <p className="font-latin text-[10px] font-bold tracking-[0.24em] text-red" dir="ltr">
          GATE 13 · THE RED THREAD
        </p>
        <h2 className="font-display text-step-3 leading-tight" data-exit="emotion">{spoken.title}</h2>
        <p className="mt-1 font-body text-[13.5px] leading-relaxed text-concrete">
          {t('thread.result.body', { closed: String(closed.length), total: String(total) })}
        </p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="border-rule border-ink bg-sheet p-3 text-center">
          <p className="font-poster text-[44px] leading-none text-red">
            <Num>{score}</Num>
          </p>
          <p className="font-body text-[11px] font-bold text-muted">{t('thread.result.score')}</p>
        </div>
        <div className="border-rule border-ink bg-sheet p-3 text-center">
          <p className="font-poster text-[44px] leading-none text-ink">
            <Num>{`${closed.length}/${total}`}</Num>
          </p>
          <p className="font-body text-[11px] font-bold text-muted">{t('thread.result.closed')}</p>
        </div>
      </div>
      <p className="mt-stack font-body text-[12px] font-extrabold text-ink">{t('thread.result.routes')}</p>
      {closed.length === 0 && <p className="mt-1 font-body text-[12.5px] text-muted">{t('thread.result.none')}</p>}
      <ol className="mt-1 grid gap-1.5">
        {outcomes.map((o) => (
          <li key={o.ref} className={`border-s-plate ps-2.5 ${o.closed ? 'border-red' : 'border-ink/30'}`}>
            <p className="font-body text-[13px] leading-snug text-ink">
              <Link href={`/archive?at=${encodeURIComponent(o.start.id)}`} className="underline decoration-ink/30 underline-offset-2">
                <bdi>{cardTitle(o.start)}</bdi>
              </Link>
              {' ← '}
              <Link href={`/archive?at=${encodeURIComponent(o.end.id)}`} className="underline decoration-ink/30 underline-offset-2">
                <bdi>{cardTitle(o.end)}</bdi>
              </Link>
            </p>
            <p className="font-body text-[11px] text-muted">
              {o.closed ? t('thread.success.body', { stops: String(o.stops), optimum: String(o.optimum ?? o.stops) }) : t('thread.world.skipped')}
            </p>
          </li>
        ))}
      </ol>
      <CompareCard gate={13} mine={mine} />
      <div className="mt-3">
        <ExitNext next={next} from="timeline-thread" />
      </div>
      <ShareRow
        kind="thread"
        params={{ s: String(seed), r: String(cursor) }}
        headline={`${closed.length}/${total}`}
        card={stripCard({
          variant: 'thread',
          // the two ends each level showed at its start — never the route between them
          rows: outcomes.map((o) => ({ text: `${cardTitle(o.start)} ← ${cardTitle(o.end)}`, ok: o.closed })),
          steps: closed.reduce((sum, o) => sum + o.stops + 1, 0),
        })}
        challenge={{ gate: 13, params: { variant: 'thread' }, result: mine }}
      />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <PlayLink gate="/timeline" className="flex min-h-tap items-center justify-center border-rule border-red bg-red px-4 font-body text-step-0 font-extrabold text-paper">
          {t('thread.result.again')}
        </PlayLink>
        <Link href="/archive" className="flex min-h-tap items-center justify-center border-rule border-ink bg-sheet px-4 font-body text-step-0 font-bold text-ink">
          {t('screen.archive.title')}
        </Link>
      </div>
      <p className="mt-2 font-mono text-[10px] tabular-nums text-muted">
        <Num>{`#${seed}·${cursor}`}</Num>
      </p>
    </div>
  )
}
