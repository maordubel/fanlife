import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {readFileSync} from 'node:fs'
import {useDurableStore,memoryStore} from '@/lib/master/durable'
import {listPlayers,quickEdit,readAudit,QUICK_REASON,Refusal,type Row} from '@/lib/players/service'
import {duplicateCandidates} from '@/lib/players/merge'
import {keepBoth,forgetKeepBoth,pairKey} from '@/lib/players/distinct'
import {playerReports} from '@/lib/players/reports'
import {queryFrom} from '@/lib/players/query'
import {setSnapshot} from '@/lib/players/effective'
import {EMPTY_SNAPSHOT} from '@/lib/players/types'
import {invalidateClub} from '@/lib/clubs/resolver'
vi.setConfig({testTimeout:120000})
/** rule 113 — the control room is click by click: a quick edit needs no reason, "keep both" is remembered, every column sorts both ways */
const owner={actor:'tester',role:'owner'},CLUB='celtic'
beforeEach(()=>{useDurableStore(memoryStore());setSnapshot(EMPTY_SNAPSHOT);invalidateClub(CLUB)})
afterEach(()=>{useDurableStore(null);setSnapshot(EMPTY_SNAPSHOT)})
const rows=async(more:Partial<Parameters<typeof listPlayers>[0]>={})=>(await listPlayers({clubs:[CLUB],limit:200,...more})).rows
const refusal=async(p:Promise<unknown>)=>{try{await p}catch(e){return e as Refusal}throw new Error('expected a refusal')}

describe('a quick edit in the table',()=>{
 it('publishes at once with no reason, records "Quick edit in the table", and the list shows it',async()=>{
  const m=(await rows()).find(r=>!r.locked&&r.rating<99)!
  const res=await quickEdit(CLUB,m.id,{rating:m.rating+1},{expectedRev:m.rev},owner)
  expect(res.row.rating).toBe(m.rating+1);expect(res.row.rev).toBe(m.rev+1)
  expect((await rows({q:m.id})).find(r=>r.id===m.id)!.rating).toBe(m.rating+1)
  const ev=(await readAudit()).filter(e=>e.club===CLUB&&e.player===m.id).at(-1)!
  expect(ev).toMatchObject({action:'publish',reason:QUICK_REASON,actor:'tester'})
  // back to the archive's own value clears the override (no rating key left)
  const back=await quickEdit(CLUB,m.id,{rating:m.baseRating},{expectedRev:res.row.rev},owner)
  expect(back.row.rating).toBe(m.baseRating);expect(back.row.overridden).not.toContain('rating')
 })
 it('keeps every server check: the ladder asks first, a locked price is open to the admin, a stale row is refused, only the quick fields travel',async()=>{
  const all=await rows(),free=all.find(r=>!r.locked&&r.price===1)!
  const off=await refusal(quickEdit(CLUB,free.id,{price:5},{expectedRev:free.rev},owner))
  expect(off.status).toBe(422);expect(off.message).toMatch(/ladder/)
  const ok=await quickEdit(CLUB,free.id,{price:5},{expectedRev:free.rev,confirmQuota:true},owner)
  expect(ok.row.price).toBe(5)
  const stale=await refusal(quickEdit(CLUB,free.id,{price:4},{expectedRev:free.rev,confirmQuota:true},owner));expect(stale.status).toBe(409)
  const locked=all.find(r=>r.locked)
  if(locked){const l=await quickEdit(CLUB,locked.id,{price:locked.price===1?2:1},{expectedRev:locked.rev,confirmQuota:true},owner);expect(l.row.price).toBe(locked.price===1?2:1)}
  const pos=await refusal(quickEdit(CLUB,free.id,{removed:true},{expectedRev:ok.row.rev},owner));expect(pos.status).toBe(400)
  const bad=await refusal(quickEdit(CLUB,free.id,{rating:120},{expectedRev:ok.row.rev},owner));expect(bad.status).toBe(400)
 })
 it('the route takes the quick action from the owner only (the guard runs before it)',()=>{
  const src=readFileSync('app/api/master/players/[club]/[id]/route.ts','utf8')
  expect(src).toMatch(/case 'quick':return json\(await quickEdit\(/);expect(src.indexOf('guard(r,true)')).toBeLessThan(src.indexOf("case 'quick'"))
 })
})

describe('merge duplicates: "two different men — keep both"',()=>{
 it('is remembered: the pair leaves the merge list and the twins report, and comes back when forgotten',async()=>{
  const {candidates}=await duplicateCandidates([CLUB]);expect(candidates.length).toBeGreaterThan(0)
  const c=candidates[0]!,has=async()=>(await duplicateCandidates([CLUB])).candidates.some(x=>pairKey(x.club,x.a.id,x.b.id)===pairKey(c.club,c.a.id,c.b.id))
  await keepBoth(CLUB,c.a.id,c.b.id,owner)
  expect(await has()).toBe(false)
  const twin=(await playerReports([CLUB])).twins.some(t=>t.members.length===2&&t.members.every(m=>m.id===c.a.id||m.id===c.b.id))
  expect(twin).toBe(false)
  await forgetKeepBoth(CLUB,c.a.id,c.b.id)
  expect(await has()).toBe(true)
 })
 it('refuses a pair that is not two men of this club',async()=>{
  const m=(await rows())[0]!
  expect((await refusal(keepBoth(CLUB,m.id,m.id,owner))).status).toBe(400)
  expect((await refusal(keepBoth(CLUB,m.id,'no-such-man',owner))).status).toBe(404)
  expect((await refusal(keepBoth('not-a-club',m.id,m.id+'x',owner))).status).toBe(404)
 })
})

describe('sorting the players table',()=>{
 const sorted=(xs:(number|string)[],dir:1|-1)=>xs.every((x,i)=>i===0||(dir>0?xs[i-1]!<=x:xs[i-1]!>=x))
 it('every column name sorts both ways; blanks sort last',async()=>{
  expect(queryFrom(new URLSearchParams('sort=position&dir=desc'))).toMatchObject({sort:'position',dir:'desc'})
  expect(queryFrom(new URLSearchParams('sort=nonsense')).sort).toBe('club')
  const r=(x:Row[])=>x
  expect(sorted(r(await rows({sort:'rating',dir:'asc'})).map(x=>x.rating),1)).toBe(true)
  expect(sorted(r(await rows({sort:'rating',dir:'desc'})).map(x=>x.rating),-1)).toBe(true)
  expect(sorted(r(await rows({sort:'price',dir:'asc'})).map(x=>x.price),1)).toBe(true)
  const desc=await rows({sort:'name',dir:'desc'}),asc=await rows({sort:'name',dir:'asc'});expect(desc[0]!.id).not.toBe(asc[0]!.id)
  const late=(await rows({sort:'years',dir:'desc'})).filter(x=>x.toYear??x.fromYear),early=(await rows({sort:'years',dir:'asc'}))
  expect(sorted(late.map(x=>(x.toYear??x.fromYear)!),-1)).toBe(true);expect(early[0]!.fromYear).not.toBeNull()
  const pos=await rows({sort:'position',dir:'asc'}),ORDER=['GK','DF','MF','FW'],idx=pos.map(x=>x.positions.length?ORDER.indexOf(x.positions[0]!):9)
  expect(sorted(idx,1)).toBe(true)
 })
})
