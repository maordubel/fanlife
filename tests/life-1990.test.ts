import { describe, expect, it } from 'vitest'

import { DIALOGUE } from '@/lib/life/content/dialogue'
import { CONVERSATIONS_1990 } from '@/lib/life/content/dialogue1990'
import { ERA_1986, ERA_1990, eraFor } from '@/lib/life/content/era'
import { PASSAGE_1990, SCHOOL_MORNING_1990, TABLE_1990 } from '@/lib/life/content/chapter1990'
import { LifeEngine } from '@/lib/life/engine'
import { apply, emptyState, type LifeEvent } from '@/lib/life/events'
import { buildFinale } from '@/lib/life/finale'
import { FIGURE, PORTRAIT_ART } from '@/lib/life/runtime/art'
import { ALL_SCENES, artFor, exitInEra, inEra, needsFor, sceneFor } from '@/lib/life/world/scenes'
import { meets } from '@/lib/life/world/types'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { DEVELOPMENT_ANCHOR } from '@/lib/life/anchors'
import { LifeBus } from '@/lib/life/runtime/bus'
import { DialogueRunner } from '@/lib/life/runtime/dialogue'

/**
 * שלב ב׳ — the four years, the table, and the day: what the engine promises before a
 * browser ever opens.
 */
const identity = DEFAULT_IDENTITY

function lived(): LifeEngine {
  const engine = new LifeEngine(identity, 1986)
  engine.dispatch(
    { t: 'flag.raised', flag: 'prologue:done' },
    { t: 'chapter.entered', chapter: '1986' },
    { t: 'flag.raised', flag: 'onboard:moved' },
    { t: 'flag.raised', flag: 'onboard:acted' },
    { t: 'flag.raised', flag: 'onboard:street' },
    { t: 'item.gained', item: 'scarf' },
    { t: 'item.gained', item: 'house-key' },
    { t: 'money.changed', agorot: 200, why: 'test' },
    { t: 'flag.raised', flag: 'found:kobi' },
    { t: 'relationship.changed', who: 'kobi', axis: 'sharedHistory', delta: 12 },
    { t: 'memory.kept', memory: { id: '1986-the-goal', item: 'ticket-stub', atMinute: 900, year: 1986, anchorId: 'a' } },
    { t: 'clock.advanced', minutes: 300 },
    { t: 'chapter.completed', chapter: '1986' },
  )
  return engine
}

describe('ארבע שנים — year.entered is one biography, four years on', () => {
  it('moves the calendar and resets the day, and nothing that is HIM', () => {
    const engine = lived()
    const before = engine.state
    engine.dispatch({ t: 'year.entered', year: 1990, weekday: 6, minute: 12 * 60 + 35 }, { t: 'chapter.entered', chapter: '1990' })
    const after = engine.state
    expect(after.year).toBe(1990)
    expect(after.age).toBe(12)
    expect(after.chapter).toBe('1990')
    expect(after.chapterDone).toBe(false)
    expect(after.minute).toBe(12 * 60 + 35)
    expect(after.weekday).toBe(6)
    // the day resets
    expect(after.inventory).toEqual({})
    // ARNAK, 16.9.2026 — Maor: "הארנק לא מתאפס בסיום משימה אלא ממשיך איתך."
    // This line asserted the opposite until that decision, and it is changed rather than
    // deleted: the pocket surviving a transition IS the design, and a guard on a design
    // decision is what stops it drifting back in a refactor. See `lib/life/events.ts`.
    expect(after.agorot).toBe(200)
    expect(after.energy).toBe(100)
    expect(after.flags['found:kobi']).toBeUndefined()
    // the person stays
    expect(after.flags['prologue:done']).toBe(true)
    expect(after.flags['onboard:street']).toBe(true)
    expect(after.memories).toEqual(before.memories)
    expect(after.relationships['kobi']?.sharedHistory).toBe(before.relationships['kobi']?.sharedHistory)
    expect(after.rng.seed).toBe(before.rng.seed)
  })

  it('is folded by an older reader as a no-op rather than a crash', () => {
    const state = apply(emptyState(identity, 1986), { t: 'year.entered', year: 1990, weekday: 6, minute: 0 })
    expect(state.year).toBe(1990)
  })

  it('reopens in the passage, not in the finished Saturday: the boot decides on chapterDone', () => {
    const engine = lived()
    expect(engine.state.chapter).toBe('1986')
    expect(engine.state.chapterDone).toBe(true)
  })

  it('restarts the DAY from the last chapter.entered, keeping the life before it', () => {
    const engine = lived()
    engine.dispatch({ t: 'year.entered', year: 1990, weekday: 6, minute: 800 }, { t: 'chapter.entered', chapter: '1990' })
    engine.dispatch({ t: 'flag.raised', flag: 'knows:math' }, { t: 'clock.advanced', minutes: 120 })
    expect(engine.restartDay()).toBe(true)
    expect(engine.state.chapter).toBe('1990')
    expect(engine.state.flags['knows:math']).toBeUndefined()
    expect(engine.state.minute).toBe(800)
    expect(engine.state.memories.length).toBe(1)
    const fresh = new LifeEngine(identity, 1986)
    expect(fresh.restartDay()).toBe(false)
  })
})

describe('העידן — the chapter is data, and every chapter is complete', () => {
  it('resolves every chapter and falls back to 1986 for anything else', () => {
    expect(eraFor('1986')).toBe(ERA_1986)
    expect(eraFor('1990')).toBe(ERA_1990)
    /**
     * The prologue is its OWN era since 6.9.2026, and the assertion that it was not is
     * the bug it was hiding: `{anchor}` in the 1983 memory resolved through 1986 and
     * printed the 1985/86 championship — a fabricated fact in the first minute of a game
     * whose first rule forbids exactly that. It has 1983, its own anchor key, and nothing
     * else. Everything genuinely unknown still falls through to 1986.
     */
    expect(eraFor('prologue').year).toBe(1983)
    expect(eraFor('prologue').anchorKey).toBe('prologue')
    expect(eraFor('2000')).toBe(ERA_1986)
  })

  it('draws every player pose and every portrait from a figure that exists', () => {
    const figures = new Set<string>(FIGURE)
    const plates = new Set<string>(PORTRAIT_ART)
    for (const era of [ERA_1986, ERA_1990]) {
      for (const key of [...Object.values(era.player.pose), ...era.player.walk]) {
        expect(figures.has(key), `${era.chapter}: ${key}`).toBe(true)
      }
      for (const [who, plate] of Object.entries(era.portraits)) {
        expect(plates.has(plate), `${era.chapter}: ${who} → ${plate}`).toBe(true)
      }
    }
  })

  it('gives every speaker in the 1990 lines a plate', () => {
    const speakers = new Set<string>()
    for (const line of [...TABLE_1990, ...SCHOOL_MORNING_1990]) if (line.who) speakers.add(line.who)
    for (const conversation of CONVERSATIONS_1990)
      for (const branch of conversation.branches) for (const line of branch.lines) if (line.who) speakers.add(line.who)
    for (const who of speakers) expect(ERA_1990.portraits[who], `${who} has no plate in 1990`).toBeDefined()
  })

  it('has doors in every year: a room the 1990 boy can never leave is a bug', () => {
    for (const scene of ALL_SCENES) {
      if (scene.id === 'bloomfield-inside') continue
      const doors = scene.exits.filter((exit) => exitInEra(exit, '1990'))
      expect(doors.length, `${scene.id} has no door in 1990`).toBeGreaterThan(0)
    }
  })

  it('puts 1990 people only in rooms 1990 can reach, and never a 1986 child in 1990', () => {
    for (const scene of ALL_SCENES) {
      for (const actor of scene.actors) {
        if (actor.era === '1990') expect(actor.figure).not.toMatch(/^(ofir|amit|efi|keren|kobi-)$/)
        if (inEra(actor, '1990') && !inEra(actor, '1986')) expect(actor.era).toBe('1990')
      }
    }
  })

  it('names every conversation a 1990 effect jumps or travels to', () => {
    const scenes = new Set(ALL_SCENES.map((scene) => scene.id))
    for (const conversation of CONVERSATIONS_1990) {
      for (const branch of conversation.branches) {
        const effects = [...(branch.then ?? []), ...(branch.choices ?? []).flatMap((choice) => choice.then)]
        for (const effect of effects) {
          if (effect.e === 'goto') expect(DIALOGUE[effect.node], `${conversation.id} → ${effect.node}`).toBeDefined()
          if (effect.e === 'travel') expect(scenes.has(effect.to), `${conversation.id} → ${effect.to}`).toBe(true)
          if (effect.e === 'ending') expect(ERA_1990.endings[effect.id], `${conversation.id} → ending ${effect.id}`).toBeDefined()
        }
      }
    }
  })

  it('states no score, scorer or minute of 12.5.1990 in an authored line', () => {
    const text = [
      ...TABLE_1990,
      ...SCHOOL_MORNING_1990,
      ...PASSAGE_1990.flatMap((entry) => [{ who: null, text: entry.lookHe }, { who: null, text: entry.afterHe }]),
      ...CONVERSATIONS_1990.flatMap((c) => c.branches.flatMap((b) => b.lines)),
    ]
      .map((line) => line.text)
      .join('\n')
    expect(/\b[0-6]\s*[:\-–—]\s*[0-6]\b/.test(text), 'a scoreline').toBe(false)
    for (const name of ["ז'אנו", 'ז׳אנו', 'אבוקסיס', 'מאיה', 'שמואל', 'אלבז', 'יאנו']) {
      expect(text.includes(name), `${name} is named in authored 1990 content`).toBe(false)
    }
    expect(/רמת עמידר|נתניה/.test(text), 'an opponent is named in authored 1990 content').toBe(false)
  })
})

describe('הסיום של 1990 — the finale reads the day it was given', () => {
  const day = (flags: string[], extra: LifeEvent[] = []) => {
    const engine = lived()
    engine.dispatch({ t: 'year.entered', year: 1990, weekday: 6, minute: 800 }, { t: 'chapter.entered', chapter: '1990' })
    engine.dispatch(...flags.map((flag) => ({ t: 'flag.raised', flag }) as LifeEvent), ...extra)
    return engine
  }
  it('knows the difference between being there, being late, and hearing it from the street', () => {
    const there = day(['entry:granted', 'match:over'])
    expect(buildFinale(there.state, there.log(), '1990').carnival).toBe(true)
    const late = day(['entry:granted'])
    expect(buildFinale(late.state, late.log(), '1990').titleHe).toBe('נכנסת')
    const outside = day(['match:over'])
    expect(buildFinale(outside.state, outside.log(), '1990').carnival).toBe(false)
  })
  it('pays the six off, and the son who told his father', () => {
    const six = day(['entry:granted', 'match:over', 'net:six'])
    expect(buildFinale(six.state, six.log(), '1990').bodyHe).toContain('שש')
    const told = day(['entry:granted', 'match:over', 'net:toldKobi'])
    expect(buildFinale(told.state, told.log(), '1990').becameHe).toContain('החדשות')
  })
})

describe('השיחות של 1990 — played headless through the runner', () => {
  const runner = (flags: string[], minute = 14 * 60 + 41) => {
    const engine = new LifeEngine(identity, 1986)
    engine.dispatch(
      { t: 'flag.raised', flag: 'prologue:done' },
      { t: 'chapter.entered', chapter: '1986' },
      { t: 'chapter.completed', chapter: '1986' },
      { t: 'year.entered', year: 1990, weekday: 6, minute },
      { t: 'chapter.entered', chapter: '1990' },
      ...flags.map((flag) => ({ t: 'flag.raised', flag }) as LifeEvent),
    )
    const bus = new LifeBus()
    const travelled: string[] = []
    const endings: string[] = []
    const anchor = { ...DEVELOPMENT_ANCHOR, year: 1990, match: null }
    const dialogue = new DialogueRunner(
      engine,
      bus,
      {
        travel: (to) => travelled.push(to),
        minigame: () => undefined,
        ending: (id) => endings.push(id),
        onOpen: () => undefined,
      },
      DEVELOPMENT_ANCHOR,
      { '1990': anchor },
    )
    const drain = () => {
      for (let i = 0; i < 20; i += 1) dialogue.advance()
    }
    return { engine, dialogue, travelled, endings, drain }
  }

  it('"יוצאים": going with him now travels to the ground, together', () => {
    const { engine, dialogue, travelled, drain } = runner(['knows:math', 'kobi:leaving'])
    expect(dialogue.start('kobi-table-1990')).toBe(true)
    drain()
    dialogue.choose('now')
    expect(engine.state.flags['went:withKobi']).toBe(true)
    expect(engine.state.flags['kobi:left']).toBe(true)
    expect(travelled).toEqual(['bloomfield-outside'])
    expect(engine.state.minute).toBe(14 * 60 + 41 + 30)
  })

  it('"חמש דקות" is offered once, and going with friends needs the phone call', () => {
    const { engine, dialogue, drain } = runner(['knows:math', 'kobi:leaving'])
    dialogue.start('kobi-table-1990')
    drain()
    dialogue.choose('five')
    expect(engine.state.flags['asked:five']).toBe(true)
    expect(engine.state.flags['kobi:left']).toBeUndefined()
    // the friends route is visible but shut until Ofir has called
    const { dialogue: again, engine: e2 } = runner(['knows:math', 'kobi:leaving', 'ofir:invited'])
    again.start('kobi-table-1990')
    for (let i = 0; i < 20; i += 1) again.advance()
    again.choose('friends')
    expect(e2.state.flags['going:friends']).toBe(true)
  })

  it('the table teaches the race in words, and "six" is remembered', () => {
    const { engine, dialogue, drain } = runner([], 12 * 60 + 35)
    dialogue.start('table-1990')
    drain()
    dialogue.choose('six')
    expect(engine.state.flags['knows:math']).toBe(true)
    expect(engine.state.flags['math:six']).toBe(true)
    const { engine: e2, dialogue: d2 } = runner([], 12 * 60 + 35)
    d2.start('table-1990')
    for (let i = 0; i < 20; i += 1) d2.advance()
    d2.choose('ask')
    // the goto lands on Kobi's explanation, which raises the flags on its own
    for (let i = 0; i < 20; i += 1) d2.advance()
    expect(e2.state.flags['math:kobi']).toBe(true)
    expect(e2.state.flags['knows:radio']).toBe(true)
  })

  it('the radio on the table says nothing before four, and the key it turns is `knows:radio`', () => {
    const { engine, dialogue, drain } = runner([], 12 * 60 + 40)
    expect(dialogue.start('radio-table-1990')).toBe(true)
    drain()
    expect(engine.state.flags['knows:radio']).toBe(true)
  })

  it('Rachel closes the day: "נו?" — "עלינו." — and the ending is the walk home', () => {
    const { engine, dialogue, endings, drain } = runner(['entry:granted', 'match:over', 'found:kobi'], 18 * 60 + 30)
    dialogue.start('rachel-1990')
    drain()
    expect(engine.state.flags['walked:home']).toBe(true)
    expect(endings).toEqual(['home'])
    const { dialogue: d2, endings: e2 } = runner(['match:over'], 18 * 60 + 30)
    d2.start('rachel-1990')
    for (let i = 0; i < 20; i += 1) d2.advance()
    expect(e2).toEqual(['missed'])
  })

  it('the gate: Kobi hands over the ticket; the window sells one for the pocket money; Ofir needs the friends route', () => {
    const { engine, dialogue, drain } = runner(['went:withKobi'], 15 * 60 + 50)
    dialogue.start('kobi-gate-1990')
    drain()
    expect(engine.state.flags['entry:granted']).toBe(true)
    expect(engine.state.inventory['ticket-stub']).toBe(1)
    const paid = runner([], 15 * 60 + 50)
    paid.engine.dispatch({ t: 'money.changed', agorot: 3200, why: 't' }, { t: 'item.gained', item: 'pocket-money' })
    paid.dialogue.start('ticket-window-1990')
    paid.drain()
    expect(paid.engine.state.flags['entry:ticket']).toBe(true)
    expect(paid.engine.state.agorot).toBe(200)
    const poor = runner([], 15 * 60 + 50)
    poor.dialogue.start('ticket-window-1990')
    poor.drain()
    expect(poor.engine.state.flags['entry:granted']).toBeUndefined()
  })
})

describe('הדלתות של 1990 — a twelve-year-old walks out of his own house', () => {
  it('needs no key to leave the flat and no rumour to walk east', () => {
    // The first bug Maor met in Stage B: the 1986 lock ("the key is in your drawer")
    // applied to a year with no key in any drawer. And the road east was gated on
    // `knows:match`, a flag only 1986 raises — the whole second chapter was a locked flat.
    const state = { ...emptyState(DEFAULT_IDENTITY, 1990), chapter: '1990' }
    const home = sceneFor('home').exits.find((exit) => exit.id === 'street')!
    const street = sceneFor('street').exits.find((exit) => exit.id === 'route')!
    expect(meets(state, needsFor(home, '1990'))).toBe(true)
    expect(meets(state, needsFor(street, '1990'))).toBe(true)
    // …and 1986 keeps its road lock. The key lock is gone in every year (Director V3 §11,
    // 24.9.2026): the front door no longer asks for the key on the string.
    expect(meets(state, needsFor(home, '1986'))).toBe(true)
    expect(meets(state, needsFor(street, '1986'))).toBe(false)
  })

  it('paints the bedroom and the street four years on', () => {
    expect(artFor(sceneFor('bedroom'), '1990')).toBe('bedroom90')
    expect(artFor(sceneFor('street'), '1990')).toBe('street90')
    expect(artFor(sceneFor('bedroom'), '1986')).toBe('bedroom')
  })
})
