import Link from 'next/link'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {Dye} from '@/components/master/Dye'
import {readState} from '@/lib/master/store'
import {loadClub,resolveClubId} from '@/lib/clubs/resolver'
import {gateAccess} from '@/lib/clubs/access'
import {evaluationMode} from '@/lib/master/mode'
import {REGISTRY} from '@/lib/master/registry'
import {clubTheme} from '@/lib/clubs/theme'
import {uiLocale} from '@/lib/clubs/locale'
import {gateAvailability,sharedGate} from '@/lib/clubs/gates'
import {clubWorld,worldPublishers,type WorldLine} from '@/lib/clubs/world'
import {clubHref} from '@/lib/clubs/club-href'
import {kitViews} from '@/lib/clubs/gate-content'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
export const dynamic='force-dynamic'
export function generateMetadata({params}:{params:{slug:string}}){const c=REGISTRY.find(r=>r.id===params.slug);return {title:c?`${en.historyTitle} · ${c.name}`:en.historyTitle}}

/** History: the club's own story from the world file (every line sourced twice), then the doors into the archive and the timeline. */
export default async function History({params,searchParams}:{params:{slug:string};searchParams:{lang?:string}}) {
 const id=resolveClubId(headers().get('host'),params.slug,evaluationMode())
 if(!id)notFound()
 const [state,core]=await Promise.all([readState(),loadClub(id)])
 const c=state.clubs.find(x=>x.id===id)
 if(!c)notFound()
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en,theme=core?.data.theme||clubTheme(REGISTRY.find(r=>r.id===id)||c),w=clubWorld(id)
 const doors=(['archive','timeline'] as const).filter(k=>core&&gateAccess(c,sharedGate(k)!.number,evaluationMode()).allowed&&gateAvailability(core.data,k).playable)
 const door={archive:copy.historyArchive,timeline:copy.historyTimeline},kits=core?kitViews(core.data).length:0
 const cards:[string,WorldLine|undefined][]=w?[[copy.historyFounded,w.founded],[copy.historyGround,w.ground],[copy.historyEmblem,w.emblem],[copy.historyColours,w.colours]]:[]
 const credit=w?worldPublishers(w):[]
 return <ClubSurface theme={theme} clubId={id} locale={locale}><main id="main" className="mag-home club-history">
  <section className="mag-section"><div className="mag-head mag-homehead"><div><p className="mag-kicker">{copy.historyKicker}</p><h1 className="mag-h2">{c.name}</h1></div><Dye art="shirt" soft className="club-history-shirt"/></div>
   {w&&w.nicknames.length>0&&<div className="club-nick" data-testid="club-nicknames"><p className="mag-kicker">{copy.historyNicknames}</p><ul>{w.nicknames.map(n=><li key={n.text}><b>{n.text}</b>{n.local&&<bdi lang={n.script} dir="auto">{n.local}</bdi>}</li>)}</ul></div>}
   {!w?<div className="panel" data-testid="history-empty"><p>{copy.historyEmpty}</p></div>
   :<div className="club-facts">{cards.filter(([,l])=>l).map(([label,l])=>{const g=l as WorldLine&{name?:string;local?:string;script?:string};return <article key={label} className="mag-homecard"><div><p className="mag-kicker">{label}</p>{g.name&&<h2>{g.name}{g.local&&<> <bdi className="club-local" lang={g.script} dir="auto">{g.local}</bdi></>}</h2>}<p>{g.line}</p></div></article>})}
    {w.facts.length>0&&<article className="mag-homecard ink"><div><p className="mag-kicker">{copy.historyFacts}</p><ul className="club-factlist">{w.facts.map(f=><li key={f.id}>{f.line}{f.local&&<> <bdi lang={f.script} dir="auto">({f.local})</bdi></>}</li>)}</ul></div></article>}</div>}
   {(doors.length>0||kits>0)&&<div className="mag-feature-ctas">{doors.map((k,i)=><Link key={k} className={`mag-cta${i===0?' red':' ghost'}`} href={clubHref(id,k,locale)}>{door[k]} →</Link>)}{kits>0&&<Link className={`mag-cta${doors.length===0?' red':' ghost'}`} href={clubHref(id,'kit-archive',locale)} data-testid="history-kit-archive">{copy.historyKits} →</Link>}</div>}
   {credit.length>0&&<p className="mag-fine club-credit" data-testid="history-credit">{copy.historySources}: {credit.join(' · ')}</p>}
  </section>
 </main></ClubSurface>
}
