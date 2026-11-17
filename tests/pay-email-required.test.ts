import {afterEach,describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
vi.mock('@/lib/shop/personal/sign',()=>({decode:()=>({ok:1})}))
const {createOrder}=vi.hoisted(()=>({createOrder:vi.fn()}))
vi.mock('@/lib/pay/orders',()=>({createOrder,moveOrder:vi.fn(),hashOf:()=>'h',newId:()=>'po_t',newToken:()=>'tok'}))
import {POST} from '@/app/api/pay/checkout/route'

const post=(b:object)=>POST(new Request('http://x/api/pay/checkout',{method:'POST',body:JSON.stringify(b)}))
describe('the file needs an email (17.11.2026)',()=>{
 vi.stubEnv('STRIPE_SECRET_KEY','sk_test');vi.stubEnv('STRIPE_WEBHOOK_SECRET','whsec');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','srv')
 afterEach(()=>createOrder.mockClear())
 it('opens no order without one',async()=>{
  for(const email of [undefined,'','no-at','a@b'])expect((await post({kind:'print-file',s:'a',sig:'b',email})).status).toBe(422)
  expect(createOrder).not.toHaveBeenCalled()
 })
})
