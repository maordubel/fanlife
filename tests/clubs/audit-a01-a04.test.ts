import {describe, expect, it} from 'vitest'
import {masterChapters} from '@/lib/life/universal/screenplay/master'
import {apply, emptyState, eventsOf, meets, openChapter, untold, type Directive} from '@/lib/life/universal/engine'
import {Runner} from '@/lib/life/universal/world'
import type {Chapter, LifeEvent, LifeState, LifePack} from '@/lib/life/universal/types'

/** Release audit 15.10.2026, A01–A04: a refusal is kept in the world, a keepsake is earned, a price needs the money, a grown book reaches an old save. */
const chap = (id: string) => masterChapters([id], 'en')[0]!

function perform(chapter: Chapter, id: string, state: LifeState, choice: string) {
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
  for (let i = 0; v && !v.done && i < 40; i++) v = v.choices.length ? runner.choose(choice) : runner.advance()
  direct(runner.directives)
  return state
}
const open = (c: Chapter, scene: string, s: LifeState) => c.spots.some(sp => sp.talk === `${scene}:choose` && meets(s, sp.when))
const start = (c: Chapter, seed: LifeState = emptyState()) => openChapter(c).reduce(apply, seed)
const choicesAt = (c: Chapter, scene: string, s: LifeState) => {
  const r = new Runner(c, s, ev => ev.reduce(apply, s))
  let v = r.start(`${scene}:choose`)
  for (let i = 0; v && !v.done && !v.choices.length && i < 20; i++) v = r.advance()
  return (v?.choices ?? []).map(x => x.id)
}
/** one scene at a time, in the order the world offers them */
function live(c: Chapter, picks: Record<string, string>, seed: LifeState = emptyState()) {
  let s = start(c, seed)
  for (let i = 0; i < 8; i++) {
    const scene = Object.keys(picks).find(id => !s.flags[`story:${c.id}:${id}:done`] && open(c, id, s))
    if (!scene) break
    s = perform(c, `${scene}:choose`, s, picks[scene]!)
    s = perform(c, `${scene}:act`, s, picks[scene]!)
  }
  return s
}

describe('A01 — declining is kept in the world', () => {
  for (const [id, first, decline, skipped, after] of [['F26', 'F26-S1', 'not', 'F26-S2', 'F26-S3'], ['F17', 'F17-S1', 'life', 'F17-S4', 'F17-S3']] as const) {
    it(`${id}: "${decline}" leaves ${skipped} out, and the way on is the next errand`, () => {
      const c = chap(id)
      let s = start(c)
      s = perform(c, `${first}:choose`, s, decline)
      s = perform(c, `${first}:act`, s, decline)
      expect(s.flags[`story:${id}:${skipped}:done`], 'skipped scene counts as done').toBeTruthy()
      expect(open(c, skipped, s), 'skipped scene is not offered').toBe(false)
      expect(open(c, after, s), 'next errand is open').toBe(true)
      expect(c.objectives.find(o => o.id === skipped), 'objective exists').toBeTruthy()
    })
    it(`${id}: the other roads still pass through ${skipped}`, () => {
      const c = chap(id)
      const other = id === 'F26' ? 'come' : 'swept'
      let s = start(c)
      s = perform(c, `${first}:choose`, s, other)
      s = perform(c, `${first}:act`, s, other)
      expect(open(c, skipped, s)).toBe(true)
      expect(open(c, after, s)).toBe(false)
    })
  }
  it('the whole chapter still ends after declining', () => {
    expect(live(chap('F26'), {'F26-S1': 'not', 'F26-S3': 'once'}).done['F26']).toBeTruthy()
    expect(live(chap('F17'), {'F17-S1': 'life', 'F17-S3': 'alone'}).done['F17']).toBeTruthy()
  })
})

describe('A03 — a keepsake is given only when it was earned', () => {
  it('F19: not for looking and tidying, yes for buying', () => {
    const c = chap('F19')
    expect(live(c, {'F19-S1': 'ask', 'F19-S2': 'tell', 'F19-S3': 'seasons'}).keeps).not.toContain('shelf-piece')
    const bought = live(c, {'F19-S1': 'buy', 'F19-S2': 'tell', 'F19-S3': 'seasons'}, {...emptyState(), coins: 10})
    expect(bought.keeps).toContain('shelf-piece')
    expect(bought.done['F19']).toBeTruthy()
  })
  it('F25: not for turning up, yes when something was written', () => {
    const c = chap('F25')
    const first = c.objectives[0]!.id
    expect(live(c, {[first]: 'join', 'F25-S2': 'insist', 'F25-S3': 'go'}).keeps).not.toContain('napkin-list')
    const dbg = live(c, {[first]: 'join', 'F25-S2': 'check', 'F25-S3': 'go'})
    expect(dbg.keeps).toContain('napkin-list')
    expect(live(c, {[first]: 'join', 'F25-S2': 'insist', 'F25-S3': 'again'}).keeps).toContain('napkin-list')
  })
})

describe('A04 — a price needs the money', () => {
  it('F16 trip needs 3, F19 buy needs 4: 0, one short, exact', () => {
    for (const [id, scene, opt, price] of [['F16', 'F16-S1', 'trip', 3], ['F19', 'F19-S1', 'buy', 4]] as const) {
      const c = chap(id)
      for (const [coins, shows] of [[0, false], [price - 1, false], [price, true], [price + 5, true]] as const) {
        const ids = choicesAt(c, scene, {...start(c), coins})
        expect(ids.includes(opt), `${id} ${opt} at ${coins}`).toBe(shows)
        expect(ids.length, 'another road is always open').toBeGreaterThan(0)
      }
    }
  })
  it('paying never takes more than there is', () => {
    const c = chap('F16')
    const s = perform(c, 'F16-S1:choose', {...start(c), coins: 3}, 'trip')
    const t = perform(c, 'F16-S1:act', s, 'trip')
    expect(t.coins).toBe(0)
  })
})

describe('A02 — a book that grew reaches an old save', () => {
  const pack = {chapters: [{id: 'a'}, {id: 'b'}, {id: 'c', when: {flag: 'route'}}, {id: 'd'}]} as unknown as LifePack
  it('lists chapters not lived, skipping routes not taken', () => {
    const s: LifeState = {...emptyState(), done: {a: 'x', d: 'y'}}
    expect(untold(pack, s).map(c => c.id)).toEqual(['b'])
    expect(untold(pack, {...s, flags: {route: true}}).map(c => c.id)).toEqual(['b', 'c'])
    expect(untold(pack, {...s, done: {a: 'x', b: 'x', d: 'y'}}).map(c => c.id)).toEqual([])
  })
  it('opening one keeps what the life already is', () => {
    const s: LifeState = {...emptyState(), done: {a: 'x'}, keeps: ['scarf'], heart: 40, finished: true}
    const next = apply(s, {t: 'chapter', id: 'b'})
    expect(next.done).toEqual({a: 'x'})
    expect(next.keeps).toEqual(['scarf'])
    expect(next.heart).toBe(40)
  })
})
