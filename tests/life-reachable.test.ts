import { describe, expect, it } from 'vitest'

import { ACTIVITIES, activityCeiling, activityChapters } from '@/lib/life/activities'
import { CHAPTERS } from '@/lib/life/content/chapters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { goalA4, objectiveA4, SHIRT_PRICE } from '@/lib/life/content/chapterStageA'
import { eraFor } from '@/lib/life/content/era'
import { emptyState } from '@/lib/life/events'
import type { LifeState, PlayerIdentity } from '@/lib/life/types'
import { TRAIT_ROUTE } from '@/lib/life/types'
import { ALL_SCENES, inEra } from '@/lib/life/world/scenes'
import type { Condition } from '@/lib/life/world/types'

/**
 * מה שאי אפשר להשיג — a branch that asks for a number the game cannot produce.
 *
 * This is the class of defect that every other checker in the repo is blind to. A gate
 * on a flag is caught by `deadend-audit`; a gate on a NUMBER is not, because the number
 * looks perfectly ordinary in the source. `{ relationship: { who: 'efi', axis: 'trust',
 * min: 45 } }` reads like a threshold somebody tuned. It was unreachable in every life
 * ever played, in three separate chapters, for the simple reason that nothing in the
 * whole game raises Efi's trust by more than three.
 *
 * The ceiling here is deliberately absurd: every positive delta a chapter can declare,
 * all taken, in one life, with no clock and no exclusivity. A threshold ABOVE that is
 * unreachable by proof. A threshold below it may still be unreachable in practice, and
 * this suite says nothing about those — no false positives, plenty of false negatives.
 *
 * `scripts/life/budget-audit.ts` is the same walk with a readable report and a table of
 * every ceiling; this file is the part that must not regress. The script's own header
 * lists the six ways an earlier draft measured a dead field, which is the reason every
 * routing below is taken from the reducer's own tables rather than from the effect name.
 */

const PLAYABLE = CHAPTERS.filter((c) => c.playable !== false)
const ORDER = PLAYABLE.map((c) => c.id)

/**
 * The life opens where the first playable chapter opens — read off `CHAPTERS`, never
 * typed. Rule 45 forbids a year literal in a life suite for a good reason (a hand-written
 * year is how a file starts disagreeing with the master timeline), and the number is not
 * ours to choose anyway: move the first chapter and this seed moves with it.
 */
const IDENTITY = { birthYear: (PLAYABLE[0]?.year ?? 0) - 6, nameHe: 'פוגי' } as unknown as PlayerIdentity
const START: LifeState = emptyState(IDENTITY, PLAYABLE[0]?.year ?? 0)
const CAP = 100

type Ceiling = Map<string, number>
const bump = (into: Ceiling, key: string, delta: number) => {
  if (delta <= 0) return
  const raw = (into.get(key) ?? 0) + delta
  into.set(key, key === 'agorot' || key === 'savings' ? raw : Math.min(CAP, raw))
}

const effectsOf = (id: string) => {
  const out: Array<Record<string, unknown> & { e: string }> = []
  for (const branch of DIALOGUE[id]?.branches ?? []) {
    for (const effect of branch.then ?? []) out.push(effect as never)
    for (const choice of branch.choices ?? []) for (const effect of choice.then) out.push(effect as never)
  }
  return out
}

const rootsFor = (chapter: string): string[] => {
  const roots: string[] = []
  for (const scene of ALL_SCENES) {
    for (const actor of scene.actors) if (inEra(actor, chapter) && actor.talk) roots.push(actor.talk)
    for (const spot of scene.hotspots) {
      const act = (spot as { act?: string }).act
      if (inEra(spot, chapter) && act) roots.push(act)
    }
  }
  const era = eraFor(chapter) as unknown as Record<string, unknown>
  const scan = (value: unknown, depth = 0): void => {
    if (depth > 12 || !value) return
    if (Array.isArray(value)) return void value.forEach((item) => scan(item, depth + 1))
    if (typeof value !== 'object') return
    const node = value as Record<string, unknown>
    for (const key of ['talk', 'node', 'act', 'conversation']) {
      if (typeof node[key] === 'string') roots.push(node[key] as string)
    }
    for (const child of Object.values(node)) scan(child, depth + 1)
  }
  for (const key of ['beats', 'opportunities', 'encounters', 'ambient']) scan(era[key])
  return roots
}

const conversationsIn = (chapter: string): Set<string> => {
  const seen = new Set<string>()
  const queue = rootsFor(chapter)
  while (queue.length) {
    const id = queue.shift() as string
    if (seen.has(id) || !DIALOGUE[id]) continue
    seen.add(id)
    for (const effect of effectsOf(id)) if (effect.e === 'goto') queue.push(effect.node as string)
  }
  return seen
}

const addEffect = (into: Ceiling, e: Record<string, unknown> & { e: string }): void => {
  switch (e.e) {
    case 'money':
    case 'withdraw':
      return bump(into, 'agorot', e.agorot as number)
    case 'save':
      return bump(into, 'savings', e.agorot as number)
    case 'redheart':
      return bump(into, `redHeart.${e.key as string}`, e.delta as number)
    case 'rel':
      return bump(into, `rel.${e.who as string}.${e.axis as string}`, e.delta as number)
    // the legacy surface writes the very same axis — `withRelationship` mirrors it
    case 'bond':
      return bump(into, `rel.${e.who as string}.bond`, e.delta as number)
    case 'personality':
      return bump(into, `personality.${e.key as string}`, e.delta as number)
    case 'wellbeing':
      return bump(into, `wellbeing.${e.key as string}`, e.delta as number)
    case 'army':
      return bump(into, `army.${e.key as string}`, e.delta as number)
    case 'institution':
      return bump(into, `institution.${e.key as string}`, e.delta as number)
    // a trait is not a counter any more: TRAIT_ROUTE forwards it
    case 'trait': {
      const route = TRAIT_ROUTE[e.trait as keyof typeof TRAIT_ROUTE]
      if (route?.personality) bump(into, `personality.${route.personality}`, e.delta as number)
      if (route?.redHeart) bump(into, `redHeart.${route.redHeart}`, e.delta as number)
      return
    }
    default:
      return
  }
}

const addRawEvents = (into: Ceiling, events: readonly unknown[]): void => {
  for (const event of events) {
    const ev = event as { t?: string; agorot?: number }
    if (typeof ev.agorot !== 'number') continue
    if (ev.t === 'money.gained' || ev.t === 'money.changed') bump(into, 'agorot', ev.agorot)
    if (ev.t === 'savings.changed') bump(into, 'savings', ev.agorot)
  }
}

const seed = (): Ceiling => {
  const into: Ceiling = new Map()
  into.set('agorot', START.agorot)
  for (const [key, value] of Object.entries(START.personality)) into.set(`personality.${key}`, value)
  for (const [key, value] of Object.entries(START.redHeart)) into.set(`redHeart.${key}`, value)
  for (const [key, value] of Object.entries(START.wellbeing)) into.set(`wellbeing.${key}`, value)
  for (const [who, rel] of Object.entries(START.relationships)) {
    for (const [axis, value] of Object.entries(rel as Record<string, number>)) into.set(`rel.${who}.${axis}`, value)
  }
  // both gauge blocks open at fifty, not at zero
  for (const [key, value] of Object.entries(START.army as Record<string, unknown>)) {
    if (typeof value === 'number') into.set(`army.${key}`, value)
  }
  for (const [key, value] of Object.entries(START.institution as Record<string, unknown>)) {
    if (typeof value === 'number') into.set(`institution.${key}`, value)
  }
  return into
}

type Ask = { chapter: string; where: string; counter: string; min: number }

const readCondition = (condition: Condition | undefined, chapter: string, where: string, into: Ask[]): void => {
  if (!condition) return
  const c = condition as Record<string, unknown>
  for (const key of ['all', 'any', 'none'] as const) {
    const parts = c[key]
    if (Array.isArray(parts)) for (const part of parts) readCondition(part as Condition, chapter, where, into)
  }
  const want = (counter: string, min: unknown) => {
    if (typeof min === 'number') into.push({ chapter, where, counter, min })
  }
  want('agorot', c.minAgorot)
  const rh = c.redHeartAbove as { key?: string; min?: number } | undefined
  if (rh?.key) want(`redHeart.${rh.key}`, rh.min)
  const rel = c.relationship as { who?: string; axis?: string; min?: number } | undefined
  if (rel?.who && rel.axis) want(`rel.${rel.who}.${rel.axis}`, rel.min)
  const bond = c.bond as { who?: string; min?: number } | undefined
  if (bond?.who) want(`rel.${bond.who}.bond`, bond.min)
  const pa = c.personalityAbove as { key?: string; min?: number } | undefined
  if (pa?.key) want(`personality.${pa.key}`, pa.min)
  const wa = c.wellbeingAbove as { key?: string; min?: number } | undefined
  if (wa?.key) want(`wellbeing.${wa.key}`, wa.min)
  const aa = c.armyAbove as { key?: string; min?: number } | undefined
  if (aa?.key) want(`army.${aa.key}`, aa.min)
  const ia = c.institutionAbove as { key?: string; min?: number } | undefined
  if (ia?.key) want(`institution.${ia.key}`, ia.min)
}

const sweep = (): { rows: Map<string, Ceiling>; asks: Ask[] } => {
  const running = seed()
  const rows = new Map<string, Ceiling>()
  const asks: Ask[] = []
  for (const chapter of ORDER) {
    const def = CHAPTERS.find((c) => c.id === chapter)
    if (def?.entry) {
      try {
        addRawEvents(running, def.entry(START) ?? [])
      } catch {
        /* an entry that needs a real state is not a money source we can read */
      }
    }
    for (const beat of (eraFor(chapter) as { beats?: readonly unknown[] }).beats ?? []) {
      const actions = (beat as { do?: unknown }).do
      for (const action of Array.isArray(actions) ? actions : []) {
        const a = action as { a?: string; events?: readonly unknown[] }
        if (a.a === 'events' && Array.isArray(a.events)) addRawEvents(running, a.events)
      }
    }
    // the gate games inside the life pay at runtime; the table says how much at most (budget-audit's fourth door)
    bump(running, 'agorot', activityCeiling(chapter))
    for (const act of ACTIVITIES) {
      if (!activityChapters(act).includes(chapter)) continue
      if (act.rel) bump(running, `rel.${act.rel.who}.${act.rel.axis}`, act.rel.delta)
      if (act.redHeart) bump(running, `redHeart.${act.redHeart.key}`, act.redHeart.delta)
      if (act.personality) bump(running, `personality.${act.personality.key}`, act.personality.delta)
    }
    for (const id of conversationsIn(chapter)) {
      for (const effect of effectsOf(id)) addEffect(running, effect)
      for (const branch of DIALOGUE[id]?.branches ?? []) {
        readCondition(branch.when, chapter, `dialogue:${id}`, asks)
        for (const choice of branch.choices ?? []) readCondition(choice.when, chapter, `dialogue:${id}/${choice.id}`, asks)
      }
    }
    for (const scene of ALL_SCENES) {
      for (const exit of scene.exits) {
        const byEra = (exit as { needsByEra?: Record<string, Condition | null> }).needsByEra ?? {}
        const needs = chapter in byEra ? byEra[chapter] : (exit as { needs?: Condition }).needs
        readCondition(needs ?? undefined, chapter, `${scene.id}/exit:${exit.id}`, asks)
      }
      for (const spot of scene.hotspots) {
        if (inEra(spot, chapter)) readCondition((spot as { when?: Condition }).when, chapter, `${scene.id}/hotspot:${spot.id}`, asks)
      }
    }
    rows.set(chapter, new Map(running))
  }
  return { rows, asks }
}

describe('מה שאי אפשר להשיג', () => {
  const { rows, asks } = sweep()

  it('אין שער שמבקש מספר שהמשחק לא יכול לייצר', () => {
    const impossible = asks
      .filter((ask) => ask.min > (rows.get(ask.chapter)?.get(ask.counter) ?? 0))
      .map((ask) => `[${ask.chapter}] ${ask.where}: ${ask.counter} ≥ ${ask.min}, ceiling ${rows.get(ask.chapter)?.get(ask.counter) ?? 0}`)
    expect(impossible).toEqual([])
  })

  /**
   * The specific one this suite was written for. Efi's three gates — 1997 `max: 45`,
   * 1999 `max: 44`, 2000 `min: 45` — only mean anything against a baseline near fifty,
   * and he had none: no entry in `emptyState.relationships` at all, so he opened every
   * life as a stranger at trust zero. This asserts both halves of the repair, because
   * either one alone leaves the 2000 branch shut.
   */
  it('לאפי יש בסיס, ולשמירה על ההבטחה יש מחיר הפוך', () => {
    expect(START.relationships.efi?.trust).toBeGreaterThan(0)
    const galil = rows.get('1993-galil')?.get('rel.efi.trust') ?? 0
    expect(galil).toBeGreaterThanOrEqual(45)
    // and the baseline alone must NOT be enough: drifting apart has to stay the default
    expect(START.relationships.efi?.trust ?? 0).toBeLessThan(45)
  })

  /**
   * הפחית — money the boy has and cannot spend. `minAgorot` reads the pocket only;
   * `savings` is a second pocket no condition in the vocabulary can see. The objective
   * line and the map arrow used to add the two together and send him to a counter that
   * would refuse him.
   */
  it('היעד של א4 לא שולח לקיוסק כשהכסף עוד בפחית', () => {
    const inTin = { ...START, savings: SHIRT_PRICE, agorot: 0, flags: {} } as LifeState
    expect(goalA4(inTin)).toBe('bedroom')
    expect(objectiveA4(inTin, 'street')).toContain('בפחית')

    const inHand = { ...START, savings: 0, agorot: SHIRT_PRICE, flags: {} } as LifeState
    expect(goalA4(inHand)).toBe('kiosk')
    expect(objectiveA4(inHand, 'street')).toContain('לרפי')

    const split = { ...START, savings: 1200, agorot: SHIRT_PRICE - 1200, flags: {} } as LifeState
    expect(goalA4(split)).toBe('bedroom')
  })
})
