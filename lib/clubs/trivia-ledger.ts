/**
 * Gate 2 · the run's ledger (rulebook §17.4, TR-R06..R08) — the server's own record of one run, as pure arithmetic.
 *
 * A competitive run cannot rest on totals the browser sends. So the server keeps, per run, the dealt ids, when each
 * question was OPENED, and what each one settled as, and it computes every score itself from `lib/game/session.ts`
 * (the native loop: three lives, a combo, per-stage clocks and caps, a 40-point hint). The browser only asks:
 * open question N, answer question N, hint for question N.
 *
 *  · **Settles once.** Question N has one entry. A second answer for it — a retry after a dropped response, a double
 *    tap, a replay — returns the FIRST outcome and changes nothing: a retry cannot subtract another life (TR-R08).
 *  · **The deadline is the server's.** It is `openedAt + seconds`; a small grace (`GRACE_MS`) covers the network
 *    and nothing else. An answer that arrives after it is a timeout, whatever it says — it can never replace one.
 *  · **Questions open in order.** Question N+1 cannot be opened or answered before N has settled, and a reload
 *    does not reset a deadline: opening an open question returns the same `openedAt`.
 *  · **A hint is asked once** per question, and marks the entry before anything is revealed.
 * No timers, no DOM, no storage: `trivia-actions` seals this object into a cookie and tests play it directly.
 */
import {LIVES,NEW_SESSION,advance,multiplierFor,outcomeOf,type Session} from '@/lib/game/session'
import {HINT_COST,askedOf,capOf,secondsOf} from './trivia-model'

export const GRACE_MS=1200
export type EntryState=0|1|2|3 // open · right · wrong · timeout
export type Entry={o:number;st:EntryState;h:0|1;g:number;l:number}
export type LedgerError='NO_RUN'|'RUN_MISMATCH'|'VERSION_RETIRED'|'OUT_OF_ORDER'|'NOT_OPEN'|'RUN_OVER'|'BAD_INDEX'
export type Ledger={
 v:1;run:string;club:string;ver:string;seed:number;cursor:number;cat:string;mode:string;topic:string;era:string;practice:boolean;banded:boolean
 ids:string[];e:Entry[];s:Session
}
export type Start={run:string;club:string;ver:string;seed:number;cursor:number;cat:string;mode:string;topic?:string|null;era?:number|null;practice:boolean;banded:boolean;ids:string[]}

export const startLedger=(x:Start):Ledger=>({v:1,run:x.run,club:x.club,ver:x.ver,seed:x.seed,cursor:x.cursor,cat:x.cat,mode:x.mode,topic:x.topic??'',era:x.era?String(x.era):'',practice:x.practice,banded:x.banded,ids:[...x.ids],e:[],s:{...NEW_SESSION,history:[]}})

export const countOf=(l:Pick<Ledger,'ids'>)=>l.ids.length
/** seconds on the clock for question `index`; practice has none */
export const totalOf=(l:Pick<Ledger,'ids'|'practice'>,index:number)=>l.practice?0:secondsOf(index,l.ids.length)
export const isOver=(l:Ledger)=>l.s.over||l.s.lives<=0||(l.e.length>=countOf(l)&&l.e.every(x=>x.st!==0))
export const deadlineOf=(l:Ledger,index:number)=>{const e=l.e[index];return e&&!l.practice?e.o+totalOf(l,index)*1000:null}

type Fail={ok:false;error:LedgerError}
const fail=(error:LedgerError):Fail=>({ok:false,error})

/** open question `index`: idempotent — opening an open question changes nothing and keeps its original time */
export function openQuestion(l:Ledger,index:number,now:number):{ok:true;ledger:Ledger;openedAt:number;remainingMs:number|null}|Fail{
 if(!Number.isInteger(index)||index<0||index>=countOf(l))return fail('BAD_INDEX')
 if(isOver(l))return fail('RUN_OVER')
 if(index<l.e.length){
  const e=l.e[index]!
  if(e.st!==0)return fail('OUT_OF_ORDER')
  return {ok:true,ledger:l,openedAt:e.o,remainingMs:l.practice?null:Math.max(0,e.o+totalOf(l,index)*1000-now)}
 }
 if(index!==l.e.length||(l.e.length>0&&l.e[l.e.length-1]!.st===0))return fail('OUT_OF_ORDER')
 const next:Ledger={...l,e:[...l.e,{o:now,st:0,h:0,g:0,l:0}]}
 return {ok:true,ledger:next,openedAt:now,remainingMs:l.practice?null:totalOf(l,index)*1000}
}

export type Settled={
 ok:true;ledger:Ledger;duplicate:boolean;correct:boolean;timeout:boolean;hinted:boolean;gained:number;combo:number;multiplier:number;left:number;session:Session
}
/**
 * settle question `index` with the server's own grade. `claimedTimeout` is the browser saying its clock ran out; an
 * answer after the deadline is a timeout too. Either way the question settles ONCE: a second call is a duplicate that
 * returns what the first one did.
 */
export function settleQuestion(l:Ledger,index:number,now:number,grade:{correct:boolean;difficulty:number},claimedTimeout=false):Settled|Fail{
 if(!Number.isInteger(index)||index<0||index>=countOf(l))return fail('BAD_INDEX')
 const e=l.e[index]
 if(!e)return fail('NOT_OPEN')
 const view=(led:Ledger,x:Entry,duplicate:boolean):Settled=>{
  const cap=capOf(index,countOf(led))
  return {ok:true,ledger:led,duplicate,correct:x.st===1,timeout:x.st===3,hinted:x.h===1,gained:x.g,combo:led.s.combo,multiplier:multiplierFor(led.s.combo,cap),left:x.l,session:led.s}
 }
 if(e.st!==0)return view(l,e,true)
 if(index!==l.e.length-1)return fail('OUT_OF_ORDER')
 const total=totalOf(l,index),cap=capOf(index,countOf(l))
 const late=!l.practice&&now>e.o+total*1000+GRACE_MS
 const timeout=!l.practice&&(claimedTimeout||late)
 const correct=!timeout&&grade.correct
 const left=l.practice||timeout?0:Math.min(total,Math.max(0,(e.o+total*1000-now)/1000))
 const hinted=e.h===1
 const out=outcomeOf(l.s,{correct,difficulty:grade.difficulty,secondsLeft:left,total,hinted,cap})
 const s=advance(l.s,{correct,difficulty:grade.difficulty,secondsLeft:left,total,hinted,cap})
 // a short deck ends at its own count, not at the native twelve
 const session:Session={...s,over:s.lives<=0||s.index>=countOf(l)}
 const entry:Entry={o:e.o,st:timeout?3:correct?1:2,h:e.h,g:out.gained,l:Math.round(left*100)/100}
 const next:Ledger={...l,e:l.e.map((x,i)=>i===index?entry:x),s:session}
 return view(next,entry,false)
}

/** the single hint of question `index`: allowed while it is open and before its deadline, and only once */
export function markHint(l:Ledger,index:number,now:number):{ok:true;ledger:Ledger;first:boolean}|Fail{
 const e=l.e[index]
 if(!e)return fail('NOT_OPEN')
 if(e.st!==0)return fail('OUT_OF_ORDER')
 if(!l.practice&&now>e.o+totalOf(l,index)*1000+GRACE_MS)return fail('OUT_OF_ORDER')
 if(e.h===1)return {ok:true,ledger:l,first:false}
 return {ok:true,ledger:{...l,e:l.e.map((x,i)=>i===index?{...x,h:1 as const}:x)},first:true}
}

/** what a run is worth at the end: the server's number — practice carries none */
export const finalScore=(l:Ledger)=>l.practice?0:l.s.score
export const livesLeft=(l:Ledger)=>Math.max(0,LIVES-l.e.filter(x=>x.st===2||x.st===3).length)
export const asked=(l:Ledger)=>askedOf(countOf(l))
export {HINT_COST}
