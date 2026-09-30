import type { CrowdState, SampleKey } from '../runtime/audio'
import type { LifeEvent } from '../events'
import type { LifeState, LocationId, PresenceMode } from '../types'
import type { Condition } from '../world/types'
import type { Say } from './script'

/**
 * ביטים — what a chapter does BY ITSELF, as data.
 *
 * Three chapters were written before this file and every one of them put its own beats
 * in `WorldScene`: the kitchen table of 1990 is a method, the note under the desk of 1991
 * is a method, eight o'clock at Ussishkin is a branch in `timeTriggers`. The Stage B brief
 * (§13) says the fourth chapter may not be a fourth branch. So a beat is a row: WHERE it
 * fires, WHEN it may, whether it waits for the room or for the clock, and the list of
 * things it does — lines, a card, a flag, a cut, an ending. The runner in `WorldScene`
 * is the same forty lines for every chapter, and a chapter is a content file.
 *
 * A beat fires ONCE per life: `beat:<id>` is raised the moment it starts. That flag is an
 * afternoon flag, cleared by the next year — a beat that must never come back writes its
 * own `life:` flag as one of its actions.
 */
export type BeatAction =
  /** lines spoken or narrated, then the next action */
  | { a: 'lines'; lines: readonly Say[] }
  /** a registered conversation (with choices); the next action runs when it ends */
  | { a: 'talk'; conversation: string }
  /** a title over black, or over a plate */
  | { a: 'card'; titleHe: string; subHe?: string | null; ms?: number; art?: string }
  /** one line at the foot of the glass, no stop */
  | { a: 'toast'; text: string; tone?: 'plain' | 'red' }
  | { a: 'flag'; flag: string }
  | { a: 'events'; events: readonly LifeEvent[] }
  /** through a door, to a spawn */
  | { a: 'travel'; to: LocationId; spawn: string }
  /** the chapter closes on this ending card */
  | { a: 'ending'; id: string }
  /** the boy's own eyes, for a moment */
  | { a: 'pano'; key: string }
  /** wait — for a card to pass, for a breath */
  | { a: 'wait'; ms: number }
  /** the crowd, the whistle, the radio */
  | { a: 'sound'; kind: 'roar' | 'whistle' | 'radio' | 'door'; big?: number; blasts?: number; on?: boolean }
  /** one rendered sound from the library — a darbuka, a buzzer, a bus door, a groan */
  | { a: 'sfx'; key: SampleKey; level?: number; delayMs?: number }
  /** the terrace changes state: murmur, tension, chant, a miss, a goal, the settle, the end */
  | { a: 'crowd'; state: CrowdState }
  /** a directed match (~60 s): a script from `matchScripts.ts`; the next action runs at the whistle */
  | { a: 'match'; script: string }
  /** record how he was there for this chapter's anchor */
  | { a: 'presence'; mode: PresenceMode }
  /** the archive film this chapter may open onto (by cutscene registry id) */
  | { a: 'cutscene'; id: string }
  /** events computed from the state at that moment — the one place a beat may look at the whole decade */
  | { a: 'derive'; events: (state: LifeState) => readonly LifeEvent[] }
  /**
   * (delta 93) a person in the room takes the first step — enters, walks up to him, turns,
   * leaves. PRESENTATION ONLY: nothing here is saved, and an actor the room cannot find is a
   * no-op, so a missing figure can never hold a scene. Content says WHO moves; the story
   * director never does.
   */
  | ActorCue
  /**
   * (delta 93) the HUD, off and back on — for a moment that should be seen without a clock
   * on it (the demolition). Runtime only; the room puts it back on exit, skip or error.
   */
  | { a: 'hud'; visible: boolean }

export type ActorCue =
  | { a: 'actorCue'; actorId: string; cue: 'enter'; from?: 'left' | 'right'; durationMs?: number }
  | { a: 'actorCue'; actorId: string; cue: 'approach'; target: 'player' | string; durationMs?: number }
  | { a: 'actorCue'; actorId: string; cue: 'leave'; to?: 'left' | 'right'; durationMs?: number }
  | { a: 'actorCue'; actorId: string; cue: 'turn'; target: 'player' | string }
  | { a: 'actorCue'; actorId: string; cue: 'gesture'; durationMs?: number }

export type Beat = {
  id: string
  /** the room(s) it fires in; omit for anywhere */
  at?: LocationId | readonly LocationId[]
  /** everything here must hold */
  when?: Condition
  /** `enter` fires on arriving in the room; `clock` is checked every tick (use `afterMinute`) */
  trigger: 'enter' | 'clock'
  /** a breath before it starts, so the room is seen first */
  delayMs?: number
  /**
   * מה מחכים לו — what a player standing here is waiting for, in his own words.
   *
   * Only for `clock` beats, and only when the wait is the intended experience: the game
   * puts this on the glass, permanently, for as long as the beat has not fired and the
   * player has nothing else to do in the room. Maor asked for it on 5.9.2026 in one
   * sentence — a player who has done everything right and is now standing still must be
   * TOLD he is waiting, or he assumes the game is broken. Omit it and no banner shows.
   */
  waitingHe?: string
  /**
   * זמן פנוי — optional hints for the free-time planner (`world/timeAdvance.ts`, delta 90).
   * Never required: without it the planner reads `at`, `waitingHe` and the room itself.
   */
  freeTime?: import('../world/flow').FreeTimeMeta
  do: readonly BeatAction[]
}

export const beatFlag = (id: string) => `beat:${id}`

export function beatsAt(beats: readonly Beat[] | undefined, trigger: Beat['trigger'], scene: LocationId): Beat[] {
  if (!beats) return []
  return beats.filter((beat) => {
    if (beat.trigger !== trigger) return false
    if (!beat.at) return true
    return Array.isArray(beat.at) ? (beat.at as readonly LocationId[]).includes(scene) : beat.at === scene
  })
}
