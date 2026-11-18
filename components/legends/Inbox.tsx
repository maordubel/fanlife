'use client'
import {useEffect,useMemo,useState} from 'react'
import type {InboxFrom,InboxItem} from '@/lib/legends/inbox'

/**
 * THE INBOX screen (18.11.2026, "an INBOX and news like the real manager"): the desk's messages, newest first, each from a named
 * desk (board, assistant, physio, scouts, press, league, transfers). A tap opens the message and its one action. What was read is
 * remembered in this browser, per career (light per-viewer state — try/catch, so a browser without storage just shows all as new).
 */
const FROM:Record<InboxFrom,{label:string;icon:string}>={
 board:{label:'The board',icon:'M4 20h16M6 20V10l6-5 6 5v10M10 20v-5h4v5'},
 assistant:{label:'Assistant manager',icon:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6'},
 physio:{label:'Medical room',icon:'M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z'},
 scouts:{label:'Scouting desk',icon:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l5 5'},
 press:{label:'The press',icon:'M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5'},
 league:{label:'League office',icon:'M8 4h8v4a4 4 0 0 1-8 0zM12 12v4M8 20h8M9 16h6v4H9z'},
 transfers:{label:'Transfer desk',icon:'M4 9h13l-3-3M20 15H7l3 3'},
}
const key=(career:string)=>`lgm-inbox-read:${career}`
export function useInboxRead(career:string,items:readonly InboxItem[]){
 const [read,setRead]=useState<Set<string>>(()=>new Set())
 useEffect(()=>{try{const raw=window.localStorage.getItem(key(career));if(raw)setRead(new Set(JSON.parse(raw) as string[]))}catch{/* no storage here */}},[career])
 const mark=(ids:readonly string[])=>setRead(prev=>{const next=new Set(prev);for(const id of ids)next.add(id);try{window.localStorage.setItem(key(career),JSON.stringify([...next].slice(-300)))}catch{/* no storage */}return next})
 const unread=items.filter(i=>!read.has(i.id)).length
 return {read,mark,unread}
}
export function Inbox({items,read,mark,go}:{items:readonly InboxItem[];read:Set<string>;mark:(ids:readonly string[])=>void;go:(to:NonNullable<InboxItem['to']>)=>void}){
 const [open,setOpen]=useState<string|null>(items.find(i=>!read.has(i.id))?.id??items[0]?.id??null)
 const fresh=useMemo(()=>items.filter(i=>!read.has(i.id)).length,[items,read])
 useEffect(()=>{if(open)mark([open])},[open]) // eslint-disable-line react-hooks/exhaustive-deps -- opening a message reads it
 if(!items.length)return <section className="lgm-panel lgm-inbox" data-testid="legends-inbox"><h2>Inbox</h2><p className="lgm-fine">Nothing yet. The desk writes once the season starts.</p></section>
 return <section className="lgm-panel lgm-inbox" data-testid="legends-inbox" aria-labelledby="lgm-inbox-h">
  <header className="lgm-inbox-head"><h2 id="lgm-inbox-h">Inbox</h2>{fresh?<button type="button" className="lgm-link min-h-tap" onClick={()=>mark(items.map(i=>i.id))}>Mark all read · {fresh}</button>:<span className="lgm-fine">All read</span>}</header>
  <ul className="lgm-inbox-list">
   {items.map(i=>{const f=FROM[i.from],isOpen=open===i.id,isNew=!read.has(i.id)
    return <li key={i.id} data-tone={i.tone} data-new={isNew||undefined} data-open={isOpen||undefined}>
     <button type="button" className="lgm-inbox-row min-h-tap" aria-expanded={isOpen} onClick={()=>setOpen(isOpen?null:i.id)}>
      <span className="lgm-inbox-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d={f.icon}/></svg></span>
      <span className="lgm-inbox-txt"><small>{f.label}{isNew?<i className="lgm-inbox-new">New</i>:null}</small><b>{i.title}</b></span>
     </button>
     {isOpen?<div className="lgm-inbox-body"><p>{i.body}</p>{i.to&&i.cta?<p className="lgm-actions"><button type="button" className="lgm-go min-h-tap" onClick={()=>go(i.to!)}>{i.cta}</button></p>:null}</div>:null}
    </li>})}
  </ul>
 </section>
}
