import {describe,expect,it} from 'vitest'
import {buildCatalog,bestXI,coreSquad,eligibleDecades,fits} from '@/lib/fan-league/catalog'
import {readinessOf} from '@/lib/fan-league/readiness'
import {simulate,scoreOf} from '@/lib/fan-league/engine'
import {doubleRoundRobin,table} from '@/lib/fan-league/league'
import {applyAction,createCareer,me,parseAction,sellPrice,standings,windowOpen,type Action} from '@/lib/fan-league/career'
import type {Card,Catalog} from '@/lib/fan-league/types'
import type {Pos} from '@/lib/clubs/rumble-format'

/** a made-up club, for the rules only — names are placeholders, not people */
function club(id:string,n=40,from=1975,shift=0):Catalog{
 const fam:Pos[]=['GK','DF','DF','DF','MF','MF','MF','FW','FW','DF']
 const rows=Array.from({length:n},(_,i)=>({id:`${id}-p${i}`,name:`${id} man ${i}`,position:fam[i%fam.length]!,price:1+(i%5),rating:60+((i*7+shift)%35),fromYear:from+(i%30),toYear:from+(i%30)+3}))
 rows.push({id:`${id}-ny`,name:`${id} no years`,position:'MF',price:1,rating:70,fromYear:null as unknown as number,toYear:null as unknown as number})
 return buildCatalog(id,`Club ${id}`,rows,new Set(rows.map(r=>r.id)))
}
let k=0;const key=()=>`k${String(++k).padStart(8,'0')}`
const act=(a:Record<string,unknown>,rev:number)=>parseAction({...a,key:key(),rev}) as Action

describe('FAN LEAGUE — catalog and readiness',()=>{
 it('labels decades from recorded years only',()=>{
  expect(eligibleDecades(1978,1983)).toEqual([1970,1980])
  expect(eligibleDecades(null,1983)).toEqual([])
  expect(eligibleDecades(1990,1980)).toEqual([])
 })
 it('keeps only approved men and freezes a digest',()=>{
  const rows=[{id:'a',name:'A',position:'GK' as Pos,price:1,rating:70,fromYear:1980,toYear:1982},{id:'b',name:'B',position:'DF' as Pos,price:1,rating:70,fromYear:1980,toYear:1982}]
  const c=buildCatalog('x','X',rows,new Set(['a']))
  expect(c.cards.map(x=>x.id)).toEqual(['a'])
  expect(buildCatalog('x','X',rows,new Set(['a'])).digest).toBe(c.digest)
 })
 it('never puts a man with no position in goal',()=>{expect(fits({position:'MF',free:true},'GK')).toBe(false);expect(fits({position:'MF',free:true},'DF')).toBe(true)})
 it('reads a club as PASS/WARN/BLOCK from its catalog',()=>{
  const r=readinessOf(club('a'))
  expect(r.verdict).toBe('WARN');expect(r.homeDecades.length).toBeGreaterThan(0);expect(r.noYears).toBe(1)
  const tiny=buildCatalog('t','T',[{id:'1',name:'1',position:'MF',price:1,rating:60,fromYear:1990,toYear:1991}],new Set(['1']))
  expect(readinessOf(tiny).verdict).toBe('BLOCK')
 })
 it('builds an eighteen from the home decade, completing a short one from the nearest years',()=>{
  const c=club('a'),d=readinessOf(c).homeDecades[0]!,core=coreSquad(c.cards,d)
  expect(core.squad.length).toBe(18);expect(new Set(core.squad).size).toBe(18)
  for(const id of core.squad.filter(id=>!core.completed.includes(id)))expect(c.cards.find(x=>x.id===id)!.decades).toContain(d)
  expect(bestXI(core.squad.map(id=>c.cards.find(x=>x.id===id)!),'4-3-3')).not.toBeNull()
 })
})

describe('FAN LEAGUE — the match engine',()=>{
 const c=club('a'),xi=(cat:Catalog)=>bestXI(cat.cards,'4-3-3')!.map(id=>cat.cards.find(x=>x.id===id)!)
 it('is deterministic and the score is counted from the events',()=>{
  const h={xi:xi(c),formation:'4-3-3' as const,tactic:'balanced' as const},a={xi:xi(club('b',40,1975,13)),formation:'4-3-3' as const,tactic:'attacking' as const}
  const one=simulate(h,a,42),two=simulate(h,a,42)
  expect(two).toEqual(one);expect(one.goals).toEqual(scoreOf(one.events))
 })
 it('10,000 matches: no throw, every scorer and assister stood in that eleven, 0–0 happens, the stronger side wins more',()=>{
  const strong:Card[]=xi(c).map(x=>({...x,rating:90})),weak:Card[]=xi(club('b')).map(x=>({...x,rating:62}))
  let s=0,w=0,nil=0
  for(let seed=1;seed<=10_000;seed++){
   const r=simulate({xi:strong,formation:'4-3-3',tactic:'balanced'},{xi:weak,formation:'4-3-3',tactic:'balanced'},seed)
   for(const e of r.events)if(e.kind==='goal'){const own=(e.side?weak:strong).map(x=>x.id);expect(own).toContain(e.scorer);if(e.assist){expect(own).toContain(e.assist);expect(e.assist).not.toBe(e.scorer)}}
   if(r.goals[0]>r.goals[1])s++;else if(r.goals[0]<r.goals[1])w++;if(!r.goals[0]&&!r.goals[1])nil++
  }
  expect(s).toBeGreaterThan(w*2);expect(w).toBeGreaterThan(0);expect(nil).toBeGreaterThan(0)
 })
})

describe('FAN LEAGUE — the league',()=>{
 it('a double round-robin: 8 teams = 14 rounds = 56 matches, no team twice in a round, every pair home and away',()=>{
  const t=['a','b','c','d','e','f','g','h'],f=doubleRoundRobin(t)
  expect(f.length).toBe(56);expect(new Set(f.map(x=>x.round)).size).toBe(14)
  for(let r=1;r<=14;r++){const xs=f.filter(x=>x.round===r).flatMap(x=>[x.home,x.away]);expect(new Set(xs).size).toBe(8)}
  for(const a of t)for(const b of t)if(a!==b)expect(f.filter(x=>x.home===a&&x.away===b).length).toBe(1)
  expect(f.every(x=>x.home!==x.away)).toBe(true)
  expect(doubleRoundRobin(['a','b','c','d']).length).toBe(12)
 })
 it('the table follows the results and the fixed tie-break',()=>{
  const r=(g:[number,number])=>({engine:'fan-league-engine-v1' as const,seed:1,goals:g,events:[]})
  const rows=table([{club:'a',name:'A'},{club:'b',name:'B'}],[{id:'1',round:1,home:'a',away:'b',result:r([2,1])},{id:'2',round:2,home:'b',away:'a',result:r([1,1])}])
  expect(rows[0]).toMatchObject({club:'a',pts:4,gd:1,w:1,d:1});expect(rows[1]).toMatchObject({club:'b',pts:1})
 })
})

describe('FAN LEAGUE — a career',()=>{
 const own=club('own'),rivals=['r1','r2','r3','r4','r5','r6','r7','r8'].map((id,i)=>({catalog:club(id,40,1975,i*5),decade:1980}))
 const start=()=>{const r=createCareer({id:'c1',owner:'o',now:'2026-10-12T00:00:00Z',own,homeDecade:1980,rivals});if(!r.ok)throw new Error(r.error);return r.career}
 it('starts with eight clubs, an eighteen of its own and a kitty',()=>{
  const c=start();expect(c.teams.length).toBe(8);expect(c.rounds).toBe(14);expect(me(c).squad.length).toBe(18);expect(windowOpen(c)).toBe(true)
  for(const t of c.teams.slice(1))for(const id of t.squad)expect(id.startsWith(`${t.club}-`)).toBe(true)
 })
 it('refuses a man from another club, whatever the request says',()=>{
  const c=start(),r=applyAction(c,act({kind:'buy',card:'r1-p3'},c.revision),'t')
  expect(r.ok).toBe(false)
 })
 it('buys and sells inside the club, refunds less than it paid, and blocks the instant buy-back',()=>{
  let c=start();const t=me(c),card=own.cards.find(x=>!t.squad.includes(x.id)&&x.price<=c.budget)!
  const b=applyAction(c,act({kind:'buy',card:card.id},c.revision),'t');expect(b.ok).toBe(true);if(!b.ok)return;c=b.career
  expect(c.budget).toBe(12-card.price)
  const s=applyAction(c,act({kind:'sell',card:card.id},c.revision),'t');expect(s.ok).toBe(true);if(!s.ok)return;c=s.career
  expect(c.budget).toBe(12-card.price+sellPrice(card.price));expect(c.budget).toBeLessThan(12)
  const again=applyAction(c,act({kind:'buy',card:card.id},c.revision),'t');expect(again.ok).toBe(false)
 })
 it('a stale revision is refused and a repeated key answers the same state',()=>{
  const c=start(),a=act({kind:'auto',formation:'4-4-2'},c.revision),one=applyAction(c,a,'t')
  expect(one.ok).toBe(true);if(!one.ok)return
  expect(applyAction(one.career,a,'t')).toMatchObject({ok:true,replay:true})
  expect(applyAction(one.career,act({kind:'play'},c.revision),'t')).toMatchObject({ok:false,code:'stale'})
 })
 it('plays a whole season: the window opens again at the midpoint only, every eleven is its own club, and the table adds up',()=>{
  let c=start();const mid=Math.floor(c.rounds/2)
  for(let i=0;i<c.rounds;i++){
   expect(windowOpen(c)).toBe(i===0||i===mid)
   const r=applyAction(c,act({kind:'play'},c.revision),'t');expect(r.ok).toBe(true);if(!r.ok)return;c=r.career
  }
  expect(c.status).toBe('finished');expect(c.fixtures.every(f=>f.result)).toBe(true)
  const rows=standings(c);expect(rows.reduce((t,r)=>t+r.p,0)).toBe(c.fixtures.length*2)
  expect(rows.reduce((t,r)=>t+r.gf,0)).toBe(c.fixtures.reduce((t,f)=>t+f.result!.goals[0]+f.result!.goals[1],0))
  for(const f of c.fixtures)for(const e of f.result!.events)if(e.kind==='goal')expect(e.scorer.startsWith(`${e.side?f.away:f.home}-`)).toBe(true)
  expect(applyAction(c,act({kind:'play'},c.revision),'t')).toMatchObject({ok:false,code:'closed'})
 })
 it('rejects a malformed action',()=>{expect(parseAction({kind:'buy',card:1,key:'x',rev:1})).toBeNull();expect(parseAction({kind:'teleport',key:'abcdefgh',rev:1})).toBeNull()})
})
