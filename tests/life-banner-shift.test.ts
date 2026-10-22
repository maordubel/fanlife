import {describe, expect, it} from 'vitest'
import {masterChapters} from '@/lib/life/universal/screenplay/master'
import {MASTER_ROUTES_A} from '@/lib/life/universal/screenplay/master/routesA'
import {MASTER_YOUTH} from '@/lib/life/universal/screenplay/master/youth'
import {MASTER_GROWN} from '@/lib/life/universal/screenplay/master/grown'
import {apply, emptyState, eventsOf, meets, openChapter, type Directive} from '@/lib/life/universal/engine'
import {Runner} from '@/lib/life/universal/world'
import type {Chapter, Cond, LifeEvent, LifeState} from '@/lib/life/universal/types'

/**
 * P4 of the gameplay upgrade (owner spec 22.10.2026 §6b, §6c): the crew's banner keeps the stroke that went on in the
 * workshop all the way up to the terrace and down to the next generation; the shift that clashes with home pays the
 * agreed part once, after the work, and the evening answers that agreement.
 */
const chap = (id: string) => masterChapters([id], 'en')[0]!

function perform(chapter: Chapter, id: string, state: LifeState, choice: string) {
  const applyNow = (events: LifeEvent[]) => (state = events.reduce(apply, state))
  const direct = (ds: Directive[]) => {
    for (const d of ds) {
      if (d.d === 'play') { const r = eventsOf([...d.then, ...d.good], state); applyNow(r.events); direct(r.directives) }
      if (d.d === 'goto') applyNow([{t: 'moved', room: d.room, spawn: d.spawn, time: d.time ?? state.time}])
      if (d.d === 'end') applyNow([{t: 'ended', chapter: chapter.id, ending: d.ending}])
    }
  }
  const runner = new Runner(chapter, state, applyNow)
  let v = runner.start(id)
  const said: string[] = []
  for (let i = 0; v && !v.done && i < 40; i++) { said.push(...(v.lines ?? []).map(l => typeof l.t === "string" ? l.t : JSON.stringify(l.t))); v = v.choices.length ? runner.choose(choice) : runner.advance() }
  direct(runner.directives)
  return {state, said}
}
const open = (c: Chapter, scene: string, s: LifeState) => c.spots.some(sp => sp.talk === `${scene}:choose` && meets(s, sp.when))
function live(c: Chapter, picks: Record<string, string>, seed: LifeState = emptyState()) {
  let s = openChapter(c).reduce(apply, seed)
  const heard: Record<string, string[]> = {}
  for (let i = 0; i < 10; i++) {
    const scene = Object.keys(picks).find(id => !s.flags[`story:${c.id}:${id}:done`] && open(c, id, s))
    if (!scene) break
    const a = perform(c, `${scene}:choose`, s, picks[scene]!); s = a.state
    const b = perform(c, `${scene}:act`, s, picks[scene]!); s = b.state
    heard[scene] = [...a.said, ...b.said]
  }
  return {s, heard}
}
const terrace = (): LifeState => ({...emptyState(), flags: {'life:route:go': true, 'life:inclin': 'ter'}})
const isOf = (c: Cond | undefined): [string, unknown] | null => (c && 'is' in c ? c.is : null)

describe('the crew\'s banner: one stroke, from the workshop to the next generation', () => {
  const ter = MASTER_ROUTES_A.find(c => c.id === 'R-TER')!
  const scene = (id: string) => ter.scenes.find(s => s.id === id)!
  const strokes = ['fixed', 'kept', 'handed']

  it('the stroke is decided where it is painted, and each decision is saved as the banner\'s own flag', () => {
    const s2 = scene('R-TER-S2')
    expect(s2.game, 'stencil and paint are played, not told').toBeTruthy()
    const set = s2.options.flatMap(o => (o.effects ?? []).filter(e => e.e === 'flag' && e.k === 'life:banner:stroke').map(e => (e as {v: unknown}).v))
    expect(set.sort()).toEqual([...strokes].sort())
  })

  it('the reveal on the terrace and the young one in the tunnel both name the same stroke, whichever it was', () => {
    for (const id of ['R-TER-S3', 'R-TER-S4']) {
      const read = (scene(id).callbacks ?? []).map(cb => isOf(cb.when)).filter(x => x?.[0] === 'life:banner:stroke').map(x => x![1])
      expect(read.sort(), id).toEqual([...strokes].sort())
    }
  })

  it('the cloth is carried after it is painted: the carry is in the reveal, not before the paint', () => {
    expect(scene('R-TER-S1').options.some(o => o.mission)).toBe(false)
    expect(scene('R-TER-S3').options.find(o => o.id === 'handle')?.mission?.template).toBe('tifo-carry')
  })

  for (const [pick, word] of [['stay', 'extra stroke'], ['fix', 'painted over'], ['hand', 'his call']] as const) {
    it(`a life that chose "${pick}" in the workshop hears it in the tunnel`, () => {
      const {s, heard} = live(chap('R-TER'), {'R-TER-S1': 'hands', 'R-TER-S2': pick, 'R-TER-S3': 'pass', 'R-TER-S4': 'join'}, terrace())
      expect(s.flags['life:banner:stroke']).toBe(pick === 'stay' ? 'kept' : pick === 'fix' ? 'fixed' : 'handed')
      expect(s.flags['story:R-TER:complete'], 'the chapter ends').toBeTruthy()
      expect(heard['R-TER-S4']!.join(' ')).toContain(word)
    })
  }
})

describe('the first money that is yours: work, then pay, once', () => {
  for (const [first, pay] of [['full', 5], ['swap', 3], ['refuse', 0]] as const) {
    for (const favour of ['help', 'limit', 'no']) {
      it(`${first} + ${favour}: paid ${pay}, exactly once`, () => {
        const {s} = live(chap('F13'), {'F13-S1': first, 'F13-S2': favour, 'F13-S3': 'save'})
        expect(s.coins).toBe(pay)
        expect(s.flags['story:F13:complete']).toBeTruthy()
        expect(s.flags['life:master:F13:paid'] ?? null).toBe(pay === 5 ? 'full' : pay === 3 ? 'short' : null)
      })
    }
  }

  it('saying yes pays nothing: the coins are in the work the choice starts', () => {
    const s1 = MASTER_YOUTH.find(c => c.id === 'F13')!.scenes[0]!
    for (const o of s1.options) expect((o.effects ?? []).some(e => e.e === 'coins'), o.id).toBe(false)
  })

  it('the evening answers the agreement that was made', () => {
    const full = live(chap('F13'), {'F13-S1': 'full', 'F13-S2': 'help', 'F13-S3': 'save'}).heard['F13-S2']!.join(' ')
    const swap = live(chap('F13'), {'F13-S1': 'swap', 'F13-S2': 'help', 'F13-S3': 'save'}).heard['F13-S2']!.join(' ')
    expect(full).toContain('You missed the start')
    expect(swap).toContain('you owe a Saturday')
  })

  it('a purchase is offered only with the coins in hand; saving always is', () => {
    const {s} = live(chap('F13'), {'F13-S1': 'refuse', 'F13-S2': 'no', 'F13-S3': 'buy'})
    expect(s.coins).toBe(0)
    expect(s.flags['life:master:F13:spend'], 'buy was not on offer with nothing earned').not.toBe('collection')
  })
})

describe('no dead end in any chapter this pass touched', () => {
  it('each can be finished however it is played (one core club; the full graph for F13)', async () => {
    const {CORE_CLUB_IDS, loadClub} = await import('@/lib/clubs/resolver')
    const {clubLife} = await import('@/lib/clubs/life/pack')
    const {simulate} = await import('@/lib/life/universal/sim')
    const pack = clubLife((await loadClub(CORE_CLUB_IDS[0]!))!.data)
    for (const id of ['F11', 'F12', 'F13', 'F16', 'F18', 'F19', 'F20', 'F24', 'R-TER']) {
      const chapter = pack.chapters.find(c => c.id === id)
      if (!chapter) continue
      const r = simulate(pack, chapter, [], id === 'F13' ? 400000 : undefined)
      if (id === 'F13') expect(r.truncated, 'F13 closes').toBe(false)
      expect(r.stuck, id).toEqual([])
      expect(r.endings.length, id).toBeGreaterThan(0)
    }
  }, 600000)
})

describe('F19 reads what F13 writes', () => {
  it('every money line in F19 answers a value F13 can actually set', () => {
    const written = new Set(MASTER_YOUTH.find(c => c.id === 'F13')!.scenes.flatMap(sc => sc.options.flatMap(o => (o.effects ?? []).filter(e => e.e === 'flag' && e.k === 'life:master:F13:spend').map(e => (e as {v: unknown}).v))))
    const read = MASTER_GROWN.find(c => c.id === 'F19')!.scenes.flatMap(sc => (sc.callbacks ?? []).map(cb => isOf(cb.when))).filter(x => x?.[0] === 'life:master:F13:spend').map(x => x![1])
    expect(read.length).toBeGreaterThan(0)
    for (const v of read) expect(written.has(v), String(v)).toBe(true)
  })
})
