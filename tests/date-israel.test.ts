import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { addDays, monthDayInIsrael, todayInIsrael } from '@/lib/date/israel'
import { todayInIsrael as blindCowToday } from '@/lib/game/blind-cow/bank'
import { emptyProfile, historyGrid, streak } from '@/lib/profile/store'

/**
 * ONE RED WORLD §21 / P0.2 — "today" is the day it is in Israel.
 *
 * `toISOString().slice(0, 10)` is UTC, and from midnight until 02:00 (winter) or 03:00
 * (summer) that is yesterday in Tel Aviv. The archive's "היום לפני" printed the wrong
 * anniversaries for those hours and the Blind Cow daily kept its own copy of the fix.
 */

describe('todayInIsrael', () => {
  it('23:30 UTC on 30 September is already 1 October in Israel (summer time, UTC+3)', () => {
    expect(todayInIsrael(new Date('2026-09-30T23:30:00Z'))).toBe('2026-10-01')
    expect(monthDayInIsrael(new Date('2026-09-30T23:30:00Z'))).toBe('10-01')
  })

  it('winter time is UTC+2: 21:59 UTC is still the same day, 22:00 UTC is the next', () => {
    expect(todayInIsrael(new Date('2026-12-31T21:59:00Z'))).toBe('2026-12-31')
    expect(todayInIsrael(new Date('2026-12-31T22:00:00Z'))).toBe('2027-01-01')
  })

  it('summer time is UTC+3: 20:59 UTC is still the same day, 21:00 UTC is the next', () => {
    expect(todayInIsrael(new Date('2026-07-14T20:59:00Z'))).toBe('2026-07-14')
    expect(todayInIsrael(new Date('2026-07-14T21:00:00Z'))).toBe('2026-07-15')
  })

  it('holds across both DST edges of 2026 (on 27 March, off 25 October)', () => {
    // the night clocks go forward (Fri 27 Mar 2026, 02:00 → 03:00 local)
    expect(todayInIsrael(new Date('2026-03-26T21:59:00Z'))).toBe('2026-03-26')
    expect(todayInIsrael(new Date('2026-03-26T22:00:00Z'))).toBe('2026-03-27')
    expect(todayInIsrael(new Date('2026-03-27T21:00:00Z'))).toBe('2026-03-28')
    // the night clocks go back (Sun 25 Oct 2026, 02:00 → 01:00 local)
    expect(todayInIsrael(new Date('2026-10-24T20:59:00Z'))).toBe('2026-10-24')
    expect(todayInIsrael(new Date('2026-10-24T21:00:00Z'))).toBe('2026-10-25')
    expect(todayInIsrael(new Date('2026-10-25T21:59:00Z'))).toBe('2026-10-25')
    expect(todayInIsrael(new Date('2026-10-25T22:00:00Z'))).toBe('2026-10-26')
  })

  it('agrees with UTC through the Israeli afternoon', () => {
    expect(todayInIsrael(new Date('2026-09-30T12:00:00Z'))).toBe('2026-09-30')
  })

  it('is the one Blind Cow uses — a re-export, not a second copy', () => {
    const at = new Date('2026-09-30T23:30:00Z')
    expect(blindCowToday(at)).toBe(todayInIsrael(at))
    const bank = readFileSync(join(process.cwd(), 'lib/game/blind-cow/bank.ts'), 'utf8')
    expect(bank).not.toMatch(/Intl\.DateTimeFormat/)
  })
})

describe('addDays', () => {
  it('steps calendar days across month, year and DST boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2026-03-27', 1)).toBe('2026-03-28')
    expect(addDays('2026-10-25', -1)).toBe('2026-10-24')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })
})

describe('day-keyed features read the Israel day', () => {
  it('the archive route asks the helper, not UTC', () => {
    const page = readFileSync(join(process.cwd(), 'app/archive/page.tsx'), 'utf8')
    expect(page).toMatch(/todayInIsrael\(\)/)
    expect(page).not.toMatch(/toISOString\(\)\.slice\(0, ?10\)/)
  })

  it('a game played at 00:30 Tel Aviv time keeps the streak alive that day', () => {
    const now = new Date('2026-09-30T21:30:00Z') // 00:30 on 1 October in Israel
    const profile = { ...emptyProfile(), days: ['2026-10-01', '2026-09-30', '2026-09-29'] }
    expect(streak(profile, now)).toBe(3)
    const grid = historyGrid(profile, now)
    expect(grid[grid.length - 1]).toBe(true)
  })
})
