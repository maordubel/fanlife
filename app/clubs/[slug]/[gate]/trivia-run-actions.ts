'use server'
import {cookies} from 'next/headers'
import {requestClub} from '@/lib/clubs/request'
import {clubBank,dealMode,reviewMissed,categoryOf,type Blocker,type Bank} from '@/lib/clubs/trivia-deck'
import {resolveHint,type HintPlan} from '@/lib/clubs/trivia-bank'
import {markHint,openQuestion,settleQuestion,startLedger,isOver,type Ledger,type LedgerError} from '@/lib/clubs/trivia-ledger'
import {runKey,secondsOf} from '@/lib/clubs/trivia-model'
import {seal,open} from '@/lib/game/blind-cow/token'
import type {PublicQuestion,SourceRef} from '@/lib/game/questions/types'
import type {Session} from '@/lib/game/session'

/**
 * Gate 2 · the run, on the server (rulebook §17.4, TR-R01, R06..R09). The browser asks to START a run, to OPEN a
 * question, to ANSWER it and to take its HINT; the server deals the ids, keeps the clock and the lives, grades,
 * scores, and tells the browser what happened. Nothing the browser sends is a total.
 *
 * The run's record is a sealed httpOnly cookie (`trivia-ledger.ts` is its arithmetic): the browser can neither read
 * the dealt ids nor edit a life. Tenant, gate switch and content version are checked on every call, exactly as the
 * single-answer action does; a stale version cannot resume a run (`VERSION_RETIRED`), because grading an old run
 * against a corrected bank without telling the player would be a quiet change of the truth.
 */
export type RunQuestion=PublicQuestion&{hint:boolean}
export type RunMeta={run:string;category:string;mode:string;banded:boolean;practice:boolean;seed:number;cursor:number;topic:string;era:string;count:number}
export type SettledEntry={id:string;correct:boolean;timeout:boolean;hinted:boolean;gained:number}
export type Fail={ok:false;error:LedgerError|'GATE_CLOSED'|'BAD_INPUT'|'BLOCKED'|'UNAVAILABLE';blocker?:Blocker}
export type RunView={ok:true;meta:RunMeta;questions:RunQuestion[];settled:SettledEntry[];session:Session;openIndex:number|null;remainingMs:number|null}
export type Verdict={correct:boolean;correctAnswers:string[];hits:number;explanation:string;difficulty:number;source:SourceRef}
export type AnswerView={ok:true;duplicate:boolean;timeout:boolean;correct:boolean;hinted:boolean;gained:number;combo:number;multiplier:number;left:number;session:Session;over:boolean;verdict:Verdict}
export type HintView={ok:true;hint:HintPlan;first:boolean}|Fail

const cookieName=(club:string)=>`fanlife-trivia-${club}`
const MAX_IDS=80
const text=(v:unknown,max=100)=>typeof v==='string'&&v.length<=max
const int=(v:unknown)=>typeof v==='number'&&Number.isInteger(v)

async function gate(slug:unknown,version:unknown){
 if(!text(slug)||!text(version))return null
 const resolved=await requestClub(slug as string,2)
 if(!resolved||resolved.data.version!==version||!resolved.data.gates.trivia.playable)return null
 return {data:resolved.data,bank:clubBank(resolved.data)}
}
function read(slug:string,version:string):Ledger|Fail{
 const l=open<Ledger>(cookies().get(cookieName(slug))?.value)
 if(!l||l.v!==1||l.club!==slug||!Array.isArray(l.ids)||!Array.isArray(l.e))return {ok:false,error:'NO_RUN'}
 if(l.ver!==version)return {ok:false,error:'VERSION_RETIRED'}
 return l
}
function write(l:Ledger){cookies().set(cookieName(l.club),seal(l),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*6})}

function questionsOf(bank:Bank,ids:readonly string[],seed:number):RunQuestion[]{
 const out:RunQuestion[]=[]
 for(const q of bank.engine.publicQuestions(ids,seed)){
  const original=bank.byId.get(q.id)
  out.push({...q,hint:!!original&&resolveHint(original,q.options,seed)!==null})
 }
 return out
}
const metaOf=(l:Ledger):RunMeta=>({run:l.run,category:l.practice?'practice':l.cat,mode:l.mode,banded:l.banded,practice:l.practice,seed:l.seed,cursor:l.cursor,topic:l.topic,era:l.era,count:l.ids.length})
function viewOf(bank:Bank,l:Ledger,now:number):RunView{
 const settled=l.e.filter(e=>e.st!==0).map((e,i)=>({id:l.ids[i]!,correct:e.st===1,timeout:e.st===3,hinted:e.h===1,gained:e.g}))
 const open=l.e.findIndex(e=>e.st===0)
 const remaining=open>=0&&!l.practice?Math.max(0,l.e[open]!.o+secondsOf(open,l.ids.length)*1000-now):null
 return {ok:true,meta:metaOf(l),questions:questionsOf(bank,l.ids,l.seed),settled,session:l.s,openIndex:open>=0?open:null,remainingMs:remaining}
}

export type StartInput={slug:string;version:string;seed:number;cursor:number;mode?:string;topic?:string;era?:string;practice?:boolean;missed?:string[]}
/** deal a run and open its ledger; a bank that cannot field the mode answers with the blocker, never a substitute */
export async function startTriviaRun(input:StartInput):Promise<RunView|Fail>{
 if(!input||!int(input.seed)||!int(input.cursor)||input.cursor<0||input.cursor>10000)return {ok:false,error:'BAD_INPUT'}
 if(!text(input.mode??'',20)||!text(input.topic??'',20)||!text(input.era??'',8))return {ok:false,error:'BAD_INPUT'}
 if(input.missed!==undefined&&(!Array.isArray(input.missed)||input.missed.length>MAX_IDS||!input.missed.every(x=>text(x,40))))return {ok:false,error:'BAD_INPUT'}
 const ctx=await gate(input.slug,input.version)
 if(!ctx)return {ok:false,error:'GATE_CLOSED'}
 const practice=input.practice===true
 const dealt=dealMode(ctx.bank,{mode:input.mode,topic:input.topic,era:input.era,practice},input.seed,input.cursor,input.missed??[])
 if('blocked' in dealt)return {ok:false,error:'BLOCKED',blocker:dealt.blocked}
 const run=runKey({version:input.version,seed:input.seed,cursor:dealt.cursor,mode:dealt.mode,topic:dealt.topic??'',era:dealt.era?String(dealt.era):'',practice})+(dealt.mode==='revenge'?`:${dealt.ids.length}:${dealt.ids[0]}`:'')
 const ledger=startLedger({run,club:input.slug,ver:input.version,seed:input.seed,cursor:dealt.cursor,cat:categoryOf(dealt,false),mode:dealt.mode,topic:dealt.topic,era:dealt.era,practice,banded:dealt.banded,ids:dealt.ids})
 write(ledger)
 return viewOf(ctx.bank,ledger,Date.now())
}

/** the run in progress on this device, if any — a reload picks the same deck, the same lives and the same deadline */
export async function resumeTriviaRun(slug:string,version:string):Promise<RunView|Fail>{
 const ctx=await gate(slug,version)
 if(!ctx)return {ok:false,error:'GATE_CLOSED'}
 const l=read(slug,version)
 if('ok' in l)return l
 if(isOver(l))return {ok:false,error:'RUN_OVER'}
 return viewOf(ctx.bank,l,Date.now())
}

function ledgerFor(slug:string,version:string,run:unknown,index:unknown):Ledger|Fail{
 if(!text(run,300)||!int(index))return {ok:false,error:'BAD_INPUT'}
 const l=read(slug,version)
 if('ok' in l)return l
 if(l.run!==run)return {ok:false,error:'RUN_MISMATCH'}
 return l
}

/** question `index` is now on screen: the clock starts HERE (after the load, never while the card is being read) */
export async function openTriviaQuestion(slug:string,version:string,run:string,index:number):Promise<{ok:true;remainingMs:number|null}|Fail>{
 const ctx=await gate(slug,version)
 if(!ctx)return {ok:false,error:'GATE_CLOSED'}
 const l=ledgerFor(slug,version,run,index)
 if('ok' in l)return l
 const r=openQuestion(l,index,Date.now())
 if(!r.ok)return r
 if(r.ledger!==l)write(r.ledger)
 return {ok:true,remainingMs:r.remainingMs}
}

/** grade ONE answer on the server; a retry returns the first outcome, a late answer is a timeout */
export async function answerTriviaRun(slug:string,version:string,run:string,index:number,answer:string|string[],timeout=false):Promise<AnswerView|Fail>{
 if(!(typeof answer==='string'||Array.isArray(answer)&&answer.length<=6&&answer.every(s=>typeof s==='string'))||JSON.stringify(answer).length>6000||typeof timeout!=='boolean')return {ok:false,error:'BAD_INPUT'}
 const ctx=await gate(slug,version)
 if(!ctx)return {ok:false,error:'GATE_CLOSED'}
 const l=ledgerFor(slug,version,run,index)
 if('ok' in l)return l
 const id=l.ids[index]
 const question=id?ctx.bank.engine.publicQuestions([id],l.seed)[0]:undefined,original=id?ctx.bank.byId.get(id):undefined
 if(!id||!question||!original)return {ok:false,error:'BAD_INPUT'}
 const values=Array.isArray(answer)?answer:[answer]
 if(values.some(v=>!question.options.includes(v)))return {ok:false,error:'BAD_INPUT'}
 const graded=ctx.bank.engine.gradeAnswer(id,timeout?[]:answer)
 if(!graded)return {ok:false,error:'UNAVAILABLE'}
 const r=settleQuestion(l,index,Date.now(),{correct:graded.correct,difficulty:graded.difficulty},timeout)
 if(!r.ok)return r
 if(!r.duplicate)write(r.ledger)
 return {ok:true,duplicate:r.duplicate,timeout:r.timeout,correct:r.correct,hinted:r.hinted,gained:r.gained,combo:r.combo,multiplier:r.multiplier,left:r.left,session:r.session,over:isOver(r.ledger),
  verdict:{correct:r.correct,correctAnswers:graded.correctAnswers,hits:graded.hits,explanation:graded.explanation,difficulty:graded.difficulty,source:original.source}}
}

/** the one hint of a question: derived from what the question itself carries, marked on the ledger BEFORE it is shown */
export async function hintTriviaRun(slug:string,version:string,run:string,index:number):Promise<HintView>{
 const ctx=await gate(slug,version)
 if(!ctx)return {ok:false,error:'GATE_CLOSED'}
 const l=ledgerFor(slug,version,run,index)
 if('ok' in l)return l
 const id=l.ids[index]
 const question=id?ctx.bank.engine.publicQuestions([id],l.seed)[0]:undefined,original=id?ctx.bank.byId.get(id):undefined
 if(!id||!question||!original)return {ok:false,error:'BAD_INPUT'}
 const plan=resolveHint(original,question.options,l.seed)
 if(!plan)return {ok:false,error:'UNAVAILABLE'}
 const marked=markHint(l,index,Date.now())
 if(!marked.ok)return marked
 if(marked.first)write(marked.ledger)
 return {ok:true,hint:plan,first:marked.first}
}

/** the device's missed questions against the current bank: which still stand, and why each other one is gone (TR-R11) */
export async function reviewMissedQuestions(slug:string,version:string,ids:string[]):Promise<{ok:true;playable:number;removed:{retired:number;withdrawn:number};merged:number}|Fail>{
 if(!Array.isArray(ids)||ids.length>MAX_IDS||!ids.every(x=>text(x,40)))return {ok:false,error:'BAD_INPUT'}
 const ctx=await gate(slug,version)
 if(!ctx)return {ok:false,error:'GATE_CLOSED'}
 const r=reviewMissed(ctx.bank,ids)
 return {ok:true,playable:r.playable.length,removed:{retired:r.removed.filter(x=>x.reason==='retired').length,withdrawn:r.removed.filter(x=>x.reason==='withdrawn').length},merged:r.merged}
}
