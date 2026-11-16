import {describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {writeFileSync} from 'node:fs'
import {orderMail} from '@/lib/pay/mail'

describe('the order email (16.11.2026)',()=>{
 it('carries the buyer link, the order and the kind words, escaped',()=>{
  const m=orderMail({kind:'print-file',id:'po_abc123',price:'€4.99',link:'https://fanlife.dubelteam.com/order/po_abc123?t=x<y',preview:'https://fanlife.dubelteam.com/api/shop/personal/art?s=a&sig=b',name:'Your print, as a file'})
  expect(m.subject).toBe('Your FAN LIFE print is ready')
  expect(m.html).toContain('?t=x&lt;y');expect(m.html).toContain('Order po_abc123 · €4.99');expect(m.html).toContain('Download your print')
  expect(m.text).toContain('https://fanlife.dubelteam.com/order/po_abc123?t=x<y')
  if(process.env.MAIL_PREVIEW)writeFileSync(process.env.MAIL_PREVIEW,m.html)
 })
 it('uses the same template for a film',()=>{expect(orderMail({kind:'film',id:'po_f',price:'€14.99',link:'https://x',name:'Your XI, the film'}).html).toContain('Watch and download')})
})
