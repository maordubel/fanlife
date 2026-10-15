import {compileScript} from '../compile'
import type {ChapterScript} from '../types'
import {MASTER_CHILDHOOD} from './childhood'
import {MASTER_EARLY} from './early'
import {MASTER_YOUTH} from './youth'
import {MASTER_GROWN} from './grown'
import {MASTER_MIDDLE} from './middle'
import {MASTER_LATE} from './late'
import {MASTER_ROUTES_A} from './routesA'
import {MASTER_ROUTES_B} from './routesB'

/**
 * The master screenplay (bible §16–17, 15.10.2026), written for the engine: the thirty-two shared chapters in
 * the bible's order, then the routes. Every club's life carries all of it (`composeLife` default), including a
 * club that joins later — nothing here names a club, a year, a score or an opponent.
 *
 * A route chapter carries a `when` and is SKIPPED for a life that was not invited into it (see MASTER_BRIEF).
 */
const EAST_ROOMS = new Set(['pitch', 'bus-stop', 'bus-station', 'workshop'])
/** A scene set in a place off the street's east door points that door at itself while it is open, unless it says otherwise. */
const withEast = (c: ChapterScript): ChapterScript => ({...c, scenes: c.scenes.map(x => x.east || !EAST_ROOMS.has(x.room) ? x : {...x, east: x.room})})

export const MASTER: readonly ChapterScript[] = [
  ...MASTER_CHILDHOOD, ...MASTER_EARLY, ...MASTER_YOUTH, ...MASTER_GROWN, ...MASTER_MIDDLE, ...MASTER_LATE,
  ...MASTER_ROUTES_A, ...MASTER_ROUTES_B,
].map(withEast)
export const MASTER_IDS: readonly string[] = MASTER.map(c => c.id)

/** Compiles the named chapters, in the order asked. An id nobody wrote is an error, never a silent gap. */
export function masterChapters(ids: readonly string[], locale: 'en' | 'he') {
  return ids.map(id => {
    const script = MASTER.find(c => c.id === id)
    if (!script) throw new Error(`MASTER_CHAPTER_UNKNOWN:${id}`)
    return compileScript(script, locale)
  })
}
