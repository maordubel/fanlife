'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { createStandAction, myStandsAction } from '@/app/stand/actions'
import { track } from '@/lib/analytics/meter'
import type { Daily } from '@/lib/daily/types'
import { t, type MessageKey } from '@/lib/i18n'
import { readPref } from '@/lib/profile/identity'
import { defaultStandNick, publicName, type StandError, type StandRef } from '@/lib/stand/contract'
import { localStands, rememberStand, todayReport, writeLocalStands, type LocalStand } from '@/lib/stand/local'
import type { Station } from '@/lib/stand/week'

import { WeekCard } from './WeekCard'

/**
 * /stand — the stands this device is in, opening a new one, and the week on its own
 * (§31: "השבוע ביציע" works with nobody else in the system). Phone: the list, then the
 * form, then the week. Desktop: the list and the form side by side above the week.
 */
export function StandIndex({ daily, program, weekStart }: { daily: Daily; program: Station[]; weekStart: string }) {
  const [stands, setStands] = useState<(StandRef | LocalStand)[]>([])
  const [error, setError] = useState<StandError | null>(null)

  useEffect(() => {
    let live = true
    const local = localStands()
    setStands(local)
    if (local.length === 0) return
    myStandsAction(todayReport(daily))
      .then((out) => {
        if (!live) return
        if (out.ok) {
          setStands(out.value)
          writeLocalStands(out.value.map((s) => ({ code: s.code, name: s.name })))
        } else if (out.error === 'unavailable') setError('unavailable')
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [daily])

  return (
    <div>
      <p className="mt-stack max-w-prose font-body text-step--1 leading-relaxed text-muted">{t('stand.lede')}</p>
      {error && (
        <p role="status" className="mt-3 border-hair border-ink/40 bg-sheet p-3 font-body text-step--1 text-ink">
          {t('stand.error.unavailable')}
        </p>
      )}
      <div className="md:grid md:grid-cols-2 md:gap-6">
        <section aria-labelledby="stand-mine" data-stand="mine" className="mt-stack">
          <h2 id="stand-mine" className="font-display text-step-1 leading-none text-ink">
            {t('stand.mine.title')}
          </h2>
          {stands.length === 0 ? (
            <p className="mt-2 font-body text-step--1 text-muted">{t('stand.mine.none')}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {stands.map((stand) => (
                <li key={stand.code}>
                  <Link
                    href={`/stand/${stand.code}`}
                    className="flex min-h-tap items-center justify-between gap-3 border-hair border-ink bg-sheet px-3 py-2 hover:bg-paper"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-sign text-[16px] text-ink">
                        <bdi>{stand.name}</bdi>
                      </span>
                      {'members' in stand && (
                        <span className="block font-body text-[11px] text-muted">
                          {t('stand.mine.members', { n: String(stand.members) })} · <bdi>{publicName(stand.no, stand.nick)}</bdi>
                        </span>
                      )}
                    </span>
                    <bdi dir="ltr" className="shrink-0 font-latin text-[11px] tracking-[0.2em] text-muted">
                      {stand.code}
                    </bdi>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <Create />
      </div>
      <WeekCard program={program} weekStart={weekStart} />
    </div>
  )
}

const ERROR_KEY: Partial<Record<StandError, MessageKey>> = {
  unavailable: 'stand.error.unavailable',
  bad_name: 'stand.error.bad_name',
  too_many: 'stand.error.too_many',
  slow_down: 'stand.error.slow_down',
}

function Create() {
  const [name, setName] = useState('')
  const [nick, setNick] = useState('')
  // §35 — the public nickname this device chose is the stand's default; editable per stand
  useEffect(() => setNick((have) => have || defaultStandNick(readPref())), [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<StandError | null>(null)

  async function create() {
    if (busy) return
    setBusy(true)
    setError(null)
    const out = await createStandAction(name, nick)
    if (!out.ok) {
      setError(out.error)
      setBusy(false)
      return
    }
    track('stand_created', { gate: '/stand' })
    rememberStand(out.value)
    window.location.assign(`/stand/${out.value.code}`)
  }

  return (
    <section aria-labelledby="stand-create" data-stand="create" className="mt-stack border-rule border-ink bg-ink p-4">
      <h2 id="stand-create" className="font-display text-step-1 leading-none text-paper">
        {t('stand.create.title')}
      </h2>
      <form
        className="mt-3 grid gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void create()
        }}
      >
        <label className="flex flex-col gap-1 font-body text-[12px] text-concrete">
          {t('stand.create.name')}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={32}
            required
            placeholder={t('stand.create.namePh')}
            className="min-h-tap border-hair border-concrete/60 bg-paper px-3 font-body text-step-0 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 font-body text-[12px] text-concrete">
          {t('stand.create.nick')}
          <input
            value={nick}
            onChange={(event) => setNick(event.target.value)}
            maxLength={20}
            placeholder={t('stand.create.nickPh')}
            className="min-h-tap border-hair border-concrete/60 bg-paper px-3 font-body text-step-0 text-ink"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="mt-1 flex min-h-tap items-center justify-center bg-red px-5 font-body text-step-0 font-extrabold text-paper disabled:opacity-60"
        >
          {t('stand.create.cta')}
        </button>
      </form>
      {error && (
        <p role="status" className="mt-2 font-body text-[12px] text-concrete">
          {t(ERROR_KEY[error] ?? 'stand.error.generic')}
        </p>
      )}
      <p className="mt-3 font-body text-[11.5px] leading-relaxed text-concrete">{t('stand.join.privacy')}</p>
    </section>
  )
}
