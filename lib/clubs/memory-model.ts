/**
 * Gate 6 · the Memory Wall's rules, pure and client-safe.
 *
 * What a flip MEANS lives in `lib/game/memory-run.ts` (flash, fusion, echo, morale, verdict). This file is how that
 * run meets a CLUB's round: how big the grid is, what a run RECORDS, which category it belongs to, how the closing
 * numbers are said, and what a link carries. Nothing here knows the archive and nothing here invents a fact (rule 11).
 *
 * The recorded score is the BEST MATCHING STREAK (ME-R10) — pairs found back to back with no miss between them.
 * Moves, misses and pairs stay separate numbers beside it; the old points formula belonged to the shared basic board
 * and is not a Memory metric, so it is kept only under its own name, unrecorded.
 */
import type {MemoryCard,MemoryObject,MemoryPair} from '@/lib/game/memory'
import type {MemoryRun,MemoryVerdict} from '@/lib/game/memory-run'
import {MEMORY_RULES,MEMORY_SCORE_VERSION,type BoardLabel,type MemSize,type MemoryBlocker} from '@/lib/clubs/memory-solver'

/** a round needs at least this many pairs to be a board */
export const MIN_PAIRS=2

/** columns of the board: three across for a full wall of short faces, two when a face is long or the wall is short */
export const LONG_FACE=34
export function columnsFor(cards:number,longest=0){
 if(cards<10)return 2
 return longest>LONG_FACE?2:3
}

/** how long a missed pair stays face up before both go back down */
export const MISS_MS=800
/** how long a fused pair's cards hold the "locked" beat */
export const LOCK_MS=900
/** the beat between the last pair and the result, so the final lock is seen */
export const RESULT_DELAY_MS=1100

/** the shared basic board's points. NOT a Memory metric and never recorded (ME-R10) — kept so a test can prove that */
export const legacyBasicPoints=(pairs:number,moves:number)=>Math.max(0,pairs*200-moves*10)

/** a view-only stopwatch, m:ss */
export const clockOf=(seconds:number)=>`${Math.floor(Math.max(0,seconds)/60)}:${String(Math.max(0,Math.floor(seconds))%60).padStart(2,'0')}`

/** the copy key of the closing verdict; the last rung is a completion, not praise */
export const verdictKey=(v:MemoryVerdict)=>`mem.verdict.${v==='lit'?'completion':v}`

/* ------------------------------------------------------------------ the mode a run belongs to */

export type MemoryCategory=`p${MemSize}-${'hinted'|'unhinted'}`
/** a run is HINTED when it spent its reflash; the echo is earned by a streak and is not a hint (ME-R07) */
export const hintedRun=(run:Pick<MemoryRun,'flashUsed'>)=>run.flashUsed
export const categoryOfRun=(size:MemSize,hinted:boolean):MemoryCategory=>`p${size}-${hinted?'hinted':'unhinted'}`
export const SIZES_ALL:readonly MemSize[]=[2,4,6]
export const parseSize=(raw:unknown):MemSize|undefined=>{const n=Number(raw);return n===2||n===4||n===6?n:undefined}

/** the next wall as a URL: the same seed, the next slice of the deck; `go` skips the pregame */
export function memoryQuery(input:{seed:number;cursor:number;lang:string;go?:boolean;size?:MemSize;theme?:string|null;peek?:boolean}):string{
 const q=new URLSearchParams({seed:String(input.seed),r:String(input.cursor),lang:input.lang})
 if(input.size)q.set('size',String(input.size))
 if(input.theme)q.set('theme',input.theme)
 if(input.peek===false)q.set('peek','0')
 if(input.go)q.set('go','1')
 return q.toString()
}

/** a run's identity for the ticket: one wall of one mode, under one rules revision — a replay is a new cursor */
export const memoryRunKey=(input:{version:string;seed:number;cursor:number;size:MemSize;theme?:string|null})=>`memory:${MEMORY_RULES}:${input.version}:${input.seed}:${input.cursor}:${input.size}:${input.theme||'-'}`

/** the pair a card belongs to, or null — the board never trusts a card it cannot place */
export const pairOf=(pairs:readonly MemoryPair[],card:Pick<MemoryCard,'pair'>)=>pairs.find(p=>p.id===card.pair)??null

/** the pairs in the order the player found them (the mural's order), skipping any id the round does not hold */
export function foundPairs<P extends {id:string}>(pairs:readonly P[],done:readonly string[]):P[]{
 const out:P[]=[]
 for(const id of done){const p=pairs.find(x=>x.id===id);if(p)out.push(p)}
 return out
}

/** the closing facts of a run, read from its own counters; `score` is the best matching streak and nothing else */
export type MemoryResult={score:number;scoreVersion:number;moves:number;misses:number;bestStreak:number;perfect:number;pairs:number;seconds:number;hinted:boolean;category:MemoryCategory;size:MemSize}
export const resultOf=(run:MemoryRun,pairs:number,seconds:number,size:MemSize=pairs as MemSize):MemoryResult=>({
 score:run.bestStreak,scoreVersion:MEMORY_SCORE_VERSION,moves:run.moves,misses:run.misses,bestStreak:run.bestStreak,perfect:run.perfect.length,pairs,seconds,
 hinted:hintedRun(run),category:categoryOfRun(size,hintedRun(run)),size
})

/* ------------------------------------------------------------------ faces as the eye should read them */

/** an ISO calendar date on a card reads as a date in the reader's language; anything else is printed as the archive wrote it */
export function displayFace(face:string,locale:string):string{
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(face)
 if(!m)return face
 const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]),at=new Date(Date.UTC(y,mo-1,d))
 if(at.getUTCFullYear()!==y||at.getUTCMonth()!==mo-1||at.getUTCDate()!==d)return face
 try{return new Intl.DateTimeFormat(locale==='he'?'he-IL':'en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(at)}catch{return face}
}

/* ------------------------------------------------------------------ what the server hands the screen */


/** one pair as the screen may hold it BEFORE it is matched: its faces and its category — never its relation or its source */
export type PublicPair={id:string;a:string;b:string;kind:string;object:MemoryObject}
/** a dealt board. Card ids are positions (`c0`..), pair ids are opaque keys: nothing in it names an archive record */
export type PublicDeal={size:MemSize;theme:string|null;label:BoardLabel;narrow:boolean;cards:MemoryCard[];pairs:PublicPair[];lap:number;index:number;boardsInLap:number;longest:number}
/** what a matched pair turns out to be — relation, the archive's own sentence, its entry and its source (ME-R12) */
export type Reveal={key:string;type:string;kind:string;fact:string|null;href:string|null;source:{title:string;publisher:string;url:string|null}|null}
export type MemoryPlan={
 deal:PublicDeal|null
 selected:{size:MemSize;theme:string|null;peek:boolean}
 sizes:{size:MemSize;available:boolean;boards:number;blocker?:MemoryBlocker}[]
 themes:{theme:string;decade:number;facts:number;maxSize:number;boards:number}[]
 pool:{valid:number;excluded:number;dateOnly:boolean;recognisable:number}
 asked?:{size?:MemSize;theme?:string;blocker:MemoryBlocker}
 blocker?:MemoryBlocker
}
