import {describe, expect, it} from 'vitest'
import {reelBeats, reelLength, voiceLines, MAX_PLACES, MAX_VOICE} from '@/lib/life/universal/reel'

const base = {no: 3, of: 32, age: 9, prevAge: 7, title: 'The Ticket', kicker: 'Age 9', intro: 'First sentence. Second one! Third is cut.', places: ['Street', 'Gate', 'Stand', 'Kiosk', 'Street']}

describe('chapter reel', () => {
  it('opens on a slate, ends on the title, and keeps the order', () => {
    const b = reelBeats(base)
    expect(b[0]!.k).toBe('slate')
    expect(b.at(-1)!.k).toBe('title')
    expect(b.map(x => x.k)).toEqual(['slate', 'place', 'place', 'place', 'voice', 'voice', 'title'])
  })
  it('is short: at most three places, two narrator lines, under fifteen seconds', () => {
    const b = reelBeats(base)
    expect(b.filter(x => x.k === 'place').length).toBeLessThanOrEqual(MAX_PLACES)
    expect(b.filter(x => x.k === 'voice').length).toBeLessThanOrEqual(MAX_VOICE)
    expect(reelLength(b)).toBeLessThan(15000)
  })
  it('counts up from the last age and never down', () => {
    const s = reelBeats({...base, prevAge: 20})[0]!
    expect(s.k === 'slate' && s.from <= s.to).toBe(true)
    expect(reelBeats({...base, prevAge: 0})[0]).toMatchObject({from: 0, to: 9})
  })
  it('works with no places and no intro', () => {
    const b = reelBeats({...base, places: [], intro: ''})
    expect(b.map(x => x.k)).toEqual(['slate', 'title'])
  })
  it('splits Hebrew and English sentences', () => {
    expect(voiceLines('אחד. שניים? שלושה.')).toEqual(['אחד.', 'שניים?'])
  })
})
