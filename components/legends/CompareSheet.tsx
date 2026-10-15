'use client'
import {useState} from 'react'
import {planDeal} from '@/lib/legends/dealplan'
import type {CardView,CareerView} from '@/lib/legends/view'
import {Sheet} from './Sheet'

/**
 * U03: one candidate set beside one squad man of the same line (the manager may pick another). Every figure comes from
 * `planDeal`, the server's own arithmetic, and the move is only offered when the deal is legal; the reason is printed otherwise.
 */
const money=(n:number)=>`€${Math.round(n*10)/10}M`
const attrs=(c:CardView)=>Object.entries(c.attrs).slice(0,4).map(([k,x])=>`${k} ${x}`).join(' · ')
export function CompareSheet({v,cand,busy,onClose,send}:{v:CareerView;cand:CardView;busy:boolean;onClose:()=>void;send:(a:Record<string,unknown>,ok?:string)=>void}){
 const line=v.squad.filter(s=>s.quota===cand.pos),pool=line.length?line:v.squad
 const [outId,setOut]=useState<string>(()=>[...pool].sort((a,b)=>a.stars-b.stars||(a.sale?.net??0)-(b.sale?.net??0))[0]?.id??'')
 const out=v.squad.find(s=>s.id===outId)
 const deal=planDeal({open:!!v.window,cash:v.cash,squad:v.squad.map(s=>({id:s.id,quota:s.quota,paid:s.paid,apps:s.apps,sale:s.sale})),candidate:{id:cand.id,pos:cand.pos,price:cand.price,name:cand.name},out:out?.id??null})
 const swap=deal.blocked===null||deal.blocked.code!=='none-out'
 const plainBuy=planDeal({open:!!v.window,cash:v.cash,squad:v.squad.map(s=>({id:s.id,quota:s.quota,paid:s.paid,apps:s.apps,sale:s.sale})),candidate:{id:cand.id,pos:cand.pos,price:cand.price,name:cand.name}})
 const full=v.squad.length>=v.rules.maxSquad
 return <Sheet id={`compare-${cand.id}`} title={`${cand.name} · compare`} kicker="Candidate against your squad" onClose={onClose}>
  <div className="wkl-compare" data-testid="legends-compare">
   <label className="lgm-select">Compare with<select className="min-h-tap" value={outId} onChange={e=>setOut(e.target.value)}>{v.squad.map(s=><option key={s.id} value={s.id}>{s.pos} · {s.name}</option>)}</select></label>
   <table className="wkl-table"><thead><tr><th scope="col"/><th scope="col">{cand.name}</th><th scope="col">{out?.name??'—'}</th></tr></thead><tbody>
    <tr><th scope="row">Line</th><td>{cand.pos}</td><td>{out?.pos??'—'}</td></tr>
    <tr><th scope="row">Stars (game value)</th><td>{'★'.repeat(Math.round(cand.stars))}</td><td>{out?'★'.repeat(Math.round(out.stars)):'—'}</td></tr>
    <tr><th scope="row">Game attributes</th><td>{attrs(cand)}</td><td>{out?attrs(out):'—'}</td></tr>
    <tr><th scope="row">Cost</th><td>{money(cand.price)}</td><td>sells for {out?.sale?money(deal.net):'—'}</td></tr>
   </tbody></table>
   <ul className="wkl-bill">
    <li>Cash now <b>{money(v.cash)}</b></li>
    <li>Swap: cash after <b>{money(deal.cashAfter)}</b> · squad {deal.squadAfter} · GK {deal.quotasAfter.GK} DF {deal.quotasAfter.DF} MF {deal.quotasAfter.MF} FW {deal.quotasAfter.FW}</li>
    {!full?<li>Sign only: cash after <b>{money(plainBuy.cashAfter)}</b> · squad {plainBuy.squadAfter}</li>:null}
   </ul>
   <p className="wk-cap white">Stars and attributes are the game’s own values. This does not promise minutes or goals.</p>
   {deal.blocked&&swap?<p className="wk-cap yellow" role="status" data-testid="legends-compare-why">Swap closed: {deal.blocked.text}</p>:null}
   {!full&&plainBuy.blocked?<p className="wk-cap yellow" role="status">Signing closed: {plainBuy.blocked.text}</p>:null}
   <p className="wkl-actions">
    {!full?<button type="button" className="wk-btn red block min-h-tap" disabled={busy||!!plainBuy.blocked} onClick={()=>{send({kind:'buy',card:cand.id},`${cand.name} signed for ${money(cand.price)}.`);onClose()}}>Sign · {money(cand.price)}</button>:null}
    <button type="button" className="wk-btn red block min-h-tap" disabled={busy||!!deal.blocked||!out} onClick={()=>{send({kind:'swap',sell:out!.id,buy:cand.id},`${cand.name} in, ${out!.name} out.`);onClose()}}>Swap · {out?.name??'choose a man'}</button>
   </p>
  </div>
 </Sheet>
}
