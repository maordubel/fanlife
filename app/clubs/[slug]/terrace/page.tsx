import Link from 'next/link'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import type {CSSProperties} from 'react'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {FixtureCard,MatchTicket} from '@/components/clubs/FixtureCard'
import {ClubActivity} from '@/components/clubs/games/ClubActivity'
import {BelovedPlate} from '@/components/clubs/ClubGateWall'
import {KickOff} from '@/components/clubs/ClubToday'
import {Badge} from '@/components/clubs/Badge'
import {Plate} from '@/components/weekly/Plate'
import {readState} from '@/lib/master/store'
import {loadClub,resolveClubId} from '@/lib/clubs/resolver'
import {gateAccess} from '@/lib/clubs/access'
import {evaluationMode} from '@/lib/master/mode'
import {REGISTRY} from '@/lib/master/registry'
import {clubTheme} from '@/lib/clubs/theme'
import {uiLocale} from '@/lib/clubs/locale'
import {SHARED_GATES,gateAvailability,sharedGate,type GateKey} from '@/lib/clubs/gates'
import {worldFor} from '@/lib/clubs/world'
import {belovedOf,wallNumbers} from '@/lib/clubs/beloved'
import {gameCopy} from '@/lib/clubs/game-copy'
import {getFixtureFeed} from '@/lib/fixtures/service'
import {livery} from '@/lib/club-livery'
import {clubHref} from '@/lib/clubs/club-href'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
export const dynamic='force-dynamic'
export function generateMetadata({params}:{params:{slug:string}}){const c=REGISTRY.find(r=>r.id===params.slug);return {title:c?`${worldFor(c).terraceTab} · ${c.name}`:en.terraceTitle}}

/**
 * The terrace — the issue's pull-out poster (rule 124): the club's loudest end in big type with the fan on the plate, the
 * terrace's own game behind its number, the next match ticket, your season ticket on this device and the vote.
 */
export default async function Terrace({params,searchParams}:{params:{slug:string};searchParams:{lang?:string}}) {
 const id=resolveClubId(headers().get('host'),params.slug,evaluationMode())
 if(!id)notFound()
 const [state,core]=await Promise.all([readState(),loadClub(id)])
 const c=state.clubs.find(x=>x.id===id)
 if(!c)notFound()
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en,reg=REGISTRY.find(r=>r.id===id)||c,theme=core?.data.theme||clubTheme(reg),world=worldFor(reg),lv=livery(id),games=gameCopy(locale)
 const feed=await getFixtureFeed(new Date()).catch(()=>null),fx=feed?.fixtures.find(f=>f.clubId===id)
 const vote=core&&gateAccess(c,sharedGate('polls')!.number,evaluationMode()).allowed&&gateAvailability(core.data,'polls').playable
 const open:GateKey[]=core?SHARED_GATES.filter(g=>gateAccess(c,g.number,evaluationMode()).allowed&&gateAvailability(core.data,g.key).playable).map(g=>g.key):[]
 const beloved=belovedOf(world.terrace,open),num=wallNumbers(beloved)
 const word=world.terrace?.local?world.terrace.local.replace(/\s*\d+\s*/g,' ').trim()||copy.wallGate:copy.wallGate
 const fill=(t:string)=>t.replaceAll('{club}',c.name).replaceAll('{city}',c.city)
 const name=world.terrace?.name??copy.terraceTitle,parts=name.split(/\s+(?=\d+$)/)
 const longest=Math.max(4,...name.split(/\s+/).map(w=>w.length))
 return <ClubSurface theme={theme} clubId={id} locale={locale}><main id="main" className="wkk wkk-terrace">
  <section className="wk-panel wk-lift wkk-poster wk-clubplate" aria-labelledby="terrace-h">
   <span className="wk-speed" aria-hidden="true"/>
   <span className="wkk-poster-scarf wk-stripes" aria-hidden="true"/>
   <Plate art="fanfist" ink="ink" className="wkk-poster-fan"/>
   <span className="wk-flash wkk-poster-flash" aria-hidden="true"/>
   {beloved&&beloved.number!==null&&<span className="wk-roundel wkk-poster-no" aria-hidden="true"><span className="wk-k" lang={world.terrace?.script}>{word}</span><b className="wk-num" dir="ltr">{beloved.number}</b></span>}
   <div className="wkk-poster-head">
    <p className="wk-tag ink">{copy.terraceKicker}</p>
    <h1 id="terrace-h" className="wk-logo wkk-poster-h" style={{['--len' as string]:longest} as CSSProperties}>{parts.map((p,i)=><span key={i}>{p}</span>)}{world.terrace?.local&&<bdi className="wkk-sr" lang={world.terrace.script} dir="auto"> {world.terrace.local}</bdi>}</h1>
   </div>
   {world.terrace&&<p className="wk-cap white wkk-poster-cap">{world.terrace.line}</p>}
  </section>

  {core&&beloved&&<section className="wkk-tgame" aria-label={copy.wallFeatured}>
   <BelovedPlate clubId={id} beloved={beloved} locale={locale} games={games} variant="terrace"
    copy={{featured:copy.wallFeatured,shout:copy.wkkTerraceGame,title:fill(copy.wallFeatureShirt),cta:games.play,gateWord:copy.wallGate,local:word,script:world.terrace?.script}}/>
   <div className="wkk-tgame-kick"><KickOff href={clubHref(id,beloved.feature,locale)} n={num[beloved.feature]} gateWord={copy.wallGate} shout={copy.wkkDesignIt} label={`${fill(copy.wallFeatureShirt)} — ${games.play}`}/></div>
  </section>}

  <section className="wkk-tnext" aria-labelledby="tnext-h">
   <div className="wkk-sechead"><h2 id="tnext-h" className="wk-logo red sm wk-tilt">{copy.fixtureCard}</h2></div>
   {fx&&lv?<FixtureCard clubId={id} clubName={c.name} fx={fx} lv={lv} locale={locale} copy={{kicker:copy.fixtureCard,vs:copy.vs,cta:copy.nextCta,kick:copy.wkkKickWord}}/>
   :<MatchTicket kicker={copy.wkkTbc} title={copy.terraceNoFixture} stub={{small:copy.wkkKickWord,big:copy.wkkTbcShort}}><p className="wkk-ticket-note">{copy.wkkTicketFills}</p></MatchTicket>}
  </section>

  {core&&<section className="wkk-season" aria-labelledby="season-h">
   <div className="wk-panel shadow wkk-season-in">
    <header className="wk-stripes wkk-season-head"><span className="wkk-card-crest"><Badge club={{id,pattern:lv?.pattern,initials:c.initials,name:c.name}}/></span><h2 id="season-h" className="wk-logo sm">{copy.terraceSeason}</h2></header>
    <ClubActivity club={id} locale={locale}/>
   </div>
  </section>}

  {vote&&<section className="wkk-vote" aria-labelledby="vote-h">
   <div className="wk-panel shadow wkk-vote-in">
    <span className="wkk-vote-art wk-sky" aria-hidden="true"><svg className="wkk-ballot" viewBox="0 0 80 80"><path className="slip" d="M28 8h26v26H28z"/><path className="mark" d="M34 14l14 14M48 14L34 28"/><path className="box" d="M14 34h52v36H14z"/><path className="slot" d="M28 40h24"/><path className="star" d="M40 48l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6-4.5-4 6-1z"/></svg></span>
    <div className="wkk-vote-t">
     <p className="wk-k red">{games['gate.polls']}</p>
     <h2 id="vote-h" className="wk-head">{copy.terraceVote}</h2>
     <p className="wkk-vote-line">{games['blurb.polls']}</p>
     <Link className="wk-btn red wkk-vote-cta min-h-tap" href={clubHref(id,'polls',locale)}>{copy.terraceVote} <span aria-hidden="true">→</span></Link>
    </div>
   </div>
  </section>}

  <div className="wkk-crowd wk-clubplate" aria-hidden="true">
   <span className="wk-speed"/>
   <Plate art="fans" ink="ink" className="wkk-crowd-a"/>
   <Plate art="fans" ink="ink" flip className="wkk-crowd-b"/>
   {world.terrace?.local&&<span className="wk-tag ink wkk-crowd-tag" lang={world.terrace.script}>{world.terrace.local}</span>}
  </div>
 </main></ClubSurface>
}
