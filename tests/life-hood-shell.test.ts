/**
 * LIFE · the hood game shell: the flow machine, conversations that open the job only through a choice, the kit bag,
 * the district map drawn from the level, save/continue that never crashes without storage, and the colours the shell prints.
 */
import {describe, expect, it} from 'vitest'
import {CORE_CLUB_IDS, loadClub} from '@/lib/clubs/resolver'
import {clubLife} from '@/lib/clubs/life/pack'
import {hoodLevel, type HoodClub} from '@/lib/life/hood/level'
import {acceptJob, hoodBot, lineFor, personNear, startHood, stepHood} from '@/lib/life/hood/run'
import {accentFor, brandAccent, CREAM, LIME, NAVY, cleanName, clockText, contrast, initialShell, reduce, simRuns, type Shell, type ShellEvent} from '@/lib/life/hood/shell'
import {advance, choose, scriptKeys, talkScript, type TalkCtx} from '@/lib/life/hood/talk'
import {bagOf, carryOf} from '@/lib/life/hood/bag'
import {districtModel, hudTarget, jobPlaces, metresTo, placeNear, ringProgress} from '@/lib/life/hood/district'
import {clearSave, parseSave, readSave, readSettings, restore, saveKey, snapshot, writeSave, writeSettings, type Store} from '@/lib/life/hood/save'
import {hoodWord, type HoodKey} from '@/lib/life/hood/words'
import {isYellowHex} from '@/lib/isYellow'
import {bannedColour} from '@/lib/life/rush-render/colour'

async function clubOf(id: string): Promise<HoodClub> {
  const club = await loadClub(id)
  if (!club) throw new Error(`no club ${id}`)
  const pack = clubLife(club.data)
  return {id, skin: pack.skin, cast: pack.cast}
}
const run = (s: Shell, ...es: ShellEvent[]) => es.reduce(reduce, s)
const booted = (hasSave = false) => run(initialShell, {t: 'booted', hasSave})

describe('shell · the flow', () => {
  it('boots to the title, a new life goes name → intro → playing', () => {
    let s = booted()
    expect(s.screen).toBe('title')
    s = run(s, {t: 'new'}); expect(s.screen).toBe('name')
    s = run(s, {t: 'name', name: '  Nikos  '}); expect(s.screen).toBe('intro'); expect(s.name).toBe('Nikos')
    s = run(s, {t: 'introDone'}); expect(s.screen).toBe('playing'); expect(s.hasSave).toBe(true)
  })
  it('continue needs a save', () => {
    expect(run(booted(false), {t: 'continue'}).screen).toBe('title')
    expect(run(booted(true), {t: 'continue'}).screen).toBe('playing')
  })
  it('playing ⇄ pause, map and bag open from either and go back to where they came from', () => {
    const p = run(booted(true), {t: 'continue'})
    expect(run(p, {t: 'open', to: 'pause'}, {t: 'resume'}).screen).toBe('playing')
    expect(run(p, {t: 'open', to: 'map'}, {t: 'back'}).screen).toBe('playing')
    const viaPause = run(p, {t: 'open', to: 'pause'}, {t: 'open', to: 'bag'})
    expect(viaPause.screen).toBe('bag')
    expect(run(viaPause, {t: 'back'}).screen).toBe('pause')
    // map ↔ bag keeps the first origin
    expect(run(viaPause, {t: 'open', to: 'map'}, {t: 'back'}).screen).toBe('pause')
  })
  it('settings and help open from the title and the pause menu and return there', () => {
    expect(run(booted(), {t: 'open', to: 'settings'}, {t: 'back'}).screen).toBe('title')
    const p = run(booted(true), {t: 'continue'}, {t: 'open', to: 'pause'}, {t: 'open', to: 'help'})
    expect(p.screen).toBe('help'); expect(run(p, {t: 'esc'}).screen).toBe('pause')
    expect(run(booted(), {t: 'open', to: 'pause'}).screen).toBe('title')
  })
  it('a talk and the job-done cutscene and card all return to playing; the sim runs only in playing', () => {
    const p = run(booted(true), {t: 'continue'})
    expect(simRuns(run(p, {t: 'talk'}).screen)).toBe(false)
    expect(run(p, {t: 'talk'}, {t: 'talkEnd'}).screen).toBe('playing')
    const c = run(p, {t: 'jobDone'}); expect(c.screen).toBe('cutscene')
    expect(run(c, {t: 'cutDone'}).screen).toBe('jobdone')
    expect(run(c, {t: 'cutDone'}, {t: 'cardDone'}).screen).toBe('playing')
    expect(run(c, {t: 'esc'}).screen).toBe('jobdone')
  })
  it('Esc: pauses, resumes, leaves every panel and every talk, skips the intro, steps back from the name', () => {
    const p = run(booted(true), {t: 'continue'})
    expect(run(p, {t: 'esc'}).screen).toBe('pause')
    expect(run(p, {t: 'esc'}, {t: 'esc'}).screen).toBe('playing')
    expect(run(p, {t: 'talk'}, {t: 'esc'}).screen).toBe('playing')
    expect(run(booted(), {t: 'new'}, {t: 'esc'}).screen).toBe('title')
    expect(run(booted(), {t: 'new'}, {t: 'name', name: 'A'}, {t: 'esc'}).screen).toBe('playing')
  })
  it('quit goes to the title; an event that does not fit changes nothing', () => {
    expect(run(booted(true), {t: 'continue'}, {t: 'open', to: 'pause'}, {t: 'quit'}).screen).toBe('title')
    expect(run(booted(), {t: 'resume'}, {t: 'talkEnd'}, {t: 'cardDone'}, {t: 'quit'}).screen).toBe('title')
    expect(run(initialShell, {t: 'new'}).screen).toBe('boot')
  })
  it('a name is cleaned: no markup, no long strings', () => {
    expect(cleanName('<b>Dim</b>itris   the   Great Wall of China')).toBe('bDimbitris the')
    expect(cleanName('x'.repeat(40)).length).toBe(14)
    expect(cleanName('')).toBe('')
  })
  it('the street clock moves and wraps', () => {
    expect(clockText(0)).toBe('17:40'); expect(clockText(240)).toBe('18:40'); expect(clockText(4 * 60 * 7)).toBe('00:40')
  })
})

describe('shell · the colours', {timeout: 60_000}, () => {
  it('the lime is not yellow', () => { expect(isYellowHex(LIME)).toBe(false); expect(isYellowHex(CREAM)).toBe(false); expect(isYellowHex(NAVY)).toBe(false) })
  for (const id of CORE_CLUB_IDS) it(`${id}: the brand accent and the in-game accent are allowed, not yellow, and readable on the navy`, async () => {
    const {skin} = await clubOf(id)
    const b = brandAccent(skin), a = accentFor(skin)
    for (const c of [b, a.accent]) { expect(isYellowHex(c), c).toBe(false); expect(bannedColour(c, skin), c).toBe(false); expect(contrast(c, NAVY), c).toBeGreaterThanOrEqual(3) }
    expect(contrast(a.on, a.accent)).toBeGreaterThanOrEqual(3)
  })
})

describe('shell · conversations', {timeout: 60_000}, () => {
  it('the offer is A / B: "I\'ll get them" carries the accept effect, "Later" does not and leaves the job idle', async () => {
    const r = startHood(hoodLevel(await clubOf('olympiacos'), 1)), j = r.level.hood!.jobs[0]!
    const ctx: TalkCtx = {job: r.job, giver: j.giver, offerKey: j.offerKey}
    const s = talkScript('dad', j.offerKey, ctx)
    expect(s.nodes[s.start]!.choices?.length).toBe(2)
    const yes = choose(s, s.start, 0), no = choose(s, s.start, 1)
    expect(yes.effect).toBe('accept'); expect(yes.node?.line).toBe('hood.say.dad.accepted')
    expect(no.effect).toBeNull(); expect(no.node?.line).toBe('hood.say.dad.later')
    expect(advance(s, yes.node!.id).node).toBeNull()
    expect(r.job).toBe('idle')
    acceptJob(r); expect(r.job).toBe('active')
    expect(acceptJob(r)).toEqual([])
  })
  it('first contact never starts the job; the offer line is given by the world and the job opens by the choice only', async () => {
    const r = startHood(hoodLevel(await clubOf('hapoel-tel-aviv'), 1)), dad = r.level.hood!.people.find(p => p.id === 'dad')!
    r.sim.x = dad.x + 1.2; r.sim.z = dad.z
    expect(personNear(r)?.id).toBe('dad')
    const ev = stepHood(r, {x: 0, z: 0, sprint: false, act: true})
    expect(ev.find(e => e.k === 'say')).toMatchObject({key: 'hood.say.dad.offer'})
    expect(ev.some(e => e.k === 'job')).toBe(false); expect(r.job).toBe('idle')
  })
  it('a line without choices ends on a tap; every key of every script has words; a talk can always be left', async () => {
    const r = startHood(hoodLevel(await clubOf('celtic'), 1)), j = r.level.hood!.jobs[0]!
    const ctx: TalkCtx = {job: 'idle', giver: j.giver, offerKey: j.offerKey}
    const keys = ['hood.say.mate.idle', 'hood.say.kiosk.idle', 'hood.say.neighbour.idle', 'hood.say.mate.scarf', j.offerKey, j.againKey, j.doneKey]
    for (const k of keys) {
      const who = k.split('.')[2] as 'dad'
      const s = talkScript(who, k, ctx)
      for (const key of scriptKeys(s)) expect(hoodWord(key as HoodKey), key).not.toBe(key)
      const n = s.nodes[s.start]!
      if (!n.choices) expect(advance(s, s.start).node).toBeNull()
      else for (let i = 0; i < n.choices.length; i++) { const c = choose(s, s.start, i); if (c.node) expect(advance(s, c.node.id).node).toBeNull() }
    }
    // the person's world line is the one the script opens on
    expect(lineFor(r, r.level.hood!.people[0]!)).toBe(j.offerKey)
  })
})

describe('shell · kit bag', {timeout: 60_000}, () => {
  it('starts with a worn scarf, an empty ticket slot, a locked pass and a bag; the job adds batteries and Dad’s scarf, handing over clears them', async () => {
    const r = startHood(hoodLevel(await clubOf('olympiacos'), 1))
    let b = bagOf(carryOf(r), true)
    expect(b.map(i => [i.id, i.state])).toEqual([['scarf', 'owned'], ['ticket', 'empty'], ['pass', 'locked'], ['bag', 'owned']])
    expect(b[0]!.worn).toBe(true); expect(bagOf(carryOf(r), false)[0]!.worn).toBe(false)
    let n = 0
    while (r.job !== 'done' && n++ < 60 * 600) {
      const ev = stepHood(r, hoodBot(r)); if (ev.some(e => e.k === 'say' && e.key === 'hood.say.dad.offer')) acceptJob(r)
      if (r.job === 'active') { const c = carryOf(r); b = bagOf(c, true); if (c.batteries === 2 && !c.dadsScarf) break }
    }
    expect(b.find(i => i.id === 'batteries')?.count).toBe(2)
    while (r.job !== 'done' && n++ < 60 * 600) { const ev = stepHood(r, hoodBot(r)); if (r.job === 'active' && carryOf(r).dadsScarf) { b = bagOf(carryOf(r), true); expect(b.some(i => i.id === 'dads-scarf')).toBe(true); break }; void ev }
    while (r.job !== 'done' && n++ < 60 * 600) stepHood(r, hoodBot(r))
    expect(carryOf(r)).toEqual({batteries: 0, dadsScarf: false})
    for (const i of bagOf({batteries: 1, dadsScarf: true}, true)) { expect(hoodWord(i.nameKey), i.nameKey).not.toBe(i.nameKey); expect(hoodWord(i.descKey), i.descKey).not.toBe(i.descKey) }
  })
})

describe('shell · district map', {timeout: 60_000}, () => {
  it('is drawn from the level: every street, the six places inside the bounds, blocks clear of the places, deterministic', async () => {
    const l = hoodLevel(await clubOf('hapoel-tel-aviv'), 3), m = districtModel(l)
    expect(m.streets.length).toBe(l.areas.length)
    expect(m.places.map(p => p.id).sort()).toEqual(['corner', 'ground', 'home', 'kiosk', 'pitch', 'school'])
    for (const p of m.places) { expect(p.x).toBeGreaterThanOrEqual(m.bounds.x); expect(p.x).toBeLessThanOrEqual(m.bounds.x + m.bounds.w); expect(p.y).toBeGreaterThanOrEqual(m.bounds.y); expect(p.y).toBeLessThanOrEqual(m.bounds.y + m.bounds.h); expect(hoodWord(p.key)).not.toBe(p.key); expect(hoodWord(p.descKey), p.descKey).not.toBe(p.descKey) }
    expect(m.blocks.length).toBeGreaterThan(8)
    expect(JSON.stringify(districtModel(l))).toBe(JSON.stringify(m))
    for (const bl of m.blocks) for (const s of m.streets) { const hit = bl.x < s.x + s.w && bl.x + bl.w > s.x && bl.y < s.y + s.h && bl.y + bl.h > s.y; if (hit && s.w < 30) expect(hit, 'a block on the main street').toBe(false) }
  })
  it('a tap finds the nearest place within reach and nothing beyond it', async () => {
    const l = hoodLevel(await clubOf('olympiacos'), 1), m = districtModel(l), k = m.places.find(p => p.id === 'kiosk')!
    expect(placeNear(m, k.x + 2, k.y + 1, 8)?.id).toBe('kiosk')
    expect(placeNear(m, 0, 40, 3)).toBeNull()
  })
  it('the first job stop is marked: Dad’s door before the job, the next step during it', async () => {
    const r = startHood(hoodLevel(await clubOf('olympiacos'), 1))
    expect([...jobPlaces(r)]).toEqual(['home'])
    acceptJob(r); expect([...jobPlaces(r)]).toEqual(['kiosk'])
    expect(districtModel(r.level, r).places.find(p => p.id === 'kiosk')!.job).toBe(true)
  })
  it('the HUD arrow follows the waypoint first, then the job step, then nothing; a waypoint is never walked for him', async () => {
    const r = startHood(hoodLevel(await clubOf('olympiacos'), 1))
    expect(hudTarget(r, null)).toBeNull()
    const g = r.level.hood!.places.find(p => p.id === 'ground')!
    expect(hudTarget(r, 'ground')).toMatchObject({x: g.x, z: g.z, kind: 'waypoint'})
    acceptJob(r)
    expect(hudTarget(r, null)?.kind).toBe('step'); expect(hudTarget(r, 'ground')?.kind).toBe('waypoint')
    const x = r.sim.x, z = r.sim.z
    for (let i = 0; i < 120; i++) stepHood(r, {x: 0, z: 0, sprint: false, act: false})
    expect(Math.hypot(r.sim.x - x, r.sim.z - z)).toBeLessThan(0.5)
    expect(metresTo(r, g)).toBeGreaterThan(300)
    expect(ringProgress(r)).toBe(0)
  })
})

describe('shell · save', {timeout: 60_000}, () => {
  const mem = (): Store & {m: Map<string, string>} => { const m = new Map<string, string>(); return {m, getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v) }, removeItem: k => { m.delete(k) }} }
  const boom: Store = {getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('full') }, removeItem: () => { throw new Error('blocked') }}
  it('round-trips a life per club and restores the run', async () => {
    const club = await clubOf('olympiacos'), r = startHood(hoodLevel(club, 1)), st = mem()
    acceptJob(r); r.sim.step = 1; r.sim.got = r.sim.got.map(() => true); r.sim.x = -3; r.sim.z = -40
    expect(writeSave(st, 'olympiacos', snapshot(r, 'Nikos', 'school', false))).toBe(true)
    expect(readSave(st, 'hapoel-tel-aviv')).toBeNull()
    const s = readSave(st, 'olympiacos')!
    expect(s).toMatchObject({name: 'Nikos', job: 'active', step: 1, waypoint: 'school', wear: false})
    const r2 = startHood(hoodLevel(club, 1)); restore(r2, s)
    expect(r2.job).toBe('active'); expect(r2.sim.step).toBe(1); expect(r2.sim.z).toBe(-40); expect(r2.sim.got.every(Boolean)).toBe(true)
    clearSave(st, 'olympiacos'); expect(readSave(st, 'olympiacos')).toBeNull()
    expect([...st.m.keys()].every(k => k.startsWith('fanlife.life.hood.'))).toBe(true)
    expect(saveKey('a')).not.toBe(saveKey('b'))
  })
  it('never crashes without storage, with a throwing store, or with garbage', () => {
    expect(readSave(null, 'x')).toBeNull(); expect(writeSave(null, 'x', parseSave('{"v":1,"job":"idle"}')!)).toBe(false)
    expect(readSave(boom, 'x')).toBeNull(); expect(writeSave(boom, 'x', parseSave('{"v":1,"job":"idle"}')!)).toBe(false)
    clearSave(boom, 'x'); clearSave(null, 'x'); writeSettings(boom, readSettings(boom)); writeSettings(null, readSettings(null))
    for (const g of ['', 'nope', '{}', '{"v":2}', '{"v":1,"job":"x"}', 'null', '[]']) expect(parseSave(g), g).toBeNull()
    expect(parseSave('{"v":1,"job":"done","step":"x","got":5,"waypoint":"moon"}')).toMatchObject({job: 'done', step: 0, got: [], waypoint: null})
    expect(readSettings(mem())).toMatchObject({sound: true, invert: false, quality: null, reduced: false})
  })
  it('settings persist', () => {
    const st = mem(); writeSettings(st, {sound: false, invert: true, quality: 'lite', reduced: true})
    expect(readSettings(st)).toEqual({sound: false, invert: true, quality: 'lite', reduced: true})
  })
})
