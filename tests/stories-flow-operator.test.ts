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

describe('the art library Flow draws (studio/cinema/flow_library.json)',()=>{
 it('accepts every piece of the spec and nothing else',async()=>{
  const {LIB_STEM,libPath}=await import('@/lib/stories/flowOperator')
  const spec=JSON.parse(src('scripts/football-stories/studio/cinema/flow_library.json')) as {pieces:{stem:string}[]}
  expect(spec.pieces.length).toBeGreaterThan(100)
  for(const p of spec.pieces)expect(LIB_STEM.test(p.stem),p.stem).toBe(true)
  for(const bad of ['../x-fl1-kr','ppl-capo-kr','cl-panel-fl1-kr','ppl-x-fl1-kr.png'])expect(LIB_STEM.test(bad)).toBe(false)
  expect(libPath('ppl-referee-fl1-kr')).toBe('library/flow/ppl-referee-fl1-kr.png')
 })
})

describe('the studio operator door (docs/fanlife/70 §Studio operator)',()=>{
 it('is the run ticket on the site\'s own origin, with no login, no cron secret and no delete',()=>{
  const r=src('app/api/master/stories/operator/route.ts')
  expect(r).toContain('sameOrigin(r)')
  expect(r).toContain('ticketOk(b.ticket)')
  expect(r).not.toMatch(/cronAuthorized|adminFromRequest|export async function (GET|DELETE)/)
  const o=src('lib/stories/operator.ts')
  expect(o).not.toMatch(/deleteJob|purgeJobMedia/)
  expect(o).toContain("ownerAct(j,a,OPERATOR)")
 })
 it('never lets the operator do what only the desk may (pictures, Flow slots)',async()=>{
  const {OPERATOR_ACTIONS}=await import('@/lib/stories/operator')
  for(const a of ['art_added','flow_added','flow_ready'])expect(OPERATOR_ACTIONS.has(a)).toBe(false)
  expect(OPERATOR_ACTIONS.has('upload_done')).toBe(true)
 })
})
