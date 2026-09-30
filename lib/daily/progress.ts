import { track } from '@/lib/analytics/meter'
import { todayInIsrael } from '@/lib/date/israel'
import { canonicalGate, wallGate } from '@/lib/profile/gate-id'
import { readProfile, type Profile } from '@/lib/profile/store'

import { DAILY_SLOTS, type DailyItem, type DailySlot, type DoneRule } from './types'

/**
 * היום בהפועל — the device's side (§7, §42.5 "guest persistence"). Client-safe.
 *
 * Local-first, per date, and never a second ledger of what was PLAYED: whether an item is
 * done is read from the record every gate already reports into (`emit()` →
 * `worker.profile.v1`) and, for gate 7's debates, from the debate store — so no gate
 * screen has to know the daily exists. What THIS file keeps, under `worker.daily.v1`, is
 * only the daily's own bookkeeping: which slots were counted (so `daily_item_complete`
 * fires once), whether the souvenir was kept, whether the card was closed for the day,
 * and today's three rules — so the emit seam (`noteDailyProgress`, one line in
 * `lib/analytics/progress.ts`) can recognise a completion the moment a gate reports it.
 *
 * Every read and write is wrapped: private mode, a full quota and a hand-edited value all
 * resolve to "nothing done yet", never to a crash.
 */

const KEY = 'worker.daily.v1'
const DEBATE_KEY = 'worker.debate.v1'
const KEEP_DAYS = 21
/** the measurement's "gate" for the daily — the home screen it lives on */
export const DAILY_METER_GATE = '/'

export type StoredRule = { slot: DailySlot; kind: string; done: DoneRule }

export type DayRecord = {
  /** slot → the ISO instant it was first counted */
  done: Partial<Record<DailySlot, string>>
  rules?: StoredRule[]
  souvenir?: boolean
  closed?: boolean
  /** `daily_complete` already sent */
  complete?: boolean
}

type Book = Record<string, DayRecord>

function readBook(): Book {
  try {
    if (typeof window === 'undefined') return {}
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const out: Book = {}
    for (const [date, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof value !== 'object' || value === null) continue
      const v = value as Partial<DayRecord>
      out[date] = {
        done: cleanDone(v.done),
        rules: Array.isArray(v.rules) ? v.rules.filter(isRule) : undefined,
        souvenir: v.souvenir === true || undefined,
        closed: v.closed === true || undefined,
        complete: v.complete === true || undefined,
      }
    }
    return out
  } catch {
    return {}
  }
}

function cleanDone(raw: unknown): DayRecord['done'] {
  const out: DayRecord['done'] = {}
  if (typeof raw !== 'object' || raw === null) return out
  for (const slot of DAILY_SLOTS) {
    const at = (raw as Record<string, unknown>)[slot]
    if (typeof at === 'string') out[slot] = at
  }
  return out
}

function isRule(raw: unknown): raw is StoredRule {
  if (typeof raw !== 'object' || raw === null) return false
  const r = raw as Partial<StoredRule>
  return (DAILY_SLOTS as readonly string[]).includes(r.slot as string) && typeof r.done === 'object' && r.done !== null
}

function writeBook(book: Book): void {
  try {
    const dates = Object.keys(book).sort().slice(-KEEP_DAYS)
    const kept: Book = {}
    for (const date of dates) kept[date] = book[date] as DayRecord
    window.localStorage.setItem(KEY, JSON.stringify(kept))
  } catch {
    // a daily that cannot be written is still today's daily — it is re-read from the ledger
  }
}

export function readDay(date: string): DayRecord {
  return readBook()[date] ?? { done: {} }
}

export function updateDay(date: string, change: (day: DayRecord) => DayRecord): DayRecord {
  const book = readBook()
  const next = change(book[date] ?? { done: {} })
  book[date] = next
  writeBook(book)
  return next
}

function readDebateVotes(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(DEBATE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

/* ------------------------------------------------------------------ the rule, pure */

/**
 * Was this rule satisfied on `date`? Pure — the profile and the votes are handed in.
 *
 *   `run`    a round filed on `date` under exactly this id
 *   `gate`   anything filed on `date` whose plate is this gate (a trivia topic lights
 *            `/trivia`; `/kits/build` does NOT light `/kits`)
 *   `debate` a vote for the debate exists — an opinion given is given
 */
export function ruleDone(rule: DoneRule, date: string, profile: Profile, votes: Readonly<Record<string, string>>): boolean {
  if (rule.by === 'debate') return typeof votes[rule.debateId] === 'string' && votes[rule.debateId] !== ''
  if (rule.by === 'run') return profile.gates[canonicalGate(rule.id)]?.lastOn === date
  const plate = wallGate(rule.gate)
  if (!plate) return false
  return Object.entries(profile.gates).some(([id, stat]) => stat.lastOn === date && wallGate(id) === plate)
}

export function doneSlots(
  rules: readonly StoredRule[],
  date: string,
  profile: Profile,
  votes: Readonly<Record<string, string>>,
  stored: DayRecord['done'] = {},
): Set<DailySlot> {
  const out = new Set<DailySlot>()
  for (const slot of DAILY_SLOTS) if (stored[slot]) out.add(slot)
  for (const rule of rules) if (ruleDone(rule.done, date, profile, votes)) out.add(rule.slot)
  return out
}

/* ------------------------------------------------------------------ the device */

export function rulesOf(items: readonly DailyItem[]): StoredRule[] {
  return items.map((item) => ({ slot: item.slot, kind: item.kind, done: item.done }))
}

/**
 * Re-read the ledger for `date`, count every slot that newly came true (once), and send
 * `daily_item_complete` / `daily_complete`. Returns the day as it now stands.
 */
export function settleDay(date: string, rules?: readonly StoredRule[]): { day: DayRecord; done: Set<DailySlot> } {
  let fresh: DailySlot[] = []
  let finished = false
  const day = updateDay(date, (prior) => {
    const known = rules ?? prior.rules ?? []
    const done = doneSlots(known, date, readProfile(), readDebateVotes(), prior.done)
    const next: DayRecord = { ...prior, rules: known.length ? [...known] : prior.rules, done: { ...prior.done } }
    const at = new Date().toISOString()
    fresh = [...done].filter((slot) => !prior.done[slot])
    for (const slot of fresh) next.done[slot] = at
    finished = done.size === DAILY_SLOTS.length && !prior.complete
    if (finished) next.complete = true
    return next
  })
  for (const slot of fresh) {
    const kind = day.rules?.find((rule) => rule.slot === slot)?.kind ?? 'item'
    track('daily_item_complete', { gate: DAILY_METER_GATE, detail: `${slot}:${kind}`.toLowerCase() })
  }
  if (finished) track('daily_complete', { gate: DAILY_METER_GATE, value: DAILY_SLOTS.length })
  return { day, done: new Set(DAILY_SLOTS.filter((slot) => day.done[slot])) }
}

/**
 * The emit seam: a gate just reported something (`lib/analytics/progress.ts`). If today's
 * daily was dealt on this device, see whether that report finished one of its items.
 * Never throws — the progress layer is never the reason a result screen breaks.
 */
export function noteDailyProgress(): void {
  try {
    if (typeof window === 'undefined') return
    const date = todayInIsrael()
    const day = readBook()[date]
    if (!day?.rules?.length) return
    settleDay(date)
  } catch {
    // measurement and bookkeeping only
  }
}
