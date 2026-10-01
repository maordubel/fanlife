import Link from 'next/link'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import {Shell,Mark} from '@/components/master/Shell'
import {readState} from '@/lib/master/store'
import {GATES,EXTRAS} from '@/lib/master/types'
import {loadClub,resolveClubId} from '@/lib/clubs/resolver'
import {playable} from '@/lib/master/seed'
import {evaluationMode} from '@/lib/master/mode'
import {REGISTRY} from '@/lib/master/registry'
import {clubTheme} from '@/lib/clubs/theme'
import {uiLocale,UI_LOCALES} from '@/lib/clubs/locale'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
export const dynamic='force-dynamic'
export default async function Page({params,searchParams}:{params:{slug:string};searchParams:{lang?:string}}) {
 const id=resolveClubId(headers().get('host'),params.slug,evaluationMode())
 if(!id)notFound()
 const [state,core]=await Promise.all([readState(),loadClub(id)])
 const c=state.clubs.find(c=>c.id===id)
 if(!c)notFound()
 const open=playable(c),locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en,theme=core?.data.theme||clubTheme(REGISTRY.find(r=>r.id===c.id)||c)
 const timelineOpen=core&&core.data.readiness.playable&&c.status!=='paused'&&(c.status==='live'?c.gates.includes(13):evaluationMode())
 return <Shell club={c} theme={theme} locale={locale}><main id="main">
  <section className="club-hero"><Mark club={c} theme={theme}/><div><p className="eyebrow">{c.city} / {c.country} / {c.status}</p><h1>{c.name}</h1><p className="spaced">{copy.world}</p><nav className="flex flex-wrap gap-4"><Link className="min-h-tap py-3" href="?lang=en" hrefLang="en">{copy.english}</Link><Link className="min-h-tap py-3" href="?lang=he" hrefLang="he">{copy.hebrew}</Link></nav></div></section>
  <section className="section">
   {searchParams.lang&&!UI_LOCALES.includes(searchParams.lang as 'en'|'he')&&<p className="panel">{copy.fallback}</p>}
   {core&&<div className="panel"><p className="eyebrow">TIMELINE / {core.data.readiness.state}</p><h2>{copy.history}</h2><p>{copy.content}: <bdi>{core.data.locales.content}</bdi></p><p className="spaced"><bdi>{core.data.timeline.length}</bdi> {copy.events}. {core.data.readiness.state==='PARTIAL'?copy.short:core.data.readiness.playable?copy.ready:''}</p>{timelineOpen?<Link href={`/clubs/${c.id}/timeline?lang=${locale}`} className="button">{copy.play}</Link>:<p>{c.status==='paused'?copy.paused:copy.closed}</p>} <Link className="min-h-tap inline-block px-3 py-3" href={`/master/core?club=${c.id}`}>{copy.evidence}</Link></div>}
   {open?<><div className="section-head spaced"><h2>{copy.open}</h2><Link href="/life" className="button">{copy.life}</Link></div><div className="gates">{GATES.filter(([n])=>c.gates.includes(n)).map(([n,name,url,desc])=><Link className="gate" href={url} key={n}><span>{n}</span><div><h3>{name}</h3><p>{desc}</p></div><b>↗</b></Link>)}</div><h2 className="spaced">{copy.beyond}</h2><div className="gates">{EXTRAS.map(([name,url,desc])=><Link className="gate" href={url} key={url}><div><h3>{name}</h3><p>{desc}</p></div><b>↗</b></Link>)}</div></>:<div className="panel spaced"><p className="eyebrow">{copy.workshop}</p><h2>{copy.workshopTitle}</h2><p className="spaced">{copy.workshopNote}</p><Link href="/master/admin" className="button">{copy.admin}</Link></div>}
   <details className="panel spaced"><summary>{copy.theme}</summary><p>{theme.colorPolicy.status==='pending'?copy.pending:theme.colorPolicy.status==='legacy'?copy.legacy:copy.approved}</p><p>{copy.primary}: <bdi>{theme.primary}</bdi> · {theme.pattern}</p></details>
   <details className="panel spaced"><summary>{copy.readiness}</summary><ul>{c.gaps.map(g=><li key={g}>{g}</li>)}</ul><p>{c.sources.length} {copy.sources} / {c.findings.filter(f=>f.approved).length} {copy.findings}</p></details>
  </section>
 </main></Shell>
}
