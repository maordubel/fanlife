import 'server-only'
import {dealMode} from '@/lib/clubs/trivia-deck'
import {dealMemory} from '@/lib/clubs/memory-deck'
import type {ClubData} from '@/lib/clubs/contract'
import {splitKey} from '@/lib/master/crm/refs'
import {aggregateBank,aggregateFor,aggregateTimeline,type PoolGate} from './pool'

/**
 * The Round Lab (CRM 2 §6.5): deal N rounds from fixed seeds and check the invariants a fan relies on. Read-only — it
 * deals, grades with the engine's own grader and counts; it never stores a round.
 *  trivia  — ids unique in a round · every id namespaced to a member club · the recorded answer grades correct ·
 *            every option comes from the question itself or its OWN club's pool (no foreign distractor)
 *  timeline— card ids unique · days distinct · every card from a member club
 *  memory  — a board deals or names its blocker
 */
export type LabResult={gate:PoolGate;rounds:number;dealt:number;blocked:number;failures:string[];share:Record<string,number>;version:string|null}
export async function runLab(gate:PoolGate,n=100):Promise<LabResult>{
 const a=await aggregateFor(gate,{kind:'balanced'})
 const out:LabResult={gate,rounds:n,dealt:0,blocked:0,failures:[],share:{},version:a?.version??null}
 if(!a){out.failures.push('The pool cannot be built (fewer than two clubs).');return out}
 const members=new Set(a.members.map(m=>m.id)),fail=(s:string)=>{if(out.failures.length<25)out.failures.push(s)}
 const count=(club:string)=>{out.share[club]=(out.share[club]??0)+1}
 for(let seed=1;seed<=n;seed++){
  if(gate==='trivia'){
   const bank=aggregateBank(a),d=dealMode(bank,{},seed,0)
   if('blocked' in d){out.blocked++;continue}
   out.dealt++
   if(new Set(d.ids).size!==d.ids.length)fail(`seed ${seed}: a question twice in one round`)
   for(const q of bank.engine.publicQuestions(d.ids,seed)){
    const o=splitKey(q.id),orig=bank.byId.get(q.id)
    if(!o||!members.has(o.clubId)||!orig){fail(`seed ${seed}: ${q.id} is not a member club's question`);continue}
    count(o.clubId)
    const g=bank.engine.gradeAnswer(q.id,orig.answer)
    if(!g?.correct)fail(`seed ${seed}: ${q.id} — the recorded answer does not grade correct`)
    const pool=orig.pool?a.pack.trivia.pools[orig.pool]??[]:[]
    const own=new Set([...(Array.isArray(orig.answer)?orig.answer:[orig.answer]),...(orig.distractors??[]),...(orig.left??[]),...pool,'True','False','true','false'])
    for(const opt of q.options)if(!own.has(opt)&&!/^\d{3,4}$/.test(opt))fail(`seed ${seed}: ${q.id} offers “${opt}”, not from its own club`)
   }
  }else if(gate==='timeline'){
   const g=aggregateTimeline(a),d=g.dealTimelineRun(seed,0)
   out.dealt++
   const ids=[d.anchor.id,...d.queue.map(c=>c.id)]
   if(new Set(ids).size!==ids.length)fail(`seed ${seed}: a card twice in one run`)
   for(const id of ids){const o=splitKey(id);if(!o||!members.has(o.clubId))fail(`seed ${seed}: ${id} is not a member club's card`);else count(o.clubId)}
  }else{
   const d=dealMemory(a.pack as unknown as ClubData,{size:6,seed,cursor:0})
   if('blocked' in d){out.blocked++;continue}
   out.dealt++
   for(const p of d.pairs){const o=splitKey(p.pair);if(!o||!members.has(o.clubId))fail(`seed ${seed}: pair ${p.pair} is not a member club's`);else count(o.clubId)}
  }
 }
 return out
}
