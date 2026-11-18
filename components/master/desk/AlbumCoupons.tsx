'use client'
import {useEffect,useState} from 'react'

/**
 * THE ALBUM coupons (owner, 18.11.2026): a code you post on FAN LIFE's social accounts gives a free packet in the album.
 * You type the code once here; only its hash is kept, so the list shows labels and uses, never the code itself.
 */
type Coupon={id:string;label:string;packets:number;maxUses:number|null;uses:number;endsAt:string|null;master:boolean;active:boolean;createdAt:string}
const API='/api/master/album/coupons'
export function AlbumCoupons(){
 const [list,setList]=useState<Coupon[]|null>(null),[err,setErr]=useState<string|null>(null),[note,setNote]=useState<string|null>(null),[busy,setBusy]=useState(false)
 const [code,setCode]=useState(''),[label,setLabel]=useState(''),[packets,setPackets]=useState(1),[maxUses,setMaxUses]=useState('500'),[endsAt,setEndsAt]=useState('')
 useEffect(()=>{fetch(API,{cache:'no-store'}).then(async r=>{const j=await r.json();if(r.ok)setList(j.coupons);else setErr(j.error||'Could not load.')}).catch(()=>setErr('No connection.'))},[])
 const post=async(body:unknown,ok:string)=>{setBusy(true);setErr(null);setNote(null);try{const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(r.ok){setList(j.coupons);setNote(ok);return true}setErr(j.error||'Not saved.')}catch{setErr('No connection. Nothing was saved.')}finally{setBusy(false)}return false}
 return <div className="desk-sub">
  <p className="desk-fine"><b>Coupons</b> — a code posted on our social accounts gives a free packet. Once per collector; the code itself is never stored.</p>
  <form className="acp-form" onSubmit={e=>{e.preventDefault();void post({action:'make',code,label,packets,maxUses:maxUses?Number(maxUses):null,endsAt:endsAt||null},`Code ${code.toUpperCase()} is live.`).then(o=>{if(o){setCode('');setLabel('')}})}}>
   <label>Code<input className="min-h-tap" value={code} onChange={e=>setCode(e.target.value.replace(/[^A-Za-z0-9_-]/g,''))} placeholder="DERBY26" maxLength={40} required/></label>
   <label>Label (for you)<input className="min-h-tap" value={label} onChange={e=>setLabel(e.target.value)} placeholder="Instagram · derby week" maxLength={80}/></label>
   <label>Packets<select className="min-h-tap" value={packets} onChange={e=>setPackets(Number(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
   <label>Max uses<input className="min-h-tap" inputMode="numeric" value={maxUses} onChange={e=>setMaxUses(e.target.value.replace(/\D/g,''))} placeholder="no limit"/></label>
   <label>Ends<input className="min-h-tap" type="date" value={endsAt} onChange={e=>setEndsAt(e.target.value)}/></label>
   <button type="submit" className="desk-btn min-h-tap" disabled={busy||code.length<4}>Create code</button>
  </form>
  {err&&<p className="desk-state" data-tone="bad" role="alert">{err}</p>}{note&&<p className="desk-state" role="status">{note}</p>}
  {list&&<ul className="desk-list">{list.map(c=><li key={c.id} data-off={!c.active||undefined}>
   <b>{c.label||'(no label)'}</b>{c.master?' · master, unlimited':''} · {c.packets} packet{c.packets>1?'s':''} · used {c.uses}{c.maxUses?` / ${c.maxUses}`:''}{c.endsAt?` · ends ${c.endsAt.slice(0,10)}`:''}{c.active?'':' · off'}
   {c.active&&!c.master&&<button type="button" className="desk-btn ghost min-h-tap" disabled={busy} onClick={()=>void post({action:'off',id:c.id},'Code switched off.')}>Switch off</button>}
  </li>)}</ul>}
 </div>
}
