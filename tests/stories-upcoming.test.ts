import {describe,expect,it} from 'vitest'
import {anglesOf,opponentIn,upcomingIdeas} from '@/lib/stories/upcoming'
import type {Catalog,CatalogMatch} from '@/lib/stories/catalog'
import type {Fixture} from '@/lib/fixtures/types'

const now=new Date('2026-11-10T08:00:00Z')
const m=(date:string,score:string,outcome:CatalogMatch['outcome'],tags:string[]=[],score100=0):CatalogMatch=>({id:`m-${date}`,date,season:`${date.slice(0,4)}/${String((+date.slice(2,4)+1)%100).padStart(2,'0')}`,competition:'Super League',stage:null,home:'AEK Athens',away:'PAOK',score,outcome,opponent:'PAOK',side:'home',scorers:true,tags,...(score100?{evidence:{score:score100,level:'rich' as const,story:1,has:['line-up'],formats:['documentary' as const,'short' as const]}}:{})})
const rows=[m('2023-04-26','4–0','win',['big-score'],70),m('2024-01-10','0–1','loss'),m('2024-09-01','1–1','draw'),m('2025-02-02','0–2','loss'),m('2025-10-05','1–1','draw'),m('2019-05-11','1–0','win',['final'],40)]
const cat:Catalog={club_id:'aek-athens',seasons:{},matches:rows,opponents:[{name:'PAOK',played:6,won:2,drawn:2,lost:2,first:'2019-05-11',last:'2025-10-05',derby:false}]}
const fx=(over:Partial<Fixture>={}):Fixture=>({clubId:'aek-athens',kickoff:'2026-11-22T17:30:00Z',dateOnly:false,home:'AEK Athens',away:'PAOK FC',clubSide:'home',opponent:'PAOK FC',competition:'Super League',round:null,venue:null,status:'scheduled',providerEventId:'777',...over})
const names=new Map([['aek-athens','AEK Athens']])

describe('Studio ideas from the coming fixtures',()=>{
 it('finds the opponent by exact name only',()=>{
  expect(opponentIn(cat,'PAOK FC')?.name).toBe('PAOK')
  expect(opponentIn(cat,'PAOK Thessaloniki')).toBeNull()
 })
 it('every number on the card is counted from the record',()=>{
  const a=anglesOf('AEK Athens',cat.opponents[0]!,rows)
  expect(a[0]).toEqual({key:'drought',text:'AEK Athens have not beaten PAOK in their last 4 meetings — the last win was in 2023.'})
  expect(a.map(x=>x.key)).toEqual(['drought','final','biggest','record'])
  expect(a.find(x=>x.key==='biggest')!.text).toContain('4–0')
 })
 it('one idea per fixture in the next three weeks, with the richest night and a publish time two days before',()=>{
  const out=upcomingIdeas([fx(),fx({providerEventId:'8',kickoff:'2027-01-30T17:00:00Z'}),fx({providerEventId:'9',opponent:'Nobody United'})],new Map([['aek-athens',cat]]),names,now)
  expect(out).toHaveLength(1)
  expect(out[0]!.best?.id).toBe('m-2023-04-26')
  expect(out[0]!.topic).toMatch(/^Before AEK Athens v PAOK FC, 22 November 2026 \(Super League\)\. AEK Athens have not beaten/)
  expect(out[0]!.publishBy).toBe('2026-11-20T17:30:00.000Z')
 })
 it('a fixture tomorrow publishes no earlier than three hours from now',()=>{
  const out=upcomingIdeas([fx({kickoff:'2026-11-11T08:00:00Z'})],new Map([['aek-athens',cat]]),names,now)
  expect(out[0]!.publishBy).toBe('2026-11-10T11:00:00.000Z')
 })
})
