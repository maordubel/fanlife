'use client'
import {useState} from 'react'
import {useAdminApi} from '@/components/master/adminApi'
import type {ShopDoc} from '@/lib/shop/types'

/**
 * THE SHOP DESK (owner, 12.11.2026: "I design the products, they sell on the external site — full automation").
 * Nothing is made here. The owner designs and publishes in Printify; the site mirrors the Pop-Up store on its own every
 * ten minutes. This page only says what the site shows, when it last looked, and gives the two ways in.
 */
type State={doc:ShopDoc;connected:boolean}
const money=(c:number,cur:string)=>new Intl.NumberFormat('en',{style:'currency',currency:cur}).format(c/100)
const ago=(iso:string|null)=>{if(!iso)return 'never';const m=Math.round((Date.now()-Date.parse(iso))/60e3);return m<1?'just now':m<60?`${m} min ago`:`${Math.round(m/60)} h ago`}

export function ShopDesk({initial}:{initial:State}){
 const [st,setSt]=useState(initial),api=useAdminApi(),{doc}=st,s=doc.settings,c=doc.catalog
 const [token,setToken]=useState('')
 const act=async(action:string,data:Record<string,unknown>={},msg='Done.')=>{const out=await api.post<State>('shop',{action,...data},msg);if(out)setSt({doc:out.doc,connected:out.connected});return out}
 const store=s.popupUrl||'https://fanlife.printify.me',ok=st.connected&&!!s.shopId
 return <div className="desk-content shopd">
  <header className="desk-head"><p className="desk-kicker">Shop</p><h1 className="desk-h1">The shop runs itself</h1>
   <p className="desk-fine">Design and publish in Printify. Every published product appears on the site’s shop on its own, with a Buy button into your store.</p>
   <p className="desk-actions"><a className="desk-btn" href="https://printify.com/app/products" target="_blank" rel="noreferrer">Design a product in Printify ↗</a>
    <a className="desk-btn ghost" href={store} target="_blank" rel="noreferrer">Your store ↗</a><a className="desk-btn ghost" href="/shop" target="_blank" rel="noreferrer">Shop on the site ↗</a>
    <a className="desk-btn ghost" href="https://printify.com/app/orders" target="_blank" rel="noreferrer">Orders ↗</a></p></header>
  {api.error&&<p className="desk-state" role="alert" data-tone="bad">{api.error}</p>}
  {api.notice&&<p className="desk-state" role="status">{api.notice}</p>}
  <section className="desk-card" aria-labelledby="shs"><h2 className="desk-h2" id="shs">{c.products.length} on the site</h2>
   <p className="desk-fine">{ok?<>Store <b>{s.shopTitle}</b> · looked {ago(c.at)}{typeof c.seen==='number'?` · ${c.seen} product(s) in Printify, ${c.products.length} published`:''}.</>:'Printify is not connected.'}
    {c.error&&<> <b>Last look failed:</b> {c.error}</>}</p>
   <div className="shop-row"><button className="desk-btn min-h-tap" disabled={api.busy||!ok} onClick={()=>act('sync',{},'Looked at Printify.')}>Look now</button></div>
   {c.products.length>0&&<ul className="shop-mini">{c.products.map(p=><li key={p.id}><a href={p.url} target="_blank" rel="noreferrer">
    {/* eslint-disable-next-line @next/next/no-img-element */}<img src={p.image} alt="" width={96} height={96} loading="lazy"/><span><b>{p.title}</b><small>{money(p.priceFrom,p.currency)}</small></span></a></li>)}</ul>}
  </section>
  <details className="desk-card"><summary className="desk-h2">Connection</summary>
   <div className="shop-row"><label className="shop-field"><span>Printify API token</span><input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder={st.connected?'Connected — paste only to replace':'Paste the token'}/></label>
    <button className="desk-btn ghost min-h-tap" disabled={api.busy} onClick={async()=>{if(await act('connect',{token},'Printify answered.'))setToken('')}}>{st.connected?'Check again':'Connect'}</button></div>
  </details>
 </div>
}
