import Link from 'next/link'
import {ALL_FOOTBALL} from '@/lib/experiences/registry'
import {deskHref} from '@/lib/master/attention'
import type {Features} from '@/lib/features'
import {gateReport,CAPS,MIN_CLUBS,type PoolGate} from '@/lib/experiences/pool'
import {runLab} from '@/lib/experiences/lab'

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
export async function ExperienceDesk({features,lab}:{features:Features;lab:PoolGate|null}){
 const reports=await Promise.all(ALL_FOOTBALL.gates.map(g=>gateReport(g)))
 const result=lab?await runLab(lab,100):null
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
 </div>
}
