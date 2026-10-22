/**
 * LIFE, universal — the economy core (owner's spec 22.10.2026, §2 and §8).
 *
 * One payment per piece of work; envelopes and shared funds are not the wallet; kicks, chants and swaps
 * pay nothing; no paid side job where the chapter already pays for the work; a side job is offered full
 * or short with both prices said first; and spending is checked against the wallet — today's unchecked
 * spends are a list that may only shrink.
 */
import {readFileSync, writeFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {screenplayChapters} from '@/lib/life/universal/screenplay'
import {MASTER_IDS, masterChapters} from '@/lib/life/universal/screenplay/master'
import {payingRooms, sideLife, SIDE_ECONOMY} from '@/lib/life/universal/content/side'
import {apply, emptyState, eventsOf, fold, isPaid, orderId} from '@/lib/life/universal/engine'
import type {Chapter, Effect, LifeEvent, LifeState} from '@/lib/life/universal/types'
import {unguardedSpends} from '@/lib/life/universal/validate'

const chapters: Chapter[] = [...screenplayChapters('en'), ...masterChapters(MASTER_IDS, 'en')].map(sideLife)
const inChapter = (id: string): LifeState => ({...emptyState(), chapter: id})
const run = (state: LifeState, fx: Effect[]): LifeState => eventsOf(fx, state).events.reduce(apply, state)

describe('one payment per piece of work', () => {
  it('a second payment for the same order changes nothing', () => {
    let s = inChapter('F13')
    s = run(s, [{e: 'pay', order: 'job-crates', by: 6}])
    s = run(s, [{e: 'pay', order: 'job-crates', by: 6}])
    expect(s.coins).toBe(6)
    expect(isPaid(s, 'job-crates')).toBe(true)
    expect(s.paid).toEqual([orderId(s, 'job-crates')])
  })

  it('the same client in another chapter is a new order and pays again', () => {
    let s = run(inChapter('F03'), [{e: 'pay', order: 'job-crates', by: 5}])
    s = apply(s, {t: 'chapter', id: 'F13'})
    s = run(s, [{e: 'pay', order: 'job-crates', by: 6}])
    expect(s.coins).toBe(11)
  })

  it('a log read twice folds to the same wallet (a reload never pays again)', () => {
    const log: LifeEvent[] = [{t: 'chapter', id: 'F13'}, {t: 'paid', order: 'F13/job-tins', by: 9}, {t: 'paid', order: 'F13/job-tins', by: 9}]
    expect(fold(log).coins).toBe(9)
    expect(fold([...log, ...log]).coins).toBe(9)
  })

  it('a save written before this change folds to the same state it always did', () => {
    const old: LifeEvent[] = [{t: 'started', pack: 'x'}, {t: 'chapter', id: 'F03'}, {t: 'coins', by: 7}, {t: 'coins', by: -3}, {t: 'flag', k: 'life:a', v: true}]
    const s = fold(old)
    expect(s.coins).toBe(4)
    expect(s.paid).toEqual([])
    expect(s.envelopes).toEqual({})
    expect(s.funds).toEqual({})
  })
})

describe('envelopes and shared funds are not the wallet', () => {
  it('putting money in an envelope moves it, never more than the wallet holds', () => {
    let s = {...inChapter('F03'), coins: 5}
    s = run(s, [{e: 'envelope', id: 'shirt', by: 8}])
    expect(s.coins).toBe(0)
    expect(s.envelopes.shirt).toBe(5)
    s = run(s, [{e: 'envelope', id: 'shirt', by: -9}])
    expect(s.coins).toBe(5)
    expect(s.envelopes.shirt).toBe(0)
  })

  it('a shared fund grows and shrinks without touching coins', () => {
    let s = {...inChapter('F24'), coins: 3}
    s = run(s, [{e: 'fund', id: 'coach', by: 12}, {e: 'fund', id: 'coach', by: -4}])
    expect(s.coins).toBe(3)
    expect(s.funds.coach).toBe(8)
  })
})

describe('the side of a day', () => {
  const jobsOf = (c: Chapter) => c.spots.filter(x => x.id.startsWith('job-'))
  const effectsOf = (c: Chapter, talk: string): Effect[] => {
    const out: Effect[] = []
    const walk = (l: readonly Effect[] | undefined) => { for (const fx of l ?? []) { out.push(fx); if (fx.e === 'play') { walk(fx.then); walk(fx.good); walk(fx.slip) } } }
    for (const b of c.talks.find(t => t.id === talk)?.branches ?? []) { walk(b.then); for (const ch of b.choices ?? []) walk(ch.then) }
    return out
  }

  it('kicks, chants and swaps pay nothing, and still give something', () => {
    for (const id of ['kickwall', 'kickjackets', 'chant', 'swap', 'echo', 'banner']) {
      const j = SIDE_ECONOMY.jobs.find(x => x.id === id)!
      expect(j.pay, id).toEqual([0, 0, 0])
      expect(j.heart + j.standing, id).toBeGreaterThan(0)
    }
  })

  it('a paid side job pays through one order, full and short alike, and never with bare coins', () => {
    let paid = 0
    for (const c of chapters) for (const j of jobsOf(c)) {
      const fx = effectsOf(c, j.talk)
      expect(fx.some(e => e.e === 'coins' && e.by > 0), `${c.id}:${j.id}`).toBe(false)
      const orders = new Set(fx.flatMap(e => (e.e === 'pay' ? [e.order] : [])))
      if (orders.size) { paid++; expect([...orders], `${c.id}:${j.id}`).toEqual([j.id]) }
    }
    expect(paid).toBeGreaterThan(5)
  })

  it('a paid side job is offered full or short, with both prices said before the work', () => {
    for (const c of chapters) for (const j of jobsOf(c)) {
      const t = c.talks.find(x => x.id === j.talk)!, offer = t.branches[t.branches.length - 1]!
      const pays = effectsOf(c, j.talk).some(e => e.e === 'pay')
      if (!pays) continue
      const ids = (offer.choices ?? []).map(x => x.id)
      expect(ids, `${c.id}:${j.id}`).toEqual(['do', 'short', 'later'])
      expect(offer.lines.map(l => l.t).join(' '), `${c.id}:${j.id}`).toMatch(/\d+ coins if you do it well, or \d+ for half of it/)
    }
  })

  it('no paid side job in a room where the chapter itself already pays for work (F13, c6-work)', () => {
    for (const c of chapters) {
      const paying = payingRooms({...c, spots: c.spots.filter(x => !x.id.startsWith('job-')), talks: c.talks.filter(t => !t.id.startsWith('job-'))})
      for (const j of jobsOf(c)) if (effectsOf(c, j.talk).some(e => e.e === 'pay')) expect(paying.has(j.room), `${c.id}:${j.id} in ${j.room}`).toBe(false)
    }
    for (const id of ['F13', 'c6-work']) {
      const c = chapters.find(x => x.id === id)
      if (!c) continue
      expect(jobsOf(c).map(j => j.id), id).not.toContain('job-tins')
    }
  })
})

describe('spending is checked against the wallet', () => {
  const FIXTURE = 'tests/fixtures/life-unguarded-spends.json'
  it('today\'s unchecked spends are a list that may only shrink', () => {
    const now = unguardedSpends({chapters}).sort()
    if (process.env.UPDATE_LIFE_SPENDS) writeFileSync(FIXTURE, JSON.stringify(now, null, 2) + '\n')
    const allowed: string[] = JSON.parse(readFileSync(FIXTURE, 'utf8'))
    const added = now.filter(x => !allowed.includes(x)), fixed = allowed.filter(x => !now.includes(x))
    expect(added, 'a new choice spends coins with no `min coins` condition').toEqual([])
    expect(fixed, 'these are checked now — take them off the list').toEqual([])
  })
})
