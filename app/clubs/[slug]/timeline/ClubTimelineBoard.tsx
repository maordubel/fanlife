'use client'
import Link from 'next/link'
import {SharedTimelineBoard,type ResultProps} from '@/components/timeline/SharedTimelineBoard'
import {RecordRun} from '@/components/clubs/games/RecordRun'
import {localizedDate} from '@/lib/clubs/locale'
import type {Locale} from '@/lib/clubs/contract'
import type {TimelineDeal} from '@/lib/game/timeline-engine'
import en from '@/messages/timeline/en.json'
import he from '@/messages/timeline/he.json'
import {placeCard} from './actions'
export function ClubTimelineBoard({deal,slug,version,seed,cursor,locale,contentLocale}:{deal:TimelineDeal;slug:string;version:string;seed:number;cursor:number;locale:'en'|'he';contentLocale:Locale}) {
 const copy=locale==='he'?he:en
 const result=({run,board}:ResultProps)=><section className="mt-stack" aria-live="polite"><RecordRun club={slug} gate="timeline" run={`timeline:${version}:${seed}:${cursor}`} score={run.score}/><h2 className="font-display text-step-2">{copy.finished}</h2><p className="my-4">{copy.score}: <bdi>{run.score}</bdi> · {copy.correct}: <bdi>{run.correct}/{deal.queue.length}</bdi></p><ol>{board.map(card=><li className="flex justify-between gap-3 border-b-hair border-ink/25 py-3" key={card.id}><bdi lang={contentLocale}>{card.title}</bdi><time dateTime={card.on}><bdi>{localizedDate(card.on,locale)}</bdi></time></li>)}</ol><div className="mt-6 flex flex-wrap gap-4"><Link className="min-h-tap border-rule border-ink px-4 py-3" href={`/clubs/${slug}/timeline?seed=${seed}&r=${cursor+1}&lang=${locale}`}>{copy.again}</Link><Link className="min-h-tap px-4 py-3" href={`/clubs/${slug}?lang=${locale}`}>{copy.clubs}</Link></div></section>
 return <SharedTimelineBoard {...deal} seed={seed} cursor={cursor} copy={copy} dateLocale={locale} contentLocale={contentLocale} renderResult={result} submit={(s,p,slot,r)=>placeCard(slug,version,deal.queue[p]?.id||'',s,p,slot,r)}/>
}
