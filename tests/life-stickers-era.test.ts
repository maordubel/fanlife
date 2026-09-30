import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  ALL_DECADES_COMPLETE,
  SETS,
  SET_ORDER,
  STICKERS,
  STICKER_ERAS,
  STICKER_ERA_COVERAGE,
  eraOfYear,
  stickersIn,
} from '@/lib/life/stickers'

/**
 * סופרגול — העשורים (27.9.2026).
 *
 * Each page now says which decade it is and how the life hands it over. The archive holds
 * scans from the eighties and the nineties only, so the registry has to SAY that the other
 * three decades are a gap — and "every decade" may not be advertised while they are.
 *
 * Packet safety (`neverInPacket` never dealt) is covered by `tests/life-stickers.test.ts`
 * ("deals three, and never the one that closes the page"); below it is checked for every
 * page a kiosk sells, not only 1985/86, through the `acquisition` field.
 */

/** the ids as they were on 27.9.2026 (the 2000s pages appended the same evening — appended, never inserted) — saves key on them (`album:sg:<id>`), so they never move */
const SET_IDS_SNAPSHOT = ['8081', '8586', 'sg80a', 'sgcup', 'sg80b', '9293', 'sg90', 'sg978', 'sg0203', 'sg00', '96', 'box']
const STICKER_IDS_SNAPSHOT = [
  'bezredno', 'landau', 'eli-cohen', 'ekhoiz', 'zano',
  'a-sg80a-00', 'a-sg80a-01', 'a-sg80a-02', 'a-sg80a-04', 'a-sg80a-05', 'a-sg80a-06', 'a-sg80a-07', 'a-sg80a-08',
  'a-sg80a-09', 'a-sg80a-10', 'a-sg80a-11', 'a-sg80a-13', 'a-sg80a-14', 'a-sg80a-12', 'a-sg80a-03',
  'c-sgcup-00', 'c-sgcup-01', 'c-sgcup-02', 'c-sgcup-03', 'c-sgcup-04', 'c-sgcup-05', 'c-sgcup-06', 'c-sgcup-07',
  'c-sgcup-08', 'c-sgcup-09', 'c-sgcup-10', 'c-sgcup-11', 'c-sgcup-13', 'c-sgcup-12',
  'b-sg80b-03', 'b-sg80b-04', 'b-sg80b-02', 'b-sg80b-01', 'b-sg80b-00', 'b-sg80b-09', 'b-sg80b-08', 'b-sg80b-07',
  'b-sg80b-06', 'b-sg80b-05', 'b-sg80b-14', 'b-sg80b-13', 'b-sg80b-12', 'b-sg80b-11', 'b-sg80b-10', 'b-sg80b-16',
  'b-sg80b-17', 'b-sg80b-15', 'b-sg80b-18',
  'halfon',
  'e-sg90-00', 'e-sg90-01', 'e-sg90-02', 'e-sg90-03', 'e-sg90-05', 'e-sg90-06', 'e-sg90-07', 'e-sg90-08',
  'e-sg90-09', 'e-sg90-10', 'e-sg90-11', 'e-sg90-12', 'e-sg90-13', 'e-sg90-04',
  'd-sg978-00', 'd-sg978-01', 'd-sg978-02', 'd-sg978-04', 'd-sg978-05', 'd-sg978-06', 'd-sg978-07', 'd-sg978-08',
  'd-sg978-09', 'd-sg978-10', 'd-sg978-11', 'd-sg978-12', 'd-sg978-14', 'd-sg978-15', 'd-sg978-17',
  'd-kt-dreslia', 'd-kt-moskal', 'd-hand-shitrit', 'd-kt-simrotic', 'd-kt-tikva', 'd-sg978-03',
  'e-sg0203-00', 'e-sg0203-08', 'e-sg0203-02', 'e-sg0203-03', 'e-sg0203-04', 'e-sg0203-05', 'e-sg0203-06',
  'e-sg0203-07', 'e-sg0203-09', 'e-sg0203-10', 'e-sg0203-11', 'e-sg0203-12', 'e-sg0203-01', 'e-sg0203-13',
  'f-sg00-balili', 'f-sg00-elimelech', 'f-hand-antebi', 'f-hand-talchen', 'f-hand-avrbrl',
  'tikva',
  'box-ace-chodorov', 'box-ace-levkovich', 'box-ace-tish', 'box-ace-primo', 'box-ace-feingboim',
  'box-hand-hershkovitz', 'box-hand-rufnik',
]

describe('סופרגול — העשור ודרך ההגעה של כל דף', () => {
  it('gives every set an era and an acquisition', () => {
    for (const id of SET_ORDER) {
      const set = SETS[id]
      expect(STICKER_ERAS, id).toContain(set.era)
      expect(['packet', 'gift', 'archive', 'special'], id).toContain(set.acquisition)
    }
  })

  it('reads the era off the season the page prints', () => {
    for (const id of SET_ORDER) {
      const year = /(\d{4})/.exec(SETS[id].seasonHe)
      if (year) expect(SETS[id].era, id).toBe(eraOfYear(Number(year[1])))
      else if (SETS[id].soldIn) expect(SETS[id].era, id).toBe(SETS[id].soldIn)
    }
    expect(SETS['8586'].era).toBe('80s')
    expect(SETS['9293'].era).toBe('90s')
    expect(SETS['96'].era).toBe('90s')
  })

  it('calls a page a packet page exactly when a kiosk sells it', () => {
    for (const id of SET_ORDER) {
      expect(SETS[id].acquisition === 'packet', id).toBe(SETS[id].soldIn !== null)
    }
    expect(SETS.box.acquisition).toBe('archive')
    expect(SETS['8081'].acquisition).toBe('archive')
    expect(SETS['96'].acquisition).toBe('gift')
  })

  it('never lets a page that is not a packet page put a card in a packet', () => {
    for (const id of SET_ORDER) {
      if (SETS[id].acquisition === 'packet') continue
      for (const sticker of stickersIn(id)) expect(sticker.neverInPacket, sticker.id).toBe(true)
    }
  })
})

describe('סופרגול — אין מדבקה בלי סריקה', () => {
  it('every sticker carries a scan that ships', () => {
    for (const sticker of STICKERS) {
      expect(sticker.scan, sticker.id).toBeTruthy()
      expect(existsSync(join(process.cwd(), 'public', sticker.scan)), sticker.scan).toBe(true)
    }
  })
})

describe('סופרגול — כיסוי העשורים', () => {
  it('marks every decade either verified by a real page of that era, or an explicit asset gap', () => {
    for (const era of STICKER_ERAS) {
      const coverage = STICKER_ERA_COVERAGE[era]
      const sets = SET_ORDER.filter((id) => SETS[id].era === era && stickersIn(id).length > 0)
      if (coverage.status === 'verified') expect(sets.length, era).toBeGreaterThanOrEqual(1)
      else {
        expect(sets, era).toEqual([])
        expect(coverage.noteHe, era).toMatch(/סריקות אמיתיות/)
      }
    }
  })

  // 27.9.2026 — the 2000s flipped: the approved folder carried a real 2002/03 set and three
  // album stickers from 2004 and 2007. The two later decades are still gaps, by name.
  it('holds the eighties, nineties and 2000s as verified and the two later decades as gaps', () => {
    expect(STICKER_ERA_COVERAGE['80s'].status).toBe('verified')
    expect(STICKER_ERA_COVERAGE['90s'].status).toBe('verified')
    expect(STICKER_ERA_COVERAGE['00s'].status).toBe('verified')
    for (const era of ['10s', '20s'] as const) expect(STICKER_ERA_COVERAGE[era].status, era).toBe('asset-gap')
  })

  it('does not claim every decade while any is a gap', () => {
    const gaps = STICKER_ERAS.filter((era) => STICKER_ERA_COVERAGE[era].status === 'asset-gap')
    expect(ALL_DECADES_COMPLETE).toBe(gaps.length === 0)
    expect(ALL_DECADES_COMPLETE).toBe(false)
  })
})

describe('סופרגול — המזהים לא זזים', () => {
  it('keeps every set id and sticker id a save may hold', () => {
    expect([...SET_ORDER]).toEqual(SET_IDS_SNAPSHOT)
    expect(STICKERS.map((sticker) => sticker.id)).toEqual(STICKER_IDS_SNAPSHOT)
  })
})
