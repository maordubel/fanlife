'use server'

import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'

import { resolveDaily } from '@/lib/daily/resolve'
import { todayInIsrael } from '@/lib/date/israel'
import type { RunState } from '@/lib/game/blind-cow/engine'
import { open } from '@/lib/game/blind-cow/token'
import {
  cleanHeadline,
  cleanNick,
  cleanStandCode,
  cleanStandName,
  gateOfPath,
  standPath,
  type Peek,
  type Result,
  type StandHome,
  type StandRef,
} from '@/lib/stand/contract'
import { standDebate } from '@/lib/stand/debate'
import type { DayReport } from '@/lib/stand/local'
import {
  createStand,
  joinStand,
  leaveStand,
  myStands,
  peekStand,
  postToStand,
  reportDay,
  standHome,
  type ReportIn,
} from '@/lib/stand/server'
import { isoWeekStart, weekProgram } from '@/lib/stand/week'

/**
 * Server authority for "היציע שלי". The page never names a table, never holds a key and
 * never grades itself: the device key lives in an httpOnly cookie the page cannot read,
 * the blind cow's result is read from the server's own sealed daily cookie (`bc_daily`),
 * and what the device reports about the daily is checked against today's daily before it
 * travels — a slot that does not exist, a debate that is not today's, a station that is not
 * this week's, all dropped here and again in the database.
 */

const KEY_COOKIE = 'stand_me'
const HEX = /^[0-9a-f]{32}$/

/** The device's stand key — minted on the first join/create only, never on a look. */
function deviceKey(mint: boolean): string | null {
  const have = cookies().get(KEY_COOKIE)?.value
  if (have && HEX.test(have)) return have
  if (!mint) return null
  const fresh = randomBytes(16).toString('hex')
  cookies().set(KEY_COOKIE, fresh, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return fresh
}

let dailyCache: { date: string; debate: string | null; stations: Set<string> } | null = null
function today(): { date: string; debate: string | null; stations: Set<string> } {
  const date = todayInIsrael()
  if (dailyCache?.date !== date) {
    const daily = resolveDaily(date)
    dailyCache = {
      date,
      debate: standDebate(daily)?.id ?? null,
      stations: new Set(weekProgram(date).map((s) => s.id)),
    }
  }
  return dailyCache
}

/** The daily blind cow as the SERVER graded it — the sealed cookie, never a claim. */
function blindCowToday(date: string): ReportIn['bc'] {
  const state = open<RunState>(cookies().get('bc_daily')?.value)
  if (!state || state.v !== 1 || state.mode !== 'daily' || state.day !== date) return null
  if (state.status === 'playing') return null
  const hints = Math.max(1, Math.min(10, Math.trunc(state.shown)))
  return { status: state.status, hints, wrong: Math.max(0, Math.min(50, Math.trunc(state.wrong))) }
}

function cleanReport(report: DayReport | null | undefined): ReportIn {
  const day = today()
  const slots = Array.isArray(report?.slots) ? report.slots.filter((s) => s === 'remember' || s === 'choose' || s === 'discover') : []
  const debateOk = report?.debateId && report.debateId === day.debate && typeof report.debatePick === 'string'
  return {
    day: day.date,
    slots: [...new Set(slots)],
    bc: blindCowToday(day.date),
    debateId: debateOk ? (report?.debateId ?? null) : null,
    debatePick: debateOk ? (report?.debatePick ?? null) : null,
    weekStart: isoWeekStart(day.date),
    stations: Array.isArray(report?.stations) ? report.stations.filter((s) => day.stations.has(s)) : [],
  }
}

export async function createStandAction(name: string, nick: string): Promise<Result<{ code: string; name: string }>> {
  const clean = cleanStandName(name)
  if (!clean) return { ok: false, error: 'bad_name' }
  const key = deviceKey(true) as string
  return createStand(key, clean, cleanNick(nick))
}

export async function joinStandAction(code: string, nick: string): Promise<Result<{ code: string; name: string; no: number }>> {
  const clean = cleanStandCode(code)
  if (!clean) return { ok: false, error: 'not_found' }
  return joinStand(deviceKey(true) as string, clean, cleanNick(nick))
}

export async function leaveStandAction(code: string): Promise<Result<true>> {
  const clean = cleanStandCode(code)
  const key = deviceKey(false)
  if (!clean || !key) return { ok: false, error: 'not_member' }
  return leaveStand(key, clean)
}

/** What a link opens on: the stand's name, how many, and whether this device is in it. */
export async function peekStandAction(code: string): Promise<Result<Peek>> {
  const clean = cleanStandCode(code)
  if (!clean) return { ok: false, error: 'not_found' }
  return peekStand(deviceKey(false), clean)
}

/** A member's visit: report what the device did today, then read the stand. */
export async function standHomeAction(code: string, report: DayReport | null): Promise<Result<StandHome>> {
  const clean = cleanStandCode(code)
  const key = deviceKey(false)
  if (!clean || !key) return { ok: false, error: 'not_member' }
  const r = cleanReport(report)
  await reportDay(key, r)
  const day = today()
  return standHome(key, clean, day.debate, r.weekStart, [...day.stations])
}

/** The home screen's pulse: report, then which stands and who already played today. */
export async function myStandsAction(report: DayReport | null): Promise<Result<StandRef[]>> {
  const key = deviceKey(false)
  if (!key) return { ok: true, value: [] }
  await reportDay(key, cleanReport(report))
  return myStands(key)
}

/** שלח ליציע — a run link and its line, into one stand the device is in. */
export async function postStandAction(code: string, link: string, headline: string): Promise<Result<true>> {
  const clean = cleanStandCode(code)
  const key = deviceKey(false)
  if (!clean || !key) return { ok: false, error: 'not_member' }
  const path = standPath(link)
  const line = cleanHeadline(headline)
  const gate = path ? gateOfPath(path) : null
  if (!path || !line || gate === null) return { ok: false, error: 'bad_post' }
  return postToStand(key, clean, gate, path, line)
}
