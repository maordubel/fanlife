import Link from 'next/link'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import type {CSSProperties} from 'react'
import {ShareComposer} from '@/components/share/v3/ShareComposer'
import {coverShare} from '@/lib/share/v3/adapters'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import type {GateState} from '@/components/clubs/GateTickets'
import {BelovedPlate,GateArt,PickAGate} from '@/components/clubs/ClubGateWall'
import {CarryOn,SupporterCard} from '@/components/clubs/SupporterCard'
import {KickOff,TodayMoment} from '@/components/clubs/ClubToday'
import {momentFor} from '@/lib/clubs/today'
import {belovedOf,wallNumbers} from '@/lib/clubs/beloved'
import {ClubEntrance} from '@/components/clubs/ClubEntrance'
import {FixtureCard,MatchTicket} from '@/components/clubs/FixtureCard'
import {Plate} from '@/components/weekly/Plate'
import {Icon} from '@/components/weekly/Icon'
import {readState} from '@/lib/master/store'
import {loadClub,resolveClubId} from '@/lib/clubs/resolver'
import {gateAccess} from '@/lib/clubs/access'
import {evaluationMode} from '@/lib/master/mode'
import {REGISTRY} from '@/lib/master/registry'
import {clubTheme} from '@/lib/clubs/theme'
import {uiLocale,UI_LOCALES,localizedDate} from '@/lib/clubs/locale'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
import {SHARED_GATES,gateAvailability,type GateKey} from '@/lib/clubs/gates'
import {gameCopy} from '@/lib/clubs/game-copy'
import {lifeEntry} from '@/lib/clubs/life/entry'
import {getFixtureFeed} from '@/lib/fixtures/service'
import {livery} from '@/lib/club-livery'
import {hasClubAway} from '@/lib/away-days/club'
import {ClubFlavour} from '@/components/clubs/ClubFlavour'
import {worldFor,nicknameLine,flavourFor} from '@/lib/clubs/world'
import {clubHref} from '@/lib/clubs/club-href'
import {todaysPick} from '@/lib/clubs/play-groups'
import {todayInIsrael} from '@/lib/date/israel'
import {Suspense} from 'react'
import {LegendsBanner} from '@/components/legends/ClubBanner'
export const dynamic='force-dynamic'
export function generateMetadata({params}:{params:{slug:string}}){const c=REGISTRY.find(r=>r.id===params.slug);return c?{title:`${c.name} — ${c.city}`,description:nicknameLine(worldFor(c))||undefined}:{}}

/**
 * A club's home is THE WEEKLY's club issue (rule 124): the masthead panel with the kicker breaking the frame, today's pick
 * as the cover story with the Kick off! plate, the carry-on coupon, the beloved gate's plate, "Pick a gate" (a segmented
 * choice and two covers a row — never a rail), the Legends banner, LIFE, one "Did you know?", the next match ticket, your
 * supporter card and the contents rows. A phone reads it top to bottom; a desktop lays it out as a double-page spread.
 */
export default async function Page({params,searchParams}:{params:{slug:string};searchParams:{lang?:string}}) {
 const id=resolveClubId(headers().get('host'),params.slug,evaluationMode())
 if(!id)notFound()
 const [state,core]=await Promise.all([readState(),loadClub(id)])
 const c=state.clubs.find(c=>c.id===id)
 if(!c)notFound()
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en,reg=REGISTRY.find(r=>r.id===c.id)||c,theme=core?.data.theme||clubTheme(reg)
 const feed=await getFixtureFeed(new Date()).catch(()=>null),fx=feed?.fixtures.find(f=>f.clubId===id),lv=livery(id),world=worldFor(reg)
 const games=gameCopy(locale),life=await lifeEntry(id,{evaluation:evaluationMode(),paused:c.status==='paused',status:c.status,locale})
 const states:GateState[]=core?SHARED_GATES.map(g=>({key:g.key,allowed:gateAccess(c,g.number,evaluationMode()).allowed,playable:gateAvailability(core.data,g.key).playable})):[]
 const open=states.filter(s=>s.allowed&&s.playable).map(s=>s.key as GateKey)
 const today=todayInIsrael(),pick=todaysPick(id,open,today),pickGate=pick?SHARED_GATES.find(g=>g.key===pick)!:null
 const fill=(t:string)=>t.replaceAll('{club}',c.name).replaceAll('{city}',c.city)
 const dayIdx=Math.floor(Date.now()/86400000),flav=flavourFor(world,dayIdx),flav2=flavourFor(world,dayIdx,1)
 const layout=lv?.layout??'poster'
 const names=Object.fromEntries(SHARED_GATES.map(g=>[g.key,games[`gate.${g.key}`]]))
 const beloved=belovedOf(world.terrace,open),num=wallNumbers(beloved)
 const moment=core?momentFor(core.data,new Date()):null
 const word=world.terrace?.local?world.terrace.local.replace(/\s*\d+\s*/g,' ').trim()||copy.wallGate:copy.wallGate
 const away=id==='hapoel-tel-aviv'?'/away-days':hasClubAway(id)?clubHref(id,'away-days',locale):null
 const mark={best:games.best,played:copy.wkkPlayed,fresh:copy.wkkFresh,xi:games.xiSaved}
 const longest=Math.max(6,...c.name.split(/\s+/).map(w=>w.length))
 const pickHref=pickGate?clubHref(id,pickGate.key,locale):''
 // the issue's one "Did you know?": the club's own dated moment; without one, a sourced local touch
 const dyk=moment?'moment':flav2&&flav2.id!==flav?.id?'flavour':null
 return <ClubSurface theme={theme} clubId={c.id} locale={locale}><main id="main" className="wkk wkk-home" data-hero={layout}>
  {core&&<ClubEntrance clubId={id} name={c.name} tap={copy.entranceTap}/>}

  {/* ═════ masthead ═════ */}
  <header className="wkk-mast" aria-labelledby="club-h">
   <p className="wk-banner wkk-tagline">{fill(copy.wkkTagline)}</p>
   <div className="wkk-mast-plate wk-clubplate wk-keyline">
    <span className="wk-speed" aria-hidden="true"/>
    <Plate art="kicker" ink="ink" className="wkk-mast-kicker"/>
    <Plate art="keeper" ink="ink" className="wkk-mast-keeper"/>
    <h1 id="club-h" className="wk-logo wkk-mast-name" style={{['--len' as string]:longest} as CSSProperties}>{c.name}</h1>
   </div>
   <div className="wkk-mast-line">
    <span className="wk-k">{copy.wkkEveryDay}</span>
    <span className="wk-k"><time dateTime={today}>{localizedDate(today,locale)}</time></span>
    {beloved&&beloved.number!==null&&<Link className="wk-roundel wkk-mast-gate" href={clubHref(id,'terrace',locale)} aria-label={`${world.terrace?.name??copy.homeTerrace} — ${world.terraceTab}`}><span className="wk-k" lang={world.terrace?.script}>{word}</span><b className="wk-num" dir="ltr">{beloved.number}</b></Link>}
   </div>
   <div className="wkk-mast-voice">
    <p className="wk-cap white wkk-welcome">{world.voice.welcome}</p>
    {world.nicknames.length>0&&<p className="wkk-aka" data-testid="club-aka">{world.nicknames.map(n=><span key={n.text} className="wk-tag ink">{n.text}{n.local&&<> <bdi lang={n.script} dir="auto">{n.local}</bdi></>}</span>)}</p>}
   </div>
  </header>
  {searchParams.lang&&!UI_LOCALES.includes(searchParams.lang as 'en'|'he')&&<p className="wk-cap wkk-span">{copy.fallback}</p>}

  {/* ═════ the cover story: today's pick ═════ */}
  <div className="wkk-lead" data-story={core&&pickGate?'':undefined}>
  {core&&pickGate&&<section className="wkk-story" aria-labelledby="cs-h">
   <Link className="wk-panel wk-lift wkk-story-in" href={pickHref} tabIndex={-1} aria-hidden="true">
    <GateArt gate={pickGate.key} big>
     <span className="wk-burst wkk-story-burst"><span className="wk-head white">{copy.wkkPickBurst}</span></span>
     <span className="wk-cap white wkk-story-cap">{games[`blurb.${pickGate.key}`]}</span>
    </GateArt>
   </Link>
   <div className="wkk-story-head"><h2 id="cs-h" className="wk-head red">{copy[`wkkCover_${pickGate.key}` as keyof typeof copy]??games[`gate.${pickGate.key}`]}</h2><p className="wkk-story-sub">{games[`gate.${pickGate.key}`]}</p></div>
  </section>}
  <div className="wkk-lead-side">
  {core&&pickGate&&<section className="wkk-pick" aria-label={copy.homeToday}>
   <p className="wk-k red">{copy.wkkPickLine}</p>
   <KickOff href={pickHref} n={num[pickGate.key]} gateWord={copy.wallGate} shout={copy.wkkKickOff} label={`${copy.todayPick}: ${names[pickGate.key]} — ${copy.wkkKickOff}`} testid="today-pick"/>
  </section>}
  {core&&open.length>0&&<div className="wkk-carry"><CarryOn clubId={id} locale={locale} open={open} names={names} copy={{carry:copy.wkkCarry,start:copy.wkkStart,next:copy.cardNext}}/></div>}

  {/* ═════ your gate ═════ */}
  {core&&beloved&&<section className="wkk-yourgate" aria-label={copy.wallFeatured}>
   <BelovedPlate clubId={id} beloved={beloved} locale={locale} games={games}
    copy={{featured:copy.wallFeatured,shout:copy.wkkTerraceGame,title:fill(copy.wallFeatureShirt),line:world.terrace?.line,cta:games.play,gateWord:copy.wallGate,local:word,script:world.terrace?.script}}/>
  </section>}
  </div></div>

  {/* ═════ pick a gate ═════ */}
  {core&&<PickAGate clubId={id} states={states} locale={locale} games={games} beloved={beloved} pickKey={pickGate?.key??null} playHref={clubHref(id,'play',locale)}
   copy={{kicker:copy.wkkInside.replace('{n}',String(SHARED_GATES.length)),title:copy.wkkPickTitle,allCta:copy.wkkAllN.replace('{n}',String(SHARED_GATES.length)),seeAll:copy.wkkSeeAll.replace('{n}',String(SHARED_GATES.length)),show:copy.wkkShowGates,
    quick:copy.playQuick,deep:copy.playDeep,archive:copy.wkkArchiveShort,quickSub:copy.wkkQuickSub,deepSub:copy.wkkDeepSub,archiveSub:copy.wkkArchiveSub,soon:c.status==='paused'?copy.paused:games.comingSoon,gateWord:copy.wallGate,pick:copy.homeToday,mark}}/>}

  {/* ═════ the rest of the issue ═════ */}
  {core&&<div className="wkk-legends"><Suspense fallback={null}><LegendsBanner club={id} name={c.name} theme={theme}/></Suspense></div>}
  <section className="wkk-life" id="life-block" aria-labelledby="life-h"><div className="wk-panel shadow wkk-life-in" id="life" data-life-entry={life.state}>
   <span className="wkk-life-art wk-clubplate" aria-hidden="true"><Plate art="fatherson" ink="ink"/></span>
   <div className="wkk-life-text">
    <p className="wk-k red">{copy.lifeGame}</p>
    <p className="wk-shout wkk-life-shout" aria-hidden="true">{copy.wkkLifeShout}</p>
    <h2 id="life-h" className="wk-head">{copy.lifeTitle}</h2>
    <p className="wkk-life-note">{life.href?copy.lifeOpen:copy.lifeWorkshop}</p>
    {life.href&&<Link className="wk-btn red wkk-life-cta min-h-tap" href={life.href}>{copy.life}</Link>}
   </div>
  </div></section>
  {dyk==='moment'&&<div className="wkk-dykwrap"><TodayMoment clubId={id} clubName={c.name} moment={moment} locale={locale} dyk={copy.wkkDyk} cta={copy.wkkPlaceIt} copy={{kicker:copy.todayKicker,exact:copy.todayExact,near:copy.todayNear,open:copy.todayOpen,pick:copy.todayPick}}/></div>}
  {dyk==='flavour'&&<div className="wkk-dykwrap"><ClubFlavour item={flav2} kicker={copy.flavourKicker2} label={copy.wkkDyk} variant="dyk"/></div>}

  {fx&&lv?<div className="wkk-nextwrap"><FixtureCard clubId={id} clubName={c.name} fx={fx} lv={lv} locale={locale} copy={{kicker:copy.fixtureCard,vs:copy.vs,cta:copy.nextCta,kick:copy.wkkKickWord}}/></div>
  :world.ground&&<section className="wkk-nextwrap" aria-label={copy.fixtureCard}><MatchTicket labelledBy="md-h" kicker={`${copy.fixtureCard} · ${copy.wkkTbc}`} title={world.ground.name}
    meta={world.ground.local?<p className="wkk-ticket-local"><bdi lang={world.ground.script} dir="auto">{world.ground.local}</bdi></p>:undefined} stub={{small:copy.wkkKickWord,big:copy.wkkTbcShort}}>
    <p className="wk-cap white wkk-ticket-cap">{world.ground.line}</p>
   </MatchTicket></section>}
  {core&&<section className="wkk-cardwrap" id="card" aria-label={copy.cardKicker}><SupporterCard clubId={id} clubName={c.name} initials={c.initials} pattern={lv?.pattern} locale={locale} open={open} names={names} total={SHARED_GATES.length} next={false} copy={{kicker:copy.cardKicker,title:copy.cardTitle,gates:copy.cardGates,rounds:copy.cardRounds,been:copy.cardBeen,since:copy.cardSince,empty:copy.cardEmpty,next:copy.cardNext}}/></section>}

  <nav className="wkk-contents" aria-label={copy.homeJump}>
   <ul className="wkk-crow">
    {core&&<li id="terrace"><Link className="min-h-tap" href={clubHref(id,'terrace',locale)}><b className="wk-head">{world.terrace?.name??copy.homeTerraceTitle}</b><small className="wk-k muted">{copy.wkkTerraceRow}</small><Icon name="flag" size={18}/></Link></li>}
    {core&&<li id="club-market"><Link className="min-h-tap" href={`/market?club=${id}`}><b className="wk-head">{copy.marketName}</b><small className="wk-k muted">{copy.wkkMarketRow}</small><Icon name="shirt" size={18}/></Link></li>}
    {core&&away&&<li><Link className="min-h-tap" href={away}><b className="wk-head">{copy.awayName}</b><small className="wk-k muted">{copy.wkAwayDaysSub}</small><Icon name="plane" size={18}/></Link></li>}
    <li><Link className="min-h-tap" href={clubHref(id,'history',locale)}><b className="wk-head">{copy.historyTitle}</b><small className="wk-k muted">{copy.wkHistorySub}</small><Icon name="history" size={18}/></Link></li>
    <li><Link className="min-h-tap" href="/sources"><b className="wk-head">{copy.wkSources}</b><small className="wk-k muted">{copy.wkSourcesSub}</small><Icon name="sources" size={18}/></Link></li>
   </ul>
   <ClubFlavour item={flav} kicker={copy.flavourKicker} variant="hero"/>
   {dyk==='moment'&&flav2&&flav2.id!==flav?.id&&<ClubFlavour item={flav2} kicker={copy.historyFacts} variant="terrace"/>}
   {core&&open.length>0&&<div className="wkk-share"><ShareComposer draft={coverShare(c.id,states.filter(x=>x.allowed&&x.playable).map(x=>SHARED_GATES.find(g=>g.key===x.key)!.name))} label={copy.homeShare}/></div>}
  </nav>
 </main></ClubSurface>
}
