'use client'
import Link from 'next/link'
import {ClubTrivia,type ClubTriviaProps} from '@/components/clubs/gates/trivia/ClubTrivia'
import {ClubMemory,type ClubMemoryProps} from '@/components/clubs/gates/memory/ClubMemory'
import {SharedTimelineBoard,type ResultProps} from '@/components/timeline/SharedTimelineBoard'
import {localizedDate} from '@/lib/clubs/locale'
import type {TimelineDeal} from '@/lib/game/timeline-engine'
import en from '@/messages/timeline/en.json'
import * as actions from '@/app/all-football/actions'

/**
 * ALL FOOTBALL's three gates are the clubs' own game screens (ADR-fanlife-0010) — the same run, wall and line — with
 * ALL FOOTBALL's server actions plugged in and a way back to ALL FOOTBALL instead of to a club.
 */
const TRIVIA={startTriviaRun:actions.startTriviaRun,resumeTriviaRun:actions.resumeTriviaRun,openTriviaQuestion:actions.openTriviaQuestion,answerTriviaRun:actions.answerTriviaRun,hintTriviaRun:actions.hintTriviaRun,reviewMissedQuestions:actions.reviewMissedQuestions}
export function AfTrivia(p:Omit<ClubTriviaProps,'actions'>){return <ClubTrivia {...p} actions={TRIVIA}/>}
export function AfMemory(p:Omit<ClubMemoryProps,'reveal'>){return <ClubMemory {...p} reveal={actions.revealMemoryPair}/>}

export function AfTimeline({deal,slug,version,seed,cursor,home}:{deal:TimelineDeal;slug:string;version:string;seed:number;cursor:number;home:string}){
 const result=({run,board}:ResultProps)=><section className="mt-stack" aria-live="polite">
  <h2 className="font-display text-step-2">{en.finished}</h2>
  <p className="my-4">{en.score}: <bdi>{run.score}</bdi></p>
  <ol className="af-line">{board.map(c=><li key={c.id}><b>{localizedDate(c.on,'en')}</b> <span dir="auto">{c.title}</span>{c.hint?<small dir="auto">{c.hint}</small>:null}</li>)}</ol>
  <p className="mt-4 flex flex-wrap gap-2"><Link className="game-button min-h-tap" href={`?seed=${seed+1}`}>{en.again??'Play again'}</Link><Link className="game-button min-h-tap" href={home}>Back to ALL FOOTBALL</Link></p>
 </section>
 return <SharedTimelineBoard {...deal} seed={seed} cursor={cursor} copy={en} dateLocale="en" contentLocale="en" renderResult={result} submit={(s,p,slot,r)=>actions.placeCard(slug,version,deal.queue[p]?.id||'',s,p,slot,r)}/>
}
