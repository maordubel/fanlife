/**
 * Squads, read from the players themselves.
 *
 * The brief called the squad categories the hard part, and the first plan was to export
 * each category and read its member list. The real export shows a better route: **every
 * player page carries its own squad-season categories in its wikitext.** משה סיני's page
 * lists thirteen `סגל הפועל ת"א (כדורגל) <season>` categories, so one export of the
 * player pages yields every season that player was in the squad — and a page that
 * arrives in the 1980/81 file but belongs to five squads contributes all five.
 *
 * That matters beyond convenience. Membership derived from the FILE the page arrived in
 * would be an artefact of how the operator ran the export; membership read from the page
 * is what the wiki says. The same three files, exported in a different order, produce the
 * same rows.
 *
 * The infobox is `תבנית:שחקן עבר` (and `שחקן` for a current player). What it states:
 *   שם · כינוי · מספר בהפועל · תפקיד · תאריך לידה · מועדוני נוער ·
 *   מועדונים כשחקן · מועדונים כמאמן · הופעות · שנים
 *
 * **`מספר בהפועל` is not a per-season number.** It is the shirt the player is
 * remembered by — one value on a page covering thirteen seasons. Writing it into every
 * season's squad row would state thirteen facts the source states once, and two players
 * in the same season could then both "wear" a number they never shared. It becomes a
 * single shirt-number holding with no season attached; the squad rows keep `null`.
 */

import { extractCategories, extractTemplate } from '../adapters/mediawiki'
import { classifySport } from '@/scripts/ingest/lib/guards'
import {
  IngestValueError,
  parseIsoDate,
  parsePosition,
  parseShirtNumber,
  slugify,
} from '@/scripts/ingest/lib/normalize'
import type { IngestReport } from '@/scripts/ingest/lib/report'
import type {
  Confidence,
  RawPage,
  SourceRef,
  StagedPerson,
  StagedSquadMembership,
} from '@/scripts/ingest/lib/types'

const WIKI_CONFIDENCE: Confidence = 1

const PLAYER_TEMPLATES = ['שחקן עבר', 'שחקן', 'שחקן כדורגל', 'כדורגלן'] as const

/**
 * `קטגוריה:סגל הפועל ת"א (כדורגל) 1980/81` -> `{ sport: 'football', season: '1980/81' }`.
 *
 * The sport is INSIDE the category name, so rule 6 is enforced by the same read that
 * finds the season. A basketball squad category on a page that also has football ones
 * contributes to the basketball walk and to nothing else — which is exactly the case
 * that walked past the gate the first time (rule 6).
 */
const SQUAD_CATEGORY = /^סגל\s+הפועל\s+ת"א\s*\((כדורגל|כדורסל)\)\s*(\d{4}\s*\/\s*\d{2,4})$/u

export type SquadCategory = { sport: 'football' | 'basketball'; seasonLabel: string }

export function squadCategory(name: string): SquadCategory | null {
  const found = SQUAD_CATEGORY.exec(name.replace(/^קטגוריה:/u, '').trim())
  if (!found) return null
  return {
    sport: found[1] === 'כדורגל' ? 'football' : 'basketball',
    seasonLabel: found[2]!.replace(/\s+/gu, ''),
  }
}

export type SquadRead = {
  people: StagedPerson[]
  memberships: StagedSquadMembership[]
  /** `מספר בהפועל` — one per player, no season. */
  shirtNumbers: Array<{ personSlug: string; personNameHe: string; shirtNumber: number }>
}

export function squadsFromPlayerPages(
  pages: readonly RawPage[],
  options: {
    sport: 'football' | 'basketball'
    clubSlug: string
    seasons?: readonly string[]
    source?: (page: RawPage) => SourceRef
  },
  report: IngestReport,
): SquadRead {
  const wanted = new Set(options.seasons ?? [])
  const people = new Map<string, StagedPerson>()
  const memberships = new Map<string, StagedSquadMembership>()
  const shirtNumbers: SquadRead['shirtNumbers'] = []

  for (const page of pages) {
    const categories = extractCategories(page.sourceText)
    const squads = categories
      .map(squadCategory)
      .filter((entry): entry is SquadCategory => entry !== null)
      .filter((entry) => entry.sport === options.sport)

    if (squads.length === 0) {
      // Not a squad member of this sport. Templates and stubs land here; it is not an
      // error, so it is a skip with a reason rather than a rejection.
      report.skipped.push({
        entity: 'squadMemberships',
        key: page.title,
        reason: `no ${options.sport} squad category on the page`,
      })
      continue
    }

    // A page that carries squad categories for this sport is a player of this sport.
    // The body classifier still runs, because a page can name both (rule 6).
    const verdict = classifySport({
      title: page.title,
      body: page.sourceText.slice(0, 4000),
      categories,
    })
    if (verdict.sport !== options.sport && verdict.sport !== 'unknown') {
      report.rejected.push({
        entity: 'people',
        key: page.title,
        reason: `page classifies as ${verdict.sport} — ${verdict.reason}`,
      })
      continue
    }

    const fields = firstTemplate(page.sourceText) ?? {}
    const slug = slugify(page.title)
    const source = options.source?.(page) ?? pageSource(page)

    if (!people.has(slug)) {
      people.set(slug, {
        slug,
        fullNameHe: pick(fields, ['שם']) ?? page.title,
        fullNameEn: pick(fields, ['שם באנגלית']),
        birthDate: readDate(pick(fields, ['תאריך לידה']), page.title, report),
        nationalities: [],
        isYouthProduct: categories.some((name) => name.includes('שחקני בית')) ? true : null,
        wikiPage: page.title,
        aliases: aliasesFrom(fields, page.title),
        source,
        confidence: WIKI_CONFIDENCE,
      })
    }

    const shirt = readShirt(pick(fields, ['מספר בהפועל', 'מספר']), page.title, report)
    if (shirt !== null) {
      shirtNumbers.push({
        personSlug: slug,
        personNameHe: pick(fields, ['שם']) ?? page.title,
        shirtNumber: shirt,
      })
    }

    const position = parsePosition(pick(fields, ['תפקיד', 'עמדה']))

    for (const squad of squads) {
      if (wanted.size > 0 && !wanted.has(squad.seasonLabel)) continue
      const key = `${slug}|${squad.seasonLabel}`
      if (memberships.has(key)) continue
      memberships.set(key, {
        personSlug: slug,
        seasonLabel: squad.seasonLabel,
        clubSlug: options.clubSlug,
        // Not per-season on this source. See the note at the top of this file.
        shirtNumber: null,
        position,
        onLoan: false,
        appearances: null,
        goals: null,
        source,
        confidence: WIKI_CONFIDENCE,
      })
    }
  }

  return {
    people: [...people.values()],
    memberships: [...memberships.values()],
    shirtNumbers,
  }
}

/* -------------------------------------------------------------------- utils */

function firstTemplate(sourceText: string): Record<string, string> | null {
  for (const name of PLAYER_TEMPLATES) {
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

function aliasesFrom(fields: Record<string, string>, title: string): string[] {
  const nickname = pick(fields, ['כינוי']) ?? ''
  const parts = [
    pick(fields, ['שם']) ?? '',
    title,
    // A nickname cell holds several, comma separated, sometimes with an aside in
    // parentheses. The aside is not a name.
    ...nickname.split(/[,،;]/u).map((part) => part.replace(/\([^)]*\)/gu, '').trim()),
  ]
  return [...new Set(parts.map((part) => part.trim()).filter(Boolean))]
}

/**
 * A date the source wrote but the parser could not read is a REPORTED loss, not a null.
 *
 * `parseIsoDate` answers `null` for an unreadable value rather than throwing, so the
 * obvious try/catch here caught nothing and the field vanished silently — the exact
 * shape rule 11 exists to prevent. The test that found it asserts the report, not the
 * value.
 */
function readDate(value: string | null, key: string, report: IngestReport): string | null {
  if (!value) return null
  try {
    const parsed = parseIsoDate(value)
    if (parsed === null) {
      report.skipped.push({
        entity: 'people',
        key,
        reason: `birth date unreadable, row kept: ${value}`,
      })
    }
    return parsed
  } catch (error) {
    report.skipped.push({
      entity: 'people',
      key,
      reason: `birth date dropped, row kept: ${describe(error)}`,
    })
    return null
  }
}

function readShirt(value: string | null, key: string, report: IngestReport): number | null {
  if (!value) return null
  try {
    return parseShirtNumber(value)
  } catch (error) {
    report.skipped.push({
      entity: 'shirtNumbers',
      key,
      reason: `shirt number dropped, player kept: ${describe(error)}`,
    })
    return null
  }
}

function pageSource(page: RawPage): SourceRef {
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

function describe(error: unknown): string {
  return error instanceof IngestValueError || error instanceof Error
    ? error.message
    : String(error)
}
