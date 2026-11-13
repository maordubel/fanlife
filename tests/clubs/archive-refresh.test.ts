import {describe,it,expect} from 'vitest'
import {oneNightPerMatch} from '@/lib/clubs/one-night'
import {line,lsScorers,scorersAgree} from '@/scripts/ingest/clubs/league-lineups'

const m=(id:string,value:Record<string,unknown>,over:Record<string,unknown>={})=>({id,value,sources:[`s-${id}`],status:'approved',confidence:3,...over})
const eleven=Array.from({length:11},(_,i)=>`Man ${i}`)

describe('one night, one record (12.11.2026)',()=>{
 it('folds two records of one day with the same two numbers, keeping the curated id and borrowing the feed\'s eleven',()=>{
  const {pack,folded}=oneNightPerMatch({matches:[
   m('r26-m-arsenal',{name:'Olympiacos 3-1 Arsenal',on:'2011-12-06',score:'3-1',scorers:['A']}),
   m('a-m-2011-12-06-olympiacos-arsenal',{name:'Olympiacos 3-1 Arsenal',on:'2011-12-06',score:'3-1',lineup:eleven,bench:['B']}),
  ]})
  expect(folded).toEqual([{kept:'r26-m-arsenal',folded:['a-m-2011-12-06-olympiacos-arsenal'],on:'2011-12-06'}])
  const [only]=pack.matches as unknown as {id:string;value:{lineup:string[];scorers:string[]};sources:string[]}[]
  expect((pack.matches as unknown[]).length).toBe(1)
  expect(only!.value.lineup).toHaveLength(11)
  expect(only!.value.scorers).toEqual(['A'])
  expect(only!.sources.sort()).toEqual(['s-a-m-2011-12-06-olympiacos-arsenal','s-r26-m-arsenal'])
 })
 it('reads "0-2" and "2-0" as the same night (a final with the home side named differently)',()=>{
  const {pack}=oneNightPerMatch({matches:[m('x',{on:'2022-05-30',score:'0-2'}),m('y',{on:'2022-05-30',score:'2-0'})]})
  expect((pack.matches as unknown[]).length).toBe(1)
 })
 it('never merges two different scores, and never lets a review row lend its eleven',()=>{
  const two=oneNightPerMatch({matches:[m('a',{on:'1888-08-01',score:'1-1'}),m('b',{on:'1888-08-01',score:'5-1'})]})
  expect((two.pack.matches as unknown[]).length).toBe(2)
  const {pack}=oneNightPerMatch({matches:[m('kept',{on:'2020-01-01',score:'1-0'}),m('a-m-x',{on:'2020-01-01',score:'1-0',lineup:eleven},{status:'review'})]})
  const [only]=pack.matches as unknown as {id:string;value:{lineup?:string[]}}[]
  expect(only!.id).toBe('kept');expect(only!.value.lineup).toBeUndefined()
 })
})

describe('the league feed reads both sites the same way',()=>{
 it('folds both sites\' words for a line into GK/DF/MF/FW',()=>{
  expect(['Goalkeeper','Defender','Midfielder','Attacker','Forward','Right Back',''].map(line)).toEqual(['GK','DF','MF','FW','FW','DF',null])
 })
 it('takes LiveScore goals of one side — nested assists out, other side out',()=>{
  const incs={Incs:{'1':[{Min:26,Nm:1,Incs:[{Nm:1,IT:36,Fn:'Liam',Ln:'Scales'},{Nm:1,IT:63,Fn:'Camilo',Ln:'Duran'}]},{Min:30,Nm:2,IT:36,Fn:'Joe',Ln:'Hugill'}],'2':[{Min:80,Nm:1,IT:37,Fn:'Kasper',Ln:'Høgh'}]}}
  expect(lsScorers(incs,1)).toEqual(['liam scales','kasper hogh'])
  expect(lsScorers(incs,2)).toEqual(['joe hugill'])
 })
 it('agrees on scorers surname for surname, count for count',()=>{
  expect(scorersAgree(['Liam Scales','Kasper Høgh'],['liam scales','kasper hogh'])).toBe(true)
  expect(scorersAgree(['Liam Scales','Liam Scales'],['liam scales'])).toBe(false)
  expect(scorersAgree(['Liam Scales'],['kasper hogh'])).toBe(false)
 })
})
