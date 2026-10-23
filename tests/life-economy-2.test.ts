/**
 * LIFE, universal — the economy, second pass (owner's review 23.10.2026).
 *
 * Half a shift is half the WORK (the play carries `scope`, and each option checks its own energy); every spend is
 * checked, out of the wallet or out of money held for others; savings are real (the shirt and the trip are
 * envelopes); the coach money and the community tin are funds; a client remembers the last job; and the
 * collection is a ledger — how many, whose, doubles, given and lent.
 */
import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {screenplayChapters} from '@/lib/life/universal/screenplay'
import {MASTER_IDS, masterChapters} from '@/lib/life/universal/screenplay/master'
import {sideLife} from '@/lib/life/universal/content/side'
import {apply, atHand, doublesOf, emptyState, eventsOf, fold, meets} from '@/lib/life/universal/engine'
import {branchOf, choicesOf} from '@/lib/life/universal/world'
import type {Chapter, Effect, LifeEvent, LifeState, Talk} from '@/lib/life/universal/types'
import {unguardedSpends} from '@/lib/life/universal/validate'

const chapters: Chapter[] = [...screenplayChapters('en'), ...masterChapters(MASTER_IDS, 'en')].map(sideLife)
const inChapter = (id: string, extra: Partial<LifeState> = {}): LifeState => ({...emptyState(), chapter: id, ...extra})
const run = (state: LifeState, fx: Effect[]): LifeState => eventsOf(fx, state).events.reduce(apply, state)
const effectsIn = (c: Chapter): Effect[] => {
  const out: Effect[] = []
  const walk = (list: readonly Effect[] | undefined) => list?.forEach(fx => { out.push(fx); if (fx.e === 'play') { walk(fx.then); walk(fx.good); walk(fx.slip) } })
  c.talks.forEach(t => t.branches.forEach(b => { walk(b.then); b.choices?.forEach(ch => walk(ch.then)) }))
  return out
}
const paidJobs = (c: Chapter): Talk[] => c.talks.filter(t => /^job-[a-z]+$/.test(t.id) && t.branches.some(b => b.choices?.some(ch => ch.id === 'short')))

describe('half a shift is half the work', () => {
  it('every short shift plays a short board, every full one a full board', () => {
    let short = 0
    for (const c of chapters) for (const t of paidJobs(c)) for (const b of t.branches) for (const ch of b.choices ?? []) {
      const play = ch.then?.find(fx => fx.e === 'play')
      if (!play || play.e !== 'play') continue
      if (ch.id === 'short') { expect(play.scope, `${c.id}:${t.id}`).toBe('short'); short++ }
      if (ch.id === 'do') expect(play.scope, `${c.id}:${t.id}`).toBe('full')
    }
    expect(short).toBeGreaterThan(20)
  })

  it('the directive carries the scope to the hands game, and an old play with none is full', () => {
    const d = eventsOf([{e: 'play', game: 'carry', id: 'x', scope: 'short'}], emptyState()).directives[0]
    expect(d).toMatchObject({d: 'play', scope: 'short'})
    expect(eventsOf([{e: 'play', game: 'carry', id: 'x'}], emptyState()).directives[0]).toMatchObject({d: 'play', scope: 'full'})
  })

  it('too tired for all of it is not too tired for half of it', () => {
    let checked = 0
    for (const c of chapters) for (const t of paidJobs(c)) {
      const full = t.branches.flatMap(b => b.choices ?? []).find(ch => ch.id === 'do')!
      const half = t.branches.flatMap(b => b.choices ?? []).find(ch => ch.id === 'short')!
      const fullCost = (full.when as {min: [string, number]}).min[1], halfCost = (half.when as {min: [string, number]}).min[1]
      expect(halfCost, `${c.id}:${t.id}`).toBeLessThan(fullCost)
      const s = inChapter(c.id, {energy: halfCost})
      const b = branchOf(t, s)!
      expect(choicesOf(b, s).map(x => x.id), `${c.id}:${t.id} at ${halfCost}`).toEqual(['short', 'later'])
      const empty = inChapter(c.id, {energy: halfCost - 1})
      expect(branchOf(t, empty)!.choices ?? [], `${c.id}:${t.id} below half`).toEqual([])
      checked++
    }
    expect(checked).toBeGreaterThan(20)
  })
})

describe('every spend is checked', () => {
  it('no choice spends coins, or money held for others, without a check — the list is empty and stays empty', () => {
    expect(unguardedSpends({chapters})).toEqual([])
    expect(JSON.parse(readFileSync('tests/fixtures/life-unguarded-spends.json', 'utf8'))).toEqual([])
  })

  it('a fund spend without a fund check is caught like a wallet spend', () => {
    const c: Chapter = {...chapters[0]!, talks: [{id: 'x', branches: [{lines: [], choices: [{id: 'go', t: 'Go', then: [{e: 'fund', id: 'coach', by: -3}]}]}]}]}
    expect(unguardedSpends({chapters: [c]})).toEqual([`${c.id}:x:go`])
    const ok: Chapter = {...c, talks: [{id: 'x', branches: [{lines: [], choices: [{id: 'go', t: 'Go', when: {fund: ['coach', 3]}, then: [{e: 'fund', id: 'coach', by: -3}]}]}]}]}
    expect(unguardedSpends({chapters: [ok]})).toEqual([])
  })
})

describe('the coach and the community have their own money', () => {
  const fx = (chapter: string) => effectsIn(chapters.find(c => c.id === chapter)!)
  it('the road: the organiser collects the coach money, and the delay is paid out of it — never his pocket', () => {
    const all = fx('R-WAY')
    expect(all.some(e => e.e === 'fund' && e.id === 'coach' && e.by > 0)).toBe(true)
    expect(all.some(e => e.e === 'fund' && e.id === 'coach' && e.by < 0)).toBe(true)
  })
  it('the community tin is filled by the regulars and spent out of the tin; his own coins go INTO it', () => {
    const all = fx('R-COMM')
    expect(all.filter(e => e.e === 'fund' && e.id === 'comm-tin' && e.by > 0).length).toBeGreaterThan(1)
    expect(all.some(e => e.e === 'fund' && e.id === 'comm-tin' && e.by < 0)).toBe(true)
    const s = run(inChapter('R-COMM', {coins: 6}), [{e: 'coins', by: -4}, {e: 'fund', id: 'comm-tin', by: 4}])
    expect([s.coins, s.funds['comm-tin']]).toEqual([2, 4])
  })
})

describe('savings are real', () => {
  it('the shirt: the crates at eight go into an envelope; the window at nine tips it out', () => {
    expect(effectsIn(chapters.find(c => c.id === 'c2-shirt')!).some(e => e.e === 'envelope' && e.id === 'shirt' && e.by > 0)).toBe(true)
    expect(effectsIn(chapters.find(c => c.id === 'F03')!).some(e => e.e === 'envelope' && e.id === 'shirt' && e.by < 0)).toBe(true)
  })
  it('the trip: the fare is put aside when he says he is going, and the road is paid out of it', () => {
    const all = effectsIn(chapters.find(c => c.id === 'F10')!)
    expect(all.some(e => e.e === 'envelope' && e.id === 'trip' && e.by > 0)).toBe(true)
    expect(all.some(e => e.e === 'spend' && e.from === 'trip')).toBe(true)
    let s = run(inChapter('F10', {coins: 5}), [{e: 'envelope', id: 'trip', by: 4}])
    expect([s.coins, s.envelopes.trip]).toEqual([1, 4])
    expect(meets(s, {saved: ['trip', 4]})).toBe(true)
    s = run(s, [{e: 'spend', from: 'trip', by: 4}])
    expect([s.coins, s.envelopes.trip], 'spent out of the envelope, the wallet untouched').toEqual([1, 0])
  })
  it('spending more than the envelope holds takes only what it holds', () => {
    const s = run(inChapter('F10', {coins: 9, envelopes: {trip: 2}}), [{e: 'spend', from: 'trip', by: 4}])
    expect([s.coins, s.envelopes.trip]).toEqual([9, 0])
  })
})

describe('a client who comes back', () => {
  it('remembers the last job, from an earlier chapter only, and asks for something different', () => {
    const before: LifeEvent[] = [{t: 'chapter', id: 'F03'}, {t: 'paid', order: 'F03/job-crates', by: 5}]
    expect(meets(fold(before), {worked: 'job-crates'}), 'the same chapter is not a return').toBe(false)
    const later = fold([...before, {t: 'chapter', id: 'F13'}])
    expect(meets(later, {worked: 'job-crates'})).toBe(true)
    expect(meets(later, {worked: 'job-bottles'})).toBe(false)
    let asked = 0
    for (const c of chapters) for (const t of paidJobs(c)) {
      const back = t.branches.find(b => b.when && 'worked' in b.when)
      if (!back) continue
      const first = t.branches[t.branches.length - 1]!
      expect(back.lines[0]!.t, `${c.id}:${t.id}`).not.toBe(first.lines[0]!.t)
      expect(back.choices?.map(x => x.id)).toEqual(['do', 'short', 'later'])
      asked++
    }
    expect(asked).toBeGreaterThan(10)
  })
})

describe('the collection is a ledger', () => {
  it('copies come in, doubles are counted, a copy given leaves, a copy lent is out until it comes back', () => {
    let s = run(inChapter('F06'), [{e: 'collect', item: 'stickers', n: 3}, {e: 'collect', item: 'doubles', n: 2}, {e: 'collect', item: 'favourite'}])
    expect([s.collection.stickers!.n, atHand(s.collection.doubles), doublesOf(s, 'doubles')]).toEqual([3, 2, 1])
    s = run(s, [{e: 'give', item: 'doubles', to: 'friend'}])
    expect(s.collection.doubles!.n).toBe(1)
    s = run(s, [{e: 'lend', item: 'favourite', to: 'child'}])
    expect([s.collection.favourite!.n, atHand(s.collection.favourite), s.collection.favourite!.lent]).toEqual([1, 0, ['child']])
    expect(meets(s, {owns: ['favourite', 1]}), 'a copy on loan is not at hand').toBe(false)
    s = run(s, [{e: 'lend', item: 'favourite', to: 'friend'}, {e: 'give', item: 'favourite', to: 'friend'}])
    expect(s.collection.favourite, 'nothing lent or given that is not at hand').toEqual({n: 1, lent: ['child']})
    s = run(s, [{e: 'back', item: 'favourite'}])
    expect(meets(s, {owns: ['favourite', 1]})).toBe(true)
  })

  it('the envelope in F06 fills it, and the swap needs a double to be offered', () => {
    const f06 = effectsIn(chapters.find(c => c.id === 'F06')!)
    expect(f06.some(e => e.e === 'collect' && e.item === 'stickers')).toBe(true)
    expect(f06.some(e => e.e === 'give' && e.item === 'doubles')).toBe(true)
    expect(effectsIn(chapters.find(c => c.id === 'F07')!).some(e => e.e === 'lend' && e.item === 'favourite')).toBe(true)
    const swaps = chapters.flatMap(c => c.spots.filter(x => x.id === 'job-swap'))
    for (const sp of swaps) {
      expect(meets(emptyState(), sp.when), 'no doubles, no swap').toBe(false)
      expect(meets({...emptyState(), collection: {doubles: {n: 1, lent: []}}}, sp.when)).toBe(true)
    }
  })

  it('an old save with no collection, funds or envelopes folds as before', () => {
    const old: LifeEvent[] = [{t: 'started', pack: 'x'}, {t: 'chapter', id: 'F03'}, {t: 'coins', by: 4}]
    const s = fold(old)
    expect([s.coins, s.collection, s.funds, s.envelopes]).toEqual([4, {}, {}, {}])
    const legacy = {...s, collection: undefined} as unknown as LifeState
    expect(apply(legacy, {t: 'collected', item: 'stickers', n: 2}).collection).toEqual({stickers: {n: 2, lent: []}})
    expect(meets(legacy, {owns: ['stickers', 1]})).toBe(false)
  })
})
