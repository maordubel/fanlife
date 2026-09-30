import { describe, expect, it } from 'vitest'

import { CHAPTERS, chapterFor } from '@/lib/life/content/chapters'
import { eraFor } from '@/lib/life/content/era'
import { MATCH_RITUALS, ritualFor } from '@/lib/life/matchRitual'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { emptyState } from '@/lib/life/events'
import type { LifeState } from '@/lib/life/types'

const lifeIn = (chapter: string, extra: Partial<LifeState> = {}): LifeState => ({ ...emptyState(DEFAULT_IDENTITY, chapterFor(chapter)?.year ?? 1986), chapter, ...extra }) as LifeState

/**
 * Delta 93 (brief §2) — every day he goes to a match asks what he wears, or says why not.
 *
 * `MATCH_RITUALS` is a hand list, and a hand list rots: 1998-laces and 2010-teddy were
 * match days for a week with nobody dressing for them. The reverse test lists the chapters
 * whose content is physical attendance and asks each one for a ritual or an explicit
 * `matchRitual: 'none'` on the chapter — a decision, not a silence.
 */

/** the chapters whose day is (or may be) a match he stands at, read from the content */
const ATTENDED_MATCH_CHAPTERS = [
  'a5-first',
  '1986',
  '1990',
  '1991',
  '1993-cup',
  '1993-galil',
  '1997-basket',
  '1998-laces',
  '1999-basket',
  '1999-cup',
  '2000-title',
  '2000-double',
  '2002-europe',
  '2006-home',
  '2009-up',
  '2010-cup',
  '2010-teddy',
  '2012-cups',
  '2015-newhall',
  '2018-return',
  '2021-promises',
  '2024-terrace',
  '2025-eurocup',
  '2026-finale',
] as const

describe('match ritual coverage (delta 93)', () => {
  it('every attended-match chapter has a ritual, or says it has none', () => {
    for (const id of ATTENDED_MATCH_CHAPTERS) {
      const chapter = chapterFor(id)
      expect(chapter, id).toBeTruthy()
      expect(Boolean(MATCH_RITUALS[id]) || chapter?.matchRitual === 'none', id).toBe(true)
    }
  })

  it('a chapter whose script plays a match is in the list', () => {
    for (const chapter of CHAPTERS) {
      const plays = (eraFor(chapter.id).beats ?? []).some((beat) => beat.do.some((action) => action.a === 'match'))
      if (plays) expect(ATTENDED_MATCH_CHAPTERS as readonly string[], chapter.id).toContain(chapter.id)
    }
  })

  it('"none" and a ritual never both', () => {
    for (const chapter of CHAPTERS) if (chapter.matchRitual === 'none') expect(MATCH_RITUALS[chapter.id], chapter.id).toBeUndefined()
  })

  it('2010-teddy dresses only the one who goes to Teddy', () => {
    const shirt = { 'own:shirt:tveria85': true }
    const home = lifeIn('2010-teddy', { flags: { ...shirt, 'd10:mode': 'home' } })
    const venue = lifeIn('2010-teddy', { flags: { ...shirt, 'd10:mode': 'venue' } })
    expect(ritualFor(home, '2010-teddy')).toBeNull()
    // a wardrobe that holds nothing of that day is not asked a question with no answer
    const def = ritualFor(venue, '2010-teddy')
    if (def) expect(def.eventId).toBe('2010-teddy')
    expect(MATCH_RITUALS['2010-teddy']?.when?.(venue)).toBe(true)
  })

  it('1998-laces is a match day', () => {
    expect(MATCH_RITUALS['1998-laces']?.prefer).toBe('football')
  })
})
