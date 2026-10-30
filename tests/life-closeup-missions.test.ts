/**
 * LIFE · RUSH close-up missions (rule 132): a mission is a scene you walk INTO — a flat gone through drawer by drawer,
 * a hall crossed in the gaps between a mother's looks — not a fixed run. And the bodies in TOWN keep a shoulder off
 * the furniture (rule 131).
 */
import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {buildLevel, inArea, type Level, type SearchKind} from '@/lib/life/rush/level'
import {botInput, IDLE, nearSearch, startSim, stepSim, stepTarget, STEP, type Input} from '@/lib/life/rush/sim'
import {flatSight, HOME_TEMPLATES} from '@/lib/life/rush/flat'
import {viaPoint} from '@/lib/life/rush/level'
import {rushWord} from '@/lib/life/rush/words'
import {MISSION_TEMPLATES} from '@/lib/life/rush/templates'
import type {MissionSpec} from '@/lib/life/rush/spec'

const spec = (template: string, seed: number, difficulty: 0 | 1 | 2 = 1): MissionSpec => {
  const t = MISSION_TEMPLATES.find(x => x.id === template)!
  return {template, verb: t.verb, seed, difficulty, clock: t.clock, hazards: [...t.hazards], time: 'day', weather: 'clear', camera: t.camera} as unknown as MissionSpec
}
const play = (l: Level, pick: (l: Level, s: ReturnType<typeof startSim>) => Input = botInput, secs = 400) => {
  const s = startSim(l)
  for (let n = 0; !s.ended && n < secs * 60; n++) stepSim(l, s, pick(l, s), STEP)
  return s
}
/** a player who knows the house but not the people in it: walks the honest way, never waits for a look */
const naive = (l: Level, s: ReturnType<typeof startSim>): Input => {
  const g = stepTarget(l, s) ?? l.goal, d = Math.hypot(g.x - s.x, g.z - s.z)
  if (s.searchI >= 0) return IDLE
  if (d < 0.55 && l.searches.some((q, i) => !s.searched[i] && q.x === g.x && q.z === g.z)) return {...IDLE, act: true}
  const v = viaPoint(l, s, g), dx = v.x - s.x, dz = v.z - s.z, m = Math.hypot(dx, dz) || 1
  return {x: dx / m, z: dz / m, sprint: false, act: false}
}

describe('close-up home missions', () => {
  it('one template per scene, each its own job', () => {
    expect([...HOME_TEMPLATES]).toEqual(['flat-run', 'tin-hunt', 'ticket-hunt', 'night-window', 'pack-bag'])
    for (const id of HOME_TEMPLATES) expect(buildLevel(spec(id, 1)).place).toBe('flat')
  })

  for (const id of HOME_TEMPLATES) it(`${id}: every seed and difficulty is won by a player who does not know which drawer`, () => {
    for (let seed = 1; seed <= 12; seed++) for (const d of [0, 1, 2] as const) {
      const l = buildLevel(spec(id, seed, d))
      for (const q of l.searches) expect(inArea(l, q.x, q.z), `${id} ${q.kind} stands on the floor`).toBe(true)
      expect(play(l).ended, `${id} seed ${seed} d${d}`).toBe('good')
    }
  })

  it('what is hidden is never shown: the compass points at the places it might be, and the seed moves it', () => {
    const where = new Set<string>()
    for (let seed = 1; seed <= 20; seed++) {
      const l = buildLevel(spec('tin-hunt', seed)), s = startSim(l)
      const tin = l.pickups.find(p => p.kind === 'tin')!
      expect(tin.inside).toBeTypeOf('number')
      where.add(l.searches[tin.inside!]!.kind)
      const tg = stepTarget(l, s)!
      expect(l.searches.some(q => q.x === tg.x && q.z === tg.z), 'the compass points at a place to search').toBe(true)
      // walking over the place does not give it: only going through it does
      s.x = tin.x; s.z = tin.z
      stepSim(l, s, IDLE, STEP)
      expect(s.got[l.pickups.indexOf(tin)]).toBe(false)
    }
    expect(where.size).toBeGreaterThan(2)
  })

  it('a search is close up: tap, keep still, and it is done — walk away and it is not', () => {
    const l = buildLevel(spec('ticket-hunt', 3)), s = startSim(l)
    const q = l.searches[0]!
    s.x = q.x; s.z = q.z
    expect(nearSearch(l, s)).toBe(0)
    stepSim(l, s, {...IDLE, act: true}, STEP)
    expect(s.searchI).toBe(0)
    stepSim(l, s, {x: 1, z: 0, sprint: false, act: false}, STEP)
    expect(s.searchI, 'walking away lets go').toBe(-1)
    stepSim(l, s, {...IDLE, act: true}, STEP)
    for (let n = 0; n < Math.ceil(q.secs * 60) + 2; n++) stepSim(l, s, IDLE, STEP)
    expect(s.searched[0]).toBe(true)
  })

  it('night-window: the looks matter — walk straight through and you are sent back; wait for them and you are not', () => {
    let naiveCaught = 0, botCaught = 0
    for (let seed = 1; seed <= 10; seed++) {
      const l = buildLevel(spec('night-window', seed))
      expect(l.house?.night).toBe(true)
      naiveCaught += play(l, naive, 200).caught
      botCaught += play(l).caught
    }
    expect(naiveCaught).toBeGreaterThan(5)
    expect(botCaught).toBe(0)
  })

  it('a look stops at a wall', () => {
    expect(flatSight({x: -9.5, z: 1}, {x: 4.5, z: 1.3}), 'through the open door').toBe(true)
    expect(flatSight({x: -9.5, z: 1}, {x: 4.5, z: -8}), 'not through the wall').toBe(false)
  })

  it('every place and every new thing has words in both languages', () => {
    const kinds: SearchKind[] = ['drawer', 'fridge', 'table', 'sideboard', 'cushion', 'armchair', 'shoes', 'coat', 'bed', 'wardrobe', 'desk', 'toybox', 'bowl']
    for (const lang of ['en', 'he'] as const) {
      for (const k of kinds) expect(rushWord(lang, `search.${k}` as never)).not.toMatch(/^search\./)
      for (const k of ['tin', 'ticket', 'shoes', 'sandwich', 'money', 'phonecard']) expect(rushWord(lang, `got.${k}` as never)).not.toMatch(/^got\./)
      for (const id of HOME_TEMPLATES) for (const o of ['good', 'ok', 'slip']) expect(rushWord(lang, `res.${o}.sub.${id}` as never)).not.toMatch(/^res\./)
    }
  })

  it('each episode plays its scene where the story is, and a film follows it', () => {
    const at: [string, string, string][] = [['e1', 'flat-run', 'e1-delivered'], ['e2', 'tin-hunt', 'e2-tin'], ['e3', 'ticket-hunt', 'e3-envelope'], ['e5', 'night-window', 'e5-ledge'], ['e6', 'pack-bag', 'e6-packed']]
    for (const [ep, tpl, cine] of at) {
      const src = readFileSync(`lib/life/universal/season/${ep}.ts`, 'utf8')
      expect(src, `${ep} plays ${tpl}`).toContain(`mission: {template: '${tpl}'}`)
      expect(src, `${ep} shows ${cine}`).toContain(`cine('${cine}')`)
      expect(src, `${ep} defines ${cine}`).toContain(`id: '${cine}'`)
    }
  })
})

describe('TOWN: nobody walks through the furniture (rule 131)', () => {
  const play = readFileSync('public/life/town/play.js', 'utf8')
  it('furniture keeps a whole shoulder off it, and is squeezed before it is ever given back', () => {
    expect(play).toMatch(/BODY=\.55/)
    expect(play).toMatch(/AUTO\.forEach\(function\(r\)\{var p=r\[4\]==null\?BODY:r\[4\]/)
    expect(play).toContain('r[4]=SQUEEZE')
    // the old rule dropped every piece near a door, a person or the spawn, whole
    expect(play).not.toContain('return out.filter(function(r){return!keep.some')
  })
  it('floor nobody can walk to is sealed, and a person standing in a piece steps out of it', () => {
    expect(play).toContain('b[k]=2')
    expect(play).toContain('nobody stands inside a piece')
  })
})
