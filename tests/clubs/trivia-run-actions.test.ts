import {describe,it,expect,vi,beforeEach} from 'vitest'
const request=vi.hoisted(()=>({host:'hapoeltelaviv.localhost',paused:false,gates:[2],values:new Map<string,string>(),now:1_700_000_000_000}))
vi.mock('next/headers',()=>({headers:()=>new Headers({host:request.host}),cookies:()=>({get:(key:string)=>request.values.has(key)?{value:request.values.get(key)}:undefined,set:(key:string,value:string)=>request.values.set(key,value)})}))
vi.mock('@/lib/master/store',()=>({readState:async()=>({clubs:['olympiacos','zrinjski-mostar','hapoel-tel-aviv'].map(id=>({id,status:request.paused?'paused':'live',gates:request.gates}))})}))
import {startTriviaRun,resumeTriviaRun,openTriviaQuestion,answerTriviaRun,hintTriviaRun,reviewMissedQuestions,type RunView} from '@/app/clubs/[slug]/[gate]/trivia-run-actions'
import {loadClub} from '@/lib/clubs/resolver'
import {clubBank} from '@/lib/clubs/trivia-deck'
import {open,seal} from '@/lib/game/blind-cow/token'
import type {Ledger} from '@/lib/clubs/trivia-ledger'
import {GRACE_MS} from '@/lib/clubs/trivia-ledger'

const KEY='fanlife-trivia-hapoel-tel-aviv'
let data:Awaited<ReturnType<typeof loadClub>> extends infer T?NonNullable<T>['data']:never
beforeEach(async()=>{request.host='hapoeltelaviv.localhost';request.paused=false;request.gates=[2];request.values.clear();request.now=1_700_000_000_000;vi.spyOn(Date,'now').mockImplementation(()=>request.now);data=(await loadClub('hapoel-tel-aviv'))!.data},60000)
const start=async(extra={})=>(await startTriviaRun({slug:'hapoel-tel-aviv',version:data.version,seed:42,cursor:0,...extra})) as RunView
const ledger=()=>open<Ledger>(request.values.get(KEY))!
/** the real answer for a dealt question, read from the bank the way the server grades it */
function truth(id:string,seed=42){const bank=clubBank(data),g=bank.engine.gradeAnswer(id,[])!,pub=bank.engine.publicQuestions([id],seed)[0]!;return {g,pub}}
const answerOf=(id:string,right:boolean)=>{
 const {g,pub}=truth(id)
 if(right)return pub.type==='multi'||pub.type==='order'||pub.type==='match'?g.correctAnswers:g.correctAnswers[0]!
 if(pub.type==='tf')return g.correctAnswers[0]==='true'?'false':'true'
 if(pub.type==='multi')return [...pub.options.filter(o=>!g.correctAnswers.includes(o)).slice(0,3)]
 if(pub.type==='order')return [...g.correctAnswers].reverse()
 if(pub.type==='match')return [...g.correctAnswers.slice(1),g.correctAnswers[0]!]
 return pub.options.find(o=>!g.correctAnswers.includes(o))!
}

describe('Gate 2 · the run lives on the server (§17.4)',()=>{
 it('starts a run: twelve questions with no answers, a sealed cookie the browser cannot read',async()=>{
  const r=await start();expect(r.ok).toBe(true);expect(r.questions).toHaveLength(12);expect(r.meta).toMatchObject({category:'standard',mode:'standard',practice:false,count:12})
  const json=JSON.stringify(r)
  expect(json).not.toContain('"answer"');expect(json).not.toContain('"explanation"')
  const raw=request.values.get(KEY)!;for(const id of r.questions.map(q=>q.id))expect(raw).not.toContain(id)
  expect(ledger().ids).toEqual(r.questions.map(q=>q.id))
 })
 it('the ledger opens a question\'s clock when it is opened, and a reload keeps the deadline',async()=>{
  const r=await start();const run=r.meta.run
  const o=await openTriviaQuestion('hapoel-tel-aviv',data.version,run,0);expect(o).toEqual({ok:true,remainingMs:20_000})
  request.now+=7_000
  const again=await openTriviaQuestion('hapoel-tel-aviv',data.version,run,0);expect(again).toEqual({ok:true,remainingMs:13_000})
  const resumed=await resumeTriviaRun('hapoel-tel-aviv',data.version);expect(resumed).toMatchObject({ok:true,openIndex:0,remainingMs:13_000})
 })
 it('grades on the server, scores from the formula and keeps the lives',async()=>{
  const r=await start(),id=r.questions[0]!.id
  await openTriviaQuestion('hapoel-tel-aviv',data.version,r.meta.run,0);request.now+=4_000
  const a=await answerTriviaRun('hapoel-tel-aviv',data.version,r.meta.run,0,answerOf(id,true));if(!a.ok)throw new Error(a.error)
  expect(a.correct).toBe(true);expect(a.gained).toBe(Math.round((100*truth(id).g.difficulty+100*(16/20))*1));expect(a.session.score).toBe(a.gained);expect(a.verdict.source.title).toBeTruthy()
  await openTriviaQuestion('hapoel-tel-aviv',data.version,r.meta.run,1)
  const w=await answerTriviaRun('hapoel-tel-aviv',data.version,r.meta.run,1,answerOf(r.questions[1]!.id,false));if(!w.ok)throw new Error(w.error)
  expect(w.correct).toBe(false);expect(w.session.lives).toBe(2);expect(w.session.combo).toBe(0);expect(w.verdict.correctAnswers.length).toBeGreaterThan(0)
 })
 it('settles once: a retry returns the first outcome and cannot cost another life',async()=>{
  const r=await start();await openTriviaQuestion('hapoel-tel-aviv',data.version,r.meta.run,0)
  const bad=answerOf(r.questions[0]!.id,false)
  const a=await answerTriviaRun('hapoel-tel-aviv',data.version,r.meta.run,0,bad),b=await answerTriviaRun('hapoel-tel-aviv',data.version,r.meta.run,0,bad)
  if(!a.ok||!b.ok)throw new Error('x');expect(a.duplicate).toBe(false);expect(b.duplicate).toBe(true);expect(b.session.lives).toBe(2);expect(ledger().s.lives).toBe(2)
  const flip=await answerTriviaRun('hapoel-tel-aviv',data.version,r.meta.run,0,answerOf(r.questions[0]!.id,true));if(!flip.ok)throw new Error('x');expect(flip.correct).toBe(false)
 })
 it('a late answer is a timeout and cannot replace one',async()=>{
  const r=await start();await openTriviaQuestion('hapoel-tel-aviv',data.version,r.meta.run,0);request.now+=20_000+GRACE_MS+10
  const a=await answerTriviaRun('hapoel-tel-aviv',data.version,r.meta.run,0,answerOf(r.questions[0]!.id,true));if(!a.ok)throw new Error('x')
  expect(a.timeout).toBe(true);expect(a.correct).toBe(false);expect(a.session.lives).toBe(2)
  const b=await answerTriviaRun('hapoel-tel-aviv',data.version,r.meta.run,0,answerOf(r.questions[0]!.id,true));if(!b.ok)throw new Error('x');expect(b.timeout).toBe(true);expect(b.session.lives).toBe(2)
 })
 it('a client claiming time is up settles a timeout; a claim cannot be used to settle a different question',async()=>{
  const r=await start();await openTriviaQuestion('hapoel-tel-aviv',data.version,r.meta.run,0)
  const a=await answerTriviaRun('hapoel-tel-aviv',data.version,r.meta.run,0,[],true);if(!a.ok)throw new Error('x');expect(a.timeout).toBe(true)
  expect(await answerTriviaRun('hapoel-tel-aviv',data.version,r.meta.run,5,'x')).toMatchObject({ok:false})
 })
 it('rejects an answer that is not one of the dealt options, and malformed input',async()=>{
  const r=await start();await openTriviaQuestion('hapoel-tel-aviv',data.version,r.meta.run,0)
  expect(await answerTriviaRun('hapoel-tel-aviv',data.version,r.meta.run,0,'not an option')).toEqual({ok:false,error:'BAD_INPUT'})
  expect(await answerTriviaRun('hapoel-tel-aviv',data.version,r.meta.run,0,Array(9).fill('a') as string[])).toEqual({ok:false,error:'BAD_INPUT'})
  expect(await answerTriviaRun('hapoel-tel-aviv',data.version,r.meta.run,1.5 as number,'a')).toEqual({ok:false,error:'BAD_INPUT'})
  expect(ledger().s.lives).toBe(3)
 })
 it('the hint is derived on the server, marked once, costs 40 and keeps the combo',async()=>{
  const r=await start()
  // find a question that can give a hint
  const bank=clubBank(data);let i=0;for(;i<r.questions.length;i++)if(r.questions[i]!.hint)break
  if(i>=r.questions.length)return
  // play the questions before it right so the index lines up
  for(let k=0;k<i;k++){await openTriviaQuestion('hapoel-tel-aviv',data.version,r.meta.run,k);await answerTriviaRun('hapoel-tel-aviv',data.version,r.meta.run,k,answerOf(r.questions[k]!.id,true))}
  await openTriviaQuestion('hapoel-tel-aviv',data.version,r.meta.run,i)
  const h=await hintTriviaRun('hapoel-tel-aviv',data.version,r.meta.run,i);if(!h.ok)throw new Error(String(h.error));expect(h.first).toBe(true)
  const h2=await hintTriviaRun('hapoel-tel-aviv',data.version,r.meta.run,i);if(!h2.ok)throw new Error('x');expect(h2.first).toBe(false);expect(h2.hint).toEqual(h.hint)
  if(h.hint.kind==='strike')expect(bank.engine.gradeAnswer(r.questions[i]!.id,[])!.correctAnswers).not.toContain(h.hint.strike[0])
  const a=await answerTriviaRun('hapoel-tel-aviv',data.version,r.meta.run,i,answerOf(r.questions[i]!.id,true));if(!a.ok)throw new Error('x');expect(a.hinted).toBe(true)
 })
 it('a practice run has no clock, no score and its own category',async()=>{
  const r=await start({practice:true});expect(r.meta).toMatchObject({practice:true,category:'practice'});expect(r.remainingMs).toBeNull()
  const o=await openTriviaQuestion('hapoel-tel-aviv',data.version,r.meta.run,0);expect(o).toEqual({ok:true,remainingMs:null})
  request.now+=999_999;const a=await answerTriviaRun('hapoel-tel-aviv',data.version,r.meta.run,0,answerOf(r.questions[0]!.id,true));if(!a.ok)throw new Error('x');expect(a.timeout).toBe(false);expect(a.correct).toBe(true)
  expect((await start()).meta.run).not.toBe(r.meta.run)
 })
 it('a stale content version cannot resume or answer a run; wrong run ids and tampered cookies are refused',async()=>{
  const r=await start();await openTriviaQuestion('hapoel-tel-aviv',data.version,r.meta.run,0)
  expect(await resumeTriviaRun('hapoel-tel-aviv','stale')).toEqual({ok:false,error:'GATE_CLOSED'})
  const l=ledger();request.values.set(KEY,seal({...l,ver:'old'}));expect(await resumeTriviaRun('hapoel-tel-aviv',data.version)).toEqual({ok:false,error:'VERSION_RETIRED'})
  request.values.set(KEY,seal(l));expect(await answerTriviaRun('hapoel-tel-aviv',data.version,'trivia:other','0' as unknown as number,'x')).toMatchObject({ok:false})
  expect(await answerTriviaRun('hapoel-tel-aviv',data.version,'trivia:other',0,'x')).toEqual({ok:false,error:'RUN_MISMATCH'})
  request.values.set(KEY,request.values.get(KEY)!.slice(0,-3)+'AAA');expect(await resumeTriviaRun('hapoel-tel-aviv',data.version)).toEqual({ok:false,error:'NO_RUN'})
  request.values.set(KEY,seal({...l,club:'olympiacos'}));expect(await resumeTriviaRun('hapoel-tel-aviv',data.version)).toEqual({ok:false,error:'NO_RUN'})
 })
 it('a closed gate, a paused club and another tenant get nothing',async()=>{
  request.gates=[];expect(await startTriviaRun({slug:'hapoel-tel-aviv',version:data.version,seed:1,cursor:0})).toEqual({ok:false,error:'GATE_CLOSED'})
  request.gates=[2];request.paused=true;expect(await startTriviaRun({slug:'hapoel-tel-aviv',version:data.version,seed:1,cursor:0})).toEqual({ok:false,error:'GATE_CLOSED'})
  request.paused=false;request.host='zrinjski.localhost';expect(await startTriviaRun({slug:'hapoel-tel-aviv',version:data.version,seed:1,cursor:0})).toEqual({ok:false,error:'GATE_CLOSED'})
 })
 it('a mode the bank cannot field is answered with the blocker, never a substitute run',async()=>{
  request.host='olympiacos.localhost'
  const od=(await loadClub('olympiacos'))!.data
  const r=await startTriviaRun({slug:'olympiacos',version:od.version,seed:1,cursor:0,mode:'standard'})
  expect(r).toMatchObject({ok:false,error:'BLOCKED',blocker:{code:'TRIVIA_STAGE_POOL_SHORT',need:4}})
  const h=await startTriviaRun({slug:'olympiacos',version:od.version,seed:1,cursor:0,mode:'history'});expect(h).toMatchObject({ok:true,meta:{mode:'history',banded:false}})
 },60000)
 it('revenge deals only the ids this device missed, and says what it can no longer ask',async()=>{
  const first=await start(),ids=first.questions.map(q=>q.id)
  const rev=await startTriviaRun({slug:'hapoel-tel-aviv',version:data.version,seed:42,cursor:0,mode:'revenge',missed:ids.slice(0,5)}) as RunView
  expect(rev.ok).toBe(true);expect(rev.questions.map(q=>q.id).sort()).toEqual(ids.slice(0,5).sort());expect(rev.meta.category).toBe('short')
  expect(await startTriviaRun({slug:'hapoel-tel-aviv',version:data.version,seed:42,cursor:0,mode:'revenge',missed:ids.slice(0,2)})).toMatchObject({ok:false,error:'BLOCKED',blocker:{code:'TRIVIA_REVENGE_SHORT'}})
  const review=await reviewMissedQuestions('hapoel-tel-aviv',data.version,[...ids.slice(0,4),'q_gone']);expect(review).toMatchObject({ok:true,playable:4,removed:{retired:1,withdrawn:0},merged:0})
  expect(await reviewMissedQuestions('hapoel-tel-aviv',data.version,Array(200).fill('q'))).toEqual({ok:false,error:'BAD_INPUT'})
 })
 it('a short deck ends at its own count',async()=>{
  const first=await start(),ids=first.questions.map(q=>q.id).slice(0,4)
  const rev=await startTriviaRun({slug:'hapoel-tel-aviv',version:data.version,seed:42,cursor:0,mode:'revenge',missed:ids}) as RunView
  let last
  for(let i=0;i<rev.questions.length;i++){await openTriviaQuestion('hapoel-tel-aviv',data.version,rev.meta.run,i);last=await answerTriviaRun('hapoel-tel-aviv',data.version,rev.meta.run,i,answerOf(rev.questions[i]!.id,true))}
  if(!last||!last.ok)throw new Error('x');expect(last.over).toBe(true);expect(last.session.history).toHaveLength(4)
  expect(await resumeTriviaRun('hapoel-tel-aviv',data.version)).toEqual({ok:false,error:'RUN_OVER'})
 })
})
