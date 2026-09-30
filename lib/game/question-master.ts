import 'server-only'

import file from '@/content/generated/question-master.json'

import type { QuestionMasterFile, StoredQuestion } from './questions/build'
import type { Fact, MasterQuestion } from './questions/types'

/**
 * קורא המאסטר — the ONE place the question bank is read at run time.
 *
 * `content/generated/question-master.json` is built by `npm run trivia:master` from the
 * archive and the Player Master (`lib/game/questions/build.ts`). This module is
 * server-only because every question in it carries its answer: a client component that
 * imported it would ship the whole answer sheet to the browser (rule 4), and
 * `tests/question-master.test.ts` fails if any client file reaches for the JSON.
 *
 * Ids are `q_` + a hash of the question's natural key — opaque, stable across rebuilds,
 * and what the revenge ledger persists (rule 35). An id retired by an archive correction
 * resolves through `aliases` to the question that carries it now.
 */

const master = file as unknown as QuestionMasterFile

function expand(stored: StoredQuestion): MasterQuestion & { legacy?: string } {
  const source = master.sources[stored.source] ?? { title: 'ארכיון', url: null, confidence: 2 }
  return {
    ...stored,
    sport: stored.sport ?? 'football',
    tags: stored.tags ?? [stored.topic],
    source,
  }
}

const QUESTIONS = master.questions.map(expand)
const BY_ID = new Map(QUESTIONS.map((question) => [question.id, question]))
const FACTS = new Map(master.facts.map((item) => [item.id, item]))

export function allQuestions(): ReadonlyArray<MasterQuestion & { legacy?: string }> {
  return QUESTIONS
}

/** by id, following an alias when the id was retired by a rebuild */
export function questionById(id: string): (MasterQuestion & { legacy?: string }) | undefined {
  return BY_ID.get(id) ?? BY_ID.get(master.aliases[id] ?? '')
}

/** the id a (possibly retired) id resolves to today, or null */
export function resolveId(id: string): string | null {
  return questionById(id)?.id ?? null
}

export function poolValues(poolId: string | undefined): readonly string[] {
  return poolId ? (master.pools[poolId] ?? []) : []
}

export function factById(id: string): Fact | undefined {
  return FACTS.get(id)
}

export function allFacts(): readonly Fact[] {
  return master.facts
}

export function masterCounts(): QuestionMasterFile['counts'] {
  return master.counts
}

export function masterOpenThrough(): number {
  return master.openThrough
}

export function excludedKeys(): Readonly<Record<string, string>> {
  return master.excluded
}

export function aliasMap(): Readonly<Record<string, string>> {
  return master.aliases
}
