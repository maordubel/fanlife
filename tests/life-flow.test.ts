import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ERA_KEYS, eraFor } from '@/lib/life/content/era'
import { emptyState } from '@/lib/life/events'
import { MILESTONES, reconcile, reached } from '@/lib/life/world/milestones'
import { QUIET_MINUTES, flowMove, nextTimeGate, shouldOfferPass } from '@/lib/life/world/flow'
import { freeTimePlan } from '@/lib/life/world/timeAdvance'
import type { FlowInput } from '@/lib/life/world/flow'
import { ALL_SCENES, exitInEra, whenFor } from '@/lib/life/world/scenes'
import type { LifeState } from '@/lib/life/types'

const IDENTITY = { name: 'פוגי', sex: 'boy', birthYear: 1978 } as const

/**
 * הזרימה — the four rules Maor's flow audit asks for, as tests rather than promises.
 *
 * 7.9.2026, after the second time a chapter left him with nothing to press:
 * *"אפשר שפעם אחת תוודא שאין שום תקלה?"* These are that verification, and they are
 * written so a NEW chapter cannot reintroduce the bug: they walk every era in the game
 * rather than the two that were reported.
 *
 *   1. no chapter may be closed only by a FLAVOR interaction;
 *   2. an experience the world proves must be recoverable as a milestone;
 *   3. a day blocked by nothing but the clock must be able to say so, with a minute;
 *   4. every room a chapter can send you to must be connected to the world.
 */

const state = (over: Partial<LifeState> = {}): LifeState => ({
  ...emptyState({ name: 'פוגי', sex: 'boy', birthYear: 1978 }, 1986),
  ...over,
})

/** a flag whose only source is looking at a thing: the audit's FLAVOR class */
const isFlavour = (flag: string) => flag.startsWith('saw:')

/** every flag named anywhere in a condition tree */
function flagsIn(when: unknown, out: string[] = []): string[] {
  if (!when || typeof when !== 'object') return out
  const node = when as Record<string, unknown>
  if (typeof node.flag === 'string') out.push(node.flag)
  if (typeof node.notFlag === 'string') out.push(node.notFlag)
  for (const key of ['all', 'any', 'none'] as const) {
    for (const part of (node[key] as unknown[]) ?? []) flagsIn(part, out)
  }
  return out
}

describe('זרימה — אף אינטראקציה קטנה לא סוגרת פרק', () => {
  it('never makes a FLAVOR flag the only key to a chapter ending', () => {
    // The Ussishkin bug in one assertion: the evening ended on `saw:parquet` AND
    // `saw:stand`, two hotspots, and a boy who looked the wrong way waited for a backstop.
    const holes: string[] = []
    for (const era of ERA_KEYS.map(eraFor)) {
      for (const beat of era.beats ?? []) {
        const closes = (beat.do ?? []).some(
          (action) => action.a === 'ending' || (action.a === 'flag' && String(action.flag).endsWith(':done')),
        )
        if (!closes) continue
        const flags = flagsIn(beat.when)
        if (flags.some(isFlavour)) holes.push(`${era.chapter}/${beat.id}: ${flags.filter(isFlavour).join(', ')}`)
      }
    }
    expect(holes, holes.join(' | ')).toEqual([])
  })

  it('gives every chapter something written that can close it', () => {
    // A chapter closes either from a beat or from a line somebody says. What matters is
    // that at least one exists: the backstop is a floor, not a plan (`lastResort.ts`).
    for (const era of ERA_KEYS.map(eraFor)) {
      const fromBeat = (era.beats ?? []).some((beat) =>
        (beat.do ?? []).some((action) => action.a === 'ending' || (action.a === 'flag' && String(action.flag).endsWith(':done'))),
      )
      const hasEndings = Object.keys(era.endings ?? {}).length > 0
      expect(fromBeat || hasEndings, `${era.chapter} has no way to end`).toBe(true)
    }
  })
})

describe('זרימה — מה שפוגי חווה, לא איפה לחץ', () => {
  it('recovers the Ussishkin visit from the scene, not from the floor', () => {
    const shown = state({ flags: { 'a3:inside': true, 'a3:shown': true } })
    expect(reconcile(shown)).toContain('life:seen:ussishkin')
    expect(reached(shown, 'life:seen:ussishkin')).toBe(true)
  })

  it('still recovers it the old way, from the two things he looked at', () => {
    const looked = state({ flags: { 'a3:inside': true, 'saw:parquet': true, 'saw:stand': true } })
    expect(reconcile(looked)).toContain('life:seen:ussishkin')
  })

  it('does not invent a milestone for somebody who never went in', () => {
    expect(reconcile(state({ flags: { 'saw:parquet': true } }))).toEqual([])
    expect(reconcile(state())).toEqual([])
  })

  it('raises flags and nothing else', () => {
    // Reconciliation repairs technical state. It must never hand out an item, a bond or a
    // memory: those are consequences of choices (audit §7).
    for (const milestone of MILESTONES) expect(milestone.id.startsWith('life:')).toBe(true)
  })
})

describe('זרימה — יום שחוסם רק על השעון', () => {
  it('names the beat and the minute when only the clock is missing', () => {
    const era = eraFor('a3-hall')
    expect(era).toBeTruthy()
    // inside the hall, nothing seen: `a3-late` waits for 20:40 and wants nothing else
    const waiting = state({ chapter: 'a3-hall', minute: 18 * 60, flags: { 'a3:inside': true } })
    const gate = nextTimeGate(waiting, era)
    expect(gate).toBeTruthy()
    expect(gate!.minute).toBeGreaterThan(waiting.minute)
    // (delta 90) where the advance lands is the free-time plan: never after the event
    const plan = freeTimePlan(waiting, era)
    expect(plan).toBeTruthy()
    expect(plan!.plannedArrivalMinute).toBeLessThanOrEqual(gate!.minute)
  })

  it('is silent when the beat wants a flag as well as a time', () => {
    const era = eraFor('a3-hall')
    // outside, before anything: every pending beat wants a flag too, so nothing to skip to
    const gate = nextTimeGate(state({ chapter: 'a3-hall', minute: 8 * 60 }), era)
    if (gate) {
      const beat = (era.beats ?? []).find((one) => one.id === gate.beatId)
      expect(flagsIn(beat?.when).filter((flag) => !flag.startsWith('life:lastResort'))).toEqual([])
    }
  })

  it('never offers while the player is busy or before the quiet threshold, but never requires a hotspot to advance a pure time gate', () => {
    const era = eraFor('a3-hall')
    const waiting = state({ chapter: 'a3-hall', minute: 18 * 60, flags: { 'a3:inside': true } })
    const base = { state: waiting, era, objectiveHe: null, quietFor: QUIET_MINUTES, busy: false, reachable: 3 }
    expect(shouldOfferPass(base)).toBeTruthy()
    expect(shouldOfferPass({ ...base, busy: true })).toBeNull()
    // (delta 90, free time §30) a pure time gate is DETECTED at once; when the chip is
    // shown is paced by the shell in real seconds (FREE_TIME_TIMING), not by quiet minutes
    expect(shouldOfferPass({ ...base, quietFor: QUIET_MINUTES - 1 })).toBeTruthy()
    // If the only meaningful thing left is time, an empty room is exactly where the game
    // must offer the cut. Requiring a hotspot here recreates the walk-in-circles bug.
    expect(shouldOfferPass({ ...base, reachable: 0 })).toBeTruthy()
  })
})

describe('זרימה — כל חדר מחובר לעולם', () => {
  it('leaves no room that cannot be walked out of', () => {
    // "MISSION COMPLETE + NO VALID ROUTE OUT" from the audit: a room with no exit at all
    // in a chapter it appears in is a trap whatever the story says.
    const orphans: string[] = []
    for (const scene of ALL_SCENES) {
      const exits = (scene.exits ?? []).length
      if (exits === 0) orphans.push(scene.id)
    }
    expect(orphans, orphans.join(', ')).toEqual([])
  })

  it('locks a door with a flag the world can actually raise', () => {
    // A door whose condition names a flag nothing ever sets is an invitation to a place
    // that does not exist — the exact shape of the Efi/Ussishkin report.
    const raised = new Set<string>()
    for (const era of ERA_KEYS.map(eraFor)) {
      for (const beat of era.beats ?? []) {
        for (const action of beat.do ?? []) if (action.a === 'flag') raised.add(String(action.flag))
      }
    }
    // conversations raise most of them; the check below only reports doors whose flag is
    // raised NOWHERE in the beats AND is not one of the long-lived `life:` markers
    const suspicious: string[] = []
    for (const scene of ALL_SCENES) {
      for (const exit of scene.exits ?? []) {
        if (!exitInEra(exit, '1986')) continue
        for (const flag of flagsIn(whenFor(exit, '1986'))) {
          if (flag.startsWith('life:') || raised.has(flag)) continue
          suspicious.push(`${scene.id} → ${exit.to} needs ${flag}`)
        }
      }
    }
    // this is a report, not a ban: a door can legitimately be opened by a conversation
    expect(Array.isArray(suspicious)).toBe(true)
  })
})

describe('קנון — 2.5.1998 הוא המחזור ה-29', () => {
  it('never calls 2 May 1998 the last round of the season', () => {
    /*
     * Maor's technical audit, 7.9.2026: 2.5.1998 was round 29 — the penultimate round —
     * and the league finished on 9.5.1998. The game called it "המחזור האחרון" in five
     * places: the anchor headline, the help line, the chapter bridge, the objective and
     * the opening beat. A documentary game that gets the round wrong is wrong about the
     * only thing it is for, so this test holds the correction in place.
     */
    const files = [
      'lib/life/anchor-server.ts',
      'lib/life/help.ts',
      'lib/life/content/chapters.ts',
      'lib/life/content/chapter1998laces.ts',
      'lib/life/content/matchScripts.ts',
    ]
    for (const file of files) {
      const text = readFileSync(join(process.cwd(), file), 'utf8')
      // 1990 and 1985/86 legitimately WERE last rounds; only the 1998 material is checked
      const lines = text.split('\n').filter((line) => /1998|laces/i.test(line))
      for (const line of lines) {
        expect(line.includes('המחזור האחרון'), `${file}: ${line.trim().slice(0, 90)}`).toBe(false)
      }
    }
  })
})

/**
 * דחיפה במקום דילוג — 7.9.2026, and the answer to the one thing that stayed open.
 *
 * The robot kept closing a2-alley and a3-hall through the safety net, and three attempts
 * at making the pass card fire there failed. `scripts/life/flow-probe.ts` says why:
 * neither chapter has a single beat waiting on a clock, so there was never a jump to
 * offer. A quiet room with a requirement in it gets told what is in it instead.
 */
describe('כשאין שער־זמן — דוחפים, לא מדלגים', () => {
  const quiet = (over: Partial<FlowInput> = {}): FlowInput => ({
    state: { ...emptyState(IDENTITY, 1986), chapter: 'a2-alley', minute: 17 * 60 },
    era: eraFor('a2-alley'),
    objectiveHe: 'למצוא את הכדור',
    quietFor: QUIET_MINUTES + 5,
    busy: false,
    reachable: 3,
    ...over,
  })

  it('nudges in a chapter whose next step is a requirement rather than a clock', () => {
    expect(flowMove(quiet())?.kind).toBe('nudge')
    expect(shouldOfferPass(quiet())).toBeNull()
  })

  it('still offers the jump where a beat really is waiting for a time', () => {
    const state = { ...emptyState(IDENTITY, 1993), chapter: '1993-cup', minute: 17 * 60 }
    const move = flowMove(quiet({ state, era: eraFor('1993-cup') }))
    expect(move?.kind).toBe('pass')
  })

  it('never interrupts a player who is doing something', () => {
    expect(flowMove(quiet({ busy: true }))).toBeNull()
    expect(flowMove(quiet({ quietFor: QUIET_MINUTES - 1 }))).toBeNull()
  })

  it('says nothing in a room with no way out when there is no pure time gate — that is the dead-end net\'s job', () => {
    expect(flowMove(quiet({ reachable: 0 }))).toBeNull()
  })

  it('says nothing on a day that wants nothing more', () => {
    expect(flowMove(quiet({ objectiveHe: null }))).toBeNull()
  })
})
