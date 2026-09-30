/**
 * The public face of the football simulation.
 *
 * `components/life/PitchCard.tsx` and the tests import from here; nothing else needs to
 * know that the ball and the keeper live in separate files. The render layer is
 * deliberately NOT re-exported — `lib/life/football/render/` may only be reached from
 * `PitchCard`, so a stray import can never pull three.js and a stadium into the first
 * paint of a Hebrew story game. `tests/life-football.test.ts` asserts exactly that.
 */
export * from './types'
export * from './pitch'
export * from './formations'
export { freshBall, crossedGoalLine, ballOutOfPlay, kickBall, GRAVITY } from './ball'
export { CONTROL_RADIUS, KEEPER_RADIUS, ownerOf, nearestOpponent } from './possession'
export { choosePassTarget, laneBlocked, playPass, playShot } from './actions'
export { keeperStation } from './keeper'
export { resolveOutOfPlay, restartFor, kickoffRestart, RESTART_DELAY } from './rules'
export { FORMATION_IDS } from './formations'
export {
  MINUTES_PER_SECOND,
  SHOOTING_RANGE,
  STEP,
  createMatch,
  endMatch,
  lerpVec2,
  lerpVec3,
  placeShape,
  step,
  switchPlayer,
  type FootballStateInternal,
} from './sim'
