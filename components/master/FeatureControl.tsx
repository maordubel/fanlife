'use client'
import {useState} from 'react'
import {EXPERIENCE_GATES,FEATURE_TEXT,type ExperienceGate,type Features} from '@/lib/features'

const GATE_LABEL:Record<ExperienceGate,string>={trivia:'Gate 2 · Trivia',timeline:'Gate 13 · Timeline',memory:'Gate 6 · Memory'}
/**
 * Control room → Settings → Features (ADR-fanlife-0012). Each switch opens a door for fans; while it is off only your
 * owner session can walk in ("owner preview"). Switching off never deletes a season, an invite or a pool.
 */
export function FeatureControl({initial,api}:{initial:Features;api:{busy:boolean;post:<T>(action:string,data?:unknown,message?:string)=>Promise<T|null>}}){
 const [f,setF]=useState(initial)
 const save=async(patch:Partial<Features>,msg:string)=>{const r=await api.post<Features>('features',{patch},msg);if(r)setF(r)}
 const row=(k:'allFootball'|'fanLeague'|'friendlies',extra?:React.ReactNode)=><li key={k} data-durable={f[k]?'yes':'no'}><span className="desk-stamp">{f[k]?'On':'Off'}</span><div>
  <b>{FEATURE_TEXT[k].label}</b><p>{FEATURE_TEXT[k].hint}</p>
  <p className="desk-fine">{f[k]?'Open to every visitor.':'Off for fans. Your owner session can already play it (marked “Owner preview”).'}{f.updatedAt?` Last change ${new Date(f.updatedAt).toLocaleString('en-GB')}.`:''}</p>
  {extra}
  <button type="button" className="min-h-tap button" role="switch" aria-checked={f[k]} disabled={api.busy||(k==='friendlies'&&!f.fanLeague&&!f.friendlies)} onClick={()=>save({[k]:!f[k]},`${FEATURE_TEXT[k].label} switched ${f[k]?'off':'on'}.`)}>{f[k]?`Turn ${FEATURE_TEXT[k].label} off`:`Turn ${FEATURE_TEXT[k].label} on`}</button>
  {k==='friendlies'&&!f.fanLeague&&!f.friendlies?<p className="desk-fine">Friendlies need FAN LEAGUE on first — a friendly is two careers meeting.</p>:null}
 </div></li>
 return <section className="desk-sub" aria-labelledby="feat-h">
  <h2 id="feat-h">Features</h2>
  <ul className="desk-rows">
   {row('allFootball',<fieldset className="crm-gates"><legend>Gates in ALL FOOTBALL</legend>{EXPERIENCE_GATES.map(g=><label key={g} className="pcc-chip" data-on={f.allFootballGates.includes(g)||undefined}><input type="checkbox" className="sr-only" checked={f.allFootballGates.includes(g)} disabled={api.busy} onChange={()=>{const next=f.allFootballGates.includes(g)?f.allFootballGates.filter(x=>x!==g):[...f.allFootballGates,g];void save({allFootballGates:next},'Gates saved.')}}/>{GATE_LABEL[g]}</label>)}</fieldset>)}
   {row('fanLeague')}
   {row('friendlies')}
  </ul>
 </section>
}
