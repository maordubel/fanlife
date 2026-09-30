'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { track } from '@/lib/analytics/meter'
import { KIND_KEY, SLOT_KEY, agoKey, recapKey } from '@/lib/daily/copy'
import { DAILY_METER_GATE, readDay, rulesOf, settleDay, updateDay } from '@/lib/daily/progress'
import { DAILY_SLOTS, type Daily, type DailyItem, type DailySlot } from '@/lib/daily/types'
import { t } from '@/lib/i18n'
import { emit } from '@/lib/profile/events'
import { SongLine } from '@/components/voice/SongLine'

/**
 * היום בהפועל — the card (ONE RED WORLD §7, §55). Three things, none of them required.
 *
 * The three items were resolved on the server for one Israel date and arrive complete;
 * what this component adds is only what the DEVICE knows — which of them are done, and
 * whether the souvenir was kept or the card closed for the day. That read happens after
 * mount (`useEffect`), so the server's HTML and the first client render are the same
 * markup with nothing ticked, and a device that cannot read storage simply sees an
 * untouched day.
 *
 * Two layouts, not one that scales: on a phone the three are ROWS — the slot a narrow
 * band at the start, the thing itself beside it; from `md` they are three TILES side by
 * side, slot on top, the line under it, the door at the foot.
 */
export function DailyCard({ daily, variant = 'full' }: { daily: Daily; variant?: 'compact' | 'full' }) {
  // compact = the home page's card (owner fix pass, 29.9.2026): today's name, ONE thing to do
  // now, how far the day got, and a disclosure for the other two. Full = every row at once.
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState<Set<DailySlot>>(() => new Set())
  const [souvenir, setSouvenir] = useState(false)
  const [closed, setClosed] = useState(false)

  const settle = useCallback(() => {
    try {
      const { day, done: now } = settleDay(daily.date, rulesOf(daily.items))
      setDone(now)
      setSouvenir(day.souvenir === true)
      setClosed(day.closed === true)
    } catch {
      // an unreadable device is an untouched day
    }
  }, [daily])

  useEffect(() => {
    settle()
    // once a session per day: `daily_open` counts people who SAW today's three, not renders
    try {
      const key = `worker.daily.open.${daily.date}`
      if (window.sessionStorage.getItem(key) !== '1') {
        window.sessionStorage.setItem(key, '1')
        track('daily_open', { gate: DAILY_METER_GATE, detail: daily.theme ? 'theme' : 'rotation' })
      }
    } catch {
      // no session storage: the open is simply not counted
    }
    // back from a gate in another tab, or from the bfcache: read the ledger again
    const again = () => {
      if (document.visibilityState !== 'hidden') settle()
    }
    window.addEventListener('focus', again)
    window.addEventListener('pageshow', again)
    document.addEventListener('visibilitychange', again)
    window.addEventListener('storage', again)
    return () => {
      window.removeEventListener('focus', again)
      window.removeEventListener('pageshow', again)
      document.removeEventListener('visibilitychange', again)
      window.removeEventListener('storage', again)
    }
  }, [daily, settle])

  const count = done.size
  const recap = recapKey(count)
  const discover = daily.items[2]

  const recapBlock = recap ? (
        <div className="border-t-hair border-ink/40 px-3 py-2" data-daily="recap">
          <p className="font-display text-[16px] leading-tight text-ink md:text-[18px]">{t(recap)}</p>
          {/* §3 — one line from the terrace on the recap, the same song all day */}
          <SongLine surface="daily" seed={daily.date} className="mt-0.5" />
          {count === DAILY_SLOTS.length ? (
            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              <button
                type="button"
                disabled={souvenir}
                onClick={() => {
                  emit({ type: 'collected', set: 'daily.days', ids: [daily.date] })
                  updateDay(daily.date, (day) => ({ ...day, souvenir: true }))
                  setSouvenir(true)
                }}
                className="flex min-h-tap items-center justify-center border-rule border-ink bg-red px-3 font-body text-[14px] font-extrabold text-paper disabled:bg-sheet disabled:text-ink"
              >
                {souvenir ? t('daily.recap.saved') : t('daily.recap.souvenir')}
              </button>
              <Link
                href={discover.href}
                className="flex min-h-tap items-center justify-center border-rule border-ink bg-paper px-3 font-body text-[14px] font-extrabold text-ink"
              >
                {t('daily.recap.archive')}
              </Link>
              <button
                type="button"
                onClick={() => {
                  updateDay(daily.date, (day) => ({ ...day, closed: true }))
                  setClosed(true)
                }}
                className="flex min-h-tap items-center justify-center border-rule border-ink/40 bg-sheet px-3 font-body text-[14px] font-extrabold text-ink"
              >
                {t('daily.recap.close')}
              </button>
            </div>
          ) : (
            <p className="mt-0.5 font-body text-[12px] text-muted">{t('daily.optional')}</p>
          )}
        </div>
      ) : null

  if (closed) {
    return (
      <section aria-label={t('daily.title')} data-daily="closed" className="flex items-center justify-between gap-3 border-hair border-ink/40 bg-sheet px-3 py-1.5">
        <p className="font-body text-[13px] font-bold text-ink">{t('daily.closed')}</p>
        <button
          type="button"
          onClick={() => {
            updateDay(daily.date, (day) => ({ ...day, closed: undefined }))
            setClosed(false)
          }}
          className="min-h-tap shrink-0 px-2 font-body text-[13px] font-extrabold text-red underline underline-offset-4"
        >
          {t('daily.reopen')}
        </button>
      </section>
    )
  }

  const compact = variant === 'compact' && !open
  const current = daily.items.find((item) => !done.has(item.slot)) ?? daily.items[0]

  if (compact) {
    return (
      <section aria-labelledby="daily-title" data-daily={daily.theme ? 'theme' : 'rotation'} data-daily-variant="compact" className="border-rule border-ink bg-paper">
        <header className="flex items-baseline justify-between gap-3 border-b-hair border-ink/40 bg-ink px-3 py-1.5">
          <h2 id="daily-title" className="font-display text-[17px] leading-tight text-paper">
            {t('daily.title')}
          </h2>
          <p className="shrink-0 font-body text-[12px] font-extrabold text-paper" aria-live="polite">
            {t('daily.progress', { n: String(count) })}
          </p>
        </header>
        {daily.theme && (
          <p className="border-b-hair border-ink/40 bg-sheet px-3 py-1 font-body text-[11.5px] font-extrabold text-red">
            {t('daily.theme.kicker')} · <bdi>{daily.theme.subjectHe}</bdi>
          </p>
        )}
        <DailyRow item={current} done={done.has(current.slot)} showAgo={!daily.theme} compact />
        <button
          type="button"
          aria-expanded={false}
          onClick={() => setOpen(true)}
          className="flex min-h-tap w-full items-center justify-between gap-2 border-t-hair border-ink/40 bg-sheet px-3 font-body text-[13px] font-extrabold text-ink"
        >
          <span>{t('daily.more')}</span>
          <span aria-hidden="true">↓</span>
        </button>
        {count === DAILY_SLOTS.length && recapBlock}
      </section>
    )
  }

  return (
    <section aria-labelledby="daily-title" data-daily={daily.theme ? 'theme' : 'rotation'} className="border-rule border-ink bg-paper">
      {/* the head: name, the promise, and how far today got */}
      <header className="flex items-baseline justify-between gap-3 border-b-hair border-ink/40 bg-ink px-3 py-2">
        <div className="min-w-0">
          <h2 id="daily-title" className="font-display text-[19px] leading-tight text-paper md:text-[22px]">
            {t('daily.title')}
          </h2>
          <p className="mt-0.5 font-body text-[11.5px] font-bold text-concrete">{t('daily.tagline')}</p>
        </div>
        <p className="shrink-0 font-body text-[12px] font-extrabold text-paper" aria-live="polite">
          {t('daily.progress', { n: String(count) })}
        </p>
      </header>

      {/* a themed day says what it hangs on — the row's own date, spelled out */}
      {daily.theme && (
        <div className="border-b-hair border-ink/40 bg-sheet px-3 py-2">
          <p className="font-body text-[11px] font-extrabold tracking-[0.08em] text-red">
            {t('daily.theme.kicker')} · {t(agoKey(daily.theme.yearsAgo).key, agoKey(daily.theme.yearsAgo).vars)}
          </p>
          <p className="mt-0.5 font-sign text-[16px] leading-tight text-ink md:text-[18px]">
            <bdi>{daily.theme.subjectHe}</bdi>
          </p>
          <p className="mt-0.5 font-body text-[12px] text-muted">
            {daily.theme.competitionHe && (
              <>
                <bdi>{daily.theme.competitionHe}</bdi>
                {' · '}
              </>
            )}
            <bdi>{daily.theme.dateHe}</bdi>
          </p>
        </div>
      )}

      <ol className="grid divide-y divide-ink/20 md:grid-cols-3 md:divide-x md:divide-y-0 md:divide-x-reverse">
        {daily.items.map((item) => (
          <li key={item.slot}>
            {/* on a themed day the strip above already says how long ago — once is enough */}
            <DailyRow item={item} done={done.has(item.slot)} showAgo={!daily.theme} />
          </li>
        ))}
      </ol>

      {recapBlock}
      {variant === 'compact' && (
        <button
          type="button"
          aria-expanded
          onClick={() => setOpen(false)}
          className="flex min-h-tap w-full items-center justify-between gap-2 border-t-hair border-ink/40 bg-sheet px-3 font-body text-[13px] font-extrabold text-ink"
        >
          <span>{t('daily.less')}</span>
          <span aria-hidden="true">↑</span>
        </button>
      )}
    </section>
  )
}

function DailyRow({ item, done, showAgo, compact = false }: { item: DailyItem; done: boolean; showAgo: boolean; compact?: boolean }) {
  const line = item.promptKey ? t(item.promptKey, item.promptVars ?? undefined) : item.subjectHe
  const ago = showAgo && item.yearsAgo !== null && item.yearsAgo > 0 ? agoKey(item.yearsAgo) : null
  return (
    <Link
      href={item.href}
      data-daily-slot={item.slot}
      data-daily-kind={item.kind}
      data-done={done ? 'true' : 'false'}
      className="group flex min-h-tap items-stretch gap-0 transition-colors hover:bg-sheet focus-visible:bg-sheet md:h-full md:flex-col"
    >
      {/* phone: a narrow band at the start · desktop: a strip on top */}
      <span
        className={`flex w-[74px] shrink-0 items-center justify-center px-1.5 text-center font-body text-[11px] font-extrabold leading-tight md:w-auto md:justify-between md:px-3 md:py-1.5 md:text-[12px] ${
          done ? 'bg-ink text-paper' : 'bg-red text-paper'
        }`}
      >
        <span>{compact && !done ? t('daily.now') : t(SLOT_KEY[item.slot])}</span>
        <span aria-hidden="true" className="hidden md:inline">
          {done ? '●' : '○'}
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2 md:justify-start md:py-3">
        <span className="font-sign text-[15px] leading-tight text-ink md:text-[17px]">{t(KIND_KEY[item.kind])}</span>
        {line && (
          <span className="mt-0.5 line-clamp-2 font-body text-[12.5px] leading-snug text-muted md:line-clamp-3 md:text-[13px]">
            <bdi>{line}</bdi>
          </span>
        )}
        {ago && (
          <span className="mt-0.5 font-body text-[11px] font-bold text-red">{t(ago.key, ago.vars)}</span>
        )}
      </span>
      <span className="flex shrink-0 items-center px-3 font-body text-[11.5px] font-extrabold md:px-3 md:pb-3 md:pt-0">
        {done ? <span className="text-ink">{t('daily.done')}</span> : <span aria-hidden="true" className="text-red">←</span>}
      </span>
    </Link>
  )
}
