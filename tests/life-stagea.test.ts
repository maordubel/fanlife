import { describe, expect, it } from 'vitest'

import { ALL_CHARACTERS, CHARACTERS, castFor, isActiveIn } from '@/lib/life/characters'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { ERA_1986, ERA_1990, ERA_1991 } from '@/lib/life/content/era'
import { RETRY_1986, retryFor } from '@/lib/life/content/retry1986'
import { CROWD_POOL, crowdFor, pickCrowd } from '@/lib/life/crowd'
import { CHAPTERS } from '@/lib/life/content/chapters'
import { STAGE_A_DAYS, STAGE_A_DAY, playableStageADays } from '@/lib/life/content/stagea-days'
import { LifeEngine } from '@/lib/life/engine'
import { apply, emptyState } from '@/lib/life/events'
import { SCENE } from '@/lib/life/world/scenes'
import { PORTRAIT_ART } from '@/lib/life/runtime/art'

/**
 * שלב א׳ — the two promises the Stage A brief and the character bible added to this game
 * before a single new room of theirs exists.
 *
 *  1. **24.5.1986 is mandatory.** A Saturday that ends without the boy inside the ground
 *     gives the morning back, in the shape the failure actually had, with one joke.
 *  2. **A character is a row before it is a face.** Everybody in the bible is registered,
 *     nobody points at art that does not exist, and the reusable crowd can never pull a
 *     person the story owns into a doorway.
 */

const state = (flags: string[] = []) => {
  const engine = new LifeEngine(DEFAULT_IDENTITY, 1986)
  engine.dispatch(...flags.map((flag) => ({ t: 'flag.raised', flag }) as const))
  return engine.state
}

describe('החיים האחרים — the championship is mandatory, and failing it is funny once', () => {
  it('tells the failure in the shape it actually had', () => {
    expect(retryFor(state(), 'bedroom').id).toBe('home')
    expect(retryFor(state(), 'home').id).toBe('home')
    expect(retryFor(state(['onboard:street', 'knows:match']), 'street').id).toBe('turnedBack')
    expect(retryFor(state(['saw:ground']), 'bloomfield-outside').id).toBe('outside')
    expect(retryFor(state(['entry:granted']), 'bloomfield-inside').id).toBe('late')
  })

  it('gives every route something that happened, a joke and the same last line', () => {
    for (const scene of Object.values(RETRY_1986)) {
      expect(scene.bodyHe.length, `${scene.id} body`).toBeGreaterThan(40)
      expect(scene.otherLifeHe.length, `${scene.id} joke`).toBeGreaterThan(40)
      expect(scene.closeHe).toBe('היום הזה נגמר. אבל עוד לא ככה.')
    }
    // the joke is about Pogi, and it is the only person it may be about
    for (const scene of Object.values(RETRY_1986)) {
      expect(scene.otherLifeHe.includes('פוגי'), `${scene.id} laughs at somebody else`).toBe(true)
    }
  })

  it('leaves the other chapters their "you were not there" endings', () => {
    // 1986 retries. 1990 and 1991 END — history happening without you is their thesis.
    expect(ERA_1986.endings['missed']).toBeDefined()
    expect(ERA_1990.endings['missed']).toBeDefined()
    expect(ERA_1991.endings['missed']).toBeDefined()
    const world = require('node:fs').readFileSync('lib/life/runtime/scenes/WorldScene.ts', 'utf8') as string
    expect(world).toContain("this.chapter === '1986' && key === 'missed'")
  })

  it('cuts the log back to the morning and keeps the life before it', () => {
    const engine = new LifeEngine(DEFAULT_IDENTITY, 1986)
    engine.dispatch(
      { t: 'chapter.entered', chapter: '1986' },
      { t: 'flag.raised', flag: 'knows:match' },
      { t: 'clock.advanced', minutes: 300 },
    )
    expect(engine.state.flags['knows:match']).toBe(true)
    expect(engine.restartDay()).toBe(true)
    expect(engine.state.flags['knows:match']).toBeUndefined()
    expect(engine.state.chapter).toBe('1986')
    expect(engine.state.chapterDone).toBe(false)
  })
})

describe('מרשם הדמויות — a row before a face', () => {
  it('registers everybody once, with a name and at least one era', () => {
    const seen = new Set<string>()
    for (const person of ALL_CHARACTERS) {
      expect(seen.has(person.id), `${person.id} is registered twice`).toBe(false)
      seen.add(person.id)
      expect(person.displayNameHe.length, `${person.id} has no name`).toBeGreaterThan(1)
      expect(person.activeEras.length, `${person.id} exists in no era`).toBeGreaterThan(0)
    }
    // the bible's locked ids — a rename or a duplicate row is the failure this catches
    for (const id of ['yosef', 'asaf', 'melamed', 'yaron', 'batya', 'omer-hermesh', 'michel']) {
      expect(CHARACTERS[id], `${id} is missing from the registry`).toBeDefined()
    }
    // …and the provisional names they replaced never come back
    for (const gone of ['meir', 'tiki', 'shalom', 'gabi']) {
      expect(CHARACTERS[gone], `${gone} is a retired name and must not be a row`).toBeUndefined()
    }
  })

  it('never points a character at a plate that does not exist', () => {
    const plates = new Set<string>(PORTRAIT_ART)
    for (const person of ALL_CHARACTERS) {
      if (!person.portraitSet) continue
      expect(plates.has(person.portraitSet), `${person.id} → ${person.portraitSet}`).toBe(true)
    }
  })

  it('keeps the future cast out of the chapters that exist', () => {
    const now = new Set(castFor('1986').concat(castFor('1990'), castFor('1991')).map((person) => person.id))
    for (const later of ['asaf', 'uli', 'yonatan', 'melanie', 'dor', 'batya', 'yaron', 'omer-hermesh']) {
      expect(now.has(later), `${later} appears in a chapter before his own`).toBe(false)
    }
  })
})

describe('הקהל — twelve people, chosen off the seed, never twice in one room', () => {
  it('draws only from the reusable pool and only from this era', () => {
    for (const era of ['1986', '1990', '1991']) {
      for (const person of crowdFor(era)) {
        expect(CROWD_POOL, `${person.id} is not reusable`).toContain(person.id)
        expect(isActiveIn(person.id, era)).toBe(true)
      }
    }
    // nobody the story owns can ever be drawn as scenery
    for (const owned of ['michel', 'omer-hermesh', 'barry', 'freddy', 'soko', 'shachor', 'melamed', 'asaf']) {
      expect(CROWD_POOL).not.toContain(owned)
    }
  })

  it('is deterministic on the save, and never repeats a person in one pick', () => {
    const base = { ...emptyState(DEFAULT_IDENTITY, 1986), rng: { seed: 'crowd', cursor: 0 } }
    const first = pickCrowd(base, '1986', 3)
    const again = pickCrowd(base, '1986', 3)
    expect(first.people.map((p) => p.id)).toEqual(again.people.map((p) => p.id))
    expect(new Set(first.people.map((p) => p.id)).size).toBe(first.people.length)
    expect(first.consumed).toBeGreaterThan(0)
    // a different cursor is a different afternoon
    const later = pickCrowd({ ...base, rng: { seed: 'crowd', cursor: 7 } }, '1986', 3)
    expect(later.people.length).toBe(first.people.length)
  })

  it('honours an exclusion, and asks for no more people than the era has', () => {
    const base = { ...emptyState(DEFAULT_IDENTITY, 1986), rng: { seed: 'crowd', cursor: 3 } }
    const all = crowdFor('1986')
    const picked = pickCrowd(base, '1986', 50, [all[0]!.id])
    expect(picked.people.length).toBe(all.length - 1)
    expect(picked.people.some((person) => person.id === all[0]!.id)).toBe(false)
  })
})

describe('שמונה ימים — the day is data, and a day transition is not a new life', () => {
  it('declares eight days, in order, each with a start a scene could use', () => {
    expect(STAGE_A_DAYS.length).toBe(8)
    expect(STAGE_A_DAYS.map((day) => day.id)).toEqual(['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'])
    let previous = 0
    for (const day of STAGE_A_DAYS) {
      expect(day.year, `${day.id} goes backwards`).toBeGreaterThanOrEqual(previous)
      previous = day.year
      // Born in 1978, and the brief is explicit that a day can fall either side of a
      // birthday — A6 is "7–8" in its own words. So the age is the year minus 1978, give
      // or take the birthday nobody has dated yet.
      expect(Math.abs(day.age - (day.year - 1978)), `${day.id} is the wrong age`).toBeLessThanOrEqual(1)
      expect(day.minute).toBeGreaterThan(0)
      expect(day.wantHe.length).toBeGreaterThan(3)
      expect(day.teachesHe.length).toBeGreaterThan(3)
      if (day.startLocation !== 'prologue') {
        expect(SCENE[day.startLocation as keyof typeof SCENE], `${day.id} starts nowhere`).toBeDefined()
      }
    }
    /**
     * Which days have a scene behind them — asked of the SOURCE OF TRUTH, not of a list
     * written here by hand.
     *
     * This assertion used to read `toEqual(['a1', 'a8'])`, and it stayed green for weeks
     * after a2–a7 shipped: `stagea-days.ts` still said `built: false`, this test agreed
     * with it, and both were wrong together. A hardcoded copy of a fact that lives in
     * another file does not test that file — it tests that nobody changed two places at
     * once, which is the failure it is supposed to catch.
     *
     * So the question is now put to `chapters.ts`, where `playable` is defined as the
     * truth, and the two files are made to agree. `a1` is the exception in both
     * directions: it is the 1983 prologue, it has no `ChapterDef`, and it is playable.
     */
    const playableUnits = new Set(
      CHAPTERS.filter((chapter) => chapter.playable).map((chapter) => chapter.unit.toLowerCase()),
    )
    for (const day of STAGE_A_DAYS) {
      if (day.id === 'a1') {
        expect(day.built, 'the 1983 prologue is playable and has been since 6.9.2026').toBe(true)
        continue
      }
      expect(
        day.built,
        `${day.id}: stagea-days says built=${day.built}, chapters.ts says playable=${playableUnits.has(day.id)}`,
      ).toBe(playableUnits.has(day.id))
    }
    expect(playableStageADays().map((day) => day.id)).toEqual(
      STAGE_A_DAYS.filter((day) => day.built).map((day) => day.id),
    )
    expect(STAGE_A_DAY.a8.anchorKey).toBe('1986')
  })

  it('keeps the tin, the shirt and every promise across a day', () => {
    const engine = new LifeEngine(DEFAULT_IDENTITY, 1986)
    engine.dispatch(
      { t: 'chapter.entered', chapter: '1986' },
      { t: 'money.changed', agorot: 400, why: 'test' },
      { t: 'savings.changed', agorot: 250, why: 'הקופה' },
      { t: 'clothing.gained', item: 'shirt:1985' },
      { t: 'flag.raised', flag: 'own:shirt:1985' },
      { t: 'flag.raised', flag: 'promise:wait-for-kobi' },
      { t: 'flag.raised', flag: 'knows:match' },
      { t: 'bond.shifted', who: 'ofir', delta: 20 },
      { t: 'item.gained', item: 'coin' },
    )
    engine.dispatch({ t: 'day.entered', dayId: 'a8', year: 1986, weekday: 6, minute: 12 * 60 + 35 })
    const after = engine.state
    // the day resets
    // ARNAK, 16.9.2026 — Maor: "הארנק לא מתאפס בסיום משימה אלא ממשיך איתך."
    // This line asserted the opposite until that decision, and it is changed rather than
    // deleted: the pocket surviving a transition IS the design, and a guard on a design
    // decision is what stops it drifting back in a refactor. See `lib/life/events.ts`.
    expect(after.agorot).toBe(400)
    expect(after.inventory).toEqual({})
    expect(after.minute).toBe(12 * 60 + 35)
    expect(after.energy).toBe(100)
    expect(after.flags['knows:match']).toBeUndefined()
    // the childhood does not
    expect(after.savings).toBe(250)
    expect(after.clothing).toEqual(['shirt:1985'])
    expect(after.flags['own:shirt:1985']).toBe(true)
    expect(after.flags['promise:wait-for-kobi']).toBe(true)
    expect(after.bonds['ofir']).toBe(20)
    expect(after.stageADay).toBe('a8')
  })

  it('never lets the tin go negative, and never owns the same shirt twice', () => {
    let state = emptyState(DEFAULT_IDENTITY, 1986)
    state = apply(state, { t: 'savings.changed', agorot: -50, why: 'test' })
    expect(state.savings).toBe(0)
    state = apply(state, { t: 'clothing.gained', item: 'shirt:1985' })
    state = apply(state, { t: 'clothing.gained', item: 'shirt:1985' })
    expect(state.clothing).toEqual(['shirt:1985'])
  })

  it('folds an unknown day event from a newer build as a no-op', () => {
    const state = apply(emptyState(DEFAULT_IDENTITY, 1986), { t: 'nonsense' } as never)
    expect(state.savings).toBe(0)
  })
})
