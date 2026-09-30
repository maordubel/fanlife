import { alignSequences, type AlignedPair } from './align'
import {
  anchorScore,
  envelopeScore,
  type ReplayPoint,
  type TruthTouch,
  type UserTouch,
} from './envelope'
import type { ActorKind } from './actors'
import { actionSimilarity, type ReplayAction } from './vocab'

/**
 * השופט החכם — grading that understands a near miss as a near miss.
 *
 * The old verdict had three words: bull, one zone out, somewhere else. It could not say
 * "you had the right man doing the right thing from the right place and you sent the ball
 * to the wrong one", which is the sentence a supporter who nearly remembered the move
 * needs to hear. So a touch is scored on six things at once, and every one of them is
 * football rather than arithmetic:
 *
 *   · **who** — 24%. The heaviest single component, because a move is people.
 *   · **what** — 18%, with partial credit from `actionSimilarity`: a cross called a pass
 *     is a cross called by a wider name, not ignorance.
 *   · **from where** — 22%, read against the ENVELOPE. Inside the envelope is right,
 *     because inside the envelope the archive does not know better.
 *   · **to where** — 24%. The destination is where a reconstruction usually goes wrong.
 *   · **precision** — 12%, split 5/7 between the two anchors and measured at HALF the
 *     envelope's radii. The minority share on purpose: it is the only part of the score
 *     that rewards the middle over the region, and the moment it outweighs the envelope
 *     this gate is back to grading an invented coordinate.
 *
 * On top of the matched touches, four things about the move as a whole: the alignment's
 * own quality, the shape of the routes, continuity, and the price of having too many or
 * too few touches. Those are the parts a positional compare could never see.
 */

export type TouchGrade = 'good' | 'near' | 'bad'

export type TouchVerdict = {
  kind: 'matched' | 'extra' | 'missing'
  userIndex: number | null
  truthIndex: number | null
  score: number
  grade: TouchGrade
  /** null where the source names nobody for this touch — see `./actors.ts` */
  playerRight: boolean | null
  actionRight: boolean
  actionScore: number
  originScore: number
  targetScore: number
  /** null where the source states no direction for this touch — see `routeShape` */
  routeScore: number | null
  userActorHe: string | null
  userAction: ReplayAction | null
  truthActorHe: string | null
  /** whose touch the archive says it was; null on a touch the player invented */
  truthActorKind: ActorKind | null
  truthAction: ReplayAction | null
  positionHe: string | null
  noteHe: string | null
}

export type ReplayMetrics = {
  /** 0–100, the number the reveal leads with */
  overall: number
  sequence: number
  /** null when no touch in the move has an actor the source names */
  players: number | null
  actions: number
  /** null when no touch in the move has a direction the source states */
  routes: number | null
  continuity: number
  extra: number
  missing: number
}

export type ReplayJudgement = {
  metrics: ReplayMetrics
  touches: TouchVerdict[]
}

const WEIGHT = {
  player: 0.24,
  action: 0.18,
  origin: 0.22,
  target: 0.24,
  originAnchor: 0.05,
  targetAnchor: 0.07,
} as const

/**
 * The line between "good" and "near", and the line a move has to clear to be COLLECTED.
 * One number, because a touch the reveal calls good and a move the collection keeps are
 * the same claim about the player's memory at two sizes.
 */
export const GOOD_SCORE = 78

/** How far apart two normalised points may be before continuity is worth nothing. */
const CONTINUITY_REACH = 0.25

/**
 * Under this, a route has no direction to compare.
 *
 * Five records in this archive put two consecutive touches in the same zone — ורמוט
 * winning the rebound where he shoots it, שכטר going round נויר where he rolls it in.
 * The source does not state that the ball travelled, so the truth's route there is a
 * point, and scoring a player 100 for matching a direction nobody stated would be the
 * envelope mistake in a different costume. Those touches are left OUT of the route
 * average instead.
 */
const ROUTE_FLOOR = 0.02

function span(from: ReplayPoint, to: ReplayPoint): { dx: number; dy: number; len: number } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return { dx, dy, len: Math.hypot(dx, dy) }
}

/**
 * Direction and length, 0–100, or null where the source states no direction.
 *
 * Direction carries three quarters of it: a ball played forward when the report says
 * forward is most of being right about a route, and a player who is short by five metres
 * on a twenty-metre pass has still seen the move.
 */
export function routeShape(user: UserTouch, truth: TruthTouch): number | null {
  const t = span(truth.origin, truth.target)
  if (t.len < ROUTE_FLOOR) return null
  const u = span(user.origin, user.target)
  if (u.len < ROUTE_FLOOR) return 0
  const cos = Math.max(-1, Math.min(1, (u.dx * t.dx + u.dy * t.dy) / (u.len * t.len)))
  const angle = (cos + 1) / 2
  const length = Math.min(u.len, t.len) / Math.max(u.len, t.len)
  return 100 * (angle * 0.74 + length * 0.26)
}

/**
 * Whether the player's pick can be marked right or wrong at all.
 *
 * `null` for a touch the report writes with no actor ("הכדור עבר את ההגנה"): there is no
 * man to have remembered, so there is no man to be marked wrong about — and a zero there
 * would charge the player for a gap in the SOURCE. Same pattern as `routeShape`.
 */
export function playerMatch(user: UserTouch, truth: TruthTouch): boolean | null {
  if (truth.actorKind === 'unnamed') return null
  return user.actorHe === truth.actorHe
}

/**
 * What one matched touch is worth, 0–100.
 *
 * Where the player component is null its 24% is not handed to any ONE other part — the
 * remaining five are scaled up together, so a perfect rebuild of an unnamed touch is still
 * a hundred and every other ratio in the pair stays what it was.
 */
export function pairScore(user: UserTouch, truth: TruthTouch): number {
  const player = playerMatch(user, truth)
  const action = actionSimilarity(user.action, truth.action)
  const origin = envelopeScore(user.origin, truth.origin)
  const target = envelopeScore(user.target, truth.target)
  const rest =
    action * WEIGHT.action +
    origin * WEIGHT.origin +
    target * WEIGHT.target +
    anchorScore(user.origin, truth.origin) * WEIGHT.originAnchor +
    anchorScore(user.target, truth.target) * WEIGHT.targetAnchor
  if (player === null) return rest / (1 - WEIGHT.player)
  return (player ? 100 : 0) * WEIGHT.player + rest
}

/**
 * Continuity — whether the player's own move joins up.
 *
 * Touch N's destination against touch N+1's origin, which is the question the brief asks
 * in exactly those words. It is scored on the PLAYER's reconstruction rather than against
 * the archive's, because the archive's is continuous by construction: `readTruth` derives
 * every target but the last from the next origin, so comparing to it would be comparing
 * to the constant 100.
 *
 * A single-touch move has nothing to join and scores full, which is why a move is at
 * least two touches.
 */
export function continuityOf(touches: readonly UserTouch[]): number {
  if (touches.length < 2) return 100
  let total = 0
  for (let i = 0; i < touches.length - 1; i += 1) {
    const here = touches[i] as UserTouch
    const next = touches[i + 1] as UserTouch
    const gap = Math.hypot(next.origin.x - here.target.x, next.origin.y - here.target.y)
    total += 100 * Math.max(0, 1 - gap / CONTINUITY_REACH)
  }
  return total / (touches.length - 1)
}

function gradeOf(score: number): TouchGrade {
  if (score >= GOOD_SCORE) return 'good'
  if (score >= 50) return 'near'
  return 'bad'
}

/** What one touch costs the move for being invented or forgotten. */
const COUNT_PENALTY = 7

export function judgeReplay(
  user: readonly UserTouch[],
  truth: readonly TruthTouch[],
): ReplayJudgement {
  const alignment: AlignedPair<UserTouch, TruthTouch>[] = alignSequences(user, truth, pairScore)

  const verdicts: TouchVerdict[] = []
  const routes: number[] = []
  let matchedScore = 0
  let players = 0
  let actions = 0
  let extra = 0
  let missing = 0

  for (const pair of alignment) {
    if (pair.left !== null && pair.right !== null) {
      const u = user[pair.left] as UserTouch
      const t = truth[pair.right] as TruthTouch
      const route = routeShape(u, t)
      if (route !== null) routes.push(route)
      const score = pair.score
      const who = playerMatch(u, t)
      matchedScore += score
      if (who === true) players += 1
      if (u.action === t.action) actions += 1
      verdicts.push({
        kind: 'matched',
        userIndex: pair.left,
        truthIndex: pair.right,
        score,
        grade: gradeOf(score),
        playerRight: who,
        actionRight: u.action === t.action,
        actionScore: actionSimilarity(u.action, t.action),
        originScore: envelopeScore(u.origin, t.origin),
        targetScore: envelopeScore(u.target, t.target),
        routeScore: route,
        userActorHe: u.actorHe,
        userAction: u.action,
        truthActorHe: t.actorHe,
        truthActorKind: t.actorKind ?? 'player',
        truthAction: t.action,
        positionHe: t.positionHe,
        noteHe: t.noteHe,
      })
      continue
    }
    if (pair.left !== null) {
      const u = user[pair.left] as UserTouch
      extra += 1
      verdicts.push({
        kind: 'extra',
        userIndex: pair.left,
        truthIndex: null,
        score: 0,
        grade: 'near',
        playerRight: false,
        actionRight: false,
        actionScore: 0,
        originScore: 0,
        targetScore: 0,
        routeScore: null,
        userActorHe: u.actorHe,
        userAction: u.action,
        truthActorHe: null,
        truthActorKind: null,
        truthAction: null,
        positionHe: null,
        noteHe: null,
      })
      continue
    }
    const t = truth[pair.right as number] as TruthTouch
    missing += 1
    verdicts.push({
      kind: 'missing',
      userIndex: null,
      truthIndex: pair.right,
      score: 0,
      grade: 'bad',
      playerRight: false,
      actionRight: false,
      actionScore: 0,
      originScore: 0,
      targetScore: 0,
      routeScore: null,
      userActorHe: null,
      userAction: null,
      truthActorHe: t.actorHe,
      truthActorKind: t.actorKind ?? 'player',
      truthAction: t.action,
      positionHe: t.positionHe,
      noteHe: t.noteHe,
    })
  }

  const denominator = Math.max(1, Math.max(user.length, truth.length))
  const sequence = Math.max(0, Math.min(100, matchedScore / denominator))
  // only the touches the source puts a name to can be counted for or against the player
  const named = truth.filter((touch) => touch.actorKind !== 'unnamed').length
  const playerPct = named > 0 ? (players / named) * 100 : null
  const actionPct = truth.length > 0 ? (actions / truth.length) * 100 : 0
  const routePct = routes.length > 0 ? routes.reduce((a, b) => a + b, 0) / routes.length : null
  const continuity = continuityOf(user)

  // Where no touch in the move has a stated direction, the route share is not redistributed
  // to some other component — it goes back to the alignment, which is the only part of the
  // grade that is unambiguously about the whole move.
  // The same goes for the player share of a move in which the source names nobody.
  const routeWeight = routePct === null ? 0 : 0.16
  const playerWeight = playerPct === null ? 0 : 0.12
  const sequenceWeight = 0.46 + (routePct === null ? 0.16 : 0) + (playerPct === null ? 0.12 : 0)

  const overall = Math.max(
    0,
    Math.min(
      100,
      sequence * sequenceWeight +
        (routePct ?? 0) * routeWeight +
        continuity * 0.14 +
        (playerPct ?? 0) * playerWeight +
        actionPct * 0.12 -
        (extra + missing) * COUNT_PENALTY,
    ),
  )

  return {
    metrics: {
      overall: Math.round(overall),
      sequence: Math.round(sequence),
      players: playerPct === null ? null : Math.round(playerPct),
      actions: Math.round(actionPct),
      routes: routePct === null ? null : Math.round(routePct),
      continuity: Math.round(continuity),
      extra,
      missing,
    },
    touches: verdicts,
  }
}
