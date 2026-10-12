'use client'
import {useEffect,useId,useRef,useState} from 'react'
import {useRouter} from 'next/navigation'

type Hit={kind:'club'|'player'|'gate'|'experience'|'area';id:string;title:string;sub:string;href:string}
const KIND:Record<Hit['kind'],string>={club:'Club',player:'Player',gate:'Gate',experience:'Experience',area:'Desk'}

/**
 * The desk's one search box (CRM 2 §4.2): "/" focuses it, Escape closes it, arrows move, Enter opens. Debounced, and a
 * newer keystroke aborts the older request, so results never arrive out of order. On a phone it is a button that opens
 * the field over the top bar.
 */
export function DeskSearch({club}:{club:string|null}){
 const router=useRouter(),id=useId(),input=useRef<HTMLInputElement>(null),box=useRef<HTMLDivElement>(null)
 const [q,setQ]=useState(''),[hits,setHits]=useState<Hit[]>([]),[state,setState]=useState<'idle'|'loading'|'done'|'error'>('idle'),[at,setAt]=useState(0),[open,setOpen]=useState(false),[wide,setWide]=useState(false)
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{const t=e.target as HTMLElement|null;if(e.key==='/'&&!e.metaKey&&!e.ctrlKey&&!(t&&(t.isContentEditable||/^(input|textarea|select)$/i.test(t.tagName)))){e.preventDefault();setWide(true);requestAnimationFrame(()=>input.current?.focus())}}
  const out=(e:MouseEvent)=>{if(box.current&&!box.current.contains(e.target as Node))setOpen(false)}
  document.addEventListener('keydown',key);document.addEventListener('mousedown',out)
  return ()=>{document.removeEventListener('keydown',key);document.removeEventListener('mousedown',out)}
 },[])
 useEffect(()=>{
  const term=q.trim();if(term.length<2){setHits([]);setState('idle');return}
  const ctl=new AbortController(),t=setTimeout(async()=>{
   setState('loading')
   try{const p=new URLSearchParams({q:term});if(club)p.set('club',club);const r=await fetch('/api/master/search?'+p,{signal:ctl.signal,cache:'no-store'});if(!r.ok)throw new Error(String(r.status));const d=await r.json() as {hits:Hit[]};setHits(d.hits);setAt(0);setState('done')}
   catch(e){if((e as Error).name!=='AbortError')setState('error')}
  },300)
  return ()=>{clearTimeout(t);ctl.abort()}
 },[q,club])
 const go=(h:Hit)=>{setOpen(false);setWide(false);router.push(h.href)}
 const onKey=(e:React.KeyboardEvent)=>{
  if(e.key==='Escape'){setOpen(false);setWide(false);input.current?.blur();return}
  if(!hits.length)return
  if(e.key==='ArrowDown'){e.preventDefault();setAt(i=>Math.min(hits.length-1,i+1))}
  if(e.key==='ArrowUp'){e.preventDefault();setAt(i=>Math.max(0,i-1))}
  if(e.key==='Enter'){e.preventDefault();go(hits[at]!)}
 }
 const showList=open&&q.trim().length>=2
 return <div className="desk-search" ref={box} data-wide={wide||undefined}>
  <button type="button" className="desk-search-open min-h-tap" aria-label="Search the desk" onClick={()=>{setWide(true);requestAnimationFrame(()=>input.current?.focus())}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></svg></button>
  <label className="desk-search-field"><span className="sr-only">Search clubs, players, gates</span>
   <input ref={input} type="search" value={q} placeholder="Search clubs, players, gates…   /" autoComplete="off" spellCheck={false}
    role="combobox" aria-expanded={showList} aria-controls={`${id}-list`} aria-activedescendant={showList&&hits[at]?`${id}-${at}`:undefined}
    onChange={e=>{setQ(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)} onKeyDown={onKey}/>
  </label>
  {showList&&<div className="desk-search-pop">
   {state==='loading'&&!hits.length?<p className="desk-search-note" role="status">Searching…</p>:null}
   {state==='error'?<p className="desk-search-note" role="alert">Search is unavailable right now. Nothing is lost — try again.</p>:null}
   {state==='done'&&!hits.length?<p className="desk-search-note" role="status">No club, player or gate matches “<bdi>{q.trim()}</bdi>”.</p>:null}
   {hits.length>0&&<ul id={`${id}-list`} role="listbox" aria-label="Results">{hits.map((h,i)=><li key={h.kind+h.id} id={`${id}-${i}`} role="option" aria-selected={i===at} onMouseEnter={()=>setAt(i)} onMouseDown={e=>{e.preventDefault();go(h)}}>
    <span className="desk-stamp">{KIND[h.kind]}</span><span><b><bdi>{h.title}</bdi></b><small><bdi>{h.sub}</bdi></small></span></li>)}</ul>}
  </div>}
 </div>
}
