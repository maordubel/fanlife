import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { BANK, dailyQuestion } from '@/lib/game/blind-cow/bank'
import { dealRun, goalYears } from '@/lib/game/goal'
import { compareResults } from '@/lib/challenges/compare'
import { CHALLENGE_GATES, type ChallengeDraft, type ChallengeGate, type ChallengeResult } from '@/lib/challenges/contract'
import { challengePath, createChallenge, encodeChallenge, gateHref, hashResult } from '@/lib/challenges/create'
import { challengeState, expiresAt } from '@/lib/challenges/expiry'
import { inviteLine, inviteText } from '@/lib/challenges/invite'
import { decodeChallenge, resolveChallenge } from '@/lib/challenges/resolve'
import { dealtIds, goalFromHash, goalHashOf, land, mintCode } from '@/lib/challenges/runs'
import { openQuestion, sealQuestion } from '@/lib/challenges/seal'
import { figureOf } from '@/lib/challenges/score'
import { entityHash, packJson } from '@/lib/challenges/wire'
import { MESSAGES } from '@/lib/i18n'

/**
 * THE CHALLENGE LAYER (ONE RED WORLD §9, §44, §49, §50).
 *
 *   · a challenge reproduces the run — every scoped gate, 500 seeds each (§49), through
 *     the gate's OWN deal function;
 *   · no spoiler in a URL — not gate 10's man, not a pinned goal's scorer, not a lineup's
 *     names — in the share link or in the gate URL the landing forwards to;
 *   · a link cannot make a card print text of its own choosing (the whitelist);
 *   · the comparison compares only what both did, and never crowns a winner (§1.2, §33).
 */

const ROOT = join(__dirname, '..')
const NOW = Date.UTC(2026, 8, 28, 12)
const SEEDS = Array.from({ length: 500 }, (_, i) => 1 + ((i * 104_729 + 17) % 9_999_000))

/** a plausible result per gate — the run check needs a comparison to protect */
function resultFor(draft: ChallengeDraft): ChallengeResult {
  switch (draft.gate) {
    case 2:
      return { gate: 2, marks: Array.from({ length: 12 }, (_, i) => i % 3 !== 0) }
    case 3:
      return { gate: 3, found: Array.from({ length: 11 }, (_, i) => i % 2 === 0) }
    case 6:
      return { gate: 6, moves: 9, misses: 3, order: ['a', 'b'], perfect: ['a'] }
    case 8:
      return { gate: 8, accuracy: [40, 70, 90], routes: [[1, 2, 3], [4], [5, 6]] }
    case 9:
      return { gate: 9, picks: ['a', 'b', 'c', 'd', 'e'] }
    default:
      return draft.params?.variant === 'thread'
        ? { gate: 13, variant: 'thread', steps: [3, 4, 5], solved: [true, true, false] }
        : { gate: 13, variant: 'order', marks: Array.from({ length: 10 }, (_, i) => i !== 4) }
  }
}

function sameRun(bare: ChallengeDraft) {
  const draft = { ...bare, result: bare.result ?? resultFor(bare) }
  const code = mintCode(draft, NOW)
  expect(code, `gate ${draft.gate} seed ${draft.seed} mints`).not.toBeNull()
  const landing = land(code as string, NOW)
  expect(landing?.comparable, `gate ${draft.gate} seed ${draft.seed}: ${landing?.reason}`).toBe(true)
  const back = landing!.challenge
  expect(back.seed).toBe(draft.seed)
  expect(back.cursor ?? 0).toBe(draft.cursor ?? 0)
  // the gate's own deal, called on what came back, deals what it dealt for the sender
  expect(dealtIds(back)).toEqual(dealtIds({ gate: draft.gate, seed: draft.seed, cursor: draft.cursor, params: draft.params ?? {} }))
  // and the forwarded URL carries exactly the round the gate's route reads
  const target = new URL(landing!.target, 'https://x.test')
  expect(target.searchParams.get('seed')).toBe(String(draft.seed))
  expect(target.searchParams.get('r') ?? '0').toBe(String(draft.cursor ?? 0))
  return { code: code as string, target: landing!.target }
}

describe('a challenge reproduces the run — 500 seeds per scoped gate (§49)', () => {
  const cases: Array<{ gate: ChallengeGate; params?: ChallengeDraft['params']; label: string }> = [
    { gate: 2, params: { topic: 'general' }, label: 'trivia · general' },
    { gate: 3, label: 'lineup' },
    { gate: 6, label: 'memory' },
    { gate: 8, label: 'goal' },
    { gate: 9, label: 'royal rumble' },
    { gate: 13, params: { variant: 'order' }, label: 'timeline · order' },
  ]
  for (const item of cases) {
    it(`${item.label}: same seed + cursor → same deal, and the landing agrees`, () => {
      for (const [i, seed] of SEEDS.entries()) {
        sameRun({ gate: item.gate, seed, cursor: i % 4, params: item.params ?? {} })
      }
    })
  }

  it('trivia: the topic, the decade and Hard travel with the round', () => {
    for (const [i, seed] of SEEDS.slice(0, 60).entries()) {
      const { target } = sameRun({ gate: 2, seed, cursor: i % 3, params: { topic: 'history', era: 1990, hard: i % 2 === 0 } })
      expect(target.startsWith('/trivia/history?')).toBe(true)
      expect(target).toContain('era=1990')
    }
  })

  it('red thread: the same levels for the same round', () => {
    for (const [i, seed] of SEEDS.slice(0, 120).entries()) {
      const { target } = sameRun({ gate: 13, seed, cursor: i % 3, params: { variant: 'thread' } })
      expect(target.startsWith('/timeline?')).toBe(true)
    }
  })

  it('blind cow: the same man, sealed — 500 questions round-trip without naming one', () => {
    const solo = BANK.questions.filter((q) => q.eligibleModes.includes('solo'))
    for (const seed of SEEDS) {
      const q = solo[seed % solo.length]!
      const sealed = sealQuestion({ q: q.id, qv: q.version })
      const { code } = { code: mintCode({ gate: 10, params: { sealed }, result: { gate: 10, hints: 3, wrong: 1, status: 'solved' } }, NOW)! }
      const landing = land(code, NOW)!
      expect(landing.comparable).toBe(true)
      expect(dealtIds(landing.challenge)?.[0]).toBe(q.id)
      expect(openQuestion(landing.challenge.params.sealed)?.q).toBe(q.id)
      // not in the link, not in the gate URL, not in the decoded JSON
      const decoded = Buffer.from(code, 'base64url').toString('binary')
      for (const text of [code, decoded, landing.target, challengePath(code)]) {
        expect(text).not.toContain(q.id)
        expect(text).not.toContain(q.targetPlayerId)
      }
    }
  })

  it('blind cow daily: the day travels, the man does not', () => {
    const code = mintCode({ gate: 10, params: { day: '2026-09-27' }, result: { gate: 10, hints: 2, wrong: 0, status: 'solved' } }, NOW)!
    const landing = land(code, NOW)!
    expect(landing.challenge.mode).toBe('daily')
    expect(dealtIds(landing.challenge)?.[0]).toBe(dailyQuestion('2026-09-27')!.id)
  })
})

describe('no spoiler travels (§27, §44)', () => {
  it('a pinned goal travels as a hash, never as the id that names the scorer', () => {
    const goals = goalYears().slice(0, 30)
    expect(goals.length).toBeGreaterThan(0)
    for (const [i, goal] of goals.entries()) {
      const seed = SEEDS[i]!
      const draft: ChallengeDraft = { gate: 8, seed, params: { goalHash: goalHashOf(goal.id) }, result: { gate: 8, accuracy: [50, 60, 70], routes: [[1, 2], [3], [4, 5, 6]] } }
      const code = mintCode(draft, NOW)!
      const landing = land(code, NOW)!
      expect(goalFromHash(landing.challenge.params.goalHash)).toBe(goal.id)
      expect(dealRun(seed, 0, goal.id)[0]?.goalId).toBe(goal.id)
      const decoded = Buffer.from(code, 'base64url').toString('binary')
      for (const text of [code, decoded, landing.target]) {
        expect(text).not.toContain(goal.id)
        for (const word of goal.id.split('-').filter((w) => /^[a-z]{4,}$/.test(w))) expect(text).not.toContain(word)
      }
    }
  })

  it('a lineup travels as ticks per slot; an XI and a five as hashes', () => {
    const lineup = createChallenge({ gate: 3, seed: 5, result: { gate: 3, found: [true, false, true, true, true, true, true, true, true, false, true] } }, { now: NOW })
    expect(JSON.stringify(lineup)).not.toMatch(/[֐-׿]/)
    const xi = createChallenge({ gate: 1, params: { prompt: 'decades' }, result: { gate: 1, picks: ['p_0123456789', 'shaya-feigenbaum'], captain: 'p_0123456789', twelfth: null } }, { now: NOW })
    const text = encodeChallenge(xi)
    expect(Buffer.from(text, 'base64url').toString('binary')).not.toContain('p_0123456789')
    expect(Buffer.from(text, 'base64url').toString('binary')).not.toContain('feigenbaum')
  })

  it('gate 1 hands over the prompt, not the picks (§10)', () => {
    const code = mintCode({ gate: 1, params: { prompt: 'decades' }, result: { gate: 1, picks: ['a', 'b', 'c'], captain: 'a', twelfth: 'c' } }, NOW)!
    const target = new URL(land(code, NOW)!.target, 'https://x.test')
    expect(target.pathname).toBe('/xi')
    expect(target.searchParams.get('prompt')).toBe('decades')
    expect(target.searchParams.get('seed')).toBeNull()
    expect([...target.searchParams.keys()].sort()).toEqual(['ch', 'from', 'prompt'])
  })
})

describe('the whitelist — a link cannot say anything of its own', () => {
  const good = encodeChallenge(createChallenge({ gate: 2, seed: 77, params: { topic: 'general' }, result: { gate: 2, marks: Array(12).fill(true) } }, { now: NOW }))

  it('round-trips a real link', () => {
    expect(decodeChallenge(good)?.seed).toBe(77)
  })

  it('refuses text, out-of-range numbers, unknown keys and re-encodings', () => {
    const bad = [
      Buffer.from(JSON.stringify({ v: 1, g: 2, m: 'r', s: 77, p: { t: 'general' }, i: 20_000, sv: 1, x: { k: 'zz', n: 12 }, name: 'מאור' }), 'utf8').toString('base64url'),
      packJson({ v: 1, g: 2, m: 'r', s: 77, p: { t: '<script>' }, i: 20_000, sv: 1 }),
      packJson({ v: 1, g: 2, m: 'r', s: -4, i: 20_000, sv: 1 }),
      packJson({ v: 1, g: 4, m: 'r', s: 4, i: 20_000, sv: 1 }),
      packJson({ v: 1, g: 10, m: 'r', i: 20_000, sv: 1 }),
      Buffer.from(JSON.stringify({ v: 1, g: 1, m: 'c', i: 20_000, sv: 1, x: { p: ['שייע'] } }), 'utf8').toString('base64url'),
      packJson({ v: 1, g: 8, m: 'r', s: 3, i: 20_000, sv: 1, p: { gh: 'benfica-2010-zahavi' } }),
      packJson({ v: 1, g: 2, m: 'r', s: 77, i: 20_000, sv: 1, x: { k: 'zzzzzzzz', n: 12 } }),
      packJson({ sv: 1, v: 1, g: 2, m: 'r', s: 77, i: 20_000 }),
      'not-a-code',
      '',
    ]
    for (const code of bad) expect(decodeChallenge(code), code).toBeNull()
  })
})

describe('expiry and drift — the comparison stays honest (§33)', () => {
  it('a same-run link compares for 45 days, a daily for 7, a prompt forever', () => {
    const run = createChallenge({ gate: 6, seed: 9, result: { gate: 6, moves: 9, misses: 3, order: [], perfect: [] } }, { now: NOW })
    expect(challengeState(run, NOW + 44 * 86_400_000)).toBe('live')
    expect(challengeState(run, NOW + 47 * 86_400_000)).toBe('expired')
    expect(expiresAt(run)).toMatch(/^2026-11-/)
    const prompt = createChallenge({ gate: 1, params: { prompt: 'free' }, result: { gate: 1, picks: ['a'], captain: null, twelfth: null } }, { now: NOW })
    expect(challengeState(prompt, NOW + 900 * 86_400_000)).toBe('live')
  })

  it('an expired link still opens the gate, and draws no comparison', () => {
    const code = mintCode({ gate: 6, seed: 9, result: { gate: 6, moves: 9, misses: 3, order: [], perfect: [] } }, NOW)!
    const late = land(code, NOW + 60 * 86_400_000)!
    expect(late.comparable).toBe(false)
    expect(late.reason).toBe('expired')
    expect(new URL(late.target, 'https://x.test').searchParams.get('ch')).toBeNull()
    expect(new URL(late.target, 'https://x.test').searchParams.get('seed')).toBe('9')
  })

  it('a run that no longer deals the same ids is drift, not a comparison', () => {
    const challenge = createChallenge({ gate: 6, seed: 9, result: { gate: 6, moves: 9, misses: 3, order: [], perfect: [] } }, { now: NOW, fingerprint: 'zzzzzz' })
    const landing = land(encodeChallenge(challenge), NOW)!
    expect(landing.reason).toBe('drift')
    expect(landing.comparable).toBe(false)
  })

  it('a result counted under another scoring version compares nothing', () => {
    const code = packJson({ v: 1, g: 2, m: 'r', s: 77, p: { t: 'general' }, i: 20_000, sv: 2, x: { k: 'zz', n: 12 } })
    expect(resolveChallenge(code, NOW)?.reason).toBe('scoring')
  })
})

describe('compare — patterns, not a winner (§1.2, §33)', () => {
  const h = (ids: string[]) => ids.map(entityHash)

  it('trivia: "שניכם נפלתם על אותה שאלה"', () => {
    const mine: ChallengeResult = { gate: 2, marks: [true, true, false, true, true, true, true, true, true, true, true, true] }
    const theirs: ChallengeResult = { gate: 2, marks: [true, false, false, true, true, true, true, true, true, true, true, false] }
    const out = compareResults(mine, theirs)!
    expect(out.lines[0]).toEqual({ key: 'compare.trivia.sameMiss.one', vars: { n: '3' } })
    expect(out.rows[0]).toMatchObject({ mine: '11/12', theirs: '9/12' })
  })

  it('XI: shared and disputed, the captain, the one name both kept', () => {
    const mine = hashResult({ gate: 1, picks: ['a', 'b', 'c'], captain: 'a', twelfth: null })
    const theirs = hashResult({ gate: 1, picks: ['a', 'x', 'y'], captain: 'x', twelfth: null })
    const out = compareResults(mine, theirs, { [entityHash('a')]: 'שייע פייגנבוים' })!
    const keys = out.lines.map((l) => l.key)
    expect(keys).toEqual(['compare.xi.shared', 'compare.xi.disputed', 'compare.xi.onlyOne', 'compare.xi.otherCaptain'])
    expect(out.lines[2]?.vars?.name).toBe('שייע פייגנבוים')
    expect(out.ids?.shared).toEqual(h(['a']))
  })

  it('blind cow: the two counts and no headline (§19)', () => {
    const out = compareResults({ gate: 10, hints: 3, wrong: 1, status: 'solved' }, { gate: 10, hints: 2, wrong: 0, status: 'solved' })!
    expect(out.lines[0]).toEqual({ key: 'compare.bc.hints', vars: { mine: '3', theirs: '2' } })
    expect(MESSAGES['compare.bc.hints']?.replace('{mine}', '3').replace('{theirs}', '2')).toBe('אתה: 3 רמזים · הוא: 2 רמזים')
  })

  it('lineup overlap, goal overlay, memory and rumble patterns', () => {
    expect(compareResults({ gate: 3, found: [true, true, false] }, { gate: 3, found: [true, false, false] })!.lines[0]).toEqual({ key: 'compare.lineup.together', vars: { n: '1', total: '3' } })
    const goal = compareResults({ gate: 8, accuracy: [80, 40], routes: [[1, 2], [3]] }, { gate: 8, accuracy: [60, 50], routes: [[1, 4], [5]] })!
    expect(goal.overlay).toEqual({ mine: [[1, 2], [3]], theirs: [[1, 4], [5]] })
    expect(goal.lines.map((l) => l.key)).toContain('compare.goal.someStart')
    const mem = compareResults(hashResult({ gate: 6, moves: 8, misses: 2, order: ['a', 'b'], perfect: ['a'] }), hashResult({ gate: 6, moves: 10, misses: 4, order: ['a', 'b'], perfect: ['a', 'b'] }))!
    expect(mem.lines.map((l) => l.key)).toEqual(['compare.memory.sameFirst', 'compare.memory.sameLast', 'compare.memory.bothPerfect'])
    expect(compareResults(hashResult({ gate: 9, picks: ['a', 'b', 'c', 'd', 'e'] }), hashResult({ gate: 9, picks: ['a', 'b', 'x', 'y', 'z'] }))!.lines[0]).toEqual({ key: 'compare.rumble.shared', vars: { n: '2', total: '5' } })
  })

  it('compares nothing across different runs', () => {
    expect(compareResults({ gate: 2, marks: [true] }, { gate: 2, marks: [true, false] })).toBeNull()
    expect(compareResults({ gate: 13, variant: 'order', marks: [true] }, { gate: 13, variant: 'thread', steps: [3], solved: [true] })).toBeNull()
    expect(compareResults(hashResult({ gate: 6, moves: 1, misses: 0, order: ['a'], perfect: [] }), hashResult({ gate: 6, moves: 1, misses: 0, order: ['b'], perfect: [] }))).toBeNull()
  })

  it('every compare key the layer can produce exists, and none of them crowns anybody', () => {
    const source = readFileSync(join(ROOT, 'lib/challenges/compare.ts'), 'utf8')
    const keys = [...source.matchAll(/'(compare\.[a-zA-Z.]+)'/g)].map((m) => m[1] as string)
    expect(keys.length).toBeGreaterThan(30)
    for (const key of keys) {
      expect(MESSAGES[key], key).toBeTruthy()
      expect(MESSAGES[key]).not.toMatch(/ניצח|הפסד|מנצח|winner|wins/i)
    }
  })

  it('figures follow the gate’s own direction — fewer hints is the earlier catch', () => {
    expect(figureOf({ gate: 10, hints: 2, wrong: 0, status: 'solved' })?.fewerIsBetter).toBe(true)
    expect(figureOf({ gate: 1, picks: ['a'], captain: null, twelfth: null })).toBeNull()
  })
})

describe('the invite (§29)', () => {
  it('speaks the gate’s own line, filled only with what the result counts', () => {
    const trivia = createChallenge({ gate: 2, seed: 4, params: { topic: 'general' }, result: { gate: 2, marks: [...Array(9).fill(true), ...Array(3).fill(false)] } }, { now: NOW })
    expect(inviteLine(trivia)).toBe('זכרתי 9/12. קח את אותם 12.')
    const bc = createChallenge({ gate: 10, params: { day: '2026-09-28' }, result: { gate: 10, hints: 3, wrong: 0, status: 'solved' } }, { now: NOW })
    expect(inviteLine(bc)).toBe('אני תפסתי ברמז 3. אל תגלו.')
    const away = createChallenge({ gate: 10, params: { day: '2026-09-28' }, result: { gate: 10, hints: 10, wrong: 4, status: 'gave_up' } }, { now: NOW })
    expect(inviteLine(away)).not.toContain('תפסתי')
    expect(inviteText(trivia, 'abcd')).toMatch(/\n\nhttps?:\/\/[^\n]+\/c\/abcd$/)
  })

  it('covers every challenge gate', () => {
    for (const gate of CHALLENGE_GATES) {
      const draft: ChallengeDraft = gate === 10 ? { gate, params: { day: '2026-09-28' } } : gate === 1 ? { gate, params: { prompt: 'free' } } : { gate, seed: 3, params: gate === 13 ? { variant: 'thread' } : {} }
      expect(inviteLine(createChallenge(draft, { now: NOW })).length).toBeGreaterThan(4)
      expect(gateHref(createChallenge(draft, { now: NOW }), null)).toMatch(/^\/[a-z-/]+\?/)
    }
  })
})
