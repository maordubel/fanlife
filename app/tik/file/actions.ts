'use server'

import { describe } from '@/lib/archive/graph'
import type { ArchiveCard } from '@/lib/archive/graph-types'
import { playerById, resolvePlayerId } from '@/lib/archive/player-master'
import { bridgeOf } from '@/lib/life/bridge'
import { CHAPTERS } from '@/lib/life/content/chapters'

/**
 * התיק שלי — the one round trip for what the device cannot know (ONE RED WORLD §24, §23.3).
 *
 * Two questions, answered from the masters and never stored on either side:
 *
 *   · **Who are these references?** Gate 9 keeps slugs, an old gate 1 sheet may too, and the
 *     slip holds ids. "אותו שם חוזר" compares PEOPLE, so every reference is resolved to one
 *     canonical `p_…` through `resolvePlayerId` — never fuzzily (rule 7). An unknown ref is
 *     simply absent from the answer.
 *   · **What did this device live in LIFE?** The client sends the chapter ids its own save
 *     COMPLETED (`readCompletedChapters`), and gets back, for those chapters only, the
 *     archive cards the bridge names. A chapter the save has not finished is never asked
 *     about and never answered — the passport shows what was lived, nothing ahead (§23.2).
 *
 * An action is a public endpoint, so every input is clamped.
 */

export type LivedChapter = {
  chapterId: string
  year: number
  /** the chapter's own card date ("24 במאי 1986"), never a scoreline */
  dateHe: string
  cards: ArchiveCard[]
}

export type FileExtras = {
  /** reference → canonical player id */
  people: Record<string, string>
  lived: LivedChapter[]
  /** every canonical id the lived chapters name — for `recordsFrom(…).livedIds` */
  livedIds: string[]
}

const clamp = (v: unknown): string => (typeof v === 'string' ? v.slice(0, 160) : '')
const list = (v: unknown, max: number): string[] =>
  Array.isArray(v) ? [...new Set(v.slice(0, max).map(clamp).filter((id) => id !== ''))] : []

export async function fileExtras(input: { refs?: unknown; chapters?: unknown }): Promise<FileExtras> {
  const people: Record<string, string> = {}
  for (const ref of list(input?.refs, 400)) {
    const id = resolvePlayerId(ref)
    if (id && playerById(id)) people[ref] = id
  }

  const lived: LivedChapter[] = []
  const livedIds = new Set<string>()
  for (const chapterId of list(input?.chapters, 60)) {
    const def = CHAPTERS.find((row) => row.id === chapterId)
    const bridge = bridgeOf(chapterId)
    if (!def || !bridge) continue
    for (const id of [...bridge.entityIds, ...bridge.goalIds]) livedIds.add(id)
    const cards = describe(bridge.entityIds.slice(0, 8)).cards
    if (cards.length === 0) continue
    lived.push({ chapterId, year: def.year, dateHe: def.dateHe, cards })
  }
  lived.sort((a, b) => a.year - b.year)
  return { people, lived, livedIds: [...livedIds] }
}
