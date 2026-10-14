/**
 * Gate 7 · THE PEOPLE'S CHOICE (spec 2.0, 13.10.2026) — types of the duel engine.
 * An opinion: no score, no clock, no life, no right answer. The engine is pure (no React, no storage, no network).
 */
export type Side='L'|'R'
export type DuelKind='player'|'event'
/** one name on the pitch: an id from the approved roster (or the approved timeline), never a label */
export type DuelCandidate={id:string;kind:DuelKind;title:string;secondary?:string;yearFrom?:number|null;yearTo?:number|null}
/** the period a voter chose: everybody, since the year they were born, or one decade */
export type DuelFilter={kind:'all'}|{kind:'since';year:number}|{kind:'decade';decade:number}
export const ALL_TIME:DuelFilter={kind:'all'}
/** the version-stamped definition of one poll the duel can run on */
export type DuelDefinition={
 /** the canonical question id: a ballot line (`keeper`) or a debate poll (`pollCaptain`) */
 pollId:string
 /** where the final vote goes: the dealt ballot (`setPick`) or the debate flow (`answerDebate`) — never both (PO-R10, D7-20) */
 sink:'ballot'|'debate'
 /** the prompt version the choice set was dealt under (PO-R09) */
 promptVersion:string
 clubId:string
}
export const BATCH=10
export type DuelState={
 v:1
 sessionId:string
 seed:number
 pollId:string
 promptVersion:string
 /** hash of the exact pool the run was made on: a changed pool retires the run (D7-12) */
 digest:string
 filter:DuelFilter
 /** every decision, in order, as the side the voter chose. The whole run is replayed from this string. */
 moves:string
 /** how many times the voter asked for 'ten more' */
 batches:number
 /** the rounds in which the one VAR was already used */
 varSpent:number[]
 /** the confirmed winner, once; finalize is idempotent on it */
 final:{winnerId:string}|null
}
export type DuelStatus='battling'|'confirm'|'done'
export type DuelView={
 status:DuelStatus
 left:DuelCandidate|null
 right:DuelCandidate|null
 /** the side the current holder is on (the winner of the last decision), or null before the first decision */
 winnerSide:Side|null
 /** the holder: the last decision's winner */
 holderId:string|null
 /** consecutive decisions the holder has won */
 streak:number
 /** decisions made, and the cap of the current round (<= n-1) */
 decided:number
 cap:number
 /** 1-based index of the decision on screen */
 index:number
 /** no unseen name left: another round is impossible */
 exhausted:boolean
 /** names not yet shown */
 unseen:number
 /** the man the last decision knocked out */
 lastLoserId:string|null
 canUndo:boolean
 poolSize:number
}
export type Unavailable={ok:false;code:'POOL_SHORT';have:number;need:number}
