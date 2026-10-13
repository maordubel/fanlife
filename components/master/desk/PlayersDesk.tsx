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
type Row={mergedInto?:string|null;club:string;clubName:string;id:string;name:string;nameOriginal:string;aliases:string[];decade:string;fromYear:number|null;toYear:number|null;basePositions:Pos[];positions:Pos[];positionState:string;basePrice:number;price:number;priceSource:string;baseRating:number;rating:number;baseReputation:number;reputation:number;baseName:string;ratingBasis:string;locked:boolean;lockReason:string;removed:boolean;overridden:string[];draft:boolean;wave:boolean;confidence:number;rev:number;updatedAt:string|null;updatedBy:string|null;note:string;apps?:number|null;goals?:number|null}
type Listing={rows:Row[];total:number;page:number;pages:number;revision:number;counts:Record<string,number>;decades:string[];storage:{kind:string;durable:boolean;error:string|null}}
type Impact={quota:{ok:boolean;want:Record<number,number>;have:Record<number,number>;violations:string[]};readiness:{before:string[];after:string[];broke:string[]};consumers:string[];lockedChange:boolean;iconChange:boolean}
type AuditEvent={id:string;at:string;actor:string;action:string;reason:string;before:Record<string,unknown>|null;after:Record<string,unknown>|null;revision:number}
type BaseInfo={basePrice:number;basePositions:Pos[];baseRating:number;ratingBasis:string;hasList:boolean}
type Detail={row:Row;base:BaseInfo;override:{rev:number}|null;draft:{patch:Record<string,unknown>;by:string;at:string}|null;audit:AuditEvent[];absorbed?:{id:string;name:string;years:string}[]}
const POS:Pos[]=['GK','DF','MF','FW']
const CLUBS:(readonly [string,string])[]=[['celtic','Celtic'],['aek-athens','AEK Athens'],['olympiacos','Olympiacos'],['panathinaikos','Panathinaikos'],['st-pauli','FC St. Pauli'],['zrinjski-mostar','Zrinjski Mostar'],['hapoel-petah-tikva','Hapoel Petah Tikva'],['hapoel-tel-aviv','Hapoel Tel Aviv']]
const STATUS:(readonly [string,string])[]=[['','Every man'],['missing-position','No position'],['fallback-price','Price not in the frozen list'],['overridden','Edited by you'],['draft','Has a draft'],['removed','Removed from the squad'],['merged','Merged into another record'],['locked','Locked / pinned'],['wave','Roster-wave (unreviewed)'],['archive','Archive proper']]
/** the sortable columns (null = not sortable), and which way a first click sorts: names and years from the start, numbers and edits from the top */
const COLUMNS:(readonly [string|null,string])[]=[['name','Player'],['years','Years'],['position','Positions'],['price','Price'],['rating','Score'],['updated','Edited']]
const FIRST_DIR:Record<string,'asc'|'desc'>={name:'asc',years:'asc',position:'asc',price:'desc',rating:'desc',updated:'desc'}
const SORT_OPTIONS:(readonly [string,string])[]=[['club:asc','Club · decade · name'],['name:asc','Name A → Z'],['name:desc','Name Z → A'],['price:desc','Price high → low'],['price:asc','Price low → high'],['rating:desc','Score high → low'],['rating:asc','Score low → high'],['years:asc','Earliest first'],['years:desc','Latest first'],['position:asc','Position GK → FW'],['updated:desc','Recently edited']]
const same=(a:readonly string[],b:readonly string[])=>a.length===b.length&&a.every((x,i)=>x===b[i])
async function call<T>(url:string,init?:RequestInit):Promise<{ok:boolean;status:number;data:T&{error?:string;detail?:unknown}}>{
 try{const r=await fetch(url,{...init,headers:{'Content-Type':'application/json',...(init?.headers||{})},cache:'no-store'});return {ok:r.ok,status:r.status,data:await r.json().catch(()=>({})) as never}}
 catch{return {ok:false,status:0,data:{error:'No connection. Nothing was saved.'} as never}}
}

import {ReportsPanel,BulkPanel,MergePanel} from './PlayersTools'
export function PlayersDesk(){
 const router=useRouter(),path=usePathname(),sp=useSearchParams()
 const [data,setData]=useState<Listing|null>(null),[err,setErr]=useState<string|null>(null),[busy,setBusy]=useState(false),[open,setOpen]=useState<{club:string;id:string}|null>(null)
 const qs=useMemo(()=>{const p=new URLSearchParams(sp.toString());if(sp.get('section')==='data'){p.set('view','players')}else{p.set('section','players');p.delete('view')};return p},[sp])
 const apiQs=useMemo(()=>{const p=new URLSearchParams();for(const k of ['club','q','position','price','status','decade','sort','dir','page'])if(sp.get(k))p.set(k,sp.get(k)!);return p.toString()},[sp])
 const load=useCallback(async()=>{setBusy(true);const r=await call<Listing>('/api/master/players?'+apiQs);setBusy(false);if(r.ok){setData(r.data);setErr(null)}else setErr(r.status===401?'Your session ended — sign in again.':r.data.error||'The list could not be loaded.')},[apiQs])
 useEffect(()=>{void load()},[load])
 const deepId=sp.get('player'),deepClub=sp.get('pc')
 useEffect(()=>{if(deepId&&deepClub)setOpen({club:deepClub,id:deepId})},[deepId,deepClub])
 const set=(k:string,v:string|null)=>{const p=new URLSearchParams(qs.toString());if(v)p.set(k,v);else p.delete(k);if(k!=='page')p.delete('page');router.replace(path+'?'+p.toString(),{scroll:false})}
 const toggle=(k:string,v:string)=>{const cur=(sp.get(k)||'').split(',').filter(Boolean);const next=cur.includes(v)?cur.filter(x=>x!==v):[...cur,v];set(k,next.join(',')||null)}
 const active=(k:string,v:string)=>(sp.get(k)||'').split(',').includes(v)
 const searchRef=useRef<HTMLInputElement>(null)
 const [chosen,setChosen]=useState<Record<string,boolean>>({}),latest=useRef(new Map<string,Row>())
 const track=useCallback((r:Row)=>{latest.current.set(r.club+'|'+r.id,r)},[])
 const choose=useCallback((r:Row,on:boolean)=>setChosen(c=>{const n={...c},k=r.club+'|'+r.id;if(on)n[k]=true;else delete n[k];return n}),[])
 const pageRows=(data?.rows||[]).filter(r=>!r.removed&&!r.mergedInto),allOnPage=pageRows.length>0&&pageRows.every(r=>chosen[r.club+'|'+r.id])
 const groups=useMemo(()=>{const out:{key:string;title:string;rows:Row[]}[]=[];for(const r of data?.rows||[]){const key=r.club+'|'+r.decade,last=out[out.length-1];if(last&&last.key===key)last.rows.push(r);else out.push({key,title:`${r.clubName} · ${r.decade==='unknown'?'years not recorded':r.decade}`,rows:[r]})}return out},[data])
 const c=data?.counts,tab=sp.get('tab')||''
 // sorting: a click on a column name sorts by it; a second click turns the order round. Grouping by club and decade only when sorted by club.
 const sort=sp.get('sort')||'club',dir=sp.get('dir')==='desc'?'desc':'asc',grouped=sort==='club'
 const sortBy=(key:string)=>{const p=new URLSearchParams(qs.toString());const d=sort===key?(dir==='asc'?'desc':'asc'):FIRST_DIR[key]??'asc';p.set('sort',key);p.set('dir',d);p.delete('page');router.replace(path+'?'+p.toString(),{scroll:false})}
 return <div className="pcc">
  <header className="desk-head"><p className="desk-kicker">Players · Player Control Center</p><h1 className="desk-h1">Every player, every club</h1>
   <p className="pcc-lede">Change a price, a score, a reputation, positions or a name right in the table — or tick several men and set their price together. It saves at once and every game uses it. Click a column name to sort. <b>Edit</b> opens the rest: a note, removing a man, merging.</p></header>
  <nav className="pcc-tabs" aria-label="Player Control Center">{([['','Players'],['reports','Reports'],['merge','Merge duplicates'],['bulk','Bulk edit (CSV)']] as const).map(([k,l])=><button key={k} type="button" className="pcc-chip" aria-pressed={(sp.get('tab')||'')===k} onClick={()=>set('tab',k||null)}>{l}</button>)}</nav>
  {tab==='reports'?<ReportsPanel club={(sp.get('club')||'').split(',')[0]||null}/>:tab==='merge'?<MergePanel club={(sp.get('club')||'').split(',')[0]||null}/>:tab==='bulk'?<BulkPanel/>:<>
  {data&&!data.storage.durable&&<p role="alert" className="desk-state" data-state="error"><b>Changes here will not survive a restart.</b> The control room has no durable store connected ({data.storage.kind}). Set SUPABASE_SERVICE_ROLE_KEY before relying on it.</p>}
  {data?.storage.error&&<p role="alert" className="desk-state" data-state="error">The player files are unreachable ({data.storage.error}). The games keep the last published values.</p>}
  {err&&<p role="alert" className="desk-state" data-state="error">{err}</p>}
  {c&&<ul className="pcc-stats" aria-label="Where the archive stands">
   {([['All players',c.total,''],['No position',c.missingPosition,'missing-position'],['Price not in the list',c.fallbackPrice,'fallback-price'],['Edited',c.overridden,'overridden'],['Drafts',c.drafts,'draft'],['Removed',c.removed,'removed'],['Merged',c.merged??0,'merged']] as const).map(([l,n,s])=><li key={l}><button type="button" className="min-h-tap" aria-pressed={(sp.get('status')||'')===s} onClick={()=>set('status',s||null)}><b>{(n??0).toLocaleString('en')}</b><span>{l}</span></button></li>)}
   <li className="pcc-rev"><span>Published revision</span><b>{data!.revision}</b></li>
  </ul>}
  <section className="pcc-filters" aria-label="Filters">
   <label className="pcc-search"><span className="sr-only">Search</span><input ref={searchRef} type="search" placeholder="Search a name, original name, alias or id" defaultValue={sp.get('q')||''} onKeyDown={e=>{if(e.key==='Enter')set('q',(e.target as HTMLInputElement).value.trim()||null)}} onBlur={e=>{if((sp.get('q')||'')!==e.target.value.trim())set('q',e.target.value.trim()||null)}}/></label>
   <Multi label="Club" options={CLUBS.map(([id,n])=>[id,n] as [string,string])} value={(sp.get('club')||'').split(',').filter(Boolean)} onToggle={v=>toggle('club',v)} onClear={()=>set('club',null)}/>
   <Multi label="Position (any of)" options={[...POS,'unknown'].map(p=>[p,p==='unknown'?'Unknown':p] as [string,string])} value={(sp.get('position')||'').split(',').filter(Boolean)} onToggle={v=>toggle('position',v)} onClear={()=>set('position',null)}/>
   <Multi label="Price" options={[1,2,3,4,5].map(p=>[String(p),`€${p}M`] as [string,string])} value={(sp.get('price')||'').split(',').filter(Boolean)} onToggle={v=>toggle('price',v)} onClear={()=>set('price',null)}/>
   <label>Decade<select value={sp.get('decade')||''} onChange={e=>set('decade',e.target.value||null)}><option value="">All decades</option>{(data?.decades||[]).map(d=><option key={d} value={d}>{d==='unknown'?'Years not recorded':d}</option>)}</select></label>
   <label>Show<select value={sp.get('status')||''} onChange={e=>set('status',e.target.value||null)}>{STATUS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
   <label>Sort<select value={`${sp.get('sort')||'club'}:${sp.get('dir')||'asc'}`} onChange={e=>{const [s,d]=e.target.value.split(':');const p=new URLSearchParams(qs.toString());p.set('sort',s!);p.set('dir',d!);p.delete('page');router.replace(path+'?'+p.toString(),{scroll:false})}}>
    {SORT_OPTIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
   {['club','position','price','decade','status','q'].some(k=>sp.get(k))&&<button type="button" className="min-h-tap desk-btn ghost" onClick={()=>{const p=new URLSearchParams(qs.toString());for(const k of ['club','position','price','decade','status','q','page'])p.delete(k);router.replace(path+'?'+p.toString(),{scroll:false})}}>Clear all filters</button>}
   <a className="min-h-tap desk-btn ghost" href={'/api/master/players/export?'+apiQs}>Export CSV</a>
  </section>
  <p className="pcc-count" role="status">{busy?'Loading…':data?`${data.total.toLocaleString('en')} players · page ${data.page} of ${data.pages}`:''}</p>
  <ManyBar chosen={Object.keys(chosen)} latest={latest} allOnPage={allOnPage} onAllOnPage={on=>setChosen(c=>{const n={...c};for(const r of pageRows){const k=r.club+'|'+r.id;if(on)n[k]=true;else delete n[k]};return n})} onClear={()=>setChosen({})} onDone={()=>{setChosen({});void load()}}/>
  {data&&!data.rows.length&&!busy&&<p className="desk-state">No player matches. Clear a filter to widen the search.</p>}
  <div className="pcc-table" role="table" aria-label="Players">
   <div className="pcc-head" role="row">{COLUMNS.map(([key,label])=>{const on=sort===key;return <span key={label} role="columnheader" aria-sort={on?(dir==='asc'?'ascending':'descending'):'none'}>{key?<button type="button" className="min-h-tap pcc-sort" data-on={on||undefined} onClick={()=>sortBy(key)} title={`Sort by ${label.toLowerCase()}`}>{label}<i aria-hidden="true">{on?(dir==='asc'?'▲':'▼'):'↕'}</i></button>:label}</span>})}<span role="columnheader"><span className="sr-only">Edit</span></span></div>
   {grouped?groups.map(g=><div key={g.key} role="rowgroup"><h2 className="pcc-group">{g.title}</h2>{g.rows.map(r=><Line key={r.club+r.id+r.rev} r={r} chosen={!!chosen[r.club+'|'+r.id]} onChoose={choose} track={track} onOpen={()=>setOpen({club:r.club,id:r.id})}/>)}</div>)
    :<div role="rowgroup">{(data?.rows||[]).map(r=><Line key={r.club+r.id+r.rev} r={r} showClub chosen={!!chosen[r.club+'|'+r.id]} onChoose={choose} track={track} onOpen={()=>setOpen({club:r.club,id:r.id})}/>)}</div>}
  </div>
  {data&&data.pages>1&&<nav className="pcc-pages" aria-label="Pages"><button type="button" className="desk-btn ghost" disabled={data.page<=1} onClick={()=>set('page',String(data.page-1))}>← Previous</button><span>Page {data.page} / {data.pages}</span><button type="button" className="desk-btn ghost" disabled={data.page>=data.pages} onClick={()=>set('page',String(data.page+1))}>Next →</button></nav>}
  </>}
  {open&&<Drawer key={open.club+open.id} club={open.club} id={open.id} onClose={()=>setOpen(null)} onChanged={load}/>}
 </div>
}

/** a dropdown that holds a list of checkboxes — one tidy button instead of a wall of chips; closes on an outside click or Escape */
function Multi({label,options,value,onToggle,onClear}:{label:string;options:[string,string][];value:string[];onToggle:(v:string)=>void;onClear:()=>void}){
 const ref=useRef<HTMLDetailsElement>(null)
 useEffect(()=>{const close=(e:Event)=>{const d=ref.current;if(!d?.open)return;if(e.type==='keydown'&&(e as KeyboardEvent).key!=='Escape')return;if(e.type==='click'&&d.contains(e.target as Node))return;d.open=false};document.addEventListener('click',close);document.addEventListener('keydown',close);return()=>{document.removeEventListener('click',close);document.removeEventListener('keydown',close)}},[])
 const names=options.filter(([v])=>value.includes(v)).map(([,n])=>n)
 return <details ref={ref} className="pcc-dd"><summary className="min-h-tap" data-on={value.length>0||undefined}><span>{label}</span><b>{value.length===0?'All':value.length<=2?names.join(', '):`${value.length} chosen`}</b></summary>
  <div className="pcc-dd-menu">{options.map(([v,n])=><label key={v} className="min-h-tap"><input type="checkbox" checked={value.includes(v)} onChange={()=>onToggle(v)}/><span>{n}</span></label>)}{value.length>0&&<button type="button" className="min-h-tap pcc-link" onClick={onClear}>Clear</button>}</div></details>
}

/**
 * One man, one row. Price and score are edited IN the row (owner, 12.10.2026: "no reason, no popup"): a change publishes at once through
 * the `quick` action, which runs every server check the full editor runs. The row answers in place — "Saving…", "Saved ✓ · Undo", or the
 * server's own reason with the one button that moves past it ("Save anyway" for the price ladder; the full editor for a locked price).
 */
type Edit={price?:number;rating?:number;reputation?:number;positions?:Pos[];name?:string}
type Quick={state:'idle'}|{state:'saving'}|{state:'saved';undo:Edit|null}|{state:'error';msg:string;retry?:Edit}
function Line({r:initial,onOpen,showClub,chosen,onChoose,track}:{r:Row;onOpen:()=>void;showClub?:boolean;chosen:boolean;onChoose:(r:Row,on:boolean)=>void;track:(r:Row)=>void}){
 const [r,setR]=useState(initial),[q,setQ]=useState<Quick>({state:'idle'}),[score,setScore]=useState(String(initial.rating)),[rep,setRep]=useState(String(initial.reputation))
 const [panel,setPanel]=useState<null|'pos'|'name'>(null),[nameDraft,setNameDraft]=useState(initial.name),[sure,setSure]=useState(false)
 const timers=useRef<Record<string,ReturnType<typeof setTimeout>|null>>({})
 useEffect(()=>()=>{for(const t of Object.values(timers.current))if(t)clearTimeout(t)},[])
 useEffect(()=>{track(r)},[r,track])
 const frozen=r.removed||!!r.mergedInto
 /** one edit, any of price · score · reputation · positions · name: publishes at once through the same server checks as the full editor */
 const save=async(next:Edit,o:{confirmQuota?:boolean;isUndo?:boolean;confirmName?:boolean}={})=>{
  const patch:Record<string,unknown>={},before:Edit={}
  if(next.price!==undefined&&next.price!==r.price){patch.price=next.price;before.price=r.price}
  if(next.rating!==undefined&&next.rating!==r.rating){patch.rating=next.rating;before.rating=r.rating}
  if(next.reputation!==undefined&&next.reputation!==r.reputation){patch.reputation=next.reputation;before.reputation=r.reputation}
  if(next.positions&&!same(next.positions,r.positions)){patch.positions=next.positions;before.positions=r.positions}
  if(next.name!==undefined&&next.name!==r.name){patch.name=next.name;before.name=r.name}
  if(!Object.keys(patch).length){setScore(String(r.rating));setRep(String(r.reputation));return}
  setQ({state:'saving'})
  const res=await call<{row:Row}>(`/api/master/players/${encodeURIComponent(r.club)}/${encodeURIComponent(r.id)}`,{method:'POST',body:JSON.stringify({action:'quick',patch,expectedRev:r.rev,confirmQuota:o.confirmQuota===true,confirmName:o.confirmName===true||patch.name!==undefined&&o.isUndo===true})})
  if(res.ok){setR(res.data.row);setScore(String(res.data.row.rating));setRep(String(res.data.row.reputation));setNameDraft(res.data.row.name);setPanel(null);setSure(false);setQ({state:'saved',undo:o.isUndo?null:before});return}
  setScore(String(r.rating));setRep(String(r.reputation))
  const msg=res.status===401?'Your session ended. Sign in again.':res.status===409?'Someone changed this player a moment ago. Reload the page and try again.':res.data.error||'Not saved.'
  setQ({state:'error',msg:res.status===422&&/ladder/i.test(msg)?`${msg.replace(' Confirm to publish it as an exception.','')} ${ladderLine(res.data.detail)}`.trim():msg,retry:res.status===422&&/ladder/i.test(msg)?next:undefined})
 }
 const step=(key:'rating'|'reputation',d:number)=>{const cur=key==='rating'?score:rep,set=key==='rating'?setScore:setRep,base=key==='rating'?r.rating:r.reputation
  const n=Math.min(99,Math.max(40,(Number(cur)||base)+d));set(String(n));const t=timers.current[key];if(t)clearTimeout(t);timers.current[key]=setTimeout(()=>void save({[key]:n}),700)}
 const commit=(key:'rating'|'reputation')=>{const t=timers.current[key];if(t){clearTimeout(t);timers.current[key]=null}const v=key==='rating'?score:rep,n=Math.round(Number(v));if(!Number.isFinite(n)||n<40||n>99){setScore(String(r.rating));setRep(String(r.reputation));setQ({state:'error',msg:`The ${key==='rating'?'score':'reputation'} is a whole number from 40 to 99.`});return}void save({[key]:n})}
 const keys=(key:'rating'|'reputation')=>({onKeyDown:(e:React.KeyboardEvent<HTMLInputElement>)=>{if(e.key==='Enter')(e.target as HTMLInputElement).blur();if(e.key==='Escape'){setScore(String(r.rating));setRep(String(r.reputation));(e.target as HTMLInputElement).blur()}},onBlur:()=>commit(key)})
 const togglePos=(p:Pos)=>void save({positions:r.positions.includes(p)?r.positions.filter(x=>x!==p):[...r.positions,p]})
 const makePrimary=(p:Pos)=>void save({positions:[p,...r.positions.filter(x=>x!==p)]})
 const stepper=(key:'rating'|'reputation',label:string,val:string,setVal:(s:string)=>void,base:number,now:number)=><span className="pcc-step-line"><small className="pcc-step-label">{label}</small>
   <span className="pcc-step"><button type="button" className="min-h-tap" aria-label={`Lower the ${label.toLowerCase()} of ${r.name}`} disabled={frozen||q.state==='saving'||Number(val)<=40} onClick={()=>step(key,-1)}>−</button>
    <input className="pcc-inline" type="number" inputMode="numeric" min={40} max={99} step={1} aria-label={`${label} of ${r.name}`} value={val} disabled={frozen||q.state==='saving'} onChange={e=>setVal(e.target.value)} {...keys(key)}/>
    <button type="button" className="min-h-tap" aria-label={`Raise the ${label.toLowerCase()} of ${r.name}`} disabled={frozen||q.state==='saving'||Number(val)>=99} onClick={()=>step(key,1)}>+</button></span>
   {now!==base&&<small>was {base}</small>}</span>
 return <div className="pcc-row" role="row" data-removed={r.removed||undefined} data-wave={r.wave||undefined} data-q={q.state} data-chosen={chosen||undefined}>
  <span role="cell" className="pcc-name">
   <label className="pcc-pick min-h-tap"><input type="checkbox" checked={chosen} disabled={frozen} onChange={e=>onChoose(r,e.target.checked)} aria-label={`Choose ${r.name}`}/><b dir="auto">{r.name}</b></label>
   {r.name!==r.baseName&&<small dir="auto">archive: {r.baseName}</small>}{r.nameOriginal!==r.name&&r.nameOriginal!==r.baseName&&<small dir="auto">{r.nameOriginal}</small>}{showClub&&<small>{r.clubName}</small>}
   {!frozen&&<button type="button" className="min-h-tap pcc-link" onClick={()=>{setPanel(panel==='name'?null:'name');setSure(false);setNameDraft(r.name)}}>Rename</button>}
   {panel==='name'&&<span className="pcc-pop" role="group" aria-label={`Rename ${r.name}`}>
    <input type="text" className="pcc-inline pcc-nameinput" dir="auto" value={nameDraft} maxLength={80} aria-label="New name" onChange={e=>{setNameDraft(e.target.value);setSure(false)}}/>
    {!sure?<><button type="button" className="min-h-tap desk-btn ghost" disabled={!nameDraft.trim()||nameDraft.trim()===r.name} onClick={()=>setSure(true)}>Rename…</button><button type="button" className="min-h-tap pcc-link" onClick={()=>setPanel(null)}>Cancel</button></>
     :<span className="pcc-sure" role="alert"><b>Are you sure?</b> “{r.name}” becomes “{nameDraft.trim().replace(/\s+/g,' ')}” in every game and page. The old spelling is kept as an alias.
      <button type="button" className="min-h-tap desk-btn" onClick={()=>void save({name:nameDraft.trim().replace(/\s+/g,' ')},{confirmName:true})}>Yes, rename</button><button type="button" className="min-h-tap pcc-link" onClick={()=>setSure(false)}>No</button></span>}</span>}
  </span>
  <span role="cell" className="pcc-years">{r.fromYear??'—'}{r.toYear&&r.toYear!==r.fromYear?`–${r.toYear}`:''}</span>
  <span role="cell" className="pcc-pos">{r.positions.length?r.positions.map((p,i)=><i key={p} data-primary={i===0}>{p}</i>):<em title="No position on record: dealt into any outfield slot">unknown</em>}
   {!frozen&&<button type="button" className="min-h-tap pcc-link" aria-expanded={panel==='pos'} aria-label={`Change the positions of ${r.name}`} onClick={()=>setPanel(panel==='pos'?null:'pos')}>{r.positions.length?'Change':'Add'}</button>}
   {panel==='pos'&&<span className="pcc-pop" role="group" aria-label={`Positions of ${r.name}`}>{POS.map(p=>{const on=r.positions.includes(p),prim=r.positions[0]===p;return <span key={p} className="pcc-posrow"><label className="min-h-tap"><input type="checkbox" checked={on} disabled={q.state==='saving'} onChange={()=>togglePos(p)}/> {p}</label>{on&&!prim&&<button type="button" className="min-h-tap pcc-link" onClick={()=>makePrimary(p)}>make main</button>}{prim&&<small>main</small>}</span>})}
    <button type="button" className="min-h-tap pcc-link" onClick={()=>setPanel(null)}>Done</button></span>}
  </span>
  <span role="cell" className="pcc-price">
   <select className="pcc-inline min-h-tap" aria-label={`Price of ${r.name}`} value={r.price} disabled={frozen||q.state==='saving'} onChange={e=>void save({price:Number(e.target.value)})}>{[1,2,3,4,5].map(p=><option key={p} value={p}>€{p}M</option>)}</select>
   {r.locked?<small title={r.lockReason}>was locked — open to you</small>:null}{r.price!==r.basePrice?<small>list €{r.basePrice}M</small>:r.priceSource==='fallback'?<small data-warn>not in list</small>:null}
  </span>
  <span role="cell" className="pcc-score">{stepper('rating','Score',score,setScore,r.baseRating,r.rating)}{stepper('reputation','Rep.',rep,setRep,r.baseReputation,r.reputation)}</span>
  <span role="cell" className="pcc-badges">{r.removed&&<i data-k="removed">removed</i>}{r.locked&&<i data-k="locked" title={r.lockReason}>pinned</i>}{r.draft&&<i data-k="draft">draft</i>}{r.overridden.length>0&&!r.removed&&<i data-k="edited">edited</i>}{r.wave&&<i data-k="wave">wave</i>}{r.updatedAt&&<small>{r.updatedAt.slice(0,10)}</small>}</span>
  <span role="cell"><button type="button" className="min-h-tap desk-btn ghost pcc-edit" onClick={onOpen} aria-label={`Edit ${r.name}`}>Edit</button></span>
  {q.state!=='idle'&&<p className="pcc-qnote" role={q.state==='error'?'alert':'status'} data-state={q.state}>
   {q.state==='saving'?'Saving…':q.state==='saved'?<>Saved ✓ — every game uses it now.{q.undo&&<button type="button" className="min-h-tap pcc-link" onClick={()=>void save(q.undo!,{isUndo:true})}>Undo</button>}<button type="button" className="min-h-tap pcc-link" onClick={()=>setQ({state:'idle'})}>OK</button></>
    :<>{q.msg}{q.retry&&<button type="button" className="min-h-tap pcc-link" onClick={()=>void save(q.retry!,{confirmQuota:true})}>Save anyway</button>}<button type="button" className="min-h-tap pcc-link" onClick={()=>setQ({state:'idle'})}>Cancel</button></>}
  </p>}
 </div>
}
/**
 * Several men at once (owner, 13.10.2026). Tick the men — one by one, or "this page" — then give them all one price, or one more position.
 * The server judges the whole batch (stale rows, games that would stop, the price ladder) and writes it as one revision or not at all.
 */
function ManyBar({chosen,latest,allOnPage,onAllOnPage,onClear,onDone}:{chosen:string[];latest:{current:Map<string,Row>};allOnPage:boolean;onAllOnPage:(on:boolean)=>void;onClear:()=>void;onDone:()=>void}){
 const [price,setPrice]=useState('3'),[pos,setPos]=useState<Pos>('DF'),[state,setState]=useState<{kind:'idle'}|{kind:'busy'}|{kind:'ok';text:string}|{kind:'err';text:string;retry?:Record<string,unknown>}>({kind:'idle'})
 const n=chosen.length
 const run=async(change:Record<string,unknown>,confirmQuota=false)=>{
  const items=chosen.map(k=>latest.current.get(k)).filter((r):r is Row=>!!r).map(r=>({club:r.club,id:r.id,expectedRev:r.rev}))
  setState({kind:'busy'})
  const res=await call<{changed:number;unchanged:number;skipped:number}>('/api/master/players/many',{method:'POST',body:JSON.stringify({items,change,confirmQuota})})
  if(res.ok){setState({kind:'ok',text:`Saved ✓ — ${res.data.changed} changed${res.data.unchanged?`, ${res.data.unchanged} already so`:''}${res.data.skipped?`, ${res.data.skipped} skipped (removed or merged)`:''}.`});onDone();return}
  const msg=res.status===401?'Your session ended. Sign in again.':res.data.error||'Not saved.'
  setState({kind:'err',text:msg.replace(' Confirm to publish it as an exception.',''),retry:res.status===422&&/ladder/i.test(msg)?change:undefined})
 }
 return <section className="pcc-many" aria-label="Choose several players" data-active={n>0||undefined}>
  <label className="min-h-tap"><input type="checkbox" checked={allOnPage} onChange={e=>onAllOnPage(e.target.checked)}/> Choose everyone on this page</label>
  {n>0&&<>
   <b className="tabular-nums" role="status">{n} chosen</b>
   <label>Price<select value={price} onChange={e=>setPrice(e.target.value)}>{[1,2,3,4,5].map(p=><option key={p} value={p}>€{p}M</option>)}</select></label>
   <button type="button" className="min-h-tap desk-btn" disabled={state.kind==='busy'} onClick={()=>void run({price:Number(price)})}>Set price for {n}</button>
   <label>Add position<select value={pos} onChange={e=>setPos(e.target.value as Pos)}>{POS.map(p=><option key={p} value={p}>{p}</option>)}</select></label>
   <button type="button" className="min-h-tap desk-btn ghost" disabled={state.kind==='busy'} onClick={()=>void run({addPosition:pos})}>Add to {n}</button>
   <button type="button" className="min-h-tap pcc-link" onClick={()=>{onClear();setState({kind:'idle'})}}>Clear choice</button></>}
  {state.kind==='busy'&&<p role="status">Saving…</p>}
  {state.kind==='ok'&&<p role="status" data-state="ok">{state.text}</p>}
  {state.kind==='err'&&<p role="alert" data-state="error">{state.text}{state.retry&&<button type="button" className="min-h-tap pcc-link" onClick={()=>void run(state.retry!,true)}>Save anyway</button>}</p>}
 </section>
}
/** the server's ladder detail, said in one line: "€3M would have 41 men; the ladder wants 40." */
function ladderLine(detail:unknown):string{
 const d=detail as Impact|undefined;if(!d||!d.quota)return ''
 const off=[5,4,3,2,1].filter(p=>d.quota.have[p]!==d.quota.want[p]).map(p=>`€${p}M would have ${d.quota.have[p]} men (the ladder wants ${d.quota.want[p]})`)
 return off.length?off.join('; ')+'.':''
}

function Drawer({club,id,onClose,onChanged}:{club:string;id:string;onClose:()=>void;onChanged:()=>void}){
 const [d,setD]=useState<Detail|null>(null),[err,setErr]=useState<string|null>(null),[note,setNote]=useState<string|null>(null),[working,setWorking]=useState(false)
 const [positions,setPositions]=useState<Pos[]>([]),[price,setPrice]=useState(1),[rating,setRating]=useState(60),[reputation,setReputation]=useState(60),[removed,setRemoved]=useState(false),[reason,setReason]=useState(''),[comment,setComment]=useState('')
 const [impact,setImpact]=useState<Impact|null>(null),[okQuota,setOkQuota]=useState(false),[okOwner,setOkOwner]=useState(false),[okRemove,setOkRemove]=useState(false)
 const closeRef=useRef<HTMLButtonElement>(null),ready=!!d
 const load=useCallback(async()=>{const r=await call<Detail>(`/api/master/players/${encodeURIComponent(club)}/${encodeURIComponent(id)}`);if(!r.ok){setErr(r.data.error||'Could not load this player.');return}
  const x=r.data,eff=x.row,p=x.draft?.patch||{};setD(x)
  setPositions((p.positions as Pos[]|undefined)??eff.positions);setPrice((p.price as number|undefined)??eff.price);setRating((p.rating as number|undefined)??eff.rating);setReputation((p.reputation as number|undefined)??eff.reputation);setRemoved((p.removed as boolean|undefined)??eff.removed);setComment((p.note as string|undefined)??eff.note);setImpact(null)},[club,id])
 useEffect(()=>{void load()},[load]); useEffect(()=>{if(ready)closeRef.current?.focus()},[ready])
 const patch=useMemo(()=>{
  if(!d)return {};const b=d.base,o:Record<string,unknown>={}
  o.price=price===b.basePrice?null:price
  o.positions=same(positions,b.basePositions)?null:positions
  o.rating=rating===b.baseRating?null:rating
  o.reputation=reputation===d.row.baseReputation?null:reputation
  o.removed=removed?true:null
  o.note=comment.trim()?comment.trim():null
  return o},[d,price,positions,rating,reputation,removed,comment])
 const dirty=useMemo(()=>{if(!d)return false;const e=d.row;return !same(positions,e.positions)||price!==e.price||rating!==e.rating||reputation!==e.reputation||removed!==e.removed||comment.trim()!==(e.note||'')},[d,positions,price,rating,reputation,removed,comment])
 // CRM 1 §6: closing a dirty form asks first; Tab stays inside the dialog; focus returns to the row that opened it
 const dialog=useRef<HTMLElement>(null),opener=useRef<Element|null>(typeof document!=='undefined'?document.activeElement:null)
 const close=useCallback(()=>{if(dirty&&!window.confirm('You have changes that are not saved or published. Close and discard them?'))return;onClose();const o=opener.current as HTMLElement|null;if(o&&typeof o.focus==='function')requestAnimationFrame(()=>o.focus())},[dirty,onClose])
 useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key!=='Tab'||!dialog.current)return;const f=[...dialog.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x=>x.offsetParent!==null);if(!f.length)return;const first=f[0]!,last=f[f.length-1]!;if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}};document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h)},[])
 useEffect(()=>{const prev=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=prev}},[])
 useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key==='Escape')close()};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[close])
 const togglePos=(p:Pos)=>setPositions(cur=>cur.includes(p)?cur.filter(x=>x!==p):[...cur,p])
 const makePrimary=(p:Pos)=>setPositions(cur=>[p,...cur.filter(x=>x!==p)])
 const act=async(action:string,extra:Record<string,unknown>={})=>{setWorking(true);setErr(null);setNote(null)
  const r=await call<Record<string,unknown>>(`/api/master/players/${encodeURIComponent(club)}/${encodeURIComponent(id)}`,{method:'POST',body:JSON.stringify({action,...extra})});setWorking(false);return r}
 const preview=async()=>{const r=await act('preview',{patch});if(r.ok)setImpact((r.data as {impact:Impact}).impact);else setErr(r.data.error||'Preview failed.')}
 const saveDraft=async()=>{const r=await act('draft',{patch,expectedRev:d!.row.rev});if(r.ok){setNote('Draft saved. The games still use the published values.');await load();onChanged()}else setErr(r.data.error||'The draft was not saved.')}
 const publish=async()=>{
  if(removed&&!d!.row.removed&&!okRemove){setErr('Tick the box to confirm removing this man from the squad.');return}
  const r=await act('publish',{patch,expectedRev:d!.row.rev,reason,confirmQuota:okQuota,ownerException:true})
  if(r.ok){setNote(`Published as revision ${(r.data as {revision:number}).revision}. Every game reads it now.`);setReason('');setOkQuota(false);setOkOwner(false);setOkRemove(false);await load();onChanged()}
  else{setErr(r.data.error||'Not published.');const dt=r.data.detail as Impact|undefined;if(dt&&'quota' in dt)setImpact(dt)}}
 const discard=async()=>{const r=await act('discard');if(r.ok){setNote('Draft discarded.');await load();onChanged()}else setErr(r.data.error||'Could not discard.')}
 const revert=async(eventId:string)=>{const r=await act('revert',{eventId,reason:reason||'reverted from the desk'});if(r.ok){setNote('Reverted — recorded as a new change.');await load();onChanged()}else setErr(r.data.error||'Could not revert.')}
 const e=d?.row
 // the desk body is its own stacking layer (z 1) beneath the top bar and the tab bar, so the drawer is lifted to the desk root, where a dialog belongs (rule 33)
 const host=typeof document!=='undefined'?(document.querySelector('.desk') as HTMLElement|null)??document.body:null
 if(!host)return null
 return createPortal(<div className="pcc-overlay" role="presentation" onMouseDown={ev=>{if(ev.target===ev.currentTarget)close()}}>
  <aside ref={dialog} className="pcc-drawer z-[60]" role="dialog" aria-modal="true" aria-label={e?`Edit ${e.name}`:'Edit player'}>
   <header><div><p className="desk-kicker">{e?.clubName}</p><h2 dir="auto">{e?.name??'Loading…'}</h2>{e&&e.nameOriginal!==e.name&&<p dir="auto" className="pcc-orig">{e.nameOriginal}</p>}</div><button ref={closeRef} type="button" className="desk-btn ghost" onClick={close} aria-label="Close">Close ✕</button></header>
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
    <label className="pcc-field"><span>Reputation <small>(how well known he is · {d.row.baseReputation} on file · the Legends stars blend it with the score)</small></span><input type="number" min={40} max={99} step={1} value={reputation} onChange={ev=>setReputation(Math.round(Number(ev.target.value)||0))}/></label>
    <label className="pcc-field"><span>Note</span><textarea rows={2} maxLength={500} value={comment} onChange={ev=>setComment(ev.target.value)} placeholder="Why, or what you checked"/></label>
    <label className="pcc-remove"><input type="checkbox" checked={removed} onChange={ev=>{setRemoved(ev.target.checked);setOkRemove(false)}}/> <span>Remove him from the squad <small>— a mistake in the archive. Reversible; it never deletes the record.</small></span></label>
    {removed&&!e.removed&&<label className="pcc-remove"><input type="checkbox" checked={okRemove} onChange={ev=>setOkRemove(ev.target.checked)}/> <span>I confirm: take {e.name} out of every game.</span></label>}
    {impact&&<section className="pcc-impact" aria-live="polite" data-ok={impact.quota.ok&&!impact.readiness.broke.length}>
     <h3>What this does</h3>
     <p>Reaches: {impact.consumers.length?impact.consumers.join(' · '):'no game (a note only)'}.</p>
     <p>Price ladder: {impact.quota.ok?'still on the ladder.':<>off the ladder — {impact.quota.violations.join('; ')}.</>}</p>
     {impact.readiness.broke.length>0?<p data-warn>Would stop a game working: {impact.readiness.broke.join('; ')}</p>:<p>Every game that is ready now stays ready.</p>}
     {!impact.quota.ok&&<label><input type="checkbox" checked={okQuota} onChange={ev=>setOkQuota(ev.target.checked)}/> Publish as an exception to the ladder</label>}
     {impact.lockedChange&&<p className="pcc-hint">This price was pinned. You may change it; the history will say so.</p>}
    </section>}
    <label className="pcc-field"><span>Reason <small>(required to publish; kept in the history)</small></span><input type="text" value={reason} onChange={ev=>setReason(ev.target.value)} placeholder="e.g. played in midfield for three seasons — Celtic Wiki"/></label>
    <p className="pcc-hint" role="status">{reason.trim().length<3?(dirty||d.draft?'To publish: write a short reason above. Publishing sends this change to every game.':'Change a field to enable Publish.'):'Ready — Publish sends this change to every game now.'}</p>
    <div className="pcc-actions pcc-sticky"><button type="button" className="desk-btn ghost" disabled={working||!dirty} onClick={preview}>Preview impact</button><button type="button" className="desk-btn ghost" disabled={working||!dirty} onClick={saveDraft}>Save draft</button><button type="button" className="min-h-tap desk-btn" disabled={working||(!dirty&&!d.draft)||reason.trim().length<3} onClick={publish}>Publish</button>{d.draft&&<button type="button" className="desk-btn ghost" disabled={working} onClick={discard}>Discard draft</button>}</div>
    {(d.absorbed?.length??0)>0&&<p className="pcc-hint" data-testid="absorbed">Also carries (merged in, still on file): {d.absorbed!.map(a=>`${a.name} (${a.years})`).join(' · ')}</p>}
    {d.row.mergedInto&&<p className="pcc-hint">Merged into <code>{d.row.mergedInto}</code> — he no longer appears in any game. <button type="button" className="min-h-tap pcc-link" disabled={working||reason.trim().length<3} onClick={async()=>{const r=await act('unmerge',{reason});if(r.ok){setNote('Merge undone — he is back in the squad.');await load();onChanged()}else setErr(r.data.error||'Failed.')}}>Undo merge (needs a reason above)</button></p>}
    {d.draft&&<p className="pcc-hint">A draft by {d.draft.by} is waiting — invisible to the games until published.</p>}
    <section className="pcc-history"><h3>History</h3>{d.audit.length?<ol>{d.audit.map(a=><li key={a.id}><b>{a.action}</b> · {a.actor} · <time dateTime={a.at}>{a.at.slice(0,16).replace('T',' ')}</time><small>{a.reason}</small>{a.action==='publish'&&<button type="button" className="pcc-link" disabled={working} onClick={()=>revert(a.id)}>Revert this change</button>}</li>)}</ol>:<p className="pcc-hint">No changes yet — every value is the archive’s.</p>}</section>
   </>}
  </aside>
 </div>,host)
}
