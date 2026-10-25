import {afterEach,describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {memoryStore,useDurableStore} from '@/lib/master/durable'
import {autopilot} from '@/lib/legends/lab'
import {archiveOk,archivePath,historyDetail} from '@/lib/legends/history'
import {deleteArchived,flushArchives,insertCareer,readCareer,readSeasonArchive,setStatus,storedSeasons} from '@/lib/legends/store'
import type {Career} from '@/lib/legends/types'
import {LEAGUE} from './fixtures'

afterEach(()=>{// eslint-disable-next-line react-hooks/rules-of-hooks
useDurableStore(undefined as unknown as null)})
// eslint-disable-next-line react-hooks/rules-of-hooks -- `useDurableStore` is a store setter, not a React hook
const fake=()=>useDurableStore({...memoryStore(),kind:'vercel-blob'} as never)
let played:Career|null=null
const two=()=>{if(!played){const r=autopilot(LEAGUE[0]!,LEAGUE.slice(1,4),2,'hist');expect(r.error).toBeNull();played=r.career!}return played}

describe('F04 · the whole season is kept',()=>{
 it('every finished season leaves a signed archive with its fixtures, table, leaders and squad',()=>{
  const c=two();expect(c.history).toHaveLength(2);expect(c.pendingArchive).toHaveLength(2)
  for(const [i,a] of c.pendingArchive!.entries()){
   expect(archiveOk(a,c.id,i+1)).toBe(true)
   const rec=c.history[i]!
   expect(a.fixtures.length).toBeGreaterThan(0);expect(a.fixtures.every(f=>f.result)).toBe(true)
   expect(a.table).toHaveLength(4);expect(a.table.find(r=>r.club===c.clubId)!.pts).toBe(rec.points)
   expect(a.record).toEqual(rec);expect(a.champion.club).toBe(a.table[0]!.club)
   expect(a.stats.played).toBe(a.fixtures.length+(a.playoff?.result?1:0))
   expect(a.squad.length).toBeGreaterThanOrEqual(17)
  }
 })
 it('a tampered or foreign archive is refused; fixture ids repeat between seasons so the key carries career and season',()=>{
  const c=two(),[s1,s2]=c.pendingArchive!
  expect(s1!.fixtures[0]!.id).toBeDefined()
  expect(archiveOk({...s1!,record:{...s1!.record,points:999}},c.id,1)).toBe(false)
  expect(archiveOk(s1,'someone-else',1)).toBe(false);expect(archiveOk(s1,c.id,2)).toBe(false);expect(archiveOk(s2,c.id,2)).toBe(true)
  expect(archivePath(c.id,2)).toBe(`season-history/${c.id}/2.json`)
 })
 it('a man sold afterwards keeps his name and his goals in the old season',()=>{
  const a=two().pendingArchive![0]!
  const top=a.stats.scorers[0]!;expect(top.name).not.toBe('—');expect(a.names[`${top.club}:${top.id}`]).toBe(top.name)
 })
})

describe('F04 · writing it down safely',()=>{
 const OWNER='a'.repeat(32)
 const career=(id:string,seasons=2)=>{const r=autopilot(LEAGUE[0]!,LEAGUE.slice(1,4),seasons,id,undefined,id);expect(r.error).toBeNull();return {...r.career!,owner:OWNER}}
 it('flush writes the season, reads it back, and only then drops the pending copy; a repeat does nothing',async()=>{
  fake();const c=career('c0ffee0000000f01')
  expect((await insertCareer(c)).ok).toBe(true)
  expect(await flushArchives(c.id)).toBe(2)
  const cur=(await readCareer(c.id,true))!.career
  expect(cur.pendingArchive).toBeUndefined();expect(cur.history).toHaveLength(2)
  expect(await flushArchives(c.id)).toBe(0)
  const a=await readSeasonArchive(OWNER,c.id,1);expect(a).not.toBe('summary-only');expect(a).toMatchObject({ordinal:1})
  expect([...await storedSeasons(c.id,[1,2,3])].sort()).toEqual([1,2])
 })
 it('a flush that does not verify keeps the pending copy, so nothing is lost',async()=>{
  const store={...memoryStore(),kind:'vercel-blob'} as ReturnType<typeof memoryStore>
  useDurableStore(store as never);const c=career('c0ffee0000000f02')
  expect((await insertCareer(c)).ok).toBe(true)
  const realRead=store.read.bind(store);let off=true
  store.read=async(n:string,o?:never)=>off&&n.includes('season-history')?null:realRead(n,o)
  expect(await flushArchives(c.id)).toBe(0)
  expect((await readCareer(c.id,true))!.career.pendingArchive).toHaveLength(2)
  expect(await readSeasonArchive(OWNER,c.id,2)).toMatchObject({ordinal:2}) // still readable from the pending copy
  off=false;expect(await flushArchives(c.id)).toBe(2)
  expect((await readCareer(c.id,true))!.career.pendingArchive).toBeUndefined()
 })
 it('only the owner can open a season; knowing the id is not enough',async()=>{
  fake();const c=career('c0ffee0000000f03',1);await insertCareer(c)
  expect(await readSeasonArchive('b'.repeat(32),c.id,1)).toBeNull()
  expect(await readSeasonArchive(OWNER,c.id,1)).toMatchObject({ordinal:1})
 })
 it('a season from before the archive is summary-only: nothing is rebuilt from a seed',async()=>{
  fake();const c={...career('c0ffee0000000f04'),pendingArchive:undefined};await insertCareer(c)
  expect(await readSeasonArchive(OWNER,c.id,1)).toBe('summary-only')
  expect(await readSeasonArchive(OWNER,c.id,7)).toBeNull()
  expect(historyDetail(c,new Set()).map(h=>h.detail)).toEqual(['summary-only','summary-only'])
  expect(historyDetail({...c,pendingArchive:two().pendingArchive},new Set([1])).map(h=>h.detail)).toEqual(['full','pending'])
 })
 it('deleting a career empties its season documents',async()=>{
  fake();const c=career('c0ffee0000000f05');await insertCareer(c);await flushArchives(c.id)
  expect(await readSeasonArchive(OWNER,c.id,1)).toMatchObject({ordinal:1})
  expect((await setStatus(OWNER,c.id,'archived')).ok).toBe(true)
  expect((await deleteArchived(OWNER,c.id)).ok).toBe(true)
  expect(await readSeasonArchive(OWNER,c.id,1)).toBeNull()
  expect([...await storedSeasons(c.id,[1,2])]).toEqual([])
 })
 it('a claimed career keeps its season documents (they hang off the career id, not the owner)',async()=>{
  const {claimDeviceCareers}=await import('@/lib/legends/store')
  fake();const c=career('c0ffee0000000f06');await insertCareer(c);await flushArchives(c.id)
  const to='b'.repeat(32);expect((await claimDeviceCareers(OWNER,to)).ok).toBe(true)
  expect(await readSeasonArchive(to,c.id,1)).toMatchObject({ordinal:1});expect(await readSeasonArchive(OWNER,c.id,1)).toBeNull()
 })
})
