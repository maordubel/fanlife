import 'server-only'

import { createHash } from 'node:crypto'

import type { Sourced } from '../archive'
import type { Difficulty, Fact, FactKind, HintKind, QTopic, QType, SourceRef, Sport } from './types'

/**
 * A question before the builder stamps it — what a template returns.
 *
 * A template says WHAT is asked and what the right answer is; the builder decides the
 * id, the decade, the hint, the pool id and whether it survives the quality rules. That
 * split is what lets 53 templates move out of one 1,900-line file without each of them
 * re-implementing rule 15.
 */
export type Draft = {
  /** natural key, unique across the whole master — hashed into the `q_` id */
  key: string
  /** the id this question was dealt under before the master existed (aliases, rule 35) */
  legacyKey?: string
  template: string
  type: QType
  prompt: string
  quoteHe?: string
  quoteByHe?: string
  answer: string | string[]
  /** candidate distractors — real values of the same kind; the answer is removed at deal */
  pool?: readonly string[]
  /** fixed alternatives (calls) or a multi's three wrong names */
  distractors?: string[]
  left?: string[]
  explanation: string
  source: SourceRef
  /** a season label, an ISO date, a year — whatever dates the fact; drives `decades` */
  when?: string | number | null
  sport?: Sport
  /** first is the primary topic */
  topics: QTopic[]
  difficulty?: Difficulty
  deep?: boolean
  capped?: string
  hint?: { kind: HintKind; he?: string }
  facts?: Fact[]
  /** set when an unresolved conflict stands behind the fact: never asked (rule 15) */
  conflict?: string
}

export type Template = {
  slug: string
  /** the template's own rating — the builder may raise it (a league-round fixture is 5) */
  base: Difficulty
  build: () => Draft[]
}

export function hash(value: string, length = 12): string {
  return createHash('sha256').update(value).digest('hex').slice(0, length)
}

export function sourceOf(row: Sourced): SourceRef {
  return { title: row.sourceTitle, url: row.sourceUrl, confidence: row.confidence }
}

/** "ב" + "הבחירות" is one ה too many. Drop the article when a preposition supplies it. */
export function stripThe(title: string): string {
  return title.startsWith('ה') ? title.slice(1) : title
}

/** The year a date-ish value falls in: a season counts from the year it starts. */
export function yearOf(when: string | number | null | undefined): number | null {
  if (when === null || when === undefined) return null
  if (typeof when === 'number') return Number.isFinite(when) ? when : null
  const match = /(\d{4})/.exec(when)
  return match ? Number(match[1]) : null
}

export function decadeOf(when: string | number | null | undefined): number | null {
  const year = yearOf(when)
  return year === null ? null : Math.floor(year / 10) * 10
}

/** A deterministic PRNG for the build — the master must be byte-stable across builds. */
export function seeded(label: string): () => number {
  let state = parseInt(hash(label, 8), 16) >>> 0 || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return ((state >>> 0) % 100000) / 100000
  }
}

export function fact(input: {
  kind: FactKind
  key: string
  subject: string
  subjectId?: string
  value: string
  valueType: Fact['value']['type']
  when?: string | null
  sport?: Sport
  topics: QTopic[]
  entityIds?: string[]
  source: SourceRef
  contested?: boolean
}): Fact {
  const when = input.when ?? null
  const precision: Fact['date'] = when
    ? {
        value: when,
        precision: /^\d{4}\/\d{2}$/.test(when)
          ? 'season'
          : /^\d{4}-\d{2}-\d{2}$/.test(when)
            ? 'day'
            : /^\d{4}-\d{2}$/.test(when)
              ? 'month'
              : 'year',
      }
    : null
  return {
    id: `f_${hash(`${input.kind}|${input.key}`)}`,
    kind: input.kind,
    subject: input.subjectId ? { he: input.subject, entityId: input.subjectId } : { he: input.subject },
    value: { he: input.value, type: input.valueType },
    date: precision,
    decade: decadeOf(when),
    sport: input.sport ?? 'football',
    topics: input.topics,
    entityIds: input.entityIds ?? [],
    source: input.source,
    contested: input.contested ?? false,
  }
}
