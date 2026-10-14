import Link from 'next/link'
import {Shell} from '@/components/master/Shell'
import {CORE_CLUB_IDS,loadClub} from '@/lib/clubs/resolver'
import {OpenOnHash} from '@/components/home/OpenOnHash'
import en from '@/messages/clubs/en.json'
export const dynamic='force-dynamic'
export const metadata={title:'Sources & credits'}

const host=(url:string|null)=>{if(!url)return null;try{return new URL(url).hostname.replace(/^www\./,'')}catch{return null}}
const two=(n:number)=>String(n).padStart(2,'0')
/** A publisher's first few titles are printed; the rest fold away (a club can carry thousands — no endless page). */
const SHELF_FIRST=6
type Row={id:string;title:string;url:string|null}

/**
 * The magazine's sources page (page audit, 7.10.2026) — THE WEEKLY's back pages (rule 124, boards Credits-M / Credits-D).
 * Every playable club's facts carry a source; this lists them club by club, grouped by publisher, exactly as the club pack
 * records them. The clubs are drawers in a cabinet ("the shelves"); each drawer opens its shelf below. The counts at the top
 * are counted from the same data. Titles stay in the language the source was published in, marked with dir="auto".
 * `/credits` is the original Hapoel (Hebrew) credits page and stays with that product.
 */
export default async function Sources(){
 const copy=en
 const clubs=(await Promise.all(CORE_CLUB_IDS.map(id=>loadClub(id)))).filter(c=>!!c).map(c=>c!.data).sort((a,b)=>a.identity.name.localeCompare(b.identity.name))
 const shelves=clubs.map(club=>{
  const byPublisher=new Map<string,typeof club.sources>()
  for(const s of club.sources)byPublisher.set(s.publisher,[...(byPublisher.get(s.publisher)||[]),s])
  const groups=[...byPublisher].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0]))
  return {club,groups}
 })
 const total=clubs.reduce((n,c)=>n+c.sources.length,0)
 const row=(s:Row)=><li key={s.id} dir="auto">{s.url
  ?<a href={s.url} target="_blank" rel="noopener noreferrer"><span className="t"><bdi>{s.title}</bdi></span><span className="wk-k wk-muted">{host(s.url)} ↗</span></a>
  :<span className="wkh-src-plain"><span className="t"><bdi>{s.title}</bdi></span><span className="wk-k wk-muted">{copy.wkhNoLink}</span></span>}</li>
 const publishers=new Set(clubs.flatMap(c=>c.sources.map(s=>s.publisher))).size
 return <Shell locale="en"><main id="main" className="wkh-src">
  <OpenOnHash prefix="src-"/>
  <div className="wkh-src-side">
   <header className="wkh-src-head">
    <p className="wk-banner">{copy.wkhBackPages}</p>
    <h1 className="wk-logo cyan wkh-src-title"><span>{copy.sourcesKicker}</span></h1>
    <svg className="wkh-lens wkh-src-lens" viewBox="-12 -12 234 234" aria-hidden="true"><path className="h" d="M132 132 L192 192"/><path className="g" d="M140 140 L188 188"/><circle className="r" cx="86" cy="86" r="62"/><path className="s" d="M52 66 A40 40 0 0 1 82 42"/></svg>
    <p className="wk-head wkh-src-lead">{copy.wkhSrcLead}</p>
   </header>
   <dl className="wkh-src-stats">
    <div><dt className="wk-k">{copy.sourcesCount}</dt><dd className="wk-lamp">{total}</dd></div>
    <div><dt className="wk-k">{copy.wkhPublishers}</dt><dd className="wk-lamp">{publishers}</dd></div>
    <div><dt className="wk-k">{copy.wkhClubsN}</dt><dd className="wk-lamp">{clubs.length}</dd></div>
   </dl>
   <p className="wkh-src-note wkh-src-note-m">{copy.sourcesNote}</p>
   <nav className="wkh-shelves" id="shelves" aria-labelledby="shelves-h">
    <div className="wkh-shelves-head"><h2 className="wk-logo red wkh-shelves-title" id="shelves-h">{copy.wkhShelves}</h2><span className="wk-k">{copy.wkhPull}</span></div>
    <ul className="wkh-cabinet">{shelves.map(({club},i)=><li key={club.identity.id}><a className="wkh-drawer" href={`#src-${club.identity.id}`}>
     <span className="wkh-drawer-lbl"><b className="wk-num">{two(i+1)}</b><span>{club.identity.name}</span></span>
     <span className="wk-k">{copy.wkhDrawerN.replace('{n}',String(club.sources.length))}</span>
     <span className="wkh-drawer-handle" aria-hidden="true"/>
    </a></li>)}</ul>
   </nav>
  </div>
  <div className="wkh-src-main">
   <p className="wkh-src-note wkh-src-note-d">{copy.sourcesNote}</p>
   <div className="wkh-src-folds">{shelves.map(({club,groups},i)=><details className="wkh-src-fold" id={`src-${club.identity.id}`} key={club.identity.id}>
    <summary><span className="wk-roundel wkh-src-no"><b className="wk-num">{two(i+1)}</b></span><span className="wkh-src-sum"><b className="wk-head">{club.identity.name}</b><small className="wk-k">{club.sources.length} {copy.sourcesCount} · {groups.length} {copy.wkhPublishers}</small></span></summary>
    <ul className="wkh-pubs">{groups.map(([publisher,rows])=><li key={publisher}>
     <h3 className="wkh-pub" dir="auto"><bdi>{publisher}</bdi> <small className="wk-k">· {rows.length}</small></h3>
     <ul className="wkh-src-rows">{rows.slice(0,SHELF_FIRST).map(row)}</ul>
     {rows.length>SHELF_FIRST&&<details className="wkh-src-more"><summary className="min-h-tap">{copy.wkhShowAllSrc.replace('{n}',String(rows.length))}</summary><ul className="wkh-src-rows">{rows.slice(SHELF_FIRST).map(row)}</ul></details>}
    </li>)}</ul>
   </details>)}</div>
   <section className="wkh-src-credits" aria-labelledby="credits-h">
    <h2 className="wk-head" id="credits-h">{copy.creditsTitle}</h2>
    <p>{copy.creditsBody}</p>
    <p><a className="wkh-src-credit" href="https://DubelTeam.com" target="_blank" rel="noopener noreferrer">{copy.credit} ↗</a></p>
    <p className="wkh-src-links"><a className="wk-link" href="#shelves">↑ {copy.wkhBackShelves}</a><Link className="wk-link" href="/">{copy.backHome}</Link></p>
   </section>
  </div>
 </main></Shell>}
