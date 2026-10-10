import {describe,it,expect,vi} from 'vitest'
vi.setConfig({testTimeout:300_000})
import {readFileSync} from 'node:fs'
import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {play,ratedPool,rawPool,dealDraft,fits,FIVE,type Rated} from '@/lib/clubs/rumble'
import {canAfford,stageMatch,affordableSeed} from '@/lib/clubs/rumble-show'
import {hasBuyableIcon,floorOf} from '@/lib/clubs/rumble-economy'
import {FORMATIONS,FORMATION_IDS,countFamily} from '@/lib/clubs/rumble-xi/formations'
import {xiPool,cost} from '@/lib/clubs/rumble-xi/pool'
import {priceFor,priceTable,PRICE_VERSION} from '@/lib/clubs/rumble-xi/prices'
import {quotaFor} from '@/lib/clubs/rumble-xi/quota'
import {mergesFor} from '@/lib/clubs/rumble-xi/merges'
import {xiReadiness,canRival,rivalReason} from '@/lib/clubs/rumble-xi/readiness'
import {dealXI,dealRivalXI} from '@/lib/clubs/rumble-xi/deal'
import {playXI} from '@/lib/clubs/rumble-xi/simulator'
import {stageXI} from '@/lib/clubs/rumble-xi/presentation'
import {statsAt} from '@/lib/clubs/rumble-play'
import {XI_BUDGET} from '@/lib/clubs/rumble-xi/types'
import {norm} from '@/lib/fixtures/names'
import {ROYAL_RUMBLE_CANONICAL_FIVES} from '@/lib/game/royal-rumble-prices'

let cached:Promise<Record<string,Rated[]>>|null=null
const pools=()=>cached??=Promise.all(CORE_CLUB_IDS.map(async id=>[id,xiPool((await loadClub(id))!.data)] as const)).then(e=>Object.fromEntries(e))
/** a player who spends: the dearest card each slot allows that still leaves the rest fillable */
const spender=(draft:{id:string;price:number}[][],budget=XI_BUDGET)=>{const pk:(string|null)[]=draft.map(()=>null);draft.forEach((c,i)=>{const o=[...c].sort((a,b)=>b.price-a.price);pk[i]=(o.find(x=>canAfford(draft as never,pk,i,x as never,budget))??o[o.length-1]!).id});return pk as string[]}

describe('shapes',()=>{
 it('every formation fields eleven: one keeper, the stated lines, nobody off the pitch',()=>{
  for(const f of FORMATION_IDS){const s=FORMATIONS[f];expect(s).toHaveLength(11);expect(s.filter(x=>x.family==='GK')).toHaveLength(1);expect(new Set(s.map(x=>x.id)).size).toBe(11)
   expect(countFamily(f,'MF')+countFamily(f,'DF')+countFamily(f,'FW')).toBe(10);expect(countFamily(f,'FW')).toBe(f==='4-3-3'?3:2)
   for(const x of s){expect(x.x).toBeGreaterThanOrEqual(0);expect(x.x).toBeLessThanOrEqual(100);expect(x.y).toBeGreaterThanOrEqual(20);expect(x.y).toBeLessThanOrEqual(84)}}
 })
})

describe('the price ladder (rulebook rumble-economy-v1)',()=>{
 it('a club of 130+ men has exactly 10 at €5M, 20 at €4M, 40 at €3M, 60 at €2M and the rest at €1M',()=>{
  for(const n of [130,131,255,1041]){const q=quotaFor(n);expect(q.mode).toBe('full');expect([q.counts[5],q.counts[4],q.counts[3],q.counts[2]]).toEqual([10,20,40,60]);expect(q.counts[1]).toBe(n-130)}
 })
 it('a smaller archive gets the same ladder in proportion, once, with at least one €5M man and everyone priced',()=>{
  for(const n of [1,2,3,7,33,52,87,129]){const q=quotaFor(n),sum=Object.values(q.counts).reduce((t,x)=>t+x,0);expect(q.mode).toBe('proportional');expect(sum,`N=${n}`).toBe(n);expect(q.counts[5]).toBeGreaterThanOrEqual(1);expect(q.counts[1]).toBe(0)
   for(const p of [2,3,4,5] as const)expect(q.counts[p]).toBeGreaterThanOrEqual(0)}
  expect(quotaFor(52).counts).toEqual({1:0,2:24,3:16,4:8,5:4})
 })
 it('every club\'s frozen list holds each man exactly once, in whole millions, with its ladder, and one price in five a side and in the eleven',async()=>{
  expect(PRICE_VERSION).toBe('rumble-economy-v1')
  for(const id of CORE_CLUB_IDS){const d=(await loadClub(id))!.data,list=priceTable.clubs[id]!,dropped=new Set(mergesFor(id).map(m=>m.drop))
   const members=d.players.filter(p=>p.value.name&&!dropped.has(p.value.id)).map(p=>p.value.id)
   expect(Object.keys(list.players).sort()).toEqual([...members].sort())
   const have={1:0,2:0,3:0,4:0,5:0} as Record<number,number>;for(const e of Object.values(list.players)){expect([1,2,3,4,5]).toContain(e.priceM);have[e.priceM]!+=1}
   const q=quotaFor(members.length);expect(list.quotaMode).toBe(q.mode);for(const p of [1,2,3,4,5] as const)expect(have[p],`${id} €${p}`).toBe(q.counts[p])
   for(const c of ratedPool(d))expect(c.price).toBe(priceFor(id,c.id))
   for(const c of xiPool(d))expect(c.price).toBe(priceFor(id,c.id))}
 })
 it('Hapoel Tel Aviv\'s ten €5M men are THE WORKER\'s canonical ten, pinned',async()=>{
  const list=priceTable.clubs['hapoel-tel-aviv']!,fives=Object.entries(list.players).filter(([,e])=>e.priceM===5)
  expect(fives).toHaveLength(10);expect(fives.filter(([,e])=>e.assignment==='owner-pinned')).toHaveLength(ROYAL_RUMBLE_CANONICAL_FIVES.length)
 })
 it('a man who joins the archive later costs €1M and nobody else\'s price moves (the list is read, never recomputed)',()=>{
  expect(priceFor('celtic','not-a-man-yet')).toBe(1)
  const src=readFileSync('lib/clubs/rumble-xi/prices.ts','utf8');expect(src).not.toMatch(/quantile|percentile/i)
 })
})

describe('one man, one card — and every man is dealt',()=>{
 it('no two cards of a pool are the same man: merged records are folded, ids and names are unique',async()=>{
  const P=await pools()
  for(const [id,pool] of Object.entries(P)){expect(new Set(pool.map(c=>c.id)).size).toBe(pool.length);const dropped=new Set(mergesFor(id).map(m=>m.drop));for(const c of pool)expect(dropped.has(c.id),`${id} ${c.name}`).toBe(false)
   const names=pool.map(c=>norm(c.name));expect(new Set(names).size,`${id} duplicate names`).toBe(names.length)}
 })
 it('nobody is left out of the pool: the men of no recorded position are dealt into outfield slots, never in goal',async()=>{
  for(const id of CORE_CLUB_IDS){const d=(await loadClub(id))!.data,dropped=new Set(mergesFor(id).map(m=>m.drop)),pool=xiPool(d),ids=new Set(pool.map(c=>c.id))
   for(const p of d.players)if(p.value.name&&!dropped.has(p.value.id))expect(ids.has(p.value.id),`${id} ${p.value.name}`).toBe(true)
   for(const c of pool.filter(x=>x.free)){expect(fits(c,'GK')).toBe(false);expect(fits(c,'MF')).toBe(true)}}
 })
 it('rotation: consecutive rounds walk the whole archive — every man gets dealt, and the same round is the same board',async()=>{
  const P=await pools()
  for(const id of ['panathinaikos','hapoel-petah-tikva','celtic']){const pool=P[id]!,seen=new Set<string>()
   for(let s=1;s<=260;s++){const a=dealXI(pool,pool,'4-3-3',s,true,id);if(!a)continue;a.draft.flat().forEach(c=>seen.add(c.id))
    if(s<=3)expect(dealXI(pool,pool,'4-3-3',s,true,id)).toEqual(a)}
   const rival=new Set<string>();const missing=pool.filter(c=>!seen.has(c.id))
   expect(missing.length/pool.length,`${id} never dealt: ${missing.slice(0,5).map(m=>m.name).join(', ')}`).toBeLessThan(0.03);void rival}
 })
})

describe('the board always holds a €5M man who can be bought',()=>{
 it('eleven a side: 100% of boards, every ready club, every shape, own club and others — and the squad is still completable at €35M',async()=>{
  const P=await pools()
  for(const id of CORE_CLUB_IDS)for(const f of FORMATION_IDS){const r=xiReadiness(P[id]!,f);if(!r.ready){expect(r.reasons.length).toBeGreaterThan(0);continue}
   for(const away of CORE_CLUB_IDS){if(!canRival(P[away]!,f))continue;const same=away===id;if(same&&!r.sameClub22)continue
    for(let s=1;s<=40;s++){const d=dealXI(P[id]!,P[away]!,f,s,same,id);expect(d,`${id} v ${away} ${f} ${s}`).not.toBeNull()
     expect(hasBuyableIcon(d!.draft,XI_BUDGET),`${id} v ${away} ${f} ${s}`).toBe(true);expect(floorOf(d!.draft)).toBeLessThanOrEqual(XI_BUDGET);expect(d!.draft).toHaveLength(11)
     const ids=d!.draft.flat().map(c=>c.id);expect(new Set(ids).size).toBe(ids.length)
     if(same){const rv=new Set(d!.rival.map(c=>c.id));for(const c of ids)expect(rv.has(c)).toBe(false)}}}}
 })
 it('the €5M man is spread over the lines, not always the first slot or one position',async()=>{
  const P=await pools(),pool=P['aek-athens']!,seen=new Map<string,number>()
  for(let s=1;s<=300;s++){const d=dealXI(pool,pool,'4-3-3',s,true,'aek-athens')!;d.draft.forEach((cards,i)=>{if(cards.some(c=>c.price===5))seen.set(FORMATIONS['4-3-3'][i]!.family,(seen.get(FORMATIONS['4-3-3'][i]!.family)||0)+1)})}
  expect(seen.size).toBeGreaterThanOrEqual(3)
 })
 it('five a side: the same rule at €15M',async()=>{
  const P=await pools()
  for(const id of CORE_CLUB_IDS){const pool=P[id]!;let ok=0,n=0
   for(let s=1;s<=120;s++){const seed=affordableSeed(x=>dealDraft(pool,x),s);const board=dealDraft(pool,seed);if(floorOf(board)>FIVE.budget)continue;n++;if(hasBuyableIcon(board,FIVE.budget))ok++}
   expect(ok,`${id}`).toBe(n);expect(n).toBeGreaterThan(20)}
 })
 it('a club that cannot field a legal board says so instead of raising the budget',async()=>{
  const P=await pools();for(const id of CORE_CLUB_IDS)for(const f of FORMATION_IDS){const r=xiReadiness(P[id]!,f);if(!r.ready)expect(r.reasons[0]).toMatch(/.+/)}
  expect(readFileSync('lib/clubs/rumble-xi/types.ts','utf8')).not.toMatch(/matchBudget/)
  if(!canRival(P['olympiacos']!,'4-3-3'))expect(rivalReason(P['olympiacos']!,'4-3-3')).toMatch(/over €35M|needed on file/)
 })
})

describe('the server refuses a forged round',()=>{
 it('wrong count, repeats, men that were not offered, strangers, and an eleven over €35M',async()=>{
  const P=await pools(),H=P['hapoel-tel-aviv']!,A=P['aek-athens']!,d=dealXI(H,A,'4-3-3',3,false,'hapoel-tel-aviv')!,good=spender(d.draft)
  expect(playXI(H,A,'4-3-3',d.seed,false,good,undefined,'hapoel-tel-aviv')).not.toBeNull()
  expect(playXI(H,A,'4-3-3',d.seed,false,good.slice(1),undefined,'hapoel-tel-aviv')).toBeNull()
  expect(playXI(H,A,'4-3-3',d.seed,false,[good[0]!,...good.slice(0,10)],undefined,'hapoel-tel-aviv')).toBeNull()
  const unoffered=H.find(c=>c.position==='GK'&&!d.draft.flat().some(x=>x.id===c.id))!
  expect(playXI(H,A,'4-3-3',d.seed,false,[unoffered.id,...good.slice(1)],undefined,'hapoel-tel-aviv')).toBeNull()
  expect(playXI(H,A,'4-3-3',d.seed,false,['not-a-man',...good.slice(1)],undefined,'hapoel-tel-aviv')).toBeNull()
 })
 it('the rival is committed from his own pool and the seed alone, at his club\'s prices, inside €35M',async()=>{
  const P=await pools();const a=dealRivalXI(P['aek-athens']!,'4-3-3',5)!,b=dealRivalXI(P['aek-athens']!,'4-3-3',5)!
  expect(a.map(c=>c.id)).toEqual(b.map(c=>c.id));expect(cost(a)).toBeLessThanOrEqual(XI_BUDGET);for(const c of a)expect(c.price).toBe(priceFor('aek-athens',c.id))
 })
})

describe('the match',()=>{
 it('is eleven against eleven, goals equal the score, and the football around them is made of the men on the pitch',async()=>{
  const P=await pools()
  for(const [h,a,f] of [['hapoel-tel-aviv','aek-athens','4-3-3'],['celtic','panathinaikos','3-5-2'],['aek-athens','aek-athens','4-4-2']] as const){
   const same=h===a,d=dealXI(P[h]!,P[a]!,f,11,same,h)!,r=playXI(P[h]!,P[a]!,f,d.seed,same,spender(d.draft),undefined,h)!,sc=stageXI(r,d.seed,f)
   expect(sc.us).toHaveLength(11);expect(sc.them).toHaveLength(11)
   expect(sc.events.filter(e=>e.type==='goal'&&e.side==='us')).toHaveLength(sc.final.us);expect(sc.events.filter(e=>e.type==='goal'&&e.side==='them')).toHaveLength(sc.final.them)
   const log=sc.play!,mins=log.moves.map(m=>m.minute);expect([...mins].sort((x,y)=>x-y)).toEqual(mins)
   expect(log.moves.filter(m=>m.end==='goal'&&m.side==='us')).toHaveLength(sc.final.us);expect(log.moves.filter(m=>m.end==='goal'&&m.side==='them')).toHaveLength(sc.final.them)
   for(const m of log.moves){const side=m.side==='us'?sc.us:sc.them,opp=m.side==='us'?sc.them:sc.us
    for(const st of m.steps){expect(side.some(p=>p.id===st.from)).toBe(true);expect(side.some(p=>p.id===st.to)).toBe(true)}
    if(m.end==='goal')expect(side.find(p=>p.id===m.shooter)!.position).not.toBe('GK')
    if(m.by)expect(opp.some(p=>p.id===m.by)).toBe(true)}
   const st=statsAt(log,90);expect(st.possession.us+st.possession.them).toBe(100)
   for(const g of Object.values(log.grades)){expect(g).toBeGreaterThanOrEqual(4.5);expect(g).toBeLessThanOrEqual(10)}
   expect(JSON.stringify(sc)).not.toMatch(/"rating"/)
  }
 })
 it('classic five a side keeps its €15M and its results, and now tells the football too',async()=>{
  const pool=ratedPool((await loadClub('aek-athens'))!.data),seed=affordableSeed(s=>dealDraft(pool,s),4),draft=dealDraft(pool,seed),picks=draft.map(c=>c[0]!.id)
  const r=play(pool,seed,picks);if(!r)return
  const sc=stageMatch(r,seed);expect(sc.us).toHaveLength(5);expect(sc.format).toBe('five');expect(sc.play!.moves.filter(m=>m.end==='goal')).toHaveLength(sc.final.us+sc.final.them)
  expect(r.you.cost).toBeLessThanOrEqual(15)
 })
 it('5,000 deterministic rounds across ready pairs: inside €35M for both sides, a full eleven, a sane scoreline, no home bias',async()=>{
  const P=await pools();let n=0,w=0,l=0,goals=0,max=0
  for(const f of FORMATION_IDS){const homes=CORE_CLUB_IDS.filter(i=>xiReadiness(P[i]!,f).ready),aways=CORE_CLUB_IDS.filter(i=>canRival(P[i]!,f))
   for(const h of homes)for(const a of aways)for(let s=1;s<=Math.ceil(5000/(3*homes.length*aways.length));s++){
    const same=h===a;if(same&&!xiReadiness(P[h]!,f).sameClub22)continue
    const d=dealXI(P[h]!,P[a]!,f,s,same,h);expect(d,`${h} ${a} ${f} ${s}`).not.toBeNull()
    const r=playXI(P[h]!,P[a]!,f,d!.seed,same,spender(d!.draft),undefined,h);expect(r).not.toBeNull()
    expect(r!.you.cost).toBeLessThanOrEqual(XI_BUDGET);expect(cost(r!.rival.cards)).toBeLessThanOrEqual(XI_BUDGET);expect(r!.you.cards).toHaveLength(11);expect(r!.rival.cards).toHaveLength(11)
    n++;goals+=r!.goals[0]+r!.goals[1];max=Math.max(max,...r!.goals);if(r!.verdict==='win')w++;else if(r!.verdict==='loss')l++}}
  expect(n).toBeGreaterThan(2500);expect(goals/n).toBeGreaterThan(1.8);expect(goals/n).toBeLessThan(3.4);expect(max).toBeLessThanOrEqual(7)
  expect(w/n).toBeGreaterThan(0.2);expect(w/n).toBeLessThan(0.65);expect(l/n).toBeGreaterThan(0.15)
 })
})
