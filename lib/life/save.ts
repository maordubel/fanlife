import type { LifeEvent } from './events'
import type { PlayerIdentity } from './types'
import type { MasterCheckpoint } from './checkpoint'

/**
 * השמירה — the seam, and the only file that knows where a life is kept.
 *
 * Shaped like `lib/polls/store.ts` on purpose: an async interface with a local
 * implementation behind it, so the screen never names a storage API and the day the
 * table lands in Supabase is the day this file changes and nothing else does.
 *
 * What is written is the EVENT LOG plus the identity needed to fold it. Not the state.
 * A snapshot would have to be migrated field by field; a log is re-read by whatever
 * reducer is current, which is how a save survives a chapter being rewritten.
 *
 * Quota, private mode and a browser with storage switched off can all reject a write. The
 * game must stay playable, but "playable" may not mean silently forgetting the last ten
 * minutes. A failed write therefore keeps the newest complete file in memory and retries
 * it on a short trailing timer. A newer write replaces the pending one — event logs are
 * cumulative, so the newest file already contains everything the older retry wanted.
 */

const KEY = 'the-worker:life'
export const SAVE_VERSION = 4
const RETRY_MS = 2_000

export type SaveFile = {
  version: number
  identity: PlayerIdentity
  year: number
  events: LifeEvent[]
  savedAt: string
  /**
   * The needle's position inside a directed master event — see `lib/life/checkpoint.ts`.
   * Beside the log rather than inside it, because it is not something that happened to
   * the boy; it is where the record player was when the power went out. Absent on every
   * save made before version 4, which is why an older file loads with no resume and no
   * complaint.
   */
  checkpoint?: MasterCheckpoint | null
}

export type LifeStore = {
  read(): Promise<SaveFile | null>
  write(file: SaveFile): Promise<boolean>
  clear(): Promise<void>
  /** false in a server render, a private window with storage off, or a full quota */
  usable(): boolean
}

function browserStore(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    const probe = '__life__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * A file from a future version folds fine (unknown events are no-ops) but a file from a
 * version this build has never heard of is not something to guess at.
 *
 * **Version 2 — the timeline rebase.** The protagonist's birth year moved from 1972 to
 * 1978 and the chapter moved from 1980 to 1986. A version-1 file therefore describes a
 * person who is now eight years older than the game believes, in a year the game no
 * longer has: its flags, its bonds and its memories are all keyed to a life that does
 * not exist any more. There is no honest migration for that, so a version-1 file is
 * dropped and the player begins the rebased chapter with a clean log.
 *
 * **Version 3 — the real game systems pass.** Resources, wellbeing, personality, the Red
 * Heart, relationships with six axes, the Red Box, opportunities and a seeded random
 * cursor. A version-2 file needs NO conversion and loses NOTHING, and that is not luck:
 * the save is an event log, so a richer reducer simply reads the same rows and produces
 * a richer life. A save made before the Red Heart existed still contains the moments
 * that would have moved it, and folding it now moves it. Version 2 is therefore accepted
 * as-is and re-saved as version 3.
 *
 * The rule the whole file exists for: never silently destroy a save. Anything that
 * cannot be honestly carried forward is refused loudly rather than reinterpreted.
 */
/**
 * **Version 4 — the master-event checkpoint.** One optional field beside the log. A
 * version-3 file needs no conversion and loses nothing: it simply resumes nothing, which
 * is exactly what it did before the field existed.
 */
const READABLE = new Set([2, 3, 4])

function migrate(raw: unknown): SaveFile | null {
  if (!raw || typeof raw !== 'object') return null
  const file = raw as Partial<SaveFile>
  if (typeof file.version !== 'number' || file.version > SAVE_VERSION) return null
  if (!READABLE.has(file.version)) return null
  if (!Array.isArray(file.events) || !file.identity || typeof file.year !== 'number') return null
  return {
    version: SAVE_VERSION,
    identity: file.identity,
    year: file.year,
    events: file.events as LifeEvent[],
    savedAt: typeof file.savedAt === 'string' ? file.savedAt : new Date().toISOString(),
    checkpoint: (file.checkpoint as MasterCheckpoint | null | undefined) ?? null,
  }
}

let pending: SaveFile | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null

function writeNow(file: SaveFile): boolean {
  const store = browserStore()
  if (!store) return false
  try {
    store.setItem(KEY, JSON.stringify(file))
    return true
  } catch {
    return false
  }
}

function scheduleRetry() {
  if (retryTimer || !pending || typeof window === 'undefined') return
  retryTimer = setTimeout(() => {
    retryTimer = null
    const file = pending
    if (!file) return
    if (writeNow(file)) {
      // Do not clear a newer file that arrived while this one was being retried.
      if (pending === file) pending = null
      return
    }
    scheduleRetry()
  }, RETRY_MS)
}

export const lifeStore: LifeStore = {
  async read() {
    const store = browserStore()
    if (!store) return null
    try {
      const raw = store.getItem(KEY)
      return raw ? migrate(JSON.parse(raw)) : null
    } catch {
      return null
    }
  },

  async write(file) {
    // Always retain the newest cumulative log until storage confirms it accepted it.
    pending = file
    if (writeNow(file)) {
      if (pending === file) pending = null
      return true
    }
    scheduleRetry()
    return false
  },

  async clear() {
    pending = null
    if (retryTimer) clearTimeout(retryTimer)
    retryTimer = null
    const store = browserStore()
    if (!store) return
    try {
      store.removeItem(KEY)
    } catch {
      /* a life that cannot be deleted is still a life that can be played */
    }
  },

  usable() {
    return browserStore() !== null
  },
}
