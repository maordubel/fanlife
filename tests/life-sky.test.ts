import {describe, expect, it} from 'vitest'
import {skyOf} from '@/lib/life/universal/sky'

describe('LIFE sky', () => {
  it('is the same for the same chapter, every time', () => {
    for (const id of ['c1', 'c2', 'derby', 'first-shirt']) expect(skyOf(id, 'day', true)).toEqual(skyOf(id, 'day', true))
  })
  it('never rains or fades the light under a roof', () => {
    for (let i = 0; i < 60; i++) expect(skyOf(`chapter-${i}`, 'day', false)).toEqual({weather: null, mood: 'normal'})
  })
  it('is mostly an ordinary day, with some rain and some evening light', () => {
    const seen = {rain: 0, dusk: 0, normal: 0}
    for (let i = 0; i < 200; i++) seen[skyOf(`chapter-${i}`, 'day', true).mood]++
    expect(seen.rain).toBeGreaterThan(15)
    expect(seen.dusk).toBeGreaterThan(15)
    expect(seen.normal).toBeGreaterThan(80)
  })
  it('keeps the night a night: no evening grading on top of it', () => {
    for (let i = 0; i < 60; i++) expect(skyOf(`chapter-${i}`, 'night', true).mood).not.toBe('dusk')
  })
})
