import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {readFileSync} from 'node:fs'
import {useDurableStore,memoryStore} from '@/lib/master/durable'
import {listPlayers,quickEdit,Refusal,type Row} from '@/lib/players/service'
import {quickMany,parseChange} from '@/lib/players/many'
import {setSnapshot} from '@/lib/players/effective'
import {EMPTY_SNAPSHOT} from '@/lib/players/types'
import {invalidateClub} from '@/lib/clubs/resolver'
import {combinedScore,REPUTATION_WEIGHT} from '@/lib/legends/ratings'
vi.setConfig({testTimeout:120000})
/** owner, 13.10.2026: nothing is locked to the admin · a reputation score for every man, blended into the stars · several men at once · positions and names in the row */
const owner={actor:'tester',role:'owner'},CLUB='celtic'
beforeEach(()=>{useDurableStore(memoryStore());setSnapshot(EMPTY_SNAPSHOT);invalidateClub(CLUB)})
afterEach(()=>{useDurableStore(null);setSnapshot(EMPTY_SNAPSHOT)})
const rows=async()=>(await listPlayers({clubs:[CLUB],limit:200})).rows
const refusal=async(p:Promise<unknown>)=>{try{await p}catch(e){return e as Refusal}throw new Error('expected a refusal')}

describe('reputation',()=>{
 it('every man has one from 40 to 99, and an edit sets it and can be put back',async()=>{
  const all=await rows();expect(all.length).toBeGreaterThan(10)
  for(const r of all){expect(r.reputation).toBeGreaterThanOrEqual(40);expect(r.reputation).toBeLessThanOrEqual(99);expect(r.baseReputation).toBe(r.reputation)}
  const m=all.find(r=>!r.removed&&r.reputation<95)!
  const a=await quickEdit(CLUB,m.id,{reputation:m.reputation+3},{expectedRev:m.rev},owner)
  expect(a.row.reputation).toBe(m.reputation+3);expect(a.row.overridden).toContain('reputation')
  const b=await quickEdit(CLUB,m.id,{reputation:m.baseReputation},{expectedRev:a.row.rev},owner)
  expect(b.row.overridden).not.toContain('reputation')
  expect((await refusal(quickEdit(CLUB,m.id,{reputation:120},{expectedRev:b.row.rev},owner))).status).toBe(400)
 })
 it('the stars read ability and reputation together, half and half',()=>{
  expect(REPUTATION_WEIGHT).toBe(0.5)
  expect(combinedScore(80,60)).toBe(70);expect(combinedScore(80,undefined)).toBe(80);expect(combinedScore(61,80)).toBe(71)
 })
})

describe('nothing is locked to the admin',()=>{
 it('a pinned price changes with no exception box, and the table no longer disables it',async()=>{
  const l=(await rows()).find(r=>r.locked)
  if(l){const res=await quickEdit(CLUB,l.id,{price:l.price===1?2:1},{expectedRev:l.rev,confirmQuota:true},owner);expect(res.row.price).toBe(l.price===1?2:1)}
  const src=readFileSync('components/master/desk/PlayersDesk.tsx','utf8')
  expect(src).not.toMatch(/disabled=\{frozen\|\|r\.locked/);expect(src).not.toMatch(/Open the full editor/)
 })
})

describe('positions and names in the row',()=>{
 it('adds a position and sets the order in a quick edit',async()=>{
  const m=(await rows()).find(r=>!r.removed&&r.positions.length===1&&!r.locked)!
  const other=(['GK','DF','MF','FW'] as const).find(p=>!m.positions.includes(p))!
  const a=await quickEdit(CLUB,m.id,{positions:[...m.positions,other]},{expectedRev:m.rev,confirmQuota:true},owner)
  expect(a.row.positions).toEqual([...m.positions,other]);expect(a.row.overridden).toContain('positions')
 })
 it('a name needs the second confirmation, then shows everywhere and keeps the old spelling as an alias',async()=>{
  const m=(await rows()).find(r=>!r.removed&&!r.mergedInto)!
  const e=await refusal(quickEdit(CLUB,m.id,{name:'Testname Rewritten'},{expectedRev:m.rev},owner));expect(e.status).toBe(400);expect(e.message).toMatch(/Are you sure/)
  const a=await quickEdit(CLUB,m.id,{name:'  Testname   Rewritten '},{expectedRev:m.rev,confirmName:true},owner)
  expect(a.row.name).toBe('Testname Rewritten');expect(a.row.baseName).toBe(m.baseName)
  expect((await listPlayers({clubs:[CLUB],q:'Testname Rewritten'})).rows.some(r=>r.id===m.id)).toBe(true)
  const back=await quickEdit(CLUB,m.id,{name:m.baseName},{expectedRev:a.row.rev,confirmName:true},owner)
  expect(back.row.overridden).not.toContain('name')
  for(const bad of ['x','<b>ab</b>','12345'])expect((await refusal(quickEdit(CLUB,m.id,{name:bad},{expectedRev:back.row.rev,confirmName:true},owner))).status).toBe(400)
 })
})

describe('several men at once',()=>{
 const pick=async(n:number)=>(await rows()).filter(r=>!r.removed&&!r.mergedInto&&r.price===1&&r.positions.length>0).slice(0,n)
 it('sets one price for all of them in one revision, with the ladder asking first',async()=>{
  const m=await pick(3),items=m.map(r=>({club:CLUB,id:r.id,expectedRev:r.rev}))
  const off=await refusal(quickMany(items,{price:5},{},owner));expect(off.status).toBe(422);expect(off.message).toMatch(/ladder/)
  const ok=await quickMany(items,{price:5},{confirmQuota:true},owner)
  expect(ok.changed).toBe(3);expect(ok.rows.every(r=>r.price===5)).toBe(true)
  const after=await rows();for(const r of m)expect(after.find(x=>x.id===r.id)!.price).toBe(5)
  expect(new Set(ok.rows.map(r=>r.rev)).size).toBe(1)
 })
 it('adds one position to all, skips those who have it, refuses a stale row whole',async()=>{
  const m=await pick(2),has=m[0]!.positions[0]!
  const ok=await quickMany(m.map(r=>({club:CLUB,id:r.id,expectedRev:r.rev})),{addPosition:has},{confirmQuota:true},owner)
  expect(ok.unchanged).toBeGreaterThanOrEqual(1)
  const stale=await refusal(quickMany([{club:CLUB,id:m[0]!.id,expectedRev:99}],{price:2},{confirmQuota:true},owner));expect(stale.status).toBe(409)
 })
 it('takes only a price or one position, 1–200 men, and nothing else',async()=>{
  expect(()=>parseChange({price:9})).toThrow();expect(()=>parseChange({rating:60})).toThrow();expect(()=>parseChange({price:2,addPosition:'DF'})).toThrow()
  expect(parseChange({addPosition:'GK'})).toEqual({addPosition:'GK'})
  expect((await refusal(quickMany([],{price:2},{},owner))).status).toBe(400)
  const route=readFileSync('app/api/master/players/many/route.ts','utf8');expect(route.indexOf('guard(r,true)')).toBeLessThan(route.indexOf('quickMany('))
 })
})
void ({} as Row)
