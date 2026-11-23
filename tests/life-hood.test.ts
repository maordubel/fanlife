/**
 * LIFE · the hood (owner decision 23.11.2026, rule life-one-engine-hood): the open neighbourhood is one connected,
 * deterministic place; the one job, "Before kick-off", can be done by a player who only walks and talks, in every core club;
 * nothing is done for him; free roam never ends; no colour a club's page may not print is on a person.
 */
import {describe, expect, it} from 'vitest'
import {CORE_CLUB_IDS, loadClub} from '@/lib/clubs/resolver'
import {clubLife} from '@/lib/clubs/life/pack'
import {hoodLevel, hoodSpec, type HoodClub} from '@/lib/life/hood/level'
import {acceptJob, hoodBot, personNear, placeAt, startHood, stepHood, type HoodEvent} from '@/lib/life/hood/run'
import {hoodWord, type HoodKey} from '@/lib/life/hood/words'
import {inArea, type Level} from '@/lib/life/rush/level'
import {IDLE, STEP} from '@/lib/life/rush/sim'
import {bannedColour} from '@/lib/life/rush-render/colour'

async function clubOf(id: string): Promise<HoodClub> {
  const club = await loadClub(id)
  if (!club) throw new Error(`no club ${id}`)
  const pack = clubLife(club.data)
  return {id, skin: pack.skin, cast: pack.cast}
}

/** every cell of the walkable union a body can step to from `from`, eight ways, on a 1 m grid */
function reach(level: Level, from: {x: number; z: number}): Set<string> {
  const key = (x: number, z: number) => `${x},${z}`, seen = new Set<string>()
  const q: [number, number][] = [[Math.round(from.x), Math.round(from.z)]]
  seen.add(key(q[0]![0], q[0]![1]))
  while (q.length) {
    const [x, z] = q.pop()!
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const nx = x + dx, nz = z + dz, k = key(nx, nz)
      if ((dx || dz) && !seen.has(k) && inArea(level, nx, nz)) { seen.add(k); q.push([nx, nz]) }
    }
  }
  return seen
}
const near = (cells: Set<string>, x: number, z: number) => { for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (cells.has(`${Math.round(x) + dx},${Math.round(z) + dz}`)) return true; return false }

describe('the hood · the place', {timeout: 60_000}, () => {
  it('is deterministic from the seed, and the seed moves the side streets', async () => {
    const c = await clubOf('hapoel-tel-aviv')
    expect(JSON.stringify(hoodLevel(c, 7))).toBe(JSON.stringify(hoodLevel(c, 7)))
    expect(hoodLevel(c, 7).crossings).not.toEqual(hoodLevel(c, 8).crossings)
  })
  it('has the home block, a main street, 3 side streets, a kiosk corner, a school gate, a pitch and the ground gate', async () => {
    const l = hoodLevel(await clubOf('olympiacos'), 1), h = l.hood!
    expect(l.crossings.length).toBeGreaterThanOrEqual(2)
    expect(h.places.map(p => p.id).sort()).toEqual(['corner', 'ground', 'home', 'kiosk', 'pitch', 'school'])
    expect(l.bounds.x1 - l.bounds.x0).toBeGreaterThan(100)
    expect(l.bounds.z1 - l.bounds.z0).toBeGreaterThan(300)
    expect(l.cars.length).toBeGreaterThan(0)
    expect(l.walkers.length).toBeGreaterThan(20)
    expect(l.standers.length).toBeGreaterThan(20)
  })
  it('is one connected walkable union: every place, person and pickup is reachable from the front door', async () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const l = hoodLevel(await clubOf('zrinjski-mostar'), seed), h = l.hood!, cells = reach(l, l.start)
      const missing = [...h.places.map(p => [p.id, p.x, p.z] as const), ...h.people.map(p => [p.id, p.x, p.z] as const), ...l.pickups.map((p, i) => [`pickup${i}`, p.x, p.z] as const), ['door', h.door.x + 1.4, h.door.z] as const, ['gate', l.goal.x, l.goal.z] as const]
        .filter(([, x, z]) => !near(cells, x, z)).map(([n]) => n)
      expect(missing, `seed ${seed}`).toEqual([])
    }
  })
  it('has the words every key the level and the jobs name', async () => {
    const l = hoodLevel(await clubOf('celtic'), 1), h = l.hood!
    const keys = [...h.places.map(p => p.key), ...l.steps.flatMap(s => [s.key, s.say ?? '']).filter(Boolean), ...h.jobs.flatMap(j => [j.titleKey, j.offerKey, j.againKey, j.doneKey])]
    for (const k of keys) expect(hoodWord(k as HoodKey), k).not.toBe(k)
  })
})

describe('the hood · Before kick-off, every core club', {timeout: 120_000}, () => {
  for (const id of CORE_CLUB_IDS) it(`${id}: the bot does the job and the hood goes on`, async () => {
    const club = await clubOf(id), failures: string[] = []
    for (const seed of [1, 2, 3]) {
      const run = startHood(hoodLevel(club, seed)), events: HoodEvent[] = []
      let n = 0
      while (run.job !== 'done' && n < 60 * 600) {
        const ev = stepHood(run, hoodBot(run)); events.push(...ev); n++
        // the offer is a conversation: the bot picks "I'll get them"
        if (ev.some(e => e.k === 'say' && e.key === 'hood.say.dad.offer')) events.push(...acceptJob(run))
      }
      if (run.job !== 'done') { failures.push(`seed ${seed}: stuck at (${run.sim.x.toFixed(1)}, ${run.sim.z.toFixed(1)}) step ${run.sim.step} after ${Math.round(run.sim.t)}s`); continue }
      const starts = events.filter(e => e.k === 'job' && e.state === 'start').length
      if (starts !== 1) failures.push(`seed ${seed}: the job started ${starts} times`)
      // the order of the world: Dad gives it, then batteries, then the scarf, then Dad
      const says = events.filter((e): e is Extract<HoodEvent, {k: 'say'}> => e.k === 'say').map(e => e.key)
      if (says[0] !== 'hood.say.dad.offer' || !says.includes('hood.say.mate.scarf') || says.at(-1) !== 'hood.say.dad.thanks') failures.push(`seed ${seed}: the talk went ${says.join(' > ')}`)
      if (events.filter(e => e.k === 'pickup').length !== 2) failures.push(`seed ${seed}: not two batteries`)
      // free roam never ends: after the job the hood keeps running, nothing ends, a stick still moves him
      for (let i = 0; i < 600; i++) stepHood(run, {x: 1, z: 0, sprint: false, act: false})
      if (run.sim.ended) failures.push(`seed ${seed}: the sim ended (${run.sim.ended})`)
      if (run.job !== 'done') failures.push(`seed ${seed}: the job came undone`)
    }
    expect(failures, failures.join('\n')).toEqual([])
  }, 120_000)
})

describe('the hood · nothing is done for him', {timeout: 60_000}, () => {
  it('a bot that walks everywhere but never presses talk finishes nothing', async () => {
    const run = startHood(hoodLevel(await clubOf('hapoel-tel-aviv'), 1))
    const dad = run.level.hood!.people.find(q => q.id === 'dad')!
    for (let i = 0; i < 60 * 90; i++) stepHood(run, {...hoodBot(run), act: false})
    expect(Math.hypot(run.sim.x - dad.x, run.sim.z - dad.z)).toBeLessThan(2.2)
    expect(run.job).toBe('idle')
    expect(run.sim.step).toBe(run.level.steps.length)
  })
  it('standing still for ten minutes starts no job, takes nothing and ends nothing', async () => {
    const run = startHood(hoodLevel(await clubOf('hapoel-tel-aviv'), 1))
    const events: HoodEvent[] = []
    for (let i = 0; i < 60 * 600; i++) events.push(...stepHood(run, IDLE))
    expect(run.job).toBe('idle')
    expect(run.sim.ended).toBeNull()
    expect(run.sim.got.some(Boolean)).toBe(false)
    expect(events.filter(e => e.k !== 'place' && e.k !== 'hit')).toEqual([])
  })
  it('walking over the batteries before a job is given takes nothing; the job only opens by talking to Dad', async () => {
    const run = startHood(hoodLevel(await clubOf('hapoel-tel-aviv'), 1)), p = run.level.pickups[0]!
    run.sim.x = p.x; run.sim.z = p.z
    for (let i = 0; i < 120; i++) stepHood(run, IDLE)
    expect(run.sim.got[0]).toBe(false)
    const dad = run.level.hood!.people.find(q => q.id === 'dad')!
    run.sim.x = dad.x + 1.2; run.sim.z = dad.z
    expect(personNear(run)?.id).toBe('dad')
    stepHood(run, IDLE)
    expect(run.job).toBe('idle')
    const ev = stepHood(run, {...IDLE, act: true})
    // talking is only the offer: the job opens on the accept choice
    expect(ev.some(e => e.k === 'say' && e.key === 'hood.say.dad.offer')).toBe(true)
    expect(run.job).toBe('idle')
    acceptJob(run)
    expect(run.job).toBe('active')
  })
  it('talking to the others never locks him: he can always walk away mid-conversation', async () => {
    const run = startHood(hoodLevel(await clubOf('hapoel-tel-aviv'), 1))
    const k = run.level.hood!.people.find(q => q.id === 'kiosk')!
    run.sim.x = k.x + 1.3; run.sim.z = k.z
    const ev = stepHood(run, {...IDLE, act: true})
    expect(ev.some(e => e.k === 'say')).toBe(true)
    const x0 = run.sim.x
    for (let i = 0; i < 60; i++) stepHood(run, {x: 1, z: 0, sprint: false, act: false})
    expect(run.sim.x).toBeGreaterThan(x0 + 1)
  })
  it('names the place he stands in', async () => {
    const l = hoodLevel(await clubOf('hapoel-tel-aviv'), 1)
    expect(placeAt(l, l.start.x, l.start.z)?.id).toBe('home')
    expect(placeAt(l, l.goal.x, l.goal.z)?.id).toBe('ground')
  })
  it('keeps the RUSH clock out of it: a day of play never reaches the end of the clock', async () => {
    const run = startHood(hoodLevel(await clubOf('hapoel-tel-aviv'), 1))
    for (let i = 0; i < 60 * 120; i++) stepHood(run, IDLE)
    expect(run.sim.clock).toBeGreaterThan(9_000_000)
    expect(hoodSpec('x', 1).template).toBe('hood')
    expect(STEP).toBeGreaterThan(0)
  })
})

describe('the hood · colour', {timeout: 60_000}, () => {
  for (const id of CORE_CLUB_IDS) it(`${id}: no person wears a colour the club's page may not print`, async () => {
    const club = await clubOf(id), bad: string[] = []
    for (const p of hoodLevel(club, 1).hood!.people) for (const [part, hex] of Object.entries(p.look.hex ?? {})) if (hex && bannedColour(hex, club.skin)) bad.push(`${p.id}.${part} ${hex}`)
    expect(bad).toEqual([])
  })
})
