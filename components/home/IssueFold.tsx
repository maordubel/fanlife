'use client'
import {useEffect,useState} from 'react'
/**
 * The phone's fold (owner, 12.11.2026: "too much, too long — an average fan gets lost"). On a phone the hub and a club's
 * home show the hook and the doors; everything marked `data-fold` waits behind this one button. Nothing is removed — a
 * desktop still prints the whole spread, and a link to a folded section (#suggest) opens the fold by itself.
 */
export function IssueFold({more,less,scope}:{more:string;less:string;scope:string}){
 const [open,setOpen]=useState(false)
 useEffect(()=>{const el=document.querySelector(scope);if(el)(el as HTMLElement).dataset.full=open?'1':'';},[open,scope])
 useEffect(()=>{const check=()=>{const id=location.hash.slice(1);if(id&&document.getElementById(id)?.closest('[data-fold]'))setOpen(true)};check();addEventListener('hashchange',check);return ()=>removeEventListener('hashchange',check)},[])
 return <button type="button" className="wk-btn paper wk-fold-btn min-h-tap" aria-expanded={open} onClick={()=>setOpen(o=>!o)}>{open?less:more} <span aria-hidden="true">{open?'↑':'↓'}</span></button>
}
