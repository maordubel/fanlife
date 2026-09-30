import { describe, expect, it } from 'vitest'

import { CHECKLIST_CHAPTERS, checklistFor } from '@/lib/life/checklist'
import { playableChapters } from '@/lib/life/content/chapters'
import { emptyState } from '@/lib/life/events'

const IDENTITY = { name: 'פוגי', sex: 'boy' as const, birthYear: 1978 }

/**
 * A playable chapter may be quiet, optional or branch-specific. It may not be illegible.
 *
 * `checklist.ts` is not a quest engine; it is the authored, progressively revealed spine
 * behind "?". Requiring an entry here means every chapter has at least one vocabulary for
 * explaining what it wants without exposing hidden flags or relying on the player to wait.
 */
describe('LIFE action contract', () => {
  it('gives every playable chapter a discoverable action spine', () => {
    const known = new Set(CHECKLIST_CHAPTERS)
    const missing = playableChapters().map((chapter) => chapter.id).filter((id) => !known.has(id))
    expect(missing).toEqual([])
  })

  it('gives every playable chapter a first move the player can know immediately', () => {
    const illegible: string[] = []
    for (const chapter of playableChapters()) {
      const state = {
        ...emptyState(IDENTITY, chapter.year),
        chapter: chapter.id,
        year: chapter.year,
        age: chapter.year - IDENTITY.birthYear,
        weekday: chapter.weekday,
        minute: chapter.minute,
        location: chapter.start.location,
      }
      // Test what the player can actually see, not the first structural row. A branch may
      // deliberately put a hidden parent-only step before a universal step (2021-promises);
      // revealing that row to a childless life would be the real bug.
      if (!checklistFor(state).some((item) => !item.done)) illegible.push(chapter.id)
    }
    expect(illegible).toEqual([])
  })
})
