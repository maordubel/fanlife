import {describe,expect,it} from 'vitest'
import {REGISTRY} from '@/lib/master/registry'
import {clubWorld,validateWorld,worldFor,worldPublishers,WORLD_IDS,TAB_MAX} from '@/lib/clubs/world'
import {existsSync} from 'node:fs'
import {join} from 'node:path'

describe('club world data',()=>{
 it('every core club that has an identity file has a world file that validates',()=>{
  for(const c of REGISTRY.filter(c=>existsSync(join(process.cwd(),'club-packs',c.id,'identity.json')))){
   expect(existsSync(join(process.cwd(),'club-packs',c.id,'world.json')),c.id).toBe(true)
   expect(validateWorld(clubWorld(c.id)??{},c.id),c.id).toEqual([])
   expect(clubWorld(c.id),c.id).not.toBeNull()
  }
  expect(WORLD_IDS.length).toBe(5)
 })
 it('rejects a line with one publisher, a low confidence, http, a long tab and a forbidden word',()=>{
  const base=clubWorld('olympiacos')!
  const bad=(patch:object)=>validateWorld({...base,...patch},'olympiacos')
  expect(bad({colours:{line:'Red.',confidence:3,sources:[{publisher:'A',url:'https://a.example/x'}]}}).join()).toMatch(/2 distinct/)
  expect(bad({colours:{line:'Red.',confidence:1,sources:base.colours!.sources}}).join()).toMatch(/confidence/)
  expect(bad({colours:{line:'Red.',confidence:3,sources:[{publisher:'A',url:'http://a.example/x'},{publisher:'B',url:'https://b.example/x'}]}}).join()).toMatch(/not https/)
  expect(bad({terrace:{...base.terrace!,tab:'Far too long'}}).join()).toMatch(/tab/)
  expect(bad({voice:{welcome:'Yellow and proud.',kicker:'Piraeus'}}).join()).toMatch(/forbidden/)
  expect(bad({clubId:'other'}).join()).toMatch(/clubId/)
 })
 it('two pages of one publisher are one publisher',()=>{
  const base=clubWorld('olympiacos')!
  const same=[{publisher:'Wikipedia',url:'https://en.wikipedia.org/a'},{publisher:'Wikipedia',url:'https://it.wikipedia.org/b'}]
  expect(validateWorld({...base,colours:{line:'Red.',confidence:3,sources:same}},'olympiacos').join()).toMatch(/2 distinct/)
 })
 it('keeps the researched corrections',()=>{
  expect(clubWorld('zrinjski-mostar')!.colours!.line).toMatch(/white shirt/i)
  expect(clubWorld('panathinaikos')!.ground!.name).toBe('Leoforos')
  expect(clubWorld('hapoel-tel-aviv')!.founded!.line).not.toMatch(/\b19\d\d\b/)
 })
 it('terrace tabs fit a tab bar',()=>{
  for(const id of WORLD_IDS)expect(clubWorld(id)!.terrace!.tab.length).toBeLessThanOrEqual(TAB_MAX)
 })
 it('a club without a world gets its name and place, nothing invented',()=>{
  const club=REGISTRY.find(c=>c.id==='maccabi-haifa')!
  const w=worldFor(club)
  expect(w.researched).toBe(false)
  expect(w.nicknames).toEqual([])
  expect(w.terraceTab).toBe('Terrace')
  expect(w.voice.welcome).toContain(club.name)
 })
 it('lists publishers for the credit line',()=>{
  expect(worldPublishers(clubWorld('olympiacos')!).length).toBeGreaterThan(3)
 })
})
