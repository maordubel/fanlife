'use client'

import { blackCard } from '@/lib/share/artefacts'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { EnemyPlate } from '@/components/hate/EnemyPlate'
import { Punch } from '@/components/play/Punch'
import { PlayLink } from '@/components/play/PlayLink'
import { RecordRun } from '@/components/play/RecordRun'
import { RevealBar, useReveal } from '@/components/play/Reveal'
import { ShareRow } from '@/components/share/ShareRow'
import { AdSlot } from '@/components/ads/AdSlot'
import { firePickFx, firePickFxAt } from '@/components/stage/PickFx'
import { SlideSheet } from '@/components/stage/SlideSheet'
import { SourceNote } from '@/components/ui/SourceNote'
import { useDialog } from '@/components/ui/useDialog'
import {
  DUEL_COUNT,
  STAMP_MS,
  choose,
  damageOf,
  duelOf,
  judgeWall,
  over,
  readWallCode,
  revenge,
  revengeChoices,
  startWall,
  streakOf,
  type Enemy,
  type Wall,
  type WallVerdict,
} from '@/lib/game/hate-run'
import { haptic } from '@/lib/play/haptics'
import { emit } from '@/lib/profile/events'
import { recordDuelTaken } from '@/lib/profile/store'
import { withRound } from '@/lib/rotation/deck'
import { t, type MessageKey } from '@/lib/i18n'
import type { Embedded } from '@/lib/mechanics/types'
import { ExitNext, ExitShare } from '@/components/result/UniversalExit'
import { track } from '@/lib/analytics/meter'
import type { NextAction } from '@/lib/results/types'
import { voice, voiceAction } from '@/lib/voice'
import { nextAfterWall } from './file/actions'
import { WallDamage } from './WallDamage'

/**
 * שער 11 — הקיר השחור (v3).
 *
 * Two posters on a black wall. Tap (or drag toward) the one you cannot tear off; the
 * other is torn down and the next one goes up. Eight rounds. See `lib/game/hate-run.ts`
 * for the rules — this file is the wall they run on.
 *
 * The stamp between rounds is the old 520 ms, and a tap ends it now (the prototype's
 * chain was 360 + 260 + 1,250 ms and could not be skipped — brief §10). The בלי רחמים
 * rounds say so in a banner that blocks nothing: v3's full-screen 900 ms overlay was a
 * wait with no rule behind it.
 */

const THRESHOLD = 68
const SLOP = 6

type Side = 'holder' | 'challenger'

export function HateWall({
  enemies,
  order,
  noMercy,
  seed,
  cursor = 0,
  pinned,
  rosterSize,
  embedded,
}: {
  enemies: Enemy[]
  order: string[]
  noMercy: string[]
  seed: number
  cursor?: number
  /** the wall came from a link — a friend's wall, or a typed code */
  pinned: boolean
  rosterSize: number
  /**
   * Opened from inside THE WORKER LIFE — Shachor's notebook outside the hall. The same wall
   * over the names that were names before the life's year; when the queue runs out the
   * wall hands back how many duels were answered (an opinion is never graded, rule 74) and
   * the verdict page, the record and the share are the gate's alone.
   */
  embedded?: Omit<Embedded<{ duels: number; of: number }>, 'window'>
}) {
  const [wall, setWall] = useState<Wall>(() => startWall(order, noMercy))
  const intro = voice({ gate: 11, moment: 'intro', seed: `${seed}:${cursor}` })
  const [stamped, setStamped] = useState<{ won: string; out: string } | null>(null)
  const [drag, setDrag] = useState(0)
  const [revengeOpen, setRevengeOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const start = useRef<number | null>(null)
  const captured = useRef(false)
  const counted = useRef(false)

  const bySlug = useMemo(() => new Map(enemies.map((enemy) => [enemy.slug, enemy])), [enemies])
  const duel = duelOf(wall)
  const holder = duel ? bySlug.get(duel.holder) : undefined
  const challenger = duel ? bySlug.get(duel.challenger) : undefined
  const streak = streakOf(wall)

  // a wall that arrived from somebody else's link is a duel taken — counted once
  useEffect(() => {
    if (!pinned || counted.current) return
    counted.current = true
    recordDuelTaken()
  }, [pinned])

  const commit = useCallback(() => {
    setWall((current) => (stamped ? choose(current, stamped.won) : current))
    setStamped(null)
  }, [stamped])

  const stamp = useReveal({ ms: STAMP_MS, onDone: commit, active: stamped !== null })

  // inside the life the wall ends in the room, not on a verdict page
  const handedBack = useRef(false)
  const done = over(wall)
  useEffect(() => {
    if (!embedded || !done || handedBack.current) return
    handedBack.current = true
    embedded.onResult({ duels: wall.picks.length, of: Math.max(1, order.length - 1) })
  }, [done, embedded, order.length, wall.picks.length])

  function pick(side: Side, el?: HTMLElement) {
    if (!holder || !challenger || stamped) return
    setDrag(0)
    start.current = null
    captured.current = false
    setStamped(side === 'holder' ? { won: holder.slug, out: challenger.slug } : { won: challenger.slug, out: holder.slug })
    if (el) firePickFxAt(el, { tone: 'away', haptic: 'lock' })
    else firePickFx(window.innerWidth / 2, window.innerHeight / 2, { tone: 'away', haptic: 'lock' })
  }

  function onDown(event: React.PointerEvent<HTMLDivElement>) {
    if (stamped) {
      stamp.skip()
      return
    }
    start.current = event.clientX
    captured.current = false
  }

  function onMove(event: React.PointerEvent<HTMLDivElement>) {
    if (start.current === null) return
    const dx = event.clientX - start.current
    if (!captured.current) {
      if (Math.abs(dx) < SLOP) return
      captured.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    setDrag(Math.sign(dx) * Math.min(Math.abs(dx), THRESHOLD * 1.6))
  }

  function onUp() {
    if (start.current === null) return
    const dx = captured.current ? drag : 0
    start.current = null
    captured.current = false
    if (Math.abs(dx) >= THRESHOLD) pick(dx > 0 ? 'holder' : 'challenger')
    else setDrag(0)
  }

  if (over(wall)) {
    if (embedded) return null
    const verdict = judgeWall(enemies, wall, seed, cursor)
    if (verdict) return <StillHere verdict={verdict} seed={seed} cursor={cursor} pinned={pinned} rosterSize={rosterSize} />
    return null
  }
  if (!duel || !holder || !challenger) return null

  const lean = Math.max(-1, Math.min(1, drag / THRESHOLD))
  const choices = revengeChoices(wall)

  return (
    <div className="relative -mx-gutter mt-0.5 select-none overflow-hidden bg-hate-field px-gutter pb-2 pt-1.5 md:mt-stack md:pb-6 md:pt-3">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[url('/art/wall-paste-up.png')] bg-[length:256px_256px] bg-repeat"
      />
      <div aria-hidden="true" className="hate-dots pointer-events-none absolute inset-0" />
      <div className="relative">
        {pinned && <FriendBanner />}

        <div className="flex items-end justify-between gap-3 border-b-rule border-hate-red-light pb-1.5">
          <div>
            {!embedded && (
              <p className="font-latin text-[9px] font-bold tracking-[0.2em] text-hate-red-light" dir="ltr">
                GATE 11 · THE BLACK WALL
              </p>
            )}
            <p className="font-display text-step-1 leading-tight text-hate-ink">
              {t('hate.wall.round', { n: String(duel.round), of: String(Math.min(DUEL_COUNT, order.length - 1)) })}
            </p>
          </div>
          <ol className="flex items-center gap-1.5" aria-label={t('hate.wall.trail')}>
            {Array.from({ length: Math.min(DUEL_COUNT, order.length - 1) }, (_, index) => (
              <li
                key={index}
                className={`h-2.5 w-2.5 border-hair ${
                  index < wall.picks.length
                    ? 'border-hate-ink/50 bg-hate-red-light'
                    : index === wall.picks.length
                      ? 'border-hate-red-light bg-transparent'
                      : 'border-hate-ink/30 bg-transparent'
                }`}
              />
            ))}
          </ol>
        </div>

        {wall.picks.length === 0 && (
          // §20: "אחד נשאר על הקיר." — and the rule under it: a file for every name, the rest is the terrace's opinion
          <p className="mt-1.5 line-clamp-2 max-w-prose font-body text-[11.5px] leading-snug text-hate-muted" data-hate="intro">
            <span className="font-extrabold text-hate-ink">{intro.title}</span> {intro.body}
          </p>
        )}

        {duel.noMercy && (
          <p role="status" className="mt-1.5 border-rule border-hate-red-light bg-hate-red-deep px-3 py-1.5 font-body text-[12px] font-extrabold text-hate-ink">
            <span className="block font-latin text-[9px] tracking-[0.2em] text-hate-red-light" dir="ltr">
              NO MERCY
            </span>
            {t('hate.wall.noMercy')}
          </p>
        )}

        <p className="mt-1 font-display text-[16px] leading-tight text-hate-ink">{t('hate.wall.pick')}</p>

        <div className="overflow-x-clip">
          <div
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className="mt-1.5 touch-pan-y"
            style={{ transform: `translateX(${drag * 0.35}px)` }}
          >
            <div className="flex items-stretch justify-between gap-2 pb-1">
              <SideTag label={holder.nameHe} arrow="→" active={lean >= 0.55} hint={wall.picks.length === 0 ? t('hate.wall.first') : t('hate.wall.stuck')} />
              <SideTag label={challenger.nameHe} arrow="←" active={lean <= -0.55} hint={t('hate.wall.next')} end />
            </div>

            <div className="relative">
              <EnemyPlate
                enemy={holder}
                state={stamped ? (stamped.won === holder.slug ? 'won' : 'out') : 'live'}
                holder={wall.picks.length > 0}
                onPick={(el) => pick('holder', el)}
                dense
              />
              <WallDamage level={damageOf(streak)} marks={streak} />
              {wall.picks.length > 0 && !stamped && (
                <span className="pointer-events-none absolute -top-2 end-2 z-20 bg-hate-red-deep px-2 py-0.5 font-body text-[10px] font-extrabold tracking-wide text-hate-ink">
                  {t('hate.wall.stuckFor', { n: String(streak) })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 py-0.5" aria-hidden="true">
              <span className="h-px flex-1 bg-hate-ink/30" />
              <span className="font-poster text-[20px] leading-none text-hate-red-light">×</span>
              <span className="h-px flex-1 bg-hate-ink/30" />
            </div>

            <EnemyPlate
              enemy={challenger}
              state={stamped ? (stamped.won === challenger.slug ? 'won' : 'out') : 'live'}
              onPick={(el) => pick('challenger', el)}
              dense
            />
          </div>
        </div>

        {stamped && (
          <button
            type="button"
            onClick={stamp.skip}
            className="mt-2 block min-h-tap w-full border-hair border-hate-ink/40 px-3 py-2 text-start"
          >
            <span className="block font-body text-[12px] font-extrabold text-hate-ink">
              {stamped.won === holder.slug ? t('hate.wall.stays') : t('hate.wall.replaced')}
            </span>
            <span className="mt-1 block">
              <RevealBar progress={stamp.progress} tone="sheet" />
            </span>
          </button>
        )}

        <div className="mt-1 flex items-center gap-2">
          <div className="min-w-0 flex-1 border-hair border-hate-ink/30 px-2.5 py-1.5">
            <p className="truncate font-body text-[11px] leading-snug text-hate-muted">
              {wall.revengeUsed
                ? t('hate.revenge.used', { name: bySlug.get(wall.revengePick ?? '')?.nameHe ?? '' })
                : t('hate.revenge.rule')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRevengeOpen(true)}
            disabled={choices.length === 0 || stamped !== null}
            className="min-h-tap shrink-0 border-rule border-hate-red-light px-3 font-body text-[12px] font-extrabold text-hate-ink disabled:opacity-35"
          >
            {t('hate.revenge.open')}
          </button>
          {wall.picks.length > 0 && (
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className="min-h-tap shrink-0 border-hair border-hate-ink/40 px-2.5 font-body text-[12px] font-extrabold text-hate-ink"
            >
              {t('stage.play.hateLog')}
            </button>
          )}
        </div>

        <p className="mt-1 flex flex-wrap items-center gap-x-2 font-body text-[10.5px] leading-snug text-hate-muted">
          <span>{t('hate.swipeHint')}</span>
          <span>·</span>
          <span>{t('hate.wall.rosterNote', { count: String(rosterSize) })}</span>
          <SourceNote newTab tone="dark" group="team" />
        </p>
      </div>

      {logOpen && (
        <LogSheet
          picks={wall.picks}
          bySlug={bySlug}
          onClose={() => setLogOpen(false)}
        />
      )}

      {revengeOpen && (
        <RevengeSheet
          choices={choices.map((slug) => bySlug.get(slug)).filter((enemy): enemy is Enemy => enemy !== undefined)}
          onPick={(slug) => {
            haptic('lock')
            setWall((current) => revenge(current, slug))
            setRevengeOpen(false)
          }}
          onClose={() => setRevengeOpen(false)}
        />
      )}
    </div>
  )
}

/** יומן הקרב — the round-by-round log, moved off the wall into a sheet (delta 87) */
function LogSheet({
  picks,
  bySlug,
  onClose,
}: {
  picks: Wall['picks']
  bySlug: Map<string, Enemy>
  onClose: () => void
}) {
  return (
    <SlideSheet open onClose={onClose} title={t('stage.play.hateLog')} tone="ink">
      <ol className="border-t-hair border-concrete/30">
        {[...picks].reverse().map((entry) => (
          <li key={entry.round} className="flex items-baseline gap-2 border-b-hair border-concrete/20 py-1.5">
            <span className="w-6 shrink-0 font-mono text-[11px] tabular-nums text-hate-red-light">{entry.round}</span>
            <span className="min-w-0 flex-1 font-body text-[12px] text-paper">
              {t('hate.wall.logLine', {
                stay: bySlug.get(entry.winner)?.nameHe ?? '',
                out: bySlug.get(entry.loser)?.nameHe ?? '',
              })}
            </span>
            {(entry.revenge || entry.noMercy) && (
              <span className="shrink-0 font-body text-[10px] font-extrabold text-hate-red-light">
                {entry.revenge ? t('hate.revenge.mark') : t('hate.wall.noMercyMark')}
              </span>
            )}
          </li>
        ))}
      </ol>
    </SlideSheet>
  )
}

function FriendBanner() {
  return (
    <p className="mb-2.5 border-rule border-hate-ink/50 bg-hate-card px-3 py-2 font-body text-[12px] leading-snug text-hate-ink">
      <span className="block font-latin text-[9px] font-bold tracking-[0.2em] text-hate-red-light" dir="ltr">
        SAME WALL
      </span>
      {t('hate.wall.friend')}
    </p>
  )
}

function SideTag({ label, arrow, active, hint, end = false }: { label: string; arrow: string; active: boolean; hint: string; end?: boolean }) {
  return (
    <span
      className={`flex min-w-0 flex-1 basis-0 items-baseline gap-1.5 border-hair px-2 py-1 ${end ? 'text-end' : 'text-start'} ${
        active ? 'border-hate-red-light bg-hate-red-light text-hate-field' : 'border-hate-ink/35 text-hate-muted'
      }`}
    >
      <span className="font-mono text-[11px] tabular-nums leading-none" aria-hidden="true">
        {arrow}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-body text-[11.5px] font-extrabold leading-tight">{label}</span>
        <span className="hidden font-body text-[10px] leading-tight opacity-80 min-[380px]:block">{hint}</span>
      </span>
    </span>
  )
}

/** חרטה — one of the last six back on the wall, once a run */
function RevengeSheet({ choices, onPick, onClose }: { choices: Enemy[]; onPick: (slug: string) => void; onClose: () => void }) {
  const ref = useDialog<HTMLDivElement>(onClose)
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-hate-field/80 px-gutter pb-[calc(env(safe-area-inset-bottom)+1rem)]" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="revenge-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="relative z-[60] w-full max-w-md border-rule border-hate-red-light bg-hate-card p-4"
      >
        <p className="font-latin text-[9px] font-bold tracking-[0.2em] text-hate-red-light" dir="ltr">
          ONE SHOT ONLY
        </p>
        <h2 id="revenge-title" className="mt-1 font-display text-step-2 leading-tight text-hate-ink">
          {t('hate.revenge.title')}
        </h2>
        <p className="mt-1 font-body text-[12px] leading-snug text-hate-muted">{t('hate.revenge.explain')}</p>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {choices.map((enemy) => (
            <li key={enemy.slug}>
              <button
                type="button"
                onClick={() => onPick(enemy.slug)}
                className="flex min-h-tap w-full flex-col items-start justify-center border-rule border-hate-ink/40 bg-hate-field px-2.5 py-2 text-start"
              >
                <span className="font-body text-[13px] font-extrabold text-hate-ink">{enemy.nameHe}</span>
                <span className="font-body text-[11px] text-hate-muted">{t(`hate.cat.${enemy.category}` as MessageKey)}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={onClose} className="mt-3 min-h-tap w-full border-hair border-hate-ink/40 font-body text-[13px] text-hate-ink">
          {t('hate.revenge.cancel')}
        </button>
      </div>
    </div>
  )
}

/** STILL HERE — the one you could not tear off, and the wall's DNA */
function StillHere({
  verdict,
  seed,
  cursor,
  pinned,
  rosterSize,
}: {
  verdict: WallVerdict
  seed: number
  cursor: number
  pinned: boolean
  rosterSize: number
}) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [bad, setBad] = useState(false)
  const { survivor } = verdict
  const knocked = verdict.out.slice(0, 4).map((enemy) => enemy.nameHe).join(', ')
  // §20: "זה מי שנשאר אצלך." — not "King"
  const spoken = voice({ gate: 11, moment: 'result', result: 'done', seed: `${seed}:${cursor}` })
  const [next, setNext] = useState<NextAction[]>([])
  useEffect(() => {
    track('run_complete', { detail: 'derby', value: verdict.streak })
    let live = true
    nextAfterWall(survivor.nameHe, `${seed}:${cursor}`)
      .then((answer) => {
        if (live) setNext(answer)
      })
      .catch(() => {})
    return () => {
      live = false
    }
    // one wall, one context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // הקיר שנשאר עומד נרשם בכרטיס הפועל (שער 10): זרע + מי ששרד. פעם אחת לכל הצגה של
  // הסיום — `derby.walls` הוא קבוצה, ולכן חזרה לאותו קיר לא מנפחת את הספירה.
  const filed = useRef(false)
  useEffect(() => {
    if (filed.current) return
    filed.current = true
    emit({ type: 'hate_wall_completed', seed, survivorId: `enemy:${survivor.slug}` })
  }, [seed, survivor.slug])

  function playCode(event: React.FormEvent) {
    event.preventDefault()
    const wall = readWallCode(code)
    if (!wall) {
      setBad(true)
      return
    }
    router.push(withRound('/derby', wall.seed, wall.cursor))
  }

  return (
    <div className="relative -mx-gutter mt-stack overflow-hidden bg-hate-field px-gutter pb-6 pt-3">
      <div aria-hidden="true" className="hate-dots pointer-events-none absolute inset-0" />
      <div className="relative">
        <Punch />
        <RecordRun gate="/derby" score={verdict.streak} />
        {pinned && <FriendBanner />}

        <div className="border-b-rule border-hate-red-light pb-2">
          <p className="font-latin text-[9px] font-bold tracking-[0.2em] text-hate-red-light" dir="ltr">
            STILL HERE · THE BLACK WALL
          </p>
          <h2 className="font-display text-step-2 leading-tight text-hate-ink" data-exit="emotion">{spoken.title}</h2>
          {spoken.body && <p className="mt-0.5 font-body text-[12px] leading-snug text-hate-muted">{spoken.body}</p>}
        </div>

        <div className="relative mt-3">
          <EnemyPlate enemy={survivor} state="won" />
          <WallDamage level={damageOf(verdict.streak)} marks={verdict.streak} />
        </div>
        <p className="mt-2 font-body text-step--1 font-bold text-hate-ink">
          {t('hate.still.held', { name: survivor.nameHe, n: String(verdict.streak) })}
        </p>

        <Record enemy={survivor} />

        {/* §20: opinion is labelled as the terrace's opinion — never as a fact about him */}
        <p className="mt-2.5 border-rule border-hate-ink/40 bg-hate-card px-3 py-2.5 font-body text-step--1 text-hate-ink" data-hate="opinion">
          <span className="me-1.5 inline-block border-hair border-hate-ink/50 px-1 py-px align-middle font-body text-[9.5px] font-extrabold tracking-wider text-hate-muted">
            {voiceAction(11, 'opinion')}
          </span>
          {t('hate.still.terrace', { name: verdict.terracePick.nameHe })}
        </p>

        {/* the Wall DNA */}
        <section className="mt-3 border-rule border-hate-red-light bg-hate-card p-3" aria-labelledby="dna-title">
          <div className="flex items-baseline justify-between gap-2">
            <h3 id="dna-title" className="font-display text-step-1 leading-none text-hate-ink">
              {t('hate.dna.title')}
            </h3>
            <span className="font-latin text-[9px] font-bold tracking-[0.2em] text-hate-red-light" dir="ltr">
              WALL DNA
            </span>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-1.5">
            <DnaCell k={t('hate.dna.still')} v={survivor.nameHe} />
            <DnaCell k={t('hate.dna.first')} v={verdict.firstOut?.nameHe ?? '—'} />
            <DnaCell k={t('hate.dna.revenge')} v={verdict.revengePick?.nameHe ?? t('hate.dna.none')} />
            <DnaCell
              k={t('hate.dna.noMercy')}
              v={verdict.noMercyPick ? t('hate.dna.over', { a: verdict.noMercyPick.winner.nameHe, b: verdict.noMercyPick.loser.nameHe }) : '—'}
            />
          </dl>
          <p className="mt-2 text-center font-mono text-[15px] font-bold tabular-nums tracking-[0.12em] text-hate-ink">
            <bdi dir="ltr">{verdict.code}</bdi>
          </p>
          <p className="mt-1 text-center font-body text-[11px] text-hate-muted">{t('hate.code.explain')}</p>
        </section>

        <ExitShare label={spoken.ctaShare} from="derby">
        <ShareRow
          kind="hate"
          params={{ s: String(seed), r: String(cursor), out: knocked || '—', n: String(verdict.streak), code: verdict.code }}
          headline={survivor.nameHe}
          // §28: the black poster — no vermilion (rule 9), the one left standing and every
          // name torn down, in order
          card={blackCard({ rows: [{ name: survivor.nameHe, out: false }, ...verdict.out.map((enemy) => ({ name: enemy.nameHe, out: true }))] })}
        />
        </ExitShare>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {/* the SAME wall — a plain link: PlayLink would move the deck on */}
          <a
            href={withRound('/derby', seed, cursor)}
            className="flex min-h-tap items-center justify-center border-rule border-hate-red-light px-4 font-body text-step-0 font-extrabold text-hate-ink"
          >
            {t('hate.wall.same')}
          </a>
          <PlayLink
            gate="/derby"
            className="flex min-h-tap items-center justify-center border-rule border-hate-ink/50 px-4 font-body text-step-0 font-extrabold text-hate-ink"
          >
            {t('hate.wall.new')}
          </PlayLink>
          <a
            href={`/derby/file?seed=${seed}${cursor > 0 ? `&r=${cursor}` : ''}`}
            className="flex min-h-tap items-center justify-center border-rule border-hate-red-light bg-hate-red-deep px-4 font-body text-step-0 font-extrabold text-hate-ink sm:col-span-2"
          >
            {t('hate.blackfile')}
          </a>
        </div>

        <div className="mt-3">
          <ExitNext next={next} from="derby" />
        </div>

        <form onSubmit={playCode} className="mt-3 flex gap-2">
          <label htmlFor="wall-code" className="sr-only">
            {t('hate.code.label')}
          </label>
          <input
            id="wall-code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value)
              setBad(false)
            }}
            placeholder="WALL-…"
            dir="ltr"
            autoCapitalize="characters"
            className="min-h-tap min-w-0 flex-1 border-rule border-hate-ink/40 bg-hate-card px-3 font-mono text-[14px] tabular-nums text-hate-ink placeholder:text-hate-muted"
          />
          <button type="submit" className="min-h-tap shrink-0 border-rule border-hate-ink/50 px-3 font-body text-[13px] font-extrabold text-hate-ink">
            {t('hate.code.go')}
          </button>
        </form>
        {bad && <p className="mt-1 font-body text-[12px] text-hate-red-light">{t('hate.code.bad')}</p>}

        <p className="mt-3 flex flex-wrap items-center gap-x-2 font-body text-[11px] text-hate-muted">
          <span>{t('hate.wall.rosterNote', { count: String(rosterSize) })}</span>
          <SourceNote newTab tone="dark" group="team" />
        </p>
        <AdSlot placement="result" />
      </div>
    </div>
  )
}

/**
 * the sourced record — or nothing. Which source, and the owner's knowledge under its neutral
 * label, is on /credits (rule 18 §3, spec §0.2–0.3); the plate says only that it has one.
 */
function Record({ enemy }: { enemy: Enemy }) {
  if (enemy.record === 'none') return null
  const line = enemy.detailHe !== '' ? enemy.detailHe : enemy.keyFactHe
  if (line === '') return null
  // §20 — מי · מה קרה · מתי · מקור · למה זה בתיק. `eraHe` is the row's own era, the charge
  // is the category the record files him under, never a sentence written about him here.
  return (
    <div className="mt-2 border-rule border-hate-ink/40 bg-hate-card p-3" data-blackfile="record">
      <p className="font-body text-[10px] tracking-widest text-hate-muted">{t('hate.record')}</p>
      <dl className="mt-1 grid gap-1">
        <RecordRow k={t('blackfile.who')} v={enemy.nameHe} />
        <RecordRow k={t('blackfile.what')} v={line} />
        {enemy.eraHe !== '' && <RecordRow k={t('blackfile.when')} v={enemy.eraHe} />}
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-2">
          <dt className="font-body text-[10px] font-extrabold text-hate-muted">{t('blackfile.source')}</dt>
          <dd className="min-w-0">
            <SourceNote newTab tone="dark" group={enemy.record === 'maor' ? 'team' : null} />
          </dd>
        </div>
        <RecordRow k={t('blackfile.why')} v={t(`hate.cat.${enemy.category}` as MessageKey)} />
      </dl>
    </div>
  )
}

function DnaCell({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-hair border-hate-ink/30 bg-hate-field px-2 py-1.5">
      <dt className="font-body text-[10px] text-hate-muted">{k}</dt>
      <dd className="mt-0.5 font-body text-[13px] font-extrabold leading-tight text-hate-ink">{v}</dd>
    </div>
  )
}

function RecordRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-2">
      <dt className="font-body text-[10px] font-extrabold text-hate-muted">{k}</dt>
      <dd className="min-w-0 font-body text-step--1 leading-relaxed text-hate-ink">{v}</dd>
    </div>
  )
}
