import 'server-only'

import { currentSeasonStartYear } from '../seasons'
import { decadeOf, hash, type Draft, type Template } from './draft'
import { EUROPE_TEMPLATES } from './templates/europe'
import { generatedTemplates } from './templates/generated'
import { GOAL_TEMPLATES } from './templates/goals'
import { HISTORY_TEMPLATES } from './templates/history'
import { kitTemplates } from './templates/kits'
import { MATCH_TEMPLATES } from './templates/matches'
import { NUMBER_TEMPLATES } from './templates/numbers'
import { PEOPLE_TEMPLATES } from './templates/people'
import { PLAYER_TEMPLATES } from './templates/players'
import { SONG_TEMPLATES } from './templates/songs'
import { USSISHKIN_TEMPLATES } from './templates/ussishkin'
import { Q_TOPICS, Q_TYPES, type Fact, type HintKind, type MasterQuestion, type QTopic, type SourceRef } from './types'

/**
 * בונה המאסטר — every template over the archive, once, into one file.
 *
 * The old bank re-ran 53 templates over three thousand matches on EVERY request (the
 * lobby rebuilt it five times to print five counts). The master runs them once, at build
 * time (`npm run trivia:master`), and keeps what survives the house rules:
 *
 *  · confidence ≥ 2 — enforced upstream in `archive.ts`, so no template can bypass it;
 *  · exactly one right answer and three REAL distractors, or the question is dropped
 *    (rule 15) — never padded;
 *  · one prompt, one answer: a prompt+clue that maps to two answers is dropped whole;
 *  · no unresolved conflict behind it (`conflicts.ts`) — dropped, and the drop is WRITTEN
 *    DOWN in `excluded` with its reason;
 *  · a `sport` on every question, and the Ussishkin family in one capped group (16–17).
 *
 * The output is deterministic: the same archive yields the same bytes. That is what lets
 * a test rebuild it and fail when `content/manual` moved and the master did not.
 */

/**
 * A question as the FILE stores it: the source is an id into `sources`, and the two
 * fields that are nearly always the same value are left out when they are — `sport`
 * (football) and `tags` (just the topic). `question-master.ts` puts them back.
 */
export type StoredQuestion = Omit<MasterQuestion, 'source' | 'sport' | 'tags'> & {
  source: string
  sport?: MasterQuestion['sport']
  tags?: MasterQuestion['tags']
  legacy?: string
}

export type QuestionMasterFile = {
  schemaVersion: 1
  /** the last season an open kit spell is read through — pinned so a rebuild is stable */
  openThrough: number
  counts: {
    questions: number
    facts: number
    byType: Record<string, number>
    byTopic: Record<string, number>
    byDifficulty: Record<string, number>
    byDecade: Record<string, number>
    deep: number
    excluded: number
  }
  pools: Record<string, string[]>
  /** every source a question cites, once — a question carries its id */
  sources: Record<string, SourceRef>
  facts: Fact[]
  questions: StoredQuestion[]
  /** an id that was dealt or saved before → the id that carries it now (rule 35) */
  aliases: Record<string, string>
  /** a legacy key that is no longer asked → why (conflict, options, ambiguity) */
  excluded: Record<string, string>
}

export function allTemplates(openThrough: number): Template[] {
  return [
    ...EUROPE_TEMPLATES,
    ...NUMBER_TEMPLATES,
    ...SONG_TEMPLATES,
    ...GOAL_TEMPLATES,
    ...kitTemplates(openThrough),
    ...PEOPLE_TEMPLATES,
    ...MATCH_TEMPLATES,
    ...HISTORY_TEMPLATES,
    ...USSISHKIN_TEMPLATES,
    ...PLAYER_TEMPLATES,
    ...generatedTemplates(openThrough),
  ]
}

const distinct = (values: readonly string[]) => [...new Set(values.filter((value) => value.length > 0))]

/** why a draft cannot be asked, or null */
function invalid(draft: Draft): string | null {
  const answers = Array.isArray(draft.answer) ? draft.answer : [draft.answer]
  if (answers.some((answer) => answer.length === 0)) return 'options:empty-answer'
  switch (draft.type) {
    case 'mcq':
    case 'year': {
      const others = distinct([...(draft.distractors ?? []), ...(draft.pool ?? [])]).filter(
        (value) => value !== draft.answer,
      )
      return others.length >= 3 ? null : 'options:fewer-than-three-distractors'
    }
    case 'multi': {
      if (distinct(answers).length !== 3) return 'options:multi-needs-three'
      const wrong = distinct([...(draft.distractors ?? []), ...(draft.pool ?? [])]).filter(
        (value) => !answers.includes(value),
      )
      return wrong.length >= 3 ? null : 'options:multi-needs-three-wrong'
    }
    case 'tf':
      return draft.answer === 'true' || draft.answer === 'false' ? null : 'options:tf'
    case 'order':
      return distinct(answers).length === answers.length && answers.length >= 3 ? null : 'options:order'
    case 'match':
      return draft.left &&
        draft.left.length === answers.length &&
        answers.length >= 3 &&
        distinct(draft.left).length === draft.left.length &&
        distinct(answers).length === answers.length
        ? null
        : 'options:match'
  }
}

function defaultHint(draft: Draft, decades: number[]): { kind: HintKind; he?: string } {
  switch (draft.type) {
    case 'order':
    case 'match':
      return { kind: 'context' }
    case 'tf':
      return decades.length > 0 ? { kind: 'decade' } : { kind: 'context', he: draft.source.title }
    case 'year':
      return { kind: 'strike' }
    default:
      return decades.length > 0 ? { kind: 'decade' } : { kind: 'strike' }
  }
}

export function buildQuestionMaster(options: {
  openThrough?: number
  previous?: Pick<QuestionMasterFile, 'questions' | 'aliases'> | null
} = {}): QuestionMasterFile {
  const openThrough = options.openThrough ?? currentSeasonStartYear()
  type Entry = { draft: Draft; base: Draft['difficulty'] & number; order: number; drop: string | null }
  const entries: Entry[] = []
  for (const template of allTemplates(openThrough)) {
    for (const draft of template.build()) {
      entries.push({ draft, base: template.base, order: entries.length, drop: null })
    }
  }

  // 1. conflicts and options
  for (const entry of entries) {
    entry.drop = entry.draft.conflict ?? invalid(entry.draft)
  }

  // 2. one ask, one answer — the ask is the prompt plus its clue
  const answersOf = new Map<string, Set<string>>()
  // an order question's items ARE part of its ask — every one of them shares a prompt
  const ask = (draft: Draft) =>
    `${draft.prompt}\u0000${draft.quoteHe ?? ''}\u0000${(draft.left ?? []).join('|')}\u0000${
      draft.type === 'order' && Array.isArray(draft.answer) ? [...draft.answer].sort().join('|') : ''
    }`
  const answerKey = (draft: Draft) => (Array.isArray(draft.answer) ? draft.answer.join('|') : draft.answer)
  for (const entry of entries) {
    if (entry.drop) continue
    const set = answersOf.get(ask(entry.draft)) ?? new Set<string>()
    set.add(answerKey(entry.draft))
    answersOf.set(ask(entry.draft), set)
  }
  for (const entry of entries) {
    if (entry.drop) continue
    if ((answersOf.get(ask(entry.draft))?.size ?? 0) > 1) entry.drop = 'ambiguous:one-prompt-two-answers'
  }

  // 3. one key, one question
  const byKey = new Map<string, Entry>()
  for (const entry of entries) {
    if (entry.drop) continue
    const held = byKey.get(entry.draft.key)
    if (!held) {
      byKey.set(entry.draft.key, entry)
      continue
    }
    if (answerKey(held.draft) === answerKey(entry.draft)) entry.drop = 'duplicate:same-row-twice'
    else {
      entry.drop = 'ambiguous:one-key-two-answers'
      held.drop = 'ambiguous:one-key-two-answers'
    }
  }

  // 4. stamp
  const pools: Record<string, string[]> = {}
  const sources: Record<string, SourceRef> = {}
  const facts = new Map<string, Fact>()
  const questions: QuestionMasterFile['questions'] = []
  const survivors = new Map<Entry, string>()
  for (const entry of entries) {
    if (entry.drop) continue
    const { draft } = entry
    for (const item of draft.facts ?? []) if (!facts.has(item.id)) facts.set(item.id, item)
    const decades =
      draft.when !== undefined
        ? [decadeOf(draft.when)].filter((value): value is number => value !== null)
        : distinct((draft.facts ?? []).map((item) => String(item.decade ?? ''))).map(Number)
    let pool: string | undefined
    if (draft.pool && (draft.type === 'mcq' || draft.type === 'year' || draft.type === 'multi')) {
      const values = distinct(draft.pool).sort()
      pool = `p_${hash(values.join('\u0001'), 10)}`
      pools[pool] = values
    }
    const topics = [...new Set(draft.topics)] as QTopic[]
    const id = `q_${hash(draft.key)}`
    const sourceId = `s_${hash(`${draft.source.title}\u0001${draft.source.url ?? ''}\u0001${draft.source.confidence}`, 8)}`
    sources[sourceId] = draft.source
    survivors.set(entry, id)
    questions.push({
      id,
      key: draft.key,
      ...(draft.legacyKey ? { legacy: draft.legacyKey } : {}),
      template: draft.template,
      type: draft.type,
      topic: topics[0] as QTopic,
      ...(topics.length > 1 ? { tags: topics } : {}),
      ...(draft.sport === 'basketball' ? { sport: 'basketball' as const } : {}),
      decades: [...new Set(decades)].sort(),
      difficulty: draft.difficulty ?? entry.base,
      ...(draft.deep ? { deep: true as const } : {}),
      ...(draft.capped ? { capped: draft.capped } : {}),
      prompt: draft.prompt,
      ...(draft.quoteHe ? { quoteHe: draft.quoteHe } : {}),
      ...(draft.quoteByHe ? { quoteByHe: draft.quoteByHe } : {}),
      answer: draft.answer,
      ...(pool ? { pool } : {}),
      ...(draft.distractors ? { distractors: distinct(draft.distractors) } : {}),
      ...(draft.left ? { left: draft.left } : {}),
      explanation: draft.explanation,
      hint: draft.hint ?? defaultHint(draft, decades),
      factIds: (draft.facts ?? []).map((item) => item.id),
      source: sourceId,
    })
  }

  // 5. aliases and exclusions — the legacy key follows the old bank's own rule (the last
  //    built wins), and a previous build's ids follow their question to its new id
  const aliases: Record<string, string> = {}
  const excluded: Record<string, string> = {}
  // The old bank kept the LAST question built under a key among those that passed its own
  // filters (options, ambiguity). A conflict is a filter the old bank did not have, so the
  // old "current" question is the last one that was dropped for nothing OR for a conflict —
  // and when that one is the conflicted one, the key is recorded as excluded even if an
  // earlier question under the same colliding key survives (and is what the alias follows).
  const currentByLegacy = new Map<string, Entry>()
  const lastByLegacy = new Map<string, Entry>()
  const liveByLegacy = new Map<string, string>()
  for (const entry of entries) {
    const legacy = entry.draft.legacyKey
    if (!legacy) continue
    lastByLegacy.set(legacy, entry)
    if (entry.drop === null || entry.drop.startsWith('conflict:')) currentByLegacy.set(legacy, entry)
    const id = survivors.get(entry)
    if (id) liveByLegacy.set(legacy, id)
  }
  for (const [legacy, last] of lastByLegacy) {
    const id = liveByLegacy.get(legacy)
    if (id) aliases[legacy] = id
    const current = currentByLegacy.get(legacy) ?? last
    if (current.drop) excluded[legacy] = current.drop
  }
  const live = new Set(questions.map((question) => question.id))
  for (const [from, to] of Object.entries(options.previous?.aliases ?? {})) {
    if (!(from in aliases) && live.has(to)) aliases[from] = to
  }
  for (const old of options.previous?.questions ?? []) {
    if (live.has(old.id) || aliases[old.id]) continue
    const next = old.legacy ? liveByLegacy.get(old.legacy) : undefined
    if (next) aliases[old.id] = next
  }

  const count = (pick: (question: StoredQuestion) => string[]) => {
    const out: Record<string, number> = {}
    for (const question of questions) for (const key of pick(question)) out[key] = (out[key] ?? 0) + 1
    return out
  }
  const sortedAliases = Object.fromEntries(Object.entries(aliases).sort(([a], [b]) => a.localeCompare(b)))
  const sortedExcluded = Object.fromEntries(Object.entries(excluded).sort(([a], [b]) => a.localeCompare(b)))

  return {
    schemaVersion: 1,
    openThrough,
    counts: {
      questions: questions.length,
      facts: facts.size,
      byType: Object.fromEntries(Q_TYPES.map((type) => [type, questions.filter((q) => q.type === type).length])),
      byTopic: Object.fromEntries(
        Q_TOPICS.map((topic) => [topic, questions.filter((q) => (q.tags ?? [q.topic]).includes(topic)).length]),
      ),
      byDifficulty: count((question) => [String(question.difficulty)]),
      byDecade: count((question) => question.decades.map(String)),
      deep: questions.filter((question) => question.deep).length,
      excluded: Object.keys(excluded).length,
    },
    pools: Object.fromEntries(Object.entries(pools).sort(([a], [b]) => a.localeCompare(b))),
    sources: Object.fromEntries(Object.entries(sources).sort(([a], [b]) => a.localeCompare(b))),
    facts: [...facts.values()].sort((a, b) => a.id.localeCompare(b.id)),
    questions,
    aliases: sortedAliases,
    excluded: sortedExcluded,
  }
}

/**
 * The file as written: one question per line. Pretty-printing 9,000 questions doubles
 * the bytes for nothing; one-per-line keeps a rebuild's diff readable.
 */
export function serialiseMaster(master: QuestionMasterFile): string {
  const lines = (items: readonly unknown[]) => items.map((item) => `    ${JSON.stringify(item)}`).join(',\n')
  const block = (value: Record<string, unknown>) =>
    Object.entries(value)
      .map(([key, item]) => `    ${JSON.stringify(key)}: ${JSON.stringify(item)}`)
      .join(',\n')
  return [
    '{',
    `  "schemaVersion": ${master.schemaVersion},`,
    `  "openThrough": ${master.openThrough},`,
    `  "counts": ${JSON.stringify(master.counts)},`,
    `  "pools": {\n${block(master.pools)}\n  },`,
    `  "sources": {\n${block(master.sources)}\n  },`,
    `  "facts": [\n${lines(master.facts)}\n  ],`,
    `  "questions": [\n${lines(master.questions)}\n  ],`,
    `  "aliases": {\n${block(master.aliases)}\n  },`,
    `  "excluded": {\n${block(master.excluded)}\n  }`,
    '}',
    '',
  ].join('\n')
}
