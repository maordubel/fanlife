/**
 * שפת המגע — the seven things a player can do to a ball, and how close any two of them are.
 *
 * Gate 8 used to carry four verbs (`pass` `dribble` `cross` `shot`) because four were
 * enough to label a zone. They were not enough to describe a MOVE: the record for the
 * championship goal called Harush's parry a `pass`, and the record for בן סהר's winner in
 * Salzburg called a header a `shot`. Both are small lies of exactly the kind rule 11
 * exists to stop — the reporter wrote "הדיפה" and "נגיחה", and the file said something
 * else.
 *
 * So the vocabulary is seven, and every touch's verb is re-read from the reporter's own
 * word in `noteHe` rather than assigned. The two new ones are not decoration: a parry and
 * a header are the two touches in this archive that a four-verb vocabulary had nowhere to
 * put.
 *
 * `actionSimilarity` is the other half. A cross graded as "not a pass" is graded by
 * spelling; a cross IS a pass, played wide and high, and a player who says so has
 * understood the move even if they have not named it. The table is small and every pair
 * in it is a football claim somebody could argue with — which is the point of writing it
 * down rather than hiding it in a distance function.
 */

export const REPLAY_ACTIONS = [
  'pass',
  'throughBall',
  'cross',
  'dribble',
  'shot',
  'header',
  'save',
] as const

export type ReplayAction = (typeof REPLAY_ACTIONS)[number]

export function isReplayAction(value: string): value is ReplayAction {
  return (REPLAY_ACTIONS as readonly string[]).includes(value)
}

/** The message key for a verb, long form — the builder's own buttons. */
export function actionKey(action: ReplayAction): string {
  return `goal.action.${action}`
}

/** The message key for a verb, short form — the ticket under a figure on the pitch. */
export function actionShortKey(action: ReplayAction): string {
  return `goal.act.${action}`
}

/**
 * How much credit a wrong verb still earns, 0–100.
 *
 * Every pair here is a pair a supporter could reasonably confuse because the two things
 * really do overlap on a pitch. Nothing transitive is inferred: `cross`≈`pass` and
 * `pass`≈`throughBall` does not make `cross`≈`throughBall` worth 55, because a cross and
 * a ball slid through a back four are not the same idea at all.
 */
const NEIGHBOURS: ReadonlyArray<readonly [ReplayAction, ReplayAction, number]> = [
  ['pass', 'throughBall', 55], // both are a ball played to a team-mate; one is played in behind
  ['pass', 'cross', 40], // a cross is a pass, wide and high
  ['pass', 'header', 30], // ערן זהבי's הארכה בראש is a pass made with the head
  ['cross', 'throughBall', 25], // both leave the ball in front of a runner, from different places
  ['shot', 'header', 45], // both are an attempt on goal; only the body part differs
  ['dribble', 'pass', 15], // carrying it and releasing it are the two halves of the same decision
]

export function actionSimilarity(a: ReplayAction, b: ReplayAction): number {
  if (a === b) return 100
  const pair = NEIGHBOURS.find(
    ([one, two]) => (one === a && two === b) || (one === b && two === a),
  )
  return pair ? pair[2] : 0
}
