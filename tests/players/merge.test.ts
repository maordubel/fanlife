import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {useDurableStore,memoryStore} from '@/lib/master/durable'
import {listPlayers,playerDetail} from '@/lib/players/service'
import {mergePreview,mergePlayers,unmerge,duplicateCandidates} from '@/lib/players/merge'
import {likeness,type Person} from '@/lib/players/match'
import {setSnapshot} from '@/lib/players/effective'
import {EMPTY_SNAPSHOT} from '@/lib/players/types'
import {invalidateClub,loadClub} from '@/lib/clubs/resolver'
import {ratedPool} from '@/lib/clubs/rumble'
vi.setConfig({testTimeout:90000})
const owner={actor:'tester',role:'owner'},CLUB='celtic'
beforeEach(()=>{useDurableStore(memoryStore());setSnapshot(EMPTY_SNAPSHOT);invalidateClub(CLUB)})
afterEach(()=>{useDurableStore(null);setSnapshot(EMPTY_SNAPSHOT)})
const two=async()=>{const out=[];for(let p=1;out.length<2;p++){const l=await listPlayers({clubs:[CLUB],limit:200,page:p});out.push(...l.rows.filter(r=>!r.locked&&r.price===1));if(p>=l.pages)break}return out}
describe('merging loses nothing, and unmerging restores everything',()=>{
 it('the games see one man carrying both men’s names, years and positions; the other leaves the pool; unmerge brings him back unchanged',async()=>{
  const [k,x]=await two();const keepId=k!.id,dropId=x!.id
  const before=await loadClub(CLUB),poolBefore=ratedPool(before!.data),dropBefore=poolBefore.find(c=>c.id===dropId)!,keepBefore=poolBefore.find(c=>c.id===keepId)!
  expect(dropBefore).toBeTruthy()
  await mergePlayers(CLUB,keepId,dropId,{reason:'same man',confirmQuota:true},owner)
  const after=await loadClub(CLUB),pool=ratedPool(after!.data)
  expect(pool.find(c=>c.id===dropId)).toBeUndefined()
  const fact=after!.data.players!.find(f=>f.value.id===keepId)!,keeper=fact.value
  expect([keeper.name,...keeper.aliases]).toEqual(expect.arrayContaining([x!.name]))
  expect((fact as unknown as {sources:unknown[]}).sources.length).toBeGreaterThanOrEqual(1)
  const kc=pool.find(c=>c.id===keepId)!
  for(const pos of dropBefore.alt?.length||dropBefore.position?[dropBefore.position]:[])expect([kc.position,...(kc.alt??[])]).toContain(pos)
  expect(kc.price).toBe(keepBefore.price)
  // the raw record of the dropped man is untouched (nothing deleted): the archive still holds him
  const base=await playerDetail(CLUB,dropId);expect(base!.row.mergedInto).toBe(keepId);expect((await playerDetail(CLUB,keepId))!.absorbed.map(a=>a.id)).toContain(dropId);expect(base!.row.basePrice).toBe(dropBefore.price)
  await unmerge(CLUB,dropId,'undo',owner)
  const restored=ratedPool((await loadClub(CLUB))!.data),back=restored.find(c=>c.id===dropId)!
  expect(back).toBeTruthy();expect(back.price).toBe(dropBefore.price);expect(back.position).toBe(dropBefore.position);expect(back.rating).toBe(dropBefore.rating)
  const k2=restored.find(c=>c.id===keepId)!;expect(k2.price).toBe(keepBefore.price);expect(k2.position).toBe(keepBefore.position)
 })
})
describe('merge duplicates',()=>{
 it('likeness needs a real family-name match and years that fit',()=>{
  const man=(name:string,fromYear:number,toYear:number):Person=>({id:name,name,nameOriginal:name,aliases:[],fromYear,toYear,wave:false,locked:false,price:1,positions:[]})
  expect(likeness(man('John Smith',1990,1995),man('Jon Smith',1991,1994))).not.toBeNull()
  expect(likeness(man('John Smith',1900,1905),man('Jon Smyth',2010,2015))).toBeNull()
 })
 it('suggestions come back with reasons and never merge anything',async()=>{const d=await duplicateCandidates([CLUB],20);for(const c of d.candidates)expect(c.likeness.reasons.length).toBeGreaterThan(0)})
 it('merge needs a reason, removes the duplicate, carries his name, and unmerge restores him',async()=>{
  const [k,x]=await two();const pv=await mergePreview(CLUB,k!.id,x!.id);expect(pv.result.aliases).toContain(x!.name)
  await expect(mergePlayers(CLUB,k!.id,x!.id,{reason:''},owner)).rejects.toMatchObject({status:400})
  const r=await mergePlayers(CLUB,k!.id,x!.id,{reason:'same man',confirmQuota:true},owner);expect(r.revision).toBe(1)
  const d=await playerDetail(CLUB,x!.id);expect(d!.row.mergedInto).toBe(k!.id)
  const l=await listPlayers({clubs:[CLUB],limit:200,q:x!.name});expect(l.rows.find(z=>z.id===x!.id)).toBeUndefined()
  const club=await loadClub(CLUB);expect(club).toBeTruthy()
  await expect(mergePreview(CLUB,x!.id,k!.id)).resolves.toMatchObject({blocker:expect.stringMatching(/merged into/)})
  await unmerge(CLUB,x!.id,'mistake',owner);expect((await playerDetail(CLUB,x!.id))!.row.mergedInto).toBeNull()
 })
})
