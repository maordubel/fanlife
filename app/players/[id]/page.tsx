import Link from 'next/link'
import {notFound,permanentRedirect} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {PreviewRibbon} from '@/components/experiences/AfFrame'
import {door} from '@/lib/features-server'
import {crestFor} from '@/lib/clubs/crest'
import {livery,wearLivery} from '@/lib/club-livery'
import {isPersonId} from '@/lib/people/model'
import {personIdFromNumber,playerNumber} from '@/lib/people/number'
import {profileFor,posWord} from '@/lib/people/profile'
import '../players.css'
export const dynamic='force-dynamic'

type Props={params:{id:string}}
export async function generateMetadata({params}:Props){
 const id=isPersonId(params.id)?params.id:personIdFromNumber(params.id)
 if(!id)return {title:'Player'}
 const d=await door('profiles')
 const p=d.open?await profileFor(id,d.preview).catch(()=>null):null
 return p?{title:`${p.name} — player profile`,description:`${p.name}: ${p.stints.map(s=>`${s.clubName} ${s.years}`).join(' · ')}.`,robots:d.preview?{index:false}:undefined}:{title:'Player'}
}

/** Stars as the Legends Manager draws them: whole and quarter stars, never a number */
function Stars({n}:{n:number}){
 const whole=Math.floor(n),part=n-whole
 return <span className="plp-stars" role="img" aria-label={`${n} of 5 stars`}>{Array.from({length:5},(_,i)=><span key={i} className="plp-star" data-fill={i<whole?'full':i===whole&&part>0?String(Math.round(part*4)):'none'} aria-hidden="true">★</span>)}</span>
}

/**
 * A player's profile (People Registry, 18.11.2026): ONE person, every one of our clubs he played for — Walid Badir is one man
 * with two clubs, not two men. The photograph slot stays sealed: it opens when the fan holds the man's sticker in THE ALBUM.
 * Off for fans until the owner switches "Player profiles" on; the owner previews.
 */
export default async function Page({params}:Props){
 const id=isPersonId(params.id)?params.id:personIdFromNumber(params.id)
 if(!id)notFound()
 const d=await door('profiles');if(!d.open)notFound()
 const p=await profileFor(id,d.preview);if(!p)notFound()
 if(p.canonicalId!==params.id)permanentRedirect(`/players/${p.canonicalId}`)
 const positions=[...new Set(p.stints.flatMap(s=>s.positions))]
 const apps=p.stints.reduce((n,s)=>n+(s.apps??0),0),goals=p.stints.reduce((n,s)=>n+(s.goals??0),0),counted=p.stints.some(s=>s.apps!==null)
 return <Shell locale="en">
  <PreviewRibbon on={d.preview}/>
  <main id="main" className="plp">
   <header className="plp-mast">
    <p className="plp-kicker">Player profile · {p.clubs===1?'one club':`${p.clubs} clubs`}</p>
    <div className="plp-head">
     <figure className="plp-photo" aria-label="Photograph sealed until you hold his sticker">
      <span className="plp-sil" aria-hidden="true"><svg viewBox="0 0 84 96"><ellipse cx="42" cy="34" rx="20" ry="25"/><path d="M4 96C8 70 24 62 42 62s34 8 38 34Z"/></svg></span>
      <figcaption>Collect his sticker in <b>THE ALBUM</b> to reveal the photo</figcaption>
     </figure>
     <div className="plp-title">
      <h1 dir="auto">{p.name}</h1>
      {p.aliases.length>0&&<p className="plp-aka" dir="auto">Also written {p.aliases.join(' · ')}</p>}
      <dl className="plp-facts">
       <div><dt>Player ID</dt><dd className="tabular-nums">{playerNumber(p.canonicalId)}</dd></div>
       <div><dt>Positions</dt><dd>{positions.length?positions.map(posWord).join(' · '):'Not recorded'}</dd></div>
       {counted&&<div><dt>Games · goals</dt><dd className="tabular-nums">{apps} · {goals}</dd></div>}
       {p.stars!==null&&<div><dt>Legends rating</dt><dd><Stars n={p.stars}/></dd></div>}
      </dl>
     </div>
    </div>
   </header>
   <section className="plp-clubs" aria-labelledby="plp-clubs-h">
    <h2 id="plp-clubs-h" className="plp-sub">His clubs</h2>
    <ol className="plp-list">{p.stints.map(s=>{const l=livery(s.club),crest=crestFor(s.club);return <li key={s.club+s.years} className="plp-stint" style={wearLivery(l)}>
     <span className="plp-crest" aria-hidden="true">{crest?/* eslint-disable-next-line @next/next/no-img-element -- a crest ships exactly as recorded in the crest register */<img src={crest} alt="" loading="lazy" decoding="async"/>:<span className="plp-initials">{l?.initials??s.clubName.slice(0,2)}</span>}</span>
     <div className="plp-stint-body">
      <h3><bdi>{s.clubName}</bdi>{!s.open&&<span className="plp-closed"> · not open to fans yet</span>}</h3>
      <p className="plp-years tabular-nums">{s.years}{s.positions.length?` · ${s.positions.map(posWord).join(' / ')}`:''}</p>
      {(s.apps!==null||s.goals!==null)&&<p className="plp-line tabular-nums">{s.apps??'—'} games · {s.goals??'—'} goals</p>}
      {s.stars!==null&&<p className="plp-line">Legends <Stars n={s.stars}/></p>}
      {s.seasonAppearances.length>0&&<details className="plp-line">
       <summary>Serie A appearances by season</summary>
       <table className="tabular-nums"><thead><tr><th scope="col">Season</th><th scope="col">Apps</th><th scope="col">Goals</th></tr></thead>
        <tbody>{s.seasonAppearances.map(row=><tr key={row.season}><th scope="row">{row.season}</th><td>{row.appearances}</td><td>{row.goals}</td></tr>)}</tbody>
       </table>
      </details>}
     </div>
     {s.archiveHref&&<Link className="plp-door min-h-tap" href={s.archiveHref}>In the {s.clubName} archive</Link>}
    </li>})}</ol>
    {d.preview&&p.hidden>0&&<p className="plp-note">{p.hidden} record{p.hidden===1?'':'s'} at clubs that are not open are hidden from fans.</p>}
   </section>
   <p className="plp-note">Games and goals are the figures a named source states for each club. A man who played for two of our clubs is one person here; the archive of each club keeps his story there.</p>
  </main>
 </Shell>
}
