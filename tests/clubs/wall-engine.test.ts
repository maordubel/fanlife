import {describe,expect,it} from 'vitest'
import {DUEL_COUNT,MAX_DAMAGE,NO_MERCY_ROUNDS,QUEUE_LENGTH,REVENGE_WINDOW,WALL_MIN_CANDIDATES,choose,damageOf,dealWall,distinctCandidates,duelOf,endingOf,over,revenge,revengeChoices,startWall,streakOf,wallAvailability,wallCode,type Wall,type WallCandidate} from '@/lib/clubs/wall-engine'

const pool=(n:number,ranked=false):WallCandidate[]=>Array.from({length:n},(_,i)=>({id:`c${String(i).padStart(2,'0')}`,name:`Candidate ${i}`,...(ranked?{rank:i+1}:{})}))
const fresh=(n=12,ranked=false,seed=3)=>{const deal=dealWall(pool(n,ranked),seed,0);if(!deal)throw new Error('no deal');return {deal,wall:startWall(deal)}}
/** always keep the challenger */
const playAll=(w:Wall,pick:(d:NonNullable<ReturnType<typeof duelOf>>)=>string)=>{let wall=w;for(let i=0;i<20&&!over(wall);i+=1){const d=duelOf(wall);if(!d)break;wall=choose(wall,pick(d))}return wall}

describe('HW-R01 candidates',()=>{
 it('needs ten distinct approved candidates',()=>{
  expect(WALL_MIN_CANDIDATES).toBe(10)
  expect(wallAvailability(pool(9))).toEqual({playable:false,have:9,need:10,blocker:'WALL_CANDIDATES_SHORT'})
  expect(wallAvailability(pool(10)).playable).toBe(true)
  expect(dealWall(pool(9),1)).toBeNull()
 })
 it('the same candidate under another id or another spelling of the name is one',()=>{
  const dup=[...pool(9),{id:'x',name:'candidate 3'},{id:'c03',name:'Other'},{id:'',name:'Blank'},{id:'y',name:' '}]
  expect(distinctCandidates(dup).length).toBe(9)
  expect(wallAvailability(dup).playable).toBe(false)
 })
 it('deals exactly holder + eight challengers + one spare, all distinct, deterministically',()=>{
  const {deal}=fresh(15)
  expect(deal.order.length).toBe(QUEUE_LENGTH)
  expect(QUEUE_LENGTH).toBe(DUEL_COUNT+2)
  expect(new Set(deal.order).size).toBe(10)
  expect(dealWall(pool(15),3,0)).toEqual(dealWall(pool(15),3,0))
  expect(dealWall(pool(15),3,1)?.order).not.toEqual(dealWall(pool(15),3,0)?.order)
 })
})

describe('HW-R02 either side can win, exactly once per round',()=>{
 it('the holder can win and the challenger can win',()=>{
  const {wall}=fresh()
  const d=duelOf(wall)!
  const a=choose(wall,d.holder),b=choose(wall,d.challenger)
  expect(a.holder).toBe(d.holder);expect(a.out).toEqual([d.challenger])
  expect(b.holder).toBe(d.challenger);expect(b.out).toEqual([d.holder])
  expect(a.picks.length).toBe(1);expect(b.picks.length).toBe(1)
 })
 it('a third party cannot win and a finished wall does not change',()=>{
  const {wall}=fresh()
  expect(choose(wall,'nobody')).toBe(wall)
  const done=playAll(wall,d=>d.holder)
  expect(over(done)).toBe(true)
  expect(choose(done,done.holder)).toBe(done)
  expect(done.picks.length).toBe(DUEL_COUNT)
 })
 it('every round is recorded with the winner and the loser',()=>{
  const done=playAll(fresh().wall,d=>d.challenger)
  expect(done.picks.map(p=>p.round)).toEqual([1,2,3,4,5,6,7,8])
  for(const p of done.picks)expect(p.winner).not.toBe(p.loser)
 })
})

describe('HW-R03 streak damage',()=>{
 it('counts the holder\'s consecutive wins and caps the damage at five',()=>{
  const done=playAll(fresh().wall,d=>d.holder)
  expect(streakOf(done)).toBe(8)
  expect(damageOf(8)).toBe(MAX_DAMAGE)
  expect(damageOf(5)).toBe(5);expect(damageOf(3)).toBe(3);expect(damageOf(0)).toBe(0);expect(damageOf(-2)).toBe(0)
 })
 it('a new holder starts the streak again',()=>{
  const w0=fresh().wall
  const w1=choose(w0,duelOf(w0)!.holder),w2=choose(w1,duelOf(w1)!.holder)
  expect(streakOf(w2)).toBe(2)
  const w3=choose(w2,duelOf(w2)!.challenger)
  expect(streakOf(w3)).toBe(1)
 })
})

describe('HW-R04 revenge',()=>{
 const after=(n:number)=>{let w=fresh(12).wall;for(let i=0;i<n;i+=1)w=choose(w,duelOf(w)!.holder);return w}
 it('is unavailable before anyone is torn down',()=>expect(revengeChoices(fresh().wall)).toEqual([]))
 it('offers at most the last six torn down, newest first',()=>{
  const w=after(8-1)
  expect(w.out.length).toBe(7)
  const c=revengeChoices(w)
  expect(c.length).toBe(REVENGE_WINDOW)
  expect(c[0]).toBe(w.out[6])
 })
 it('reinserts at the queue head without losing the pending challenger',()=>{
  const w=after(3)
  const pending=duelOf(w)!.challenger,back=w.out[2] as string
  const r=revenge(w,back)
  expect(duelOf(r)!.challenger).toBe(back)
  expect(r.queue[1]).toBe(pending)
  expect(r.queue.length).toBe(w.queue.length+1)
  expect(r.out).not.toContain(back)
  expect(r.revengeUsed).toBe(true)
  expect(new Set([...r.queue,...r.out,r.holder]).size).toBe(r.queue.length+r.out.length+1)
 })
 it('only once per run — repeated requests do not mint another',()=>{
  const w=after(4),first=revenge(w,w.out[3] as string)
  expect(revengeChoices(first)).toEqual([])
  const twice=revenge(first,first.out[0] as string)
  expect(twice).toBe(first)
  const spent=choose(first,duelOf(first)!.holder)
  expect(spent.picks.filter(p=>p.revenge).length).toBe(1)
  expect(revenge(spent,spent.out[0] as string)).toBe(spent)
 })
 it('only an eligible recently-eliminated candidate, and never after the finish',()=>{
  const w=after(4)
  expect(revenge(w,'c-not-there')).toBe(w)
  expect(revenge(w,w.holder)).toBe(w)
  const done=playAll(fresh().wall,d=>d.holder)
  expect(revengeChoices(done)).toEqual([])
  const old=playAll(fresh(14).wall,d=>d.holder)
  expect(revenge(old,old.out[0] as string)).toBe(old)
 })
 it('the run still ends after eight picks when the spare is pushed back',()=>{
  const w=after(2),r=revenge(w,w.out[0] as string),done=playAll(r,d=>d.holder)
  expect(done.picks.length).toBe(DUEL_COUNT)
  expect(over(done)).toBe(true)
 })
})

describe('HW-R05 special rounds and curated ordering',()=>{
 it('rounds 4 and 7 are the no-mercy rounds',()=>{
  expect(NO_MERCY_ROUNDS).toEqual([4,7])
  const {wall}=fresh(12,true)
  const done=playAll(wall,d=>d.holder)
  expect(done.picks.filter(p=>p.noMercy).map(p=>p.round)).toEqual([4,7])
 })
 it('with a curated ranking the special challengers come from the curated top twelve',()=>{
  for(let seed=1;seed<=20;seed+=1){
   const rows=pool(30,true),deal=dealWall(rows,seed,0)!
   expect(deal.curated).toBe(true)
   expect(deal.noMercy.length).toBe(2)
   for(const id of deal.noMercy)expect(rows.find(r=>r.id===id)!.rank!).toBeLessThanOrEqual(12)
   expect(deal.order[4]).toBe(deal.noMercy[0]);expect(deal.order[7]).toBe(deal.noMercy[1])
   expect(new Set(deal.order).size).toBe(10)
  }
 })
 it('without ranks nothing claims to be ranked',()=>{
  const deal=dealWall(pool(12),4,0)!
  expect(deal.curated).toBe(false)
  const e=endingOf(pool(12),playAll(startWall(deal),d=>d.holder),4,0)!
  expect(e.editorsPick).toBeNull()
 })
})

describe('HW-R06/R07 ending',()=>{
 it('reports the final holder, eight choices, revenge state and a local code',()=>{
  const rows=pool(12,true),deal=dealWall(rows,9,0)!
  let w=startWall(deal)
  w=choose(w,duelOf(w)!.holder);w=choose(w,duelOf(w)!.holder)
  w=revenge(w,w.out[0] as string)
  const done=playAll(w,d=>d.challenger)
  const e=endingOf(rows,done,9,0)!
  expect(e.holder.id).toBe(done.holder)
  expect(e.choices.length).toBe(8)
  expect(e.revengeUsed).toBe(true)
  expect(e.revengePick?.id).toBe(w.revengePick)
  expect(e.code).toMatch(/^WALL-[0-9A-Z]+-[0-9A-Z]{5}$/)
  expect(e.verified).toBe(false)
  expect(e.editorsPick?.rank).toBeLessThanOrEqual(12)
  expect(JSON.stringify(e)).not.toMatch(/score|hate|percent/i)
 })
 it('the code fingerprints the picks',()=>{
  const {wall}=fresh()
  const a=playAll(wall,d=>d.holder),b=playAll(wall,d=>d.challenger)
  expect(wallCode(1,0,a.picks,null)).not.toBe(wallCode(1,0,b.picks,null))
  expect(wallCode(1,0,a.picks,null)).toBe(wallCode(1,0,a.picks,null))
 })
})
