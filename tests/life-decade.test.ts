import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { CHAPTER, CHAPTERS, chapterFor, lastPlayable, nextPlayable, playableChapters } from '@/lib/life/content/chapters'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { LifeEngine } from '@/lib/life/engine'
import { apply, emptyState, fold } from '@/lib/life/events'
import { lifeHasBegun, OPENING, OPENING_FLAG } from '@/lib/life/opening'
import { SCENE } from '@/lib/life/world/scenes'
import { meets } from '@/lib/life/world/types'

/**
 * העשור — the four surfaces the Stage B brief asks for (§4), the registry it asks for
 * (§13), and the one rule about the opening film that a player noticed before any test
 * did: it plays for a NEW life, and never again for that life.
 */

describe('מצב העשור — gate, army, institution, presence, laces', () => {
  it('defaults for a save written before the decade existed', () => {
    const state = fold(DEFAULT_IDENTITY, 1986, [
      { t: 'chapter.entered', chapter: '1986' },
      { t: 'flag.raised', flag: 'knows:match' },
    ])
    expect(state.gate).toEqual({ identity: 'gate7', history: [] })
    expect(state.army.route).toBe('negotiator')
    expect(state.institution.sinai).toBe('defending')
    expect(state.presence).toEqual({})
    expect(state.laces).toBeNull()
  })

  it('stores the gate as history, not a boolean', () => {
    let state = emptyState(DEFAULT_IDENTITY, 1996)
    state = apply(state, { t: 'gate.moved', to: 'between', reason: 'conflict', year: 1996 })
    state = apply(state, { t: 'gate.moved', to: 'gate5', reason: 'friends', year: 1997 })
    // moving to where you already stand is not a move
    state = apply(state, { t: 'gate.moved', to: 'gate5', reason: 'friends', year: 1997 })
    expect(state.gate.identity).toBe('gate5')
    expect(state.gate.history).toEqual([
      { from: 'gate7', to: 'between', year: 1996, reason: 'conflict' },
      { from: 'between', to: 'gate5', year: 1997, reason: 'friends' },
    ])
    expect(meets(state, { gateIs: 'gate5' })).toBe(true)
    expect(meets(state, { gateEver: 'between' })).toBe(true)
    expect(meets(state, { gateEver: 'outside' })).toBe(false)
    expect(meets(state, { gateNot: 'gate7' })).toBe(true)
  })

  it('spends army trust and remembers what the army cost', () => {
    let state = emptyState(DEFAULT_IDENTITY, 1996)
    state = apply(state, { t: 'army.changed', key: 'commanderTrust', delta: -30 })
    state = apply(state, { t: 'army.changed', key: 'leaveDebt', delta: 2 })
    state = apply(state, { t: 'army.route', route: 'punished' })
    state = apply(state, { t: 'army.missed', anchorId: '1997-sale' })
    state = apply(state, { t: 'army.missed', anchorId: '1997-sale' })
    expect(state.army.commanderTrust).toBe(20)
    expect(state.army.leaveDebt).toBe(2)
    expect(state.army.route).toBe('punished')
    expect(state.army.missedAnchors).toEqual(['1997-sale'])
    expect(meets(state, { armyBelow: { key: 'commanderTrust', max: 25 } })).toBe(true)
    expect(meets(state, { armyRoute: 'trusted' })).toBe(false)
    // gauges clamp: a life does not overflow
    state = apply(state, { t: 'army.changed', key: 'commanderTrust', delta: -500 })
    expect(state.army.commanderTrust).toBe(0)
  })

  it('keeps institutional positions distinct', () => {
    let state = emptyState(DEFAULT_IDENTITY, 1995)
    state = apply(state, { t: 'institution.sinai', stance: 'doubting' })
    state = apply(state, { t: 'institution.changed', key: 'supporterOwnershipSeed', delta: 15 })
    state = apply(state, { t: 'institution.changed', key: 'ussishkinWound', delta: 40 })
    expect(state.institution.sinai).toBe('doubting')
    expect(state.institution.footballOwnershipTrust).toBe(50)
    expect(state.institution.supporterOwnershipSeed).toBe(15)
    expect(meets(state, { sinaiIs: 'doubting' })).toBe(true)
    expect(meets(state, { institutionAbove: { key: 'ussishkinWound', min: 30 } })).toBe(true)
  })

  it('records HOW he was there, and the old lists agree', () => {
    let state = emptyState(DEFAULT_IDENTITY, 1998)
    state = apply(state, { t: 'presence.recorded', anchorId: '1998', mode: 'radio' })
    expect(state.presence['1998']).toBe('radio')
    expect(state.missedAnchors).toContain('1998')
    state = apply(state, { t: 'presence.recorded', anchorId: '1999-cup', mode: 'late' })
    expect(state.attendedAnchors).toContain('1999-cup')
    expect(meets(state, { presenceIs: { anchor: '1998', mode: 'radio' } })).toBe(true)
  })

  it('marks the laces once, and only an absence of an answer can be overwritten', () => {
    let state = emptyState(DEFAULT_IDENTITY, 1998)
    state = apply(state, { t: 'laces.marked', response: 'unresolved' })
    state = apply(state, { t: 'laces.marked', response: 'protector' })
    state = apply(state, { t: 'laces.marked', response: 'avenger' })
    expect(state.laces).toBe('protector')
    expect(meets(state, { lacesIs: 'protector' })).toBe(true)
  })

  it('survives a year and a day — the decade is the person, not the afternoon', () => {
    let state = emptyState(DEFAULT_IDENTITY, 1996)
    state = apply(state, { t: 'gate.moved', to: 'gate5', reason: 'friends', year: 1996 })
    state = apply(state, { t: 'laces.marked', response: 'witness' })
    state = apply(state, { t: 'year.entered', year: 1998, weekday: 6, minute: 800 })
    state = apply(state, { t: 'day.entered', dayId: 'x', year: 1998, weekday: 0, minute: 500 })
    expect(state.gate.identity).toBe('gate5')
    expect(state.laces).toBe('witness')
  })
})

describe('מרשם הפרקים — stable ids, a chain, and no chapter that lies', () => {
  it('holds the ids the game already persisted, unchanged', () => {
    for (const id of ['1986', '1990', '1991']) expect(CHAPTER[id], id).toBeDefined()
    expect(CHAPTER['1986']!.next).toBe('1990')
    expect(CHAPTER['1990']!.next).toBe('1991')
  })

  it('is a single chain with unique ids and a start every playable chapter can use', () => {
    const ids = new Set<string>()
    for (const c of CHAPTERS) {
      expect(ids.has(c.id), `${c.id} twice`).toBe(false)
      ids.add(c.id)
      if (c.next) expect(CHAPTER[c.next], `${c.id} → ${c.next} does not exist`).toBeDefined()
      expect(c.bridge.titleHe.length).toBeGreaterThan(0)
      expect(c.year).toBeGreaterThanOrEqual(c.stage === 'A' ? 1983 : 1986)
      // no compound id may be a bare calendar year (§13) — except the three already persisted
      if (!['1986', '1990', '1991'].includes(c.id)) expect(/^\d{4}$/.test(c.id), `${c.id} is a bare year`).toBe(false)
      if (c.playable) expect(SCENE[c.start.location as keyof typeof SCENE], `${c.id} starts nowhere`).toBeDefined()
    }
    // the chain visits every chapter exactly once
    let cursor: string | null = CHAPTERS[0]!.id
    const walked: string[] = []
    while (cursor) {
      walked.push(cursor)
      cursor = CHAPTER[cursor]!.next
    }
    expect(walked).toEqual(CHAPTERS.map((c) => c.id))
  })

  it('advances only to a chapter with rooms behind it', () => {
    for (const c of playableChapters()) {
      const next = nextPlayable(c.id)
      if (next) expect(next.playable).toBe(true)
    }
    expect(nextPlayable(lastPlayable().id)).toBeNull()
    expect(chapterFor('nope')).toBeNull()
  })

  it('has no "coming soon" left in the world scene', () => {
    const world = readFileSync('lib/life/runtime/scenes/WorldScene.ts', 'utf8')
    expect(world).not.toContain('סוף שלב ב׳')
    expect(world).toContain('advanceChapter()')
    expect(world).toContain("bus.emit('coda'")
  })
})

describe('הפתיח — once, for a life that is starting', () => {
  it('plays for a fresh life and never for one that has been lived in', () => {
    const fresh = new LifeEngine(DEFAULT_IDENTITY, 1986)
    fresh.dispatch({ t: 'rng.seeded', seed: 'x' })
    expect(lifeHasBegun(fresh.log(), fresh.state.flags)).toBe(false)

    const lived = new LifeEngine(DEFAULT_IDENTITY, 1986)
    lived.dispatch({ t: 'rng.seeded', seed: 'x' }, { t: 'chapter.entered', chapter: '1986' })
    expect(lifeHasBegun(lived.log(), lived.state.flags)).toBe(true)

    const watched = new LifeEngine(DEFAULT_IDENTITY, 1986)
    watched.dispatch({ t: 'flag.raised', flag: OPENING_FLAG })
    expect(lifeHasBegun(watched.log(), watched.state.flags)).toBe(true)
  })

  it('keeps the flag through every year and day, and the shell no longer asks the browser', () => {
    let state = emptyState(DEFAULT_IDENTITY, 1986)
    state = apply(state, { t: 'flag.raised', flag: OPENING_FLAG })
    state = apply(state, { t: 'year.entered', year: 1990, weekday: 6, minute: 800 })
    expect(state.flags[OPENING_FLAG]).toBe(true)
    // the boot moved into `app/life/stage/useLifeRuntime.ts` on 7.9.2026; the question is
    // unchanged — whoever decides whether the film plays must ask the LOG, not the browser
    const shell = readFileSync('app/life/LifeStage.tsx', 'utf8')
    const boot = readFileSync('app/life/stage/useLifeRuntime.ts', 'utf8')
    expect(shell).not.toContain('sessionStorage.getItem(OPENING_SEEN)')
    expect(boot).not.toContain('sessionStorage.getItem(OPENING_SEEN)')
    expect(boot).toContain('lifeHasBegun(')
  })

  /**
   * הסרט מתחיל בהתחלה.
   *
   * It opened on 2026 — the new ground, "forty-eight years, he still goes there" — and cut
   * back to the cot. That was the right frame for a game whose first playable minute was a
   * narrated title card, and the wrong one from the moment 1983 became something you play:
   * an opening that says he is still going has already told you how it turns out, and it
   * made the first image of a childhood a picture of an old man's habit. Maor cut it on
   * 6.9.2026. The coda at the end of the built life still returns to that ground, which is
   * where the sentence belongs.
   *
   * What the test protects now is the chronology: the first frame is the cot, and every
   * stamp after it moves forward or says nothing. A film about a life runs one way.
   */
  it('opens on the cot and never goes backwards', () => {
    expect(OPENING[0]!.stampHe).toBe('1978')
    expect(OPENING.some((beat) => beat.stampHe === '2026')).toBe(false)
    const years = OPENING.map((beat) => Number(beat.stampHe)).filter((year) => Number.isFinite(year))
    expect([...years].sort((a, b) => a - b)).toEqual(years)
  })
})
