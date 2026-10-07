/**
 * How the LIFE room starts, and how it says it could not (audit F13, 7.10.2026).
 *
 * The bug: when the browser refused a WebGL context, `play.js` reported the error into a sink nobody had
 * attached yet, the chapter card sat on top with "Opening the room" disabled, the retry button was hidden
 * behind it, and after 30 seconds the player was told to check their connection. Three rules now:
 *  1. Ask the browser for a context BEFORE loading the room (`probeWebgl`), so a device that cannot draw
 *     is told so at once.
 *  2. The runtime posts its boot failure to the parent (`VOXEL_MESSAGE`) as well as leaving it on the
 *     window; either path is a renderer failure.
 *  3. A renderer failure is never relabelled as a network timeout (`bootReducer`).
 * Pure — no DOM, no React — so the suite holds it to these rules.
 */
export type BootFailure = 'webgl' | 'room' | 'timeout'
export type BootState = {phase: 'loading' | 'ready' | 'failed'; failure: BootFailure | null}
export type BootAction =
  | {type: 'webgl-unavailable'}
  | {type: 'renderer-error'; message?: string}
  | {type: 'ready'}
  | {type: 'timeout'}
  | {type: 'retry'}

export const BOOT_START: BootState = {phase: 'loading', failure: null}
/** The message `play.js` posts to the shell when it cannot start. */
export const VOXEL_MESSAGE = 'fan-life:voxel'
export const BOOT_TIMEOUT_MS = 30000

/** A failure that names the GPU, the context or WebGL is the device; anything else is the room. */
export function classifyRendererError(message: unknown): BootFailure {
  return typeof message === 'string' && /webgl|context|gpu|renderer|graphics/i.test(message) ? 'webgl' : 'room'
}

export function bootReducer(state: BootState, action: BootAction): BootState {
  switch (action.type) {
    case 'retry': return BOOT_START
    case 'ready': return {phase: 'ready', failure: null}
    case 'webgl-unavailable': return {phase: 'failed', failure: 'webgl'}
    case 'renderer-error': {
      // a device failure stays a device failure; a timeout that turns out to be the renderer is corrected
      if (state.failure === 'webgl') return state
      return {phase: 'failed', failure: classifyRendererError(action.message)}
    }
    case 'timeout':
      // only a room that is still loading can time out — never one that already failed or started
      return state.phase === 'loading' ? {phase: 'failed', failure: 'timeout'} : state
  }
}

type GlContext = {getExtension?(name: string): {loseContext?(): void} | null}
type CanvasLike = {getContext(kind: string, options?: object): unknown}
/** Can this browser create a WebGL context at all? The probe context is released straight away. */
export function probeWebgl(make: () => CanvasLike | null | undefined): boolean {
  try {
    const canvas = make()
    if (!canvas) return false
    for (const kind of ['webgl2', 'webgl', 'experimental-webgl']) {
      const gl = canvas.getContext(kind, {failIfMajorPerformanceCaveat: false}) as GlContext | null
      if (gl) { try { gl.getExtension?.('WEBGL_lose_context')?.loseContext?.() } catch { /* released anyway */ } return true }
    }
    return false
  } catch {
    return false
  }
}

/** Reads a posted boot failure from the room; anything else is not ours. */
export function voxelFailure(data: unknown): {message: string} | null {
  if (!data || typeof data !== 'object') return null
  const d = data as {type?: unknown; event?: unknown; message?: unknown}
  if (d.type !== VOXEL_MESSAGE || d.event !== 'error') return null
  return {message: typeof d.message === 'string' ? d.message.slice(0, 300) : ''}
}

/** Which sentence the error state shows. */
export function failureCopyKey(failure: BootFailure): 'noWebgl' | 'roomFailed' | 'loadFailed' {
  return failure === 'webgl' ? 'noWebgl' : failure === 'room' ? 'roomFailed' : 'loadFailed'
}
