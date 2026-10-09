import Link from 'next/link'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import {ShareComposer} from '@/components/share/v3/ShareComposer'
import {coverShare} from '@/lib/share/v3/adapters'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {GateTickets,type GateState} from '@/components/clubs/GateTickets'
import {ClubGateWall} from '@/components/clubs/ClubGateWall'
import {SupporterCard} from '@/components/clubs/SupporterCard'
import {ClubToday} from '@/components/clubs/ClubToday'
import {momentFor} from '@/lib/clubs/today'
import {belovedOf} from '@/lib/clubs/beloved'
import {ClubEntrance} from '@/components/clubs/ClubEntrance'
import {FixtureCard} from '@/components/clubs/FixtureCard'
import {Dye} from '@/components/master/Dye'
import {Seal,TornBlocks,Cutout} from '@/components/master/Poster'
import {readState} from '@/lib/master/store'
import {loadClub,resolveClubId} from '@/lib/clubs/resolver'
import {gateAccess} from '@/lib/clubs/access'
import {evaluationMode} from '@/lib/master/mode'
import {REGISTRY} from '@/lib/master/registry'
import {clubTheme} from '@/lib/clubs/theme'
import {uiLocale,UI_LOCALES} from '@/lib/clubs/locale'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
import {SHARED_GATES,gateAvailability,type GateKey} from '@/lib/clubs/gates'
import {gameCopy} from '@/lib/clubs/game-copy'
import {lifeEntry} from '@/lib/clubs/life/entry'
import {getFixtureFeed} from '@/lib/fixtures/service'
import {livery} from '@/lib/club-livery'
import {worldFor,nicknameLine} from '@/lib/clubs/world'
import {clubHref} from '@/lib/clubs/club-href'
import {todaysPick} from '@/lib/clubs/play-groups'
import {todayInIsrael} from '@/lib/date/israel'
export const dynamic='force-dynamic'
export function generateMetadata({params}:{params:{slug:string}}){const c=REGISTRY.find(r=>r.id===params.slug);return c?{title:`${c.name} — ${c.city}`,description:nicknameLine(worldFor(c))||undefined}:{}}

/** A club's home: its hero (drawn after the club's own layout), the match day, your rounds, today's pick, LIFE, and a door into its history and its terrace. */
export default async function Page({params,searchParams}:{params:{slug:string};searchParams:{lang?:string}}) {
 const id=resolveClubId(headers().get('host'),params.slug,evaluationMode())
 if(!id)notFound()
 const [state,core]=await Promise.all([readState(),loadClub(id)])
 const c=state.clubs.find(c=>c.id===id)
 if(!c)notFound()
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en,reg=REGISTRY.find(r=>r.id===c.id)||c,theme=core?.data.theme||clubTheme(reg)
 const feed=await getFixtureFeed(new Date()).catch(()=>null),fx=feed?.fixtures.find(f=>f.clubId===id),lv=livery(id),world=worldFor(reg)
 const games=gameCopy(locale),life=await lifeEntry(id,{evaluation:evaluationMode(),paused:c.status==='paused',locale})
 const states:GateState[]=core?SHARED_GATES.map(g=>({key:g.key,allowed:gateAccess(c,g.number,evaluationMode()).allowed,playable:gateAvailability(core.data,g.key).playable})):[]
 const open=states.filter(s=>s.allowed&&s.playable).map(s=>s.key as GateKey)
 const pick=todaysPick(id,open,todayInIsrael()),pickGate=pick?SHARED_GATES.find(g=>g.key===pick)!:null
 const fill=(t:string)=>t.replaceAll('{club}',c.name).replaceAll('{city}',c.city)
 const layout=lv?.layout??'poster',place=world.voice.kicker.split(' · ')
 const names=Object.fromEntries(SHARED_GATES.map(g=>[g.key,games[`gate.${g.key}`]]))
 return <ClubSurface theme={theme} clubId={c.id} locale={locale}><main id="main" className="mag-home club-home" data-hero={layout}>
  {core&&<ClubEntrance clubId={id} name={c.name} tap={copy.entranceTap}/>}
  <section className="mag-homehero club-hero" aria-labelledby="club-h">
   <span className="mag-pitchlines" aria-hidden="true"/>
   {layout==='curtain'&&<span className="mag-band club-curtain" data-livery={lv?.pattern} aria-hidden="true"/>}
   {layout==='split'&&<span className="mag-band club-halfpane" data-livery={lv?.pattern} aria-hidden="true"/>}
   {layout==='ground'&&<span className="club-markings" aria-hidden="true"/>}
   <div className="mag-homehero-in">
    <Seal name={c.name} city={c.city} initials={c.initials} pattern={lv?.pattern}/>
    <p className="mag-homewelcome">{world.voice.welcome}</p>
    <h1 id="club-h" style={{['--len' as string]:Math.max(6,...c.name.split(/\s+/).map(w=>w.length))}}>{c.name}</h1>
    <p className="mag-homeplace">{place.map((p,i)=><span key={p}>{i>0&&<i aria-hidden="true">|</i>}{p}</span>)}</p>
    {world.nicknames.length>0&&<p className="club-aka" data-testid="club-aka">{world.nicknames.map(n=><span key={n.text}>{n.text}{n.local&&<> <bdi lang={n.script} dir="auto">{n.local}</bdi></>}</span>)}</p>}
    {core&&open.length>0&&<div className="mag-homeshare"><ShareComposer draft={coverShare(c.id,states.filter(x=>x.allowed&&x.playable).map(x=>SHARED_GATES.find(g=>g.key===x.key)!.name))} label={copy.homeShare}/></div>}
   </div>
   <div className="mag-homestage" aria-hidden="true"><TornBlocks seed={c.id} pattern={lv?.pattern}/><Cutout art="kicker" className="mag-homekick"/></div>
  </section>
  {searchParams.lang&&!UI_LOCALES.includes(searchParams.lang as 'en'|'he')&&<section className="mag-section"><p className="panel">{copy.fallback}</p></section>}
  {fx&&lv?<FixtureCard clubId={id} clubName={c.name} fx={fx} lv={lv} locale={locale} copy={{kicker:copy.fixtureCard,vs:copy.vs,cta:copy.nextCta}}/>
  :world.ground&&<section className="mag-section club-matchday" aria-labelledby="md-h"><article className="mag-homecard"><div><p className="mag-kicker">{copy.homeVoice}</p><h2 id="md-h">{world.ground.name}{world.ground.local&&<> <bdi className="club-local" lang={world.ground.script} dir="auto">{world.ground.local}</bdi></>}</h2><p>{world.ground.line}</p></div></article></section>}
  {core&&<ClubToday clubId={id} clubName={c.name} moment={momentFor(core.data,new Date())} pick={pickGate?{key:pickGate.key,name:games[`gate.${pickGate.key}`]}:null} locale={locale} copy={{kicker:copy.todayKicker,exact:copy.todayExact,near:copy.todayNear,open:copy.todayOpen,pick:copy.todayPick}}/>}
  <section className="mag-section club-lifebar" id="life-block"><div className="club-lifebar-in" id="life" data-life-entry={life.state}><Dye art="face" className="club-lifebar-face"/><div className="club-lifebar-text"><p className="mag-kicker">LIFE</p><h2>{copy.lifeTitle}</h2><p>{life.href?copy.lifeOpen:copy.lifeWorkshop}</p></div>{life.href&&<Link className="mag-cta red min-h-tap" href={life.href}>{copy.life}</Link>}</div></section>
  {core&&<section className="mag-section" id="gates" aria-labelledby="gates-h"><hr className="mag-rule"/><div className="mag-head"><div><p className="mag-kicker">{copy.wallKicker}</p><h2 className="mag-h2" id="gates-h">{copy.wallTitle}</h2></div></div>
   <ClubGateWall clubId={id} states={states} locale={locale} games={games} soon={copy.wallSoon} gateWord={copy.wallGate} beloved={belovedOf(world.terrace,open)} featuredWord={copy.wallFeatured} featureTitle={fill(copy.wallFeatureShirt)} terraceLine={world.terrace?.line} away={{open:id==='hapoel-tel-aviv',href:'/away-days',name:copy.awayName,note:copy.awayNote}}/></section>}
  {core&&<section className="mag-section" id="club-market"><Link className="mag-chip min-h-tap" href={`/market?club=${id}`}>{copy.marketName} — {copy.marketNote} →</Link></section>}
  {core&&<section className="mag-section" id="card" aria-label={copy.cardKicker}><SupporterCard clubId={id} clubName={c.name} initials={c.initials} pattern={lv?.pattern} locale={locale} open={open} names={names} total={SHARED_GATES.length} copy={{kicker:copy.cardKicker,title:copy.cardTitle,gates:copy.cardGates,rounds:copy.cardRounds,been:copy.cardBeen,since:copy.cardSince,empty:copy.cardEmpty,next:copy.cardNext}}/></section>}
  {core&&<section className="mag-section" id="terrace"><hr className="mag-rule"/><div className="mag-hometerrace"><Dye art="terrace-scarf" className="mag-homescarf"/><div className="mag-head"><div><p className="mag-kicker">{copy.homeTerrace}</p><h2 className="mag-h2">{world.terrace?.name??copy.homeTerraceTitle}</h2></div><Link className="mag-chip" href={clubHref(id,'terrace',locale)}>{world.terraceTab} →</Link></div></div>{world.terrace&&<p className="club-terrace-line">{world.terrace.line}</p>}</section>}
 </main></ClubSurface>
}
