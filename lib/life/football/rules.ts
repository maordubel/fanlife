/**
 * החוקים — goal, out of play, and the restart that follows.
 *
 * Only what a sixty-second reconstruction actually needs: a goal, a throw, a corner, a
 * goal kick and a kickoff. Offside and fouls are architecturally welcome — a restart is
 * already a kind, a side and a spot, so a free kick is data rather than a new system —
 * and they are deliberately not simulated yet, because a half-built offside line ruins
 * more sequences than it saves.
 *
 * The one rule that is not obvious: a ball that leaves play is resolved from WHO TOUCHED
 * IT LAST, not from which half it was in. That is why `lastTouch` is carried on the state
 * at all, and it is the difference between a corner and a goal kick.
 */
import { HALF_LENGTH, HALF_WIDTH, cornerSpot, goalKickSpot, throwSpot } from './pitch'
import type { BallState, Direction, RestartKind, RestartState, Side, Vec2 } from './types'

export type OutOfPlay = {
  kind: RestartKind
  /** the side that gets to take it */
  side: Side
  at: Vec2
}

/**
 * Resolve a ball that has left the field.
 *
 * `lastTouchSide` is who put it out; the restart goes to the other side. Over a goal line
 * it is a corner if the defending side put it out and a goal kick if the attacking side
 * did — which is the same sentence as the laws of the game, and it is why this reads as
 * one expression rather than four branches.
 */
export function resolveOutOfPlay(
  ball: BallState,
  lastTouchSide: Side,
  directionOf: Record<Side, Direction>,
): OutOfPlay | null {
  const other: Side = lastTouchSide === 'home' ? 'away' : 'home'

  if (Math.abs(ball.p.z) > HALF_WIDTH) {
    return { kind: 'throw', side: other, at: throwSpot({ x: ball.p.x, z: ball.p.z }) }
  }

  if (Math.abs(ball.p.x) > HALF_LENGTH) {
    // whose goal line did it cross?
    const defendingSide: Side = directionOf.home === 1 ? (ball.p.x > 0 ? 'away' : 'home') : ball.p.x > 0 ? 'home' : 'away'
    const attackingSide: Side = defendingSide === 'home' ? 'away' : 'home'

    if (lastTouchSide === attackingSide) {
      return { kind: 'goalkick', side: defendingSide, at: goalKickSpot(directionOf[defendingSide], ball.p.z) }
    }
    return { kind: 'corner', side: attackingSide, at: cornerSpot(directionOf[attackingSide], ball.p.z) }
  }

  return null
}

/** Ticks a taker waits before the ball is live — long enough to see the restart, short enough not to wait. */
export const RESTART_DELAY: Record<RestartKind, number> = {
  kickoff: 54,
  throw: 42,
  corner: 66,
  goalkick: 54,
  freekick: 66,
  penalty: 90,
}

export function restartFor(out: OutOfPlay): RestartState {
  return { kind: out.kind, side: out.side, at: out.at, countdown: RESTART_DELAY[out.kind], takerId: null }
}

export function kickoffRestart(side: Side): RestartState {
  return { kind: 'kickoff', side, at: { x: 0, z: 0 }, countdown: RESTART_DELAY.kickoff, takerId: null }
}

/** Which side kicks off after a goal: the side that conceded. */
export function kickoffSideAfterGoal(scoredBy: Side): Side {
  return scoredBy === 'home' ? 'away' : 'home'
}
