import {describe,expect,it} from 'vitest'
import {RULES,daysToComplete,median} from '@/lib/album/economy'
import {curateWing} from '@/lib/album/curate'
import type {Stint} from '@/lib/people/model'

describe('THE ALBUM economy (the plan: a daily fan completes a 36-sticker wing in about a month to six weeks)', () => {
 const runs=Array.from({length:400},(_,i)=>daysToComplete(i+1))
 it('a fan who opens every day completes the wing in 25–45 days (median)', () => {const m=median(runs);expect(m).toBeGreaterThanOrEqual(25);expect(m).toBeLessThanOrEqual(45)})
 it('nobody waits past a season: the slowest of 400 daily fans finishes within 70 days', () => {expect(Math.max(...runs)).toBeLessThanOrEqual(70)})
 it('without the completion desk (no picks, no trades, no pity) it would take far longer — the desk is what makes it fair', () => {
  const bare=median(Array.from({length:200},(_,i)=>daysToComplete(i+1,{...RULES,pityAfter:999,pickDays:99,tradeFor:999})))
  expect(bare).toBeGreaterThan(median(runs)+15)
 })
 it('a fan who plays three days a week still finishes (picks need five days, so trades and pity carry him)', () => {
  expect(median(Array.from({length:200},(_,i)=>daysToComplete(i+1,{...RULES,daysPerWeek:3})))).toBeLessThan(140)
 })
})

let n=0
const st=(club:string,from:number,to:number,rating:number,o:Partial<Stint>={}):Stint=>{n++;return {key:`${club}:r${n}`,club,eid:`r${n}`,id:`pl_${n.toString(16).padStart(10,'0')}`,name:`Invented Man ${n}`,aliases:[],pos:['MF'],from,to,apps:null,goals:null,rating,reputation:rating,stars:3,archiveOnly:false,...o}}
describe('THE ALBUM curation', () => {
 const men=Array.from({length:200},(_,i)=>st('north-fc',1920+Math.floor(i/2),1925+Math.floor(i/2),40+(i*37)%59))
 const wing=curateWing('north-fc',men,s=>s.id)
 it('36 stickers, six pages of six, slots 1–36 in order', () => {
  expect(wing).toHaveLength(36);expect(wing.map(s=>s.slot)).toEqual(Array.from({length:36},(_,i)=>i+1))
  for(let p=1;p<=6;p++)expect(wing.filter(s=>s.page===p)).toHaveLength(6)
 })
 it('the pages walk through history: each page is no earlier than the one before', () => {
  for(let p=2;p<=6;p++){const prev=Math.max(...wing.filter(s=>s.page===p-1).map(s=>(s.from!+s.to!)/2)),cur=Math.min(...wing.filter(s=>s.page===p).map(s=>(s.from!+s.to!)/2));expect(cur).toBeGreaterThanOrEqual(prev-1)}
 })
 it('one person is one sticker, an archive-only record is none, and no hidden rating is written', () => {
  const twin=[...men,st('north-fc',1990,1995,99,{id:men[0]!.id}),st('north-fc',1990,1995,99,{archiveOnly:true})]
  const w=curateWing('north-fc',twin,s=>s.id)
  expect(new Set(w.map(s=>s.person_id)).size).toBe(w.length)
  expect(w.some(s=>s.name===twin.at(-1)!.name)).toBe(false)
  expect(JSON.stringify(w)).not.toMatch(/rating|reputation/)
 })
})
