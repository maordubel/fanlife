'use client'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {useRouter,useSearchParams,usePathname} from 'next/navigation'
/**
 * Player Control Center — the owner's editing desk for every man in every club (plan 11.10.2026).
 * Reads and writes only through /api/master/players (owner session, same-origin, validated server-side). Nothing here decides a rule:
 * the server answers with the impact of a change (price ladder, game readiness, locks) and this screen shows it before anything is published.
 */
type Pos='GK'|'DF'|'MF'|'FW'
type Row={club:string;clubName:string;id:string;name:string;nameOriginal:string;aliases:string[];decade:string;fromYear:number|null;toYear:number|null;basePositions:Pos[];positions:Pos[];positionState:string;basePrice:number;price:number;priceSource:string;baseRating:number;rating:number;ratingBasis:string;locked:boolean;lockReason:string;removed:boolean;overridden:string[];draft:boolean;wave:boolean;confidence:number;rev:number;updatedAt:string|null;updatedBy:string|null;note:string}
type Listing={rows:Row[];total:number;page:number;pages:number;revision:number;counts:Record<string,number>;decades:string[];storage:{kind:string;durable:boolean;error:string|null}}
type Impact={quota:{ok:boolean;want:Record<number,number>;have:Record<number,number>;violations:string[]};readiness:{before:string[];after:string[];broke:string[]};consumers:string[];lockedChange:boolean;iconChange:boolean}
type AuditEvent={id:string;at:string;actor:string;action:string;reason:string;before:Record<string,unknown>|null;after:Record<string,unknown>|null;revision:number}
type BaseInfo={basePrice:number;basePositions:Pos[];baseRating:number;ratingBasis:string;hasList:boolean}
type Detail={row:Row;base:BaseInfo;override:{rev:number}|null;draft:{patch:Record<string,unknown>;by:string;at:string}|null;audit:AuditEvent[]}
const POS:Pos[]=['GK','DF','MF','FW']
const CLUBS:(readonly [string,string])[]=[['celtic','Celtic'],['aek-athens','AEK Athens'],['olympiacos','Olympiacos'],['panathinaikos','Panathinaikos'],['st-pauli','FC St. Pauli'],['zrinjski-mostar','Zrinjski Mostar'],['hapoel-petah-tikva','Hapoel Petah Tikva'],['hapoel-tel-aviv','Hapoel Tel Aviv']]
const STATUS:(readonly [string,string])[]=[['','Every man'],['missing-position','No position'],['fallback-price','Price not in the frozen list'],['overridden','Edited by you'],['draft','Has a draft'],['removed','Removed from the squad'],['locked','Locked / pinned'],['wave','Roster-wave (unreviewed)'],['archive','Archive proper']]
const same=(a:readonly string[],b:readonly string[])=>a.length===b.length&&a.every((x,i)=>x===b[i])
async function call<T>(url:string,init?:RequestInit):Promise<{ok:boolean;status:number;data:T&{error?:string;detail?:unknown}}>{
 try{const r=await fetch(url,{...init,headers:{'Content-Type':'application/json',...(init?.headers||{})},cache:'no-store'});return {ok:r.ok,status:r.status,data:await r.json().catch(()=>({})) as never}}
 catch{return {ok:false,status:0,data:{error:'No connection. Nothing was saved.'} as never}}
}

export function PlayersDesk(){
 const router=useRouter(),path=usePathname(),sp=useSearchParams()
 const [data,setData]=useState<Listing|null>(null),[err,setErr]=useState<string|null>(null),[busy,setBusy]=useState(false),[open,setOpen]=useState<{club:string;id:string}|null>(null)
 const qs=useMemo(()=>{const p=new URLSearchParams(sp.toString());p.set('section','data');p.set('view','players');return p},[sp])
 const apiQs=useMemo(()=>{const p=new URLSearchParams();for(const k of ['club','q','position','price','status','decade','sort','dir','page'])if(sp.get(k))p.set(k,sp.get(k)!);return p.toString()},[sp])
 const load=useCallback(async()=>{setBusy(true);const r=await call<Listing>('/api/master/players?'+apiQs);setBusy(false);if(r.ok){setData(r.data);setErr(null)}else setErr(r.status===401?'Your session ended — sign in again.':r.data.error||'The list could not be loaded.')},[apiQs])
 useEffect(()=>{void load()},[load])
 useEffect(()=>{const id=sp.get('player'),club=sp.get('pc');if(id&&club)setOpen({club,id})},[]) // eslint-disable-line react-hooks/exhaustive-deps
 const set=(k:string,v:string|null)=>{const p=new URLSearchParams(qs.toString());if(v)p.set(k,v);else p.delete(k);if(k!=='page')p.delete('page');router.replace(path+'?'+p.toString(),{scroll:false})}
 const toggle=(k:string,v:string)=>{const cur=(sp.get(k)||'').split(',').filter(Boolean);const next=cur.includes(v)?cur.filter(x=>x!==v):[...cur,v];set(k,next.join(',')||null)}
 const active=(k:string,v:string)=>(sp.get(k)||'').split(',').includes(v)
 const searchRef=useRef<HTMLInputElement>(null)
 const groups=useMemo(()=>{const out:{key:string;title:string;rows:Row[]}[]=[];for(const r of data?.rows||[]){const key=r.club+'|'+r.decade,last=out[out.length-1];if(last&&last.key===key)last.rows.push(r);else out.push({key,title:`${r.clubName} · ${r.decade==='unknown'?'years not recorded':r.decade}`,rows:[r]})}return out},[data])
 const c=data?.counts
 return <div className="pcc">
  <header className="desk-head"><p className="desk-kicker">Data · Player Control Center</p><h1 className="desk-h1">Every player, every club</h1>
   <p className="pcc-lede">Edit a man’s positions, price, manager score — or remove him from the squad. A draft changes nothing; a published change reaches every game, and the archive’s own value stays on file and one click away.</p></header>
  {data&&!data.storage.durable&&<p role="alert" className="desk-state" data-state="error"><b>Changes here will not survive a restart.</b> The control room has no durable store connected ({data.storage.kind}). Connect the Blob store before relying on it.</p>}
  {data?.storage.error&&<p role="alert" className="desk-state" data-state="error">The player files are unreachable ({data.storage.error}). The games keep the last published values.</p>}
  {err&&<p role="alert" className="desk-state" data-state="error">{err}</p>}
  {c&&<ul className="pcc-stats" aria-label="Where the archive stands">
   {([['All players',c.total,''],['No position',c.missingPosition,'missing-position'],['Price not in the list',c.fallbackPrice,'fallback-price'],['Edited',c.overridden,'overridden'],['Drafts',c.drafts,'draft'],['Removed',c.removed,'removed']] as const).map(([l,n,s])=><li key={l}><button type="button" className="min-h-tap" aria-pressed={(sp.get('status')||'')===s} onClick={()=>set('status',s||null)}><b>{(n??0).toLocaleString('en')}</b><span>{l}</span></button></li>)}
   <li className="pcc-rev"><span>Published revision</span><b>{data!.revision}</b></li>
  </ul>}
  <section className="pcc-filters" aria-label="Filters">
   <label className="pcc-search"><span className="sr-only">Search</span><input ref={searchRef} type="search" placeholder="Search a name, original name, alias or id" defaultValue={sp.get('q')||''} onKeyDown={e=>{if(e.key==='Enter')set('q',(e.target as HTMLInputElement).value.trim()||null)}} onBlur={e=>{if((sp.get('q')||'')!==e.target.value.trim())set('q',e.target.value.trim()||null)}}/></label>
   <fieldset><legend>Club</legend>{CLUBS.map(([id,n])=><button key={id} type="button" className="pcc-chip" aria-pressed={active('club',id)} onClick={()=>toggle('club',id)}>{n}</button>)}</fieldset>
   <fieldset><legend>Position (any of)</legend>{[...POS,'unknown'].map(p=><button key={p} type="button" className="pcc-chip" aria-pressed={active('position',p)} onClick={()=>toggle('position',p)}>{p==='unknown'?'?':p}</button>)}</fieldset>
   <fieldset><legend>Price</legend>{[1,2,3,4,5].map(p=><button key={p} type="button" className="pcc-chip" aria-pressed={active('price',String(p))} onClick={()=>toggle('price',String(p))}>€{p}M</button>)}</fieldset>
   <label>Decade<select value={sp.get('decade')||''} onChange={e=>set('decade',e.target.value||null)}><option value="">All decades</option>{(data?.decades||[]).map(d=><option key={d} value={d}>{d==='unknown'?'Years not recorded':d}</option>)}</select></label>
   <label>Show<select value={sp.get('status')||''} onChange={e=>set('status',e.target.value||null)}>{STATUS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
   <label>Sort<select value={`${sp.get('sort')||'club'}:${sp.get('dir')||'asc'}`} onChange={e=>{const [s,d]=e.target.value.split(':');const p=new URLSearchParams(qs.toString());p.set('sort',s!);p.set('dir',d!);p.delete('page');router.replace(path+'?'+p.toString(),{scroll:false})}}>
    {([['club:asc','Club · decade · name'],['name:asc','Name A–Z'],['price:desc','Price high → low'],['price:asc','Price low → high'],['rating:desc','Manager score high → low'],['years:asc','Earliest first'],['updated:desc','Recently edited']] as const).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
   <a className="desk-btn ghost" href={'/api/master/players/export?'+apiQs}>Export CSV</a>
  </section>
  <p className="pcc-count" role="status">{busy?'Loading…':data?`${data.total.toLocaleString('en')} players · page ${data.page} of ${data.pages}`:''}</p>
  {data&&!data.rows.length&&!busy&&<p className="desk-state">No player matches. Clear a filter to widen the search.</p>}
  <div className="pcc-table" role="table" aria-label="Players">
   <div className="pcc-head" role="row"><span role="columnheader">Player</span><span role="columnheader">Years</span><span role="columnheader">Positions</span><span role="columnheader">Price</span><span role="columnheader">Score</span><span role="columnheader">State</span><span role="columnheader"><span className="sr-only">Edit</span></span></div>
   {groups.map(g=><div key={g.key} role="rowgroup"><h2 className="pcc-group">{g.title}</h2>{g.rows.map(r=><Line key={r.club+r.id} r={r} onOpen={()=>setOpen({club:r.club,id:r.id})}/>)}</div>)}
  </div>
  {data&&data.pages>1&&<nav className="pcc-pages" aria-label="Pages"><button type="button" className="desk-btn ghost" disabled={data.page<=1} onClick={()=>set('page',String(data.page-1))}>← Previous</button><span>Page {data.page} / {data.pages}</span><button type="button" className="desk-btn ghost" disabled={data.page>=data.pages} onClick={()=>set('page',String(data.page+1))}>Next →</button></nav>}
  {open&&<Drawer key={open.club+open.id} club={open.club} id={open.id} onClose={()=>setOpen(null)} onChanged={load}/>}
 </div>
}

function Line({r,onOpen}:{r:Row;onOpen:()=>void}){
 return <div className="pcc-row" role="row" data-removed={r.removed||undefined} data-wave={r.wave||undefined}>
  <span role="cell" className="pcc-name"><b dir="auto">{r.name}</b>{r.nameOriginal!==r.name&&<small dir="auto">{r.nameOriginal}</small>}</span>
  <span role="cell" className="pcc-years">{r.fromYear??'—'}{r.toYear&&r.toYear!==r.fromYear?`–${r.toYear}`:''}</span>
  <span role="cell" className="pcc-pos">{r.positions.length?r.positions.map((p,i)=><i key={p} data-primary={i===0}>{p}</i>):<em title="No position on record: dealt into any outfield slot">unknown</em>}</span>
  <span role="cell" className="pcc-price"><b>€{r.price}M</b>{r.price!==r.basePrice&&<small>list €{r.basePrice}M</small>}{r.priceSource==='fallback'&&<small data-warn>not in list</small>}</span>
  <span role="cell" className="pcc-score">{r.rating}{r.rating!==r.baseRating&&<small>was {r.baseRating}</small>}</span>
  <span role="cell" className="pcc-badges">{r.removed&&<i data-k="removed">removed</i>}{r.locked&&<i data-k="locked" title={r.lockReason}>locked</i>}{r.draft&&<i data-k="draft">draft</i>}{r.overridden.length>0&&!r.removed&&<i data-k="edited">edited</i>}{r.wave&&<i data-k="wave">wave</i>}</span>
  <span role="cell"><button type="button" className="desk-btn ghost pcc-edit" onClick={onOpen} aria-label={`Edit ${r.name}`}>Edit</button></span>
 </div>
}

function Drawer({club,id,onClose,onChanged}:{club:string;id:string;onClose:()=>void;onChanged:()=>void}){
 const [d,setD]=useState<Detail|null>(null),[err,setErr]=useState<string|null>(null),[note,setNote]=useState<string|null>(null),[working,setWorking]=useState(false)
 const [positions,setPositions]=useState<Pos[]>([]),[price,setPrice]=useState(1),[rating,setRating]=useState(60),[removed,setRemoved]=useState(false),[reason,setReason]=useState(''),[comment,setComment]=useState('')
 const [impact,setImpact]=useState<Impact|null>(null),[okQuota,setOkQuota]=useState(false),[okOwner,setOkOwner]=useState(false),[okRemove,setOkRemove]=useState(false)
 const closeRef=useRef<HTMLButtonElement>(null),ready=!!d
 const load=useCallback(async()=>{const r=await call<Detail>(`/api/master/players/${encodeURIComponent(club)}/${encodeURIComponent(id)}`);if(!r.ok){setErr(r.data.error||'Could not load this player.');return}
  const x=r.data,eff=x.row,p=x.draft?.patch||{};setD(x)
  setPositions((p.positions as Pos[]|undefined)??eff.positions);setPrice((p.price as number|undefined)??eff.price);setRating((p.rating as number|undefined)??eff.rating);setRemoved((p.removed as boolean|undefined)??eff.removed);setComment((p.note as string|undefined)??eff.note);setImpact(null)},[club,id])
 useEffect(()=>{void load()},[load]); useEffect(()=>{if(ready)closeRef.current?.focus()},[ready])
 useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[onClose])
 const patch=useMemo(()=>{
  if(!d)return {};const b=d.base,o:Record<string,unknown>={}
  o.price=price===b.basePrice?null:price
  o.positions=same(positions,b.basePositions)?null:positions
  o.rating=rating===b.baseRating?null:rating
  o.removed=removed?true:null
  o.note=comment.trim()?comment.trim():null
  return o},[d,price,positions,rating,removed,comment])
 const dirty=useMemo(()=>{if(!d)return false;const e=d.row;return !same(positions,e.positions)||price!==e.price||rating!==e.rating||removed!==e.removed||comment.trim()!==(e.note||'')},[d,positions,price,rating,removed,comment])
 const togglePos=(p:Pos)=>setPositions(cur=>cur.includes(p)?cur.filter(x=>x!==p):[...cur,p])
 const makePrimary=(p:Pos)=>setPositions(cur=>[p,...cur.filter(x=>x!==p)])
 const act=async(action:string,extra:Record<string,unknown>={})=>{setWorking(true);setErr(null);setNote(null)
  const r=await call<Record<string,unknown>>(`/api/master/players/${encodeURIComponent(club)}/${encodeURIComponent(id)}`,{method:'POST',body:JSON.stringify({action,...extra})});setWorking(false);return r}
 const preview=async()=>{const r=await act('preview',{patch});if(r.ok)setImpact((r.data as {impact:Impact}).impact);else setErr(r.data.error||'Preview failed.')}
 const saveDraft=async()=>{const r=await act('draft',{patch,expectedRev:d!.row.rev});if(r.ok){setNote('Draft saved. The games still use the published values.');await load();onChanged()}else setErr(r.data.error||'The draft was not saved.')}
 const publish=async()=>{
  if(removed&&!d!.row.removed&&!okRemove){setErr('Tick the box to confirm removing this man from the squad.');return}
  const r=await act('publish',{patch,expectedRev:d!.row.rev,reason,confirmQuota:okQuota,ownerException:okOwner})
  if(r.ok){setNote(`Published as revision ${(r.data as {revision:number}).revision}. Every game reads it now.`);setReason('');setOkQuota(false);setOkOwner(false);setOkRemove(false);await load();onChanged()}
  else{setErr(r.data.error||'Not published.');const dt=r.data.detail as Impact|undefined;if(dt&&'quota' in dt)setImpact(dt)}}
 const discard=async()=>{const r=await act('discard');if(r.ok){setNote('Draft discarded.');await load();onChanged()}else setErr(r.data.error||'Could not discard.')}
 const revert=async(eventId:string)=>{const r=await act('revert',{eventId,reason:reason||'reverted from the desk'});if(r.ok){setNote('Reverted — recorded as a new change.');await load();onChanged()}else setErr(r.data.error||'Could not revert.')}
 const e=d?.row
 // the desk body is its own stacking layer (z 1) beneath the top bar and the tab bar, so the drawer is lifted to the desk root, where a dialog belongs (rule 33)
 const host=typeof document!=='undefined'?(document.querySelector('.desk') as HTMLElement|null)??document.body:null
 if(!host)return null
 return createPortal(<div className="pcc-overlay" role="presentation" onMouseDown={ev=>{if(ev.target===ev.currentTarget)onClose()}}>
  <aside className="pcc-drawer z-[60]" role="dialog" aria-modal="true" aria-label={e?`Edit ${e.name}`:'Edit player'}>
   <header><div><p className="desk-kicker">{e?.clubName}</p><h2 dir="auto">{e?.name??'Loading…'}</h2>{e&&e.nameOriginal!==e.name&&<p dir="auto" className="pcc-orig">{e.nameOriginal}</p>}</div><button ref={closeRef} type="button" className="desk-btn ghost" onClick={onClose} aria-label="Close">Close ✕</button></header>
   {err&&<p role="alert" className="desk-state" data-state="error">{err}</p>}{note&&<p role="status" className="desk-state">{note}</p>}
   {e&&d&&<>
    <dl className="pcc-id"><div><dt>Player id</dt><dd><code>{e.id}</code></dd></div><div><dt>Years</dt><dd>{e.fromYear??'—'}{e.toYear&&e.toYear!==e.fromYear?`–${e.toYear}`:''} · {e.decade==='unknown'?'not recorded':e.decade}</dd></div><div><dt>Source</dt><dd>{e.wave?'Roster wave — one source, unreviewed':'Archive'} · confidence {e.confidence}</dd></div><div><dt>Position on file</dt><dd>{e.basePositions.length?e.basePositions.join(' / '):'none'} <small>({e.positionState})</small></dd></div></dl>
    <fieldset className="pcc-field"><legend>Positions — pick every one he played</legend>
     <div className="pcc-seg">{POS.map(p=><button key={p} type="button" aria-pressed={positions.includes(p)} onClick={()=>togglePos(p)} className="min-h-tap">{p}{positions[0]===p&&' ★'}</button>)}<button type="button" aria-pressed={positions.length===0} onClick={()=>setPositions([])} className="min-h-tap">Unknown</button></div>
     {positions.length>1&&<p className="pcc-hint">Primary: <b>{positions[0]}</b> ({positions.slice(1).map(p=><button key={p} type="button" className="pcc-link" onClick={()=>makePrimary(p)}>make {p} primary</button>)})</p>}
     {positions.length===0&&<p className="pcc-hint">Unknown stays unknown: he is dealt into any outfield slot, never in goal — it does not make him a verified midfielder.</p>}</fieldset>
    <fieldset className="pcc-field"><legend>Price at this club (Royal Rumble)</legend>
     <div className="pcc-seg">{[1,2,3,4,5].map(p=><button key={p} type="button" aria-pressed={price===p} onClick={()=>setPrice(p)} className="min-h-tap">€{p}M</button>)}</div>
     <p className="pcc-hint">On the frozen list: €{d.base.basePrice}M{d.base.hasList?'':' (no entry — €1M fallback)'}.{e.locked&&<> <b>Locked:</b> {e.lockReason||'pinned'}.</>}</p></fieldset>
    <label className="pcc-field"><span>Manager score <small>(the strength the games use · {d.base.baseRating} on file, {d.base.ratingBasis})</small></span><input type="number" min={40} max={99} step={1} value={rating} onChange={ev=>setRating(Math.round(Number(ev.target.value)||0))}/></label>
    <label className="pcc-field"><span>Note</span><textarea rows={2} maxLength={500} value={comment} onChange={ev=>setComment(ev.target.value)} placeholder="Why, or what you checked"/></label>
    <label className="pcc-remove"><input type="checkbox" checked={removed} onChange={ev=>{setRemoved(ev.target.checked);setOkRemove(false)}}/> <span>Remove him from the squad <small>— a mistake in the archive. Reversible; it never deletes the record.</small></span></label>
    {removed&&!e.removed&&<label className="pcc-remove"><input type="checkbox" checked={okRemove} onChange={ev=>setOkRemove(ev.target.checked)}/> <span>I confirm: take {e.name} out of every game.</span></label>}
    {impact&&<section className="pcc-impact" aria-live="polite" data-ok={impact.quota.ok&&!impact.readiness.broke.length}>
     <h3>What this does</h3>
     <p>Reaches: {impact.consumers.length?impact.consumers.join(' · '):'no game (a note only)'}.</p>
     <p>Price ladder: {impact.quota.ok?'still on the ladder.':<>off the ladder — {impact.quota.violations.join('; ')}.</>}</p>
     {impact.readiness.broke.length>0?<p data-warn>Would stop a game working: {impact.readiness.broke.join('; ')}</p>:<p>Every game that is ready now stays ready.</p>}
     {!impact.quota.ok&&<label><input type="checkbox" checked={okQuota} onChange={ev=>setOkQuota(ev.target.checked)}/> Publish as an exception to the ladder</label>}
     {impact.lockedChange&&<label><input type="checkbox" checked={okOwner} onChange={ev=>setOkOwner(ev.target.checked)}/> {impact.iconChange?'Owner exception: change a pinned €5M icon':'Owner exception: change a locked price'}</label>}
    </section>}
    <label className="pcc-field"><span>Reason <small>(required to publish; kept in the history)</small></span><input type="text" value={reason} onChange={ev=>setReason(ev.target.value)} placeholder="e.g. played in midfield for three seasons — Celtic Wiki"/></label>
    <div className="pcc-actions"><button type="button" className="desk-btn ghost" disabled={working||!dirty} onClick={preview}>Preview impact</button><button type="button" className="desk-btn ghost" disabled={working||!dirty} onClick={saveDraft}>Save draft</button><button type="button" className="desk-btn" disabled={working||(!dirty&&!d.draft)||reason.trim().length<3} onClick={publish}>Publish</button>{d.draft&&<button type="button" className="desk-btn ghost" disabled={working} onClick={discard}>Discard draft</button>}</div>
    {d.draft&&<p className="pcc-hint">A draft by {d.draft.by} is waiting — invisible to the games until published.</p>}
    <section className="pcc-history"><h3>History</h3>{d.audit.length?<ol>{d.audit.map(a=><li key={a.id}><b>{a.action}</b> · {a.actor} · <time dateTime={a.at}>{a.at.slice(0,16).replace('T',' ')}</time><small>{a.reason}</small>{a.action==='publish'&&<button type="button" className="pcc-link" disabled={working} onClick={()=>revert(a.id)}>Revert this change</button>}</li>)}</ol>:<p className="pcc-hint">No changes yet — every value is the archive’s.</p>}</section>
   </>}
  </aside>
 </div>,host)
}
