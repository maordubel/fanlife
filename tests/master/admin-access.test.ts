import {afterAll,afterEach,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest'
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises'
import {readFileSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {NextRequest} from 'next/server'
/**
 * Audit F01 (7.10.2026): the control room was protected by nothing but evaluation mode, which is ON for
 * every fan. These tests hold the owner key: one policy, one helper, every admin page and API action.
 */
const jar=new Map<string,string>()
vi.mock('next/headers',()=>({headers:()=>new Headers(),cookies:()=>({get:(k:string)=>jar.has(k)?{name:k,value:jar.get(k)}:undefined,set:(k:string,v:string)=>{v?jar.set(k,v):jar.delete(k)}})}))
class Redirect extends Error{constructor(public to:string){super(`redirect ${to}`)}}
vi.mock('next/navigation',()=>({redirect:(to:string)=>{throw new Redirect(to)},notFound:()=>{throw new Error('notFound')}}))
import {ADMIN_COOKIE,ADMIN_SESSION_DAYS,adminPolicy,cookieOptions,cookieValue,issueToken,keyMatches,loginPath,safeNext,sessionFrom,verifyToken} from '@/lib/master/admin-token'
import {adminFromRequest,adminOrCron,requireAdmin} from '@/lib/master/admin'
import {login,logout} from '@/app/master/login/actions'

const KEY='correct-horse-battery-staple-2026'
const NOW=1_790_000_000
const prod={FAN_LIFE_ADMIN_KEY:KEY,NODE_ENV:'production'}
const ROOT=path.resolve(__dirname,'..','..')
const src=(p:string)=>readFileSync(path.join(ROOT,p),'utf8')

describe('policy: keyed, open in local development, closed in production without a key',()=>{
 it('decides from the key and NODE_ENV only — evaluation mode is not an input',()=>{
  expect(adminPolicy(prod)).toBe('keyed')
  expect(adminPolicy({NODE_ENV:'production'})).toBe('closed')
  expect(adminPolicy({NODE_ENV:'production',FAN_LIFE_ADMIN_KEY:'short'})).toBe('closed')
  expect(adminPolicy({NODE_ENV:'development'})).toBe('open-dev')
  expect(adminPolicy({NODE_ENV:'test'})).toBe('open-dev')
  expect(adminPolicy({NODE_ENV:'development',FAN_LIFE_ADMIN_KEY:KEY})).toBe('keyed')
  expect(src('lib/master/admin-token.ts')).not.toMatch(/evaluationMode|FAN_LIFE_EVALUATION/)
 })
 it('production without a key lets nobody in, not even with a token signed by an old key',()=>{
  expect(sessionFrom({NODE_ENV:'production'},issueToken(KEY,NOW),NOW)).toBeNull()
 })
 it('local development with no key stays open, as before',()=>{
  expect(sessionFrom({NODE_ENV:'development'},undefined)).toEqual({actor:'local-developer',role:'dev-open'})
 })
})

describe('the session token',()=>{
 it('verifies its own signature, expiry and issue time',()=>{
  const t=issueToken(KEY,NOW)
  expect(t).toMatch(/^v1\.\d+\.\d+\.[A-Za-z0-9_-]{43}$/)
  expect(verifyToken(t,KEY,NOW)).toBe(true)
  expect(verifyToken(t,KEY,NOW+ADMIN_SESSION_DAYS*86400-1)).toBe(true)
  expect(verifyToken(t,KEY,NOW+ADMIN_SESSION_DAYS*86400)).toBe(false)
  expect(verifyToken(t,KEY,NOW-3600)).toBe(false) // issued in the future
  expect(verifyToken(t,`${KEY}-rotated`,NOW)).toBe(false) // a new key signs everyone out
 })
 it('rejects tampering, a longer lifetime and junk',()=>{
  const [v,iat,exp,sig]=issueToken(KEY,NOW).split('.')
  expect(verifyToken(`${v}.${iat}.${Number(exp)+86400}.${sig}`,KEY,NOW)).toBe(false)
  expect(verifyToken(`${v}.${Number(iat)-1}.${exp}.${sig}`,KEY,NOW)).toBe(false)
  const forged=issueToken('another-key-that-is-long-enough',NOW)
  expect(verifyToken(forged,KEY,NOW)).toBe(false)
  for(const junk of [undefined,'',KEY,'v1.1.2.x','a'.repeat(500),{}])expect(verifyToken(junk,KEY,NOW)).toBe(false)
 })
 it('compares the typed key in constant time and exactly',()=>{
  expect(keyMatches(KEY,KEY)).toBe(true)
  expect(keyMatches(`${KEY} `,KEY)).toBe(true) // 7.10.2026: a trailing space from a phone keyboard is not a different key (owner locked out)
  expect(keyMatches(KEY.slice(0,-1),KEY)).toBe(false)
  expect(keyMatches(null,KEY)).toBe(false)
  expect(keyMatches('',KEY)).toBe(false)
  expect(src('lib/master/admin-token.ts')).toContain('timingSafeEqual(')
 })
 it('sets an httpOnly, SameSite=Lax cookie that is Secure in production and lasts 30 days',()=>{
  expect(cookieOptions(prod)).toEqual({httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:30*86400})
  expect(cookieOptions({NODE_ENV:'development'}).secure).toBe(false)
 })
 it('reads the cookie from a raw header',()=>{
  expect(cookieValue(`a=1; ${ADMIN_COOKIE}=v1.2.3.x; b=2`)).toBe('v1.2.3.x')
  expect(cookieValue('fan-life-admin-x=1')).toBeUndefined()
  expect(cookieValue(null)).toBeUndefined()
 })
 it('only sends ?next= back to this site',()=>{
  expect(safeNext('/master/core?club=x')).toBe('/master/core?club=x')
  for(const bad of ['//evil.example','https://evil.example','/\\evil','evil',undefined,'/a\r\nSet-Cookie: x'])expect(safeNext(bad)).toBe('/master/admin')
  expect(loginPath('/kits/admin')).toBe('/master/login?next=%2Fkits%2Fadmin')
 })
})

describe('requireAdmin, the login action and the API gate',()=>{
 beforeEach(()=>{jar.clear();vi.stubEnv('NODE_ENV','production');vi.stubEnv('FAN_LIFE_ADMIN_KEY',KEY)})
 afterEach(()=>{vi.unstubAllEnvs()})
 it('sends a page without a session to the login page, with ?next=',()=>{
  expect(()=>requireAdmin('/master/core')).toThrow(new Redirect('/master/login?next=%2Fmaster%2Fcore'))
 })
 it('logs the owner in with the key, and out again',async()=>{
  const wrong=new FormData();wrong.set('key','not-the-key-at-all-sorry');wrong.set('next','/kits/admin')
  expect(await login({error:''},wrong)).toEqual({error:'That key is not right.'})
  expect(jar.has(ADMIN_COOKIE)).toBe(false)
  const right=new FormData();right.set('key',KEY);right.set('next','/kits/admin')
  await expect(login({error:''},right)).rejects.toEqual(new Redirect('/kits/admin'))
  expect(verifyToken(jar.get(ADMIN_COOKIE),KEY)).toBe(true)
  expect(requireAdmin('/master/admin')).toEqual({actor:'owner',role:'owner'})
  await expect(logout()).rejects.toEqual(new Redirect('/master/login'))
  expect(jar.has(ADMIN_COOKIE)).toBe(false)
  expect(()=>requireAdmin('/master/admin')).toThrow(Redirect)
 })
 it('says the key is not configured when production has none (fail closed)',async()=>{
  vi.stubEnv('FAN_LIFE_ADMIN_KEY','')
  const f=new FormData();f.set('key','anything-at-all-here');expect(await login({error:''},f)).toEqual({error:'The owner key is not configured on this server.'})
  expect(src('app/master/login/page.tsx')).toContain('the owner key is not configured on this server')
 })
 it('accepts the scheduler secret or the owner cookie on cron, and nothing else',()=>{
  vi.stubEnv('CRON_SECRET','s'.repeat(40))
  const req=(h:Record<string,string>)=>new Request('https://fanlife.dubelteam.com/api/master/cron',{headers:h})
  expect(adminOrCron(req({}))).toBeNull()
  expect(adminOrCron(req({authorization:`Bearer ${'s'.repeat(40)}`}))).toEqual({actor:'scheduler',role:'cron'})
  expect(adminOrCron(req({cookie:`${ADMIN_COOKIE}=${issueToken(KEY)}`}))).toEqual({actor:'owner',role:'owner'})
  expect(adminFromRequest(req({authorization:`Bearer ${'s'.repeat(40)}`}))).toBeNull()
 })
})

describe('the control-room API answers 401 without the owner (route handler)',()=>{
 let dir:string
 beforeAll(async()=>{dir=await mkdtemp(path.join(tmpdir(),'fan-life-admin-'))})
 afterAll(async()=>{await rm(dir,{recursive:true,force:true})})
 beforeEach(()=>{vi.stubEnv('NODE_ENV','production');vi.stubEnv('FAN_LIFE_ADMIN_KEY',KEY);vi.stubEnv('FAN_LIFE_DATA_DIR',dir);vi.stubEnv('NEXT_PUBLIC_FAN_LIFE_EVALUATION','true');vi.stubEnv('CRON_SECRET','c'.repeat(40))})
 afterEach(()=>{vi.unstubAllEnvs()})
 const call=async(method:'GET'|'POST',action:string,headers:Record<string,string>={},body?:unknown)=>{
  const {GET,POST}=await import('@/app/api/master/[...action]/route')
  const r=new NextRequest(`https://fanlife.dubelteam.com/api/master/${action}`,{method,headers:{origin:'https://fanlife.dubelteam.com',...headers},body:body===undefined?undefined:JSON.stringify(body)})
  const res=await(method==='GET'?GET:POST)(r,{params:{action:action.split('/')}});return{status:res.status,body:await res.json()}
 }
 it('refuses every read and write to an anonymous fan, even in evaluation mode',async()=>{
  for(const a of ['state','summary','audit','export','life-display','audit/archive'])expect((await call('GET',a)).status,a).toBe(401)
  for(const a of ['clubs/create','clubs/update','evidence/decide','life-display/publish','pipeline/run','research/run','archive/collect'])expect((await call('POST',a,{},{})).status,a).toBe(401)
  expect((await call('GET','state')).body).toMatchObject({login:'/master/login'})
 })
 it('refuses the scheduler secret anywhere but cron, and a forged cookie everywhere',async()=>{
  expect((await call('GET','state',{authorization:`Bearer ${'c'.repeat(40)}`})).status).toBe(401)
  expect((await call('GET','state',{cookie:`${ADMIN_COOKIE}=${issueToken('some-other-long-key-123')}`})).status).toBe(401)
  expect((await call('GET','cron',{authorization:'Bearer wrong'})).status).toBe(401)
 })
 it('serves the owner, and records the owner — not an evaluator — in the audit log (F19)',async()=>{
  const cookie=`${ADMIN_COOKIE}=${issueToken(KEY)}`
  const st=await call('GET','state',{cookie});expect(st.status).toBe(200)
  const created=await call('POST','clubs/create',{cookie},{id:'test-club',name:'Test Club',city:'Athens',country:'Greece',initials:'TC',primary:'#aa0000',secondary:'#ffffff'})
  expect(created.status).toBe(201)
  const log=await call('GET','audit',{cookie});const row=log.body.rows.find((x:{action:string})=>x.action==='club.created')
  expect(row).toMatchObject({actor:'owner',role:'owner',target:'test-club'})
  expect(JSON.stringify(log.body)).not.toContain('evaluator:open-evaluation')
 })
 it('stays closed in production when no key is configured',async()=>{
  vi.stubEnv('FAN_LIFE_ADMIN_KEY','')
  expect((await call('GET','state',{cookie:`${ADMIN_COOKIE}=${issueToken(KEY)}`})).status).toBe(401)
 })
 it('stays open for local development with no key',async()=>{
  vi.stubEnv('NODE_ENV','development');vi.stubEnv('FAN_LIFE_ADMIN_KEY','')
  expect((await call('GET','adapters')).status).toBe(200)
 })
})

describe('every admin surface goes through the one gate (source)',()=>{
 const PAGES=['app/master/admin/page.tsx','app/master/core/page.tsx','app/master/test-lab/page.tsx','app/kits/admin/page.tsx','app/master/exchange/page.tsx']
 it('calls requireAdmin on every control-room page',()=>{
  for(const p of PAGES){expect(existsSync(path.join(ROOT,p)),p).toBe(true);expect(src(p),p).toMatch(/requireAdmin\('\/[a-z/-]+'\)/)}
  expect(src('app/qa/stats/page.tsx')).toContain('adminSession()')
 })
 it('never treats evaluation mode as admin',()=>{
  for(const p of [...PAGES,'app/api/master/[...action]/route.ts','lib/master/admin.ts','lib/master/admin-token.ts'])expect(src(p),p).not.toContain('requireOpenEvaluation')
  expect(src('lib/master/evaluation-db.ts')).toContain('if(access.admin)')
  expect(src('app/api/evaluation/db/route.ts')).toContain('admin:!!adminFromRequest(r)')
 })
 it('documents FAN_LIFE_ADMIN_KEY',()=>{expect(src('.env.example')).toMatch(/^FAN_LIFE_ADMIN_KEY=/m)})
 it('keeps the scheduled workflow on the cron secret',()=>{expect(src('.github/workflows/research.yml')).toContain('Authorization: Bearer $CRON_SECRET')})
})

describe('the audit log keeps more than 1,000 entries by rotating to monthly archives (F19)',()=>{
 let dir:string
 beforeAll(async()=>{dir=await mkdtemp(path.join(tmpdir(),'fan-life-audit-'))})
 afterAll(async()=>{vi.unstubAllEnvs();await rm(dir,{recursive:true,force:true})})
 it('splits by month without losing or reordering anything',async()=>{
  const {splitAudit}=await import('@/lib/master/audit-log')
  const rows=Array.from({length:7},(_,i)=>({at:`2026-0${i<4?8:9}-0${i+1}T10:00:00Z`,action:`a${i}`,target:'x',detail:''}))
  const {kept,archive}=splitAudit(rows,3)
  expect(kept.map(r=>r.action)).toEqual(['a4','a5','a6'])
  expect(archive['2026-08']!.map(r=>r.action)).toEqual(['a0','a1','a2','a3'])
  expect(splitAudit(rows,10).archive).toEqual({})
  expect(splitAudit([{at:'??',action:'z',target:'',detail:''},...rows],7).archive).toEqual({undated:[{at:'??',action:'z',target:'',detail:''}]})
 })
 it('moves the overflow to <data>/audit-archive/<YYYY-MM>.jsonl and keeps the rest in control.json',async()=>{
  vi.stubEnv('FAN_LIFE_DATA_DIR',dir)
  const {AUDIT_KEEP}=await import('@/lib/master/audit-log')
  const {mutate,audit,readState,readAuditArchive,auditArchiveMonths}=await import('@/lib/master/store')
  expect(AUDIT_KEEP).toBeGreaterThan(1000)
  await mutate(s=>{for(let i=0;i<AUDIT_KEEP+5;i++)s.audit.push({at:'2026-10-01T00:00:00.000Z',action:`bulk.${i}`,target:'t',detail:''});audit(s,'owner.did',`t`,'',{actor:'owner',role:'owner'})})
  const s=await readState()
  expect(s.audit).toHaveLength(AUDIT_KEEP)
  expect(s.audit.at(-1)).toMatchObject({action:'owner.did',actor:'owner',role:'owner'})
  expect(await auditArchiveMonths()).toEqual(['2026-10'])
  const archived=await readAuditArchive('2026-10')
  expect(archived.map(r=>r.action)).toEqual(['bulk.0','bulk.1','bulk.2','bulk.3','bulk.4','bulk.5'])
  expect((await readdir(path.join(dir,'audit-archive')))).toEqual(['2026-10.jsonl'])
  expect((await readFile(path.join(dir,'audit-archive','2026-10.jsonl'),'utf8')).trim().split('\n')).toHaveLength(6)
  await expect(readAuditArchive('../control')).rejects.toThrow('Unknown archive month.')
 })
 it('writes `system`, never an evaluator, when nobody is named',async()=>{
  const {audit}=await import('@/lib/master/store')
  const s={audit:[]} as unknown as Parameters<typeof audit>[0];audit(s,'x','y')
  expect(s.audit[0]).toMatchObject({actor:'system',role:'system'})
 })
})

describe('owner key is compared as the owner means it',()=>{
 it('ignores outer spaces, wrapping quotes and Unicode form on either side',async()=>{
  const {keyMatches,configuredKey}=await import('@/lib/master/admin-token')
  const key=configuredKey({FAN_LIFE_ADMIN_KEY:' "Red-Terrace-1923-forever" \n',NODE_ENV:'production'})
  expect(key).toBe('Red-Terrace-1923-forever')
  expect(keyMatches('Red-Terrace-1923-forever ',key)).toBe(true)
  expect(keyMatches('“Red-Terrace-1923-forever”',key)).toBe(true)
  expect(keyMatches('red-Terrace-1923-forever',key)).toBe(false)
 })
})
