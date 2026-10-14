'use client'
import Link from 'next/link'
import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {Icon} from './Icon'
import type {ContentsGate} from '@/lib/weekly/contents'

export type ContentsItem={href:string;title:string;sub?:string;icon:string;current?:boolean}
export type ContentsClub={id:string;name:string;city:string;crest:string|null;initials:string;href:string;current?:boolean;rival?:boolean}
type Copy={menu:string;title:string;kicker:string;close:string;gates?:string;quick?:string;deep?:string;archive?:string;corner:string;clubs:string;fanlife:string;section:string}

/**
 * THE WEEKLY's menu (rule 124): one button opens the contents page — every section, all thirteen gates, your corner and
 * every club, one tap each. Nothing scrolls sideways. A sheet on a phone, a dropped spread on a desktop; portalled to
 * <body> (a page wrapper is a stacking context), Escape and the scrim close it, focus goes back to the button.
 */
export function Contents({copy,sections,gates,corner,clubs,fanlife,tone='dark',rivalNo,paint}:{copy:Copy;sections:ContentsItem[];gates?:ContentsGate[];corner:ContentsItem[];clubs:ContentsClub[];fanlife:ContentsItem[];tone?:'dark'|'paper';/** the page's rival lock, carried into the portal (rule 95) */rivalNo?:string;/** the page's club tokens, carried into the portal */paint?:Record<string,string>}) {
 const [open,setOpen]=useState(false),btn=useRef<HTMLButtonElement>(null),closeRef=useRef<HTMLButtonElement>(null)
 useEffect(()=>{
  if(!open)return
  const root=document.documentElement,prev=root.style.overflow
  root.style.overflow='hidden';closeRef.current?.focus()
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)}
  window.addEventListener('keydown',key)
  return ()=>{root.style.overflow=prev;window.removeEventListener('keydown',key);btn.current?.focus()}
 },[open])
 const shut=()=>setOpen(false)
 const sheet=open?<>
  <div className="wk-scrim" onClick={shut} aria-hidden="true"/>
  <div className="wk-sheet wk-menu z-[91]" role="dialog" aria-modal="true" aria-labelledby="wk-menu-h">
   <div className="wk-sheet-head">
    <div><p className="wk-banner" style={{fontSize:14}}>{copy.kicker}</p><h2 id="wk-menu-h" className="wk-logo red wk-tilt" style={{fontSize:44}}>{copy.title}</h2></div>
    <button ref={closeRef} type="button" className="wk-icon min-h-tap" onClick={shut} aria-label={copy.close}><Icon name="close"/></button>
   </div>
   <div className="wk-menu-spread">
    <section className="wk-menu-col" aria-label={copy.section}>
     <h3 className="wk-head" style={{fontSize:20}}>{copy.section}</h3>
     <nav className="wk-contents">{sections.map(s=><Link key={s.href} href={s.href} onClick={shut} aria-current={s.current?'page':undefined}>
      <span className="no"><Icon name={s.icon} size={20}/></span><span className="t"><b>{s.title}</b>{s.sub&&<small>{s.sub}</small>}</span><span aria-hidden="true">→</span>
     </Link>)}</nav>
    </section>
    {gates&&gates.length>0&&<section className="wk-menu-col" aria-label={copy.gates}>
     <div className="wk-menu-row"><h3 className="wk-head" style={{fontSize:20}}>{copy.gates}</h3><span className="wk-legend"><span><i style={{background:'var(--mag-vermilion)'}}/>{copy.quick}</span><span><i style={{background:'var(--mag-navy)'}}/>{copy.deep}</span><span><i style={{background:'var(--mag-cyan)'}}/>{copy.archive}</span></span></div>
     <div className="wk-gates">{gates.map(g=>{
      const inner=<><span className="n">{String(g.n).padStart(2,'0')}</span><span style={{minWidth:0}}><b>{g.name}</b>{g.sub&&<small>{g.sub}</small>}</span></>
      return g.href
       ?<Link key={g.key} href={g.href} onClick={shut} className="wk-gate" data-group={g.group} data-beloved={g.beloved||undefined}>{inner}</Link>
       :<span key={g.key} className="wk-gate" data-group={g.group} aria-disabled="true">{inner}</span>
     })}</div>
    </section>}
    <section className="wk-menu-col" aria-label={copy.corner}>
     <h3 className="wk-head" style={{fontSize:20}}>{copy.corner}</h3>
     <nav className="wk-tiles">{corner.map(c=><Link key={c.href} href={c.href} onClick={shut} aria-current={c.current?'page':undefined}><Icon name={c.icon}/><b>{c.title}</b>{c.sub&&<small>{c.sub}</small>}</Link>)}</nav>
     <h3 className="wk-head" style={{fontSize:20,marginTop:14}}>{copy.clubs}</h3>
     <nav className="wk-crests">{clubs.map(c=><Link key={c.id} href={c.href} onClick={shut} className="wk-crest" aria-current={c.current?'true':undefined}>
      {c.crest?<img src={c.crest} alt="" width={44} height={44} data-rival={c.rival||undefined}/>:<span className="mag-badge" aria-hidden="true">{c.initials}</span>}
      <span style={{minWidth:0}}><b>{c.name}</b><small>{c.city}</small></span>
     </Link>)}</nav>
     <h3 className="wk-head" style={{fontSize:20,marginTop:14}}>{copy.fanlife}</h3>
     <nav className="wk-tiles two">{fanlife.map(f=><Link key={f.href} href={f.href} onClick={shut}><Icon name={f.icon}/><b>{f.title}</b>{f.sub&&<small>{f.sub}</small>}</Link>)}</nav>
    </section>
   </div>
  </div>
 </>:null
 return <>
  <button ref={btn} type="button" className={`wk-menu-btn min-h-tap${tone==='paper'?' paper':''}`} onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open}><Icon name="menu"/>{copy.menu}</button>
  {sheet&&typeof document!=='undefined'?createPortal(<div className="wk-portal" data-rival-no={rivalNo||undefined} style={paint}>{sheet}</div>,document.body):null}
 </>
}
