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
 announceFinish(club,gate)
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

/**
 * Connected Football (CF-01): a result is on the screen. Anything that waits for the END of a game — the next step after it —
 * listens for this instead of appearing while the board is in play. Sent on every result shown (a reload of the result
 * counts too), never on opening a gate. `window.__flRunDone` keeps the last one for a listener that mounts later.
 */
export const RUN_DONE='fanlife:run-complete'
export type RunDone={club:string;gate:string;at:number}
export function announceFinish(club:string,gate:string):void{
 try{const detail:RunDone={club,gate,at:Date.now()};(window as unknown as {__flRunDone?:RunDone}).__flRunDone=detail;window.dispatchEvent(new CustomEvent(RUN_DONE,{detail}))}catch{/* no window: nothing to tell */}
}
