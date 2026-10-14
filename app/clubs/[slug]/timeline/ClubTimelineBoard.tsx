'use client'
import Link from 'next/link'
import {SharedTimelineBoard,type ResultProps} from '@/components/timeline/SharedTimelineBoard'
import {RecordRun} from '@/components/clubs/games/RecordRun'
import {localizedDate} from '@/lib/clubs/locale'
import type {Locale} from '@/lib/clubs/contract'
import type {TimelineDeal} from '@/lib/game/timeline-engine'
import en from '@/messages/timeline/en.json'
import he from '@/messages/timeline/he.json'
import {ShareComposer} from '@/components/share/v3/ShareComposer'
import {timelineShare} from '@/lib/share/v3/adapters'
import {placeCard} from './actions'
import {Plate} from '@/components/weekly/Plate'
/** Chronology: the cards you place on the line. `threadLinks` maps a card to its entry on The Thread, when it has one. */
export function ClubTimelineBoard({deal,slug,version,seed,cursor,locale,contentLocale,threadLinks={},threadLabel='',runId=''}:{deal:TimelineDeal;slug:string;version:string;seed:number;cursor:number;locale:'en'|'he';contentLocale:Locale;threadLinks?:Record<string,string>;threadLabel?:string;/** the run key (carries the category, so a short run is never compared with a full one) */runId?:string}) {
 const copy=locale==='he'?he:en
 const result=({run,board}:ResultProps)=><section className="wga-tl-result" aria-live="polite" data-testid="timeline-result">
  <RecordRun club={slug} gate="timeline" run={runId||`timeline:${version}:${seed}:${cursor}`} score={run.score}/>
  <div className="wk-panel wk-lift wk-sky wga-tl-cover">
   <span className="wk-speed" aria-hidden="true"/>
   <Plate art="scarf" ink="club" className="wga-tl-art"/>
   <h2 className="wk-logo red wga-tl-title">{copy.finished}</h2>
   <p className="wk-burst wga-tl-burst"><b className="wk-num"><bdi dir="ltr">{run.correct}/{deal.queue.length}</bdi></b><small>{copy.correct}</small></p>
   <p className="wk-cap white wga-tl-cap">{copy.score}: <bdi className="wk-num">{run.score}</bdi> · {copy.correct}: <bdi>{run.correct}/{deal.queue.length}</bdi></p>
  </div>
  <ol className="wga-tl-list">{board.map(card=><li key={card.id}><time dateTime={card.on}><bdi>{localizedDate(card.on,locale)}</bdi></time><bdi lang={contentLocale}>{card.title}</bdi>{threadLinks[card.id]&&threadLabel?<Link prefetch={false} className="wga-tl-thread min-h-tap" href={`?${new URLSearchParams({mode:'chronicle',at:threadLinks[card.id]!,lang:locale})}`} data-testid="timeline-result-thread">{threadLabel}</Link>:null}</li>)}</ol>
  <div className="wga-tl-actions"><div className="wga-tl-share"><ShareComposer draft={timelineShare(slug,{seed,cursor,correct:run.correct,total:deal.queue.length,marks:run.history})}/></div><Link className="wga-tl-cta min-h-tap" href={`/clubs/${slug}?lang=${locale}`}><span>{copy.clubs}</span><span aria-hidden="true">→</span></Link><Link className="wk-kick wga-tl-again min-h-tap" href={`/clubs/${slug}/timeline?seed=${seed}&r=${cursor+1}&play=1&lang=${locale}`}><span className="wk-kick-gate" aria-hidden="true"><small>{copy.gate}</small><b>13</b></span><span className="wk-kick-go"><span className="wk-speed" aria-hidden="true"/><span>{copy.again}</span><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" className="wga-ball-fill"/><path d="M20 11l7 5-3 8h-8l-3-8z" className="wga-ball-ink"/></svg></span></Link></div>
 </section>
 return <SharedTimelineBoard {...deal} seed={seed} cursor={cursor} copy={copy} dateLocale={locale} contentLocale={contentLocale} renderResult={result} submit={(s,p,slot,r)=>placeCard(slug,version,deal.queue[p]?.id||'',s,p,slot,r)}/>
}
