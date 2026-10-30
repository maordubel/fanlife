import {clubSubMetadata} from '@/lib/seo/club'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import type {GateState} from '@/components/clubs/GateTickets'
import {ClubGateWall} from '@/components/clubs/ClubGateWall'
import {readState} from '@/lib/master/store'
import {loadClub,resolveClubId} from '@/lib/clubs/resolver'
import {gateAccess} from '@/lib/clubs/access'
import {evaluationMode} from '@/lib/master/mode'
import {REGISTRY} from '@/lib/master/registry'
import {clubTheme} from '@/lib/clubs/theme'
import {uiLocale} from '@/lib/clubs/locale'
import {SHARED_GATES,gateAvailability,type GateKey} from '@/lib/clubs/gates'
import {gameCopy} from '@/lib/clubs/game-copy'
import {todaysPick} from '@/lib/clubs/play-groups'
import {belovedOf} from '@/lib/clubs/beloved'
import {worldFor} from '@/lib/clubs/world'
import {Suspense} from 'react'
import {LegendsBanner} from '@/components/legends/ClubBanner'
import {ClubLifeCard} from '@/components/clubs/ClubLifeCard'
import {lifeEntry,lifeCompatFor} from '@/lib/clubs/life/entry'
import {todayInIsrael} from '@/lib/date/israel'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
export const dynamic='force-dynamic'
export function generateMetadata({params}:{params:{slug:string}}){const c=REGISTRY.find(r=>r.id===params.slug);return c?clubSubMetadata({id:c.id,name:c.name,sub:'play'}):{title:en.playTitle}}

/** Play: the gate wall — thirteen comic covers, the beloved gate big at the top, grouped Quick, Deep and the archive shelf. */
export default async function Play({params,searchParams}:{params:{slug:string};searchParams:{lang?:string}}) {
 const id=resolveClubId(headers().get('host'),params.slug,evaluationMode())
 if(!id)notFound()
 const [state,core]=await Promise.all([readState(),loadClub(id)])
 const c=state.clubs.find(x=>x.id===id)
 if(!c)notFound()
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en,games=gameCopy(locale),reg=REGISTRY.find(r=>r.id===id)||c,theme=core?.data.theme||clubTheme(reg),world=worldFor(reg)
 const states:GateState[]=core?SHARED_GATES.map(g=>({key:g.key,allowed:gateAccess(c,g.number,evaluationMode()).allowed,playable:gateAvailability(core.data,g.key).playable})):[]
 const open=states.filter(s=>s.allowed&&s.playable).map(s=>s.key as GateKey),anyOpen=open.length>0
 const beloved=belovedOf(world.terrace,open),pick=todaysPick(id,open,todayInIsrael())
 const life=await lifeEntry(id,{evaluation:evaluationMode(),paused:c.status==='paused',status:c.status,locale})
 const word=world.terrace?.local?world.terrace.local.replace(/\s*\d+\s*/g,' ').trim()||copy.wallGate:copy.wallGate
 const fill=(t:string)=>t.replaceAll('{club}',c.name).replaceAll('{city}',c.city)
 const title=<div className="wkk-wall-title"><p className="wk-banner">{copy.wkkInsideIssue}</p><h1 className="wk-logo red wk-tilt">{copy.wkkGatesN.replace('{n}',String(SHARED_GATES.length))}</h1><p className="wk-k muted">{copy.playKicker}</p></div>
 return <ClubSurface theme={theme} clubId={id} locale={locale}><main id="main" className="wkk wkk-play club-play">
  {!core||!anyOpen?<section className="wkk-play-none">{title}<p className="wk-cap white">{core?copy.playNone:copy.workshopNote}</p></section>
  :<ClubGateWall clubId={id} states={states} locale={locale} games={games} beloved={beloved} pickKey={pick} title={title}
    belovedCopy={{featured:`${copy.wallFeatured} · ${copy.wkkTerraceGame}`,shout:copy.wkkTerraceGame,title:fill(copy.wallFeatureShirt),line:world.terrace?.line,cta:games.play,gateWord:copy.wallGate,local:word,script:world.terrace?.script}}
    copy={{soon:c.status==='paused'?copy.paused:games.comingSoon,gateWord:copy.wallGate,all:copy.wkkAll,quick:copy.playQuick,deep:copy.playDeep,archive:copy.wkkArchiveShort,quickNote:copy.playQuickNote,deepNote:copy.playDeepNote,archiveNote:copy.playArchiveNote,show:copy.wkkShowGates,pick:copy.homeToday,mark:{best:games.best,played:copy.wkkPlayed,fresh:copy.wkkFresh,xi:games.xiSaved}}}/>}
 {core&&anyOpen&&<div className="wkk-playextras">
   <div className="wkk-legends"><Suspense fallback={null}><LegendsBanner club={id} name={c.name} theme={theme}/></Suspense></div>
   <ClubLifeCard href={life.href} state={life.state} copy={copy} club={id} compat={life.href&&core?lifeCompatFor(core.data):null}/>
  </div>}
 </main></ClubSurface>
}
