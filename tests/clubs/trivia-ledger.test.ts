import {describe,it,expect} from 'vitest'
import {GRACE_MS,deadlineOf,finalScore,isOver,livesLeft,markHint,openQuestion,settleQuestion,startLedger,totalOf,type Ledger} from '@/lib/clubs/trivia-ledger'
import {pointsFor} from '@/lib/game/session'

const ids=(n:number)=>Array.from({length:n},(_,i)=>`q_${i}`)
const mk=(o:Partial<Parameters<typeof startLedger>[0]>={})=>startLedger({run:'r',club:'c',ver:'v',seed:1,cursor:0,cat:'standard',mode:'standard',practice:false,banded:true,ids:ids(12),...o})
const T0=1_000_000
const open=(l:Ledger,i:number,now:number)=>{const r=openQuestion(l,i,now);if(!r.ok)throw new Error(r.error);return r.ledger}
const settle=(l:Ledger,i:number,now:number,correct:boolean,difficulty=3,timeout=false)=>{const r=settleQuestion(l,i,now,{correct,difficulty},timeout);if(!r.ok)throw new Error(r.error);return r}
/** open and settle question i right away at `at` ms after opening */
const play=(l:Ledger,i:number,correct:boolean,after=0,difficulty=3,t0=T0+i*100_000)=>settle(open(l,i,t0),i,t0+after,correct,difficulty).ledger

describe('Gate 2 · the score is the rulebook formula (TR-R02, R07)',()=>{
 it('round((100·difficulty + 100·clamp(secondsLeft/total,0,1)) · multiplier), with the stage clock and cap',()=>{
  const l=open(mk(),0,T0),r=settle(l,0,T0+5_000,true,3)
  expect(r.gained).toBe(Math.round((100*3+100*(15/20))*1));expect(r.multiplier).toBe(1);expect(r.session.score).toBe(r.gained)
  expect(pointsFor(3,1,15,20,2)).toBe(r.gained)
 })
 it('the combo multiplier climbs 1,2,3,… capped per stage (2/3/4)',()=>{
  let l=mk();const gains:number[]=[]
  for(let i=0;i<12;i++){const t0=T0+i*100_000;l=open(l,i,t0);const r=settle(l,i,t0,true,2);l=r.ledger;gains.push(r.gained)}
  const total=(i:number)=>totalOf(l,i)
  const expected=Array.from({length:12},(_,i)=>pointsFor(2,i+1,total(i),total(i),i<4?2:i<8?3:4))
  expect(gains).toEqual(expected)
  expect(l.s.bestCombo).toBe(12)
 })
 it('time left is clamped to the stage clock',()=>{const l=open(mk(),0,T0),r=settle(l,0,T0-5_000,true,1);expect(r.gained).toBe(200)})
 it('a hint costs 40 points floored at zero and the combo holds instead of climbing',()=>{
  let l=play(mk(),0,true);expect(l.s.combo).toBe(1)
  l=open(l,1,T0+100_000);const h=markHint(l,1,T0+100_000);if(!h.ok)throw 0;l=h.ledger
  const r=settle(l,1,T0+100_000,true,1);expect(r.hinted).toBe(true);expect(r.combo).toBe(1);expect(r.gained).toBe(Math.max(0,pointsFor(1,1,20,20,2)-40));expect(r.session.combo).toBe(1)
  const floor=open(mk({ids:ids(12)}),0,T0),hf=markHint(floor,0,T0);if(!hf.ok)throw 0
  const zero=settle(hf.ledger,0,T0+20_000,true,1);expect(zero.gained).toBe(Math.max(0,pointsFor(1,1,0,20,2)-40));expect(zero.gained).toBeGreaterThanOrEqual(0)
 })
 it('a miss resets the combo, costs a life and gains nothing',()=>{
  let l=play(mk(),0,true);l=play(l,1,true);const before=l.s.score
  const r=settle(open(l,2,T0+300_000),2,T0+300_000,false);expect(r.session.combo).toBe(0);expect(r.session.lives).toBe(2);expect(r.session.score).toBe(before);expect(r.gained).toBe(0);expect(r.session.bestCombo).toBe(2)
 })
 it('a practice run has no clock and no score on the ticket',()=>{
  const l=mk({practice:true});expect(totalOf(l,0)).toBe(0);expect(deadlineOf(open(l,0,T0),0)).toBeNull()
  expect(finalScore(play(l,0,true))).toBe(0)
 })
})

describe('Gate 2 · the deadline is the server\'s (TR-R06)',()=>{
 it('the clock starts when the question is OPENED and is not reset by opening it again',()=>{
  const l=open(mk(),0,T0),again=openQuestion(l,0,T0+9_000);if(!again.ok)throw 0
  expect(again.openedAt).toBe(T0);expect(again.remainingMs).toBe(20_000-9_000);expect(again.ledger).toBe(l);expect(deadlineOf(l,0)).toBe(T0+20_000)
 })
 it('stage clocks are 20, 15 and 11 seconds',()=>{const l=mk();expect([0,4,8].map(i=>totalOf(l,i))).toEqual([20,15,11])})
 it('an answer after the deadline is a timeout, whatever it says',()=>{
  const r=settle(open(mk(),0,T0),0,T0+20_000+GRACE_MS+1,true)
  expect(r.timeout).toBe(true);expect(r.correct).toBe(false);expect(r.session.lives).toBe(2);expect(r.gained).toBe(0)
 })
 it('the network grace covers a slow answer and nothing else',()=>{
  const ok=settle(open(mk(),0,T0),0,T0+20_000+GRACE_MS,true);expect(ok.timeout).toBe(false);expect(ok.correct).toBe(true)
 })
 it('the browser saying "time is up" settles a timeout once',()=>{
  const r=settle(open(mk(),0,T0),0,T0+1_000,false,3,true);expect(r.timeout).toBe(true);expect(r.session.lives).toBe(2)
  const r2=settleQuestion(r.ledger,0,T0+1_500,{correct:true,difficulty:3},false);if(!r2.ok)throw 0
  expect(r2.duplicate).toBe(true);expect(r2.timeout).toBe(true);expect(r2.correct).toBe(false);expect(r2.session.lives).toBe(2)
 })
 it('a timeout in practice is impossible: there is no clock',()=>{const r=settle(open(mk({practice:true}),0,T0),0,T0+10_000_000,true);expect(r.timeout).toBe(false);expect(r.correct).toBe(true)})
})

describe('Gate 2 · answers settle once (TR-R08)',()=>{
 it('a retry returns the first outcome and cannot subtract another life',()=>{
  const first=settle(open(mk(),0,T0),0,T0+1_000,false)
  const again=settleQuestion(first.ledger,0,T0+2_000,{correct:false,difficulty:3});if(!again.ok)throw 0
  expect(again.duplicate).toBe(true);expect(again.ledger).toBe(first.ledger);expect(again.session.lives).toBe(2);expect(again.session.score).toBe(first.session.score)
  const flipped=settleQuestion(first.ledger,0,T0+2_000,{correct:true,difficulty:3});if(!flipped.ok)throw 0
  expect(flipped.correct).toBe(false);expect(flipped.session.lives).toBe(2)
 })
 it('questions open and settle in order',()=>{
  const l=mk()
  expect(openQuestion(l,1,T0)).toEqual({ok:false,error:'OUT_OF_ORDER'});expect(openQuestion(l,12,T0)).toEqual({ok:false,error:'BAD_INDEX'});expect(openQuestion(l,-1,T0)).toEqual({ok:false,error:'BAD_INDEX'})
  const o=open(l,0,T0);expect(openQuestion(o,1,T0)).toEqual({ok:false,error:'OUT_OF_ORDER'})
  expect(settleQuestion(l,0,T0,{correct:true,difficulty:1})).toEqual({ok:false,error:'NOT_OPEN'})
  const d=play(l,0,true);expect(openQuestion(d,0,T0)).toEqual({ok:false,error:'OUT_OF_ORDER'})
 })
})

describe('Gate 2 · the hint is asked once, while the question is open (TR-R09)',()=>{
 it('marks once, and a second ask is not a second cost',()=>{
  const l=open(mk(),0,T0),a=markHint(l,0,T0);if(!a.ok)throw 0;expect(a.first).toBe(true)
  const b=markHint(a.ledger,0,T0+100);if(!b.ok)throw 0;expect(b.first).toBe(false);expect(b.ledger).toBe(a.ledger)
 })
 it('is refused before the question is open, after it settled and after its deadline',()=>{
  expect(markHint(mk(),0,T0)).toEqual({ok:false,error:'NOT_OPEN'})
  expect(markHint(play(mk(),0,true),0,T0)).toEqual({ok:false,error:'OUT_OF_ORDER'})
  expect(markHint(open(mk(),0,T0),0,T0+20_000+GRACE_MS+1)).toEqual({ok:false,error:'OUT_OF_ORDER'})
 })
})

describe('Gate 2 · lives and the end of a run (TR-R01)',()=>{
 it('three lives: the third miss ends the run even with questions left',()=>{
  let l=mk();for(let i=0;i<3;i++)l=play(l,i,false)
  expect(l.s.lives).toBe(0);expect(isOver(l)).toBe(true);expect(livesLeft(l)).toBe(0);expect(openQuestion(l,3,T0)).toEqual({ok:false,error:'RUN_OVER'})
 })
 it('a timeout costs one life exactly like a miss',()=>{const r=settle(open(mk(),0,T0),0,T0,false,3,true);expect(livesLeft(r.ledger)).toBe(2)})
 it('a short deck ends at its own count, not the native twelve',()=>{
  let l=mk({ids:ids(5),banded:false});for(let i=0;i<5;i++)l=play(l,i,true)
  expect(isOver(l)).toBe(true);expect(l.s.over).toBe(true);expect(l.s.history).toHaveLength(5)
 })
 it('twelve answers end a full run with the sum of what each earned',()=>{
  let l=mk();for(let i=0;i<12;i++)l=play(l,i,true)
  expect(isOver(l)).toBe(true);expect(finalScore(l)).toBe(l.e.reduce((s,e)=>s+e.g,0))
 })
 it('a reload mid-question keeps the deadline: the ledger is the whole record',()=>{
  const l=open(mk(),0,T0),copy=JSON.parse(JSON.stringify(l)) as Ledger
  const r=openQuestion(copy,0,T0+7_000);if(!r.ok)throw 0;expect(r.remainingMs).toBe(13_000)
 })
})
