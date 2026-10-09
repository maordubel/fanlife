import {describe,expect,it} from 'vitest'
import {belovedOf} from '@/lib/clubs/beloved'
import {momentFor} from '@/lib/clubs/today'
const tl=(id:string,on:string)=>({id,status:'approved',confidence:2,value:{id,title:id,on}}) as never
describe('beloved gate',()=>{
 it('reads the number from the sourced terrace line',()=>{
  expect(belovedOf({name:'Gate 7',local:'Θύρα 7'},['kit-builder'])).toMatchObject({number:7,feature:'kit-builder'})
  expect(belovedOf({name:'Gate 13'},['kits'])).toMatchObject({number:13,feature:'kits'})
  expect(belovedOf({name:'The Blue'},['kit-builder'])?.number).toBeNull()
 })
 it('has no big plate when the shirt games are closed',()=>{expect(belovedOf({name:'Gate 5'},['trivia'])).toBeNull()})
})
describe('today at the club',()=>{
 const now=new Date(Date.UTC(2026,9,8))
 it('prefers the exact day and counts years',()=>{
  const m=momentFor({timeline:[tl('a','1990-10-08'),tl('b','2001-10-10')]} as never,now)
  expect(m).toMatchObject({id:'a',yearsAgo:36,offset:0})
 })
 it('falls back to the nearest moment within two weeks, with its real date',()=>{
  const m=momentFor({timeline:[tl('b','2001-10-14'),tl('c','1950-03-01')]} as never,now)
  expect(m).toMatchObject({id:'b',offset:6,on:'2001-10-14'})
 })
 it('shows nothing rather than inventing',()=>{expect(momentFor({timeline:[tl('c','1950-03-01')]} as never,now)).toBeNull()})
 it('crosses New Year',()=>{expect(momentFor({timeline:[tl('n','1999-01-02')]} as never,new Date(Date.UTC(2026,11,28)))?.offset).toBe(5)})
})
import {wallNumbers} from '@/lib/clubs/beloved'
describe('wall numbers',()=>{
 const all=['kit-builder','kits','archive','trivia','polls','timeline'] as never[]
 it('Hapoel: the shirt collection already is gate 5',()=>{const b=belovedOf({name:'Gate 5'},all);expect(b?.feature).toBe('kits');const n=wallNumbers(b);expect(n.kits).toBe(5);expect(n['kit-builder']).toBe(4)})
 it('Olympiacos: the shirt designer becomes 7 and the vote takes 4 — no number twice',()=>{
  const n=wallNumbers(belovedOf({name:'Gate 7'},all));expect(n['kit-builder']).toBe(7);expect(n.polls).toBe(4)
  expect(new Set(Object.values(n)).size).toBe(13);expect(Math.min(...Object.values(n))).toBe(1);expect(Math.max(...Object.values(n))).toBe(13)
 })
 it('Panathinaikos: 13',()=>{const n=wallNumbers(belovedOf({name:'Gate 13'},all));expect(n['kit-builder']).toBe(13);expect(n.timeline).toBe(4)})
 it('no terrace number: the wall is untouched',()=>{expect(wallNumbers(belovedOf({name:'The Blue'},all))['kit-builder']).toBe(4)})
})
