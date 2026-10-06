import Link from 'next/link'
import {REGISTRY} from '@/lib/master/registry'
import {CORE_CLUB_IDS,REVIEW_CLUB_IDS,loadClub} from '@/lib/clubs/resolver'
import {SHARED_GATES,gateAvailability} from '@/lib/clubs/gates'
import type {ReadinessState} from '@/lib/clubs/contract'

const MARK:Record<ReadinessState,string>={READY:'READY',PARTIAL:'PART',LOCKED:'LOCK',HIDDEN:'—'}
/** One board: every club × every gate, and under it what each club still lacks. Read-only; computed from compiled data. */
export async function ClubGaps(){
 const ids=[...CORE_CLUB_IDS,...REVIEW_CLUB_IDS]
 const loaded=await Promise.all(ids.map(async id=>({id,club:await loadClub(id)})))
 const withPack=new Set(ids)
 const rows=loaded.flatMap(({id,club})=>club?[{id,data:club.data,diagnostics:club.diagnostics}]:[])
 const waiting=REGISTRY.filter(c=>!withPack.has(c.id))
 return <section className="section" id="gaps" aria-labelledby="gaps-h">
  <p className="eyebrow">CONTROL ROOM / WHAT IS MISSING</p>
  <h2 id="gaps-h">Club gaps</h2>
  <p className="spaced">Every club against every gate. READY opens the game, PART opens a short round, LOCK needs more eligible data.</p>
  <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Gate readiness by club">
   <table className="w-full text-start mag-gaps">
    <thead><tr><th scope="col">Club</th>{SHARED_GATES.map(g=><th scope="col" key={g.key} title={g.name}><span className="sr-only">{g.name}</span><span aria-hidden="true">{g.number}</span></th>)}<th scope="col">Open</th></tr></thead>
    <tbody>{rows.map(({id,data})=>{const states=SHARED_GATES.map(g=>gateAvailability(data,g.key));const open=states.filter(s=>s.playable).length
     return <tr key={id}><th scope="row"><Link href={`/clubs/${id}`}>{data.identity.name}</Link></th>{states.map((s,i)=><td key={SHARED_GATES[i]!.key} data-state={s.state} title={`${SHARED_GATES[i]!.name}: ${s.eligible}${s.target?` / ${s.target}`:''}`}>{MARK[s.state]}</td>)}<td><b>{open}</b> / {SHARED_GATES.length}</td></tr>})}
    {waiting.map(c=><tr key={c.id}><th scope="row">{c.name}</th><td colSpan={SHARED_GATES.length} data-state="NONE">No data pack yet — workshop</td><td><b>0</b> / {SHARED_GATES.length}</td></tr>)}
    </tbody>
   </table>
  </div>
  <div className="mag-gaplist">{rows.map(({id,data,diagnostics})=>{
   const locked=SHARED_GATES.map(g=>({g,r:gateAvailability(data,g.key)})).filter(x=>!x.r.playable)
   return <details key={id} className="panel spaced" open={locked.length>0&&locked.length<=7}>
    <summary><b>{data.identity.name}</b> · {data.timeline.length} eligible events · {locked.length?`${locked.length} gates need work`:'all gates open'}{diagnostics.length?` · ${diagnostics.length} compiler notes`:''}</summary>
    {locked.length>0&&<ul>{locked.map(({g,r})=><li key={g.key}><b>{g.number} {g.name}</b> — {r.eligible}{r.target?` / ${r.target}`:''} eligible. {r.reasons[0]||g.requirement}</li>)}</ul>}
    {diagnostics.length>0&&<p className="muted">Top compiler notes: {[...new Set(diagnostics.map(d=>d.code))].slice(0,6).join(', ')}.</p>}
    <p><Link href={`/master/core?club=${id}`}>Evidence and diagnostics ↗</Link></p>
   </details>})}</div>
 </section>
}
