/**
 * LIFE — the people you know look like themselves, and grow old with you (owner review, 23.10.2026).
 * The father in the crowd is the father from the kitchen; the cast ages with the supporter by written rules.
 */
import {describe, expect, it} from 'vitest'
import {buildLevel, lookMatches} from '@/lib/life/rush/level'
import {botInput, startSim, stepSim} from '@/lib/life/rush/sim'
import {KNOWN_FOR, knownLook} from '@/lib/life/rush/call'
import type {MissionSpec} from '@/lib/life/rush/spec'
import {templateById} from '@/lib/life/rush/templates'
import {RUSH_WORDS} from '@/lib/life/rush/words'
import {ageAt, CAST_ROLES, lookAt, MET_AT, ROLE_CAP} from '@/lib/life/universal/cast'

const role = (id: string) => CAST_ROLES.find(r => r.id === id)!
function specOf(template: string, seed: number, who: MissionSpec['who'] = null): MissionSpec {
  const t = templateById(template)!
  return {template, verb: t.verb, camera: t.camera, route: t.route, seed, skin: 'test', age: 30, time: 'night', weather: 'clear', clock: t.clock, hazards: [...t.hazards], difficulty: 1, mandatory: false, anchor: null, title: '', brief: '', who}
}

describe('the people around you grow old with you', () => {
  it('a father ages with his child, greys and needs glasses', () => {
    const dad = role('dad').look
    expect(ageAt('dad', dad.age, MET_AT)).toBe(dad.age)
    const at40 = lookAt('dad', dad, 40)
    expect(at40.age).toBe(dad.age! + 31)
    expect(at40.hair).toBe('#8a8a90')
    expect(at40.glasses).toBe(true)
    expect(lookAt('dad', dad, 9)).toBe(dad)
  })

  it('peers are his own age, passers-by keep theirs, roles stop at the cap', () => {
    expect(ageAt('friend', 11, 30)).toBe(30)
    expect(ageAt('friend', 11, 6)).toBe(11)
    expect(ageAt('stranger', 40, 60)).toBe(40)
    expect(ageAt('elder', 71, 60)).toBe(ROLE_CAP)
    expect(lookAt('elder', role('elder').look, 40).cane).toBe(true)
  })

  it('every cast role has an age, and no aged look loses a trait it was drawn with', () => {
    for (const r of CAST_ROLES) for (const age of [6, 12, 25, 45, 70]) {
      const l = lookAt(r.id, r.look, age)
      if (r.look.scarf) expect(l.scarf, r.id).toBe(true)
      if (r.look.cap) expect(l.cap, r.id).toBeTruthy()
    }
  })
})

describe('RUSH · the one you look for is somebody you know', () => {
  it('the father and the friend are the find missions that know their man', () => {
    expect(KNOWN_FOR['title-night']).toBe('dad')
    expect(KNOWN_FOR['europe-night']).toBe('friend')
  })

  for (const [template, who, age] of [['title-night', 'dad', 9], ['europe-night', 'friend', 25], ['title-night', 'dad', 45]] as const) {
    it(`${template}: ${who} at ${age} is drawn as himself, the clues are his, and he is the only one who fits them`, () => {
      const known = knownLook(who, role(who).look, age)
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const level = buildLevel(specOf(template, seed, known))
        const t = level.targets[0]!
        expect(t.look!.cap).toBe(known.cap)
        expect(t.look!.scarf).toBe(known.scarf)
        expect(t.look!.beard).toBe(known.beard)
        expect(t.look!.hex).toEqual(known.hex)
        expect(t.clues.every(c => lookMatches(t.look!, c)), `${seed}: ${t.clues}`).toBe(true)
        expect(level.standers.filter(s => t.clues.every(c => lookMatches(s.look, c))), `${seed}`).toEqual([])
        // a known face changes nothing else: the same crowd stands in the same places
        const plain = buildLevel(specOf(template, seed))
        expect(level.standers.map(s => [s.x, s.z])).toEqual(plain.standers.map(s => [s.x, s.z]))
      }
    })
  }

  it('a grey-haired father is found by his grey hair, a friend by his black, and the bot still finds both every time', () => {
    const friend = knownLook('friend', role('friend').look, 25)
    expect(buildLevel(specOf('europe-night', 1, friend)).targets[0]!.clues).toEqual(['black', 'plain'])
    const known = knownLook('dad', role('dad').look, 45)
    expect(known.grey).toBe(true)
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const level = buildLevel(specOf('title-night', seed, known)), s = startSim(level)
      expect(level.targets[0]!.clues).toContain('grey')
      let n = 0
      while (!s.ended && n < 60 * 900) { stepSim(level, s, botInput(level, s)); n++ }
      expect(s.ended, `seed ${seed}`).toBe('good')
    }
  })

  it('the grey clue is said in both languages', () => {
    expect(RUSH_WORDS.en['clue.grey' as keyof typeof RUSH_WORDS.en]).toBeTruthy()
    expect((RUSH_WORDS.he as Record<string, string>)['clue.grey']).toBeTruthy()
  })
})
