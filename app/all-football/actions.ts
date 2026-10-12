'use server'
import {triviaRunCore,type StartInput} from '@/lib/clubs/trivia-run-core'
import {aggregateBank,aggregateFor,aggregateTimeline,modeOf} from '@/lib/experiences/pool'
import {experienceDoor} from '@/lib/experiences/access'
import {dealMemory,pairKey} from '@/lib/clubs/memory-deck'
import {eligibleArchive} from '@/lib/clubs/archive'
import {isTheme,type MemSize} from '@/lib/clubs/memory-solver'
import {splitKey} from '@/lib/master/crm/refs'
import type {ClubData} from '@/lib/clubs/contract'
import type {RevealResult} from '@/app/clubs/[slug]/[gate]/memory-actions'

/**
 * ALL FOOTBALL's server actions (ADR-fanlife-0010): the SAME run core, timeline engine and memory deck the clubs use,
 * resolved against the derived pool instead of a club tenant. Every call re-checks the switch, the mode and the pool
 * version; a stale version fails closed exactly as a club's does.
 */
const text=(v:unknown,max=100)=>typeof v==='string'&&v.length<=max
const int=(v:unknown)=>typeof v==='number'&&Number.isInteger(v)
async function pool(gate:'trivia'|'timeline'|'memory',slug:unknown,version:unknown){
 if(!text(slug,120)||!text(version,40))return null
 const mode=modeOf(slug as string);if(!mode)return null
 if(!(await experienceDoor(gate)).open)return null
 const a=await aggregateFor(gate,mode)
 return a&&a.version===version?a:null
}
const core=triviaRunCore({idMax:120,resolve:async(slug,version)=>{const a=await pool('trivia',slug,version);return a?{bank:aggregateBank(a)}:null}})
export async function startTriviaRun(input:StartInput){return core.startTriviaRun(input)}
export async function resumeTriviaRun(slug:string,version:string){return core.resumeTriviaRun(slug,version)}
export async function openTriviaQuestion(slug:string,version:string,run:string,index:number){return core.openTriviaQuestion(slug,version,run,index)}
export async function answerTriviaRun(slug:string,version:string,run:string,index:number,answer:string|string[],timeout=false){return core.answerTriviaRun(slug,version,run,index,answer,timeout)}
export async function hintTriviaRun(slug:string,version:string,run:string,index:number){return core.hintTriviaRun(slug,version,run,index)}
export async function reviewMissedQuestions(slug:string,version:string,ids:string[]){return core.reviewMissedQuestions(slug,version,ids)}

export async function placeCard(slug:string,version:string,cardId:string,seed:number,placed:number,slot:number,cursor:number){
 if(typeof cardId!=='string'||cardId.length>160)return null
 const a=await pool('timeline',slug,version);if(!a)return null
 const game=aggregateTimeline(a);if(!game.available)return null
 const verdict=game.gradeInsert(seed,placed,slot,cursor)
 return verdict?.card.id===cardId?verdict:null
}

/** the pair's own club answers for it: its archive entry, its source, its page — never the aggregate's */
export async function revealMemoryPair(input:{slug:string;version:string;seed:number;cursor:number;size:number;theme?:string|null;i:number;j:number;lang?:string}):Promise<RevealResult>{
 if(!input||!int(input.seed)||!int(input.cursor)||input.cursor<0||input.cursor>100000||!int(input.i)||!int(input.j)||input.i<0||input.j<0||input.i>11||input.j>11)return {ok:false,error:'BAD_INPUT'}
 if(input.size!==2&&input.size!==4&&input.size!==6)return {ok:false,error:'BAD_INPUT'}
 if(input.theme!==undefined&&input.theme!==null&&!isTheme(input.theme))return {ok:false,error:'BAD_INPUT'}
 const a=await pool('memory',input.slug,input.version);if(!a)return {ok:false,error:'GATE_CLOSED'}
 const pack=a.pack as unknown as ClubData
 const dealt=dealMemory(pack,{size:input.size as MemSize,theme:input.theme??null,seed:input.seed,cursor:input.cursor})
 if('blocked' in dealt)return {ok:false,error:'NOT_A_PAIR'}
 const {cards}=dealt.deal,x=cards[input.i],y=cards[input.j]
 if(!x||!y||input.i===input.j||x.pair!==y.pair)return {ok:false,error:'NOT_A_PAIR'}
 const cand=dealt.pairs.find(c=>pairKey(pack.identity.id,c.pair)===x.pair),o=cand?splitKey(cand.pair):null,club=o?a.origin.get(o.clubId):undefined
 if(!cand||!o||!club)return {ok:false,error:'NOT_A_PAIR'}
 const rec=eligibleArchive(club).find(f=>f.id===o.id)
 const src=rec?.sources.map(s=>club.sources.find(z=>z.id===s)).find(Boolean)
 return {ok:true,reveal:{key:x.pair,type:cand.type,kind:cand.kind,fact:cand.fact?`${club.identity.name} · ${cand.fact}`:club.identity.name,
  href:rec?`/clubs/${club.identity.id}/archive?${new URLSearchParams({event:o.id,lang:input.lang==='he'?'he':'en'})}`:null,
  source:src?{title:src.title,publisher:src.publisher,url:src.url}:null}}
}
