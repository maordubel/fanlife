'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import {useAdminApi} from '@/components/master/adminApi'
import {KIND_SPECS} from '@/lib/shop/kinds'
import {DesignControls,CutoutPreview,type Stock} from './ShopDesign'
import {KINDS,type ArtRef,type ProductDesign,type Kind,type ShopDoc,type ShopProduct} from '@/lib/shop/types'

/**
 * THE SHOP DESK (owner, 12.11.2026: "click and sell"). Four steps down one page, each with one main button:
 * connect Printify → prepare the launch drafts → press (send the picture, create, price, publish) → choose what the shop
 * shows. Below them: make a new product from a picture in the library (the studio's Drive library — the shop draws
 * nothing of its own) or from your own upload, and the settings. Every action is one
 * click; a press runs one product per request so the phone can walk a long list without a timeout.
 */
type State={doc:ShopDoc;connected:boolean}
type Subject={id:string;name:string}
export type DeskPicture={id:string;name:string;folder:string;subject:string;approved:boolean;review:boolean}
const thumb=(id:string)=>`https://drive.google.com/thumbnail?id=${id}&sz=w320`
const money=(c:number,cur:string)=>new Intl.NumberFormat('en',{style:'currency',currency:cur}).format(c/100)
const BASIC=KINDS.filter(k=>k!=='more')
type CatItem={id:number;title:string;brand:string;image:string;group:string}
const STATUS:Record<ShopProduct['status'],string>={draft:'Draft',building:'Pressing…',ready:'Made — waiting for its link',live:'On sale',error:'Needs a retry'}

export function ShopDesk({initial,subjects,pictures}:{initial:State;subjects:Subject[];pictures:DeskPicture[]}){
 const [st,setSt]=useState(initial),api=useAdminApi(),{doc}=st,s=doc.settings
 const [token,setToken]=useState(''),[who,setWho]=useState('all'),[show,setShow]=useState<'all'|'shown'|'hidden'|'todo'>('all')
 const [run,setRun]=useState<{done:number;total:number}|null>(null),stop=useRef(false)
 const [nSub,setNSub]=useState(subjects[0]?.id||'fanlife'),[nKinds,setNKinds]=useState<Kind[]>(['poster']),[nPic,setNPic]=useState<string>('own'),[nTitle,setNTitle]=useState(''),file=useRef<HTMLInputElement>(null)
 const [nDesign,setNDesign]=useState<ProductDesign>({}),[ownFile,setOwnFile]=useState<File|null>(null),[clean,setClean]=useState<string|null>(null),[editing,setEditing]=useState<string|null>(null),[eDesign,setEDesign]=useState<ProductDesign>({})
 const [nStock,setNStock]=useState<Stock|null>(null),[eStock,setEStock]=useState<Stock|null>(null)
 const uploadArt=async(f:File)=>{const data=await new Promise<string>((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result));r.onerror=()=>no(r.error);r.readAsDataURL(f)})
  return (await api.post<{art:ArtRef}>('shop',{action:'art',name:f.name,data},'Picture uploaded for this area.'))?.art??null}
 const picOptions=(sub:string)=>pictures.filter(p=>p.subject===sub||p.subject==='fanlife').filter(p=>!p.review).map(p=>({id:p.id,name:`${p.folder} · ${p.name}`}))
 const stockOf=async(t:{kind?:Kind;blueprintId?:number})=>(await api.post<{options:Stock}>('shop',{action:'options',...t},'The printer’s stock is loaded.'))?.options??null
 const [cat,setCat]=useState<CatItem[]|null>(null),[cq,setCq]=useState(''),[cg,setCg]=useState('All'),[picked,setPicked]=useState<{id:number;title:string}[]>([])
 const nTarget=nKinds.length+picked.length===1?(picked[0]?{blueprintId:picked[0].id}:{kind:nKinds[0]}):null
 const nKey=JSON.stringify(nTarget);useEffect(()=>{setNStock(null)},[nKey])
 const openCat=async()=>{if(cat)return;const out=await api.post<{catalog:CatItem[]}>('shop',{action:'catalog'},'The whole Printify catalogue is open.');if(out?.catalog)setCat(out.catalog)}
 const catGroups=useMemo(()=>{const m=new Map<string,number>();for(const c of cat||[])m.set(c.group,(m.get(c.group)||0)+1);return [['All',cat?.length||0] as [string,number],...[...m].sort((a,b)=>b[1]-a[1])]},[cat])
 const catShown=useMemo(()=>{const q=cq.trim().toLowerCase();return (cat||[]).filter(c=>(cg==='All'||c.group===cg)&&(!q||`${c.title} ${c.brand}`.toLowerCase().includes(q))).slice(0,48)},[cat,cq,cg])
 const togglePick=(c:{id:number;title:string})=>setPicked(v=>v.some(x=>x.id===c.id)?v.filter(x=>x.id!==c.id):v.length>=40?v:[...v,{id:c.id,title:c.title}])
 const act=async(action:string,data:Record<string,unknown>={},msg='Saved.')=>{const out=await api.post<State&{made?:string[]}>('shop',{action,...data},msg);if(out)setSt({doc:out.doc,connected:out.connected});return out}
 const name=(id:string)=>subjects.find(x=>x.id===id)?.name||id
 const list=useMemo(()=>doc.products.filter(p=>(who==='all'||p.subject===who)&&(show==='all'||(show==='shown'?p.visible:show==='hidden'?!p.visible&&p.status==='live':p.status!=='live'))),[doc.products,who,show])
 const todo=doc.products.filter(p=>p.status==='draft'||p.status==='error'||p.status==='building'),live=doc.products.filter(p=>p.status==='live'),shown=live.filter(p=>p.visible)
 const pressMany=async(ids:string[])=>{stop.current=false;setRun({done:0,total:ids.length});for(let i=0;i<ids.length&&!stop.current;i++){await act('press',{id:ids[i]},'Pressed.');setRun({done:i+1,total:ids.length})}setRun(null)}
 const popup=/storefront|pop/i.test(s.channel||'')
 const shelves=useMemo(()=>{const mine=pictures.filter(p=>p.subject===nSub||p.subject==='fanlife'),by=new Map<string,DeskPicture[]>()
  for(const p of mine.sort((a,b)=>Number(b.subject===nSub)-Number(a.subject===nSub)||Number(b.approved)-Number(a.approved)))by.set(p.folder,[...(by.get(p.folder)||[]),p])
  return [...by]},[pictures,nSub])
 const create=async()=>{
  const total=nKinds.length+picked.length
  if(!total){api.setError('Choose at least one product.');return}
  if(nPic==='own'){const f=file.current?.files?.[0];if(!f){api.setError('Choose a picture first (PNG or JPG).');return}
   const data=clean??await new Promise<string>((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result));r.onerror=()=>no(r.error);r.readAsDataURL(f)})
   const out=await act('upload',{subject:nSub,kinds:nKinds,blueprints:picked,name:clean?f.name.replace(/\.\w+$/,'')+'.png':f.name,data,title:nTitle||name(nSub),design:nDesign},'Picture uploaded.');if(out?.made?.length)await pressMany(out.made)
  }else{const out=await act('add',{subject:nSub,picture:nPic,kinds:nKinds,blueprints:picked,design:nDesign},'Added.');if(out?.made)await pressMany(out.made)}
 }
 const ago=(iso:string)=>{const m=Math.round((Date.now()-Date.parse(iso))/60e3);return m<1?'just now':m<60?`${m} min ago`:m<2880?`${Math.round(m/60)} h ago`:`${Math.round(m/1440)} days ago`}
 const step=(n:number,done:boolean)=><span className="shop-no" data-done={done||undefined} aria-hidden="true">{done?'✓':n}</span>
 return <div className="desk-content shopd">
  <header className="desk-head"><p className="desk-kicker">Shop</p><h1 className="desk-h1">The print room</h1>
   <p className="desk-fine">Printed and shipped by Printify. {shown.length} shown in the shop · {live.length} on sale · {todo.length} waiting to be pressed.</p>
   <p className="desk-actions"><a className="desk-btn ghost" href="/shop" target="_blank" rel="noreferrer">Open the shop ↗</a><a className="desk-btn ghost" href="https://printify.com/app/orders" target="_blank" rel="noreferrer">Orders in Printify ↗</a></p></header>
  <section className="desk-card shop-ready" aria-labelledby="shr"><h2 className="desk-h2" id="shr">Ready to sell?</h2>
   <ul className="shop-checks">{[
    [st.connected,'Printify connected',null],
    [popup,'Selling through the Pop-Up store (Printify takes the payment)',null],
    [doc.health?.ok??false,'Last check-up all well',doc.health?.notes[0]??null],
    [live.length>0,`${live.length} product(s) made in Printify`,null],
    [todo.length===0,todo.length?`${todo.length} product(s) still to press or retry`:'Nothing waiting to be pressed',null],
    [!live.some(p=>!p.visible),live.some(p=>!p.visible)?`${live.filter(p=>!p.visible).length} made product(s) waiting for your eye — show them below`:'Every made product is shown or deliberately hidden',null],
    [!doc.products.some(p=>/print soft|small for/i.test(p.error||'')),doc.products.some(p=>/print soft|small for/i.test(p.error||''))?`${doc.products.filter(p=>/print soft|small for/i.test(p.error||'')).length} product(s) may print soft — use a larger picture`:'Every picture is large enough',null],
    [s.open,s.open?'The shop is open to the public':'The shop is closed to the public (switch it on in step 4 when ready)',null],
   ].map(([ok,t,n],i)=><li key={i} data-ok={ok?'1':'0'}><span aria-hidden="true">{ok?'✓':'•'}</span><span>{t as string}{n?<small> — {n as string}</small>:null}</span></li>)}</ul>
   <p className="desk-fine">In Printify, once: <a href="https://printify.com/app/store/settings/verification" target="_blank" rel="noreferrer">verify the store and payouts ↗</a> · <a href="https://printify.com/app/store/settings/name" target="_blank" rel="noreferrer">sell in the EU ↗</a> · <a href="https://printify.com/app/storefront/builder" target="_blank" rel="noreferrer">store design (logo, colours) ↗</a></p>
  </section>
  <section className="desk-card shop-health" aria-labelledby="shh" data-ok={doc.health?doc.health.ok:undefined}><h2 className="desk-h2" id="shh">Health</h2>
   <p className="desk-fine">{doc.health?<>{doc.health.ok?'All well':'Needs a look'} · checked {ago(doc.health.at)} · {doc.health.checked} product(s) read from Printify, {doc.health.repaired} repaired. The shop checks itself every hour.</>:'Not checked yet. The shop checks itself every hour.'}</p>
   {doc.health&&doc.health.notes.length>0&&<ul className="shop-notes">{doc.health.notes.map((n,i)=><li key={i}>{n}</li>)}</ul>}
   <div className="shop-row"><button className="desk-btn ghost min-h-tap" disabled={!!run||api.busy||!st.connected} onClick={async()=>{const out=await api.post<{health:NonNullable<ShopDoc['health']>}>('shop/checkup',{},'Checked.');if(out)setSt(v=>({...v,doc:{...v.doc,health:out.health}}));const fresh=await api.get<State>('shop');if(fresh)setSt({doc:fresh.doc,connected:fresh.connected})}}>Check now</button></div>
  </section>
  {api.error&&<p className="desk-state" role="alert" data-tone="bad">{api.error}</p>}
  {api.notice&&!run&&<p className="desk-state" role="status">{api.notice}</p>}
  {run&&<p className="desk-state shop-run" role="status"><b>Pressing {run.done} of {run.total}…</b> Keep this page open. <button className="desk-btn ghost" onClick={()=>{stop.current=true}}>Stop after this one</button></p>}

  <section className="desk-card shop-step" aria-labelledby="sh1"><h2 className="desk-h2" id="sh1">{step(1,st.connected&&!!s.shopId)} Connect Printify</h2>
   {st.connected&&s.shopId?<p className="desk-fine">Connected to <b>{s.shopTitle}</b> ({s.channel||'store'}). {popup?'':'This store is not a Pop-Up store: in Printify choose Add new store → Printify Pop-Up, then press Check again — the checkout happens there.'}</p>
    :<p className="desk-fine">In Printify open <a href="https://printify.com/app/account/api" target="_blank" rel="noreferrer">Account → Connections ↗</a>, press <b>Generate</b>, choose all scopes, copy the token and paste it here. It is kept on the server and never shown again.</p>}
   <div className="shop-row"><label className="shop-field"><span>API token</span><input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder={st.connected?'Connected — paste only to replace':'Paste the token'}/></label>
    <button className="desk-btn" disabled={api.busy} onClick={async()=>{if(await act('connect',{token},'Printify answered.'))setToken('')}}>{st.connected?'Check again':'Connect'}</button></div>
   <div className="shop-row"><label className="shop-field"><span>Pop-Up store address</span><input inputMode="url" defaultValue={s.popupUrl} placeholder="https://your-name.printify.me" onBlur={e=>{if(e.target.value.trim()!==s.popupUrl)void act('settings',{popupUrl:e.target.value})}}/></label></div>
  </section>

  <section className="desk-card shop-step" aria-labelledby="sh2"><h2 className="desk-h2" id="sh2">{step(2,doc.products.length>0)} Prepare the launch drafts</h2>
   <p className="desk-fine">Takes the leading pictures from each club’s shelf in your library, and from FAN LIFE’s own, and drafts a poster, a tote, a T-shirt and a mug for each. Only drafts: look at them below, delete what you do not want, then press. A club without its own shelf gets nothing here — add pictures for it in “New product”.</p>
   <div className="shop-row"><button className="desk-btn" disabled={api.busy} onClick={()=>act('launch',{subject:'all'},'Launch set prepared.')}>Prepare for every club + FAN LIFE</button></div>
  </section>

  <section className="desk-card shop-step" aria-labelledby="sh3"><h2 className="desk-h2" id="sh3">{step(3,live.length>0&&todo.length===0)} Press</h2>
   <p className="desk-fine">Hands each picture to Printify at full size, places it, prices it at cost + {s.margin}% and publishes it to your store. About 20 seconds each.</p>
   <div className="shop-row"><button className="desk-btn" disabled={!!run||api.busy||!st.connected||!todo.length} onClick={()=>pressMany((who==='all'?todo:todo.filter(p=>p.subject===who)).map(p=>p.id))}>Press {who==='all'?`all ${todo.length} waiting`:`${name(who)}’s waiting`}</button></div>
  </section>

  <section className="desk-card shop-step" aria-labelledby="sh4"><h2 className="desk-h2" id="sh4">{step(4,s.open&&shown.length>0)} Open the shop</h2>
   <div className="shop-row"><button className="desk-btn" disabled={api.busy||!live.length} onClick={()=>act('visible',{ids:live.map(p=>p.id),visible:true},'Everything on sale is now shown.')}>Show everything on sale</button>
    <button className={`desk-btn${s.open?' ghost':''}`} disabled={api.busy} onClick={()=>act('settings',{open:!s.open},s.open?'The shop is closed.':'The shop is open.')}>{s.open?'Close the shop':'Open the shop to the public'}</button></div>
  </section>

  <section className="desk-card" aria-labelledby="shp"><h2 className="desk-h2" id="shp">Products</h2>
   <div className="desk-chips" role="group" aria-label="Club">{[{id:'all',name:'All'},...subjects].map(x=>{const n=x.id==='all'?doc.products.length:doc.products.filter(p=>p.subject===x.id).length;return <button key={x.id} className="desk-chip" aria-current={who===x.id} onClick={()=>setWho(x.id)}>{x.name} · {n}</button>})}</div>
   <div className="desk-chips" role="group" aria-label="Show">{([['all','All'],['shown','Shown'],['hidden','On sale, hidden'],['todo','Not on sale']] as const).map(([k,l])=><button key={k} className="desk-chip" aria-current={show===k} onClick={()=>setShow(k)}>{l}</button>)}</div>
   {list.length===0?<p className="desk-state">Nothing here yet.</p>:<ul className="shop-grid">{list.map(p=>{const img=p.printify?.images[0]||('library' in p.art?thumb(p.art.library.id):p.art.upload.preview)
    return <li key={p.id} className="shop-card" data-status={p.status}>
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img src={img} alt="" loading="lazy" width={240} height={300} referrerPolicy="no-referrer"/>
     <div className="shop-card-t"><b>{p.title}</b><small>{name(p.subject)} · {STATUS[p.status]}{p.printify?` · from ${money(p.printify.priceFrom,p.printify.currency)}`:''}</small>
      {p.error&&<small className="shop-err">{p.error}</small>}
      <label className="shop-switch"><input type="checkbox" checked={p.visible} disabled={api.busy||p.status!=='live'} onChange={e=>act('visible',{id:p.id,visible:e.target.checked},e.target.checked?'Shown in the shop.':'Hidden from the shop.')}/><span>Show in the shop</span></label>
      <div className="shop-card-a">
       {p.status!=='live'&&<button className="desk-btn" disabled={!!run||api.busy||!st.connected} onClick={()=>pressMany([p.id])}>{p.status==='draft'?'Press':'Retry'}</button>}
       {p.status==='ready'&&<button className="desk-btn ghost" disabled={api.busy} onClick={()=>act('refresh',{id:p.id},'Checked.')}>Check its link</button>}
       {p.printify?.url&&<a className="desk-btn ghost" href={p.printify.url} target="_blank" rel="noreferrer">View ↗</a>}
       <button className="desk-btn ghost" disabled={api.busy} aria-expanded={editing===p.id} onClick={()=>{setEditing(editing===p.id?null:p.id);setEDesign(p.design??{});setEStock(null)}}>Design</button>
       <button className="desk-btn ghost" disabled={api.busy} onClick={()=>{const t=window.prompt('Product title',p.title);if(t&&t!==p.title)void act('edit',{id:p.id,title:t})}}>Rename</button>
       <button className="desk-btn ghost" disabled={api.busy} onClick={()=>{if(window.confirm(`Delete “${p.title}” here and in Printify? This cannot be undone.`))void act('remove',{id:p.id},'Deleted.')}}>Delete</button>
      </div>
      {editing===p.id&&<div className="shop-edit"><DesignControls value={eDesign} onChange={setEDesign} library={'library' in p.art} margin={s.margin} busy={api.busy} stock={eStock} loadStock={()=>{void stockOf(p.blueprint?{blueprintId:p.blueprint.id}:{kind:p.kind}).then(setEStock)}} pictures={picOptions(p.subject)} uploadArt={uploadArt}/>
       <p className="desk-fine">Applying presses the product again with these settings. It is hidden until you show it again.</p>
       <button className="desk-btn min-h-tap" disabled={api.busy||!st.connected} onClick={async()=>{if(await act('design',{id:p.id,design:eDesign},'Pressed again with the new design.'))setEditing(null)}}>Apply and press again</button></div>}
      </div></li>})}</ul>}
  </section>

  <section className="desk-card" aria-labelledby="shn"><h2 className="desk-h2" id="shn">New product</h2>
   <div className="shop-form"><label className="shop-field"><span>For</span><select value={nSub} onChange={e=>{setNSub(e.target.value);setNPic('own')}}>{subjects.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div>
   <p className="desk-fine">Products (one or several)</p>
   <div className="desk-chips" role="group" aria-label="Products">{BASIC.map(k=><button key={k} className="desk-chip" aria-current={nKinds.includes(k)} aria-pressed={nKinds.includes(k)} onClick={()=>setNKinds(v=>v.includes(k)?v.filter(x=>x!==k):[...v,k])}>{KIND_SPECS[k].label}</button>)}</div>
   <details className="desk-more shop-cat" onToggle={e=>{if((e.target as HTMLDetailsElement).open)void openCat()}}><summary className="min-h-tap">Everything Printify makes{cat?` · ${cat.length} products`:''}{picked.length?` · ${picked.length} chosen`:''}</summary>
    {!cat?<p className="desk-fine">{api.busy?'Opening the catalogue…':'Opens Printify’s whole catalogue. Each product you pick is printed by a European printer when there is one.'}</p>:<>
     <div className="shop-form"><label className="shop-field"><span>Search the catalogue</span><input type="search" value={cq} onChange={e=>setCq(e.target.value)} placeholder="scarf, flag, cap, glass, towel…"/></label></div>
     <div className="desk-chips" role="group" aria-label="Catalogue shelves">{catGroups.map(([g,n])=><button key={g} className="desk-chip" aria-current={cg===g} onClick={()=>setCg(g)}>{g} · {n}</button>)}</div>
     <ul className="shop-catlist">{catShown.map(c=>{const on=picked.some(x=>x.id===c.id);return <li key={c.id}><button className="shop-catitem min-h-tap" aria-pressed={on} onClick={()=>togglePick(c)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}{c.image?<img src={c.image} alt="" width={72} height={72} loading="lazy"/>:<span className="shop-plus" aria-hidden="true">#</span>}
      <span><b>{c.title}</b><small>{c.brand} · #{c.id}</small></span><span className="shop-tick" aria-hidden="true">{on?'✓':'+'}</span></button></li>})}</ul>
     {catShown.length===48&&<p className="desk-fine">Showing the first 48 — search to narrow.</p>}
    </>}
   </details>
   {picked.length>0&&<div className="desk-chips" role="group" aria-label="Chosen from the catalogue">{picked.map(c=><button key={c.id} className="desk-chip" aria-current={true} onClick={()=>togglePick(c)}>{c.title} ✕</button>)}</div>}
   <details className="desk-more shop-design-box"><summary className="min-h-tap">Design — print side, size, colours, background, price</summary><DesignControls value={nDesign} onChange={setNDesign} library={nPic!=='own'} margin={s.margin} busy={api.busy} stock={nTarget?nStock:null} loadStock={nTarget?()=>{void stockOf(nTarget).then(setNStock)}:undefined} pictures={picOptions(nSub)} uploadArt={uploadArt}/>{!nTarget&&<p className="desk-fine">To choose exact colours and sizes, pick one product at a time.</p>}</details>
   <p className="desk-fine">Picture — from your library ({name(nSub)}’s shelf first, then FAN LIFE’s), or your own</p>
   <button role="radio" aria-checked={nPic==='own'} className="shop-pick own wide" onClick={()=>setNPic('own')}><span className="shop-plus" aria-hidden="true">+</span><span>Upload my own picture</span></button>
   {nPic==='own'&&<div className="shop-form"><label className="shop-field"><span>Picture (PNG or JPG, the larger the better — 3000px or more)</span><input ref={file} type="file" accept="image/png,image/jpeg" onChange={e=>setOwnFile(e.target.files?.[0]??null)}/></label>
    <CutoutPreview file={ownFile} onReady={d=>setClean(d)}/>
    <label className="shop-field"><span>Title</span><input value={nTitle} onChange={e=>setNTitle(e.target.value)} maxLength={70} placeholder={name(nSub)}/></label></div>}
   {shelves.map(([folder,pics],i)=><details key={folder} className="desk-more shop-shelf" open={i===0}><summary className="min-h-tap">{folder} · {pics.length}{pics[0]!.approved?' · approved':''}{pics[0]!.review?' · check rights before selling':''}</summary>
    <div className="shop-picks" role="radiogroup" aria-label={folder}>{pics.map(pc=><button key={pc.id} role="radio" aria-checked={nPic===pc.id} className="shop-pick" title={pc.name} onClick={()=>setNPic(pc.id)}>
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img src={thumb(pc.id)} alt={pc.name} width={120} height={150} loading="lazy" referrerPolicy="no-referrer"/></button>)}</div></details>)}
   <div className="shop-row shop-go"><button className="desk-btn" disabled={!!run||api.busy||!st.connected} onClick={create}>Create and put on sale{nKinds.length+picked.length>1?` (${nKinds.length+picked.length} products)`:''}</button></div>
   <p className="desk-fine">Sell only what is yours to sell: no official club crest, no registered club name, no player’s face, no photograph you did not take. Printify removes listings that break this, and can close the account.</p>
  </section>

  <details className="desk-more"><summary className="min-h-tap">Settings — price margin and the catalogue</summary>
   <div className="shop-row"><label className="shop-field"><span>Margin on Printify’s cost (%)</span><input type="number" min={0} max={300} defaultValue={s.margin} onBlur={e=>{const n=Number(e.target.value);if(n!==s.margin)void act('settings',{margin:n},'Margin saved — it applies to the next press.')}}/></label></div>
   <div className="desk-table-wrap"><table className="desk-table"><thead><tr><th>Product</th><th>Printify catalogue product</th><th>Printed by</th><th>Replace</th></tr></thead>
    <tbody>{BASIC.map(k=>{const m=s.matches[k];return <tr key={k}><th>{KIND_SPECS[k].label}</th><td data-label="Catalogue">{m?`${m.title} (#${m.blueprintId})`:'Found at the first press'}</td><td data-label="Printed by">{m?.provider||'—'}</td>
     <td data-label="Replace"><button className="desk-btn ghost" disabled={api.busy||!st.connected} onClick={()=>{const n=Number(window.prompt(`Printify catalogue number for ${KIND_SPECS[k].label} (the number in the product’s address on printify.com/app/products/…)`,m?String(m.blueprintId):''));if(n>0)void act('match',{kind:k,blueprintId:n},'Catalogue updated.')}}>Choose</button></td></tr>})}</tbody></table></div>
   <ol className="desk-list">{doc.audit.slice(-8).reverse().map((a,i)=><li key={i}><b>{a.what}</b> — {a.by} · {a.at.slice(0,16).replace('T',' ')}</li>)}</ol>
  </details>
 </div>
}
