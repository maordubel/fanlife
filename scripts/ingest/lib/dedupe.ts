/**
 * Deduplication and alias resolution.
 *
 * Everything the importer writes has a natural key, so running the importer twice
 * produces the same rows. Two records that share a key are MERGED, and a merge that
 * would change a fact is recorded as a conflict rather than silently overwritten.
 */

import { normalizeLoose, normalizeName } from './normalize'
import type { Confidence, StagedBundle, BundleKey, Sport } from './types'

export type Conflict = {
  entity: BundleKey
  key: string
  field: string
  kept: unknown
  discarded: unknown
  reason: string
}

export type MergeResult<T> = {
  records: T[]
  duplicatesMerged: number
  conflicts: Conflict[]
}

type Keyed = { confidence: Confidence } & Record<string, unknown>

/**
 * Merge records that share a natural key.
 *
 * Field policy: the value from the higher-confidence record wins. At equal
 * confidence the first-seen value wins and the second is reported as a conflict —
 * never averaged, never last-write-wins.
 */
export function mergeByKey<T extends Keyed>(
  entity: BundleKey,
  records: readonly T[],
  keyOf: (record: T) => string,
  arrayFields: ReadonlyArray<keyof T> = [],
): MergeResult<T> {
  const byKey = new Map<string, T>()
  const conflicts: Conflict[] = []
  let duplicatesMerged = 0

  for (const incoming of records) {
    const key = keyOf(incoming)
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, { ...incoming })
      continue
    }

    duplicatesMerged += 1
    const winner = incoming.confidence > existing.confidence ? incoming : existing
    const loser = winner === incoming ? existing : incoming
    const merged = { ...winner } as T

    for (const field of Object.keys(incoming) as Array<keyof T>) {
      if (field === 'confidence' || field === 'source') continue

      if (arrayFields.includes(field)) {
        const combined = new Set<unknown>([
          ...asArray(existing[field]),
          ...asArray(incoming[field]),
        ])
        merged[field] = [...combined] as T[keyof T]
        continue
      }

      const winnerValue = winner[field]
      const loserValue = loser[field]

      if (winnerValue === null || winnerValue === undefined) {
        // A gap is filled from the lower-confidence record: absence is not a fact.
        merged[field] = loserValue
        continue
      }
      if (
        loserValue !== null &&
        loserValue !== undefined &&
        !shallowEqual(winnerValue, loserValue)
      ) {
        conflicts.push({
          entity,
          key,
          field: String(field),
          kept: winnerValue,
          discarded: loserValue,
          reason:
            winner.confidence === loser.confidence
              ? 'equal confidence — first value kept, review required'
              : `higher confidence (${winner.confidence} > ${loser.confidence}) kept`,
        })
      }
    }

    byKey.set(key, merged)
  }

  return { records: [...byKey.values()], duplicatesMerged, conflicts }
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => item === b[index])
  }
  return a === b
}

/* --------------------------------------------------------------- alias table */

export type AliasRow = {
  entityTable: 'person' | 'club' | 'venue' | 'competition'
  /**
   * Aliases are scoped by sport. "הפועל תל אביב (כדורסל)" normalises to the same
   * string as the football club, and the two must not be forced to collide — they are
   * different entities in different sports, which is exactly the separation this
   * project requires.
   */
  scope: Sport
  entitySlug: string
  alias: string
  normalized: string
}

export type AliasBuildResult = {
  rows: AliasRow[]
  /** A normalised alias claimed by two different entities. Never auto-resolved. */
  collisions: Array<{ normalized: string; claimedBy: string[] }>
}

/**
 * Build the explicit alias table. Fuzzy matching is deliberately absent: fourteen
 * hand-written rows never mis-fire, a similarity score eventually does.
 */
export function buildAliases(
  input: ReadonlyArray<{
    entityTable: AliasRow['entityTable']
    scope: Sport
    entitySlug: string
    names: readonly string[]
  }>,
): AliasBuildResult {
  const owners = new Map<string, { row: AliasRow; claimedBy: Set<string> }>()

  for (const entity of input) {
    for (const name of entity.names) {
      // A person keeps their bracketed qualifier. `normalizeName` strips brackets
      // because on a wiki page title "(כדורגל)" marks the sport, not the name — but on
      // a PERSON "(חלוץ)" is the whole point: it is what separates two men called עומר
      // פרץ. Stripping it silently merges two players into one.
      const normalized =
        entity.entityTable === 'person' ? normalizeLoose(name) : normalizeName(name)
      if (!normalized) continue
      const owner = `${entity.entityTable}:${entity.scope}:${entity.entitySlug}`
      const scopedKey = `${entity.entityTable}|${entity.scope}|${normalized}`
      const existing = owners.get(scopedKey)
      if (existing) {
        existing.claimedBy.add(owner)
        continue
      }
      owners.set(scopedKey, {
        row: {
          entityTable: entity.entityTable,
          scope: entity.scope,
          entitySlug: entity.entitySlug,
          alias: name,
          normalized,
        },
        claimedBy: new Set([owner]),
      })
    }
  }

  const rows: AliasRow[] = []
  const collisions: AliasBuildResult['collisions'] = []
  for (const [scopedKey, entry] of owners) {
    if (entry.claimedBy.size > 1) {
      collisions.push({ normalized: scopedKey, claimedBy: [...entry.claimedBy].sort() })
      continue // ambiguous alias is dropped, not guessed
    }
    rows.push(entry.row)
  }

  return { rows, collisions: collisions.sort((a, b) => a.normalized.localeCompare(b.normalized)) }
}

/** Resolve a raw name to a slug through the alias table. No match → null. */
export function resolveAlias(
  rows: readonly AliasRow[],
  entityTable: AliasRow['entityTable'],
  rawName: string,
  scope: Sport = 'football',
): string | null {
  const needle = normalizeName(rawName)
  const hit = rows.find(
    (row) => row.entityTable === entityTable && row.scope === scope && row.normalized === needle,
  )
  return hit ? hit.entitySlug : null
}

/* ------------------------------------------------------- referential checks */

export type UnresolvedRef = { entity: BundleKey; key: string; field: string; value: string }

/** Every foreign slug in the bundle must exist in the bundle. Nothing is invented. */
export function findUnresolvedReferences(bundle: StagedBundle): UnresolvedRef[] {
  const clubs = new Set(bundle.clubs.map((club) => club.slug))
  const venues = new Set(bundle.venues.map((venue) => venue.slug))
  const competitions = new Set(bundle.competitions.map((competition) => competition.slug))
  const seasons = new Set(bundle.seasons.map((season) => season.label))
  const eras = new Set(bundle.eras.map((era) => era.slug))
  const people = new Set(bundle.people.map((person) => person.slug))
  const matches = new Set(bundle.matches.map((match) => match.naturalKey))

  const out: UnresolvedRef[] = []
  const check = (
    entity: BundleKey,
    key: string,
    field: string,
    value: string | null,
    pool: ReadonlySet<string>,
  ) => {
    if (value === null) return
    if (!pool.has(value)) out.push({ entity, key, field, value })
  }

  for (const season of bundle.seasons) {
    check('seasons', season.label, 'eraSlug', season.eraSlug, eras)
  }
  for (const membership of bundle.squadMemberships) {
    const key = `${membership.personSlug}|${membership.seasonLabel}`
    check('squadMemberships', key, 'personSlug', membership.personSlug, people)
    check('squadMemberships', key, 'seasonLabel', membership.seasonLabel, seasons)
    check('squadMemberships', key, 'clubSlug', membership.clubSlug, clubs)
  }
  for (const match of bundle.matches) {
    const key = match.naturalKey
    check('matches', key, 'seasonLabel', match.seasonLabel, seasons)
    check('matches', key, 'competitionSlug', match.competitionSlug, competitions)
    check('matches', key, 'homeClubSlug', match.homeClubSlug, clubs)
    check('matches', key, 'awayClubSlug', match.awayClubSlug, clubs)
    check('matches', key, 'venueSlug', match.venueSlug, venues)
  }
  const sponsors = new Set(bundle.sponsors.map((row) => row.slug))
  const manufacturers = new Set(bundle.manufacturers.map((row) => row.slug))
  const fanGroups = new Set(bundle.fanGroups.map((row) => row.slug))
  const associations = new Set(bundle.associations.map((row) => row.slug))

  const elections = new Set(bundle.elections.map((row) => row.slug))

  for (const election of bundle.elections) {
    check('elections', election.slug, 'associationSlug', election.associationSlug, associations)
  }
  for (const candidate of bundle.electionCandidates) {
    check(
      'electionCandidates',
      candidate.naturalKey,
      'electionSlug',
      candidate.electionSlug,
      elections,
    )
  }

  for (const trophy of bundle.trophies) {
    check('trophies', trophy.naturalKey, 'competitionSlug', trophy.competitionSlug, competitions)
    check('trophies', trophy.naturalKey, 'seasonLabel', trophy.seasonLabel, seasons)
    check('trophies', trophy.naturalKey, 'clubSlug', trophy.clubSlug, clubs)
  }
  for (const moment of bundle.moments) {
    check('moments', moment.slug, 'seasonLabel', moment.seasonLabel, seasons)
    check('moments', moment.slug, 'matchNaturalKey', moment.matchNaturalKey, matches)
  }
  for (const deal of bundle.sponsorDeals) {
    check('sponsorDeals', deal.naturalKey, 'clubSlug', deal.clubSlug, clubs)
    check('sponsorDeals', deal.naturalKey, 'sponsorSlug', deal.sponsorSlug, sponsors)
    check('sponsorDeals', deal.naturalKey, 'competitionSlug', deal.competitionSlug, competitions)
  }
  for (const spell of bundle.kitSupplySpells) {
    check('kitSupplySpells', spell.naturalKey, 'clubSlug', spell.clubSlug, clubs)
    check('kitSupplySpells', spell.naturalKey, 'manufacturerSlug', spell.manufacturerSlug, manufacturers)
  }
  for (const crest of bundle.crestVersions) {
    check('crestVersions', crest.naturalKey, 'clubSlug', crest.clubSlug, clubs)
  }
  for (const group of bundle.fanGroups) {
    check('fanGroups', group.slug, 'clubSlug', group.clubSlug, clubs)
  }
  for (const song of bundle.songs) {
    check('songs', song.slug, 'fanGroupSlug', song.fanGroupSlug, fanGroups)
    check('songs', song.slug, 'seasonLabel', song.seasonLabel, seasons)
    check('songs', song.slug, 'personSlug', song.personSlug, people)
  }
  for (const quote of bundle.quotes) {
    check('quotes', quote.naturalKey, 'personSlug', quote.personSlug, people)
  }
  for (const association of bundle.associations) {
    check('associations', association.slug, 'clubSlug', association.clubSlug, clubs)
  }
  for (const event of bundle.associationEvents) {
    check('associationEvents', event.naturalKey, 'associationSlug', event.associationSlug, associations)
  }
  for (const role of bundle.associationRoles) {
    check('associationRoles', role.naturalKey, 'associationSlug', role.associationSlug, associations)
    check('associationRoles', role.naturalKey, 'personSlug', role.personSlug, people)
  }
  for (const milestone of bundle.membershipMilestones) {
    check('membershipMilestones', milestone.naturalKey, 'associationSlug', milestone.associationSlug, associations)
    check('membershipMilestones', milestone.naturalKey, 'personSlug', milestone.personSlug, people)
  }
  for (const event of bundle.matchEvents) {
    const key = `${event.matchNaturalKey}#${event.seq}`
    check('matchEvents', key, 'matchNaturalKey', event.matchNaturalKey, matches)
    check('matchEvents', key, 'personSlug', event.personSlug, people)
    check('matchEvents', key, 'relatedPersonSlug', event.relatedPersonSlug, people)
    check('matchEvents', key, 'clubSlug', event.clubSlug, clubs)
  }
  return out
}
