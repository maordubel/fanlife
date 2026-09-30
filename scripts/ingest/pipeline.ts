/**
 * The pipeline: merge -> alias -> referential check -> coverage -> confidence gate.
 * Source-agnostic. It receives staged bundles and produces one clean bundle plus a
 * fully populated report.
 */

import {
  buildAliases,
  findUnresolvedReferences,
  mergeByKey,
  type AliasRow,
} from '@/scripts/ingest/lib/dedupe'
import type { IngestReport } from '@/scripts/ingest/lib/report'
import {
  BUNDLE_KEYS,
  TRIVIA_CONFIDENCE_FLOOR,
  emptyBundle,
  type StagedBundle,
} from '@/scripts/ingest/lib/types'

export type PipelineResult = {
  bundle: StagedBundle
  aliases: AliasRow[]
}

export function concatBundles(bundles: readonly StagedBundle[]): StagedBundle {
  const out = emptyBundle()
  for (const bundle of bundles) {
    for (const key of BUNDLE_KEYS) {
      // Each key's arrays are homogeneous; the cast keeps the loop generic.
      ;(out[key] as unknown[]).push(...(bundle[key] as unknown[]))
    }
  }
  return out
}

export function runPipeline(input: StagedBundle, report: IngestReport): PipelineResult {
  const bundle = emptyBundle()

  const collect = <K extends keyof StagedBundle>(
    key: K,
    keyOf: (record: StagedBundle[K][number]) => string,
    arrayFields: string[] = [],
  ) => {
    const merged = mergeByKey(
      key,
      input[key] as never,
      keyOf as never,
      arrayFields as never,
    )
    bundle[key] = merged.records as StagedBundle[K]
    report.duplicatesMerged += merged.duplicatesMerged
    report.conflicts.push(...merged.conflicts)
    report.countImported(key, merged.records.length)
  }

  collect('eras', (record) => record.slug)
  /**
   * **Known, and deliberately NOT changed here.** A club slug is unique only within a
   * sport (rule 35: the schema's own index is `club_slug_sport_idx on club (slug,
   * sport)`), and this key does not carry the sport — so the two clubs `clubs.json`
   * lists as `הפועל-תל-אביב` (football and basketball) merge into one row here, and
   * their `aliases` are unioned across the sports rule 14 says must never share one.
   *
   * Keying on `${slug}|${sport}` fixes it and was tried on 17.9.2026. It works, and it
   * immediately surfaces two things underneath it that are data decisions rather than
   * code: `הפועל-תל-אביב` and `הפועל-תל-אביב-כדורסל` are two rows for one basketball
   * club and both claim the alias `הפועל תל אביב`, and `מכבי-תל-אביב` carries
   * `isDerbyRival` in both sports. Which slug is the basketball club's is a curation
   * call somebody has to make out loud (rule 7: "resolve by hand, never fuzzily"), and
   * making it inside a football ingest would be the wrong delta deciding it.
   *
   * So it is written down instead of half-done. What the 17.9.2026 ingest DID do is stop
   * adding to the problem: a football club whose slug is already a basketball club's is
   * minted sport-suffixed (`sources/vikipoel-cargo.ts`), so no new cross-sport collision
   * reaches this merge.
   */
  collect('clubs', (record) => record.slug, ['aliases'])
  collect('venues', (record) => record.slug, ['aliases'])
  collect('competitions', (record) => record.slug, ['aliases'])
  collect('seasons', (record) => record.label, ['aliases'])
  collect('people', (record) => record.slug, ['aliases', 'nationalities'])
  collect(
    'squadMemberships',
    (record) => `${record.personSlug}|${record.seasonLabel}|${record.clubSlug}`,
  )
  collect('matches', (record) => record.naturalKey)
  collect('matchEvents', (record) => `${record.matchNaturalKey}#${record.seq}`)
  collect('trophies', (record) => record.naturalKey)
  collect('moments', (record) => record.slug)
  collect('sponsors', (record) => record.slug)
  collect('sponsorDeals', (record) => record.naturalKey)
  collect('manufacturers', (record) => record.slug)
  collect('kitSupplySpells', (record) => record.naturalKey)
  collect('crestVersions', (record) => record.naturalKey)
  collect('fanGroups', (record) => record.slug)
  collect('songs', (record) => record.slug)
  collect('quotes', (record) => record.naturalKey)
  collect('associations', (record) => record.slug)
  collect('associationEvents', (record) => record.naturalKey)
  collect('associationRoles', (record) => record.naturalKey)
  collect('grievances', (record) => record.slug)
  collect('kitDesigns', (record) => record.naturalKey)
  collect('calls', (record) => record.slug)
  collect('enemies', (record) => record.slug)
  collect('shirtNumbers', (record) => record.naturalKey)
  collect('sponsorYears', (record) => record.naturalKey)
  collect('fanCulture', (record) => record.slug)
  collect('elections', (record) => record.slug)
  collect('electionCandidates', (record) => record.naturalKey)
  collect('membershipMilestones', (record) => record.naturalKey)
  collect('factConflicts', (record) => record.naturalKey)

  const aliasResult = buildAliases([
    ...bundle.people.map((person) => ({
      entityTable: 'person' as const,
      scope: 'football' as const,
      entitySlug: person.slug,
      names: [person.fullNameHe, ...person.aliases],
    })),
    ...bundle.clubs.map((club) => ({
      entityTable: 'club' as const,
      scope: club.sport,
      entitySlug: club.slug,
      names: [club.nameHe, ...club.aliases],
    })),
    ...bundle.venues.map((venue) => ({
      entityTable: 'venue' as const,
      scope: venue.sport,
      entitySlug: venue.slug,
      names: [venue.nameHe, ...venue.aliases],
    })),
    ...bundle.competitions.map((competition) => ({
      entityTable: 'competition' as const,
      scope: competition.sport,
      entitySlug: competition.slug,
      names: [competition.nameHe, ...competition.aliases],
    })),
  ])

  for (const collision of aliasResult.collisions) {
    report.rejected.push({
      entity: 'people',
      key: collision.normalized,
      reason: `alias claimed by ${collision.claimedBy.length} entities (${collision.claimedBy.join(', ')}) — resolve by hand, never fuzzily`,
    })
  }

  report.unresolved.push(...findUnresolvedReferences(bundle))

  addCoverage(bundle, report)
  addLowConfidence(bundle, report)

  return { bundle, aliases: aliasResult.rows }
}

function addCoverage(bundle: StagedBundle, report: IngestReport): void {
  report.coverage.push(
    {
      entity: 'people',
      field: 'birthDate',
      present: bundle.people.filter((person) => person.birthDate !== null).length,
      total: bundle.people.length,
    },
    {
      entity: 'people',
      field: 'nationalities',
      present: bundle.people.filter((person) => person.nationalities.length > 0).length,
      total: bundle.people.length,
    },
    {
      entity: 'squadMemberships',
      field: 'shirtNumber',
      present: bundle.squadMemberships.filter((row) => row.shirtNumber !== null).length,
      total: bundle.squadMemberships.length,
    },
    {
      entity: 'squadMemberships',
      field: 'position',
      present: bundle.squadMemberships.filter((row) => row.position !== 'UNK').length,
      total: bundle.squadMemberships.length,
    },
    {
      entity: 'matches',
      field: 'playedOn',
      present: bundle.matches.filter((match) => match.playedOn !== null).length,
      total: bundle.matches.length,
    },
    {
      entity: 'matches',
      field: 'score',
      present: bundle.matches.filter((match) => match.homeScore !== null).length,
      total: bundle.matches.length,
    },
    {
      entity: 'seasons',
      field: 'eraSlug',
      present: bundle.seasons.filter((season) => season.eraSlug !== null).length,
      total: bundle.seasons.length,
    },
    {
      entity: 'songs',
      field: 'originalTitle',
      present: bundle.songs.filter((song) => song.originalTitle !== null).length,
      total: bundle.songs.length,
    },
    {
      entity: 'associationEvents',
      field: 'dateConfirmed',
      present: bundle.associationEvents.filter((event) => event.dateConfirmed).length,
      total: bundle.associationEvents.length,
    },
    {
      entity: 'sponsorDeals',
      field: 'fromLabel',
      present: bundle.sponsorDeals.filter((deal) => deal.fromLabel !== null).length,
      total: bundle.sponsorDeals.length,
    },
  )
}

function addLowConfidence(bundle: StagedBundle, report: IngestReport): void {
  const push = <T extends { confidence: number }>(
    entity: (typeof BUNDLE_KEYS)[number],
    rows: readonly T[],
    keyOf: (row: T) => string,
  ) => {
    for (const row of rows) {
      if (row.confidence < TRIVIA_CONFIDENCE_FLOOR) {
        report.lowConfidence.push({
          entity,
          key: keyOf(row),
          confidence: row.confidence as 0 | 1,
        })
      }
    }
  }

  push('eras', bundle.eras, (row) => row.slug)
  push('clubs', bundle.clubs, (row) => row.slug)
  push('venues', bundle.venues, (row) => row.slug)
  push('competitions', bundle.competitions, (row) => row.slug)
  push('seasons', bundle.seasons, (row) => row.label)
  push('people', bundle.people, (row) => row.slug)
  push('squadMemberships', bundle.squadMemberships, (row) => `${row.personSlug}|${row.seasonLabel}`)
  push('matches', bundle.matches, (row) => row.naturalKey)
  push('matchEvents', bundle.matchEvents, (row) => `${row.matchNaturalKey}#${row.seq}`)
  push('trophies', bundle.trophies, (row) => row.naturalKey)
  push('moments', bundle.moments, (row) => row.slug)
  push('sponsorDeals', bundle.sponsorDeals, (row) => row.naturalKey)
  push('kitSupplySpells', bundle.kitSupplySpells, (row) => row.naturalKey)
  push('crestVersions', bundle.crestVersions, (row) => row.naturalKey)
  push('fanGroups', bundle.fanGroups, (row) => row.slug)
  push('songs', bundle.songs, (row) => row.slug)
  push('quotes', bundle.quotes, (row) => row.naturalKey)
  push('associationEvents', bundle.associationEvents, (row) => row.naturalKey)
  push('associationRoles', bundle.associationRoles, (row) => row.naturalKey)
  push('membershipMilestones', bundle.membershipMilestones, (row) => row.naturalKey)
}
