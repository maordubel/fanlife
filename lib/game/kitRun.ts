import 'server-only'

import { rng, shuffle } from './archive'
import { homeKits, seasonKits, type SeasonKit } from '@/lib/kit/seasons'
import { RUN_LENGTH } from './session'

/**
 * אתגר החולצה — twelve shirts, which season is each?
 *
 * The old gate 4 asked "who made this and who sponsored it" over a bare season label —
 * a form with two dropdowns. With 32 sourced season kits in the archive it can be the
 * question it should always have been: here is the SHIRT, drawn from the record, which
 * season is it. That is a football supporter's actual party trick.
 *
 * It runs on the shared session loop, so it escalates the same way trivia does. The
 * difficulty is derived rather than declared: a kit with a distinctive cut is easy, a
 * plain red shirt in a decade of plain red shirts is hard, because the only thing
 * separating them is the sponsor.
 */

export type KitQuestion = {
  id: string
  /** the drawn kit, WITHOUT its season label — that is the answer */
  spec: Omit<SeasonKit['spec'], 'seasonLabel'> & { seasonLabel: '' }
  noteHe: string
  options: string[]
  difficulty: 1 | 2 | 3 | 4 | 5
}

/** A cut nobody else wore is a giveaway; plain red in the plain-red years is not. */
function difficultyOf(kit: SeasonKit, all: SeasonKit[]): 1 | 2 | 3 | 4 | 5 {
  const sameCut = all.filter((other) => other.spec.pattern === kit.spec.pattern).length
  const hasSponsor = kit.spec.sponsorHe !== null
  if (sameCut === 1) return hasSponsor ? 1 : 2
  if (sameCut <= 3) return hasSponsor ? 2 : 3
  return hasSponsor ? 3 : 5
}

export function buildKitRound(seed: number): KitQuestion[] {
  const all = homeKits()
  const pool = seasonKits()
  const random = rng(seed)
  const labels = [...new Set(pool.map((kit) => kit.seasonLabel))]

  return shuffle([...all], random)
    .slice(0, RUN_LENGTH)
    .map((kit) => {
      const wrong = shuffle(
        labels.filter((label) => label !== kit.seasonLabel),
        random,
      ).slice(0, 3)
      const { seasonLabel: _label, ...rest } = kit.spec
      return {
        id: `kit:${kit.seasonLabel}`,
        spec: { ...rest, seasonLabel: '' as const },
        noteHe: kit.noteHe,
        options: shuffle([kit.seasonLabel, ...wrong], random),
        difficulty: difficultyOf(kit, all),
      }
    })
    .sort((a, b) => a.difficulty - b.difficulty)
}

export type KitVerdictRun = {
  correct: boolean
  answer: string
  noteHe: string
  difficulty: number
}

/** Graded on the server from the seed, like everything else. */
export function gradeKit(seed: number, index: number, answer: string): KitVerdictRun | null {
  const question = buildKitRound(seed)[index]
  if (!question) return null
  const truth = question.id.slice('kit:'.length)
  return {
    correct: answer === truth,
    answer: truth,
    noteHe: question.noteHe,
    difficulty: question.difficulty,
  }
}

export function kitRoundSize(): number {
  return homeKits().length
}
