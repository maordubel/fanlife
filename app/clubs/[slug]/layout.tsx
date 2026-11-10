import Link from 'next/link'
import type {Metadata,Viewport} from 'next'
import {headers} from 'next/headers'
import type {CSSProperties,ReactNode} from 'react'
import '../../club-app.css'
import {RememberClub} from '@/components/clubs/RememberClub'
import {ClubTabBar} from '@/components/clubs/ClubTabBar'
import {ClubSwitcher,type SwitchClub} from '@/components/clubs/ClubSwitcher'
import {readState} from '@/lib/master/store'
import {loadClub,resolveClubId} from '@/lib/clubs/resolver'
import {evaluationMode} from '@/lib/master/mode'
import {PORTAL_HOST_ROOT,REGISTRY,clubFromHost} from '@/lib/master/registry'
import {clubTheme,rivalBans,themeStyle} from '@/lib/clubs/theme'
import {localeDirection,uiLocale} from '@/lib/clubs/locale'
import {lifeEntry} from '@/lib/clubs/life/entry'
import {worldFor} from '@/lib/clubs/world'
import {livery,wearLivery} from '@/lib/club-livery'
import {clubHref} from '@/lib/clubs/club-href'
import {clubApp,iconHref,manifestHref} from '@/lib/clubs/pwa'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
import {Contents} from '@/components/weekly/Contents'
import {clubSections,menuApps,menuClubs,menuCopy,menuCorner,menuFanLife} from '@/lib/weekly/menu'
import {featuresOf} from '@/lib/features'
import {isOwner} from '@/lib/features-server'
import {contentsGates} from '@/lib/weekly/contents'
import {SHARED_GATES,gateAvailability} from '@/lib/clubs/gates'
import {gateAccess} from '@/lib/clubs/access'
import {belovedOf} from '@/lib/clubs/beloved'
import {gameCopy} from '@/lib/clubs/game-copy'
import {hasClubAway} from '@/lib/away-days/club'
import {bannedHere} from '@/lib/clubs/theme'
import {indexableStatus} from '@/lib/seo/club'
import {portalOrigin} from '@/lib/master/registry'

/**
 * Each club installs as its own app (manifest + icon), with its own colour in the browser bar. The robots line is set
 * HERE, for every page inside the club (review F03): only a published club is indexable — a sub page no longer depends
 * on remembering to pass the status itself. A page may still ask for less (LIFE, the daily terrace), never for more.
 */
export async function generateMetadata({params}:{params:{slug:string}}):Promise<Metadata>{
 const app=clubApp(params.slug)
 if(!app)return {}
 const status=await readState().then(s=>s.clubs.find(x=>x.id===app.id)?.status).catch(()=>undefined)
 return {robots:indexableStatus(status)?{index:true,follow:true}:{index:false,follow:true},manifest:manifestHref(app.id),icons:{icon:[{url:iconHref(app.id,192),sizes:'192x192',type:'image/png'},{url:iconHref(app.id,512),sizes:'512x512',type:'image/png'}],apple:iconHref(app.id,180)},appleWebApp:{capable:true,title:app.reg.name,statusBarStyle:'black-translucent'}}
}
export function generateViewport({params}:{params:{slug:string}}):Viewport{
 const app=clubApp(params.slug)
 return {viewportFit:'cover',width:'device-width',initialScale:1,themeColor:app?.primary}
}

/**
 * Every /clubs/<id>/… page lives inside the club's own app: its masthead, its own five-door bar, a slim footer.
 * The pages keep wrapping themselves in ClubSurface (theme + effects); an immersive page (LIFE, a game in play
 * mode) marks itself `data-chrome="immersive"` and the CSS takes this chrome away.
 */
export default async function ClubLayout({children,params}:{children:ReactNode;params:{slug:string}}) {
 const host=headers().get('host'),preview=evaluationMode()
 const id=resolveClubId(host,params.slug,preview)
 if(!id)return <>{children}</>
 const [state,core]=await Promise.all([readState(),loadClub(id)])
 const c=state.clubs.find(x=>x.id===id)
 if(!c)return <>{children}</>
 const locale=uiLocale(headers().get('x-fan-life-locale')||undefined),copy=locale==='he'?he:en
 const reg=REGISTRY.find(r=>r.id===id)||c,theme=core?.data.theme||clubTheme(reg),lv=livery(id)
 const life=await lifeEntry(id,{evaluation:preview,paused:c.status==='paused',status:c.status,locale}),world=worldFor(reg)
 const tenant=clubFromHost(host),portal=tenant?portalOrigin(host):''
 const exitHref=tenant?portal||`https://${PORTAL_HOST_ROOT}`:'/'
 // review F02: a paused club is closed on EVERY page inside it (history, terrace, kit archive… not only its gates).
 // The owner and the evaluation build still see it, so pausing is something you can check from the outside.
 const resting=c.status==='paused'&&!preview&&!isOwner()
 const clubs:SwitchClub[]=state.clubs.filter(x=>x.status!=='paused').sort((a,b)=>a.name.localeCompare(b.name)).map(x=>{const l=livery(x.id);return {id:x.id,name:x.name,city:x.city,initials:x.initials,pattern:l?.pattern??'solid',style:wearLivery(l),rival:!!(l&&x.id!==id&&bannedHere(theme,l.primary))}})
 const states=core?SHARED_GATES.map(g=>({key:g.key,allowed:gateAccess(c,g.number,preview).allowed,playable:gateAvailability(core.data,g.key).playable})):[]
 const openKeys=states.filter(s=>s.allowed&&s.playable).map(s=>s.key)
 const t=menuCopy(locale),gates=contentsGates({clubId:id,locale,states,beloved:belovedOf(world.terrace,openKeys),copy:gameCopy(locale) as Record<string,string>})
 const away=id==='hapoel-tel-aviv'?'/away-days':hasClubAway(id)?clubHref(id,'away-days',locale):null
 const labels={home:copy.clubTabHome,play:copy.clubTabPlay,life:copy.tabOurGames,history:copy.clubTabHistory,terrace:locale==='en'?world.terraceTab:copy.clubTabTerrace}
 return <div className="club-app" data-club={id} data-pattern={theme.pattern} data-rival-no={rivalBans(theme).join(' ')||undefined} dir={localeDirection(locale)} lang={locale} style={themeStyle(theme,locale) as CSSProperties}>
  <header className="club-masthead">
   <div className="club-masthead-in">
    <ClubSwitcher current={id} clubs={clubs} locale={locale} portal={portal} copy={{switch:copy.clubSwitch,title:copy.clubSwitchTitle,note:copy.clubSwitchNote,here:copy.clubSwitchHere,close:copy.clubSwitchClose,market:copy.clubSwitchMarket,me:copy.clubSwitchMe,hub:copy.clubSwitchHub}}/>
    <Link className="club-who" href={clubHref(id,'',locale)} aria-label={`${c.name} — ${copy.clubTabHome}`}><span className="club-who-kicker">{world.voice.kicker}</span></Link>
    <Contents rivalNo={rivalBans(theme).join(' ')||undefined} paint={themeStyle(theme,locale) as Record<string,string>}
     copy={{menu:t.wkMenu,title:t.wkContents,kicker:t.wkKickerClub.replace('{club}',c.name),close:t.wkClose,gates:t.wkGates,quick:t.wkQuick,deep:t.wkDeep,archive:t.wkArchive,corner:t.wkCorner,clubs:t.wkClubs,fanlife:t.wkFanLife,section:t.wkTheClub,apps:t.pinApps}} pins={featuresOf(state).pins||isOwner()} locale={locale} apps={menuApps(locale,id)}
     sections={clubSections(id,locale,{terrace:labels.terrace,away,kitArchive:!!core})} gates={gates} corner={menuCorner(locale)} clubs={menuClubs(state.clubs,id,locale,theme,portal)} fanlife={menuFanLife(locale,portal)}/>
    <a className="club-exit" href={exitHref} aria-label={copy.clubExitLabel}><img src="/brand/fanlife/logo-mono.webp" alt="" width={34} height={34}/></a>
   </div>
   <span className="club-band mag-band" data-livery={lv?.pattern} aria-hidden="true"/>
  </header>
  <div className="club-body">{resting?<main id="main" className="wkk club-resting" data-testid="club-resting"><section className="wk-panel wk-lift club-resting-in">
   <p className="wk-tag ink">{c.name}</p><h1 className="wk-logo">{copy.clubRestingTitle}</h1><p>{copy.clubRestingNote}</p>
   <a className="wk-btn" href={`${portal}/#clubs`}>{copy.clubSwitchHub}</a>
  </section></main>:children}</div>
  <footer className="club-foot"><div className="club-foot-in">
   <span>FAN LIFE · {c.name}</span>
   <span><Link href="/sources">{copy.credits}</Link> · <Link href="/about">About</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/contact">Contact</Link> · <a href="https://www.dubelteam.com/games.html">More games ↗</a> · <Link href="/master/admin">{copy.administration}</Link></span>
   <a href="https://DubelTeam.com" target="_blank" rel="noopener noreferrer" aria-label={copy.creditAria}>{copy.credit} ↗</a>
  </div></footer>
  <RememberClub clubId={id}/>
  <ClubTabBar clubId={id} locale={locale} labels={labels} navLabel={copy.clubNav} lifeLive={life.state==='universal'} pattern={lv?.pattern??'solid'}/>
 </div>
}
