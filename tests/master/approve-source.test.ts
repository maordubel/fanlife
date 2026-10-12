import {afterAll,describe,expect,it,vi} from 'vitest'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {NextRequest} from 'next/server'
import {mutate,readState} from '@/lib/master/store'
vi.setConfig({testTimeout:120000})
/** rule 113 §4 — "Yes to all from this page": the click is the owner's check of that page, and it approves only what every cited page backs */
const dir=mkdtempSync(path.join(tmpdir(),'approve-source-'));vi.stubEnv('FAN_LIFE_DATA_DIR',dir);vi.stubEnv('RESEARCH_DATA_DIR','')
afterAll(()=>{vi.unstubAllEnvs();rmSync(dir,{recursive:true,force:true})})
const call=async(action:string,body:unknown)=>{
 const {POST}=await import('@/app/api/master/[...action]/route')
 const r=new NextRequest(`https://fanlife.dubelteam.com/api/master/${action}`,{method:'POST',headers:{origin:'https://fanlife.dubelteam.com'},body:JSON.stringify(body)})
 const res=await POST(r,{params:{action:action.split('/')}});return {status:res.status,body:await res.json()}
}
const src=(id:string,more={})=>({id,title:`Page ${id}`,url:`https://example.org/${id}`,excerpt:id,reviewed:false,retrievedAt:'2026-10-12T00:00:00Z',...more})
const f=(id:string,sources:string[],more={})=>({id,field:'founded',value:id,sources,approved:false,...more})
describe('evidence/approve-source',()=>{
 it('approves every waiting fact the page alone backs, leaves the rest, and refuses a changed page',async()=>{
  const club=(await readState()).clubs[0]!.id
  await mutate(s=>{const c=s.clubs.find(x=>x.id===club)!;c.sources=[src('s1'),src('s2'),src('s3',{reviewed:true,incoming:{excerpt:'new',retrievedAt:'2026-10-12T00:00:00Z',contentHash:'h'}})]
   c.findings=[f('a',['s1']),f('b',['s1']),f('c',['s1','s2']),f('d',['s1'],{decision:'rejected',reason:'no'}),f('e',['s3'])];return true})
  const v=(await readState()).clubs.find(x=>x.id===club)!.version
  const r=await call('evidence/approve-source',{clubId:club,version:v,sourceId:'s1'})
  expect(r.status).toBe(200);expect(r.body).toMatchObject({approved:2,left:1})
  const c=(await readState()).clubs.find(x=>x.id===club)!
  expect(c.sources.find(x=>x.id==='s1')!.reviewed).toBe(true)
  expect(c.findings.filter(x=>x.decision==='approved').map(x=>x.id).sort()).toEqual(['a','b'])
  expect(c.findings.find(x=>x.id==='c')!.decision).toBeUndefined()
  expect(c.findings.find(x=>x.id==='d')!.decision).toBe('rejected')
  const changed=await call('evidence/approve-source',{clubId:club,version:c.version,sourceId:'s3'})
  expect(changed.status).toBe(400);expect(changed.body.error).toMatch(/changed/)
  expect((await call('evidence/approve-source',{clubId:club,version:c.version-1,sourceId:'s1'})).status).toBe(409)
  // the evidence page names the page under each fact
  const {GET}=await import('@/app/api/master/[...action]/route')
  const g=await GET(new NextRequest(`https://fanlife.dubelteam.com/api/master/evidence?club=${club}&kind=findings&state=pending`),{params:{action:['evidence']}}),j=await g.json()
  expect(j.sourceInfo.s2).toMatchObject({title:'Page s2',reviewed:false,waiting:1})
 })
 it('a one-click No carries a default reason, so a rejection still has one (rule 92)',async()=>{
  const {readFileSync}=await import('node:fs')
  const ui=readFileSync('components/master/ClubFile.tsx','utf8')
  expect(ui).toMatch(/NO_REASON='Rejected by the owner'/);expect(ui).toMatch(/decision==='rejected'\?NO_REASON/)
 })
})
