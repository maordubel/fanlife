/**
 * The Cargo reader.
 *
 * Every fixture is a SHAPE. What is taken from the real export is the STRUCTURE — the
 * column names, the HTML entities inside JSON, two arrays in one file, `0` as a missing
 * date, `result` disagreeing with a drawn scoreline — because that structure is what the
 * code must survive. No club, player, date or result from the source appears here.
 */

import { describe, expect, it } from 'vitest'

import { IngestReport } from '@/scripts/ingest/lib/report'
import {
  cargoToStaged,
  competitionType,
  playedOnFrom,
  readCargoJson,
  readScorers,
  resolverFromRecords,
  resultCode,
  unescapeEntities,
  type CargoRow,
} from '@/scripts/ingest/sources/redfans-cargo'
import type { SourceRef } from '@/scripts/ingest/lib/types'

const SOURCE: SourceRef = {
  naturalKey: 'test:cargo',
  kind: 'wiki',
  title: 'fixture',
  url: null,
  pageTitle: null,
  revisionId: null,
  retrievedAt: '2026-09-02T00:00:00.000Z',
  note: null,
}

function row(over: Partial<CargoRow> = {}): CargoRow {
  return {
    day: 6,
    month: 9,
    year: 1900,
    stage: 'מחזור 1',
    host: 'קבוצה אלף',
    oponent: 'מועדון הבית',
    homescore: 0,
    awayscore: 1,
    ona: '1900/01',
    department: 'כדורגל',
    mifal: 'ליגה בדיונית',
    shootout: null,
    comments: null,
    liga: 1,
    result: 1,
    ...over,
  }
}

const US = [
  { slug: 'מועדון-הבית', nameHe: 'מועדון הבית', aliases: ['מועדון הבית', 'מועדון ב"ת'], sport: 'football', isUs: true },
]

function run(rows: CargoRow[], extra: Record<string, unknown> = {}) {
  const report = new IngestReport('test')
  const result = cargoToStaged(
    rows,
    {
      sport: 'football',
      resolveClub: resolverFromRecords(US, 'football'),
      usClubSlug: 'מועדון-הבית',
      source: SOURCE,
      ...extra,
    },
    report,
  )
  return { result, report }
}

describe('the export file itself', () => {
  it('reads two top-level arrays saved into one file', () => {
    const one = JSON.stringify([row({ stage: 'א' })])
    const two = JSON.stringify([row({ stage: 'ב' })])
    expect(readCargoJson(`${one}\n${two}`)).toHaveLength(2)
  })

  it('turns the HTML entities Cargo writes inside JSON back into the club name', () => {
    expect(unescapeEntities('מועדון ב&quot;ת')).toBe('מועדון ב"ת')
    const rows = readCargoJson(JSON.stringify([row({ host: 'מועדון ב&quot;ת' })]))
    expect(rows[0]?.host).toBe('מועדון ב"ת')
  })
})

describe('fields the source states', () => {
  it('refuses to turn a zeroed date into a date', () => {
    expect(playedOnFrom(row({ day: 0, month: 0, year: 0 }))).toBeNull()
    expect(playedOnFrom(row({ day: 6, month: 9, year: 1900 }))).toBe('1900-09-06')
  })

  it('reads a missing score as null rather than as nil-nil', () => {
    const { result } = run([row({ homescore: '?', awayscore: '?', result: '?' })])
    expect(result.matches[0]?.homeScore).toBeNull()
    expect(result.matches[0]?.status).toBe('unknown')
  })

  it('reads the win/loss/draw code and nothing else', () => {
    expect(resultCode(1)).toBe('win')
    expect(resultCode(0)).toBe('loss')
    expect(resultCode('x')).toBe('draw')
    expect(resultCode('?')).toBeNull()
  })

  it('trusts the source for league and reports a competition it cannot type', () => {
    expect(competitionType('משהו חדש', true)).toEqual({ type: 'league', mapped: true })
    expect(competitionType('גביע המדינה', false).type).toBe('national_cup')
    expect(competitionType('גביע שלא קיים', false)).toEqual({ type: 'other', mapped: false })
  })

  it('keeps the stage in the source’s own words', () => {
    const { result } = run([row({ stage: '1/8 גמר' })])
    expect(result.matches[0]?.stage).toBe('1/8 גמר')
  })
})

describe('rule 6 — the sport is a field, not a judgement', () => {
  it('rejects a basketball row from the football walk and says why', () => {
    const { result, report } = run([row({ department: 'כדורסל' })])
    expect(result.matches).toHaveLength(0)
    expect(report.rejected[0]?.reason).toContain('כדורסל')
  })

  it('rejects a row whose department is missing rather than assuming ours', () => {
    const { result } = run([row({ department: null })])
    expect(result.matches).toHaveLength(0)
  })

  it('never lets two sports share a natural key', () => {
    const { result } = run([row()])
    expect(result.matches[0]?.naturalKey.startsWith('football|')).toBe(true)
  })
})

describe('identity', () => {
  it('resolves a club through the manual file’s aliases instead of splitting it', () => {
    const { result } = run([row({ oponent: 'מועדון ב"ת' })])
    expect(result.matches[0]?.awayClubSlug).toBe('מועדון-הבית')
    expect(result.unknownClubs).not.toContain('מועדון ב"ת')
  })

  it('emits an unknown club for review and flags it as nothing', () => {
    const { result } = run([row({ host: 'קבוצה חדשה' })])
    const club = result.clubs.find((entry) => entry.nameHe === 'קבוצה חדשה')
    expect(club?.isUs).toBe(false)
    expect(club?.isDerbyRival).toBe(false)
    expect(result.unknownClubs).toContain('קבוצה חדשה')
  })

  it('reports a repeated row instead of merging it silently', () => {
    const { result, report } = run([row(), row()])
    expect(result.matches).toHaveLength(1)
    expect(report.skipped.some((entry) => entry.reason.includes('duplicate'))).toBe(true)
  })
})

describe('scorers are bounded by the scoreline', () => {
  it('reads a plain list of names', () => {
    const read = readScorers('שחקן אלף, שחקן בית', 2)
    expect(read.events.map((event) => event.personName)).toEqual(['שחקן אלף', 'שחקן בית'])
    expect(read.refused).toBeNull()
  })

  it('expands a brace into two goals and keeps the minute on the first', () => {
    const read = readScorers('צמד שחקן אלף (34)', 2)
    expect(read.events[0]).toEqual({ personName: 'שחקן אלף', goals: 2, minute: 34 })
  })

  it('reads a wiki link and a minute', () => {
    const read = readScorers('[[שחקן אלף]] (67)', 1)
    expect(read.events[0]?.personName).toBe('שחקן אלף')
    expect(read.events[0]?.minute).toBe(67)
  })

  it('keeps a postponement note out of the goals entirely', () => {
    const read = readScorers('לא נערך בתאריך המקורי (1.1.83) עקב תנאי המגרש', 0)
    expect(read.events).toHaveLength(0)
    expect(read.notes.length).toBeGreaterThan(0)
    expect(read.refused).toBeNull()
  })

  it('keeps the real scorer that shares a cell with a note', () => {
    const read = readScorers('לא נערך בתאריך המקורי (19.2.83) עקב תנאי המגרש. שחקן אלף (23)', 1)
    expect(read.events.map((event) => event.personName)).toEqual(['שחקן אלף'])
  })

  it('refuses the whole cell when it names more goals than were scored', () => {
    const read = readScorers('שחקן אלף, שחקן בית, שחקן גימל', 1)
    expect(read.events).toHaveLength(0)
    expect(read.refused).toContain('3')
  })

  it('accepts a source that names fewer scorers than goals', () => {
    const read = readScorers('שחקן אלף', 3)
    expect(read.events).toHaveLength(1)
    expect(read.refused).toBeNull()
  })

  it('attributes goals to our club and to no one else', () => {
    const { result } = run([row({ comments: 'שחקן אלף', awayscore: 1, homescore: 0 })])
    expect(result.matchEvents).toHaveLength(1)
    expect(result.matchEvents[0]?.clubSlug).toBe('מועדון-הבית')
    expect(result.matchEvents[0]?.type).toBe('goal')
  })
})

describe('conflicts are reported, never resolved', () => {
  it('notes a verdict that disagrees with a drawn scoreline and no shootout', () => {
    const { report } = run([row({ homescore: 2, awayscore: 2, result: 1, shootout: null })])
    expect(report.notes.some((note) => note.includes('unresolved'))).toBe(true)
  })

  it('says nothing when a shootout explains the disagreement', () => {
    const { report } = run([
      row({ homescore: 2, awayscore: 2, result: 1, shootout: '3:4 בפנדלים' }),
    ])
    expect(report.notes.some((note) => note.includes('unresolved'))).toBe(false)
  })

  it('keeps the shootout on the match rather than folding it into the score', () => {
    const { result } = run([row({ homescore: 2, awayscore: 2, shootout: '3:4 בפנדלים' })])
    expect(result.matches[0]?.homeScore).toBe(2)
    expect(result.matches[0]?.noteHe).toContain('בפנדלים')
  })
})

describe('seasons', () => {
  it('keeps a season label the canonical form cannot parse, and reports it', () => {
    const { result, report } = run([row({ ona: '1966-68' })])
    expect(result.seasons[0]?.label).toBe('1966-68')
    expect(report.skipped.some((entry) => entry.entity === 'seasons')).toBe(true)
  })

  it('reads a season written as a number', () => {
    const { result } = run([row({ ona: 1955 as unknown as string })])
    expect(result.matches[0]?.seasonLabel).toBe('1955')
  })

  it('keeps only the seasons asked for', () => {
    const { result } = run([row({ ona: '1900/01' }), row({ ona: '1901/02' })], {
      seasons: ['1901/02'],
    })
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0]?.seasonLabel).toBe('1901/02')
  })
})

describe('the fields only the 26-column export carries', () => {
  it('reads the neutral-ground marker and says so on the match', () => {
    const { result } = run([row({ homegame: 'x' } as Partial<CargoRow>)])
    expect(result.matches[0]?.noteHe).toContain('ניטרלי')
  })

  it('says nothing extra for an ordinary home or away row', () => {
    const { result } = run([row({ homegame: 1 } as Partial<CargoRow>)])
    expect(result.matches[0]?.noteHe).toBeNull()
  })

  it('takes the venue from the source and emits it once', () => {
    const { result } = run([
      row({ stadium: 'אצטדיון בדיוני' } as Partial<CargoRow>),
      row({ stage: 'מחזור 2', stadium: 'אצטדיון בדיוני' } as Partial<CargoRow>),
    ])
    expect(result.venues).toHaveLength(1)
    expect(result.matches[0]?.venueSlug).toBe(result.venues[0]?.slug)
  })

  it('confirms a kickoff only when the source writes one', () => {
    const withHour = run([row({ hour: '20:30' } as Partial<CargoRow>)])
    expect(withHour.result.matches[0]?.kickoffConfirmed).toBe(true)
    const without = run([row()])
    expect(without.result.matches[0]?.kickoffConfirmed).toBe(false)
  })

  it('keeps the coach and the referees as their own rows, in the source’s order', () => {
    const { result } = run([
      row({ coach: 'מאמן בדיוני', shofet1: 'שופט אלף', shofet3: 'שופט גימל' } as Partial<CargoRow>),
    ])
    expect(result.coaches[0]?.nameHe).toBe('מאמן בדיוני')
    expect(result.officials.map((entry) => [entry.seq, entry.nameHe])).toEqual([
      [1, 'שופט אלף'],
      [3, 'שופט גימל'],
    ])
  })

  it('reads a 15-field export exactly as before, with the new fields absent', () => {
    const { result } = run([row()])
    expect(result.venues).toHaveLength(0)
    expect(result.coaches).toHaveLength(0)
    expect(result.matches[0]?.venueSlug).toBeNull()
  })
})
