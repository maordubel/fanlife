import {describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {enoughPublishers,officialOf} from '@/lib/clubs/official'
import {compilePlayers} from '@/lib/clubs/players'
import type {Diagnostic,Source} from '@/lib/clubs/contract'
const src=(id:string,publisher:string,official?:'league'|'federation'):Source=>({id,title:id,url:'https://x.example/'+id,publisher,access:'available',checkedAt:'2026-11-13',...(official?{official}:{})})
const man=(sources:string[])=>({id:'p1',value:{name:'Test Man',sport:'football',positions:['MF'],fromYear:2020,toYear:null,sensitive:false},sources,confidence:3,status:'approved',researchedAt:'2026-11-13',approvedAt:'2026-11-13',approvedBy:'automated:test',parserCertainty:'high',conflictFree:true})
describe('owner decision 13.11.2026: the competition’s own league or federation is enough on its own',()=>{
 it('reads the mark and nothing else',()=>{expect(officialOf('league')).toBe('league');expect(officialOf('federation')).toBe('federation');expect(officialOf('club')).toBeUndefined();expect(officialOf(true)).toBeUndefined()})
 it('one official publisher is enough; one ordinary publisher is not; two ordinary are',()=>{
  expect(enoughPublishers([src('a','LNFP','league')])).toBe(true)
  expect(enoughPublishers([src('a','365Scores')])).toBe(false)
  expect(enoughPublishers([src('a','365Scores'),src('b','LiveScore')])).toBe(true)
 })
 it('the compiler approves a single official-source player and still refuses a single ordinary one',()=>{
  const d:Diagnostic[]=[]
  expect(compilePlayers([man(['off'])],'c',[src('off','LNFP','league')],d)?.length).toBe(1)
  expect(compilePlayers([man(['one'])],'c',[src('one','365Scores')],d)?.length).toBe(0)
 })
 it('every other automated condition still holds',()=>{
  const d:Diagnostic[]=[],r={...man(['off']),conflictFree:false}
  expect(compilePlayers([r],'c',[src('off','LNFP','league')],d)?.length).toBe(0)
 })
})
