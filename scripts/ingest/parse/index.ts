/**
 * Parsers: RawPage -> staged records. They never touch the network and never touch
 * the database, so every one of them is directly testable against a fixture page.
 *
 * A parser that cannot read a field leaves it null. It never fills a gap with a guess,
 * and it never drops a row silently — an unusable row is reported as skipped or
 * rejected with a reason.
 */

import {
  extractCategories,
  extractTableRows,
  extractTemplate,
} from '../adapters/mediawiki'
import { classifySport } from '@/scripts/ingest/lib/guards'
import {
  IngestValueError,
  canonicalSeasonLabel,
  parseIsoDate,
  parsePosition,
  parseScore,
  parseShirtNumber,
  slugify,
} from '@/scripts/ingest/lib/normalize'
import type { IngestReport } from '@/scripts/ingest/lib/report'
import type {
  Confidence,
  RawPage,
  SourceRef,
  StagedMatch,
  StagedPerson,
  StagedSeason,
  StagedSquadMembership,
} from '@/scripts/ingest/lib/types'

/** Anything read off a single wiki page is one source, unverified until reviewed. */
const WIKI_CONFIDENCE: Confidence = 1

export const HAPOEL_CLUB_SLUG = 'הפועל-תל-אביב'

export function sourceForPage(page: RawPage): SourceRef {
  return {
    naturalKey: `wiki:${page.title}@${page.revisionId ?? page.contentHash.slice(0, 12)}`,
    kind: 'wiki',
    title: page.title,
    url: page.url,
    pageTitle: page.title,
    revisionId: page.revisionId,
    retrievedAt: page.fetchedAt,
    note: null,
  }
}

/** Football gate. Every parser calls this first; a non-football page is rejected. */
export function acceptFootballPage(page: RawPage, report: IngestReport): boolean {
  const verdict = classifySport({
    title: page.title,
    body: page.sourceText.slice(0, 4000),
    categories: extractCategories(page.sourceText),
  })
  if (verdict.sport === 'football') return true
  report.rejected.push({
    entity: 'page',
    key: page.title,
    reason: `not football: ${verdict.sport} — ${verdict.reason}`,
  })
  return false
}

/* ------------------------------------------------------------------ players */

const PLAYER_TEMPLATES = ['תבנית:שחקן כדורגל', 'שחקן כדורגל', 'כדורגלן', 'Infobox football biography']

export function parsePlayerPage(page: RawPage, report: IngestReport): StagedPerson | null {
  if (!acceptFootballPage(page, report)) return null

  const fields = firstTemplate(page.sourceText, PLAYER_TEMPLATES)
  if (!fields) {
    report.skipped.push({
      entity: 'people',
      key: page.title,
      reason: 'no recognised player infobox on the page',
    })
    return null
  }

  const displayName = pick(fields, ['שם', 'שם מלא', 'name']) ?? page.title
  const birthDate = safe(
    () => parseIsoDate(pick(fields, ['תאריך לידה', 'לידה', 'birth_date'])),
    page.title,
    'birthDate',
    report,
  )

  const aliases = unique([
    displayName,
    page.title,
    ...(pick(fields, ['כינוי', 'שם נוסף']) ?? '').split(/[,،;]/).map((part) => part.trim()),
  ])

  return {
    slug: slugify(page.title),
    fullNameHe: displayName,
    fullNameEn: pick(fields, ['שם באנגלית', 'name_en']),
    birthDate: birthDate ?? null,
    nationalities: splitList(pick(fields, ['לאום', 'אזרחות', 'nationality'])),
    isYouthProduct: extractCategories(page.sourceText).some((category) =>
      category.includes('שחקני בית'),
    )
      ? true
      : null,
    wikiPage: page.title,
    aliases: aliases.filter(Boolean),
    source: sourceForPage(page),
    confidence: WIKI_CONFIDENCE,
  }
}

/* ------------------------------------------------------------------ seasons */

export function parseSeasonPage(page: RawPage, report: IngestReport): StagedSeason | null {
  if (!acceptFootballPage(page, report)) return null

  const raw = /(\d{4}\s*[/\-–—]\s*\d{2,4})/.exec(page.title)?.[1]
  if (!raw) {
    report.skipped.push({
      entity: 'seasons',
      key: page.title,
      reason: 'no season label in the page title',
    })
    return null
  }

  try {
    const { label, startYear, endYear } = canonicalSeasonLabel(raw)
    return {
      label,
      startYear,
      endYear,
      eraSlug: null,
      aliases: unique([raw, page.title]),
      source: sourceForPage(page),
      confidence: WIKI_CONFIDENCE,
    }
  } catch (error) {
    report.rejected.push({
      entity: 'seasons',
      key: page.title,
      reason: describe(error),
    })
    return null
  }
}

/* ------------------------------------------------------------------- squads */

/**
 * A per-season squad page. Expects a wikitable whose header names the columns;
 * column positions are resolved by header text, never by index, because a source
 * that inserts a column would otherwise shift every value by one.
 */
export function parseSquadPage(
  page: RawPage,
  seasonLabel: string,
  report: IngestReport,
): StagedSquadMembership[] {
  if (!acceptFootballPage(page, report)) return []

  const rows = extractTableRows(page.sourceText)
  if (rows.length < 2) {
    report.skipped.push({ entity: 'squadMemberships', key: page.title, reason: 'no squad table' })
    return []
  }

  const header = (rows[0] ?? []).map((cell) => cell.trim())
  const columnOf = (candidates: string[]): number =>
    header.findIndex((cell) => candidates.some((candidate) => cell.includes(candidate)))

  const numberColumn = columnOf(['מספר', 'חולצה', '#'])
  const nameColumn = columnOf(['שחקן', 'שם'])
  const positionColumn = columnOf(['עמדה', 'תפקיד'])
  const appearancesColumn = columnOf(['הופעות'])
  const goalsColumn = columnOf(['שערים'])

  if (nameColumn === -1) {
    report.rejected.push({
      entity: 'squadMemberships',
      key: page.title,
      reason: `squad table has no player-name column (header: ${header.join(' / ')})`,
    })
    return []
  }

  const source = sourceForPage(page)
  const out: StagedSquadMembership[] = []

  for (const [index, row] of rows.slice(1).entries()) {
    const rowKey = `${page.title}#${index + 1}`
    const name = row[nameColumn]?.trim()

    if (!name) {
      report.skipped.push({ entity: 'squadMemberships', key: rowKey, reason: 'empty name cell' })
      continue
    }
    // A repeated header mid-table is a real pattern in hand-maintained sources.
    if (name === header[nameColumn]) {
      report.skipped.push({ entity: 'squadMemberships', key: rowKey, reason: 'repeated header row' })
      continue
    }

    let shirtNumber: number | null = null
    try {
      shirtNumber = numberColumn === -1 ? null : parseShirtNumber(row[numberColumn])
    } catch (error) {
      // The row is kept — a bad shirt number must not delete a player.
      report.skipped.push({
        entity: 'squadMemberships',
        key: rowKey,
        reason: `shirt number dropped, row kept: ${describe(error)}`,
      })
    }

    out.push({
      personSlug: slugify(name),
      seasonLabel,
      clubSlug: HAPOEL_CLUB_SLUG,
      shirtNumber,
      position: parsePosition(positionColumn === -1 ? null : row[positionColumn]),
      onLoan: /השאלה/.test(row.join(' ')),
      appearances: toInt(appearancesColumn === -1 ? null : row[appearancesColumn]),
      goals: toInt(goalsColumn === -1 ? null : row[goalsColumn]),
      source,
      confidence: WIKI_CONFIDENCE,
    })
  }

  return out
}

/* ------------------------------------------------------------------ matches */

const MATCH_TEMPLATES = ['תבנית:משחק', 'משחק כדורגל', 'Infobox football match']

export function parseMatchPage(
  page: RawPage,
  context: { seasonLabel: string; competitionSlug: string; stage: string | null },
  report: IngestReport,
): StagedMatch | null {
  if (!acceptFootballPage(page, report)) return null

  const fields = firstTemplate(page.sourceText, MATCH_TEMPLATES) ?? {}
  const homeName = pick(fields, ['קבוצה א', 'בית', 'home'])
  const awayName = pick(fields, ['קבוצה ב', 'חוץ', 'away'])

  if (!homeName || !awayName) {
    report.skipped.push({
      entity: 'matches',
      key: page.title,
      reason: 'match page does not name both clubs',
    })
    return null
  }

  const score = parseScore(pick(fields, ['תוצאה', 'score']))
  const playedOn = safe(
    () => parseIsoDate(pick(fields, ['תאריך', 'date'])),
    page.title,
    'playedOn',
    report,
  )

  const homeSlug = slugify(homeName)
  const awaySlug = slugify(awayName)
  const stage = context.stage ?? pick(fields, ['שלב', 'מחזור']) ?? null

  return {
    naturalKey: [context.seasonLabel, context.competitionSlug, homeSlug, awaySlug, stage ?? '']
      .join('|'),
    seasonLabel: context.seasonLabel,
    competitionSlug: context.competitionSlug,
    stage,
    playedOn: playedOn ?? null,
    // A wiki match page does not carry a gate count in a field the parser reads.
    attendance: null,
    attendanceDisputed: false,
    travellingSupporters: null,
    noteHe: null,
    // Never invent a kickoff time: an unconfirmed time stays unconfirmed.
    kickoffConfirmed: false,
    homeClubSlug: homeSlug,
    awayClubSlug: awaySlug,
    venueSlug: null,
    homeScore: score?.home ?? null,
    awayScore: score?.away ?? null,
    status: score ? 'played' : 'unknown',
    wikiPage: page.title,
    source: sourceForPage(page),
    confidence: WIKI_CONFIDENCE,
  }
}

/* -------------------------------------------------------------------- utils */

function firstTemplate(sourceText: string, names: readonly string[]) {
  for (const name of names) {
    const fields = extractTemplate(sourceText, name)
    if (fields) return fields
  }
  return null
}

function pick(fields: Record<string, string>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = fields[key]?.trim()
    if (value) return value
  }
  return null
}

function splitList(value: string | null): string[] {
  if (!value) return []
  return value
    .split(/[,،;/]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function toInt(value: string | null | undefined): number | null {
  if (!value) return null
  const digits = value.replace(/[^\d]/g, '')
  return digits ? Number(digits) : null
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function safe<T>(
  read: () => T,
  key: string,
  field: string,
  report: IngestReport,
): T | undefined {
  try {
    return read()
  } catch (error) {
    report.skipped.push({
      entity: 'people',
      key,
      reason: `${field} dropped, row kept: ${describe(error)}`,
    })
    return undefined
  }
}

function describe(error: unknown): string {
  return error instanceof IngestValueError || error instanceof Error
    ? error.message
    : String(error)
}
