import {finishVisit} from '@/lib/analytics/meter'
/**
 * Evaluation-only device state. Server-resolved club IDs scope every storage key.
 * Every game with a finish is on the ticket (research 7.10.2026 §4.3): a round is counted once by its run id,
 * and `seen` keeps the ids as a set so a round that drops out of `recent` is never counted again.
 */
export const RUN_GATES=['trivia','memory','polls','blind-cow','lineup','goal','kit-builder','royal-rumble','timeline','derby','archive'] as const
export type RunGate=(typeof RUN_GATES)[number]
type Counter={completed:number;best:number}
export type Activity=Record<RunGate,Counter>&{xi:boolean;recent:string[];seen:string[]}
const blank=():Activity=>({...Object.fromEntries(RUN_GATES.map(g=>[g,{completed:0,best:0}])) as Record<RunGate,Counter>,xi:false,recent:[],seen:[]})
export const activityKey=(club:string)=>`fan-life:club:${club}:activity:v1`
export const xiKey=(club:string)=>`fan-life:club:${club}:xi:v1`
const okCounter=(row:unknown):row is Counter=>!!row&&typeof row==='object'&&[(row as Counter).completed,(row as Counter).best].every(n=>Number.isSafeInteger(n)&&n>=0)
const okIds=(xs:unknown,max:number):xs is string[]=>Array.isArray(xs)&&xs.length<=max&&xs.every(s=>typeof s==='string'&&s.length<=150)
const SEEN_MAX=2000
export function readActivity(club:string):Activity {
 try{const raw=localStorage.getItem(activityKey(club));if(!raw||raw.length>400000)return blank();const p=JSON.parse(raw) as Partial<Activity>
  if(!p||!okIds(p.recent,100)||typeof p.xi!=='boolean')return blank()
  const out=blank();out.xi=p.xi;out.recent=p.recent;out.seen=okIds(p.seen,SEEN_MAX)?p.seen:[...p.recent]
  // a counter that is there and malformed means the whole ticket was tampered with; a missing one is a gate added later
  for(const g of RUN_GATES){const row=p[g];if(row===undefined)continue;if(!okCounter(row))return blank();out[g]=row}
  return out
 }catch{return blank()}
}
/** A run id longer than the ledger keeps is folded to a short stable hash — never truncated into a collision. */
export const runId=(run:string)=>{if(run.length<=120)return run;let h=2166136261;for(let i=0;i<run.length;i++)h=Math.imul(h^run.charCodeAt(i),16777619);return `${run.slice(0,40)}#${(h>>>0).toString(36)}:${run.length}`}
export function recordActivity(club:string,gate:RunGate|'xi',raw:string,score=0):boolean {
 const run=runId(raw)
 // audience (audit A07, 8.10.2026): a finished round is a finish for the meter too — sent first, so a full or blocked
 // browser storage can never turn a completed game into an abandonment. The meter sends one finish per visit.
 try{finishVisit(`/clubs/${club}/${gate}`,Math.max(0,Math.floor(score)))}catch{/* measurement never breaks a game */}
 try{const p=readActivity(club);if(gate==='xi')p.xi=true;else if(!p.seen.includes(run)){p[gate].completed++;p[gate].best=Math.max(p[gate].best,Math.max(0,Math.floor(score)));p.recent=[run,...p.recent].slice(0,100);p.seen=[run,...p.seen].slice(0,SEEN_MAX)}localStorage.setItem(activityKey(club),JSON.stringify(p));return true}catch{return false}
}

export const pollKey=(club:string)=>`fan-life:club:${club}:polls:v1`
/** The "worst XI" is a personal opinion on this device — it is never counted on the ticket and never ranked. */
export const worstXiKey=(club:string)=>`fan-life:club:${club}:xi-worst:v1`
