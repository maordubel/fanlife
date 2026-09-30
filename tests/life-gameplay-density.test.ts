import { describe, expect, it } from 'vitest'

import { CHAPTERS } from '@/lib/life/content/chapters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { eraFor } from '@/lib/life/content/era'
import { GESTURES, GESTURE_PREFIX } from '@/lib/life/content/gestures'
import { RIDES, RIDE_PREFIX } from '@/lib/life/content/passages'
import type { Effect } from '@/lib/life/content/script'
import { STORY_CHORES, STORY_CHORE_PREFIX } from '@/lib/life/content/storyChores'
import { ALL_SCENES, sceneIn, type EraTag, type Verb } from '@/lib/life/world/scenes'

/**
 * צפיפות משחק — Director V3 §5, §13, §14 (`life-gameplay-density`).
 *
 * *"דיאלוג תומך במשחק. הוא לא המשחק."* A chapter whose every main beat is a box, a button
 * and a flag is an interactive story, not a game. This suite counts what a chapter asks of
 * the HANDS, read off the data the runtime plays:
 *
 *   · a thing in a room that is taken, entered, sat on, played, bought or walked out of —
 *     `verb` on a hotspot tagged for THAT chapter (a shared wall does not count);
 *   · a played interaction a conversation opens — a story chore (by its shape: carry,
 *     serve, collect, sweep), a ride, the pitch, penalties, a hoop, a coin, a Toto slip, a
 *     shop, a gate activity, a gesture of the prologue;
 *   · a directed match a beat plays.
 *
 * The paid jobs of `gigs.ts` are left out of the count on purpose: they stand in every
 * chapter of a decade, and a chapter is not made physical by the afternoon job rotation.
 *
 * §13 B asks for at least two DIFFERENT physical verbs per story segment, and since the V3
 * pass of 25.9.2026 that holds for every chapter of 1983–2000 (1996 is the Definition of
 * Done, §17: "at least three actions, not three sentences").
 */

const HANDS: ReadonlySet<Verb> = new Set<Verb>(['take', 'enter', 'exit', 'sit', 'play', 'buy', 'hold'])
const PLAYED: ReadonlySet<Effect['e']> = new Set<Effect['e']>(['minigame', 'pitch', 'penalty', 'hoops', 'coin', 'toto', 'shop', 'mechanic'])

/** tagged for this chapter by name — not `'*'`, not a decade, not a stage */
function ownEra(era: EraTag | undefined, chapter: string): boolean {
  if (!era) return false
  return Array.isArray(era) ? (era as readonly string[]).includes(chapter) : era === chapter
}

/** what a played effect is, as a verb: a chore by its shape, a ride, a gesture — and a paid job is `job` */
function playedKind(effect: Effect): string {
  if (effect.e !== 'minigame') return effect.e
  const id = effect.id
  if (id.startsWith(`chore:${STORY_CHORE_PREFIX}`)) return `chore:${STORY_CHORES[id.slice(`chore:${STORY_CHORE_PREFIX}`.length)]?.shape.mode ?? '?'}`
  if (id.startsWith('chore:')) return 'job'
  if (id.startsWith(RIDE_PREFIX)) return 'ride'
  if (id.startsWith(GESTURE_PREFIX)) return `gesture:${GESTURES[id.slice(GESTURE_PREFIX.length)]?.verb ?? '?'}`
  return id
}

function reach(roots: readonly string[]): { played: Set<string>; kinds: Set<string> } {
  const played = new Set<string>()
  const kinds = new Set<string>()
  const seen = new Set<string>()
  const queue = [...roots]
  while (queue.length) {
    const id = queue.shift() as string
    if (seen.has(id)) continue
    seen.add(id)
    for (const branch of DIALOGUE[id]?.branches ?? []) {
      const effects = [...(branch.then ?? []), ...(branch.choices ?? []).flatMap((choice) => choice.then)]
      for (const effect of effects) {
        if (effect.e === 'goto') queue.push(effect.node)
        if (effect.e === 'minigame' && effect.id.startsWith(GESTURE_PREFIX)) queue.push(GESTURES[effect.id.slice(GESTURE_PREFIX.length)]?.next ?? '')
        if (PLAYED.has(effect.e)) {
          played.add(effect.e === 'minigame' ? `minigame:${effect.id}` : effect.e)
          kinds.add(playedKind(effect))
        }
      }
    }
  }
  return { played, kinds }
}

function density(chapter: string): { verbs: Set<string>; played: Set<string>; kinds: Set<string>; matches: number } {
  const verbs = new Set<string>()
  const roots: string[] = []
  for (const base of ALL_SCENES) {
    const room = sceneIn(base, chapter)
    for (const spot of room.hotspots) {
      if (!ownEra(spot.era, chapter)) continue
      if (HANDS.has(spot.verb)) verbs.add(spot.verb)
      roots.push(spot.act)
    }
    for (const actor of room.actors) if (actor.talk && ownEra(actor.era, chapter)) roots.push(actor.talk)
  }
  let matches = 0
  for (const beat of eraFor(chapter).beats ?? []) {
    for (const action of beat.do) {
      if (action.a === 'talk') roots.push(action.conversation)
      if (action.a === 'match') matches += 1
    }
  }
  const { played, kinds } = reach(roots)
  return { verbs, played, kinds, matches }
}

/** every physical verb a chapter asks for, the paid jobs aside */
function physical(chapter: string): Set<string> {
  const { verbs, kinds, matches } = density(chapter)
  const out = new Set<string>([...verbs, ...[...kinds].filter((kind) => kind !== 'job')])
  if (matches > 0) out.add('match')
  return out
}

/** 1983–2000: Stage A's six days after the prologue, the final of 1986, and Stage B to the double */
const V3_CHAPTERS = [
  'a2-alley', 'a3-hall', 'a4-shirt', 'a5-first', 'a6-radio', 'a7-week', '1986',
  '1990', '1991', '1993-cup', '1993-galil', '1995-sinai', '1996-army', '1997-basket',
  '1998-laces', '1999-basket', '1999-cup', '2000-title', '2000-double',
  // (delta 90, LIFE 90-D) Stage C's feature quests: what adult Pugi does, not what he says he did
  '2002-europe', '2006-home', '2007-table', '2007-registered', '2007-key', '2010-cup', '2010-teddy',
]

describe('a chapter asks something of the hands, not only of the eyes', () => {
  it('knows every chapter it counts', () => {
    const ids = new Set(CHAPTERS.map((chapter) => chapter.id))
    for (const chapter of V3_CHAPTERS) expect(ids.has(chapter), chapter).toBe(true)
  })

  for (const chapter of V3_CHAPTERS) {
    it(`${chapter}: at least two different physical verbs (V3 §13 B)`, () => {
      const verbs = physical(chapter)
      expect(verbs.size, `${chapter}: ${[...verbs].join(', ')}`).toBeGreaterThanOrEqual(2)
    })
  }

  it('1996 rides the road and packs the bag with the hands', () => {
    const { verbs, played } = density('1996-army')
    expect(played.has('minigame:ride:1997')).toBe(true)
    for (const verb of ['take', 'enter', 'exit', 'sit']) expect(verbs.has(verb), verb).toBe(true)
    expect(verbs.size).toBeGreaterThanOrEqual(3)
  })

  /** the played interaction each chapter was rebuilt around (Director V3 §12's table) */
  const ANCHOR: Record<string, readonly string[]> = {
    'a2-alley': ['minigame:football'],
    'a4-shirt': ['minigame:chore:story:bottles-85', 'minigame:chore:story:crates-85'],
    'a6-radio': ['minigame:ride:radio-86'],
    '1991': ['minigame:chore:story:homework-91'],
    '1993-cup': ['minigame:chore:story:crates-93', 'minigame:chore:story:banner-93'],
    '1993-galil': ['minigame:chore:story:chairs-93'],
    '1997-basket': ['minigame:chore:story:crates-97'],
    '1998-laces': ['minigame:chore:story:papers-98'],
    '1999-basket': ['minigame:chore:story:queue-99'],
    '1999-cup': ['minigame:ride:liron-99', 'minigame:chore:story:minibus-99'],
    '2000-double': ['minigame:chore:story:shift-00', 'minigame:chore:story:banner-00', 'minigame:chore:story:uss-00'],
    // delta 90 — the head count, Liron's day, the founding (count, people, kit, notes), the banner
    '2002-europe': ['minigame:chore:story:heads-02', 'minigame:chore:story:heads-02-lost'],
    '2006-home': ['minigame:chore:story:fold-04', 'minigame:chore:story:orders-06', 'minigame:chore:story:boxes-06'],
    '2007-table': ['minigame:chore:story:count-07', 'minigame:chore:story:returns-07'],
    '2007-key': ['minigame:chore:story:kit-07', 'minigame:chore:story:labels-07'],
    '2010-cup': ['minigame:chore:story:banner-10'],
  }
  for (const [chapter, needs] of Object.entries(ANCHOR)) {
    it(`${chapter}: ${needs.join(', ')}`, () => {
      const { played } = density(chapter)
      for (const need of needs) expect(played.has(need), need).toBe(true)
    })
  }

  it('the places that decide are places: A3 finds a way in, A5 pushes the turnstile, 1986 has ways in with the body', () => {
    expect(density('a3-hall').verbs).toEqual(new Set(['enter', 'sit', 'play']))
    expect([...density('a5-first').verbs]).toEqual(expect.arrayContaining(['take', 'enter', 'hold']))
    expect([...density('a7-week').verbs]).toEqual(expect.arrayContaining(['take', 'enter', 'sit']))
    expect([...density('1986').verbs]).toEqual(expect.arrayContaining(['buy', 'enter']))
    expect([...density('1995-sinai').verbs]).toEqual(expect.arrayContaining(['play', 'take']))
    expect([...density('2000-double').verbs]).toEqual(expect.arrayContaining(['sit', 'take', 'buy', 'enter']))
  })

  it('every playable Stage B chapter from 1990 to 2000 has at least one thing to do with the hands', () => {
    const thin: string[] = []
    for (const chapter of CHAPTERS) {
      const year = Number(chapter.id.slice(0, 4))
      if (!chapter.playable || !(year >= 1990 && year <= 2000)) continue
      const { verbs, played, matches } = density(chapter.id)
      if (verbs.size + played.size + matches === 0) thin.push(chapter.id)
    }
    expect(thin, 'chapters that are only boxes and buttons').toEqual([])
  })
})

/**
 * 1983 — "לשמור קצר; תגובה/אחיזה/קהל". The prologue is conversations played over one
 * painting, so it is measured on the conversation graph itself: the longest run of choices
 * a path through it asks for with nothing done by the hand in between (a gesture resets it).
 */
describe('1983 — the memory is held by the hand, not read', () => {
  function longestStreak(id: string, streak: number, seen: Set<string>): number {
    if (seen.has(id)) return streak
    const conversation = DIALOGUE[id]
    if (!conversation) return streak
    const next = new Set(seen).add(id)
    let best = streak
    for (const branch of conversation.branches) {
      const here = branch.choices?.length ? streak + 1 : streak
      best = Math.max(best, here)
      const paths = branch.choices?.length ? branch.choices.map((choice) => choice.then) : [branch.then ?? []]
      for (const effects of paths) {
        for (const effect of effects) {
          if (effect.e === 'goto') best = Math.max(best, longestStreak(effect.node, here, next))
          if (effect.e === 'minigame' && effect.id.startsWith(GESTURE_PREFIX)) {
            const gesture = GESTURES[effect.id.slice(GESTURE_PREFIX.length)]
            if (gesture) best = Math.max(best, longestStreak(gesture.next, 0, next))
          }
        }
      }
    }
    return best
  }

  it('no path through 1.6.1983 asks for more than two answers in a row', () => {
    expect(longestStreak('a1-1983', 0, new Set())).toBeLessThanOrEqual(2)
  })

  it('the grip and the red thing on the concrete are done with the hand, and both left alone still go on', () => {
    const { kinds } = reach(['a1-1983'])
    expect([...kinds]).toEqual(expect.arrayContaining(['gesture:hold', 'gesture:take']))
    for (const gesture of Object.values(GESTURES)) {
      expect(DIALOGUE[gesture.next], `${gesture.id} → ${gesture.next}`).toBeDefined()
      expect(gesture.autoMs, `${gesture.id} waits for nobody for ever`).toBeGreaterThan(0)
      expect(gesture.ignored.length + gesture.done.length).toBeGreaterThan(0)
    }
  })

  it('every ride, story chore and gesture a conversation opens exists', () => {
    for (const conversation of Object.values(DIALOGUE)) {
      for (const branch of conversation.branches) {
        for (const effect of [...(branch.then ?? []), ...(branch.choices ?? []).flatMap((choice) => choice.then)]) {
          if (effect.e !== 'minigame') continue
          if (effect.id.startsWith(`chore:${STORY_CHORE_PREFIX}`)) expect(STORY_CHORES[effect.id.slice(`chore:${STORY_CHORE_PREFIX}`.length)], `${conversation.id}: ${effect.id}`).toBeDefined()
          if (effect.id.startsWith(RIDE_PREFIX)) expect(RIDES[effect.id.slice(RIDE_PREFIX.length)], `${conversation.id}: ${effect.id}`).toBeDefined()
          if (effect.id.startsWith(GESTURE_PREFIX)) expect(GESTURES[effect.id.slice(GESTURE_PREFIX.length)], `${conversation.id}: ${effect.id}`).toBeDefined()
        }
      }
    }
  })
})
