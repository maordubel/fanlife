import 'server-only'

import { archive, rng, shuffle } from './archive'
import { RUN_LENGTH } from './session'

/**
 * שער 7 — הסמל לאורך השנים.
 *
 * Gate 7 used to point at `/kits`, the same screen as gate 5. Two gates onto one room
 * is a defect, and Maor's crest images are what it should have been all along: the club
 * has NINE named crest stages on its own history page, and two of them turn on facts a
 * supporter would argue about in a bar —
 *
 *   · the badge said **1927** until 2015 and **1923** after it, because two fans,
 *     Dr Eyal Gertman and Kfir Frankel, found Avraham Eshni's membership card no. 2
 *     dated 3.10.1923 in the Wingate archive;
 *   · the sponsor's name sat INSIDE the crest from 2001 to 2007, which almost no club
 *     anywhere has ever done.
 *
 * So the round mixes three shapes over the same nine rows: which era is this crest,
 * which year was on the badge then, and what changed at this stage. Where a stage has a
 * photographed variant the question shows the picture; where it does not, the question
 * is asked in words rather than illustrated with a borrowed one.
 */

export type CrestQuestion = {
  id: string
  kind: 'era' | 'year' | 'change'
  /** the cut-out variant to print, when the question has one */
  imageKey: string | null
  /** the years of the stage — printed big when there is no picture */
  eraHe: string
  promptHe: string
  options: string[]
  difficulty: 1 | 2 | 3 | 4 | 5
}

type Row = (typeof archive.crests)[number]

function label(row: Row): string {
  return row.toYear === null ? `${row.fromYear}—היום` : `${row.fromYear}—${row.toYear}`
}

function answerOf(row: Row, kind: CrestQuestion['kind']): string {
  if (kind === 'era') return row.nameHe
  if (kind === 'year') return row.yearOnBadge === null ? 'לא הופיעה שנה' : String(row.yearOnBadge)
  return row.changeHe ?? row.nameHe
}

function build(seed: number): { question: CrestQuestion; answer: string }[] {
  const rows = archive.crests
  const random = rng(seed)
  const out: { question: CrestQuestion; answer: string }[] = []

  for (const row of rows) {
    const eras = rows.map((other) => other.nameHe)
    const years = ['1923', '1927', 'לא הופיעה שנה', '1926']
    const changes = rows.map((other) => other.changeHe ?? other.nameHe)

    // 1 · which stage is this, shown as a picture when there is one
    if (row.imageKey) {
      out.push({
        question: {
          id: `crest-era:${row.fromYear}`,
          kind: 'era',
          imageKey: row.imageKey,
          eraHe: label(row),
          promptHe: 'איזה שלב בסמל זה?',
          options: withOthers(row.nameHe, eras, random),
          difficulty: 3,
        },
        answer: row.nameHe,
      })
    }

    // 2 · which year the badge carried — the best question in the set
    out.push({
      question: {
        id: `crest-year:${row.fromYear}`,
        kind: 'year',
        imageKey: row.imageKey,
        eraHe: label(row),
        promptHe: `איזו שנת ייסוד הופיעה בסמל בשנים ${label(row)}?`,
        options: withOthers(answerOf(row, 'year'), years, random),
        difficulty: row.yearOnBadge === null ? 4 : 2,
      },
      answer: answerOf(row, 'year'),
    })

    // 3 · what changed at this stage
    if (row.changeHe) {
      out.push({
        question: {
          id: `crest-change:${row.fromYear}`,
          kind: 'change',
          imageKey: null,
          eraHe: String(row.fromYear),
          promptHe: `מה השתנה בסמל בשנת ${row.fromYear}?`,
          options: withOthers(row.changeHe, changes, random),
          difficulty: 4,
        },
        answer: row.changeHe,
      })
    }
  }
  return out
}

/** Four real options, never padded — the same rule every other gate follows. */
function withOthers(correct: string, pool: string[], random: () => number): string[] {
  const others = shuffle(
    [...new Set(pool)].filter((value) => value !== correct),
    random,
  ).slice(0, 3)
  return shuffle([correct, ...others], random)
}

export function buildCrestRound(seed: number): CrestQuestion[] {
  const random = rng(seed * 31 + 7)
  return shuffle(build(seed), random)
    .filter((item) => new Set(item.question.options).size === 4)
    .slice(0, RUN_LENGTH)
    .map((item) => item.question)
    .sort((a, b) => a.difficulty - b.difficulty)
}

export type CrestVerdict = {
  correct: boolean
  answer: string
  noteHe: string
  difficulty: number
}

export function gradeCrest(seed: number, index: number, answer: string): CrestVerdict | null {
  const random = rng(seed * 31 + 7)
  const all = shuffle(build(seed), random).filter(
    (item) => new Set(item.question.options).size === 4,
  )
  const ordered = all
    .slice(0, RUN_LENGTH)
    .sort((a, b) => a.question.difficulty - b.question.difficulty)
  const item = ordered[index]
  if (!item) return null
  const row = archive.crests.find(
    (candidate) => String(candidate.fromYear) === item.question.id.split(':')[1],
  )
  return {
    correct: answer === item.answer,
    answer: item.answer,
    noteHe: row?.noteHe ?? '',
    difficulty: item.question.difficulty,
  }
}

export function crestStageCount(): number {
  return archive.crests.length
}
