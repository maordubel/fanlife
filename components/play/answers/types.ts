/**
 * התשובות — the shared contract of the six interaction types.
 *
 * Gate 2 plays all six; gates 12 and 13 are meant to reuse TrueFalse, OrderPicker,
 * PairMatcher and YearScale for their own dated cards. So the components know nothing
 * about trivia: they take options, report ONE committed answer through `onAnswer`, and
 * after grading they draw whatever `graded` says was right. They never learn an answer
 * before the player has committed (rule 4) — `graded` arrives from the server.
 */
export type AnswerValue = string | string[]

export type Graded = {
  correct: boolean
  /** mcq/year/tf: [the answer]; multi: the three; order: the true order; match: aligned to `left` */
  correctAnswers: string[]
}

export type AnswerProps = {
  options: string[]
  /** true while the answer is in flight or after it is graded */
  locked: boolean
  graded: Graded | null
  /** options a paid hint struck out */
  struck?: string[]
  onAnswer: (value: AnswerValue) => void
}
