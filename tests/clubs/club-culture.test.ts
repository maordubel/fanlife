import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {clubWorld, cultureInYear, cultureIssues, cultureMissing, cultureOf, validCulture, validateWorld, WORLD_IDS, CULTURE_KINDS} from '@/lib/clubs/world'
import {cultureLineFor, homeOf} from '@/lib/life/universal/culture'
import {OWNER_KNOWLEDGE_LABEL} from '@/lib/credits/groups'

const good = {id: 'x-route', kind: 'route', line: 'Fans take the tram to the ground.', confidence: 2, sources: [{publisher: 'A', url: 'https://a.example.com/p'}, {publisher: 'B', url: 'https://b.example.org/q'}]}

describe('matchday culture in world.json', () => {
  it('accepts every culture kind', () => {
    for (const kind of CULTURE_KINDS) expect(cultureIssues({...good, kind})).toEqual([])
  })
  it('rejects a bad line: one publisher, a forbidden word, http, too long, low confidence, unknown kind', () => {
    expect(cultureIssues({...good, sources: [good.sources[0], {publisher: 'A2', url: 'https://www.a.example.com/z'}]}).join()).toMatch(/distinct publishers/)
    expect(cultureIssues({...good, line: 'The ultras meet here.'}).join()).toMatch(/forbidden/)
    expect(cultureIssues({...good, sources: [{publisher: 'A', url: 'http://a.example.com'}, good.sources[1]]}).join()).toMatch(/https/)
    expect(cultureIssues({...good, line: 'x'.repeat(221)}).join()).toMatch(/longer/)
    expect(cultureIssues({...good, confidence: 1}).join()).toMatch(/confidence/)
    expect(cultureIssues({...good, kind: 'song'}).join()).toMatch(/kind/)
  })
  it('drops a failing line, never the whole file', () => {
    expect(validCulture([good, {...good, id: 'bad', line: 'a song'}, {...good}]).map(c => c.id)).toEqual(['x-route'])
    const w = JSON.parse(readFileSync('club-packs/celtic/world.json', 'utf8'))
    w.culture.push({...good, id: 'celtic-bad', line: 'a riot'})
    expect(validateWorld(w, 'celtic')).toEqual([])
  })
  it('every shipped line passes and is copied from the research with its sources', () => {
    for (const id of WORLD_IDS) {
      const raw = JSON.parse(readFileSync(`club-packs/${id}/world.json`, 'utf8'))
      const w = clubWorld(id)!
      expect(w, id).not.toBeNull()
      expect(w.culture ?? [], id).toEqual(raw.culture ?? [])
      const open = cultureMissing(w)
      if (open.length) expect(raw.note, id).toContain(`Culture research still open: ${open.join(', ')}.`)
    }
  })
  it('the Hapoel lines never call anything but Maccabi Tel Aviv a derby', () => {
    for (const id of ['hapoel-tel-aviv', 'hapoel-petah-tikva']) for (const c of clubWorld(id)?.culture ?? []) if (/derby/i.test(c.line)) expect(c.line).toMatch(/Maccabi Tel Aviv/)
  })
})

describe('LIFE reads culture from world.json only', () => {
  const pack = (culture: never[] | ReturnType<typeof validCulture>) => ({culture, chapters: [{id: 'u1'}, {id: 'night-a', anchor: {year: 2000}}, {id: 'night-b', anchor: {year: 2000}}]} as never)
  it('a night closes on a recorded line; a universal chapter gets none', () => {
    const lines = validCulture([good, {...good, id: 'x-food', kind: 'food', line: 'Pies.'}])
    expect(cultureLineFor(pack(lines), {id: 'night-a', anchor: {year: 2000} as never})?.id).toBe('x-route')
    expect(cultureLineFor(pack(lines), {id: 'night-b', anchor: {year: 2000} as never})?.id).toBe('x-food')
    expect(cultureLineFor(pack(lines), {id: 'u1'})).toBeNull()
  })
  it('a club with no culture gets nothing invented', () => {
    expect(cultureLineFor(pack([]), {id: 'night-a', anchor: {year: 2000} as never})).toBeNull()
    expect(cultureOf(null, 'food')).toEqual([])
    expect(cultureMissing(null)).toEqual([...CULTURE_KINDS])
  })
  it('the pack takes culture from clubWorld, and no LIFE file types a culture line', () => {
    expect(readFileSync('lib/clubs/life/pack.ts', 'utf8')).toMatch(/culture: clubWorld\(id\)\?\.culture/)
    const shipped = WORLD_IDS.flatMap(id => (clubWorld(id)?.culture ?? []).map(c => c.line))
    for (const f of ['lib/life/universal/compose.ts', 'lib/life/universal/culture.ts', 'components/clubs/life/LifeGame.tsx']) {
      const src = readFileSync(f, 'utf8')
      for (const line of shipped) expect(src.includes(line.slice(0, 40)), `${f} types "${line}"`).toBe(false)
    }
  })
})

const OWNER = {publisher: `${OWNER_KNOWLEDGE_LABEL}, 23.10.2026`, owner: true as const}
const owned = {id: 'o-1', kind: 'meetup', line: 'Supporters meet by the bar.', confidence: 2, sources: [OWNER]}

describe('owner-sourced culture (rule 18)', () => {
  it('one owner source is enough, at confidence 2, with the neutral label and no URL', () => {
    expect(cultureIssues(owned)).toEqual([])
    expect(cultureIssues({...owned, confidence: 3}).join()).toMatch(/confidence 2/)
    expect(cultureIssues({...owned, sources: [{...OWNER, url: 'https://x.example.com'}]}).join()).toMatch(/no URL/)
    expect(cultureIssues({...owned, sources: [{publisher: 'מאור הראל', owner: true}]}).join()).toMatch(/never a name/)
    expect(cultureIssues({...owned, sources: [{publisher: OWNER_KNOWLEDGE_LABEL, owner: true}]}).join()).toMatch(/never a name/)
    // without the marker, a source with no URL is just malformed and one publisher is not enough
    expect(cultureIssues({...owned, sources: [{publisher: OWNER.publisher}]})).not.toEqual([])
  })
  it('no shipped source names the owner, and every no-URL source is an owner source', () => {
    for (const id of WORLD_IDS) for (const c of clubWorld(id)?.culture ?? []) for (const s of c.sources) {
      expect(s.publisher).not.toMatch(/מאור|Maor|Harel|הראל/)
      if (!s.url) expect(s.owner, `${id}/${c.id}`).toBe(true)
    }
  })
  it('the political taunt is allowed only in Hapoel Tel Aviv humour', () => {
    const taunt = {...owned, kind: 'humour', line: 'Rival fans call them lefties.'}
    expect(cultureIssues(taunt, 'x', 'hapoel-tel-aviv')).toEqual([])
    expect(cultureIssues(taunt, 'x', 'hapoel-petah-tikva').join()).toMatch(/political word/)
    expect(cultureIssues({...taunt, kind: 'habit'}, 'x', 'hapoel-tel-aviv').join()).toMatch(/political word/)
    expect(cultureIssues({...taunt, line: 'They call them ultras.'}, 'x', 'hapoel-tel-aviv').join()).toMatch(/forbidden/)
    expect(clubWorld('hapoel-tel-aviv')!.culture!.some(c => c.id === 'hapoel-tel-aviv-humour-leftie')).toBe(true)
  })
  it('era-bound lines follow the chapter year: the French Kiss until 2015, the light rail from 2023', () => {
    const w = clubWorld('hapoel-tel-aviv')!
    const byId = (id: string) => w.culture!.find(c => c.id === id)!
    expect(cultureInYear(byId('hapoel-tel-aviv-meetup-french-kiss'), 2010)).toBe(true)
    expect(cultureInYear(byId('hapoel-tel-aviv-meetup-french-kiss'), 2016)).toBe(false)
    expect(cultureInYear(byId('hapoel-tel-aviv-meetup-home-center'), 2016)).toBe(true)
    const rail = w.culture!.find(c => c.kind === 'route' && /light rail has/.test(c.line))!
    expect(rail.fromYear).toBe(2023)
    expect(cultureInYear(byId('hapoel-tel-aviv-route-promenade'), 2020)).toBe(true)
    expect(cultureInYear(rail, 2020)).toBe(false)
    const pack = {culture: w.culture, chapters: [{id: 'night-a', anchor: {year: 1999}}]} as never
    for (let i = 0; i < 1; i++) {
      const line = cultureLineFor(pack, {id: 'night-a', anchor: {year: 1999} as never})!
      expect(cultureInYear(line, 1999)).toBe(true)
    }
    const all = [0, 1, 2, 3, 4, 5, 6, 7].map(n => cultureLineFor({culture: w.culture, chapters: Array.from({length: 8}, (_, k) => ({id: `n${k}`, anchor: {year: 1999}}))} as never, {id: `n${n}`, anchor: {year: 1999} as never})!.id)
    expect(all).not.toContain('hapoel-tel-aviv-meetup-home-center')
    expect(all.some(id => /light-rail|redline|red-line/.test(id))).toBe(false)
  })
  it('AEK lives in Kypseli; a club without a recorded home has none', () => {
    expect(homeOf({culture: clubWorld('aek-athens')!.culture})?.name).toBe('Kypseli')
    expect(homeOf({culture: clubWorld('celtic')!.culture})).toBeNull()
    expect(cultureLineFor({culture: clubWorld('aek-athens')!.culture, chapters: [{id: 'n', anchor: {year: 2000}}]} as never, {id: 'n', anchor: {year: 2000} as never})?.kind).not.toBe('home')
  })
})
