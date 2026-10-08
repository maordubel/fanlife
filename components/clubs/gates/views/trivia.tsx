import Link from 'next/link'
import {ClubTrivia,type TriviaPlan} from '@/components/clubs/gates/trivia/ClubTrivia'
import {clubBank,dealMode,modeCatalog} from '@/lib/clubs/trivia-deck'
import {MIN_ROUND} from '@/lib/clubs/trivia-model'
import type {GateView} from '../types'

/**
 * Gate 2 · the Quiz Stand. The server decides which runs this club's bank can honestly field (`trivia-deck.ts`) and
 * hands the start card a plan — sizes, names, blockers — but NO questions: the deck is dealt, and its answers kept,
 * when the player presses Start (`trivia-run-actions.ts`). A legacy `?hard=1` link still means the hard run.
 */
export const view:GateView=({club,locale,copy,round,gameKey,searchParams})=>{
 const bank=clubBank(club)
 const asked=searchParams.mode||(searchParams.hard==='1'?'hard':undefined)
 const catalog=modeCatalog(bank,round.seed,round.cursor,{mode:asked,topic:searchParams.topic,era:searchParams.era})
 const filtered=!!(searchParams.topic||searchParams.era)
 const dealt=dealMode(bank,{mode:filtered?undefined:catalog.mode,topic:searchParams.topic,era:searchParams.era},round.seed,round.cursor)
 const label=(id:string)=>(copy as Record<string,string>)[`topic.${id}`]??id
 const modeBlocked=asked&&!filtered&&asked!==catalog.mode?catalog.modes.find(m=>m.id===asked&&!m.available)?.blocker:undefined
 const playable=catalog.modes.some(m=>m.available)||catalog.topics.some(x=>x.size>=MIN_ROUND)
 if(!playable)return <div className="game-panel" data-testid="trivia-empty"><p>{copy.empty}</p><Link className="game-button min-h-tap" href={`?lang=${locale}&seed=${round.seed}`}>{copy.anyTopic}</Link></div>
 const plan:TriviaPlan={
  modes:catalog.modes.map(m=>({id:m.id,category:m.category,available:m.available,size:m.size,banded:m.banded,blocker:m.blocker})),
  topics:catalog.topics.map(x=>({id:x.id,label:label(x.id),facts:x.facts,size:x.size})),
  eras:catalog.eras.map(x=>({decade:x.decade,facts:x.facts,size:x.size})),
  selected:{
   mode:filtered?undefined:catalog.mode,
   topic:searchParams.topic&&catalog.topics.some(x=>x.id===searchParams.topic)?searchParams.topic:undefined,
   era:searchParams.era&&catalog.eras.some(x=>String(x.decade)===searchParams.era)?searchParams.era:undefined,
   category:'blocked' in dealt?null:dealt.category,size:'blocked' in dealt?0:dealt.ids.length,banded:'blocked' in dealt?false:dealt.banded,
   blocker:'blocked' in dealt?dealt.blocked:undefined
  },
  asked:modeBlocked?{mode:asked!,blocker:modeBlocked}:undefined
 }
 return <ClubTrivia key={gameKey} club={club.identity.id} clubName={club.identity.name} version={club.version} seed={round.seed} cursor={round.cursor}
  locale={locale} contentLocale={club.locales.content} copy={copy} plan={plan} autostart={searchParams.go==='1'} practice={searchParams.practice==='1'}/>
}
