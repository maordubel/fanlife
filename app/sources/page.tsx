import Link from 'next/link'
import {Shell} from '@/components/master/Shell'
import {CORE_CLUB_IDS,loadClub} from '@/lib/clubs/resolver'
import en from '@/messages/clubs/en.json'
export const dynamic='force-dynamic'
export const metadata={title:'Sources & credits · FAN LIFE'}

/**
 * The magazine's sources page (page audit, 7.10.2026). Every playable club's facts carry a source;
 * this lists them club by club, grouped by publisher, exactly as the club pack records them.
 * Titles stay in the language the source was published in, marked with dir="auto".
 * `/credits` is the original Hapoel (Hebrew) credits page and stays with that product.
 */
export default async function Sources(){
 const copy=en
 const clubs=(await Promise.all(CORE_CLUB_IDS.map(id=>loadClub(id)))).filter(c=>!!c).map(c=>c!.data).sort((a,b)=>a.identity.name.localeCompare(b.identity.name))
 return <Shell locale="en"><main id="main"><section className="mag-section">
  <hr className="mag-rule"/>
  <div className="mag-head"><div><p className="mag-kicker">{copy.sourcesKicker}</p><h1 className="mag-h2">{copy.sourcesTitle}</h1></div><p className="mag-fine">{copy.sourcesNote}</p></div>
  <div style={{display:'grid',gap:16}}>{clubs.map(club=>{
   const byPublisher=new Map<string,typeof club.sources>()
   for(const s of club.sources)byPublisher.set(s.publisher,[...(byPublisher.get(s.publisher)||[]),s])
   const groups=[...byPublisher].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0]))
   return <details className="panel" key={club.identity.id}><summary><b>{club.identity.name}</b> · {club.sources.length} {copy.sourcesCount}</summary>
    <ul style={{listStyle:'none',padding:0}}>{groups.map(([publisher,rows])=><li key={publisher} className="spaced"><h3 dir="auto"><bdi>{publisher}</bdi> <small>· {rows.length}</small></h3>
     <ul>{rows.map(s=><li key={s.id} dir="auto">{s.url?<a href={s.url} target="_blank" rel="noopener noreferrer"><bdi>{s.title}</bdi> ↗</a>:<bdi>{s.title}</bdi>}</li>)}</ul></li>)}</ul>
   </details>})}</div>
  <div className="panel spaced"><h2>{copy.creditsTitle}</h2><p>{copy.creditsBody}</p><p className="spaced"><a className="mag-credit" href="https://DubelTeam.com" target="_blank" rel="noopener noreferrer">{copy.credit} ↗</a></p><p className="spaced"><Link href="/">{copy.backHome}</Link></p></div>
 </section></main></Shell>}
