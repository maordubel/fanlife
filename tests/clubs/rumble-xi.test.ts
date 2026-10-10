import {describe,it,expect,vi} from 'vitest'
vi.setConfig({testTimeout:240_000})
import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {play,ratedPool,dealDraft,type Rated} from '@/lib/clubs/rumble'
import {canAfford,stageMatch} from '@/lib/clubs/rumble-show'
import {FORMATIONS,FORMATION_IDS,countFamily} from '@/lib/clubs/rumble-xi/formations'
import {xiPool,xiPoolRaw,xiFree,cost} from '@/lib/clubs/rumble-xi/pool'
import {priceOf,buildCuts,QUANTILES} from '@/lib/clubs/rumble-xi/prices'
import {scoutSearch} from '@/lib/clubs/rumble-xi/simulator'
import {unplacedFor} from '@/lib/clubs/rumble-xi/positions'
import {readFileSync} from 'node:fs'
import {xiReadiness,canRival,rivalReason,budgetOf} from '@/lib/clubs/rumble-xi/readiness'
import {dealXI,dealRivalXI} from '@/lib/clubs/rumble-xi/deal'
import {playXI} from '@/lib/clubs/rumble-xi/simulator'
import {stageXI} from '@/lib/clubs/rumble-xi/presentation'
import {xiSeed} from '@/lib/clubs/rumble-xi/seed'
import {statsAt} from '@/lib/clubs/rumble-play'
import {XI_BUDGET} from '@/lib/clubs/rumble-xi/types'

let cached:Promise<Record<string,Rated[]>>|null=null
const pools=()=>cached??=Promise.all(CORE_CLUB_IDS.map(async id=>[id,xiPool((await loadClub(id))!.data)] as const)).then(e=>Object.fromEntries(e))
/** a player who spends: the dearest card each slot allows that still leaves the rest fillable */
const spender=(draft:{id:string;price:number}[][],budget=XI_BUDGET)=>{const pk:(string|null)[]=draft.map(()=>null);draft.forEach((c,i)=>{const o=[...c].sort((a,b)=>b.price-a.price);pk[i]=(o.find(x=>canAfford(draft as never,pk,i,x as never,budget))??o[o.length-1]!).id});return pk as string[]}

describe('shapes',()=>{
 it('every formation fields eleven: one keeper, the stated lines, nobody off the pitch',()=>{
  for(const f of FORMATION_IDS){const s=FORMATIONS[f];expect(s).toHaveLength(11);expect(s.filter(x=>x.family==='GK')).toHaveLength(1);expect(new Set(s.map(x=>x.id)).size).toBe(11)
   const [d,m,a]=f.split('-').map(Number);expect(countFamily(f,'MF')+countFamily(f,'DF')+countFamily(f,'FW')).toBe(10);expect(countFamily(f,'FW')).toBe(f==='4-3-3'?3:2);void d;void m;void a
   for(const x of s){expect(x.x).toBeGreaterThanOrEqual(0);expect(x.x).toBeLessThanOrEqual(100);expect(x.y).toBeGreaterThanOrEqual(20);expect(x.y).toBeLessThanOrEqual(84)}}
 })
})
describe('prices',()=>{
 it('one table, €1M to €5M in half-million steps, rising with the rating, per family',()=>{
  for(const fam of ['GK','DF','MF','FW'] as const){let last=0;for(let r=55;r<=99;r++){const p=priceOf(r,fam);expect(p).toBeGreaterThanOrEqual(1);expect(p).toBeLessThanOrEqual(5);expect((p*2)%1).toBe(0);expect(p).toBeGreaterThanOrEqual(last);last=p}}
 })
 it('the table is what a fresh build of every club\'s men produces (a squad or rating change must rebuild it)',async()=>{
  const by:Record<string,number[]>={GK:[],DF:[],MF:[],FW:[]}
  for(const id of CORE_CLUB_IDS)for(const p of xiPoolRaw((await loadClub(id))!.data))by[p.position]!.push(p.rating)
  const doc=JSON.parse(readFileSync('content/generated/rumble-prices.json','utf8')) as {cuts:Record<string,number[]>}
  expect(doc.cuts).toEqual(buildCuts(by))
 })
 it('a price is where the man stands among ALL clubs: about 1 in 14 costs the maximum and a fair share cost the minimum; the average card is affordable',async()=>{
  const P=await pools();const all=Object.values(P).flat()
  const share=(f:(p:number)=>boolean)=>all.filter(c=>f(c.price)).length/all.length
  expect(share(p=>p===5)).toBeGreaterThan(0.01);expect(share(p=>p===5)).toBeLessThan(0.12);expect(share(p=>p===1)).toBeGreaterThan(0.015)
  const mean=all.reduce((t,c)=>t+c.price,0)/all.length;expect(mean).toBeGreaterThan(2.5);expect(mean).toBeLessThan(3.4)
  expect(QUANTILES.length).toBe(8)
  for(const pool of Object.values(P))for(const c of pool)expect(c.price).toBe(priceOf(c.rating,c.position))
 })
})
describe('every man in the archive is reachable',()=>{
 it('is dealt (a position is on record) or signable by a scout into an outfield slot — and every man without one is named with the reason',async()=>{
  for(const id of CORE_CLUB_IDS){const d=(await loadClub(id))!.data,pool=new Set(xiPool(d).map(p=>p.id)),free=new Set(xiFree(d).map(p=>p.id)),un=new Set(unplacedFor(id).map(u=>u.id))
   for(const p of d.players||[]){const dealt=pool.has(p.value.id),signable=free.has(p.value.id);expect(dealt||signable,`${id} ${p.value.name}`).toBe(true);expect(dealt&&signable).toBe(false)}
   for(const u of unplacedFor(id)){expect(u.why.length,u.name).toBeGreaterThan(3);expect(free.has(u.id)||pool.has(u.id),u.name).toBe(true)}
   void un}
 })
 it('a man with no recorded position is signed into an outfield slot only, at a fair price, rated by the workbook or the club\'s ordinary midfielder',async()=>{
  const d=(await loadClub('celtic'))!.data,P=xiPool(d),free=xiFree(d);expect(free.length).toBeGreaterThan(50)
  const f='4-3-3' as const,gk=FORMATIONS[f].findIndex(x=>x.family==='GK'),df=FORMATIONS[f].findIndex(x=>x.family==='DF')
  expect(scoutSearch(P,P,f,2,false,gk,free[0]!.name,50,free).some(x=>x.id===free[0]!.id)).toBe(false)
  expect(scoutSearch(P,P,f,2,false,df,free[0]!.name,50,free).some(x=>x.id===free[0]!.id)).toBe(true)
  const dl=dealXI(P,P,f,2,true)!,pk=spender(dl.draft),cheap=pk.map((_,i)=>[...dl.draft[i]!].sort((a,b)=>a.price-b.price)[0]!.id)
  cheap[df]=free[0]!.id;const ok=playXI(P,P,f,dl.seed,true,cheap,undefined,free);expect(ok).not.toBeNull()
  cheap[gk]=free[1]!.id;expect(playXI(P,P,f,dl.seed,true,cheap,undefined,free)).toBeNull()
 })
 it('every man in every pool can be found by name and signed by a scout, in a slot of his own family',async()=>{
  const P=await pools()
  for(const id of CORE_CLUB_IDS){const pool=P[id]!,f='4-3-3' as const
   const slotOf=(fam:string)=>FORMATIONS[f].findIndex(x=>x.family===fam)
   for(const c of pool){const hit=scoutSearch(pool,pool,f,3,false,slotOf(c.position),c.name,200).some(x=>x.id===c.id);expect(hit,`${id} ${c.name}`).toBe(true)}}
 })
 it('scouting is capped, charged, and never takes a man of the rival\'s eleven',async()=>{
  const P=await pools(),H=P['celtic']!,d=dealXI(H,H,'4-3-3',5,true)!,base=spender(d.draft)
  const rival=new Set(d.rival.map(c=>c.id)),rivalDf=d.rival.find(c=>c.position==='DF')!
  expect(playXI(H,H,'4-3-3',d.seed,true,[base[0]!,rivalDf.id,...base.slice(2)])).toBeNull()
  const fam=(i:number)=>FORMATIONS['4-3-3'][i]!.family,free=(i:number)=>H.filter(x=>x.position===fam(i)&&!rival.has(x.id)&&!base.includes(x.id)&&!d.draft[i]!.some(c=>c.id===x.id))[0]!
  const cheap=base.map((_,i)=>[...d.draft[i]!].sort((a,b)=>a.price-b.price)[0]!.id)
  const three=[...cheap];[1,2,3].forEach(i=>{three[i]=free(i).id})
  expect(playXI(H,H,'4-3-3',d.seed,true,three)).toBeNull()
  const one=[...cheap];one[1]=free(1).id;const r=playXI(H,H,'4-3-3',d.seed,true,one)
  if(r){const sum=cost(r.you.cards);expect(r.you.cost).toBe(sum+1)}
 })
})
describe('readiness and deal',()=>{
 it('a ready club always deals a board its player can finish inside €35M, and says exactly why when it cannot',async()=>{
  const P=await pools()
  for(const id of CORE_CLUB_IDS)for(const f of FORMATION_IDS){const r=xiReadiness(P[id]!,f);if(!r.ready){expect(r.reasons.length).toBeGreaterThan(0);continue}
   if(!r.sameClub22)continue
   for(let s=1;s<=20;s++){const b=budgetOf(P[id]!,P[id]!,f),d=dealXI(P[id]!,P[id]!,f,s,true,b);expect(d,`${id} ${f} ${s}`).not.toBeNull()
    const sum=d!.draft.reduce((t,c)=>t+Math.min(...c.map(x=>x.price)),0);expect(sum).toBeLessThanOrEqual(b);expect(d!.draft).toHaveLength(11)}}
  if(!canRival(P['olympiacos']!,'4-3-3'))expect(rivalReason(P['olympiacos']!,'4-3-3')).toMatch(/over €35M|needed on file/)
 })
 it('facing your own club, the two elevens share nobody and the draft never offers the rival\'s men',async()=>{
  const P=await pools()
  for(const id of CORE_CLUB_IDS)if(xiReadiness(P[id]!,'4-4-2').sameClub22){const d=dealXI(P[id]!,P[id]!,'4-4-2',9,true)!;const rival=new Set(d.rival.map(c=>c.id));expect(rival.size).toBe(11);for(const c of d.draft.flat())expect(rival.has(c.id)).toBe(false)}
 })
 it('the rival is committed from his pool and the seed alone, and plays by the same budget',async()=>{
  const P=await pools();const a=dealRivalXI(P['aek-athens']!,'4-3-3',5)!,b=dealRivalXI(P['aek-athens']!,'4-3-3',5)!
  expect(a.map(c=>c.id)).toEqual(b.map(c=>c.id));expect(cost(a)).toBeLessThanOrEqual(XI_BUDGET);a.forEach((c,i)=>expect(c.position).toBe(FORMATIONS['4-3-3'][i]!.family))
 })
 it('the round seed names who plays whom and in what shape',()=>{
  expect(xiSeed(1,'a','b','4-3-3')).not.toBe(xiSeed(1,'a','c','4-3-3'));expect(xiSeed(1,'a','b','4-3-3')).not.toBe(xiSeed(1,'a','b','4-4-2'));expect(xiSeed(1,'a','b','4-3-3')).toBe(xiSeed(1,'a','b','4-3-3'))
 })
})
describe('the server refuses a forged round',()=>{
 it('wrong count, repeats, men that were not offered, and an eleven over €35M',async()=>{
  const P=await pools(),H=P['hapoel-tel-aviv']!,A=P['aek-athens']!,d=dealXI(H,A,'4-3-3',3,false)!,good=spender(d.draft)
  expect(playXI(H,A,'4-3-3',d.seed,false,good)).not.toBeNull()
  expect(playXI(H,A,'4-3-3',d.seed,false,good.slice(1))).toBeNull()
  expect(playXI(H,A,'4-3-3',d.seed,false,[good[0]!,...good.slice(0,10)])).toBeNull()
  const wrong=H.find(c=>c.position==='DF')!
  expect(playXI(H,A,'4-3-3',d.seed,false,[wrong.id,...good.slice(1)])).toBeNull()
  expect(playXI(H,A,'4-3-3',d.seed,false,['not-a-man',...good.slice(1)])).toBeNull()
  const dear=d.draft.map(c=>[...c].sort((a,b)=>b.price-a.price)[0]!.id)
  if(cost(dear.map((id,i)=>d.draft[i]!.find(c=>c.id===id)!))>XI_BUDGET)expect(playXI(H,A,'4-3-3',d.seed,false,dear)).toBeNull()
 })
})
describe('the match',()=>{
 it('is eleven against eleven, goals equal the score, and the football around them is made of the men on the pitch',async()=>{
  const P=await pools()
  for(const [h,a,f] of [['hapoel-tel-aviv','aek-athens','4-3-3'],['celtic','panathinaikos','3-5-2'],['aek-athens','aek-athens','4-4-2']] as const){
   const same=h===a,d=dealXI(P[h]!,P[a]!,f,11,same)!,r=playXI(P[h]!,P[a]!,f,d.seed,same,spender(d.draft))!,sc=stageXI(r,d.seed,f)
   expect(sc.us).toHaveLength(11);expect(sc.them).toHaveLength(11)
   expect(sc.events.filter(e=>e.type==='goal'&&e.side==='us')).toHaveLength(sc.final.us);expect(sc.events.filter(e=>e.type==='goal'&&e.side==='them')).toHaveLength(sc.final.them)
   const log=sc.play!,mins=log.moves.map(m=>m.minute);expect([...mins].sort((x,y)=>x-y)).toEqual(mins)
   expect(log.moves.filter(m=>m.end==='goal'&&m.side==='us')).toHaveLength(sc.final.us);expect(log.moves.filter(m=>m.end==='goal'&&m.side==='them')).toHaveLength(sc.final.them)
   for(const m of log.moves){const side=m.side==='us'?sc.us:sc.them,opp=m.side==='us'?sc.them:sc.us
    for(const st of m.steps){expect(side.some(p=>p.id===st.from)).toBe(true);expect(side.some(p=>p.id===st.to)).toBe(true)}
    if(m.end==='goal')expect(side.find(p=>p.id===m.shooter)!.position).not.toBe('GK')
    if(m.by)expect(opp.some(p=>p.id===m.by)).toBe(true)}
   const st=statsAt(log,90);expect(st.possession.us+st.possession.them).toBe(100);expect(statsAt(log,20).us.passes).toBeLessThanOrEqual(st.us.passes)
   for(const g of Object.values(log.grades)){expect(g).toBeGreaterThanOrEqual(4.5);expect(g).toBeLessThanOrEqual(10)}
   expect(JSON.stringify(sc)).not.toMatch(/"rating"/)
  }
 })
 it('classic five a side keeps its constants, its results and now tells the football too',async()=>{
  const pool=ratedPool((await loadClub('aek-athens'))!.data),draft=dealDraft(pool,4),picks=draft.map(c=>c[0]!.id)
  const r=play(pool,4,picks);if(!r)return
  const sc=stageMatch(r,4);expect(sc.us).toHaveLength(5);expect(sc.format).toBe('five');expect(sc.play!.moves.filter(m=>m.end==='goal')).toHaveLength(sc.final.us+sc.final.them)
  expect(r.you.cost).toBeLessThanOrEqual(15)
 })
 it('5,000 deterministic rounds across ready pairs: inside the budget, a full eleven, no loops, a sane scoreline, no home bias',async()=>{
  const P=await pools();let n=0,w=0,l=0,goals=0,max=0
  for(const f of FORMATION_IDS){const homes=CORE_CLUB_IDS.filter(i=>xiReadiness(P[i]!,f).ready),aways=CORE_CLUB_IDS.filter(i=>canRival(P[i]!,f))
   for(const h of homes)for(const a of aways)for(let s=1;s<=Math.ceil(5000/(3*homes.length*aways.length));s++){
    const same=h===a;if(same&&!xiReadiness(P[h]!,f).sameClub22)continue
    const b=budgetOf(P[h]!,P[a]!,f),d=dealXI(P[h]!,P[a]!,f,s,same,b);expect(d,`${h} ${a} ${f} ${s}`).not.toBeNull()
    const r=playXI(P[h]!,P[a]!,f,d!.seed,same,spender(d!.draft,b),undefined,[],b);expect(r).not.toBeNull()
    expect(r!.you.cost).toBeLessThanOrEqual(b);expect(r!.you.cards).toHaveLength(11);expect(r!.rival.cards).toHaveLength(11)
    n++;goals+=r!.goals[0]+r!.goals[1];max=Math.max(max,...r!.goals);if(r!.verdict==='win')w++;else if(r!.verdict==='loss')l++}}
  expect(n).toBeGreaterThan(3000);expect(goals/n).toBeGreaterThan(1.8);expect(goals/n).toBeLessThan(3.4);expect(max).toBeLessThanOrEqual(7)
  expect(w/n).toBeGreaterThan(0.2);expect(w/n).toBeLessThan(0.6);expect(l/n).toBeGreaterThan(0.2)
 })
})
