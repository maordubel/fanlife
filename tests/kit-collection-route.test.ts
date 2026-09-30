import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { detailOf, kitShelf } from '@/lib/archive/wing'
import { kitRecords, playableKits } from '@/lib/kit/kit-master'
import { kitCollectionHref } from '@/lib/links'
import { KIT_COLLECTION_HREF } from '@/lib/links/types'

/**
 * שער 5 → שער 12 (29.9.2026) — the Designer comes first, and "the full collection" is the Archive.
 * One canonical list (the Kit Master), no second historical-kit dataset, and a shirt Gate 4 asks
 * about keeps its answers off the Archive's card.
 */

const ROOT = join(__dirname, '..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')

describe('kit wing order', () => {
  const wing = read('app/kits/KitWing.tsx')

  it('offers the designer before the collection, on desktop and on the phone stage', () => {
    expect(wing.match(/\(\['designer', 'collection'\] as const\)/g)).toHaveLength(2)
    expect(wing).not.toContain("(['collection', 'designer'] as const)")
  })

  it('opens on the designer', () => {
    expect(wing).toContain("useState<'collection' | 'designer'>('designer')")
    expect(wing.match(/useState<'collection' \| 'designer'>\('designer'\)/g)).toHaveLength(2)
  })

  it('does not put the historical catalogue in the personal wall: the door leads to the Archive', () => {
    expect(wing).toContain('href={KIT_COLLECTION_HREF}')
    expect(wing).not.toContain('/kits/all')
    // the personal wall is the device's own rebuilds: 168 photographs are not mixed into it
    expect(wing).not.toContain('archiveShirts')
  })
})

describe('the full collection is a real archive route', () => {
  it('is /archive?show=kits and never a route of its own', () => {
    expect(KIT_COLLECTION_HREF).toBe('/archive?show=kits')
    expect(kitCollectionHref()).toBe(KIT_COLLECTION_HREF)
    expect(existsSync(join(ROOT, 'app/kits/all'))).toBe(false)
    expect(read('app/archive/page.tsx')).toContain("searchParams.show === 'kits'")
  })
})

describe('kit master → archive coverage', () => {
  const shelf = kitShelf()

  it('exposes exactly the canonical kit records — publicArchiveKitIds === expectedCanonicalKitIds', () => {
    const expected = kitRecords().map((kit) => kit.id).sort()
    const shown = shelf.map((card) => card.id).sort()
    expect(shown).toEqual(expected)
    expect(new Set(shown).size).toBe(shown.length)
  })

  it('every card carries its season and variant, and the shelf runs oldest first', () => {
    for (const card of shelf) {
      expect(card.kit?.seasonLabel, card.id).toBeTruthy()
      expect(card.kit?.variant, card.id).toBeTruthy()
    }
    const years = shelf.map((card) => card.year ?? 0)
    expect([...years]).toEqual([...years].sort((a, b) => a - b))
  })

  it('every card opens on its own drawer, with sources', () => {
    for (const card of shelf) {
      const detail = detailOf(card.id)
      expect(detail, card.id).not.toBeNull()
      expect(detail?.card.id).toBe(card.id)
      expect(detail?.sources.length, card.id).toBeGreaterThan(0)
    }
  })
})

describe('spoiler rules survive the archive', () => {
  it('a shirt Gate 4 deals shows no maker, sponsor or photograph on its archive card', () => {
    const playable = new Set(playableKits().map((kit) => kit.id))
    expect(playable.size).toBeGreaterThan(0)
    for (const id of playable) {
      const what = detailOf(id)?.what
      expect(what?.kind, id).toBe('kit')
      if (what?.kind === 'kit') {
        expect(what.playable, id).toBe(true)
        expect(what.facts, id).toBeNull()
      }
    }
  })

  it('a shirt the game never asks about shows what the record holds, and nothing it does not', () => {
    const record = kitRecords().find((kit) => !kit.gate4.playable && kit.fields.maker.value)
    expect(record).toBeTruthy()
    const what = detailOf(record?.id ?? '')?.what
    expect(what?.kind).toBe('kit')
    if (what?.kind === 'kit') {
      expect(what.facts?.makerHe).toBe(record?.fields.maker.value?.name ?? null)
      expect(what.facts?.sponsorHe).toBe(record?.fields.sponsor.value?.name ?? null)
    }
    // a field the record leaves empty stays null — never guessed
    for (const kit of kitRecords().filter((k) => !k.gate4.playable && !k.fields.sponsor.value)) {
      const other = detailOf(kit.id)?.what
      if (other?.kind === 'kit') expect(other.facts?.sponsorHe, kit.id).toBeNull()
    }
  })
})
