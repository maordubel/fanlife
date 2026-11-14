'use client'
import {useState} from 'react'
import {saleFor,covers,MIN_PERCENT,MAX_PERCENT,isActive,type Sale} from '@/lib/shop/sales'
import {shelfOf,type ShopDoc} from '@/lib/shop/types'

type Act=(action:string,data?:Record<string,unknown>,msg?:string)=>Promise<unknown>
type Api={busy:boolean;post:<T>(path:string,data?:unknown,msg?:string)=>Promise<T|null>}
const SHELF_L:Record<string,string>={wear:'Clothing',wall:'Wall art',gear:'Matchday gear',home:'Home & mugs',kids:'Kids',small:'Small things'}
const day=(iso:string|null)=>iso?new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Europe/Athens'}):''
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Athens'})
const plus=(d:number)=>new Date(Date.now()+d*864e5).toLocaleDateString('en-CA',{timeZone:'Europe/Athens'})

/**
 * THE SALES TAB (owner, 14.11.2026: "an option for a discount and all kinds of sales promoters").
 *  1 · Sales — a real price cut for a time: everything, one club, one category or one design. The shop lowers the price in
 *      Printify (no code at checkout), shows the old price, a −% badge, a sale shelf and a countdown, and puts the price back
 *      when the sale ends — on its own, every hour. Ready-made sales: weekend, derby week, payday, Christmas.
 *  2 · Promoters — the ribbon line, free shipping over a total (set the same in Printify), fan favourites (★ on a design).
 *  3 · A Printify code — when the sale lives in Printify's Promotions instead.
 */
export function ShopSales({doc,act,api,connected,subjects,designs,onDoc}:{doc:ShopDoc;act:Act;api:Api;connected:boolean;subjects:{id:string;name:string}[];designs:{key:string;name:string}[];onDoc:()=>Promise<void>}){
 const s=doc.settings,sales=s.sales??[],pm=s.promoters??{}
 const [scope,setScope]=useState<Sale['scope']['type']>('all'),[run,setRun]=useState<string|null>(null)
 const [preset,setPreset]=useState<{label:string;percent:number;days:number}|null>(null)
 const live=doc.products.filter(p=>p.status==='live'&&p.printify?.productId)
 const pending=live.filter(p=>(p.printify!.sale?.id??null)!==(saleFor(p,sales)?.id??null)).length
 const covered=(x:Sale)=>live.filter(p=>covers(x,p)).length
 const applied=(x:Sale)=>live.filter(p=>p.printify!.sale?.id===x.id).length
 const scopeL=(x:Sale)=>x.scope.type==='all'?'Everything':x.scope.type==='club'?(subjects.find(c=>c.id===x.scope.value)?.name??x.scope.value):x.scope.type==='shelf'?SHELF_L[x.scope.value!]??x.scope.value:`Design: ${designs.find(d=>d.key===x.scope.value)?.name??x.scope.value}`
 const apply=async()=>{for(let i=0;i<30;i++){setRun(`Updating prices in Printify… (round ${i+1})`);const out=await api.post<{done:number;pending:number;errors:string[]}>('shop/sales',{},'Prices updated in Printify.');if(!out||out.pending===0||out.done===0)break}
  setRun(null);await onDoc()}
 const shelvesHere=[...new Set(live.map(p=>shelfOf(p.kind,p.blueprint?.title)))]
 return <>
  <section className="desk-card" aria-labelledby="shs1"><h2 className="desk-h2" id="shs1">Sales</h2>
   <p className="desk-fine">A real price cut: the shop lowers the price in Printify for the sale’s days — no code at checkout — shows the old price, a −% badge, a sale shelf and a countdown, and puts the price back when it ends. A price never goes below the printer’s cost + 10%.</p>
   {run&&<p className="desk-state" role="status"><b>{run}</b> Keep this page open.</p>}
   {pending>0&&!run&&<p className="desk-state" data-tone="bad">{pending} product price(s) still to update in Printify. <button className="desk-btn min-h-tap" disabled={api.busy||!connected} onClick={apply}>Apply now</button></p>}
   {sales.length>0&&<ul className="shop-sales">{sales.map(x=>{const on=isActive(x),soon=x.on&&!!x.starts&&Date.parse(x.starts)>Date.now()
    return <li key={x.id} className="shop-sale" data-on={on||undefined}><b>−{x.percent}% · {x.label}</b>
     <span className="desk-fine">{scopeL(x)} · {soon?`starts ${day(x.starts)}`:on?'on now':x.on?'ended':'stopped'}{x.until?` · ends ${day(x.until)}`:' · no end date'} · {on?`${applied(x)} of ${covered(x)} priced`:`${covered(x)} product(s)`}</span>
     {x.on&&<button className="desk-btn ghost min-h-tap" disabled={api.busy||!!run} onClick={async()=>{if(window.confirm(`End “${x.label}” now? Prices go back to normal.`)){await act('saleEnd',{sale:x.id},'Sale ended — putting prices back.');await apply()}}}>End now</button>}</li>})}</ul>}
   <p className="desk-fine"><b>Quick start</b></p>
   <div className="desk-chips" role="group" aria-label="Ready-made sales">{([['Weekend sale',15,3],['Derby week',20,7],['Payday',10,3],['Black Friday',30,4],['Christmas',20,14]] as [string,number,number][]).map(([l,p,d])=><button key={l} type="button" className="desk-chip min-h-tap" aria-pressed={preset?.label===l} onClick={()=>setPreset({label:l,percent:p,days:d})}>{l} · −{p}% · {d} days</button>)}</div>
   <form key={preset?.label??'own'} className="shop-row" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget)
    const ok=await act('sale',{label:f.get('label'),percent:Number(f.get('percent')),scope,value:f.get('value')||undefined,starts:f.get('starts')||null,until:f.get('until')||null},'Sale saved.')
    if(ok)await apply()}}>
    <label className="shop-field"><span>Name (shown in the shop)</span><input name="label" required maxLength={48} defaultValue={preset?.label??''} placeholder="Derby week sale"/></label>
    <label className="shop-field"><span>% off ({MIN_PERCENT}–{MAX_PERCENT})</span><input name="percent" type="number" required min={MIN_PERCENT} max={MAX_PERCENT} defaultValue={preset?.percent??20}/></label>
    <label className="shop-field"><span>On</span><select value={scope} onChange={e=>setScope(e.target.value as Sale['scope']['type'])}><option value="all">Everything</option><option value="club">One club</option><option value="shelf">One category</option><option value="design">One design</option></select></label>
    {scope==='club'&&<label className="shop-field"><span>Club</span><select name="value" required>{subjects.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
    {scope==='shelf'&&<label className="shop-field"><span>Category</span><select name="value" required>{shelvesHere.map(k=><option key={k} value={k}>{SHELF_L[k]}</option>)}</select></label>}
    {scope==='design'&&<label className="shop-field"><span>Design</span><select name="value" required>{designs.map(d=><option key={d.key} value={d.key}>{d.name}</option>)}</select></label>}
    <label className="shop-field"><span>Starts</span><input name="starts" type="date" defaultValue={today()}/></label>
    <label className="shop-field"><span>Ends (end of day, Athens)</span><input name="until" type="date" required defaultValue={plus(preset?.days??7)}/></label>
    <button className="desk-btn min-h-tap" disabled={api.busy||!!run||!connected}>Start the sale</button>
   </form>
  </section>
  <section className="desk-card" aria-labelledby="shs2"><h2 className="desk-h2" id="shs2">Promoters</h2>
   <p className="desk-fine">The ribbon is the line at the very top of the shop. While a sale is on it shows the sale and its countdown; otherwise your line, then free shipping, then the three promises.</p>
   <form className="shop-row" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void act('promoters',{ribbon:String(f.get('ribbon')||''),freeShipOver:String(f.get('ship')||'')},'Promoters saved — the shop shows them now.')}}>
    <label className="shop-field"><span>Ribbon line</span><input name="ribbon" maxLength={90} defaultValue={pm.ribbon??''} placeholder="New: the Derby collection is in"/></label>
    <label className="shop-field"><span>Free shipping over ($) — set the same in <a href="https://printify.com/app/store/promotions" target="_blank" rel="noreferrer">Printify ↗</a> first</span><input name="ship" type="number" min={1} max={999} defaultValue={pm.freeShipOver??''} placeholder="empty = no offer"/></label>
    <button className="desk-btn min-h-tap" disabled={api.busy}>Save</button>
   </form>
   <p className="desk-fine"><b>Fan favourites</b> — {pm.featured?.length?pm.featured.map(k=>designs.find(d=>d.key===k)?.name??k).join(' · '):'none yet'}. Star a design in Products (★ Feature) to put it on the shelf; once there are orders, best sellers join on their own.</p>
  </section>
  <details className="desk-more"><summary className="min-h-tap">A code from Printify’s Promotions (instead of a price cut){s.promo?` · −${s.promo.percent}% on`:''}</summary>
   <p className="desk-fine">1 · Create the promotion in Printify (<a href="https://printify.com/app/store/promotions" target="_blank" rel="noreferrer">Promotions ↗</a>). 2 · Put the same % here: the site shows the banner and the code.</p>
   <form className="shop-row" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void act('promo',{percent:Number(f.get('percent')||0),label:String(f.get('label')||''),until:String(f.get('until')||'')||null,code:String(f.get('code')||''),freeShipping:f.get('ship')==='on'},'Saved — the shop shows it now.')}}>
    <label className="shop-field"><span>% off</span><input name="percent" type="number" min={0} max={80} defaultValue={s.promo?.percent??''} placeholder="20"/></label>
    <label className="shop-field"><span>Headline</span><input name="label" defaultValue={s.promo?.label??''} placeholder="Derby week sale"/></label>
    <label className="shop-field"><span>Ends</span><input name="until" type="date" defaultValue={s.promo?.until?.slice(0,10)??''}/></label>
    <label className="shop-field"><span>Code</span><input name="code" defaultValue={s.promo?.code??''}/></label>
    <label className="shop-switch"><input name="ship" type="checkbox" defaultChecked={!!s.promo?.freeShipping}/><span>Cheaper shipping too</span></label>
    <button className="desk-btn min-h-tap" disabled={api.busy}>Save</button>
    {s.promo&&<button type="button" className="desk-btn ghost min-h-tap" disabled={api.busy} onClick={()=>act('promo',{percent:0},'Ended on the site.')}>End</button>}
   </form>
  </details>
 </>
}
