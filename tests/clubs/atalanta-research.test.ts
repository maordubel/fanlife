import {describe,expect,it} from 'vitest'
import {withDocumentedMatchDetails} from '@/lib/clubs/documented-match-details'
import {decodeArchive,encodeArchive,type Entry} from '@/lib/clubs/entities'
import {personIdFromNumber,playerNumber} from '@/lib/people/number'

describe('documented Atalanta match details',()=>{
 const lineup=Array.from({length:11},(_,i)=>`Player ${i+1}`)
 const base={sources:[{id:'checked',access:'available',checkedAt:'2026-11-21'}],matches:[
  {id:'one',sources:['base'],value:{on:'1987-01-12',score:'2-0',lineup}},
  {id:'two',sources:['base'],value:{on:'1988-01-12',score:'1-0'}},
 ]}
 it('preserves a documented eleven and adds checked detail to the exact match',()=>{
  const out=withDocumentedMatchDetails(base,{matchDetails:[
   {targetId:'one',on:'1987-01-12',score:'2-0',sources:['checked'],value:{lineup:lineup.map(x=>x+' alternate'),scorers:[{name:'Francis',minute:6}]}},
   {targetId:'two',on:'1988-01-12',score:'1-0',sources:['checked'],value:{lineup}},
  ]})
  expect(out.matches[0]).toMatchObject({sources:['base','checked'],value:{lineup,scorers:[{name:'Francis',minute:6}]}})
  expect(out.matches[1]?.value.lineup).toEqual(lineup)
 })
 it('rejects a mismatched score or source without evidence',()=>{
  const out=withDocumentedMatchDetails(base,{matchDetails:[
   {targetId:'one',on:'1987-01-12',score:'3-0',sources:['checked'],value:{venue:'San Siro'}},
   {targetId:'two',on:'1988-01-12',score:'1-0',sources:['missing'],value:{lineup}},
  ]})
  expect(out).toEqual(base)
 })
 it('sends only a report flag in the archive index and preserves older entries',()=>{
  const entry:Entry={id:'one',kind:'moment',title:'Atalanta 2-0 Juventus',on:'1987-01-12',year:1987,hint:'',confidence:2,sources:[],note:null,legacy:false,player:null,names:[],refs:[]}
  const match={matchId:'one',competition:'Serie A',score:'2-0',venue:null,started:[],scored:[],unnamed:0}
  const entries=[{...entry,match:{...match,report:true as const}},{...entry,id:'two',match}]
  expect(decodeArchive(encodeArchive(entries,[]))).toEqual(entries)
 })
})

describe('player profile numbers',()=>{
 it('round trips the full People Registry ID, including leading hex zeros',()=>{
  for(const id of ['pl_0012345678','pl_fffffffffe','pl_0000000000']) expect(personIdFromNumber(playerNumber(id)!)).toBe(id)
  expect(personIdFromNumber('1099511627776')).toBeNull()
  expect(personIdFromNumber('1e3')).toBeNull()
 })
})
