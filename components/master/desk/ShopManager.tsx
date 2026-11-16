'use client'
import {useEffect,useMemo,useState,type ReactNode} from 'react'
import {KIND_SPECS} from '@/lib/shop/kinds'
import {designKey,inClub,madeInPrintify,shelfOf,KINDS,MIN_QUALITY,qualityOf,type Kind,type Shelf,type ShopDoc,type ShopProduct} from '@/lib/shop/types'

/**
 * THE PRODUCT MANAGER (owner, 15.11.2026: "adding a product more conveniently, smarter and easier editing, order and
 * organisation"). One searchable, filterable list of every product, the way a shop admin works:
 *  · search by name, club, type; filter by club, category, state (shown / hidden / not on sale / soft / on sale / fan favourite);
 *    sort by newest, name, price, sharpness, sold; list every product or one row per design;
 *  · tick rows (or "select all") → one bar for the lot: show, hide, a category in or out, re-read from Printify, press, delete;
 *  · a row opens the editor beside the list: name and description (sent to Printify), categories, the first picture of the
 *    product (any of its mock-ups), the print, and "the same design on more products".
 * Nothing here talks to Printify by itself: every change goes through the desk's own actions (app/api/master/shop).
 */
type Subject={id:string;name:string}
type Act=(action:string,data?:Record<string,unknown>,msg?:string)=>Promise<unknown>
type Sort='new'|'name'|'price'|'sharp'|'sold'
type State='all'|'shown'|'hidden'|'todo'|'soft'|'sale'|'fav'
const CAT_L:Record<Shelf,string>={wear:'Clothing',wall:'Wall art',gear:'Matchday gear',home:'Home & mugs',kids:'Kids',small:'Gifts & small things'}
const SHELVES=Object.keys(CAT_L) as Shelf[]
const STATUS:Record<ShopProduct['status'],string>={draft:'Draft',building:'Pressing…',ready:'Made — waiting for its link',live:'On sale',error:'Needs a retry'}
const money=(c:number,cur:string)=>new Intl.NumberFormat('en',{style:'currency',currency:cur}).format(c/100)
const BASIC=KINDS.filter(k=>k!=='more')
const thumbOf=(p:ShopProduct)=>p.printify?.images[0]||('library' in p.art?`https://drive.google.com/thumbnail?id=${p.art.library.id}&sz=w200`:p.art.upload.preview)
const typeOf=(p:ShopProduct)=>p.kind==='more'?(p.blueprint?.title??'Catalogue product'):KIND_SPECS[p.kind].label
/** a supporter's personal print (14.11.2026) is not the owner's to manage */
const isPersonal=(p:ShopProduct)=>!!(p as {personal?:boolean}).personal
const camera=(src:string)=>/camera_label=([a-z0-9-]+)/i.exec(src)?.[1]??'picture'

export function ShopManager({doc,subjects,act,busy,connected,running,press,sync,featured,onFeature,printEditor}:{doc:ShopDoc;subjects:Subject[];act:Act;busy:boolean;connected:boolean;running:boolean
 press:(ids:string[])=>Promise<void>;sync:(ids:string[])=>Promise<void>;featured:string[];onFeature:(design:string,on:boolean)=>void;printEditor:(p:ShopProduct)=>ReactNode}){
 const [q,setQ]=useState(''),[who,setWho]=useState('all'),[cat,setCat]=useState<'all'|Shelf>('all'),[state,setState]=useState<State>('all'),[sort,setSort]=useState<Sort>('new'),[byDesign,setByDesign]=useState(false)
 const [sel,setSel]=useState<Set<string>>(new Set()),[open,setOpen]=useState<string|null>(null),[pane,setPane]=useState<'details'|'pictures'|'print'|'more'>('details')
 const name=(id:string)=>subjects.find(x=>x.id===id)?.name||(id==='fanlife'?'FAN LIFE':id)
 const clubList=[{id:'fanlife',name:'FAN LIFE'},...subjects.filter(s=>s.id!=='fanlife')]
 const onSale=new Set(doc.products.filter(p=>p.printify?.sale?.percent).map(p=>p.id))
 const list=useMemo(()=>{const t=q.trim().toLowerCase()
  const l=doc.products.filter(p=>!isPersonal(p)).filter(p=>(who==='all'||inClub(p,who))&&(cat==='all'||shelfOf(p.kind,p.blueprint?.title)===cat||(p.shelves??[]).includes(cat))
   &&(state==='all'||(state==='shown'?p.visible&&p.status==='live':state==='hidden'?!p.visible&&p.status==='live':state==='todo'?p.status!=='live':state==='soft'?qualityOf(p)<.5:state==='sale'?onSale.has(p.id):featured.includes(designKey(p))))
   &&(!t||`${p.title} ${[p.subject,...(p.clubs??[])].map(name).join(' ')} ${typeOf(p)} ${p.description}`.toLowerCase().includes(t)))
  const price=(p:ShopProduct)=>p.printify?.priceFrom??0
  l.sort((a,b)=>sort==='name'?a.title.localeCompare(b.title):sort==='price'?price(a)-price(b):sort==='sharp'?qualityOf(b)-qualityOf(a):sort==='sold'?(b.sold??0)-(a.sold??0):b.createdAt.localeCompare(a.createdAt))
  if(!byDesign)return l
  const seen=new Set<string>();return l.filter(p=>{const k=designKey(p);if(seen.has(k))return false;seen.add(k);return true})
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[doc.products,q,who,cat,state,sort,byDesign,featured])
 const siblings=(p:ShopProduct)=>doc.products.filter(x=>designKey(x)===designKey(p))
 const rowIds=(p:ShopProduct)=>byDesign?siblings(p).map(x=>x.id):[p.id]
 useEffect(()=>{setSel(new Set())},[q,who,cat,state,byDesign])
 const allIds=list.flatMap(rowIds),picked=[...sel],every=allIds.length>0&&allIds.every(id=>sel.has(id))
 const tick=(ids:string[],on:boolean)=>setSel(s=>{const n=new Set(s);for(const id of ids)on?n.add(id):n.delete(id);return n})
 const pickedP=doc.products.filter(p=>sel.has(p.id)),live=pickedP.filter(p=>p.status==='live'),notLive=pickedP.filter(p=>p.status!=='live'&&!madeInPrintify(p))
 const cur=open?doc.products.find(p=>p.id===open)??null:null
 const counts=(s:State)=>doc.products.filter(p=>!isPersonal(p)).filter(p=>s==='shown'?p.visible&&p.status==='live':s==='hidden'?!p.visible&&p.status==='live':s==='todo'?p.status!=='live':s==='soft'?qualityOf(p)<.5:s==='sale'?onSale.has(p.id):s==='fav'?featured.includes(designKey(p)):true).length
 return <section className="desk-card shopm" aria-labelledby="shm-h">
  <div className="shopm-head"><h2 className="desk-h2" id="shm-h">Products</h2>
   <button type="button" className="desk-btn ghost min-h-tap" disabled={busy||!connected} title="Products made straight in Printify join the desk" onClick={()=>act('import',{},'Printify read — anything made there is now here too.')}>Bring in from Printify</button></div>
  <div className="shopm-bar" role="search">
   <input className="shopm-q" type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name, club or type" aria-label="Search products"/>
   <label className="shopm-f"><span>Club</span><select value={who} onChange={e=>setWho(e.target.value)}><option value="all">All clubs</option>{[{id:'fanlife',name:'FAN LIFE'},...subjects.filter(s=>s.id!=='fanlife')].map(s=><option key={s.id} value={s.id}>{s.name} · {doc.products.filter(p=>inClub(p,s.id)&&!isPersonal(p)).length}</option>)}</select></label>
   <label className="shopm-f"><span>Category</span><select value={cat} onChange={e=>setCat(e.target.value as 'all'|Shelf)}><option value="all">All categories</option>{SHELVES.map(c=><option key={c} value={c}>{CAT_L[c]}</option>)}</select></label>
   <label className="shopm-f"><span>Sort</span><select value={sort} onChange={e=>setSort(e.target.value as Sort)}><option value="new">Newest</option><option value="name">Name</option><option value="price">Price</option><option value="sharp">Sharpest</option><option value="sold">Best selling</option></select></label>
  </div>
  <div className="desk-chips shopm-states" role="group" aria-label="Show">{([['all','All'],['shown','In the shop'],['hidden','Made, hidden'],['todo','Not on sale'],['soft','Soft print'],['sale','On sale'],['fav','Fan favourites']] as [State,string][]).map(([k,l])=>
   <button key={k} type="button" className="desk-chip min-h-tap" aria-pressed={state===k} aria-current={state===k} onClick={()=>setState(k)}>{l} · {counts(k)}</button>)}
   <label className="shop-switch shopm-group"><input type="checkbox" checked={byDesign} onChange={e=>setByDesign(e.target.checked)}/><span>One row per design</span></label></div>
  <div className="shopm-sel" aria-live="polite">
   <label className="shop-switch"><input type="checkbox" checked={every} onChange={e=>tick(allIds,e.target.checked)} aria-label="Select all shown"/><span>{picked.length?`${picked.length} selected`:`Select all ${allIds.length}`}</span></label>
   {picked.length>0&&<div className="shopm-actions">
    <button type="button" className="desk-btn min-h-tap" disabled={busy||!live.length} onClick={()=>act('visible',{ids:live.filter(p=>qualityOf(p)>=MIN_QUALITY).map(p=>p.id),visible:true},'Shown in the shop.')}>Show</button>
    <button type="button" className="desk-btn ghost min-h-tap" disabled={busy} onClick={()=>act('visible',{ids:picked,visible:false},'Hidden from the shop.')}>Hide</button>
    <label className="shopm-f inline"><span className="sr-only">Add to a category</span><select value="" disabled={busy} onChange={e=>{const v=e.target.value;if(!v)return;const [op,c]=v.split(':');void act('shelvesAdd',{ids:picked,shelf:c,off:op==='out'},op==='out'?'Taken out of the category.':'Added to the category.')}}>
     <option value="">Category…</option>{SHELVES.map(c=><option key={c} value={`in:${c}`}>Add to {CAT_L[c]}</option>)}{SHELVES.map(c=><option key={'o'+c} value={`out:${c}`}>Take out of {CAT_L[c]}</option>)}</select></label>
    <label className="shopm-f inline"><span className="sr-only">Clubs</span><select value="" disabled={busy} onChange={e=>{const v=e.target.value;if(!v)return;const [op,c]=v.split(':')
     void act('clubs',op==='own'?{ids:picked,subject:c}:op==='out'?{ids:picked,off:c}:{ids:picked,add:c},op==='own'?`Now ${name(c!)}'s own.`:op==='out'?`Taken out of ${name(c!)}.`:`Added to ${name(c!)}.`)}}>
     <option value="">Club…</option>{clubList.map(s=><option key={'a'+s.id} value={`in:${s.id}`}>Add to {s.name}</option>)}{clubList.map(s=><option key={'w'+s.id} value={`own:${s.id}`}>{`Make it ${s.name}'s own`}</option>)}{clubList.map(s=><option key={'o'+s.id} value={`out:${s.id}`}>Take out of {s.name}</option>)}</select></label>
    <button type="button" className="desk-btn ghost min-h-tap" disabled={busy||running||!connected} onClick={()=>sync(pickedP.filter(p=>p.printify).map(p=>p.id))}>Rewrite listings</button>
    {notLive.length>0&&<button type="button" className="desk-btn ghost min-h-tap" disabled={busy||running||!connected} onClick={()=>press(notLive.map(p=>p.id))}>Press {notLive.length}</button>}
    <button type="button" className="desk-btn ghost min-h-tap shopm-danger" disabled={busy||running} onClick={async()=>{if(!window.confirm(`Delete ${picked.length} product(s) here and in Printify? This cannot be undone.`))return;for(const id of picked)await act('remove',{id},'');setSel(new Set())}}>Delete</button>
    <button type="button" className="desk-btn ghost min-h-tap" onClick={()=>setSel(new Set())}>Clear</button>
   </div>}
  </div>
  <div className="shopm-body" data-open={cur?'1':undefined}>
   {list.length===0?<p className="desk-state">Nothing matches. Clear the search or a filter.</p>:
   <ul className="shopm-list">{list.map(p=>{const ids=rowIds(p),on=ids.every(id=>sel.has(id)),q2=qualityOf(p),fam=byDesign?siblings(p):[p]
    return <li key={p.id} className="shopm-row" data-status={p.status} data-active={open===p.id?'1':undefined}>
     <input type="checkbox" className="shopm-tick" checked={on} onChange={e=>tick(ids,e.target.checked)} aria-label={`Select ${p.title}`}/>
     <button type="button" className="shopm-open" onClick={()=>{setOpen(open===p.id?null:p.id);setPane('details')}} aria-expanded={open===p.id}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumbOf(p)} alt="" width={56} height={56} loading="lazy" referrerPolicy="no-referrer"/>
      <span className="shopm-t"><b>{byDesign?(doc.settings.designNames?.[designKey(p)]??p.title.split(' · ')[0]):p.title}</b>
       <small>{name(p.subject)}{p.clubs?.length?` +${p.clubs.length}`:''} · {byDesign?`${fam.length} products · ${fam.filter(x=>x.visible&&x.status==='live').length} shown`:typeOf(p)}{p.printify?` · ${money(p.printify.priceFrom,p.printify.currency)}`:''}{p.sold?` · ${p.sold} sold`:''}</small>
       <span className="shopm-tags">{p.status!=='live'?<i data-k="todo">{STATUS[p.status]}</i>:p.visible?<i data-k="on">In the shop</i>:<i data-k="off">Hidden</i>}{q2<MIN_QUALITY?<i data-k="bad">Too soft</i>:q2<.5?<i data-k="soft">Soft · {Math.round(q2*100)}%</i>:null}{onSale.has(p.id)?<i data-k="sale">Sale</i>:null}{featured.includes(designKey(p))?<i data-k="fav">★ Favourite</i>:null}</span></span>
     </button>
     {!byDesign&&<label className="shop-switch shopm-vis"><input type="checkbox" checked={p.visible} disabled={busy||p.status!=='live'} onChange={e=>act('visible',{id:p.id,visible:e.target.checked},e.target.checked?'Shown in the shop.':'Hidden from the shop.')}/><span>Shown</span></label>}
    </li>})}</ul>}
   {cur&&<Editor key={cur.id} p={cur} doc={doc} clubs={clubList} pane={pane} setPane={setPane} act={act} busy={busy} connected={connected} running={running} press={press} name={name}
     fav={featured.includes(designKey(cur))} onFeature={on=>onFeature(designKey(cur),on)} onClose={()=>setOpen(null)} printEditor={printEditor}/>}
  </div>
 </section>
}

function Editor({p,doc,clubs,pane,setPane,act,busy,connected,running,press,name,fav,onFeature,onClose,printEditor}:{p:ShopProduct;doc:ShopDoc;pane:'details'|'pictures'|'print'|'more';setPane:(x:'details'|'pictures'|'print'|'more')=>void
 act:Act;busy:boolean;connected:boolean;running:boolean;press:(ids:string[])=>Promise<void>;name:(id:string)=>string;fav:boolean;onFeature:(on:boolean)=>void;onClose:()=>void;printEditor:(p:ShopProduct)=>ReactNode;clubs:Subject[]}){
 const [title,setTitle]=useState(p.title),[desc,setDesc]=useState(p.description),[more,setMore]=useState<Kind[]>([])
 const made=madeInPrintify(p),own=shelfOf(p.kind,p.blueprint?.title),family=doc.products.filter(x=>designKey(x)===designKey(p)),have=new Set(family.map(x=>x.kind))
 const pics=[...new Set([...(p.printify?.images??[]),...(p.printify?.backImage?[p.printify.backImage]:[])])]
 const dirty=title.trim()!==p.title||desc.trim()!==p.description
 return <aside className="shopm-ed" aria-label={`Edit ${p.title}`}>
  <header className="shopm-edh"><div><p className="desk-kicker">{name(p.subject)} · {typeOf(p)}</p><b>{p.title}</b></div><button type="button" className="desk-btn ghost min-h-tap" onClick={onClose} aria-label="Close the editor">✕</button></header>
  <nav className="desk-chips" aria-label="Edit">{(made?(['details','pictures'] as const):(['details','pictures','print','more'] as const)).map(k=><button key={k} type="button" className="desk-chip min-h-tap" aria-current={pane===k?'page':undefined} onClick={()=>setPane(k)}>{{details:'Details',pictures:'Pictures',print:'Print',more:'More products'}[k]}</button>)}</nav>
  {pane==='details'&&<div className="shopm-pane">
   <label className="shop-field"><span>Name (the shop and Printify)</span><input value={title} maxLength={90} onChange={e=>setTitle(e.target.value)}/></label>
   <label className="shop-field"><span>Description</span><textarea rows={5} value={desc} maxLength={600} onChange={e=>setDesc(e.target.value)}/></label>
   <p className="desk-actions"><button type="button" className="desk-btn min-h-tap" disabled={busy||!dirty} onClick={()=>act('edit',{id:p.id,title,description:desc},'Saved, here and in Printify.')}>Save and send to Printify</button>{dirty&&<button type="button" className="desk-btn ghost min-h-tap" onClick={()=>{setTitle(p.title);setDesc(p.description)}}>Undo</button>}</p>
   <fieldset className="shop-cats"><legend className="desk-fine"><b>Categories in the shop</b> — tick every one it suits</legend><div className="desk-chips">{SHELVES.map(c=>{const on=c===own||(p.shelves??[]).includes(c)
    return <button key={c} type="button" className="desk-chip min-h-tap" aria-pressed={on} aria-current={on} disabled={c===own||busy} onClick={()=>{const cur=p.shelves??[];void act('shelves',{id:p.id,shelves:on?cur.filter(x=>x!==c):[...cur,c]},'Categories saved.')}}>{CAT_L[c]}{c===own?' · its own':''}</button>})}</div></fieldset>
   <fieldset className="shop-cats"><legend className="desk-fine"><b>Clubs</b> — its own club names the listing; tick every other club it belongs in too</legend>
    <label className="shopm-f"><span>Its own club</span><select value={p.subject} disabled={busy} onChange={e=>act('clubs',{id:p.id,subject:e.target.value},'Its club is set — the listing is rewritten.')}>{clubs.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <div className="desk-chips">{clubs.filter(s=>s.id!==p.subject).map(s=>{const on=!!p.clubs?.includes(s.id)
     return <button key={s.id} type="button" className="desk-chip min-h-tap" aria-pressed={on} aria-current={on} disabled={busy} onClick={()=>act('clubs',{id:p.id,...(on?{off:s.id}:{add:s.id})},on?`Taken out of ${s.name}.`:`Also in ${s.name}.`)}>{s.name}</button>})}</div></fieldset>
   <div className="shop-row">
    <label className="shop-switch"><input type="checkbox" checked={p.visible} disabled={busy||p.status!=='live'} onChange={e=>act('visible',{id:p.id,visible:e.target.checked},e.target.checked?'Shown in the shop.':'Hidden from the shop.')}/><span>Shown in the shop</span></label>
    <label className="shop-switch"><input type="checkbox" checked={fav} disabled={busy} onChange={e=>onFeature(e.target.checked)}/><span>Fan favourite (the whole design)</span></label>
   </div>
   <p className="desk-fine">{STATUS[p.status]}{p.printify?` · from ${money(p.printify.priceFrom,p.printify.currency)}`:''} · sharpness {Math.round(qualityOf(p)*100)}%{p.printify?.upscaled?` (picture enlarged ×${p.printify.upscaled} — a sharper original prints better)`:''}{p.sold?` · ${p.sold} sold`:''}{p.error?` · ${p.error}`:''}</p>
   {made&&<p className="desk-state">Made in Printify: its design is changed there. Here it is shown, hidden, renamed and priced; it is never re-pressed.</p>}
   <p className="desk-actions">{p.status!=='live'&&!made&&<button type="button" className="desk-btn min-h-tap" disabled={busy||running||!connected} onClick={()=>press([p.id])}>{p.status==='draft'?'Press':'Retry'}</button>}
    {p.printify&&<button type="button" className="desk-btn ghost min-h-tap" disabled={busy||!connected} onClick={()=>act('refresh',{id:p.id},'Read again from Printify.')}>Read again from Printify</button>}
    {p.status==='live'&&<a className="desk-btn ghost min-h-tap" href={`/shop/p/${encodeURIComponent(p.id)}`} target="_blank" rel="noreferrer">Its page ↗</a>}
    <button type="button" className="desk-btn ghost min-h-tap shopm-danger" disabled={busy} onClick={()=>{if(window.confirm(`Delete “${p.title}” here and in Printify? This cannot be undone.`)){void act('remove',{id:p.id},'Deleted.');onClose()}}}>Delete</button></p>
  </div>}
  {pane==='pictures'&&<div className="shopm-pane">
   <p className="desk-fine">The first picture is what the shop shows first. It is chosen automatically — the product worn or in its place when Printify draws one. Pick another here; it stays first until you set it back.</p>
   {pics.length===0?<p className="desk-state">No pictures yet — press the product first.</p>:<ul className="shopm-pics">{pics.map((src,i)=><li key={src}>
    <button type="button" className="shopm-pic" aria-pressed={i===0} disabled={busy} onClick={()=>act('cover',{id:p.id,src},'The first picture is set.')}>
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img src={src} alt="" width={160} height={160} loading="lazy"/><small>{i===0?'First · ':''}{camera(src)}</small></button></li>)}</ul>}
   {p.printify?.cover&&<button type="button" className="desk-btn ghost min-h-tap" disabled={busy} onClick={()=>act('cover',{id:p.id,src:''},'Back to the automatic order.')}>Back to the automatic order</button>}
  </div>}
  {pane==='print'&&!made&&<div className="shopm-pane">{printEditor(p)}</div>}
  {pane==='more'&&<div className="shopm-pane">
   <p className="desk-fine">The same picture and print settings on more products — each is made as a draft beside this one and pressed now.</p>
   <div className="desk-chips" role="group" aria-label="Products to add">{BASIC.map(k=><button key={k} type="button" className="desk-chip min-h-tap" disabled={have.has(k)} aria-pressed={more.includes(k)} aria-current={more.includes(k)} onClick={()=>setMore(v=>v.includes(k)?v.filter(x=>x!==k):[...v,k])}>{KIND_SPECS[k].label}{have.has(k)?' ✓':''}</button>)}</div>
   <p className="desk-actions"><button type="button" className="desk-btn min-h-tap" disabled={busy||running||!connected||!more.length} onClick={async()=>{const out=await act('clone',{id:p.id,kinds:more},'Added — pressing now.') as {made?:string[]}|null;if(out?.made?.length){setMore([]);await press(out.made)}}}>Add {more.length||''} product{more.length===1?'':'s'}</button></p>
   <p className="desk-fine">This design already has: {family.map(x=>typeOf(x)).join(', ')}.</p>
  </div>}
 </aside>
}
