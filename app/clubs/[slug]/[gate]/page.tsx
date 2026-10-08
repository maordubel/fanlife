import Link from 'next/link'
import {REGISTRY} from '@/lib/master/registry'
import {notFound} from 'next/navigation'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {requestClub} from '@/lib/clubs/request'
import {sharedGate,gateAvailability} from '@/lib/clubs/gates'
import {uiLocale} from '@/lib/clubs/locale'
import {gameCopy} from '@/lib/clubs/game-copy'
import {roundFrom} from '@/lib/rotation/round'
import {GateHead} from '@/components/clubs/GateHead'
import {PlayHeader} from '@/components/clubs/PlayHeader'
import {modeOf,isPlayMode} from '@/lib/clubs/layout-mode'
import {GATE_VIEWS} from '@/components/clubs/gates/registry'
import type {GateSearch,ViewKey} from '@/components/clubs/gates/types'
export const dynamic='force-dynamic'
export async function generateMetadata({params}:{params:{slug:string;gate:string}}){const c=REGISTRY.find(r=>r.id===params.slug),g=sharedGate(params.gate),name=g?(gameCopy('en') as Record<string,string>)[`gate.${g.key}`]:null;return {title:[name,c?.name].filter(Boolean).join(' · ')||'Club games'}}
export default async function Page({params,searchParams}:{params:{slug:string;gate:string};searchParams:GateSearch}){
 const gate=sharedGate(params.gate)
 if(!gate||gate.key==='timeline')notFound()
 const resolved=await requestClub(params.slug,gate.number)
 if(!resolved)notFound()
 const club=resolved.data,locale=uiLocale(searchParams.lang),copy=gameCopy(locale),readiness=gateAvailability(club,gate.key),round=roundFrom(searchParams)
 const gameKey=`${club.identity.id}:${club.version}:${round.seed}:${round.cursor}:${locale}:${searchParams.topic||''}:${searchParams.era||''}:${searchParams.hard||''}`
 const mode=modeOf(gate.key),compact=readiness.playable&&isPlayMode(mode),sub={xi:'xiSub',trivia:'triviaSub',lineup:'lineupSub','kit-builder':'kitSub',kits:'kitsSub',memory:'memorySub',polls:'pollSub',goal:'goalSub','royal-rumble':'rumbleSub','blind-cow':'mysterySub',derby:'derbySub',archive:'archiveSub',timeline:'archiveSub'}[gate.key] as keyof typeof copy
 const langLinks=(['en','he'] as const).map(l=>({l,label:l==='en'?copy.english:copy.hebrew,href:`?${new URLSearchParams({...searchParams,lang:l} as Record<string,string>)}`}))
 const View=GATE_VIEWS[gate.key as ViewKey]
 return <ClubSurface theme={club.theme} clubId={club.identity.id} locale={locale} tabbar={!compact}><main id="main" className={`mag-game mx-auto min-h-screen ${gate.key==='royal-rumble'?'max-w-5xl':'max-w-3xl'} px-gutter py-8`} lang={locale} data-mode={mode}>
  {compact?<PlayHeader clubId={club.identity.id} clubName={club.identity.name} title={copy[`gate.${gate.key}`]} locale={locale} help={String(copy[sub])} copy={{back:copy['play.back'],help:copy['play.help'],close:copy['play.close'],fanlife:copy['play.fanlife'],language:copy['play.language']}} langLinks={langLinks}/>:<GateHead clubId={club.identity.id} clubName={club.identity.name} hubLabel={copy.hub} gateNo={String(gate.number)} gateNoLabel={copy.gateNo} title={copy[`gate.${gate.key}`]} state={readiness.state} stateLabel={copy[`state.${readiness.state}` as 'state.READY']} locale={locale} langLinks={langLinks}/>}
  {!readiness.playable?<section className="game-panel" data-testid="gate-locked"><h2>{copy.locked}</h2><p>{copy.lockedNote}</p><Link className="game-button" href={`/clubs/${club.identity.id}?lang=${locale}`}>{copy.backToClub}</Link></section>:<>
   {readiness.state==='PARTIAL'&&<p className="my-4 border-hair border-ink p-3">{copy.partial}</p>}
   {await View({club,locale,copy:copy as never,round,gameKey,searchParams,state:readiness.state})}
  </>}
 </main></ClubSurface>
}
