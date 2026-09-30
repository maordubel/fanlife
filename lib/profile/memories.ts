/**
 * זיכרונות — Achievements כזיכרונות (ONE RED WORLD §26).
 *
 * Not generic badges. Each one is a sentence about something that happened, computed from
 * the stored records (`records.ts`) and nothing else — no points, no tiers, no "7/10" and
 * no progress bar. A memory is there or it is not; one that is not there yet is shown as a
 * quiet line saying where it lives, never as a percentage towards it.
 *
 * Rule 63B allows achievements; what stays forbidden is a SINGLE score that says who is a
 * worthy supporter. So there is no total, no count of memories on any screen, and nothing
 * here reaches a share card (`tests/life-share.test.ts` keeps its own rule unchanged).
 *
 * `tests/personal-area.test.ts` builds every memory from raw storage fixtures through
 * `recordsFrom` — the same path the page takes — so "reachable" means reachable from what
 * the gates actually write, not from a hand-made `Records`.
 */

import type { MessageKey } from '@/lib/i18n'

import type { Records } from './records'

export type MemoryDef = {
  id: string
  titleKey: MessageKey
  /** the one Hebrew line, said when it happened */
  lineKey: MessageKey
  /** where it lives, said while it has not happened yet */
  whereKey: MessageKey
  href: string
  reached: (r: Records) => boolean
}

export type MemoryReading = {
  id: string
  titleKey: MessageKey
  lineKey: MessageKey
  reached: boolean
  href: string
}

const goalKey = (id: string) => (id.startsWith('goal:') ? id.slice(5) : id)

/** Did something LIFE lived come back through the archive or gate 8? */
export function livedAndReturned(r: Records): boolean {
  if (r.lifeChapters.length === 0 || r.livedIds.length === 0) return false
  const lived = new Set(r.livedIds.map(goalKey))
  return [...r.archiveSeen, ...r.archiveSaved, ...r.goals].some((id) => lived.has(goalKey(id)))
}

/** One man in gate 1's sheet, on gate 7's slip AND in a gate 9 night. */
export function sameNameAgain(r: Records): string | null {
  const slip = new Set(r.ballotPicks)
  const rumble = new Set(r.rumblePeople)
  return r.xiPeople.find((id) => slip.has(id) && rumble.has(id)) ?? null
}

const m = (id: string, href: string, reached: (r: Records) => boolean): MemoryDef => ({
  id,
  titleKey: `personal.memory.${id}.title` as MessageKey,
  lineKey: `personal.memory.${id}.line` as MessageKey,
  whereKey: `personal.memory.${id}.where` as MessageKey,
  href,
  reached,
})

export const MEMORIES: readonly MemoryDef[] = [
  // §26, in the plan's own order and words
  m('never-forgot', '/trivia', (r) => r.correct >= 100),
  m('shirt-back', '/kits', (r) => r.kits.length >= 10),
  m('deep-archive', '/archive', (r) => r.archiveSeen.length >= 50),
  m('same-name', '/xi', (r) => sameNameAgain(r) !== null),
  m('one-more-saturday', '/', (r) => r.dailyDays.length >= 7),
  m('there-again', '/life', livedAndReturned),
  m('thread-closed', '/timeline', (r) => r.routes.length >= 1),
  // a few more, in the same spirit
  m('slip-signed', '/polls', (r) => r.ballotSealed),
  m('that-is-how', '/goal', (r) => r.goals.length >= 3),
  m('stayed-with-you', '/memory', (r) => r.shelf.length >= 5),
  m('seven-gates', '/', (r) => Object.keys(r.plays).length >= 7),
  m('what-do-you-say', '/polls?tab=debate', (r) => r.debates >= 5),
]

export function memoriesOf(records: Records): MemoryReading[] {
  return MEMORIES.map((def) => {
    const reached = def.reached(records)
    return { id: def.id, titleKey: def.titleKey, lineKey: reached ? def.lineKey : def.whereKey, reached, href: def.href }
  })
}

/** The newest-looking reached memory for the home's one soft line — the last in list order. */
export function softLine(records: Records): MemoryReading | null {
  const reached = memoriesOf(records).filter((row) => row.reached)
  return reached[reached.length - 1] ?? null
}
