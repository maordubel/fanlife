import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {POLICY,countryName,countryOf,inEurope,pickProvider,shipToEurope,shouldMove} from '@/lib/shop/europe'
import {KIND_SPECS} from '@/lib/shop/kinds'
import {blueprintCandidates} from '@/lib/shop/plan'
import {toPublic,type ShopProduct} from '@/lib/shop/types'

const P=(id:number,title:string,country?:string)=>({id,title,...(country?{location:{country}}:{})})
describe('Europe first (owner plan, 22.11.2026)',()=>{
 it('reads a printer\'s country in any form Printify writes it',()=>{
  expect(countryOf(P(1,'a','DE'))).toBe('DE');expect(countryOf(P(1,'a','Germany'))).toBe('DE');expect(countryOf(P(1,'a','uk'))).toBe('GB')
  expect(countryOf(P(1,'a','Czech Republic'))).toBe('CZ');expect(countryOf(P(1,'a'))).toBeNull()
  expect(countryOf(P(7,'a'),new Map([[7,'LV']]))).toBe('LV')
  expect(inEurope('LV')).toBe(true);expect(inEurope('GB')).toBe(false);expect(inEurope('US')).toBe(false);expect(inEurope(null)).toBe(false)
  expect(countryName('LV')).toBe('Latvia');expect(countryName('US')).toBe('United States')
 })
 it('a printer inside the EU wins over a better-ranked one abroad; quality orders the EU ones',()=>{
  const list=[P(1,'Printify Choice','US'),P(2,'Monster Digital','US'),P(3,'OPT OnDemand','CZ'),P(4,'Print Clever','DE'),P(5,'Somebody','PL')]
  expect(pickProvider(list)!.id).toBe(4)
  expect(pickProvider(list,undefined,false)!.id).toBe(1)
  expect(pickProvider([P(1,'Printify Choice','US'),P(9,'T shirt and Sons','GB')])!.id).toBe(1)
  expect(pickProvider([P(9,'Nobody')])!.id).toBe(9);expect(pickProvider([])).toBeNull()
 })
 it('with no address at all the old quality order stands (nothing breaks if Printify stops sending locations)',()=>{
  expect(pickProvider([P(1,'Print Clever'),P(2,'Printify Choice')])!.id).toBe(2)
 })
 it('a kind offers its blanks best first, so the first one made in Europe can be taken',()=>{
  const list=['Unisex Heavy Cotton Tee','Kids Heavy Cotton™ Tee','Unisex Garment-Dyed T-shirt','Unisex Jersey Short Sleeve Tee','Unisex Softstyle T-Shirt'].map((title,i)=>({id:i+1,title,brand:'',model:'',images:[]}))
  expect(blueprintCandidates(KIND_SPECS.tee,list).map(b=>b.title)).toEqual(['Unisex Garment-Dyed T-shirt','Unisex Jersey Short Sleeve Tee','Unisex Heavy Cotton Tee','Unisex Softstyle T-Shirt'])
 })
 it('the parcel price to Europe is the dearest EU profile, never less than is charged',()=>{
  const profiles=[{first_item:{cost:475,currency:'USD'},additional_items:{cost:240,currency:'USD'},countries:['US']},
   {first_item:{cost:599,currency:'USD'},additional_items:{cost:200,currency:'USD'},countries:['DE','AT']},
   {first_item:{cost:719,currency:'USD'},additional_items:{cost:250,currency:'USD'},countries:['GR','CY']},
   {first_item:{cost:1500,currency:'USD'},additional_items:{cost:900,currency:'USD'},countries:['REST_OF_THE_WORLD']}]
  expect(shipToEurope(profiles)).toEqual({first:719,next:250,currency:'USD'})
  expect(shipToEurope([profiles[0]!,profiles[3]!])).toEqual({first:1500,next:900,currency:'USD'})
  expect(shipToEurope([profiles[0]!])).toBeNull();expect(shipToEurope(null)).toBeNull()
 })
 it('a product moves only to a European match made under today\'s rule',()=>{
  const here={blueprintId:6,providerId:99},eu={blueprintId:12,providerId:30,europe:true,policy:POLICY}
  expect(shouldMove(here,eu)).toBe(true)
  expect(shouldMove({blueprintId:12,providerId:30},eu)).toBe(false)
  expect(shouldMove(here,{...eu,europe:false})).toBe(false)
  expect(shouldMove(here,{...eu,policy:undefined})).toBe(false)
  expect(shouldMove(here,undefined)).toBe(false)
 })
 it('the public product says where it is printed and what the parcel costs, only when known',()=>{
  const base={id:'x',subject:'fanlife',kind:'tee',title:'A · T-shirt',description:'d',art:{library:{id:'1',name:'a'}},visible:true,status:'live',createdAt:'2026-11-01T00:00:00Z',updatedAt:'2026-11-01T00:00:00Z',
   printify:{productId:'p',blueprintId:1,providerId:2,images:['i'],priceFrom:1999,currency:'USD',url:'u',publishedAt:null}} as unknown as ShopProduct
  expect(toPublic(base)).not.toHaveProperty('madeIn')
  const pub=toPublic({...base,printify:{...base.printify!,madeIn:'DE',europe:true,ship:{first:599,next:200,currency:'USD'}}})
  expect(pub).toMatchObject({madeIn:'DE',europe:true,shipFrom:599})
 })
 it('a press never takes the old listing down before the new one exists, and the check-up moves two a run',()=>{
  const build=readFileSync('lib/shop/build.ts','utf8')
  expect(build.indexOf('const made=await api.create(')).toBeGreaterThan(0)
  expect(build.indexOf('await api.remove(shop,p.printify.productId)')).toBeGreaterThan(build.indexOf('const made=await api.create('))
  expect(readFileSync('lib/shop/checkup.ts','utf8')).toMatch(/europeMoves\(by,2\)/)
 })
})
