import {compileScript} from '../compile'
import type {ChapterScript} from '../types'
import {MASTER_CHILDHOOD} from './childhood'

/**
 * The master screenplay's chapters that are WRITTEN FOR THE ENGINE so far (bible §16). The rest of the 32 are
 * read (`content/generated/life-master-screenplay.json`) but not yet authored here — see `MASTER_PENDING`.
 *
 * None of these is part of the default life. A club's pack opts in (`life/master.json`, status `approved`),
 * so a life that was composed before this file existed is composed exactly the same after it.
 */
export const MASTER: readonly ChapterScript[] = [...MASTER_CHILDHOOD]
export const MASTER_IDS: readonly string[] = MASTER.map(c => c.id)

/** Compiles the named chapters, in the order asked. An id nobody wrote is an error, never a silent gap. */
export function masterChapters(ids: readonly string[], locale: 'en' | 'he') {
  return ids.map(id => {
    const script = MASTER.find(c => c.id === id)
    if (!script) throw new Error(`MASTER_CHAPTER_UNKNOWN:${id}`)
    return compileScript(script, locale)
  })
}
