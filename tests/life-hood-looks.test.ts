import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {lookFor, ROLE_OF, type LookPick} from '@/lib/life/hood/looks'

const INDEX = (JSON.parse(readFileSync('public/life/assets/manifest.json', 'utf8')) as {looks: {index: LookPick[]}}).looks.index

describe('LIFE · who wears what (lib/life/hood/looks.ts, the manifest the asset pipeline publishes)', () => {
  it('dresses the father in the clothes of the street\'s decade', () => {
    expect(lookFor(INDEX, {role: 'father', club: 'olympiacos', decade: '80s'})?.asset).toBe('look-father')
    expect(lookFor(INDEX, {role: 'father', club: 'olympiacos', decade: '90s'})?.asset).toBe('look-father-90s')
    expect(lookFor(INDEX, {role: 'father', club: 'celtic', decade: '00s'})?.asset).toBe('look-father-00s')
    expect(lookFor(INDEX, {role: 'father', club: 'celtic', decade: '20s'})?.asset).toBe('look-father-20s')
    // a decade nobody built: the nearest earlier one (a man keeps last decade's coat), never a later one first
    expect(lookFor(INDEX, {role: 'father', club: 'celtic', decade: '70s'})?.decade).toBe('80s')
    expect(lookFor(INDEX, {role: 'father', club: 'celtic', decade: null})?.asset).toBe('look-father')
  })
  it('gives THE WORKER\'s own people to Hapoel Tel Aviv and to nobody else', () => {
    expect(lookFor(INDEX, {role: 'father', club: 'hapoel-tel-aviv', decade: '80s'})?.asset).toBe('look-hta-kobi')
    expect(lookFor(INDEX, {role: 'kiosk', club: 'hapoel-tel-aviv', decade: '80s'})?.asset).toBe('look-hta-kiosk')
    for (const club of ['olympiacos', 'panathinaikos', 'celtic', 'zrinjski-mostar']) for (const role of ['father', 'mother', 'hero', 'friend', 'kiosk', 'neighbour'] as const) {
      const r = lookFor(INDEX, {role, club, decade: '90s', age: 10})
      if (r) { expect(r.family, `${club} ${role}`).toBe('universal'); expect(r.asset.startsWith('look-hta-'), `${club} ${role}`).toBe(false) }
    }
  })
  it('lets the boy wear the look of his own age, never an older boy\'s when a younger one fits', () => {
    expect(lookFor(INDEX, {role: 'hero', club: 'olympiacos', decade: '80s', age: 6})?.asset).toBe('look-hero-6')
    expect(lookFor(INDEX, {role: 'hero', club: 'olympiacos', decade: '80s', age: 9})?.asset).toBe('look-hero-6')
    expect(lookFor(INDEX, {role: 'hero', club: 'olympiacos', decade: '80s', age: 12})?.asset).toBe('look-hero-12')
    expect(lookFor(INDEX, {role: 'hero', club: 'olympiacos', decade: '00s', age: 13})?.asset).toBe('look-hero-12-00s')
    expect(lookFor(INDEX, {role: 'hero', club: 'olympiacos', decade: '90s', age: 16})?.asset).toBe('look-hero-15')
    expect(lookFor(INDEX, {role: 'hero', club: 'hapoel-tel-aviv', decade: '80s', age: 8})?.asset).toBe('look-hta-pogi-8')
  })
  it('knows every person of the hood, and changes nobody it has no look for', () => {
    for (const id of ['dad', 'mate', 'kiosk', 'neighbour']) expect(lookFor(INDEX, {role: ROLE_OF[id]!, club: 'olympiacos', decade: '80s'}), id).not.toBeNull()
    expect(lookFor([], {role: 'father', club: 'olympiacos', decade: '80s'})).toBeNull()
    expect(ROLE_OF.stranger).toBeUndefined()
  })
  it('names only files the pipeline built', () => {
    for (const r of INDEX) expect(() => readFileSync(`public/life/assets/cast/${r.asset}.glb`), r.asset).not.toThrow()
  })
})
