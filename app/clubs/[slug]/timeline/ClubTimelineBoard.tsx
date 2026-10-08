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
/** Chronology: the cards you place on the line. `threadLinks` maps a card to its entry on The Thread, when it has one. */
export function ClubTimelineBoard({deal,slug,version,seed,cursor,locale,contentLocale,threadLinks={},threadLabel='',runId=''}:{deal:TimelineDeal;slug:string;version:string;seed:number;cursor:number;locale:'en'|'he';contentLocale:Locale;threadLinks?:Record<string,string>;threadLabel?:string;/** the run key (carries the category, so a short run is never compared with a full one) */runId?:string}) {
 const copy=locale==='he'?he:en
 const result=({run,board}:ResultProps)=><section className="mt-stack" aria-live="polite"><RecordRun club={slug} gate="timeline" run={runId||`timeline:${version}:${seed}:${cursor}`} score={run.score}/><h2 className="font-display text-step-2">{copy.finished}</h2><p className="my-4">{copy.score}: <bdi>{run.score}</bdi> · {copy.correct}: <bdi>{run.correct}/{deal.queue.length}</bdi></p><ol>{board.map(card=><li className="flex flex-wrap justify-between gap-x-3 border-b-hair border-ink/25 py-3" key={card.id}><bdi lang={contentLocale}>{card.title}</bdi><time dateTime={card.on}><bdi>{localizedDate(card.on,locale)}</bdi></time>{threadLinks[card.id]&&threadLabel?<Link prefetch={false} className="inline-flex min-h-tap basis-full items-center font-mono tabular-nums text-[11px] uppercase tracking-wider underline" href={`?${new URLSearchParams({mode:'chronicle',at:threadLinks[card.id]!,lang:locale})}`} data-testid="timeline-result-thread">{threadLabel}</Link>:null}</li>)}</ol><div className="mt-6 flex flex-wrap items-center gap-4"><ShareComposer draft={timelineShare(slug,{seed,cursor,correct:run.correct,total:deal.queue.length,marks:run.history})}/><Link className="min-h-tap border-rule border-ink px-4 py-3" href={`/clubs/${slug}/timeline?seed=${seed}&r=${cursor+1}&play=1&lang=${locale}`}>{copy.again}</Link><Link className="min-h-tap px-4 py-3" href={`/clubs/${slug}?lang=${locale}`}>{copy.clubs}</Link></div></section>
 return <SharedTimelineBoard {...deal} seed={seed} cursor={cursor} copy={copy} dateLocale={locale} contentLocale={contentLocale} renderResult={result} submit={(s,p,slot,r)=>placeCard(slug,version,deal.queue[p]?.id||'',s,p,slot,r)}/>
}
