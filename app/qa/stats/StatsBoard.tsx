'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { firePickFxAt } from '@/components/stage/PickFx'
import { SlideSheet } from '@/components/stage/SlideSheet'
import type { BlindCowStats, FunnelRow } from '@/lib/analytics/stats'
import { t } from '@/lib/i18n'

/**
 * The stats page on the phone stage: a one-line HUD (the period), the field (one printed
 * row per gate — the funnel as three bars, the finish rate as the big figure, where the
 * rest leave), and a dock with the gate-10 numbers and "how this is measured" in sheets.
 */
export type StatsRowView = FunnelRow & { number: number | null; label: string }

const PERIODS = [1, 7, 30, 90] as const

export function StatsBoard({
  state,
  days,
  rows,
  blindCow,
  demo,
  query,
}: {
  state: 'ok' | 'unconfigured' | 'error'
  days: number
  rows: StatsRowView[]
  blindCow: BlindCowStats | null
  demo: boolean
  query: { key: string | null; demo: boolean }
}) {
  const router = useRouter()
  const [sheet, setSheet] = useState<null | 'cow' | 'how'>(null)
  const max = Math.max(1, ...rows.map((row) => row.visitors))
  const total = rows.reduce((sum, row) => sum + row.visitors, 0)
  const href = (d: number) => {
    const q = new URLSearchParams({ days: String(d) })
    if (query.key) q.set('key', query.key)
    if (query.demo) q.set('demo', '1')
    return `/qa/stats?${q.toString()}`
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:mx-auto md:block md:w-full md:max-w-[720px] md:flex-none" data-stats={state}>
      {/* HUD */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b-hair border-ink/30">
        <ul className="flex shrink-0 border-hair border-ink" aria-label={t('connect.stats.period')}>
          {PERIODS.map((d) => (
            <li key={d}>
              <Link
                href={href(d)}
                aria-current={d === days ? 'page' : undefined}
                className={`flex min-h-tap min-w-tap items-center justify-center px-2 font-body text-[12px] font-extrabold ${d === days ? 'bg-ink text-paper' : 'bg-paper text-ink'}`}
              >
                {d === 1 ? t('connect.stats.day') : t('connect.stats.days', { n: String(d) })}
              </Link>
            </li>
          ))}
        </ul>
        <p className="min-w-0 flex-1 truncate text-end font-mono text-[11px] tabular-nums text-muted">
          {state === 'ok' ? t('connect.stats.total', { n: String(total) }) : ''}
        </p>
        {demo && <span className="shrink-0 bg-sign px-1.5 py-0.5 font-body text-[10px] font-extrabold text-paper">{t('connect.stats.demo')}</span>}
      </div>

      {/* THE FIELD */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain md:max-h-[calc(100dvh-280px)]">
        {state !== 'ok' ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <p className="font-display text-[24px] leading-tight text-ink">{state === 'unconfigured' ? t('connect.stats.unconfigured') : t('connect.stats.error')}</p>
            <p className="max-w-[36ch] font-body text-[13px] leading-snug text-muted">{t('connect.stats.unconfiguredBody')}</p>
          </div>
        ) : (
          <ol className="divide-y divide-ink/15">
            {rows.map((row) => (
              <li key={row.gate} className="flex items-center gap-2.5 py-2">
                <span className="relative w-9 shrink-0 text-center font-poster text-[28px] leading-none">
                  <span className="plate-shift absolute inset-0 text-sign">{row.number ?? '·'}</span>
                  <span className="plate-top relative text-red">{row.number ?? '·'}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sign text-[14px] leading-tight text-ink">{row.label}</p>
                  <div className="mt-1 grid gap-[2px]" aria-hidden="true">
                    <span className="block h-[5px] bg-concrete" style={{ width: `${(100 * row.visitors) / max}%` }} />
                    <span className="block h-[5px] bg-sign" style={{ width: `${(100 * row.starters) / max}%` }} />
                    <span className="block h-[5px] bg-red" style={{ width: `${(100 * row.finishers) / max}%` }} />
                  </div>
                  <p className="mt-1 truncate font-mono text-[10.5px] tabular-nums text-muted">
                    {t('connect.stats.line', { in: String(row.visitors), start: String(row.starters), done: String(row.finishers) })}
                  </p>
                  {row.topLeaveStep !== null && (
                    <p className="truncate font-body text-[11px] font-extrabold leading-tight text-sign">
                      {t('connect.stats.leaveAt', { step: String(row.topLeaveStep), n: String(row.topLeaveCount ?? 0) })}
                    </p>
                  )}
                </div>
                <div className="w-[64px] shrink-0 border-rule border-ink bg-ink px-1 py-1 text-center">
                  <p className="font-poster text-[24px] leading-none text-red">{row.finishRate === null ? '—' : `${Math.round(row.finishRate)}%`}</p>
                  <p className="font-body text-[9px] font-extrabold tracking-wider text-concrete">{t('connect.stats.finishRate')}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* THE DOCK */}
      <div className="mt-1.5 grid shrink-0 grid-cols-[1fr_1fr_1.2fr] gap-1.5 md:mt-3">
        <button type="button" onClick={() => setSheet('cow')} disabled={!blindCow} className="flex min-h-tap items-center justify-center border-rule border-ink bg-paper px-2 font-body text-[12.5px] font-extrabold text-ink disabled:opacity-40">
          {t('connect.stats.cow')}
        </button>
        <button type="button" onClick={() => setSheet('how')} className="flex min-h-tap items-center justify-center border-rule border-ink bg-paper px-2 font-body text-[12.5px] font-extrabold text-ink">
          {t('connect.stats.how')}
        </button>
        <button
          type="button"
          onClick={(event) => {
            firePickFxAt(event.currentTarget, { tone: 'ink', haptic: 'tap' })
            router.refresh()
          }}
          className="flex min-h-tap items-center justify-center border-rule border-ink bg-red px-3 font-body text-step-0 font-extrabold text-paper active:scale-[.97]"
        >
          {t('connect.stats.refresh')}
        </button>
      </div>

      <SlideSheet open={sheet === 'cow'} onClose={() => setSheet(null)} title={t('connect.stats.cow')} latin="GATE 10 · BLIND COW" size="auto">
        {blindCow && (
          <dl className="grid grid-cols-2 gap-1.5 pb-2">
            <Fig k={t('connect.stats.cow.started')} v={String(blindCow.counts.blind_cow_started ?? 0)} />
            <Fig k={t('connect.stats.cow.solved')} v={String(blindCow.counts.blind_cow_solved ?? 0)} />
            <Fig k={t('connect.stats.cow.gaveUp')} v={String(blindCow.counts.blind_cow_gave_up ?? 0)} />
            <Fig k={t('connect.stats.cow.hints')} v={blindCow.avgHintsToSolve === null ? '—' : String(blindCow.avgHintsToSolve)} />
            <Fig k={t('connect.stats.cow.median')} v={blindCow.medianSolveMs === null ? '—' : `${(blindCow.medianSolveMs / 1000).toFixed(1)}″`} />
            <Fig k={t('connect.stats.cow.shared')} v={String(blindCow.counts.blind_cow_result_shared ?? 0)} />
            <Fig k={t('connect.stats.cow.duels')} v={String(blindCow.counts.blind_cow_duel_created ?? 0)} />
            <Fig k={t('connect.stats.cow.join')} v={blindCow.duelJoinRate === null ? '—' : `${blindCow.duelJoinRate}%`} />
            <Fig k={t('connect.stats.cow.complete')} v={blindCow.duelCompleteRate === null ? '—' : `${blindCow.duelCompleteRate}%`} />
            <Fig k={t('connect.stats.cow.live')} v={String(blindCow.counts.blind_cow_live_started ?? 0)} />
          </dl>
        )}
      </SlideSheet>

      <SlideSheet open={sheet === 'how'} onClose={() => setSheet(null)} title={t('connect.stats.how')} latin="HOW IT IS MEASURED" size="auto">
        <div className="space-y-2 pb-2 font-body text-[13px] leading-relaxed text-ink">
          <p>{t('connect.stats.how.1')}</p>
          <p>{t('connect.stats.how.2')}</p>
          <p>{t('connect.stats.how.3')}</p>
          <p className="text-muted">{t('connect.stats.how.4')}</p>
        </div>
      </SlideSheet>
    </div>
  )
}

function Fig({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-rule border-ink bg-paper px-2 py-1.5">
      <dt className="font-body text-[10px] font-extrabold tracking-widest text-sign">{k}</dt>
      <dd className="font-poster text-[26px] leading-none text-ink">{v}</dd>
    </div>
  )
}
