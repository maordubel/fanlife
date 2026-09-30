import { describe, expect, it } from 'vitest'

import {
  IngestValueError,
  canonicalSeasonLabel,
  normalizeName,
  parseIsoDate,
  parseMinute,
  parsePosition,
  parseScore,
  parseShirtNumber,
  slugify,
} from '@/scripts/ingest/lib/normalize'

describe('normalizeName', () => {
  it('strips gershayim so the same club matches across sources', () => {
    expect(normalizeName('הפועל ת"א')).toBe(normalizeName('הפועל תא'))
    expect(normalizeName("צ'רלי")).toBe(normalizeName('צרלי'))
  })

  it('strips bracketed qualifiers but keeps the words', () => {
    expect(normalizeName('הפועל תל אביב (כדורגל)')).toBe('הפועל תל אביב')
  })

  it('collapses whitespace and is case-insensitive for Latin', () => {
    expect(normalizeName('  Hapoel   TEL aviv ')).toBe('hapoel tel aviv')
  })

  it('is idempotent', () => {
    const once = normalizeName('הפועל ת"א (כדורגל)')
    expect(normalizeName(once)).toBe(once)
  })

  it('does not merge two genuinely different names', () => {
    expect(normalizeName('הפועל תל אביב')).not.toBe(normalizeName('מכבי תל אביב'))
  })
})

describe('slugify', () => {
  it('produces a stable hyphenated key', () => {
    expect(slugify('הפועל תל אביב')).toBe('הפועל-תל-אביב')
  })

  it('refuses an empty key rather than inventing one', () => {
    expect(() => slugify('   ')).toThrow(IngestValueError)
  })
})

describe('canonicalSeasonLabel', () => {
  it.each([
    ['2001/02', '2001/02'],
    ['2001-02', '2001/02'],
    ['2001–02', '2001/02'],
    ['2001/2002', '2001/02'],
  ])('canonicalises %s', (input, expected) => {
    expect(canonicalSeasonLabel(input).label).toBe(expected)
  })

  it('rolls the century at 1999/00', () => {
    const season = canonicalSeasonLabel('1999/00')
    expect(season.label).toBe('1999/00')
    expect(season.startYear).toBe(1999)
    expect(season.endYear).toBe(2000)
  })

  it('treats a single year as that year to the next', () => {
    expect(canonicalSeasonLabel('1955')).toEqual({
      label: '1955/56',
      startYear: 1955,
      endYear: 1956,
    })
  })

  it('rejects a span longer than one year instead of coercing it', () => {
    expect(() => canonicalSeasonLabel('2001/03')).toThrow(IngestValueError)
  })

  it('rejects an impossible year', () => {
    expect(() => canonicalSeasonLabel('1823/24')).toThrow(IngestValueError)
  })

  it('rejects unparseable input rather than guessing', () => {
    expect(() => canonicalSeasonLabel('עונת הזהב')).toThrow(IngestValueError)
  })
})

describe('parseShirtNumber', () => {
  it('reads a plain number and a decorated one', () => {
    expect(parseShirtNumber('10')).toBe(10)
    expect(parseShirtNumber('מס׳ 7')).toBe(7)
  })

  it('returns null for a blank cell', () => {
    expect(parseShirtNumber('')).toBeNull()
    expect(parseShirtNumber(null)).toBeNull()
    expect(parseShirtNumber('—')).toBeNull()
  })

  it('rejects out-of-range numbers rather than clamping', () => {
    expect(() => parseShirtNumber('0')).toThrow(IngestValueError)
    expect(() => parseShirtNumber('123')).toThrow(IngestValueError)
  })
})

describe('parsePosition', () => {
  it.each([
    ['שוער', 'GK'],
    ['בלם', 'DF'],
    ['קשר', 'MF'],
    ['חלוץ', 'FW'],
  ])('maps %s', (input, expected) => {
    expect(parsePosition(input)).toBe(expected)
  })

  it('leaves an unknown position unknown instead of guessing', () => {
    expect(parsePosition('ישראל')).toBe('UNK')
    expect(parsePosition(null)).toBe('UNK')
  })

  it('does not mistake the typo that once deleted every forward', () => {
    // A source typo must not silently map to a real position.
    expect(parsePosition('חלון')).toBe('UNK')
  })
})

describe('parseScore', () => {
  it.each([
    ['2:1', { home: 2, away: 1 }],
    ['2-1', { home: 2, away: 1 }],
    ['0 – 0', { home: 0, away: 0 }],
  ])('reads %s', (input, expected) => {
    expect(parseScore(input)).toEqual(expected)
  })

  it('returns null when no score is present', () => {
    expect(parseScore('נדחה')).toBeNull()
    expect(parseScore(null)).toBeNull()
  })
})

describe('parseIsoDate', () => {
  it('reads Israeli and ISO formats', () => {
    expect(parseIsoDate('7.3.2002')).toBe('2002-03-07')
    expect(parseIsoDate('07/03/2002')).toBe('2002-03-07')
    expect(parseIsoDate('2002-03-07')).toBe('2002-03-07')
  })

  it('returns null for a partial date rather than completing it', () => {
    expect(parseIsoDate('מרץ 2002')).toBeNull()
  })

  it('rejects an impossible date', () => {
    expect(() => parseIsoDate('32.13.2002')).toThrow(IngestValueError)
  })
})

describe('parseMinute', () => {
  it('reads stoppage time separately', () => {
    expect(parseMinute("45+2'")).toEqual({ minute: 45, extra: 2 })
    expect(parseMinute('90')).toEqual({ minute: 90, extra: null })
  })

  it('rejects an impossible minute', () => {
    expect(() => parseMinute('200')).toThrow(IngestValueError)
  })
})
