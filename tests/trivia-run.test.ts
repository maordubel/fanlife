import { describe, expect, it } from 'vitest'

import { allQuestions, questionById } from '@/lib/game/question-master'
import { Q_TOPICS } from '@/lib/game/questions/types'
import { HINT_COST, NEW_SESSION, advance, multiplierFor, outcomeOf, stageCap } from '@/lib/game/session'
import {
  MIXED,
  ROUND_LENGTH,
  TOPIC_CAP,
  dealPersonalRun,
  dealSeededRun,
  eraChips,
  gradeAnswer,
  hintFor,
  publicQuestions,
  type RunSpec,
} from '@/lib/game/trivia'
import { nextChallenges, reactionFor, reportOf, revengeSplit, tierFor, type AnswerLog } from '@/lib/game/trivia-report'

/**
 * Quick Pick's run — the shape promises of brief §13, checked across the seed space
 * rather than at an example (rule 31): twelve questions, a 4/4/4 ramp, never the same
 * interaction twice in a row, at most four from a topic in a mixed run, one founder
 * question at most, and the same address always the same run.
 */

const SEEDS = Array.from({ length: 400 }, (_, index) => index + 1)
const run = (spec: RunSpec, seed: number, cursor = 0) =>
  dealSeededRun(spec, seed, cursor).ids.map((id) => questionById(id)!)

describe('Quick Pick — הכול מהכול', () => {
  it('deals twelve, the same twelve for the same address', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      expect(dealSeededRun(MIXED, seed).ids).toHaveLength(ROUND_LENGTH)
      expect(dealSeededRun(MIXED, seed, 2).ids).toEqual(dealSeededRun(MIXED, seed, 2).ids)
    }
  })

  it('never deals the same interaction type twice in a row — 400 seeds', () => {
    const bad: string[] = []
    for (const seed of SEEDS) {
      const types = run(MIXED, seed).map((question) => question.type)
      types.forEach((type, index) => {
        if (index > 0 && types[index - 1] === type) bad.push(`${seed}@${index}:${type}`)
      })
    }
    expect(bad.slice(0, 10)).toEqual([])
  })

  it('takes at most four from one topic, and never two on one fact or one prompt', () => {
    for (const seed of SEEDS) {
      const questions = run(MIXED, seed)
      const topics = new Map<string, number>()
      for (const question of questions) topics.set(question.topic, (topics.get(question.topic) ?? 0) + 1)
      for (const [topic, count] of topics) expect(count, `${seed} ${topic}`).toBeLessThanOrEqual(TOPIC_CAP)
      const facts = questions.flatMap((question) => question.factIds)
      expect(new Set(facts).size, `seed ${seed} repeats a fact`).toBe(facts.length)
      expect(new Set(questions.map((q) => q.prompt)).size, `seed ${seed}`).toBe(ROUND_LENGTH)
      expect(questions.filter((question) => question.capped).length).toBeLessThanOrEqual(1)
    }
  })

  it('ramps 4 easy · 4 medium · 4 hard', () => {
    for (const seed of SEEDS) {
      const ladder = run(MIXED, seed).map((question) => question.difficulty)
      expect(ladder.slice(0, 4).every((d) => d <= 2), `${seed}: ${ladder}`).toBe(true)
      expect(ladder.slice(4, 8).every((d) => d === 3), `${seed}: ${ladder}`).toBe(true)
      expect(ladder.slice(8).every((d) => d >= 4), `${seed}: ${ladder}`).toBe(true)
    }
  })

  it('offers five interaction types besides a plain pick in every run', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      expect(run(MIXED, seed).filter((question) => question.type !== 'mcq').length).toBeGreaterThanOrEqual(5)
    }
  })

  it('keeps a league-round fixture out of a plain run', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      expect(run(MIXED, seed).some((question) => question.deep)).toBe(false)
    }
  })

  it('never repeats a question between one visit and the next', () => {
    for (const seed of [7, 1234, 4242, 90210]) {
      for (let cursor = 0; cursor < 4; cursor += 1) {
        const first = new Set(dealSeededRun(MIXED, seed, cursor).ids)
        const second = dealSeededRun(MIXED, seed, cursor + 1).ids
        expect(second.filter((id) => first.has(id)), `${seed}@${cursor}`).toEqual([])
      }
    }
  })
})

describe('Quick Pick — topics, eras, Hard', () => {
  it('fills every topic, football only, tagged with that topic', () => {
    for (const topic of Q_TOPICS) {
      for (const seed of SEEDS.slice(0, 30)) {
        const questions = run({ topic, decade: null, hard: false }, seed)
        expect(questions, `${topic} ${seed}`).toHaveLength(ROUND_LENGTH)
        for (const question of questions) {
          expect(question.tags, `${topic} ${question.key}`).toContain(topic)
          expect(question.sport).toBe('football')
        }
      }
    }
  })

  it('europe deals only UEFA nights — never round 15 of a league season', () => {
    for (const seed of SEEDS.slice(0, 60)) {
      for (const question of run({ topic: 'europe', decade: null, hard: false }, seed)) {
        if (['score', 'opponent', 'venue', 'attendance'].includes(question.template)) {
          expect(question.key, question.prompt).toMatch(/\|(גביע-אופא|הליגה-האירופית|גביע-האינטרטוטו|ליגת-האלופות|קונפרנס-ליג)\|/)
        }
      }
    }
  })

  it('gives era chips from the data, and an era run stays in its decade', () => {
    const chips = eraChips(null)
    expect(chips.length).toBeGreaterThan(6)
    for (const chip of chips.filter((c) => c.count >= ROUND_LENGTH)) {
      const questions = run({ topic: null, decade: chip.decade, hard: false }, 11)
      expect(questions, `${chip.decade}`).toHaveLength(ROUND_LENGTH)
      for (const question of questions) expect(question.decades).toContain(chip.decade)
    }
  })

  it('Hard deals difficulty 3 and up, with at most four deep fixtures', () => {
    for (const seed of SEEDS.slice(0, 60)) {
      const questions = run({ topic: null, decade: null, hard: true }, seed)
      expect(questions).toHaveLength(ROUND_LENGTH)
      for (const question of questions) expect(question.difficulty).toBeGreaterThanOrEqual(3)
      expect(questions.filter((question) => question.deep).length).toBeLessThanOrEqual(4)
    }
  })
})

describe('Revenge and Surprise', () => {
  const pool = allQuestions().filter((question) => !question.deep && question.sport === 'football')

  it('deals the questions that beat you, newest first, and SAYS how many were filled in', () => {
    const wrong = pool.slice(0, 5).map((question) => question.id)
    const plan = dealPersonalRun('revenge', { wrong, seen: wrong }, 3)
    expect(plan.ids).toHaveLength(ROUND_LENGTH)
    expect(plan.revenge).toBe(5)
    expect(plan.filler).toBe(7)
    for (const id of wrong) expect(plan.ids).toContain(id)
    // the filler is hard, and it is not one of the five
    const filler = plan.ids.filter((id) => !wrong.includes(id))
    for (const id of filler) expect(questionById(id)!.difficulty).toBeGreaterThanOrEqual(4)
    expect(revengeSplit(5)).toEqual({ revenge: 5, filler: 7 })
  })

  it('takes twelve revenge questions when twelve are waiting — no filler', () => {
    const wrong = pool.slice(100, 140).map((question) => question.id)
    const plan = dealPersonalRun('revenge', { wrong, seen: [] }, 3)
    expect(plan.revenge).toBe(ROUND_LENGTH)
    expect(plan.filler).toBe(0)
  })

  it('follows a retired id through the alias map', () => {
    const plan = dealPersonalRun('revenge', { wrong: ['crest:2023'], seen: [] }, 1)
    // a legacy key is not a q_ id the lobby would send, but the resolver must not throw
    expect(plan.ids.length).toBeGreaterThan(0)
  })

  it('Surprise deals nothing this device has seen while unseen questions remain', () => {
    const seen = pool.slice(0, 1500).map((question) => question.id)
    const plan = dealPersonalRun('surprise', { wrong: [], seen }, 9)
    expect(plan.ids).toHaveLength(ROUND_LENGTH)
    for (const id of plan.ids) expect(seen).not.toContain(id)
    expect(plan.unseen).toBe(ROUND_LENGTH)
  })
})

describe('the dealt shape and the grader', () => {
  const ids = dealSeededRun(MIXED, 77).ids
  const dealt = publicQuestions(ids, 77)

  it('carries no answer, no key and no source', () => {
    for (const question of dealt) {
      const text = JSON.stringify(question)
      expect(Object.keys(question).sort()).toEqual(
        expect.arrayContaining(['id', 'options', 'prompt', 'type', 'difficulty', 'topic', 'pickCount', 'hintKind']),
      )
      for (const forbidden of ['answer', 'key', 'source', 'explanation', 'legacy', 'factIds', 'pool']) {
        expect(Object.keys(question)).not.toContain(forbidden)
      }
      expect(text).not.toContain('"correct"')
    }
  })

  it('grades every type right and wrong, by id', () => {
    const byType = new Map<string, string>()
    for (const question of allQuestions()) if (!byType.has(question.type)) byType.set(question.type, question.id)
    for (const [type, id] of byType) {
      const truth = questionById(id)!.answer
      expect(gradeAnswer(id, truth)?.correct, type).toBe(true)
      // a multi is a SET (any order is right); order and match are sequences
      const wrong = Array.isArray(truth)
        ? type === 'multi'
          ? [...truth.slice(0, 2), '__nope__']
          : [...truth].reverse()
        : truth === 'true'
          ? 'false'
          : '__nope__'
      expect(gradeAnswer(id, wrong)?.correct, type).toBe(false)
    }
    expect(gradeAnswer('q_000000000000', 'x')).toBeNull()
  })

  it('reports how many places an order or a match got right', () => {
    const order = allQuestions().find((question) => question.type === 'order')!
    const truth = order.answer as string[]
    const swapped = [truth[1] as string, truth[0] as string, ...truth.slice(2)]
    expect(gradeAnswer(order.id, swapped)?.hits).toBe(truth.length - 2)
  })

  it('deals the year scale in order and never deals an order or a match already solved', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      for (const question of publicQuestions(dealSeededRun(MIXED, seed).ids, seed)) {
        const truth = questionById(question.id)!.answer
        if (question.type === 'year') {
          expect([...question.options].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))).toEqual(question.options)
          expect(question.options).toContain(truth)
        }
        if (question.type === 'order' || question.type === 'match') {
          expect(question.options).not.toEqual(truth)
          expect([...question.options].sort()).toEqual([...(truth as string[])].sort())
        }
      }
    }
  })

  it('never strikes a right option with a hint, and a decade hint names the fact’s decade', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      for (const id of dealSeededRun(MIXED, seed).ids) {
        const hint = hintFor(id, seed)
        const question = questionById(id)!
        const truth = Array.isArray(question.answer) ? question.answer : [question.answer]
        for (const struck of hint?.strike ?? []) expect(truth).not.toContain(struck)
        if (hint?.kind === 'decade') expect(hint.text).toMatch(/^שנות ה־/)
      }
    }
  })
})

describe('the score — hints and the stage caps', () => {
  it('caps the combo at ×2, ×3, ×4 by stage', () => {
    expect(stageCap(0)).toBe(2)
    expect(stageCap(5)).toBe(3)
    expect(stageCap(11)).toBe(4)
    expect(multiplierFor(4, 2)).toBe(2)
    expect(multiplierFor(4)).toBe(4)
  })

  it('charges a hint 40 and gives it no combo gain', () => {
    const hot = { ...NEW_SESSION, combo: 2 }
    const plain = outcomeOf(hot, { correct: true, difficulty: 3, secondsLeft: 10, total: 20, cap: 4 })
    const hinted = outcomeOf(hot, { correct: true, difficulty: 3, secondsLeft: 10, total: 20, cap: 4, hinted: true })
    expect(hinted.combo).toBe(2)
    expect(plain.combo).toBe(3)
    expect(hinted.gained).toBeLessThan(plain.gained)
    expect(hinted.gained).toBe(Math.max(0, Math.round((300 + 50) * 2) - HINT_COST))
    const after = advance(hot, { correct: true, difficulty: 3, secondsLeft: 10, total: 20, cap: 4, hinted: true })
    expect(after.combo).toBe(2)
  })
})

describe('the Match Report', () => {
  const entry = (patch: Partial<AnswerLog>): AnswerLog => ({
    id: 'q', type: 'mcq', topic: 'europe', difficulty: 3, correct: true, hinted: false, elapsed: 5, timeout: false, ...patch,
  })

  it('chooses a reaction from difficulty, speed and streak — deterministically', () => {
    expect(reactionFor(entry({ difficulty: 5 }), 1, 0).key).toBe('trivia.react.deep')
    expect(reactionFor(entry({ elapsed: 2 }), 1, 0).key).toBe('trivia.react.fast')
    expect(reactionFor(entry({}), 5, 0).key).toBe('trivia.react.fire')
    expect(reactionFor(entry({ correct: false, timeout: true }), 0, 0).key).toBe('trivia.react.timeout')
    expect(reactionFor(entry({}), 1, 6)).toEqual(reactionFor(entry({}), 1, 6))
  })

  it('names the tier, the hardest cracked, the strongest topic and the next two challenges', () => {
    expect(tierFor(12, 12, 3)).toBe('perfect')
    expect(tierFor(5, 12, 0)).toBe('out')
    const report = reportOf([
      entry({ topic: 'kits', difficulty: 4 }),
      entry({ topic: 'kits', difficulty: 2, type: 'tf' }),
      entry({ topic: 'europe', correct: false }),
    ])
    expect(report.hardest).toBe(4)
    expect(report.strongest).toBe('kits')
    expect(report.bestStreak).toBe(2)
    expect(nextChallenges({ pending: 3, share: 0.9, mode: 'mix', hard: false })).toEqual(['revenge', 'hard'])
    expect(nextChallenges({ pending: 0, share: 0.2, mode: 'surprise', hard: false })).toEqual(['mix'])
  })
})
