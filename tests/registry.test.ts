import {describe,it,expect} from 'vitest'
import {REGISTRY,clubFromHost} from '@/lib/master/registry'
describe('registry',()=>{
 it('14 unique ids and subdomains',()=>{expect(REGISTRY).toHaveLength(14);expect(new Set(REGISTRY.map(c=>c.id)).size).toBe(14);expect(new Set(REGISTRY.map(c=>c.sub)).size).toBe(14)})
 it('resolves hosts',()=>{
  expect(clubFromHost('HapoelTelAviv.Fanlife.game')).toBe('hapoel-tel-aviv')
  expect(clubFromHost('zrinjski.fanlife.game')).toBe('zrinjski-mostar')
  expect(clubFromHost('zrinjski.localhost:3000')).toBe('zrinjski-mostar')
  expect(clubFromHost('fanlife.game')).toBeNull()
  expect(clubFromHost('www.fanlife.game')).toBeNull()
  expect(clubFromHost('unknown.fanlife.game')).toBeNull()
  expect(clubFromHost('a.zrinjski.fanlife.game')).toBeNull()
  expect(clubFromHost(null)).toBeNull()})
})
