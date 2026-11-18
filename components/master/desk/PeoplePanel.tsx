'use client'
import {useEffect,useState} from 'react'
/**
 * Players → Across clubs (People Registry, 18.11.2026). Two records at two clubs that share a written name and have no verdict.
 * Wikidata already settled every pair it could prove; what is left waits for one click. Nothing is merged by a name.
 */
type S={key:string;club:string;eid:string;id:string;name:string;aliases:string[];pos:string[];from:number|null;to:number|null;apps:number|null;goals:number|null;stars:number|null}
type Item={key:string;name:string;a:S;b:S}
type Decided={a:string;b:string;verdict:'same'|'different';on:string;by:string}
type Data={clubs:Record<string,string>;counts:{stints:number;people:number;multiClub:number;linked:{same:number;different:number};queued:number};items:Item[];decided:Decided[]}
async function post(body:unknown){try{const r=await fetch('/api/master/players/people',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});return {ok:r.ok,data:await r.json().catch(()=>({})) as {error?:string}}}catch{return {ok:false,data:{error:'No connection. Nothing was saved.'}}}}
const years=(s:S)=>s.from&&s.to?(s.from===s.to?`${s.from}`:`${s.from}–${s.to}`):s.from?`from ${s.from}`:s.to?`until ${s.to}`:'years unknown'
let NAMES:Record<string,string>={}
const clubName=(id:string)=>NAMES[id]??id

export function PeoplePanel({club}:{club:string|null}){
 const [d,setD]=useState<Data|null>(null),[err,setErr]=useState<string|null>(null),[done,setDone]=useState<string|null>(null),[busy,setBusy]=useState(false),[gone,setGone]=useState<Set<string>>(new Set()),[shown,setShown]=useState(25)
 const load=()=>fetch('/api/master/players/people'+(club?`?club=${club}`:''),{cache:'no-store'}).then(async x=>{const j=await x.json();if(x.ok){NAMES=j.clubs||{};setD(j);setGone(new Set())}else setErr(j.error||'Could not load.')}).catch(()=>setErr('No connection.'))
 useEffect(()=>{setD(null);void load()},[club]) // eslint-disable-line react-hooks/exhaustive-deps
 const answer=async(i:Item,v:'same'|'different')=>{setBusy(true);setErr(null);setDone(null);const r=await post({action:v,a:i.a.key,b:i.b.key});setBusy(false)
  if(!r.ok){setErr(r.data.error||'Not saved.');return}
  setDone(v==='same'?`One person: ${i.a.name} now has one profile with both clubs.`:`Two people: ${i.a.name} (${clubName(i.a.club)}) and ${i.b.name} (${clubName(i.b.club)}) stay apart.`);setGone(g=>new Set(g).add(i.key))}
 const undo=async(x:Decided)=>{setBusy(true);const r=await post({action:'undo',a:x.a,b:x.b});setBusy(false);if(r.ok){setDone('Undone. The pair is back in the list.');setD(null);void load()}else setErr(r.data.error||'Not saved.')}
 const list=(d?.items||[]).filter(i=>!gone.has(i.key))
 return <section className="pcc-tool pcc-merge" aria-label="Across clubs">
  <p className="pcc-lede">One person, one profile, every club he played for. These pairs are records at <b>two clubs</b> with the same name. Wikidata already decided {d?d.counts.linked.same+d.counts.linked.different:'…'} pairs it could prove; for the rest, choose: the same man, or two different men. Every answer can be undone.</p>
  {d&&<p className="pcc-hint">{d.counts.people.toLocaleString('en')} people from {d.counts.stints.toLocaleString('en')} club records · {d.counts.multiClub} played for more than one of our clubs · {list.length} pair{list.length===1?'':'s'} to check.</p>}
  {err&&<p role="alert" className="desk-state" data-state="error">{err}</p>}{done&&<p role="status" className="desk-state" data-state="ok">{done}</p>}
  {!d&&!err&&<p className="desk-state" role="status">Reading every club…</p>}
  {d&&!list.length&&<p className="desk-state">Nothing to check. Every shared name is decided.</p>}
  {list.slice(0,shown).map(i=><article key={i.key} className="pcc-pair">
   <p className="pcc-pair-why"><b dir="auto">“{i.name}”</b> · {clubName(i.a.club)} and {clubName(i.b.club)}</p>
   <div className="pcc-vs">{[i.a,i.b].map(s=><div key={s.key} className="pcc-man">
    <p className="pcc-man-tag">{clubName(s.club)}</p>
    <h3 dir="auto">{s.name}</h3>{s.aliases.length>0&&<p dir="auto" className="pcc-hint">{s.aliases.slice(0,3).join(' · ')}</p>}
    <dl><div><dt>Years</dt><dd>{years(s)}</dd></div><div><dt>Positions</dt><dd>{s.pos.length?s.pos.join(' / '):'unknown'}</dd></div>
     {(s.apps!=null||s.goals!=null)&&<div><dt>Games / goals</dt><dd>{s.apps??'—'} / {s.goals??'—'}</dd></div>}
     {s.stars!=null&&<div><dt>Legends stars</dt><dd>{s.stars}</dd></div>}</dl>
   </div>)}</div>
   <p className="pcc-actions">
    <button type="button" className="min-h-tap desk-btn" disabled={busy} onClick={()=>void answer(i,'same')}>The same man — one profile</button>
    <button type="button" className="min-h-tap desk-btn ghost" disabled={busy} onClick={()=>void answer(i,'different')}>Two different men</button>
   </p>
  </article>)}
  {list.length>shown&&<p><button type="button" className="min-h-tap desk-btn ghost" onClick={()=>setShown(n=>n+25)}>Show more ({list.length-shown} left)</button></p>}
  {d&&d.decided.length>0&&<details className="desk-more"><summary className="min-h-tap">Your answers ({d.decided.length})</summary><ul className="pcc-list">{d.decided.map(x=><li key={x.a+x.b}><span className="pcc-name"><b>{x.verdict==='same'?'Same man':'Two men'}</b><small><code>{x.a}</code> · <code>{x.b}</code> · {x.on.slice(0,10)}</small></span><button type="button" className="min-h-tap desk-btn ghost" disabled={busy} onClick={()=>void undo(x)}>Undo</button></li>)}</ul></details>}
 </section>
}
