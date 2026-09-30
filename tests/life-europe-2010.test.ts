import { describe, expect, it } from 'vitest'

import { DIALOGUE } from '@/lib/life/content/dialogue'
import { eraFor } from '@/lib/life/content/era'
import { emptyState } from '@/lib/life/events'
import { BACKDROP } from '@/lib/life/runtime/art'
import type { LifeState } from '@/lib/life/types'
import { EUROPE_EXITS, EUROPE_ROOMS } from '@/lib/life/world/city2027/europe2010'
import { SCENE, exitInEra, needsFor } from '@/lib/life/world/scenes'
import { meets } from '@/lib/life/world/types'
import { closureFor } from '@/lib/life/world/worldline'

/**
 * טדי ואירופה 2010 — מקומות, לא כרטיסים (27.9.2026).
 *
 * Whoever took the seat in Oli's car stands in the Teddy away end; the one trip of the summer
 * of 2010 is an evening in the city it was spent on. These tests hold the three claims that
 * make that true: the rooms are reachable in their chapters (and only by the life that chose
 * them), the chosen city decides the room, and nothing said in them states a result.
 */

const IDENTITY = { name: 'פוגי', sex: 'boy', birthYear: 1978 } as const
const withFlags = (flags: Record<string, boolean | string>): LifeState => {
  const base = emptyState(IDENTITY, 1986)
  return { ...base, flags: { ...base.flags, ...flags } }
}

const AWAY = ['teddy', 'away-salzburg', 'away-lisbon', 'away-lyon'] as const

describe('the four away ends are measured rooms', () => {
  it('each has its painting, a band inside the frame and a ramp a floor can have', () => {
    expect(EUROPE_ROOMS.map((room) => room.id).sort()).toEqual([...AWAY].sort())
    for (const room of EUROPE_ROOMS) {
      expect(BACKDROP as readonly string[], room.id).toContain(room.art)
      expect(room.band.far).toBeLessThan(room.band.near)
      expect(room.band.near).toBeLessThanOrEqual(1)
      expect(room.size.near / room.size.far, `${room.id} ramp`).toBeLessThanOrEqual(1.8)
      expect(room.metre).toBeCloseTo(room.size.near / 1.3, 3)
    }
  })

  it('every door out lands on a spawn the other room has, and none is a trap', () => {
    for (const room of EUROPE_ROOMS) {
      expect(room.exits.length, room.id).toBeGreaterThan(0)
      for (const exit of room.exits) {
        expect(SCENE[exit.to as keyof typeof SCENE].spawns[exit.spawn], `${room.id} → ${exit.to}:${exit.spawn}`).toBeDefined()
        // the lock belongs to one chapter; in every other year the door simply opens
        expect(exit.needs).toBeUndefined()
      }
    }
  })
})

describe('reachable in their chapter — and only by the life that chose them', () => {
  it('Teddy is on the road of 2010-teddy, whoever you are when it starts', () => {
    expect(closureFor('2010-teddy', {}).rooms.has('teddy')).toBe(true)
  })

  it('Salzburg is a choice inside the summer itself', () => {
    expect(closureFor('2010-qualify', {}).rooms.has('away-salzburg')).toBe(true)
  })

  it('Lisbon and Lyon need the summer to have chosen them — the flag that crosses chapters', () => {
    const chose = closureFor('2010-anthem', { 'life:trip2010': true })
    expect(chose.rooms.has('away-lisbon')).toBe(true)
    expect(chose.rooms.has('away-lyon')).toBe(true)
    const stayed = closureFor('2010-anthem', {})
    expect(stayed.rooms.has('away-lisbon')).toBe(false)
    // (a beat's `travel` is a door to the closure whatever its `when` — Lyon's bus is held by
    // the beat test below, not here)
  })
})

describe('the chosen city decides the room', () => {
  const doors = (chapter: string) => EUROPE_EXITS.filter((d) => d.from === 'port-europe' && exitInEra(d.exit, chapter))
  const open = (chapter: string, state: LifeState) => doors(chapter).filter((d) => meets(state, d.exit.when)).map((d) => d.exit.to)

  it('the summer: Salzburg only for whoever spent the trip there', () => {
    expect(open('2010-qualify', withFlags({ 'c10:tripTo': 'salzburg' }))).toEqual(['away-salzburg'])
    expect(open('2010-qualify', withFlags({ 'c10:tripTo': 'lisbon' }))).toEqual([])
  })

  it('the autumn: Lisbon before the first night, Lyon after Benfica, nothing for the living room', () => {
    expect(open('2010-anthem', withFlags({ 'life:trip2010': 'lisbon' }))).toEqual(['away-lisbon'])
    expect(open('2010-anthem', withFlags({ 'life:trip2010': 'lisbon', 'c10:debut': true }))).toEqual([])
    expect(open('2010-anthem', withFlags({ 'life:trip2010': 'lyon' }))).toEqual([])
    // Lyon has no door of its own (one doorway, one room a year): the bus takes him on
    expect(open('2010-anthem', withFlags({ 'life:trip2010': 'lyon', 'c10:benfica': true }))).toEqual([])
    const bus = eraFor('2010-anthem').beats!.find((beat) => beat.id === 'c10-port-lyon')!
    expect(bus.at).toBe('port-europe')
    expect(bus.do.at(-1)).toEqual({ a: 'travel', to: 'away-lyon', spawn: 'start' })
    expect(meets(withFlags({ 'life:trip2010': 'lyon', 'c10:lyonFlown': true }), bus.when)).toBe(true)
    expect(meets(withFlags({ 'life:trip2010': 'lisbon', 'c10:lyonFlown': true }), bus.when)).toBe(false)
    for (const city of ['gelsenkirchen', 'host', 'none', 'salzburg']) {
      expect(open('2010-anthem', withFlags({ 'life:trip2010': city, 'c10:benfica': true })), city).toEqual([])
    }
  })

  it('the flight home waits for the evening he flew out for', () => {
    const home = SCENE['port-europe'].exits.find((e) => e.id === 'home')!
    expect(meets(withFlags({ 'life:trip2010': 'lisbon' }), needsFor(home, '2010-anthem'))).toBe(false)
    expect(meets(withFlags({ 'life:trip2010': 'lisbon', 'c10:debut': true }), needsFor(home, '2010-anthem'))).toBe(true)
    expect(meets(withFlags({}), needsFor(home, '2010-anthem'))).toBe(true)
  })

  it('the road to Teddy is for whoever took the seat; the living room stays where it was', () => {
    const road = eraFor('2010-teddy').beats!.find((b) => b.id === 'd10-road')!
    const base = { 'd10:plan': true }
    expect(meets(withFlags({ ...base, 'd10:mode': 'venue' }), road.when)).toBe(true)
    expect(meets(withFlags({ ...base, 'd10:mode': 'home' }), road.when)).toBe(false)
    expect(road.do.at(-1)).toEqual({ a: 'travel', to: 'teddy', spawn: 'start' })
  })
})

describe('no line in the away ends states a result', () => {
  const IDS = [
    'd10-away', 'd10-spot', 'd10-cloth', 'd10-scarf', 'd10-title-away', 'd10-call-away', 'd10-chaos', 'd10-back', 'd10-car',
    'c10-salz-find', 'c10-salz-rail', 'c10-salz-banner', 'c10-salz-call', 'c10-salz-after',
    'c10-lis-find', 'c10-lis-rail', 'c10-lis-banner', 'c10-lis-anthem', 'c10-debut-away',
    'c10-lyon-find', 'c10-lyon-cloth', 'c10-lyon-scarf', 'c10-lyon-away',
  ]
  const texts = (id: string): string[] => {
    const conv = DIALOGUE[id]
    expect(conv, id).toBeDefined()
    return conv!.branches.flatMap((branch) => [
      ...branch.lines.map((line) => line.text),
      ...(branch.choices ?? []).flatMap((choice) => [choice.text, ...(choice.then ?? []).flatMap((e) => ('text' in e && typeof e.text === 'string' ? [e.text] : []))]),
    ])
  }

  it('no score, no minute, no scorer — the archive card is the only place a fact is printed', () => {
    for (const id of IDS) {
      for (const text of texts(id)) {
        expect(text, id).not.toMatch(/\d/)
        expect(text, id).not.toMatch(/(^|\s)בדק(ה|ת) |כבש|שער של|תוצאה של/)
      }
    }
  })

  it('Salzburg never says which leg it was, and never records attendance at the summer anchor', () => {
    for (const id of ['c10-salz-find', 'c10-salz-rail', 'c10-salz-call', 'c10-salz-after']) {
      for (const text of texts(id)) expect(text).not.toMatch(/הלוך|גומלין|חוץ ראשון|משחק ראשון|משחק שני/)
      const effects = DIALOGUE[id]!.branches.flatMap((b) => [...(b.then ?? []), ...(b.choices ?? []).flatMap((c) => c.then ?? [])])
      expect(effects.some((e) => e.e === 'attend' || e.e === 'presence'), id).toBe(false)
    }
  })

  it('whoever is on the phone in the away end is marked remote, not standing there', () => {
    expect(DIALOGUE['d10-title-away']!.remote).toMatchObject({ 'קובי': 'phone' })
    expect(DIALOGUE['c10-lyon-away']!.remote).toMatchObject({ 'עמית': 'phone', 'אופיר': 'phone' })
    expect(DIALOGUE['c10-lis-anthem']!.remote).toMatchObject({ 'עמית': 'phone' })
    // the conversations lived in the room carry no `where` tag — he IS there
    for (const id of ['d10-title-away', 'd10-call-away', 'd10-chaos', 'd10-back', 'c10-lis-anthem', 'c10-lyon-away']) {
      expect(DIALOGUE[id]!.where, id).toBeUndefined()
    }
  })
})
