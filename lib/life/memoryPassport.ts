/**
 * דרכון הזיכרון — LIFE Memory Passport (ONE RED WORLD §23.3, §47). Client-safe.
 *
 * Which real archive entities has this person LIVED THROUGH in THE WORKER LIFE? The
 * answer is provenance, never a reward: no points, no unlock, no badge. It lets another
 * gate say "חיית את זה ב-LIFE" about a match, a man or a season's shirt — and nothing it
 * says may reach past what this device's save has actually played.
 *
 * Two halves, kept apart on purpose:
 *
 *   · the BRIDGE (`lib/life/bridge.ts`, server-only) maps a chapter to the canonical ids its
 *     sourced anchor names. It is derived from the anchors and the masters; nobody types a
 *     link into it, and only a chapter whose anchor is a real sourced row has an entry.
 *   · this file folds the SAVE against that bridge. A chapter counts only once the log holds
 *     its `chapter.completed` — entering a chapter is not living it, and a chapter the save
 *     has not reached never leaks (§23.2: never reveal future LIFE content).
 *
 * The save is read through the one reader that exists (`lifeStore`), never Phaser.
 */

import { lifeStore } from './save'

/** §47 — one chapter's link into the archive. Every id is canonical and resolvable. */
export type LifeArchiveBridge = {
  chapterId: string
  entityIds: string[]
  matchIds: string[]
  kitIds: string[]
  goalIds: string[]
  playerIds: string[]
  /** where a return to this chapter lands — the LIFE landing, the one point always safe */
  safeReturnPoint: string
}

/**
 * LIFE → gates (§23.1): one door of a finished chapter's recap, derived on the server by
 * `lifeDoors()` and handed down — the shell never builds a link. `label` is a message key.
 */
export type LifeDoor = { kind: 'archive' | 'goal' | 'trivia'; href: string; label: string }

/** §23.3 — one chapter as this person lived it. */
export type LifeMemory = LifeArchiveBridge & {
  /** when the save recording it was written — the log carries no clock of its own */
  unlockedAt: string | null
}

export type LifePassport = readonly LifeMemory[]

type LoggedEvent = { t: string; chapter?: unknown }

/** The chapters the log says were finished, in the order they were finished. */
export function completedChapters(events: readonly LoggedEvent[] | null | undefined): string[] {
  const out: string[] = []
  for (const event of events ?? []) {
    if (!event || event.t !== 'chapter.completed' || typeof event.chapter !== 'string') continue
    if (!out.includes(event.chapter)) out.push(event.chapter)
  }
  return out
}

/**
 * The passport: the bridge rows of the chapters this save completed, and no others. A
 * chapter with no bridge row (fiction with no sourced anchor) contributes nothing — it is
 * still a lived chapter, it simply names no archive entity.
 */
export function memoryPassport(
  events: readonly LoggedEvent[] | null | undefined,
  bridge: readonly LifeArchiveBridge[],
  savedAt: string | null = null,
): LifeMemory[] {
  const done = new Set(completedChapters(events))
  return bridge.filter((row) => done.has(row.chapterId)).map((row) => ({ ...row, unlockedAt: savedAt }))
}

/** Did this person live the entity (a match, a man, a goal, a season's shirt) in LIFE? */
export function livedIt(passport: LifePassport, entityId: string | null | undefined): boolean {
  if (!entityId) return false
  return passport.some(
    (row) =>
      row.entityIds.includes(entityId) ||
      row.matchIds.includes(entityId) ||
      row.kitIds.includes(entityId) ||
      row.goalIds.includes(entityId) ||
      row.playerIds.includes(entityId),
  )
}

/** The lived chapters an entity belongs to — for "חזור לרגע בסיפור". */
export function livedChapters(passport: LifePassport, entityId: string | null | undefined): string[] {
  if (!entityId) return []
  return passport
    .filter((row) => row.entityIds.includes(entityId) || row.goalIds.includes(entityId) || row.kitIds.includes(entityId))
    .map((row) => row.chapterId)
}

/** Every chapter this device's save completed — what a gate sends the server as "unlocked". */
export async function readCompletedChapters(): Promise<string[]> {
  try {
    const file = await lifeStore.read()
    return completedChapters(file?.events as LoggedEvent[] | undefined)
  } catch {
    return []
  }
}

/** The passport of this device, against the bridge a server page handed down. */
export async function readPassport(bridge: readonly LifeArchiveBridge[]): Promise<LifeMemory[]> {
  try {
    const file = await lifeStore.read()
    return memoryPassport(file?.events as LoggedEvent[] | undefined, bridge, file?.savedAt ?? null)
  } catch {
    return []
  }
}
