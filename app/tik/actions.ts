'use server'

import { describe } from '@/lib/archive/graph'
import { archive as archiveData } from '@/lib/game/archive'
import type { ArchiveCard } from '@/lib/archive/graph-types'
import { archiveIdentity, type ArchiveIdentity } from '@/lib/archive/wing'
import { questionById } from '@/lib/game/question-master'
import { routeAnchors } from '@/lib/game/thread'

/**
 * שער 10 — one round trip for everything the card cannot know on the device.
 *
 * The device holds ids: the archive items saved and seen, the memory shelf, the goals
 * rebuilt, the routes closed, the favourite's player id, the first match. Their NAMES live
 * in the Entity Graph and the Question Master, both server-only, both megabytes — so the
 * page asks once, on mount, with the ids it has, and gets back cards and names. Nothing
 * is stored on either side; inputs are clamped here because an action is a public
 * endpoint, and an id nothing answers to is simply absent from the answer (never guessed).
 */

export type CardExtrasInput = {
  /** `onIds('archive.mine')` */
  saved: string[]
  /** `activeIn(profile, 'archive')` */
  seen: string[]
  /** `onIds('archive.react')` */
  reactions: string[]
  /** gate 6's shelf — `collected(profile, 'memory')` */
  shelf: string[]
  /** gate 8 — goal ids (`collected(profile, 'goal')` ∪ `'goal.rebuilt'`) */
  goals: string[]
  /** gate 13 — `collected(profile, 'thread.routes')` */
  routes: string[]
  /** player / match ids the card prints by name: the favourite, the last survivor, the first match */
  people: string[]
  /** gate 2's Revenge ledger, as `[questionId, right, wrong]` */
  marks: Array<[string, number, number]>
}

export type RouteCard = { routeId: string; start: ArchiveCard; end: ArchiveCard }

export type CardExtras = {
  archive: ArchiveIdentity
  shelf: ArchiveCard[]
  goals: ArchiveCard[]
  routes: RouteCard[]
  /** id → the name the archive prints for it */
  names: Record<string, string>
  /** gate 2's strongest topic by the ledger — at least six answers in it, or null */
  bestTopic: string | null
}

const clampId = (id: unknown): string => (typeof id === 'string' ? id.slice(0, 160) : '')
const list = (ids: unknown, max: number): string[] =>
  Array.isArray(ids) ? ids.slice(0, max).map(clampId).filter((id) => id !== '') : []
const count = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(9999, Math.floor(n))) : 0)

/** Per topic, how often right — and the best one with enough answers behind it to mean it. */
export async function bestTopicOf(marks: Array<[string, number, number]>): Promise<string | null> {
  const totals = new Map<string, { right: number; asked: number }>()
  for (const row of Array.isArray(marks) ? marks.slice(0, 2000) : []) {
    if (!Array.isArray(row)) continue
    const topic = questionById(clampId(row[0]))?.topic
    if (!topic) continue
    const prior = totals.get(topic) ?? { right: 0, asked: 0 }
    const right = count(row[1])
    totals.set(topic, { right: prior.right + right, asked: prior.asked + right + count(row[2]) })
  }
  const ranked = [...totals.entries()]
    .filter(([, row]) => row.asked >= 6)
    .sort(([ta, a], [tb, b]) => b.right / b.asked - a.right / a.asked || b.asked - a.asked || ta.localeCompare(tb))
  return ranked[0]?.[0] ?? null
}

export async function cardExtras(input: CardExtrasInput): Promise<CardExtras> {
  const archive = archiveIdentity({
    saved: list(input?.saved, 2000),
    seen: list(input?.seen, 2000),
    reactions: list(input?.reactions, 2000),
  })
  const shelf = describe(list(input?.shelf, 400)).cards
  const goals = describe(list(input?.goals, 200).map((id) => (id.startsWith('goal:') ? id : `goal:${id}`))).cards
  const routes = routeAnchors(list(input?.routes, 500)) as RouteCard[]
  const names: Record<string, string> = {}
  for (const id of list(input?.people, 12)) {
    // מי ששרד בקיר השחור (שער 11) הוא שורה ב-enemies.json, לא ישות בגרף — השם נקרא משם
    if (id.startsWith('enemy:')) {
      const slug = id.slice('enemy:'.length)
      const row = archiveData.enemies.find((enemy) => enemy.slug === slug)
      if (row) names[id] = row.nameHe
      continue
    }
    const card = describe([id]).cards[0]
    if (card) names[id] = card.titleHe
  }
  return {
    archive,
    shelf,
    goals,
    routes,
    names,
    bestTopic: await bestTopicOf(Array.isArray(input?.marks) ? input.marks : []),
  }
}
