import {describe,expect,it,vi} from 'vitest'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
vi.mock('server-only',()=>({}))
const files=new Map<string,string>()
vi.mock('@/lib/master/durable',()=>({durable:()=>({kind:'supabase',read:async(n:string)=>files.has(n)?{text:files.get(n)!,etag:'x'}:null})}))
const {ticketOk,panelNeeds,TICKET_FILE}=await import('@/lib/stories/flowOperator')
const src=(p:string)=>readFileSync(p,'utf8')

describe('the Flow operator door (docs/fanlife/70)',()=>{
 const t='a'.repeat(20)+'-'+'b'.repeat(20),hash=createHash('sha256').update(t).digest('hex')
 it('opens only for the run\'s ticket, before it expires',async()=>{
  files.set(TICKET_FILE,JSON.stringify({hash,expires:new Date(Date.now()+3600_000).toISOString()}))
  expect(await ticketOk(t)).toBe(true)
  expect(await ticketOk(t.replace('a','c'))).toBe(false)
  expect(await ticketOk(undefined)).toBe(false)
  files.set(TICKET_FILE,JSON.stringify({hash,expires:new Date(Date.now()-1000).toISOString()}))
  expect(await ticketOk(t)).toBe(false)
  files.set(TICKET_FILE,JSON.stringify({hash,expires:new Date(Date.now()+30*86400_000).toISOString()}))
  expect(await ticketOk(t),'a ticket longer than three hours is refused').toBe(false)
 })
 it('asks Flow only for panels with no Drive picture and a prompt',()=>{
  const n=panelNeeds({files:{file04:{title:'X',panels:[{id:'f04-p01',drive_id:null,prompt:'a long enough panel prompt'},{id:'f04-p02',drive_id:'abc',prompt:'a long enough panel prompt'},{id:'f04-p03',drive_id:null}]}}})
  expect(n).toEqual([{file:'file04',title:'X',panels:[{id:'f04-p01',role:undefined,prompt:'a long enough panel prompt'}]}])
 })
 it('answers the Flow origin only, with no studio login and no cron secret',()=>{
  const r=src('app/api/master/stories/flow/route.ts')
  expect(r).toContain("ORIGINS=['https://flow.google.com','https://labs.google']")
  expect(r).toContain('ticketOk(b.ticket)')
  expect(r).not.toMatch(/cronAuthorized|adminFromRequest/)
 })
})
