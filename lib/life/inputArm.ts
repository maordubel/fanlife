/**
 * הבחירה נדרכת — a decision is armed only after the hand that revealed it has let go.
 *
 * P0 of the implementation pass (27.9.2026): the tap that finishes a line and reveals a
 * ballot must never land on the ballot's first row. The old answer lived in the probes —
 * "wait 900ms before clicking" — which protected the harness and not the player. The rule
 * now lives in the input path itself:
 *
 *   1. a ballot appears DISARMED;
 *   2. if no pointer is down at that moment, it arms on the next frame;
 *   3. if a pointer IS down (the same gesture that revealed it), it arms on the frame after
 *      that pointer comes up — never on the pointer-up itself, because the click event of
 *      that same gesture fires after pointer-up;
 *   4. a choose() while disarmed is ignored, not queued.
 *
 * Pure state + an injectable frame scheduler, so the rapid-tap regression is arithmetic
 * (`tests/life-input-arm.test.ts`) and the DOM wiring in `DialogueBox` stays three lines.
 */
export type ArmGate = {
  /** a new ballot is on screen */
  reveal(): void
  pointerDown(): void
  pointerUp(): void
  /** the scheduler ran a frame */
  frame(): void
  readonly armed: boolean
  /** true if a choice may be taken now */
  accept(): boolean
}

export function createArmGate(): ArmGate {
  let armed = true
  let down = false
  // the number of frames to wait before arming; -1 = waiting for pointer-up
  let wait = 0
  return {
    reveal() {
      armed = false
      wait = down ? -1 : 1
    },
    pointerDown() {
      down = true
    },
    pointerUp() {
      down = false
      if (!armed && wait === -1) wait = 1
    },
    frame() {
      if (armed || wait <= 0) return
      wait -= 1
      if (wait === 0) armed = true
    },
    get armed() {
      return armed
    },
    accept() {
      return armed
    },
  }
}

/**
 * The one pointer state the page has. Tracked at the window, capture phase, so a canvas
 * or an overlay that stops propagation cannot hide a finger from the gate.
 */
let pointerIsDown = false
let installed = false
const listeners = new Set<(down: boolean) => void>()

export function installPointerWatch(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  const set = (down: boolean) => () => {
    pointerIsDown = down
    for (const fn of listeners) fn(down)
  }
  window.addEventListener('pointerdown', set(true), { capture: true, passive: true })
  window.addEventListener('pointerup', set(false), { capture: true, passive: true })
  window.addEventListener('pointercancel', set(false), { capture: true, passive: true })
  // Enter/Space on a focused row is a gesture too: the key that finished the line must be
  // released before the ballot takes another
  window.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ' || e.key === 'e' || e.key === 'E') && set(true)(), { capture: true })
  window.addEventListener('keyup', (e) => (e.key === 'Enter' || e.key === ' ' || e.key === 'e' || e.key === 'E') && set(false)(), { capture: true })
}

export const isPointerDown = () => pointerIsDown

export function onPointerChange(fn: (down: boolean) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
