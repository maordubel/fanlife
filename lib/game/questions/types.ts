/**
 * מאסטר השאלות — the shapes.
 *
 * Pure types, no archive import: the client never imports this file's VALUES, only
 * the public shapes (`QType`, `QTopic`) that describe what the screen draws. Everything
 * that knows an answer lives behind `server-only` in `lib/game/question-master.ts`.
 */

/** the seven ways in — Maor's Quick Pick topics (brief §13) */
export const Q_TOPICS = ['europe', 'players', 'history', 'numbers', 'songs', 'kits', 'derby'] as const
export type QTopic = (typeof Q_TOPICS)[number]

/**
 * The six interaction types. `year` is the scale of years/seasons; `tf` is a statement
 * the player marks true or false; `order` places three dated facts; `match` pairs three
 * facts of one kind. Every one of them is BUILT from facts — none is hand-written.
 */
export const Q_TYPES = ['mcq', 'multi', 'tf', 'order', 'match', 'year'] as const
export type QType = (typeof Q_TYPES)[number]

export type Difficulty = 1 | 2 | 3 | 4 | 5
export type Sport = 'football' | 'basketball'

export type SourceRef = { title: string; url: string | null; confidence: number }

export type HintKind = 'decade' | 'context' | 'strike'

export type FactKind =
  | 'trophy-won'
  | 'euro-tie'
  | 'match'
  | 'derby-match'
  | 'goal'
  | 'moment'
  | 'kit-supply'
  | 'sponsor-deal'
  | 'crest'
  | 'shirt-number'
  | 'player-position'
  | 'player-span'
  | 'song'
  | 'fan-call'
  | 'crossing'
  | 'election'

/** a dated, sourced statement the questions (and gates 6/12/13) are built from */
export type Fact = {
  id: string
  kind: FactKind
  subject: { he: string; entityId?: string }
  value: { he: string; type: 'season' | 'year' | 'name' | 'club' | 'number' | 'text' }
  date: { value: string; precision: 'day' | 'month' | 'year' | 'season' } | null
  decade: number | null
  sport: Sport
  topics: QTopic[]
  entityIds: string[]
  source: SourceRef
  contested: boolean
}

/** one question as the master stores it — SERVER ONLY, it carries the answer */
export type MasterQuestion = {
  /** `q_` + hash of the natural key. Opaque, stable, persisted (rule 35). */
  id: string
  /** the natural key the id was hashed from — server side only */
  key: string
  template: string
  type: QType
  topic: QTopic
  tags: QTopic[]
  sport: Sport
  decades: number[]
  difficulty: Difficulty
  /** a league-round fixture: only Hard and Era runs deal it */
  deep?: true
  /** at most one per run from a capped group (rules 16–17) */
  capped?: string
  prompt: string
  quoteHe?: string
  quoteByHe?: string
  /**
   * mcq / year: the right option. multi: the three right options. tf: 'true' | 'false'.
   * order: the item labels in true order. match: the right-hand labels aligned with `left`.
   */
  answer: string | string[]
  /** distractor pool id (mcq / year / multi) — real values of the same kind */
  pool?: string
  /** fixed distractors — a written-down alternative set (calls) or a multi's wrong three */
  distractors?: string[]
  /** match: the left column, in the order it is shown */
  left?: string[]
  explanation: string
  hint: { kind: HintKind; he?: string }
  factIds: string[]
  source: SourceRef
}

/** what the client is dealt: no answer, no source, no key */
export type PublicQuestion = {
  id: string
  template: string
  type: QType
  topic: QTopic
  difficulty: Difficulty
  prompt: string
  quoteHe?: string
  quoteByHe?: string
  /** mcq / multi / year / tf options (tf: ['true','false']); order: the items, shuffled */
  options: string[]
  /** match: the left column */
  left?: string[]
  /** how many a multi wants */
  pickCount: number
  /** the hint kind — its text arrives only when it is paid for */
  hintKind: HintKind
}

export type AnswerValue = string | string[]

export type Verdict = {
  correct: boolean
  /** the right answer(s) in the shape of the type: options for mcq/multi/year/tf,
   *  the true order for `order`, the right column aligned to `left` for `match` */
  correctAnswers: string[]
  /** how many of the right answers the player had (multi: ticks; order/match: places) */
  hits: number
  explanation: string
  difficulty: Difficulty
}
