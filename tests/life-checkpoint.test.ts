import { describe, expect, it } from 'vitest'

import { CHECKPOINT_VERSION, checkpointOf, didOnce, onceIn, onceFlag, resume, usable } from '@/lib/life/checkpoint'
import { ParallelHistoricalDirector, PRESET_1990, PRESET_1998 } from '@/lib/life/history'
import { apply, emptyState } from '@/lib/life/events'
import { ERA_KEYS, eraFor } from '@/lib/life/content/era'
import { SAVE_VERSION } from '@/lib/life/save'
import type { LifeState } from '@/lib/life/types'

/**
 * טעינה מחדש באמצע יום — the bug this file exists to keep dead.
 *
 * Reload in the eighty-first minute of 12.5.1990 and, until 7.9.2026, the fourth goal was
 * played to you a second time: the roar, the flash, the radio falling out of your father's
 * hand again, and two points of football love that history had already given you. The log
 * could not prevent it, because a directed day is not in the log.
 *
 * So the test is the audit's own sentence — *run → checkpoint → reload → finish* — and the
 * assertion is the strict one: the two lives must be identical, not merely similar.
 */

const life = (over: Partial<LifeState> = {}): LifeState => ({
  ...emptyState({ name: 'פוגי', sex: 'boy', birthYear: 1978 }, 1990),
  ...over,
})

const run = (director: ParallelHistoricalDirector, seconds: number) => {
  const fired: string[] = []
  for (let i = 0; i < seconds * 10; i += 1) {
    for (const signal of director.advance(100)) if (signal.k === 'event') fired.push(signal.event.id)
  }
  return fired
}

describe('רוץ → שמור → טען → סיים', () => {
  it('fires every canonical event exactly once across a reload', () => {
    const straight = new ParallelHistoricalDirector(PRESET_1990)
    const whole = run(straight, 200)

    const first = new ParallelHistoricalDirector(PRESET_1990)
    const part = run(first, 60)
    const checkpoint = checkpointOf('1990', '1990-05-12', first, 40)

    const second = new ParallelHistoricalDirector(PRESET_1990)
    expect(resume(second, checkpoint, '1990', 40)).toBe(true)
    const rest = run(second, 200)

    const split = [...part, ...rest]
    expect(new Set(split).size, 'an event fired twice across the reload').toBe(split.length)
    expect([...split].sort()).toEqual([...whole].sort())
  })

  it('lands on the same board after a reload as it does without one', () => {
    const straight = new ParallelHistoricalDirector(PRESET_1990)
    run(straight, 200)

    const first = new ParallelHistoricalDirector(PRESET_1990)
    run(first, 45)
    const second = new ParallelHistoricalDirector(PRESET_1990)
    resume(second, checkpointOf('1990', '1990-05-12', first, 7), '1990', 7)
    run(second, 200)

    expect(second.goalsFor('bloomfield', 'הפועל-תל-אביב')).toBe(straight.goalsFor('bloomfield', 'הפועל-תל-אביב'))
    expect(second.goalsFor('yavne', 'מכבי-יבנה')).toBe(straight.goalsFor('yavne', 'מכבי-יבנה'))
    expect(second.phaseOf('bloomfield')).toBe(straight.phaseOf('bloomfield'))
  })

  it('carries what he had been told across the reload, and who told him', () => {
    const first = new ParallelHistoricalDirector(PRESET_1990)
    run(first, 40)
    const heard = first.heardOn('radio', 'yavne')
    expect(heard.length).toBeGreaterThan(0)
    first.learn(heard[heard.length - 1]!, 'radio')

    const second = new ParallelHistoricalDirector(PRESET_1990)
    resume(second, checkpointOf('1990', '1990-05-12', first, 12), '1990', 12)
    expect(second.known().map((row) => row.via)).toContain('radio')
    expect(second.known()).toEqual(first.known())
  })

  it('carries the crowd wave across a reload of 2.5.1998', () => {
    const first = new ParallelHistoricalDirector(PRESET_1998)
    first.seek(105)
    const goal = PRESET_1998.day.venues[1]?.events.find((e) => e.id === '1998-parallel-goal-5')
    first.learn(goal!, 'transistor')
    run(first, 20)
    const before = first.crowdBoard()

    const second = new ParallelHistoricalDirector(PRESET_1998)
    resume(second, checkpointOf('1998-laces', '1998-05-02', first, 90), '1998-laces', 90)
    expect(second.crowdBoard()).toEqual(before)
  })
})

describe('מתי לא לסמוך על נקודת שמירה', () => {
  const director = new ParallelHistoricalDirector(PRESET_1990)
  const good = checkpointOf('1990', '1990-05-12', director, 30)

  it('refuses one from another chapter', () => {
    expect(usable(good, '1998-laces', 30)).toBe(false)
  })

  it('refuses one whose life has moved on since', () => {
    expect(usable(good, '1990', 31)).toBe(false)
    expect(usable(good, '1990', 29)).toBe(false)
  })

  it('refuses one from a version this build has never heard of', () => {
    expect(usable({ ...good, version: CHECKPOINT_VERSION + 1 }, '1990', 30)).toBe(false)
  })

  it('refuses one from a day that already finished', () => {
    const done = new ParallelHistoricalDirector(PRESET_1990)
    run(done, 200)
    // the 1990 preset has no ending policy, so the whistle completes it
    expect(usable(checkpointOf('1990', '1990-05-12', done, 30), '1990', 30)).toBe(false)
  })

  it('refuses nothing at all', () => {
    expect(usable(null, '1990', 0)).toBe(false)
    expect(resume(new ParallelHistoricalDirector(PRESET_1990), null, '1990', 0)).toBe(false)
  })

  it('accepts the one that still describes this life', () => {
    expect(usable(good, '1990', 30)).toBe(true)
  })
})

describe('פעם אחת בחיים — הרשת מתחת לרשת', () => {
  it('gives the effect the first time and nothing after it', () => {
    const before = life()
    const first = onceIn(before, '1990:goal:4', [{ t: 'redheart.changed', key: 'footballLove', delta: 2 }])
    expect(first).toHaveLength(2)
    const after = first.reduce(apply, before)
    expect(didOnce(after, '1990:goal:4')).toBe(true)
    expect(onceIn(after, '1990:goal:4', [{ t: 'redheart.changed', key: 'footballLove', delta: 2 }])).toEqual([])
  })

  it('keeps one goal apart from another', () => {
    const state = onceIn(life(), '1990:goal:1', []).reduce(apply, life())
    expect(didOnce(state, '1990:goal:1')).toBe(true)
    expect(didOnce(state, '1990:goal:2')).toBe(false)
  })

  it('gives the love exactly once however many times the day is replayed', () => {
    let state = life()
    let love = 0
    for (let replay = 0; replay < 3; replay += 1) {
      for (let goal = 1; goal <= 6; goal += 1) {
        const events = onceIn(state, `1990:goal:${goal}`, [{ t: 'redheart.changed', key: 'footballLove', delta: 2 }])
        love += events.filter((e) => e.t === 'redheart.changed').length * 2
        state = events.reduce(apply, state)
      }
    }
    expect(love).toBe(12)
  })

  it('rides the log under its own prefix, so nothing else can collide with it', () => {
    expect(onceFlag('1990:goal:1')).toBe('once:1990:goal:1')
  })
})

describe('הקובץ', () => {
  it('is version 4 — the log, plus one field beside it', () => {
    expect(SAVE_VERSION).toBe(4)
  })
})

/**
 * ברז הכסף — 7.9.2026, found by a scanner written for something else.
 *
 * A beat re-arms when its own `when` is still true after it finishes. That rule exists for a
 * good reason — a conversation the player walked out of has not happened, and the beat has
 * to come back — but it has a sharp edge: a beat that GIVES something permanent and does not
 * change any flag it is gated on comes back for ever.
 *
 * `g4-open` was exactly that. It hands the boy forty-five shekels on the fourth day of 1993,
 * fires on entering the street, and was gated on three flags it never touched. Walk out of
 * the street and back in and you were paid again. Nothing failed; the money simply grew.
 *
 * So: any beat that grants something permanent, and does not open a conversation, a match or
 * an ending that could raise the flag for it, has to gate on a flag it raises itself. Eight
 * beats in the game qualify. All eight pass. The ninth one somebody writes will not.
 */
describe('ביט שנותן משהו — פעם אחת בלבד', () => {
  const GRANTS = new Set([
    'money.changed',
    'redheart.changed',
    'wellbeing.changed',
    'item.gained',
    'relationship.changed',
    'personality.shifted',
    'bond.shifted',
    'trait.shifted',
    'relationship.memory_added',
  ])

  const flagsIn = (condition: unknown, out: string[] = []): string[] => {
    const node = condition as { flag?: string; all?: unknown[]; any?: unknown[]; none?: unknown[] } | undefined
    if (!node) return out
    if (node.flag) out.push(node.flag)
    for (const key of ['all', 'any', 'none'] as const) for (const part of node[key] ?? []) flagsIn(part, out)
    return out
  }

  it('gates every rewarding beat on a flag it raises itself', () => {
    let checked = 0
    for (const key of ERA_KEYS) {
      for (const beat of (eraFor(key).beats ?? []) as unknown as Array<{ id: string; when?: unknown; do: readonly Record<string, unknown>[] }>) {
        // a beat that opens a conversation, a match or an ending may be gated by what THOSE raise
        const opens = beat.do.some((a) => a['a'] === 'talk' || a['a'] === 'match' || a['a'] === 'ending' || a['a'] === 'travel')
        const grants = beat.do.some(
          (a) => a['a'] === 'events' && (a['events'] as Array<{ t: string }>).some((e) => GRANTS.has(e.t)),
        )
        if (!grants || opens) continue
        checked += 1
        const raises = new Set<string>()
        for (const action of beat.do) {
          if (action['a'] === 'flag') raises.add(action['flag'] as string)
          if (action['a'] === 'events') {
            for (const event of action['events'] as Array<{ t: string; flag?: string }>) {
              if (event.t === 'flag.raised' && event.flag) raises.add(event.flag)
            }
          }
        }
        const gate = flagsIn(beat.when)
        expect(
          [...raises].some((flag) => gate.includes(flag)),
          `${key}/${beat.id} gives something permanent and does not gate on anything it raises — it will re-arm and give it again`,
        ).toBe(true)
      }
    }
    expect(checked, 'the scan found no rewarding beats at all, which means it stopped working').toBeGreaterThan(4)
  })
})
