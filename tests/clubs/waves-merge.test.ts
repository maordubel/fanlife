import {describe,it,expect,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {mergeWave} from '@/lib/clubs/waves'
const p=(id:string,positions:string[],extra:object={})=>({id,value:{name:id,positions},status:'approved',approvedBy:'automated:x',...extra})
describe('wave merge',()=>{
 it('adds new records in every section and never overwrites an existing id',()=>{
  const out=mergeWave({sources:[{id:'a'}],archive:[{id:'e1',value:{name:'core'}}]},{sources:[{id:'a'},{id:'b'}],archive:[{id:'e1',value:{name:'wave'}},{id:'e2'}],goals:[{id:'g1'}]}) as Record<string,{id:string;value?:{name:string}}[]>
  expect(out.sources!.map(s=>s.id)).toEqual(['a','b']);expect(out.archive!.map(s=>s.id)).toEqual(['e1','e2']);expect(out.archive![0]!.value!.name).toBe('core');expect(out.goals!.map(g=>g.id)).toEqual(['g1'])
 })
 it('fills a player position only where the pack documents none, and never over a legacy or owner record',()=>{
  const out=mergeWave({players:[p('blank',[]),p('known',['GK']),p('legacy',[],{approvedBy:'legacy-curation'}),p('owner',[],{approvedBy:'owner:x'})]},{players:[p('blank',['MF']),p('known',['FW']),p('legacy',['DF']),p('owner',['DF']),p('new',['FW'])]}) as {players:{id:string;value:{positions:string[]}}[]}
  const pos=Object.fromEntries(out.players.map(x=>[x.id,x.value.positions]))
  expect(pos).toEqual({blank:['MF'],known:['GK'],legacy:[],owner:[],new:['FW']})
 })
})
