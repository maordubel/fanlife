'use server'
import {requestClub} from '@/lib/clubs/request'
import {clubBank} from '@/lib/clubs/trivia-deck'
import {triviaRunCore,type StartInput} from '@/lib/clubs/trivia-run-core'
export type {RunQuestion,RunMeta,SettledEntry,Fail,RunView,Verdict,AnswerView,HintView,StartInput} from '@/lib/clubs/trivia-run-core'

/**
 * Gate 2 · a club's run. The run logic is `lib/clubs/trivia-run-core.ts` (shared with ALL FOOTBALL, ADR-fanlife-0010);
 * this file only says who the tenant is: the club the request resolves to, its gate switch and its content version.
 */
const core=triviaRunCore({resolve:async(slug,version)=>{
 const resolved=await requestClub(slug,2)
 if(!resolved||resolved.data.version!==version||!resolved.data.gates.trivia.playable)return null
 return {bank:clubBank(resolved.data)}
}})
export async function startTriviaRun(input:StartInput){return core.startTriviaRun(input)}
export async function resumeTriviaRun(slug:string,version:string){return core.resumeTriviaRun(slug,version)}
export async function openTriviaQuestion(slug:string,version:string,run:string,index:number){return core.openTriviaQuestion(slug,version,run,index)}
export async function answerTriviaRun(slug:string,version:string,run:string,index:number,answer:string|string[],timeout=false){return core.answerTriviaRun(slug,version,run,index,answer,timeout)}
export async function hintTriviaRun(slug:string,version:string,run:string,index:number){return core.hintTriviaRun(slug,version,run,index)}
export async function reviewMissedQuestions(slug:string,version:string,ids:string[]){return core.reviewMissedQuestions(slug,version,ids)}
