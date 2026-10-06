import Link from 'next/link'
import {REGISTRY} from '@/lib/master/registry'
import {SHARED_GATES} from '@/lib/clubs/gates'
import {GATE_METHOD,CLUB_SOURCES} from '@/lib/club-research/plan'
import type {ClubSummary} from '@/lib/master/summary'
import type {ReadinessState} from '@/lib/clubs/contract'

const MARK:Record<ReadinessState,string>={READY:'READY',PARTIAL:'PART',LOCKED:'LOCK',HIDDEN:'—'}
/**
 * The gap board, read from the shared club summary (audit A03): every club × every gate, with DATA readiness and
 * OPEN-NOW kept apart (A08), playable-but-partial gates kept in the backlog (A09), and compiler notes classified so
 * "kept out of one game" is not counted as an error. Desktop: the matrix. Phone: one card per club.
 */
export function ClubGaps({summaries}:{summaries:ClubSummary[]}){
 const withData=summaries.filter(s=>s.data),noPack=summaries.filter(s=>!s.data)
 const unregistered=REGISTRY.filter(r=>!summaries.some(s=>s.id===r.id))
 return <section className="section cr-gaps" id="gaps" aria-labelledby="gaps-h">
  <p className="eyebrow">CONTROL ROOM / WHAT IS MISSING</p>
  <h2 id="gaps-h">Club gaps</h2>
  <p className="spaced">Data readiness comes from the compiled packs. <b>Open now</b> also applies pause, publication and gate switches. READY opens a full round, PART a short one, LOCK needs eligible data.</p>
  <div className="cr-matrix" tabIndex={0} role="region" aria-label="Gate readiness by club">
   <table className="w-full text-start mag-gaps">
    <thead><tr><th scope="col">Club</th>{SHARED_GATES.map(g=><th scope="col" key={g.key} title={g.name}><span className="sr-only">{g.name}</span><span aria-hidden="true">{g.number}</span></th>)}<th scope="col">Data</th><th scope="col">Open now</th></tr></thead>
    <tbody>{withData.map(s=><tr key={s.id}><th scope="row"><Link href={`/master/admin?tab=club&club=${s.id}#controls`}>{s.name}</Link></th>{s.data!.gates.map(g=><td key={g.key} data-state={g.state} data-open={g.openNow||undefined} title={`${g.number}: ${g.eligible}${g.target?` / ${g.target}`:''}${g.openNow?' · open now':` · ${g.access}`}`}>{MARK[g.state]}{g.openNow?'':' ·'}</td>)}<td><b>{s.data!.dataPlayable}</b>/{SHARED_GATES.length}</td><td><b>{s.publication.openNow}</b>/{SHARED_GATES.length}</td></tr>)}
    {noPack.map(s=><tr key={s.id}><th scope="row"><Link href={`/master/admin?tab=club&club=${s.id}#controls`}>{s.name}</Link></th><td colSpan={SHARED_GATES.length} data-state="NONE">{s.engine.inRegistry?'No compiled pack yet':'Research file only — not in the registry'}</td><td><b>0</b></td><td><b>0</b></td></tr>)}
    {unregistered.map(r=><tr key={r.id}><th scope="row">{r.name}</th><td colSpan={SHARED_GATES.length} data-state="NONE">Registry entry without a control record</td><td>0</td><td>0</td></tr>)}
    </tbody>
   </table>
   <p className="muted">A dot after a state means the gate has data but is not open now (paused, unpublished or switched off).</p>
  </div>
  <div className="cr-cards">{summaries.map(s=><article className="cr-card" key={s.id} style={{['--club-primary' as string]:s.primary}}>
   <header><span className="cr-mono">{s.initials}</span><div><h3>{s.name}</h3><p className="muted">{s.control.status} · {s.engine.hasProvider?'engine connected':'no engine provider'}</p></div></header>
   {s.data?<><p className="cr-kpis"><span><b>{s.data.full}</b> READY</span><span><b>{s.data.dataPlayable}</b> playable</span><span><b>{s.publication.openNow}</b> open now</span></p>
    <ol className="cr-strip" aria-label="Gates">{s.data.gates.map(g=><li key={g.key} data-state={g.state} title={`${g.number} · ${g.state}`}>{g.number}</li>)}</ol></>:<p className="muted">No compiled pack yet.</p>}
   <Link className="button secondary" href={`/master/admin?tab=club&club=${s.id}#controls`}>Open club file ↗</Link>
  </article>)}</div>
  <div className="mag-gaplist">{withData.map(s=>{
   const todo=s.data!.gates.filter(g=>!g.full),src=CLUB_SOURCES[s.id],d=s.data!.diagnostics
   return <details key={s.id} className="panel spaced" open={todo.length>0&&todo.length<=7}>
    <summary><b>{s.name}</b> · {s.data!.timelineEvents} eligible events · {todo.length?`${todo.length} gates below full`:'all gates READY'} · notes: {d.blocker} blocking / {d.review} to review / {d.info} kept out by design</summary>
    {todo.length>0&&<ul>{todo.map(g=>{const m=GATE_METHOD[g.key];return <li key={g.key}><b>{g.number} {SHARED_GATES.find(x=>x.key===g.key)!.name}</b> <span data-state={g.state}>{MARK[g.state]}</span>{g.dataPlayable?' (playable — short round)':' (blocked)'} — {g.eligible}{g.target?` / ${g.target}`:''} eligible. {g.reason||''}<br/><small><b>How:</b> {m.what} Source pairs: {m.pairs.join(' · ')}. <i>{m.watch}</i></small></li>})}</ul>}
    {s.data!.topCodes.length>0&&<p className="muted">Compiler notes: {s.data!.topCodes.map(c=>`${c.code} ×${c.n} (${c.class})`).join(' · ')}</p>}
    {src&&<div className="muted"><p><b>Sources that worked:</b> {src.worked.join(' · ')}</p><p><b>Refused us:</b> {src.blocked.join(' · ')}</p><ul>{src.next.map(n=><li key={n}>{n}</li>)}</ul></div>}
    <p><Link href={`/master/core?club=${s.id}`}>Evidence and diagnostics ↗</Link> · <Link href={`/master/admin?tab=club&club=${s.id}#controls`}>Club file ↗</Link></p>
   </details>})}</div>
 </section>
}
