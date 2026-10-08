import Link from 'next/link'
import {ClubTrivia} from '@/components/clubs/gates/trivia/ClubTrivia'
import {clubTrivia,triviaSpec} from '@/lib/clubs/games'
import {MIN_ROUND} from '@/lib/clubs/trivia-model'
import type {GateView} from '../types'

/** Gate 2 · the Quiz Stand. The server deals the round (answers stripped); the client plays the run. */
export const view:GateView=({club,locale,copy,round,gameKey,searchParams})=>{
 const trivia=clubTrivia(club),spec=triviaSpec(searchParams.topic,searchParams.era,searchParams.hard)
 const questions=trivia.publicQuestions(trivia.dealSeededRun(spec,round.seed,round.cursor).ids,round.seed)
 if(questions.length<MIN_ROUND)return <div className="game-panel" data-testid="trivia-empty"><p>{copy.empty}</p><Link className="game-button min-h-tap" href={`?lang=${locale}&seed=${round.seed}`}>{copy.anyTopic}</Link></div>
 const label=(id:string)=>(copy as Record<string,string>)[`topic.${id}`]??id
 const topics=Object.entries(trivia.topicCounts()).filter(([id,n])=>id!=='general'&&n>=MIN_ROUND).map(([id,count])=>({id,label:label(id),count}))
 const eras=trivia.eraChips(spec.topic).filter(e=>e.count>=MIN_ROUND).map(e=>({decade:e.decade,count:e.count}))
 return <ClubTrivia key={gameKey} questions={questions} club={club.identity.id} clubName={club.identity.name} version={club.version} seed={round.seed} cursor={round.cursor}
  locale={locale} contentLocale={club.locales.content} topic={spec.topic||undefined} era={spec.decade===null?undefined:String(spec.decade)} hard={spec.hard?'1':undefined}
  copy={copy} topics={topics} eras={eras} autostart={searchParams.go==='1'} practice={searchParams.practice==='1'}/>
}
