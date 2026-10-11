import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {useDurableStore,memoryStore} from '@/lib/master/durable'
import {listPlayers,playerDetail} from '@/lib/players/service'
import {mergePreview,mergePlayers,unmerge,duplicateCandidates} from '@/lib/players/merge'
import {likeness} from '@/lib/players/match'
import {setSnapshot} from '@/lib/players/effective'
import {EMPTY_SNAPSHOT} from '@/lib/players/types'
import {invalidateClub,loadClub} from '@/lib/clubs/resolver'
vi.setConfig({testTimeout:90000})
const owner={actor:'tester',role:'owner'},CLUB='celtic'
beforeEach(()=>{useDurableStore(memoryStore());setSnapshot(EMPTY_SNAPSHOT);invalidateClub(CLUB)})
afterEach(()=>{useDurableStore(null);setSnapshot(EMPTY_SNAPSHOT)})
const two=async()=>{const out=[];for(let p=1;out.length<2;p++){const l=await listPlayers({clubs:[CLUB],limit:200,page:p});out.push(...l.rows.filter(r=>!r.locked&&r.price===1));if(p>=l.pages)break}return out}
describe('merge duplicates',()=>{
 it('likeness needs a real family-name match and years that fit',()=>{
  expect(likeness({name:'John Smith',aliases:[],fromYear:1990,toYear:1995},{name:'Jon Smith',aliases:[],fromYear:1991,toYear:1994})).not.toBeNull()
  expect(likeness({name:'John Smith',aliases:[],fromYear:1900,toYear:1905},{name:'Jon Smyth',aliases:[],fromYear:2010,toYear:2015})).toBeNull()
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
