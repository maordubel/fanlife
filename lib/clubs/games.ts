import 'server-only'
import type {RunSpec} from '@/lib/game/trivia-engine'
import {clubBank} from './trivia-deck'
import {dealMemoryCandidates} from '@/lib/game/memory-engine'
import type {ClubData} from './contract'
/** the club's trivia engine, over its SANITISED bank (`trivia-bank.ts` — unfair questions are named and kept out) */
export function clubTrivia(club:ClubData){return clubBank(club).engine}
export function triviaSpec(topic?:string,era?:string,hard?:string):RunSpec {
 const topics=['europe','players','history','numbers','songs','kits','derby'] as const
 const decade=Number(era)
 return {topic:topics.includes(topic as typeof topics[number])?topic as typeof topics[number]:null,decade:era&&Number.isInteger(decade)&&decade>=1800&&decade<=2100&&decade%10===0?decade:null,hard:hard==='1'}
}
export function clubMemory(club:ClubData,seed:number,cursor=0){return dealMemoryCandidates(club.memory,seed,Math.min(6,club.gates.memory.eligible),cursor)}
