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
