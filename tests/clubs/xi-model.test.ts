import {describe,expect,it} from 'vitest'
import {emptyXI,validateXI} from '@/lib/clubs/xi'
import {FORMATIONS} from '@/lib/game/formations'
import {TWELFTH,changeFormation,decadeSpread,filledCount,firstEmpty,isComplete,nextEmpty,occupant,place,rankForSlot,setCaptain,shareText,swapWhere,vacate,whereIs} from '@/lib/clubs/xi-model'
import type {ClubPlayer} from '@/lib/clubs/contract'

const P=(id:string,positions:ClubPlayer['positions'],from:number|null=1990,to:number|null=1999):ClubPlayer=>({id,name:`Man ${id}`,aliases:[],positions,fromYear:from,toYear:to} as ClubPlayer)
const players=[P('gk',['GK']),P('cb',['DF']),P('st',['FW']),P('mf',['MF']),P('x',[])]
const byId=new Map(players.map(p=>[p.id,p]))

describe('gate 1 pitch rules',()=>{
 it('a man stands in one place: placing him again swaps, never duplicates',()=>{
  let xi=place(emptyXI(),'GK','gk');xi=place(xi,'D1','cb');xi=place(xi,'D2','gk')
  expect(occupant(xi,'D2')).toBe('gk');expect(occupant(xi,'GK')).toBeNull();expect(occupant(xi,'D1')).toBe('cb')
  xi=place(xi,'D1','gk');expect(occupant(xi,'D1')).toBe('gk');expect(occupant(xi,'D2')).toBe('cb') // two men on the pitch swap
  expect(new Set(Object.values(xi.picks)).size).toBe(Object.values(xi.picks).length)
 })
 it('the captain follows his own man and is dropped with him',()=>{
  let xi=place(place(emptyXI(),'GK','gk'),'D1','cb');xi=setCaptain(xi,'cb');expect(xi.captain).toBe('cb')
  xi=swapWhere(xi,'D1','D2');expect(xi.captain).toBe('cb')
  expect(vacate(xi,'D2').captain).toBeNull()
  expect(place(xi,'D2','st').captain).toBeNull() // replaced on the pitch
  expect(setCaptain(xi,'st').captain).toBe('cb') // only a man on the pitch can captain
 })
 it('the 12th man is separate, never a duplicate and never captain',()=>{
  let xi=place(emptyXI(),'GK','gk');xi=setCaptain(xi,'gk');xi=place(xi,TWELFTH,'gk')
  expect(whereIs(xi,'gk')).toBe(TWELFTH);expect(xi.captain).toBeNull();expect(occupant(xi,'GK')).toBeNull();expect(filledCount(xi)).toBe(0)
 })
 it('changing formation keeps men whose slots survive and invents nobody',()=>{
  const xi=place(place(emptyXI(),'GK','gk'),'M1','mf'),next=changeFormation(xi,'4-3-3')
  expect(next.formation).toBe('4-3-3');expect(next.picks.GK).toBe('gk');expect(Object.values(next.picks)).toEqual(expect.arrayContaining(['gk']))
  for(const slot of Object.keys(next.picks))expect(FORMATIONS['4-3-3']!.slots.some(s=>s.slotId===slot)).toBe(true)
  expect(changeFormation(xi,'constructor')).toBe(xi)
 })
 it('advances to the next empty slot and knows when the eleven is full',()=>{
  let xi=emptyXI();expect(firstEmpty(xi)).toBe('GK');expect(nextEmpty(xi,'GK')).toBe('D1')
  const ids=FORMATIONS['4-4-2']!.slots.map(s=>s.slotId);ids.forEach((s,i)=>{xi=place(xi,s,`p${i}`)})
  expect(isComplete(xi)).toBe(true);expect(nextEmpty(xi,'GK')).toBeNull()
 })
 it('ranks documented fits first, unknown next, other last',()=>{
  expect(rankForSlot(players,'ST').map(p=>p.id)).toEqual(['st','x','gk','cb','mf'])
  expect(rankForSlot(players,null).map(p=>p.id)).toEqual(players.map(p=>p.id))
 })
 it('reports the era spread only from documented years',()=>{
  const xi=place(place(emptyXI(),'GK','gk'),'D1','cb'),spread=decadeSpread(xi,new Map([['gk',P('gk',['GK'],1992,1998)],['cb',P('cb',['DF'],null,null)]]))
  expect(spread).toEqual({1990:1})
 })
 it('old saves without a 12th man still validate; a 12th man must be a real, unused player',()=>{
  expect(validateXI({formation:'4-4-2',picks:{GK:'gk'}},players)).toEqual({formation:'4-4-2',picks:{GK:'gk'},captain:null})
  expect(validateXI({formation:'4-4-2',picks:{GK:'gk'},twelfth:'cb'},players).twelfth).toBe('cb')
  expect(validateXI({formation:'4-4-2',picks:{GK:'gk'},twelfth:'gk'},players).twelfth).toBeUndefined()
  expect(validateXI({formation:'4-4-2',picks:{},twelfth:'ghost'},players).twelfth).toBeUndefined()
 })
 it('the share text lists the eleven goal-to-attack with the armband and names no ranking',()=>{
  let xi=place(place(emptyXI(),'GK','gk'),'F1','st');xi=setCaptain(xi,'st')
  const text=shareText({club:'Club',title:'My XI',xi,byId,captainWord:'captain',twelfthWord:'12th'})
  expect(text.split('\n')[0]).toBe('My XI · Club · 4-4-2');expect(text).toContain('ST Man st (captain)');expect(text.indexOf('GK')).toBeLessThan(text.indexOf('ST Man'))
 })
})
