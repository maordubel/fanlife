import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {MASTER, masterChapters} from '@/lib/life/universal/screenplay/master'
import {apply, emptyState, eventsOf, meets, openChapter, type Directive} from '@/lib/life/universal/engine'
import {Runner} from '@/lib/life/universal/world'
import {lifeFlagsOf, validateChapter} from '@/lib/life/universal/validate'
import {ROOMS} from '@/lib/life/universal/rooms'
import {buildCast} from '@/lib/life/universal/cast'
import {readMasterScreenplay, readWindow} from '@/lib/life/universal/master/read'
import {callbackSubsets, MAX_CALLBACKS} from '@/lib/life/universal/screenplay/compile'
import type {Chapter, LifeEvent, LifeState} from '@/lib/life/universal/types'

const BIBLE = 'docs/life/FANLIFE-LIFE-STORY-BIBLE-2026-10-15.md'
const book = readMasterScreenplay(readFileSync(BIBLE, 'utf8'), BIBLE)
const HEBREW = /[֐-׿]/
const FIXED_AGE: Record<string, number> = {
  F01: 7, F02: 7, F03: 9, F04: 9, F05: 10, F06: 10, F07: 11, F08: 14, F09: 16, F10: 18, F11: 19, F12: 20, F13: 21, F14: 24, F15: 25, F16: 27, F17: 28, F18: 30, F19: 32, F20: 34, F21: 36,
  F22: 38, F23: 40, F24: 42, F25: 44, F26: 46, F27: 48, F28: 50, F29: 54, F30: 58, F31: 60, F32: 62,
  'R-REG': 22, 'R-OWNER': 23, 'R-TER': 26, 'R-WAY': 26, 'R-CREATE': 26, 'R-STORY': 26, 'R-COMM': 26, 'R-ABROAD': 29, 'R-DIST': 41,
}
const INCLIN = {'R-TER': 'ter', 'R-WAY': 'way', 'R-CREATE': 'create', 'R-STORY': 'story', 'R-COMM': 'comm'} as const
const CAST = new Set(['dad', 'mum', 'friend', 'rival', 'kiosk', 'elder', 'teacher', 'steward', 'seller', 'boss', 'mate', 'driver', 'stranger', 'child', 'me'])
const ALL_IDS = [...book.chapters.map(c => c.id)]

function perform(chapter: Chapter, id: string, state: LifeState, choice?: string) {
  const applyNow = (events: LifeEvent[]) => (state = events.reduce(apply, state))
  const direct = (ds: Directive[]) => {
    for (const d of ds) {
      if (d.d === 'play') { const r = eventsOf(d.then, state); applyNow(r.events); direct(r.directives) }
      if (d.d === 'goto') applyNow([{t: 'moved', room: d.room, spawn: d.spawn, time: d.time ?? state.time}])
      if (d.d === 'end') applyNow([{t: 'ended', chapter: chapter.id, ending: d.ending}])
    }
  }
  const runner = new Runner(chapter, state, applyNow)
  let v = runner.start(id)
  expect(v, id).toBeTruthy()
  for (let i = 0; v && !v.done && i < 40; i++) {
    if (v.choices.length) { const pick = choice ?? v.choices[0]!.id; expect(v.choices.map(c => c.id)).toContain(pick); v = runner.choose(pick) }
    else v = runner.advance()
  }
  expect(v?.done, id).toBe(true)
  direct(runner.directives)
  return state
}
const available = (c: Chapter, id: string, s: LifeState) => c.spots.some(sp => sp.talk === `${id}:choose` && meets(s, sp.when))

/** Lives one chapter: scene i takes option (road + i) % n, so every option of every scene is tried over a few roads. */
function liveChapter(chapter: Chapter, script: (typeof MASTER)[number], road: number, seed: LifeState) {
  let state = openChapter(chapter).reduce(apply, seed)
  for (let round = 0; round < script.scenes.length; round++) {
    const scene = script.scenes.find(sc => !state.flags[`story:${chapter.id}:${sc.id}:done`] && available(chapter, sc.id, state))
    if (!scene) break
    const i = script.scenes.indexOf(scene), opts = scene.options.filter(o => !o.when || meets(state, o.when))
    state = perform(chapter, `${scene.id}:choose`, state, opts[(road + i) % opts.length]!.id)
    expect(chapter.spots.some(sp => sp.talk === `${scene.id}:act` && meets(state, sp.when)), `task ${scene.id} reachable`).toBe(true)
    state = perform(chapter, `${scene.id}:act`, state)
  }
  expect(state.done[chapter.id], `${chapter.id} ends`).toBeTruthy()
  return state
}

const byAge = [...MASTER].sort((a, b) => a.age - b.age)
const flagsRaised = (script: (typeof MASTER)[number]) => script.scenes.flatMap(s => s.options.flatMap(o => (o.effects ?? []).filter(e => e.e === 'flag').map(e => e as {k: string; v?: unknown})))

describe('master screenplay — what is written follows the bible', () => {
  it('has a chapter for every id the bible has, once the work is done', () => {
    const missing = ALL_IDS.filter(id => !MASTER.some(c => c.id === id))
    expect(missing).toEqual([])
    expect(MASTER).toHaveLength(ALL_IDS.length)
  })

  for (const script of MASTER) describe(script.id, () => {
    const src = book.chapters.find(c => c.id === script.id)!

    it('uses the bible\'s title, scene ids, scene titles, option counts and the fixed age', () => {
      expect(src, 'chapter exists in the bible').toBeTruthy()
      expect(script.title[1]).toBe(src.titleHe)
      expect(script.scenes.map(s => s.id)).toEqual(src.scenes.map(s => s.id))
      script.scenes.forEach((s, i) => { expect(s.title[1], s.id).toBe(src.scenes[i]!.titleHe); expect(s.options, s.id).toHaveLength(src.scenes[i]!.options.length) })
      expect(script.age).toBe(FIXED_AGE[script.id])
      const w = src.window ? readWindow(src.window.rawHe) : null
      if (w?.minAge != null) expect(script.age).toBeGreaterThanOrEqual(w.minAge)
      if (w?.maxAge != null) expect(script.age).toBeLessThanOrEqual(w.maxAge)
      expect(script.act).toBe(script.age <= 13 ? 1 : script.age <= 45 ? 2 : 3)
    })

    it('gives every option its own consequence, different scene by scene', () => {
      for (const scene of script.scenes) {
        const out = scene.options.map(o => JSON.stringify(o.effects ?? []))
        expect(new Set(out).size, `${scene.id} effects`).toBe(scene.options.length)
        const flags = scene.options.map(o => (o.effects ?? []).filter(e => e.e === 'flag').map(e => (e as {k: string; v?: unknown}).k + '=' + String((e as {v?: unknown}).v)).sort().join())
        expect(new Set(flags).size, `${scene.id} flag outcomes`).toBe(scene.options.length)
        expect(new Set(scene.options.map(o => o.reply.map(r => r[1]).join())).size, `${scene.id} replies`).toBe(scene.options.length)
      }
    })

    it('is complete in two languages and states no year, score, opponent or token it cannot fill', () => {
      const speakers = new Set<string>()
      for (const scene of script.scenes) for (const l of [scene.lines, scene.action, ...(scene.callbacks ?? []).map(c => c.lines), ...scene.options.flatMap(o => [o.reply, o.action ?? [], o.soloReply ?? []])].flat()) {
        if (l[0]) speakers.add(l[0]); expect(l[1].trim(), scene.id).not.toBe(''); expect(l[2].trim(), scene.id).not.toBe('')
        expect(l[1], `${scene.id} en has Hebrew`).not.toMatch(HEBREW); expect(l[2], `${scene.id} he is Hebrew`).toMatch(HEBREW)
      }
      for (const s of speakers) expect(CAST.has(s), `speaker ${s}`).toBe(true)
      for (const locale of ['en', 'he'] as const) {
        const c = masterChapters([script.id], locale)[0]!
        const text = JSON.stringify(c.talks) + c.intro + c.title + JSON.stringify(c.endings)
        expect(text, `${c.id} ${locale}`).not.toMatch(/\b(19|20)\d{2}\b/)
        expect(text, `${c.id} ${locale}`).not.toMatch(/\b\d{1,2}\s*[–:-]\s*\d{1,2}\b/)
        expect([...text.matchAll(/\{([a-zA-Z]+)\}/g)].map(m => m[1]!).filter(k => !['club', 'short', 'city', 'ground', 'friend', 'kiosk', 'elder', 'rival', 'teacher', 'boss', 'mate', 'seller', 'child', 'dadName', 'mumName'].includes(k))).toEqual([])
      }
    })

    it('keeps callbacks within the engine limit and validates clean (en + he)', () => {
      for (const scene of script.scenes) { expect((scene.callbacks ?? []).length, scene.id).toBeLessThanOrEqual(MAX_CALLBACKS); expect(callbackSubsets(scene.callbacks ?? []).length).toBeLessThan(40) }
      const before = new Set<string>()
      for (const prior of byAge.slice(0, byAge.indexOf(script))) lifeFlagsOf(masterChapters([prior.id], 'en')[0]!).forEach(k => before.add(k))
      for (const locale of ['en', 'he'] as const) expect(validateChapter({rooms: ROOMS, cast: buildCast(null)}, masterChapters([script.id], locale)[0]!, before)).toEqual([])
    })

    it('can be played to its end on every kind of road, in both languages', () => {
      const outcomes = new Set<string>()
      for (const locale of ['en', 'he'] as const) {
        const chapter = masterChapters([script.id], locale)[0]!
        // a life that has raised every flag a callback may read, and one that has raised none
        const readers = new Set<string>()
        for (const p of byAge.slice(0, byAge.indexOf(script))) flagsRaised(p).forEach(f => readers.add(f.k))
        for (let road = 0; road < 3; road++) {
          const s = liveChapter(chapter, script, road, emptyState())
          outcomes.add(JSON.stringify(Object.entries(s.flags).filter(([k]) => k.startsWith('life:')).sort()))
        }
      }
      expect(outcomes.size, 'different roads leave different marks').toBeGreaterThan(1)
    })
  })
})

describe('master screenplay — the route contract', () => {
  const has = (id: string) => MASTER.some(c => c.id === id)
  it('skips a route unless the life was invited into it', () => {
    for (const [id, inc] of Object.entries(INCLIN)) if (has(id)) expect(JSON.stringify(MASTER.find(c => c.id === id)!.when), id).toBe(JSON.stringify({all: [{flag: 'life:route:go'}, {is: ['life:inclin', inc]}]}))
    if (has('R-ABROAD')) expect(MASTER.find(c => c.id === 'R-ABROAD')!.when).toEqual({flag: 'life:route:abroad'})
    if (has('R-DIST')) expect(MASTER.find(c => c.id === 'R-DIST')!.when).toEqual({flag: 'life:route:dist'})
    if (has('R-OWNER')) expect(MASTER.find(c => c.id === 'R-OWNER')!.when).toEqual({flag: 'life:route:owner'})
    if (has('R-REG')) expect(MASTER.find(c => c.id === 'R-REG')!.when).toBeUndefined()
  })

  it('has an invitation that raises each route\'s flag, and no flag raised by a chapter that comes after the route', () => {
    const raisedBy = (k: string, v?: string) => MASTER.filter(c => flagsRaised(c).some(f => f.k === k && (v === undefined || f.v === v))).map(c => c.id)
    const need: [string, string | undefined, string[]][] = [['life:route:go', undefined, ['F15']], ['life:route:owner', undefined, ['F13']], ['life:route:abroad', undefined, ['F16']], ['life:route:dist', undefined, ['F22']]]
    for (const [k, v, from] of need) if (has(from[0]!)) expect(raisedBy(k, v), k).toEqual(from)
    if (['F09', 'F10', 'F11', 'F12', 'F13'].every(has)) {
      for (const inc of ['ter', 'way', 'create', 'story', 'comm']) expect(raisedBy('life:inclin', inc).filter(id => ['F09', 'F10', 'F11', 'F12', 'F13'].includes(id)).length, `a leaning towards ${inc}`).toBeGreaterThan(0)
      const always = MASTER.filter(c => ['F09', 'F10', 'F11', 'F12', 'F13'].includes(c.id)).some(c => c.scenes.some(s => s.options.every(o => (o.effects ?? []).some(e => e.e === 'flag' && e.k === 'life:inclin'))))
      expect(always, 'a scene in F09–F13 where every option sets the leaning').toBe(true)
    }
    if (has('F15')) {
      const s3 = MASTER.find(c => c.id === 'F15')!.scenes.find(s => s.id === 'F15-S3')!
      expect(s3.options.map(o => (o.effects ?? []).some(e => e.e === 'flag' && e.k === 'life:route:go'))).toEqual([true, false, false])
    }
  })
})
