import {describe,expect,it} from 'vitest'
import {commentary,commentLine} from '@/lib/highlights/commentary'
import type {Moment,PixelKit,Reel,ReelPlayer} from '@/lib/highlights/types'

// invented sides and men (never real people): the commentary is told from the reel alone
const kit:PixelKit={shirt:'#111111',second:null,pattern:'plain',shorts:'#111111',socks:'#111111'}
const man=(id:string,name:string,pos:ReelPlayer['pos']):ReelPlayer=>({id,no:1,name,pos,kit})
const team=(name:string,code:string,men:ReelPlayer[])=>({name,code,kit,keeper:kit,lineup:men})
const moments:Moment[]=[
 {minute:9,side:0,kind:'save',player:'a9',keeper:'b1',score:[0,0]},
 {minute:20,side:0,kind:'goal',player:'a9',assist:'a8',score:[1,0]},
 {minute:31,side:1,kind:'yellow',player:'b4',score:[1,0]},
 {minute:44,side:1,kind:'goal',shape:'penalty',player:'b9',assist:'b9',score:[1,1]},
 {minute:70,side:0,kind:'miss',score:[1,1]},
 {minute:88,side:1,kind:'block',player:'b9',by:'a4',score:[1,1]},
]
const reel:Reel={id:'r',seed:7,teams:[team('Northfield','NOR',[man('a1','Abel Stone','GK'),man('a4','Carl Reed','DF'),man('a8','Dan Marsh','MF'),man('a9','Eli Frost','FW')]),team('Southbank','SOU',[man('b1','Finn Hale','GK'),man('b4','Gus Thorn','DF'),man('b9','Hal Wren','FW')])],moments,final:[1,1],pens:null,mine:0}

describe('the commentary line (19.11.2026)',()=>{
 it('Given a goal, When it is told, Then it names the scorer, the man who made it and the score after it',()=>{
  const l=commentLine(reel,moments[1]!)
  expect(l.tone).toBe('goal');expect(l.text).toMatch(/^GOAL! Eli Frost /);expect(l.text).toContain('Dan Marsh');expect(l.text).toMatch(/1–0$/);expect(l.mine).toBe(true)
 })
 it('Given a penalty, When it is told, Then nobody is credited with the pass',()=>{
  const l=commentLine(reel,moments[3]!)
  expect(l.text).toBe('GOAL! Hal Wren converts the penalty. 1–1');expect(l.mine).toBe(false)
 })
 it('Given a moment the record does not name a man in, When it is told, Then it speaks of his side and invents nobody (rule 111.2)',()=>{
  const l=commentLine(reel,moments[4]!)
  expect(l.text).toMatch(/^Northfield (fire wide|put it over the bar|drag it past the post)$/)
  for(const p of [...reel.teams[0].lineup,...reel.teams[1].lineup])expect(l.text).not.toContain(p.name)
 })
 it('Given a save and a block, When they are told, Then the keeper and the blocker come from the OTHER side',()=>{
  expect(commentLine(reel,moments[0]!).text).toContain('Finn Hale')
  expect(commentLine(reel,moments[5]!).text).toBe('Carl Reed blocks Hal Wren’s shot')
 })
 it('Given a booking, When it is told, Then no colour is named (rule 95: a banned colour is never printed)',()=>{
  const l=commentLine(reel,moments[2]!);expect(l.tone).toBe('card');expect(l.text).toBe('Gus Thorn is booked')
 })
 it('Given the same reel, When the line is told twice, Then the wording is the same',()=>{
  for(const m of moments)expect(commentLine(reel,m)).toEqual(commentLine(reel,m))
 })
 it('Given a spell from 45′ with one scene played, When the commentary is read, Then it holds the first half and that scene only — newest first, nothing ahead of the picture',()=>{
  const lines=commentary(reel,[moments[4]!],45)
  expect(lines.map(l=>l.minute)).toEqual([70,44,31,20,9])
  expect(commentary(reel,[],-1)).toEqual([])
  expect(commentary(reel,[],Infinity)).toHaveLength(moments.length)
 })
})
