'use client'

import { track } from '@/lib/analytics/meter'
import { rulesOf, settleDay } from '@/lib/daily/progress'
import type { Daily } from '@/lib/daily/types'
import { readProfile } from '@/lib/profile/store'

import { cleanStandCode, cleanStandName } from './contract'
import { standDebate } from './debate'
import { isoWeekStart, weekDone, weekProgram, type StationId } from './week'

/**
 * The device's side of the stand. Two things live here, both per-device conveniences:
 *
 *  · **which stands this device is in** (`worker.stands.v1`: codes and names only) — so the
 *    home screen and the share row know whether to ask the server anything at all. The
 *    server stays the truth: every stand page re-reads the list and writes it back.
 *  · **today's report** — what the device already knows about itself (which of the three
 *    daily things are done, today's vote, this week's stations), read from the ledgers
 *    every gate already reports into. The blind cow is NOT read here: the server reads
 *    its own sealed cookie, so the result a stand sees is the one the server graded.
 *
 * Every read and write is wrapped; blocked storage means "in no stand", never a crash.
 */

const KEY = 'worker.stands.v1'
const DONE_KEY = 'worker.stands.daily.v1'
const DEBATE_KEY = 'worker.debate.v1'

export type LocalStand = { code: string; name: string }

export function localStands(): LocalStand[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    const out: LocalStand[] = []
    for (const row of parsed) {
      const code = cleanStandCode((row as LocalStand)?.code)
      const name = cleanStandName((row as LocalStand)?.name)
      if (code && name && !out.some((s) => s.code === code)) out.push({ code, name })
    }
    return out.slice(0, 12)
  } catch {
    return []
  }
}

export function writeLocalStands(stands: readonly LocalStand[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(stands.slice(0, 12)))
  } catch {
    // the server still knows; the next stand page writes it again
  }
}

export function rememberStand(stand: LocalStand): void {
  writeLocalStands([stand, ...localStands().filter((s) => s.code !== stand.code)])
}

export function forgetStand(code: string): void {
  writeLocalStands(localStands().filter((s) => s.code !== code))
}

export type DayReport = {
  slots: ('remember' | 'choose' | 'discover')[]
  debateId: string | null
  debatePick: string | null
  stations: StationId[]
}

function votes(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(DEBATE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

/** What this device did today, from its own ledgers. Never throws. */
export function todayReport(daily: Daily): DayReport {
  const empty: DayReport = { slots: [], debateId: null, debatePick: null, stations: [] }
  try {
    const { done } = settleDay(daily.date, rulesOf(daily.items))
    const debate = standDebate(daily)
    const pick = debate ? votes()[debate.id] : undefined
    const program = weekProgram(daily.date)
    return {
      slots: [...done],
      debateId: debate?.id ?? null,
      debatePick: typeof pick === 'string' && /^[A-Za-z0-9_:.-]{1,64}$/.test(pick) ? pick : null,
      stations: weekDone(program, isoWeekStart(daily.date), readProfile()),
    }
  } catch {
    return empty
  }
}

/** `stand_daily_complete` — once per date per device, when all three are in and it counted. */
export function noteStandDailyComplete(date: string, slots: readonly string[]): void {
  if (slots.length < 3) return
  try {
    if (window.localStorage.getItem(DONE_KEY) === date) return
    window.localStorage.setItem(DONE_KEY, date)
    track('stand_daily_complete', { gate: '/stand', value: 3 })
  } catch {
    // measurement only
  }
}
