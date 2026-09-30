/**
 * Manual source: curated JSON in `content/manual/`.
 *
 * This is the path for everything a human or a verified web source supplies and the
 * wiki cannot. It runs through exactly the same normalisation, dedupe, confidence and
 * reporting as the wiki source — a curated fact is not a privileged fact.
 *
 * Each file declares its own `confidence` and `source`, and may override both per
 * record, because one research pass produces facts of different evidential strength.
 */

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

import { canonicalSeasonLabel, parsePosition, parseShirtNumber, slugify } from '@/scripts/ingest/lib/normalize'
import type { IngestReport } from '@/scripts/ingest/lib/report'
import {
  emptyBundle,
  type BundleKey,
  type Confidence,
  type SourceRef,
  type StagedBundle,
} from '@/scripts/ingest/lib/types'

export const MANUAL_DIR = 'content/manual'

type Row = Record<string, unknown>

type ManualFile = {
  note?: string
  confidence: Confidence
  source: { title: string; url?: string | null; kind?: SourceRef['kind'] }
  generate?: { from?: string; to?: string }
  records: Row[]
}

type FileSpec = {
  file: string
  entity: BundleKey
  map: (row: Row, ctx: RowContext) => unknown | null
}

type RowContext = { source: SourceRef; confidence: Confidence; index: number; report: IngestReport }

/* ------------------------------------------------------------------ helpers */

const str = (row: Row, key: string): string | null => {
  const value = row[key]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}
const req = (row: Row, key: string): string => {
  const value = str(row, key)
  if (value === null) throw new Error(`missing required field "${key}"`)
  return value
}
const num = (row: Row, key: string): number | null =>
  typeof row[key] === 'number' ? (row[key] as number) : null
const bool = (row: Row, key: string, fallback = false): boolean =>
  typeof row[key] === 'boolean' ? (row[key] as boolean) : fallback
const list = (row: Row, key: string): string[] =>
  Array.isArray(row[key]) ? (row[key] as unknown[]).map(String) : []
const sport = (row: Row): 'football' | 'basketball' =>
  row.sport === 'basketball' ? 'basketball' : 'football'
const season = (row: Row, key: string): string | null => {
  const raw = str(row, key)
  return raw === null ? null : canonicalSeasonLabel(raw).label
}

const SPECS: FileSpec[] = [
  {
    file: 'clubs.json',
    entity: 'clubs',
    map: (row, ctx) => ({
      slug: str(row, 'slug') ?? slugify(req(row, 'nameHe')),
      nameHe: req(row, 'nameHe'),
      nameEn: str(row, 'nameEn'),
      city: str(row, 'city'),
      sport: sport(row),
      isUs: bool(row, 'isUs'),
      isDerbyRival: bool(row, 'isDerbyRival'),
      aliases: list(row, 'aliases'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'venues.json',
    entity: 'venues',
    map: (row, ctx) => ({
      slug: str(row, 'slug') ?? slugify(req(row, 'nameHe')),
      nameHe: req(row, 'nameHe'),
      city: str(row, 'city'),
      sport: sport(row),
      aliases: list(row, 'aliases'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'competitions.json',
    entity: 'competitions',
    map: (row, ctx) => ({
      slug: str(row, 'slug') ?? slugify(req(row, 'nameHe')),
      nameHe: req(row, 'nameHe'),
      type: (str(row, 'type') ?? 'other') as 'league',
      sport: sport(row),
      tier: num(row, 'tier'),
      aliases: list(row, 'aliases'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'eras.json',
    entity: 'eras',
    map: (row, ctx) => ({
      slug: req(row, 'slug'),
      nameHe: req(row, 'nameHe'),
      startYear: num(row, 'startYear') ?? 0,
      endYear: num(row, 'endYear'),
      sortOrder: num(row, 'sortOrder') ?? 0,
      ...fact(row, ctx),
    }),
  },
  {
    file: 'people.json',
    entity: 'people',
    map: (row, ctx) => ({
      slug: str(row, 'slug') ?? slugify(req(row, 'fullNameHe')),
      fullNameHe: req(row, 'fullNameHe'),
      fullNameEn: str(row, 'fullNameEn'),
      birthDate: str(row, 'birthDate'),
      nationalities: list(row, 'nationalities'),
      isYouthProduct: typeof row.isYouthProduct === 'boolean' ? row.isYouthProduct : null,
      wikiPage: null,
      aliases: list(row, 'aliases').length > 0 ? list(row, 'aliases') : [req(row, 'fullNameHe')],
      ...fact(row, ctx),
    }),
  },
  {
    // The all-time roster: names only, merged into `people` by slug. A curated record
    // at higher confidence wins the merge and keeps its detail; the roster entry only
    // ever adds a person who was otherwise missing.
    file: 'players-roster.json',
    entity: 'people',
    map: (row, ctx) => ({
      slug: str(row, 'slug') ?? slugify(req(row, 'fullNameHe')),
      fullNameHe: req(row, 'fullNameHe'),
      fullNameEn: null,
      birthDate: null,
      nationalities: [],
      isYouthProduct: null,
      wikiPage: null,
      aliases: list(row, 'aliases').length > 0 ? list(row, 'aliases') : [req(row, 'fullNameHe')],
      ...fact(row, ctx),
    }),
  },
  {
    file: 'squads.json',
    entity: 'squadMemberships',
    map: (row, ctx) => ({
      personSlug: str(row, 'personSlug') ?? slugify(req(row, 'personName')),
      seasonLabel: canonicalSeasonLabel(req(row, 'seasonLabel')).label,
      clubSlug: req(row, 'clubSlug'),
      shirtNumber: parseShirtNumber((row.shirtNumber as string | number | null) ?? null),
      position: parsePosition(str(row, 'position')),
      onLoan: bool(row, 'onLoan'),
      appearances: num(row, 'appearances'),
      goals: num(row, 'goals'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'matches.json',
    entity: 'matches',
    map: (row, ctx) => {
      const seasonLabel = canonicalSeasonLabel(req(row, 'seasonLabel')).label
      const stage = str(row, 'stage')
      return {
        naturalKey: [
          seasonLabel,
          req(row, 'competitionSlug'),
          req(row, 'homeClubSlug'),
          req(row, 'awayClubSlug'),
          stage ?? '',
        ].join('|'),
        seasonLabel,
        competitionSlug: req(row, 'competitionSlug'),
        stage,
        playedOn: str(row, 'playedOn'),
        kickoffConfirmed: false,
        homeClubSlug: req(row, 'homeClubSlug'),
        awayClubSlug: req(row, 'awayClubSlug'),
        venueSlug: str(row, 'venueSlug'),
        homeScore: num(row, 'homeScore'),
        awayScore: num(row, 'awayScore'),
        status: (str(row, 'status') ?? 'unknown') as 'played',
        wikiPage: null,
        ...fact(row, ctx),
      }
    },
  },
  {
    file: 'match-events.json',
    entity: 'matchEvents',
    map: (row, ctx) => ({
      matchNaturalKey: req(row, 'matchNaturalKey'),
      seq: num(row, 'seq') ?? ctx.index + 1,
      minute: num(row, 'minute'),
      minuteExtra: num(row, 'minuteExtra'),
      type: req(row, 'type') as 'goal',
      clubSlug: str(row, 'clubSlug'),
      personSlug: str(row, 'personSlug'),
      relatedPersonSlug: str(row, 'relatedPersonSlug'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'trophies.json',
    entity: 'trophies',
    map: (row, ctx) => {
      const seasonLabel = canonicalSeasonLabel(req(row, 'seasonLabel')).label
      return {
        naturalKey: [req(row, 'competitionSlug'), seasonLabel, req(row, 'clubSlug')].join('|'),
        competitionSlug: req(row, 'competitionSlug'),
        seasonLabel,
        clubSlug: req(row, 'clubSlug'),
        sport: sport(row),
        result: (str(row, 'result') ?? 'won') as 'won',
        noteHe: str(row, 'noteHe'),
        ...fact(row, ctx),
      }
    },
  },
  {
    file: 'moments.json',
    entity: 'moments',
    map: (row, ctx) => ({
      slug: req(row, 'slug'),
      titleHe: req(row, 'titleHe'),
      happenedOn: str(row, 'happenedOn'),
      seasonLabel: season(row, 'seasonLabel'),
      matchNaturalKey: str(row, 'matchNaturalKey'),
      sport: sport(row),
      category: str(row, 'category'),
      bodyHe: req(row, 'bodyHe'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'sponsors.json',
    entity: 'sponsors',
    map: (row, ctx) => ({
      slug: str(row, 'slug') ?? slugify(req(row, 'nameHe')),
      nameHe: req(row, 'nameHe'),
      nameEn: str(row, 'nameEn'),
      industry: str(row, 'industry'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'sponsor-deals.json',
    entity: 'sponsorDeals',
    map: (row, ctx) => ({
      // The competition is part of the key: one season can hold two deals.
      naturalKey: [
        req(row, 'clubSlug'),
        sport(row),
        req(row, 'sponsorSlug'),
        str(row, 'placement') ?? 'front',
        str(row, 'fromLabel') ?? '',
        str(row, 'competitionSlug') ?? 'all',
      ].join('|'),
      clubSlug: req(row, 'clubSlug'),
      sponsorSlug: req(row, 'sponsorSlug'),
      sport: sport(row),
      placement: (str(row, 'placement') ?? 'front') as 'front',
      competitionSlug: str(row, 'competitionSlug'),
      fromLabel: str(row, 'fromLabel'),
      toLabel: str(row, 'toLabel'),
      endedEarly: bool(row, 'endedEarly'),
      noteHe: str(row, 'noteHe'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'manufacturers.json',
    entity: 'manufacturers',
    map: (row, ctx) => ({
      slug: str(row, 'slug') ?? slugify(req(row, 'nameHe')),
      nameHe: req(row, 'nameHe'),
      nameEn: str(row, 'nameEn'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'kit-supply.json',
    entity: 'kitSupplySpells',
    map: (row, ctx) => ({
      naturalKey: [
        req(row, 'clubSlug'),
        sport(row),
        req(row, 'manufacturerSlug'),
        str(row, 'fromLabel') ?? '',
      ].join('|'),
      clubSlug: req(row, 'clubSlug'),
      manufacturerSlug: req(row, 'manufacturerSlug'),
      sport: sport(row),
      fromLabel: str(row, 'fromLabel'),
      toLabel: str(row, 'toLabel'),
      isCurrent: bool(row, 'isCurrent'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'crest-versions.json',
    entity: 'crestVersions',
    map: (row, ctx) => ({
      naturalKey: [req(row, 'clubSlug'), String(num(row, 'fromYear'))].join('|'),
      clubSlug: req(row, 'clubSlug'),
      fromYear: num(row, 'fromYear') ?? 0,
      toYear: num(row, 'toYear'),
      nameHe: req(row, 'nameHe'),
      changeHe: str(row, 'changeHe'),
      imageKey: str(row, 'imageKey'),
      yearOnBadge: num(row, 'yearOnBadge'),
      hasKeter: bool(row, 'hasKeter'),
      stars: num(row, 'stars') ?? 0,
      noteHe: req(row, 'noteHe'),
      sport: sport(row),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'fan-groups.json',
    entity: 'fanGroups',
    map: (row, ctx) => ({
      slug: str(row, 'slug') ?? slugify(req(row, 'nameHe')),
      nameHe: req(row, 'nameHe'),
      formerNameHe: str(row, 'formerNameHe'),
      foundedYear: num(row, 'foundedYear'),
      standHe: str(row, 'standHe'),
      clubSlug: str(row, 'clubSlug'),
      sport: sport(row),
      noteHe: str(row, 'noteHe'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'songs.json',
    entity: 'songs',
    map: (row, ctx) => ({
      slug: str(row, 'slug') ?? slugify(req(row, 'titleHe')),
      titleHe: req(row, 'titleHe'),
      songType: (str(row, 'songType') ?? 'terrace_song') as 'terrace_song',
      personNameHe: str(row, 'personNameHe'),
      sport: sport(row),
      fanGroupSlug: str(row, 'fanGroupSlug'),
      seasonLabel: season(row, 'seasonLabel'),
      lyricsAuthorHe: str(row, 'lyricsAuthorHe'),
      originalTitle: str(row, 'originalTitle'),
      originalArtist: str(row, 'originalArtist'),
      personSlug: str(row, 'personSlug'),
      // A hand-curated song is usable unless the file says otherwise; an IMPORTED one
      // is decided by the wiki's own marks (see sources/redfans-songs.ts).
      usableInApp: row.usableInApp !== false,
      backgroundHe: str(row, 'backgroundHe'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'quotes.json',
    entity: 'quotes',
    map: (row, ctx) => ({
      naturalKey: [str(row, 'personNameHe') ?? '', req(row, 'textHe').slice(0, 60)].join('|'),
      textHe: req(row, 'textHe'),
      personSlug: str(row, 'personSlug'),
      personNameHe: str(row, 'personNameHe'),
      saidOn: str(row, 'saidOn'),
      contextHe: str(row, 'contextHe'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'associations.json',
    entity: 'associations',
    map: (row, ctx) => ({
      slug: str(row, 'slug') ?? slugify(req(row, 'nameHe')),
      nameHe: req(row, 'nameHe'),
      registryId: str(row, 'registryId'),
      foundedYear: num(row, 'foundedYear'),
      clubSlug: str(row, 'clubSlug'),
      sport: sport(row),
      purposeHe: str(row, 'purposeHe'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'association-events.json',
    entity: 'associationEvents',
    map: (row, ctx) => ({
      naturalKey: [req(row, 'associationSlug'), req(row, 'kind'), req(row, 'titleHe')].join('|'),
      associationSlug: req(row, 'associationSlug'),
      kind: req(row, 'kind') as 'founding',
      happenedOn: str(row, 'happenedOn'),
      dateConfirmed: bool(row, 'dateConfirmed'),
      titleHe: req(row, 'titleHe'),
      bodyHe: str(row, 'bodyHe'),
      votesFor: num(row, 'votesFor'),
      votesAgainst: num(row, 'votesAgainst'),
      abstentions: num(row, 'abstentions'),
      turnout: num(row, 'turnout'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'association-roles.json',
    entity: 'associationRoles',
    map: (row, ctx) => ({
      naturalKey: [
        req(row, 'associationSlug'),
        req(row, 'personNameHe'),
        req(row, 'roleHe'),
        str(row, 'fromDate') ?? '',
      ].join('|'),
      associationSlug: req(row, 'associationSlug'),
      personSlug: str(row, 'personSlug'),
      personNameHe: req(row, 'personNameHe'),
      roleHe: req(row, 'roleHe'),
      fromDate: str(row, 'fromDate'),
      toDate: str(row, 'toDate'),
      endReasonHe: str(row, 'endReasonHe'),
      replacedByNameHe: str(row, 'replacedByNameHe'),
      votes: num(row, 'votes'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'elections.json',
    entity: 'elections',
    map: (row, ctx) => ({
      slug: req(row, 'slug'),
      associationSlug: req(row, 'associationSlug'),
      titleHe: req(row, 'titleHe'),
      bodyHe: req(row, 'bodyHe'),
      heldOn: str(row, 'heldOn'),
      dateConfirmed: bool(row, 'dateConfirmed'),
      methodHe: str(row, 'methodHe'),
      eligibleVoters: num(row, 'eligibleVoters'),
      votesCast: num(row, 'votesCast'),
      invalidVotes: num(row, 'invalidVotes'),
      seats: num(row, 'seats'),
      figuresApproximate: bool(row, 'figuresApproximate'),
      noteHe: str(row, 'noteHe'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'election-candidates.json',
    entity: 'electionCandidates',
    map: (row, ctx) => ({
      naturalKey: [req(row, 'electionSlug'), req(row, 'personNameHe')].join('|'),
      electionSlug: req(row, 'electionSlug'),
      personSlug: req(row, 'personSlug'),
      personNameHe: req(row, 'personNameHe'),
      votes: num(row, 'votes'),
      elected: bool(row, 'elected'),
      rank: num(row, 'rank'),
      occupationHe: str(row, 'occupationHe'),
      priorRoleHe: str(row, 'priorRoleHe'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'membership-milestones.json',
    entity: 'membershipMilestones',
    map: (row, ctx) => ({
      naturalKey: [req(row, 'associationSlug'), String(num(row, 'number'))].join('|'),
      associationSlug: req(row, 'associationSlug'),
      number: num(row, 'number') ?? 0,
      personNameHe: req(row, 'personNameHe'),
      personSlug: str(row, 'personSlug'),
      happenedOn: str(row, 'happenedOn'),
      dateConfirmed: bool(row, 'dateConfirmed'),
      contextHe: str(row, 'contextHe'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'grievances.json',
    entity: 'grievances',
    map: (row, ctx) => ({
      slug: req(row, 'slug'),
      kind: req(row, 'kind') as 'event',
      titleHe: req(row, 'titleHe'),
      happenedOn: str(row, 'happenedOn'),
      dateConfirmed: bool(row, 'dateConfirmed'),
      personNameHe: str(row, 'personNameHe'),
      bodyHe: req(row, 'bodyHe'),
      feeEur: num(row, 'feeEur'),
      toClubHe: str(row, 'toClubHe'),
      sport: sport(row),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'kit-designs.json',
    entity: 'kitDesigns',
    map: (row, ctx) => ({
      naturalKey: [req(row, 'seasonLabel'), req(row, 'variant')].join('|'),
      seasonLabel: req(row, 'seasonLabel'),
      variant: req(row, 'variant') as 'home',
      makerHe: str(row, 'makerHe'),
      sponsorHe: str(row, 'sponsorHe'),
      base: req(row, 'base'),
      pattern: req(row, 'pattern'),
      patternInk: req(row, 'patternInk'),
      sleeves: req(row, 'sleeves'),
      sleeveInk: req(row, 'sleeveInk'),
      collar: req(row, 'collar'),
      collarInk: req(row, 'collarInk'),
      shorts: req(row, 'shorts'),
      socks: req(row, 'socks'),
      noteHe: req(row, 'noteHe'),
      sport: sport(row),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'calls.json',
    entity: 'calls',
    map: (row, ctx) => ({
      slug: req(row, 'slug'),
      shape: req(row, 'shape') as 'match',
      textHe: req(row, 'textHe'),
      speakerHe: req(row, 'speakerHe'),
      roleHe: req(row, 'roleHe'),
      answerHe: req(row, 'answerHe'),
      distractorsHe: (Array.isArray(row.distractorsHe) ? row.distractorsHe : []).map(String),
      contextHe: req(row, 'contextHe'),
      sport: sport(row),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'enemies.json',
    entity: 'enemies',
    map: (row, ctx) => ({
      slug: req(row, 'slug'),
      nameHe: req(row, 'nameHe'),
      latin: req(row, 'latin'),
      category: req(row, 'category') as 'owner',
      eraHe: req(row, 'eraHe'),
      terraceRank: num(row, 'terraceRank') ?? 99,
      chargeHe: req(row, 'chargeHe'),
      // detailHe is OPTIONAL on purpose. The charge is the terrace's, and it always
      // exists; the detail is what a source states, and for three of the fifty-six no
      // source could be found. An empty detail prints the charge alone — rule 11 says
      // unreadable field → null, never a filled-in guess.
      detailHe: str(row, 'detailHe') ?? '',
      keyFactHe: req(row, 'keyFactHe'),
      happenedOn: str(row, 'happenedOn'),
      sport: sport(row),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'shirt-numbers.json',
    entity: 'shirtNumbers',
    map: (row, ctx) => ({
      naturalKey: [
        String(num(row, 'shirtNumber')),
        canonicalSeasonLabel(req(row, 'seasonLabel')).label,
        req(row, 'personNameHe'),
      ].join('|'),
      shirtNumber: num(row, 'shirtNumber') ?? 0,
      seasonLabel: canonicalSeasonLabel(req(row, 'seasonLabel')).label,
      personSlug: str(row, 'personSlug') ?? slugify(req(row, 'personNameHe')),
      personNameHe: req(row, 'personNameHe'),
      clubSlug: req(row, 'clubSlug'),
      sport: sport(row),
      noteHe: str(row, 'noteHe'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'sponsor-years.json',
    entity: 'sponsorYears',
    map: (row, ctx) => ({
      naturalKey: [req(row, 'yearLabelRaw'), req(row, 'mainSponsorHe')].join('|'),
      yearLabelRaw: req(row, 'yearLabelRaw'),
      seasonAmbiguous: bool(row, 'seasonAmbiguous'),
      mainSponsorHe: req(row, 'mainSponsorHe'),
      additionalSponsorsHe: list(row, 'additionalSponsorsHe'),
      manufacturerHe: str(row, 'manufacturerHe'),
      sport: sport(row),
      noteHe: str(row, 'noteHe'),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'fan-culture.json',
    entity: 'fanCulture',
    map: (row, ctx) => ({
      slug: req(row, 'slug'),
      titleHe: req(row, 'titleHe'),
      category: req(row, 'category') as 'chant',
      descriptionHe: req(row, 'descriptionHe'),
      periodHe: str(row, 'periodHe'),
      locationHe: str(row, 'locationHe'),
      sport: sport(row),
      ...fact(row, ctx),
    }),
  },
  {
    file: 'fact-conflicts.json',
    entity: 'factConflicts',
    map: (row, ctx) => ({
      naturalKey: [req(row, 'entityTable'), str(row, 'entityKey') ?? '', req(row, 'field')].join('|'),
      entityTable: req(row, 'entityTable'),
      entityKey: str(row, 'entityKey'),
      field: req(row, 'field'),
      claimA: req(row, 'claimA'),
      claimB: req(row, 'claimB'),
      sourceAUrl: str(row, 'sourceAUrl'),
      sourceBUrl: str(row, 'sourceBUrl'),
      noteHe: str(row, 'noteHe'),
      resolution: str(row, 'resolution'),
      resolvedBy: str(row, 'resolvedBy'),
      ...fact(row, ctx),
    }),
  },
]

/** Per-row source and confidence overrides — one research pass yields mixed evidence. */
function fact(row: Row, ctx: RowContext): { source: SourceRef; confidence: Confidence } {
  const url = str(row, 'sourceUrl')
  const title = str(row, 'sourceTitle')
  const confidence =
    typeof row.confidence === 'number' ? (row.confidence as Confidence) : ctx.confidence

  if (url === null && title === null) return { source: ctx.source, confidence }

  return {
    confidence,
    source: {
      naturalKey: `manual:${url ?? title}`,
      kind: (str(row, 'sourceKind') as SourceRef['kind'] | null) ?? ctx.source.kind,
      title: title ?? url ?? ctx.source.title,
      url,
      pageTitle: null,
      revisionId: null,
      retrievedAt: str(row, 'retrievedAt'),
      note: null,
    },
  }
}

export function loadManualBundle(root: string, report: IngestReport): StagedBundle {
  const bundle = emptyBundle()

  for (const spec of SPECS) {
    const path = join(root, MANUAL_DIR, spec.file)
    if (!existsSync(path)) {
      report.note(`manual source ${spec.file} not present — skipped`)
      continue
    }

    const file = JSON.parse(readFileSync(path, 'utf8')) as ManualFile
    if (!Array.isArray(file.records)) {
      report.rejected.push({ entity: 'page', key: spec.file, reason: 'file has no records array' })
      continue
    }
    if (typeof file.confidence !== 'number' || file.confidence < 0 || file.confidence > 3) {
      report.rejected.push({ entity: 'page', key: spec.file, reason: 'file has no valid confidence 0-3' })
      continue
    }

    const source: SourceRef = {
      naturalKey: `manual:${spec.file}`,
      kind: file.source?.kind ?? 'manual',
      title: file.source?.title ?? spec.file,
      url: file.source?.url ?? null,
      pageTitle: null,
      revisionId: null,
      retrievedAt: null,
      note: file.note ?? null,
    }
    report.addSource(source)
    if (file.note) report.note(`${spec.file}: ${file.note}`)

    const rows: Row[] =
      spec.entity === 'seasons' ? [] : file.records // seasons handled below, with the range

    for (const [index, row] of rows.entries()) {
      try {
        const mapped = spec.map(row, { source, confidence: file.confidence, index, report })
        if (mapped === null) continue
        ;(bundle[spec.entity] as unknown[]).push(mapped)
      } catch (error) {
        // A bad row is named and dropped — never silently skipped, never guessed.
        report.rejected.push({
          entity: spec.entity,
          key: `${spec.file}#${index}`,
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    }
    report.countDiscovered(`manual:${spec.entity}`, rows.length)
  }

  loadSeasons(root, report, bundle)
  return bundle
}

/** Seasons are their own case: the file may declare a calendar range to expand. */
function loadSeasons(root: string, report: IngestReport, bundle: StagedBundle): void {
  const path = join(root, MANUAL_DIR, 'seasons.json')
  if (!existsSync(path)) return

  const file = JSON.parse(readFileSync(path, 'utf8')) as ManualFile
  const source: SourceRef = {
    naturalKey: 'manual:seasons.json',
    kind: file.source?.kind ?? 'manual',
    title: file.source?.title ?? 'seasons.json',
    url: file.source?.url ?? null,
    pageTitle: null,
    revisionId: null,
    retrievedAt: null,
    note: file.note ?? null,
  }
  report.addSource(source)
  if (file.note) report.note(`seasons.json: ${file.note}`)

  const entries: Array<{ label: string; eraSlug: string | null; aliases: string[] }> = []

  if (file.generate?.from && file.generate?.to) {
    const from = canonicalSeasonLabel(file.generate.from)
    const to = canonicalSeasonLabel(file.generate.to)
    if (to.startYear < from.startYear) {
      report.rejected.push({ entity: 'seasons', key: 'generate', reason: 'range runs backwards' })
    } else {
      for (let year = from.startYear; year <= to.startYear; year += 1) {
        entries.push({ label: `${year}/${String(year + 1).slice(-2)}`, eraSlug: null, aliases: [] })
      }
      report.note(
        `seasons: generated ${entries.length} calendar labels ${from.label}–${to.label}. ` +
          'A label is a calendar scaffold, not a claim that the club competed that season.',
      )
    }
  }

  for (const record of file.records) {
    entries.push({
      label: String(record.label),
      eraSlug: (record.eraSlug as string | null) ?? null,
      aliases: Array.isArray(record.aliases) ? (record.aliases as string[]) : [],
    })
  }

  report.countDiscovered('manual:seasons', entries.length)
  for (const entry of entries) {
    try {
      const { label, startYear, endYear } = canonicalSeasonLabel(entry.label)
      bundle.seasons.push({
        label,
        startYear,
        endYear,
        eraSlug: entry.eraSlug,
        aliases: entry.aliases,
        source,
        confidence: file.confidence,
      })
    } catch (error) {
      report.rejected.push({
        entity: 'seasons',
        key: entry.label,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
