import { describe, expect, it } from 'vitest'

import { IngestReport } from '@/scripts/ingest/lib/report'
import {
  parseMatchPage,
  parsePlayerPage,
  parseSeasonPage,
  parseSquadPage,
} from '@/scripts/ingest/parse'
import {
  extractCategories,
  extractTableRows,
  extractTemplate,
} from '@/scripts/ingest/adapters/mediawiki'
import {
  BASKETBALL_PLAYER_PAGE,
  MATCH_PAGE,
  MATCH_PAGE_MISSING_CLUB,
  PLAYER_PAGE,
  PLAYER_PAGE_BAD_DATE,
  PLAYER_PAGE_NO_INFOBOX,
  SEASON_PAGE,
  SQUAD_PAGE,
  SQUAD_PAGE_NO_TABLE,
} from './fixtures/wiki'

const report = () => new IngestReport('test')

describe('wikitext extraction', () => {
  it('reads named template parameters', () => {
    const fields = extractTemplate(PLAYER_PAGE.sourceText, 'שחקן כדורגל')
    expect(fields?.['שם']).toBe('בדיקה שחקן א')
    expect(fields?.['עמדה']).toBe('קשר')
  })

  it('reads categories', () => {
    expect(extractCategories(PLAYER_PAGE.sourceText)).toContain('שחקני בית (כדורגל)')
  })

  it('reads table rows including the header', () => {
    const rows = extractTableRows(SQUAD_PAGE.sourceText)
    expect(rows[0]).toContain('שחקן')
    expect(rows.length).toBeGreaterThan(4)
  })
})

describe('parsePlayerPage', () => {
  it('parses a football player and keeps the source and confidence', () => {
    const r = report()
    const person = parsePlayerPage(PLAYER_PAGE, r)
    expect(person?.fullNameHe).toBe('בדיקה שחקן א')
    expect(person?.birthDate).toBe('1980-05-12')
    expect(person?.nationalities).toEqual(['ישראל', 'ברזיל'])
    expect(person?.isYouthProduct).toBe(true)
    expect(person?.confidence).toBe(1)
    expect(person?.source.kind).toBe('wiki')
    expect(person?.source.revisionId).toBe(100)
    expect(person?.aliases).toContain('בדיקה כינוי')
  })

  it('rejects a basketball page and says why', () => {
    const r = report()
    expect(parsePlayerPage(BASKETBALL_PLAYER_PAGE, r)).toBeNull()
    expect(r.rejected[0]?.reason).toContain('basketball')
  })

  it('skips a page with no infobox instead of inventing fields', () => {
    const r = report()
    expect(parsePlayerPage(PLAYER_PAGE_NO_INFOBOX, r)).toBeNull()
    expect(r.skipped[0]?.reason).toContain('no recognised player infobox')
  })

  it('keeps the row when one field is unparseable, and names the loss', () => {
    const r = report()
    const person = parsePlayerPage(PLAYER_PAGE_BAD_DATE, r)
    expect(person).not.toBeNull()
    expect(person?.birthDate).toBeNull()
    expect(r.skipped[0]?.reason).toContain('birthDate dropped, row kept')
  })
})

describe('parseSeasonPage', () => {
  it('canonicalises the season label from the title', () => {
    const season = parseSeasonPage(SEASON_PAGE, report())
    expect(season?.label).toBe('2001/02')
    expect(season?.startYear).toBe(2001)
  })
})

describe('parseSquadPage', () => {
  it('resolves columns by header text, not position', () => {
    const rows = parseSquadPage(SQUAD_PAGE, '2001/02', report())
    const goalkeeper = rows.find((row) => row.shirtNumber === 1)
    expect(goalkeeper?.position).toBe('GK')
    expect(goalkeeper?.appearances).toBe(30)
  })

  it('skips a repeated header row without dropping real players', () => {
    const r = report()
    const rows = parseSquadPage(SQUAD_PAGE, '2001/02', r)
    expect(rows.map((row) => row.personSlug)).not.toContain('שחקן')
    expect(r.skipped.some((entry) => entry.reason === 'repeated header row')).toBe(true)
  })

  it('keeps a player whose shirt number is out of range, and reports the loss', () => {
    const r = report()
    const rows = parseSquadPage(SQUAD_PAGE, '2001/02', r)
    const kept = rows.find((row) => row.personSlug.includes('ג'))
    expect(kept).toBeDefined()
    expect(kept?.shirtNumber).toBeNull()
    expect(r.skipped.some((entry) => entry.reason.includes('shirt number dropped'))).toBe(true)
  })

  it('reports an empty name cell rather than importing a nameless player', () => {
    const r = report()
    const rows = parseSquadPage(SQUAD_PAGE, '2001/02', r)
    expect(rows.every((row) => row.personSlug.length > 0)).toBe(true)
    expect(r.skipped.some((entry) => entry.reason === 'empty name cell')).toBe(true)
  })

  it('leaves a typo position unknown instead of guessing forward', () => {
    const rows = parseSquadPage(SQUAD_PAGE, '2001/02', report())
    const typo = rows.find((row) => row.shirtNumber === 9)
    expect(typo?.position).toBe('UNK')
  })

  it('skips a squad page with no table', () => {
    const r = report()
    expect(parseSquadPage(SQUAD_PAGE_NO_TABLE, '2002/03', r)).toHaveLength(0)
    expect(r.skipped[0]?.reason).toBe('no squad table')
  })
})

describe('parseMatchPage', () => {
  const context = { seasonLabel: '2001/02', competitionSlug: 'גביע-אופא', stage: null }

  it('parses both clubs, the score and the date', () => {
    const match = parseMatchPage(MATCH_PAGE, context, report())
    expect(match?.homeScore).toBe(2)
    expect(match?.awayScore).toBe(1)
    expect(match?.playedOn).toBe('2002-03-07')
    expect(match?.stage).toBe('1/4 גמר')
    expect(match?.status).toBe('played')
  })

  it('never marks a kickoff time as confirmed', () => {
    const match = parseMatchPage(MATCH_PAGE, context, report())
    expect(match?.kickoffConfirmed).toBe(false)
  })

  it('produces a stable natural key for idempotent loading', () => {
    const first = parseMatchPage(MATCH_PAGE, context, report())
    const second = parseMatchPage(MATCH_PAGE, context, report())
    expect(first?.naturalKey).toBe(second?.naturalKey)
  })

  it('skips a match that does not name both clubs', () => {
    const r = report()
    expect(parseMatchPage(MATCH_PAGE_MISSING_CLUB, context, r)).toBeNull()
    expect(r.skipped[0]?.reason).toContain('does not name both clubs')
  })
})
