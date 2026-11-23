/**
 * LIFE · the hood — the story director (rule life-story-watch).
 *
 * What this holds: there is ALWAYS a mission in front of the supporter (seeded random lives for every core club),
 * every branch converges and every life reaches the Box, the week walks to matchday, every word a mission prints
 * exists, the words carry no date, score or club, and a mission becomes the hood's own job shape.
 */
import {describe, expect, it} from 'vitest'
import {CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {rng, type Level} from '@/lib/life/rush/level'
import type {Fit} from '@/lib/life/rush/fit'
import type {HoodMeta} from '@/lib/life/hood/types'
import type {ArchiveRef} from '@/lib/life/universal/types'
import {
  accept, ahead, chapter, CHILDHOOD, CHILDHOOD_SIDES, CHILDHOOD_SPINE, endDay, isFinished, manifestOf, MATCHDAY, MISSIONS, missionById, newLife, nextMissions,
  nightFor, chapterFits, objectiveKey, resolve, SPINE, STAGES, STANDING, stepsOf, STORY_WORDS, storyWord, toHoodJob, transitionRequests, waits, walkAway, type StoryEvent, type StoryState,
} from '@/lib/life/hood/story'

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0 }

/** one whole life with every pick made by the seed; throws the moment nothing is offered */
function live(seed: number, cap = 600): {state: StoryState; turns: number; events: StoryEvent[]; path: string[]} {
  const r = rng(seed)
  let s = newLife(), turns = 0
  const events: StoryEvent[] = [], path: string[] = []
  while (!isFinished(s)) {
    if (++turns > cap) throw new Error(`life ${seed} did not finish in ${cap} turns (chapter ${chapter(s)})`)
    const offers = nextMissions(s)
    expect(offers.length, `seed ${seed} turn ${turns}: nothing offered`).toBeGreaterThan(0)
    for (const o of offers) expect(o.approaches.length, `${o.mission.id} has no way to do it`).toBeGreaterThan(0)
    // now and then he just goes home for the day; the week still moves
    if (r() < 0.08) { s = endDay(s).state; continue }
    const o = offers[Math.floor(r() * offers.length)]!
    const how = o.approaches[Math.floor(r() * o.approaches.length)]!
    s = accept(s, o.mission.id, how.id)
    expect(nextMissions(s).map(x => x.mission.id)).toEqual([o.mission.id])
    if (r() < 0.05) { s = walkAway(s); continue }
    const cs = o.mission.complication?.choices ?? []
    const out = resolve(s, cs.length ? cs[Math.floor(r() * cs.length)]!.id : undefined)
    s = out.state; events.push(...out.events); path.push(`${o.mission.id}/${how.id}`)
  }
  return {state: s, turns, events, path}
}

describe('the story graph', () => {
  it('is well formed: unique ids, a spine that names real main missions, 2–4 approaches, a complication, a way through', () => {
    expect(new Set(MISSIONS.map(m => m.id)).size).toBe(MISSIONS.length)
    expect(SPINE).toBe(CHILDHOOD_SPINE)
    expect(SPINE.flat().sort()).toEqual(CHILDHOOD.map(m => m.id).sort())
    expect(CHILDHOOD.length).toBeGreaterThanOrEqual(8)
    for (const m of CHILDHOOD) {
      expect(m.kind, m.id).toBe('main')
      expect(m.age, m.id).toBeGreaterThanOrEqual(6); expect(m.age, m.id).toBeLessThanOrEqual(12)
      expect(m.approaches.length, m.id).toBeGreaterThanOrEqual(2); expect(m.approaches.length, m.id).toBeLessThanOrEqual(4)
      // two ways are always open, whatever he did before and however little he has
      expect(m.approaches.filter(a => !a.needs).length, m.id).toBeGreaterThanOrEqual(2)
      expect(m.complication!.choices.length, m.id).toBeGreaterThanOrEqual(2)
      expect(new Set(m.approaches.map(a => a.id)).size, m.id).toBe(m.approaches.length)
    }
    // ages never go backwards along the spine, and a fork's two sides are the same age
    const ages = SPINE.map(slot => { const a = slot.map(id => missionById(id)!.age); expect(new Set(a).size).toBe(1); return a[0]! })
    expect([...ages].sort((x, y) => x - y)).toEqual(ages)
    for (const m of [...CHILDHOOD_SIDES, ...STANDING]) expect(m.approaches.length, m.id).toBeGreaterThanOrEqual(1)
    // the standing work is open to anyone at any time: it is what makes "always a mission" true
    for (const m of STANDING) { expect(m.needs, m.id).toBeUndefined(); expect(m.approaches.some(a => !a.needs), m.id).toBe(true) }
    expect(STAGES.map(s => s.id)).toEqual(['child', 'teen', 'young', 'adult'])
  })

  it('prints only words that exist, and the words hold no date, no score and no club', () => {
    const need = new Set<string>()
    for (const m of MISSIONS) {
      const k = `story.m.${m.id}`
      for (const s of ['title', 'offer', 'again', 'done', 'aftermath']) need.add(`${k}.${s}`)
      for (const a of m.approaches) { need.add(`${k}.a.${a.id}`); for (const st of stepsOf(m, a.id)) { need.add(objectiveKey(st)); if (st.do === 'talk') need.add(st.say) } }
      if (m.complication) { need.add(`${k}.c`); for (const c of m.complication.choices) need.add(`${k}.c.${c.id}`) }
      for (const e of [...m.aftermath, ...m.approaches.flatMap(a => a.effects), ...(m.complication?.choices.flatMap(c => c.effects) ?? [])]) if ('keep' in e) need.add(`story.keep.${e.keep}`)
    }
    for (const s of STAGES) need.add(`story.stage.${s.id}`)
    for (let d = 0; d <= MATCHDAY; d++) need.add(`story.day.${d}`)
    const missing = [...need].filter(k => !(k in STORY_WORDS))
    expect(missing).toEqual([])
    for (const [k, v] of Object.entries(STORY_WORDS)) {
      expect(v, k).not.toMatch(/\b(18|19|20)\d{2}\b/) // no year
      expect(v, k).not.toMatch(/\b\d+\s*[–—-]\s*\d+\b/) // no scoreline
      expect(v, k).not.toMatch(/[֐-׿Ͱ-Ͽ]/) // universal text is one language
      expect(v, k).not.toMatch(/shekel|agorot|bloomfield|tel aviv|hapoel|maccabi|celtic|olympiacos/i)
    }
    expect(storyWord('story.o.talk.mate', {mate: 'Sam'})).toBe('Find Sam')
  })
})

describe('a life', () => {
  it('opens on matchday with the first chapter, and a chapter that waits for matchday leaves the week\'s work in front of him', () => {
    let s = newLife()
    expect(nextMissions(s).filter(o => o.why === 'main').map(o => o.mission.id)).toEqual(['first-noise'])
    s = resolve(accept(s, 'first-noise', 'kiosk-first'), 'run').state
    expect(s.day).toBe(0); expect(s.week).toBe(2); expect(s.age).toBe(7); expect(s.keeps).toContain('scarf')
    s = resolve(accept(s, 'six-short', 'crates'), 'dad').state
    // the way in is a matchday chapter: until then, never nothing
    expect(ahead(s).map(m => m.id)).toEqual(['the-way-in'])
    expect(waits(s)).toBe(MATCHDAY - s.day)
    let guard = 0
    while (waits(s) > 0) {
      const offers = nextMissions(s)
      expect(offers.length).toBeGreaterThan(0)
      expect(offers.some(o => o.why === 'standing')).toBe(true)
      expect(offers.some(o => o.why === 'main')).toBe(false)
      const o = offers.find(x => x.why === 'standing')!
      s = resolve(accept(s, o.mission.id, o.approaches[0]!.id)).state
      expect(++guard).toBeLessThan(8)
    }
    expect(s.day).toBe(MATCHDAY)
    expect(nextMissions(s)[0]!.mission.id).toBe('the-way-in')
  })

  it('forks and converges: either side of the fork closes the other and both lead to the same next chapter', () => {
    const upTo = (pick: string, how: string) => {
      let s = newLife()
      for (const [id, a] of [['first-noise', 'scarf-first'], ['six-short', 'bottles']] as const) s = resolve(accept(s, id, a)).state
      while (waits(s) > 0) s = endDay(s).state
      s = resolve(accept(s, 'the-way-in', 'with-dad')).state
      expect(nextMissions(s).filter(o => o.why === 'main').map(o => o.mission.id).sort()).toEqual(['monday-colours', 'the-window'])
      return resolve(accept(s, pick, how)).state
    }
    const a = upTo('monday-colours', 'open'), b = upTo('the-window', 'own-up')
    for (const s of [a, b]) {
      expect(s.flags['story:street-knows']).toBe(true)
      expect(ahead(s).map(m => m.id)).toEqual(['missing-square'])
      expect(nextMissions(s).some(o => o.mission.id === 'monday-colours' || o.mission.id === 'the-window')).toBe(false)
    }
    expect(a.flags['story:age-9']).toBe('school'); expect(b.flags['story:age-9']).toBe('window')
  })

  it('never lets an accepted mission strand him, and refuses what was not offered', () => {
    const s = newLife()
    expect(() => accept(s, 'the-box', 'gather')).toThrow(/STORY_NOT_OFFERED/)
    expect(() => accept(s, 'first-noise', 'nope')).toThrow(/STORY_APPROACH/)
    const open = accept(s, 'first-noise', 'next-door')
    expect(() => accept(open, 'old-photo', 'look')).toThrow(/STORY_OPEN/)
    expect(walkAway(open)).toEqual(s)
    // an answer nobody wrote takes the first choice: the mission still ends
    const out = resolve(open, 'not-a-choice')
    expect(out.state.open).toBeNull(); expect(out.state.flags['story:met:first-noise']).toBe('run')
    expect(out.events.map(e => e.k)).toEqual(expect.arrayContaining(['kept', 'aftermath', 'watch', 'bridge', 'week']))
  })

  it.each(CORE_CLUB_IDS.map(id => [id]))('%s: twenty seeded random lives always have a mission in front of them and always reach the Box', id => {
    for (let n = 0; n < 20; n++) {
      const seed = hash(`${id}#${n}`)
      const a = live(seed), b = live(seed)
      expect(b.path, `${id} #${n} is not deterministic`).toEqual(a.path)
      expect(isFinished(a.state)).toBe(true)
      expect(a.state.age).toBe(12)
      expect(a.state.keeps).toEqual(expect.arrayContaining(['scarf', 'shirt', 'ticket', 'album', 'box']))
      expect(a.state.flags['story:box-started']).toBe(true)
      expect(a.state.money).toBeGreaterThanOrEqual(0)
      expect(a.events.some(e => e.k === 'stage-end' && e.stage === 'child')).toBe(true)
      // one side of the fork, never both
      expect(a.state.done.filter(d => d === 'monday-colours' || d === 'the-window').length).toBe(1)
      // the written life is over; the street is not: there is still something to do, for ever
      let s = a.state
      for (let i = 0; i < 12; i++) { const o = nextMissions(s); expect(o.length).toBeGreaterThan(0); s = resolve(accept(s, o[0]!.mission.id, o[0]!.approaches[0]!.id)).state }
    }
  })

  it('reaches every approach and every complication choice across the seeds', () => {
    const seen = new Set<string>()
    for (let n = 0; n < 400; n++) { const l = live(hash(`cover#${n}`)); l.path.forEach(p => seen.add(p)); for (const [k, v] of Object.entries(l.state.flags)) if (k.startsWith('story:met:')) seen.add(`${k.slice(10)}?${v}`) }
    const want = CHILDHOOD.flatMap(m => [...m.approaches.map(a => `${m.id}/${a.id}`), ...m.complication!.choices.map(c => `${m.id}?${c.id}`)])
    expect(want.filter(w => !seen.has(w))).toEqual([])
  })
})

/* a level with only what the adapter reads */
const hood: HoodMeta = {
  people: (['dad', 'mate', 'kiosk', 'neighbour'] as const).map((id, i) => ({id, name: null, role: id, x: i * 3, z: -i * 20, r: 2.2, look: {} as never})),
  places: (['home', 'kiosk', 'corner', 'school', 'pitch', 'ground'] as const).map((id, i) => ({id, key: `hood.place.${id}`, x: -i * 5, z: -i * 50, r: 10})),
  jobs: [], door: {x: 0, z: 0}, kiosk: {x: 0, z: 0}, school: {x: 0, z: 0}, pitch: {x: 0, z: 0, w: 1, d: 1},
}
const level = {steps: [{}, {}, {}], hood} as unknown as Level

describe('a mission as a hood job', () => {
  it('becomes the hood\'s own job shape for every approach, on real people and places, ending on the same step', () => {
    for (const m of MISSIONS) {
      const ends = new Set<string>()
      for (const a of m.approaches) {
        const {job, steps, pickups} = toHoodJob(level, m, a.id)
        expect(job).toMatchObject({id: m.id, approach: a.id, giver: m.giver, from: 3, steps: steps.length, titleKey: `story.m.${m.id}.title`, offerKey: `story.m.${m.id}.offer`, againKey: `story.m.${m.id}.again`, doneKey: `story.m.${m.id}.done`})
        expect(steps.length).toBe(a.steps.length + 1)
        for (const s of steps) { expect(['talk', 'reach', 'collect']).toContain(s.kind); expect(Number.isFinite(s.x) && Number.isFinite(s.z) && s.r > 0, `${m.id}/${a.id}`).toBe(true); expect(s.key in STORY_WORDS).toBe(true) }
        // every pickup belongs to a collect step of THIS job
        for (const p of pickups) { expect(p.step).toBeGreaterThanOrEqual(3); expect(steps[p.step! - 3]!.kind).toBe('collect') }
        expect(steps.filter(s => s.kind === 'collect').every((_, i, all) => pickups.some(p => steps[p.step! - 3] === all[i]))).toBe(true)
        const last = steps[steps.length - 1]!
        ends.add(`${last.kind}@${last.x},${last.z}`)
      }
      expect(ends.size, `${m.id} does not converge`).toBe(1)
    }
    expect(() => toHoodJob({steps: [], hood: null} as unknown as Level, CHILDHOOD[0]!, 'kiosk-first')).toThrow()
  })
})

const ref = (year: number, on: string | null): ArchiveRef => ({factId: `f-${year}`, title: 'Home 2–1 Away', on, year, precision: on ? 'day' : 'year', hint: '', locale: 'en', sources: [{title: 'Match record', publisher: 'The club archive', url: null}]})
const fit = (template: string, state: Fit['state'], anchor: ArchiveRef | null): Fit => ({clubId: 'x', template, state, anchor, relevance: 1, research: []})

describe('the night under a chapter, and what the studio is asked for', () => {
  const wayIn = missionById('the-way-in')!
  it('is dated only when the Fitter says READY, and only in the years the chapter is lived', () => {
    const night = ref(1986, '1986-05-24')
    expect(nightFor(wayIn, [fit('first-step', 'READY', night)])).toEqual({dated: true, anchor: night, template: 'first-step'})
    for (const st of ['NEUTRAL', 'HELD', 'IRRELEVANT'] as const) expect(nightFor(wayIn, [fit('first-step', st, null)]).dated).toBe(false)
    expect(nightFor(wayIn, []).dated).toBe(false)
    expect(nightFor(missionById('the-box')!, [fit('first-step', 'READY', night)])).toMatchObject({dated: false, why: 'no-template'})
    expect(nightFor(wayIn, [fit('first-step', 'READY', night)], 1978).dated).toBe(true) // he is eight in 1986
    expect(nightFor(wayIn, [fit('first-step', 'READY', night)], 1960)).toMatchObject({dated: false, why: 'other-years'})
    expect(nightFor(wayIn, {'the-way-in': fit('first-step', 'READY', night)}, 1978).dated).toBe(true)
  })

  it('asks the Fitter chapter by chapter, over the years the chapter is lived, and never twice for one night', () => {
    const row = (year: number, n: number): ArchiveRef => ({...ref(year, `${year}-05-0${n}`), factId: `r-${year}-${n}`, title: 'Us 2–1 Them', match: {home: 'Us', away: 'Them', homeGoals: 2, awayGoals: 1, us: 'home', result: 'won', note: null}})
    const view = {clubId: 'x', name: 'Us', city: 'Town', ownNames: ['Us'], rival: null, ground: 'The Ground', anchors: [row(1984, 1), row(1986, 1), row(1986, 2), row(1999, 1)]}
    const fits = chapterFits(view, 1978)
    const nights = CHILDHOOD.map(m => nightFor(m, fits, 1978)).filter(n => n.dated).map(n => n.anchor!)
    expect(nights.length).toBeGreaterThan(0)
    expect(new Set(nights.map(a => a.factId)).size).toBe(nights.length)
    for (const m of CHILDHOOD) { const n = nightFor(m, fits, 1978); if (n.dated) expect(Math.abs(n.anchor.year - 1978 - m.age)).toBeLessThanOrEqual(1) }
    expect(nights.some(a => a.year === 1999)).toBe(false)
    // no birth year on record: no calendar, every chapter personal
    expect(chapterFits(view, null)).toEqual({})
    expect(CHILDHOOD.every(m => !nightFor(m, chapterFits(view, null), null).dated)).toBe(true)
  })

  it('asks for a card per chapter, a bridge per year gained and an opener per matchday; a personal chapter carries no date', () => {
    const personal = transitionRequests('some-club', [])
    expect(new Set(personal.map(r => r.id)).size).toBe(personal.length)
    expect(personal.filter(r => r.kind === 'chapter-card').map(r => r.chapter).sort()).toEqual(CHILDHOOD.map(m => m.id).sort())
    expect(personal.filter(r => r.kind === 'matchday-opener').map(r => r.chapter).sort()).toEqual(CHILDHOOD.filter(m => m.day === 'matchday').map(m => m.id).sort())
    expect(personal.filter(r => r.kind === 'time-bridge').length).toBe(new Set(CHILDHOOD.map(m => m.age)).size - 1)
    for (const r of personal) {
      expect(r.night).toBeNull(); expect(r.formats).toEqual(['9:16', '16:9']); expect(r.seconds).toBeGreaterThan(0); expect(r.status).toBe('requested')
      expect(r.beats.length).toBeGreaterThan(0)
      for (const b of r.beats) { expect(b).not.toMatch(/^story\./); expect(b).not.toMatch(/\b(19|20)\d{2}\b/) }
    }
    const night = ref(1986, '1986-05-24')
    const dated = transitionRequests('some-club', [fit('first-step', 'READY', night)], 1978)
    const card = dated.find(r => r.id === 'some-club:the-way-in:chapter-card')!
    expect(card.night).toMatchObject({factId: 'f-1986', on: '1986-05-24', title: 'Home 2–1 Away'})
    expect(card.beats).toContain('1986-05-24')
    expect(dated.filter(r => r.night).every(r => r.chapter === 'the-way-in')).toBe(true)
    const man = manifestOf({b: {birthYear: null, fits: []}, a: {birthYear: 1978, fits: []}})
    expect(Object.keys(man.clubs)).toEqual(['a', 'b']); expect(man.schema).toBe(1)
  })
})
