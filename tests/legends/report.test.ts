import {describe,expect,it} from 'vitest'
import {matchReport} from '@/lib/legends/report'
import type {Fixture,MatchEventRow} from '@/lib/legends/types'

const ev=(minute:number,kind:MatchEventRow['kind'],side:0|1|null,player?:string,extra:Partial<MatchEventRow>={}):MatchEventRow=>({seq:minute*10,minute,kind,side,...(player?{player}:{}),...extra})
const fx=(events:MatchEventRow[],goals:[number,number],pens:[number,number]|null=null):Fixture=>({id:'f1',round:1,home:'us',away:'them',result:{goals,pens,events,seed:1,sides:[{formation:'4-4-2',xi:[{id:'a',name:'Ann Home',pos:'FW',from:null,to:null}]},{formation:'4-4-2',xi:[{id:'z',name:'Zed Away',pos:'FW',from:null,to:null}]}]}})
const names=(side:0|1,id?:string)=>id==='sold'?'Sold Man':id==='a'?'Ann Home':id==='z'?'Zed Away':id??'—'
const team=(c:string)=>c==='us'?'Us FC':'Them FC'

describe('U02 · the match report',()=>{
 it('names every scorer and minute from the stored log, even a man no longer in the squad',()=>{
  const r=matchReport(fx([ev(0,'kickoff',null),ev(23,'goal',0,'sold',{other:'a'}),ev(88,'goal',1,'z')],[1,1]),'us',team,names)!
  expect(r.standouts.scorers).toEqual([{name:'Sold Man',goals:1,mine:true},{name:'Zed Away',goals:1,mine:false}])
  expect(r.standouts.assists[0]!.name).toBe('Ann Home')
  expect(r.timeline.map(t=>t.minute)).toEqual([23,88]);expect(r.timeline[0]!.text).toContain('Sold Man')
 })
 it('states order in time and never a cause',()=>{
  const r=matchReport(fx([ev(23,'goal',1,'z'),ev(60,'tactic',0,undefined,{detail:'Attacking'}),ev(74,'goal',0,'a')],[1,1]),'us',team,names)!
  const all=[...r.insights,...r.timeline.map(t=>t.text)].join(' ')
  expect(all).toMatch(/Them FC scored first, at 23′/);expect(all).toMatch(/A goal at 74′ levelled the score/);expect(all).not.toMatch(/because|thanks to|won it|decided by your/i)
  expect(r.insights.length).toBeLessThanOrEqual(3)
 })
 it('keeps extra time and penalties apart from the 90 minutes',()=>{
  const r=matchReport(fx([ev(30,'goal',0,'a'),ev(80,'goal',1,'z'),ev(90,'extra-time',null),ev(105,'goal',0,'a')],[2,1],null),'us',team,names)!
  expect(r.score).toMatchObject({regular:[1,1],final:[2,1],extraTime:true})
  expect(r.timeline.find(t=>t.minute===105)!.extra).toBe(true)
  const p=matchReport(fx([ev(10,'goal',0,'a'),ev(70,'goal',1,'z'),ev(90,'extra-time',null)],[1,1],[4,3]),'us',team,names)!
  expect(p.score.pens).toEqual([4,3]);expect(p.timeline.at(-1)!.kind).toBe('pens')
 })
 it('a red card, a clean sheet and the manager’s own changes are reported as facts',()=>{
  const r=matchReport(fx([ev(40,'red',1,'z'),ev(60,'sub',0,'a',{other:'sold'}),ev(70,'goal',0,'a')],[1,0]),'us',team,names)!
  expect(r.insights.join(' ')).toMatch(/Them FC played with ten from 40′/);expect(r.insights.join(' ')+r.standouts.sentOff.length).toMatch(/1$|clean sheet|change/)
  expect(r.timeline.some(t=>t.kind==='change'&&t.mine&&t.text.includes('Sold Man'))).toBe(true)
 })
 it('a match not yet played has no report',()=>{expect(matchReport({...fx([],[0,0]),result:null},'us',team,names)).toBeNull()})
})
