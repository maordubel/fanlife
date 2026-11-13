import {describe,it,expect} from 'vitest'
import {ledgerOf,type Meeting} from '@/lib/fixtures/meetings'

const m=(on:string,home:string,away:string,hg:number,ag:number,us:'home'|'away',opponent:string,competition='League'):Meeting&{opponent:string}=>({on,year:Number(on.slice(0,4)),home,away,homeGoals:hg,awayGoals:ag,competition,from:['x'],us,opponent})
describe('the head-to-head ledger (12.11.2026)',()=>{
 it('counts every meeting from our side, groups spellings by core name, and keeps first, last, extremes and form',()=>{
  const [l]=ledgerOf([
   m('2020-01-01','Us','Rivals FC',3,0,'home','Rivals FC'),
   m('2021-01-01','Rivals','Us',2,0,'away','Rivals'),
   m('2022-01-01','Us','Rivals FC',1,1,'home','Rivals FC','Cup'),
  ])
  expect(l).toMatchObject({played:3,won:1,drawn:1,lost:1,for:4,against:3,lastFive:['D','L','W']})
  expect(l!.first!.on).toBe('2020-01-01');expect(l!.last!.on).toBe('2022-01-01')
  expect(l!.biggestWin!.on).toBe('2020-01-01');expect(l!.heaviestDefeat!.on).toBe('2021-01-01')
  expect(l!.byCompetition.Cup).toMatchObject({played:1,drawn:1})
 })
})
