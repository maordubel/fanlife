/**
 * LIFE · two-bone IK — a hand that actually arrives: on a boy's shoulder, at his neck with the scarf, in a mother's hand.
 * Analytic (law of cosines): bend the elbow to the reach, then swing the whole arm onto the target. The elbow keeps the
 * side the clip gave it. Works on world matrices that are up to date; writes the two local quaternions, blended by `w`.
 * No allocation per call.
 */
import * as THREE from 'three'

const A = new THREE.Vector3(), B = new THREE.Vector3(), Cw = new THREE.Vector3(), T = new THREE.Vector3()
const ab = new THREE.Vector3(), bc = new THREE.Vector3(), at = new THREE.Vector3(), ac = new THREE.Vector3(), axis = new THREE.Vector3(), c2 = new THREE.Vector3()
const d1 = new THREE.Quaternion(), d2 = new THREE.Quaternion(), pw = new THREE.Quaternion(), bw = new THREE.Quaternion(), q = new THREE.Quaternion(), uw = new THREE.Quaternion()
const sc = new THREE.Vector3(), ps = new THREE.Vector3()

/** the elbow's interior angle for a reach of `d` with bones `a` and `b` (pure; exported for the tests) */
export function elbowAngle(a: number, b: number, d: number): number {
  const x = Math.max(Math.abs(a - b) + 1e-4, Math.min(a + b - 1e-4, d))
  return Math.acos(Math.max(-1, Math.min(1, (a * a + b * b - x * x) / (2 * a * b))))
}

/** `upper` → `lower` → `end` reach for `target` (world). Returns how far the end still is from the target (metres). */
export function reachTwoBone(upper: THREE.Object3D, lower: THREE.Object3D, end: THREE.Object3D, target: THREE.Vector3, w: number, soft = 0.985): number {
  if (w <= 0.001 || !upper.parent) return 0
  A.setFromMatrixPosition(upper.matrixWorld); B.setFromMatrixPosition(lower.matrixWorld); Cw.setFromMatrixPosition(end.matrixWorld)
  ab.subVectors(B, A); bc.subVectors(Cw, B); at.subVectors(target, A)
  const a = ab.length(), b = bc.length()
  if (a < 1e-5 || b < 1e-5) return 0
  // never a locked, dead-straight arm: the reach stops just short of full length
  const d = Math.min(at.length(), (a + b) * soft)
  T.copy(A).addScaledVector(at.normalize(), d)
  // 1. the elbow: open or close it in the plane the arm already bends in
  const now = Math.PI - ab.angleTo(bc), want = elbowAngle(a, b, d)
  axis.crossVectors(ab, bc)
  if (axis.lengthSq() < 1e-10) axis.set(0, 0, 1).applyQuaternion(upper.getWorldQuaternion(q))
  axis.normalize()
  d1.setFromAxisAngle(axis, now - want)
  c2.copy(bc).applyQuaternion(d1).add(B)
  // 2. the shoulder: swing the arm so the hand is on the target
  ac.subVectors(c2, A).normalize(); at.subVectors(T, A).normalize()
  d2.setFromUnitVectors(ac, at)
  upper.parent.matrixWorld.decompose(ps, pw, sc); upper.matrixWorld.decompose(ps, uw, sc); lower.matrixWorld.decompose(ps, bw, sc)
  // lower: its world turn is d2·d1, under a parent whose world turn is d2
  q.copy(uw).invert().multiply(d1).multiply(bw)
  lower.quaternion.slerp(q, w)
  q.copy(pw).invert().multiply(d2).multiply(uw)
  upper.quaternion.slerp(q, w)
  return target.distanceTo(T)
}
