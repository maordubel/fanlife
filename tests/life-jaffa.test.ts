import { describe, expect, it } from 'vitest'

import { CHAPTERS } from '@/lib/life/content/chapters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { eraFor } from '@/lib/life/content/era'
import type { Conversation, Effect } from '@/lib/life/content/script'
import { BACKDROP } from '@/lib/life/runtime/art'
import { JAFFA_EXITS, JAFFA_ROOMS } from '@/lib/life/world/city2027/jaffa'
import { yearOfChapter } from '@/lib/life/world/homes'
import { ALL_SCENES, SCENE, artFor, exitInEra, inEra, sceneIn } from '@/lib/life/world/scenes'
import type { Condition } from '@/lib/life/world/types'
import { closureFor } from '@/lib/life/world/worldline'
import type { LocationId } from '@/lib/life/types'

/**
 * העיר שעל הים — יפו והטיילת (27.9.2026, `world/city2027/jaffa.ts`).
 *
 * Maor: *"כדי להרחיב את חווית השחקן ולהרגיש שהוא באמת מטייל בעיר."* Four approved paintings
 * became four rooms, and five chapters meet people in them. What these tests hold:
 *   · the rooms are measured floors (rule 52/55) on paintings that exist;
 *   · the one door in from the city is the Allenby archway, only after Ussishkin is gone;
 *   · every chapter that sends the player there can actually walk there (rule 75);
 *   · every scene written there raises a flag, and something else reads it.
 */

const ROOMS = ['promenade', 'jaffa', 'jaffa-alley', 'jaffa-boulevard'] as const
const CITY_CHAPTERS = ['2017-distance', '2021-suitcase', '2023-visit', '2024-lina', '2025-interview'] as const

const effectsOf = (conversation: Conversation): Effect[] =>
  conversation.branches.flatMap((branch) => [...(branch.then ?? []), ...(branch.choices ?? []).flatMap((choice) => choice.then)])

const setsFlag = (conversation: Conversation, flag: string) =>
  effectsOf(conversation).some((e) => (e.e === 'flag' || e.e === 'flagValue') && e.flag === flag)

function readsFlag(condition: Condition | undefined, flag: string): boolean {
  if (!condition) return false
  if (condition.flag === flag || condition.notFlag === flag || condition.flagIs?.flag === flag) return true
  const nested = [...(condition.all ?? []), ...(condition.any ?? []), ...(condition.none ?? [])] as Condition[]
  return nested.some((c) => readsFlag(c, flag))
}
const branchReads = (conversation: Conversation, flag: string) => conversation.branches.some((b) => readsFlag(b.when, flag))

describe('the rooms are floors measured on their own paintings', () => {
  it('registers four rooms, each on a painting in BACKDROP, with a ramp no lens exceeds', () => {
    expect(JAFFA_ROOMS.map((r) => r.id).sort()).toEqual([...ROOMS].sort())
    for (const room of ALL_SCENES.filter((s) => (ROOMS as readonly string[]).includes(s.id))) {
      for (const floor of [room, ...(room.repaints ?? [])]) {
        expect((BACKDROP as readonly string[]).includes(floor.art), `${room.id}: ${floor.art}`).toBe(true)
        // the ramp is the size ratio across the band — near over far — and stays at or under 1.8
        const ramp = floor.size.near / floor.size.far
        expect(ramp, `${room.id}/${floor.art} ramp`).toBeLessThanOrEqual(1.8)
        expect(ramp).toBeGreaterThan(1)
        // size is the child's 1.30 m on the metre of the near line (the rooms2000 convention)
        expect(floor.size.near / floor.metre, `${room.id}/${floor.art} size vs metre`).toBeCloseTo(1.3, 1)
        for (const [name, spawn] of Object.entries(floor.spawns)) {
          expect(spawn.y, `${room.id}.${name}`).toBeGreaterThanOrEqual(floor.band.far)
          expect(spawn.y, `${room.id}.${name}`).toBeLessThanOrEqual(floor.band.near)
        }
      }
    }
  })

  it('paints the promenade at dusk only on the two evenings, and Jaffa by day', () => {
    for (const chapter of CHAPTERS.map((c) => c.id)) {
      const expected = chapter === '2021-suitcase' || chapter === '2023-visit' ? 'promenadeDusk' : 'promenade'
      expect(artFor(SCENE.promenade, chapter), chapter).toBe(expected)
    }
    expect(artFor(SCENE.jaffa, '2024-lina')).toBe('jaffa00')
    expect(artFor(SCENE['jaffa-alley'], '2025-interview')).toBe('jaffaAlleyCafe')
    expect(artFor(SCENE['jaffa-boulevard'], '2024-lina')).toBe('jaffaBoulevard')
  })

  it('never lands a door on a spawn the other room does not have, on either painting', () => {
    for (const room of JAFFA_ROOMS) {
      for (const chapter of CITY_CHAPTERS) {
        const here = sceneIn(room, chapter)
        for (const exit of here.exits) {
          const there = sceneIn(SCENE[exit.to as keyof typeof SCENE], chapter)
          expect(there.spawns[exit.spawn], `${room.id}.${exit.id} → ${exit.to}.${exit.spawn} in ${chapter}`).toBeDefined()
          // and no spawn of this room stands inside one of its doors (rule 41's infinite bounce)
          for (const [name, spawn] of Object.entries(here.spawns)) {
            const inside = spawn.x >= exit.x && spawn.x <= exit.x + exit.w && spawn.y >= exit.y && spawn.y <= exit.y + exit.h
            expect(inside, `${room.id}.${name} inside ${exit.id} (${chapter})`).toBe(false)
          }
        }
      }
    }
  })
})

describe('the door in: the Allenby archway, once the hall is gone', () => {
  const door = JAFFA_EXITS.find((e) => e.from === 'allenby' && e.exit.to === 'promenade')!

  it('is the archway, and only from 2011', () => {
    expect(door).toBeDefined()
    const allenby = SCENE.allenby
    expect(allenby.exits.some((e) => e.id === door.exit.id && e.to === 'promenade')).toBe(true)
    for (const chapter of CHAPTERS.map((c) => c.id)) {
      expect(exitInEra(door.exit, chapter), chapter).toBe(yearOfChapter(chapter) >= 2011)
    }
  })

  it('shares the archway with no door that is open in the same year', () => {
    for (const chapter of CHAPTERS.map((c) => c.id).filter((id) => yearOfChapter(id) >= 2011)) {
      const clash = SCENE.allenby.exits.filter(
        (e) => e !== door.exit && exitInEra(e, chapter) && Math.abs(e.x - door.exit.x) < 0.03,
      )
      expect(clash.map((e) => e.id), chapter).toEqual([])
    }
  })
})

describe('every chapter that sends the player to the sea can walk there', () => {
  const needs: Record<(typeof CITY_CHAPTERS)[number], { seed: Record<string, boolean>; rooms: LocationId[]; endings: string[] }> = {
    '2017-distance': { seed: { 'life:distance': true }, rooms: ['promenade'], endings: ['returned', 'visit', 'away'] },
    '2021-suitcase': { seed: { 'life:distance': true }, rooms: ['promenade'], endings: ['move', 'prepare', 'stay'] },
    '2023-visit': { seed: { 'life:abroad': true }, rooms: ['promenade', 'jaffa', 'jaffa-alley'], endings: ['family', 'friends', 'overbooked'] },
    '2024-lina': {
      seed: { 'life:international': true, 'life:intl:met': true },
      rooms: ['promenade', 'jaffa', 'jaffa-alley', 'jaffa-boulevard'],
      endings: ['understood', 'paused', 'bounded'],
    },
    '2025-interview': { seed: { 'own:route:JOURNALIST:apex': true }, rooms: ['promenade', 'jaffa', 'jaffa-alley'], endings: ['asked', 'team', 'declined'] },
  }

  for (const chapter of CITY_CHAPTERS) {
    it(`${chapter}: the rooms are on its closure, and every ending is attainable`, () => {
      const { seed, rooms, endings } = needs[chapter]
      const closure = closureFor(chapter, seed)
      for (const room of rooms) expect(closure.rooms.has(room), `${chapter} reaches ${room}`).toBe(true)
      for (const ending of endings) expect(closure.endings.has(ending), `${chapter} ending ${ending}`).toBe(true)
      // the endings exist on the chapter's own record
      for (const ending of endings) expect(eraFor(chapter).endings[ending], `${chapter}.${ending}`).toBeDefined()
    })
  }

  it('moves 2024-lina to the morning — the painting of Jaffa is a day, and so is the call', () => {
    const lina = CHAPTERS.find((c) => c.id === '2024-lina')!
    expect(lina.minute).toBeLessThan(9 * 60)
  })
})

describe('each scene raises a flag, and something later reads it', () => {
  it('2017 → 2021: the walk with Keren on the promenade is what she says on the last evening', () => {
    expect(setsFlag(DIALOGUE['k-life']!, 'life:distance:sea')).toBe(true)
    expect(branchReads(DIALOGUE['x-sea']!, 'life:distance:sea')).toBe(true)
  })

  it('2021 → 2023: what went into the suitcase is what Kobi asks about at sunset', () => {
    expect(setsFlag(DIALOGUE['x-sea']!, 'life:abroad:carry')).toBe(true)
    expect(branchReads(DIALOGUE['x-sunset']!, 'life:abroad:carry')).toBe(true)
    // and each value he could have written has its own answer
    const values = new Set(
      effectsOf(DIALOGUE['x-sea']!).flatMap((e) => (e.e === 'flagValue' && e.flag === 'life:abroad:carry' ? [String(e.value)] : [])),
    )
    expect([...values].sort()).toEqual(['none', 'photo', 'sand'])
  })

  it('2024: the photograph under the clock tower is in the conversation that follows it', () => {
    expect(setsFlag(DIALOGUE['jaffa-photo']!, 'life:lina:photo')).toBe(true)
    expect(branchReads(DIALOGUE['i-talk']!, 'life:lina:photo')).toBe(true)
    // where you met is remembered by Lina — in person or on the phone
    const remembered = (id: string) =>
      effectsOf(DIALOGUE[id]!).flatMap((e) => (e.e === 'remember' && e.who === 'lina' ? [e.eventId] : []))
    expect(remembered('i-talk')).toContain('i04-jaffa')
    expect(remembered('i-call-now')).toContain('i04-phone')
  })

  it('2025: the choice of place is read by the goal, and the item on the table by the checklist', () => {
    expect(setsFlag(DIALOGUE['j-where']!, 'life:interview:at')).toBe(true)
    expect(setsFlag(DIALOGUE['j-archive']!, 'life:interview:item')).toBe(true)
    // FACT / HEARD / OPINION — three items, each kept, and all three go on to the same three questions
    const archive = DIALOGUE['j-archive']!.branches[0]!.choices!
    expect(archive.map((c) => c.id)).toEqual(['fact', 'heard', 'opinion'])
    for (const choice of archive) expect(choice.then.some((e) => e.e === 'goto' && e.node === 'j-asked'), choice.id).toBe(true)
  })

  it('2023: the evening you chose happens, and the person remembers it', () => {
    for (const id of ['x-sunset', 'x-jaffa']) {
      expect(setsFlag(DIALOGUE[id]!, 'x:evening'), id).toBe(true)
      expect(effectsOf(DIALOGUE[id]!).some((e) => e.e === 'remember'), id).toBe(true)
    }
  })
})

describe('the people stand on the paving, not in a door and not in each other', () => {
  it('every actor staged in these rooms is inside its band, clear of every door, and apart', () => {
    for (const chapter of CITY_CHAPTERS) {
      for (const id of ROOMS) {
        const room = sceneIn(SCENE[id], chapter)
        const here = room.actors.filter((a) => inEra(a, chapter))
        for (const actor of here) {
          expect(actor.y, `${chapter} ${actor.id} y`).toBeGreaterThanOrEqual(room.band.far)
          expect(actor.y, `${chapter} ${actor.id} y`).toBeLessThanOrEqual(room.band.near)
          for (const exit of room.exits) {
            const inside = actor.x >= exit.x && actor.x <= exit.x + exit.w && actor.y >= exit.y && actor.y <= exit.y + exit.h
            expect(inside, `${chapter} ${actor.id} in ${exit.id}`).toBe(false)
          }
        }
        // two people at the same time are at least 0.1 of the frame apart
        const together = new Map<string, typeof here>()
        for (const actor of here) {
          const key = JSON.stringify(actor.when ?? null)
          together.set(key, [...(together.get(key) ?? []), actor])
        }
        for (const group of together.values()) {
          for (let i = 0; i < group.length; i++)
            for (let j = i + 1; j < group.length; j++) {
              expect(Math.abs(group[i]!.x - group[j]!.x), `${chapter} ${group[i]!.id} / ${group[j]!.id}`).toBeGreaterThanOrEqual(0.1)
            }
        }
      }
    }
  })
})
