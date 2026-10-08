import {recordActivity,readActivity,runId,type RunGate} from './activity'
import {finishVisit,track} from '@/lib/analytics/meter'

/**
 * The completion contract for every club gate (Wave 0, 8.10.2026).
 *
 * A finished attempt is reported ONCE, from its result — never from opening the gate, never from a replay of the
 * same attempt id. Three things happen together so no board can do one and forget the others:
 *   1. the club's ticket counts it (device-only, `recordActivity` is idempotent by run id),
 *   2. the gate visit is closed as finished (so "where do people leave" never counts a finished round as a leave),
 *   3. a `run_complete` is measured with the score — no name, no account, no answer.
 * A duplicate (reload of the result, double render, a retry) writes nothing and measures nothing.
 */
export function completeRun(club:string,gate:RunGate|'xi',run:string,score=0):boolean{
 const before=snapshot(club,gate,run)
 const ok=recordActivity(club,gate,run,score)
 if(!ok)return false
 if(before===false)return true // already on the ticket: counted before, not again
 try{
  const route=`/clubs/${club}/${gate==='xi'?'xi':gate}`
  finishVisit(route,Math.max(0,Math.floor(score)))
  track('run_complete',{gate:route,value:Math.max(0,Math.floor(score))})
 }catch{/* measurement is never the reason a result screen breaks */}
 return true
}
/** true when this attempt is new to the ticket, false when it is already on it, null when storage is unavailable */
function snapshot(club:string,gate:RunGate|'xi',run:string):boolean|null{
 try{const a=readActivity(club);return gate==='xi'?!a.xi:!a.seen.includes(runId(run))}catch{return null}
}
