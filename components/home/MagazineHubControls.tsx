'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import type {HubClub} from '@/lib/home/hub-model'
export type ChooserCopy={title:string;search:string;close:string;none:string;workshop:string;partial:string}
/** A trigger (teaser or section card) that opens an accessible chooser of REAL clubs for one gate. */
export function GateChooser({gate,clubs,copy,className,children,life,label}:{gate:string;clubs:HubClub[];copy:ChooserCopy;className?:string;children:React.ReactNode;life?:Record<string,string|null>;label?:string}){
 const [open,setOpen]=useState(false),[q,setQ]=useState(''),ref=useRef<HTMLDialogElement>(null),from=useRef<HTMLElement|null>(null),input=useRef<HTMLInputElement>(null)
 useEffect(()=>{const d=ref.current;if(!d)return;if(open&&!d.open){d.showModal();input.current?.focus()}if(!open&&d.open)d.close()},[open])
 const close=()=>{setOpen(false);setQ('');from.current?.focus()}
 const hits=clubs.filter(c=>`${c.name} ${c.city}`.toLocaleLowerCase().includes(q.trim().toLocaleLowerCase()))
 const hrefOf=(c:HubClub)=>gate==='life'?life?.[c.id]??null:c.gates[gate]?.href??null
 return <>
  <button type="button" className={`min-h-tap ${className||""}`} aria-haspopup="dialog" aria-label={label} onClick={e=>{from.current=e.currentTarget;setOpen(true)}}>{children}</button>
  <dialog ref={ref} className="mag-chooser" aria-labelledby={`ch-${gate}`} onCancel={e=>{e.preventDefault();close()}} onClose={()=>open&&close()}>
   <div className="mag-chooser-in">
    <div className="mag-chooser-head"><h2 id={`ch-${gate}`}>{copy.title}</h2><button type="button" className="mag-chooser-x min-h-tap" onClick={close} aria-label={copy.close}>×</button></div>
    <input ref={input} className="mag-chooser-q" type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder={copy.search} aria-label={copy.search}/>
    <ul>{hits.map(c=>{const h=hrefOf(c);return <li key={c.id}>{h?<Link href={h} onClick={()=>setOpen(false)}><b><bdi>{c.name}</bdi></b><small><bdi>{c.city}</bdi></small><span aria-hidden="true">→</span></Link>:<span className="off"><b><bdi>{c.name}</bdi></b><small>{copy.workshop}</small></span>}</li>})}</ul>
    {hits.length===0&&<p>{copy.none}</p>}
   </div>
  </dialog>
 </>
}
