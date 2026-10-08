'use server'
import {requestClub} from '@/lib/clubs/request'
import {revealOf} from '@/lib/clubs/memory-deck'
import {isTheme,type MemSize} from '@/lib/clubs/memory-solver'
import type {Reveal} from '@/lib/clubs/memory-model'

/**
 * Gate 6 · the reveal (ME-R12). The wall is dealt with positions and opaque pair keys, so a closed card — and the page
 * around it — names no archive record. When the player MATCHES two cards the browser asks what the pair was: the server
 * re-deals the same wall from (seed, cursor, size, theme), checks that the two positions really are mates, and answers
 * with the relation, the archive's own sentence, the entry and the source. Two positions that are not a pair, a stale
 * content version, a paused club or a closed gate all answer the same flat refusal and reveal nothing.
 */
export type RevealResult={ok:true;reveal:Reveal}|{ok:false;error:'GATE_CLOSED'|'BAD_INPUT'|'NOT_A_PAIR'}
const int=(v:unknown)=>typeof v==='number'&&Number.isInteger(v)
const text=(v:unknown,max=100)=>typeof v==='string'&&v.length<=max

export async function revealMemoryPair(input:{slug:string;version:string;seed:number;cursor:number;size:number;theme?:string|null;i:number;j:number;lang?:string}):Promise<RevealResult>{
 if(!input||!text(input.slug)||!text(input.version)||!int(input.seed)||!int(input.cursor)||input.cursor<0||input.cursor>100000||!int(input.i)||!int(input.j)||input.i<0||input.j<0||input.i>11||input.j>11)return {ok:false,error:'BAD_INPUT'}
 if(input.size!==2&&input.size!==4&&input.size!==6)return {ok:false,error:'BAD_INPUT'}
 if(input.theme!==undefined&&input.theme!==null&&!isTheme(input.theme))return {ok:false,error:'BAD_INPUT'}
 const resolved=await requestClub(input.slug,6)
 if(!resolved||resolved.data.version!==input.version||!resolved.data.gates.memory.playable)return {ok:false,error:'GATE_CLOSED'}
 const reveal=revealOf(resolved.data,{size:input.size as MemSize,theme:input.theme??null,seed:input.seed,cursor:input.cursor,i:input.i,j:input.j,lang:input.lang==='he'?'he':'en'})
 return reveal?{ok:true,reveal}:{ok:false,error:'NOT_A_PAIR'}
}
