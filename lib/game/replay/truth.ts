import { isZone, type ZoneId } from '@/lib/game/goal-zones'
import {
  envelopeFor,
  type Envelope,
  type PrecisionId,
  type TruthTouch,
} from './envelope'
import { actorKindOf, type ActorKind } from './actors'
import { isReplayAction, type ReplayAction } from './vocab'

/**
 * מהמילים של הכתב אל הגאומטריה — the one pass that turns a match report into a shape.
 *
 * Nothing here decides where a player stood. It decides how much a SENTENCE leaves open,
 * and the answer to that is a table you can read: forty-five phrases, each mapped to one
 * precision tier, matched EXACTLY and never fuzzily.
 *
 * Exactly, because rule 74 is what happens otherwise. A substring lexicon over Hebrew
 * prose looks obviously right and is obviously wrong the third time it runs: "כ-30 מטר
 * מהשער, מרכז המגרש" contains both a stated distance and a named region, "אזור האגף,
 * מחוץ לרחבה" contains a flank and a box edge, and any ordering of those rules is a
 * decision nobody wrote down. A phrase table has no ordering to get wrong, and a touch
 * whose words are not in it is REPORTED rather than given a default — which is the same
 * shape as every other ingestion refusal in this repo.
 *
 * **The ball's destination is not a second guess.** For every touch but the last, the
 * target IS the next touch's origin: that is what the source says happened, in its own
 * structure, and inventing a separate anchor for it would be inventing the one thing
 * continuity is supposed to measure. For the last touch the target is the goal, because a
 * goal was scored. There is no third case, and a record whose last touch is not an
 * attempt on goal is rejected rather than bent into one.
 *
 * **And a named corner does not move the anchor.** Four records say "לפינה העליונה",
 * "לחיבורים", "לפינה השמאלית", "לפינה הרחוקה". Whose left, from which end, in a Hebrew
 * match report, is exactly the kind of resolution rule 11 forbids inventing — so the
 * words travel with the touch and print in the reveal, and the anchor stays the middle of
 * the mouth with the mouth as its envelope.
 */

export type GoalStepRecord = {
  step: number
  actorHe: string
  action: string
  zone: ZoneId
  positionHe: string
  noteHe: string
  /** optional, from the Match Master: whose touch it was. `./actors.ts` curates it until then. */
  actorKind?: ActorKind
  actorPlayerId?: string | null
}

export type GoalSourceRecord = {
  goalId: string
  titleHe: string
  subtitleHe: string
  playedOn: string
  competitionHe: string
  opponentHe: string
  scoreHe: string
  narrativeHe: string
  sequence: GoalStepRecord[]
  sourceTitle: string
  sourceUrl: string | null
  confidence?: number
}

/**
 * Every phrase a touch in `content/manual/goals.json` uses for WHERE, and the tier it is
 * read as. Forty-five entries for sixty-seven touches; `tests/replay.test.ts` asserts the
 * table and the archive agree in both directions, so a new goal either speaks a phrase
 * that is already here or forces somebody to decide what a new one means.
 */
export const POSITION_PRECISION: Readonly<Record<string, PrecisionId>> = {
  // a place the Laws paint
  'נקודת הפנדל': 'spot',
  'קו השער': 'line',

  // a stated distance from goal: the depth is pinned, the bearing is not
  'כ-8 מטרים מהשער': 'range',
  'כ-8 מטרים': 'range',
  'כ-10 מטרים': 'range',
  'כ-12 מטר מהשער': 'range',
  'כ-12 מטר': 'range',
  'כ-12 מטרים מהשער': 'range',
  'כ-12 מטרים': 'range',
  'כ-17 מטר מהשער': 'range',
  'מ-17 מטר': 'range',
  'כ-25 מטר מהשער': 'range',

  // a stated distance AND a side or a lane
  'כ-25 מטר, אלכסונית מצד ימין': 'rangeNamed',
  'כ-30 מטר מהשער, מרכז המגרש': 'rangeNamed',

  // one on one
  "מול השוער בוסניץ'": 'keeper',
  'מול השוער טרמל': 'keeper',
  'לבד מול השוער': 'keeper',
  'מול נויר': 'keeper',
  "מול דוידוביץ'": 'keeper',
  'מול אבי רן': 'keeper',
  'מקרוב': 'close',

  // the penalty area, in the source's own words
  'בתוך הרחבה': 'box',
  "בתוך רחבת צ'לסי": 'box',
  'חדירה לתוך הרחבה': 'box',
  'כניסה לרחבה': 'box',
  'צד שמאל של הרחבה, זווית קשה': 'boxSide',
  'זווית קשה משמאל': 'boxSide',
  'קצה הרחבה': 'boxEdge',
  'מחוץ לרחבה': 'boxEdge',
  'חדירה לעבר הרחבה': 'boxEdge',

  // a flank
  'אגף': 'flank',
  'אגף ימין': 'flank',
  'אל האגף': 'flank',
  'אזור האגף, מחוץ לרחבה': 'flank',
  'אגף / קו הרחבה': 'flank',

  // the middle, and the third
  'מרכז המגרש': 'centre',
  'מרכז המגרש קדימה': 'centre',
  'מרכז המגרש, קדימה': 'centre',
  'מרכז ההתקפה': 'centre',
  'מרכז, קדימה אל החלוץ': 'centre',
  'מתפרצת דרך המרכז': 'centre',
  'אזור ההתקפה': 'third',

  // in behind, and off the bottom of the board
  'מאחורי ההגנה': 'behind',
  'מרכז, מאחורי קו ההגנה': 'behind',
  'מרכז, חצי המגרש שלנו': 'ownHalf',
}

/** The two verbs that can end a goal. Anything else and the record is not a goal we can model. */
const FINISHES: readonly ReplayAction[] = ['shot', 'header']

export type TruthRejection = { goalId: string; step: number | null; reason: string; text: string }

export type TruthReading = {
  touches: TruthTouch[]
  rejections: TruthRejection[]
}

/**
 * Read one record into geometry, or say why it cannot be read.
 *
 * A rejection is never a silent drop: it carries the step, the reason and the raw text,
 * the same way every other refusal in this repo does (rule 11).
 */
export function readTruth(record: GoalSourceRecord): TruthReading {
  const rejections: TruthRejection[] = []
  const reject = (step: number | null, reason: string, text: string) => {
    rejections.push({ goalId: record.goalId, step, reason, text })
  }

  if (record.sequence.length < 2) {
    reject(null, 'too-short', String(record.sequence.length))
    return { touches: [], rejections }
  }

  const last = record.sequence[record.sequence.length - 1] as GoalStepRecord
  if (!isReplayAction(last.action) || !FINISHES.includes(last.action)) {
    reject(last.step, 'no-finish', last.action)
    return { touches: [], rejections }
  }

  const origins: Envelope[] = []
  for (const step of record.sequence) {
    if (!isReplayAction(step.action)) {
      reject(step.step, 'unknown-action', step.action)
      return { touches: [], rejections }
    }
    if (!isZone(step.zone)) {
      reject(step.step, 'unknown-zone', step.zone)
      return { touches: [], rejections }
    }
    const precision = POSITION_PRECISION[step.positionHe]
    if (!precision) {
      reject(step.step, 'unreadable-position', step.positionHe)
      return { touches: [], rejections }
    }
    const envelope = envelopeFor(step.zone, precision)
    if (!envelope) {
      reject(step.step, 'no-anchor', `${step.zone}/${precision}`)
      return { touches: [], rejections }
    }
    origins.push(envelope)
  }

  const goalEnvelope = envelopeFor(last.zone, 'goal')
  if (!goalEnvelope) {
    reject(last.step, 'no-goal-mouth', last.zone)
    return { touches: [], rejections }
  }

  const touches: TruthTouch[] = record.sequence.map((step, index) => {
    const final = index === record.sequence.length - 1
    const origin = origins[index] as Envelope
    return {
      step: step.step,
      actorHe: step.actorHe,
      actorKind: actorKindOf(record.goalId, step),
      action: step.action as ReplayAction,
      origin,
      target: final ? goalEnvelope : (origins[index + 1] as Envelope),
      targetFrom: final ? 'goal' : 'continuity',
      positionHe: step.positionHe,
      precision: POSITION_PRECISION[step.positionHe] as PrecisionId,
      noteHe: step.noteHe,
    }
  })

  return { touches, rejections }
}
