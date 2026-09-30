import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { playableChapters } from '@/lib/life/content/chapters'
import { plateFor } from '@/lib/life/plates'

/**
 * Forty-odd chapter cards opened on black until 21.9.2026: the card asked for
 * `plate-<chapter>` and only thirteen were ever painted. Every chapter's card and finale
 * now resolve to a file that is on disk.
 */
describe('every chapter card has a picture behind it', () => {
  it('resolves a plate that exists for every playable chapter', () => {
    for (const chapter of playableChapters()) {
      const plate = plateFor(chapter.id)
      expect(existsSync(join(process.cwd(), 'public/life/art', `${plate}.webp`)), `${chapter.id} → ${plate}`).toBe(true)
    }
  })

  it('shows the rebuilt ground only from the reopening on', () => {
    expect(plateFor('2026-finale')).toBe('plate-today')
    expect(plateFor('2010-anthem')).not.toBe('plate-today')
    expect(plateFor('1986')).toBe('plate-1986')
  })
})
