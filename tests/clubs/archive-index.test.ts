import {describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {buildArchiveIndex,competitionKey,seasonOf} from '@/lib/clubs/archive-index'
import type {Entry} from '@/lib/clubs/entities'
import type {ClubData} from '@/lib/clubs/contract'

const moment=(id:string,title:string,on:string|null,hint='',match:Entry['match']=null):Entry=>({id,kind:'moment',title,on,year:on?Number(on.slice(0,4)):null,hint,confidence:2,sources:['s'],note:null,legacy:false,player:null,names:[],refs:[],match})
const player=(id:string,title:string):Entry=>({id,kind:'player',title,on:null,year:null,hint:'',confidence:2,sources:['s'],note:null,legacy:false,player:{positions:['MF'],from:2000,to:2004,aliases:[]},names:[],refs:[],match:null})

describe('archive index (17.11.2026)',()=>{
 it('files a day in its July–June football year; a year-only record in none',()=>{
  expect(seasonOf('2013-08-25')).toBe('2013/14');expect(seasonOf('2014-05-01')).toBe('2013/14');expect(seasonOf('1999-07-01')).toBe('1999/00');expect(seasonOf(null)).toBeNull()
 })
 it('reads a competition as its own name, without season, stage or table number',()=>{
  expect(competitionKey('Italian Serie A 2013/14')).toBe('Italian Serie A')
  expect(competitionKey('Scottish League (Division One (old) / 12)')).toBe('Scottish League (Division One (old))')
  expect(competitionKey('Scottish Cup (R3)')).toBe('Scottish Cup')
  expect(competitionKey('Coppa Italia - Semi Finals')).toBe('Coppa Italia')
  expect(competitionKey('Israel State Cup final')).toBe('Israel State Cup')
  expect(competitionKey('Greek Cup final at the Olympic Stadium')).toBe('Greek Cup')
  expect(competitionKey('UEFA Champions League group stage')).toBe('UEFA Champions League')
  expect(competitionKey('Super League Greece')).toBe('Greek Super League')
  expect(competitionKey('bundesliga')).toBe('Bundesliga')
  expect(competitionKey('')).toBeNull()
 })
 it('tallies each night once, by season, opponent and competition, and points at the entries',()=>{
  const club={identity:{id:'x',name:'Olympiacos',city:'Piraeus',country:'Greece',sport:'football'},matches:[],sources:[]} as unknown as ClubData
  const entries=[
   moment('a','Olympiacos 2–1 Panathinaikos','2024-10-06','Super League'),
   moment('b','Panathinaikos 0–0 Olympiacos','2025-02-02','Super League'),
   moment('c','Olympiacos 2–1 Panathinaikos · derby night','2024-10-06','Super League'),
   moment('d','A cup is lifted','2025-05-17','Greek Cup final'),
   player('p','Giorgos Karagounis'),
  ]
  const ix=buildArchiveIndex(club,entries)
  const pao=ix.opponents.find(o=>o.label==='Panathinaikos')!
  expect(pao.t).toEqual({p:2,w:1,d:1,l:0,gf:2,ga:1})
  expect(pao.ids.map(i=>entries[i]!.id)).toEqual(['b','a','c'])
  expect(ix.seasons.map(s=>s.label)).toEqual(['2024/25'])
  expect(ix.seasons[0]!.t).toEqual({p:2,w:1,d:1,l:0,gf:2,ga:1})
  expect(ix.competitions.find(c=>c.label==='Greek Super League')?.t?.p).toBe(2)
 })
})
