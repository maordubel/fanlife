'use server'
import {requestClub} from '@/lib/clubs/request'
import {clubTrivia,triviaSpec} from '@/lib/clubs/games'

/**
 * The Quiz Stand's paid hint (gate 2). Same authority as `answerTrivia`: tenant, gate switch, content version and
 * the dealt question are checked, and the hint is derived on the server from the question's own fact. It crosses
 * to the client only when the player asks for it — the client pays 40 points and the combo gain before it arrives.
 * The shape is language-free (`decade` is a number, `strike` is one option) so the English screen never shows a
 * Hebrew label; `context` is the club's own text in the club's content language.
 */
export type TriviaHint={kind:'decade';decade:number}|{kind:'context';text:string}|{kind:'strike';strike:string[]}
export async function hintTrivia(slug:string,version:string,id:string,seed:number,cursor:number,index:number,topic?:string,era?:string,hard?:string):Promise<TriviaHint|null>{
 if(typeof slug!=='string'||slug.length>100||typeof version!=='string'||version.length>100||typeof id!=='string'||id.length>100||!Number.isInteger(seed)||!Number.isInteger(cursor)||cursor<0||!Number.isInteger(index)||index<0||index>=12)return null
 const resolved=await requestClub(slug,2)
 if(!resolved||resolved.data.version!==version||!resolved.data.gates.trivia.playable)return null
 const game=clubTrivia(resolved.data),ids=game.dealSeededRun(triviaSpec(topic,era,hard),seed,cursor).ids
 if(ids[index]!==id)return null
 const hint=game.hintFor(id,seed)
 if(!hint)return null
 if(hint.kind==='decade'){
  const decade=resolved.data.trivia.questions.find(q=>q.id===id)?.decades[0]
  return typeof decade==='number'?{kind:'decade',decade}:null
 }
 if(hint.kind==='context')return hint.text?{kind:'context',text:hint.text}:null
 return hint.strike&&hint.strike.length?{kind:'strike',strike:hint.strike.slice(0,1)}:null
}
