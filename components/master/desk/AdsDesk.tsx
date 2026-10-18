'use client'
import {useState} from 'react'
import type {Banner,PageRule,PromoDoc} from '@/lib/promo/types'

const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const HOURS=Array.from({length:24},(_,i)=>i)
const blank=():Banner=>({id:'',name:'New banner',enabled:false,href:'https://',alt:'',img1x:'',img2x:'',audience:'all',targeting:{home:true,allClubs:true,clubs:[],other:true,paths:[],exclude:[]},startsAt:null,endsAt:null,days:[],fromHour:0,toHour:0,delaySec:null,showSec:null,weight:10,maxPerSession:1,maxPerDay:0,cooldownMin:30,note:''})
const local=(iso:string|null)=>{if(!iso)return '';const d=new Date(iso),p=(n:number)=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`}
const iso=(v:string)=>v?new Date(v).toISOString():null
const lines=(v:string)=>v.split(/[\s,]+/).map(x=>x.trim()).filter(Boolean)

/** where a banner appears, in one sentence the owner can check at a glance */
function where(b:Banner,names:Record<string,string>):string{
 const t=b.targeting,bits:string[]=[]
 if(t.home)bits.push('home page')
 if(t.allClubs)bits.push('every club')
 else if(t.clubs.length)bits.push(t.clubs.map(c=>names[c]||c).join(', '))
 if(t.other)bits.push('all other pages');if(t.paths.length)bits.push(t.paths.join(', '))
 return (bits.join(' · ')||'nowhere')+(b.audience==='israel'?' — Israeli visitors only':b.audience==='greece'?' — Greek visitors, and everyone on the clubs chosen':'')
}

export function AdsDesk({initial,clubs}:{initial:PromoDoc;clubs:{id:string;name:string}[]}){
 const [doc,setDoc]=useState(initial),[busy,setBusy]=useState(false),[msg,setMsg]=useState<{ok:boolean;text:string}|null>(null),[dirty,setDirty]=useState(false)
 const names=Object.fromEntries(clubs.map(c=>[c.id,c.name]))
 const edit=(fn:(d:PromoDoc)=>PromoDoc)=>{setDoc(d=>fn(d));setDirty(true);setMsg(null)}
 const setB=(i:number,patch:Partial<Banner>)=>edit(d=>({...d,banners:d.banners.map((b,k)=>k===i?{...b,...patch}:b)}))
 const setT=(i:number,patch:Partial<Banner['targeting']>)=>edit(d=>({...d,banners:d.banners.map((b,k)=>k===i?{...b,targeting:{...b.targeting,...patch}}:b)}))
 async function save(what:string){
  setBusy(true);setMsg(null)
  try{
   const r=await fetch('/api/master/promo',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({doc,what})}),j=await r.json()
   if(!r.ok)setMsg({ok:false,text:j.error||'Not saved.'});else{setDoc(j);setDirty(false);setMsg({ok:true,text:'Saved. Visitors see it within a minute.'})}
  }catch{setMsg({ok:false,text:'Could not reach the server. Nothing was saved.'})}
  setBusy(false)
 }
 const rule=(i:number,patch:Partial<PageRule>)=>edit(d=>({...d,settings:{...d.settings,pageRules:d.settings.pageRules.map((r,k)=>k===i?{...r,...patch}:r)}}))
 const S=doc.settings
 return <div className="desk-content ads">
  <header className="desk-head"><p className="desk-kicker">Advertising</p><h1 className="desk-h1">Your banners</h1>
   <p className="desk-fine">320×50 strips that rise from the bottom, wait, and drop away. Each banner has its own link, pages, audience, schedule and rotation weight. Nothing ever appears over a game in play, an open dialog or this control room.</p></header>

  <section className="desk-card" aria-labelledby="ads-all"><h2 className="desk-h2" id="ads-all">Everywhere</h2>
   <label className="ads-row"><input type="checkbox" checked={S.enabled} onChange={e=>edit(d=>({...d,settings:{...d.settings,enabled:e.target.checked}}))}/> Advertising is on</label>
   <div className="ads-grid">
    <label>Appears after (seconds)<input type="number" min={0} max={120} value={S.delaySec} onChange={e=>edit(d=>({...d,settings:{...d.settings,delaySec:Number(e.target.value)}}))}/></label>
    <label>Stays for (seconds)<input type="number" min={2} max={60} value={S.showSec} onChange={e=>edit(d=>({...d,settings:{...d.settings,showSec:Number(e.target.value)}}))}/></label>
    <label>Pause before the next one (seconds)<input type="number" min={0} max={3600} value={S.gapSec} onChange={e=>edit(d=>({...d,settings:{...d.settings,gapSec:Number(e.target.value)}}))}/></label>
    <label>Most banners per visit<input type="number" min={0} max={50} value={S.maxPerSession} onChange={e=>edit(d=>({...d,settings:{...d.settings,maxPerSession:Number(e.target.value)}}))}/></label>
   </div>
   <p className="desk-fine">A banner can override the first two. “Per visit” counts a browser tab’s session; 0 means no limit.</p>
  </section>

  <section className="desk-card" aria-labelledby="ads-pages"><h2 className="desk-h2" id="ads-pages">Page by page</h2>
   <p className="desk-fine">By default every banner follows its own page settings. Add a row to switch a page off, or to show only chosen banners there. A specific club beats “All clubs”.</p>
   {S.pageRules.map((r,i)=><div className="ads-rule" key={i}>
    <select aria-label="Page" value={r.page} onChange={e=>rule(i,{page:e.target.value})}>
     <option value="home">Home page</option><option value="clubs">All clubs</option><option value="other">Other pages</option>
     {clubs.map(c=><option key={c.id} value={`club:${c.id}`}>{c.name}</option>)}
    </select>
    <select aria-label="Rule" value={r.mode} onChange={e=>rule(i,{mode:e.target.value as PageRule['mode']})}><option value="auto">Normal</option><option value="off">No banners</option><option value="only">Only these banners</option></select>
    {r.mode==='only'&&<span className="ads-chips">{doc.banners.filter(b=>b.id).map(b=><label key={b.id}><input type="checkbox" checked={r.only.includes(b.id)} onChange={e=>rule(i,{only:e.target.checked?[...r.only,b.id]:r.only.filter(x=>x!==b.id)})}/> {b.name}</label>)}</span>}
    <button type="button" className="desk-btn ghost min-h-tap" onClick={()=>edit(d=>({...d,settings:{...d.settings,pageRules:d.settings.pageRules.filter((_,k)=>k!==i)}}))}>Remove</button>
   </div>)}
   <button type="button" className="desk-btn ghost min-h-tap" onClick={()=>edit(d=>({...d,settings:{...d.settings,pageRules:[...d.settings.pageRules,{page:'home',mode:'auto',only:[]}]}}))}>Add a page rule</button>
  </section>

  <section aria-labelledby="ads-list"><h2 className="desk-h2" id="ads-list">Banners ({doc.banners.length})</h2>
   {doc.banners.map((b,i)=><details className="desk-card ads-banner" key={i} open={!b.id}>
    <summary><span className="ads-thumb">{b.img1x&&<img src={b.img1x} alt="" width={160} height={25}/>}</span><b>{b.name}</b><small data-on={b.enabled||undefined}>{b.enabled?'On':'Off'}</small><small>{where(b,names)}</small></summary>
    <div className="ads-form">
     <label className="ads-row"><input type="checkbox" checked={b.enabled} onChange={e=>setB(i,{enabled:e.target.checked})}/> This banner is on</label>
     <div className="ads-grid">
      <label>Name<input value={b.name} onChange={e=>setB(i,{name:e.target.value})}/></label>
      <label>Id (a–z, 0–9, dashes — fixed once saved)<input value={b.id} onChange={e=>setB(i,{id:e.target.value.toLowerCase()})} readOnly={initial.banners.some(x=>x.id===b.id&&b.id!=='')}/></label>
      <label>Link (opens in a new tab)<input type="url" value={b.href} onChange={e=>setB(i,{href:e.target.value})}/></label>
      <label>Alt text<input value={b.alt} onChange={e=>setB(i,{alt:e.target.value})}/></label>
      <label>Image 1× (320×50)<input value={b.img1x} onChange={e=>setB(i,{img1x:e.target.value})} placeholder="/ads/name-1x.webp"/></label>
      <label>Image 2× (640×100)<input value={b.img2x} onChange={e=>setB(i,{img2x:e.target.value})} placeholder="/ads/name-2x.webp"/></label>
     </div>
     {b.img1x&&<p><img src={b.img2x||b.img1x} alt="Preview" width={320} height={50} className="ads-preview"/></p>}

     <fieldset><legend>Who sees it</legend>
      <label className="ads-row"><input type="radio" name={`aud${i}`} checked={b.audience==='all'} onChange={()=>setB(i,{audience:'all'})}/> Everyone</label>
      <label className="ads-row"><input type="radio" name={`aud${i}`} checked={b.audience==='israel'} onChange={()=>setB(i,{audience:'israel'})}/> Israeli visitors only (by the visitor’s country)</label>
      <label className="ads-row"><input type="radio" name={`aud${i}`} checked={b.audience==='greece'} onChange={()=>setB(i,{audience:'greece'})}/> Greek visitors, plus everyone on the clubs chosen below</label>
     </fieldset>
     <fieldset><legend>Where it appears</legend>
      <div className="ads-chips">
       <label><input type="checkbox" checked={b.targeting.home} onChange={e=>setT(i,{home:e.target.checked})}/> Home page</label>
       <label><input type="checkbox" checked={b.targeting.allClubs} onChange={e=>setT(i,{allClubs:e.target.checked})}/> Every club</label>
       <label><input type="checkbox" checked={b.targeting.other} onChange={e=>setT(i,{other:e.target.checked})}/> All other pages</label>
      </div>
      {!b.targeting.allClubs&&<div className="ads-chips" role="group" aria-label="Clubs">{clubs.map(c=><label key={c.id}><input type="checkbox" checked={b.targeting.clubs.includes(c.id)} onChange={e=>setT(i,{clubs:e.target.checked?[...b.targeting.clubs,c.id]:b.targeting.clubs.filter(x=>x!==c.id)})}/> {c.name}</label>)}</div>}
      <label>Extra page paths (one per line, e.g. /market)<textarea rows={2} value={b.targeting.paths.join('\n')} onChange={e=>setT(i,{paths:lines(e.target.value)})}/></label>
      <label>Never on these paths<textarea rows={2} value={b.targeting.exclude.join('\n')} onChange={e=>setT(i,{exclude:lines(e.target.value)})}/></label>
     </fieldset>
     <fieldset><legend>When (Israel time)</legend>
      <div className="ads-grid">
       <label>Starts<input type="datetime-local" value={local(b.startsAt)} onChange={e=>setB(i,{startsAt:iso(e.target.value)})}/></label>
       <label>Ends<input type="datetime-local" value={local(b.endsAt)} onChange={e=>setB(i,{endsAt:iso(e.target.value)})}/></label>
       <label>From hour<select value={b.fromHour} onChange={e=>setB(i,{fromHour:Number(e.target.value)})}>{HOURS.map(h=><option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}</select></label>
       <label>Until hour<select value={b.toHour} onChange={e=>setB(i,{toHour:Number(e.target.value)})}>{HOURS.map(h=><option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}</select></label>
      </div>
      <div className="ads-chips" role="group" aria-label="Days">{DAYS.map((d,k)=><label key={d}><input type="checkbox" checked={b.days.includes(k)} onChange={e=>setB(i,{days:e.target.checked?[...b.days,k].sort():b.days.filter(x=>x!==k)})}/> {d}</label>)}</div>
      <p className="desk-fine">No day ticked = every day. From = Until = all day. 22:00 → 06:00 runs through midnight.</p>
     </fieldset>
     <fieldset><legend>Timing and rotation</legend>
      <div className="ads-grid">
       <label>Appears after (s) — blank = global<input type="number" min={0} max={120} value={b.delaySec??''} onChange={e=>setB(i,{delaySec:e.target.value===''?null:Number(e.target.value)})}/></label>
       <label>Stays for (s) — blank = global<input type="number" min={2} max={60} value={b.showSec??''} onChange={e=>setB(i,{showSec:e.target.value===''?null:Number(e.target.value)})}/></label>
       <label>Weight (higher shows more)<input type="number" min={0} max={100} value={b.weight} onChange={e=>setB(i,{weight:Number(e.target.value)})}/></label>
       <label>Most per visit (0 = no limit)<input type="number" min={0} max={50} value={b.maxPerSession} onChange={e=>setB(i,{maxPerSession:Number(e.target.value)})}/></label>
       <label>Most per day, per device (0 = no limit)<input type="number" min={0} max={200} value={b.maxPerDay} onChange={e=>setB(i,{maxPerDay:Number(e.target.value)})}/></label>
       <label>Rest after showing (minutes)<input type="number" min={0} max={10080} value={b.cooldownMin} onChange={e=>setB(i,{cooldownMin:Number(e.target.value)})}/></label>
      </div>
     </fieldset>
     <label>Notes (only you see this)<textarea rows={2} value={b.note} onChange={e=>setB(i,{note:e.target.value})}/></label>
     <p className="desk-actions">
      <button type="button" className="desk-btn ghost min-h-tap" onClick={()=>edit(d=>({...d,banners:[...d.banners,{...b,id:'',name:`${b.name} copy`,enabled:false}]}))}>Duplicate</button>
      <button type="button" className="desk-btn ghost min-h-tap" onClick={()=>{if(window.confirm(`Delete “${b.name}”?`))edit(d=>({...d,banners:d.banners.filter((_,k)=>k!==i)}))}}>Delete</button>
     </p>
    </div>
   </details>)}
   <p className="desk-actions"><button type="button" className="desk-btn ghost min-h-tap" onClick={()=>edit(d=>({...d,banners:[...d.banners,blank()]}))}>Add a banner</button></p>
  </section>

  <div className="ads-save" role="region" aria-label="Save">
   <button type="button" className="desk-btn min-h-tap" disabled={busy||!dirty} onClick={()=>save('Edited advertising')}>{busy?'Saving…':'Save changes'}</button>
   <span role="status" data-ok={msg?.ok||undefined}>{msg?msg.text:dirty?'Unsaved changes':'Everything is saved.'}</span>
  </div>
  {initial.audit.length>0&&<section className="desk-card"><h2 className="desk-h2">Recent changes</h2><ol className="desk-list">{[...doc.audit].reverse().slice(0,10).map((a,i)=><li key={i}>{a.at.slice(0,16).replace('T',' ')} — {a.by}: {a.what}</li>)}</ol></section>}
 </div>
}
