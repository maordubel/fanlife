import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {cleanSuggestion,tally,deviceKey} from '@/lib/home/suggestions'
import {REGISTRY} from '@/lib/master/registry'
import {BONUS,SEED_TOTAL,seedVotes} from '@/lib/home/vote'
import {FIXTURE_TEAMS as TEAMS} from '@/lib/fixtures/teams'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'

describe('Suggest the next club',()=>{
 it('keeps a plain club name and refuses links, addresses, empties and long text',()=>{
  expect(cleanSuggestion('  Galatasaray  ')).toBe('Galatasaray')
  expect(cleanSuggestion('a')).toBeNull()
  expect(cleanSuggestion('x'.repeat(81))).toBeNull()
  expect(cleanSuggestion('visit https://spam.example')).toBeNull()
  expect(cleanSuggestion('me@mail.com')).toBeNull()
  expect(cleanSuggestion(42)).toBeNull()
 })
 it('counts one name typed by several fans once, most asked first',()=>{
  const t=tally([{id:'1',text:'Benfica',at:'2026-10-13T10:00:00Z',key:'a'},{id:'2',text:'Galatasaray',at:'2026-10-13T11:00:00Z',key:'b'},{id:'3',text:'benfica',at:'2026-10-13T12:00:00Z',key:'c'}])
  expect(t.map(x=>[x.name,x.count])).toEqual([['Benfica',2],['Galatasaray',1]])
 })
 it('the device key changes every day and stores no address',()=>{
  expect(deviceKey('1.2.3.4','ua','2026-10-13')).not.toBe(deviceKey('1.2.3.4','ua','2026-10-14'))
  expect(deviceKey('1.2.3.4','ua','2026-10-13')).toMatch(/^[0-9a-f]{12}$/)
 })
 it('has English and Hebrew copy for every key, and the page shows the form',()=>{
  for(const k of Object.keys(en).filter(k=>k.startsWith('suggest')))expect((he as Record<string,string>)[k]).toBeTruthy()
  expect(readFileSync('app/page.tsx','utf8')).toContain('<SuggestClub')
 })
})

describe('Fenerbahçe (owner, 13.10.2026)',()=>{
 it('is a registry club, can be matched for fixtures, and carries exactly 9 seeded votes on top of 33',()=>{
  expect(REGISTRY.find(c=>c.id==='fenerbahce')?.country).toBe('Turkey')
  expect(TEAMS.some(t=>t.clubId==='fenerbahce')).toBe(true)
  expect(BONUS.fenerbahce).toBe(9)
  expect(SEED_TOTAL).toBe(42)
  const v=seedVotes(REGISTRY.map(c=>c.id))
  expect(v.fenerbahce).toBe(9)
  expect(Object.values(v).reduce((a,b)=>a+b,0)).toBe(42)
 })
})
