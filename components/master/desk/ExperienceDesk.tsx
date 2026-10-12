import Link from 'next/link'
import {ALL_FOOTBALL} from '@/lib/experiences/registry'
import {deskHref} from '@/lib/master/attention'
import type {Features} from '@/lib/features'
import {gateReport,CAPS,MIN_CLUBS,type PoolGate} from '@/lib/experiences/pool'
import {runLab} from '@/lib/experiences/lab'
import {allCatalogs,legendsClubs} from '@/lib/legends/server'
import {draftLab,matchLab,seasonLab} from '@/lib/legends/lab'
import {legendsOverview} from '@/lib/legends/admin'
import {LegendsControls} from './LegendsControls'

const NAME:Record<PoolGate,string>={trivia:'Gate 2 · Trivia',timeline:'Gate 13 · Timeline',memory:'Gate 6 · Memory'}
/** the card on the Games desk: ALL FOOTBALL is an experience, not a row in the club registry (ADR-0009) */
export function ExperienceCard({features}:{features:Features}){
 const on=features.allFootball
 return <div className="crm-exps"><p className="desk-kicker">Experiences</p><section className="crm-exp" aria-labelledby="exp-af-h">
  <span className="desk-stamp" data-ok={on||undefined}>{on?'Open to fans':'Owner preview'}</span>
  <div><h2 id="exp-af-h">{ALL_FOOTBALL.name}</h2><p>{ALL_FOOTBALL.tagline}</p>
   <p className="desk-fine">Gates on: {features.allFootballGates.length?features.allFootballGates.join(' · '):'none'}.</p></div>
  <p className="desk-actions"><Link className="desk-btn" href={deskHref('games',{view:'all-football'})}>Workspace →</Link><a className="desk-btn ghost" href={ALL_FOOTBALL.path} target="_blank" rel="noreferrer">Play it ↗</a></p>
 </section></div>
}

/**
 * The ALL FOOTBALL workspace (CRM 2 §6.5): what the derived pool holds per gate, which clubs feed it and which are left
 * out (with the reason), and the Round Lab. Nothing here edits a club record — a club's data is fixed at its club file.
 */
export async function ExperienceDesk({features,lab}:{features:Features;lab:PoolGate|'league'|null}){
 const reports=await Promise.all(ALL_FOOTBALL.gates.map(g=>gateReport(g)))
 const result=lab&&lab!=='league'?await runLab(lab,100):null
 return <div className="desk-content">
  <header className="desk-head"><p className="desk-kicker">Games · Experience</p><h1 className="desk-h1">{ALL_FOOTBALL.name}</h1>
   <p className="desk-fine">{features.allFootball?'Open to every visitor.':'Off for fans — you can already play it in owner preview.'} Switch it in <Link href={deskHref('settings')}>Settings → Features</Link>. A club joins a gate here when that gate is open to fans at the club and its compiled data can play it; at least {MIN_CLUBS} clubs per gate.</p>
   <p className="desk-actions"><a className="desk-btn" href={ALL_FOOTBALL.path} target="_blank" rel="noreferrer">Open ALL FOOTBALL ↗</a><Link className="desk-btn ghost" href={deskHref('games')}>All games</Link></p></header>
  {reports.map(r=><section key={r.gate} className="desk-sub" aria-labelledby={`af-${r.gate}`}>
   <h2 id={`af-${r.gate}`}>{NAME[r.gate]} <span className="desk-stamp" data-ok={r.playable||undefined}>{r.playable?(features.allFootballGates.includes(r.gate)?'Playable · on':'Playable · switched off'):'Not playable'}</span></h2>
   {r.reason?<p className="desk-state desk-state-slim" data-state="empty">{r.reason}</p>:null}
   <p className="desk-fine">{r.records.toLocaleString('en-GB')} records in the balanced pool (at most {CAPS[r.gate]} per club) · pool version <code>{r.version??'—'}</code></p>
   <ul className="desk-rows">{r.members.map(m=><li key={m.id}><span className="desk-stamp" data-ok>In</span><div><b><bdi>{m.name}</bdi></b><p>{(r.perClub[m.id]??0).toLocaleString('en-GB')} records · club pack {m.version}</p></div></li>)}
    {r.excluded.map(x=><li key={x.id}><span className="desk-stamp">Out</span><div><b><bdi>{x.name}</bdi></b><p>{x.reason}</p></div></li>)}</ul>
   <p className="desk-actions"><Link className="desk-btn ghost" href={deskHref('games',{view:'all-football',lab:r.gate})}>Run 100 rounds in the lab</Link></p>
   {result&&result.gate===r.gate?<div className="desk-state" data-state={result.failures.length?'error':'ok'} role="status">
    <b>Round Lab · {result.rounds} seeds:</b> {result.dealt} dealt, {result.blocked} blocked, {result.failures.length?`${result.failures.length} problem${result.failures.length===1?'':'s'}`:'every invariant holds'}.
    <p className="desk-fine">Share of what was dealt: {Object.entries(result.share).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`${c} ${n}`).join(' · ')||'—'}</p>
    {result.failures.length?<ul>{result.failures.map(f=><li key={f}><code>{f}</code></li>)}</ul>:null}
   </div>:null}
  </section>)}
  <LegendsDesk features={features} run={lab==='league'}/>
 </div>
}

/**
 * LEGENDS MANAGER operations (rulebook §1.1.3, §8): each club's readiness — a full legal draft through the real solver, never
 * "seventeen names" — the owner's controls, and the Legends Lab on demand (drafts, matches, seasons).
 */
async function LegendsDesk({features,run}:{features:Features;run:boolean}){
 const [clubs,overview]=await Promise.all([legendsClubs(),legendsOverview()])
 const cats=run?(await allCatalogs()).map(x=>x.catalog).filter(c=>!features.fanLeagueOff.includes(c.club)):[]
 const drafts=run?cats.map(c=>draftLab(c,60)):[],matches=run?matchLab(cats,3000):null,seasons=run?seasonLab(cats,8,3):null
 const open=clubs.filter(c=>c.verdict==='READY'&&!c.held)
 return <section className="desk-sub" aria-labelledby="lgm-ops-h">
  <h2 id="lgm-ops-h">Legends Manager <span className="desk-stamp" data-ok={features.fanLeague||undefined}>{features.fanLeague?'Open to fans':'Owner preview'}</span></h2>
  <p className="desk-fine">{open.length} clubs can open a career (a league needs 4–8). A club is ready when bots of four temperaments can finish the €52M draft of seventeen with the quotas and the price tiers, every time. Hold a club out in <Link href={deskHref('settings')}>Settings → Features</Link>; running careers keep it.</p>
  <p className="desk-actions"><a className="desk-btn" href="/all-football/legends" target="_blank" rel="noreferrer">Open Legends Manager ↗</a><Link className="desk-btn ghost" href={deskHref('games',{view:'all-football',lab:'league'})}>Run the Legends Lab</Link></p>
  <ul className="desk-rows">{clubs.map(c=><li key={c.club}><span className="desk-stamp" data-ok={c.verdict==='READY'&&!c.held||undefined}>{c.held?'Held':c.verdict==='READY'?'Ready':'Not ready'}</span><div><b><bdi>{c.name}</bdi></b>
   <p>{c.men.toLocaleString('en-GB')} priced legends · GK {c.byPos.GK} · DF {c.byPos.DF} · MF {c.byPos.MF} · FW {c.byPos.FW} · {c.drafts} test drafts, {c.deadEnds} dead ends</p>
   <p className="desk-fine">Left out: {c.excluded.noPrice} not on the price list · {c.excluded.noPosition} with no recorded position · {c.excluded.notApproved} not approved.</p>
   {c.reasons.length?<p className="desk-fine">{c.reasons.join(' ')}</p>:null}</div></li>)}</ul>
  {run&&matches&&seasons?<div className="desk-state" data-state={drafts.some(d=>d.deadEnds)||seasons.failures.length?'error':'ok'} role="status">
   <b>Legends Lab</b>
   <p>Drafts: {drafts.map(d=>`${d.club} ${d.runs-d.deadEnds}/${d.runs} (avg €${d.avgSpent}M)`).join(' · ')}</p>
   <p>Matches ({matches.matches.toLocaleString('en-GB')}): {matches.goalsPerMatch} goals · draws {matches.draws}% · home {matches.homeWins}% · away {matches.awayWins}% · yellows {matches.yellowsPerMatch} · reds {matches.redsPerMatch} · injuries {matches.injuryRate}% a team-match ({matches.severity.minor}/{matches.severity.moderate}/{matches.severity.severe}) · the side with ≥3 more stars wins {matches.strongerWins}% of decided games.</p>
   <p>Seasons ({seasons.careers} careers × 3): average place {seasons.avgPlace} · titles {seasons.myTitles} · cash at season end {seasons.cashBySeason.map(x=>`€${x}M`).join(' → ')} · board grants {seasons.grants.map(x=>`€${x}M`).join(' → ')}.</p>
   <p className="desk-fine">Healthy: 2.3–3.0 goals, draws 20–30%, a home edge, injuries near 5% split ≈70/25/5, no dead-end draft, and cash that grows slowly.</p>
   {seasons.failures.length?<ul>{seasons.failures.map(f=><li key={f}><code>{f}</code></li>)}</ul>:null}
  </div>:null}
  <LegendsControls settings={overview.settings} clubs={overview.clubs}/>
 </section>
}
