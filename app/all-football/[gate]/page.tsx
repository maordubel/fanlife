import Link from 'next/link'
import {notFound} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {Contributors,GateBar,PreviewRibbon,modeQuery} from '@/components/experiences/AfFrame'
import {AfMemory,AfTimeline,AfTrivia} from '@/components/experiences/AfGames'
import {experienceDoor} from '@/lib/experiences/access'
import {aggregateBank,aggregateFor,aggregateTimeline,parseModeQuery,type PoolGate} from '@/lib/experiences/pool'
import {dealMode,modeCatalog} from '@/lib/clubs/trivia-deck'
import {planMemory} from '@/lib/clubs/memory-deck'
import {gameCopy} from '@/lib/clubs/game-copy'
import {roundFrom} from '@/lib/rotation/round'
import type {ClubData} from '@/lib/clubs/contract'
import type {TriviaPlan} from '@/components/clubs/gates/trivia/ClubTrivia'
import '../all-football.css'
export const dynamic='force-dynamic'
const TITLE:Record<PoolGate,string>={trivia:'The quiz stand',timeline:'The long line',memory:'The memory wall'}
export function generateMetadata({params}:{params:{gate:string}}){return {title:`${TITLE[params.gate as PoolGate]??'Gate'} · ALL FOOTBALL`,robots:{index:false}}}

type Search={mode?:string;a?:string;b?:string;seed?:string;r?:string;topic?:string;era?:string;go?:string;practice?:string;size?:string;theme?:string;peek?:string}
type Agg=NonNullable<Awaited<ReturnType<typeof aggregateFor>>>
type Copy=ReturnType<typeof gameCopy>
type Round=ReturnType<typeof roundFrom>

/** one ALL FOOTBALL gate: the club engines over the derived pool (ADR-fanlife-0010) */
export default async function Page({params,searchParams}:{params:{gate:string};searchParams:Search}){
 const gate=params.gate as PoolGate
 if(!['trivia','timeline','memory'].includes(gate))notFound()
 const door=await experienceDoor(gate);if(!door.open)notFound()
 const mode=parseModeQuery(searchParams),a=await aggregateFor(gate,mode)
 const q=modeQuery(mode),home=`/all-football${q?`?${q}`:''}`
 const copy=gameCopy('en'),round=roundFrom(searchParams)
 const body=!a?<section className="af-closed"><h2>Not enough clubs for this round</h2><p>{mode.kind==='duel'?'One of the two clubs cannot field this gate yet. Pick another pair.':'At least two clubs must have this gate open to fans.'}</p><Link className="game-button min-h-tap" href="/all-football">Back to ALL FOOTBALL</Link></section>:
  gate==='trivia'?trivia(a,copy,round,searchParams,home):gate==='memory'?memory(a,copy,round,searchParams,home):timeline(a,round,home)
 return <Shell locale="en">
  <PreviewRibbon on={door.preview}/>
  <main id="main" className="af mag-game mx-auto min-h-screen max-w-3xl px-gutter py-6" lang="en">
   <GateBar title={TITLE[gate]} mode={mode} back={home}>{a?<Contributors members={a.members} label={`This round draws from ${a.members.length} clubs`} compact/>:null}</GateBar>
   {body}
  </main>
 </Shell>
}
function trivia(a:Agg,copy:Copy,round:Round,sp:Search,home:string){
 const bank=aggregateBank(a)
 const catalog=modeCatalog(bank,round.seed,round.cursor,{topic:sp.topic,era:sp.era})
 const filtered=!!(sp.topic||sp.era)
 const dealt=dealMode(bank,{mode:filtered?undefined:catalog.mode,topic:sp.topic,era:sp.era},round.seed,round.cursor)
 const label=(id:string)=>(copy as Record<string,string>)[`topic.${id}`]??id
 const plan:TriviaPlan={
  modes:catalog.modes.map(m=>({id:m.id,category:m.category,available:m.available,size:m.size,banded:m.banded,blocker:m.blocker})),
  topics:catalog.topics.map(x=>({id:x.id,label:label(x.id),facts:x.facts,size:x.size})),
  eras:catalog.eras.map(x=>({decade:x.decade,facts:x.facts,size:x.size})),
  selected:{mode:filtered?undefined:catalog.mode,topic:sp.topic&&catalog.topics.some(x=>x.id===sp.topic)?sp.topic:undefined,era:sp.era&&catalog.eras.some(x=>String(x.decade)===sp.era)?sp.era:undefined,
   category:'blocked' in dealt?null:dealt.category,size:'blocked' in dealt?0:dealt.ids.length,banded:'blocked' in dealt?false:dealt.banded,blocker:'blocked' in dealt?dealt.blocked:undefined},
 }
 return <AfTrivia key={`${a.version}:${round.seed}:${round.cursor}:${sp.topic||''}:${sp.era||''}`} home={home} club={a.slug} clubName="ALL FOOTBALL" version={a.version} seed={round.seed} cursor={round.cursor}
  locale="en" contentLocale="en" copy={copy} plan={plan} autostart={sp.go==='1'} practice={sp.practice==='1'}/>
}
function memory(a:Agg,copy:Copy,round:Round,sp:Search,home:string){
 const plan=planMemory(a.pack as unknown as ClubData,{seed:round.seed,cursor:round.cursor,size:sp.size,theme:sp.theme,peek:sp.peek!=='0'})
 return <AfMemory key={`${a.version}:${round.seed}:${round.cursor}:${plan.selected.size}:${plan.selected.theme??''}`} home={home} plan={plan} club={a.slug} clubName="ALL FOOTBALL" version={a.version} seed={round.seed} cursor={round.cursor}
  locale="en" contentLocale="en" copy={copy} autostart={sp.go==='1'&&!!plan.deal}/>
}
function timeline(a:Agg,round:Round,home:string){
 const game=aggregateTimeline(a)
 if(!game.available)return <section className="af-closed"><h2>Not enough dated moments yet</h2><Link className="game-button min-h-tap" href={home}>Back</Link></section>
 return <AfTimeline key={`${a.version}:${round.seed}:${round.cursor}`} deal={game.dealTimelineRun(round.seed,round.cursor)} slug={a.slug} version={a.version} seed={round.seed} cursor={round.cursor} home={home}/>
}
