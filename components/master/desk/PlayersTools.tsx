'use client'
import {useEffect,useMemo,useState} from 'react'
import Link from 'next/link'
/** Player Control Center — the working lists (reports) and the CSV bulk editor. Everything here is a preview until the owner publishes; the server decides every rule. */
type Brief={club:string;clubName:string;id:string;name:string;nameOriginal:string;years:string;price:number;rating:number;wave:boolean;locked:boolean}
type Outlier=Brief&{kind:'underpriced'|'overpriced';recommended:number;why:string}
type Reports={missing:Brief[];missingTotal:number;outliers:Outlier[];twins:{club:string;clubName:string;key:string;members:Brief[]}[];distribution:{club:string;clubName:string;n:number;have:Record<number,number>;want:Record<number,number>}[]}
type BulkRow={line:number;club:string;id:string;name:string;status:string;note:string;locked:boolean;before:{price?:number;positions?:string[];rating?:number;removed?:boolean};patch:Record<string,unknown>|null}
type Preview={rows:BulkRow[];counts:Record<string,number>;clubs:{club:string;n:number;have:Record<number,number>;want:Record<number,number>;violations:string[];broke:string[]}[];lockedRows:number;token:string;revision:number}
async function post<T>(url:string,body:unknown){try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});return {ok:r.ok,data:await r.json().catch(()=>({})) as T&{error?:string;detail?:unknown}}}catch{return {ok:false,data:{error:'No connection. Nothing was saved.'} as never}}}
const editHref=(club:string,id:string)=>`/master/admin?section=data&view=players&club=${encodeURIComponent(club)}&q=${encodeURIComponent(id)}&player=${encodeURIComponent(id)}&pc=${encodeURIComponent(club)}`

export function ReportsPanel({club}:{club:string|null}){
 const [r,setR]=useState<Reports|null>(null),[err,setErr]=useState<string|null>(null),[tab,setTab]=useState<'missing'|'outliers'|'twins'|'distribution'>('missing')
 useEffect(()=>{let live=true;setR(null);fetch('/api/master/players/reports'+(club?`?club=${club}`:''),{cache:'no-store'}).then(async x=>{const j=await x.json();if(!live)return;if(x.ok)setR(j);else setErr(j.error||'Could not load the reports.')}).catch(()=>live&&setErr('No connection.'));return()=>{live=false}},[club])
 return <section className="pcc-tool" aria-label="Reports">
  <p className="pcc-lede">Working lists. Nothing here changes anything: a recommendation is a suggestion with its reason, and a twin is a candidate for the merge file — never merged by name.</p>
  {err&&<p role="alert" className="desk-state" data-state="error">{err}</p>}
  <nav className="pcc-subtabs" aria-label="Report">{([['missing',`No position${r?` (${r.missingTotal})`:''}`],['outliers',`Price vs strength${r?` (${r.outliers.length})`:''}`],['twins',`Possible twins${r?` (${r.twins.length})`:''}`],['distribution','Price ladders']] as const).map(([k,l])=><button key={k} type="button" className="min-h-tap pcc-chip" aria-pressed={tab===k} onClick={()=>setTab(k)}>{l}</button>)}</nav>
  {!r&&!err&&<p className="desk-state" role="status">Reading the archive…</p>}
  {r&&tab==='missing'&&<List title={`Men with no position on record — strongest first (showing ${r.missing.length} of ${r.missingTotal})`} rows={r.missing.map(m=>({b:m,extra:'Dealt as a free man: any outfield slot, never goal.'}))}/>}
  {r&&tab==='outliers'&&<List title="A price that disagrees with the club’s own ranking of strength" rows={r.outliers.map(o=>({b:o,extra:`${o.kind==='underpriced'?'Underpriced':'Overpriced'}: suggest €${o.recommended}M — ${o.why}`}))} empty="Every price follows strength within two rungs."/>}
  {r&&tab==='twins'&&<div>{r.twins.length?r.twins.map(t=><div key={t.club+t.key} className="pcc-twin"><b>{t.clubName} · “{t.key}”</b><ul>{t.members.map(m=><li key={m.id}><span dir="auto">{m.name} <small>{m.nameOriginal!==m.name?m.nameOriginal:''}</small></span><code>{m.id}</code><span>{m.years} · €{m.price}M · {m.rating}</span><Link className="pcc-link" href={editHref(m.club,m.id)}>Edit</Link></li>)}</ul></div>):<p className="desk-state">No two ids at one club share a name or alias.</p>}</div>}
  {r&&tab==='distribution'&&<table className="desk-table"><thead><tr><th>Club</th><th>Men</th>{[5,4,3,2,1].map(p=><th key={p}>€{p}M (has / ladder)</th>)}</tr></thead><tbody>{r.distribution.map(d=><tr key={d.club}><td>{d.clubName}</td><td>{d.n}</td>{[5,4,3,2,1].map(p=><td key={p} data-off={d.have[p]!==d.want[p]||undefined}>{d.have[p]} / {d.want[p]}</td>)}</tr>)}</tbody></table>}
 </section>
}
function List({title,rows,empty}:{title:string;rows:{b:Brief;extra:string}[];empty?:string}){
 return <div><h2 className="pcc-sub">{title}</h2>{rows.length?<ul className="pcc-list">{rows.map(({b,extra})=><li key={b.club+b.id}><span className="pcc-name"><b dir="auto">{b.name}</b><small>{b.clubName} · {b.years}{b.nameOriginal!==b.name?` · ${b.nameOriginal}`:''}</small></span><span className="pcc-price"><b>€{b.price}M</b><small>score {b.rating}</small></span><span className="pcc-why">{extra}{b.locked?' (locked)':''}{b.wave?' · roster-wave':''}</span><Link className="desk-btn ghost pcc-edit" href={editHref(b.club,b.id)}>Edit</Link></li>)}</ul>:<p className="desk-state">{empty||'Nothing to show.'}</p>}</div>
}

const TEMPLATE='club_id,player_id,proposed_price_m,primary_position,secondary_positions,rating_override,removed,reason,expected_revision\n'
export function BulkPanel(){
 const [csv,setCsv]=useState(''),[fileName,setFileName]=useState(''),[pv,setPv]=useState<Preview|null>(null),[err,setErr]=useState<string|null>(null),[done,setDone]=useState<string|null>(null),[busy,setBusy]=useState(false)
 const [reason,setReason]=useState(''),[okQuota,setOkQuota]=useState(false),[okOwner,setOkOwner]=useState(false)
 const key=useMemo(()=>'b'+Math.random().toString(36).slice(2,12)+Date.now().toString(36),[pv?.token]) // one key per preview: a double click can never write twice
 const run=async(action:'preview'|'commit')=>{setBusy(true);setErr(null);setDone(null)
  const r=await post<Preview&{revision:number;replayed?:boolean;changed?:number}>('/api/master/players/bulk',action==='preview'?{action,csv}:{action,csv,token:pv!.token,idempotencyKey:key,reason,confirmQuota:okQuota,ownerException:okOwner});setBusy(false)
  if(!r.ok){setErr(r.data.error||'Failed.');return}
  if(action==='preview'){setPv(r.data as Preview);setOkQuota(false);setOkOwner(false)}else{setDone(r.data.replayed?'This batch was already published — nothing was written twice.':`Published ${r.data.changed} change(s) as revision ${r.data.revision}. Every game reads them now.`);setPv(null);setCsv('');setFileName('')}}
 const bad=pv?(pv.counts.invalid||0)+(pv.counts.missing||0)+(pv.counts.conflict||0):0
 const off=pv?.clubs.some(c=>c.violations.length),broke=pv?.clubs.some(c=>c.broke.length)
 return <section className="pcc-tool" aria-label="Bulk edit">
  <p className="pcc-lede">Edit many men at once from a CSV. Rows are matched by <code>club_id</code> + <code>player_id</code> only — never by name. A blank cell leaves a field alone, <code>inherit</code> clears an override, <code>unknown</code> makes a position unknown. Preview writes nothing; one bad row refuses the whole file.</p>
  <p className="pcc-actions"><a className="desk-btn ghost" download="fanlife-players-template.csv" href={'data:text/csv;charset=utf-8,'+encodeURIComponent(TEMPLATE)}>Download template</a><a className="desk-btn ghost" href="/api/master/players/export">Export every player (CSV)</a></p>
  <label className="pcc-field"><span>CSV file (UTF-8, up to 1 MB / 2,000 rows)</span><input type="file" accept=".csv,text/csv" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>1_000_000){setErr('The file is larger than 1 MB.');return}setFileName(f.name);setCsv(await f.text());setPv(null);setDone(null);setErr(null)}}/></label>
  <p className="pcc-actions"><button type="button" className="min-h-tap desk-btn" disabled={!csv||busy} onClick={()=>run('preview')}>Preview{fileName?` “${fileName}”`:''}</button></p>
  {err&&<p role="alert" className="desk-state" data-state="error">{err}</p>}{done&&<p role="status" className="desk-state">{done}</p>}
  {pv&&<div aria-live="polite">
   <ul className="pcc-stats" aria-label="Preview">{['changed','unchanged','missing','invalid','conflict'].map(k=><li key={k}><div className="pcc-statline"><b>{pv.counts[k]||0}</b><span>{k}</span></div></li>)}</ul>
   {pv.clubs.map(c=><p key={c.club} className="pcc-clubline" data-warn={c.violations.length||c.broke.length||undefined}><b>{c.club}</b> · {c.n} men · {c.violations.length?`off the ladder — ${c.violations.join('; ')}`:'on the ladder'}{c.broke.length?` · would stop: ${c.broke.join(', ')}`:''}</p>)}
   <div className="pcc-table"><div className="pcc-brow pcc-head"><span>Line</span><span>Player</span><span>Status</span><span>Before → change</span></div>
    {pv.rows.slice(0,300).map(r=><div key={r.line} className="pcc-brow" data-status={r.status}><span>{r.line}</span><span><b dir="auto">{r.name||r.id}</b><small>{r.club} · {r.id}</small></span><span>{r.status}{r.locked&&r.status==='changed'?' · locked':''}<small>{r.note}</small></span><span><small>{r.before.price!==undefined?`€${r.before.price}M · ${(r.before.positions||[]).join('/')||'unknown'} · ${r.before.rating}`:'—'}</small><small>{r.patch?JSON.stringify(r.patch):''}</small></span></div>)}
    {pv.rows.length>300&&<p className="pcc-hint">Showing 300 of {pv.rows.length} rows; the whole file is applied.</p>}</div>
   {bad>0?<p role="alert" className="desk-state" data-state="error">{bad} row(s) cannot be applied, so nothing can be published. Fix the file and preview it again.</p>
    :pv.counts.changed?<div className="pcc-commit">
     <label className="pcc-field"><span>Reason for the whole batch (kept in every man’s history)</span><input type="text" value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. positions from the Celtic Wiki career tables"/></label>
     {off&&<label className="pcc-remove"><input type="checkbox" checked={okQuota} onChange={e=>setOkQuota(e.target.checked)}/> <span>Publish as an exception to the price ladder</span></label>}
     {pv.lockedRows>0&&<label className="pcc-remove"><input type="checkbox" checked={okOwner} onChange={e=>setOkOwner(e.target.checked)}/> <span>Owner exception: {pv.lockedRows} row(s) change a locked or pinned price</span></label>}
     {broke&&<p role="alert" className="desk-state" data-state="error">This batch would stop a game working, so the server will refuse it.</p>}
     <button type="button" className="min-h-tap desk-btn" disabled={busy||reason.trim().length<3||(off&&!okQuota)||(pv.lockedRows>0&&!okOwner)||!!broke} onClick={()=>run('commit')}>Publish {pv.counts.changed} change(s)</button></div>
    :<p className="desk-state">Nothing to change: every row already matches.</p>}
  </div>}
 </section>
}

type Pr={keep:Brief&Record<string,unknown>;drop:Brief&Record<string,unknown>;result:{name:string;aliases:string[];years:string;positions:string[];price:number;rating:number};warnings:string[];priceChoices:{keep:number;drop:number};quota:{ok:boolean;violations:string[]};readiness:{broke:string[]};canMerge:boolean;blocker:string|null}
type Cand={club:string;clubName:string;a:Brief&{positions?:string[];aliases?:string[]};b:Brief&{positions?:string[];aliases?:string[]};likeness:{score:number;confidence:string;reasons:string[]};suggest:{keep:string;drop:string;why:string}}
export function MergePanel({club}:{club:string|null}){
 const [d,setD]=useState<{candidates:Cand[];total:number}|null>(null),[err,setErr]=useState<string|null>(null),[done,setDone]=useState<string|null>(null),[open,setOpen]=useState<{c:Cand;keep:string;drop:string}|null>(null)
 const [pv,setPv]=useState<Pr|null>(null),[reason,setReason]=useState(''),[price,setPrice]=useState<'keep'|'drop'|'higher'>('keep'),[okQ,setOkQ]=useState(false),[okO,setOkO]=useState(false),[busy,setBusy]=useState(false)
 const load=()=>{setD(null);fetch('/api/master/players/duplicates'+(club?`?club=${club}`:''),{cache:'no-store'}).then(async x=>{const j=await x.json();x.ok?setD(j):setErr(j.error||'Could not load.')}).catch(()=>setErr('No connection.'))}
 useEffect(load,[club]) // eslint-disable-line react-hooks/exhaustive-deps
 const url=(c:string,id:string)=>`/api/master/players/${encodeURIComponent(c)}/${encodeURIComponent(id)}`
 const pick=async(c:Cand,keep:string,drop:string)=>{setOpen({c,keep,drop});setPv(null);setErr(null);setReason('');setPrice('keep');setOkQ(false);setOkO(false)
  const r=await post<{preview:Pr}>(url(c.club,keep),{action:'merge-preview',dropId:drop});r.ok?setPv(r.data.preview):setErr(r.data.error||'Failed.')}
 const go=async()=>{if(!open)return;setBusy(true);const r=await post<{revision:number}>(url(open.c.club,open.keep),{action:'merge',dropId:open.drop,reason,price,confirmQuota:okQ,ownerException:okO});setBusy(false)
  if(!r.ok){setErr(r.data.error||'Failed.');return}setDone(`Merged — published as revision ${r.data.revision}. Every game now sees one man.`);setOpen(null);setPv(null);load()}
 return <section className="pcc-tool pcc-merge" aria-label="Merge duplicates">
  <p className="pcc-lede">Likely duplicates, found by family name, given name and years — never merged automatically. Pick which record to keep: the other leaves the squad, and his name, years, positions and sources are carried onto the one you keep, so old records still resolve. Every merge can be undone.</p>
  {err&&<p role="alert" className="desk-state" data-state="error">{err}</p>}{done&&<p role="status" className="desk-state">{done}</p>}
  {!d&&!err&&<p className="desk-state" role="status">Looking for duplicates…</p>}
  {d&&<p className="pcc-hint">{d.total} candidate pair(s){d.total>d.candidates.length?`, showing the ${d.candidates.length} most likely`:''}.</p>}
  {d?.candidates.map(c=>{const sel=open?.c===c;return <div key={c.club+c.a.id+c.b.id} className="pcc-pair">
   <div className="cols">{[c.a,c.b].map(m=><div key={m.id}><b dir="auto">{m.name}</b><small> {m.nameOriginal!==m.name?m.nameOriginal:''}</small><div><code>{m.id}</code> · {m.years} · €{m.price}M · {m.rating}{m.wave?' · roster-wave':''}</div></div>)}</div>
   <p className="pcc-hint">{c.clubName} · {c.likeness.confidence} match — {c.likeness.reasons.join('; ')}. Suggested: keep <b dir="auto">{(c.suggest.keep===c.a.id?c.a:c.b).name}</b> ({c.suggest.why}).</p>
   <p className="pcc-actions"><button type="button" className="min-h-tap desk-btn" onClick={()=>pick(c,c.suggest.keep,c.suggest.drop)}>Review merge</button><button type="button" className="min-h-tap desk-btn ghost" onClick={()=>pick(c,c.suggest.drop,c.suggest.keep)}>Keep the other one</button></p>
   {sel&&pv&&<div aria-live="polite">
    <p><b>Result:</b> <span dir="auto">{pv.result.name}</span> · {pv.result.years} · {pv.result.positions.join('/')||'no position'} · also known as {pv.result.aliases.join(', ')||'—'}</p>
    {pv.warnings.map(w=><p key={w} className="pcc-hint">⚠ {w}</p>)}
    {pv.blocker&&<p role="alert" className="desk-state" data-state="error">{pv.blocker}</p>}
    {pv.readiness.broke.length>0&&<p role="alert" className="desk-state" data-state="error">Would stop: {pv.readiness.broke.join(', ')}.</p>}
    {pv.priceChoices.keep!==pv.priceChoices.drop&&<label className="pcc-field"><span>Price the merged man keeps</span><select value={price} onChange={e=>setPrice(e.target.value as 'keep')}><option value="keep">€{pv.priceChoices.keep}M (the record kept)</option><option value="drop">€{pv.priceChoices.drop}M (the other record)</option><option value="higher">€{Math.max(pv.priceChoices.keep,pv.priceChoices.drop)}M (the higher)</option></select></label>}
    {!pv.quota.ok&&<label className="pcc-remove"><input type="checkbox" checked={okQ} onChange={e=>setOkQ(e.target.checked)}/> <span>Publish as an exception to the price ladder ({pv.quota.violations.join('; ')})</span></label>}
    <label className="pcc-remove"><input type="checkbox" checked={okO} onChange={e=>setOkO(e.target.checked)}/> <span>Owner exception (only if a locked price changes)</span></label>
    <label className="pcc-field"><span>Reason (kept in the history)</span><input type="text" value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. same man, two spellings"/></label>
    <p className="pcc-actions"><button type="button" className="min-h-tap desk-btn" disabled={busy||!pv.canMerge||reason.trim().length<3||(!pv.quota.ok&&!okQ)} onClick={go}>Merge and publish</button><button type="button" className="min-h-tap desk-btn ghost" onClick={()=>{setOpen(null);setPv(null)}}>Cancel</button></p>
   </div>}
  </div>})}
  {d&&!d.candidates.length&&<p className="desk-state">No likely duplicates.</p>}
 </section>
}
