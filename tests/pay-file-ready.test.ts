import {beforeEach,describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
const calls=vi.hoisted(()=>[] as string[])
vi.mock('@/lib/shop/personal/render',async()=>({clipsNotMasks:(await vi.importActual<typeof import('@/lib/shop/personal/render')>('@/lib/shop/personal/render')).clipsNotMasks,printPng:async()=>{calls.push('draw');return Buffer.from('png')}}))
vi.mock('@/lib/shop/personal/sign',()=>({decode:()=>({c:'x',n:[]})}))
const state=vi.hoisted(()=>({order:null as Record<string,unknown>|null}))
vi.mock('@/lib/pay/orders',()=>({
 getOrder:async()=>state.order&&{...state.order},
 moveOrder:async(_id:string,from:string[],patch:Record<string,unknown>)=>{if(!from.includes(state.order!.status as string))return false;calls.push(`move:${String(patch.status??'same')}`);state.order={...state.order,...patch};return true},
}))
vi.mock('@/lib/pay/mail',()=>({mailOpen:()=>true,orderMail:()=>({subject:'s',html:'h',text:'t'}),sendMail:async()=>{calls.push('mail');return 'm1'}}))
import {makeFile} from '@/lib/pay/files'
import {clipsNotMasks} from '@/lib/shop/personal/render'

describe('the file is ready before anyone is told (17.11.2026)',()=>{
 beforeEach(()=>{calls.length=0
  state.order={id:'po_abcdefg',kind:'print-file',status:'paid',recipe:{s:'a',sig:'b'},amount_cents:499,currency:'eur',result:{owed:{to:'a@b.co',who:null,link:'https://x/order/po_abcdefg?t=k'}}}
  vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
   if(String(url).includes('/rest/v1/worker_pay_orders')&&init?.method==='PATCH'){calls.push('lease');state.order={...state.order,...JSON.parse(String(init.body))};return new Response('[{}]')}
   if(String(url).includes('/storage/v1/object/pay-files/')){calls.push('store');return new Response('{}')}
   return new Response('[]')}))
 })
 it('draws, stores, marks it ready, and only then sends the email',async()=>{
  expect((await makeFile('po_abcdefg')).state).toBe('ready')
  expect(calls).toEqual(['lease','draw','store','move:fulfilled','mail','move:same'])
 })
 it('does nothing for an order that is not paid',async()=>{
  state.order!.status='open';expect((await makeFile('po_abcdefg')).state).toBe('waiting');expect(calls).toEqual([])
 })
 it('leaves an order another maker holds',async()=>{
  state.order!.result={making:new Date().toISOString()};expect((await makeFile('po_abcdefg')).state).toBe('making');expect(calls).not.toContain('draw')
 })
})
describe('satori masks become clip paths',()=>{
 it('turns rectangle masks, nested ones and bordered ones into clips',()=>{
  const svg='<svg><mask id="a"><rect x="0" y="0" width="10" height="10" fill="#fff"/><path d="M0" fill="none" stroke="#000"/></mask><mask id="b"><rect x="1" y="1" width="5" height="5" fill="#fff" mask="url(#a)"/></mask><rect mask="url(#b)" clip-path="url(#z)" width="3"/><path mask="url(#a)"/></svg>'
  const out=clipsNotMasks(svg)
  expect(out).not.toContain('<mask');expect(out).not.toMatch(/ mask=/)
  expect(out).toContain('<clipPath id="b" clip-path="url(#a)">')
  expect((out.match(/clip-path=/g)??[]).length).toBeGreaterThanOrEqual(4)
 })
})
