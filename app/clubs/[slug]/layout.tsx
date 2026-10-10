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
import { Badge } from '@/components/clubs/Badge'

/** Each club installs as its own app (manifest + icon), with its own colour in the browser bar. */
export function generateMetadata({params}:{params:{slug:string}}):Metadata{
 const app=clubApp(params.slug)
 if(!app)return {}
 return {manifest:manifestHref(app.id),icons:{icon:[{url:iconHref(app.id,192),sizes:'192x192',type:'image/png'},{url:iconHref(app.id,512),sizes:'512x512',type:'image/png'}],apple:iconHref(app.id,180)},appleWebApp:{capable:true,title:app.reg.name,statusBarStyle:'black-translucent'}}
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
 const life=await lifeEntry(id,{evaluation:preview,paused:c.status==='paused',locale}),world=worldFor(reg)
 const tenant=clubFromHost(host)
 const exitHref=tenant?`https://${PORTAL_HOST_ROOT}`:'/'
 const clubs:SwitchClub[]=state.clubs.filter(x=>x.status!=='paused').sort((a,b)=>a.name.localeCompare(b.name)).map(x=>{const l=livery(x.id);return {id:x.id,name:x.name,city:x.city,initials:x.initials,pattern:l?.pattern??'solid',style:wearLivery(l)}})
 const labels={home:copy.clubTabHome,play:copy.clubTabPlay,life:copy.clubTabLife,history:copy.clubTabHistory,terrace:locale==='en'?world.terraceTab:copy.clubTabTerrace}
 return <div className="club-app" data-club={id} data-pattern={theme.pattern} data-rival-no={rivalBans(theme).join(' ')||undefined} dir={localeDirection(locale)} lang={locale} style={themeStyle(theme,locale) as CSSProperties}>
  <header className="club-masthead">
   <div className="club-masthead-in">
    <Link className="club-who" href={clubHref(id,'',locale)} aria-label={`${c.name} — ${copy.clubTabHome}`}>
     <Badge club={{id:c.id,pattern:lv?.pattern,initials:c.initials,name:c.name}}/>
     <span style={{minWidth:0}}><span className="club-who-kicker">{world.voice.kicker}</span><span className="club-who-name">{c.name}</span></span>
    </Link>
    <ClubSwitcher current={id} clubs={clubs} locale={locale} copy={{switch:copy.clubSwitch,title:copy.clubSwitchTitle,note:copy.clubSwitchNote,here:copy.clubSwitchHere,close:copy.clubSwitchClose,market:copy.clubSwitchMarket,me:copy.clubSwitchMe,hub:copy.clubSwitchHub}}/>
    <a className="club-exit" href={exitHref} aria-label={copy.clubExitLabel}><img src="/brand/fanlife/logo-mono.webp" alt="" width={34} height={34}/></a>
   </div>
   <span className="club-band mag-band" data-livery={lv?.pattern} aria-hidden="true"/>
  </header>
  <div className="club-body">{children}</div>
  <footer className="club-foot"><div className="club-foot-in">
   <span>FAN LIFE · {c.name}</span>
   <span><Link href="/sources">{copy.credits}</Link> · <Link href="/master/admin">{copy.administration}</Link></span>
   <a href="https://DubelTeam.com" target="_blank" rel="noopener noreferrer" aria-label={copy.creditAria}>{copy.credit} ↗</a>
  </div></footer>
  <RememberClub clubId={id}/>
  <ClubTabBar clubId={id} locale={locale} labels={labels} navLabel={copy.clubNav} lifeLive={life.state==='universal'} pattern={lv?.pattern??'solid'}/>
 </div>
}
