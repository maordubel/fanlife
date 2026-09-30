import { describe, expect, it } from 'vitest'

import { CHAPTERS } from '@/lib/life/content/chapters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { eraFor } from '@/lib/life/content/era'
import { BACKDROP, FIGURE, PROP } from '@/lib/life/runtime/art'
import { CAST_2000 } from '@/lib/life/world/castFigures'
import { facesLeft } from '@/lib/life/runtime/art'
import { heightOf, bodySize } from '@/lib/life/world/heights'
import { livesWithParents, ownHome, PARENTS_AFTER_2013, yearOfChapter } from '@/lib/life/world/homes'
import { NEW_ROOMS, STAGED } from '@/lib/life/world/rooms2000'
import { AMBIENT_REPAINTS } from '@/lib/life/content/ambient2000'
import { ALL_SCENES, artFor, exitInEra, inEra, sceneIn } from '@/lib/life/world/scenes'
import manifest from '@/public/life/art/manifest.json'
import { syncRows } from '@/lib/life/world/sync'

/**
 * החדרים של 2000–2026 (21.9.2026) — שבעה-עשר ציורים, כל אחד חדר, ומה שחייב להיות נכון
 * בכל אחד מהם: הרצפה, הדלתות, מה שעומד עליה, ומי.
 */

const ADULT = CHAPTERS.filter((c) => c.playable && yearOfChapter(c.id) >= 2000).map((c) => c.id)
const figures = new Set<string>(FIGURE)
const props = new Set<string>(PROP)
const backdrops = new Set<string>(BACKDROP)

describe('הבית — איזה בית, בכל שנה', () => {
  it('splits the adult life into the parents’ flat and his own, and nothing is both', () => {
    for (const id of ADULT) {
      const both = livesWithParents(id) && ownHome(id)
      expect(both, id).toBe(false)
    }
    expect(livesWithParents('2000-bridge')).toBe(true)
    expect(ownHome('2013-household')).toBe(true)
    // A01 is written "סלון קובי", X01 "אצל אבא ואמא"
    expect(ownHome('2019-armchair')).toBe(false)
    expect(ownHome('2021-suitcase')).toBe(false)
  })

  it('names the parents’ flat for what it is in the evenings he is only visiting', () => {
    const home = ALL_SCENES.find((scene) => scene.id === 'home')!
    for (const id of PARENTS_AFTER_2013) expect(sceneIn(home, id).titleHe, id).toBe('אצל ההורים')
    expect(sceneIn(home, '2013-household').titleHe).toBe('הבית שלך')
    expect(sceneIn(home, '2000-bridge').titleHe).toBe('הסלון')
  })

  it('keeps no door to a childhood kitchen or bedroom in a flat that has neither', () => {
    const home = ALL_SCENES.find((scene) => scene.id === 'home')!
    for (const id of ADULT.filter(ownHome)) {
      const doors = sceneIn(home, id).exits.filter((exit) => exitInEra(exit, id)).map((exit) => exit.to)
      expect(doors, id).toEqual(['street'])
    }
  })

  it('moves every beat that was written for a kitchen or a bedroom into the flat once he has one', () => {
    for (const id of ADULT.filter(ownHome)) {
      const beats = (eraFor(id).beats ?? []) as ReadonlyArray<{ id?: string; at?: unknown }>
      for (const beat of beats) {
        const rooms = Array.isArray(beat.at) ? beat.at : [beat.at]
        expect(rooms.includes('kitchen') || rooms.includes('bedroom'), `${id}/${beat.id}`).toBe(false)
      }
    }
  })
})

describe('כל ציור הוא חדר — רצפה, דלתות, חפצים', () => {
  const repainted = ALL_SCENES.flatMap((scene) => (scene.repaints ?? []).map((paint) => ({ scene, paint })))

  it('says where every thing of the old room stands on the new painting — or that it is not there', () => {
    const silent: string[] = []
    for (const { scene, paint } of repainted) {
      for (const id of CHAPTERS.map((c) => c.id).filter((c) => paint.in(c))) {
        for (const spot of scene.hotspots) {
          if (!inEra(spot, id)) continue
          if (!paint.spots || !(spot.id in paint.spots)) silent.push(`${scene.id}→${paint.art} @${id}: ${spot.id}`)
        }
      }
    }
    expect([...new Set(silent)]).toEqual([])
  })

  it('draws a moved thing where the new painting has a surface for it, not where the old one did', () => {
    for (const { scene, paint } of repainted) {
      for (const [id, at] of Object.entries(paint.spots ?? {})) {
        if (!at) continue
        const base = scene.hotspots.find((spot) => spot.id === id)
        if (base?.prop?.at) expect(at.prop?.at, `${scene.id}→${paint.art}: ${id} keeps the old surface`).toBeDefined()
      }
    }
  })

  it('stands every spawn on the floor and outside every door, in every chapter the painting is used', () => {
    const rooms = [
      ...repainted.flatMap(({ scene, paint }) => CHAPTERS.map((c) => c.id).filter((c) => paint.in(c)).map((c) => ({ id: c, room: sceneIn(scene, c) }))),
      ...NEW_ROOMS.flatMap((room) => ADULT.map((id) => ({ id, room }))),
    ]
    for (const { id, room } of rooms) {
      for (const [name, spawn] of Object.entries(room.spawns)) {
        expect(spawn.y, `${room.id}@${id}: spawn ${name}`).toBeGreaterThanOrEqual(room.band.far)
        expect(spawn.y, `${room.id}@${id}: spawn ${name}`).toBeLessThanOrEqual(room.band.near)
        for (const exit of room.exits) {
          if (!exitInEra(exit, id)) continue
          const inside = spawn.x >= exit.x && spawn.x <= exit.x + exit.w && spawn.y >= exit.y && spawn.y <= exit.y + exit.h
          expect(inside, `${room.id}@${id}: spawn ${name} stands in door ${exit.id}`).toBe(false)
        }
      }
    }
  })

  it('builds every new room from a painting that ships, with a door that reaches the floor', () => {
    for (const room of NEW_ROOMS) {
      expect(backdrops.has(room.art), `${room.id}: ${room.art}`).toBe(true)
      expect(room.size.near / room.size.far, `${room.id}: ramp`).toBeLessThanOrEqual(1.8)
      expect(room.size.near / room.metre, `${room.id}: size.near / metre`).toBeCloseTo(1.3, 1)
      expect(room.exits.length, `${room.id}: no way out`).toBeGreaterThan(0)
      for (const exit of room.exits) {
        const overlaps = exit.y <= room.band.near && exit.y + exit.h >= room.band.far
        expect(overlaps, `${room.id}/${exit.id} is off the floor`).toBe(true)
        expect(exit.light, `${room.id}/${exit.id} has no light on its painted opening`).toBeDefined()
      }
      for (const spot of room.hotspots) {
        expect(spot.y, `${room.id}/${spot.id}`).toBeGreaterThanOrEqual(room.band.far)
        expect(spot.y, `${room.id}/${spot.id}`).toBeLessThanOrEqual(room.band.near)
        expect(DIALOGUE[spot.act], `${room.id}/${spot.id} opens nothing`).toBeDefined()
        if (spot.prop) expect(props.has(spot.prop.key), `${room.id}/${spot.id}: ${spot.prop.key}`).toBe(true)
      }
    }
  })

  it('lets no two rooms share one painted doorway in the same year', () => {
    const slots = new Map<string, string[]>()
    for (const scene of ALL_SCENES) {
      for (const id of ADULT) {
        for (const exit of scene.exits) {
          if (!exit.era || exit.era === '*' || !exitInEra(exit, id)) continue
          const key = `${scene.id}@${id}@${exit.x}`
          slots.set(key, [...(slots.get(key) ?? []), exit.to])
        }
      }
    }
    const crowded = [...slots].filter(([, to]) => to.length > 1).map(([key, to]) => `${key}: ${to.join(' + ')}`)
    expect(crowded).toEqual([])
  })
})

describe('מי שמדבר — עומד (כלל 85)', () => {
  it('gives every body in the cast a figure that ships', () => {
    for (const [who, body] of Object.entries(CAST_2000)) expect(figures.has(body.figure), `${who}: ${body.figure}`).toBe(true)
  })

  it('stands every staged person on a figure that ships, inside the floor of the painting of their year', () => {
    for (const [room, actors] of Object.entries(STAGED)) {
      const scene = ALL_SCENES.find((row) => row.id === room)!
      for (const actor of actors ?? []) {
        const era = actor.era as string
        const here = sceneIn(scene, era)
        expect(figures.has(actor.figure), `${room}/${actor.id}: ${actor.figure}`).toBe(true)
        expect(actor.y, `${room}/${actor.id} above the floor of ${here.art}`).toBeGreaterThanOrEqual(here.band.far - 0.0001)
        expect(actor.y, `${room}/${actor.id} below the floor of ${here.art}`).toBeLessThanOrEqual(here.band.near + 0.0001)
        expect(here.actors.some((row) => row.id === actor.id), `${room}/${actor.id} did not arrive in ${here.art}`).toBe(true)
      }
    }
  })

  it('stands nobody where he arrives — the door he comes in by, or the place a chapter starts him', () => {
    // 21.9.2026: in the 2025 living room Yosef stood at 0.46 and the chapter started the man
    // at 0.45, a step nearer the camera — so the man hid him completely, for the whole scene.
    // Nearer is bigger, and at the same x the nearer body covers the other one whatever the
    // depth, so the test is on x alone: half a body width apart, at the size each is drawn.
    const aspect = (art: string) => {
      const box = (manifest as { backdrops: Record<string, { box?: number[] }> }).backdrops[art]?.box ?? [0, 0, 16, 9]
      return (box[3]! - box[1]!) / (box[2]! - box[0]!)
    }
    const hidden: string[] = []
    for (const [room, actors] of Object.entries(STAGED)) {
      const scene = ALL_SCENES.find((row) => row.id === room)!
      for (const era of new Set((actors ?? []).map((actor) => actor.era as string))) {
        const here = sceneIn(scene, era)
        const taper = here.size.far / here.size.near
        const t = (y: number) => Math.max(0, Math.min(1, (y - here.band.far) / (here.band.near - here.band.far)))
        const half = (y: number, figure: string) => bodySize(figure, here.metre, t(y), taper) * 0.15 * aspect(here.art)
        // the ways in this year: 'start', and every door back from a room this one opens onto
        const open = new Set(here.exits.filter((exit) => exitInEra(exit, era)).map((exit) => exit.to))
        const used = new Set(['start'])
        for (const other of ALL_SCENES) {
          if (!open.has(other.id)) continue
          for (const exit of sceneIn(other, era).exits) if (exit.to === room && exitInEra(exit, era)) used.add(exit.spawn)
        }
        for (const [name, spawn] of Object.entries(here.spawns)) {
          if (!used.has(name)) continue
          for (const actor of here.actors.filter((row) => inEra(row, era))) {
            const limit = (half(actor.y, actor.figure) + half(spawn.y, 'hero80-stand')) * 0.55
            if (Math.abs(actor.x - spawn.x) < limit) hidden.push(`${room}@${era}: ${name} (${spawn.x}) × ${actor.nameHe} (${actor.x})`)
          }
        }
      }
    }
    expect(hidden).toEqual([])
  })

  it('stands no two people of one evening inside each other', () => {
    // "הגבר מהשולחן" has sat at 0.862 in front of the café since 1986; three evenings of the
    // 2000s stood a friend on the same spot, and the board showed one body with two heads.
    // The partner and Keren are one slot — only one of them is ever there.
    const aspect = (art: string) => {
      const box = (manifest as { backdrops: Record<string, { box?: number[] }> }).backdrops[art]?.box ?? [0, 0, 16, 9]
      return (box[3]! - box[1]!) / (box[2]! - box[0]!)
    }
    const either = (a: { id: string; when?: unknown }, b: { id: string; when?: unknown }) =>
      a.id.includes('-partner-') && (b.id.includes('-partner-') || JSON.stringify(b.when ?? {}).includes('"notFlag":"life:partner"'))
    const crowded: string[] = []
    for (const [room, actors] of Object.entries(STAGED)) {
      const scene = ALL_SCENES.find((row) => row.id === room)!
      for (const era of new Set((actors ?? []).map((actor) => actor.era as string))) {
        const here = sceneIn(scene, era)
        const taper = here.size.far / here.size.near
        const t = (y: number) => Math.max(0, Math.min(1, (y - here.band.far) / (here.band.near - here.band.far)))
        const half = (y: number, figure: string) => bodySize(figure, here.metre, t(y), taper) * 0.15 * aspect(here.art)
        const people = here.actors.filter((row) => inEra(row, era))
        for (let i = 0; i < people.length; i++) {
          for (let j = i + 1; j < people.length; j++) {
            const [a, b] = [people[i]!, people[j]!]
            // one person twice is one person in two bodies, for two lives (Michal, 2025)
            if (either(a, b) || either(b, a) || a.nameHe === b.nameHe) continue
            if (Math.abs(a.x - b.x) < (half(a.y, a.figure) + half(b.y, b.figure)) * 0.5) crowded.push(`${room}@${era}: ${a.nameHe} (${a.x}) × ${b.nameHe} (${b.x})`)
          }
        }
      }
    }
    expect(crowded).toEqual([])
  })

  it('draws nobody at an impossible size beside the man', () => {
    const wrong: string[] = []
    for (const [room, actors] of Object.entries(STAGED)) {
      const scene = ALL_SCENES.find((row) => row.id === room)!
      for (const actor of actors ?? []) {
        const here = sceneIn(scene, actor.era as string)
        const taper = here.size.far / here.size.near
        const t = Math.max(0, Math.min(1, (actor.y - here.band.far) / (here.band.near - here.band.far)))
        const drawn = bodySize(actor.figure, here.metre, t, taper)
        // a grown man of 1.78 on this floor, at this depth
        const man = here.metre * 1.78 * (taper + (1 - taper) * t)
        const ratio = drawn / man
        if (ratio < 0.55 || ratio > 1.25) wrong.push(`${room}/${actor.id} (${actor.figure}, ${heightOf(actor.figure)} m): ×${ratio.toFixed(2)}`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('leaves nobody who speaks without a place on the screen', () => {
    const missing = syncRows().filter((row) => row.verdict === 'missing')
    expect(missing.map((row) => `${row.chapter}/${row.beat}: ${row.who}`)).toEqual([])
  })

  it('makes the people of a room wait in it, instead of walking in after him', () => {
    const walkIn = syncRows().filter((row) => row.verdict === 'companion' && row.trigger === 'enter' && row.room)
    expect(walkIn.map((row) => `${row.chapter}/${row.beat}@${row.room}: ${row.who}`)).toEqual([])
  })
})

describe('מי שעובר ברקע — לא אחד מהקאסט (21.9.2026)', () => {
  const bodies = new Set(Object.values(CAST_2000).flatMap((body) => [body.figure, ...Object.values(body.fromYear ?? {})]))

  it('lets no stand-in body of a named person cross the picture as a stranger', () => {
    for (const id of ADULT) {
      const clones = eraFor(id).ambient.filter((row) => bodies.has(row.figure)).map((row) => `${row.id}: ${row.figure}`)
      expect(clones, id).toEqual([])
    }
  })

  it('walks every stranger on the floor of the painting of his year, the way he faces', () => {
    for (const id of ADULT) {
      for (const row of eraFor(id).ambient) {
        const scene = ALL_SCENES.find((room) => room.id === row.location)
        if (!scene) continue
        const here = sceneIn(scene, id)
        expect(row.y, `${id}: ${row.id} on ${here.art}`).toBeGreaterThanOrEqual(here.band.far)
        // nearer than the walk band is allowed and deliberate: on a match day the supporters
        // walk in the road below the kerb (`ambient1986.ts`), where the player cannot follow
        expect(row.y, `${id}: ${row.id} on ${here.art}`).toBeLessThanOrEqual(0.97)
        expect(figures.has(row.figure), `${row.id}: ${row.figure}`).toBe(true)
      }
    }
  })

  it('knows which bodies look left, so nobody walks backwards', () => {
    // the crowd sheets' walkers, read off the pictures on 21.9.2026
    for (const left of ['adultA1', 'adultB1', 'youngA1', 'youngA7', 'youngB1']) expect(facesLeft(left), left).toBe(true)
    for (const right of ['adultA7', 'adultB4', 'adultB7', 'kobi90-stand', 'hero90']) expect(facesLeft(right), right).toBe(false)
  })
})

describe('עוברי אורח על ציור אחר (27.9.2026)', () => {
  it('maps from the floor the rows were written on — the room’s own band, not a copy that drifts', () => {
    for (const entry of AMBIENT_REPAINTS) {
      const scene = ALL_SCENES.find((room) => room.id === entry.location)!
      expect(entry.from, entry.location).toEqual(scene.band)
      expect(scene.repaints ?? [], entry.location).toContain(entry.paint)
    }
  })

  it('keeps every passer-by of a repainted room on the painting’s own walk band', () => {
    for (const id of ADULT) {
      for (const row of eraFor(id).ambient) {
        const entry = AMBIENT_REPAINTS.find((e) => e.location === row.location && e.paint.in(id))
        if (!entry) continue
        expect(row.y, `${id}: ${row.id}`).toBeGreaterThanOrEqual(entry.paint.band.far)
        expect(row.y, `${id}: ${row.id}`).toBeLessThanOrEqual(entry.paint.band.near)
      }
    }
  })
})

describe('street10 · busStation20 · ramatGan — the 16:9 paintings of 27.9.2026', () => {
  it('draws the street from 2010, the fans’ platform from 2017, and neither before', () => {
    const street = ALL_SCENES.find((room) => room.id === 'street')!
    const bus = ALL_SCENES.find((room) => room.id === 'bus-station')!
    expect(sceneIn(street, '2009-up').art).not.toBe('street10')
    expect(sceneIn(street, '2010-cup').art).toBe('street10')
    expect(sceneIn(street, '2026-finale').art).toBe('street10')
    expect(sceneIn(bus, '2006-home').art).toBe('busStation')
    expect(sceneIn(bus, '2017-distance').art).toBe('busStation20')
  })

  it('keeps every ramp inside what a lens does, and the reference height where it was measured', () => {
    const rooms = [
      sceneIn(ALL_SCENES.find((room) => room.id === 'street')!, '2012-five'),
      sceneIn(ALL_SCENES.find((room) => room.id === 'bus-station')!, '2026-finale'),
      ALL_SCENES.find((room) => room.id === 'ramat-gan')!,
    ]
    for (const room of rooms) {
      expect(room.size.near / room.size.far, `${room.id}/${room.art}`).toBeLessThanOrEqual(1.8)
      expect(room.size.near / room.metre, `${room.id}/${room.art}`).toBeCloseTo(1.3, 1)
    }
  })

  it('reads the decade redresses by the exact decade — kiosk10 in the 2010s, kiosk20 in the 2020s', () => {
    const kiosk = ALL_SCENES.find((room) => room.id === 'kiosk')!
    expect(artFor(kiosk, '2002-europe')).toBe('kiosk00')
    expect(artFor(kiosk, '2012-five')).toBe('kiosk10')
    expect(artFor(kiosk, '2024-home')).toBe('kiosk20')
    expect(artFor(ALL_SCENES.find((room) => room.id === 'allenby')!, '2021-promises')).toBe('allenby20')
    expect(artFor(ALL_SCENES.find((room) => room.id === 'schoolyard')!, '2021-promises')).toBe('schoolyard20')
    // what was written for '2000s' still holds for every year after it
    expect(artFor(ALL_SCENES.find((room) => room.id === 'bloomfield-outside')!, '2012-five')).toBe('gate7Old')
  })
})
