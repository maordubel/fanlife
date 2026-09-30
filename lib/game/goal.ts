import 'server-only'

import goalsFile from '@/content/manual/goals.json'
import squadsFile from '@/content/manual/squads.json'
import { positionOf, takeFrom } from '@/lib/rotation/deck'
import { rng, shuffle } from './archive'
import { GOALS_PER_RUN, MAX_TOUCHES } from './goal-zones'
import { seasonLabelOf } from './seasons'
import {
  judgeReplay,
  type ReplayJudgement,
} from './replay/judge'
import { actorKindOf } from './replay/actors'
import { REPLAY_HOLDS, replayHeld } from './replay/holds'
import { readTruth, type GoalSourceRecord, type TruthRejection } from './replay/truth'
import type { Envelope, TruthTouch, UserTouch } from './replay/envelope'
import { isReplayAction } from './replay/vocab'

/**
 * שחזור השער — rebuild a real, sourced goal on the pitch, touch by touch.
 *
 * The honesty constraint the schema cannot carry: a match report says "מ-40 מטר ליד שער
 * 7", not a coordinate. Every record declares `approximateCoords`, every touch keeps the
 * reporter's own wording in `positionHe`, and from those words — and only from those
 * words — `lib/game/replay/truth.ts` derives an uncertainty ENVELOPE. A goal whose move no
 * source describes is simply not in the game; twelve were checked and dropped for exactly
 * that, and `content/manual/match-scorers.json` is not a way back in, because a scorer and
 * a minute are not a move (rule 77).
 *
 * Server authority, and it is stricter than it was. The old deal shipped the touch LIST —
 * who touched it and how, in order — and asked only where. That handed over the move's
 * whole skeleton: its length, its cast, its verbs. This one ships the fixture, a pool of
 * names, and nothing else. How many touches there were is part of the question.
 */

type GoalFile = { confidence: number; note: string; records: GoalSourceRecord[] }
type SquadFile = { records: Array<{ personName: string; seasonLabel: string }> }

const FLOOR = 2

/**
 * Everything in the archive that is sourced well enough, that the model can read, and
 * whose fixture is not in open conflict with the match archive (`./replay/holds.ts`).
 */
function records(): GoalSourceRecord[] {
  const file = goalsFile as unknown as GoalFile
  return file.records.filter(
    (record) =>
      (record.confidence ?? file.confidence) >= FLOOR &&
      !replayHeld(record.goalId) &&
      readTruth(record).rejections.length === 0,
  )
}

/** The records held out of play, each with the conflict that holds it. */
export function goalHolds(): Array<{ goalId: string; fields: readonly string[] }> {
  return Object.entries(REPLAY_HOLDS).map(([goalId, hold]) => ({ goalId, fields: hold.fields }))
}

/** Every record this gate refuses, with the step and the raw text that refused it. */
export function goalRejections(): TruthRejection[] {
  const file = goalsFile as unknown as GoalFile
  return file.records.flatMap((record) => readTruth(record).rejections)
}

export function goalCount(): number {
  return records().length
}

/**
 * Every playable goal as an id and the year it was scored — what THE WORKER LIFE may pin
 * (`/goal?g=` already carries the same id in a URL), and nothing of the move. The life
 * picks one from before its own year and the deal re-derives it with the existing pin.
 */
export function goalYears(): Array<{ id: string; year: number }> {
  return records()
    .map((record) => ({ id: record.goalId, year: Number(String(record.playedOn ?? '').slice(0, 4)) }))
    .filter((row) => Number.isFinite(row.year) && row.year > 0)
}

export function hasGoals(): boolean {
  return records().length >= GOALS_PER_RUN
}

/** `2010-08-18` → `2010/11`. August onwards belongs to the season that is starting. */
export function seasonOfDate(iso: string): string {
  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7))
  return seasonLabelOf(month >= 8 ? year : year - 1)
}

/**
 * The names a run offers, and why none of them is invented.
 *
 * The move's own actors go in first — they are the answer, and a pool that did not
 * contain them would be a trick. The rest are team-mates from `squads.json` for the
 * season the match was played in: real men who really were in that dressing room, at
 * confidence 2, never a name assembled for the occasion.
 *
 * **A squad name that shares a whole word with an actor is dropped.** `גילי ורמוט` and
 * `גיל ורמוט` are one man with two spellings, and so are `בן סהר`/`בן שהר`,
 * `סרגיי קלשצ'נקו`/`סרגיי קלשנקו`, `לאלה`/`מהראן לאלה`. Rule 64 §5 deleted family-name
 * bridging because it was ~50% wrong at CLAIMING two records are the same person; this is
 * the same test pointed the other way, where the errors land on the safe side — an
 * over-suppression costs one distractor, an under-suppression puts the same footballer in
 * the pool twice and makes the whole list look made up.
 */
/**
 * **And only NAMED men, with the other side marked as the other side.** An unnamed actor
 * (`הכדור`) is not a person to pick, so it never enters the pool — the judge gives that
 * touch no player component instead. An opponent (a keeper's parry) is a real, named
 * touch, so he IS offered, and flagged in `opponents` so the chip can say so rather than
 * sitting among the season's squad as if he had played in it (`./replay/actors.ts`).
 */
function poolFor(
  record: GoalSourceRecord,
  seed: number,
  size = 7,
): { pool: string[]; opponents: string[] } {
  const actors: string[] = []
  const opponents: string[] = []
  for (const step of record.sequence) {
    const kind = actorKindOf(record.goalId, step)
    if (kind === 'unnamed') continue
    if (!actors.includes(step.actorHe)) actors.push(step.actorHe)
    if (kind === 'opponent' && !opponents.includes(step.actorHe)) opponents.push(step.actorHe)
  }

  const season = seasonOfDate(record.playedOn)
  const words = new Set(actors.flatMap((name) => name.split(/\s+/).filter(Boolean)))
  const squad = (squadsFile as unknown as SquadFile).records
    .filter((row) => row.seasonLabel === season)
    .map((row) => row.personName)
    .filter((name) => !actors.includes(name))
    .filter((name) => !name.split(/\s+/).some((word) => words.has(word)))

  const unique = [...new Set(squad)].sort()
  const fill = shuffle(unique, rng(seed + record.goalId.length * 31 + record.sequence.length))
  const pool = [...actors, ...fill.slice(0, Math.max(0, size - actors.length))]
  // shuffled once more so the answer is never the head of the list
  return { pool: shuffle(pool, rng(seed * 7 + record.playedOn.length)), opponents }
}

/** A pin as the URL may carry it: a goal id and nothing else. */
const PIN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** The playable goal a pin names, or null — an unknown or held pin is simply ignored. */
export function pinnedGoal(pin: string | null | undefined): string | null {
  if (typeof pin !== 'string' || pin.length > 64 || !PIN.test(pin)) return null
  return records().some((record) => record.goalId === pin) ? pin : null
}

/**
 * The three goals of a run, shortest move first.
 *
 * "Shortest" is still the difficulty ramp, and it is no longer a leak: the player is not
 * told the count, so a shorter move is simply a shorter move to find.
 *
 * **A pin deals one named goal as goal 1 of an otherwise normal run** (`/goal?g=<goalId>`,
 * which is how the archive's "rebuild this goal" hands a supporter in). The other two are
 * the seeded slice's, shortest first; if the pinned goal was already in the slice it is
 * moved to the front, otherwise the slice's longest move makes room. Every server action
 * re-derives the deal with the same pin, or it would grade a different goal from the one
 * on screen.
 */
function drawn(seed: number, cursor: number, pin?: string | null): GoalSourceRecord[] {
  const all = records()
  const at = positionOf(seed, cursor, all.length, GOALS_PER_RUN)
  const deck = shuffle(all, rng(at.seed))
  const picked = takeFrom(deck, at.slot * GOALS_PER_RUN, GOALS_PER_RUN).sort(
    (a, b) => a.sequence.length - b.sequence.length,
  )
  const id = pinnedGoal(pin)
  const pinned = id ? all.find((record) => record.goalId === id) : undefined
  if (!pinned) return picked
  const rest = picked.filter((record) => record.goalId !== pinned.goalId)
  return [pinned, ...rest.slice(0, GOALS_PER_RUN - 1)]
}

/**
 * What the client is allowed to see before it commits: the fixture, and a room full of
 * names. Not the cast, not the verbs, not the order, and not how many.
 */
export type GoalChallenge = {
  goalId: string
  titleHe: string
  subtitleHe: string
  competitionHe: string
  opponentHe: string
  scoreHe: string
  seasonLabel: string
  approximateCoords: true
  pool: string[]
  /** the names in `pool` that played for the OTHER side — a keeper's parry, say */
  opponents: string[]
}

export function dealRun(seed: number, cursor = 0, pin?: string | null): GoalChallenge[] {
  return drawn(seed, cursor, pin).map((record) => ({
    goalId: record.goalId,
    titleHe: record.titleHe,
    subtitleHe: record.subtitleHe,
    competitionHe: record.competitionHe,
    opponentHe: record.opponentHe,
    scoreHe: record.scoreHe,
    seasonLabel: seasonOfDate(record.playedOn),
    approximateCoords: true as const,
    ...poolFor(record, seed + cursor),
  }))
}

export type GoalHint = 'start' | 'count'

/**
 * A hint is a piece of the answer, so it comes from here and it is paid for.
 *
 * `start` gives the reporter's own words for where the move began — the wording, never
 * the zone. `count` gives how many touches the source describes. Neither reveals the
 * cast, the verbs or the order, which is what "a hint must never silently reveal the
 * whole solution" means in practice.
 */
export function goalHint(
  seed: number,
  goalIndex: number,
  which: GoalHint,
  cursor = 0,
  pin?: string | null,
): string | null {
  const record = drawn(seed, cursor, pin)[goalIndex]
  if (!record) return null
  if (which === 'count') return String(record.sequence.length)
  if (which === 'start') return record.sequence[0]?.positionHe ?? null
  return null
}

/** Three decimals is a tenth of a unit on a 300-unit board: the shape, and not a digit more. */
function rounded(value: number): number {
  return Math.round(value * 1000) / 1000
}

/**
 * איפה הוא קיבל — the third hint, and the only one drawn on the pitch.
 *
 * It answers "where did touch k begin?" for the touch the player is building now, and it
 * answers with the ENVELOPE — the anchor AND the radii the reporter's words allow — never
 * with a bare point, because a point would claim a precision the archive does not hold
 * and would hand over the one coordinate the envelope exists to keep honest. Past the
 * archive's own last touch it answers for the last touch rather than refusing, so asking
 * for touch five of a three-touch move does not leak the count either.
 *
 * Nothing else crosses: not the man, not the verb, not the words. One per goal, paid,
 * and it never updates itself — the client draws exactly what it bought.
 */
export function receptionHint(
  seed: number,
  goalIndex: number,
  touchIndex: number,
  cursor = 0,
  pin?: string | null,
): Envelope | null {
  if (!Number.isInteger(touchIndex) || touchIndex < 0) return null
  const record = drawn(seed, cursor, pin)[goalIndex]
  if (!record) return null
  const { touches } = readTruth(record)
  const touch = touches[Math.min(touchIndex, touches.length - 1)]
  if (!touch) return null
  const { x, y, rx, ry } = touch.origin
  return { x: rounded(x), y: rounded(y), rx: rounded(rx), ry: rounded(ry) }
}

export type GoalVerdict = ReplayJudgement & {
  goalId: string
  truth: TruthTouch[]
  narrativeHe: string
  sourceTitle: string
  sourceUrl: string | null
}

/** At most five touches, and every name has to come from the pool the deal handed out. */
function clean(point: { x: number; y: number }): { x: number; y: number } | null {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null
  // the board carries air above the goal line, so y runs a little below zero
  return { x: Math.max(0, Math.min(1, point.x)), y: Math.max(-0.2, Math.min(1, point.y)) }
}

export function gradeGoal(
  seed: number,
  goalIndex: number,
  touches: UserTouch[],
  cursor = 0,
  pin?: string | null,
): GoalVerdict | null {
  const record = drawn(seed, cursor, pin)[goalIndex]
  if (!record) return null
  const reading = readTruth(record)
  if (reading.rejections.length > 0) return null

  // Never trust the shape that came back over the wire: a name that was not offered, an
  // action that is not a verb, a coordinate that is not a number, or a sixth touch.
  const pool = new Set(poolFor(record, seed + cursor).pool)
  const safe: UserTouch[] = []
  const sent = Array.isArray(touches) ? touches : []
  for (const touch of sent.slice(0, MAX_TOUCHES)) {
    if (!touch || !pool.has(touch.actorHe) || !isReplayAction(touch.action)) continue
    const origin = clean(touch.origin)
    const target = clean(touch.target)
    if (!origin || !target) continue
    safe.push({ actorHe: touch.actorHe, action: touch.action, origin, target })
  }

  return {
    ...judgeReplay(safe, reading.touches),
    goalId: record.goalId,
    truth: reading.touches,
    narrativeHe: record.narrativeHe,
    sourceTitle: record.sourceTitle,
    sourceUrl: record.sourceUrl,
  }
}
