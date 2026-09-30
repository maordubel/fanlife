import 'server-only'

import { rotate } from '@/lib/rotation/deck'

import { rng, shuffle } from './archive'
import { allQuestions, factById, poolValues, questionById } from './question-master'
import { hash } from './questions/draft'
import type {
  AnswerValue,
  Difficulty,
  MasterQuestion,
  PublicQuestion,
  QTopic,
  QType,
  SourceRef,
  Verdict,
} from './questions/types'
import { DEFAULT_TOPIC, questionTopic, resolveTopic, type Topic } from './topics'

export type { PublicQuestion, Verdict } from './questions/types'

/**
 * שער 2 — the run engine over the Question Master.
 *
 * The bank used to be 53 templates re-run over the whole archive on every request; it is
 * now `content/generated/question-master.json` (see `lib/game/questions/build.ts`), read
 * through `question-master.ts`. This module decides WHICH twelve a run gets and grades
 * them — it never hands an answer to anything that could reach the client (rule 4):
 *
 *  · `dealSeededRun` — הכול מהכול / a topic / an era / Hard. Deterministic in (spec,
 *    seed, cursor), so a `?seed=&r=` link hands over the identical run.
 *  · `dealPersonalRun` — Revenge and Surprise. Built from the device's ledger, so they
 *    are shared as the twelve ids themselves (`?q=`), which reproduce them anywhere.
 *  · `publicQuestions` — the dealt shape: options, never the answer, never the source.
 *  · `gradeAnswer` — by question id, not by index, so a personal run needs no seed
 *    rebuild. The probe a determined client could run question by question remains, as
 *    it always has, until `rpc_submit_answer` exists (rule 4).
 *
 * The run's shape is Quick Pick's: twelve questions, three stages of four; a 4 easy /
 * 4 medium / 4 hard ramp; never the same interaction type twice in a row; at most four
 * from one topic in a mixed run; one Ussishkin question at most (rules 16–17); never two
 * questions built on the same fact, and never two with the same prompt.
 */

export const ROUND_LENGTH = 12
export const OPTION_COUNT = 4
export const MULTI_OPTION_COUNT = 6
export const MULTI_PICK_COUNT = 3
/** the year scale shows up to six points */
export const YEAR_OPTION_COUNT = 6
/** a mixed run takes at most this many from one topic */
export const TOPIC_CAP = 4
/** a Hard or Era run takes at most this many league-round fixtures */
export const DEEP_CAP = 4
/** one template, at most twice a run, while the pool allows — variety is the point */
export const TEMPLATE_CAP = 2

export type RunSpec = {
  /** null = הכול מהכול */
  topic: QTopic | null
  /** 1980 = the eighties; null = every era */
  decade: number | null
  hard: boolean
}

export const MIXED: RunSpec = { topic: null, decade: null, hard: false }

export type RunPlan = {
  ids: string[]
  /** personal runs only: how many came from the ledger, how many were filled in */
  revenge?: number
  filler?: number
  unseen?: number
}

/* --------------------------------------------------------------------- the pool */

/** the questions a spec may deal — the topic, era and hard filters, and rule 14 */
export function eligible(spec: RunSpec): Array<MasterQuestion & { legacy?: string }> {
  const deepAllowed = spec.hard || spec.decade !== null
  return allQuestions().filter(
    (question) =>
      (spec.topic === null || (question.sport === 'football' && question.tags.includes(spec.topic))) &&
      (spec.decade === null || question.decades.includes(spec.decade)) &&
      (!spec.hard || question.difficulty >= 3) &&
      (deepAllowed || !question.deep),
  )
}

/** the era chips — from the data, with counts; the lobby disables a chip below a run */
export function eraChips(topic: QTopic | null): Array<{ decade: number; count: number }> {
  const counts = new Map<number, number>()
  for (const question of allQuestions()) {
    if (topic !== null && (question.sport !== 'football' || !question.tags.includes(topic))) continue
    for (const decade of question.decades) counts.set(decade, (counts.get(decade) ?? 0) + 1)
  }
  return [...counts.entries()].sort(([a], [b]) => a - b).map(([decade, count]) => ({ decade, count }))
}

/** how many a topic can deal in a plain (not Hard, not Era) run */
export function topicDepth(topic: QTopic | null): number {
  return eligible({ topic, decade: null, hard: false }).length
}

/* ----------------------------------------------------------------- run building */

type Band = 0 | 1 | 2
const bandOf = (difficulty: Difficulty, hard: boolean): Band =>
  hard ? (difficulty <= 3 ? 0 : difficulty === 4 ? 1 : 2) : difficulty <= 2 ? 0 : difficulty === 3 ? 1 : 2

type Candidate = MasterQuestion & { legacy?: string }

type Picker = {
  used: Set<string>
  facts: Set<string>
  prompts: Set<string>
  topics: Map<QTopic, number>
  templates: Map<string, number>
  capped: Set<string>
  deep: number
  last: QType | null
}

function newPicker(): Picker {
  return {
    used: new Set(),
    facts: new Set(),
    prompts: new Set(),
    topics: new Map(),
    templates: new Map(),
    capped: new Set(),
    deep: 0,
    last: null,
  }
}

function fits(
  question: Candidate,
  picker: Picker,
  rules: { topicCap: boolean; templateCap?: boolean; alternate: boolean; relaxType?: boolean },
): boolean {
  if (picker.used.has(question.id)) return false
  // the PROMPT, not prompt+clue: "איזה שער מתואר כאן?" twice in one run reads as the same
  // question twice, whatever report sits above it
  if (picker.prompts.has(question.prompt)) return false
  if (question.factIds.some((id) => picker.facts.has(id))) return false
  if (question.capped && picker.capped.has(question.capped)) return false
  if (question.deep && picker.deep >= DEEP_CAP) return false
  if (rules.topicCap && (picker.topics.get(question.topic) ?? 0) >= TOPIC_CAP) return false
  if (rules.templateCap && (picker.templates.get(question.template) ?? 0) >= TEMPLATE_CAP) return false
  if (rules.alternate && !rules.relaxType && picker.last === question.type) return false
  return true
}

function take(question: Candidate, picker: Picker) {
  picker.used.add(question.id)
  picker.prompts.add(question.prompt)
  picker.templates.set(question.template, (picker.templates.get(question.template) ?? 0) + 1)
  for (const id of question.factIds) picker.facts.add(id)
  if (question.capped) picker.capped.add(question.capped)
  if (question.deep) picker.deep += 1
  picker.topics.set(question.topic, (picker.topics.get(question.topic) ?? 0) + 1)
  picker.last = question.type
}

/**
 * A deck per (band, class): shuffled once for the seed, cut into chunks, and round
 * `cursor` reads chunk `cursor`. Consecutive rounds therefore draw from disjoint chunks
 * and share nothing until a deck is exhausted — the rotation promise (rule 72) held at
 * the level it is made, the way `computeRound` held it per template before.
 */
function chunkOf(
  list: Candidate[],
  seed: number,
  cursor: number,
  size: number,
  label: string,
  ordered = false,
): Candidate[] {
  if (list.length === 0) return []
  // a personal run arrives already ranked (Surprise: least-played topic first) — keep it
  if (ordered) return list
  const per = Math.max(1, Math.min(size, Math.floor(list.length / 2) || list.length))
  const chunks = Math.max(1, Math.floor(list.length / per))
  // One shuffle per seed, walked chunk by chunk and around again. NOT reshuffled per lap:
  // a fresh shuffle at the lap boundary can put the chunk just played at the head of the
  // next one, which is exactly the repeat the rotation promise forbids. The decks have
  // different lengths, so they wrap at different visits and the runs still differ.
  const deck = shuffle(list, rng((seed * 7919 + parseInt(hash(label, 6), 16)) >>> 0))
  const at = (cursor % chunks) * per
  // the chunk first, then the rest of the deck in order — the rest is reached only when
  // the chunk cannot fill a slot under the run's rules
  return rotate(deck, at)
}

function specLabel(spec: RunSpec, types: readonly QType[] | null): string {
  return `${spec.topic ?? 'all'}|${spec.decade ?? 'any'}|${spec.hard ? 'hard' : 'plain'}|${types?.join(',') ?? 'all'}`
}

/**
 * The twelve. Slots run M · X · M · X per stage — M an ordinary pick, X one of the five
 * interactive types — so no type ever follows itself and every stage has two things to
 * DO besides tapping an option. Where a band cannot fill a slot (a thin topic, a narrow
 * era), the picker widens: the other class, then the neighbouring bands, then the type
 * rule, and last the topic cap. It never deals short while the pool can fill a run.
 */
function buildRun(
  pool: Candidate[],
  spec: RunSpec,
  seed: number,
  cursor: number,
  options: { types?: readonly QType[]; alternate?: boolean; ordered?: boolean } = {},
): Candidate[] {
  const types = options.types ?? null
  const alternate = options.alternate ?? true
  const usable = types ? pool.filter((question) => types.includes(question.type)) : pool
  const label = specLabel(spec, types)
  const decks: Record<string, Candidate[]> = {}
  for (const band of [0, 1, 2] as Band[]) {
    for (const klass of ['m', 'x'] as const) {
      // without alternation there is one deck per band — every allowed type in it
      const list = usable.filter(
        (question) =>
          bandOf(question.difficulty, spec.hard) === band &&
          (alternate ? (question.type === 'mcq') === (klass === 'm') : klass === 'm'),
      )
      decks[`${band}${klass}`] = chunkOf(list, seed, cursor, 16, `${label}|${band}${klass}`, options.ordered)
    }
  }
  const topicCap = spec.topic === null
  const picker = newPicker()
  const run: Candidate[] = []
  const order: Band[] = [0, 1, 2]
  for (let slot = 0; slot < ROUND_LENGTH; slot += 1) {
    const band = order[Math.floor(slot / 4)] as Band
    const klass = alternate && slot % 2 === 1 ? 'x' : 'm'
    const other = klass === 'm' ? 'x' : 'm'
    const neighbours = ([0, 1, 2] as Band[]).filter((b) => b !== band).sort((a, b) => Math.abs(a - band) - Math.abs(b - band))
    type Attempt = { deck: string; relaxType?: boolean; topicCap: boolean; templateCap: boolean }
    const strict = { topicCap, templateCap: true }
    const tries: Attempt[] = [
      { deck: `${band}${alternate ? klass : 'm'}`, ...strict },
      { deck: `${band}${alternate ? other : 'x'}`, ...strict },
      ...neighbours.flatMap((b) => [
        { deck: `${b}${alternate ? klass : 'm'}`, ...strict },
        { deck: `${b}${alternate ? other : 'x'}`, ...strict },
      ]),
      ...([0, 1, 2] as Band[]).flatMap((b) => [
        { deck: `${b}m`, relaxType: true, ...strict },
        { deck: `${b}x`, relaxType: true, ...strict },
      ]),
      ...([0, 1, 2] as Band[]).flatMap((b) => [
        { deck: `${b}m`, relaxType: true, topicCap: false, templateCap: false },
        { deck: `${b}x`, relaxType: true, topicCap: false, templateCap: false },
      ]),
    ]
    let chosen: Candidate | undefined
    for (const attempt of tries) {
      chosen = (decks[attempt.deck] ?? []).find((question) => fits(question, picker, { ...attempt, alternate }))
      if (chosen) break
    }
    if (!chosen) break
    take(chosen, picker)
    run.push(chosen)
  }
  return run
}

/** הכול מהכול / topic / era / Hard — the twelve for (spec, seed, cursor) */
export function dealSeededRun(spec: RunSpec, seed: number, cursor = 0): RunPlan {
  return { ids: buildRun(eligible(spec), spec, seed, cursor).map((question) => question.id) }
}

/**
 * נקמה / תפתיע אותי — from the device's ledger.
 *
 *  · **Revenge** is the questions whose LAST outcome was wrong, most recent first, and
 *    only those. When there are fewer than twelve the rest are hard questions, and the
 *    plan SAYS how many of each ("5 נקמות + 7 קשות") — the prototype topped up silently,
 *    which brief §13 forbids.
 *  · **Surprise** is unseen questions first, from the topics this device has played
 *    least; only when the unseen run out does it return to seen ones.
 */
export function dealPersonalRun(
  kind: 'revenge' | 'surprise',
  ledger: { wrong: string[]; seen: string[] },
  seed: number,
): RunPlan {
  const seen = new Set(ledger.seen.map((id) => questionById(id)?.id ?? id))
  if (kind === 'revenge') {
    const revenge: Candidate[] = []
    const picker = newPicker()
    for (const id of ledger.wrong) {
      const question = questionById(id)
      if (!question || !fits(question, picker, { topicCap: false, alternate: false })) continue
      take(question, picker)
      revenge.push(question)
      if (revenge.length >= ROUND_LENGTH) break
    }
    const filler: Candidate[] = []
    if (revenge.length < ROUND_LENGTH) {
      const hard = shuffle(
        eligible({ topic: null, decade: null, hard: false }).filter((question) => question.difficulty >= 4),
        rng(seed),
      ).sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)))
      for (const question of hard) {
        if (revenge.length + filler.length >= ROUND_LENGTH) break
        if (!fits(question, picker, { topicCap: true, templateCap: true, alternate: false })) continue
        take(question, picker)
        filler.push(question)
      }
    }
    const ordered = [...revenge, ...filler].sort((a, b) => a.difficulty - b.difficulty)
    return { ids: ordered.map((question) => question.id), revenge: revenge.length, filler: filler.length }
  }

  const pool = eligible(MIXED)
  const played = new Map<QTopic, number>()
  for (const id of seen) {
    const question = questionById(id)
    if (question) played.set(question.topic, (played.get(question.topic) ?? 0) + 1)
  }
  const unseen = pool.filter((question) => !seen.has(question.id))
  // least-played topics first; inside a topic the seed decides
  const ranked = (list: Candidate[]) =>
    shuffle(list, rng(seed)).sort((a, b) => (played.get(a.topic) ?? 0) - (played.get(b.topic) ?? 0))
  const source = unseen.length >= ROUND_LENGTH ? ranked(unseen) : ranked(pool)
  const run = buildRun(source, MIXED, seed, 0, { ordered: true })
  return { ids: run.map((question) => question.id), unseen: run.filter((question) => !seen.has(question.id)).length }
}

/* ----------------------------------------------------------------- the dealt shape */

function randomFor(seed: number, id: string): () => number {
  return rng((parseInt(hash(`${seed}:${id}`, 8), 16) >>> 0) || 1)
}

function chronological(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true })
}

/** the options a question is dealt with, for this seed — the same on deal and on hint */
function optionsFor(question: MasterQuestion, seed: number, legacy = false): string[] {
  const random = randomFor(seed, question.id)
  const answers = Array.isArray(question.answer) ? question.answer : [question.answer]
  const others = (count: number) => {
    const fixed = (question.distractors ?? []).filter((value) => !answers.includes(value))
    const pool = shuffle(
      poolValues(question.pool).filter((value) => !answers.includes(value) && !fixed.includes(value)),
      random,
    )
    return [...fixed, ...pool].slice(0, count)
  }
  switch (question.type) {
    case 'mcq':
      return shuffle([question.answer as string, ...others(OPTION_COUNT - 1)], random)
    case 'year': {
      if (legacy) return shuffle([question.answer as string, ...others(OPTION_COUNT - 1)], random)
      return [question.answer as string, ...others(YEAR_OPTION_COUNT - 1)].sort(chronological)
    }
    case 'multi':
      return shuffle([...answers, ...others(MULTI_OPTION_COUNT - MULTI_PICK_COUNT)], random)
    case 'tf':
      return ['true', 'false']
    case 'order':
    case 'match': {
      // never dealt already solved: a shuffle that lands on the answer is turned once
      const dealt = shuffle(answers, random)
      return dealt.every((value, index) => value === answers[index]) ? rotate(dealt, 1) : dealt
    }
  }
}

export function publicQuestion(question: MasterQuestion, seed: number): PublicQuestion {
  return {
    id: question.id,
    template: question.template,
    type: question.type,
    topic: question.topic,
    difficulty: question.difficulty,
    prompt: question.prompt,
    ...(question.quoteHe ? { quoteHe: question.quoteHe } : {}),
    ...(question.quoteByHe ? { quoteByHe: question.quoteByHe } : {}),
    options: optionsFor(question, seed),
    ...(question.left ? { left: question.left } : {}),
    pickCount: question.type === 'multi' ? MULTI_PICK_COUNT : 1,
    hintKind: question.hint.kind,
  }
}

/** the dealt run — the ids resolved (aliases followed), unknown ids dropped */
export function publicQuestions(ids: readonly string[], seed: number): PublicQuestion[] {
  const out: PublicQuestion[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    const question = questionById(id)
    if (!question || seen.has(question.id)) continue
    seen.add(question.id)
    out.push(publicQuestion(question, seed))
  }
  return out
}

/* ------------------------------------------------------------------------ grading */

function asList(answer: AnswerValue): string[] {
  return Array.isArray(answer) ? answer.map(String) : [String(answer)]
}

/**
 * Grading, on the server, by id. All-or-nothing for every type — partial credit would
 * reward ticking everything plausible — but the verdict reports `hits` (two of three
 * ticked, two of three placed) because a near miss is worth being told.
 */
export function gradeAnswer(id: string, answer: AnswerValue): Verdict | null {
  const question = questionById(id)
  if (!question) return null
  const truth = asList(question.answer)
  const given = asList(answer)
  let correct = false
  let hits = 0
  switch (question.type) {
    case 'mcq':
    case 'year':
    case 'tf':
      correct = given.length === 1 && given[0] === truth[0]
      hits = correct ? 1 : 0
      break
    case 'multi': {
      const picked = [...new Set(given)]
      hits = picked.filter((value) => truth.includes(value)).length
      correct = hits === truth.length && picked.length === truth.length
      break
    }
    case 'order':
    case 'match':
      hits = truth.filter((value, index) => given[index] === value).length
      correct = given.length === truth.length && hits === truth.length
      break
  }
  return {
    correct,
    correctAnswers: truth,
    hits,
    explanation: question.explanation,
    difficulty: question.difficulty,
  }
}

/**
 * The archive entities behind a set of questions — through each question's facts, in the
 * order the questions came. Used AFTER a run for the Universal Exit's doors (ONE RED WORLD
 * §11: "wrong answer → archive entity"); the ids are canonical, the facts never leave.
 */
export function entitiesOfQuestions(ids: readonly string[]): string[] {
  const out: string[] = []
  for (const id of ids) {
    const question = questionById(id)
    if (!question) continue
    for (const factId of question.factIds) {
      for (const entityId of factById(factId)?.entityIds ?? []) {
        if (!out.includes(entityId)) out.push(entityId)
      }
    }
  }
  return out
}

/* -------------------------------------------------------------------------- hints */

export type Hint = { kind: 'decade' | 'context' | 'strike'; text?: string; strike?: string[] }

export function decadeLabel(decade: number): string {
  return decade >= 2000 ? `שנות ה־${decade}` : `שנות ה־${String(decade).slice(2)}`
}

/**
 * The hint, derived — never written by hand (brief §13): the fact's decade, a context
 * field that is not the answer, or one wrong option struck out. It arrives only when it
 * is asked for, and it costs the answer `HINT_COST` and its combo gain (`session.ts`).
 */
export function hintFor(id: string, seed: number): Hint | null {
  const question = questionById(id)
  if (!question) return null
  const truth = asList(question.answer)
  const { kind, he } = question.hint
  if (kind === 'decade' && question.decades.length > 0) {
    return { kind, text: decadeLabel(question.decades[0] as number) }
  }
  if (kind === 'context') {
    if (he) return { kind, text: he }
    if (question.type === 'order') return { kind, text: truth[0] }
    if (question.type === 'match' && question.left) return { kind, text: `${question.left[0]} ↔ ${truth[0]}` }
  }
  const wrong = optionsFor(question, seed).filter((option) => !truth.includes(option))
  const struck = shuffle(wrong, randomFor(seed + 1, question.id)).slice(0, 1)
  return struck.length > 0 ? { kind: 'strike', strike: struck } : null
}

/* ----------------------------------------------------------- counts for the lobby */

/** every topic's depth, for the lobby's tiles — read from the master, not rebuilt */
export function topicCounts(): Record<Topic, number> {
  return {
    general: topicDepth(null),
    europe: topicDepth('europe'),
    players: topicDepth('players'),
    history: topicDepth('history'),
    numbers: topicDepth('numbers'),
    songs: topicDepth('songs'),
    kits: topicDepth('kits'),
    derby: topicDepth('derby'),
  }
}

/* ------------------------------------------------------------ the legacy surface
 *
 * `deal(seed, index, topic, cursor)` and `grade(seed, index, answer, topic, cursor)` —
 * the shape THE WORKER LIFE's Toto slip plays (`app/life/totoActions.ts`), kept exactly:
 * single- and multi-select only, four options or six, graded by position in a seeded
 * round. It deals from the SAME master with the same rules.
 */

export type TriviaQuestion = {
  id: string
  template: string
  prompt: string
  kind: 'single' | 'multi'
  options: string[]
  pickCount: number
  quoteHe?: string
  quoteByHe?: string
  difficulty: Difficulty
}

const LEGACY_TYPES: readonly QType[] = ['mcq', 'multi', 'year']
const legacyCache = new Map<string, Candidate[]>()

function legacySpec(topic: string): RunSpec {
  const resolved = resolveTopic(topic) ?? DEFAULT_TOPIC
  return { topic: questionTopic(resolved), decade: null, hard: false }
}

/**
 * חלון של חיים (21.9.2026) — the slip THE WORKER LIFE hands a boy in 1993 asks only about
 * what had happened by then (`lib/mechanics/types.ts` MechanicWindow). A question is
 * inside the window when every decade it is about ended before `before`, and it is at
 * most `maxDifficulty`. Absent, the deal is exactly the deal it was.
 */
export type TriviaWindow = { before: number; maxDifficulty?: number }

function inWindow(question: { decades: readonly number[]; difficulty: number }, window: TriviaWindow): boolean {
  if (question.decades.length === 0) return false
  if (!question.decades.every((decade) => decade + 10 <= window.before)) return false
  return window.maxDifficulty === undefined || question.difficulty <= window.maxDifficulty
}

/** how many slip-shaped questions a window holds — the life asks before it deals */
export function windowedQuestionCount(window: TriviaWindow, topic: string = DEFAULT_TOPIC): number {
  return eligible(legacySpec(topic)).filter((question) => LEGACY_TYPES.includes(question.type) && inWindow(question, window)).length
}

function legacyRound(seed: number, topic: string, cursor: number, window?: TriviaWindow): Candidate[] {
  const key = `${seed}|${topic}|${cursor}|${window ? `${window.before}:${window.maxDifficulty ?? ''}` : ''}`
  const cached = legacyCache.get(key)
  if (cached) return cached
  const spec = legacySpec(topic)
  const pool = window ? eligible(spec).filter((question) => inWindow(question, window)) : eligible(spec)
  const run = buildRun(pool, spec, seed, cursor, { types: LEGACY_TYPES, alternate: false }).sort(
    (a, b) => a.difficulty - b.difficulty,
  )
  legacyCache.set(key, run)
  if (legacyCache.size > 16) {
    const oldest = legacyCache.keys().next()
    if (!oldest.done) legacyCache.delete(oldest.value)
  }
  return run
}

export function deal(
  seed: number,
  index: number,
  topic: string = DEFAULT_TOPIC,
  cursor = 0,
  window?: TriviaWindow,
): TriviaQuestion | null {
  const question = legacyRound(seed, topic, cursor, window)[index]
  if (!question) return null
  const multi = question.type === 'multi'
  return {
    id: question.id,
    template: question.template,
    prompt: question.prompt,
    kind: multi ? 'multi' : 'single',
    options: optionsFor(question, seed, true),
    pickCount: multi ? MULTI_PICK_COUNT : 1,
    ...(question.quoteHe ? { quoteHe: question.quoteHe } : {}),
    ...(question.quoteByHe ? { quoteByHe: question.quoteByHe } : {}),
    difficulty: question.difficulty,
  }
}

export function grade(
  seed: number,
  index: number,
  answer: string | string[],
  topic: string = DEFAULT_TOPIC,
  cursor = 0,
  window?: TriviaWindow,
): Verdict | null {
  const question = legacyRound(seed, topic, cursor, window)[index]
  if (!question) return null
  return gradeAnswer(question.id, answer)
}

/** Server-side provenance audit — the natural key and the source, never for a client. */
export function auditRound(seed: number, topic: string = DEFAULT_TOPIC, cursor = 0): Array<{ id: string; source: SourceRef }> {
  return legacyRound(seed, topic, cursor).map((question) => ({ id: question.key, source: question.source }))
}

export function roundDifficulties(seed: number, topic: string = DEFAULT_TOPIC, cursor = 0): Difficulty[] {
  return legacyRound(seed, topic, cursor).map((question) => question.difficulty)
}

export function availableQuestionCount(topic: string = DEFAULT_TOPIC): number {
  return eligible(legacySpec(topic)).filter((question) => LEGACY_TYPES.includes(question.type)).length
}
