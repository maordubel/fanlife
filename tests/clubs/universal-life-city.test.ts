/** LIFE, universal — the town, the nights, the people: what the map may show and what a walk may cost. */
import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {CORE_CLUB_IDS, loadClub} from '@/lib/clubs/resolver'
import {clubLife} from '@/lib/clubs/life/pack'
import {chapterOf, Life, type LifeStore} from '@/lib/life/universal/engine'
import {cityOf, routeTo, SITES} from '@/lib/life/universal/city'
import {readMatch} from '@/lib/life/universal/match'
import type {LifePack} from '@/lib/life/universal/types'
import {throughDoor} from '@/lib/life/universal/world'

const mem = (): LifeStore => { const d = new Map<string, string>(); return {read: k => d.get(k) ?? null, write: (k, v) => { d.set(k, v) }, clear: k => { d.delete(k) }} }
const cache = new Map<string, LifePack>()
const packOf = async (id: string) => { if (!cache.has(id)) cache.set(id, clubLife((await loadClub(id))!.data)); return cache.get(id)! }

describe('reading a recorded match', () => {
  it('reads a scoreline with the club on either side, and refuses what it cannot be sure of', () => {
    expect(readMatch('Red Town 2–1 Blue City · cup final', ['Red Town'])).toMatchObject({us: 'home', result: 'won', note: 'cup final'})
    expect(readMatch('Blue City 3–3 Red Town', ['Red Town'])).toMatchObject({us: 'away', result: 'drew'})
    expect(readMatch('Blue City 0–1 Green FC', ['Red Town'])).toBeNull()
    expect(readMatch('A season to remember', ['Red Town'])).toBeNull()
  })
})

describe.each(CORE_CLUB_IDS)('%s — the town', id => {
  it('has a layout, reveals only what was walked, and routes through open doors', async () => {
    const pack = await packOf(id), life = Life.load(pack, mem())
    life.begin()
    const ch = chapterOf(pack, life.state.chapter)!
    for (const p of cityOf(pack, ch, life.state).places) expect(SITES[p.id]).toBeTruthy()
    const city = cityOf(pack, ch, life.state)
    expect(city.places.filter(p => p.status === 'here')).toHaveLength(1)
    // nothing he has not stood in or been pointed at is named
    for (const p of city.places.filter(p => p.status === 'hidden')) { expect(p.people).toEqual([]); expect(p.offers).toEqual([]) }
    // every reachable place is reached by doors that exist, one `moved` each
    for (const p of city.places) {
      if (!p.route.ok) continue
      let s = life.state
      for (const d of p.route.doors) { expect(d.room).toBeTruthy(); expect(throughDoor({to: d.to, spawn: d.spawn, time: null}, s).ok).toBe(true) }
      expect(routeTo(pack, ch, life.state, p.id)).toEqual(p.route)
      void s
    }
  })
  it('introduces a person once, and walking a street marks it seen', async () => {
    const pack = await packOf(id), life = Life.load(pack, mem())
    life.begin()
    const who = Object.keys(pack.cast)[0]!
    life.dispatch({t: 'met', who}, {t: 'met', who})
    expect(life.state.met.filter(w => w === who)).toHaveLength(1)
    const ch = chapterOf(pack, life.state.chapter)!
    const door = ch.doors.find(d => d.room === life.state.room && !d.needs)
    if (door) { life.dispatch({t: 'moved', room: door.to, spawn: door.spawn, time: life.state.time}); expect(life.state.seen).toContain(door.to) }
  })
  it('gives its centrepiece night a readable match', async () => {
    const pack = await packOf(id)
    const c = pack.chapters.find(x => x.centrepiece)
    if (c) { expect(c.anchor?.match).toBeTruthy(); expect(c.anchor?.on === null || typeof c.anchor?.on === 'string').toBe(true) }
  })
})

describe('copy', () => {
  it('has the same keys in English and Hebrew, none empty', () => {
    const en = JSON.parse(readFileSync('messages/life-universal/en.json', 'utf8')), he = JSON.parse(readFileSync('messages/life-universal/he.json', 'utf8'))
    expect(Object.keys(he).sort()).toEqual(Object.keys(en).sort())
    for (const v of [...Object.values(en), ...Object.values(he)]) expect(String(v).length).toBeGreaterThan(0)
  })
})

describe('the club\'s own match record', () => {
  it('prints starters from the record, and scorers only when the record lists every goal', async () => {
    const pack = await packOf('zrinjski-mostar')
    const seen = pack.chapters.flatMap(c => c.anchor?.match?.detail ? [c.anchor.match] : [])
    for (const m of seen) {
      expect(m.detail!.lineup.length).toBeGreaterThan(0)
      const ours = m.us === 'home' ? m.homeGoals : m.awayGoals
      expect(m.detail!.scorers.length === 0 || m.detail!.scorers.length === ours).toBe(true)
    }
  })
})
