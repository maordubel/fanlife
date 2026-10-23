/**
 * LIFE — what you made stays in the world (owner, 23.10.2026).
 * The record, its fold, its road to TOWN, and the promise that the simulator never sees it.
 */
import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {artefactOf, worldArtefacts} from '@/lib/life/universal/artefacts'
import {apply, emptyState, fold} from '@/lib/life/universal/engine'
import type {LifeEvent} from '@/lib/life/universal/types'
import {ROOMS} from '@/lib/life/universal/rooms'

const src = (p: string) => readFileSync(p, 'utf8')

describe('the artefact a small game leaves', () => {
  it('a wash leaves the car, a stitch the scarf with its patch, a stencil the banner with its crooked stroke', () => {
    const car = artefactOf('wash-car', 'good', 'F10', 10)!
    expect(car).toMatchObject({id: 'car', kind: 'car', zonesDone: 1, marks: [], madeIn: 'F10'})
    expect(['mud', 'dust']).toContain(car.variant)
    expect(artefactOf('wash-car', 'ok', 'F10', 10)!.marks).toEqual([{type: 'streak'}])
    expect(artefactOf('stitch-scarf', 'good', 'F12', 12)!).toMatchObject({kind: 'scarf', marks: [{type: 'patch'}]})
    expect(artefactOf('stencil-banner', 'slip', 'R-TER', 16)!).toMatchObject({kind: 'banner', marks: [{type: 'crooked-stroke', at: 'l2'}]})
  })
  it('a game that makes nothing leaves nothing, and the same play always makes the same record', () => {
    expect(artefactOf('stack-crates', 'good', 'F01', 9)).toBeNull()
    expect(artefactOf('who-knows', 'good', 'F01', 9)).toBeNull()
    expect(artefactOf('wash-car', 'good', 'F10', 10)).toEqual(artefactOf('wash-car', 'good', 'F10', 10))
  })
})

describe('the fold', () => {
  it('a later thing with the same id replaces the earlier one, and it outlives a new chapter', () => {
    const a = artefactOf('wash-car', 'ok', 'F10', 10)!, b = artefactOf('wash-car', 'good', 'F11', 11)!
    const s = fold([{t: 'made', a}, {t: 'chapter', id: 'F11'}, {t: 'made', a: b}])
    expect(s.made).toEqual({car: b})
  })
  it('an old save without a single `made` event folds exactly as before', () => {
    const events: LifeEvent[] = [{t: 'started', pack: 'p'}, {t: 'chapter', id: 'F01'}, {t: 'flag', k: 'life:x', v: true}]
    const s = fold(events)
    expect(s.made).toBeUndefined()
    expect(worldArtefacts(s)).toEqual([])
    expect(Object.keys(s).sort()).toEqual(Object.keys(emptyState()).sort())
  })
  it('the simulator state key never reads it', () => {
    expect(src('lib/life/universal/sim.ts')).not.toMatch(/\.made\b/)
    const s = apply(emptyState(), {t: 'made', a: artefactOf('stitch-scarf', 'good', 'F12')!})
    expect(s.made?.scarf?.kind).toBe('scarf')
  })
})

describe('what the room is told', () => {
  it('the crew\'s decision about the stroke is drawn: kept, painted over, or the mate\'s star', () => {
    const at = (v: string) => worldArtefacts({...emptyState(), flags: {'life:banner:stroke': v}}).find(a => a.kind === 'banner')!
    expect(at('kept').marks.map(m => m.type)).toEqual(['crooked-stroke'])
    expect(at('fixed').marks.map(m => m.type)).toEqual(['crooked-stroke', 'painted-over'])
    expect(at('handed').marks.map(m => m.type)).toEqual(['crooked-stroke', 'own-star'])
  })
  it('the poster folded into the box keeps its crease; on the wall it hangs flat', () => {
    const p = (v: string) => worldArtefacts({...emptyState(), flags: {'life:master:F12:item': v}})
    expect(p('box')).toEqual([expect.objectContaining({kind: 'poster', variant: 'box', marks: [{type: 'crease'}]})])
    expect(p('wall')[0]!.marks).toEqual([])
    expect(p('given')).toEqual([])
  })
  it('the record travels: the shell writes it after the game, the room config carries it, TOWN draws it', () => {
    expect(src('components/clubs/life/LifeGame.tsx')).toMatch(/artefactOf\(d\.id, result, ch\.id, ch\.age\)/)
    expect(src('components/clubs/life/runtime.ts')).toMatch(/made: worldArtefacts\(state\)/)
    expect(src('public/life/town/play.js')).toMatch(/made:c\.made\|\|\[\]/)
    expect(src('public/life/town/kit.js')).toMatch(/ARTEFACTS\.place\(c,id,opts\.made\|\|\[\]\)/)
    expect(src('public/life/town/play.html')).toMatch(/\/life\/town\/artefacts\.js/)
  })
  it('the stands carry them where the camera reads them: the front rail above the walkway, and a scarf tied to it', () => {
    for (const id of ['terrace', 'away-end'] as const) {
      const r = ROOMS[id]!, rail = r.spots.rail!, scarf = r.spots.scarf!
      expect(rail && scarf).toBeTruthy()
      // above a standing supporter's head (≈1.8 m) and on the stand's front line, inside the room's width
      for (const s of [rail, scarf]) { expect(s.y! * 0.27).toBeGreaterThan(2.6); expect(s.z).toBeLessThan(r.walk[1] + 0.6); expect(s.x).toBeGreaterThanOrEqual(r.walk[0]); expect(s.x).toBeLessThanOrEqual(r.walk[2]) }
    }
    expect(src('public/life/town/artefacts.js')).toMatch(/c\.spot\('rail'\)/)
  })
  it('TOWN paints them only in the club\'s own colours', () => {
    const js = src('public/life/town/artefacts.js')
    const hex = js.match(/#[0-9a-f]{6}\b/gi) ?? []
    // the only literals are the fallbacks for a room with no club kit and two neutrals (a hook, a dull streak)
    for (const h of hex) expect(['#8a2a2a', '#f4f1ff', '#14141c', '#4e4440', '#3a3230', '#8a7e74', '#3a3430', '#8a847c', '#2a2e3a']).toContain(h.toLowerCase())
  })
})
