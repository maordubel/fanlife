import {REGISTRY} from '@/lib/master/registry'
import {teamCards} from '@/lib/fixtures/teamcards'

/**
 * Clubs → TheSportsDB check (owner, 12.10.2026). The provider's team card beside the club's own sourced file: ground, founding
 * year, capacity, website, and its badge and kit pictures. Pictures are the rights holders' marks, shown here to the owner "as
 * is" (TheSportsDB terms) and NOT on fan pages: the free key is for development use, and a club crest is the club's trademark.
 */
export async function ProviderCheck(){
 const rows=await teamCards().catch(()=>null)
 if(!rows)return <p className="desk-state" data-state="empty" role="status">TheSportsDB is not answering right now. Nothing is lost.</p>
 const name=(id:string)=>REGISTRY.find(c=>c.id===id)?.name??id
 const diffs=rows.flatMap(r=>r.checks.filter(c=>!c.agree).map(c=>({...c,club:r.clubId})))
 return <div className="desk-content">
  <p className="desk-fine">{rows.filter(r=>r.card).length} of {rows.length} clubs identified exactly (name + country). {diffs.length?`${diffs.length} difference${diffs.length===1?'':'s'} with the club files to check.`:'No difference with the club files.'} Pictures stay in the control room: TheSportsDB’s free key is for development use, and a crest is the club’s trademark.</p>
  <ul className="desk-rows">{rows.map(r=><li key={r.clubId}><span className="desk-stamp" data-ok={r.card&&r.checks.every(c=>c.agree)||undefined}>{!r.card?'Not found':r.checks.some(c=>!c.agree)?'Check':'Agrees'}</span>
   <div><b><bdi>{name(r.clubId)}</bdi></b>
    {r.card?<><p>{[r.card.stadium&&`${r.card.stadium}${r.card.capacity?` · ${r.card.capacity.toLocaleString('en-GB')}`:''}`,r.card.location,r.card.founded&&`founded ${r.card.founded}`,r.card.league].filter(Boolean).join(' · ')}</p>
     {r.checks.filter(c=>!c.agree).map(c=><p key={c.field} className="desk-fine">{c.field==='ground'?'Ground':'Founded'}: our file says <b>{c.ours}</b>, TheSportsDB says <b>{c.theirs}</b>.</p>)}
     <p className="desk-actions">{r.card.badge?<img src={`${r.card.badge}/tiny`} alt={`${name(r.clubId)} badge as TheSportsDB shows it`} width={50} height={50} loading="lazy" referrerPolicy="no-referrer"/>:null}{r.card.kit?<img src={`${r.card.kit}/tiny`} alt={`${name(r.clubId)} kit as TheSportsDB shows it`} width={50} height={50} loading="lazy" referrerPolicy="no-referrer"/>:null}
      <a className="desk-btn ghost" href={`https://www.thesportsdb.com/team/${r.card.teamId}`} target="_blank" rel="noreferrer">TheSportsDB ↗</a></p></>:<p className="desk-fine">{r.error}</p>}
   </div></li>)}</ul>
  <p className="desk-fine">Data and artwork: <a href="https://www.thesportsdb.com" target="_blank" rel="noreferrer">TheSportsDB</a> (fan-made, Creative Commons where it is their own; trademarks belong to the clubs).</p>
 </div>
}
