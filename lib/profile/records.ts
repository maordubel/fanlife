/**
 * התיק — every stored record the personal area reads, folded once (ONE RED WORLD §24–§26).
 *
 * The memory map (`memoryMap.ts`) and the memories (`memories.ts`) are both functions of
 * THIS shape and of nothing else, so the two can never disagree about what somebody did,
 * and a test can build the shape from raw storage fixtures and prove a memory reachable
 * end to end. Nothing here is estimated: every field is a count or a set of ids that a gate
 * already wrote — the profile (`lib/profile/store.ts`), gate 1's sheets, gate 4's shirts,
 * gate 7's slip and debates, gate 9's recent five, the daily book, the LIFE save's log.
 *
 * **Pure.** `recordsFrom(raw)` takes parsed JSON (anything, including garbage) and never
 * throws; `readRecords()` is the one client call that reads `localStorage` for it.
 * People are compared by canonical id: gate 9 keeps slugs and an old gate 1 sheet may too,
 * so the caller can hand in a resolver (`peopleOf` on the server) and the fold maps every
 * reference through it before any comparison is made.
 */

import { wallGate } from './gate-id'
import { activeIn, collected, onIds, totalCorrect, type Profile } from './store'

export const RECORD_KEYS = {
  xi: 'worker.xi.v1',
  kits: 'worker.kits.v1',
  ballot: 'worker.ballot.v1',
  sealed: 'worker.ballot.sealed.v1',
  debate: 'worker.debate.v1',
  daily: 'worker.daily.v1',
  rumble: 'the-worker:royal-rumble:recent:v2',
  life: 'the-worker:life',
} as const

export type RawDevice = {
  profile: Profile
  xi?: unknown
  kits?: unknown
  ballot?: unknown
  sealed?: unknown
  debate?: unknown
  daily?: unknown
  rumble?: unknown
  /** the LIFE save's event log (`the-worker:life` → events) */
  lifeEvents?: unknown
  /** the ids the LIFE passport says this person lived (`readPassport`) */
  livedIds?: readonly string[]
}

export type Records = {
  /** right answers across every gate that asks questions */
  correct: number
  /** finished rounds per wall plate route (`/trivia`, `/xi` …) */
  plays: Readonly<Record<string, number>>
  /** trivia topics with at least one finished round */
  triviaTopics: readonly string[]
  /** shirts back in the wardrobe: gate 4's keys ∪ the `kits` collection */
  kits: readonly string[]
  designs: number
  archiveSeen: readonly string[]
  archiveSaved: readonly string[]
  /** gate 6's shelf */
  shelf: readonly string[]
  /** gate 8 — goals rebuilt */
  goals: readonly string[]
  /** gate 13 — Red Thread routes closed */
  routes: readonly string[]
  /** gate 1 — sheets with a man on them, and every man on them */
  xiSheets: number
  xiPeople: readonly string[]
  /** gate 7 — the slip */
  ballotPicks: readonly string[]
  ballotSealed: boolean
  /** gate 7 — debates voted */
  debates: number
  /** gate 9 — every man in the recent runs */
  rumblePeople: readonly string[]
  /** days "היום בהפועל" counted at least one item */
  dailyDays: readonly string[]
  /** LIFE chapters the save completed */
  lifeChapters: readonly string[]
  livedIds: readonly string[]
  /** gate 11 — walls finished */
  hateWalls: number
  duels: number
  shares: number
}

export type PeopleResolver = (ref: string) => string | null

const identity: PeopleResolver = (ref) => ref

function obj(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v !== '') : []
}

function uniq(values: Iterable<string>): string[] {
  return [...new Set(values)]
}

function people(refs: Iterable<string>, resolve: PeopleResolver): string[] {
  const out: string[] = []
  for (const ref of refs) {
    const id = resolve(ref)
    if (id) out.push(id)
  }
  return uniq(out)
}

/** Every reference a gate 1 sheet holds: the eleven, the twelfth, the cut, the shortlist. */
export function xiRefs(xi: unknown): { sheets: number; refs: string[] } {
  let sheets = 0
  const refs: string[] = []
  for (const sheet of Object.values(obj(xi))) {
    const row = obj(sheet)
    const picks = Object.values(obj(row.picks)).filter((v): v is string => typeof v === 'string' && v !== '')
    if (picks.length === 0) continue
    sheets += 1
    refs.push(...picks)
    for (const extra of [row.twelfth, row.cut]) if (typeof extra === 'string' && extra !== '') refs.push(extra)
  }
  return { sheets, refs }
}

export function rumbleRefs(rumble: unknown): string[] {
  if (!Array.isArray(rumble)) return []
  return rumble.flatMap((run) => strings(obj(run).selected))
}

export function ballotRefs(ballot: unknown): string[] {
  return Object.values(obj(ballot)).filter((v): v is string => typeof v === 'string' && v !== '')
}

/** Days the daily book counted anything on — and the profile's own `daily.days` set. */
export function dailyDaysOf(daily: unknown, profile: Profile): string[] {
  const days = new Set(collected(profile, 'daily.days'))
  for (const [date, value] of Object.entries(obj(daily))) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    if (Object.keys(obj(obj(value).done)).length > 0) days.add(date)
  }
  return [...days].sort()
}

export function completedChaptersOf(events: unknown): string[] {
  const out: string[] = []
  for (const event of Array.isArray(events) ? events : []) {
    const row = obj(event)
    if (row.t === 'chapter.completed' && typeof row.chapter === 'string' && !out.includes(row.chapter)) out.push(row.chapter)
  }
  return out
}

export function recordsFrom(raw: RawDevice, resolve: PeopleResolver = identity): Records {
  const profile = raw.profile
  const plays: Record<string, number> = {}
  const topics = new Set<string>()
  let hateWalls = 0
  for (const [id, stat] of Object.entries(profile.gates ?? {})) {
    const n = Math.max(0, Math.floor(stat?.plays ?? 0))
    if (n === 0) continue
    const plate = wallGate(id)
    if (plate !== null) plays[plate] = (plays[plate] ?? 0) + n
    const topic = /^\/trivia\/([a-z0-9-]+)$/.exec(id)?.[1]
    if (topic) topics.add(topic)
    if (plate === '/derby') hateWalls += n
  }
  const xi = xiRefs(raw.xi)
  return {
    correct: totalCorrect(profile),
    plays,
    triviaTopics: [...topics].sort(),
    kits: uniq([...Object.keys(obj(raw.kits)), ...collected(profile, 'kits')]),
    designs: collected(profile, 'kit.designs').length,
    archiveSeen: activeIn(profile, 'archive'),
    archiveSaved: onIds('archive.mine', profile),
    shelf: collected(profile, 'memory'),
    goals: uniq([...collected(profile, 'goal.rebuilt'), ...collected(profile, 'goal')]),
    routes: collected(profile, 'thread.routes'),
    xiSheets: xi.sheets,
    xiPeople: people(xi.refs, resolve),
    ballotPicks: people(ballotRefs(raw.ballot), resolve),
    ballotSealed: raw.sealed === 1 || raw.sealed === true || raw.sealed === '1',
    debates: Object.keys(obj(raw.debate)).length,
    rumblePeople: people(rumbleRefs(raw.rumble), resolve),
    dailyDays: dailyDaysOf(raw.daily, profile),
    lifeChapters: completedChaptersOf(raw.lifeEvents),
    livedIds: uniq(strings(raw.livedIds)),
    hateWalls,
    duels: Math.max(profile.duelsTaken ?? 0, collected(profile, 'duel.seeds').length),
    shares: profile.shares ?? 0,
  }
}

/** Every people-reference on the device, for the one server call that canonicalises them. */
export function peopleRefs(raw: RawDevice): string[] {
  return uniq([...xiRefs(raw.xi).refs, ...ballotRefs(raw.ballot), ...rumbleRefs(raw.rumble)]).filter(
    (ref) => ref.length <= 160,
  )
}

/* ---------------------------------------------------------------- reading the device */

function readJson(key: string): unknown {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as unknown) : null
  } catch {
    return null
  }
}

/** The raw half, read once. The LIFE log is read by key, never through the engine. */
export function readRawDevice(profile: Profile, livedIds: readonly string[] = []): RawDevice {
  const life = obj(readJson(RECORD_KEYS.life))
  return {
    profile,
    xi: readJson(RECORD_KEYS.xi),
    kits: readJson(RECORD_KEYS.kits),
    ballot: readJson(RECORD_KEYS.ballot),
    sealed: readJson(RECORD_KEYS.sealed),
    debate: readJson(RECORD_KEYS.debate),
    daily: readJson(RECORD_KEYS.daily),
    rumble: readJson(RECORD_KEYS.rumble),
    lifeEvents: life.events,
    livedIds,
  }
}
