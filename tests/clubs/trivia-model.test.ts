import {describe,it,expect} from 'vitest'
import {ADVANCE_MAX,ADVANCE_MIN,advanceMs,askedOf,breakBefore,capOf,nextChallenges,reactionFor,reportOf,reportedScore,roundQuery,runKey,secondsOf,stageCount,stageIndex,staged,streakCall,trailingStreak,type LogEntry} from '@/lib/clubs/trivia-model'

const entry=(o:Partial<LogEntry>={}):LogEntry=>({id:'q',type:'mcq',topic:'players',difficulty:3,correct:true,hinted:false,timeout:false,elapsed:5,...o})

describe('Gate 2 · run shape (TR-R01)',()=>{
 it('a full twelve is three stages of four with clocks 20/15/11 and caps 2/3/4',()=>{
  expect(staged(12)).toBe(true);expect(stageCount(12)).toBe(3)
  expect([0,3,4,7,8,11].map(i=>secondsOf(i,12))).toEqual([20,20,15,15,11,11])
  expect([0,3,4,7,8,11].map(i=>capOf(i,12))).toEqual([2,2,3,3,4,4])
  expect([0,3,4,7,8,11].map(i=>stageIndex(i,12))).toEqual([0,0,1,1,2,2])
 })
 it('a stage card shows only before the first question of stage 2 and 3',()=>{
  expect([0,1,3,4,5,8,11].map(i=>breakBefore(i,12))).toEqual([false,false,false,true,false,true,false])
 })
 it('a short run is one stage on the first clock and holds the first cap, with no stage cards',()=>{
  expect(staged(7)).toBe(false);expect(stageCount(7)).toBe(1)
  for(let i=0;i<7;i++){expect(secondsOf(i,7)).toBe(20);expect(capOf(i,7)).toBe(2);expect(breakBefore(i,7)).toBe(false);expect(stageIndex(i,7)).toBe(0)}
 })
 it('the denominator is the real count and never more than twelve',()=>{expect(askedOf(5)).toBe(5);expect(askedOf(12)).toBe(12);expect(askedOf(40)).toBe(12)})
})

describe('Gate 2 · result categories and run identity (TR-R10)',()=>{
 const base={version:'v1',seed:7,cursor:0}
 it('practice, hard, topic and era runs of one deck are different attempts',()=>{
  const keys=[runKey({...base}),runKey({...base,practice:true}),runKey({...base,mode:'hard'}),runKey({...base,topic:'europe'}),runKey({...base,era:'1980'}),runKey({...base,mode:'history'})]
  expect(new Set(keys).size).toBe(keys.length)
 })
 it('the next cursor is a different attempt',()=>expect(runKey({...base,cursor:1})).not.toBe(runKey(base)))
 it('a practice run reports no score; a standard run reports its floor',()=>{expect(reportedScore(4321.9,true)).toBe(0);expect(reportedScore(4321.9,false)).toBe(4321);expect(reportedScore(-5,false)).toBe(0)})
 it('a challenge link carries the same mode and filters and the next slice of the deck',()=>{
  const q=new URLSearchParams(roundQuery({seed:9,cursor:3,lang:'he',mode:'hard',topic:'europe',era:'1990',go:true,practice:true}))
  expect(Object.fromEntries(q)).toEqual({seed:'9',r:'3',lang:'he',mode:'hard',topic:'europe',era:'1990',go:'1',practice:'1'})
  expect(roundQuery({seed:1,cursor:0,lang:'en'})).toBe('seed=1&r=0&lang=en')
 })
})

describe('Gate 2 · the verdict plate stays long enough to read',()=>{
 it('is bounded and grows with the explanation',()=>{
  expect(advanceMs('',false)).toBe(ADVANCE_MIN);expect(advanceMs('x'.repeat(5000),true)).toBe(ADVANCE_MAX)
  expect(advanceMs('x'.repeat(80),false)).toBeGreaterThan(advanceMs('x'.repeat(20),false));expect(advanceMs('abc',true)).toBeGreaterThan(advanceMs('abc',false))
 })
})

describe('Gate 2 · reactions and streak calls',()=>{
 it('a miss and a timeout are told apart; a deep right answer and a fast one are noticed',()=>{
  expect(reactionFor(entry({correct:false,timeout:true}),0,0).key).toBe('timeout');expect(reactionFor(entry({correct:false}),0,1).key).toBe('miss')
  expect(reactionFor(entry({difficulty:5}),1,0).key).toBe('deep');expect(reactionFor(entry({elapsed:2}),1,0).key).toBe('fast')
  expect(reactionFor(entry({elapsed:2,hinted:true}),1,0).key).not.toBe('fast')
  expect(reactionFor(entry(),3,0).key).toBe('onit');expect(reactionFor(entry(),5,0).key).toBe('fire');expect(reactionFor(entry(),1,0).key).toBe('hit')
 })
 it('streak calls start at two and only on the way up',()=>{expect([0,1,2,3,4,5,9].map(streakCall)).toEqual([null,null,'tq.call.2','tq.call.3','tq.call.4','tq.call.many','tq.call.many'])})
 it('counts the trailing streak only',()=>{expect(trailingStreak([{correct:false},{correct:true},{correct:true}])).toBe(2);expect(trailingStreak([])).toBe(0)})
})

describe('Gate 2 · what a run says about itself comes from its log',()=>{
 const log=[entry({topic:'europe'}),entry({topic:'europe'}),entry({topic:'kits',correct:false}),entry({topic:'kits',correct:false,timeout:true}),entry({topic:'players',hinted:true,difficulty:5})]
 const r=reportOf(log,12,1)
 it('best streak, hardest answered, timeouts and hints are counted from the entries',()=>{expect(r.bestStreak).toBe(2);expect(r.hardest).toBe(5);expect(r.timeouts).toBe(1);expect(r.hinted).toBe(1)})
 it('weakest needs more misses than hits; strongest needs a hit',()=>{expect(r.weakest).toBe('kits');expect(r.strongest).toBe('europe')})
 it('an empty log has no strongest, weakest or hardest',()=>{const e=reportOf([],12,3);expect(e.weakest).toBeNull();expect(e.strongest).toBeNull();expect(e.hardest).toBeNull()})
 it('next doors: the weak topic, a harder run only if it can be dealt, a mix after a filtered run',()=>{
  const avail=['kits','europe'] as const
  expect(nextChallenges({report:r,share:0.5,hard:false,topic:undefined,available:avail,hardOpen:true})).toEqual([{kind:'weak',topic:'kits'}])
  expect(nextChallenges({report:{...r,weakest:null},share:0.9,hard:false,topic:undefined,available:avail,hardOpen:true})).toEqual([{kind:'hard'}])
  expect(nextChallenges({report:{...r,weakest:null},share:0.9,hard:false,topic:undefined,available:avail,hardOpen:false})).toEqual([])
  expect(nextChallenges({report:{...r,weakest:null},share:0.2,hard:false,topic:'kits',available:avail,hardOpen:true})).toEqual([{kind:'mix'}])
  expect(nextChallenges({report:r,share:0.9,hard:false,topic:undefined,available:['europe'],hardOpen:true})).toEqual([{kind:'hard'}])
 })
})
