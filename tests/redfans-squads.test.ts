/**
 * Squads read from player pages.
 *
 * Fixtures are SHAPES. The structure they copy from the real export is the one that
 * decided the design: a player page carrying MANY squad-season categories, in both
 * sports, with the club shirt number stated once for a career.
 */

import { describe, expect, it } from 'vitest'

import { IngestReport } from '@/scripts/ingest/lib/report'
import { squadCategory, squadsFromPlayerPages } from '@/scripts/ingest/sources/redfans-squads'
import type { RawPage } from '@/scripts/ingest/lib/types'

function page(title: string, body: string): RawPage {
  return {
    pageId: 1,
    title,
    namespace: 0,
    revisionId: 2,
    sourceText: body,
    format: 'wikitext',
    contentHash: 'hash',
    fetchedAt: '2026-09-02T00:00:00.000Z',
    url: null,
    contentModel: 'wikitext',
    isRedirect: false,
    redirectTo: null,
    byteSize: body.length,
    revTimestamp: null,
    revUser: null,
    revComment: null,
    categories: [],
    links: [],
    images: [],
  } as unknown as RawPage
}

const INFOBOX = `{{שחקן עבר|
|שם=שחקן אלף
|כינוי=אלוף, הקיר (הסבר בסוגריים)
|מספר בהפועל=7
|תפקיד=קשר
|תאריך לידה=28.02.1961
}}
`

function run(pages: RawPage[], seasons?: string[]) {
  const report = new IngestReport('test')
  const result = squadsFromPlayerPages(
    pages,
    { sport: 'football', clubSlug: 'מועדון-הבית', seasons },
    report,
  )
  return { result, report }
}

const FOOTBALL_80 = '[[קטגוריה:סגל הפועל ת"א (כדורגל) 1980/81]]'
const FOOTBALL_81 = '[[קטגוריה:סגל הפועל ת"א (כדורגל) 1981/82]]'
const BASKET_80 = '[[קטגוריה:סגל הפועל ת"א (כדורסל) 1980/81]]'

describe('the squad category names itself', () => {
  it('reads the sport and the season out of the category', () => {
    expect(squadCategory('קטגוריה:סגל הפועל ת"א (כדורגל) 1980/81')).toEqual({
      sport: 'football',
      seasonLabel: '1980/81',
    })
    expect(squadCategory('סגל הפועל ת"א (כדורסל) 1980/81')?.sport).toBe('basketball')
  })

  it('is not fooled by a category that merely mentions a squad', () => {
    expect(squadCategory('קטגוריה:שחקני הפועל תל אביב (כדורגל)')).toBeNull()
  })
})

describe('membership comes from the page, not from the file', () => {
  it('gives one page every season it claims', () => {
    const { result } = run([page('שחקן אלף', `${INFOBOX}${FOOTBALL_80}${FOOTBALL_81}`)])
    expect(result.memberships.map((entry) => entry.seasonLabel).sort()).toEqual([
      '1980/81',
      '1981/82',
    ])
  })

  it('keeps only the seasons asked for', () => {
    const { result } = run([page('שחקן אלף', `${INFOBOX}${FOOTBALL_80}${FOOTBALL_81}`)], [
      '1981/82',
    ])
    expect(result.memberships).toHaveLength(1)
  })

  it('does not repeat a player who arrives in two exports', () => {
    const body = `${INFOBOX}${FOOTBALL_80}`
    const { result } = run([page('שחקן אלף', body), page('שחקן אלף', body)])
    expect(result.people).toHaveLength(1)
    expect(result.memberships).toHaveLength(1)
  })
})

describe('rule 6 inside a single page', () => {
  it('takes only the football seasons from a player who played both', () => {
    const { result } = run([page('שחקן אלף', `${INFOBOX}${FOOTBALL_80}${BASKET_80}`)])
    expect(result.memberships).toHaveLength(1)
    expect(result.memberships[0]?.seasonLabel).toBe('1980/81')
  })

  it('skips a page with no football squad category and says why', () => {
    const { result, report } = run([page('שחקן בית', `${INFOBOX}${BASKET_80}`)])
    expect(result.memberships).toHaveLength(0)
    expect(report.skipped[0]?.reason).toContain('football')
  })
})

describe('what the infobox states, and what it does not', () => {
  it('reads the name, position and birth date', () => {
    const { result } = run([page('שחקן אלף', `${INFOBOX}${FOOTBALL_80}`)])
    expect(result.people[0]?.fullNameHe).toBe('שחקן אלף')
    expect(result.people[0]?.birthDate).toBe('1961-02-28')
    expect(result.memberships[0]?.position).toBe('MF')
  })

  it('keeps the nicknames as aliases and drops the parenthetical aside', () => {
    const { result } = run([page('שחקן אלף', `${INFOBOX}${FOOTBALL_80}`)])
    expect(result.people[0]?.aliases).toContain('אלוף')
    expect(result.people[0]?.aliases.some((alias) => alias.includes('('))).toBe(false)
  })

  it('does not write the career shirt number onto every season', () => {
    const { result } = run([page('שחקן אלף', `${INFOBOX}${FOOTBALL_80}${FOOTBALL_81}`)])
    expect(result.memberships.every((entry) => entry.shirtNumber === null)).toBe(true)
    expect(result.shirtNumbers).toEqual([
      { personSlug: 'שחקן-אלף', personNameHe: 'שחקן אלף', shirtNumber: 7 },
    ])
  })

  it('keeps a player whose birth date cannot be read, and reports the loss', () => {
    const broken = INFOBOX.replace('28.02.1961', 'לא ידוע')
    const { result, report } = run([page('שחקן אלף', `${broken}${FOOTBALL_80}`)])
    expect(result.people).toHaveLength(1)
    expect(result.people[0]?.birthDate).toBeNull()
    expect(report.skipped.some((entry) => entry.reason.includes('birth date'))).toBe(true)
  })

  it('marks a youth product only when the wiki says so', () => {
    const { result } = run([
      page('שחקן אלף', `${INFOBOX}${FOOTBALL_80}[[קטגוריה:שחקני בית (כדורגל)]]`),
    ])
    expect(result.people[0]?.isYouthProduct).toBe(true)
    const { result: plain } = run([page('שחקן בית', `${INFOBOX}${FOOTBALL_80}`)])
    expect(plain.people[0]?.isYouthProduct).toBeNull()
  })
})
