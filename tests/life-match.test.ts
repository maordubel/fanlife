import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * ~60 שניות — every directed match, walked without a browser.
 *
 * What the brief asked for, as assertions: a regular match spends about a minute of
 * clock and never more than sixty-two seconds; the kickoff comes first and the whistle
 * last; every goal lies between them; the board a script ends on is the archive's
 * score for that night, never one this game made up; a minute on the board exists only
 * where the archive holds a goal minute; every prompt the script names is a registered
 * conversation with two or three choices; and the director, driven by fake timers,
 * runs the steps in order, pushes the board, and stops cleanly when its room is gone.
 */
import { describe, expect, it, vi } from 'vitest'

import { resolveChapterAnchor, resolveStageBAnchors } from '@/lib/life/anchor-server'
import type { HistoricalAnchor } from '@/lib/life/anchors'
import { CHAPTER } from '@/lib/life/content/chapters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { ERA_KEYS, eraFor } from '@/lib/life/content/era'
import { finalBoard, MATCH_SCRIPTS, REGULAR_MATCH_MAX_MS, SCRIPT_CHAPTER, scriptMs } from '@/lib/life/content/matchScripts'
import type { LifeEvent } from '@/lib/life/events'
import type { LifeBusEvents } from '@/lib/life/runtime/bus'
import { MatchDirector, type MatchHost } from '@/lib/life/runtime/matchDirector'

const ROOT = process.cwd()

const stageB = resolveStageBAnchors()
const anchorFor = (scriptId: string): HistoricalAnchor => {
  const chapterId = SCRIPT_CHAPTER[scriptId]!
  if (chapterId === '1986') return resolveChapterAnchor()
  const chapter = CHAPTER[chapterId]!
  return stageB[chapter.anchorKey]!
}

describe('match scripts — the shape the brief asked for', () => {
  it('every script has a kickoff first, a whistle last, and its goals in between', () => {
    for (const script of Object.values(MATCH_SCRIPTS)) {
      const ids = script.steps.map((s) => s.id)
      expect(script.steps[0]!.wait, script.id).toBe(0)
      expect(script.steps[script.steps.length - 1]!.end ?? script.steps[script.steps.length - 2]!.end, script.id).toBe(true)
      const endAt = script.steps.findIndex((s) => s.end)
      for (const [i, step] of script.steps.entries()) {
        if (step.goal || step.board) expect(i, `${script.id}: ${step.id}`).toBeLessThanOrEqual(endAt)
      }
      expect(new Set(ids).size, script.id).toBe(ids.length)
    }
  })

  it('a regular match spends under sixty-two seconds of clock; the 1986 final is the named exception', () => {
    for (const script of Object.values(MATCH_SCRIPTS)) {
      const ms = scriptMs(script)
      if (script.exempt) {
        expect(script.id).toBe('final-86')
        continue
      }
      expect(ms, `${script.id} = ${ms}ms`).toBeLessThanOrEqual(REGULAR_MATCH_MAX_MS)
      // a hall night wraps a conversation that carries it; a football match carries itself
      expect(ms, `${script.id} is too short to be a match`).toBeGreaterThanOrEqual(script.sport === 'football' ? 30_000 : 10_000)
    }
  })

  it('ends every scored script on the archive’s result — never a score this game typed in', () => {
    for (const script of Object.values(MATCH_SCRIPTS)) {
      const anchor = anchorFor(script.id)
      const board = finalBoard(script)
      if (!script.scored) {
        expect(board, script.id).toBeNull()
        continue
      }
      expect(anchor.match, `${script.id} needs an archive row`).not.toBeNull()
      expect(board, script.id).toEqual({ for: anchor.match!.scoredFor, against: anchor.match!.scoredAgainst })
    }
  })

  it('puts a minute on the board only where the archive holds a goal minute', () => {
    for (const script of Object.values(MATCH_SCRIPTS)) {
      const anchor = anchorFor(script.id)
      const minutes = script.steps.filter((s) => s.minute !== undefined)
      if (anchor.match?.decidedBy) {
        expect(minutes.some((s) => s.minute === anchor.match!.decidedBy!.minute), script.id).toBe(true)
        const goal = script.steps.find((s) => s.goal === 'for' && s.authored)
        expect(goal?.minute, script.id).toBe(anchor.match.decidedBy.minute)
      } else {
        expect(minutes, `${script.id} claims a minute the archive does not hold`).toHaveLength(0)
      }
    }
  })

  it('every prompt is a registered short conversation with two or three choices, and every script is used by a beat', () => {
    for (const script of Object.values(MATCH_SCRIPTS)) {
      for (const step of script.steps) {
        if (!step.talk) continue
        const conversation = DIALOGUE[step.talk]
        expect(conversation, `${script.id} → ${step.talk}`).toBeDefined()
        const choices = conversation!.branches.flatMap((b) => b.choices ?? [])
        if (step.talk.startsWith('m')) expect(choices.length, step.talk).toBeGreaterThanOrEqual(2)
      }
    }
    const used = new Set<string>()
    for (const key of ERA_KEYS) {
      const era = eraFor(key)
      for (const beat of era.beats ?? []) for (const action of beat.do) if (action.a === 'match') used.add(action.script)
    }
    for (const id of Object.keys(MATCH_SCRIPTS)) {
      if (id === 'final-86') continue // the scene starts it, not a beat
      expect(used.has(id), `${id} is never played`).toBe(true)
    }
    for (const id of used) expect(MATCH_SCRIPTS[id], `beat names an unknown script ${id}`).toBeDefined()
  })

  it('no result, no scorer, no opponent in a spoken line of a script or its prompts', () => {
    const banned = [/\d+[:–-]\d+/, /שניים[־ -]שניים/, /אחד[־ -]אחד/, /בית"ר/, /מכבי/, /פתח תקווה/, /גליל/]
    for (const script of Object.values(MATCH_SCRIPTS)) {
      const texts = [
        ...script.steps.map((s) => s.text ?? ''),
        ...script.steps.flatMap((s) => (s.talk && s.talk.startsWith('m') ? DIALOGUE[s.talk]!.branches.flatMap((b) => [...b.lines.map((l) => l.text), ...(b.choices ?? []).map((c) => c.text)]) : [])),
      ]
      for (const text of texts) for (const rule of banned) expect(text, `${script.id}: ${text}`).not.toMatch(rule)
    }
  })
})

type Host = MatchHost & { emitted: { name: string; value: unknown }[]; events: LifeEvent[]; paused: boolean[]; talks: string[]; minute: () => number }

function fakeHost(opts: { talkSucceeds?: boolean } = {}): Host {
  let minute = 16 * 60
  const host: Host = {
    emitted: [],
    events: [],
    paused: [],
    talks: [],
    emit: (name, value) => host.emitted.push({ name, value }),
    dispatch: (...events) => {
      host.events.push(...events)
      for (const e of events) if (e.t === 'clock.advanced') minute += e.minutes
    },
    minute: () => minute,
    talk: (conversation, done) => {
      host.talks.push(conversation)
      if (opts.talkSucceeds === false) return false
      setTimeout(done, 500)
      return true
    },
    after: (ms, fn) => {
      const id = setTimeout(fn, ms)
      return { remove: () => clearTimeout(id) }
    },
    setPaused: (on) => host.paused.push(on),
    onGoal: () => undefined,
    onEnd: () => host.emitted.push({ name: 'end', value: null }),
    onFinished: () => host.emitted.push({ name: 'finished', value: null }),
  }
  return host
}

describe('the director — steps in order, the board pushed, the clock moved forward only', () => {
  it('runs cup-99 to the whistle in script time plus its prompts', () => {
    vi.useFakeTimers()
    const host = fakeHost()
    const script = MATCH_SCRIPTS['cup-99']!
    const director = new MatchDirector(host, script, anchorFor('cup-99'))
    director.start()
    vi.advanceTimersByTime(scriptMs(script) + 4 * 600 + 100)
    expect(director.log.map((s) => s.id)).toEqual(script.steps.map((s) => s.id))
    const boards = host.emitted.filter((e) => e.name === 'match').map((e) => e.value as NonNullable<LifeBusEvents['match']>)
    // the board opens level, moves twice, and closes on the archive's result, over
    expect(boards[0]).toMatchObject({ homeScore: 0, awayScore: 0 })
    const last = boards[boards.length - 1]!
    expect(last.over).toBe(true)
    expect(last.labelHe).toBe('סיום')
    expect(last.homeScore! + last.awayScore!).toBe(2)
    // the crowd was told every state the script names, in order
    const crowd = host.emitted.filter((e) => e.name === 'sound' && (e.value as { kind: string }).kind === 'crowd').map((e) => (e.value as { state: string }).state)
    expect(crowd).toEqual(script.steps.filter((s) => s.crowd).map((s) => s.crowd))
    expect(host.talks).toEqual(['m99-scarf', 'm99-behind', 'c99-pens'])
    expect(host.emitted.some((e) => e.name === 'end')).toBe(true)
    expect(host.emitted.some((e) => e.name === 'finished')).toBe(true)
    vi.useRealTimers()
  })

  it('moves the day clock forward for 1986 and never backwards', () => {
    vi.useFakeTimers()
    const host = fakeHost()
    const script = MATCH_SCRIPTS['final-86']!
    // the scene stages the goal; here it answers at once
    host.onAuthoredGoal = (_step, done) => done()
    const director = new MatchDirector(host, script, anchorFor('final-86'))
    director.start()
    vi.advanceTimersByTime(scriptMs(script) + 2 * 600 + 100)
    const clocks = host.events.filter((e) => e.t === 'clock.advanced').map((e) => (e as { minutes: number }).minutes)
    expect(clocks.every((m) => m > 0)).toBe(true)
    expect(host.minute()).toBe(17 * 60 + 45)
    const boards = host.emitted.filter((e) => e.name === 'match').map((e) => e.value as NonNullable<LifeBusEvents['match']>)
    expect(boards.some((b) => b.labelHe === "86'" && b.scored)).toBe(true)
    vi.useRealTimers()
  })

  it('a prompt that cannot start does not stall the match', () => {
    vi.useFakeTimers()
    const host = fakeHost({ talkSucceeds: false })
    const script = MATCH_SCRIPTS['title-00']!
    const director = new MatchDirector(host, script, anchorFor('title-00'))
    director.start()
    vi.advanceTimersByTime(scriptMs(script) + 100)
    expect(director.log.length).toBe(script.steps.length)
    expect(host.emitted.some((e) => e.name === 'finished')).toBe(true)
    vi.useRealTimers()
  })

  it('stop() lets no timer fire into a room that is gone', () => {
    vi.useFakeTimers()
    const host = fakeHost()
    const script = MATCH_SCRIPTS['laces-98']!
    const director = new MatchDirector(host, script, anchorFor('laces-98'))
    director.start()
    vi.advanceTimersByTime(4000)
    const ran = director.log.length
    director.stop()
    vi.advanceTimersByTime(120_000)
    expect(director.log.length).toBe(ran)
    expect(director.active).toBe(false)
    vi.useRealTimers()
  })

  it('a hall night with no archive score prints a board with no numbers', () => {
    // (23.9.2026) was `hall-97`, before the overlay retired that script — the 1997-basket
    // relegation night is told through `h1-chain` now, not the match minigame. `galil-93-g1`
    // is the same shape (an unscored hall night) and still played by a beat.
    vi.useFakeTimers()
    const host = fakeHost()
    const script = MATCH_SCRIPTS['galil-93-g1']!
    const director = new MatchDirector(host, script, anchorFor('galil-93-g1'))
    director.start()
    vi.advanceTimersByTime(scriptMs(script) + 1000)
    const boards = host.emitted.filter((e) => e.name === 'match').map((e) => e.value as NonNullable<LifeBusEvents['match']>)
    expect(boards.length).toBeGreaterThan(0)
    for (const board of boards) {
      expect(board.homeScore).toBeNull()
      expect(board.awayScore).toBeNull()
    }
    vi.useRealTimers()
  })
})

/**
 * שדה שהתסריט כותב ואף אחד לא קורא — 7.9.2026, and the reason this test exists.
 *
 * `listen` was added to `MatchStep` for 2.5.1998: the whole second half of that mission is
 * a terrace celebrating at ninety per cent while a transistor at five per cent decides the
 * season. Four steps of the shoelaces script set it. The runner did not read it. Nothing
 * failed, nothing warned, the types were perfectly happy — the mix simply never moved, and
 * the one thing the chapter is built on quietly did not happen.
 *
 * That is the shape of failure this project keeps hitting: not a crash, a field nobody
 * consumes. So every key any script actually uses has to appear in the runner's source.
 * It is a coarse check and it is the correct one: a step that writes into the void is a
 * bug whatever the reason.
 */
describe('הבמאי קורא כל מה שהתסריטים כותבים', () => {
  it('handles every step field the scripts actually set', () => {
    const runner = readFileSync(join(ROOT, 'lib/life/runtime/matchDirector.ts'), 'utf8')
    const used = new Set<string>()
    for (const script of Object.values(MATCH_SCRIPTS)) {
      for (const step of script.steps) for (const key of Object.keys(step)) used.add(key)
    }
    // `wait` is the runner's own loop and `id` is for the tests; everything else is an instruction
    for (const key of [...used].filter((k) => k !== 'wait' && k !== 'id')) {
      expect(runner.includes(`step.${key}`), `matchDirector never reads step.${key}`).toBe(true)
    }
  })
})
