'use client'

import { useEffect, useRef, useState } from 'react'

import { SheetHead } from '@/components/life/Plate'
import { useDialog } from '@/components/ui/useDialog'
import { t } from '@/lib/i18n'
import { allGauges, changeTone, GATE_HE, hapoelLove, LACES_HE, SINAI_HE, type GaugeChange, type GaugeGroup } from '@/lib/life/gauges'
import { artUrl, EMBLEM_OF_GAUGE_GROUP } from '@/lib/life/runtime/art'
import type { LifeState } from '@/lib/life/types'

/**
 * המדדים החיים — three surfaces over one model (`lib/life/gauges.ts`).
 *
 *  · `HeartBadge`  — the love meter, always on the glass. A red heart, a number in the
 *                    poster face, and a bump when it moves. Tapping it opens the sheet.
 *  · `GaugePops`   — the beat. When a dispatch moves a number, a plate slides in under
 *                    the HUD: the name, a bar that draws from where it was to where it
 *                    is, an arrow, the points, the percentage. Three at most, two seconds
 *                    each, and the love meter always goes first.
 *  · `GaugesSheet` — everything, with percentages, grouped the way a person would ask:
 *                    the Red Heart, who you are, how you are, the people, the decade.
 *
 * The rule from brief §15 — you read a father off a father — still holds for the WORLD:
 * nothing here changes what anybody says. These are the scoreboard a game is allowed to
 * have, drawn in the same print language as everything else: ink, sheet, red, a rule.
 */

// ---------------------------------------------------------------------------------

function useCountUp(target: number, ms = 600): number {
  const [shown, setShown] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const start = performance.now()
    const begin = from.current
    if (begin === target) return
    let raf = 0
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - k, 3)
      setShown(Math.round(begin + (target - begin) * eased))
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return shown
}

function Heart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 21.3 3.6 13a5.2 5.2 0 0 1 7.4-7.3l1 1 1-1a5.2 5.2 0 0 1 7.4 7.3L12 21.3z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------------

export function HeartBadge({ value, bump, onOpen }: { value: number; bump: number; onOpen: () => void }) {
  const shown = useCountUp(value)
  const [pulse, setPulse] = useState(0)
  useEffect(() => {
    if (bump > 0) setPulse((n) => n + 1)
  }, [bump])
  return (
    <button
      type="button"
      onClick={onOpen}
      data-life="love-open"
      aria-label={`${t('life.gauge.heart')} ${shown}%`}
      className="group pointer-events-auto flex min-h-tap items-start"
    >
      <span
        key={pulse}
        className={`relative mt-2 block border-rule border-ink bg-sheet transition-colors duration-press group-active:bg-red motion-reduce:transition-none ${
          pulse > 0 ? 'motion-safe:animate-plate-bump' : ''
        }`}
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-[2px] border-hair border-ink/40 group-active:border-sheet/40" />
        <span className="relative flex items-center gap-1.5 px-2 py-1">
          <Heart className="h-[15px] w-[15px] text-red group-active:text-sheet" />
          <span className="font-poster text-[20px] leading-none text-ink group-active:text-sheet" dir="ltr">
            {shown}%
          </span>
        </span>
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------------

type Pop = { key: number; change: GaugeChange }

export function GaugePops({ changes, top }: { changes: GaugeChange[] | null; top: string }) {
  const [pops, setPops] = useState<Pop[]>([])
  const counter = useRef(0)
  const lastBatch = useRef<GaugeChange[] | null>(null)

  useEffect(() => {
    if (!changes || changes === lastBatch.current) return
    lastBatch.current = changes
    // three at most per beat; the model already put the love meter first and the rest by size
    const next = changes.slice(0, 3).map((change) => ({ key: ++counter.current, change }))
    setPops((current) => [...current, ...next].slice(-3))
    const timers = next.map((pop, i) =>
      window.setTimeout(() => setPops((current) => current.filter((p) => p.key !== pop.key)), 2300 + i * 250),
    )
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [changes])

  if (pops.length === 0) return null
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-30 flex flex-col items-center gap-1.5 px-3"
      style={{ top }}
      data-life="gauge-pops"
      aria-live="polite"
    >
      {pops.map(({ key, change }) => (
        <PopPlate key={key} change={change} />
      ))}
    </div>
  )
}

function PopPlate({ change }: { change: GaugeChange }) {
  const tone = changeTone(change)
  const up = change.delta > 0
  const [width, setWidth] = useState(change.from)
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(change.to))
    return () => cancelAnimationFrame(id)
  }, [change.to])
  const colour = tone === 'good' ? 'text-red' : tone === 'bad' ? 'text-concrete' : 'text-ink'
  return (
    <div
      className="w-full max-w-[300px] animate-ticket-in border-rule border-ink bg-sheet px-2.5 py-1.5"
      data-life="gauge-pop"
      data-gauge={change.id}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-[12px] leading-none text-ink">
          <bdi>{change.labelHe}</bdi>
        </span>
        <span className={`flex items-center gap-1 font-poster text-[16px] leading-none ${colour}`} dir="ltr">
          <span aria-hidden="true">{up ? '▲' : '▼'}</span>
          <span>{up ? '+' : ''}{Math.round(change.delta)}</span>
          <span className="font-mono text-[10px] text-muted">{Math.round(change.to)}%</span>
        </span>
      </div>
      <div className="mt-1.5 h-[5px] w-full bg-ink/10" aria-hidden="true">
        <div
          className={`h-full ${tone === 'bad' ? 'bg-concrete' : 'bg-red'} transition-[width] duration-700 ease-out motion-reduce:transition-none`}
          style={{ width: `${Math.max(0, Math.min(100, width))}%` }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------

const GROUP_HE: Record<GaugeGroup, string> = {
  heart: 'life.gauge.redheart',
  person: 'life.gauge.person',
  wellbeing: 'life.gauge.wellbeing',
  people: 'life.gauge.people',
  decade: 'life.gauge.decade',
}

function Bar({ value, good, delay }: { value: number; good: 'up' | 'down' | 'none'; delay: number }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const id = window.setTimeout(() => setWidth(value), 40 + delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  const fill = good === 'down' ? 'bg-concrete' : 'bg-red'
  return (
    <div className="h-[6px] w-full bg-ink/10" aria-hidden="true">
      <div
        className={`h-full ${fill} transition-[width] duration-700 ease-out motion-reduce:transition-none`}
        style={{ width: `${Math.max(0, Math.min(100, width))}%` }}
      />
    </div>
  )
}

function Stamp({ labelHe, valueHe }: { labelHe: string; valueHe: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="font-body text-[13px] text-ink">
        <bdi>{labelHe}</bdi>
      </span>
      <span className="border-rule border-red px-2 py-0.5 font-display text-[12px] leading-none text-red">
        <bdi>{valueHe}</bdi>
      </span>
    </div>
  )
}

/**
 * הסמל של הקבוצה — שלוש מתוך חמש, ובכוונה.
 *
 * `heart` מקבל את המגן עם הצעיף, `wellbeing` את הלב עם הצלב, `people` את לחיצת היד.
 * ל-`person` ול-`decade` **אין סמל**, ולא מפני שלא הגיע אחד: מסכה על "מי אתה נהיה"
 * הייתה קוראת כ"משחק תפקיד" בזמן שהמסכה היא **יצירתיות**, ודיסקית גנרית על מדדי עשור
 * אומרת פחות מהכותרת. `EMBLEM_OF_GAUGE_GROUP` חלקית, והכותרת לבדה היא תשובה שלמה.
 */
function GroupMark({ group }: { group: GaugeGroup }) {
  const key = EMBLEM_OF_GAUGE_GROUP[group]
  if (!key) return null
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={artUrl(key)} alt="" aria-hidden="true" className="h-[16px] w-[16px] shrink-0 object-contain" />
}

export function GaugesSheet({ state, onClose }: { state: LifeState; onClose: () => void }) {
  const gauges = allGauges(state)
  const groups: GaugeGroup[] = ['heart', 'person', 'wellbeing', 'people']
  // the decade's numbers are noise before there is a decade
  if (state.year >= 1993) groups.push('decade')
  const love = hapoelLove(state)
  let delay = 0
  const dialogRef = useDialog<HTMLDivElement>(onClose)
  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center bg-ink/70 p-2.5 pb-[max(10px,env(safe-area-inset-bottom))] sm:items-center"
      data-life="gauges"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-[60] flex max-h-full w-full max-w-[420px] animate-sheet-in flex-col border-rule border-ink bg-sheet outline-none"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={t('life.gauge.title')}
      >
        <SheetHead title={t('life.gauge.title')} onClose={onClose} closeLabel={t('life.gauge.close')} />

        {/* the meter, big, first */}
        <div className="flex items-center gap-3 border-b-rule border-ink px-3 py-3" data-life="gauges-love">
          <Heart className="h-9 w-9 shrink-0 text-red" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[13px] leading-none text-ink">{t('life.gauge.heart')}</p>
            <div className="mt-2">
              <Bar value={love} good="up" delay={0} />
            </div>
          </div>
          <span className="font-poster text-[34px] leading-none text-red" dir="ltr">
            {love}%
          </span>
        </div>

        <div className="overflow-y-auto px-3 pb-3">
          {groups.map((group) => {
            const rows = gauges.filter((g) => g.group === group && g.id !== 'love')
            if (rows.length === 0) return null
            return (
              <section key={group} className="pt-3" data-life={`gauges-${group}`}>
                <p className="flex items-center gap-1.5 border-b-hair border-ink pb-1 font-display text-[11px] uppercase tracking-[0.18em] text-red">
                  <GroupMark group={group} />
                  {t(GROUP_HE[group] as Parameters<typeof t>[0])}
                </p>
                {group === 'decade' && (
                  <>
                    <Stamp labelHe={t('life.gauge.where')} valueHe={GATE_HE[state.gate.identity]} />
                    <Stamp labelHe={t('life.gauge.sinai')} valueHe={SINAI_HE[state.institution.sinai]} />
                    {state.laces && <Stamp labelHe={t('life.gauge.laces')} valueHe={LACES_HE[state.laces]} />}
                  </>
                )}
                {rows.map((gauge) => {
                  const value = Math.round(gauge.read(state))
                  delay += 28
                  return (
                    <div key={gauge.id} className="flex items-center gap-3 py-1.5" data-life="gauge-row" data-gauge={gauge.id}>
                      <span className="w-[42%] shrink-0 truncate font-body text-[13px] text-ink">
                        <bdi>{gauge.labelHe}</bdi>
                      </span>
                      <div className="min-w-0 flex-1">
                        <Bar value={value} good={gauge.good} delay={delay} />
                      </div>
                      <span className="w-10 shrink-0 text-end font-mono text-[12px] tabular-nums text-ink" dir="ltr">
                        {value}%
                      </span>
                    </div>
                  )
                })}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
