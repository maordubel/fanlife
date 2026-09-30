import { describe, expect, it } from 'vitest'

import { CHAPTERS, anchorOwner, borrowedAnchorKey, isWindow } from '@/lib/life/content/chapters'
import { LifeEngine } from '@/lib/life/engine'

/**
 * של מי העוגן — 21.9.2026.
 *
 * Presence is last-write-wins, and six anchors are shared between the match and the
 * chapter after it. `2000-bridge` closes on "inside" in every ending, so until today a
 * boy who heard the 2000 final on a radio was recorded as having been there. The chapter
 * that owns an anchor says how he was at it; the chapter that borrows it says nothing.
 */
const identity = { name: 'פוגי', sex: 'boy', birthYear: 1978 } as const

describe('the match owns its anchor, the aftermath borrows it', () => {
  it('names the owner of every shared anchor', () => {
    expect(anchorOwner('2000-cup')).toBe('2000-double')
    expect(anchorOwner('2017-nine')).toBe('2017-after')
    expect(anchorOwner('2018-promotion')).toBe('2018-return')
    expect(anchorOwner('2021-cup')).toBe('2021-losses')
    expect(anchorOwner('1986')).toBe('1986')
  })

  it('makes every chapter an owner except the aftermaths — and leaves Stage A alone', () => {
    const borrowers = CHAPTERS.filter((c) => borrowedAnchorKey(c.id) !== null).map((c) => c.id)
    expect(borrowers).toEqual(expect.arrayContaining(['2000-bridge', '2017-distance', '2019-armchair', '2021-promises']))
    for (const id of borrowers) expect(CHAPTERS.find((c) => c.id === id)?.stage, id).not.toBe('A')
    expect(borrowers).not.toContain('2000-double')
  })

  it('keeps the radio of the final when the night after closes on "inside"', () => {
    const engine = new LifeEngine(identity, 1986)
    engine.dispatch({ t: 'chapter.entered', chapter: '2000-double' })
    engine.dispatch({ t: 'presence.recorded', anchorId: '2000-cup:גביע-המדינה:1999/00', mode: 'radio' })
    engine.dispatch({ t: 'chapter.entered', chapter: '2000-bridge' })
    engine.dispatch({ t: 'presence.recorded', anchorId: '2000-cup:גביע-המדינה:1999/00', mode: 'inside' })
    expect(engine.state.presence['2000-cup:גביע-המדינה:1999/00']).toBe('radio')
    // and the refused line is not in the log at all — a log is append-only (rule 45)
    const written = engine.log().filter((event) => event.t === 'presence.recorded')
    expect(written).toHaveLength(1)
  })

  it('still lets the owner change its mind within its own chapter', () => {
    const engine = new LifeEngine(identity, 1986)
    engine.dispatch({ t: 'chapter.entered', chapter: '2021-losses' })
    engine.dispatch({ t: 'presence.recorded', anchorId: '2021-cup:גביע-המדינה:2020/21', mode: 'late' })
    engine.dispatch({ t: 'presence.recorded', anchorId: '2021-cup:גביע-המדינה:2020/21', mode: 'inside' })
    expect(engine.state.presence['2021-cup:גביע-המדינה:2020/21']).toBe('inside')
  })
})

describe('a window never becomes the owner of somebody else’s match', () => {
  it('leaves every anchor with the chapter it had before the windows were written', () => {
    const windows = CHAPTERS.filter(isWindow)
    for (const window of windows) {
      expect(anchorOwner(window.anchorKey), `${window.id} took ${window.anchorKey}`).not.toBe(window.id)
    }
  })
})
