import {describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {createHmac} from 'node:crypto'
import {form} from '@/lib/pay/stripe'
import {BOOK_SKU,EDITIONS,REGIONS,tipCents} from '@/lib/book/catalog'
import {luluAddress,paperbackSession,tipSession} from '@/lib/book/checkout'
import {jobBody,luluSigned} from '@/lib/book/lulu'

describe('Broken Collective shop (17.11.2026)',()=>{
 it('reads a tip only inside its bounds',()=>{
  expect(tipCents('6')).toBe(600);expect(tipCents('2,5')).toBe(250)
  expect(tipCents('1')).toBeNull();expect(tipCents('9999')).toBeNull();expect(tipCents('abc')).toBeNull();expect(tipCents(null)).toBeNull()
 })
 it('marks every book checkout with metadata.book so the shared webhook can route it',()=>{
  const t=tipSession({order:'bk_abcdefgh',lang:'he',cents:600}),p=paperbackSession({order:'bk_abcdefgh',lang:'en',region:'il',ship:'standard'})
  expect(t.metadata.book).toBe('bk_abcdefgh');expect(p.metadata.book).toBe('bk_abcdefgh')
  expect(form(p).join('&')).toContain('shipping_address_collection%5Ballowed_countries%5D%5B0%5D=IL')
  expect(p.phone_number_collection.enabled).toBe(true)
  expect(p.shipping_options[0]!.shipping_rate_data.fixed_amount.amount).toBe(REGIONS.il.ship.standard!.cents)
 })
 it('turns a paid Stripe session into a Lulu address, from either place Stripe keeps it',()=>{
  const address={line1:'1 Ermou',line2:null,city:'Athens',state:null,postal_code:'10563',country:'GR'}
  const a=luluAddress({customer_details:{email:'r@x.io',name:'R',phone:'+30210'},collected_information:{shipping_details:{name:'Reader',address}}})
  expect(a).toMatchObject({name:'Reader',street1:'1 Ermou',city:'Athens',postcode:'10563',country_code:'GR',phone_number:'+30210'})
  expect(luluAddress({customer_details:{name:'R',phone:'+30'},shipping_details:{name:'R',address}})?.country_code).toBe('GR')
  expect(luluAddress({customer_details:{name:'R'},shipping_details:{name:'R',address}})).toBeNull()
 })
 it('asks Lulu for one copy of the right edition',()=>{
  const b=jobBody({order:'bk_abcdefgh',lang:'he',level:'MAIL',contact:'c@x.io',address:{name:'R',street1:'1 Ermou',city:'Athens',postcode:'1',country_code:'GR',phone_number:'+30'}})
  expect(b.line_items[0]!.printable_normalization.pod_package_id).toBe(BOOK_SKU)
  expect(b.line_items[0]!.printable_normalization.interior.source_url).toBe(EDITIONS.he.interior)
  expect(b.shipping_level).toBe('MAIL');expect(BOOK_SKU).toHaveLength(27)
 })
 it('takes a Lulu webhook only with the right signature',()=>{
  const raw='{"topic":"PRINT_JOB_STATUS_CHANGED"}',sig=createHmac('sha256','sec').update(raw).digest('hex')
  expect(luluSigned(raw,sig,'sec')).toBe(true);expect(luluSigned(raw+' ',sig,'sec')).toBe(false);expect(luluSigned(raw,null,'sec')).toBe(false)
 })
})

import {variantFor} from '@/lib/book/printify'
import {goodsSession,printifyAddress} from '@/lib/book/checkout'
vi.mock('@/lib/shop/store',()=>({printifyToken:async()=>null}))
describe('Broken Collective goods (17.11.2026)',()=>{
 it('finds the product variant by colour and size',()=>{
  const v=[{id:1,title:'Ivory / S'},{id:2,title:'Ivory / XXL'},{id:3,title:'Ivory / M',is_available:false},{id:4,title:'Khaki / One size'},{id:5,title:'Black / One size'}]
  expect(variantFor(v,'Ivory','S')).toBe(1);expect(variantFor(v,'Ivory','2XL')).toBe(2);expect(variantFor(v,'Ivory','M')).toBeNull()
  expect(variantFor(v,'black','One size')).toBe(5)
 })
 it('opens a goods checkout routed to the book and posts only inside the region',()=>{
  const s=goodsSession({order:'bk_abcdefgh',lang:'he',kind:'tee',colour:'Natural Raw',size:'M',region:'il'})
  expect(s.metadata).toMatchObject({book:'bk_abcdefgh',kind:'tee',size:'M'});expect(s.shipping_address_collection.allowed_countries).toEqual(['IL'])
 })
 it('splits the Stripe name for Printify',()=>{
  const a=printifyAddress({customer_details:{name:'Dana Levi Cohen',phone:'+972'},shipping_details:{name:'Dana Levi Cohen',address:{line1:'1 Herzl',city:'Tel Aviv',postal_code:'6100',country:'IL'}}})
  expect(a).toMatchObject({first_name:'Dana',last_name:'Levi Cohen',country:'IL',address1:'1 Herzl',zip:'6100',phone:'+972'})
 })
})
