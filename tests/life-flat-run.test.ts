/**
 * LIFE · the run at home (delta 90-F): the first mission a six-year-old plays is a run through his own flat, the
 * change of engine is directed (a dive in, a countdown, a landing back out), the scene after it is a film of the two
 * of them on the sofa, and every body in TOWN and RUSH walks and runs on captured human motion.
 */
import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {buildLevel, inArea, routeMetres} from '@/lib/life/rush/level'
import {FLAT_DOORS, FLAT_ROOMS, flatRoomsAt} from '@/lib/life/rush/flat'
import {botInput, COST, IDLE, startSim, stepSim} from '@/lib/life/rush/sim'
import {templateById} from '@/lib/life/rush/templates'
import {RUSH_WORDS} from '@/lib/life/rush/words'
import type {MissionSpec} from '@/lib/life/rush/spec'
import {E1} from '@/lib/life/universal/season/e1'
import {gaitPose, GAIT_SOURCE, sample} from '@/lib/life/motion/gait'

const read = (p: string) => readFileSync(p, 'utf8')
const spec = (seed = 1, difficulty: 0 | 1 | 2 = 0): MissionSpec => {
  const t = templateById('flat-run')!
  return {template: t.id, verb: t.verb, camera: t.camera, route: t.route, seed, skin: 'test', age: 6, time: 'day', weather: 'clear', clock: t.clock, hazards: [...t.hazards], difficulty, mandatory: false, anchor: null, title: '', brief: ''}
}

describe('the run at home: the flat', () => {
  it('is a home: four rooms and a hall joined by doors, every room reachable, every thing in it on the floor you can stand on', () => {
    const l = buildLevel(spec())
    expect(l.place).toBe('flat')
    expect(l.rooms.map(r => r.id).sort()).toEqual(FLAT_ROOMS.map(r => r.id).sort())
    for (const d of FLAT_DOORS) { expect(inArea(l, d.ax, d.az), `${d.a}→${d.b} in front`).toBe(true); expect(inArea(l, d.bx, d.bz), `${d.a}→${d.b} behind`).toBe(true) }
    expect(inArea(l, l.start.x, l.start.z)).toBe(true)
    expect(inArea(l, l.goal.x, l.goal.z)).toBe(true)
    for (const p of l.pickups) { expect(flatRoomsAt(p.x, p.z).length, p.kind).toBeGreaterThan(0); expect(routeMetres(l, l.start, p), p.kind).toBeLessThan(80) }
    // furniture is never walked through
    for (const b of l.blocks) expect(inArea(l, (b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2), b.kind).toBe(false)
  })

  it('asks for the scarf and both batteries in any order, then the radio by Dad — with extras worth a few seconds', () => {
    const l = buildLevel(spec())
    expect(l.steps.map(s => s.kind)).toEqual(['collect', 'goal'])
    expect(l.pickups.filter(p => p.step === 0).map(p => p.kind).sort()).toEqual(['battery', 'battery', 'scarf'])
    expect(l.pickups.filter(p => p.step === null).length).toBeGreaterThanOrEqual(2)
    for (const s of l.steps) expect(RUSH_WORDS.en, s.key).toHaveProperty(s.key)
    for (const v of l.voice) { expect(v.t, v.key).toBeGreaterThan(0); expect(RUSH_WORDS.he[v.key as keyof typeof RUSH_WORDS.he], v.key).toBeTruthy() }
  })

  it('is won by a steady walk at every difficulty and seed, and lost by standing still', () => {
    for (const d of [0, 1, 2] as const) for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const l = buildLevel(spec(seed, d)), s = startSim(l)
      let n = 0
      while (!s.ended && n < 60 * 300) { stepSim(l, s, botInput(l, s)); n++ }
      expect(s.ended, `seed ${seed} difficulty ${d}`).toBe('good')
      const idle = startSim(l)
      while (!idle.ended) stepSim(l, idle, IDLE)
      expect(idle.ended).toBe('slip')
    }
  })

  it('a toy is nothing at a walk and a fall at a sprint; the cat and Mum are only in the way — until you run into them', () => {
    const l = buildLevel(spec())
    const toy = l.trips[0]!
    const walk = startSim(l); walk.x = toy.x; walk.z = toy.z + 0.4; walk.heading = Math.PI
    for (let i = 0; i < 30; i++) stepSim(l, walk, {x: 0, z: -0.6, sprint: false, act: false})
    expect(walk.hits).toBe(0)
    const run = startSim(l); run.x = toy.x; run.z = toy.z + 1.2; run.heading = Math.PI
    let tripped = false
    for (let i = 0; i < 60 && !tripped; i++) { stepSim(l, run, {x: 0, z: -1, sprint: true, act: false}); tripped = run.events.some(e => e.k === 'hit' && e.by === 'trip') }
    expect(tripped).toBe(true)
    expect(COST.trip).toBeLessThan(COST.car)
    for (const k of ['ev.trip', 'ev.cat', 'ev.mum'] as const) { expect(RUSH_WORDS.en[k]).toBeTruthy(); expect(RUSH_WORDS.he[k]).toBeTruthy() }
  })

  it('fits every club (it needs nothing from an archive) and is a child’s mission', () => {
    const t = templateById('flat-run')!
    expect(t.needs).toEqual([])
    expect(t.ages[0]).toBeLessThanOrEqual(E1.age)
    expect(t.ages[1]).toBeGreaterThanOrEqual(E1.age)
    expect(t.route).toBe('main')
  })
})

describe('Episode 1 is played, then filmed', () => {
  const prep = E1.steps.find(s => s.id === 'prep')!
  it('the batteries and the scarf are one run through the flat, with the small game where RUSH cannot play', () => {
    expect(prep.mission?.template).toBe('flat-run')
    expect(prep.game).toBeTruthy()
    expect(prep.at).toEqual({room: 'room', who: 'dad', slot: 'sofa'})
    // missing kick-off is the other life (the neighbour's balcony), never a dead end
    expect(JSON.stringify(prep.reward?.slip)).toContain('s1:S1E1:late')
    expect(prep.show?.some(e => e.e === 'cine' && e.id === 'e1-delivered')).toBe(true)
  })
  it('after the radio: a scene of the two of them on the sofa, then the goal — he sits beside his father and is lifted to the ceiling', () => {
    const listen = E1.steps.find(s => s.id === 'listen')!
    expect(listen.show?.map(e => e.e === 'cine' ? e.id : '')).toEqual(['e1-together', 'e1-goal'])
    const cines = Object.fromEntries((E1.cines ?? []).map(c => [c.id, c]))
    const acts = (id: string) => cines[id]!.shots.flatMap(s => s.act ?? [])
    expect(acts('e1-together').some(a => a.do === 'sit' && 'by' in a && a.by === 'dad')).toBe(true)
    expect(acts('e1-goal').some(a => a.do === 'lift' && a.who === 'dad')).toBe(true)
    expect(cines['e1-together']!.shots.length).toBeGreaterThanOrEqual(5)
  })
  it('the day engine can seat him, lift him and put everyone back when the scene ends', () => {
    const play = read('public/life/town/play.js')
    for (const k of ["a.do==='sit'", "a.do==='lift'", "a.do==='stand'", 'unpose()']) expect(play, k).toContain(k)
    expect(play).toMatch(/if\(!o\)\{CINE=null;unpose\(\)/)
  })
})

describe('the flat is drawn, not boxed', () => {
  it('ships its furniture as kiln models and its floors as loom tiles, every block a model of its own footprint', () => {
    const glb = readFileSync('public/life/rush/models/home.glb').toString('latin1')
    for (const m of ['sofa', 'armchair', 'table_low', 'sideboard', 'radio', 'counter', 'fridge', 'table', 'chair', 'bed', 'wardrobe', 'desk', 'shoes', 'lamp_floor', 'plant', 'bookshelf']) expect(glb, m).toContain(`"name":"${m}"`)
    for (const t of ['boards', 'tiles', 'carpet']) for (const k of ['albedo', 'height', 'rough']) expect(readFileSync(`public/life/rush/tex/${t}-${k}.webp`).length, `${t}-${k}`).toBeGreaterThan(0)
    const flat = read('lib/life/rush-render/flat.ts')
    for (const b of buildLevel(spec()).blocks) expect(flat, b.kind).toContain(`${/-/.test(b.kind) ? `'${b.kind}'` : b.kind}: {m:`)
    // the floor, the walls and the club colours: no tile carries a rival's colour (the kitchen checker is neutral)
    expect(read('scripts/life/rush/home.tx.js')).not.toMatch(/#b9573c/i)
  })
})

describe('the change of engine is directed', () => {
  it('TOWN dives at him before RUSH and lands back after; RUSH counts down while the camera comes down from the crane', () => {
    const play = read('public/life/town/play.js'), game = read('components/clubs/life/LifeGame.tsx'), host = read('components/clubs/life/rush/RushHost.tsx')
    expect(play).toContain('dive:function()'); expect(play).toContain('land:function()')
    expect(game).toContain('srt()?.dive?.()'); expect(game).toContain('srt()?.land?.()'); expect(game).toContain('data-life="warp"')
    expect(host).toContain("['3', '2', '1', 'GO']")
    // the clock does not run during the countdown
    expect(host).toContain('acc += introT.current > 0 ? 0 : real')
    // a briefing with no card shows the place itself from the crane
    expect(host).toContain('data-scene={!card}')
    expect(read('lib/life/rush-render/stage.ts')).toContain('view.brief')
  })
})

describe('captured motion', () => {
  const m = JSON.parse(read('public/life/town/mocap.json')) as {source: string; samples: number; clips: Record<string, Record<string, number[]> & {strides: number}>}
  it('is the CMU database, credited, averaged over many strides of real walks and runs', () => {
    expect(m.source).toMatch(/CMU/)
    expect(read('public/life/town/REALISM-ASSETS.md')).toContain('mocap.json')
    expect(GAIT_SOURCE.walk.strides).toBeGreaterThanOrEqual(10)
    expect(GAIT_SOURCE.run.strides).toBeGreaterThanOrEqual(4)
    for (const c of Object.values(m.clips)) for (const k of ['thigh_l', 'thigh_r', 'knee_l', 'knee_r', 'arm_l', 'arm_r', 'elbow_l', 'elbow_r', 'pelvisYaw', 'torsoYaw', 'torsoLean', 'bob']) expect(c[k], k).toHaveLength(m.samples)
  })
  it('loops without a hitch, and says what a walk and a run are: a run swings further, bends the knee more, leans in and pumps the arms', () => {
    for (const clip of ['walk', 'run'] as const) for (const k of ['thigh_l', 'knee_l', 'arm_r'] as const) expect(Math.abs(sample(clip, k, 0) - sample(clip, k, 0.999)), `${clip} ${k}`).toBeLessThan(0.12)
    const range = (clip: 'walk' | 'run', k: 'thigh_l' | 'knee_l') => { const v = Array.from({length: 48}, (_, i) => sample(clip, k, i / 48)); return [Math.min(...v), Math.max(...v)] as const }
    expect(range('run', 'knee_l')[1]).toBeGreaterThan(range('walk', 'knee_l')[1] + 0.3)
    expect(range('walk', 'thigh_l')[1] - range('walk', 'thigh_l')[0]).toBeGreaterThan(0.5)
    expect(gaitPose(0.3, 1).lean).toBeGreaterThan(gaitPose(0.3, 0).lean + 0.1)
    expect(Math.abs(gaitPose(0.3, 1).elbowL)).toBeGreaterThan(Math.abs(gaitPose(0.3, 0).elbowL) + 0.6)
    // the two legs are half a stride apart
    expect(Math.abs(sample('walk', 'thigh_l', 0.1) - sample('walk', 'thigh_r', 0.6))).toBeLessThan(0.12)
  })
  it('drives the people of TOWN and the figures of RUSH, with the drawn cycle kept as the fallback', () => {
    expect(read('public/life/town/kit.js')).toContain('PP.gait(u,w,sv,armOut(u))')
    expect(read('public/life/town/people.js')).toContain("fetch('/life/town/mocap.json')")
    expect(read('lib/life/rush-render/figure.ts')).toContain('gaitPose(ph / (Math.PI * 2), run)')
  })
})
