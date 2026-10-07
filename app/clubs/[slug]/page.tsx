import Link from 'next/link'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {Dye} from '@/components/master/Dye'
import {Seal,TornBlocks,Cutout} from '@/components/master/Poster'
import {readState} from '@/lib/master/store'
import {loadClub,resolveClubId} from '@/lib/clubs/resolver'
import {gateAccess} from '@/lib/clubs/access'
import {evaluationMode} from '@/lib/master/mode'
import {REGISTRY} from '@/lib/master/registry'
import {clubTheme} from '@/lib/clubs/theme'
import {uiLocale,UI_LOCALES,ENABLED_LOCALES} from '@/lib/clubs/locale'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
import {SHARED_GATES,gateAvailability} from '@/lib/clubs/gates'
import {gameCopy} from '@/lib/clubs/game-copy'
import {lifeEntry} from '@/lib/clubs/life/entry'
import {ClubActivity} from '@/components/clubs/games/ClubActivity'
import {getFixtureFeed} from '@/lib/fixtures/service'
import {livery} from '@/lib/club-livery'
export const dynamic='force-dynamic'
export default async function Page({params,searchParams}:{params:{slug:string};searchParams:{lang?:string}}) {
 const id=resolveClubId(headers().get('host'),params.slug,evaluationMode())
 if(!id)notFound()
 const [state,core]=await Promise.all([readState(),loadClub(id)])
 const c=state.clubs.find(c=>c.id===id)
 if(!c)notFound()
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en,theme=core?.data.theme||clubTheme(REGISTRY.find(r=>r.id===c.id)||c)
 const feed=await getFixtureFeed(new Date()).catch(()=>null),fx=feed?.fixtures.find(f=>f.clubId===id),lv=livery(id)
 const games=gameCopy(locale),life=await lifeEntry(id,{evaluation:evaluationMode(),paused:c.status==='paused',locale})
 const gamesOpen=core?SHARED_GATES.map(g=>({g,allowed:gateAccess(c,g.number,evaluationMode()).allowed,ready:gateAvailability(core.data,g.key)})):[]
 const fill=(t:string)=>t.replaceAll('{club}',c.name).replaceAll('{city}',c.city)
 const playable=gamesOpen.filter(x=>x.allowed&&x.ready.playable).length
 // The club's own page is its end of the ground: its colours, its shirt, its terrace (owner, 7.10.2026).
 return <Shell club={c} theme={theme} locale={locale}><main id="main" className="mag-home">
  <section className="mag-homehero" aria-labelledby="club-h">
   <span className="mag-pitchlines" aria-hidden="true"/>
   <div className="mag-homehero-in">
    <Seal name={c.name} city={c.city} initials={c.initials} pattern={lv?.pattern}/>
    <p className="mag-homewelcome">{copy.homeWelcome}</p>
    <h1 id="club-h" style={{['--len' as string]:Math.max(6,...c.name.split(/\s+/).map(w=>w.length))}}>{c.name}</h1>
    <p className="mag-homeplace">{c.city} <i aria-hidden="true">|</i> {c.country}</p>
    <p className="mag-homelead">{fill(copy.homeLead)}</p>
    <nav className="mag-homejump" aria-label={copy.homeJump}>{core&&<a href="#games">{games.gamesTitle}{playable?<b>{playable}</b>:null}</a>}<a href="#life">LIFE</a>{core&&<a href="#terrace">{copy.homeTerrace}</a>}</nav>
    {ENABLED_LOCALES.length>1&&<nav className="flex flex-wrap gap-4"><Link className="min-h-tap py-3" href="?lang=en" hrefLang="en">{copy.english}</Link><Link className="min-h-tap py-3" href="?lang=he" hrefLang="he">{copy.hebrew}</Link></nav>}
   </div>
   <div className="mag-homestage" aria-hidden="true"><TornBlocks seed={c.id} pattern={lv?.pattern}/><Cutout art="kicker" className="mag-homekick"/></div>
  </section>
  {fx&&lv&&<section className="mag-section mag-homefixture" id="next"><Dye art="boot-ball-ticket" className="mag-homeprop"/><div><div className="mag-head"><div><p className="mag-kicker">{copy.fixtureCard}</p></div></div><article className="mag-fixture" style={{['--club-primary' as string]:lv.primary}}><span className="mag-band" data-livery={lv.pattern} aria-hidden="true"/><div className="mag-fixture-body"><h3><span>{c.name}</span> {copy.vs} {fx.opponent}</h3><p className="mag-fixture-meta"><time dateTime={fx.kickoff}>{fx.kickoff.slice(0,10)}</time>{fx.competition?` · ${fx.competition}`:''}</p><Link className="mag-cta red" href={`/clubs/${id}/meetings?vs=${encodeURIComponent(fx.opponent)}&lang=${locale}`}>{copy.nextCta}<span aria-hidden="true">→</span></Link></div></article></div></section>}
  {searchParams.lang&&!UI_LOCALES.includes(searchParams.lang as 'en'|'he')&&<section className="mag-section"><p className="panel">{copy.fallback}</p></section>}
  <section className="mag-section" id="games">
   <hr className="mag-rule"/>
   <div className="mag-head mag-homehead"><div><p className="mag-kicker">{copy.homeProgramme}</p><h2 className="mag-h2">{core?games.gamesTitle:copy.workshopTitle}</h2></div><Dye art="net-keeper" className="mag-homenet"/></div>
   {core?<div className="mag-contents mag-contents-grid" data-testid="shared-gates">{gamesOpen.map(({g,allowed,ready})=>allowed&&ready.playable
     ?<Link key={g.key} data-gate={g.key} className={`mag-row mag-gate mag-gate-${g.key}`} href={`/clubs/${c.id}/${g.key}?lang=${locale}`}><em>{String(g.number).padStart(2,'0')}</em><span>{games[`gate.${g.key}`]}<small>{games[`blurb.${g.key}`]}</small></span><span className="lead" aria-hidden="true"/><s>{games.play} →</s></Link>
     :<div key={g.key} data-gate={g.key} className="mag-row mag-gate mag-gate-off" aria-disabled="true"><em>{String(g.number).padStart(2,'0')}</em><span>{games[`gate.${g.key}`]}<small>{c.status==='paused'?copy.paused:games.comingSoon}</small></span></div>)}</div>
   :<div className="panel"><p className="eyebrow">{copy.workshop}</p><p>{copy.workshopNote}</p></div>}
  </section>
  <section className="mag-section mag-homepair">
   <article className="mag-homecard ink" id="life" data-life-entry={life.state}><Dye art="face" className="mag-homeface"/><div><p className="mag-kicker">LIFE</p><h2>{copy.lifeTitle}</h2>{life.href?<><p>{copy.lifeOpen}</p><Link className="mag-cta red" href={life.href}>{copy.life}</Link></>:<p>{copy.lifeWorkshop}</p>}</div></article>
   <article className="mag-homecard"><div className="mag-homeshirts"><Dye art="shirt" soft/><Dye art="shirt" soft ink={theme.secondary}/></div><div><p className="mag-kicker">{copy.homeColours}</p><h2>{fill(copy.homeColoursTitle)}</h2><p>{copy.homeColoursNote}</p>{core&&<Link className="mag-cta red" href={`/clubs/${c.id}/kits?lang=${locale}`}>{games['gate.kits']} →</Link>}</div></article>
  </section>
  {core&&<section className="mag-section" id="terrace"><hr className="mag-rule"/><div className="mag-hometerrace"><Dye art="terrace-scarf" className="mag-homescarf"/><div className="mag-head"><div><p className="mag-kicker">{copy.homeTerrace}</p><h2 className="mag-h2">{copy.homeTerraceTitle}</h2></div></div></div><ClubActivity club={c.id} locale={locale}/></section>}
 </main></Shell>
}
