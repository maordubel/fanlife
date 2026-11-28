import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {isYellowHex} from '@/lib/isYellow'
import {clockAfter, clockForMission, clockLabel, DAY_MINUTES, dayPart, DUSK_LIGHT, FIRST_CLOCK, isDark, lightAt, missionStart, wrapDay} from '@/lib/life/hood/daylight'
import {castFace, parseFlow, pick, urlOf} from '@/lib/life/hood/flowRef'
import {parseSave} from '@/lib/life/hood/save'
import {brandAccent, CREAM, LIME} from '@/lib/life/hood/shell'
import {castStem, CLUB_TOWN, LIFE_CAST, LIFE_PEOPLE, parseLifeStem, TOWN_PEOPLE} from '@/lib/life/flowArtSpec'

const H = (h: number, m = 0) => h * 60 + m

describe('LIFE · the day (lib/life/hood/daylight.ts)', () => {
  it('keeps the approved dusk number for number', () => {
    expect(lightAt(H(18, 40))).toEqual(DUSK_LIGHT)
  })
  it('makes day and night different: nothing is lit at noon, everything is at night', () => {
    const noon = lightAt(H(12, 30)), night = lightAt(H(23)), gold = lightAt(H(16, 30))
    expect(noon.glow).toBe(0); expect(noon.lit).toBe(0); expect(noon.stars).toBe(0); expect(noon.night).toBe(0)
    expect(night.glow).toBeGreaterThanOrEqual(1); expect(night.lit).toBeGreaterThanOrEqual(1); expect(night.stars).toBe(1); expect(night.night).toBe(1)
    expect(noon.sunK).toBeGreaterThan(night.sunK * 4)
    expect(noon.sunEl).toBeGreaterThan(gold.sunEl + 30)      // short shadows at noon, long ones in the gold hour
    expect(noon.wet).toBeLessThan(0.2); expect(night.wet).toBeGreaterThanOrEqual(1) // the road dries in the sun
    expect(isDark(H(12))).toBe(false); expect(isDark(H(22))).toBe(true); expect(isDark(H(3))).toBe(true)
  })
  it('turns without a jump: a minute never changes the light much, and a shadow never swings while it can be seen', () => {
    let prev = lightAt(0)
    for (let m = 1; m <= DAY_MINUTES; m++) {
      const l = lightAt(m)
      expect(Math.abs(l.exposure - prev.exposure), `exposure ${clockLabel(m)}`).toBeLessThan(0.02)
      expect(Math.abs(l.sunK - prev.sunK), `sun ${clockLabel(m)}`).toBeLessThan(0.2)
      expect(Math.abs(l.lit - prev.lit), `lit ${clockLabel(m)}`).toBeLessThan(0.08)
      expect(Math.abs(l.fogDensity - prev.fogDensity), `fog ${clockLabel(m)}`).toBeLessThan(0.0004)
      const swing = Math.abs(((l.sunAz - prev.sunAz + 540) % 360) - 180)
      if (Math.min(l.sunK, prev.sunK) > 0.6) expect(swing, `shadow swing ${clockLabel(m)}`).toBeLessThan(6)
      prev = l
    }
    expect(lightAt(DAY_MINUTES)).toEqual(lightAt(0))
  })
  it('never prints yellow in the sky, the haze or the sun (rule 8)', () => {
    for (let m = 0; m < DAY_MINUTES; m += 5) {
      const l = lightAt(m)
      for (const c of [...l.sky, l.fog, l.sun, l.hemiSky, l.hemiGround]) { expect(c).toMatch(/^#[0-9a-f]{6}$/); expect(isYellowHex(c), `${clockLabel(m)} ${c}`).toBe(false) }
    }
  })
  it('names every hour', () => {
    expect([0, 6, 9, 13, 16, 17.9, 19, 20, 22].map(h => dayPart(h * 60))).toEqual(['night', 'dawn', 'morning', 'midday', 'afternoon', 'sunset', 'dusk', 'evening', 'night'])
  })
  it('keeps one clock: it only runs forward, wraps at midnight and reads as HH:MM', () => {
    expect(clockLabel(FIRST_CLOCK)).toBe('16:50')
    expect(clockAfter(H(23, 59), 3)).toBeCloseTo(1, 5)
    expect(clockAfter(H(10), -50)).toBe(H(10))
    expect(wrapDay(-1)).toBe(DAY_MINUTES - 1)
    expect(clockLabel(H(7, 5))).toBe('07:05')
  })
  it('lets the story set the hour: school in the morning, the ground in the gold hour before kick-off', () => {
    expect(clockLabel(missionStart({day: 'any', place: 'school', kind: 'main'}))).toBe('07:35')
    const match = missionStart({day: 'matchday', place: 'home', kind: 'main'})
    expect(dayPart(match)).toBe('afternoon')
    expect(lightAt(match).sunK).toBeGreaterThan(2)
    // four real minutes later the walk has gone through sunset into the floodlights
    expect(isDark(clockAfter(match, 240))).toBe(true)
    // a job taken near its own hour does not rewind the clock; one taken far from it moves to it
    expect(clockForMission(H(8, 10), {day: 'any', place: 'school', kind: 'main'})).toBe(H(8, 10))
    expect(clockForMission(H(21), {day: 'any', place: 'school', kind: 'main'})).toBe(H(7, 35))
  })
  it('saves the clock with the life, and reads a save from before the day turned', () => {
    const base = {v: 1, name: 'A', job: 'idle', step: 0, got: [], x: 0, z: 0, t: 0, waypoint: null, wear: true}
    expect(parseSave(JSON.stringify({...base, clock: 500.5}))?.clock).toBe(500.5)
    expect(parseSave(JSON.stringify({...base, clock: 1500}))?.clock).toBe(60)
    expect(parseSave(JSON.stringify(base))?.clock).toBeUndefined()
    expect(parseSave(JSON.stringify({...base, clock: 'noon'}))?.clock).toBeUndefined()
  })
})

describe('LIFE · the Flow pictures in the game (lib/life/hood/flowRef.ts)', () => {
  const raw = JSON.parse(readFileSync('public/life/flow/manifest.json', 'utf8')) as {pieces: Record<string, {kind: string; use?: boolean}>}
  const m = parseFlow(raw)
  it('reads the manifest the bake really publishes (pieces keyed by stem, files named by width)', () => {
    expect(m).not.toBeNull()
    const shown = Object.values(raw.pieces).filter(p => p.use !== false).length
    expect(m!.pieces.length).toBe(shown)
    expect(m!.pieces.every(p => p.sizes.length > 0)).toBe(true)
    const any = m!.pieces[0]!
    expect(urlOf(m!, any, 400)).toBe(`/life/flow/${any.stem}-${any.sizes.find(s => s >= 400) ?? any.sizes[any.sizes.length - 1]}.webp`)
  })
  it('never shows a piece reviewed out', () => {
    const out = Object.entries(raw.pieces).filter(([, p]) => p.use === false).map(([k]) => k)
    for (const stem of out) expect(m!.pieces.some(p => p.stem === stem), stem).toBe(false)
  })
  it('keeps a town\'s picture to its own town', () => {
    const fake = parseFlow({pieces: [{stem: 'life-aerial-ath-fl1', kind: 'aerial', town: 'ath', files: {'1536': {}}}, {stem: 'life-story-kiosk-fl1', kind: 'story', files: {'1600': {}}}]})
    expect(pick(fake, {kind: 'aerial', club: 'olympiacos', town: 'ath'})?.stem).toBe('life-aerial-ath-fl1')
    expect(pick(fake, {kind: 'aerial', club: 'celtic', town: 'gla'})).toBeNull()
    expect(pick(fake, {kind: 'aerial', club: 'somebody', town: null})).toBeNull()
    expect(pick(fake, {kind: 'story', club: 'celtic', town: 'gla', hint: ['kiosk']})?.stem).toBe('life-story-kiosk-fl1')
  })
  it('finds a key person\'s painted face for the club\'s part of the world, and nothing when it is not painted yet', () => {
    const fake = parseFlow({pieces: {a: {stem: castStem('med', 'father'), kind: 'cast', files: {'384': {}, '768': {}}}}})
    expect(castFace(fake, 'med', 'father')).toBe('/life/flow/life-cast-med-father-fl1-384.webp')
    expect(castFace(fake, 'med', 'father', 700)).toBe('/life/flow/life-cast-med-father-fl1-768.webp')
    expect(castFace(fake, 'north', 'father')).toBeNull()
    expect(castFace(fake, null, 'father')).toBeNull()
    expect(castFace(null, 'med', 'father')).toBeNull()
  })
  it('orders a face for every key person in every part of the world a club lives in', () => {
    for (const people of LIFE_PEOPLE) for (const who of LIFE_CAST) expect(parseLifeStem(castStem(people, who))).toEqual({stem: castStem(people, who), use: 'cast', key: who, people})
    for (const town of new Set(Object.values(CLUB_TOWN))) expect(LIFE_PEOPLE).toContain(TOWN_PEOPLE[town])
    expect(parseLifeStem('life-cast-med-referee-fl1')).toBeNull()
    expect(parseLifeStem('life-cast-mars-father-fl1')).toBeNull()
  })
})

describe('LIFE · the brand accent', () => {
  it('is never lime on a club whose pages may not carry green', async () => {
    const {bannedColour} = await import('@/lib/life/rush-render/colour')
    const {loadClub} = await import('@/lib/clubs/resolver')
    const {clubLife} = await import('@/lib/clubs/life/pack')
    for (const id of ['olympiacos', 'panathinaikos', 'hapoel-tel-aviv']) {
      const club = await loadClub(id); const skin = clubLife(club!.data).skin
      const a = brandAccent(skin)
      expect([LIME, CREAM]).toContain(a)
      if (bannedColour('#2f8a4c', skin)) expect(a, id).toBe(CREAM)
    }
    const oly = clubLife((await loadClub('olympiacos'))!.data).skin
    expect(brandAccent(oly)).toBe(CREAM)
  }, 120_000)
})
