'use client'
import {useMemo,useState,useTransition} from 'react'
import {useRouter} from 'next/navigation'
import {createCareerAction} from '@/app/all-football/fan-league/actions'

export type ClubOption={club:string;name:string;verdict:'PASS'|'WARN'|'BLOCK';held:boolean;reason:string|null;decades:{decade:number;men:number;full:boolean}[]}

/** step 1: a real club (only those ready, and not held by the owner); step 2: the home decade it can field an eleven from */
export function NewCareer({clubs}:{clubs:ClubOption[]}){
 const open=clubs.filter(c=>c.verdict!=='BLOCK'&&!c.held)
 const [club,setClub]=useState(open[0]?.club??''),[decade,setDecade]=useState<number|null>(null)
 const [err,setErr]=useState<string|null>(null),[busy,start]=useTransition(),router=useRouter()
 const cur=useMemo(()=>clubs.find(c=>c.club===club)??null,[club,clubs])
 const d=decade!==null&&cur?.decades.some(x=>x.decade===decade)?decade:(cur?.decades.length?cur.decades.reduce((a,b)=>b.men>a.men?b:a):null)?.decade??null
 const go=()=>{if(!cur||d===null)return;setErr(null);start(async()=>{const r=await createCareerAction(cur.club,d);if(r.ok)router.push(`/all-football/fan-league/career/${r.id}`);else setErr(r.error)})}
 return <section className="flg-new" aria-labelledby="flg-new-h">
  <h2 id="flg-new-h"><span>Start a career</span></h2>
  <fieldset><legend>1 · Your club</legend>
   <ul className="flg-clubs">{clubs.map(c=>{const dis=c.verdict==='BLOCK'||c.held;return <li key={c.club}>
    <button type="button" className="min-h-tap" aria-pressed={club===c.club} disabled={dis} onClick={()=>{setClub(c.club);setDecade(null)}}>
     <b>{c.name}</b><small>{dis?(c.held?'Not open for new careers':c.reason??'Not ready'):`${c.decades.length} decades to start from`}</small>
    </button></li>})}</ul>
  </fieldset>
  {cur&&!cur.held&&cur.verdict!=='BLOCK'?<fieldset><legend>2 · Your home decade</legend>
   <p className="flg-fine">Your first eighteen come from these years — men whose recorded years at {cur.name} touch the decade. A short decade is completed from the nearest years, and the squad says who.</p>
   <ul className="flg-decades">{cur.decades.map(x=><li key={x.decade}><button type="button" className="min-h-tap" aria-pressed={d===x.decade} onClick={()=>setDecade(x.decade)}><b>{x.decade}s</b><small>{x.men} men{x.full?'':' · completed'}</small></button></li>)}</ul>
  </fieldset>:null}
  <p className="flg-actions"><button type="button" className="flg-go min-h-tap" disabled={busy||!cur||d===null} onClick={go}>{busy?'Opening the season…':`Kick off with ${cur?.name??'—'} · ${d??'—'}s`}</button></p>
  {err?<p className="flg-error" role="alert">{err}</p>:null}
 </section>
}
