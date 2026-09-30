/**
 * Idempotent loader.
 *
 * Every write is an upsert on a natural key, so running the importer twice produces
 * the same rows. `match_event` is the exception: it is append-only and the database
 * rejects UPDATE, so it is inserted with ignoreDuplicates — INSERT … ON CONFLICT DO
 * NOTHING never fires the immutability trigger.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { AliasRow } from '@/scripts/ingest/lib/dedupe'
import type { IngestReport } from '@/scripts/ingest/lib/report'
import type { StagedBundle } from '@/scripts/ingest/lib/types'

export type LoadCounts = Record<string, number>

export function createLoaderClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to load. ' +
        'Run with --dry-run to stage to disk instead.',
    )
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function loadBundle(
  db: SupabaseClient,
  bundle: StagedBundle,
  aliases: readonly AliasRow[],
  report: IngestReport,
): Promise<LoadCounts> {
  const counts: LoadCounts = {}
  const sourceIds = await upsertSources(db, bundle, report)

  const sourceIdFor = (naturalKey: string): string | null => sourceIds.get(naturalKey) ?? null

  counts.era = await upsert(db, 'era', 'slug', bundle.eras.map((row) => ({
    slug: row.slug,
    name_he: row.nameHe,
    start_year: row.startYear,
    end_year: row.endYear,
    sort_order: row.sortOrder,
  })))

  counts.club = await upsert(db, 'club', 'slug', bundle.clubs.map((row) => ({
    slug: row.slug,
    name_he: row.nameHe,
    name_en: row.nameEn,
    city: row.city,
    sport: row.sport,
    is_us: row.isUs,
    is_derby_rival: row.isDerbyRival,
  })))

  counts.venue = await upsert(db, 'venue', 'slug', bundle.venues.map((row) => ({
    slug: row.slug,
    name_he: row.nameHe,
    city: row.city,
    sport: row.sport,
  })))

  counts.competition = await upsert(db, 'competition', 'slug', bundle.competitions.map((row) => ({
    slug: row.slug,
    name_he: row.nameHe,
    type: row.type,
    sport: row.sport,
    tier: row.tier,
  })))

  const eraIds = await idMap(db, 'era', 'slug')
  counts.season = await upsert(db, 'season', 'label', bundle.seasons.map((row) => ({
    label: row.label,
    start_year: row.startYear,
    end_year: row.endYear,
    era_id: row.eraSlug ? (eraIds.get(row.eraSlug) ?? null) : null,
    source_id: sourceIdFor(row.source.naturalKey),
    confidence: row.confidence,
  })))

  counts.person = await upsert(db, 'person', 'slug', bundle.people.map((row) => ({
    slug: row.slug,
    full_name_he: row.fullNameHe,
    full_name_en: row.fullNameEn,
    birth_date: row.birthDate,
    nationalities: row.nationalities,
    is_youth_product: row.isYouthProduct,
    wiki_page: row.wikiPage,
    source_id: sourceIdFor(row.source.naturalKey),
    confidence: row.confidence,
  })))

  const personIds = await idMap(db, 'person', 'slug')
  const clubIds = await idMap(db, 'club', 'slug')
  const venueIds = await idMap(db, 'venue', 'slug')
  const competitionIds = await idMap(db, 'competition', 'slug')
  const seasonIds = await idMap(db, 'season', 'label')

  const aliasTargets: Record<AliasRow['entityTable'], Map<string, string>> = {
    person: personIds,
    club: clubIds,
    venue: venueIds,
    competition: competitionIds,
  }

  counts.entity_alias = await upsert(
    db,
    'entity_alias',
    'entity_table,scope,normalized',
    aliases
      .map((row) => {
        const entityId = aliasTargets[row.entityTable].get(row.entitySlug)
        if (!entityId) return null
        return {
          entity_table: row.entityTable,
          scope: row.scope,
          entity_id: entityId,
          alias: row.alias,
          normalized: row.normalized,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null),
  )

  counts.squad_membership = await upsert(
    db,
    'squad_membership',
    'person_id,season_id,club_id',
    bundle.squadMemberships
      .map((row) => {
        const personId = personIds.get(row.personSlug)
        const seasonId = seasonIds.get(row.seasonLabel)
        const clubId = clubIds.get(row.clubSlug)
        if (!personId || !seasonId || !clubId) {
          report.unresolved.push({
            entity: 'squadMemberships',
            key: `${row.personSlug}|${row.seasonLabel}`,
            field: !personId ? 'personSlug' : !seasonId ? 'seasonLabel' : 'clubSlug',
            value: !personId ? row.personSlug : !seasonId ? row.seasonLabel : row.clubSlug,
          })
          return null
        }
        return {
          person_id: personId,
          season_id: seasonId,
          club_id: clubId,
          shirt_number: row.shirtNumber,
          position: row.position,
          on_loan: row.onLoan,
          appearances: row.appearances,
          goals: row.goals,
          source_id: sourceIdFor(row.source.naturalKey),
          confidence: row.confidence,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null),
  )

  const matchRows = bundle.matches
    .map((row) => {
      const seasonId = seasonIds.get(row.seasonLabel)
      const competitionId = competitionIds.get(row.competitionSlug)
      const homeId = clubIds.get(row.homeClubSlug)
      const awayId = clubIds.get(row.awayClubSlug)
      if (!seasonId || !competitionId || !homeId || !awayId) return null
      return {
        season_id: seasonId,
        competition_id: competitionId,
        stage: row.stage,
        played_on: row.playedOn,
        kickoff_confirmed: row.kickoffConfirmed,
        home_club_id: homeId,
        away_club_id: awayId,
        venue_id: row.venueSlug ? (venueIds.get(row.venueSlug) ?? null) : null,
        home_score: row.homeScore,
        away_score: row.awayScore,
        status: row.status,
        wiki_page: row.wikiPage,
        source_id: sourceIdFor(row.source.naturalKey),
        confidence: row.confidence,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  counts.match = await upsert(
    db,
    'match',
    'season_id,competition_id,home_club_id,away_club_id,stage',
    matchRows,
  )

  counts.match_event = await appendOnly(db, bundle, {
    personIds,
    clubIds,
    seasonIds,
    competitionIds,
    sourceIdFor,
  })

  Object.assign(
    counts,
    await loadGraph(db, bundle, {
      sourceIdFor,
      clubIds,
      seasonIds,
      competitionIds,
      personIds,
    }),
  )

  return counts
}

/**
 * The knowledge-graph tables: identity, commerce, fan culture, fan ownership.
 * Same rules as the core — natural keys, upserts, and a row that cannot resolve its
 * references is reported rather than invented.
 */
async function loadGraph(
  db: SupabaseClient,
  bundle: StagedBundle,
  ctx: {
    sourceIdFor: (key: string) => string | null
    clubIds: Map<string, string>
    seasonIds: Map<string, string>
    competitionIds: Map<string, string>
    personIds: Map<string, string>
  },
): Promise<LoadCounts> {
  const counts: LoadCounts = {}
  const { sourceIdFor, clubIds, seasonIds, competitionIds, personIds } = ctx

  counts.trophy = await upsert(db, 'trophy', 'competition_id,season_id,club_id',
    bundle.trophies
      .map((row) => {
        const competitionId = competitionIds.get(row.competitionSlug)
        const seasonId = seasonIds.get(row.seasonLabel)
        const clubId = clubIds.get(row.clubSlug)
        if (!competitionId || !seasonId || !clubId) return null
        return {
          competition_id: competitionId,
          season_id: seasonId,
          club_id: clubId,
          sport: row.sport,
          result: row.result,
          note_he: row.noteHe,
          source_id: sourceIdFor(row.source.naturalKey),
          confidence: row.confidence,
        }
      })
      .filter(nonNull))

  counts.moment = await upsert(db, 'moment', 'slug', bundle.moments.map((row) => ({
    slug: row.slug,
    title_he: row.titleHe,
    happened_on: row.happenedOn,
    season_id: row.seasonLabel ? (seasonIds.get(row.seasonLabel) ?? null) : null,
    sport: row.sport,
    category: row.category,
    body_he: row.bodyHe,
    source_id: sourceIdFor(row.source.naturalKey),
    confidence: row.confidence,
  })))

  counts.sponsor = await upsert(db, 'sponsor', 'slug', bundle.sponsors.map((row) => ({
    slug: row.slug,
    name_he: row.nameHe,
    name_en: row.nameEn,
    industry: row.industry,
  })))

  counts.manufacturer = await upsert(db, 'manufacturer', 'slug', bundle.manufacturers.map((row) => ({
    slug: row.slug,
    name_he: row.nameHe,
    name_en: row.nameEn,
  })))

  const sponsorIds = await idMap(db, 'sponsor', 'slug')
  const manufacturerIds = await idMap(db, 'manufacturer', 'slug')

  counts.sponsor_deal = await upsert(db, 'sponsor_deal', 'natural_key',
    bundle.sponsorDeals
      .map((row) => {
        const clubId = clubIds.get(row.clubSlug)
        const sponsorId = sponsorIds.get(row.sponsorSlug)
        if (!clubId || !sponsorId) return null
        return {
          natural_key: row.naturalKey,
          club_id: clubId,
          sponsor_id: sponsorId,
          sport: row.sport,
          placement: row.placement,
          competition_id: row.competitionSlug
            ? (competitionIds.get(row.competitionSlug) ?? null)
            : null,
          from_season: row.fromLabel ? (seasonIds.get(row.fromLabel) ?? null) : null,
          to_season: row.toLabel ? (seasonIds.get(row.toLabel) ?? null) : null,
          from_label: row.fromLabel,
          to_label: row.toLabel,
          ended_early: row.endedEarly,
          note_he: row.noteHe,
          source_id: sourceIdFor(row.source.naturalKey),
          confidence: row.confidence,
        }
      })
      .filter(nonNull))

  counts.kit_supply_spell = await upsert(db, 'kit_supply_spell', 'natural_key',
    bundle.kitSupplySpells
      .map((row) => {
        const clubId = clubIds.get(row.clubSlug)
        const manufacturerId = manufacturerIds.get(row.manufacturerSlug)
        if (!clubId || !manufacturerId) return null
        return {
          natural_key: row.naturalKey,
          club_id: clubId,
          manufacturer_id: manufacturerId,
          sport: row.sport,
          from_season: row.fromLabel ? (seasonIds.get(row.fromLabel) ?? null) : null,
          to_season: row.toLabel ? (seasonIds.get(row.toLabel) ?? null) : null,
          from_label: row.fromLabel,
          to_label: row.toLabel,
          is_current: row.isCurrent,
          source_id: sourceIdFor(row.source.naturalKey),
          confidence: row.confidence,
        }
      })
      .filter(nonNull))

  counts.crest_version = await upsert(db, 'crest_version', 'natural_key',
    bundle.crestVersions
      .map((row) => {
        const clubId = clubIds.get(row.clubSlug)
        if (!clubId) return null
        return {
          natural_key: row.naturalKey,
          club_id: clubId,
          from_year: row.fromYear,
          to_year: row.toYear,
          name_he: row.nameHe,
          change_he: row.changeHe,
          source_id: sourceIdFor(row.source.naturalKey),
          confidence: row.confidence,
        }
      })
      .filter(nonNull))

  counts.fan_group = await upsert(db, 'fan_group', 'slug', bundle.fanGroups.map((row) => ({
    slug: row.slug,
    name_he: row.nameHe,
    former_name_he: row.formerNameHe,
    founded_year: row.foundedYear,
    stand_he: row.standHe,
    club_id: row.clubSlug ? (clubIds.get(row.clubSlug) ?? null) : null,
    sport: row.sport,
    note_he: row.noteHe,
    source_id: sourceIdFor(row.source.naturalKey),
    confidence: row.confidence,
  })))

  const fanGroupIds = await idMap(db, 'fan_group', 'slug')

  counts.song = await upsert(db, 'song', 'slug', bundle.songs.map((row) => ({
    slug: row.slug,
    title_he: row.titleHe,
    sport: row.sport,
    fan_group_id: row.fanGroupSlug ? (fanGroupIds.get(row.fanGroupSlug) ?? null) : null,
    season_introduced: row.seasonLabel ? (seasonIds.get(row.seasonLabel) ?? null) : null,
    season_label: row.seasonLabel,
    lyrics_author_he: row.lyricsAuthorHe,
    original_title: row.originalTitle,
    original_artist: row.originalArtist,
    usable_in_app: row.usableInApp,
    person_id: row.personSlug ? (personIds.get(row.personSlug) ?? null) : null,
    background_he: row.backgroundHe,
    source_id: sourceIdFor(row.source.naturalKey),
    confidence: row.confidence,
  })))

  counts.quote = await upsert(db, 'quote', 'natural_key', bundle.quotes.map((row) => ({
    natural_key: row.naturalKey,
    text_he: row.textHe,
    person_id: row.personSlug ? (personIds.get(row.personSlug) ?? null) : null,
    person_name_he: row.personNameHe,
    said_on: row.saidOn,
    context_he: row.contextHe,
    source_id: sourceIdFor(row.source.naturalKey),
    confidence: row.confidence,
  })))

  counts.association = await upsert(db, 'association', 'slug', bundle.associations.map((row) => ({
    slug: row.slug,
    name_he: row.nameHe,
    registry_id: row.registryId,
    founded_year: row.foundedYear,
    club_id: row.clubSlug ? (clubIds.get(row.clubSlug) ?? null) : null,
    sport: row.sport,
    purpose_he: row.purposeHe,
    source_id: sourceIdFor(row.source.naturalKey),
    confidence: row.confidence,
  })))

  const associationIds = await idMap(db, 'association', 'slug')
  const resolveAssociation = (slug: string): string | null => associationIds.get(slug) ?? null

  counts.association_event = await upsert(db, 'association_event', 'natural_key',
    bundle.associationEvents
      .map((row) => {
        const associationId = resolveAssociation(row.associationSlug)
        if (!associationId) return null
        return {
          natural_key: row.naturalKey,
          association_id: associationId,
          kind: row.kind,
          happened_on: row.happenedOn,
          date_confirmed: row.dateConfirmed,
          title_he: row.titleHe,
          body_he: row.bodyHe,
          votes_for: row.votesFor,
          votes_against: row.votesAgainst,
          abstentions: row.abstentions,
          turnout: row.turnout,
          source_id: sourceIdFor(row.source.naturalKey),
          confidence: row.confidence,
        }
      })
      .filter(nonNull))

  counts.association_role = await upsert(db, 'association_role', 'natural_key',
    bundle.associationRoles
      .map((row) => {
        const associationId = resolveAssociation(row.associationSlug)
        if (!associationId) return null
        return {
          natural_key: row.naturalKey,
          association_id: associationId,
          person_id: row.personSlug ? (personIds.get(row.personSlug) ?? null) : null,
          person_name_he: row.personNameHe,
          role_he: row.roleHe,
          from_date: row.fromDate,
          to_date: row.toDate,
          end_reason_he: row.endReasonHe,
          replaced_by_name_he: row.replacedByNameHe,
          votes: row.votes,
          source_id: sourceIdFor(row.source.naturalKey),
          confidence: row.confidence,
        }
      })
      .filter(nonNull))

  counts.shirt_number_holding = await upsert(db, 'shirt_number_holding', 'natural_key',
    bundle.shirtNumbers
      .map((row) => {
        const seasonId = seasonIds.get(row.seasonLabel)
        const clubId = clubIds.get(row.clubSlug)
        if (!seasonId || !clubId) return null
        return {
          natural_key: row.naturalKey,
          shirt_number: row.shirtNumber,
          season_id: seasonId,
          person_id: personIds.get(row.personSlug) ?? null,
          person_name_he: row.personNameHe,
          club_id: clubId,
          sport: row.sport,
          note_he: row.noteHe,
          source_id: sourceIdFor(row.source.naturalKey),
          confidence: row.confidence,
        }
      })
      .filter(nonNull))

  counts.sponsor_year = await upsert(db, 'sponsor_year', 'natural_key',
    bundle.sponsorYears.map((row) => ({
      natural_key: row.naturalKey,
      year_label_raw: row.yearLabelRaw,
      season_ambiguous: row.seasonAmbiguous,
      main_sponsor_he: row.mainSponsorHe,
      additional_sponsors_he: row.additionalSponsorsHe,
      manufacturer_he: row.manufacturerHe,
      sport: row.sport,
      note_he: row.noteHe,
      source_id: sourceIdFor(row.source.naturalKey),
      confidence: row.confidence,
    })))

  counts.fan_culture = await upsert(db, 'fan_culture', 'slug',
    bundle.fanCulture.map((row) => ({
      slug: row.slug,
      title_he: row.titleHe,
      category: row.category,
      description_he: row.descriptionHe,
      period_he: row.periodHe,
      location_he: row.locationHe,
      sport: row.sport,
      source_id: sourceIdFor(row.source.naturalKey),
      confidence: row.confidence,
    })))

  counts.election = await upsert(db, 'election', 'slug',
    bundle.elections
      .map((row) => {
        const associationId = resolveAssociation(row.associationSlug)
        if (!associationId) return null
        return {
          slug: row.slug,
          association_id: associationId,
          title_he: row.titleHe,
          body_he: row.bodyHe,
          held_on: row.heldOn,
          date_confirmed: row.dateConfirmed,
          method_he: row.methodHe,
          eligible_voters: row.eligibleVoters,
          votes_cast: row.votesCast,
          invalid_votes: row.invalidVotes,
          seats: row.seats,
          figures_approximate: row.figuresApproximate,
          note_he: row.noteHe,
          source_id: sourceIdFor(row.source.naturalKey),
          confidence: row.confidence,
        }
      })
      .filter(nonNull))

  const electionIds = await idMap(db, 'election', 'slug')

  counts.election_candidate = await upsert(db, 'election_candidate', 'natural_key',
    bundle.electionCandidates
      .map((row) => {
        const electionId = electionIds.get(row.electionSlug)
        if (!electionId) return null
        return {
          natural_key: row.naturalKey,
          election_id: electionId,
          person_slug: row.personSlug,
          person_name_he: row.personNameHe,
          votes: row.votes,
          elected: row.elected,
          rank: row.rank,
          occupation_he: row.occupationHe,
          prior_role_he: row.priorRoleHe,
          source_id: sourceIdFor(row.source.naturalKey),
          confidence: row.confidence,
        }
      })
      .filter(nonNull))

  counts.membership_milestone = await upsert(db, 'membership_milestone', 'natural_key',
    bundle.membershipMilestones
      .map((row) => {
        const associationId = resolveAssociation(row.associationSlug)
        if (!associationId) return null
        return {
          natural_key: row.naturalKey,
          association_id: associationId,
          number: row.number,
          person_name_he: row.personNameHe,
          person_id: row.personSlug ? (personIds.get(row.personSlug) ?? null) : null,
          happened_on: row.happenedOn,
          date_confirmed: row.dateConfirmed,
          context_he: row.contextHe,
          source_id: sourceIdFor(row.source.naturalKey),
          confidence: row.confidence,
        }
      })
      .filter(nonNull))

  counts.fact_conflict = await upsert(db, 'fact_conflict', 'natural_key',
    bundle.factConflicts.map((row) => ({
      natural_key: row.naturalKey,
      entity_table: row.entityTable,
      entity_key: row.entityKey,
      field: row.field,
      claim_a: row.claimA,
      claim_b: row.claimB,
      resolution: row.resolution,
      resolved_by: row.resolvedBy ?? null,
      note_he: row.noteHe,
    })))

  return counts
}

function nonNull<T>(row: T | null): row is T {
  return row !== null
}

async function upsertSources(
  db: SupabaseClient,
  bundle: StagedBundle,
  report: IngestReport,
): Promise<Map<string, string>> {
  const seen = new Map<string, (typeof bundle.people)[number]['source']>()
  for (const key of Object.keys(bundle) as Array<keyof StagedBundle>) {
    for (const row of bundle[key] as Array<{ source?: { naturalKey: string } }>) {
      if (row.source) seen.set(row.source.naturalKey, row.source as never)
    }
  }
  for (const source of seen.values()) report.addSource(source)

  await upsert(
    db,
    'source',
    'natural_key',
    [...seen.values()].map((source) => ({
      natural_key: source.naturalKey,
      kind: source.kind,
      title: source.title,
      url: source.url,
      page_title: source.pageTitle,
      revision_id: source.revisionId,
      retrieved_at: source.retrievedAt,
      note: source.note,
    })),
  )

  return idMap(db, 'source', 'natural_key')
}

async function appendOnly(
  db: SupabaseClient,
  bundle: StagedBundle,
  ctx: {
    personIds: Map<string, string>
    clubIds: Map<string, string>
    seasonIds: Map<string, string>
    competitionIds: Map<string, string>
    sourceIdFor: (key: string) => string | null
  },
): Promise<number> {
  if (bundle.matchEvents.length === 0) return 0

  const matchIds = new Map<string, string>()
  const { data } = await db
    .from('match')
    .select('id, season_id, competition_id, home_club_id, away_club_id, stage')
  for (const row of data ?? []) {
    const key = [row.season_id, row.competition_id, row.home_club_id, row.away_club_id, row.stage ?? '']
      .join('|')
    matchIds.set(key, row.id as string)
  }

  const rows = bundle.matchEvents
    .map((event) => {
      const match = bundle.matches.find((item) => item.naturalKey === event.matchNaturalKey)
      if (!match) return null
      const dbKey = [
        ctx.seasonIds.get(match.seasonLabel),
        ctx.competitionIds.get(match.competitionSlug),
        ctx.clubIds.get(match.homeClubSlug),
        ctx.clubIds.get(match.awayClubSlug),
        match.stage ?? '',
      ].join('|')
      const matchId = matchIds.get(dbKey)
      if (!matchId) return null
      return {
        match_id: matchId,
        seq: event.seq,
        minute: event.minute,
        minute_extra: event.minuteExtra,
        type: event.type,
        club_id: event.clubSlug ? (ctx.clubIds.get(event.clubSlug) ?? null) : null,
        person_id: event.personSlug ? (ctx.personIds.get(event.personSlug) ?? null) : null,
        related_person_id: event.relatedPersonSlug
          ? (ctx.personIds.get(event.relatedPersonSlug) ?? null)
          : null,
        source_id: ctx.sourceIdFor(event.source.naturalKey),
        confidence: event.confidence,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  if (rows.length === 0) return 0
  const { error } = await db
    .from('match_event')
    .upsert(rows, { onConflict: 'match_id,seq', ignoreDuplicates: true })
  if (error) throw new Error(`match_event insert failed: ${error.message}`)
  return rows.length
}

async function upsert(
  db: SupabaseClient,
  table: string,
  onConflict: string,
  rows: readonly Record<string, unknown>[],
): Promise<number> {
  if (rows.length === 0) return 0
  for (let index = 0; index < rows.length; index += 500) {
    const { error } = await db
      .from(table)
      .upsert(rows.slice(index, index + 500) as never, { onConflict })
    if (error) throw new Error(`${table} upsert failed: ${error.message}`)
  }
  return rows.length
}

async function idMap(
  db: SupabaseClient,
  table: string,
  keyColumn: string,
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const { data, error } = await db.from(table).select(`id, ${keyColumn}`)
  if (error) throw new Error(`${table} read failed: ${error.message}`)
  for (const row of (data ?? []) as unknown as Array<Record<string, string>>) {
    const key = row[keyColumn]
    if (key) out.set(key, row.id as string)
  }
  return out
}
