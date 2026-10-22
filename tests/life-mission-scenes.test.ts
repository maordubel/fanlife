/**
 * The three scenes the owner approved on 22.10.2026 that hand the player to the big nights:
 * title-night (F04, "Lost on the grass"), cup-final-trip (F17, "The lay-by"), derby-banner-raid (R-TER, "Their storeroom").
 * Each is a real scene with three ways out; one way asks RUSH for the mission, the others finish the scene without it.
 */
import {describe, expect, it} from 'vitest'
import {loadClub} from '@/lib/clubs/resolver'
import {clubLife} from '@/lib/clubs/life/pack'
import {masterChapters, MASTER} from '@/lib/life/universal/screenplay/master'
import {simulate} from '@/lib/life/universal/sim'
import type {Effect} from '@/lib/life/universal/types'

const SCENES = [
  {chapter: 'F04', scene: 'F04-S4', template: 'title-night', ask: 'search', quiet: ['waited', 'steward']},
  {chapter: 'F17', scene: 'F17-S4', template: 'cup-final-trip', ask: 'drive', quiet: ['stop', 'passenger']},
  {chapter: 'R-TER', scene: 'R-TER-S5', template: 'derby-banner-raid', ask: 'go', quiet: ['lookout', 'declined']},
] as const

type Play = Extract<Effect, {e: 'play'}>
const plays = (fx: readonly Effect[] | undefined, out: Play[] = []): Play[] => { for (const e of fx ?? []) if (e.e === 'play') { out.push(e); plays(e.then, out) } return out }
const flagsIn = (fx: readonly Effect[] | undefined, out: string[] = []): string[] => { for (const e of fx ?? []) { if (e.e === 'flag') out.push(`${e.k}=${String(e.v ?? true)}`); if (e.e === 'play') flagsIn(e.then, out) } return out }

describe('LIFE · three scenes that hand you the big nights', () => {
  for (const sc of SCENES) for (const locale of ['en', 'he'] as const) it(`${sc.scene} (${locale}): one way asks for ${sc.template}, the others finish the scene without a mission`, () => {
    const ch = masterChapters([sc.chapter], locale)[0]!
    const branches = ch.talks.flatMap(t => t.branches)
    const mine = branches.flatMap(b => plays(b.then)).filter(p => p.mission && p.id === `${sc.scene}:${sc.ask}`)
    expect(mine.length, 'the mission option').toBeGreaterThan(0)
    for (const p of mine) {
      expect(p.mission!.template).toBe(sc.template)
      expect(p.mission!.mandatory).toBe(false)
      // without RUSH the choice still happens: its `then` carries the decision
      expect(flagsIn(p.then)).toContain(`life:decision:${sc.scene}=${sc.ask}`)
    }
    for (const q of sc.quiet) {
      const done = branches.filter(b => flagsIn(b.then).includes(`life:decision:${sc.scene}=${q}`))
      expect(done.length, `${sc.scene}.${q} finishes`).toBeGreaterThan(0)
      for (const b of done) expect(plays(b.then).some(p => p.mission), `${sc.scene}.${q} asks for no mission`).toBe(false)
    }
  })

  it('the banner raid is only on the terrace route, the other two are in every life', () => {
    const by = (id: string) => MASTER.find(c => c.id === id)!
    expect(by('R-TER').when, 'R-TER is a route a life is invited into').toBeTruthy()
    expect(by('F04').when).toBeFalsy()
    expect(by('F17').when).toBeFalsy()
  })

  it('a life that stayed home in F04 never meets the pitch, and both chapters still finish however they are played', async () => {
    const stay = MASTER.find(c => c.id === 'F04')!.scenes.find(x => x.id === 'F04-S2')!.options.find(o => o.id === 'skip')!
    expect(stay.skip, 'staying home skips the pitch').toContain('F04-S4')
    const pack = clubLife((await loadClub('aek-athens'))!.data)
    for (const id of ['F04', 'F17']) {
      const ch = pack.chapters.find(c => c.id === id)!
      const r = simulate(pack, ch, [], id === 'F04' ? 400000 : undefined)
      if (id === 'F04') expect(r.truncated, 'F04 still closes').toBe(false)
      expect(r.stuck, id).toEqual([])
      expect(r.endings.length, id).toBeGreaterThan(0)
    }
  }, 180000)
})
