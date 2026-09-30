'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'

import { ReportLink } from '@/components/ui/ReportLink'
import { firePickFxAt } from '@/components/stage/PickFx'
import { SlideSheet } from '@/components/stage/SlideSheet'
import { Num } from '@/components/ui/Num'
import { haptic } from '@/lib/play/haptics'
import { pendingRevenge, readMarks, seen as seenIds } from '@/lib/profile/marks'
import { advanceRotation, rotationFor } from '@/lib/profile/store'
import { syncMarks } from '@/lib/portal/marks-sync'
import { mintSeed, withRound } from '@/lib/rotation/deck'
import { revengeSplit } from '@/lib/game/trivia-report'
import { Q_TOPICS, TOPIC_SPECS, type QTopic, type Topic } from '@/lib/game/topics'
import { t, type MessageKey } from '@/lib/i18n'
import { planPersonal } from './actions'

/**
 * Quick Pick — the lobby of gate 2 (prototype v5).
 *
 * The default path is one tap: הכול מהכול is already selected and יאללה is under the
 * thumb. Everything else is optional and one tap each — a topic, an era, Hard, Practice,
 * תפתיע אותי, Revenge — and the ticket at the bottom says, in words, exactly what the
 * next twelve will be.
 *
 * What changed from the prototype, and why:
 *  · **Era chips come from the data**, with their counts, and a chip that cannot fill a
 *    run is shown disabled rather than dealt short.
 *  · **Revenge is honest.** When fewer than twelve questions are waiting, the ticket says
 *    "5 נקמות + 7 קשות" — the prototype topped up in silence (brief §13).
 *  · **A seeded run is a link.** הכול מהכול, a topic, an era and Hard are dealt on the
 *    server from the device's deck (`lib/rotation`), so the URL is the round. Revenge and
 *    Surprise are built from THIS device's ledger, so they become a `?q=` link of twelve
 *    ids — just as shareable, and the ledger itself never leaves the device except as ids.
 */

type Mode = 'mix' | 'surprise' | 'revenge'

export type EraChip = { decade: number; count: number }

const NEED = 12

export function QuickPick({
  counts,
  eras,
  initial,
}: {
  counts: Record<Topic, number>
  eras: Record<Topic, EraChip[]>
  /** a suggestion carried from the Match Report (`?pick=`) */
  initial?: { mode?: Mode; hard?: boolean }
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(initial?.mode ?? 'mix')
  const [topic, setTopic] = useState<QTopic | null>(null)
  const [decade, setDecade] = useState<number | null>(null)
  const [hard, setHard] = useState(initial?.hard ?? false)
  const [practice, setPractice] = useState(false)
  const [pending, setPending] = useState(0)
  const [busy, startBusy] = useTransition()
  const [failed, setFailed] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    setPending(pendingRevenge(readMarks()).length)
    // the account's ledger, when there is one — silent when there is not
    void syncMarks().then((state) => {
      if (state === 'synced') setPending(pendingRevenge(readMarks()).length)
    })
  }, [])

  const topicSlug: Topic = topic ?? 'general'
  const chips = eras[topicSlug] ?? []
  const depth = counts[topicSlug] ?? 0
  const split = revengeSplit(pending, NEED)
  const canStart = mode === 'revenge' ? pending > 0 : mode === 'surprise' ? true : depth >= NEED

  const ticket = useMemo(() => {
    const bits: string[] = [t('trivia.lobby.ticket.base')]
    if (decade !== null) bits.unshift(t('trivia.lobby.era', { decade: eraLabel(decade) }))
    if (hard && mode === 'mix') bits.push(t('trivia.mode.hard'))
    if (practice) bits.push(t('trivia.mode.practice'))
    return bits.join(' · ')
  }, [decade, hard, practice, mode])

  const title =
    mode === 'revenge'
      ? split.filler > 0
        ? t('trivia.lobby.revengeSplit', { n: String(split.revenge), m: String(split.filler) })
        : t('trivia.mode.revenge')
      : mode === 'surprise'
        ? t('trivia.mode.surprise')
        : topic
          ? t(`trivia.lobby.topic.${topic}` as MessageKey)
          : t('trivia.lobby.all')

  function choose(next: Mode) {
    haptic('tap')
    setMode(next)
    setFailed(false)
    if (next !== 'mix') {
      setTopic(null)
      setDecade(null)
    }
  }

  function pickTopic(next: QTopic) {
    haptic('tap')
    setMode('mix')
    setTopic(topic === next ? null : next)
    setDecade(null)
  }

  function start() {
    if (!canStart || busy) return
    haptic('lock')
    const extras = (href: string) => {
      const params = new URLSearchParams()
      if (practice) params.set('practice', '1')
      const query = params.toString()
      return query ? `${href}${href.includes('?') ? '&' : '?'}${query}` : href
    }
    if (mode === 'mix') {
      const gate = `/trivia/${topicSlug}`
      const rotation = rotationFor(gate, mintSeed)
      advanceRotation(gate, mintSeed)
      const params = new URLSearchParams()
      if (decade !== null) params.set('era', String(decade))
      if (hard) params.set('hard', '1')
      const base = params.toString() ? `${gate}?${params.toString()}` : gate
      router.push(extras(withRound(base, rotation.seed, rotation.cursor)))
      return
    }
    startBusy(async () => {
      const marks = readMarks()
      const seed = mintSeed()
      try {
        const plan = await planPersonal(mode, { wrong: pendingRevenge(marks), seen: seenIds(marks) }, seed)
        if (plan.ids.length < NEED) {
          setFailed(true)
          return
        }
        const params = new URLSearchParams({ q: plan.ids.join('.'), mode, seed: String(seed) })
        if (mode === 'revenge') params.set('rv', String(plan.revenge ?? 0))
        router.push(extras(`/trivia/general?${params.toString()}`))
      } catch {
        setFailed(true)
      }
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col border-rule border-ink bg-sheet md:block md:flex-none">
      <div className="hidden shrink-0 border-b-rule border-ink bg-ink px-4 py-4 text-paper md:block">
        <p className="font-latin text-[10px] font-bold tracking-[0.28em] text-red" dir="ltr">
          GATE 02 · QUICK PICK
        </p>
        <h2 className="mt-1 font-display text-step-3 leading-tight">{t('trivia.lobby.title')}</h2>
        <p className="mt-1 font-body text-step--1 leading-relaxed text-concrete">{t('trivia.lobby.lede')}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 md:flex-none md:overflow-visible sm:px-4">
        <div className="grid grid-cols-2 gap-2">
          <BigChoice
            active={mode === 'mix' && topic === null}
            mark="∞"
            title={t('trivia.lobby.all')}
            sub={t('trivia.lobby.all.sub')}
            onClick={(el) => {
              choose('mix')
              setTopic(null)
              firePickFxAt(el, { haptic: false })
            }}
          />
          <BigChoice
            active={mode === 'surprise'}
            mark="?"
            title={t('trivia.mode.surprise')}
            sub={t('trivia.lobby.surprise.sub')}
            onClick={(el) => {
              choose('surprise')
              firePickFxAt(el, { haptic: false })
            }}
          />
        </div>

        <section aria-labelledby="qp-topics" className="mt-3">
          <p id="qp-topics" className="mb-1.5 font-body text-[12px] font-bold text-muted">
            {t('trivia.lobby.pickTopic')}
          </p>
          <ul className="grid grid-cols-4 gap-1.5 min-[480px]:grid-cols-7">
            {Q_TOPICS.map((slug) => {
              const count = counts[slug] ?? 0
              const thin = count < NEED
              const active = mode === 'mix' && topic === slug
              return (
                <li key={slug}>
                  <button
                    type="button"
                    onClick={(event) => {
                      pickTopic(slug)
                      firePickFxAt(event.currentTarget, { haptic: false })
                    }}
                    disabled={thin}
                    aria-pressed={active}
                    className={`flex min-h-[58px] w-full flex-col items-center justify-center gap-0.5 border-rule px-1 py-1 transition-transform duration-press active:scale-[.96] disabled:opacity-40 motion-reduce:transition-none ${
                      active ? 'border-red bg-red text-sheet' : 'border-ink bg-paper text-ink'
                    }`}
                  >
                    <span aria-hidden="true" className="font-poster text-[16px] leading-none">
                      {TOPIC_SPECS[slug].mark}
                    </span>
                    <span className="font-body text-[11px] font-bold leading-tight">
                      {t(`trivia.lobby.topic.${slug}` as MessageKey)}
                    </span>
                    <span className={`font-mono text-[10px] tabular-nums ${active ? 'text-sheet' : 'text-muted'}`}>
                      <Num>{count}</Num>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section aria-labelledby="qp-eras" className="mt-3">
          <p id="qp-eras" className="mb-1.5 font-body text-[12px] font-bold text-muted">
            {t('trivia.lobby.pickEra')}
          </p>
          <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-1">
            <Chip active={decade === null} onClick={() => setDecade(null)} disabled={mode !== 'mix'}>
              {t('trivia.lobby.allEras')}
            </Chip>
            {chips.map((chip) => (
              <Chip
                key={chip.decade}
                active={decade === chip.decade}
                disabled={mode !== 'mix' || chip.count < NEED}
                onClick={() => {
                  haptic('tap')
                  setMode('mix')
                  setDecade(decade === chip.decade ? null : chip.decade)
                }}
                label={t('trivia.lobby.eraChip', { decade: eraLabel(chip.decade), n: String(chip.count) })}
              >
                <bdi dir="ltr">{chip.decade}s</bdi>
                <span className="ms-1 font-mono text-[10px] tabular-nums opacity-70">
                  <Num>{chip.count}</Num>
                </span>
              </Chip>
            ))}
          </div>
        </section>

        {pending > 0 && (
          <button
            type="button"
            onClick={(event) => {
              choose('revenge')
              firePickFxAt(event.currentTarget, { haptic: false })
            }}
            aria-pressed={mode === 'revenge'}
            className={`mt-3 flex min-h-tap w-full items-center justify-between gap-2 border-rule px-3 font-body text-step--1 font-bold transition-transform duration-press active:scale-[.98] motion-reduce:transition-none ${
              mode === 'revenge' ? 'border-red bg-red text-sheet' : 'border-ink bg-paper text-ink'
            }`}
          >
            <span>{t('trivia.lobby.revengeWaiting', { n: String(pending) })}</span>
            <span className="font-extrabold">{t('trivia.lobby.revengeGo')}</span>
          </button>
        )}
      </div>

      {/* the dock — the more chip + the ticket + go, one line at the foot of the stage */}
      <div className="flex shrink-0 items-center gap-2 border-t-rule border-ink bg-ink px-3 py-2.5 text-paper sm:px-4">
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`min-h-tap shrink-0 border-rule px-2.5 font-body text-[12px] font-extrabold transition-transform duration-press active:scale-[.96] motion-reduce:transition-none ${
            practice || (hard && mode === 'mix') ? 'border-red bg-red text-sheet' : 'border-concrete/50 text-concrete'
          }`}
        >
          {t('stage.play.options')}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-step-0 leading-tight">{title}</p>
          <p className="truncate font-body text-[11px] text-concrete">{ticket}</p>
          {failed && <p className="font-body text-[11px] text-red">{t('trivia.lobby.failed')}</p>}
        </div>
        <button
          type="button"
          onClick={(event) => {
            firePickFxAt(event.currentTarget, { label: '→', haptic: false })
            start()
          }}
          disabled={!canStart || busy}
          className="min-h-tap shrink-0 bg-red px-5 font-display text-step-1 text-sheet transition-transform duration-press ease-stamp active:scale-[.95] disabled:opacity-50 motion-reduce:transition-none"
        >
          {busy ? t('trivia.lobby.building') : t('trivia.lobby.go')}
        </button>
      </div>

      <SlideSheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t('stage.play.options')} latin="MORE">
        <div className="grid gap-3 pb-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <Toggle
              on={practice}
              onClick={() => {
                haptic('tap')
                setPractice(!practice)
              }}
            >
              {t('trivia.lobby.practice')}
            </Toggle>
            <Toggle
              on={hard && mode === 'mix'}
              disabled={mode !== 'mix'}
              onClick={() => {
                haptic('tap')
                setHard(!hard)
              }}
            >
              {t('trivia.lobby.hard')}
            </Toggle>
          </div>
          <p className="font-body text-[12px] leading-relaxed text-muted">{t('trivia.lobby.lede')}</p>
          <ReportLink />
        </div>
      </SlideSheet>
    </div>
  )
}

export function eraLabel(decade: number): string {
  return decade >= 2000 ? `${decade}` : `${String(decade).slice(2)}'`
}

function BigChoice({
  active,
  mark,
  title,
  sub,
  onClick,
}: {
  active: boolean
  mark: string
  title: string
  sub: string
  onClick: (el: HTMLElement) => void
}) {
  return (
    <button
      type="button"
      onClick={(event) => onClick(event.currentTarget)}
      aria-pressed={active}
      className={`flex min-h-[80px] flex-col items-start justify-between gap-1 border-rule px-3 py-2 text-start transition-transform duration-press active:scale-[.97] motion-reduce:transition-none ${
        active ? 'border-red bg-red text-sheet' : 'border-ink bg-paper text-ink'
      }`}
    >
      <span aria-hidden="true" className="font-poster text-[26px] leading-none">
        {mark}
      </span>
      <span className="font-display text-step-0 leading-none">{title}</span>
      <span className={`font-body text-[11px] leading-snug ${active ? 'text-sheet' : 'text-muted'}`}>{sub}</span>
    </button>
  )
}

function Chip({
  active,
  disabled = false,
  onClick,
  label,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  label?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      className={`min-h-[40px] border-rule px-2.5 font-body text-[13px] font-bold transition-transform duration-press active:scale-[.96] disabled:opacity-35 motion-reduce:transition-none ${
        active ? 'border-red bg-red text-sheet' : 'border-ink bg-sheet text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function Toggle({
  on,
  disabled = false,
  onClick,
  children,
}: {
  on: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={`flex min-h-tap items-center justify-center gap-2 border-rule px-3 font-body text-step--1 font-extrabold transition-transform duration-press active:scale-[.97] disabled:opacity-40 motion-reduce:transition-none ${
        on ? 'border-ink bg-ink text-paper' : 'border-ink bg-sheet text-ink'
      }`}
    >
      <span aria-hidden="true" className="font-sign">
        {on ? '✓' : '○'}
      </span>
      {children}
    </button>
  )
}
