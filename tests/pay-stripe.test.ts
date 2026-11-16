import {describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {createHmac} from 'node:crypto'
import {form,verify} from '@/lib/pay/stripe'
import {CATALOG,isPayKind} from '@/lib/pay/catalog'

describe('our own Stripe (16.11.2026)',()=>{
 it('writes Stripe form encoding with nested line items',()=>{
  const f=form({mode:'payment',line_items:[{quantity:1,price_data:{currency:'eur',unit_amount:499}}],metadata:{order:'po_x'}}).join('&')
  expect(f).toContain('line_items%5B0%5D%5Bprice_data%5D%5Bunit_amount%5D=499');expect(f).toContain('metadata%5Border%5D=po_x')
 })
 it('takes a webhook only with a fresh, right signature',()=>{
  const raw='{"type":"x"}',t=Math.floor(Date.now()/1000),sig=createHmac('sha256','whsec_t').update(`${t}.${raw}`).digest('hex')
  expect(verify(raw,`t=${t},v1=${sig}`,'whsec_t')).toBe(true)
  expect(verify(raw+' ',`t=${t},v1=${sig}`,'whsec_t')).toBe(false)
  expect(verify(raw,`t=${t-1000},v1=${createHmac('sha256','whsec_t').update(`${t-1000}.${raw}`).digest('hex')}`,'whsec_t')).toBe(false)
  expect(verify(raw,null,'whsec_t')).toBe(false)
 })
 it('sells only what it can deliver',()=>{
  expect(isPayKind('print-file')).toBe(true);expect(isPayKind('tee')).toBe(false)
  expect(CATALOG['print-file'].on).toBe(true);expect(CATALOG.film.on).toBe(false)
 })
})
