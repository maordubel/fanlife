'use client'
import {useEffect,useRef,useState,type ReactNode} from 'react'
import {createPortal} from 'react-dom'

/**
 * One sheet for every popup of a career (owner, 12.10.2026: "click by click, less scrolling"). On a phone it rises from the
 * bottom and fills the glass; on a desk it is a card in the middle. Escape and the backdrop close it unless `locked` (a
 * decision that must be taken — the half-time talk, the board's news). Rule 33: above the navigation, always — and portalled to
 * the body, because a page wrapper with a transform would otherwise pin a `position: fixed` sheet to itself.
 */
export function Portal({children}:{children:ReactNode}){
 // the career's tokens (.lgm) and the club's livery (inline on the career's <main>) travel with the portal
 const [at,setAt]=useState<{el:HTMLElement;style:string}|null>(null)
 useEffect(()=>{setAt({el:document.body,style:document.querySelector<HTMLElement>('main.lgm')?.getAttribute('style')??''})},[])
 if(!at)return null
 return createPortal(<div className="lgm lgm-in lgm-portal" dir="ltr" lang="en" ref={n=>{if(n&&at.style)n.setAttribute('style',at.style)}}>{children}</div>,at.el)
}
export function Sheet({title,kicker,onClose,locked=false,tone='paper',children,wide=false,id}:{title:ReactNode;kicker?:ReactNode;onClose?:()=>void;locked?:boolean;tone?:'paper'|'night';children:ReactNode;wide?:boolean;id:string}){
 const box=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  const prev=document.activeElement as HTMLElement|null
  box.current?.focus()
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!locked)onClose?.()}
  window.addEventListener('keydown',key);const o=document.body.style.overflow;document.body.style.overflow='hidden'
  return()=>{window.removeEventListener('keydown',key);document.body.style.overflow=o;prev?.focus?.()}
 },[locked,onClose])
 return <Portal><div className="lgm-sheet z-[60]" role="dialog" aria-modal="true" aria-labelledby={`${id}-h`} data-tone={tone} onClick={e=>{if(e.target===e.currentTarget&&!locked)onClose?.()}}>
  <div className="lgm-sheet-card" data-wide={wide||undefined} ref={box} tabIndex={-1}>
   <header className="lgm-sheet-head">
    <div>{kicker?<p className="lgm-kicker">{kicker}</p>:null}<h2 id={`${id}-h`}>{title}</h2></div>
    {onClose&&!locked?<button type="button" className="lgm-x min-h-tap" onClick={onClose} aria-label="Close">×</button>:null}
   </header>
   <div className="lgm-sheet-body">{children}</div>
  </div>
 </div></Portal>
}
/** a club's colours as a little shirt chip, from the server's kit list */
export function KitChip({c,size=22}:{c?:{shirt:string;second:string|null;pattern:string};size?:number}){
 if(!c)return null
 const bg=c.second&&c.pattern!=='plain'?(c.pattern==='stripes'?`repeating-linear-gradient(90deg,${c.shirt} 0 3px,${c.second} 3px 6px)`:c.pattern==='hoops'?`repeating-linear-gradient(180deg,${c.shirt} 0 3px,${c.second} 3px 6px)`:`linear-gradient(90deg,${c.shirt} 0 50%,${c.second} 50% 100%)`):c.shirt
 return <i className="lgm-kitchip" style={{background:bg,inlineSize:size,blockSize:size*0.8}} aria-hidden="true"/>
}
