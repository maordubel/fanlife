/**
 * LIFE — real motion: the captured stride, as angles any body can wear.
 *
 * `public/life/town/mocap.json` is built by `scripts/life/mocap-clips.py` from the CMU Graphics Lab Motion Capture
 * Database (BVH conversion by B. Hahne): every complete stride of ten captured walks and a dozen captured runs,
 * measured in the body's own frame and averaged into one loop each. TOWN reads the same file in the browser
 * (`people.js` P.gait); RUSH reads it here. One stride (both feet) is one turn of the phase, 0 → 1, starting with
 * the left thigh furthest forward.
 *
 * Angles are in radians, in the one convention both engines share: a limb's x-rotation is NEGATIVE when it swings
 * forward, a knee is POSITIVE when it bends, an elbow NEGATIVE when it bends, a lean POSITIVE forward.
 */
import clips from '../../../public/life/town/mocap.json'

export type GaitKey = 'thigh_l' | 'thigh_r' | 'thighOut_l' | 'thighOut_r' | 'knee_l' | 'knee_r' | 'arm_l' | 'arm_r' | 'elbow_l' | 'elbow_r' | 'pelvisYaw' | 'pelvisRoll' | 'torsoYaw' | 'torsoLean' | 'torsoRoll' | 'bob'
type Clip = Record<GaitKey, number[]> & {takes: string[]; strides: number; seconds: number}
const CLIPS = (clips as unknown as {clips: Record<'walk' | 'run', Clip>}).clips

/** a captured curve at a phase (0..1, wraps), read between its samples */
export function sample(clip: 'walk' | 'run', key: GaitKey, phase: number): number {
  const v = CLIPS[clip][key], n = v.length, x = (((phase % 1) + 1) % 1) * n, i = Math.floor(x), f = x - i
  return v[i % n]! + (v[(i + 1) % n]! - v[i % n]!) * f
}

/** the walk, blended toward the run by `run` (0 walk … 1 run) */
export const blend = (key: GaitKey, phase: number, run: number): number => {
  const a = sample('walk', key, phase)
  return run > 0 ? a + (sample('run', key, phase) - a) * Math.min(1, run) : a
}

export type GaitPose = {hipL: number; hipR: number; kneeL: number; kneeR: number; shoulderL: number; shoulderR: number; elbowL: number; elbowR: number; pelvisYaw: number; pelvisRoll: number; spineYaw: number; lean: number; bob: number}

/** the whole body at one phase, in the shared convention; `run` blends walk → run */
export function gaitPose(phase: number, run: number): GaitPose {
  const g = (k: GaitKey) => blend(k, phase, run)
  // the averaged walk carries a little bend through stance (several actors, one curve): a walking knee straightens
  const straight = (1 - Math.min(1, run)) * 0.22
  return {
    hipL: -g('thigh_l'), hipR: -g('thigh_r'),
    kneeL: Math.max(0, g('knee_l') - straight), kneeR: Math.max(0, g('knee_r') - straight),
    shoulderL: -g('arm_l'), shoulderR: -g('arm_r'),
    elbowL: -g('elbow_l'), elbowR: -g('elbow_r'),
    pelvisYaw: -g('pelvisYaw'), pelvisRoll: g('pelvisRoll'), spineYaw: -g('torsoYaw'),
    lean: g('torsoLean'), bob: g('bob'),
  }
}

/** how long one captured stride takes at its own pace (seconds), and the takes it came from */
export const GAIT_SOURCE = {walk: {seconds: CLIPS.walk.seconds, takes: CLIPS.walk.takes, strides: CLIPS.walk.strides}, run: {seconds: CLIPS.run.seconds, takes: CLIPS.run.takes, strides: CLIPS.run.strides}}
