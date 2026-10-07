import {describe,it,expect} from 'vitest'
import {REGISTRY,clubFromHost} from '@/lib/master/registry'
describe('registry',()=>{
 // names, not a count: adding a club says which one (6.10.2026: celtic, partizan-belgrade, union-berlin — research only)
 it('unique ids and subdomains, and the list says which clubs',()=>{expect(REGISTRY.map(c=>c.id).sort()).toEqual(['aek-athens','atalanta','borussia-dortmund','celtic','dinamo-zagreb','hajduk-split','hapoel-petah-tikva','hapoel-tel-aviv','leicester-city','maccabi-haifa','olympiacos','panathinaikos','paok','partizan-belgrade','st-pauli','union-berlin','zrinjski-mostar'].sort());expect(new Set(REGISTRY.map(c=>c.id)).size).toBe(REGISTRY.length);expect(new Set(REGISTRY.map(c=>c.sub)).size).toBe(REGISTRY.length)})
 it('resolves hosts',()=>{
  expect(clubFromHost('HapoelTelAviv.FanLife.DubelTeam.com')).toBe('hapoel-tel-aviv')
  expect(clubFromHost('zrinjski.fanlife.dubelteam.com')).toBe('zrinjski-mostar')
  expect(clubFromHost('zrinjski.localhost:3000')).toBe('zrinjski-mostar')
  expect(clubFromHost('fanlife.dubelteam.com')).toBeNull()
  expect(clubFromHost('www.fanlife.dubelteam.com')).toBeNull()
  expect(clubFromHost('unknown.fanlife.dubelteam.com')).toBeNull()
  expect(clubFromHost('a.zrinjski.fanlife.dubelteam.com')).toBeNull()
  expect(clubFromHost(null)).toBeNull()})
})
