/**
 * Gate 6 · the Memory Wall's rules, pure and client-safe.
 *
 * What a flip MEANS lives in `lib/game/memory-run.ts` (flash, fusion, echo, morale, verdict). This file is how that
 * run meets a CLUB's round: how big the grid is, what a run scores, how the closing numbers are said, and what a
 * share carries. Nothing here knows the archive and nothing here invents a fact (rule 11): a pair's words are the
 * club's own faces, and a link exists only where the archive really holds the entry.
 */
import type {MemoryCard,MemoryPair} from '@/lib/game/memory'
import type {MemoryRun,MemoryVerdict} from '@/lib/game/memory-run'

/** a round needs at least this many pairs to be a board */
export const MIN_PAIRS=2

/** columns of the board: three across for a full wall, two for a short one — the same at every width, so threads line up */
export const columnsFor=(cards:number)=>cards>=10?3:2

/** how long a missed pair stays face up before both go back down */
export const MISS_MS=800
/** how long a fused pair's cards hold the "locked" beat */
export const LOCK_MS=900
/** the beat between the last pair and the result, so the final lock is seen */
export const RESULT_DELAY_MS=1100

/** what a finished wall scores: every pair is worth 200, every move costs 10 — the number the ticket records */
export const scoreOf=(pairs:number,moves:number)=>Math.max(0,pairs*200-moves*10)

/** a view-only stopwatch, m:ss */
export const clockOf=(seconds:number)=>`${Math.floor(Math.max(0,seconds)/60)}:${String(Math.max(0,Math.floor(seconds))%60).padStart(2,'0')}`

/** the copy key of the closing verdict */
export const verdictKey=(v:MemoryVerdict)=>`mem.verdict.${v}`

/** the next wall as a URL: the same seed, the next slice of the deck; `go` skips the pregame */
export function memoryQuery(input:{seed:number;cursor:number;lang:string;go?:boolean}):string{
 return new URLSearchParams({seed:String(input.seed),r:String(input.cursor),lang:input.lang,...(input.go?{go:'1'}:{})}).toString()
}

/** a run's identity for the ticket: one wall, one id — a replay is a new cursor */
export const memoryRunKey=(input:{version:string;seed:number;cursor:number})=>`memory:${input.version}:${input.seed}:${input.cursor}`

/** the pair a card belongs to, or null — the board never trusts a card it cannot place */
export const pairOf=(pairs:readonly MemoryPair[],card:Pick<MemoryCard,'pair'>)=>pairs.find(p=>p.id===card.pair)??null

/** the pairs in the order the player found them (the mural's order), skipping any id the round does not hold */
export function foundPairs(pairs:readonly MemoryPair[],done:readonly string[]):MemoryPair[]{
 const out:MemoryPair[]=[]
 for(const id of done){const p=pairs.find(x=>x.id===id);if(p)out.push(p)}
 return out
}

/** the closing facts of a run, read from its own counters */
export type MemoryResult={moves:number;misses:number;bestStreak:number;perfect:number;pairs:number;score:number;seconds:number}
export const resultOf=(run:MemoryRun,pairs:number,seconds:number):MemoryResult=>({moves:run.moves,misses:run.misses,bestStreak:run.bestStreak,perfect:run.perfect.length,pairs,score:scoreOf(pairs,run.moves),seconds})

/** what a share carries: club, the wall, the numbers, and the link that deals the same wall */
export function shareText(input:{club:string;title:string;pairs:number;moves:number;misses:number;url:string;verdict:string}):string{
 return `${input.club} · ${input.title}\n${input.verdict}\n${input.pairs} pairs · ${input.moves} moves · ${input.misses} misses\n${input.url}`
}
