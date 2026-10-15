import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {MASTER, MASTER_IDS, masterChapters} from '@/lib/life/universal/screenplay/master'
import {apply, emptyState, eventsOf, meets, openChapter, type Directive} from '@/lib/life/universal/engine'
import {Runner} from '@/lib/life/universal/world'
import {lifeFlagsOf, validateChapter, validatePack} from '@/lib/life/universal/validate'
import {ROOMS} from '@/lib/life/universal/rooms'
import {buildCast} from '@/lib/life/universal/cast'
import {composeLife} from '@/lib/life/universal/compose'
import {readMasterScreenplay} from '@/lib/life/universal/master/read'
import {callbackSubsets, MAX_CALLBACKS} from '@/lib/life/universal/screenplay/compile'
import {LIFE_MASTER} from '@/lib/clubs/life/packs'
import {loadClub} from '@/lib/clubs/resolver'
import {clubLife} from '@/lib/clubs/life/pack'
import type {Chapter, LifeEvent, LifeState} from '@/lib/life/universal/types'

const BIBLE = 'docs/life/FANLIFE-LIFE-STORY-BIBLE-2026-10-15.md'
const book = readMasterScreenplay(readFileSync(BIBLE, 'utf8'), BIBLE)

function perform(chapter: Chapter, id: string, state: LifeState, choice?: string) {
  const applyNow = (events: LifeEvent[]) => { state = events.reduce(apply, state) }
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
  for (let i = 0; v && !v.done && i < 30; i++) {
    if (v.choices.length) { const pick = choice ?? v.choices[0]!.id; expect(v.choices.map(c => c.id)).toContain(pick); v = runner.choose(pick) }
    else v = runner.advance()
  }
  expect(v?.done, id).toBe(true)
  direct(runner.directives)
  return state
}
const available = (c: Chapter, id: string, s: LifeState) => c.spots.some(sp => sp.talk === `${id}:choose` && meets(s, sp.when))

/** Lives the three chapters in order, taking option `pick(scene)` in each scene. */
function live(locale: 'en' | 'he', pick: (sceneId: string, options: string[]) => string) {
  let state = emptyState()
  const chapters = masterChapters(MASTER_IDS, locale)
  for (const [i, chapter] of chapters.entries()) {
    state = openChapter(chapter).reduce(apply, state)
    for (let round = 0; round < MASTER[i]!.scenes.length; round++) {
      const scene = MASTER[i]!.scenes.find(sc => !state.flags[`story:${chapter.id}:${sc.id}:done`] && available(chapter, sc.id, state))
      if (!scene) break
      state = perform(chapter, `${scene.id}:choose`, state, pick(scene.id, scene.options.map(o => o.id)))
      expect(chapter.spots.some(sp => sp.talk === `${scene.id}:act` && meets(state, sp.when)), `task ${scene.id} reachable`).toBe(true)
      state = perform(chapter, `${scene.id}:act`, state)
    }
    expect(state.done[chapter.id], `${chapter.id} ends`).toBeTruthy()
  }
  return state
}

describe('master screenplay — F01–F03 are the chapters the bible wrote', () => {
  it('uses the bible\'s ids, titles, scene titles and ages for every chapter it authors', () => {
    expect(MASTER_IDS).toEqual(['F01', 'F02', 'F03'])
    for (const script of MASTER) {
      const src = book.chapters.find(c => c.id === script.id)!
      expect(script.title[1], script.id).toBe(src.titleHe)
      expect(script.scenes.map(s => s.id), script.id).toEqual(src.scenes.map(s => s.id))
      script.scenes.forEach((s, i) => {
        expect(s.title[1], s.id).toBe(src.scenes[i]!.titleHe)
        expect(s.options, s.id).toHaveLength(src.scenes[i]!.options.length)
      })
      expect(script.age, script.id).toBeGreaterThanOrEqual(src.window!.minAge!)
      expect(script.age, script.id).toBeLessThanOrEqual(src.window!.maxAge!)
    }
  })

  it('gives every option its own consequence — three choices open three different things', () => {
    for (const script of MASTER) for (const scene of script.scenes) {
      const sets = scene.options.map(o => JSON.stringify(o.effects ?? []))
      expect(new Set(sets).size, scene.id).toBe(3)
      const flags = scene.options.map(o => (o.effects ?? []).filter(e => e.e === 'flag').map(e => (e as {k: string; v?: unknown}).k + '=' + String((e as {v?: unknown}).v)).join())
      expect(new Set(flags).size, `${scene.id} flag outcomes`).toBe(3)
    }
  })

  it('states no year, score or opponent anywhere in either language (rule 11)', () => {
    for (const locale of ['en', 'he'] as const) for (const c of masterChapters(MASTER_IDS, locale)) {
      const text = JSON.stringify(c.talks) + c.intro + c.title
      expect(text, `${c.id} ${locale}`).not.toMatch(/\b(19|20)\d{2}\b/)
      expect(text, `${c.id} ${locale}`).not.toMatch(/\b\d{1,2}\s*[–:-]\s*\d{1,2}\b/)
    }
  })

  it('keeps callbacks within the engine limit', () => {
    for (const script of MASTER) for (const scene of script.scenes) {
      expect((scene.callbacks ?? []).length, scene.id).toBeLessThanOrEqual(MAX_CALLBACKS)
      expect(callbackSubsets(scene.callbacks ?? []).length).toBeLessThan(40)
    }
  })
})

describe('master screenplay — F01–F03 compile and play to the end in both languages', () => {
  for (const locale of ['en', 'he'] as const) {
    it(`validates clean (${locale})`, () => {
      const earlier = new Set<string>()
      for (const c of masterChapters(MASTER_IDS, locale)) {
        expect(validateChapter({rooms: ROOMS, cast: buildCast(null)}, c, earlier)).toEqual([])
        lifeFlagsOf(c).forEach(k => earlier.add(k))
      }
    })

    it(`reaches the end of all three chapters on every one of the 27 roads (${locale})`, () => {
      const outcomes = new Set<string>()
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) {
        const idx = [a, b, c]
        const state = live(locale, (_s, opts) => opts[idx[Number(_s.split('-S')[1]) - 1]!]!)
        outcomes.add(JSON.stringify(Object.entries(state.flags).filter(([k]) => k.startsWith('life:master:')).sort()))
        for (const id of MASTER_IDS) expect(state.done[id]).toBeTruthy()
      }
      expect(outcomes.size).toBeGreaterThan(20)
    })
  }

  it('lets an earlier choice change a later scene (F01 → F02)', () => {
    const lines = (kept: boolean) => {
      const chapters = masterChapters(['F01', 'F02'], 'en')
      let state = emptyState()
      state = openChapter(chapters[0]!).reduce(apply, state)
      for (const sc of MASTER[0]!.scenes) {
        state = perform(chapters[0]!, `${sc.id}:choose`, state, sc.id === 'F01-S3' ? (kept ? 'back' : 'draw') : undefined)
        state = perform(chapters[0]!, `${sc.id}:act`, state)
      }
      state = openChapter(chapters[1]!).reduce(apply, state)
      const talk = chapters[1]!.talks.find(t => t.id === 'F02-S1:choose')!
      return talk.branches.find(b => b.when === undefined || meets(state, b.when))!.lines.map(l => l.t).join(' ')
    }
    expect(lines(true)).toContain('exactly where it lived')
    expect(lines(false)).not.toContain('exactly where it lived')
  })
})

describe('master screenplay — a pack opts in, the default life does not change', () => {
  const club = {id: 'test-club', name: 'Test', city: 'Town', country: 'XX'}
  const skin = {short: 'TST'} as never
  const base = {club, skin, skinIssues: [], skinPending: [], cast: null, timeline: null, selection: null, anchors: [], dataVersion: 'none'}

  it('composes the same life with no master list as before', () => {
    const none = composeLife(base as never), empty = composeLife({...base, master: []} as never)
    expect(empty.version).toBe(none.version)
    expect(none.chapters.map(c => c.id)).not.toContain('F01')
  })

  it('adds the chapters in life order, and the whole pack still validates', () => {
    const pack = composeLife({...base, master: MASTER_IDS} as never)
    const ids = pack.chapters.map(c => c.id)
    expect(ids).toEqual(expect.arrayContaining(['F01', 'F02', 'F03']))
    expect(ids.at(-1)).toBe('finale')
    const ages = pack.chapters.map(c => c.age)
    expect([...ages].sort((a, b) => a - b)).toEqual(ages)
    expect(validatePack(pack)).toEqual([])
  })

  it('refuses a chapter nobody wrote, by name', () => {
    expect(() => composeLife({...base, master: ['F99']} as never)).toThrow('MASTER_CHAPTER_UNKNOWN:F99')
  })

  it('keeps every real club\'s life master-free until its pack is approved', async () => {
    for (const id of ['zrinjski-mostar', 'hapoel-tel-aviv']) {
      const row = LIFE_MASTER[id]
      const pack = clubLife((await loadClub(id))!.data)
      const has = pack.chapters.some(c => c.id === 'F01')
      expect(has, id).toBe(row?.status === 'approved')
    }
  }, 120_000)
})
