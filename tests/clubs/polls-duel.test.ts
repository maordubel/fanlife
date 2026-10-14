import {describe,it,expect} from 'vitest'
import {chooseSide,finalize,nextBatch,orderOf,resume,startDuel,undoLast,viewOf} from '@/lib/clubs/polls-duel/engine'
import {digestOf,eligibleFor,inPeriod,parseYear,yearOfOn} from '@/lib/clubs/polls-duel/pool'
import {applyToBallot,applyToDebate,duelPolls} from '@/lib/clubs/polls-duel/adapter'
import {duelKey,BIRTH_KEY} from '@/lib/clubs/polls-duel/storage'
import {ALL_TIME,type DuelCandidate,type DuelState,type Side} from '@/lib/clubs/polls-duel/types'
import {dealBallot,emptySlip,questionOf,readDebates,setPick,usableDebates,debateVersion} from '@/lib/clubs/polls-model'
import {loadClub} from '@/lib/clubs/resolver'
import type {ClubPlayer} from '@/lib/clubs/contract'

const cand=(n:number,span:(i:number)=>[number|null,number|null]=i=>[1950+i,1955+i]):DuelCandidate[]=>Array.from({length:n},(_,i)=>{const [a,b]=span(i);return {id:`p${i}`,kind:'player',title:`Player ${i}`,yearFrom:a,yearTo:b}})
const start=(pool:DuelCandidate[],seed=7,filter=ALL_TIME)=>{const r=startDuel({pool,seed,pollId:'favourite',promptVersion:'v1',filter,sessionId:'abc123def'});if(!r.ok)throw new Error('short');return {state:r.state,pool:r.eligible}}
const play=(s:DuelState,pool:DuelCandidate[],sides:string)=>{for(const c of sides)s=chooseSide(s,pool,c as Side);return s}

describe('gate 7 · the duel engine (D7-01 … D7-06, D7-11)',()=>{
 it('D7-01 · choosing the right side three times keeps the same man on the right and changes the left every time',()=>{
  const {state,pool}=start(cand(30));let s=state;const lefts:string[]=[];let holder:string|null=null
  for(let i=0;i<3;i++){const v=viewOf(s,pool);lefts.push(v.left!.id);const keep=v.right!.id;if(holder)expect(keep).toBe(holder);holder=keep;s=chooseSide(s,pool,'R')}
  expect(new Set(lefts).size).toBe(3);const v=viewOf(s,pool);expect(v.right!.id).toBe(holder);expect(v.winnerSide).toBe('R');expect(v.streak).toBe(3)
 })
 it('D7-02 · choosing left after a right run keeps the left, changes the right and resets the streak',()=>{
  const {state,pool}=start(cand(30));let s=play(state,pool,'RR');const before=viewOf(s,pool),challenger=before.left!.id,oldHolder=before.right!.id
  s=chooseSide(s,pool,'L');const v=viewOf(s,pool)
  expect(v.left!.id).toBe(challenger);expect(v.right!.id).not.toBe(oldHolder);expect(v.streak).toBe(1);expect(v.winnerSide).toBe('L')
 })
 it('the winner side is state, not parity: the same side picked repeatedly never moves it',()=>{
  const {state,pool}=start(cand(40));for(const side of ['L','R'] as const){let s=state;const first=viewOf(s,pool);const keeper=side==='L'?first.left!.id:first.right!.id
   for(let i=0;i<9;i++){s=chooseSide(s,pool,side);const v=viewOf(s,pool);expect((side==='L'?v.left:v.right)!.id).toBe(keeper)}}
 })
 it('every loser leaves for good; nobody is shown twice in a run (unique ids, no repeats)',()=>{
  const {state,pool}=start(cand(25),3);let s=state;const shown=new Set<string>(),v0=viewOf(s,pool);shown.add(v0.left!.id);shown.add(v0.right!.id)
  let side:Side='L'
  while(viewOf(s,pool).status==='battling'){s=chooseSide(s,pool,side);const v=viewOf(s,pool);side=side==='L'?'R':'L';if(v.status==='battling'){const fresh=side==='L'?v.right:v.left;void fresh}
   for(const c of [v.left,v.right])if(c&&c.id!==v.holderId){expect(shown.has(c.id)).toBe(false);shown.add(c.id)}
   if(v.left&&v.right)expect(v.left.id).not.toBe(v.right.id)}
 })
 it('D7-03 · ten decisions stop at the confirmation and nothing is a vote yet',()=>{
  const {state,pool}=start(cand(30));const s=play(state,pool,'LRLLRRLRLL');const v=viewOf(s,pool)
  expect(v.status).toBe('confirm');expect(v.decided).toBe(10);expect(s.final).toBeNull()
  expect(chooseSide(s,pool,'L')).toBe(s) // no eleventh decision without asking
 })
 it('D7-04 · ten more: the same man on the same side, only unseen names come in',()=>{
  const {state,pool}=start(cand(40));let s=play(state,pool,'RRRLRLLRRL');const v=viewOf(s,pool),holder=v.holderId!,side=v.winnerSide!
  const losers=new Set<string>();
  { let t=state;for(const c of 'RRRLRLLRRL'){const x=viewOf(t,pool);losers.add((c==='L'?x.right:x.left)!.id);t=chooseSide(t,pool,c as Side)} }
  s=nextBatch(s,pool);const b=viewOf(s,pool);expect(b.status).toBe('battling');expect(b.holderId).toBe(holder);expect(b.winnerSide).toBe(side)
  const challenger=(side==='L'?b.right:b.left)!.id;expect(losers.has(challenger)).toBe(false);expect(challenger).not.toBe(holder)
  let guard=0;let t=s;while(viewOf(t,pool).status==='battling'&&guard++<20){const x=viewOf(t,pool);const c=(x.winnerSide==='L'?x.right:x.left)!;expect(c.id).not.toBe(holder);t=chooseSide(t,pool,x.winnerSide!)}
  expect(viewOf(t,pool).decided).toBe(20)
 })
 it('D7-05 · a six-name pool is at most five decisions, and a round never exceeds n-1',()=>{
  const {state,pool}=start(cand(6));const v=viewOf(state,pool);expect(v.cap).toBe(5)
  const s=play(state,pool,'LLLLL');const e=viewOf(s,pool);expect(e.status).toBe('confirm');expect(e.exhausted).toBe(true);expect(e.decided).toBe(5)
  expect(nextBatch(s,pool)).toBe(s)
  const two=start(cand(2));expect(viewOf(two.state,two.pool).cap).toBe(1)
 })
 it('a pool under two names is not a duel',()=>{
  const r=startDuel({pool:cand(1),seed:1,pollId:'x',promptVersion:'v',filter:ALL_TIME,sessionId:'abcdef12'});expect(r).toMatchObject({ok:false,code:'POOL_SHORT',have:1})
 })
 it('D7-06 · VAR restores the exact pair, sides, streak and challenger — and only once a round',()=>{
  const {state,pool}=start(cand(30));const s1=play(state,pool,'RLR'),before=viewOf(s1,pool)
  const s2=chooseSide(s1,pool,'L'),u=undoLast(s2,pool),after=viewOf(u,pool)
  expect(after.left!.id).toBe(before.left!.id);expect(after.right!.id).toBe(before.right!.id);expect(after.streak).toBe(before.streak);expect(after.winnerSide).toBe(before.winnerSide);expect(after.decided).toBe(before.decided)
  expect(after.canUndo).toBe(false) // one VAR per round
  const again=chooseSide(u,pool,'L');expect(undoLast(again,pool)).toBe(again)
  expect(undoLast(state,pool)).toBe(state) // nothing to undo at the start
 })
 it('VAR from the confirmation returns to the tenth decision; the next round gets a new VAR',()=>{
  const {state,pool}=start(cand(40));let s=play(state,pool,'LLLLLLLLLL');expect(viewOf(s,pool).status).toBe('confirm')
  s=undoLast(s,pool);expect(viewOf(s,pool).status).toBe('battling');expect(viewOf(s,pool).decided).toBe(9)
  s=chooseSide(s,pool,'R');s=nextBatch(s,pool);s=play(s,pool,'RR');expect(viewOf(s,pool).canUndo).toBe(true)
 })
 it('D7-11 · finalize is idempotent: the second call is the same winner and not fresh',()=>{
  const {state,pool}=start(cand(30));const s=play(state,pool,'LRLLRRLRLL'),holder=viewOf(s,pool).holderId
  const a=finalize(s,pool),b=finalize(a.state,pool),c=finalize(b.state,pool)
  expect(a.fresh).toBe(true);expect(a.winnerId).toBe(holder);expect(b.fresh).toBe(false);expect(c.winnerId).toBe(holder);expect(c.state).toBe(a.state)
  expect(finalize(state,pool).winnerId).toBeNull() // before the confirmation there is nothing to finalize
 })
 it('the same seed and pool always make the same run; a different seed reorders',()=>{
  const p=cand(50);expect(orderOf(p,5)).toEqual(orderOf(p,5));expect(orderOf(p,5)).not.toEqual(orderOf(p,6));expect(new Set(orderOf(p,5)).size).toBe(50)
 })
 it('the order spreads the decades: neighbours are rarely from one era',()=>{
  const p=cand(60,i=>{const y=1950+(i%6)*10;return [y,y+3]});const o=orderOf(p,11),dec=(id:string)=>Math.floor((p.find(c=>c.id===id)!.yearFrom!)/10)
  let same=0;for(let i=1;i<o.length;i++)if(dec(o[i]!)===dec(o[i-1]!))same++
  expect(same).toBeLessThan(5)
 })
})

describe('gate 7 · period filters (D7-07)',()=>{
 it('since 1980: a man whose recorded span ended in 1979 is out; one who played to 1981 is in',()=>{
  const f={kind:'since',year:1980} as const
  expect(inPeriod({yearFrom:1970,yearTo:1979},f)).toBe(false);expect(inPeriod({yearFrom:1975,yearTo:1981},f)).toBe(true);expect(inPeriod({yearFrom:1975,yearTo:1980},f)).toBe(true)
 })
 it('an open end counts only if he began on or after the year; no recorded years is never a claim',()=>{
  const f={kind:'since',year:1990} as const
  expect(inPeriod({yearFrom:1995,yearTo:null},f)).toBe(true);expect(inPeriod({yearFrom:1985,yearTo:null},f)).toBe(false);expect(inPeriod({yearFrom:null,yearTo:null},f)).toBe(false);expect(inPeriod({yearFrom:null,yearTo:null},ALL_TIME)).toBe(true)
 })
 it('a decade is an overlap of the recorded span with [D, D+9]',()=>{
  const f={kind:'decade',decade:1980} as const
  expect(inPeriod({yearFrom:1975,yearTo:1980},f)).toBe(true);expect(inPeriod({yearFrom:1989,yearTo:1995},f)).toBe(true);expect(inPeriod({yearFrom:1990,yearTo:1999},f)).toBe(false);expect(inPeriod({yearFrom:1970,yearTo:1979},f)).toBe(false);expect(inPeriod({yearFrom:1983,yearTo:null},f)).toBe(true);expect(inPeriod({yearFrom:null,yearTo:null},f)).toBe(false)
 })
 it('a birth year is four digits within bounds; a full date or nonsense is refused',()=>{
  expect(parseYear('1983',2026)).toBe(1983);expect(parseYear(' 1983 ',2026)).toBe(1983);for(const bad of ['83','1983-05-01','1899','2027','abc','','19 83',null,undefined])expect(parseYear(bad as never,2026)).toBeNull()
 })
 it('the year of a dated record is read, never guessed',()=>{
  expect(yearOfOn('1987-05-14')).toBe(1987);expect(yearOfOn('14 May 1987')).toBe(1987);expect(yearOfOn(null)).toBeNull();expect(yearOfOn('sometime')).toBeNull()
 })
 it('eligibleFor drops duplicates by canonical id',()=>{
  const p=[...cand(5),...cand(5)];expect(eligibleFor(p,ALL_TIME)).toHaveLength(5)
 })
})

describe('gate 7 · resume, versions and the saved run (D7-12, D7-13)',()=>{
 const now={pollId:'favourite',promptVersion:'v1'}
 it('a saved run replays exactly, including after a reload (JSON round trip)',()=>{
  const {state,pool}=start(cand(30));const s=play(state,pool,'LRRLR'),raw=JSON.parse(JSON.stringify(s)),r=resume(raw,cand(30),now)
  expect(r.ok).toBe(true);if(r.ok){expect(viewOf(r.state,r.eligible)).toEqual(viewOf(s,pool))}
 })
 it('D7-12 · a changed prompt version or a changed pool never carries an old run onto the new line',()=>{
  const {state,pool}=start(cand(30));const raw=JSON.parse(JSON.stringify(play(state,pool,'LR')))
  expect(resume(raw,cand(30),{...now,promptVersion:'v2'})).toEqual({ok:false,code:'STALE'})
  expect(resume(raw,cand(31),now)).toEqual({ok:false,code:'STALE'})
  expect(resume(raw,cand(30),{pollId:'keeper',promptVersion:'v1'})).toEqual({ok:false,code:'STALE'})
 })
 it('a tampered save is invalid, not trusted',()=>{
  const {state,pool}=start(cand(30));const ok=JSON.parse(JSON.stringify(state))
  for(const bad of [null,'x',{...ok,v:2},{...ok,moves:'LXR'},{...ok,sessionId:'<script>'},{...ok,moves:'L'.repeat(25)},{...ok,filter:{kind:'weird'}}])expect(resume(bad,pool,now).ok).toBe(false)
 })
 it('a confirmed winner survives a reload only if it is still the holder of a confirmed round',()=>{
  const {state,pool}=start(cand(30));let s=play(state,pool,'LLLLLLLLLL');const f=finalize(s,pool);s=f.state
  const r=resume(JSON.parse(JSON.stringify(s)),pool,now);expect(r.ok&&r.state.final?.winnerId).toBe(f.winnerId)
  const forged=JSON.parse(JSON.stringify(s));forged.final={winnerId:'p29'};const r2=resume(forged,pool,now);expect(r2.ok&&r2.state.final).toBeFalsy()
 })
 it('the storage namespace is per club and per poll, and the birth year is not in it',()=>{
  expect(duelKey('olympiacos','keeper')).toBe('fan-life:club:olympiacos:polls-duel:v1:keeper');expect(duelKey('a','keeper')).not.toBe(duelKey('b','keeper'));expect(BIRTH_KEY).not.toContain('club')
  const {state}=start(cand(10));expect(JSON.stringify(state)).not.toMatch(/birth/i)
 })
 it('the digest changes when a name is added',()=>{expect(digestOf(cand(10))).not.toBe(digestOf(cand(11)))})
})

const roster=(d:Awaited<ReturnType<typeof loadClub>>):ClubPlayer[]=>(d!.data.players||[]).map(f=>f.value)
describe('gate 7 · the duel against a real roster (D7-08, D7-09, D7-10, D7-19, D7-20)',()=>{
 it('every duel poll is a line the ballot already deals; number and position stay direct picks',async()=>{
  const c=await loadClub('hapoel-tel-aviv'),ps=roster(c),ballot=dealBallot(ps)
  const polls=duelPolls({club:'hapoel-tel-aviv',players:ps,ballot,debates:[]}),ids=polls.map(p=>p.pollId)
  expect(ids).not.toContain('number');expect(ids).not.toContain('position');expect(ids).toEqual(ballot.questions.filter(q=>q.kind==='player').map(q=>q.id))
  for(const p of polls){expect(p.sink).toBe('ballot');expect(p.promptVersion).toBe(questionOf(ballot,p.pollId)!.version)}
 },60000)
 it('D7-08 · the keeper line holds goalkeepers only; D7-09 · the foreign line only the club’s own foreign-slot record',async()=>{
  const c=await loadClub('hapoel-tel-aviv'),ps=roster(c),ballot=dealBallot(ps),polls=duelPolls({club:'hapoel-tel-aviv',players:ps,ballot,debates:[]}),by=new Map(ps.map(p=>[p.id,p]))
  const keeper=polls.find(p=>p.pollId==='keeper')!,foreign=polls.find(p=>p.pollId==='foreign')!
  expect(keeper.pool.length).toBeGreaterThanOrEqual(2);for(const x of keeper.pool)expect(by.get(x.id)!.positions).toContain('GK')
  for(const x of foreign.pool)expect(by.get(x.id)!.detail?.foreignSlot).toBe('foreign')
 },60000)
 it('D7-19 · another club’s roster can never leak into a club’s duel pool',async()=>{
  const a=roster(await loadClub('hapoel-tel-aviv')),b=roster(await loadClub('olympiacos'))
  const pa=duelPolls({club:'hapoel-tel-aviv',players:a,ballot:dealBallot(a),debates:[]}),idsA=new Set(a.map(p=>p.id)),idsB=new Set(b.map(p=>p.id))
  for(const p of pa)for(const x of p.pool){expect(idsA.has(x.id)).toBe(true);if(idsB.has(x.id))expect(idsA.has(x.id)).toBe(true)}
 },60000)
 it('D7-20 · a ballot line goes to the slip and nowhere else; a debate poll goes to the debate state and nowhere else',async()=>{
  const ps=roster(await loadClub('hapoel-tel-aviv')),ballot=dealBallot(ps),q=questionOf(ballot,'keeper')!,keeper=duelPolls({club:'c',players:ps,ballot,debates:[]}).find(p=>p.pollId==='keeper')!
  const w=keeper.pool[0]!.id,slip=applyToBallot(emptySlip(),q,ps,w,{club:'c',voter:'abcdefgh1'})
  expect(slip.picks.keeper).toBe(w);expect(slip.pv.keeper).toBe(q.version)
  const again=applyToBallot(slip,q,ps,w,{club:'c',voter:'abcdefgh1'});expect(again.keys.keeper).toBe(slip.keys.keeper) // the same winner is the same idempotency key
  expect(applyToBallot(emptySlip(),q,ps,'not-a-keeper-id',{club:'c',voter:'abcdefgh1'}).picks.keeper).toBeUndefined()
  const deb=usableDebates([{id:'pollCaptain',prompt:'x',choices:[{id:'a',name:'A'},{id:'b',name:'B'}]}])[0]!
  const ds=applyToDebate(readDebates(null,null,[deb]),deb,'b');expect(ds.votes.pollCaptain).toBe('b');expect(ds.made.pollCaptain!.pv).toBe(debateVersion(deb))
  expect(applyToDebate(readDebates(null,null,[deb]),deb,'zzz').votes.pollCaptain).toBeUndefined()
  const polls=duelPolls({club:'c',players:ps,ballot,debates:[{id:'pollCaptain',prompt:'x',choices:[{id:'a',name:'A',from:1990,to:1990},{id:'b',name:'B',from:null,to:null}]}]})
  expect(polls.find(p=>p.pollId==='pollCaptain')!.sink).toBe('debate')
  expect(polls.filter(p=>p.sink==='debate').every(p=>!polls.some(o=>o.sink==='ballot'&&o.pollId===p.pollId))).toBe(true)
 },60000)
 it('a line with one name is shown as unavailable with the count, never padded',()=>{
  const ps:ClubPlayer[]=[{id:'a',name:'A',positions:['GK'],fromYear:2000,toYear:2005,aliases:[]},{id:'b',name:'B',positions:['GK'],fromYear:2001,toYear:2006,aliases:[]}]
  const polls=duelPolls({club:'c',players:ps,ballot:dealBallot(ps),debates:[{id:'pollMeet',prompt:'x',choices:[{id:'z',name:'Z'}]}]})
  expect(polls.find(p=>p.pollId==='pollMeet')!.unavailable).toEqual({have:1,need:2})
 })
})

import {intentOf,keySide,swipeSide} from '@/lib/clubs/polls-duel/swipe'
describe('gate 7 · the gesture (D7-15, D7-16)',()=>{
 it('D7-15 · a swipe to the right chooses the right-hand name, in any page direction',()=>{
  expect(swipeSide({dx:120,dy:8,ms:240,width:360})).toBe('R');expect(swipeSide({dx:-120,dy:8,ms:240,width:360})).toBe('L')
  expect(keySide('ArrowRight')).toBe('R');expect(keySide('ArrowLeft')).toBe('L');expect(keySide('Enter')).toBeNull()
 })
 it('a short, slow, vertical or diagonal drag decides nothing',()=>{
  expect(swipeSide({dx:40,dy:0,ms:900,width:360})).toBeNull();expect(swipeSide({dx:130,dy:130,ms:200,width:360})).toBeNull();expect(swipeSide({dx:20,dy:200,ms:200,width:360})).toBeNull()
  expect(swipeSide({dx:90,dy:80,ms:300,width:360})).toBeNull() // |dx| must beat |dy| by 1.25
  expect(swipeSide({dx:0,dy:0,ms:2000,width:360})).toBeNull() // a held, still finger is not a choice
 })
 it('a quick flick under the distance threshold still counts; the threshold grows with the arena',()=>{
  expect(swipeSide({dx:48,dy:2,ms:60,width:360})).toBe('R');expect(swipeSide({dx:100,dy:0,ms:700,width:900})).toBeNull();expect(swipeSide({dx:170,dy:0,ms:700,width:900})).toBe('R')
 })
 it('the page scrolls on a vertical intent; a horizontal one is the duel’s',()=>{
  expect(intentOf(4,3)).toBeNull();expect(intentOf(2,20)).toBe('v');expect(intentOf(20,4)).toBe('h');expect(intentOf(14,12)).toBe('v')
 })
})
