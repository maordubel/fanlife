import {describe,it,expect,beforeAll} from 'vitest'
import {loadClub} from '@/lib/clubs/resolver'
import type {ClubData} from '@/lib/clubs/contract'
import {dealMemory,memoryPool,pairKey,planMemory,revealOf} from '@/lib/clubs/memory-deck'
import {deckReport,normFace,isTheme} from '@/lib/clubs/memory-solver'

let hapoel:ClubData,olympiacos:ClubData,zrinjski:ClubData
beforeAll(async()=>{hapoel=(await loadClub('hapoel-tel-aviv'))!.data;olympiacos=(await loadClub('olympiacos'))!.data;zrinjski=(await loadClub('zrinjski-mostar'))!.data},120000)
const dealt=(d:ReturnType<typeof dealMemory>)=>{if('blocked' in d)throw new Error('blocked '+JSON.stringify(d.blocked));return d}

describe('Gate 6 · the dealt wall (ME-R01..R04) on the real clubs',()=>{
 it('every wall of every size is valid: distinct faces, enough recognisable relations, the right size',()=>{
  for(const club of [hapoel,olympiacos,zrinjski])for(const size of [2,4,6] as const)for(const seed of [1,7,42,99])for(const cursor of [0,1,2,5]){
   const d=dealMemory(club,{size,seed,cursor})
   if('blocked' in d){expect(d.blocked.code).toMatch(/^MEMORY_/);continue}
   expect(d.deal.cards).toHaveLength(size*2);expect(d.deal.pairs).toHaveLength(size)
   expect(deckReport(d.pairs,size).problems).toEqual([])
   const faces=d.deal.cards.map(c=>normFace(c.face));expect(new Set(faces).size).toBe(faces.length)
  }
 })
 it('Hapoel fields a full wall, a mixed one, with at least three recognisable relations',()=>{
  const d=dealt(dealMemory(hapoel,{size:6,seed:42,cursor:0}))
  expect(d.deal.label).toBe('mixed');expect(d.deal.narrow).toBe(false)
  expect(deckReport(d.pairs,6).recognisable).toBeGreaterThanOrEqual(3);expect(deckReport(d.pairs,6).maxOfOneType).toBeLessThanOrEqual(3)
 })
 it('a club whose archive is dated events only is dealt as DATE MEMORY and says so',()=>{
  for(const club of [olympiacos,zrinjski]){
   const plan=planMemory(club,{seed:42,cursor:0})
   expect(plan.pool.dateOnly).toBe(true);expect(plan.deal?.label).toBe('date')
  }
 })
 it('is deterministic in (size, theme, seed, cursor) and rotates: the next cursor never repeats a pair of the lap',()=>{
  const a=dealt(dealMemory(hapoel,{size:6,seed:5,cursor:0})),b=dealt(dealMemory(hapoel,{size:6,seed:5,cursor:0})),c=dealt(dealMemory(hapoel,{size:6,seed:5,cursor:1}))
  expect(b.deal.cards.map(x=>x.face)).toEqual(a.deal.cards.map(x=>x.face))
  const used=new Set(a.pairs.map(x=>x.pair));expect(c.pairs.some(x=>used.has(x.pair))).toBe(false)
  expect(c.deal.index).toBe(1)
 })
 it('the pool counts what it left out and why, instead of dropping it silently',()=>{
  const {stats}=memoryPool(hapoel);expect(stats.candidates).toBe(hapoel.memory.length)
  expect(stats.valid+stats.excluded.relation+stats.excluded.faceLong+stats.excluded.duplicateId).toBe(stats.candidates)
 })
})

describe('Gate 6 · ME-R11 themes on the real pool',()=>{
 it('every themed wall holds only pairs of its decade, and passes the same validator',()=>{
  const plan=planMemory(hapoel,{seed:3,cursor:0})
  expect(plan.themes.length).toBeGreaterThan(0)
  for(const t of plan.themes){
   expect(isTheme(t.theme)).toBe(true)
   for(const cursor of [0,1]){
    const d=dealMemory(hapoel,{size:t.maxSize as 2|4|6,theme:t.theme,seed:3,cursor})
    if('blocked' in d)continue
    expect(d.pairs.every(c=>c.theme===t.theme)).toBe(true);expect(deckReport(d.pairs,t.maxSize as 2|4|6).problems).toEqual([])
    expect(d.deal.theme).toBe(t.theme)
   }
  }
 })
 it('asking for a decade the archive cannot field answers with MEMORY_THEME_SHORT and the plain wall — never a padded one',()=>{
  const plan=planMemory(hapoel,{seed:3,cursor:0,theme:'d1800'})
  expect(plan.asked?.blocker.code).toBe('MEMORY_THEME_SHORT');expect(plan.selected.theme).toBeNull();expect(plan.deal?.theme).toBeNull()
  expect(planMemory(hapoel,{seed:3,cursor:0,theme:'nonsense'}).asked?.blocker.code).toBe('MEMORY_THEME_SHORT')
 })
})

describe('Gate 6 · the plan: sizes, blockers and a smaller wall that is labelled',()=>{
 it('opens the biggest wall that can be dealt and keeps the asked-for size shut with its reason when it cannot',()=>{
  const plan=planMemory(hapoel,{seed:1,cursor:0,size:'6'})
  expect(plan.selected.size).toBe(6);expect(plan.sizes.map(s=>s.size)).toEqual([6,4,2]);expect(plan.sizes.every(s=>s.available)).toBe(true)
  const thin=planMemory(hapoel,{seed:1,cursor:0,size:'6',theme:'d1980'})
  if(!thin.sizes.find(s=>s.size===6)!.available){expect(thin.selected.size).toBeLessThan(6);expect(thin.asked?.size).toBe(6);expect(thin.asked?.blocker.code).toBe('MEMORY_THEME_SHORT')}
 })
 it('an unreadable size falls back to the biggest wall; peek defaults to allowed',()=>{
  const plan=planMemory(hapoel,{seed:1,cursor:0,size:'9'});expect(plan.selected.size).toBe(6);expect(plan.selected.peek).toBe(true)
  expect(planMemory(hapoel,{seed:1,cursor:0,peek:false}).selected.peek).toBe(false)
 })
 it('a club with no memory pool at all answers with a blocker and no wall',()=>{
  const plan=planMemory({...hapoel,identity:{...hapoel.identity,id:'nobody'},memory:[]},{seed:1,cursor:0})
  expect(plan.deal).toBeNull();expect(plan.blocker?.code).toBe('MEMORY_POOL_SHORT');expect(plan.sizes.every(s=>!s.available)).toBe(true)
 })
})

describe('Gate 6 · ME-R12 the wall names nothing before a pair is matched',()=>{
 const archiveIds=(c:ClubData)=>c.memory.map(m=>m.pair)
 it('card ids are positions and pair ids are opaque keys, each on exactly two cards',()=>{
  const d=dealt(dealMemory(hapoel,{size:6,seed:42,cursor:0}))
  expect(d.deal.cards.map(c=>c.id)).toEqual(Array.from({length:12},(_,i)=>`c${i}`))
  const counts=new Map<string,number>();for(const c of d.deal.cards)counts.set(c.pair,(counts.get(c.pair)??0)+1)
  expect([...counts.values()].every(n=>n===2)).toBe(true);expect([...counts.keys()].every(k=>/^[0-9a-f]{14}$/.test(k))).toBe(true)
 })
 it('nothing in what is handed to the browser contains an archive id, a relation type or the archive sentence',()=>{
  for(const club of [hapoel,olympiacos]){
   const plan=planMemory(club,{seed:42,cursor:0}),json=JSON.stringify(plan)
   for(const id of archiveIds(club).slice(0,400))expect(json.includes(id)).toBe(false)
   for(const type of ['trophy-season','goal-year','moment-year','moment-date','tie-season','crest-years','maker-span','candidate-votes'])expect(json.includes(`"${type}"`)).toBe(false)
   const facts=club.memory.map(m=>m.fact).filter((f):f is string=>!!f&&f.length>20)
   for(const f of facts.slice(0,200))expect(json.includes(f)).toBe(false)
  }
 })
 it('the opaque key is stable per club and pair, and differs between clubs',()=>{
  expect(pairKey('a','p1')).toBe(pairKey('a','p1'));expect(pairKey('a','p1')).not.toBe(pairKey('b','p1'));expect(pairKey('a','p1')).not.toBe(pairKey('a','p2'))
 })
 it('the reveal answers only for two positions that really are a pair, with the relation and (where the archive holds it) the entry and source',()=>{
  const d=dealt(dealMemory(olympiacos,{size:6,seed:42,cursor:0}))
  const first=d.deal.cards[0]!,mate=d.deal.cards.findIndex((c,i)=>i!==0&&c.pair===first.pair),stranger=d.deal.cards.findIndex(c=>c.pair!==first.pair)
  const ok=revealOf(olympiacos,{size:6,seed:42,cursor:0,i:0,j:mate,lang:'en'})!
  expect(ok.type).toBe('moment-date');expect(ok.key).toBe(first.pair);expect(ok.href).toMatch(/^\/clubs\/olympiacos\/archive\?event=/)
  expect(ok.source).not.toBeNull();expect(ok.source!.publisher.length).toBeGreaterThan(0)
  expect(revealOf(olympiacos,{size:6,seed:42,cursor:0,i:0,j:stranger,lang:'en'})).toBeNull()
  expect(revealOf(olympiacos,{size:6,seed:42,cursor:0,i:0,j:0,lang:'en'})).toBeNull()
  expect(revealOf(olympiacos,{size:6,seed:42,cursor:0,i:0,j:99,lang:'en'})).toBeNull()
 })
 it('a Hapoel pair reveals its relation and the archive sentence it holds, and no invented link when the archive has no entry',()=>{
  const d=dealt(dealMemory(hapoel,{size:6,seed:42,cursor:0}))
  for(let k=0;k<d.deal.pairs.length;k++){
   const key=d.deal.pairs[k]!.id,at=d.deal.cards.map((c,i)=>c.pair===key?i:-1).filter(i=>i>=0)
   const r=revealOf(hapoel,{size:6,seed:42,cursor:0,i:at[0]!,j:at[1]!,lang:'he'})!
   const cand=d.pairs.find(c=>pairKey('hapoel-tel-aviv',c.pair)===key)!
   expect(r.type).toBe(cand.type);expect(r.fact).toBe(cand.fact??null)
   if(r.href===null)expect(r.source).toBeNull()
  }
 })
})
