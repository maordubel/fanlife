'use client'
import {useState} from 'react'
import {useAdminApi} from '@/components/master/adminApi'
import {SETTING_TEXT,type LegendsSettings} from '@/lib/legends/config'
import {ATTR_LABEL,ROLE_ATTRS,type AttrKey} from '@/lib/legends/ratings'
import {Stars} from '@/components/legends/Brand'

/**
 * Control room → Games → ALL FOOTBALL → Legends Manager: the rulebook's proposed values as settings, each club's star
 * calibration, and one man's stars and attributes. A change reaches NEW careers; a season already running keeps its own (S05).
 */
type ClubRow={club:string;name:string;men:number;avgStars:number;fiveStars:number;offset:number;pins:number}
type Player={id:string;name:string;pos:'GK'|'DF'|'MF'|'FW';price:number;stars:number;attrs:Record<string,number>;from:number|null;to:number|null;pin:{stars?:number;attrs?:Record<string,number>;note?:string}|null}
const STEPS=[1,1.25,1.5,1.75,2,2.25,2.5,2.75,3,3.25,3.5,3.75,4,4.25,4.5,4.75,5]
const OFFSETS=[-1,-0.75,-0.5,-0.25,0,0.25,0.5,0.75,1]
export function LegendsControls({settings:s0,clubs:c0}:{settings:LegendsSettings;clubs:ClubRow[]}){
 const api=useAdminApi(),[s,setS]=useState(s0),[clubs,setClubs]=useState(c0),[club,setClub]=useState(c0[0]?.club??''),[q,setQ]=useState(''),[list,setList]=useState<{players:Player[];total:number}|null>(null),[edit,setEdit]=useState<Player|null>(null)
 const save=async(patch:Partial<LegendsSettings>,msg:string)=>{const r=await api.post<LegendsSettings>('legends/settings',{patch},msg);if(r)setS(r)}
 const find=async()=>{const r=await api.get<{players:Player[];total:number}>(`legends/players?club=${encodeURIComponent(club)}&q=${encodeURIComponent(q)}`);if(r)setList(r)}
 const shift=async(c:string,offset:number)=>{const r=await api.post('legends/ratings',{op:'club-offset',club:c,offset},`Club shifted ${offset>0?'+':''}${offset} star.`);if(r)setClubs(clubs.map(x=>x.club===c?{...x,offset}:x))}
 const pin=async(p:Player,stars:number|undefined,attrs:Record<string,number>,note:string)=>{const r=await api.post('legends/ratings',{op:'player',club,id:p.id,stars,attrs,note},`${p.name} pinned.`);if(r){setEdit(null);await find()}}
 const clear=async(p:Player)=>{const r=await api.post('legends/ratings',{op:'clear-player',club,id:p.id},`${p.name} back to his measured stars.`);if(r){setEdit(null);await find()}}
 return <div className="lgc">
  {api.error?<p className="desk-state" data-state="error" role="alert">{api.error}</p>:null}{api.notice?<p className="desk-state" data-state="ok" role="status">{api.notice}</p>:null}
  <section className="desk-sub" aria-labelledby="lgc-set-h"><h3 id="lgc-set-h">Rules you can change</h3>
   <p className="desk-fine">The rulebook left these open (§9); they start at its proposed values. A new career freezes the values of its kick-off.</p>
   <ul className="desk-rows">
    <li><div><b>{SETTING_TEXT.points.label}</b><p>{SETTING_TEXT.points.hint}</p>
     <p className="desk-actions">{([['3 / 1 / 0',{win:3,draw:1,loss:0}],['2 / 1 / 0',{win:2,draw:1,loss:0}]] as const).map(([l,p])=><button key={l} type="button" className="desk-btn ghost min-h-tap" aria-pressed={s.points.win===p.win&&s.points.draw===p.draw} disabled={api.busy} onClick={()=>save({points:{...p}},`Points ${l}.`)}>{l}</button>)}</p></div></li>
    {(['yellowsResetEachSeason','byeCountsForAbsence'] as const).map(k=><li key={k}><span className="desk-stamp" data-ok={s[k]||undefined}>{s[k]?'On':'Off'}</span><div><b>{SETTING_TEXT[k].label}</b><p>{SETTING_TEXT[k].hint}</p>
     <button type="button" role="switch" aria-checked={s[k]} className="desk-btn ghost min-h-tap" disabled={api.busy} onClick={()=>save({[k]:!s[k]},`${SETTING_TEXT[k].label}: ${s[k]?'off':'on'}.`)}>{s[k]?'Turn off':'Turn on'}</button></div></li>)}
    <li><div><b>{SETTING_TEXT.playoffDrawDecider.label}</b><p>{SETTING_TEXT.playoffDrawDecider.hint}</p>
     <p className="desk-actions">{([['extra-time-penalties','Extra time, then penalties'],['penalties','Straight to penalties']] as const).map(([k,l])=><button key={k} type="button" className="desk-btn ghost min-h-tap" aria-pressed={s.playoffDrawDecider===k} disabled={api.busy} onClick={()=>save({playoffDrawDecider:k},l)}>{l}</button>)}</p></div></li>
    {(['marketFeeRate','emergencyCostM','grantLiquidityM'] as const).map(k=>{const opts=k==='marketFeeRate'?[0,0.03,0.05,0.08,0.1]:k==='emergencyCostM'?[0,0.5,1]:[20,30,40,60,80];return <li key={k}><div><b>{SETTING_TEXT[k].label}</b><p>{SETTING_TEXT[k].hint}</p>
     <p className="desk-actions">{opts.map(o=><button key={o} type="button" className="desk-btn ghost min-h-tap" aria-pressed={s[k]===o} disabled={api.busy} onClick={()=>save({[k]:o},`${SETTING_TEXT[k].label}: ${k==='marketFeeRate'?`${Math.round(o*100)}%`:`€${o}M`}.`)}>{k==='marketFeeRate'?`${Math.round(o*100)}%`:`€${o}M`}</button>)}</p></div></li>})}
   </ul>
  </section>
  <section className="desk-sub" aria-labelledby="lgc-clubs-h"><h3 id="lgc-clubs-h">Star calibration by club</h3>
   <p className="desk-fine">Stars are measured inside each club, so every club’s best reach five and leagues stay a contest. Shift a whole club when its legends should stand taller or shorter against the others.</p>
   <ul className="desk-rows">{clubs.map(c=><li key={c.club}><span className="desk-stamp" data-ok={c.offset===0||undefined}>{c.offset===0?'Measured':`${c.offset>0?'+':''}${c.offset}`}</span><div><b><bdi>{c.name}</bdi></b><p>{c.men.toLocaleString('en-GB')} legends · average {c.avgStars.toFixed(2)} stars · {c.fiveStars} at 4¾–5 · {c.pins} pinned</p>
    <label className="desk-fine">Shift <select className="min-h-tap" value={c.offset} disabled={api.busy} onChange={e=>void shift(c.club,Number(e.target.value))}>{OFFSETS.map(o=><option key={o} value={o}>{o>0?'+':''}{o} star</option>)}</select></label></div></li>)}</ul>
  </section>
  <section className="desk-sub" aria-labelledby="lgc-men-h"><h3 id="lgc-men-h">One legend</h3>
   <form className="desk-actions" onSubmit={e=>{e.preventDefault();void find()}}>
    <select className="min-h-tap" value={club} onChange={e=>{setClub(e.target.value);setList(null)}} aria-label="Club">{clubs.map(c=><option key={c.club} value={c.club}>{c.name}</option>)}</select>
    <input className="min-h-tap" value={q} onChange={e=>setQ(e.target.value)} placeholder="Name" aria-label="Name"/>
    <button type="submit" className="desk-btn min-h-tap" disabled={api.busy}>Find</button>
   </form>
   {list?<><p className="desk-fine">{list.total.toLocaleString('en-GB')} men{list.total>list.players.length?` — the first ${list.players.length} by stars`:''}.</p>
    <ul className="desk-rows">{list.players.map(p=><li key={p.id}><span className="desk-stamp" data-ok={!p.pin||undefined}>{p.pin?'Pinned':p.pos}</span><div><b><bdi>{p.name}</bdi></b> <Stars value={p.stars} size="sm"/>
     <p>{p.pos} · €{p.price}M · {p.from&&p.to?`${p.from}–${p.to}`:'years not recorded'} · {ROLE_ATTRS[p.pos].map(k=>`${ATTR_LABEL[k as AttrKey]} ${p.attrs[k]}`).join(' · ')}</p>
     {edit?.id===p.id?<PinForm p={p} busy={api.busy} onSave={(st,at,n)=>void pin(p,st,at,n)} onClear={()=>void clear(p)}/>:<button type="button" className="desk-btn ghost min-h-tap" onClick={()=>setEdit(p)}>Set stars</button>}</div></li>)}</ul></>:null}
  </section>
 </div>
}
function PinForm({p,busy,onSave,onClear}:{p:Player;busy:boolean;onSave:(stars:number|undefined,attrs:Record<string,number>,note:string)=>void;onClear:()=>void}){
 const [stars,setStars]=useState<number|''>(p.pin?.stars??''),[attrs,setAttrs]=useState<Record<string,number>>({...(p.pin?.attrs??{})}),[note,setNote]=useState(p.pin?.note??'')
 return <div className="lgc-pin">
  <label>Stars <select className="min-h-tap" value={stars} onChange={e=>setStars(e.target.value?Number(e.target.value):'')}><option value="">Measured ({p.stars})</option>{STEPS.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
  {ROLE_ATTRS[p.pos].map(k=><label key={k}>{ATTR_LABEL[k as AttrKey]} <select className="min-h-tap" value={attrs[k]??''} onChange={e=>{const n={...attrs};if(e.target.value)n[k]=Number(e.target.value);else delete n[k];setAttrs(n)}}><option value="">Measured ({p.attrs[k]})</option>{STEPS.map(x=><option key={x} value={x}>{x}</option>)}</select></label>)}
  <label>Why <input className="min-h-tap" value={note} onChange={e=>setNote(e.target.value)} placeholder="A line for the audit log"/></label>
  <p className="desk-actions"><button type="button" className="desk-btn min-h-tap" disabled={busy||(stars===''&&!Object.keys(attrs).length)} onClick={()=>onSave(stars===''?undefined:stars,attrs,note)}>Pin</button>{p.pin?<button type="button" className="desk-btn ghost min-h-tap" disabled={busy} onClick={onClear}>Back to measured</button>:null}</p>
 </div>
}
