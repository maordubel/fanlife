import Link from 'next/link'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import type {CSSProperties} from 'react'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {KitPlate} from '@/components/clubs/games/KitPlate'
import {ShirtMark} from '@/components/clubs/ClubGateWall'
import {readState} from '@/lib/master/store'
import {loadClub,resolveClubId} from '@/lib/clubs/resolver'
import {evaluationMode} from '@/lib/master/mode'
import {REGISTRY} from '@/lib/master/registry'
import {clubTheme} from '@/lib/clubs/theme'
import {uiLocale} from '@/lib/clubs/locale'
import {clubHref} from '@/lib/clubs/club-href'
import {kitViews,type KitView} from '@/lib/clubs/gate-content'
import {variantOf} from '@/lib/clubs/kit-model'
import {kitArt} from '@/lib/clubs/kit-sources'
import {clubKitPhotoOf} from '@/lib/clubs/kitArchive'
import {hfkFor} from '@/lib/clubs/kit-hfk'
import {cfsFor,cfsPhoto} from '@/lib/clubs/kit-cfs'
import {cfsShirtSlug,fanShirts,shirtSlugFor} from '@/lib/fanlife/catalog'
import {shirtDateText} from '@/lib/fanlife/collector/cards'
import {KitOwnBar,KitOwnProvider,type OwnCopy} from '@/components/clubs/KitOwn'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
export const dynamic='force-dynamic'
export function generateMetadata({params}:{params:{slug:string}}){const c=REGISTRY.find(r=>r.id===params.slug);return {title:c?`${en.kitArchiveTitle} · ${c.name}`:en.kitArchiveTitle}}

const TYPES=['home','away','third','special'] as const
const SURFACE:Record<string,string>={home:'wk-clubplate',away:'wk-sky',third:'wk-navyplate',special:'wk-orangeplate'}
const year=(s:string)=>Number(/(\d{4})/.exec(s)?.[1]??0)
const anchor=(s:string)=>`season-${s.replace(/[^0-9a-z]+/gi,'-')}`
const short=(s:string)=>/^\d{4}\/\d{2}$/.test(s)?s.slice(2):s
/** How many seasons the album prints open; the older ones fold behind one row (never a sideways shelf). */
const OPEN_SEASONS=3

/**
 * The club's kit archive as a sticker album (rule 124): the cover, the kit types as a segmented choice, the album's
 * contents as a season grid (decade by decade, every season one tap away), then each season's shirts as sticker cards.
 * It is evidence, not a puzzle (the Worker's split: the archive shows what the club's shirts looked like, gate 4 asks you
 * to rebuild them), so it prints the maker and sponsor that gate 4 hides until a shirt is built.
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
 const slugOf=Object.fromEntries(await Promise.all(kits.map(async k=>[k.id,await shirtSlugFor(id,k)] as const)))
 const photoSlug=Object.fromEntries(await Promise.all((cfsFor(id)?.kits??[]).map(async k=>[k.image,await cfsShirtSlug(id,k.image)] as const)))
 const catalogue=await fanShirts(),catSrc:Record<string,string>={}
 for(const k of kits){const sl=slugOf[k.id];const sh=sl?catalogue.find(x=>x.slug===sl):null;if(sh?.src&&sh.src.startsWith('/kits/'))catSrc[k.id]=sh.src}
 const usedSrc=new Set(Object.values(catSrc))
 const workerExtras=id==='hapoel-tel-aviv'?catalogue.filter(x=>x.club===id&&x.src.startsWith('/kits/')&&!usedSrc.has(x.src)).sort((a,b)=>b.year-a.year||a.variant.localeCompare(b.variant)):[]
 const own:OwnCopy={have:copy.kitOwnHave,haveOn:copy.kitOwnHaveOn,want:copy.kitOwnWant,wantOn:copy.kitOwnWantOn,closet:copy.kitOwnCloset,market:copy.kitOwnMarket,saved:copy.kitOwnSaved,label:copy.kitOwnLabel}
 const ownSlugs=[...new Set([...Object.values(slugOf),...Object.values(photoSlug),...workerExtras.map(x=>x.slug)].filter((x):x is string=>!!x))]
 const hfk=hfkFor(id),cfs=cfsFor(id),shown=new Set(all.map(k=>`${k.season}|${variantOf(k.type)}`)),morePhotos=cfs?.kits.filter(k=>!shown.has(`${k.season}|${variantOf(k.type)}`))??[]
 const src=(ids:string[])=>ids.map(s=>core?.data.sources.find(x=>x.id===s)).filter((s):s is NonNullable<typeof s>=>!!s)
 const allSeasons=new Set(all.map(k=>k.season)).size
 const decades=[...seasons.reduce((m,s)=>{const d=Math.floor(year(s)/10)*10;m.set(d,[...(m.get(d)??[]),s]);return m},new Map<number,string[]>())]
 const typeHref=(t:string)=>`${clubHref(id,'kit-archive',locale)}${t==='all'?'':`${locale==='en'?'?':'&'}type=${t}`}`
 const longest=Math.max(6,...c.name.split(/\s+/).map(w=>w.length))
 const Card=({k}:{k:KitView})=>{
  const photo=clubKitPhotoOf(id,k)??catSrc[k.id]??cfsPhoto(id,k.season,k.type),a=kitArt(id,k.id,k.season,k.type),img=photo??a?.image,v=variantOf(k.type)
  return <li className="wk-sticker wkk-kit" data-testid="kit-archive-kit" data-type={v}>
   <span className={`wkk-kit-art ${SURFACE[v]}`}>
    {img?<img className="wkk-kit-img" data-archive-photo={photo?'':undefined} src={img} alt={`${k.season} ${label(k.type)}`} width={160} height={215} loading="lazy" decoding="async"/>:<KitPlate kit={k} label={false}/>}
    <span className="wk-tag red wkk-kit-type">{label(k.type)}</span>
   </span>
   <div className="wkk-kit-body">
    <p className="wk-head wkk-kit-maker">{k.maker??copy.kitArchiveNoMaker}{k.sponsor&&<> · {k.sponsor}</>}</p>
    {a&&<p className="wk-k wkk-kit-svg"><a href={a.svg} target="_blank" rel="noopener noreferrer">{copy.kitArchiveSvg} ↗</a></p>}
    <details className="wkk-kit-more"><summary>{copy.kitArchiveDetails}</summary><dl className="wkk-kit-dl">
     <dt>{copy.kitArchiveDesign}</dt><dd>{k.design??'—'}</dd><dt>{copy.kitArchiveColours}</dt><dd>{k.colours.join(' / ')||'—'}</dd>
     {k.shorts&&<><dt>{copy.kitArchiveShorts}</dt><dd>{[k.shorts.colour,k.shorts.trim].filter(Boolean).join(' / ')}</dd></>}{k.socks&&<><dt>{copy.kitArchiveSocks}</dt><dd>{[k.socks.colour,k.socks.trim].filter(Boolean).join(' / ')}</dd></>}
     <dt>{copy.kitArchiveSources}</dt><dd>{src(k.sources).map(x=><a key={x.id} href={x.url??undefined} target="_blank" rel="noopener noreferrer">{x.publisher}</a>).reduce<React.ReactNode[]>((acc,x,i)=>i?[...acc,' · ',x]:[x],[])}</dd></dl></details>
    {slugOf[k.id]&&<KitOwnBar slug={slugOf[k.id]!} copy={own}/>}
   </div>
  </li>}
 const Season=({s}:{s:string})=>{const row=kits.filter(k=>k.season===s);return <section key={s} id={anchor(s)} className="wkk-season-sec" data-testid="kit-archive-season" aria-labelledby={`${anchor(s)}-h`}>
  <h2 className="wkk-season-bar" id={`${anchor(s)}-h`}><small className="wk-k">{copy.wkkSeason}</small><bdi className="wk-num">{s}</bdi><small className="wk-k wkk-season-n">{copy.wkkKitsN.replace('{n}',String(row.length))}</small></h2>
  <ul className="wkk-kits-grid">{row.map(k=><Card key={k.id} k={k}/>)}</ul>
 </section>}
 return <ClubSurface theme={theme} clubId={id} locale={locale}><main id="main" className="wkk wkk-kits kit-archive">
  <KitOwnProvider slugs={ownSlugs}><div className="wkk-kits-layout">
   <aside className="wkk-kits-side">
    <section className="wk-panel shadow wkk-kits-cover wk-stripes" aria-labelledby="kits-h">
     <Link className="wkk-kits-back min-h-tap" href={clubHref(id,'history',locale)}>‹ {copy.historyTitle}</Link>
     <div className="wkk-kits-label"><p className="wk-k red">{copy.kitArchiveKicker}</p><h1 id="kits-h" className="wk-logo red" style={{['--len' as string]:longest} as CSSProperties}>{c.name}</h1></div>
     <ShirtMark className="wkk-kits-shirt"/>
     <span className="wk-burst wkk-kits-burst" aria-hidden="true"/>
     {all.length>0&&<span className="wk-roundel wkk-kits-count"><b className="wk-num" dir="ltr">{all.length}</b><small className="wk-k">{copy.wkkKitsSeasons.replace('{n}',String(allSeasons))}</small></span>}
    </section>
    <p className="wkk-kits-lede">{copy.kitArchiveLede.replace('{n}',String(all.length))}</p>
    {all.length>0&&<nav className="wk-seg wkk-kits-types" aria-label={copy.kitArchiveFilter}>
     {(['all',...present] as const).map(t=><Link key={t} className="min-h-tap" aria-current={t===type?'page':undefined} href={typeHref(t)}>{t==='all'?copy.kitArchiveAll:copy[`kitType_${t}` as keyof typeof copy] as string}<small dir="ltr">{t==='all'?all.length:all.filter(k=>variantOf(k.type)===t).length}</small></Link>)}
    </nav>}
    {seasons.length>1&&<details className="wk-fold wkk-kits-jump" open><summary>{copy.wkkJumpSeason}<small className="wk-k" dir="ltr">{seasons.length}</small></summary>
     <div className="wkk-jump">{decades.map(([d,ss])=><div key={d} className="wkk-jump-row"><b className="wk-head">{d}s</b><span>{ss.map(s=><a key={s} href={`#${anchor(s)}`} className="wkk-jump-s" aria-label={s}>{short(s)}</a>)}</span></div>)}</div>
    </details>}
   </aside>
   <div className="wkk-kits-main">
    {all.length===0?<p className="wk-cap white" data-testid="kit-archive-empty">{copy.kitArchiveEmpty}</p>:<>
     {seasons.slice(0,OPEN_SEASONS).map(s=><Season key={s} s={s}/>)}
     {seasons.length>OPEN_SEASONS&&<details className="wk-fold wkk-kits-older"><summary>{copy.wkkMoreSeasons.replace('{n}',String(seasons.length-OPEN_SEASONS))}</summary>
      <div className="wkk-kits-older-in">{seasons.slice(OPEN_SEASONS).map(s=><Season key={s} s={s}/>)}</div>
     </details>}
     {cfs&&morePhotos.length>0&&type==='all'&&<section className="wkk-kits-extra" data-testid="kit-cfs" aria-labelledby="cfs-h"><h2 id="cfs-h" className="wk-logo red sm wk-tilt">{copy.kitCfsTitle.replace('{n}',String(morePhotos.length))}</h2>
      <p className="wk-coupon wkk-kits-note">{copy.kitCfsCredit}</p>
      <ul className="wkk-kits-grid">{morePhotos.map(k=><li key={k.id} className="wk-sticker wkk-kit" data-type="photo"><span className="wkk-kit-art wk-sky"><img className="wkk-kit-img" data-archive-photo="" src={k.image} alt={`${k.season} ${k.type}`} width={k.width} height={k.height} loading="lazy" decoding="async"/></span><div className="wkk-kit-body"><p className="wk-head wkk-kit-maker"><bdi>{k.season}</bdi> · {copy[`kitHfkType_${k.type}` as keyof typeof copy]??k.type}{k.longSleeve?' · L/S':''}</p><p className="wk-k wkk-kit-svg"><a href={k.credit?.page??k.credit?.url??cfs.source.archivePage} target="_blank" rel="noopener noreferrer">{k.credit?.publisher??cfs.source.publisher}</a></p>{photoSlug[k.image]&&<KitOwnBar slug={photoSlug[k.image]!} copy={own}/>}</div></li>)}</ul></section>}
     {workerExtras.length>0&&type==='all'&&<section className="wkk-kits-extra" data-testid="kit-worker" aria-labelledby="wk-h"><h2 id="wk-h" className="wk-logo red sm wk-tilt">{copy.kitWorkerTitle.replace('{n}',String(workerExtras.length))}</h2>
      <p className="wk-coupon wkk-kits-note">{copy.kitWorkerCredit} <a href="/shirts?club=hapoel-tel-aviv">{copy.kitWorkerLink}</a></p>
      <ul className="wkk-kits-grid">{workerExtras.map(x=><li key={x.slug} className="wk-sticker wkk-kit" data-type="photo"><span className="wkk-kit-art wk-sky"><img className="wkk-kit-img" data-archive-photo="" src={x.src} alt={`${shirtDateText(x)} ${x.variantHe}`} width={150} height={150} loading="lazy" decoding="async"/></span><div className="wkk-kit-body"><p className="wk-head wkk-kit-maker"><bdi>{shirtDateText(x)}</bdi> · {x.variantHe}</p><KitOwnBar slug={x.slug} kitId={x.kitId} copy={own}/></div></li>)}</ul></section>}
     {hfk&&type==='all'&&<section className="wkk-kits-extra" data-testid="kit-hfk" aria-labelledby="hfk-h"><h2 id="hfk-h" className="wk-logo red sm wk-tilt">{copy.kitHfkTitle.replace('{n}',String(hfk.count))}</h2>
      <p className="wk-coupon wkk-kits-note">{copy.kitHfkCredit} <a href={hfk.source.homePage} target="_blank" rel="noopener noreferrer">{hfk.source.publisher}</a></p>
      <ul className="wkk-kits-grid">{hfk.kits.map(k=><li key={k.id} className="wk-sticker wkk-kit" data-type="drawing"><span className="wkk-kit-art wk-newsdots"><img className="wkk-kit-img" src={k.image} alt={`${k.period} ${k.type}`} width={150} height={263} loading="lazy" decoding="async"/></span><div className="wkk-kit-body"><p className="wk-head wkk-kit-maker"><bdi>{k.period}</bdi> · {copy[`kitHfkType_${k.type}` as keyof typeof copy] as string}</p>{k.maker&&<p className="wk-k">{k.maker}</p>}</div></li>)}</ul></section>}
    </>}
   </div>
  </div></KitOwnProvider>
 </main></ClubSurface>
}
