/**
 * המנוי — one record per device, and the thing every gate writes to.
 *
 * Before this existed the app remembered four unrelated things in four unrelated
 * places: the poll ballot (`worker.ballot.v1`), the kit collection (`worker.kits.v1`),
 * the member punches (`worker.member.v1`) and the LIFE save. Nothing knew that the
 * person who built a kit was the person who played the trivia, so there was no such
 * thing as "your" anything — and therefore no reason on earth to sign up for an
 * account. A personal area that holds nothing is not a reason to register.
 *
 * So this is the spine: **one record that every gate reports into**, holding what you
 * played, when, how well, and where you are in each gate's deck. The older records are
 * left exactly where they are and read alongside it (see `lib/profile/summary.ts`) —
 * this file adds, it does not migrate, because a migration that loses a member number
 * loses the only thing on the card that cannot be re-earned.
 *
 * Two hard rules carried over from `lib/game/member.ts`, and they are product rules,
 * not storage ones:
 *   · **Nothing here can be bought.** Every number is something you did.
 *   · **A book that cannot be read is a new book, never a crash.** Private mode,
 *     blocked storage and corrupted JSON all resolve to an empty profile.
 */

import { addDays, todayInIsrael } from '@/lib/date/israel'
import { canonicalGate, wallGate } from './gate-id'

const KEY = 'worker.profile.v1'

/** How many days of history the streak grid prints. Matches the member card's quarter. */
export const HISTORY_DAYS = 90

export type GateStat = {
  /** how many rounds finished at this gate */
  plays: number
  /** best score. A gate with no score (the wings) leaves it 0 and prints plays only. */
  best: number
  /** best as a fraction of what was askable, 0–1. The only fair cross-gate comparison. */
  bestRate: number
  /** ISO date of the last round */
  lastOn: string
  /** total right answers, across every round — the number the card leads with */
  correct: number
  /** total questions asked */
  asked: number
}

/** Where this device is in a gate's deck. See `lib/rotation/deck.ts`. */
export type Rotation = { seed: number; cursor: number }

/**
 * The last deed a wing reported: the DAY it was counted, and — for a wing whose deed is
 * a thing that can be unchanged, like gate 1's team sheet — the mark of what was made.
 * See `applyDeed`.
 */
export type Deed = { on: string; mark?: string }

/** A device-only preference. Never synced, never counted, never sent to analytics. */
export type Pref = string | number | boolean

/** The most recent value of something, with the day it was set — gate 11's last wall. */
export type Latest = { v: string; on: string }

export type Profile = {
  v: 1
  /** ISO date the device first played anything */
  since: string
  /** ISO dates, one per day with at least one finished round. Never erased. */
  days: string[]
  gates: Record<string, GateStat>
  rotation: Record<string, Rotation>
  /**
   * Things collected rather than scored — the Ussishkin cards a reader has turned
   * over, and anything else that is a set to complete. Stored as ids, not counts, so
   * completing the set twice does not read as ninety cards out of forty-five.
   */
  collections: Record<string, string[]>
  /** how many times a result was shared from this device */
  shares: number
  /** how many rounds were opened from somebody else's challenge link */
  duelsTaken: number
  /** gate id → the last deed that wing counted (once per gate per day). */
  deeds: Record<string, Deed>
  /**
   * העדפות — how this DEVICE likes a lobby set up (gate 2's last mode, a skipped reveal).
   * Kept here so no gate reaches for raw `localStorage`, and kept OUT of every count and
   * every sync: a preference is not something you did.
   */
  prefs: Record<string, Pref>
  /** key → the latest value and its day. Merged by the later day. */
  latest: Record<string, Latest>
}

export function emptyProfile(): Profile {
  return {
    v: 1,
    since: today(),
    days: [],
    gates: {},
    rotation: {},
    collections: {},
    shares: 0,
    duelsTaken: 0,
    deeds: {},
    prefs: {},
    latest: {},
  }
}

export function emptyStat(): GateStat {
  return { plays: 0, best: 0, bestRate: 0, lastOn: '', correct: 0, asked: 0 }
}

/** the supporter's calendar day — Israel's, not UTC's (`lib/date/israel.ts`) */
export function today(): string {
  return todayInIsrael()
}

export function readProfile(): Profile {
  if (typeof window === 'undefined') return emptyProfile()
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return emptyProfile()
    const parsed = JSON.parse(raw) as Partial<Profile>
    return {
      ...emptyProfile(),
      ...parsed,
      days: Array.isArray(parsed.days) ? parsed.days : [],
      gates: parsed.gates ?? {},
      rotation: record(parsed.rotation),
      collections: record(parsed.collections),
      deeds: record(parsed.deeds),
      prefs: record(parsed.prefs),
      latest: record(parsed.latest),
      shares: count(parsed.shares),
      duelsTaken: count(parsed.duelsTaken),
    }
  } catch {
    return emptyProfile()
  }
}

function record<T>(value: Record<string, T> | undefined | null): Record<string, T> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {}
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

export function writeProfile(profile: Profile): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    // private mode, blocked storage — the app keeps working, the profile just does not persist
  }
}

/**
 * Read, change, write. Every mutation below goes through here so nothing half-writes —
 * and so does `lib/profile/events.ts`, whose reducer is the only other thing that may
 * change a profile. Exported for that one caller; a gate never calls it directly.
 */
export function updateProfile(change: (profile: Profile) => Profile): Profile {
  const next = change(readProfile())
  writeProfile(next)
  return next
}

const update = updateProfile

export type RunResult = {
  gate: string
  /** points, where the gate scores. 0 where it does not. */
  score?: number
  correct?: number
  asked?: number
}

/**
 * Report a finished round.
 *
 * Called from the result screen of every gate — which is the only moment the app can
 * honestly say you played something, as opposed to opened it.
 */
export function recordRun(result: RunResult): Profile {
  const date = today()
  return update((profile) => applyRun(profile, result, date))
}

/**
 * The pure half of `recordRun`. The id is normalised on the way in (`canonicalGate`), so
 * `royal-rumble` is filed as `/royal-rumble` and a round can never be recorded under a
 * name `worker_gate_run` refuses. Negative or fractional figures are clamped rather than
 * trusted, and `correct` can never exceed `asked` — the same check the table carries.
 */
export function applyRun(profile: Profile, result: RunResult, date: string): Profile {
  const gate = canonicalGate(result.gate)
  const prior = profile.gates[gate] ?? emptyStat()
  const asked = whole(result.asked)
  const correct = Math.min(whole(result.correct), asked > 0 ? asked : whole(result.correct))
  const rate = asked > 0 ? correct / asked : 0
  return {
    ...profile,
    days: profile.days.includes(date) ? profile.days : [...profile.days, date],
    gates: {
      ...profile.gates,
      [gate]: {
        plays: prior.plays + 1,
        best: Math.max(prior.best, whole(result.score)),
        bestRate: Math.max(prior.bestRate, rate),
        lastOn: date > prior.lastOn ? date : prior.lastOn,
        correct: prior.correct + correct,
        asked: prior.asked + asked,
      },
    },
  }
}

function whole(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

/**
 * מעשה — a wing has no round to finish, and it still has to be able to light its plate.
 *
 * `recordRun` exists because the only moment the app can honestly say you PLAYED
 * something is the moment a round ended. Four gates have no rounds: gate 1 is free play
 * over the whole roster, gate 5 is a collection, gate 7 is a ballot, and until 17.9.2026
 * none of the three could ever be recorded — so `stillToDo()` nagged about gates that
 * could not be cleared and the wall printed 7 of 11 for a device that had done everything.
 *
 * A deed is the wing's equivalent of a finished round, and it is deliberately the same
 * shape: something was MADE — an eleven saved, a shirt designed, a slip sealed. It
 * carries no score and no denominator, so a wing can never climb the correct/asked
 * figures that belong to the quizzes.
 */
export function recordDeed(gate: string, mark?: string): Profile {
  const date = today()
  return update((profile) => applyDeed(profile, gate, date, mark).profile)
}

/**
 * **Once per gate per day, and only when something new was made** (21.9.2026).
 *
 * Until now a deed was a `recordRun` with no score, and gate 1 reported one on every
 * VISIT with a full eleven — so opening your own team sheet ten times was ten "rounds",
 * and the wing out-played every quiz on the card. Two rules now:
 *
 *  · **A day.** A wing lights its plate once a day however often it is used. That is the
 *    same unit `days` already counts in, and it is what `deed:<gate>:<day>` keys the
 *    remote row on, so the phone and the laptop count the same thing.
 *  · **A mark.** A wing whose deed can be UNCHANGED passes a mark of what was made
 *    (`markOf(sheet)` in `lib/profile/events.ts`). The same mark again — the same eleven
 *    reopened tomorrow — is not a deed at all.
 *
 * `counted` says whether the plate moved, so the caller knows whether there is anything
 * to send upstream.
 */
export function applyDeed(
  profile: Profile,
  gate: string,
  date: string,
  mark?: string,
): { profile: Profile; counted: boolean } {
  const id = canonicalGate(gate)
  const prior = profile.deeds[id]
  const sameDay = prior?.on === date
  const sameMark = mark !== undefined && prior?.mark !== undefined && prior.mark === mark
  const counted = !sameDay && !sameMark
  const nextDeed: Deed = {
    on: counted ? date : prior?.on ?? date,
    ...(mark !== undefined ? { mark } : prior?.mark !== undefined ? { mark: prior.mark } : {}),
  }
  const withDeed = { ...profile, deeds: { ...profile.deeds, [id]: nextDeed } }
  return { profile: counted ? applyRun(withDeed, { gate: id }, date) : withDeed, counted }
}

/**
 * Add to a collection. Idempotent — the same card twice is still one card, which is
 * what makes "45 מתוך 45" a sentence about the archive rather than about tapping.
 */
export function collect(set: string, ids: readonly string[]): Profile {
  return update((profile) => addToSet(profile, set, ids).profile)
}

/** The pure half of `collect`, reporting which ids were actually new. */
export function addToSet(
  profile: Profile,
  set: string,
  ids: readonly string[],
): { profile: Profile; added: string[] } {
  const current = profile.collections[set] ?? []
  const have = new Set(current)
  const added: string[] = []
  for (const id of ids) {
    if (typeof id !== 'string' || id === '' || have.has(id)) continue
    have.add(id)
    added.push(id)
  }
  if (added.length === 0) return { profile, added }
  return {
    profile: { ...profile, collections: { ...profile.collections, [set]: [...current, ...added] } },
    added,
  }
}

export function collected(profile: Profile, set: string): string[] {
  return profile.collections[set] ?? []
}

/* ------------------------------------------------------------------------------------
 * שלושה סוגי קבוצות — and why a union merge decides all three.
 *
 * `lib/portal/merge.ts` merges collections as a UNION, and a union can only grow. That is
 * exactly right for a set you complete (the Ussishkin cards) and exactly wrong for a set
 * you curate ("Mine" in the archive), because an un-save on the laptop comes back from
 * the phone on the next sync. The answer is never "make the merge cleverer" — a union is
 * the one merge that is exact after any number of syncs in any order — it is to make the
 * DATA grow-only even when the meaning is not:
 *
 *  · **grow-only** — `collect()`. A card turned is turned.
 *  · **tombstone** — `retire()` writes the id into a second set, `<set>~`. Live =
 *    set − tombstones. A retirement is permanent, which is what "cleared" means for a
 *    revenge question or a withdrawn item.
 *  · **parity toggle** — `toggleIn()` appends `id#k` with the next k; the item is ON
 *    when its highest k is odd. Both devices saving writes `#1` twice (one token); an
 *    un-save anywhere writes `#2`, and the union's highest k is the truth everywhere.
 *    Two devices that toggle the same number of times agree without talking.
 * ---------------------------------------------------------------------------------- */

/** Sets that record how a device likes things, not what a person did. Never counted, never synced. */
export const PREFERENCE_SETS: ReadonlySet<string> = new Set(['lineup.reveal'])

/** Sets that are bookkeeping for another figure. Synced, never shown as a collection. */
export const LEDGER_SETS: ReadonlySet<string> = new Set(['duel.seeds'])

export function tombstoneOf(set: string): string {
  return `${set}~`
}

export function isTombstoneSet(set: string): boolean {
  return set.endsWith('~')
}

/** Does this set count as something collected? Preferences, ledgers and tombstones do not. */
export function isCountedSet(set: string): boolean {
  return !PREFERENCE_SETS.has(set) && !LEDGER_SETS.has(set) && !isTombstoneSet(set)
}

/** Should this set leave the device at all? Preferences stay home. */
export function isSyncedSet(set: string): boolean {
  return !PREFERENCE_SETS.has(set) && /^[a-z0-9][a-z0-9._~-]{0,47}$/.test(set)
}

/** Grow-only removal: the ids go into `<set>~` and stop being live. */
export function retire(set: string, ids: readonly string[]): Profile {
  return update((profile) => addToSet(profile, tombstoneOf(set), ids).profile)
}

/** The live ids of a tombstoned set. */
export function activeIn(profile: Profile, set: string): string[] {
  const gone = new Set(collected(profile, tombstoneOf(set)))
  return collected(profile, set).filter((id) => !gone.has(id))
}

const PARITY = /^(.*)#(\d{1,6})$/

/** The highest toggle count an id carries in a parity set, 0 when never toggled. */
export function toggleCount(profile: Profile, set: string, id: string): number {
  let top = 0
  for (const token of collected(profile, set)) {
    const match = PARITY.exec(token)
    if (match && match[1] === id) top = Math.max(top, Number(match[2]))
  }
  return top
}

/** Is `id` switched on in a parity set? Reads the device's profile unless one is handed in. */
export function isOn(set: string, id: string, profile: Profile = readProfile()): boolean {
  return toggleCount(profile, set, id) % 2 === 1
}

/** Every id currently ON in a parity set, in first-seen order. */
export function onIds(set: string, profile: Profile = readProfile()): string[] {
  const top = new Map<string, number>()
  for (const token of collected(profile, set)) {
    const match = PARITY.exec(token)
    if (!match) continue
    const id = match[1] as string
    top.set(id, Math.max(top.get(id) ?? 0, Number(match[2])))
  }
  return [...top.entries()].filter(([, k]) => k % 2 === 1).map(([id]) => id)
}

/** The pure half of a toggle: the next token, and the profile holding it. */
export function toggleToken(
  profile: Profile,
  set: string,
  id: string,
): { profile: Profile; token: string; on: boolean } {
  const k = toggleCount(profile, set, id) + 1
  const token = `${id}#${k}`
  return { profile: addToSet(profile, set, [token]).profile, token, on: k % 2 === 1 }
}

/** Flip `id` in a parity set. Returns the new state. */
export function toggleIn(set: string, id: string): boolean {
  let on = false
  update((profile) => {
    const next = toggleToken(profile, set, id)
    on = next.on
    return next.profile
  })
  return on
}

/** Set `id` to a state; a no-op when it is already there, so a double tap cannot flip it back. */
export function setIn(set: string, id: string, on: boolean): boolean {
  update((profile) =>
    isOn(set, id, profile) === on ? profile : toggleToken(profile, set, id).profile,
  )
  return on
}

/** How many live things a counted set holds, whatever kind of set it is. */
export function collectionSize(profile: Profile, set: string): number {
  const tokens = collected(profile, set)
  if (tokens.length > 0 && tokens.every((token) => PARITY.test(token))) return onIds(set, profile).length
  return activeIn(profile, set).length
}

export function recordShare(): void {
  update((profile) => ({ ...profile, shares: profile.shares + 1 }))
}

/**
 * A round opened from somebody else's challenge link. With a gate and a seed the duel is
 * counted ONCE per (plate, seed) — a reload of the result screen is not a second duel —
 * through the `duel.seeds` ledger, which syncs like any set. Without them it counts, as
 * it always did.
 */
export function recordDuelTaken(gate?: string, seed?: number | null): boolean {
  let counted = false
  update((profile) => {
    const next = applyDuel(profile, gate, seed)
    counted = next.counted
    return next.profile
  })
  return counted
}

export function applyDuel(
  profile: Profile,
  gate?: string,
  seed?: number | null,
): { profile: Profile; counted: boolean; token: string | null } {
  if (gate === undefined || typeof seed !== 'number' || !Number.isFinite(seed)) {
    return { profile: { ...profile, duelsTaken: profile.duelsTaken + 1 }, counted: true, token: null }
  }
  const token = `${wallGate(gate) ?? canonicalGate(gate)}:${Math.round(seed)}`
  const next = addToSet(profile, 'duel.seeds', [token])
  if (next.added.length === 0) return { profile, counted: false, token }
  return { profile: { ...next.profile, duelsTaken: next.profile.duelsTaken + 1 }, counted: true, token }
}

/** A device-only preference, or `fallback`. */
export function prefOf<T extends Pref>(key: string, fallback: T, profile: Profile = readProfile()): T {
  const value = profile.prefs[key]
  return typeof value === typeof fallback ? (value as T) : fallback
}

export function setPref(key: string, value: Pref): void {
  update((profile) => ({ ...profile, prefs: { ...profile.prefs, [key]: value } }))
}

/** Record the latest value of something — the last wall, the last topic — with today's date. */
export function applyLatest(profile: Profile, key: string, value: string, date: string): Profile {
  return { ...profile, latest: { ...profile.latest, [key]: { v: value, on: date } } }
}

/** Where the device is in a gate's deck, or the start of a brand-new deck. */
export function rotationFor(gate: string, mint: () => number): Rotation {
  const profile = readProfile()
  const found = profile.rotation[gate]
  if (found && Number.isFinite(found.seed) && found.seed > 0) return found
  const fresh = { seed: mint(), cursor: 0 }
  writeProfile({ ...profile, rotation: { ...profile.rotation, [gate]: fresh } })
  return fresh
}

/** Walk one slice forward. Called when a round is entered, not when it ends. */
export function advanceRotation(gate: string, mint: () => number): Rotation {
  const current = rotationFor(gate, mint)
  const next = { seed: current.seed, cursor: current.cursor + 1 }
  update((profile) => ({ ...profile, rotation: { ...profile.rotation, [gate]: next } }))
  return next
}

/**
 * Put the device at an exact place in a gate's deck. For a deck whose cursor does not move one
 * slice per round — gate 4 counts SHIRTS, and a Quick round spends three where a Full one spends
 * five (`kitNextCursor`) — so "again" lands where the last round actually stopped.
 */
export function setRotation(gate: string, next: Rotation): Rotation {
  const safe = { seed: Math.max(1, Math.floor(next.seed)), cursor: Math.max(0, Math.floor(next.cursor)) }
  update((profile) => ({ ...profile, rotation: { ...profile.rotation, [gate]: safe } }))
  return safe
}

/** Consecutive days up to and including today. Yesterday still counts as alive. */
export function streak(profile: Profile, from: Date = new Date()): number {
  const days = new Set(profile.days)
  let cursor = todayInIsrael(from)
  // A streak survives until the end of the next day: somebody who played last night and
  // opens the app at nine in the morning has not "broken" anything.
  if (!days.has(cursor)) cursor = addDays(cursor, -1)
  let count = 0
  while (days.has(cursor)) {
    count += 1
    cursor = addDays(cursor, -1)
  }
  return count
}

/** The last ninety days, newest last — the grid the card prints. */
export function historyGrid(profile: Profile, from: Date = new Date()): boolean[] {
  const days = new Set(profile.days)
  const out: boolean[] = []
  const end = todayInIsrael(from)
  for (let back = HISTORY_DAYS - 1; back >= 0; back -= 1) out.push(days.has(addDays(end, -back)))
  return out
}

export function totalPlays(profile: Profile): number {
  return Object.values(profile.gates).reduce((sum, stat) => sum + stat.plays, 0)
}

export function totalCorrect(profile: Profile): number {
  return Object.values(profile.gates).reduce((sum, stat) => sum + stat.correct, 0)
}

/**
 * How many PLATES have been lit — not how many ids. `/trivia/europe` and `/trivia/songs`
 * are one gate; `royal-rumble` (the old id) and `/royal-rumble/live` are gate 9. An id
 * no plate owns lights nothing.
 */
export function gatesTouched(profile: Profile): number {
  const plates = new Set<string>()
  for (const [id, stat] of Object.entries(profile.gates)) {
    if ((stat?.plays ?? 0) <= 0) continue
    const plate = wallGate(id)
    if (plate !== null) plates.add(plate)
  }
  return plates.size
}
