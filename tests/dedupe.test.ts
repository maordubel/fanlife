import { describe, expect, it } from 'vitest'

import {
  buildAliases,
  findUnresolvedReferences,
  mergeByKey,
  resolveAlias,
} from '@/scripts/ingest/lib/dedupe'
import { emptyBundle, type Confidence, type SourceRef } from '@/scripts/ingest/lib/types'

const source: SourceRef = {
  naturalKey: 'manual:test',
  kind: 'manual',
  title: 'test',
  url: null,
  pageTitle: null,
  revisionId: null,
  retrievedAt: null,
  note: null,
}

const person = (over: Partial<{ slug: string; fullNameHe: string; birthDate: string | null; confidence: Confidence; aliases: string[] }>) => ({
  slug: 'x',
  fullNameHe: 'שחקן',
  birthDate: null as string | null,
  aliases: [] as string[],
  confidence: 1 as Confidence,
  source,
  ...over,
})

describe('mergeByKey', () => {
  it('merges two records that share a key', () => {
    const result = mergeByKey('people', [person({}), person({})], (r) => r.slug)
    expect(result.records).toHaveLength(1)
    expect(result.duplicatesMerged).toBe(1)
  })

  it('is idempotent: merging the merged output changes nothing', () => {
    const once = mergeByKey('people', [person({}), person({})], (r) => r.slug)
    const twice = mergeByKey('people', once.records, (r) => r.slug)
    expect(twice.records).toEqual(once.records)
    expect(twice.duplicatesMerged).toBe(0)
  })

  it('lets the higher-confidence value win and reports the conflict', () => {
    const result = mergeByKey(
      'people',
      [
        person({ birthDate: '1980-01-01', confidence: 1 }),
        person({ birthDate: '1981-01-01', confidence: 3 }),
      ],
      (r) => r.slug,
    )
    expect(result.records[0]?.birthDate).toBe('1981-01-01')
    expect(result.conflicts[0]?.field).toBe('birthDate')
    expect(result.conflicts[0]?.reason).toContain('higher confidence')
  })

  it('fills a gap from the lower-confidence record — absence is not a fact', () => {
    const result = mergeByKey(
      'people',
      [
        person({ birthDate: null, confidence: 3 }),
        person({ birthDate: '1981-01-01', confidence: 1 }),
      ],
      (r) => r.slug,
    )
    expect(result.records[0]?.birthDate).toBe('1981-01-01')
    expect(result.conflicts).toHaveLength(0)
  })

  it('keeps the first value at equal confidence and flags it for review', () => {
    const result = mergeByKey(
      'people',
      [
        person({ birthDate: '1980-01-01', confidence: 2 }),
        person({ birthDate: '1981-01-01', confidence: 2 }),
      ],
      (r) => r.slug,
    )
    expect(result.records[0]?.birthDate).toBe('1980-01-01')
    expect(result.conflicts[0]?.reason).toContain('equal confidence')
  })

  it('unions declared array fields instead of replacing them', () => {
    const result = mergeByKey(
      'people',
      [person({ aliases: ['א'] }), person({ aliases: ['ב'] })],
      (r) => r.slug,
      ['aliases'],
    )
    expect(result.records[0]?.aliases.sort()).toEqual(['א', 'ב'])
  })

  it('keeps records with different keys apart', () => {
    const result = mergeByKey('people', [person({ slug: 'a' }), person({ slug: 'b' })], (r) => r.slug)
    expect(result.records).toHaveLength(2)
    expect(result.duplicatesMerged).toBe(0)
  })
})

describe('buildAliases', () => {
  it('maps every spelling to one entity', () => {
    const { rows } = buildAliases([
      {
        entityTable: 'club',
        scope: 'football',
        entitySlug: 'הפועל-תל-אביב',
        names: ['הפועל תל אביב', 'הפועל ת"א'],
      },
    ])
    expect(resolveAlias(rows, 'club', 'הפועל תא')).toBe('הפועל-תל-אביב')
    expect(resolveAlias(rows, 'club', 'מכבי תל אביב')).toBeNull()
  })

  it('drops an alias claimed by two entities rather than picking one', () => {
    const { rows, collisions } = buildAliases([
      { entityTable: 'person', scope: 'football', entitySlug: 'a', names: ['יוסי כהן'] },
      { entityTable: 'person', scope: 'football', entitySlug: 'b', names: ['יוסי כהן'] },
    ])
    expect(collisions).toHaveLength(1)
    expect(collisions[0]?.claimedBy).toEqual(['person:football:a', 'person:football:b'])
    expect(rows).toHaveLength(0)
  })

  it('lets the same name belong to a football and a basketball entity', () => {
    const { rows, collisions } = buildAliases([
      { entityTable: 'club', scope: 'football', entitySlug: 'hta', names: ['הפועל תל אביב'] },
      {
        entityTable: 'club',
        scope: 'basketball',
        entitySlug: 'hta-bc',
        names: ['הפועל תל אביב (כדורסל)'],
      },
    ])
    expect(collisions).toHaveLength(0)
    expect(resolveAlias(rows, 'club', 'הפועל תל אביב', 'football')).toBe('hta')
    expect(resolveAlias(rows, 'club', 'הפועל תל אביב', 'basketball')).toBe('hta-bc')
  })

  it('does not collide across entity types', () => {
    const { rows, collisions } = buildAliases([
      { entityTable: 'club', scope: 'football', entitySlug: 'a', names: ['הפועל'] },
      { entityTable: 'venue', scope: 'football', entitySlug: 'b', names: ['הפועל'] },
    ])
    // A club and a venue may share a name: the key is (table, scope, normalized).
    expect(collisions).toHaveLength(0)
    expect(resolveAlias(rows, 'club', 'הפועל')).toBe('a')
    expect(resolveAlias(rows, 'venue', 'הפועל')).toBe('b')
  })
})

describe('findUnresolvedReferences', () => {
  it('reports a squad row pointing at a player that is not in the bundle', () => {
    const bundle = emptyBundle()
    bundle.seasons.push({
      label: '2001/02',
      startYear: 2001,
      endYear: 2002,
      eraSlug: null,
      aliases: [],
      source,
      confidence: 1,
    })
    bundle.clubs.push({
      slug: 'c',
      nameHe: 'c',
      nameEn: null,
      city: null,
      sport: 'football',
      isUs: true,
      isDerbyRival: false,
      aliases: [],
      source,
      confidence: 1,
    })
    bundle.squadMemberships.push({
      personSlug: 'missing',
      seasonLabel: '2001/02',
      clubSlug: 'c',
      shirtNumber: 10,
      position: 'MF',
      onLoan: false,
      appearances: null,
      goals: null,
      source,
      confidence: 1,
    })

    const unresolved = findUnresolvedReferences(bundle)
    expect(unresolved).toHaveLength(1)
    expect(unresolved[0]).toMatchObject({ field: 'personSlug', value: 'missing' })
  })

  it('is silent when every reference resolves', () => {
    expect(findUnresolvedReferences(emptyBundle())).toHaveLength(0)
  })
})
