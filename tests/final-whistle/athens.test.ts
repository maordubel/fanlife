import {describe, expect, it} from 'vitest'
import {athensWall, morningAfter, startOfPreviousAthensDay} from '@/lib/final-whistle/athens'

describe('Athens time', () => {
  it('06:00 the next morning, in summer (UTC+3) and winter (UTC+2) time', () => {
    expect(morningAfter('2026-10-15T17:00:00Z')).toBe('2026-10-16T03:00:00.000Z')
    expect(morningAfter('2026-12-10T19:00:00Z')).toBe('2026-12-11T04:00:00.000Z')
  })
  it('a match late on Athens evening still belongs to that Athens day', () => {
    expect(morningAfter('2026-10-15T21:30:00Z')).toBe('2026-10-17T03:00:00.000Z') // 00:30 on the 16th Athens → due the 17th
  })
  it('the clocks changing (25 Oct 2026) do not shift 06:00', () => {
    expect(new Date(athensWall(2026, 10, 25, 6)).toISOString()).toBe('2026-10-25T04:00:00.000Z')
    expect(new Date(athensWall(2026, 10, 24, 6)).toISOString()).toBe('2026-10-24T03:00:00.000Z')
  })
  it('the floor is the start of the previous Athens day', () => {
    expect(new Date(startOfPreviousAthensDay('2026-10-16T13:00:00Z')).toISOString()).toBe('2026-10-14T21:00:00.000Z')
  })
})
