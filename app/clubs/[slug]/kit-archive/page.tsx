import Link from 'next/link'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {KitPlate} from '@/components/clubs/games/KitPlate'
import {readState} from '@/lib/master/store'
import {loadClub,resolveClubId} from '@/lib/clubs/resolver'
import {evaluationMode} from '@/lib/master/mode'
import {REGISTRY} from '@/lib/master/registry'
import {clubTheme} from '@/lib/clubs/theme'
import {uiLocale} from '@/lib/clubs/locale'
import {clubHref} from '@/lib/clubs/club-href'
import {kitViews} from '@/lib/clubs/gate-content'
import {variantOf} from '@/lib/clubs/kit-model'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
export const dynamic='force-dynamic'
export function generateMetadata({params}:{params:{slug:string}}){const c=REGISTRY.find(r=>r.id===params.slug);return {title:c?`${en.kitArchiveTitle} · ${c.name}`:en.kitArchiveTitle}}

const TYPES=['home','away','third','special'] as const
const year=(s:string)=>Number(/(\d{4})/.exec(s)?.[1]??0)

/**
 * The club's kit archive, for plain viewing: every approved kit, one row per season, the whole kit drawn where the
 * archive documents shorts and socks. It is evidence, not a puzzle (the Worker's split: the archive shows what the club's shirts
 * looked like, gate 4 asks you to rebuild them), so it prints the maker and sponsor that gate 4 hides until a shirt is built.
 */
export default async function KitArchive({params,searchParams}:{params:{slug:string};searchParams:{lang?:string;type?:string}}) {
 const id=resolveClubId(headers().get('host'),params.slug,evaluationMode())
 if(!id)notFound()
 const [state,core]=await Promise.all([readState(),loadClub(id)])
 const c=state.clubs.find(x=>x.id===id)
 if(!c)notFound()
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en,theme=core?.data.theme||clubTheme(REGISTRY.find(r=>r.id===id)||c)
 const all=core?kitViews(core.data):[],type=(TYPES as readonly string[]).includes(searchParams.type??'')?searchParams.type!:'all'
 const kits=all.filter(k=>type==='all'||variantOf(k.type)===type).sort((a,b)=>year(b.season)-year(a.season)||TYPES.indexOf(variantOf(a.type))-TYPES.indexOf(variantOf(b.type))||a.id.localeCompare(b.id))
 const seasons=[...new Set(kits.map(k=>k.season))]
 const label=(t:string)=>copy[`kitType_${variantOf(t)}` as keyof typeof copy] as string
 const present=TYPES.filter(t=>all.some(k=>variantOf(k.type)===t))
 const src=(ids:string[])=>ids.map(s=>core?.data.sources.find(x=>x.id===s)).filter((s):s is NonNullable<typeof s>=>!!s)
 return <ClubSurface theme={theme} clubId={id} locale={locale}><main id="main" className="mag-home kit-archive">
  <section className="mag-section"><div className="mag-head mag-homehead"><div><p className="mag-kicker">{copy.kitArchiveKicker}</p><h1 className="mag-h2">{c.name}</h1><p className="mag-fine">{copy.kitArchiveLede.replace('{n}',String(all.length))}</p></div></div>
   {all.length===0?<div className="panel" data-testid="kit-archive-empty"><p>{copy.kitArchiveEmpty}</p></div>:<>
   <nav className="kit-archive-filter" aria-label={copy.kitArchiveFilter}>
    {(['all',...present] as const).map(t=><Link key={t} className={`mag-cta${t===type?' red':' ghost'}`} aria-current={t===type?'true':undefined} href={`${clubHref(id,'kit-archive',locale)}${t==='all'?'':`${locale==='en'?'?':'&'}type=${t}`}`}>{t==='all'?copy.kitArchiveAll:copy[`kitType_${t}` as keyof typeof copy] as string}</Link>)}
   </nav>
   {seasons.map(s=><div key={s} className="kit-archive-season" data-testid="kit-archive-season"><h2 className="kit-archive-year"><bdi>{s}</bdi></h2>
    <ul className="kit-archive-row">{kits.filter(k=>k.season===s).map(k=><li key={k.id} className="kit-archive-card" data-testid="kit-archive-kit">
     <KitPlate kit={k} label={false}/>
     <p className="kit-archive-type">{label(k.type)}</p>
     <p className="kit-archive-facts"><span>{k.maker??copy.kitArchiveNoMaker}</span>{k.sponsor&&<span> · {k.sponsor}</span>}</p>
     <details><summary>{copy.kitArchiveDetails}</summary><dl className="kit-archive-dl">
      <dt>{copy.kitArchiveDesign}</dt><dd>{k.design??'—'}</dd><dt>{copy.kitArchiveColours}</dt><dd>{k.colours.join(' / ')||'—'}</dd>
      {k.shorts&&<><dt>{copy.kitArchiveShorts}</dt><dd>{[k.shorts.colour,k.shorts.trim].filter(Boolean).join(' / ')}</dd></>}{k.socks&&<><dt>{copy.kitArchiveSocks}</dt><dd>{[k.socks.colour,k.socks.trim].filter(Boolean).join(' / ')}</dd></>}
      <dt>{copy.kitArchiveSources}</dt><dd>{src(k.sources).map(x=><a key={x.id} href={x.url??undefined} target="_blank" rel="noopener noreferrer">{x.publisher}</a>).reduce<React.ReactNode[]>((a,x,i)=>i?[...a,' · ',x]:[x],[])}</dd></dl></details>
    </li>)}</ul></div>)}
   </>}
  </section>
 </main></ClubSurface>
}
