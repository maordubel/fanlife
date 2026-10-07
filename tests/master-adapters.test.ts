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
  // package statistics are a REPORT (gap line), never a historical finding (audit A06)
  expect(r.findings.some(f=>f.field==='coverageClaim')).toBe(false);expect(r.gaps!.some(g=>g.startsWith('REPORT ·')&&/not proof of a complete archive/.test(g))).toBe(true)
  expect(r.gaps!.some(g=>g.startsWith('P0'))).toBe(true)})
 it('a club with no staged package fails loudly, not silently',async()=>{await expect(ADAPTERS.package!.collect(job('olympiacos'))).rejects.toThrow(/No staged research package/)})
})
describe('panathinaikos pack (owner-approved 2026-10-06)',()=>{
 const club=REGISTRY.find(c=>c.id==='panathinaikos')!,pack=JSON.parse(readFileSync('club-packs/panathinaikos/core.json','utf8'))
 it('carries a named owner approval and compiles its exact-day events into the timeline',()=>{
  const {data}=compilePack(pack,club)
  expect(data.archive).toHaveLength(30);expect(data.archive.every(f=>f.status==='approved'&&/Maor Harel/.test(f.approvedBy||'')&&f.approvedAt==='2026-10-06')).toBe(true)
  expect(data.timeline.length).toBeGreaterThanOrEqual(7);expect(data.timeline.every(t=>t.value.on))
  expect(data.players).toHaveLength(52);expect(data.rivals?.[0]?.value.name).toBe('Olympiacos');expect(data.matches).toBeNull()})
 it('is English, and still the same facts as staging (ids and sources unchanged by approval)',()=>{
  expect(pack.contentLocale).toBe('en')
  const d='research-staging/panathinaikos',r=(n:string)=>JSON.parse(readFileSync(`${d}/${n}.json`,'utf8'))
  const fresh=buildReviewPack('panathinaikos',{timeline:r('timeline'),sources:r('sources')})
  expect(pack.archive.map((a:{id:string;sources:string[]})=>[a.id,a.sources])).toEqual(fresh.archive.map((a:{id:string;sources:string[]})=>[a.id,a.sources]))
  expect(pack.archive.map((a:{value:{on:string|null}})=>a.value.on)).toEqual(fresh.archive.map((a:{value:{on:string|null}})=>a.value.on))})
})
