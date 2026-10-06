import Link from 'next/link'
import {notFound} from 'next/navigation'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {TriviaBoard} from '@/components/clubs/games/TriviaBoard'
import {MemoryBoard} from '@/components/clubs/games/MemoryBoard'
import {MysteryBoard} from '@/components/clubs/games/MysteryBoard'
import {PollsBoard} from '@/components/clubs/games/PollsBoard'
import {clubPollRound} from '@/lib/clubs/polls'
import {XIBuilder} from '@/components/clubs/games/XIBuilder'
import {requestClub} from '@/lib/clubs/request'
import {sharedGate,gateAvailability} from '@/lib/clubs/gates'
import {clubTrivia,clubMemory,triviaSpec} from '@/lib/clubs/games'
import {uiLocale,localizedDate} from '@/lib/clubs/locale'
import {gameCopy} from '@/lib/clubs/game-copy'
import {eligibleArchive} from '@/lib/clubs/archive'
import {roundFrom} from '@/lib/rotation/round'
import {LineupBoard} from '@/components/clubs/games/LineupBoard'
import {RumbleBoard} from '@/components/clubs/games/RumbleBoard'
import {ratedPool,dealDraft} from '@/lib/clubs/rumble'
import {KitBuilderBoard} from '@/components/clubs/games/KitBuilderBoard'
import {KitPlate} from '@/components/clubs/games/KitPlate'
import {lineupMatches,lineupPool,buildableKits,kitViews,rivalsOf} from '@/lib/clubs/gate-content'
import {GateHead} from '@/components/clubs/GateHead'
import {meetingsBetween,tallyOf} from '@/lib/fixtures/meetings'
import {DerbyWall} from '@/components/clubs/games/DerbyWall'
import {GoalBoard} from '@/components/clubs/games/GoalBoard'
import {goalDeal} from '@/lib/clubs/goal'
const rotate=<T,>(a:T[],by:number)=>a.length?[...a.slice(by%a.length),...a.slice(0,by%a.length)]:a
const pick=(own:string,all:(string|null)[])=>{const rest=[...new Set(all.filter((x):x is string=>!!x&&x!==own))].sort().slice(0,3);return [own,...rest].sort((a,b)=>a.localeCompare(b))}
export const dynamic='force-dynamic'
export const metadata={title:'Club games · FAN LIFE'}
type Search={seed?:string;r?:string;lang?:string;topic?:string;era?:string;hard?:string;q?:string;event?:string;today?:string;page?:string}
export default async function Page({params,searchParams}:{params:{slug:string;gate:string};searchParams:Search}){
 const gate=sharedGate(params.gate)
 if(!gate||gate.key==='timeline')notFound()
 const resolved=await requestClub(params.slug,gate.number)
 if(!resolved)notFound()
 const club=resolved.data,locale=uiLocale(searchParams.lang),copy=gameCopy(locale),readiness=gateAvailability(club,gate.key),round=roundFrom(searchParams)
 const gameKey=`${club.identity.id}:${club.version}:${round.seed}:${round.cursor}:${locale}:${searchParams.topic||''}:${searchParams.era||''}:${searchParams.hard||''}`
 const trivia=gate.key==='trivia'?clubTrivia(club):null,spec=triviaSpec(searchParams.topic,searchParams.era,searchParams.hard),questions=trivia?.publicQuestions(trivia.dealSeededRun(spec,round.seed,round.cursor).ids,round.seed)||[]
 const dates=new Date().toISOString().slice(5,10),query=(searchParams.q||'').slice(0,100).toLocaleLowerCase(),records=eligibleArchive(club),events=records.filter(f=>(!searchParams.today||f.value.on?.slice(5,10)===dates)&&(!query||`${f.value.title} ${f.value.on||f.value.year||''} ${f.value.hint}`.toLocaleLowerCase().includes(query))),selected=searchParams.event?records.find(f=>f.id===searchParams.event):null
 if(searchParams.event&&!selected&&gate.key==='archive')notFound()
 const rawPage=Number(searchParams.page),page=Number.isSafeInteger(rawPage)&&rawPage>0?Math.min(rawPage,Math.max(1,Math.ceil(events.length/20))):1
 return <ClubSurface theme={club.theme} clubId={club.identity.id} locale={locale}><main id="main" className="mag-game mx-auto min-h-screen max-w-3xl px-gutter py-8" lang={locale}>
  <GateHead clubId={club.identity.id} clubName={club.identity.name} hubLabel={copy.hub} gateNo={String(gate.number)} gateNoLabel={copy.gateNo} title={copy[`gate.${gate.key}`]} state={readiness.state} stateLabel={copy[`state.${readiness.state}` as 'state.READY']} locale={locale} langLinks={(['en','he'] as const).map(l=>({l,label:l==='en'?copy.english:copy.hebrew,href:`?${new URLSearchParams({...searchParams,lang:l} as Record<string,string>)}`}))}/>
  {!readiness.playable?<section className="game-panel" data-testid="gate-locked"><h2>{copy.locked}</h2><p>{gate.requirement}</p>{readiness.reasons.map(r=><p key={r}>{r}</p>)}<Link className="game-button" href={`/master/core?club=${club.identity.id}`}>{copy.evidence} ↗</Link></section>:<>
   {readiness.state==='PARTIAL'&&<p className="my-4 border-hair border-ink p-3">{copy.partial}</p>}
   {gate.key==='trivia'&&trivia&&<><form className="game-filters" method="get"><input type="hidden" name="lang" value={locale}/><input type="hidden" name="seed" value={round.seed}/><label>{copy.anyTopic}<select name="topic" defaultValue={spec.topic||''}><option value="">{copy.anyTopic}</option>{Object.entries(trivia.topicCounts()).filter(([t,n])=>t!=='general'&&n>=3).map(([t,n])=><option key={t} value={t}>{t} ({n})</option>)}</select></label><label>{copy.anyEra}<select name="era" defaultValue={spec.decade||''}><option value="">{copy.anyEra}</option>{trivia.eraChips(spec.topic).filter(e=>e.count>=3).map(e=><option key={e.decade} value={e.decade}>{e.decade} ({e.count})</option>)}</select></label><label><input type="checkbox" name="hard" value="1" defaultChecked={spec.hard}/>{copy.hard}</label><button className="game-button min-h-tap">{copy.play}</button></form>{questions.length>=3?<TriviaBoard key={gameKey} questions={questions} club={club.identity.id} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale} contentLocale={club.locales.content} topic={spec.topic||undefined} era={spec.decade===null?undefined:String(spec.decade)} hard={spec.hard?'1':undefined}/>:<p className="game-panel" data-testid="trivia-empty">{copy.empty}</p>}</>}
   {gate.key==='memory'&&<MemoryBoard key={gameKey} round={clubMemory(club,round.seed,round.cursor)} club={club.identity.id} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale} contentLocale={club.locales.content}/>}
   {gate.key==='blind-cow'&&<MysteryBoard key={`${club.identity.id}:${club.version}:${locale}`} players={(club.players||[]).map(f=>f.value)} club={club.identity.id} version={club.version} locale={locale} contentLocale={club.locales.content}/>}
   {gate.key==='polls'&&<PollsBoard key={gameKey} polls={clubPollRound(club,locale,round.seed,round.cursor)} club={club.identity.id} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale} contentLocale={club.locales.content}/>}
   {gate.key==='xi'&&<XIBuilder players={(club.players||[]).map(f=>f.value)} club={club.identity.id} locale={locale} contentLocale={club.locales.content}/>}
   {gate.key==='lineup'&&<LineupBoard key={gameKey} items={rotate(lineupMatches(club),round.seed).map(m=>({id:m.id,title:m.name,competition:m.competition,on:m.on,pool:lineupPool(club,m)}))} club={club.identity.id} version={club.version} locale={locale}/>}
   {gate.key==='kit-builder'&&(()=>{const kits=buildableKits(club);return <KitBuilderBoard key={gameKey} items={rotate(kits,round.seed).map(k=>({id:k.id,design:k.design,colours:k.colours,seasonLabel:'',seasons:pick(k.season,kits.map(x=>x.season)),makers:pick(k.maker!,kits.map(x=>x.maker)),designs:pick(k.design!,kits.map(x=>x.design))}))} club={club.identity.id} version={club.version} locale={locale}/>})()}
   {gate.key==='kits'&&<><p>{copy.kitsSub}</p><ul className="mag-tiles" style={{listStyle:'none',padding:0}}>{kitViews(club).map(k=><li className="mag-tile" key={k.id}><KitPlate kit={k}/><b><bdi>{k.season}</bdi></b><small><bdi>{[k.type,k.maker,k.design].filter(Boolean).join(' · ')}</bdi></small></li>)}</ul></>}
   {gate.key==='goal'&&<GoalBoard key={gameKey} items={goalDeal(club,round.seed)} club={club.identity.id} version={club.version} seed={round.seed} locale={locale} contentLocale={club.locales.content}/>}
   {gate.key==='royal-rumble'&&<RumbleBoard key={gameKey} draft={dealDraft(ratedPool(club),round.seed)} club={club.identity.id} version={club.version} seed={round.seed} locale={locale}/>}
   {gate.key==='derby'&&await (async()=>{const rival=rivalsOf(club)[0];if(!rival)return null;const aliases=Array.isArray((rival.value as {aliases?:unknown}).aliases)?((rival.value as {aliases?:string[]}).aliases||[]):[];const ms=await meetingsBetween(club.identity.id,rival.value.name,aliases),t=tallyOf(ms);return <DerbyWall rival={rival.value.name} meetings={ms} tally={t} copy={{sub:copy.derbySub,rival:copy.derbyRival,meetings:copy.derbyMeetings,none:copy.derbyNone,won:copy.derbyWon,drawn:copy.derbyDrawn,lost:copy.derbyLost,goals:copy.derbyGoals,biggest:copy.derbyBiggest,decade:copy.derbyDecade,more:copy.derbyMore}} locale={locale} contentLocale={club.locales.content}/>})()}
   {gate.key==='archive'&&<><p>{copy.archiveSub}</p><form className="game-filters" method="get"><input type="hidden" name="lang" value={locale}/><label>{copy.search}<input type="search" name="q" defaultValue={searchParams.q||''}/></label><label><input type="checkbox" name="today" value="1" defaultChecked={!!searchParams.today}/>{copy.onThisDay}</label><button className="game-button min-h-tap">{copy.search}</button></form>{!events.length&&!selected&&<p>{copy.nothingToday}</p>}{(selected?[selected]:events.slice((page-1)*20,page*20)).map(f=><article className="game-panel" data-testid="archive-entry" key={f.id}><h2 lang={club.locales.content} dir="auto">{f.value.title}</h2>{f.value.on?<time dateTime={f.value.on}>{localizedDate(f.value.on,locale)}</time>:<p>{f.value.year||copy.unknown}</p>}<p lang={club.locales.content} dir="auto">{f.value.hint}</p>{selected?<><p>{copy.documented}: {f.confidence}/3</p><p>{f.approvedBy==='legacy-curation'?copy.legacy:f.notes}</p>{f.sources.map(id=>{const s=club.sources.find(s=>s.id===id);return s?.url?<p key={id}><a href={s.url} target="_blank" rel="noreferrer">{copy.source}: <bdi>{s.title}</bdi> ↗</a></p>:<p key={id}>{copy.source}: <bdi>{s?.title||id}</bdi></p>})}<Link className="game-button" href={`?lang=${locale}`}>{copy.back}</Link></>:<Link className="game-button" href={`?${new URLSearchParams({event:f.id,lang:locale})}`}>{copy.archiveEntry} ↗</Link>}</article>)}{!selected&&<nav className="flex flex-wrap gap-4">{page>1&&<Link className="game-button" href={`?${new URLSearchParams({lang:locale,page:String(page-1),q:searchParams.q||'',...(searchParams.today?{today:'1'}:{})})}`}>← {page-1}</Link>}{page*20<events.length&&<Link className="game-button" href={`?${new URLSearchParams({lang:locale,page:String(page+1),q:searchParams.q||'',...(searchParams.today?{today:'1'}:{})})}`}>{page+1} →</Link>}</nav>}</>}
  </>}
  <footer className="mag-colophon"><Link className="min-h-tap" href={`/master/core?club=${club.identity.id}`}>{copy.evidence} ↗</Link><p className="break-all">{copy.edition} · <bdi>{club.version}</bdi></p></footer>
 </main></ClubSurface>
}
