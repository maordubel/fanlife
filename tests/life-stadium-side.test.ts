import { describe, expect, it } from 'vitest'

import { CALL_1993 } from '@/lib/life/content/chapter1993cup'
import { MENORA_2025, MENORA_HOW } from '@/lib/life/content/chapter2024home'
import { TERRACE_CREDIT, TERRACE_HANDOFF } from '@/lib/life/content/chapterCareer'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { eraFor } from '@/lib/life/content/era'
import { RIDES } from '@/lib/life/content/passages'
import type { Conversation, Effect } from '@/lib/life/content/script'
import { BACKDROP } from '@/lib/life/runtime/art'
import { STADIUM_EXITS, STADIUM_ROOMS } from '@/lib/life/world/city2027/stadiumSide'
import { SCENE, arrivalFor, exitInEra, inEra, sceneIn } from '@/lib/life/world/scenes'

/**
 * ליד המגרש, והאולם הגדול (27.9.2026) — four paintings that had no room, each made a room for
 * the chapter whose script walks through it (`world/city2027/stadiumSide.ts`):
 *   menora (2024-home) · gate5-stand (2001-terrace, 2012-terrace) · undercroft (1990) · bus-stop (1993-cup)
 * and `ussExtDusk` as the arrival card of Ussishkin on the nights it plays.
 */

const ROOM = (id: string) => STADIUM_ROOMS.find((room) => room.id === id)!
const text = (conversation: Conversation) => JSON.stringify(conversation)

function effectsOf(conversation: Conversation): Effect[] {
  const out: Effect[] = []
  for (const branch of conversation.branches) {
    out.push(...((branch.then ?? []) as Effect[]))
    for (const choice of branch.choices ?? []) out.push(...((choice.then ?? []) as Effect[]))
  }
  return out
}

describe('the rooms — their paintings, their floors, their ways out', () => {
  const expected: Record<string, string> = { menora: 'menoraSeats', 'gate5-stand': 'gate5Stand', undercroft: 'undercroft', 'bus-stop': 'busStopDan' }

  it('builds one room per painting, on the painting', () => {
    expect(STADIUM_ROOMS.map((room) => room.id).sort()).toEqual(Object.keys(expected).sort())
    for (const room of STADIUM_ROOMS) {
      expect(room.art, room.id).toBe(expected[room.id])
      expect((BACKDROP as readonly string[]).includes(room.art), room.art).toBe(true)
      expect(SCENE[room.id as keyof typeof SCENE], room.id).toBe(room)
    }
  })

  it('keeps every ramp inside what a lens does (rule 50), and a metre that belongs to the near line', () => {
    for (const room of STADIUM_ROOMS) {
      expect(room.band.far, room.id).toBeLessThan(room.band.near)
      expect(room.size.near / room.size.far, room.id).toBeLessThanOrEqual(1.8)
      // `size = 1.3 × metre(y)` — the rooms2000 convention
      expect(room.size.near / room.metre, room.id).toBeCloseTo(1.3, 2)
    }
  })

  it('stands every spawn on the floor and outside every door', () => {
    for (const room of STADIUM_ROOMS) {
      for (const [name, spawn] of Object.entries(room.spawns)) {
        expect(spawn.y, `${room.id}/${name}`).toBeGreaterThanOrEqual(room.band.far)
        expect(spawn.y, `${room.id}/${name}`).toBeLessThanOrEqual(room.band.near)
        for (const exit of room.exits) {
          const inside = spawn.x >= exit.x && spawn.x <= exit.x + exit.w && spawn.y >= exit.y && spawn.y <= exit.y + exit.h
          expect(inside, `${room.id}/${name} inside ${exit.id}`).toBe(false)
        }
      }
    }
  })

  it('gives every room a lit way back to a room that exists', () => {
    for (const room of STADIUM_ROOMS) {
      expect(room.exits.length, room.id).toBeGreaterThan(0)
      for (const exit of room.exits) {
        expect(exit.light, `${room.id}/${exit.id}`).toBeTruthy()
        expect(SCENE[exit.to as keyof typeof SCENE], `${room.id} → ${exit.to}`).toBeTruthy()
      }
    }
  })

  it('points every hotspot and every talking person at a conversation that exists', () => {
    for (const room of STADIUM_ROOMS) {
      for (const spot of room.hotspots) expect(DIALOGUE[spot.act], `${room.id}/${spot.id} → ${spot.act}`).toBeTruthy()
      for (const actor of room.actors) if (actor.talk) expect(DIALOGUE[actor.talk], `${room.id}/${actor.id}`).toBeTruthy()
    }
  })
})

describe('the doors in — only in the chapters that walk through them', () => {
  const doors: Array<[string, string, readonly string[]]> = [
    ['gate5', 'gate5-stand', ['2001-terrace', '2012-terrace']],
    ['bloomfield-outside', 'undercroft', ['1990']],
    ['ussishkin-outside', 'bus-stop', ['1993-cup']],
  ]

  it('opens each door in its chapters and in no other', () => {
    for (const [from, to, chapters] of doors) {
      const door = STADIUM_EXITS.find((entry) => entry.from === from && entry.exit.to === to)!
      expect(door, `${from} → ${to}`).toBeTruthy()
      for (const chapter of chapters) expect(exitInEra(door.exit, chapter), `${from} → ${to} in ${chapter}`).toBe(true)
      for (const other of ['1986', '1991', '1996-army', '2000-double', '2010-anthem', '2024-home']) {
        if (chapters.includes(other)) continue
        expect(exitInEra(door.exit, other), `${from} → ${to} in ${other}`).toBe(false)
      }
      // and it is on the room it opens from (the merge loop in `scenes.ts`)
      expect(SCENE[from as keyof typeof SCENE].exits).toContain(door.exit)
    }
  })

  it('reaches the big arena by the ride, which lands in it — and by one door, only on that night', () => {
    const doors = STADIUM_EXITS.filter((entry) => entry.exit.to === 'menora')
    expect(doors.map((entry) => entry.from)).toEqual(['route'])
    expect(exitInEra(doors[0]!.exit, '2024-home')).toBe(true)
    expect(exitInEra(doors[0]!.exit, '2025-eurocup')).toBe(false)
    expect(JSON.stringify(doors[0]!.exit.when)).toContain('life:menora:2025')
    const ride = RIDES['menora-25']!
    expect(ride.art).toBe('menoraSeats')
    expect(ride.land.mapId).toBe('menora')
    expect(ride.flags).toContain('h24:arrived')
  })
})

describe('2024-home · S5 — the first night is a room', () => {
  it('finds the seat, looks for faces, and sits — and sitting takes him home', () => {
    const menora = ROOM('menora')
    const acts = menora.hotspots.filter((spot) => inEra(spot, '2024-home')).map((spot) => spot.act)
    expect(acts).toEqual(expect.arrayContaining(['h24-find-seat', 'h24-faces', 'h24-inside']))
    const inside = effectsOf(DIALOGUE['h24-inside']!)
    expect(inside.filter((e) => e.e === 'travel').every((e) => e.e === 'travel' && e.to === 'home')).toBe(true)
    expect(inside.some((e) => e.e === 'flag' && e.flag === 'h24:inside')).toBe(true)
    expect(inside.some((e) => e.e === 'flagValue' && e.flag === MENORA_HOW)).toBe(true)
    // the chapter's own ending flow is unchanged: home, Kobi, `went`
    expect(text(DIALOGUE['h24-after']!)).toContain(MENORA_HOW)
    expect(effectsOf(DIALOGUE['h24-after']!).filter((e) => e.e === 'ending').every((e) => e.e === 'ending' && e.id === 'went')).toBe(true)
    expect(MENORA_2025).toBe('life:menora:2025')
  })

  it('sends the chapter to the arena once he chose to go, until he sits', () => {
    const goal = eraFor('2024-home').goal!
    const base = { flags: { 'h24:rumor': true, 'h24:board': true, 'h24:ask': true, 'h24:small': true, 'h24:concern': 'rights', 'h24:ticket': 'moved', 'h24:night': true } }
    expect(goal({ ...base, flags: { ...base.flags, [MENORA_2025]: 'went' } } as never)).toBe('menora')
    expect(goal({ ...base, flags: { ...base.flags, [MENORA_2025]: 'went', 'h24:inside': true } } as never)).toBeNull()
  })

  it('lets no real person speak in the arena (rule of edition 2)', () => {
    for (const id of ['h24-find-seat', 'h24-faces', 'h24-inside', 'h24-efi-menora']) {
      for (const branch of DIALOGUE[id]!.branches) for (const line of branch.lines ?? []) expect([null, 'פוגי', 'אפי'], `${id}: ${line.who}`).toContain(line.who)
    }
  })
})

describe('the gate-5 stairs — 2001 prep and gate, 2012 handoff and test', () => {
  it('turns the 2001 role into work under the stand: three jobs, and the proof when the gate opens', () => {
    const first = effectsOf(DIALOGUE['t-first']!)
    // the commit writes no proof and no ending for the two roles; the fan ending stays where it was
    expect(first.filter((e) => e.e === 'proof')).toEqual([])
    expect(first.filter((e) => e.e === 'ending').map((e) => (e as { id: string }).id)).toEqual(['fan'])
    const credit = effectsOf(DIALOGUE['t-credit']!)
    expect(credit.some((e) => e.e === 'proof' && e.proofId === 'leadership_proof:{chapter}:gear')).toBe(true)
    expect(credit.some((e) => e.e === 'proof' && e.proofId === 'leadership_proof:{chapter}:volunteers')).toBe(true)
    const endings = new Set(credit.filter((e) => e.e === 'ending').map((e) => (e as { id: string }).id))
    for (const id of endings) expect(eraFor('2001-terrace').endings[id], id).toBeTruthy()
    expect([...endings].sort()).toEqual(['blamed', 'gear', 'late', 'people'])
    const tasks = ROOM('gate5-stand').hotspots.filter((spot) => inEra(spot, '2001-terrace') && spot.act.startsWith('t-task-'))
    expect(tasks.map((spot) => spot.act).sort()).toEqual(['t-task-banner', 't-task-flags', 't-task-rope'])
  })

  it('remembers what he said in 2001 in 2012, and what he did in 2012 in 2024', () => {
    expect(text(DIALOGUE['t-credit']!)).toContain(TERRACE_CREDIT)
    expect(text(DIALOGUE['t-hand']!)).toContain(TERRACE_CREDIT)
    expect(text(DIALOGUE['t-test']!)).toContain(TERRACE_HANDOFF)
    expect(text(DIALOGUE['t-lead']!)).toContain(TERRACE_HANDOFF)
  })

  it('tests the delegation on the stairs before the day closes, and every close is a declared ending', () => {
    const beats = eraFor('2012-terrace').beats ?? []
    const endings = beats.flatMap((beat) => beat.do.filter((a) => a.a === 'ending').map((a) => (a as { id: string }).id))
    expect(endings.sort()).toEqual(['small', 'stepped', 'trust'])
    for (const id of [...endings, 'handed']) expect(eraFor('2012-terrace').endings[id], id).toBeTruthy()
    // the delegated proof is written only by letting Yevgeny's decision stand
    const test = DIALOGUE['t-test']!.branches[0]!.choices!
    for (const choice of test) {
      const delegated = (choice.then ?? []).some((e) => e.e === 'proof' && e.proofId === 'leadership_proof:{chapter}:delegated')
      expect(delegated, choice.id).toBe(choice.id === 'let-trust')
    }
  })
})

describe('1990 under the stand · 1993 the Dan stop', () => {
  it('lets the rumour from under the stand reach the gate and the steward', () => {
    expect(text(DIALOGUE['uc-radio-1990']!)).toContain('uc:carry')
    expect(text(DIALOGUE['kobi-gate-1990']!)).toContain('uc:carry')
    expect(text(DIALOGUE['steward-1990']!)).toContain('uc:half')
    // it is information about the ground, never about the other match: no number in it
    for (const id of ['uc-radio-1990', 'uc-cart-1990', 'uc-lanes-1990']) {
      for (const branch of DIALOGUE[id]!.branches) for (const line of branch.lines ?? []) expect(line.text, id).not.toMatch(/\d/)
    }
  })

  it('boards the 1993 bus from the stop, and brings the phone call home at midnight', () => {
    const stop = ROOM('bus-stop')
    expect(stop.hotspots.filter((spot) => inEra(spot, '1993-cup')).map((spot) => spot.act)).toEqual(
      expect.arrayContaining(['bs-papers-1993', 'bs-phone-1993', 'bs-wait-1993', 'bus-1993']),
    )
    expect(text(DIALOGUE['bs-phone-1993']!)).toContain(CALL_1993)
    expect(text(DIALOGUE['close-1993']!)).toContain(CALL_1993)
  })
})

describe('ussExtDusk — the card of Ussishkin on the nights it plays', () => {
  const outside = SCENE['ussishkin-outside']

  it('plays on match evenings and not on afternoons, and the room stays the empty painting', () => {
    for (const chapter of ['a3-hall', '1991', '1993-galil', '1997-basket', '1999-basket']) {
      expect(arrivalFor(outside, chapter)?.art, chapter).toBe('ussExtDusk')
      expect(sceneIn(outside, chapter).art, chapter).toBe('ussExt')
    }
    for (const chapter of ['1993-cup', '2000-double']) expect(arrivalFor(outside, chapter)?.art ?? null, chapter).not.toBe('ussExtDusk')
  })
})
