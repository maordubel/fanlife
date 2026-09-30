import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ERA_KEYS, eraFor } from '@/lib/life/content/era'
import { PORTRAIT_ART } from '@/lib/life/runtime/art'

/**
 * הפנים בתיבה הן הפנים על הרצפה — 21.9.2026.
 *
 * From 1990 to 2026 every chapter put the twelve-year-old's plate (`faceHero80`) beside
 * whatever the player was that year — a soldier in 1996, a man of forty in front of the
 * rebuilt Bloomfield in 2019. The plates for the older bodies existed and were wired to
 * nothing. The plate is now derived from the body; this holds it there.
 */
// 24.9.2026: from 2010 the young man ages (`playerFor` in `world/castFigures.ts`), and each age
// speaks with the plate cut from its own body
const FACE_OF_BODY: Record<string, string> = {
  hero90: 'faceHero90', soldier: 'faceSoldier', pogi32: 'facePogi32', pogi40: 'facePogi40', pogi47: 'facePogi47',
}

describe('the protagonist speaks with the face of the body he walks in', () => {
  it('uses the grown plate in every chapter whose body is grown', () => {
    let checked = 0
    for (const id of ERA_KEYS) {
      const era = eraFor(id)
      const want = FACE_OF_BODY[era.player.pose.down]
      if (!want) continue
      checked += 1
      expect((era.portraits as Record<string, string>)['פוגי'], id).toBe(want)
    }
    // thirty-odd chapters walk as a young man; if this drops to a handful the rule broke
    expect(checked).toBeGreaterThan(30)
  })

  it('never shows the twelve-year-old after the army', () => {
    for (const id of ERA_KEYS.filter((key) => Number(key.slice(0, 4)) >= 1996)) {
      expect((eraFor(id).portraits as Record<string, string>)['פוגי'], id).not.toBe('faceHero80')
    }
  })

  it('points at plates that are plates, and are on disk', () => {
    for (const face of Object.values(FACE_OF_BODY)) {
      expect((PORTRAIT_ART as readonly string[]).includes(face), face).toBe(true)
      expect(existsSync(join(process.cwd(), 'public/life/art', `${face}.webp`)), face).toBe(true)
    }
  })
})

describe('the friends grow up in the box as well', () => {
  const CHILD = ['faceOfir', 'faceAmit', 'faceKeren']
  it('keeps the 1986 children in 1986 and in the days before it', () => {
    expect((eraFor('1986').portraits as Record<string, string>)['אופיר']).toBe('faceOfir')
  })
  it('never shows a 1986 child plate from 1990 on', () => {
    for (const id of ERA_KEYS) {
      const era = eraFor(id)
      if (era.year < 1990) continue
      for (const [who, plate] of Object.entries(era.portraits as Record<string, string>)) {
        expect(CHILD.includes(plate), `${id}: ${who} → ${plate}`).toBe(false)
      }
    }
  })
})

describe('the red box lights the age he is, not the age he was', () => {
  it('lights the slot of the body the chapter walks in', async () => {
    const { ageReached, leadKey } = await import('@/components/life/LifeLine')
    expect(ageReached('1986')).toBe(0)
    expect(ageReached('a3-hall')).toBe(0)
    expect(ageReached('1990')).toBe(1)
    expect(ageReached('1996-army')).toBe(2)
    expect(ageReached('2018-return')).toBe(3)
    for (const id of ERA_KEYS.filter((key) => Number(key.slice(0, 4)) >= 1990)) {
      expect(ageReached(id), id).toBeGreaterThan(0)
    }
    // "the first in the box" is 1986's sentence and "the second" 1990's — nobody else's
    expect(leadKey('1986')).toBe('life.line.lead')
    expect(leadKey('1990')).toBe('life.line.lead2')
    expect(leadKey('2026-finale')).toBe('life.line.lead3')
  })
})
