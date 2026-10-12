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

type Man={club:string;clubName:string;id:string;name:string;nameOriginal:string;aliases?:string[];fromYear?:number|null;toYear?:number|null;positions?:string[];price:number;rating:number;wave:boolean;locked:boolean;apps?:number|null;goals?:number|null}
type Pr={keep:Man;drop:Man;result:{name:string;aliases:string[];years:string;positions:string[];price:number;rating:number};warnings:string[];priceChoices:{keep:number;drop:number};quota:{ok:boolean;violations:string[]};readiness:{broke:string[]};canMerge:boolean;blocker:string|null}
type Cand={club:string;clubName:string;a:Man;b:Man;likeness:{score:number;confidence:string;reasons:string[]};suggest:{keep:string;drop:string;why:string}}
type Kept={club:string;a:string;b:string;by:string;at:string}
const yearsOf=(m:Man)=>m.fromYear?`${m.fromYear}${m.toYear&&m.toYear!==m.fromYear?'–'+m.toYear:''}`:'years not recorded'
const pairId=(c:Cand)=>c.club+'|'+[c.a.id,c.b.id].sort().join('|')
/** the default line every one-click merge carries in the history (owner, 12.10.2026: one click each, no reason box) */
const MERGE_REASON='Same man — merged by the owner'
/**
 * Merge duplicates as three plain answers per pair (owner, 12.10.2026: "make it clear I can keep both"):
 * keep A as the main record · keep B as the main record · they are two different men, keep both. A merge asks once — "Merge X into Y?
 * Yes / No" — and "keep both" is remembered on the server, so the pair is never suggested again (one click brings it back).
 */
export function MergePanel({club}:{club:string|null}){
 const [d,setD]=useState<{candidates:Cand[];total:number;kept?:Kept[]}|null>(null),[err,setErr]=useState<string|null>(null),[done,setDone]=useState<string|null>(null),[shown,setShown]=useState(20)
 const [ask,setAsk]=useState<{c:Cand;keep:Man;drop:Man;pv:Pr|null;price:'keep'|'drop'|'higher'}|null>(null),[busy,setBusy]=useState(false),[gone,setGone]=useState<Set<string>>(new Set())
 const load=()=>{fetch('/api/master/players/duplicates'+(club?`?club=${club}`:''),{cache:'no-store'}).then(async x=>{const j=await x.json();if(x.ok){setD(j);setGone(new Set())}else setErr(j.error||'Could not load.')}).catch(()=>setErr('No connection.'))}
 useEffect(()=>{setD(null);load()},[club]) // eslint-disable-line react-hooks/exhaustive-deps
 const url=(c:string,id:string)=>`/api/master/players/${encodeURIComponent(c)}/${encodeURIComponent(id)}`
 const choose=async(c:Cand,keep:Man,drop:Man)=>{setErr(null);setDone(null);setAsk({c,keep,drop,pv:null,price:'keep'})
  const r=await post<{preview:Pr}>(url(c.club,keep.id),{action:'merge-preview',dropId:drop.id});if(r.ok)setAsk(a=>a&&a.keep.id===keep.id?{...a,pv:r.data.preview}:a);else{setErr(r.data.error||'Could not check this merge.');setAsk(null)}}
 const merge=async()=>{if(!ask?.pv)return;setBusy(true)
  const r=await post<{revision:number}>(url(ask.c.club,ask.keep.id),{action:'merge',dropId:ask.drop.id,reason:MERGE_REASON,price:ask.price,confirmQuota:!ask.pv.quota.ok});setBusy(false)
  if(!r.ok){setErr(r.data.error||'Not merged.');return}
  setDone(`Merged: ${ask.drop.name} is now part of ${ask.keep.name}. Every game sees one man. Undo it any time from ${ask.keep.name}’s Edit page.`);setGone(g=>new Set(g).add(pairId(ask.c)));setAsk(null)}
 const keepBoth=async(c:Cand)=>{setBusy(true);setErr(null);setDone(null);const r=await post<{key:string}>('/api/master/players/duplicates',{action:'keep-both',club:c.club,a:c.a.id,b:c.b.id});setBusy(false)
  if(!r.ok){setErr(r.data.error||'Not saved.');return}
  setDone(`Kept both: ${c.a.name} and ${c.b.name} stay two men. This pair will not be suggested again.`);setGone(g=>new Set(g).add(pairId(c)));setD(x=>x?{...x,kept:[{club:c.club,a:c.a.id,b:c.b.id,by:'you',at:new Date().toISOString()},...(x.kept||[])]}:x)}
 const forget=async(k:Kept)=>{setBusy(true);const r=await post('/api/master/players/duplicates',{action:'forget',club:k.club,a:k.a,b:k.b});setBusy(false);if(r.ok){setDone('Done. The pair can be suggested again.');setD(null);load()}else setErr(r.data.error||'Not saved.')}
 const list=(d?.candidates||[]).filter(c=>!gone.has(pairId(c)))
 return <section className="pcc-tool pcc-merge" aria-label="Merge duplicates">
  <p className="pcc-lede">These pairs <b>might</b> be the same man. For each pair, choose one of three answers. Nothing happens until you click, and every merge can be undone.</p>
  {err&&<p role="alert" className="desk-state" data-state="error">{err}</p>}{done&&<p role="status" className="desk-state" data-state="ok">{done}</p>}
  {!d&&!err&&<p className="desk-state" role="status">Looking for duplicates…</p>}
  {d&&<p className="pcc-hint">{list.length} pair{list.length===1?'':'s'} to check{d.total>d.candidates.length?` (showing the ${d.candidates.length} most likely of ${d.total})`:''}.</p>}
  {list.slice(0,shown).map(c=>{const asking=ask&&pairId(ask.c)===pairId(c)?ask:null,sug=c.suggest.keep
   return <article key={pairId(c)} className="pcc-pair">
    <p className="pcc-pair-why"><b>{c.clubName}</b> · {c.likeness.reasons.join(' · ')}</p>
    <div className="pcc-vs">{[['A',c.a],['B',c.b]].map(([tag,m])=>{const man=m as Man;return <div key={man.id} className="pcc-man" data-suggested={sug===man.id||undefined}>
     <p className="pcc-man-tag">{tag as string}{sug===man.id&&<span> · suggested main record</span>}</p>
     <h3 dir="auto">{man.name}</h3>{man.nameOriginal!==man.name&&<p dir="auto" className="pcc-hint">{man.nameOriginal}</p>}
     <dl><div><dt>Years</dt><dd>{yearsOf(man)}</dd></div><div><dt>Positions</dt><dd>{man.positions?.length?man.positions.join(' / '):'unknown'}</dd></div><div><dt>Price</dt><dd>€{man.price}M{man.locked?' · locked':''}</dd></div><div><dt>Score</dt><dd>{man.rating}</dd></div>
      {(man.apps!=null||man.goals!=null)&&<div><dt>Games / goals</dt><dd>{man.apps??'—'} / {man.goals??'—'}</dd></div>}<div><dt>Record</dt><dd>{man.wave?'roster wave (unreviewed)':'archive'}</dd></div></dl>
     <button type="button" className="min-h-tap desk-btn" disabled={busy} onClick={()=>void choose(c,man,man.id===c.a.id?c.b:c.a)}>Keep {tag as string} as the main record</button>
    </div>})}</div>
    <p className="pcc-actions"><button type="button" className="min-h-tap desk-btn ghost" disabled={busy} onClick={()=>void keepBoth(c)}>They are two different men — keep both</button></p>
    {asking&&<div className="pcc-confirm" role="group" aria-label="Confirm the merge">
     {!asking.pv?<p role="status">Checking…</p>:<>
      <p className="pcc-confirm-q">Merge <b dir="auto">{asking.drop.name}</b> into <b dir="auto">{asking.keep.name}</b>?</p>
      <p className="pcc-hint">{asking.keep.name} stays. {asking.drop.name}’s name, years and positions move onto him: {asking.pv.result.years} · {asking.pv.result.positions.join('/')||'no position'}.</p>
      {asking.pv.warnings.filter(w=>!/^Prices differ/.test(w)).map(w=><p key={w} className="pcc-hint">⚠ {w}</p>)}
      {asking.pv.blocker&&<p role="alert" className="desk-state" data-state="error">{asking.pv.blocker}</p>}
      {asking.pv.readiness.broke.length>0&&<p role="alert" className="desk-state" data-state="error">This merge would stop a game working ({asking.pv.readiness.broke.join(', ')}), so it cannot be done.</p>}
      {asking.pv.priceChoices.keep!==asking.pv.priceChoices.drop&&<div className="pcc-seg" role="group" aria-label="Price after the merge">{([['keep',asking.pv.priceChoices.keep],['drop',asking.pv.priceChoices.drop]] as const).map(([k,v])=><button key={k} type="button" className="min-h-tap" aria-pressed={asking.price===k} onClick={()=>setAsk({...asking,price:k})}>Price €{v}M</button>)}</div>}
      {!asking.pv.quota.ok&&<p className="pcc-hint">Note: this moves the club off its price ladder ({asking.pv.quota.violations.join('; ')}). “Yes” saves it anyway.</p>}
      <p className="pcc-actions"><button type="button" className="min-h-tap desk-btn" disabled={busy||!asking.pv.canMerge} onClick={()=>void merge()}>{busy?'Merging…':'Yes, merge'}</button><button type="button" className="min-h-tap desk-btn ghost" disabled={busy} onClick={()=>setAsk(null)}>No</button></p>
     </>}
    </div>}
   </article>})}
  {d&&list.length>shown&&<p><button type="button" className="min-h-tap desk-btn ghost" onClick={()=>setShown(shown+20)}>Show 20 more</button></p>}
  {d&&!list.length&&<p className="desk-state" data-state="ok">No pairs to check.</p>}
  {(d?.kept?.length??0)>0&&<details className="pcc-kept"><summary className="min-h-tap">Pairs you kept as two men ({d!.kept!.length})</summary><ul>{d!.kept!.map(k=><li key={k.club+k.a+k.b}><span><code>{k.a}</code> and <code>{k.b}</code> · {k.club} · {k.at.slice(0,10)}</span><button type="button" className="min-h-tap pcc-link" disabled={busy} onClick={()=>void forget(k)}>Suggest again</button></li>)}</ul></details>}
 </section>
}
