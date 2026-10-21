import 'server-only'
import selection from '@/content/manual/trivia-editorial-2026-10-21.json'
import type {MasterQuestion} from '@/lib/game/questions/types'
import {EDITORIAL_TAG} from './editorial'

type Edit={questionId:string;answer:string|string[];factIds:string[];sourceUrl:string;basePrompt:string;baseExplanation:string;prompt:string;explanation:string}
const clubs=selection.clubs as Record<string,Edit[]>
/** Wording and relevance only. A changed answer, source or fact identity withdraws the old edit instead of hiding a correction. */
export function curateQuestions(club:string,questions:readonly MasterQuestion[]):MasterQuestion[]{
 const edits=new Map((clubs[club]??[]).map(e=>[e.questionId,e]))
 return questions.map(q=>{
  const e=edits.get(q.id)
  if(!e||q.source.confidence<2||q.source.url!==e.sourceUrl||q.prompt!==e.basePrompt||q.explanation!==e.baseExplanation||JSON.stringify(q.answer)!==JSON.stringify(e.answer)||JSON.stringify(q.factIds)!==JSON.stringify(e.factIds))return q
  return {...q,prompt:e.prompt,explanation:e.explanation,facets:[...(q.facets??[]),EDITORIAL_TAG]}
 })
}
