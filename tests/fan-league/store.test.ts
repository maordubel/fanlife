import {beforeAll,describe,expect,it} from 'vitest'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {buildCatalog} from '@/lib/fan-league/catalog'
import {applyAction,createCareer,parseAction,type Action} from '@/lib/fan-league/career'
import type {Catalog} from '@/lib/fan-league/types'
import type {Pos} from '@/lib/clubs/rumble-format'

beforeAll(()=>{process.env.FAN_LIFE_DATA_DIR=mkdtempSync(path.join(tmpdir(),'fl-'))})
function club(id:string):Catalog{const fam:Pos[]=['GK','DF','DF','DF','MF','MF','MF','FW','FW','DF'];const rows=Array.from({length:40},(_,i)=>({id:`${id}-p${i}`,name:`${id} ${i}`,position:fam[i%10]!,price:1+(i%5),rating:60+(i*7%30),fromYear:1980+(i%9),toYear:1983+(i%9)}));return buildCatalog(id,id,rows,new Set(rows.map(r=>r.id)))}
const act=(a:Record<string,unknown>,rev:number,key:string)=>parseAction({...a,key,rev}) as Action

describe('FAN LEAGUE — saving',()=>{
 it('two moves made against the same revision: one applies, the other is refused as stale; a replayed key changes nothing',async()=>{
  const {insertCareer,mutateCareer,readCareer,ownerIndex}=await import('@/lib/fan-league/store')
  const made=createCareer({id:'0123456789abcdef',owner:'a'.repeat(32),now:'2026-10-12T00:00:00Z',own:club('own'),homeDecade:1980,rivals:['b','c','d'].map(x=>({catalog:club(x),decade:1980}))})
  if(!made.ok)throw new Error(made.error)
  await insertCareer(made.career)
  expect((await ownerIndex('a'.repeat(32))).careers.map(c=>c.id)).toEqual(['0123456789abcdef'])
  const rev=made.career.revision
  const run=(key:string)=>mutateCareer('0123456789abcdef',c=>{const r=applyAction(c,act({kind:'play'},rev,key),'t');return r.ok?{career:r.career,replay:!!r.replay}:{error:r}})
  const [a,b]=await Promise.all([run('keyAAAAAAAA'),run('keyBBBBBBBB')])
  const oks=[a,b].filter(x=>x&&!('error' in x)).length
  expect(oks).toBe(1)
  const after=(await readCareer('0123456789abcdef',true))!.career
  expect(after.played).toBe(1);expect(after.revision).toBe(rev+1)
  const again=await mutateCareer('0123456789abcdef',c=>{const r=applyAction(c,act({kind:'play'},rev,oks&&a&&!('error' in a)?'keyAAAAAAAA':'keyBBBBBBBB'),'t');return r.ok?{career:r.career,replay:!!r.replay}:{error:r}})
  expect(again&&!('error' in again)&&again.replay).toBe(true)
  expect((await readCareer('0123456789abcdef',true))!.career.played).toBe(1)
 })
 it('refuses a malformed id',async()=>{const {readCareer}=await import('@/lib/fan-league/store');expect(await readCareer('../etc/passwd')).toBeNull()})
})
