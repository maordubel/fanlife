import {readFileSync,existsSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {SHARED_GATES} from '@/lib/clubs/gates'
import {DEFAULT_FEATURES,featuresOf,validateFeaturePatch} from '@/lib/features'
import {ARCHIVE_GATE,GATE_MODE,doorPicture,fits,gameCards,playFilter} from '@/lib/home/doors'

describe('the three doors (owner spec, 22.11.2026)',()=>{
 it('ships switched off, and the switch is a strict boolean',()=>{
  expect(DEFAULT_FEATURES.frontDoors).toBe(false)
  expect(featuresOf({features:{frontDoors:true}} as never).frontDoors).toBe(true)
  expect(featuresOf({features:{frontDoors:'yes'}} as never).frontDoors).toBe(false)
  expect(validateFeaturePatch({frontDoors:'on'} as never).ok).toBe(false)
  expect(validateFeaturePatch({frontDoors:true})).toEqual({ok:true,patch:{frontDoors:true}})
 })
 it('every gate has a way of playing, said in advance',()=>{
  for(const g of SHARED_GATES)expect(['solo','friends','both'],g.key).toContain(GATE_MODE[g.key])
 })
 it('a game says "friends" only when a friend can really be invited',()=>{
  const friends=gameCards({legends:true,friendlies:false,legendsName:'Legends Manager'},'friends').map(c=>c.key)
  expect(friends).toEqual(['blind-cow'])
  expect(gameCards({legends:true,friendlies:true,legendsName:'Legends Manager'},'friends').map(c=>c.key)).toEqual(['legends','blind-cow'])
  expect(gameCards({legends:false,friendlies:true,legendsName:'x'},'friends').map(c=>c.key)).toEqual(['blind-cow'])
 })
 it('the archive is a door of its own, never a game card',()=>{
  const all=gameCards({legends:true,friendlies:true,legendsName:'x'})
  expect(all.some(c=>c.key===ARCHIVE_GATE)).toBe(false)
  expect(all).toHaveLength(SHARED_GATES.length)
 })
 it('a filter keeps what plays that way; an unknown filter is "all"',()=>{
  expect(playFilter('solo')).toBe('solo');expect(playFilter('friends')).toBe('friends');expect(playFilter('x')).toBe('all');expect(playFilter(undefined)).toBe('all')
  expect(fits('both','solo')).toBe(true);expect(fits('both','friends')).toBe(true);expect(fits('solo','friends')).toBe(false);expect(fits('solo','all')).toBe(true)
 })
 it('every door picture is on disk in both widths',()=>{
  for(const k of ['cover','solo','friends','archive','kits','album','manager'] as const){
   const p=doorPicture(k)
   for(const part of p.srcSet.split(', '))expect(existsSync(`public${part.split(' ')[0]}`),part).toBe(true)
  }
 })
 it('the hub and OUR GAMES open the doors only behind the switch, and the copy exists in both catalogues',()=>{
  expect(readFileSync('app/page.tsx','utf8')).toMatch(/fd\.open&&<FrontDoors/)
  expect(readFileSync('app/our-games/page.tsx','utf8')).toMatch(/fd\.open&&<PlayIndex/)
  const en=JSON.parse(readFileSync('messages/clubs/en.json','utf8')),he=JSON.parse(readFileSync('messages/clubs/he.json','utf8'))
  for(const k of ['doorsK','doorsL1','doorsL2','doorsL3','doorsSub','doorSoloT','doorFriendsT','doorArchiveT','playK','playIdxTitle','modeSolo','modeFriends','modeBoth','playPick','playIdxNone']){expect(en[k],k).toBeTruthy();expect(he[k],k).toBeTruthy()}
 })
})
