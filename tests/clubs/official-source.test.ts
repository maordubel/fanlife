import {describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {crossChecked,enoughPublishers,officialOf} from '@/lib/clubs/official'
import {compilePlayers} from '@/lib/clubs/players'
import type {Diagnostic,Source} from '@/lib/clubs/contract'
const src=(id:string,publisher:string,official?:'league'|'federation'):Source=>({id,title:id,url:'https://x.example/'+id,publisher,access:'available',checkedAt:'2026-11-13',...(official?{official}:{})})
const man=(sources:string[])=>({id:'p1',value:{name:'Test Man',sport:'football',positions:['MF'],fromYear:2020,toYear:null,sensitive:false},sources,confidence:3,status:'approved',researchedAt:'2026-11-13',approvedAt:'2026-11-13',approvedBy:'automated:test',parserCertainty:'high',conflictFree:true})
describe('owner decision 13.11.2026: the competition’s own league or federation is enough on its own',()=>{
 it('reads the mark and nothing else',()=>{expect(officialOf('league')).toBe('league');expect(officialOf('federation')).toBe('federation');expect(officialOf('club')).toBe('club');expect(officialOf('competition')).toBe('competition');expect(officialOf('broadcaster')).toBeUndefined();expect(officialOf(true)).toBeUndefined()})
 it('cross-checked: one official publisher, or two ordinary ones',()=>{
  expect(crossChecked([src('a','LNFP','league')])).toBe(true)
  expect(crossChecked([src('a','365Scores')])).toBe(false)
  expect(crossChecked([src('a','365Scores'),src('b','LiveScore')])).toBe(true)
 })
 it('owner decision 17.11.2026: any single cited source is enough; none is not',()=>{
  expect(enoughPublishers([src('a','365Scores')])).toBe(true)
  expect(enoughPublishers([undefined])).toBe(false)
  expect(enoughPublishers([])).toBe(false)
 })
 it('the compiler approves a single-source player, official or not',()=>{
  const d:Diagnostic[]=[]
  expect(compilePlayers([man(['off'])],'c',[src('off','LNFP','league')],d)?.length).toBe(1)
  expect(compilePlayers([man(['one'])],'c',[src('one','365Scores')],d)?.length).toBe(1)
 })
 it('every other automated condition still holds',()=>{
  const d:Diagnostic[]=[],r={...man(['off']),conflictFree:false}
  expect(compilePlayers([r],'c',[src('off','LNFP','league')],d)?.length).toBe(0)
 })
})
