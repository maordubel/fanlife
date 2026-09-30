'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { t } from '@/lib/i18n'
import { readProfile } from '@/lib/profile/store'
import type { StandHome } from '@/lib/stand/contract'
import { weekRecap } from '@/lib/stand/story'
import { weekDone, type Station, type StationId } from '@/lib/stand/week'

/**
 * השבוע ביציע (§31, §48) — five stations from the gates, each played in its own gate at any
 * moment of the week. Solo it is the device's own week; in a stand every station also says
 * how many from the stand closed it, and the recap is the stand's.
 *
 * Phone: five ROWS, the tick at the start and the door at the end. From `md`: five
 * TILES across, the count under each.
 */
export function WeekCard({
  program,
  weekStart,
  home = null,
}: {
  program: readonly Station[]
  weekStart: string
  home?: StandHome | null
}) {
  const [mine, setMine] = useState<Set<StationId>>(() => new Set())

  useEffect(() => {
    try {
      setMine(new Set(weekDone(program, weekStart, readProfile())))
    } catch {
      // an unreadable device is an untouched week
    }
  }, [program, weekStart])

  const recap = weekRecap(home, mine.size, program.length)
  const inStand = home !== null && home.members >= 2
  // the week's "missed question" (§31): a station nobody in the stand has walked through yet
  const missed = inStand ? (program.find((station) => (home?.week.stations[station.id] ?? 0) === 0) ?? null) : null

  return (
    <section aria-labelledby="stand-week" data-stand="week" className="mt-stack border-rule border-ink bg-sheet p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="stand-week" className="font-display text-step-1 leading-none text-ink">
          {t('stand.week.title')}
        </h2>
        <p className="font-body text-[11px] text-muted">{t('stand.week.sub')}</p>
      </div>
      <ol className="mt-3 grid grid-cols-1 gap-1.5 md:grid-cols-5 md:gap-2">
        {program.map((station) => {
          const done = mine.has(station.id)
          const count = home?.week.stations[station.id] ?? 0
          return (
            <li key={station.id}>
              <Link
                href={station.href}
                data-station={station.id}
                data-done={done ? 'true' : 'false'}
                className={`flex min-h-tap items-center gap-3 border-hair px-3 py-2 md:h-full md:flex-col md:items-start md:gap-1 ${
                  done ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-paper text-ink hover:bg-sheet'
                }`}
              >
                <span aria-hidden="true" className={`font-poster text-[20px] leading-none ${done ? 'text-concrete' : 'text-red'}`}>
                  {station.gate}
                </span>
                <span className="flex-1 font-sign text-[15px] leading-tight">{t(station.labelKey)}</span>
                <span className="font-body text-[11px] font-extrabold">{done ? t('stand.week.done') : t('stand.week.open')}</span>
                {inStand && (
                  <span className={`font-body text-[11px] ${done ? 'text-concrete' : 'text-muted'}`}>
                    {t('stand.week.count', { n: String(count) })}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ol>
      <div className="mt-3 space-y-0.5" data-stand="week-recap">
        {recap.map((line, i) => (
          <p key={line.key} className={i === 0 ? 'font-display text-step-0 text-ink' : 'font-body text-step--1 text-muted'}>
            {t(line.key, line.vars)}
          </p>
        ))}
        {inStand && missed && (
          <p className="font-body text-step--1 text-muted" data-stand="week-missed">
            {t('stand.week.nobody')}: <bdi>{t(missed.labelKey)}</bdi>
          </p>
        )}
      </div>
    </section>
  )
}
