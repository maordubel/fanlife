import {describe, expect, it} from 'vitest'
import {cardFound, cardsHeld, kitOfYear, NO_THINGS, yearOf, type HoodThings} from '@/lib/life/hood/things'
import {soundScene} from '@/lib/life/hood/soundScene'
import {parseSave, snapshot} from '@/lib/life/hood/save'
import {hoodLevel} from '@/lib/life/hood/level'
import {startHood} from '@/lib/life/hood/run'
import {keepOff, newPlay, storyLevel} from '@/lib/life/hood/story/play'
import {loadClub} from '@/lib/clubs/resolver'
import {clubLife} from '@/lib/clubs/life/pack'

const T: HoodThings = {
  crest: '/crests/x.png',
  kits: [{year: 1979, season: '1979-80', src: '/k/79.svg'}, {year: 1984, season: '1984-85', src: '/k/84.svg'}, {year: 1991, season: '1991-92', src: '/k/91.svg'}],
  cards: [
    {id: 'x:1', code: 'X–01', name: 'Old Hand', from: 1960, to: 1971, src: '/s/1.webp', kit: null},
    {id: 'x:2', code: 'X–02', name: 'The Number Nine', from: 1982, to: 1989, src: '/s/2.webp', kit: null},
    {id: 'x:3', code: 'X–03', name: 'The Keeper', from: 1984, to: 1996, src: null, kit: '/k/84.svg'},
    {id: 'x:4', code: 'X–04', name: 'The New Boy', from: 2004, to: 2010, src: '/s/4.webp', kit: null},
  ],
}

describe('LIFE · the club\'s own things (lib/life/hood/things.ts)', () => {
  it('gives the shirt the club wore that season, never one from the future', () => {
    expect(kitOfYear(T, 1986)?.season).toBe('1984-85')
    expect(kitOfYear(T, 1984)?.season).toBe('1984-85')
    expect(kitOfYear(T, 1999)?.season).toBe('1991-92')
    expect(kitOfYear(T, 1970)?.season).toBe('1979-80')   // before the first on file: the earliest, said as its own season
    expect(kitOfYear(T, null)?.season).toBe('1991-92')
    expect(kitOfYear(NO_THINGS, 1986)).toBeNull()
    expect(kitOfYear(undefined, 1986)).toBeNull()
  })
  it('finds a man of the squad of that year first, then the nearest in time, the same way every time', () => {
    expect(cardFound(T, 1986, [])?.id).toBe('x:2')
    expect(cardFound(T, 1986, ['x:2'])?.id).toBe('x:3')
    expect(cardFound(T, 1986, ['x:2', 'x:3'])?.id).toBe('x:1')       // fifteen years off is nearer than eighteen
    expect(cardFound(T, 1986, ['x:2', 'x:3', 'x:1'])?.id).toBe('x:4')
    expect(cardFound(T, 1986, ['x:1', 'x:2', 'x:3', 'x:4'])).toBeNull()
    expect(cardFound(T, null, [])?.id).toBe('x:1')
    expect(cardFound(NO_THINGS, 1986, [])).toBeNull()
    expect(cardsHeld(T, ['x:3', 'nobody:9', 'x:1']).map(c => c.name)).toEqual(['The Keeper', 'Old Hand'])
    expect(yearOf(1978, 8)).toBe(1986); expect(yearOf(null, 8)).toBeNull()
  })
  it('keeps the stickers found with the life, and refuses anything that is not a sticker id', () => {
    const base = {v: 1, name: 'A', job: 'idle', step: 0, got: [], x: 0, z: 0, t: 0, waypoint: null, wear: true}
    expect(parseSave(JSON.stringify({...base, cards: ['olympiacos:4', 'olympiacos:4', '<img>', 7, 'celtic:12', 'x:1']}))?.cards).toEqual(['olympiacos:4', 'celtic:12'])
    expect(parseSave(JSON.stringify(base))?.cards).toBeUndefined()
  })
  it('lays stickers about the street that no mission hides, on ground he can stand on', async () => {
    const club = await loadClub('olympiacos'), pack = clubLife(club!.data)
    const sl = storyLevel(hoodLevel({id: 'olympiacos', skin: pack.skin, cast: pack.cast}, 1))
    expect(sl.free.length).toBe(6)
    for (const i of sl.free) expect(sl.level.pickups[i]).toMatchObject({kind: 'sticker', step: null})
    const run = startHood(sl.level)
    keepOff(run, sl, newPlay())
    for (const i of sl.free) expect(run.sim.got[i]).toBe(false)
    // every other mission's things stay hidden until it is taken
    expect(run.sim.got.filter((g, i) => !g && !sl.free.includes(i)).length).toBe(0)
    const s = snapshot(run, 'A', null, true, undefined, 600, ['olympiacos:4'])
    expect(s.cards).toEqual(['olympiacos:4']); expect(s.clock).toBe(600)
  }, 120_000)
})

describe('LIFE · what the street sounds like (lib/life/hood/soundScene.ts)', () => {
  const at = (o: Partial<Parameters<typeof soundScene>[0]>) => soundScene({clock: 17 * 60, toGround: 300, matchday: true, speed: 0, sprinting: false, covered: false, talking: false, ...o})
  it('has a day street and a dusk street', () => {
    expect(at({clock: 10 * 60}).street.name).toBe('amb-street-day')
    expect(at({clock: 20 * 60}).street.name).toBe('amb-street-dusk')
    expect(at({clock: 2 * 60}).street.level).toBeLessThan(at({clock: 20 * 60}).street.level)
  })
  it('lets the ground be heard before it is seen, louder with every step toward it, and only on a matchday evening', () => {
    const far = at({toGround: 280}).ground!, mid = at({toGround: 150}).ground!, near = at({toGround: 20}).ground!
    expect(far.level).toBeGreaterThan(0); expect(mid.level).toBeGreaterThan(far.level); expect(near.level).toBeGreaterThan(mid.level * 2)
    expect(at({matchday: false}).ground).toBeNull()
    expect(at({clock: 9 * 60}).ground).toBeNull()
    expect(at({clock: 23 * 60}).ground).toBeNull()
  })
  it('turns the world down behind a menu and for a conversation, never off', () => {
    const open = at({}).street.level
    expect(at({covered: true}).street.level).toBeLessThan(open * 0.5); expect(at({covered: true}).street.level).toBeGreaterThan(0)
    expect(at({talking: true}).street.level).toBeLessThan(open)
  })
  it('steps at the pace he moves, and not at all when he stands or talks', () => {
    expect(at({speed: 0}).stepEvery).toBe(0)
    expect(at({speed: 2, talking: true}).stepEvery).toBe(0)
    expect(at({speed: 2}).stepEvery).toBeGreaterThan(at({speed: 5, sprinting: true}).stepEvery)
  })
})
