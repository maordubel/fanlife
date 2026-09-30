import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import master from '@/content/generated/question-master.json'
import legacy from './fixtures/trivia-legacy-answers-2026-09-21.json'
import { archive } from '@/lib/game/archive'
import { allQuestions, questionById } from '@/lib/game/question-master'
import { buildQuestionMaster, serialiseMaster, type QuestionMasterFile } from '@/lib/game/questions/build'
import { EURO_COMPETITIONS } from '@/lib/game/questions/templates/matches'
import { Q_TOPICS, Q_TYPES } from '@/lib/game/questions/types'

/**
 * מאסטר השאלות — the bank as a file, and the promises it makes.
 *
 * `content/generated/question-master.json` is generated (`npm run trivia:master`). These
 * tests hold it to three kinds of promise: it is CURRENT (a rebuild from `content/manual`
 * gives the same bytes — so a data change that nobody rebuilt fails here, not in front of
 * a player); it is HONEST (every question has one answer, real options, a source, a sport,
 * no conflict behind it); and it is COMPLETE (every question the old bank could ask on
 * 21.9.2026 is still asked with the same answer, unless an unresolved conflict stands
 * behind it — `tests/fixtures/trivia-legacy-answers-2026-09-21.json` is that bank, frozen
 * the day the templates moved).
 */

const file = master as unknown as QuestionMasterFile
const questions = allQuestions()

describe('מאסטר השאלות — the file is current', () => {
  it('rebuilds to the same bytes from content/manual (run `npm run trivia:master` if not)', () => {
    const rebuilt = buildQuestionMaster({ openThrough: file.openThrough, previous: file })
    const onDisk = readFileSync(join(process.cwd(), 'content/generated/question-master.json'), 'utf8')
    expect(rebuilt.counts).toEqual(file.counts)
    expect(serialiseMaster(rebuilt) === onDisk, 'the master is stale — npm run trivia:master').toBe(true)
  })
})

describe('מאסטר השאלות — every old question survives', () => {
  it('asks every question the old bank asked, with the same answer — or says which conflict stopped it', () => {
    const byLegacy = new Map<string, string[]>()
    for (const question of questions) {
      if (!question.legacy) continue
      const answer = Array.isArray(question.answer) ? question.answer.join('|') : question.answer
      byLegacy.set(question.legacy, [...(byLegacy.get(question.legacy) ?? []), answer])
    }
    const lost: string[] = []
    let conflicted = 0
    for (const [key, answer] of Object.entries(legacy as Record<string, string>)) {
      if (byLegacy.get(key)?.includes(answer)) continue
      if (file.excluded[key]?.startsWith('conflict:')) {
        conflicted += 1
        continue
      }
      lost.push(`${key} → ${answer}`)
    }
    expect(lost, lost.slice(0, 10).join('\n')).toEqual([])
    expect(Object.keys(legacy).length).toBeGreaterThan(5000)
    // the exclusions are few and every one of them names its conflict
    expect(conflicted).toBeLessThan(100)
  })

  it('never asks the contested 2010 and 2012 cup-final opponents', () => {
    for (const goal of ['cupfinal-2010-vermouth-25', 'cupfinal-2010-vermouth-73', 'cupfinal-2012-igiebor-90-2']) {
      expect(questions.some((question) => question.key === `goal-opponent:${goal}`), goal).toBe(false)
      expect(file.excluded[`goal-opponent:${goal}`], goal).toMatch(/^conflict:goal:/)
    }
    // …and no true/false or match question asks it by the back door
    for (const question of questions.filter((q) => q.template === 'tf-goal' || q.template === 'match-goal')) {
      expect(question.key).not.toMatch(/cupfinal-201[02]/)
    }
  })

  it('stops asking the championship count, which the sources give as 13, 12 and 14', () => {
    expect(questions.some((question) => question.key === 'trophy-count:ליגת-העל')).toBe(false)
    expect(file.excluded['trophy-count:ליגת-העל']).toMatch(/^conflict:trophy:/)
  })
})

describe('מאסטר השאלות — ids', () => {
  it('gives every question an opaque q_ id, unique, from a unique key', () => {
    const ids = new Set<string>()
    const keys = new Set<string>()
    for (const question of questions) {
      expect(question.id).toMatch(/^q_[0-9a-f]{12}$/)
      expect(ids.has(question.id), question.key).toBe(false)
      expect(keys.has(question.key), question.key).toBe(false)
      ids.add(question.id)
      keys.add(question.key)
    }
  })

  it('fixes the collisions — a league game and a cup tie between the same clubs are two questions', () => {
    const score = questions.filter((question) => question.template === 'score')
    // 3,063 matches with a score; the old key held 2,374 of them
    expect(score.length).toBeGreaterThan(2900)
    expect(new Set(score.map((question) => question.prompt)).size).toBe(score.length)
  })

  it('resolves an old key and a retired id through the alias map', () => {
    for (const [from, to] of Object.entries(file.aliases).slice(0, 200)) {
      expect(questionById(from)?.id, from).toBe(to)
    }
    expect(questionById('crest:2023')?.template).toBe('crest')
  })
})

describe('מאסטר השאלות — rule 15 and rule 14 on every question', () => {
  it('has one answer, real options, an explanation and a source', () => {
    for (const question of questions) {
      expect(question.explanation.length, question.key).toBeGreaterThan(0)
      expect(question.source.title.length, question.key).toBeGreaterThan(0)
      expect(question.source.confidence, question.key).toBeGreaterThanOrEqual(2)
      if (question.type === 'mcq' || question.type === 'year') {
        const pool = new Set([...(question.distractors ?? []), ...(file.pools[question.pool ?? ''] ?? [])])
        pool.delete(question.answer as string)
        expect(pool.size, question.key).toBeGreaterThanOrEqual(3)
      }
      if (question.type === 'multi') expect(new Set(question.answer as string[]).size, question.key).toBe(3)
      if (question.type === 'tf') expect(['true', 'false']).toContain(question.answer)
    }
  })

  it('never has one prompt with two answers', () => {
    const seen = new Map<string, string>()
    for (const question of questions) {
      if (question.type === 'order' || question.type === 'match') continue
      const ask = `${question.prompt}\u0000${question.quoteHe ?? ''}`
      const answer = JSON.stringify(question.answer)
      if (seen.has(ask)) expect(seen.get(ask), question.prompt).toBe(answer)
      seen.set(ask, answer)
    }
  })

  it('carries a sport on every question, and keeps basketball to the Ussishkin family', () => {
    for (const question of questions) {
      expect(['football', 'basketball']).toContain(question.sport)
      if (question.sport === 'basketball') {
        expect(question.template, question.key).toMatch(/^(election|ussishkin|founder|moment-year)/)
      }
    }
  })

  it('tags a match `europe` only when it was played in a UEFA competition (the old europe topic read every match)', () => {
    const matchTemplates = new Set(['score', 'opponent', 'venue', 'attendance', 'travelling'])
    const european = questions.filter((question) => matchTemplates.has(question.template) && question.tags.includes('europe'))
    expect(european.length).toBeGreaterThan(50)
    for (const question of european) {
      const competition = question.key.split(':')[1]?.split('|')[1] ?? ''
      expect(EURO_COMPETITIONS.has(competition), question.key).toBe(true)
    }
  })

  it('tags `derby` only for Maccabi Tel Aviv (rule 13)', () => {
    const derbyGoals = new Set(archive.goals.filter((goal) => goal.opponentHe === 'מכבי תל אביב').map((goal) => goal.goalId))
    for (const question of questions.filter((q) => q.tags.includes('derby'))) {
      const goal = question.key.split(':')[1] ?? ''
      if (question.template.startsWith('goal-') || question.template === 'tf-goal') {
        expect(derbyGoals.has(goal), question.key).toBe(true)
        continue
      }
      expect(`${question.key} ${question.prompt}`, question.key).toMatch(/מכבי[- ]תל[- ]אביב/)
    }
    // and a question whose ANSWER would be Maccabi is never in the derby topic
    for (const question of questions.filter((q) => q.template === 'opponent' || q.template === 'goal-opponent')) {
      expect(question.tags.includes('derby'), question.key).toBe(false)
    }
  })

  it('rates a league-round fixture 5 and keeps it out of plain runs (deep), a European night keeps its rating', () => {
    const deep = questions.filter((question) => question.deep)
    expect(deep.length).toBeGreaterThan(3000)
    for (const question of deep) expect(question.difficulty).toBe(5)
    const milan = questions.find((question) => question.key.startsWith('opponent:2001/02|גביע-אופא|רבע גמר'))
    expect(milan?.deep).toBeUndefined()
    expect(milan?.difficulty).toBeLessThan(5)
  })

  it('never asks a question about a match or a shirt the conflicts file leaves open', () => {
    for (const [key, reason] of Object.entries(file.excluded)) {
      expect(reason, key).toMatch(/^(conflict|options|ambiguous|duplicate):/)
    }
    // the Zimbru tie: RSSSF and ויקיפועל disagree on the score and on who hosted
    expect(questions.some((question) => question.key.includes('זימברו') && question.template === 'score')).toBe(false)
  })
})

describe('מאסטר השאלות — the six types, built from facts', () => {
  it('holds all six types and all seven topics', () => {
    for (const type of Q_TYPES) expect(file.counts.byType[type], type).toBeGreaterThan(20)
    for (const topic of Q_TOPICS) expect(file.counts.byTopic[topic], topic).toBeGreaterThanOrEqual(12)
  })

  it('writes true/false statements about half true — a player cannot learn a bias', () => {
    const tf = questions.filter((question) => question.type === 'tf')
    const share = tf.filter((question) => question.answer === 'true').length / tf.length
    expect(share).toBeGreaterThan(0.35)
    expect(share).toBeLessThan(0.65)
  })

  it('makes a false statement out of a value the archive shows is WRONG', () => {
    const won = new Set(
      archive.trophies.filter((row) => row.result === 'won').map((row) => `${row.competitionSlug}|${row.seasonLabel}`),
    )
    const nameToSlug = new Map(archive.competitions.map((row) => [row.nameHe, row.slug]))
    for (const question of questions.filter((q) => q.template === 'tf-trophy')) {
      const match = /זכתה ב(.+) בעונת (\S+)\.$/.exec(question.prompt)
      expect(match, question.prompt).not.toBeNull()
      const slug = nameToSlug.get(match?.[1] ?? '') ?? [...nameToSlug.entries()].find(([name]) => name === match?.[1])?.[1]
      expect(won.has(`${slug}|${match?.[2]}`), question.prompt).toBe(question.answer === 'true')
    }
    for (const question of questions.filter((q) => q.template === 'tf-shirt')) {
      const match = /^(.+) לבש את מספר (\d+) בעונת (\d{4}\/\d{2})\.$/.exec(question.prompt)
      const wore = archive.shirtNumbers.some(
        (row) => row.personNameHe === match?.[1] && row.shirtNumber === Number(match?.[2]) && row.seasonLabel === match?.[3],
      )
      expect(wore, question.prompt).toBe(question.answer === 'true')
    }
  })

  it('orders three items that are really in that order, and labels none of them with its own date', () => {
    const orders = questions.filter((question) => question.type === 'order')
    expect(orders.length).toBeGreaterThan(100)
    for (const question of orders) {
      const items = question.answer as string[]
      expect(new Set(items).size).toBe(items.length)
      for (const item of items) expect(item, question.key).not.toMatch(/\b(19|20)\d{2}\b/)
      if (question.template === 'order-euro') {
        const seasons = items.map((opponent) => archive.euroTies.find((tie) => tie.opponentHe === opponent)?.seasonLabel ?? '')
        expect([...seasons].sort(), question.key).toEqual(seasons)
      }
    }
  })

  it('never lets a left item of a match fit a right item other than its own', () => {
    for (const question of questions.filter((q) => q.template === 'match-trophy')) {
      const left = question.left as string[]
      const right = question.answer as string[]
      const nameToSlug = new Map(archive.competitions.map((row) => [row.nameHe, row.slug]))
      left.forEach((competition, i) => {
        right.forEach((season, j) => {
          if (i === j) return
          const slug = nameToSlug.get(competition)
          expect(
            archive.trophies.some((row) => row.result === 'won' && row.competitionSlug === slug && row.seasonLabel === season),
            `${competition} also won in ${season}`,
          ).toBe(false)
        })
      })
    }
  })

  it('asks a position only of a player the master gives ONE position (rule 74), and never a goal total', () => {
    const positions = questions.filter((question) => question.template.startsWith('player-position'))
    expect(positions.length).toBeGreaterThan(100)
    for (const question of questions.filter((q) => q.topic === 'players' || q.tags.includes('players'))) {
      expect(question.prompt, question.key).not.toMatch(/כמה שערים (כבש|הבקיע) /)
    }
  })
})

describe('מאסטר השאלות — the answer sheet never reaches a client file', () => {
  const FORBIDDEN = [
    'content/generated/question-master.json',
    '@/lib/game/question-master',
    '@/lib/game/questions/build',
    '@/lib/game/questions/templates',
    '@/lib/game/questions/draft',
  ]
  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path, out)
      else if (/\.(ts|tsx)$/.test(name)) out.push(path)
    }
    return out
  }

  it('no `use client` module imports the master, its reader or its builder', () => {
    const offenders: string[] = []
    for (const path of [...walk('app'), ...walk('components'), ...walk('lib')]) {
      const source = readFileSync(path, 'utf8')
      if (!/^['"]use client['"]/m.test(source)) continue
      for (const target of FORBIDDEN) {
        const pattern = new RegExp(`^import (?!type )[^\\n]*['"][^'"]*${target.replace(/[.*+?^${}()|[\]\\/@-]/g, '\\$&')}`, 'm')
        if (pattern.test(source)) offenders.push(`${path} → ${target}`)
      }
      // trivia.ts is server-only: a client may import its TYPES, never its values
      if (/^import (?!type )[^\n]*['"]@\/lib\/game\/trivia['"]/m.test(source)) offenders.push(`${path} → trivia`)
    }
    expect(offenders).toEqual([])
  })

  it('the reader and the engine are server-only', () => {
    for (const path of ['lib/game/question-master.ts', 'lib/game/trivia.ts', 'lib/game/questions/build.ts']) {
      expect(readFileSync(path, 'utf8').startsWith("import 'server-only'"), path).toBe(true)
    }
  })
})
