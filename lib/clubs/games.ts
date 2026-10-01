import 'server-only'
import {createTriviaEngine,type RunSpec} from '@/lib/game/trivia-engine'
import {dealMemoryCandidates} from '@/lib/game/memory-engine'
import type {ClubData} from './contract'
const cache=new Map<string,ReturnType<typeof createTriviaEngine>>()
export function clubTrivia(club:ClubData){
 const key=`${club.identity.id}:${club.version}`
 if(!cache.has(key)){
  const byId=new Map(club.trivia.questions.map(q=>[q.id,q]))
  cache.set(key,createTriviaEngine({allQuestions:()=>club.trivia.questions,questionById:id=>byId.get(id),poolValues:id=>id&&Object.hasOwn(club.trivia.pools,id)?club.trivia.pools[id]!:[],factById:()=>undefined}))
 }
 return cache.get(key)!
}
export function triviaSpec(topic?:string,era?:string,hard?:string):RunSpec {
 const topics=['europe','players','history','numbers','songs','kits','derby'] as const
 const decade=Number(era)
 return {topic:topics.includes(topic as typeof topics[number])?topic as typeof topics[number]:null,decade:era&&Number.isInteger(decade)&&decade>=1800&&decade<=2100&&decade%10===0?decade:null,hard:hard==='1'}
}
export function clubMemory(club:ClubData,seed:number,cursor=0){return dealMemoryCandidates(club.memory,seed,Math.min(6,club.gates.memory.eligible),cursor)}
