import {describe,it,expect} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import React,{createElement} from 'react'
import {WallCard} from '@/components/clubs/gates/memory/WallCard'
import {startRun,flip,closeOpen,echoMate,spendEcho,spendFlash,morale,wallLit,finished,verdict,FLASH_MS,RE_FLASH_MS,FUSION_MS,ECHO_MS,ECHO_STREAK,type MemoryRun} from '@/lib/game/memory-run'
import type {MemoryCard} from '@/lib/game/memory'
import {columnsFor,legacyBasicPoints,verdictKey,resultOf,categoryOfRun,hintedRun,parseSize,memoryQuery,memoryRunKey,foundPairs,displayFace,clockOf,LONG_FACE} from '@/lib/clubs/memory-model'
import {MEMORY_RULES,MEMORY_SCORE_VERSION} from '@/lib/clubs/memory-solver'
import {parseBests,better,recordBest} from '@/lib/clubs/memory-best'
import {addToShelf} from '@/lib/clubs/memory-shelf'

(globalThis as unknown as {React:typeof React}).React=React
const deal=(pairs:number):MemoryCard[]=>Array.from({length:pairs*2},(_,i)=>({id:`c${i}`,pair:`p${i>>1}`,face:`f${i}`,kind:'k',object:'trophy',side:i%2?'answer':'memory'}) as MemoryCard)
const cards=deal(6)
const play=(run:MemoryRun,ids:string[])=>{let r=run,last:ReturnType<typeof flip>|null=null;for(const id of ids){last=flip(r,cards,id);r=last.run;if(last.kind==='miss')r=closeOpen(r)}return {run:r,last:last!}}
const pairIds=(n:number)=>[`c${n*2}`,`c${n*2+1}`]

describe('ME-R05 a move is a completed two-card compare',()=>{
 it('one flip is not a move',()=>{const o=flip(startRun(),cards,'c0');expect(o.kind).toBe('open');expect(o.run.moves).toBe(0)})
 it('the second flip completes it',()=>{const o=play(startRun(),['c0','c1']);expect(o.run.moves).toBe(1)})
 it('an open card, a matched card and a third card while two resolve are ignored',()=>{
  const one=flip(startRun(),cards,'c0').run
  expect(flip(one,cards,'c0').kind).toBe('ignored')
  const miss=flip(one,cards,'c2')
  expect(miss.kind).toBe('miss')
  expect(flip(miss.run,cards,'c4').kind).toBe('ignored')
  const matched=play(startRun(),pairIds(0)).run
  expect(flip(matched,cards,'c0').kind).toBe('ignored');expect(flip(matched,cards,'c1').kind).toBe('ignored')
  expect(flip(startRun(),cards,'nope').kind).toBe('ignored')
 })
})

describe('ME-R06 a miss resets the streak and the perfect count',()=>{
 it('counts misses and clears the streak',()=>{
  let r=play(startRun(),pairIds(0)).run;r=play(r,pairIds(1)).run;expect(r.streak).toBe(2)
  r=play(r,['c4','c6']).run
  expect(r.streak).toBe(0);expect(r.misses).toBe(1);expect(r.missesSincePair).toBe(1);expect(r.bestStreak).toBe(2)
 })
 it('the next pair after a miss is not perfect, the one after is',()=>{
  let r=play(startRun(),['c0','c2']).run
  const a=play(r,pairIds(0));expect(a.last.kind).toBe('pair');expect((a.last as {perfect:boolean}).perfect).toBe(false)
  const b=play(a.run,pairIds(1));expect((b.last as {perfect:boolean}).perfect).toBe(true)
  expect(b.run.perfect).toEqual(['p1'])
 })
 it('a pair with no intervening miss is perfect',()=>{const a=play(startRun(),pairIds(0));expect((a.last as {perfect:boolean}).perfect).toBe(true)})
})

describe('ME-R07 the echo',()=>{
 const three=()=>{let r=startRun();for(let n=0;n<ECHO_STREAK;n++)r=play(r,pairIds(n)).run;return r}
 it('arms after three consecutive matches, not before',()=>{
  let r=startRun();for(let n=0;n<2;n++)r=play(r,pairIds(n)).run;expect(r.echo).toBe('idle');r=play(r,pairIds(2)).run;expect(r.echo).toBe('armed')
 })
 it('answers on a FIRST flip only, never a matched card, and is spent once',()=>{
  const r=three()
  expect(echoMate(r,cards,'c6')).toBe('c7')
  expect(echoMate(r,cards,'c0')).toBeNull()
  const second=flip(r,cards,'c6').run
  expect(echoMate(second,cards,'c8')).toBeNull()
  const spent=spendEcho(r);expect(spent.echo).toBe('spent');expect(echoMate(spent,cards,'c6')).toBeNull()
 })
 it('cannot be farmed: more streak never re-arms it',()=>{
  let r=spendEcho(three());for(let n=3;n<6;n++)r=play(r,pairIds(n)).run
  expect(r.echo).toBe('spent');expect(spendEcho(r)).toBe(r)
 })
 it('a streak of five does not stockpile two',()=>{let r=startRun();for(let n=0;n<5;n++)r=play(r,pairIds(n)).run;expect(r.echo).toBe('armed')})
 it('the echo is earned, not a hint: a run that only spent the echo is unhinted',()=>{expect(hintedRun(spendEcho(three()))).toBe(false)})
})

describe('ME-R08 timings and the one reflash',()=>{
 it('uses the specified durations',()=>{expect([FLASH_MS,RE_FLASH_MS,FUSION_MS,ECHO_MS]).toEqual([3000,1300,1150,1400])})
 it('spends the reflash once',()=>{const a=spendFlash(startRun());expect(a.flashUsed).toBe(true);expect(spendFlash(a)).toBe(a)})
})

describe('ME-R09 morale',()=>{
 it('is pairs found over pairs dealt and the wall lights at 50%',()=>{
  let r=startRun();expect(morale(r,6)).toBe(0)
  r=play(r,pairIds(0)).run;r=play(r,pairIds(1)).run;expect(wallLit(r,6)).toBe(false)
  r=play(r,pairIds(2)).run;expect(morale(r,6)).toBe(0.5);expect(wallLit(r,6)).toBe(true)
  expect(morale(r,0)).toBe(0);expect(wallLit(startRun(),2)).toBe(false)
 })
 it('is finished only when every pair is found',()=>{let r=startRun();for(let n=0;n<6;n++){expect(finished(r,6)).toBe(false);r=play(r,pairIds(n)).run}expect(finished(r,6)).toBe(true)})
})

describe('ME-R10 verdict, score and categories',()=>{
 const run=(over:Partial<MemoryRun>):MemoryRun=>({...startRun(),...over})
 it('flawless / sharp / solid / completion at their boundaries',()=>{
  expect(verdict(run({misses:0,moves:6}),6)).toBe('flawless')
  expect(verdict(run({misses:2,moves:8}),6)).toBe('sharp');expect(verdict(run({misses:3,moves:9}),6)).toBe('solid')
  expect(verdict(run({misses:6,moves:12}),6)).toBe('solid');expect(verdict(run({misses:7,moves:13}),6)).toBe('lit')
  expect(verdictKey('lit')).toBe('mem.verdict.completion');expect(verdictKey('flawless')).toBe('mem.verdict.flawless')
 })
 it('the recorded score is the best matching streak, with moves/misses/pairs separate',()=>{
  const r=run({bestStreak:4,moves:11,misses:5,perfect:['a','b']}),res=resultOf(r,6,95,6)
  expect(res.score).toBe(4);expect(res.score).toBe(r.bestStreak);expect(res.moves).toBe(11);expect(res.misses).toBe(5);expect(res.pairs).toBe(6);expect(res.perfect).toBe(2)
  expect(res.score).not.toBe(legacyBasicPoints(6,11));expect(res.scoreVersion).toBe(MEMORY_SCORE_VERSION)
 })
 it('2, 4 and 6 pair runs and hinted/unhinted runs are different categories',()=>{
  const cats=new Set([2,4,6].flatMap(s=>[true,false].map(h=>categoryOfRun(s as 2|4|6,h))));expect(cats.size).toBe(6)
  expect(resultOf(run({flashUsed:true}),4,10,4).category).toBe('p4-hinted');expect(resultOf(run({}),2,10,2).category).toBe('p2-unhinted')
 })
 it('a replacement score is versioned: old-version bests are dropped',()=>{
  const good={score:3,moves:9,misses:2,pairs:6,at:1,v:MEMORY_SCORE_VERSION}
  expect(parseBests({'p6-unhinted':good,'p6-hinted':{...good,v:1},bogus:good,'p4-hinted':{...good,score:-1}})).toEqual({'p6-unhinted':good})
  expect(MEMORY_RULES).toContain('v2')
 })
 it('bests never mix categories; higher streak wins, then fewer misses, then fewer moves',()=>{
  let b=recordBest({},'p6-unhinted',{score:3,moves:9,misses:2,pairs:6,at:1});expect(b.improved).toBe(true)
  b=recordBest(b.bests,'p2-unhinted',{score:1,moves:3,misses:1,pairs:2,at:2});expect(Object.keys(b.bests).sort()).toEqual(['p2-unhinted','p6-unhinted'])
  expect(recordBest(b.bests,'p6-unhinted',{score:2,moves:6,misses:0,pairs:6,at:3}).improved).toBe(false)
  expect(recordBest(b.bests,'p6-unhinted',{score:3,moves:8,misses:2,pairs:6,at:3}).improved).toBe(true)
  const base={score:3,moves:9,misses:2,pairs:6,at:1,v:2};expect(better(base,{...base,misses:1})).toBe(true);expect(better(base,base)).toBe(false)
 })
})

describe('model helpers',()=>{
 it('columns: 2 for small or long-faced walls, 3 otherwise',()=>{expect(columnsFor(4,5)).toBe(2);expect(columnsFor(12,10)).toBe(3);expect(columnsFor(12,LONG_FACE+1)).toBe(2)})
 it('parseSize and query round-trip',()=>{
  expect(parseSize('4')).toBe(4);expect(parseSize('5')).toBeUndefined()
  const q=new URLSearchParams(memoryQuery({seed:7,cursor:2,lang:'he',size:4,theme:'d1990',peek:false,go:true}))
  expect([q.get('seed'),q.get('r'),q.get('lang'),q.get('size'),q.get('theme'),q.get('peek'),q.get('go')]).toEqual(['7','2','he','4','d1990','0','1'])
 })
 it('run key carries the rules revision, size and theme so scores never cross',()=>{
  const a=memoryRunKey({version:'v',seed:1,cursor:0,size:6}),b=memoryRunKey({version:'v',seed:1,cursor:0,size:4}),c=memoryRunKey({version:'v',seed:1,cursor:0,size:6,theme:'d1990'})
  expect(new Set([a,b,c]).size).toBe(3);expect(a).toContain(MEMORY_RULES)
 })
 it('foundPairs keeps the found order and skips unknown ids',()=>{expect(foundPairs([{id:'a'},{id:'b'}],['b','x','a']).map(p=>p.id)).toEqual(['b','a'])})
 it('displayFace localises an ISO date and leaves anything else alone',()=>{
  expect(displayFace('1985-05-24','en')).toMatch(/24 May 1985/);expect(displayFace('1985-05-24','he')).toMatch(/1985/)
  expect(displayFace('1985-02-31','en')).toBe('1985-02-31');expect(displayFace('Champions','en')).toBe('Champions');expect(displayFace('1985/86','en')).toBe('1985/86')
 })
 it('clockOf is m:ss',()=>{expect(clockOf(75)).toBe('1:15');expect(clockOf(-3)).toBe('0:00')})
})

describe('shelf merge',()=>{
 const p={id:'k1',a:'A',b:'B',kind:'trophy',object:'trophy',factHe:null as string|null}
 it('keeps the first date and only fills a missing fact or entry',()=>{
  const s1=addToShelf({},p,100),s2=addToShelf(s1,{...p,factHe:'Won it.',href:'/x'},200)
  expect(s2.k1!.at).toBe(100);expect(s2.k1!.fact).toBe('Won it.');expect(s2.k1!.href).toBe('/x')
  const s3=addToShelf(s2,{...p,factHe:'Other.',href:'/y'},300);expect(s3).toBe(s2)
 })
})

describe('ME-R12 a closed card names nothing',()=>{
 const labels={closed:(n:number)=>`Closed card ${n}`,matched:'matched',echo:'echo'}
 const card={id:'c3',pair:'abcdef0123456789',face:'Champions 1986',kind:'trophy',object:'trophy',side:'memory'} as MemoryCard
 const html=(over:Record<string,unknown>)=>renderToStaticMarkup(createElement(WallCard,{card,n:4,order:0,open:false,done:false,wrong:false,echo:false,flashing:false,locale:'en',contentLocale:'en',labels,onFlip:()=>{},...over}))
 it('a closed card prints neither its face nor its pair key',()=>{
  const s=html({});expect(s).toContain('Closed card 4');expect(s).not.toContain('Champions');expect(s).not.toContain('abcdef0123456789');expect(s).toContain('data-card-id="c3"')
 })
 it('open and matched cards are aria-disabled, not disabled',()=>{
  const o=html({open:true});expect(o).toContain('Champions 1986');expect(o).toContain('aria-disabled="true"');expect(o).not.toMatch(/\sdisabled(=|\s|>)/)
  expect(html({done:true,order:2})).toContain('matched')
 })
})
