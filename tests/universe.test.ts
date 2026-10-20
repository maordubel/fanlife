import {describe,it,expect} from 'vitest'
import {offerFor,bestOffer,HOUR} from '@/lib/universe/policy'
import {PRODUCTS} from '@/lib/universe/registry'
import {validateFeaturePatch,featuresOf,DEFAULT_FEATURES} from '@/lib/features'
import type {Fixture} from '@/lib/fixtures/types'

const now=new Date('2026-10-20T12:00:00Z')
const fx=(h:number,o:Partial<Fixture>={}):Fixture=>({clubId:'aek-athens',kickoff:new Date(now.getTime()+h*HOUR).toISOString(),dateOnly:false,home:'A',away:'B',clubSide:'home',opponent:'B',competition:null,round:null,venue:null,status:'scheduled',providerEventId:'x'+h,...o})
describe('universe offer policy',()=>{
 it('DUBID before the round, OFFSIDES near kick-off',()=>{
  expect(offerFor(fx(24),now)?.product).toBe('dubid')
  expect(offerFor(fx(2),now)?.product).toBe('offsides')
  expect(offerFor(fx(-1),now)?.product).toBe('offsides')
 })
 it('nothing without a verified fixture',()=>{
  expect(offerFor(null,now)).toBeNull()
  expect(offerFor(fx(24,{dateOnly:true}),now)).toBeNull()
  expect(offerFor(fx(24,{status:'postponed'}),now)).toBeNull()
  expect(offerFor(fx(200),now)).toBeNull()
  expect(offerFor(fx(-5),now)).toBeNull()
 })
 it('a link carries the contract moment and the club, never a bare URL',()=>{
  const h=new URL(offerFor(fx(24),now)!.href)
  expect(h.origin).toBe('https://dubid.dubelteam.com');expect(h.searchParams.get('moment')).toBe('before_round');expect(h.searchParams.get('club')).toBe('aek-athens')
 })
 it('one offer only, the soonest',()=>{expect(bestOffer([fx(30),fx(5),fx(1)],now)?.offer.product).toBe('offsides')})
 it('a product can be held out',()=>{
  const p=PRODUCTS.find(x=>x.id==='dubid')!;const was=p.enabled;(p as {enabled:boolean}).enabled=false
  try{expect(offerFor(fx(24),now)).toBeNull()}finally{(p as {enabled:boolean}).enabled=was}
 })
 it('the switch is off by default and validates',()=>{
  expect(DEFAULT_FEATURES.universe).toBe(false);expect(featuresOf(null).universe).toBe(false)
  expect(validateFeaturePatch({universe:true}).ok).toBe(true);expect(validateFeaturePatch({universe:'yes'}).ok).toBe(false)
 })
})
