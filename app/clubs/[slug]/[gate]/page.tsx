import Link from 'next/link'
import {notFound} from 'next/navigation'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {TriviaBoard} from '@/components/clubs/games/TriviaBoard'
import {MemoryBoard} from '@/components/clubs/games/MemoryBoard'
import {XIBuilder} from '@/components/clubs/games/XIBuilder'
import {requestClub} from '@/lib/clubs/request'
import {sharedGate,gateAvailability} from '@/lib/clubs/gates'
import {clubTrivia,clubMemory,triviaSpec} from '@/lib/clubs/games'
import {uiLocale,localizedDate} from '@/lib/clubs/locale'
import {gameCopy} from '@/lib/clubs/game-copy'
import {roundFrom} from '@/lib/rotation/round'
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
 const dates=new Date().toISOString().slice(5,10),query=(searchParams.q||'').slice(0,100).toLocaleLowerCase(),events=club.timeline.filter(f=>(!searchParams.today||f.value.on.slice(5,10)===dates)&&(!query||`${f.value.title} ${f.value.on} ${f.value.hint}`.toLocaleLowerCase().includes(query))),selected=searchParams.event?club.timeline.find(f=>f.id===searchParams.event):null
 if(searchParams.event&&!selected&&gate.key==='archive')notFound()
 const rawPage=Number(searchParams.page),page=Number.isSafeInteger(rawPage)&&rawPage>0?Math.min(rawPage,Math.max(1,Math.ceil(events.length/20))):1
 return <ClubSurface theme={club.theme} clubId={club.identity.id} locale={locale}><main id="main" className="mx-auto min-h-screen max-w-3xl px-gutter py-8" lang={locale}>
  <nav className="mb-6 flex flex-wrap justify-between gap-4"><Link className="min-h-tap py-3" href={`/clubs/${club.identity.id}?lang=${locale}`}>{copy.hub} · <bdi>{club.identity.name}</bdi> ↗</Link><div className="flex gap-4">{(['en','he'] as const).map(l=><Link key={l} className="min-h-tap py-3" href={`?${new URLSearchParams({...searchParams,lang:l} as Record<string,string>)}`} hrefLang={l}>{l==='en'?copy.english:copy.hebrew}</Link>)}</div></nav>
  <div className="identity-rule mb-6" aria-hidden="true"/><p>FAN LIFE / {gate.number} · {readiness.state}</p><h1 className="my-4 font-display text-step-3">{copy[`gate.${gate.key}`]}</h1>
  {!readiness.playable?<section className="game-panel" data-testid="gate-locked"><h2>{copy.locked}</h2><p>{gate.requirement}</p>{readiness.reasons.map(r=><p key={r}>{r}</p>)}<Link className="game-button" href={`/master/core?club=${club.identity.id}`}>{copy.evidence} ↗</Link></section>:<>
   {readiness.state==='PARTIAL'&&<p className="my-4 border-hair border-ink p-3">{copy.partial}</p>}
   {gate.key==='trivia'&&trivia&&<><form className="game-filters" method="get"><input type="hidden" name="lang" value={locale}/><input type="hidden" name="seed" value={round.seed}/><label>{copy.anyTopic}<select name="topic" defaultValue={spec.topic||''}><option value="">{copy.anyTopic}</option>{Object.entries(trivia.topicCounts()).filter(([t,n])=>t!=='general'&&n>=3).map(([t,n])=><option key={t} value={t}>{t} ({n})</option>)}</select></label><label>{copy.anyEra}<select name="era" defaultValue={spec.decade||''}><option value="">{copy.anyEra}</option>{trivia.eraChips(spec.topic).filter(e=>e.count>=3).map(e=><option key={e.decade} value={e.decade}>{e.decade} ({e.count})</option>)}</select></label><label><input type="checkbox" name="hard" value="1" defaultChecked={spec.hard}/>{copy.hard}</label><button className="game-button min-h-tap">{copy.play}</button></form>{questions.length>=3?<TriviaBoard key={gameKey} questions={questions} club={club.identity.id} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale} contentLocale={club.locales.content} topic={spec.topic||undefined} era={spec.decade===null?undefined:String(spec.decade)} hard={spec.hard?'1':undefined}/>:<p className="game-panel" data-testid="trivia-empty">{copy.empty}</p>}</>}
   {gate.key==='memory'&&<MemoryBoard key={gameKey} round={clubMemory(club,round.seed,round.cursor)} club={club.identity.id} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale} contentLocale={club.locales.content}/>}
   {gate.key==='xi'&&<XIBuilder players={(club.players||[]).map(f=>f.value)} club={club.identity.id} locale={locale} contentLocale={club.locales.content}/>}
   {gate.key==='archive'&&<><p>{copy.archiveSub}</p><form className="game-filters" method="get"><input type="hidden" name="lang" value={locale}/><label>{copy.search}<input type="search" name="q" defaultValue={searchParams.q||''}/></label><label><input type="checkbox" name="today" value="1" defaultChecked={!!searchParams.today}/>{copy.onThisDay}</label><button className="game-button min-h-tap">{copy.search}</button></form>{!events.length&&!selected&&<p>{copy.nothingToday}</p>}{(selected?[selected]:events.slice((page-1)*20,page*20)).map(f=><article className="game-panel" data-testid="archive-entry" key={f.id}><h2 lang={club.locales.content} dir="auto">{f.value.title}</h2><time dateTime={f.value.on}>{localizedDate(f.value.on,locale)}</time><p lang={club.locales.content} dir="auto">{f.value.hint}</p>{selected?<><p>{copy.documented}: {f.confidence}/3</p><p>{f.approvedBy==='legacy-curation'?copy.legacy:f.notes}</p>{f.sources.map(id=>{const s=club.sources.find(s=>s.id===id);return s?.url?<p key={id}><a href={s.url} target="_blank" rel="noreferrer">{copy.source}: <bdi>{s.title}</bdi> ↗</a></p>:<p key={id}>{copy.source}: <bdi>{s?.title||id}</bdi></p>})}<Link className="game-button" href={`?lang=${locale}`}>{copy.back}</Link></>:<Link className="game-button" href={`?${new URLSearchParams({event:f.id,lang:locale})}`}>{copy.archiveEntry} ↗</Link>}</article>)}{!selected&&<nav className="flex flex-wrap gap-4">{page>1&&<Link className="game-button" href={`?${new URLSearchParams({lang:locale,page:String(page-1),q:searchParams.q||'',...(searchParams.today?{today:'1'}:{})})}`}>← {page-1}</Link>}{page*20<events.length&&<Link className="game-button" href={`?${new URLSearchParams({lang:locale,page:String(page+1),q:searchParams.q||'',...(searchParams.today?{today:'1'}:{})})}`}>{page+1} →</Link>}</nav>}</>}
  </>}
  <footer className="mt-12 border-t-hair border-ink/25 pt-5"><Link className="min-h-tap inline-block py-3" href={`/master/core?club=${club.identity.id}`}>{copy.evidence} ↗</Link><p className="break-all">Version: <bdi>{club.version}</bdi></p></footer>
 </main></ClubSurface>
}
