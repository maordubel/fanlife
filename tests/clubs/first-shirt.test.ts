import {describe, expect, it} from 'vitest'
import {masterChapters} from '@/lib/life/universal/screenplay/master'
import {screenplayChapters} from '@/lib/life/universal/screenplay'
import {shirtFrom} from '@/lib/life/universal/screenplay/childhood'
import {MASTER} from '@/lib/life/universal/screenplay/master'
import {apply, emptyState, eventsOf, meets, openChapter, type Directive} from '@/lib/life/universal/engine'
import {Runner} from '@/lib/life/universal/world'
import type {Chapter, LifeEvent, LifeState} from '@/lib/life/universal/types'

/**
 * The first shirt (owner spec 22.10.2026 §6a), asked once in a life: the window and its price, the tin counted against it,
 * a job with a visible end, paid once, bought only when the coins are there, put on, noticed — and years later found in the
 * box with where it came from. Every road ends: buy, borrow, save, skip.
 */
const master = (id: string) => masterChapters([id], 'en')[0]!
const universal = (id: string) => screenplayChapters('en').find(c => c.id === id)!

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
const choicesAt = (c: Chapter, scene: string, s: LifeState) => {
  const r = new Runner(c, s, ev => ev.reduce(apply, s))
  let v = r.start(`${scene}:choose`)
  for (let i = 0; v && !v.done && !v.choices.length && i < 20; i++) v = r.advance()
  return (v?.choices ?? []).map(x => x.id)
}
/** one scene at a time, in the order the world offers them */
function live(c: Chapter, picks: Record<string, string>, seed: LifeState = emptyState()) {
  let s = openChapter(c).reduce(apply, seed)
  for (let i = 0; i < 8; i++) {
    const scene = Object.keys(picks).find(id => !s.flags[`story:${c.id}:${id}:done`] && open(c, id, s))
    if (!scene) break
    s = perform(c, `${scene}:choose`, s, picks[scene]!)
    s = perform(c, `${scene}:act`, s, picks[scene]!)
  }
  return s
}
const F03 = MASTER.find(c => c.id === 'F03')!

describe('the first shirt is asked once in a life', () => {
  it('at eight: a gift or the old one is a shirt on the kerb, and the window at nine is not asked again', () => {
    for (const how of ['gift', 'handed'] as const) {
      const s = live(universal('c2-shirt'), {S04: 'ask', S05: how, S06: 'proud'})
      expect(s.done['c2-shirt'], how).toBeTruthy()
      expect(s.wear, how).toBe('shirt')
      expect(s.keeps, how).toContain('shirt')
      expect(meets(s, F03.when!), `${how}: F03 is not asked again`).toBe(false)
    }
  })

  it('at eight: the crates start the money — four into the tin, no shirt yet, no shirt keepsake, and the kerb still plays', () => {
    const c = universal('c2-shirt')
    const mid = live(c, {S04: 'ask', S05: 'earned'})
    // the four are SAVINGS now: in the shirt envelope, out of the wallet, so nothing else in the year can spend them
    expect(mid.coins).toBe(0)
    expect(mid.envelopes.shirt).toBe(4)
    expect(mid.flags['life:shirt:saving']).toBe(true)
    expect(choicesAt(c, 'S06', mid)).toEqual(['tin'])
    const s = live(c, {S04: 'ask', S05: 'earned', S06: 'tin'})
    expect(s.done['c2-shirt']).toBeTruthy()
    expect(s.wear).toBe('plain')
    expect(s.keeps).not.toContain('shirt')
    expect(meets(s, F03.when!), 'F03 finishes what the tin began').toBe(true)
  })

  it('a life that never stood at the window at eight stands there at nine', () => {
    expect(meets(emptyState(), F03.when!)).toBe(true)
  })
})

describe('F03 — every road ends, and the shirt is bought only with the coins in hand', () => {
  const c = master('F03')

  it('buy: count the tin, stack the delivery (paid six, once), buy for six, put it on, the friend sees it', () => {
    const mid = live(c, {'F03-S1': 'try', 'F03-S2': 'work'})
    expect(mid.coins, 'the delivery pays six, once').toBe(6)
    expect(mid.flags['life:shirt:paid:F03']).toBe('kiosk')
    expect(choicesAt(c, 'F03-S3', mid)).toContain('show')
    const s = live(c, {'F03-S1': 'try', 'F03-S2': 'work', 'F03-S3': 'show'})
    expect(s.done['F03']).toBeTruthy()
    expect(s.coins, 'six in, six out').toBe(0)
    expect(s.wear).toBe('shirt')
    expect(s.flags['life:shirt:origin']).toBe('bought')
    expect(s.flags['life:shirt:saving']).toBe(false)
    expect(shirtFrom(s.flags)?.[0]).toMatch(/delivery/)
  })

  it('the job pays once: the six arrive only when the crates are stacked, and a replayed choice does not pay again', () => {
    const s = live(c, {'F03-S1': 'try', 'F03-S2': 'work'})
    expect(s.coins).toBe(6)
    expect(open(c, 'F03-S2', s), 'a scene already done is not offered twice').toBe(false)
  })

  it('save: no coins, no buying — the other two doors stay open and the chapter ends', () => {
    const s0 = live(c, {'F03-S1': 'try', 'F03-S2': 'keep'})
    expect(choicesAt(c, 'F03-S3', s0)).not.toContain('show')
    const s = live(c, {'F03-S1': 'try', 'F03-S2': 'keep', 'F03-S3': 'quiet'})
    expect(s.done['F03']).toBeTruthy()
    expect(s.wear).toBe('plain')
  })

  it('borrow: the old one from home, and the friend notices the stitching', () => {
    const s = live(c, {'F03-S1': 'home', 'F03-S2': 'keep', 'F03-S3': 'quiet'})
    expect(s.done['F03']).toBeTruthy()
    expect(s.flags['life:master:F03:route']).toBe('heirloom')
  })

  it('skip: manage without, show at home what you made — a whole ending, not a lost one', () => {
    const s = live(c, {'F03-S1': 'manage', 'F03-S2': 'keep', 'F03-S3': 'home'})
    expect(s.done['F03']).toBeTruthy()
    expect(s.keeps).toContain('window-shirt')
  })

  it('a year of saving: the tin is tipped out on the sill, and the four join the six at the counter', () => {
    const seed = {...emptyState(), envelopes: {shirt: 4}, flags: {'life:shirt:saving': true, 'life:shirt:origin': 'saving'}}
    const mid = live(c, {'F03-S1': 'try', 'F03-S2': 'work'}, seed)
    expect(mid.envelopes.shirt, 'the envelope is empty once the tin is on the sill').toBe(0)
    expect(mid.coins, 'four saved and six earned').toBe(10)
    const s = live(c, {'F03-S1': 'try', 'F03-S2': 'work', 'F03-S3': 'show'}, seed)
    expect(s.coins, 'six spent, four left').toBe(4)
    expect(s.wear).toBe('shirt')
  })

  it('a gift of coins buys it too, and the box says so', () => {
    const s = live(c, {'F03-S1': 'try', 'F03-S2': 'gift', 'F03-S3': 'show'})
    expect(s.done['F03']).toBeTruthy()
    expect(shirtFrom(s.flags)?.[0]).toMatch(/present/)
  })
})

describe('F29 opens the box and finds the shirt, with where it came from', () => {
  it('the first shirt is under everything, and how it was paid for is told — only when the life has one', () => {
    const script = MASTER.find(c => c.id === 'F29')!
    const said = (flags: Record<string, string | boolean>) => {
      const s: LifeState = {...emptyState(), flags}
      return JSON.stringify(script.scenes.flatMap(sc => (sc.callbacks ?? []).filter(cb => meets(s, cb.when)).flatMap(cb => cb.lines.map(l => l[1]))))
    }
    expect(said({'life:shirt:origin': 'bought', 'life:shirt:paid:F03': 'kiosk'})).toMatch(/first shirt/)
    expect(said({'life:shirt:origin': 'bought', 'life:shirt:paid:F03': 'kiosk'})).toMatch(/crates/)
    expect(said({'life:shirt:origin': 'handed'})).toMatch(/father/)
    expect(said({})).not.toMatch(/first shirt/)
  })
})

describe('a price needs the money, and there is always a way that needs none', () => {
  for (const [id, scene, opt, price] of [['F06', 'F06-S1', 'buy', 3], ['F28', 'F28-S1', 'give', 1], ['F30', 'F30-S2', 'easy', 4], ['F03', 'F03-S3', 'show', 6]] as const) {
    it(`${id} ${opt} costs ${price}`, () => {
      const c = master(id)
      const s0 = id === 'F03' ? live(c, {'F03-S1': 'try', 'F03-S2': 'keep'}) : id === 'F30' ? live(c, {'F30-S1': 'self'}) : openChapter(c).reduce(apply, emptyState())
      for (const [coins, shows] of [[0, false], [price - 1, false], [price, true]] as const) {
        const ids = choicesAt(c, scene, {...s0, coins})
        expect(ids.includes(opt), `${id} ${opt} at ${coins}`).toBe(shows)
        expect(ids.length, `${id} at ${coins}: something to choose without money`).toBeGreaterThan(0)
      }
    })
  }
})

describe('the first chapters are done with the hands', () => {
  it('the drawer, the scarf, the envelope, the swap, the lend and the lead each carry a named action', () => {
    const ids = new Set<string>()
    const walk = (x: unknown) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { const o = x as Record<string, unknown>; if (o.e === 'play' && typeof o.id === 'string') ids.add(o.id); Object.values(o).forEach(walk) } }
    for (const id of ['F01', 'F02', 'F03', 'F06', 'F07', 'F28', 'F30']) walk(master(id))
    for (const id of ['drawer-pull', 'scarf-tie', 'kiosk-stack', 'packet-open', 'swap-check', 'wardrobe-lend', 'follow-lead']) expect(ids.has(id), id).toBe(true)
  })
})
