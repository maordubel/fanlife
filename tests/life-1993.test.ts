import { describe, expect, it } from 'vitest'

import { BEATS_1993, CONVERSATIONS_1993, ENDINGS_1993, objective1993 } from '@/lib/life/content/chapter1993cup'
import { CHAPTER } from '@/lib/life/content/chapters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { ERA_1993_CUP, eraFor } from '@/lib/life/content/era'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { beatsAt } from '@/lib/life/content/beats'
import { LifeEngine } from '@/lib/life/engine'
import { ALL_SCENES, inEra } from '@/lib/life/world/scenes'
import { meets } from '@/lib/life/world/types'

/**
 * B3 · 19.4.1993 — the first chapter written as data. What this suite holds it to:
 * every id points somewhere, no line states a result, every ending knows how he was
 * there, and the day's beats fire where and when they say.
 */
const lines = CONVERSATIONS_1993.flatMap((c) => c.branches.flatMap((b) => b.lines.map((l) => l.text)))

describe('B3 — הגביע אדום', () => {
  it('is playable and chained after 1991', () => {
    expect(CHAPTER['1993-cup']!.playable).toBe(true)
    expect(CHAPTER['1991']!.next).toBe('1993-cup')
    expect(eraFor('1993-cup')).toBe(ERA_1993_CUP)
  })

  it('states no score, no opponent, no scorer', () => {
    for (const text of lines) {
      expect(/\d+\s*[:\-–]\s*\d+/.test(text), text).toBe(false)
      for (const name of ['גבעתיים', 'מכבי', 'גליל']) expect(text.includes(name), `${name} in: ${text}`).toBe(false)
    }
  })

  it('points every talk, goto, ending and actor at something that exists', () => {
    for (const c of CONVERSATIONS_1993) {
      expect(DIALOGUE[c.id], c.id).toBeDefined()
      for (const b of c.branches) {
        for (const ch of b.choices ?? []) for (const fx of ch.then) if (fx.e === 'goto') expect(DIALOGUE[fx.node], `${c.id} → ${fx.node}`).toBeDefined()
        for (const fx of b.then ?? []) if (fx.e === 'goto') expect(DIALOGUE[fx.node], `${c.id} → ${fx.node}`).toBeDefined()
      }
    }
    for (const beat of BEATS_1993) {
      for (const action of beat.do) {
        if (action.a === 'talk') expect(DIALOGUE[action.conversation], `${beat.id} → ${action.conversation}`).toBeDefined()
        if (action.a === 'ending') expect(ENDINGS_1993[action.id], `${beat.id} → ending ${action.id}`).toBeDefined()
      }
    }
    for (const scene of ALL_SCENES) {
      for (const actor of scene.actors) {
        if (!inEra(actor, '1993-cup') || actor.era === undefined) continue
        if (actor.talk) expect(DIALOGUE[actor.talk], `${scene.id}/${actor.id} → ${actor.talk}`).toBeDefined()
      }
      for (const spot of scene.hotspots) {
        if (spot.era !== '1993-cup') continue
        expect(DIALOGUE[spot.act], `${scene.id}/${spot.id} → ${spot.act}`).toBeDefined()
      }
    }
  })

  it('gives every ending a presence and a memory', () => {
    for (const ending of Object.values(ENDINGS_1993)) {
      expect(ending.presence).toBeDefined()
      expect(ending.bodyHe.length).toBeGreaterThan(60)
    }
    expect(ENDINGS_1993['inside']!.presence).toBe('inside')
    expect(ENDINGS_1993['missed']!.presence).toBe('heard-from-friend')
  })

  it('opens at home with a beat and lets the evening happen without him', () => {
    const engine = new LifeEngine(DEFAULT_IDENTITY, 1993)
    engine.dispatch({ t: 'year.entered', year: 1993, weekday: 1, minute: 15 * 60 + 30 }, { t: 'chapter.entered', chapter: '1993-cup' })
    const open = beatsAt(BEATS_1993, 'enter', 'home').find((b) => meets(engine.state, b.when))
    expect(open?.id).toBe('93-open')
    expect(objective1993(engine.state, 'home')).toContain('כסף')
    engine.dispatch({ t: 'clock.advanced', minutes: 6 * 60 + 15 })
    const roar = beatsAt(BEATS_1993, 'clock', 'street').filter((b) => meets(engine.state, b.when)).map((b) => b.id)
    expect(roar).toContain('93-street-roar')
    // on the bus, the street never roars at him
    engine.dispatch({ t: 'flag.raised', flag: 'on:bus' })
    expect(beatsAt(BEATS_1993, 'clock', 'street').filter((b) => meets(engine.state, b.when)).map((b) => b.id)).not.toContain('93-street-roar')
  })

  it('makes the money a real obstacle with three ways through it', () => {
    const rachel = DIALOGUE['rachel-1993']!
    const open = rachel.branches[rachel.branches.length - 1]!
    const ids = (open.choices ?? []).map((c) => c.id)
    expect(ids).toEqual(['ask', 'own', 'stay'])
    const bus = DIALOGUE['bus-1993']!
    expect(bus.branches.some((b) => b.when && 'minAgorot' in b.when)).toBe(true)
  })
})
