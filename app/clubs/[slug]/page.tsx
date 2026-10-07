import Link from 'next/link'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import {Shell,Mark} from '@/components/master/Shell'
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
 return <Shell club={c} theme={theme} locale={locale}><main id="main">
  <section className="club-hero" data-sig-layout={lv?.layout}><Mark club={c} theme={theme}/><div><p className="eyebrow">{c.city} / {c.country}</p><h1>{c.name}</h1><p className="spaced">{copy.world}</p>{ENABLED_LOCALES.length>1&&<nav className="flex flex-wrap gap-4"><Link className="min-h-tap py-3" href="?lang=en" hrefLang="en">{copy.english}</Link><Link className="min-h-tap py-3" href="?lang=he" hrefLang="he">{copy.hebrew}</Link></nav>}</div>{lv&&<div className="mag-sig" aria-hidden="true" style={{['--club-primary' as string]:lv.primary}}><span className="mag-band" data-livery={lv.pattern}><b>{lv.initials}</b></span><i>{c.city}</i></div>}</section>
  {/* Only a confirmed fixture earns the space; "no fixture" is not news (audit 7.10.2026). */}
  {fx&&lv&&<section className="mag-section" id="next"><div className="mag-head"><div><p className="mag-kicker">{copy.fixtureCard}</p></div></div><article className="mag-fixture" style={{['--club-primary' as string]:lv.primary}}><span className="mag-band" data-livery={lv.pattern} aria-hidden="true"/><div className="mag-fixture-body"><h3><span>{c.name}</span> {copy.vs} {fx.opponent}</h3><p className="mag-fixture-meta"><time dateTime={fx.kickoff}>{fx.kickoff.slice(0,10)}</time>{fx.competition?` · ${fx.competition}`:''}</p><Link className="mag-cta red" href={`/clubs/${id}/meetings?vs=${encodeURIComponent(fx.opponent)}&lang=${locale}`}>{copy.nextCta}<span aria-hidden="true">→</span></Link></div></article></section>}
  <section className="section">
   {searchParams.lang&&!UI_LOCALES.includes(searchParams.lang as 'en'|'he')&&<p className="panel">{copy.fallback}</p>}
   {core?<>
    <div className="mag-head spaced"><div><p className="mag-kicker">{copy.gates}</p><h2 className="mag-h2">{games.gamesTitle}</h2></div></div>
    {/* Fan-facing: name, one line, play. Readiness counts and requirements live in the control room. */}
    <div className="mag-contents mag-contents-grid" data-testid="shared-gates">{gamesOpen.map(({g,allowed,ready})=>allowed&&ready.playable
     ?<Link key={g.key} data-gate={g.key} className={`mag-row mag-gate mag-gate-${g.key}`} href={`/clubs/${c.id}/${g.key}?lang=${locale}`}><em>{String(g.number).padStart(2,'0')}</em><span>{games[`gate.${g.key}`]}<small>{games[`blurb.${g.key}`]}</small></span><span className="lead" aria-hidden="true"/><s>{games.play} →</s></Link>
     :<div key={g.key} data-gate={g.key} className="mag-row mag-gate mag-gate-off" aria-disabled="true"><em>{String(g.number).padStart(2,'0')}</em><span>{games[`gate.${g.key}`]}<small>{c.status==='paused'?copy.paused:games.comingSoon}</small></span></div>)}</div>
   </>:<div className="panel spaced"><p className="eyebrow">{copy.workshop}</p><h2>{copy.workshopTitle}</h2><p className="spaced">{copy.workshopNote}</p></div>}
   <div className="panel spaced" data-life-entry={life.state}><p className="eyebrow">LIFE</p><h2>{copy.lifeTitle}</h2>{life.href?<><p className="spaced">{copy.lifeOpen}</p><Link className="button" href={life.href}>{copy.life}</Link></>:<p className="spaced">{copy.lifeWorkshop}</p>}</div>
   {core&&<ClubActivity club={c.id} locale={locale}/>}
  </section>
 </main></Shell>
}
