import {describe,expect,it} from 'vitest'
import {covers,isActive,saleFor,saleFromForm,salePrice,timeLeft,nextSale,TEASE_DAYS,saleOutcome,blackFriday,saleBeat,saleWords,type Sale} from '@/lib/shop/sales'

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
 it('says what a sale leaves before the owner starts it',()=>{
  expect(saleOutcome(45,15)).toEqual({cut:15,keep:19,floored:false})
  expect(saleOutcome(45,20)).toEqual({cut:20,keep:14,floored:false})
  expect(saleOutcome(45,30)).toEqual({cut:24,keep:9,floored:true})   // the floor: cost + 10%
  expect(saleOutcome(45,60).keep).toBe(9)
 })
 it('knows Black Friday: the day after the fourth Thursday of November',()=>{
  expect(blackFriday(2026)).toBe('2026-11-27')
  expect(blackFriday(2027)).toBe('2027-11-26')
  expect(blackFriday(2024)).toBe('2024-11-29')
 })
 it('is announced three times, each once: three days before, at the start, on the last day',()=>{
  const bf=sale({id:'s-fri1',label:'Black Friday',percent:20,starts:'2026-11-26T22:00:00Z',until:'2026-11-30T21:59:00Z'}),at=(iso:string)=>Date.parse(iso)
  expect(saleBeat(bf,at('2026-11-23T06:00:00Z'))).toBeNull()                       // four days away: too early
  expect(saleBeat(bf,at('2026-11-24T06:00:00Z'))).toBe('soon')
  expect(saleBeat({...bf,told:{soon:'x'}},at('2026-11-24T07:00:00Z'))).toBeNull()
  expect(saleBeat({...bf,told:{soon:'x'}},at('2026-11-27T05:00:00Z'))).toBe('on')
  expect(saleBeat({...bf,told:{soon:'x',on:'x'}},at('2026-11-28T05:00:00Z'))).toBeNull()
  expect(saleBeat({...bf,told:{soon:'x',on:'x'}},at('2026-11-30T05:00:00Z'))).toBe('last')
  expect(saleBeat({...bf,told:{soon:'x',on:'x',last:'x'}},at('2026-11-30T06:00:00Z'))).toBeNull()
  expect(saleBeat(bf,at('2026-12-01T00:00:00Z'))).toBeNull()                       // over
  expect(saleBeat({...bf,on:false},at('2026-11-27T05:00:00Z'))).toBeNull()         // stopped by the owner
  expect(saleBeat(sale({starts:'2026-11-14T00:00:00Z',until:'2026-11-14T21:59:00Z'}),at('2026-11-14T10:00:00Z'))).toBe('on') // a one-day sale has no "last day" post
 })
 it('promises only what the checkout charges: "up to" when the floor stops the cut',()=>{
  const bf=sale({label:'Black Friday',percent:30,starts:'2026-11-26T22:00:00Z',until:'2026-11-30T21:59:00Z'})
  expect(saleWords(bf,'soon',45).hook).toBe('Black Friday: up to −30% from Friday 27 November')
  expect(saleWords({...bf,percent:20},'on',45).hook).toBe('Black Friday is on: −20%')
  expect(saleWords({...bf,percent:20},'last',45).body).toContain('Prices go back tomorrow')
 })
})
