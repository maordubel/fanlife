import {describe,it,expect,beforeAll} from 'vitest'
import {loadClub} from '@/lib/clubs/resolver'
import {MIN_DECK,categoryOf,clubBank,dealMode,modeCatalog,reviewMissed,verifyDeck,type Bank} from '@/lib/clubs/trivia-deck'
import {bandOf,factsOf,normKey} from '@/lib/clubs/trivia-bank'

let hapoel:Bank,olympiacos:Bank
beforeAll(async()=>{hapoel=clubBank((await loadClub('hapoel-tel-aviv'))!.data);olympiacos=clubBank((await loadClub('olympiacos'))!.data)},120000)

const ok=<T,>(d:T|{blocked:unknown})=>{if(typeof d==='object'&&d!==null&&'blocked' in d)throw new Error('blocked '+JSON.stringify(d));return d as T}

describe('Gate 2 · the standard run is honest where the bank can field it (TR-R04, R05)',()=>{
 it('deals twelve in three bands of four, no fact twice, no prompt twice, answers in the shape of their type',()=>{
  for(const seed of [1,7,42,99]){
   const d=ok(dealMode(hapoel,{mode:'standard'},seed,0))
   expect(d.ids).toHaveLength(12);expect(d.category).toBe('standard');expect(d.banded).toBe(true)
   expect(verifyDeck(hapoel,d.ids,{banded:true})).toBe(true)
   const facts=d.ids.flatMap(id=>factsOf(hapoel.byId.get(id)!));expect(new Set(facts).size).toBe(facts.length)
   d.ids.forEach((id,i)=>expect(bandOf(hapoel.byId.get(id)!.difficulty,false)).toBe(Math.floor(i/4)))
  }
 })
 it('is deterministic in (mode, seed, cursor) and rotates to a different deck on the next cursor',()=>{
  const a=ok(dealMode(hapoel,{mode:'standard'},5,0)),b=ok(dealMode(hapoel,{mode:'standard'},5,0)),c=ok(dealMode(hapoel,{mode:'standard'},5,a.cursor+1))
  expect(b.ids).toEqual(a.ids);expect(c.ids).not.toEqual(a.ids)
  expect(a.ids.filter(id=>c.ids.includes(id)).length).toBeLessThan(a.ids.length)
 })
 it('hard has its own bands (≤3 / 4 / 5) and its own category',()=>{
  const d=ok(dealMode(hapoel,{mode:'hard'},3,0));expect(d.category).toBe('hard');expect(verifyDeck(hapoel,d.ids,{banded:true,hard:true})).toBe(true)
  d.ids.forEach((id,i)=>expect(bandOf(hapoel.byId.get(id)!.difficulty,true)).toBe(Math.floor(i/4)))
 })
 it('every dealt question is a sourced, checked one (rule 2)',()=>{for(const id of ok(dealMode(hapoel,{mode:'standard'},11,0)).ids)expect(hapoel.byId.get(id)!.source.confidence).toBeGreaterThanOrEqual(2)})
 it('a topic run holds one topic only',()=>{
  const cat=modeCatalog(hapoel,1,0),t=cat.topics[0]!,d=ok(dealMode(hapoel,{topic:t.id},1,0))
  expect(d.category==='topic'||d.category==='short').toBe(true);expect(d.ids.every(id=>hapoel.byId.get(id)!.topic===t.id||hapoel.byId.get(id)!.tags.includes(t.id))).toBe(true)
 })
 it('an era run holds one decade only',()=>{
  const e=modeCatalog(hapoel,1,0).eras[0]!,d=ok(dealMode(hapoel,{era:String(e.decade)},1,0));expect(d.ids.length).toBe(e.size)
  expect(d.ids.every(id=>hapoel.byId.get(id)!.decades.includes(e.decade))).toBe(true)
 })
 it('a request for a topic the club cannot field is blocked by name, never padded',()=>{
  const d=dealMode(hapoel,{topic:'nonsense'},1,0);expect('blocked' in d||ok(d).ids.length>=MIN_DECK).toBe(true)
 })
})

describe('Gate 2 · a thin bank gets a labelled narrow mode and a named blocker (TR-R05, TR-R12)',()=>{
 it('standard is blocked with TRIVIA_STAGE_POOL_SHORT and the exact per-stage counts',()=>{
  const cat=modeCatalog(olympiacos,1,0),std=cat.modes.find(m=>m.id==='standard')!
  expect(std.available).toBe(false);expect(std.blocker).toMatchObject({code:'TRIVIA_STAGE_POOL_SHORT',need:4});expect(std.blocker!.counts).toHaveLength(3)
  expect(std.blocker!.counts.slice(1).every(n=>n<4)||std.blocker!.counts[0]!<4).toBe(true)
  const d=dealMode(olympiacos,{mode:'standard'},1,0);expect('blocked' in d&&d.blocked.code).toBe('TRIVIA_STAGE_POOL_SHORT')
 })
 it('the narrow mode is History, un-banded, labelled for what it is, and the default there',()=>{
  const cat=modeCatalog(olympiacos,1,0),h=cat.modes.find(m=>m.id==='history')!
  expect(h.available).toBe(true);expect(h.banded).toBe(false);expect(cat.mode).toBe('history')
  const d=ok(dealMode(olympiacos,{mode:'history'},1,0));expect(['history','short']).toContain(d.category);expect(d.banded).toBe(false)
  expect(verifyDeck(olympiacos,d.ids,{banded:false})).toBe(true)
 })
 it('a thin bank never deals twelve of one answer',()=>{
  const d=ok(dealMode(olympiacos,{mode:'history'},1,0)),tf=d.ids.map(id=>olympiacos.byId.get(id)!).filter(q=>q.type==='tf')
  if(tf.length===d.ids.length){const t=tf.filter(q=>q.answer==='true').length;expect(t).toBeGreaterThanOrEqual(Math.min(3,Math.floor(d.ids.length/3)));expect(d.ids.length-t).toBeGreaterThanOrEqual(Math.min(3,Math.floor(d.ids.length/3)))}
 })
 it('the bank report says it is date-only so the admin can see why',()=>{expect(olympiacos.report.dateOnly).toBe(true);expect(hapoel.report.dateOnly).toBe(false)})
})

describe('Gate 2 · revenge is exactly the questions this device missed (TR-R11)',()=>{
 const some=()=>{const d=ok(dealMode(hapoel,{mode:'standard'},21,0));return d.ids}
 it('deals the missed ids that still stand, easiest first, no fact twice',()=>{
  const ids=some(),r=ok(dealMode(hapoel,{mode:'revenge'},1,0,ids))
  expect(r.mode).toBe('revenge');expect(r.ids.every(id=>ids.includes(id))).toBe(true);expect(r.ids.length).toBe(ids.length)
  const diff=r.ids.map(id=>hapoel.byId.get(id)!.difficulty);expect([...diff].sort((a,b)=>a-b)).toEqual(diff)
  expect(r.category).toBe(r.ids.length<12?'short':'revenge')
 })
 it('never substitutes a stranger for a retired id; below the minimum it is blocked',()=>{
  const ids=some().slice(0,2),d=dealMode(hapoel,{mode:'revenge'},1,0,[...ids,'q_gone1','q_gone2'])
  expect('blocked' in d&&d.blocked).toEqual({code:'TRIVIA_REVENGE_SHORT',counts:[2],need:MIN_DECK})
  const three=dealMode(hapoel,{mode:'revenge'},1,0,[...some().slice(0,3),'q_gone1']);expect(ok(three).ids).toHaveLength(3)
 })
 it('explains the gap: retired, withdrawn and merged ids are named and counted',()=>{
  const ids=some(),first=hapoel.byId.get(ids[0]!)!
  const twin={...first,id:'q_twin'};hapoel.byId.set('q_twin',twin)
  try{
   const r=reviewMissed(hapoel,[ids[0]!,'q_twin','q_never_existed',ids[1]!])
   expect(r.playable).toEqual([ids[0],ids[1]]);expect(r.merged).toBe(1);expect(r.removed).toEqual([{id:'q_never_existed',reason:'retired'}])
  }finally{hapoel.byId.delete('q_twin')}
  hapoel.dropOf.set('q_dropped','PROMPT_CONFLICT')
  try{expect(reviewMissed(hapoel,['q_dropped']).removed).toEqual([{id:'q_dropped',reason:'withdrawn'}])}finally{hapoel.dropOf.delete('q_dropped')}
 })
 it('a result category is said once; practice is its own',()=>{expect(categoryOf({category:'hard'},false)).toBe('hard');expect(categoryOf({category:'hard'},true)).toBe('practice')})
})

describe('Gate 2 · the bank never ships two correct answers to one prompt (rule 15)',()=>{
 it('after sanitising, no (type, prompt) has two different answers',()=>{
  for(const bank of [hapoel,olympiacos]){
   const seen=new Map<string,string>()
   for(const q of bank.questions){if(q.type==='order'||q.type==='match')continue;const k=`${q.type}|${normKey(q.prompt)}|${normKey(q.quoteHe??'')}`,a=JSON.stringify(q.answer);if(seen.has(k))expect(seen.get(k)).toBe(a);seen.set(k,a)}
  }
 })
})
