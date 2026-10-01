'use server'
import {requestClub} from '@/lib/clubs/request'
import {clubTrivia,triviaSpec} from '@/lib/clubs/games'
/** Tenant, gate switch, content version and dealt question are checked on every answer. */
export async function answerTrivia(slug:string,version:string,id:string,seed:number,cursor:number,index:number,answer:string|string[],topic?:string,era?:string,hard?:string){
 if(typeof slug!=='string'||slug.length>100||typeof version!=='string'||typeof id!=='string'||id.length>100||!Number.isInteger(seed)||!Number.isInteger(cursor)||cursor<0||!Number.isInteger(index)||index<0||index>=12||!(typeof answer==='string'||Array.isArray(answer)&&answer.length<=6&&answer.every(s=>typeof s==='string'))||JSON.stringify(answer).length>6000)return null
 const resolved=await requestClub(slug,2)
 if(!resolved||resolved.data.version!==version||!resolved.data.gates.trivia.playable)return null
 const game=clubTrivia(resolved.data),ids=game.dealSeededRun(triviaSpec(topic,era,hard),seed,cursor).ids
 if(ids[index]!==id)return null
 const question=game.publicQuestions([id],seed)[0]
 if(!question)return null
 const values=Array.isArray(answer)?answer:[answer]
 if(values.length&&values.some(v=>!question.options.includes(v)))return null
 const verdict=game.gradeAnswer(id,answer),original=resolved.data.trivia.questions.find(q=>q.id===id)
 return verdict&&original?{...verdict,source:original.source}:null
}
