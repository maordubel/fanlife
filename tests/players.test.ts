import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { parsePosition, parsePositions, retiredScalarPosition, splitRoleValues } from '@/scripts/ingest/lib/normalize'
import {
  legacyPositionOf,
  parsePlayerRoles,
  readPlayerWikitextFile,
  rolesFromLead,
  type PlayerRoleReading,
} from '@/scripts/ingest/sources/vikipoel-players'

/**
 * **תפקיד הוא רשימה — the guard is on the CLASS, not on the row.**
 *
 * Maor, 17.9.2026: *"לא יכול להיות ששמת את שייע פיינגבוים, החלוץ הגדול עם הכי הרבה
 * שערים בהיסטוריה של הפועל בתור שחקן הגנה."*
 *
 * A test that names him would let the other twenty-six through, and the other
 * twenty-six are the same defect: a multi-value field read as a scalar. So the
 * assertions below are quantified over the whole corpus — *no* player's displayed
 * position may still be what the retired scalar read would have returned, wherever the
 * field holds more than one role or the page's own lead disagrees with it. שייע is
 * asserted by name as well, because he is the case that was reported and a report
 * deserves a named regression.
 */
describe('תפקיד הוא רשימה — no position is taken off the front of a list', () => {
  const ROOT = join(__dirname, '..')
  const pages = readPlayerWikitextFile(join(ROOT, 'content/raw/vikipoel-player-wikitext.json'))
  const { readings, report } = parsePlayerRoles(pages)
  const byTitle = new Map<string, PlayerRoleReading>(readings.map((row) => [row.title, row]))

  const facts = JSON.parse(
    readFileSync(join(ROOT, 'content/manual/player-facts.json'), 'utf8'),
  ) as {
    records: Array<{
      personNameHe: string
      position: string | null
      positions?: string[]
      positionFrom: string | null
    }>
    conflicts: Array<{ personNameHe: string; field: string; says: Record<string, string> }>
  }
  const vikipoel = JSON.parse(
    readFileSync(join(ROOT, 'content/manual/player-facts-vikipoel.json'), 'utf8'),
  ) as {
    confirmedSpelling: Record<string, string>
    table: Array<{
      personNameHe: string
      position: string | null
      positions?: string[]
      positionFrom?: string | null
      positionSays?: Record<string, string>
    }>
  }
  const row = (name: string) => facts.records.find((record) => record.personNameHe === name)
  /** the archive's spelling of a page title — one man is spelled two ways */
  const archive = (title: string) => vikipoel.confirmedSpelling[title] ?? title

  it('splits the field the source wrote, and never takes the first CODE in a lexicon', () => {
    // The retired read answered with the first code it TESTED, not the first role the
    // source wrote — which is why the club's greatest striker came out a defender.
    expect(retiredScalarPosition('חלוץ, בלם')).toBe('DF')
    expect(parsePosition('חלוץ, בלם')).toBe('FW')
    expect(parsePositions('חלוץ, בלם')).toEqual(['FW', 'DF'])
    expect(parsePositions('מגן שמאלי, חלוץ, מאמן')).toEqual(['DF', 'FW'])
    expect(parsePositions('קשר/חלוץ')).toEqual(['MF', 'FW'])
    // a slash inside one role is one role, not two
    expect(parsePositions('מגן ימני/שמאלי')).toEqual(['DF'])
    // and a parenthetical aside is not a value
    expect(splitRoleValues('קשר/חלוץ (קיצוני ימני)')).toEqual(['קשר', 'חלוץ'])
  })

  it('never lets a role that is not a position become one', () => {
    expect(parsePositions('מאמן')).toEqual([])
    expect(parsePositions('קשר אחורי, סקאוט, עוזר מאמן, מאמן')).toEqual(['MF'])
    expect(parsePositions('בלם, סקאוט, מנהל')).toEqual(['DF'])
    for (const reading of readings) {
      for (const code of reading.positions) expect(['GK', 'DF', 'MF', 'FW']).toContain(code)
      // a page whose only role is a staff one states no position at all
      if (reading.roleValues.length > 0 && reading.infoboxPositions.length === 0) {
        expect(reading.roleValues.some((value) => value !== ''), reading.title).toBe(true)
      }
    }
  })

  it('keeps every role the page states instead of throwing the rest away', () => {
    const multi = readings.filter((reading) => reading.infoboxPositions.length > 1)
    expect(multi.length).toBeGreaterThan(20)
    for (const reading of multi) {
      for (const code of reading.infoboxPositions) {
        expect(reading.positions, reading.title).toContain(code)
      }
    }
    // and the archive carries the list, not just the display value
    const shaya = vikipoel.table.find((entry) => entry.personNameHe === 'שייע פייגנבוים')
    expect(shaya?.positions).toEqual(['FW', 'DF'])
    expect(row('שייע פייגנבוים')?.positions).toEqual(['FW', 'DF'])
  })

  /**
   * THE CLASS ASSERTION. Everything else here is a worked example of it.
   *
   * Two halves, and both are quantified over the whole corpus rather than over a name:
   *
   *  1. **The archive shows what the parser derives.** Every row ויקיפועל decided holds
   *     the value the list-and-lead read produces — so a fix applied to one man's row by
   *     hand, or a row left behind by a re-run, fails here.
   *  2. **The derivation is not the retired read.** On the pages that are exposed to the
   *     defect — a field with more than one role, or a lead that disagrees with it — the
   *     two answers differ on a large set. If somebody reverts the split, that set
   *     collapses to nothing and this fails; a test that only listed the names would go
   *     green against a lexicon scan that happened to agree with each of them.
   *
   * Agreement on an individual man is allowed and expected: `בלם, מגן ימני` is DF under
   * either reading. What is not allowed is the archive agreeing with the retired read
   * where the parser does not.
   */
  it('shows what the parser derives, on every row ויקיפועל decided', () => {
    const wrong: string[] = []
    for (const page of pages) {
      const reading = byTitle.get(page.title)
      if (!reading) continue
      const stored = vikipoel.table.find(
        (entry) => entry.personNameHe === archive(page.title) || entry.personNameHe === page.title,
      )
      if (stored && (stored.position ?? null) !== reading.position) {
        wrong.push(`${page.title}: table=${stored.position} parser=${reading.position}`)
      }
      const merged = row(archive(page.title)) ?? row(page.title)
      if (
        merged &&
        (merged.positionFrom === 'vikipoel' || merged.positionFrom === 'vikipoel-body') &&
        merged.position !== reading.position
      ) {
        wrong.push(`${page.title}: facts=${merged.position} parser=${reading.position}`)
      }
      // and the display value is always the head of the list it came from — never a
      // code picked out of the middle of the field by whatever tested first
      if (reading.position !== null) {
        expect(reading.positions[0], page.title).toBe(reading.position)
        expect(reading.position, page.title).toBe(
          reading.bodyPositions[0] ?? reading.infoboxPositions[0] ?? null,
        )
      }
    }
    expect(wrong).toEqual([])
  })

  it('does not agree with the retired scalar read, as a class', () => {
    const exposed = pages.filter((page) => {
      const reading = byTitle.get(page.title)
      return reading !== undefined && (reading.infoboxPositions.length > 1 || reading.conflict !== null)
    })
    const differ = exposed.filter((page) => {
      const reading = byTitle.get(page.title)
      return legacyPositionOf(page) !== (reading?.position ?? null)
    })
    // 32 pages carry more than one position in the field and 16 leads overrule the box;
    // on 18 of them the retired read lands somewhere else, and on the rest the lexicon
    // order happened to agree (`בלם, מגן ימני` is DF either way). A floor of 15 is what
    // says the split and the lead read are both still doing work: undo either and this
    // set collapses.
    expect(exposed.length).toBeGreaterThan(30)
    expect(differ.length).toBeGreaterThanOrEqual(15)
  })

  it('files שייע פייגנבוים as a forward, which is what his page says he was here', () => {
    // 131 goals, the club's all-time top scorer. The infobox lists his whole career —
    // `מגן שמאלי, חלוץ, מאמן` — and the lead states the role at Hapoel.
    const reading = byTitle.get('שייע פייגנבוים')
    expect(reading?.roleValues).toEqual(['מגן שמאלי', 'חלוץ', 'מאמן'])
    expect(reading?.staffRoles).toEqual(['מאמן'])
    expect(reading?.bodyPositions[0]).toBe('FW')
    expect(reading?.position).toBe('FW')
    expect(reading?.positionFrom).toBe('vikipoel-body')
    expect(row('שייע פייגנבוים')?.position).toBe('FW')
    expect(legacyPositionOf(pages.find((page) => page.title === 'שייע פייגנבוים')!)).toBe('DF')
  })

  it('records the disagreement rather than deciding it', () => {
    expect(report.conflicts.length).toBeGreaterThan(5)
    for (const clash of report.conflicts) {
      expect(clash.infobox).not.toBe(clash.body)
      const stored = vikipoel.table.find(
        (entry) => entry.personNameHe === archive(clash.title) || entry.personNameHe === clash.title,
      )
      expect(stored?.positionSays, clash.title).toEqual({
        vikipoel: clash.infobox,
        'vikipoel-body': clash.body,
      })
      // and it reaches the merged file's own conflict list, where nothing is resolved
      const merged = facts.conflicts.find(
        (entry) =>
          entry.field === 'position' &&
          (entry.personNameHe === archive(clash.title) || entry.personNameHe === clash.title),
      )
      expect(merged?.says['vikipoel-body'], clash.title).toBe(clash.body)
    }
  })

  it('reads a role only where the page DECLARES one', () => {
    // A story about a six-year-old, a striker who was moved to left back, and a
    // testimonial four paragraphs down are not position statements — and each of the
    // three produced a wrong answer before the anchors were added.
    const lead = (title: string) =>
      rolesFromLead(pages.find((page) => page.title === title)?.revisions?.[0]?.slots?.main?.content ?? '')
    expect(lead('איתי אלקסלסי').positions).toEqual([])
    expect(lead('ארתור אטצזיאנוב').positions).toEqual(['DF'])
    expect(lead('דוד פרימו').positions).toEqual([])
    // and the external-links heading is not a midfielder
    expect(lead('אהוד כחילה').positions).toEqual([])
    // the forms that DO count
    expect(lead('שייע פייגנבוים').positions).toEqual(['FW'])
    expect(lead('ערן זהבי').positions).toEqual(['MF', 'FW'])
    expect(lead('יורגן קולין').positions).toEqual(['DF'])
  })

  it('states where every position came from, for every row that has one', () => {
    for (const entry of vikipoel.table) {
      if (entry.position === null) {
        expect(entry.positionFrom ?? null, entry.personNameHe).toBeNull()
        continue
      }
      expect(['vikipoel', 'vikipoel-body'], entry.personNameHe).toContain(entry.positionFrom)
      if (entry.positions) {
        expect(entry.positions.length, entry.personNameHe).toBeGreaterThan(1)
        expect(entry.positions[0], entry.personNameHe).toBe(entry.position)
      }
    }
  })

  it('re-runs to the same file — the parser is the only input', () => {
    const again = parsePlayerRoles(pages)
    expect(again.readings.map((reading) => `${reading.title}|${reading.position}`)).toEqual(
      readings.map((reading) => `${reading.title}|${reading.position}`),
    )
  })
})
