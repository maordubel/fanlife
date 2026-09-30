'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { myStandsAction } from '@/app/stand/actions'
import type { Daily } from '@/lib/daily/types'
import { t } from '@/lib/i18n'
import { readProfile } from '@/lib/profile/store'
import type { StandRef } from '@/lib/stand/contract'
import { localStands, noteStandDailyComplete, todayReport, writeLocalStands } from '@/lib/stand/local'
import { isoWeekStart, weekDone, weekProgram } from '@/lib/stand/week'

/**
 * The home screen's way back into the stand (ONE RED WORLD §34) — in the app only, and only
 * what is true: "4 מהיציע כבר שיחקו היום" from the database's count, "השבוע נשארה לך תחנה
 * אחת" from the device's own week. No streak, no "falling behind", nothing for a device in
 * no stand — a first visit meets the wall exactly as before.
 *
 * It is also where a member's day reaches the stand without opening it: the pulse reports
 * what the device did today before it asks who else did.
 */
export function StandHooks({ daily }: { daily: Daily }) {
  const [busiest, setBusiest] = useState<StandRef | null>(null)
  const [weekLeftOne, setWeekLeftOne] = useState(false)

  useEffect(() => {
    let live = true
    if (localStands().length === 0) return
    try {
      const program = weekProgram(daily.date)
      setWeekLeftOne(program.length - weekDone(program, isoWeekStart(daily.date), readProfile()).length === 1)
    } catch {
      // an unreadable device has no week to count
    }
    const report = todayReport(daily)
    myStandsAction(report)
      .then((out) => {
        if (!live || !out.ok) return
        writeLocalStands(out.value.map((s) => ({ code: s.code, name: s.name })))
        noteStandDailyComplete(daily.date, report.slots)
        const top = [...out.value].sort((a, b) => b.othersToday - a.othersToday)[0]
        if (top && top.othersToday > 0) setBusiest(top)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [daily])

  if (!busiest && !weekLeftOne) return null
  return (
    <ul className="mt-2 flex flex-wrap gap-2" data-home="stand-hooks">
      {busiest && (
        <li>
          <Link
            href={`/stand/${busiest.code}`}
            className="inline-flex min-h-tap items-center border-hair border-ink bg-sheet px-3 font-body text-step--1 text-ink hover:bg-paper"
          >
            {busiest.othersToday === 1
              ? t('stand.hook.othersOne', { name: busiest.name })
              : t('stand.hook.others', { n: String(busiest.othersToday), name: busiest.name })}
          </Link>
        </li>
      )}
      {weekLeftOne && (
        <li>
          <Link
            href="/stand"
            className="inline-flex min-h-tap items-center border-hair border-ink/40 bg-sheet px-3 font-body text-step--1 text-ink hover:bg-paper"
          >
            {t('stand.hook.weekOne')}
          </Link>
        </li>
      )}
    </ul>
  )
}
