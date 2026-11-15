'use client'
import {useState,type PointerEvent} from 'react'
import {createPortal} from 'react-dom'

type Pic={src:string;label?:string|null}
type Copy={zoom:string;close:string;pick:string;of:string}
/**
 * THE PRODUCT'S PICTURES (owner, 15.11.2026: "switch which picture is large, a magnifying glass, the first look always live").
 * One large picture — the live mock-up first (lib/shop/build mockups) — and the others as thumbnails that wrap (never a sideways
 * strip). The glass: on a mouse, hovering the large picture magnifies where the pointer is; on a phone, the 🔍 (or a tap) opens
 * the picture full-screen, where a finger on it moves the magnified spot. ← → step through the pictures.
 */
export function Gallery({pics,alt,copy}:{pics:Pic[];alt:string;copy:Copy}){
 const [i,setI]=useState(0),[full,setFull]=useState(false),[at,setAt]=useState<{x:number;y:number}|null>(null)
 const pic=pics[i]??pics[0]!,n=pics.length
 const move=(e:PointerEvent<HTMLElement>)=>{const r=e.currentTarget.getBoundingClientRect();setAt({x:Math.min(100,Math.max(0,(e.clientX-r.left)/r.width*100)),y:Math.min(100,Math.max(0,(e.clientY-r.top)/r.height*100))})}
 const step=(d:number)=>{setI(x=>(x+d+n)%n);setAt(null)}
 const lens=(big:boolean)=>at?{transform:`scale(${big?2.6:2.2})`,transformOrigin:`${at.x}% ${at.y}%`}:undefined
 return <div className="wks-gal" onKeyDown={e=>{if(e.key==='ArrowRight')step(1);if(e.key==='ArrowLeft')step(-1);if(e.key==='Escape')setFull(false)}}>
  <figure className="wks-gal-main" onPointerMove={e=>{if(e.pointerType==='mouse')move(e)}} onPointerLeave={()=>setAt(null)}>
   <button type="button" className="wks-gal-hit" aria-label={copy.zoom} onClick={()=>{setAt(null);setFull(true)}}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={pic.src} alt={i===0?alt:''} width={1024} height={1024} style={lens(false)} fetchPriority={i===0?'high':'auto'}/>
   </button>
   {pic.label?<figcaption>{pic.label}</figcaption>:null}
   <span className="wks-gal-glass" aria-hidden="true">🔍</span>
   {n>1?<span className="wks-gal-count" aria-hidden="true">{i+1}/{n}</span>:null}
  </figure>
  {n>1?<ul className="wks-gal-thumbs" aria-label={copy.pick}>{pics.map((p,j)=><li key={p.src}>
   <button type="button" className="min-h-tap" aria-pressed={j===i} aria-label={copy.of.replace('{n}',String(j+1)).replace('{total}',String(n))} onClick={()=>{setI(j);setAt(null)}}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={p.src} alt="" width={160} height={160} loading="lazy"/>
   </button></li>)}</ul>:null}
  {full?createPortal(<div className="wks-gal-full z-[95]" role="dialog" aria-modal="true" aria-label={alt}>
   <div className="wks-gal-stage" onPointerDown={move} onPointerMove={e=>{if(e.pointerType!=='mouse'&&e.buttons===0)return;move(e)}} onPointerUp={e=>{if(e.pointerType!=='mouse')setAt(null)}} onPointerLeave={()=>setAt(null)} style={{touchAction:'none'}}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={pic.src} alt="" width={1024} height={1024} style={lens(true)}/>
   </div>
   <div className="wks-gal-bar">
    {n>1?<button type="button" className="min-h-tap" aria-label="‹" onClick={()=>step(-1)}>‹</button>:null}
    <span>{i+1}/{n}</span>
    {n>1?<button type="button" className="min-h-tap" aria-label="›" onClick={()=>step(1)}>›</button>:null}
    <button type="button" className="min-h-tap wks-gal-x" autoFocus onClick={()=>{setFull(false);setAt(null)}}>{copy.close} ✕</button>
   </div>
  </div>,document.body):null}
 </div>
}
