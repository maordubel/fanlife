'use client'
import Link from 'next/link'
import {useEffect,useId,useRef,useState,type CSSProperties} from 'react'
import {Badge} from '@/components/clubs/Badge'
import s from './rumble.module.css'

export type RivalOpt={id:string;name:string;sub:string|null;ok:boolean;href:string;style?:Record<string,string>;pattern?:string;initials?:string;kind:'club'|'same'|'random'}
export type RivalCopy={label:string;pick:string;unavailable:string;close:string;same:string;random:string;vs:string}

/**
 * Who do you face? A drop-down that is a show in itself: the two crests across a VS, and a panel of club cards that drops open — each in
 * its own colours, with the reason on the ones that cannot play. Everything is a plain link (no state to lose, the URL is the choice).
 * Esc and a click outside close it; arrow keys move between cards.
 */
export function RivalPicker({me,current,options,copy}:{me:{id:string;name:string;pattern?:string;initials?:string};current:string;options:RivalOpt[];copy:RivalCopy}){
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),uid=useId()
 const now=options.find(o=>o.id===current)??options[0]!
 useEffect(()=>{
  if(!open)return
  const key=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){setOpen(false);root.current?.querySelector<HTMLButtonElement>('button[aria-haspopup]')?.focus()}
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){const cards=[...root.current?.querySelectorAll<HTMLAnchorElement>('a[data-rival]')??[]];const i=cards.indexOf(document.activeElement as HTMLAnchorElement);if(cards.length){e.preventDefault();cards[(i+(e.key==='ArrowDown'?1:-1)+cards.length)%cards.length]!.focus()}}
  }
  const down=(e:MouseEvent)=>{if(root.current&&!root.current.contains(e.target as Node))setOpen(false)}
  window.addEventListener('keydown',key);window.addEventListener('mousedown',down)
  return()=>{window.removeEventListener('keydown',key);window.removeEventListener('mousedown',down)}
 },[open])
 const face=(o:{id:string;kind:string;pattern?:string;initials?:string;name:string})=>o.kind==='random'?<span className={s.rpDice} aria-hidden="true"><svg viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="24" rx="5" fill="none" stroke="currentColor" strokeWidth="2.5"/>{[[11,11],[21,11],[16,16],[11,21],[21,21]].map(([x,y])=><circle key={`${x}${y}`} cx={x} cy={y} r="2.2" fill="currentColor"/>)}</svg></span>:<Badge club={{id:o.kind==='same'?me.id:o.id,pattern:o.pattern??me.pattern,initials:o.initials??me.initials}} className={s.rpCrest}/>
 return <div className={s.rp} ref={root} data-open={open||undefined}>
  <p className={`${s.mono} ${s.vsHead}`}>{copy.label}</p>
  <button type="button" className={`${s.rpBar} min-h-tap`} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${uid}-panel`} onClick={()=>setOpen(o=>!o)} data-testid="rumble-rival-open">
   <span className={s.rpSide}><Badge club={me} className={s.rpCrest}/><b dir="auto">{me.name}</b></span>
   <span className={s.rpVs} aria-hidden="true">{copy.vs}</span>
   <span className={s.rpSide} style={now.style as CSSProperties}>{face(now)}<b dir="auto">{now.name}</b></span>
   <span className={s.rpChev} aria-hidden="true">▾</span>
  </button>
  <div id={`${uid}-panel`} className={s.rpPanel} role="listbox" aria-label={copy.pick} hidden={!open}>
   <ul>
    {options.map(o=><li key={o.id}>{o.ok
     ?<Link data-rival href={o.href} scroll={false} role="option" aria-selected={o.id===current} className={`${s.rpCard} min-h-tap`} style={o.style as CSSProperties} data-kind={o.kind} onClick={()=>setOpen(false)}><span className={s.rpFace}>{face(o)}</span><b dir="auto">{o.name}</b>{o.sub&&<small>{o.sub}</small>}</Link>
     :<span role="option" aria-disabled="true" aria-selected={false} className={`${s.rpCard} ${s.rpOff}`} style={o.style as CSSProperties}><span className={s.rpFace}>{face(o)}</span><b dir="auto">{o.name}</b><small>{copy.unavailable.replace('{reason}',o.sub??'—')}</small></span>}</li>)}
   </ul>
   <button type="button" className={`${s.rpClose} min-h-tap`} onClick={()=>setOpen(false)}>{copy.close}</button>
  </div>
 </div>
}
