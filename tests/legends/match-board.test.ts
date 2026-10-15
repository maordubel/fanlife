import {describe,expect,it} from 'vitest'
import {boardStats} from '@/components/legends/MatchBoard'
import type {Reel} from '@/lib/highlights/types'

describe('the match board counts only what the reel holds',()=>{
 it('shots, targets and cards per side',()=>{
  const kit={shirt:'#000',second:null,pattern:'plain' as const,shorts:'#000',socks:'#000'},team={name:'A',code:'A',kit,keeper:kit,lineup:[]}
  const m=(side:0|1,kind:'goal'|'save'|'miss'|'yellow')=>({minute:10,side,kind,score:[0,0] as [number,number]})
  const reel={id:'r',seed:1,teams:[team,team],moments:[m(0,'goal'),m(0,'save'),m(1,'miss'),m(1,'yellow')],final:[1,0],pens:null,mine:0} as unknown as Reel
  const s=Object.fromEntries(boardStats(reel).map(r=>[r.label,[r.a,r.b]]))
  expect(s['Goals']).toEqual([1,0]);expect(s['Shots']).toEqual([2,1]);expect(s['On target']).toEqual([2,0]);expect(s['Yellow cards']).toEqual([0,1])
 })
})

import {revealUpTo,tacticsMinute} from '@/components/legends/Live'
describe('F01/F03 — the board and the Tactics button follow the minute on screen',()=>{
 const kit={shirt:'#000',second:null,pattern:'plain' as const,shorts:'#000',socks:'#000'},team={name:'A',code:'A',kit,keeper:kit,lineup:[]}
 const goalAt=(minute:number,side:0|1)=>({minute,side,kind:'goal' as const,score:[0,0] as [number,number]})
 const reel={id:'r',seed:1,teams:[team,team],moments:[goalAt(10,0),goalAt(40,1)],final:[1,1],pens:null,mine:0} as unknown as Reel
 it('a goal from minute 40 is not counted while the picture is at 11',()=>{
  const up=revealUpTo('watch',{from:0,to:45},11)
  expect(boardStats(reel,up).find(r=>r.label==='Goals')).toMatchObject({a:1,b:0})
  expect(boardStats(reel,revealUpTo('break',{from:0,to:45},10)).find(r=>r.label==='Goals')).toMatchObject({a:1,b:1})
 })
 it('the moment on the screen itself is not counted until the picture has moved past it',()=>{expect(revealUpTo('watch',{from:0,to:45},10)).toBe(9)})
 it('a moment from an earlier spell stays counted',()=>{expect(revealUpTo('watch',{from:45,to:70},46)).toBe(45)})
 it('Tactics is asked for the minute shown, inside the spell',()=>{
  const L={minute:45,prevStop:0}
  expect(tacticsMinute(L,20)).toBe(20);expect(tacticsMinute(L,0)).toBe(1);expect(tacticsMinute(L,99)).toBe(44)
 })
})
