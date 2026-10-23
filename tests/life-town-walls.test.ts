/**
 * LIFE · TOWN — what a wall may say, and which city a street is (owner, 23.10.2026).
 *
 * A wall carries the designer's graffiti or bare paint: the town never letters a word of its own on it — no club
 * name, no score, no slogan, no invented school name. A street is built as its city: Glasgow and Hamburg have their own,
 * and Petah Tikva, Haifa and Thessaloniki are a city layer over their country's street. What a city put up or took
 * down stands only in the years it stood.
 */
import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {REGISTRY} from '@/lib/master/registry'
import {allSkins} from '@/lib/clubs/life/skins'

const street = readFileSync('public/life/town/rooms_street.js', 'utf8')
const home = readFileSync('public/life/town/rooms_home.js', 'utf8')
const kit = readFileSync('public/life/town/kit.js', 'utf8')

function body(src: string, head: string, next: string) {
  const i = src.indexOf(head)
  expect(i, head).toBeGreaterThan(-1)
  return src.slice(i, src.indexOf(next, i + head.length))
}

describe('a wall says nothing of its own', () => {
  it('the wall painter letters no text and takes no words', () => {
    const graf = body(street, 'K.graf=function', ' K.ball=function')
    expect(graf).not.toMatch(/fillText|strokeText|o\.words|o\.tag/)
    expect(street).not.toMatch(/K\.graf\([^)]*\{\s*words/)
    expect(street).not.toMatch(/K\.graf\([^)]*tag:/)
  })
  it('the old code-drawn graffiti texture is gone', () => {
    expect(kit).not.toMatch(/function graffiti\(/)
    expect(kit).not.toMatch(/graffiti:graffiti/)
  })
  it('the schoolyard writes no club name, no score and no invented school', () => {
    const yard = body(home, "RM.def('schoolyard'", "RM.def(")
    expect(yard).not.toContain("'1 : 0'")
    expect(yard).not.toContain('Achdut')
    expect(yard).not.toMatch(/fillText\([^)]*__CK\.SHORT/)
    expect(yard).toContain('__CK.W.school')
  })
  it('a flag from a street window carries colours, not a word', () => {
    expect(street).not.toMatch(/K\.cloth\(__CK\.(SHORT|City|CITY),/)
  })
})

describe("the designer's graffiti reaches every club's walls", () => {
  const w: {__GRAFFITI?: {rects: Record<string, [string, number, number][]>; clubs: Record<string, [string, number][]>}} = {}
  new Function('window', readFileSync('public/life/town/tex/graffiti/rects.js', 'utf8'))(w)
  const G = w.__GRAFFITI!
  const OWN = new Set(['aek-athens', 'panathinaikos', 'olympiacos', 'zrinjski-mostar'])
  it.each(REGISTRY.map(c => c.id))('%s has pieces, and none from another club', id => {
    const list = G.clubs[id]
    expect(list?.length).toBeGreaterThan(0)
    for (const [sheet, i] of list!) {
      expect(G.rects[sheet]?.[i], `${sheet}-${i}`).toBeTruthy()
      if (OWN.has(sheet)) expect(sheet).toBe(id)
    }
  })
  it('the Athens sheet stays on Athens walls', () => {
    for (const [id, list] of Object.entries(G.clubs)) if (list.some(([s]) => s === 'athens')) expect(['aek-athens', 'panathinaikos', 'olympiacos']).toContain(id)
  })
})

describe('every city its own street', () => {
  const skins = allSkins()
  it.each([
    ['hapoel-tel-aviv', 'tlv', null], ['hapoel-petah-tikva', 'tlv', 'pt'], ['maccabi-haifa', 'tlv', 'hfa'],
    ['aek-athens', 'ath', null], ['paok', 'ath', 'thes'], ['zrinjski-mostar', 'mos', null],
    ['st-pauli', 'ham', null], ['celtic', 'gla', null],
  ] as const)('%s builds as %s, layer %s', (id, town, city) => {
    expect(skins[id]!.town).toBe(town)
    expect(skins[id]!.cityLayer ?? null).toBe(city)
    expect(typeof skins[id]!.city).toBe('string')
  })
  it('each city has its signs and its own view through the gap', () => {
    const table = body(street, ' K.CITY=({', '})[CK]||null;')
    const land = body(street, 'K.landmark=function', ' var FLT=')
    for (const k of ['ath', 'thes', 'tlv', 'pt', 'hfa', 'mos', 'gla', 'ham']) {
      expect(table, k).toMatch(new RegExp(`\\b${k}:city\\(\\{cafe:'[^']+',food:'[^']+',plate:'[^']+'`))
      expect(land, k).toContain(`CK==='${k}'`)
    }
  })
  it('a national flag goes up only where it takes no side: Mostar, Glasgow and Hamburg fly the club string', () => {
    for (const k of ['mos', 'gla', 'ham']) expect(street).toMatch(new RegExp(`\\b${k}:city\\(\\{[^}]*flag:'club'`))
  })
})

describe('what a city built stands only in its years', () => {
  it('the street reads the year it stands in', () => {
    expect(body(street, 'function kit(c)', 'K.img=function')).toMatch(/c\.o\.year/)
  })
  it.each([
    ['shared e-scooters from 2018', /K\.YR>=2018\)\{K\.scooter/],
    ["Tel Aviv's towers from 1999", /YR>=1999\?\[\[1\.2,2\.6,15\]/],
    ['no Stari Most from 1993 until 2004', /var MOST=!\(YR>=1993&&YR<2004\)/],
    ["Haifa's Sail Tower from 2002", /YR>=2002\)\{g\.fillStyle/],
    ["Glasgow's Hydro from 2013", /YR>=2013\)/],
    ['the Elbphilharmonie from 2017', /YR>=2017\)/],
    ["Petah Tikva's towers from 2000, its groves before 1995", /YR>=2000\)tower\([\s\S]*YR<1995\)/],
  ])('%s', (_, re) => expect(street).toMatch(re))
})
