import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest'
import {readFileSync} from 'node:fs'

// Owner's reliability plan, 12.10.2026 §10: a daily backup of every worker_ row, encrypted before it is stored.
const tables:Record<string,unknown[]>={worker_fanlife_files:[{name:'control.json',body:'{}',etag:'"e"'}],worker_collector_item:Array.from({length:1500},(_,i)=>({id:i})),worker_x:[]}
function fake(url:string,init:RequestInit={}):Promise<Response>{
 const u=new URL(url),p=u.pathname.replace('/rest/v1','')
 if(p==='/'||p==='')return Promise.resolve(new Response(JSON.stringify({definitions:{...Object.fromEntries(Object.keys(tables).map(t=>[t,{}])),profiles:{},arenas:{}}})))
 const t=p.slice(1),rows=tables[t];if(!rows)return Promise.resolve(new Response('no',{status:404}))
 const [a=0,b=0]=String((init.headers as Record<string,string>).Range).split('-').map(Number)
 if(a>=rows.length&&a>0)return Promise.resolve(new Response('',{status:416}))
 return Promise.resolve(new Response(JSON.stringify(rows.slice(a,b+1))))
}
describe('the daily backup',()=>{
 const env={...process.env}
 beforeEach(()=>{process.env.NEXT_PUBLIC_SUPABASE_URL='https://x.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='k';vi.stubGlobal('fetch',vi.fn(fake))})
 afterEach(()=>{process.env={...env};vi.unstubAllGlobals()})
 it('reads only worker_ tables, pages past 1,000 rows, and ends with the counts',async()=>{
  const {backupLines,backupTables}=await import('@/lib/master/backup')
  expect(await backupTables()).toEqual(['worker_collector_item','worker_fanlife_files','worker_x']) // DUBID's profiles/arenas are never read
  const lines:string[]=[];for await(const l of backupLines())lines.push(l)
  expect(JSON.parse(lines[0]!).kind).toBe('fan-life-backup')
  expect(JSON.parse(lines.at(-1)!)).toEqual({kind:'end',counts:{worker_collector_item:1500,worker_fanlife_files:1,worker_x:0}})
  expect(lines.length).toBe(1+1500+1+1)
 })
 it('the workflow never stores a plaintext copy',()=>{
  const y=readFileSync('.github/workflows/backup.yml','utf8')
  expect(y).toMatch(/openssl enc -aes-256-cbc/)
  expect(y).toMatch(/rm -f backup\.jsonl/)
  expect(y).not.toMatch(/path:\s*backup\.jsonl/)
  expect(y).toMatch(/FAN_LIFE_BACKUP_PASSPHRASE/)
 })
 it('the endpoint answers only the scheduler or the owner',()=>{
  const r=readFileSync('app/api/master/backup/route.ts','utf8')
  expect(r).toMatch(/cronAuthorized\(r\)&&!adminFromRequest\(r\)/)
 })
})
