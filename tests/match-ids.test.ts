import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  idForNaturalKey,
  isCanonicalMatchId,
  matchKeyResolver,
  type MatchIdEntry,
  type MatchNaturalKey,
} from '@/lib/canon/matchId'
import { serialiseRegistry } from '@/scripts/ingest/lib/matchIds'
import {
  LINEUP_MATCH_KEYS,
  REVIEWED_MATCH_MERGES,
  keyedMatches,
  planMatchRegistry,
} from '@/scripts/ingest/lib/manualMatchIds'

/**
 * `content/manual/match-ids.json` — the rule-35 registry, minted once on 21.9.2026 with
 * Maor's OK (`npm run canon:ids -- --write-ids`). One-way: these tests are what make it so.
 */

const ROOT = join(__dirname, '..')
const FILE = 'content/manual/match-ids.json'
const registry = (JSON.parse(readFileSync(join(ROOT, FILE), 'utf8')) as { records: MatchIdEntry[] }).records
const resolve = matchKeyResolver(registry)

describe('the match id registry', () => {
  it('holds well-formed, unique ids', () => {
    expect(registry.length).toBeGreaterThan(3000)
    for (const entry of registry) {
      expect(isCanonicalMatchId(entry.id), entry.id).toBe(true)
      expect(['football', 'basketball']).toContain(entry.sport)
      // rule 6 — the sport leads the key and agrees with the entry
      expect(entry.naturalKey.startsWith(`${entry.sport}|`), entry.id).toBe(true)
      for (const alias of entry.aliases) expect(alias.startsWith(`${entry.sport}|`)).toBe(true)
    }
    expect(new Set(registry.map((entry) => entry.id)).size).toBe(registry.length)
  })

  it('is frozen — re-running the mint over it changes nothing, byte for byte', () => {
    const plan = planMatchRegistry(ROOT, registry, '2099-01-01')
    expect(plan.minted).toBe(0)
    expect(plan.dialectsAdded).toBe(0)
    expect(serialiseRegistry(plan.records)).toBe(readFileSync(join(ROOT, FILE), 'utf8'))
  })

  it('resolves every match row of both sports', () => {
    for (const match of keyedMatches(ROOT)) {
      expect(idForNaturalKey(registry, match.naturalKey), match.naturalKey).not.toBeNull()
    }
  })

  it('gives every natural key and every dialect key exactly one owner', () => {
    const owner = new Map<string, string>()
    for (const entry of registry) {
      const keys = [entry.naturalKey, ...entry.aliases, ...(entry.dialects ?? []).map((d) => `${d.dialect}:${d.key}`)]
      for (const key of new Set(keys)) {
        expect(owner.get(key) ?? entry.id, key).toBe(entry.id)
        owner.set(key, entry.id)
      }
    }
  })
})

describe('the Salzburg play-off — one match per leg (Maor, 21.9.2026)', () => {
  const first = REVIEWED_MATCH_MERGES[0]!.keys as [MatchNaturalKey, MatchNaturalKey]
  const second = REVIEWED_MATCH_MERGES[1]!.keys[0] as MatchNaturalKey

  it('files both first-leg readings under one id and says why', () => {
    const a = idForNaturalKey(registry, first[0])
    const b = idForNaturalKey(registry, first[1])
    expect(a).not.toBeNull()
    expect(b).toBe(a)
    const entry = registry.find((row) => row.id === a)!
    expect(entry.aliases).toContain(first[1])
    expect(entry.mergeNote).toMatch(/Maor, 21\.9\.2026/)
  })

  it('files the twice-recorded second leg under one id with both dates reachable', () => {
    const rows = keyedMatches(ROOT).filter((row) => row.naturalKey === second)
    expect(rows.map((row) => row.playedOn).sort()).toEqual(['2010-08-24', '2010-08-25'])
    const id = idForNaturalKey(registry, second)
    for (const row of rows) {
      expect(resolve(`match:${row.seasonLabel}:${row.homeClubSlug}:${row.awayClubSlug}:${row.playedOn}`)).toBe(id)
    }
  })

  it('resolves the recorded conflicts about both legs to those ids', () => {
    const conflicts = (JSON.parse(readFileSync(join(ROOT, 'content/manual/fact-conflicts.json'), 'utf8')) as {
      records: { entityTable: string; entityKey: string; field: string }[]
    }).records.filter((row) => row.entityTable === 'match' && row.entityKey.includes('זלצבורג'))
    expect(conflicts.length).toBeGreaterThanOrEqual(2)
    const ids = new Set(conflicts.map((row) => resolve(row.entityKey)))
    expect(ids).toEqual(new Set([idForNaturalKey(registry, first[0]), idForNaturalKey(registry, second)]))
  })
})

describe('every key dialect reaches the same match', () => {
  it('resolves the lineups, the event keys and the moment keys', () => {
    for (const [slug, key] of Object.entries(LINEUP_MATCH_KEYS)) {
      expect(resolve(slug), slug).toBe(idForNaturalKey(registry, key as MatchNaturalKey))
    }
    const events = JSON.parse(readFileSync(join(ROOT, 'content/manual/match-events.json'), 'utf8')).records as {
      matchNaturalKey: string
    }[]
    for (const row of events) expect(resolve(row.matchNaturalKey), row.matchNaturalKey).not.toBeNull()
    const moments = JSON.parse(readFileSync(join(ROOT, 'content/manual/moments.json'), 'utf8')).records as {
      matchNaturalKey?: string | null
    }[]
    for (const row of moments) if (row.matchNaturalKey) expect(resolve(row.matchNaturalKey)).not.toBeNull()
  })

  it('joins the scorer keys on the date and our club — and the score agrees where it can', () => {
    const scorers = JSON.parse(readFileSync(join(ROOT, 'content/manual/match-scorers.json'), 'utf8')).records as {
      matchKey: string
      playedOn: string | null
      homeScore: number
      awayScore: number
    }[]
    const byId = new Map<string, ReturnType<typeof keyedMatches>>()
    for (const row of keyedMatches(ROOT)) {
      const id = idForNaturalKey(registry, row.naturalKey) as string
      byId.set(id, [...(byId.get(id) ?? []), row])
    }
    const conflicted = new Set(
      (JSON.parse(readFileSync(join(ROOT, 'content/manual/fact-conflicts.json'), 'utf8')) as {
        records: { entityTable: string; entityKey: string; field: string }[]
      }).records
        .filter((row) => row.entityTable === 'match' && row.field === 'score')
        .map((row) => resolve(row.entityKey)),
    )
    let joined = 0
    const disagree: string[] = []
    for (const row of scorers) {
      if (!row.matchKey || !row.playedOn) continue
      const id = resolve(row.matchKey)
      if (!id) continue
      joined += 1
      const rows = byId.get(id) ?? []
      expect(rows.some((match) => match.playedOn === row.playedOn), row.matchKey).toBe(true)
      const agrees = rows.some((match) => match.homeScore === row.homeScore && match.awayScore === row.awayScore)
      if (!agrees && !conflicted.has(id)) disagree.push(row.matchKey)
    }
    expect(joined).toBeGreaterThan(2000)
    // a score the two readings disagree on is a recorded conflict, or it is a finding
    expect(disagree).toEqual([])
  })

  it('never lets a European leg reach a match on another date', () => {
    const datesOf = new Map<string, Set<string | null>>()
    for (const row of keyedMatches(ROOT)) {
      const id = resolve(row.naturalKey) as string
      datesOf.set(id, (datesOf.get(id) ?? new Set()).add(row.playedOn))
    }
    let legs = 0
    for (const entry of registry) {
      for (const d of entry.dialects ?? []) {
        if (d.dialect !== 'euro-leg') continue
        legs += 1
        expect(datesOf.get(entry.id)?.has(d.key.slice(-10)), d.key).toBe(true)
      }
    }
    expect(legs).toBeGreaterThan(100)
  })
})
