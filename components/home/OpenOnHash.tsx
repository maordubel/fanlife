'use client'
import {useEffect} from 'react'

/**
 * A drawer on the sources page is a link to a club's shelf (`#src-<club>`); the shelf is a closed `<details>`. This opens
 * the shelf the address points at — on arrival and on every jump — so a drawer pulled is a drawer open. Nothing else.
 */
export function OpenOnHash({prefix}:{prefix:string}){
 useEffect(()=>{
  const open=()=>{
   const id=decodeURIComponent(location.hash.slice(1))
   if(!id.startsWith(prefix))return
   const el=document.getElementById(id)
   if(el instanceof HTMLDetailsElement&&!el.open)el.open=true
  }
  open()
  window.addEventListener('hashchange',open)
  return ()=>window.removeEventListener('hashchange',open)
 },[prefix])
 return null
}
