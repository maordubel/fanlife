/**
 * Gate 6 · the device's best result per mode (ME-R10) — a 2-pair wall and a 6-pair wall, a hinted run and an unhinted
 * one, are different things and never share a number. Kept per club on this device, versioned by the rules revision
 * so a replacement score never competes with an old one. Every read and write is guarded: storage may be blocked.
 */
import {MEMORY_SCORE_VERSION} from '@/lib/clubs/memory-solver'
import type {MemoryCategory} from '@/lib/clubs/memory-model'

export type Best={score:number;moves:number;misses:number;pairs:number;at:number;v:number}
export type Bests=Partial<Record<MemoryCategory,Best>>
const KEY=(club:string)=>`fan-life:memory:best:v${MEMORY_SCORE_VERSION}:${club}`
const CATEGORIES=['p2-hinted','p2-unhinted','p4-hinted','p4-unhinted','p6-hinted','p6-unhinted']

const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0
export function parseBests(raw:unknown):Bests{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {}
 const out:Bests={}
 for(const [k,v] of Object.entries(raw as Record<string,unknown>)){
  if(!CATEGORIES.includes(k)||!v||typeof v!=='object')continue
  const b=v as Record<string,unknown>
  if(num(b.score)&&num(b.moves)&&num(b.misses)&&num(b.pairs)&&num(b.at)&&b.v===MEMORY_SCORE_VERSION)out[k as MemoryCategory]={score:b.score as number,moves:b.moves as number,misses:b.misses as number,pairs:b.pairs as number,at:b.at as number,v:MEMORY_SCORE_VERSION}
 }
 return out
}
/** a better streak wins; on a tie the cleaner run (fewer misses, then fewer moves) does; an equal run keeps its date */
export function better(a:Best|undefined,b:Best):boolean{
 if(!a)return true
 if(b.score!==a.score)return b.score>a.score
 if(b.misses!==a.misses)return b.misses<a.misses
 return b.moves<a.moves
}
export function recordBest(bests:Bests,category:MemoryCategory,next:Omit<Best,'v'>):{bests:Bests;improved:boolean}{
 const candidate:Best={...next,v:MEMORY_SCORE_VERSION}
 if(!better(bests[category],candidate))return {bests,improved:false}
 return {bests:{...bests,[category]:candidate},improved:true}
}
export function readBests(club:string):Bests{
 try{const raw=localStorage.getItem(KEY(club));return raw?parseBests(JSON.parse(raw)):{}}catch{return {}}
}
export function writeBests(club:string,bests:Bests):boolean{
 try{localStorage.setItem(KEY(club),JSON.stringify(bests));return true}catch{return false}
}
