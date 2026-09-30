/**
 * The render layer's front door.
 *
 * Everything under `lib/life/football/render/` imports three.js, and three.js is real
 * weight that nine visitors in ten never reach in a session. So this folder is reachable
 * from exactly one place — `components/life/PitchCard.tsx`, which `LifeStage` loads with
 * `dynamic(..., { ssr: false })` — and `tests/life-football.test.ts` fails the build if
 * anything else imports it. That single assertion is what keeps the stadium out of the
 * first paint of a Hebrew story game.
 */
export { QUALITY, suggestQuality, type QualityId, type QualitySpec } from './quality'
export { ERA_TURF, linesTexture, turfTexture, type TurfCondition } from './turf'
export {
  AWAY_KIT_SURFACE,
  awayKit,
  awayMarkColour,
  homeKit,
  keeperKit,
  shirtTexture,
  type KitSpec,
} from './kit'
export { buildFigure, figureKit, poseFigure, type FigureKit, type FigureParts } from './figure'
export { buildGround, rippleNet, settleNet, type Ground } from './scene'
export { freshRig, snapCamera, updateCamera, type CameraMode, type CameraRig } from './camera'
