import {describe,expect,it} from 'vitest'
import {covers,isActive,saleFor,saleFromForm,salePrice,timeLeft,nextSale,TEASE_DAYS,type Sale} from '@/lib/shop/sales'

const now=Date.parse('2026-11-14T10:00:00Z')
const sale=(o:Partial<Sale>):Sale=>({id:'s-a1b2',label:'Sale',percent:20,scope:{type:'all'},starts:null,until:'2026-11-20T21:59:00Z',on:true,createdAt:'2026-11-14T00:00:00Z',...o})
const tee={subject:'olympiacos',kind:'tee' as const,art:{library:{id:'abcdefghijklmnop',name:'x'}}}

describe('shop sales',()=>{
 it('is active only between start and end, while on',()=>{
  expect(isActive(sale({}),now)).toBe(true)
  expect(isActive(sale({on:false}),now)).toBe(false)
  expect(isActive(sale({starts:'2026-11-15T00:00:00Z'}),now)).toBe(false)
  expect(isActive(sale({until:'2026-11-13T00:00:00Z'}),now)).toBe(false)
 })
 it('covers by club, category and design',()=>{
  expect(covers(sale({scope:{type:'club',value:'olympiacos'}}),tee)).toBe(true)
  expect(covers(sale({scope:{type:'club',value:'panathinaikos'}}),tee)).toBe(false)
  expect(covers(sale({scope:{type:'shelf',value:'wear'}}),tee)).toBe(true)
  expect(covers(sale({scope:{type:'shelf',value:'wall'}}),tee)).toBe(false)
  expect(covers(sale({scope:{type:'design',value:'l-ghijklmnop'}}),tee)).toBe(true)
 })
 it('takes the deepest sale that covers the product',()=>{
  const a=sale({id:'s-aaaa',percent:10}),b=sale({id:'s-bbbb',percent:25,scope:{type:'club',value:'olympiacos'}})
  expect(saleFor(tee,[a,b],now)?.id).toBe('s-bbbb')
  expect(saleFor(tee,[],now)).toBeNull()
 })
 it('cuts to .99 and never under cost + 10%',()=>{
  expect(salePrice(2999,1500,20)).toBe(2399)
  expect(salePrice(2999,2500,50)).toBe(2775)
  expect(salePrice(999,900,5)).toBe(999)
 })
 it('reads the desk form and refuses a bad sale',()=>{
  const ok=saleFromForm({label:'Derby week',percent:20,scope:'club',value:'olympiacos',until:'2026-11-20'},new Date(now))
  expect(ok?.percent).toBe(20);expect(ok?.scope).toEqual({type:'club',value:'olympiacos'});expect(ok?.until).toBe('2026-11-20T21:59:00.000Z')
  expect(saleFromForm({percent:90},new Date(now))).toBeNull()
  expect(saleFromForm({percent:20,scope:'club'},new Date(now))).toBeNull()
  expect(saleFromForm({percent:20,until:'2026-11-01'},new Date(now))).toBeNull()
 })
 it('counts down',()=>{
  expect(timeLeft('2026-11-16T13:00:00Z',now)).toEqual({days:2,hours:3})
  expect(timeLeft('2026-11-13T13:00:00Z',now)).toBeNull()
 })
 it('announces the next sale before it starts: the soonest one that is on, within the teaser window',()=>{
  const fri=sale({id:'s-fri1',label:'Black Friday',percent:30,starts:'2026-11-26T22:00:00Z',until:'2026-11-30T21:59:00Z'}),dec=sale({id:'s-dec1',starts:'2026-11-20T22:00:00Z',until:'2026-11-22T21:59:00Z'})
  expect(nextSale([fri,dec],now)?.id).toBe('s-dec1')
  expect(nextSale([fri],Date.parse('2026-11-23T05:00:00Z'))?.id).toBe('s-fri1')
  expect(nextSale([sale({})],now)).toBeNull()                                  // already running: not "coming"
  expect(nextSale([{...fri,on:false}],now)).toBeNull()                          // stopped by the owner
  expect(nextSale([fri],Date.parse(fri.starts!)-(TEASE_DAYS+1)*864e5)).toBeNull() // too far ahead to promise
  expect(nextSale([sale({starts:'2026-11-26T22:00:00Z',until:'2026-11-25T00:00:00Z'})],now)).toBeNull() // ends before it starts
  expect(nextSale(undefined,now)).toBeNull()
 })
})
