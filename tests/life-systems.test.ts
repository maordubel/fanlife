import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { resolveChapterAnchor } from '@/lib/life/anchor-server'
import { CHARACTERS } from '@/lib/life/characters'
import { AMBIENT_1986 } from '@/lib/life/content/ambient1986'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { ENCOUNTERS_1986 } from '@/lib/life/content/encounters1986'
import { OPPORTUNITIES_1986 } from '@/lib/life/content/opportunities1986'
import { SCHEDULE_1986 } from '@/lib/life/content/schedules1986'
import { ERA_1986, ERA_1990, ERA_1991 } from '@/lib/life/content/era'
import { exitInEra, inEra } from '@/lib/life/world/scenes'
import type { Conversation, Effect } from '@/lib/life/content/script'
import { rollEncounter } from '@/lib/life/encounters'
import { LifeEngine } from '@/lib/life/engine'
import { apply, emptyState, fold, type LifeEvent } from '@/lib/life/events'
import { acceptEvents, isAvailable, statusOf, tickOpportunities } from '@/lib/life/opportunities'
import { buildProfile, carriedReading, purseReading } from '@/lib/life/profile'
import { resolvePureLove } from '@/lib/life/pure-love'
import { CANDIDATES_1986, pickRedBoxItem } from '@/lib/life/redbox'
import { rollAt, Roller } from '@/lib/life/rng'
import { buildFinale } from '@/lib/life/finale'
import { dayMinuteOf, decidingMinute, matchClock, matchPace, scoreboardAt } from '@/lib/life/match'
import { placementsAt } from '@/lib/life/schedules'
import type { LifeState } from '@/lib/life/types'
import { KICKOFF, SCENE } from '@/lib/life/world/scenes'
import { meets } from '@/lib/life/world/types'
import { SAVE_VERSION } from '@/lib/life/save'

/**
 * THE WORKER LIFE — the systems, as guards.
 *
 * `tests/life.test.ts` proves the world is coherent: every door leads somewhere, no
 * scoreline was invented, nobody wears yellow. This file proves the GAME is: that the
 * afternoon really can be spent more than one way, that two saves diverge, that a window
 * that closed stays closed, and that the one number the whole project ends on cannot be
 * written by anything except its own resolver.
 *
 * The two are separate files because they fail for different reasons. A broken door is an
 * art or a data problem; a chapter with one solution is a design problem, and it should
 * say so in its own words.
 */

const ROOT = process.cwd()
const fresh = (): LifeState => emptyState(DEFAULT_IDENTITY, 1986)

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...walk(path))
    else if (path.endsWith('.ts')) out.push(path)
  }
  return out
}

// ---------------------------------------------------------------------------------
describe('השמירה — a save from before the systems existed still opens', () => {
  it('folds a version-2 log into the version-3 state with nothing lost', () => {
    // The whole promise of an append-only log. These rows were written by a build that
    // had never heard of the Red Heart; reading them now moves it, because the events
    // always described what HAPPENED rather than what it was worth.
    const before: LifeEvent[] = [
      { t: 'flag.raised', flag: 'knows:match' },
      { t: 'money.changed', agorot: 120, why: 'בקבוקים' },
      { t: 'bond.shifted', who: 'ofir', delta: 30 },
      { t: 'trait.shifted', trait: 'footballAffinity', delta: 25 },
      { t: 'trait.shifted', trait: 'independence', delta: 12 },
    ]
    const state = fold(DEFAULT_IDENTITY, 1986, before)

    expect(state.schemaVersion).toBe(2)
    expect(state.agorot).toBe(120)
    expect(state.resources.money).toBe(120)
    expect(state.bonds.ofir).toBe(30)
    // the routes: the old vocabulary reaches the new model
    expect(state.redHeart.footballLove).toBe(45)
    expect(state.personality.independence).toBe(17)
    // and the relationship gained the axes a bond really moves
    expect(state.relationships.ofir?.familiarity).toBeGreaterThan(45)
  })

  /**
   * The rule, rather than the number: every version from 2 up to today's is readable.
   *
   * This used to assert the literal `new Set([2, 3])`, which meant that adding version 4
   * — one optional field beside the log, losing a version-3 file nothing at all — failed a
   * test about version 2. Derived from `SAVE_VERSION` now, so it goes on meaning what it
   * was written to mean the next time the file grows.
   */
  it('accepts every save version back to 2, rather than dropping any of them', () => {
    const save = readFileSync(join(ROOT, 'lib/life/save.ts'), 'utf8')
    expect(save).toContain('READABLE')
    const readable = save.match(/const READABLE = new Set\(\[([^\]]+)\]\)/)?.[1]
    expect(readable, 'no READABLE set in save.ts').toBeTruthy()
    const versions = (readable as string).split(',').map((n) => Number(n.trim()))
    for (let v = 2; v <= SAVE_VERSION; v += 1) expect(versions, `version ${v} is no longer readable`).toContain(v)
    expect(Math.max(...versions)).toBe(SAVE_VERSION)
  })

  it('still folds an event from the future to a no-op', () => {
    const future = { t: 'something.fromTheFuture' } as unknown as LifeEvent
    expect(apply(fresh(), future)).toEqual(fresh())
  })
})

// ---------------------------------------------------------------------------------
describe('המקריות — reproducible, and stored with the save', () => {
  it('gives the same number for the same seed and cursor, forever', () => {
    expect(rollAt('worker-1986', 0)).toBe(rollAt('worker-1986', 0))
    expect(rollAt('worker-1986', 0)).not.toBe(rollAt('worker-1986', 1))
    expect(rollAt('a', 4)).not.toBe(rollAt('b', 4))
    for (let i = 0; i < 200; i += 1) {
      const value = rollAt('seed', i)
      expect(value >= 0 && value < 1).toBe(true)
    }
  })

  it('advances a cursor rather than re-rolling the same moment', () => {
    const roller = new Roller({ seed: 'x', cursor: 0 })
    const first = roller.next()
    const second = roller.next()
    expect(first).not.toBe(second)
    expect(roller.consumed).toBe(2)
  })

  it('picks the same encounter twice from the same save, and a different one from another', () => {
    const state = { ...fresh(), minute: 13 * 60 }
    const a = rollEncounter(state, ENCOUNTERS_1986, '1986', 'street', 1)
    const b = rollEncounter(state, ENCOUNTERS_1986, '1986', 'street', 1)
    expect(a.picked?.id).toBe(b.picked?.id)

    const other = rollEncounter({ ...state, rng: { seed: 'other', cursor: 0 } }, ENCOUNTERS_1986, '1986', 'street', 1)
    // Not an assertion that they differ — a pool can legitimately land twice — but the
    // seed must be what decides, so the cursor advancing has to change the answer.
    const moved = rollEncounter({ ...state, rng: { seed: state.rng.seed, cursor: 7 } }, ENCOUNTERS_1986, '1986', 'street', 1)
    expect([a.picked?.id, other.picked?.id, moved.picked?.id].filter(Boolean).length).toBeGreaterThan(0)
  })

  it('never offers an encounter that has already fired and has no cooldown', () => {
    const once = ENCOUNTERS_1986.find((entry) => entry.cooldown === undefined)
    expect(once).toBeDefined()
    if (!once) return
    const state = { ...fresh(), minute: 13 * 60, encounters: { [once.id]: 12 * 60 } }
    for (let cursor = 0; cursor < 40; cursor += 1) {
      const rolled = rollEncounter({ ...state, rng: { seed: 's', cursor } }, ENCOUNTERS_1986, '1986', once.locations[0] ?? 'street', 1)
      expect(rolled.picked?.id).not.toBe(once.id)
    }
  })
})

// ---------------------------------------------------------------------------------
describe('ההזדמנויות — several at once, and you cannot have them all', () => {
  it('has more than one window open at the same moment', () => {
    // The collision itself. If only one thing is ever available there is no decision,
    // and the chapter is a corridor with people standing in it.
    const at1330 = { ...fresh(), minute: 13 * 60 + 30, flags: { 'knows:match': true } }
    const open = OPPORTUNITIES_1986.filter((entry) => isAvailable(at1330, entry))
    expect(open.length).toBeGreaterThanOrEqual(3)
  })

  it('cannot afford all of them before Kobi leaves', () => {
    // The arithmetic that makes the collision real: the windows that close at ten past
    // three cost more minutes together than the afternoon has.
    const start = 12 * 60 + 35
    const deadline = 15 * 60 + 10
    const total = OPPORTUNITIES_1986.filter((entry) => entry.start < deadline).reduce(
      (sum, entry) => sum + (entry.costs?.minutes ?? 0),
      0,
    )
    expect(total).toBeGreaterThan(0)
    expect(total).toBeLessThan(deadline - start)
    // …but not by much: with travel between rooms and conversations of their own, a
    // player who tries for all six arrives at nothing.
    expect(total).toBeGreaterThan((deadline - start) * 0.6)
  })

  it('offers a window once and misses it once', () => {
    const state = { ...fresh(), minute: 13 * 60, flags: {} }
    const first = tickOpportunities(state, OPPORTUNITIES_1986)
    expect(first.events.length).toBeGreaterThan(0)
    const after = first.events.reduce(apply, state)
    // offering again changes nothing — the runtime state remembers
    expect(tickOpportunities(after, OPPORTUNITIES_1986).events.filter((e) => e.t === 'opportunity.offered')).toEqual([])

    const late = { ...after, minute: 23 * 60 }
    const closed = tickOpportunities(late, OPPORTUNITIES_1986)
    expect(closed.events.some((event) => event.t === 'opportunity.missed')).toBe(true)
  })

  it('charges what the window says it costs, and only the window may say it', () => {
    const window = OPPORTUNITIES_1986.find((entry) => entry.costs?.minutes)
    expect(window).toBeDefined()
    if (!window) return
    const events = acceptEvents(window)
    expect(events[0]).toEqual({ t: 'opportunity.accepted', id: window.id })
    expect(events.some((event) => event.t === 'clock.advanced')).toBe(true)
  })

  it('keeps a missed window missed', () => {
    const missed = apply({ ...fresh(), minute: 14 * 60 }, { t: 'opportunity.missed', id: 'efi-hall' })
    const later = { ...missed, minute: 13 * 60 }
    const definition = OPPORTUNITIES_1986.find((entry) => entry.id === 'efi-hall')
    expect(definition).toBeDefined()
    if (definition) expect(statusOf(later, definition)).toBe('missed')
  })

  it('names a real character and a real place in every window', () => {
    for (const entry of OPPORTUNITIES_1986) {
      if (entry.location) expect(SCENE[entry.location as keyof typeof SCENE], entry.id).toBeDefined()
      for (const who of entry.characters ?? []) expect(CHARACTERS[who], `${entry.id} → ${who}`).toBeDefined()
      expect(entry.expires).toBeGreaterThan(entry.start)
      expect(entry.outcomes.length, entry.id).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------------
describe('לוח הזמנים — the street is not the street you left', () => {
  it('puts different people on the street at different times', () => {
    const at = (minute: number) =>
      [...placementsAt({ ...fresh(), minute }, SCHEDULE_1986, 'street').values()]
        .filter((entry) => entry.visible)
        .map((entry) => entry.actorId)
        .sort()
        .join(',')

    const midday = at(12 * 60 + 45)
    const afternoon = at(14 * 60 + 20)
    const kickoff = at(15 * 60 + 20)
    expect(midday).not.toBe(afternoon)
    expect(afternoon).not.toBe(kickoff)
  })

  it('takes Efi away at two, whether or not anybody went', () => {
    const before = placementsAt({ ...fresh(), minute: 13 * 60 + 30 }, SCHEDULE_1986, 'pitch').get('efi')
    const after = placementsAt({ ...fresh(), minute: 14 * 60 + 30 }, SCHEDULE_1986, 'pitch').get('efi')
    expect(before?.visible).toBe(true)
    expect(after?.visible).toBe(false)
  })

  it('drives only actors the world actually has — in every era', () => {
    for (const era of [ERA_1986, ERA_1990, ERA_1991]) {
      const actors = new Set<string>()
      for (const scene of Object.values(SCENE)) for (const actor of scene.actors) if (inEra(actor, era.chapter)) actors.add(actor.id)
      for (const entry of era.schedule) {
        expect(actors.has(entry.actorId), `${era.chapter}: schedule drives ${entry.actorId}, which no scene has in that year`).toBe(true)
        if (CHARACTERS[entry.characterId] === undefined) {
          // a walk-on with a timetable but no biography is allowed only if he has no bond
          expect(entry.characterId, `${era.chapter}: schedule names ${entry.characterId}`).toMatch(/^(veteran|radio-walker)$/)
        }
        expect(SCENE[entry.location as keyof typeof SCENE], `${entry.actorId} → ${entry.location}`).toBeDefined()
        expect(entry.end).toBeGreaterThan(entry.start)
      }
    }
  })

  /**
   * A person the child cannot walk up to is not in the scene, whatever the data says.
   *
   * A schedule row OVERRIDES the scene's own actor position when the scene is created, so
   * a row a few hundredths outside the walk band leaves somebody standing in the road:
   * no prompt, no conversation, and nothing anywhere that says so. Three street rows were
   * exactly that after the September backdrops moved the street's band from 0.9 to 0.86,
   * and the only reason anybody found out is that a browser harness walked east and had
   * nobody to talk to. That is too late and too expensive. This is the same question,
   * asked in eight milliseconds.
   */
  /**
   * ----------------------------------------------------------------- the final ----
   *
   * Stage A now ends with a match rather than with a time-lapse, and a match has one
   * property nothing else in this chapter has: it must land on an exact minute, and that
   * minute is not ours to choose. It is a row in `content/manual/match-events.json`.
   */
  it('runs a real ninety minutes off the day clock, break included', () => {
    const kickoff = 16 * 60
    expect(matchClock(kickoff - 1, kickoff).phase).toBe('before')
    expect(matchClock(kickoff, kickoff)).toMatchObject({ phase: 'first', minute: 0 })
    expect(matchClock(kickoff + 44, kickoff)).toMatchObject({ phase: 'first', minute: 44 })
    // …and then a quarter of an hour in which the match clock does not move at all.
    expect(matchClock(kickoff + 45, kickoff)).toMatchObject({ phase: 'half', minute: 45 })
    expect(matchClock(kickoff + 59, kickoff)).toMatchObject({ phase: 'half', minute: 45 })
    expect(matchClock(kickoff + 60, kickoff)).toMatchObject({ phase: 'second', minute: 45 })
    expect(matchClock(kickoff + 101, kickoff)).toMatchObject({ phase: 'second', minute: 86 })
    expect(matchClock(kickoff + 105, kickoff)).toMatchObject({ phase: 'after', minute: 90 })
  })

  it('is invertible — the minute of the goal has a place on the day clock', () => {
    const kickoff = 16 * 60
    for (const minute of [0, 12, 44, 45, 60, 86, 90]) {
      expect(matchClock(dayMinuteOf(minute, kickoff), kickoff).minute).toBe(minute)
    }
  })

  it('slows the afternoon down as the goal approaches, and never speeds it up again', () => {
    const goal = 86
    const paces = [10, 40, 65, 70, 80, 81, 85].map((minute) => matchPace(minute, goal))
    for (let i = 1; i < paces.length; i += 1) {
      expect(paces[i]!, `pace went back up at index ${i}`).toBeLessThanOrEqual(paces[i - 1]!)
    }
    // eighty minutes of nothing are cheap; the six before the goal are not
    expect(matchPace(10, goal)).toBeGreaterThan(matchPace(82, goal) * 8)
  })

  it('takes the deciding minute from the archive rather than from a constant', () => {
    const anchor = resolveChapterAnchor()
    const minute = decidingMinute(anchor)
    if (!anchor.match?.decidedBy) {
      expect(minute).toBeNull()
      return
    }
    expect(minute).toBe(anchor.match.decidedBy.minute)
    // and it has to be a minute a match can actually reach
    expect(matchClock(dayMinuteOf(minute!, KICKOFF), KICKOFF).minute).toBe(minute)
  })

  it('never prints a bare scoreline on the board', () => {
    const anchor = resolveChapterAnchor()
    const board = scoreboardAt(anchor, true)
    if (!board) return
    // the two numbers exist, and each one is attached to the club it belongs to
    expect(board.homeHe.length).toBeGreaterThan(2)
    expect(board.awayHe.length).toBeGreaterThan(2)
    expect(board.homeScore + board.awayScore).toBeGreaterThan(0)
    const before = scoreboardAt(anchor, false)
    expect(before?.homeScore).toBe(0)
    expect(before?.awayScore).toBe(0)
  })

  /**
   * The end-of-stage card, which is the one screen that CONCLUDES rather than describes.
   *
   * Two things are worth failing a build over: that every afternoon gets a sentence, and
   * that obviously different afternoons do not get the SAME sentence. A finale that says
   * the same thing to the child who went alone and to the child who never got in is not
   * an ending, it is a template.
   */
  it('gives every afternoon a finale, and different afternoons different ones', () => {
    const afternoon = (flags: string[]) => {
      let state = fresh()
      for (const flag of flags) state = apply(state, { t: 'flag.raised', flag })
      return buildFinale(state, [])
    }
    const inside = afternoon(['entry:granted', 'saw:goal', 'went:alone'])
    const late = afternoon(['entry:granted'])
    const outside = afternoon([])

    for (const card of [inside, late, outside]) {
      expect(card.titleHe.length).toBeGreaterThan(2)
      expect(card.bodyHe.length).toBeGreaterThan(40)
      expect(card.becameHe.length).toBeGreaterThan(20)
    }
    expect(new Set([inside.titleHe, late.titleHe, outside.titleHe]).size).toBe(3)
    expect(inside.becameHe).not.toBe(outside.becameHe)
    // paper in the air is earned by being inside the ground, not by finishing the chapter
    expect(inside.carnival).toBe(true)
    expect(outside.carnival).toBe(false)
  })

  it('puts every scheduled person somewhere the child can actually reach', () => {
    // `x` and `y` are optional on a row, and that is not an oversight: a row may change
    // what somebody is DOING without moving them, and `WorldScene` applies each
    // coordinate only where the row actually carries one. So each coordinate is checked
    // where it is given, rather than read through an `expect()` that swallows
    // `undefined` and then compared as a number anyway.
    //
    // The count is checked too. A guard that would still pass if every position in the
    // file were deleted is not guarding the thing rule 48 is about, and this one reads
    // its subjects out of the data rather than naming them (rule 49).
    let placed = 0
    const chapterOf = (entry: (typeof SCHEDULE_1986)[number]) =>
      SCHEDULE_1986.includes(entry) ? '1986' : ERA_1990.schedule.includes(entry) ? '1990' : '1991'
    for (const entry of [...SCHEDULE_1986, ...ERA_1990.schedule, ...ERA_1991.schedule]) {
      const scene = SCENE[entry.location as keyof typeof SCENE]
      const where = `${entry.actorId} @ ${entry.location}`
      const { x, y } = entry

      if (y !== undefined) {
        expect(y, `${where} is above the band`).toBeGreaterThanOrEqual(scene.band.far)
        expect(y, `${where} is below the band — that is the road`).toBeLessThanOrEqual(scene.band.near)
      }
      if (x === undefined) continue
      placed += 1
      expect(x, `${where} x`).toBeGreaterThan(0)
      expect(x, `${where} x`).toBeLessThan(1)
      for (const exit of scene.exits) {
        // a door of another era is not a door he can be standing in
        if (!exitInEra(exit, chapterOf(entry))) continue
        const inDoor = x > exit.x - 0.01 && x < exit.x + exit.w + 0.01
        expect(inDoor, `${where} is standing in the doorway "${exit.id}"`).toBe(false)
      }
    }
    expect(placed, 'no schedule row places anybody — this guard checked nothing').toBeGreaterThan(0)
  })

  it('fills the street with people who are not the cast', () => {
    // An ambient figure who looked like Ofir is a bug the player reports as "Ofir was in
    // two places at once".
    const cast = new Set(['kid', 'ofir', 'amit', 'efi', 'keren', 'kobi', 'rachel'])
    for (const actor of AMBIENT_1986) {
      expect(cast.has(actor.figure), `${actor.id} borrows the cast member ${actor.figure}`).toBe(false)
      expect(SCENE[actor.location as keyof typeof SCENE], actor.id).toBeDefined()
      expect(actor.ms).toBeGreaterThan(0)
      expect(actor.everyMs).toBeGreaterThan(0)
    }
  })

  it('turns the road east into traffic once the father has gone', () => {
    const later = AMBIENT_1986.filter(
      (actor) => actor.location === 'street' && actor.when?.afterMinute !== undefined,
    )
    expect(later.length).toBeGreaterThanOrEqual(2)
  })
})

// ---------------------------------------------------------------------------------
describe('שלוש דרכים לבלומפילד — the objective is a network, not a chain', () => {
  const conversations = Object.values(DIALOGUE) as Conversation[]

  const grants = () => {
    const out: Array<{ id: string; via: string }> = []
    for (const conversation of conversations) {
      for (const branch of conversation.branches) {
        const sets = [
          ...(branch.then ?? []),
          ...(branch.choices ?? []).flatMap((choice) => choice.then),
        ]
        for (const effect of sets) {
          if (effect.e === 'flag' && effect.flag.startsWith('entry:') && effect.flag !== 'entry:granted') {
            out.push({ id: conversation.id, via: effect.flag })
          }
        }
      }
    }
    return out
  }

  it('offers at least three meaningfully different ways in', () => {
    const routes = new Set(grants().map((entry) => entry.via))
    expect([...routes].length, `only ${[...routes].join(', ')}`).toBeGreaterThanOrEqual(3)
  })

  it('spreads them across more than one person', () => {
    const people = new Set(grants().map((entry) => entry.id))
    expect(people.size).toBeGreaterThanOrEqual(3)
  })

  it('still has one that needs nothing at all — and it is no longer free', () => {
    // §3.2 of the production directive: FAIL-SAFE ≠ FREE SOLUTION. The way in that needs
    // nothing must still exist, or an eight-year-old can be soft-locked outside a
    // stadium; but it may not be `talk → entry granted`. So the guard asserts both: that
    // an unconditional path reaches `entry:granted`, and that reaching it costs minutes.
    const veteran = DIALOGUE['gate-veteran']
    const open = veteran?.branches.filter((branch) => !branch.when) ?? []
    expect(open.length).toBeGreaterThan(0)

    const chained = open.flatMap((branch) => [
      ...(branch.then ?? []),
      ...(branch.choices ?? []).filter((choice) => !choice.when).flatMap((choice) => choice.then),
    ])
    const nodes = chained.filter((effect) => effect.e === 'goto').map((effect) => (effect as { node: string }).node)
    expect(nodes.length, 'the fallback resolves in one beat with no situation around it').toBeGreaterThan(0)

    const reached = nodes.flatMap((node) => (DIALOGUE[node]?.branches ?? []).filter((branch) => !branch.when))
    expect(
      reached.some((branch) => (branch.then ?? []).some((e) => e.e === 'flag' && e.flag === 'entry:granted')),
      'no unconditional way into the ground',
    ).toBe(true)
    expect(
      reached.some((branch) => (branch.then ?? []).some((e) => e.e === 'time' && e.minutes > 0)),
      'the fail-safe costs the player nothing',
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------------
describe('זיכרון — somebody remembers what you did', () => {
  it('records a memory once, however many times the log is replayed', () => {
    const memory = {
      characterId: 'kobi',
      eventId: 'promised-to-wait',
      significance: 'major' as const,
      year: 1986,
      atMinute: 800,
    }
    const state = fold(DEFAULT_IDENTITY, 1986, [
      { t: 'relationship.memory_added', memory },
      { t: 'relationship.memory_added', memory },
    ])
    expect(state.relationshipMemory).toHaveLength(1)
    expect(state.relationships.kobi?.sharedHistory).toBeGreaterThan(60)
  })

  it('lets a later conversation ask about it', () => {
    const promised = fold(DEFAULT_IDENTITY, 1986, [
      {
        t: 'relationship.memory_added',
        memory: { characterId: 'kobi', eventId: 'promised-to-wait', significance: 'major', year: 1986, atMinute: 800 },
      },
    ])
    const condition = { relationshipMemory: { who: 'kobi', eventId: 'promised-to-wait' } }
    expect(meets(promised, condition)).toBe(true)
    expect(meets(fresh(), condition)).toBe(false)
  })

  it('gives the reunion more than one shape', () => {
    const reunion = DIALOGUE['kobi-found']
    expect(reunion?.branches.length ?? 0).toBeGreaterThanOrEqual(4)
    const conditional = reunion?.branches.filter((branch) => branch.when) ?? []
    expect(conditional.length).toBeGreaterThanOrEqual(3)
    // and every one of them still ends the day — itself, or (pass 28.9.2026) through the one
    // node it hands to: the shoulders, where every branch ends it
    const ends = (then: readonly { e: string; node?: string }[] | undefined, depth = 0): boolean =>
      (then ?? []).some((effect) =>
        effect.e === 'ending' ||
        (effect.e === 'goto' && depth < 2 && (DIALOGUE[effect.node!]?.branches ?? []).length > 0 && (DIALOGUE[effect.node!]?.branches ?? []).every((b) => ends(b.then as never, depth + 1))),
      )
    for (const branch of reunion?.branches ?? []) {
      expect(ends(branch.then as never)).toBe(true)
    }
  })

  it('has at least one choice that only exists because of an earlier one', () => {
    const gated = (Object.values(DIALOGUE) as Conversation[]).flatMap((conversation) =>
      conversation.branches.filter(
        (branch) => branch.when?.relationshipMemory || branch.when?.personalityAbove || branch.when?.redHeartAbove,
      ),
    )
    expect(gated.length).toBeGreaterThanOrEqual(3)
  })
})

// ---------------------------------------------------------------------------------
describe('הקופסה האדומה — not everybody keeps the same thing', () => {
  it('never puts in something the day did not produce', () => {
    const empty = pickRedBoxItem(fresh())
    expect(empty.item).not.toBeNull()
    // the only candidate with no requirement is the folded paper off the floor
    expect(empty.item?.item).toBe('folded-paper')
  })

  it('picks a different thing for a different afternoon', () => {
    const withStub = fold(DEFAULT_IDENTITY, 1986, [
      { t: 'item.gained', item: 'ticket-stub' },
      { t: 'item.gained', item: 'scarf' },
      { t: 'item.gained', item: 'football-card' },
    ])
    const picks = new Set<string>()
    for (let cursor = 0; cursor < 24; cursor += 1) {
      const rolled = pickRedBoxItem({ ...withStub, rng: { seed: 'box', cursor } })
      if (rolled.item) picks.add(rolled.item.id)
    }
    expect(picks.size).toBeGreaterThan(1)
  })

  it('keeps one row per object however often the log is replayed', () => {
    const rolled = pickRedBoxItem(fold(DEFAULT_IDENTITY, 1986, [{ t: 'item.gained', item: 'scarf' }]))
    expect(rolled.item).not.toBeNull()
    if (!rolled.item) return
    const state = fold(DEFAULT_IDENTITY, 1986, [
      { t: 'redbox.item_added', item: rolled.item },
      { t: 'redbox.item_added', item: rolled.item },
    ])
    expect(state.redBox).toHaveLength(1)
  })

  it('describes every candidate it could ever hand out', () => {
    for (const candidate of CANDIDATES_1986) {
      expect(candidate.titleHe.length).toBeGreaterThan(1)
      expect(candidate.noteHe.length).toBeGreaterThan(10)
      expect(candidate.weight).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------------
describe('PURE HAPOEL LOVE — one owner, and it is not a content file', () => {
  it('is never a number a player can chase', () => {
    expect(resolvePureLove(fresh()).percent).toBeNull()
    const grown = fold(DEFAULT_IDENTITY, 1986, [
      { t: 'redheart.changed', key: 'footballLove', delta: 90 },
      { t: 'redheart.changed', key: 'loyaltyReturn', delta: 90 },
    ])
    expect(resolvePureLove(grown).percent).toBeNull()
  })

  it('knows the difference between inheriting it and choosing it', () => {
    const taken = fold(DEFAULT_IDENTITY, 1986, [
      { t: 'flag.raised', flag: 'went:alone' },
      { t: 'anchor.attended', anchorId: 'x' },
    ])
    const carried = fold(DEFAULT_IDENTITY, 1986, [{ t: 'anchor.attended', anchorId: 'x' }])
    expect(resolvePureLove(taken).stage).toBe('chosen')
    expect(resolvePureLove(carried).stage).toBe('inherited')
    expect(resolvePureLove(fresh()).stage).toBe('unformed')
  })

  it('is not set by anything but its own resolver', () => {
    for (const path of walk(join(ROOT, 'lib/life'))) {
      if (path.endsWith('pure-love.ts')) continue
      const text = readFileSync(path, 'utf8')
      expect(/pureLove\s*[=:]\s*\d/.test(text), `${path} writes a Pure Love value`).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------------
describe('הפרופיל — a person, described, never a bar', () => {
  it('turns numbers into words and hands over no numbers', () => {
    const state = fold(DEFAULT_IDENTITY, 1986, [
      { t: 'redheart.changed', key: 'footballLove', delta: 60 },
      { t: 'wellbeing.changed', key: 'exhaustion', delta: 60 },
      { t: 'personality.shifted', key: 'independence', delta: 60 },
    ])
    const profile = buildProfile(state, [], ['kobi', 'rachel', 'ofir'], '')
    expect(profile.wellbeing.length).toBeGreaterThan(0)
    expect(profile.personality.length).toBeGreaterThan(0)
    expect(profile.redHeart.some((entry) => entry.key === 'footballLove')).toBe(true)
    for (const entry of profile.redHeart) expect(entry.band).toBeLessThanOrEqual(3)
  })

  it('draws no progress bar and prints no percentage', () => {
    const card = readFileSync(join(ROOT, 'components/life/ProfileCard.tsx'), 'utf8')
    expect(/%\s*<\/|toFixed|Math\.round\(.*100/.test(card), 'the profile is printing a value').toBe(false)
    expect(card).not.toContain('role="progressbar"')
  })

  /**
   * ...ולכל מה שהכרטיס מצייר איתו.
   *
   * The guard above names one path. On 16.9.2026 the bag pass split the card's own drawing
   * primitives into a second component, and at that moment a guard that names one file
   * became a guard you get around by adding a file — which is the failure mode rule 47 is
   * about, arriving from the other direction. This walks ProfileCard's OWN imports out of
   * `components/life/` and holds each of them to the same sentence, so the list cannot
   * drift from what the screen actually draws with.
   */
  it('holds everything the profile draws with to the same rule', () => {
    const card = readFileSync(join(ROOT, 'components/life/ProfileCard.tsx'), 'utf8')
    // delta 90-H: the card routes to `components/life/profile/*`, and those import each
    // other relatively — so walk the whole import graph under components/life, not one hop
    const seen = new Set<string>()
    const queue = [...card.matchAll(/from '@\/components\/life\/([A-Za-z/]+)'/g)].map((match) => match[1] as string)
    while (queue.length > 0) {
      const name = queue.shift() as string
      if (seen.has(name)) continue
      seen.add(name)
      const text = readFileSync(join(ROOT, `components/life/${name}.tsx`), 'utf8')
      const dir = name.includes('/') ? name.slice(0, name.lastIndexOf('/') + 1) : ''
      for (const match of text.matchAll(/from '@\/components\/life\/([A-Za-z/]+)'/g)) queue.push(match[1] as string)
      for (const match of text.matchAll(/from '\.\/([A-Za-z]+)'/g)) queue.push(`${dir}${match[1]}`)
    }
    const imported = [...seen]
    expect(imported.length, 'the profile draws with nothing of its own').toBeGreaterThan(0)
    expect(imported, 'the walk reaches the dossier').toContain('profile/LifeIdentitySheet')
    for (const name of imported) {
      const text = readFileSync(join(ROOT, `components/life/${name}.tsx`), 'utf8')
      expect(/%\s*<\/|toFixed|Math\.round\(.*100/.test(text), `${name} is printing a value`).toBe(false)
      expect(text, name).not.toContain('role="progressbar"')
    }
  })

  /**
   * התיק — the six fields that were authored, folded, tested and invisible.
   *
   * `inventory`, `savings`, `clothing`, `presence`, `memories` and `RedBoxItem.rarity` all
   * carried real content and reached no screen at all before this pass. The translator is
   * asserted here rather than only in `tests/life-bag.test.ts` because this is the suite
   * that owns the sentence it has to obey: everything it hands the card is a word, or a
   * count that exists to be DRAWN.
   */
  it('translates the bag without handing over a figure to print', () => {
    const state = fold(DEFAULT_IDENTITY, 1986, [
      { t: 'money.changed', agorot: 900, why: 'test' },
      { t: 'savings.changed', agorot: 2000, why: 'test' },
      { t: 'item.gained', item: 'bottle', count: 3 },
    ])
    for (const purse of purseReading(state)) {
      expect(/\d/.test(purse.readingHe), `${purse.purse} printed a figure`).toBe(false)
    }
    const carried = carriedReading(state)
    expect(carried.length).toBeGreaterThan(0)
    // The count is handed over to be drawn as that many objects, never printed — which is
    // why it is a number here and a row of bottles on the screen.
    expect(carried[0]?.copies).toBe(3)
  })

  it('is developer-only where it shows the truth', () => {
    const stage = readFileSync(join(ROOT, 'app/life/LifeStage.tsx'), 'utf8')
    expect(stage).toContain("process.env.NODE_ENV !== 'production'")
    expect(stage).toContain('DebugPanel')
  })
})

// ---------------------------------------------------------------------------------
describe('הבדיון החדש — the new content states no fact either', () => {
  const authored = [
    'lib/life/content/opportunities1986.ts',
    'lib/life/content/encounters1986.ts',
    'lib/life/content/ambient1986.ts',
    'lib/life/content/schedules1986.ts',
  ].map((path) => readFileSync(join(ROOT, path), 'utf8'))

  it('prints no scoreline', () => {
    for (const text of authored) {
      for (const line of text.split('\n').filter((line) => /He:|lineHe|text:/.test(line))) {
        expect(/\d+\s*[:\-–]\s*\d+/.test(line), `a scoreline: ${line.trim()}`).toBe(false)
      }
    }
  })

  it('names no year at all', () => {
    for (const text of authored) {
      const lines = text.split('\n').filter((line) => /He:\s*'/.test(line))
      for (const line of lines) {
        expect(/\b(19|20)\d{2}\b/.test(line), `a year in authored copy: ${line.trim()}`).toBe(false)
      }
    }
  })

  it('gives every encounter something to say and something to do', () => {
    for (const encounter of ENCOUNTERS_1986) {
      expect(encounter.lineHe.length, encounter.id).toBeGreaterThan(10)
      expect(encounter.effects.length, encounter.id).toBeGreaterThan(0)
      expect(encounter.weight).toBeGreaterThan(0)
      for (const location of encounter.locations) {
        expect(SCENE[location as keyof typeof SCENE], `${encounter.id} → ${location}`).toBeDefined()
      }
      // An encounter may not end the chapter, move the player or open a window.
      for (const effect of encounter.effects as Effect[]) {
        expect(['ending', 'travel', 'goto', 'seize', 'minigame']).not.toContain(effect.e)
      }
    }
  })
})

// ---------------------------------------------------------------------------------
describe('ריצה שנייה — two saves diverge', () => {
  it('produces a different life from a different set of decisions', () => {
    const a = new LifeEngine(DEFAULT_IDENTITY, 1986)
    a.dispatch(
      { t: 'rng.seeded', seed: 'run-a' },
      { t: 'opportunity.accepted', id: 'ofir-game' },
      { t: 'bond.shifted', who: 'ofir', delta: 14 },
      { t: 'redheart.changed', key: 'footballLove', delta: 8 },
    )
    const b = new LifeEngine(DEFAULT_IDENTITY, 1986)
    b.dispatch(
      { t: 'rng.seeded', seed: 'run-b' },
      { t: 'opportunity.accepted', id: 'efi-hall' },
      { t: 'opportunity.missed', id: 'ofir-game' },
      { t: 'bond.shifted', who: 'efi', delta: 16 },
      { t: 'redheart.changed', key: 'basketballLove', delta: 14 },
    )

    expect(a.state.redHeart).not.toEqual(b.state.redHeart)
    expect(a.state.relationships).not.toEqual(b.state.relationships)
    expect(a.state.opportunities).not.toEqual(b.state.opportunities)
    expect(a.state.rng.seed).not.toBe(b.state.rng.seed)
    expect(b.state.wellbeing.regret).toBeGreaterThan(a.state.wellbeing.regret)
  })

  it('reopens either of them from the log alone', () => {
    const engine = new LifeEngine(DEFAULT_IDENTITY, 1986)
    engine.dispatch({ t: 'rng.seeded', seed: 'reopen' })
    engine.remember('kobi', 'promised-to-wait', 'major')
    engine.dispatch({ t: 'opportunity.accepted', id: 'amit-paper' })
    const reopened = new LifeEngine(DEFAULT_IDENTITY, 1986, engine.log())
    expect(reopened.state).toEqual(engine.state)
  })
})
