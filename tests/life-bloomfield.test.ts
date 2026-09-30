import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CHAPTERS } from '@/lib/life/content/chapters'
import { eraFor } from '@/lib/life/content/era'
import { BACKDROP } from '@/lib/life/runtime/art'
import {
  ALL_SCENES,
  BLOOMFIELD_REOPENED,
  BLOOMFIELD_SHUT,
  SCENE,
  arrivalFor,
  artFor,
  bloomfieldRebuilt,
  exitInEra,
  needsFor,
  blockedFor,
  sceneIn,
} from '@/lib/life/world/scenes'

/**
 * בלומפילד לפי הלוח שלו — 21.9.2026.
 *
 * Until today every chapter after 2000 stood in front of the 1986 painting, while the two
 * sets painted for exactly those years sat in the folder wired to nothing, and two scenes
 * were set in a stadium that was a building site: `K03` in 2017 and `R02` in 2018 (the
 * script itself says *"בלומפילד המחודש, 2019"*). The ground closed in 2016 and reopened at
 * the end of August 2019; these tests hold the game to that calendar, and hold every
 * rebuilt room to the same floor rules as a room that was never rebuilt.
 */

const yearOf = (id: string) => Number(id.slice(0, 4))
const ids = CHAPTERS.map((c) => c.id)
const outside = SCENE['bloomfield-outside']
const BLOOMFIELD_ROOMS = ['bloomfield-outside', 'bloomfield-tunnel', 'bloomfield-inside', 'gate5'] as const

describe('the calendar — shut 2016–2018, rebuilt from 2019', () => {
  it('knows which chapters are shut, and they are exactly the years of the building site', () => {
    expect(BLOOMFIELD_SHUT.length).toBeGreaterThan(0)
    for (const id of ids) {
      const y = yearOf(id)
      expect(BLOOMFIELD_SHUT.includes(id), id).toBe(y >= 2016 && y <= 2018)
    }
  })

  it('locks every door that leads to the ground in those years, until it reopens — and says why', () => {
    for (const scene of ALL_SCENES) {
      for (const exit of scene.exits) {
        if (exit.to !== 'bloomfield-outside' || !BLOOMFIELD_ROOMS.every((room) => room !== scene.id)) continue
        for (const chapter of BLOOMFIELD_SHUT) {
          if (!exitInEra(exit, chapter)) continue
          expect(needsFor(exit, chapter), `${scene.id}.${exit.id} in ${chapter}`).toEqual({ flag: BLOOMFIELD_REOPENED })
          expect(blockedFor(exit, chapter), `${scene.id}.${exit.id} in ${chapter}`).toMatch(/שיפוץ/)
        }
      }
    }
  })

  it('sends no beat of a shut year to the ground — except the one after the jump to 2019', () => {
    for (const chapter of BLOOMFIELD_SHUT) {
      for (const beat of eraFor(chapter).beats ?? []) {
        const rooms = beat.at === undefined ? [] : Array.isArray(beat.at) ? beat.at : [beat.at]
        // a beat with a second room fires there; only a beat that can ONLY be at the ground is wrong
        if (!rooms.length || !rooms.every((room) => (BLOOMFIELD_ROOMS as readonly string[]).includes(room))) continue
        expect(JSON.stringify(beat.when ?? {}), `${chapter} beat ${beat.id} waits for Bloomfield at ${rooms.join(',')}`).toContain(BLOOMFIELD_REOPENED)
      }
    }
  })

  it('jumps 2018-return to 2019 before R02, keeping R01 done', () => {
    const jump = (eraFor('2018-return').beats ?? []).find((beat) => beat.id === 'r-reopen')
    expect(jump).toBeDefined()
    const events = jump!.do.flatMap((action) => (action.a === 'events' ? [...action.events] : []))
    const day = events.find((event) => event.t === 'day.entered')
    expect(day && day.t === 'day.entered' ? day.year : null).toBe(2019)
    const raised = events.flatMap((event) => (event.t === 'flag.raised' ? [event.flag] : []))
    // `day.entered` clears the day's flags, so R01's own flag must be raised again after it
    expect(raised).toEqual(expect.arrayContaining([BLOOMFIELD_REOPENED, 'r:back']))
    expect(events.findIndex((event) => event.t === 'day.entered')).toBeLessThan(events.findIndex((event) => event.t === 'flag.raised'))
    const signs = (eraFor('2018-return').beats ?? []).find((beat) => beat.id === 'r-signs')
    expect(JSON.stringify(signs?.when)).toContain(BLOOMFIELD_REOPENED)
  })

  it('does not anchor R02 to a documented match — the script forbids it (V4-BLOOMFIELD)', () => {
    const r02 = (eraFor('2018-return').beats ?? []).find((beat) => beat.id === 'r-reopen')
    const text = JSON.stringify(r02)
    expect(text).not.toMatch(/נתניה|26 ב|26\.8/)
  })
})

describe('the rebuilt ground — its own painting, its own floor', () => {
  it('shows the rebuilt ground from 2018-return on, and the old one never after it', () => {
    for (const id of ids) {
      const art = artFor(outside, id)
      if (bloomfieldRebuilt(id)) expect(art, id).toBe('bloomNewPlaza')
      else expect(art, id).not.toMatch(/^bloomNew/)
      expect(bloomfieldRebuilt(id), id).toBe(id === '2018-return' || yearOf(id) >= 2019)
    }
  })

  it('opens the rebuilt ground with its own first sight', () => {
    expect(arrivalFor(outside, '2023-quiet')?.art).toBe('bloomNewDay')
    expect(arrivalFor(outside, '2010-anthem')).toBeNull()
  })

  it('has no door into the old tunnel or to the old gate five once it is rebuilt', () => {
    for (const id of ids.filter(bloomfieldRebuilt)) {
      const room = sceneIn(outside, id)
      const doors = room.exits.filter((exit) => exitInEra(exit, id)).map((exit) => exit.to)
      expect(doors, id).not.toContain('bloomfield-tunnel')
      expect(doors, id).not.toContain('gate5')
    }
  })

  it('holds every repaint to the rules of a room: spawns on the floor, doors in the frame, a man a man tall', () => {
    for (const scene of ALL_SCENES) {
      for (const paint of scene.repaints ?? []) {
        const where = `${scene.id} → ${paint.art}`
        expect((BACKDROP as readonly string[]).includes(paint.art), `${where}: not a backdrop`).toBe(true)
        for (const key of [paint.art, `${paint.art}--sky`, `${paint.art}--ground`]) {
          expect(existsSync(join(process.cwd(), 'public/life/art', `${key}.webp`)), `${where}: ${key}.webp`).toBe(true)
        }
        expect(paint.band.far).toBeLessThan(paint.band.near)
        const implied = paint.size.near / paint.metre
        expect(implied, `${where}: size.near / metre`).toBeGreaterThan(1.2)
        expect(implied, `${where}: size.near / metre`).toBeLessThan(1.8)
        const chapter = ids.find((id) => paint.in(id))
        expect(chapter, `${where}: no chapter is painted this way`).toBeDefined()
        const room = sceneIn(scene, chapter!)
        for (const [name, spawn] of Object.entries(room.spawns)) {
          expect(spawn.y, `${where}: spawn ${name}`).toBeGreaterThanOrEqual(room.band.far)
          expect(spawn.y, `${where}: spawn ${name}`).toBeLessThanOrEqual(room.band.near)
          for (const exit of room.exits) {
            const inside = spawn.x >= exit.x && spawn.x <= exit.x + exit.w && spawn.y >= exit.y && spawn.y <= exit.y + exit.h
            expect(inside, `${where}: spawn ${name} stands in door ${exit.id}`).toBe(false)
          }
        }
        for (const exit of room.exits) {
          expect(exit.x, `${where}: door ${exit.id}`).toBeGreaterThanOrEqual(0)
          expect(exit.x + exit.w, `${where}: door ${exit.id}`).toBeLessThanOrEqual(1.0001)
        }
        // the old building's dressing stays with it; the new painting may bring its own (21.9.2026)
        expect(room.layers ?? [], `${where}: the old building's dressing came along`).toEqual([...(paint.layers ?? [])])
      }
    }
  })
})

describe('the old ground and the child who is no longer a child', () => {
  it('paints gate five in its 2000s colours in the 2000s, and keeps 1986 and the nineties red', () => {
    const gate5 = SCENE['gate5']
    expect(artFor(gate5, '2012-five')).toBe('bloomOldGates')
    expect(artFor(gate5, '1998-laces')).toBe('gate5')
    expect(artFor(gate5, '1986')).toBe('gate5')
  })

  it('does not let a thirty-year-old read that the turnstile is taller than him', () => {
    for (const id of ['2000-double', '2010-anthem', '2012-five', '2026-finale']) {
      const spots = outside.hotspots.filter((spot) => ['gate7', 'fence', 'turnstile'].includes(spot.id))
      for (const spot of spots) {
        const era = spot.era as readonly string[]
        expect(era.includes('2000s') || era.includes(id) || era.includes('*'), `${spot.id} in ${id}`).toBe(false)
      }
    }
  })
})
