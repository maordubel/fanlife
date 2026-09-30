import { describe, expect, it } from 'vitest'

import { entity } from '@/lib/archive/graph'
import { matchById } from '@/lib/archive/match-master'
import { playerById } from '@/lib/archive/player-master'
import { pinnedGoal } from '@/lib/game/goal'
import { ALL_CHARACTERS } from '@/lib/life/characters'
import { bridgeOf, chaptersOfEntity, lifeBridge, lifeDoors } from '@/lib/life/bridge'
import { CHAPTER, anchorOwner } from '@/lib/life/content/chapters'
import { completedChapters, livedChapters, livedIt, memoryPassport } from '@/lib/life/memoryPassport'
import { lifeHref, playableGoalHref } from '@/lib/links'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * הגשר — LIFE ↔ ARCHIVE (ONE RED WORLD §23, §47, §52).
 *
 * Four things the bridge may never do, each asserted on the whole registry rather than on
 * a hand-picked chapter: name an id the archive does not hold, leak a chapter the save has
 * not finished, let a LIFE character stand in as an archive entity, or type a link by hand.
 */

const bridge = lifeBridge()

describe('the registry — derived, and every id is real', () => {
  it('has rows, and 1986 is the Landau goal the archive holds', () => {
    expect(bridge.length).toBeGreaterThan(10)
    const row = bridgeOf('1986')
    expect(row).not.toBeNull()
    expect(row!.matchIds).toHaveLength(1)
    expect(row!.goalIds.length).toBeGreaterThan(0)
  })

  it('every id exists in the Entity Graph / the masters', () => {
    for (const row of bridge) {
      for (const id of row.entityIds) expect(entity(id), `${row.chapterId}: ${id}`).not.toBeNull()
      for (const id of row.matchIds) expect(matchById(id), `${row.chapterId}: ${id}`).not.toBeNull()
      for (const id of row.playerIds) expect(playerById(id) && entity(id), `${row.chapterId}: ${id}`).toBeTruthy()
      for (const id of row.kitIds) expect(entity(id)?.type, `${row.chapterId}: ${id}`).toBe('kit')
      for (const id of row.goalIds) expect(playableGoalHref(id), `${row.chapterId}: ${id}`).not.toBeNull()
      expect(row.safeReturnPoint).toBe('/life')
    }
  })

  it('one row per sourced anchor, owned by the chapter named for it, of a real playable chapter', () => {
    const seen = new Set<string>()
    for (const row of bridge) {
      const def = CHAPTER[row.chapterId]
      expect(def?.playable, row.chapterId).toBe(true)
      expect(anchorOwner(def!.anchorKey)).toBe(row.chapterId)
      expect(seen.has(row.chapterId)).toBe(false)
      seen.add(row.chapterId)
    }
  })

  it('rule 6 — a row never mixes sports', () => {
    for (const row of bridge) {
      const sports = new Set(row.entityIds.map((id) => entity(id)?.sport))
      expect(sports.size, row.chapterId).toBe(1)
    }
  })
})

describe('no fiction in the archive', () => {
  it('no LIFE character id is ever a bridge id, or resolves as an archive entity through the bridge', () => {
    const ids = new Set(bridge.flatMap((row) => [...row.entityIds, ...row.matchIds, ...row.playerIds, ...row.kitIds, ...row.goalIds]))
    for (const character of ALL_CHARACTERS) {
      expect(ids.has(character.id), character.id).toBe(false)
      expect(chaptersOfEntity(character.id), character.id).toEqual([])
    }
  })

  it('every id has a canonical archive shape — never a story-only key', () => {
    for (const row of bridge) {
      for (const id of row.entityIds) expect(id).toMatch(/^(m_[0-9a-f]{12}|p_[0-9a-f]{10}|season:\S+|kit-\d{4}-\d{2}-\w+)$/)
    }
  })

  it('the bridge types no link: it reads the anchors and the masters, nothing else', () => {
    const text = readFileSync(join(process.cwd(), 'lib/life/bridge.ts'), 'utf8')
    expect(text).not.toMatch(/['"`]\/archive\?at=/)
    expect(text).not.toMatch(/['"`]\/goal\?g=/)
    expect(text).not.toMatch(/m_[0-9a-f]{12}/)
    expect(text).not.toContain('@/content/manual')
    expect(text).toContain("import 'server-only'")
  })
})

describe('no locked chapter leaks (§23.2)', () => {
  const log = (...events: { t: string; chapter?: string }[]) => events

  it('entering a chapter is not living it', () => {
    const passport = memoryPassport(log({ t: 'chapter.entered', chapter: '1986' }), bridge)
    expect(passport).toEqual([])
    expect(livedIt(passport, bridgeOf('1986')!.matchIds[0])).toBe(false)
  })

  it('a finished chapter opens its own ids and nobody else’s', () => {
    const passport = memoryPassport(log({ t: 'chapter.entered', chapter: '1986' }, { t: 'chapter.completed', chapter: '1986' }), bridge)
    expect(passport.map((row) => row.chapterId)).toEqual(['1986'])
    const own = bridgeOf('1986')!
    expect(livedIt(passport, own.matchIds[0])).toBe(true)
    expect(livedChapters(passport, own.goalIds[0])).toEqual(['1986'])
    for (const other of bridge.filter((row) => row.chapterId !== '1986')) {
      for (const id of other.matchIds) if (!own.entityIds.includes(id)) expect(livedIt(passport, id)).toBe(false)
    }
  })

  it('a malformed log and an empty save leak nothing', () => {
    expect(completedChapters(null)).toEqual([])
    expect(completedChapters([{ t: 'chapter.completed' }, { t: 'chapter.completed', chapter: 7 as unknown as string }])).toEqual([])
    expect(memoryPassport(undefined, bridge)).toEqual([])
  })

  it('the LIFE door opens only for an unlocked chapter', () => {
    expect(lifeHref('1986', () => false)).toBeNull()
    expect(lifeHref('1986', (c) => c === '1986')).toBe('/life')
    expect(lifeHref('2026-finale', (c) => c === '1986')).toBeNull()
  })
})

describe('LIFE → gates (§23.1) — the recap doors', () => {
  it('at most two, and every one lands', () => {
    const doors = lifeDoors()
    expect(Object.keys(doors).length).toBeGreaterThan(0)
    for (const [chapter, list] of Object.entries(doors)) {
      expect(list.length, chapter).toBeLessThanOrEqual(2)
      for (const door of list) {
        const url = new URL(door.href, 'https://x.test')
        if (door.kind === 'archive') expect(entity(url.searchParams.get('at'))).not.toBeNull()
        else expect(pinnedGoal(url.searchParams.get('g'))).not.toBeNull()
      }
    }
    expect(doors['1986']?.some((door) => door.kind === 'goal')).toBe(true)
  })
})
