/**
 * נקודות שמירה לאירועי־אב — the one thing an event log cannot restore by itself.
 *
 * This game saves a LOG, not a state, and that decision has paid for itself every time a
 * chapter was rewritten: a two-year-old save folds through today's reducer and comes out
 * as today's life. It has exactly one blind spot, and Maor's audit found it (§6.2, §8.3).
 *
 * A master event is not folded, it is DIRECTED — 12.5.1990 runs a match in real seconds,
 * 2.5.1998 runs two grounds at once, and neither of them is in the log. The log records
 * that the boy heard about Yavne. It does not record that the fourth goal has already
 * been played. So a player who reloads in the eighty-first minute gets the fourth goal
 * again: the roar, the flash, the radio falling a second time, and two more points of
 * football love that history did not award him. That is a save-corruption bug with a
 * cheerful face, and it is the kind that only shows up in front of somebody who has just
 * lost forty minutes.
 *
 * Two mechanisms, and they solve different halves of it.
 *
 * **The checkpoint** carries the director's needle — clock, what has fired, what he has
 * been told, where the crowd's understanding has reached — beside the log, keyed to the
 * log's own length. Restore it and the day picks up exactly where it was dropped. If the
 * log has since moved on past the checkpoint (a second session, a different device, the
 * player replaying the chapter) the checkpoint is stale and is thrown away rather than
 * trusted: a wrong resume is worse than no resume.
 *
 * **`onceIn`** is the belt to that pair of braces. Some effects must happen exactly once
 * in a life no matter how many times the day is played through — the football love a goal
 * awards, a Red Box memory, an item. They now carry a flag and check it first, so even a
 * checkpoint that fails to restore cannot double them. `tests/life-checkpoint.test.ts`
 * plays 12.5.1990 straight through, then plays it again with a reload in the middle, and
 * asserts the two lives are identical.
 */
import type { DirectorSnapshot, ParallelHistoricalDirector } from './history'
import type { LifeEvent } from './events'
import type { LifeState } from './types'

export const CHECKPOINT_VERSION = 1

export type MasterCheckpoint = {
  version: number
  /** the chapter, which in this game IS the master event */
  chapter: string
  /** the day in `lib/life/history` this checkpoint belongs to */
  dayId: string
  snapshot: DirectorSnapshot
  /**
   * how many events the log held when the needle was here. A log that has grown past this
   * is a life that has moved on, and the checkpoint no longer describes it.
   */
  logLength: number
  at: string
}

export function checkpointOf(
  chapter: string,
  dayId: string,
  director: ParallelHistoricalDirector,
  logLength: number,
  at = new Date().toISOString(),
): MasterCheckpoint {
  return { version: CHECKPOINT_VERSION, chapter, dayId, snapshot: director.snapshot(), logLength, at }
}

/**
 * מתי לא לסמוך על נקודת שמירה — every reason to refuse, in one place.
 *
 * Refusing costs the player the middle of one match. Trusting a stale one costs him a
 * life that quietly disagrees with its own log, which is the failure this file exists to
 * prevent, so every doubt resolves the same way.
 */
export function usable(checkpoint: MasterCheckpoint | null | undefined, chapter: string, logLength: number): boolean {
  if (!checkpoint) return false
  if (checkpoint.version !== CHECKPOINT_VERSION) return false
  if (checkpoint.chapter !== chapter) return false
  if (checkpoint.logLength !== logLength) return false
  if (checkpoint.snapshot.completed) return false
  return true
}

/** put the needle back, when and only when the checkpoint still describes this life */
export function resume(
  director: ParallelHistoricalDirector,
  checkpoint: MasterCheckpoint | null | undefined,
  chapter: string,
  logLength: number,
): boolean {
  if (!usable(checkpoint, chapter, logLength)) return false
  director.restore((checkpoint as MasterCheckpoint).snapshot)
  return true
}

export const ONCE_PREFIX = 'once:'
export const onceFlag = (key: string) => `${ONCE_PREFIX}${key}`

/**
 * פעם אחת בחיים — an effect that must not double, however many times the day is replayed.
 *
 * Returns the events plus their own guard flag the first time, and an empty list every
 * time after. The guard rides the log like everything else, so it survives a reload with
 * no checkpoint at all, and it survives the player replaying the chapter from a menu —
 * which is correct: a life awards its first 12.5.1990 goal once.
 */
export function onceIn(state: LifeState, key: string, events: readonly LifeEvent[]): LifeEvent[] {
  if (state.flags[onceFlag(key)]) return []
  return [{ t: 'flag.raised', flag: onceFlag(key) }, ...events]
}

/** has this life already done the thing? */
export const didOnce = (state: LifeState, key: string): boolean => Boolean(state.flags[onceFlag(key)])
