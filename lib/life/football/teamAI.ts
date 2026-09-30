/**
 * הצורה — twenty-two players who look like a team rather than twenty-two who chase a ball.
 *
 * This is the positional layer: where a man stands when the ball is somewhere else. It is
 * the half of football AI that decides whether a still frame reads as a match, and it is
 * deliberately built out of one idea rather than out of a behaviour tree — every player
 * has a home anchor from the formation, and the whole shape SLIDES toward the ball and
 * COMPRESSES behind it. Real teams do exactly that and it is why a defensive line looks
 * like a line.
 *
 * Three modifiers on top, each one line, each visible on screen:
 *
 *  · the nearest man to the ball leaves the shape and goes to it (one presser, never four);
 *  · a side in possession pushes up, a side out of possession drops off;
 *  · attackers stretch wide when their own team has it and tuck in when it does not.
 *
 * The decision layer — timed runs, marking assignments, passing lanes opened on purpose,
 * a coordinated press — is Δ48. What is here is complete for what it claims to do, and
 * what it claims to do is hold a believable shape.
 */
import { anchorFor, FORMATIONS } from './formations'
import { clamp, dist, HALF_LENGTH, HALF_WIDTH } from './pitch'
import { arrive } from './players'
import type { BallState, Direction, FormationId, PlayerState, Side, Vec2 } from './types'

export type TeamContext = {
  side: Side
  direction: Direction
  formation: FormationId
  /** true when this side has the ball */
  attacking: boolean
  /** the id of the one man this side has sent to the ball */
  presserId: string | null
}

/**
 * Which of a side's players goes to the ball.
 *
 * One, chosen by distance with a small bias toward whoever is already facing it, so the
 * choice does not flicker between two men standing together. A flickering presser is the
 * single ugliest thing a football AI can do on screen.
 */
export function choosePresser(
  team: PlayerState[],
  ball: BallState,
  previousId: string | null,
  excludeId: string | null = null,
): string | null {
  const ballFlat = { x: ball.p.x, z: ball.p.z }
  let best: PlayerState | null = null
  let bestScore = Infinity
  for (const player of team) {
    if (player.role === 'GK') continue
    if (player.recover > 0) continue
    // the man the human is moving is not available to the AI — otherwise a player who
    // stands still leaves his whole team standing still with him
    if (player.id === excludeId) continue
    const d = dist(player.p, ballFlat)
    const stickiness = player.id === previousId ? -2.2 : 0
    const score = d + stickiness
    if (score >= bestScore) continue
    best = player
    bestScore = score
  }
  return best?.id ?? null
}

/** Where this player wants to be, this tick. */
export function shapeTarget(player: PlayerState, ball: BallState, context: TeamContext): Vec2 {
  const formation = FORMATIONS[context.formation]
  const slot = formation.slots[player.slot] ?? formation.slots[0]
  if (!slot) return player.p
  const anchor = anchorFor(slot, context.direction)

  const ballX = ball.p.x
  const ballZ = ball.p.z

  // the whole block slides across with the ball, but never all the way — a back four
  // that follows the ball to the touchline is a back four with a hole in it
  const slideZ = clamp(ballZ * 0.42, -HALF_WIDTH * 0.45, HALF_WIDTH * 0.45)

  // and up and down the pitch with it, more for the front players than the back ones
  const depth = slot.x
  const pushX = clamp((ballX - anchor.x) * (0.2 + depth * 0.45), -26, 26)

  /**
   * Possession moves the whole line — but not by the same amount at every station.
   *
   * The first version pushed everybody up by a flat seven metres, and the consequence was
   * measurable rather than aesthetic: no carrier in a three-minute run ever got within
   * twenty-eight metres of a goal, because the furthest forward player the shape allowed
   * was still thirty-three metres out and there was nobody to pass to beyond him. A
   * striker pushes up nearly twenty metres when his side has the ball and a centre half
   * pushes up four, which is what a team actually looks like and what puts somebody in
   * shooting range.
   */
  const possessionShift = (context.attacking ? 4 + depth * 22 : -6 - depth * 4) * context.direction

  const wide = slot.z
  const stretch = context.attacking ? 1.12 : 0.84

  return {
    x: clamp(anchor.x + pushX + possessionShift, -HALF_LENGTH + 2, HALF_LENGTH - 2),
    z: clamp(anchor.z * stretch + slideZ, -HALF_WIDTH + 1.5, HALF_WIDTH - 1.5) * (wide === 0 ? 1 : 1),
  }
}

/** The steering vector for a player who is not the presser and does not have the ball. */
export function offBallMove(player: PlayerState, ball: BallState, context: TeamContext): Vec2 {
  const target = shapeTarget(player, ball, context)
  return arrive(player.p, target, 5)
}

/** How fast an off-ball player travels — walking back into shape, running to close a gap. */
export function offBallEffort(player: PlayerState, ball: BallState, context: TeamContext): number {
  const target = shapeTarget(player, ball, context)
  const gap = dist(player.p, target)
  return clamp(gap / 12, 0.28, 1)
}
