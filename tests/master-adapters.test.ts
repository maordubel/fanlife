import {describe,it,expect} from 'vitest'
import {ADAPTERS,adapterFor} from '@/lib/master/adapters'
import {buildReviewPack} from '@/lib/club-research/pack'
import {compilePack} from '@/lib/clubs/compiler'
import {REGISTRY} from '@/lib/master/registry'
import {readFileSync} from 'node:fs'
const job=(clubId:string)=>({id:'j',clubId,query:'q',status:'queued' as const,attempts:0,createdAt:'2026-10-06T00:00:00Z'})
describe('research adapters',()=>{
 it('are a closed registry; default is wikipedia; unknown ids resolve to nothing',()=>{expect(Object.keys(ADAPTERS).sort()).toEqual(['package','wikipedia']);expect(adapterFor()!.id).toBe('wikipedia');expect(adapterFor('x')).toBeUndefined()})
 it('package adapter stages review findings only, with backlog as gaps',async()=>{
  const r=await ADAPTERS.package!.collect(job('panathinaikos'))
  expect(r.sources.length).toBeGreaterThan(90);expect(r.sources.every(s=>!s.reviewed&&s.url.startsWith('https://'))).toBe(true)
  expect(r.findings.length).toBeGreaterThan(4);expect(r.findings.every(f=>f.approved===false)).toBe(true)
  expect(r.findings.find(f=>f.field==='coverageClaim')!.value).toMatch(/not proof of a complete archive/)
  expect(r.gaps!.some(g=>g.startsWith('P0'))).toBe(true)})
 it('a club with no staged package fails loudly, not silently',async()=>{await expect(ADAPTERS.package!.collect(job('olympiacos'))).rejects.toThrow(/No staged research package/)})
})
describe('panathinaikos review pack',()=>{
 const club=REGISTRY.find(c=>c.id==='panathinaikos')!,pack=JSON.parse(readFileSync('club-packs/panathinaikos/core.json','utf8'))
 it('compiles with zero approved facts and every gate locked',()=>{
  const {data}=compilePack(pack,club)
  expect(data.archive).toHaveLength(30);expect(data.archive.every(f=>f.status==='review'&&f.approvedBy===null)).toBe(true)
  expect(data.timeline).toHaveLength(0);expect(data.gates.timeline.playable).toBe(false)
  expect(data.players).toBeNull();expect(data.matches).toBeNull()})
 it('is regenerated identically from staging (idempotent)',()=>{
  const d='research-staging/panathinaikos',r=(n:string)=>JSON.parse(readFileSync(`${d}/${n}.json`,'utf8'))
  expect(buildReviewPack('panathinaikos',{timeline:r('timeline'),sources:r('sources')})).toEqual(pack)})
})
