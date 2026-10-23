import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {clubWorld, cultureIssues, cultureMissing, cultureOf, validCulture, validateWorld, WORLD_IDS, CULTURE_KINDS} from '@/lib/clubs/world'
import {cultureLineFor} from '@/lib/life/universal/culture'

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
  const pack = (culture: never[] | ReturnType<typeof validCulture>) => ({culture, chapters: [{id: 'u1'}, {id: 'night-a', anchor: {}}, {id: 'night-b', anchor: {}}]} as never)
  it('a night closes on a recorded line; a universal chapter gets none', () => {
    const lines = validCulture([good, {...good, id: 'x-food', kind: 'food', line: 'Pies.'}])
    expect(cultureLineFor(pack(lines), {id: 'night-a', anchor: {} as never})?.id).toBe('x-route')
    expect(cultureLineFor(pack(lines), {id: 'night-b', anchor: {} as never})?.id).toBe('x-food')
    expect(cultureLineFor(pack(lines), {id: 'u1'})).toBeNull()
  })
  it('a club with no culture gets nothing invented', () => {
    expect(cultureLineFor(pack([]), {id: 'night-a', anchor: {} as never})).toBeNull()
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
