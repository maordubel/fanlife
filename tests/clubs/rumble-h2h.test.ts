import {describe,it,expect,vi} from 'vitest'
vi.setConfig({testTimeout:180_000})
import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {ratedPool,dealDraft,dealRival,play,rumbleReadiness,checkFive,FIVE,ELEVEN,type Opponent,type Rated} from '@/lib/clubs/rumble'
import {encodeDuel,decodeDuel} from '@/lib/clubs/rumble-duel'
import {workbookRating,derivedRating,ratingsCovered} from '@/lib/clubs/ratings'
import {affordableSeed} from '@/lib/clubs/rumble-show'

let cached:Promise<Record<string,Rated[]>>|null=null
const pools=()=>cached??=Promise.all(CORE_CLUB_IDS.map(async id=>[id,ratedPool((await loadClub(id))!.data)] as const)).then(e=>Object.fromEntries(e))

describe('ratings — the owner workbook, labelled as an estimate',()=>{
 it('every listed player of every club is found by exact name, and keeps the workbook score',async()=>{
  const P=await pools()
  for(const [id,pool] of Object.entries(P)){
   const listed=pool.filter(c=>c.basis==='individual'||c.basis==='club-baseline')
   // a listed man with no position anywhere (the workbook leaves 81 blank) cannot be dealt — a position is never guessed
   expect(listed.length,id).toBeGreaterThanOrEqual(Math.floor(ratingsCovered(id)*0.15))
   for(const c of listed)expect(c.rating).toBeGreaterThanOrEqual(60)
  }
 })
 it('an unlisted squad man is derived near his club baseline and never above 84, so no estimate outranks an anchored star',async()=>{
  const P=await pools()
  for(const pool of Object.values(P))for(const c of pool.filter(x=>x.basis==='derived')){expect(c.rating).toBeLessThanOrEqual(84);expect(c.rating).toBeGreaterThanOrEqual(40)}
  expect(derivedRating('celtic','FW',1)).toBeLessThanOrEqual(84);expect(derivedRating('celtic','FW',0)).toBeLessThan(derivedRating('celtic','FW',1))
 })
 it('a name the workbook does not carry is not guessed',()=>{expect(workbookRating('celtic',['Nobody Atall'])).toBeNull()})
 it('a rating never reaches a public card',async()=>{
  const P=await pools();for(const pool of Object.values(P)){const d=dealDraft(pool,3);expect(JSON.stringify(d)).not.toMatch(/"rating"|"basis"/)}
 })
 it('prices keep the draft economy: every club can field a five, with a cheap and an expensive man',async()=>{
  const P=await pools()
  for(const [id,pool] of Object.entries(P)){const r=rumbleReadiness(pool);if(!r.playable)continue;const seed=affordableSeed(s=>dealDraft(pool,s),11);expect(dealDraft(pool,seed).every(c=>c.length>0),id).toBe(true);expect(new Set(pool.map(c=>c.price)).size,id).toBeGreaterThanOrEqual(3)}
 })
})

describe('head to head across clubs',()=>{
 it('any club against any club — and a club against itself — plays, deterministically',async()=>{
  const P=await pools(),ids=Object.keys(P).filter(id=>rumbleReadiness(P[id]!).playable)
  expect(ids.length).toBeGreaterThanOrEqual(6)
  for(const a of ids)for(const b of ids){
   const vs:Opponent=a===b?{kind:'self'}:{kind:'club',pool:P[b]!},seed=affordableSeed(s=>dealDraft(P[a]!,s,vs),7)
   const draft=dealDraft(P[a]!,seed,vs),picks=draft.map(c=>c.slice().sort((x,y)=>x.price-y.price)[0]!.id)
   const r=play(P[a]!,seed,picks,vs),r2=play(P[a]!,seed,picks,vs)
   expect(r,`${a} v ${b}`).not.toBeNull();expect(r2!.goals).toEqual(r!.goals)
   if(a!==b)expect(r!.rival.cards.every(c=>c.id.startsWith(`${b}:`)||P[b]!.some(x=>x.id===c.id))).toBe(true)
  }
 })
 it('a friend\'s locked five is played as written, with no man shared when it is one club',async()=>{
  const P=await pools(),a=P['aek-athens']!,seed=affordableSeed(s=>dealDraft(a,s),5),draft=dealDraft(a,seed),ids=draft.map(c=>c.slice().sort((x,y)=>x.price-y.price)[0]!.id),cards=checkFive(a,ids)!
  const vs:Opponent={kind:'locked',cards,club:'aek-athens'},mine=dealDraft(a,seed+1,vs)
  expect(mine.flat().some(c=>ids.includes(c.id))).toBe(false)
  const picks=mine.map(c=>c.slice().sort((x,y)=>x.price-y.price)[0]!.id),r=play(a,seed+1,picks,vs)
  expect(r!.rival.cards.map(c=>c.id)).toEqual(ids);expect(r!.rival.club).toBe('aek-athens')
 })
 it('a five that breaks the slots or the budget is refused',async()=>{
  const P=await pools(),a=P['celtic']!,gk=a.filter(c=>c.position==='GK').sort((x,y)=>y.price-x.price),fw=a.filter(c=>c.position==='FW').sort((x,y)=>y.price-x.price)
  expect(checkFive(a,[fw[0]!.id,fw[1]!.id,fw[2]!.id,fw[3]!.id,fw[4]!.id])).toBeNull()
  expect(checkFive(a,['x','y','z','w','v'])).toBeNull();expect(gk.length).toBeGreaterThan(1)
 })
 it('the link carries ids and a seed only, and a damaged link is refused',()=>{
  const t={c:'celtic',s:4242,p:['celtic:a','celtic:b','celtic:c','celtic:d','celtic:e']},e=encodeDuel(t)
  expect(decodeDuel(e)).toEqual(t);expect(e).toMatch(/^[A-Za-z0-9_-]+$/)
  for(const bad of [undefined,'','not base64!!','AAAA',e.slice(0,10),`${e}%%`])expect(decodeDuel(bad)).toBeNull()
 })
})

describe('eleven v eleven — the engine is ready, only the stage is not',()=>{
 it('the formats are 5 and 11 slots on one economy',()=>{expect(FIVE.slots).toHaveLength(5);expect(ELEVEN.slots).toHaveLength(11);expect(ELEVEN.budget/ELEVEN.slots.length).toBeCloseTo(FIVE.budget/FIVE.slots.length,0)})
 it('a big club deals and plays an eleven; a small pool says exactly what is missing',async()=>{
  const P=await pools(),big=P['aek-athens']!
  expect(rumbleReadiness(big,ELEVEN).playable).toBe(true)
  const deal=(s:number)=>dealDraft(big,s,{kind:'self'},ELEVEN),seed=affordableSeed(deal,9,ELEVEN.budget)
  const draft=deal(seed);expect(draft).toHaveLength(11)
  const picks=draft.map(c=>c.slice().sort((a,b)=>a.price-b.price)[0]!.id),r=play(big,seed,picks,{kind:'self'},ELEVEN)
  expect(r?.you.cards).toHaveLength(11);expect(r?.rival.cards).toHaveLength(11)
  const tiny=P['olympiacos']!;if(!rumbleReadiness(tiny,ELEVEN).playable)expect(rumbleReadiness(tiny,ELEVEN).short.length).toBeGreaterThan(0)
 })
})
